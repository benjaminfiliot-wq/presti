// scripts/fixtures/026-pilotage/p/fabriquer-atlas.mjs — fabrique l'atlas composite de l'ATELIER TÉMOIN du lot p (026-168),
// sur l'usine, à partir du seul lot A (~/station-assets, lu, jamais écrit). Ce n'est pas la planche livrée (026-169) : c'est
// l'implémentation de référence minimale qui prouve que station-planche-qa sait rendre 0 (JA-7 de 026-012).
//
//   node scripts/fixtures/026-pilotage/p/fabriquer-atlas.mjs --sortie=<chemin sous .orchestre/travail/>
//
// Puis copier la sortie dans scripts/fixtures/026-pilotage/p/temoin/atelier-temoin/planche/atlas.png.temoin (l'atelier témoin
// est cité « atelier: racine » par le planche.md du témoin : aucun sha à reporter ; le contrôle JA-3 du lot vérifie l'atlas).
//
// L'atlas fait 256 × 256 ; chaque pixel est ramené à la couleur la plus proche de PALETTE (opaque), ou transparent (alpha
// < 128). Les régions (x, y, l, h), reprises telles quelles par temoin/atelier-temoin/planche/planche.js.temoin :
//   RP   0,   0, 128, 128  Rotting Pixels, sci-fi-tileset.png (tuiles 16 px)
//   ZM 128,   0, 112,  64  zwonky, spacermale.png (7 poses × 4 couleurs, 16 px ; le gris du fond, pixel 0,0, devient transparent)
//   ZF 128,  64, 112,  64  zwonky, spacerfemale.png
//   TL   0, 128, 128,  64  Ansimuz Tech Lab vol. 1, Tileset.png (coin haut gauche)
//   KF 128, 128, 128,  32  Kenney Tiny Factory, tile_0000 à tile_0015 (8 par rangée), redessinées dans la palette
//   SP   0, 192, 128,  32  Shade, Puny Characters, Character-Base.png (4 premières cases de 32 px), repeintes
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const sharp = createRequire(path.join(R, 'package.json'))('sharp')
const LOT_A = path.join(os.homedir(), 'station-assets')
// La palette de l'atelier témoin : 28 couleurs (fond violet nuit, métal froid sur 4 tons, néons magenta et cyan, peaux,
// couleurs d'agents). La même liste, dans le même ordre, est dans temoin/atelier-temoin/planche/planche.js.temoin et dans le planche.md du témoin.
const PALETTE = [
  '#0b0418', '#1b0b33', '#2a1450', '#3d1f6e', '#12131f', '#2b3040', '#4a5266', '#8a93a8',
  '#ff3cc7', '#ff9be8', '#26e0f0', '#b6f7ff', '#f2c7a0', '#c98a5e', '#7a4a2e', '#ff6ad5',
  '#2fc6e0', '#f2d15c', '#3bd16f', '#4d7cff', '#ff4d6d', '#000000', '#ffffff', '#5a2d0c',
  '#9b6b3a', '#1e5b3a', '#6b2140', '#e8e0f0',
]
const RP = '04-rottingpixels-scifi-tileset/fichiers/Sci-Fi Platformer Tileset [16x16][FREE] - RottingPixels/sci-fi-tileset.png'
const SOURCES = [
  { f: RP, x: 0, y: 0 },
  { f: '05-zwonky-spacers/fichiers/spacermale.png', x: 128, y: 0, fond: true },
  { f: '05-zwonky-spacers/fichiers/spacerfemale.png', x: 128, y: 64, fond: true },
  { f: '07-ansimuz-tech-lab/fichiers/vol1/Top Down Lab files/Tileset.png', x: 0, y: 128, extraire: { left: 0, top: 0, width: 128, height: 64 } },
  ...Array.from({ length: 16 }, (_, i) => ({ f: `06-kenney-tiny-factory/fichiers/Tiles/tile_${String(i).padStart(4, '0')}.png`, x: 128 + (i % 8) * 16, y: 128 + Math.floor(i / 8) * 16 })),
  { f: '09-shade-puny-characters/fichiers/Puny-Characters/Character-Base.png', x: 0, y: 192, extraire: { left: 0, top: 0, width: 128, height: 32 } },
]

const sortie = process.argv.slice(2).find((a) => a.startsWith('--sortie='))?.slice(9)
if (!sortie || !path.resolve(R, sortie).startsWith(path.join(R, '.orchestre', 'travail') + path.sep)) {
  console.error('usage : --sortie=<chemin sous .orchestre/travail/>')
  process.exit(2)
}
const PAL = PALETTE.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])
const proche = (r, g, b) => { let m = 0, d = Infinity; for (let i = 0; i < PAL.length; i++) { const [a, c, e] = PAL[i]; const x = (r - a) ** 2 + (g - c) ** 2 + (b - e) ** 2; if (x < d) { d = x; m = i } } return PAL[m] }
const L = 256, H = 256
const atlas = Buffer.alloc(L * H * 4)
for (const s of SOURCES) {
  let img = sharp(path.join(LOT_A, s.f)).ensureAlpha()
  if (s.extraire) img = img.extract(s.extraire)
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const fond = s.fond ? [data[0], data[1], data[2]] : null
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const tx = s.x + x, ty = s.y + y
    if (tx >= L || ty >= H) continue
    const p = (y * info.width + x) * 4, q = (ty * L + tx) * 4
    if (data[p + 3] < 128 || (fond && data[p] === fond[0] && data[p + 1] === fond[1] && data[p + 2] === fond[2])) { atlas[q] = atlas[q + 1] = atlas[q + 2] = atlas[q + 3] = 0; continue }
    const [r, g, b] = proche(data[p], data[p + 1], data[p + 2])
    atlas[q] = r; atlas[q + 1] = g; atlas[q + 2] = b; atlas[q + 3] = 255
  }
}
const f = path.resolve(R, sortie)
fs.mkdirSync(path.dirname(f), { recursive: true })
await sharp(atlas, { raw: { width: L, height: H, channels: 4 } }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toFile(f)
console.log(`atlas ${L}×${H} écrit dans ${path.relative(R, f)} : ${fs.statSync(f).size} octets, ${SOURCES.length} sources du lot A, palette de ${PALETTE.length} couleurs`)
