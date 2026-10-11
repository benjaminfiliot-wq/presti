// Doublures de `scripts/pub-locale-qa.mjs` (juge d'un pack) et de `scripts/pub-qa.mjs` (juge d'un échantillon), usine-pubs-qa. Chacune relit le dossier
// qu'on lui donne (les fichiers que le juge réel regarderait), imprime des lignes PASS/FAIL stables (son journal : l'empreinte en est calculée par le
// tourneur, et vérifiée par le faux Presti) et sort avec le code que le juge du banc a choisi.
import fs from 'node:fs'
import path from 'node:path'
import { lireConfig, noter, existeNonVide, option, sha256 } from './commun.mjs'

const [, , cfgChemin, nom, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
const code = nom === 'pub-locale-qa' ? (cfg.mode?.juge_pack ?? 0) : (cfg.mode?.juge_studio ?? 0)
let dossier = null, manque = []
if (nom === 'pub-locale-qa') {
  dossier = option(argv, '--dossier') ? path.resolve(option(argv, '--dossier')) : null
  manque = dossier ? ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.jpg'].filter((f) => !existeNonVide(path.join(dossier, 'sortie', f))) : ['dossier']
} else {
  const d = argv.find((a) => !a.startsWith('--'))
  dossier = d ? path.resolve(d) : null
  manque = dossier && existeNonVide(path.join(dossier, 'sortie', 'echantillon.mp4')) ? [] : ['sortie/echantillon.mp4']
}
const rouge = manque.length > 0 || code !== 0
const lignes = rouge
  ? [`FAIL ${nom === 'pub-locale-qa' ? 'PL-9' : 'PQ-9'} — ${manque.length ? `fichier manquant : ${manque.join(', ')}` : 'refus demandé par le juge du banc'}`, `${nom} : FAIL`]
  : nom === 'pub-locale-qa'
    ? ['PASS PL-1 — pack lu', 'PASS PL-2 — trois films de 14 à 16 s', 'PASS PL-3 — trois visuels', 'pub-locale-qa --partie=complet : PASS']
    : ['PASS PQ-1 — échantillon lu', 'PASS PQ-2 — 15 s, 1080x1920', 'PASS PQ-3 — mention IA présente', 'pub-qa : PASS']
const sortie = `${lignes.join('\n')}\n`
// l'empreinte de CE journal : ce que le tourneur doit rendre dans juge.empreinte_journal (le juge ne la recalcule pas, il la lit ici)
noter(cfg, nom, { argv, dossier, manque, code: rouge ? 1 : 0, partie: option(argv, '--partie'), stdout_sha256: sha256(sortie) })
process.stdout.write(sortie)
process.exitCode = rouge ? 1 : 0
void fs
