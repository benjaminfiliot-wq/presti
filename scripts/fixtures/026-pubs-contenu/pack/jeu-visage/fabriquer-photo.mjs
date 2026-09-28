#!/usr/bin/env node
// scripts/fixtures/026-pubs-contenu/pack/jeu-visage/fabriquer-photo.mjs — fabrique photo.jpg : le portrait du domaine
// public du socle (scripts/fixtures/026-pubs-contenu/socle/visage-domaine-public.jpg, mémoire demo-photos-licence)
// incrusté à 30 % de largeur dans un fond de chantier CC BY 2.0 (carreleur/dallage), 1080×1920 — le jeu d'essai
// négatif de la fiche 026-126, point 3 : personnes:false dans pack.json alors qu'un visage y est bien présent, pour
// que scripts/pack-pub/fabriquer.mjs (fiche 026-156) le refuse (PL-12) et que visages-qa.mjs le détecte (PL-6).
// Usage : node scripts/fixtures/026-pubs-contenu/pack/jeu-visage/fabriquer-photo.mjs [--force]
// N'écrit que photo.jpg à côté de ce script (suivi par git : fixture stable, régénérée seulement sur --force).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..', '..')
const PORTRAIT = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'socle', 'visage-domaine-public.jpg')
const FOND = path.join(R, 'public', 'sites-demo', 'carreleur', 'images', 'dallage-720.webp')
const SORTIE = path.join(ICI, 'photo.jpg')
const L = 1080, H = 1920

async function main() {
  if (fs.existsSync(SORTIE) && !process.argv.includes('--force')) { console.log(`déjà présent : ${SORTIE}`); return }
  const fond = await sharp(FOND).resize(L, H, { fit: 'cover' }).toBuffer()
  const largeurPortrait = Math.round(L * 0.3)
  const portrait = await sharp(PORTRAIT).resize(largeurPortrait, null).toBuffer()
  const meta = await sharp(portrait).metadata()
  const x = Math.round((L - meta.width) / 2)
  const y = Math.round((H - meta.height) / 2)
  await sharp(fond).composite([{ input: portrait, left: x, top: y }]).jpeg({ quality: 90 }).toFile(SORTIE)
  // sharp ne recopie l'EXIF/GPS source que si .withMetadata() est appelé : ici jamais, donc la fixture en est dépourvue.
  console.log(`écrit : ${SORTIE}`)
}
main()
