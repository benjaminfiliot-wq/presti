#!/usr/bin/env node
// scripts/chantier-qa.mjs — le juge du chantier (A12) : scripts/chef/chantier.mjs (026-146) et sa consigne
// docs/agents/chantier.md. Écrit par Claude Code (fiche 026-121).
//
// Usage :
//   node scripts/chantier-qa.mjs [--racine=<copie>] [--critere=CT-1,CT-3] [--garder]
//        CT-1 à CT-7 sur scripts/chef/chantier.mjs de la racine (le dépôt par défaut ; une copie pour les mutations de
//        026-151). Les fixtures restent celles du dépôt (scripts/fixtures/026/chantier/).
//   node scripts/chantier-qa.mjs --preuve-echecs
//        le juge se prouve : ses fixtures (le juge proposé « rouge » échoue sur RD-1, le « vert » sort en 0, le
//        « plantage » échoue sans identifiant, le « PASS puis code 1 » sort en 1 sans aucune ligne en échec ; chaque
//        fiche conforme passe `orchestre valider`, et chaque fiche de zone aussi : seul le garde la refuse) ; rouge sur l'arbre de
//        référence (sans chantier.mjs), CT-1 en premier échec ; vert sur le témoin (scripts/fixtures/026/chantier/temoin/,
//        implémentation de référence jamais déployée) ; chaque sabotage du témoin fait échouer le critère qu'il vise.
//
// Codes : 0 tout est vert ; 1 un critère en échec ; 2 préalable manquant. Sortie : `PASS <critère> — …` ou
// `FAIL <critère> — …` (suivie de `  ✗ …`), dans l'ordre CT-1 … CT-7.
//
// Tout se passe dans des racines temporaires (.orchestre/travail/chantier-qa/…) qui copient un .orchestre/ minimal
// (orchestre.json, file/, en-cours/, fait/, refuse/, propositions/), scripts/orchestre.mjs et scripts/lib/preuves.mjs,
// scripts/instantane-quotidien.mjs, et scripts/chef/** de la racine jugée. Aucun appel réseau hors 127.0.0.1 ; le
// jeton est un jeton d'essai tiré au hasard, jamais celui du poste.
//
// Critères :
//   CT-1  `verifier-fiche` sur les fiches de fixtures/026/chantier/fiches.mjs : la fiche conforme (juge proposé rouge
//         sur RD-1) → 0 ; juge proposé vert → 1 ; juge qui plante sans identifiant de critère → 1 ; juge qui sort en
//         code 1 avec seulement des lignes « PASS RD-n » (aucune ligne EN ÉCHEC) → 1 ; sans ligne « Décision : » ou
//         clé hors de chef:<AAAA-MM-JJ>:idee-… → 1 ; chacune des zones protégées avec executant codex → 1, et une zone
//         protégée pour chacun des autres exécutants non-Claude d'orchestre.json (antigravity, gemini-cli, qwen) → 1 ;
//         la même fiche avec executant claude-code → 0 ; script de verifier dans le périmètre ou
//         absent → 1 ; en-tête refusé par `orchestre valider` → 1 ; id déjà dans file/, en-cours/, fait/ ou refuse/ → 1.
//         La proposition n'est jamais modifiée, rien n'arrive dans file/, et chaque sortie dit quelque chose.
//   CT-2  `fusion-permise <base> <tete>` dans un dépôt git temporaire (deux commits par cas, faits par le juge) :
//         docs/** ou plans/*.md → 0 ; un scripts/*-e2e.mjs AJOUTÉ → 0 ; un test ou un juge existant modifié ou
//         supprimé, un nouveau juge, tout autre fichier → 1, avec la liste.
//   CT-3  `deposer` : verifier-fiche d'abord (aucune requête si la fiche est refusée), puis GET
//         /api/agents/decisions?tranchees=1 au faux serveur ; tranchée « lancer » → copie à l'octet dans file/ ;
//         décision absente, tranchée « reporter », 401, ou id déjà en file/ → 1, rien de copié ni d'écrasé ; la
//         proposition reste intacte à l'octet.
//   CT-4  chantier.mjs ne contient ni `git push`, ni `git commit`, ni `git merge`, ni `gh ` : ni en texte, ni en
//         arguments d'un spawn (`'git', [..., 'push', ...]`, quels que soient les arguments qui précèdent).
//   CT-5  chantier.md et revue-hebdo.md disent « aucun connecteur » et « jamais de fusion » ; chantier.md dit que le
//         juge est écrit par la routine et reste hors du périmètre, qu'il doit échouer aujourd'hui sur un critère
//         identifié, et que les idées se lisent par `chantier.mjs idees` (l'état ne rend que les décisions ouvertes).
//   CT-6  `idees --depuis=… --base=<faux serveur> --sortie=idees.json` : parmi une idée « lancer », une idée
//         « reporter », une idée passée au défaut (« reporter »), un arbitrage « lancer » (chef:<date>:budget), un
//         arbitrage dont la clé contient « idee- » plus loin, et une décision a_decider, idees.json ne garde que la
//         première, sous la forme [{ id, cle_idempotence, tranchee_le }] ; une seule requête, tranchees=1 et depuis,
//         jeton en en-tête et jamais dans l'URL ; un 401 → code 1 sans fichier.
//   CT-7  (correction du 27/09) le chantier est distinct du cycle du chef : aucun script de scripts/chef/ (hors
//         chantier.mjs et revue-donnees.mjs) ni de scripts/usine/ ne lance chantier.mjs ou revue-donnees.mjs ;
//         chantier.md dit qu'il n'est pas le travail du cycle du chef et que Claude Code le mène sur le poste ; les
//         fixtures du chef et du chantier ne se citent pas.
//
// Contrats précisés par ce juge : la proposition est passée en chemin relatif (.orchestre/propositions/<id>.md) avec
// cwd = la racine d'essai et --racine=<racine d'essai> ; une « ligne en échec » porte FAIL, ÉCHEC ou ✗ ; le faux
// serveur rend la liste nue [{ id, cle_idempotence, choix, tranchee_le }] (026-042), exige tranchees=1 et un `depuis`
// de moins de 30 jours (sinon 400), et ne rend que les décisions tranchées après `depuis`.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { variantes, conformes, ID, CLE, SCRIPT_JUGE, JUGES as JUGES_PROPOSES, DOSSIERS, ZONES, AUTRES_EXECUTANTS } from './fixtures/026/chantier/fiches.mjs'

