// scripts/photos-demo.mjs — des photos VRAIES pour les sites de démo, avec l'attribution que Commons donne, pas celle
// qu'un agent invente (26 attributions fausses sur 53 le 14/09, voir photos-provenance.mjs).
//
// Deux temps, pour choisir à l'œil et non au hasard :
//   node scripts/photos-demo.mjs chercher plombier      → interroge l'API Commons (licences libres, ≥ 1600 px), écrit
//                                                          <scratch>/photos/plombier/candidats.json + planche.jpg (24 vignettes numérotées)
//   node scripts/photos-demo.mjs prendre plombier 3:hero:"Légende" 7:pipes:"Légende" …
//                                                        → télécharge l'original, produit 480/720/960/1600 en avif+webp dans
//                                                          public/sites-demo/plombier/images/ et écrit attributions.json
//                                                          (auteur, licence, page du fichier : ce que l'API répond).
//
// Options ajoutées le 14/09 (direction photo de la démo Lestraque) — sans elles, l'usage ci-dessus ne change pas :
//   chercher … --requetes="q1|q2|…"  requêtes à la place de celles du métier
//              --planche=nom          sous-dossier de travail (plusieurs planches par métier sans s'écraser)
//              --min=2400             largeur minimale de l'original (côté le plus long ; défaut 1600)
//              --sans-sa              écarte les CC BY-SA (une photo BY-SA dans un film étendrait le partage à l'identique au film)
//              --max=48 --parreq=20   nombre de candidats sur la planche, résultats par requête
//   prendre  … --ajouter              ne vide pas images/ : remplace seulement les bases reprises, garde les autres attributions
//              --largeurs=480,…,2880  largeurs produites (jamais au-delà de l'original)
//              --etalonner            l'étalonnage commun v2 (voir plus bas) ; --cible-b=20 --fenetre=3 --cible-l=38 --fenetre-l=6
//                                     --a-min=4 --a-max=8 --grain=6 ; --q-avif-grand=NN --q-webp-grand=NN (fichiers ≥ 2400 px)
//              --recadrer=nom:g,h,l,H recadrage de l'original en fractions (gauche, haut, largeur, hauteur) — pour sortir une marque
//   variante <metier> <base> <nouvelle-base> --ratio=4:5 --centre=0.41,0.39 [--largeurs=720,1080]
//                                    → recadrage d'une photo déjà prise, avec son réglage d'étalonnage à l'identique (--remesurer : recalculé)
//   mesurer  <metier> [base …]       → L*, a*, b* moyens (Lab) de chaque photo et l'écart de b* entre elles
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const DEMOS = path.join(RACINE, 'public', 'sites-demo')
const TRAVAIL = path.join(process.env.PRESTI_SCRATCH || path.join(RACINE, '.orchestre', 'travail'), 'photos')
const UA = 'PrestiDemoPhotos/1.0 (https://prestiapp.fr; contact@prestiapp.fr)'
const LARGEURS = [480, 720, 960, 1600]
// Les licences que le juge accepte (site-qa.mjs → LICENCES_PERMISES), telles que Commons les nomme.
const LICENCES_OK = /^(cc0|cc by(?:-sa)? (?:2\.0|3\.0|4\.0)|public domain)$/i
const estSA = (l) => /by-sa/i.test(l)
const licenceJuge = (l) => /^public domain$/i.test(l) ? 'domaine public' : /^cc0/i.test(l) ? 'CC0' : l

// --cle=valeur (la dernière occurrence gagne), et toutes les occurrences pour les options répétables
const opt = (cle, defaut) => { const a = process.argv.filter((x) => x.startsWith(`--${cle}=`)).pop(); return a ? a.slice(cle.length + 3) : defaut }
const opts = (cle) => process.argv.filter((x) => x.startsWith(`--${cle}=`)).map((x) => x.slice(cle.length + 3))
const drapeau = (cle) => process.argv.includes(`--${cle}`)
const MIN = Number(opt('min', 1600))
// qualité des fichiers ≥ 2400 px (le bureau seul) : à q48 l'AVIF lissait le fil du bois au point qu'un 2400 n'apportait presque
// rien de plus qu'un 1600 agrandi (juge, 14/09). Mesuré sur l'escalier (laplacien d'une même zone en 2880) : original 15,4,
// AVIF q48 4,7, q68 8,3, q74 ≈ 9,5, q76 10,0 ; 1600 agrandi 2,4 ; le WebP plafonne (5,5 à q84). Les autres largeurs gardent leurs qualités.
const Q_AVIF_GRAND = Number(opt('q-avif-grand', 74))
const Q_WEBP_GRAND = Number(opt('q-webp-grand', 84))
// Taille acceptée d'un original. Sans --min : l'usage d'origine (largeur ≥ 1600 et hauteur ≥ 900), pour qu'un portrait étroit
// ne sorte pas en fichier « -1600 » plus étroit que prévu. Avec --min : le côté le plus long ≥ min, le plus court ≥ 900.
const tailleOk = (w = 0, h = 0) => (opt('min') ? Math.max(w, h) >= MIN && Math.min(w, h) >= 900 : w >= 1600 && h >= 900)

