// Outils communs du chef : requêtes bornées au bus et validation intégrale des plans.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chercherSecrets } from '../instantane-quotidien.mjs'
import { motifProspects } from '../usine/garde-prospects.mjs'

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'chef')
export const TYPES = ['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']
export const PLAFONDS = { plein: { taches: 10, decisions: 5 }, leger: { taches: 3, decisions: 0 } }
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const CLE_RE = /^chef:\d{4}-\d{2}-\d{2}:[a-z0-9-]{3,80}$/
const CLE_IDEE_RE = /^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]{3,75}$/
const CLE_OPTION_RE = /^[a-z_]{2,30}$/
const HEURE = 3_600_000
export const OBJET_MIN = 20
// Les mots qui disent « il faut lire le web » (le preneur de tâches libres n'a ni web ni navigateur : voir validerPlan).
// 06/10 : la maintenance des agents (preneur, disjoncteurs, tâches de l'orchestre 026-xxx) revient à la supervision et à Claude Code, jamais au preneur de tâches libres : le Chef y a dépensé tout son quota de la nuit (60 tâches).
export const MAINTENANCE_AGENTS = /\b(preneur|disjonct\w*|orchestre|026-\d{3})\b/i
export const BESOIN_WEB = /\b(ebay|aliexpress|alibaba|tiktok|amazon|youtube|instagram|facebook|google|annonces?|sites? (?:web|concurrents?)|en temps r[ée]el|sur le web|en ligne|prix (?:vendus|actuels|du march[ée]))\b/i

const TYPES_LECTURE = ['veille', 'recherche', 'verification', 'tri']
const TYPES_LIBRES = ['veille', 'recherche', 'verification', 'tri', 'relecture', 'redaction_interne']
/**
 * 06/10 : pourquoi un FILTRE à la création et non un refus du plan. Les règles ci-dessous, d'abord posées dans validerPlan, faisaient refuser le plan entier :
 * les modèles gratuits ne savaient pas se corriger, le relais enchaînait les moteurs jusqu'au délai et le cycle sortait vide (« plan absent ou vide », 09:52).
 * Une tâche libre qui ne peut pas aboutir (le preneur n'a ni web ni fichiers) est donc ÉCARTÉE au moment de la créer ; le reste du plan passe. Rend la raison, ou null.
 *   · motif de la garde des données de prospects (prospect, SIREN, téléphone, adresse e-mail) : le preneur la refuserait (donnees_personnelles) ;
 *   · lecture qui exige du web (veille, recherche, vérification, tri) : il répondrait « impossible » et son disjoncteur s'ouvrirait ;
 *   · maintenance des agents (preneur, disjoncteur, orchestre, 026-xxx) : revient à la supervision (le Chef y a dépensé 60 tâches en une nuit).
 * Les tâches de code et de contenu (Claude Code, Codex) ne sont jamais écartées ici.
 */
export function tacheEcartee(t) {
  if (!t || typeof t !== 'object' || !TYPES_LIBRES.includes(t.type)) return null
  const charge = t.charge && typeof t.charge === 'object' ? t.charge : {}
  const objetTitre = [t.objet, charge.titre].filter((x) => typeof x === 'string').join('\n')
  const maint = MAINTENANCE_AGENTS.exec(objetTitre)
  if (maint) return `la maintenance des agents n'est pas une tâche libre (« ${maint[0]} »)`
  if (TYPES_LECTURE.includes(t.type)) {
    const web = BESOIN_WEB.exec(objetTitre)
    if (web) return `exige du web, que le preneur n'a pas (« ${web[0]} »)`
  }
  const motif = motifProspects([t.objet, charge.titre, charge.pourquoi].filter((x) => typeof x === 'string').join('\n'))
  if (motif) return `le texte contient « ${motif} » : la garde des données de prospects la refuserait`
  return null
}
/** Sépare les tâches d'un plan : { gardees, ecartees: [{ cle, raison }] }. Pure : le plan n'est pas modifié. */
export function filtrerTaches(plan) {
  const gardees = [], ecartees = []
  for (const t of Array.isArray(plan?.taches) ? plan.taches : []) {
    const raison = tacheEcartee(t)
    if (raison) ecartees.push({ cle: String(t?.cle_idempotence ?? ''), raison }); else gardees.push(t)
  }
  return { gardees, ecartees }
}

