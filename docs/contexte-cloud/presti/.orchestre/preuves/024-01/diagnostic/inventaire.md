# 024-01 — Inventaire des effets animés du kit et des familles (démo Lestraque)

Relevé du 16/09/2026, dépôt à `1620723`, aucun changement local sous `public/sites-demo/`.
Les numéros de ligne renvoient aux sources commentées : `_kit/kit.css`, `_kit/kit.js`, `_kit/relief*.js` et `_kit/familles/*`.
Le site en ligne n'embarque pas ces commentaires (`generer.mjs:367`), d'où des lignes différentes dans `styles.css`.
Familles actives de Lestraque, dans l'ordre d'assemblage : `recit, video, survol, eclate, telephone` (`da.json`).

## Méthode

1. **Lecture complète** de `kit.css`, `kit.js`, `relief.js`, `relief-fil.js`, de toutes les familles et des parties de `generer.mjs` qui émettent le HTML et les feuilles.
   J'ai lu `generer.mjs` de la ligne 1 à 70, puis de 240 à la fin.
2. **Contrôle de ce qui est émis** sur les pages déjà générées. Pour chaque classe animée, j'ai compté ses occurrences avec grep dans `index.html`, `menuisier-rennes/` et `mentions-legales/`.
   J'ai aussi vérifié que la copie en ligne correspond au kit actuel. `site.js` vaut exactement `kit.js + recit.js + video.js + survol.js`. `bureau.css` et les deux `relief*.js` sont identiques au kit. `styles.css` contient `kit.css` sans commentaires, suivi de `eclate.css` et de `telephone.css`.
3. **Contrôle croisé mesuré** : `document.getAnimations()`, animations calculées d'éléments témoins, état posé par `site.js` et requêtes réseau.
   - Script : `inventaire-controle.mjs`.
   - Sortie : `inventaire-controle.json`, relevée le 2026-09-16 à 19:10:59Z sous Chromium 153.0.8010.12 et Playwright 1.63.0.
   - Aucune mesure de temps. Aucun processus `-qa.mjs` ne tournait au lancement.
   - Profils : Chromium 390×844 natif (géométrie `iPhone 13`), `iPhone 13` sans animation-timeline (tel que défini, puis corrigé, voir §0), `Pixel 7` natif et bureau 1440×900.
   - Copies générées par `generer.mjs lestraque --sortie=.orchestre/travail/024-01/inventaire/…`, puis supprimées à la fin.
   - Pages relevées : l'accueil, `menuisier-rennes/` et `mentions-legales/`, chacune défilée jusqu'en bas par pas de 200 px.

Les résultats du profil Pixel 7 (412×839) sont identiques à ceux de Chromium 390×844, animation par animation, sur les trois pages.

## 0. Constat bloquant : le profil « iPhone sans animations liées au défilement » tel que défini ne retire rien

La réécriture prescrite, `@supports (animation-timeline: --non-supporte())`, **reste VRAIE sous Chromium 153**.
`--non-supporte()` est une fonction à tirets, que Chromium accepte au moment de l'analyse, comme `var()`.
Sonde `inventaire-sonde-supports.mjs`, sortie `inventaire-sonde-supports.json` :

