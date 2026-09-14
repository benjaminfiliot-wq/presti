#!/usr/bin/env node
// juges/code-qa.mjs — le juge du code : un seul verdict pour lint, typecheck et tests.
//
// Pourquoi ce fichier existe : « le code est propre » n'est pas vérifiable, donc ce n'est jamais prouvé.
// Ici, trois commandes, dans l'ordre, chacune sous délai, et un verdict PASS/FAIL avec la première
// ligne d'erreur — même modèle que video-qa.mjs et site-qa.mjs.
//
//   node juges/code-qa.mjs                    depuis le projet (la racine = le dossier qui contient
//                                             .orchestre/, remonté depuis le cwd ; sinon le cwd)
//   node juges/code-qa.mjs --minutes=5        délai par commande (défaut 10 min)
//   node juges/code-qa.mjs --json             sortie machine
//   node juges/code-qa.mjs --tout             continue après un échec (défaut : on s'arrête au premier)
//
// D'où viennent les commandes : .orchestre/orchestre.json → "juges": { "code": { "lint", "typecheck", "tests" } } ;
// sinon les scripts de package.json (lint → npm run lint, typecheck → npm run typecheck, test → npm test).
// Une commande absente des deux est « sautée » et dite.
//
// Sortie : une ligne par étape (✓ / ✗ / – et la durée), puis « code-qa : PASS|FAIL — <première ligne d'erreur> ».
// Code de sortie : 0 si tout passe (ou tout sauté), 1 dès qu'une étape échoue ou dépasse le délai.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ETAPES = ['lint', 'typecheck', 'tests']
const SCRIPTS_NPM = { lint: ['lint', 'npm run lint'], typecheck: ['typecheck', 'npm run typecheck'], tests: ['test', 'npm test'] }

// ── options ───────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const json = args.includes('--json')
const tout = args.includes('--tout')
const minutesArg = args.find((a) => a.startsWith('--minutes='))
const minutes = minutesArg ? Number(minutesArg.slice('--minutes='.length)) : 10
const DELAI_MS = (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60_000

// ── racine et commandes ───────────────────────────────────────────────────────────────────────────
function trouverRacine(depart) {
  let d = path.resolve(depart)
  for (;;) {
    if (fs.existsSync(path.join(d, '.orchestre'))) return d
    const parent = path.dirname(d)
    if (parent === d) return null
    d = parent
  }
}

function lireJson(fichier) {
  try { return JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch { return null }
}

const RACINE = trouverRacine(process.cwd()) || process.cwd()

function commandes() {
  const cfg = lireJson(path.join(RACINE, '.orchestre', 'orchestre.json'))
  const code = cfg && cfg.juges && cfg.juges.code && typeof cfg.juges.code === 'object' ? cfg.juges.code : null
  const pkg = lireJson(path.join(RACINE, 'package.json'))
  const scripts = pkg && pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}
  const resultat = {}
  for (const etape of ETAPES) {
    if (code && typeof code[etape] === 'string' && code[etape].trim()) { resultat[etape] = { commande: code[etape].trim(), origine: 'orchestre.json' }; continue }
    const [script, cmd] = SCRIPTS_NPM[etape]
    if (typeof scripts[script] === 'string' && scripts[script].trim()) { resultat[etape] = { commande: cmd, origine: 'package.json' }; continue }
    resultat[etape] = null
  }
  return resultat
}

// ── exécution sous délai ──────────────────────────────────────────────────────────────────────────
function premiereLigne(texte) {
  const l = (texte || '').split(/\r?\n/).map((s) => s.trim()).find((s) => s && !/^npm (err!|error|warn)?\s*$/i.test(s))
  return l || ''
}

// Le bruit de npm : « > lint », « > eslint . », « npm ERR! », « npm error … » — jamais la vraie erreur.
const estBruitNpm = (s) => /^npm\b/i.test(s) || /^>\s/.test(s) || /^\$\s/.test(s)

function premiereErreur(res) {
  // les erreurs vont d'abord sur stderr ; mais ESLint et tsc écrivent leurs diagnostics sur stdout
  const err = (res.stderr || '').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !estBruitNpm(s))
  if (err[0]) return err[0]
  const out = (res.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !estBruitNpm(s))
  return out.find((s) => /error|erreur|✖|fail|échec|TS\d{4}/i.test(s)) || out[0] || premiereLigne(res.stderr) || premiereLigne(res.stdout) || ''
}

