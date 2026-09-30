# Cahier du profil mobile v2 — démo Atelier Lestraque (024-01)

**16/09/2026.** Rédigé par un sous-agent de Claude Code, à partir des trois diagnostics de 024-01 et de sondes refaites pour ce cahier.

**Destinataires :**
- l'exécutant qui écrit la famille `mobile` (`_kit/familles/mobile.css` et `mobile.js`) ;
- Claude Code, qui écrit le juge `scripts/mobile-qa.mjs` et fait l'intégration ;
- Benj, pour les questions du §8.

**Objectif de Benj (16/09) :** « au téléphone il n'y a pas les animations, il n'y a rien du tout ». Il veut le niveau des sites
MotionSites au téléphone, sur iPhone comme sur Android. Son téléphone de référence est un Xiaomi (complément du 16/09 au §3.6 du
cahier de la vague 5).

---

## 0. À lire d'abord

### 0.1 Sources

**Diagnostics** (`.orchestre/preuves/024-01/diagnostic/`) :
- `moteurs.md` et `android/`, `iphone/`, `iphone-litteral/`, `resume.json` : ce qui bouge vraiment, mesuré le 16/09 de 19 h 30 à 19 h 58 UTC ;
- `inventaire.md` et `inventaire-controle.json` : 76 effets, fichier:ligne, sort au téléphone ;
- `references.md` et `references-mesures/` : support des animations liées au défilement, 8 sites primés mesurés au téléphone, techniques sans `animation-timeline`.

**Fichiers lus** : `_kit/familles/telephone.css`, `_kit/familles/LISEZMOI.md`, `.orchestre/fait/021-17.md`, cahier de la vague 5
(`.orchestre/preuves/021-00/cahier-vague-5.md`, §0.1, §3.2, §3.4 C, §3.6 et son complément, §5, §6.0, §6.7), `_kit/kit.css`, `_kit/kit.js`,
`generer.mjs`, `eclate.css`, `eclate.mjs`, `recit.mjs`, `recit.bureau.css`, `recit.js`, `video.js`, `survol.js`, `_kit/da.json`,
`next.config.mjs`, `scripts/lighthouse-mediane.mjs`, `scripts/telephone-qa.mjs`, preuves de 021-17 (`juge/lighthouse.json`, `verifier.log`),
`decisions.md`.

**Sondes faites pour ce cahier.**
- **Quand et avec quoi** : le 16/09/2026 entre 21 h 02 et 21 h 25 UTC, avec Chromium 153.0.8010.12 et WebKit 26.6 de Playwright 1.63.0, sans carte graphique.
- **Sur quoi** : des copies générées par `node public/sites-demo/generer.mjs lestraque --sortie=.orchestre/travail/024-01/cahier/<nom>` :
  - `actuel`, avec les familles de da.json ;
  - `ref`, avec `--familles=recit,video,survol,eclate` ;
  - `nue`, avec `--familles=`.

  Ces copies ont été supprimées à la fin.
- **Aucune mesure de temps** n'a été faite dans ces sondes, et rien n'a été installé.

Scripts et sorties : `.orchestre/preuves/024-01/cahier-sondes/`.

| Fichier | Ce qu'il établit |
|---|---|
| `poids.json` | brotli 11 : `styles.css` 13 931 o (familles de da.json), 13 566 o (`ref`), 13 282 o (`nue`) ; `site.js` 13 713 o (`ref`) ; `bureau.css` 2 921 o ; 29 `.reveal` et 20 `span.ml__in` à l'accueil ; nombre de mots de chaque titre de scène |
| `sonde-geo.json` | géométrie en 390×844 (dpr 3) et Pixel 7 ; élément LCP ; `@supports` et `CSS.supports` sous le profil corrigé ; faisabilité du héros collant |
| `sonde-mise-en-page.json` | les déclarations de structure du §2.7 ne déplacent aucune boîte, sous Chromium comme sous WebKit |
| `sonde-overflow-clip.json` | `overflow:clip` sur une boîte à `aspect-ratio` (`.plateau__photo`) allonge la page de 26 px sous WebKit (8 409 → 8 435 px) |
| `sonde-webkit.json` | WebKit 26.6 est installé et se lance ; `view()` et `scroll()` pris en charge ; `interpolate-size` non |
| `sonde-moteurs.json` | Chromium et WebKit : une animation CSS en pause se pilote par `currentTime` ; le héros collant tient ; la formule « cover » du §0.4 redonne la progression native (0,250 / 0,500 / 0,750 et 0,250 / 0,501 / 0,751) |
| `sonde-energie.json`, `sonde-energie-2.json`, `sonde-rideau.json` | écart d'image entre l'état caché et l'état final de chaque effet prescrit, posé en CSS injecté : base des seuils « l'effet se voit » (§6.2) |

**Rejouer.**
1. Régénérer les trois copies avec les commandes ci-dessus. `sonde-energie-2.mjs` attend aussi une copie `cahier2/ref`, avec `--familles=recit,video,survol,eclate`.
2. Lancer chaque script avec `node`.
3. Supprimer `.orchestre/travail/024-01`.

### 0.2 Ce que ce cahier corrige ou ajoute (vérifié)

1. **Le profil « iPhone sans animations liées au défilement » tel que prescrit ne retire rien.** Sous Chromium 153,
   `@supports (animation-timeline: --non-supporte())` est vrai : largeur de 15 px au lieu de 10 dans `sonde-geo.json`, et même constat dans les
   diagnostics 1 et 2. Il est corrigé au §5.2 : la réécriture passe à `(animation-timeline-inexistante: …)`. Sondé : la condition vaut faux,
   et sa négation `not (…)` vaut vrai.
2. **Le descripteur Playwright « iPhone 13 » donne 390×664.** Le profil impose 390×844.
3. **WebKit est installé.**
   - **Le binaire** : `webkit-2359`, WebKit 26.6, dans `AppData/Local/ms-playwright`. Il se lance le 16/09 à 21 h 05 UTC et 21 h 21 UTC, sans rien installer (`sonde-webkit.json`).
   - **Ce qui contredit** : la consigne de la tâche et le diagnostic 3 disent « WebKit absent ». Le complément du 16/09 au §3.6 dit l'inverse, et il a raison.
   - **Ce que ce cahier en fait** : deux profils WebKit (§5.4, §5.5), pour les critères fonctionnels et l'équivalence, jamais pour les budgets de temps.
4. **`overflow:clip` sur une boîte à `aspect-ratio` change la mise en page sous WebKit** (+26 px, `sonde-overflow-clip.json`).
   - Le piège « `overflow:hidden` fait d'une boîte un conteneur de défilement » (telephone.css, kit.css v26) se contourne autrement : la
     timeline nommée se pose sur la boîte elle-même, qui en est le sujet, et non sur un descendant (§4.2, règle R6).
   - `overflow:clip` est donc interdit dans `mobile.css`, sauf sur les sélecteurs sondés neutres (§2.7).
5. **La progression d'une timeline `view()` ignore les transformations.** Mesuré : la figure de l'éclaté est à 4 935 px par la chaîne des
   `offsetTop`, et à 4 979 px par `getBoundingClientRect` (le `.reveal` parent est décalé de 44 px). La formule par `offsetTop` redonne la
   progression native. Le repli JavaScript doit donc lire la position de mise en page, jamais le rectangle transformé.
6. **L'élément LCP du téléphone est `span.mot` « pour »** (55 614 px² en 390×844, 60 722 px² en Pixel 7), dans la grande ligne du titre, et
   non la photo. Aucun état caché ni animation d'opacité sur `.h1__ligne-in` et ses mots.
7. **Poser `currentTime` en millisecondes sur une animation liée au défilement lève une erreur** (« progress based animations »), constaté
   pendant les sondes. Un juge qui fige les animations filtre donc celles dont la timeline est `DocumentTimeline`.
8. **Les deux boucles du héros tournent hors de l'écran** (17 arrêts sur 20, diagnostic 1). Elles se mettent en pause (§3.2 H3).
9. **Le film du diagnostic 1 s'arrête à y = 7 200** : le bas du contact et le pied n'y sont pas. Le programme de visite du juge va jusqu'en bas (§6.0).
10. **La plage « entry 20 % cover 45 % » du §3.6 point 4** (cahier de la vague 5) était déjà remplacée par 021-17 (cover 10 à 49 %). Ce cahier garde les plages de 021-17.
11. **Un dossier non suivi `public/sites-demo/kit/` existe depuis 22 h 09 (heure de Paris).**
    - **Origine** : une autre session l'a créé, à 22 h 09. Il contient `index.html`, `kit.json` et `LISEZMOI.md`.
    - **Le risque** : `nav-retenue-qa.mjs` compte comme démo gelée tout dossier autre que `lestraque`, `_kit` et `_polices` (cahier de la vague 5, §5.4).
    - **À faire** : régler ce point avant de lancer les juges (§9).

### 0.3 Pourquoi Benj ne voit « rien du tout »

Quatre causes mesurées ou établies ; le profil v2 répond à chacune.

1. **Hors défilement, seul le héros bouge**, et peu (diagnostic 1).
   - **Le héros** : écart de gris de 2,74 à 4,08 sur 255 entre deux captures à 600 ms, dans sa bande.
   - **Partout ailleurs** : 0 à 0,009.
   - **Le reste de la page** : 25 révélations au temps, chacune jouée une fois : fondu et montée de 44 px en 0,55 s.
2. **Tout ce qui suit le défilement dépend d'`animation-timeline`.**
   - **Les effets en cause** : la citation mot à mot, les verbes, l'éclaté et les trois jauges (diagnostic 2, §3.1).
   - **Qui ne les voit pas** : les navigateurs sans `view()` (diagnostic 3) :
     - les iPhone en iOS 18.7 et 16.7 ;
     - Firefox ;
     - un navigateur Xiaomi à moteur Chromium antérieur à 115 (complément du 16/09).
   - **Leur part** : de 4 à 11 % des pages vues au téléphone en France.
   - **Ce qui leur reste** : l'image fixe de l'éclaté et le texte plein.
3. **En mouvement réduit, tout s'arrête.**
   - **Ce que fait le kit** : `kit.css:259-266` ramène animations et transitions à 0,001 s.
   - **Mesuré** : Lestraque « coupe toutes ses animations » (diagnostic 3, §2.4), héros compris.
   - **Pourquoi c'est probable ici** : l'option « Supprimer les animations », ou l'économiseur de batterie de HyperOS, peuvent activer ce réglage (complément du 16/09).
4. **Les effets liés au défilement sont courts** (diagnostic 1) :
   - la citation s'allume sur 640 px de défilement ;
   - les verbes, sur 280 px ;
   - l'éclaté, sur 440 px.

   Un glissé du pouce les traverse en une fraction de seconde. Les références font plutôt des révélations déclenchées de 0,5 à 1,3 s, et
   de 0,3 à 1,5 s par fragment de texte (diagnostic 3, §2.3).

**Ce que change la v2 :**
- **Des effets déclenchés à l'entrée dans l'écran**, joués en entier et identiques sur tous les moteurs.
- **Un repli JavaScript** pour les rares effets liés au défilement.
- **Des fondus en mouvement réduit.**
- **Des durées faites pour être vues.**

### 0.4 Conventions

**Media :**
- **M (mobile)** = `(max-width:1023px)`.
- **T (téléphone portrait)** = `(max-width:767px) and (min-height:560px)` : conditions du recadrage portrait, `generer.mjs:252` et `kit.css:434-442`.
- **NP** = `(prefers-reduced-motion:no-preference)`.
- **RM** = `(prefers-reduced-motion:reduce)`.
- **Bureau** = ≥ 1 024 px. Rien n'y change, même à la souris.

**Classes posées par `mobile.js`** (préfixe `mob`, jamais ailleurs) :

| Classe | Porteur | Sens |
|---|---|---|
| `mob` | `<html>` | famille active (M, IntersectionObserver présent, initialisation réussie) |
| `mob-sans-vue` | `<html>` | `CSS.supports('animation-timeline: view()')` faux : le moteur de repli tourne |
| `mob-leger` | `<html>` | `navigator.connection.saveData` vrai |
| `mob-eclate` | `<html>` | l'éclaté peut s'ouvrir (NP, pas `mob-leger`, capacités du §3.9) |
| `mob-rideau` | `<html>` | le héros est collant sous le plateau (§3.2 H4) |
| `mob-vu` | cible marquée | l'effet déclenché joue (ou a joué) |
| `mob-immediat` | cible marquée | déjà visible à l'initialisation, ou sautée par une ancre : état final sans animation |
| `mob-heros-pret` | `.hero--plein` | photo du héros décodée : l'entrée démarre |
| `mob-hors` | `.hero--plein` | héros hors de l'écran ou couvert : boucles en pause |
| `mob-compte` | `.chiffre` | comptage en cours |

Propriété posée par `mobile.js` : `--mob-k` (rang d'une cible dans une rafale de déclenchements reçus dans le même rappel, à partir de 0).

**Noms des `@keyframes`** : `mob-t-*` (au temps, au chargement), `mob-d-*` (déclenché), `mob-l-*` (lié au défilement), `mob-r-*`
(mouvement réduit). Réutilisés du kit sans redéclaration : `signature-tourne-2`, `signature-projecteur` (`kit.css:1178`, `:1188`), `jauge`
(`kit.css:566`).

**Position de mise en page d'un sujet** : `T` = somme des `offsetTop` de la chaîne des `offsetParent`, `H` = `offsetHeight`, `vh` =
`innerHeight`, `y` = `scrollY`. Elle ignore les transformations, comme les timelines natives (§0.2 point 5).
- **cover** : `p = (y + vh − T) / (vh + H)`. 0 quand le haut du sujet touche le bas de l'écran, 1 quand son bas touche le haut.
- **entry** : `p = (y + vh − T) / min(H, vh)`. 1 quand le sujet est entré en entier, ou couvre l'écran.
- **plage [a, b]** : progression locale `clamp((p − a) / (b − a), 0, 1)`.
- **rail horizontal** : `p = scrollLeft / max(1, scrollWidth − clientWidth)`.

**Ligne de déclenchement « L % »** : l'effet part quand le bord haut de la boîte observée franchit L % de la hauteur de l'écran en
descendant. IntersectionObserver `rootMargin: '0px 0px -(100 − L)% 0px'`, seuil 0. La boîte observée n'est jamais une boîte déplacée par
l'effet (§3.0).

**Écart et part > 8** (cahier de la vague 5, §0.1) :
- réduction grise à 160 px de large (sharp) ;
- **écart** = moyenne de |a − b| / 255 ;
- **part > 8** = part des pixels dont l'écart dépasse 8 niveaux ;
- **identiques** = écart < 0,006 et part > 8 < 0,02.

**Opacité effective** : produit des `opacity` calculées de l'élément et de ses parents (0 si un parent est en `display:none`).

**Contraste d'un texte translucide** : méthode du cahier de la vague 5, §0.1 (p10 sur les boîtes des mots, couleur effective pixel par
pixel). Seuil de 3,0 pour un grand texte (≥ 24 px, ou ≥ 18,66 px en graisse ≥ 700), 4,5 sinon.

**« Choix du cahier »** marque une valeur sans source extérieure. Elle est écrite avec sa raison, et Claude Code peut la revoir sur film.

---

## 1. Intention

Un artisan ouvre la démo sur son téléphone.