| Condition | Résultat mesuré |
|---|---|
| `@supports (animation-timeline: --non-supporte())` appliqué | **true** |
| `CSS.supports("animation-timeline: --non-supporte()")` (fonction d'origine) | **true** |
| `@supports (animation-timeline: nonsupporte-sans-tirets())` appliqué | false |
| `@supports (animation-timeline-inexistante: view())` appliqué | false |
| `@supports (animation-timeline: view())` appliqué | true |

Conséquence mesurée sur l'accueil, en 390×844 après défilement complet :
- Profil prescrit (`--non-supporte()`, 13 blocs réécrits dans `styles.css` et 2 dans `bureau.css`) : **38 animations CSS, exactement les mêmes que Chromium natif**. On y trouve 15 `telephone-mot`, 4 `telephone-verbe`, 3 `jauge`, 9 `telephone-apparait`, 4 `telephone-eclate`, 1 `telephone-efface` et les 2 animations du héros.
- Dans ce profil, seul `CSS.supports` côté JS répond faux. Or tous les tests JS sur animation-timeline exigent aussi au moins 1 024 px de large : au téléphone, ce profil est donc identique au natif.
- Profil corrigé (mêmes 13 + 2 blocs réécrits en `@supports (animation-timeline-inexistante: view())`) : **2 animations** (`signature-tourne-2`, `signature-projecteur`). Plus aucune jauge, plus de citation, de verbes ni d'éclaté. Côté réseau, `eclate/eclate.avif` remplace `assemble.avif` et les 4 calques.

**À corriger dans la définition du profil** : réécrire en `@supports (animation-timeline-inexistante: view())`, ou avec toute fonction invalide sans tirets. Toute mesure faite sur le profil prescrit vaut une mesure du profil natif.
La colonne « sans animation-timeline » ci-dessous vient du profil corrigé.

Deux autres écarts avec la consigne :
- Le descripteur Playwright `iPhone 13` a un viewport de **390×664** (écran 390×844, dpr 3, tactile, UA iOS 15 / Version 26.6). La consigne dit 390×844, et c'est ce que j'ai imposé.
- Les seuils de hauteur du kit sont 560 px (téléphone) et 680 px (bureau seulement). 664 et 844 donnent donc les mêmes règles.
- Le profil ne neutralise qu'animation-timeline. Tout le reste que Chromium prend en charge reste actif : `interpolate-size`, `::details-content`, `@starting-style`, `:has()`, `content-visibility`, `mix-blend-mode`, `mask`.
- La prise en charge réelle de ces propriétés par WebKit n'a pas été vérifiée ici.

## 1. Ce que `generer.mjs` émet, et ce qui n'existe qu'au bureau

| Élément | Où c'est émis | Au téléphone (390–767 px) |
|---|---|---|
| `styles.css` = polices + jetons + `kit.css` + `eclate.css` + `telephone.css`, sans commentaires | `generer.mjs:367-371`, lié sans media `:453` | appliqué |
| `bureau.css` = `recit` + `video` + `survol` + `eclate` `.bureau.css` | assemblé `:369-370`, lié avec `media="(min-width: 1024px)"` `:454`, écrit `:924` | **téléchargé** (requête mesurée dans les 3 profils téléphone), **jamais appliqué** |
| `site.js` = `kit.js` + `recit.js` + `video.js` + `survol.js`, séparés par `\n;\n` | `:926-927`, `<script defer>` sur toutes les pages et à toutes les largeurs `:455` | chargé ; chaque effet de bureau se coupe lui-même par `matchMedia` |
| `relief.js` (module) et `relief-fil.js` (Worker) | copiés si `da.relief` `:928` ; attributs `data-relief*` sur le héros à toutes les largeurs `:652-661, 673` | **aucune requête** (mesuré). `kit.js:183` exige `(min-width:1024px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)`, plus IntersectionObserver, ResizeObserver, Worker, WebGL et OffscreenCanvas. Au bureau headless : `relief-fil.js` est demandé, `data-relief-etat="sans"`, et `relief.js` n'est jamais injecté |
| Vidéo d'atelier (`video/atelier.av1.mp4`, `.h264.mp4`) | **aucun HTML** (`video.mjs`). L'élément est créé par `video.js:78-110` après `load` et à l'approche de `#atelier` | **aucune requête** (mesuré). `video.js:9-10` : ≥ 1 024 px, mouvement permis, pas d'économie de données. Au bureau : `atelier.av1.mp4` demandé, `<video>` créé (mesuré) |
| Relevé `eclate/releve.avif` | fond CSS seulement, `eclate.bureau.css:96`, une fois `.etapes__tete.vu` posé | jamais demandé. Au bureau : demandé (mesuré) |
| Calques de l'éclaté (`assemble.avif`, 4 `calque-*.avif`) et `eclate.avif` | `eclate.mjs:109, 146` (`loading="lazy"`) | Chromium natif : assemble et 4 calques. Profil corrigé : `eclate.avif` seul (mesuré) |
| Classes de `<html>` : `texture--papier da--etapes da--communes da--nav-retenue da--signature` | `generer.mjs:437` | présentes sur toutes les pages |
| `.ouverture` (héros + plateau dans un même parent) | `generer.mjs:710`, accueil seulement | présent mais sans style : il ne sert que dans `@supports view()` au bureau, et aux sélecteurs `telephone.css` T1-T2 |
| Titres en mots masqués `.ml > .ml__in` | `generer.mjs:28, 497` (`da.scenes`) | présents, en ligne (`kit.css:1069`) : inertes |
| Travelling et compteur | `generer.mjs:561, 570`, accueil seulement. Les pages communes sont en rangée (`:761`, `travelling:false`) | présents, sans effet (le compteur est en `display:none`, `kit.css:592`) |
| Jauges des 3 rails | `:547` (prestations), `:565` (réalisations), `:531` (étapes, si `etapesMonumentales`) | visibles seulement avec `@supports scroll()` |
| Spans de `recit` : `citation__mot`, `chiffre__vrai`, `chiffre__compte`, `atelier__verbe` | `recit.mjs:15-32`, via les crochets `generer.mjs:553, 648` | présents. `telephone.css` anime `citation__mot` et `atelier__verbe`. `chiffre__compte` reste vide |
| Figure de l'éclaté, légende, compteur 01/04 | `eclate.mjs:98-153`, via `etapesMedia` `generer.mjs:530-531`. La figure est **dans** `.etapes__tete.reveal` | présents |

Éléments stylés par le kit mais **jamais émis** sur Lestraque (mesuré par grep, 0 occurrence) : `.hero__indice`, `.carte`, `.bande` (halo `orbite`), `.entre`, `.section--sombre`, `da--raccords`, `.hero__tel`.
Lestraque passe par `da.scenes` : son contact est une `.contact` et non une `.bande`, et ses pages communes ont toutes un bandeau.

## 2. Tableau complet

Légende de la colonne « Déclencheur » :
- **Temps** : horloge du document.
- **view() / scroll()** : animation liée au défilement.
- **IO** : IntersectionObserver.
- **Défil. JS** : écouteur `scroll` + rAF.
- **Survol / tap** : `:hover`. Sans `@media (hover)`, un tap le rend collant sur écran tactile.

Légende des colonnes de sort au téléphone :
- **ACTIF** : l'effet joue.
- **TAP** : l'effet ne joue qu'à une interaction.
- **ABSENT** : conditions non remplies.
- **REMPLACÉ** : écrasé par une règle plus spécifique ou plus tardive.
- **NEUTRALISÉ** : la même feuille annule l'effet sur Lestraque.
- **MORT** : élément non émis.
- « (m) » : confirmé par la mesure du §Méthode.

Abréviations des conditions :
- **NP** = `prefers-reduced-motion: no-preference`, ou `!reduit` dans le JS.
- **js** = `html.js`.
- **@v** = `@supports (animation-timeline: view())`.
- **@s** = `@supports (animation-timeline: scroll())`.
- **CS** = `CSS.supports('animation-timeline: view()')` dans le JS.

En mouvement réduit, `kit.css:258-266` ramène toute animation et toute transition à 0,001 s et coupe `.reveal`, `.mot` et les images du héros. Ce n'est pas répété ligne par ligne.

### 2.1 `kit.css` et `kit.js` — navigation, menu, interactions

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| K1 | Nav « solide » : fond et ombre en transition de 0,45 s | nav, toutes pages | kit.css:37, 51 ; kit.js:15-18 | Défil. JS (scrollY > 40) | aucune | ACTIF (m) | ACTIF (m) | actif |
| K2 | Nav en deux couches, beige et noir translucide, découpées au pixel sur la scène sombre dessous (clip-path, opacité 0,3 s, couleur 0,25 s) | nav, pages avec `[data-nav="sombre"]` (accueil, communes) | kit.css:975-984 ; kit.js:72-110 | IO (rootMargin = bande de la nav) + Défil. JS (écouteur en capture, rails compris) | IO | ACTIF (m : `nav--bande nav--sombre`) | ACTIF (m) | actif |
| K3 | Soulignement des liens de nav au survol | nav | kit.css:43-44 | Survol | `.nav__liens` visible ≥ 960 px (kit.css:41, 55) | ABSENT | ABSENT | actif |
| K4 | Pilule de verre des liens de nav (fond et bordure, 0,45 s) | nav sur le héros | kit.css:992-995 | changement `.solide` | ≥ 960 px | ABSENT | ABSENT | actif |
| K5 | Pilule « Devis » : levée de 2 px au survol, masquée quand le menu est ouvert | nav | kit.css:48-49, 999-1003 | Survol / tap, clic menu | visible au téléphone ≤ 959 px | TAP | TAP | survol |
| K6 | Barre retenue : « Devis » de la nav et bouton du héros se passent le relais (opacité et translate, 240 ms) | nav + héros, accueil et communes | kit.css:56-65 ; kit.js:19-53 | IO + Défil. JS + `animationend` du héros | `da--nav-retenue`, ≥ 960 px (CSS et JS), IO | ABSENT (m : pas de `nav--retenue`) | ABSENT | actif (m : `nav--retenue nav--appel`) |
| K7 | Burger → croix (0,35 s), grossissement au survol | nav | kit.css:66-72 | clic / survol | burger caché ≥ 960 px sous `da--nav-retenue` (kit.css:58) | TAP | TAP | absent |
| K8 | Panneau du menu (glisse de −8 % et fondu), liens qui glissent au survol, voile | menu | kit.css:73-77, 383-387 ; kit.js:143-155 | clic | burger visible | TAP | TAP | absent (burger caché) |
| K9 | Bouton pilule : levée, cercle qui tourne de 45°, pression à 0,97 | héros, contact, menu | kit.css:124-129 | Survol / tap / `:active` | aucune media | TAP | TAP | survol |
| K10 | Communes : nom et flèche qui glissent (0,45 à 0,6 s), couleur | `#communes`, accueil et communes | kit.css:190-195, 304-306 | Survol / tap | aucune media | TAP (collant) | TAP | survol |
| K11 | FAQ : couleur au survol, « + » qui tourne de 45°, ouverture en hauteur (`::details-content` + `interpolate-size`, 0,45 s), une seule question ouverte | `#questions`, accueil | kit.css:6, 200-206 ; kit.js:257-261 | clic / toggle | 1re question ouverte d'emblée seulement ≥ 960 px (kit.js:260) | TAP (m : aucune ouverte d'emblée) | TAP | actif, 1re ouverte (m) |
| K12 | Champs du devis : bordure et fond en transition 0,3 s | `#contact` | kit.css:407, 410-411 | survol / focus | — | TAP | TAP | actif |
| K13 | Pied : couleur des liens (0,3 s) | pied | kit.css:228-229 | Survol / tap | — | TAP | TAP | survol |
| K14 | Ancres en défilement doux ; confirmation du devis puis `scrollBy` doux | toutes pages / `#contact` | kit.js:246-255, 263-294 | clic / submit | `smooth` sauf NP | TAP | TAP | actif |

