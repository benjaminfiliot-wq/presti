// films.mjs <variante> <L> <H> — film de 10 s à 30 images/s, page en haut, héros seul, sans carte graphique. Chaque image est
// positionnée (t = k/30 s, k = 0..299) puis capturée en PNG ; assemblage ffmpeg (libx264, crf 20, yuv420p, sans son, faststart).
// En 1088×800, les instants t06, t25, t50, t80 (demo-images-cles.mjs:29 : 0,6 s, 2,5 s, 5 s, 8 s) sont gardés en JPEG.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium, sharp, DIR, TRAVAIL, bloc, ouvrir, positionner } from './outils.mjs'
const [nom, L, H] = process.argv.slice(2); const W = +L, Hh = +H
const p = JSON.parse(fs.readFileSync(TRAVAIL + `var-${nom}.json`, 'utf8')).params
const css = bloc(p)
const dossier = TRAVAIL + `film-${W}x${Hh}/`
fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true })
const INSTANTS = { 18: 't06', 75: 't25', 150: 't50', 240: 't80' } // image k ↔ t = k/30 s
const nav = await chromium.launch()
const info = { variante: nom, format: `${W}x${Hh}`, images: 300, ips: 30 }
try {
  const { ctx, page } = await ouvrir(nav, W, Hh, css)
  const d0 = Date.now()
  for (let k = 0; k < 300; k++) {
    const t = (k * 1000) / 30
    await positionner(page, t)
    const buf = await page.screenshot({ type: 'png' })
    fs.writeFileSync(dossier + `f${String(k).padStart(4, '0')}.png`, buf)
    if (W === 1088 && INSTANTS[k]) await sharp(buf).jpeg({ quality: 92 }).toFile(DIR + `instant-1088x800-${INSTANTS[k]}.jpg`)
    if (k === 150) info.etat_t5000 = await page.evaluate(() => ({ relief: document.querySelector('.hero--plein').getAttribute('data-relief-etat'), navAppel: document.querySelector('.nav').classList.contains('nav--appel') }))
    if (k === 18 || k === 75) info[`navAppel_k${k}`] = await page.evaluate(() => ({ classe: document.querySelector('.nav').classList.contains('nav--appel'), opaciteDevis: getComputedStyle(document.querySelector('.nav__devis')).opacity }))
  }
  info.dureeCapture_s = +((Date.now() - d0) / 1000).toFixed(1)
  await ctx.close()
} finally { await nav.close() }
const sortie = DIR + `film-${W}x${Hh}.mp4`
execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '30', '-i', dossier + 'f%04d.png', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', sortie])
info.fichier = sortie
info.octets = fs.statSync(sortie).size
fs.writeFileSync(TRAVAIL + `film-${W}x${Hh}.json`, JSON.stringify(info, null, 1))
console.log(JSON.stringify(info))
