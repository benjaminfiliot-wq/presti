// Enregistre une vidéo de la landing : entrée du hero + scroll dans les révélations.
// Usage : node scripts/shot-video.mjs [url]
import { chromium } from 'playwright'
import fs from 'fs'

const url = process.argv[2] || 'http://localhost:3100'
const DIR = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/vid'
fs.mkdirSync(DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  recordVideo: { dir: DIR, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(2000) // on laisse jouer l'entrée du hero

// scroll doux par paliers → déclenche les cascades une à une
const H = await page.evaluate(() => document.body.scrollHeight)
const steps = 26
for (let i = 1; i <= steps; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), (H * i) / steps)
  await page.waitForTimeout(180)
}
await page.waitForTimeout(700)

await page.close()
await context.close() // la vidéo est écrite à la fermeture du contexte
await browser.close()
const f = fs.readdirSync(DIR).filter((x) => x.endsWith('.webm')).map((x) => `${DIR}/${x}`)
console.log('VIDEO:', f[f.length - 1])
