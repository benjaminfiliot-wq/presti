// scripts/next16-qa.mjs — le juge de la migration vers Next.js 16 (fiche 026-004, place les fiches 11 et 12 de
// la série code-securite : 026-006 « dépendances et build », 026-008 « middleware → proxy, lignes de build »).
// Écrit par Claude Code. Aucun secret lu, aucun envoi réel : il construit, démarre et interroge l'app EN LOCAL
// (port 3161), jamais la production.
//
// Usage : node scripts/next16-qa.mjs [--groupe=dependances,code,service,suites] [--statique] [--racine=<copie>] [--preuve-echecs]
//   (par défaut, sans --groupe)  les quatre groupes.
//   --groupe=a,b        ne juge que ces groupes (dependances, code, service, suites).
//   --statique           saute le build, le serveur et les suites : dependances s'arrête à N16-1..3, code (déjà
//                        statique) tourne en entier, service et suites ne sont pas jugés (aucune ligne).
//   --racine=<copie>     juge une copie de l'arbre (mutations de la fiche 026-150) : les critères statiques lisent
//                        cette copie, les références figées restent celles de scripts/fixtures/026/next16/ du dépôt.
//   --preuve-echecs      auto-vérification : aujourd'hui (avant migration), dependances --statique doit échouer
//                        dès N16-1, code doit échouer sur N16-8 (N16-10 et N16-11 verts), domaine-perso-e2e.mjs
//                        adapté doit être vert, et les quatre scripts adaptés doivent contenir leur repli. Écrit
//                        .orchestre/preuves/026-004/echecs-attendus.md. Ignore --groupe/--statique/--racine.
// Sortie : une ligne PASS/FAIL par critère, puis « next16-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement
// si tout ce qui a été jugé est vert.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const DEPOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES_DIR = path.join(DEPOT, 'scripts', 'fixtures', '026', 'next16')
const PREUVES_026_004 = path.join(DEPOT, '.orchestre', 'preuves', '026-004')
const GROUPES_CONNUS = ['dependances', 'code', 'service', 'suites']
const PORT = 3161

// ── Options ───────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv) {
  const opts = { groupe: null, statique: false, racine: null, preuveEchecs: false }
  for (const a of argv) {
    if (a === '--statique') opts.statique = true
    else if (a === '--preuve-echecs') opts.preuveEchecs = true
    else if (a.startsWith('--groupe=')) opts.groupe = a.slice('--groupe='.length).split(',').map((s) => s.trim()).filter(Boolean)
    else if (a.startsWith('--racine=')) opts.racine = a.slice('--racine='.length)
    else { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
  }
  if (opts.groupe) {
    const inconnu = opts.groupe.find((g) => !GROUPES_CONNUS.includes(g))
    if (inconnu) { console.error(`✗ --groupe : "${inconnu}" inconnu (attendu : ${GROUPES_CONNUS.join(', ')})`); process.exit(2) }
  }
  return opts
}

