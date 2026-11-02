// scripts/fixtures/landing-v2-qa/harnais.mjs — le harnais de rendu hors ligne de scripts/landing-v2-qa.mjs (tâche 033-002, chantier 2, lot 5).
//
// Ce que fait ce module : prendre un arbre (app/, components/, lib/ sous une RACINE, complété par un REPLI pour les fichiers absents), transpiler
// chaque module TypeScript/TSX atteint depuis une page avec `typescript` (transpileModule, JavaScript pur : pareil sur Windows et sur ARM), réécrire
// ses imports vers des fichiers .mjs écrits sous .orchestre/travail/landing-v2-qa/, remplacer par des modules neutres ce qui ne se charge pas dans Node
// (next/*, three, gsap, client Supabase…), puis rendre la page avec `react-dom/static` (prerender : gère les composants asynchrones).
// Jamais un composant de la page n'est remplacé : un composant du projet qui ne se rend pas est un échec, pas un remplacement. Un module du projet
// ABSENT de l'arbre (ex. components/ui/Onglets dans la référence) devient un composant transparent qui rend ses enfants et les éléments reçus en props.
//
// Dépendances non déclarées au package.json (venues de Next) : `postcss`, lu ici pour les feuilles de style (node_modules/postcss).
// Rien de natif : ni esbuild ni le SWC de Next.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'
import { normaliser, decoderEntites } from '../../promesses-qa.mjs'

const require = createRequire(import.meta.url)
export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const TRAVAIL = path.join(R, '.orchestre', 'travail', 'landing-v2-qa')
export { normaliser, decoderEntites }

export const lireTexte = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
export const existe = (f) => { try { return fs.statSync(f).isFile() } catch { return false } }
export const existeDossier = (f) => { try { return fs.statSync(f).isDirectory() } catch { return false } }
const court = (s, n = 140) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export { court }

// ── L'arbre virtuel : la RACINE recouvre le REPLI ─────────────────────────────────────────────────────────────────────────
export function arbre(racine, repli = null) {
  const dossiers = [racine, repli].filter(Boolean)
  return {
    racine, repli, dossiers,
    /** Le premier fichier réel de `rel` (racine d'abord), ou null. */
    chemin(rel) { for (const d of dossiers) { const p = path.join(d, rel); if (existe(p)) return p } return null },
    cheminDossier(rel) { for (const d of dossiers) { const p = path.join(d, rel); if (existeDossier(p)) return p } return null },
    lire(rel) { const p = this.chemin(rel); return p ? lireTexte(p) : null },
    /** Liste récursive de rel dans l'union des dossiers (sans doublons). */
    lister(rel, ext = null) {
      const vus = new Set()
      const marcher = (base, courant) => {
        let es = []
        try { es = fs.readdirSync(path.join(base, courant), { withFileTypes: true }) } catch { return }
        for (const e of es) {
          const r = path.posix.join(courant, e.name)
          if (e.isDirectory()) { if (e.name !== 'node_modules') marcher(base, r) } else if (!ext || ext.test(e.name)) vus.add(r)
        }
      }
      for (const d of dossiers) marcher(d, rel)
      return [...vus].sort()
    },
  }
}

// ── Commentaires ôtés (scanner de TypeScript) : les numéros de ligne restent ─────────────────────────────────────────────
export function sansCommentaires(source) {
  const sf = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
  const plages = []
  const vus = new Set()
  const noter = (pos) => {
    if (vus.has(pos)) return
    vus.add(pos)
    for (const c of ts.getLeadingCommentRanges(source, pos) ?? []) plages.push([c.pos, c.end])
  }
  const visiter = (n) => {
    if (n.kind === ts.SyntaxKind.JsxText) return
    if (n.getChildCount(sf) === 0) noter(n.pos)
    for (const e of n.getChildren(sf)) visiter(e)
  }
  visiter(sf)
  let sortie = ''
  let i = 0
  for (const [d, f] of plages.sort((a, b) => a[0] - b[0])) {
    if (d < i) continue
    sortie += source.slice(i, d) + source.slice(d, f).replace(/[^\n]/g, ' ')
    i = f
  }
  return sortie + source.slice(i)
}

