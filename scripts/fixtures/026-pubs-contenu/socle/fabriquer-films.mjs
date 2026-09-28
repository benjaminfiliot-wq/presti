#!/usr/bin/env node
// scripts/fixtures/026-pubs-contenu/socle/fabriquer-films.mjs — fabrique par ffmpeg, sous .orchestre/travail/socle/,
// le film conforme au profil pub-locale (fiche 026-124, point 4), ses mutations (SP-2) et le film de 4 s du témoin
// positif (SP-7). Rien de ceci n'est livré : ces films restent dans .orchestre/travail/, ignoré par git — c'est le
// juge (scripts/socle-pubs-qa.mjs) qui les regarde.
//
// Licence des photos : SEULES les photos « CC0 » de public/sites-demo/*/attributions.json entrent ici. Les autres
// (CC BY, CC BY-SA…) portent explicitement « jamais dans un film — le partage à l'identique s'étendrait au film » et
// ne sont jamais utilisées, même pour un film jetable non publié (mémoire demo-photos-licence).
//
// La voix : Microsoft Hortense (voix française de Windows, SAPI), lue par PowerShell, coupée de son silence de fin,
// puis normalisée à −14 LUFS en deux passes (mesure, puis application linéaire) — jamais l'inverse : normaliser un
// clip qui contiendrait déjà un blanc dilue la mesure (mémoire loudnorm-apres-un-carton-muet). Le silence qui suit
// dans le film final est un vrai zéro numérique (apad) : la porte à −70 LUFS d'EBU R128 l'exclut de la mesure
// intégrée, il ne fausse donc rien.
//
// Usage : node scripts/fixtures/026-pubs-contenu/socle/fabriquer-films.mjs [--force]
// Sort en code 0 si tous les films existent au bout du compte et sont non vides ; 1 sur toute erreur ffmpeg/PowerShell.
// N'écrit que sous .orchestre/travail/socle/ (ignoré par git).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..')
const TRAVAIL = path.join(R, '.orchestre', 'travail', 'socle')
const FORCER = process.argv.includes('--force')

// Les seules photos CC0 des démos (public/sites-demo/*/attributions.json, licence exacte "CC0") — vérifié le 28/09.
const PHOTOS_CC0 = [
  'public/sites-demo/electricien/images/variateur-720.webp',
  'public/sites-demo/lestraque/images/boiserie-720.webp',
  'public/sites-demo/lestraque/images/mains-noyer-720.webp',
  'public/sites-demo/menuisier/images/bibliotheque-720.webp',
  'public/sites-demo/peintre/images/rechampi-720.webp',
].map((p) => path.join(R, p))

const PORTRAIT = path.join(ICI, 'visage-domaine-public.jpg')
const FOND_CHANTIER = path.join(R, 'public/sites-demo/carreleur/images/dallage-720.webp')
const PHRASE = "Menuiserie sur mesure, du chantier a la maison. Devis rapide, travail soigne, un artisan de confiance pres de chez vous."

fs.mkdirSync(TRAVAIL, { recursive: true })
const p = (...s) => path.join(TRAVAIL, ...s)