// ── Petit relevé PASS/FAIL (pas de dépendance à scripts/fixtures/025/, hors périmètre) ──────────
function creerRecorder() {
  const lignes = []
  return {
    lignes,
    t(id, ok, detail = '') { lignes.push(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ' — ' + detail : ''}`); return ok },
    note(texte) { lignes.push(`NOTE ${texte}`) },
    get rouge() { return lignes.some((l) => l.startsWith('FAIL ')) },
    premierRouge() { return lignes.find((l) => l.startsWith('FAIL ')) || null },
  }
}

function lireJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function derniereLigneUtile(r) {
  const t = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').map((l) => l.trim()).filter(Boolean)
  return t.length ? t[t.length - 1] : `code ${r.status}`
}

// ── GROUPE dependances (fiche 11 : 026-006) ─────────────────────────────────────────────────────
function n16_1(rec, { racine }) {
  const pkgPath = path.join(racine, 'package.json')
  const pkg = fs.existsSync(pkgPath) ? lireJSON(pkgPath) : {}
  const nextDemande = pkg.dependencies?.next ?? ''
  const typesReact = pkg.devDependencies?.['@types/react'] ?? ''
  const typesReactDom = pkg.devDependencies?.['@types/react-dom'] ?? ''
  const versionInstallee = (nom) => {
    const p = path.join(racine, 'node_modules', nom, 'package.json')
    return fs.existsSync(p) ? lireJSON(p).version : null
  }
  const nextInstalle = versionInstallee('next')
  const reactInstalle = versionInstallee('react')
  const reactDomInstalle = versionInstallee('react-dom')
  const majeur = (v) => (v ? parseInt(v.split('.')[0], 10) : null)
  const auMoins = (v, maj, min) => { if (!v) return false; const [a, b] = v.split('.').map((x) => parseInt(x, 10)); return a > maj || (a === maj && b >= min) }
  const okNextInstalle = majeur(nextInstalle) === 16
  const okNextDemande = /^\^?16\./.test(nextDemande)
  const okReact = auMoins(reactInstalle, 19, 2)
  const okReactDom = auMoins(reactDomInstalle, 19, 2)
  const okTypesReact = /^\^19\.2/.test(typesReact)
  const okTypesReactDom = /^\^19\.2/.test(typesReactDom)
  const ok = okNextInstalle && okNextDemande && okReact && okReactDom && okTypesReact && okTypesReactDom
  rec.t('N16-1', ok, `next installé ${nextInstalle ?? 'absent'} (package.json demande "${nextDemande || 'absent'}"), react ${reactInstalle ?? 'absent'}, react-dom ${reactDomInstalle ?? 'absent'}, @types/react "${typesReact || 'absent'}", @types/react-dom "${typesReactDom || 'absent'}"`)
}

function n16_2(rec, { racine }) {
  const cfgPath = path.join(racine, 'next.config.mjs')
  const cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : ''
  const importeServwist = /@serwist\/next/.test(cfg)
  const pkg = lireJSON(path.join(racine, 'package.json'))
  const buildScript = pkg.scripts?.build ?? ''
  const ok = !importeServwist || buildScript === 'next build --webpack'
  rec.t('N16-2', ok, importeServwist ? `next.config.mjs importe @serwist/next, script build = "${buildScript}"` : "next.config.mjs n'importe plus @serwist/next")
}

function n16_3(rec, { racine }) {
  const pkg = lireJSON(path.join(racine, 'package.json'))
  const scripts = pkg.scripts ?? {}
  const scriptAvecLint = Object.entries(scripts).find(([, v]) => /next lint/.test(String(v)))
  const cfgPath = path.join(racine, 'next.config.mjs')
  const cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : ''
  const sansCommentaires = retirerCommentaires(cfg)
  const aEslint = /\beslint\s*:/.test(sansCommentaires)
  const ok = !scriptAvecLint && !aEslint
  rec.t('N16-3', ok, scriptAvecLint ? `script "${scriptAvecLint[0]}" contient next lint` : aEslint ? 'next.config.mjs a une clé eslint' : 'aucun script next lint, aucune clé eslint dans next.config.mjs')
}

function n16_4(rec, { racine }) {
  const r = spawnSync('npm', ['run', 'typecheck'], { cwd: racine, encoding: 'utf8', shell: process.platform === 'win32' })
  rec.t('N16-4', r.status === 0, r.status === 0 ? 'npm run typecheck vert' : `code ${r.status} — ${derniereLigneUtile(r)}`)
}

function n16_5(rec, { racine, debut }) {
  const r = spawnSync('npm', ['run', 'build'], { cwd: racine, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 })
  const journal = (r.stdout || '') + (r.stderr || '')
  const buildIdPath = path.join(racine, '.next', 'BUILD_ID')
  const buildIdRecent = fs.existsSync(buildIdPath) && fs.statSync(buildIdPath).mtimeMs >= debut
  const ok = r.status === 0 && !/webpack configuration/i.test(journal) && !/Error:/.test(journal) && buildIdRecent
  rec.t('N16-5', ok, ok ? 'npm run build vert, BUILD_ID récent' : `code ${r.status}, BUILD_ID récent=${buildIdRecent} — ${derniereLigneUtile(r)}`)
  return r.status === 0
}

function n16_6(rec, { racine, debut }) {
  const p = path.join(racine, 'public', 'sw.js')
  const existe = fs.existsSync(p)
  if (!existe) { rec.t('N16-6', false, 'public/sw.js absent'); return }
  const stat = fs.statSync(p)
  const contenu = fs.readFileSync(p, 'utf8')
  const regenere = stat.mtimeMs >= debut
  const ok = stat.size > 0 && contenu.includes('hors-ligne') && regenere
  rec.t('N16-6', ok, `${stat.size} octet(s), régénéré=${regenere}, contient "hors-ligne"=${contenu.includes('hors-ligne')}`)
}

function n16_7(rec, { racine }) {
  const r = spawnSync(process.execPath, ['scripts/budget-perf.mjs'], { cwd: racine, encoding: 'utf8' })
  rec.t('N16-7', r.status === 0, r.status === 0 ? 'budget-perf.mjs vert' : `code ${r.status} — ${derniereLigneUtile(r)}`)
}

async function groupeDependances(rec, { racine, statique }) {
  const debut = Date.now()
  n16_1(rec, { racine })
  n16_2(rec, { racine })
  n16_3(rec, { racine })
  if (statique) { rec.note('N16-4 à N16-7 non jugés (--statique)'); return }
  n16_4(rec, { racine })
  n16_5(rec, { racine, debut })
  n16_6(rec, { racine, debut })
  n16_7(rec, { racine })
}

// ── GROUPE code (fiche 12 : 026-008) ────────────────────────────────────────────────────────────
// Retire les commentaires // et /* */ SANS toucher au contenu des chaînes ('...", "...", `...`) : une regex
// nue confondrait le // de "https://" avec un commentaire (bug vu ailleurs dans le dépôt).
function retirerCommentaires(src) {
  let out = '', etat = null, i = 0
  const n = src.length
  while (i < n) {
    const c = src[i], c2 = src[i + 1]
    if (etat === 'ligne') { if (c === '\n') { etat = null; out += c }; i++; continue }
    if (etat === 'bloc') { if (c === '*' && c2 === '/') { etat = null; i += 2; continue }; i++; continue }
    if (etat === "'" || etat === '"' || etat === '`') {
      out += c
      if (c === '\\') { out += c2 ?? ''; i += 2; continue }
      if (c === etat) etat = null
      i++; continue
    }
    if (c === '/' && c2 === '/') { etat = 'ligne'; i += 2; continue }
    if (c === '/' && c2 === '*') { etat = 'bloc'; i += 2; continue }
    if (c === "'" || c === '"' || c === '`') { etat = c; out += c; i++; continue }
    out += c; i++
  }
  return out
}

