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
import net from 'node:net'
import os from 'node:os'

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
// Les licences acceptées pour une photo qui n'est pas celle de l'artisan. « propriétaire » = la photo de l'artisan
// lui-même (dossier de commande). Une licence absente de cette liste est un refus, pas une tolérance.
export const LICENCES_PERMISES = ['CC0', 'domaine public', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.0', 'propriétaire']
let AUTEURS = []
// La direction artistique par métier, telle que plans/cerveau-site.md la fixe (§3) : l'accent et la police display.
// Le juge ne juge pas le goût — mais il vérifie que le site a SUIVI la direction, pas un thème système par défaut.
export const DA_METIER = {
  plombier: { accent: '#1E6FA8', display: 'Manrope' },
  electricien: { accent: '#E8B93B', display: 'Space Grotesk' },
  chauffagiste: { accent: '#D2622A', display: 'Newsreader' },
  macon: { accent: '#8A8177', display: 'Archivo Narrow' },
  menuisier: { accent: '#A9743F', display: 'Fraunces' },
  peintre: { accent: '#C2543F', display: 'Instrument Serif' },
  carreleur: { accent: '#3C6E63', display: 'Manrope' },
  couvreur: { accent: '#6B4A3A', display: 'Archivo Narrow' },
  serrurier: { accent: '#35506B', display: 'Syne' },
  paysagiste: { accent: '#4A7B3F', display: 'Lora' },
  generique: { accent: '#3B4E63', display: 'Manrope' },
}
// La substance : ce qu'un squelette « qui passe » n'a pas (constaté le 13/09 : police système, aucune mise en page,
// un bloc gris pour photo, 70 Ko en tout — vert au SEO, vide pour un client). Des seuils bas, mais des seuils.
const SUBSTANCE = { CSS_MIN: 6000, POLICES_MIN: 1, POLICE_OCTETS_MIN: 5000, PHOTOS_MIN: 3, PHOTO_OCTETS_MIN: 25_000, PHOTO_LARGEUR_MIN: 800, TEXTE_ACCUEIL_MIN: 1200, H2_ACCUEIL_MIN: 4, TEXTE_COMMUNE_MIN: 400 }
/** La largeur d'un WebP lue dans son en-tête (VP8X, VP8L, VP8) ; 0 si ce n'en est pas un. */
function largeurWebp(fichier) {
  try {
    const b = Buffer.alloc(32); const fd = fs.openSync(fichier, 'r'); fs.readSync(fd, b, 0, 32, 0); fs.closeSync(fd)
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return 0
    const chunk = b.toString('ascii', 12, 16)
    if (chunk === 'VP8X') return 1 + (b[24] | (b[25] << 8) | (b[26] << 16))
    if (chunk === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21])
    if (chunk === 'VP8 ') return b.readUInt16LE(26) & 0x3fff
    return 0
  } catch { return 0 }
}
// Une attribution inventée (« John Doe », source « Wikimedia » sans lien — le 13/09) n'est pas une attribution.
const AUTEURS_BIDON = /^(john doe|jane doe|auteur|author|inconnu|unknown|anonyme|anonymous|test|n\/a|-)$/i
// Le 13/09 (site « Électricien ») : source « https://commons.wikimedia.org » tout court — la racine d'un site n'est
// pas une source, il faut la page du fichier ; et des légendes en « Ã© » (UTF-8 lu en latin-1) — un texte mal encodé
// n'ira sur aucun site. `mojibake` sert aussi aux pages HTML.
export const mojibake = (txt) => /Ã[\x80-\xBF©¨ªà«®¯§¹¼»¢]|\uFFFD|Â[\xA0«»]/.test(String(txt || ''))
const sourcePrecise = (u) => { try { const x = new URL(String(u || '')); return /^https?:$/.test(x.protocol) && x.pathname.replace(/\/+$/, '').length >= 8 } catch { return false } }
const attributionCredible = (a) => !!a.auteur && a.auteur.length >= 3 && !AUTEURS_BIDON.test(a.auteur.trim()) && !mojibake(a.auteur) && !mojibake(a.legende) && sourcePrecise(a.source) && LICENCES_PERMISES.includes(a.licence)
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
  // Photos qui ne sont pas celles de l'artisan (démo, banque libre) : chacune porte une attribution lisible avec une
  // licence qu'on a le droit d'utiliser sur un site — et jamais dans un film (BY-SA : partage à l'identique).
  const images = marcher(dossier).filter((f) => /\.(webp|avif|png|jpe?g)$/i.test(f)).map((f) => path.relative(dossier, f).split(path.sep).join('/'))
  const fAttr = path.join(dossier, 'attributions.json')
  AUTEURS = []
  if (contrat?.demo || fs.existsSync(fAttr)) {
    let attributions = null
    try { attributions = JSON.parse(fs.readFileSync(fAttr, 'utf8')) } catch { /* jugé juste en dessous */ }
    const liste = Array.isArray(attributions) ? attributions : []
    const sans = images.filter((i) => !liste.some((a) => a.fichier === i || `images/${a.fichier}` === i))
    const incompletes = liste.filter((a) => !attributionCredible(a))
    ok('attributions.json : chaque image a un auteur réel, la page source (pas la racine d\'un site), une légende bien encodée et une licence permise', !!attributions && sans.length === 0 && incompletes.length === 0, attributions ? `${sans.length} sans attribution · ${incompletes.length} non crédible(s) (auteur bidon, source sans page, « Ã© », licence)` : 'attributions.json absent ou illisible', `toutes ; licences : ${LICENCES_PERMISES.join(', ')}`)
    AUTEURS = [...new Set(liste.map((a) => a.auteur).filter(Boolean))]
  }
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
    if (AUTEURS.length) ok('mentions légales : crédits photos — chaque auteur cité', AUTEURS.every((a) => contient(html, a)), AUTEURS.filter((a) => !contient(html, a)).slice(0, 3).join(', ') || 'tous cités', AUTEURS.join(', '))
    if (contrat?.demo) ok('site de démonstration : dit comme tel', contient(html, 'démonstration'), 'lu', 'le mot « démonstration » dans les mentions')
  }
  return t
}

