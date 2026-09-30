# 024-02 — kit Figma : vérification adverse n° 1 (exactitude et compatibilité Figma)

Date : 2026-09-16, vers 22 h 40. Vérificateur indépendant, en lecture seule sur `lestraque/`, `_kit/`, `generer.mjs` et le kit. Rien n'a été modifié dans le dépôt : la seule écriture est une copie de Lestraque dans `.orchestre/travail/kit-figma/exactitude-1/`. Le passage de `node scripts/kit-figma.mjs` a répondu « identique » pour chaque fichier.

**Verdict : NON CONFIRMÉ.** 14 des 15 valeurs tirées au sort sont exactes à leur origine ; la 15ᵉ est trompeuse. En dehors du tirage, on trouve 4 défauts d'exactitude, dont un majeur : les sections figées n'ont pas le texte du site. Les pages enfreignent aussi 12 règles de `html-to-design.md`, et 2 commandes du LISEZMOI sont rouges sur la démo elle-même.

Scripts et données, tous rejouables : `.orchestre/travail/kit-figma/exactitude-1/`
- `tirage.mjs` : graine `f4bd772c` ;
- `scan-h2d.mjs` et `scan-h2d.json` ;
- `fidelite.mjs`, `specimens.mjs`, `esp.mjs`, `ctx.mjs`, `sonde.mjs`, `sonde2.mjs` ;
- `annexe-violations.md` ;
- `kit-figma-passage.log`, `empreintes-avant.txt` et `empreintes-apres.txt`.

---

## 1. Tirage de 15 valeurs, vérifiées à leur origine

Tirage pondéré par catégorie dans `kit.json` (`node tirage.mjs f4bd772c`) :
- couleurs : 2 ;
- couleur littérale : 1 ;
- taille déclarée : 1 ;
- taille mesurée : 1 ;
- espacements : 2 ;
- section : 1 ;
- champs : 2 ;
- variantes : 2 ;
- effet : 1 ;
- condition de famille : 1 ;
- commande : 1.

| n° | Valeur du kit | Origine citée | Ce qu'on lit à l'origine | Verdict |
|---|---|---|---|---|
| 1 | plombier `--ligne` #DCE4EC | `_kit/da.json:3` | `"ligne": "#DCE4EC"` | exact |
| 2 | electricien `--ligne` rgba(255,255,255,.11) | `_kit/da.json:4` | `"ligne": "rgba(255,255,255,.11)"` | exact |
| 3 | littéral #221A13, n = 3 | `_kit/kit.css:599, 705, 768` | les trois lignes le portent en propriété (`kit.css:468` ne l'a qu'en variable, exclue comme pour #D4A574) | exact |
| 4 | `.travelling .compteur` : clamp(2.2rem,3.4vw,3.8rem), interligne 1, approche -.03em, graisse var(--graisse-ligne,300), profil chorégraphie | `_kit/kit.css:633` | identique, sous `@media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())` | exact |
| 5 | titre de l'atelier : 180 px à 1440, 70,2 px à 390 ; interligne 154,8 / 60,372 ; approche -9 / -3,51 ; graisse 300 | `_kit/kit.css:576, 579` | 18vw, puis 12.5vw dès 768 px, line-height .86, -.05em ; vérifié par Chromium sur le site | exact |
| 6 | espacement `clamp(3rem,6vw,6.5rem)` row-gap : « 1440 : 86,4 px · 390 : 48 px » | `_kit/kit.css:161` | la déclaration est sous `@media(min-width:900px)` : **elle n'existe pas à 390**, et J4 n'affiche pas ce contexte | **trompeur (défaut E2)** |
| 7 | `clamp(2.25rem,7vw,3rem)` gap : 48 / 36 px | `_kit/kit.css:148, 596` | `.galerie` et `.galerie--scene`, sans contexte ; le calcul est juste | exact |
| 8 | section 03 prestations : gabarit `prestaScene`, racine `section.scene.scene--papier.scene--presta#prestations` | `generer.mjs:544`, `lestraque/index.html:42` | `const prestaScene = …<section class="scene scene--papier scene--presta"` ; `<main>` est sur la ligne 42 | exact |
| 9 | champ `da.prestationsPhotos { fragment du h3 → photo \| { base, position } }` | `_kit/da.json:8`, `generer.mjs:540` | `vignetteDe` : `slug(titre).includes(x)`, puis `refPhoto` | exact |
| 10 | champ « h2 (2 à 4 mots) » | `lestraque/contenu.json:13`, `generer.mjs:153` | `"h2": "Ce que je fabrique"` ; garde-fou `nbMots(h2) < 2 \|\| > 4` | exact |
| 11 | variante « sans plateau : rien » | `generer.mjs:643` | `if (!p) return ''` (p = site.plateau) | exact |
| 12 | variante `hero--plein` si da.hero = "plein" | `generer.mjs:667` | `if (da.hero === 'plein') {` | exact |
| 13 | effet 02 « photo qui glisse dans son cadre », sous @media ≥1024 + mouvement permis + @supports view() | `_kit/kit.css:1105` | `.plateau__photo img,…{scale:1.14;animation:glisse-cadre…;animation-timeline:view()}`, dans ce contexte | exact |
| 14 | survol, mouvement réduit : `.survol--calme`, fondu d'opacité de 0,2 s, ni volet ni suivi | `_kit/familles/survol.bureau.css:40` | `clip-path:none;opacity:0;transition:opacity .2s …` | exact |
| 15 | `node scripts/site-qa.mjs <dossier> [--statique]` : Lighthouse mobile, balises, contrat site.json | `scripts/site-qa.mjs:32` | ligne d'usage (l'option `--statique` est à la ligne 33, le contrat à la ligne 11) | exact |

