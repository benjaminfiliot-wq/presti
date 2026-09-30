# Vague 5 — Révélation au survol et objet décomposé : références, objet, technique, placement

**021-00, 15/09/2026, entre 13 h 04 et 13 h 25** (heures des fichiers écrits). Rédigé par un sous-agent de Claude Code.

**Sources.**
- Connecteur MotionSites : `search_prompts` et `get_related_prompts`, métadonnées seulement. **Aucun `get_prompt`.**
- Aperçus publics téléchargés dans `.orchestre/travail/motionsites-apercus/` (ignoré par git, `.gitignore:84`), puis découpés en planches avec sharp (`planches.mjs`).
- Durées : mesurées par différence d'image à image (`rafales.mjs` → `apercus/rafales.json`).
  - Les aperçus animés font 640 px de large, 65 à 75 images, et durent 4,3 à 5,0 s.
  - Délai médian : 67 ms par image, soit une résolution de ±67 ms sur les durées.
- Connecteur PromptedSite (métadonnées seulement), pages publiques Codrops, W3C et Awwwards.
- La démo en ligne, mesurée avec Playwright (`existant.mjs`, `etapes.mjs`).
- Deux prototypes jetables (CSS 3D et calques Blender), faits pour mesurer et regarder.

**Preuves** : tout est copié dans `021-00/survol-objet/` (`apercus/` = planches regardées ; `prototype/` = scripts, JSON, captures). Chaque image décrite ici a été ouverte.

---

## 0. En bref

