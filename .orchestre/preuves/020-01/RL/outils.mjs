// outils.mjs — candidat RL (rotation + lumière rasante)
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
export const { chromium } = require('playwright')
export const sharp = require('sharp')
export const DIR = 'C:/Users/benja/Documents/presti/.orchestre/preuves/020-01/RL/'
export const TRAVAIL = DIR + 'travail/'
fs.mkdirSync(TRAVAIL, { recursive: true })
export const URL = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
export const SANS_TEXTE = '.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}'
export const CACHE_CALQUE = 'html.js.da--signature .ouverture>.hero--plein .hero__media::before{visibility:hidden!important}'

export function blocRL(opt = {}) {
  const delay = opt.delay !== undefined ? opt.delay : '-2.5s'
  const dureeLumiere = opt.dureeLumiere || '5s'
  const Hb = opt.Hb || 38
  const theta = opt.theta !== undefined ? opt.theta : 4
  const course = opt.course || 24
  const a = opt.a !== undefined ? opt.a : 0.85
  const o = opt.o !== undefined ? opt.o : 0.5
  const mode = opt.mode || 'overlay'
  const sin = Math.sin((theta * Math.PI) / 180)

  return `/* Candidat RL — rotation R et lumière rasante L2 ensemble (cahier-des-charges.md §3.5) */
@media(min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference){
  html.js.da--signature .ouverture>.hero--plein .hero__media>picture{position:absolute;left:0;top:calc((100% - 75vw) * .42);width:100%;height:75vw}
  html.js.da--signature .ouverture>.hero--plein .hero__media img{object-position:50% 50%}
  html.js.da--signature .ouverture>.hero--plein .hero__relief{inset:auto;left:0;top:calc((100% - 75vw) * .42);width:100%;height:75vw}
  html.js.da--signature .ouverture>.hero--plein .hero__media img,
  html.js.da--signature .ouverture>.hero--plein .hero__relief{--signature-a:2.25;transform-origin:40.4% 38.6%;transform:scale(1.07);animation:pousse 20s cubic-bezier(.45,0,.55,1) infinite alternate,signature-tourne-2 10s cubic-bezier(.37,0,.63,1) infinite alternate}
  html.js.da--signature .ouverture>.hero--plein .hero__media::before{
    content:"";position:absolute;z-index:1;pointer-events:none;
    left:-20%;width:140%;height:${Hb}svh;
    top:calc(100% - 23vw - 110px - ${Hb}svh - ${(50 * sin).toFixed(3)}vw);
    rotate:${theta}deg;
    background:linear-gradient(180deg,rgba(255,214,150,0) 0%,rgba(10,7,4,${o}) 22%,rgba(255,214,150,${a}) 50%,rgba(10,7,4,${o}) 78%,rgba(255,214,150,0) 100%);
    mix-blend-mode:${mode};
    animation:l2-glisse ${dureeLumiere} cubic-bezier(.37,0,.63,1) ${delay} infinite alternate;
  }
  html.js.da--signature .ouverture>.hero--plein .hero__media::after{z-index:2}
}
@media(min-width:1024px) and (min-aspect-ratio:16/10) and (prefers-reduced-motion:no-preference){
  html.js.da--signature .ouverture>.hero--plein .hero__media img,
  html.js.da--signature .ouverture>.hero--plein .hero__relief{--signature-a:4;animation:pousse 20s cubic-bezier(.45,0,.55,1) infinite alternate,signature-tourne-4 10s cubic-bezier(.37,0,.63,1) infinite alternate}
}
@keyframes signature-tourne-2{from{rotate:2.25deg}to{rotate:-2.25deg}}
@keyframes signature-tourne-4{from{rotate:4deg}to{rotate:-4deg}}
@keyframes l2-glisse{from{translate:0 calc(-1 * ${course}svh)}to{translate:0 0}}
`
}

export const gris = async (b, z) => { let s = sharp(b); if (z) s = s.extract(z); return s.resize(160).greyscale().raw().toBuffer() }
export const ecart = (a, b) => { let s = 0, n8 = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > 8) n8++ } return { moyen: +(s / a.length / 255).toFixed(4), part8: +(n8 / a.length).toFixed(3) } }
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
export const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