// Le seul ajout toléré (décision Claw3D du 25/09, 026-179) : une alternative "|station\/.*" (ou en tête
// "station\/.*|") dans CHEMINS_APP_PRESTI, retirée une seule fois — String.replace sans /g ne prend que la
// première occurrence.
function retirerToleranceStation(texte) {
  const FIN = '|station\\/.*', DEBUT = 'station\\/.*|'
  if (texte.includes(FIN)) return texte.replace(FIN, '')
  if (texte.includes(DEBUT)) return texte.replace(DEBUT, '')
  return texte
}

function n16_8(rec, { racine }) {
  const proxyPath = path.join(racine, 'proxy.ts')
  const middlewarePath = path.join(racine, 'middleware.ts')
  const proxyExiste = fs.existsSync(proxyPath)
  const middlewareExiste = fs.existsSync(middlewarePath)
  if (!proxyExiste || middlewareExiste) {
    rec.t('N16-8', false, !proxyExiste ? 'proxy.ts absent' : 'middleware.ts existe encore (devrait avoir disparu)')
    return
  }
  // Fins de ligne normalisées (CRLF/LF) : le critère porte sur le corps, jamais sur l'encodage — 026-008 peut
  // être écrite par un exécutant dont l'éditeur ne rend pas les mêmes fins de ligne que ce dépôt (Windows, CRLF).
  const live = fs.readFileSync(proxyPath, 'utf8').replace(/\r\n/g, '\n')
  const exportProxy = /export\s+async\s+function\s+proxy\s*\(/.test(live)
  const aRuntime = /\bruntime\s*[:=]/.test(retirerCommentaires(live))
  const refPath = path.join(FIXTURES_DIR, 'middleware-reference.ts')
  const ref = fs.readFileSync(refPath, 'utf8').replace(/\r\n/g, '\n')
  const matcherDe = (txt) => { const m = txt.match(/matcher\s*:\s*(\[[^\]]*\])/s); return m ? m[1].replace(/\s+/g, ' ').trim() : null }
  const matcherLive = matcherDe(live)
  const matcherRef = matcherDe(ref)
  const memeMatcher = matcherLive !== null && matcherLive === matcherRef
  const liveNormalise = retirerToleranceStation(retirerCommentaires(live).replace(/\bproxy\b/g, 'middleware')).trim()
  const refNormalise = retirerCommentaires(ref).trim()
  const corpsIdentique = liveNormalise === refNormalise
  const ok = exportProxy && !aRuntime && memeMatcher && corpsIdentique
  const raisons = []
  if (!exportProxy) raisons.push("pas de 'export async function proxy'")
  if (aRuntime) raisons.push('exporte un runtime')
  if (!memeMatcher) raisons.push(`config.matcher différent (${matcherLive ?? 'absent'} vs ${matcherRef ?? 'absent'})`)
  if (!corpsIdentique) raisons.push('corps différent de middleware-reference.ts (au-delà de la tolérance station/.*)')
  rec.t('N16-8', ok, ok ? 'proxy.ts conforme à middleware-reference.ts' : raisons.join(', '))
}

