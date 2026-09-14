// scripts/capture-url.mjs <url> <préfixe de sortie> [sélecteur] — capture une page EN LIGNE (production) sur bureau
// (1280×800) et mobile (390×844, 2×) : haut de page, puis l'élément `sélecteur` amené à l'écran par un défilement doux,
// après que ses vidéos ont démarré. Sert la tâche 016-03 : le bloc démo de la landing, vu comme un visiteur le voit.
// Rend aussi, pour chaque lien du bloc qui vise /sites-demo/…, le statut HTTP de la page et de sa feuille de style.
import { chromium } from 'playwright'

const [url, prefixe, selecteur = null] = process.argv.slice(2)
if (!url || !prefixe) { console.error('usage : node scripts/capture-url.mjs <url> <préfixe> [sélecteur]'); process.exit(2) }
const nav = await chromium.launch()
let echec = 0
for (const [nom, vp, echelle] of [['bureau', { width: 1280, height: 800 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
  const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: echelle }); const page = await ctx.newPage()
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message))
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${prefixe}-${nom}-haut.png` })
  if (selecteur) {
    const el = await page.$(selecteur)
    if (!el) { console.log(`✗ ${nom} : « ${selecteur} » absent de la page`); echec++; await ctx.close(); continue }
    await page.evaluate(async (s) => { const e = document.querySelector(s); const cible = e.getBoundingClientRect().top + scrollY - 90; for (let y = scrollY; y < cible; y += 250) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)) } scrollTo(0, cible) }, selecteur)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${prefixe}-${nom}-bloc.png` })
    const etat = await page.evaluate((s) => {
      const e = document.querySelector(s)
      const v = e.querySelector('video')
      return { video: v ? { joue: !v.paused, temps: Number(v.currentTime.toFixed(2)), src: v.currentSrc } : null, image: !!e.querySelector('img'), liens: [...e.querySelectorAll('a[href*="/sites-demo/"]')].map((a) => a.href) }
    }, selecteur)
    const liens = [...new Set(etat.liens)]
    const statuts = []
    for (const l of liens) {
      const r = await page.request.get(l)
      // La feuille de style telle que la page liée la déclare : une page intérieure écrit « ../styles.css ». Deviner
      // « styles.css » à côté de la page donnait un faux 404 sur /mentions-legales/ (14/09/2026, lien des crédits photo).
      const html = r.ok() ? await r.text() : ''
      const href = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel=["']?stylesheet/i.test(t)).map((t) => (t.match(/href=["']([^"']+)["']/i) || [])[1]).find(Boolean)
      const css = href ? new URL(href, l).href : null
      const rc = css ? await page.request.get(css) : null
      statuts.push(`${new URL(l).pathname} ${r.status()} · ${css ? `${href} ${rc.status()}` : 'aucune feuille de style déclarée'}`)
      if (r.status() !== 200 || !rc || rc.status() !== 200) echec++
    }
    console.log(`${nom} : vidéo ${etat.video ? (etat.video.joue ? `joue (${etat.video.temps} s)` : 'en pause') : etat.image ? 'affiche (mouvement réduit)' : 'absente'} · ${statuts.join(' ; ') || 'aucun lien vers la démo'}${erreurs.length ? ' · erreurs : ' + erreurs.join(' | ').slice(0, 200) : ''}`)
    if (!liens.length) echec++
  }
  await ctx.close()
}
await nav.close()
process.exit(echec ? 1 : 0)
