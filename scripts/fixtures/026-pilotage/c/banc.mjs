// scripts/fixtures/026-pilotage/c/banc.mjs — le banc de rendu du juge d'écran de la station (fiche 026-104, écrite par
// Claude Code). Il sert, sur 127.0.0.1 et depuis le processus du juge, les composants CLIENTS d'une racine (la copie au
// drapeau levé) à un vrai Chromium, sans `next dev` : les écrans se jugent sur une racine quelconque (la référence, le témoin
// du lot c, ses sabotages) en quelques secondes, sans réseau, sans compte ni clé.
//
// Pourquoi un banc (et pas `next dev`) sous la preuve : `next dev` télécharge les polices Google du layout racine (réseau
// hors 127.0.0.1, refusé par le piège de JA-4), compile une minute par passage, et la preuve joue chaque juge une trentaine
// de fois (témoin, sabotages). Sur la racine réelle, sans --racine, le juge ouvre au contraire la VRAIE page servie par
// `next dev` sur la copie au drapeau levé, avec le compte fondateur d'essai (voir pilotage-ecran-qa.mjs, mode vivant) : les
// deux chemins partagent les mêmes critères, seule la façon de servir la page change.
//
// Ce que le banc fait, et rien d'autre :
//   · il empaquette, en CommonJS, les modules atteints depuis les layouts et la page demandés (TypeScript → JS par
//     `ts.transpileModule`, JSX `react-jsx`), React et ReactDOM en production pris dans node_modules ;
//   · il remplace par des doublures les seuls modules de Next que le navigateur ne peut pas charger seul (`next/navigation`,
//     `next/link`, `next/font/*`, `next/dynamic`, `next/image`, `next/script`) et le client Supabase (`@/lib/supabaseClient` :
//     `auth.getSession` rend la session posée par le juge dans `window.__BANC__`, jamais une requête) ;
//   · il sert une coquille HTML (feuilles de style de la racine : app/base.css, puis celles importées par les modules, dans
//     l'ordre d'import) ; `/login` et `/dashboard` sont des pages témoins marquées `data-banc-page`, pour juger une
//     redirection ; tout `/api/…` qui n'a pas été intercepté par le juge rend 404 `{ error: 'non servi par le banc' }`.
// Un `notFound()` rend `[data-banc-404]` ; une erreur de rendu `[data-banc-erreur]` (son message) ; un import que le banc
// ne sait pas servir lève au rendu « banc : import non servi … » (un juge le rapporte au lieu de deviner).
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(ICI, '..', '..', '..', '..')
const NM = path.join(R, 'node_modules')
const CACHE = path.join(R, '.orchestre', 'travail', 'pilotage-ecran', 'cache-banc')
const requireDepot = createRequire(path.join(R, 'package.json'))
let ts = null
const typescript = () => (ts ??= requireDepot('typescript'))
const VERSION_TS = (() => { try { return JSON.parse(fs.readFileSync(path.join(R, 'node_modules', 'typescript', 'package.json'), 'utf8')).version } catch { return '?' } })()
const posix = (p) => p.split(path.sep).join('/')