**Le héros vit tout de suite.**
- **À l'arrivée** : la photo de l'escalier recule doucement de 12 %, pendant que la clé du titre (« Menuisier à Rennes ») monte sous son masque et que le chapeau et le bouton apparaissent.
- **Le grand titre** est là dès le premier rendu : c'est l'élément LCP.
- **Au repos** : la cage tourne et le projecteur balaie le bois.

**Le plateau noir monte sur le héros comme un rideau.** Le héros reste en place : son texte s'efface en montant, et la photo
s'assombrit. Sur le noir, la phrase de l'artisan arrive mot à mot, puis sa signature, puis les trois chiffres, qui se comptent sous les
yeux. La photo des mains se découvre de bas en haut et glisse dans son cadre.

**Chaque scène s'ouvre par son titre**, dont les mots se lèvent sous leur masque ; l'introduction suit.

**Prestations, réalisations, étapes.**
- Dans les rails, chaque carte se dévoile quand le pouce l'amène : volet de la photo, puis numéro, titre et texte.
- La jauge suit le pouce, sur tous les téléphones.

**Dans l'atelier**, la phrase apparaît, puis les quatre verbes s'allument et se surlignent l'un après l'autre. La photo dérive lentement
pendant qu'on traverse la scène.

**Les communes** glissent en place, une ligne après l'autre.

**Les étapes.** L'escalier s'ouvre pièce par pièce au rythme du défilement, les pastilles se posent, puis la légende nomme les pièces. Sur
le rail des étapes, le grand numéro de chaque carte s'allume à son arrivée.

**Questions et contact.**
- **Les questions** : la photo se découvre, et les questions arrivent l'une après l'autre.
- **Le contact** : le titre se lève, et le formulaire ne bouge pas.

**Le même film partout.** Sur iPhone (iOS 26 ou plus ancien), sur Chrome Android et sur un navigateur Xiaomi ancien, le visiteur voit la
même chose.
- **En mouvement réduit** : tout apparaît en fondus courts, rien ne se déplace.
- **En économie de données** : l'éclaté reste l'image fixe.

**La règle de la vague 5 reste** : un seul mouvement principal par écran, jamais plus de deux textes en mouvement ensemble (§2.4).

---

## 2. Règles communes

### 2.1 Portée

- **Tout vit sous M.**
  - **Accueil** : tous les effets.
  - **Pages communes** : héros (H1, H2), titres, cartes, rails, communes, contact.
  - **Pages légales** : le menu seulement.
- **Sous T seulement** : le geste au repos RL (H3), le rideau (H4) et les jauges (≤ 767 px ; ≤ 759 px pour les étapes). Ce sont les
  conditions où ces éléments existent dans le kit.
- **Tablette (768 à 1 023 px)** : les effets déclenchés, l'entrée du héros, l'éclaté, la photo du plateau et la dérive de l'atelier
  (§3.13).
- **Rien ne change au bureau (≥ 1 024 px)**, à la souris comme au toucher.
  - Aucune règle de `mobile.css` ne s'y applique.
  - `mobile.js` s'arrête à sa première ligne utile, sans écouteur, sans classe et sans écriture.
- **Hors du périmètre, et qui ne changent pas** :
  - le relief WebGL, la vidéo d'atelier et le survol (bureau seulement) ;
  - le comptage des chiffres au bureau (`recit.js`) ;
  - la barre retenue (≥ 960 px) ;
  - le formulaire de devis (« aucun mouvement ajouté dans le formulaire », cahier de la vague 5, §2).

### 2.2 Deux sortes de mouvements

| Sorte | Quand l'utiliser | Technique | Même rendu partout ? |
|---|---|---|---|
| **Déclenchée** (`mob-d-*`) | textes, cartes, photos qui entrent : l'effet doit être vu en entier | IntersectionObserver de `mobile.js` qui pose `mob-vu` ; animation CSS au temps (`@keyframes` à `from` seul, état final = style de base) | oui, par construction : aucune dépendance à `animation-timeline` |
| **Liée au défilement** (`mob-l-*`) | gestes qui doivent suivre le pouce : rideau, éclaté, glissement des photos, jauges | natif sous `@supports (animation-timeline: view())` (ou `scroll()`) ; sinon repli : la même animation CSS en pause, dont `mobile.js` pose `currentTime` à chaque image (§4.3) | oui, mesuré (§6.3) : la formule du §0.4 redonne la progression native (`sonde-moteurs.json`) |

**Pourquoi le texte n'est plus lié au défilement au téléphone :**
- un glissé traverse une plage de 280 à 640 px en une fraction de seconde (§0.3) ;
- les références déclenchent leurs textes (diagnostic 3, §2.3) ;
- un effet déclenché est identique sur tous les moteurs.

`animation-timeline` reste une amélioration sur les quatre gestes qui suivent le pouce, avec un rendu équivalent mesuré.

### 2.3 Propriétés, courbes et durées

**Propriétés animées** : `opacity`, `transform`, `translate`, `scale`, `rotate`. Jamais `clip-path`, `filter`, `width`, `height`, `top`,
`left`, `margin` ni `padding`. Les volets des photos sont un calque `::after` de la couleur du fond, réduit par `transform:scaleY()` : c'est
un volet composé, sans `clip-path`.

**Courbes** : celles du jeu du cahier de la vague 5, §3.2 (DF-5).

| Usage | Valeur |
|---|---|
| Entrée (mot, carte, volet, zoom) | `cubic-bezier(.16,1,.3,1)` |
| Fondu seul (phrase, pied du héros, mouvement réduit) | `cubic-bezier(.2,.7,.2,1)` |
| Aller-retour ambiant (RL) | `cubic-bezier(.37,0,.63,1)` ; projecteur `linear` |
| Lié au défilement | `linear` |
| Comptage des chiffres (calculé en JavaScript) | `cubic-bezier(.16,1,.3,1)` |

**Durées et décalages** (valeurs exactes au §3) :
- mots d'un titre : 850 ms, 60 ms par mot ;
- mots de la citation : 700 ms, 50 ms par mot ;
- paragraphes : 700 ms ;
- volet : 900 ms ; zoom d'image : 1 200 ms ;
- comptage : 1 300 ms ;
- entrée du héros : 1 800 ms ;
- fondu en mouvement réduit : 400 ms.

Sources :
- références mesurées : révélation de 0,5 à 1,3 s, fragment de texte de 0,3 à 1,5 s, recommandation de 40 à 60 ms par mot (diagnostic 3, §0 et §2.3) ;
- zoom d'entrée de Hays : 2,5 s ;
- kit : entrée 0,55 s, zoom 0,9 s, titre du bureau 0,95 s (`kit.css:339`) ;
- comptage : 1,3 s (cahier de la vague 5, §3.1 B).

Le reste est un choix du cahier, à juger sur film.

### 2.4 Un geste à la fois

- **Au plus deux groupes de texte** en mouvement au même instant, sur le programme de visite lent (§6.0).
- **Chaque groupe compte pour un** :
  - une tête de scène (surtitre, titre, introduction) ;
  - la citation et sa signature ;
  - les chiffres ;
  - les cartes d'un rail ;
  - la phrase et ses verbes ;
  - la liste des communes ;
  - la légende de l'éclaté ;
  - la liste des questions ;
  - le texte du héros pendant le rideau.
- **Photos, volets, éclaté et jauges** ne sont pas des textes.
- **Lignes et seuils** : ils sont choisis pour que les groupes d'une section se suivent (§3.0, table des positions).

### 2.5 Mouvement réduit

**Le constat** : au téléphone, le réglage peut être actif sans que le visiteur l'ait voulu (complément du 16/09). Le site doit rester
vivant sans rien déplacer.

**Rien ne se déplace, ne grandit ni ne tourne.**
- Aucune boucle ; aucun effet lié au défilement, sauf les jauges, qui indiquent la position du pouce.
- Ni rideau, ni RL, ni entrée du héros, ni dérive, ni glissement, ni comptage.
- L'éclaté reste l'image fixe (`eclate.css`, E0).

**Ce qui reste : un seul fondu d'opacité par bloc**, sur les mêmes cibles que les effets déclenchés.
- **Animation** : `mob-r-fondu`, 400 ms, `cubic-bezier(.2,.7,.2,1)`, sans décalage entre mots.
- **Déclenchement** : dès que la cible entre dans l'écran (seuil 0, marge 0).
- **Garde-fou** : rien ne clignote, jamais d'opacité qui redescend.

**Lisible** : tout texte entièrement à l'écran atteint une opacité effective d'au moins 0,98 moins de 450 ms après son entrée dans
l'écran.

**Cascade** : `kit.css:259-266` impose `animation-duration:.001s!important`. Les règles de fondu de `mobile.css` portent donc `!important`
avec une spécificité supérieure : au moins `html.mob` et une classe.

### 2.6 Économie de données et d'énergie

- **Vidéo** : aucune au téléphone. `video.js` ne s'active qu'à partir de 1 024 px (`video.js:9-10`), et `mobile.js` n'en crée aucune.
- **`navigator.connection.saveData` vrai** : `mob-leger`. L'éclaté reste l'image fixe : `eclate.avif`, 15 070 o, au lieu d'`assemble.avif`
  et des quatre calques, 41 749 o. Le reste ne pèse rien de plus et ne change pas.
- **Au repos** : 0 appel à `requestAnimationFrame`, ni à `setInterval`.
  - **rAF** : seulement pendant un défilement près d'un sujet lié, et pendant les 1 300 ms d'un comptage.
  - **Référence** : Lestraque est à 0 rAF/s au repos ; les références avec Lenis et GSAP sont à 123-181 (diagnostic 3).
- **Boucles du héros** : en pause dès que le héros est hors de l'écran ou couvert par le plateau (H3).
- **Économie d'énergie d'iOS** : rAF et animations passent à 30 images/s (WebKit bug 168837, diagnostic 3). Aucun effet n'en dépend pour
  son état final.

### 2.7 Mise en page : CLS 0

- **Première règle** : aucune déclaration de `mobile.css` ne déplace une boîte par rapport à la génération sans la famille : même position
  et même hauteur de chaque section et de chaque cible, à 1 px près (MO-5).
- **Déclarations de structure** (changement de `display` en ligne, `position`, `overflow`, recadrage statique par `scale`) :
  - elles vivent sous `html.js`, posé par le script en ligne du `<head>` avant le premier rendu, et jamais sous `html.mob` ;
  - la page est donc la même au premier rendu et après `mobile.js`.
- **Sondées neutres** (390×844, Chromium 153 et WebKit 26.6, `sonde-mise-en-page.json`) :
  - `.ml{display:inline-block;vertical-align:top;overflow:clip;padding-block:.1em .26em;margin-block:-.1em -.26em}` et `.ml__in{display:inline-block}`. `mobile.css` écrit `overflow:visible clip`, la valeur du bureau (`kit.css:1090`), qui laisse déborder en largeur les approches négatives de Fraunces. La sonde a mesuré `overflow:clip` : MO-5 revérifie la mise en page avec la valeur écrite ;
  - `.plateau__citation .citation__mot{display:inline-block}` ;
  - `.atelier__verbe{display:inline-block;position:relative}` ;
  - `.chiffre__valeur{position:relative}` et `.chiffre__compte{position:absolute;top:0;right:0;white-space:nowrap}` ;
  - `.h1__cle{overflow:clip}` ;
  - `#etapes figure.eclate{content-visibility:auto;contain-intrinsic-size:auto 75vw}` ;
  - `position:relative` sur `.plateau__photo`, `.presta__vignette`, `.galerie__cadre` et `.faq-scene__photo`.
- **Interdit** : `overflow:clip` ou `overflow:hidden` hors de `.ml`, `.h1__cle` et des trois jauges (copies des valeurs du kit). Mesuré :
  +26 px sous WebKit sur `.plateau__photo` (§0.2 point 4).
- **États cachés** : seulement `opacity`, `translate`, `scale` et `transform`, qui ne prennent pas part à la mise en page.
- **Le rideau** (`position:sticky`) ne change aucune position au repos (sondé : héros à 0 et plateau à 844 pour y = 0). Il n'est posé que si
  `scrollY` < 1 à l'initialisation (H4).

### 2.8 Hauteur d'écran iOS

- **Unités** : `svh` pour toute hauteur d'écran dans `mobile.css` (collant du rideau `100svh`, montée du texte `-6svh`). Jamais `vh` :
  critère MO-1.
- **Moteur de repli** : il lit `innerHeight` et relit la géométrie à chaque `resize`, qui part quand la barre d'adresse se replie.
- **Non vérifiable ici** : sur un vrai iPhone, la hauteur que prend la timeline native (écran petit ou grand) quand la barre bouge (§9).

### 2.9 Accessibilité

- **Textes cachés** : ils restent dans l'arbre d'accessibilité (opacité ou translation, jamais `display:none` ni `visibility:hidden`).
- **Chiffres** : `.chiffre__vrai` garde toujours la valeur finale, et le compte vit dans `.chiffre__compte`, en `aria-hidden` (`recit.mjs`).
- **Contrastes** :
  - **État final** : ceux d'aujourd'hui.
  - **Verbes à 0,55 d'opacité** : ils tiennent 4,5 grâce au voile renforcé de `telephone.css`, repris (§3.6).
  - **Surlignage** : il ne baisse pas le contraste final (MO-19).
- **WCAG 2.2.2** (mouvement automatique de plus de 5 s) : le geste RL tourne sans fin, comme au bureau. C'est une question pour Benj (Q-M2).

---

## 3. Les effets, section par section

### 3.0 Déclencheurs et marquage (commun)

**Les observateurs.** `mobile.js` crée un IntersectionObserver par couple (marge, seuil). La boîte observée ne bouge jamais sous l'effet
qu'elle déclenche. La classe `mob-vu` est posée sur la boîte marquée, puis la cible est désobservée.

| Groupe | Boîte observée | Boîte marquée | `rootMargin` | Seuil |
|---|---|---|---|---|
| A (88 %) | chaque `h2` qui contient `.ml` | `h2.closest('.scene__tete,.etapes__tete,.faq-scene__tete,.contact__tete')`, sinon le `h2` (atelier). Pour la tête des questions, aussi `.faq-scene__intro` du même `.faq-scene` | `0px 0px -12% 0px` | 0 |
| A (88 %) | chaque `.scene--communes .commune` | elle-même | `0px 0px -12% 0px` | 0 |
| B (85 %) | `.chiffre`, `.plateau__photo`, `.faq-scene__photo` | elle-même | `0px 0px -15% 0px` | 0 |
| C (70 %) | `.atelier__phrase`, `.faq-scene .faq` | elle-même | `0px 0px -30% 0px` | 0 |
| D (62 %) | `.plateau__citation blockquote p` | `figure.plateau__citation` | `0px 0px -38% 0px` | 0 |
| E (55 %) | `ol.eclate__legende` | elle-même | `0px 0px -45% 0px` | 0 |
| F (cartes) | `.scene--presta .presta__ligne`, `.galerie--scene .galerie__item` | elle-même | `0px 0px -15% 0px` | 0,35 |
| G (étapes) | `.da--etapes .etape` | elle-même | `0px 0px -30% 0px` | 0,6 |
| R (mouvement réduit) | toutes les boîtes ci-dessus | les mêmes | `0px` | 0 |

**Pourquoi un seuil sur les cartes.** Dans un rail, la carte suivante dépasse de 5 vw : 13 % de sa surface pour une étape, 12,5 % pour une
prestation. Le seuil la garde cachée jusqu'au glissé du pouce. La carte entièrement à l'écran part quand 35 % (ou 60 %) de sa surface est
dans la zone haute de l'écran.

