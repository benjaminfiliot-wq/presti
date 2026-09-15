#!/usr/bin/env node
// scripts/grille-aveugle.mjs — Générateur de planches anonymes pour comparaison à l'aveugle
// Usage : node scripts/grille-aveugle.mjs --demo=<dossier> --refs=<dossier> --ids=<id1,id2,…> --graine=<entier> --sortie=<dossier> --cle=<fichier>

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values } = parseArgs({
  options: {
    demo: { type: 'string' },
    refs: { type: 'string' },
    ids: { type: 'string' },
    graine: { type: 'string' },
    sortie: { type: 'string' },
    cle: { type: 'string' }
  },
  strict: false
})

const dossierDemo = values.demo
const dossierRefs = values.refs
const listeIds = values.ids ? values.ids.split(',').map((s) => s.trim()).filter(Boolean) : []
const graineStr = values.graine
const dossierSortie = values.sortie
const cheminCle = values.cle

if (!dossierDemo || !dossierRefs || listeIds.length === 0 || graineStr === undefined || !dossierSortie || !cheminCle) {
  console.error('Usage : node scripts/grille-aveugle.mjs --demo=<dossier> --refs=<dossier> --ids=<id1,id2,…> --graine=<entier> --sortie=<dossier> --cle=<fichier>')
  process.exit(1)
}

const graine = parseInt(graineStr, 10)
if (Number.isNaN(graine)) {
  console.error('Erreur : la graine doit être un entier valide')
  process.exit(1)
}

