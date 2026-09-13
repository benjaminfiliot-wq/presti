// scripts/site-qa.mjs — le juge d'un site généré (prompt v15 §3.3 : « la barre SEO — mesurable, et bloquante »).
//
// Pourquoi ce fichier existe : « un site meilleur que celui d'une agence à 2 000 € » n'est pas vérifiable, donc
// ça n'aurait jamais été prouvé. Ici, la barre est un nombre — et un site ne passe à `generee` que si TOUT est
// vert. Même modèle que scripts/video-qa.mjs : BARRE en tête, un `ok()` par critère, `--json`, code de sortie.
//
// Ce qu'il juge : un site livré comme DOSSIER STATIQUE (index.html, pages, sitemap.xml, robots.txt, images) —
// il le sert lui-même sur un port local (jamais par Next), lance Lighthouse mobile sur chaque page, et lit le
// HTML au texte (regex, comme scripts/seo-e2e.mjs : pas de DOM en Node sans dépendance).
//
// LE CONTRAT avec le générateur — un fichier `site.json` à côté de `index.html`, sans lequel le juge refuse
// (il ne peut pas deviner quelles communes sont réellement servies, et une page de commune non déclarée est
// une page satellite : Google la pénalise et c'est mensonger) :
//   {
//     "metier": "plombier",                     // clé de TYPES_METIER ci-dessous → sous-type schema.org exact
//     "nom": "Martin Plomberie",
//     "telephone": "+33 4 00 00 00 00",         // facultatif ; s'il est là, le JSON-LD doit porter le même
//     "siren": "123456782",
//     "decennale": { "assureur": "…", "numero": "…" },
//     "communes": ["Lyon", "Villeurbanne"],     // les communes RÉELLEMENT servies : une page chacune, pas une de plus
//     "metiers_secondaires": ["chauffagiste"],  // une page chacun
//     "pages": [                                // toutes les pages HTML du dossier, aucune autre
//       { "chemin": "/", "type": "accueil" },
//       { "chemin": "/plombier-villeurbanne/", "type": "commune", "cible": "Villeurbanne" },
//       { "chemin": "/chauffagiste/", "type": "metier", "cible": "chauffagiste" },
//       { "chemin": "/mentions-legales/", "type": "legal" },
//       { "chemin": "/confidentialite/", "type": "legal" }
//     ]
//   }
// Un `chemin` finit par `/` et correspond à `<chemin>index.html` dans le dossier.
//
// Usage : node scripts/site-qa.mjs public/sites-demo/plombier            (tout, Lighthouse compris : ~20 s par page)
//         node scripts/site-qa.mjs <dossier> --statique                  (sans Lighthouse : la boucle rapide du générateur)
//         node scripts/site-qa.mjs <dossier> --pages=3                   (Lighthouse sur les 3 premières pages seulement)
//         node scripts/site-qa.mjs <dossier> --json                      (rapport machine)
// Code de sortie : 0 si tout passe, 1 si un seul critère échoue, 2 si l'usage est faux.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const BARRE = {
  // Lighthouse mobile — les quatre scores. 95, pas 90 : un site vendu comme « techniquement irréprochable » ne se
  // contente pas du vert de Google (≥ 90) ; le mobile d'abord, parce que le client d'un plombier ouvre le site en
  // 4G sur un chantier (§3.3).
  SCORE_MIN: 95,
  // Core Web Vitals en laboratoire (Lighthouse). INP n'existe pas en laboratoire (c'est une mesure de terrain) :
  // on prend le Total Blocking Time comme substitut, et on le dit dans le rapport.
  LCP_MAX_MS: 2500,
  CLS_MAX: 0.1,
  TBT_MAX_MS: 200,
  // Balises : un titre unique par page, une description entre 50 et 160 signes (au-delà, Google coupe).
  TITRE_MIN: 15, TITRE_MAX: 70, DESCRIPTION_MIN: 50, DESCRIPTION_MAX: 160,
}

