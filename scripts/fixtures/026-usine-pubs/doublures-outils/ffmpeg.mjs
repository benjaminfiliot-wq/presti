// Doublure de `ffmpeg` et de `ffprobe` (usine-pubs-qa) : ffmpeg exige son entrée (-i) et écrit son dernier argument ; ffprobe rend une durée.
import fs from 'node:fs'
import { lireConfig, noter, ecrire, MP3, MP4, option } from './commun.mjs'

const [, , cfgChemin, outil, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
if (outil === 'ffprobe') {
  noter(cfg, 'ffprobe', { argv })
  console.log('5.000000')
  process.exitCode = 0
} else {
  const entree = option(argv, '-i')
  const sortie = argv.filter((a) => !a.startsWith('-')).at(-1) ?? null
  noter(cfg, 'ffmpeg', { argv, entree, sortie, filtre: option(argv, '-af', '-filter:a') })
  if (!entree || !fs.existsSync(entree) || fs.statSync(entree).size === 0) { console.error(`ffmpeg : ${entree ?? '(aucune entrée)'} : introuvable ou vide`); process.exitCode = 1 }
  else if (!sortie) { console.error('ffmpeg : aucune sortie'); process.exitCode = 1 }
  else { ecrire(sortie, /\.mp4$/i.test(sortie) ? MP4('ffmpeg') : MP3('ffmpeg')); process.exitCode = 0 }
}
