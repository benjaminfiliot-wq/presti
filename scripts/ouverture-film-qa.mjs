// scripts/ouverture-film-qa.mjs — le juge de la tâche 021-15 : le prototype filmé d'ouverture au bureau, où le regard remonte du
// puits de l'escalier jusqu'à la photo du héros au repos (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md,
// §4.3 et OU-1 à OU-7). Il lit .orchestre/preuves/021-15/ et compare la fin du film à l'accueil, capturé par le juge lui-même.
//   OU-1 fichiers : ouverture-1440x900.h264.mp4, ouverture-1088x800.h264.mp4, leurs AV1 (.av1.mp4), cote-a-cote.mp4, planche.jpg,
//        mesures.json, tournage.mjs, rapport.md ≥ 800 caractères (CC BY-SA 4.0, Petar Milošević, lien Commons, sha256 d'un fichier
//        heros-escalier du site) ;
//   OU-2 ffprobe des quatre films : durée de 3,0 à 5,0 s, définition du nom, ≥ 29 images/s, aucune piste audio ;
//   OU-3 dernière image contre l'accueil au même format, capturé par le juge avec la carte graphique, relief prêt, animations
//        figées à 0, souris hors de la page : écart moyen < 0,006 ;
//   OU-4 mouvement : part > 8 entre la première et la dernière image ≥ 0,30 ;
//   OU-5 aucun écart > 0,085 entre deux images consécutives ;
//   OU-6 mesures.json égal aux mesures recalculées (±0,01 ; poids exacts) ;
//   OU-7 rien dans le site : les photos heros-escalier identiques au dépôt, aucun fichier non suivi sous public/ au nom de la tâche.
//
// Usage : node scripts/ouverture-film-qa.mjs [--dossier=<preuve>]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argDossier = process.argv.find((a) => a.startsWith('--dossier='))
const P = argDossier ? path.resolve(argDossier.slice('--dossier='.length)) : path.join(R, '.orchestre', 'preuves', '021-15')
const DEMOS = path.join(R, 'public', 'sites-demo')
const SITE = path.join(R, '.orchestre', 'travail', `site-ouverture-${process.pid}`)
process.on('exit', () => fs.rmSync(SITE, { recursive: true, force: true }))
const FORMATS = [[1440, 900], [1088, 800]]
const echecs = [], faits = []
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ ouverture filmée : FAIL — ${echecs.join(' ; ')}` : '✓ ouverture filmée : PASS — deux formats, fin identique au héros au repos, geste visible sans à-coup, mesures honnêtes, licence, site intact')
  process.exitCode = echecs.length ? 1 : 0
}

// OU-1
const FICHIERS = [...FORMATS.flatMap(([l, h]) => [`ouverture-${l}x${h}.h264.mp4`, `ouverture-${l}x${h}.av1.mp4`]), 'cote-a-cote.mp4', 'planche.jpg', 'mesures.json', 'tournage.mjs', 'rapport.md']
for (const f of FICHIERS) if (taille(path.join(P, f)) <= 0) echecs.push(`OU-1 : ${f} absent ou vide`)
if (echecs.length) { fin(); process.exit(1) }
const rapport = fs.readFileSync(path.join(P, 'rapport.md'), 'utf8')
if (rapport.length < 800) echecs.push(`OU-1 : rapport.md de ${rapport.length} caractères, 800 au moins`)
for (const [nom, motif] of [['la licence CC BY-SA 4.0', /CC BY-SA 4\.0/], ['l\'auteur Petar Milošević', /Petar Milo[sš]evi[cć]/], ['le lien Commons', /commons\.wikimedia\.org/]]) if (!motif.test(rapport)) echecs.push(`OU-1 : rapport.md sans ${nom}`)
const IMG = path.join(DEMOS, 'lestraque', 'images')
const empreintes = fs.readdirSync(IMG).filter((f) => f.startsWith('heros-escalier')).map((f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(IMG, f))).digest('hex'))
if (!(rapport.match(/\b[0-9a-f]{64}\b/gi) || []).some((h) => empreintes.includes(h.toLowerCase()))) echecs.push('OU-1 : aucune empreinte sha256 du rapport ne correspond à une photo heros-escalier du site')

// OU-2, OU-4, OU-5 et les mesures de chaque film
const sonde = (f) => { const s = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(P, f)], { encoding: 'utf8' }).stdout || '{}'); const v = (s.streams || []).find((x) => x.codec_type === 'video') || {}; const [a, b] = String(v.avg_frame_rate).split('/').map(Number); return { l: v.width, h: v.height, ips: b ? a / b : 0, duree: Number(s.format?.duration), audio: (s.streams || []).some((x) => x.codec_type === 'audio') } }
const gris160 = (f, l, h) => {
  const hh = Math.round(160 * h / l), brut = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(P, f), '-vf', `scale=160:${hh},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 }).stdout
  const n = 160 * hh
  return Array.from({ length: Math.floor(brut.length / n) }, (_, i) => brut.subarray(i * n, (i + 1) * n))
}
const ecart = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
const mesures = {}
for (const [l, h] of FORMATS) {
  for (const codec of ['h264', 'av1']) {
    const f = `ouverture-${l}x${h}.${codec}.mp4`, s = sonde(f)
    if (!(s.duree >= 3.0 && s.duree <= 5.02)) echecs.push(`OU-2 : ${f} dure ${s.duree.toFixed(2)} s, de 3,0 à 5,0 attendu`)
    if (s.l !== l || s.h !== h) echecs.push(`OU-2 : ${f} en ${s.l} × ${s.h}, ${l} × ${h} attendu`)
    if (s.ips < 29) echecs.push(`OU-2 : ${f} à ${s.ips.toFixed(1)} images/s, 29 au moins`)
    if (s.audio) echecs.push(`OU-2 : ${f} a une piste audio`)
  }
  const images = gris160(`ouverture-${l}x${h}.h264.mp4`, l, h)
  if (images.length < 10) { echecs.push(`OU-4 : ${images.length} images décodées de ouverture-${l}x${h}.h264.mp4`); continue }
  const a = images[0], z = images[images.length - 1]
  let n8 = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - z[i]) > 8) n8++
  let pic = 0; for (let k = 1; k < images.length; k++) pic = Math.max(pic, ecart(images[k - 1], images[k]))
  mesures[`${l}x${h}`] = { duree: sonde(`ouverture-${l}x${h}.h264.mp4`).duree, part8PremiereDerniere: n8 / a.length, ecartMaxConsecutif: pic, poids: { h264: taille(path.join(P, `ouverture-${l}x${h}.h264.mp4`)), av1: taille(path.join(P, `ouverture-${l}x${h}.av1.mp4`)) } }
  faits.push(`${l}×${h} : part > 8 première/dernière ${(n8 / a.length).toFixed(3)}, pic consécutif ${pic.toFixed(3)}`)
  if (n8 / a.length < 0.30) echecs.push(`OU-4 : ${l}×${h}, part > 8 ${(n8 / a.length).toFixed(3)} entre la première et la dernière image, 0,30 au moins`)
  if (pic > 0.085) echecs.push(`OU-5 : ${l}×${h}, écart ${pic.toFixed(3)} entre deux images consécutives, 0,085 au plus`)
}

