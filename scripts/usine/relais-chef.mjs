// scripts/usine/relais-chef.mjs — le relais de moteurs de la file du CHEF (ordre de Benj du 05/10/2026 : « l'équipe doit tourner via la
// TOTALITÉ des IA »). Pendant de lib/agents/relais.ts pour les demandes « codex exec » du chef, qui passent par chef-modele.mjs
// (compte chef-modele, sans coffre, sans réseau pour les commandes du modèle).
//
// Quand Codex (abonnement) est à bout — 401 « non connecté », « usage limit », panne, délai — la MÊME demande est rejouée sur le moteur
// suivant, le même argv sauf le fournisseur et le modèle : freellmapi (gemini-3-flash-preview, puis ministral-14b ; clé du compte
// chef-modele, jamais écrite), Ollama Cloud, puis le Ollama LOCAL de l'usine (8B, 4B). Les fournisseurs se joignent en 127.0.0.1 : la
// connexion au modèle n'est pas une commande du bac à sable (network_access = false ne concerne que celles-ci).
//
// Règle de Benj (non négociable) : une donnée de prospect ne part JAMAIS vers une IA gratuite ni un modèle :cloud. Le chef lit des
// consignes et des événements ; si l'entrée porte une adresse, un téléphone ou un SIREN (natureDeTexte), la demande est traitée comme
// « prospect » : Codex, ou le local de l'usine après le « oui » daté de Benj (IA_LOCALE_PROSPECTS_OUI), rien d'autre.
// Les règles de mise de côté sont celles de lib/agents/relais.ts (echeanceDeMiseDeCote) ; relais-ia-qa.mjs compare les deux.
// Module sans effet de bord à l'import ; aucun secret n'est jamais journalisé.
import fs from 'node:fs'
import path from 'node:path'

export const MINUTE = 60_000
export const HEURE = 60 * MINUTE

/** Les moteurs de secours, dans l'ordre. `gratuit` : jamais pour un prospect ; `local` : la machine de l'usine ; `cle` : a besoin de FL_KEY. */
export const CHAINE_SECOURS = Object.freeze([
  // « auto » : le routeur de freellmapi choisit le modèle libre disponible (essai réel du 05/10 sur l'usine : le plan du cycle léger en 50 s, a
  // la même boucle d'outils que Codex). gemini-3-flash-preview et ministral-14b suivent (Matt les utilise déjà), puis Ollama Cloud, puis le local.
  Object.freeze({ id: 'freellmapi', modele: 'auto', fournisseur: 'fl', cle: true, gratuit: true, local: false }),
  Object.freeze({ id: 'freellmapi_gemini', modele: 'gemini-3-flash-preview', fournisseur: 'fl', cle: true, gratuit: true, local: false }),
  Object.freeze({ id: 'freellmapi_mistral', modele: 'ministral-14b', fournisseur: 'fl', cle: true, gratuit: true, local: false }),
  Object.freeze({ id: 'ollama_cloud', modele: 'gpt-oss:120b-cloud', fournisseur: 'ollama-usine', cle: false, gratuit: true, local: false }),
  Object.freeze({ id: 'ollama_8b', modele: 'qwen3:8b-q4_K_M', fournisseur: 'ollama-usine', cle: false, gratuit: false, local: true }),
  Object.freeze({ id: 'ollama_4b', modele: 'qwen3:4b-instruct-2507-q4_K_M', fournisseur: 'ollama-usine', cle: false, gratuit: false, local: true }),
])
/** Le fournisseur freellmapi, tel que le lance scripts/usine.mjs (FOURNISSEURS) : la clé passe par l'environnement de Codex (env_key). */
export const CONFIG_FL = 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}'

// ── nature de la donnée ──────────────────────────────────────────────────────────────────────────────────────────────
const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const RE_TEL_FR = /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/
const RE_SIREN = /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/
/** Les adresses de Presti et d'essai ne sont pas des données de prospect. */
const ADRESSE_DE_PRESTI = /@(?:[\w-]+\.)*(?:prestiapp\.fr|presti-test\.invalid)$|\.invalid$|^noreply@|^no-reply@/i

/** « prospect » si le texte porte une adresse (hors Presti), un téléphone français ou un SIREN ; sinon « publique ». Pure. */
export function natureDeTexte(texte) {
  const t = String(texte ?? '')
  for (const m of t.match(RE_EMAIL) ?? []) if (!ADRESSE_DE_PRESTI.test(m)) return 'prospect'
  if (RE_TEL_FR.test(t) || RE_SIREN.test(t)) return 'prospect'
  return 'publique'
}