1. **Survol : pas de nouvelle scène.**
   - La démo a **déjà** une révélation au survol dans les prestations (kit.css:543-549 et 1038-1040), mais c'est une vignette de **84 × 93 px** (mesurée).
   - Proposition : la porter au niveau des références, en **liste qui prévisualise**. Une seule grande photo (environ un quart de la largeur de l'écran) suit le curseur avec amortissement et change de photo par un volet quand on passe d'une ligne à l'autre.
   - Parité au clavier : chaque ligne devient un lien vers le devis, projet présélectionné.
   - Au téléphone : rien à ajouter, le rail montre déjà les photos (mesuré).
2. **Objet décomposé : « Anatomie d'une marche ».**
   - Les pièces : une marche de 40 mm (texte réel de la prestation 01, contenu.json:25), sa contremarche, le limon à la française avec ses deux embrèvements, deux coins de serrage, deux tourillons.
   - **Placement : dans les étapes épinglées, à la place de la photo de gauche** (450 × 338 px, mesurée ; c'est la photo `tournage-copeaux`, déjà utilisée en vignette de la prestation 01).
   - Déroulé : assemblée en 01-02 ; éclatée et nommée en 03 « Plan et devis » (« un devis ligne par ligne » : une pièce, une ligne) ; remontée en 04 « Fabrication et pose ».
   - **Aucun défilement ajouté**, aucun bouton ajouté.
3. **Technique recommandée : des calques pré-rendus dans Blender** (5.2.1, installé, 0 €), posés dans la page et translatés en CSS sur la timeline `--etapes`, qui existe déjà.
   - Le prototype tient en **7 calques AVIF de 23 127 octets** au total.
   - À la fin de l'éclatement, le montage des calques est identique au vrai rendu 3D (0,88 % de pixels écartés).
   - Repli **CSS 3D** mesuré : 2 039 octets gzip, 16,7 ms par image. Plus léger, mais la matière est plus pauvre.
   - **WebGL dans le worker : écarté.** La grille ne le voit pas, il exige de toute façon un repli en image, et le worker ne sait rien faire de réutilisable pour un maillage (§3.3).

---

## 1. Révélation au survol : références

### 1.1 MotionSites (aperçus ouverts)

Planches : `survol-objet/apercus/<id>-planche.jpg`.

**`reveal-hero`** (premium, Hero)
- **Ce qui se révèle** : une seconde image, le même visage portant un masque respiratoire translucide, dans un **disque à bord doux centré sur le curseur** (rayon d'environ un demi-visage). Curseur sur le masque à t = 0,47 s : masque entier. Curseur sur le bouton à t = 1,80 s : aucun masque.
- **Durées et courbes** : suivi continu du curseur. Rafales de changement de 67 à 267 ms, faibles, parce que localisées. La courbe n'est pas mesurable à 15 images/s.
- **Clavier et téléphone** : non visibles dans l'aperçu.

**`cyberpunk-reveal`** (free, Hero)
- **Ce qui se révèle** : même principe. Sous le curseur, une couche « augmentée » apparaît : des coutures lumineuses orange sur le cou, la joue et la veste (t = 1,33 s, 3,60 s, 4,07 s). Des anneaux et des chiffres entrent au début (0,87 à 1,33 s).
- **Durées** : rafales de 67 et 134 ms (très locales).
- **Clavier et téléphone** : non visibles.

**`nike-hover`** (free, Features)
- **Ce qui se révèle** : le curseur agit comme une **gomme douce**. La chaussure et la roche s'effacent vers le noir autour de lui (t = 2,27 à 3,13 s), puis se reforment après son passage (t = 4,07 s).
- **Durées** : rafales de 333 et 267 ms.
- **Clavier et téléphone** : non visibles.

**`pixel-grid-hover`** (free, Case Studies)
- **Ce qui se révèle** : une grille de 2 × 2 projets. La photo survolée **se découpe en carrés qui s'éteignent** (assombrissement pixelisé), puis revient (t = 1,67 s, 2,93 s, 4,20 s). Le titre de la carte reste.
- **Durées** : rafales de 867 à 1 067 ms. C'est un majorant, car la page défile aussi.
- **Clavier et téléphone** : non visibles.

**`apex-program-accordion`** (premium, Accordion)
- **Ce qui se révèle** : une **liste de modules**. Une ligne s'ouvre sur ses sous-lignes et la précédente se ferme (t = 2,33 s puis 3,47 s). Curseur en main : sans doute au clic, l'aperçu ne le distingue pas.
- **Durées** : ouverture en 200 ms, puis en 267 ms.
- **Clavier et téléphone** : non visibles.

**`technical-specifications`** (premium, Tabs)
- **Ce qui se révèle** : des onglets. À chaque changement, un éclair d'une image, puis **les barres se remplissent l'une après l'autre**.
- **Durées** : 67 ms, puis **666 à 667 ms**, trois fois identiques. C'est la mesure la plus nette du lot.
- **Clavier et téléphone** : non visibles.

**Écartés après ouverture :**
- `cursor-follow` : le personnage suit le curseur du regard, rien ne se révèle ;
- `beauty-products` : carrousel qu'on fait glisser ;
- `daisy-wild` : vidéo ;
- `rare-gallery` et `interactive-discovery` : aperçus fixes, effet non observable.

### 1.2 Hors MotionSites (code public lu)

**Codrops, *Image Reveal Hover Effects*** (2018). Code : github.com/codrops/ImageRevealHover, `js/demo.js`.
- 23 classes d'effets (`class HoverImgFx`).
- **Apparition** : de 0,2 s en `Sine.easeOut` (l. 86-92) à 0,8 s en `Expo.easeOut` (l. 378-387 et 488-503).
- **Disparition** : 0,1 s en `Sine.easeOut` (l. 647-652) à 0,3 s en `Quint.easeOut` (l. 200-207). La sortie est donc 2 à 8 fois plus courte que l'entrée.
- **Suivi** : l'image suit la souris par `mousemove` et `requestAnimationFrame` (l. 64).
- **Écouteurs** : `mouseenter` et `mouseleave` seulement (l. 71-73). `grep touch|keydown|focus` ne trouve rien : **aucun chemin clavier ni tactile**.

**Codrops, *Creating a Menu Image Animation on Hover*** (2020, tympanus.net/codrops/2020/07/01/…), page lue.
- Suivi amorti par interpolation linéaire, facteur **0,08 par image** : position, rotation liée à la vitesse, luminosité.
- Apparition et disparition en 0,2 s, `Sine.easeOut`, par volets opposés (le cadre et l'image glissent en sens contraire).
- Rien sur le tactile ni le clavier.

**W3C, WCAG 2.2, critère 1.4.13 *Content on Hover or Focus*** (w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
- Le contenu révélé doit pouvoir être fermé sans bouger (Échap), survolé sans disparaître, et rester visible tant que dure le déclencheur.
- Le W3C précise qu'il devrait aussi se déclencher au **focus clavier**.

### 1.3 L'existant de la démo, mesuré

Mesures : `existant.mjs` → `existant.json`, en ligne, 1440 × 900.
- **Vignette** (kit.css:544 et 1039) : 83,7 × 93,1 px, rotation −2°.
  - Masque `inset(50% 0)` → `inset(0)` en 0,55 s, `cubic-bezier(.16,1,.3,1)`.
  - Relevé du masque : 14,1 % à 100 ms, 3,1 % à 200 ms, 0,57 % à 300 ms, 0 à 550 ms. **Environ 94 % de l'ouverture est faite en 200 ms.**
  - L'image passe de l'échelle 1,2 à 1 en 0,9 s (kit.css:546-548).
- **Lignes** : 114 px de haut chacune. Le titre glisse de 1,2 vw au survol (kit.css:463-464).
- **Clavier** : **0 élément focalisable** dans chacune des 6 lignes. Au clavier, la révélation n'existe pas.
- **Téléphone** (390 × 844, tactile) : la vignette est affichée en tête de carte du rail (`display: block`, pas de masque, rapport 4/5 ; kit.css:726-728 et 854). `(hover: hover)` est faux. Tout est déjà visible sans survol.
- **Taille** : la vignette actuelle est bien plus petite que le révélé des références (demi-visage chez `reveal-hero`, carte entière chez `pixel-grid-hover`). C'est l'écart principal.

---

## 2. Révélation au survol : proposition

**Où** : prestations seulement, bureau à souris. Même porte que l'existant : `(min-width:1024px) and (hover:hover) and (pointer:fine)`, kit.css:543.

**Quoi** : un seul cadre d'aperçu partagé par les six lignes, au lieu de six vignettes. C'est le modèle « liste qui prévisualise » de Codrops 2020, porté à l'échelle de MotionSites.

**Le cadre**
- Portrait 4/5, largeur de l'ordre de `min(24vw, 26rem)` (valeur proposée).
- Il reste dans la colonne du titre et ne couvre jamais le texte de droite.

**Le suivi**
- Amorti vers le curseur. Référence : 0,08 par image à 60 Hz. À écrire en fonction du temps écoulé, comme le relief (relief-fil.js, `k = 1 - Math.exp(-dt * 2.4)`), avec un coefficient plus vif.
- Légère rotation proportionnelle à la vitesse horizontale, bornée à ±4° (valeur proposée).
- Écouteur passif, une mesure par image (le patron de kit.js:139).

**Le changement de ligne**
- Volet vertical dans le sens du mouvement (vers le bas si l'on descend), sur la courbe du kit `cubic-bezier(.16,1,.3,1)`.
- Entrée en 0,55 s (valeur actuelle) ; sortie de la liste en 0,2 à 0,25 s. Rapport entrée/sortie tiré des 23 effets Codrops.
- L'image garde son dézoom 1,15 → 1 en 0,9 s (existant).

**Les autres lignes** : leur titre peut baisser d'opacité (0,45 proposé) pendant le survol. C'est optionnel, à juger sur film (C7).

**Au clavier**
- Chaque ligne entière devient un lien étiré, sans nouveau bouton visible, vers `#contact` avec le projet présélectionné. Le `<select name="projet">` a déjà Escalier, Dressing ou placard, Cuisine, Bibliothèque, Autre ouvrage (index.html). Les parquets et les portes tombent sur « Autre ouvrage ».
- `:focus-visible` ouvre le même aperçu, ancré à droite du titre au lieu du curseur. Échap le ferme (1.4.13).
- **Risque C7** : six liens de plus. Il faut repasser `scripts/nav-retenue-qa.mjs`, qui doit rester vert.

**Au téléphone et au tactile** : rien de nouveau (§1.3). Pas d'aperçu au toucher : le toucher suit le lien.

**Mouvement réduit** : pas de suivi, pas de rotation. L'aperçu apparaît ancré, en fondu de 0,2 s au plus.

**Poids**
- Aucune photo nouvelle : ce sont les six photos déjà déclarées.
- Mais l'agrandissement change la source retenue par `srcset`. Poids AVIF relevés au chargement : `reserve-bibliotheque-960` 37 913 octets, `reserve-cuisine-poutres-960` 22 148 octets. Les versions 480 pèsent 4 986 à 12 921 octets.
- Il faut donc charger les grandes sources **au premier survol de la liste**, jamais au chargement : Lighthouse mobile n'est pas concerné (porte bureau), mais le poids de bureau l'est.

**À vérifier par le juge de la tâche**
- Aperçu ouvert à ≥ 90 % en ≤ 250 ms après l'entrée dans une ligne.
- Aucune requête d'image supplémentaire avant le premier `pointermove` sur la liste.
- Focus clavier → aperçu visible ; Échap → caché.
- Mouvement réduit : aucune transformation qui change entre deux images.
- 390 px : aucune requête nouvelle.
- `site-qa`, `demo-usage-qa` et `nav-retenue-qa` restent verts.

**Ce que je ne propose pas (C7)**
- Pas de second survol dans les réalisations : elles ont déjà le travelling, le relief 3D selon la position (kit.js:116-141, kit.css:1157-1161) et un zoom de 1,04 au survol (kit.css:607). Un masque au curseur s'y cumulerait.
- Pas de gomme ni de pixelisation sur les photos : ces effets demandent une seconde image alignée, qu'on n'a pas (photos sous licence, aucune paire avant/après).

---

## 3. Objet décomposé

### 3.1 Références

**MotionSites.** La recherche « exploded view product parts separate on scroll with labels » ne remonte **aucun aperçu d'éclaté au défilement**. Les deux premiers ouverts (`beauty-products` : carrousel ; `product-studio` : sphère et titre) n'en montrent pas. Ce qui s'en approche, aperçus fixes ouverts :

| id | accès | ce qu'on voit | ce qu'on en retient |
|---|---|---|---|
| `veyra-electric` | free | Voiture capot ouvert, cinq points « + » jaunes, un point actif portant l'étiquette « Electric drive ↗ ». Consigne « Explore beneath the surface. Select a point to begin. » Quatre colonnes (Electric drive, Battery architecture, Body finishes, Wheel designs). | Nommer une pièce **sur** l'objet, avec un filet court ; le texte détaillé reste hors de l'image. |
| `cordex` | free | Tuyau en écorché : la tresse noire, coupée en retrait, laisse voir le tube translucide intérieur. Bascule « Full mode / Explore ». | Montrer ce qui est caché par un retrait des couches, sans éparpiller. |
| `nex-robotics` | premium | Robot de profil, cou mécanique à nu (vérins, câbles), pagination 01/07, liste Description / Specifications / Compatibility / Integrated / Other / Features. | L'anatomie comme argument de sérieux ; une liste de fiches à côté. |
| `technical-specifications` | premium | Données par onglet, barres remplies en 0,67 s (mesuré, §1.1). | Le rythme d'une fiche technique qui se remplit. |

**Hors MotionSites :**
- **Awwwards Elements, *Interactive WebGL Exploded View*** — iyO, Matteo Donini, mars 2026 (awwwards.com/inspiration/interactive-webgl-exploded-view-iyo). Éclaté piloté par le défilement, en WebGL. Page lue, images non ouvertes.
- **Codrops, *On-Scroll Folding 3D Cardboard Box*** (2022, tympanus.net/codrops/2022/12/13/…). Page lue.
  - Géométrie **procédurale** : 12 maillages.
  - Timeline liée au défilement (`scrub: true`), longue de 3 unités, courbes `power1.inOut` et `back.in`.
  - Rendu **seulement pendant la transition** (`onUpdate`), pas de boucle permanente.

### 3.2 L'objet de l'Atelier Lestraque

| Candidat | Pour | Contre |
|---|---|---|
| Escalier droit entier (limons, 8 à 12 marches, garde-corps) | Parle à tout le monde | Trop de pièces pour 450 × 338 px ; étiquettes serrées ; redit la silhouette du héros (hélicoïdal) |
| **Une marche et son assemblage** (retenu) | 5 sortes de pièces, 7 pièces : lisible dans le cadre des étapes. Du bois de fil, du bois de bout et des rainures : de la matière (C6). Relié mot pour mot à la prestation 01 (« marches de 40 mm », contenu.json:25) et au héros. | Moins spectaculaire qu'un objet entier : le spectaculaire vient du geste (assemblée → éclatée → remontée) |
| Meuble de bibliothèque (montants, tablettes, fond, socle, éclairage sous tablettes) | Relié à la prestation 03 | Des panneaux plats : peu de savoir-faire caché. L'éclairage demande une source de lumière dans le rendu. |
| Variante « départ d'escalier » : poteau + limon à **tenon et mortaise** + marche | Montre un vrai tenon (Q de Benj) | 9 pièces ou plus. Tenon et mortaise vont au poteau, pas à la marche. |

**Vocabulaire** (à tenir juste : ce sont des artisans qui regarderont).
- Limon à la française : poutre dans laquelle marches et contremarches sont **embrevées**.
- Limon à l'anglaise, ou crémaillère : les marches sont posées dessus.
- Profondeur d'embrèvement : environ 17 mm.
- Source : extraits de résultats de recherche web ; pages citées : inoxdesign.fr/definitions/limon-a-la-francaise.html, fr.wikipedia.org/wiki/Limon_(architecture), leboisdeshuiles.fr (entaillage des limons). Les pages elles-mêmes n'ont pas été lues.
- « Coins de serrage » et « tourillons » : **non vérifiés** par une source. Il faut les vérifier, ou les remplacer par « vis » et « colle », avant d'écrire la page.
- Les étiquettes prévues : Limon à la française · Embrèvements · Marche, chêne 40 mm · Contremarche · Coins de serrage · Tourillons.

### 3.3 La technique : trois voies mesurées ou lues

**Prototype A — CSS 3D pur**
- Fichiers : `prototype/proto-css.mjs` → `proto-css.html`, `proto-css.json` ; captures `css-bureau-p000.png`, `css-bureau-p100.png`, `css-tel-p100.png`.
- 7 boîtes de 6 faces en `preserve-3d`, vue fixe `rotateX(-22deg) rotateY(-36deg)`, perspective 2600 px.
- Chaque pièce se déplace de `translate3d(position + vecteur × --p)`. Ombre fixe par face. Fil du bois en dégradés répétés. Embrèvements en rectangles sombres sur la face intérieure du limon. Étiquettes en HTML tournées face à l'œil.

**Prototype B — calques Blender**
- Fichiers : `prototype/eclate.py`, `calques.mjs`, `diff0.mjs` ; images `assemble.png`, `eclate.png`, `planche-calques.jpg`, `ecart-p0.jpg`.
- Blender 5.2.1, Cycles CPU, 40 échantillons, débruitage, 1400 × 1000, fond transparent.
- Boîtes biseautées ; **embrèvements vraiment creusés** par booléen ; chêne procédural (bruit étiré dans l'axe du fil).
- **Caméra orthographique** : déplacer une pièce le long d'un axe 3D revient alors à translater son calque d'un vecteur 2D fixe. Le script écrit ces vecteurs (`eclate.json`).
- Rendus : l'objet assemblé, l'objet éclaté (la vérité), et un calque RGBA par pièce.

| | A. CSS 3D | B. Calques Blender + CSS | C. WebGL dans le worker |
|---|---|---|---|
| **Poids** | 9 765 octets bruts, **2 039 gzip**, 57 éléments (mesuré) | 7 calques rognés : **23 127 octets AVIF** q60, 27 332 WebP. Rendu assemblé complet : 12 458 octets AVIF (mesuré, `calques.json`) | Non mesuré. Voir la ligne « réutilisable ». |
| **Réutilisable dans le kit** | Timeline `--etapes` (kit.css:851, 1116) | Idem, plus le précédent d'un fichier calculé hors ligne (`relief/escalier-profondeur.webp`, generer.mjs:607-608 et 818-819) | Presque rien. relief-fil.js ne dessine qu'un **triangle plein écran** (l. 150, l. 105) avec un shader 2D sur photo et carte de profondeur (l. 24-49), dans un contexte **sans tampon de profondeur** (`depth: false`, l. 114). Un maillage 3D demande un autre programme, des matrices et un tampon de profondeur. Seules la sonde et la porte de kit.js:183 servent. |
| **Rendu attendu** (images ouvertes) | Maquette nette et propre, lisible. Aplats ombrés par face, pas de biseau, pas d'ombre de contact. Les cernes du bois de bout ne se voient pas à cette taille. | Biseaux, fil procédural, bois de bout granuleux, rainures creusées avec leur ombre propre. **Teinte trop pâle** (frêne plutôt que chêne) : rampe de couleur à régler. Pas d'ombres portées entre pièces. | Dépend du shader écrit |
| **Netteté** | Vectoriel à toute échelle | Source de 1400 px pour un cadre de 450 px : nette jusqu'à dpr 3 environ ; au-delà, flou | — |
| **Fluidité** | Balayage de 9 s, Intel UHD, ANGLE D3D11, 1440 × 900 : 540 images, **médiane 16,7 ms, p95 16,7 ms, max 33,3 ms**, 1 image au-delà de 25 ms (mesuré) | Translations de 7 images composées : non mesuré, attendu au moins aussi bon que A | Un 2e contexte coûte 4 à 40 ms à chaud (kit.js:174-175) |
| **Sans WebGL, et dans la grille** | Oui | Oui | **Non.** La grille capture sans relief (cahier 020-01 §0.3) : l'éclaté y serait invisible, et il faudrait de toute façon un repli en image. |
| **Téléphone** | À l'échelle 0,56, le prototype **déborde** à 390 px (capture) : il faut des vecteurs plus courts et une échelle d'environ 0,35 | Les calques suivent la taille du cadre ; une variante de 700 px est à mesurer | Rien (bureau seulement) : repli en image |
| **Mouvement réduit** | Éclaté fixe, étiquettes visibles | Idem | Idem |
| **Justesse** | Ordre de profondeur calculé par le navigateur | Ordre des calques **fixe**. Mesuré (`ecart.json`) : éclaté complet = vrai rendu à **0,88 %** de pixels écartés (> 24 niveaux). Assemblé : **9,33 %**, là où la marche ombre la contremarche et à la jonction avec le limon (`ecart-p0.jpg`). **D'où un fondu enchaîné entre le rendu assemblé complet et les calques sur les premiers pourcents.** | — |
| **Licence** | Aucune image | Géométrie et bois procéduraux : aucun crédit, aucun partage à l'identique. À l'inverse, `heros-escalier` est en CC BY-SA 4.0 (attributions.json) ; c'est ce qui compte, puisque la vidéo de la landing filme la démo. | — |
| **Qui produit** | Codex (pas de sous-processus nécessaire) | Antigravity lance Blender : 9 rendus en **2 min 35 s** (log). Codex intègre ensuite les fichiers. | — |

**Recommandation : B**, pour la matière (C6 est à 4 et la barre à 5), avec les étiquettes et les cotes en **HTML/SVG** (texte net, lisible par un lecteur d'écran) placées aux points projetés que Blender calcule.

**A est le plan de secours** si la chaîne Blender bloque. Il peut aussi servir au téléphone si la variante de 700 px pèse trop.

**À régler dans le script de rendu :**
- teinte du chêne ;
- ombre douce au sol par pièce (calque d'ombre séparé ou `drop-shadow`) ;
- graine de Cycles fixée, et un double rendu comparé pour prouver le déterminisme (non vérifié ici).

### 3.4 Chorégraphie proposée (bureau, étapes épinglées)

**Le cadre**
- Le cadre de la photo est fixe pendant tout l'épinglage : (72, 470), 450 × 338 px, aux quatre avancées mesurées (`etapes.json`).
- Les étapes font 2 700 px de haut à 1440 × 900.
- La photo est déjà animée sur `--etapes` (kit.css:1116). Le cadre est donc déjà chorégraphié ; seul son contenu change.

**Les tranches.** Les étapes portent `--k` = 0,037 / 0,287 / 0,537 / 0,787 (index.html) : quatre quarts.

| Tranche | Étape | Ce que fait la marche |
|---|---|---|
| 0 → 0,25 | 01 Prise de contact | Marche assemblée (rendu complet), rapprochement lent de 1 → 1,03 |
| 0,25 → 0,5 | 02 Visite technique | Les cotes se tracent en SVG (épaisseur 40 mm, giron) |
| 0,5 → 0,75 | 03 Plan et devis | Éclatement `--p` 0 → 1 sur les 60 premiers pourcents, puis les étiquettes entrent une à une (décalage de 60 ms). Fondu assemblé → calques sur `--p` 0 → 0,06. |
| 0,75 → 1 | 04 Fabrication et pose | Remontage `--p` 1 → 0 : limon, marche, contremarche d'abord, tourillons ensuite, **coins en dernier** (ils serrent) ; retour au rendu complet |

**Hors du bureau épinglé** (téléphone, ou navigateur sans `view()`, kit.js:233)
- L'objet prend la place de la photo en tête des étapes (à ≤ 959 px, la photo est en `100vw`, attribut `sizes` de index.html).
- Il s'éclate **une fois** à l'entrée à l'écran : classe `.vu` du dévoilement existant (kit.js:157-164), transition d'environ 1,2 s. Il reste éclaté, étiquettes visibles.
- Pas de bouton.

---

## 4. Placement dans la page et retenue (C7)

Plan mesuré à 1440 × 900 (`etapes.json`) :

| Scène | Haut (px) | Hauteur (px) |
|---|---|---|
| Ouverture | 0 | 1 888 |
| Prestations | 1 888 | 1 125 |
| Atelier | 3 013 | 900 |
| Réalisations | 3 913 | 1 656 |
| Communes | 5 569 | 509 |
| Étapes | 6 078 | 2 700 |
| Questions | 8 778 | 743 |
| Contact | 9 520 | 902 |

- **Survol → prestations** : on remplace l'effet existant, on n'en ajoute pas.
- **Objet décomposé → étapes** : il remplace une photo répétée. `tournage-copeaux` apparaît deux fois (vignette de la prestation 01 et photo des étapes : 4 occurrences de `tournage-copeaux-960.webp` dans index.html, 2 par `<picture>`).
- **Aucune scène, aucun bouton, aucun défilement ajoutés.** Le récit devient : ce que je fabrique (survol) → l'atelier → les pièces livrées → comment ça se passe, avec la marche qu'on démonte et remonte.
- **Écarté : une scène « Anatomie » entre l'atelier et les réalisations.** Le récit y serait bon (« Je trace, débite, assemble… »), mais c'est un épinglage de plus, après le héros collant, le travelling et les étapes.

---

## 5. Découpage suggéré (périmètres disjoints)

**021-S (Codex) — survol des prestations**
- Périmètre : un bloc balisé en fin de `_kit/kit.css`, une section balisée dans `_kit/kit.js`, et `prestaScene` dans `generer.mjs` (l. 489-494, pour le lien étiré).
- **Conflit possible** avec toute autre tâche de la vague 5 qui touche `kit.css` ou `kit.js` : blocs balisés et fusion par l'orchestre.
- Juge : `scripts/survol-qa.mjs`, critères du §2.

**021-O1 (Antigravity) — rendu Blender**
- Script `scripts/eclate-marche.py`.
- Sorties : `public/sites-demo/lestraque/eclate/` (rendu assemblé, calques AVIF, `eclate.json` avec vecteurs, ancres d'étiquettes et de cotes).
- Juge : poids ≤ 40 Ko pour l'ensemble (plafond proposé) ; alpha présent ; composite éclaté contre vrai rendu ≤ 1 % de pixels écartés (méthode `diff0.mjs`) ; double rendu identique.

**021-O2 (Codex, après O1) — intégration dans les étapes**
- Périmètre : `generer.mjs` (emplacement `etapesPhoto`, l. 477 ; da.json:8 `etapesPhoto`) et un bloc balisé de `kit.css` (timeline `--etapes`).
- Juge : `scripts/eclate-qa.mjs`.
  - Captures aux quatre tranches ; calques à ±2 px des vecteurs du JSON.
  - Étiquettes lisibles (contraste ≥ 4,5 sur le noir `#14110E`).
  - 390 px : l'objet tient dans le cadre, rien ne déborde.
  - Mouvement réduit : état éclaté fixe.
  - Lighthouse mobile médiane ≥ 95.
  - `site-qa`, `demo-usage-qa`, `nav-retenue-qa` et la vidéo (`video-qa --profil=landing`) restent verts.

---

## 6. Ce qui n'est pas établi

- **Clavier et téléphone chez MotionSites** : aucun aperçu ne le montre (ce sont des films au curseur).
- **Courbes des références MotionSites** : non mesurables à 15 images/s. Seules les durées le sont (±67 ms).
- **Termes de menuiserie** « coins de serrage » et « tourillons » : non sourcés.
- **Poids au téléphone** de la voie B (variante 700 px), **fluidité** de B, **déterminisme** des rendus Cycles : non mesurés.
- **Lighthouse** : aucune des deux voies n'a été mesurée dans la démo (prototypes hors page).