**Première livraison de chaque observateur.**
- Une cible qui coupe déjà l'écran, ou qui est au-dessus (`boundingClientRect.bottom <= 0`), reçoit `mob-vu mob-immediat` : elle est dans
  son état final, sans animation.
- `<html>` reçoit `mob` dans le `requestAnimationFrame` qui suit la première livraison de tous les observateurs : aucun texte à l'écran ne
  disparaît pendant une image.
- Plus tard, une cible passée au-dessus de l'écran sans avoir coupé la zone (saut d'ancre) reçoit aussi `mob-vu mob-immediat`.

**Rafale.** Quand plusieurs cibles d'un même groupe arrivent dans le même rappel, `mobile.js` pose `--mob-k` = leur rang (0, 1, 2…) dans
l'ordre du document. Sinon `--mob-k` vaut 0.

**Positions attendues en 390×844.**
- Base : sonde du 16/09, copie `ref`, position de mise en page.
- Ces valeurs servent de repère et de contrôle d'ordre ; le juge relit la géométrie réelle.
- Le y indiqué est la position de défilement où l'effet part.

| Effet | Haut du sujet (px) | y de départ (px) |
|---|---|---|
| Rideau, fin du texte (entry 30 % du plateau, haut 844) | 844 | 0 → 253 |
| Citation (D) | 900 | 377 |
| Chiffres 1, 2, 3 (B) | 1 229 / 1 312 / 1 395 | 512 / 595 / 678 |
| Photo du plateau (B) | 1 513 | 796 |
| Titre des prestations (A) | 1 829 | 1 086 |
| Carte 1 des prestations (F, 312×614) | 2 041 | ≈ 1 539 |
| Titre de l'atelier (A) | 2 851 | 2 108 |
| Phrase de l'atelier (C) | 2 987 | 2 396 |
| Titre des réalisations (A) | 3 681 | 2 938 |
| Carte 1 des réalisations (F, 332×470) | 3 824 | ≈ 3 271 |
| Titre des communes (A) | 4 555 | 3 812 |
| Communes 1 à 4 (A) | 4 673 / 4 726 / 4 778 / 4 831 | 3 930 / 3 983 / 4 035 / 4 088 |
| Éclaté, cover 10 → 49 % (H 293, vh + H = 1 137) | 4 935 | 4 205 → 4 648 |
| Titre des étapes (A) | 5 391 | 4 648 |
| Légende (E) | 5 256 | 4 792 |
| Carte 1 des étapes (G, 296×196) | 5 522 | ≈ 5 049 |
| Photo des questions (B) | 5 815 | 5 098 |
| Titre des questions et introduction (A) | 6 111 | 5 368 |
| Liste des questions (C) | 6 247 | 5 656 |
| Titre du contact (A) | 6 856 | 6 113 |

### 3.1 Nav et menu (toutes les pages, M)

- **Nav** : inchangée. Les transitions de couleur et les deux couches découpées (K1, K2) restent celles de `kit.js` et `kit.css`.
- **Menu (N1)**. Quand `kit.js` pose `.panneau.ouvert`, sous M, NP et `html.js` :

| | Valeur |
|---|---|
| Liens `.panneau nav a` | `animation: mob-d-monte 450ms cubic-bezier(.16,1,.3,1) both`, `--mob-dy:12px` ; délai `80ms + 45ms × (rang − 1)`, rang 1 à 8 par `:nth-child` (au-delà : 395 ms) |
| `.panneau__bas` et le bloc du bouton | `animation: mob-d-fondu 400ms cubic-bezier(.2,.7,.2,1) 300ms both` |
| Fermeture | inchangée (fondu et glissé du panneau, `kit.css:73`) |
| Sans `animation-timeline` | rien à remplacer (au temps) |
| Mouvement réduit, économie de données | rien de plus que le kit |

### 3.2 Héros

#### H1 — Entrée de la photo (accueil et pages communes, M, NP)

