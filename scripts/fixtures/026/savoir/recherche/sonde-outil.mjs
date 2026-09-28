// Sonde du juge savoir-recherche-qa (026-232), partie `outil`. Lancée par le juge dans un enfant
//   node --experimental-strip-types --import <dépôt>/scripts/ts-loader.mjs --import <espion-reseau> sonde-outil.mjs
// avec cwd = la racine jugée. Elle importe lib/savoir/recherche.ts de cette racine, construit les dépendances d'essai
// (faux savoir, faux transports Firecrawl et Perplexity qui CONSIGNENT chaque requête reçue, faux journal, compteurs,
// réserve de crédits, horloge fixe), joue les scénarios que le juge lui passe et écrit dans SONDE_SORTIE ce qu'elle a
// VU, brut. Aucune décision ici : le juge (parent) évalue.
//
// Environnement : SONDE_ENTREE (JSON : { essais, noms, scenarios }), SONDE_MODULE (chemin du module), SONDE_SORTIE.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const E = JSON.parse(fs.readFileSync(process.env.SONDE_ENTREE, 'utf8'))
const ES = E.essais
const NOMS = E.noms
const out = { erreurs: [], scenarios: [] }
const msg = (e) => String((e && e.message) || e)
const clone = (v) => { if (v === undefined) return null; try { return JSON.parse(JSON.stringify(v)) } catch (e) { return { non_serialisable: msg(e) } } }
const REMPLISSAGE = ' Phrase de remplissage d’essai, publique, sans aucune donnée personnelle.'
const allonger = (t, n) => { let s = String(t); while (n && s.length < n) s += REMPLISSAGE; return s }
const ecrire = () => fs.writeFileSync(process.env.SONDE_SORTIE, JSON.stringify(out))
const essai = (nom, f) => { try { out[nom] = f() } catch (e) { out.erreurs.push(`${nom} : ${msg(e)}`) } }
const geleProfond = (v) => v === null || typeof v !== 'object' || (Object.isFrozen(v) && Object.values(v).every(geleProfond))

let M
try { M = await import(pathToFileURL(process.env.SONDE_MODULE).href) } catch (e) { out.erreurs.push(`import du module : ${msg(e)}`) }
if (!M) { ecrire() } else {

out.exports = Object.keys(M)
out.types = Object.fromEntries(Object.keys(M).map((k) => [k, typeof M[k]]))
essai('plafonds', () => ({ valeur: clone(M.PLAFONDS_RECHERCHE), gele: geleProfond(M.PLAFONDS_RECHERCHE) }))
essai('webDe', () => ({ valeur: clone(M.RECHERCHE_WEB_DE), gele: geleProfond(M.RECHERCHE_WEB_DE) }))
out.seuil = typeof M.SEUIL_SAVOIR === 'number' ? M.SEUIL_SAVOIR : null
essai('classes', () => Object.fromEntries(Object.keys(ES.classes_attendues).filter((a) => !a.startsWith('_')).map((a) => [a, clone(M.classesPour(a, ES.moteurs))])))
essai('refus', () => ES.refus_attendus.map((r) => clone(M.refusDonneePersonnelle(ES.questions[r.question], [...NOMS]))))

const SEUIL = Number.isFinite(out.seuil) && out.seuil > 0 ? out.seuil : 1
function savoirDe(nom) {
  return (ES.savoir[nom] || []).map((r) => ({ texte: allonger(r.texte, r.allonger), score: r.score_x * SEUIL, ...(r.source ? { source: { ...r.source } } : {}) }))
}
function fauxFirecrawl(mode, rec) {
  const panne = () => new Error(`401 : clé ${ES.sentinelles.firecrawl} refusée par le transport d'essai`)
  return {
    cle: ES.sentinelles.firecrawl,
    async chercher(requete) {
      rec.fc.chercher.push(requete)
      if (mode === 'panne') throw panne()
      if (mode === 'vide') return { resultats: [], methode: 'firecrawl', horodatage: ES.horloge }
      return { resultats: ES.firecrawl.urls.map((url, i) => ({ url, titre: `Guide d'essai ${i + 1}` })), methode: 'firecrawl', horodatage: ES.horloge }
    },
    async lire(url) {
      rec.fc.lire.push(url)
      if (mode === 'panne') throw panne()
      const page = { texte: allonger(`${ES.firecrawl.page.texte} (${url})`, ES.firecrawl.page.allonger), url_finale: url, methode: ES.firecrawl.page.methode, horodatage: ES.horloge, robots: ES.firecrawl.page.robots, incertain: false }
      rec.pages[url] = page.texte
      return page
    },
  }
}
function fauxPerplexity(mode, rec) {
  const f = async (question) => {
    rec.px.push(question)
    if (mode === 'panne') throw new Error(`clé ${ES.sentinelles.perplexity} refusée par le transport d'essai`)
    const r = { reponse: allonger(ES.perplexity.reponse, ES.perplexity.allonger), citations: [...ES.perplexity.citations] }
    rec.pxReponses.push(r.reponse)
    return r
  }
  f.cle = ES.sentinelles.perplexity
  return f
}
const delai = (p, ms) => Promise.race([p, new Promise((_, non) => setTimeout(() => non(new Error(`délai de ${ms} ms dépassé`)), ms))])

async function jouer(sc) {
  const rec = { nom: sc.nom, savoir: [], servis: [], fc: { chercher: [], lire: [] }, pages: {}, px: [], pxReponses: [], journal: [], lecteur: [], retour: null, erreur: null }
  const deps = {
    savoir: async (question, options) => { rec.savoir.push({ question, options: clone(options) }); const l = savoirDe(sc.savoir); rec.servis.push(...clone(l)); return l },
    moteurs: ES.moteurs,
    reglages: clone(sc.reglages),
    nomsProspects: [...NOMS],
    compteurs: { ...(sc.compteurs || {}) },
    credits: { restant: sc.credits ?? 1000 },
    journal: async (e) => { rec.journal.push(clone(e)) },
    horloge: { maintenant: () => Date.parse(ES.horloge) },
  }
  if (sc.firecrawl && sc.firecrawl !== 'absent') deps.firecrawl = fauxFirecrawl(sc.firecrawl, rec)
  if (sc.perplexity && sc.perplexity !== 'absent') deps.perplexity = fauxPerplexity(sc.perplexity, rec)
  try {
    if (sc.fn === 'avecRecherche') {
      const reponses = clone(sc.reponses)
      let i = 0
      const lecteur = async (systeme, donnees) => { rec.lecteur.push({ systeme, donnees: clone(donnees) }); return clone(reponses[Math.min(i++, reponses.length - 1)]) }
      const L = M.avecRecherche(lecteur, sc.agent, deps)
      rec.retour = clone(await delai(Promise.resolve(L(sc.systeme, clone(sc.donnees))), 15000))
    } else {
      rec.retour = clone(await delai(Promise.resolve(M.chercher(clone(sc.demande), deps)), 15000))
    }
  } catch (e) { rec.erreur = msg(e) }
  rec.credits = deps.credits.restant
  rec.compteurs = clone(deps.compteurs)
  return rec
}

for (const sc of E.scenarios) out.scenarios.push(await jouer(sc))
ecrire()
}