// ── La construction : transpiler le graphe d'imports d'une page ────────────────────────────────────────────────────────────
const EXT_CODE = /\.(tsx?|jsx?|mjs)$/
const EXT_STATIQUES = /\.(png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|mp3|woff2?|ttf|otf|pdf|txt)$/i
const PAQUETS_REELS = /^(react|react\/.+|react-dom|react-dom\/.+|node:.+)$/
const NATIFS = new Set(['fs', 'path', 'crypto', 'url', 'os', 'util', 'stream', 'buffer', 'events', 'zlib', 'http', 'https', 'net', 'child_process', 'assert', 'querystring', 'string_decoder'])

const STUBS_NEXT = {
  'next/link': "import { createElement } from 'react'\nexport default function Link({ href, children, prefetch, replace, scroll, shallow, legacyBehavior, passHref, locale, ...r }) { return createElement('a', { href: typeof href === 'string' ? href : (href && (href.pathname ?? '')) ?? '', ...r }, children) }\n",
  'next/image': "import { createElement } from 'react'\nexport default function Image({ src, alt, priority, fill, quality, placeholder, blurDataURL, loader, unoptimized, sizes, ...r }) { const s = typeof src === 'string' ? src : (src && src.src) ?? ''; return createElement('img', { src: s, alt, ...r }) }\nexport const getImageProps = () => ({ props: {} })\n",
  'next/navigation': "export const notFound = () => { throw Object.assign(new Error('NEXT_NOT_FOUND'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404', estNotFound: true }) }\nexport const redirect = (u) => { throw Object.assign(new Error('NEXT_REDIRECT ' + u), { estRedirect: true }) }\nexport const permanentRedirect = redirect\nexport const useRouter = () => ({ push() {}, replace() {}, back() {}, forward() {}, refresh() {}, prefetch() {} })\nexport const usePathname = () => globalThis.__LV2_CHEMIN ?? '/'\nexport const useSearchParams = () => new URLSearchParams(globalThis.__LV2_QS ?? '')\nexport const useParams = () => ({})\nexport const useSelectedLayoutSegment = () => null\nexport const useSelectedLayoutSegments = () => []\n",
  'next/dynamic': "import { createElement } from 'react'\nexport default function dynamic(chargeur, opts = {}) {\n  const Chargement = opts && opts.loading\n  if (opts && opts.ssr === false) return function SansServeur() { return Chargement ? createElement(Chargement, {}) : null }\n  return async function Dynamique(props) { const m = await chargeur(); const C = (m && m.default) ?? m; return createElement(C, props) }\n}\n",
  'next/script': "export default function Script() { return null }\n",
  'next/headers': "export const cookies = async () => ({ get() { return undefined }, getAll() { return [] }, has() { return false } })\nexport const headers = async () => new Headers()\nexport const draftMode = async () => ({ isEnabled: false })\n",
}
const police = "export default function police() { return { className: 'police', variable: 'police-var', style: { fontFamily: 'police' } } }\n"