// ── Le cap de Benj (07/10/2026, docs/agents/cap-benj.md) ─────────────────────────────────────────────────────────────
// Le cycle de 01:06 (modèle maison) a rendu un plan VALIDE mais hors sujet : « machine à baguettes » (produit inventé), « dix vidéos
// d'affaire animée pour Presti », « relecture du brouillon de landing par défaut ». Benj n'a que deux activités : l'e-commerce Brico
// Travaux (annonces eBay, vidéos TikTok des 2 produits, un 3e produit de bricolage) et Presti (prospection, refonte du site). Une tâche qui
// ne s'y rattache par aucune ANCRE du cap est écartée avec son motif ; un plan dont TOUTES les tâches sont écartées est refusé
// (validerPertinence), et le relais passe au moteur suivant. Les ancres sont celles de la ligne « Ancres » du cap (chef-qa CH-A16 vérifie
// que le cap les nomme toutes). « vidéo », « produit », « site » seuls ne suffisent pas : c'est ce qui laissait passer les tâches de 01:06.
const sansAccents = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘'`´]/g, ' ')
export const ANCRES_CAP = ['ebay', 'annonce', 'tiktok', 'brico travaux', 'bricolage', 'nettoyeur', 'aspirateur', 'fournisseur', 'cj', 'aliexpress', 'dropshipping', 'e-commerce', 'prospection', 'démarchage', 'refonte', 'vitrine', 'maquette', 'presti']
const CAP_ANCRE = /\b(?:ebay|annonces?|tik ?toks?|brico ?travaux|bricolage|nettoyeurs?|aspirateurs?|fournisseurs?|cj(?:dropshipping)?|aliexpress|dropshipping|e-?commerce|e-?com|prospect\w*|demarch\w*|refonte|vitrines?|maquettes?|prestiapp)\b/
const CAP_PRESTI = /\bpresti\b/
const CAP_PRESTI_SITE = /\b(?:sites?|landing|pages?|accueil|tarifs?|formulaires?|artisans?|seo)\b/
const CAP_VIDEO = /\b(?:videos?|clips?)\b/
const CAP_VIDEO_PERMISE = /\b(?:tik ?toks?|brico ?travaux|bricolage|nettoyeurs?|aspirateurs?|vitrines?|landing|refonte)\b/
const CAP_INVENTE = /\b(?:produits?|clients?|marques?|entreprises?|machines?|exemples?)\s+(?:\w+\s+)?(?:inventee?s?|fictifs?|fictives?|imaginaires?)\b/
const CAP_MAINTENANCE = /\b(?:preneur|disjonct\w*|orchestre|026-\d{3}|battements?|taches? (?:en file|en attente|echouees?|bloquees?))\b/
/** Le motif qui met une tâche hors du cap de Benj, ou null. Lit l'objet et le titre (le « pourquoi » sert à justifier, pas à rattacher). Pure. */
export function horsCap(t) {
  if (!t || typeof t !== 'object') return 'hors du cap de Benj : tâche illisible'
  if (typeof t.objet === 'string' && OBJET_REFERENCE.test(t.objet.trim())) return null // le bilan quotidien du Savoir (bilan.mjs) : une référence structurée, pas un sujet du Chef
  const charge = t.charge && typeof t.charge === 'object' ? t.charge : {}
  const texte = sansAccents([t.objet, charge.titre].filter((x) => typeof x === 'string').join('\n'))
  const maint = CAP_MAINTENANCE.exec(texte)
  if (maint) return `hors du cap de Benj : maintenance interne (« ${maint[0]} »)`
  const invente = CAP_INVENTE.exec(texte)
  if (invente) return `hors du cap de Benj : sujet inventé (« ${invente[0]} »)`
  const ancre = CAP_ANCRE.exec(texte) || (CAP_PRESTI.test(texte) ? CAP_PRESTI_SITE.exec(texte) : null)
  if (!ancre) return "hors du cap de Benj : ni l'e-commerce Brico Travaux (eBay, TikTok, nettoyeur, aspirateur, 3e produit de bricolage) ni Presti (prospection, site vitrine)"
  const video = CAP_VIDEO.exec(texte)
  if (video && !CAP_VIDEO_PERMISE.test(texte)) return `hors du cap de Benj : vidéo hors de la chaîne TikTok Brico Travaux (« ${video[0]} »)`
  return null
}
/** Les tâches hors du cap : { gardees, ecartees: [{ cle, raison }] }. Pure. */
export function filtrerCap(taches) {
  const gardees = [], ecartees = []
  for (const t of Array.isArray(taches) ? taches : []) {
    const raison = horsCap(t)
    if (raison) ecartees.push({ cle: String(t?.cle_idempotence ?? ''), raison }); else gardees.push(t)
  }
  return { gardees, ecartees }
}
/** Les écarts de pertinence d'un plan : vide sauf si TOUTES ses tâches (une au moins) sont hors du cap ; alors chaque motif. Pure. */
export function validerPertinence(plan) {
  const taches = Array.isArray(plan?.taches) ? plan.taches : []
  if (!taches.length) return []
  const motifs = taches.map((t) => horsCap(t))
  if (!motifs.every(Boolean)) return []
  return ['taches : toutes hors du cap de Benj (docs/agents/cap-benj.md) : chaque tâche doit servir l\'e-commerce Brico Travaux ou Presti', ...motifs.map((m, i) => `taches[${i}] : ${m}`)]
}
// ── consignes_lues contre le bloc <consignes_benj> de l'entrée (07/10) ─────────────────────────────────────────────────
// Cycle léger de 09:05 UTC : le modèle maison a cité une consigne qui n'existe pas (5047, vue à l'entraînement) ; fil.mjs verifier a refusé le plan
// APRÈS le relais, et le cycle était perdu. Le relais applique donc la même règle que fil.mjs (une ligne par consigne donnée, aucune autre, pas de
// doublon) : les écarts sont rendus au moteur, et en dernier recours les lignes d'ids inconnus ou en double sont RETIRÉES (jamais une ligne inventée).
/** Les ids des consignes du bloc <consignes_benj> d'une entrée, ou null si le bloc manque ou ne se lit pas. Pure. */
export function idsConsignesDeLEntree(texte) {
  const m = /<consignes_benj>\n?([\s\S]*?)\n?<\/consignes_benj>/.exec(String(texte ?? ''))
  if (!m) return null
  try { const v = JSON.parse(m[1].trim() || '[]'); return Array.isArray(v) ? v.map((c) => c?.id).filter((x) => Number.isInteger(x)) : null } catch { return null }
}
/** Les écarts de consignes_lues au regard des ids attendus (la règle de fil.mjs verifier). Pure. */
export function ecartsConsignesLues(plan, ids) {
  const attendus = new Set(ids), lignes = Array.isArray(plan?.consignes_lues) ? plan.consignes_lues : []
  const cites = lignes.map((l) => l?.id), f = []
  for (const id of attendus) if (!cites.includes(id)) f.push(`consignes_lues : la consigne ${id} n'a pas sa ligne`)
  for (const id of new Set(cites)) if (!attendus.has(id)) f.push(`consignes_lues : l'id ${id} n'est pas une consigne du bloc <consignes_benj> (ids permis : ${[...attendus].join(', ') || 'aucun'})`)
  if (new Set(cites).size !== cites.length) f.push('consignes_lues : un id en double')
  return f
}
/** Retire de consignes_lues les lignes d'ids inconnus ou en double : { plan, notes } ou null s'il n'y a rien à retirer. N'ajoute jamais rien. Pure. */
export function retirerConsignesInconnues(plan, ids) {
  if (!plan || !Array.isArray(plan.consignes_lues)) return null
  const attendus = new Set(ids), vus = new Set(), garde = [], retires = []
  for (const l of plan.consignes_lues) { if (attendus.has(l?.id) && !vus.has(l.id)) { vus.add(l.id); garde.push(l) } else retires.push(l?.id) }
  if (!retires.length) return null
  return { plan: { ...plan, consignes_lues: garde }, notes: [`consignes_lues : ${retires.length} ligne(s) retirée(s), id inconnu ou en double (${retires.join(', ')})`] }
}
// Une référence structurée tient lieu d'objet pour le bilan quotidien du Savoir (026-229, objet « bilan:AAAA-MM-JJ », 16 signes) ; tout le reste doit être décrit (OBJET_MIN signes au moins).
export const OBJET_REFERENCE = /^bilan:\d{4}-\d{2}-\d{2}$/

