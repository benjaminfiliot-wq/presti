#!/usr/bin/env node
// scripts/revue-qa.mjs — le juge de la revue du lundi (A11) : les chiffres de scripts/chef/revue-donnees.mjs (026-146)
// et le document docs/revues/AAAA-SS.md. Écrit par Claude Code (fiche 026-121).
//
// Usage :
//   node scripts/revue-qa.mjs [--racine=<copie>] [--critere=RV-1,RV-3] [--garder]
//        RV-1 à RV-6 sur scripts/chef/revue-donnees.mjs de la racine (le dépôt par défaut ; une copie pour les mutations
//        de 026-151). Les fixtures restent celles du dépôt (scripts/fixtures/026/revue/).
//   node scripts/revue-qa.mjs --document=docs/revues/AAAA-SS.md --donnees=revue.json
//        juge UN document de revue contre ses données (RV-4) : c'est la commande de la routine du lundi.
//   node scripts/revue-qa.mjs --preuve-echecs
//        le juge se prouve : ses fixtures ; rouge sur l'arbre de référence (sans revue-donnees.mjs), RV-1 en premier
//        échec ; vert sur le témoin (scripts/fixtures/026/revue/temoin/, implémentation de référence jamais déployée) ;
//        chaque sabotage du témoin fait échouer le critère qu'il vise.
//
// Codes : 0 tout est vert ; 1 un critère en échec ; 2 préalable manquant (argument inconnu, fixture absente).
// Sortie : `PASS <critère> — …` ou `FAIL <critère> — …` (suivie de `  ✗ …`), dans l'ordre RV-1 … RV-6.
// Tout se passe sous .orchestre/travail/revue-qa/ ; aucun appel réseau hors 127.0.0.1.
//
// Critères :
//   RV-1  --semaine=2026-38 --verdicts --agents --etat (fixtures) → le JSON est ÉGAL, clé par clé, à attendu.json
//         (calculé à la main) ; la semaine ISO se compte à l'heure de Paris : un verdict du dimanche 20/09 à 22 h 30 UTC
//         tombe dans la semaine suivante, celui du dimanche 13/09 à 22 h 30 UTC dans celle-ci. Second passage sur les
//         MÊMES fixtures avec --semaine=2026-39 → égal à attendu-2026-39.json (une sortie figée sur la semaine 38, ou
//         qui ignore les verdicts, ne passe pas). Dans les deux semaines, un PASS « en-cours » précède ou remplace le
//         PASS depuis fait/ : une réussite comptée sans `dossier: fait` change la médiane (38) ou le compte (39).
//   RV-2  sans état (fichier absent ; 401 d'un faux serveur ; port fermé ; jeton absent) → argent, entonnoir et
//         fraicheur.etat valent « non mesuré », le reste ne bouge pas, code 0.
//   RV-3  des lignes abîmées (JSON coupé, ligne vide, fins de ligne CRLF) dans les deux fichiers → comptées dans
//         lignes_illisibles, sans plantage, le reste ne bouge pas.
//   RV-4  --document sur les fixtures : le document conforme passe ; un nombre absent des données échoue en le nommant
//         (dates, numéros de semaine et de section, identifiants exclus) ; deux décisions, une décision sans « € » ou
//         sans « Source : », des décisions mal classées, une section absente ou plus de 120 lignes échouent.
//         Ce qui n'est PAS un nombre à vérifier, et rien d'autre : une date VALIDE (jour ≤ 31, mois ≤ 12) ; une heure
//         HH:MM ; une semaine AAAA-SS ou « semaine SS » (SS ≤ 53) ; un numéro de section ou de liste qui SE SUIT (1., puis
//         2., …) ; un identifiant LETTRES-chiffres (RV-1, gpt-6-sol, A11) ou NNN-NN(N) (026-146), sans « € » à côté ;
//         le code en ligne (ou un commentaire) SANS chiffre ; un lien. Un nombre abrégé (12k, 2M, 1e3) échoue toujours ;
//         un nombre collé à des lettres (3x, 2e, 45min), le code en ligne ou en bloc qui porte un chiffre, une fraction
//         (17/20), une fourchette (100-200 €) et une durée (3 h 45) se vérifient comme le reste.
//   RV-5  revue-donnees.mjs n'écrit que --sortie (racine d'essai et fixtures relues avant et après) et n'appelle que
//         --base (une seule requête GET /api/agents/etat au faux serveur, jeton en en-tête, jamais dans l'URL ; aucune
//         autre adresse dans le code que https://prestiapp.fr, 127.0.0.1 ou localhost).
//   RV-6  la consigne : docs/agents/revue-hebdo.md (aucun connecteur, jamais de fusion, les deux commandes, la branche,
//         distinct du cycle du chef) et docs/revues/GABARIT.md (cinq sections dans l'ordre, trois décisions, 120 lignes).
//
// Contrats précisés par ce juge (écarts de lecture notés dans echecs-attendus.md de 026-121) :
//   - `executants` est un objet dont les clés sont les exécutants (`executant`, sinon `agent`) qui ont au moins un
//     verdict dans la semaine ; `pass`/`fail` comptent les verdicts PASS/FAIL (une REFUSÉE ne compte ni l'un ni l'autre) ;
//   - `minutes_mediane_par_reussite` : pour chaque tâche réussie, du PREMIER lancement connu (toutes lignes
//     d'agents.jsonl de cette tâche) jusqu'à son PREMIER PASS depuis fait/ de la semaine ; médiane, puis arrondi ;
//   - `du` et `au` : le lundi et le dimanche de la semaine (jours civils de Paris) ;
//   - `lignes_illisibles` : la somme des lignes illisibles de verdicts.jsonl et d'agents.jsonl (une ligne vide n'en est
//     pas une) ; `fraicheur.verdicts` : la date de la dernière ligne lisible de verdicts.jsonl ;
//   - `fraicheur.etat` : `genere_le` de l'état ; « non mesuré » sans état.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import net from 'node:net'
import crypto from 'node:crypto'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const NOM = 'revue-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026', 'revue')
const TEMOIN = path.join(FIX, 'temoin', 'revue-donnees.mjs')
const CRITERES = ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6']
const SCRIPT = 'scripts/chef/revue-donnees.mjs'
const NON_MESURE = 'non mesuré'
const TITRES = ['Entonnoir', 'Argent et coûts', 'Exécutants', 'Échecs', 'Trois décisions']
const MAX_LIGNES = 120
const ENV_SYSTEME = ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'SYSTEMDRIVE', 'LANG', 'TZ']

// ── arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['racine', 'critere', 'document', 'donnees', 'preuve-echecs', 'garder']
for (const a of ARGS) {
  const m = /^--([a-z-]+)(=.*)?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --racine=, --critere=, --document=, --donnees=, --preuve-echecs, --garder)`); process.exit(2) }
}
const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────────
const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
const lire = (p) => fs.readFileSync(p, 'utf8')
const court = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const JETON = `essai-revue-${crypto.randomBytes(18).toString('hex')}`
const nettoyer = (d) => { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* tenu : le suivant sera neuf */ } }
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', NOM, `${process.pid}-${crypto.randomBytes(3).toString('hex')}`)
let compteur = 0
function dossierNeuf(nom) { const d = path.join(TRAVAIL, `${nom}-${++compteur}`); nettoyer(d); fs.mkdirSync(d, { recursive: true }); return d }
function lister(d, base = d, out = new Map()) {
  if (!existe(d)) return out
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) lister(p, base, out)
    else out.set(path.relative(base, p).split(path.sep).join('/'), sha(fs.readFileSync(p)))
  }
  return out
}
function copierArbre(de, vers) {
  if (!existe(de)) return
  fs.mkdirSync(vers, { recursive: true })
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    const a = path.join(de, e.name), b = path.join(vers, e.name)
    if (e.isDirectory()) copierArbre(a, b)
    else fs.copyFileSync(a, b)
  }
}
function environnement(extra = {}) {
  const env = {}
  for (const k of Object.keys(process.env)) if (ENV_SYSTEME.includes(k.toUpperCase())) env[k] = process.env[k]
  return { ...env, FORCE_COLOR: '0', ...extra }
}
function tuerArbre(pid) {
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(pid, 'SIGKILL')
  } catch { /* déjà mort */ }
}
// Lancement ASYNCHRONE (le faux serveur tourne dans ce processus : un spawnSync le bloquerait).
function lancer(args, { cwd, env, delai = 60_000 } = {}) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, args, { cwd, env, windowsHide: true })
    let stdout = '', stderr = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { stdout += d })
    enfant.stderr.on('data', (d) => { stderr += d })
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delai)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), stdout, stderr, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, stdout, stderr: `${stderr}\n${e.message}`, expire }) })
  })
}
async function pool(elements, n, fn) {
  const out = new Array(elements.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, elements.length) }, async () => { while (i < elements.length) { const k = i++; out[k] = await fn(elements[k], k) } }))
  return out
}
const decrire = (r) => `code ${r.code}${r.expire ? ' (délai dépassé)' : ''}${(r.stdout + r.stderr).trim() ? ` : ${court((r.stderr || r.stdout).trim().split(/\r?\n/).slice(-2).join(' / '), 160)}` : ''}`

// Comparaison clé par clé : une clé en trop ou en moins est un écart.
function ecarts(attendu, obtenu, chemin = '', out = []) {
  if (estObjet(attendu) && estObjet(obtenu)) {
    for (const k of Object.keys(attendu)) {
      if (!(k in obtenu)) out.push(`${chemin}${k} : clé absente`)
      else ecarts(attendu[k], obtenu[k], `${chemin}${k}.`, out)
    }
    for (const k of Object.keys(obtenu)) if (!(k in attendu)) out.push(`${chemin}${k} : clé en trop`)
  } else if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) {
    out.push(`${chemin.replace(/\.$/, '')} : attendu ${JSON.stringify(attendu)}, obtenu ${court(JSON.stringify(obtenu), 80)}`)
  }
  return out
}

// ── le faux serveur de l'état (GET /api/agents/etat) ─────────────────────────────────────────────────────────────
async function fauxServeur(mode) {
  const recues = []
  const srv = http.createServer((req, res) => {
    recues.push({ methode: req.method, url: req.url, auth: req.headers.authorization || '' })
    const json = (code, corps) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(corps)) }
    if (req.method !== 'GET' || new URL(req.url, 'http://127.0.0.1').pathname !== '/api/agents/etat') return json(404, { erreur: 'route inconnue' })
    if (mode === '401' || req.headers.authorization !== `Bearer ${JETON}`) return json(401, { erreur: 'jeton' })
    return json(200, JSON.parse(lire(path.join(FIX, 'etat.json'))))
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  return { base: `http://127.0.0.1:${srv.address().port}`, recues, fermer: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(() => r()) }) }
}
async function portFerme() {
  const s = net.createServer()
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  const port = s.address().port
  await new Promise((r) => s.close(r))
  return `http://127.0.0.1:${port}`
}

// ── la racine jugée et la racine d'essai (le « bac ») ────────────────────────────────────────────────────────────
const RACINE = path.resolve(typeof opt('racine') === 'string' ? opt('racine') : DEPOT)
// Un fichier d'appui (commun.mjs mis à part, qui vient de scripts/chef/ de la racine) : celui de la racine, sinon du dépôt.
const appui = (rel) => (existe(path.join(RACINE, rel)) ? path.join(RACINE, rel) : path.join(DEPOT, rel))
function bac() {
  const b = dossierNeuf('bac')
  copierArbre(path.join(RACINE, 'scripts', 'chef'), path.join(b, 'scripts', 'chef'))
  fs.copyFileSync(appui('scripts/instantane-quotidien.mjs'), path.join(b, 'scripts', 'instantane-quotidien.mjs'))
  fs.mkdirSync(path.join(b, '.orchestre'), { recursive: true })
  return b
}
const F = (n) => path.join(FIX, n)
const ATTENDU = () => JSON.parse(lire(F('attendu.json')))
const ATTENDU_39 = () => JSON.parse(lire(F('attendu-2026-39.json')))
const sansEtat = () => ({ ...ATTENDU(), argent: NON_MESURE, entonnoir: NON_MESURE, fraicheur: { ...ATTENDU().fraicheur, etat: NON_MESURE } })

async function donnees(b, extra, env = environnement({ PRESTI_JETON_CHEF: JETON }), semaine = '2026-38') {
  const r = await lancer([SCRIPT, `--semaine=${semaine}`, `--verdicts=${F('verdicts.jsonl')}`, `--agents=${F('agents.jsonl')}`, ...extra], { cwd: b, env })
  const sortie = path.join(b, 'revue.json')
  let json
  if (existe(sortie)) {
    const t = lire(sortie)
    if (!t.trim()) json = { erreur: 'revue.json vide (0 octet)' }
    else try { json = JSON.parse(t) } catch (e) { json = { erreur: `revue.json illisible : ${e.message}` } }
  }
  return { r, json }
}
const absent = () => (existe(path.join(RACINE, ...SCRIPT.split('/'))) ? null : `${SCRIPT} absent (fiche 026-146)`)

