// scripts/fixtures/026/llm/executer.mjs — l'enfant partagé de la fiche 026-041, écrit par Claude Code.
//
// Lancé par le juge : `node --experimental-strip-types --import <dépôt>/scripts/ts-loader.mjs <ce fichier> <config.json>`,
// cwd = la racine jugée (donc `@/lib/...` s'y résout). Importe `lib/agents/llm.ts` et `lib/agents/moteurs.ts` DE CETTE
// RACINE, construit `deps` (jamais `process.env` : `deps.env` vient uniquement de `config.depsEnv`), exécute la liste
// `config.actions` dans l'ordre, puis écrit `config.sortie` en JSON, avec le nonce reçu (une sortie ancienne ou forgée
// est refusée par le juge). N'importe et n'exécute que ce que `config` désigne ; ne se fie à aucun journal écrit par le
// module lui-même — les journaux qui comptent (`appelsLancer`, `appelsCout`) sont ceux QUE CE FICHIER tient, pas ceux
// que le module pourrait écrire.
//
// Vocabulaire des actions (voir agents-llm-qa.mjs pour l'emploi de chacune) :
//   exports                                            — exports des deux modules, gel compris
//   creerLecteur    { id, agent, options }              — llm.creerLecteur(agent, options, deps) → lecteurs[id]
//   appelerLecteur  { id, lecteurId, systeme, donnees }  — appelle lecteurs[id], capture résolution ou rejet
//   appelerFonction { id, module?, nom, args }           — appelle une fonction exportée (module: 'llm'|'moteurs'|omis)
//   avancerHorloge  { ms }                               — avance l'horloge simulée de deps.maintenant(), sans attendre
//   attendreReel    { ms }                               — une vraie pause (rare : laisser un minuteur réel arriver)
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const configPath = process.argv[2]
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const resultat = { exports: {}, creerLecteur: {}, appels: {}, appelsLancer: [], appelsCout: [] }
const sortie = { nonce: cfg.nonce }

function ecrire(objet) { fs.writeFileSync(cfg.sortie, JSON.stringify(objet)) }
process.on('uncaughtException', (e) => { ecrire({ nonce: cfg.nonce, exception: `uncaughtException : ${e?.stack || e}`, resultat }); process.exit(1) })
process.on('unhandledRejection', (e) => { ecrire({ nonce: cfg.nonce, exception: `unhandledRejection : ${e?.stack || e}`, resultat }); process.exit(1) })

// ── deps : la seule voie du module vers l'extérieur, jamais process.env ni un vrai secret ──────────────────────────
let horlogeOffset = 0
const depsEnv = { ...(cfg.depsEnv || {}) }
let compteurLancer = 0
function lancer(command, args = [], options = {}) {
  const optionsRecues = { shell: !!options?.shell, cwd: options?.cwd, env: options?.env ? { ...options.env } : undefined, stdio: options?.stdio ?? null }
  const estMjs = /\.mjs$/i.test(String(command))
  const realCommand = estMjs ? process.execPath : command
  const realArgs = estMjs ? [command, ...(args || [])] : (args || [])
  const envReel = {
    ...(options?.env || {}),
    FAUX_LANCEUR_JOURNAL: cfg.journalLancer || '', FAUX_LANCEUR_COMPTEUR: cfg.lanceurCompteur || '',
    FAUX_LANCEUR_SCENARIOS: JSON.stringify(cfg.lanceurScenarios || ['propre']),
    FAUX_LANCEUR_CONTENU: JSON.stringify(cfg.lanceurContenu ?? { classe: 'oui' }),
    FAUX_LANCEUR_ECHEANCE: cfg.lanceurEcheance || '',
    FAUX_JEV_JOURNAL: cfg.journalJev || '', FAUX_JEV_REPONSE: cfg.jevReponse ? JSON.stringify(cfg.jevReponse) : '',
    FAUX_JEV_SCENARIO: cfg.jevScenario || 'ok',
  }
  const enfant = spawn(realCommand, realArgs, { cwd: options?.cwd, env: envReel, stdio: options?.stdio || ['pipe', 'pipe', 'pipe'], windowsHide: true })
  const n = compteurLancer++
  resultat.appelsLancer[n] = { command, argv: args, options: optionsRecues, pid: enfant.pid }
  ecrire({ nonce: cfg.nonce, enCours: true, resultat })
  return enfant
}
let compteurCout = 0
async function enregistrerCout(agent, montant, detail) {
  const comportements = Array.isArray(cfg.coutComportement) ? cfg.coutComportement : [cfg.coutComportement || 'ok']
  const c = comportements[Math.min(compteurCout, comportements.length - 1)]
  resultat.appelsCout.push({ agent, montant, detail })
  compteurCout++
  if (c === 'rejette') throw new Error('enregistrerCout : panne simulée par le juge')
  if (c === 'coupe') return { coupe: true }
  return { ok: true }
}
function maintenant() { return Date.now() + horlogeOffset }
async function attendre(ms) {
  if (cfg.horlogeControlee) { horlogeOffset += ms; return undefined }
  return new Promise((r) => setTimeout(r, ms))
}
const deps = { env: depsEnv, lancer, fetch, enregistrerCout, maintenant, attendre }