// Commons est anglophone : les requêtes le sont. Six à huit requêtes par métier, chacune ramène ses meilleurs résultats.
const REQUETES = {
  plombier: ['copper pipes plumbing installation', 'bathroom sink faucet chrome', 'plumber working pipe wrench', 'water heater installation', 'shower head bathroom modern', 'pipe fittings brass', 'bathroom renovation plumbing'],
  electricien: ['electrical panel circuit breakers', 'electrician working wires', 'electrical wiring installation', 'light switch wall modern', 'led lighting ceiling interior', 'electrical cable copper', 'electric meter cabinet'],
  chauffagiste: ['boiler heating installation', 'radiator heating home', 'heat pump outdoor unit', 'underfloor heating pipes', 'thermostat wall', 'gas boiler condensing', 'heating pipes copper manifold'],
  macon: ['bricklaying wall construction', 'concrete foundation pouring', 'stone wall masonry', 'construction site building brick', 'mason trowel mortar', 'reinforced concrete rebar', 'block wall construction'],
  'menuisier-agenceur': ['woodworking workshop bench', 'carpenter workshop wood shavings', 'oak wood grain planks', 'wooden staircase modern interior', 'built-in wardrobe oak', 'kitchen wooden cabinets custom', 'joinery wood joint detail', 'wood panelling interior modern'],
  // la démo v16 : l'atelier, la matière, l'agencement — requêtes multilingues (Commons est riche en allemand et en français)
  lestraque: ['Tischlerei Werkstatt', 'Schreinerei Hobelbank', 'menuiserie atelier bois', 'woodworking bench chisels', 'wood shavings plane', 'oak board grain close-up', 'fitted kitchen wood interior', 'wooden staircase interior design', 'timber joinery dovetail', 'bibliothèque bois sur mesure'],
  menuisier: ['woodworking workshop joinery', 'wooden staircase custom', 'oak wood furniture handmade', 'wooden window frame', 'carpenter planing wood', 'hardwood floor installation', 'wooden door workshop'],
  peintre: ['painting wall roller interior', 'paint brush wall renovation', 'painter ladder room', 'freshly painted room white', 'wall painting color samples', 'exterior house painting facade', 'plaster wall preparation'],
  carreleur: ['tile installation floor', 'bathroom tiles mosaic', 'ceramic tiles pattern floor', 'tiler laying tiles', 'walk-in shower tiled', 'kitchen backsplash tiles', 'hexagonal tiles floor'],
  couvreur: ['roof tiles installation', 'roofer working roof', 'slate roof house', 'roof structure timber rafters', 'zinc roofing gutter', 'clay roof tiles red', 'chimney roof repair'],
  serrurier: ['door lock cylinder', 'locksmith key cutting', 'security door lock installation', 'keys bunch metal', 'deadbolt lock door', 'padlock steel', 'door handle lock modern'],
}