// ── Le rendu réel ─────────────────────────────────────────────────────────────────────────────────────────
// Le 13/09, un site « tout vert » (Lighthouse 99/100/100/100, 12 photos, CSS au seuil) était à l'écran un squelette : listes
// à puces, section « Nos réalisations » vide, contenu dans une colonne de 840 px sur un fond noir. Ce que les compteurs ne
// voient pas, le navigateur le voit : on charge l'accueil, on le fait défiler (images paresseuses, reveals), et on mesure
// ce qui est VISIBLE — images chargées et opaques, vides verticaux, largeur du contenu, police du métier vraiment appliquée.
async function jugerRendu(navigateur, origine, pages, da) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  const accueil = (pages.find((p) => p.type === 'accueil') || { chemin: '/' }).chemin
  const mesurer = async (largeur, hauteur, js) => {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, javaScriptEnabled: js })
    const page = await ctx.newPage()
    try {
      await page.goto(origine + accueil, { waitUntil: 'load', timeout: 60_000 })
      await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)) } window.scrollTo(0, 0) })
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
      await page.waitForTimeout(500)
      await page.evaluate(() => document.fonts.ready).catch(() => {})
      return await page.evaluate(() => {
        const polices = [...document.fonts].map((f) => ({ famille: f.family.replace(/["']/g, ''), statut: f.status }))
        const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.9) return false; const b = el.getBoundingClientRect(); return b.width > 4 && b.height > 4 }
        const imgs = [...document.images]
        const imgsOk = imgs.filter((i) => i.complete && i.naturalWidth > 0 && vis(i)).length
        const boites = []
        for (const el of document.body.querySelectorAll('*')) {
          if (!vis(el)) continue
          const b = el.getBoundingClientRect(), top = b.top + scrollY, tag = el.tagName
          if (tag === 'IMG' || tag === 'VIDEO' || tag === 'svg' || tag === 'SVG') boites.push([top, top + b.height])
          else if (el.childElementCount === 0 && (el.textContent || '').trim().length >= 3) boites.push([top, top + b.height])
          else if (getComputedStyle(el).backgroundImage !== 'none' && b.height > 40) boites.push([top, top + b.height])
        }
        boites.sort((a, b) => a[0] - b[0])
        let maxVide = 0, fin = 0
        for (const [a, b] of boites) { if (a - fin > maxVide) maxVide = a - fin; fin = Math.max(fin, b) }
        const hauteurDoc = document.documentElement.scrollHeight
        if (hauteurDoc - fin > maxVide) maxVide = hauteurDoc - fin
        const h1 = document.querySelector('h1')
        const largeurContenu = Math.max(0, ...[...document.querySelectorAll('main, section, header, footer, article')].map((e) => e.getBoundingClientRect().width))
        return { imgs: imgs.length, imgsOk, maxVide: Math.round(maxVide), police: h1 ? getComputedStyle(h1).fontFamily : '(pas de h1)', polices, largeurContenu: Math.round(largeurContenu), hauteurDoc: Math.round(hauteurDoc) }
      })
    } finally { await ctx.close().catch(() => {}) }
  }
  try {
    const bureau = await mesurer(1280, 900, true), mobile = await mesurer(390, 844, true)
    ok('bureau : toutes les images chargées et visibles après défilement (opacité ≥ 0,9)', bureau.imgs > 0 && bureau.imgsOk === bureau.imgs, `${bureau.imgsOk}/${bureau.imgs}`, 'toutes')
    ok('bureau : aucun vide vertical de plus de 700 px sans contenu visible', bureau.maxVide <= 700, `${bureau.maxVide} px (page de ${bureau.hauteurDoc} px)`, '≤ 700 px')
    ok('bureau : le contenu occupe la largeur (≥ 900 px sur 1280)', bureau.largeurContenu >= 900, `${bureau.largeurContenu} px`, '≥ 900 px')
    ok('mobile : images visibles et aucun vide de plus de 900 px', mobile.imgsOk === mobile.imgs && mobile.maxVide <= 900, `${mobile.imgsOk}/${mobile.imgs} · vide max ${mobile.maxVide} px`, '≤ 900 px')
    if (da) {
      ok(`le h1 est composé en « ${da.display} » (police du métier appliquée, pas seulement déclarée)`, new RegExp(da.display.replace(/\s+/g, '\\s*'), 'i').test(bureau.police), bureau.police.slice(0, 60), da.display)
      const chargee = (bureau.polices || []).find((p) => new RegExp(da.display.replace(/\s+/g, '\\s*'), 'i').test(p.famille) && p.statut === 'loaded')
      ok(`la police « ${da.display} » est réellement chargée par le navigateur (fichier woff2 valide)`, !!chargee, (bureau.polices || []).map((p) => `${p.famille}:${p.statut}`).join(', ').slice(0, 80) || 'aucune @font-face', 'loaded')
    }
  } catch (e) { ok('le rendu a pu être mesuré (Playwright)', false, e.message.slice(0, 120), 'accueil chargé en 60 s') }
  return t
}

