// scripts/fixtures/026-acquisition/recuperateur-factice.mjs — le réseau des juges de l'acquisition (fiche 026-016).
//
// Un `Recuperateur` du contrat, en mémoire : aucun appel réseau, jamais. Il sert :
//   - `https://recherche-entreprises.api.gouv.fr/search?q=…` : sirene/<q>.json quand q est un SIREN, sinon
//     sirene/nom-<q en minuscules, sans accent, tirets>[-<code_postal>].json ; fichier absent → aucune entreprise ;
//   - `https://data.ademe.fr/data-fair/api/v1/datasets/<liste>/lines` : ademe/page-1.json sans curseur, sinon la page dont
//     `_after` vaut le paramètre `after` (la liste s'écrit par son nom ou par son identifiant, comme le `next` de l'API) ;
//   - `https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[…]&access_token=…` : ads-archive/ads_archive-<page_id>.json
//     (sans access_token : l'erreur 190) ; avec l'option `meta`, ads-archive/<meta>.json s'il existe (une erreur :
//     'erreur-190', 'erreur-1357045', 'erreur-613'), sinon ads-archive/ads_archive-<page_id>-<meta>.json (une variante :
//     'texte-change'). Le dossier est ads-archive/, pas meta/ : meta/** appartient aux jeux d'essai de la vigie (026-069) ;
//   - tout autre hôte : sites/<hôte>/<chemin> (`/` → index.html ; `/x` → x, x.html ou x/index.html ; robots.txt absent →
//     404) ; un hôte sans dossier est une coupure (le nom ne se résout pas). sites/<hôte>/_config.json, facultatif, dit :
//     `https: false` (le port 443 ne répond pas : coupure), `http: false`, et `reponses` par chemin : `{ statut, entetes,
//     fichier }`, `{ redirection, statut }`, `{ taille }` (corps fabriqué à la volée, jamais stocké), `{ coupure: true }`.
// Un fichier JSON qui porte `_reponse: { statut, entetes?, corps? }` est servi tel quel (429, 500…). Les clés qui commencent
// par « _ » ne sont jamais servies.
//
// Le récupérateur ne suit jamais une redirection (il la rend : 3xx et `location`), et une coupure est une exception, comme
// `recuperateurReseau`. Avec `maxOctets`, un corps plus long est coupé et marqué `tronque: true`.
//
// Options de creerRecuperateur({ horloge, surcharges, sequences, coutMs, ademe, meta, exceptions }) :
//   surcharges : { [url]: réponse } ou (url, n) => réponse | null — une page « modifiée après le recensement » ;
//   sequences  : { [url]: [réponse, réponse, …] } consommées dans l'ordre (429 puis 200…), puis le service normal ;
//   coutMs     : chaque requête fait avancer l'horloge de coutMs (RC-4 : 3 s virtuelles par requête) ;
//   ademe      : 'panne' → toute requête à l'ADEME rend ademe/erreur-500.json ;
//   meta       : null, une erreur ('erreur-190'…) rendue à toute requête ads_archive, ou une variante ('texte-change') ;
//   exceptions : hôtes, morceaux d'URL (qui contiennent « / » ou « ? ») ou prédicats (url) => booléen pour lesquels le
//                récupérateur lève une exception qui n'est ni une coupure ni une réponse (RC-5).
// Une réponse s'écrit { statut, entetes, corps } | { coupure: true } | { exception: 'message' } | { taille, statut? }.
// Inspection : `appels` ([{ url, hote, entetes, t, options }]) et `requetesVers(hote)`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURES = path.dirname(fileURLToPath(import.meta.url))
const HOTE_SIRENE = 'recherche-entreprises.api.gouv.fr'
const HOTE_ADEME = 'data.ademe.fr'
const HOTE_META = 'graph.facebook.com'
const TYPES = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml' }

export const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const sansCachees = (o) => {
  if (Array.isArray(o)) return o.map(sansCachees)
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, sansCachees(v)]))
  return o
}
const json = (statut, objet) => ({ statut, entetes: { 'content-type': 'application/json; charset=utf-8' }, corps: JSON.stringify(objet) })
/** Une réponse enregistrée : `_reponse` servi tel quel, sinon l'objet sans ses clés cachées, en 200. */
function reponseDeFichier(f) {
  const o = lireJson(f)
  if (o && o._reponse) {
    const r = o._reponse
    return { statut: r.statut, entetes: { 'content-type': 'application/json; charset=utf-8', ...(r.entetes || {}) }, corps: typeof r.corps === 'string' ? r.corps : JSON.stringify(r.corps ?? {}) }
  }
  return json(200, sansCachees(o))
}

