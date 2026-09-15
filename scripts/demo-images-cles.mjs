// scripts/demo-images-cles.mjs [--viewport=<largeur>x<hauteur>] <dossier du site> <dossier de sortie> — la démo regardée
// comme les références : des images-clés du héros qui joue (0,6 s, 2,5 s, 5 s, 8 s, sans défiler), puis la page à 30 %,
// 60 % et en bas, sur bureau (1280×800 par défaut). L'option permet de reprendre exactement le format de la grille à
// l'aveugle (1088×800) sans modifier les captures du téléphone ;
// et le mobile (390×844) à 2,5 s et à mi-page. Une planche 4 × N (planche-demo.jpg), au même format que
// .orchestre/preuves/refs/planche-refs.jpg, pour noter la démo sur la grille C1–C8 côte à côte avec les références.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const argumentsLigne = process.argv.slice(2)
const optionsViewport = argumentsLigne.filter((argument) => argument.startsWith('--viewport'))
if (optionsViewport.length > 1) {
  console.error('Option --viewport invalide : indiquez une seule valeur au format <largeur>x<hauteur> (ex. 1088x800).')
  process.exit(1)
}
const dimensionsViewport = optionsViewport[0]?.match(/^--viewport=([1-9]\d*)x([1-9]\d*)$/)
if (optionsViewport.length && (!dimensionsViewport || !Number.isSafeInteger(Number(dimensionsViewport[1])) || !Number.isSafeInteger(Number(dimensionsViewport[2])))) {
  console.error('Option --viewport invalide : largeur et hauteur doivent être des entiers strictement positifs (ex. 1088x800).')
  process.exit(1)
}
const viewportBureau = dimensionsViewport
  ? { width: Number(dimensionsViewport[1]), height: Number(dimensionsViewport[2]) }
  : { width: 1280, height: 800 }
const [dossier, sortie] = argumentsLigne.filter((argument) => !argument.startsWith('--'))
fs.mkdirSync(sortie, { recursive: true })
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain', json: 'application/json' }
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(dossier, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
await new Promise((r) => srv.listen(0, r))
const url = `http://127.0.0.1:${srv.address().port}/`
const nav = await chromium.launch()
const images = []
const prendre = async (page, nom, etiquette) => { const f = path.join(sortie, `${nom}.png`); await page.screenshot({ path: f }); images.push({ f, etiquette }) }
{
  const ctx = await nav.newContext({ viewport: viewportBureau }); const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const t0 = Date.now(), attendre = async (ms) => { const reste = ms - (Date.now() - t0); if (reste > 0) await page.waitForTimeout(reste) }
  for (const [ms, nom] of [[600, 'bureau-t06'], [2500, 'bureau-t25'], [5000, 'bureau-t50'], [8000, 'bureau-t80']]) { await attendre(ms); await prendre(page, nom, `héros ${ms / 1000} s`) }
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (const [f, nom] of [[0.3, 'bureau-d30'], [0.6, 'bureau-d60'], [1, 'bureau-d100']]) {
    await page.evaluate(async (y) => { for (let v = window.scrollY; v < y; v += 300) { window.scrollTo(0, v); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, y) }, Math.round(f * (h - viewportBureau.height)))
    await page.waitForTimeout(1400); await prendre(page, nom, `défilement ${Math.round(f * 100)} %`)
  }
  await page.screenshot({ path: path.join(sortie, 'bureau-page.png'), fullPage: true })
  await ctx.close()
}
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500)
  await prendre(page, 'mobile-t25', 'mobile héros 2,5 s')
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.evaluate(async (y) => { for (let v = 0; v < y; v += 300) { window.scrollTo(0, v); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, y) }, Math.round(h * 0.45))
  await page.waitForTimeout(1400); await prendre(page, 'mobile-d45', 'mobile défilement 45 %')
  await ctx.close()
}
await nav.close(); srv.close()
// la planche : 4 colonnes de 320×200 (le mobile recadré), étiquettes comme planche-refs.jpg
const L = 320, H = 200, cases = []
for (let i = 0; i < images.length; i++) {
  const v = await sharp(images[i].f).resize(L, H, { fit: 'cover', position: 'top' }).toBuffer()
  const e = Buffer.from(`<svg width="${L}" height="${H}"><rect width="${L}" height="22" fill="#000" opacity=".65"/><text x="6" y="16" font-size="12" font-family="sans-serif" fill="#fff">démo lestraque · ${images[i].etiquette}</text></svg>`)
  cases.push({ input: await sharp(v).composite([{ input: e, top: 0, left: 0 }]).toBuffer(), left: (i % 4) * (L + 6), top: Math.floor(i / 4) * (H + 6) })
}
const lignes = Math.ceil(images.length / 4)
await sharp({ create: { width: 4 * (L + 6) - 6, height: lignes * (H + 6) - 6, channels: 3, background: '#111' } }).composite(cases).jpeg({ quality: 84 }).toFile(path.join(sortie, 'planche-demo.jpg'))
console.log(`${images.length} images-clés + page entière → ${path.join(sortie, 'planche-demo.jpg')}`)
