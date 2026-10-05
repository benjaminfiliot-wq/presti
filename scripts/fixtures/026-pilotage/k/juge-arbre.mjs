// scripts/fixtures/026-pilotage/k/juge-arbre.mjs — la COPIE jugée, son build de production et son serveur (fiche 026-170,
// écrit par Claude Code). Tout vit sous .orchestre/travail/station-claw3d-qa/ ; l'arbre réel n'est jamais touché, aucun
// drapeau n'y est levé, aucun .env.local n'est lu (l'environnement des processus enfants est REDUIT : PATH, HOME, le piège
// réseau de la preuve, et des NEXT_PUBLIC_* factices).
//
//   preparerCopie(racine, { variante })   → { dest, erreurs, moteurInstrumente, pontInstrumente }
//       Copie app/ (élagué : controle, p, site et ce qu'ils importent de app/), lib/, proxy.ts, next.config.mjs, tsconfig.json,
//       package.json ; public/ en dossier réel dont chaque entrée est un lien (Serwist écrit public/sw.js : jamais dans le vrai
//       public/) ; node_modules en lien. Lève `pilotage` ET `stationCarte` dans la copie de lib/flags.ts. Instrumente moteur/ :
//       `new Phaser.Game(…)` → `(globalThis.__stationGame = new Phaser.Game(…))`, et enveloppe OfficeSceneBridge (compteur
//       globalThis.__stationPontAppels). variante 'reference' : la même copie où Carte.tsx est remplacé par un cadre vide (le
//       « même moteur absent » de CL-12, contre-revue D4).
//   construire(copie)                     → { ok, dir, arbre, log, cache }   `next build --webpack` (la commande de
//       `npm run build`) dans la copie, poids des polices Google simulé (aucun réseau), CACHE indexé par le sha256 du contenu
//       de tout ce qui peut changer le bundle (.orchestre/travail/station-claw3d-qa/cache-builds/<sha>/).
//   servir(arbre)                         → { base, port, arreter }   `next start` sur 127.0.0.1, port libre.
//   chunksPhaser(arbre)                   → Set des adresses /_next/static/… dont le contenu est celui de Phaser.
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { R, TRAVAIL, court, premiereLigne, exigerSousTravail, lireOuNull, git, extraireTar, listerFichiers } from '../a/commun.mjs'
import { MOTEUR, CLAW3D } from './juge-lecture.mjs'

export const TRAV = path.join(TRAVAIL, 'station-claw3d-qa')
export const CACHE = path.join(TRAV, 'cache-builds')
const GARDER = 8 // entrées gardées dans le cache (les plus récentes)
export const RE_PHASER = /https:\/\/phaser\.io/
const posix = (p) => p.split(path.sep).join('/')

// ── L'environnement des enfants ──────────────────────────────────────────────────────────────────────────────────────────
/** Les NEXT_PUBLIC_* factices : l'hôte Supabase est un port mort de la boucle locale (le navigateur l'intercepte). */
export const SUPABASE_FACTICE = 'http://127.0.0.1:9'
export const ANON_FACTICE = ['cle', 'anon', 'factice'].join('-')
const POLICES = path.join(TRAV, 'polices-simulees.cjs')
/** Le module que Next lit à la place de fonts.googleapis.com (NEXT_FONT_GOOGLE_MOCKED_RESPONSES) : aucun réseau au build. */
function ecrirePolicesSimulees() {
  fs.mkdirSync(TRAV, { recursive: true })
  const src = String.raw`// polices simulées par station-claw3d-qa : chaque adresse de css2 rend un @font-face par sous-ensemble, sans réseau.
const bloc = (famille, sous, i) => '/* ' + sous + ' */\n@font-face {\n  font-family: \'' + famille + '\';\n  font-style: normal;\n  font-weight: 400 700;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/simulee/v1/' + famille.replace(/\W+/g, '') + '-' + sous + '.woff2) format(\'woff2\');\n  unicode-range: U+000' + i + '-00FF;\n}\n'
module.exports = new Proxy({}, { get: (_, url) => {
  if (typeof url !== 'string') return undefined
  const m = /[?&]family=([^:&@]+)/.exec(url)
  const famille = decodeURIComponent((m ? m[1] : 'Simulee').replace(/\+/g, ' '))
  return ['latin-ext', 'latin', 'vietnamese'].map((s, i) => bloc(famille, s, i)).join('')
} })
`
  fs.writeFileSync(POLICES, src)
  return POLICES
}
export function envEnfant(extra = {}) {
  const e = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', LANG: process.env.LANG ?? 'C.UTF-8', TMPDIR: process.env.TMPDIR ?? '/tmp' }
  for (const k of ['NODE_OPTIONS', 'PIEGE_RESEAU_JOURNAL', 'SystemRoot']) if (process.env[k]) e[k] = process.env[k]
  return { ...e, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_FACTICE, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_FACTICE, NEXT_TELEMETRY_DISABLED: '1', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: ecrirePolicesSimulees(), ...extra }
}

