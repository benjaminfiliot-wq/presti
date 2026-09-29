// scripts/domaine-sans-site-qa.mjs — le juge de la fiche 025-19 (« domaine sans site et tableau de bord »), écrit par Claude Code
// le 25/09 à partir de la relecture à froid avant mise en ligne (.orchestre/preuves/025-relectures/revue-avant-mise-en-ligne-2026-09-25.md,
// défauts D11 et D12). Les verdicts sont à lui : un exécutant ne le modifie pas.
//
// Usage :
//   node scripts/domaine-sans-site-qa.mjs                    DS-1 à DS-6 sur le dépôt
//   node scripts/domaine-sans-site-qa.mjs --racine=<dossier> la même chose, tout lu depuis <dossier>
//   node scripts/domaine-sans-site-qa.mjs --temoin           DS-1 à DS-6 sur le témoin « après » (voir plus bas)
//   … --critere=DS-1,DS-3                                    seulement ces critères
// Sortie : « PASS|FAIL <id> — … » par critère, puis « domaine-sans-site-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert,
// 1 sinon, 2 si l'appel est invalide. Léger (ni navigateur ni build : TypeScript transpile les fichiers, React rend côté serveur).
// N'écrit que sous .orchestre/travail/domaine-sans-site-qa/. Aucun appel réseau : Supabase et PostgREST sont simulés.
//
// Le faux monde (une base en mémoire, la même pour tous les critères) :
//   A martin-plomberie-025   domaine vérifié martin-plomberie.example, SANS site (site_active false), aucune commande
//   B atelier-actif-025      domaine vérifié atelier-actif.example, site publié (site_active true)
//   C genere-essai-025       domaine vérifié genere-essai.example, sans site historique, une commande EN LIGNE sur ce domaine
//   D sans-domaine-025       ni domaine ni site
//   E actif-sans-domaine-025 site publié, sans domaine
//   F commande-sans-domaine-025  sans site historique, une commande EN LIGNE sans domaine (servie sous /site-genere/<id>)
//
// Critères :
//   DS-1 (D11) la racine d'un domaine vérifié. <racine>/middleware.ts, transpilé et appelé avec un faux hôte (fetch → PostgREST
//        simulé : filtres eq, is, in, neq…, colonnes du select projetées), puis, quand il mène à /site/<slug>,
//        <racine>/app/site/[slug]/page.tsx appelée comme par Next (headers(), redirect(), notFound() simulés, composants de app/
//        remplacés, JSX rendu en objets) ; une redirection est suivie (middleware compris), 5 fois au plus. Attendu :
//        https://martin-plomberie.example/ et https://www.martin-plomberie.example/ → la page de contact de A (/p/martin-plomberie-025),
//        jamais « Site non publié » ; https://martin-plomberie.example/demande → la page de contact ; https://atelier-actif.example/ →
//        le site de B (son nom rendu, pas « Site non publié ») ; https://genere-essai.example/ → le site généré (/site-genere/…).
//   DS-2 (D11) /site/<slug> sur prestiapp.fr : D → la page de contact de D ; A (domaine vérifié) → sa page de contact ; F → son site
//        généré (/site-genere/<id>/) ; E → son site ; B → son site (sur son domaine). Jamais « Site non publié ».
//   DS-3 (D11) le badge du domaine dans /profil dit ce que la racine sert : <racine>/lib/surfaceDomaine.ts exporte
//        surfaceDuDomaine({ siteActif, commandeEnLigne }) → 'site' | 'site_genere' | 'contact' et libelleDomaineActif(surface),
//        jugés sur les quatre cas (le libellé de 'contact' parle de la page de contact, pas du site ; ceux de 'site' et 'site_genere'
//        parlent du site) ; <racine>/app/api/domain/route.ts (GET, transpilée : session, Vercel et Supabase simulés) rend
//        `surface` juste pour A, B et C ; <racine>/app/profil/page.tsx n'écrit plus « votre site est servi sur ce domaine » en dur
//        et affiche dans son badge libelleDomaineActif(…) d'une valeur qui n'est pas une constante.
//   DS-4 (D11) Paramètres → Profil : <racine>/app/parametres/SectionProfil.tsx rendue par React côté serveur (react-dom/server du
//        dépôt) : sans site publié (site_active false), aucune ligne « Site » ni lien vers l'adresse du site ; avec un site, la ligne
//        et son lien y sont.
//   DS-5 (D11) l'infobulle profil.domaine (<racine>/lib/aide.ts, chargée) dit que le domaine sert le site ou, sans site, la page de
//        contact. Mutation : l'infobulle d'aujourd'hui est refusée.
//   DS-6 (D12) le tableau de bord ne dit plus « automatique(ment) » de réponses que l'artisan a pu valider lui-même (la base ne
//        distingue pas une réponse partie seule d'une réponse validée : type reponse_auto dans les deux cas) : aucun texte ni chaîne
//        de <racine>/app/dashboard/page.tsx (commentaires ôtés, arbre syntaxique) et aucun texte de l'article « dashboard » de
//        <racine>/lib/aide.ts (chargé) ne contient « automati ». Mutation : « envoyées automatiquement » est vu.
//
// --temoin : tous les critères sur .orchestre/travail/domaine-sans-site-qa/temoin/ : lib/, middleware.ts, app/site/[slug]/,
//   app/api/domain/, app/profil/, app/parametres/, app/dashboard/ et tsconfig.json copiés du dépôt, puis
//   scripts/fixtures/025/temoins/domaine-sans-site-qa/ superposé (suffixe .temoin retiré) : des copies corrigées de ces fichiers.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire, builtinModules } from 'node:module'
import { R, FIXTURES, TRAVAIL, lireOuNull, fichierNonVide, preparerTemoin, lireOptionsOuQuitter, creerSortie, listerFichiers } from './fixtures/025/commun.mjs'

