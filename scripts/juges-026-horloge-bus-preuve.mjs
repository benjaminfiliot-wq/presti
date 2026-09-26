#!/usr/bin/env node
// scripts/juges-026-horloge-bus-preuve.mjs — la preuve des juges du domaine horloge-bus de la série 026, écrite par Claude Code
// (fiche 026-009). Générique pour les lots 01 à 04 : elle lit scripts/fixtures/026-horloge-bus/preuve-NN.json
//   { lot, fiche, reference: "<sha>", absents_de_la_reference: [préfixes], juges: [{ commande, echec_attendu }] }
// (lot 01 → 026-009, 02 → 026-032, 03 → 026-038, 04 → 026-045 : la fiche est lue dans le fichier, jamais supposée).
//
//   JP-1  la référence (le HEAD relevé au début de 026-009) ne contient aucun des chemins de `absents_de_la_reference` ; elle
//         est extraite par `git archive <sha> -- supabase` sous .orchestre/travail/juges-026-horloge-bus/reference/ (rien
//         d'écrit dans .git) ; chaque juge, lancé avec --racine=<référence>, sort en code ≠ 0 et ≠ 2, sans trace de pile,
//         jusqu'à son bilan ; LA ligne de rapport du critère attendu (« FAIL <id> — … » en début de ligne, sur la sortie
//         standard, forme de creerRapport, une seule ligne pour cet id) est en échec, et le bilan « … : FAIL — ids » le
//         nomme : extrait réel à l'appui. Une ligne d'un AUTRE critère qui le cite (« FAIL OS-2 — non jugé : la migration
//         manque (OS-1) ») ne compte pas (contre-vérification du 26/09 : OS-1 déclaré PASS à tort passait par elle).
//         Autotest de cette lecture, avant tout : des sorties plantées (critère PASS à tort cité entre parenthèses par un
//         autre, critère voisin OS-10, note indentée, critère rapporté deux fois, bilan muet ou vert) sont refusées, la
//         conforme acceptée ; puis, sur la sortie RÉELLE de chaque juge, la ligne du critère réécrite en PASS doit être vue.
//   JP-2  chaque juge sort en code 0 avec --temoin sur l'état actuel du dépôt, bilan « : PASS » à l'appui. Un juge marqué
//         `"reel": true` dans preuve-NN.json est aussi lancé en --reel, réseau coupé (fetch remplacé par --import) et clés
//         remplacées par des canaris dans l'environnement (lireEnvLocal ne les écrase pas) : il sort en code 1 ou 2, sans
//         trace de pile, et aucune clé-canari ne paraît dans sa sortie (point 6 de 026-009 : --reel n'affiche aucun secret).
//   JP-3  --generer-essai, lancé sur un jumeau d'exemple (JUMEAU_EXEMPLE de scripts/lib/sql-essai.mjs, écrit sous
//         .orchestre/travail/), rend pour 0096, 0097 --avec=0096 et 0098 --avec=0096,0097 un seul énoncé
//         `do $essai_026$ … $essai_026$;` qui se parse, chaque jumeau passé tel quel à execute dans l'ordre, fini par
//         `raise exception 'ESSAI_A_SEC % %'` et l'empreinte du jumeau jugé, sans commit, rollback, grant, drop schema ni
//         vault. hors des chaînes. La preuve le vérifie elle-même (tokenizer de sql-nu.mjs) EN PLUS d'analyserEssai, puis
//         éprouve ces deux lectures : un mot interdit planté hors chaîne, un second énoncé, un raise ôté sont attrapés ; les
//         mêmes mots dans une chaîne ne le sont pas ; blocEssai refuse un jumeau ou un scénario qui porte déjà une étiquette.
//         Et scripts/lib/sql-essai.mjs importe sansCommentaires et MARQUE_CONTROLE de sql-nu.mjs, s'en sert, et ne les
//         redéfinit ni ne recopie la marque (point 1 de 026-009 : « sans les recopier »).
//   JP-4  lireCompteRendu accepte un compte rendu conforme (enveloppé comme execute_sql le rend) et refuse, chacun pour sa
//         raison : un fichier de 0 octet, un fichier sans « APRES rien_ne_reste=true », APRES à false, une empreinte qui
//         n'est pas celle du jumeau courant, un JSON où une clé attendue manque, un JSON où une clé vaut false. Les cas sont
//         fabriqués sous .orchestre/travail/juges-026-horloge-bus/compte-rendu/.
//   JP-5  contrat-ops.json se lit ; chaque fonction qu'il nomme est définie dans la section « Contrat » de sa fiche (026-011,
//         013, 034, 036, 086, lues dans .orchestre/file/, en-cours/, fait/ ou brouillons-ecosysteme/026/), avec les mêmes
//         paramètres ; chaque fonction ops_* définie dans ces sections est au contrat ; chaque table est nommée par sa
//         fiche ; chaque code ops:<code> est écrit dans l'une de ses fiches ; les clés d'essai du contrat sont exactement
//         celles des scénarios.
//   JP-6  rien n'a bougé hors .orchestre/travail/ et .orchestre/preuves/ pendant la preuve : `git status --porcelain` et
//         l'empreinte de chaque fichier modifié ou non suivi, avant et après (la tenue de l'orchestre et les périmètres des
//         AUTRES fiches de en-cours/ sont écartés : d'autres sessions y écrivent pendant ce temps).
//
// Écrit .orchestre/preuves/<fiche>/echecs-attendus.md (une ligne par juge : critère attendu en échec sur la référence,
// extrait réel, verdict du témoin ; puis les contrôles JP) et les sorties complètes dans .orchestre/preuves/<fiche>/sorties/.
// Usage : node scripts/juges-026-horloge-bus-preuve.mjs --lot=01|02|03|04
// Code 0 seulement si JP-1 à JP-6 sont verts ; 1 sinon ; 2 si l'appel est invalide. Aucun appel réseau.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'
import {
  R, JUMEAU_EXEMPLE, blocEssai, analyserEssai, lireCompteRendu, empreinte, jumeauNuCoupe, clesScenario, creerRapport, lf, court,
} from './lib/sql-essai.mjs'

