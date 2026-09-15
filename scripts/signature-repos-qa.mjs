// scripts/signature-repos-qa.mjs — le juge de la tâche 020-02 : le moment signature AU REPOS, dans le vrai kit de la démo Atelier
// Lestraque. Décisions de Benj du 15/09/2026 : la cage de l'escalier tourne (candidat R) avec la lumière du projecteur (candidat
// L1), sur l'accueil seulement. Cahier : .orchestre/preuves/020-01/cahier/cahier-des-charges.md (§3.3, §3.5, §8.1). Méthodes de
// mesure reprises de .orchestre/preuves/020-01/L1/commun.mjs (validées par le juge des films).
//
// Le juge régénère la démo, la sert en local et la mesure dans Chromium SANS drapeau de carte graphique, animations positionnées
// image par image (jamais en temps réel) :
//   1. drapeau : <html> de l'accueil porte da--signature ; les neuf autres démos sont identiques au commit ;
//   2. geste présent sur l'accueil en 1088×800, 1280×800 et 1440×900 : une animation signature-tourne-* sur la photo et
//      signature-projecteur sur le calque ::before ; ces animations n'animent que rotate, scale, translate, transform ou opacity ;
//   3. mouvement (cible du cahier §3.3, format de la grille) : en 1088×800 et 1440×900, part > 8 ≥ 0,56 pour les paires
//      2,5 → 5 s et 5 → 8 s ; en 1088×800, plage figée ≤ 0,8 s (relevé de 10 s à 8 images/s) ou écart moyen ≥ 0,020 ; en 1440×900,
//      plage figée ≤ 1,0 s (valeur de L1 seul à ce format) ; aucun écart > 0,085 entre deux images (pas de clignotement) ;
//   4. titre lisible (R-12) : contraste p90 du fond du titre ≥ 3,0 à 8 instants du cycle, en 1088×800 et 1440×900 ;
//   5. coins (R-4) : feuille magenta de test, rotation à ses deux extrêmes et poussée à 1, en 1088×800, 1280×800, 1440×900 et
//      1920×1080 : au plus 20 pixels magenta (anticrénelage) ;
//   6. rien ne tourne ni ne balaie en mouvement réduit (1440×900), en 1024×768 (sous le rapport 34/25), au téléphone (390×844) et
//      sur la page commune menuisier-rennes (1440×900) ;
//   7. la barre retenue reste verte (scripts/nav-retenue-qa.mjs).
//
// Usage : node scripts/signature-repos-qa.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMOS = path.join(R, 'public', 'sites-demo')
const SITE = path.join(DEMOS, 'lestraque')
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ signature au repos : FAIL — ${echecs.join(' ; ')}` : '✓ signature au repos : PASS — la cage tourne avec le projecteur sur l\'accueil, cible de mouvement tenue, titre lisible, coins couverts, rien ailleurs, barre retenue verte')
  process.exitCode = echecs.length ? 1 : 0
}

const gen = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque'], { cwd: R, encoding: 'utf8' })
if (gen.status !== 0) { echecs.push(`la génération échoue : ${(gen.stderr || gen.stdout || '').trim().split('\n').slice(-2).join(' | ').slice(0, 240)}`); fin(); process.exit(1) }

const accueil = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
if (!/<html[^>]*class="[^"]*\bda--signature\b/.test(accueil)) echecs.push('<html> de l\'accueil ne porte pas la classe da--signature (drapeau da.json → generer.mjs)')
for (const d of fs.readdirSync(DEMOS, { withFileTypes: true }).filter((x) => x.isDirectory() && !['lestraque', '_kit', '_polices'].includes(x.name))) {
  const st = spawnSync('git', ['status', '--porcelain', '--', `public/sites-demo/${d.name}`], { cwd: R, encoding: 'utf8' })
  if (st.stdout.trim()) echecs.push(`démo gelée modifiée : ${d.name}`)
}

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json', bin: 'application/octet-stream' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}`