// Le sous-type schema.org EXACT par métier (§3.3 : « LocalBusiness avec le sous-type exact »). Là où schema.org
// n'a pas de type dédié (maçon, menuisier, carreleur, paysagiste), HomeAndConstructionBusiness est le plus précis
// qui existe — un type inventé serait ignoré par Google, un type faux (Plumber pour un maçon) serait un mensonge.
export const TYPES_METIER = {
  plombier: 'Plumber',
  electricien: 'Electrician',
  chauffagiste: 'HVACBusiness',
  peintre: 'HousePainter',
  couvreur: 'RoofingContractor',
  serrurier: 'Locksmith',
  macon: 'GeneralContractor',
  menuisier: 'HomeAndConstructionBusiness',
  carreleur: 'HomeAndConstructionBusiness',
  paysagiste: 'HomeAndConstructionBusiness',
  generique: 'HomeAndConstructionBusiness',
}
const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json',
}

// ── Lecture du HTML au texte ─────────────────────────────────────────────────────────────────────────────────
const balises = (html, nom) => [...html.matchAll(new RegExp(`<${nom}\\b([^>]*)>`, 'gi'))].map((m) => attributs(m[1]))
function attributs(brut) {
  const o = {}
  for (const m of brut.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  for (const m of brut.matchAll(/(?:^|\s)([\w-]+)(?=\s|$)/g)) if (!(m[1].toLowerCase() in o)) o[m[1].toLowerCase()] = ''
  return o
}
const meta = (html, nom) => balises(html, 'meta').find((a) => (a.name || a.property || '').toLowerCase() === nom)?.content ?? null
const lien = (html, rel) => balises(html, 'link').find((a) => (a.rel || '').toLowerCase().split(/\s+/).includes(rel))?.href ?? null
const titre = (html) => (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim()
const texteDe = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
const sansAccents = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const contient = (html, mot) => sansAccents(texteDe(html)).includes(sansAccents(mot))
function jsonLd(html) {
  const out = []
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const v = JSON.parse(m[1].replace(/\\u003c/g, '<')); out.push(...(Array.isArray(v) ? v : v['@graph'] ? v['@graph'] : [v])) } catch { out.push({ '@erreur': 'JSON-LD illisible' }) }
  }
  return out
}
const chemin = (u) => { try { return new URL(u, 'http://x').pathname } catch { return null } }

// ── Le serveur statique : le dossier, servi tel quel, sans Next ────────────────────────────────────────────────
function servir(dossier) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.includes('..')) { res.writeHead(400); return res.end() }
    let f = path.join(dossier, p)
    if (p.endsWith('/')) f = path.join(f, 'index.html')
    else if (!path.extname(p)) { const alt = path.join(f, 'index.html'); f = fs.existsSync(alt) ? alt : `${f}.html` }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404') }
    res.writeHead(200, { 'Content-Type': TYPES_MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(f).pipe(res)
  })
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, origine: `http://127.0.0.1:${srv.address().port}` })))
}

