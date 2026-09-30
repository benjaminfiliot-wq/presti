# html.to.design : ce qu'on peut importer et comment préparer les pages du kit

Recherche du 2026-09-16 (tâche 024-02). On y distingue trois choses :

- **documenté** : dit par divRIOTS ou par Figma, avec la source [Sx] ;
- **déduit** : conclusion tirée de sources, marquée comme telle ;
- **non documenté** : personne n'en parle, il faut tester sur le banc d'essai (§6).

Copies des pages lues (texte, empreinte sha256, date de publication) : `.orchestre/travail/kit-figma/sources-h2d/` (`index-sources.json`, `textes/`, `captures-doc/`). Les fichiers du dépôt n'ont été que lus, rien n'a été écrit.

---

## 1. Les voies d'import

| Voie | Ce qu'elle prend | Limites documentées |
|---|---|---|
| **Web** (onglet du plugin) | une URL publique | seulement les URL ouvertes à tous [S5][S7] ; un site protégé contre les robots peut renvoyer la page de vérification au lieu du site [S18] |
| **Extension** Chrome (et navigateurs Chromium : Edge, Arc, Brave, Opera, Vivaldi [S4]) | la page telle qu'elle s'affiche dans le navigateur : page privée ou locale, état de session, bandeau retiré avant capture [S6] | quatre sorties : un fichier `.h2d` local, un envoi au plugin (il faut être connecté à Figma), un fichier `.make`, ou le presse-papiers à coller dans Figma sans plugin [S6][S23][S36]. Avec le `.h2d` local, les données ne passent pas par leurs serveurs [S8]. L'extension utilise les fonctions de débogage de Chrome [S36]. Version 0.0.206 du 2026-08-31 [S36] |
| **File** | `.h2d` (recommandé), `.html/.htm`, `.zip`, `.mhtml`, e-mails | un `.html` qui appelle des ressources externes peut les perdre ; un zip doit faire moins de 32 Mo [S9] |
| **Editor** | du HTML et du CSS collés | [S10] |
| **MCP** (`https://mcp.to.design`, outils `import-url`, `import-html`) | pilotage par un agent (Claude Code, Codex…) | demande une connexion OAuth au compte html.to.design, avec le plugin ouvert dans Figma [S11] |

Capture d'une zone seulement : l'extension sait capturer une sélection, un bloc à la fois [S22][S44].

## 2. Largeurs d'import

- **Plugin** : un préréglage mobile à **390 px** est documenté. Taper une largeur libre est **réservé au PRO** [S12]. Sur les captures de leur doc, les largeurs proposées sont 1425, 1280, 1024, 768 et 390 : **1440 n'y figure pas** [S44, captures non datées].
- **Extension** : sa capture propose « Browser (1440px) », 1920, **1440**, 1024, 768 et **390** [S44]. Il y a aussi une voie documentée pour une largeur exacte : le mode appareil des DevTools, puis « Capture Full Page » [S13][S14].
- **API code.to.design** (le même moteur) : fenêtre par défaut de 1280 × 720, et le paramètre `theme` agit sur `prefers-color-scheme` [S37].
- La hauteur est calculée d'après le contenu [S12]. Quand la page gère elle-même sa hauteur ou son défilement, la capture peut s'arrêter au visible. Le contournement documenté est une fenêtre très haute [S13].
- **Déduit** : l'import rend la page dans un vrai navigateur, à une largeur, une hauteur et un thème donnés [S37][S36][S34]. Donc `clamp()`, `vw`, `@media`, `@container`, `calc()` et les variables CSS sont figés à la largeur de capture. Figma reçoit des valeurs calculées.

**Conséquence pour le plan « 1440 puis 390 » avec l'offre gratuite** : le 390 passe par le plugin ou par l'extension. Le 1440, lui, passe par l'**extension** : le plugin gratuit n'a pas de préréglage à 1440, et la largeur libre est payante.

## 3. Offre gratuite

- Grille tarifaire actuelle : **10 imports par période de 30 jours**, sans inscription ni carte [S3][S4]. Les sources se contredisent :
  - la page « What is » annonce 12 imports gratuits par mois [S1] ;
  - un billet de 2023 parlait de 20 par mois [S33].
  → **Retenir 10.**
