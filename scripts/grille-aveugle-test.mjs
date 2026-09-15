// scripts/grille-aveugle-test.mjs — le juge des tâches 018-03 puis 018-09. Il fait tourner scripts/grille-aveugle.mjs sur les
// images-clés existantes : la démo (.orchestre/preuves/016-02) et cinq références MotionSites (.orchestre/preuves/refs/<id>-t0..t3.png).
// L'outil doit rendre une planche par sujet, anonyme (une lettre, rien d'autre), une clé RANGÉE HORS du dossier remis au juge,
// et des consignes qui ne trahissent jamais lequel est la démo.
// Renforcé le 15/09/2026 (tâche 018-09) : au jugement final de la vague 3, l'agent préparateur a refusé les planches, à juste
// titre — la démo sortait en 16:10 et nette quand les références sortaient en 4:3, floues, à coins arrondis, et ses quatre
// images étaient toutes prises sur le héros sans défilement ; la clé était dans le même dossier. On reconnaissait la démo à
// l'œil. D'où, en plus : planches aux dimensions identiques, netteté comparable (variance du laplacien de la démo dans un
// facteur 1,6 de la médiane des références), images de la démo réparties sur le défilement, clé hors du dossier.
//
// Usage : node scripts/grille-aveugle-test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTIL = path.join(R, 'scripts', 'grille-aveugle.mjs')
const IDS = ['luxury-real-estate', 'stellar-launch', 'art-landing', 'agency-services', 'cinematic-landing-page']
const BASE = path.join(R, '.orchestre', 'preuves', '018-09')
const CLES = path.join(BASE, 'cles')
const echecs = []

if (!fs.existsSync(OUTIL)) { console.log('✗ grille aveugle : FAIL — scripts/grille-aveugle.mjs absent'); process.exit(1) }

function lancer(graine, nom) {
  const sortie = path.join(BASE, nom)
  const cle = path.join(CLES, `${nom}.json`)
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(CLES, { recursive: true })
  try { fs.unlinkSync(cle) } catch { /* pas de clé précédente */ }
  const r = spawnSync(process.execPath, [OUTIL, '--demo=.orchestre/preuves/016-02', '--refs=.orchestre/preuves/refs', `--ids=${IDS.join(',')}`, `--graine=${graine}`, `--sortie=${path.relative(R, sortie)}`, `--cle=${path.relative(R, cle)}`], { cwd: R, encoding: 'utf8', timeout: 5 * 60 * 1000 })
  if (r.status !== 0) echecs.push(`graine ${graine} : code ${r.status} — ${(r.stderr || r.stdout || '').slice(-300)}`)
  return { sortie, cle }
}

const a = lancer(42, 'essai-42')
const b = lancer(42, 'essai-42-bis')
const c = lancer(7, 'essai-7')
const lireCle = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const cleA = lireCle(a.cle), cleB = lireCle(b.cle), cleC = lireCle(c.cle)

// la clé n'est jamais dans le dossier remis au juge
for (const { sortie } of [a, b, c]) {
  if (fs.existsSync(sortie)) {
    const fuite = fs.readdirSync(sortie).find((f) => /cle|key/i.test(f) || f.endsWith('.json'))
    if (fuite) echecs.push(`${path.relative(R, sortie)} contient « ${fuite} » : la clé (et tout JSON) doit être rangée hors du dossier remis au juge (--cle)`)
  }
}