function lignesDifferentes(refTxt, liveTxt) {
  const a = refTxt.split(/\r?\n/), b = liveTxt.split(/\r?\n/)
  const diffs = []
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) diffs.push({ avant: a[i] ?? '(absente)', apres: b[i] ?? '(absente)' })
  return diffs
}

function n16_9(rec, { racine }) {
  const liveTV = fs.readFileSync(path.join(racine, 'scripts', 'tout-verifier.mjs'), 'utf8')
  const refTV = fs.readFileSync(path.join(FIXTURES_DIR, 'tout-verifier-reference.mjs'), 'utf8')
  const appelleNpmBuildTV = /nom:\s*'Build'\s*,\s*cmd:\s*'npm'\s*,\s*args:\s*\[\s*'run'\s*,\s*'build'\s*\]/.test(liveTV)
  const diffTV = lignesDifferentes(refTV, liveTV)
  const diffTVOk = diffTV.length === 1 && /'npx'/.test(diffTV[0].avant) && /'next',\s*'build'/.test(diffTV[0].avant) && /'npm'/.test(diffTV[0].apres) && /'run',\s*'build'/.test(diffTV[0].apres)

  const liveQ = fs.readFileSync(path.join(racine, '.github', 'workflows', 'qualite.yml'), 'utf8')
  const refQ = fs.readFileSync(path.join(FIXTURES_DIR, 'qualite-reference.yml'), 'utf8')
  const appelleNpmBuildQ = /run:\s*npm run build\s*$/m.test(liveQ) && !/run:\s*npx next build\s*$/m.test(liveQ)
  const diffQ = lignesDifferentes(refQ, liveQ)
  const diffQOk = diffQ.length === 1 && /npx next build/.test(diffQ[0].avant) && /npm run build/.test(diffQ[0].apres)

  const ok = appelleNpmBuildTV && diffTVOk && appelleNpmBuildQ && diffQOk
  rec.t('N16-9', ok, ok
    ? "tout-verifier.mjs (suite Build) et qualite.yml appellent npm run build, diff limité à cette ligne"
    : `tout-verifier.mjs : npm-build=${appelleNpmBuildTV}, diff=${diffTV.length} ligne(s) ; qualite.yml : npm-build=${appelleNpmBuildQ}, diff=${diffQ.length} ligne(s)`)
}

const FICHIERS_IMAGE_026 = [
  'app/p/[slug]/icon.tsx', 'app/p/[slug]/apple-icon.tsx', 'app/p/[slug]/opengraph-image.tsx',
  'app/site/[slug]/icon.tsx', 'app/site/[slug]/apple-icon.tsx', 'app/site/[slug]/opengraph-image.tsx',
]

function n16_10(rec, { racine }) {
  const problemes = []
  for (const f of FICHIERS_IMAGE_026) {
    const p = path.join(racine, f)
    if (!fs.existsSync(p)) { problemes.push(`${f} absent`); continue }
    const c = fs.readFileSync(p, 'utf8')
    if (!/params\s*:\s*Promise\s*</.test(c)) problemes.push(`${f} : pas de "params: Promise<"`)
    else if (!/await params/.test(c)) problemes.push(`${f} : pas de "await params"`)
  }
  rec.t('N16-10', problemes.length === 0, problemes.length ? problemes.join(' ; ') : 'les six fichiers gardent params en promesse et await params')
}

