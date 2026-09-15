// analyse-r12.mjs — pourquoi V3 tombe sous 3,0 en 1280×800 : instants, angle des faisceaux, rangées où sont les pixels du p90.
// Lit mesures.json (valeurs de R-12), puis capture l'instant le pire, calque présent et calque masqué. Écrit analyse-r12.json.
import fs from 'node:fs'
import { chromium, sharp, DOSSIER, bloc, ouvrir, poser, SANS_TEXTE } from './commun.mjs'
import { VARIANTES } from './variantes-def.mjs'
const nom = 'v3-deux-faisceaux-10s-fort', p = VARIANTES[nom], m = JSON.parse(fs.readFileSync(DOSSIER + 'mesures.json', 'utf8'))
const out = {}
for (const [cle, f] of Object.entries(m.formats)) {
  const v = f.R12.valeurs
  // faisceaux clairs au départ à 0° et 180° (0° = haut, sens horaire) ; rotate = −360·t/P
  const angle = (t) => ((((-360 * (t % (p.P * 1000))) / (p.P * 1000)) % 180) + 180) % 180
  out[cle] = { min: f.R12.p90min, sous3: v.filter((x) => x[1] < 3).map((x) => [x[0], x[1], +angle(x[0]).toFixed(0)]), pire10: [...v].sort((a, b) => a[1] - b[1]).slice(0, 10).map((x) => [x[0], x[1], +angle(x[0]).toFixed(0)]), meilleur: [...v].sort((a, b) => b[1] - a[1])[0] }
}
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const nav = await chromium.launch()
for (const vp of [{ width: 1280, height: 800 }]) {
  const cle = `${vp.width}x${vp.height}`, t = out[cle].pire10[0][0]
  const { ctx, page } = await ouvrir(nav, vp, bloc(p))
  await page.addStyleTag({ content: SANS_TEXTE })
  const box = await page.evaluate(() => { const r = document.querySelector('.hero h1').getBoundingClientRect(), c = document.querySelector('.h1__cle').getBoundingClientRect(), l = document.querySelector('.h1__ligne').getBoundingClientRect(); return { h1: [r.x, r.y, r.width, r.height].map(Math.round), cle: [c.y, c.bottom].map(Math.round), ligne: [l.y, l.bottom].map(Math.round) } })
  const mesure = async (buf) => {
    const b = { left: box.h1[0], top: box.h1[1], width: Math.min(box.h1[2], vp.width - box.h1[0]), height: Math.min(box.h1[3], vp.height - box.h1[1]) }
    const { data, info } = await sharp(buf).extract(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const L = new Float64Array(info.width * info.height); for (let i = 0; i < L.length; i++) L[i] = 0.2126 * lin(data[3 * i]) + 0.7152 * lin(data[3 * i + 1]) + 0.0722 * lin(data[3 * i + 2])
    const tri = Float64Array.from(L).sort(), seuil = tri[Math.floor(0.9 * (tri.length - 1))]
    const bandes = []; for (let y0 = 0; y0 < info.height; y0 += 20) { let n = 0; for (let y = y0; y < Math.min(info.height, y0 + 20); y++) for (let x = 0; x < info.width; x++) if (L[y * info.width + x] >= seuil) n++; bandes.push([box.h1[1] + y0, n]) }
    const tiers = [0, 1, 2].map((k) => { let n = 0; for (let y = 0; y < info.height; y++) for (let x = Math.floor(k * info.width / 3); x < Math.floor((k + 1) * info.width / 3); x++) if (L[y * info.width + x] >= seuil) n++; return n })
    return { p90: +(1.05 / (seuil + 0.05)).toFixed(3), pixelsAuDessusDuP90_parBande20px: bandes, parTiersGaucheMilieuDroite: tiers }
  }
  await poser(page, t); const avec = await mesure(await page.screenshot({ type: 'png' }))
  const tag = await page.addStyleTag({ content: 'html.js.da--signature .ouverture>.hero--plein .hero__media::before{display:none!important}' })
  await poser(page, t); const sans = await mesure(await page.screenshot({ type: 'png' })); await tag.evaluate((e) => e.remove())
  out[cle].pireInstant = { t, box, avecCalque: avec, sansCalque: sans }
  await ctx.close()
}
await nav.close()
fs.writeFileSync(DOSSIER + 'analyse-r12.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 0))
