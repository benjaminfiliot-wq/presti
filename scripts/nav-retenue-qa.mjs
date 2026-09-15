// scripts/nav-retenue-qa.mjs — le juge de la tâche 019-01 (vague 4, critère C7 « retenue » de la grille à l'aveugle, noté 3,3
// sur 5 le 15/09/2026). Sur bureau, la barre de la démo Atelier Lestraque montrait à la fois le téléphone, « Devis » et un
// menu burger, et le héros ajoutait « Demander un devis » : quatre appels pour un seul écran. La cible : un seul appel à
// l'action visible à la fois.
//
// Le juge régénère la démo, la sert en local et l'utilise dans Chromium comme un visiteur :
//   Bureau (1440×900 et 1280×800), accueil
//     1. en haut de page, exactement un appel visible à l'écran : le bouton du héros ; ni téléphone ni burger dans la barre ;
//     2. plus bas (prestations, puis réalisations), la barre montre exactement un appel, « Devis », visible et cliquable ;
//        toujours ni téléphone ni burger ;
//     2 bis. tous les 150 px, du haut jusqu'à un écran après la fin de l'ouverture (héros collant recouvert par le plateau),
//        exactement un appel visible : ni trou pendant le relais, ni doublon (ajouté après 019-01) ;
//     3. un clic sur ce « Devis » amène le formulaire de contact à l'écran ;
//   Bureau (1440×900), page commune menuisier-rennes : en haut de page, au plus un appel visible ;
//   Téléphone (390×844) : le burger est visible dans la barre, il ouvre le panneau (aria-expanded="true") et le referme ;
//   Le numéro reste joignable : un lien tel: dans la section contact ou le pied de page de l'accueil ;
//   Gel : les neuf autres démos métier sont identiques au commit.
// Un « appel » : lien tel:, lien vers #contact, .bouton, .nav__devis ou burger, réellement visible (dans l'écran, ni caché
// ni transparent, et c'est bien lui qu'on touche en cliquant en son centre). Le panneau mobile fermé ne compte pas.
//
// Usage : node scripts/nav-retenue-qa.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMOS = path.join(R, 'public', 'sites-demo')
const SITE = path.join(DEMOS, 'lestraque')
const echecs = [], faits = []

const gen = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque'], { cwd: R, encoding: 'utf8' })
if (gen.status !== 0) {
  console.log(`✗ barre retenue : FAIL — la génération échoue : ${(gen.stderr || gen.stdout || '').trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`)
  process.exit(1)
}

