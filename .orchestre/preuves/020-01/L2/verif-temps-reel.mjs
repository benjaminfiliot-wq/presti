// verif-temps-reel.mjs <variante> — une image positionnée ressemble-t-elle à une capture en temps réel au même instant ?
// 1088×800, sans carte graphique. Page en marche normale : on lit le currentTime de chaque animation juste avant et juste après
// une capture PNG en temps réel, puis on met tout en pause et on place chaque animation au milieu (et aux deux bornes) de ce
// qu'elle a parcouru pendant la capture ; on recapture et on compare (réduction grise 160 px, écart et part > 8).
import fs from 'node:fs'
import { chromium, sharp, TRAVAIL, bloc, gris, ecart, ouvrir, deuxImages } from './outils.mjs'
const [nom] = process.argv.slice(2)
const p = JSON.parse(fs.readFileSync(TRAVAIL + `var-${nom}.json`, 'utf8')).params
const css = bloc(p)
const nav = await chromium.launch()
const res = { variante: nom, format: '1088x800', date: new Date().toISOString(), essais: [] }
try {
  const { ctx, page } = await ouvrir(nav, 1088, 800, css)
  for (const attente of [2600, 3300]) {
    await page.waitForTimeout(attente)
    const avant = await page.evaluate(() => { window.__av = document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline); return window.__av.map((a) => a.currentTime) })
    const reel = await page.screenshot({ type: 'png' })
    const apres = await page.evaluate(() => window.__av.map((a) => a.currentTime))
    const noms = await page.evaluate(() => window.__av.map((a) => a.animationName || a.transitionProperty))
    const placer = async (f) => { await page.evaluate((v) => window.__av.forEach((a, i) => { a.pause(); a.currentTime = v[i] }), avant.map((b, i) => b + f * (apres[i] - b))); await deuxImages(page); return page.screenshot({ type: 'png' }) }
    const gR = await gris(reel)
    const e = {}
    for (const [cle, f] of [['borneAvant', 0], ['milieu', 0.5], ['borneApres', 1]]) { const b = await placer(f); e[cle] = ecart(gR, await gris(b)); if (cle === 'milieu') { await sharp(b).jpeg({ quality: 90 }).toFile(TRAVAIL + `verif-positionnee-${attente}.jpg`); res.essais.push({}) } }
    const i = noms.indexOf('l2-glisse')
    // référence de bruit : deux captures positionnées au même instant
    const b1 = await placer(0.5), b2 = await placer(0.5)
    await sharp(reel).jpeg({ quality: 90 }).toFile(TRAVAIL + `verif-temps-reel-${attente}.jpg`)
    res.essais[res.essais.length - 1] = {
      l2Glisse_ms: { avant: +avant[i].toFixed(1), apres: +apres[i].toFixed(1), dureeCapture: +(apres[i] - avant[i]).toFixed(1) },
      animations: noms,
      reelContrePositionnee: e,
      deuxPositionneesIdentiques: ecart(await gris(b1), await gris(b2)),
    }
    console.log(JSON.stringify(res.essais[res.essais.length - 1]))
    await page.evaluate(() => window.__av.forEach((a) => a.play()))
  }
  await ctx.close()
} finally { await nav.close() }
fs.writeFileSync(TRAVAIL + 'verif-temps-reel.json', JSON.stringify(res, null, 1))