const NOM = 'juges-026-horloge-bus-preuve'
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-horloge-bus')
const TRAVAIL = path.join(R, '.orchestre', 'travail', 'juges-026-horloge-bus')
const CRITERES = ['JP-1', 'JP-2', 'JP-3', 'JP-4', 'JP-5', 'JP-6']
const TRACE = /^\s+at\s.+:\d+:\d+\)?\s*$/m
const DELAI_MS = 5 * 60_000
const ETAT_ORCHESTRE = ['.orchestre/digest.md', '.orchestre/verdicts.jsonl', '.orchestre/agents.jsonl', '.orchestre/contexte.md']
const FILES_ORCHESTRE = ['file', 'en-cours', 'fait', 'refuse']
const LIEUX_FICHES = ['file', 'en-cours', 'fait']
const versSlash = (p) => String(p).split(path.sep).join('/')
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sous = (parent, enfant) => { const r = path.relative(path.resolve(parent), path.resolve(enfant)); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const cellule = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

// ── Options et preuve-NN.json ─────────────────────────────────────────────────────────────────────────────────────────
function refuser(m) { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
const args = process.argv.slice(2)
const lotArg = args.find((a) => a.startsWith('--lot='))
if (!lotArg || args.length !== 1) refuser('usage : --lot=01|02|03|04 (seule option)')
const LOT = lotArg.slice(6)
if (!/^0[1-4]$/.test(LOT)) refuser(`--lot=${LOT} : 01, 02, 03 ou 04 attendu`)
const fPreuve = path.join(FIXTURES, `preuve-${LOT}.json`)
let P
try { P = JSON.parse(fs.readFileSync(fPreuve, 'utf8')) } catch (e) { refuser(`${versSlash(path.relative(R, fPreuve))} illisible : ${e.message}`) }
if (!/^[0-9a-f]{40}$/.test(P.reference || '')) refuser('preuve : « reference » doit être un sha complet de 40 signes')
if (!/^026-\d{3}$/.test(P.fiche || '')) refuser('preuve : « fiche » doit être un id 026-NNN')
if (!Array.isArray(P.juges) || !P.juges.length) refuser('preuve : « juges » vide')
for (const j of P.juges) {
  if (typeof j.commande !== 'string' || !/^node \S+/.test(j.commande.trim())) refuser(`preuve : commande « ${j.commande} » : « node <script> … » attendu`)
  if (!/^[A-Z0-9]{1,5}-[A-Z0-9-]+$/.test(j.echec_attendu || '')) refuser(`preuve : echec_attendu « ${j.echec_attendu} » mal formé`)
  if (j.reel !== undefined && typeof j.reel !== 'boolean') refuser(`preuve : « reel » de ${j.commande} : true ou false attendu`)
}
const PREUVES = path.join(R, '.orchestre', 'preuves', P.fiche)
const SORTIES = path.join(PREUVES, 'sorties')

// ── Lancer un juge ────────────────────────────────────────────────────────────────────────────────────────────────────
function lancer(argv, delaiMs = DELAI_MS, env = {}) {
  return new Promise((resoudre) => {
    const t0 = Date.now()
    const enfant = spawn(process.execPath, argv, { cwd: R, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...env } })
    let sortie = '', stdout = '', stderr = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d; stdout += d })
    enfant.stderr.on('data', (d) => { sortie += d; stderr += d })
    const minuterie = setTimeout(() => { expire = true; try { spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) } catch { enfant.kill('SIGKILL') } }, delaiMs)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : code, sortie, stdout, stderr, expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, stdout, stderr, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}