// ── RV-1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function rv1() {
  const a = absent(); if (a) return [a]
  const d = []
  // Deux semaines sur les mêmes fixtures : une sortie figée, ou qui ignore les verdicts, ne passe pas les deux.
  for (const [semaine, attendu, prefixe] of [['2026-38', ATTENDU(), ''], ['2026-39', ATTENDU_39(), 'semaine 2026-39 : ']]) {
    const b = bac()
    const { r, json } = await donnees(b, [`--etat=${F('etat.json')}`, '--sortie=revue.json'], undefined, semaine)
    if (r.code !== 0) { d.push(`${prefixe}revue-donnees : ${decrire(r)}`); continue }
    if (!json) { d.push(`${prefixe}revue.json absent : --sortie non écrit`); continue }
    if (json.erreur) { d.push(`${prefixe}${json.erreur}`); continue }
    d.push(...ecarts(attendu, json).map((x) => `${prefixe}${x}`))
  }
  if (d.some((x) => /^(semaine 2026-39 : )?(executants|semaine|du|au)/.test(x))) d.push("rappel : la semaine ISO se compte à l'heure de Paris (le 20/09 à 22 h 30 UTC est le lundi 21/09) ; une réussite est un PASS depuis fait/ (dossier « fait »), jamais un PASS en-cours ; la médiane part du PREMIER lancement jusqu'au PREMIER PASS depuis fait/")
  return d
}

// ── RV-2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function rv2() {
  const a = absent(); if (a) return [a]
  const d = []
  const cas = []
  const s401 = await fauxServeur('401')
  const s200 = await fauxServeur('ok')
  try {
    cas.push(['état en fichier absent', [`--etat=${path.join(TRAVAIL, 'etat-absent.json')}`], undefined])
    cas.push(['401 du faux serveur', [`--base=${s401.base}`], undefined])
    cas.push(['port fermé (erreur réseau)', [`--base=${await portFerme()}`], undefined])
    cas.push(['jeton absent', [`--base=${s200.base}`], environnement()])
    await pool(cas, 4, async ([nom, extra, env]) => {
      const b = bac()
      const { r, json } = await donnees(b, [...extra, '--sortie=revue.json'], env)
      if (r.code !== 0) { d.push(`${nom} : ${decrire(r)} (attendu : code 0, « non mesuré »)`); return }
      if (!json || json.erreur) { d.push(`${nom} : ${json?.erreur || 'revue.json absent'}`); return }
      for (const k of ['argent', 'entonnoir']) if (json[k] !== NON_MESURE) d.push(`${nom} : ${k} vaut ${court(JSON.stringify(json[k]), 60)}, attendu « ${NON_MESURE} »`)
      if (json.fraicheur?.etat !== NON_MESURE) d.push(`${nom} : fraicheur.etat vaut ${JSON.stringify(json.fraicheur?.etat)}, attendu « ${NON_MESURE} »`)
      const reste = ecarts(sansEtat(), json).filter((x) => !/^(argent|entonnoir|fraicheur\.etat)\b/.test(x))
      if (reste.length) d.push(`${nom} : ${reste.slice(0, 3).join(' ; ')}`)
    })
  } finally { await s401.fermer(); await s200.fermer() }
  return d
}

// ── RV-3 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function rv3() {
  const a = absent(); if (a) return [a]
  const b = bac()
  const v = lire(F('verdicts.jsonl')).split(/\r?\n/).filter(Boolean)
  const ag = lire(F('agents.jsonl')).split(/\r?\n/).filter(Boolean)
  const vAbimes = [...v.slice(0, 5), '{"id":"099-50","verdict":"PASS","date":"2026-09-15T', '', ...v.slice(5), '', '{{ ligne abîmée par une coupure'].join('\r\n') + '\r\n'
  const aAbimes = [...ag.slice(0, 3), '{"agent":"usine-codex-99","tache":', ...ag.slice(3)].join('\r\n') + '\r\n'
  fs.writeFileSync(path.join(b, 'verdicts-abimes.jsonl'), vAbimes)
  fs.writeFileSync(path.join(b, 'agents-abimes.jsonl'), aAbimes)
  const r = await lancer([SCRIPT, '--semaine=2026-38', '--verdicts=verdicts-abimes.jsonl', '--agents=agents-abimes.jsonl', `--etat=${F('etat.json')}`, '--sortie=revue.json'], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) })
  if (r.code !== 0) return [`trois lignes abîmées : ${decrire(r)} (attendu : code 0, sans plantage)`]
  let json
  try { json = JSON.parse(lire(path.join(b, 'revue.json'))) } catch (e) { return [`revue.json illisible ou absent : ${e.message}`] }
  const d = []
  if (json.lignes_illisibles !== 3) d.push(`lignes_illisibles vaut ${JSON.stringify(json.lignes_illisibles)}, attendu 3 (deux dans verdicts.jsonl, une dans agents.jsonl ; les lignes vides ne comptent pas)`)
  const reste = ecarts({ ...ATTENDU(), lignes_illisibles: 3 }, json).filter((x) => !x.startsWith('lignes_illisibles'))
  if (reste.length) d.push(`le reste a bougé : ${reste.slice(0, 3).join(' ; ')}`)
  return d
}

