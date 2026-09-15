# Candidat R — « la cage tourne » (§3.5 corrigé) : prototype, réglage, mesures, films

15/09/2026, tâche 020-01, candidat R seul. Dossier : `signature/films/R/`.

## En bref

- **Variante retenue : V6.** La rotation va de −3,25° à +2,25° entre 34/25 et 16/10, et de −4° à +6° à partir de 16/10. Le reste est celui du §3.5 : 10 s par demi-cycle en aller-retour, `cubic-bezier(.37,0,.63,1)`, E_b 1,07, origine 40.4% 38.6%, poussée inchangée. Bloc : `bloc-retenu.css`. Le bloc nominal du §7.3 est dans `bloc.css`.
- **C2-a n'est pas tenue au format de la grille.** En 1088×800 : 0,493 et 0,540, pour une cible de 0,56. Elle est tenue en 1280×800 (0,603 / 0,640) et en 1440×900 (0,611 / 0,645).
- **C2-b n'est tenue nulle part.** En 1088×800, l'image reste figée 10 s sur 10 au sens de video-qa ; en 1280 et 1440, 4,5 s. Aucune des six variantes ne la tient, même à 5 s par demi-cycle.
- **C2-c et R-12 tiennent.** Aucune paire au-dessus de 0,085. Contraste minimal du titre : 3,107 en 1280×800.
- **R-4 échoue en 2560×1080 seulement.** 6 pixels en tout, un par image, à l'intérieur de la photo et non dans un coin. Ce sont des trous d'un pixel dans le rendu logiciel de l'image tournée. Le bloc nominal a le même défaut.
- **Verdict d'œil.** C'est sobre mais presque invisible sur quatre images fixes, et le bois ne gagne aucune matière. R seul ne fera pas monter C2 ni C6 à la grille.

## Conditions

- **Page.** Page en ligne (c62c866). La classe `da--signature` et le bloc sont injectés dans le HTML servi au navigateur de test (`page.route`). Rien n'est écrit dans `presti/`.
- **Navigateur.** Chromium de Playwright lancé par `chromium.launch()` nu. `data-relief-etat` vaut `sans` à 8 s, sans toile, dans les trois formats (`mesures.json` → `formats.*.relief` ; `verif/verif.json` → `reliefA8s`, relevé à 10,8 s).
- **Images déterministes.** Les animations de la ligne de temps du document sont mises en pause et leur `currentTime` est posé, puis la capture est prise en PNG. Aucun film n'a été enregistré en temps réel.
  - t est compté depuis le départ commun des six animations du héros : `pousse`, `signature-tourne-*`, deux `lever`, deux `entre`. Même `startTime`, 552 ms (`verif/verif.json`).
- **Contrôle image posée contre temps réel**, en 1088×800 (`verif/verif.json`).
  - La capture réelle dure de t = 4450 à 4817 ms. Posée à 4523 ms, l'image donne un écart de 0,0004 et une part > 8 de 0,000.
  - Décalée de 250 ms, elle donne 0,044 ; de 500 ms, 0,123 ; de 1 s, 0,252. La pose reproduit donc bien l'instant.
- **Calage de la méthode.** La page en ligne sans injection, mesurée ainsi, donne une part > 8 de 0,076 / 0,187 en 1088×800 et 0,072 / 0,182 en 1440×900, avec un écart moyen de 0,0013 par image. Le cahier relevait 0,072 / 0,178 et 0,0014 (`variantes.json` → `T0-en-ligne`, contre le §3.1).
- **Méthodes.** Toutes celles du cahier, décrites dans `mesures.json` → `methode` :
  - réduction `gris`/`ecart` de `cdc-c2-variantes.mjs` ;
  - plage figée comptée comme `video-qa.mjs:131-143` ;
  - contraste et feuille magenta du §8.0 et de R-4.

## 1. Le bloc et les six contraintes du §3.5

`bloc.css` recopie le bloc 1 du §7.3. `bloc-retenu.css` est le même bloc, seules les valeurs d'angle changent. Contrôles dans `mesures.json` :

