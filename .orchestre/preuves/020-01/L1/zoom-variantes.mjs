// zoom-variantes.mjs — recadrages 1:1 (1088×800) : marches, œil, limon de droite ; témoin, V3 à 2,5 s et 5 s. Lecture des JPEG de variantes/.
import { createRequire } from 'node:module'
import { DOSSIER } from './commun.mjs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json'); const sharp = require('sharp')
const D = DOSSIER + 'variantes/'
const v = process.argv[2] || 'v3-deux-faisceaux-10s-fort', court = v.split('-')[0].toUpperCase()
const srcs = [['témoin t25', 'temoin-1088x800-t25.jpg'], [court + ' t25', v + '-1088x800-t25.jpg'], [court + ' t50', v + '-1088x800-t50.jpg']]
const zones = [['marches', { left: 113, top: 107, width: 264, height: 267 }], ['oeil', { left: 320, top: 188, width: 240, height: 240 }], ['limon', { left: 760, top: 80, width: 300, height: 300 }]]
const cases = []; let y = 0, W = 0
for (const [zn, z] of zones) {
  let x = 0
  for (const [n, f] of srcs) {
    const b = await sharp(D + f).extract(z).toBuffer()
    const e = Buffer.from(`<svg width="${z.width}" height="20"><rect width="${z.width}" height="20" fill="#000" opacity=".7"/><text x="4" y="14" font-size="12" font-family="Arial" fill="#fff">${zn} · ${n}</text></svg>`)
    cases.push({ input: await sharp(b).composite([{ input: e, top: 0, left: 0 }]).toBuffer(), left: x, top: y }); x += z.width + 6
  }
  W = Math.max(W, x); y += z.height + 6
}
await sharp({ create: { width: W, height: y, channels: 3, background: '#222' } }).composite(cases).jpeg({ quality: 90 }).toFile(D + 'zoom-' + court.toLowerCase() + '.jpg')
console.log('ok', W, y)