J'ai aussi relu, hors tirage, les origines suivantes. Elles sont toutes exactes :
- les 16 commandes et sources de A4 (`extraire-contenu.mjs:5`, `polices-demo.mjs:6`, `polices-plex-sous-ensemble.py:17`, `polices-fraunces-statiques.py:10`, `monogramme-demo.py:7`, `photos-demo.mjs:5/7`, `photos-provenance.mjs:7`, `relief-profondeur.mjs:16`, les `*-qa.mjs`, `generer.mjs:45/267/282/341/670/845/857/943/944`, `site-qa.mjs:75`, `siteCommande.ts:27/59`) ;
- les origines de `gel.css` (`kit.css:8/37/58/73/172/261/384-387/464/544-549/984/1002/1039-1040`, `kit.js:260`) ;
- les couleurs de `planche.css:2` (`kit.css:352`) ;
- la genèse de l'ordre de l'accueil (`generer.mjs:711`, `contenu.json:11`, `generer.mjs:36-43/159/164`) ;
- `medias/eclate.webp` : même taille que `eclate.avif` (1400×1050), écart moyen de 0,73 par canal.

## 2. Présence des DA et des sections

- **DA** : les 12 entrées de `_kit/da.json` sont dans `kit.json` et dans J1, J2 et J5 : plombier, electricien, chauffagiste, macon, menuisier, lestraque, peintre, carreleur, couvreur, serrurier, paysagiste, generique. Pour chacune, les 7 couleurs, les polices et le rayon sont là. **Il manque des jetons** (défaut E3).
- **Sections de l'accueil** : les 11 racines de `lestraque/index.html` sont présentes dans `accueil.sections` (00 à 10) et dans `sections.html` (13 cadres, avec 03b et 09b) : nav, hero--plein, plateau, scene--presta, atelier, scene--galerie, scene--communes, #etapes, scene--faq, contact, pied.

## 3. Défauts d'exactitude (hors tirage)

**E1 — majeur : les sections figées ne sont pas le site.**
- **Cause** : `planche.css:4` `.k-page{…font-size:15px;line-height:1.5…}` s'applique à `<body class="k-page k-page--sections">` et écrase `sections/site.css:15` (= `_kit/kit.css:7`) `body{font-size:1.0625rem;line-height:1.6}`. Les deux pèsent autant, mais la classe l'emporte, et `planche.css` est chargée en dernier.
- **Mesure** : Chromium, site en ligne (servi en local) contre `sections.html`, textes appariés par balise, classe et texte (`fidelite.mjs`) :
  - à 1440 : **72 textes sur 214 différents** (30 en taille : 15 px au lieu de 17 px ; 72 en interligne) ;
  - à 390 : **57 sur 220**.
  - Exemples : chapeau des étapes (« Du premier appel à la pose… » : 17/27,2 px sur le site, 15/22,5 px dans le kit), légendes de l'éclaté, champs du contact, pied de page.