function listerFichiersSource(racine, dossiers) {
  const out = []
  const rec = (d) => {
    if (!fs.existsSync(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p)
      else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p)
    }
  }
  for (const d of dossiers) rec(path.join(racine, d))
  return out
}

function n16_11(rec, { racine }) {
  const problemes = []
  const cfgPath = path.join(racine, 'next.config.mjs')
  const cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : ''
  const cfgSansCommentaires = retirerCommentaires(cfg)
  const qm = cfgSansCommentaires.match(/qualities\s*:\s*\[([^\]]*)\]/)
  const qualitiesDeclarees = qm ? qm[1].split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite) : [75]
  const aLocalPatterns = /localPatterns/.test(cfgSansCommentaires)

  for (const f of listerFichiersSource(racine, ['app', 'lib'])) {
    const brut = fs.readFileSync(f, 'utf8')
    const rel = path.relative(racine, f).replace(/\\/g, '/')
    const c = retirerCommentaires(brut)
    // cookies()/headers()/draftMode() non précédés de await (jamais une propriété .headers() sur un objet).
    const re = /(?<!\.)\b(cookies|headers|draftMode)\s*\(\s*\)/g
    let m
    while ((m = re.exec(c))) {
      const avant = c.slice(Math.max(0, m.index - 20), m.index)
      if (!/await\s*\(?\s*$/.test(avant)) problemes.push(`${rel} : ${m[1]}() sans await`)
    }
    if (/revalidateTag\(\s*[^,)]+\s*\)/.test(c)) problemes.push(`${rel} : revalidateTag à un seul argument`)
    if (/next\/legacy\/image/.test(c)) problemes.push(`${rel} : next/legacy/image`)
    if (/next\/amp/.test(c)) problemes.push(`${rel} : next/amp`)
    const qre = /quality=\{?(\d+)\}?/g
    let qmatch
    while ((qmatch = qre.exec(c))) { if (!qualitiesDeclarees.includes(parseInt(qmatch[1], 10))) problemes.push(`${rel} : quality=${qmatch[1]} absent de images.qualities`) }
    if (/<Image[^>]*\bsrc=["'`]\/[^"'`]*\?[^"'`]*["'`]/.test(c) && !aLocalPatterns) problemes.push(`${rel} : image locale avec "?" sans images.localPatterns`)
  }
  if (/images\s*:\s*\{[^}]*\bdomains\s*:/s.test(cfgSansCommentaires)) problemes.push('next.config.mjs : images.domains')
  if (/experimental\s*:\s*\{[^}]*\bppr\s*:/s.test(cfgSansCommentaires)) problemes.push('next.config.mjs : experimental.ppr')
  if (/\bdynamicIO\s*:/.test(cfgSansCommentaires)) problemes.push('next.config.mjs : dynamicIO')

  rec.t('N16-11', problemes.length === 0, problemes.length ? problemes.slice(0, 6).join(' ; ') + (problemes.length > 6 ? ` (et ${problemes.length - 6} autre(s))` : '') : 'aucun accès synchrone, aucun motif interdit trouvé')
}

function groupeCode(rec, { racine }) {
  n16_8(rec, { racine })
  n16_9(rec, { racine })
  n16_10(rec, { racine })
  n16_11(rec, { racine })
}

// ── Serveur partagé (groupes service et suites) ─────────────────────────────────────────────────
async function attendreServeur(url, delaiMs) {
  const fin = Date.now() + delaiMs
  while (Date.now() < fin) {
    try { const r = await fetch(url); if (r) return true } catch { /* pas encore prêt */ }
    await new Promise((res) => setTimeout(res, 500))
  }
  throw new Error(`serveur ${url} indisponible après ${delaiMs}ms`)
}

// Ne tue QUE par PID (jamais par nom : un taskkill par nom a déjà fermé tout Node/Chrome du poste).
function tuerArbre(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'])
    else { try { process.kill(-pid, 'SIGKILL') } catch { process.kill(pid, 'SIGKILL') } }
  } catch { /* déjà mort */ }
}