// ── Modules remplacés ────────────────────────────────────────────────────────────────────────────────────────────────────
const DIRECTS = {
  react: 'react/cjs/react.production.js',
  'react/jsx-runtime': 'react/cjs/react-jsx-runtime.production.js',
  'react/jsx-dev-runtime': 'react/cjs/react-jsx-dev-runtime.production.js',
  'react-dom': 'react-dom/cjs/react-dom.production.js',
  'react-dom/client': 'react-dom/cjs/react-dom-client.production.js',
  scheduler: 'scheduler/cjs/scheduler.production.js',
}
const DOUBLURES = {
  'next/navigation': String.raw`
var React = require('react')
var auditeurs = new Set(), memo = { href: null, params: null }
function notifier() { memo.href = null; auditeurs.forEach(function (f) { f() }) }
window.addEventListener('popstate', notifier)
function suivre() {
  var s = React.useReducer(function (x) { return x + 1 }, 0)
  React.useEffect(function () { auditeurs.add(s[1]); return function () { auditeurs.delete(s[1]) } }, [])
}
function entree(p) { return (window.__BANC__ && window.__BANC__.entreeDe) ? window.__BANC__.entreeDe(p) : p }
function aller(u, remplacer) {
  var url = new URL(String(u), location.href)
  window.__BANC__ = window.__BANC__ || {}
  ;(window.__BANC__.navigations = window.__BANC__.navigations || []).push({ href: url.pathname + url.search, remplacer: !!remplacer, t: Date.now() })
  if (url.origin !== location.origin || entree(url.pathname) !== entree(location.pathname)) { location[remplacer ? 'replace' : 'assign'](url.href); return }
  history[remplacer ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash)
  notifier()
}
var routeur = { push: function (u) { aller(u, false) }, replace: function (u) { aller(u, true) }, back: function () { history.back() }, forward: function () { history.forward() }, refresh: function () { notifier() }, prefetch: function () {} }
exports.useRouter = function () { return routeur }
exports.useSearchParams = function () {
  suivre()
  if (memo.href !== location.href) { memo.href = location.href; memo.params = new URLSearchParams(location.search) }
  return memo.params
}
exports.usePathname = function () { suivre(); return location.pathname }
exports.useParams = function () { return {} }
exports.useSelectedLayoutSegment = function () { return null }
exports.useSelectedLayoutSegments = function () { return [] }
exports.notFound = function () { var e = new Error('NEXT_NOT_FOUND'); e.digest = 'NEXT_NOT_FOUND'; throw e }
exports.redirect = function (u) { location.replace(String(u)); var e = new Error('NEXT_REDIRECT'); e.digest = 'NEXT_REDIRECT'; throw e }
exports.permanentRedirect = exports.redirect
exports.ReadonlyURLSearchParams = URLSearchParams
exports.__routeur = routeur
`,
  'next/link': String.raw`
var React = require('react')
var nav = require('next/navigation')
function versTexte(h) { if (typeof h === 'string') return h; if (!h) return '#'; var q = h.query ? '?' + new URLSearchParams(h.query).toString() : ''; return (h.pathname || '') + q + (h.hash || '') }
var Link = React.forwardRef(function Link(p, ref) {
  var href = versTexte(p.href), reste = {}
  for (var k in p) if (['href', 'replace', 'scroll', 'prefetch', 'shallow', 'passHref', 'legacyBehavior', 'locale'].indexOf(k) < 0) reste[k] = p[k]
  reste.ref = ref; reste.href = href
  reste.onClick = function (e) {
    if (p.onClick) p.onClick(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (p.target && p.target !== '_self')) return
    e.preventDefault(); nav.__routeur[p.replace ? 'replace' : 'push'](href)
  }
  return React.createElement('a', reste, p.children)
})
exports.__esModule = true
exports.default = Link
`,
  'next/font/google': String.raw`
function police(nom) { return function () { return { className: 'banc-police', variable: 'banc-police-' + String(nom).toLowerCase(), style: { fontFamily: 'monospace' } } } }
module.exports = new Proxy({}, { get: function (_, k) { if (k === '__esModule') return true; return police(k) } })
`,
  'next/font/local': String.raw`
exports.__esModule = true
exports.default = function () { return { className: 'banc-police', variable: 'banc-police-locale', style: { fontFamily: 'monospace' } } }
`,
  'next/dynamic': String.raw`
var React = require('react')
exports.__esModule = true
exports.default = function (charger, opts) {
  var Paresseux = React.lazy(function () { return Promise.resolve(charger()).then(function (m) { return { default: (m && m.default) || m } }) })
  return function Dynamique(p) { return React.createElement(React.Suspense, { fallback: opts && opts.loading ? React.createElement(opts.loading) : null }, React.createElement(Paresseux, p)) }
}
`,
  'next/image': String.raw`
var React = require('react')
exports.__esModule = true
exports.default = function Image(p) { var r = {}; for (var k in p) if (['fill', 'priority', 'placeholder', 'blurDataURL', 'loader', 'quality', 'unoptimized'].indexOf(k) < 0) r[k] = p[k]; return React.createElement('img', r) }
`,
  'next/script': 'exports.__esModule = true; exports.default = function () { return null }',
  'server-only': '',
  'client-only': '',
}
// Le client Supabase du navigateur : jamais une requête ; la session est celle que le juge a posée (window.__BANC__.session).
const SUPABASE_CLIENT = String.raw`
function session() { return (window.__BANC__ && 'session' in window.__BANC__) ? window.__BANC__.session : null }
function interdit(quoi) { return function () { throw new Error('banc : supabase.' + quoi + ' interdit à l’écran (les données passent par apiDirection)') } }
exports.__esModule = true
exports.supabase = {
  auth: {
    getSession: function () { return Promise.resolve({ data: { session: session() }, error: null }) },
    getUser: function () { var s = session(); return Promise.resolve({ data: { user: s ? s.user || { id: 'banc' } : null }, error: null }) },
    onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } } },
    signOut: function () { return Promise.resolve({ error: null }) },
    refreshSession: function () { return Promise.resolve({ data: { session: session() }, error: null }) },
    mfa: {
      getAuthenticatorAssuranceLevel: function () { return Promise.resolve({ data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] }, error: null }) },
      listFactors: function () { return Promise.resolve({ data: { all: [], totp: [], phone: [] }, error: null }) },
    },
  },
  from: interdit('from'), rpc: interdit('rpc'), channel: interdit('channel'), storage: { from: interdit('storage.from') },
}
`
export const MODULES_DOUBLES = Object.keys(DOUBLURES)

