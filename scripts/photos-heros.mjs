// scripts/photos-heros.mjs — l'étalonnage v4 du héros de Lestraque (l'escalier hélicoïdal), refait DEPUIS L'ORIGINAL Commons.
//
// Pourquoi (2e juge du 14/09) : le contraste v3 (scripts/photos-contraste.mjs) partait du fichier déjà étalonné en v2 et
// multipliait les couleurs par le rapport Y'/Y. Dans les marches éclairées, le rouge et le vert saturaient pendant que le bleu
// restait bas : les marches sortaient en jaune citron fluo, les noirs bouchés, et l'écart-type restait à 68,4 sur les captures
// (70 exigés, priorité 3). On lisait un filtre, pas un bois chaud.
//
// L'étalonnage v4, sur l'original 4608 × 3456 :
//   1. une courbe sur la LUMINANCE seule : points noir et blanc, gamma d'ouverture des tons moyens (le bois), sigmoïde de
//      contraste, plancher léger (le noir du fond reste un noir, les ombres du bois gardent leur veinage) ;
//   2. la couleur est ajoutée à la nouvelle luminance (écart R−Y, G−Y, B−Y), amplifiée avec mesure quand on éclaircit et
//      COMPRIMÉE dans les hautes lumières — c'est ce qui empêche le citron ;
//   3. les hautes lumières tirent vers un crème ambré (la lumière des contremarches), le vert un peu retenu (ambre, pas jaune).
// Puis le paysage (480 à 2880) et le portrait 4:5 du téléphone, recadré pour que l'œil de la spirale tombe à 61 % de la
// hauteur, entre le titre (en haut) et le chapeau (en bas) — en 720, 1080 et 1440 (le 1080 était agrandi 1,28× à 390 px DPR 2).
// Les fichiers d'avant sont sauvegardés dans .orchestre/travail/heros-v3-sauvegarde/ ; attributions.json est réécrit pour les
// deux bases (modifiee, recadrage, réglage, empreinte de l'original).
//
// Usage : node scripts/photos-heros.mjs lestraque --original=<chemin de l'original téléchargé par photos-demo.mjs>
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const opt = (cle) => process.argv.find((x) => x.startsWith(`--${cle}=`))?.slice(cle.length + 3)
const metier = process.argv.slice(2).find((a) => !a.startsWith('--'))
const ORIGINAL = opt('original')
if (!metier || !ORIGINAL) { console.error('usage : node scripts/photos-heros.mjs lestraque --original=<chemin>'); process.exit(2) }

const BASE = 'heros-escalier', PORTRAIT = 'heros-escalier-portrait'
const LARGEURS = [480, 720, 960, 1600, 2400, 2880], LARGEURS_PORTRAIT = [720, 1080, 1440]
// l'œil de la spirale est à (0,404 ; 0,394) de l'original : un 4:5 de 1768 × 2210 px le place à 50 % et à 61 %
const CADRE_PORTRAIT = { left: 978, top: 14, width: 1768, height: 2210 }
// réglage retenu après simulation du cadre 1440 × 900 avec les dégradés de la page (scratchpad v2e/etalon2.mjs, 14/09) :
// vert retenu à 0,8 et crème plus ambré dans les hautes lumières (le 0,87 laissait encore un jaune-vert dans les marches)
const REGLAGE = { version: 4, noir: 0.045, blanc: 0.66, gamma: 0.44, k: 11, pivot: 0.57, plancher: 0.01, saturation: 1.08, ampExp: 0.7, ampMax: 1.85, hautes: 0.72, vert: 0.8, teinte: 0.55, creme: [250, 208, 156] }
// mêmes qualités que photos-demo.mjs (≥ 2400 : AVIF 74 / WebP 84 ; ≥ 1440 : 50 / 76 ; en dessous : 46 / 72)
const qualite = (l) => (l >= 2400 ? { avif: 74, webp: 84 } : l >= 1440 ? { avif: 50, webp: 76 } : { avif: 46, webp: 72 })
// le portrait est l'image LCP du téléphone : en AVIF q50, le 1440 (141 Ko) portait le LCP mobile de l'accueil à 2,7 s
// (Lighthouse, 14/09) ; q42 le ramène vers le poids de l'ancien 1080, le zoom à 200 % sur l'œil reste net
const qualitePortrait = () => ({ avif: 42, webp: 72 })