export class Arret extends Error { constructor(code, message) { super(message); this.code = code } }

export const args = process.argv.slice(2)
export function option(nom, defaut) {
  const a = args.find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`))
  if (a === undefined) return defaut
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true
}
export const positionnels = () => args.filter((a) => !a.startsWith('--'))

export function lireJeton() {
  const j = process.env.PRESTI_JETON_CHEF
  if (!j || !j.trim()) throw new Arret(2, 'PRESTI_JETON_CHEF absent')
  return j.trim()
}
export function baseSure(base) {
  let u
  try { u = new URL(base || 'https://prestiapp.fr') } catch { throw new Arret(2, 'base illisible') }
  if (u.protocol === 'https:') return u.origin
  if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return u.origin
  throw new Arret(2, 'base refusée : https://, ou http:// vers 127.0.0.1 ou localhost seulement')
}

export async function appeler(base, jeton, methode, chemin, corps) {
  try {
    const r = await fetch(base + chemin, {
      method: methode,
      headers: { authorization: `Bearer ${jeton}`, ...(corps === undefined ? {} : { 'content-type': 'application/json' }) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(20_000),
    })
    let json = null
    try { json = await r.json() } catch { json = null }
    return { statut: r.status, json }
  } catch (e) {
    return { statut: 0, json: null, erreur: e?.cause?.code || e?.name || 'reseau' }
  }
}

export const horodatage = () => new Date().toISOString().replace(/[:.]/g, '-')
export function lireJson(f, defaut = null) { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return defaut } }
export function ecrireJson(f, v) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n') }
export const idsDe = (v) => (Array.isArray(v) ? v : Array.isArray(v?.ids) ? v.ids : []).filter((x) => Number.isInteger(x))

// Balises d'un bloc de données : toute ouverture ou fermeture venue des données est neutralisée.
export const neutraliser = (s) => String(s).replace(/<(\/?)(donnees_|consignes_benj|cap_benj)/g, '&lt;$1$2')

export function toutesLesChaines(v, out = []) {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) for (const x of v) toutesLesChaines(x, out)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(k); toutesLesChaines(x, out) }
  return out
}
export function fautesDeTexte(v) {
  const texte = toutesLesChaines(v).join('\n')
  const f = chercherSecrets(texte).map((n) => `secret (${n})`)
  if (EMAIL.test(texte)) f.push('adresse e-mail')
  return f
}

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const signes = (s) => [...s].length
function cles(o, permises, requises, ou, fautes) {
  if (!estObjet(o)) { fautes.push(`${ou} : objet attendu`); return false }
  for (const k of Object.keys(o)) if (!permises.includes(k)) fautes.push(`${ou} : clé inconnue « ${k} »`)
  for (const k of requises) if (!(k in o)) fautes.push(`${ou} : « ${k} » manque`)
  return true
}
const chaine = (v, min, max) => typeof v === 'string' && signes(v) >= min && signes(v) <= max

// Le validateur du plan, écrit à la main (026-105) : la liste des écarts, sans aucune valeur.
export function validerPlan(plan, cycle, maintenant = new Date()) {
  const f = []
  if (!cles(plan, ['cycle', 'brief', 'compte_rendu', 'consignes_lues', 'taches', 'decisions'], ['cycle', 'brief', 'compte_rendu', 'consignes_lues', 'taches', 'decisions'], 'plan', f)) return f
  if (!['plein', 'leger'].includes(plan.cycle)) f.push('cycle : plein ou leger')
  if (cycle && plan.cycle !== cycle) f.push(`cycle : le plan dit ${plan.cycle}, le cycle est ${cycle}`)
  const plafond = PLAFONDS[cycle || plan.cycle] || PLAFONDS.leger
  if (!Array.isArray(plan.brief) || plan.brief.length !== 3 || !plan.brief.every((b) => chaine(b, 0, 140))) f.push('brief : trois chaînes de 140 signes au plus')
  if (!Array.isArray(plan.compte_rendu) || plan.compte_rendu.length !== 3) f.push('compte_rendu : exactement trois lignes')
  else plan.compte_rendu.forEach((l, i) => { if (!chaine(l, 1, 60) || /[·\n\r@]|http/i.test(l)) f.push(`compte_rendu[${i}] : 1 à 60 signes, sans ·, @, lien ni retour à la ligne`) })
  if (!Array.isArray(plan.consignes_lues) || plan.consignes_lues.length > 10) f.push('consignes_lues : 10 au plus')
  else plan.consignes_lues.forEach((c, i) => {
    if (!cles(c, ['id', 'suite', 'pourquoi'], ['id', 'suite', 'pourquoi'], `consignes_lues[${i}]`, f)) return
    if (!Number.isInteger(c.id) || c.id < 1) f.push(`consignes_lues[${i}].id : entier ≥ 1`)
    if (!['tache', 'decision', 'note', 'impossible'].includes(c.suite)) f.push(`consignes_lues[${i}].suite inconnue`)
    if (!chaine(c.pourquoi, 1, 140)) f.push(`consignes_lues[${i}].pourquoi : 1 à 140 signes`)
  })
  const vues = new Set()
  const objets = new Set()
  if (!Array.isArray(plan.taches)) f.push('taches : liste attendue')
  else {
    if (plan.taches.length > plafond.taches) f.push(`taches : ${plafond.taches} au plus en cycle ${cycle || plan.cycle}`)
    plan.taches.forEach((t, i) => {
      const ou = `taches[${i}]`
      if (!cles(t, ['type', 'capacite', 'cle_idempotence', 'objet', 'charge', 'sortante'], ['type', 'capacite', 'cle_idempotence', 'objet', 'charge', 'sortante'], ou, f)) return
      if (!TYPES.includes(t.type)) f.push(`${ou}.type hors de la liste permise`)
      if (!TYPES.includes(t.capacite)) f.push(`${ou}.capacite hors de la liste permise`)
      if (typeof t.cle_idempotence !== 'string' || !CLE_RE.test(t.cle_idempotence)) f.push(`${ou}.cle_idempotence : chef:<date>:<mot-clé>`)
      else if (vues.has(t.cle_idempotence)) f.push(`${ou}.cle_idempotence en double`); else vues.add(t.cle_idempotence)
      // L'objet dit CE QUE la tâche doit faire (le preneur n'a que lui et la charge) : vide ou trop court, le plan entier est refusé (05/10 : 20 tâches sans objet).
      if (!(chaine(typeof t.objet === 'string' ? t.objet.trim() : t.objet, OBJET_MIN, 200) || (typeof t.objet === 'string' && OBJET_REFERENCE.test(t.objet.trim())))) f.push(`${ou}.objet : obligatoire, ${OBJET_MIN} à 200 signes (ce que la tâche doit faire, précisément)`)
      else if (OBJET_REFERENCE.test(t.objet.trim())) { /* le bilan quotidien porte plusieurs propositions sous le même objet « bilan:jour » : leurs clés d'idempotence les distinguent */ }
      else if (objets.has(t.objet.trim())) f.push(`${ou}.objet en double (une seule tâche ouverte par objet)`); else objets.add(t.objet.trim())
      if (cles(t.charge, ['titre', 'pourquoi'], ['titre', 'pourquoi'], `${ou}.charge`, f)) {
        if (!chaine(t.charge.titre, 1, 120)) f.push(`${ou}.charge.titre : 120 signes au plus`)
        if (!chaine(t.charge.pourquoi, 1, 300)) f.push(`${ou}.charge.pourquoi : 300 signes au plus`)
      }
      if (t.sortante !== false) f.push(`${ou}.sortante doit valoir false`)
    })
  }
  if (!Array.isArray(plan.decisions)) f.push('decisions : liste attendue')
  else {
    if (plan.decisions.length > plafond.decisions) f.push(`decisions : ${plafond.decisions} au plus en cycle ${cycle || plan.cycle}`)
    plan.decisions.forEach((d, i) => {
      const ou = `decisions[${i}]`
      const toutes = ['cle_idempotence', 'nature', 'question', 'contexte', 'options', 'option_defaut', 'montant_cents', 'portee', 'echeance']
      if (!cles(d, toutes, toutes, ou, f)) return
      if (!['arbitrage', 'idee'].includes(d.nature)) f.push(`${ou}.nature : arbitrage ou idee`)
      if (typeof d.cle_idempotence !== 'string' || !CLE_RE.test(d.cle_idempotence)) f.push(`${ou}.cle_idempotence : chef:<date>:<mot-clé>`)
      else if (vues.has(d.cle_idempotence)) f.push(`${ou}.cle_idempotence en double`); else vues.add(d.cle_idempotence)
      if (!chaine(d.question, 5, 300)) f.push(`${ou}.question : 5 à 300 signes`)
      if (!chaine(d.contexte, 0, 2000)) f.push(`${ou}.contexte : 2 000 signes au plus`)
      const o = d.options
      if (!Array.isArray(o) || o.length < 2 || o.length > 3) f.push(`${ou}.options : 2 ou 3`)
      else {
        o.forEach((op, j) => {
          if (!cles(op, ['cle', 'libelle', 'recommandee', 'engage_cents'], ['cle', 'libelle', 'recommandee', 'engage_cents'], `${ou}.options[${j}]`, f)) return
          if (typeof op.cle !== 'string' || !CLE_OPTION_RE.test(op.cle)) f.push(`${ou}.options[${j}].cle : ^[a-z_]{2,30}$`)
          if (!chaine(op.libelle, 1, 80)) f.push(`${ou}.options[${j}].libelle : 80 signes au plus`)
          if (typeof op.recommandee !== 'boolean') f.push(`${ou}.options[${j}].recommandee : booléen`)
          if (!Number.isInteger(op.engage_cents) || op.engage_cents < 0) f.push(`${ou}.options[${j}].engage_cents : entier ≥ 0`)
          else if (op.engage_cents > 0) f.push(`${ou}.options[${j}].engage_cents : plafond de dépense 0`)
        })
        if (new Set(o.map((x) => x?.cle)).size !== o.length) f.push(`${ou}.options : clés en double`)
        if (o.filter((x) => x?.recommandee === true).length !== 1) f.push(`${ou}.options : exactement une recommandée`)
        const defaut = o.find((x) => x?.cle === d.option_defaut)
        if (!defaut) f.push(`${ou}.option_defaut : la clé d'une option`)
        else if (defaut.engage_cents !== 0) f.push(`${ou}.option_defaut : l'option par défaut n'engage rien (engage_cents 0)`)
      }
      if (!Number.isInteger(d.montant_cents) || d.montant_cents < 0) f.push(`${ou}.montant_cents : entier ≥ 0`)
      else if (d.montant_cents > 0) f.push(`${ou}.montant_cents : plafond de dépense 0`)
      if (!['aucune', 'argent', 'artisan', 'securite'].includes(d.portee)) f.push(`${ou}.portee inconnue`)
      const e = typeof d.echeance === 'string' ? Date.parse(d.echeance) : NaN
      if (!Number.isFinite(e) || e < maintenant.getTime() + HEURE || e > maintenant.getTime() + 7 * 24 * HEURE) f.push(`${ou}.echeance : entre +1 h et +7 j`)
      if (d.nature === 'idee') {
        if (!CLE_IDEE_RE.test(String(d.cle_idempotence))) f.push(`${ou} : une idée a une clé chef:<date>:idee-<mot-clé>`)
        const ks = Array.isArray(o) ? o.map((x) => x?.cle).sort().join(',') : ''
        if (ks !== 'lancer,reporter') f.push(`${ou} : une idée a exactement les options lancer et reporter`)
        if (Array.isArray(o) && o.some((x) => x?.engage_cents !== 0)) f.push(`${ou} : une idée n'engage rien`)
        if (d.option_defaut !== 'reporter') f.push(`${ou} : le défaut d'une idée est reporter`)
      } else if (String(d.cle_idempotence).includes(':idee-')) f.push(`${ou} : le préfixe idee- est réservé aux idées`)
    })
  }
  f.push(...fautesDeTexte(plan))
  return f
}

export function principal(fn) {
  fn().then((code) => { process.exitCode = code ?? 0 }).catch((e) => {
    console.error(`✗ ${e instanceof Arret ? e.message : (e?.message || e)}`)
    process.exitCode = e instanceof Arret ? e.code : 1
  })
}