- **Conséquence dans les données** : `kit.json › jetons.specimens_mesures` (repris dans J3) a un interligne faux pour 5 spécimens (`specimens.mjs`) :

  | Spécimen | Site | Kit | Largeurs |
  |---|---|---|---|
  | `.mono` | 18,944 px | 17,76 px | 1440 et 390 |
  | `.plateau__signe` | 19,968 px | 18,72 px | 1440 et 390 |
  | `.atelier__legende` | 19,2 px | 18 px | 1440 et 390 |
  | `.devis__champ label` | 18,432 px | 17,28 px | 1440 et 390 |
  | `.pied__titre` | 18,432 px | 17,28 px | 1440 |

**E2 — moyen : J4 affiche des espacements à une largeur où la règle n'existe pas.**
- `kit.json › jetons.espacements[]` n'a pas de champ de contexte ; l'échelle et la grille en ont un.
- **23 lignes sur 64** donnent une valeur « 390 : … » pour une déclaration réservée à ≥ 768, 900, 960 ou 1024 px. Exemples : tirage n° 6 ; `kit.css:165` `clamp(4rem,10vw,11rem)` « 390 : 64 px » sous `min-width:900px`.
- **5 lignes** donnent une valeur « 1440 : … » pour une déclaration réservée à ≤ 759, 767, 899 ou 959 px. Exemples : `kit.css:711` « 1440 : 72 px » sous `max-width:767px` ; `kit.css:805` « 1440 : 176 px » sous `max-width:899px`.
- Liste complète : sortie de `esp.mjs`.

**E3 — moyen : trois jetons des DA sont absents.** `generer.mjs:360` écrit dans `:root`, pour chaque direction, `--grain:${da.grain || '.12'}`, `--grain-mode:${da.grainMode || 'multiply'}` et `--motif`. Leurs valeurs ne sont ni dans `kit.json › directions[]` ni dans J1 ou J2. `variables_root` les nomme sans aucune valeur, et le kit montre seulement « texture grain / papier ». Valeurs absentes :
- grain : electricien .09, macon .14, menuisier .07, lestraque .06, couvreur .13, paysagiste .06, les autres .12 par défaut ;
- grainMode : `screen` pour electricien ;
- motif : le `repeating-linear-gradient` du carreleur.

**E4 — mineur : une origine est incomplète.** L'écart « galerie de l'accueil : exactement 4 photos ; pages communes : 3 ouvrages » cite seulement `generer.mjs:690`. Le garde-fou des 3 ouvrages est à `generer.mjs:755-756`. L'erreur est dans le LISEZMOI et dans `kit.json › ecarts`.

Remarque, sans défaut : le contrôle Chromium du script annonce « 0 opacité 0 ». À 390, `a.nav__devis` est à `opacity:0` dans l'état « menu ouvert » (`kit.css:1002`, rejoué par `gel.css:47`), mais avec `visibility:hidden`. L'état est donc fidèle, et le contrôle écarte cet élément.

## 4. Pages du kit contre `html-to-design.md` (§7 et §8)

Méthode (`scan-h2d.mjs`) :
- les pages sont servies en local et ouvertes dans Chromium à 1440×900 puis 390×844 ;
- chaque feuille chargée est analysée : règle, contexte et ligne ;
- chaque règle est évaluée dans la page : `matchMedia`, `CSS.supports`, et un sélecteur qui touche au moins un élément ;
- les styles calculés de chaque élément et de ses `::before`/`::after` sont relevés.

« Actif » veut dire : contexte vrai et au moins un élément touché, avant la cascade. Le **calculé** fait foi pour le rendu. La liste complète (fichier:ligne, sélecteur, déclaration, largeurs) est dans `annexe-violations.md`.

