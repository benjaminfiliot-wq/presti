// Témoin de scripts/maquette-qa.mjs (fiche 025-01), écrit par Claude Code : un FAUX scripts/maquette-capturer.mjs, copié par
// maquette-qa --temoin dans l'arbre témoin .orchestre/travail/maquette-qa/temoin/ (voir le faux generer.mjs de ce dossier). Il
// simule l'état « après » de la fiche 025-02 §7 pour prouver que MQ-8 peut passer ; ce n'est pas une implémentation de référence.
//
// node scripts/maquette-capturer.mjs <dossier> : sert <dossier> en local, capture le haut de l'accueil à 1440×900 et à 390×844,
// écrit capture-bureau.jpg et capture-telephone.jpg dans <dossier> ; code 1 si une capture est vide (0 octet ou page unie) ou
// dépasse 1 000 000 octets, code 2 si le dossier n'a pas d'accueil.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const dossier = path.resolve(process.argv[2] || '')
if (!process.argv[2] || !fs.existsSync(path.join(dossier, 'index.html'))) { console.error('usage : node scripts/maquette-capturer.mjs <dossier de maquette avec index.html>'); process.exit(2) }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' }
const srv = http.createServer((q, r) => {
  let rel
  try { rel = decodeURIComponent(new URL(q.url, 'http://l').pathname) } catch { r.writeHead(400); return r.end() }
  let f = path.join(dossier, rel)
  const dedans = path.relative(dossier, f)
  if (dedans.startsWith('..') || path.isAbsolute(dedans)) { r.writeHead(404); return r.end() }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html')
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}`
const { chromium } = await import('playwright')
const sharp = (await import('sharp')).default
const nav = await chromium.launch({ headless: true })
const defauts = []
try {
  for (const [nom, opts] of [['bureau', { viewport: { width: 1440, height: 900 } }], ['telephone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
    const f = path.join(dossier, `capture-${nom}.jpg`)
    fs.rmSync(f, { force: true })
    const ctx = await nav.newContext(opts)
    const page = await ctx.newPage()
    await page.goto(`${base}/`, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready.then(() => 1))
    await page.waitForTimeout(800)
    await page.screenshot({ path: f, type: 'jpeg', quality: 80, scale: 'css' })
    await ctx.close()
    const octets = fs.existsSync(f) ? fs.statSync(f).size : 0
    if (!octets) { defauts.push(`${path.basename(f)} : 0 octet`); continue }
    if (octets > 1_000_000) defauts.push(`${path.basename(f)} : ${octets} octets, 1 000 000 au plus`)
    const st = await sharp(f).greyscale().stats()
    if (st.channels[0].stdev < 8) defauts.push(`${path.basename(f)} : capture unie (écart-type du gris ${st.channels[0].stdev.toFixed(2)})`)
    console.log(`  ${path.basename(f)} : ${octets} octets, écart-type ${st.channels[0].stdev.toFixed(1)}`)
  }
} finally { await nav.close(); srv.close() }
if (defauts.length) { for (const d of defauts) console.error(`✗ ${d}`); process.exit(1) }