// ── La substance et la direction artistique ────────────────────────────────────────────────────────────
function jugerSubstance(dossier, contrat, pages) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  const fichiers = marcher(dossier)
  const lireHtml = (p) => { const f = path.join(dossier, p.chemin.replace(/^\//, ''), 'index.html'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '' }
  const accueil = lireHtml(pages.find((p) => p.type === 'accueil') || { chemin: '/' })
  // Le CSS : les feuilles du dossier + les <style> inline de l'accueil.
  const feuillesLiees = [...accueil.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((m) => (m[0].match(/href=["']([^"']+)["']/i) || [])[1]).filter(Boolean)
    .map((h) => path.join(dossier, h.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/^\//, ''))).filter((f) => fs.existsSync(f))
  const feuillesOrphelines = fichiers.filter((f) => f.endsWith('.css') && !feuillesLiees.includes(f))
  ok('les feuilles de style du dossier sont chargées par l\'accueil (<link rel="stylesheet">)', feuillesOrphelines.length === 0, feuillesOrphelines.map((f) => path.relative(dossier, f)).join(', ') || 'toutes liées', 'aucune feuille orpheline')
  const css = feuillesLiees.map((f) => fs.readFileSync(f, 'utf8')).join('\n') + [...accueil.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') + [...accueil.matchAll(/style=["']([^"']*)["']/gi)].map((m) => m[1]).join('\n')
  const htmlTous = pages.map(lireHtml).join('\n') + accueil
  const classes = new Set(), ids = new Set()
  for (const m of htmlTous.matchAll(/\bclass\s*=\s*["']([^"']*)["']/gi)) for (const c of m[1].split(/\s+/)) if (c) classes.add(c)
  for (const m of htmlTous.matchAll(/\bid\s*=\s*["']([^"']*)["']/gi)) if (m[1]) ids.add(m[1].trim())
  // Une règle compte si chacune de ses classes et chacun de ses ids existent dans une page (les règles sans classe ni id
  // — balises, @font-face, @keyframes, pseudo-éléments — comptent toujours). 300 « .util-margin-N » sans emploi = 0 signe.
  let cssUtile = 0, reglesInutiles = 0
  for (const morceau of css.split('}')) {
    const parts = morceau.split('{'); if (parts.length < 2) continue
    const decl = parts.pop(), sel = parts.pop().trim()
    const cls = [...sel.matchAll(/\.([A-Za-z_-][\w-]*)/g)].map((m) => m[1]), idl = [...sel.matchAll(/#([A-Za-z_-][\w-]*)/g)].map((m) => m[1])
    const utile = cls.every((c) => classes.has(c)) && idl.every((i) => ids.has(i))
    if (utile) cssUtile += sel.length + decl.length + 2; else reglesInutiles++
  }
  ok(`CSS réel et UTILISÉ (≥ ${SUBSTANCE.CSS_MIN} signes de règles dont les classes existent dans les pages)`, cssUtile >= SUBSTANCE.CSS_MIN, `${cssUtile} signes utiles sur ${css.length}${reglesInutiles ? ` · ${reglesInutiles} règle(s) sans emploi` : ''}`, `≥ ${SUBSTANCE.CSS_MIN}`)
  // Un contenu masqué en attendant JavaScript (reveal au défilement : opacity 0 → 1) doit avoir un filet : sans script
  // (lecteur, robot, erreur JS), le site ne doit pas rester vide. Règle du design system Presti, vérifiée ici sans navigateur.
  const masques = [...css.matchAll(/([^{}]+)\{[^}]*opacity\s*:\s*0(?:\.0+)?\s*[;}]/g)].map((m) => m[1].trim()).filter((sel) => [...sel.matchAll(/\.([A-Za-z_-][\w-]*)/g)].some((m) => classes.has(m[1])))
  ok('un contenu masqué en attendant JavaScript (opacity: 0) a un filet de sécurité (<noscript><style>, ou règle sous html.js / .no-js)', masques.length === 0 || /<noscript>\s*<style/i.test(accueil) || /html\.js\b|\.no-js\b|\.js\s+\./i.test(css), masques.length ? `${masques.length} sélecteur(s) à opacité 0 : ${masques.slice(0, 3).join(', ')}` : 'aucun contenu masqué', 'un filet, ou rien de masqué')
  const polices = fichiers.filter((f) => /\.woff2?$/i.test(f) && fs.statSync(f).size >= SUBSTANCE.POLICE_OCTETS_MIN)
  ok('polices auto-hébergées (woff2 dans le dossier, licence OFL à côté)', polices.length >= SUBSTANCE.POLICES_MIN && fichiers.some((f) => /OFL\.txt$/i.test(f)), `${polices.length} police(s)${fichiers.some((f) => /OFL\.txt$/i.test(f)) ? ', OFL.txt' : ', pas d’OFL.txt'}`, `≥ ${SUBSTANCE.POLICES_MIN} woff2 + OFL.txt`)
  ok('aucune police chargée depuis un service tiers', !/fonts\.googleapis|fonts\.gstatic|use\.typekit|cdnjs|jsdelivr|unpkg/i.test(accueil + css), 'lu', 'tout est dans le dossier')
  // Une photo se reconnaît à sa largeur, lue dans l'en-tête WebP — pas à son nom (six « photos » de 600 octets le 13/09).
  const photos = fichiers.filter((f) => /\.webp$/i.test(f)).map((f) => ({ f, octets: fs.statSync(f).size, largeur: largeurWebp(f) })).filter((p) => p.octets >= SUBSTANCE.PHOTO_OCTETS_MIN && p.largeur >= SUBSTANCE.PHOTO_LARGEUR_MIN)
  ok(`des photos réelles (≥ ${SUBSTANCE.PHOTOS_MIN} WebP de ≥ ${SUBSTANCE.PHOTO_LARGEUR_MIN} px et ≥ ${SUBSTANCE.PHOTO_OCTETS_MIN / 1000} Ko)`, photos.length >= SUBSTANCE.PHOTOS_MIN, `${photos.length} photo(s) réelle(s)`, `≥ ${SUBSTANCE.PHOTOS_MIN}`)
  const texte = texteDe(accueil).trim()
  ok(`accueil : du texte (≥ ${SUBSTANCE.TEXTE_ACCUEIL_MIN} signes) et des sections (≥ ${SUBSTANCE.H2_ACCUEIL_MIN} <h2>)`, texte.length >= SUBSTANCE.TEXTE_ACCUEIL_MIN && (accueil.match(/<h2\b/gi) || []).length >= SUBSTANCE.H2_ACCUEIL_MIN, `${texte.length} signes · ${(accueil.match(/<h2\b/gi) || []).length} h2`, `≥ ${SUBSTANCE.TEXTE_ACCUEIL_MIN} · ≥ ${SUBSTANCE.H2_ACCUEIL_MIN}`)
  // Du texte écrit, pas répété : une phrase qui revient trois fois, ou moins de 70 % de suites de cinq mots distinctes,
  // c'est du remplissage. Jugé sur l'accueil et sur chaque page de commune.
  const repetition = (txt) => {
    const phrases = txt.split(/[.!?]+\s+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 25)
    const compte = {}
    for (const ph of phrases) compte[ph] = (compte[ph] || 0) + 1
    const pire = Object.entries(compte).sort((a, b) => b[1] - a[1])[0] || ['', 0]
    const mots = txt.toLowerCase().replace(/[^a-zà-ÿ0-9]+/gi, ' ').trim().split(/\s+/)
    const suites = new Set(); let total = 0
    for (let i = 0; i + 5 <= mots.length; i++) { suites.add(mots.slice(i, i + 5).join(' ')); total++ }
    return { pirePhrase: pire[0].slice(0, 60), pireCompte: pire[1], distinctes: total ? suites.size / total : 1 }
  }
  const rAccueil = repetition(texte)
  ok('accueil : du texte écrit, pas répété (aucune phrase plus de deux fois, ≥ 70 % de suites de cinq mots distinctes)', rAccueil.pireCompte <= 2 && rAccueil.distinctes >= 0.7, `« ${rAccueil.pirePhrase}… » ×${rAccueil.pireCompte} · ${Math.round(rAccueil.distinctes * 100)} % distinctes`, '≤ 2 · ≥ 70 %')
  const communesRepetees = pages.filter((p) => p.type === 'commune').map((p) => ({ p, r: repetition(texteDe(lireHtml(p))) })).filter(({ r }) => r.pireCompte > 2 || r.distinctes < 0.7)
  ok('pages de commune : du texte écrit, pas répété', communesRepetees.length === 0, communesRepetees.slice(0, 3).map(({ p, r }) => `${p.chemin} (×${r.pireCompte}, ${Math.round(r.distinctes * 100)} %)`).join(', ') || 'toutes', '≤ 2 · ≥ 70 %')
  const communesCourtes = pages.filter((p) => p.type === 'commune').filter((p) => texteDe(lireHtml(p)).trim().length < SUBSTANCE.TEXTE_COMMUNE_MIN)
  ok(`pages de commune : du texte (≥ ${SUBSTANCE.TEXTE_COMMUNE_MIN} signes chacune)`, communesCourtes.length === 0, communesCourtes.map((p) => p.chemin).slice(0, 3).join(', ') || 'toutes', '0 page creuse')
  const da = DA_METIER[contrat?.metier]
  if (da) {
    ok(`direction artistique du métier : l'accent ${da.accent} est dans le CSS`, new RegExp(da.accent.replace('#', '#?'), 'i').test(css), /(#[0-9a-f]{6})/i.test(css) ? 'couleurs présentes' : 'aucune couleur', da.accent)
    ok(`direction artistique du métier : la police display « ${da.display} »`, new RegExp(da.display.replace(/\s+/g, '\\s*'), 'i').test(css), (css.match(/font-family\s*:\s*([^;]+)/i)?.[1] ?? '(aucune font-family)').slice(0, 60), da.display)
  }
  ok("pas de carrousel automatique ni de police système déguisée en identité", !/autoplay|setInterval\([^)]*slide|swiper|slick/i.test(accueil), 'lu', 'aucun défilement automatique')
  return t
}

// ── Lighthouse mobile ────────────────────────────────────────────────────────────────────────────────────────
async function jugerLighthouse(url, lighthouse, port) {
  const t = []
  const ok = (nom, passe, mesure = '', attendu = '') => t.push({ nom, passe: !!passe, mesure: String(mesure), attendu: String(attendu) })
  let lhr
  // Deux essais : une mesure de laboratoire varie d'un passage à l'autre, on garde le meilleur des deux — mais on ne
  // relance que si le premier est sous la barre (un site vert du premier coup ne paie qu'une mesure).
  const minScore = (r) => Math.min(...['performance', 'accessibility', 'best-practices', 'seo'].map((c) => Math.round((r.categories[c]?.score ?? 0) * 100)))
  // Trois essais : « Protocol error … Target closed » (14/09) est un hoquet de Chromium, pas une note du site.
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
      if (!lhr || minScore(r.lhr) > minScore(lhr)) lhr = r.lhr
      if (minScore(lhr) >= BARRE.SCORE_MIN) break
    } catch (e) {
      if (essai === 3 && !lhr) { ok('Lighthouse a tourné', false, e.message.slice(0, 120), 'un rapport'); return t }
      await new Promise((r) => setTimeout(r, 3000))
    }
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
/** Un port TCP libre, choisi par le système : deux juges en parallèle n'ouvrent jamais le même Chrome. */
const portLibre = () => new Promise((r, x) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)) }); s.on('error', x) })
// Un seul Lighthouse à la fois sur la machine : les autres juges attendent leur tour (jusqu'à 20 min), un verrou de
// plus de 25 min est considéré abandonné. Sans ça, sept mesures simultanées se parasitent (CPU) — Performance 0.
const VERROU = path.join(os.tmpdir(), 'site-qa-lighthouse.lock')
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
const vivant = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
async function prendreVerrou() {
  const debut = Date.now()
  for (;;) {
    try { fs.writeFileSync(VERROU, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' }); return VERROU } catch { /* pris */ }
    // Un détenteur mort (juge tué, machine redémarrée) ne bloque personne : le verrou est levé sur-le-champ.
    try {
      const [pid] = fs.readFileSync(VERROU, 'utf8').trim().split(/\s+/)
      if (!vivant(Number(pid)) || Date.now() - fs.statSync(VERROU).mtimeMs > 25 * 60_000) { fs.unlinkSync(VERROU); continue }
    } catch { continue }
    if (Date.now() - debut > 20 * 60_000) throw new Error('un autre juge tient Lighthouse depuis plus de 20 min')
    await attendre(3000)
  }
}
const libererVerrou = (v) => { try { fs.unlinkSync(v) } catch { /* déjà levé */ } }
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

bloc('La substance et la direction artistique', jugerSubstance(dossier, contrat, pages))

const titres = new Set(), descriptions = new Set()
for (const page of pages) {
  const f = path.join(dossier, page.chemin.replace(/^\//, ''), 'index.html')
  if (!fs.existsSync(f)) continue
  bloc(`Page ${page.chemin} (${page.type}${page.cible ? ' · ' + page.cible : ''})`, jugerPage(fs.readFileSync(f, 'utf8'), page, contrat, type || 'LocalBusiness', titres, descriptions))
}

// Un site qui échoue déjà sur le dossier, la substance ou les pages n'est pas mesuré au navigateur ni par Lighthouse : ça
// coûte cinq minutes et un verrou pour rien — corriger d'abord (--tout force la mesure quand même).
const mesurerQuandMeme = args.includes('--tout')
if (echecTotal && !statique && !mesurerQuandMeme && !json) console.log(`
${G}  ${echecTotal} échec(s) avant le navigateur : rendu et Lighthouse non mesurés (corrige d'abord, ou --tout).${Z}`)
if (!statique && (!echecTotal || mesurerQuandMeme)) {
  const { srv, origine } = await servir(dossier)
  let navigateur = null
  let verrou = null
  try {
    const { chromium } = await import('playwright')
    const { default: lighthouse } = await import('lighthouse')
    // Plusieurs juges tournent en même temps (un agent par site) : un port de débogage LIBRE à chaque fois, et un verrou
    // de fichier pour que Lighthouse ne mesure qu'un site à la fois — sinon les mesures se parasitent (Performance 0
    // constaté le 13/09 avec sept juges sur le même port 9333).
    const port = await portLibre()
    navigateur = await chromium.launch({ args: [`--remote-debugging-port=${port}`] })
    bloc('Le rendu réel — bureau et mobile', await jugerRendu(navigateur, origine, pages, DA_METIER[contrat?.metier]))
    verrou = await prendreVerrou()
    const cibles = pages.filter((p) => p.type !== 'legal').slice(0, maxPages)
    for (const page of cibles) bloc(`Lighthouse mobile — ${page.chemin}`, await jugerLighthouse(origine + page.chemin, lighthouse, port))
    if (pages.filter((p) => p.type !== 'legal').length > cibles.length && !json) console.log(`${G}  (Lighthouse limité à ${cibles.length} page(s) par --pages ; les autres ne sont pas jugées)${Z}`)
  } catch (e) {
    bloc('Lighthouse', [{ nom: 'Playwright + Lighthouse disponibles', passe: false, mesure: e.message.slice(0, 120), attendu: 'npm i (playwright, lighthouse)' }])
  } finally {
    if (navigateur) await navigateur.close().catch(() => {})
    if (verrou) libererVerrou(verrou)
    srv.close()
  }
}

if (json) console.log(JSON.stringify(rapport, null, 2))
else console.log(echecTotal ? `\n${R}✗ ${echecTotal} critère(s) en échec.${Z}` : `\n${V}✓ Tout passe.${Z}`)
process.exit(echecTotal ? 1 : 0)