const NOM = 'chantier-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026', 'chantier')
const TEMOIN = path.join(FIX, 'temoin', 'chantier.mjs')
const CRITERES = ['CT-1', 'CT-2', 'CT-3', 'CT-4', 'CT-5', 'CT-6', 'CT-7']
const SCRIPT = 'scripts/chef/chantier.mjs'
const JOUR = 86_400_000
const ENV_SYSTEME = ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'SYSTEMDRIVE', 'LANG', 'TZ']
const CRITERE_RE = /\b[A-Z]{2,5}-\d+\b/
const ECHEC_RE = /(^|[^A-Za-z])(FAIL|ÉCHEC|ECHEC)([^A-Za-z]|$)|✗/

// ── arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['racine', 'critere', 'preuve-echecs', 'garder']
for (const a of ARGS) {
  const m = /^--([a-z-]+)(=.*)?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --racine=, --critere=, --preuve-echecs, --garder)`); process.exit(2) }
}
const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────────
const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
const lire = (p) => fs.readFileSync(p, 'utf8')
const court = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const JETON = `essai-chantier-${crypto.randomBytes(18).toString('hex')}`
const nettoyer = (d) => { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* tenu : le suivant sera neuf */ } }
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', NOM, `${process.pid}-${crypto.randomBytes(3).toString('hex')}`)
let compteur = 0
function dossierNeuf(nom) { const d = path.join(TRAVAIL, `${nom}-${++compteur}`); nettoyer(d); fs.mkdirSync(d, { recursive: true }); return d }
function copierArbre(de, vers) {
  if (!existe(de)) return
  fs.mkdirSync(vers, { recursive: true })
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    const a = path.join(de, e.name), b = path.join(vers, e.name)
    if (e.isDirectory()) copierArbre(a, b)
    else fs.copyFileSync(a, b)
  }
}
function fichiersDe(d, out = []) {
  if (!existe(d)) return out
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) fichiersDe(p, out)
    else out.push(p)
  }
  return out
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
// Lancement ASYNCHRONE : le faux serveur tourne dans ce processus.
function lancer(args, { cwd, env, delai = 120_000 } = {}) {
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
const decrire = (r) => `code ${r.code}${r.expire ? ' (délai dépassé)' : ''}${(r.stdout + r.stderr).trim() ? ` : ${court((r.stdout + '\n' + r.stderr).trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' / '), 170)}` : ''}`
async function pool(elements, n, fn) {
  const out = new Array(elements.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, elements.length) }, async () => { while (i < elements.length) { const k = i++; out[k] = await fn(elements[k], k) } }))
  return out
}

// ── le faux serveur des décisions tranchées (GET /api/agents/decisions?tranchees=1&depuis=…) ──────────────────────
async function fauxServeur({ mode = 'ok', decisions = [] } = {}) {
  const recues = []
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1')
    recues.push({ methode: req.method, url: req.url, chemin: u.pathname, params: Object.fromEntries(u.searchParams), auth: req.headers.authorization || '' })
    const json = (code, corps) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(corps)) }
    if (req.method !== 'GET' || u.pathname !== '/api/agents/decisions') return json(404, { erreur: 'route inconnue' })
    if (mode === '401' || req.headers.authorization !== `Bearer ${JETON}`) return json(401, { erreur: 'jeton' })
    if (u.searchParams.get('tranchees') !== '1') return json(400, { erreur: 'tranchees=1 obligatoire' })
    const depuis = Date.parse(u.searchParams.get('depuis') || '')
    if (!Number.isFinite(depuis) || depuis < Date.now() - 30 * JOUR) return json(400, { erreur: 'depuis : date ISO de moins de 30 jours' })
    return json(200, decisions.filter((d) => Date.parse(d.tranchee_le) > depuis))
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  return { base: `http://127.0.0.1:${srv.address().port}`, recues, fermer: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(() => r()) }) }
}
const ilYA = (jours) => new Date(Date.now() - jours * JOUR).toISOString()
const decision = (cle, choix, jours = 2) => ({ id: crypto.randomUUID(), cle_idempotence: cle, choix, tranchee_le: ilYA(jours) })

// ── la racine jugée et les racines d'essai ────────────────────────────────────────────────────────────────────────
const RACINE = path.resolve(typeof opt('racine') === 'string' ? opt('racine') : DEPOT)
const appui = (rel) => (existe(path.join(RACINE, rel)) ? path.join(RACINE, rel) : path.join(DEPOT, rel))
const EXECUTANTS = (() => { try { return JSON.parse(lire(path.join(DEPOT, '.orchestre', 'orchestre.json'))).executants } catch { return null } })() || ['antigravity', 'codex', 'claude-code', 'gemini-cli', 'qwen']
function bac() {
  const b = dossierNeuf('bac')
  copierArbre(path.join(RACINE, 'scripts', 'chef'), path.join(b, 'scripts', 'chef'))
  for (const f of ['scripts/instantane-quotidien.mjs', 'scripts/orchestre.mjs', 'scripts/lib/preuves.mjs']) {
    fs.mkdirSync(path.dirname(path.join(b, f)), { recursive: true })
    fs.copyFileSync(appui(f), path.join(b, f))
  }
  for (const d of [...DOSSIERS, 'preuves', 'propositions']) fs.mkdirSync(path.join(b, '.orchestre', d), { recursive: true })
  fs.writeFileSync(path.join(b, '.orchestre', 'orchestre.json'), JSON.stringify({ projet: 'essai-chantier', executants: EXECUTANTS }, null, 2) + '\n')
  return b
}
const PROPOSITION = `.orchestre/propositions/${ID}.md`
function poser(b, v) {
  fs.writeFileSync(path.join(b, ...PROPOSITION.split('/')), v.texte)
  fs.copyFileSync(JUGES_PROPOSES[v.juge || 'rouge'], path.join(b, ...SCRIPT_JUGE.split('/')))
  if (v.deja) fs.writeFileSync(path.join(b, '.orchestre', v.deja, `${ID}.md`), `---\nid: ${ID}\n---\n\n# déjà là (${v.deja})\n`)
}
const absent = () => (existe(path.join(RACINE, ...SCRIPT.split('/'))) ? null : `${SCRIPT} absent (fiche 026-146)`)
const sortieVide = (r) => !(r.stdout + r.stderr).trim()
const jetonAffiche = (r) => (r.stdout + r.stderr).includes(JETON)