const SANS_TEXTE = '.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}'
const MAGENTA = '.hero--plein{background:#f0f!important}.hero--plein .hero__media::after,.hero--plein .hero__media::before,.ouverture .hero--plein::after,.hero__contenu,.nav{display:none!important}'
const PROPRIETES = new Set(['rotate', 'scale', 'translate', 'transform', 'opacity'])
const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
const gris = async (buf) => sharp(buf).resize(160).greyscale().raw().toBuffer()
const ecart = (a, b) => { let s = 0, n8 = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > 8) n8++ } return { moyen: s / a.length / 255, part8: n8 / a.length } }
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const f3 = (x) => Number(x).toFixed(3)

async function ouvrir(nav, chemin, opts) {
  const ctx = await nav.newContext(opts)
  const page = await ctx.newPage()
  await page.goto(`${base}${chemin}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.documentElement.classList.contains('js') && document.fonts.status === 'loaded', null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  return { ctx, page }
}
const signatures = (page) => page.evaluate(() => document.getAnimations().filter((a) => /^signature-/.test(a.animationName || '')).map((a) => ({
  nom: a.animationName, pseudo: (a.effect && a.effect.pseudoElement) || '',
  proprietes: [...new Set((a.effect ? a.effect.getKeyframes() : []).flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))))],
})))
// fige les animations de la timeline du document ; reglage(nom) → temps propre à une animation (sinon t)
const poser = async (page, t, reglage = null) => {
  await page.evaluate(({ t, reglage }) => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline) continue
      a.pause()
      const propre = reglage && Object.entries(reglage).find(([motif]) => new RegExp(motif).test(a.animationName || ''))
      a.currentTime = propre ? propre[1] : t
    }
  }, { t, reglage })
  await deuxImages(page)
}
async function contraste(page) {
  const b = await page.evaluate(() => { const r = document.querySelector('.hero h1').getBoundingClientRect(); return { left: Math.max(0, Math.round(r.x)), top: Math.max(0, Math.round(r.y)), width: Math.round(Math.min(r.width, innerWidth - Math.max(0, r.x))), height: Math.round(Math.min(r.height, innerHeight - Math.max(0, r.y))) } })
  const { data, info } = await sharp(await page.screenshot({ type: 'png' })).extract(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  L.sort((x, y) => x - y)
  return 1.05 / (L[Math.floor(0.9 * (L.length - 1))] + 0.05)
}

const nav = await chromium.launch()
try {
  // 2 à 4 : présence, mouvement, contraste
  for (const vp of [{ width: 1088, height: 800 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
    const nom = `${vp.width}×${vp.height}`
    const { ctx, page } = await ouvrir(nav, '/index.html', { viewport: vp })
    const sig = await signatures(page)
    const tourne = sig.filter((s) => /^signature-tourne/.test(s.nom)), projecteur = sig.filter((s) => s.nom === 'signature-projecteur' && s.pseudo === '::before')
    if (!tourne.length) echecs.push(`${nom} : aucune animation signature-tourne-* sur l'accueil (la cage ne tourne pas)`)
    if (!projecteur.length) echecs.push(`${nom} : aucune animation signature-projecteur sur le calque ::before (pas de projecteur)`)
    for (const s of sig) { const hors = s.proprietes.filter((p) => !PROPRIETES.has(p)); if (hors.length) echecs.push(`${nom} : ${s.nom} anime ${hors.join(', ')} (seuls rotate, scale, translate, transform, opacity)`) }
    if (vp.width === 1280) { faits.push(`${nom} : ${sig.map((s) => s.nom + s.pseudo).join(', ') || 'aucune signature'}`); await ctx.close(); continue }

    const img = {}
    for (const t of [2500, 5000, 8000]) { await poser(page, t); img[t] = await gris(await page.screenshot({ type: 'png' })) }
    const p1 = ecart(img[2500], img[5000]).part8, p2 = ecart(img[5000], img[8000]).part8
    const g = []
    for (let k = 0; k < 81; k++) { await poser(page, 8000 + k * 125); g.push(await gris(await page.screenshot({ type: 'jpeg', quality: 92 }))) }
    const d = []; for (let i = 1; i < g.length; i++) d.push(ecart(g[i - 1], g[i]).moyen)
    let fige = 0, cour = 0; for (const x of d) { cour = x < 0.006 ? cour + 1 : 0; fige = Math.max(fige, cour) }
    const plage = fige * 0.125, moyen = d.reduce((a, b) => a + b, 0) / d.length, pic = Math.max(...d)
    faits.push(`${nom} : part > 8 ${f3(p1)} / ${f3(p2)} · plage figée ${plage.toFixed(2)} s · écart moyen ${f3(moyen)} · pic ${f3(pic)}`)
    if (p1 < 0.56 || p2 < 0.56) echecs.push(`${nom} : part > 8 ${f3(p1)} / ${f3(p2)}, 0,56 au moins sur chaque paire (cible du cahier §3.3)`)
    if (vp.width === 1088 && !(plage <= 0.8 || moyen >= 0.02)) echecs.push(`${nom} : plage figée ${plage.toFixed(2)} s et écart moyen ${f3(moyen)} (0,8 s au plus, ou écart moyen ≥ 0,020)`)
    if (vp.width === 1440 && plage > 1.0) echecs.push(`${nom} : plage figée ${plage.toFixed(2)} s, 1,0 s au plus`)
    if (pic > 0.085) echecs.push(`${nom} : clignotement (écart ${f3(pic)} entre deux images, 0,085 au plus)`)

    const tag = await page.addStyleTag({ content: SANS_TEXTE })
    let pire = Infinity, pireT = 0
    for (let t = 0; t < 20000; t += 2500) { await poser(page, t); const c = await contraste(page); if (c < pire) { pire = c; pireT = t } }
    await tag.evaluate((e) => e.remove())
    faits.push(`${nom} : contraste du titre au pire instant ${pire.toFixed(2)} (t = ${pireT / 1000} s)`)
    if (pire < 3.0) echecs.push(`${nom} : contraste du fond du titre ${pire.toFixed(2)} à t = ${pireT / 1000} s, 3,0 au moins (R-12)`)
    await ctx.close()
  }

  // 5 : coins
  for (const vp of [{ width: 1088, height: 800 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const { ctx, page } = await ouvrir(nav, '/index.html', { viewport: vp })
    await page.addStyleTag({ content: MAGENTA })
    let pire = 0
    for (const extreme of [0, 10000]) {
      await poser(page, 0, { '^signature-tourne': extreme, '^pousse$': 0 })
      const { data, info } = await sharp(await page.screenshot({ type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      let n = 0; for (let i = 0; i < data.length; i += info.channels) if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] > 200) n++
      pire = Math.max(pire, n)
    }
    if (pire > 20) echecs.push(`${vp.width}×${vp.height} : ${pire} pixels découverts aux extrêmes de la rotation (20 au plus, R-4)`)
    else faits.push(`${vp.width}×${vp.height} : coins couverts (${pire} pixel(s) magenta au pire)`)
    await ctx.close()
  }

  // 6 : nulle part ailleurs
  for (const [nom, chemin, opts] of [
    ['mouvement réduit 1440×900', '/index.html', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
    ['1024×768', '/index.html', { viewport: { width: 1024, height: 768 } }],
    ['téléphone 390×844', '/index.html', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
    ['page commune menuisier-rennes 1440×900', '/menuisier-rennes/index.html', { viewport: { width: 1440, height: 900 } }],
  ]) {
    const { ctx, page } = await ouvrir(nav, chemin, opts)
    const sig = await signatures(page)
    if (sig.length) echecs.push(`${nom} : ${sig.map((s) => s.nom).join(', ')} actif (aucune signature attendue)`)
    else faits.push(`${nom} : aucune signature`)
    await ctx.close()
  }
} finally {
  await nav.close()
  srv.close()
}

// 7 : barre retenue
const barre = spawnSync(process.execPath, [path.join(R, 'scripts', 'nav-retenue-qa.mjs')], { cwd: R, encoding: 'utf8' })
if (barre.status !== 0) echecs.push(`barre retenue : ${(barre.stdout || '').trim().split('\n').pop().slice(0, 200)}`)
else faits.push('barre retenue : PASS')
fin()