- Réservé au PRO : import en lot d'une liste d'URL [S17], largeur libre [S12], images haute définition [S16], raccourci de ré-import [S2]. Le PRO coûte 12 $/mois par an ou 18 $/mois au mois, dans la limite de 1 000 imports par mois [S2][S3].
- **Non documenté** :
  - un import en plusieurs largeurs dans le même lancement compte-t-il pour 1 ou pour N ?
  - une capture par l'extension (ou collée depuis le presse-papiers) est-elle décomptée ?
  → **Compter 1 import par couple page × largeur**, et relever le compteur du plugin après le premier import.
- Si un import s'interrompt en route (limite atteinte), on récupère la partie déjà faite [S20]. Un import tronqué est donc possible sans erreur visible.

## 4. Ce que le moteur fait, source par source

| Sujet | Ce qui est documenté |
|---|---|
| flex / grid → auto layout | l'auto layout est appliqué aux conteneurs flex et grid si l'option est cochée [S19]. « Use Autolayout » est cochée par défaut sur la capture d'écran [S44]. Les grilles `auto-fit` et `auto-fill` donnent de vraies grilles Figma (2026-09-07) [S20]. La hiérarchie des calques suit celle du HTML [S19]. Sans auto layout, les calques sont moins imbriqués [S28] |
| Couleurs, textes → styles et variables | option « Create local styles & variables » : couleurs, typographie, espacements détectés [S24]. Option « Use existing local styles » : réutilise les styles déjà présents dans le fichier Figma [S32][S44]. Depuis 2026-09-07, les durées et courbes de transition deviennent des variables [S20]. **La façon de nommer les styles et variables (reprend-elle `--accent` ?) n'est pas documentée** |
| Dégradés, couleurs | dégradés linéaires, radiaux, coniques et répétés ; Display-P3 [S29][S30][S20] |
| SVG | importés en remplissages ou en calques [S19] ; couleurs des SVG mieux rendues [S20] |
| Survol | l'option « For hover effects » crée des composants avec variantes à partir des états `:hover` [S25] |
| fixed / sticky | pris en charge pour le **prototype** (« almost all sticky elements ») [S2][S26] |
| Défilement horizontal (overflow) | pris en charge pour le **prototype** [S27] |
| Animations | **ne passent pas** (Figma ne gère pas les animations CSS) [S19][S35] |
| Vidéo | meilleur rendu des vidéos sans affiche (2023) [S30]. Côté Figma, la vidéo est réservée aux offres payantes [S39] |
| Formulaires | cases à cocher, boutons radio et champs texte sont importés [S30] |
| Textes | les calques de texte de même police, taille, graisse et couleur sont fusionnés [S31] |
| Liens | option « Add hyperlinks » [S32][S44] |
| Images | au-delà de 4096 px, Figma réduit l'image [S39]. Formats acceptés par Figma : JPG, PNG, HEIC, **WebP**, GIF, et TIFF sous Safari seulement [S39]. **AVIF absent** : la demande est toujours ouverte sur le forum Figma [S40]. Une conversion de l'AVIF par html.to.design n'est pas documentée |
| Taille | les imports glissés de plus de 30 Mo passent depuis 2026-09-07 [S20] |
| Noms de calques | **non documentés pour le plugin**. L'API n'expose que `topLayerName` (le calque de tête) et les attributs `data-c2d-cmp-name`, `data-c2d-cmp-variants`, `data-c2d-cmp-text-property`, `data-c2d-cmp-slot-property`, réservés à l'appel `/html-component` en mode presse-papiers [S37] |

### Non documenté (rien trouvé chez divRIOTS : doc, 33 pages ; blog, 30 billets lus ; API ; fiche Chrome)

- pseudo-éléments `::before` / `::after` ;
- `background-clip:text` ;
- `clip-path` ;
- `mask` ;
- `filter` et `backdrop-filter` ;
- `mix-blend-mode` ;
- `transform` / `rotate` ;
- container queries ;
- `content-visibility` ;
- `loading="lazy"` ;
- `<canvas>` / WebGL ;
- `<picture>` avec une source AVIF ;
- l'attente des polices et des images avant la capture ;
- le nommage des calques.

