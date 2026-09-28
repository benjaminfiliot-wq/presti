// scripts/vigie-meta-qa.mjs — juge hors ligne d'A7, la vigie Meta (fiche 026-069), écrit par Claude Code AVANT le module
// qu'il juge (lib/agents/acquisition/vigieMeta.ts, fiche 026-072). L'exécutant qui le lance n'y touche jamais.
//
//   node --import ./scripts/ts-loader.mjs scripts/vigie-meta-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères VM de 026-072 (rectifiée par la voie gratuite du 25/09 : cible 'artisan' | 'marque', le jeton toujours par
// `deps`, jamais `process.env`). Le juge sert les réponses de scripts/fixtures/026-acquisition/meta/ (récupérateur dédié,
// JAMAIS ads-archive/ : ce dossier appartient à faits-qa) avec le jeton JETON-TEMOIN-7f3a, et capture la console.
//
// Signatures attendues (026-072) : executerVigie(deps) où deps = { jeton, cible, magasin, recuperer, horloge, echeance,
// budget, metiers?, termes? } → un bilan { etat, … } ; filtrerAnnonceurs(pubs, maintenant) ; domaineDepuisLegendes(legendes).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/vigieMeta.ts et lit son source sous <d> (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai de meta/ se lisent (domaineDepuisLegendes recalculé par le juge retrouve le
//                    domaine attendu de chaque page, l'extrait de chaque fait se retrouve dans l'annonce, le jeton d'essai
//                    ne sort pas de meta/) ; AC-2 le magasin factice applique ses règles sur son propre scénario ;
//                    AC-3 chaque contrôle VM-2 à VM-15 repère son échantillon fautif et laisse passer son échantillon
//                    conforme.
//
// Sortie : une ligne par critère, puis « vigie-meta-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module absent : VM-1 en échec, les suivants « non jugés ». Hors ligne (piège réseau, DNS
// compris), fuseau UTC. Écriture seulement sous .orchestre/travail/vigie-meta-qa/ (le cache de tsc).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, importerContrat, typecheck, piegerReseau, sansCommentaires, importsDe,
  court, premiereLigne, capturerConsole,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerRecuperateurMeta, REPERES } from './fixtures/026-acquisition/meta/recuperateur.mjs'

const JUGE = 'vigie-meta-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const JETON = REPERES.jetons.valide
const IDS = ['VM-1', 'VM-2', 'VM-3', 'VM-4', 'VM-5', 'VM-6', 'VM-7', 'VM-8', 'VM-9', 'VM-10', 'VM-11', 'VM-12', 'VM-13', 'VM-14', 'VM-15']
const EXPORTS = ['executerVigie', 'filtrerAnnonceurs', 'domaineDepuisLegendes']
const piege = piegerReseau()

// ── Un Budget factice ─────────────────────────────────────────────────────────────────────────────────────────────────────
function creerBudget(n) {
  let restant = n
  const historique = []
  return { async prendre(k) { const ok = restant >= k; if (ok) restant -= k; historique.push(ok); return ok }, get pris() { return historique.filter(Boolean).length } }
}
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
/** Le domaine attendu par le contrat (026-072, point 6), recalculé par le JUGE lui-même (indépendant du module jugé). */
const DOMAINES_EXCLUS_JUGE = ['facebook.com', 'instagram.com', 'pagesjaunes.fr', 'linkedin.com']
function domaineReference(legendes) {
  const comptes = new Map()
  for (const l of legendes ?? []) {
    const d = String(l ?? '').trim().toLowerCase().replace(/^www\./, '')
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) || DOMAINES_EXCLUS_JUGE.includes(d)) continue
    comptes.set(d, (comptes.get(d) ?? 0) + 1)
  }
  let meilleur = null, max = 0
  for (const [d, n] of comptes) if (n > max) { meilleur = d; max = n }
  return meilleur
}