| Contrainte | Contrôle | Résultat |
|---|---|---|
| 1. CSS seul, portée `html.js.da--signature .ouverture>.hero--plein`, ≥ 1024 px, mouvement permis | Mouvement réduit en 1440×900 ; page commune `menuisier-bruz` en 1440×900, avec et sans injection | Aucune animation, `rotate` none. Bruz : animations, boîte `picture`, `object-position` identiques ; écart des captures 0 / part > 8 de 0 |
| 2. Propriétés animées | `getKeyframes()` des animations de `.hero__media`, `picture`, `img`, toile | `pousse` : `scale` ; `signature-tourne-2/-4` : `rotate` ; `ouverture-photo` (existante, liée au défilement) : `transform`. Ni `filter` ni `opacity` |
| 3. Joue en 1088×800, rien sous 34/25 | Animations nommées | 1088×800 : `pousse` + `signature-tourne-2` ; 1280 et 1440 : `signature-tourne-4` ; 1024×768 : `pousse` seule, `rotate` none, `object-position` 50 % 42 % |
| 4. Easing | Keyframes | `cubic-bezier(0.37, 0, 0.63, 1)`, 10 000 ms, `alternate` |
| 5. Coins | R-4 | Voir §4 : 0 px partout sauf 2560×1080 (trous d'un pixel) |
| 6. Titre lisible | R-12 | p90 ≥ 3,107 dans les trois formats |

**Amplitude asymétrique : ce qu'elle change par rapport au §3.5.**
- Bornes calculées par sens avec la géométrie de `relecture/amplitude.mjs`, sur une grille de formats de bureau (`bornes-plage.json`) :
  - de 34/25 à 16/10 : +2,55° et −3,65° ;
  - à partir de 16/10 : +6,75° et −4,35°.
- Marges au pire coin :
  - −3,25° laisse 3,42 px (1024×752) ;
  - +6° laisse 4,53 px (1024×640) ;
  - −4° laisse 2,25 px (1024×640).
- La couverture ne dépend toujours d'aucune phase. La marge décroît de façon monotone avec l'angle dans chaque sens (`bornes-sens.json`).
- `--signature-a` vaut le plus grand des deux côtés (3.25 ou 6). La formule du voile (§7.4) boucle sur ±A : elle reste prudente.
- **À écrire dans l'annexe A si R est retenu**, car le §6 prévoit une rotation symétrique.

## 2. Réglage : six variantes (`variantes.json`)

**Conditions** : sans carte graphique. Chaque case donne 1088×800 puis 1440×900.
- C2-a : t 2,5 → 5 s et t 5 → 8 s.
- C2-b : 81 images de t 8 à 18 s.
- R-12 : 40 instants du cycle de 40 s et 4 extrêmes.
- Coins : les 4 extrêmes, rotation × poussée.
- Vitesse : calculée au pic, au coin le plus loin de l'œil.

| Variante | C2-a (part > 8) | C2-b : plus longue plage figée / écart moyen | R-12 min | Vitesse au coin le plus loin | Coins aux extrêmes |
|---|---|---|---|---|---|
| T0 en ligne (témoin) | 0,076 / 0,187 · 0,072 / 0,182 | 10 s / 0,0013 · 10 s / 0,0012 | 3,31 · 3,36 | — | — |
| V1 nominal ±2,25° / ±4°, 10 s | 0,408 / 0,444 · 0,538 / 0,557 | 10 s / 0,0034 · 4,75 s / 0,0051 | 3,28 · 3,19 | 10,1 · 22,7 px/s | 0 · 0 |
| V2 sens inversé | 0,450 / 0,509 · 0,568 / 0,612 | 10 s / 0,0031 · 5,25 s / 0,0048 | 3,28 · 3,19 | 10,1 · 22,7 px/s | 0 · 0 |
| V3 asymétrique (+2,25/−3,25 ; +6/−4) | 0,443 / 0,480 · 0,577 / 0,600 | 10 s / 0,0039 · 4 s / 0,0061 | 3,25 · 3,19 | 12,4 · 28,4 px/s | 0 · 0 |
| V4 période 5 s | 0,470 / 0,586 · 0,605 / 0,682 | 2,375 s / 0,0056 · 1,375 s / 0,0091 | 3,28 · 3,19 | 20,3 · 45,4 px/s | 0 · 0 |
| V5 asymétrique + 5 s | 0,522 / 0,626 · 0,643 / 0,713 | 1,875 s / 0,0067 · 1,125 s / 0,0112 | 3,25 · 3,19 | 24,8 · 56,7 px/s | 0 · 0 |
| **V6 sens inversé + asymétrique, 10 s** | **0,493 / 0,540 · 0,611 / 0,645** | **10 s / 0,0036 · 4,5 s / 0,0058** | **3,25 · 3,19** | **12,4 · 28,4 px/s** | **0 · 0** |

- **C2-c** : aucune paire au-dessus de 0,085 dans aucune variante. L'écart maximal est de 0,0175 (V5 en 1440).
- **Pourquoi V6 et pas V5.** V5 est la plus haute en chiffres, mais elle ne tient pas non plus C2-b ni la première paire de C2-a en 1088×800. Surtout, elle double la vitesse : 3,2°/s au pic et 57 px/s au coin en 1440, contre 1,6°/s et 28 px/s pour V6. Un aller-retour de 10° en 5 s, c'est un balancier, pas une respiration. Ce jugement repose sur la vitesse calculée : V5 n'a pas été filmée.
- **Le sens compte** : +0,04 à +0,07 de part > 8 à amplitude égale (V1 contre V2). C'est empirique, lié à la photo et à la phase de la poussée. Avec les instants avancés de 340 ms (retard d'animation noté en R-3), V6 donne 0,479 / 0,548 en 1088×800. Le gain est donc réel, mais il reste sous 0,56.

