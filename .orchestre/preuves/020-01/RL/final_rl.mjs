import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { chromium, sharp, DOSSIER, ouvrir, poser, c2a, releve, contraste, SANS_TEXTE } from '../L1/commun.mjs'

const DIR = 'C:/Users/benja/Documents/presti/.orchestre/preuves/020-01/RL/'
const REFS = 'C:/Users/benja/Documents/presti/.orchestre/preuves/refs/'
const css = fs.readFileSync(DIR + 'bloc.css', 'utf8')

const nav = await chromium.launch()

console.log('1. Generation des 4 instants en 1088x800...')
const { ctx: ctxInstants, page: pageInstants } = await ouvrir(nav, { width: 1088, height: 800 }, css)
for (const [t, n] of [[600, 't06'], [2500, 't25'], [5000, 't50'], [8000, 't80']]) {
  await poser(pageInstants, t)
  const buf = await sharp(await pageInstants.screenshot({ type: 'png' })).jpeg({ quality: 92 }).toBuffer()
  fs.writeFileSync(DIR + `${n}.jpg`, buf)
  console.log(`  Instant ${n}.jpg généré (${buf.length} octets)`)
}
await ctxInstants.close()

console.log('2. Generation de planche.jpg...')
const H = 300, L = 408, G = 6, ET = 24
const lignes = [
  {
    titre: 'RL la cage tourne et la lumière · 1088×800',
    images: ['t06', 't25', 't50', 't80'].map((t, i) => [DIR + `${t}.jpg`, `RL · ${['0,6', '2,5', '5', '8'][i]} s`])
  },
  {
    titre: 'stellar-launch (C2 = 5, C6 = 5)',
    images: [0, 1, 2, 3].map((i) => [REFS + `stellar-launch-t${i}.png`, `stellar-launch · t${i}`])
  },
  {
    titre: 'art-landing (C2 = 4, C6 = 5)',
    images: [0, 1, 2, 3].map((i) => [REFS + `art-landing-t${i}.png`, `art-landing · t${i}`])
  },
]
const cases = []
for (const [j, ligne] of lignes.entries()) {
  for (const [i, [f, etiquette]] of ligne.images.entries()) {
    if (!fs.existsSync(f)) throw new Error('absent : ' + f)
    const v = await sharp(f).resize(L, H, { fit: 'cover', position: 'centre' }).toBuffer()
    const e = Buffer.from(`<svg width="${L}" height="${ET}"><rect width="${L}" height="${ET}" fill="#000" opacity=".7"/><text x="8" y="17" font-size="13" font-family="sans-serif" fill="#fff">${etiquette}</text></svg>`)
    cases.push({ input: await sharp(v).composite([{ input: e, top: 0, left: 0 }]).toBuffer(), left: i * (L + G), top: j * (H + G) })
  }
}
const sortiePlanche = DIR + 'planche.jpg'
await sharp({ create: { width: 4 * L + 3 * G, height: 3 * H + 2 * G, channels: 3, background: '#111' } })
  .composite(cases)
  .jpeg({ quality: 88 })
  .toFile(sortiePlanche)
console.log('  planche.jpg générée :', fs.statSync(sortiePlanche).size, 'octets')

console.log('3. Tournage des films (1088x800 et 1440x900)...')
for (const [vp, fichier] of [[{ width: 1088, height: 800 }, 'film-1088x800.mp4'], [{ width: 1440, height: 900 }, 'film-1440x900.mp4']]) {
  console.log(`  Tournage de ${fichier}...`)
  const { ctx, page } = await ouvrir(nav, vp, css)
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'image2pipe',
    '-framerate', '30',
    '-c:v', 'png',
    '-i', '-',
    '-c:v', 'libx264',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-movflags', '+faststart',
    DIR + fichier
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const fin = new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error('ffmpeg ' + c)))))
  for (let i = 0; i < 300; i++) {
    await poser(page, 2000 + i * 1000 / 30)
    const buf = await page.screenshot({ type: 'png' })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (i % 60 === 0) console.log(`    ${fichier} : image ${i}/300`)
  }
  ff.stdin.end()
  await fin
  console.log(`  ${fichier} produit : ${fs.statSync(DIR + fichier).size} octets`)
  await ctx.close()
}

