// carte-lumiere.mjs <variante> — où agit le calque : gris 128 + 3 × (calque présent − calque masqué), 1088×800, à 5 s et 5 s + P/4.
// Sans carte graphique ; animations figées. Écrit variantes/carte-<variante>.jpg.
import { chromium, sharp, DOSSIER, bloc, ouvrir, poser } from './commun.mjs'
import { VARIANTES } from './variantes-def.mjs'
const nom = process.argv[2], p = VARIANTES[nom], css = bloc(p)
const SANS = 'html.js.da--signature .ouverture>.hero--plein .hero__media::before{display:none!important}'
const nav = await chromium.launch()
const vp = { width: 1088, height: 800 }
const { ctx, page } = await ouvrir(nav, vp, css)
const cases = []
let x = 0
for (const t of [5000, 5000 + p.P * 250]) {
  await poser(page, t); const on = await page.screenshot({ type: 'png' })
  const tag = await page.addStyleTag({ content: SANS }); await poser(page, t); const off = await page.screenshot({ type: 'png' }); await tag.evaluate((e) => e.remove())
  const A = await sharp(on).greyscale().raw().toBuffer(), B = await sharp(off).greyscale().raw().toBuffer()
  const C = Buffer.alloc(A.length); for (let i = 0; i < A.length; i++) C[i] = Math.max(0, Math.min(255, 128 + 3 * (A[i] - B[i])))
  const img = await sharp(C, { raw: { width: vp.width, height: vp.height, channels: 1 } }).resize(544).png().toBuffer()
  cases.push({ input: img, left: x, top: 0 }); x += 550
}
await sharp({ create: { width: x - 6, height: 400, channels: 3, background: '#000' } }).composite(cases).jpeg({ quality: 88 }).toFile(DOSSIER + `variantes/carte-${nom}.jpg`)
await ctx.close(); await nav.close()
console.log('ok')
