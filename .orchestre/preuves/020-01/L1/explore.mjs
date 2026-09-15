// explore.mjs — L1 : géométrie de la page en ligne et liste des animations, sans carte graphique. Lecture seule.
import { createRequire } from 'node:module'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
const { chromium } = require('playwright')
const URL = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
const nav = await chromium.launch()
for (const vp of [{ width: 1088, height: 800 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  const ctx = await nav.newContext({ viewport: vp }); const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  const r = await page.evaluate(() => {
    const h1 = document.querySelector('.hero h1').getBoundingClientRect()
    const ligne = document.querySelector('.h1__ligne')?.getBoundingClientRect()
    const media = document.querySelector('.hero--plein .hero__media')
    const m = media.getBoundingClientRect()
    const cs = getComputedStyle(media, '::before'), ca = getComputedStyle(media, '::after')
    return {
      classes: document.documentElement.className,
      ouverture: !!document.querySelector('.ouverture>.hero--plein'),
      relief: document.querySelector('.hero--plein').getAttribute('data-relief-etat'),
      toile: !!document.querySelector('canvas.hero__relief'),
      h1: [h1.x, h1.y, h1.width, h1.height].map(Math.round), ligne: ligne && [ligne.x, ligne.y, ligne.width, ligne.height].map(Math.round),
      media: [m.x, m.y, m.width, m.height].map(Math.round),
      oeil: [0.404 * innerWidth, 0.42 * innerHeight - 0.0255 * innerWidth].map((v) => +v.toFixed(1)),
      avant: { content: cs.content, z: cs.zIndex }, apres: { z: ca.zIndex, pos: ca.position },
      barre: innerWidth - document.documentElement.clientWidth,
      anims: document.getAnimations().map((a) => ({ nom: a.animationName || a.transitionProperty || a.id, cible: a.effect?.target?.className?.toString?.().slice(0, 40) || a.effect?.target?.tagName, pseudo: a.effect?.pseudoElement, doc: a.timeline === document.timeline, t: a.currentTime && typeof a.currentTime === 'number' ? Math.round(a.currentTime) : String(a.currentTime), etat: a.playState })),
      nav: performance.getEntriesByType('navigation')[0].domContentLoadedEventStart,
    }
  })
  console.log(vp.width, JSON.stringify(r, null, 0))
  await ctx.close()
}
await nav.close()
