// Le son des vidéos TikTok : piste de voix posée sur les plans, musique licenciée sous la voix (ducking), niveaux à
// -14 LUFS (mesure en deux passes), et mesures reprises par le juge (niveau, silence de tête).
import fs from 'node:fs'
import { lancer } from './outils.mjs'

export const CIBLE_LUFS = -14
const r3 = (x) => Math.round(x * 1000) / 1000

/** Mesure du niveau intégré (LUFS), du crête vrai et de la dynamique d'une piste (loudnorm en mesure seule). */
export function mesurerNiveau(O, fichier) {
  const r = lancer(O.ffmpeg, ['-hide_banner', '-nostats', '-i', fichier, '-vn', '-af', `loudnorm=I=${CIBLE_LUFS}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'])
  const m = String(r.erreur).match(/\{[^{}]*"input_i"[^{}]*\}/)
  if (!m) return null
  const j = JSON.parse(m[0])
  return { i: Number(j.input_i), tp: Number(j.input_tp), lra: Number(j.input_lra), seuil: Number(j.input_thresh), brut: j }
}

/** Silences d'une piste (silencedetect) : [{ debut, fin }]. */
export function silences(O, fichier, { bruit = -45, duree = 0.3 } = {}) {
  const r = lancer(O.ffmpeg, ['-hide_banner', '-nostats', '-i', fichier, '-vn', '-af', `silencedetect=noise=${bruit}dB:d=${duree}`, '-f', 'null', '-'])
  const S = []
  let cur = null
  for (const l of String(r.erreur).split('\n')) {
    const a = l.match(/silence_start: (-?[\d.]+)/); if (a) cur = { debut: Math.max(0, Number(a[1])) }
    const b = l.match(/silence_end: ([\d.]+)/); if (b && cur) { cur.fin = Number(b[1]); S.push(cur); cur = null }
  }
  if (cur) { cur.fin = Infinity; S.push(cur) }
  return S
}

/** Normalisation en deux passes vers -14 LUFS (linéaire quand c'est possible : pas de pompage). */
function normaliser(O, entree, sortie) {
  const m = mesurerNiveau(O, entree)
  if (!m || !Number.isFinite(m.i)) throw new Error(`niveau illisible : ${entree}`)
  const f = `loudnorm=I=${CIBLE_LUFS}:TP=-1.5:LRA=11:measured_I=${m.brut.input_i}:measured_TP=${m.brut.input_tp}:measured_LRA=${m.brut.input_lra}:measured_thresh=${m.brut.input_thresh}:offset=${m.brut.target_offset}:linear=true,aresample=48000`
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', entree, '-af', f, '-ar', '48000', '-ac', '2', sortie])
  if (r.code !== 0) throw new Error('normalisation : ' + r.erreur.slice(-400))
}

/**
 * Piste de voix seule : chaque réplique posée à son instant (secondes), sur la durée de la vidéo, normalisée.
 * poses : [{ wav, debut }]
 */
export function pisteVoix(O, poses, duree, sortie) {
  const brut = sortie.replace(/\.wav$/, '-brut.wav')
  const entrees = poses.flatMap((p) => ['-i', p.wav])
  const chaines = poses.map((p, k) => `[${k}]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(p.debut * 1000)}:all=1[v${k}]`)
  const filtre = `${chaines.join(';')};${poses.map((_, k) => `[v${k}]`).join('')}amix=inputs=${poses.length}:normalize=0:dropout_transition=0,apad,atrim=0:${r3(duree)}[a]`
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', ...entrees, '-filter_complex', filtre, '-map', '[a]', '-ar', '48000', '-ac', '2', brut])
  if (r.code !== 0) throw new Error('piste de voix : ' + r.erreur.slice(-600))
  normaliser(O, brut, sortie)
  fs.rmSync(brut, { force: true })
}

/**
 * Voix + musique : la musique démarre sur son premier temps fort (= 0 s de la vidéo), passe sous la voix par un
 * compresseur piloté par la voix (ducking), finit en fondu ; le mélange est normalisé à -14 LUFS.
 */
export function pisteVoixMusique(O, voixWav, piste, fichierMusique, duree, sortie) {
  const brut = sortie.replace(/\.wav$/, '-brut.wav')
  const debut = Number(piste.premier_temps || 0)
  const fondu = Math.max(0, duree - 0.6)
  const filtre = [
    `[1]atrim=${r3(debut)}:${r3(debut + duree)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-20:TP=-2:LRA=11,volume=-2dB[m]`,
    '[0]asplit=2[vx][cle]',
    '[m][cle]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=320:makeup=1[md]',
    `[vx][md]amix=inputs=2:normalize=0:dropout_transition=0,atrim=0:${r3(duree)},afade=t=out:st=${r3(fondu)}:d=0.6[a]`,
  ].join(';')
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', voixWav, '-i', fichierMusique, '-filter_complex', filtre, '-map', '[a]', '-ar', '48000', '-ac', '2', brut])
  if (r.code !== 0) throw new Error('mélange voix + musique : ' + r.erreur.slice(-600))
  normaliser(O, brut, sortie)
  fs.rmSync(brut, { force: true })
}

/** Pose une piste sur la vidéo muette (image copiée telle quelle, AAC 192 k, lecture rapide). */
export function poserSon(O, videoMuette, audio, duree, sortie) {
  const tmp = sortie + '.part.mp4'
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', videoMuette, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', r3(duree), '-movflags', '+faststart', tmp])
  if (r.code !== 0) throw new Error('pose du son : ' + r.erreur.slice(-600))
  fs.renameSync(tmp, sortie)
}

/** Extrait la piste son d'une vidéo en WAV mono 16 kHz (pour l'écoute par Whisper). */
export function extraireSon(O, video, sortie) {
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', video, '-vn', '-ac', '1', '-ar', '16000', sortie])
  if (r.code !== 0 || !fs.existsSync(sortie)) throw new Error('extraction du son : ' + r.erreur.slice(-300))
  return sortie
}