## 3. Mesures de la variante retenue (`mesures.json`)

Sans carte graphique, relief `sans`, 81 images pour C2-b, 80 instants et 4 extrêmes pour R-12.

| Format | C2-a | C2-b | C2-c | C6-a : écart de luminance moyenne / écart absolu par pixel | R-12 : p90 min / médiane | `rotate` relevé |
|---|---|---|---|---|---|---|
| 1088×800 | 0,493 / 0,540 ✗ | 10 s figées (80 paires sur 80 sous 0,006), écart moyen 0,0036 ✗ | ✓ (max 0,0051) | 0,0047 / 0,1556 | 3,247 / 3,399 ✓ | −3,25° → 2,25° |
| 1280×800 | 0,603 / 0,640 ✓ | 4,5 s (39 sur 80), 0,0058 ✗ | ✓ (max 0,0087) | 0,0030 / 0,2105 | 3,107 (à t 0 : −4°, poussée 1) / 3,177 ✓ | −4° → 6° |
| 1440×900 | 0,611 / 0,645 ✓ | 4,5 s (39 sur 80), 0,0058 ✗ | ✓ (max 0,0088) | 0,0030 / 0,2102 | 3,185 / 3,271 ✓ | −4° → 6° |

**C6-a.**
- Le §3.4 ne dit pas quel écart. Deux lectures sont données :
  - |moyenne L(t25) − moyenne L(t80)|, en luminance relative ;
  - l'écart absolu moyen par pixel.
- La première est **plus basse que le témoin en ligne** : 0,0074 en 1088, 0,0067 en 1440. R n'apporte aucune lumière. La seconde mesure le déplacement de l'image, pas une matière.

**Témoin de R-12.** La page en ligne donne 3,31 en 1088×800 et 3,36 en 1440×900. La rotation retire de 0,06 à 0,18 au contraste, qui reste au-dessus de 3,0.

## 4. R-4 : coins (cas 1, 2 et 4 du §8.1)

