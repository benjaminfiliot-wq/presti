// Vérif animation (Apple) — capture l'entrée du hero + les cascades révélées, en local.
// Usage : node scripts/shot-anim.mjs [url]
import { chromium } from 'playwright'
import fs from 'fs'

const url = process.argv[2] || 'http://localhost:3000'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/anim'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

// On capture l'entrée du hero dès le début (domcontentloaded, pas load).
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
for (const t of [180, 420, 750, 1300]) {
  await page.waitForTimeout(t === 180 ? 180 : t - [180, 420, 750, 1300][[180, 420, 750, 1300].indexOf(t) - 1])
  await page.screenshot({ path: `${OUT}/hero-${t}ms.png` })
  console.log('hero', t + 'ms')
}

// Cascade réassurance : scroll juste avant, capture pendant le stagger puis settled.
const scrollTo = async (sel, off = -120) => page.evaluate(([s, o]) => { const el = document.querySelector(s); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + o) }, [sel, off])

await scrollTo('.lp-reassure'); await page.waitForTimeout(180)
await page.screenshot({ path: `${OUT}/reassure-mid.png` }); await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/reassure-set.png` })

await scrollTo('#tarifs', -40); await page.waitForTimeout(180)
await page.screenshot({ path: `${OUT}/tarifs-mid.png` }); await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/tarifs-set.png` })

// Contrôle : aucun enfant de cascade ne reste caché après settle.
const stuck = await page.evaluate(() => {
  const kids = [...document.querySelectorAll('.reveal-kids > *')]
  const hidden = kids.filter((k) => parseFloat(getComputedStyle(k).opacity) < 0.9)
  return { total: kids.length, hidden: hidden.length }
})
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log('reveal-kids:', JSON.stringify(stuck), '| hOverflow:', overflow)

await browser.close()
console.log(stuck.hidden === 0 && overflow <= 0 ? '✅ OK (rien de bloqué, pas d overflow)' : '🔴 A VERIFIER')
