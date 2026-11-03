// Découpe une page rendue en tuiles d'écran (viewport) pour les relire une à une.
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(path.join(process.cwd(), 'package.json'))
const [,, html, largeur, prefixe, hauteur = '1100', scale = '0.6'] = process.argv
const { chromium } = require('playwright')
const nav = await chromium.launch({ args: ['--no-sandbox'] })
const p = await nav.newPage({ viewport: { width: +largeur, height: +hauteur }, deviceScaleFactor: +scale })
await p.goto(pathToFileURL(html).href); await p.waitForTimeout(2200)
const H = await p.evaluate(() => document.documentElement.scrollHeight)
let i = 0
for (let y = 0; y < H; y += +hauteur) { await p.screenshot({ path: `${prefixe}-${String(i++).padStart(2, '0')}.png`, clip: { x: 0, y, width: +largeur, height: Math.min(+hauteur, H - y) }, fullPage: true }) }
console.log(i, 'tuiles')
await nav.close()
