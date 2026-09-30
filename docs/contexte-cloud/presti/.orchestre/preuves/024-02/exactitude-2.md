# 024-02 — kit Figma : vérification adverse n° 2 (exactitude et compatibilité Figma)

Date : 2026-09-16, de 23 h 20 à 23 h 50. Vérificateur indépendant. `lestraque/`, `_kit/`, `generer.mjs` et le kit n'ont été que lus. Empreintes avant et après : les fichiers protégés (166) et le kit (12 fichiers) sont identiques. Seules écritures : une copie de Lestraque et les scripts de contrôle dans `.orchestre/travail/kit-figma/exactitude-2/`, plus ce fichier.

**Verdict : NON CONFIRMÉ.**
- La reprise 1 a corrigé une bonne partie de la n° 1 : textes des sections fidèles au site, J4 avec contexte, grain, grain-mode et motif présents, banc d'essai de 24 cellules, LISEZMOI à jour.
- Tirage : 13 valeurs sur 15 sont exactes. Les 2 autres ont une origine ou une condition incomplète.
- Hors tirage : 4 défauts d'exactitude.
- Les pages enfreignent encore 10 règles de `html-to-design.md` : R2, R6, R12, R14, R16, R17, R19, R21, R24 et R26.
- Les commandes du LISEZMOI marchent telles qu'écrites. Les adresses de production répondent 404, ce que le LISEZMOI annonce.

Scripts et sorties, rejouables : `.orchestre/travail/kit-figma/exactitude-2/`
- `tirage.mjs` (graine `464dc814`) → `tirage.json` ;
- `scan-2.mjs` → `scan-2.json`, `scan-2.log` ;
- `details.mjs` → `details.txt` ;
- `annexe.mjs` → `annexe-violations.txt` (recopié au §6) ;
- `specimens-2.mjs` → `specimens-2.txt` ;
- `origines-specimens.mjs` et `sonde-h1.mjs` → `sonde-h1.txt` ;
- `conditions-da.mjs` et `cles-da.cjs` → `cles-da.txt` ;
- `litteraux.mjs` → `litteraux.txt` ;
- `credits.mjs` → `credits.txt` ;
- `glyphes.mjs` → `glyphes.txt` ;
- `sonde-nav-images.mjs` ;
- `barre-defilement.mjs` → `barre-defilement.txt` ;
- journaux des commandes : `kit-figma-passage.log`, `generer.log`, `site-qa.log`, `deploiement-etat.log` ;
- empreintes : `empreintes-avant/apres.txt` (kit, sha256), `proteges-avant/apres.txt` (sha1).

---

## 1. Tirage de 15 valeurs, vérifiées à leur origine

Plan du tirage : 2 couleurs, 1 couleur littérale, 1 taille déclarée, 1 taille mesurée, 2 espacements, 1 section, 2 champs, 2 variantes, 1 effet, 1 condition de famille et 1 commande. Chaque valeur est tirée au hasard dans sa catégorie de `kit.json` (`node tirage.mjs 464dc814`).