// ── CT-1 : verifier-fiche ─────────────────────────────────────────────────────────────────────────────────────────
async function ct1() {
  const a = absent(); if (a) return [a]
  const d = []
  await pool(variantes(), 4, async (v) => {
    const b = bac()
    poser(b, v)
    const deja = v.deja ? lire(path.join(b, '.orchestre', v.deja, `${ID}.md`)) : null
    const r = await lancer([SCRIPT, 'verifier-fiche', PROPOSITION, `--racine=${b}`], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) })
    if (r.code !== v.attendu) d.push(`${v.nom} : code ${r.code}, attendu ${v.attendu} (${v.pourquoi}) — ${decrire(r)}`)
    if (sortieVide(r)) d.push(`${v.nom} : sortie vide (une raison, ou le critère en échec, doit être dite)`)
    if (lire(path.join(b, ...PROPOSITION.split('/'))) !== v.texte) d.push(`${v.nom} : la proposition a été modifiée`)
    if (v.deja && lire(path.join(b, '.orchestre', v.deja, `${ID}.md`)) !== deja) d.push(`${v.nom} : la fiche déjà présente dans ${v.deja}/ a été modifiée`)
    if (v.deja !== 'file' && existe(path.join(b, '.orchestre', 'file', `${ID}.md`))) d.push(`${v.nom} : verifier-fiche a déposé la fiche dans file/`)
    if (jetonAffiche(r)) d.push(`${v.nom} : le jeton est affiché`)
  })
  return d.sort()
}

// ── CT-2 : fusion-permise ─────────────────────────────────────────────────────────────────────────────────────────
const BASE_GIT = {
  'README.md': '# essai\n',
  'docs/guide.md': '# Guide\n\nUne ligne.\n',
  'plans/feuille.md': '# Feuille\n',
  'scripts/relances-e2e.mjs': "console.log('e2e relances')\n",
  'scripts/relances-qa.mjs': "console.log('PASS RL-1')\n",
  'lib/relances.ts': 'export const delai = 7\n',
}
const CAS_GIT = [
  ['docs seulement', { m: { 'docs/guide.md': '# Guide\n\nDeux lignes.\n' }, a: { 'docs/revues/2026-38.md': '# Revue\n' } }, 0],
  ['plans/*.md', { m: { 'plans/feuille.md': '# Feuille\n\nsuite\n' }, a: { 'plans/idee.md': '# Idée\n' } }, 0],
  ['un test e2e ajouté', { a: { 'scripts/devis-e2e.mjs': "console.log('e2e devis')\n" }, m: { 'docs/guide.md': '# Guide\n\nmaj\n' } }, 0],
  ['un test e2e existant modifié', { m: { 'scripts/relances-e2e.mjs': "console.log('e2e relances, affaibli')\n" } }, 1, 'scripts/relances-e2e.mjs'],
  ['un test e2e existant supprimé', { s: ['scripts/relances-e2e.mjs'] }, 1, 'scripts/relances-e2e.mjs'],
  ['un juge existant modifié', { m: { 'scripts/relances-qa.mjs': "console.log('PASS RL-1 toujours')\n" } }, 1, 'scripts/relances-qa.mjs'],
  ['un juge ajouté', { a: { 'scripts/devis-qa.mjs': "console.log('PASS DV-1')\n" } }, 1, 'scripts/devis-qa.mjs'],
  ['du code', { m: { 'lib/relances.ts': 'export const delai = 3\n', 'docs/guide.md': '# Guide\n\nencore\n' } }, 1, 'lib/relances.ts'],
  ['un fichier hors de docs/', { m: { 'README.md': '# essai modifié\n' } }, 1, 'README.md'],
]
async function ct2() {
  const a = absent(); if (a) return [a]
  const d = []
  const b = bac()
  const depot = path.join(b, 'depot-git')
  fs.mkdirSync(depot, { recursive: true })
  const gitconfig = path.join(b, 'gitconfig-vide')
  fs.writeFileSync(gitconfig, '')
  const env = environnement({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitconfig })
  // Les deux commits de chaque cas (une base, puis la tête), faits par le juge d'un seul `git fast-import` : un
  // processus git par commit coûtait deux minutes sur un poste chargé. Chaque cas a sa branche refs/heads/cas-<n>.
  const flux = []
  let marque = 0
  const blob = (t) => { const m = ++marque; flux.push(`blob\nmark :${m}\ndata ${Buffer.byteLength(t)}\n${t}\n`); return m }
  const commit = (branche, message, parent, lignes) => {
    const m = ++marque
    flux.push(`commit ${branche}\nmark :${m}\nauthor juge-chantier <juge@essai.invalid> 1758000000 +0000\ncommitter juge-chantier <juge@essai.invalid> 1758000000 +0000\ndata ${Buffer.byteLength(message)}\n${message}\n${parent ? `from :${parent}\n` : ''}${lignes.join('\n')}\n\n`)
    return m
  }
  const marques = CAS_GIT.map(([nom, changement], i) => {
    const branche = `refs/heads/cas-${i}`
    const base = commit(branche, `base (${nom})`, null, Object.entries(BASE_GIT).map(([rel, t]) => `M 100644 :${blob(t)} ${rel}`))
    const lignes = [
      ...Object.entries({ ...(changement.m || {}), ...(changement.a || {}) }).map(([rel, t]) => `M 100644 :${blob(t)} ${rel}`),
      ...(changement.s || []).map((rel) => `D ${rel}`),
    ]
    return { base, tete: commit(branche, `tete (${nom})`, base, lignes) }
  })
  const fichierMarques = path.join(b, 'marques.txt')
  for (const args of [['init', '-q', depot], ['-C', depot, 'fast-import', '--quiet', `--export-marks=${fichierMarques}`]]) {
    const r = spawnSync('git', args, { env, encoding: 'utf8', input: args.includes('fast-import') ? flux.join('') : undefined })
    if (r.status !== 0) return [`préparation du dépôt git (git ${args.find((x) => !x.startsWith('-') && x !== depot)}) : ${court(r.stderr, 160)}`]
  }
  const sha = Object.fromEntries(lire(fichierMarques).split(/\r?\n/).filter(Boolean).map((l) => l.split(' ')).map(([m, s]) => [m.slice(1), s]))
  await pool(CAS_GIT, 3, async ([nom, , attendu, cite], i) => {
    const base = sha[marques[i].base], tete = sha[marques[i].tete]
    if (!base || !tete) { d.push(`${nom} : commits introuvables après fast-import`); return }
    const r = await lancer([path.join(b, ...SCRIPT.split('/')), 'fusion-permise', base, tete, `--racine=${depot}`], { cwd: depot, env })
    if (r.code !== attendu) d.push(`${nom} : code ${r.code}, attendu ${attendu} — ${decrire(r)}`)
    else if (cite && !(r.stdout + r.stderr).includes(cite)) d.push(`${nom} : refus sans la liste (${cite} n'y figure pas) — ${decrire(r)}`)
    if (sortieVide(r)) d.push(`${nom} : sortie vide`)
  })
  return d.sort()
}