// OU-3 : l'accueil capturé par le juge
const gen = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', `--sortie=${SITE}`], { cwd: R, encoding: 'utf8' })
if (gen.status !== 0) { echecs.push(`OU-3 : génération de l'accueil en échec (${(gen.stdout + gen.stderr).trim().split('\n').pop().slice(0, 200)})`); fin(); process.exit(1) }
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const nav = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] })
try {
  for (const [l, h] of FORMATS) {
    const ctx = await nav.newContext({ viewport: { width: l, height: h } })
    const page = await ctx.newPage()
    await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' })
    const pret = await page.waitForSelector('[data-relief-etat="pret"]', { timeout: 12000 }).then(() => true).catch(() => false)
    if (!pret) faits.push(`${l}×${h} : relief pas prêt en 12 s, capture sans relief`)
    await page.mouse.move(-1, -1)
    await page.waitForTimeout(1500)
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0 } catch {} } })
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.waitForTimeout(300)
    const capture = await page.screenshot({ type: 'png' })
    await ctx.close()
    const derniere = path.join(SITE, `derniere-${l}.png`)
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.3', '-i', path.join(P, `ouverture-${l}x${h}.h264.mp4`), '-update', '1', '-frames:v', '100', derniere])
    if (!fs.existsSync(derniere)) { echecs.push(`OU-3 : dernière image de ouverture-${l}x${h} non décodée`); continue }
    const hh = Math.round(160 * h / l)
    const [a, b] = await Promise.all([capture, derniere].map((x) => sharp(x).resize(160, hh, { fit: 'fill' }).greyscale().raw().toBuffer()))
    const e = ecart(a, b)
    if (mesures[`${l}x${h}`]) mesures[`${l}x${h}`].ecartDerniereImage = e
    faits.push(`${l}×${h} : dernière image contre l'accueil au repos, écart ${e.toFixed(4)}`)
    if (e >= 0.006) echecs.push(`OU-3 : ${l}×${h}, la dernière image s'écarte du héros au repos (${e.toFixed(4)}, moins de 0,006) : saut au relais`)
  }
} finally { await nav.close(); srv.close() }

// OU-6
let m = null
try { m = JSON.parse(fs.readFileSync(path.join(P, 'mesures.json'), 'utf8')) } catch { echecs.push('OU-6 : mesures.json illisible') }
if (m) {
  for (const [cle, v] of Object.entries(mesures)) {
    const d = m[cle]
    if (!d) { echecs.push(`OU-6 : mesures.json sans l'entrée ${cle}`); continue }
    for (const k of ['duree', 'part8PremiereDerniere', 'ecartMaxConsecutif', 'ecartDerniereImage']) {
      if (typeof v[k] !== 'number') continue
      const tol = k === 'duree' ? 0.05 : 0.01
      if (typeof d[k] !== 'number' || Math.abs(d[k] - v[k]) > tol) echecs.push(`OU-6 : ${cle}.${k} déclaré ${d[k]}, recalculé ${v[k].toFixed(4)} (±${tol})`)
    }
    if (!d.poids || d.poids.h264 !== v.poids.h264 || d.poids.av1 !== v.poids.av1) echecs.push(`OU-6 : ${cle}.poids déclarés ${JSON.stringify(d.poids)}, fichiers ${JSON.stringify(v.poids)}`)
  }
}

// OU-7
const git = (...a) => spawnSync('git', a, { cwd: R, encoding: 'utf8' }).stdout.trim()
for (const f of fs.readdirSync(IMG).filter((x) => x.startsWith('heros-escalier'))) {
  const rel = `public/sites-demo/lestraque/images/${f}`
  const suivi = git('rev-parse', `HEAD:${rel}`)
  if (suivi && git('hash-object', rel) !== suivi) echecs.push(`OU-7 : ${rel} diffère du dépôt`)
}
const intrus = git('ls-files', '--others', '--exclude-standard', '--', 'public').split('\n').filter((f) => /ouverture|puits|021-15/i.test(f))
if (intrus.length) echecs.push(`OU-7 : fichiers de la tâche sous public/ : ${intrus.join(', ')}`)

fin()