### 2.2 `kit.css` et `kit.js` — héros, dévoilements, scènes

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| K15 | Indice de défilement (trait qui pulse, `indice` 1,8 s) | héros | kit.css:95-98 | Temps | ≥ 960 px | MORT (non émis) | MORT | mort |
| K16 | Titre mot à mot `.mot` (`motIn` 0,7 s, délai 0,2 s + 0,05 s par mot) | h1 des pages légales ; h1 des héros pleins | kit.css:99-103 ; neutralisé kit.css:332 dans `.hero--plein` | Temps | js | légales : ACTIF (m : `motIn`×2). Accueil et communes : NEUTRALISÉ (m) | idem (m) | idem (m) |
| K17 | `.hero .entre` (entrée décalée 0,9 s) | héros scindé, aplat, pages | kit.css:104-105 | Temps | js | MORT (0 occurrence) | MORT | mort |
| K18 | Poussée lente de la photo du héros `pousse` (scale 1 → 1,06, 20 s aller-retour) | héros plein, toutes pages à héros plein | kit.css:322-323 | Temps | js, toutes largeurs | pages communes : ACTIF (m : `pousse`). Accueil : REMPLACÉ par T1 (m) | communes : ACTIF (m). Accueil : REMPLACÉ (m) | communes : actif (m). Accueil ≥ 34/25 : combiné avec K46 (m) |
| K19 | Héros téléphone : dérive verticale `derive-tel` (12 s), puis `derive-tel-haut` | héros de l'accueil | kit.css:695-700, 939-942 | Temps | ≤ 767 px, NP, js, `:not(.hero--commune)` ; `-haut` : min-height 560 | REMPLACÉ par T1, plus spécifique (0,6,2) contre (0,4,2) : MORT sur Lestraque tant que `telephone` est actif (m) | idem (m) | absent |
| K20 | Héros de bureau : titre qui se lève ligne à ligne sous son masque (`lever`), pied en fondu (`entre`), chapeau qui monte | héros plein (accueil, communes) | kit.css:336-348 | Temps | ≥ 1 024 px, NP, js | ABSENT | ABSENT | actif (m : `lever`×2, `entre`×2) |
| K21 | Parallaxe JS de l'image du héros (translate y × 0,16) | héros plein | kit.js:221-226 ; suivie par la toile relief.js:156 | Défil. JS | ≥ 900 px, NP, et pas (chorégraphie et héros dans `.ouverture`) | ABSENT (m : pas de translate) | ABSENT (m) | pages communes : actif **en plus** de `pousse` (m : `translate: 0px 144px`). Accueil : seulement sans view() |
| K22 | Dévoilement `.reveal` (IO → `.vu` ; fondu + montée de 44 px en 0,55 s, cascade de 70 ms). La règle de base (0,95 s, 30 px, kit.css:250) est toujours recouverte : par kit.css:1072 sans préférence, par kit.css:262 (aucun dévoilement) en mouvement réduit | presque tous les blocs : 29 à l'accueil, 13 sur une commune (m) | kit.css:249-252, 1070-1073 ; kit.js:157-164 (seuil 0,12, marge −6 % ; photos de galerie seuil 0) | IO + transition | js, IO, NP. Au bureau chorégraphié, remplacé par K35 | ACTIF (m : 23 `.vu` sur 29). Neutralisé : lignes du rail des prestations (kit.css:555), photos de galerie (kit.css:600), citation du plateau quand view() est pris en charge (telephone.css:37, m) | ACTIF (m : 23 sur 29). La citation entre en fondu (m : transition opacity et transform 0,55 s) | remplacé par `monte` (m) |
| K23 | Étapes : ligne qui avance (`--avancee`) et pastille `.etape.vu` | `#etapes` | kit.css:177-183 | Défil. JS / IO | pseudo-éléments mis en `content:none` par `da--etapes` (kit.css:287) | NEUTRALISÉ | NEUTRALISÉ | la jauge revient en K37 |
| K24 | Étapes monumentales : chaque grand numéro s'allume (opacité 0,55 → 1 sur le noir, transition 0,6 s) quand `--avancee` atteint `--k` | `#etapes`, accueil (rail horizontal au téléphone) | kit.css:289-290, 529 ; kit.js:228-240 | Défil. JS (rAF) + IO de proximité (marge 25 %) | `da--etapes`, IO. JS coupé si chorégraphie + `#etapes` + min-height 680 (kit.js:233) | ACTIF (m : `--avancee` = 1.000 en bas de page). La progression est verticale, pas le geste du rail | ACTIF (m) | remplacé par K37 |
| K25 | Rail des prestations : jauge liée au défilement horizontal (`jauge` scaleX 0,17 → 1) | `#prestations`, accueil et communes | kit.css:533, 552, 560-566 | scroll() (`--presta inline`) | ≤ 767 px, @s | ACTIF (m) | ABSENT (m : `display:none`) | absent |
| K26 | Prestations : titre qui glisse de 1,2 vw au survol | `#prestations` | kit.css:460-465 | Survol | ≥ 900 px | ABSENT | ABSENT | survol |
| K27 | Prestations : numéro en fondu au survol | `#prestations` | kit.css:538, 549 (remis à 1 kit.css:1040) | Survol | ≥ 900 px / ≥ 1 024 px, hover:hover, pointer:fine | ABSENT | ABSENT | survol |
| K28 | Prestations : vignette qui s'ouvre au survol (clip-path 0,55 s, scale 1,2 → 1) | `#prestations` | kit.css:542-549, 1036-1041 | Survol CSS | ≥ 1 024 px, hover:hover, pointer:fine ; repris par S1 quand `survol.js` joue | ABSENT (vignette fixe en tête de carte, kit.css:724-731, 854) | ABSENT | accueil : remplacé par S1 (m : `scene--survol`). Pages communes (section sans `id="prestations"`) : actif |
| K29 | Photo de l'atelier qui dérive (`derive` ±5 %, scale 1,12) | `#atelier`, accueil | kit.css:580-585 | view() | ≥ 1 024 px, NP, @v | ABSENT (m) | ABSENT | actif (m) ; en pause sous la vidéo (V1) |
| K30 | Réalisations : dévoilement photo par photo (clip 16 % → 0 en 0,6 s, image 1,1 → 1 en 1 s, légende en fondu ; cascade de 70 ms ≥ 768 px) | `#realisations`, accueil et communes | kit.css:600-606, 613 ; kit.js:162 | IO (seuil 0) + transition | js, IO | ACTIF (dans le rail, au geste : IO horizontal) | ACTIF | actif (délai en cascade) |
| K31 | Réalisations : zoom à 1,04 au survol | `#realisations` | kit.css:607 (kit.css:152-153, en dessous par spécificité) | Survol | hover:hover | ABSENT | ABSENT | survol |
| K32 | Travelling épinglé : la rangée défile en translateX, compteur 01/05 à crans, images qui glissent (`glisse` ±4 %) ; hauteurs 184svh… | `#realisations`, accueil | kit.css:626-650, 750-765, 814-819, 958-971, 1029-1034 | view-timeline `--travelling` | ≥ 1 024 px, NP, @v | ABSENT (m) | ABSENT | actif (m : `travelling`, `glisse`×4) |
| K33 | Pilote du travelling : compteur sur la photo centrale (transition 0,55 s), légende seulement si la photo est entière | `#realisations` | kit.css:968-969 ; kit.js:112-141 | Défil. JS (rAF) + IO | ≥ 1 024 px, NP, CS, IO | ABSENT (m) | ABSENT | actif (m : `.pilote`) |
| K34 | Relief 3D du travelling : rotateY ±6°, recul de 48 px, ombre et côté assombri (transitions 0,45 s) | `#realisations` | kit.css:1207-1213 ; kit.js:119-135 | Défil. JS (rAF) | ≥ 1 024 px, hover:hover, pointer:fine, NP, @v, CS | ABSENT | ABSENT | actif à la souris |
| K35 | Dévoilement lié à la position (`monte` : 3 rem et opacité ; les paragraphes des blocs titrés montent seuls) | tous les `.reveal` | kit.css:1093-1099, 1133 | view() | ≥ 1 024 px, NP, @v, js | ABSENT (K22 joue) | ABSENT (K22 joue) | actif (m : `monte`×19 à l'accueil) |
| K36 | Titres de scène mot à mot sous leur masque (`mot-leve`, cascade de 3 %) | h2 des scènes, accueil et communes | kit.css:1086-1091, 1132 ; balisage generer.mjs:28 | view-timeline `--titre` | ≥ 1 024 px, NP, @v | ABSENT (m : `.ml__in` inline) | ABSENT (m) | actif (m : 20 à l'accueil, 15 sur une commune) |
| K37 | Étapes épinglées : section de 300svh, numéros (`etape-num*`) et corps (`etape-corps*`) sur leur tranche, jauge verticale (`jauge-v`) | `#etapes`, accueil | kit.css:1107-1126, 1135-1145 | view-timeline `--etapes` | ≥ 1 024 px, **min-height 680 px**, NP, @v | ABSENT | ABSENT | actif (m) |
| K38 | Ouverture : héros collant, plateau noir qui monte avec son ombre, texte qui se lève et s'efface (`ouverture-texte`), photo à 1,08 (`ouverture-photo`), voile (`ouverture-voile`) | héros + plateau, accueil | kit.css:1075-1084, 1129-1131 | view-timeline `--plateau` | ≥ 1 024 px, NP, @v | ABSENT (m) | ABSENT | actif (m) |
| K39 | Photos qui glissent dans leur cadre (`glisse-cadre` ±6 %, scale 1,14) : plateau, questions, contact (photo des étapes : annulée par eclate.css:12) | plateau, `#questions`, `#contact` | kit.css:1101-1105, 1134 | view() | ≥ 1 024 px, NP, @v | ABSENT (m) | ABSENT | actif (m : 3 à l'accueil) |
| K40 | Rail des étapes : jauge (`jauge`) | `#etapes`, accueil | kit.css:845-852 | scroll() (`--etapes inline`) | **≤ 759 px**, @s, `da--etapes` | ACTIF (m) | ABSENT (m) | absent |
| K41 | Rail des réalisations : jauge (`jauge`) | `#realisations`, accueil et communes | kit.css:856-864 | scroll() (`--galerie inline`) | ≤ 767 px, @s | ACTIF (m) | ABSENT (m) | absent |

### 2.3 Relief WebGL et moment signature (`kit.css` v27-v29, `relief.js`, `relief-fil.js`)

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| K42 | Toile du relief : fondu d'apparition (0,7 s), `pousse` comme la photo, photo cachée à la fin du fondu | héros, accueil | kit.css:1154-1156 ; relief.js:80-93 | Temps, après `load` + temps libre | kit.js:183 (≥ 1 024 px, hover fine, NP, API) + sonde WebGL matériel dans le worker **et** sur le fil principal (renderer logiciel refusé, relief-fil.js:84, 234-238, 289-303), réponse en moins de 4 s | ABSENT (m : aucune requête) | ABSENT | selon le GPU (headless : `sans`, m) |
| K43 | Shader au repos : bord surbalayé et spirale creusée (intro 0,7 + 1,8 s), point de vue suivant la souris (amorti), lumière tournante, dérive seule (23 s / 31 s) | héros, accueil | relief-fil.js:104-158 ; relief.js:142-147 | Temps (rAF du worker ; plafonds écrits dans le code : 30 img/s au repos, 60 en mouvement) + pointermove + Défil. JS (`defile`) | K42. **Lestraque** : `data-relief-calme` coupe dérive et ondulation, `data-relief-lumiere-css` éteint la lumière (relief-fil.js:129-135, generer.mjs:654-657). Restent l'intro, le creux et le suivi de la souris. Arrêt hors écran, héros couvert ou onglet caché (relief.js:119-139) | ABSENT | ABSENT | selon le GPU |
| K44 | Texture 2880 chargée 3,1 s après « prêt » | héros | relief-fil.js:161-198 | Temps | K42, et **pas** `saveData` (relief.js:115) | ABSENT | ABSENT | selon le GPU |
| K45 | Descente de la caméra dans le shader (δ = dmax × scrollY / (0,30 × hauteur)) | héros, accueil | relief.js:94-102, 137 ; relief-fil.js:139-140, 206-214 | Défil. JS | K42 + `da--signature` + CS + ≥ 1 024 px + NP + réglage `data-relief-descente` + **WebGL 2 et texture 2880 téléversée** (sinon δ = 0) | ABSENT | ABSENT | selon le GPU ; δ = 0 sans view() |
| K46 | Signature au repos : la cage tourne (`signature-tourne-2` ±2,25° à partir de 34/25 ; `-4` ±4° à partir de 16/10 ; 10 s aller-retour) + `pousse`, sur la photo et la toile | héros, accueil | kit.css:1157-1179 | Temps | ≥ 1 024 px, min-aspect-ratio 34/25 (resp. 16/10), NP, `html.js.da--signature .ouverture>.hero--plein` | ABSENT (version téléphone : T1) | ABSENT | actif (m : `pousse, signature-tourne-4` en 1440×900) |
| K47 | Signature : projecteur conique qui tourne (`signature-projecteur` 9 s, −2,5 s, soft-light) | héros, accueil | kit.css:1181-1188 | Temps | ≥ 1 024 px, 34/25, NP, js, `da--signature` | ABSENT (version téléphone : T2) | ABSENT | actif (m) |
| K48 | Descente CSS : plateau poussé de 30svh, zoom 1,04 vers l'œil (`descente-palier`), surtitre et pied effacés (`descente-efface`) | héros, accueil | kit.css:1189-1206 | scroll(root) + view-timeline `--plateau` | ≥ 1 024 px, NP, @v, `da--signature` | ABSENT (m) | ABSENT | actif (m) |

### 2.4 Famille `recit` (`recit.bureau.css`, `recit.js`, `recit.mjs`)

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| R1 | Citation mot à mot, 0,55 → 1 (`citation-allume`), reveal de la figure neutralisé | plateau, accueil | recit.bureau.css:11-13, 34 ; spans recit.mjs:15-18 | view-timeline `--citation` | bureau.css (≥ 1 024 px), NP, @v, js | ABSENT (version téléphone : T3) | ABSENT | actif (m : 15) |
| R2 | Quatre verbes de l'atelier : s'allument et remontent de 0,12 em (`verbe-allume`) | `#atelier`, accueil | recit.bureau.css:17-18, 35 ; recit.mjs:28-32 (garde :35-39) | view-timeline `--phrase` | idem | ABSENT (version téléphone : T4) | ABSENT | actif (m : 4) |
| R3 | Chiffres : attente à opacité 0, entrée (`chiffres-entre` 0,55 s), comptage de 0 à la valeur en 1,3 s décéléré ; filet de 4 s | plateau, accueil | recit.bureau.css:20-32, 36 ; recit.js:6-88 | Temps (rAF), lancé par IO (marge 10 %) + écouteurs scroll/pointermove + opacité calculée du dernier mot ≥ 0,98 + bloc entier à l'écran | ≥ 1 024 px (JS et CSS), NP, **CS**, IO ; valeurs entières seulement (recit.js:16-17) | ABSENT (m : classe `chiffres` seule) | ABSENT | actif (m : `chiffres--attente` puis `chiffres--entre`) |

### 2.5 Famille `video` (`video.bureau.css`, `video.js`, `video.mjs`)

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| V1 | Mains qui poncent en vidéo, fondu d'entrée de 0,55 s ; la dérive de la photo se met en pause ; lecture à partir de 60 % de couverture une fois les verbes pleins, pause et retour au début sous 20 % | `#atelier`, accueil | video.bureau.css:9-12 ; video.js:22-39, 41-59, 78-120 | IO (marge 100 %) après `load` + temps libre ; Défil. JS ; `playing` ; `transitionend` de la phrase (video.js:108) | ≥ 1 024 px et NP (JS), pas de `saveData`, IO. **Aucun test CS** : sans view(), les verbes sont pleins dès la fin du reveal de la phrase | ABSENT (m : ni élément ni requête) | ABSENT | actif (m : `<video>` créé, AV1 demandé) |
| V2 | Bouton pause : entrée en fondu (`@starting-style`), fond au survol, anneau de focus | `#atelier`, accueil | video.bureau.css:17-27 ; video.js:60-69, 101-103 | création / survol / clic | V1 | ABSENT | ABSENT | actif |

### 2.6 Famille `survol` (`survol.bureau.css`, `survol.js`)

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| S1 | Grand aperçu au-dessus de la ligne survolée : volet clip-path du milieu (0,55 s), photo de 1,15 à 1 (0,9 s), suivi amorti (translate et rotate ±4° écrits à chaque image), sortie directionnelle (0,2 s), ouverture au clavier ; fondu de 0,2 s en mouvement réduit (`.survol--calme`) | `#prestations`, accueil (sélecteur `#prestations` : pas sur les communes) | survol.bureau.css:12-47 ; survol.js:4-125 (préchargement des 720 px par IO :26-35) | Survol (`pointerover`/`pointermove`, souris seulement) + focus + Défil. JS / resize | ≥ 1 024 px, hover:hover, pointer:fine (JS) ; bureau.css ≥ 1 024 px | ABSENT (m) | ABSENT | actif à la souris (m : `scene--survol`) |

### 2.7 Famille `eclate` (`eclate.css`, `eclate.bureau.css`, `eclate.mjs`)

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| E0 | Profil fixe, **sans mouvement** : `eclate.avif` 4:3, pastilles numérotées, légende sur deux colonnes (placée avec la figure avant le titre sous 760 px, eclate.css:27 et kit.css:778) | `#etapes`, accueil | eclate.css:9-35 | — | partout où E1-E10 et T5 ne jouent pas | REMPLACÉ par T5 (m : `eclate__eclate` en `display:none`) | **ACTIF** (m : `eclate.avif` affiché et demandé, pastilles visibles) | remplacé par E1 |
| E1 | Grande scène : piste de 450svh, bloc épinglé, figure débordant dans la marge gauche | `#etapes` | eclate.bureau.css:15-34 | view-timeline `--etapes` (kit.css:1111) | ≥ 1 024 px, min-height 680 px, NP, @v | ABSENT | ABSENT | actif |
| E2 | Éclatement pièce par pièce (46,75 → 63,25 %) et remontage (70,94 → 87,44 %) : `eclate-ouvre/remonte/apparait/efface` sur les calques, `assemble` qui s'efface puis revient | `#etapes` | eclate.bureau.css:42-43, 115-118 | `--etapes` | E1 | ABSENT | ABSENT | actif (m) |
| E3 | Cote « 40 mm » : entrée, trait qui s'allonge (`eclate-trace`), sortie | `#etapes` | eclate.bureau.css:47-50, 120 | `--etapes` | E1 | ABSENT | ABSENT | actif (m) |
| E4 | Étiquettes : suivent leur pièce, entrent à tour de rôle (texte `eclate-leve`), sortent d'un bloc | `#etapes` | eclate.bureau.css:55-59 | `--etapes` | E1 | ABSENT | ABSENT | actif (m) |
| E5 | Compteur 01/04 à crans (`eclate-compteur`, steps(4)) | `#etapes` | eclate.bureau.css:63-64, 121 | `--etapes` | E1 | ABSENT (compteur en `display:none`, eclate.css:16) | ABSENT | actif (m) |
| E6 | Fiche de la demande qui sort vers le haut (`eclate-fiche`) | `#etapes` | eclate.bureau.css:78-83, 112 | `--etapes` | E1 + js | ABSENT (eclate.css:33) | ABSENT | actif (m) |
| E7 | Relevé au trait et rendu assemblé entrés par un volet (`eclate-volet`, remplissage none), fond `releve.avif` après `.etapes__tete.vu` | `#etapes` | eclate.bureau.css:94-96, 113 | `--etapes` (+ IO de kit.js pour `.vu`) | E1 + js | ABSENT | ABSENT | actif (m, releve.avif demandé) |
| E8 | Cote d'entaille « 17 mm » | `#etapes` | eclate.bureau.css:99-101 | `--etapes` | E1 + js | ABSENT | ABSENT | actif |
| E9 | Numéros du devis qui suivent leur pièce et se posent (`eclate-pose` 0,6 → 1) | `#etapes` | eclate.bureau.css:105, 114 | `--etapes` | E1 + js | ABSENT | ABSENT | actif (m : 5) |
| E10 | Phrase finale qui se lève (`eclate-leve` + `apparait`) | `#etapes` | eclate.bureau.css:110 | `--etapes` | E1 + js | ABSENT | ABSENT | actif (m) |

### 2.8 Famille `telephone` (`telephone.css`)

Portée commune à toute la famille : `@media (max-width:767px) and (min-height:560px) and (prefers-reduced-motion:no-preference)` (telephone.css:11), et `html.js` dans chaque sélecteur.

| # | Effet | Section / page | Fichier:ligne | Déclencheur | Conditions | Chromium 390 | Sans animation-timeline | Au bureau |
|---|---|---|---|---|---|---|---|---|
| T1 | La cage tourne : `signature-tourne-2` ±2,25°, 10 s aller-retour, pivot sur l'œil (61 %), scale 1,29 ; remplace `derive-tel-haut` et `pousse` | héros, **accueil seulement** (`.ouverture>.hero--plein:not(.hero--commune)`) | telephone.css:23 ; keyframes kit.css:1178 | **Temps** | portée + `da--signature` ; **pas de @supports** | ACTIF (m) | **ACTIF** (m) | absent |
| T2 | Projecteur conique (`signature-projecteur` 9 s, −2,5 s, rayon 180 vw, soft-light), voile du titre au-dessus | héros, accueil | telephone.css:27-29 ; keyframes kit.css:1188 | **Temps** | idem T1 | ACTIF (m) | **ACTIF** (m) | absent |
| T3 | Citation mot à mot, 0,55 → 1 (`telephone-mot`), reveal de la figure neutralisé (transition comprise) | plateau, accueil | telephone.css:35-37, 72 | view-timeline `--telephone-citation` | portée + @v | ACTIF (m : 15, reveal `transition: none`) | ABSENT (m : `none` ; la citation entre par K22, transition de 0,55 s mesurée) | absent (R1) |
| T4 | Quatre verbes : s'allument et remontent de 0,12 em (`telephone-verbe`) ; `.atelier` passe en `overflow:clip` ; voile du haut renforcé (0,66 → 0,56) | `#atelier`, accueil | telephone.css:43-45, 50, 73 | view-timeline `--telephone-verbes` | portée + @v | ACTIF (m : 4, overflow clip) | ABSENT (m : verbes fixes, `overflow:hidden`, voile de kit.css:868) | absent (R2) |
| T5 | L'éclaté s'ouvre en entrant : l'assemblé s'efface (cover 11-12 %), les calques apparaissent (10-11 %) puis partent sur leur vecteur (12-45 %), les pastilles arrivent (45-49 %). Figure en `content-visibility:auto`, boîte 4:3 | `#etapes`, accueil | telephone.css:61-69, 74-76 | view-timeline `--telephone-eclate` | portée + @v | ACTIF (m : 4 `telephone-eclate`, 9 `telephone-apparait`, 1 `telephone-efface` ; requêtes assemble + 4 calques) | ABSENT (m : E0 fixe, requête `eclate.avif` seule) | absent (E1-E10) |

## 3. Ce qui ne dépend QUE d'animation-timeline

### 3.1 Au téléphone (390 à 767 px) — six effets, tous en CSS

Ces six effets disparaissent entièrement sans animation-timeline (mesuré sur le profil corrigé).
Aucun JavaScript n'intervient : au téléphone, les 4 tests `CSS.supports` (kit.js:11, kit.js:116, recit.js:8, relief.js:97) sont de toute façon coupés par `min-width:1024px`.

| Effet | Source | Ce qui reste sans animation-timeline |
|---|---|---|
| T3 Citation mot à mot | telephone.css:31-37 | la citation entre en bloc par le dévoilement IO (K22) |
| T4 Verbes de l'atelier (+ `overflow:clip` + voile renforcé) | telephone.css:39-50 | phrase entière par K22, verbes fixes, voile de kit.css:868 |
| T5 Éclaté qui s'ouvre | telephone.css:52-69 | éclaté fixe `eclate.avif` + pastilles + légende (E0), à l'intérieur du `.etapes__tete.reveal` (K22) |
| K25 Jauge du rail des prestations | kit.css:561-564 | rien, jauge masquée (le rail aimanté reste) |
| K40 Jauge du rail des étapes (≤ 759 px) | kit.css:847-852 | rien, jauge masquée |
| K41 Jauge du rail des réalisations | kit.css:858-863 | rien, jauge masquée |

Ce qui joue au téléphone **sans** animation-timeline (mesuré, profil corrigé) :
- Accueil : T1 cage qui tourne, T2 projecteur (2 animations au total).
- Pages communes : K18 `pousse` (1).
- Pages légales : K16 `motIn` (2).
- Hors horloge des animations : K22 dévoilements IO (23 `.vu` sur 29 à l'accueil), K30 dévoilement des photos du rail, K24 numéros d'étapes (`--avancee`), K1-K2 nav, et les interactions au tap (K5, K7-K14).

Ce que le profil corrigé retire donc à l'accueil : 36 des 38 animations CSS mesurées en natif. Il ne reste que T1 et T2.

### 3.2 Au bureau (≥ 1 024 px), pour mémoire

Effets qui dépendent seulement d'animation-timeline (CSS `@v`/`@s` ou test `CS`), avec leur repli quand il existe :

| Effet | Repli sans animation-timeline |
|---|---|
| K38 Ouverture (héros collant, plateau qui monte) | héros fixe + parallaxe JS K21 (le test de kit.js:222 la réactive) |
| K36 Titres de scène mot à mot | aucun : titres fixes |
| K35 Dévoilement lié à la position (`monte`) | K22 dévoilement IO |
| K39 Photos qui glissent dans leur cadre | aucun |
| K29 Dérive de la photo de l'atelier | aucun |
| K32 Travelling, compteur ; K33 son pilote ; K34 relief 3D | grille 8 + 4 puis 6 + 6 (kit.css:740-747, 807-812), photos dévoilées par K30 |
| K37 Étapes épinglées | K24 numéros par `--avancee` (kit.js:233 relance le calcul) |
| E1-E10 Grande scène de l'éclaté | E0 éclaté fixe |
| R1 Citation, R2 Verbes | aucun : texte plein |
| R3 Comptage des chiffres (test CS) | valeurs finales affichées d'emblée |
| K48 Descente CSS ; K45 descente du shader (test CS → δ = 0) | aucun |

Ne dépendent **pas** d'animation-timeline au bureau :
- K46 et K47 (signature au repos), K18 `pousse` et K20 `lever`/`entre`.
- K42-K44 relief au repos (dépend du GPU), S1 survol, K6 barre retenue.
- V1 vidéo : son déclenchement se replie sur la fin du reveal de la phrase.

## 4. Remarques de lecture utiles au diagnostic

1. **Chaîne de cascade de l'image du héros au téléphone** (accueil) :
   - `pousse` (kit.css:322), puis `derive-tel` (kit.css:698), puis le nom `derive-tel-haut` (kit.css:940), puis `signature-tourne-2` (telephone.css:23, spécificité 0,6,2).
   - Mesuré : seule `signature-tourne-2` tourne.
   - `derive-tel` et `derive-tel-haut` ne jouent nulle part sur Lestraque tant que la famille `telephone` est active.
2. **bureau.css part au téléphone** : requête mesurée dans les 3 profils téléphone. Le lien `media="(min-width: 1024px)"` n'empêche que l'application. Au dernier écrit, `bureau.css` pèse 13 745 octets dans `lestraque/`.
3. **Pages communes au bureau** : la parallaxe JS (K21) se cumule avec `pousse` (K18), car la condition de kit.js:222 ne l'écarte que dans `.ouverture`. Mesuré en 1440×900 sur `menuisier-rennes` : `translate: 0px 144px` et animation `pousse`.
4. **Timelines et `content-visibility`** : au téléphone, toutes les scènes sous le plateau sont en `content-visibility:auto` (kit.css:874-878), levé au premier défilement par `tout-rendu` (kit.js:54-63).
   - Au chargement, `getAnimations()` ne liste que les 2 animations du héros, 1 jauge et les 15 mots de la citation. Après défilement s'y ajoutent 2 jauges, 4 verbes et les 14 animations de l'éclaté (m).
   - La figure de l'éclaté garde en plus son propre `content-visibility:auto` (telephone.css:61).
   - Un relevé d'animations fait sans défilement sous-compte donc les effets.
5. **Commentaires qui citent `@supports (animation-timeline: view())`** : kit.css:1059, recit.bureau.css:3 et telephone.css:9. `generer.mjs:367` les retire des feuilles publiées. Une réécriture textuelle des feuilles générées compte donc exactement 13 blocs (`styles.css` : 10 `view()` + 3 `scroll()`) et 2 blocs (`bureau.css`).
6. **Hors `@supports`** : deux déclarations de timeline restent actives sans prise en charge, sans effet visible.
   - `timeline-scope:--presta` (kit.css:533).
   - `scroll-timeline:--presta inline` (kit.css:552).
   - Toutes les déclarations `animation-timeline` sont bien dans un bloc `@supports`.
7. **Profil corrigé et WebKit réel** : le profil corrigé ne simule que l'absence d'animation-timeline. Les autres fonctions dont dépendent K11 (`interpolate-size`, `::details-content`), V2 (`@starting-style`), T2 (`mask`, `mix-blend-mode`) et T5 (`content-visibility`) y restent celles de Chromium. Non vérifié ici sur WebKit, qui n'est pas installé.

## Fichiers de preuve

- `inventaire.md` : ce document.
- `inventaire-controle.mjs` : relevé Playwright (serveur statique local, 5 profils, 3 pages).
- `inventaire-controle.json` : sortie brute du relevé (animations groupées, témoins, état de `site.js`, requêtes).
- `inventaire-sonde-supports.mjs` et `inventaire-sonde-supports.json` : preuve que `@supports (animation-timeline: --non-supporte())` est vrai sous Chromium 153.
- Même dossier, écrits par une autre session à 21:10:21 : `sonde-supports.mjs`, `sonde-supports.txt` et `sonde-supports2.mjs`. Ils arrivent au même constat par d'autres conditions : `(animation-timeline: non-supporte())`, `view(non-supporte)` et `(propriete-non-supportee: 1)` sont fausses, `--non-supporte()` est vraie.
  - Cette session a écrasé ma première sonde, qui portait le même nom.
  - `sonde-supports.json` est la sortie de ma première sonde, laissée en place. Son script est aujourd'hui `inventaire-sonde-supports.mjs`.
