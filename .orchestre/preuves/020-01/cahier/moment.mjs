// Images-clés du moment proposé SUR LA VRAIE PAGE en ligne (lecture seule : rien n'est écrit dans presti) : la photo du héros
// est remplacée, dans le navigateur de test seulement, par les images de proto6 (déjà cadrées 1440 × 900) ; une feuille injectée
// ajoute le palier de 65svh avant le plateau, garde le titre immobile et efface surtitre + chapeau pendant la descente.
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
const { chromium } = require('playwright')
const sharp = require('sharp')
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/signature/'
const URL = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
const vh = 900
const cles = [
  { nom: 'A-y0', y: 0, img: 'proto6-t000.jpg', pied: 1, voile: 0 },
  { nom: 'B-y270', y: 270, img: 'proto6-t030.jpg', pied: 0.1, voile: 0 },
  { nom: 'C-y405', y: 405, img: 'proto6-t045.jpg', pied: 0, voile: 0 },
  { nom: 'D-y585', y: 585, img: 'proto6-t060.jpg', pied: 0, voile: 0 },
  { nom: 'E-y1035', y: 1035, img: 'proto6-t072.jpg', pied: 0, voile: 0.3 },
  { nom: 'F-y1385', y: 1385, img: 'proto6-t072.jpg', pied: 0, voile: 0.5 },
]
const css = `
.ouverture>.plateau{margin-top:65svh!important}
.hero__relief{display:none!important}
.hero__media img{animation:none!important;scale:1!important;translate:none!important;visibility:visible!important;object-position:50% 50%!important}
.ouverture .hero__media{animation:none!important;transform:none!important}
.ouverture .hero__contenu{animation:none!important;transform:none!important;opacity:1!important}
.hero .h1__cle,.hero .hero__pied{opacity:var(--pied,1)!important;transition:none!important}
.ouverture .hero--plein::after{animation:none!important;opacity:var(--voile,0)!important}
html{scroll-behavior:auto!important}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: vh }, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(2500)
await page.addStyleTag({ content: css })
const vig = []
for (const c of cles) {
  const data = 'data:image/jpeg;base64,' + fs.readFileSync(OUT + c.img).toString('base64')
  await page.evaluate(({ data, pied, voile }) => {
    const img = document.querySelector('.hero__media img')
    img.closest('picture').querySelectorAll('source').forEach((s) => s.remove())
    img.removeAttribute('srcset'); img.src = data
    document.documentElement.style.setProperty('--pied', pied)
    document.documentElement.style.setProperty('--voile', voile)
  }, { data, pied: c.pied, voile: c.voile })
  await page.evaluate((y) => window.scrollTo(0, y), c.y)
  await page.waitForTimeout(900)
  const buf = await page.screenshot({ type: 'jpeg', quality: 80 })
  fs.writeFileSync(OUT + `moment-${c.nom}.jpg`, buf)
  vig.push(await sharp(buf).resize(480, 300).toBuffer())
  // contraste du titre : luminance moyenne de la photo sous la boîte du h1 (sur l'image source, sans le texte)
  const box = await page.evaluate(() => { const b = document.querySelector('.hero h1 .h1__ligne').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } })
  const { data: px, info } = await sharp(OUT + c.img).extract({ left: Math.max(0, Math.round(box.x)), top: Math.max(0, Math.round(box.y)), width: Math.min(1440 - Math.round(box.x), Math.round(box.w)), height: Math.max(1, Math.min(900 - Math.round(box.y), Math.round(box.h))) }).raw().toBuffer({ resolveWithObject: true })
  let s = 0; for (let i = 0; i < px.length; i += info.channels) s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
  console.log(`moment-${c.nom}.jpg  h1 à (${box.x.toFixed(0)}, ${box.y.toFixed(0)}) ${box.w.toFixed(0)}×${box.h.toFixed(0)} ; luminance moyenne de la photo sous le titre : ${(s / (px.length / info.channels)).toFixed(0)}/255`)
}
await sharp({ create: { width: 1440, height: 600, channels: 3, background: '#000' } }).composite(vig.map((b, i) => ({ input: b, left: (i % 3) * 480, top: Math.floor(i / 3) * 300 }))).jpeg({ quality: 82 }).toFile(OUT + 'moment-planche.jpg')
console.log('planche : moment-planche.jpg')
await browser.close()
