// Capture l'onglet "Facturation" de la vitrine interactive.
import { chromium } from 'playwright'
import fs from 'fs'
const url = process.argv[2] || 'http://localhost:3100'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/anim'
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'load', timeout: 45000 })
await page.evaluate(() => document.querySelector('#fonctionnalites')?.scrollIntoView())
await page.waitForTimeout(500)
const tab = page.locator('.fs-tab', { hasText: 'Facturation' })
await tab.click()
await page.waitForTimeout(1400)
await page.screenshot({ path: `${OUT}/facture-tab-mid.png` })
await page.waitForTimeout(1600)
await page.screenshot({ path: `${OUT}/facture-tab-set.png` })
const selected = await tab.getAttribute('aria-selected')
const docText = await page.locator('.fs-doc').innerText().catch(() => '')
console.log('onglet Facturation aria-selected =', selected)
console.log('contenu démo:', docText.replace(/\n/g, ' | ').slice(0, 160))
await browser.close()