export async function construire({ arbre: A, entrees, surcharges = {}, nom = 'b', lever = false }) {
  const sortie = path.join(TRAVAIL, nom)
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(sortie, { recursive: true })
  const traites = new Map() // rel → { url, source, deps, dyn }
  const feuilles = [] // { rel, importeur }
  const stubsNoms = new Map() // spec → Set(noms)
  const manquants = new Map() // rel → Set(noms)
  const stubsRemplaces = new Set()
  const cssAbsents = new Set()
  const urlStub = (spec) => pathToFileURL(path.join(sortie, '__stubs__', spec.replace(/[^\w.-]/g, '_') + '.mjs')).href
  const urlManquant = (rel) => pathToFileURL(path.join(sortie, '__manquants__', rel.replace(/[^\w.-]/g, '_') + '.mjs')).href

  const resoudre = (spec, depuisRel) => {
    const base = spec.startsWith('@/') ? spec.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(depuisRel), spec))
    const essais = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '/index.ts', '/index.tsx', '/index.js']
    for (const e of essais) { if (A.chemin(base + e)) return base + e }
    if (/\.css$/.test(base) && A.chemin(base)) return base
    return null
  }
  const nomsImportes = (n) => {
    const noms = []
    if (ts.isImportDeclaration(n) && n.importClause && !n.importClause.isTypeOnly) {
      if (n.importClause.name) noms.push('default')
      const nb = n.importClause.namedBindings
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) if (!e.isTypeOnly) noms.push((e.propertyName ?? e.name).text)
    } else if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) {
      for (const e of n.exportClause.elements) noms.push((e.propertyName ?? e.name).text)
    }
    return noms
  }

  function traiter(rel) {
    if (traites.has(rel)) return traites.get(rel).url
    const fichierSortie = path.join(sortie, rel.replace(/[^\w./-]/g, '_') + '.mjs')
    const url = pathToFileURL(fichierSortie).href
    const entree = { url, rel, source: null, deps: new Set(), dyn: new Set() }
    traites.set(rel, entree)
    fs.mkdirSync(path.dirname(fichierSortie), { recursive: true })
    const brut = A.lire(rel) ?? ''
    if (rel.endsWith('.json')) { fs.writeFileSync(fichierSortie, `export default ${brut}\n`); return url }
    if (rel.endsWith('.css')) { fs.writeFileSync(fichierSortie, 'export default {}\n'); return url }
    if (EXT_STATIQUES.test(rel)) { fs.writeFileSync(fichierSortie, `export default { src: ${JSON.stringify('/' + rel)}, width: 1, height: 1 }\n`); return url }
    let source = brut
    if (surcharges[rel]) source = surcharges[rel](source)
    entree.source = source
    const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.ES2022, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const remplacements = []
    const specifieur = (lit, noms, dynamique) => {
      const spec = lit.text
      let cible = null
      if (PAQUETS_REELS.test(spec) || NATIFS.has(spec)) return
      if (spec.startsWith('.') || spec.startsWith('@/')) {
        const r = resoudre(spec, rel)
        if (r) {
          if (/\.css$/.test(r)) feuilles.push({ rel: r, importeur: rel })
          cible = traiter(r)
          ;(dynamique ? entree.dyn : entree.deps).add(r)
        } else {
          const rb = spec.startsWith('@/') ? spec.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec))
          if (/\.css$/.test(rb)) { feuilles.push({ rel: rb, importeur: rel, absente: true }); cssAbsents.add(rb); cible = urlManquant(rb) }
          else { const s = manquants.get(rb) ?? new Set(); noms.forEach((x) => s.add(x)); manquants.set(rb, s); cible = urlManquant(rb) }
        }
      } else {
        const s = stubsNoms.get(spec) ?? new Set(); noms.forEach((x) => s.add(x)); stubsNoms.set(spec, s)
        stubsRemplaces.add(spec)
        cible = urlStub(spec)
      }
      remplacements.push([lit.getStart(sf), lit.getEnd(), JSON.stringify(cible)])
    }
    const visiter = (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const typeSeul = (ts.isImportDeclaration(n) && n.importClause?.isTypeOnly) || (ts.isExportDeclaration(n) && n.isTypeOnly)
        if (!typeSeul) specifieur(n.moduleSpecifier, nomsImportes(n), false)
      } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        specifieur(n.arguments[0], ['default'], true)
      }
      ts.forEachChild(n, visiter)
    }
    visiter(sf)
    let texte = source
    for (const [d, f, v] of remplacements.sort((a, b) => b[0] - a[0])) texte = texte.slice(0, d) + v + texte.slice(f)
    const js = ts.transpileModule(texte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: rel }).outputText
    fs.writeFileSync(fichierSortie, `globalThis.__LV2_VUS?.add(${JSON.stringify(rel)});\n${js}`)
    return url
  }

  const urlsEntrees = {}
  for (const e of entrees) {
    const r = resoudre('@/' + e.replace(/\.(tsx?)$/, ''), 'x') ?? (A.chemin(e) ? e : null)
    if (!r) throw new Error(`entrée introuvable dans l'arbre : ${e}`)
    urlsEntrees[e] = traiter(r)
  }
  // Modules neutres, écrits une fois tous les noms connus.
  fs.mkdirSync(path.join(sortie, '__stubs__'), { recursive: true })
  fs.mkdirSync(path.join(sortie, '__manquants__'), { recursive: true })
  const neutre = "const neutre = new Proxy(function () {}, { get: (t, k) => (k === 'then' || k === Symbol.toPrimitive ? undefined : neutre), apply: () => null, construct: () => ({}) })\n"
  for (const [spec, noms] of stubsNoms) {
    let corps
    if (STUBS_NEXT[spec]) corps = STUBS_NEXT[spec]
    else if (/^next\/font\//.test(spec)) corps = police + [...noms].filter((n) => n !== 'default').map((n) => `export const ${n} = () => ({ className: 'police', variable: 'police-var', style: { fontFamily: 'police' } })`).join('\n') + '\n'
    else corps = neutre + [...noms].filter((n) => n !== 'default' && /^[A-Za-z_$][\w$]*$/.test(n)).map((n) => `export const ${n} = neutre`).join('\n') + '\nexport default neutre\n'
    fs.writeFileSync(path.join(sortie, '__stubs__', spec.replace(/[^\w.-]/g, '_') + '.mjs'), corps)
  }
  for (const [rel, noms] of manquants) {
    const corps = "import { createElement, Fragment } from 'react'\nexport default function Transparent({ children, ...p }) { const el = Object.values(p).flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v) => v && typeof v === 'object' && v.$$typeof); const sous = []; for (const v of Object.values(p)) for (const o of Array.isArray(v) ? v : [v]) if (o && typeof o === 'object' && !o.$$typeof) for (const w of Object.values(o)) if (w && typeof w === 'object' && w.$$typeof) sous.push(w); return createElement(Fragment, null, children, ...el, ...sous) }\n"
      + [...noms].filter((n) => n !== 'default' && /^[A-Za-z_$][\w$]*$/.test(n)).map((n) => `export { Transparent as ${n} }`).join('\n') + '\n'
    fs.writeFileSync(path.join(sortie, '__manquants__', rel.replace(/[^\w.-]/g, '_') + '.mjs'), corps.replace('export default function Transparent', 'function Transparent') + 'export default Transparent\n')
  }
  for (const rb of cssAbsents) fs.writeFileSync(path.join(sortie, '__manquants__', rb.replace(/[^\w.-]/g, '_') + '.mjs'), 'export default {}\n')

  /** Les modules statiquement atteints depuis `rel` (lui compris), plus les dynamiques réellement exécutés. */
  const fermeture = (rel, vus = globalThis.__LV2_VUS) => {
    const res = new Set()
    const pile = [rel]
    while (pile.length) {
      const r = pile.pop()
      if (res.has(r) || !traites.has(r)) continue
      res.add(r)
      const t = traites.get(r)
      for (const d of t.deps) pile.push(d)
      for (const d of t.dyn) if (vus?.has(d)) pile.push(d)
    }
    return res
  }
  return {
    sortie, urlsEntrees, traites, feuilles, fermeture, arbre: A,
    stubs: [...stubsRemplaces].sort(),
    manquants: [...manquants.keys()].sort(),
    source: (rel) => traites.get(rel)?.source ?? null,
  }
}