if (!cleA) echecs.push('clé absente ou illisible à l\'emplacement --cle')
else {
  const sujets = cleA.sujets || {}
  const lettres = Object.keys(sujets)
  const valeurs = Object.values(sujets)
  if (lettres.length !== IDS.length + 1) echecs.push(`clé : ${lettres.length} sujets, attendu ${IDS.length + 1}`)
  if (!lettres.every((l) => /^[A-Z]$/.test(l))) echecs.push('clé : chaque sujet doit être une lettre majuscule seule')
  if (valeurs.filter((v) => v === 'demo').length !== 1) echecs.push('clé : exactement un sujet doit valoir « demo »')
  for (const id of IDS) if (!valeurs.includes(id)) echecs.push(`clé : la référence ${id} manque`)
  if (cleA.graine !== 42) echecs.push('clé : champ graine absent ou faux')
  const demoImages = cleA.imagesDemo
  if (!Array.isArray(demoImages) || demoImages.length !== 4) echecs.push('clé : imagesDemo doit lister les 4 fichiers de la démo utilisés')
  else {
    const auDefilement = demoImages.filter((f) => /-d\d+\.png$|bureau-page/.test(f)).length
    if (auDefilement < 2) echecs.push(`clé : ${auDefilement} image(s) de la démo prise(s) au défilement, au moins 2 attendues (les références vont du héros au défilement) — reçu ${demoImages.join(', ')}`)
  }

  const fichiers = fs.readdirSync(a.sortie)
  const dims = []
  const nettete = {}
  for (const l of lettres) {
    const f = fichiers.find((x) => x === `planche-${l}.jpg` || x === `planche-${l}.png`)
    if (!f) { echecs.push(`planche du sujet ${l} absente (planche-${l}.jpg ou .png)`); continue }
    const p = path.join(a.sortie, f)
    const m = await sharp(p).metadata()
    dims.push([l, m.width, m.height])
    if (m.width < 1600 || m.height < 400) echecs.push(`${f} : ${m.width}×${m.height}, attendu au moins 1600×400`)
    if (m.exif || m.comments || m.xmp || m.iptc) echecs.push(`${f} : métadonnées présentes (exif/xmp/commentaire)`)
    // netteté : variance de la réponse au laplacien sur l'image en niveaux de gris
    const { data } = await sharp(p).greyscale().convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 }).raw().toBuffer({ resolveWithObject: true })
    let s = 0, s2 = 0
    for (const v of data) { s += v; s2 += v * v }
    nettete[sujets[l]] = s2 / data.length - (s / data.length) ** 2
  }
  if (dims.length) {
    const [, w0, h0] = dims[0]
    const differentes = dims.filter(([, w, h]) => Math.abs(w - w0) > 2 || Math.abs(h - h0) > 2)
    if (differentes.length) echecs.push(`planches de dimensions différentes (${dims.map(([l, w, h]) => `${l} ${w}×${h}`).join(', ')}) : le format trahit la source`)
  }
  const refsN = IDS.map((id) => nettete[id]).filter((v) => v > 0).sort((x, y) => x - y)
  if (refsN.length && nettete.demo > 0) {
    const med = refsN[Math.floor(refsN.length / 2)]
    const rapport = nettete.demo / med
    if (rapport > 1.6 || rapport < 1 / 1.6) echecs.push(`netteté de la démo ${nettete.demo.toFixed(0)} contre ${med.toFixed(0)} pour la médiane des références (rapport ${rapport.toFixed(2)}, attendu entre 0,62 et 1,6) : un rendu différent trahit la source`)
  }
  const bavards = fichiers.filter((f) => [...IDS, 'demo', 'lestraque', '016-02'].some((mot) => f.toLowerCase().includes(mot)))
  if (bavards.length) echecs.push(`noms de fichiers qui trahissent la source : ${bavards.join(', ')}`)
  const consignes = path.join(a.sortie, 'consignes.md')
  if (!fs.existsSync(consignes)) echecs.push('consignes.md absent')
  else {
    const t = fs.readFileSync(consignes, 'utf8')
    if (!/C1/.test(t) || !/C8/.test(t)) echecs.push('consignes.md : la grille C1 à C8 doit y figurer')
    const fuite = [...IDS, 'démo', 'demo', 'lestraque', 'menuisier', 'cle.json', 'clé'].find((mot) => t.toLowerCase().includes(mot))
    if (fuite) echecs.push(`consignes.md : le mot « ${fuite} » trahit la source ou la clé`)
  }
}
if (cleA && cleB && JSON.stringify(cleA.sujets) !== JSON.stringify(cleB.sujets)) echecs.push('même graine, clés différentes : l\'ordre doit être déterministe')
if (cleA && cleC && JSON.stringify(cleA.sujets) === JSON.stringify(cleC.sujets)) echecs.push('graines 42 et 7, clés identiques : la graine doit changer l\'ordre')

console.log(echecs.length ? `✗ grille aveugle : FAIL — ${echecs.join(' ; ')}` : '✓ grille aveugle : PASS — six planches anonymes de même format et de netteté comparable, démo prise au défilement, clé hors du dossier, consignes sans fuite, ordre déterministe')
process.exitCode = echecs.length ? 1 : 0
