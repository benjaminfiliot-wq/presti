// Poser une musique de fond sur les vidéos déjà rendues — remplace la voix off.
//
//   node scripts/musique-poser.mjs <musique.mp3>            → les trente
//   node scripts/musique-poser.mjs <musique.mp3> 01         → une publication
//   node scripts/musique-poser.mjs <musique.mp3> 01 carre   → un seul fichier
//
// Benj, 2026-09-10 : « enlève les voix c'est horrible mais mets de la musique à la place ».
//
// Ce script ne RE-REND RIEN : il remplace la piste audio d'un MP4 déjà rendu, image copiée telle
// quelle (`-c:v copy`). Une seconde par fichier au lieu de deux minutes. C'est aussi pourquoi il
// est RÉVERSIBLE : les `publications/pub-NN/voix.mp3` restent sur le disque, et `voix-mixer.mjs`
// sait les reposer.
//
// ── Le niveau, et pourquoi il n'est pas celui de la voix ──────────────────────────────────────
//
// La voix off était normalisée à −16 LUFS : un niveau de PREMIER PLAN, celui d'un présentateur.
// Une musique de fond posée à −16 écraserait l'image au lieu de la porter. On vise −23 LUFS, le
// niveau d'un lit : présent, jamais au premier plan. Sur une pub muette au montage, c'est la
// typographie qui parle.
//
// ── Le calage, appris à mes dépens deux fois ──────────────────────────────────────────────────
//
//   1. `-shortest` seul AMPUTE LA VIDÉO à la longueur de l'audio. Mesuré en septembre : une image
//      de 10 s + une piste de 3 s sortaient un fichier de 3,35 s, en silence.
//   2. `apad,atrim` — remplir puis couper — ne remplit pas : l'EOF que `atrim` propage en amont
//      interrompt `apad`. Il faut `atrim` PUIS `apad`. Mesuré : 23,232 s contre 26,167 s attendues.
//
// Donc : on coupe à la durée EXACTE de l'image, puis on complète par du silence si besoin.
//
// ── Et pas de `shell: true` ───────────────────────────────────────────────────────────────────
//
// ffmpeg est un vrai .exe. Avec un shell, cmd.exe lit le `|` d'un filtre comme un tube et tente
// d'exécuter ce qui suit. Un lot entier y est passé.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const PUB = path.join(RACINE, 'publications')
const FORMATS = ['vertical', 'carre', 'paysage']
const NUMS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']

const NIVEAU = -23        // LUFS — un lit de fond, pas un présentateur
const FONDU_IN = 1.2      // s — la musique s'installe, elle ne surgit pas
const FONDU_OUT = 2.5     // s — et elle s'efface sous la marque finale

const musique = process.argv[2]
if (!musique || !fs.existsSync(musique)) {
  console.error('usage : node scripts/musique-poser.mjs <musique.mp3> [NN] [format]')
  console.error(musique ? `fichier introuvable : ${musique}` : '')
  process.exit(1)
}
// Les positionnels, DRAPEAUX EXCLUS. Sans ce filtre, un `--depart=8` placé en 4ᵉ position est pris
// pour un nom de format : le script cherche `pub-01/--depart=8.mp4`, ne trouve rien, et saute les
// trente EN SILENCE. C'est arrivé, et c'est passé pour un succès — d'où aussi le garde-fou en bas.
const positionnels = process.argv.slice(3).filter((x) => !x.startsWith('--'))
const seulNum = positionnels[0]
const seulFormat = positionnels[1]

// ── Le point de départ dans la piste ──────────────────────────────────────────────────────────
//
// Trois musiques pour dix publications : sans ça, les trois ou quatre films qui partagent une
// piste sonneraient exactement pareil — même intro, même montée, même fin. On entre donc à un
// endroit DIFFÉRENT du morceau pour chacun. C'est ce qui fait qu'un catalogue de dix pubs ne
// s'entend pas comme une campagne en boucle.
//
// Le script vérifie que le morceau est assez long à partir de ce point, et refuse sinon.
const argDep = process.argv.find((x) => x.startsWith('--depart='))
const DEPART = argDep ? Number(argDep.split('=')[1]) : 0

