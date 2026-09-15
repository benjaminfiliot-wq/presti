import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium, sharp, DIR, TRAVAIL, ouvrir, positionner } from './outils.mjs'

const css = fs.readFileSync(DIR + 'bloc.css', 'utf8')
const formats = [
  { W: 1088, H: 800 },
  { W: 1440, H: 900 },
]

const INSTANTS = { 18: 't06', 75: 't25', 150: 't50', 240: 't80' } // k ↔ t = k/30 s

const nav = await chromium.launch()
try {
  for (const { W, H } of formats) {
    console.log(`Tournage ${W}x${H}...`)
    const dossier = TRAVAIL + `film-${W}x${H}/`
    fs.rmSync(dossier, { recursive: true, force: true })
    fs.mkdirSync(dossier, { recursive: true })

    const { ctx, page } = await ouvrir(nav, W, H, css)
    const d0 = Date.now()
    for (let k = 0; k < 300; k++) {
      const t = (k * 1000) / 30
      await positionner(page, t)
      const buf = await page.screenshot({ type: 'png' })
      fs.writeFileSync(dossier + `f${String(k).padStart(4, '0')}.png`, buf)
      if (W === 1088 && INSTANTS[k]) {
        const nom = INSTANTS[k]
        await sharp(buf).jpeg({ quality: 92 }).toFile(DIR + `${nom}.jpg`)
        console.log(`Instant ${nom}.jpg sauvé (${fs.statSync(DIR + `${nom}.jpg`).size} octets)`)
      }
      if (k % 60 === 0) {
        console.log(`  ${W}x${H}: image ${k}/300 (${((Date.now() - d0) / 1000).toFixed(1)}s)`)
      }
    }
    await ctx.close()

    const sortie = DIR + `film-${W}x${H}.mp4`
    console.log(`Encodage ffmpeg -> ${sortie}...`)
    execFileSync('ffmpeg', [
      '-y', '-v', 'error',
      '-framerate', '30',
      '-i', dossier + 'f%04d.png',
      '-c:v', 'libx264',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-movflags', '+faststart',
      sortie
    ])
    const stats = fs.statSync(sortie)
    console.log(`Film ${sortie} produit : ${stats.size} octets`)
  }
} finally {
  await nav.close()
}
console.log('Tournage termine avec succes.')
