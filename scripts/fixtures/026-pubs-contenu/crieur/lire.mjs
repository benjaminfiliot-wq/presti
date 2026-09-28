// scripts/fixtures/026-pubs-contenu/crieur/lire.mjs — les jeux d'essai du Crieur (fiche 026-116, « Ce qu'il faut
// faire », point 2), écrits par Claude Code. Consommés par scripts/crieur-qa.mjs (--partie=composer, --partie=route)
// et par ce que construiront lib/crieur/composer.ts (026-119) et lib/crieur/publora.ts (026-122) : ce module ne
// juge rien, il ne fait que lire — jamais de fetch, jamais de process.env.
//
//   FIXTURES                         ce dossier.
//   lireEtats()                      etats/*.json → [{ nom, fichier, etat }] (etat encore SYMBOLIQUE : voir resoudreEtat).
//   resoudreEtat(etat, maintenant)   remplace `faits_publies_relatifs` (jours relatifs à `maintenant`, négatif = passé)
//                                    par des dates ISO absolues fondues dans `faits_publies`, sans muter l'entrée —
//                                    pour que les jeux d'essai ne rassissent jamais (fait-recent.json).
//   lireCorpusJuge()                 corpus-juge.json : { faits, phrasesGabarit, drapeauxBase, conformes, fautives }
//                                    — chaque cas à `texteBase` + `repeter` est déjà résolu en `texte`.
//   lireConnexionsPublora()          publora-connexions.json : la réponse d'essai de GET /platform-connections.
//   creerFauxFetch(reponses)         { fetch, requetes } : `fetch` n'appelle jamais le réseau, enregistre chaque
//                                    appel { url, methode, entetes, corps } dans `requetes`, et rend la réponse
//                                    déclarée dans `reponses[url]` (ou `reponses.defaut`) — { status?, corps }.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

function lireJson(rel) {
  const f = path.join(FIXTURES, rel)
  let brut
  try { brut = fs.readFileSync(f, 'utf8') } catch { throw new Error(`scripts/fixtures/026-pubs-contenu/crieur/${rel} introuvable`) }
  try { return JSON.parse(brut) } catch (e) { throw new Error(`scripts/fixtures/026-pubs-contenu/crieur/${rel} illisible : ${e.message}`) }
}

/** etats/*.json → [{ nom, fichier, etat }], triés par nom de fichier. */
export function lireEtats() {
  const dossier = path.join(FIXTURES, 'etats')
  const noms = fs.readdirSync(dossier).filter((f) => f.endsWith('.json')).sort()
  if (!noms.length) throw new Error('scripts/fixtures/026-pubs-contenu/crieur/etats/ : aucun fichier .json')
  return noms.map((f) => ({ nom: f.replace(/\.json$/, ''), fichier: path.join(dossier, f), etat: lireJson(path.join('etats', f)) }))
}

/** `etat` avec `faits_publies_relatifs` résolu en dates ISO absolues (jours relatifs à `maintenant`), sans mutation. */
export function resoudreEtat(etat, maintenant) {
  const { faits_publies_relatifs, ...reste } = etat
  const faits_publies = { ...(etat.faits_publies || {}) }
  for (const [id, jours] of Object.entries(faits_publies_relatifs || {})) {
    faits_publies[id] = new Date(maintenant.getTime() + Number(jours) * 86_400_000).toISOString()
  }
  return { ...reste, faits_publies }
}

function resoudreCas(c) {
  if (c.texteBase && c.repeter) {
    const { texteBase, repeter, ...reste } = c
    return { ...reste, texte: Array.from({ length: repeter }, () => texteBase).join(' ') }
  }
  return c
}

/** corpus-juge.json, cas à texteBase/repeter déjà résolus en texte. */
export function lireCorpusJuge() {
  const c = lireJson('corpus-juge.json')
  if (!Array.isArray(c.conformes) || !c.conformes.length) throw new Error('corpus-juge.json : conformes non vide attendu')
  if (!Array.isArray(c.fautives) || !c.fautives.length) throw new Error('corpus-juge.json : fautives non vide attendu')
  return { ...c, conformes: c.conformes.map(resoudreCas), fautives: c.fautives.map(resoudreCas) }
}

/** publora-connexions.json : la réponse d'essai de GET /platform-connections. */
export function lireConnexionsPublora() {
  return lireJson('publora-connexions.json')
}

/**
 * Un `fetch` d'essai : jamais le réseau, enregistre chaque appel, rend la réponse déclarée. `reponses[url].corps`
 * est rendu par `.json()` ; `.status` par défaut 200. Une URL sans réponse déclarée (ni `reponses.defaut`) lève —
 * un appel non prévu par le test ne doit jamais passer inaperçu.
 */
export function creerFauxFetch(reponses = {}) {
  const requetes = []
  const fetch = async (url, options = {}) => {
    let corps = null
    if (options.body) { try { corps = JSON.parse(options.body) } catch { corps = options.body } }
    requetes.push({ url: String(url), methode: options.method || 'GET', entetes: { ...(options.headers || {}) }, corps })
    const r = reponses[String(url)] ?? reponses.defaut
    if (!r) throw new Error(`creerFauxFetch : aucune réponse déclarée pour ${url}`)
    const status = r.status ?? 200
    return { ok: status >= 200 && status < 300, status, json: async () => r.corps, text: async () => JSON.stringify(r.corps) }
  }
  return { fetch, requetes }
}