// ── import des deux modules ───────────────────────────────────────────────────────────────────────────────────────
let LLM = null, MOTEURS = null, erreurImport = null
try { LLM = await import('@/lib/agents/llm.ts') } catch (e) { erreurImport = `import lib/agents/llm.ts : ${e?.message || e}` }
try { MOTEURS = await import('@/lib/agents/moteurs.ts') } catch (e) { if (!erreurImport) erreurImport = `import lib/agents/moteurs.ts : ${e?.message || e}` }
if (erreurImport) { ecrire({ nonce: cfg.nonce, erreurImport, resultat }); process.exit(0) }

const estObjetSimple = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
function decrireExport(v) {
  if (typeof v === 'function') return { type: 'function' }
  if (typeof v !== 'object' || v === null) return { type: typeof v, valeur: v }
  const gele = Object.isFrozen(v)
  let sousGele
  if (!Array.isArray(v) && estObjetSimple(v)) {
    const entrees = Object.entries(v).filter(([, x]) => estObjetSimple(x))
    if (entrees.length) sousGele = Object.fromEntries(entrees.map(([k, x]) => [k, Object.isFrozen(x)]))
  }
  return { type: Array.isArray(v) ? 'array' : 'object', valeur: v, gele, ...(sousGele ? { sousGele } : {}) }
}
// Fonctions qui font de l'E/S (§ contrat de la fiche) : `deps` leur est ajouté automatiquement en dernier argument,
// jamais fourni par l'action elle-même (deps porte des fonctions : non sérialisable en JSON). Les fonctions pures de
// moteurs.ts (choisirVoie, conseillersPour…) et emballerDonnees/retirerCoordonnees n'en ont pas besoin.
const FONCTIONS_AVEC_DEPS = new Set(['demanderConseil', 'decider', 'noter', 'vraisemblance'])
function fonctionExportee(nom, module) {
  const cands = module === 'llm' ? [LLM] : module === 'moteurs' ? [MOTEURS] : [LLM, MOTEURS]
  for (const m of cands) if (m && typeof m[nom] === 'function') return m[nom]
  return null
}

const lecteurs = {}
for (const action of cfg.actions || []) {
  try {
    if (action.op === 'exports') {
      resultat.exports.llm = Object.fromEntries(Object.entries(LLM || {}).map(([k, v]) => [k, decrireExport(v)]))
      resultat.exports.moteurs = Object.fromEntries(Object.entries(MOTEURS || {}).map(([k, v]) => [k, decrireExport(v)]))
    } else if (action.op === 'creerLecteur') {
      const fn = LLM.creerLecteur(action.agent, action.options, deps)
      lecteurs[action.id] = fn
      resultat.creerLecteur[action.id] = { estNull: fn === null || fn === undefined, type: typeof fn }
    } else if (action.op === 'appelerLecteur') {
      const fn = lecteurs[action.lecteurId]
      if (typeof fn !== 'function') { resultat.appels[action.id] = { ok: false, erreur: 'lecteur absent ou null' }; continue }
      try { const valeur = await fn(action.systeme, action.donnees); resultat.appels[action.id] = { ok: true, valeur } }
      catch (e) { resultat.appels[action.id] = { ok: false, erreur: String(e?.message || e) } }
    } else if (action.op === 'appelerFonction') {
      const fn = fonctionExportee(action.nom, action.module)
      if (!fn) { resultat.appels[action.id] = { ok: false, erreur: `export introuvable : ${action.nom}` }; continue }
      const args = FONCTIONS_AVEC_DEPS.has(action.nom) ? [...(action.args || []), deps] : (action.args || [])
      try { const valeur = await fn(...args); resultat.appels[action.id] = { ok: true, valeur } }
      catch (e) { resultat.appels[action.id] = { ok: false, erreur: String(e?.message || e) } }
    } else if (action.op === 'avancerHorloge') {
      horlogeOffset += action.ms
    } else if (action.op === 'attendreReel') {
      await new Promise((r) => setTimeout(r, action.ms))
    } else {
      resultat.appels[action.id || 'inconnu'] = { ok: false, erreur: `action inconnue : ${action.op}` }
    }
  } catch (e) {
    resultat.appels[action.id || action.op] = { ok: false, erreur: `exception de l'action ${action.op} : ${e?.stack || e}` }
  }
}
ecrire({ nonce: cfg.nonce, resultat })