// ── CT-3 : deposer ────────────────────────────────────────────────────────────────────────────────────────────────
async function ct3() {
  const a = absent(); if (a) return [a]
  const d = []
  const ok = variantes().find((v) => v.nom === 'conforme')
  const cas = [
    { nom: 'tranchée lancer', decisions: () => [decision(CLE, 'lancer'), decision('chef:2026-09-21:idee-autre', 'reporter')], attendu: 0, copie: true },
    { nom: 'décision absente', decisions: () => [decision('chef:2026-09-21:idee-autre', 'lancer')], attendu: 1 },
    { nom: 'tranchée reporter', decisions: () => [decision(CLE, 'reporter')], attendu: 1 },
    { nom: '401', mode: '401', decisions: () => [decision(CLE, 'lancer')], attendu: 1 },
    { nom: 'id déjà en file/', decisions: () => [decision(CLE, 'lancer')], attendu: 1, deja: true },
    { nom: 'fiche refusée par verifier-fiche (juge vert)', decisions: () => [decision(CLE, 'lancer')], attendu: 1, juge: 'vert', aucuneRequete: true },
  ]
  await pool(cas, 3, async (c) => {
    const b = bac()
    poser(b, { ...ok, juge: c.juge || 'rouge' })
    const cible = path.join(b, '.orchestre', 'file', `${ID}.md`)
    const ancienne = `---\nid: ${ID}\n---\n\n# une autre fiche, déjà en file\n`
    if (c.deja) fs.writeFileSync(cible, ancienne)
    const s = await fauxServeur({ mode: c.mode || 'ok', decisions: c.decisions() })
    let r
    try { r = await lancer([SCRIPT, 'deposer', PROPOSITION, `--racine=${b}`, `--base=${s.base}`], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) }) } finally { await s.fermer() }
    if (r.code !== c.attendu) d.push(`${c.nom} : code ${r.code}, attendu ${c.attendu} — ${decrire(r)}`)
    if (sortieVide(r)) d.push(`${c.nom} : sortie vide`)
    if (lire(path.join(b, ...PROPOSITION.split('/'))) !== ok.texte) d.push(`${c.nom} : la proposition a été modifiée`)
    if (c.copie) {
      if (!existe(cible)) d.push(`${c.nom} : rien dans file/`)
      else if (!fs.readFileSync(cible).equals(Buffer.from(ok.texte))) d.push(`${c.nom} : la fiche de file/ n'est pas la proposition à l'octet près`)
      const req = s.recues.filter((x) => x.chemin === '/api/agents/decisions')
      if (!req.length) d.push(`${c.nom} : la décision n'a pas été relue (aucune requête GET /api/agents/decisions)`)
      if (req.some((x) => x.params.tranchees !== '1' || !Number.isFinite(Date.parse(x.params.depuis || '')))) d.push(`${c.nom} : requête sans tranchees=1 ou sans depuis (la route exige les deux, et un depuis de moins de 30 jours : 400 sinon)`)
    } else if (c.deja) {
      if (!existe(cible) || lire(cible) !== ancienne) d.push(`${c.nom} : la fiche déjà en file/ a été écrasée`)
    } else if (existe(cible)) d.push(`${c.nom} : une fiche a été déposée dans file/`)
    if (c.aucuneRequete && s.recues.length) d.push(`${c.nom} : ${s.recues.length} requête(s) au serveur avant la vérification de la fiche`)
    if (s.recues.some((x) => x.url.includes(JETON))) d.push(`${c.nom} : le jeton est dans l'URL`)
    if (s.recues.some((x) => x.auth !== `Bearer ${JETON}`) && c.mode !== '401') d.push(`${c.nom} : le jeton n'est pas en en-tête Authorization: Bearer`)
    if (jetonAffiche(r)) d.push(`${c.nom} : le jeton est affiché`)
  })
  return d.sort()
}

