#!/usr/bin/env node
// scripts/visages-qa.mjs — détection de visages sur des images ou des vidéos, pour prouver qu'aucune personne
// n'entre dans un pack pub (fiche 026-124, "Ce qu'il faut faire", point 3 ; plan §1.1 offre C, faille B8 du §9.2).
//
// Images et vidéos mélangées : une vidéo est d'abord découpée en cadres par ffmpeg (--ips images/s, dans
// .orchestre/travail/visages-qa/, ignoré par git), puis scripts/visages.py (YuNet) tourne une seule fois sur tous
// les cadres. Le modèle est scripts/modeles/face_detection_yunet_2023mar.onnx, empreinte sha256 épinglée ci-dessous
// (la même que scripts/visages.py — vérifiée indépendamment ici, avant même de lancer Python) ; --modele=<fichier>
// n'existe que pour tester un modèle corrompu (Claude Code seulement, jamais en production).
//
// Usage :
//   node scripts/visages-qa.mjs <chemins…> [--json] [--seuil=0.9] [--ips=2] [--attendu=0] [--modele=<fichier>]
// Sans --json : mode humain. --attendu=0 (le défaut) rend compte du premier visage trouvé (fichier, instant, score)
//   et sort en code 1 ; sans visage, code 0. --attendu=N>0 rend compte de tout et compare le total à N.
// Avec --json : traite TOUJOURS l'intégralité des fichiers (aucun arrêt anticipé — SP-5/SP-7 de 026-124 ont besoin
//   du compte exact et de chaque instant) et imprime le JSON complet sur stdout, quel que soit le résultat ; le
//   résumé humain part sur stderr. Sortie : [{ fichier, cadres: [{ instant: null|secondes, visages: [{x,y,l,h,score}] }] }]
//   (instant = null pour une image ; un « cadre » par image extraite pour une vidéo).
// Codes : 0 conforme (total = attendu) · 1 non conforme, ou fichier introuvable/illisible · 2 appel invalide, modèle
//   absent ou empreinte différente de celle épinglée (« modèle absent » — fiche 026-124).
// N'écrit que sous .orchestre/travail/visages-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAVAIL = path.join(R, '.orchestre', 'travail', 'visages-qa')
const EMPREINTE = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4'
const MODELE_DEFAUT = path.join(R, 'scripts', 'modeles', 'face_detection_yunet_2023mar.onnx')
const IMAGES = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const VIDEOS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi'])

function refuser(msg, code = 2) { console.error(`✗ visages-qa : ${msg}`); process.exit(code) }

// ── arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
let json = false, seuil = 0.9, ips = 2, attendu = 0, modele = MODELE_DEFAUT
const fichiers = []
for (const a of argv) {
  if (a === '--json') json = true
  else if (a.startsWith('--seuil=')) seuil = Number(a.slice(8))
  else if (a.startsWith('--ips=')) ips = Number(a.slice(6))
  else if (a.startsWith('--attendu=')) attendu = Number(a.slice(10))
  else if (a.startsWith('--modele=')) modele = path.resolve(a.slice(9))
  else if (a.startsWith('--')) refuser(`option inconnue : ${a}`)
  else fichiers.push(a)
}
if (!fichiers.length) refuser('usage : node scripts/visages-qa.mjs <chemins…> [--json] [--seuil=0.9] [--ips=2] [--attendu=0] [--modele=<fichier>]')
if (!Number.isFinite(seuil) || seuil < 0 || seuil > 1) refuser(`--seuil : nombre entre 0 et 1 attendu (reçu ${seuil})`)
if (!Number.isFinite(ips) || ips <= 0) refuser(`--ips : nombre positif attendu (reçu ${ips})`)
if (!Number.isInteger(attendu) || attendu < 0) refuser(`--attendu : entier ≥ 0 attendu (reçu ${attendu})`)

// ── le modèle, épinglé — vérifié AVANT de lancer quoi que ce soit d'autre ───────────────────────────────────────────
if (!fs.existsSync(modele)) refuser(`modèle absent : ${path.relative(R, modele)} — sans le téléchargement autorisé par Benj (fiche 026-124), la fiche s'arrête`)
const empreinteReelle = crypto.createHash('sha256').update(fs.readFileSync(modele)).digest('hex')
if (empreinteReelle !== EMPREINTE) refuser(`empreinte du modèle différente de celle épinglée (${path.relative(R, modele)} : ${empreinteReelle}, attendu ${EMPREINTE})`)

for (const f of fichiers) if (!fs.existsSync(f)) refuser(`introuvable : ${f}`, 1)

