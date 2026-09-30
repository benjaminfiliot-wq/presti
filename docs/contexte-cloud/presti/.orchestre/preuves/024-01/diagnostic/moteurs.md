# 024-01 — Ce qui bouge vraiment au téléphone (démo Lestraque)

Mesures du 16/09/2026, 19 h 30 à 19 h 58 UTC (21 h 30 à 21 h 58 à Paris), Chromium 153.0.8010.12, Playwright 1.63.0, sans carte graphique.
Tous les chiffres ci-dessous sortent des fichiers `*/mesures.json`, `resume.json`, `sonde-etats.json`, `planches.json`,
`copie-vs-en-ligne.json` et `sonde-supports.txt` de ce dossier. Aucun n'est estimé.

## En bref

1. **Ce qui bouge sans qu'on défile : le héros, et rien d'autre, sur les deux profils.** Deux boucles au temps y tournent :
   la rotation de la photo et le projecteur. Sur les 20 arrêts, l'écart moyen de gris entre deux captures prises à 600 ms
   d'intervalle vaut 2,74 à 4,08 dans la bande du héros. Partout ailleurs, il vaut 0 à 0,009 : 17 arrêts sur 20 sont à 0 exact.
2. **Android (support natif) : trois gestes suivent le défilement.**
   - La citation s'allume mot à mot, de y = 80 à y = 720.
   - Les quatre verbes de l'atelier s'allument, de y = 2 320 à y = 2 600.
   - L'éclaté des étapes s'ouvre, de y = 4 200 à y = 4 640.
   - En plus, trois jauges suivent le pouce sur les rails horizontaux.

   Au total, 38 animations distinctes : 2 au temps, 33 liées à une `ViewTimeline` et 3 à une `ScrollTimeline`.
3. **iPhone simulé (sans animations liées au défilement) : aucun de ces trois gestes, et 2 animations en tout (celles du
   héros).**
   - La citation arrive en un fondu de 0,55 s et ses 15 mots sont pleins d'emblée (opacité 1).
   - Les verbes sont pleins et immobiles.
   - L'éclaté est l'image fixe `eclate.avif`, avec ses 5 pastilles déjà affichées.
   - Les jauges des rails sont masquées (`display: none`).
4. **Commun aux deux profils : 25 révélations au temps, une seule fois chacune.** kit.js pose `.vu` via IntersectionObserver,
   puis une transition joue sur l'opacité et un décalage vertical (mesurés sur la figure de la citation : 0,55 s et 44 px), plus un `clip-path` sur la galerie. On a
   aussi les bascules de couleur de la nav et la ligne des étapes pilotée en JavaScript (`--avancee`). Entre le héros et le bas,
   un visiteur iPhone ne voit donc bouger que ces entrées ponctuelles.
5. **Piège de protocole : la réécriture demandée ne désactive rien dans Chromium 153.** `@supports (animation-timeline:
   --non-supporte())` est **VRAIE** : une fonction à tirets passe pour une fonction de substitution, comme `var()`. Le profil
   « iphone-litteral » le prouve : même inventaire qu'Android (38 animations, 36 liées au défilement). Pour le profil iPhone,
   j'ai donc utilisé `@supports (animation-timeline: non-supporte())`, qui est **FAUSSE** (`sonde-supports.txt`). Une autre
   sonde, écrite dans ce dossier à 21 h 10 heure locale par un autre processus (`sonde-supports.json`), trouve la même chose.

## Protocole