// ── CT-4 : pas de git d'écriture ──────────────────────────────────────────────────────────────────────────────────
async function ct4() {
  const a = absent(); if (a) return [a]
  const t = lire(path.join(RACINE, ...SCRIPT.split('/')))
  const d = []
  const motifs = [
    [/\bgit\s+(push|commit|merge)\b/i, 'git push, commit ou merge'],
    // N'importe quels arguments avant la sous-commande (['-C', R, 'push', …] compris) : contre-vérification, C5.
    [/['"`]git['"`]\s*,\s*\[[^\]]*['"`](push|commit|merge)['"`]/, 'git lancé avec push, commit ou merge'],
    [/(^|[^\w-])gh\s/m, 'la commande gh'],
    [/['"`]gh(\.exe)?['"`]/, 'la commande gh lancée par spawn'],
  ]
  for (const [re, quoi] of motifs) { const m = re.exec(t); if (m) d.push(`${SCRIPT} contient ${quoi} : « ${court(t.slice(Math.max(0, m.index - 20), m.index + 40), 80)} »`) }
  return d
}

// ── CT-5 et CT-7 : les consignes ──────────────────────────────────────────────────────────────────────────────────
const normaliser = (s) => String(s).normalize('NFC').replace(/[’‘´]/g, "'").replace(/[*`]/g, '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').toLowerCase()
function doc(rel) { const f = appui(rel); return existe(f) ? normaliser(lire(f)) : null }
async function ct5() {
  const d = []
  const ch = doc('docs/agents/chantier.md'), rh = doc('docs/agents/revue-hebdo.md')
  if (ch === null) return ['docs/agents/chantier.md absent']
  if (rh === null) d.push('docs/agents/revue-hebdo.md absent')
  for (const [nom, t] of [['chantier.md', ch], ['revue-hebdo.md', rh]]) {
    if (t === null) continue
    if (!t.includes('aucun connecteur')) d.push(`${nom} ne dit pas « aucun connecteur »`)
    if (!t.includes('jamais de fusion')) d.push(`${nom} ne dit pas « jamais de fusion »`)
  }
  const exiges = [
    [/juge[^.]{0,80}écrit par la routine/, 'que le juge est écrit par la routine'],
    [/hors du périmètre/, 'que le juge reste hors du périmètre'],
    [/échouer aujourd'hui/, "que le juge doit échouer aujourd'hui"],
    [/critère identifié/, 'sur un critère identifié'],
    [/chantier\.mjs idees/, 'que les idées se lisent par chantier.mjs idees'],
    [/(ne rend que|seulement) les décisions ouvertes/, "que l'état ne rend que les décisions ouvertes"],
  ]
  for (const [re, quoi] of exiges) if (!re.test(ch)) d.push(`chantier.md ne dit pas ${quoi}`)
  return d
}
const LANCE_CHANTIER = /chantier\.mjs|revue-donnees\.mjs/
async function ct7() {
  const d = []
  const scanner = (dossier, exclus = []) => {
    for (const f of fichiersDe(path.join(RACINE, ...dossier.split('/')))) {
      const rel = path.relative(RACINE, f).split(path.sep).join('/')
      if (exclus.includes(rel)) continue
      let t
      try { t = lire(f) } catch { continue }
      t.split(/\r?\n/).forEach((l, i) => {
        if (/^\s*(\/\/|#|\*|;)/.test(l)) return // un commentaire peut nommer le chantier ; une commande, jamais
        if (LANCE_CHANTIER.test(l)) d.push(`${rel}:${i + 1} lance ou cite le chantier ou la revue : « ${court(l, 100)} »`)
      })
    }
  }
  scanner('scripts/chef', ['scripts/chef/chantier.mjs', 'scripts/chef/revue-donnees.mjs'])
  scanner('scripts/usine')
  const ch = doc('docs/agents/chantier.md')
  if (ch === null) d.push('docs/agents/chantier.md absent')
  else {
    if (!ch.includes("n'est pas le travail du cycle du chef")) d.push("chantier.md ne dit pas qu'il n'est pas le travail du cycle du chef")
    if (!/claude code[^.]{0,20}sur le poste/.test(ch)) d.push('chantier.md ne dit pas que Claude Code le mène sur le poste')
    if (/travail a12 du cycle|cycle (du )?chef de 7 h/.test(ch)) d.push('chantier.md se dit encore le travail du cycle du chef de 7 h')
  }
  // Fixtures du chef et du chantier indépendantes (correction du 27/09).
  for (const f of [...fichiersDe(FIX), ...fichiersDe(path.join(ICI, 'fixtures', '026', 'revue'))]) if (lire(f).includes('fixtures/026/chef')) d.push(`${path.relative(DEPOT, f).split(path.sep).join('/')} cite les fixtures du chef`)
  for (const f of fichiersDe(path.join(ICI, 'fixtures', '026', 'chef'))) { let t = ''; try { t = lire(f) } catch { /* binaire */ } if (/fixtures\/026\/(chantier|revue)/.test(t)) d.push(`${path.relative(DEPOT, f).split(path.sep).join('/')} cite les fixtures du chantier`) }
  return d
}

// ── CT-6 : idees ──────────────────────────────────────────────────────────────────────────────────────────────────
async function ct6() {
  const a = absent(); if (a) return [a]
  const d = []
  const lancerIdee = decision('chef:2026-09-21:idee-relances-devis', 'lancer', 2)
  const decisions = [
    lancerIdee,
    decision('chef:2026-09-21:idee-page-tarifs', 'reporter', 2),
    decision('chef:2026-09-22:idee-avis-google', 'reporter', 1), // passée au défaut : choix = option_defaut = reporter
    decision('chef:2026-09-21:budget', 'lancer', 1),
    decision('chef:2026-09-21:budget-idee-relances', 'lancer', 1),
    decision('a_decider:7f3c:1726900000', 'relancer', 1),
  ]
  const depuis = ilYA(7)
  const attendu = [{ id: lancerIdee.id, cle_idempotence: lancerIdee.cle_idempotence, tranchee_le: lancerIdee.tranchee_le }]
  // 1. la bonne réponse
  {
    const b = bac()
    const s = await fauxServeur({ decisions })
    let r
    try { r = await lancer([SCRIPT, 'idees', `--depuis=${depuis}`, `--base=${s.base}`, '--sortie=idees.json'], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) }) } finally { await s.fermer() }
    if (r.code !== 0) d.push(`idees : ${decrire(r)}`)
    const f = path.join(b, 'idees.json')
    if (!existe(f) || !fs.statSync(f).size) d.push('idees.json absent ou vide')
    else {
      let json
      try { json = JSON.parse(lire(f)) } catch (e) { d.push(`idees.json illisible : ${e.message}`) }
      if (json !== undefined) {
        if (!Array.isArray(json)) d.push(`idees.json : une liste attendue, obtenu ${court(JSON.stringify(json), 80)}`)
        else {
          if (json.length !== 1) d.push(`idees.json garde ${json.length} décision(s) (${json.map((x) => x?.cle_idempotence).join(', ')}), attendu la seule idée tranchée « lancer »`)
          const x = json.find((y) => y?.cle_idempotence === attendu[0].cle_idempotence)
          if (!x) d.push("l'idée tranchée « lancer » manque")
          else {
            const cles = Object.keys(x).sort().join(',')
            if (cles !== 'cle_idempotence,id,tranchee_le') d.push(`forme de l'idée : clés ${cles}, attendu id, cle_idempotence, tranchee_le`)
            if (x.id !== attendu[0].id || x.tranchee_le !== attendu[0].tranchee_le) d.push("l'idée ne reprend pas l'id ou tranchee_le du serveur")
          }
        }
      }
    }
    if (s.recues.length !== 1) d.push(`${s.recues.length} requête(s) au serveur, attendu une seule`)
    for (const q of s.recues) {
      if (q.methode !== 'GET' || q.chemin !== '/api/agents/decisions') d.push(`requête inattendue : ${q.methode} ${q.chemin}`)
      if (q.params.tranchees !== '1') d.push('requête sans tranchees=1')
      if (Date.parse(q.params.depuis || '') !== Date.parse(depuis)) d.push(`depuis transmis : ${JSON.stringify(q.params.depuis)}, attendu ${depuis}`)
      if (q.auth !== `Bearer ${JETON}`) d.push("le jeton n'est pas en en-tête Authorization: Bearer")
      if (q.url.includes(JETON)) d.push("le jeton est dans l'URL")
    }
    if (jetonAffiche(r) || (existe(f) && lire(f).includes(JETON))) d.push('le jeton est affiché ou écrit')
  }
  // 2. un 401 : code 1, aucun fichier
  {
    const b = bac()
    const s = await fauxServeur({ mode: '401', decisions })
    let r
    try { r = await lancer([SCRIPT, 'idees', `--depuis=${depuis}`, `--base=${s.base}`, '--sortie=idees.json'], { cwd: b, env: environnement({ PRESTI_JETON_CHEF: JETON }) }) } finally { await s.fermer() }
    if (r.code !== 1) d.push(`401 : ${decrire(r)} (attendu : code 1)`)
    if (existe(path.join(b, 'idees.json'))) d.push('401 : idees.json écrit quand même')
    if (sortieVide(r)) d.push('401 : sortie vide')
  }
  return d
}