// ── Résolution ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json']
const estFichier = (f) => { try { return fs.statSync(f).isFile() } catch { return false } }
function essayerFichier(base) {
  if (estFichier(base)) return base
  for (const e of EXTENSIONS) if (estFichier(base + e)) return base + e
  for (const e of EXTENSIONS) if (estFichier(path.join(base, `index${e}`))) return path.join(base, `index${e}`)
  return null
}
function exporteDe(pkg, sous) {
  const ex = pkg.exports
  if (!ex) return null
  const cle = sous ? `./${sous}` : '.'
  let cible = typeof ex === 'string' || Array.isArray(ex) ? (cle === '.' ? ex : null) : (ex[cle] ?? (cle === '.' && !Object.keys(ex).some((k) => k.startsWith('.')) ? ex : null))
  const choisir = (c) => {
    if (typeof c === 'string') return c
    if (Array.isArray(c)) { for (const x of c) { const y = choisir(x); if (y) return y } return null }
    if (c && typeof c === 'object') for (const k of ['browser', 'import', 'module', 'require', 'default']) if (k in c) { const y = choisir(c[k]); if (y) return y }
    return null
  }
  return choisir(cible)
}
function resoudrePaquet(spec) {
  const parties = spec.split('/')
  const nom = spec.startsWith('@') ? parties.slice(0, 2).join('/') : parties[0]
  const sous = spec.slice(nom.length + 1)
  const dossier = path.join(NM, nom)
  let pkg = null
  try { pkg = JSON.parse(fs.readFileSync(path.join(dossier, 'package.json'), 'utf8')) } catch { return null }
  const parExport = exporteDe(pkg, sous)
  if (parExport) return essayerFichier(path.join(dossier, parExport))
  if (sous) return essayerFichier(path.join(dossier, sous))
  const principal = (typeof pkg.browser === 'string' && pkg.browser) || pkg.module || pkg.main || 'index.js'
  return essayerFichier(path.join(dossier, principal))
}

// ── Empaquetage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * racine : la racine servie (la copie au drapeau levé). entree : le source du module d'entrée (généré par le juge), dont
 * les `require('@/…')` se résolvent dans la racine. → { js, css: [{ fichier, texte }], modules, manquants }
 */