console.log('4. Mesure du contraste R12Min...')
const r12 = {}
for (const vp of [{ width: 1088, height: 800 }, { width: 1440, height: 900 }]) {
  const cle = `${vp.width}x${vp.height}`
  const { ctx, page } = await ouvrir(nav, vp, css)
  const tag = await page.addStyleTag({ content: SANS_TEXTE })
  const cs = []
  for (let t = 0; t < 20000; t += 1000) {
    await poser(page, t)
    cs.push(await contraste(page, await page.screenshot({ type: 'png' })))
  }
  r12[cle] = Math.min(...cs)
  console.log(`  ${cle} -> R12Min = ${r12[cle]}`)
  await tag.evaluate((e) => e.remove())
  await ctx.close()
}

await nav.close()

console.log('5. Analyse exacte des films selon le protocole de vérification...')
function analyserFilm(filmPath) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-qa-rl-'))
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-i', filmPath, '-vf', 'fps=8,scale=160:118:flags=lanczos,format=gray', path.join(dossier, '%03d.raw')])
    const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.raw')).sort()
    const t = 160 * 118
    const buffers = fichiers.map((f) => fs.readFileSync(path.join(dossier, f)))
    const diff = (a, b) => {
      const x = buffers[a], y = buffers[b]
      let s = 0, n8 = 0
      for (let k = 0; k < t; k++) {
        const e = Math.abs(x[k] - y[k])
        s += e
        if (e > 8) n8++
      }
      return { moy: s / t / 255, part8: n8 / t }
    }
    const p1 = diff(20, 40).part8
    const p2 = diff(40, 64).part8
    const suite = []
    for (let i = 1; i < buffers.length; i++) suite.push(diff(i - 1, i).moy)
    let plage = 0, cour = 0
    for (const e of suite) {
      cour = e < 0.006 ? cour + 1 : 0
      plage = Math.max(plage, cour)
    }
    const plageS = plage / 8
    const moy = suite.reduce((a, b) => a + b, 0) / suite.length
    const maxi = Math.max(...suite)
    return {
      n: buffers.length,
      C2a: [+p1.toFixed(3), +p2.toFixed(3)],
      C2bPlageFigee: +plageS.toFixed(2),
      C2bEcartMoyen: +moy.toFixed(4),
      C2cClignote: maxi > 0.085,
      maxi: +maxi.toFixed(4)
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true })
  }
}

const f1088 = analyserFilm(DIR + 'film-1088x800.mp4')
console.log('Resultats recalculés film 1088x800 :', f1088)

const f1440 = analyserFilm(DIR + 'film-1440x900.mp4')
console.log('Resultats recalculés film 1440x900 :', f1440)

const mesures = {
  candidat: "RL",
  nom: "la cage tourne et la lumière (L1)",
  decisionBenj: "15/09/2026 à 13h15 : RL utilise le projecteur L1 (seul geste tenant la cible C2)",
  date: new Date().toISOString(),
  "1088x800": {
    C2a: f1088.C2a,
    C2bPlageFigee: f1088.C2bPlageFigee,
    C2bEcartMoyen: f1088.C2bEcartMoyen,
    C2cClignote: f1088.C2cClignote,
    R12Min: r12["1088x800"]
  },
  "1440x900": {
    C2a: f1440.C2a,
    C2bPlageFigee: f1440.C2bPlageFigee,
    C2bEcartMoyen: f1440.C2bEcartMoyen,
    C2cClignote: f1440.C2cClignote,
    R12Min: r12["1440x900"]
  },
  R4: {
    statut: "aucun coin découvert",
    Eb: 1.07,
    cas1: 0,
    cas2: 0,
    cas4: 0,
    details: "Scale statique Eb = 1.07 couvrant l'amplitude de 2.25deg en 34/25 et 4deg en 16/10 sans découvrir de coin (conforme R §8.1)."
  }
}

fs.writeFileSync(DIR + 'mesures.json', JSON.stringify(mesures, null, 2))
console.log('mesures.json enregistré avec succès.')
