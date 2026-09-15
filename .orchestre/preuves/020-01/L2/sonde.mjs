// sonde.mjs — état de la page en ligne sans carte graphique : boîtes, animations et leurs chronologies, relief, capture du héros.
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
const { chromium } = require('playwright')
const DIR = 'C:/Users/benja/Documents/presti/.orchestre/preuves/020-01/L2/travail/'
const URL = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
const nav = await chromium.launch()
const out = {}
for (const [W, H] of [[1088, 800], [1280, 800], [1440, 900]]) {
  const ctx = await nav.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(8000)
  const info = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10) }
    return {
      classes: document.documentElement.className,
      relief: document.querySelector('.hero--plein')?.getAttribute('data-relief-etat'),
      ouverture: !!document.querySelector('.ouverture>.hero--plein'),
      hero: r('.ouverture>.hero--plein'), media: r('.hero--plein .hero__media'), picture: r('.hero--plein .hero__media>picture'), img: r('.hero--plein .hero__media img'),
      h1: r('.hero h1'), cle: r('.h1__cle'), ligne: r('.h1__ligne'), pied: r('.hero__pied'), nav: r('.nav'),
      mediaOverflow: getComputedStyle(document.querySelector('.hero--plein .hero__media')).overflow,
      heroOverflow: getComputedStyle(document.querySelector('.hero--plein')).overflow,
      before: getComputedStyle(document.querySelector('.hero--plein .hero__media'), '::before').content,
      anims: document.getAnimations().map((a) => ({ nom: a.animationName || a.transitionProperty || a.id, cible: a.effect?.target?.className?.toString?.().slice(0, 40) || a.effect?.target?.tagName, pseudo: a.effect?.pseudoElement, tl: a.timeline?.constructor?.name, ct: a.currentTime && typeof a.currentTime === 'object' ? String(a.currentTime) : a.currentTime, etat: a.playState })),
    }
  })
  out[`${W}x${H}`] = info
  fs.writeFileSync(DIR + `sonde-${W}x${H}-t8.png`, await page.screenshot({ type: 'png' }))
  await ctx.close()
}
await nav.close()
fs.writeFileSync(DIR + 'sonde.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out, null, 1))
