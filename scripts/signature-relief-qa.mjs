// scripts/signature-relief-qa.mjs — le juge de la tâche 020-15 : le relief WebGL de l'escalier accordé au moment signature au repos
// (cahier .orchestre/preuves/020-01/cahier/cahier-des-charges.md, §3.6, §7.4 et §7.5, parties 020-02 hors texture 2880).
// Sur un bureau avec carte graphique, la photo tourne (signature-tourne-*) et le relief se dessine dans une toile posée dessus :
// la toile doit tourner EXACTEMENT avec la photo, et le relief ne doit plus ajouter ses propres mouvements (dérive, creusement
// périodique, bande de lumière) au geste choisi par Benj, pour ne garder qu'un mouvement (C7). Le projecteur prend aussi le décalage
// de 2,5 s du film RL validé.
//
// Le juge régénère la démo, la sert en local et l'ouvre dans Chromium AVEC carte graphique (--use-gl=angle --enable-webgl
// --ignore-gpu-blocklist, les réglages de la vérification du relief en production) :
//   1. l'accueil porte data-relief-calme et data-relief-lumiere-css sur le héros ;
//   2. le calque ::before anime signature-projecteur avec un délai de −2 500 ms (1440×900) ;
//   3. le relief atteint data-relief-etat="pret" en 10 s au plus (1440×900), sans erreur de console ;
//   4. synchronisation : chaque animation de la photo (pousse, signature-tourne-*) existe sur la toile, avec un écart de
//      currentTime ≤ 50 ms ; pareil après un passage de 1280×1024 à 1440×900 (redimensionnement réel) ;
//   5. calme : le fil répond à « compte » avec calme = true, derive = 0 et lumiere = 0 après 3 s sans souris ;
//   6. calme à l'image : animations CSS figées et souris immobile, deux captures de la toile à 4 s d'écart diffèrent de moins de
//      0,004 (écart moyen gris, 160 px de large) ;
//   7. le geste au repos reste dans la cible (scripts/signature-repos-qa.mjs PASS).
//
// Usage : node scripts/signature-relief-qa.mjs
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
  console.log(echecs.length ? `✗ relief de la signature : FAIL — ${echecs.join(' ; ')}` : '✓ relief de la signature : PASS — la toile tourne avec la photo, relief calme, projecteur décalé de 2,5 s, geste au repos dans la cible')
  process.exitCode = echecs.length ? 1 : 0
}

const gen = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque'], { cwd: R, encoding: 'utf8' })
if (gen.status !== 0) { echecs.push(`la génération échoue : ${(gen.stderr || gen.stdout || '').trim().split('\n').slice(-2).join(' | ').slice(0, 240)}`); fin(); process.exit(1) }
const accueil = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
const heroTag = (accueil.match(/<section class="hero hero--plein"[^>]*>/) || [''])[0]
for (const attr of ['data-relief-calme', 'data-relief-lumiere-css']) if (!heroTag.includes(attr)) echecs.push(`le héros de l'accueil ne porte pas ${attr}`)

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json', bin: 'application/octet-stream' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}/index.html`

const ecartToiles = (page) => page.evaluate(() => {
  const img = document.querySelector('.ouverture>.hero--plein .hero__media img'), toile = document.querySelector('.hero__relief')
  if (!img || !toile) return { erreur: `photo ${!!img}, toile ${!!toile}` }
  const ai = img.getAnimations().filter((a) => a.animationName), at = toile.getAnimations().filter((a) => a.animationName)
  return { lignes: ai.map((a) => { const b = at.find((x) => x.animationName === a.animationName); return { nom: a.animationName, ecart: b ? Math.abs((a.currentTime || 0) - (b.currentTime || 0)) : null } }) }
})
const verifierSynchro = (etat, ou) => {
  if (etat.erreur) { echecs.push(`${ou} : ${etat.erreur}`); return }
  const noms = etat.lignes.map((l) => l.nom)
  if (!noms.some((n) => /^signature-tourne/.test(n))) echecs.push(`${ou} : la photo n'a pas d'animation signature-tourne-* (${noms.join(', ') || 'aucune'})`)
  for (const l of etat.lignes) {
    if (l.ecart === null) echecs.push(`${ou} : la toile n'a pas l'animation ${l.nom} de la photo`)
    else if (l.ecart > 50) echecs.push(`${ou} : ${l.nom} décalée de ${Math.round(l.ecart)} ms entre photo et toile (50 au plus)`)
  }
  if (etat.lignes.every((l) => l.ecart !== null && l.ecart <= 50)) faits.push(`${ou} : ${etat.lignes.map((l) => `${l.nom} ${Math.round(l.ecart)} ms`).join(', ')}`)
}
const attendrePret = (page) => page.waitForSelector('[data-relief-etat="pret"]', { timeout: 10000 }).then(() => true).catch(() => false)