function ffmpeg(args, { entree } = {}) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, input: entree })
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${r.stderr}`)
  return r
}
function ffmpegMesure(args) {
  // certains filtres (loudnorm print_format=json, silencedetect) n'écrivent qu'au niveau "info" : jamais -v error ici.
  const r = spawnSync('ffmpeg', ['-y', '-v', 'info', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 })
  return r.stderr
}
const existeNonVide = (f) => { try { return fs.statSync(f).size > 0 } catch { return false } }

// ── 1. La voix française, normalisée à −14 LUFS ─────────────────────────────────────────────────────────────────────
function genererVoix() {
  const sortie = p('voix-14lufs.wav')
  if (existeNonVide(sortie) && !FORCER) return sortie
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

  // Silence de fin : silencedetect sur le brut, on coupe juste avant.
  const journal = ffmpegMesure(['-i', brut, '-af', 'silencedetect=noise=-45dB:d=0.2', '-f', 'null', '-'])
  const debuts = [...journal.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]))
  // On coupe à la première frontière de silence détectée après 2 s (ignore une micro-pause de tout début) ; sinon on
  // garde tout le brut (aucun silence détecté, rare mais pas bloquant).
  const coupureA = debuts.filter((t) => t > 2).sort((a, b) => a - b)[0]
  const coupe = p('voix-coupee.wav')
  if (coupureA) ffmpeg(['-i', brut, '-t', String(coupureA), coupe])
  else fs.copyFileSync(brut, coupe)

  // Deux passages loudnorm : mesure, puis application linéaire vers I=-14 LUFS.
  const mesure = ffmpegMesure(['-i', coupe, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'])
  const bloc = mesure.match(/\{[\s\S]*?\}/)
  if (!bloc) throw new Error(`loudnorm (mesure) : JSON introuvable dans la sortie ffmpeg\n${mesure}`)
  const mes = JSON.parse(bloc[0])
  ffmpeg(['-i', coupe, '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${mes.input_i}:measured_TP=${mes.input_tp}:measured_LRA=${mes.input_lra}:measured_thresh=${mes.input_thresh}:offset=0:linear=true`,
    '-ar', '48000', sortie])
  if (!existeNonVide(sortie)) throw new Error(`${sortie} vide après loudnorm`)
  return sortie
}

/** Une voix au niveau fautif (~−25 LUFS), dérivée de la voix normalisée — pour la mutation « son ». */
function genererVoixFautive(voixOk) {
  const sortie = p('voix-25lufs.wav')
  if (existeNonVide(sortie) && !FORCER) return sortie
  // −14 → −25 : atténuer de 11 dB avec le gain fixe suffit (pas besoin d'un aller-retour loudnorm).
  ffmpeg(['-i', voixOk, '-af', 'volume=-11dB', sortie])
  return sortie
}

// ── 2. Les segments images (zoom lent ou statique) ──────────────────────────────────────────────────────────────────
/** Un segment de `duree` s, format `l`×`h`, zoom lent si `zoom`, sinon plan fixe. */
function segment(photo, duree, l, h, sortie, { zoom = true } = {}) {
  if (existeNonVide(sortie) && !FORCER) return sortie
  const cadres = Math.round(duree * 30)
  const filtre = zoom
    ? `scale=${l}:${h}:force_original_aspect_ratio=increase,crop=${l}:${h},scale=${Math.round(l * 1.5)}:${Math.round(h * 1.5)},zoompan=z='min(zoom+0.0018,1.25)':d=${cadres}:s=${l}x${h}:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p`
    : `scale=${l}:${h}:force_original_aspect_ratio=increase,crop=${l}:${h},format=yuv420p`
  // Débit quasi constant à 3 600 kbps : au-dessus des 3 000 kbps exigés par le profil pub-locale avec une marge
  // confortable, tout en gardant le film sous 8 Mo une fois la voix ajoutée (étalonné le 28/09, voir la preuve).
  ffmpeg(['-loop', '1', '-i', photo, '-t', String(duree), '-vf', filtre, '-an', '-r', '30',
    '-c:v', 'libx264', '-b:v', '3600k', '-minrate', '3600k', '-maxrate', '3600k', '-bufsize', '1800k',
    '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', sortie])
  return sortie
}