// Générateur pseudo-aléatoire déterministe (Mulberry32)
function creerPrng(g) {
  let a = (g >>> 0)
  return function () {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mélange de Fisher-Yates
function melanger(tableau, prng) {
  const copie = [...tableau]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

const sujetsInitiaux = ['demo', ...listeIds]
const prng = creerPrng(graine)
const sujetsMelanges = melanger(sujetsInitiaux, prng)

const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
if (sujetsMelanges.length > LETTRES.length) {
  console.error("Erreur : trop de sujets pour l'alphabet (maximum 26)")
  process.exit(1)
}

const sujetsParLettre = {}
for (let i = 0; i < sujetsMelanges.length; i++) {
  sujetsParLettre[LETTRES[i]] = sujetsMelanges[i]
}

// Images de la démo : bureau-t25.png (le héros installé), puis trois images prises au défilement parmi bureau-d30.png, bureau-d60.png, bureau-d100.png
const nomsImagesDemo = ['bureau-t25.png', 'bureau-d30.png', 'bureau-d60.png', 'bureau-d100.png']

// Vérification de l'existence des images avant tout traitement
const imagesParSujet = {}
for (const [lettre, sujet] of Object.entries(sujetsParLettre)) {
  let chemins = []
  if (sujet === 'demo') {
    chemins = nomsImagesDemo.map((nom) => path.resolve(dossierDemo, nom))
  } else {
    const noms = ['t0.png', 't1.png', 't2.png', 't3.png']
    chemins = noms.map((suffix) => path.resolve(dossierRefs, `${sujet}-${suffix}`))
  }

  for (const c of chemins) {
    if (!fs.existsSync(c)) {
      console.error(`Erreur : image manquante pour le sujet « ${sujet} » (lettre ${lettre}) : ${c}`)
      process.exit(1)
    }
  }
  imagesParSujet[lettre] = chemins
}

// Création du dossier de sortie
fs.mkdirSync(dossierSortie, { recursive: true })

// Nettoyage préalable dans dossierSortie au cas où il y aurait de vieux fichiers JSON
if (fs.existsSync(dossierSortie)) {
  for (const f of fs.readdirSync(dossierSortie)) {
    if (f.endsWith('.json')) {
      try { fs.unlinkSync(path.join(dossierSortie, f)) } catch {}
    }
  }
}

// Paramètres de traitement d'image pour uniformité géométrique et de rendu
const HAUTEUR_IMAGE = 450
const RATIO = 1.36
const LARGEUR_IMAGE = Math.round(HAUTEUR_IMAGE * RATIO)
const LARGEUR_APERCU = 640
const HAUTEUR_APERCU = Math.round(LARGEUR_APERCU / RATIO)
const QUALITE_JPEG_INTERMEDIAIRE = 75
const RAYON_COIN = 12
const MARGE = 16
const ESPACEMENT = 12

const svgMasque = Buffer.from(
  `<svg width="${LARGEUR_IMAGE}" height="${HAUTEUR_IMAGE}"><rect x="0" y="0" width="${LARGEUR_IMAGE}" height="${HAUTEUR_IMAGE}" rx="${RAYON_COIN}" fill="#fff"/></svg>`
)

async function traiterImage(chemin) {
  // 1. Recadrage au même rapport (environ 1.36, cover centré) et réduction à la largeur des aperçus (640 px)
  // + ré-encodage JPEG de qualité moyenne
  const etapeApercu = await sharp(chemin)
    .resize(LARGEUR_APERCU, HAUTEUR_APERCU, { fit: 'cover', position: 'center' })
    .jpeg({ quality: QUALITE_JPEG_INTERMEDIAIRE })
    .toBuffer()

  // 2. Agrandissement à la hauteur de planche (avec largeur correspondante) et masque à coins arrondis
  const imageFinale = await sharp(etapeApercu)
    .resize(LARGEUR_IMAGE, HAUTEUR_IMAGE, { fit: 'fill' })
    .composite([{ input: svgMasque, blend: 'dest-in' }])
    .png()
    .toBuffer()

  return imageFinale
}

const largeurTotale = MARGE * 2 + LARGEUR_IMAGE * 4 + ESPACEMENT * 3
const hauteurTotale = MARGE * 2 + HAUTEUR_IMAGE

for (const [lettre, chemins] of Object.entries(imagesParSujet)) {
  const imagesTraitees = await Promise.all(chemins.map(traiterImage))

  const composition = []
  let x = MARGE

  for (const buf of imagesTraitees) {
    composition.push({
      input: buf,
      left: x,
      top: MARGE
    })
    x += LARGEUR_IMAGE + ESPACEMENT
  }

  // Macaron avec la seule lettre majuscule en grand dans le coin supérieur gauche
  const tailleBadge = 76
  const rayonBadge = 10
  const xBadge = MARGE + 8
  const yBadge = MARGE + 8
  const svgBadge = Buffer.from(
    `<svg width="${largeurTotale}" height="${hauteurTotale}">` +
    `<rect x="${xBadge}" y="${yBadge}" width="${tailleBadge}" height="${tailleBadge}" rx="${rayonBadge}" fill="rgba(15,15,18,0.85)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>` +
    `<text x="${xBadge + tailleBadge / 2}" y="${yBadge + tailleBadge / 2 + 18}" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle">${lettre}</text>` +
    `</svg>`
  )

  composition.push({
    input: svgBadge,
    left: 0,
    top: 0
  })

  // Fond neutre sombre (#18181b = r:24, g:24, b:27)
  const fond = { r: 24, g: 24, b: 27 }
  const sortieFichier = path.join(dossierSortie, `planche-${lettre}.jpg`)

  await sharp({
    create: {
      width: largeurTotale,
      height: hauteurTotale,
      channels: 3,
      background: fond
    }
  })
    .composite(composition)
    .jpeg({ quality: 90 })
    .toFile(sortieFichier)
}

// Écriture de la clé hors du dossier de sortie (--cle=<fichier>)
const cle = {
  graine,
  sujets: sujetsParLettre,
  imagesDemo: nomsImagesDemo
}
fs.mkdirSync(path.dirname(path.resolve(cheminCle)), { recursive: true })
fs.writeFileSync(path.resolve(cheminCle), JSON.stringify(cle, null, 2), 'utf8')

// consignes.md — sans fuite, sans mots interdits (pas de "clé", pas de "démo", etc.)
const contenuConsignes = `# Consignes d'évaluation — Notation à l'aveugle

Ce protocole a pour objectif d'évaluer de manière objective et anonyme plusieurs réalisations web.
Chaque sujet est identifié uniquement par une lettre majuscule (A, B, C...).
Pour chaque sujet, une planche visuelle rassemble quatre captures chronologiques illustrant l'affichage et l'animation de la page (de l'écran d'accueil jusqu'au défilement).

## Consignes de notation

Vous devez noter chaque sujet identifié par sa lettre sur une échelle de 1 à 5 pour chacun des huit critères ci-dessous (C1 à C8).
Les critères et leurs repères d'évaluation sont définis de façon stricte pour garantir l'équité du jugement.

## La grille de comparaison — Critères C1 à C8

| # | Critère | 1 | 5 |
|---|---|---|---|
| C1 | Objet visuel fort dans le héros | photo posée dans un cadre | vidéo/3D/photo plein cadre qui porte l'écran |
| C2 | Mouvement ambiant continu du héros | tout est figé sans défiler | quelque chose vit en permanence (boucle, parallaxe, projecteur) |
| C3 | Typographie monumentale et hiérarchie | titre de taille ordinaire | titre ≥ 12 vw, un seul, kicker fin, contraste franc |
| C4 | Révélations séquencées au défilement | tout est visible d'un coup | listes, chiffres, cartes, galeries arrivent dans l'ordre, courbes asymétriques |
| C5 | Contrastes et transitions entre sections | blocs de même fond posés les uns sous les autres | sombre/clair, aplats, scènes qui changent, raccords |
| C6 | Matière (flou, lumière, grain, profondeur) | aplat plat | texture visible, profondeur, lumière |
| C7 | Retenue | carrousel, icônes, badges, trois boutons | une nav fine, un bouton, rien de gratuit |
| C8 | Rythme | le héros reste figé > 1 s, sections vides | rien de figé, sections qui respirent, cadence lisible |

## Format attendu du verdict

Remplissez un tableau récapitulatif avec les notes attribuées à chaque lettre :

| Sujet | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
|---|---|---|---|---|---|---|---|---|
${Object.keys(sujetsParLettre).map((l) => `| ${l} | | | | | | | | |`).join('\n')}
`

fs.writeFileSync(path.join(dossierSortie, 'consignes.md'), contenuConsignes, 'utf8')