const gelees = fs.readdirSync(DEMOS, { withFileTypes: true }).filter((d) => d.isDirectory() && !['lestraque', '_kit', '_polices'].includes(d.name)).map((d) => d.name)
for (const d of gelees) {
  const st = spawnSync('git', ['status', '--porcelain', '--', `public/sites-demo/${d}`], { cwd: R, encoding: 'utf8' })
  if (st.stdout.trim()) echecs.push(`démo gelée modifiée : ${d} (${st.stdout.trim().split('\n').length} fichier(s))`)
}

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}`

const appelsVisibles = (page) => page.evaluate(() => {
  const vus = []
  for (const el of document.querySelectorAll('a[href^="tel:"], a[href*="#contact"], a.bouton, a.nav__devis, button.burger')) {
    if (el.closest('#panneau')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
    let op = 1, cache = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') { cache = true; break }
      op *= Number(cs.opacity)
    }
    if (cache || op < 0.2) continue
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))
    const dessus = document.elementFromPoint(x, y)
    if (!dessus || !(el === dessus || el.contains(dessus))) continue
    vus.push({ texte: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), barre: !!el.closest('header'), devis: el.classList.contains('nav__devis'), tel: el.getAttribute('href')?.startsWith('tel:') || false, burger: el.classList.contains('burger') })
  }
  return vus
})
const decrire = (vus) => vus.map((v) => `« ${v.texte} »${v.barre ? ' (barre)' : ''}`).join(', ') || 'aucun'
const allerA = async (page, sel) => {
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY + 40, behavior: 'instant' }) }, sel)
  await page.waitForTimeout(900)
}

const nav = await chromium.launch()
try {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
    const nomVp = `${vp.width}×${vp.height}`
    const ctx = await nav.newContext({ viewport: vp, reducedMotion: 'no-preference' })
    const page = await ctx.newPage()
    await page.goto(`${base}/index.html`, { waitUntil: 'load' })
    await page.waitForTimeout(2500)

    // Sous charge (autres agents et films en cours sur la machine), la barre peut rendre sa bascule avec quelques images de retard :
    // une mesure en défaut est refaite 900 ms plus tard, et n'échoue que si le défaut persiste. Le 15/09, deux faux échecs de
    // 021-01 sous charge (1 position sans appel, puis 2 appels en haut), qui passaient tous deux rejoués à part. Un défaut qui
    // dure, comme le trou de 1 500 px de 019-01, échoue toujours.
    const stable = async (ok) => { let vus = await appelsVisibles(page); if (!ok(vus)) { await page.waitForTimeout(900); vus = await appelsVisibles(page) } return vus }
    const haut = await stable((v) => v.length === 1 && !v[0].barre)
    if (haut.length !== 1) echecs.push(`${nomVp}, haut de l'accueil : ${haut.length} appels visibles, 1 attendu (le bouton du héros) — ${decrire(haut)}`)
    else if (haut[0].barre) echecs.push(`${nomVp}, haut de l'accueil : le seul appel visible est dans la barre (${decrire(haut)}), le bouton du héros attendu`)
    else faits.push(`${nomVp}, haut : ${decrire(haut)}`)
    if (haut.some((v) => v.tel || v.burger)) echecs.push(`${nomVp}, haut de l'accueil : téléphone ou burger visible dans la barre`)

    for (const sel of ['#prestations', '#realisations']) {
      if (!(await page.$(sel))) { echecs.push(`${nomVp} : section ${sel} introuvable`); continue }
      await allerA(page, sel)
      const vus = (await stable((v) => { const b = v.filter((x) => x.barre); return b.length === 1 && b[0].devis })).filter((v) => v.barre)
      if (vus.length !== 1 || !vus[0].devis) echecs.push(`${nomVp}, ${sel} : la barre montre ${vus.length} appel(s) — ${decrire(vus)} — attendu : « Devis » seul`)
      else faits.push(`${nomVp}, ${sel} : barre ${decrire(vus)}`)
    }

    // 2 bis. Ni trou ni doublon pendant le relais : tous les 150 px, du haut de page jusqu'à un écran après la fin de l'ouverture
    // (héros collant que le plateau noir recouvre), exactement un appel visible. Le 15/09/2026, la première version (019-01)
    // détectait la sortie du bouton du héros avec IntersectionObserver seul : le plateau le recouvrait dès 150 px, mais il restait
    // « à l'écran » pour l'observateur, et aucun appel n'était visible de 150 à 1 650 px en 1440×900. Ce juge ne testait alors
    // que #prestations et #realisations, et a laissé passer le trou.
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(600)
    const finOuverture = await page.evaluate(() => { const o = document.querySelector('.ouverture'); return o ? Math.round(o.getBoundingClientRect().bottom + scrollY) : 0 })
    const trous = [], doublons = []
    for (let y = 0; y <= finOuverture + vp.height; y += 150) {
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y)
      await page.waitForTimeout(450)
      const vus = await stable((v) => v.length === 1)
      if (vus.length === 0) trous.push(y)
      if (vus.length > 1) doublons.push(`${y} px (${decrire(vus)})`)
    }
    if (trous.length) echecs.push(`${nomVp} : aucun appel visible à ${trous.length} position(s) de défilement (${trous.join(', ')} px) — le bouton du héros est recouvert ou sorti sans que « Devis » apparaisse dans la barre`)
    if (doublons.length) echecs.push(`${nomVp} : plusieurs appels visibles à la fois à ${doublons.join(' ; ')}`)
    if (!trous.length && !doublons.length) faits.push(`${nomVp} : relais sans trou ni doublon de 0 à ${finOuverture + vp.height} px (tous les 150 px)`)

    const devis = await page.$('header .nav__devis')
    if (devis && (await devis.isVisible())) {
      await devis.click()
      await page.waitForTimeout(2200)
      const formVu = await page.evaluate(() => { const f = document.querySelector('#contact form, #contact'); if (!f) return false; const r = f.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 })
      if (!formVu) echecs.push(`${nomVp} : un clic sur « Devis » de la barre n'amène pas le formulaire de contact à l'écran`)
    } else echecs.push(`${nomVp} : « Devis » de la barre introuvable ou invisible après défilement, impossible de le cliquer`)
    await ctx.close()
  }

  {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const r = await page.goto(`${base}/menuisier-rennes/index.html`, { waitUntil: 'load' })
    if (!r || r.status() !== 200) echecs.push('page commune menuisier-rennes introuvable')
    else {
      await page.waitForTimeout(2500)
      const vus = await appelsVisibles(page)
      if (vus.length > 1) echecs.push(`1440×900, page commune menuisier-rennes en haut : ${vus.length} appels visibles — ${decrire(vus)} — au plus 1 attendu`)
      else faits.push(`commune menuisier-rennes, haut : ${decrire(vus)}`)
    }
    await ctx.close()
  }

  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(`${base}/index.html`, { waitUntil: 'load' })
    await page.waitForTimeout(2000)
    const burger = page.locator('header button.burger')
    if (!(await burger.isVisible())) echecs.push('390×844 : le burger n\'est pas visible dans la barre')
    else {
      await burger.click(); await page.waitForTimeout(700)
      const ouvert = await burger.getAttribute('aria-expanded')
      await burger.click(); await page.waitForTimeout(700)
      const ferme = await burger.getAttribute('aria-expanded')
      if (ouvert !== 'true' || ferme !== 'false') echecs.push(`390×844 : le menu ne s'ouvre ou ne se referme pas (aria-expanded ${ouvert} puis ${ferme})`)
      else faits.push('390×844 : burger visible, le panneau s\'ouvre et se referme')
    }
    const tel = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].some((a) => a.closest('#contact, footer')))
    if (!tel) echecs.push('le numéro n\'est plus joignable : aucun lien tel: dans la section contact ni dans le pied de page')
    await ctx.close()
  }
} finally {
  await nav.close()
  srv.close()
}

console.log(faits.map((f) => `  · ${f}`).join('\n'))
console.log(echecs.length ? `✗ barre retenue : FAIL — ${echecs.join(' ; ')}` : '✓ barre retenue : PASS — un seul appel visible à la fois au bureau, burger et panneau intacts au téléphone, numéro joignable, démos gelées intactes')
process.exitCode = echecs.length ? 1 : 0
