// Doublure de `hyperframes` (usine-pubs-qa) : `tts <texte.txt> --voice=<v> --output=<f>` écrit un petit WAV ; `check`, `render`, `snapshot`… réussissent
// sans rien faire. Consigne l'appel, la voix demandée et le texte lu (empreinte et début) : le juge relit le journal.
import fs from 'node:fs'
import { lireConfig, noter, option, ecrire, WAV, sha256 } from './commun.mjs'

const [, , cfgChemin, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
const sous = argv[0]
if (sous === '--version' || sous === '-v' || sous === 'version') { noter(cfg, 'hyperframes', { argv, sous: 'version' }); console.log('0.8.33'); process.exitCode = 0 }
else if (sous === 'tts') {
  const positionnels = argv.slice(1).filter((a, i, t) => !a.startsWith('-') && !['--voice', '--output', '-o', '--speed', '-v'].includes(t[i - 1]))
  const entree = positionnels[0] ?? null
  const sortie = option(argv, '--output', '-o')
  const voix = option(argv, '--voice', '-v')
  let texte = null
  // le CLI réel accepte un fichier OU le texte lui-même : un premier argument qui n'est pas un fichier est le texte
  try { texte = entree ? (fs.existsSync(entree) ? fs.readFileSync(entree, 'utf8') : entree) : null } catch { texte = null }
  noter(cfg, 'hyperframes', { argv, sous, voix, entree, sortie, texte, texte_sha: texte === null ? null : sha256(texte) })
  if (texte === null || !sortie || !voix) { console.error('hyperframes tts : texte, --voice et --output attendus'); process.exitCode = 1 }
  else if (cfg.mode?.tts === 'echec') { console.error('hyperframes tts : modèle indisponible'); process.exitCode = 1 }
  else { ecrire(sortie, WAV()); console.log('tts ok'); process.exitCode = 0 }
} else {
  noter(cfg, 'hyperframes', { argv, sous })
  console.log(`hyperframes ${sous ?? ''} ok`)
  process.exitCode = 0
}
