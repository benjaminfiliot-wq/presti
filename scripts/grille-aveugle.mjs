#!/usr/bin/env node
// scripts/grille-aveugle.mjs — Générateur de planches anonymes pour comparaison à l'aveugle
// Usage : node scripts/grille-aveugle.mjs --demo=<dossier> --refs=<dossier> --ids=<id1,id2,…> --graine=<entier> --sortie=<dossier>

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
    sortie: { type: 'string' }
  },
  strict: false
})

const dossierDemo = values.demo
const dossierRefs = values.refs
const listeIds = values.ids ? values.ids.split(',').map((s) => s.trim()).filter(Boolean) : []
const graineStr = values.graine
const dossierSortie = values.sortie

if (!dossierDemo || !dossierRefs || listeIds.length === 0 || graineStr === undefined || !dossierSortie) {
  console.error('Usage : node scripts/grille-aveugle.mjs --demo=<dossier> --refs=<dossier> --ids=<id1,id2,…> --graine=<entier> --sortie=<dossier>')
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
  console.error('Erreur : trop de sujets pour l\'alphabet (maximum 26)')
  process.exit(1)
}

const sujetsParLettre = {}
for (let i = 0; i < sujetsMelanges.length; i++) {
  sujetsParLettre[LETTRES[i]] = sujetsMelanges[i]
}

// Vérification de l'existence des images avant tout traitement
const imagesParSujet = {}
for (const [lettre, sujet] of Object.entries(sujetsParLettre)) {
  let chemins = []
  if (sujet === 'demo') {
    const noms = ['bureau-t06.png', 'bureau-t25.png', 'bureau-t50.png', 'bureau-t80.png']
    chemins = noms.map((nom) => path.resolve(dossierDemo, nom))
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

// Génération des planches
const HAUTEUR_IMAGE = 450
const MARGE = 16
const ESPACEMENT = 12

for (const [lettre, chemins] of Object.entries(imagesParSujet)) {
  const redimensionnees = await Promise.all(
    chemins.map(async (chemin) => {
      const { data, info } = await sharp(chemin)
        .resize({ height: HAUTEUR_IMAGE, fit: 'inside' })
        .toBuffer({ resolveWithObject: true })
      return { buffer: data, width: info.width, height: info.height }
    })
  )

  const largeurImages = redimensionnees.reduce((acc, img) => acc + img.width, 0)
  const largeurContenu = largeurImages + ESPACEMENT * (redimensionnees.length - 1)
  const largeurTotale = Math.max(1600, largeurContenu + MARGE * 2)
  const hauteurTotale = Math.max(400, HAUTEUR_IMAGE + MARGE * 2)

  const composition = []
  let x = MARGE
  if (largeurContenu + MARGE * 2 < largeurTotale) {
    x = Math.round((largeurTotale - largeurContenu) / 2)
  }

  for (const img of redimensionnees) {
    composition.push({
      input: img.buffer,
      left: x,
      top: Math.round((hauteurTotale - img.height) / 2)
    })
    x += img.width + ESPACEMENT
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

// cle.json
const cle = {
  graine,
  sujets: sujetsParLettre
}
fs.writeFileSync(path.join(dossierSortie, 'cle.json'), JSON.stringify(cle, null, 2), 'utf8')

// consignes.md
const contenuConsignes = `# Consignes d'évaluation — Notation à l'aveugle

Ce protocole a pour objectif d'évaluer de manière objective et anonyme plusieurs réalisations web.
Chaque sujet est identifié uniquement par une lettre majuscule (A, B, C...).
Pour chaque sujet, une planche visuelle rassemble quatre images-clés chronologiques illustrant l'affichage et l'animation de la page (de l'écran d'accueil jusqu'au défilement).

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