function servirSirene(u) {
  const q = u.searchParams.get('q') ?? ''
  const cp = u.searchParams.get('code_postal')
  const perPage = Number(u.searchParams.get('per_page') || 10)
  const vide = { results: [], total_results: 0, page: 1, per_page: perPage, total_pages: 0 }
  const candidats = /^\d{9}$/.test(q) ? [`${q}.json`] : [cp ? `nom-${slug(q)}-${cp}.json` : null, `nom-${slug(q)}.json`].filter(Boolean)
  for (const nom of candidats) {
    const f = path.join(FIXTURES, 'sirene', nom)
    if (fs.existsSync(f)) return reponseDeFichier(f)
  }
  return json(200, vide)
}

function servirAdeme(u, mode) {
  if (mode === 'panne') return reponseDeFichier(path.join(FIXTURES, 'ademe', 'erreur-500.json'))
  if (!/\/data-fair\/api\/v1\/datasets\/[^/]+\/lines$/.test(u.pathname)) return json(404, { error: 'chemin inconnu du récupérateur factice' })
  const after = u.searchParams.get('after')
  const dossier = path.join(FIXTURES, 'ademe')
  const pages = fs.readdirSync(dossier).filter((f) => /^page-\d+\.json$/.test(f)).sort()
  for (const p of pages) {
    const o = lireJson(path.join(dossier, p))
    if ((o._after ?? null) === (after ?? null)) return json(200, sansCachees(o))
  }
  return json(400, { error: `curseur after inconnu du récupérateur factice : ${after}` })
}

function servirMeta(u, mode) {
  if (!/^\/v\d+\.\d+\/ads_archive$/.test(u.pathname)) return json(404, { error: { message: 'chemin inconnu du récupérateur factice', type: 'GraphMethodException', code: 803 } })
  const dossier = path.join(FIXTURES, 'ads-archive')
  if (mode && fs.existsSync(path.join(dossier, `${mode}.json`))) return reponseDeFichier(path.join(dossier, `${mode}.json`))
  if (!u.searchParams.get('access_token')) return reponseDeFichier(path.join(dossier, 'erreur-190.json'))
  const brut = u.searchParams.get('search_page_ids') ?? ''
  const id = (brut.match(/\d+/) || [])[0]
  const f = id ? path.join(dossier, mode ? `ads_archive-${id}-${mode}.json` : `ads_archive-${id}.json`) : null
  if (f && fs.existsSync(f)) return reponseDeFichier(f)
  return json(200, { data: [] })
}