| n° | Valeur du kit | Origine citée | Ce qu'on lit à l'origine | Verdict |
|---|---|---|---|---|
| 1 | electricien `--accent` #E8B93B | `_kit/da.json:4` | `"accent": "#E8B93B"` | exact |
| 2 | generique `--encre-2` #4E5A68 | `_kit/da.json:14` | `"encre2": "#4E5A68"` | exact |
| 3 | littéral #14110E, n = 13, 12 lignes | `kit.css:352, 468, 480, 488, 570, 672, 682, 795`, `eclate.bureau.css:57, 105`, `eclate.css:9, 19` | recompté (`litteraux.mjs`) : 13 occurrences en propriété sur ces 12 lignes. `kit.css:516` (commentaire) et la variable `--fond` de `:468` sont bien exclues | exact |
| 4 | `.nav__liens a` : .95rem, graisse 500 | `_kit/kit.css:42` | `.nav__liens a{position:relative;font-size:.95rem;font-weight:500}` | exact |
| 5 | ligne display du h1 : 204,48/179,942 px à 1440, 117/95,94 px à 390 | `kit.css:327, 328, 935` | les valeurs sont justes : 14.2vw (`:328`), max(30vw,112px) (`:935`), mesurées identiques sur le site. **L'interligne à 390 vient de `kit.css:440`** (`line-height:.82`), qui n'est pas cité. Avec `:327` seul, on aurait .88, soit 102,96 px (`sonde-h1.txt`) | **origine incomplète (X1)** |
| 6 | `clamp(1rem,1.6vw,1.75rem)` column-gap : 1440 → 23 px, 390 → sans objet | `kit.css:161` (≥ 900), `:609` (≥ 768) | contexte affiché dans J4 ; 1.6vw × 1440 = 23,04 | exact |
| 7 | `clamp(1.1rem,2.2vw,2rem)` gap : 31,68 / 17,6 px | `kit.css:324` | `.hero--plein .hero__contenu{…gap:clamp(1.1rem,2.2vw,2rem)}` | exact |
| 8 | section 09 contact : `bande(intro, infos, rel, cible, fond)`, racine `section.contact.contact--photo.contact--matiere#contact` | `generer.mjs:611`, `lestraque/index.html:42` | `const bande = (intro, infos, rel, cible, fond = null) =>` ; la racine est bien à la ligne 42 | exact |
| 9 | champ « communes : h2 + intro (les h3 ne sont pas imprimés) » | `contenu.json:91`, `generer.mjs:573` | `"h2": "Autour de Rennes"`. `communesScene` imprime `s.h2` et `intro`, et la liste vient de `site.communes` (`generer.mjs:411`), pas des h3 | exact |
| 10 | « attributions.json → légende de la photo (.atelier__legende) » | `attributions.json:706`, `generer.mjs:553` | `<p class="atelier__legende">${esc(a.legende)}</p>`. La ligne 706 est `"base": "atelier-poncage"`, la clé `legende` est en 709 | exact (l'origine pointe l'entrée, pas la clé) |
| 11 | variante 05 « grille 8 + 4 puis 6 + 6, dès 768 px sans travelling » | `kit.css:742` | `@media(min-width:768px){.galerie--scene:not(.galerie--rangee) …:nth-child(1){grid-column:span 8}` ; l'accueil a bien le balisage sans `galerie--rangee` | exact |
| 12 | variante 09 « bande sans formulaire (bouton d'appel) », sans `site.devis` | `generer.mjs:623` | `formDevis` rend `''` sans `site.devis` (`:584`), donc le `return` de la ligne 623 | exact |
| 13 | effet 01 « téléphone : la cage tourne et le projecteur balaie », condition « @media (max-width:767px) and (min-height:560px) and (prefers-reduced-motion:no-preference) · sous html.js » | `familles/telephone.css:23` | sélecteur `html.js.da--signature .ouverture>.hero--plein:not(.hero--commune) .hero__media img` : **la condition omet `.da--signature`** (`da.signature`, `generer.mjs:437`) | **condition incomplète (X2)** |
| 14 | famille video, « téléphone, mouvement réduit, sans JavaScript : aucun élément, aucune requête, la photo reste » | `familles/video.js:3` | « Ailleurs (téléphone, tablette, mouvement réduit, sans JavaScript), aucun élément ni aucune requête : la photo et sa dérive restent » | exact (abrégé : la tablette est couverte par la ligne « bureau, au moins 1024 px ») |
| 15 | `python scripts/polices-fraunces-statiques.py`, « si da.displayStatiques » | `scripts/polices-fraunces-statiques.py:10` | ligne d'usage identique | exact (remarque : le script ne traite que Fraunces, `:19-22`, et la note ne le dit pas) |

**Hors tirage, vérifié et exact :**
- les 24 spécimens de J3, mesurés sur le site servi en local au profil du kit (mouvement réduit, souris à 1440, toucher à 390) : **24/24 identiques aux deux largeurs**, en taille, interligne, approche, graisse et famille (`specimens-2.txt`). L'E1 de la n° 1 est corrigée ;
- les 7 couleurs littérales : nombres et lignes recomptés (`litteraux.txt`) ;
- les 12 DA : 7 couleurs, rayon, polices, héros, texture, grain, grainMode, motif, approche, ombre, graisse, casse et graisse de marque, comparés à `da.json` et aux valeurs par défaut de `generer.mjs:360` : **0 écart**. L'E3 de la n° 1 est corrigée ;
- les « À savoir » du LISEZMOI : `generer.mjs:7, 140, 406, 433, 445, 590, 690, 755-756, 876`, `recit.mjs:7`, `eclate.mjs:10-34`, `video.mjs:6`, `site-qa.mjs:197, 226`, `site-deposer.mjs:2`. Aucun fichier de `app/` ni de `lib/` n'appelle `generer.mjs`. L'E4 de la n° 1 est corrigée ;
- les cellules du banc contre leur origine : `kit.css:51, 125, 128, 203-206, 250, 255-256, 281, 544, 552, 563, 566, 574, 713, 875, 900-901, 994, 1185`, `eclate.css:24-25` et `polices-fraunces-statiques.py:25`. Valeurs reprises, vw et svh résolus justes (3.5vw = 50,4 px, 10.5svh = 94,5 px, 80vw = 312 px) ;
- les crédits photo : 74 photos affichées (img et background-image, 3 pages, 2 largeurs), chacune avec l'auteur et la licence de `attributions.json` dans son cadre. L'éclaté cite `eclate/attributions.json` (`credits.txt`) ;
- polices : aucun caractère rendu en IBM Plex Sans hors de `couverture.json` (`glyphes.txt`).

## 2. Présence des DA et des sections

- **DA** : les 12 entrées de `_kit/da.json` sont dans `kit.json › jetons.directions` et dans J1, J2 et J5 : plombier, electricien, chauffagiste, macon, menuisier, lestraque, peintre, carreleur, couvreur, serrurier, paysagiste, generique.
- **Sections de l'accueil** : les 11 racines de `lestraque/index.html` sont dans `accueil.sections` (00 à 10) et dans `sections.html`. On y compte 17 cadres : 00 à 10, plus 03b, 03c, 05c, 07c, 08b et 09b. Les 11 racines sont : `header.nav`, `section.hero.hero--plein`, `section.plateau`, `#prestations`, `#atelier`, `#realisations`, `#communes`, `#etapes`, `#questions`, `#contact`, `footer.pied`.

## 3. Défauts d'exactitude

**X1 — mineur : les origines de J3 sont incomplètes.** Les 24 valeurs sont justes, mais la règle qui fixe l'interligne n'est pas citée dans 7 cas :

| Spécimen | Largeur | Règle non citée |
|---|---|---|
| Ligne display du h1 (tirage n° 5) | 390 | `kit.css:440` `.hero--plein:not(.hero--commune) h1{…line-height:.82}` |
| Signature, Légende en capitales, Surtitre, Libellé de champ | 1440 et 390 | `kit.css:7` `body{…line-height:1.6}` (interligne hérité) |
| Titre du pied | 1440 | `kit.css:7` |
| Titre du pied | 390 | `kit.css:828` `.pied{…line-height:1.5}` |

**X2 — moyen : les conditions d'effets taisent la classe de DA qui les allume.** Les conditions ne retiennent que `html.js` et les `@media`. `conditions-da.mjs` a relevé 4 cas :
- `familles/telephone.css:23` exige `.da--signature` (tirage n° 13) ;
- `kit.css:306`, « le nom et la flèche glissent au survol », exige `.da--communes`. La condition dit « (aucune condition CSS : partout) » ;
- `kit.css:1118`, « étapes épinglées », exige `.da--etapes` ;
- `kit.css:779`, « rail aimanté de cartes, sous 760 px », exige `.da--etapes`.

À la main, 3 effets de plus : les moments signature `kit.css:1172`, `:1185` et `:1199` exigent `html.js.da--signature` et `.ouverture>`, mais leur condition ne le dit pas. Leur nom contient seulement « moment signature ».

Conséquence : une DA de client sans `signature: true` ne recevra aucun des 4 effets signature, et le kit ne le dit nulle part.

**X3 — moyen : des champs de DA lus par le générateur sont absents du kit** (`cles-da.txt` : 0 mention dans `kit.json`, `index.html` et `sections.html`) :

| Champ | Lu par | Effet |
|---|---|---|
| `da.signature` | `generer.mjs:437`, `:654` | classe `da--signature` ; valeur par défaut du relief |
| `da.navRetenue` | `generer.mjs:437` | classe `da--nav-retenue` : burger masqué et « Devis » retenu dès 960 px. La variante `nav--retenue` est décrite, pas le champ qui l'active |
| `da.etapesPhoto` | `generer.mjs:528` | photo des étapes quand aucune famille ne remplit `etapesMedia` |
| `da.photosCommunes` | `generer.mjs:743` | photo en tête des pages communes (A1) |
| `da.displayPrecharge` | `generer.mjs:334` | graisses de titre préchargées |
| `da.sansAlt` | `generer.mjs:498` | pas de `section--alt` |

**X4 — moyen : le jeton `--graisse-ligne` n'a pas de valeur pour 11 DA sur 12.** `generer.mjs:360` écrit `--graisse-ligne:${da.graisseLigne || da.graisse || 700}` dans `:root`. Pourtant `kit.json › directions[].graisseLigne` vaut `null` partout sauf pour lestraque (300). Les valeurs réelles manquent :
- 700 : plombier, electricien, macon, carreleur, couvreur, serrurier, paysagiste, generique ;
- 500 : chauffagiste, menuisier ;
- 400 : peintre.

Ce jeton règle la graisse des lignes display : h1 plein, titres d'atelier, compteurs (`var(--graisse-ligne,300)`). C'est le même type de défaut que l'E3 de la n° 1.

Remarques, sans défaut :
- la cellule 06 du banc teste `.da--raccords .section--sombre` (`kit.css:281`), mais aucune DA de `da.json` n'a la clé `raccords` : la règle n'est rendue nulle part ;
- J3 donne les valeurs du profil figé, c'est-à-dire mouvement réduit. Avec le mouvement permis, 2 spécimens changent à 1440 : `.galerie__credits` passe à 11,84/17,17 px et `.etape__num` à 108/86,4 px. J3 dit « état figé » sans dire « mouvement réduit » ;
- le contrôle « 0 opacité 0 » du script ignore les pseudo-éléments (voir R6 ci-dessous).

## 4. Pages du kit contre `html-to-design.md` §7

**Méthode** (`scan-2.mjs`) :
- les pages sont servies en local et ouvertes dans Chromium : `index.html` et `sections.html` à 1440×900 puis 390×844, `banc-essai-1440.html` à 1440×900 ;
- chaque feuille est analysée : règle, contexte et ligne ;
- chaque règle est évaluée dans la page (`matchMedia`, `CSS.supports`, sélecteur qui touche au moins un élément) ;
- les styles calculés de chaque élément affiché et de ses `::before`/`::after` sont relevés.

Le **calculé** fait foi pour le rendu. La liste des déclarations actives est au §6. Pour le banc, seules comptent les violations hors de la cellule qui teste exprès ce point.

| Règle | Violation | Où (sélecteur, fichier:ligne, cadre) |
|---|---|---|
| **R2 largeur verrouillée** | aucune page `-1440`/`-390` pour l'index et les sections : les deux sont responsives (`<meta name="viewport" content="width=device-width">`) et importées aux deux largeurs. `sections.html` l'écrit : « Les media queries du site s'appliquent à la largeur d'import » | `index.html`, `sections.html` |
| R2 | `banc-essai-1440.html` n'a ni `html,body{width:1440px}` ni viewport fixe | `banc-essai.css`, `planche.css` |
| R2, conséquence mesurée | dans Chromium avec une barre de défilement classique, les 3 pages font **1425 px** de large au lieu de 1440, alors que les `vw` restent calculés sur 1440 (`barre-defilement.txt`). C'est le décalage que note `_kit/kit.css:883-885` | les 3 pages |
| R2 @media sur la largeur | 257 déclarations distinctes actives ; 36 à 390 dans l'index | `planche.css:94-136` (`.k-cadre`, `.k-h1`, `.k-grille`, `.k-specimen__rendu`, `.k-barre`…) ; `sections/site.css` (`.galerie` :161, `.scene--presta .presta` :439…) ; `sections/gel.css:5, 16-23, 35, 41-43, 68, 72-80` |
| R2 attribut `media` | `sections/bureau.css` chargé avec `media="(min-width: 1024px)"` (12 règles actives à 1440) | `sections.html` |
| R2 vw/vh/svh/dvh | 145 déclarations distinctes actives | ex. `site.css:23` `h1{font-size:clamp(2.6rem,6.4vw,5.6rem)}`, `gel.css:41` `grid-template-columns:80vw`, `gel.css:72` `translateX(1.2vw)` |
| R2 clamp/min/max liés à la fenêtre | 94 déclarations distinctes actives | ex. `site.css:30` `.section{padding-block:clamp(4rem,9vw,8rem)}`, `bureau.css:36` `width:min(24vw,26rem)` |
| R2 container query | `container-type:inline-size` et `cqi` actifs à 1440 (noms de communes à 74,88 px) | `site.css:706` `.da--communes #communes.scene--communes .communes` |
| **R6 aucun état à opacity:0** | couches `::before`/`::after` de la nav à opacité 0, 1440 × 78 px chacune. Le script ne contrôle pas les pseudo-éléments | `header.nav.nav--bande::before/::after`, cadres 00 et 01, aux deux largeurs (`site.css:754`) |
| **R12 pseudo-éléments porteurs de sens** | « + » de la FAQ en `::after` : c'est l'exemple même de la règle | `.faq summary::after` (`site.css` ← `kit.css:203`), cadres 08 et 08b |
| R12 | numéros de la légende de l'éclaté en `counter()` | `.eclate__legende li::before` (← `eclate.css:25`), cadres 07 et 07c |
| R12 | voiles de lisibilité du texte clair sur photo | `.hero__media::after` (cadre 01), `.atelier__media::after` (04), `.contact__media::after` (09, 09b) |
| R12 | tiret des surtitres ; soulignés de la nav | `span.mono::before` (cadre 07) ; `.nav__liens a::after` (cadres 00 et 01, à 1440) |
| **R14 color-mix()** | calculé : `color(srgb 0.957 0.929 0.886 / 0.84)` sur la couche de bande de la nav. `gel.css:32` ne remplace que `.k-etat>.nav.solide` | `.nav.nav--bande::before{background:color-mix(in srgb,var(--fond) 84%,transparent)}` `site.css:754`, cadres 00 et 01 |
| **R16 liens** | 62 `<a href>` (sans effet si « Add hyperlinks » reste décoché) | `sections.html`, balisage du site |
| **R17 images** | 11 `<picture>` affichées à 1440 et 27 à 390, toutes avec `<source>` à `media` et `sizes` en vw/vh (ex. `sizes="(max-aspect-ratio: 4/5) 80vh, 100vw"`) : le fichier retenu dépend de la fenêtre de capture | cadres 01 à 09b |
| R17 | `<img>` du héros sans `loading` ni `decoding` | `#cadre-01-heros img` (`heros-escalier-1600.webp` / `-portrait-720.webp`) |
| R17 | fichier à ≈ 1 fois la taille affichée au lieu de ≈ 2 fois. À 1440 : héros, atelier, contact (1440/1440), plateau 1,05, bibliothèque 0,94, penderie et escalier 1,27. À 390 : 23 images à 1,00 | cadres 01, 02, 03, 03c, 04, 05, 05c, 08, 08b, 09, 09b |
| R17 | 10 `<img>` AVIF dans le DOM (masquées, en `loading="eager"`) | `.eclate__calque` ×8 et `.eclate__assemble` ×2 (cadres 07 et 07c) |
| R17 | 8 photos en `background-image` | `index.html` J6, `p.k-forme__texte` (`heros-escalier-480.webp`) |
| R17 | photo de 960 px affichée à 1296 px (agrandie 1,35 fois), hors du sujet des cellules | `banc-essai-1440.html`, cellules 04 et 10 (`heros-escalier-960.webp`) |
| **R19 SVG** | 11 SVG en `currentColor` à 1440 et 13 à 390 | monogramme `svg.marque` (cadres 00, 01, 10), flèches `FLECHE` de `generer.mjs:31` en `stroke="currentColor"` (01, 06, 09) ; banc, cellule 08 |
| **R21 graisses** | fichiers statiques au nom interne « Regular » pour 300 et 600, alors que le banc n'est pas passé. La règle dit : en cas de doute, fichiers variables | `polices.css:3-7`, `sections/site.css:4-8` |
| **R24 structure** | deux niveaux d'enveloppe (`article.k-cadre > div.k-scene > section`) ; cinq au cadre 00 (`article > .k-scene > .k-etats > .k-etat-bloc > .k-etat > header.nav`) | `sections.html`, 17 cadres |
| R24 | `display:contents` calculé : 5 à 1440, 11 à 390 | `span.eclate__ligne` (07, 07c), `div.plateau__haut` (02, à 390) |
| R24 | calques `position:absolute` superposés : 13 à 1440, 19 à 390 | nav posée sur le héros `gel.css:12`, `.voile` `gel.css:27`, `.hero__media`, `.atelier__media`, `.contact__media`, `img.eclate__eclate`, `.eclate__pastille`, `.presta__vignette.est-ouverte` (03b), `picture` (08) |
| **R26 formulaire** | champs vides sans texte indicatif | `textarea#devis-message`, `input#devis-contact` (et `select#devis-projet` sur l'option vide), cadre 09 |

**Règles respectées, vérifiées :**
- R3 et R4 : 3 URL, 5 imports, dans le budget.
- R5 : témoin de fin sur les 3 pages.
- R6 : aucun script dans l'index et les sections (le banc en a un, exprès, cellule 21) ; `animation:none` et `transition:none` ; 0 animation calculée.
- R7 : états côte à côte ; les états sans objet à une largeur portent une note.
- R8 : aucune requête `prefers-*` active.
- R9 : `scroll-timeline` et `animation-timeline` restent inertes ; aucun `content-visibility:auto` hors du banc.
- R10 : 0 fixed ou sticky calculé dans l'index et les sections. Les déclarations `site.css:38`, `:72`, `:157`, `:313` et `:532` sont écrasées.
- R11 : rails rognés annotés (cadres 03, 05, 07), plus leurs versions dépliées (03c, 05c, 07c).
- R13 : backdrop-filter de la nav (`blur(14px)`, `blur(16px)`) et croix du burger (±45°, à 390) gardés en px. Conforme en attendant les cellules 04 et 08 du banc.
- R15, R18 (0 vidéo, 0 canvas), R20 (`font-display:block`, preload avec `crossorigin`), R22, R25.
- `noindex` sur les 3 pages ; 0 ressource externe ; aucun lien vers le kit depuis `app/`, `lib/`, `lestraque/` ou `_kit/`.
- §8 : le banc couvre les 18 points prévus, en 24 cellules.

## 5. `kit/LISEZMOI.md` : les commandes telles qu'écrites

| Commande ou affirmation | Résultat | Verdict |
|---|---|---|
| `node scripts/kit-figma.mjs` | exit 0 en 48 s ; 12 fichiers « identique » ; sha256 du dossier identiques avant et après | marche |
| https://prestiapp.fr/sites-demo/kit/banc-essai-1440.html, index.html, sections.html (et LISEZMOI.md) | **404** : `public/sites-demo/kit/` et `scripts/kit-figma.mjs` ne sont pas suivis par git (`??`). `/sites-demo/kit/` → 308 vers `/sites-demo/kit`, comme annoncé | le LISEZMOI le dit (« tant que ce n'est pas fait, les adresses répondent 404 ») ; **import impossible aujourd'hui** |
| `node public/sites-demo/generer.mjs <site> --sortie=<dossier>` (lestraque) | exit 0 en 3 s : « 7 pages, 12 photos (5 auteurs) » | marche |
| `node scripts/site-qa.mjs <dossier> --statique` | exit 1 : « 8 sans attribution » et « 6 sans alt » | rouge, comme le LISEZMOI l'annonce (`site-qa.mjs:197`, `:226`) |
| `node scripts/site-deposer.mjs <commande_id> <dossier>` | non lancé (dépôt en production). L'usage correspond à `site-deposer.mjs:5`. Il refuserait tant que site-qa est rouge | conforme à ce qui est écrit |
| `node scripts/deploiement-etat.mjs` | exit 0, « la production est à jour (c6a0d5b) » | marche |
| « la plus longue page fait moins de 59 000 px » | `index.html` à 390 : 58 208 px | exact |
| « 24 cellules », « 17 cadres », « ce kit en demande 5 », « 1,5 Mo au plus » | 24, 17, 5 et 911 460 octets | exact |
| « le script refuse un cadre dont une photo n'a pas son crédit » | 74 photos affichées, 0 sans crédit | exact |

## 6. Liste des défauts

1. **X1 (mineur)** : 7 origines d'interligne manquent dans J3 : `kit.css:440`, `kit.css:7` (×5) et `kit.css:828`. Tirage n° 5.
2. **X2 (moyen)** : les conditions d'effets taisent `.da--signature`, `.da--communes` et `.da--etapes`. Tirage n° 13, plus `kit.css:306, 779, 1118, 1172, 1185, 1199`.
3. **X3 (moyen)** : `da.signature`, `da.navRetenue`, `da.etapesPhoto`, `da.photosCommunes`, `da.displayPrecharge` et `da.sansAlt` sont lus par `generer.mjs` mais absents du kit.
4. **X4 (moyen)** : `--graisse-ligne` est `null` pour 11 DA, alors que `generer.mjs:360` l'écrit (700, 500 ou 400).
5. **F1 (majeur)** : R2. Aucune page à largeur verrouillée, @media, vw, clamp et cqi actifs, `media=` sur une feuille. Le banc `-1440` n'est pas verrouillé non plus. Avec une barre de défilement classique, les pages font 1425 px.
6. **F2 (moyen)** : R12. « + » de la FAQ, numéros de l'éclaté, voiles et tirets restent en pseudo-éléments.
7. **F3 (moyen)** : R17. `<picture>`, `<source>` et `sizes` selon la fenêtre, héros sans `loading`/`decoding`, résolution ≈ 1 fois, AVIF dans le DOM, photos en `background-image` dans J6, photo agrandie dans le banc.
8. **F4 (moyen)** : R19. 11 à 13 SVG en `currentColor`.
9. **F5 (moyen)** : R21. Fichiers statiques « Regular » utilisés avant le banc.
10. **F6 (mineur)** : R14 et R6. `color-mix()` calculé et couches à opacité 0 sur `.nav--bande::before/::after` (`site.css:754`).
11. **F7 (mineur)** : R24. Deux à cinq niveaux d'enveloppe, `display:contents`, calques absolus.
12. **F8 (mineur)** : R26. `textarea#devis-message` et `input#devis-contact` vides, sans texte indicatif.
13. **F9 (mineur)** : R16. 62 liens dans `sections.html`.
14. **C1 (état, bloquant pour l'import)** : les adresses du kit répondent 404 ; le kit n'est pas poussé. Le LISEZMOI le dit.

---

## Annexe — déclarations actives contraires aux règles, par règle

Contexte vrai (`@media`, `@supports`, attribut `media`) et sélecteur qui touche au moins un élément, avant la cascade. Largeurs où c'est vrai. Pour le banc, la plupart des lignes sont le sujet même d'une cellule. Sortie de `annexe.mjs` :

#### R10 position fixed/sticky — 7 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:86 | `.b-colle` | `position:sticky` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:89 | `.b-fixe` | `position:fixed` | 1440 |
| sections.html | kit/sections/site.css:38 | `.nav` | `position:fixed` | 1440, 390 |
| sections.html | kit/sections/site.css:72 | `.panneau` | `position:fixed` | 1440, 390 |
| sections.html | kit/sections/site.css:157 | `.etapes__tete` | `position:sticky` | 1440 |
| sections.html | kit/sections/site.css:313 | `.voile` | `position:fixed` | 1440, 390 |
| sections.html | kit/sections/site.css:532 | `.faq-scene__tete` | `position:sticky` | 1440 |

#### R13 backdrop-filter — 6 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:22 | `.b-pilule` | `-webkit-backdrop-filter:blur(16px)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:22 | `.b-pilule` | `backdrop-filter:blur(16px)` | 1440 |
| sections.html | kit/sections/site.css:51 | `.nav.solide` | `backdrop-filter:blur(14px)` | 1440, 390 |
| sections.html | kit/sections/site.css:51 | `.nav.solide` | `-webkit-backdrop-filter:blur(14px)` | 1440, 390 |
| sections.html | kit/sections/site.css:761 | `.nav--claire:not(.solide) .nav__liens` | `-webkit-backdrop-filter:blur(16px)` | 1440 |
| sections.html | kit/sections/site.css:761 | `.nav--claire:not(.solide) .nav__liens` | `backdrop-filter:blur(16px)` | 1440 |

#### R13 clip-path — 10 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:28 | `.b-polygone` | `clip-path:polygon(0 50.4px,100% 0,100% calc(100% - 50.4px),0 100%)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:29 | `.b-inset-ouvert` | `clip-path:inset(0)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:30 | `.b-inset-ferme` | `clip-path:inset(50% 0 50% 0)` | 1440 |
| sections.html | kit/sections/bureau.css:36 | `.scene--presta.scene--survol .presta__vignette` | `clip-path:inset(50% 0 50% 0)` | 1440 |
| sections.html | kit/sections/bureau.css:38 | `.scene--presta.scene--survol .presta__vignette.est-ouverte` | `clip-path:inset(0)` | 1440 |
| sections.html | kit/sections/gel.css:74 | `.presta__ligne.k-survol .presta__vignette` | `clip-path:inset(0)` | 1440 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `clip-path:inset(50% 0 50% 0)` | 1440 |
| sections.html | kit/sections/site.css:434 | `.presta__ligne:hover .presta__vignette` | `clip-path:inset(0)` | 1440 |
| sections.html | kit/sections/site.css:754 | `.nav.nav--bande::before` | `clip-path:inset(var(--nav-ch,0px) 0 var(--nav-cb,0px) 0)` | 1440, 390 |
| sections.html | kit/sections/site.css:755 | `.nav.nav--bande::after` | `clip-path:inset(var(--nav-sh,100%) 0 var(--nav-sb,0px) 0)` | 1440, 390 |

#### R13 mask — 2 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:32 | `.b-masque` | `-webkit-mask:radial-gradient(closest-side,transparent 5%,#000 17%,#000 72%,transparent 100%)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:32 | `.b-masque` | `mask:radial-gradient(closest-side,transparent 5%,#000 17%,#000 72%,transparent 100%)` | 1440 |

#### R13 mix-blend-mode — 1 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:25 | `.b-grain-avant::before,.b-grain-couche` | `mix-blend-mode:multiply` | 1440 |

#### R13 rotation — 10 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:20 | `.b-plus-ouvert::after,.b-plus.b-plus-ouvert` | `transform:rotate(45deg)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:36 | `.b-cercle--tourne` | `transform:rotate(45deg)` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:37 | `.b-penche` | `rotate:-3deg` | 1440 |
| sections.html | kit/sections/bureau.css:36 | `.scene--presta.scene--survol .presta__vignette` | `rotate:calc(var(--sr,0) * 1deg)` | 1440 |
| sections.html | kit/sections/site.css:70 | `.burger[aria-expanded=true] span:first-child` | `transform:translateY(3.5px) rotate(45deg)` | 1440, 390 |
| sections.html | kit/sections/site.css:71 | `.burger[aria-expanded=true] span:last-child` | `transform:translateY(-3.5px) rotate(-45deg)` | 1440, 390 |
| sections.html | kit/sections/site.css:121 | `.bouton:hover .bouton__cercle` | `transform:rotate(45deg)` | 1440, 390 |
| sections.html | kit/sections/site.css:185 | `.faq details[open] summary::after` | `transform:rotate(45deg)` | 1440, 390 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `rotate:-3deg` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `rotate:-2deg` | 1440 |

#### R14 color-mix() — 3 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:40 | `.b-couleur--mix` | `background:color-mix(in srgb,#F4EDE2 84%,transparent)` | 1440 |
| sections.html | kit/sections/site.css:51 | `.nav.solide` | `background:color-mix(in srgb,var(--fond) 84%,transparent)` | 1440, 390 |
| sections.html | kit/sections/site.css:754 | `.nav.nav--bande::before` | `background:color-mix(in srgb,var(--fond) 84%,transparent)` | 1440, 390 |

#### R17 image de fond (pas un <img>) — 1 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:25 | `.b-grain-avant::before,.b-grain-couche` | `background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'` | 1440 |

#### R2 @media sur la largeur — 257 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| index.html | kit/planche.css:95 | `.k-cadre` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:99 | `.k-fin` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:100 | `.k-h1` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:101 | `.k-h2` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:102 | `.k-lead` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:105 | `.k-fin__texte` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:106 | `.k-grille,.k-sommaire,.k-cartes,.k-paires` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:107 | `.k-page-ligne,.k-bande,.k-specimen` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:108 | `.k-rangee,.k-rangee--5` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:109 | `.k-rangee--tete` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:110 | `.k-page--index .k-item__texte` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:111 | `.k-page--index .k-item__cond` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:112 | `.k-page--index .k-orig` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:113 | `.k-page--index .k-grille` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:114 | `.k-nuancier` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:115 | `.k-pastille__couleur` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:116 | `.k-formes` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:117 | `.k-forme__rayon,.k-forme__ombre,.k-forme__texte` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:118 | `.k-courbe` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:119 | `.k-specimen` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:120 | `.k-bande__fond` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:121 | `.k-carte` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:122 | `.k-da` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:123 | `.k-sans-objet` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:124 | `.k-bureau-seul` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:125 | `.k-page--index .k-sans-objet.k-tel-seul` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:126 | `.k-da .k-puces,.k-bande__detail .k-grille` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:127 | `.k-da .k-puce` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:128 | `.k-bande__fond img` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:129 | `.k-bande__detail` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:130 | `.k-paire` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:131 | `.k-paire__display` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:132 | `.k-specimen__rendu` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:133 | `.k-barre` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:134 | `.k-etape` | `@media(max-width:767px)` | 390 |
| index.html | kit/planche.css:135 | `.k-etape__num` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:95 | `.k-cadre` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:96 | `.k-cadre--site` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:97 | `.k-etiquette` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:98 | `.k-etat-legende` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:99 | `.k-fin` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:100 | `.k-h1` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:102 | `.k-lead` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:103 | `.k-num` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:104 | `.k-titre` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:105 | `.k-fin__texte` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:106 | `.k-grille,.k-sommaire,.k-cartes,.k-paires` | `@media(max-width:767px)` | 390 |
| sections.html | kit/planche.css:123 | `.k-sans-objet` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/gel.css:5 | `:root` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/gel.css:16 | `.k-des-760` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/gel.css:17 | `.k-sous-760` | `@media(min-width:760px)` | 1440 |
| sections.html | kit/sections/gel.css:18 | `.k-des-768` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/gel.css:19 | `.k-sous-768` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/gel.css:20 | `.k-des-960` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/gel.css:21 | `.k-sous-960` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/gel.css:22 | `.k-des-1024` | `@media(max-width:1023px)` | 390 |
| sections.html | kit/sections/gel.css:23 | `.k-sous-1024` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/gel.css:35 | `.scene--presta.scene--survol .presta__vignette:not(.est-ouverte)` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/gel.css:41 | `.k-deplie .scene--presta .presta` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/gel.css:42 | `.k-deplie .scene--galerie .galerie--scene` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/gel.css:43 | `.da--etapes .k-deplie .etapes__liste` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/gel.css:68 | `:where(.k-menu-ouvert) .nav__devis` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/gel.css:72 | `.presta__ligne.k-survol h3` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/gel.css:74 | `.presta__ligne.k-survol .presta__vignette` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/gel.css:76 | `.presta__ligne.k-survol .presta__vignette img` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/gel.css:78 | `.presta__ligne.k-survol .presta__num` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/gel.css:80 | `.scene--presta .presta__ligne.k-survol .presta__num` | `@media(min-width:1024px)` | 1440 |
| sections.html | kit/sections/site.css:55 | `.nav__liens` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:55 | `.nav__tel` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:55 | `.nav__devis` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:57 | `.da--nav-retenue .nav__tel,.da--nav-retenue .burger` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:58 | `.da--nav-retenue .nav__devis` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:59 | `.da--nav-retenue .nav.nav--retenue:not(.nav--appel) .nav__devis` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:62 | `.da--nav-retenue .nav__devis,.da--nav-retenue .nav.nav--retenue:not(.nav--appel) .nav__devis` | `@media(min-width:960px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:63 | `.da--nav-retenue .nav.nav--retenue:not(.nav--appel) .nav__devis` | `@media(min-width:960px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:79 | `.panneau` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:148 | `.galerie` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:149 | `.galerie__item:nth-child(1)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:150 | `.galerie__item:nth-child(2)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:151 | `.galerie__item:nth-child(3)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:152 | `.galerie__item:nth-child(4)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:157 | `.etapes` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:157 | `.etapes__tete` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:172 | `.communes` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:202 | `.pied__grille` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:229 | `html` | `@media(min-width:0px)` | 1440, 390 |
| sections.html | kit/sections/site.css:230 | `*,*::before,*::after` | `@media(min-width:0px)` | 1440, 390 |
| sections.html | kit/sections/site.css:253 | `.da--etapes .etape` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:253 | `.da--etapes .etape__num` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:273 | `.hero--plein h1` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:273 | `.h1__ligne` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:305 | `.chiffres` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:306 | `.chiffre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:307 | `.chiffre+.chiffre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:308 | `.chiffre__valeur` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:329 | `.devis__form` | `@media(min-width:600px)` | 1440 |
| sections.html | kit/sections/site.css:329 | `.devis__champ--large,.devis__envoi` | `@media(min-width:600px)` | 1440 |
| sections.html | kit/sections/site.css:353 | `.hero--plein:not(.hero--commune) .hero__contenu` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:354 | `.hero--plein:not(.hero--commune) h1` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:355 | `.hero--plein:not(.hero--commune) .chapeau` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:356 | `.hero--plein:not(.hero--commune) .hero__media::after` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:357 | `.hero--plein:not(.hero--commune) h1` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:358 | `.hero--plein:not(.hero--commune) .hero__media img` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:369 | `.presta__ligne` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:370 | `.presta__texte` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:371 | `.presta__ligne h3` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:372 | `.presta__ligne:hover h3` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:393 | `.contact__inner` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:394 | `.contact__tete` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:394 | `.contact .devis` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:394 | `.contact__infos` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:395 | `.contact__tete h2` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:411 | `.devis__recap` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:411 | `.devis__recap div+div` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:418 | `.scene__tete--deux` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:418 | `.scene__tete--deux p` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:425 | `.scene--presta .presta__ligne` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:426 | `.scene--presta .presta__num` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:427 | `.scene--presta .presta__ligne h3` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:428 | `.scene--presta .presta__texte` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:432 | `.presta__vignette picture` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:433 | `.presta__vignette img` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:434 | `.presta__ligne:hover .presta__vignette` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:435 | `.presta__ligne:hover .presta__vignette img` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:436 | `.presta__ligne:hover .presta__num` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:440 | `.scene--presta .presta::-webkit-scrollbar` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:442 | `.scene--presta .presta__ligne` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:443 | `.scene--presta .presta__num` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:444 | `.scene--presta .presta__ligne h3` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:445 | `.scene--presta .presta__texte` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:447 | `.scene--presta .presta__jauge` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:448 | `.scene--presta .presta__jauge span` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:461 | `.atelier__titre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:486 | `.galerie--scene` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:487 | `.galerie--scene .galerie__item` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:488 | `.galerie--scene .galerie__item:nth-child(even)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:490 | `.galerie--scene .galerie__item:nth-child(1)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:491 | `.galerie--scene .galerie__item:nth-child(2)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:492 | `.galerie--scene .galerie__item:nth-child(n+3)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:493 | `.galerie--scene .galerie__item:nth-child(1) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:494 | `.galerie--scene .galerie__item:nth-child(2) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:495 | `.galerie--scene .galerie__item:nth-child(n+3) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:496 | `.scene--galerie` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:532 | `.faq-scene` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:532 | `.faq-scene__tete` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:540 | `.contact--photo .contact__inner` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:541 | `.contact--photo .contact__tete` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:542 | `.contact--photo .contact__tete .mono,.contact--photo .contact__tete h2` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:543 | `.contact--photo .contact__tete p` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:544 | `.contact--photo .contact__tete h2` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:549 | `.hero--plein:not(.hero--commune) .hero__media::after` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:550 | `.hero--plein:not(.hero--commune) .chapeau` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:551 | `.hero--plein:not(.hero--commune) h1` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:561 | `.plateau__haut` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:561 | `.plateau__photo` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:563 | `.plateau` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:564 | `.plateau__inner` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:565 | `.plateau__haut` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:566 | `.plateau__photo` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:567 | `.plateau__citation p` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:568 | `.chiffres` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:569 | `.chiffre` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:570 | `.chiffre:last-child` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:571 | `.chiffre dd` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:572 | `.chiffre dt` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:573 | `.chiffre__valeur` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:576 | `.scene--presta .presta__vignette` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:577 | `.scene--presta .presta__vignette picture,.scene--presta .presta__vignette img` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:578 | `.scene--presta .presta__vignette img` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:579 | `.scene--presta .presta__ligne` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:580 | `.scene--presta .presta__num` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:584 | `.scene--galerie .galerie--scene::-webkit-scrollbar` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:585 | `.scene--galerie .galerie--scene .galerie__item,.scene--galerie .galerie--scene .galerie__item:nth-child(even)` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:586 | `.scene--galerie` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:589 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(1)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:590 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(2)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:591 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(n+3)` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:592 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(1) .galerie__cadre,.galerie--scene:not(.galerie--rangee) ` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:593 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(2) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:614 | `.etapes__photo` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:615 | `.etapes__photo` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:617 | `#etapes` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:618 | `.da--etapes .etapes` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:619 | `.etapes__photo` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:621 | `.da--etapes .etapes__liste::-webkit-scrollbar` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:622 | `.da--etapes .etape` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:623 | `.da--etapes .etape__num` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:628 | `.faq-scene__photo` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:629 | `.faq-scene .faq summary` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:631 | `.contact__media::after` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:632 | `.contact--photo .contact__tete h2` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:635 | `.contact--photo` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:636 | `.contact--photo .contact__media img` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:637 | `.contact--photo .contact__media::after` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:638 | `.contact--photo .contact__tete` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:639 | `.contact--photo .contact__infos` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:642 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(1) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:643 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(2) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:644 | `.galerie--scene:not(.galerie--rangee) .galerie__item:nth-child(n+3) .galerie__cadre` | `@media(min-width:768px)` | 1440 |
| sections.html | kit/sections/site.css:653 | `.devis__form` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:654 | `.devis__champ:nth-child(3),.devis__champ--large,.devis__envoi` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:655 | `.devis__champ select` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:656 | `.devis__champ textarea` | `@media(max-width:599px)` | 390 |
| sections.html | kit/sections/site.css:659 | `.pied` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:660 | `.pied__grille` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:661 | `.pied__grille>div:first-child` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:662 | `.pied__grille p+p` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:663 | `.pied__titre` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:664 | `.pied ul` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:665 | `.pied ul a` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:666 | `.pied__bas` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:669 | `.da--communes #communes.scene--communes` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:670 | `.plateau__citation p` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:671 | `.faq-scene .faq summary` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:676 | `.da--etapes .etapes` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:677 | `.da--etapes .etapes__liste` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:678 | `.da--etapes .etapes__jauge` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:679 | `.da--etapes .etapes__jauge span` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:681 | `.da--communes #communes.scene--communes .commune` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:682 | `.scene--presta .presta__vignette` | `@media(max-width:759px)` | 390 |
| sections.html | kit/sections/site.css:687 | `.scene--galerie` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:688 | `.scene--galerie .galerie--scene` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:689 | `.scene--galerie .galerie__jauge` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:690 | `.scene--galerie .galerie__jauge span` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:693 | `.atelier__media::after` | `@media(max-width:767px)` | 390 |
| sections.html | kit/sections/site.css:703 | `#communes h2,.etapes__tete h2,.faq-scene__tete h2` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:706 | `.da--communes #communes.scene--communes .communes` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:707 | `.da--communes #communes.scene--communes .commune` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:708 | `.da--communes #communes.scene--communes .commune:nth-child(odd)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:709 | `.da--communes #communes.scene--communes .commune:nth-child(even)` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:717 | `.contact--photo` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:718 | `.contact--photo .contact__tete h2` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:720 | `.da--communes #communes.scene--communes .communes` | `@media(min-width:900px)` | 1440 |
| sections.html | kit/sections/site.css:723 | `.contact--photo .contact__tete` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:724 | `.contact--matiere .contact__media::after` | `@media(max-width:899px)` | 390 |
| sections.html | kit/sections/site.css:727 | `.hero--plein:not(.hero--commune) h1` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:728 | `.hero--plein:not(.hero--commune) .hero__media img` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:729 | `.hero--plein:not(.hero--commune) .hero__media::after` | `@media(max-width:767px) and (min-height:560px)` | 390 |
| sections.html | kit/sections/site.css:738 | `.faq-scene__photo` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:739 | `.faq-scene__photo` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:760 | `.nav__liens` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:761 | `.nav--claire:not(.solide) .nav__liens` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:764 | `.nav__devis` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:765 | `.nav__droite` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:773 | `.faq-scene` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:774 | `.faq-scene__tete` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:775 | `.faq-scene__droite` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:776 | `.faq-scene__photo` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:777 | `.faq-scene__photo picture` | `@media(min-width:960px)` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:788 | `.scene--presta .presta__ligne:hover .presta__num` | `@media(min-width:1024px) and (min-width:0px) and (min-width:0px)` | 1440 |
| sections.html | kit/sections/site.css:791 | `.faq-scene__photo` | `@media(max-width:959px)` | 390 |
| sections.html | kit/sections/site.css:896 | `.eclate__legende` | `@media(max-width:759px)` | 390 |

#### R2 @media sur la largeur (attribut media de la feuille) — 12 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| sections.html | kit/sections/bureau.css:34 | `.scene--presta.scene--survol ol.presta` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:35 | `.scene--presta.scene--survol .presta__ligne` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:36 | `.scene--presta.scene--survol .presta__vignette` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:37 | `.scene--presta.scene--survol .presta__vignette img` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:38 | `.scene--presta.scene--survol .presta__vignette.est-ouverte` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:39 | `.scene--presta.scene--survol .presta__vignette.est-ouverte img` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:46 | `.scene--presta.scene--survol.survol--calme ol.presta` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:47 | `.scene--presta.scene--survol.survol--calme .presta__vignette` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:48 | `.scene--presta.scene--survol.survol--calme .presta__vignette.est-ouverte` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:49 | `.scene--presta.scene--survol.survol--calme .presta__vignette img` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:50 | `.presta__declencheur` | `(min-width: 1024px)` | 1440 |
| sections.html | kit/sections/bureau.css:51 | `.presta__declencheur:focus-visible` | `(min-width: 1024px)` | 1440 |

#### R2 clamp()/min()/max() dépendant de la fenêtre — 94 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| sections.html | kit/sections/bureau.css:36 | `.scene--presta.scene--survol .presta__vignette` | `width:min(24vw,26rem)` | 1440 |
| sections.html | kit/sections/site.css:23 | `h1` | `font-size:clamp(2.6rem,6.4vw,5.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:24 | `h2` | `font-size:clamp(2rem,4.2vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:25 | `h3` | `font-size:clamp(1.2rem,1.6vw,1.45rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:30 | `.section` | `padding-block:clamp(4rem,9vw,8rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:37 | `.chapeau` | `font-size:clamp(1.1rem,1.5vw,1.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:75 | `.panneau nav a` | `font-size:clamp(1.9rem,6vw,2.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:85 | `.hero__contenu` | `padding-block:clamp(2.5rem,6vw,5rem) clamp(3rem,7vw,5.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:136 | `.galerie` | `gap:clamp(2.25rem,7vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:145 | `.galerie__credits` | `margin-top:clamp(2rem,5vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:148 | `.galerie` | `column-gap:clamp(1rem,1.6vw,1.75rem)` | 1440 |
| sections.html | kit/sections/site.css:148 | `.galerie` | `row-gap:clamp(3rem,6vw,6.5rem)` | 1440 |
| sections.html | kit/sections/site.css:152 | `.galerie__item:nth-child(4)` | `margin-top:clamp(4rem,10vw,11rem)` | 1440 |
| sections.html | kit/sections/site.css:173 | `.commune` | `font-size:clamp(1.4rem,2.6vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:181 | `.faq summary` | `font-size:clamp(1.1rem,1.7vw,1.35rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:247 | `.da--etapes .etape` | `column-gap:clamp(1.25rem,3vw,2.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:247 | `.da--etapes .etape` | `padding-block:clamp(1.25rem,2.6vw,2.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:248 | `.da--etapes .etape__num` | `font-size:clamp(7vw,6rem + 2vw,9vw)` | 1440, 390 |
| sections.html | kit/sections/site.css:251 | `.da--etapes .etape h3` | `font-size:clamp(1.45rem,2.2vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:254 | `.da--communes #communes` | `padding-block:clamp(2.5rem,3.5vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:258 | `.da--communes #communes .commune` | `gap:clamp(.75rem,2.5vw,2.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:258 | `.da--communes #communes .commune` | `font-size:clamp(7vw,4rem + 2.5vw,9vw)` | 1440, 390 |
| sections.html | kit/sections/site.css:271 | `.hero--plein .hero__contenu` | `padding:0 5vw clamp(1.5rem,3.6vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:271 | `.hero--plein .hero__contenu` | `gap:clamp(1.1rem,2.2vw,2rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:272 | `.hero--plein h1` | `gap:clamp(.7rem,1.4vw,1.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:275 | `.h1__cle` | `font-size:clamp(.78rem,.9vw,.95rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:278 | `.hero__pied` | `padding-top:clamp(1rem,1.8vw,1.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:290 | `.plateau` | `padding-block:clamp(4.5rem,10vw,9.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:291 | `.plateau__inner` | `gap:clamp(3rem,7vw,6.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:293 | `.plateau__citation p` | `font-size:clamp(2.1rem,4vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:298 | `.chiffres` | `padding-top:clamp(2rem,3.5vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:302 | `.chiffre__unite` | `font-size:clamp(1.25rem,2vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:306 | `.chiffre` | `padding-right:clamp(1rem,2vw,2rem)` | 1440 |
| sections.html | kit/sections/site.css:307 | `.chiffre+.chiffre` | `padding-left:clamp(1.25rem,2.6vw,2.75rem)` | 1440 |
| sections.html | kit/sections/site.css:311 | `.h2--scene` | `font-size:clamp(2.9rem,7.4vw,8.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:341 | `.devis__merci-titre` | `font-size:clamp(2.2rem,4vw,3.4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:354 | `.hero--plein:not(.hero--commune) h1` | `--h1-ligne:max(32.5vw,121px)` | 390 |
| sections.html | kit/sections/site.css:364 | `.presta__ligne` | `padding-block:clamp(1.35rem,2.4vw,2.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:365 | `.presta__num` | `font-size:clamp(2.4rem,5.4vw,6.2rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:366 | `.presta__ligne h3` | `font-size:clamp(1.55rem,3vw,3.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:369 | `.presta__ligne` | `column-gap:clamp(1.5rem,3vw,3.5rem)` | 1440 |
| sections.html | kit/sections/site.css:381 | `.contact` | `padding-block:clamp(3rem,8vw,8rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:382 | `.contact__inner` | `gap:clamp(1.6rem,4vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:385 | `.contact__tete h2` | `font-size:clamp(2.3rem,10vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:393 | `.contact__inner` | `column-gap:clamp(3rem,7vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:395 | `.contact__tete h2` | `font-size:clamp(3rem,5.2vw,6.5rem)` | 1440 |
| sections.html | kit/sections/site.css:398 | `.devis__merci-titre` | `font-size:clamp(2.6rem,5.4vw,5.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:404 | `.devis__recap dd` | `font-size:clamp(1.2rem,1.7vw,1.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:407 | `.devis__suite span` | `font-size:clamp(2rem,3vw,2.9rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:408 | `.devis__suite strong` | `font-size:clamp(1.2rem,1.7vw,1.55rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:412 | `.scene` | `padding-block:clamp(4rem,8vw,7.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:414 | `.scene__tete` | `margin-bottom:clamp(2rem,4vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:418 | `.scene__tete--deux` | `column-gap:clamp(2.5rem,5vw,6rem)` | 1440 |
| sections.html | kit/sections/site.css:421 | `.scene--presta` | `padding-block:clamp(3.5rem,6.5vw,6.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:425 | `.scene--presta .presta__ligne` | `padding-block:clamp(.85rem,1.45vw,1.6rem)` | 1440 |
| sections.html | kit/sections/site.css:426 | `.scene--presta .presta__num` | `font-size:clamp(3.4rem,6.2vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:427 | `.scene--presta .presta__ligne h3` | `font-size:clamp(1.9rem,3.05vw,4rem)` | 1440 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `width:min(8.5vw,10.5rem)` | 1440 |
| sections.html | kit/sections/site.css:457 | `.atelier__contenu` | `row-gap:clamp(1rem,2vw,1.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:457 | `.atelier__contenu` | `padding-block:clamp(6.5rem,calc(13 * var(--k-vh)),9rem) clamp(1.5rem,3.5vw,2.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:459 | `.atelier__phrase` | `font-size:clamp(1.35rem,2.2vw,2.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:473 | `.galerie--scene` | `gap:clamp(2.25rem,7vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:486 | `.galerie--scene` | `column-gap:clamp(1rem,1.6vw,1.75rem)` | 1440 |
| sections.html | kit/sections/site.css:486 | `.galerie--scene` | `row-gap:clamp(2rem,4vw,3.25rem)` | 1440 |
| sections.html | kit/sections/site.css:496 | `.scene--galerie` | `padding-block:clamp(3.5rem,6vw,6rem)` | 1440 |
| sections.html | kit/sections/site.css:524 | `.da--communes #communes.scene--communes` | `padding-block:clamp(2.5rem,3.4vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:525 | `.da--communes #communes.scene--communes .scene__tete` | `margin-bottom:clamp(1rem,2vw,1.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:526 | `.da--communes #communes.scene--communes .commune` | `font-size:min(clamp(7vw,4rem + 2.5vw,9vw),calc(12.4 * var(--k-vh)))` | 1440, 390 |
| sections.html | kit/sections/site.css:527 | `.faq-scene` | `gap:clamp(1.75rem,4vw,2.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:529 | `.faq-scene__tete h2` | `font-size:clamp(2.5rem,5.4vw,6.4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:532 | `.faq-scene` | `column-gap:clamp(3rem,7vw,9rem)` | 1440 |
| sections.html | kit/sections/site.css:533 | `.contact--photo` | `padding-block:clamp(5.5rem,12vw,11rem) clamp(3rem,6vw,5.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:538 | `.contact--photo .contact__tete h2` | `font-size:clamp(2.9rem,14vw,4.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:540 | `.contact--photo .contact__inner` | `row-gap:clamp(2.5rem,5vw,4.5rem)` | 1440 |
| sections.html | kit/sections/site.css:557 | `.plateau__haut` | `gap:clamp(2rem,4vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:561 | `.plateau__haut` | `column-gap:clamp(3rem,6vw,7rem)` | 1440 |
| sections.html | kit/sections/site.css:563 | `.plateau` | `padding-block:clamp(3.5rem,14vw,4.5rem)` | 390 |
| sections.html | kit/sections/site.css:566 | `.plateau__photo` | `margin-bottom:calc(-1 * clamp(3.5rem,14vw,4.5rem))` | 390 |
| sections.html | kit/sections/site.css:567 | `.plateau__citation p` | `font-size:clamp(1.8rem,8vw,2.2rem)` | 390 |
| sections.html | kit/sections/site.css:611 | `.etapes__photo` | `margin-top:clamp(.75rem,2vw,1.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:619 | `.etapes__photo` | `margin-top:calc(-1 * clamp(4rem,9vw,8rem))` | 390 |
| sections.html | kit/sections/site.css:625 | `.faq-scene__photo` | `margin-top:clamp(.5rem,1.5vw,1.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:628 | `.faq-scene__photo` | `margin-top:calc(-1 * clamp(4rem,8vw,7.5rem))` | 390 |
| sections.html | kit/sections/site.css:670 | `.plateau__citation p` | `font-size:clamp(2rem,9.2vw,2.5rem)` | 390 |
| sections.html | kit/sections/site.css:703 | `#communes h2,.etapes__tete h2,.faq-scene__tete h2` | `font-size:clamp(2.9rem,7.4vw,8.5rem)` | 1440 |
| sections.html | kit/sections/site.css:707 | `.da--communes #communes.scene--communes .commune` | `font-size:min(5.2vw,calc(10.5 * var(--k-vh)))` | 1440 |
| sections.html | kit/sections/site.css:708 | `.da--communes #communes.scene--communes .commune:nth-child(odd)` | `padding-left:max(5vw,calc(50vw - 860px))` | 1440 |
| sections.html | kit/sections/site.css:709 | `.da--communes #communes.scene--communes .commune:nth-child(even)` | `padding-right:max(5vw,calc(50vw - 860px))` | 1440 |
| sections.html | kit/sections/site.css:717 | `.contact--photo` | `padding-top:clamp(5.5rem,9vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:727 | `.hero--plein:not(.hero--commune) h1` | `--h1-ligne:max(30vw,112px)` | 390 |
| sections.html | kit/sections/site.css:770 | `.faq-scene__droite` | `gap:clamp(1.25rem,2.5vw,2.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:773 | `.faq-scene` | `row-gap:clamp(1.5rem,2.5vw,2.5rem)` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `left:calc(clamp(3.4rem,6.2vw,8rem) * 1.3)` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `width:clamp(3.6rem,5.6vw,7.25rem)` | 1440 |

#### R2 container query (container-type) — 2 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:62 | `.b-communes` | `container-type:inline-size` | 1440 |
| sections.html | kit/sections/site.css:706 | `.da--communes #communes.scene--communes .communes` | `container-type:inline-size` | 1440 |

#### R2 unité de fenêtre (vw/vh/svh/dvh) — 145 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| sections.html | kit/sections/bureau.css:36 | `.scene--presta.scene--survol .presta__vignette` | `width:min(24vw,26rem)` | 1440 |
| sections.html | kit/sections/gel.css:41 | `.k-deplie .scene--presta .presta` | `grid-template-columns:80vw` | 390 |
| sections.html | kit/sections/gel.css:41 | `.k-deplie .scene--presta .presta` | `row-gap:5vw` | 390 |
| sections.html | kit/sections/gel.css:42 | `.k-deplie .scene--galerie .galerie--scene` | `grid-template-columns:85vw` | 390 |
| sections.html | kit/sections/gel.css:42 | `.k-deplie .scene--galerie .galerie--scene` | `row-gap:4vw` | 390 |
| sections.html | kit/sections/gel.css:43 | `.da--etapes .k-deplie .etapes__liste` | `grid-template-columns:76vw` | 390 |
| sections.html | kit/sections/gel.css:43 | `.da--etapes .k-deplie .etapes__liste` | `row-gap:4vw` | 390 |
| sections.html | kit/sections/gel.css:72 | `.presta__ligne.k-survol h3` | `transform:translateX(1.2vw)` | 1440 |
| sections.html | kit/sections/site.css:23 | `h1` | `font-size:clamp(2.6rem,6.4vw,5.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:24 | `h2` | `font-size:clamp(2rem,4.2vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:25 | `h3` | `font-size:clamp(1.2rem,1.6vw,1.45rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:30 | `.section` | `padding-block:clamp(4rem,9vw,8rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:37 | `.chapeau` | `font-size:clamp(1.1rem,1.5vw,1.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:75 | `.panneau nav a` | `font-size:clamp(1.9rem,6vw,2.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:85 | `.hero__contenu` | `padding-block:clamp(2.5rem,6vw,5rem) clamp(3rem,7vw,5.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:136 | `.galerie` | `gap:clamp(2.25rem,7vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:145 | `.galerie__credits` | `margin-top:clamp(2rem,5vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:148 | `.galerie` | `column-gap:clamp(1rem,1.6vw,1.75rem)` | 1440 |
| sections.html | kit/sections/site.css:148 | `.galerie` | `row-gap:clamp(3rem,6vw,6.5rem)` | 1440 |
| sections.html | kit/sections/site.css:152 | `.galerie__item:nth-child(4)` | `margin-top:clamp(4rem,10vw,11rem)` | 1440 |
| sections.html | kit/sections/site.css:173 | `.commune` | `font-size:clamp(1.4rem,2.6vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:181 | `.faq summary` | `font-size:clamp(1.1rem,1.7vw,1.35rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:247 | `.da--etapes .etape` | `column-gap:clamp(1.25rem,3vw,2.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:247 | `.da--etapes .etape` | `padding-block:clamp(1.25rem,2.6vw,2.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:248 | `.da--etapes .etape__num` | `font-size:clamp(7vw,6rem + 2vw,9vw)` | 1440, 390 |
| sections.html | kit/sections/site.css:251 | `.da--etapes .etape h3` | `font-size:clamp(1.45rem,2.2vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:253 | `.da--etapes .etape__num` | `font-size:18vw` | 390 |
| sections.html | kit/sections/site.css:254 | `.da--communes #communes` | `padding-block:clamp(2.5rem,3.5vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:258 | `.da--communes #communes .commune` | `gap:clamp(.75rem,2.5vw,2.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:258 | `.da--communes #communes .commune` | `font-size:clamp(7vw,4rem + 2.5vw,9vw)` | 1440, 390 |
| sections.html | kit/sections/site.css:261 | `.da--communes #communes .commune:hover>span:first-child,.da--communes #communes .commune:hover svg` | `transform:translateX(2.5vw)` | 1440, 390 |
| sections.html | kit/sections/site.css:262 | `.nav .conteneur` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:271 | `.hero--plein .hero__contenu` | `padding:0 5vw clamp(1.5rem,3.6vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:271 | `.hero--plein .hero__contenu` | `gap:clamp(1.1rem,2.2vw,2rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:272 | `.hero--plein h1` | `--h1-ligne:19vw` | 1440, 390 |
| sections.html | kit/sections/site.css:272 | `.hero--plein h1` | `gap:clamp(.7rem,1.4vw,1.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:273 | `.hero--plein h1` | `--h1-ligne:14.2vw` | 1440 |
| sections.html | kit/sections/site.css:275 | `.h1__cle` | `font-size:clamp(.78rem,.9vw,.95rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:278 | `.hero__pied` | `padding-top:clamp(1rem,1.8vw,1.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:290 | `.plateau` | `padding-block:clamp(4.5rem,10vw,9.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:291 | `.plateau__inner` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:291 | `.plateau__inner` | `gap:clamp(3rem,7vw,6.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:293 | `.plateau__citation p` | `font-size:clamp(2.1rem,4vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:298 | `.chiffres` | `padding-top:clamp(2rem,3.5vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:301 | `.chiffre__valeur` | `font-size:26vw` | 1440, 390 |
| sections.html | kit/sections/site.css:302 | `.chiffre__unite` | `font-size:clamp(1.25rem,2vw,2.1rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:306 | `.chiffre` | `padding-right:clamp(1rem,2vw,2rem)` | 1440 |
| sections.html | kit/sections/site.css:307 | `.chiffre+.chiffre` | `padding-left:clamp(1.25rem,2.6vw,2.75rem)` | 1440 |
| sections.html | kit/sections/site.css:308 | `.chiffre__valeur` | `font-size:11vw` | 1440 |
| sections.html | kit/sections/site.css:311 | `.h2--scene` | `font-size:clamp(2.9rem,7.4vw,8.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:322 | `.hero--plein .hero__pied` | `margin-top:1.2vw` | 1440, 390 |
| sections.html | kit/sections/site.css:341 | `.devis__merci-titre` | `font-size:clamp(2.2rem,4vw,3.4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:354 | `.hero--plein:not(.hero--commune) h1` | `--h1-ligne:max(32.5vw,121px)` | 390 |
| sections.html | kit/sections/site.css:362 | `.scene-large` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:364 | `.presta__ligne` | `padding-block:clamp(1.35rem,2.4vw,2.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:365 | `.presta__num` | `font-size:clamp(2.4rem,5.4vw,6.2rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:366 | `.presta__ligne h3` | `font-size:clamp(1.55rem,3vw,3.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:369 | `.presta__ligne` | `column-gap:clamp(1.5rem,3vw,3.5rem)` | 1440 |
| sections.html | kit/sections/site.css:372 | `.presta__ligne:hover h3` | `transform:translateX(1.2vw)` | 1440 |
| sections.html | kit/sections/site.css:381 | `.contact` | `padding-block:clamp(3rem,8vw,8rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:382 | `.contact__inner` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:382 | `.contact__inner` | `gap:clamp(1.6rem,4vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:385 | `.contact__tete h2` | `font-size:clamp(2.3rem,10vw,4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:393 | `.contact__inner` | `column-gap:clamp(3rem,7vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:395 | `.contact__tete h2` | `font-size:clamp(3rem,5.2vw,6.5rem)` | 1440 |
| sections.html | kit/sections/site.css:398 | `.devis__merci-titre` | `font-size:clamp(2.6rem,5.4vw,5.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:404 | `.devis__recap dd` | `font-size:clamp(1.2rem,1.7vw,1.6rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:407 | `.devis__suite span` | `font-size:clamp(2rem,3vw,2.9rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:408 | `.devis__suite strong` | `font-size:clamp(1.2rem,1.7vw,1.55rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:412 | `.scene` | `padding-block:clamp(4rem,8vw,7.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:414 | `.scene__tete` | `margin-bottom:clamp(2rem,4vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:418 | `.scene__tete--deux` | `column-gap:clamp(2.5rem,5vw,6rem)` | 1440 |
| sections.html | kit/sections/site.css:421 | `.scene--presta` | `padding-block:clamp(3.5rem,6.5vw,6.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:425 | `.scene--presta .presta__ligne` | `padding-block:clamp(.85rem,1.45vw,1.6rem)` | 1440 |
| sections.html | kit/sections/site.css:426 | `.scene--presta .presta__num` | `font-size:clamp(3.4rem,6.2vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:427 | `.scene--presta .presta__ligne h3` | `font-size:clamp(1.9rem,3.05vw,4rem)` | 1440 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `width:min(8.5vw,10.5rem)` | 1440 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `grid-auto-columns:80vw` | 390 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `column-gap:5vw` | 390 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `margin-inline:-5vw` | 390 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `scroll-padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:443 | `.scene--presta .presta__num` | `font-size:18vw` | 390 |
| sections.html | kit/sections/site.css:457 | `.atelier__contenu` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:457 | `.atelier__contenu` | `row-gap:clamp(1rem,2vw,1.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:457 | `.atelier__contenu` | `padding-block:clamp(6.5rem,calc(13 * var(--k-vh)),9rem) clamp(1.5rem,3.5vw,2.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:458 | `.atelier__titre` | `font-size:18vw` | 1440, 390 |
| sections.html | kit/sections/site.css:459 | `.atelier__phrase` | `font-size:clamp(1.35rem,2.2vw,2.3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:461 | `.atelier__titre` | `font-size:12.5vw` | 1440 |
| sections.html | kit/sections/site.css:471 | `.travelling__fenetre` | `width:90vw` | 1440, 390 |
| sections.html | kit/sections/site.css:473 | `.galerie--scene` | `gap:clamp(2.25rem,7vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:474 | `.galerie--scene .galerie__item` | `width:85vw` | 1440, 390 |
| sections.html | kit/sections/site.css:486 | `.galerie--scene` | `column-gap:clamp(1rem,1.6vw,1.75rem)` | 1440 |
| sections.html | kit/sections/site.css:486 | `.galerie--scene` | `row-gap:clamp(2rem,4vw,3.25rem)` | 1440 |
| sections.html | kit/sections/site.css:496 | `.scene--galerie` | `padding-block:clamp(3.5rem,6vw,6rem)` | 1440 |
| sections.html | kit/sections/site.css:521 | `@keyframes travelling` | `@bloc:to{transform:translateX(calc(-100% + 100vw))}` | 1440, 390 |
| sections.html | kit/sections/site.css:524 | `.da--communes #communes.scene--communes` | `padding-block:clamp(2.5rem,3.4vw,3rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:525 | `.da--communes #communes.scene--communes .scene__tete` | `margin-bottom:clamp(1rem,2vw,1.75rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:526 | `.da--communes #communes.scene--communes .commune` | `font-size:min(clamp(7vw,4rem + 2.5vw,9vw),calc(12.4 * var(--k-vh)))` | 1440, 390 |
| sections.html | kit/sections/site.css:527 | `.faq-scene` | `gap:clamp(1.75rem,4vw,2.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:529 | `.faq-scene__tete h2` | `font-size:clamp(2.5rem,5.4vw,6.4rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:532 | `.faq-scene` | `column-gap:clamp(3rem,7vw,9rem)` | 1440 |
| sections.html | kit/sections/site.css:533 | `.contact--photo` | `padding-block:clamp(5.5rem,12vw,11rem) clamp(3rem,6vw,5.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:538 | `.contact--photo .contact__tete h2` | `font-size:clamp(2.9rem,14vw,4.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:540 | `.contact--photo .contact__inner` | `row-gap:clamp(2.5rem,5vw,4.5rem)` | 1440 |
| sections.html | kit/sections/site.css:544 | `.contact--photo .contact__tete h2` | `font-size:10.4vw` | 1440 |
| sections.html | kit/sections/site.css:557 | `.plateau__haut` | `gap:clamp(2rem,4vw,3.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:558 | `.plateau__photo` | `margin-inline:-5vw` | 1440, 390 |
| sections.html | kit/sections/site.css:561 | `.plateau__haut` | `column-gap:clamp(3rem,6vw,7rem)` | 1440 |
| sections.html | kit/sections/site.css:563 | `.plateau` | `padding-block:clamp(3.5rem,14vw,4.5rem)` | 390 |
| sections.html | kit/sections/site.css:566 | `.plateau__photo` | `margin-bottom:calc(-1 * clamp(3.5rem,14vw,4.5rem))` | 390 |
| sections.html | kit/sections/site.css:567 | `.plateau__citation p` | `font-size:clamp(1.8rem,8vw,2.2rem)` | 390 |
| sections.html | kit/sections/site.css:573 | `.chiffre__valeur` | `font-size:17vw` | 390 |
| sections.html | kit/sections/site.css:580 | `.scene--presta .presta__num` | `font-size:15vw` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `grid-auto-columns:85vw` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `column-gap:4vw` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `margin-inline:-5vw` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:583 | `.scene--galerie .galerie--scene` | `scroll-padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:611 | `.etapes__photo` | `margin-top:clamp(.75rem,2vw,1.5rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:614 | `.etapes__photo` | `margin-inline:calc(50% - 50vw)` | 390 |
| sections.html | kit/sections/site.css:619 | `.etapes__photo` | `margin-top:calc(-1 * clamp(4rem,9vw,8rem))` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `grid-auto-columns:76vw` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `column-gap:4vw` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `margin-inline:-5vw` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:620 | `.da--etapes .etapes__liste` | `scroll-padding-inline:5vw` | 390 |
| sections.html | kit/sections/site.css:623 | `.da--etapes .etape__num` | `font-size:18vw` | 390 |
| sections.html | kit/sections/site.css:625 | `.faq-scene__photo` | `margin-top:clamp(.5rem,1.5vw,1.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:628 | `.faq-scene__photo` | `margin-inline:-5vw` | 390 |
| sections.html | kit/sections/site.css:628 | `.faq-scene__photo` | `margin-top:calc(-1 * clamp(4rem,8vw,7.5rem))` | 390 |
| sections.html | kit/sections/site.css:670 | `.plateau__citation p` | `font-size:clamp(2rem,9.2vw,2.5rem)` | 390 |
| sections.html | kit/sections/site.css:681 | `.da--communes #communes.scene--communes .commune` | `font-size:11.5vw` | 390 |
| sections.html | kit/sections/site.css:703 | `#communes h2,.etapes__tete h2,.faq-scene__tete h2` | `font-size:clamp(2.9rem,7.4vw,8.5rem)` | 1440 |
| sections.html | kit/sections/site.css:707 | `.da--communes #communes.scene--communes .commune` | `font-size:min(5.2vw,calc(10.5 * var(--k-vh)))` | 1440 |
| sections.html | kit/sections/site.css:707 | `.da--communes #communes.scene--communes .commune` | `padding-inline:2.5vw` | 1440 |
| sections.html | kit/sections/site.css:708 | `.da--communes #communes.scene--communes .commune:nth-child(odd)` | `padding-left:max(5vw,calc(50vw - 860px))` | 1440 |
| sections.html | kit/sections/site.css:709 | `.da--communes #communes.scene--communes .commune:nth-child(even)` | `padding-right:max(5vw,calc(50vw - 860px))` | 1440 |
| sections.html | kit/sections/site.css:717 | `.contact--photo` | `padding-top:clamp(5.5rem,9vw,8rem)` | 1440 |
| sections.html | kit/sections/site.css:718 | `.contact--photo .contact__tete h2` | `font-size:8.6vw` | 1440 |
| sections.html | kit/sections/site.css:727 | `.hero--plein:not(.hero--commune) h1` | `--h1-ligne:max(30vw,112px)` | 390 |
| sections.html | kit/sections/site.css:770 | `.faq-scene__droite` | `gap:clamp(1.25rem,2.5vw,2.25rem)` | 1440, 390 |
| sections.html | kit/sections/site.css:773 | `.faq-scene` | `row-gap:clamp(1.5rem,2.5vw,2.5rem)` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `left:calc(clamp(3.4rem,6.2vw,8rem) * 1.3)` | 1440 |
| sections.html | kit/sections/site.css:787 | `.scene--presta .presta__vignette` | `width:clamp(3.6rem,5.6vw,7.25rem)` | 1440 |

#### R24 display:contents — 3 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:66 | `.b-contents` | `display:contents` | 1440 |
| sections.html | kit/sections/site.css:565 | `.plateau__haut` | `display:contents` | 390 |
| sections.html | kit/sections/site.css:898 | `.eclate__ligne` | `display:contents` | 1440, 390 |

#### R24 position:absolute — 21 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:12 | `.b-sur-photo>.b-photo` | `position:absolute` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:25 | `.b-grain-avant::before,.b-grain-couche` | `position:absolute` | 1440 |
| banc-essai-1440.html | kit/banc-essai.css:59 | `.b-voile-apres::after,.b-voile` | `position:absolute` | 1440 |
| sections.html | kit/sections/gel.css:12 | `.k-scene--heros>.nav` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/gel.css:27 | `.k-etat--menu>.voile` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/gel.css:29 | `.k-etat--menu>.nav` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:44 | `.nav__liens a::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:82 | `.hero__media` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:163 | `.etapes__liste::before` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:164 | `.etapes__liste::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:167 | `.etape::before` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:267 | `.hero--plein .hero__media::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:431 | `.presta__vignette` | `position:absolute` | 1440 |
| sections.html | kit/sections/site.css:453 | `.atelier__media` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:456 | `.atelier__media::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:534 | `.contact__media` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:537 | `.contact__media::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:753 | `.nav.nav--bande::before,.nav.nav--bande::after` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:777 | `.faq-scene__photo picture` | `position:absolute` | 1440 |
| sections.html | kit/sections/site.css:889 | `.eclate__rendu>img` | `position:absolute` | 1440, 390 |
| sections.html | kit/sections/site.css:892 | `.eclate__pastille` | `position:absolute` | 1440, 390 |

#### R9 animation liée au défilement — 9 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| sections.html | kit/sections/site.css:421 | `.scene--presta` | `timeline-scope:--presta` | 1440, 390 |
| sections.html | kit/sections/site.css:439 | `.scene--presta .presta` | `scroll-timeline:--presta inline` | 390 |
| sections.html | kit/sections/site.css:448 | `.scene--presta .presta__jauge span` | `animation-timeline:--presta` | 390 |
| sections.html | kit/sections/site.css:676 | `.da--etapes .etapes` | `timeline-scope:--etapes` | 390 |
| sections.html | kit/sections/site.css:677 | `.da--etapes .etapes__liste` | `scroll-timeline:--etapes inline` | 390 |
| sections.html | kit/sections/site.css:679 | `.da--etapes .etapes__jauge span` | `animation-timeline:--etapes` | 390 |
| sections.html | kit/sections/site.css:687 | `.scene--galerie` | `timeline-scope:--galerie` | 390 |
| sections.html | kit/sections/site.css:688 | `.scene--galerie .galerie--scene` | `scroll-timeline:--galerie inline` | 390 |
| sections.html | kit/sections/site.css:690 | `.scene--galerie .galerie__jauge span` | `animation-timeline:--galerie` | 390 |

#### R9 content-visibility:auto — 1 déclaration(s) distincte(s)

| page | fichier:ligne | sélecteur | déclaration ou contexte | largeurs |
|---|---|---|---|---|
| banc-essai-1440.html | kit/banc-essai.css:93 | `.b-lointain` | `content-visibility:auto` | 1440 |
