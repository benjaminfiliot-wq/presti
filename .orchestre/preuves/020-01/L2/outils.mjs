// outils.mjs — candidat L2 (lumière rasante) : génération du bloc CSS, ouverture de la page EN LIGNE dans le navigateur de test
// (sans carte graphique : chromium.launch() nu), positionnement déterministe des animations, mesures du cahier (§3.1, §3.3, §3.4, §8.0).
// Rien n'est écrit hors de signature/films/L2/.
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
export const { chromium } = require('playwright')
export const sharp = require('sharp')
export const DIR = 'C:/Users/benja/Documents/presti/.orchestre/preuves/020-01/L2/'
export const TRAVAIL = DIR + 'travail/'
fs.mkdirSync(TRAVAIL, { recursive: true })
export const URL = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
export const SANS_TEXTE = '.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}' // §8.0 « Contraste »
export const CACHE_CALQUE = 'html.js.da--signature .ouverture>.hero--plein .hero__media::before{visibility:hidden!important}'

// ── Le bloc CSS du candidat, à partir de ses paramètres ──
// Zone permise pour la lumière : du haut du héros jusqu'à « 100% − 23vw − 110px ». Le haut du titre (.hero h1) est à 100% − 336 px
// en 1088×800, 100% − 380 px en 1280×800, 100% − 411 px en 1440×900 (travail/sonde.json) ; la limite est à 360, 404 et 441 px
// du bas, donc 24 à 30 px au-dessus du haut du titre. La bande est inclinée de θ autour de son centre : son bord droit descend de
// 50vw·sin θ, retranché aussi. Au bas de sa course (translate 0), le bas de sa boîte touche la limite ; la bande n'y descend jamais.
export function bloc(p) {
  const c = p.couleur || '255,214,150'
  const sin = Math.sin((p.theta * Math.PI) / 180)
  const ombre = p.o ? `rgba(10,7,4,${p.o})` : null
  const k = (x) => +(p.a * x).toFixed(3)
  const stops = ombre
    ? `rgba(${c},0) 0%,${ombre} 22%,rgba(${c},${p.a}) 50%,${ombre} 78%,rgba(${c},0) 100%`
    : `rgba(${c},0) 0%,rgba(${c},${k(0.35)}) 25%,rgba(${c},${p.a}) 50%,rgba(${c},${k(0.35)}) 75%,rgba(${c},0) 100%`
  const [de, a] = p.sens === 'monte' ? ['0 0', `0 calc(-1 * ${p.course}svh)`] : [`0 calc(-1 * ${p.course}svh)`, '0 0']
  const anims = [`l2-glisse ${p.D}s cubic-bezier(.37,0,.63,1) infinite alternate`]
  let respire = ''
  if (p.respire) {
    anims.push(`l2-respire ${p.D}s cubic-bezier(.37,0,.63,1) ${-p.D / 2}s infinite alternate`)
    respire = `\n@keyframes l2-respire{from{opacity:1}to{opacity:${p.respire}}}`
  }
  return `/* Candidat L2 — lumière rasante (cahier-des-charges.md §3.5). Paramètres : ${JSON.stringify(p)} */
@media (min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference){
  html.js.da--signature .ouverture>.hero--plein .hero__media::before{
    content:"";position:absolute;z-index:1;pointer-events:none;
    left:-20%;width:140%;height:${p.Hb}svh;
    top:calc(100% - 23vw - 110px - ${p.Hb}svh - ${(50 * sin).toFixed(3)}vw);
    rotate:${p.theta}deg;
    background:linear-gradient(180deg,${stops});
    mix-blend-mode:${p.mode};
    animation:${anims.join(',')};
  }
  html.js.da--signature .ouverture>.hero--plein .hero__media::after{z-index:2}
}
@keyframes l2-glisse{from{translate:${de}}to{translate:${a}}}${respire}
`
}

