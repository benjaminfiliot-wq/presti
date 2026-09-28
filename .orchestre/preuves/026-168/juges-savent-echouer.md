# 026-168 — le juge de la planche sait échouer (et sait être vert)

Réécrit par Claude Code le 27/09 (rien de la version Gemini du 26/09, une coquille), puis **corrigé le 28/09 à la cause des
six défauts de la contre-vérification**, plus un septième trouvé en rejouant le `verifier`. Ce fichier complète
`verifier.log` et `echecs-attendus.md` (écrits par `juges-026-pilotage-preuve --lot=p`).

**Où tout a tourné** : dans une copie isolée du dépôt (`git worktree` au commit 1ea82faf, poussé ; `node_modules` en
jonction ; seuls les fichiers du périmètre de 026-168 recopiés). Le dépôt partagé porte le travail non commité d'autres
lignes : le paquet de `usine.mjs executer` l'emporterait, et JA-5 le verrait bouger. Aucun de ces défauts n'est de 026-168.

## Les six défauts de la contre-vérification, corrigés à la cause

| # | Défaut | Correction (dans `scripts/station-planche-qa.mjs` et le lot p) | Ce qui le prouve |
|---|---|---|---|
| 1 | PN-6 ne comparait les données a et b qu'à 1440 × 900, vue station | Chaque rendu est pris avec `donnees-a.json` puis `donnees-b.json` : vue station à 1440 × 900, 1280 × 800 et 390 × 844 (densité 3), vue echelle, vue vaisseau. Comparaison pixel pour pixel ; rouge dès un pixel, avec la taille ou la vue, la boîte et l'écart maximal ; la page doit avoir demandé les données dans chacun (sinon la comparaison ne prouve rien) | sabotages `donnee-peinte-1280`, `donnee-peinte-telephone`, `donnee-vaisseau` |
| 2 | Le portrait était masqué pendant la comparaison (`pn-html`) | La comparaison masque le seul calque HTML (`pn-texte`) : le portrait, un dessin, est dans le rendu comparé | sabotage `portrait-donnee` |
| 3 | PN-2 et les écrans « — » de PN-6 lisaient le `textContent` sans vérifier qu'on les voit | `MESURER` relève pour chaque plaque et chaque écran : la boîte, `display`, `visibility`, l'opacité cumulée des ancêtres, la taille de police, la couleur du texte (et `-webkit-text-fill-color`), `clip-path`, `checkVisibility()`, le texte dans sa boîte, `elementFromPoint` au centre (sonde : `pointer-events` forcé à `auto`), la boîte dans sa zone ; sur un écran, aucun contenu `::before`/`::after`. PN-2 et PN-6 rougissent sur une plaque ou un écran invisible | sabotages `plaques-masquees` (PN-2) et `ecran-transparent` (PN-6) |
| 4 | Des ✅ sans mesure (canevas masqué : `✅ PN-2 conforme`, PN-4 vert sur le seul portrait) | PN-2 non mesuré à une taille de bureau : rouge. PN-4 non mesuré à une taille ou sur le portrait : rouge. `conclure` refuse un ✅ sans détail (« ❌ PN-n vert sans mesure ») | `decor-masque`, joué à part (plus bas) |
| 5 | Le `verifier` ne protégeait ni PN-6, ni PN-8, ni PN-9 : les sabotages ne touchaient que les trois documents | L'atelier témoin est DANS le témoin (`temoin/atelier-temoin/**.temoin`) ; un `--atelier` relatif se résout d'abord dans la racine jugée, et l'atelier part avec les documents vers l'usine (`--envoi`) ; 12 sabotages de l'atelier ; JA-3 exige que chacun de PN-1 à PN-9 soit tué, et PN-6, PN-8, PN-9 par l'atelier | 19 sabotages vus (JA-8) |
| 6 | PN-1 rouge : seule sa ligne était écrite | Une ligne « ❌ PN-n non évalué (PN-1 rouge : …) » pour PN-2 à PN-9, sur le poste comme sur l'usine ; la première ligne reste PN-1 | sortie de la référence (JA-1), `grille-retiree`, `atelier-autre-commit` |