async function avecServeur(racine, fn) {
  const build = spawnSync('npm', ['run', 'build'], { cwd: racine, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 })
  if (build.status !== 0) throw new Error(`npm run build a échoué (code ${build.status}) avant de démarrer le service — ${derniereLigneUtile(build)}`)
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
  try {
    await attendreServeur(`http://localhost:${PORT}/`, 45000)
    return await fn(PORT)
  } finally {
    tuerArbre(proc.pid)
  }
}

// GET avec un en-tête Host forgé : le fetch de Node 24 (undici) ignore Host, http.request le respecte (fiche 026-008, 29/09).
function getAvecHote(url, host) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', headers: { Host: host } }, (res) => {
      const morceaux = []
      res.on('data', (c) => morceaux.push(c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(morceaux).toString('utf8') }))
    })
    req.setTimeout(30000, () => req.destroy(new Error(`délai dépassé pour ${url} (Host ${host})`)))
    req.on('error', reject)
    req.end()
  })
}

// ── GROUPE service (fiche 12) ───────────────────────────────────────────────────────────────────
async function groupeServiceAvecPort(rec, { port }) {
  const base = `http://localhost:${port}`
  const r1 = await fetch(`${base}/`)
  const csp = r1.headers.get('content-security-policy') || ''
  const okRacine = r1.status === 200 && csp.includes("frame-ancestors 'none'") && csp.includes("script-src-attr 'none'")
  const rFaq = await fetch(`${base}/faq`)
  const rManifest = await fetch(`${base}/manifest.webmanifest`)
  const manifestType = rManifest.headers.get('content-type') || ''
  const rSw = await fetch(`${base}/sw.js`)
  const swType = rSw.headers.get('content-type') || ''
  const ok12 = okRacine && rFaq.status === 200 && rManifest.status === 200 && /json/.test(manifestType) && rSw.status === 200 && /javascript/.test(swType)
  rec.t('N16-12', ok12, ok12 ? 'routes de base et CSP conformes' : `/ =${r1.status} csp="${csp.slice(0, 80)}", /faq=${rFaq.status}, manifest=${rManifest.status}/${manifestType}, sw=${rSw.status}/${swType}`)

  const rIcon = await fetch(`${base}/p/demo-menuisier/icon`)
  const iconType = rIcon.headers.get('content-type') || ''
  const ok13 = rIcon.status === 200 && /image\/png/.test(iconType)
  rec.t('N16-13', ok13, ok13 ? 'icon PNG rendue (params en promesse exécutés)' : `code ${rIcon.status}, content-type ${iconType}`)

  const rInconnu = await getAvecHote(`${base}/sw.js`, 'inconnu-026.example')
  const inconnuType = rInconnu.headers['content-type'] || ''
  const ok14a = rInconnu.status === 404 && !/javascript/.test(inconnuType)
  const rLanding = await getAvecHote(`${base}/`, `localhost:${port}`)
  const rQg = await getAvecHote(`${base}/`, `qg.localhost:${port}`)
  const bodyLanding = rLanding.text
  const bodyQg = rQg.text
  const ok14b = rQg.status === 200 && bodyQg !== bodyLanding
  const ok14 = ok14a && ok14b
  rec.t('N16-14', ok14, ok14 ? 'proxy actif : hôte inconnu → 404 sans JS, qg. → autre rendu que la landing' : `hôte inconnu : code ${rInconnu.status}/${inconnuType} ; qg. : code ${rQg.status}, page identique à la landing=${bodyQg === bodyLanding}`)
}