// ── Copier ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IGNORER = new Set(['node_modules', '.next', '.git'])
function copierDossier(de, vers) {
  fs.mkdirSync(vers, { recursive: true })
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    if (IGNORER.has(e.name) || e.name.endsWith('.tsbuildinfo')) continue
    const a = path.join(de, e.name), b = path.join(vers, e.name)
    if (e.isDirectory()) copierDossier(a, b)
    else if (e.isFile()) fs.copyFileSync(a, b)
  }
}
const listerSources = (d, out = []) => {
  if (!fs.existsSync(d)) return out
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) listerSources(p, out); else if (/\.(?:tsx?|jsx?|mjs|css)$/.test(e.name)) out.push(p)
  }
  return out
}
/** Les dossiers de app/ que le build doit garder : controle, p, site, et tout dossier de app/ que ceux-là importent. */
function dossiersGardes(racine) {
  const app = path.join(racine, 'app')
  const tous = fs.readdirSync(app, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  const gardes = new Set(['controle', 'p', 'site'].filter((d) => tous.includes(d)))
  for (let change = true; change;) {
    change = false
    const aScruter = [...gardes].flatMap((d) => listerSources(path.join(app, d)))
    for (const e of fs.readdirSync(app, { withFileTypes: true })) if (e.isFile() && /\.(?:tsx?|jsx?|mjs|css)$/.test(e.name)) aScruter.push(path.join(app, e.name))
    {
      for (const f of aScruter) {
        const t = fs.readFileSync(f, 'utf8')
        const cibles = new Set()
        for (const m of t.matchAll(/['"]@\/app\/([\w[\]()-]+)[/'"]/g)) cibles.add(m[1])
        for (const m of t.matchAll(/['"](\.\.?\/(?:\.\.\/)*)[^'"]*['"]/g)) {
          const rel = path.resolve(path.dirname(f), m[0].slice(1, -1))
          const r = path.relative(app, rel)
          if (!r.startsWith('..')) cibles.add(r.split(path.sep)[0])
        }
        for (const c of cibles) if (tous.includes(c) && !gardes.has(c)) { gardes.add(c); change = true }
      }
    }
  }
  return gardes
}
const CARTE_VIDE = "'use client'\n// Cadre vide posé par station-claw3d-qa dans la copie « référence » de CL-12 : le même moteur absent.\nexport default function Carte(_: Record<string, unknown>) { return null }\n"

/** Instrumente le jeu Phaser de la copie : `new Phaser.Game(args)` → `(globalThis.__stationGame = new Phaser.Game(args))`. */
function instrumenterJeu(texte, ts) {
  const cible = ts ? '(globalThis as unknown as Record<string, unknown>).__stationGame' : 'globalThis.__stationGame'
  let n = 0, out = '', i = 0
  const re = /new\s+Phaser\s*\.\s*Game\s*\(/g
  for (let m; (m = re.exec(texte));) {
    let j = m.index + m[0].length, prof = 1
    for (; j < texte.length && prof > 0; j++) {
      const c = texte[j]
      if (c === '\'' || c === '"' || c === '`') { const q = c; j++; while (j < texte.length && texte[j] !== q) { if (texte[j] === '\\') j++; j++ } continue }
      if (c === '(') prof++
      else if (c === ')') prof--
    }
    if (prof !== 0) break
    out += `${texte.slice(i, m.index)}(${cible} = ${texte.slice(m.index, j)})`
    i = j; re.lastIndex = j; n++
  }
  return { texte: out + texte.slice(i), n }
}
const PONT = `// Enveloppe posée par station-claw3d-qa (la COPIE seulement) : chaque appel d'une méthode de OfficeSceneBridge compte.
import { OfficeSceneBridge as Origine } from './OfficeSceneBridge.orig'
export * from './OfficeSceneBridge.orig'
const g = globalThis as unknown as { __stationPontAppels?: number }
g.__stationPontAppels = g.__stationPontAppels ?? 0
const proto = Origine.prototype as unknown as Record<string, unknown>
for (const nom of Object.getOwnPropertyNames(proto)) {
  const d = Object.getOwnPropertyDescriptor(proto, nom)
  if (nom === 'constructor' || !d || typeof d.value !== 'function') continue
  const f = d.value as (...a: unknown[]) => unknown
  proto[nom] = function (this: unknown, ...a: unknown[]) { g.__stationPontAppels = (g.__stationPontAppels ?? 0) + 1; return f.apply(this, a) }
}
export { Origine as OfficeSceneBridge }
`

/** → { dest, erreurs, jeux, pont } ; erreurs : les préalables qui manquent (drapeaux absents de lib/flags.ts, fichiers de tête…). */
export function preparerCopie(racine, { variante = 'jugee', nom = 'copie' } = {}) {
  const erreurs = []
  const dest = exigerSousTravail(path.join(TRAV, 'prep', `${nom}-${variante}`))
  for (const j of ['node_modules']) { try { fs.unlinkSync(path.join(dest, j)) } catch { /* absent */ } }
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const app = path.join(racine, 'app')
  if (!fs.existsSync(app) || !fs.existsSync(path.join(racine, 'lib'))) return { dest, erreurs: [`app/ ou lib/ absent de ${court(racine, 60)}`], jeux: 0, pont: false }
  const gardes = dossiersGardes(racine)
  fs.mkdirSync(path.join(dest, 'app'), { recursive: true })
  for (const e of fs.readdirSync(app, { withFileTypes: true })) {
    if (e.isDirectory() && !gardes.has(e.name)) continue
    if (e.isDirectory()) copierDossier(path.join(app, e.name), path.join(dest, 'app', e.name))
    else fs.copyFileSync(path.join(app, e.name), path.join(dest, 'app', e.name))
  }
  copierDossier(path.join(racine, 'lib'), path.join(dest, 'lib'))
  for (const f of ['proxy.ts', 'middleware.ts', 'next.config.mjs', 'tsconfig.json', 'package.json']) if (fs.existsSync(path.join(racine, f))) fs.copyFileSync(path.join(racine, f), path.join(dest, f))
  if (!fs.existsSync(path.join(dest, 'next.config.mjs'))) erreurs.push('next.config.mjs absent de la racine')
  // public/ : un dossier réel (Serwist y écrit sw.js) dont chaque entrée du vrai public/ est un lien.
  fs.mkdirSync(path.join(dest, 'public'), { recursive: true })
  for (const e of fs.readdirSync(path.join(R, 'public'))) fs.symlinkSync(path.join(R, 'public', e), path.join(dest, 'public', e))
  fs.symlinkSync(path.join(R, 'node_modules'), path.join(dest, 'node_modules'))
  // Les deux drapeaux, levés dans la COPIE de lib/flags.ts seulement.
  const flags = path.join(dest, 'lib', 'flags.ts')
  let t = lireOuNull(flags)
  if (t === null) erreurs.push('lib/flags.ts absent')
  else {
    for (const cle of ['pilotage', 'stationCarte']) {
      const re = new RegExp(`\\b${cle}\\s*:\\s*false\\b`, 'g')
      const n = (t.match(re) ?? []).length
      // Actualisé le 05/10 (lot C-juges-perimes, decisions-chef-0410.md) : Benj a levé les deux drapeaux dans le dépôt (026-140 et 026-193) ; un drapeau déjà levé
      // (exactement une occurrence « <cle>: true », aucune « false ») est déjà tel que la copie le veut. Tout autre compte reste refusé.
      const nLeve = (t.match(new RegExp(`\\b${cle}\\s*:\\s*true\\b`, 'g')) ?? []).length
      if (n === 0 && nLeve === 1) continue
      if (n !== 1 || nLeve !== 0) erreurs.push(`lib/flags.ts : « ${cle}: false » figure ${n} fois et « ${cle}: true » ${nLeve} fois, exactement 1 des deux attendue (le drapeau ${cle} ne peut pas être levé dans la copie)`)
      else t = t.replace(re, `${cle}: true`)
    }
    fs.writeFileSync(flags, t)
  }
  let jeux = 0, pont = false
  if (variante === 'reference') {
    const carte = path.join(dest, 'app', 'controle', 'station', 'Carte.tsx')
    if (fs.existsSync(carte)) fs.writeFileSync(carte, CARTE_VIDE)
  } else {
    const dm = path.join(dest, MOTEUR)
    for (const f of listerSources(dm).filter((x) => /\.(?:tsx?|jsx?|mjs)$/.test(x))) {
      const r = instrumenterJeu(fs.readFileSync(f, 'utf8'), /\.tsx?$/.test(f))
      if (r.n) { fs.writeFileSync(f, r.texte); jeux += r.n }
    }
    const p = path.join(dest, CLAW3D, 'OfficeSceneBridge.ts')
    if (fs.existsSync(p)) {
      fs.renameSync(p, path.join(dest, CLAW3D, 'OfficeSceneBridge.orig.ts'))
      fs.writeFileSync(p, PONT)
      pont = true
    }
  }
  return { dest, erreurs, jeux, pont }
}

// ── Le cache de build ────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le sha256 du contenu de tout ce qui peut changer le bundle (proxy.ts exclu : il ne change aucun morceau du client). */
export function empreinteCopie(dest, variante) {
  const h = crypto.createHash('sha256')
  h.update(`variante:${variante}\n`)
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(dest, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) { if (!['node_modules', 'public', '.next'].includes(r)) rec(r) }
      else if (e.isFile() && !['proxy.ts', 'middleware.ts'].includes(r)) { h.update(`${r}\0`); h.update(fs.readFileSync(path.join(dest, r))); h.update('\0') }
    }
  }
  rec('')
  return h.digest('hex')
}
function purgerCache(garder) {
  try {
    const dirs = fs.readdirSync(CACHE).map((n) => ({ n, t: fs.statSync(path.join(CACHE, n)).mtimeMs })).sort((a, b) => b.t - a.t)
    for (const { n } of dirs.slice(GARDER)) if (n !== garder) fs.rmSync(exigerSousTravail(path.join(CACHE, n)), { recursive: true, force: true })
  } catch { /* cache absent */ }
}
const lancerEnfant = (args, { cwd, env, delai, sortie }) => new Promise((ok) => {
  const t0 = Date.now()
  const e = spawn(process.execPath, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let journal = ''
  const noter = (d) => { journal = (journal + d).slice(-20_000); if (sortie) fs.appendFileSync(sortie, d) }
  e.stdout.on('data', noter); e.stderr.on('data', noter)
  const minuterie = setTimeout(() => { try { process.kill(-e.pid, 'SIGKILL') } catch { /* mort */ } }, delai)
  e.on('close', (code) => { clearTimeout(minuterie); ok({ code, journal, duree: (Date.now() - t0) / 1000 }) })
  e.on('error', (err) => { clearTimeout(minuterie); ok({ code: null, journal: premiereLigne(err), duree: 0 }) })
})
const NEXT = path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next')

/** Construit la copie (ou reprend le build du cache). → { ok, dir, arbre, log, cache, duree } */
export async function construire(copie, variante = 'jugee') {
  if (!fs.existsSync(NEXT)) return { ok: false, log: 'next introuvable dans node_modules (préalable)', cache: false, prealable: true }
  const sha = empreinteCopie(copie.dest, variante)
  const dir = exigerSousTravail(path.join(CACHE, sha.slice(0, 20)))
  const arbre = path.join(dir, 'arbre')
  if (fs.existsSync(path.join(dir, 'OK')) && fs.existsSync(path.join(arbre, '.next', 'BUILD_ID'))) {
    fs.utimesSync(dir, new Date(), new Date())
    fs.rmSync(copie.dest, { recursive: true, force: true })
    return { ok: true, dir, arbre, cache: true, sha, log: '', duree: 0 }
  }
  fs.mkdirSync(CACHE, { recursive: true })
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  fs.renameSync(copie.dest, arbre)
  const journal = path.join(dir, 'build.log')
  const r = await lancerEnfant([NEXT, 'build', '--webpack'], { cwd: arbre, env: envEnfant(), delai: 900_000, sortie: journal })
  if (r.code !== 0 || !fs.existsSync(path.join(arbre, '.next', 'BUILD_ID'))) {
    const erreurs = r.journal.split('\n').filter((l) => /error|failed|cannot|can't resolve|module not found/i.test(l)).slice(0, 4).join(' | ')
    return { ok: false, dir, arbre, cache: false, sha, log: `next build en échec (code ${r.code}) : ${court(erreurs || r.journal.slice(-300), 400)}`, duree: r.duree }
  }
  fs.rmSync(path.join(arbre, '.next', 'cache'), { recursive: true, force: true })
  fs.writeFileSync(path.join(dir, 'OK'), `${new Date().toISOString()}\n`)
  purgerCache(path.basename(dir))
  return { ok: true, dir, arbre, cache: false, sha, log: '', duree: r.duree }
}

// ── Le serveur ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const portLibre = () => new Promise((ok, ko) => { const s = net.createServer(); s.on('error', ko); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) }) })
export async function servir(arbre) {
  const port = await portLibre()
  const base = `http://127.0.0.1:${port}`
  const enfant = spawn(process.execPath, [NEXT, 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: arbre, env: envEnfant({ PORT: String(port) }), detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let journal = ''
  for (const f of [enfant.stdout, enfant.stderr]) f.on('data', (d) => { journal = (journal + d).slice(-4000) })
  const arreter = async () => {
    try { process.kill(-enfant.pid, 'SIGTERM') } catch { /* déjà parti */ }
    await new Promise((ok) => setTimeout(ok, 300))
    try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* parti */ }
  }
  const debut = Date.now()
  while (Date.now() - debut < 90_000) {
    if (enfant.exitCode !== null) throw new Error(`next start s'est arrêté : ${court(journal, 300)}`)
    try { const r = await fetch(`${base}/favicon.ico`, { redirect: 'manual' }); if (r.status > 0) return { base, port, arreter } } catch { /* pas encore */ }
    await new Promise((ok) => setTimeout(ok, 400))
  }
  await arreter()
  throw new Error(`next start ne répond pas après 90 s : ${court(journal, 300)}`)
}

/** Les adresses (chemins /_next/static/…) des fichiers du build dont le contenu est celui de Phaser. */
export function chunksPhaser(arbre) {
  const res = new Set()
  const rec = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p)
      else if (e.name.endsWith('.js') && RE_PHASER.test(fs.readFileSync(p, 'utf8'))) res.add(`/_next/static/${posix(path.relative(path.join(arbre, '.next', 'static'), p))}`)
    }
  }
  const s = path.join(arbre, '.next', 'static')
  if (fs.existsSync(s)) rec(s)
  return res
}

// ── L'arbre du mode --temoin ─────────────────────────────────────────────────────────────────────────────────────────────
/** Le lot k : les fichiers du témoin (chemin du dépôt → Buffer), suffixe .temoin ôté. */
export function fichiersTemoinK() {
  const dossier = path.join(path.dirname(new URL(import.meta.url).pathname), 'temoin')
  const m = new Map()
  for (const f of listerFichiers(dossier)) {
    const p = posix(f)
    if (!p.endsWith('.temoin')) throw new Error(`témoin du lot k : ${p} sans le suffixe .temoin`)
    m.set(p.slice(0, -'.temoin'.length), fs.readFileSync(path.join(dossier, f)))
  }
  return m
}
/** app/, lib/ et les fichiers de tête du commit `base` (git archive : rien n'est écrit dans .git), puis le témoin posé dessus. */
export function arbreTemoin(base) {
  const dest = exigerSousTravail(path.join(TRAV, 'temoin-arbre'))
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAV, 'temoin-arbre.tar')
  const r = git(['-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${posix(tar)}`, base, '--', 'app', 'lib', 'proxy.ts', 'next.config.mjs', 'tsconfig.json', 'package.json'])
  if (r.code !== 0) throw new Error(`git archive ${base.slice(0, 7)} : ${court(r.stderr)}`)
  extraireTar(tar, dest)
  fs.rmSync(tar, { force: true })
  const poses = []
  for (const [rel, buf] of fichiersTemoinK()) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  return { dest, poses }
}