const JUGES = { 'CT-1': ct1, 'CT-2': ct2, 'CT-3': ct3, 'CT-4': ct4, 'CT-5': ct5, 'CT-6': ct6, 'CT-7': ct7 }

// ── le mode --preuve-echecs ───────────────────────────────────────────────────────────────────────────────────────
const SABOTAGES = [
  { nom: 'lib/agents/llm.ts retiré des zones protégées', critere: 'CT-1', fichier: SCRIPT, remplacements: [["'lib/agents/llm.ts', ", '']] },
  { nom: 'verifier-fiche ne lance plus le juge proposé', critere: 'CT-1', fichier: SCRIPT, remplacements: [['const r = await lancer(String(e.verifier), R, minutes)', "const r = { code: 1, sortie: 'FAIL RD-1 — supposé rouge' }"]] },
  { nom: 'un juge qui plante accepté', critere: 'CT-1', fichier: SCRIPT, remplacements: [['const echec = lignes.find((l) => LIGNE_ECHEC.test(l) && CRITERE.test(l))', "const echec = lignes[0] || 'plantage'"]] },
  // Contre-vérification de 026-121 : C4 (un identifiant suffit, sans ligne en échec) et C3 (zones contrôlées pour codex seul).
  { nom: 'un identifiant de critère suffit, sans ligne en échec', critere: 'CT-1', fichier: SCRIPT, remplacements: [['const echec = lignes.find((l) => LIGNE_ECHEC.test(l) && CRITERE.test(l))', 'const echec = lignes.find((l) => CRITERE.test(l))']] },
  { nom: 'les zones protégées contrôlées pour codex seulement', critere: 'CT-1', fichier: SCRIPT, remplacements: [["if (e.executant !== 'claude-code') {", "if (e.executant === 'codex') {"]] },
  { nom: 'un test e2e existant modifié accepté', critere: 'CT-2', fichier: SCRIPT, remplacements: [["(statut === 'A' && /^scripts\\/[^/]+-e2e\\.mjs$/.test(p))", '/^scripts\\/[^/]+-e2e\\.mjs$/.test(p)']] },
  { nom: 'deposer écrase une fiche existante', critere: 'CT-3', fichier: SCRIPT, remplacements: [['if (id) for (const d of DOSSIERS)', 'if (false) for (const d of DOSSIERS)'], ['fs.copyFileSync(path.resolve(fichier), cible, fs.constants.COPYFILE_EXCL)', 'fs.copyFileSync(path.resolve(fichier), cible)']] },
  { nom: 'deposer ne relit pas le choix', critere: 'CT-3', fichier: SCRIPT, remplacements: [["if (decision.choix !== 'lancer')", 'if (false)']] },
  { nom: 'un git push', critere: 'CT-4', fichier: SCRIPT, remplacements: [["// Aucune commande git d'écriture : ce script lit un diff, rien d'autre.", '// Après le dépôt : git push origin chantier.']] },
  // Contre-vérification de 026-121, C5 : un argument non littéral avant la sous-commande (code mort, jamais exécuté).
  { nom: "un git push lancé par spawn, derrière '-C', R", critere: 'CT-4', fichier: SCRIPT, remplacements: [["// Aucune commande git d'écriture : ce script lit un diff, rien d'autre.", "// Aucune commande git d'écriture : ce script lit un diff, rien d'autre.\nconst jamaisAppele = (R) => spawnSync('git', ['-C', R, 'push', 'origin', 'HEAD'])"]] },
  { nom: 'chantier.md sans « aucun connecteur »', critere: 'CT-5', fichier: 'docs/agents/chantier.md', remplacements: [['**Aucun connecteur**', 'Connecteurs permis']] },
  { nom: 'idees garde les idées tranchées reporter', critere: 'CT-6', fichier: SCRIPT, remplacements: [["&& x.choix === 'lancer')", "&& ['lancer', 'reporter'].includes(x.choix))"]] },
  { nom: "le jeton dans l'URL", critere: 'CT-6', fichier: SCRIPT, remplacements: [['depuis=${encodeURIComponent(depuis)}`', 'depuis=${encodeURIComponent(depuis)}&jeton=${jeton}`']] },
  { nom: 'le cycle du chef lance le chantier', critere: 'CT-7', ajout: ['scripts/chef/cycle.mjs', "import { spawnSync } from 'node:child_process'\nspawnSync(process.execPath, ['scripts/chef/chantier.mjs', 'idees', '--depuis=2026-09-20T00:00:00Z'])\n"] },
  { nom: 'chantier.md redevient le travail du cycle de 7 h', critere: 'CT-7', fichier: 'docs/agents/chantier.md', remplacements: [["**n'est pas le travail du cycle du chef**", 'est le travail A12 du cycle chef de 7 h']] },
]
function racineEssai(nom, { temoin, sabotage } = {}) {
  const r = dossierNeuf(nom)
  copierArbre(path.join(DEPOT, 'scripts', 'chef'), path.join(r, 'scripts', 'chef'))
  for (const f of ['revue-donnees.mjs', 'chantier.mjs']) { const p = path.join(r, 'scripts', 'chef', f); if (existe(p)) fs.rmSync(p) }
  if (temoin) fs.copyFileSync(TEMOIN, path.join(r, ...SCRIPT.split('/')))
  if (sabotage?.ajout) { const [rel, t] = sabotage.ajout; fs.mkdirSync(path.dirname(path.join(r, rel)), { recursive: true }); fs.writeFileSync(path.join(r, rel), t) }
  if (sabotage?.remplacements) {
    const cible = path.join(r, ...sabotage.fichier.split('/'))
    if (!existe(cible)) { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(path.join(DEPOT, ...sabotage.fichier.split('/')), cible) }
    let t = lire(cible)
    for (const [avant, apres] of sabotage.remplacements) {
      if (t.split(avant).length !== 2) throw new Error(`sabotage « ${sabotage.nom} » : « ${court(avant, 60)} » doit figurer une fois dans ${sabotage.fichier}`)
      t = t.replace(avant, () => apres)
    }
    fs.writeFileSync(cible, t)
  }
  return r
}
const lignesVerdict = (s) => s.split(/\r?\n/).map((l) => /^(PASS|FAIL) (CT-\d+)\b(.*)$/.exec(l)).filter(Boolean).map((m) => ({ verdict: m[1], critere: m[2], texte: m[0] }))
async function soiMeme(args) {
  const r = await lancer([fileURLToPath(import.meta.url), ...args], { cwd: DEPOT, env: environnement(), delai: 600_000 })
  return { ...r, lignes: lignesVerdict(r.stdout) }
}
// Les fixtures de CT-1 disent vrai : lancées nues, dans une racine sans rien de fabriqué.
async function verite() {
  const d = []
  const nu = dossierNeuf('juges-nus')
  const lancerJuge = (nom) => { fs.copyFileSync(JUGES_PROPOSES[nom], path.join(nu, `${nom}.mjs`)); return lancer([`${nom}.mjs`], { cwd: nu, env: environnement() }) }
  const rouge = await lancerJuge('rouge')
  const ligneRouge = (rouge.stdout + rouge.stderr).split(/\r?\n/).find((l) => ECHEC_RE.test(l) && CRITERE_RE.test(l))
  if (rouge.code === 0 || !ligneRouge) d.push(`le juge « rouge » : ${decrire(rouge)} (attendu : code ≠ 0 et une ligne FAIL à identifiant)`)
  const vert = await lancerJuge('vert')
  if (vert.code !== 0) d.push(`le juge « vert » : ${decrire(vert)} (attendu : code 0)`)
  const plante = await lancerJuge('plante')
  if (plante.code === 0 || (plante.stdout + plante.stderr).split(/\r?\n/).some((l) => CRITERE_RE.test(l))) d.push(`le juge « plantage » : ${decrire(plante)} (attendu : code ≠ 0, aucune ligne à identifiant de critère)`)
  // « PASS puis code 1 » : des identifiants partout, aucune ligne en échec, et pourtant code ≠ 0 (contre-vérification, C4).
  const passCode1 = await lancerJuge('pass-code1')
  const lignesPC1 = (passCode1.stdout + passCode1.stderr).split(/\r?\n/).filter(Boolean)
  if (passCode1.code === 0 || !lignesPC1.some((l) => CRITERE_RE.test(l)) || lignesPC1.some((l) => ECHEC_RE.test(l))) d.push(`le juge « PASS puis code 1 » : ${decrire(passCode1)} (attendu : code ≠ 0, des lignes à identifiant de critère, aucune en échec)`)
  // Chaque fiche conforme passe `orchestre valider` ; l'en-tête refusé, non. Chaque fiche de zone protégée PASSE aussi
  // `orchestre valider` : si le garde la refuse, c'est pour la zone, jamais pour l'en-tête (sinon la variante ne
  // départagerait rien).
  const b = bac()
  const vs = variantes()
  const deZone = vs.filter((v) => v.nom.startsWith('zone ') || v.nom.startsWith('executant-'))
  for (const v of [...conformes(), vs.find((x) => x.nom === 'entete-refuse'), ...deZone]) {
    const f = path.join(b, '.orchestre', 'propositions', `${v.nom.replace(/[^a-z0-9]+/gi, '-')}.md`)
    fs.writeFileSync(f, v.texte)
    const r = await lancer([path.join(b, 'scripts', 'orchestre.mjs'), 'valider', f], { cwd: b, env: environnement() })
    const attendu = v.nom !== 'entete-refuse'
    if ((r.code === 0) !== attendu) d.push(`orchestre valider sur « ${v.nom} » : ${decrire(r)} (attendu : ${attendu ? 'accepté, le refus vient du garde' : 'refusé'})`)
  }
  if (vs.filter((v) => v.attendu === 0).length !== 2) d.push('deux fiches conformes attendues (codex, et claude-code sur zones protégées)')
  if (vs.filter((v) => v.nom.startsWith('zone ')).length !== ZONES.length) d.push('une variante par zone protégée attendue')
  // Une variante sur zone protégée pour CHAQUE exécutant non-Claude d'orchestre.json (contre-vérification, C3).
  const couverts = new Set(['codex', ...AUTRES_EXECUTANTS.map(([nom]) => nom)])
  for (const e of EXECUTANTS) if (e !== 'claude-code' && !couverts.has(e)) d.push(`l'exécutant ${e} d'orchestre.json n'a pas de variante sur une zone protégée (fiches.mjs, AUTRES_EXECUTANTS)`)
  for (const [nom] of AUTRES_EXECUTANTS) if (!vs.some((v) => v.nom === `executant-${nom}` && v.attendu === 1 && new RegExp(`^executant: ${nom}$`, 'm').test(v.texte))) d.push(`variante executant-${nom} absente, ou sans « executant: ${nom} »`)
  return { defauts: d, ligneRouge: ligneRouge || null }
}
async function preuveEchecs() {
  const t0 = Date.now()
  const rapport = { verite: null, reference: null, temoin: null, sabotages: [] }
  const ko = []
  const v = await verite()
  rapport.verite = v
  ko.push(...v.defauts.map((x) => `fixtures : ${x}`))
  const ref = await soiMeme([`--racine=${racineEssai('reference')}`])
  const premier = ref.lignes.find((l) => l.verdict === 'FAIL')
  rapport.reference = { code: ref.code, premier: premier?.critere || null, rouges: ref.lignes.filter((l) => l.verdict === 'FAIL').map((l) => l.critere), lignes: ref.lignes.map((l) => l.texte) }
  if (ref.code === 0 || premier?.critere !== 'CT-1') ko.push(`référence : code ${ref.code}, premier échec ${premier?.critere || 'aucun'} (attendu : code ≠ 0, CT-1 en premier)`)
  const tem = await soiMeme([`--racine=${racineEssai('temoin', { temoin: true })}`])
  rapport.temoin = { code: tem.code, lignes: tem.lignes.map((l) => l.texte), verts: tem.lignes.filter((l) => l.verdict === 'PASS').length }
  if (tem.code !== 0 || tem.lignes.length !== CRITERES.length || tem.lignes.some((l) => l.verdict !== 'PASS')) ko.push(`témoin : code ${tem.code}, ${court(tem.stdout, 400)}`)
  const resultats = await pool(SABOTAGES, 2, async (s) => {
    const r = await soiMeme([`--racine=${racineEssai('sabotage', { temoin: true, sabotage: s })}`, `--critere=${s.critere}`])
    const echec = r.lignes.find((l) => l.verdict === 'FAIL' && l.critere === s.critere)
    const detail = echec ? (r.stdout.split(/\r?\n/).slice(r.stdout.split(/\r?\n/).indexOf(echec.texte)).find((l) => l.startsWith('  ✗')) || echec.texte) : decrire(r)
    return { nom: s.nom, critere: s.critere, attrape: Boolean(echec && r.code !== 0), extrait: court(echec ? `${echec.texte} ${detail.startsWith('  ✗') ? detail.trim() : ''}` : detail, 200) }
  })
  rapport.sabotages = resultats
  for (const x of resultats) if (!x.attrape) ko.push(`sabotage « ${x.nom} » non attrapé par ${x.critere} (${x.extrait})`)
  rapport.duree_s = Math.round((Date.now() - t0) / 1000)
  console.log(`RAPPORT ${JSON.stringify(rapport)}`)
  if (ko.length) { for (const k of ko) console.log(`✗ ${k}`); return 1 }
  console.log(`✓ ${NOM} --preuve-echecs : fixtures justes, référence rouge (CT-1 en premier), témoin vert, ${SABOTAGES.length} sabotages attrapés (${rapport.duree_s} s)`)
  return 0
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  for (const f of ['fiche-ok.md', 'fiches.mjs', 'juges/rouge.mjs', 'juges/vert.mjs', 'juges/plante.mjs', 'juges/pass-code1.mjs']) if (!existe(path.join(FIX, f))) { console.error(`✗ fixture ${f} absente : préalable`); return 2 }
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
    else { rouges++; console.log(`FAIL ${c} — ${d[0]}`); for (const x of d.slice(1, 14)) console.log(`  ✗ ${x}`) }
  }
  console.log(`${NOM} : ${choisis.length - rouges}/${choisis.length} critère(s) vert(s)${RACINE !== DEPOT ? ` (racine ${RACINE})` : ''}`)
  return rouges ? 1 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let code = 1
  try { code = await principal() } catch (e) { console.error(`✗ ${NOM} : ${e?.stack || e}`); code = 1 } finally { if (!opt('garder')) { nettoyer(TRAVAIL); try { fs.rmdirSync(path.dirname(TRAVAIL)) } catch { /* un autre passage l'occupe */ } } }
  process.exit(code)
}
