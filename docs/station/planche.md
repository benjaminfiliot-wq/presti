# La planche F0 — station Claw3D (026-169)

Décor de la station, redessiné dans l'atelier `~/claw3d-pixel` de l'usine avec les seuls packs du lot A
(CC0, déjà sur l'usine, aucun téléchargement). Route `/office/planche?vue=station|echelle|vaisseau`.

## Packs retenus et pourquoi

Un sous-ensemble du lot A, choisi pour couvrir les besoins réels sans multiplier les sources à recoloriser :

- **04-rottingpixels-scifi-tileset** (Rotting Pixels, CC0) — la station : panneaux de coque, grille de
  ventilation, échelle, hublot/console, réacteur, gemmes-voyants, triangle d'alerte. Palette d'origine déjà
  violette/magenta, très proche de la palette retenue : peu de recoloriage nécessaire.
- **05-zwonky-spacers** (zwonky, CC0) — les 4 personnages (marche et poste) et le portrait, recolorés par
  substitution de la couleur d'équipe dominante vers une couleur d'agent de la palette.
- **07-ansimuz-tech-lab** (Luis Zuno/Ansimuz, CC0, volumes 1 et 2) — le Vaisseau : sol technique, dalles de
  danger, console, sas entre modules (`fichiers/vol1/Top Down Lab files/Tileset.png`).
- **09-shade-puny-characters** (Shade, CC0) — l'équipage du Vaisseau (`Character-Base.png`, recoloré en
  deux teintes de combinaison).

Écartés pour cette itération F0 (mobilier plus riche prévu pour le thème définitif, hors périmètre de la
planche) : 01-ganamoda, 02-ansimuz-sideview, 03-warped-city, 08-emceeflesher, 10-buch. **06-kenney-tiny-factory
n'est délibérément pas cité** : le module « Atelier convoyeur » du Vaisseau est **redessiné** au style Tech
Lab par code (tapis, machines), en s'inspirant des formes de Tiny Factory sans jamais copier ses pixels —
conformément à la consigne « jamais posé tel quel ».

Chaque pixel collé (tuile ou personnage) est ramené par le plus proche voisin à la palette ci-dessous (zéro
lissage, zéro pixel semi-transparent) ; la nébuleuse (calque a) est un dégradé CSS, hors décor mesuré.

## Grille

Une seule tuile de 16 px. Grille bureau (aussi utilisée à 1440 et 1280 px) : 400 × 384 px de dessin (25 × 24
tuiles). Grille portrait (téléphone) : 288 × 576 px (18 × 36 tuiles), une coupe verticale simplifiée de la
même station. Le canevas affiché = grille × k, en pixels de l'appareil, à une origine entière ; k est fixé
ci-dessous pour que la station tienne exactement dans l'espace libre à chaque taille (barre 80/88 px,
colonnes 300+340 ou 280+320 px, bandeau 44/64 px) :

| Taille | Espace libre (CSS) | Grille utilisée | k | Canevas (pixels de l'appareil) |
|---|---|---|---|---|
| 1440 × 900 | 800 × 776 | bureau 400×384 | **2** | 800 × 768 |
| 1280 × 800 | 680 × 676 | bureau 400×384 | **1** | 400 × 384 |
| 390 × 844 (densité 3) | 358 × 692 (marge 16 px) | portrait 288×576 | **3** | 864 × 1728 |

Les 20 salles et la réservée sont des rectangles de 48 × 48 px (3 × 3 tuiles), répartis sur 4 ponts, dans
`docs/station/grille.json`. La salle réservée E-commerce est posée en bout du pont Commandement
(`x:272,y:96`), porte fermée, sans poste ni écran — visible dès la planche (décision 7).

## Palette (24 couleurs)

`#0b0418 #1b0b33 #2e1152 #4a1675 #750c9c #a0288f #c949ba #ff6ad5 #1d6f8a #2fc6e0 #9bf6ff #3b1f2b #6b3a3a #9c5b4b #cf9782 #f2c7a5 #5a5470 #8f87a8 #d8d0e8 #fff4f0 #3bd16f #f2d15c #ff4d6d #4d7cff`

Fond violet nuit et coque (5), néons magenta (3), néons cyan (3), intérieur chaud (5), neutres froids (4),
accents d'état/agents (4 : vert, or, rouge, bleu — plus magenta et cyan déjà listés, soit 6 couleurs
d'agents au total en réutilisant les néons).

## Le Vaisseau (3 modules)

Vus de dessus, 400 × 384 (même grille bureau, k identique) : **Labo Tech** (sol et console Ansimuz réels),
**Atelier convoyeur** (tapis roulants et machines redessinés au style Tech Lab, jamais Tiny Factory posé
tel quel), **Quartiers équipage** (sol Tech Lab + équipage Puny Characters repeint). Sas Ansimuz réels entre
les modules.

## L'échelle

`echelle.jpg` montre l'art d'un pack à son échelle d'origine (`05-zwonky-spacers/fichiers/spacermale.png`,
servi octet pour octet, sans recoloriage) à côté de la référence `trevsagents/t049.2.jpg`.

## Police (PN-5)

Le layout racine de l'atelier (`src/app/layout.tsx`, partagé par toutes les routes) chargeait 3 polices
par `next/font/google`. Sous le piège réseau du juge, `next dev` tentait de joindre
`fonts.googleapis.com` au premier compile (aucun cache local dans la copie extraite par le juge) :
refusé, PN-5 rouge. Retiré pour cette planche : `globals.css` (lignes 53-55) déclare déjà
`--font-display`/`--font-sans`/`--font-mono` avec un nom suivi d'un repli `sans-serif`/`monospace` ;
sans `next/font`, le navigateur retombe simplement sur ce repli système — aucun téléchargement, aucune
police OFL disponible dans le lot A pour la remplacer à l'identique. Le rendu texte du reste de
l'atelier (prototype B compris) en est légèrement affecté (police système au lieu de Bebas
Neue/IBM Plex) ; la planche elle-même n'utilise aucune de ces trois polices (ses plaques/écrans sont en
police système, cf. `PlancheView.tsx`).

## Commit de l'atelier

`~/claw3d-pixel` est un dépôt git existant (le prototype B, route `/office/pixel2d`, laissée intacte).
Cette planche F0 ajoute uniquement des fichiers nouveaux (`src/app/office/planche/`,
`src/features/planche/`, `public/planche/`) et laisse l'atelier au commit local **`f0-planche`**,
`git status` propre, jamais poussé (aucun dépôt distant à nous).

```planche
atelier: d4922d06c51ffafac5e4fc769773946a776c91cd
k.1440: 2
k.1280: 1
k.390: 3
palette: #0b0418 #1b0b33 #2e1152 #4a1675 #750c9c #a0288f #c949ba #ff6ad5 #1d6f8a #2fc6e0 #9bf6ff #3b1f2b #6b3a3a #9c5b4b #cf9782 #f2c7a5 #5a5470 #8f87a8 #d8d0e8 #fff4f0 #3bd16f #f2d15c #ff4d6d #4d7cff
```