// L'auteur : le champ Artist de Commons, débarrassé du HTML et des espaces multiples ; quand c'est une phrase (« This photo
// was taken by X. Feel free… »), on garde le nom du compte qui a téléversé — un crédit est un nom, pas un paragraphe.
function auteurDe(meta, ii) {
  // Les imports Unsplash de Commons écrivent « Nom <a href="https://unsplash.com/@pseudo">pseudo</a> » : le lien ne fait que
  // répéter le compte (« Igor Ovsyannykov igorovsyannykov » dans les crédits, le 14/09). On retire le lien dont le texte est
  // exactement le pseudo de son URL, et seulement s'il reste un nom devant — le reste du champ est celui de l'API, inchangé.
  const html = String(meta.Artist?.value || '')
  const sansPseudo = html.replace(/<a\b[^>]*href="[^"]*\/@([^"/?#]+)"[^>]*>\s*([^<]+?)\s*<\/a>/gi, (tout, pseudo, texte) => (texte === pseudo ? ' ' : tout))
  const garde = sansPseudo.replace(/<[^>]+>/g, ' ').trim().length >= 3 ? sansPseudo : html
  const brut = garde.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const m = /taken by ([^.,;(]{3,40})/i.exec(brut)
  if (m) return m[1].trim()
  return (brut.length >= 3 && brut.length <= 40 ? brut : String(ii.user || '').trim()).slice(0, 40)
}

async function api(params) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.search = new URLSearchParams({ format: 'json', ...params })
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

// ——— Couleur : sRGB → Lab (D65), pour mesurer et pour étalonner ———
const LIN = Float64Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
function labMoyen(px, canaux, transfo = null) {
  let L = 0, A = 0, B = 0, n = 0
  for (let i = 0; i < px.length; i += canaux) {
    let r = px[i], g = px[i + 1], b = px[i + 2]
    if (transfo) [r, g, b] = transfo(r, g, b)
    const R = LIN[r], G = LIN[g], Bl = LIN[b]
    const fx = fLab((0.4124 * R + 0.3576 * G + 0.1805 * Bl) / 0.95047), fy = fLab(0.2126 * R + 0.7152 * G + 0.0722 * Bl), fz = fLab((0.0193 * R + 0.1192 * G + 0.9505 * Bl) / 1.08883)
    L += 116 * fy - 16; A += 500 * (fx - fy); B += 200 * (fy - fz); n++
  }
  return { L: L / n, a: A / n, b: B / n }
}
async function mesure(entree) {
  const { data, info } = await sharp(entree).resize(256, 256, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, canaux: info.channels }
}

// ——— L'étalonnage commun (v2, 14/09, après le juge) ———
// Un seul réglage pour toutes les photos d'une démo, appliqué au moment des AVIF/WebP. La v1 ne ramenait que b* dans une
// fenêtre, en poussant le gain bleu jusqu'à 1,45 : le bord de l'œil de l'escalier virait au lavande, et la planche gardait
// deux lumières (intérieurs de jour à L* 60, vues LED à L* 24). La v2 :
//  1. balance des blancs CHAUDE SEULEMENT : gain bleu de 0,64 à 1 (jamais au-dessus), rouge de 1 à 1,12, vert de 0,96 à 1,04.
//     Une photo trop jaune n'est pas refroidie : sa saturation baisse (0,6 à 1), ce qui garde les teintes. (Avec 0,72 et 0,75,
//     la série de Lestraque butait aux deux bornes : b* de 13,9 à 28,1.)
//  2. exposition commune : une courbe gamma par photo (0,6 à 1,6) ramène la luminance moyenne dans --cible-l ± --fenetre-l
//     (défaut 38 ± 6) ; a* dans [--a-min, --a-max] (défaut 4 à 8) ; b* dans --cible-b ± --fenetre (défaut 20 ± 3).
//  3. noirs légèrement relevés et contraste modéré : sortie = 0,92 × entrée + 12 (le noir vaut 12, le blanc 247).
//  4. grain léger (facultatif, --grain=N) : bruit gaussien monochrome en lumière douce, tiré à la taille de sortie.
const TON = { a: 0.92, b: 12 }
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
const LUMA = [0.2126, 0.7152, 0.0722]
// gains par canal puis saturation (1 = inchangée, mélange vers la luminance) : une matrice 3×3
const matrice = ({ gains: g, saturation: s = 1 }) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => ((i === j ? s : 0) + (1 - s) * LUMA[j]) * g[j]))
// la table de ton : gamma de la photo, puis noirs relevés et contraste réduit
const tableTon = (gamma = 1) => Uint8Array.from({ length: 256 }, (_, v) => clamp8(255 * (v / 255) ** gamma * TON.a + TON.b))
function transformeur(reglage) {
  const M = matrice(reglage), T = tableTon(reglage.gamma ?? 1)
  const c = (row, r, v, b) => T[clamp8(row[0] * r + row[1] * v + row[2] * b)]
  return (r, v, b) => [c(M[0], r, v, b), c(M[1], r, v, b), c(M[2], r, v, b)]
}
const BORNES = { rouge: [1, 1.12], vert: [0.96, 1.04], bleu: [0.64, 1], saturation: [0.6, 1], gamma: [0.6, 1.6] }
const borne = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x))
const ecartFenetre = (x, lo, hi) => (x < lo ? lo - x : x > hi ? hi - x : 0)
const cibleEtalonnage = () => ({ cibleB: Number(opt('cible-b', 20)), fenetre: Number(opt('fenetre', 3)), cibleL: Number(opt('cible-l', 38)), fenetreL: Number(opt('fenetre-l', 6)), aMin: Number(opt('a-min', 4)), aMax: Number(opt('a-max', 8)), grain: Number(opt('grain', 0)) })
const CLES_CIBLE = ['cibleB', 'fenetre', 'cibleL', 'fenetreL', 'aMin', 'aMax']
function gainsPour(px, canaux, cible) {
  const { cibleB = 20, fenetre = 3, cibleL = 38, fenetreL = 6, aMin = 4, aMax = 8 } = cible
  let g = [1, 1, 1], s = 1, gamma = 1
  for (let k = 0; k < 150; k++) {
    const m = labMoyen(px, canaux, transformeur({ gains: g, saturation: s, gamma }))
    const db = ecartFenetre(m.b, cibleB - fenetre, cibleB + fenetre), da = ecartFenetre(m.a, aMin, aMax), dL = ecartFenetre(m.L, cibleL - fenetreL, cibleL + fenetreL)
    if (Math.abs(db) < 0.25 && Math.abs(da) < 0.25 && Math.abs(dL) < 0.25) break
    gamma = borne(gamma * Math.exp(-dL * 0.012), BORNES.gamma)
    const r = g[0] * Math.exp(da * 0.005), v = g[1] * Math.exp(-da * 0.002), b = g[2] * Math.exp(-db * 0.008)
    // trop jaune avec le bleu déjà à 1, ou trop rouge avec le rouge déjà à 1 : c'est la saturation qui baisse, pas la teinte
    if ((db < 0 && b >= BORNES.bleu[1]) || (da < 0 && r <= BORNES.rouge[0])) s = borne(s * Math.exp(Math.min(db, da) * 0.008), BORNES.saturation)
    g = [borne(r, BORNES.rouge), borne(v, BORNES.vert), borne(b, BORNES.bleu)]
  }
  const m = labMoyen(px, canaux, transformeur({ gains: g, saturation: s, gamma }))
  return { gains: g.map((x) => Math.round(x * 10000) / 10000), saturation: Math.round(s * 1000) / 1000, gamma: Math.round(gamma * 1000) / 1000, prevu: { L: +m.L.toFixed(1), a: +m.a.toFixed(1), b: +m.b.toFixed(1) } }
}
// le même calcul que la mesure, pixel par pixel, à la taille de sortie
async function appliquer(img, reglage) {
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const f = transformeur(reglage), out = Buffer.alloc(info.width * info.height * 3)
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 3) { const [r, v, b] = f(data[i], data[i + 1], data[i + 2]); out[j] = r; out[j + 1] = v; out[j + 2] = b }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer()
}
async function avecGrain(buf, sigma) {
  if (!sigma) return buf
  const { width, height } = await sharp(buf).metadata()
  const bruit = await sharp({ create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma } } }).greyscale().toColourspace('srgb').png().toBuffer()
  return sharp(buf).composite([{ input: bruit, blend: 'soft-light' }]).toBuffer()
}