// ── GROUPE suites (fiche 12) ────────────────────────────────────────────────────────────────────
const SUITES_N16_15 = [
  { nom: 'seo-e2e', args: ['scripts/seo-e2e.mjs'] },
  { nom: 'pwa-e2e', args: ['scripts/pwa-e2e.mjs'] },
  { nom: 'liens-profonds-e2e', args: ['scripts/liens-profonds-e2e.mjs'] },
  { nom: 'legal-e2e', args: ['scripts/legal-e2e.mjs'] },
  { nom: 'fermeture-e2e', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/fermeture-e2e.mjs'] },
  { nom: 'audit-final-e2e', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/audit-final-e2e.mjs'] },
  { nom: 'domaine-perso-e2e', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/domaine-perso-e2e.mjs'] },
]

async function groupeSuitesAvecPort(rec, { racine, port }) {
  const echecs = []
  for (const s of SUITES_N16_15) {
    const r = spawnSync('node', s.args, { cwd: racine, encoding: 'utf8', env: { ...process.env, TEST_BASE: `http://localhost:${port}` } })
    if (r.status !== 0) echecs.push(`${s.nom} (code ${r.status})`)
  }
  rec.t('N16-15', echecs.length === 0, echecs.length ? echecs.join(', ') : 'les sept suites (seo, pwa, liens profonds, legal, fermeture, audit final, domaine perso) sont vertes')

  const avantPath = path.join(PREUVES_026_004, 'juges-avant.txt')
  if (!fs.existsSync(avantPath)) { rec.t('N16-16', false, '.orchestre/preuves/026-004/juges-avant.txt introuvable'); return }
  const lignesAvant = fs.readFileSync(avantPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  const rougis = []
  for (const ligne of lignesAvant) {
    const [cmd, ...args] = ligne.split(' ')
    const r = spawnSync(cmd, args, { cwd: racine, encoding: 'utf8' })
    if (r.status !== 0) rougis.push(ligne)
  }
  rec.t('N16-16', rougis.length === 0, rougis.length ? `${rougis.length}/${lignesAvant.length} juge(s) redevenu(s) rouge : ${rougis.slice(0, 3).join(' ; ')}` : `${lignesAvant.length} juge(s) de juges-avant.txt toujours vert(s)`)
}

// ── Orchestration d'un run normal (pas --preuve-echecs) ─────────────────────────────────────────
async function jugerGroupes(rec, { racine, statique, groupes }) {
  const veut = (g) => groupes.includes(g)
  if (veut('dependances')) await groupeDependances(rec, { racine, statique })
  if (veut('code')) groupeCode(rec, { racine })
  if (veut('service') || veut('suites')) {
    if (statique) { rec.note('service et suites non jugés (--statique)') } else {
      try {
        await avecServeur(racine, async (port) => {
          if (veut('service')) await groupeServiceAvecPort(rec, { port })
          if (veut('suites')) await groupeSuitesAvecPort(rec, { racine, port })
        })
      } catch (e) {
        if (veut('service')) { rec.t('N16-12', false, e.message); rec.t('N16-13', false, 'build/serveur en échec'); rec.t('N16-14', false, 'build/serveur en échec') }
        if (veut('suites')) { rec.t('N16-15', false, 'build/serveur en échec'); rec.t('N16-16', false, 'build/serveur en échec') }
      }
    }
  }
}

// ── --preuve-echecs : le juge s'auto-vérifie sur l'arbre d'aujourd'hui (avant migration) ───────
const REPLIS_ATTENDUS = {
  'scripts/domaine-perso-e2e.mjs': /mod\.proxy\s*\?\?\s*mod\.middleware/,
  'scripts/constructeur-ferme-qa.mjs': /FICHIER_PROXY\s*=\s*fs\.existsSync\(path\.join\(R,\s*'proxy\.ts'\)\)/,
  'scripts/parcours-commande-qa.mjs': /FICHIER_PROXY\s*=\s*fs\.existsSync\(path\.join\(R,\s*'proxy\.ts'\)\)/,
  'scripts/site-commander-verifier.mjs': /\(middleware\|proxy\)\\\.ts\$/,
}

function rapportEchecsMd({ recDep, recCode, autoVerif }) {
  const pkg = lireJSON(path.join(DEPOT, 'package.json'))
  const lignes = [
    '# Échecs attendus — scripts/next16-qa.mjs (fiche 026-004)',
    '',
    `Relevé le ${new Date().toISOString().slice(0, 10)}, avant toute migration Next 16 : next demandé "${pkg.dependencies?.next}", proxy.ts absent, middleware.ts présent.`,
    '',
    '## `--groupe=dependances --statique` (attendu : rouge dès N16-1)',
    '',
    ...recDep.lignes.map((l) => `- ${l}`),
    '',
    '## `--groupe=code` (attendu : rouge sur N16-8, vert sur N16-10 et N16-11)',
    '',
    ...recCode.lignes.map((l) => `- ${l}`),
    '',
    '## Auto-vérification `--preuve-echecs`',
    '',
    ...autoVerif.map((l) => `- ${l}`),
    '',
  ]
  return lignes.join('\n')
}

async function modePreuveEchecs() {
  const autoVerif = []
  let echec = false
  const verifie = (libelle, ok, detail = '') => { autoVerif.push(`${ok ? 'PASS' : 'FAIL'} ${libelle}${detail ? ' — ' + detail : ''}`); if (!ok) echec = true; return ok }

  const recDep = creerRecorder()
  await groupeDependances(recDep, { racine: DEPOT, statique: true })
  const premierRougeDep = recDep.premierRouge()
  verifie('--groupe=dependances --statique échoue dès N16-1', !!premierRougeDep && premierRougeDep.startsWith('FAIL N16-1'), premierRougeDep || 'aucun échec (tout est vert)')

  const recCode = creerRecorder()
  groupeCode(recCode, { racine: DEPOT })
  const ligne8 = recCode.lignes.find((l) => / N16-8( |$)/.test(l))
  const ligne10 = recCode.lignes.find((l) => / N16-10( |$)/.test(l))
  const ligne11 = recCode.lignes.find((l) => / N16-11( |$)/.test(l))
  verifie('--groupe=code échoue sur N16-8', !!ligne8 && ligne8.startsWith('FAIL'), ligne8)
  verifie('N16-10 est vert', !!ligne10 && ligne10.startsWith('PASS'), ligne10)
  verifie('N16-11 est vert', !!ligne11 && ligne11.startsWith('PASS'), ligne11)

  const rDomaine = spawnSync('node', ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/domaine-perso-e2e.mjs'], { cwd: DEPOT, encoding: 'utf8' })
  verifie('domaine-perso-e2e.mjs adapté est vert sur l\'arbre actuel', rDomaine.status === 0, rDomaine.status === 0 ? 'code 0' : `code ${rDomaine.status} — ${derniereLigneUtile(rDomaine)}`)

  for (const [f, re] of Object.entries(REPLIS_ATTENDUS)) {
    const p = path.join(DEPOT, f)
    const c = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
    verifie(`${f} contient le repli middleware/proxy`, re.test(c))
  }

  console.log(`next16-qa --preuve-echecs — racine ${DEPOT}`)
  for (const l of autoVerif) console.log(`  ${l}`)
  console.log(echec ? '\nnext16-qa --preuve-echecs : FAIL' : '\nnext16-qa --preuve-echecs : PASS')

  fs.mkdirSync(PREUVES_026_004, { recursive: true })
  fs.writeFileSync(path.join(PREUVES_026_004, 'echecs-attendus.md'), rapportEchecsMd({ recDep, recCode, autoVerif }))

  process.exit(echec ? 1 : 0)
}

// ── Point d'entrée ───────────────────────────────────────────────────────────────────────────────
async function principal() {
  const opts = lireOptions(process.argv.slice(2))
  if (opts.preuveEchecs) { await modePreuveEchecs(); return }

  const racine = opts.racine ? path.resolve(opts.racine) : DEPOT
  if (!fs.existsSync(racine) || !fs.statSync(racine).isDirectory()) { console.error(`✗ --racine=${opts.racine} : dossier introuvable`); process.exit(2) }
  const groupes = opts.groupe ?? GROUPES_CONNUS

  const rec = creerRecorder()
  await jugerGroupes(rec, { racine, statique: opts.statique, groupes })

  console.log(`next16-qa — racine ${path.relative(DEPOT, racine) || '.'}${opts.statique ? ' — statique' : ''} — groupe(s) ${groupes.join(',')}`)
  for (const l of rec.lignes) console.log(`  ${l}`)
  const ok = !rec.rouge
  console.log(ok ? '\nnext16-qa : PASS' : `\nnext16-qa : FAIL — ${rec.lignes.filter((l) => l.startsWith('FAIL ')).map((l) => l.split(' ')[1]).join(', ')}`)
  process.exit(ok ? 0 : 1)
}

principal().catch((e) => { console.error(`✗ next16-qa : ${e?.stack || e}`); process.exit(1) })
