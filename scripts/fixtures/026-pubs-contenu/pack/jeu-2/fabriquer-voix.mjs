#!/usr/bin/env node
// scripts/fixtures/026-pubs-contenu/pack/jeu-2/fabriquer-voix.mjs — fabrique voix.mp3 du jeu d'essai jeu-2 (fiche
// 026-126, point 3) : la voix française Microsoft Hortense de Windows (SAPI), lue par PowerShell, coupée de son
// silence de fin, normalisée à −14 LUFS en deux passes (mesure puis application linéaire — jamais l'inverse, mémoire
// loudnorm-apres-un-carton-muet), puis encodée en MP3 — même méthode que
// scripts/fixtures/026-pubs-contenu/socle/fabriquer-films.mjs, pour le texte de jeu-2/pack.json (matiere.texte_voix,
// sans chiffre).
// Usage : node scripts/fixtures/026-pubs-contenu/pack/jeu-2/fabriquer-voix.mjs [--force]
// N'écrit que voix.mp3 à côté de ce script (suivi par git) et des fichiers intermédiaires sous
// .orchestre/travail/026-pubs-contenu/jeu-2-voix/ (ignoré par git).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..', '..')
const TRAVAIL = path.join(R, '.orchestre', 'travail', '026-pubs-contenu', 'jeu-2-voix')
const SORTIE = path.join(ICI, 'voix.mp3')
const FORCER = process.argv.includes('--force')
const PACK = JSON.parse(fs.readFileSync(path.join(ICI, 'pack.json'), 'utf8'))
const PHRASE = PACK.matiere.texte_voix
if (!PHRASE) throw new Error('jeu-2/pack.json : matiere.texte_voix manquant')
if (/\d/.test(PHRASE)) throw new Error(`jeu-2/pack.json : matiere.texte_voix contient un chiffre : ${JSON.stringify(PHRASE)}`)

fs.mkdirSync(TRAVAIL, { recursive: true })
const p = (...s) => path.join(TRAVAIL, ...s)
const existeNonVide = (f) => { try { return fs.statSync(f).size > 0 } catch { return false } }

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${r.stderr}`)
}
function ffmpegMesure(args) {
  return spawnSync('ffmpeg', ['-y', '-v', 'info', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 }).stderr
}

async function main() {
  if (existeNonVide(SORTIE) && !FORCER) { console.log(`déjà présent : ${SORTIE}`); return }

  const brut = p('voix-brute.wav')
  const ps = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voix = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like '*Hortense*' } | Select-Object -First 1
if (-not $voix) { Write-Error 'voix Microsoft Hortense introuvable'; exit 2 }
$s.SelectVoice($voix.VoiceInfo.Name)
$s.Rate = -1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile('${brut.replace(/\\/g, '\\\\')}', $fmt)
$s.Speak('${PHRASE.replace(/'/g, "''")}')
$s.SetOutputToNull()
`.trim()
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 || !existeNonVide(brut)) throw new Error(`PowerShell (voix SAPI) : code ${r.status}\n${r.stderr}`)

  const journal = ffmpegMesure(['-i', brut, '-af', 'silencedetect=noise=-45dB:d=0.2', '-f', 'null', '-'])
  const debuts = [...journal.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]))
  // Le DERNIER silence détecté (pas le premier) : une phrase à plusieurs points a des pauses internes (ex. après
  // « Nantes. ») que silencedetect voit aussi ; ne garder que le premier couperait la phrase à sa première pause.
  const apres1s = debuts.filter((t) => t > 1)
  const coupureA = apres1s.length ? apres1s[apres1s.length - 1] : null
  const coupe = p('voix-coupee.wav')
  if (coupureA) ffmpeg(['-i', brut, '-t', String(coupureA), coupe])
  else fs.copyFileSync(brut, coupe)

  const mesure = ffmpegMesure(['-i', coupe, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'])
  const bloc = mesure.match(/\{[\s\S]*?\}/)
  if (!bloc) throw new Error(`loudnorm (mesure) : JSON introuvable\n${mesure}`)
  const mes = JSON.parse(bloc[0])
  const normalisee = p('voix-14lufs.wav')
  ffmpeg(['-i', coupe, '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${mes.input_i}:measured_TP=${mes.input_tp}:measured_LRA=${mes.input_lra}:measured_thresh=${mes.input_thresh}:offset=0:linear=true`,
    '-ar', '48000', normalisee])
  if (!existeNonVide(normalisee)) throw new Error(`${normalisee} vide après loudnorm`)

  ffmpeg(['-i', normalisee, '-codec:a', 'libmp3lame', '-b:a', '128k', SORTIE])
  if (!existeNonVide(SORTIE)) throw new Error(`${SORTIE} vide après encodage mp3`)
  console.log(`écrit : ${SORTIE}`)
}
main().catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1 })