// ── Le rendu ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
let _prerender = null
async function prerenderer() { if (!_prerender) _prerender = (await import('react-dom/static')).prerender; return _prerender }
async function enTexte(flux) {
  const lecteur = flux.getReader(); const dec = new TextDecoder(); let s = ''
  for (;;) { const { done, value } = await lecteur.read(); if (done) break; s += dec.decode(value, { stream: true }) }
  return s + dec.decode()
}
const thenable = (obj) => Object.assign(Promise.resolve(obj), obj)

/** Rend le module `entree` (défaut : sa propre export default). Retourne { html, metadonnees, notFound, erreur, vus }. */
export async function rendre(build, entree, { qs = '', params = {}, chemin = '/', vercelEnv = undefined, exportNomme = null } = {}) {
  const vus = new Set()
  globalThis.__LV2_VUS = globalThis.__LV2_VUS ?? new Set()
  globalThis.__LV2_QS = qs
  globalThis.__LV2_CHEMIN = chemin
  const ancien = process.env.VERCEL_ENV
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = vercelEnv
  const { createElement } = await import('react')
  const prerender = await prerenderer()
  try {
    const mod = await import(build.urlsEntrees[entree])
    const Page = exportNomme ? mod[exportNomme] : mod.default
    if (typeof Page !== 'function') return { erreur: `${entree} n'exporte pas de composant ${exportNomme ?? 'par défaut'}`, html: '', metadonnees: [], vus }
    const sp = Object.fromEntries(new URLSearchParams(qs))
    const props = { params: thenable(params), searchParams: thenable(sp) }
    let metadonnees = []
    try {
      const meta = mod.generateMetadata ? await mod.generateMetadata(props, Promise.resolve({})) : mod.metadata
      metadonnees = chaines(meta)
    } catch (e) { metadonnees = [] }
    let html = ''
    try {
      const { prelude } = await Promise.race([
        prerender(createElement(Page, props), { onError() {} }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('rendu : délai de 60 s dépassé')), 60000)),
      ])
      html = await enTexte(prelude)
    } catch (e) {
      if (e && (e.estNotFound || /NEXT_NOT_FOUND/.test(String(e.message)) || /NEXT_HTTP_ERROR_FALLBACK/.test(String(e.digest)))) return { notFound: true, html: '', metadonnees, vus }
      return { erreur: `${e?.message ?? e}`.split('\n')[0], html: '', metadonnees, vus }
    }
    return { html, metadonnees, vus }
  } finally {
    if (ancien === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = ancien
  }
}
/** Toutes les chaînes d'un objet de métadonnées (titre, description, openGraph…), avec leur chemin. */
function chaines(v, chemin = '', sortie = []) {
  if (typeof v === 'string') { if (chemin && !/(canonical|url|images?|type|locale|siteName|icons?|robots|verification|manifest|metadataBase)/i.test(chemin)) sortie.push({ chemin, texte: v }) }
  else if (Array.isArray(v)) v.forEach((x, i) => chaines(x, `${chemin}[${i}]`, sortie))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) chaines(x, chemin ? `${chemin}.${k}` : k, sortie)
  return sortie
}