| | Valeur |
|---|---|
| Structure (dès le premier rendu, `html.js`) | `.hero--plein .hero__media{scale:1.12}` ; `transform-origin:50% 76.86%` sous T à l'accueil (l'œil de la spirale affiché, telephone.css) ; `50% 50%` ailleurs |
| Départ | `mob-heros-pret` sur `.hero--plein` quand l'`img` du héros est décodée : `img.decode()` après `complete`, sinon après l'évènement `load` ; au plus 3 000 ms après le départ de `mobile.js` |
| Animation | `.mob-heros-pret .hero__media{scale:1;animation:mob-t-zoom 1800ms cubic-bezier(.16,1,.3,1) both}` ; `@keyframes mob-t-zoom{from{scale:1.12}}` |
| Pourquoi 1,12 et pas plus | un recul lisible (Hays : zoom d'entrée de 2,5 s, diagnostic 3) qui ne découvre aucun coin : une échelle ≥ 1 appliquée au parent ne fait que couvrir davantage |
| LCP | la photo n'est pas l'élément LCP (`span.mot`, §0.2 point 6) |
| Sans `animation-timeline` | identique (au temps) |
| Sans JavaScript ou si `mobile.js` échoue | photo à 1,12, immobile |
| Mouvement réduit | ni échelle ni animation |
| Économie de données | identique (0 octet) |

#### H2 — Clé du titre et pied (accueil et pages communes, M, NP, dès le premier rendu)

| | Valeur |
|---|---|
| Clé | `html.js .h1__cle{overflow:clip}` ; `html.js .h1__cle>span{animation:mob-t-leve 900ms cubic-bezier(.16,1,.3,1) 100ms both}` ; `@keyframes mob-t-leve{from{translate:0 110%}}` |
| Pied | `html.js .hero--plein .hero__pied{animation:mob-t-fondu 700ms cubic-bezier(.2,.7,.2,1) 450ms both}` ; chapeau : `animation:mob-t-monte 700ms cubic-bezier(.16,1,.3,1) 450ms both`, `--mob-dy:14px`. La boîte du bouton ne bouge pas (précédent du kit : `kit.css:342-345`, un bouton déplacé gênait le juge d'usage) |
| Grande ligne `.h1__ligne-in` et ses `.mot` | rien : visibles au premier rendu, puisque c'est l'élément LCP |
| Sans `animation-timeline`, économie de données | identique |
| Mouvement réduit | rien |

#### H3 — Geste au repos RL (accueil, T, NP)

| | Valeur |
|---|---|
| Règles | `telephone.css:23`, `:27` et `:29` recopiées octet pour octet hors commentaires, avec les mêmes conditions (`html.js.da--signature .ouverture>.hero--plein:not(.hero--commune)`) : rotation `signature-tourne-2` 10 s `cubic-bezier(.37,0,.63,1)` infinite alternate, `transform-origin:50% 61%`, `translate:0 15.86%`, `scale:1.29` ; projecteur `signature-projecteur` 9 s `linear` −2,5 s infinite ; voile `::after` en `z-index:2` |
| Pourquoi ces valeurs | jugées par 021-17 : 0 pixel découvert sur 201 images, contraste du titre ≥ 4,64, part > 8 de 0,604 entre 2,5 et 5,0 s |
| Pause | `.hero--plein.mob-hors .hero__media img,.hero--plein.mob-hors .hero__media::before{animation-play-state:paused}`. `mob-hors` est posé quand le héros ne coupe plus l'écran (observateur, seuil 0) ou quand le plateau couvre le haut de l'écran (observateur sur `.ouverture>.plateau`, `rootMargin: '0px 0px -99% 0px'`, coupe) ; retiré sinon |
| Sans `animation-timeline`, économie de données | identique |
| Mouvement réduit | rien (le kit ramène la photo à `scale:1`) |

#### H4 — Rideau (accueil, T, NP)

| | Valeur |
|---|---|
| Condition | `mob-rideau` sur `<html>` si, à la première livraison de l'observateur du héros : `boundingClientRect.height <= rootBounds.height + 1`, `scrollY < 1`, T et NP. Un héros plus haut que l'écran ne colle jamais, sinon son bas serait inatteignable |
| Structure | `html.mob-rideau .ouverture>.hero--plein{position:sticky;top:0}` ; `html.mob-rideau .ouverture>.plateau{position:relative;z-index:1;box-shadow:0 -2.5rem 5rem -.5rem rgba(10,7,4,.55)}` (ombre du bureau, `kit.css:1081`) ; `html.mob-rideau .ouverture>.hero--plein::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;background:#0E0A07;opacity:0}` |
| Géométrie (sondée) | le héros reste à 0 et le plateau monte : y = 422 → plateau à 422 ; y = 844 → 0 ; le héros se décolle à y = 929 (Chromium, plateau de 929 px) |
| Timeline | sujet `.ouverture>.plateau`, plage entry. Natif : `.ouverture{timeline-scope:--mob-plateau}`, `.ouverture>.plateau{view-timeline:--mob-plateau block}` |
| Texte du héros | `.ouverture .hero__contenu` : `mob-l-rideau-texte{from{opacity:1;translate:0 0}to{opacity:0;translate:0 -6svh}}`, plage `entry 0%` → `entry 30%` |
| Voile | `.ouverture>.hero--plein::after` : `mob-l-rideau-voile{from{opacity:0}to{opacity:.6}}`, plage `entry 10%` → `entry 100%` (valeurs du bureau, `kit.css:1084`, `:1131`) |
| Ordre | le texte est effacé à y = 253 ; la citation part à y = 377 (§3.0) : jamais deux textes ensemble |
| Sans `animation-timeline` | mêmes `@keyframes` en `1000ms linear both paused` sous `@supports not (animation-timeline: view())` ; `currentTime` = progression locale × 1 000, posé par le moteur (§4.3). Le voile est une animation de pseudo-élément : le moteur la trouve dans `document.getAnimations()` par `effect.target` et `effect.pseudoElement === '::after'` |
| Mouvement réduit, héros trop haut | pas de rideau : le héros défile normalement |
| Économie de données | identique |

### 3.3 Plateau (accueil)

#### P1 — Citation mot à mot (groupe D, 62 %)

| | Valeur |
|---|---|
| Structure (`html.js`, M) | `.plateau__citation .citation__mot{display:inline-block}` (sondé neutre : le paragraphe garde 155 px et 4 lignes) |
| Neutralisation | `html.mob .plateau__citation.reveal{opacity:1;transform:none;transition:none}` |
| Caché (M, NP, `html.mob`) | `.citation__mot{opacity:0;translate:0 .35em}` ; `figcaption{opacity:0;translate:0 12px}` |
| Déclenché | `.plateau__citation.mob-vu .citation__mot{opacity:1;translate:none;animation:mob-d-mot 700ms cubic-bezier(.16,1,.3,1) calc(var(--i,0) * 50ms) both}` ; `@keyframes mob-d-mot{from{opacity:0;translate:0 .35em}}`. Quinze mots : le dernier part à 700 ms et finit à 1 400 ms |
| Signature | `.plateau__citation.mob-vu figcaption{opacity:1;translate:none;animation:mob-d-monte 600ms cubic-bezier(.16,1,.3,1) 1200ms both}`, `--mob-dy:12px` |
| Sans `animation-timeline` | identique (déclenché) |
| Mouvement réduit | caché : `.plateau__citation:not(.mob-vu){opacity:0}` ; déclenché (R) : `animation:mob-r-fondu 400ms cubic-bezier(.2,.7,.2,1) both!important` sur la figure, mots et signature sans animation |
| Économie de données | identique |

#### P2 — Chiffres gagnés (groupe B, 85 %, une ligne à la fois)

| | Valeur |
|---|---|
| Structure (`html.js`, M) | `.chiffre__valeur{position:relative}` ; `.chiffre__compte{position:absolute;top:0;right:0;white-space:nowrap;font-variant-numeric:lining-nums tabular-nums}` (sondé neutre) |
| Neutralisation | `html.mob .chiffres .chiffre.reveal{opacity:1;transform:none;transition:none}` |
| Caché | `.chiffre:not(.mob-vu){opacity:0;translate:0 20px}` |
| Déclenché | `animation:mob-d-monte 600ms cubic-bezier(.16,1,.3,1) calc(var(--mob-k,0) * 150ms) both`, `--mob-dy:20px` |
| Comptage | `mobile.js`, seulement si `.chiffre__compte` existe et si la valeur de `.chiffre__vrai` est un entier de 1 à 7 chiffres (règle de `recit.js:14`).<br>**Départ** : au plus tard de (a) déclenchement de la ligne + 150 ms + `--mob-k` × 150 ms et (b) fin de la citation + 300 ms. La fin de la citation vaut le déclenchement du groupe D + 1 400 ms, ou 0 si la citation a été marquée `mob-immediat`.<br>**Filet** : départ au plus tard 2 000 ms après le déclenchement de la ligne.<br>**Pendant 1 300 ms** : `.chiffre` porte `mob-compte`, `.chiffre.mob-compte .chiffre__vrai{opacity:0}`, et `.chiffre__compte` reçoit `Math.round(valeur × e(t))`, e = `cubic-bezier(.16,1,.3,1)` résolue en JavaScript, écrite dans un `requestAnimationFrame` actif seulement pendant le comptage.<br>**À la fin** : `mob-compte` retiré, compte vidé. Le comptage ne se fait qu'une fois |
| Accessibilité | `.chiffre__vrai` garde la valeur finale à chaque instant ; `.chiffre__compte` est `aria-hidden` |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la ligne ; aucun comptage |
| Économie de données | identique |

#### P3 — Photo du plateau (groupe B pour le volet ; liée pour le glissement)

| | Valeur |
|---|---|
| Structure (`html.js`, M) | `.plateau__photo{position:relative}` ; sous NP : `.plateau__photo img{scale:1.14}` (recadrage statique : le glissement de ±6 % reste couvert, puisque (1,14 − 1)/2 = 7 %) |
| Neutralisation | `html.mob .plateau__photo.reveal{opacity:1;transform:none;transition:none}` |
| Volet | `html.mob .plateau__photo::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:#14110E;transform-origin:50% 0;transform:scaleY(1)}` ; déclenché : `transform:scaleY(0);animation:mob-d-volet 900ms cubic-bezier(.16,1,.3,1) both` ; `@keyframes mob-d-volet{from{transform:scaleY(1)}}`. La photo se découvre de bas en haut |
| Zoom | `.plateau__photo.mob-vu picture{animation:mob-d-zoom 1200ms cubic-bezier(.16,1,.3,1) both}`, `--mob-z:1.1` ; `@keyframes mob-d-zoom{from{scale:var(--mob-z)}}` |
| Glissement (lié) | sujet `.plateau__photo`, `view-timeline:--mob-plateau-photo block` posé sur le sujet lui-même (son `overflow:hidden` ne gêne pas : le sujet n'est pas son propre ancêtre, §0.2 point 4) ; cible `img` : `mob-l-glisse{from{translate:0 -6%}to{translate:0 6%}}`, plage `cover 0%` → `cover 100%` (valeurs du bureau, `kit.css:1105`, `:1134`) |
| Sans `animation-timeline` | volet et zoom identiques ; glissement par le moteur (`1000ms linear both paused`) |
| Mouvement réduit | fondu R du cadre ; ni volet, ni zoom, ni glissement, ni recadrage à 1,14 |
| Économie de données | identique |

### 3.4 Titres de scène (T1 : toutes les scènes de l'accueil et des pages communes, groupe A, 88 %)

Les sept titres de l'accueil et leurs mots : « Ce que je fabrique » (4), « Dans l'atelier » (2), « Pièces livrées » (2), « Autour de Rennes »
(3), « En quatre temps » (3), « Vos questions » (2), « Parlons de votre projet » (4). Source : `poids.json`.

| | Valeur |
|---|---|
| Structure (`html.js`, M) | `.ml{display:inline-block;vertical-align:top;overflow:visible clip;padding-block:.1em .26em;margin-block:-.1em -.26em}` ; `.ml__in{display:inline-block}` (valeurs du bureau, `kit.css:1090-1091` ; sondées neutres au téléphone avec `overflow:clip`, §2.7) |
| Neutralisation | `html.mob :is(.scene__tete,.etapes__tete,.faq-scene__tete,.contact__tete).reveal,html.mob .atelier__titre.reveal{opacity:1;transform:none;transition:none}` |
| Caché | `.ml__in{translate:0 110%}` ; paragraphes de tête (`:is(.scene__tete,.galerie__tete>div,.etapes__tete,.contact__tete)>p:not(.compteur)`, `.faq-scene__intro`) `{opacity:0;translate:0 16px}` ; surtitre `.mono` de la tête `{opacity:0}` |
| Déclenché | `.mob-vu .ml__in{translate:none;animation:mob-d-leve 850ms cubic-bezier(.16,1,.3,1) calc(var(--i,0) * 60ms) both}` ; `@keyframes mob-d-leve{from{translate:0 110%}}`<br>Paragraphes : `animation:mob-d-monte 700ms cubic-bezier(.16,1,.3,1) 450ms both`, `--mob-dy:16px`<br>Surlignage : non. Surtitre : `animation:mob-d-fondu 500ms cubic-bezier(.2,.7,.2,1) both` |
| Sans `animation-timeline` | identique |
| Mouvement réduit | tête entière cachée à opacité 0 ; fondu R ; mots et paragraphes sans translation |
| Économie de données | identique |

**Filet.** `mobile.js` observe tout `h2` qui contient un `.ml`, sur toute page. Aucun `.ml__in` ne reste caché faute d'observateur (MO-4).

### 3.5 Prestations (accueil et pages communes)

#### PR1 — Cartes du rail (groupe F)

| | Valeur |
|---|---|
| Structure (`html.js`, ≤ 767 px) | `.scene--presta .presta__vignette{position:relative}` (la vignette n'existe qu'à cette largeur, `kit.css:724-731`) |
| Volet | `::after` de `.presta__vignette`, fond `var(--fond)` (le papier de la section) ; mêmes règles et durées que P3 (900 ms) |
| Zoom | `picture`, `mob-d-zoom` 1 200 ms, `--mob-z:1.12` |
| Textes | `.presta__num`, `h3`, `.presta__texte` : cachés `opacity:0;translate:0 16px` ; déclenchés `mob-d-monte 700ms cubic-bezier(.16,1,.3,1)`, délais `calc(150ms + var(--mob-k,0) * 120ms)`, `calc(220ms + …)`, `calc(290ms + …)` |
| Au glissé | les cartes 3 à 6, hors de l'écran à l'horizontale, partent quand le pouce les amène (seuil 0,35) |
| Tablette (768 à 1 023 px) | liste, vignette masquée : seuls les textes jouent, mêmes valeurs |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la carte, sans volet ni zoom |
| Économie de données | identique |

#### PR2 — Jauges des rails (liées au rail horizontal ; prestations et réalisations ≤ 767 px, étapes ≤ 759 px)

| | Valeur |
|---|---|
| Natif | inchangé : `kit.css:560-565` (prestations), `:845-852` (étapes), `:856-863` (réalisations), sous `@supports (animation-timeline: scroll())` |
| Sans `animation-timeline`, structure (`html.js`, même media que le kit, sous `@supports not (animation-timeline: scroll())`) | recopie des déclarations d'affichage du kit : prestations `display:block;height:2px;margin-top:1.75rem;background:var(--ligne);overflow:clip`, barre `display:block;height:100%;background:var(--accent-texte);transform-origin:0 50%;transform:scaleX(.17)` ; réalisations `margin-top:1.5rem;background:rgba(244,237,226,.16)`, barre `#D4A574` ; étapes `margin-top:-.25rem;background:rgba(244,237,226,.16)`, barre `#D4A574` |
| Sans `animation-timeline`, mouvement | sous `html.mob` : barre `animation:jauge 1000ms linear both paused` (plus `animation-duration:1000ms!important`, pour le mouvement réduit) ; le moteur pose `currentTime` = p × 1 000 avec p = `scrollLeft / (scrollWidth − clientWidth)` du rail (`.scene--presta .presta`, `.scene--galerie .galerie--scene`, `.da--etapes .etapes__liste`) |
| Mouvement réduit | la jauge suit le pouce (natif comme repli) : c'est une indication de position, pas un mouvement ajouté |
| Économie de données | identique |

### 3.6 Atelier (accueil)

#### A1 — Phrase et verbes (groupe C, 70 %)

| | Valeur |
|---|---|
| Structure (`html.js`, M) | `.atelier__verbe{display:inline-block;position:relative;isolation:isolate}` |
| Voile (`html.js`, M, NP, dès le premier rendu) | `.atelier:has(.atelier__verbe) .atelier__media::after{background:linear-gradient(180deg,rgba(10,7,4,.66) 0%,rgba(10,7,4,.56) 33%,rgba(10,7,4,0) 54%),linear-gradient(0deg,rgba(10,7,4,.48) 0%,rgba(10,7,4,0) 18%)}` (`telephone.css:50` : verbes à 0,55 d'opacité, contraste de 5,35 à 5,61 mesuré par 021-17). Le voile n'est plus conditionné à `view()` : les verbes passent par 0,55 sur tous les moteurs |
| Neutralisation | `html.mob .atelier__phrase.reveal{opacity:1;transform:none;transition:none}` |
| Phrase | cachée `opacity:0` ; déclenchée `mob-d-fondu 700ms cubic-bezier(.2,.7,.2,1) both` |
| Verbes | cachés `opacity:.55;translate:0 .12em` ; déclenchés `animation:mob-d-verbe 500ms cubic-bezier(.16,1,.3,1) calc(500ms + var(--i,0) * 220ms) both` ; `@keyframes mob-d-verbe{from{opacity:.55;translate:0 .12em}}`. Le 4e verbe est plein à 1 660 ms |
| Surlignage | `.atelier__verbe::before{content:"";position:absolute;left:-.12em;right:-.12em;top:.22em;bottom:.06em;z-index:-1;background:rgba(212,165,116,.3);transform-origin:0 50%;transform:scaleX(0)}` ; déclenché `transform:scaleX(1);animation:mob-d-surligne 450ms cubic-bezier(.16,1,.3,1) calc(620ms + var(--i,0) * 220ms) both` ; `@keyframes mob-d-surligne{from{transform:scaleX(0)}}`. Choix du cahier (Q-M3) : un surlignage chaud, pas un trait, pour ne pas ressembler à un lien |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la phrase ; verbes pleins, sans surlignage |
| Économie de données | identique |

#### A2 — Dérive de la photo (liée, M, NP)

| | Valeur |
|---|---|
| Structure (`html.js`, M, NP) | `.atelier__media img{scale:1.12}` |
| Timeline | sujet `.atelier` (`view-timeline:--mob-atelier block` sur la section elle-même ; aucun `overflow:clip`) ; cible `.atelier__media img` : `mob-l-derive{from{translate:0 -5%}to{translate:0 5%}}`, plage `cover 0%` → `cover 100%` (valeurs du bureau, `kit.css:580-585`) |
| Sans `animation-timeline` | moteur, `1000ms linear both paused` |
| Mouvement réduit | rien, échelle 1 |
| Économie de données | identique |

### 3.7 Réalisations (accueil : rail ; pages communes : rangée)

#### R1 — Cartes (groupe F)

| | Valeur |
|---|---|
| Neutralisation (`html.mob`, M) | `.galerie--scene .galerie__cadre{clip-path:none;transition:none}` ; `.galerie--scene .galerie__cadre img{transform:none;transition:none}` ; `.galerie--scene figcaption{opacity:1;transition:none}` (le kit : `kit.css:600-606`) |
| Volet | `.galerie__cadre::after`, fond `#14110E`, mêmes règles que P3 (900 ms) |
| Zoom | `img`, `mob-d-zoom 1200ms`, `--mob-z:1.18` |
| Légende | cachée `opacity:0;translate:0 10px` ; déclenchée `mob-d-monte 600ms cubic-bezier(.16,1,.3,1) calc(350ms + var(--mob-k,0) * 120ms) both`, `--mob-dy:10px` |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la carte |
| Économie de données | identique |

R2 : jauge, voir PR2.

### 3.8 Communes (accueil et pages communes, groupe A, une ligne à la fois)

| | Valeur |
|---|---|
| Neutralisation | `html.mob .scene--communes .commune.reveal{opacity:1;transform:none;transition:none}` |
| Nom | `>span:first-child` caché `opacity:0;translate:-.4em 0` ; déclenché `animation:mob-d-glisse 800ms cubic-bezier(.16,1,.3,1) calc(var(--mob-k,0) * 90ms) both` ; `@keyframes mob-d-glisse{from{opacity:0;translate:-.4em 0}}` (propriété `translate` : le survol du kit anime `transform`, sans conflit) |
| Flèche | `svg` cachée `opacity:0;translate:-.25em .25em` ; déclenchée `mob-d-fleche 600ms cubic-bezier(.16,1,.3,1) calc(150ms + var(--mob-k,0) * 90ms) both` |
| Filets | immobiles |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de chaque ligne |
| Économie de données | identique |

### 3.9 Étapes (accueil)

#### E1 — L'éclaté s'ouvre (lié, M, NP, `html.mob-eclate`)

| | Valeur |
|---|---|
| `mob-eclate` | posé si NP, pas `mob-leger`, `CSS.supports('translate','1cqw 1cqh')`, et (natif, ou `'getAnimations' in Element.prototype`). Sinon l'éclaté reste l'image fixe E0 (`eclate.css`) |
| Structure (`html.js`, M) | `#etapes .eclate__rendu{container-type:size}` ; sous ≤ 767 px : `#etapes figure.eclate{content-visibility:auto;contain-intrinsic-size:auto 75vw}` (la figure fait 100 vw de large en 4:3 ; même rôle que `telephone.css:61`, ne pas découvrir les calques 3 600 px à l'avance) |
| Affichage (`html.mob-eclate`) | `img.eclate__eclate{display:none}` ; `img.eclate__assemble{display:block;left:0;top:0;width:100%;height:100%}` ; `img.eclate__calque{display:block}` |
| Timeline | sujet `#etapes figure.eclate` (`view-timeline:--mob-eclate block`), plage cover. Plages de 021-17 (`telephone.css:65-69`), jugées sans image double |
| Calques | `mob-l-apparait{from{opacity:0}to{opacity:1}}` sur `cover 10%` → `cover 11%`, puis `mob-l-eclate{from{translate:0 0}to{translate:calc(var(--vx,0) * 1cqw) calc(var(--vy,0) * 1cqh)}}` sur `cover 12%` → `cover 45%` |
| Assemblé | `mob-l-efface{from{opacity:1}to{opacity:0}}` sur `cover 11%` → `cover 12%` |
| Pastilles | `mob-l-apparait` sur `cover 45%` → `cover 49%` |
| En 390×844 | ouverture de y = 4 227 à y = 4 603 (376 px), pastilles jusqu'à y = 4 648 |
| Sans `animation-timeline` | mêmes `@keyframes`, `1000ms linear both paused` (deux animations par calque) ; le moteur pose chacune selon sa plage. Mesuré : sur la même timeline, la formule cover donne 0,250 / 0,500 / 0,750 sous Chromium et 0,250 / 0,501 / 0,751 sous WebKit (`sonde-moteurs.json`) |
| Mouvement réduit, économie de données, capacités absentes | E0 : `eclate.avif` seule, pastilles et légende fixes, aucune requête d'`assemble.avif` ni des calques |

#### E2 — Légende (groupe E, 55 %)

| | Valeur |
|---|---|
| Caché | `.eclate__legende li{opacity:0;translate:0 8px}` |
| Déclenché | `mob-d-monte 500ms cubic-bezier(.16,1,.3,1) both`, `--mob-dy:8px`, délais 0, 60, 120, 180, 240 ms par `:nth-child(1..5)` |
| Ordre | ouverture (4 227 → 4 603), pastilles (→ 4 648), titre (4 648), légende (4 792), cartes (≈ 5 049) |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la liste |
| Économie de données | identique (la légende existe aussi en E0) |

#### E3 — Cartes du rail des étapes (groupe G)

| | Valeur |
|---|---|
| Numéro | caché `html.mob.da--etapes .section--noir .etape .etape__num{opacity:.55;scale:.9;transform-origin:0 70%;transition:none}` (plus spécifique que `kit.css:529`, qui lie l'opacité à `--avancee`) ; déclenché `.etape.mob-vu .etape__num{opacity:1;scale:none;animation:mob-d-num 700ms cubic-bezier(.16,1,.3,1) calc(var(--mob-k,0) * 120ms) both}` ; `@keyframes mob-d-num{from{opacity:.55;scale:.9}}` |
| Corps | `.etape__corps` caché `opacity:0;translate:0 16px` ; déclenché `mob-d-monte 700ms cubic-bezier(.16,1,.3,1) calc(120ms + var(--mob-k,0) * 120ms) both` |
| Au glissé | la carte 2 (13 % visible) part quand le pouce l'amène |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la carte, numéro à 1 |
| Économie de données | identique |

E4 : jauge, voir PR2.

### 3.10 Questions (accueil et pages communes qui en ont)

| | Valeur |
|---|---|
| Q1, photo (groupe B) | structure `.faq-scene__photo{position:relative}` ; volet `::after`, fond `var(--fond)`, 900 ms ; `picture` `mob-d-zoom 1200ms`, `--mob-z:1.12` ; aucun glissement |
| Q2, liste (groupe C) | neutralisation `html.mob .faq-scene .faq.reveal{opacity:1;transform:none;transition:none}` ; `details` cachés `opacity:0;translate:0 14px` ; déclenchés `mob-d-monte 600ms cubic-bezier(.16,1,.3,1) both`, `--mob-dy:14px`, délais 0, 70, 140 et 210 ms (`:nth-child`, 210 ms au-delà) |
| Tête et introduction | T1 (§3.4), l'introduction partant avec le titre (450 ms) |
| Ouverture d'une question | inchangée (kit : `::details-content` et `interpolate-size`, que WebKit 26.6 ne prend pas en charge : ouverture sans transition, sondé) |
| Sans `animation-timeline` | identique |
| Mouvement réduit | fondu R de la photo et de la liste |
| Économie de données | identique |

### 3.11 Contact et pied

- **Contact** : titre, surtitre « Contact » et introduction par T1.
- **Formulaire, infos et photo de fond** : rien.
- **Pied** : rien.

### 3.12 Pages communes et pages légales

- **Pages communes** (`/menuisier-*/`) :
  - H1 (origine `50% 50%`), H2 ;
  - titres T1 ; cartes PR1 et R1 ; jauges PR2 ; communes voisines (§3.8) ; tête du contact ;
  - rien d'autre.
- **Pages légales** : menu N1 seulement ; le titre garde son `motIn` du kit.

### 3.13 Tablette (768 à 1 023 px)

**Ce qui s'applique** : H1, H2, T1, P1, P2, P3, PR1 (textes), A1, A2, R1, §3.8, E1, E2, E3 (liste verticale), Q1, Q2 et N1, aux mêmes
valeurs.

**Ce qui ne s'applique pas** : RL, rideau, jauges (le kit ne les a que sous T ou sous 767 px).

---

## 4. Architecture

### 4.1 La famille `mobile`

Le contrat est celui de `_kit/familles/LISEZMOI.md`.

| Fichier | Rôle | Assemblage par `generer.mjs` |
|---|---|---|
| `_kit/familles/mobile.css` | toutes les règles du §3 | ajouté à `styles.css` après `kit.css` et les familles qui précèdent, commentaires retirés (`generer.mjs:367-371`) |
| `_kit/familles/mobile.js` | déclencheurs, moteur de repli, comptage, pause du héros | ajouté à `site.js` après `kit.js` et les autres familles, séparé par `\n;\n` ; chargé par le `<script src="site.js" defer>` existant |

- **Pas de `mobile.mjs`** : le HTML ne change pas d'un octet, et tous les crochets nécessaires existent déjà (`citation__mot`, `atelier__verbe`, `chiffre__compte`, `.ml__in`, figure de l'éclaté).
- **Pas de `mobile.bureau.css`.**
- **Remplacement de `telephone`** : `mobile` remplace la famille `telephone`, dont il reprend le geste RL (H3) et les plages de l'éclaté (E1).
- **À l'intégration** (Claude Code, pas l'exécutant) :
  - `_kit/da.json` → `lestraque.familles` devient `["recit","video","survol","eclate","mobile"]` ;
  - `telephone.css` reste dans le dépôt jusqu'au PASS, puis est retiré ;
  - `scripts/telephone-qa.mjs` est retiré au même moment.
- **Interdit à l'exécutant** :
  - `kit.css`, `kit.js`, `relief*.js`, `generer.mjs`, `da.json` ;
  - les autres familles ;
  - `public/sites-demo/lestraque/**`, `scripts/**`.
- **Génération** : toute génération passe par `--sortie=<dossier sous .orchestre/travail/…>`.

### 4.2 `mobile.css`

**Règles d'écriture (vérifiées par MO-1) :**

- **R1. Media.** Toute règle vit sous un `@media` dont la condition contient `max-width:1023px` ou `max-width:767px` (ou `max-width:759px`
  pour la jauge des étapes). Rien hors `@media`, sauf les `@keyframes`.
- **R2. Préfixe.** Chaque sélecteur commence par `html.js` ou `html.mob` (y compris `html.mob-rideau`, `html.mob-eclate` et
  `html.js.da--signature`).
- **R3. Niveaux.**
  - `html.js` porte la structure, les recadrages statiques et l'affichage des jauges de repli (neutres pour la mise en page, dès le premier rendu, §2.7), ainsi que H2 et N1.
  - `html.mob` porte les états cachés, les animations déclenchées, le comptage, la pause et le lié au défilement.
- **R4. Conditions.** Mouvement sous NP. Fondus du mouvement réduit sous RM, avec `animation: … !important`. Le lié au défilement natif
  est sous `@supports (animation-timeline: view())` (jauges : `scroll()`), son repli sous `@supports not (animation-timeline: view())`
  (jauges : `not (animation-timeline: scroll())`). Toute déclaration `animation-timeline`, `view-timeline`, `timeline-scope` ou
  `animation-range` est sous le premier ; toute animation `paused` est sous le second.
- **R5. Ordre.** `animation-timeline` et `animation-range` s'écrivent après le raccourci `animation`, qui les remet à zéro.
- **R6. Timelines.** Une timeline nommée se pose sur le sujet lui-même, jamais `view()` sur un descendant d'une boîte en `overflow:hidden`
  (`.atelier`, `.plateau__photo`, `.etapes__photo`).
- **R7. Interdits.**
  - `overflow:clip` et `overflow:hidden`, sauf `.ml`, `.h1__cle` et les trois jauges (§2.7) ;
  - `will-change`, `transition` (hors `transition:none` de neutralisation), `clip-path`, `filter` ;
  - `vh` (seuls `svh`, `%`, `em`, `px`, `vw` pour le projecteur recopié, `cqw` et `cqh`).
- **R8. Courbes.** `cubic-bezier` ∈ {`(.16,1,.3,1)`, `(.2,.7,.2,1)`, `(.37,0,.63,1)`, `(.45,0,.55,1)`}, plus `linear`.
- **R9. Images-clés.**
  - Préfixe `mob-t-`, `mob-d-`, `mob-l-` ou `mob-r-` ; les images-clés du kit ne sont jamais redéclarées.
  - Propriétés ⊆ {`opacity`, `transform`, `translate`, `scale`, `rotate`}.
  - Une image-clé `mob-d-*`, `mob-t-*` ou `mob-r-*` n'a que `from`, et l'état final est le style de base de l'état déclenché.

**Plan du fichier :**
0. structure (`html.js`, M) ;
1. héros : H1 à H4 ;
2. déclenchés (`html.mob`, M, NP) : §3.1, §3.3 à §3.10 ;
3. liés au défilement (`html.mob`, M, NP) : natif, puis repli ;
4. jauges de repli (M ≤ 767 px ou ≤ 759 px, sans condition de mouvement) ;
5. mouvement réduit (`html.mob`, M, RM) ;
6. `@keyframes`.

**Images-clés** (exhaustif) :
```css
@keyframes mob-t-zoom{from{scale:1.12}}
@keyframes mob-t-leve{from{translate:0 110%}}
@keyframes mob-t-fondu{from{opacity:0}}
@keyframes mob-t-monte{from{translate:0 var(--mob-dy,14px)}}
@keyframes mob-d-leve{from{translate:0 110%}}
@keyframes mob-d-mot{from{opacity:0;translate:0 .35em}}
@keyframes mob-d-monte{from{opacity:0;translate:0 var(--mob-dy,16px)}}
@keyframes mob-d-fondu{from{opacity:0}}
@keyframes mob-d-volet{from{transform:scaleY(1)}}
@keyframes mob-d-zoom{from{scale:var(--mob-z,1.12)}}
@keyframes mob-d-glisse{from{opacity:0;translate:-.4em 0}}
@keyframes mob-d-fleche{from{opacity:0;translate:-.25em .25em}}
@keyframes mob-d-verbe{from{opacity:.55;translate:0 .12em}}
@keyframes mob-d-surligne{from{transform:scaleX(0)}}
@keyframes mob-d-num{from{opacity:.55;scale:.9}}
@keyframes mob-l-rideau-texte{from{opacity:1;translate:0 0}to{opacity:0;translate:0 -6svh}}
@keyframes mob-l-rideau-voile{from{opacity:0}to{opacity:.6}}
@keyframes mob-l-apparait{from{opacity:0}to{opacity:1}}
@keyframes mob-l-efface{from{opacity:1}to{opacity:0}}
@keyframes mob-l-eclate{from{translate:0 0}to{translate:calc(var(--vx,0) * 1cqw) calc(var(--vy,0) * 1cqh)}}
@keyframes mob-l-glisse{from{translate:0 -6%}to{translate:0 6%}}
@keyframes mob-l-derive{from{translate:0 -5%}to{translate:0 5%}}
@keyframes mob-r-fondu{from{opacity:0}}
```

**Degré de prise en charge.** Les propriétés individuelles `translate`, `scale` et `rotate` exigent Chromium 104 ou Safari 14.1. Sur un
moteur plus ancien, elles sont ignorées : les états cachés ne déplacent rien, les animations ne gardent que l'opacité, et tout reste
lisible. L'éclaté est protégé par `mob-eclate` (§3.9).

### 4.3 `mobile.js`

**Forme.**
- Une fonction immédiatement appelée, dans la syntaxe de `kit.js` : ES5, `var`, `function`. Ni `=>`, ni gabarit à accent grave, ni `let`,
  `const`, `class`, `?.`, `??`, `...`, `async` ou `await`.
- Pourquoi : une erreur de syntaxe dans `site.js` arrêterait aussi `kit.js`, et les `.reveal` du kit resteraient cachés.
- Tout le corps est dans un `try`. En cas d'exception, `<html>` perd toutes ses classes `mob*` : tout redevient visible.

**Démarrage.** Aucune lecture de mise en page pendant l'exécution du script : ni `getBoundingClientRect`, ni `offset*`, ni `scrollY`, ni
`scrollWidth` (`kit.js:16-17` : une lecture de `scrollY` pendant le script y coûtait une tâche de 194 ms).

1. Si `!matchMedia('(max-width: 1023px)').matches` ou `!('IntersectionObserver' in window)` : `return`, avant tout écouteur, classe ou
   écriture. Au bureau, rien n'existe.
2. Lectures sans mise en page :
   - `reduit` = `matchMedia('(prefers-reduced-motion: reduce)').matches` ;
   - `natif` = `!!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'))` ;
   - `leger` = `!!(navigator.connection && navigator.connection.saveData)` ;
   - `telephonePortrait` = `matchMedia('(max-width: 767px) and (min-height: 560px)').matches`.
3. Classes de `<html>` posées tout de suite : `mob-sans-vue` si `!natif`, `mob-leger` si `leger`, `mob-eclate` selon §3.9. `mob` ne vient
   qu'après la première livraison des observateurs (§3.0).
4. Observateurs des groupes A à G (ou R si `reduit`), avec les boîtes du §3.0.
5. Héros :
   - observateur du héros (seuil 0) et, à l'accueil, observateur du haut de l'écran sur le plateau (H3) ;
   - `mob-rideau` décidé à la première livraison (H4) ;
   - décodage de la photo pour H1.
6. Moteur de repli, seulement si `!natif` (et, en mouvement réduit, seulement pour les jauges).
7. `matchMedia('(max-width: 1023px)').addEventListener('change', …)` : si la page passe à 1 024 px ou plus (rotation d'une tablette),
   arrêt complet. Observateurs déconnectés, écouteurs retirés, classes `mob*` retirées de `<html>` et des cibles, comptages arrêtés. Aucun
   redémarrage.

**Déclenchement** : §3.0, rafale comprise (`style.setProperty('--mob-k', rang)`).

**Moteur de repli des effets liés au défilement.**

| Sujet | Plage | Cibles et animations (nom CSS → plage) |
|---|---|---|
| `.ouverture>.plateau` | entry | `.ouverture .hero__contenu` : `mob-l-rideau-texte` → [0 ; 0,30] ; `.ouverture>.hero--plein::after` : `mob-l-rideau-voile` → [0,10 ; 1] |
| `#etapes figure.eclate` | cover | `img.eclate__calque` : `mob-l-apparait` → [0,10 ; 0,11], `mob-l-eclate` → [0,12 ; 0,45] ; `img.eclate__assemble` : `mob-l-efface` → [0,11 ; 0,12] ; `.eclate__pastille` : `mob-l-apparait` → [0,45 ; 0,49] |
| `.plateau__photo` | cover | `img` : `mob-l-glisse` → [0 ; 1] |
| `#atelier` | cover | `.atelier__media img` : `mob-l-derive` → [0 ; 1] |
| `.scene--presta .presta`, `.scene--galerie .galerie--scene`, `.da--etapes .etapes__liste` | rail | barre de la jauge : `jauge` → [0 ; 1] |

**Fonctionnement du moteur :**
- **Proximité.** Un observateur `rootMargin: '50% 0px 50% 0px'` sur chaque sujet. À l'entrée :
  - lire `T`, `H` (chaîne des `offsetTop`, `offsetHeight`) et `vh = innerHeight` ; pour un rail, `scrollWidth − clientWidth` ;
  - retrouver ses animations : `el.getAnimations()` filtré par `animationName`, et pour le voile, `document.getAnimations()` filtré par `effect.target` et `effect.pseudoElement === '::after'` ;
  - appliquer une fois.

  À la sortie : appliquer une dernière fois (état borné à 0 ou 1), puis désactiver.
- **Écoute.** Un seul écouteur `scroll` sur `window`, `{ passive: true }`, présent seulement tant qu'au moins un sujet vertical est proche.
  Un écouteur `scroll` passif sur chaque rail proche. Tout est regroupé dans un seul `requestAnimationFrame` en attente.
- **Application.** Dans l'image : une lecture de `scrollY` (ou `scrollLeft`), puis pour chaque animation
  `a.currentTime = local × 1000`, seulement si l'écart dépasse 0,5 ms. Aucune autre lecture de mise en page.
- **Invalidation.** `resize` (passif) et un `ResizeObserver` sur `document.body` (la classe `tout-rendu` de `kit.js` change les hauteurs)
  marquent la géométrie périmée. Elle est relue dans l'image suivante, pour les sujets proches seulement.
- **Borne.** `local` est toujours borné à [0 ; 1] : le rebond d'iOS ne produit aucune valeur hors plage.

**Comptage** : §3.3 P2. Un `requestAnimationFrame` actif seulement pendant les 1 300 ms. La courbe `cubic-bezier(.16,1,.3,1)` est résolue
par dichotomie (au plus 20 itérations).

**Interdits (MO-2)** : `setInterval`, boucle `requestAnimationFrame` permanente, `eval`, `new Function`, `innerHTML`,
`insertAdjacentHTML`, `document.write`, `Worker`, `getContext`, élément `<style>` créé, écouteur `touch*` ou `wheel`, `preventDefault`.

### 4.4 Poids et chargement

**Chargement :**
- CSS dans `styles.css` (déjà bloquant, aucune requête de plus) ;
- JS dans `site.js` (`defer`, aucune requête de plus) ;
- aucun script bloquant, aucun `<script>` ni `<link>` ajouté au HTML.

**Plafonds (brotli 11, mesurés par le juge sur les copies du même passage) :**

| Mesure | Plafond | Base mesurée le 16/09 | Raison |
|---|---|---|---|
| `styles.css` de la copie `mobile` − `styles.css` de `ref` | ≤ +3 000 o | `ref` 13 566 o ; `telephone` coûtait +365 o (13 931 − 13 566) | la marge LCP est aujourd'hui de 675 ms (médiane 1 825 ms, 021-17) ; 3 Ko au débit de Lighthouse (1 474,56 kbit/s) valent environ 16 ms de transfert. Choix du cahier |
| `site.js` de `mobile` − `site.js` de `ref` | ≤ +3 500 o | `ref` 13 713 o ; `recit.js` 2 336 o, `survol.js` 3 189 o | un module du poids de `survol.js`, déjà accepté. Choix du cahier |
| Requêtes jusqu'à `load`, 390×844 et Pixel 7 | mêmes URL que `ref` | 9 requêtes (021-17, TL-9) | aucune requête ajoutée |
| Octets jusqu'à `load` | ≤ `ref` + les deux croissances ci-dessus + 512 o | 205 602 o pour la référence de 021-17 | en-têtes HTTP (méthode de 021-17) |
| Requêtes d'`eclate/` après défilement complet | NP : `assemble.avif` et les 4 calques, jamais `eclate.avif` ; RM ou économie de données : `eclate.avif` seule | 41 749 o contre 15 070 o | §2.6 |

### 4.5 Budget de performance

| Budget | Seuil | Profil | Critère |
|---|---|---|---|
| Lighthouse mobile, `node scripts/lighthouse-mediane.mjs <copie mobile> --passes=5` | code 0 : médiane de performance ≥ 95, LCP < 2 500 ms, TBT < 200 ms, CLS < 0,1, accessibilité, bonnes pratiques et SEO ≥ 95 | réglages de Lighthouse mobile (412×823, dpr 1,75, processeur ×4, brotli et en-têtes de production) | MO-70 |
| Tâches longues pendant le défilement | 0 tâche > 50 ms | Android natif ; iPhone simulé | MO-71 |
| Intervalles `requestAnimationFrame` pendant le défilement | p95 ≤ 20 ms | Android natif (budget) ; iPhone simulé (choix du cahier : c'est le repli qui calcule) | MO-71 |
| `requestAnimationFrame` au repos | 0 appel de la page en 3 s | Android natif ; iPhone simulé | MO-72 |
| Blocage au chargement, processeur ×4 | médiane de 3 chargements ≤ médiane de `ref` + 50 ms | Android natif ; iPhone simulé | MO-73 (choix du cahier : Lighthouse ne mesure jamais le repli) |
| CLS | somme des `layout-shift` sans saisie récente ≤ 0,001 | Android natif ; iPhone simulé | MO-5 |

### 4.6 CSP

- **L'en-tête** : celui de production, route `/((?!site/|p/).*)` de `next.config.mjs`. `script-src 'self' 'unsafe-inline' …`, `style-src 'self' 'unsafe-inline' …`, `worker-src 'self'`, `script-src-attr 'none'`.
- **Ce qui ne change rien** : `mobile.js` n'écrit que par CSSOM (`classList`, `style.setProperty`, `textContent`), n'ajoute aucun gestionnaire en attribut et n'ouvre aucune origine.
- **Le juge** : il sert l'en-tête comme `lighthouse-mediane.mjs`, sans HSTS ni `upgrade-insecure-requests` en local, et échoue sur tout évènement `securitypolicyviolation` (MO-80).

### 4.7 Ce que deviennent les juges existants

| Juge | Ce qui change | Qui s'en charge |
|---|---|---|
| `scripts/telephone-qa.mjs` (021-17) | retiré quand `mobile` remplace `telephone` ; ses mesures du geste RL (TL-1 à TL-3) sont reprises par MO-11 | Claude Code, à l'intégration |
| `scripts/signature-repos-qa.mjs` | contrôle « téléphone 390×844, mouvement permis » (lignes 170-179) : n'accepte que `signature-(tourne\|projecteur)`. Il doit aussi accepter `mob-t-*` (entrée du héros), sinon il échoue par construction | Claude Code, avant l'intégration |
| `scripts/recit-qa.mjs` RC-10, `eclate-qa.mjs` EC-6, `etapes-recit-qa.mjs` ER-7 | partie téléphone remplacée par MO-13, MO-19, MO-23 et MO-50 ; parties bureau inchangées | Claude Code |
| `scripts/nav-retenue-qa.mjs`, `demo-usage-qa.mjs` | inchangés ; doivent rester PASS (MO-95) | — |

---

## 5. Profils de mesure

Tous les profils servent une copie générée par le juge : un instantané de `public/sites-demo`, puis `generer.mjs … --sortie=`.
- **Brotli 11** et **en-têtes de production** (§4.6).
- **Écoute de `securitypolicyviolation`** injectée avant la navigation.
- **Chromium sans carte graphique**, sauf mention contraire.

**Copies :**
- `mobile` : `--familles=recit,video,survol,eclate,mobile` ;
- `ref` : `--familles=recit,video,survol,eclate` ;
- `actuel` : `--familles=recit,video,survol,eclate,telephone`, l'état en ligne (diagnostic 1 : 14 fichiers sur 15 identiques à la production) ;
- `nue` : `--familles=` ;
- `mobile-sans-vue` : `mobile` réécrite (§5.2).

Toutes sont sous `.orchestre/travail/024-01/juge-<pid>/`, supprimées à la fin.

### 5.1 Android natif

- **Appareil** : `devices['Pixel 7']` de Playwright : 412×839, dpr 2,625, `isMobile`, `hasTouch`, agent Android Chrome.
- **Copie** : `mobile`, sans réécriture ni script d'init.
- **Témoin** (§6) : ≥ 1 animation de timeline `ViewTimeline` après défilement complet, sinon le profil est faux.

### 5.2 iPhone simulé sans animations liées au défilement (corrigé)

- **Appareil** : `{...devices['iPhone 13'], viewport: { width: 390, height: 844 }}` : dpr 3, `isMobile`, `hasTouch`, agent iPhone. Le
  descripteur seul donne 390×664.
- **Copie** : `mobile-sans-vue` = copie de `mobile` où `styles.css` et `bureau.css` sont réécrits ainsi (préambules `@supports` seulement,
  jamais les déclarations) :
  ```js
  const reecrire = (css) => css.replace(/@supports([^{]*)\{/g, (m, cond) =>
    '@supports' + cond.replace(/\(\s*animation-timeline\s*:/g, '(animation-timeline-inexistante:') + '{')
  ```
  **Contrôles de la réécriture** :
  - nombre de préambules réécrits = nombre de préambules `@supports` de la source qui contiennent `animation-timeline` (> 0) ;
  - 0 préambule restant avec `(animation-timeline:`.

  **Ne pas utiliser** `(animation-timeline: --non-supporte())`, qui est vrai sous Chromium 153 (§0.2 point 1).
- **Script d'init** (`addInitScript`, avant tout script de la page) :
  ```js
  (() => {
    const vrai = CSS.supports.bind(CSS)
    const motif = /animation-timeline|view-timeline|scroll-timeline|timeline-scope|animation-range/i
    CSS.supports = function () { return motif.test([].join.call(arguments, ':')) ? false : vrai.apply(null, arguments) }
    try { delete window.ViewTimeline; delete window.ScrollTimeline } catch (e) {}
  })()
  ```
  Sondé : `CSS.supports` renvoie faux sous les trois signatures (propriété et valeur, déclaration, condition), `display: grid` reste vrai,
  et `typeof ViewTimeline === 'undefined'` (`sonde-geo.json`).
- **Témoins du profil (MO-0)** : `mob-sans-vue` sur `<html>` ; 0 animation `ViewTimeline` ni `ScrollTimeline` après défilement complet ;
  viewport lu dans la page = 390×844.

### 5.3 Témoin natif 390×844

Même appareil qu'au §5.2, copie `mobile`, sans réécriture ni script d'init. Il sert seulement de pair d'équivalence au §5.2 : même
géométrie, seule la prise en charge change.

### 5.4 WebKit natif

- **Navigateur** : `webkit.launch()` (WebKit 26.6, `webkit-2359`), `{...devices['iPhone 13'], viewport: { width: 390, height: 844 }}`,
  copie `mobile`.
- **Usage** : fonctionnel et paire d'équivalence du §5.5. Aucun budget de temps : ce WebKit de Windows n'est pas celui d'iOS.
- **Si le lancement échoue** au moment du juge : les critères WebKit sont en échec avec ce motif. Jamais un PASS silencieux.

### 5.5 WebKit sans animations liées au défilement

Comme au §5.4, avec la copie `mobile-sans-vue` et le script d'init du §5.2. C'est ce qui se rapproche le plus d'un iPhone en iOS 18 : le
moteur WebKit, sans `view()`.

### 5.6 Variantes

- **Mouvement réduit** : `reducedMotion: 'reduce'` sur les profils 5.1, 5.2 et 5.5.
- **Économie de données** : profil 5.1, avec en script d'init `Object.defineProperty(navigator, 'connection', { value: { saveData: true } })`.
- **Bureau** : Chromium 1440×900, 1280×800 et 1024×768, dpr 1, `isMobile:false`, `hasTouch:false` ; copies `mobile` et `ref`.
- **Tablette** : Chromium 820×1180, dpr 2, `hasTouch` ; copies `mobile` et `ref` ; natif puis réécrit.

---

## 6. Critères du juge `scripts/mobile-qa.mjs`

Juge écrit par Claude Code, vérifié en échec sur l'état d'avant (copie `actuel`) pour la bonne raison, avant la mise en file (méthode du
cahier de la vague 5, CC-1).

**Commande.** `node scripts/mobile-qa.mjs --partie=effets|perf|films|tout`, avec un plafond de 30 min par partie (orchestre.json).
- **effets** : MO-0 à MO-6, MO-10 à MO-31, MO-40, MO-41, MO-50, MO-51, MO-60 à MO-63, MO-80, MO-95.
- **perf** : MO-70 à MO-75.
- **films** : MO-90 et MO-91.

**Preuves.** Le juge écrit lui-même dans `C:/Users/benja/Documents/presti/.orchestre/preuves/024-01/juge/`. Jamais un fichier de
0 octet.

### 6.0 Méthodes communes

- **Calme** (tout critère qui mesure du temps : MO-14 comptage, MO-70 à MO-73, MO-90) :
  - **Attendre les autres juges.** Avant la mesure, aucun autre processus `node` dont la ligne de commande contient `-qa.mjs`, en dehors du juge et de son parent. Relevé par `Get-CimInstance Win32_Process`, toutes les 20 s, 20 min au plus.
  - **Vérifier la machine.** Une page vide doit tourner à ≥ 55 images/s pendant 2 s.
  - **Au plafond de 20 min** : le juge mesure quand même et consigne les processus présents. Un échec mesuré sous charge est rapporté « FAIL sous charge », jamais transformé en PASS.
- **Position d'un sujet** : §0.4 (chaîne des `offsetTop`). `scrollTo({ top, behavior: 'instant' })`, puis 3 `requestAnimationFrame` et
  100 ms. Pour un rail : `rail.scrollLeft = p × (scrollWidth − clientWidth)`, puis de même.
- **Balayage de déclenchement** :
  - **Procédure** : page neuve, puis de y = 0 jusqu'en bas par pas de 12 px (2 `requestAnimationFrame` et 30 ms à chaque pas). À chaque pas, relevé des cibles qui viennent de recevoir `mob-vu`.
  - **y de déclenchement** : le premier y où la classe apparaît.
  - **Ligne mesurée** : haut de la boîte observée (mise en page) − y, rapporté à `vh`.
  - **Cartes** : c'est la part de surface dans la zone qui est rapportée.
- **État posé** (effets au temps et déclenchés) :
  - **Figer** : la cible à l'écran, le juge prend les animations de `document.getAnimations()` dont `animationName` commence par `mob-t-`, `mob-d-` ou `mob-r-` et dont `effect.target` est la boîte marquée ou un descendant. Il leur applique `pause()`, puis `currentTime = τ` (délai compris).
  - **Autres boucles** : toute autre animation de `DocumentTimeline` visible est aussi mise en pause, à `currentTime = 0`. Jamais une animation liée au défilement (§0.2 point 7).
  - **Capture** : 2 `requestAnimationFrame`, puis capture de la boîte en pixels CSS (`scale: 'css'`) et relevé des styles calculés.
  - **Instants** : τ0 = 0 ; τfin = plus grand délai + durée ; τmi = τfin / 2 pour un groupe à décalages, 0,15 × durée + délai pour un élément seul.
- **« L'effet se voit »** (MO-10 à MO-28) :
  - écart(τ0, τfin) et part > 8(τ0, τfin) ≥ seuils du §6.2, mesurés sur la boîte de l'effet entièrement à l'écran ;
  - **progressif, pas un saut** : écart(τ0, τmi) ≥ 0,15 × écart(τ0, τfin) et écart(τmi, τfin) ≥ 0,15 × écart(τ0, τfin) ;
  - **l'effet part vraiment** : dans les 150 ms qui suivent l'apparition de `mob-vu`, au moins une animation `mob-d-*` de la cible est `running` avec `currentTime` ≤ 200 ms.
- **Positions posées** (effets liés) : la position de défilement est posée, et les animations de `DocumentTimeline` sont figées à 0. La
  capture suit, avec les valeurs.
- **Programme de visite** (films, MO-30, MO-31) :
  1. 3 000 ms en haut.
  2. Tant que le bas n'est pas atteint : glissé vers le haut de 0,55 × `vh`, à 900 px/s, puis 1 400 ms d'arrêt. Sous Chromium, geste tactile CDP `Input.synthesizeScrollGesture` (`gestureSourceType: 'touch'`) ; sous WebKit, `scrollTo` à chaque image.
  3. Au premier arrêt où un rail est entièrement dans les 60 % du milieu de l'écran : deux glissés horizontaux de −0,8 × largeur d'une carte à 800 px/s, chacun suivi de 1 200 ms d'arrêt.
  4. En bas (`scrollY` ≥ `scrollHeight − innerHeight − 2`) : 2 000 ms d'arrêt.
- **Programme rapide** (MO-71) : mêmes gestes CDP tactiles, 600 px à 1 200 px/s sans arrêt jusqu'en bas, puis 3 glissés horizontaux de
  −260 px à 800 px/s sur chaque rail. Témoin : ≥ 100 valeurs distinctes de `scrollY`.

### 6.1 Architecture et page

| Id | Mesure | Profil | Seuil |
|---|---|---|---|
| MO-0 | Témoins des profils (§5) : `CSS.supports('animation-timeline: view()')`, classes `mob*`, types de timelines après défilement complet, viewport lu dans la page, `matchMedia('(prefers-reduced-motion: reduce)')` | tous | Android natif, témoin 390 et WebKit natif : ≥ 1 animation `ViewTimeline`, pas de `mob-sans-vue`. iPhone simulé et WebKit sans vue : 0 `ViewTimeline` ni `ScrollTimeline`, `mob-sans-vue` présent, préambules réécrits = source > 0. 390×844 où c'est imposé. Réduit : vrai seulement dans les variantes RM |
| MO-1 | `mobile.css` analysé (postcss du dépôt, sinon l'analyseur de `telephone-qa.mjs`) | — | R1 à R9 du §4.2 tenues, chacune nommée en cas d'échec |
| MO-2 | `mobile.js` lu | — | fichier non vide ; aucun jeton interdit (§4.3) ; aucun appel interdit (§4.3) ; le premier test de la fonction porte sur `(max-width: 1023px)` et précède tout `addEventListener`, `classList` et `IntersectionObserver` ; ni `mobile.mjs` ni `mobile.bureau.css` |
| MO-3 | Copies `mobile` et `ref` : sha256 de tous les fichiers sauf `styles.css` et `site.js` ; `styles.css(mobile)` commence par `styles.css(ref)` ; `site.js(mobile)` = `site.js(ref)` + `\n;\n` + `mobile.js` | — | identiques ; préfixes exacts (le HTML ne change pas d'un octet) |
| MO-4 | Rien ne reste caché : après le programme de visite, remontée par pas de 400 px ; pour chaque cible du §3.0 et chaque mot (`.ml__in`, `.citation__mot`, `.atelier__verbe`) à l'écran | Android natif, iPhone simulé, WebKit natif, WebKit sans vue | opacité effective ≥ 0,98 et translation résiduelle ≤ 0,5 px ; exceptions : le texte du héros sous le rideau (relevé à y = 0 à la fin) et les calques de l'éclaté (MO-23) |
| MO-5 | Mise en page : après `tout-rendu`, à y = 0, position de mise en page et hauteur de chaque section de `main` et de chaque boîte du §3.0 ; somme des `layout-shift` sans saisie récente, de la navigation à la fin du programme de visite | 390×844 (Chromium et WebKit), Pixel 7, 820×1180 | positions et hauteurs = `ref` ± 1 px ; somme ≤ 0,001 (profils Chromium) |
| MO-6 | Tablette 820×1180, natif puis réécrit : programme de visite ; au moins T1, P1, A1, R1 et E3 déclenchés (`mob-vu`) ; `scrollWidth` = `innerWidth` à chaque arrêt | tablette | vrai ; aucun débordement horizontal ; MO-4 tenu |

### 6.2 Les effets se voient

Les seuils valent environ la moitié de l'écart mesuré le 16/09 entre l'état caché et l'état final, posés en CSS injecté sur la copie
`ref` en 390×844 (`sonde-energie*.json`, `sonde-rideau.json`). Ce sont des choix du cahier. Sauf mention, chaque critère se mesure sur
Android natif, iPhone simulé et WebKit sans vue (390×844 pour les deux derniers ; boîtes relues sur Pixel 7).

| Id | Effet | Déclenchement ou plage mesurés | Valeurs posées | « Se voit » : écart / part > 8 (mesuré le 16/09) |
|---|---|---|---|---|
| MO-10 | H1 et H2, entrée du héros (accueil et `/menuisier-rennes/`) | `mob-heros-pret` posé ≤ 3 100 ms après le départ de `mobile.js` | τ0 : `.hero__media` `scale` 1,12 ± 0,005, clé décalée ≥ 105 % de sa hauteur, pied à opacité ≤ 0,02 ; τ = 1 800 ms : scale 1 ± 0,001, clé à 0 ± 0,5 px, pied ≥ 0,98 | héros entier, τ0 contre τfin : ≥ 0,045 / ≥ 0,30 (0,0960 / 0,6439) |
| MO-11 | H3, geste RL et pause (accueil, T) | — | a) part > 8 ≥ 0,40 entre τ = 2 500 et 5 000 ms, tout masqué sauf `.hero__media` (méthode TL-1) ; b) 0 pixel magenta sur 201 images de 0 à 10 s (méthode TL-2) ; c) contraste p90 du fond du h1 ≥ 3,0 sur 121 images (méthode TL-3) ; d) boucles `running` à y = 0, `paused` à y = `vh` + 10 et à y = 2 000 | a) mesuré 0,604 par 021-17 |
| MO-12 | H4, rideau (accueil, T) | héros `position: sticky` si sa hauteur ≤ `vh` + 1 ; y = 0,5 × `vh` : héros à 0 ± 1, plateau à 0,5 × `vh` ± 1 | entry p ∈ {0 ; 0,15 ; 0,30 ; 0,5 ; 1} : opacité du texte = 1 − min(p / 0,30 ; 1) ± 0,03 ; translation = −0,06 × `vh` × min(p / 0,30 ; 1) ± 1,5 px ; voile = 0,6 × clamp((p − 0,10) / 0,90) ± 0,03 ; au centre du bouton du héros, à y = 0, `elementFromPoint` = le bouton | bande [0 ; 0,70 × `vh`], p = 0 contre p = 0,30 : ≥ 0,040 / ≥ 0,23 (0,0811 / 0,4714) |
| MO-13 | P1, citation | ligne 62 % ± 2 % de `vh` | τ0 : 15 mots ≤ 0,02 ; τ ∈ {150 ; 350 ; 700 ; 1 000} : mot i ≥ mot i+1 − 0,01 ; τ700 : mot 1 ≥ 0,9, mot 15 ≤ 0,1 ; τ1 400 : tous ≥ 0,98, translation 0 ± 0,5 px ; signature ≤ 0,02 à τ1 200, ≥ 0,98 à τ1 800 ; contraste final ≥ 3,0 | paragraphe : ≥ 0,065 / ≥ 0,19 (0,1311 / 0,3884) ; signature : ≥ 0,030 / ≥ 0,13 (0,0617 / 0,2679) |
| MO-14 | P2, chiffres | ligne 85 % ± 2 % par ligne | ligne τ0 ≤ 0,02, τ600 ≥ 0,98. **Comptage en temps réel** (calme exigé), `.chiffre__compte` lu toutes les 50 ms : départ ≥ fin de la citation + 250 ms (si la citation a joué pendant la visite) ; pour 180 : ≥ 8 valeurs distinctes, suite non décroissante, première valeur ≠ 180, 180 atteint entre 1 150 et 1 600 ms après le départ ; `.chiffre__vrai` = valeur finale à chaque relevé ; largeur de `.chiffre__valeur` constante ± 0,5 px ; compte vide et vrai à ≥ 0,98 à la fin ; en mouvement réduit, compte jamais écrit | ligne, τ0 contre τ600 : ≥ 0,030 / ≥ 0,10 (0,0612 / 0,2123) ; compte à départ + 300 ms contre final : écart > 0 |
| MO-15 | P3, photo du plateau | volet : ligne 85 % ± 2 % ; glissement : cover | volet : `scaleY` du calque ≈ 0 à τ900 ; zoom 1 à τ1 200. Glissement, p ∈ {0 ; 0,25 ; 0,5 ; 0,75 ; 1} : translation de l'`img` = (−6 + 12p) % de sa hauteur ± 1,5 px | volet τ0 contre τfin : ≥ 0,15 / ≥ 0,50 (0,3048 / 1,0) ; glissement à cover 0,30, image posée contre la même image forcée à `translate:0 0` : ≥ 0,030 / ≥ 0,27 (0,0632 / 0,5457, pour −2,4 % contre 0) |
| MO-16 | T1, titres de scène (les 7 de l'accueil et ceux de `/menuisier-rennes/`) | ligne 88 % ± 2 % | τ0 : chaque `.ml__in` sous son masque (haut du mot ≥ bas de `.ml` − 1 px) ; τfin = 60 × (n − 1) + 850 ms : translation 0 ± 0,5 px ; paragraphe de tête ≤ 0,02 à τ450, ≥ 0,98 à τ1 150 | h2 : ≥ 0,045 / ≥ 0,12 (de 0,0918 à 0,1875 / de 0,2406 à 0,4237) ; paragraphe : ≥ 0,030 / ≥ 0,15 (0,0640 / 0,3148) |
| MO-17 | PR1, cartes des prestations | part de surface dans la zone à 85 % = 0,35 ± 0,06 ; carte 3 sans `mob-vu` tant que `scrollLeft` = 0, puis avec `mob-vu` après le 2e glissé | τ900 : calque du volet `scaleY` 0 ; τ1 000 : num, h3 et texte ≥ 0,98 | carte entière : ≥ 0,18 / ≥ 0,37 (0,3623 / 0,7476) |
| MO-18 | PR2, jauges des trois rails (T) | p ∈ {0 ; 0,25 ; 0,5 ; 0,75 ; 1} | rapport largeur de la barre / largeur de la jauge = 0,17 + 0,83p ± 0,02 | déplacement mesuré : rapport(p = 1) − rapport(p = 0) ≥ 0,80 |
| MO-19 | A1, phrase et verbes | ligne 70 % ± 2 % | phrase ≤ 0,02 à τ0, ≥ 0,98 à τ700 ; verbe i : 0,55 ± 0,03 et translation 0,12 em ± 0,5 px à τ500, ≥ 0,98 à τ(1 000 + 220i) ; surlignage `scaleX` 0 à τ(620 + 220i), 1 ± 0,01 à τ(1 070 + 220i) ; contraste des verbes à τ500 (méthode du texte translucide, boîtes des verbes) ≥ 4,5 ; contraste final ≥ 4,5 | phrase : ≥ 0,050 / ≥ 0,19 (0,0997 / 0,3845) ; verbes τ600 contre τ1 800 : ≥ 0,020 / ≥ 0,09 (0,0394 / 0,1836, mesuré avec un trait ; le surlignage couvre plus de pixels) |
| MO-20 | A2, dérive de l'atelier | cover | p ∈ {0 ; 0,25 ; 0,5 ; 0,75 ; 1} : translation de l'`img` = (−5 + 10p) % ± 1,5 px | cover 0,30, posée contre forcée à 0 : ≥ 0,022 / ≥ 0,17 (0,0446 / 0,3527, pour −2 % contre 0) |
| MO-21 | R1, cartes des réalisations | part 0,35 ± 0,06 ; carte 3 comme MO-17 | τ900 : volet à 0 ; légende ≤ 0,02 à τ350, ≥ 0,98 à τ950 | carte : ≥ 0,11 / ≥ 0,43 (0,2197 / 0,8743) |
| MO-22 | §3.8, communes | ligne 88 % ± 2 % par ligne ; rafale forcée (saut de 400 px qui fait entrer les 4 lignes ensemble) : `animation-delay` du nom = 0, 90, 180, 270 ms ± 5 | τ950 : nom et flèche ≥ 0,98, translation 0 ± 0,5 px | ligne : ≥ 0,035 / ≥ 0,09 (0,0694 / 0,1783) |
| MO-23 | E1, éclaté | cover | cover 0,10 : calques à 0 ± 0,5 px, assemblé ≥ 0,98 ; 0,115 : calques ≥ 0,98 ; 0,12 : assemblé ≤ 0,02 ; 0,30 : décalage de chaque calque = 0,5455 × vecteur × taille de `.eclate__rendu` ± 2 px ; 0,45 et 0,60 : vecteur ± 2 px ; pastilles ≤ 0,02 à 0,45, ≥ 0,98 à 0,49, sans chevauchement. Requêtes d'`eclate/` (§4.4) | figure cover 0,30 contre 0,45 : ≥ 0,030 / ≥ 0,16 (0,0638 / 0,3312) ; figure à 0,45, calques forcés à 0 contre posés : ≥ 0,035 / ≥ 0,16 (0,0703 / 0,3303) |
| MO-24 | E2, légende | ligne 55 % ± 2 % | li k ≤ 0,02 à son départ (τ = 60(k − 1)), ≥ 0,98 à τ = 60(k − 1) + 500 | liste : ≥ 0,030 / ≥ 0,12 (0,0614 / 0,2477) |
| MO-25 | E3, cartes des étapes | part de surface dans la zone à 70 % = 0,6 ± 0,06 ; carte 2 sans `mob-vu` tant que `scrollLeft` = 0 | num 0,55 ± 0,03 et scale 0,9 à τ0, 1 à τ700 ; corps ≥ 0,98 à τ820 | carte : ≥ 0,030 / ≥ 0,10 (0,0638 / 0,2179) |
| MO-26 | Q1, photo des questions | ligne 85 % ± 2 % | volet à 0 à τ900 | ≥ 0,29 / ≥ 0,50 (0,5840 / 1,0) |
| MO-27 | Q2, liste des questions | ligne 70 % ± 2 % | details k ≥ 0,98 à τ(70(k − 1) + 600) ; ouverture d'une question au toucher toujours possible (`details.open` vrai après `tap` sur `summary`) | liste : ≥ 0,020 / ≥ 0,07 (0,0440 / 0,1455) |
| MO-28 | N1, menu | toucher du burger | lien k ≤ 0,02 à τ0, ≥ 0,98 à τ(80 + 45(k − 1) + 450) ; ≥ 4 liens animés | `nav` du panneau, τ0 contre τfin : ≥ 0,038 / ≥ 0,096 (0,0772 / 0,1926) |
| MO-29 | Pages communes (`/menuisier-rennes/`) | balayage | H1, H2, T1, PR1, R1, §3.8 déclenchés ; aucune animation `mob-l-rideau*`, `signature-*` ni `mob-l-eclate` | MO-10, MO-16, MO-17, MO-21 et MO-22 tenus sur cette page |
| MO-30 | Un texte à la fois (§2.4) | programme de visite, échantillon toutes les 100 ms | groupe de texte « en mouvement » = au moins une animation `mob-d-*` ou `mob-l-rideau-texte` de ses éléments dans sa phase active, entre 5 et 95 % de sa durée | ≤ 2 groupes à chaque échantillon (Android natif, iPhone simulé) |
| MO-31 | Pas de clignotement | programme de visite, échantillon toutes les 100 ms | aucune cible du §3.0 ne repasse sous 0,9 d'opacité effective après avoir atteint 0,98 (hors rideau et éclaté, liés au défilement) | vrai (Android natif, iPhone simulé) |

### 6.3 Équivalence sans `animation-timeline`

| Id | Paires | Positions | Seuil à chaque position |
|---|---|---|---|
| MO-40 | iPhone simulé contre témoin natif 390 (§5.2 et §5.3) ; WebKit sans vue contre WebKit natif (§5.5 et §5.4) | **rideau**, entry p ∈ {−0,05 ; 0 ; 0,10 ; 0,20 ; 0,30 ; 0,50 ; 0,80 ; 1 ; 1,05} ;<br>**éclaté**, cover ∈ {0,05 ; 0,10 ; 0,105 ; 0,11 ; 0,115 ; 0,12 ; 0,20 ; 0,30 ; 0,45 ; 0,47 ; 0,49 ; 0,60} ;<br>**photo du plateau** et **atelier**, cover ∈ {0 ; 0,2 ; 0,4 ; 0,6 ; 0,8 ; 1} ;<br>**trois rails**, p ∈ {0 ; 0,25 ; 0,5 ; 0,75 ; 1} | capture de l'écran (rails : de la section) **identique** entre les deux profils : écart < 0,006 et part > 8 < 0,02 ; pour chaque cible, opacité ± 0,03, translation ± 1,5 px, échelle ± 0,01, rapport de jauge ± 0,02 ; valeurs absolues de MO-12, MO-15, MO-18, MO-20 et MO-23 tenues des deux côtés |
| MO-41 | mêmes paires | balayage de déclenchement complet | y de déclenchement de chaque cible égaux à ± 12 px ; image posée à τmi de chaque effet déclenché identique (part > 8 < 0,02) |

### 6.4 Mouvement réduit

**MO-50.**
- **Profils** : Android natif, iPhone simulé et WebKit sans vue, en `reducedMotion: 'reduce'`.
- **Programme** : descente par pas de `vh`/4 toutes les 700 ms jusqu'en bas, puis remontée.
- **Mesures** : à chaque arrêt, 700 ms après l'arrivée.

| Point | Mesure | Seuil |
|---|---|---|
| a | animations en cours (`document.getAnimations()`) | 0 animation à itérations infinies ; 0 `ViewTimeline` ; `ScrollTimeline` ou animation `jauge` en pause seulement sur les barres des trois jauges |
| b | animations dont `effect.target` est une cible du §3.0 ou un descendant | propriétés des images-clés ⊆ {`opacity`} ; durée ≤ 450 ms ; nom `mob-r-*` |
| c | déplacement : `h1`, `h2`, `h3`, `p`, `li`, `summary`, `.commune>span`, `.chiffre`, `.citation__mot`, `.atelier__verbe`, `.ml__in`, `.hero__media`, images des cibles, entièrement à l'écran | `translate` nul, `scale` 1, `rotate` nul, `transform` `none` ou identité ; héros en `position` autre que `sticky` |
| d | lisibilité : mêmes textes, entièrement à l'écran | opacité effective ≥ 0,98 |
| e | héros à y = 0 : captures à t et t + 600 ms | identiques (écart < 0,006, part > 8 < 0,02) |
| f | éclaté | seule `eclate.avif` demandée dans `eclate/` ; 0 animation sur la figure et ses descendants |
| g | chiffres : 3 s d'arrêt sur le plateau | `.chiffre__compte` jamais écrit ; valeurs finales affichées |
| h | le site reste vivant (complément du 16/09) | ≥ 10 animations `mob-r-fondu` démarrées pendant la descente |
| i | rien ne clignote | aucune opacité effective de cible qui redescend sous 0,9 après avoir atteint 0,98 |

### 6.5 Économie de données

**MO-51.**
- **Profil** : Android natif avec `saveData` vrai (§5.6), programme de visite.
- **Seuils** :
  - `mob-leger` et pas `mob-eclate` ;
  - requêtes d'`eclate/` : `eclate.avif` seule ;
  - 0 animation sur la figure ;
  - MO-13 et MO-16 tenus (les autres effets jouent) ;
  - aucune requête vidéo.

### 6.6 Bureau inchangé

**Formats** : 1440×900 (format demandé), 1280×800 et 1024×768 (bord du profil), en Chromium, souris.
**Pages** : `/`, `/menuisier-rennes/`, `/mentions-legales/`.
**Copies** : `mobile` contre `ref`, servies de la même façon, avec le même programme.

| Id | Mesure | Seuil |
|---|---|---|
| MO-60 | À y = 0 puis tous les 450 px jusqu'en bas (scroll instantané, 3 `requestAnimationFrame` et 300 ms) : signature de `document.getAnimations()`, soit, pour chaque animation, le type (`CSSAnimation` ou `CSSTransition`), `animationName` ou `transitionProperty`, le chemin de la cible et son pseudo-élément, le type de timeline, les itérations, la durée, le délai, la courbe, le remplissage et `playState` | mêmes multiensembles de signatures |
| MO-61 | Aux mêmes positions : toutes les animations de `DocumentTimeline` en pause à `currentTime` 0 dans les deux copies, puis styles calculés de chaque `section`, de `.ouverture`, `.hero__media`, `.hero__contenu`, `.h1__cle>span`, `.hero__pied`, de toutes les cibles du §3.0 et de leurs mots et images, de `.nav` et `.panneau`. Propriétés : `display`, `position`, `top`, `overflow`, `opacity`, `transform`, `translate`, `scale`, `rotate`, `clip-path`, `visibility`, `content-visibility`, `animation-name`, `animation-duration`, `animation-delay`, `animation-timeline`, `animation-range`, `view-timeline-name`, `transition-property`, `transition-duration`, `width`, `height` | identiques |
| MO-62 | Inertie du JavaScript : `addEventListener` instrumenté (par type de cible et d'évènement, `MediaQueryList` comprise), constructeurs `IntersectionObserver` et `ResizeObserver` comptés, `requestAnimationFrame` et `setTimeout` appelés pendant 3 s de repos, `className` de `<html>`, éléments dont une classe commence par `mob`, URL demandées | comptes identiques ; aucune classe `mob*` ; mêmes URL |
| MO-63 | Captures 1440×900 à y = 0, au centre du travelling et au centre C3 des étapes, animations de `DocumentTimeline` figées à 0 | identiques (écart < 0,006, part > 8 < 0,02) ; planche `bureau-avant-apres.jpg` |

### 6.7 Performance

Toutes ces mesures demandent le calme du §6.0.

| Id | Mesure | Profil | Seuil |
|---|---|---|---|
| MO-70 | `node scripts/lighthouse-mediane.mjs <copie mobile> --passes=5 --resume=.orchestre/preuves/024-01/juge/lighthouse.json` | réglages de Lighthouse mobile | code 0 (médiane de performance ≥ 95, LCP < 2 500 ms, TBT < 200 ms, CLS < 0,1, les trois autres catégories ≥ 95). Série sur `ref` consignée, non bloquante |
| MO-71 | Programme rapide : `PerformanceObserver({ type: 'longtask', buffered: true })` du départ au dernier geste + 500 ms ; intervalles d'une boucle `requestAnimationFrame` du juge (référence d'origine gardée avant la page) sur la même fenêtre | Android natif ; iPhone simulé | 0 tâche longue ; p95 des intervalles ≤ 20 ms dans chaque profil ; témoin ≥ 100 `scrollY` distincts |
| MO-72 | `requestAnimationFrame` et `setInterval` enveloppés par le script d'init (appels de la page seulement), relevés pendant 3 s : à y = 0, 4 s après `load` ; au milieu de la page, 3 s après la fin du programme rapide (comptages finis) | Android natif ; iPhone simulé | 0 appel de `requestAnimationFrame` ; 0 `setInterval` créé depuis le chargement |
| MO-73 | Processeur ×4 (CDP `Emulation.setCPUThrottlingRate`), 3 chargements de `mobile` et 3 de `ref` : somme des (tâche longue − 50 ms), de la navigation à `load` + 3 s | Android natif ; iPhone simulé | médiane(`mobile`) ≤ médiane(`ref`) + 50 ms |
| MO-74 | Poids et requêtes (§4.4) : brotli 11 des fichiers ; CDP `Network.loadingFinished.encodedDataLength`, cache désactivé | 390×844 et Pixel 7 | plafonds du §4.4 |
| MO-75 | LCP : `PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })`, 3 chargements par copie | Android natif ; iPhone simulé | dernier élément LCP = un `span.mot` de `.h1__ligne-in` ; médiane(`mobile`) ≤ médiane(`ref`) + 50 ms |

### 6.8 CSP et console

**MO-80.** Pour toutes les pages ouvertes par le juge, dans tous les profils et au bureau :
- 0 évènement `securitypolicyviolation` ;
- 0 message de console de niveau `error` ;
- 0 `pageerror`.

### 6.9 Films et preuves écrits par le juge

**MO-90.** Films tournés par le juge avec `recordVideo` (taille du viewport en pixels CSS), puis encodés par ffmpeg (`libx264 -crf 20
-pix_fmt yuv420p`), dans `.orchestre/preuves/024-01/juge/`.

| Fichier | Contenu |
|---|---|
| `visite-android.mp4` | Android natif, programme de visite |
| `visite-iphone-simule.mp4` | iPhone simulé, même programme |
| `visite-webkit-sans-vue.mp4` | WebKit sans vue, même programme |
| `visite-reduit.mp4` | iPhone simulé en mouvement réduit, même programme |
| `cote-a-cote.mp4` | trois colonnes de 390×844 séparées de 4 px : copie `actuel` (l'état en ligne), iPhone simulé v2, témoin natif v2, même programme. Chaque colonne est calée sur la première image où le défilement commence (écart de gris > 4 contre l'image précédente, méthode du diagnostic 1), jamais sur l'horloge de Playwright |

**Seuils des films** :
- fichier > 0 octet ;
- ≥ 24 images/s (ffprobe) ;
- durée ≥ durée du programme − 0,5 s ;
- dernière image en bas de page : le pied visible, contrôlé par une capture prise au même instant ;
- écart-type du gris ≥ 8 à 10, 30, 50, 70 et 90 % de chaque film ;
- dans `cote-a-cote.mp4`, colonnes de même durée à ± 0,5 s.

**MO-91. Planches et mesures.**

| Fichier | Contenu |
|---|---|
| `effets-android.jpg`, `effets-iphone-simule.jpg` | une ligne par effet de MO-10 à MO-28, colonnes τ0, τmi et τfin |
| `equivalence.jpg` | pour chaque effet lié, la paire (témoin, repli) à trois positions |
| `reduit.jpg` | six arrêts de MO-50 |
| `bureau-avant-apres.jpg` | MO-63 |
| `mesures.json` | chaque mesure brute, les versions (Chromium, WebKit, Playwright), les processus concurrents relevés et les dates |
| `verdict.txt` | PASS ou FAIL par critère, avec la valeur mesurée et le seuil |

Aucun fichier de 0 octet.

### 6.10 Non-régression

**MO-95.**
- `node scripts/demo-usage-qa.mjs --url=<copie mobile servie par le juge> --sortie=.orchestre/preuves/024-01/juge/usage` : PASS (7 contrôles sur 7).
- À l'intégration (Claude Code), après le passage de `da.json` à `mobile` :
  - `nav-retenue-qa.mjs`, `signature-repos-qa.mjs` (corrigé, §4.7) et `site-qa.mjs` sur la copie générée : PASS ;
  - `git status --short public/sites-demo` : seulement les fichiers attendus.

---

## 7. Contrôle à l'œil

**Claude Code**, avant de montrer quoi que ce soit à Benj, regarde `cote-a-cote.mp4`, les trois films de visite et les planches.

| Moment | Ce qu'on doit voir |
|---|---|
| Arrivée | la photo recule sans à-coup, la clé monte, le pied apparaît ; le grand titre est là tout de suite ; la cage tourne ensuite autour de l'œil de la spirale |
| Rideau | le plateau noir monte sur un héros immobile ; le texte du héros s'efface avant que la citation commence ; aucun blanc entre les deux |
| Citation et chiffres | mots dans l'ordre de lecture ; signature après le dernier mot ; chiffres qui se comptent après la citation, jamais un faux chiffre figé |
| Cartes | un volet franc, puis le texte ; la carte suivante reste un bord visible qui invite à glisser ; elle se dévoile au glissé |
| Atelier | phrase, puis quatre verbes surlignés l'un après l'autre, lisibles sur la photo ; le surlignage ne ressemble pas à un lien |
| Éclaté | aucune image double pendant le relais assemblé → calques ; ouverture lisible ; pastilles sur leurs pièces ; légende ensuite |
| Partout | jamais plus de deux textes qui bougent ; rien qui clignote ; le film de l'iPhone simulé et celui du témoin natif sont indiscernables |
| Mouvement réduit | tout apparaît par fondus courts ; rien ne glisse ni ne tourne |

**Benj, sur son Xiaomi**, après l'intégration en ligne.
- **Il regarde** : l'accueil, du haut jusqu'au formulaire, puis une page commune. Il dit s'il voit ce qui est décrit au §1.
- **S'il ne voit « rien »**, les réponses aux trois questions de Q-M5 disent pourquoi.

---

## 8. Questions pour Benj

Goût et marque seulement. Sans réponse, le défaut s'applique.

| Id | Question | Défaut |
|---|---|---|
| Q-M1 | Au téléphone, le plateau noir monte-t-il **sur** le héros, qui reste en place (rideau, comme au bureau), ou le héros défile-t-il comme aujourd'hui ? | rideau |
| Q-M2 | Le geste au repos du héros tourne sans fin, comme au bureau. WCAG 2.2.2 (niveau A) demande un moyen d'arrêter un mouvement automatique de plus de 5 s. On garde tel quel, ou on arrête la rotation après 3 allers-retours (30 s) ? | tel quel : le mouvement réduit l'arrête, et la boucle se met en pause hors de l'écran |
| Q-M3 | Les quatre verbes de l'atelier : surlignage doré qui se trace sous chaque verbe, ou seulement l'allumage ? | surlignage |
| Q-M4 | Quand le téléphone demande moins d'animations : fondus courts (le site reste vivant), ou rien du tout ? | fondus courts (complément du 16/09) |
| Q-M5 | Sur ton Xiaomi : 1) quel navigateur, et quelle version (Chrome : `chrome://version` ; navigateur Xiaomi : « À propos ») ? 2) « Supprimer les animations » est-il activé (Paramètres, Accessibilité) ? 3) L'économiseur de batterie était-il actif quand tu as regardé ? | — (diagnostic, pas un choix) |

---

## 9. Risques, limites et ce qui n'est pas établi

1. **Rien n'est mesuré sur un vrai téléphone.**
   - L'iPhone simulé, c'est Chromium sans `animation-timeline`.
   - Le WebKit 26.6 de Playwright tourne sous Windows, sans carte graphique : ce n'est pas Safari d'iOS (compositeur, polices, décodage AVIF, barre d'adresse).
   - Les cadences et les budgets de temps ne valent que pour Chromium sans carte graphique.
2. **Safari 26.0 à 26.4** donne une progression fausse d'une view timeline près de 0 et 100 % (corrigé en 26.5). **Safari 26.2 et 26.3** calculent `view()` sur le fil principal (diagnostic 3). Sur ces versions, le natif est pris, pas le repli : le rendu de l'éclaté, du rideau et des glissements peut y différer, et c'est invérifiable ici.
3. **Hauteur d'écran quand la barre d'adresse bouge** : le repli lit `innerHeight`. La hauteur prise par la timeline native d'iOS et d'Android dans ce cas n'est pas établie (§2.8). L'équivalence n'est mesurée qu'en émulation, où les deux valent 844.
4. **Navigateur Xiaomi** : sa version de Chromium est inconnue. Sous Chromium 104, `translate` et `scale` sont ignorés : fondus sans déplacement. Sous 105, `cqw` manque et l'éclaté reste fixe. Sous 108, les `svh` du kit sont ignorés (le héros perd sa hauteur minimale, défaut qui existe déjà dans le kit, hors du périmètre).
5. **Économie d'énergie d'iOS** : rAF et animations à 30 images/s ; le repli suit alors le pouce à 30 images/s (WebKit bug 168837, diagnostic 3).
6. **Seuils « se voit »** : calibrés sur des états posés en CSS injecté, pas sur l'implémentation (`sonde-energie*.json`), et fixés à la moitié. Une implémentation conforme doit les passer largement ; un échec de peu se regarde sur planche avant d'ajuster, et tout ajustement s'écrit dans `decisions.md`.
7. **Juges existants** : quatre juges ont une partie téléphone à accorder avant l'intégration (§4.7). Sinon, ils échouent par construction.
8. **Dossier `public/sites-demo/kit/`** (§0.2 point 11) : il est hors du périmètre, mais peut faire échouer `nav-retenue-qa.mjs` et le contrôle « aucun dossier nouveau sous `public/sites-demo/` ». À régler avec la session qui l'a créé.
9. **Charge de la machine** : d'autres sessions font tourner des juges (`023-03` en cours, `publier-serie-qa.mjs` relevé à 21 h 03 UTC). Diagnostic 1 : film Android à 32,6 images/s sous charge. Lighthouse de 021-17 : passes à 81 et 86 sous charge, médiane 97. Les critères de temps attendent le calme (§6.0).
10. **LCP** : la marge est confortable (médiane de 1 825 ms en 021-17), mais les animations d'entrée du héros n'ont pas été passées dans Lighthouse. MO-70 et MO-75 le font.
11. **Plages de l'éclaté** : gardées de 021-17 (ouverture sur 376 px en 390×844). Plus long, il faudrait changer le partage de la figure avec la légende et le titre (§3.0, ordre des déclenchements). Hors de cette version.

---

## 10. Découpage proposé

| Tâche | Qui | Contenu | Vérifier |
|---|---|---|---|
| 024-02 | Claude Code | écrire `scripts/mobile-qa.mjs` (§6), le vérifier en échec sur la copie `actuel` pour les bonnes raisons (MO-10 à MO-28 sans effet, MO-40 sans repli), et accorder les juges du §4.7 | échec attendu consigné |
| 024-03 | exécutant (Codex ou Antigravity) | `_kit/familles/mobile.css` et `mobile.js`, et rien d'autre (§4.1) | `node scripts/mobile-qa.mjs --partie=effets`, puis `--partie=perf`, puis `--partie=films`, lancés hors du bac à sable |
| 024-04 | Claude Code | regard des films (§7) ; intégration (`da.json`, retrait de `telephone.css` et de `telephone-qa.mjs`) ; génération ; MO-95 ; mise en ligne ; `node scripts/deploiement-etat.mjs` | déploiement READY ; Benj regarde sur son Xiaomi et répond à Q-M5 |
