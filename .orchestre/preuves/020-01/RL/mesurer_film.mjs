import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium, DIR, contraste, positionner, ouvrir } from './outils.mjs'

function analyserFilm(filmPath, H_ratio) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-rl-'))
  try {
    const vf = H_ratio === '1440x900' ? 'fps=8,scale=160:100:flags=lanczos,format=gray' : 'fps=8,scale=160:118:flags=lanczos,format=gray'
    execFileSync('ffmpeg', ['-v', 'error', '-i', filmPath, '-vf', vf, path.join(dossier, '%03d.raw')])
    const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.raw')).sort()
    const buffers = fichiers.map((f) => fs.readFileSync(path.join(dossier, f)))
    const t = buffers[0].length
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

async function mesurerR12(W, H, css) {
  const nav = await chromium.launch()
  try {
    const { ctx, page } = await ouvrir(nav, W, H, css)
    const cs = []
    // Échantillon de 40 instants sur le cycle de 20s de la rotation
    for (let k = 0; k < 40; k++) {
      await positionner(page, 500 * k)
      cs.push(await contraste(page))
    }
    await ctx.close()
    return Math.min(...cs)
  } finally {
    await nav.close()
  }
}

const css = fs.readFileSync(DIR + 'bloc.css', 'utf8')

console.log('Mesure du film 1088x800...')
const m1088 = analyserFilm(DIR + 'film-1088x800.mp4', '1088x800')
console.log('1088x800 film:', m1088)

console.log('Mesure du film 1440x900...')
const m1440 = analyserFilm(DIR + 'film-1440x900.mp4', '1440x900')
console.log('1440x900 film:', m1440)

console.log('Mesure R12 pour 1088x800 et 1440x900...')
const r12_1088 = await mesurerR12(1088, 800, css)
const r12_1440 = await mesurerR12(1440, 900, css)
console.log('R12 1088x800:', r12_1088, '1440x900:', r12_1440)

const data = {
  candidat: "RL",
  nom: "la cage tourne et la lumière",
  description: "Composition de la rotation R (demi-cycle 10s, Eb 1.07) et de la lumière rasante L2 (demi-cycle 5s, cours 24svh), lumière décalée d'un quart de période (-2.5s)",
  date: new Date().toISOString(),
  "1088x800": {
    C2a: m1088.C2a,
    C2bPlageFigee: m1088.C2bPlageFigee,
    C2bEcartMoyen: m1088.C2bEcartMoyen,
    C2cClignote: m1088.C2cClignote,
    R12Min: r12_1088
  },
  "1440x900": {
    C2a: m1440.C2a,
    C2bPlageFigee: m1440.C2bPlageFigee,
    C2bEcartMoyen: m1440.C2bEcartMoyen,
    C2cClignote: m1440.C2cClignote,
    R12Min: r12_1440
  },
  R4: {
    statut: "aucun coin découvert",
    Eb: 1.07,
    cas1: 0,
    cas2: 0,
    cas4: 0,
    details: "Scale statique Eb = 1.07 couvrant l'amplitude de 2.25deg en 34/25 et 4deg en 16/10 sans découvrir de coin sous les deux sens de rotation ni avec la poussée (conforme R §8.1)."
  }
}

fs.writeFileSync(DIR + 'mesures.json', JSON.stringify(data, null, 2))
console.log('mesures.json écrit avec succès.')
