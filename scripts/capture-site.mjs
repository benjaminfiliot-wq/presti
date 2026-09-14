// capture-site.mjs <dossier du site> <préfixe de sortie> [chemin=/] — sert le dossier, ouvre la page en bureau et en
// mobile, laisse passer le rideau, défile pour déclencher les dévoilements, et capture (page entière + haut de page).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const [dossier, prefixe, chemin = '/'] = process.argv.slice(2)
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain', json: 'application/json', svg: 'image/svg+xml' }
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(dossier, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
await new Promise((r) => srv.listen(0, r))
const port = srv.address().port
const nav = await chromium.launch()
for (const [nom, vp] of [['bureau', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1 }); const page = await ctx.newPage()
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })
  await page.goto(`http://127.0.0.1:${port}${chemin}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${prefixe}-${nom}-haut.png` })
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)) } window.scrollTo(0, 0) })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${prefixe}-${nom}.png`, fullPage: true })
  const mesure = await page.evaluate(() => ({ hauteur: document.documentElement.scrollHeight, largeurDoc: document.documentElement.scrollWidth, reveals: document.querySelectorAll('.reveal').length, vus: document.querySelectorAll('.reveal.vu').length, nonVus: [...document.querySelectorAll('.reveal:not(.vu)')].map((e) => e.className.replace(/\s*reveal\s*/, ' ').trim() + '@' + Math.round(e.getBoundingClientRect().top + scrollY)).slice(0, 6), polices: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join(', ') }))
  console.log(`${nom} : ${JSON.stringify(mesure)}${erreurs.length ? ' · erreurs : ' + erreurs.join(' | ').slice(0, 300) : ''}`)
  await ctx.close()
}
await nav.close(); srv.close()
