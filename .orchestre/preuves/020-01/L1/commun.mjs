// commun.mjs — L1 « projecteur tournant » : fonctions partagées par reglage.mjs et final.mjs.
// Page EN LIGNE, bloc CSS injecté dans le navigateur de test seulement (classe da--signature ajoutée par script).
// Réduction et écarts : copies exactes de cahier/cdc-c2-variantes.mjs (gris, ecart) ; contraste : cahier §8.0.
import { createRequire } from 'node:module'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
export const { chromium } = require('playwright')
export const sharp = require('sharp')
export const URL_DEMO = 'https://prestiapp.fr/sites-demo/lestraque/index.html'
export const DOSSIER = 'C:/Users/benja/Documents/presti/.orchestre/preuves/020-01/L1/'
export const SANS_TEXTE = '.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}'
// feuille de test de R-4 (cahier §8.1), mot pour mot
export const MAGENTA = '.hero--plein{background:#f0f!important}.hero--plein .hero__media::after,.hero--plein .hero__media::before,.ouverture .hero--plein::after,.hero__contenu,.nav{display:none!important}'

// ── le bloc du candidat L1 (contraintes communes du §3.5) ──
// P : secondes par tour ; sens : −1 = rotate négatif (voir rapport.md, « sens h = −1 ») ; taille : côté du calque en vw ;
// conique : conic-gradient ; masque : arrêts du radial-gradient(closest-side, …) ; voile : modulation d'opacité facultative.
export function bloc({ P, sens = -1, taille = 106, conique, masque, voile = null }) {
  const R = taille / 2
  const anims = [`signature-projecteur ${P}s linear infinite`]
  if (voile) anims.push(`signature-projecteur-voile ${voile.duree}s cubic-bezier(.37,0,.63,1) ${voile.delai || 0}s infinite alternate`)
  return `@media(min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference){
  /* v28 : le moment signature (da--signature), 1. au repos : L1, un projecteur tourne autour du puits (candidat L1, §3.5).
     Accueil seulement (.ouverture>). Calque dédié ::before, au-dessus de la photo et sous le dégradé du titre (::after passe en z-index 2).
     Seuls rotate${voile ? ' et opacity' : ''} du calque sont animés. Un tour continu (linear) n'a ni aller-retour ni arrêt. */
  html.js.da--signature .ouverture>.hero--plein .hero__media::before{content:"";position:absolute;z-index:1;pointer-events:none;left:calc(40.4% - ${R}vw);top:calc(42% - 2.55vw - ${R}vw);width:${taille}vw;height:${taille}vw;background:${conique};-webkit-mask:radial-gradient(closest-side,${masque});mask:radial-gradient(closest-side,${masque});mix-blend-mode:soft-light;animation:${anims.join(',')}}
  html.js.da--signature .ouverture>.hero--plein .hero__media::after{z-index:2}
}
@keyframes signature-projecteur{to{rotate:${sens * 360}deg}}${voile ? `\n@keyframes signature-projecteur-voile{from{opacity:${voile.de}}to{opacity:${voile.a}}}` : ''}
`
}

export const gris = async (b, z) => { let s = sharp(b); if (z) s = s.extract(z); return (await s.resize(160).greyscale().raw().toBuffer()) }
export const ecart = (a, b) => { let s = 0, n8 = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > 8) n8++ } return { moyen: +(s / a.length / 255).toFixed(4), part8: +(n8 / a.length).toFixed(3) } }
const ecartBrut = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
export const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
export const pgcd = (a, b) => (b ? pgcd(b, a % b) : a)
export const ppcm = (a, b) => (a * b) / pgcd(a, b)

export async function ouvrir(nav, vp, css) {
  const ctx = await nav.newContext({ viewport: vp }); const page = await ctx.newPage()
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.documentElement.classList.add('da--signature'))
  if (css) await page.addStyleTag({ content: css })
  await page.waitForFunction(() => document.documentElement.classList.contains('js') && document.querySelector('.hero--plein .hero__media img').complete && document.fonts.status === 'loaded', null, { timeout: 30000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}
export const etatPage = (page) => page.evaluate(() => {
  const m = document.querySelector('.hero--plein .hero__media'), b = getComputedStyle(m, '::before')
  return {
    reliefEtat: document.querySelector('.hero--plein').getAttribute('data-relief-etat'), toile: !!document.querySelector('canvas.hero__relief'),
    calque: { content: b.content, blend: b.mixBlendMode, z: b.zIndex, animation: b.animationName, apresZ: getComputedStyle(m, '::after').zIndex },
    animationsCalque: document.getAnimations().filter((a) => a.effect && a.effect.pseudoElement === '::before' && a.effect.target === m).map((a) => ({ nom: a.animationName, proprietes: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'computedOffset', 'easing', 'composite'].includes(x))))] })),
    ratio34_25: matchMedia('(min-aspect-ratio:34/25)').matches, largeur1024: matchMedia('(min-width:1024px)').matches, barre: innerWidth - document.documentElement.clientWidth,
  }
})
// fige toutes les animations de la timeline du document à t ms (celles liées au défilement restent à y = 0)
export const poser = async (page, t) => { await page.evaluate((t) => { for (const a of document.getAnimations()) { if (a.timeline !== document.timeline) continue; a.pause(); a.currentTime = t } }, t); await deuxImages(page) }