const nav = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] })
try {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const erreurs = []
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })
  page.on('pageerror', (e) => erreurs.push(e.message))
  await page.goto(base, { waitUntil: 'load' })

  const delai = await page.evaluate(() => {
    const m = document.querySelector('.ouverture>.hero--plein .hero__media')
    const a = document.getAnimations().find((x) => x.animationName === 'signature-projecteur' && x.effect && x.effect.target === m)
    return a ? a.effect.getTiming().delay : null
  })
  if (delai === null) echecs.push('1440×900 : animation signature-projecteur introuvable sur le calque')
  else if (Math.abs(delai + 2500) > 1) echecs.push(`1440×900 : délai du projecteur ${delai} ms, −2 500 ms attendus (film RL)`)
  else faits.push('projecteur décalé de −2 500 ms')

  if (!(await attendrePret(page))) {
    const etat = await page.evaluate(() => document.querySelector('.hero--plein')?.getAttribute('data-relief-etat'))
    echecs.push(`1440×900 : le relief n'est pas prêt en 10 s (data-relief-etat = ${etat})`)
  } else {
    faits.push('relief prêt avec carte graphique')
    await page.waitForTimeout(1200)
    verifierSynchro(await ecartToiles(page), 'synchronisation 1440×900')

    const compte = await page.evaluate(() => new Promise((ok) => {
      const fil = document.querySelector('.hero--plein').reliefFil
      if (!fil) return ok({ erreur: 'fil introuvable (hero.reliefFil)' })
      const t = setTimeout(() => ok({ erreur: 'pas de réponse à « compte »' }), 3000)
      const surMessage = (e) => { if (e.data && e.data.type === 'compte') { clearTimeout(t); fil.removeEventListener('message', surMessage); ok(e.data) } }
      fil.addEventListener('message', surMessage)
      setTimeout(() => fil.postMessage({ type: 'compte' }), 3200)
    }))
    if (compte.erreur) echecs.push(`calme : ${compte.erreur}`)
    else {
      faits.push(`fil : calme ${compte.calme}, derive ${compte.derive}, lumiere ${compte.lumiere}`)
      if (compte.calme !== true) echecs.push(`calme : le fil répond calme = ${compte.calme} (true attendu)`)
      if (compte.derive !== 0) echecs.push(`calme : dérive ${compte.derive} après 3 s sans souris (0 attendu)`)
      if (compte.lumiere !== 0) echecs.push(`calme : lumière du shader ${compte.lumiere} avec la lumière CSS (0 attendu)`)
    }

    await page.evaluate(() => { for (const a of document.getAnimations()) if (a.timeline === document.timeline) a.pause() })
    const boite = await page.evaluate(() => { const r = document.querySelector('.hero__media').getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, innerWidth), height: Math.min(r.height, innerHeight) } })
    const g1 = await sharp(await page.screenshot({ clip: boite })).resize(160).greyscale().raw().toBuffer()
    await page.waitForTimeout(4000)
    const g2 = await sharp(await page.screenshot({ clip: boite })).resize(160).greyscale().raw().toBuffer()
    let s = 0; for (let i = 0; i < g1.length; i++) s += Math.abs(g1[i] - g2[i])
    const ecart = s / g1.length / 255
    faits.push(`toile au repos, animations CSS figées : écart ${ecart.toFixed(4)} en 4 s`)
    if (ecart >= 0.004) echecs.push(`calme à l'image : la toile bouge d'elle-même (écart ${ecart.toFixed(4)} en 4 s, moins de 0,004 attendu)`)
  }
  if (erreurs.length) echecs.push(`erreurs de console : ${erreurs.slice(0, 3).join(' | ').slice(0, 240)}`)
  await ctx.close()

  const ctx2 = await nav.newContext({ viewport: { width: 1280, height: 1024 } })
  const page2 = await ctx2.newPage()
  await page2.goto(base, { waitUntil: 'load' })
  if (await attendrePret(page2)) {
    await page2.setViewportSize({ width: 1440, height: 900 })
    await page2.waitForTimeout(1500)
    verifierSynchro(await ecartToiles(page2), 'après passage de 1280×1024 à 1440×900')
  } else echecs.push('1280×1024 : le relief n\'est pas prêt en 10 s, redimensionnement non vérifiable')
  await ctx2.close()
} finally {
  await nav.close()
  srv.close()
}

const repos = spawnSync(process.execPath, [path.join(R, 'scripts', 'signature-repos-qa.mjs')], { cwd: R, encoding: 'utf8', timeout: 540000 })
if (repos.status !== 0) echecs.push(`geste au repos : ${(repos.stdout || '').trim().split('\n').pop().slice(0, 240)}`)
else faits.push('geste au repos : PASS')
fin()