La note technique de divRIOTS parle seulement de sérialisation du DOM, de shadow DOM et d'iframes [S34]. Les pseudo-éléments ne sont pas des nœuds du DOM (déduit : sort incertain).

## 5. Polices : Fraunces et IBM Plex Sans

- **Présentes dans Figma** : Figma inclut par défaut les polices Google [S41]. Sa bibliothèque de polices a une page pour chacune, avec Light, Regular, Semi Bold et les autres graisses [S42]. divRIOTS : les polices Google s'affichent directement [S22].
- **Le plugin transmet à Figma le nom interne de la police rendue**, celui que Chrome montre dans DevTools > Rendered Fonts. Il ne transmet pas le nom `font-family` du CSS [S15]. Si une police manque : bouton « Download missing fonts », ou correspondance vers une police installée [S15][S28][S44]. On peut changer la police après l'import [S21]. Seule la personne qui importe a besoin de la police : Figma garde les tracés [S15].
- **Relevé dans le dépôt** (`polices-noms-internes.txt`, fontTools, lecture seule) : les fichiers statiques servis par Lestraque (`lestraque/fonts/fraunces-300|400|600.woff2`, `ibm-plex-sans-400|600.woff2`) ont **tous** la sous-famille `Regular` et le nom complet `Fraunces Regular` / `IBM Plex Sans Regular`, **y compris les graisses 300 et 600**. Seul `usWeightClass` change. **Risque, non documenté** : dans Figma, le 300 ou le 600 arrive en « Regular ». Les variables de `_polices/` ont un axe `wght` (Fraunces 100–900, Plex 100–700).
- **Axes** : chez Google, Fraunces a les axes `opsz` 9–144 (14 par défaut), `SOFT`, `WONK` et `wght`. IBM Plex Sans a `wdth` et `wght` [S43]. Les fichiers du site n'ont que `wght`, ou aucun axe pour les statiques. Un grand titre Fraunces dans Figma peut donc sortir avec un autre dessin (taille optique) que sur le site → à vérifier à l'œil.
- **`font-display`** : Lestraque sert IBM Plex Sans en `optional` et Fraunces en `swap` (`lestraque/styles.css:2-6`, écrit par `generer.mjs:355-359`). Avec `optional`, une police qui rate la fenêtre d'environ 100 ms est remplacée par la police de secours (system-ui, Segoe UI, Roboto) jusqu'à la fin de la page. Si le moteur capture à ce moment-là, **c'est la police de secours qui part dans Figma** (déduit de [S15]).
- **Couverture** : Plex est découpée en sous-ensemble (`_polices/ibm-plex-sans/couverture.json`). Un caractère hors de ce sous-ensemble s'affiche dans la police du système (commentaire `generer.mjs:346-347`). Le générateur le refuse déjà dans le contenu (`generer.mjs:124`).

## 6. Ce que Lestraque utilise et qui pose problème (lecture seule, fichier:ligne)

