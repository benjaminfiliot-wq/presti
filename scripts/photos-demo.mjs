// scripts/photos-demo.mjs — des photos VRAIES pour les sites de démo, avec l'attribution que Commons donne, pas celle
// qu'un agent invente (26 attributions fausses sur 53 le 14/09, voir photos-provenance.mjs).
//
// Deux temps, pour choisir à l'œil et non au hasard :
//   node scripts/photos-demo.mjs chercher plombier      → interroge l'API Commons (licences libres, ≥ 1600 px), écrit
//                                                          <scratch>/photos/plombier/candidats.json + planche.jpg (24 vignettes numérotées)
//   node scripts/photos-demo.mjs prendre plombier 3:hero:"Légende" 7:pipes:"Légende" …
//                                                        → télécharge l'original, produit 480/960/1600 en avif+webp dans
//                                                          public/sites-demo/plombier/images/ et écrit attributions.json
//                                                          (auteur, licence, page du fichier : ce que l'API répond).
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const DEMOS = path.join(RACINE, 'public', 'sites-demo')
const TRAVAIL = path.join(process.env.PRESTI_SCRATCH || path.join(RACINE, '.orchestre', 'travail'), 'photos')
const UA = 'PrestiDemoPhotos/1.0 (https://prestiapp.fr; contact@prestiapp.fr)'
const LARGEURS = [480, 720, 960, 1600]
// Les licences que le juge accepte (site-qa.mjs → LICENCES_PERMISES), telles que Commons les nomme.
const LICENCES_OK = /^(cc0|cc by(?:-sa)? (?:2\.0|3\.0|4\.0)|public domain)$/i
const licenceJuge = (l) => /^public domain$/i.test(l) ? 'domaine public' : /^cc0/i.test(l) ? 'CC0' : l

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
  const brut = String(meta.Artist?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
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

// Openverse (openverse.org, WordPress Foundation) agrège les images sous licence Creative Commons de Flickr, Wikimedia et
// d'autres, avec l'auteur, la licence et la page d'origine dans l'API — sans clé pour un usage modéré. Plus riche que la
// recherche plein texte de Commons pour des photos « de magazine » (atelier, matière, intérieur).
async function chercherOpenverse(metier, reqs) {
  const vus = new Map()
  for (const q of reqs) {
    if (vus.size >= 36) break
    const u = new URL('https://api.openverse.org/v1/images/')
    // --fournisseur=flickr : les photos d'atelier et d'intérieur « de magazine » sont sur Flickr, pas sur Wikimedia (constaté le 14/09)
    const fournisseur = (process.argv.find((a) => a.startsWith('--fournisseur=')) || '').slice(14)
    u.search = new URLSearchParams({ q, license: 'by,by-sa,cc0', size: 'large', page_size: '20', mature: 'false', category: 'photograph', ...(fournisseur ? { source: fournisseur } : {}), ...(process.argv.includes('--large') ? { aspect_ratio: 'wide' } : {}) })
    let j
    try { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); if (!r.ok) { console.log(`  ? openverse ${r.status} pour « ${q} »`); continue } j = await r.json() } catch (e) { console.log(`  ? openverse : ${e.message}`); continue }
    for (const it of j.results || []) {
      if (!it.url || !it.creator || (it.width || 0) < 1600 || (it.height || 0) < 900) continue
      const lic = String(it.license || '').toLowerCase(), ver = String(it.license_version || '')
      const licence = lic === 'cc0' ? 'CC0' : `CC ${lic.toUpperCase()} ${ver}`
      if (!LICENCES_OK.test(licence)) continue
      const cle = it.foreign_landing_url || it.url
      if (vus.has(cle)) continue
      vus.set(cle, { titre: it.title || it.id, requete: q, largeur: it.width, hauteur: it.height, url: it.url, vignette: it.thumbnail || it.url, page: it.foreign_landing_url, auteur: String(it.creator).slice(0, 40), licence, description: String(it.title || '').slice(0, 140), source: 'openverse', fournisseur: it.source })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return [...vus.values()]
}

async function chercher(metier) {
  const reqs = REQUETES[metier]; if (!reqs) throw new Error(`pas de requêtes pour ${metier}`)
  const vus = new Map()
  if (process.argv.includes('--source=openverse')) { for (const c of await chercherOpenverse(metier, reqs)) vus.set(c.titre, c) }
  // D'abord parmi les « Quality images » de Commons (cadrage, netteté, exposition jugés par des pairs), puis en plein texte.
  // --simple : plein texte seulement (les « Quality images » sont belles mais souvent hors sujet pour un métier du bâtiment)
  const passes = process.argv.includes('--source=openverse') ? [] : process.argv.includes('--simple') ? reqs : [...reqs.map((q) => `incategory:"Quality images" ${q}`), ...reqs.map((q) => `incategory:"Quality images" ${q.split(' ').slice(0, 2).join(' ')}`), ...reqs]
  for (const q of passes) {
    if (vus.size >= 36) break
    const j = await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|size|user|extmetadata', iiurlwidth: '320' })
    for (const p of Object.values(j.query?.pages || {})) {
      const ii = p.imageinfo?.[0]; if (!ii) continue
      const meta = ii.extmetadata || {}
      const licence = meta.LicenseShortName?.value || ''
      if (!LICENCES_OK.test(licence)) continue
      if (ii.width < 1600 || ii.height < 900 || !/\.(jpe?g|png)$/i.test(p.title)) continue
      if (vus.has(p.title)) continue
      vus.set(p.title, { titre: p.title, requete: q, largeur: ii.width, hauteur: ii.height, url: ii.url, vignette: ii.thumburl, page: ii.descriptionurl, auteur: auteurDe(meta, ii), licence, description: (meta.ImageDescription?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 140) })
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  const cands = [...vus.values()].slice(0, 36)
  const dossier = path.join(TRAVAIL, metier); fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(path.join(dossier, 'candidats.json'), JSON.stringify(cands, null, 1))
  // la planche : 6 colonnes de 300 px, chaque vignette numérotée
  const cases = []
  for (let i = 0; i < cands.length; i++) {
    try {
      const r = await fetch(cands[i].vignette, { headers: { 'User-Agent': UA } })
      const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize(300, 200, { fit: 'cover' }).toBuffer()
      const num = Buffer.from(`<svg width="300" height="200"><rect x="0" y="0" width="44" height="28" fill="#000" opacity="0.75"/><text x="22" y="20" font-size="18" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">${i}</text></svg>`)
      cases.push({ input: await sharp(buf).composite([{ input: num, top: 0, left: 0 }]).toBuffer(), left: (i % 6) * 300, top: Math.floor(i / 6) * 200 })
    } catch (e) { console.log(`  ? vignette ${i} : ${e.message}`) }
  }
  const lignes = Math.ceil(cands.length / 6)
  await sharp({ create: { width: 1800, height: Math.max(200, lignes * 200), channels: 3, background: '#222' } }).composite(cases).jpeg({ quality: 80 }).toFile(path.join(dossier, 'planche.jpg'))
  console.log(`${metier} : ${cands.length} candidat(s) → ${path.join(dossier, 'planche.jpg')}`)
  cands.forEach((c, i) => console.log(`  ${String(i).padStart(2)} ${c.largeur}×${c.hauteur} ${c.licence.padEnd(12)} ${c.titre.replace(/^File:/, '').slice(0, 60)}`))
}

async function prendre(metier, choix) {
  const dossier = path.join(TRAVAIL, metier)
  let cands = []
  try { cands = JSON.parse(fs.readFileSync(path.join(dossier, 'candidats.json'), 'utf8')) } catch { /* pas de planche : seuls les titres Commons marchent */ }
  const images = path.join(DEMOS, metier, 'images')
  fs.rmSync(images, { recursive: true, force: true }); fs.mkdirSync(images, { recursive: true })
  const attributions = []
  for (const c of choix) {
    const [num, nom, ...reste] = c.split(':'); const legende = reste.join(':').replace(/^"|"$/g, '')
    // un numéro de la planche, ou un titre Commons (File:… ou la fin d'une URL de page) : une photo déjà vérifiée, par exemple
    let cand = /^\d+$/.test(num) ? cands[Number(num)] : null
    if (!cand && !/^\d+$/.test(num)) {
      const titre = 'File:' + decodeURIComponent(num.replace(/^.*File:/, '')).replace(/^File:/, '')
      const j = await api({ action: 'query', titles: titre, prop: 'imageinfo', iiprop: 'url|size|user|extmetadata' })
      const p = Object.values(j.query?.pages || {})[0]; const ii = p?.imageinfo?.[0]
      if (!ii) throw new Error(`${titre} introuvable sur Commons`)
      const meta = ii.extmetadata || {}; const licence = meta.LicenseShortName?.value || ''
      if (!LICENCES_OK.test(licence)) throw new Error(`${titre} : licence « ${licence} » refusée`)
      cand = { titre: p.title, url: ii.url, page: ii.descriptionurl, auteur: auteurDe(meta, ii), licence }
    }
    if (!cand) throw new Error(`candidat ${num} inconnu`)
    cand.auteur = auteurDe({ Artist: { value: cand.auteur } }, { user: cand.auteur.split(/[.,;(]/)[0] })   // une planche d'avant la règle « un nom, pas une phrase »
    const r = await fetch(cand.url, { headers: { 'User-Agent': UA } })
    if (!r.ok) throw new Error(`${cand.titre} : ${r.status}`)
    const orig = sharp(Buffer.from(await r.arrayBuffer())).rotate()
    // 720 : la largeur qu'un téléphone (412 px × 1,75) choisit ; sans elle, il prend 960 et le LCP mobile passe 2,5 s (14/09)
    for (const l of LARGEURS) {
      const base = orig.clone().resize({ width: l, withoutEnlargement: true })
      await base.clone().webp({ quality: l === 1600 ? 76 : 72 }).toFile(path.join(images, `${nom}-${l}.webp`))
      await base.clone().avif({ quality: l === 1600 ? 50 : 46 }).toFile(path.join(images, `${nom}-${l}.avif`))
    }
    const { width, height } = await sharp(path.join(images, `${nom}-1600.webp`)).metadata()
    // une entrée par fichier (le juge rapproche chaque image du dossier d'une attribution), la première porte le 1600 webp
    for (const l of [...LARGEURS].reverse()) for (const ext of ['webp', 'avif']) attributions.push({ fichier: `images/${nom}-${l}.${ext}`, base: nom, largeur: width, hauteur: height, legende, alt: legende, auteur: cand.auteur, licence: licenceJuge(cand.licence), source: cand.page, titre_commons: cand.source === 'openverse' ? undefined : cand.titre, origine: cand.source === 'openverse' ? { via: 'openverse', fournisseur: cand.fournisseur, image: cand.url } : undefined })
    console.log(`  ✓ ${nom} ← ${cand.titre.replace(/^File:/, '').slice(0, 60)} (${cand.auteur}, ${cand.licence}) ${width}×${height}`)
    await new Promise((r) => setTimeout(r, 400))
  }
  fs.writeFileSync(path.join(DEMOS, metier, 'attributions.json'), JSON.stringify(attributions, null, 1))
  console.log(`${metier} : ${attributions.length} photos, attributions.json écrit`)
}

const [mode, metier, ...choix] = process.argv.slice(2)
if (mode === 'chercher') await chercher(metier)
else if (mode === 'prendre') await prendre(metier, choix)
else { console.error('usage : chercher <metier> | prendre <metier> <n:nom:"légende"> …'); process.exit(2) }