const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lisse = (a, b, x) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
function etalonner(data, n, p = REGLAGE) {
  const o = Buffer.alloc(n * 3)
  const cr = p.creme.map((v) => v / 255), cl = 0.2126 * cr[0] + 0.7152 * cr[1] + 0.0722 * cr[2]
  const s0 = 1 / (1 + Math.exp(p.k * p.pivot)), s1 = 1 / (1 + Math.exp(-p.k * (1 - p.pivot)))
  const ton = (y) => { let x = c01((y - p.noir) / (p.blanc - p.noir)) ** p.gamma; x = (1 / (1 + Math.exp(-p.k * (x - p.pivot))) - s0) / (s1 - s0); return p.plancher + (1 - p.plancher) * x }
  for (let i = 0; i < n * 3; i += 3) {
    const R = data[i] / 255, G = data[i + 1] / 255, B = data[i + 2] / 255
    const y = 0.2126 * R + 0.7152 * G + 0.0722 * B, y2 = ton(y)
    const amp = Math.min(p.ampMax, y > 1e-3 ? (y2 / y) ** p.ampExp : 1) * p.saturation * (1 - p.hautes * lisse(0.5, 1, y2))
    let r = y2 + (R - y) * amp, g = y2 + (G - y) * amp * p.vert, b = y2 + (B - y) * amp
    const t = p.teinte * lisse(0.45, 0.95, y2)
    r = r * (1 - t) + (y2 * cr[0] / cl) * t; g = g * (1 - t) + (y2 * cr[1] / cl) * t; b = b * (1 - t) + (y2 * cr[2] / cl) * t
    o[i] = Math.round(255 * c01(r)); o[i + 1] = Math.round(255 * c01(g)); o[i + 2] = Math.round(255 * c01(b))
  }
  return o
}
async function vignette(f) {
  const { data } = await sharp(f).resize(480).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let m = 0, q = 0, n = 0
  for (let i = 0; i < data.length; i += 3) { const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; m += v; q += v * v; n++ }
  m /= n; return Math.sqrt(q / n - m * m)
}

const dossier = path.join(RACINE, 'public', 'sites-demo', metier)
const images = path.join(dossier, 'images')
const fAttr = path.join(dossier, 'attributions.json')
const attributions = JSON.parse(fs.readFileSync(fAttr, 'utf8'))
const modele = attributions.find((a) => a.base === BASE)
if (!modele) throw new Error(`${BASE} absente d'attributions.json`)

// garde-fous avant toute écriture : l'original est bien celui de l'escalier (dimensions de la source Commons)
const meta = await sharp(ORIGINAL).metadata()
if (meta.width !== modele.largeur_source || meta.height !== modele.hauteur_source) throw new Error(`${ORIGINAL} : ${meta.width}×${meta.height}, l'original de « ${modele.legende} » fait ${modele.largeur_source}×${modele.hauteur_source}`)
const empreinte = crypto.createHash('sha256').update(fs.readFileSync(ORIGINAL)).digest('hex')

const sauvegarde = path.join(RACINE, '.orchestre', 'travail', 'heros-v3-sauvegarde', metier)
if (!fs.existsSync(sauvegarde)) {
  fs.mkdirSync(sauvegarde, { recursive: true })
  for (const f of fs.readdirSync(images).filter((x) => x.startsWith(`${BASE}-`))) fs.copyFileSync(path.join(images, f), path.join(sauvegarde, f))
}

