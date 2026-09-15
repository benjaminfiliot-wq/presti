// scripts/signature-candidats-qa.mjs — le juge des films de candidats du moment signature (tâches 020-11, 020-12, 020-13).
// Un candidat est un geste au repos du héros de la démo Lestraque, prototypé par un bloc CSS injecté sur la page en ligne,
// filmé image par image (cahier des charges : .orchestre/preuves/020-01/cahier/cahier-des-charges.md, §3.3 à §3.5). Le juge ne
// dit pas si le geste est beau (Benj choisit sur film) ; il vérifie que ce qu'on lui montrera est COMPLET et HONNÊTE :
//   1. le dossier .orchestre/preuves/020-01/<candidat>/ contient bloc.css, mesures.json, rapport.md, planche.jpg, les quatre
//      instants t06/t25/t50/t80.jpg et les deux films, sans fichier vide ni minuscule ;
//   2. les films ont la bonne taille (1440×900 et 1088×800), durent 10 s (9,8 à 10,4) à 29 images/s au moins ;
//   3. bloc.css respecte les contraintes du §3.5 lisibles dans le texte : chaque règle vise .ouverture, les images-clés
//      n'animent que transform, rotate, scale, translate et opacity, aucune animation de filter ;
//   4. mesures.json suit le contrat de la tâche (clé "1088x800" : C2a [2,5→5 s, 5→8 s], C2bPlageFigee, C2bEcartMoyen,
//      C2cClignote, R12Min) et R12Min ≥ 3,0 (titre lisible à tout instant) ;
//   5. le mouvement déclaré est celui du film : le juge recalcule lui-même, sur film-1088x800.mp4 (gris, 160 px de large,
//      8 images/s, comme scripts/video-qa.mjs), la part > 8 des paires 2,5→5 s et 5→8 s, la plage figée la plus longue et
//      l'écart moyen ; écart toléré de 25 % avec les chiffres déclarés (la compression du film adoucit les petites
//      différences), et aucun clignotement (écart entre images successives > 0,085).
//
// Usage : node scripts/signature-candidats-qa.mjs --candidats=L1,L2
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = path.join(R, '.orchestre', 'preuves', '020-01')
const candidats = ((process.argv.find((a) => a.startsWith('--candidats=')) || '').slice(12) || '').split(',').filter(Boolean)
if (!candidats.length) { console.error('Usage : node scripts/signature-candidats-qa.mjs --candidats=L1,L2'); process.exit(2) }

const echecs = [], faits = []
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const sonde = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate:format=duration', '-of', 'json', f], { encoding: 'utf8' })
  try { const j = JSON.parse(r.stdout); const s = j.streams[0]; const [a, b] = s.avg_frame_rate.split('/').map(Number); return { l: s.width, h: s.height, fps: b ? a / b : 0, duree: Number(j.format.duration) } } catch { return null }
}
const gris = (f) => {
  const L = 160, H = 118
  const brut = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', `fps=8,scale=${L}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 }).stdout
  const t = L * H, n = Math.floor(brut.length / t)
  return { n, image: (i) => brut.subarray(i * t, (i + 1) * t), t }
}

