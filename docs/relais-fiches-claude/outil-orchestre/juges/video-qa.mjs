#!/usr/bin/env node
// scripts/video-qa.mjs — le juge des vidéos Presti.
//
// Pourquoi ce fichier existe : « fais une belle vidéo » n'est pas vérifiable, donc ça n'a jamais
// été fait. Ici, la barre est un nombre. Une vidéo n'est pas livrée tant que ce script ne dit pas
// TOUT PASSE. Aucune dépendance : ffmpeg + ffprobe + Node, rien d'autre.
//
//   node scripts/video-qa.mjs public/promo/pub-01/vertical.mp4
//   node scripts/video-qa.mjs public/promo/**/*.mp4          (plusieurs fichiers acceptés)
//   node scripts/video-qa.mjs --json fichier.mp4             (sortie machine, pour la CI)
//
// Code de sortie : 0 si tout passe, 1 si un seul critère échoue.

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'

// ─── La barre. Chaque seuil vient d'un défaut constaté sur les vidéos rejetées. ───────────────
const BARRE = {
  // Le son — ajouté le 2026-09-13. La musique est posée à −23 LUFS ; une voix off oubliée remonterait
  // vers −16, un fichier muet n'a aucune piste. Les deux sont des défauts que l'image ne montre pas.
  LUFS_MIN: -26, LUFS_MAX: -19,
  ECH: 8,               // images analysées par seconde
  LARGEUR: 160,         // largeur d'analyse (l'échelle ne change pas les ratios)

  PLAN_FIGE_MAX: 0.8,   // secondes — au-delà, c'est un diaporama
  FIGE_EPS: 0.006,      // en dessous de cette différence, deux images sont « identiques »

  MOUVEMENT_MIN: 0.020, // différence moyenne entre images — le plancher de vie de l'image
  COUPE_EPS: 0.085,     // au-dessus, c'est un changement de plan
  COUPES_PAR_10S: 5,    // rythme : ~1 coupe toutes les 2 s au pire

  OCCUP_MIN: 0.45,      // le contenu doit occuper ≥ 45 % de la largeur…
  OCCUP_PART: 0.70,     // …sur au moins 70 % des images

  FIN_LUMIERE_MAX: 190, // dernière image : jamais blanche (0-255)
  DEBIT_MIN: 3000,      // kbps
  FPS_MIN: 29,
  DUREE: [12, 60],      // secondes
}

/** La piste audio, si elle existe : loudness intégrée (LUFS) mesurée par ebur128. */
function sonderAudioFilm(fichier) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', fichier], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (p.status !== 0 || !String(p.stdout).trim()) return null
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', fichier, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const m = String(r.stderr).match(/Integrated loudness:[\s\S]*?I:\s*(-?[\d.]+)\s*LUFS/)
  return { lufs: m ? Number(m[1]) : NaN }
}

const FORMATS = {
  vertical:  { l: 1080, h: 1920 },
  carre:     { l: 1080, h: 1350 },
  paysage:   { l: 1920, h: 1080 },
}

// ─── Sonde le conteneur ──────────────────────────────────────────────────────────────────────
function sonde(fichier) {
  const brut = execFileSync('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_streams', '-show_format', fichier,
  ], { encoding: 'utf8', maxBuffer: 1 << 24 })
  const j = JSON.parse(brut)
  const v = j.streams.find((s) => s.codec_type === 'video')
  if (!v) throw new Error('aucun flux vidéo')
  const [n, d] = (v.avg_frame_rate || '0/1').split('/').map(Number)
  return {
    largeur: v.width,
    hauteur: v.height,
    fps: d ? n / d : 0,
    codec: v.codec_name,
    duree: Number(j.format.duration),
    debit: Math.round(Number(j.format.bit_rate) / 1000),
    poids: Number(j.format.size),
  }
}