| Sujet | Où, et ce qui se passe |
|---|---|
| Apparitions gérées en JS | classe `js` posée par `_kit/kit.js:7`. Les éléments commencent à opacité 0 (`.js .mot` kit.css:102, `.hero .entre` :104, `.reveal` :250, `.hero__pied` :345, `figcaption` de galerie :601) et deviennent visibles quand un IntersectionObserver les voit (`kit.js:158-162`). Si la capture ne fait pas défiler la page : **calques invisibles** |
| Animations liées au défilement | `animation-timeline` en kit.css:561-635 |
| Mise en page qui dépend de `prefers-reduced-motion` | kit.css:337, 580, 626, 697, 750, 814 |
| `content-visibility:auto` | sections sous le plateau, au téléphone (≤ 767 px) : kit.css:875. Rendues seulement avec `html.tout-rendu` (kit.css:877, `kit.js:55-60`) |
| `position:fixed` | nav kit.css:37, panneau :73, voile :383, grain en `::before` sur tout l'écran :255 |
| `position:sticky` | :172, :664 ; scènes à `100svh` : :631, :1080, :1112 |
| `backdrop-filter` | kit.css:51 (avec `color-mix`), :112 |
| `clip-path` | polygone en `vw` :281, `inset` :544 et :601 |
| `mask` | kit.css:1185, familles/telephone.css:27 |
| `mix-blend-mode` | :255, :273, :1185 |
| Rotations | :71-72, :128 (survol), :204, :476, `rotate:-3deg` :544 |
| Pseudo-éléments | 69 `::before` / `::after` dans kit.css, dont le « + » de la FAQ (:203) |
| Carrousels horizontaux | `overflow-x:auto` + scroll-snap : :552, :735, :779 |
| Container query | `container-type` :900 |
| Images | `lestraque/images/` ne contient que de l'**AVIF et du WebP** (54 de chaque). `index.html` utilise 15 `<picture>` et du `loading="lazy"` (ligne 42) |
| Canvas WebGL du relief | `.hero__relief` kit.css:1154 (opacité 0 jusqu'à ce qu'il soit prêt), `kit.js:183` |
| `background-clip:text` | aucune occurrence |

## 7. Règles à appliquer aux pages du kit

Ces règles s'appliquent à ce que produit `scripts/kit-figma.mjs`. Chaque règle donne sa raison et sa source. Le contenu reste « du vrai » : les valeurs, photos et crédits sont lus dans le code ou dans le site généré, avec leur origine.

### A. Accès, largeurs, budget

1. **Publier en production**, sur une URL HTTPS publique sans protection : pas de preview Vercel protégée, pas de mot de passe [S5][S7]. L'effet de `<meta name="robots" content="noindex">` sur l'import n'est pas documenté. Déduit : l'import est un rendu dans un navigateur, pas un robot d'indexation → à confirmer au premier import.
2. **Une page par largeur, à largeur verrouillée** : `…-1440.html` avec `html,body{width:1440px;margin:0}`, et `…-390.html` à 390 px. Dans ces pages :
   - aucune unité `vw`, `vh`, `svh` ou `dvh` ;
   - aucun `clamp()` qui dépend de la fenêtre ;
   - aucune `@media` sur la largeur ;
   - aucune container query.

   Les valeurs sont **résolues à l'avance** par Playwright sur Lestraque, à la même largeur, avec la règle d'origine (fichier:ligne). Raisons : ces unités sont figées à la largeur de capture (§2, déduit) ; le plugin gratuit ne propose pas 1440 [S12][S44] ; le contournement pleine page gonfle la hauteur de la fenêtre, donc tout ce qui est en `vh` avec [S13].
3. **Largeurs d'import** : les pages `-1440` par l'extension (préréglage 1440, ou DevTools en mode appareil à 1440, puis « Capture Full Page ») [S13][S44]. Les pages `-390` par le préréglage 390 du plugin ou de l'extension [S12][S44].
4. **Budget de 10 imports sur 30 jours** : 1 import pour le banc d'essai (§8), puis au plus 4 pages × 2 largeurs = 8 imports. Réserve : 1. Pas d'import en lot en gratuit [S17]. Le kit tient donc en **4 URL au maximum par largeur** : regrouper les sections, ne pas faire une page par section.
5. **Poids limité** et **témoin de fin** : chaque page finit par une section « fin de page — N sections attendues ». Un import tronqué se voit tout de suite [S20].

### B. Un état figé, sans JS

6. **Aucun JS nécessaire au rendu** :
   - pas de classe `js` ;
   - pas d'IntersectionObserver ;
   - aucun état de départ à `opacity:0` ;
   - pas de `transition` ni d'`animation` (`*{animation:none!important;transition:none!important}`).

   On montre l'état final. Raisons : les animations ne passent pas [S19][S35], et la capture photographie l'instant (voir §6, apparitions gérées en JS).
