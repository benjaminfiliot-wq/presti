// Capture d'écran headless (Playwright) — desktop ou mobile.
// Usage : node scripts/shot.mjs [url] [desktop|mobile]
import { chromium } from 'playwright'
import fs from 'fs'

const url = process.argv[2] || 'https://prestiapp.fr'
const mode = process.argv[3] || 'desktop'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })

const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })
await page.goto(url, { waitUntil: 'load', timeout: 45000 })
await page.waitForTimeout(1500)

const pfx = mode === 'mobile' ? 'm-' : 'd-'
const shoot = async (name, y) => {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(650)
  await page.screenshot({ path: `${OUT}/${pfx}${name}.png` })
  console.log('shot', pfx + name, '@y=' + Math.round(y))
}

const info = await page.evaluate(() => ({
  scenes: [...document.querySelectorAll('.lp-scene')].map((s) => ({ top: s.offsetTop, h: s.offsetHeight })),
  tarifs: document.querySelector('#tarifs')?.offsetTop || 0,
  hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}))
console.log('hOverflow=' + info.hOverflow)

await shoot('01-hero', 0)
const [s0, s1, s2] = info.scenes
if (s0) for (const [i, f] of [0.12, 0.32, 0.52, 0.82].entries()) await shoot(`02-devis-${i}`, s0.top + s0.h * f)
if (s1) await shoot('03-relances', s1.top + s1.h * 0.62)
if (s2) await shoot('04-dashboard', s2.top + s2.h * 0.55)
if (info.tarifs) await shoot('05-tarifs', info.tarifs - 40)

await browser.close()
console.log('OK', mode)