// ── extraction des cadres vidéo (ips images/s), les images passent telles quelles ──────────────────────────────────
fs.mkdirSync(TRAVAIL, { recursive: true })
const plan = [] // { source, image, instant }
for (const f of fichiers) {
  const ext = path.extname(f).toLowerCase()
  if (IMAGES.has(ext)) { plan.push({ source: f, image: f, instant: null }); continue }
  if (!VIDEOS.has(ext)) refuser(`ni une image, ni une vidéo reconnue : ${f}`, 1)
  const cle = crypto.createHash('sha1').update(path.resolve(f)).digest('hex').slice(0, 12)
  const dossier = path.join(TRAVAIL, `${path.basename(f, ext).replace(/[^a-z0-9-]+/gi, '-')}-${cle}`)
  fs.mkdirSync(dossier, { recursive: true })
  for (const n of fs.readdirSync(dossier)) if (/^cadre-\d+\.jpg$/.test(n)) fs.unlinkSync(path.join(dossier, n))
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-vf', `fps=${ips}`, path.join(dossier, 'cadre-%05d.jpg')], { encoding: 'utf8', windowsHide: true })
  if (r.status !== 0) refuser(`extraction ffmpeg de ${f} : ${r.stderr.trim()}`, 1)
  const cadres = fs.readdirSync(dossier).filter((n) => /^cadre-\d+\.jpg$/.test(n)).sort()
  if (!cadres.length) refuser(`ffmpeg n'a extrait aucun cadre de ${f}`, 1)
  cadres.forEach((nom, i) => plan.push({ source: f, image: path.join(dossier, nom), instant: i / ips }))
}

// ── détection : un seul appel Python pour tous les cadres ──────────────────────────────────────────────────────────
const args = [path.join(R, 'scripts', 'visages.py'), ...plan.map((p) => p.image), `--seuil=${seuil}`, `--modele=${modele}`]
const py = spawnSync('python', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 })
if (py.status === 2) refuser((py.stderr || '').trim().replace(/^✗ visages\.py : /, '') || 'visages.py a refusé (code 2)')
if (py.status !== 0 && py.status !== 1) refuser(`visages.py : code ${py.status}${py.stderr ? ` — ${py.stderr.trim()}` : ''}`, 2)
let brut
try { brut = JSON.parse(py.stdout) } catch (e) { refuser(`sortie de visages.py illisible : ${e.message} — ${py.stdout.slice(0, 200)}`, 2) }
if (!Array.isArray(brut) || brut.length !== plan.length) refuser(`visages.py : ${Array.isArray(brut) ? brut.length : '?'} résultat(s), ${plan.length} attendu(s)`, 2)

// ── regroupe par fichier source d'origine (préserve l'ordre demandé) ────────────────────────────────────────────────
const parFichier = new Map(fichiers.map((f) => [f, { fichier: f, cadres: [] }]))
const detections = [] // { fichier, instant, x, y, l, h, score }
for (const [i, r] of brut.entries()) {
  const { source, instant } = plan[i]
  const visages = r.visages || []
  parFichier.get(source).cadres.push({ instant, visages })
  for (const v of visages) detections.push({ fichier: source, instant, ...v })
}
const rapport = fichiers.map((f) => parFichier.get(f))
const total = detections.length
const detail = (d) => `${path.relative(R, d.fichier)}${d.instant !== null ? ` à ${d.instant.toFixed(2)} s` : ''} (score ${d.score.toFixed(2)})`

// ── sortie ────────────────────────────────────────────────────────────────────────────────────────────────────────
if (json) {
  console.log(JSON.stringify(rapport))
  console.error(total === attendu
    ? `visages-qa : ${total} visage(s), conforme (attendu ${attendu})`
    : `visages-qa : ${total} visage(s), ${attendu} attendu(s) — ${detections.slice(0, 3).map(detail).join(' ; ')}${detections.length > 3 ? ' …' : ''}`)
  process.exit(total === attendu ? 0 : 1)
}

if (attendu === 0) {
  if (detections.length) { console.error(`✗ visage trouvé : ${detail(detections[0])}`); process.exit(1) }
  console.log(`visages-qa : 0 visage sur ${fichiers.length} fichier(s), conforme.`)
  process.exit(0)
}
console.log(`visages-qa : ${total} visage(s) sur ${fichiers.length} fichier(s) (${attendu} attendu(s)).`)
for (const d of detections) console.log(`  · ${detail(d)}`)
process.exit(total === attendu ? 0 : 1)
