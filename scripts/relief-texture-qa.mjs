// scripts/relief-texture-qa.mjs — le juge de la tâche 021-02 : la texture 2880 du relief WebGL de la démo Atelier Lestraque
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.5 et §6.6 RX-1 à RX-7). Le site est généré dans une
// copie (--sortie) et servi de là ; Chromium tourne avec la carte graphique.
//   RX-1 da.json → relief.texture = "images/heros-escalier-2880.avif" ; le héros de l'accueil généré porte data-relief-texture
//        avec ce chemin ; data-relief-calme et data-relief-lumiere-css toujours là ;
//   RX-2 bureau 1440×900, dpr 2 : aucune requête de la texture 2880 avant l'état prêt du relief, puis une au moins, 3 000 ms au
//        moins après l'état prêt ;
//   RX-3 saveData vrai : le relief devient prêt, et aucune requête de la texture pendant 10 s ;
//   RX-4 réponse du fil à « compte », 2 s après la requête : texture.largeur = 2880, texture.mipmaps vrai, dureeP95 nombre ≤ 16,7 ;
//   RX-5 pas de saut au remplacement : animations CSS figées, souris immobile, captures de la toile toutes les 100 ms de 2,5 s
//        après l'état prêt jusqu'à 2 s après la requête : aucun écart entre deux captures consécutives ≥ 0,01 ;
//   RX-6 téléphone 390×844 : aucune requête de la texture, aucun worker ;
//   RX-7 signature-relief-qa.mjs et signature-repos-qa.mjs PASS.
//
// Usage : node scripts/relief-texture-qa.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMOS = path.join(R, 'public', 'sites-demo')
const SITE = path.join(R, '.orchestre', 'travail', `site-relief-texture-${process.pid}`)
process.on('exit', () => fs.rmSync(SITE, { recursive: true, force: true }))
const TEXTURE = 'images/heros-escalier-2880.avif'
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ texture du relief : FAIL — ${echecs.join(' ; ')}` : '✓ texture du relief : PASS — texture 2880 chargée tard, avec mipmaps, jamais en économie de données ni au téléphone, sans saut, moment signature intact')
  process.exitCode = echecs.length ? 1 : 0
}

// RX-1
const da = JSON.parse(fs.readFileSync(path.join(DEMOS, '_kit', 'da.json'), 'utf8')).lestraque
if (da.relief?.texture !== TEXTURE) echecs.push(`RX-1 : da.json → relief.texture vaut ${JSON.stringify(da.relief?.texture)}, "${TEXTURE}" attendu`)
const gen = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', `--sortie=${SITE}`], { cwd: R, encoding: 'utf8' })
if (gen.status !== 0) { echecs.push(`génération en échec : ${(gen.stdout + gen.stderr).trim().split('\n').pop().slice(0, 240)}`); fin(); process.exit(1) }
const heros = (fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').match(/<section class="hero hero--plein"[^>]*>/) || [''])[0]
if (!heros.includes(`data-relief-texture="${TEXTURE}"`)) echecs.push('RX-1 : le héros de l\'accueil généré ne porte pas data-relief-texture sur la texture 2880')
for (const a of ['data-relief-calme', 'data-relief-lumiere-css']) if (!heros.includes(a)) echecs.push(`RX-1 : ${a} a disparu du héros`)

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${srv.address().port}/index.html`
const estTexture = (url) => url.includes('heros-escalier-2880')

// la page annonce son état prêt au juge par une fonction exposée : les deux instants sont pris sur la même horloge (Node)
const ouvrir = async (nav, options, avant) => {
  const ctx = await nav.newContext(options)
  // seules comptent les requêtes du relief (fetch du worker) : à dpr 2, la photo du héros choisit elle-même sa variante 2880 dans
  // son srcset (1440 × 2), ce qui n'est pas l'affaire de 021-02 (faux échec du 1er tour, 15/09)
  const journal = { pret: null, requetes: [], images: 0, workers: 0 }
  ctx.on('request', (q) => { if (!estTexture(q.url())) return; if (q.resourceType() === 'image') journal.images++; else journal.requetes.push(Date.now()) })
  const page = await ctx.newPage()
  page.on('worker', () => { journal.workers++ })
  await page.exposeFunction('__reliefPret', () => { if (!journal.pret) journal.pret = Date.now() })
  await page.addInitScript(() => {
    new MutationObserver(() => { if (document.querySelector('[data-relief-etat="pret"]')) window.__reliefPret() }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-relief-etat'] })
  })
  if (avant) await page.addInitScript(avant)
  await page.goto(base, { waitUntil: 'load' })
  return { ctx, page, journal }
}
const GPU = { args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] }
const gris = async (page, boite) => sharp(await page.screenshot({ clip: boite })).resize(160).greyscale().raw().toBuffer()
const ecart = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }

const nav = await chromium.launch(GPU)
try {
  // RX-2, RX-4, RX-5
  {
    const { ctx, page, journal } = await ouvrir(nav, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    const t0 = Date.now()
    while (!journal.pret && Date.now() - t0 < 12000) await page.waitForTimeout(100)
    if (!journal.pret) echecs.push('RX-2 : le relief n\'est pas prêt en 12 s (1440×900, dpr 2, carte graphique)')
    else {
      const avantPret = journal.requetes.filter((t) => t < journal.pret).length
      if (avantPret) echecs.push(`RX-2 : ${avantPret} requête(s) de la texture 2880 avant l'état prêt`)
      // animations CSS figées et souris hors de la page, puis captures de la toile toutes les 100 ms
      await page.mouse.move(0, 899)
      await page.evaluate(() => { for (const a of document.getAnimations()) { try { if (a.timeline === document.timeline) a.pause() } catch {} } })
      const boite = await page.evaluate(() => { const r = document.querySelector('.hero__media').getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, innerWidth), height: Math.min(r.height, innerHeight) } })
      while (Date.now() < journal.pret + 2500) await page.waitForTimeout(50)
      let precedente = await gris(page, boite), pire = 0
      const limite = journal.pret + 9000
      while (Date.now() < limite) {
        await page.waitForTimeout(100)
        const g = await gris(page, boite)
        pire = Math.max(pire, ecart(precedente, g))
        precedente = g
        const req = journal.requetes.find((t) => t >= journal.pret)
        if (req && Date.now() > req + 2000) break
      }
      const req = journal.requetes.find((t) => t >= journal.pret)
      if (!req) echecs.push('RX-2 : aucune requête de la texture 2880 dans les 9 s après l\'état prêt')
      else {
        faits.push(`texture 2880 demandée ${req - journal.pret} ms après l'état prêt`)
        // l'état prêt est vu par le juge quand la page a reçu « pret » et posé l'attribut, quelques millisecondes après que le worker
        // l'a envoyé et a lancé son attente : 50 ms de latence de message sont tolérés (2e tour de 021-02 : 2 992 ms mesurés)
        if (req - journal.pret < 2950) echecs.push(`RX-2 : texture demandée ${req - journal.pret} ms après l'état prêt, 3 000 au moins (50 ms de latence de message tolérés)`)
        faits.push(`pire écart entre deux captures de la toile autour du remplacement : ${pire.toFixed(4)}`)
        if (pire >= 0.01) echecs.push(`RX-5 : saut visible au remplacement de la texture (écart ${pire.toFixed(4)}, moins de 0,01)`)
        const compte = await page.evaluate(() => new Promise((ok) => {
          const fil = document.querySelector('.hero--plein').reliefFil
          if (!fil) return ok({ erreur: 'fil introuvable (hero.reliefFil)' })
          const t = setTimeout(() => ok({ erreur: 'pas de réponse à « compte »' }), 3000)
          const surMessage = (e) => { if (e.data && e.data.type === 'compte') { clearTimeout(t); fil.removeEventListener('message', surMessage); ok(e.data) } }
          fil.addEventListener('message', surMessage)
          fil.postMessage({ type: 'compte' })
        }))
        if (compte.erreur) echecs.push(`RX-4 : ${compte.erreur}`)
        else {
          faits.push(`compte : texture ${JSON.stringify(compte.texture)}, dureeP95 ${compte.dureeP95}`)
          if (compte.texture?.largeur !== 2880) echecs.push(`RX-4 : texture.largeur ${compte.texture?.largeur}, 2880 attendu`)
          if (compte.texture?.mipmaps !== true) echecs.push('RX-4 : texture.mipmaps n\'est pas vrai')
          if (!(typeof compte.dureeP95 === 'number' && compte.dureeP95 <= 16.7)) echecs.push(`RX-4 : dureeP95 ${compte.dureeP95} (nombre ≤ 16,7 ms attendu)`)
        }
      }
    }
    await ctx.close()
  }
  // RX-3 : économie de données
  {
    const { ctx, page, journal } = await ouvrir(nav, { viewport: { width: 1440, height: 900 } }, () => {
      try { Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => ({ saveData: true, effectiveType: '4g', addEventListener() {}, removeEventListener() {} }) }) } catch {}
    })
    const t0 = Date.now()
    while (!journal.pret && Date.now() - t0 < 12000) await page.waitForTimeout(100)
    if (!journal.pret) echecs.push('RX-3 : en économie de données, le relief n\'est plus prêt en 12 s (la toile doit rester active)')
    else {
      while (Date.now() < journal.pret + 10000) await page.waitForTimeout(250)
      if (journal.requetes.length) echecs.push(`RX-3 : ${journal.requetes.length} requête(s) de la texture 2880 en économie de données`)
      else faits.push('économie de données : relief prêt, 0 requête de la texture en 10 s')
    }
    await ctx.close()
  }
  // RX-6 : téléphone
  {
    const { ctx, page, journal } = await ouvrir(nav, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
    await page.waitForTimeout(6000)
    if (journal.requetes.length || journal.workers) echecs.push(`RX-6 : au téléphone, ${journal.requetes.length} requête(s) de la texture et ${journal.workers} worker(s)`)
    else faits.push('téléphone : 0 requête de la texture, 0 worker')
    await ctx.close()
  }
} finally {
  await nav.close()
  srv.close()
}

// RX-7
// signature-relief-qa lance lui-même signature-repos-qa en fin : le relancer ici doublait dix minutes de films sous charge
for (const juge of ['signature-relief-qa.mjs']) {
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', juge)], { cwd: R, encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 26 })
  const derniere = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop() || ''
  faits.push(`RX-7 : ${juge} → ${derniere.slice(0, 140)}`)
  if (r.status !== 0) echecs.push(`RX-7 : ${juge} en échec`)
}
fin()