export async function ouvrir(nav, W, H, css) {
  const ctx = await nav.newContext({ viewport: { width: W, height: H } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.classList.contains('js') && document.querySelector('.hero--plein .hero__media img').complete)
  await page.evaluate(() => document.documentElement.classList.add('da--signature'))
  if (css) await page.addStyleTag({ content: css })
  await page.waitForTimeout(400)
  return { ctx, page }
}

export async function positionner(page, t) {
  const caler = (emettre) => page.evaluate(({ t, emettre }) => {
    const s = (window.__l2 ||= { departs: new WeakMap(), premier: true, tPrec: null, etablir: false })
    const hero = document.querySelector('.ouverture>.hero--plein')
    if (emettre) s.etablir = s.premier || (s.tPrec !== null && t < s.tPrec)
    let n = 0; const fins = []
    for (const a of document.getAnimations()) {
      if (!(a.timeline instanceof DocumentTimeline)) continue
      const transition = typeof CSSTransition !== 'undefined' && a instanceof CSSTransition
      if (s.etablir && transition) s.departs.set(a, -1e9)
      else if (!s.departs.has(a)) s.departs.set(a, s.premier ? 0 : t)
      a.pause(); a.currentTime = Math.max(0, t - s.departs.get(a)); n++
      const cible = a.effect?.target
      if (emettre && !s.premier && s.tPrec !== null && t > s.tPrec && a.animationName && cible && hero.contains(cible)) {
        const fin = s.departs.get(a) + a.effect.getComputedTiming().endTime
        if (Number.isFinite(fin) && fin > s.tPrec && fin <= t) fins.push([cible, a.animationName])
      }
    }
    if (emettre) {
      if (s.premier || (s.tPrec !== null && t < s.tPrec)) hero.dispatchEvent(new AnimationEvent('animationend', { bubbles: true }))
      for (const [c, nom] of fins) c.dispatchEvent(new AnimationEvent('animationend', { bubbles: true, animationName: nom }))
      s.tPrec = t; s.premier = false
    }
    return n
  }, { t, emettre })
  const n = await caler(true)
  await deuxImages(page)
  await caler(false)
  await deuxImages(page)
  return n
}

export async function contraste(page) {
  const tag = await page.addStyleTag({ content: SANS_TEXTE })
  await deuxImages(page)
  const buf = await page.screenshot({ type: 'png' })
  await tag.evaluate((e) => e.remove())
  const b = await page.evaluate(() => { const r = document.querySelector('.hero h1').getBoundingClientRect(); return { left: Math.round(r.x), top: Math.round(r.y), width: Math.round(Math.min(r.width, innerWidth - r.x)), height: Math.round(Math.min(r.height, innerHeight - r.y)) } })
  const { data, info } = await sharp(buf).extract(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  L.sort((x, y) => x - y)
  return +(1.05 / (L[Math.floor(0.9 * (L.length - 1))] + 0.05)).toFixed(3)
}

export const zoneMarches = (W, H) => ({ left: Math.round(150 * W / 1440), top: Math.round(120 * H / 900), width: Math.round(350 * W / 1440), height: Math.round(300 * H / 900) })
export async function c6a(buf25, buf80, W, H) {
  const z = zoneMarches(W, H)
  const g = async (b) => sharp(b).extract(z).greyscale().raw().toBuffer()
  const a = await g(buf25), b = await g(buf80)
  let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += Math.abs(a[i] - b[i]); sa += a[i]; sb += b[i] }
  const rel = async (buf) => { const { data, info } = await sharp(buf).extract(z).removeAlpha().raw().toBuffer({ resolveWithObject: true }); let t = 0; for (let i = 0; i < data.length; i += info.channels) t += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]); return t / (data.length / info.channels) }
  const r25 = await rel(buf25), r80 = await rel(buf80)
  return {
    zone: z,
    ecartMoyenPixel: +(s / a.length / 255).toFixed(4),
    ecartDesMoyennesGris: +(Math.abs(sa - sb) / a.length / 255).toFixed(4),
    luminanceRelativeMoyenne: { t25: +r25.toFixed(4), t80: +r80.toFixed(4), ecart: +Math.abs(r25 - r80).toFixed(4) },
  }
}

export function sequence(grises, pas) {
  let fige = 0, figeMax = 0, som = 0, sous = 0, max = 0, finFige = null
  const diffs = []
  for (let i = 1; i < grises.length; i++) {
    const e = ecart(grises[i - 1], grises[i]).moyen; diffs.push(e); som += e; if (e > max) max = e
    if (e < 0.006) { sous++; fige += pas; if (fige > figeMax) { figeMax = fige; finFige = i } } else fige = 0
  }
  return { images: grises.length, pas_ms: pas, ecartMoyenParImage: +(som / diffs.length).toFixed(4), plusLongFige_s: +(figeMax / 1000).toFixed(3), finPlageFigee_image: finFige, partPairesSous0006: +(sous / diffs.length).toFixed(3), ecartMaxPaire: +max.toFixed(4), pairesAuDessus0085: diffs.filter((d) => d > 0.085).length, diffs }
}