/** Le « oui » daté de Benj : une date AAAA-MM-JJ non future ; toute autre valeur éteint le drapeau. */
export function drapeauLeve(valeur, maintenantMs) {
  if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false
  const ts = Date.parse(`${valeur}T00:00:00Z`)
  return Number.isFinite(ts) && ts <= maintenantMs
}

/** Les moteurs permis pour une nature (hors Codex, toujours premier). Prospect : le local seulement, et seulement avec le « oui » daté. */
export function secoursPermis(nature, drapeau) {
  if (nature === 'prospect') return drapeau ? CHAINE_SECOURS.filter((m) => m.local) : []
  return [...CHAINE_SECOURS]
}

// ── classement d'une sortie de Codex, mise de côté ───────────────────────────────────────────────────────────────────
/** La sortie (stdout + stderr fusionnés) d'un « codex exec » en échec → { raison: 'quota'|'non_autorise'|'indisponible'|'delai', jusquaMs? }. Pure. */
export function classerSortie(sortie, maintenant, delaiDepasse = false) {
  const t = String(sortie ?? '')
  if (delaiDepasse) return { raison: 'delai' }
  if (/usage limit/i.test(t)) {
    const m = /try again at ([^\n]+?)(?:\.\s|\.?\n|$)/i.exec(t)
    let jusquaMs
    if (m) { const p = Date.parse(m[1].replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/, '$1T$2:00Z').trim()); if (Number.isFinite(p) && p > maintenant) jusquaMs = p }
    return { raison: 'quota', jusquaMs }
  }
  if (/\b429\b|too many requests|rate.?limit|exceeded retry limit|free usage limit/i.test(t)) return { raison: 'quota' }
  if (/\b401\b|Unauthorized|Missing bearer|\b40[23]\b|payment required|forbidden/i.test(t)) return { raison: 'non_autorise' }
  return { raison: 'indisponible' }
}

/** Jusqu'à quand un moteur est mis de côté (ms absolues), 0 : jamais. Mêmes règles que lib/agents/relais.ts. Pure. */
export function echeanceDeMiseDeCote(moteur, raison, maintenant, jusquaMs) {
  const local = moteur === 'ollama_8b' || moteur === 'ollama_4b'
  if (raison === 'quota') {
    if (moteur === 'codex') return Math.min(Math.max(jusquaMs ?? 0, maintenant + 15 * MINUTE), maintenant + 6 * HEURE)
    if (moteur === 'ollama_cloud') return maintenant + 6 * HEURE
    if (moteur.startsWith('freellmapi')) return jusquaMs ? Math.min(Math.max(jusquaMs, maintenant + MINUTE), maintenant + HEURE) : maintenant + 5 * MINUTE
    return maintenant + 2 * MINUTE
  }
  if (raison === 'non_autorise') return local ? maintenant + 2 * MINUTE : maintenant + HEURE
  return maintenant + (local ? 2 : 5) * MINUTE // indisponible, délai
}

// ── l'argv d'un moteur de secours ────────────────────────────────────────────────────────────────────────────────────
/** L'argv de la demande avec le fournisseur et le modèle du moteur : tout le reste (sandbox, -C, -o, instruction) est conservé tel quel. */
export function argvDeSecours(argv, m) {
  const sortie = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-m' || a === '--model') { i++; continue }
    if (a.startsWith('--model=')) continue
    sortie.push(a)
  }
  const [commande, ...reste] = sortie // 'exec'
  const avant = m.fournisseur === 'fl' ? ['-c', CONFIG_FL, '-c', 'model_provider=fl'] : ['-c', `model_provider=${m.fournisseur}`]
  return [commande, ...avant, '-m', m.modele, ...reste]
}

