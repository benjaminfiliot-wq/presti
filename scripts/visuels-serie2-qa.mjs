#!/usr/bin/env node
// Juge de la tâche 022-05 — les visuels Instagram de la série 2 (publications/serie-2/pub-NN-instagram.jpg).
//
// Pourquoi : l'API d'Instagram refuse une image de fil hors du rapport 4:5 à 1,91:1, et hors JPEG. Les visuels désignés
// d'abord par la série 2 étaient des miniatures verticales 9:16 et un WebP — tous les six auraient été refusés (mesuré le
// 15/09).
//
// Il lance LUI-MÊME le générateur (scripts/visuels-serie2.mjs) : un exécutant en bac à sable ne peut pas lancer de
// sous-processus, et une image déposée à la main ne prouve rien. Puis il mesure chaque fichier et fabrique sa propre planche
// (publications/serie-2/planche-juge.jpg) que Claude Code regarde avant de dire vert : ce juge ne sait pas lire un titre ni
// juger une composition, l'œil si.
//
// Usage : node scripts/visuels-serie2-qa.mjs
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const NUMEROS = ['11', '12', '14', '15', '16']
const DOSSIER = 'publications/serie-2'
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const fin = () => { console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués`); process.exit(ko === 0 ? 0 : 1) }

if (!fs.existsSync('scripts/visuels-serie2.mjs')) { T('scripts/visuels-serie2.mjs existe', false); fin() }
console.log('1. Le générateur, lancé par le juge')
for (const n of NUMEROS) { try { fs.rmSync(`${DOSSIER}/pub-${n}-instagram.jpg`) } catch { /* absent */ } }
const r = spawnSync(process.execPath, ['scripts/visuels-serie2.mjs'], { encoding: 'utf8', timeout: 120000 })
T('le générateur sort en 0', r.status === 0, `${r.status} ${(r.stderr || r.stdout || '').slice(-400)}`)

console.log('\n2. Chaque visuel')
const md = fs.readFileSync('plans/publications-serie-2.md', 'utf8')
const vignettes = []
for (const n of NUMEROS) {
  const f = `${DOSSIER}/pub-${n}-instagram.jpg`
  if (!fs.existsSync(f)) { T(`n° ${n} : ${f} existe`, false); continue }
  const m = await sharp(f).metadata()
  const taille = fs.statSync(f).size
  T(`n° ${n} : JPEG 1080×1350 (rapport 4:5, accepté par Instagram)`, m.format === 'jpeg' && m.width === 1080 && m.height === 1350, `${m.format} ${m.width}×${m.height}`)
  T(`n° ${n} : entre 60 Ko et 1,5 Mo`, taille >= 60_000 && taille <= 1_500_000, `${Math.round(taille / 1024)} Ko`)
  const st = await sharp(f).stats()
  const ecart = st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3
  T(`n° ${n} : pas une image vide ou unie (écart-type moyen > 25)`, ecart > 25, ecart.toFixed(1))
  // stats() mesure l'image d'ENTRÉE et ignore extract() : il faut matérialiser la découpe d'abord (sinon haut = bas, toujours).
  const haut = await sharp(await sharp(f).extract({ left: 0, top: 0, width: 1080, height: 420 }).toBuffer()).stats()
  const bas = await sharp(await sharp(f).extract({ left: 0, top: 560, width: 1080, height: 790 }).toBuffer()).stats()
  const moy = (s) => s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3
  T(`n° ${n} : le haut (titre) et le bas (capture) ne sont pas la même chose`, Math.abs(moy(haut) - moy(bas)) > 4 || Math.abs(haut.channels[0].stdev - bas.channels[0].stdev) > 4)
  const titre = (new RegExp(`^# Publication n° ${n} — « (.+?) »`, 'm').exec(md) || [])[1]
  T(`n° ${n} : sa publication existe dans plans/publications-serie-2.md`, !!titre)
  vignettes.push({ n, f })
}

console.log('\n3. La planche du juge (à regarder)')
if (vignettes.length) {
  const L = 432, H = 540
  const cases = await Promise.all(vignettes.map(async (v, i) => ({ input: await sharp(v.f).resize(L, H).toBuffer(), left: i * L, top: 0 })))
  await sharp({ create: { width: vignettes.length * L, height: H, channels: 3, background: '#000' } }).composite(cases).jpeg({ quality: 85 }).toFile(`${DOSSIER}/planche-juge.jpg`)
  T('planche écrite : publications/serie-2/planche-juge.jpg', fs.existsSync(`${DOSSIER}/planche-juge.jpg`))
}
fin()
