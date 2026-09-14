// scripts/grille-aveugle-test.mjs — le juge de la tâche 018-03. Il fait tourner scripts/grille-aveugle.mjs (écrit par
// l'exécutant) sur les images-clés existantes : la démo (.orchestre/preuves/016-02, bureau-t06/t25/t50/t80) et cinq
// références MotionSites (.orchestre/preuves/refs/<id>-t0..t3.png). L'outil doit rendre une planche par sujet, anonymisée
// (une lettre, rien d'autre), une clé séparée, et des consignes qui ne trahissent jamais lequel est la démo. Pourquoi : la
// grille notait la démo 5/5 là où Benj la jugeait « loin encore » — un juge qui sait laquelle est la démo est indulgent.
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
const BASE = path.join(R, '.orchestre', 'preuves', '018-03')
const echecs = []

if (!fs.existsSync(OUTIL)) { console.log('✗ grille aveugle : FAIL — scripts/grille-aveugle.mjs absent'); process.exit(1) }

function lancer(graine, nom) {
  const sortie = path.join(BASE, nom)
  fs.rmSync(sortie, { recursive: true, force: true })
  const r = spawnSync(process.execPath, [OUTIL, '--demo=.orchestre/preuves/016-02', '--refs=.orchestre/preuves/refs', `--ids=${IDS.join(',')}`, `--graine=${graine}`, `--sortie=${path.relative(R, sortie)}`], { cwd: R, encoding: 'utf8', timeout: 5 * 60 * 1000 })
  if (r.status !== 0) echecs.push(`graine ${graine} : code ${r.status} — ${(r.stderr || r.stdout || '').slice(-300)}`)
  return sortie
}

const a = lancer(42, 'essai-42')
const b = lancer(42, 'essai-42-bis')
const c = lancer(7, 'essai-7')

const lireCle = (d) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'cle.json'), 'utf8')) } catch { return null } }
const cleA = lireCle(a), cleB = lireCle(b), cleC = lireCle(c)

if (!cleA) echecs.push('cle.json absent ou illisible')
else {
  const sujets = cleA.sujets || {}
  const lettres = Object.keys(sujets)
  const valeurs = Object.values(sujets)
  if (lettres.length !== IDS.length + 1) echecs.push(`cle.json : ${lettres.length} sujets, attendu ${IDS.length + 1}`)
  if (!lettres.every((l) => /^[A-Z]$/.test(l))) echecs.push('cle.json : chaque sujet doit être une lettre majuscule seule')
  if (valeurs.filter((v) => v === 'demo').length !== 1) echecs.push('cle.json : exactement un sujet doit valoir « demo »')
  for (const id of IDS) if (!valeurs.includes(id)) echecs.push(`cle.json : la référence ${id} manque`)
  if (cleA.graine !== 42) echecs.push('cle.json : champ graine absent ou faux')

  const fichiers = fs.readdirSync(a)
  for (const l of lettres) {
    const f = fichiers.find((x) => x === `planche-${l}.jpg` || x === `planche-${l}.png`)
    if (!f) { echecs.push(`planche du sujet ${l} absente (planche-${l}.jpg ou .png)`); continue }
    const m = await sharp(path.join(a, f)).metadata()
    if (m.width < 1600 || m.height < 400) echecs.push(`${f} : ${m.width}×${m.height}, attendu au moins 1600×400`)
    if (m.exif || m.comments || m.xmp || m.iptc) echecs.push(`${f} : métadonnées présentes (exif/xmp/commentaire) — elles peuvent trahir la source`)
  }
  const bavards = fichiers.filter((f) => f !== 'cle.json' && [...IDS, 'demo', 'lestraque', '016-02'].some((mot) => f.toLowerCase().includes(mot)))
  if (bavards.length) echecs.push(`noms de fichiers qui trahissent la source : ${bavards.join(', ')}`)

  const consignes = path.join(a, 'consignes.md')
  if (!fs.existsSync(consignes)) echecs.push('consignes.md absent')
  else {
    const t = fs.readFileSync(consignes, 'utf8')
    if (!/C1/.test(t) || !/C8/.test(t)) echecs.push('consignes.md : la grille C1 à C8 doit y figurer')
    const fuite = [...IDS, 'démo', 'demo', 'lestraque', 'menuisier', 'cle.json'].find((mot) => t.toLowerCase().includes(mot))
    if (fuite) echecs.push(`consignes.md : le mot « ${fuite} » trahit la source ou la clé`)
  }
}
if (cleA && cleB && JSON.stringify(cleA.sujets) !== JSON.stringify(cleB.sujets)) echecs.push('même graine, clés différentes : l\'ordre doit être déterministe')
if (cleA && cleC && JSON.stringify(cleA.sujets) === JSON.stringify(cleC.sujets)) echecs.push('graines 42 et 7, clés identiques : la graine doit changer l\'ordre')

console.log(echecs.length ? `✗ grille aveugle : FAIL — ${echecs.join(' ; ')}` : '✓ grille aveugle : PASS — six planches anonymes, clé séparée, consignes sans fuite, ordre déterministe par graine')
process.exitCode = echecs.length ? 1 : 0
