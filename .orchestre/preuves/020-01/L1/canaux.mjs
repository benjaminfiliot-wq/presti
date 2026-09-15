import { createRequire } from 'node:module'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
const { chromium } = require('playwright'); const sharp = require('sharp')
const nav = await chromium.launch(); const ctx = await nav.newContext({ viewport: { width: 1088, height: 800 } }); const page = await ctx.newPage()
await page.setContent('<body style="background:#843">x</body>')
const png = await page.screenshot({ type: 'png' }), jpg = await page.screenshot({ type: 'jpeg', quality: 92 })
for (const [n, b] of [['png', png], ['jpeg', jpg]]) { const m = await sharp(b).metadata(); const r = await sharp(b).resize(160).greyscale().raw().toBuffer({ resolveWithObject: true }); console.log(n, 'canaux', m.channels, 'alpha', m.hasAlpha, '→ gris', r.info.channels, 'octets', r.data.length, r.info.width + 'x' + r.info.height) }
await nav.close()