// ── Les critères statiques ───────────────────────────────────────────────────────────────────────────────────
function jugerContrat(dossier, contrat) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  const type = contrat && TYPES_METIER[contrat.metier]
  ok('site.json : métier connu', !!type, contrat?.metier ?? '(absent)', Object.keys(TYPES_METIER).join('|'))
  ok('site.json : communes déclarées', Array.isArray(contrat?.communes) && contrat.communes.length >= 1, contrat?.communes?.length ?? 0, '≥ 1 commune réellement servie')
  ok('site.json : SIREN et décennale', /^\d{9}$/.test(contrat?.siren ?? '') && !!contrat?.decennale?.assureur && !!contrat?.decennale?.numero, `${contrat?.siren ?? '—'} · ${contrat?.decennale?.assureur ?? '—'}`, '9 chiffres · assureur + numéro')
  const pages = Array.isArray(contrat?.pages) ? contrat.pages : []
  const htmls = marcher(dossier).filter((f) => f.endsWith('.html')).map((f) => '/' + path.relative(dossier, f).split(path.sep).join('/').replace(/index\.html$/, ''))
  const declarees = pages.map((p) => p.chemin)
  const nonDeclarees = htmls.filter((h) => !declarees.includes(h))
  const fantomes = declarees.filter((c) => !htmls.includes(c))
  ok('toutes les pages HTML sont déclarées dans site.json', nonDeclarees.length === 0, nonDeclarees.slice(0, 4).join(', ') || 'aucune en trop', 'aucune page cachée')
  ok('toutes les pages déclarées existent', fantomes.length === 0, fantomes.slice(0, 4).join(', ') || 'toutes présentes', 'index.html sous chaque chemin')
  const communes = (contrat?.communes ?? []).map(sansAccents)
  const pagesCommune = pages.filter((p) => p.type === 'commune')
  const satellites = pagesCommune.filter((p) => !communes.includes(sansAccents(p.cible ?? '')))
  const manquantes = (contrat?.communes ?? []).filter((c) => !pagesCommune.some((p) => sansAccents(p.cible ?? '') === sansAccents(c)))
  ok('une page par commune réellement servie', manquantes.length === 0, manquantes.join(', ') || 'toutes couvertes', (contrat?.communes ?? []).join(', '))
  ok('aucune page de commune non déclarée (satellite)', satellites.length === 0, satellites.map((p) => p.cible).join(', ') || 'aucune', 'zéro page pour une ville où il ne va pas')
  const secondaires = (contrat?.metiers_secondaires ?? []).map(sansAccents)
  const pagesMetier = pages.filter((p) => p.type === 'metier')
  ok('une page par métier secondaire', secondaires.every((m) => pagesMetier.some((p) => sansAccents(p.cible ?? '') === m)) && pagesMetier.every((p) => secondaires.includes(sansAccents(p.cible ?? ''))), `${pagesMetier.length} page(s)`, `${secondaires.length} métier(s)`)
  ok('pages légales : mentions légales et confidentialité', pages.some((p) => p.type === 'legal' && /mentions/.test(p.chemin)) && pages.some((p) => p.type === 'legal' && /confidentialite/.test(p.chemin)), pages.filter((p) => p.type === 'legal').map((p) => p.chemin).join(', ') || 'aucune', '/mentions-legales/ et /confidentialite/')
  ok('robots.txt présent, sans Disallow global, avec Sitemap', existeEt(path.join(dossier, 'robots.txt'), (s) => !/^\s*Disallow:\s*\/\s*$/m.test(s) && /^\s*Sitemap:\s*\S+/m.test(s)), existe(dossier, 'robots.txt') ? 'présent' : 'absent', 'Sitemap: … et pas de Disallow: /')
  const sitemap = existe(dossier, 'sitemap.xml') ? fs.readFileSync(path.join(dossier, 'sitemap.xml'), 'utf8') : ''
  const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => chemin(m[1])).filter(Boolean)
  const nonListees = htmls.filter((h) => !locs.includes(h) && !pages.some((p) => p.chemin === h && p.type === 'legal'))
  ok('sitemap.xml liste toutes les pages (légales à part)', sitemap.length > 0 && nonListees.length === 0, nonListees.slice(0, 4).join(', ') || `${locs.length} <loc>`, 'chaque page publique dans un <loc>')
  return { t, pages: pages.length ? pages : htmls.map((h) => ({ chemin: h, type: 'accueil' })), type }
}