- **Témoins.** Photo cachée, la feuille rend du magenta partout : 804 266 px en 1088×800, 1 207 825 px en 1440×900 (le contre-expert F relevait 1 207 825 dans ce format), 2 606 561 px en 2560×1080.
- **Cas 1 et 2** (80 instants au pas de 500 ms ; rotation à −A et +A avec la poussée à 0 et à 19 999 ms) :
  - **0 pixel** en 1088×800, 1280×800, 1366×768, 1440×900, 1920×1080 et 1920×1200 ;
  - **6 pixels en 2560×1080** : un pixel à t 12,5 / 16,5 / 17,5 / 22,5 / 23,5 / 27,5 s, aux angles +4,55°, −1,29° et −2,55°, jamais aux extrêmes.
- **Cas 4** (barres visibles, 15 px) : 0 pixel en 1440×900 et en 1088×800.
- **Enquête en 2560×1080** (`scripts/coins-2560.mjs`, `verif/coins-2560.json`, `mesures.json` → `R4.enquete2560x1080`) :
  - les pixels sont en (1092, 999), (1154, 932) et (2231, 7) : au milieu du bois, et un sur le bord haut ;
  - ils sont identiques sur deux essais ;
  - la page en ligne sans rotation en donne 0 sur 80 instants ; le **bloc nominal V1 en donne 4** (t 9 s et 31 s, bord haut) ;
  - les gros plans que j'ai ouverts (`verif/coin2560-*-gros-plan.png`) montrent un pixel magenta isolé dans le bois, et au rendu normal un point quasi noir au même endroit.
  - **Lecture** : trou d'un pixel dans la rastérisation logicielle de l'image tournée, pas un coin découvert (la borne de couverture est à +11,4° dans ce format, `bornes-sens.json`). R-4 exige 0 pixel : **échec formel en 2560×1080**, commun à R nominal et à V6. Non essayé avec carte graphique.

## 5. Films, instants, planche

- **Films** : `film-1440x900.mp4` (2 706 591 octets) et `film-1088x800.mp4` (2 084 497 octets).
  - t 0 → 10 s, page en haut (`scrollY` 0), 300 images à 30/s posées une à une. Encodage libx264, crf 20, yuv420p, sans son, `+faststart`.
  - `ffprobe` : 300 images, 10,000 s (`films.json`).
