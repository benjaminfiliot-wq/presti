// Les recadrages de détail — prompt v13 §2.
//
//   node scripts/hf-recadrer.mjs
//
// Le défaut n° 3 du montage précédent : « captures de téléphone entier à 15 % de hauteur ». La
// règle qui le remplace dit de montrer **le détail** — la bulle du message, la ligne du devis, le
// total. Un recadrage à l'œil dans le HTML (`object-position`) ne tient pas cette promesse : il
// dépend du format, il bouge à chaque retouche, et personne ne peut le relire. Ici, chaque
// recadrage est une ligne de ce fichier, en pixels de la capture d'origine, avec le nom de ce
// qu'on y voit. On peut donc les vérifier une par une en regardant les fichiers produits.
//
// Les captures d'origine viennent de `scripts/captures-console.mjs` (2880 × 2400, écran 1440
// en densité 2). Rien n'est redessiné : on découpe, on n'ajoute pas un pixel.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const SRC = path.join(RACINE, 'promo-src', 'captures')
const DST = path.join(RACINE, 'promo-src', 'hf', 'assets')

// `source` · `x y l h` dans la capture d'origine · ce qu'on y voit · à quoi ça sert dans un film.
const RECADRAGES = [
  {
    nom: 'd-apercu-devis',
    de: 'console-devis-brouillon.png',
    boite: [1742, 324, 1080, 2076],
    voit: 'Le devis entier, tel que le client le recevra : en-tête, six lignes chiffrées, totaux, acompte.',
    sert: 'Le plan large du devis. 1080 × 2076 — presque exactement le cadre vertical.',
  },
  {
    nom: 'd-lignes-devis',
    de: 'console-devis-brouillon.png',
    boite: [1790, 820, 1000, 900],
    voit: 'Les six lignes avec quantité, prix unitaire, TVA et total.',
    sert: 'La preuve que le chiffrage est vraiment fait, poste par poste.',
  },
  {
    nom: 'd-total-devis',
    de: 'console-devis-brouillon.png',
    boite: [2090, 1660, 720, 500],
    voit: 'Total HT, TVA 20 %, Total TTC, acompte 30 %.',
    sert: 'Le plan qui ferme le chiffrage.',
  },
  {
    nom: 'd-actions-devis',
    de: 'console-devis-brouillon.png',
    boite: [1620, 22, 640, 124],
    voit: 'Le bouton « Envoyer au client », serré, avec les bords de ses voisins.',
    sert: 'Le cœur de la publication n° 1. Recadré SERRÉ : à 1640 px de large le bouton sortait à 24 px sur un téléphone, illisible — et c’est le seul objet que ce plan doit faire lire.',
  },
  {
    nom: 'd-lien-contact',
    de: 'console-tableau-de-bord.png',
    boite: [600, 645, 1420, 135],
    voit: 'Le lien de contact de l’artisan, avec son bouton Copier.',
    sert: 'Publication n° 8. ⚠️ Le site de démonstration n’est PAS filmable : sa bannière et sa galerie utilisent des photos Wikimedia en CC BY-SA 4.0 (attribution obligatoire, et le partage à l’identique s’étendrait au film). Ce plan-ci ne montre que le produit.',
  },
  {
    nom: 'd-demande',
    de: 'console-plateforme.png',
    boite: [550, 608, 665, 140],
    voit: 'La conversation entrante : le nom du client et le debut de sa demande.',
    sert: 'Le declencheur. Coupe SOUS les pastilles d etat : la conversation de demonstration est close et gagnee, et montrer  Gagne  sur un plan qui dit  une demande arrive  raconte la fin a la place du debut.',
  },
  {
    nom: 'd-brouillon',
    de: 'console-devis-liste.png',
    boite: [550, 215, 1260, 210],
    voit: 'La ligne DEV-2026-0006 avec sa pastille « Brouillon ».',
    sert: 'Le mot « Brouillon » à l’écran, écrit par le produit et pas par nous.',
  },
  {
    nom: 'd-chiffrer-ia',
    de: 'console-devis-brouillon.png',
    boite: [560, 1000, 1060, 780],
    voit: 'Le bloc « Chiffrer avec l’IA » et les trois moteurs (Standard, Pro, Expert).',
    sert: 'Réserve — la publication n° 7 sur les formules.',
  },
]

const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  if (r.error) throw new Error(`ffmpeg introuvable : ${r.error.message}`)
  if (r.status !== 0) throw new Error(`ffmpeg a échoué (code ${r.status})`)
}

fs.mkdirSync(DST, { recursive: true })
const fiche = ['# Les recadrages de détail', '', 'Produit par `scripts/hf-recadrer.mjs`. Ne pas éditer à la main.', '', '| fichier | dimensions | ce qu’on y voit | rôle |', '|---|---|---|---|']

for (const r of RECADRAGES) {
  const src = path.join(SRC, r.de)
  if (!fs.existsSync(src)) throw new Error(`capture absente : ${path.relative(RACINE, src)} — lancer d’abord scripts/captures-console.mjs`)
  const [x, y, l, h] = r.boite
  const cible = path.join(DST, `${r.nom}.png`)
  ff(['-i', src, '-vf', `crop=${l}:${h}:${x}:${y}`, cible])
  const ko = (fs.statSync(cible).size / 1024).toFixed(0)
  console.log(`✓ ${r.nom}.png — ${l} × ${h}, ${ko} Ko`)
  fiche.push(`| \`${r.nom}.png\` | ${l} × ${h} | ${r.voit} | ${r.sert} |`)
}

fs.writeFileSync(path.join(DST, 'RECADRAGES.md'), fiche.join('\n') + '\n', 'utf8')
console.log(`\n✓ ${RECADRAGES.length} recadrages + leur fiche dans ${path.relative(RACINE, DST)}`)