// ── RV-4 : le document ────────────────────────────────────────────────────────────────────────────────────────────
// Ce qui n'est PAS un nombre à vérifier est une liste FERMÉE (en-tête du fichier, RV-4) ; tout le reste se cherche dans
// revue.json. Contre-vérification de 026-121 : chaque exclusion est bornée (date valide, heure valide, semaine ≤ 53,
// numéro de liste ou de section qui se suit, identifiant qui commence par une lettre ou de la forme NNN-NN(N) ou
// NNN-mot-clé, jamais suivi de « € ») ; le code en ligne, le code en bloc et les commentaires ne sont plus retirés en
// bloc : un texte sans chiffre n'a rien à vérifier, un texte qui porte un chiffre se vérifie comme le reste.
const ESP = '[ \u00a0\u202f]' // espace, insécable, fine insécable
const MOIS = ['janvier', 'février|fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août|aout', 'septembre', 'octobre', 'novembre', 'décembre|decembre']
const RE_JOUR_MOIS = new RegExp(String.raw`(?<![\p{L}\p{N}])(\d{1,2})(?:er)?${ESP}+(?:${MOIS.join('|')})(?:${ESP}+\d{4})?(?![\p{L}\p{N}])`, 'giu')
const RE_MOIS_AN = new RegExp(String.raw`(?<![\p{L}])(?:${MOIS.join('|')})${ESP}+\d{4}(?![\p{N}])`, 'giu')
const RE_ISO = /(?<![\p{L}\p{N}-])(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?(?![\p{N}])/gu
const RE_JJ_MM = /(?<![\p{N}/.,])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\p{N}/])/gu
const RE_HEURE = /(?<![\p{N}:.,])(\d{1,2}):(\d{2})(?::(\d{2}))?(?![\p{N}:])/gu
const RE_SEMAINE_ISO = /(?<![\p{L}\p{N}-])((?:19|20)\d{2})-S?(\d{2})(?![\p{N}-])(?![   ]*€)/gu
const RE_SEMAINE_MOT = /(?<![\p{L}])semaines?[   ]+(?:n°[   ]*)?(\d{1,2})(?![\p{N}])(?![   ]*€)/giu
const RE_ID_CHIFFRES = /(?<![\p{L}\p{N}_-])\d{3}-(?:\d{2,3}|\p{L}[\p{L}\p{N}]*(?:-[\p{L}\p{N}]+)*)(?![\p{L}\p{N}_-])(?![   ]*€)/gu
const RE_ID_LETTRES = /(?<![\p{L}\p{N}_])\p{L}[\p{L}\p{N}_]*(?:[-.][\p{L}\p{N}_]+)*(?![\p{L}\p{N}_]|[-.][\p{L}\p{N}_])(?![   ]*€)/gu
const RE_NOMBRE = new RegExp(String.raw`(?<![\p{L}\p{N}_,.])(\d{1,3}(?:${ESP}\d{3})+|\d+)(?:[,.](\d+))?`, 'gu')
// Un nombre abrégé : 12k, 12 k€, 2M, 3 Md€, 1e3. Jamais accepté, même si le nombre entier est dans les données.
const RE_ABREGE = new RegExp(String.raw`^(?:[eE][+-]?\d+|(?:k|K|M|Md|Mds)(?![\p{L}])|${ESP}?(?:k|K|M|Md|Mds)${ESP}?€)`, 'u')
const dateValide = (j, m) => Number(j) >= 1 && Number(j) <= 31 && Number(m) >= 1 && Number(m) <= 12
const blanc = (m) => ' '.repeat(m.length)
function nettoyerLigne(l) {
  let s = l.normalize('NFC')
  // Liens : l'adresse n'est pas un nombre (le texte du lien, si).
  s = s.replace(/\]\([^)]*\)/g, (m) => `]${blanc(m.slice(1))}`).replace(/https?:\/\/\S+/g, blanc)
  // Balises de code et de commentaire : retirées, leur contenu reste (un contenu sans chiffre n'a rien à vérifier).
  s = s.replace(/`|<!--|-->/g, blanc)
  s = s.replace(RE_ISO, (m, a, mo, j) => (dateValide(j, mo) ? blanc(m) : m))
  s = s.replace(RE_JJ_MM, (m, j, mo) => (dateValide(j, mo) ? blanc(m) : m))
  s = s.replace(RE_JOUR_MOIS, (m, j) => (Number(j) >= 1 && Number(j) <= 31 ? blanc(m) : m))
  s = s.replace(RE_MOIS_AN, blanc)
  s = s.replace(RE_HEURE, (m, h, mi, se) => (Number(h) <= 23 && Number(mi) <= 59 && (se === undefined || Number(se) <= 59) ? blanc(m) : m))
  s = s.replace(RE_SEMAINE_ISO, (m, a, n) => (Number(n) >= 1 && Number(n) <= 53 ? blanc(m) : m))
  s = s.replace(RE_SEMAINE_MOT, (m, n) => (Number(n) >= 1 && Number(n) <= 53 ? blanc(m) : m))
  s = s.replace(RE_ID_CHIFFRES, blanc)
  s = s.replace(RE_ID_LETTRES, (m) => (/\p{N}/u.test(m) ? blanc(m) : m))
  return s
}
// Numéro de section (« ### 2. ») ou de liste (« 2. ») : retiré seulement s'il SE SUIT (1, ou le précédent de la même
// suite + 1) ; sinon il reste dans la ligne, et se vérifie comme un nombre (« 77. » seul n'est pas un numéro de liste).
function numerotation(ligne, suites) {
  const titre = /^(\s*(#{1,6})\s+)(\d+(?:\.\d+)*)([.)]?)(?=\s)/.exec(ligne)
  const liste = titre ? null : /^(\s*)(\d+)([.)])(?=\s)/.exec(ligne)
  if (!titre && !liste) return ligne
  const composantes = titre ? titre[3].split('.') : [liste[2]]
  const cle = titre ? `h${titre[2].length}|${composantes.slice(0, -1).join('.')}` : `l|${liste[1].length}`
  const n = Number(composantes.at(-1))
  if (n !== 1 && n !== (suites.get(cle) ?? 0) + 1) return ligne
  suites.set(cle, n)
  const avant = titre ? titre[1] : liste[1]
  const numero = titre ? titre[3] + titre[4] : liste[2] + liste[3]
  return avant + blanc(numero) + ligne.slice(avant.length + numero.length)
}
function nombresDuTexte(texte) {
  const out = []
  const suites = new Map()
  texte.split(/\r?\n/).forEach((brute, i) => {
    if (/^\s*(```|~~~)/.test(brute)) return // la clôture d'un bloc ; son contenu se juge comme le reste
    const s = nettoyerLigne(numerotation(brute.normalize('NFC'), suites))
    for (const m of s.matchAll(RE_NOMBRE)) {
      const apres = s.slice(m.index + m[0].length)
      const abrege = RE_ABREGE.exec(apres)
      const colle = abrege ? abrege[0] : (/^\p{L}+/u.exec(apres)?.[0] || '')
      const brut = (m[0] + colle).replace(/[  ]/g, ' ')
      if (abrege) { out.push({ brut, valeur: NaN, abrege: true, ligne: i + 1 }); continue }
      out.push({ brut, valeur: Number(m[1].replace(/[   ]/g, '') + (m[2] ? `.${m[2]}` : '')), ligne: i + 1 })
    }
  })
  return out
}
function nombresDesDonnees(v, cle = '', out = []) {
  if (typeof v === 'number' && Number.isFinite(v)) { out.push(Math.abs(v)); if (/_cents$/.test(cle)) out.push(Math.abs(v) / 100) }
  else if (Array.isArray(v)) for (const x of v) nombresDesDonnees(x, cle, out)
  else if (estObjet(v)) for (const [k, x] of Object.entries(v)) nombresDesDonnees(x, k, out)
  return out
}
const montant = (t) => { const m = /(\d{1,3}(?:[   ]\d{3})+|\d+)(?:,(\d+))?\s*€/.exec(t); return m ? Number(m[1].replace(/[   ]/g, '') + (m[2] ? `.${m[2]}` : '')) : null }
function jugerDocument(texte, donnees, { gabarit = false } = {}) {
  const d = []
  const lignes = texte.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
  if (lignes.length > MAX_LIGNES) d.push(`${lignes.length} lignes : ${MAX_LIGNES} au plus`)
  const pos = TITRES.map((t) => lignes.findIndex((l) => l.normalize('NFC').trimEnd() === `## ${t}`))
  TITRES.forEach((t, i) => { if (pos[i] < 0) d.push(`section « ## ${t} » absente`) })
  const presentes = pos.filter((p) => p >= 0)
  if (presentes.some((p, i) => i > 0 && p < presentes[i - 1])) d.push(`sections dans le désordre : attendu ${TITRES.join(', ')}`)
  const debut = pos[4]
  if (debut >= 0) {
    let fin = lignes.findIndex((l, i) => i > debut && /^## /.test(l))
    if (fin < 0) fin = lignes.length
    const blocs = []
    for (let i = debut + 1; i < fin; i++) {
      if (/^### /.test(lignes[i])) blocs.push({ titre: lignes[i].replace(/^###\s+/, ''), lignes: [lignes[i]] })
      else if (blocs.length) blocs.at(-1).lignes.push(lignes[i])
    }
    if (blocs.length !== 3) d.push(`${blocs.length} décision(s) au lieu de trois (une « ### » par décision)`)
    const montants = []
    blocs.forEach((b, i) => {
      const t = b.lignes.join('\n')
      const nom = `décision ${i + 1} (« ${court(b.titre, 50)} »)`
      if (!t.includes('€')) d.push(`${nom} sans montant en « € »`)
      if (!/^\s*(?:[-*]\s+)?(?:\*\*)?Source(?:\*\*)?\s*:/m.test(t)) d.push(`${nom} sans ligne « Source : »`)
      if (!gabarit && t.includes('€')) { const m = montant(t); if (m === null) d.push(`${nom} : aucun montant chiffré devant « € »`); else montants.push({ m, i }) }
    })
    for (let k = 1; k < montants.length; k++) {
      if (montants[k].m > montants[k - 1].m) d.push(`décisions mal classées : ${montants[k - 1].m} € (décision ${montants[k - 1].i + 1}) avant ${montants[k].m} € (décision ${montants[k].i + 1}) ; attendu du plus gros au plus petit`)
    }
  }
  if (!gabarit) {
    const connus = nombresDesDonnees(donnees)
    for (const n of nombresDuTexte(texte)) {
      if (n.abrege) d.push(`nombre abrégé : ${n.brut} (ligne ${n.ligne}) — écrire le nombre entier, tel que revue.json le donne`)
      else if (!connus.some((x) => Math.abs(x - n.valeur) < 1e-9)) d.push(`nombre absent des données : ${n.brut} (ligne ${n.ligne})`)
    }
  }
  return d
}
function variantesDocument() {
  const ok = lire(F('document-ok.md'))
  const rempl = (avant, apres) => { if (ok.split(avant).length !== 2) throw new Error(`document-ok.md : « ${court(avant, 50)} » introuvable ou en double`); return ok.replace(avant, () => apres) }
  const bloc = (n) => { const a = ok.indexOf(`### ${n}.`); const b = ok.indexOf(`### ${n + 1}.`); return ok.slice(a, b < 0 ? undefined : b) }
  const b1 = bloc(1), b2 = bloc(2)
  return [
    ['conforme', ok, null],
    ['identifiants et dates', rempl('- Lignes illisibles : 0.', "- Lignes illisibles : 0.\n- Fiche 026-146, critère RV-1, modèle gpt-6-sol, agent usine-codex-6, proposition 090-relances-devis, semaine 38 : rien d'autre à chiffrer."), null],
    ['nombre orphelin', rempl('- Contactés : 60 ;', '- Taux de réponse : 15 %.\n- Contactés : 60 ;'), /nombre absent des données : 15 \(/],
    ['décimale française orpheline', rempl('coûts : 37,5 € ; marge', 'coûts : 37,8 € ; marge'), /nombre absent des données : 37,8 \(/],
    ['milliers orphelins', rempl('Encaissé : 1 250 €', 'Encaissé : 1 350 €'), /nombre absent des données : 1 350 \(/],
    ['deux décisions', ok.replace(bloc(3), ''), /2 décision\(s\) au lieu de trois/],
    ['décision sans €', rempl('En jeu : 0 €, mais 2 quotas', 'En jeu : rien, mais 2 quotas'), /décision 3 .* sans montant en « € »/],
    ['décision sans Source', rempl('Source : `revue.json` › `executants.codex`.\n', ''), /décision 3 .* sans ligne « Source : »/],
    ['décisions mal classées', ok.replace(b1 + b2, b2.replace('### 2.', '### 1.') + b1.replace('### 1.', '### 2.')), /décisions mal classées/],
    ['section absente', rempl('## Échecs\n', ''), /section « ## Échecs » absente/],
    ['121 lignes', ok + Array.from({ length: MAX_LIGNES + 1 - ok.replace(/\n$/, '').split('\n').length }, () => '- remplissage sans chiffre').join('\n') + '\n', /121 lignes : 120 au plus/],
    // Contre-vérification de 026-121 : chaque forme qui passait à tort (une par forme), puis ce qui doit rester exclu.
    ['nombre abrégé (12k €)', rempl('- Contactés : 60 ;', '- Encaissé depuis janvier : 12k €.\n- Contactés : 60 ;'), /^nombre abrégé : 12k /],
    ['nombre abrégé (3 k€)', rempl('- Contactés : 60 ;', '- Budget du mois : 3 k€.\n- Contactés : 60 ;'), /^nombre abrégé : 3 k€ /],
    ['nombre abrégé (1e3)', rempl('- Contactés : 60 ;', '- Contactés : 1e3 ;'), /^nombre abrégé : 1e3 /],
    ['code en ligne chiffré (`9 999` €)', rempl('coûts : 37,5 € ; marge', 'coûts : `9 999` € ; marge'), /^nombre absent des données : 9 999 \(/],
    ['bloc de code chiffré', rempl('- Lignes illisibles : 0.\n', '- Lignes illisibles : 0.\n\n```\ntotal = 4321\n```\n'), /^nombre absent des données : 4321 \(/],
    ['commentaire chiffré', rempl('- Lignes illisibles : 0.\n', '- Lignes illisibles : 0.\n<!-- 8888 relances -->\n'), /^nombre absent des données : 8888 \(/],
    ['fraction (17/20)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Note de la semaine : 17/20.'), /^nombre absent des données : 17 \(/],
    ['date invalide (32/13/2026)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Prochain point : 32/13/2026.'), /^nombre absent des données : 32 \(/],
    ['heure invalide (27:45)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Relevé à 27:45.'), /^nombre absent des données : 27 \(/],
    ['nombre derrière un deux-points (marge:9999 €)', rempl('coûts : 37,5 € ; marge', 'coûts : 37,5 € ; marge:9999 € ; marge'), /^nombre absent des données : 9999 \(/],
    ['numéro de liste hors suite (77.)', rempl('- Lignes illisibles : 0.\n', '- Lignes illisibles : 0.\n\n77. une ligne numérotée hors de toute suite\n'), /^nombre absent des données : 77 \(/],
    ['fourchette (100-200 €)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Budget du mois prochain : 100-200 €.'), /^nombre absent des données : 100 \(/],
    ['durée (3 h 45)', rempl('- Lignes illisibles : 0.', "- Lignes illisibles : 0.\n- Durée médiane d'un lancement : 3 h 45."), /^nombre absent des données : 45 \(/],
    ['nombre collé à des lettres (45min)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Attente moyenne : 45min.'), /^nombre absent des données : 45min \(/],
    ['semaine hors bornes (semaine 77)', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Suite en semaine 77.'), /^nombre absent des données : 77 \(/],
    ['liste qui se suit', rempl('- Lignes illisibles : 0.\n', '- Lignes illisibles : 0.\n\n1. relire les quotas ;\n2. relire les disjonctions ;\n3. relire les tâches expirées.\n'), null],
    ['dates, heures et semaines valides', rempl('- Lignes illisibles : 0.', '- Lignes illisibles : 0.\n- Prochaine revue : lundi 28/09/2026 à 07:30 (2026-09-28T05:30:00Z), semaine 2026-40, le 1er octobre au plus tard.'), null],
  ]
}
async function rv4() {
  const d = []
  const donnees = ATTENDU()
  for (const [nom, texte, attendu] of variantesDocument()) {
    const f = jugerDocument(texte, donnees)
    if (attendu === null && f.length) d.push(`${nom} : refusé à tort (${court(f.join(' ; '), 160)})`)
    if (attendu !== null && !f.some((x) => attendu.test(x))) d.push(`${nom} : attendu un échec ${attendu}, obtenu ${f.length ? court(f.join(' ; '), 160) : 'aucun'}`)
  }
  // La commande de la routine, lancée pour de vrai sur un fichier conforme et un fichier fautif.
  const dos = dossierNeuf('document')
  const parNom = (n) => variantesDocument().find(([nom]) => nom === n)[1]
  const ok = parNom('conforme'), orphelin = parNom('nombre orphelin')
  fs.writeFileSync(path.join(dos, '2026-38.md'), ok)
  fs.writeFileSync(path.join(dos, 'orphelin.md'), orphelin)
  const moi = fileURLToPath(import.meta.url)
  const r1 = await lancer([moi, `--document=${path.join(dos, '2026-38.md')}`, `--donnees=${F('attendu.json')}`], { cwd: dos, env: environnement() })
  if (r1.code !== 0) d.push(`--document sur le conforme : ${decrire(r1)}`)
  const r2 = await lancer([moi, `--document=${path.join(dos, 'orphelin.md')}`, `--donnees=${F('attendu.json')}`], { cwd: dos, env: environnement() })
  if (r2.code !== 1 || !/15/.test(r2.stdout)) d.push(`--document sur un nombre orphelin : ${decrire(r2)} (attendu : code 1, le nombre 15 nommé)`)
  return d
}

// ── RV-5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function rv5() {
  const a = absent(); if (a) return [a]
  const d = []
  const texte = lire(path.join(RACINE, ...SCRIPT.split('/')))
  for (const m of texte.matchAll(/https?:\/\/[^\s'"`)\]]+/g)) {
    if (!/^(https:\/\/prestiapp\.fr|http:\/\/(127\.0\.0\.1|localhost))(?:[:/]|$)/.test(m[0])) d.push(`adresse hors de --base dans le code : ${m[0]}`)
  }
  const b = bac()
  const avant = lister(b)
  const fixtures = lister(FIX)
  const s = await fauxServeur('ok')
  let r
  try { r = await lancer([SCRIPT, '--semaine=2026-38', `--verdicts=${F('verdicts.jsonl')}`, `--agents=${F('agents.jsonl')}`, `--base=${s.base}`, '--sortie=revue.json'], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) }) } finally { await s.fermer() }
  if (r.code !== 0) d.push(`--base vers le faux serveur : ${decrire(r)}`)
  if (s.recues.length !== 1 || s.recues[0].methode !== 'GET' || !s.recues[0].url.startsWith('/api/agents/etat')) d.push(`requêtes reçues par --base : ${s.recues.map((x) => `${x.methode} ${x.url.split('?')[0]}`).join(', ') || 'aucune'} (attendu : une seule, GET /api/agents/etat)`)
  if (s.recues.some((x) => x.auth !== `Bearer ${JETON}`)) d.push("le jeton n'est pas passé en en-tête Authorization: Bearer")
  if (s.recues.some((x) => x.url.includes(JETON))) d.push("le jeton est dans l'URL")
  if ((r.stdout + r.stderr).includes(JETON)) d.push('le jeton est affiché dans la sortie')
  const apres = lister(b)
  for (const [k, h] of apres) if (k !== 'revue.json' && avant.get(k) !== h) d.push(`fichier écrit hors de --sortie : ${k}`)
  for (const k of avant.keys()) if (!apres.has(k)) d.push(`fichier supprimé : ${k}`)
  if (!apres.has('revue.json')) d.push('--sortie (revue.json) non écrit')
  const fx = lister(FIX)
  for (const [k, h] of fx) if (fixtures.get(k) !== h) d.push(`fixture modifiée : ${k}`)
  if (existe(path.join(b, 'revue.json'))) {
    try {
      const json = JSON.parse(lire(path.join(b, 'revue.json')))
      if (json && lire(path.join(b, 'revue.json')).includes(JETON)) d.push('le jeton est écrit dans revue.json')
      const e = ecarts(ATTENDU(), json)
      if (e.length) d.push(`l'état lu par --base diffère de l'attendu : ${e.slice(0, 3).join(' ; ')}`)
    } catch (e) { d.push(`revue.json illisible : ${e.message}`) }
  }
  return d
}

// ── RV-6 : la consigne ────────────────────────────────────────────────────────────────────────────────────────────
const normaliser = (s) => String(s).normalize('NFC').replace(/[’‘´]/g, "'").replace(/[*`]/g, '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').toLowerCase()
async function rv6() {
  const d = []
  const fc = appui('docs/agents/revue-hebdo.md')
  if (!existe(fc)) return ['docs/agents/revue-hebdo.md absent']
  const c = normaliser(lire(fc))
  const exiges = [
    ['aucun connecteur', 'aucun connecteur'],
    ['jamais de fusion', 'jamais de fusion'],
    ['node scripts/chef/revue-donnees.mjs --semaine=', 'la commande des chiffres'],
    ['--base=https://prestiapp.fr', 'la base de production'],
    ['--sortie=revue.json', 'la sortie revue.json'],
    ['node scripts/revue-qa.mjs --document=docs/revues/', 'la commande du juge'],
    ['--donnees=revue.json', 'les données du juge'],
    ['revue/aaaa-ss', 'la branche revue/AAAA-SS'],
    ['docs/revues/gabarit.md', 'le gabarit'],
    ['trois décisions', 'les trois décisions'],
    ['source :', 'la ligne « Source : »'],
    ['seulement des nombres présents dans revue.json', 'seulement des nombres de revue.json'],
    ['distinct du cycle du chef', 'un travail distinct du cycle du chef (correction du 27/09)'],
  ]
  for (const [t, quoi] of exiges) if (!c.includes(t)) d.push(`revue-hebdo.md ne dit pas ${quoi} (« ${t} »)`)
  const fg = appui('docs/revues/GABARIT.md')
  if (!existe(fg)) d.push('docs/revues/GABARIT.md absent')
  else for (const x of jugerDocument(lire(fg), null, { gabarit: true })) d.push(`GABARIT.md : ${x}`)
  return d
}

const JUGES = { 'RV-1': rv1, 'RV-2': rv2, 'RV-3': rv3, 'RV-4': rv4, 'RV-5': rv5, 'RV-6': rv6 }

// ── le mode --document (la routine du lundi) ──────────────────────────────────────────────────────────────────────
function modeDocument() {
  const doc = opt('document'), don = opt('donnees')
  if (typeof doc !== 'string' || typeof don !== 'string') { console.error('✗ --document=<fichier> et --donnees=<revue.json> vont ensemble'); return 2 }
  if (!existe(doc)) { console.error(`✗ ${doc} introuvable`); return 2 }
  let donnees
  try { donnees = JSON.parse(lire(don)) } catch (e) { console.error(`✗ ${don} illisible : ${e.message}`); return 2 }
  const texte = lire(doc)
  if (!texte.trim()) { console.log(`FAIL RV-4 — ${doc} est vide`); return 1 }
  const f = jugerDocument(texte, donnees)
  if (!f.length) { console.log(`PASS RV-4 — ${doc} : cinq sections, trois décisions classées, seulement des nombres de ${path.basename(don)}`); return 0 }
  console.log(`FAIL RV-4 — ${f[0]}`)
  for (const x of f.slice(1, 20)) console.log(`  ✗ ${x}`)
  return 1
}

// ── le mode --preuve-echecs ───────────────────────────────────────────────────────────────────────────────────────
const SABOTAGES = [
  { nom: 'la semaine calculée en UTC', critere: 'RV-1', fichier: SCRIPT, avant: 'const jourParis = (t) => JOUR_PARIS.format(new Date(t))', apres: 'const jourParis = (t) => new Date(t).toISOString().slice(0, 10)' },
  { nom: 'le dernier lancement au lieu du premier', critere: 'RV-1', fichier: SCRIPT, avant: 't < lancement.get(a.tache)', apres: 't > lancement.get(a.tache)' },
  { nom: 'une REFUSÉE comptée en FAIL', critere: 'RV-1', fichier: SCRIPT, avant: "else if (v.verdict === 'FAIL') x.fail++", apres: "else if (v.verdict === 'FAIL' || v.verdict === 'REFUSÉE') x.fail++" },
  // Contre-vérification de 026-121 : R1 (une réussite sans passer par fait/) et R2 (une sortie figée sur la semaine 38,
  // recopiée d'attendu.json, qui ignore --semaine et les verdicts).
  { nom: 'un PASS en-cours compté comme réussite', critere: 'RV-1', fichier: SCRIPT, avant: "if (v.dossier === 'fait' && typeof v.id === 'string'", apres: "if (typeof v.id === 'string'" },
  { nom: 'une sortie figée sur la semaine 38', critere: 'RV-1', fichier: SCRIPT, avant: '    semaine,\n    ...bornes(semaine),\n    executants: trie,\n',
    apres: () => `    semaine: '2026-38',\n    du: '2026-09-14',\n    au: '2026-09-20',\n    executants: ${JSON.stringify(ATTENDU().executants)},\n` },
  { nom: '« non mesuré » remplacé par 0', critere: 'RV-2', fichier: SCRIPT, avant: "const NON_MESURE = 'non mesuré'", apres: 'const NON_MESURE = 0' },
  { nom: 'le jeton absent fait planter', critere: 'RV-2', fichier: SCRIPT, avant: 'try { jeton = lireJeton() } catch { return null }', apres: 'jeton = lireJeton()' },
  { nom: 'un plantage sur une ligne abîmée', critere: 'RV-3', fichier: SCRIPT, avant: '} catch { illisibles++ }', apres: '} catch (e) { throw e }' },
  { nom: "les lignes illisibles d'agents.jsonl oubliées", critere: 'RV-3', fichier: SCRIPT, avant: 'V.illisibles + A.illisibles', apres: 'V.illisibles' },
  { nom: 'un fichier écrit hors de --sortie', critere: 'RV-5', fichier: SCRIPT, avant: "if (typeof cible === 'string') fs.writeFileSync(path.resolve(cible), texte)", apres: "if (typeof cible === 'string') { fs.writeFileSync(path.resolve(cible), texte); fs.writeFileSync('revue-trace.json', texte) }" },
  { nom: 'un appel hors de --base', critere: 'RV-5', fichier: SCRIPT, avant: "appeler(baseSure(option('base')), jeton, 'GET', '/api/agents/etat')", apres: "appeler('http://127.0.0.2:9', jeton, 'GET', '/api/agents/etat')" },
  { nom: 'revue-hebdo.md sans « jamais de fusion »', critere: 'RV-6', fichier: 'docs/agents/revue-hebdo.md', avant: '**Jamais de fusion**', apres: 'Fusion permise' },
]
function racineEssai(nom, { temoin, sabotage } = {}) {
  const r = dossierNeuf(nom)
  copierArbre(path.join(DEPOT, 'scripts', 'chef'), path.join(r, 'scripts', 'chef'))
  for (const f of ['revue-donnees.mjs', 'chantier.mjs']) { const p = path.join(r, 'scripts', 'chef', f); if (existe(p)) fs.rmSync(p) }
  if (temoin) fs.copyFileSync(TEMOIN, path.join(r, ...SCRIPT.split('/')))
  if (sabotage) {
    const cible = path.join(r, ...sabotage.fichier.split('/'))
    if (!existe(cible)) { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(path.join(DEPOT, ...sabotage.fichier.split('/')), cible) }
    const t = lire(cible)
    if (t.split(sabotage.avant).length !== 2) throw new Error(`sabotage « ${sabotage.nom} » : le texte visé doit figurer une fois dans ${sabotage.fichier}`)
    const apres = typeof sabotage.apres === 'function' ? sabotage.apres() : sabotage.apres
    fs.writeFileSync(cible, t.replace(sabotage.avant, () => apres))
  }
  return r
}
const lignesVerdict = (s) => s.split(/\r?\n/).map((l) => /^(PASS|FAIL) (RV-\d+)\b(.*)$/.exec(l)).filter(Boolean).map((m) => ({ verdict: m[1], critere: m[2], texte: m[0] }))
async function soiMeme(args) {
  const r = await lancer([fileURLToPath(import.meta.url), ...args], { cwd: DEPOT, env: environnement(), delai: 300_000 })
  return { ...r, lignes: lignesVerdict(r.stdout) }
}
async function preuveEchecs() {
  const t0 = Date.now()
  const rapport = { autotest: [], reference: null, temoin: null, sabotages: [] }
  const ko = []
  // 1. Les fixtures disent vrai.
  const auto = []
  for (const f of ['verdicts.jsonl', 'agents.jsonl', 'etat.json', 'attendu.json', 'attendu-2026-39.json', 'document-ok.md', 'temoin/revue-donnees.mjs']) if (!existe(F(f)) || !fs.statSync(F(f)).size) auto.push(`fixture ${f} absente ou vide`)
  for (const [nom, lecture, semaine] of [['attendu.json', ATTENDU, '2026-38'], ['attendu-2026-39.json', ATTENDU_39, '2026-39']]) {
    try {
      const a = lecture()
      for (const k of ['semaine', 'du', 'au', 'executants', 'lignes_illisibles', 'fraicheur', 'argent', 'entonnoir']) if (!(k in a)) auto.push(`${nom} : clé ${k} absente`)
      if (a.semaine !== semaine) auto.push(`${nom} : semaine ${a.semaine}, attendu ${semaine}`)
    } catch (e) { auto.push(`${nom} illisible : ${e.message}`) }
  }
  const lignes = lire(F('verdicts.jsonl')).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
  // Les fixtures départagent « PASS depuis fait/ » et « PASS » tout court (contre-vérification, R1) : dans chaque
  // semaine, au moins un PASS en-cours qui n'est pas la réussite (précédé d'aucun PASS fait/ de la même tâche).
  for (const [du, au] of [['2026-09-13T22:00:00Z', '2026-09-20T22:00:00Z'], ['2026-09-20T22:00:00Z', '2026-09-27T22:00:00Z']]) {
    const dans = lignes.filter((l) => l.date >= du && l.date < au)
    if (!dans.some((l) => l.verdict === 'PASS' && l.dossier !== 'fait' && !dans.some((m) => m.id === l.id && m.verdict === 'PASS' && m.dossier === 'fait' && m.date <= l.date))) auto.push(`aucun PASS en-cours avant (ou sans) le PASS depuis fait/ entre ${du} et ${au}`)
  }
  const paris = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
  const bord = lignes.find((l) => l.date === '2026-09-20T22:30:00Z')
  if (!bord) auto.push('aucun verdict daté du dimanche 20/09 à 22 h 30 UTC')
  else if (paris.format(new Date(bord.date)) !== '2026-09-21') auto.push('le verdict du 20/09 à 22 h 30 UTC ne tombe pas le lundi 21/09 à Paris')
  if (lignes.length + lire(F('agents.jsonl')).split(/\r?\n/).filter(Boolean).length < 30) auto.push('moins de trente lignes de fixtures')
  if (jugerDocument(lire(F('document-ok.md')), ATTENDU()).length) auto.push('document-ok.md ne passe pas')
  rapport.autotest = auto
  ko.push(...auto.map((x) => `autotest : ${x}`))
  // 2. Rouge sur l'arbre de référence (aucun revue-donnees.mjs), RV-1 en premier échec.
  const ref = await soiMeme([`--racine=${racineEssai('reference')}`])
  const premier = ref.lignes.find((l) => l.verdict === 'FAIL')
  rapport.reference = { code: ref.code, premier: premier?.critere || null, rouges: ref.lignes.filter((l) => l.verdict === 'FAIL').map((l) => l.critere), lignes: ref.lignes.map((l) => l.texte) }
  if (ref.code === 0 || premier?.critere !== 'RV-1') ko.push(`référence : code ${ref.code}, premier échec ${premier?.critere || 'aucun'} (attendu : code ≠ 0, RV-1 en premier)`)
  // 3. Vert sur le témoin.
  const tem = await soiMeme([`--racine=${racineEssai('temoin', { temoin: true })}`])
  rapport.temoin = { code: tem.code, lignes: tem.lignes.map((l) => l.texte), verts: tem.lignes.filter((l) => l.verdict === 'PASS').length }
  if (tem.code !== 0 || tem.lignes.length !== CRITERES.length || tem.lignes.some((l) => l.verdict !== 'PASS')) ko.push(`témoin : code ${tem.code}, ${tem.lignes.filter((l) => l.verdict === 'FAIL').map((l) => court(l.texte, 120)).join(' ; ') || 'lignes manquantes'}`)
  // 4. Chaque sabotage fait échouer son critère.
  const resultats = await pool(SABOTAGES, 3, async (s) => {
    const r = await soiMeme([`--racine=${racineEssai('sabotage', { temoin: true, sabotage: s })}`, `--critere=${s.critere}`])
    const echec = r.lignes.find((l) => l.verdict === 'FAIL' && l.critere === s.critere)
    return { nom: s.nom, critere: s.critere, attrape: Boolean(echec && r.code !== 0), extrait: echec ? court(echec.texte, 200) : decrire(r) }
  })
  rapport.sabotages = resultats
  for (const x of resultats) if (!x.attrape) ko.push(`sabotage « ${x.nom} » non attrapé par ${x.critere} (${x.extrait})`)
  rapport.duree_s = Math.round((Date.now() - t0) / 1000)
  console.log(`RAPPORT ${JSON.stringify(rapport)}`)
  if (ko.length) { for (const k of ko) console.log(`✗ ${k}`); return 1 }
  console.log(`✓ ${NOM} --preuve-echecs : fixtures justes, référence rouge (RV-1 en premier), témoin vert, ${SABOTAGES.length} sabotages attrapés (${rapport.duree_s} s)`)
  return 0
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  if (opt('document') !== undefined || opt('donnees') !== undefined) return modeDocument()
  for (const f of ['verdicts.jsonl', 'agents.jsonl', 'etat.json', 'attendu.json', 'attendu-2026-39.json', 'document-ok.md']) if (!existe(F(f))) { console.error(`✗ fixture ${f} absente : préalable`); return 2 }
  if (opt('preuve-echecs')) return preuveEchecs()
  let choisis = CRITERES
  if (typeof opt('critere') === 'string') {
    choisis = opt('critere').split(',').map((x) => x.trim()).filter(Boolean)
    const inconnus = choisis.filter((c) => !CRITERES.includes(c))
    if (inconnus.length) { console.error(`✗ critère inconnu : ${inconnus.join(', ')}`); return 2 }
  }
  let rouges = 0
  for (const c of CRITERES.filter((x) => choisis.includes(x))) {
    let d
    try { d = await JUGES[c]() } catch (e) { d = [`le juge a planté : ${e?.stack?.split('\n').slice(0, 2).join(' ') || e}`] }
    if (!d.length) console.log(`PASS ${c}`)
    else { rouges++; console.log(`FAIL ${c} — ${d[0]}`); for (const x of d.slice(1, 12)) console.log(`  ✗ ${x}`) }
  }
  console.log(`${NOM} : ${choisis.length - rouges}/${choisis.length} critère(s) vert(s)${RACINE !== DEPOT ? ` (racine ${RACINE})` : ''}`)
  return rouges ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let code = 1
  try { code = await principal() } catch (e) { console.error(`✗ ${NOM} : ${e?.stack || e}`); code = 1 } finally { if (!opt('garder')) { nettoyer(TRAVAIL); try { fs.rmdirSync(path.dirname(TRAVAIL)) } catch { /* un autre passage l'occupe */ } } }
  process.exit(code)
}
