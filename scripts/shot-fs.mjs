// Capture la vitrine interactive : clique chaque onglet + laisse la démo se jouer.
import { chromium } from 'playwright'
const url = process.argv[2] || 'http://localhost:3000'
const mode = process.argv[3] || 'desktop'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: vp, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })
await page.goto(url, { waitUntil: 'load', timeout: 45000 })
await page.waitForTimeout(1200)
await page.evaluate(() => document.querySelector('#fonctionnalites')?.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(500)
const tabs = await page.$$('.fs-tab')
console.log('tabs:', tabs.length)
const pfx = mode === 'mobile' ? 'mfs' : 'fs'
for (let i = 0; i < tabs.length; i++) {
  await tabs[i].click()
  await page.waitForTimeout(2700)
  await page.screenshot({ path: `${OUT}/${pfx}-${i}.png` })
  console.log('shot', pfx + '-' + i)
}
await browser.close()
console.log('OK', mode)
