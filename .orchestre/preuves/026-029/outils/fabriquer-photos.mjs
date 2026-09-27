// .orchestre/preuves/026-029/outils/fabriquer-photos.mjs — fabrique les photos d'essai du lot C (fiche 026-029, Claude Code).
//
//   node .orchestre/preuves/026-029/outils/fabriquer-photos.mjs
//
// Écrit scripts/fixtures/026-livraison-tresor/c/photos-source/ à partir des photos de scripts/fixtures/025/commande-exemple/photos/
// (lues seulement) :
//   escalier.jpg      1700 × 1275, JPEG, AVEC une position GPS en EXIF (IFD GPS, balise 0x8825) : l'exporteur doit l'effacer ;
//   bibliotheque.jpg  1200 × 784, JPEG ;
//   etabli.jpg        1000 × 668, JPEG ;
//   faux.jpg          un texte nommé .jpg : l'exporteur doit le refuser par ses octets, pas par son extension ;
//   voisin.jpg, ailleurs.jpg : deux petites photos (320 px), servies aussi par le juge ; une requête reçue pour elles est une faute.
// Le résultat est déterministe (mêmes entrées, même sharp) ; relancer ne change rien si rien n'a changé.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const sharp = createRequire(path.join(R, 'package.json'))('sharp')
const SRC = path.join(R, 'scripts', 'fixtures', '025', 'commande-exemple', 'photos')
const DEST = path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'c', 'photos-source')
fs.mkdirSync(DEST, { recursive: true })
for (const f of fs.readdirSync(DEST)) fs.rmSync(path.join(DEST, f), { force: true })

const GPS = { IFD0: { Make: 'Essai 026-029', Model: 'Telephone du jeu d essai' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 7/1 25/1', GPSLongitudeRef: 'W', GPSLongitude: '1/1 12/1 30/1' } }
const faire = async (depuis, nom, largeur, exif) => {
  let s = sharp(path.join(SRC, depuis)).resize({ width: largeur }).jpeg({ quality: 86, mozjpeg: true })
  if (exif) s = s.withExif(exif)
  const b = await s.toBuffer()
  fs.writeFileSync(path.join(DEST, nom), b)
  const m = await sharp(b).metadata()
  console.log(`${nom} : ${m.width} × ${m.height}, ${b.length} octets, EXIF ${m.exif ? `${m.exif.length} octets` : 'aucun'}`)
}
await faire('heros-escalier-960.webp', 'escalier.jpg', 1700, GPS)
await faire('boiserie-960.webp', 'bibliotheque.jpg', 1200, null)
await faire('mains-noyer-960.webp', 'etabli.jpg', 1000, null)
fs.writeFileSync(path.join(DEST, 'faux.jpg'), 'Ceci est un fichier texte nommé .jpg : il ne doit jamais passer pour une photo.\n')
await faire('penderie-960.webp', 'voisin.jpg', 320, null)
await faire('boiserie-960.webp', 'ailleurs.jpg', 320, null)
console.log(`✓ ${fs.readdirSync(DEST).length} fichiers dans ${path.relative(R, DEST)}`)