function jugerPage(html, page, contrat, typeAttendu, titres, descriptions) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  const ti = titre(html), desc = meta(html, 'description') ?? '', robots = meta(html, 'robots') ?? ''
  ok('lang="fr"', /<html\b[^>]*\blang=["']fr/i.test(html), (html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1]) ?? '(absent)', 'fr')
  ok('robots : index, follow (jamais noindex)', !/noindex|nofollow/i.test(robots), robots || '(absent = index)', 'index, follow')
  ok(`title unique et de ${BARRE.TITRE_MIN} à ${BARRE.TITRE_MAX} signes`, ti.length >= BARRE.TITRE_MIN && ti.length <= BARRE.TITRE_MAX && !titres.has(ti), `${ti.length} signes${titres.has(ti) ? ' · DOUBLON' : ''}`, `unique, ${BARRE.TITRE_MIN}–${BARRE.TITRE_MAX}`)
  titres.add(ti)
  ok(`meta description unique et de ${BARRE.DESCRIPTION_MIN} à ${BARRE.DESCRIPTION_MAX} signes`, desc.length >= BARRE.DESCRIPTION_MIN && desc.length <= BARRE.DESCRIPTION_MAX && !descriptions.has(desc), `${desc.length} signes${descriptions.has(desc) ? ' · DOUBLON' : ''}`, `unique, ${BARRE.DESCRIPTION_MIN}–${BARRE.DESCRIPTION_MAX}`)
  descriptions.add(desc)
  const canon = lien(html, 'canonical')
  ok('canonical = la page elle-même', !!canon && chemin(canon) === page.chemin, canon ?? '(absent)', page.chemin)
  ok('Open Graph : og:title, og:description, og:image', !!meta(html, 'og:title') && !!meta(html, 'og:description') && !!meta(html, 'og:image'), ['og:title', 'og:description', 'og:image'].filter((k) => !meta(html, k)).join(', ') || 'complet', 'les trois')
  const h1 = (html.match(/<h1\b/gi) || []).length
  ok('un seul <h1>', h1 === 1, h1, 1)
  const imgs = balises(html, 'img')
  const mauvaisFormat = imgs.filter((i) => !/\.(webp|avif)(\?|$)/i.test(i.src || '') && !/\.(webp|avif)/i.test(i.srcset || '') && !/^data:/.test(i.src || ''))
  ok('images en AVIF/WebP', mauvaisFormat.length === 0, mauvaisFormat.map((i) => i.src).slice(0, 3).join(', ') || `${imgs.length} image(s)`, 'aucune en jpg/png')
  ok('images : alt rédigé', imgs.every((i) => (i.alt || '').trim().length >= 3), imgs.filter((i) => (i.alt || '').trim().length < 3).length + ' sans alt', '0 sans alt')
  ok('images : dimensions déclarées', imgs.every((i) => i.width && i.height), imgs.filter((i) => !(i.width && i.height)).length + ' sans width/height', '0')
  ok('images : lazy sauf le héros', imgs.length === 0 || ((imgs[0].loading || '').toLowerCase() !== 'lazy' && imgs.slice(1).every((i) => (i.loading || '').toLowerCase() === 'lazy')), imgs.length ? `héros ${imgs[0].loading || 'eager'} · ${imgs.slice(1).filter((i) => (i.loading || '') !== 'lazy').length} suivante(s) non lazy` : 'aucune image', 'héros eager, les autres lazy')
  const hrefs = balises(html, 'a').map((a) => chemin(a.href || '') || '')
  ok('lien vers les mentions légales et la confidentialité', hrefs.some((h) => /mentions/.test(h)) && hrefs.some((h) => /confidentialite/.test(h)), `${hrefs.length} lien(s)`, 'les deux dans le pied de page')
  if (page.type !== 'legal') {
    const lds = jsonLd(html)
    const entreprise = lds.find((o) => o['@type'] === typeAttendu) || lds.find((o) => /Business|LocalBusiness|Contractor|Plumber|Electrician|Locksmith|Painter/i.test(String(o['@type'])))
    ok(`JSON-LD @type = ${typeAttendu}`, !!entreprise && entreprise['@type'] === typeAttendu, entreprise?.['@type'] ?? (lds.length ? lds.map((o) => o['@type'] ?? o['@erreur']).join(', ') : '(aucun JSON-LD)'), typeAttendu)
    const adr = entreprise?.address
    ok('JSON-LD : adresse postale complète', !!adr && !!adr.streetAddress && !!adr.postalCode && !!adr.addressLocality, adr ? [adr.streetAddress, adr.postalCode, adr.addressLocality].filter(Boolean).length + '/3' : 'absente', 'streetAddress, postalCode, addressLocality')
    ok('JSON-LD : téléphone, horaires, zone servie, url', !!entreprise?.telephone && !!(entreprise?.openingHours || entreprise?.openingHoursSpecification) && !!entreprise?.areaServed && !!entreprise?.url, ['telephone', 'openingHours', 'areaServed', 'url'].filter((k) => !(entreprise?.[k] || (k === 'openingHours' && entreprise?.openingHoursSpecification))).join(', ') || 'complet', 'les quatre')
    if (contrat?.telephone) ok('JSON-LD : le téléphone est celui du dossier', String(entreprise?.telephone ?? '').replace(/\s/g, '') === String(contrat.telephone).replace(/\s/g, ''), entreprise?.telephone ?? '—', contrat.telephone)
    ok('aucune promesse de classement', !/premi[èe]re page|position(n)?[ée]? sur google|num[ée]ro 1 sur google|top ?1/i.test(texteDe(html)), 'texte lu', 'ni « première page » ni « n° 1 sur Google »')
  }
  if (page.type === 'commune') {
    ok('page de commune : la commune dans le title et le h1', !!page.cible && sansAccents(ti).includes(sansAccents(page.cible)) && sansAccents(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '').includes(sansAccents(page.cible)), ti, page.cible)
  }
  if (page.type === 'legal' && /mentions/.test(page.chemin)) {
    ok('mentions légales : SIREN affiché', contient(html, contrat?.siren ?? '∅'), 'lu', contrat?.siren)
    ok('mentions légales : assurance décennale (assureur et numéro)', contient(html, 'décennale') && contient(html, contrat?.decennale?.assureur ?? '∅') && contient(html, contrat?.decennale?.numero ?? '∅'), 'lu', `${contrat?.decennale?.assureur} · ${contrat?.decennale?.numero}`)
  }
  return t
}

// ── Lighthouse mobile ────────────────────────────────────────────────────────────────────────────────────────
async function jugerLighthouse(url, lighthouse, port) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  let lhr
  try {
    const r = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
    lhr = r.lhr
  } catch (e) {
    ok('Lighthouse a tourné', false, e.message.slice(0, 120), 'un rapport')
    return t
  }
  for (const [cle, nom] of [['performance', 'Performance'], ['accessibility', 'Accessibilité'], ['best-practices', 'Bonnes pratiques'], ['seo', 'SEO']]) {
    const score = Math.round((lhr.categories[cle]?.score ?? 0) * 100)
    ok(`Lighthouse mobile · ${nom} ≥ ${BARRE.SCORE_MIN}`, score >= BARRE.SCORE_MIN, score, `≥ ${BARRE.SCORE_MIN}`)
  }
  const n = (id) => lhr.audits[id]?.numericValue
  ok(`LCP < ${BARRE.LCP_MAX_MS} ms`, n('largest-contentful-paint') < BARRE.LCP_MAX_MS, `${Math.round(n('largest-contentful-paint') ?? -1)} ms`, `< ${BARRE.LCP_MAX_MS} ms`)
  ok(`CLS < ${BARRE.CLS_MAX}`, n('cumulative-layout-shift') < BARRE.CLS_MAX, (n('cumulative-layout-shift') ?? -1).toFixed(3), `< ${BARRE.CLS_MAX}`)
  ok(`TBT < ${BARRE.TBT_MAX_MS} ms (substitut d'INP en laboratoire)`, n('total-blocking-time') < BARRE.TBT_MAX_MS, `${Math.round(n('total-blocking-time') ?? -1)} ms`, `< ${BARRE.TBT_MAX_MS} ms`)
  return t
}

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────
function marcher(d) { const out = []; const rec = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) rec(p); else out.push(p) } }; rec(d); return out.sort() }
const existe = (d, f) => fs.existsSync(path.join(d, f))
const existeEt = (f, cond) => fs.existsSync(f) && cond(fs.readFileSync(f, 'utf8'))
const V = '\x1b[32m', R = '\x1b[31m', G = '\x1b[90m', Z = '\x1b[0m'
function afficher(titreBloc, tests, json) {
  if (json) return
  console.log(`\n${titreBloc}`)
  for (const x of tests) console.log(`  ${x.passe ? V + ' OK  ' : R + 'ÉCHEC'}${Z} ${x.nom.padEnd(58)} ${G}${x.mesure.padEnd(30)} attendu ${x.attendu}${Z}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const json = args.includes('--json')
const statique = args.includes('--statique')
const maxPages = Number((args.find((a) => a.startsWith('--pages=')) || '').split('=')[1]) || Infinity
const dossier = path.resolve(args.find((a) => !a.startsWith('--')) || '')
if (!args.some((a) => !a.startsWith('--')) || !fs.existsSync(path.join(dossier, 'index.html'))) {
  console.error('Usage : node scripts/site-qa.mjs <dossier-du-site> [--statique] [--pages=N] [--json]   (le dossier contient index.html et site.json)')
  process.exit(2)
}
let contrat = null
try { contrat = JSON.parse(fs.readFileSync(path.join(dossier, 'site.json'), 'utf8')) } catch { /* jugé plus bas */ }
const rapport = { dossier, date: new Date().toISOString(), blocs: [] }
let echecTotal = 0
const bloc = (nom, tests) => { rapport.blocs.push({ nom, tests }); echecTotal += tests.filter((x) => !x.passe).length; afficher(nom, tests, json) }

if (!json) console.log(`Juge de site — ${dossier}`)
bloc('site.json — le contrat', [{ nom: 'site.json présent et lisible', passe: !!contrat, mesure: contrat ? 'lu' : 'absent ou illisible', attendu: 'le contrat du générateur (voir l’en-tête du script)' }])
const { t: tContrat, pages, type } = jugerContrat(dossier, contrat)
bloc('Le dossier — pages, communes, sitemap, robots', tContrat)

const titres = new Set(), descriptions = new Set()
for (const page of pages) {
  const f = path.join(dossier, page.chemin.replace(/^\//, ''), 'index.html')
  if (!fs.existsSync(f)) continue
  bloc(`Page ${page.chemin} (${page.type}${page.cible ? ' · ' + page.cible : ''})`, jugerPage(fs.readFileSync(f, 'utf8'), page, contrat, type || 'LocalBusiness', titres, descriptions))
}

if (!statique) {
  const { srv, origine } = await servir(dossier)
  let navigateur = null
  try {
    const { chromium } = await import('playwright')
    const { default: lighthouse } = await import('lighthouse')
    // Port de débogage fixe (comme scripts/sonde-lighthouse.mjs, sur 9222) : 9333 ici pour ne pas se marcher dessus
    // avec la sonde ; deux juges en parallèle se gêneraient — un à la fois.
    const port = 9333
    navigateur = await chromium.launch({ args: [`--remote-debugging-port=${port}`] })
    const cibles = pages.filter((p) => p.type !== 'legal').slice(0, maxPages)
    for (const page of cibles) bloc(`Lighthouse mobile — ${page.chemin}`, await jugerLighthouse(origine + page.chemin, lighthouse, port))
    if (pages.filter((p) => p.type !== 'legal').length > cibles.length && !json) console.log(`${G}  (Lighthouse limité à ${cibles.length} page(s) par --pages ; les autres ne sont pas jugées)${Z}`)
  } catch (e) {
    bloc('Lighthouse', [{ nom: 'Playwright + Lighthouse disponibles', passe: false, mesure: e.message.slice(0, 120), attendu: 'npm i (playwright, lighthouse)' }])
  } finally {
    if (navigateur) await navigateur.close().catch(() => {})
    srv.close()
  }
}

if (json) console.log(JSON.stringify(rapport, null, 2))
else console.log(echecTotal ? `\n${R}✗ ${echecTotal} critère(s) en échec.${Z}` : `\n${V}✓ Tout passe.${Z}`)
process.exit(echecTotal ? 1 : 0)
