// Doublure de `node scripts/pack-pub/fabriquer.mjs <dossier>` (usine-pubs-qa). Elle fait respecter ce que le vrai fabriquer.mjs exige à l'entrée
// (pack.json avec des photos LOCALES `fichier`, jamais une adresse ; voix.mp3 quand voix = synthese) et écrit ce qu'il sort : sortie/video-1..3.mp4,
// sortie/visuel-1..3.jpg, textes.md. Elle consigne ce qu'elle a trouvé : le juge en déduit l'ordre (la voix AVANT la fabrication).
import fs from 'node:fs'
import path from 'node:path'
import { lireConfig, noter, existeNonVide, lireJson, ecrire, MP4, JPEG, sha256 } from './commun.mjs'

const [, , cfgChemin, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
const dossier = argv.find((a) => !a.startsWith('--')) ? path.resolve(argv.find((a) => !a.startsWith('--'))) : null
const pack = dossier ? lireJson(path.join(dossier, 'pack.json')) : null
const photos = Array.isArray(pack?.matiere?.photos) ? pack.matiere.photos : []
const locales = photos.map((p) => (typeof p?.fichier === 'string' ? existeNonVide(path.resolve(dossier, p.fichier)) : false))
const voix = dossier ? path.join(dossier, 'voix.mp3') : ''
noter(cfg, 'fabriquer', {
  argv, dossier, pack_json: !!pack, pack_id: pack?.pack_id ?? null, photos: photos.length, photos_locales: locales.filter(Boolean).length,
  photo_par_adresse: photos.some((p) => typeof p?.url === 'string' && p.url), voix_attendue: pack?.matiere?.voix === 'synthese', voix_presente: existeNonVide(voix),
  contenu_pack_sha: pack ? sha256(JSON.stringify(pack)) : null, pack_json_texte: dossier && fs.existsSync(path.join(dossier, 'pack.json')) ? fs.readFileSync(path.join(dossier, 'pack.json'), 'utf8') : null,
})
const refus = (m) => { console.error(`✗ fabriquer : ${m}`); process.exitCode = 1 }
if (cfg.mode?.lent) await new Promise((ok) => setTimeout(ok, cfg.mode.lent)) // le scénario « deux passages simultanés » : la fabrication dure assez pour que le second arrive
if (cfg.mode?.fabriquer === 'echec') refus('échec demandé par le juge')
else if (!dossier || !pack) refus('pack.json absent ou illisible')
else if (!pack.pack_id || !photos.length) refus('pack_id ou photos manquants')
else if (photos.some((p) => typeof p?.url === 'string' && p.url)) refus('une photo est désignée par une adresse : seules les photos locales (fichier) sont admises')
else if (locales.some((x) => !x)) refus('une photo locale est introuvable')
else if (pack.matiere.voix === 'synthese' && !existeNonVide(voix)) refus('voix.mp3 absent alors que voix = synthese (elle est produite avant fabriquer.mjs)')
else {
  const sortie = path.join(dossier, 'sortie')
  fs.rmSync(sortie, { recursive: true, force: true })
  for (let i = 1; i <= 3; i++) { ecrire(path.join(sortie, `video-${i}.mp4`), MP4(`video-${i}-${pack.pack_id}`)); ecrire(path.join(sortie, `visuel-${i}.jpg`), JPEG(`visuel-${i}-${pack.pack_id}`)) }
  ecrire(path.join(sortie, 'textes.md'), '# Textes\n(doublure)\n')
  console.log(`Pack ${pack.pack_id} fabriqué`)
  process.exitCode = 0
}