const duree = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffprobe a échoué sur ${f}`)
  return Number(String(r.stdout).trim())
}

const dMus = duree(musique)
console.log(`Musique : ${path.basename(musique)} — ${dMus.toFixed(1)} s, posée à ${NIVEAU} LUFS`)
console.log(`Fondus : ${FONDU_IN} s à l’entrée, ${FONDU_OUT} s à la sortie\n`)
console.log(`Entrée dans le morceau à ${DEPART} s`)

let faits = 0, sautes = 0
const trop = []

for (const n of (seulNum ? [seulNum] : NUMS)) {
  for (const f of (seulFormat ? [seulFormat] : FORMATS)) {
    const film = path.join(PUB, `pub-${n}`, `${f}.mp4`)
    if (!fs.existsSync(film)) { sautes++; continue }

    const dAvant = duree(film)
    if (dMus - DEPART < dAvant - 0.05) {
      // On ne boucle PAS une musique trop courte : une boucle s'entend, et une couture au milieu
      // d'une pub de 20 s est pire qu'un silence. On le DIT, et c'est la musique qu'il faut changer.
      trop.push(`pub-${n}/${f} : film de ${dAvant.toFixed(1)} s, mais il ne reste que ${(dMus - DEPART).toFixed(1)} s de musique après ${DEPART} s`)
      continue
    }

    const sortie = path.join(PUB, `pub-${n}`, `${f}-musique.mp4`)
    const finFondu = Math.max(0, dAvant - FONDU_OUT)
    const chaine = `[1:a]atrim=0:${dAvant.toFixed(3)},asetpts=N/SR/TB,` +
      `afade=t=in:st=0:d=${FONDU_IN},afade=t=out:st=${finFondu.toFixed(3)}:d=${FONDU_OUT},` +
      `loudnorm=I=${NIVEAU}:TP=-2:LRA=9,apad=whole_dur=${dAvant.toFixed(3)}[mus]`

    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', film, '-ss', String(DEPART), '-i', musique,
      '-filter_complex', chaine, '-map', '0:v', '-map', '[mus]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', sortie],
      { stdio: 'inherit' })
    if (r.status !== 0) throw new Error(`ffmpeg a échoué sur pub-${n}/${f} (code ${r.status})`)

    // On REMESURE avant de remplacer : si l'image a raccourci, on ne touche pas à l'original.
    const dApres = duree(sortie)
    if (Math.abs(dApres - dAvant) > 0.1) {
      fs.rmSync(sortie)
      throw new Error(`pub-${n}/${f} : l’image est passée de ${dAvant.toFixed(3)} à ${dApres.toFixed(3)} s — rien n’est remplacé`)
    }
    fs.rmSync(film)
    fs.renameSync(sortie, film)
    console.log(`  ♪ pub-${n}/${f.padEnd(8)} ${dApres.toFixed(2)} s`)
    faits++
  }
}

if (faits === 0) {
  // Zéro fichier traité n’est JAMAIS un succès. Sans ce garde-fou, un appel dont les arguments
  // étaient mal lus affichait « ✓ 0 fichier(s) sonorisé(s) » et sortait en 0 : les trente sont
  // restés muets et ça ressemblait à une réussite. C’est exactement ce qui s’est passé.
  console.error(`✗ AUCUN fichier traité.`)
  console.error(`  Arguments reçus : ${JSON.stringify(process.argv.slice(2))}`)
  console.error(`  Cherché : publications/pub-${seulNum || 'NN'}/${seulFormat || '<les trois formats>'}.mp4`)
  process.exit(1)
}
console.log(`\n✓ ${faits} fichier(s) sonorisé(s)${sautes ? ` · ${sautes} absent(s)` : ''}`)
if (trop.length) {
  console.log(`\n⚠️ ${trop.length} fichier(s) NON traités — la musique est plus courte que le film :`)
  for (const t of trop) console.log(`   ${t}`)
  console.log('   On ne boucle pas : une couture s’entend. Prendre une piste plus longue.')
  process.exit(1)
}