const { data, info } = await sharp(ORIGINAL).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
const plein = etalonner(data, info.width * info.height)
const png = await sharp(plein, { raw: { width: info.width, height: info.height, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer()
const lignes = []
const commun = { legende: modele.legende, alt: modele.alt, auteur: modele.auteur, licence: modele.licence, source: modele.source, titre_commons: modele.titre_commons, largeur_source: modele.largeur_source, hauteur_source: modele.hauteur_source }
const etalonnage = { ...REGLAGE, depart: `original Commons (sha256 ${empreinte.slice(0, 16)}…)` }
const gestes = 'étalonnée depuis l’original (courbe de luminance, ombres et veinage gardés, hautes lumières ramenées vers un crème ambré et désaturées)'

for (const l of LARGEURS.filter((l) => l <= info.width)) {
  const h = Math.round((l * info.height) / info.width), p = sharp(png).resize(l, h, { kernel: 'lanczos3' })
  await p.clone().webp({ quality: qualite(l).webp }).toFile(path.join(images, `${BASE}-${l}.webp`))
  await p.clone().avif({ quality: qualite(l).avif }).toFile(path.join(images, `${BASE}-${l}.avif`))
  for (const ext of ['webp', 'avif']) lignes.push({ fichier: `images/${BASE}-${l}.${ext}`, base: BASE, largeur: l, hauteur: h, ...commun, modifiee: `Oui — ${gestes} par Presti pour ce site de démonstration`, etalonnage, usage: modele.usage })
}
const recadrage = [CADRE_PORTRAIT.left / info.width, CADRE_PORTRAIT.top / info.height, CADRE_PORTRAIT.width / info.width, CADRE_PORTRAIT.height / info.height].map((x) => Math.round(x * 100000) / 100000)
const pngPortrait = await sharp(png).extract(CADRE_PORTRAIT).png({ compressionLevel: 1 }).toBuffer()
for (const l of LARGEURS_PORTRAIT) {
  const h = Math.round((l * 5) / 4), p = sharp(pngPortrait).resize(l, h, { kernel: 'lanczos3' }).sharpen({ sigma: 0.5 })
  await p.clone().webp({ quality: qualitePortrait(l).webp }).toFile(path.join(images, `${PORTRAIT}-${l}.webp`))
  await p.clone().avif({ quality: qualitePortrait(l).avif }).toFile(path.join(images, `${PORTRAIT}-${l}.avif`))
  for (const ext of ['webp', 'avif']) lignes.push({ fichier: `images/${PORTRAIT}-${l}.${ext}`, base: PORTRAIT, largeur: l, hauteur: h, ...commun, modifiee: `Oui — recadrée en 4:5, ${gestes} par Presti pour ce site de démonstration`, recadrage, etalonnage, usage: modele.usage })
}
// les variantes que plus rien ne produit (l'ancien portrait n'avait pas de 1440 ; rien d'autre ne disparaît)
const garder = new Set(lignes.map((l) => path.basename(l.fichier)))
for (const f of fs.readdirSync(images).filter((x) => (x.startsWith(`${BASE}-`)) && !garder.has(x))) fs.rmSync(path.join(images, f))

const i0 = attributions.findIndex((a) => a.base === BASE || a.base === PORTRAIT)
const reste = attributions.filter((a) => a.base !== BASE && a.base !== PORTRAIT)
reste.splice(Math.min(i0, reste.length), 0, ...lignes)
fs.writeFileSync(fAttr, JSON.stringify(reste, null, 1))

for (const [b, l] of [[BASE, 2880], [PORTRAIT, 1440]]) {
  const f = path.join(images, `${b}-${l}.avif`)
  console.log(`  ✓ ${b}-${l}.avif : ${(fs.statSync(f).size / 1024).toFixed(0)} Ko, écart-type de luminance (vignette 480) ${(await vignette(f)).toFixed(1)}`)
}
for (const l of LARGEURS_PORTRAIT) console.log(`    ${PORTRAIT}-${l} : avif ${(fs.statSync(path.join(images, `${PORTRAIT}-${l}.avif`)).size / 1024).toFixed(0)} Ko, webp ${(fs.statSync(path.join(images, `${PORTRAIT}-${l}.webp`)).size / 1024).toFixed(0)} Ko`)
console.log(`${metier} : attributions.json réécrit pour ${BASE} et ${PORTRAIT} (sauvegarde des fichiers v3 : ${path.relative(RACINE, sauvegarde)})`)