// ── mémoire et journal ───────────────────────────────────────────────────────────────────────────────────────────────
export function magasinFichier(dossier) {
  const fichier = path.join(dossier, 'etat-chef.json')
  let secours = {}
  return {
    lire: () => { try { const j = JSON.parse(fs.readFileSync(fichier, 'utf8')); return j && typeof j.moteurs === 'object' && j.moteurs ? j.moteurs : {} } catch { return secours } },
    ecrire: (etat) => {
      secours = etat
      try { fs.mkdirSync(dossier, { recursive: true }); const tmp = `${fichier}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify({ moteurs: etat }), { mode: 0o600 }); fs.renameSync(tmp, fichier) } catch { /* mesure facultative */ }
    },
  }
}
export function journalFichier(dossier, maintenant = Date.now) {
  return (ligne) => {
    try {
      fs.mkdirSync(dossier, { recursive: true })
      const jour = new Date(maintenant()).toISOString().slice(0, 10)
      fs.appendFileSync(path.join(dossier, `relais-chef-${jour}.jsonl`), `${JSON.stringify(ligne)}\n`, { mode: 0o600 })
    } catch { /* mesure facultative */ }
  }
}

// ── le relais ────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Rejoue la demande sur le moteur suivant tant que le précédent est à bout.
 * opts : { argv, texteEntree, delaiMs, lancer(argv, delaiMs, extraEnv) → { code, sortie, delai? }, etat, journal, maintenant, cle, drapeau,
 *         verifier?() → booléen : le travail attendu (le plan) est-il bien écrit ? }
 * Un moteur libre peut sortir en code 0 sans avoir fait le travail (un routeur qui répond en prose, essai réel du 05/10) : sans `verifier` vrai,
 * ce n'est pas un succès, et le moteur suivant prend la demande (sans mise de côté : le routeur peut répondre juste la fois d'après).
 * → { code, sortie, moteur } (le moteur qui a servi, ou le dernier essayé ; moteur null si aucun n'était disponible).
 */
export async function relayer(opts) {
  const { argv, delaiMs, lancer, etat, journal } = opts
  const maintenant = opts.maintenant ?? Date.now
  const debut = maintenant()
  const nature = natureDeTexte(opts.texteEntree)
  const dire = (ligne) => journal({ le: new Date(maintenant()).toISOString(), agent: 'chef', nature, ...ligne })
  const file = [{ id: 'codex', modele: null, fournisseur: null, cle: false, gratuit: false, local: false }, ...secoursPermis(nature, opts.drapeau === true)]
  if (nature === 'prospect') dire({ moteur: 'relais', issue: 'saute', raison: 'prospect_local_seulement' })
  let derniere = null
  for (const m of file) {
    const reste = delaiMs - (maintenant() - debut)
    if (reste < 30_000) break
    const bout = etat.lire()[m.id]
    if (bout && bout.jusqua > maintenant()) { dire({ moteur: m.id, issue: 'saute', raison: bout.raison, jusqua: new Date(bout.jusqua).toISOString() }); continue }
    if (m.cle && !opts.cle) { dire({ moteur: m.id, issue: 'saute', raison: 'cle_absente' }); continue }
    if (nature === 'prospect' && (m.gratuit || (!m.local && m.id !== 'codex'))) continue // deuxième verrou : jamais le gratuit ni le cloud
    const budget = m.id === 'codex' ? reste : Math.min(reste, 540_000)
    const t0 = Date.now()
    const r = await lancer(m.id === 'codex' ? argv : argvDeSecours(argv, m), budget, m.cle ? { FL_KEY: opts.cle } : {})
    const ms = Date.now() - t0
    const fait = r.code === 0 && (typeof opts.verifier !== 'function' || opts.verifier() === true)
    if (fait) {
      const courant = etat.lire()
      if (courant[m.id]) { delete courant[m.id]; etat.ecrire(courant) }
      dire({ moteur: m.id, modele: m.modele ?? 'codex', issue: 'ok', ms })
      return { code: 0, sortie: r.sortie, moteur: m.id }
    }
    if (r.code === 0) { // code 0 mais le plan n'est pas là : ni quota ni panne, rien n'est mis de côté
      dire({ moteur: m.id, modele: m.modele ?? 'codex', issue: 'bascule', raison: 'sortie_invalide', ms })
      derniere = { code: 1, sortie: r.sortie, moteur: m.id }
      continue
    }
    const c = classerSortie(r.sortie, maintenant(), r.delai === true)
    const jusqua = echeanceDeMiseDeCote(m.id, c.raison, maintenant(), c.jusquaMs)
    const courant = etat.lire()
    courant[m.id] = { jusqua, raison: c.raison, vu: new Date(maintenant()).toISOString() }
    etat.ecrire(courant)
    dire({ moteur: m.id, modele: m.modele ?? 'codex', issue: 'bascule', raison: c.raison, ms, jusqua: new Date(jusqua).toISOString() })
    derniere = { code: r.code || 1, sortie: r.sortie, moteur: m.id }
  }
  return derniere ?? { code: 3, sortie: 'relais du chef : aucun moteur disponible pour le moment\n', moteur: null }
}