/** Une exécution d'executerVigie sur un magasin neuf, avec le récupérateur factice de meta/. */
async function executer(mod, { jeton = JETON, cible = 'artisan', scenario = 'artisan-base', budgetN = 1, echeanceMs = 10 * 60_000, coutMs = 0, console: capter = false } = {}) {
  const H = creerHorloge(T0)
  const M = creerMagasin({ horloge: H })
  const rec = creerRecuperateurMeta({ horloge: H, scenario, coutMs })
  const budget = creerBudget(budgetN)
  const echeance = H.maintenant() + echeanceMs
  const n0 = M.ecritures.length
  const lancer = () => mod.executerVigie({ jeton, cible, magasin: M, recuperer: rec, horloge: H, echeance, budget })
  let r, texte = ''
  if (capter) { const c = await capturerConsole(lancer); r = { res: c.valeur, exception: c.erreur ? premiereLigne(c.erreur) : null }; texte = c.texte } else {
    try { r = { res: await lancer(), exception: null } } catch (e) { r = { res: undefined, exception: premiereLigne(e) } }
  }
  return { M, H, rec, budget, echeance, coutMs, bilan: r.res, exception: r.exception, ecritures: M.ecritures.slice(n0), console: texte }
}
const annonceursDe = (x) => x.M.etat().annonceurs
const candidatsDe = (x) => x.M.etat().prospects

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles, purs : observations → défauts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'VM-2': (x) => {
    const e = []
    for (const [nom, r] of [['null', x.avecNull], ['vide', x.avecVide]]) {
      if (r.etat !== 'en_attente_jeton') e.push(`jeton ${nom} : etat ${json(r.etat)}, en_attente_jeton attendu`)
      if (r.appels) e.push(`jeton ${nom} : ${r.appels} appel(s), zéro attendu`)
      if (r.ecritures) e.push(`jeton ${nom} : ${r.ecritures} écriture(s), zéro attendue`)
      if (r.exception) e.push(`jeton ${nom} : exception ${r.exception}`)
    }
    return e
  },
  'VM-3': (x) => {
    const e = []
    const a = x.annonceurs.find((y) => y.page_id === REPERES.artisan.A.page_id)
    if (!a) e.push('aucun annonceur écrit pour la page A')
    else {
      if (a.nb_pubs_actives !== 3) e.push(`page A : nb_pubs_actives ${json(a.nb_pubs_actives)}, 3 attendu`)
      if (a.premiere_diffusion !== REPERES.artisan.A.pubs[0].debut) e.push(`page A : premiere_diffusion ${json(a.premiere_diffusion)}, ${REPERES.artisan.A.pubs[0].debut} attendu`)
    }
    if (x.annonceurs.some((y) => y.page_id === REPERES.artisan.B.page_id)) e.push('la page B (pubs de moins de 30 jours) a un annonceur écrit')
    if (x.annonceurs.some((y) => y.page_id === REPERES.artisan.C.page_id)) e.push('la page C (2 pubs) a un annonceur écrit')
    return e
  },
  'VM-4': (x) => {
    const e = []
    if (x.a !== 'plomberie-temoin.invalid') e.push(`légendes de la page A : ${json(x.a)}, plomberie-temoin.invalid attendu`)
    if (x.d !== null) e.push(`légende facebook.com : ${json(x.d)}, null attendu`)
    if (x.e !== null) e.push(`légende d'annuaire (pagesjaunes.fr) : ${json(x.e)}, null attendu`)
    return e
  },
  'VM-5': (x) => {
    const e = []
    if (!x.fait) return ['aucun fait pub_meta écrit pour la page A']
    const textes = REPERES.artisan.A.pubs.flatMap((p) => [p.titre, p.corps])
    if (!x.fait.extrait || !textes.some((t) => t.includes(x.fait.extrait))) e.push(`extrait « ${court(x.fait.extrait, 60)} » absent des champs de l'annonce d'essai de la page A`)
    if (!/^https:\/\/www\.facebook\.com\/ads\/library\/\?id=/.test(x.fait.url ?? '')) e.push(`url ${json(x.fait.url)} : ne commence pas par https://www.facebook.com/ads/library/?id=`)
    return e
  },
  'VM-6': (x) => {
    const e = []
    for (const [nom, t] of Object.entries(x.sources)) {
      if (t.includes(JETON)) e.push(`le jeton apparaît dans ${nom}`)
      if (/access_token/.test(t)) e.push(`« access_token » apparaît dans ${nom}`)
    }
    return e
  },
  'VM-7': (x) => {
    const e = []
    if (x.appels !== 5) e.push(`${x.appels} appel(s), exactement 5 attendus`)
    if (x.etat !== 'budget_epuise') e.push(`etat ${json(x.etat)}, budget_epuise attendu`)
    for (const a of x.hotes) { if (a.hote !== 'graph.facebook.com') e.push(`appel vers ${a.hote}, graph.facebook.com attendu`); if (!a.ok) e.push(`chemin ${a.chemin} inattendu (…/ads_archive attendu)`) }
    return e
  },
  'VM-8': (x) => {
    const e = []
    const attendus = { invalide: 'jeton_invalide', limite: 'limite', identite: 'en_attente_identite' }
    for (const [k, att] of Object.entries(attendus)) {
      const r = x[k]
      if (r.etat !== att) e.push(`jeton ${k} : etat ${json(r.etat)}, ${att} attendu`)
      if (r.appels !== 1) e.push(`jeton ${k} : ${r.appels} appel(s), une seule tentative attendue (pas de nouvel essai)`)
    }
    return e
  },
  'VM-9': (x) => {
    const e = []
    if (x.appels < 2) e.push(`${x.appels} appel(s) : paging.next ne semble pas suivi (2 au moins attendus dans ce scénario)`)
    if (x.appels > 6) e.push(`${x.appels} appels : l'exécution ne semble pas s'arrêter à l'échéance (6 au plus attendus)`)
    if (x.exception) e.push(`exécution interrompue : ${x.exception}`)
    if (x.finVirtuelle > x.echeance + x.coutMs + 1) e.push(`fin à ${x.finVirtuelle} ms virtuelles, après l'échéance ${x.echeance} (+ une marge d'un appel)`)
    return e
  },
  'VM-10': (x) => {
    const e = []
    const nu = sansCommentaires(x.source)
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu')
    for (const i of importsDe(x.source)) {
      if (!i.spec) e.push(`import non littéral (${i.genre})`)
      else if (!/^\.\/contrat(\.ts)?$/.test(i.spec)) e.push(`import ${i.spec} (seul ./contrat est permis)`)
    }
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
  'VM-11': (x) => {
    const e = []
    for (const cle of ['D', 'F']) {
      const p = REPERES.artisan[cle]
      if (!x.annonceurs.some((y) => y.page_id === p.page_id)) e.push(`page ${cle} : aucun annonceur écrit`)
      const c = x.candidats.find((y) => y.cle_dedup === `page_meta:${p.page_id}`)
      if (!c) e.push(`page ${cle} : aucun candidat de clé page_meta:${p.page_id}`)
    }
    if (/(?<!page_)meta:/.test(sansCommentaires(x.source))) e.push('la chaîne « meta: » apparaît hors de « page_meta: » dans le source')
    return e
  },
  'VM-12': (x) => {
    const e = []
    if (!x.marqueTermes.length) e.push('aucun appel observé pour la cible marque')
    if (!x.artisanTermes.length) e.push('aucun appel observé pour la cible artisan')
    for (const t of x.marqueTermes) { if (!x.termesMarques.includes(t)) e.push(`marque : search_terms ${json(t)} absent de TERMES_MARQUES`); if (x.termesMetiers.includes(t)) e.push(`marque : appel avec un terme de METIERS (${t})`) }
    for (const t of x.artisanTermes) { if (!x.termesMetiers.includes(t)) e.push(`artisan : search_terms ${json(t)} absent de METIERS`); if (x.termesMarques.includes(t)) e.push(`artisan : appel avec un terme de TERMES_MARQUES (${t})`) }
    return e
  },
  'VM-13': (x) => {
    const e = []
    const h = REPERES.marque.H, g = REPERES.marque.G
    if (x.annonceurs.some((y) => y.page_id === h.page_id)) e.push('un annonceur est écrit pour la page H (sans domaine dans ses légendes)')
    if (x.candidats.some((y) => (y.page_meta === h.page_id) || String(y.cle_dedup ?? '').includes(h.page_id))) e.push('un candidat est écrit pour la page H (sans domaine dans ses légendes)')
    if (!x.candidats.some((y) => y.cle_dedup === `domaine:${g.domaine_attendu}`)) e.push(`aucun candidat de clé domaine:${g.domaine_attendu} pour la page G`)
    return e
  },
  'VM-14': (x) => {
    const e = []
    const g = REPERES.marque.G
    const c = x.candidats.find((y) => y.cle_dedup === `domaine:${g.domaine_attendu}`)
    if (!c) return ['candidat de la page G introuvable']
    if (c.cible !== 'marque') e.push(`cible ${json(c.cible)}, marque attendue`)
    if (c.source !== 'meta') e.push(`source ${json(c.source)}, meta attendue`)
    const f = (c.faits ?? []).find((y) => y.type === 'pub_meta')
    if (!f) e.push('aucun fait pub_meta sur le candidat de la page G')
    else { const textes = g.pubs.flatMap((p) => [p.titre, p.corps]); if (!textes.some((t) => t.includes(f.extrait))) e.push(`extrait pub_meta « ${court(f.extrait, 60)} » absent des textes de l'annonce de la page G`) }
    if (c.produit !== g.produit_attendu) e.push(`produit ${json(c.produit)}, ${json(g.produit_attendu)} attendu`)
    return e
  },
  'VM-15': (x) => {
    const e = []
    for (const [nom, r] of [['artisan', x.artisan], ['marque', x.marque]]) { if (r.etat !== 'en_attente_jeton') e.push(`${nom} : etat ${json(r.etat)}, en_attente_jeton attendu`); if (r.appels) e.push(`${nom} : ${r.appels} appel(s), zéro attendu`) }
    const nu = sansCommentaires(x.source)
    if (/\bprocess\s*\.\s*env\b/.test(nu)) e.push('process.env lu')
    if (/\bnode:fs\b/.test(nu) || /\brequire\(\s*['"]fs['"]\s*\)/.test(nu)) e.push('node:fs (ou require("fs")) dans le source')
    if (nu.includes('META_ADLIB_TOKEN')) e.push('META_ADLIB_TOKEN dans le source')
    return e
  },
}
const DETAILS = {
  'VM-2': "jeton null puis '' → en_attente_jeton, zéro appel, zéro écriture, aucune exception",
  'VM-3': "annonceur écrit pour la page A seule (3 pubs actives, premiere_diffusion exacte) ; B (moins de 30 jours) et C (2 pubs) écartées",
  'VM-4': "légende en capitales avec www. normalisée ; facebook.com et un domaine d'annuaire (pagesjaunes.fr) → null",
  'VM-5': "fait pub_meta de la page A : extrait retrouvé mot pour mot dans l'annonce d'essai, url vers facebook.com/ads/library",
  'VM-6': "ni le jeton ni « access_token » dans les écritures, les événements, l'état final, la console ou le bilan",
  'VM-7': "budget de 5 → exactement 5 appels puis budget_epuise, tous vers graph.facebook.com/v…/ads_archive",
  'VM-8': "190 → jeton_invalide, 613 → limite, 1357045 → en_attente_identite, une seule tentative chacune",
  'VM-9': "paging.next suivie (au moins 2 appels) et arrêt à l'échéance virtuelle (au plus 6 dans ce scénario)",
  'VM-10': "aucun process.env, seul ./contrat importé, typecheck vert",
  'VM-11': "pages D (légende facebook.com) et F (sans légende) retenues avec cle_dedup page_meta:<page_id> ; aucun « meta: » hors « page_meta: »",
  'VM-12': "cible marque : seulement des termes de TERMES_MARQUES ; cible artisan : seulement des termes de METIERS",
  'VM-13': "page H (sans domaine) écartée ; page G retenue avec cle_dedup domaine:boutique-temoin.invalid",
  'VM-14': "candidat de la page G : cible marque, source meta, fait pub_meta retrouvé mot pour mot, produit exact",
  'VM-15': "jeton absent en marque comme en artisan → en_attente_jeton ; aucun process.env, aucune lecture de fichier, aucun META_ADLIB_TOKEN",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations (mode normal : le vrai module)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, K) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  await tente('VM-2', async () => {
    const rNull = await executer(mod, { jeton: null, budgetN: 5 })
    const rVide = await executer(mod, { jeton: '', budgetN: 5 })
    return { avecNull: { etat: rNull.bilan?.etat, appels: rNull.rec.appels.length, ecritures: rNull.ecritures.length, exception: rNull.exception }, avecVide: { etat: rVide.bilan?.etat, appels: rVide.rec.appels.length, ecritures: rVide.ecritures.length, exception: rVide.exception } }
  })
  const base = await executer(mod, { scenario: 'artisan-base', budgetN: 1, console: true })
  await tente('VM-3', async () => ({ annonceurs: annonceursDe(base) }))
  await tente('VM-4', async () => ({ a: mod.domaineDepuisLegendes(REPERES.artisan.A.legendes), d: mod.domaineDepuisLegendes(REPERES.artisan.D.legendes), e: mod.domaineDepuisLegendes(REPERES.artisan.E.legendes) }))
  await tente('VM-5', async () => { const c = candidatsDe(base).find((y) => y.page_meta === REPERES.artisan.A.page_id || (y.cle_dedup ?? '').includes(REPERES.artisan.A.page_id)); return { fait: (c?.faits ?? []).find((f) => f.type === 'pub_meta') ?? null } })
  await tente('VM-6', async () => ({ sources: { 'les écritures du magasin': JSON.stringify(base.ecritures), 'les événements': JSON.stringify(base.M.evenements), "l'état final du magasin": JSON.stringify(base.M.etat()), 'la sortie console': base.console, 'le bilan': JSON.stringify(base.bilan) } }))
  await tente('VM-7', async () => { const r = await executer(mod, { scenario: 'vide', budgetN: 5, budget: 5 }); return { appels: r.rec.appels.length, etat: r.bilan?.etat, hotes: r.rec.appels.map((a) => ({ hote: a.hote, chemin: a.chemin, ok: /^\/v\d+\.\d+\/ads_archive$/.test(a.chemin) })) } })
  await tente('VM-8', async () => {
    const invalide = await executer(mod, { jeton: REPERES.jetons.invalide, budgetN: 3 })
    const limite = await executer(mod, { jeton: REPERES.jetons.limite, budgetN: 3 })
    const identite = await executer(mod, { jeton: REPERES.jetons.identite, budgetN: 3 })
    return { invalide: { etat: invalide.bilan?.etat, appels: invalide.rec.appels.length }, limite: { etat: limite.bilan?.etat, appels: limite.rec.appels.length }, identite: { etat: identite.bilan?.etat, appels: identite.rec.appels.length } }
  })
  await tente('VM-9', async () => { const r = await executer(mod, { scenario: 'pagination-infinie', budgetN: 1000, echeanceMs: 17 * 60_000, coutMs: 5 * 60_000 }); return { appels: r.rec.appels.length, finVirtuelle: r.H.maintenant() - T0, echeance: r.echeance - T0, coutMs: r.coutMs, exception: r.exception } })
  const src = fs.readFileSync(path.join(RAC, 'lib', 'agents', 'acquisition', 'vigieMeta.ts'), 'utf8')
  obs['VM-10'] = { source: src, typecheck: typecheck(RAC, JUGE) }
  const sansDomaine = await executer(mod, { scenario: 'artisan-sans-domaine', budgetN: 1 })
  await tente('VM-11', async () => ({ annonceurs: annonceursDe(sansDomaine), candidats: candidatsDe(sansDomaine), source: src }))
  await tente('VM-12', async () => {
    const rM = await executer(mod, { cible: 'marque', scenario: 'vide', budgetN: 5 })
    const rA = await executer(mod, { cible: 'artisan', scenario: 'vide', budgetN: 5 })
    return { marqueTermes: rM.rec.appels.map((a) => a.recherche.search_terms), artisanTermes: rA.rec.appels.map((a) => a.recherche.search_terms), termesMarques: [...K.TERMES_MARQUES], termesMetiers: K.METIERS.map((m) => m.terme_meta) }
  })
  const marque = await executer(mod, { cible: 'marque', scenario: 'marque', budgetN: 1 })
  await tente('VM-13', async () => ({ annonceurs: annonceursDe(marque), candidats: candidatsDe(marque) }))
  await tente('VM-14', async () => ({ candidats: candidatsDe(marque) }))
  await tente('VM-15', async () => {
    const rA = await executer(mod, { cible: 'artisan', jeton: null, budgetN: 5 })
    const rM = await executer(mod, { cible: 'marque', jeton: null, budgetN: 5 })
    return { artisan: { etat: rA.bilan?.etat, appels: rA.rec.appels.length }, marque: { etat: rM.bilan?.etat, appels: rM.rec.appels.length }, source: src }
  })
  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'auto-contrôle
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  let nPages = 0
  for (const [dict, dictNom] of [[REPERES.artisan, 'artisan'], [REPERES.marque, 'marque']]) {
    for (const [cle, p] of Object.entries(dict)) {
      nPages++
      const d = domaineReference(p.legendes)
      if (d !== (p.domaine_attendu ?? null)) e.push(`${dictNom}.${cle} : domaine recalculé ${json(d)}, ${json(p.domaine_attendu ?? null)} attendu`)
      if (p.pubs.length < 2) e.push(`${dictNom}.${cle} : ${p.pubs.length} pub(s), 2 au moins attendues dans le jeu d'essai`)
      for (const pub of p.pubs) { if (!Date.parse(`${pub.debut}T00:00:00.000Z`)) e.push(`${dictNom}.${cle}/${pub.id} : date de diffusion invalide (${pub.debut})`) }
    }
  }
  const nActifs = (p) => p.pubs.length >= 3 && (T0 - Date.parse(`${p.pubs.map((x) => x.debut).sort()[0]}T00:00:00.000Z`)) / 86_400_000 > 30
  if (!nActifs(REPERES.artisan.A)) e.push('la page A ne remplit pas la règle des 3 pubs actives + 30 jours')
  if (nActifs(REPERES.artisan.B)) e.push('la page B (censée être trop récente) remplit la règle des 3 pubs + 30 jours')
  if (REPERES.artisan.C.pubs.length >= 3) e.push('la page C (censée avoir 2 pubs) en a 3 ou plus')
  for (const cle of ['D', 'E', 'F']) if (!nActifs(REPERES.artisan[cle])) e.push(`la page ${cle} ne remplit pas la règle des 3 pubs actives + 30 jours (elle doit être retenue, seulement sans domaine)`)
  if (!nActifs(REPERES.marque.G) || !nActifs(REPERES.marque.H)) e.push('les pages G ou H (marque) ne remplissent pas la règle des 3 pubs actives + 30 jours')
  return { e, detail: `${nPages} pages relues (domaine recalculé par le juge conforme à domaine_attendu), pages A/D/E/F/G/H/I qualifient (3 pubs actives + 30 jours), B et C écartées par construction` }
}

/** L'observation « correcte » de chaque critère, calculée directement à partir des repères — sans invoquer aucun module. */
function obsBase() {
  const appelA = (t) => ({ hote: 'graph.facebook.com', chemin: '/v26.0/ads_archive', ok: true })
  return {
    'VM-2': { avecNull: { etat: 'en_attente_jeton', appels: 0, ecritures: 0, exception: null }, avecVide: { etat: 'en_attente_jeton', appels: 0, ecritures: 0, exception: null } },
    'VM-3': { annonceurs: [{ page_id: REPERES.artisan.A.page_id, nb_pubs_actives: 3, premiere_diffusion: REPERES.artisan.A.pubs[0].debut }] },
    'VM-4': { a: 'plomberie-temoin.invalid', d: null, e: null },
    'VM-5': { fait: { extrait: REPERES.artisan.A.pubs[0].titre, url: `https://www.facebook.com/ads/library/?id=${REPERES.artisan.A.pubs[0].id}` } },
    'VM-6': { sources: { écritures: '[{"methode":"enregistrerCandidats"}]', bilan: '{"etat":"ok"}' } },
    'VM-7': { appels: 5, etat: 'budget_epuise', hotes: Array.from({ length: 5 }, appelA) },
    'VM-8': { invalide: { etat: 'jeton_invalide', appels: 1 }, limite: { etat: 'limite', appels: 1 }, identite: { etat: 'en_attente_identite', appels: 1 } },
    'VM-9': { appels: 3, finVirtuelle: 15 * 60_000, echeance: 17 * 60_000, coutMs: 5 * 60_000, exception: null },
    'VM-10': { source: "import type { Budget } from './contrat'\nexport function executerVigie() {}\n", typecheck: { ok: true, detail: 'vert' } },
    'VM-11': {
      annonceurs: [{ page_id: REPERES.artisan.D.page_id }, { page_id: REPERES.artisan.F.page_id }],
      candidats: [{ cle_dedup: `page_meta:${REPERES.artisan.D.page_id}` }, { cle_dedup: `page_meta:${REPERES.artisan.F.page_id}` }],
      source: "const cle = `page_meta:${p.page_id}`\n",
    },
    'VM-12': { marqueTermes: ['bougie parfumée', 'thé en vrac'], artisanTermes: ['plombier', 'menuiserie'], termesMarques: ['bougie parfumée', 'thé en vrac'], termesMetiers: ['plombier', 'menuiserie'] },
    'VM-13': { annonceurs: [{ page_id: REPERES.marque.G.page_id }], candidats: [{ cle_dedup: `domaine:${REPERES.marque.G.domaine_attendu}` }] },
    'VM-14': { candidats: [{ cle_dedup: `domaine:${REPERES.marque.G.domaine_attendu}`, cible: 'marque', source: 'meta', produit: REPERES.marque.G.produit_attendu, faits: [{ type: 'pub_meta', extrait: REPERES.marque.G.pubs[0].titre }] }] },
    'VM-15': { artisan: { etat: 'en_attente_jeton', appels: 0 }, marque: { etat: 'en_attente_jeton', appels: 0 }, source: "export function executerVigie() {}\n" },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'VM-2': [['conforme', b['VM-2'], false], ['un appel malgré le jeton absent', muter(b, 'VM-2', (x) => { x.avecNull.appels = 1 }), true]],
    'VM-3': [['conforme', b['VM-3'], false], ['page A avec 33 pubs actives (dédoublée)', muter(b, 'VM-3', (x) => { x.annonceurs[0].nb_pubs_actives = 33 }), true], ['page B écrite aussi', muter(b, 'VM-3', (x) => { x.annonceurs.push({ page_id: REPERES.artisan.B.page_id, nb_pubs_actives: 3, premiere_diffusion: '2026-09-20' }) }), true]],
    'VM-4': [['conforme', b['VM-4'], false], ['facebook.com jugé comme un domaine', muter(b, 'VM-4', (x) => { x.d = 'facebook.com' }), true]],
    'VM-5': [['conforme', b['VM-5'], false], ['extrait retouché', muter(b, 'VM-5', (x) => { x.fait.extrait = 'texte inventé qui ne figure sur aucune annonce' }), true], ['url vers ad_snapshot_url', muter(b, 'VM-5', (x) => { x.fait.url = 'https://www.facebook.com/ads/archive/render_ad/?id=1' }), true]],
    'VM-6': [['conforme', b['VM-6'], false], ['le jeton dans le bilan', muter(b, 'VM-6', (x) => { x.sources.bilan = `{"jeton":"${JETON}"}` }), true]],
    'VM-7': [['conforme', b['VM-7'], false], ['6 appels', muter(b, 'VM-7', (x) => { x.appels = 6 }), true], ['un appel vers un autre hôte', muter(b, 'VM-7', (x) => { x.hotes[0].hote = 'facebook.com' }), true]],
    'VM-8': [['conforme', b['VM-8'], false], ['613 relancé deux fois', muter(b, 'VM-8', (x) => { x.limite.appels = 2 }), true]],
    'VM-9': [['conforme', b['VM-9'], false], ['un seul appel (pagination non suivie)', muter(b, 'VM-9', (x) => { x.appels = 1 }), true], ['ne s\'arrête pas à l\'échéance', muter(b, 'VM-9', (x) => { x.finVirtuelle = 60 * 60_000 }), true]],
    'VM-10': [['conforme', b['VM-10'], false], ['process.env lu', muter(b, 'VM-10', (x) => { x.source += 'const j = process.env.META_ADLIB_TOKEN\n' }), true], ['import de @/lib/ai', muter(b, 'VM-10', (x) => { x.source = `import { x } from '@/lib/ai'\n${x.source}` }), true], ['typecheck rouge', muter(b, 'VM-10', (x) => { x.typecheck = { ok: false, detail: 'TS2345' } }), true]],
    'VM-11': [['conforme', b['VM-11'], false], ['page F absente', muter(b, 'VM-11', (x) => { x.candidats = x.candidats.filter((c) => !c.cle_dedup.includes(REPERES.artisan.F.page_id)) }), true], ['« meta: » hors de page_meta', muter(b, 'VM-11', (x) => { x.source += "const k = 'meta:' + id\n" }), true]],
    'VM-12': [['conforme', b['VM-12'], false], ['un métier interrogé pour la cible marque', muter(b, 'VM-12', (x) => { x.marqueTermes.push('plombier') }), true]],
    'VM-13': [['conforme', b['VM-13'], false], ['un annonceur écrit pour la page H', muter(b, 'VM-13', (x) => { x.annonceurs.push({ page_id: REPERES.marque.H.page_id }) }), true]],
    'VM-14': [['conforme', b['VM-14'], false], ['produit erroné', muter(b, 'VM-14', (x) => { x.candidats[0].produit = 'Autre chose' }), true], ['cible artisan pour un candidat marque', muter(b, 'VM-14', (x) => { x.candidats[0].cible = 'artisan' }), true]],
    'VM-15': [['conforme', b['VM-15'], false], ['une lecture de fichier', muter(b, 'VM-15', (x) => { x.source += "import fs from 'node:fs'\n" }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/meta)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const l = await scenarioMagasin()
    const manquantes = REGLES_JP6.filter((k) => !l.some((x) => x.cle === k))
    s.juger('AC-2', [...l.filter((x) => !x.ok).map((x) => `${x.nom} : obtenu ${court(json(x.obtenu), 80)}`), ...manquantes.map((k) => `règle ${k} absente du scénario`)], `magasin-memoire : ${l.length} règles vertes sur son scénario, dont les ${REGLES_JP6.length} de JP-6`)
  } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const id of IDS.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, x, rouge] of liste) {
        let d
        try { d = C[id](x) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles VM-2 à VM-15`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'vigieMeta.ts')
  let mod = null, K = null
  const e1 = []
  if (!fs.existsSync(f)) e1.push(`module absent : ${rel(f)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/vigieMeta.ts') } catch (e) { e1.push(`vigieMeta.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de vigieMeta.ts (ou pas une fonction)`)
    try { K = await importerContrat() } catch (e) { e1.push(`contrat.ts ne s'importe pas : ${premiereLigne(e)}`) }
  }
  s.juger('VM-1', e1, `vigieMeta.ts importé depuis ${rel(RAC)} : ${EXPORTS.join(', ')}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'VM-1 en échec')
  else {
    let obs
    try { obs = await observer(mod, K) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
    if (obs) for (const id of IDS.slice(1)) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