7. **Les états se montrent côte à côte** : normal, survol, ouvert (FAQ), menu ouvert. Ce sont des variantes statiques (classe dédiée), chacune avec la règle d'origine (ex. `kit.css:128` pour le survol du bouton). Ne pas compter sur l'option « For hover effects » [S25] : la tester seulement.
8. **Aucune requête média** `prefers-reduced-motion` ni `prefers-color-scheme` : le thème de capture est une option du plugin et de l'API [S37][S44], et le réglage « mouvement réduit » du navigateur de capture n'est pas documenté. À l'import, choisir le thème **Light** (la page est identique dans les deux thèmes).
9. **Pas de scroll-driven animation**, pas de `content-visibility:auto` (forcer `visible`), pas de `height:100%` avec défilement interne sur `html` ou `body` [S13].
10. **Ni `fixed` ni `sticky`** : nav, panneau, voile, grain et titres collants sont posés dans le flux. Un texte note le vrai comportement, par exemple « sticky top:7rem — kit.css:172 ». fixed et sticky ne servent qu'au prototype [S2][S26] ; dans une planche statique, ils recouvrent ou déplacent le contenu.
11. **Carrousels dépliés** : toutes les cartes visibles, retour à la ligne. On peut ajouter la version rognée du site, annotée. Le défilement horizontal n'existe qu'en prototype [S27].

### C. Styles à rendre concrets

12. **Pseudo-éléments** : quand un pseudo-élément porte du sens (le « + » de la FAQ, le grain), on le remplace par un vrai élément (`<span>`). Non documenté [S34], donc on le teste au banc d'essai.
13. **clip-path, mask, blend mode, backdrop-filter, filter, rotations** : on garde uniquement le rendu final, en px résolus (le polygone de kit.css:281 est en `vw`). Chaque effet est testé une fois au banc d'essai. Si un effet échoue, on le remplace par **une image de rendu figé**, capturée sur le site par Playwright et légendée avec l'effet et fichier:ligne. Ne pas ajouter de `background-clip:text` (absent de Lestraque).
14. **Couleurs finales écrites en hex ou rgba**, sans `color-mix()` dans les pages du kit. Chaque nuancier **affiche en texte** le nom du jeton, sa valeur et son origine : le nommage des styles et variables par le plugin n'est pas documenté [S24]. Ordre des imports : le premier (1440) avec « Create local styles & variables », le second (390) avec « Use existing local styles », pour ne pas dupliquer les styles [S32][S44].
15. **Textes à garder séparés** (étiquette, valeur, origine) : leur donner des styles différents (ex. origine en 12 px). Sinon le plugin les fusionne [S31].
16. **Liens** : option « Add hyperlinks » décochée. Aucun `<a>` utile dans une planche [S32][S44].

### D. Médias

17. **Images** : un seul `<img src="….webp">`, sans `<picture>` ni source AVIF. Figma accepte le WebP mais pas l'AVIF [S39][S40], et Lestraque n'a pas de JPEG.
    - `loading="eager"`, `decoding="sync"`, `width` et `height` renseignés ;
    - largeur du fichier : environ 2 × la taille affichée, 4096 px au maximum [S39] ;
    - crédit visible, repris de `lestraque/attributions.json`.