// ── L'analyseur HTML en arbre (avec les positions, pour que les mutants agissent sur la structure) ────────────────────────
const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const BRUTS = new Set(['script', 'style', 'textarea', 'title'])
export function analyserHtml(html) {
  const racine = { type: 'el', tag: '#racine', attrs: {}, enfants: [], parent: null, debut: 0, fin: html.length, ouvrantFin: 0 }
  let courant = racine
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+|<)/gi
  let m
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!')) continue
    if (m[1]) {
      const tag = m[1].toLowerCase()
      let n = courant
      while (n && n !== racine && n.tag !== tag) n = n.parent
      if (n && n !== racine) { n.fin = m.index + m[0].length; courant = n.parent }
      continue
    }
    if (m[2]) {
      const tag = m[2].toLowerCase()
      const attrs = {}
      const ra = /([^\s=>/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
      let a
      while ((a = ra.exec(m[3] ?? ''))) attrs[a[1].toLowerCase()] = decoderEntites(a[2] ?? a[3] ?? a[4] ?? '')
      const el = { type: 'el', tag, attrs, enfants: [], parent: courant, debut: m.index, fin: m.index + m[0].length, ouvrantFin: m.index + m[0].length }
      courant.enfants.push(el)
      if (BRUTS.has(tag) && !m[4]) {
        const fermeture = new RegExp(`</${tag}\\s*>`, 'i')
        fermeture.lastIndex = 0
        const reste = html.slice(re.lastIndex)
        const f = reste.search(fermeture)
        const brut = f < 0 ? reste : reste.slice(0, f)
        if (brut) el.enfants.push({ type: 'texte', texte: tag === 'script' || tag === 'style' ? brut : decoderEntites(brut), parent: el, brut: true, debut: re.lastIndex, fin: re.lastIndex + brut.length })
        const longueur = f < 0 ? reste.length : f + reste.slice(f).match(fermeture)[0].length
        re.lastIndex += longueur
        el.fin = re.lastIndex
      } else if (!VIDES.has(tag) && !m[4]) courant = el
      continue
    }
    const t = m[5]
    if (t) courant.enfants.push({ type: 'texte', texte: decoderEntites(t), parent: courant, debut: m.index, fin: m.index + t.length })
  }
  return racine
}
export function* descendants(n) { for (const e of n.enfants ?? []) { yield e; if (e.type === 'el') yield* descendants(e) } }
export const elements = (n, pred = () => true) => [...descendants(n)].filter((e) => e.type === 'el' && pred(e))
export const classesDe = (e) => (e.attrs?.class ?? '').split(/\s+/).filter(Boolean)
export const ancetres = (n) => { const l = []; for (let p = n.parent; p; p = p.parent) l.push(p); return l }
const HORS_TEXTE = new Set(['script', 'style', 'template', 'head', 'title', 'noscript'])
const EN_LIGNE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'del', 'ins', 'strike', 'font', 'svg', 'path'])
/** Texte visible d'un nœud (descendants compris), `br` en espace, aucun attribut. */
export function texteVisible(n) {
  if (n.type === 'texte') return n.texte
  if (HORS_TEXTE.has(n.tag)) return ''
  if (n.tag === 'br') return ' '
  return (n.enfants ?? []).map(texteVisible).join(n.tag && !EN_LIGNE.has(n.tag) ? ' ' : '')
}
export const nettoyer = (t) => normaliser(t).replace(/\s+/g, ' ').trim()
/** Les blocs de texte d'une page : les éléments en ligne se joignent, tout le reste coupe. */
export function blocsDeTexte(racine) {
  const blocs = []
  const tete = { t: '', noeuds: [], parent: racine }
  blocs.push(tete)
  // `ref.c` est le bloc courant : le texte qui suit un bloc enfant ouvre un autre bloc, il ne rejoint pas celui du parent.
  const aller = (n, ref) => {
    if (n.type === 'texte') { ref.c.t += n.texte; ref.c.noeuds.push(n); return }
    if (HORS_TEXTE.has(n.tag)) return
    if (n.tag === 'br') { ref.c.t += ' '; return }
    if (EN_LIGNE.has(n.tag)) { for (const e of n.enfants) aller(e, ref); return }
    const avant = ref.c
    const nouveau = { t: '', noeuds: [], parent: n }
    blocs.push(nouveau); ref.c = nouveau
    for (const e of n.enfants) aller(e, ref)
    const apres = { t: '', noeuds: [], parent: avant.parent }
    blocs.push(apres); ref.c = apres
  }
  aller(racine, { c: tete })
  return blocs.map((b) => ({ ...b, t: nettoyer(b.t) })).filter((b) => b.t)
}
export const phrasesDe = (texte) => texte.split(/(?<=[.!?…])["»”’)]*\s+(?=\S)/u).map((p) => p.trim()).filter(Boolean)

// ── Les unités de texte d'une page rendue ──────────────────────────────────────────────────────────────────────────────────
const ATTRS_TEXTE = ['alt', 'title', 'aria-label', 'placeholder']
export function analyserPage({ html, metadonnees = [], choisirPortee = null }) {
  const racine = analyserHtml(html)
  const portee_ = (choisirPortee && choisirPortee(racine)) || racine
  const blocs = blocsDeTexte(portee_)
  const unites = []
  for (const b of blocs) for (const p of phrasesDe(b.t)) unites.push({ t: p, origine: 'visible', bloc: b })
  // Les éléments en ligne collés l'un à l'autre (des puces absolues : « …prêtRelance J+2 planifiéeFacture… ») ne se lisent pas dans le texte du bloc :
  // chacun est aussi une unité à lui. `inline: true` : à ne pas confondre avec une phrase de la page (LV-18 et LV-12 lisent les blocs).
  const inlines = []
  for (const e of elements(portee_, (x) => EN_LIGNE.has(x.tag) && !['svg', 'path', 'wbr'].includes(x.tag))) {
    const t = nettoyer(texteVisible(e))
    if (t) { inlines.push({ t, parent: e }); for (const p of phrasesDe(t)) unites.push({ t: p, origine: 'visible', inline: true, noeud: e }) }
  }
  const attributs = []
  for (const e of elements(portee_)) for (const a of ATTRS_TEXTE) if (e.attrs[a]) { const t = nettoyer(e.attrs[a]); if (t) { attributs.push({ t, origine: a, noeud: e }); unites.push({ t, origine: a, noeud: e }) } }
  const jsonld = []
  for (const s of elements(portee_, (e) => e.tag === 'script' && /ld\+json/i.test(e.attrs.type ?? ''))) {
    const brut = s.enfants.map((x) => x.texte).join('')
    let obj = null
    try { obj = JSON.parse(brut) } catch { obj = null }
    jsonld.push({ brut, obj })
    const chaines = []
    ;(function parcourir(v) { if (typeof v === 'string') chaines.push(v); else if (Array.isArray(v)) v.forEach(parcourir); else if (v && typeof v === 'object') Object.values(v).forEach(parcourir) })(obj ?? brut)
    for (const c of chaines) unites.push({ t: nettoyer(c), origine: 'json-ld', noeud: s })
  }
  const metas = []
  for (const m of metadonnees) { const t = nettoyer(m.texte); if (t) { metas.push({ ...m, t }); unites.push({ t, origine: `métadonnées (${m.chemin})` }) } }
  const toutes = elements(racine)
  return {
    html, racine, portee: portee_, blocs, inlines, unites, attributs, jsonld, metas,
    classes: new Set(toutes.flatMap(classesDe)), ids: new Set(toutes.map((e) => e.attrs.id).filter(Boolean)),
    texteVisible: nettoyer(texteVisible(portee_)),
  }
}

// ── Les feuilles de style (postcss) ────────────────────────────────────────────────────────────────────────────────────────
export function analyserCss(texte, fichier) {
  const postcss = require('postcss')
  const racine = postcss.parse(texte.replace(/\r\n/g, '\n'), { from: fichier })
  const regles = []
  let ordre = 0
  racine.walkRules((r) => {
    if (r.parent?.type === 'atrule' && /keyframes/i.test(r.parent.name)) return
    const decls = []
    r.each((d) => { if (d.type === 'decl') decls.push({ prop: d.prop, valeur: d.value, ligne: d.source?.start?.line ?? r.source?.start?.line ?? 0 }) })
    regles.push({ fichier, ligne: r.source?.start?.line ?? 0, selecteurs: r.selectors ?? [r.selector], decls, ordre: ordre++, media: r.parent?.type === 'atrule' ? `@${r.parent.name} ${r.parent.params}` : null })
  })
  return regles
}

// ── Petites aides communes ────────────────────────────────────────────────────────────────────────────────────────────────
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12)
export function nettoyerTravail() { fs.rmSync(TRAVAIL, { recursive: true, force: true }) }
export function ligneDe(texte, index) { return texte.slice(0, index).split('\n').length }
