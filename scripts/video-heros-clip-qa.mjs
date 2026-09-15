// scripts/video-heros-clip-qa.mjs — le juge de la tâche 021-07 : le plan de 5 s du geste signature pour le héros du téléphone
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §4.1, §4.2 « Le plan filmé » et §6.5 VC-1 à VC-10). Il lit
// .orchestre/preuves/021-07/ et compare le film à la vraie page du téléphone, servie en local.
//   VC-1 fichiers : heros-tel.av1.mp4, heros-tel.h264.mp4, planche.jpg, mesures.json, tournage.mjs, rapport.md, coins/ ;
//   VC-2 ffprobe : durée ≤ 5,0 s ; 720 × 1280 ; ≥ 29 images/s ; aucune piste audio ; H.264 High niveau ≤ 3.1 ; AV1 Main ;
//   VC-3 poids : AV1 ≤ 200 000 octets, H.264 ≤ 300 000 octets ;
//   VC-4 coins : aucune image de coins/ (tournage de contrôle sur fond magenta) ne montre de magenta ;
//   VC-5 première image du H.264, affichée comme la vidéo le sera (object-fit: cover dans la boîte du héros), contre le héros
//        actuel du téléphone (390 × 844, dpr 3, tout masqué sauf la photo, voile ôté, animations à 0) : écart moyen < 0,006 ;
//   VC-6 mouvement : part > 8 entre l'image à 2,5 s et la dernière image ≥ 0,56 ;
//   VC-7 titre lisible : une image sur cinq, affichée en cover sous le vrai voile de la page (lu par getComputedStyle), boîte du
//        titre relevée sur la page : contraste du texte blanc au p90 des luminances ≥ 3,0 ;
//   VC-8 aucun écart > 0,085 entre deux images consécutives ;
//   VC-9 mesures.json égal aux mesures recalculées (tolérances écrites plus bas) ;
//   VC-10 rapport.md ≥ 800 caractères : source heros-escalier-portrait, Petar Milošević, CC BY-SA 4.0, lien Commons, empreinte
//        sha256 d'un fichier heros-escalier-portrait du site.
//
// Usage : node scripts/video-heros-clip-qa.mjs [--dossier=<preuve>] [--images=<dossier>]
//   --dossier : essai du juge sur un autre dossier ; --images : écrit les deux images comparées par VC-5, pour les regarder
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
const P = argDossier ? path.resolve(argDossier.slice('--dossier='.length)) : path.join(R, '.orchestre', 'preuves', '021-07')
const DEMOS = path.join(R, 'public', 'sites-demo'), SITE = path.join(DEMOS, 'lestraque')
const echecs = [], faits = []
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ plan de 5 s du téléphone : FAIL — ${echecs.join(' ; ')}` : '✓ plan de 5 s du téléphone : PASS — formats, poids, coins, raccord avec la photo, mouvement, titre lisible, mesures honnêtes, licence')
  process.exitCode = echecs.length ? 1 : 0
}
const AV1 = path.join(P, 'heros-tel.av1.mp4'), H264 = path.join(P, 'heros-tel.h264.mp4')

// VC-1
for (const f of ['heros-tel.av1.mp4', 'heros-tel.h264.mp4', 'planche.jpg', 'mesures.json', 'tournage.mjs', 'rapport.md']) if (taille(path.join(P, f)) <= 0) echecs.push(`VC-1 : ${f} absent ou vide`)
const coins = fs.existsSync(path.join(P, 'coins')) ? fs.readdirSync(path.join(P, 'coins')).filter((f) => /\.(png|jpe?g)$/i.test(f)) : []
if (!coins.length) echecs.push('VC-1 : coins/ absent ou sans image')
if (echecs.length) { fin(); process.exit(1) }

// VC-2, VC-3
const sonde = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }).stdout || '{}')
let duree = 0, ips = 30
for (const [f, nom] of [[H264, 'H.264'], [AV1, 'AV1']]) {
  const s = sonde(f), v = (s.streams || []).find((x) => x.codec_type === 'video')
  if (!v) { echecs.push(`VC-2 : ${nom} sans piste vidéo lisible`); continue }
  const d = Number(s.format.duration), [a, b] = String(v.avg_frame_rate).split('/').map(Number), fps = b ? a / b : 0
  if (nom === 'H.264') { duree = d; ips = fps }
  if (d > 5.02) echecs.push(`VC-2 : ${nom} dure ${d.toFixed(2)} s, 5,0 au plus`)
  if (v.width !== 720 || v.height !== 1280) echecs.push(`VC-2 : ${nom} en ${v.width} × ${v.height}, 720 × 1280 attendu`)
  if (fps < 29) echecs.push(`VC-2 : ${nom} à ${fps.toFixed(1)} images/s, 29 au moins`)
  if ((s.streams || []).some((x) => x.codec_type === 'audio')) echecs.push(`VC-2 : ${nom} a une piste audio`)
  if (nom === 'H.264' && (v.codec_name !== 'h264' || !/High/i.test(v.profile || '') || Number(v.level) > 31)) echecs.push(`VC-2 : H.264 ${v.codec_name} profil ${v.profile} niveau ${v.level} (High, niveau ≤ 3.1 attendu)`)
  if (nom === 'AV1' && (v.codec_name !== 'av1' || !/Main/i.test(v.profile || ''))) echecs.push(`VC-2 : AV1 ${v.codec_name} profil ${v.profile} (av1 Main attendu)`)
}
const poids = { av1: taille(AV1), h264: taille(H264) }
faits.push(`poids : AV1 ${poids.av1} o, H.264 ${poids.h264} o ; durée ${duree.toFixed(2)} s à ${ips.toFixed(1)} images/s`)
if (poids.av1 > 200000) echecs.push(`VC-3 : AV1 ${poids.av1} octets, 200 000 au plus`)
if (poids.h264 > 300000) echecs.push(`VC-3 : H.264 ${poids.h264} octets, 300 000 au plus`)

// VC-4
let magenta = 0
for (const f of coins) {
  const { data, info } = await sharp(path.join(P, 'coins', f)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] > 200) magenta++
}
faits.push(`coins : ${coins.length} images de contrôle, ${magenta} pixel(s) magenta`)
if (magenta > 0) echecs.push(`VC-4 : ${magenta} pixels magenta dans coins/ (coins découverts)`)

// images du H.264, en couleur, à la taille du fichier
const LW = 720, LH = 1280
const images = (() => {
  const brut = spawnSync('ffmpeg', ['-v', 'error', '-i', H264, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 }).stdout
  const t = LW * LH * 3, n = Math.floor(brut.length / t)
  return Array.from({ length: n }, (_, i) => brut.subarray(i * t, (i + 1) * t))
})()
if (images.length < 10) { echecs.push(`VC-5 à VC-8 : ${images.length} images décodées du H.264`); fin(); process.exit(1) }
const gris160 = (rgb) => sharp(rgb, { raw: { width: LW, height: LH, channels: 3 } }).resize(160).greyscale().raw().toBuffer()
const ecartMoyen = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }

// VC-6, VC-8
const i25 = Math.min(images.length - 1, Math.round(2.5 * ips)), iFin = images.length - 1
const g25 = await gris160(images[i25]), gFin = await gris160(images[iFin])
let n8 = 0; for (let i = 0; i < g25.length; i++) if (Math.abs(g25[i] - gFin[i]) > 8) n8++
const part8 = n8 / g25.length
let ecartMax = 0, precedente = await gris160(images[0])
for (let k = 1; k < images.length; k++) { const g = await gris160(images[k]); ecartMax = Math.max(ecartMax, ecartMoyen(precedente, g)); precedente = g }
faits.push(`mouvement 2,5 s → fin : part > 8 ${part8.toFixed(3)} ; pic entre deux images ${ecartMax.toFixed(3)}`)
if (part8 < 0.56) echecs.push(`VC-6 : part > 8 ${part8.toFixed(3)} entre 2,5 s et la fin, 0,56 au moins`)
if (ecartMax > 0.085) echecs.push(`VC-8 : écart ${ecartMax.toFixed(3)} entre deux images consécutives, 0,085 au plus`)

// VC-5, VC-7 : la vraie page du téléphone, puis le film affiché comme il le sera
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json' }
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  let f = path.join(SITE, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
const nav = await chromium.launch()
const lum = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
let ecartPremiere = 1, contrasteMin = 0
try {
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage()
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' })
  await page.waitForTimeout(2000)
  const rel = await page.evaluate(() => {
    const media = document.querySelector('.hero--plein .hero__media'), h1 = document.querySelector('.hero--plein h1')
    const m = media.getBoundingClientRect(), t = h1.getBoundingClientRect()
    return { l: m.width, h: m.height, haut: m.top, voile: getComputedStyle(media, '::after').backgroundImage, titre: { x: t.left - m.left, y: t.top - m.top, width: t.width, height: t.height } }
  })
  const visible = Math.min(rel.h, 844 - rel.haut)
  faits.push(`page du téléphone : boîte du héros ${rel.l} × ${rel.h} px, titre en ${Math.round(rel.titre.x)}, ${Math.round(rel.titre.y)} sur ${Math.round(rel.titre.width)} × ${Math.round(rel.titre.height)} px`)
  await page.addStyleTag({ content: 'body *{visibility:hidden!important}.hero--plein .hero__media,.hero--plein .hero__media *{visibility:visible!important}.hero--plein .hero__media::after{display:none!important}' })
  // les animations liées au défilement refusent un temps absolu : page en haut, elles sont déjà à leur départ
  await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0 } catch {} } })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const photo = await page.screenshot({ clip: { x: 0, y: rel.haut, width: rel.l, height: visible }, type: 'png' })

  const banc = await (await nav.newContext({ viewport: { width: Math.ceil(rel.l), height: Math.max(844, Math.ceil(rel.h)) }, deviceScaleFactor: 1 })).newPage()
  await banc.setContent(`<style>html,body{margin:0;background:#0E0A07}#b{position:relative;width:${rel.l}px;height:${rel.h}px;overflow:hidden}#i{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}#v{position:absolute;inset:0}</style><div id="b"><img id="i" alt=""><div id="v"></div></div>`)
  await banc.evaluate((voile) => { document.getElementById('v').style.backgroundImage = voile }, rel.voile)
  const afficher = async (k, voile) => {
    const src = `data:image/png;base64,${(await sharp(images[k], { raw: { width: LW, height: LH, channels: 3 } }).png().toBuffer()).toString('base64')}`
    await banc.evaluate(async ([s, v]) => { const i = document.getElementById('i'); i.src = s; await i.decode(); document.getElementById('v').style.display = v ? 'block' : 'none' }, [src, voile])
  }

  const H160 = Math.round(160 * visible / rel.l)
  await afficher(0, false)
  const film0 = await banc.screenshot({ clip: { x: 0, y: 0, width: rel.l, height: visible }, type: 'png' })
  const argImages = process.argv.find((x) => x.startsWith('--images='))
  if (argImages) { const d = path.resolve(argImages.slice('--images='.length)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'vc5-photo-page.png'), photo); fs.writeFileSync(path.join(d, 'vc5-film-image0.png'), film0) }
  const [a, b] = await Promise.all([photo, film0].map((x) => sharp(x).resize(160, H160, { fit: 'fill' }).greyscale().raw().toBuffer()))
  ecartPremiere = ecartMoyen(a, b)

  const t = rel.titre, x0 = Math.max(0, Math.floor(t.x)), y0 = Math.max(0, Math.floor(t.y))
  const zone = { x: x0, y: y0, width: Math.max(1, Math.min(Math.ceil(t.x + t.width), Math.floor(rel.l)) - x0), height: Math.max(1, Math.min(Math.ceil(t.y + t.height), Math.floor(visible)) - y0) }
  contrasteMin = Infinity
  for (let k = 0; k < images.length; k += 5) {
    await afficher(k, true)
    const { data, info } = await sharp(await banc.screenshot({ clip: zone, type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const Ls = []; for (let i = 0; i < data.length; i += info.channels) Ls.push(0.2126 * lum(data[i]) + 0.7152 * lum(data[i + 1]) + 0.0722 * lum(data[i + 2]))
    Ls.sort((p, q) => p - q)
    contrasteMin = Math.min(contrasteMin, 1.05 / (Ls[Math.floor(0.9 * (Ls.length - 1))] + 0.05))
  }
} finally { await nav.close(); srv.close() }
faits.push(`première image contre la photo du téléphone : écart ${ecartPremiere.toFixed(4)}`)
if (ecartPremiere >= 0.006) echecs.push(`VC-5 : la première image s'écarte de la photo affichée (${ecartPremiere.toFixed(4)}, moins de 0,006) : saut visible au remplacement`)
faits.push(`contraste du titre au pire instant, voile de la page compris : ${contrasteMin.toFixed(2)}`)
if (contrasteMin < 3.0) echecs.push(`VC-7 : contraste de la zone du titre ${contrasteMin.toFixed(2)}, 3,0 au moins à chaque image mesurée`)

// VC-9
let m = null
try { m = JSON.parse(fs.readFileSync(path.join(P, 'mesures.json'), 'utf8')) } catch { echecs.push('VC-9 : mesures.json illisible') }
if (m) {
  const proche = (nom, declare, mesure, tol) => { if (typeof declare !== 'number' || Math.abs(declare - mesure) > tol) echecs.push(`VC-9 : ${nom} déclaré ${declare}, recalculé ${Number(mesure).toFixed(4)} (±${tol})`) }
  proche('duree', m.duree, duree, 0.05)
  if (!m.poids || m.poids.av1 !== poids.av1 || m.poids.h264 !== poids.h264) echecs.push(`VC-9 : poids déclarés ${JSON.stringify(m.poids)}, fichiers ${JSON.stringify(poids)}`)
  proche('ecartPremiereImage', m.ecartPremiereImage, ecartPremiere, 0.01)
  proche('part8_25_50', m.part8_25_50, part8, 0.01)
  proche('contrasteMin', m.contrasteMin, contrasteMin, 0.1)
  proche('ecartMaxConsecutif', m.ecartMaxConsecutif, ecartMax, 0.01)
  if (!(typeof m.echelleBase === 'number' && m.echelleBase >= 1)) echecs.push(`VC-9 : echelleBase ${m.echelleBase} (nombre ≥ 1 attendu)`)
}

// VC-10
const rapport = fs.readFileSync(path.join(P, 'rapport.md'), 'utf8')
for (const [nom, motif] of [['la source heros-escalier-portrait', /heros-escalier-portrait/], ['l\'auteur Petar Milošević', /Petar Milo[sš]evi[cć]/], ['la licence CC BY-SA 4.0', /CC BY-SA 4\.0/], ['le lien Commons', /commons\.wikimedia\.org/]]) if (!motif.test(rapport)) echecs.push(`VC-10 : rapport.md sans ${nom}`)
if (rapport.length < 800) echecs.push(`VC-10 : rapport.md de ${rapport.length} caractères, 800 au moins`)
const empreintes = fs.readdirSync(path.join(SITE, 'images')).filter((f) => f.startsWith('heros-escalier-portrait')).map((f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SITE, 'images', f))).digest('hex'))
const citees = rapport.match(/\b[0-9a-f]{64}\b/gi) || []
if (!citees.some((h) => empreintes.includes(h.toLowerCase()))) echecs.push('VC-10 : aucune empreinte sha256 du rapport ne correspond à un fichier heros-escalier-portrait du site')

fin()