// ─── Extrait les images en gris brut : pas de décodeur PNG, pas de dépendance ────────────────
function imagesGrises(fichier, hauteurSource, largeurSource) {
  const h = Math.max(2, Math.round((BARRE.LARGEUR * hauteurSource) / largeurSource / 2) * 2)
  const brut = execFileSync('ffmpeg', [
    '-v', 'error', '-i', fichier,
    '-vf', `fps=${BARRE.ECH},scale=${BARRE.LARGEUR}:${h},format=gray`,
    '-f', 'rawvideo', '-',
  ], { encoding: 'buffer', maxBuffer: 1 << 28 })
  const taille = BARRE.LARGEUR * h
  const n = Math.floor(brut.length / taille)
  const images = []
  for (let i = 0; i < n; i++) images.push(brut.subarray(i * taille, (i + 1) * taille))
  return { images, l: BARRE.LARGEUR, h }
}

const moyenne = (buf) => { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i]; return s / buf.length }

function difference(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length / 255
}

// Fond dominant de l'image (mode grossier), puis boîte du contenu qui s'en détache.
function occupation(img, l, h) {
  const seaux = new Array(32).fill(0)
  for (let i = 0; i < img.length; i++) seaux[img[i] >> 3]++
  let fond = 0
  for (let i = 1; i < 32; i++) if (seaux[i] > seaux[fond]) fond = i
  const niveauFond = fond * 8 + 4
  const SEUIL = 40
  let x0 = l, x1 = -1, y0 = h, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      if (Math.abs(img[y * l + x] - niveauFond) > SEUIL) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return { largeur: 0, hauteur: 0, haut: 0, bas: 1 }
  return { largeur: (x1 - x0 + 1) / l, hauteur: (y1 - y0 + 1) / h, haut: y0 / h, bas: (y1 + 1) / h }
}

// ─── L'analyse ───────────────────────────────────────────────────────────────────────────────
function analyse(fichier) {
  const meta = sonde(fichier)
  const { images, l, h } = imagesGrises(fichier, meta.hauteur, meta.largeur)
  if (images.length < 4) throw new Error('trop peu d’images extraites')

  const diffs = []
  for (let i = 1; i < images.length; i++) diffs.push(difference(images[i - 1], images[i]))

  // Le plus long plan figé
  let figeMax = 0, courant = 0, figeA = 0, debutCourant = 0
  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i] < BARRE.FIGE_EPS) {
      if (courant === 0) debutCourant = i
      courant++
      if (courant > figeMax) { figeMax = courant; figeA = debutCourant }
    } else courant = 0
  }
  const figeSecondes = figeMax / BARRE.ECH
  const figeHorodatage = figeA / BARRE.ECH

  const mouvement = diffs.reduce((a, b) => a + b, 0) / diffs.length
  const coupes = diffs.filter((d) => d > BARRE.COUPE_EPS).length
  const coupesPar10s = (coupes / meta.duree) * 10

  const occs = images.map((im) => occupation(im, l, h))
  const partOccup = occs.filter((o) => o.largeur >= BARRE.OCCUP_MIN).length / occs.length
  const occupMediane = [...occs.map((o) => o.largeur)].sort((a, b) => a - b)[Math.floor(occs.length / 2)]

  const finLumiere = moyenne(images[images.length - 1])
  const debutLumiere = moyenne(images[0])

  // Format reconnu ?
  const nomFormat = Object.entries(FORMATS)
    .find(([, f]) => f.l === meta.largeur && f.h === meta.hauteur)?.[0] ?? null

  return {
    meta, nomFormat,
    figeSecondes, figeHorodatage, mouvement, coupes, coupesPar10s,
    partOccup, occupMediane, finLumiere, debutLumiere,
    nImages: images.length,
  }
}

