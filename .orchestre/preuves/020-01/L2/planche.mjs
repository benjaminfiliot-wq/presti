// planche.mjs — trois lignes de quatre cases à la même hauteur (300 px) : L2 en 1088×800 (0,6 / 2,5 / 5 / 8 s), puis les
// images-clés de stellar-launch (C2 = 5) et d'art-landing (C2 = 4), presti/.orchestre/preuves/refs/<id>-t0..t3.png.
import fs from 'node:fs'
import { sharp, DIR } from './outils.mjs'
const REFS = 'C:/Users/benja/Documents/presti/.orchestre/preuves/refs/'
const H = 300, L = 408, G = 6, ET = 24
const lignes = [
  { titre: 'L2 lumière rasante · 1088×800 sans carte graphique', images: ['t06', 't25', 't50', 't80'].map((t, i) => [DIR + `instant-1088x800-${t}.jpg`, `L2 · ${['0,6', '2,5', '5', '8'][i]} s`]) },
  { titre: 'stellar-launch (C2 = 5, C6 = 5)', images: [0, 1, 2, 3].map((i) => [REFS + `stellar-launch-t${i}.png`, `stellar-launch · t${i}`]) },
  { titre: 'art-landing (C2 = 4, C6 = 5)', images: [0, 1, 2, 3].map((i) => [REFS + `art-landing-t${i}.png`, `art-landing · t${i}`]) },
]
const cases = []
for (const [j, ligne] of lignes.entries()) {
  for (const [i, [f, etiquette]] of ligne.images.entries()) {
    if (!fs.existsSync(f)) throw new Error('absent : ' + f)
    const v = await sharp(f).resize(L, H, { fit: 'cover', position: 'centre' }).toBuffer()
    const e = Buffer.from(`<svg width="${L}" height="${ET}"><rect width="${L}" height="${ET}" fill="#000" opacity=".7"/><text x="8" y="17" font-size="13" font-family="sans-serif" fill="#fff">${etiquette}</text></svg>`)
    cases.push({ input: await sharp(v).composite([{ input: e, top: 0, left: 0 }]).toBuffer(), left: i * (L + G), top: j * (H + G) })
  }
}
await sharp({ create: { width: 4 * L + 3 * G, height: 3 * H + 2 * G, channels: 3, background: '#111' } }).composite(cases).jpeg({ quality: 88 }).toFile(DIR + 'planche.jpg')
console.log('planche.jpg', 4 * L + 3 * G, '×', 3 * H + 2 * G)
