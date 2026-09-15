import fs from 'node:fs'
import { sharp, DIR } from './outils.mjs'

const REFS = 'C:/Users/benja/Documents/presti/.orchestre/preuves/refs/'
const H = 300, L = 408, G = 6, ET = 24
const lignes = [
  {
    titre: 'RL la cage tourne et la lumière · 1088×800',
    images: ['t06', 't25', 't50', 't80'].map((t, i) => [DIR + `${t}.jpg`, `RL · ${['0,6', '2,5', '5', '8'][i]} s`])
  },
  {
    titre: 'stellar-launch (C2 = 5, C6 = 5)',
    images: [0, 1, 2, 3].map((i) => [REFS + `stellar-launch-t${i}.png`, `stellar-launch · t${i}`])
  },
  {
    titre: 'art-landing (C2 = 4, C6 = 5)',
    images: [0, 1, 2, 3].map((i) => [REFS + `art-landing-t${i}.png`, `art-landing · t${i}`])
  },
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
const sortie = DIR + 'planche.jpg'
await sharp({ create: { width: 4 * L + 3 * G, height: 3 * H + 2 * G, channels: 3, background: '#111' } })
  .composite(cases)
  .jpeg({ quality: 88 })
  .toFile(sortie)

console.log('planche.jpg produite :', fs.statSync(sortie).size, 'octets')