// ── Mesures (gris, ecart et contraste repris de cahier/cdc-c2-variantes.mjs) ──
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
// Toutes les animations de la chronologie du document (pas celles liées au défilement) : pause, currentTime = t − départ (§8.0).
// Départ = 0 pour celles qui existent au premier appel (poussée, entrée du titre, calque) ; pour une animation ou une transition
// créée plus tard par la page (le relais « Devis » de kit.js, transition de 240 ms), départ = instant virtuel où elle est apparue.
// Après le réglage, on attend deux images, puis on cale de même les animations nées pendant l'attente.
// Le relais « Devis » de kit.js (l.21-52) ne se réévalue que sur IntersectionObserver, scroll, resize et `animationend` du héros :
// une animation mise en pause et déplacée n'émet pas ses fins comme en temps réel. On émet donc nous-mêmes un `animationend`
// (qui remonte jusqu'au héros) pour chaque animation du héros dont la fin tombe dans ]instant précédent ; t], au premier appel
// (réévaluation initiale de kit.js) et à chaque retour en arrière. kit.js lit alors l'état positionné, comme en temps réel.
// Au premier appel et à chaque retour en arrière, l'état du relais est « établi » : ses transitions (existantes ou créées par la
// réévaluation) sont terminées, comme si la page était restée à cet état depuis longtemps. En marche avant (films), une transition
// créée entre deux images part de l'instant virtuel courant et se déroule image par image.
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
export async function etat(page) {
  return page.evaluate(() => {
    const m = document.querySelector('.ouverture>.hero--plein .hero__media')
    const b = getComputedStyle(m, '::before'), img = document.querySelector('.hero--plein .hero__media img')
    const h1 = document.querySelector('.hero h1').getBoundingClientRect()
    return {
      relief: document.querySelector('.hero--plein').getAttribute('data-relief-etat'),
      calque: { content: b.content, translate: b.translate, rotate: b.rotate, opacity: b.opacity, zIndex: b.zIndex, top: b.top, height: b.height, mode: b.mixBlendMode },
      scaleImg: getComputedStyle(img).scale,
      h1Haut: +h1.top.toFixed(1),
      animsCalque: document.getAnimations().filter((a) => a.effect?.pseudoElement === '::before' && a.effect?.target === m).map((a) => ({ nom: a.animationName, proprietes: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'computedOffset', 'easing', 'composite'].includes(x))))] })),
      animsPhoto: [m, m.querySelector('picture'), img].flatMap((e) => e.getAnimations()).filter((a) => a.timeline instanceof DocumentTimeline).map((a) => ({ nom: a.animationName, proprietes: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'computedOffset', 'easing', 'composite'].includes(x))))] })),
    }
  })
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
// Témoin « masqué sous le titre » : image avec calque contre image calque caché (visibility : l'animation n'est pas annulée),
// sur la bande y ≥ haut du h1. Pixels dont un canal diffère de plus de 2 niveaux, et écart maximal.
export async function temoinTitre(page, bufAvec) {
  const tag = await page.addStyleTag({ content: CACHE_CALQUE })
  await deuxImages(page)
  const sans = await page.screenshot({ type: 'png' })
  await tag.evaluate((e) => e.remove())
  await deuxImages(page)
  const haut = await page.evaluate(() => Math.floor(document.querySelector('.hero h1').getBoundingClientRect().top))
  const A = await sharp(bufAvec).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const B = await sharp(sans).removeAlpha().raw().toBuffer()
  const w = A.info.width, h = A.info.height, ch = A.info.channels
  let n = 0, max = 0, nHaut = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch; const d = Math.max(Math.abs(A.data[i] - B[i]), Math.abs(A.data[i + 1] - B[i + 1]), Math.abs(A.data[i + 2] - B[i + 2]))
    if (y >= haut) { if (d > 2) n++; if (d > max) max = d } else if (d > 8) nHaut++
  }
  return { hautTitre: haut, pixelsModifiesSousTitre: n, ecartMaxSousTitre: max, partPixelsEclairesAuDessus_d8: +(nHaut / (haut * w)).toFixed(3) }
}
// Zone des marches (§3.4) : x 150-500, y 120-420 en 1440×900, à l'échelle.
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
    ecartMoyenPixel: +(s / a.length / 255).toFixed(4), // |a − b| moyen / 255 (« écart » du §3.1) sur la zone, gris pleine résolution
    ecartDesMoyennesGris: +(Math.abs(sa - sb) / a.length / 255).toFixed(4), // |moyenne(t25) − moyenne(t80)| / 255
    luminanceRelativeMoyenne: { t25: +r25.toFixed(4), t80: +r80.toFixed(4), ecart: +Math.abs(r25 - r80).toFixed(4) },
  }
}
// Relevé : plage figée (écart < 0,006), écart moyen par image, anti-clignotement (> 0,085) — video-qa.mjs:26-30.
export function sequence(grises, pas) {
  let fige = 0, figeMax = 0, som = 0, sous = 0, max = 0, finFige = null
  const diffs = []
  for (let i = 1; i < grises.length; i++) {
    const e = ecart(grises[i - 1], grises[i]).moyen; diffs.push(e); som += e; if (e > max) max = e
    if (e < 0.006) { sous++; fige += pas; if (fige > figeMax) { figeMax = fige; finFige = i } } else fige = 0
  }
  return { images: grises.length, pas_ms: pas, ecartMoyenParImage: +(som / diffs.length).toFixed(4), plusLongFige_s: +(figeMax / 1000).toFixed(3), finPlageFigee_image: finFige, partPairesSous0006: +(sous / diffs.length).toFixed(3), ecartMaxPaire: +max.toFixed(4), pairesAuDessus0085: diffs.filter((d) => d > 0.085).length, diffs }
}