export function empaqueter({ racine, entree, nomEntree = '__entree__.tsx', remplacements = new Map() }) {
  const modules = new Map() // id → { code, deps: { spec: id } }
  const css = []
  const manquants = []
  const idDe = (f) => posix(path.relative(R, f)) || f
  const aTraiter = []
  const ajouter = (id, code, fichier) => { if (!modules.has(id)) { modules.set(id, { code, deps: {}, fichier }); aTraiter.push(id) } }
  // Le résultat de chaque transpilation est gardé sous .orchestre/travail/pilotage-ecran/cache-banc/, par empreinte du
  // source (et de l'extension, de la version de TypeScript) : un passage suivant ne retranspile que ce qui a changé.
  const transpiler = (src, fichier) => {
    const cle = crypto.createHash('sha256').update(`${VERSION_TS}|${path.extname(fichier)}|${src}`).digest('hex')
    const f = path.join(CACHE, `${cle}.js`)
    try { return fs.readFileSync(f, 'utf8') } catch { /* pas encore transpilé */ }
    const t = typescript()
    const js = t.transpileModule(src, {
      fileName: fichier,
      compilerOptions: { module: t.ModuleKind.CommonJS, target: t.ScriptTarget.ES2020, jsx: t.JsxEmit.ReactJSX, esModuleInterop: true, allowJs: true, isolatedModules: true, sourceMap: false, removeComments: false },
    }).outputText
    try { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(`${f}.${process.pid}`, js); fs.renameSync(`${f}.${process.pid}`, f) } catch { /* cache indisponible : rien de grave */ }
    return js
  }
  const lireSource = (f) => (remplacements.has(path.resolve(f)) ? remplacements.get(path.resolve(f)) : fs.readFileSync(f, 'utf8'))
  const ESM = /(^|[\n;])\s*(import\s+[\w{*'"]|export\s+(\{|\*|default|const|let|var|function|class|async))/
  function charger(fichier) {
    const id = idDe(fichier)
    if (modules.has(id)) return id
    const ext = path.extname(fichier).toLowerCase()
    if (ext === '.css') { if (!css.some((c) => c.fichier === id)) css.push({ fichier: id, texte: lireSource(fichier) }); ajouter(id, '', fichier); return id }
    if (ext === '.json') { ajouter(id, `module.exports = ${lireSource(fichier)}`, fichier); return id }
    if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) { ajouter(id, `module.exports = ${JSON.stringify('/__banc/fichier/' + id)}`, fichier); return id }
    const src = lireSource(fichier)
    const dansNM = fichier.startsWith(NM)
    const code = ['.ts', '.tsx', '.jsx'].includes(ext) || (!dansNM) || ESM.test(src) ? transpiler(src, fichier) : src
    ajouter(id, code, fichier)
    return id
  }
  function resoudre(spec, depuis) {
    if (DIRECTS[spec]) return charger(path.join(NM, DIRECTS[spec]))
    if (spec in DOUBLURES) { const id = `@banc/${spec}`; ajouter(id, DOUBLURES[spec], null); return id }
    if (spec === '@/lib/supabaseClient') { ajouter('@banc/supabaseClient', SUPABASE_CLIENT, null); return '@banc/supabaseClient' }
    let f = null
    if (spec.startsWith('@/')) f = essayerFichier(path.join(racine, spec.slice(2)))
    else if (spec.startsWith('.') || spec.startsWith('/')) f = essayerFichier(path.resolve(depuis ? path.dirname(depuis) : racine, spec))
    else if (spec.startsWith('node:') || ['fs', 'path', 'crypto', 'os', 'child_process', 'http', 'https', 'net', 'stream', 'zlib', 'url', 'util'].includes(spec)) f = null
    else f = resoudrePaquet(spec)
    if (f && path.resolve(f) === path.resolve(racine, 'lib', 'supabaseClient.ts')) { ajouter('@banc/supabaseClient', SUPABASE_CLIENT, null); return '@banc/supabaseClient' }
    if (!f) {
      const id = `@banc/manquant/${spec}`
      manquants.push({ spec, depuis: depuis ? idDe(depuis) : nomEntree })
      ajouter(id, `throw new Error(${JSON.stringify(`banc : import non servi « ${spec} » (importé par ${depuis ? idDe(depuis) : nomEntree})`)})`, null)
      return id
    }
    return charger(f)
  }
  ajouter(nomEntree, transpiler(entree, path.join(racine, nomEntree)), path.join(racine, nomEntree))
  const RE_REQUIRE = /\brequire\(\s*(["'])([^"'\n]+)\1\s*\)/g
  // D-0510-4 (05/10) : un `import('x')` transpilé en CommonJS devient `Promise.resolve().then(() => __importStar(require('x')))` ; cette arête est
  // DYNAMIQUE (chez Next, un chunk à part, jamais dans le paquet initial de la page). Un module requis d'une autre façon, ne serait-ce qu'une fois, est statique.
  const DYNAMIQUE = /Promise\.resolve\(\)\.then\(\(\)\s*=>\s*(?:__import(?:Star|Default)\()?\s*$/
  while (aTraiter.length) {
    const id = aTraiter.shift()
    const m = modules.get(id)
    m.statiques = new Set()
    for (const x of m.code.matchAll(RE_REQUIRE)) {
      const spec = x[2]
      if (!DYNAMIQUE.test(m.code.slice(Math.max(0, x.index - 90), x.index))) m.statiques.add(spec)
      if (spec in m.deps) continue
      m.deps[spec] = resoudre(spec, m.fichier)
    }
  }
  // Le paquet INITIAL : ce que la page charge sans passer par un import() dynamique (les modules atteints par des arêtes statiques seulement).
  const initiaux = new Set([nomEntree]), parcours = [nomEntree]
  while (parcours.length) {
    const m = modules.get(parcours.shift())
    for (const spec of m?.statiques ?? []) { const dep = m.deps[spec]; if (dep && !initiaux.has(dep)) { initiaux.add(dep); parcours.push(dep) } }
  }
  const morceaux = []
  morceaux.push('(function () {\n"use strict";\nvar process = { env: { NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9/banc-supabase", NEXT_PUBLIC_SUPABASE_ANON_KEY: "banc" }, browser: true };\nvar global = window;\nvar defs = Object.create(null), cache = Object.create(null);')
  for (const [id, m] of modules) {
    morceaux.push(`defs[${JSON.stringify(id)}] = [${JSON.stringify(m.deps)}, function (module, exports, require, process, global) {\n${m.code}\n}];`)
  }
  morceaux.push(`function charger(id) {
  if (cache[id]) return cache[id].exports
  var d = defs[id]; if (!d) throw new Error('banc : module absent ' + id)
  var module = { exports: {} }; cache[id] = module
  d[1].call(module.exports, module, module.exports, function (s) { var c = d[0][s]; if (!c) throw new Error('banc : require non résolu « ' + s + ' » dans ' + id); return charger(c) }, process, global)
  return module.exports
}
window.__banc_charger = charger
charger(${JSON.stringify(nomEntree)})
})()`)
  return { js: morceaux.join('\n'), css, modules: [...modules.keys()], initiaux: [...initiaux], manquants }
}

// ── Le module d'entrée d'une page ────────────────────────────────────────────────────────────────────────────────────────
/** Les layouts (du plus extérieur au plus intérieur) puis la page, relatifs à la racine (« app/controle/layout.tsx »). */
export function entreePage({ layouts, page }) {
  const imp = (rel, i) => `const L${i} = require(${JSON.stringify(`@/${rel.replace(/\.(tsx|ts)$/, '')}`)}).default`
  return `
const React = require('react')
const { createRoot } = require('react-dom/client')
${layouts.map(imp).join('\n')}
const Page = require(${JSON.stringify(`@/${page.replace(/\.(tsx|ts)$/, '')}`)}).default
class Frontiere extends React.Component {
  constructor(p) { super(p); this.state = { e: null } }
  static getDerivedStateFromError(e) { return { e } }
  componentDidCatch(e) { (window.__BANC__ = window.__BANC__ || {}).erreurs = [...((window.__BANC__ || {}).erreurs || []), String(e && e.message)] }
  render() {
    const e = this.state.e
    if (!e) return this.props.children
    if (e && e.digest === 'NEXT_NOT_FOUND') return React.createElement('div', { 'data-banc-404': '' }, '404 — page introuvable (banc)')
    return React.createElement('pre', { 'data-banc-erreur': String(e && e.message) }, 'Erreur de rendu (banc) : ' + String(e && e.message))
  }
}
let arbre = React.createElement(Page, null)
${layouts.map((_, i) => `arbre = React.createElement(L${layouts.length - 1 - i}, null, arbre)`).join('\n')}
window.addEventListener('error', (ev) => { (window.__BANC__ = window.__BANC__ || {}).erreursGlobales = [...((window.__BANC__ || {}).erreursGlobales || []), String(ev.message)] })
createRoot(document.getElementById('racine')).render(React.createElement(Frontiere, null, arbre))
`
}

// ── Le serveur ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const echapper = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
/**
 * pages : { <nom>: { prefixes: ['/controle/station'], layouts: [...], page: '…' } } (le préfixe le plus long l'emporte).
 * → { base, arreter(), paquets: { <nom>: { modules, manquants, octets } }, requetes: [] }
 */
export async function demarrerBanc({ racine, pages, cssTete = ['app/base.css'], remplacements = new Map() }) {
  const paquets = {}
  const construire = (nom) => {
    if (paquets[nom]) return paquets[nom]
    const p = pages[nom]
    const e = empaqueter({ racine, entree: entreePage(p), nomEntree: `__entree_${nom}__.tsx`, remplacements })
    const tete = cssTete.map((rel) => ({ fichier: rel, texte: fs.existsSync(path.join(racine, rel)) ? fs.readFileSync(path.join(racine, rel), 'utf8') : '' }))
    paquets[nom] = { js: e.js, css: [...tete, ...e.css].map((c) => `/* ${c.fichier} */\n${c.texte}`).join('\n'), modules: e.modules, initiaux: e.initiaux, manquants: e.manquants, octets: Buffer.byteLength(e.js) }
    return paquets[nom]
  }
  const prefixes = Object.entries(pages).flatMap(([nom, p]) => p.prefixes.map((x) => ({ nom, x }))).sort((a, b) => b.x.length - a.x.length)
  const pageDe = (chemin) => prefixes.find((p) => chemin === p.x || chemin.startsWith(`${p.x}/`) || (p.x.endsWith('/') && chemin.startsWith(p.x)))?.nom ?? null
  const requetes = []
  const serveur = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1')
    requetes.push({ methode: req.method, chemin: u.pathname + u.search, t: Date.now() })
    const envoyer = (code, type, corps) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(corps) }
    try {
      let m
      if ((m = /^\/__banc\/(\w+)\.js$/.exec(u.pathname)) && pages[m[1]]) return envoyer(200, 'text/javascript; charset=utf-8', construire(m[1]).js)
      if ((m = /^\/__banc\/(\w+)\.css$/.exec(u.pathname)) && pages[m[1]]) return envoyer(200, 'text/css; charset=utf-8', construire(m[1]).css)
      if (u.pathname.startsWith('/api/')) return envoyer(404, 'application/json', JSON.stringify({ error: 'non servi par le banc' }))
      if (u.pathname === '/favicon.ico') return envoyer(204, 'text/plain', '')
      const nom = pageDe(u.pathname)
      if (nom) {
        construire(nom)
        return envoyer(200, 'text/html; charset=utf-8', `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>banc · ${echapper(nom)}</title><link rel="stylesheet" href="/__banc/${nom}.css"></head><body><div id="racine"></div><script>window.__BANC__ = Object.assign({ entreeDe: function (p) { var l = ${JSON.stringify(prefixes)}; for (var i = 0; i < l.length; i++) { var x = l[i].x; if (p === x || p.indexOf(x + '/') === 0) return l[i].nom } return p } }, window.__BANC__ || {})</script><script src="/__banc/${nom}.js"></script></body></html>`)
      }
      return envoyer(200, 'text/html; charset=utf-8', `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>banc ${echapper(u.pathname)}</title></head><body><main data-banc-page="${echapper(u.pathname)}">Page témoin du banc : ${echapper(u.pathname + u.search)}</main></body></html>`)
    } catch (e) {
      return envoyer(500, 'text/plain; charset=utf-8', `banc : ${e && e.stack ? e.stack : e}`)
    }
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const base = `http://127.0.0.1:${serveur.address().port}`
  for (const nom of Object.keys(pages)) if (pages[nom].precharger !== false) construire(nom)
  return { base, paquets, requetes, pageDe, arreter: () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }) }
}