const delaiLisible = () => (DELAI_MS >= 60_000 ? `${Math.round(DELAI_MS / 60_000)} min` : `${Math.round(DELAI_MS / 1000)} s`)

function executer(commande) {
  const debut = Date.now()
  const res = spawnSync(commande, {
    cwd: RACINE,
    shell: true,
    encoding: 'utf8',
    timeout: DELAI_MS,
    killSignal: 'SIGTERM',
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    maxBuffer: 64 * 1024 * 1024,
  })
  const duree = Date.now() - debut
  const delaiDepasse = Boolean(res.error && res.error.code === 'ETIMEDOUT') || (res.signal === 'SIGTERM' && duree >= DELAI_MS - 50)
  if (delaiDepasse) return { etat: 'delai', duree, erreur: `délai de ${delaiLisible()} dépassé`, stdout: res.stdout, stderr: res.stderr }
  if (res.error) return { etat: 'echec', duree, erreur: res.error.message, stdout: res.stdout, stderr: res.stderr }
  if (res.status === 0) return { etat: 'ok', duree, erreur: '', stdout: res.stdout, stderr: res.stderr }
  return { etat: 'echec', duree, erreur: premiereErreur(res) || `code de sortie ${res.status}`, stdout: res.stdout, stderr: res.stderr }
}

// ── le juge ───────────────────────────────────────────────────────────────────────────────────────
const secondes = (ms) => `${(ms / 1000).toFixed(1)} s`
const SYMBOLE = { ok: '✓', echec: '✗', delai: '✗', sautee: '–', 'non-lancee': '–' }

const cmds = commandes()
const etapes = []
let premiere = ''
let echoue = false
for (const nom of ETAPES) {
  const c = cmds[nom]
  if (!c) { etapes.push({ nom, commande: null, etat: 'sautee', duree_ms: 0, erreur: '', detail: 'aucune commande (ni orchestre.json, ni package.json)' }); continue }
  if (echoue && !tout) { etapes.push({ nom, commande: c.commande, etat: 'non-lancee', duree_ms: 0, erreur: '', detail: 'échec en amont' }); continue }
  const r = executer(c.commande)
  etapes.push({ nom, commande: c.commande, origine: c.origine, etat: r.etat, duree_ms: r.duree, erreur: r.erreur, detail: '' })
  if (r.etat !== 'ok') { echoue = true; if (!premiere) premiere = `${nom} : ${r.erreur}` }
}
const verdict = echoue ? 'FAIL' : 'PASS'
const sautees = etapes.filter((e) => e.etat === 'sautee').length
// Un PASS où rien n'a tourné n'est pas une preuve : on le dit sur la ligne de verdict.
const note = premiere || (sautees === ETAPES.length ? `rien n'a été vérifié (${sautees} étapes sautées)` : '')

if (json) {
  console.log(JSON.stringify({ juge: 'code-qa', verdict, racine: RACINE, delai_ms: DELAI_MS, premiereErreur: premiere, note, etapes }, null, 2))
} else {
  for (const e of etapes) {
    const partie = e.etat === 'sautee' ? `sautée — ${e.detail}` : e.etat === 'non-lancee' ? `non lancée — ${e.detail}` : secondes(e.duree_ms)
    const cmd = e.commande ? `  (${e.commande})` : ''
    const err = e.etat === 'echec' || e.etat === 'delai' ? ` — ${e.erreur}` : ''
    console.log(`${SYMBOLE[e.etat]} ${e.nom.padEnd(9)} ${partie}${cmd}${err}`)
  }
  console.log(`code-qa : ${verdict}${note ? ` — ${note}` : ''}`)
}
process.exit(verdict === 'PASS' ? 0 : 1)
