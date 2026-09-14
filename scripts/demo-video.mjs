// scripts/demo-video.mjs — la capture animée de LA démo pour la landing (prompt v16 §3.4) : courte, muette, ≤ 1,5 Mo, et
// passée au juge vidéo (scripts/video-qa.mjs : 12–60 s, aucun plan figé > 0,8 s, ≥ 5 coupes par 10 s, énergie d'image).
//
// Comment : Playwright enregistre la démo servie en local (bureau 1280×800 puis mobile 390×844) pendant une visite scriptée —
// le rideau, le titre qui entre, la lumière, le défilement jusqu'aux réalisations, l'atelier sombre, une question qui
// s'ouvre, la bande d'appel. ffmpeg découpe ensuite des plans de 1,5 s pris là où quelque chose bouge, les met au même
// cadre 1280×720 (un plan mobile est posé à côté de l'ordinateur sur la même section : 880 + 400 px), les enchaîne en coupes franches, et encode en
// H.264 sans son, débit plafonné pour tenir sous 1,5 Mo. Le résultat et son affiche vont dans public/promo/demo-site/.
//
// Usage : node scripts/demo-video.mjs [dossier=public/sites-demo/lestraque] [--garder]
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dossier = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) || 'public/sites-demo/lestraque')
const SORTIE = path.join(RACINE, 'public', 'promo', 'demo-site')
const TRAVAIL = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-video-'))
const POIDS_MAX = 1_500_000
fs.mkdirSync(SORTIE, { recursive: true })

const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2' }
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(dossier, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
await new Promise((r) => srv.listen(0, r))
const url = `http://127.0.0.1:${srv.address().port}/index.html`
const ff = (args) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`ffmpeg : ${(r.stderr || '').slice(0, 300)}`) }

// Un défilement doux jusqu'à un élément, en N pas (la page bouge pendant l'enregistrement : pas de saut)
async function glisser(page, selecteur, duree = 1400, decalage = -80) {
  await page.evaluate(async ({ selecteur, duree, decalage }) => {
    const el = document.querySelector(selecteur); if (!el) return
    const depart = scrollY, cible = Math.max(0, el.getBoundingClientRect().top + scrollY + decalage), t0 = performance.now()
    await new Promise((fin) => { const pas = (t) => { const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3); scrollTo(0, depart + (cible - depart) * e); k < 1 ? requestAnimationFrame(pas) : fin() }; requestAnimationFrame(pas) })
  }, { selecteur, duree, decalage })
}

async function enregistrer(nom, viewport, visite) {
  const nav = await chromium.launch()
  const ctx = await nav.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: TRAVAIL, size: viewport } })
  // le téléphone ne filme pas le rideau d'ouverture : en plan étroit, il donnait une colonne orange au milieu du cadre (14/09)
  if (nom === 'mobile') await ctx.addInitScript(() => { try { sessionStorage.setItem('rideau', '1') } catch (e) {} })
  const page = await ctx.newPage()
  const t0 = Date.now()
  const marques = {}
  const marquer = (cle) => { marques[cle] = (Date.now() - t0) / 1000 }
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await visite(page, marquer)
  const video = page.video()
  await ctx.close(); await nav.close()
  const f = path.join(TRAVAIL, `${nom}.webm`)
  fs.renameSync(await video.path(), f)
  return { f, marques }
}

const bureau = await enregistrer('bureau', { width: 1280, height: 800 }, async (page, marquer) => {
  marquer('debut'); await page.waitForTimeout(1900)                    // rideau, mot à mot, Ken Burns, la lentille apparaît
  // la souris promène la lentille (la révélation suit le pointeur) : le plan bouge, et il montre l'interaction
  // un aller-retour ample et rapide : au premier essai (12 px par pas), la lentille bougeait trop peu pour se voir à l'échelle
  // d'analyse du juge (1,25 s « figées », 14/09) ; ici elle traverse la moitié droite du héros et revient
  marquer('souris')
  for (let i = 0; i <= 18; i++) { await page.mouse.move(640 + i * 30, 600 - i * 20); await page.waitForTimeout(35) }
  for (let i = 0; i <= 18; i++) { await page.mouse.move(1180 - i * 24, 240 + i * 14); await page.waitForTimeout(35) }
  await page.waitForTimeout(500)
  marquer('realisations'); await glisser(page, '#realisations', 1600); await page.waitForTimeout(1200)
  marquer('galerie'); await glisser(page, '.galerie', 1400, 40); await page.waitForTimeout(900)
  marquer('etapes'); await glisser(page, '#etapes', 1600); await page.waitForTimeout(1400)
  marquer('liste'); await glisser(page, '.etapes__liste', 1600, 120); await page.waitForTimeout(800)
  marquer('questions'); await glisser(page, '#questions', 1400); await page.click('.faq summary').catch(() => {}); await page.waitForTimeout(1200)
  marquer('contact'); await glisser(page, '#contact', 1500); await page.waitForTimeout(1500)
  marquer('fin')
})
const mobile = await enregistrer('mobile', { width: 390, height: 844 }, async (page, marquer) => {
  marquer('debut'); await page.waitForTimeout(2600)
  marquer('defile'); await glisser(page, '#prestations', 1800); await page.waitForTimeout(700)
  marquer('galerie'); await glisser(page, '#realisations', 1600); await page.waitForTimeout(900)
  marquer('fin')
})
srv.close()