function fichierDuSite(dossierHote, chemin) {
  let rel = chemin.replace(/^\/+/, '')
  if (rel.endsWith('/')) rel = rel.slice(0, -1)
  if (rel === '') rel = 'index.html'
  if (rel.startsWith('_') || rel.split('/').some((x) => x === '..' || x.startsWith('_'))) return null
  for (const c of [rel, `${rel}.html`, `${rel}/index.html`]) {
    const f = path.join(dossierHote, c)
    if (path.relative(dossierHote, f).startsWith('..')) return null
    try { if (fs.statSync(f).isFile()) return f } catch { /* suivant */ }
  }
  return null
}
function corpsFabrique(taille) {
  const tete = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page trop grosse du site Témoin</title></head><body><h1>Titre de la page trop grosse Témoin</h1><p>'
  const pied = '</p><footer>© 2026</footer></body></html>'
  return tete + 'x'.repeat(Math.max(0, taille - tete.length - pied.length)) + pied
}
function servirSite(u) {
  const hote = u.hostname.toLowerCase()
  // Les candidats en lot de RC-4 (temoin-lot-NN.invalid) partagent un gabarit : sites/_gabarit-lot/.
  const dossierHote = /^temoin-lot-\d+\.invalid$/.test(hote) ? path.join(FIXTURES, 'sites', '_gabarit-lot') : path.join(FIXTURES, 'sites', hote)
  if (!/^[a-z0-9.-]+$/.test(hote) || !fs.existsSync(dossierHote)) return { coupure: true }
  const cfgF = path.join(dossierHote, '_config.json')
  const cfg = fs.existsSync(cfgF) ? lireJson(cfgF) : {}
  if (u.protocol === 'https:' && cfg.https === false) return { coupure: true }
  if (u.protocol === 'http:' && cfg.http === false) return { coupure: true }
  let chemin
  try { chemin = decodeURIComponent(u.pathname) } catch { return { statut: 400, entetes: {}, corps: '' } }
  const cle = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin
  const r = cfg.reponses && (cfg.reponses[cle] || cfg.reponses[chemin])
  if (r) {
    if (r.coupure) return { coupure: true }
    if (r.redirection) return { statut: r.statut || 301, entetes: { location: r.redirection, 'content-type': 'text/html; charset=utf-8' }, corps: '' }
    if (r.taille) return { taille: r.taille, statut: r.statut || 200 }
    const f = r.fichier ? path.join(dossierHote, r.fichier) : null
    return { statut: r.statut || 200, entetes: { 'content-type': 'text/html; charset=utf-8', ...(r.entetes || {}) }, corps: f && fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : (r.corps ?? '') }
  }
  const f = fichierDuSite(dossierHote, chemin)
  if (!f) return { statut: 404, entetes: { 'content-type': 'text/html; charset=utf-8' }, corps: '<!doctype html><title>Introuvable</title><h1>Page introuvable</h1>' }
  return { statut: 200, entetes: { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' }, corps: fs.readFileSync(f, 'utf8') }
}

export function creerRecuperateur({ horloge = null, surcharges = {}, sequences = {}, coutMs = 0, ademe = 'normal', meta = null, exceptions = [] } = {}) {
  const appels = []
  const restes = new Map(Object.entries(sequences).map(([k, v]) => [k, [...v]]))
  const vus = new Map()
  async function recuperer(url, options = {}) {
    const brut = String(url)
    const t = horloge ? horloge.maintenant() : Date.now()
    let u
    try { u = new URL(brut) } catch { throw new TypeError(`récupérateur factice : URL invalide (${brut.slice(0, 80)})`) }
    const entetes = {}
    for (const [k, v] of Object.entries((options && options.entetes) || {})) entetes[k.toLowerCase()] = String(v)
    appels.push({ url: brut, hote: u.hostname.toLowerCase(), entetes, t, options: { delaiMs: options?.delaiMs, maxOctets: options?.maxOctets } })
    if (coutMs && horloge) horloge.avancer(coutMs)
    const n = (vus.get(brut) || 0) + 1
    vus.set(brut, n)
    if (exceptions.some((x) => (typeof x === 'function' ? x(brut) : /[/?]/.test(String(x)) ? brut.includes(x) : String(x).toLowerCase() === u.hostname.toLowerCase()))) throw new Error('Témoin : exception du récupérateur (ni coupure ni réponse)')
    let rep = null
    const seq = restes.get(brut)
    if (seq && seq.length) rep = seq.shift()
    else if (typeof surcharges === 'function') rep = surcharges(brut, n)
    else if (surcharges && Object.prototype.hasOwnProperty.call(surcharges, brut)) rep = surcharges[brut]
    if (!rep) {
      if (u.hostname === HOTE_SIRENE) rep = u.pathname === '/search' ? servirSirene(u) : json(404, { erreur: 'chemin inconnu' })
      else if (u.hostname === HOTE_ADEME) rep = servirAdeme(u, ademe)
      else if (u.hostname === HOTE_META) rep = servirMeta(u, meta)
      else rep = servirSite(u)
    }
    if (rep.coupure) throw Object.assign(new Error(`coupure réseau vers ${u.hostname} (récupérateur factice)`), { code: 'ECONNRESET' })
    if (rep.exception) throw new Error(rep.exception)
    let corps = rep.taille ? corpsFabrique(rep.taille) : String(rep.corps ?? '')
    const sortie = { statut: rep.statut ?? 200, entetes: Object.fromEntries(Object.entries(rep.entetes || { 'content-type': 'text/html; charset=utf-8' }).map(([k, v]) => [k.toLowerCase(), String(v)])), corps, url_finale: brut }
    const max = options && Number(options.maxOctets)
    if (max > 0 && Buffer.byteLength(corps) > max) {
      sortie.corps = Buffer.from(corps).subarray(0, max).toString('utf8')
      sortie.tronque = true
    }
    corps = null
    return sortie
  }
  recuperer.appels = appels
  recuperer.requetesVers = (hote) => appels.filter((a) => a.hote === String(hote).toLowerCase())
  return recuperer
}