- **Mesure refaite sur les films** à la manière de video-qa (fps 8, 160 px ; les entrées du texte jusqu'à 1,6 s y comptent) :
  - 1440×900 : plage figée de 2 s, écart moyen de 0,0071 ;
  - 1088×800 : plage figée de 9 s, écart moyen de 0,0048.
- **Instants** en 1088×800 : `t06.jpg`, `t25.jpg`, `t50.jpg`, `t80.jpg` (0,6 / 2,5 / 5 / 8 s, `demo-images-cles.mjs:29`), extraits du même rendu que le film.
- **Planche** : `planche.jpg`, trois lignes de quatre images à 300 px de haut. R (V6), puis stellar-launch t0-t3 (C2 = 5), puis art-landing t0-t3 (C2 = 4).

## 6. Avis d'œil, sans complaisance

**Ce que j'ai regardé.**
- La planche.
- Les instants t25 et t80 de V6 en taille réelle.
- Une mosaïque d'une image par seconde, extraite du film 1088 (`verif/film-1088-mosaique.jpg`).
- L'image à 9,5 s du film 1440, à +5,8° (`verif/film-1440-t95.png`).
- Les gros plans du pixel de 2560.

Je n'ai **pas vu les films défiler** : je ne peux pas lire une vidéo. Le jugement du mouvement continu revient à Benj.

- **Ça vit visiblement ?**
  - Sur quatre images fixes, non. Sur la planche, mes quatre instants se ressemblent presque trait pour trait. Il faut comparer t25 et t80 en grand pour voir la cage pencher : le noir en haut à droite change de forme, les marches du haut à gauche basculent.
  - En face, les images de stellar-launch et d'art-landing changent de scène. Attention, leurs images-clés montrent aussi du défilement (stellar t2-t3 : « Submissions », « About the founders » ; art-landing t1-t2 : un aplat rouge). Leur part > 8 de référence ne mesure donc pas qu'un héros au repos.
  - En continu, 5,5° en 10 s (1088) ou 10° en 10 s (1440) se verra comme une lente bascule de la cage autour de son puits, à 4 à 9 px/s au centre du titre. C'est lisible si on regarde, facile à manquer si on lit.
- **Sobre ou gadget ?** Sobre. Un seul geste, lent, cohérent avec le sujet : la spirale tourne autour de l'œil. La vue plongeante n'a ni horizon ni verticale, donc +6° ne fait pas « photo de travers ». Sur la même photo, V4 ou V5 (5 s) seraient un balancier.
- **Le bois gagne-t-il en matière ?** Non. Aucune lumière ne glisse. Le grain reste celui de la photo : net à 1440 sur l'image à 9,5 s, sans flou visible. La luminance moyenne des marches bouge moins qu'aujourd'hui (C6-a 0,0047 contre 0,0074 en ligne). R ne répond pas à C6. Il faut une lumière (L1, L2 ou RL) pour ça.
- **Défauts.**
  - Bandes : aucune vue sur l'image pleine de 1440 ni sur la mosaïque (encodage crf 20).
  - Halos, mélange qui salit : aucun, puisque R n'ajoute aucun calque.
  - Coins découverts : aucun dans six formats sur sept, ni avec barres. En 2560×1080, trous d'un pixel, invisibles en mouvement mais réels.
  - Titre : lisible sur toutes les images vues ; contraste en légère baisse (3,11 au pire en 1280×800).
  - Déjà présent aujourd'hui : à t06, le bouton du héros n'est pas encore entré et « Devis » s'affiche dans la barre. C'est le relais de kit.js.
- **Conclusion.** R est un bon témoin, sobre et propre, mais insuffisant : figé au sens de video-qa en 1088×800 et sans matière. Au mieux, c'est la base d'un RL, où la lumière animerait les extrêmes, là où la sinusoïde ralentit.

## 7. Limites

- **Temps.** t est le temps des animations (départ commun à 552 ms du chargement), et non « depuis `domcontentloaded` ». Sensibilité donnée : instants avancés de 340 ms.
- **Carte graphique.** Aucune mesure avec carte graphique : le relief.js en ligne n'est pas adapté à la boîte tournée (§7.4, tâche 020-02). R-4 cas 3 (redimensionnement réel) non mesuré.
- **Vitesses** calculées (géométrie relevée dans la page, pente maximale de l'easing 1,587), pas mesurées à l'écran.
- **Amplitude asymétrique** hors de la lettre du §3.5 et du §6 (A symétrique). Elle reste dans les bornes de couverture calculées, et R-4 le vérifie sauf les trous de 2560. À faire valider.
- **C6-a** : définition ambiguë au §3.4, deux lectures données.
- **R-12** mesuré sur 80 instants du cycle de 40 s et aux 4 extrêmes, sans carte graphique ; 1366×768 et 1536×864 non mesurés pour R-12 (hors demande).
- **Le gain du sens inversé** dépend du contenu de la photo : il n'est pas garanti après recadrage.

## Fichiers

- `bloc.css` (nominal §7.3), `bloc-retenu.css` (V6), `retenue.json`
- `variantes.json` (+ `variantes/*.jpg`, t25 et t80 de chaque variante en 1088×800), `bornes-sens.json`, `bornes-plage.json`
- `mesures.json` (dont `R4.enquete2560x1080`, `verifications`, `notes`), `coins/` (captures magenta de 2560×1080)
- `film-1440x900.mp4`, `film-1088x800.mp4`, `films.json`, `t06.jpg`, `t25.jpg`, `t50.jpg`, `t80.jpg`, `planche.jpg`
- `verif/` (temps réel contre pose, mosaïque du film, gros plans), `scripts/` (commun, verif, bornes-*, variantes, mesures, films, planche, coins-2560)