const argvDe = (commande) => commande.trim().split(/\s+/).slice(1)
const nomDe = (commande) => { const a = argvDe(commande); return `${path.basename(a[0], '.mjs')}${a.slice(1).map((x) => `_${x.replace(/^--/, '').replace(/[^a-z0-9]+/gi, '-')}`).join('')}` }
// La ligne DU critère, telle que creerRapport l'écrit : « PASS|FAIL|SAUTE <id> — … », en début de ligne. Jamais une ligne
// d'un autre critère qui le cite : « FAIL OS-2 — non jugé : la migration manque (OS-1) » ne dit rien d'OS-1 (défaut relevé
// par la contre-vérification du 26/09 : une recherche du jeton n'importe où laissait passer OS-1 déclaré PASS à tort).
const RE_LIGNE_CRITERE = /^(PASS|FAIL|SAUTE) (\S+)(?: — (.*))?$/
const RE_BILAN = /^(\S+) : (PASS|FAIL)(?: — (.*))?$/
const bilanDe = (sortie) => {
  const m = String(sortie).split(/\r?\n/).map((l) => RE_BILAN.exec(l)).filter(Boolean).at(-1)
  return m ? { verdict: m[2], rouges: m[3] ? m[3].split(/,\s*/).map((x) => x.trim()) : [] } : null
}
const bilan = (sortie) => bilanDe(sortie)?.verdict || null
/** { ligne, defauts[] } : la ligne de rapport de `critere` en échec, et le bilan qui le nomme ; `defauts` vide si tout y est. */
function lireEchec(stdout, critere) {
  const lignes = String(stdout).split(/\r?\n/).map((l) => ({ l, m: RE_LIGNE_CRITERE.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const defauts = []
  let ligne = null
  if (!lignes.length) defauts.push(`aucune ligne « FAIL ${critere} — … » (la ligne de rapport du critère, forme de creerRapport, sur la sortie standard)`)
  else if (lignes.length > 1) defauts.push(`${critere} rapporté ${lignes.length} fois (${lignes.map((x) => x.m[1]).join(', ')}) : une ligne par critère attendue`)
  else if (lignes[0].m[1] !== 'FAIL') defauts.push(`${critere} rapporté ${lignes[0].m[1]} : « ${court(lignes[0].l, 90)} »`)
  else ligne = lignes[0].l
  const b = bilanDe(stdout)
  if (!b) defauts.push('aucun bilan « … : PASS|FAIL »')
  else if (b.verdict !== 'FAIL') defauts.push(`bilan ${b.verdict}`)
  else if (!b.rouges.includes(critere)) defauts.push(`le bilan « … : FAIL — ${court(b.rouges.join(', '), 60)} » ne nomme pas ${critere}`)
  return { ligne, defauts }
}
// Autotest de lireEchec : chaque sortie plantée doit être refusée, la conforme acceptée. Le premier cas est le sabotage de
// la contre-vérification du 26/09, mot pour mot.
const S_ = (...l) => `${l.join('\n')}\n`
const AUTOTEST_LECTURE = [
  ['critère PASS à tort, cité entre parenthèses par d\'autres critères en échec', 'OS-1', false, S_('ops-sql-qa 0096 (026-010) — racine x', 'PASS OS-1 — sabotage : migration déclarée présente à tort', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'FAIL OS-3 — non jugé : la migration manque (OS-1)', 'FAIL OS-9 — non-régression', 'SAUTE OS-10 — --reel seulement', 'ops-sql-qa : FAIL — OS-2, OS-3, OS-9')],
  ['critère voisin OS-10 en échec, OS-1 vert', 'OS-1', false, S_('PASS OS-1 — conforme', 'FAIL OS-10 — --reel', 'ops-sql-qa : FAIL — OS-10')],
  ['note indentée en échec, critère sauté', 'OS-1', false, S_('  · FAIL OS-1 — une note n\'est pas un rapport', 'SAUTE OS-1 — sauté', 'FAIL OS-2 — x', 'ops-sql-qa : FAIL — OS-2')],
  ['critère rapporté deux fois, PASS et FAIL', 'OS-1', false, S_('PASS OS-1 — conforme', 'FAIL OS-1 — migration absente', 'ops-sql-qa : FAIL — OS-1')],
  ['bilan qui ne nomme pas le critère', 'OS-1', false, S_('FAIL OS-1 — migration absente', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'ops-sql-qa : FAIL — OS-2')],
  ['bilan vert', 'OS-1', false, S_('FAIL OS-1 — migration absente', 'ops-sql-qa : PASS')],
  ['conforme', 'OS-1', true, S_('ops-sql-qa 0096 (026-010) — racine x', 'FAIL OS-1 — migration absente : supabase/migrations/0096_ops_socle.sql', 'FAIL OS-2 — non jugé : la migration manque (OS-1)', 'SAUTE OS-10 — --reel seulement', 'ops-sql-qa : FAIL — OS-1, OS-2')],
]
/** La sortie réelle d'un juge, où la ligne du critère est réécrite en PASS et le critère ôté du bilan : le sabotage du 26/09. */
function saboterSortie(stdout, critere) {
  return String(stdout).split(/\r?\n/).map((l) => {
    const m = RE_LIGNE_CRITERE.exec(l)
    if (m && m[2] === critere) return `PASS ${critere} — sabotage de la preuve : déclaré vert à tort`
    const b = RE_BILAN.exec(l)
    if (b && b[2] === 'FAIL' && b[3]) { const r = b[3].split(/,\s*/).filter((x) => x.trim() !== critere); return r.length ? `${b[1]} : FAIL — ${r.join(', ')}` : `${b[1]} : PASS` }
    return l
  }).join('\n')
}
const citeAilleurs = (stdout, critere) => {
  const re = new RegExp(`(?<![A-Za-z0-9])${echapperRe(critere)}(?![A-Za-z0-9])`)
  return String(stdout).split(/\r?\n/).filter((l) => { const m = RE_LIGNE_CRITERE.exec(l); return m && m[1] === 'FAIL' && m[2] !== critere && re.test(l) }).length
}
// --reel sans réseau ni secret : fetch coupé par un module chargé avant le juge, clés remplacées par des canaris.
const COUPE_RESEAU = `--import=data:text/javascript,${encodeURIComponent('globalThis.fetch = async () => { throw new TypeError("réseau coupé par la preuve 026-009") }')}`

// ── L'état du dépôt (JP-6) ────────────────────────────────────────────────────────────────────────────────────────────
function git(args) {
  for (let essai = 0; essai < 4; essai++) {
    const r = spawnSync('git', args, { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
    if (r.status === 0) return r.stdout
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400)
  }
  return null
}
function perimetresAutres() {
  const d = path.join(R, '.orchestre', 'en-cours')
  const out = []
  for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) {
    if (!/^\d{3}-[\w-]+\.md$/.test(f) || /\.(question|reponse)\.md$/.test(f) || f === `${P.fiche}.md`) continue
    const m = /^perimetre:\s*\[(.*)\]\s*$/m.exec(fs.readFileSync(path.join(d, f), 'utf8'))
    if (m) for (const g of m[1].split(',')) { const p = g.trim().replace(/^["'`]|["'`]$/g, '').split(/[*?{]/)[0]; if (p) out.push(p) }
  }
  return out
}
function exclu(rel, autres) {
  if (rel.startsWith('.orchestre/travail/') || rel.startsWith('.orchestre/preuves/')) return true
  if (ETAT_ORCHESTRE.includes(rel) || FILES_ORCHESTRE.some((d) => rel.startsWith(`.orchestre/${d}/`))) return true
  return autres.some((p) => rel.startsWith(p))
}
function etat() {
  const autres = perimetresAutres()
  const st = git(['status', '--porcelain', '--untracked-files=all'])
  if (st === null) return { erreur: 'git status illisible' }
  const lignes = st.split(/\r?\n/).filter(Boolean).filter((l) => !l.slice(3).split(' -> ').map((c) => c.trim().replace(/^"|"$/g, '')).every((c) => exclu(c, autres))).sort()
  const empreintes = new Map()
  for (const l of lignes) for (const c of l.slice(3).split(' -> ').map((x) => x.trim().replace(/^"|"$/g, ''))) {
    if (exclu(c, autres)) continue
    const f = path.join(R, c)
    let h = 'absent'
    try { const s = fs.statSync(f); h = s.isFile() ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') : 'dossier' } catch { /* supprimé */ }
    empreintes.set(c, h)
  }
  return { lignes, empreintes }
}
function differences(a, b) {
  if (a.erreur || b.erreur) return [a.erreur || b.erreur]
  const d = []
  const A = new Set(a.lignes), B = new Set(b.lignes)
  for (const l of B) if (!A.has(l)) d.push(`git status +« ${l} »`)
  for (const l of A) if (!B.has(l)) d.push(`git status −« ${l} »`)
  for (const [k, v] of a.empreintes) if (b.empreintes.has(k) && b.empreintes.get(k) !== v) d.push(`${k} modifié`)
  return d
}

// ── La référence : git archive, puis un lecteur de tar (aucun outil externe, aucun chemin hors du dossier) ───────────
function vider(dossier) {
  if (!sous(TRAVAIL, dossier)) throw new Error(`suppression refusée hors de ${versSlash(TRAVAIL)} : ${versSlash(dossier)}`)
  fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  fs.mkdirSync(dossier, { recursive: true })
}
function detar(buf, dest) {
  let off = 0, paxChemin = null, n = 0
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512)
    if (h.every((b) => b === 0)) break
    const champ = (a, l) => h.subarray(a, a + l).toString('utf8').replace(/\0[\s\S]*$/, '')
    let nom = champ(0, 100)
    const taille = parseInt(champ(124, 12).trim() || '0', 8)
    const type = String.fromCharCode(h[156] || 48)
    const prefixe = champ(345, 155)
    if (prefixe) nom = `${prefixe}/${nom}`
    const donnees = buf.subarray(off + 512, off + 512 + taille)
    off += 512 + Math.ceil(taille / 512) * 512
    if (type === 'g') continue
    if (type === 'x') { const m = /\d+ path=([^\n]*)\n/.exec(donnees.toString('utf8')); paxChemin = m ? m[1] : null; continue }
    if (paxChemin) { nom = paxChemin; paxChemin = null }
    const cible = path.join(dest, nom)
    if (!sous(dest, cible)) throw new Error(`chemin hors de la référence dans l'archive : ${nom}`)
    if (type === '5') fs.mkdirSync(cible, { recursive: true })
    else if (type === '0') { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.writeFileSync(cible, donnees); n++ }
  }
  return n
}
function extraireReference() {
  const dest = path.join(TRAVAIL, 'reference')
  vider(dest)
  const a = spawnSync('git', ['archive', '--format=tar', P.reference, '--', 'supabase'], { cwd: R, maxBuffer: 1 << 30, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  if (a.status !== 0) throw new Error(`git archive ${P.reference.slice(0, 12)} : ${court(a.stderr?.toString(), 160)}`)
  return { dest, fichiers: detar(a.stdout, dest) }
}

// ── JP-3 : lecture indépendante d'un bloc d'essai ───────────────────────────────────────────────────────────────────────
const MOTS = [['commit', /\bcommit\b/], ['rollback', /\brollback\b/], ['grant', /\bgrant\b/], ['drop schema', /\bdrop\s+schema\b/], ['vault.', /\bvault\s*\./]]
function lireBloc(bloc, nus, e) {
  const raisons = []
  const t = lf(bloc)
  const T = '$essai_026$', TM = '$migration_026$'
  if (!t.startsWith(`do ${T}\n`)) raisons.push(`ne commence pas par « do ${T} »`)
  if (!/\nend \$essai_026\$;\n?$/.test(t)) raisons.push(`ne finit pas par « end ${T}; »`)
  const i1 = t.indexOf(T), i2 = t.lastIndexOf(T)
  if (t.split(T).length - 1 !== 2) { raisons.push(`${t.split(T).length - 1} étiquette(s) ${T}, deux attendues`); return raisons }
  const dehors = `${t.slice(0, i1)}${t.slice(i2 + T.length)}`.replace(/\s+/g, ' ').trim()
  if (dehors !== 'do ;') raisons.push(`hors du corps, « ${court(dehors, 60)} » au lieu de « do … ; » : plus d'un énoncé`)
  let corps = t.slice(i1 + T.length, i2)
  let pos = 0
  nus.forEach((nu, k) => {
    const motif = `execute ${TM}${lf(nu)}${TM};`
    const i = corps.indexOf(motif, pos)
    if (i < 0) { raisons.push(`jumeau ${k + 1} non passé tel quel à execute, dans l'ordre`); return }
    corps = `${corps.slice(0, i)}execute ${TM}${TM};${corps.slice(i + motif.length)}`
    pos = i
  })
  if (corps.split(TM).length - 1 !== 2 * nus.length) raisons.push(`étiquettes ${TM} en trop ou en moins`)
  const lu = sansCommentaires(corps.split(TM).join(' ')) // le tokenizer de sql-nu.mjs : commentaires ôtés, chaînes respectées
  if ((lu.match(/'/g) || []).length % 2) raisons.push('une chaîne n\'est pas refermée (apostrophes impaires, tokenizer de sql-nu.mjs)')
  const code = lu.replace(/'(?:[^']|'')*'/g, "''").toLowerCase()
  let par = 0
  for (const c of code) { if (c === '(') par++; else if (c === ')') par-- }
  if (par) raisons.push('parenthèses déséquilibrées')
  for (const [mot, re] of MOTS) if (re.test(code)) raisons.push(`« ${mot} » hors des chaînes`)
  if (!new RegExp(`raise exception 'ESSAI_A_SEC % %', '${e}', r::text;\\s*end\\s*$`).test(corps)) raisons.push(`ne se termine pas par « raise exception 'ESSAI_A_SEC % %', '<empreinte du jumeau jugé>', r::text; »`)
  return raisons
}

// ── JP-5 : les fiches ─────────────────────────────────────────────────────────────────────────────────────────────────────
function lireFiche(id) {
  for (const d of LIEUX_FICHES) { const f = path.join(R, '.orchestre', d, `${id}.md`); if (fs.existsSync(f)) return { f, t: lf(fs.readFileSync(f, 'utf8')) } }
  const f = path.join(R, '.orchestre', 'brouillons-ecosysteme', '026', `${id}.md`)
  return fs.existsSync(f) ? { f, t: lf(fs.readFileSync(f, 'utf8')) } : null
}
function sectionContrat(t) {
  const L = t.split('\n'), i = L.findIndex((l) => /^## Contrat/.test(l))
  if (i < 0) return null
  let j = i + 1
  while (j < L.length && !/^## /.test(L[j])) j++
  return L.slice(i + 1, j).join('\n')
}
const typeCourt = (t) => ({ int: 'integer', int4: 'integer', bool: 'boolean' })[t.trim().toLowerCase()] || t.trim().toLowerCase()
function definitions(section) {
  const out = new Map()
  const re = /(?:^\| |\*\*(?:\d+\. )?)`(public\.|ops\.)?([a-z0-9_]+)\(([^`]*)\)`/gm
  for (const m of section.matchAll(re)) {
    const cle = m[1] === 'ops.' ? `ops.${m[2]}` : m[2]
    if (!cle.startsWith('ops_') && !cle.startsWith('ops.')) continue
    out.set(cle, m[3].trim() ? m[3].split(',').map((p) => { const [n, ...t] = p.trim().split(/\s+/); return [n, typeCourt(t.join(' '))] }) : [])
  }
  return out
}

// ── La preuve ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const s = creerRapport(NOM, CRITERES, { entete: `${NOM} --lot=${LOT} (fiche ${P.fiche}) — référence ${P.reference.slice(0, 12)}` })
const avant = etat()
const lignesMd = []
const journal = (nom, contenu) => ecrire(path.join(SORTIES, `${nom}.log`), contenu)

// JP-1 — l'autotest de la lecture, la référence, puis chaque juge sur elle
{
  const rates = []
  for (const [quoi, critere, attendu, sortie] of AUTOTEST_LECTURE) {
    const { defauts } = lireEchec(sortie, critere)
    if ((defauts.length === 0) !== attendu) rates.push(`${quoi} : ${attendu ? `refusée (${defauts.join(' ; ')})` : 'acceptée'}`)
  }
  if (rates.length) s.echoue('JP-1', `autotest de la lecture des sorties : ${rates.join(' ; ')}`)
  else s.passe('JP-1', `autotest de la lecture : ${AUTOTEST_LECTURE.length - 1} sorties plantées refusées (dont le critère PASS à tort cité par d'autres), la conforme acceptée`)
}
let ref = null
{
  const arbre = git(['ls-tree', '-r', '--name-only', P.reference])
  if (arbre === null) s.echoue('JP-1', `référence ${P.reference.slice(0, 12)} introuvable dans le dépôt`)
  else {
    const presents = (P.absents_de_la_reference || []).filter((pref) => arbre.split('\n').some((l) => l.startsWith(pref)))
    if (presents.length) s.echoue('JP-1', `la référence contient déjà : ${presents.join(', ')} — ce n'est pas l'état d'avant les fiches jugées`)
    try { ref = extraireReference(); s.note(`référence extraite par git archive : ${ref.fichiers} fichiers sous ${versSlash(path.relative(R, ref.dest))}`) } catch (e) { s.echoue('JP-1', e.message) }
  }
}
const resultats = []
for (const j of P.juges) {
  const argv = argvDe(j.commande), nom = nomDe(j.commande)
  const r = { juge: j.commande, attendu: j.echec_attendu }
  if (ref) {
    const x = await lancer([...argv, `--racine=${ref.dest}`])
    journal(`${nom}-reference`, `$ ${j.commande} --racine=${versSlash(ref.dest)}\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
    r.codeRef = x.code
    const lu = lireEchec(x.stdout, j.echec_attendu)
    r.extrait = lu.ligne
    const defauts = []
    if (x.expire) defauts.push('délai dépassé')
    if (x.code === 0) defauts.push('code 0 sur la référence : le juge ne sait pas échouer')
    if (x.code === 2) defauts.push('code 2 (appel invalide ou préalable) au lieu d\'un échec jugé')
    if (TRACE.test(x.sortie)) defauts.push('trace de pile : un plantage n\'est pas un échec attendu')
    defauts.push(...lu.defauts)
    if (defauts.length) s.echoue('JP-1', `${j.commande} : ${defauts.join(' ; ')}`)
    else {
      // l'autotest sur la sortie réelle : le même juge, le critère déclaré vert à tort, doit être vu
      const sabote = saboterSortie(x.stdout, j.echec_attendu)
      const vu = lireEchec(sabote, j.echec_attendu).defauts
      const n = citeAilleurs(sabote, j.echec_attendu)
      if (!vu.length) s.echoue('JP-1', `${nom} : sur sa sortie réelle, ${j.echec_attendu} réécrit en PASS n'est pas vu par la lecture de la preuve`)
      else s.passe('JP-1', `${nom} code ${x.code}, « ${court(r.extrait, 80)} » ; réécrit en PASS sur la sortie réelle (${n} ligne(s) d'autres critères le citent encore) : vu`)
    }
  }
  // JP-2 — le témoin sur l'état actuel
  const y = await lancer([...argv, '--temoin'])
  journal(`${nom}-temoin`, `$ ${j.commande} --temoin\n# code ${y.code} · ${y.duree.toFixed(1)} s\n\n${y.sortie}`)
  r.codeTemoin = y.code
  r.bilanTemoin = bilan(y.sortie)
  if (y.code !== 0 || r.bilanTemoin !== 'PASS') s.echoue('JP-2', `${j.commande} --temoin : code ${y.code}, bilan ${r.bilanTemoin || 'absent'} (${court(y.sortie.split(/\r?\n/).find((l) => /^FAIL /.test(l)) || y.sortie.split(/\r?\n/).filter(Boolean).at(-1), 120)})`)
  else s.passe('JP-2', `${nom} --temoin code 0`)
  // JP-2 (point 6) — --reel, réseau coupé, clés-canaris : aucune ne paraît dans la sortie
  if (j.reel) {
    const alea = crypto.randomBytes(6).toString('hex')
    const canaris = { NEXT_PUBLIC_SUPABASE_URL: `canari-url-${alea}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: `canari-anon-${alea}`, SUPABASE_SERVICE_ROLE_KEY: `canari-service-${alea}` }
    const z = await lancer([COUPE_RESEAU, ...argv, '--reel'], 60_000, canaris)
    const fuites = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => z.sortie.includes(canaris[k]))
    // une sortie qui a laissé fuir une clé peut porter d'autres valeurs de .env.local : elle n'est pas recopiée
    journal(`${nom}-reel-canaris`, fuites.length ? `$ ${j.commande} --reel (réseau coupé, clés-canaris)\n# code ${z.code}\n\nSORTIE NON RECOPIÉE : ${fuites.join(', ')} y paraît\n` : `$ ${j.commande} --reel (réseau coupé, clés-canaris)\n# code ${z.code} · ${z.duree.toFixed(1)} s\n\n${z.sortie}`)
    const defauts = []
    if (z.expire) defauts.push('délai dépassé')
    if (![1, 2].includes(z.code)) defauts.push(`code ${z.code} sans réseau (1 ou 2 attendu)`)
    if (TRACE.test(z.sortie)) defauts.push('trace de pile')
    if (fuites.length) defauts.push(`clé affichée : ${fuites.join(', ')} (canari retrouvé dans la sortie)`)
    r.reel = defauts.length ? `FAIL : ${defauts.join(' ; ')}` : `code ${z.code}, aucune clé affichée`
    if (defauts.length) s.echoue('JP-2', `${j.commande} --reel (réseau coupé, clés-canaris) : ${defauts.join(' ; ')}`)
    else s.passe('JP-2', `${nom} --reel réseau coupé : code ${z.code}, aucune des deux clés-canaris dans la sortie (« ${court(z.sortie.split(/\r?\n/).filter(Boolean).at(-1), 70)} »)`)
  }
  resultats.push(r)
}

// JP-3 — le bloc d'essai sur un jumeau d'exemple
{
  const ex = path.join(TRAVAIL, 'exemple')
  vider(ex)
  const nuEx = {}
  for (const n of ['0096', '0097', '0098']) {
    const base = `_A_COLLER_sql_editor_${n}_NU.sql`
    const f = path.join(ex, 'supabase', 'migrations', base)
    ecrire(f, `${'-'.repeat(28)} ${base} — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.\n${JUMEAU_EXEMPLE}\n${MARQUE_CONTROLE}\nselect 'exemple ${n}' as quoi, 'oui' as resultat;\n`)
    nuEx[n] = jumeauNuCoupe(f)
  }
  const cas = [['0096', []], ['0097', ['0096']], ['0098', ['0096', '0097']]]
  let blocValide = null
  for (const [n, avec] of cas) {
    const argv = ['scripts/ops-sql-qa.mjs', `--migration=${n}`, '--generer-essai', `--racine=${ex}`, ...(avec.length ? [`--avec=${avec.join(',')}`] : [])]
    const x = await lancer(argv, 60_000)
    journal(`generer-essai-${n}`, `$ node ${argv.join(' ')}\n# code ${x.code}\n\n${x.stdout}\n-- sortie d'erreur --\n${x.stderr}`)
    const nus = [...avec, n].map((k) => nuEx[k])
    const e = empreinte(nuEx[n])
    if (x.code !== 0) { s.echoue('JP-3', `--generer-essai ${n} en code ${x.code} : ${court(x.sortie, 140)}`); continue }
    const a = analyserEssai(x.stdout, { nus })
    const ind = lireBloc(x.stdout, nus, e)
    if (!a.ok) s.echoue('JP-3', `--generer-essai ${n} : analyserEssai refuse — ${a.raisons.slice(0, 3).join(' ; ')}`)
    if (ind.length) s.echoue('JP-3', `--generer-essai ${n} : la lecture de la preuve refuse — ${ind.slice(0, 3).join(' ; ')}`)
    if (a.ok && !ind.length) { s.passe('JP-3', `${n}${avec.length ? ` --avec=${avec.join(',')}` : ''} : 1 énoncé, ${nus.length} jumeau(x), ${a.octets} octets`); if (n === '0096') blocValide = { bloc: x.stdout, nus, e } }
  }
  // Les deux lectures savent-elles échouer ? Chaque défaut planté doit être vu par l'une ET l'autre.
  if (blocValide) {
    const { bloc, nus, e } = blocValide
    const avantRaise = (b, ajout) => b.replace(/\n {2}raise exception 'ESSAI_A_SEC/, `\n${ajout}\n  raise exception 'ESSAI_A_SEC`)
    const plantes = [
      ['commit hors chaîne', avantRaise(bloc, '  commit;')],
      ['rollback hors chaîne', avantRaise(bloc, '  rollback;')],
      ['grant hors chaîne', avantRaise(bloc, '  grant select on ops.taches to anon;')],
      ['drop schema hors chaîne', avantRaise(bloc, '  drop schema ops cascade;')],
      ['vault. hors chaîne', avantRaise(bloc, '  perform vault.create_secret(\'x\');')],
      ['second énoncé', `${bloc}select 1;\n`],
      ['raise ôté', bloc.replace(/\n {2}raise exception 'ESSAI_A_SEC[^\n]*/, '')],
    ]
    const vus = []
    for (const [quoi, b] of plantes) {
      const a = analyserEssai(b, { nus }), ind = lireBloc(b, nus, e)
      if (a.ok || !ind.length) s.echoue('JP-3', `défaut planté non vu (${quoi}) : analyserEssai ${a.ok ? 'l\'accepte' : 'le refuse'}, la preuve ${ind.length ? 'le refuse' : 'l\'accepte'}`)
      else vus.push(quoi)
    }
    const enChaine = avantRaise(bloc, "  perform 'commit ; rollback ; grant ; drop schema ; vault.x';")
    const a = analyserEssai(enChaine, { nus }), ind = lireBloc(enChaine, nus, e)
    if (!a.ok || ind.length) s.echoue('JP-3', `les mots interdits DANS une chaîne sont refusés à tort : ${[...a.raisons, ...ind].slice(0, 2).join(' ; ')}`)
    const refus = []
    for (const [quoi, x] of [['jumeau porteur de $essai_026$', { nus: ['select 1; -- $essai_026$'], scenario: 'null;', empreinte: e }], ['jumeau porteur de $migration_026$', { nus: ['select $migration_026$x$migration_026$;'], scenario: 'null;', empreinte: e }], ['scénario porteur de $essai_026$', { nus: [JUMEAU_EXEMPLE], scenario: 'perform 1; -- $essai_026$', empreinte: e }]]) {
      try { blocEssai(x); s.echoue('JP-3', `blocEssai accepte un ${quoi}`) } catch { refus.push(quoi) }
    }
    if (vus.length === plantes.length) s.passe('JP-3', `défauts plantés vus par les deux lectures : ${vus.join(', ')} ; mots interdits dans une chaîne acceptés ; blocEssai refuse : ${refus.join(', ')}`)
  } else s.echoue('JP-3', 'pas de bloc valide de 0096 : les défauts plantés ne peuvent pas être éprouvés')
  // point 1 de 026-009 : sql-essai.mjs réutilise sansCommentaires et MARQUE_CONTROLE de sql-nu.mjs, sans les recopier
  const fLib = path.join(R, 'scripts', 'lib', 'sql-essai.mjs')
  const src = lf(fs.readFileSync(fLib, 'utf8'))
  const imp = [...src.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/sql-nu\.mjs['"]/gm)].flatMap((m) => m[1].split(',').map((x) => x.trim()))
  const reuse = []
  for (const nom of ['sansCommentaires', 'MARQUE_CONTROLE']) if (!imp.includes(nom)) reuse.push(`${nom} n'est pas importé tel quel de '../sql-nu.mjs'`)
  const redef = /\b(?:function\s*\*?\s*(?:sansCommentaires|MARQUE_CONTROLE)\b|(?:const|let|var|class)\s+(?:sansCommentaires|MARQUE_CONTROLE)\b|(?:sansCommentaires|MARQUE_CONTROLE)\s*=(?!=))/.exec(src)
  if (redef) reuse.push(`redéfini dans sql-essai.mjs : « ${court(redef[0], 50)} »`)
  if (src.includes(MARQUE_CONTROLE)) reuse.push('le texte de MARQUE_CONTROLE est recopié dans sql-essai.mjs')
  if (!/\bsansCommentaires\s*\(/.test(src)) reuse.push('sansCommentaires importé mais jamais appelé')
  const lib = await import(`./lib/sql-essai.mjs?controle=${Date.now()}`).catch(() => null)
  if (!lib || lib.MARQUE_CONTROLE !== MARQUE_CONTROLE) reuse.push('la MARQUE_CONTROLE exportée par sql-essai.mjs n\'est pas celle de sql-nu.mjs')
  if (reuse.length) s.echoue('JP-3', `point 1 : ${reuse.join(' ; ')}`)
  else s.passe('JP-3', 'sql-essai.mjs importe sansCommentaires et MARQUE_CONTROLE de sql-nu.mjs, s\'en sert, et ne les redéfinit ni ne les recopie')
}

// JP-4 — lireCompteRendu
{
  const d = path.join(TRAVAIL, 'compte-rendu')
  vider(d)
  const contrat = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'contrat-ops.json'), 'utf8'))
  const cles = clesScenario(fs.readFileSync(path.join(R, contrat.migrations['0096'].scenario), 'utf8'))
  const e = empreinte(JUMEAU_EXEMPLE)
  const enveloppe = (emp, r, apres = 'APRES rien_ne_reste=true') => `${JSON.stringify({ error: { name: 'Error', message: `Failed to run sql query: ERROR:  P0001: ESSAI_A_SEC ${emp} ${JSON.stringify(r)}\nCONTEXT:  PL/pgSQL function inline_code_block line 900 at RAISE\n` } })}\n${apres ? `\n${apres}\n` : ''}`
  const tout = Object.fromEntries(cles.map((k) => [k, true]))
  const manquante = { ...tout }; delete manquante[cles[3]]
  const fausse = { ...tout, [cles[5]]: false }
  const cas = [
    ['bon', enveloppe(e, { ...tout, diag_exemple: 'texte libre' }), null],
    ['vide', '', /0 octet/],
    ['sans-apres', enveloppe(e, tout, ''), /APRES rien_ne_reste=true » absente/],
    ['apres-false', enveloppe(e, tout, 'APRES rien_ne_reste=false'), /laissé une trace/],
    ['autre-empreinte', enveloppe(empreinte(`${JUMEAU_EXEMPLE}-- autre texte\n`), tout), /empreinte .* ≠ celle du jumeau courant/],
    ['cle-manquante', enveloppe(e, manquante), new RegExp(`absente\\(s\\) : .*${cles[3]}`)],
    ['cle-fausse', enveloppe(e, fausse), new RegExp(`ne valent pas true : ${cles[5]}=false`)],
  ]
  const bilanCas = []
  for (const [nom, contenu, attendu] of cas) {
    const f = path.join(d, `${nom}.txt`)
    fs.writeFileSync(f, contenu)
    const r = lireCompteRendu(f, { empreinte: e, cles })
    if (attendu === null) { if (!r.ok) s.echoue('JP-4', `compte rendu conforme refusé : ${r.raisons.join(' ; ')}`); else bilanCas.push(`${nom} accepté`) }
    else if (r.ok) s.echoue('JP-4', `${nom} accepté : lireCompteRendu ne sait pas le refuser`)
    else if (!r.raisons.some((x) => attendu.test(x))) s.echoue('JP-4', `${nom} refusé pour une autre raison : ${r.raisons.join(' ; ')}`)
    else bilanCas.push(`${nom} refusé (« ${court(r.raisons.find((x) => attendu.test(x)), 60)} »)`)
  }
  if (!s.enEchec('JP-4')) s.passe('JP-4', bilanCas.join(' ; '))
}

// JP-5 — le contrat contre les fiches
{
  let contrat = null
  try { contrat = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'contrat-ops.json'), 'utf8')) } catch (e) { s.echoue('JP-5', `contrat-ops.json illisible : ${e.message}`) }
  if (contrat) {
    const fiches = [...new Set([...Object.values(contrat.fonctions).map((f) => f.fiche), ...Object.values(contrat.tables).map((t) => t.fiche)])].sort()
    const sections = new Map()
    for (const id of fiches) {
      const x = lireFiche(id)
      if (!x) { s.echoue('JP-5', `fiche ${id} introuvable dans .orchestre/{file,en-cours,fait}/ ni dans brouillons-ecosysteme/026/`); continue }
      const sec = sectionContrat(x.t)
      if (!sec) { s.echoue('JP-5', `${id} : pas de section « ## Contrat »`); continue }
      sections.set(id, { sec, texte: x.t, defs: definitions(sec), ou: versSlash(path.relative(R, x.f)) })
    }
    let nF = 0
    for (const [nom, f] of Object.entries(contrat.fonctions)) {
      const S = sections.get(f.fiche)
      if (!S) continue
      nF++
      const def = S.defs.get(nom)
      if (!def) { s.echoue('JP-5', `${nom} (contrat, fiche ${f.fiche}) n'est pas définie dans la section Contrat de ${S.ou}`); continue }
      const att = f.params.map(([n, t]) => [n, typeCourt(t)])
      if (JSON.stringify(def) !== JSON.stringify(att)) s.echoue('JP-5', `${nom} : paramètres au contrat (${att.map((p) => p.join(' ')).join(', ')}) ≠ fiche ${f.fiche} (${def.map((p) => p.join(' ')).join(', ')})`)
    }
    for (const [id, S] of sections) for (const nom of S.defs.keys()) {
      if (!contrat.fonctions[nom]) s.echoue('JP-5', `${nom}, définie dans la section Contrat de ${id}, manque au contrat`)
      else if (contrat.fonctions[nom].fiche !== id) s.echoue('JP-5', `${nom} : fiche ${contrat.fonctions[nom].fiche} au contrat, définie dans ${id}`)
    }
    for (const [t, spec] of Object.entries(contrat.tables)) {
      const S = sections.get(spec.fiche)
      if (S && !S.sec.includes(`ops.${t}`)) s.echoue('JP-5', `table ops.${t} : la section Contrat de ${spec.fiche} ne la nomme pas`)
      if (S) for (const c of spec.colonnes) if (!S.sec.includes(c.texte)) s.echoue('JP-5', `ops.${t}.${c.nom} : le texte recopié ne se retrouve pas mot pour mot dans ${spec.fiche}`)
    }
    for (const [code, ids] of Object.entries(contrat.erreurs)) {
      if (!ids.some((id) => sections.get(id)?.sec.includes(code))) s.echoue('JP-5', `${code} : écrit dans aucune des fiches ${ids.join(', ')}`)
    }
    for (const n of ['0096', '0097', '0098']) {
      const m = contrat.migrations[n]
      const sc = clesScenario(fs.readFileSync(path.join(R, m.scenario), 'utf8'))
      const att = m.cles_essai?.cles || []
      if (!att.length) s.echoue('JP-5', `${n} : aucune clé d'essai au contrat`)
      if ([...sc].sort().join(',') !== [...att].sort().join(',')) s.echoue('JP-5', `${n} : les clés du scénario (${sc.length}) et celles du contrat (${att.length}) diffèrent`)
    }
    if (!s.enEchec('JP-5')) s.passe('JP-5', `${nF} fonctions, ${Object.keys(contrat.tables).length} tables et ${Object.keys(contrat.erreurs).length} codes retrouvés dans les sections Contrat de ${[...sections.keys()].join(', ')} ; clés d'essai égales aux scénarios`)
  }
}

// JP-6 — rien n'a bougé
{
  const apres = etat()
  const d = differences(avant, apres)
  if (d.length) s.echoue('JP-6', `${d.length} changement(s) hors .orchestre/travail/ et .orchestre/preuves/ : ${d.slice(0, 5).join(', ')}`)
  else s.passe('JP-6', `git status --porcelain et empreintes de ${avant.empreintes.size} fichier(s) modifié(s) ou non suivi(s) identiques avant et après (tenue de l'orchestre et périmètres des autres fiches de en-cours/ écartés)`)
}

// echecs-attendus.md
const code = (() => { const L = s.lignes(); return L.some((l) => l.startsWith('FAIL ')) ? 1 : 0 })()
lignesMd.push(`# ${P.fiche} — les juges du lot ${LOT} échouent sur la référence et passent en témoin`, '')
lignesMd.push(`Écrit par \`node scripts/juges-026-horloge-bus-preuve.mjs --lot=${LOT}\` le ${new Date().toISOString()}. Référence : \`${P.reference}\` (extraite par \`git archive\`, sans rien écrire dans \`.git\`). Une ligne par migration jugée : le critère attendu en échec sur la référence, l'extrait réel de la sortie (sa ligne en échec), le verdict du témoin. Les sorties complètes sont dans \`sorties/\`.`, '')
lignesMd.push('L\'extrait est LA ligne de rapport du critère attendu (« FAIL <id> — … »), jamais la ligne d\'un autre critère qui le cite.', '')
lignesMd.push('| Juge | Code sur la référence | Critère attendu | Extrait réel de la sortie | Témoin | --reel, réseau coupé, clés-canaris |', '|---|---|---|---|---|---|')
for (const r of resultats) lignesMd.push(`| \`${cellule(r.juge)}\` | ${r.codeRef ?? '—'} | ${r.attendu} | ${cellule(r.extrait || '(aucune ligne « FAIL <id> — … » pour ce critère)')} | code ${r.codeTemoin}, ${r.bilanTemoin || 'sans bilan'} | ${cellule(r.reel || 'non demandé')} |`)
lignesMd.push('', '## Contrôles de la preuve', '')
for (const l of s.lignes()) { const m = /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l); if (m) lignesMd.push(`- **${m[2]}** ${m[1]} — ${m[3]}`) }
lignesMd.push('', `Verdict : **${code ? 'FAIL' : 'PASS'}**`, '')
ecrire(path.join(PREUVES, 'echecs-attendus.md'), lignesMd.join('\n'))
process.exit(s.fin())