| Règle | Violation | Où (sélecteur, fichier:ligne) |
|---|---|---|
| **§8 banc d'essai** | la page `kit/banc-essai-1440.html` n'existe pas : aucune des 18 cellules n'est testée, alors que les règles 12, 13, 17, 19, 21 et 25 en dépendent | dossier `kit/` |
| **R2 largeur verrouillée** | aucune page `-1440.html` / `-390.html` : `index.html` et `sections.html` sont responsives (`meta viewport width=device-width`) et importées aux deux largeurs | les deux pages |
| R2 @media sur la largeur | `index.html` : 16 règles actives à 390 | `planche.css:90-112` (`.k-cadre`, `.k-h1`, `.k-h2`, `.k-grille,.k-sommaire,.k-cartes,.k-paires`, `.k-specimen__rendu`, `.k-barre`…) |
| R2 @media sur la largeur | `sections.html` : 194 déclarations actives (1440 et/ou 390) ; 446 autres présentes mais inactives | `sections/site.css` (`.galerie` :161, `.scene--presta .presta` :439, `.communes` :706…), `sections/gel.css:5, 20, 31, 47, 51-67` |
| R2 @media sur la largeur | attribut `media="(min-width: 1024px)"` sur la feuille | `sections.html` → `sections/bureau.css` |
| R2 unités vw/vh/svh/dvh | 136 déclarations actives | ex. `sections/site.css:458` `.atelier__titre{font-size:18vw}`, `:439` `grid-auto-columns:80vw`, `gel.css:51` `translateX(1.2vw)`, `gel.css:53` `min(8.5vw,10.5rem)` |
| R2 clamp()/min()/max() liés à la fenêtre | 93 déclarations actives | ex. `sections/site.css:23` `h1{font-size:clamp(2.6rem,6.4vw,5.6rem)}`, `gel.css:65` `clamp(3.4rem,6.2vw,8rem)` |
| R2 container query | `container-type:inline-size` et unités `cqi`, actifs à 1440 | `sections/site.css:706-713` (`.da--communes #communes.scene--communes .communes/.commune`) |
| R7 états côte à côte | « FAQ ouverte » absent à 390 ; « menu ouvert » absent à 1440 (justifié : pas de burger dès 960 px) | `gel.css:31`, `gel.css:20` |
| **R11 carrousels dépliés** | à 390, trois rails restent en `overflow-x:auto` : les cartes sortent du cadre | `ol.presta` (`site.css:439`, 2009 px pour 390), `.galerie--scene` (`site.css:583`, 1412 px), `.etapes__liste` (`site.css:620`, 1271 px) |
| R12 pseudo-éléments porteurs de sens | « + » de la FAQ en `::after` (et sa rotation) | `.faq summary::after` `site.css:184-185` |
| R12 | numéros de la légende de l'éclaté | `.eclate__legende li::before{content:counter(eclate)}` `site.css:895` |
| R12 | voiles de lisibilité sur les photos (texte clair sur photo) | `.hero--plein .hero__media::after` `site.css:267`, `.atelier__media::after` `:456`, `.contact__media::after` `:537/:631` |
| R12 | soulignés des liens de la nav | `.nav__liens a::after` `site.css:44` |
| R12 | l'état ouvert ou fermé de la FAQ tient à `::details-content` ; à 390, la 1re `<details open>` est repliée par ce pseudo-élément, et son corps garde une boîte de 116 px | `site.css:186-187`, `gel.css:31` |
| R13 backdrop-filter | calculé sur la nav (cadres 00 et 01) | `.nav.solide` `site.css:51` (blur 14px) ; `.nav--claire:not(.solide) .nav__liens` `site.css:761` (blur 16px) |
| R13 rotations | calculées : vignette du cadre 03b à -2deg ; croix du burger à ±45° (état menu, à 390) | `gel.css:65` (`gel.css:53` -3deg est écrasé) ; `.burger[aria-expanded=true] span` `site.css:70-71` |
| R13 clip-path | `inset(0)` actif (03b) ; aucun effet remplacé par une image figée | `gel.css:53`, `gel.css:59` |
| R14 color-mix() | actif | `.nav.solide{background:color-mix(in srgb,var(--fond) 84%,transparent)}` `site.css:51` |
| R16 liens | 61 `<a href>` dans `sections.html` (sans effet si l'option « Add hyperlinks » reste décochée) | balisage du site |
| **R17 images** | 17 `<picture>` et 19 `srcset`/`sizes` : le fichier retenu dépend de la fenêtre et de la densité de la capture (`sizes` du héros en `80vh`) | `sections.html`, tous les cadres photo |
| R17 | `<img>` du héros sans `loading` ni `decoding` | `#cadre-01-heros img` (`heros-escalier-1600.webp`) |
| R17 | fichiers à environ 1,1 à 1,5 fois la taille affichée au lieu d'environ 2 fois : 1600 px affichés à 1440 (héros, atelier, contact) ; `reserve-bibliotheque-960.webp` affiché à 856 px ; 480 px affichés à 312–332 px à 390 | cadres 01, 04, 05, 09, 09b, 03 |
| R17 | 5 `<img>` AVIF dans le DOM (masquées) | `.eclate__calque`, `.eclate__assemble` (cadre 07) |
| R17 | 8 photos en `background-image` au lieu d'`<img>` | `index.html`, J6 (`.k-forme__texte`, `heros-escalier-480.webp`) |
| R19 SVG | 13 SVG en `currentColor` (comportement non documenté) | `sections.html` : 7 flèches `.bouton__cercle svg` (`FLECHE`, `generer.mjs:31`) et 6 monogrammes `.nav__marque svg.marque` |
| R21 graisses | fichiers statiques au nom interne « Regular » pour 300 et 600, utilisés sans banc d'essai (la règle impose les fichiers variables en cas de doute) | `polices.css:3-7`, `sections/site.css:4-8` |
| R24 structure | enveloppes multiples : `article.k-cadre > div.k-scene > section` ; au cadre 00, `article > .k-scene > .k-etats > .k-etat-bloc > .k-etat > header` | `sections.html` |
| R24 | `display:contents` actif | `.eclate__ligne` `site.css:898` ; `.plateau__haut` `site.css:565` (à 390) |
| R24 | calques `position:absolute` superposés (17 déclarations actives) | nav sur le héros `gel.css:12`, voile `gel.css:17`, nav `gel.css:19`, `.hero__media` `site.css:82`, `.atelier__media` `:453`, `.contact__media` `:534`, `.eclate__rendu>img` `:889`, `.eclate__pastille` `:892` |
| R26 formulaire | `textarea#devis-message` et `input#devis-contact` vides, sans texte indicatif | cadre 09 |

Règles respectées, vérifiées :
- R5 : témoin de fin sur les 2 pages.
- R6 : aucun script, pas de classe `js`, `animation:none` et `transition:none` (`gel.css:8`).
- R8 : aucune requête `prefers-*` active.
- R9 : aucune animation calculée ; `timeline-scope` et `scroll-timeline` restent inertes (`site.css:421`, `:439`) ; aucun `content-visibility:auto` actif.
- R10 : 0 fixed ou sticky calculé. Les déclarations `site.css:38`, `:72`, `:157`, `:313` et `:532` sont écrasées par `gel.css`.
- R14 : nuanciers en hex, avec nom, valeur et origine.
- R15.
- R18 : 0 vidéo, 0 canvas.
- R20 : `font-display:block`, preload avec `crossorigin`.
- R22 : aucun caractère hors couverture de Plex ou de Fraunces, vérifié glyphe par glyphe sur le rendu.
- R25 : une étiquette titrée par cadre.
- `noindex` présent, aucune ressource externe, et aucun lien vers le kit depuis `app/`, `lib/` ou `lestraque/`.

Risque confirmé par le code : `_kit/kit.css:883-885` note qu'« une barre de défilement classique (15 px) décalait de 7 px les blocs en vw ». Or la capture à 1440 passe par l'extension, dans un Chrome de bureau.

## 5. `kit/LISEZMOI.md` : les commandes telles qu'écrites

| Commande ou adresse | Résultat | Verdict |
|---|---|---|
| `node scripts/kit-figma.mjs` | exit 0 en 26 s ; 10 fichiers « identique » ; empreintes sha256 du dossier identiques avant et après | marche |
| https://prestiapp.fr/sites-demo/kit/index.html et sections.html | **404** : `public/sites-demo/kit/` n'est pas suivi par git, donc pas poussé. `/sites-demo/kit/` → 308 vers `/sites-demo/kit` : la remarque sur `index.html` est juste | **import impossible aujourd'hui** (le LISEZMOI dit bien « pousser » d'abord) |
| `node public/sites-demo/generer.mjs <site> --sortie=<dossier>` | exit 0 en 3,6 s sur `lestraque` (7 pages, 12 photos) | marche pour Lestraque. Pour un autre client : garde-fous « Menuisier » et « Rennes » (`generer.mjs:140`, `:876`) et familles figées, **signalés** dans « À savoir » |
| `node scripts/site-qa.mjs <dossier> --statique` | **exit 1**, aussi bien sur la copie que sur `public/sites-demo/lestraque` : « attributions.json : 8 sans attribution » et « images : alt rédigé : 6 sans alt » | **rouge sur la référence, et le LISEZMOI ne le dit pas** |
| `node scripts/demo-verifier.mjs <dossier> --statique` | **exit 1** (arrêt sur site-qa). De plus, il lance `scripts/grille-qa.mjs` **sans le dossier** : il note LA démo (`.orchestre/preuves/refs/grille.json`), ce n'est pas un juge du site client. Lancé seul, grille-qa donne aujourd'hui « FAIL — C5 (démo 3 < 3e quartile 5) » | **ne juge pas ce que le LISEZMOI annonce** |
| `node scripts/site-deposer.mjs <commande_id> <dossier>` | non lancé (dépôt en production). L'usage correspond à `site-deposer.mjs:5`. Comme il exige site-qa au vert, il refuserait aujourd'hui un dossier de type Lestraque | non exécutable tel quel tant que site-qa est rouge |
| `node scripts/deploiement-etat.mjs` | exit 0, « la production est à jour (c6a0d5b) » | marche |
| « ce kit en demande 4 (2 pages × 2 largeurs) » | `html-to-design.md` §7.4 et §8 exigent d'abord 1 import pour le banc d'essai, soit 5 | incomplet (mineur) |
| commandes python de A4 | Python 3.12.10 et fontTools 4.63.0 sont présents ; les lignes d'usage correspondent | disponibles (non lancées : elles écrivent dans `_polices/`) |

## 6. Liste des défauts

1. **E1 (majeur)** : `planche.css:4` impose 15 px / 1,5 au `body` des sections. 72 textes sur 214 (à 1440) et 57 sur 220 (à 390) diffèrent du site, et 5 spécimens de J3 ont un interligne faux.
2. **E2 (moyen)** : J4 donne des valeurs à 390 ou 1440 pour des règles qui n'existent pas à cette largeur (23 et 5 lignes sur 64), sans contexte.
3. **E3 (moyen)** : `--grain`, `--grain-mode` et `--motif` de chaque DA sont absents du kit.
4. **E4 (mineur)** : origine incomplète de l'écart « 3 ouvrages » (`generer.mjs:755-756`).
5. **F1 (majeur)** : pas de banc d'essai (§8).
6. **F2 (majeur)** : R2 non respectée (pas de pages à largeur verrouillée ; @media, vw, clamp et cqi actifs).
7. **F3 (majeur)** : R11, trois carrousels non dépliés à 390.
8. **F4 (moyen)** : R12, pseudo-éléments porteurs de sens (FAQ, légende de l'éclaté, voiles, `::details-content`).
9. **F5 (moyen)** : R13, backdrop-filter, rotations et clip-path gardés.
10. **F6 (moyen)** : R14, color-mix actif.
11. **F7 (moyen)** : R17 (picture et srcset, résolution, AVIF dans le DOM, background-image).
12. **F8 (moyen)** : R19, currentColor.
13. **F9 (moyen)** : R21, fichiers statiques sans banc d'essai.
14. **F10 (mineur)** : R24 (enveloppes, display:contents, absolute).
15. **F11 (mineur)** : R26, champs vides.
16. **F12 (mineur)** : R7, états incomplets.
17. **C1 (moyen)** : site-qa est rouge sur la référence, sans que le LISEZMOI le dise.
18. **C2 (moyen)** : demo-verifier ne juge pas `<dossier>` (grille-qa note la démo).
19. **C3 (bloquant pour l'import, état)** : les adresses du kit renvoient 404, le kit n'est pas poussé.
20. **C4 (mineur)** : le budget annoncé oublie l'import du banc d'essai.