18. **Vidéo et canvas WebGL** : remplacés par une image fixe réelle (une image du site capturée), légendée avec sa provenance et l'effet d'origine (`kit.js:183`). La vidéo est réservée aux offres Figma payantes [S39], et le canvas n'est pas documenté.
19. **SVG en ligne** avec des `fill` explicites (`currentColor` n'est pas documenté → à tester) [S19][S20].

### E. Polices

20. **Charger Fraunces et IBM Plex Sans en `font-display:block`**, avec `<link rel="preload" as="font" crossorigin>`. Jamais `optional` (§5).
21. **Graisses** : utiliser dans le kit le fichier qui passe le banc d'essai.
    - s'il y a un doute, les variables de `_polices/` (`fraunces.woff2` wght 100–900, `ibm-plex-sans.woff2` wght 100–700) avec `font-weight:100 900` ;
    - sinon les statiques, dont le nom interne dit « Regular » pour toutes les graisses (§5).

    Vérification dans Figma : les calques 300 doivent être en « Light » et les 600 en « Semi Bold ».
22. **Aucun caractère hors du sous-ensemble Plex** dans les textes du kit, ou bien utiliser le fichier `latin-ext`.
23. **Si le plugin signale une police manquante**, faire correspondre Fraunces → Fraunces et IBM Plex Sans → IBM Plex Sans, jamais vers une police de secours [S15][S44].

### F. Structure et calques

24. **Un cadre par section** : chaque section est un enfant direct de `<body>` (ou d'un seul `<main>`), avec un seul niveau d'enveloppe. La pile verticale est en `display:flex;flex-direction:column;gap:…`, les grilles en `display:grid` : l'auto layout Figma reprend le flex et le grid [S19][S20]. Éviter `display:contents`, les enveloppes inutiles et les calques en `position:absolute` superposés (non documenté).
25. **Un titre de section visible** en tête de chaque cadre, par exemple « 03 — Héros plein · kit.css:1080 ». Le cadre reste identifiable quel que soit le nom de calque automatique, puisque le nommage n'est pas documenté [S37].
26. **Formulaire de devis** : garder de vrais `<input>`, avec valeurs ou textes indicatifs visibles [S30].

## 8. Le banc d'essai (1 import, à faire avant tout le kit)

Page `kit/banc-essai-1440.html`, construite par `kit-figma.mjs` avec les vrais jetons et une vraie photo (avec son crédit). Elle contient des cellules numérotées, et chacune isole un point non documenté :

1. Fraunces 300, 400, 600 en fichiers statiques / en fichier variable, et IBM Plex Sans 400, 600 statique / variable → quel style Figma arrive ?
2. Titre Fraunces de 96 px → même dessin que la capture du site (opsz) ?
3. « + » en `::after` / en `<span>`.
4. `backdrop-filter: blur(14px)` sur photo.
5. Grain en `mix-blend-mode: multiply`.
6. `clip-path` polygone en px, et `inset`.
7. `mask: radial-gradient`.
8. `rotate(45deg)` et `rotate:-3deg`.
9. `color-mix()` / hex, et une couleur en `var(--accent)` → nom du style ou de la variable créé ?
10. Image WebP en `eager` / en `lazy` placée à 3000 px de haut ; `<picture>` AVIF.
11. Élément en `position:sticky` et en `fixed`.
12. Section en `content-visibility:auto` loin dans la page.
13. Cinq cadres portant chacun un nommage : `id`, `aria-label`, `data-name`, `title`, `class` → lequel devient le nom du calque ?
14. Grille `repeat(auto-fit, minmax(…))`.
15. SVG en `currentColor` / en `fill` explicite.
16. `text-shadow`.
17. Élément à `opacity:0`, passé à 1 par JS après 1,5 s → la capture attend-elle ?
18. Témoin de fin.

**À noter pour chaque cellule** : OK, dégradé ou perdu, dans `.orchestre/preuves/024-02/banc-essai-resultats.md`, avec une capture de Figma. Ensuite, les règles 12, 13, 17, 19, 21 et 25 se précisent : on garde ce qui passe, on remplace ce qui ne passe pas par une image de rendu figé. Relever aussi le compteur d'imports restants après ce premier import (§3).

## 9. La procédure pour Benj (offre gratuite)

1. Installer l'extension html.to.design dans Chrome [S36], et avoir le plugin dans Figma.
2. Ouvrir `https://<prod>/sites-demo/kit/<page>-1440.html`. Dans l'extension : Viewports **1440**, Theme **Light**, sortie « Send directly to Figma plugin » (ou `.h2d`) → **Capture Full Page**.
3. Dans Figma, sur le plugin, onglet Extension (ou déposer le `.h2d`) :
   - Use Autolayout **oui** ;
   - Create local styles & variables **oui** (premier import) ;
   - For hover effects **non** ;
   - Add hyperlinks **non**.

   Puis GO.
4. Pages `-390` : plugin, onglet Web, URL, préréglage **390**, Light. Cocher « Use existing local styles » au lieu de « Create… ».
5. Vérifier dans chaque cadre :
   - le témoin de fin est là ;
   - les styles de police (Light, Regular, Semi Bold) sont les bons ;
   - aucun calque n'est invisible.

---

## Sources (lues le 2026-09-16)

Doc html.to.design : pages non datées. Blog : date de publication (`datePublished`) entre parenthèses.

- [S1] https://html.to.design/docs/what-is-html-to-design
- [S2] https://html.to.design/docs/free-features
- [S3] https://html.to.design/docs/pro-plan
- [S4] https://html.to.design/home
- [S5] https://html.to.design/docs/web-tab
- [S6] https://html.to.design/docs/extension-tab
- [S7] https://html.to.design/docs/what-is-the-browser-extension
- [S8] https://html.to.design/docs/import-private-page
- [S9] https://html.to.design/docs/file-tab
- [S10] https://html.to.design/docs/code-tab
- [S11] https://html.to.design/docs/mcp-tab
- [S12] https://html.to.design/docs/capturing-mobile-version
- [S13] https://html.to.design/docs/capturing-full-page-length
- [S14] https://html.to.design/docs/capturing-with-user-agent
- [S15] https://html.to.design/docs/missing-fonts
- [S16] https://html.to.design/docs/improve-image-quality
- [S17] https://html.to.design/docs/bulk-import-url-list
- [S18] https://html.to.design/docs/bot-protected-sites
- [S19] https://html.to.design/docs/from-claude-ai-to-figma
- [S20] https://html.to.design/blog/new-update-gradients-partial-imports-grids (2026-09-07)
- [S21] https://html.to.design/blog/new-features-faster-import-dynamic-fonts (2026-02-17)
- [S22] https://html.to.design/blog/from-claude-design-to-figma (2026-04-21)
- [S23] https://html.to.design/blog/extension-update-copy-to-figma (2026-04-14)
- [S24] https://html.to.design/blog/new-feature-create-variables (2024-09-26)
- [S25] https://html.to.design/blog/new-feature-import-hover-effects (2024-10-17)
- [S26] https://html.to.design/blog/new-features-fixed-sticky-elements (2024-05-06)
- [S27] https://html.to.design/blog/prototype-ready-imports (2024-04-17)
- [S28] https://html.to.design/blog/new-features-better-autolayout (2024-04-23)
- [S29] https://html.to.design/blog/new-color-image-features (2024-04-11)
- [S30] https://html.to.design/blog/faster-higher-quality-imports (2023-05-22)
- [S31] https://html.to.design/blog/better-text-font-management (2023-04-27)
- [S32] https://html.to.design/blog/get-local-styles-manage-links (2023-05-08)
- [S33] https://html.to.design/blog/new-features-requested-by-you (2023-02-22)
- [S34] https://html.to.design/blog/the-tech-behind-html-to-design (2023-06-02)
- [S35] https://html.to.design/blog/from-webflow-to-figma (2025-06-26)
- [S36] https://chromewebstore.google.com/detail/htmltodesign/ldnheaepmnmbjjjahokphckbpgciiaed (fiche Chrome Web Store, version 0.0.206 du 2026-08-31)
- [S37] https://docs-code.to.design/api (référence de l'API code.to.design, modifiée le 2026-05-27)
- [S38] https://docs-code.to.design/clipboard-mode (en mode presse-papiers, l'API demande des polices Google uniquement et pas de polices système)
- [S39] https://help.figma.com/hc/en-us/articles/360040028034-Add-images-and-videos-to-designs
- [S40] https://forum.figma.com/suggest-a-feature-11/add-support-to-import-and-export-avif-images-29748 (demande de 2022 ; dernier message le 2025-03-27, fonction non livrée)
- [S41] https://help.figma.com/hc/en-us/articles/360039956894-Add-a-font-to-Figma
- [S42] https://www.figma.com/fonts/fraunces/ et https://www.figma.com/fonts/ibm-plex-sans/
- [S43] https://fonts.google.com/metadata/fonts (axes de Fraunces et d'IBM Plex Sans)
- [S44] Captures d'écran de la doc html.to.design (non datées), copiées dans `travail/kit-figma/sources-h2d/captures-doc/` :
  - `import-mobile-page-2` : largeurs proposées par l'extension ;
  - `what-is-h2d-3` et `import-mobile-page-1` : largeurs proposées par le plugin ;
  - `what-is-h2d-2` et `import-private-page-4` : options d'import.