**Une conséquence du défaut 5** : un atelier saboté n'est plus le commit que cite `planche.md`, et PN-1 l'arrêtait avant
tout le reste (la correction proposée ne pouvait donc pas marcher telle quelle). Le bloc ```planche admet désormais
`atelier: racine`, **seulement** pour un atelier non versionné posé dans la racine jugée (il voyage avec ses documents,
le juge le fige à chaque passage). `~/claw3d-pixel` est un dépôt git : `atelier: racine` y est rouge, et le sha du commit
« f0-planche » reste exigé. Le `verifier` de 026-169 n'a pas `--atelier`. Le sabotage `atelier-autre-commit` prouve que la
citation par sha reste jugée.

## Un septième défaut, trouvé en rejouant : un rendu non déterministe sous charge

Premier `verifier` (PASS) : trois passages sur une usine chargée ont montré `❌ PN-6 telephone … 187425 pixel(s)
différent(s)` sur un atelier **non modifié**. Le témoin vert était passé par chance. Reproduit avec la boîte de l'écart :
tout l'écran (`0,0 1170×2532`), écart de **2** au plus. Ce ne sont pas des tuiles manquantes : c'est le chemin de
rastérisation GPU (émulée par SwiftShader) qui change d'un chargement à l'autre sous charge, sur les dégradés de la
nébuleuse et les cadres translucides.

Mesuré sur l'usine, quatre juges en parallèle, sur le même témoin :

| Chromium | Passages rouges |
|---|---|
| drapeaux d'avant | 4 sur 8 (chaque fois 187 425 pixels) |
| `--disable-gpu-rasterization` | 0 sur 16 |

Correction : `--disable-gpu-rasterization`, ajouté aux drapeaux. WebGL reste disponible (vérifié : `webgl2`, ANGLE sur
SwiftShader). En plus, toute capture de mesure est **stable** : deux clichés successifs identiques octet pour octet. Si
la page est encore instable après neuf clichés, le passage s'arrête : rien n'est mesuré sur un rendu qui bouge. Second
`verifier` : aucun écart plein écran, les seuls écarts du téléphone sont ceux des sabotages (576 pixels dans une boîte de
24 × 24 = 4 pixels de grille × k 6 ; le portrait, 144 × 144).

## L'état d'avant : l'ancien juge (celui de la contre-vérification) sur les mêmes défauts

Ancien juge (copie du 27/09, bac à part), ancien contrat (atelier dans le dépôt, cité par le sha de son gel) :

| Défaut posé dans l'atelier témoin | Ancien juge | Juge corrigé |
|---|---|---|
| `portrait-donnee` (fond du portrait lu dans les données) | **code 0, PASS**, ✅ PN-6 | ❌ PN-6 bureau : 2368 pixels, boîte 308,88 64×64 (et 1280, téléphone, vaisseau) |
| `donnee-peinte-telephone` | **code 0, PASS** | ❌ PN-6 telephone : 576 pixels, boîte 657,366 24×24 |
| `donnee-peinte-1280` | **code 0, PASS** | ❌ PN-6 bureau-1280 : 16 pixels, boîte 620,256 4×4 |
| `donnee-vaisseau` | **code 0, PASS** | ❌ PN-6 vaisseau : 512 pixels, boîte 564,452 16×32 |
| `plaques-masquees` (`display: none` sur plaques et écrans) | **code 0, PASS**, ✅ PN-2 | ❌ PN-2 plaque « COMMANDEMENT » invisible (boîte nulle, checkVisibility() faux…) |
| `ecran-transparent` (`color: transparent`) | **code 0, PASS** | ❌ PN-6 écran commandement invisible (couleur du texte transparente) |
| `decor-masque` (canevas en `display: none`) | code 1, mais `✅ PN-2 conforme` et `✅ PN-4 … portrait` seul | ❌ PN-2 non mesuré — canevas absent ou masqué ; ❌ PN-4 non mesuré — décor non capturé |

## Le `verifier` (`node scripts/juges-026-pilotage-preuve.mjs --lot=p`)

Second passage, 28/09 de 01 h 04 à 01 h 15 (23:04 à 23:15 UTC) : **PASS, JA-1 à JA-10, 677 s** (plafond de la fiche :
25 min). Référence : `❌ PN-1` puis huit lignes « non évalué » (JA-1) ; `--temoin` : le prototype B réel capturé aux trois
tailles, code 0 ; témoin vert : code 0, 9 critères verts, 33 s ; 19 sabotages vus ; JA-9 : 77 928 octets de code.

Le témoin vert mesure réellement : 21 plaques visibles dans leur zone à 1440 et à 1280 ; 5 rendus a/b identiques pixel pour
pixel (1440 × 900, 1280 × 800, 1170 × 2532, echelle, vaisseau) ; 80 écrans vus (20 salles, 1440 et 1280, données a et b) ;
palette de 28 couleurs sur 533 632, 133 408 et 1 869 984 pixels du décor et 3 844 du portrait ; blocs k × k uniformes ;
4 personnages dessinés ; atlas de 6,9 Ko ; captures de 44 à 149 Ko. Elles ont été regardées : c'est la planche du témoin
(20 salles à plaque, écrans « — », réservée fermée, portrait, personnages), pas du bruit.

| Sabotage | Fichier du témoin | Ligne du juge (critère visé) |
|---|---|---|
| k-1440-faux | planche.md | ❌ PN-3 bureau : canevas de 800.0×768.0 pixels de l'appareil, grille bureau 400×384 × k 3 = 1200×1152 attendu |
| reserve-deplacee | grille.json | ❌ PN-2 bureau : ecommerce rendue en 344.0,264.0 48.0×80.0 (pixels de grille), grille.json dit 344,346 48×30 (reserve) |
| palette-sans-magenta | planche.md | ❌ PN-4 bureau : 11648 pixel(s) hors palette, 1 couleur(s) (#ff3cc7 ×11648) |
| licence-auteur | licence-planche.json | ❌ PN-5 pack 05-zwonky-spacers : auteur « Zwonky Studio », le licence.json dit « zwonky » |
| echelle-hors-licence | licence-planche.json | ❌ PN-7 échelle : l'art de l'échelle vient de 04-rottingpixels-scifi-tileset, que licence-planche.json ne cite pas |
| atelier-autre-commit | planche.md | ❌ PN-1 atelier … non versionné, figé par le juge au commit 89064659eda5 ; planche.md cite 1111… |
| grille-retiree | grille.json | ❌ PN-1 docs/station/grille.json absent |
| donnee-peinte-1280 | atelier : planche.js | ❌ PN-6 bureau-1280 : 16 pixel(s) différent(s) …, dans la boîte 620,256 4×4 |
| donnee-peinte-telephone | atelier : planche.js | ❌ PN-6 telephone : 576 pixel(s) différent(s) …, dans la boîte 657,366 24×24 |
| donnee-vaisseau | atelier : planche.js | ❌ PN-6 vaisseau : 512 pixel(s) différent(s) …, dans la boîte 564,452 16×32 |
| portrait-donnee | atelier : planche.js | ❌ PN-6 bureau : 2368 pixel(s) différent(s) …, dans la boîte 308,88 64×64 |
| ecran-chiffre | atelier : planche.js | ❌ PN-6 bureau (données a) : écran radar dit « 41 », « — » attendu |
| ecran-transparent | atelier : index.html | ❌ PN-6 bureau (données a) : écran commandement invisible (couleur du texte transparente) |
| plaques-masquees | atelier : index.html | ❌ PN-2 bureau : commandement : plaque « COMMANDEMENT » invisible (boîte nulle (display none, 0.0×0.0), …) |
| feuille-brute | atelier : planche.js | ❌ PN-8 vue station : /planche/echelle-pack.png est la feuille brute 04-rottingpixels-scifi-tileset/… du lot A |
| vues-confondues | atelier : planche.js | ❌ PN-9 bureau.jpg et echelle.jpg se ressemblent trop (écart moyen 0.00 sur 32×32, 2 au moins) |
| sortie-reseau | atelier : server/index.js | ❌ PN-5 l'atelier a tenté de sortir de la boucle locale (refusé) : fetch https://exemple.invalid/fuite ×1 |
| personnage-fantome | atelier : planche.js | ❌ PN-7 facteur (marche) : 0.0 % de son cadre change sans lui, 10 % au moins |
| decor-lisse | atelier : index.html | ❌ PN-3 bureau : 54147 bloc(s) 2×2 non uniforme(s) sur 153600 dans le décor capturé |

`scripts/fixtures/026-pilotage/p/mutations-atelier.mjs` (27/09) est retiré : ses mutations sont devenues des sabotages du
lot, que le `verifier` joue lui-même.

## PN-5 entre deux passages (27/09, toujours valable)

Le juge garde les empreintes du premier passage (787 fichiers de `~/station-assets`, 27/09 20:32:01Z) dans
`~/presti/.orchestre/travail/station-planche-qa/empreintes-lot-a.json` sur l'usine (hors du bac, recréé à chaque appel).
Essai du 27/09 : une empreinte altérée, le juge lancé sur le témoin → `❌ PN-5 ~/station-assets a changé depuis le premier
passage … modifié …/BUSH_01.png` ; fichier rétabli, même SHA-256 avant et après. Chaque passage du 28/09 le confirme :
« identique au premier passage du 2026-09-27T20:32:01.142Z (787 empreintes) ».

## Ménage

Les bacs diagnostiques créés sur l'usine (`diag168`, `diag168b`, `diag168c`, `diag-base-1` à `4`, `diag-v1-1` à `4`,
`avant168`) ont été retirés un par un (`git -C ~/presti worktree remove --force`), aucun autre. Il reste `planche`, le bac
du juge, recréé à chaque passage.

## Ce que le juge ne voit pas (limites dites)

- PN-4 ne juge pas la nébuleuse : c'est un calque à part (des dégradés, qui sortent forcément d'une palette de 24 à
  32 couleurs). PN-7 exige seulement qu'elle couvre l'écran et ne soit pas uniforme. PN-6 la compare entre a et b.
- PN-8 compte les images servies par le réseau local. Une feuille brute glissée en `data:` dans un script ne passe pas par
  le réseau et n'est pas vue.
- PN-2 et les écrans de PN-6 sont jugés au bureau (1440 et 1280) : `grille.json` ne donne les emplacements qu'en mode bureau,
  et au téléphone les plaques n'apparaissent qu'au zoom.
- « Rien par-dessus leur centre » est strict : un calque transparent posé au-dessus des plaques (pour des clics, par
  exemple) les rend « couvertes ». F0 le sait par le contrat, dans l'en-tête du juge.
- PN-6 demande que la page ait chargé les données **au moins une fois** par rendu (et non plus exactement une fois) :
  `next dev` monte les effets deux fois (React StrictMode).
- Le contrat de la page (route, attributs `data-planche`, miroir `window.__planche`, données sur
  `/office/planche/donnees.json`, bloc ```planche) est écrit dans l'en-tête du juge. La fiche 026-169 y renvoie : c'est
  là qu'il faut le lire avant de dessiner F0.
