// scripts/relief-profondeur.mjs — la carte de profondeur du relief du héros (Lestraque, bureau seulement).
//
// Aucun modèle d'IA : la carte est CALCULÉE depuis la photo affichée (images/heros-escalier-1600.webp, lue et jamais écrite),
// par deux termes.
//   1. La géométrie : un escalier hélicoïdal vu d'en haut descend d'un tour à chaque anneau, et le rayon apparent de chaque
//      tour décroît à peu près géométriquement avec la profondeur. La profondeur suit donc le logarithme de la distance à l'œil
//      de la spirale : 0 (loin) dans l'œil, 1 (près) sur le limon extérieur et la main courante du premier plan.
//   2. Les contours tirés de l'image : un passe-haut de la luminance. Le nez des marches éclairées avance un peu, les joints
//      sombres reculent un peu, et le relief épouse le dessin des marches au lieu d'un cône lisse.
// La carte est lissée : un déplacement de quelques pixels sur une carte lisse ne déchire jamais l'image.
//
// L'œil est cherché dans l'image : c'est le point le plus sombre d'une luminance très floutée, dans la zone centrale.
// Sortie : public/sites-demo/lestraque/relief/escalier-profondeur.webp (niveaux de gris, même cadrage 4:3 que la photo) et,
// sur la sortie standard, la position de l'œil à reporter dans da.json → relief.oeil.
//
// Usage : node scripts/relief-profondeur.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const SITE = path.join(RACINE, 'public', 'sites-demo', 'lestraque')
const SOURCE = path.join(SITE, 'images', 'heros-escalier-1600.webp')
const SORTIE = path.join(SITE, 'relief', 'escalier-profondeur.webp')
const L = 480, H = 360

const brut = async (entree, flou = 0) => {
  let s = Buffer.isBuffer(entree) ? sharp(entree, { raw: { width: L, height: H, channels: 1 } }) : sharp(entree).resize(L, H, { fit: 'fill' })
  if (flou) s = s.blur(flou)
  // un seul canal : greyscale() seul garde trois canaux en sortie brute (tampon entrelacé, carte en diagonales fausses)
  const { data, info } = await s.toColourspace('b-w').extractChannel(0).raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 1 || data.length !== L * H) throw new Error(`tampon de ${info.channels} canaux et ${data.length} octets (1 et ${L * H} attendus)`)
  return Float32Array.from(data, (v) => v / 255)
}
const enOctets = (f) => Buffer.from(Uint8Array.from(f, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255)))

const lum = await brut(SOURCE)
const lumFloue = await brut(SOURCE, 14)

// 1. L'œil : le minimum de la luminance floutée dans la zone centrale (30–60 % en largeur, 20–60 % en hauteur)
let ox = 0, oy = 0, min = Infinity
for (let y = Math.round(H * 0.2); y < H * 0.6; y++) for (let x = Math.round(L * 0.3); x < L * 0.6; x++) {
  const v = lumFloue[y * L + x]
  if (v < min) { min = v; ox = x; oy = y }
}

// 2. La géométrie : log de la distance à l'œil, normalisé entre le rayon du puits (r0) et le rayon du limon extérieur (r1)
const r0 = L * 0.035, r1 = L * 0.85
const prof = new Float32Array(L * H)
for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
  const r = Math.max(r0, Math.hypot(x - ox, y - oy))
  const g = Math.min(1, Math.log(r / r0) / Math.log(r1 / r0))
  // exposant > 1 : le log seul saturait (carte presque blanche au-delà du premier anneau) ; la pente reste sur toute la spirale
  prof[y * L + x] = Math.pow(g, 1.35)
}

// 3. Les contours : passe-haut de la luminance (détail moyen, pas le grain), pondéré hors du puits
const lumMoyenne = await brut(enOctets(lum), 6)
const lumDetail = await brut(enOctets(lum), 1.2)
for (let i = 0; i < prof.length; i++) {
  const passeHaut = lumDetail[i] - lumMoyenne[i]
  prof[i] = prof[i] + passeHaut * 0.55 * Math.min(1, prof[i] * 2.5)
}

// 4. Le lissage final : pas de marche d'escalier dans la carte elle-même
const lisse = await sharp(enOctets(prof), { raw: { width: L, height: H, channels: 1 } }).blur(2.2).toColourspace('b-w').webp({ quality: 90, smartSubsample: false }).toBuffer()
fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
fs.writeFileSync(SORTIE, lisse)

const oeil = [+(ox / L).toFixed(3), +(oy / H).toFixed(3)]
console.log(`  ✓ carte de profondeur : ${path.relative(RACINE, SORTIE)} (${L}×${H}, ${(lisse.length / 1024).toFixed(1)} Ko)`)
console.log(`    œil de la spirale : ${JSON.stringify(oeil)} (fractions de la largeur et de la hauteur) → da.json → relief.oeil`)