| Élément | Android | iPhone simulé |
|---|---|---|
| Page | https://prestiapp.fr/sites-demo/lestraque/index.html (en ligne) | copie générée par `generer.mjs lestraque --sortie=…`, servie en local |
| Appareil Playwright | « Pixel 7 » : 412×839, dpr 2,625, tactile, UA Android Chrome 153 | « iPhone 13 » : UA iPhone, dpr 3, tactile, **fenêtre forcée à 390×844** comme le demande la consigne (le descripteur Playwright dit 390×664) |
| `@supports` de styles.css et bureau.css | natifs : 10 `view()` et 3 `scroll()` dans styles.css, 2 `view()` dans bureau.css, tous vrais au CSSOM | les 15 réécrits en `(animation-timeline: non-supporte())`, 15 fausses au CSSOM, 0 `view()` ni `scroll()` restant |
| `CSS.supports('animation-timeline: view()')` vu par la page / natif | true / true | false / true (script d'init : faux pour animation-timeline, view-timeline, scroll-timeline) |
| `prefers-reduced-motion: reduce` | false aux 20 arrêts | false aux 20 arrêts |
| Hauteur de page (après rendu complet) | 8 422 px, 20 arrêts de y = 0 à 7 583 | 8 341 px, 20 arrêts de y = 0 à 7 497 |

- **Copie comparée à la page en ligne** (`copie-vs-en-ligne.json`) : 15 fichiers comparés (pages, CSS, JS, calques de
  l'éclaté). 14 ont la même empreinte SHA-256. styles.css a la même taille (82 728 octets) mais diffère d'un seul octet : la
  date du commentaire d'en-tête (2026-09-15 en ligne, 2026-09-16 dans la copie).
- **À chaque arrêt**, dans l'ordre :
  - `scrollTo` instantané, puis 2 images et 150 ms, puis relevé de `document.getAnimations()`, qui attrape les transitions
    déclenchées par l'arrêt ;
  - attente des images à l'écran (5 s au plus ; 0 image non chargée au moment des captures) ;
  - repos jusqu'à 1,5 s après l'arrêt, puis second relevé ;
  - deux captures en pixels CSS dont les débuts sont espacés de 601 à 616 ms (aucune paire à refaire). L'énergie est l'écart
    moyen absolu de gris sur 0–255, mesuré sur tout l'écran et par bande de section. On relève aussi la part des pixels dont
    l'écart dépasse 8 ;
  - journal des mutations `style`, `class`, `hidden` et `open` : c'est ce que du JavaScript fait bouger sans passer par
    `getAnimations()`.
- **Balayage fin** (page neuve, pas de 40 px, sans capture) : pour chaque animation liée au défilement, le premier y où elle
  quitte 0 et le premier y où elle est pleine ; le y où chaque `.reveal` et `.etape` reçoit `vu` ; les valeurs de `--avancee`.
- **Rails** : un geste horizontal de 85 % de la largeur sur chacun des trois rails, avec la jauge relevée avant et après.
- **Sonde d'états** (`sonde-etats.json`) : opacité effective et translation de la citation, des verbes et de l'éclaté aux y
  400, 2 400 et 4 400, 1,5 s après l'arrêt.
- **Film** : 15 s de défilement depuis y = 0, à 480 px/s (8 px par image à 60 Hz), recalculé à chaque image sur le temps réel.
  Enregistré par `recordVideo`.
- **Calme** : avant chaque profil et chaque film, aucun processus `-qa.mjs` et une page vide à 55 images/s ou plus.
  - Arrêts Android, film Android et arrêts iPhone : 0 juge en cours, page vide à 60,2 à 60,6 images/s. Arrêts iphone-litteral : 108 s d'attente, puis 0 juge et 60,4 images/s.
  - Film iPhone : l'attente a atteint son plafond de 20 min (1 209 s) avec 2 juges `-qa.mjs` encore en cours (tâche 023-03).
    Le film a été tourné à ce moment-là, mais sa cadence mesurée reste à 59,8 images/s.
- **Les passages précédents ont été remplacés** (un essai Android sans film, puis deux passages complets ; le script réécrit
  le dossier de chaque profil). Le dernier d'entre eux avait tourné pendant qu'un exécutant Codex chargeait la machine (film
  Android à 32,6 images/s), d'où les garde-fous de calme ajoutés.
  Seul le passage final est rapporté ici (`execution.log`, `bilan-execution.json`).

## Section par section

Les y sont des positions de défilement (`scrollY`), à 40 px près. Les sections occupent, en y de page :

- **Android** : héros 0–839, plateau 839–1 760, prestations 1 760–2 710, atelier 2 710–3 549, réalisations 3 549–4 453,
  communes 4 453–4 894, étapes 4 894–5 793, questions 5 793–6 720, contact 6 720–8 018, pied 8 018–8 422.
- **iPhone** : héros 0–844, plateau 844–1 773, prestations 1 773–2 711, atelier 2 711–3 555, réalisations 3 555–4 451,
  communes 4 451–4 879, étapes 4 879–5 731, questions 5 731–6 643, contact 6 643–7 936, pied 7 936–8 341.

### Héros — `android/arrets/00-y00000.jpg`, `iphone/arrets/00-y00000.jpg`

| | Android | iPhone simulé |
|---|---|---|
| S'anime | `signature-tourne-2` sur la photo (durée 10 s, infinie) et `signature-projecteur` sur `.hero__media::before` (durée 9 s, délai −2,5 s, infinie) : les **seules** animations présentes au chargement du profil iPhone, et les 2 seules au temps sur Android | les deux mêmes boucles, identiques |
| Énergie hors défilement (bande du héros) | y = 0 : 2,845 (part > 8 : 0,087) ; y = 400, bande 0–439 : 3,621 (0,145) | y = 0 : 2,743 (0,085) ; y = 400, bande 0–444 : 4,083 (0,163) |
| Reste figé | le titre, le chapeau et le bouton : aucune entrée au chargement sur les deux profils (0 animation sur le h1) | idem |
| À noter | les deux boucles restent `running` aux 20 arrêts, dont 17 où le héros est hors de l'écran | idem |

### Plateau et citation — `android/arrets/01-y00400.jpg`, `iphone/arrets/01-y00400.jpg`

| | Android | iPhone simulé |
|---|---|---|
| Citation | 15 animations `telephone-mot` (`ViewTimeline` du `<p>`). Mot 1 : de 0 à plein entre y = 80 et 320 ; mot 15 : entre 520 et 720. À y = 400, opacité des mots de 0,55 à 1. La figure n'a ni transition ni décalage (opacité 1, transform `none`, transition `none` avant son entrée) | 0 animation liée au défilement. Avant l'entrée, la figure est à opacité 0, décalée de 44 px, avec des transitions de 0,55 s sur l'opacité et le transform. Elle reçoit `vu` à y = 200 : **un fondu montant de 0,55 s, une seule fois**. À y = 400, les 15 mots sont à 1 |
| Chiffres et photo | 3 chiffres et la photo : révélation au temps (transitions d'opacité et de transform) à y = 480, 560, 640 et 800 | la même, à y = 520, 600, 680 et 800 |
| Reste figé | les valeurs des chiffres : le comptage de recit.js ne vit qu'au bureau, aucune animation ni mutation relevée | idem |
| Énergie hors défilement | 0 à 0,001 (3 arrêts) | 0 à 0,001 (3 arrêts) |

### Prestations — `android/rail-prestations-avant.jpg` et `-apres.jpg`, idem sous `iphone/`

| | Android | iPhone simulé |
|---|---|---|
| Au défilement vertical | révélation de l'en-tête (y = 1 120). Les cartes du rail reçoivent `vu` (y = 1 280 et 1 840) sans qu'aucune transition soit relevée : au téléphone, kit.css les garde visibles | idem (en-tête à 1 120, cartes à 1 360 et 1 840) |
| Rail horizontal | `ScrollTimeline` : la jauge passe de `scaleX(0,17)` à `scaleX(0,34)` après un geste de 350 px (progression 0,205). Elle reste à 0 pendant les 191 positions du défilement vertical | le rail défile (2 009 px pour 390 visibles), mais la **jauge est masquée** (`display: none`) et n'a aucune animation |
| Reste figé | vignettes et textes : le survol et son aperçu sont réservés au bureau | idem |
| Énergie hors défilement | 0 (4 arrêts) | 0 (4 arrêts) |

### Atelier — `android/arrets/06-y02400.jpg`, `iphone/arrets/06-y02400.jpg`

| | Android | iPhone simulé |
|---|---|---|
| Verbes | 4 animations `telephone-verbe` (`ViewTimeline` de la phrase) : « trace » de 2 320 à 2 440, « débite » de 2 400 à 2 520, « assemble » de 2 440 à 2 560, « ponce » de 2 480 à 2 600. À y = 2 400, opacités 0,878 / 0,685 / 0,55 / 0,55, montée restante de 0,70 / 1,81 / 2,59 / 2,59 px | 0 animation. À y = 2 400, les 4 verbes sont à opacité 1, sans translation |
| Titre et phrase | révélation au temps à y = 2 120 (titre) et 2 240 (phrase) | idem, aux mêmes y |
| Reste figé | la photo (la dérive et la vidéo de ponçage sont réservées au bureau) | idem |
| Énergie hors défilement | 0 (3 arrêts) : la photo ne bouge pas | 0 (3 arrêts) |

### Réalisations — `android/rail-realisations-*.jpg`, `iphone/rail-realisations-*.jpg`

| | Android | iPhone simulé |
|---|---|---|
| Au défilement vertical | révélation de l'en-tête (y = 2 920) et des deux premières cartes (y = 2 960) : transitions relevées sur l'opacité, le transform, le `clip-path` du cadre et la légende | idem, aux mêmes y |
| Rail horizontal | jauge `scaleX(0,17)` → `scaleX(0,452)` après 367 px (progression 0,34) | le rail défile (1 412 px pour 390 visibles), **jauge masquée** |
| Reste figé | le travelling épinglé et le compteur (réservés au bureau) | idem |
| Énergie hors défilement | 0 (3 arrêts) | 0 (3 arrêts) |

### Communes

| | Android | iPhone simulé |
|---|---|---|
| S'anime | révélation de l'en-tête (y = 3 800) puis des 4 communes (y = 3 920, 3 960, 4 000 et 4 080) | idem (3 800, puis 3 880, 3 960, 4 000 et 4 040) |
| Reste figé | tout le reste : aucune animation liée au défilement | idem |
| Énergie hors défilement | 0 (2 arrêts) | 0 (2 arrêts) |

### Étapes et éclaté — `android/arrets/11-y04400.jpg`, `iphone/arrets/11-y04400.jpg`, `*/rail-etapes-*.jpg`

| | Android | iPhone simulé |
|---|---|---|
| Éclaté | 14 animations sur la `ViewTimeline` de la figure. À y = 4 200, `assemble.avif` s'efface et les 4 calques apparaissent : les deux passent de 0 à plein dans le même pas de 40 px. Les calques s'écartent de y = 4 200 à 4 600 (10 positions intermédiaires) ; les 5 pastilles arrivent entre 4 600 et 4 640. À y = 4 400, les calques sont décalés de (−44,2 ; −4,4), (−42,7 ; 23,2), (21,9 ; −10,6) et (21,9 ; −26,0) px, pastilles encore à 0. `eclate.avif` : `display: none` | 0 animation. `eclate.avif` affichée (`display: block`, opacité 1) ; `assemble.avif` et les 4 calques en `display: none` ; les 5 pastilles à opacité 1. **Image fixe** |
| Ligne des étapes (JavaScript, `--avancee`, hors `getAnimations`) | 7 valeurs relevées : écrite à y = 4 480, quitte 0 à 4 920, vaut 1 à 5 120. Elle déclenche une transition d'opacité sur les numéros d'étape (relevée à l'arrêt y = 5 200) | même comportement : écrite à 4 440, quitte 0 à 4 880, vaut 1 à 5 080 ; même transition d'opacité des numéros à l'arrêt y = 5 200 |
| Révélations | en-tête à y = 4 280, étapes à 4 760 et 4 840 | en-tête à 4 280, étapes à 4 720 et 4 800 |
| Rail horizontal | jauge `scaleX(0,17)` → `scaleX(0,464)` après 330 px (progression 0,354) | le rail défile (1 271 px pour 390 visibles), **jauge masquée** |
| Énergie hors défilement | 0 (3 arrêts) | 0 (3 arrêts) |

### Questions

| | Android | iPhone simulé |
|---|---|---|
| S'anime | révélation de l'en-tête, de l'introduction et de la liste (y = 5 400, 5 440, 5 560) | idem (5 320, 5 360, 5 480) |
| Reste figé | la photo et les questions fermées (elles ne s'ouvrent qu'au toucher) | idem |
| Énergie hors défilement | 0 (4 arrêts) | 0 (4 arrêts) |

### Contact et pied

| | Android | iPhone simulé |
|---|---|---|
| S'anime | révélation de l'en-tête du contact (y = 6 040) | idem (y = 5 960) |
| Reste figé | la photo, le formulaire et le pied : aucune animation, aucune mutation | idem |
| Énergie hors défilement | contact 0 (4 arrêts), pied 0 (1 arrêt) | contact 0 (5 arrêts), pied 0 (1 arrêt) |

### Nav (fixe, sur toutes les sections)

| | Android | iPhone simulé |
|---|---|---|
| CSS | transitions de couleur et de fond sur 7 cibles (barre, `::before` et `::after`, burger, bouton Devis) quand une scène sombre passe dessous | idem |
| JavaScript sur 20 arrêts | 13 changements de classe (`solide`, `nav--sombre`), 33 styles en ligne (`--nav-sh`, `--nav-sb`, `--nav-ch`, `--nav-cb`) | 10 changements de classe, 36 styles en ligne |

## Films

| | Android | iPhone simulé |
|---|---|---|
| Fichiers | `android/film-haut.webm` (brut) et `android/film-haut.mp4` (412×838, 25 i/s, 15,68 s) | `iphone/film-haut.webm` et `iphone/film-haut.mp4` (390×844, 25 i/s, 15,60 s) |
| Défilement mesuré | 873 images rAF en 15 023 ms (58,1 i/s), pas médian de 8 px, intervalle médian de 16,7 ms (p95 : 16,8 ms), y de 4 à 7 200 | 897 images rAF en 15 006 ms (59,8 i/s), pas médian de 8 px, intervalle médian de 16,7 ms (p95 : 16,7 ms), y de 3 à 7 200 |
| Couverture | du héros au haut du contact (le bas du contact et le pied, au-delà de y = 7 200, ne sont pas filmés) | idem |

`comparaison-films.mp4` montre les deux films côte à côte (804×844, 25 i/s, 15,8 s, Android à gauche). Chaque film est calé
sur le premier défilement détecté dans l'image, pas sur l'horloge de Playwright : image 62 (2,44 s) pour Android, image 63
(2,48 s) pour l'iPhone. Le seuil d'écart de gris est de 4 ; la médiane juste avant est de 0,31 et 0,36 (`planches.json`).

`comparaison-arrets.jpg` reprend les captures d'arrêt où une animation liée au défilement est en cours sur Android (y = 400,
2 400 et 4 400), plus y = 0, avec Android en haut et l'iPhone au même y en bas.

## Limites

- **« iPhone » veut dire ici Chromium avec un UA d'iPhone, sans animations liées au défilement.** Ce n'est pas WebKit :
  rendu, polices, décodage AVIF et comportement de la barre d'adresse ne sont pas ceux de Safari. Ce profil mesure ce que le
  CSS et le JS de la démo font quand `view()` et `scroll()` ne sont pas pris en charge, rien de plus.
- **Pas de carte graphique** : l'énergie du héros (rotation, projecteur en `mix-blend-mode`) est celle du rendu logiciel.
- **Arrêts à 400 px** : ils attrapent au plus 1 à 2 états intermédiaires par geste. Le balayage fin (40 px) et le film
  donnent la continuité.
- **Geste des rails** : `scrollBy` horizontal, pas un vrai glissé tactile. La jauge suit la position du rail, ce qui suffit à
  la mesurer, mais l'inertie du doigt n'est pas simulée.
- **Film** : `scrollTo` à chaque image, pas un défilement tactile. Les images vidéo sont celles de `recordVideo`, à 25 i/s.

## Rejouer

Depuis la racine du dépôt, dans cet ordre :

```
node public/sites-demo/generer.mjs lestraque --sortie=.orchestre/travail/024-01/moteurs/www/sites-demo/lestraque
node .orchestre/preuves/024-01/diagnostic/copie-vs-en-ligne.mjs
node .orchestre/preuves/024-01/diagnostic/sonde-supports.mjs
node .orchestre/preuves/024-01/diagnostic/sonde-supports2.mjs
node .orchestre/preuves/024-01/diagnostic/moteurs.mjs --profils=android,iphone,iphone-litteral
node .orchestre/preuves/024-01/diagnostic/resumer.mjs
node .orchestre/preuves/024-01/diagnostic/planches.mjs
node .orchestre/preuves/024-01/diagnostic/sonde-etats.mjs
```

`copie-vs-en-ligne.mjs` lit la copie à `.orchestre/travail/024-01/moteurs/www`. `moteurs.mjs` en tire `www-iphone` et
`www-iphone-litteral`, et `sonde-etats.mjs` lit `www-iphone`. Le dossier `.orchestre/travail/024-01/moteurs` a été supprimé à
la fin de la tâche.

## Fichiers

- `moteurs.mjs`, `resumer.mjs`, `planches.mjs`, `sonde-etats.mjs`, `sonde-supports.mjs`, `sonde-supports2.mjs`,
  `copie-vs-en-ligne.mjs` : les scripts.
- `android/`, `iphone/`, `iphone-litteral/` : `mesures.json` (inventaire complet par arrêt, balayage, rails, films),
  `arrets/NN-yYYYYY.jpg` (20 captures par profil), `rail-*-avant.jpg` et `rail-*-apres.jpg`, et les films (Android et iPhone).
- `resume.json` et `resume-tableaux.md` : les tableaux complets par section et par profil, iphone-litteral compris.
- `sonde-etats.json`, `planches.json`, `copie-vs-en-ligne.json`, `sonde-supports.txt`, `execution.log`, `bilan-execution.json`.
- `comparaison-arrets.jpg`, `comparaison-films.mp4`.