export async function contraste(page, buf) {
  const b = await page.evaluate(() => { const r = document.querySelector('.hero h1').getBoundingClientRect(); return { left: Math.round(r.x), top: Math.round(r.y), width: Math.round(Math.min(r.width, innerWidth - r.x)), height: Math.round(Math.min(r.height, innerHeight - r.y)) } })
  const { data, info } = await sharp(buf).extract(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  L.sort((x, y) => x - y); const p90 = L[Math.floor(0.9 * (L.length - 1))]
  return +(1.05 / (p90 + 0.05)).toFixed(3)
}
export const zoneMarches = (vp) => ({ left: Math.round(150 * vp.width / 1440), top: Math.round(120 * vp.height / 900), width: Math.round(350 * vp.width / 1440), height: Math.round(300 * vp.height / 900) })
async function grisPlein(buf, z) { return sharp(buf).extract(z).greyscale().raw().toBuffer() }

// C2-a (+ C6-a) : captures PNG à 2,5 / 5 / 8 s
export async function c2a(page, vp) {
  const st = {}
  for (const t of [2500, 5000, 8000]) { await poser(page, t); st[t] = await page.screenshot({ type: 'png' }) }
  const g = {}; for (const t in st) g[t] = await gris(st[t])
  const z = zoneMarches(vp), a = await grisPlein(st[2500], z), b = await grisPlein(st[8000], z)
  let sa = 0, sb = 0, sd = 0; for (let i = 0; i < a.length; i++) { sa += a[i]; sb += b[i]; sd += Math.abs(a[i] - b[i]) }
  return {
    buffers: st,
    C2a: { paire_2500_5000: ecart(g[2500], g[5000]), paire_5000_8000: ecart(g[5000], g[8000]) },
    C6a: { zone: z, ecartMoyenneGris_t25_t80: +(Math.abs(sa - sb) / a.length / 255).toFixed(4), ecartMoyenPixel_t25_t80: +(sd / a.length / 255).toFixed(4), grisMoyen_t25: +(sa / a.length).toFixed(2), grisMoyen_t80: +(sb / a.length).toFixed(2) },
  }
}
// C2-b / C2-c : relevé de 10 s à 8 images/s à partir de 8 s (81 images, 80 paires), JPEG 92 comme contre/mesure-repos.mjs
export async function releve(page, { debut = 8000, n = 81, pas = 125 } = {}) {
  const g = []
  for (let k = 0; k < n; k++) { await poser(page, debut + k * pas); g.push(await gris(await page.screenshot({ type: 'jpeg', quality: 92 }))) }
  const d = []; for (let i = 1; i < g.length; i++) d.push(ecartBrut(g[i - 1], g[i]))
  let figeMax = 0, courant = 0, debutFige = 0, debutMax = 0
  for (let i = 0; i < d.length; i++) { if (d[i] < 0.006) { if (!courant) debutFige = i; courant++; if (courant > figeMax) { figeMax = courant; debutMax = debutFige } } else courant = 0 }
  const tri = [...d].sort((x, y) => x - y)
  return {
    images: g.length, pas_ms: pas, debut_ms: debut,
    ecartMoyenParImage: +(d.reduce((s, x) => s + x, 0) / d.length).toFixed(4),
    plusLongFige_s: +(figeMax * pas / 1000).toFixed(3), plusLongFigeDebut_ms: figeMax ? debut + debutMax * pas : null,
    pairesSous0006: d.filter((x) => x < 0.006).length, ecartMin: +tri[0].toFixed(4), ecartP10: +tri[Math.floor(0.1 * (tri.length - 1))].toFixed(4), ecartMax: +tri[tri.length - 1].toFixed(4),
    pairesAuDessus0085: d.filter((x) => x > 0.085).length,
  }
}
// R-12 : contraste p90 du fond du titre, animations figées aux instants donnés
export async function contrasteCycle(page, instants) {
  const tag = await page.addStyleTag({ content: SANS_TEXTE })
  const v = []
  for (const t of instants) { await poser(page, t); v.push([t, await contraste(page, await page.screenshot({ type: 'png' }))]) }
  await tag.evaluate((e) => e.remove())
  const min = v.reduce((m, x) => (x[1] < m[1] ? x : m), v[0])
  return { instants: v.length, pas_ms: instants[1] - instants[0], de_ms: instants[0], a_ms: instants[instants.length - 1], p90min: min[1], p90minA_ms: min[0], p90max: Math.max(...v.map((x) => x[1])), sous3: v.filter((x) => x[1] < 3).length, valeurs: v }
}