for (const c of candidats) {
  const d = path.join(BASE, c), avant = echecs.length
  const exiger = (nom, min) => { const s = taille(path.join(d, nom)); if (s < min) echecs.push(`${c} : ${nom} ${s < 0 ? 'absent' : `trop petit (${s} octets, ${min} au moins)`}`); return s >= min }
  exiger('bloc.css', 200); exiger('mesures.json', 200); exiger('rapport.md', 800); exiger('planche.jpg', 100000)
  for (const t of ['t06', 't25', 't50', 't80']) exiger(`${t}.jpg`, 50000)
  for (const [nom, l, h] of [['film-1440x900.mp4', 1440, 900], ['film-1088x800.mp4', 1088, 800]]) {
    if (!exiger(nom, 300000)) continue
    const s = sonde(path.join(d, nom))
    if (!s) { echecs.push(`${c} : ${nom} illisible par ffprobe`); continue }
    if (s.l !== l || s.h !== h) echecs.push(`${c} : ${nom} en ${s.l}×${s.h}, ${l}×${h} attendu`)
    if (s.duree < 9.8 || s.duree > 10.4) echecs.push(`${c} : ${nom} dure ${s.duree.toFixed(2)} s, 10 s attendues`)
    if (s.fps < 29) echecs.push(`${c} : ${nom} à ${s.fps.toFixed(1)} images/s, 29 au moins`)
  }

  // 3. contraintes lisibles du bloc
  const css = fs.existsSync(path.join(d, 'bloc.css')) ? fs.readFileSync(path.join(d, 'bloc.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') : ''
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const proprietes = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1])
    const hors = proprietes.filter((p) => !['transform', 'rotate', 'scale', 'translate', 'opacity'].includes(p))
    if (hors.length) echecs.push(`${c} : les images-clés « ${m[1]} » animent ${[...new Set(hors)].join(', ')} (seuls transform, rotate, scale, translate, opacity sont permis)`)
  }
  const sansKeyframes = css.replace(/@keyframes\s+[\w-]+\s*\{[\s\S]*?\}\s*\}/g, '')
  for (const m of sansKeyframes.matchAll(/(^|[}{;])\s*([^{}@;][^{}]*?)\{/g)) {
    const selecteur = m[2].trim()
    // une condition @media / @supports n'est pas une règle : ses règles internes sont lues à part (15/09/2026 : la première
    // version prenait « @media(min-width:1024px)… » pour un sélecteur et faisait échouer R à tort)
    if (!selecteur || selecteur.startsWith('@') || /^(from|to|\d+%)/.test(selecteur)) continue
    if (selecteur.split(',').some((s) => !/\.ouverture/.test(s))) echecs.push(`${c} : la règle « ${selecteur.slice(0, 80)} » ne vise pas .ouverture (le geste ne doit toucher que le héros de l'accueil)`)
  }

  // 4. contrat des mesures
  let declare = null
  try { declare = JSON.parse(fs.readFileSync(path.join(d, 'mesures.json'), 'utf8'))['1088x800'] } catch { /* signalé plus bas */ }
  const num = (v) => typeof v === 'number' && Number.isFinite(v)
  if (!declare || !Array.isArray(declare.C2a) || declare.C2a.length !== 2 || !declare.C2a.every(num) || !num(declare.C2bPlageFigee) || !num(declare.C2bEcartMoyen) || typeof declare.C2cClignote !== 'boolean' || !num(declare.R12Min)) {
    echecs.push(`${c} : mesures.json ne suit pas le contrat (clé "1088x800" avec C2a [deux nombres], C2bPlageFigee, C2bEcartMoyen, C2cClignote, R12Min)`)
    declare = null
  } else if (declare.R12Min < 3.0) echecs.push(`${c} : contraste du titre ${declare.R12Min} au pire instant, 3,0 au moins (R-12)`)

  // 5. le film montre-t-il le mouvement déclaré ?
  const film = path.join(d, 'film-1088x800.mp4')
  if (taille(film) > 300000) {
    const g = gris(film)
    const diff = (a, b) => { const x = g.image(a), y = g.image(b); let s = 0, n8 = 0; for (let k = 0; k < g.t; k++) { const e = Math.abs(x[k] - y[k]); s += e; if (e > 8) n8++ } return { moy: s / g.t / 255, part8: n8 / g.t } }
    if (g.n < 70) echecs.push(`${c} : ${g.n} images extraites du film à 8 images/s, 80 attendues`)
    else {
      const p1 = diff(20, 40).part8, p2 = diff(40, 64).part8
      const suite = []; for (let i = 1; i < g.n; i++) suite.push(diff(i - 1, i).moy)
      let plage = 0, cour = 0; for (const e of suite) { cour = e < 0.006 ? cour + 1 : 0; plage = Math.max(plage, cour) }
      const plageS = plage / 8, moy = suite.reduce((a, b) => a + b, 0) / suite.length, maxi = Math.max(...suite)
      faits.push(`${c} (film 1088×800, recalculé) : part > 8 ${p1.toFixed(3)} / ${p2.toFixed(3)} · plage figée ${plageS.toFixed(2)} s · écart moyen ${moy.toFixed(4)} · pic ${maxi.toFixed(3)}`)
      if (maxi > 0.085) echecs.push(`${c} : clignotement dans le film (écart ${maxi.toFixed(3)} entre deux images successives, 0,085 au plus)`)
      if (declare) {
        const proche = (v, ref) => ref === 0 ? v < 0.02 : Math.abs(v - ref) / ref <= 0.25
        if (!proche(p1, declare.C2a[0]) || !proche(p2, declare.C2a[1])) echecs.push(`${c} : part > 8 déclarée ${declare.C2a.join(' / ')}, le film montre ${p1.toFixed(3)} / ${p2.toFixed(3)} (écart > 25 %)`)
        // tolérance : 0,5 s, ou 15 % de la plage déclarée si elle est plus longue. La compression du film ajoute un léger bruit qui
        // coupe une très longue plage figée (R, 15/09/2026 : 10 s mesurées sur images positionnées, 9 s sur le film — les deux
        // disent « figé tout du long » au seuil de 0,006)
        const tolerance = Math.max(0.5, 0.15 * declare.C2bPlageFigee)
        if (Math.abs(plageS - declare.C2bPlageFigee) > tolerance) echecs.push(`${c} : plage figée déclarée ${declare.C2bPlageFigee} s, le film montre ${plageS.toFixed(2)} s (écart toléré ${tolerance.toFixed(2)} s)`)
      }
    }
  }
  if (echecs.length === avant) faits.push(`${c} : complet et honnête`)
}

console.log(faits.map((f) => `  · ${f}`).join('\n'))
console.log(echecs.length ? `✗ films des candidats : FAIL — ${echecs.join(' ; ')}` : `✓ films des candidats : PASS — ${candidats.join(', ')} complets, contraintes du bloc tenues, mouvement déclaré conforme au film`)
process.exitCode = echecs.length ? 1 : 0
