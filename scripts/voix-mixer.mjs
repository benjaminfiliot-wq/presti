// Poser la voix off sur une vidéo DÉJÀ rendue — prompt v14 §3.
//
//   node scripts/voix-mixer.mjs 01            → les trois formats de la publication 1
//   node scripts/voix-mixer.mjs tous          → les dix
//
// ── Pourquoi ce script existe à côté de `hf-rendre.mjs` ──────────────────────────────────────
//
// `hf-rendre.mjs` sait déjà mixer la voix, mais il commence par REFAIRE la vidéo : deux minutes de
// Playwright par fichier, trente fichiers, cinq heures. Or poser une piste audio sur une image déjà
// encodée ne demande aucun ré-encodage vidéo (`-c:v copy`) : c'est l'affaire d'une seconde.
//
// Les voix arrivent presque toujours APRÈS le rendu — on écrit, on écoute, on corrige un mot, on
// régénère. Sans ce script, chaque correction d'un mot coûterait cinq heures de machine.
//
// La chaîne de filtres est la même que dans `hf-rendre.mjs`, avec les deux gardes qui ont coûté
// cher à découvrir :
//   • un MP3 n'a pas de flux vidéo — `ffprobe -select_streams v:0` renvoie une liste VIDE ;
//   • sans `apad` + `atrim`, `-shortest` coupe la VIDÉO à la longueur de la voix.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const DEST = path.join(RACINE, 'publications')
const DEBUT_VOIX = 0.35   // le film a besoin d'un souffle avant la première syllabe
const TEMPO_MAX = 1.08    // au-delà, une voix française s'entend pressée

const duree = (fichier, video) => {
  const args = video
    ? ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', fichier]
    : ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', fichier]
  const r = spawnSync('ffprobe', args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffprobe a échoué sur ${path.basename(fichier)}`)
  const s = Number(r.stdout.trim())
  if (!Number.isFinite(s) || s <= 0) throw new Error(`durée illisible : ${path.basename(fichier)}`)
  return s
}

const aPisteAudio = (fichier) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries',
    'stream=codec_type', '-of', 'default=nw=1:nk=1', fichier], { encoding: 'utf8' })
  return r.status === 0 && r.stdout.trim().length > 0
}

const demande = process.argv[2] || 'tous'
const nums = demande === 'tous'
  ? fs.readdirSync(DEST).filter((d) => /^pub-\d\d$/.test(d)).map((d) => d.slice(4)).sort()
  : [demande]

let poses = 0, sansVoix = 0, deja = 0
for (const num of nums) {
  const dossier = path.join(DEST, `pub-${num}`)
  const voix = path.join(dossier, 'voix.mp3')
  if (!fs.existsSync(voix)) { sansVoix++; console.log(`pub-${num} — pas de voix.mp3, on passe`); continue }
  const dVoix = duree(voix, false)

  for (const f of ['vertical', 'carre', 'paysage']) {
    const film = path.join(dossier, `${f}.mp4`)
    if (!fs.existsSync(film)) continue
    if (aPisteAudio(film)) { deja++; console.log(`  pub-${num} ${f} — a déjà du son, on n'y touche pas`); continue }

    const dFilm = duree(film, true)
    const place = dFilm - DEBUT_VOIX - 0.25
    const tempo = dVoix > place ? Math.min(TEMPO_MAX, dVoix / place) : 1
    const debordement = dVoix / tempo - place

    const sortie = path.join(dossier, `${f}-son.mp4`)
    const ms = Math.round(DEBUT_VOIX * 1000)
    const chaine = `[1:a]atempo=${tempo.toFixed(4)},adelay=${ms}|${ms},loudnorm=I=-16:TP=-1.5:LRA=11,` +
      // ⚠️ `atrim` PUIS `apad` — dans l'autre sens, l'EOF du trim interrompt le remplissage et la
      // piste audio sort 2,9 s trop courte. Mesuré, même correctif que dans `hf-rendre.mjs`.
      `atrim=0:${dFilm.toFixed(3)},asetpts=N/SR/TB,apad=whole_dur=${dFilm.toFixed(3)}[voix]`

    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', film, '-i', voix,
      '-filter_complex', chaine, '-map', '0:v', '-map', '[voix]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', sortie],
      { stdio: 'inherit' })
    if (r.status !== 0) throw new Error(`ffmpeg a échoué sur pub-${num} ${f}`)

    fs.rmSync(film)
    fs.renameSync(sortie, film)
    const apres = duree(film, true)
    // La vérification qui compte : l'image n'a pas raccourci. C'est exactement ce que `-shortest`
    // faisait en silence avant qu'on ajoute `apad`.
    if (Math.abs(apres - dFilm) > 0.15) throw new Error(`pub-${num} ${f} : l’image est passée de ${dFilm.toFixed(2)} s à ${apres.toFixed(2)} s`)
    poses++
    const note = tempo > 1 ? `, resserrée de ${((tempo - 1) * 100).toFixed(1)} %` : ''
    const alerte = debordement > 0.05 ? `  ⚠️ dépasse encore de ${debordement.toFixed(1)} s — raccourcir le texte` : ''
    console.log(`  ♪ pub-${num} ${f} — voix ${dVoix.toFixed(1)} s sur ${dFilm.toFixed(1)} s${note}${alerte}`)
  }
}

console.log(`\n✓ ${poses} piste(s) posée(s)` +
  (deja ? ` · ${deja} déjà sonore(s)` : '') +
  (sansVoix ? ` · ${sansVoix} publication(s) sans voix.mp3` : ''))