/** Concatène des segments déjà au même format (codec/fps/résolution) — concat demuxer, sans ré-encodage. */
function concatener(segments, sortie) {
  if (existeNonVide(sortie) && !FORCER) return sortie
  const liste = p(`${path.basename(sortie, '.mp4')}.liste.txt`)
  fs.writeFileSync(liste, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'))
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', sortie])
  return sortie
}

/** Mixe une voix (avec un décalage de départ) dans une vidéo muette, silence vrai (apad) pour tenir `dureeTotale`. */
function mixerVoix(video, voix, decalageMs, dureeTotale, sortie) {
  if (existeNonVide(sortie) && !FORCER) return sortie
  ffmpeg([
    '-i', video, '-i', voix,
    '-filter_complex', `[1:a]adelay=${decalageMs}|${decalageMs},apad[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-t', String(dureeTotale), sortie,
  ])
  return sortie
}

/** Cycle sur les 5 photos CC0 pour obtenir `n` segments (repeat de la 1re si besoin), en alternant les 5. */
const cyclePhotos = (n) => Array.from({ length: n }, (_, i) => PHOTOS_CC0[i % PHOTOS_CC0.length])

/** Construit un film à 6 segments (5 coupes), avec ou sans zoom, avec une voix (ou aucune), au format demandé. */
function construireFilm({ nom, l, h, dureeSegment, zoom, voix, decalageMs = 1000, dureeTotale }) {
  const sortie = p(`${nom}.mp4`)
  if (existeNonVide(sortie) && !FORCER) return sortie
  const photos = cyclePhotos(6)
  const segs = photos.map((photo, i) => segment(photo, dureeSegment, l, h, p(`${nom}-seg${i}.mp4`), { zoom }))
  const muet = concatener(segs, p(`${nom}-muet.mp4`))
  if (!voix) { fs.copyFileSync(muet, sortie); return sortie }
  return mixerVoix(muet, voix, decalageMs, dureeTotale ?? dureeSegment * 6, sortie)
}

// ── 3. Le film de 4 s pour SP-7 : le portrait n'apparaît qu'entre 2 et 3 s ──────────────────────────────────────────
function filmPortrait4s() {
  const sortie = p('portrait-4s.mp4')
  if (existeNonVide(sortie) && !FORCER) return sortie
  ffmpeg([
    '-loop', '1', '-i', FOND_CHANTIER, '-loop', '1', '-i', PORTRAIT,
    '-filter_complex',
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[fond];" +
    "[1:v]scale=324:-2[pf];" +
    "[fond][pf]overlay=x=(W-w)/2:y=(H-h)/2:enable='between(t,2,3)',format=yuv420p[v]",
    '-map', '[v]', '-t', '4', '-r', '30', sortie,
  ])
  return sortie
}

// ── Fabrication ──────────────────────────────────────────────────────────────────────────────────────────────────────
const voix = genererVoix()
const voixFautive = genererVoixFautive(voix)

const films = {
  conforme: construireFilm({ nom: 'conforme', l: 1080, h: 1920, dureeSegment: 2.5, zoom: true, voix, dureeTotale: 15 }),
  mutationDuree: construireFilm({ nom: 'mutation-duree', l: 1080, h: 1920, dureeSegment: 2, zoom: true, voix, dureeTotale: 12 }),
  mutationFormat: construireFilm({ nom: 'mutation-format', l: 1080, h: 1350, dureeSegment: 2.5, zoom: true, voix, dureeTotale: 15 }),
  mutationSon: construireFilm({ nom: 'mutation-son', l: 1080, h: 1920, dureeSegment: 2.5, zoom: true, voix: voixFautive, dureeTotale: 15 }),
  mutationDiaporama: construireFilm({ nom: 'mutation-diaporama', l: 1080, h: 1920, dureeSegment: 2.5, zoom: false, voix, dureeTotale: 15 }),
  reseaux: construireFilm({ nom: 'reseaux-temoin', l: 1080, h: 1920, dureeSegment: 2.5, zoom: true, voix: null }),
  portrait4s: filmPortrait4s(),
}

const manquants = Object.entries(films).filter(([, f]) => !existeNonVide(f))
if (manquants.length) {
  console.error(`✗ fabriquer-films : film(s) manquant(s) ou vide(s) : ${manquants.map(([k]) => k).join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`fabriquer-films : ${Object.keys(films).length} film(s) prêt(s) dans ${path.relative(R, TRAVAIL)}${path.sep}`)
  for (const [k, f] of Object.entries(films)) console.log(`  · ${k} → ${path.relative(R, f)}`)
}