// Les plans : [source, début en s, durée]. Chaque plan est pris pendant un mouvement (entrée, défilement, dévoilement).
const D = 1.5
const b = bureau.marques, m = mobile.marques
// Le héros ne se prend que pendant l'entrée (rideau, mots, Ken Burns : 0,2 → 1,4 s) : après, seule la lumière bouge, trop
// peu pour le juge (1,65 s « figées » au premier essai, 14/09) — le second plan de héros est pris sur mobile, en entrée aussi.
const plans = [
  [bureau.f, b.debut + 0.2, 0.9],
  [bureau.f, b.souris + 0.1, 1.3],
  [mobile.f, m.debut + 0.3, 1.1, b.souris + 0.8],
  [bureau.f, b.realisations + 0.2, D], [bureau.f, b.galerie + 0.1, D],
  [mobile.f, m.defile + 1.0, D, b.realisations + 0.3],
  [bureau.f, b.etapes + 0.1, D], [bureau.f, b.liste + 0.1, D],
  [mobile.f, m.galerie + 0.6, 1.2, b.galerie + 0.1],
  [bureau.f, b.questions + 0.3, D], [bureau.f, b.contact + 0.1, D],
]
const fond = '#1F160E'
const morceaux = []
plans.forEach(([src, debut, duree, pairBureau], i) => {
  const out = path.join(TRAVAIL, `plan-${String(i).padStart(2, '0')}.mp4`)
  const estMobile = src === mobile.f
  const filtre = estMobile
    ? `scale=-2:720,pad=1280:720:(ow-iw)/2:0:color=${fond},fps=30,format=yuv420p`
    : `scale=1280:-2,crop=1280:720:0:0,fps=30,format=yuv420p`   // recadré par le bas : la navigation reste entière (affiche du 14/09 coupée en haut)
  if (estMobile && pairBureau !== undefined) {
    // ordinateur 880×720 à gauche (recadré depuis le bord gauche : le titre reste entier), téléphone 400×720 à droite (le haut de l'écran), côte à côte
    ff(['-ss', pairBureau.toFixed(2), '-t', duree.toFixed(2), '-i', bureau.f, '-ss', debut.toFixed(2), '-t', duree.toFixed(2), '-i', src, '-an',
      '-filter_complex', `[0:v]scale=1280:-2,crop=880:720:0:0[g];[1:v]scale=400:-2,crop=400:720:0:0[d];[g][d]hstack=inputs=2,fps=30,format=yuv420p[v]`, '-map', '[v]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
  } else ff(['-ss', debut.toFixed(2), '-t', duree.toFixed(2), '-i', src, '-an', '-vf', filtre, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
  morceaux.push(out)
})
const liste = path.join(TRAVAIL, 'liste.txt')
fs.writeFileSync(liste, morceaux.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'))
const brut = path.join(TRAVAIL, 'brut.mp4')
ff(['-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', brut])

// Encodage final : deux passes à débit visé pour tenir sous POIDS_MAX, sans son, démarrage rapide (faststart)
const duree = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', brut], { encoding: 'utf8' }).stdout.trim())
const final = path.join(SORTIE, 'lestraque.mp4')
for (const kbps of [Math.floor((POIDS_MAX * 8 * 0.9) / duree / 1000), 520, 420]) {
  const nul = process.platform === 'win32' ? 'NUL' : '/dev/null'
  ff(['-i', brut, '-an', '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-pass', '1', '-passlogfile', path.join(TRAVAIL, 'passe'), '-f', 'mp4', nul])
  ff(['-i', brut, '-an', '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.4)}k`, '-bufsize', `${kbps * 2}k`, '-pass', '2', '-passlogfile', path.join(TRAVAIL, 'passe'), '-movflags', '+faststart', '-pix_fmt', 'yuv420p', final])
  if (fs.statSync(final).size <= POIDS_MAX) break
}
ff(['-ss', '1.6', '-i', final, '-frames:v', '1', '-vf', 'scale=1280:-2', '-c:v', 'libwebp', '-quality', '72', path.join(SORTIE, 'lestraque-affiche.webp')])
const poids = fs.statSync(final).size
console.log(`✓ ${path.relative(RACINE, final)} · ${duree.toFixed(1)} s · ${plans.length} plans · ${(poids / 1e6).toFixed(2)} Mo${poids > POIDS_MAX ? ' — ✗ AU-DESSUS DE 1,5 Mo' : ''} · affiche ${path.relative(RACINE, path.join(SORTIE, 'lestraque-affiche.webp'))}`)
if (!process.argv.includes('--garder')) fs.rmSync(TRAVAIL, { recursive: true, force: true })
process.exit(poids > POIDS_MAX ? 1 : 0)