// ─── Le verdict ──────────────────────────────────────────────────────────────────────────────
function juge(a) {
  const t = []
  const ok = (nom, passe, mesure, attendu) => t.push({ nom, passe, mesure, attendu })

  ok('Format reconnu', a.nomFormat !== null,
    `${a.meta.largeur}×${a.meta.hauteur}${a.nomFormat ? ` (${a.nomFormat})` : ''}`,
    '1080×1920, 1080×1350 ou 1920×1080')
  ok('Durée', a.meta.duree >= BARRE.DUREE[0] && a.meta.duree <= BARRE.DUREE[1],
    `${a.meta.duree.toFixed(1)} s`, `${BARRE.DUREE[0]}–${BARRE.DUREE[1]} s`)
  ok('Images par seconde', a.meta.fps >= BARRE.FPS_MIN,
    a.meta.fps.toFixed(1), `≥ ${BARRE.FPS_MIN}`)
  ok('Débit', a.meta.debit >= BARRE.DEBIT_MIN,
    `${a.meta.debit} kbps`, `≥ ${BARRE.DEBIT_MIN} kbps`)

  ok('Aucun plan figé', a.figeSecondes <= BARRE.PLAN_FIGE_MAX,
    `${a.figeSecondes.toFixed(2)} s à ${a.figeHorodatage.toFixed(1)} s`,
    `≤ ${BARRE.PLAN_FIGE_MAX} s`)
  ok('L’image vit', a.mouvement >= BARRE.MOUVEMENT_MIN,
    a.mouvement.toFixed(4), `≥ ${BARRE.MOUVEMENT_MIN}`)
  ok('Rythme des coupes', a.coupesPar10s >= BARRE.COUPES_PAR_10S,
    `${a.coupesPar10s.toFixed(1)} / 10 s (${a.coupes} au total)`,
    `≥ ${BARRE.COUPES_PAR_10S} / 10 s`)

  ok('Le cadre est rempli', a.partOccup >= BARRE.OCCUP_PART,
    `${(a.partOccup * 100).toFixed(0)} % des images (médiane ${(a.occupMediane * 100).toFixed(0)} % de largeur)`,
    `≥ ${BARRE.OCCUP_PART * 100} % des images à ≥ ${BARRE.OCCUP_MIN * 100} % de largeur`)
  ok('Dernière image non blanche', a.finLumiere <= BARRE.FIN_LUMIERE_MAX,
    a.finLumiere.toFixed(0), `≤ ${BARRE.FIN_LUMIERE_MAX}`)
  ok('Une piste audio, au niveau d’un fond', !!a.audio && a.audio.lufs >= BARRE.LUFS_MIN && a.audio.lufs <= BARRE.LUFS_MAX,
    a.audio ? (Number.isFinite(a.audio.lufs) ? `${a.audio.lufs.toFixed(1)} LUFS` : 'niveau illisible') : 'AUCUNE PISTE',
    `piste présente, ${BARRE.LUFS_MIN} à ${BARRE.LUFS_MAX} LUFS`)

  return t
}

// ─── Sortie ──────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const json = args.includes('--json')
const fichiers = args.filter((x) => !x.startsWith('--'))
if (!fichiers.length) {
  console.error('usage : node scripts/video-qa.mjs [--json] <fichier.mp4> [...]')
  process.exit(2)
}

let echecTotal = 0
const rapport = []

for (const f of fichiers) {
  if (!existsSync(f)) { console.error(`introuvable : ${f}`); echecTotal++; continue }
  let a
  try { a = analyse(f) } catch (e) { console.error(`${f} : ${e.message}`); echecTotal++; continue }
  a.audio = sonderAudioFilm(f)
  const tests = juge(a)
  const echecs = tests.filter((t) => !t.passe)
  echecTotal += echecs.length
  rapport.push({ fichier: f, mesures: a, tests, echecs: echecs.length })

  if (json) continue
  const titre = basename(f)
  console.log(`\n\x1b[1m${titre}\x1b[0m  ${a.meta.largeur}×${a.meta.hauteur} · ${a.meta.duree.toFixed(1)} s · ${a.meta.debit} kbps · ${(a.meta.poids / 1e6).toFixed(1)} Mo`)
  console.log('─'.repeat(78))
  for (const t of tests) {
    const marque = t.passe ? '\x1b[32m  OK  \x1b[0m' : '\x1b[31mÉCHEC \x1b[0m'
    console.log(`${marque} ${t.nom.padEnd(30)} ${String(t.mesure).padEnd(28)} attendu ${t.attendu}`)
  }
  console.log(echecs.length
    ? `\x1b[31m✗ ${echecs.length} critère(s) en échec — la vidéo n’est pas livrable.\x1b[0m`
    : '\x1b[32m✓ Tout passe.\x1b[0m')
}

if (json) console.log(JSON.stringify(rapport, null, 2))
process.exit(echecTotal ? 1 : 0)
