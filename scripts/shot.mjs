// Capture d'écran headless (Playwright) — me permet de VOIR le rendu animé du site.
// Usage : node scripts/shot.mjs [url]
import { chromium } from 'playwright'
import fs from 'fs'

const url = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'load', timeout: 45000 })
await page.waitForTimeout(1500) // polices + reveal

const shoot = async (name, y) => {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(750) // laisser l'anim se poser
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name, '@y=' + Math.round(y))
}

const info = await page.evaluate(() => ({
  scenes: [...document.querySelectorAll('.lp-scene')].map((s) => ({ top: s.offsetTop, h: s.offsetHeight })),
  tarifs: document.querySelector('#tarifs')?.offsetTop || 0,
  pageH: document.body.scrollHeight,
}))

await shoot('01-hero', 0)
const [s0, s1, s2] = info.scenes
if (s0) { await shoot('02-devis-early', s0.top + s0.h * 0.14); await shoot('03-devis-mid', s0.top + s0.h * 0.45); await shoot('04-devis-late', s0.top + s0.h * 0.82) }
if (s1) await shoot('05-relances-mid', s1.top + s1.h * 0.6)
if (s2) await shoot('06-dashboard-mid', s2.top + s2.h * 0.55)
if (info.tarifs) await shoot('07-tarifs', info.tarifs - 60)

await browser.close()
console.log('OK — shots dans', OUT)