// Openverse (openverse.org, WordPress Foundation) agrège les images sous licence Creative Commons de Flickr, Wikimedia et
// d'autres, avec l'auteur, la licence et la page d'origine dans l'API — sans clé pour un usage modéré. Plus riche que la
// recherche plein texte de Commons pour des photos « de magazine » (atelier, matière, intérieur).
async function chercherOpenverse(metier, reqs, max) {
  const vus = new Map()
  for (const q of reqs) {
    if (vus.size >= max) break
    const u = new URL('https://api.openverse.org/v1/images/')
    // --fournisseur=flickr : les photos d'atelier et d'intérieur « de magazine » sont sur Flickr, pas sur Wikimedia (constaté le 14/09)
    const fournisseur = opt('fournisseur', '')
    u.search = new URLSearchParams({ q, license: drapeau('sans-sa') ? 'by,cc0,pdm' : 'by,by-sa,cc0', size: 'large', page_size: opt('parreq', '20'), mature: 'false', category: 'photograph', ...(fournisseur ? { source: fournisseur } : {}), ...(drapeau('large') ? { aspect_ratio: 'wide' } : {}) })
    let j
    try { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); if (!r.ok) { console.log(`  ? openverse ${r.status} pour « ${q} »`); continue } j = await r.json() } catch (e) { console.log(`  ? openverse : ${e.message}`); continue }
    for (const it of j.results || []) {
      if (!it.url || !it.creator || !tailleOk(it.width, it.height)) continue
      const lic = String(it.license || '').toLowerCase(), ver = String(it.license_version || '')
      const licence = lic === 'cc0' ? 'CC0' : lic === 'pdm' ? 'Public domain' : `CC ${lic.toUpperCase()} ${ver}`
      if (!LICENCES_OK.test(licence) || (drapeau('sans-sa') && estSA(licence))) continue
      const cle = it.foreign_landing_url || it.url
      if (vus.has(cle)) continue
      vus.set(cle, { titre: it.title || it.id, requete: q, largeur: it.width, hauteur: it.height, url: it.url, vignette: it.thumbnail || it.url, page: it.foreign_landing_url, auteur: String(it.creator).slice(0, 40), licence, description: String(it.title || '').slice(0, 140), source: 'openverse', fournisseur: it.source })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return [...vus.values()]
}

async function chercher(metier) {
  const reqs = opt('requetes') ? opt('requetes').split('|').map((q) => q.trim()).filter(Boolean) : REQUETES[metier]
  if (!reqs) throw new Error(`pas de requêtes pour ${metier}`)
  const max = Number(opt('max', 36))
  const vus = new Map()
  if (opt('source') === 'openverse') { for (const c of await chercherOpenverse(metier, reqs, max)) vus.set(c.titre, c) }
  // D'abord parmi les « Quality images » de Commons (cadrage, netteté, exposition jugés par des pairs), puis en plein texte.
  // --simple : plein texte seulement (les « Quality images » sont belles mais souvent hors sujet pour un métier du bâtiment)
  const passes = opt('source') === 'openverse' ? [] : drapeau('simple') ? reqs : [...reqs.map((q) => `incategory:"Quality images" ${q}`), ...reqs.map((q) => `incategory:"Quality images" ${q.split(' ').slice(0, 2).join(' ')}`), ...reqs]
  // --categories="Wooden staircases|Bookcases" : les fichiers d'une catégorie Commons, les plus récents d'abord (le plein texte
  // ramène des plans et des maquettes de musée ; une catégorie bien choisie ramène le sujet)
  const cats = opt('categories') ? opt('categories').split('|').map((c) => c.trim()).filter(Boolean) : []
  for (const q of [...cats.map((c) => ({ cat: c })), ...passes]) {
    if (vus.size >= max) break
    const j = q.cat
      ? await api({ action: 'query', generator: 'categorymembers', gcmtitle: `Category:${q.cat}`, gcmtype: 'file', gcmsort: 'timestamp', gcmdir: 'desc', gcmlimit: opt('parreq', '10'), prop: 'imageinfo', iiprop: 'url|size|user|extmetadata', iiurlwidth: '320' })
      : await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: opt('parreq', '10'), prop: 'imageinfo', iiprop: 'url|size|user|extmetadata', iiurlwidth: '320' })
    for (const p of Object.values(j.query?.pages || {})) {
      const ii = p.imageinfo?.[0]; if (!ii) continue
      const meta = ii.extmetadata || {}
      const licence = meta.LicenseShortName?.value || ''
      if (!LICENCES_OK.test(licence) || (drapeau('sans-sa') && estSA(licence))) continue
      if (!tailleOk(ii.width, ii.height) || !/\.(jpe?g|png)$/i.test(p.title)) continue
      if (vus.has(p.title)) continue
      vus.set(p.title, { titre: p.title, requete: q, largeur: ii.width, hauteur: ii.height, url: ii.url, vignette: ii.thumburl, page: ii.descriptionurl, auteur: auteurDe(meta, ii), licence, description: (meta.ImageDescription?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 140) })
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  const cands = [...vus.values()].slice(0, max)
  const dossier = path.join(TRAVAIL, opt('planche', metier)); fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(path.join(dossier, 'candidats.json'), JSON.stringify(cands, null, 1))
  // la planche : 6 colonnes de 300 px, chaque vignette numérotée (largeur de l'original et « SA » en bas quand BY-SA)
  const cases = []
  for (let i = 0; i < cands.length; i++) {
    try {
      const r = await fetch(cands[i].vignette, { headers: { 'User-Agent': UA } })
      const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize(300, 200, { fit: 'cover' }).toBuffer()
      const pied = `${cands[i].largeur}×${cands[i].hauteur}${estSA(cands[i].licence) ? ' SA' : ''}`
      const num = Buffer.from(`<svg width="300" height="200"><rect x="0" y="0" width="44" height="28" fill="#000" opacity="0.75"/><text x="22" y="20" font-size="18" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">${i}</text><rect x="0" y="182" width="120" height="18" fill="#000" opacity="0.65"/><text x="4" y="196" font-size="12" font-family="sans-serif" fill="${estSA(cands[i].licence) ? '#f88' : '#fff'}">${pied}</text></svg>`)
      cases.push({ input: await sharp(buf).composite([{ input: num, top: 0, left: 0 }]).toBuffer(), left: (i % 6) * 300, top: Math.floor(i / 6) * 200 })
    } catch (e) { console.log(`  ? vignette ${i} : ${e.message}`) }
  }
  const lignes = Math.ceil(cands.length / 6)
  await sharp({ create: { width: 1800, height: Math.max(200, lignes * 200), channels: 3, background: '#222' } }).composite(cases).jpeg({ quality: 80 }).toFile(path.join(dossier, 'planche.jpg'))
  console.log(`${metier} : ${cands.length} candidat(s) → ${path.join(dossier, 'planche.jpg')}`)
  cands.forEach((c, i) => console.log(`  ${String(i).padStart(2)} ${c.largeur}×${c.hauteur} ${c.licence.padEnd(12)} ${c.titre.replace(/^File:/, '').slice(0, 60)}`))
}

// L'original, téléchargé une fois : les variantes et les reprises le relisent sans rappeler Wikimedia
async function original(metier, url) {
  const cache = path.join(TRAVAIL, metier, 'originaux'); fs.mkdirSync(cache, { recursive: true })
  // clé = empreinte de l'URL entière : toutes les URL Commons finissent par le même « ?utm_source=… », une clé tirée de la
  // fin de l'URL a servi l'escalier de Ljubljana à la place de celui de Toronto (constaté le 14/09)
  const f = path.join(cache, crypto.createHash('sha256').update(url).digest('hex').slice(0, 32))
  if (fs.existsSync(f) && fs.statSync(f).size > 0) return fs.readFileSync(f)
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${url} : ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (!buf.length) throw new Error(`${url} : 0 octet`)
  fs.writeFileSync(f, buf)
  return buf
}

async function candidatCommons(titreBrut) {
  const titre = 'File:' + decodeURIComponent(titreBrut.replace(/^.*File:/, '')).replace(/^File:/, '')
  const j = await api({ action: 'query', titles: titre, prop: 'imageinfo', iiprop: 'url|size|user|extmetadata' })
  const p = Object.values(j.query?.pages || {})[0]; const ii = p?.imageinfo?.[0]
  if (!ii) throw new Error(`${titre} introuvable sur Commons`)
  const meta = ii.extmetadata || {}; const licence = meta.LicenseShortName?.value || ''
  if (!LICENCES_OK.test(licence)) throw new Error(`${titre} : licence « ${licence} » refusée`)
  return { titre: p.title, url: ii.url, page: ii.descriptionurl, auteur: auteurDe(meta, ii), licence, largeur: ii.width, hauteur: ii.height }
}

// Produit les fichiers d'une base et renvoie ses lignes d'attribution
async function produire(metier, { nom, cand, legende, largeurs, recadrage, etalonnage, variante }) {
  const images = path.join(DEMOS, metier, 'images')
  const brut = await original(metier, cand.url)
  let img = sharp(brut).rotate()
  const { width: W0, height: H0 } = await sharp(await img.clone().toBuffer()).metadata()
  if (recadrage) {
    const [g, h, l, H] = recadrage
    const zone = { left: Math.round(g * W0), top: Math.round(h * H0), width: Math.round(l * W0), height: Math.round(H * H0) }
    img = sharp(await img.extract(zone).toBuffer())
  }
  const { width: W, height: H } = await sharp(await img.clone().toBuffer()).metadata()
  if (Math.max(W0, H0) < MIN) console.log(`  ⚠ ${nom} : original ${W0}×${H0}, sous le minimum de ${MIN} px`)
  // jusqu'à 1600 : comme avant (un fichier « -1600 » même d'une source plus petite, le srcset l'attend) ; au-delà, jamais d'agrandissement
  const retenues = largeurs.filter((l) => l <= W || l <= 1600)
  for (const l of largeurs.filter((l) => !retenues.includes(l))) console.log(`  ⚠ ${nom} : ${l} px ignoré (la source recadrée fait ${W} px)`)
  const base = sharp(await img.toBuffer())
  // gains = le réglage { gains, saturation } : donné (reprise à l'identique) ou mesuré sur la photo
  let gains = etalonnage?.gains ? { gains: etalonnage.gains, saturation: etalonnage.saturation ?? 1, gamma: etalonnage.gamma ?? 1 } : null
  if (etalonnage && !gains) { const { data, canaux } = await mesure(await base.clone().toBuffer()); gains = gainsPour(data, canaux, etalonnage) }
  for (const l of retenues) {
    const p = base.clone().resize({ width: l, withoutEnlargement: true })
    let buf = gains ? await appliquer(p, gains) : await p.toBuffer()
    if (gains && etalonnage.grain) buf = await avecGrain(buf, etalonnage.grain)
    const grand = l >= 1600
    await sharp(buf).webp({ quality: l >= 2400 ? Q_WEBP_GRAND : grand ? 76 : 72 }).toFile(path.join(images, `${nom}-${l}.webp`))
    await sharp(buf).avif({ quality: l >= 2400 ? Q_AVIF_GRAND : grand ? 50 : 46 }).toFile(path.join(images, `${nom}-${l}.avif`))
  }
  const plusGrande = Math.max(...retenues)
  const { width, height } = await sharp(path.join(images, `${nom}-${plusGrande}.webp`)).metadata()
  const gestes = [recadrage && (variante ? `recadrée en ${variante}` : 'recadrée'), gains && 'étalonnée (balance des blancs chaude, exposition, noirs relevés, contraste réduit' + (etalonnage.grain ? ', grain' : '') + ')'].filter(Boolean)
  const lignes = []
  // une entrée par fichier (le juge rapproche chaque image du dossier d'une attribution), la première porte la plus grande en webp
  for (const l of [...retenues].reverse()) for (const ext of ['webp', 'avif']) lignes.push({
    fichier: `images/${nom}-${l}.${ext}`, base: nom, largeur: width, hauteur: height, legende, alt: legende, auteur: cand.auteur, licence: licenceJuge(cand.licence), source: cand.page,
    titre_commons: cand.source === 'openverse' ? undefined : cand.titre,
    origine: cand.source === 'openverse' ? { via: 'openverse', fournisseur: cand.fournisseur, image: cand.url } : undefined,
    largeur_source: W0, hauteur_source: H0,
    // une photo sous licence CC retouchée est une œuvre modifiée : la licence exige de le dire
    modifiee: gestes.length ? `Oui — ${gestes.join(', ')} par Presti pour ce site de démonstration` : undefined,
    recadrage: recadrage || undefined,
    etalonnage: gains ? { version: 2, gains: gains.gains, saturation: gains.saturation, gamma: gains.gamma, ton: TON, grain: etalonnage.grain || 0, ...Object.fromEntries(CLES_CIBLE.map((k) => [k, etalonnage[k]])) } : undefined,
    usage: estSA(cand.licence) ? 'site uniquement — CC BY-SA : jamais dans un film (le partage à l\'identique s\'étendrait au film)' : undefined,
  })
  console.log(`  ✓ ${nom} ← ${String(cand.titre).replace(/^File:/, '').slice(0, 60)} (${cand.auteur}, ${cand.licence}) source ${W0}×${H0} → ${retenues.join('/')}${gains ? ` gains ${gains.gains.join(',')} saturation ${gains.saturation} gamma ${gains.gamma}${gains.prevu ? ` → L* ${gains.prevu.L} a* ${gains.prevu.a} b* ${gains.prevu.b}` : ''}` : ''}${estSA(cand.licence) ? '  ⚠ BY-SA' : ''}`)
  return lignes
}

function lireAttributions(metier) {
  try { return JSON.parse(fs.readFileSync(path.join(DEMOS, metier, 'attributions.json'), 'utf8')) } catch { return [] }
}
// fusion : les bases reprises remplacent leurs anciennes lignes à la même place (l'ordre compte : generer.mjs prend la
// première photo comme héros par défaut), les nouvelles vont à la fin
function fusionner(anciennes, nouvelles) {
  const parBase = new Map(); for (const l of nouvelles) { if (!parBase.has(l.base)) parBase.set(l.base, []); parBase.get(l.base).push(l) }
  const sortie = []; const posees = new Set()
  for (const a of anciennes) {
    if (parBase.has(a.base)) { if (!posees.has(a.base)) { sortie.push(...parBase.get(a.base)); posees.add(a.base) } }
    else sortie.push(a)
  }
  for (const [b, ls] of parBase) if (!posees.has(b)) sortie.push(...ls)
  return sortie
}

async function prendre(metier, choix) {
  const dossier = path.join(TRAVAIL, opt('planche', metier))
  let cands = []
  try { cands = JSON.parse(fs.readFileSync(path.join(dossier, 'candidats.json'), 'utf8')) } catch { /* pas de planche : seuls les titres Commons marchent */ }
  const images = path.join(DEMOS, metier, 'images')
  const ajouter = drapeau('ajouter')
  if (!ajouter) { fs.rmSync(images, { recursive: true, force: true }) }
  fs.mkdirSync(images, { recursive: true })
  const largeurs = opt('largeurs') ? opt('largeurs').split(',').map(Number).filter(Boolean).sort((a, b) => a - b) : LARGEURS
  const etalonnage = drapeau('etalonner') ? cibleEtalonnage() : null
  const recadrages = Object.fromEntries(opts('recadrer').map((r) => { const [n, v] = r.split(':'); return [n, v.split(',').map(Number)] }))
  let attributions = []
  for (const c of choix) {
    const [num, nom, ...reste] = c.split(':'); const legende = reste.join(':').replace(/^"|"$/g, '')
    // un numéro de la planche, ou un titre Commons (File:… ou la fin d'une URL de page) : une photo déjà vérifiée, par exemple
    let cand = /^\d+$/.test(num) ? cands[Number(num)] : null
    if (!cand && !/^\d+$/.test(num)) cand = await candidatCommons(num)
    if (!cand) throw new Error(`candidat ${num} inconnu`)
    cand.auteur = auteurDe({ Artist: { value: cand.auteur } }, { user: cand.auteur.split(/[.,;(]/)[0] })   // une planche d'avant la règle « un nom, pas une phrase »
    attributions.push(...await produire(metier, { nom, cand, legende, largeurs, recadrage: recadrages[nom], etalonnage }))
    await new Promise((r) => setTimeout(r, 400))
  }
  if (ajouter) attributions = fusionner(lireAttributions(metier), attributions)
  fs.writeFileSync(path.join(DEMOS, metier, 'attributions.json'), JSON.stringify(attributions, null, 1))
  console.log(`${metier} : ${attributions.length} fichiers attribués, attributions.json écrit`)
}

// Une variante recadrée d'une base déjà prise (le portrait du héros pour le téléphone) : même original, même étalonnage
async function variante(metier, baseSource, nom) {
  const toutes = lireAttributions(metier)
  const src = toutes.find((a) => a.base === baseSource)
  if (!src) throw new Error(`${baseSource} absente de attributions.json`)
  const cand = src.titre_commons ? await candidatCommons(src.titre_commons) : { titre: src.source, url: src.origine?.image, page: src.source, auteur: src.auteur, licence: src.licence, source: 'openverse', fournisseur: src.origine?.fournisseur }
  const [rl, rh] = opt('ratio', '4:5').split(':').map(Number)
  const [cx, cy] = opt('centre', '0.5,0.5').split(',').map(Number)
  const brut = await original(metier, cand.url)
  const { width: W0, height: H0 } = await sharp(await sharp(brut).rotate().toBuffer()).metadata()
  // la plus grande fenêtre au ratio demandé, centrée sur (cx, cy) et gardée dans l'image
  let h = H0, w = Math.round(h * rl / rh); if (w > W0) { w = W0; h = Math.round(w * rh / rl) }
  const g = Math.min(Math.max(0, Math.round(cx * W0 - w / 2)), W0 - w), t = Math.min(Math.max(0, Math.round(cy * H0 - h / 2)), H0 - h)
  const recadrage = [g / W0, t / H0, w / W0, h / H0].map((x) => Math.round(x * 100000) / 100000)
  const largeurs = (opt('largeurs', '720,1080')).split(',').map(Number).sort((a, b) => a - b)
  // même réglage que la source, à l'identique (gains, saturation, gamma) : le portrait garde la lumière du paysage. La v1 remesurait
  // sur le recadrage et le portrait finissait plus froid que la source (gain bleu 1,45, saturation 0,772). --remesurer : recalculé.
  const e = src.etalonnage
  const etalonnage = e ? (drapeau('remesurer') ? { ...cibleEtalonnage(), grain: e.grain || 0 } : { ...e }) : (drapeau('etalonner') ? cibleEtalonnage() : null)
  const lignes = await produire(metier, { nom, cand, legende: src.legende, largeurs, recadrage, etalonnage, variante: `${rl}:${rh}` })
  fs.writeFileSync(path.join(DEMOS, metier, 'attributions.json'), JSON.stringify(fusionner(toutes, lignes), null, 1))
  console.log(`${metier} : variante ${nom} (${rl}:${rh} autour de ${cx},${cy}) écrite`)
}

async function mesurer(metier, bases) {
  const images = path.join(DEMOS, metier, 'images')
  const toutes = [...new Set(lireAttributions(metier).map((a) => a.base))]
  const liste = bases.length ? bases : toutes
  const res = []
  for (const b of liste) {
    const f = fs.readdirSync(images).filter((x) => x.startsWith(b + '-') && /^\d+\.webp$/.test(x.slice(b.length + 1))).sort((x, y) => parseInt(x.slice(b.length + 1)) - parseInt(y.slice(b.length + 1)))[0]
    if (!f) { console.log(`  ? ${b} : aucun webp`); continue }
    const { data, canaux } = await mesure(path.join(images, f))
    const m = labMoyen(data, canaux); res.push({ b, ...m })
    console.log(`  ${b.padEnd(28)} L* ${m.L.toFixed(1).padStart(5)}  a* ${m.a.toFixed(1).padStart(5)}  b* ${m.b.toFixed(1).padStart(5)}`)
  }
  const bs = res.map((r) => r.b)
  const ecart = Math.max(...bs) - Math.min(...bs)
  console.log(`écart de b* moyen : ${ecart.toFixed(1)} (${res.length} photos) ${ecart <= 8 ? '✓ ≤ 8' : '✗ > 8'}`)
  return ecart
}

const [mode, metier, ...reste] = process.argv.slice(2)
const positionnels = reste.filter((x) => !x.startsWith('--'))
if (mode === 'chercher') await chercher(metier)
else if (mode === 'prendre') await prendre(metier, positionnels)
else if (mode === 'variante') await variante(metier, positionnels[0], positionnels[1])
else if (mode === 'mesurer') process.exit((await mesurer(metier, positionnels)) <= 8 ? 0 : 1)
else { console.error('usage : chercher <metier> | prendre <metier> <n:nom:"légende"> … | variante <metier> <base> <nouvelle> --ratio=4:5 --centre=x,y | mesurer <metier> [base …]'); process.exit(2) }