export const JUGE = 'domaine-sans-site-qa'
export const IDS = ['DS-1', 'DS-2', 'DS-3', 'DS-4', 'DS-5', 'DS-6']
const requireDepot = createRequire(import.meta.url)
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const muet = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : k === Symbol.toPrimitive ? () => '' : muet()), apply: () => muet(), construct: () => muet() })

// ── Le faux monde ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ID = { A: '00000000-0000-4000-8000-0000000019a1', B: '00000000-0000-4000-8000-0000000019b2', C: '00000000-0000-4000-8000-0000000019c3', D: '00000000-0000-4000-8000-0000000019d4', E: '00000000-0000-4000-8000-0000000019e5', F: '00000000-0000-4000-8000-0000000019f6' }
const CMD = { C: '00000000-0000-4000-8000-0000000019cc', F: '00000000-0000-4000-8000-0000000019ff' }
function monde() {
  const art = (x) => ({ metier: 'plombier', ville: 'Lyon', bio: null, services: [], zone_intervention: 'Lyon', logo_url: null, photo_url: null, horaires: null, accent: null, realisations: [], reseaux: {}, tel_public: null, email_public: null, site_tier: 1, plateforme_active: true, site_contenu: null, site_contact_integre: null, plan: 'essentiel', theme: 'atelier', site_seo: true, site_layout: null, site_style: null, domaine: null, domaine_verifie: false, avant_apres: [], slugs_anciens: [], leads_pause: false, suppression_demandee_le: null, email: null, ...x })
  return {
    artisans: [
      art({ id: ID.A, slug: 'martin-plomberie-025', nom: 'Martin Plomberie Essai', site_active: false, domaine: 'martin-plomberie.example', domaine_verifie: true }),
      art({ id: ID.B, slug: 'atelier-actif-025', nom: 'Atelier Actif Essai', site_active: true, domaine: 'atelier-actif.example', domaine_verifie: true }),
      art({ id: ID.C, slug: 'genere-essai-025', nom: 'Génère Essai', site_active: false, domaine: 'genere-essai.example', domaine_verifie: true }),
      art({ id: ID.D, slug: 'sans-domaine-025', nom: 'Sans Domaine Essai', site_active: false }),
      art({ id: ID.E, slug: 'actif-sans-domaine-025', nom: 'Actif Sans Domaine Essai', site_active: true }),
      art({ id: ID.F, slug: 'commande-sans-domaine-025', nom: 'Commande Sans Domaine Essai', site_active: false }),
    ],
    sites_commandes: [
      { id: CMD.C, artisan_id: ID.C, etat: 'en_ligne', domaine: 'genere-essai.example', domaine_mode: 'existant' },
      { id: CMD.F, artisan_id: ID.F, etat: 'en_ligne', domaine: null, domaine_mode: 'aucun' },
    ],
    leads: [], messages: [],
  }
}
// un filtre PostgREST ou supabase-js
function filtre(op, col, val) {
  const v = (r) => r[col]
  const norm = (x) => (x === 'true' ? true : x === 'false' ? false : x === 'null' ? null : x)
  switch (op) {
    case 'eq': return (r) => String(v(r)) === String(val) && v(r) !== null && v(r) !== undefined
    case 'neq': return (r) => String(v(r)) !== String(val)
    case 'is': return (r) => (v(r) ?? null) === norm(val)
    case 'in': { const l = Array.isArray(val) ? val.map(String) : String(val).replace(/^\(|\)$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')); return (r) => l.includes(String(v(r))) }
    case 'gt': return (r) => v(r) > val
    case 'gte': return (r) => v(r) >= val
    case 'lt': return (r) => v(r) < val
    case 'lte': return (r) => v(r) <= val
    case 'like': case 'ilike': { const re = new RegExp(`^${String(val).split('').map((c) => (c === '%' || c === '*' ? '.*' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`, op === 'ilike' ? 'i' : ''); return (r) => typeof v(r) === 'string' && re.test(v(r)) }
    default: throw new Error(`filtre « ${op} » non simulé`)
  }
}
const projeter = (ligne, colonnes) => {
  if (!colonnes || String(colonnes).trim() === '*') return { ...ligne }
  const o = {}
  for (const c of String(colonnes).split(',').map((x) => x.trim()).filter(Boolean)) { const [nom, alias] = c.includes(':') ? c.split(':').reverse() : [c, c]; o[alias.trim()] = ligne[nom.trim()] === undefined ? null : ligne[nom.trim()] }
  return o
}
function fauxSupabase(base) {
  class Requete {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.val = null; this.cols = '*'; this.unique = null; this.lim = null }
    select(c) { this.cols = c ?? '*'; return this }
    insert(v) { this.op = 'insert'; this.val = v; return this }
    update(v) { this.op = 'update'; this.val = v; return this }
    upsert(v) { this.op = 'insert'; this.val = v; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.f.push(filtre('eq', c, v)); return this }
    neq(c, v) { this.f.push(filtre('neq', c, v)); return this }
    is(c, v) { this.f.push(filtre('is', c, v === null ? 'null' : String(v))); return this }
    in(c, v) { this.f.push(filtre('in', c, v)); return this }
    gt(c, v) { this.f.push(filtre('gt', c, v)); return this }
    gte(c, v) { this.f.push(filtre('gte', c, v)); return this }
    lt(c, v) { this.f.push(filtre('lt', c, v)); return this }
    lte(c, v) { this.f.push(filtre('lte', c, v)); return this }
    like(c, v) { this.f.push(filtre('like', c, v)); return this }
    ilike(c, v) { this.f.push(filtre('ilike', c, v)); return this }
    not(c, op, v) { const g = filtre(op, c, v); this.f.push((r) => !g(r)); return this }
    match(o) { for (const [c, v] of Object.entries(o)) this.eq(c, v); return this }
    order() { return this }
    range() { return this }
    limit(n) { this.lim = n; return this }
    maybeSingle() { this.unique = 'maybe'; return this }
    single() { this.unique = 'single'; return this }
    then(ok, ko) {
      return Promise.resolve().then(() => {
        const t = base[this.t] || (base[this.t] = [])
        let l
        if (this.op === 'insert') { l = (Array.isArray(this.val) ? this.val : [this.val]).map((x) => ({ ...x })); t.push(...l) }
        else { l = t.filter((r) => this.f.every((g) => g(r))); if (this.op === 'update') for (const r of l) Object.assign(r, this.val); if (this.op === 'delete') base[this.t] = t.filter((r) => !l.includes(r)) }
        if (this.lim !== null) l = l.slice(0, this.lim)
        l = JSON.parse(JSON.stringify(l.map((r) => projeter(r, this.cols))))
        if (this.unique === 'maybe') return l.length > 1 ? { data: null, error: { message: 'plusieurs lignes' } } : { data: l[0] ?? null, error: null }
        if (this.unique === 'single') return l.length === 1 ? { data: l[0], error: null } : { data: null, error: { message: `${l.length} ligne(s)` } }
        return { data: l, error: null, count: l.length }
      }).then(ok, ko)
    }
  }
  return { from: (t) => new Requete(t), rpc: async () => ({ data: null, error: { message: 'rpc non simulée' } }), auth: { getUser: async () => ({ data: { user: null } }) }, storage: { from: () => muet() } }
}
/** fetch vers PostgREST simulé : GET <base>/rest/v1/<table>?col=op.val&select=…&limit=n */
function fauxFetch(base, journal) {
  return async (entree) => {
    const u = new URL(String(entree))
    journal.push(u.pathname + u.search)
    const m = /^\/rest\/v1\/([\w]+)$/.exec(u.pathname)
    if (!m) return new Response(JSON.stringify({ message: 'non simulé' }), { status: 404 })
    let l = (base[m[1]] || []).slice()
    let cols = '*', lim = null
    for (const [k, v] of u.searchParams) {
      if (k === 'select') { cols = v; continue }
      if (k === 'limit') { lim = Number(v); continue }
      if (['order', 'offset'].includes(k)) continue
      const neg = v.startsWith('not.')
      const [op, ...reste] = (neg ? v.slice(4) : v).split('.')
      const g = filtre(op, k, reste.join('.'))
      l = l.filter((r) => (neg ? !g(r) : g(r)))
    }
    if (lim !== null) l = l.slice(0, lim)
    return new Response(JSON.stringify(l.map((r) => projeter(r, cols))), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

// ── Le chargeur : TypeScript transpilé, imports simulés ─────────────────────────────────────────────────────────────────
const RUNTIME_OBJETS = { jsx: (type, props) => ({ type, props: props || {} }), jsxs: (type, props) => ({ type, props: props || {} }), Fragment: 'Fragment' }
/**
 * Charge <fichier> de <racine>. stubs : { 'spécificateur': module } ; jsx : 'objets' (JSX rendu en objets, React simulé) ou 'react'
 * (le vrai React du dépôt) ; appStub : un import qui mène sous <racine>/app/ (hors le fichier chargé) devient un composant vide.
 */
async function charger({ racine, fichier, stubs = {}, jsx = 'objets', appStub = true, env = {}, fetch: fetchSimule = null }) {
  const ts = (await import('typescript')).default
  const caches = new Map()
  const app = path.join(racine, 'app') + path.sep
  const composantVide = Object.assign(() => null, { __stub: true })
  const resoudre = (spec, depuis) => {
    const cands = spec.startsWith('@/') ? [path.join(racine, spec.slice(2))] : spec.startsWith('.') ? [path.resolve(path.dirname(depuis), spec)] : []
    for (const c of cands) for (const e of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']) if (fs.existsSync(c + e) && fs.statSync(c + e).isFile()) return c + e
    return null
  }
  const chargerFichier = (f) => {
    if (caches.has(f)) return caches.get(f).exports
    const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    caches.set(f, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || builtinModules.includes(spec)) return requireDepot(spec)
      if (spec === 'react/jsx-runtime' || spec === 'react/jsx-dev-runtime') return jsx === 'react' ? requireDepot('react/jsx-runtime') : RUNTIME_OBJETS
      if (spec === 'react') return jsx === 'react' ? requireDepot('react') : { Fragment: 'Fragment', createElement: (t, p, ...c) => ({ type: t, props: { ...(p || {}), children: c } }), useState: (x) => [x, () => {}], useEffect: () => {} }
      const cible = resoudre(spec, f)
      if (cible) return appStub && cible.startsWith(app) && cible !== path.resolve(fichier) ? { __esModule: true, default: composantVide } : chargerFichier(cible)
      // un composant de app/ absent de l'arbre jugé (le témoin ne copie pas tout app/) : remplacé comme les autres
      if (appStub && (spec.startsWith('@/app/') || (spec.startsWith('.') && path.resolve(path.dirname(f), spec).startsWith(app)))) return { __esModule: true, default: composantVide }
      if (spec.startsWith('.') || spec.startsWith('@/')) throw new Error(`${rel(f)} importe « ${spec} », introuvable sous ${rel(racine)}`)
      return muet()
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'process', 'fetch', js)(module.exports, req, module, f, path.dirname(f), { env }, fetchSimule || globalThis.fetch)
    return module.exports
  }
  if (!fichierNonVide(fichier)) throw new Error(`${rel(fichier)} absent ou vide`)
  return chargerFichier(path.resolve(fichier))
}
const textes = (n, out = []) => {
  if (n === null || n === undefined || typeof n === 'boolean') return out
  if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return out }
  if (Array.isArray(n)) { for (const x of n) textes(x, out); return out }
  if (typeof n === 'object' && n.props) textes(n.props.children, out)
  return out
}

// ── DS-1, DS-2 : la chaîne middleware → page ────────────────────────────────────────────────────────────────────────────────
async function monterChaine(racine) {
  const base = monde(), journal = []
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://supabase-simule.invalid', SUPABASE_SERVICE_ROLE_KEY: 'cle-simulee' }
  const Rep = { next: () => ({ type: 'next' }), rewrite: (u) => ({ type: 'rewrite', url: String(u) }), redirect: (u, s = 307) => ({ type: 'redirect', url: String(u), status: s }), json: (b, i = {}) => ({ type: 'json', corps: b, status: i.status ?? 200 }) }
  // Next 16 (fiche 026-008) : le fichier s'appelle proxy.ts (export `proxy`) une fois migré ; un middleware.ts présent (dépôt d'avant, ou copie témoin
  // corrigée) passe d'abord. Aucun des deux : « chaîne non montée », jamais un critère vert.
  const fichierMw = fs.existsSync(path.join(racine, 'middleware.ts')) ? 'middleware.ts' : 'proxy.ts'
  const nomMw = fichierMw === 'proxy.ts' ? 'proxy' : 'middleware'
  const mw = await charger({ racine, fichier: path.join(racine, fichierMw), stubs: { 'next/server': { NextResponse: Rep } }, env, fetch: fauxFetch(base, journal) })
  if (typeof mw[nomMw] !== 'function') throw new Error(`${fichierMw} n’exporte pas ${nomMw}`)
  const ctx = { hote: '' }
  const nav = (quoi) => (u) => { const e = new Error(`${quoi} ${u ?? ''}`); e.__nav = quoi; e.url = u; throw e }
  const page = await charger({
    racine, fichier: path.join(racine, 'app', 'site', '[slug]', 'page.tsx'), env,
    stubs: {
      'next/headers': { headers: async () => ({ get: (k) => (String(k).toLowerCase() === 'host' ? ctx.hote : null) }) },
      'next/navigation': { notFound: nav('notFound'), redirect: nav('redirect'), permanentRedirect: nav('permanentRedirect') },
      '@/lib/supabaseAdmin': { supabaseAdmin: fauxSupabase(base) },
      'next/image': { __esModule: true, default: Object.assign(() => null, { __stub: true }) },
    },
  })
  if (typeof page.default !== 'function') throw new Error('app/site/[slug]/page.tsx n’exporte pas de page')
  async function suivre(url0) {
    let url = url0
    const etapes = []
    for (let i = 0; i < 6; i++) {
      const u = new URL(url)
      const nextUrl = Object.assign(new URL(u.href), { clone() { return new URL(this.href) } })
      const r = await mw[nomMw]({ headers: { get: (k) => (String(k).toLowerCase() === 'host' ? u.host : null) }, nextUrl, url: u.href })
      if (r?.type === 'redirect') { etapes.push(`middleware → ${r.url}`); url = new URL(r.url, url).href; continue }
      const interne = r?.type === 'rewrite' ? new URL(r.url, url).pathname : u.pathname
      if (r?.type === 'rewrite') etapes.push(`réécrit en ${interne}`)
      let m
      if ((m = /^\/p\/([^/]+)\/?$/.exec(interne))) return { fin: 'contact', slug: decodeURIComponent(m[1]), etapes }
      if (/^\/site-genere\/[^/]+/.test(interne)) return { fin: 'site_genere', commande: interne.split('/')[2], etapes }
      if ((m = /^\/site\/([^/]+)\/?$/.exec(interne))) {
        ctx.hote = u.host
        try {
          const jsx = await page.default({ params: Promise.resolve({ slug: decodeURIComponent(m[1]) }) })
          const t = textes(jsx).join(' ')
          return { fin: /Site non publi/i.test(t) ? 'non_publie' : 'site', slug: decodeURIComponent(m[1]), texte: t, etapes }
        } catch (e) {
          if (e && (e.__nav === 'redirect' || e.__nav === 'permanentRedirect')) { etapes.push(`page → ${e.url}`); url = new URL(e.url, url).href; continue }
          if (e && e.__nav === 'notFound') return { fin: '404', etapes }
          throw e
        }
      }
      return { fin: 'autre', interne, etapes }
    }
    return { fin: 'boucle', etapes }
  }
  return { suivre, journal }
}
const NOMS = Object.fromEntries(monde().artisans.map((a) => [a.slug, a.nom]))
const decrire = (r) => `${r.fin}${r.slug ? ` (${r.slug})` : ''}${r.commande ? ` (${r.commande})` : ''}${r.etapes.length ? ` — ${r.etapes.join(', ')}` : ''}`
function attendu(r, a) {
  if (a.fin === 'contact') return r.fin === 'contact' && r.slug === a.slug
  if (a.fin === 'site') return r.fin === 'site' && r.slug === a.slug && r.texte.includes(NOMS[a.slug])
  if (a.fin === 'site_genere') return r.fin === 'site_genere' && r.commande === a.commande
  return false
}
async function jugerChaine(racine, cas) {
  const echecs = [], faits = []
  let ch
  try { ch = await monterChaine(racine) } catch (e) { return { ok: false, echecs: [`chaîne non montée : ${premiereLigne(e)}`], faits } }
  for (const c of cas) {
    let r
    try { r = await ch.suivre(c.url) } catch (e) { echecs.push(`${c.url} : interrompu (${premiereLigne(e)})`); continue }
    const redirections = r.etapes.filter((x) => /→ /.test(x)).length
    if (!attendu(r, c.attendu)) echecs.push(`${c.url} → ${decrire(r)} ; attendu : ${c.attendu.fin} ${c.attendu.slug || c.attendu.commande || ''}${r.fin === 'non_publie' ? ' (« Site non publié »)' : ''}`)
    else if (redirections > 2) echecs.push(`${c.url} → ${decrire(r)} : ${redirections} redirections (2 au plus)`)
    else faits.push(`${c.url.replace(/^https:\/\//, '')} → ${c.attendu.fin}`)
  }
  return { ok: !echecs.length, echecs, faits }
}
const CAS_DOMAINE = [
  { url: 'https://martin-plomberie.example/', attendu: { fin: 'contact', slug: 'martin-plomberie-025' } },
  { url: 'https://www.martin-plomberie.example/', attendu: { fin: 'contact', slug: 'martin-plomberie-025' } },
  { url: 'https://martin-plomberie.example/demande', attendu: { fin: 'contact', slug: 'martin-plomberie-025' } },
  { url: 'https://atelier-actif.example/', attendu: { fin: 'site', slug: 'atelier-actif-025' } },
  { url: 'https://genere-essai.example/', attendu: { fin: 'site_genere', commande: CMD.C } },
]
const CAS_PRESTI = [
  { url: 'https://prestiapp.fr/site/sans-domaine-025', attendu: { fin: 'contact', slug: 'sans-domaine-025' } },
  { url: 'https://prestiapp.fr/site/martin-plomberie-025', attendu: { fin: 'contact', slug: 'martin-plomberie-025' } },
  { url: 'https://prestiapp.fr/site/commande-sans-domaine-025', attendu: { fin: 'site_genere', commande: CMD.F } },
  { url: 'https://prestiapp.fr/site/actif-sans-domaine-025', attendu: { fin: 'site', slug: 'actif-sans-domaine-025' } },
  { url: 'https://prestiapp.fr/site/atelier-actif-025', attendu: { fin: 'site', slug: 'atelier-actif-025' } },
]

// ── DS-3 : le badge du domaine ──────────────────────────────────────────────────────────────────────────────────────────────
const RE_CONTACT = /page de contact/i
async function jugerBadge(racine) {
  const echecs = [], faits = []
  const fSurface = path.join(racine, 'lib', 'surfaceDomaine.ts')
  let sd = null
  try { sd = await charger({ racine, fichier: fSurface }) } catch (e) { echecs.push(`${rel(fSurface)} : ${premiereLigne(e)}`) }
  if (sd) {
    if (typeof sd.surfaceDuDomaine !== 'function' || typeof sd.libelleDomaineActif !== 'function') echecs.push('lib/surfaceDomaine.ts n’exporte pas surfaceDuDomaine et libelleDomaineActif')
    else {
      for (const [p, s] of [[{ siteActif: false, commandeEnLigne: false }, 'contact'], [{ siteActif: true, commandeEnLigne: false }, 'site'], [{ siteActif: false, commandeEnLigne: true }, 'site_genere'], [{ siteActif: true, commandeEnLigne: true }, 'site_genere']]) {
        const x = sd.surfaceDuDomaine(p)
        if (x !== s) echecs.push(`surfaceDuDomaine(${JSON.stringify(p)}) = ${JSON.stringify(x)}, « ${s} » attendu (le middleware sert d’abord la commande en ligne)`)
      }
      const lc = String(sd.libelleDomaineActif('contact') ?? ''), ls = String(sd.libelleDomaineActif('site') ?? ''), lg = String(sd.libelleDomaineActif('site_genere') ?? '')
      if (!RE_CONTACT.test(lc) || /votre site/i.test(lc)) echecs.push(`libelleDomaineActif('contact') = « ${lc} » : la page de contact attendue, pas le site`)
      for (const [k, l] of [['site', ls], ['site_genere', lg]]) if (!/site/i.test(l) || RE_CONTACT.test(l)) echecs.push(`libelleDomaineActif('${k}') = « ${l} » : le site attendu`)
      if (!echecs.length) faits.push(`lib/surfaceDomaine.ts : 4 cas justes ; « ${court(lc, 70)} » / « ${court(ls, 70)} »`)
    }
  }
  // la route /api/domain rend la surface
  const base = monde()
  const fRoute = path.join(racine, 'app', 'api', 'domain', 'route.ts')
  try {
    let uid = ID.A
    const Rep = class { static json(b, i = {}) { return { corps: b, status: i.status ?? 200 } } }
    const route = await charger({
      racine, fichier: fRoute, appStub: false,
      stubs: {
        'next/server': { NextResponse: Rep },
        '@/lib/supabaseAdmin': { supabaseAdmin: fauxSupabase(base) },
        '@/lib/authArtisan': { getUserRevocable: async () => ({ data: { user: { id: uid } }, error: null }) },
        '@/lib/vercelDomains': { getStatus: async () => ({ ok: true, verified: true, served: true, records: [] }), addDomain: async () => ({ ok: true, served: true }), removeDomain: async () => ({}), normalizeDomain: (d) => String(d || '').toLowerCase() },
      },
    })
    const d = []
    for (const [cle, attendue] of [['A', 'contact'], ['B', 'site'], ['C', 'site_genere']]) {
      uid = ID[cle]
      const rep = await route.GET({ headers: { get: (k) => (String(k).toLowerCase() === 'authorization' ? 'Bearer jeton-essai' : null) }, url: 'https://prestiapp.fr/api/domain' })
      const s = rep?.corps?.surface
      if (s !== attendue) d.push(`GET /api/domain pour ${cle} (${monde().artisans.find((a) => a.id === ID[cle]).slug}) rend surface ${JSON.stringify(s)}, « ${attendue} » attendu`)
    }
    if (d.length) echecs.push(...d); else faits.push('GET /api/domain : surface juste pour A (contact), B (site), C (site_genere)')
  } catch (e) { echecs.push(`${rel(fRoute)} : ${premiereLigne(e)}`) }
  // /profil : le badge
  const fProfil = path.join(racine, 'app', 'profil', 'page.tsx')
  const src = lireOuNull(fProfil)?.toString('utf8') || ''
  const ts = (await import('typescript')).default
  const sf = ts.createSourceFile('page.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const litteraux = []
  const visite = (n) => { if (ts.isStringLiteralLike(n) || ts.isJsxText(n)) litteraux.push(n.text); ts.forEachChild(n, visite) }
  visite(sf)
  if (!src) echecs.push(`${rel(fProfil)} absent`)
  const enDur = litteraux.filter((t) => /votre site est servi sur ce domaine/i.test(t))
  if (enDur.length) echecs.push(`app/profil/page.tsx écrit encore en dur « ${court(enDur[0], 70)} »`)
  let appel = null
  const cherche = (n) => { if (appel) return; if (ts.isCallExpression(n) && /(?:^|\.)libelleDomaineActif$/.test(n.expression.getText(sf))) appel = n; ts.forEachChild(n, cherche) }
  cherche(sf)
  if (!appel) echecs.push('app/profil/page.tsx n’appelle pas libelleDomaineActif(…) pour le badge du domaine')
  else {
    const arg = appel.arguments[0]
    if (!arg || ts.isStringLiteralLike(arg)) echecs.push(`libelleDomaineActif(${arg ? arg.getText(sf) : ''}) : une constante, la surface lue (/api/domain) attendue`)
    let dansBadge = false
    for (let p = appel.parent; p; p = p.parent) if (ts.isJsxElement(p) && /dom-badge/.test(p.openingElement.getText(sf))) { dansBadge = true; break }
    if (!dansBadge) echecs.push('libelleDomaineActif(…) n’est pas dans le badge .dom-badge')
    if (!echecs.length) faits.push(`app/profil/page.tsx : badge = ${court(appel.getText(sf), 60)}, plus de texte en dur`)
  }
  return { ok: !echecs.length, echecs, faits }
}

// ── DS-4 : la ligne « Site » de Paramètres → Profil ─────────────────────────────────────────────────────────────────────────
async function jugerSectionProfil(racine) {
  const echecs = [], faits = []
  const f = path.join(racine, 'app', 'parametres', 'SectionProfil.tsx')
  let mod, urls
  try {
    mod = await charger({ racine, fichier: f, jsx: 'react', stubs: { '@/lib/supabaseClient': { supabase: muet() } } })
    urls = await charger({ racine, fichier: path.join(racine, 'lib', 'urls.ts') })
  } catch (e) { return { ok: false, echecs: [`${rel(f)} non chargée : ${premiereLigne(e)}`], faits } }
  const React = requireDepot('react'), { renderToStaticMarkup } = requireDepot('react-dom/server')
  const a = (site) => ({ id: ID.D, nom: 'Sans Domaine Essai', email: null, slug: 'sans-domaine-025', domaine: null, domaine_verifie: false, logo_url: null, plan: 'essentiel', is_founder: false, credits: 0, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, notifications: null, suppression_demandee_le: null, site_active: site, plateforme_active: true, siret: null, tva_num: null, iban: null, forme_juridique: null, adresse: null, code_postal: null, ville: null, assurance_nom: null, assurance_contrat: null, assurance_zone: null, assurance_activites: null, mediateur_nom: null, mediateur_url: null, mention_tva_base: null })
  const Comp = mod.default
  const lienSite = urls.urlSite({ slug: 'sans-domaine-025', domaine: null, domaine_verifie: false })
  const rendu = (site) => renderToStaticMarkup(React.createElement(Comp, { a: a(site), patch: () => {}, signaler: () => {} }))
  let sans, avec
  try { sans = rendu(false); avec = rendu(true) } catch (e) { return { ok: false, echecs: [`rendu impossible : ${premiereLigne(e)}`], faits } }
  const ligne = (html) => /<span>\s*Site\s*<\/span>/i.test(html) || html.includes(`href="${lienSite}"`)
  if (ligne(sans)) echecs.push(`sans site publié (site_active false), la ligne « Site » ou le lien ${lienSite} est rendu`)
  if (!ligne(avec)) echecs.push(`avec un site publié, la ligne « Site » et son lien ${lienSite} ont disparu`)
  if (!/Plateforme/.test(sans)) echecs.push('la ligne « Plateforme » a disparu')
  if (!echecs.length) faits.push(`rendu serveur : sans site, ni ligne « Site » ni lien ${lienSite} ; avec un site, les deux ; « Plateforme » toujours là`)
  return { ok: !echecs.length, echecs, faits }
}

// ── DS-5 : l'infobulle profil.domaine ; DS-6 : le tableau de bord ──────────────────────────────────────────────────────────
const textesObjet = (o) => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(textesObjet) : o && typeof o === 'object' ? Object.values(o).flatMap(textesObjet) : [])
export const defautsBulle = (t) => (RE_CONTACT.test(t) ? [] : [`« ${court(t, 140)} » ne dit pas que, sans site, le domaine sert la page de contact`])
async function jugerBulle(racine) {
  let aide
  try { aide = await charger({ racine, fichier: path.join(racine, 'lib', 'aide.ts') }) } catch (e) { return { ok: false, echecs: [`lib/aide.ts non chargée : ${premiereLigne(e)}`], faits: [] } }
  const b = (aide.INFOBULLES || []).find((x) => x.cle === 'profil.domaine')
  if (!b) return { ok: false, echecs: ['infobulle profil.domaine absente'], faits: [] }
  const texte = [b.label, b.explication, b.exemple].filter(Boolean).join(' ')
  const echecs = defautsBulle(texte)
  const vu = defautsBulle('Votre propre adresse (ex : mon-entreprise.fr) branchée sur votre site, à la place de l’adresse prestiapp.fr — inclus dans toutes les offres.').length > 0
  if (!vu) echecs.push('détecteur aveugle : l’infobulle d’aujourd’hui passe')
  return { ok: !echecs.length, echecs, faits: echecs.length ? [] : [`profil.domaine : « ${court(b.explication, 150)} » ; mutation : l’infobulle d’aujourd’hui → refusée`] }
}
export const RE_AUTO = /automati/i
async function jugerTableauDeBord(racine) {
  const echecs = [], faits = []
  const f = path.join(racine, 'app', 'dashboard', 'page.tsx')
  const src = lireOuNull(f)?.toString('utf8')
  if (!src) return { ok: false, echecs: [`${rel(f)} absent`], faits }
  const ts = (await import('typescript')).default
  const sf = ts.createSourceFile('page.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const ecrits = []
  const visite = (n) => { if (ts.isStringLiteralLike(n) || ts.isJsxText(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) ecrits.push({ t: n.text, l: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 }); ts.forEachChild(n, visite) }
  visite(sf)
  for (const x of ecrits.filter((e) => RE_AUTO.test(e.t))) echecs.push(`app/dashboard/page.tsx:${x.l} « ${court(x.t, 70)} »`)
  let aide
  try { aide = await charger({ racine, fichier: path.join(racine, 'lib', 'aide.ts') }) } catch (e) { echecs.push(`lib/aide.ts non chargée : ${premiereLigne(e)}`) }
  const art = aide && (aide.ARTICLES || []).find((a) => a.id === 'dashboard')
  if (aide && !art) echecs.push('article d’aide « dashboard » absent')
  if (art) for (const t of textesObjet(art).filter((t) => RE_AUTO.test(t))) echecs.push(`article d’aide « dashboard » : « ${court(t, 90)} »`)
  if (!ecrits.length) echecs.push('aucun texte lu dans app/dashboard/page.tsx')
  const vu = RE_AUTO.test('envoyées automatiquement')
  if (!vu) echecs.push('détecteur aveugle')
  if (!echecs.length) faits.push(`${ecrits.length} texte(s) et chaîne(s) du tableau de bord et ${textesObjet(art).length} texte(s) de son article d’aide, sans « automati… » ; mutation : « envoyées automatiquement » → vu`)
  return { ok: !echecs.length, echecs, faits }
}

// ── Témoin ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function construireTemoin() {
  const d = preparerTemoin(JUGE, { copier: ['lib', fs.existsSync(path.join(R, 'proxy.ts')) ? 'proxy.ts' : 'middleware.ts', 'app/site/[slug]', 'app/api/domain', 'app/profil', 'app/parametres', 'app/dashboard', 'tsconfig.json'] })
  let n = 0
  for (const f of listerFichiers(d)) if (f.endsWith('.temoin')) { fs.renameSync(path.join(d, f), path.join(d, f.slice(0, -'.temoin'.length))); n++ }
  if (n < 6) throw new Error(`témoin incomplet : ${n} fichier(s) .temoin dans ${rel(path.join(FIXTURES, 'temoins', JUGE))}`)
  return d
}

// ── Le juge ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  if (o.reel) { console.error('✗ ce juge n’a pas de mode --reel'); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')}`); process.exit(2) }
  const s = creerSortie(JUGE, ids, { racine: o.racine, temoin: o.temoin })
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')}`)
  await s.executer(async () => {
    let racine = o.racine
    if (o.temoin) { racine = construireTemoin(); s.note(`témoin : ${rel(racine)} (copies corrigées de scripts/fixtures/025/temoins/${JUGE}/)`) }
    const rendre = (id, r) => s.verdict(id, r.ok, r.faits.join(' ; '), r.echecs.join(' ; '))
    if (ids.includes('DS-1')) rendre('DS-1', await jugerChaine(racine, CAS_DOMAINE))
    if (ids.includes('DS-2')) rendre('DS-2', await jugerChaine(racine, CAS_PRESTI))
    if (ids.includes('DS-3')) rendre('DS-3', await jugerBadge(racine))
    if (ids.includes('DS-4')) rendre('DS-4', await jugerSectionProfil(racine))
    if (ids.includes('DS-5')) rendre('DS-5', await jugerBulle(racine))
    if (ids.includes('DS-6')) rendre('DS-6', await jugerTableauDeBord(racine))
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
