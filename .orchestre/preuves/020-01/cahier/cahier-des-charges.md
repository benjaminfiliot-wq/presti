# Cahier des charges — le moment signature de la démo « Atelier Lestraque »

**15/09/2026 — version finale, relu par deux contre-experts** (faisabilité et exigence).

- **Première rédaction** : le 15/09/2026, entre 09 h 38 et 10 h 09, heure de Paris. Sources : dates des JSON `cdc-*.json` (07:38Z à 07:58Z) et heure de modification du fichier. L'ancienne en-tête (« vers 08 h 30 », « HEAD mesuré vers 08 h ») était fausse : le commit cité, c62c866, date de 09:50:35 +0200 (`git log`).
- **Relecture finale** : 10 h 45 (`date`). Elle tient compte des 34 constats des deux contre-experts, dont 7 bloquants.
- **Suivi** : le traitement de chaque constat est au §13, avec une section « Constats écartés ». Les décisions de goût ou d'argent sont au §12.
- **Destinataires** : l'orchestre (Claude Code) pour les tâches 020-00, 020-01 et 020-04 ; un exécutant (Codex ou Antigravity) pour 020-02 et 020-03, qui n'a vu ni la conversation, ni les rapports.

**Ce qui change par rapport à la première rédaction :**
1. **La rotation ±4° n'est plus « la » solution.** Elle ne joue pas au format où la grille note la démo (1088×800), et elle reste « figée » selon la barre de vie du projet. Elle devient un candidat parmi trois (§3.5).
2. **Aucun exécutant ne commence avant deux étapes.** D'abord, figer le protocole de la grille (020-00). Ensuite, faire choisir par Benj, sur film, un geste au repos qui porte aussi la matière (020-01).
3. **Une cible haute** : calée sur les références notées C2 ≥ 4 et sur la barre de vie de video-qa.mjs, pas sur la proposition (§3.3).
4. **Portée limitée au héros de l'accueil** : `.ouverture>.hero--plein`. Les pages communes ne changent pas (R-10).
5. **Coins couverts sans aucune hypothèse de phase** : échelle de base 1,07, calculée dans les deux sens de rotation (§3.5).
6. **Critères séparés par tâche** (§8). Les critères inatteignables ou contournables sont réécrits : D-11 devient un critère de latence, D-6 simule l'onglet caché, D-8 n'est plus circulaire, R-3 vérifie la nature du geste.
7. **Nouveaux cas couverts** : cadrage de la toile après redimensionnement, contexte perdu pendant le fondu, chargement lent de la 2880, lumière du shader sous le titre tourné.
8. **La descente au défilement devient conditionnelle** : Benj la garde, l'amplifie ou la supprime après film (Q2).

## 0. À lire d'abord

### 0.1 Conventions

- **`presti/`** = `C:/Users/benja/Documents/presti/`. Les lignes citées sont celles du commit **c62c866** (2026-09-15 09:50:35 +0200).
  - Copies figées dans `cahier/HEAD-c62c866/`.
  - `git diff --stat 2e225af c62c866 -- public/sites-demo` est vide : rien n'a changé dans la démo depuis la barre retenue (2e225af, 09:34:02).
  - Au relevé de la relecture (10 h 45) : `git status --short public/sites-demo` vide, `.orchestre/en-cours/` vide. La précondition du §7.0 reste obligatoire.
  - Si les lignes ont bougé, retrouve-les par la chaîne citée entre guillemets.
- **`cahier/`** = `C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/signature/cahier/`.
  **`signature/`** = son dossier parent (les prototypes).
  Les exécutants n'y ont pas accès : 020-00 en recopie une sélection dans `presti/.orchestre/preuves/020-signature/` (§11).
- **Étiquettes de source** :
  - **[mesure cahier]** : première rédaction, scripts `cahier/cdc-*.mjs` et leurs JSON ;
  - **[contre-expert F]** (faisabilité) : `cahier/contre/contre-*.mjs` et leurs JSON, images `contre/images/` ;
  - **[contre-expert E]** (exigence) : `cahier/contre/mesure-repos.mjs`, `bornes-coins.mjs`, `grille-format.mjs`, `phase.mjs`, leurs JSON, images `contre/img/` ;
  - **[relecture]** : calculs de cette version, `cahier/relecture/bornes-et-budget.mjs` → `.json` et `cahier/relecture/amplitude.mjs` → `.json`.
- **Heures des relevés en ligne** :
  - `mesure-en-ligne.json` : 07:17Z, soit 09:17 à Paris, avant la barre retenue (`navRetenueCodex: false`). Ses chiffres du relief restent valables : les fichiers du relief sont identiques en ligne et à HEAD [contre-expert F]. Ceux qui dépendent de la barre ne le sont plus.
  - `cdc-en-ligne.json` : 07:41Z (09:41).
  - `cdc-c2-variantes.json` : 07:48Z (09:48).
- **h** = `innerHeight` du bureau. **y** = `scrollY`. **u** = y / h. Vérifié : 30svh valent 270 px à 900 px de haut (`cdc-en-ligne.json`, `palier30svh`).
- **Noms** : « Surtitre » = `.h1__cle`. « Titre » = `.h1__ligne` (« Fait pour rester »). « Pied » = `.hero__pied` (chapeau et bouton). « Plateau » = `.ouverture>.plateau`, fond `#14110E` (kit.css:352). « Toile » = `canvas.hero__relief`. « Héros de l'accueil » = `.ouverture>.hero--plein`.
- **E_b** = échelle de base du héros. **A** = amplitude de la rotation au repos, en degrés.

### 0.2 Où en est la démo (faits)

- **Grille à l'aveugle du 15/09** (decisions.md:49 ; notes dans `presti/.orchestre/preuves/017-vague-3/aveugle-v2/grille-aveugle.json`). La démo est à égalité en tête (4,08), mais trois critères sont sous la barre du 3e quartile :
  - C2 « mouvement ambiant » : 2,7 ;
  - C6 « matière » : 4 ;
  - C7 « retenue » : 3,3.
- **Barres du 3e quartile** (interpolation de `scripts/grille-qa.mjs:28` sur les notes des références) :
  - C2 : notes 1, 3, 4, 4, 5, barre **4** ;
  - C6 : notes 1, 3, 4, 5, 5, barre **5** ;
  - C7 : notes 2, 2, 4, 4, 4, barre **4**.
- **Définitions** (`aveugle/consignes.md`) :
  - C2 (l.17) : 1 = « tout est figé sans défiler », 5 = « quelque chose vit en permanence (boucle, parallaxe, projecteur) » ;
  - C6 (l.21) : 1 = « aplat plat », 5 = « texture visible, profondeur, lumière » ;
  - C7 (l.22) : 5 = « une nav fine, un bouton, rien de gratuit ».
- **Références notées C6 = 5** : stellar-launch et art-landing. **Notées C2 ≥ 4** : stellar-launch (5), art-landing (4), cinematic-landing-page (4) (`grille-aveugle.json`).
- **C7, la barre** : tâches 019-01 et 019-02, PASS dans le commit 2e225af (`git log`).
- **La barre de Benj** : les meilleurs sites de MotionSites et PromptedSite, pas la médiane. « La réaction de Benj reste la mesure finale » (decisions.md, ligne « La démo passe 8/8 »).

### 0.3 Ce que la grille a réellement vu (corrigé)

- **Format 1088×800**, et non 1280×800 comme l'écrivait la première rédaction.
  - decisions.md:49 : « démo capturée en 1088×800 ».
  - Les quatre images de `aveugle-v2/images-demo/` font 1088×800 (mesurées par sharp [contre-expert F], `contre/contre-calculs.json` → `grille`).
  - Capture native et non recadrée : sur `bureau-t25.png`, le logo et le bouton de menu sont à environ 54 px des deux bords, soit 5vw de 1088 [relecture, image regardée].
- **Commande de capture non versionnée.** `grep -rn "1088" scripts` ne trouve rien, et `scripts/demo-images-cles.mjs:26` capture en 1280×800. Il faut la versionner (020-00).
- **Rapport 1,36** : sous le seuil 16:10 de la rotation de la première rédaction. En 1088×800, avec le bloc injecté, `matchMedia('(min-aspect-ratio:16/10)')` = false, `rotate` = none et une seule animation (`pousse`) [contre-expert E, `contre/grille-format.json`].
- **Une seule image du héros** (`bureau-t25.png`) et trois images au défilement (`scripts/grille-aveugle.mjs:77`). Chaque image est recadrée en cover centré au rapport 1,36 (`grille-aveugle.mjs:113`, 127-130).
- **Les références** ont été notées sur quatre images de leur héros animé (`scripts/refs-images-cles.mjs:1-3`).
- **Très probablement sans relief.** Une capture Playwright sans drapeau de carte graphique donne `data-relief-etat="sans"` : le relief refuse le rendu logiciel (relief-fil.js:121-125 ; `cdc-en-ligne.json`, entrée `A_sansGPU…`). La commande de la capture 1088×800 n'étant pas versionnée, ce point n'est pas prouvé pour elle.
- **Le palier n'apparaît dans aucune image notée.** Palier de 240 px en 1088×800, première image de défilement à y = 2594 [contre-expert E, `grille-format.json`].
- **Conséquences** :
  - le geste au repos doit exister **en CSS, sans WebGL**, et **jouer en 1088×800** ;
  - la planche de la démo doit montrer **plusieurs instants du héros**, comme celles des références (020-00) ;
  - la descente au défilement ne peut pas faire monter une note de la grille : elle se juge sur film, par Benj (Q2).

### 0.4 Ce que les prototypes ont établi, et ce qui est abandonné

**Les prototypes.** `signature/proto*.mjs` (bureau) et `signature/tel*.mjs` (téléphone) calculent hors ligne une descente dans la cage d'escalier, pilotée par le défilement.

**Repris (si Benj garde la descente, Q2) :**
- le modèle de caméra de proto7.mjs:15-31 : D(r) = (max(r, RW)/RW)^−γ, et r' = r·D/(D−δ) ;
- le sens d'enroulement h = −1 (params.json:3) ;
- RW = 0,045 (params.json:6). Copie de params.json dans `cahier/params.json`, même md5.

**Abandonné, avec la raison** (confirmé à l'œil par le contre-expert E) :

| Élément | Raison | Source |
|---|---|---|
| « Nuit du puits » de proto7 | Tache ronde et floue, pas une lumière | `cahier/proto7-t068.jpg`, `proto7-planche.jpg` |
| Coordonnée de spirale et ombre « étage par étage » (Q, θ0, s0) | s0 n'est plus lu dès proto6 ; Q et θ0 ne servaient qu'à l'ombre abandonnée | proto6.mjs:10 ; proto7.mjs:33, 48 |
| Course pleine δ = 0,26 | Bois étalé : netteté de 91,8 en ligne à 7,4 à y585 | `cahier/zoom/mesures-zoom.json` ; `cahier/zoom/D-bois.png` |
| Palier de 65svh | Un écran de tunnel en plus | moment.mjs:21 |
| Titre immobile sur un fond qui s'éclaircit sans limite | Contraste des zones claires : 2,74 à y270, 1,91 à y585 | `cahier/titre.json` |
| Tout le téléphone tel5 / tel6 | Disque en dégradé sans rapport avec la géométrie, photo agrandie 3,19× à dpr 3 | tel6.mjs:25 ; `cahier/tel6-t055.jpg` ; `cahier/tel-grossissement.json` |
| Rotation ±4° en 10 s linéaire comme solution unique | Voir §3.2 | [contre-expert E], [contre-expert F] |

**Ce que les prototypes ne couvrent pas** : le mouvement au repos (une image à y = 0 est fixe : `cahier/moment-A-y0.jpg`) et le temps réel (aucun shader écrit).

## 1. Intention

- **Au repos, le héros vit de lui-même, visiblement**, sans que le visiteur fasse quoi que ce soit.
  - **Où** : sans WebGL, et dans tous les formats de bureau ≥ 1024 px de large dont le rapport est ≥ 34/25 (1,36), y compris celui de la grille (1088×800).
  - **Quoi** : un seul geste principal, continu, qui porte aussi la matière. Une lumière qui glisse sur le fil du bois et les nez de marche, et/ou une rotation lente de la cage autour de son puits.
  - **Choix** : Benj retient le geste sur film (020-01, Q1).
- **Au premier défilement** (si Benj garde la descente, Q2) :
  - le visiteur se penche : l'image plonge vers le puits ;
  - le surtitre et le pied s'effacent et laissent « Fait pour rester » seul ;
  - puis le plateau noir referme la cage.
- **Hiérarchie des gestes (C7).**
  - Au repos : un seul mouvement lisible. Le suivi de la souris reste, puisqu'il répond au visiteur. Les autres mouvements du shader sont coupés (§3.6).
  - Au défilement : la descente seule. Le geste au repos ne s'y cumule pas en roulis (§2).
- **Au téléphone, rien ne change** (§4 ; geste mobile : Q4).
- **Cible** : le haut des références (stellar-launch, art-landing), jamais la médiane. Benj juge en dernier.

## 2. Bureau au défilement : la descente (conditionnelle, Q2)

Cette section ne s'applique que si Benj garde la descente (décision consignée dans l'annexe B, produite par 020-01). S'il la supprime, 020-03 n'a pas lieu et l'ouverture reste celle d'aujourd'hui.

**Portée.**
- Conditions de la chorégraphie actuelle : `(min-width:1024px) and (prefers-reduced-motion:no-preference)` et `@supports (animation-timeline: view())` (kit.css:1075-1076).
- Seulement sous la classe `da--signature` de `<html>`, et seulement dans `.ouverture`, qui n'existe que sur l'accueil (generer.mjs:646).

**Deux couches.**
1. **CSS** : pour tout le monde, avec ou sans WebGL.
2. **WebGL**, seulement si `data-relief-etat="pret"` : perspective δ, et roulis ρ si le geste au repos ne comporte pas de rotation.

**Formules** (u = y/h ; clamp(x) = min(1, max(0, x))) :

| Grandeur | Formule | Origine |
|---|---|---|
| v, avancement de la descente | clamp(u / 0,30) | Palier de 0,30 h |
| Zoom du palier (`scale` de `.hero__media`, autour de l'œil) | 1 + 0,04·v | Choix de la première rédaction |
| Avancée de caméra δ (shader) | δmax·v ; 0 sans WebGL 2 ou sans texture 2880 | δmax : §6 |
| Roulis ρ (shader) | **0 si le geste au repos comporte une rotation** ; sinon h·76,923°·δ, avec h = −1 | Hiérarchie des gestes [contre-expert E] ; proto7.mjs:17,20 (20° pour δ = 0,26) |
| Opacité du surtitre et du pied | 1 − clamp(u / 0,25) ; `visibility:hidden` à 0 | §6 |
| Contenu (`.hero__contenu`) | `ouverture-texte` existante, décalée de 0,30 h : opacité 1 → 0 et translateY 0 → −14vh pour u ∈ [0,30 ; 0,85] | kit.css:1082, 1129 |
| Zoom de sortie (`transform` de `.hero__media`) | `ouverture-photo` existante : 1 → 1,08 pour u ∈ [0,30 ; 1,30] | kit.css:1083, 1130 |
| Voile `#0E0A07` | Existant : 0 → 0,6 pour u ∈ [0,40 ; 1,30] | kit.css:1084, 1131 |
| Haut du plateau | h·(1,30 − u) | Palier de 0,30 h |

**Décalage de 0,30 h mesuré** [mesure cahier, `cdc-en-ligne.json` → `palier30svh`], avec `margin-top:30svh` injecté sur le plateau, en 1440×900 :

| y | 0 | 270 | 518 | 765 | 1170 |
|---|---|---|---|---|---|
| Haut du plateau (px) | 1170 | 900 | 652 | 405 | 0 |
| Opacité du contenu | 1 | 1 | 0,499 | 0 | 0 |
| translateY du contenu (px) | — | — | −63,1 | −126 | −126 |
| Zoom de sortie | — | — | 1,022 | 1,044 | 1,08 |
| Voile | — | — | 0,117 | 0,30 | 0,60 |

Hauteur de `.ouverture` : 2158 px (1888 aujourd'hui).

### 2.1 Table pas à pas, 1440×900 (h = 900)

- Pour une autre hauteur, multiplier les px par h/900.
- δ et ρ sont donnés pour une toile à dpr 1, WebGL 2, texture 2880 et E_b = 1,07 : δmax = 0,116 [relecture, `bornes-et-budget.json` → `base1.07`].
- ρ n'est donné que pour un geste au repos sans rotation.

**Plage R — repos, y = 0.**
- **Image** : le geste au repos retenu (§3, annexe A) et la poussée (kit.css:322-323). Avec relief, le suivi de la souris seul (§3.6). δ = 0, zoom du palier à 1.
- **Titre, surtitre, pied** : opacité 1, après l'entrée existante `entre` du pied (0,8 s, délai 0,8 s ; kit.css:345-346).
- **Plateau** : haut à 1170 px.

**Plage 1 — la descente, y ∈ [0, 270].**
- **Image** : zoom du palier 1 → 1,04 autour de l'œil, et δ 0 → δmax, linéaires en y. Le geste au repos continue.
- **Titre** : opacité 1, immobile ; contraste ≥ 3 (D-5).
- **Surtitre et pied** : opacité 1 → 0 sur y ∈ [0, 225], puis `visibility:hidden` (plus cliquables). Le « Devis » de la barre apparaît dès que l'opacité du pied passe sous 0,2, soit vers y = 180 (kit.js:31-37, en ligne).

| y | 90 | 112 | 225 | 270 |
|---|---|---|---|---|
| v | 0,333 | 0,415 | 0,833 | 1 |
| Zoom du palier | 1,013 | 1,017 | 1,033 | 1,04 |
| δ (δmax 0,116) | 0,039 | 0,048 | 0,097 | 0,116 |
| ρ (sans rotation au repos) | −2,97° | −3,70° | −7,44° | −8,92° |
| Opacité du surtitre et du pied | 0,6 | 0,5 | 0 | 0 |

(Calcul : v = y/270, δ = 0,116·v, ρ = −76,923·δ, opacité = 1 − y/225.)

**Plage 2 — le plateau monte, y ∈ [270, 1170].**
- **Image** : δ au maximum ; zoom de sortie 1 → 1,08 (origine sur l'œil) ; voile 0 → 0,6 à partir de y = 360.
- **Titre** : opacité 1 → 0 et translateY 0 → −126 px sur y ∈ [270, 765].
- **Plateau** : haut de 900 → 0 px. Le relief s'arrête quand le haut du plateau est à 0,5 px ou moins (relief.js:74).

**Plage 3 — y > 1170.** Image couverte ; le héros se décolle à y = 1258.

**Au retour vers le haut**, tout est lié à la position. Après un saut ou un onglet redevenu visible, le worker reçoit la valeur courante (§5).

**Pas de fondu au noir dans le héros** : le voile existant et le plateau ferment la cage.

## 3. Au repos (C2, C6, C7)

### 3.1 Constat mesuré

**Ce qui bouge aujourd'hui sans geste du visiteur :**
- **La poussée** : 1 → 1,06 en 20 s, aller-retour (kit.css:322-323).
- **Avec relief seulement** :
  - une dérive de 14 × 9 px au plus, périodes 23 et 31 s (relief-fil.js:98-99, 104) ;
  - une bande de lumière d'un tour en 60 s environ (2π / 0,105 rad/s ; relief-fil.js:43, 103) ;
  - un creusement de période 17 s (relief-fil.js:101).

**Méthodes.**
- **Écart** = |a − b| moyen / 255, sur une réduction grise de 160 px de large (la réduction de scripts/video-qa.mjs:24, 83).
- **Part > 8** = part des pixels réduits dont l'écart dépasse 8 niveaux.
- **Barres de vie du projet** (video-qa.mjs) :
  - plan figé ≤ 0,8 s (l.26) ;
  - deux images sont « identiques » sous un écart de 0,006 (l.27) ;
  - « L'image vit » si l'écart moyen entre images ≥ 0,020 (l.29, contrôle l.195) ;
  - au-dessus de 0,085, c'est une coupe (l.30).

| Condition | Part > 8, 2,5 → 5 s / 5 → 8 s | Plage figée la plus longue | Source |
|---|---|---|---|
| En ligne, sans carte graphique, 1280×800 | 0,072 / 0,178 | 3,88 s sur 4 s | `cdc-c2-variantes.json` → `en-ligne` |
| En ligne, sans carte graphique, 1280×800, relevé de 10,5 s à 126 ms | 0,068 / 0,179 | **10,37 s sur 10,5** ; écart moyen par image 0,0014 | [contre-expert E] `mesure-repos.json` → `sequences.en-ligne` |
| En ligne, relief prêt, 1440×900 | 0,174 / 0,212 | 2,72 s sur 4 s | `cdc-en-ligne.json` → `B_GPU…` |
| Téléphone 390×844 dpr 3 | 0,115 / 0,132 | 3,98 s sur 4 s | `cdc-en-ligne.json` → `D_tel…` |

**Références** (`cdc-refs-mouvement.json`, moyenne des trois paires d'images-clés) :

| Référence | Note C2 | Part > 8 |
|---|---|---|
| agency-services | 1 | 0,122 |
| luxury-real-estate | **3** | **0,779** |
| stellar-launch | 5 | 0,557 |
| cinematic-landing-page | 4 | 0,735 |
| art-landing | 4 | 0,885 |

**Réserves.**
- Les images des références sont tirées au tiers de leur boucle, sur une durée inconnue, et compressées.
- La part > 8 **ne classe pas les notes** à elle seule : luxury-real-estate, noté 3, dépasse stellar-launch, noté 5. Elle est nécessaire, pas suffisante. L'œil de Benj tranche.

**Verdict** : sans relief, la démo change moins, d'une image fixe à l'autre, que la seule référence notée 1. Elle est figée au sens de video-qa.mjs.

### 3.2 La rotation ±4° de la première rédaction : ce qu'elle vaut

Bloc exact de la première rédaction, injecté sur la page en ligne dans le navigateur de test seulement, sans carte graphique.

| Mesure | Valeur | Source |
|---|---|---|
| Part > 8, 2,5 → 5 s / 5 → 8 s, 1280×800, trois essais | 0,444 / 0,485 ; 0,444 / 0,488 ; 0,445 / 0,487 | [contre-expert F] `contre-navigateur-B.json` → `bloc1-dans-le-html-1..3` |
| Part > 8 sur 1 s | 0,277 ; 0,25 ; 0,272 | idem |
| Plage figée la plus longue sur 4 s | 1,24 s ; 2,98 s ; 2,12 s | idem |
| Contraste p90 du fond du titre à 2,5 / 5 / 8 s | 3,19 / 3,19 / 3,16 (la première rédaction écrivait 3,24 / 3,23 / 3,18, mesurés sur une variante sans E_b et sous 4:3) | idem |
| Relevé de 10,5 s à 126 ms par image, 1280×800 | 95 % des paires d'images sous 0,006 ; plage figée 4,0 s puis 6,5 s ; écart moyen par image 0,005 | [contre-expert E] `mesure-repos.json` → `sequences.bloc1-essai1/2` |
| Vitesse, 1440×900 | 4,4 px/s au centre du titre, 6,6 px/s en moyenne, 14,3 px/s au coin le plus loin | idem → `calculs.rotation_px_s` |
| Netteté du bois (variance du laplacien) | 108,4 en ligne ; 113,3 à 0° ; 120,1 à 4° ; 117,6 en marche : la rotation n'abîme pas le bois | idem → `nettete` |
| Au format de la grille, 1088×800 | Ne joue pas (`rotate` = none) | [contre-expert E] `grille-format.json` |
| Coins à −4° avec la poussée à 1 | Découverts : 458 px en 1280×800, 608 px en 1440×900, 473 px en 1920×1080, 1 178 px en 1920×1200 | [contre-expert F] `contre-navigateur-ACDE.json` → `A_coins` ; image `contre/img/coins-1440x900--4deg_pousse1.png` |
| Après un passage de 1280×1024 à 1440×900 | Déphasage de 10 116 ms entre `pousse` et la rotation ; coin découvert à 12 instants sur 34 relevés, jusqu'à 608 px | [contre-expert F] `contre-resize.json` ; image `contre/images/resize-coin-t10500.jpg` |

**Verdict.**
- Pour C2 à la barre de Benj, cette rotation est insuffisante : figée pour video-qa, sous toutes les références notées C2 ≥ 4, et invisible au format de la grille.
- L'affirmation « seule variante qui fait baisser la plage figée » est retirée : elle ne se reproduit pas.
- La rotation reste un **candidat (R)**, corrigé au §3.5.

### 3.3 Cible C2 (critères du prototype et de 020-02)

Conditions : sans carte graphique, formats **1088×800**, **1280×800** et **1440×900**, page entière.

- **C2-a** : part > 8 **≥ 0,56** pour chacune des paires 2,5 → 5 s et 5 → 8 s.
  Origine : la plus basse des références notées C2 ≥ 4, stellar-launch, à 0,557 (`cdc-refs-mouvement.json`).
- **C2-b** : sur un relevé de 10 s à 8 images/s (réduction de video-qa.mjs:83), **plage figée la plus longue ≤ 0,8 s** (écart < 0,006), **ou** écart moyen par image **≥ 0,020**.
  Origine : video-qa.mjs:26-27, 29.
- **C2-c, anti-clignotement** : aucune paire d'images consécutives au-dessus de 0,085.
  Origine : video-qa.mjs:30, au-dessus de ce seuil c'est un changement de plan.
- **C2-d, jugement** : Benj regarde le film de 10 s à côté des quatre images-clés de stellar-launch (`presti/.orchestre/preuves/refs/stellar-launch-t0..t3.png`) et retient ou refuse le geste.

**Atteignable ?** Non établi. Aucune variante sobre mesurée ne tient C2-b : la meilleure rotation plafonne à 0,005 d'écart moyen par image (§3.2). Si aucun candidat que Benj trouve assez sobre ne tient C2-a et C2-b, **sa réaction prime**, et l'écart est consigné (Q1).

### 3.4 Cible C6 (matière visible sans carte graphique)

- **Le constat.** La grille a noté la photo nette sans relief (C6 = 4). La texture 2880 (§3.7) répare un adoucissement du chemin WebGL que la grille n'a jamais vu. Ce n'est donc pas la réponse à C6 [contre-expert E].
- **L'objectif.** Une lumière visible sans WebGL, qui fait lire le grain et le relief du bois : fil du bois, nez de marche. Elle reste masquée sous le titre.
- **C6-a** : écart de luminance moyenne sur la zone des marches (x 150-500, y 120-420 en 1440×900, à l'échelle pour les autres formats ; zone de `cdc-verif2.json`) entre t25 et t80.
  Seuil : **≥ 0,9 × la valeur mesurée sur le prototype retenu par Benj**. La valeur est consignée dans l'annexe A. Ce seuil est calé sur ce que Benj a validé, pas sur une proposition non jugée.
- **C6-b** : contraste du titre tenu (R-12, D-5).
- **C6-c** : la planche des quatre instants de la démo, regardée à côté de celles de stellar-launch et art-landing, les deux références notées C6 = 5.

### 3.5 Candidats à prototyper (020-01)

**Contraintes communes :**
1. **CSS seul**, visible sans WebGL, sous `html.js.da--signature .ouverture>.hero--plein`, `(min-width:1024px)` et `(prefers-reduced-motion:no-preference)`.
2. **Propriétés animées** : `transform`, `rotate`, `scale`, `translate` et `opacity` d'un **calque dédié** seulement. Aucune animation de `filter` ; aucune animation d'`opacity` sur `.hero__media`, `picture`, `img` ou la toile.
3. **Joue en 1088×800**, et à tous les rapports ≥ 34/25 à partir de 1024 px de large. Sous 34/25 (1024×768, par exemple), la poussée reste seule, comme aujourd'hui.
4. **Aller-retour sans arrêt sec** : easing sinusoïdal `cubic-bezier(.37,0,.63,1)`, l'approximation cubique usuelle de la sinusoïde. Tension connue : une sinusoïde ralentit aux extrêmes et allonge la plage figée. Le candidat RL la compense par la lumière, décalée d'un quart de période.
5. **Coins couverts sans hypothèse de phase** (candidats avec rotation, voir R).
6. **Masqué sous le titre** : contraste p90 du fond du titre ≥ 3,0 à tout instant (R-12).

**Candidat R — « la cage tourne » (corrigé).**
- **Boîte** : la photo 4:3 entière (`picture` en `left:0; width:100%; height:75vw; top:calc((100% - 75vw) * .42)`), `object-position:50% 50%`, origine `40.4% 38.6%` (da.json:8, `relief.oeil`).
- **E_b = 1,07**, portée par `transform:scale(1.07)`, par-dessus la poussée `scale` 1 → 1,06.
  - Pourquoi 1,07 : à 16:10, il faut 1,043 à +4° mais **1,0646 à −4°** [relecture, `bornes-et-budget.json` ; même valeur chez les contre-experts E et F].
  - 1,066 ne laisse que 0,75 px au pire coin en 1280×800 (0,84 px en 1440×900) ; 1,07 laisse 2,81 px en 1280×800, 3,17 px en 1440×900, 4,22 px en 1920×1200 [relecture].
  - Avec E_b ≥ la borne des deux sens, la poussée à 1 suffit : aucun déphasage (redimensionnement, synchronisation de la toile) ne peut découvrir un coin.
- **Amplitude A** :
  - **4°** à partir de 16/10 ;
  - **2,25°** entre 34/25 et 16/10.
  - Calcul avec E_b = 1,07, poussée à 1 [relecture, `amplitude.json`] : en 1088×800, l'angle symétrique maximal est 2,57° ; à ±2,25°, la marge du pire coin est de 3,55 px (3,9 px avec une barre de 15 px) ; à ±2,5°, elle tombe à 0,78 px.
- **Période** : 10 s par demi-cycle, `infinite alternate`, easing sinusoïdal.
- **Netteté** : 1440/1600 × 1,07 × 1,06 = 1,021 pixel d'image 1600 par pixel d'écran à dpr 1 au plus fort, contre 0,997 avec E_b = 1,045 [relecture, `bornes-et-budget.json` → `netteteRepos_img1600_dpr1`].
- **Attendu** : R seul ne tient probablement pas C2-b (écart moyen de 0,005 à ±4° linéaire, §3.2). Il sert de témoin et de base à RL.

**Candidat L — « la lumière sur le bois ».** Un calque `.hero--plein .hero__media::before` au-dessus de la photo et sous le dégradé du titre (`::after`, kit.css:319). Deux variantes à filmer :
- **L1, projecteur tournant.**
  - Point de départ : la variante `rai` de `cahier/cdc-c2-variantes.mjs:40-46`, un `conic-gradient` centré sur l'œil, un masque en anneau et `mix-blend-mode:soft-light`.
  - Mesurée à 20 s par tour : part > 8 de 0,247 / 0,370 et plage figée de 3,84 s (`cdc-c2-variantes.json`). Insuffisante telle quelle.
  - À essayer : un tour en 8 à 16 s, dans le sens h = −1 de l'enroulement (params.json:3), avec une intensité plus forte.
- **L2, lumière rasante.** Une bande douce, orientée le long des nez de marche, qui glisse en aller-retour sinusoïdal (`translate`) sur la zone des marches.

Pour L1 comme pour L2 : intensité nulle sous le haut du titre, par un masque ou par l'ordre des calques, et contraste R-12 tenu.

**Candidat RL** : R et L ensemble, la lumière décalée d'un quart de période pour animer les extrêmes de la rotation.

**Pour chaque candidat, 020-01 produit :**
- un film de 10 s en 1440×900 et en 1088×800, sans carte graphique ;
- les quatre instants t06, t25, t50 et t80 en 1088×800 ;
- les mesures C2-a, C2-b, C2-c, C6-a, R-4 (coins) et R-12 (contraste) ;
- la planche regardée à côté de stellar-launch et art-landing.

Le tout est montré à Benj (Q1).

### 3.6 Hiérarchie des gestes avec le relief (C7)

- **Constat.** Sur un bureau avec carte graphique, six mouvements de périodes différentes se superposent au suivi de la souris : la dérive (23 et 31 s), le creusement (17 s), la lumière (60 s), la poussée (20 s) et le geste au repos. Sources : relief-fil.js:98-104 et kit.css:322-323 [contre-expert E].
- **Exigence**, sous `da--signature` (drapeau `relief.calme`, §7.1) :
  - dérive à 0 ;
  - terme périodique du creusement à 0 (le terme `defile * 0.05` de relief-fil.js:101 est gardé) ;
  - bande de lumière du shader à 0 si le geste retenu comporte une lumière CSS (L ou RL) ;
  - le suivi de la souris reste.
- **Rotation avec relief** : la toile reçoit la même boîte, la même origine, la même E_b et les mêmes animations que la photo. relief.js resynchronise leurs `currentTime` au démarrage **et après chaque changement de taille** (§7.4).
- **Au défilement** : ρ = 0 si le geste au repos comporte une rotation (§2).

### 3.7 Matière avec le relief : texture 2880 (correctif du chemin WebGL)

**Le relief adoucit aujourd'hui le bois** [mesure cahier, `cdc-verif2.json` → `a_netteteRelief`]. Mesure avec carte graphique, 1440×900, variance du laplacien :
- zone bois : 109,0 avant le relief, 73,4 / 65,8 / 66,4 avec ;
- zone marches : 108,7 avant, 75,0 / 75,8 / 75,0 avec.

**Cause probable, non isolée** : photo réduite à 1440 px dans le worker (relief-fil.js:143-146), puis agrandie par le surbalayage de 2,4 % (l.100) et le creusement (l.101).

**Correction** :
- **Avec WebGL 2** : charger `images/heros-escalier-2880.avif` (2880×2160, 745 293 octets : `ls -la` [contre-expert F] ; dimensions par sharp dans `contre/contre-calculs.json`), sans redimensionner.
  - Générer ses mipmaps, filtre `LINEAR_MIPMAP_LINEAR` : c'est le risque de scintillement noté en relief-fil.js:141-142.
  - **Délai maximal de 3 s** pour le décodage, et **aucun chargement si `navigator.connection.saveData` est vrai**. Sinon, chemin actuel et δmax = 0 [contre-expert F].
- **Avec WebGL 1** : chemin actuel.
- **Critère** : R-5. Ce correctif n'est pas la réponse à C6 (§3.4).

## 4. Téléphone : rien ne change

- **Rien de nouveau** au téléphone : ni geste au repos (réservé à ≥ 1024 px), ni palier, ni descente, et toujours 0 octet de WebGL. Si Benj regarde sur son téléphone, il ne verra **aucune différence**. C'est voulu ici ; un geste mobile est la question Q4.
- **Raisons** :
  - decisions.md:9 : « Animation lourde sur mobile ? Non : bureau ≥ 1024 px seulement » ;
  - la grille n'a noté que le bureau (grille-aveugle.mjs:77) ;
  - les prototypes téléphone sont abandonnés (§0.4).
- **Ce qui reste** : la dérive `derive-tel-haut` (kit.css:940, 942), sur la photo agrandie 1,26 fois (kit.css:936).
- **Mesuré** [mesure cahier, `cdc-en-ligne.json` → `D_tel_390x844_dpr3`] : 0 requête du relief ; plage figée de 3,98 s sur 4 s.
- **Critère** : R-7.

## 5. Cas limites

| Cas | Comportement exigé | Pourquoi / source |
|---|---|---|
| **Mouvement réduit** | Rien de neuf : pas de geste au repos, pas d'E_b, pas de palier (haut du plateau à h), pas de fondu, pas de relief. Toutes les nouvelles règles vivent sous `prefers-reduced-motion:no-preference`. | kit.css:259-264 coupe les animations ; kit.js:183 ne charge pas le relief |
| **Sans WebGL** (`sans` ou `echec`) | Couche CSS seule : geste au repos, et, si la descente est gardée, palier avec zoom 1 → 1,04, fondus, chorégraphie décalée. | Conditions de la grille (§0.3) |
| **WebGL 1**, échec ou délai de la texture 2880 (> 3 s), ou `saveData` | Relief comme aujourd'hui (texture réduite), **δmax = 0**. | Texture 1440 à dpr 1,5 : p90 de grossissement 1,769 au repos avec E_b = 1,07, au-dessus du budget de 1,53 [relecture, `bornes-et-budget.json` → `tex1440_dpr15`] ; délai : relief-fil.js:146 attend `Promise.all` sans limite [contre-expert F] |
| **Sans JavaScript** | Pas de geste au repos ni d'E_b (règles sous `html.js`, comme la poussée, kit.css:322). Si la descente est gardée : palier et fondus présents, car la chorégraphie ne dépend pas de `html.js` (kit.css:1079-1084). | Cohérence avec la poussée |
| **Onglet caché puis visible** | La boucle du worker s'arrête (relief.js:63, 70). À la réactivation, relief.js renvoie `defile` et `descente` avec leurs valeurs courantes. | Aujourd'hui, après un saut de y 3000 à 0, le worker garde `defile` = 0,933 (`mesure-en-ligne.json` → `messagesApresSaut`) |
| **Contexte WebGL perdu ou erreur du worker, y compris pendant le fondu d'apparition** | Photo visible tout de suite. La toile perd `hero__relief--pret` et est retirée à `transitionend`, au plus tard après 1 000 ms. L'écouteur qui cache la photo (relief.js:48) et l'ajout de la classe (relief.js:49) sont désarmés dès l'appel de `fin()`. | Sans ce désarmement, un `perdu` pendant les 0,7 s du fondu (kit.css:1154) laisse le héros sans photo ni toile [contre-expert F] |
| **Redimensionnement** | Bascule immédiate aux seuils 1024 px, 34/25 et 16/10 : un saut de cadrage est admis. Coins toujours couverts, car E_b couvre les deux sens. relief.js renvoie `taille` **avec `pos`** (objectPosition relu), resynchronise les animations de la toile, puis envoie `descente` (0 si la chorégraphie ne tient plus). | relief.js:26 lit `pos` une seule fois et le message `taille` ne le transporte pas (relief-fil.js:186) [contre-expert F] ; déphasage réel mesuré dans `contre-resize.json` |
| **Pages communes** (`menuisier-*`) | Aucun changement : même cadrage, mêmes animations. | Leurs héros portent `hero--plein` (generer.mjs:684). Un sélecteur non limité à `.ouverture>` recadre bruz (part > 8 de 0,778, cintres coupés : `contre/images/C-menuisier-bruz-avant-apres.jpg`), saint-grégoire (0,751), cesson-sévigné (0,665) et rennes (0,519) [contre-expert F, `contre-navigateur-ACDE.json` → `C_communes_1440x900`] |
| **Barre de défilement classique** | Tolérée. Barre de 15 px : boîte de 1425×1080, origine x à 575,7 px au lieu de 581,76, soit 1,4 px entre le centre de rotation et l'œil. Les bornes de couverture baissent avec la barre. | [contre-expert F] `contre-navigateur-ACDE.json` → `E_barreDefilement_1440x900` ; [contre-expert E] `bornes-coins.json` (`moins4_barre17`) ; [relecture] `amplitude.json` (`barre15`) |
| **Navigateur sans `view()`** (Firefox) | Pas de palier ni de fondus (règles sous `@supports`), `descente` = 0. Le geste au repos reste présent. | kit.js:11 |
| **Écran de rapport < 34/25** au bureau (1024×768) | Pas de rotation ; lumière selon l'annexe A ; poussée comme aujourd'hui. L'origine du zoom du palier, `calc(42% − 2.55vw)`, n'est exacte qu'à partir de 4:3. | §6 ; [relecture] `bornes-et-budget.json` : ±4° demande 1,141 en 1024×768 |

## 6. Paramètres exacts

| Paramètre | Valeur | Source |
|---|---|---|
| Œil de la spirale, dans la photo | x 0,404 ; y 0,386 | da.json:8, `relief.oeil` |
| Cadrage au bureau aujourd'hui | object-position 50 % 42 %, cover | kit.css:317 |
| Œil à l'écran, rapport ≥ 4:3 | x = 40,4 % ; y = 42 % − 2,55vw | Calcul : photo 4:3 de largeur W, hauteur 0,75 W, décalée de (0,75 W − H)·0,42 |
| Portée des nouvelles règles | `html.js.da--signature .ouverture>.hero--plein` (repos) ; `.da--signature .ouverture` (défilement) | generer.mjs:646 (`.ouverture` = accueil seulement) ; §5 |
| Boîte de la photo entière (R, RL) | `left:0; width:100%; height:75vw; top:calc((100% - 75vw) * .42)` | Vérifiée par injection : part > 8 de 0,071 / 0,176 contre 0,072 / 0,178 en ligne (`cdc-c2-variantes.json` → `photo-entiere-seule`) |
| Origine des transformations de la photo et de la toile | 40,4 % 38,6 % | da.json:8 |
| E_b (R, RL) | `transform:scale(1.07)` | §3.5 ; [relecture] `bornes-et-budget.json` |
| A (R, RL) | 4° si `(min-aspect-ratio:16/10)` ; 2,25° si `(min-aspect-ratio:34/25)` ; aucune rotation en dessous | [relecture] `amplitude.json` |
| Sens de la rotation | **Les deux sens sont couverts par E_b** ; aucun calage de phase n'est nécessaire, ni permis comme garantie | [contre-expert F] `contre-calculs.json` (sens inverse : −0,0196 de marge avec 1,045) |
| Période et easing de la rotation | 10 s, `infinite alternate`, `cubic-bezier(.37,0,.63,1)` | §3.5 ; valeur définitive dans l'annexe A |
| Variable lue par relief.js | `--signature-a` (degrés, sans unité) : 4, 2.25 ou 0 | §7.3, §7.4 |
| Poussée | Inchangée : `pousse`, 20 s, `cubic-bezier(.45,0,.55,1)`, 1 → 1,06 | kit.css:322-323, 1156 |
| Palier (si Q2 = garder) | `margin-top:30svh` sur le plateau ; 0,30 h côté JS | moment.mjs:14 ; `cdc-en-ligne.json` → `palier30svh` |
| Zoom du palier | `scale` 1 → 1,04 sur `.hero__media`, `animation-range: 0px 30svh` | Choix de la première rédaction |
| Origine de `.hero__media` | `transform-origin: 40.4% calc(42% - 2.55vw)` | Œil à l'écran |
| Fondu du surtitre et du pied | Opacité 1 → 0 puis `visibility:hidden`, `scroll(root block)`, `animation-range: 0px 25svh` | moment.mjs:13-15 ; syntaxe vérifiée dans Chrome 153 (`cdc-css-test.json`) |
| Modèle de caméra | D(r) = (max(r, RW)/RW)^−γ ; r' = r·D/(D−δ) | proto7.mjs:19-24 |
| γ ; RW ; h | 0,6 ; 0,045 ; −1 | proto7.mjs:17 ; params.json:6 ; params.json:3 |
| Budget de grossissement | p90 ≤ 1,53 pixel de toile par pixel de texture, facteurs CSS compris, en fin de palier | `cdc-grossissement.json` (proto6 à t 0,30, jugé limite à l'œil : `cahier/moment-B-y270.jpg`) |
| Facteurs CSS en fin de palier | E_b × 1,06 × 1,04 : 1,1796 avec E_b = 1,07 ; 1,1024 sans rotation | [relecture] `bornes-et-budget.json` ; calcul pour E_b = 1 |
| δmax, WebGL 2 + texture 2880 | E_b = 1,07 : **0,116** à dpr de toile 1, **0,066** à dpr 1,5, interpolation linéaire entre les deux. E_b = 1,045 : 0,12 et 0,069. Sans rotation (E_b = 1) : **à calculer en 020-01**, avec `relecture/bornes-et-budget.mjs` (liste `base`). | [relecture] `bornes-et-budget.json` (0,1169 et 0,0661, arrondis vers le bas) ; `cdc-delta-final.json` |
| dpr de toile | min(devicePixelRatio, 1,5) | relief.js:31 |
| Roulis | 0 si le geste au repos comporte une rotation ; sinon ρmax = 76,923·δmax degrés, signe h = −1 | §3.6 ; proto7.mjs:17,20 |
| Montée de la descente à l'apparition du relief | δ et ρ multipliés par `intro` | relief-fil.js:95-96 |
| Inversion r' → r dans le shader | Exacte si rp·(1 − δ) ≤ RW ; sinon 4 itérations de Newton depuis rp·(1 − δ) | Précision exigée en D-10 |
| Cadence du worker pendant la descente | Dessiner quand `descente` ou `defile` change, **au plus une image par 16 ms** | Plafond à 60 images/s [contre-expert E] ; latence exigée en D-11 |
| Délai de la texture 2880 | 3 s ; rien si `saveData` | [contre-expert F] |
| Voile de la lumière du shader (`uVoile`) | Point le plus haut des coins haut-gauche et haut-droit du h1, ramené dans le repère non transformé de la toile pour θ ∈ {−A, +A} et s ∈ {E_b, E_b × 1,06}, en fraction de la hauteur de la toile, **moins 0,04** (formule au §7.4) | Aujourd'hui une droite fixe (relief.js:32 ; relief-fil.js:46). Tournée, elle laisse passer la lumière sur le haut du titre : −16 px au bord droit à +4° [contre-expert E, `mesure-repos.json` → `calculs.coupureLumiereRelief`] |
| Contraste du fond du titre | p90 ≥ 3,0 | WCAG 2.2, critère 1.4.3 (3:1 pour les grands caractères ; titre à 14,2vw, kit.css:328) |
| Dégradé sous le titre | Si R-12 échoue, n'éclaircir aucun arrêt, et n'assombrir que les arrêts du second dégradé entre 0 % et 46 % de hauteur, sous `html.js.da--signature .ouverture>.hero--plein .hero__media::after` | kit.css:319. Aujourd'hui, en 1366×768, p90 de 3,02 (poussée à 1) et 2,96 (poussée à 1,06) : déjà sous 3 [contre-expert E, `mesure-repos.json` → `extremes.1366x768`] |

## 7. Fichiers et points d'insertion (commit c62c866)

### 7.0 Précondition et régénération

- **Précondition.** `git status --short public/sites-demo` doit être vide.
  - Sinon, **s'arrêter sans rien modifier** et écrire `.orchestre/en-cours/020-0x.question.md` avec la sortie de la commande [contre-expert F].
- **Régénérer la démo, et elle seule** : `node public/sites-demo/generer.mjs lestraque`.
  - Les neuf autres démos sont gelées (decisions.md, ligne « Dix démos métier ou une seule ? »).
- **Annexes.** Le bloc CSS du geste au repos est celui de l'**annexe A** (produite par 020-01 et recopiée dans `.orchestre/preuves/020-signature/annexe-A.md`).
  - Le bloc du §7.3 ci-dessous est celui du candidat R, à reprendre si Benj choisit R ou RL.

### 7.1 `public/sites-demo/_kit/da.json` — ligne 8, entrée `lestraque`

- **020-02** :
  - ajouter `"signature": true` ;
  - dans `relief`, ajouter `"texture": "images/heros-escalier-2880.avif"`, `"calme": true` et `"lumiereCss": <true si le geste retenu comporte une lumière CSS>` (annexe A).
- **020-03** (si Q2 = garder) : dans `relief`, ajouter
  `"descente": {"palier": 0.30, "dmax1": <annexe B>, "dmax15": <annexe B>, "roulisParDelta": <0 si rotation au repos, sinon 76.923>, "gamma": 0.6, "rw": 0.045, "h": -1}`.
  - Valeurs de départ avec E_b = 1,07 : `dmax1` 0.116, `dmax15` 0.066 (§6).

### 7.2 `public/sites-demo/generer.mjs`

- **l.385**, classes de `<html>` (chaîne « `da.navRetenue ? ' da--nav-retenue'` ») : ajouter `${da.signature ? ' da--signature' : ''}`.
  - La classe est posée sur toutes les pages, communes comprises. C'est pourquoi toutes les règles CSS sont limitées à `.ouverture` (§6).
- **l.608**, `const relief = da.relief ? …` : ajouter
  - `data-relief-texture="${rel}${esc(da.relief.texture)}"` si présent ;
  - `data-relief-calme="1"` si `da.relief.calme` ;
  - `data-relief-lumiere-css="1"` si `da.relief.lumiereCss` ;
  - (020-03) `data-relief-descente="${esc(JSON.stringify(da.relief.descente))}"` si présent.
- **l.820-825**, bloc `if (da.relief) {` : refuser la génération si
  - le fichier de `texture` est absent ou fait moins de 1024 octets ;
  - (020-03) `descente.palier` ≠ 0,30, `dmax1` ∉ ]0 ; 0,26], `dmax15` > `dmax1`, `h` ∉ {−1, 1}, `gamma` ≠ 0,6 ou `rw` ≠ 0,045 ;
  - (020-03) `da.signature` est vrai mais kit.css ne contient pas `margin-top:30svh`.

### 7.3 `public/sites-demo/_kit/kit.css`

**Ne change pas** : les lignes existantes, et le HTML de `picture` (le garde-fou generer.mjs:146-148 tient toujours).

**Où insérer** : entre **l.1156** (« `html.js .hero--plein .hero__relief{animation:pousse` ») et **l.1157** (« `@media(min-width:1024px) and (hover:hover)` »).

**Bloc 1 (020-02), candidat R.** Pour L ou RL, l'annexe A remplace ou complète ce bloc, avec les mêmes portée, conditions et contraintes (§3.5).

```css
/* v28 : le moment signature (da--signature), 1. au repos : la cage tourne (candidat R ; annexe A si un autre geste est retenu).
   Accueil seulement (.ouverture>) : les héros des pages communes ne changent pas. E_b 1,07 couvre les coins dans les deux sens. */
@media(min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference){
  html.js.da--signature .ouverture>.hero--plein .hero__media>picture{position:absolute;left:0;top:calc((100% - 75vw) * .42);width:100%;height:75vw}
  html.js.da--signature .ouverture>.hero--plein .hero__media img{object-position:50% 50%}
  html.js.da--signature .ouverture>.hero--plein .hero__relief{inset:auto;left:0;top:calc((100% - 75vw) * .42);width:100%;height:75vw}
  html.js.da--signature .ouverture>.hero--plein .hero__media img,
  html.js.da--signature .ouverture>.hero--plein .hero__relief{--signature-a:2.25;transform-origin:40.4% 38.6%;transform:scale(1.07);animation:pousse 20s cubic-bezier(.45,0,.55,1) infinite alternate,signature-tourne-2 10s cubic-bezier(.37,0,.63,1) infinite alternate}
}
@media(min-width:1024px) and (min-aspect-ratio:16/10) and (prefers-reduced-motion:no-preference){
  html.js.da--signature .ouverture>.hero--plein .hero__media img,
  html.js.da--signature .ouverture>.hero--plein .hero__relief{--signature-a:4;animation:pousse 20s cubic-bezier(.45,0,.55,1) infinite alternate,signature-tourne-4 10s cubic-bezier(.37,0,.63,1) infinite alternate}
}
@keyframes signature-tourne-2{from{rotate:2.25deg}to{rotate:-2.25deg}}
@keyframes signature-tourne-4{from{rotate:4deg}to{rotate:-4deg}}
```

**Bloc 1 bis (020-02), si R-12 échoue** : sous `html.js.da--signature .ouverture>.hero--plein .hero__media::after`, redéclarer le `background` de kit.css:319.
- Seuls les arrêts du second dégradé entre 0 % et 46 % peuvent être assombris.
- Aucun arrêt n'est éclairci.

**Bloc 2 (020-03, si Q2 = garder)** :

```css
/* 2. au défilement : palier de 30svh, zoom vers l'œil, surtitre et pied effacés avant la montée du plateau */
@media(min-width:1024px) and (prefers-reduced-motion:no-preference){
  @supports (animation-timeline: view()){
    .da--signature .ouverture>.plateau{margin-top:30svh}
    .da--signature .ouverture .hero__media{transform-origin:40.4% calc(42% - 2.55vw);animation:ouverture-photo linear both,signature-palier linear both;animation-timeline:--plateau,scroll(root block);animation-range:entry 0% entry 100%,0px 30svh}
    .da--signature .ouverture .h1__cle,.da--signature .ouverture .hero__pied{animation:signature-efface linear both;animation-timeline:scroll(root block);animation-range:0px 25svh}
    html.js.da--signature .ouverture .hero__pied{opacity:0;animation:entre .8s cubic-bezier(.16,1,.3,1) .8s forwards,signature-efface linear both;animation-timeline:auto,scroll(root block);animation-range:normal,0px 25svh}
  }
}
@keyframes signature-palier{from{scale:1}to{scale:1.04}}
@keyframes signature-efface{to{opacity:0;visibility:hidden}}
```

**Points à respecter.**
- **Spécificité** :
  - `html.js.da--signature .ouverture>.hero--plein .hero__media img` (0,5,2) l'emporte sur `html.js .hero--plein .hero__media img` (0,3,2), kit.css:322 ;
  - `.da--signature .ouverture .hero__media` (0,3,0) l'emporte sur `.ouverture .hero__media` (0,2,0), kit.css:1083 ;
  - `html.js.da--signature .ouverture .hero__pied` (0,4,1) l'emporte sur `html.js .hero__pied` (0,2,1), kit.css:345.
- **Propriétés** :
  - `signature-palier` anime `scale`, pas `transform`, que `ouverture-photo` anime déjà (kit.css:1130) ;
  - la rotation passe par `rotate` ; la poussée anime `scale` (kit.css:323) ; E_b passe par `transform`.
- **`75vw` compte la barre de défilement.** Mesuré : 1,4 px d'écart entre le centre de rotation et l'œil avec une barre de 15 px (§5). Les unités de conteneur restent facultatives.

### 7.4 `public/sites-demo/_kit/relief.js`

- **Garde `fini` (020-02)** : `let fini = false`, déclaré avant `fin`.
  - **l.48** devient `toile.addEventListener('transitionend', () => { if (!fini && toile.isConnected) img.style.visibility = 'hidden' }, { once: true })`.
  - **l.49** devient `requestAnimationFrame(() => { if (!fini) toile.classList.add('hero__relief--pret') })`.
- **`fin()` (l.42, 020-02)** :
  ```js
  const fin = () => {
    if (fini) return; fini = true
    fil.terminate(); img.style.visibility = ''; hero.setAttribute('data-relief-etat', 'echec')
    if (toile.classList.contains('hero__relief--pret')) {
      toile.classList.remove('hero__relief--pret')
      const retirer = () => { toile.remove(); img.style.visibility = '' }
      toile.addEventListener('transitionend', retirer, { once: true }); setTimeout(retirer, 1000)
    } else toile.remove()
  }
  ```
- **`taille()` (l.30-34, 020-02)** : W et H viennent de la boîte de la toile (`toile.clientWidth`, `toile.clientHeight`, × k).
  - `pos` est relu à chaque appel et renvoyé : `pos: getComputedStyle(img).objectPosition…` (même analyse qu'à la l.26).
  - Le voile devient :
  ```js
  const A = parseFloat(getComputedStyle(toile).getPropertyValue('--signature-a')) || 0
  const t = titre.getBoundingClientRect(), m = media.getBoundingClientRect()
  const bx = toile.offsetLeft, by = toile.offsetTop, bw = toile.clientWidth || 1, bh = toile.clientHeight || 1
  const ox = bx + 0.404 * bw, oy = by + 0.386 * bh, eb = parseFloat((getComputedStyle(toile).transform.match(/matrix\(([^,]+)/) || [0, 1])[1]) || 1
  let yMin = Infinity
  for (const a of A ? [-A, A] : [0]) for (const s of [eb, eb * 1.06]) for (const x of [t.left - m.left, t.right - m.left]) {
    const th = a * Math.PI / 180, vx = x - ox, vy = (t.top - m.top) - oy
    yMin = Math.min(yMin, (oy + (-Math.sin(th) * vx + Math.cos(th) * vy) / s - by) / bh)
  }
  const voile = Math.max(0, Math.min(1, yMin - 0.04))
  ```
  (L'antécédent d'un point de l'écran par rotation θ et échelle s autour de O est O + R(−θ)(C − O)/s, la géométrie de `contre/bornes-coins.mjs`.)
- **Synchronisation (l.38-40, 020-02)** : remplacer par une fonction `synchroniser()`.
  - Pour chaque animation de `img.getAnimations()`, trouver celle de même `animationName` dans `toile.getAnimations()` et recopier `currentTime`.
  - Appeler `synchroniser()` au démarrage et dans le rappel du `ResizeObserver`.
- **Message `init` (l.52-57, 020-02)** : ajouter
  - `texture` : URL absolue de `data-relief-texture` ;
  - `calme` : `hero.hasAttribute('data-relief-calme')` ;
  - `lumiereCss` : `hero.hasAttribute('data-relief-lumiere-css')` ;
  - `economie` : `!!(navigator.connection && navigator.connection.saveData)`.
- **`ResizeObserver` (l.86-87, 020-02)** : observer aussi la toile. Dans le rappel : `taille`, puis `synchroniser()`, puis `surDefilement()`.
- **Descente (020-03)** :
  ```js
  const condChoregraphie = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
  const signature = d.documentElement.classList.contains('da--signature') && !!(window.CSS && CSS.supports('animation-timeline: view()'))
  const reglage = JSON.parse(hero.getAttribute('data-relief-descente') || 'null')
  const defileV = () => Math.min(1, Math.max(0, scrollY / innerHeight))   // comme relief.js:76
  const descente = () => (reglage && signature && condChoregraphie.matches ? Math.min(1, Math.max(0, scrollY / (reglage.palier * innerHeight))) : 0)
  const envoyerDescente = () => fil.postMessage({ type: 'descente', v: descente(), t: performance.timeOrigin + performance.now() })
  ```
  - `init` reçoit en plus `descente: reglage` et `v: descente()`.
  - **`majActif` (l.62-68)** : quand `a` est vrai, envoyer aussi `{type:'defile', v: defileV()}` puis `envoyerDescente()`.
  - **`surDefilement` (l.72-77)** : si `etat`, appeler `envoyerDescente()` après `defile`.
  - Ajouter `condChoregraphie.addEventListener('change', surDefilement)`.

### 7.5 `public/sites-demo/_kit/relief-fil.js`

**020-02, au repos.**
- **État (l.51-55)** : ajouter
  - `calme = false, lumiereCss = false, largeurTexture = 0, webgl2 = false` ;
  - `durees = []` (anneau des 240 dernières durées d'`image()`, en ms).
- **`init(m)` (l.112-167)** :
  - `calme = !!m.calme ; lumiereCss = !!m.lumiereCss`.
  - `webgl2` : vrai si le contexte obtenu à la l.115 est `webgl2`.
  - **Texture.** Si `webgl2`, que `m.texture` existe et que `m.economie` est faux, décoder `m.texture` sans redimensionner, dans une course avec un délai de 3 000 ms.
    - En cas d'échec ou de délai, chemin actuel (l.143-146).
    - `largeurTexture` = largeur réellement chargée.
  - **Mipmaps**, pour l'unité 0 et la texture 2880 seulement : après `texImage2D` (l.157), `gl.generateMipmap(gl.TEXTURE_2D)` et `TEXTURE_MIN_FILTER` = `LINEAR_MIPMAP_LINEAR` (l.156).
- **`image()` (l.76-109)** :
  - si `calme`, la dérive vaut 0 : multiplier `derive` par 0 dans les l.98-99 ;
  - si `calme`, le terme `0.014 * Math.sin(temps * 2 * Math.PI / 17)` de la l.101 vaut 0 ;
  - si `calme && lumiereCss`, `uLumiere` (l.102) vaut 0 ;
  - mesurer la durée de la fonction (`performance.now()` en entrée et en sortie) dans `durees`.
- **`onmessage` (l.169-196)** :
  - **l.186** (`taille`) : si `m.pos` existe, `pos = m.pos` avant `cadrer()`.
  - **l.195** (`compte`) : renvoyer en plus `largeurTexture`, `webgl2`, `calme`, `derive` (valeur appliquée), `lumiere` (valeur de `uLumiere`), `dureeP95` (95e centile de `durees`) et, en 020-03, les champs de la descente ci-dessous.

**020-03, la descente.**
- **Shader `FS` (l.24-49)** : uniformes `uDelta`, `uRoulis`, `uRW`, `uGamma` (l.31-32). Juste après la ligne « `uv=uCentre+(uv-uCentre)*(1.-uMarge);` », insérer :
  ```glsl
  vec2 dq=(uv-uOeil)*vec2(uAspect,1.);      // unités : hauteur de la photo, comme q en l.41
  float rp=length(dq), r=rp*(1.-uDelta);    // exact tant que r <= uRW (D = 1)
  if(uDelta>0.&&r>uRW){ for(int i=0;i<4;i++){ float w=pow(r/uRW,uGamma), den=1.-uDelta*w; r=max(uRW,r-(r/den-rp)/((1.+uDelta*(uGamma-1.)*w)/(den*den))); } }
  float an=atan(dq.y,dq.x)-uRoulis;
  uv=uOeil+vec2(cos(an),sin(an))*r/vec2(uAspect,1.);
  ```
  Piège : proto7.mjs:48 écrit `smooth(F+RAMPE, F-RAMPE, …)`, bornes inversées. Ne pas reprendre (ombre abandonnée).
- **État** : `descente = 0, dmax = 0, roulisParDelta = 0, sens = -1, rw = 0.045, gamma = 0.6, dernierDescente = -1, dernierDefile = -1, tMessage = 0, tDessin = 0, latences = []` (anneau de 240), `dernierDessinDescente = 0`.
- **`image()`** :
  - **l.90** : `bouge` est aussi vrai si `descente !== dernierDescente` ou `defile !== dernierDefile`, **à condition que `now − dernierDessinDescente ≥ 16`**.
  - Après `drawArrays`, mettre à jour `dernierDescente`, `dernierDefile` et `dernierDessinDescente = now`. Si la descente a changé, pousser `tDessin − tMessage` dans `latences`, avec `tDessin = performance.timeOrigin + performance.now()`.
  - **Après l.104** :
    - `gl.uniform1f(u.uDelta, dmax * descente * intro)` ;
    - `gl.uniform1f(u.uRoulis, sens * roulisParDelta * dmax * descente * intro * Math.PI / 180)`.
- **`init(m)`** : lire `m.descente`. `dmax` n'est non nul que si `webgl2` et `largeurTexture ≥ 2880` :
  `dmax = m.descente.dmax1 − (Math.min(1.5, Math.max(1, dpr)) − 1) × (m.descente.dmax1 − m.descente.dmax15) / 0.5`.
  Ajouter les uniformes à la liste de la l.153, puis régler `uRW` et `uGamma` une fois.
- **`onmessage`** :
  - nouveau message : `else if (m.type === 'descente') { descente = m.v; tMessage = m.t; relancer() }` ;
  - **l.192** : `defile` stocke ET appelle `relancer()` ;
  - `compte` renvoie aussi `descente`, `derniereDescenteDessinee` (= `dernierDescente`), `dmax` et `latences`.

### 7.6 Hors du périmètre d'un exécutant de site

- `scripts/demo-video.mjs:245-257`, plan `heros_souris` : il défile de 300 px en 1 300 ms en 1280×800 (l.253). Avec un palier de 240 px, le plateau n'apparaîtrait plus dans les 720 px gardés (commentaire l.249-251). À adapter en 020-04 si Q2 = garder.
- `scripts/grille-aveugle.mjs:77` et la commande de capture 1088×800 : protocole à figer en 020-00.
- Les juges `scripts/signature-repos-qa.mjs` et `scripts/signature-defile-qa.mjs` (§8) : Claude Code les écrit, car un exécutant n'écrit pas dans `scripts/**` (`.orchestre/fait/019-02.md:6`).

## 8. Critères d'acceptation mesurables

### 8.0 Méthodes communes

- **Navigateur** : Chromium de Playwright (Chrome 153.0.8010.12, `cdc-css-test.json`), chargé par `createRequire('C:/Users/benja/Documents/presti/package.json')`.
- **« Sans carte graphique »** = `chromium.launch()` nu (demo-images-cles.mjs:22).
- **« Avec carte graphique »** = `chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] })` (demo-video.mjs:144).
- **Page servie** : la démo régénérée, servie en local comme `scripts/nav-retenue-qa.mjs:34, 47-54`.
- **Écart, part > 8** : définis au §3.1.
  - Le script de référence de la réduction est `cahier/cdc-c2-variantes.mjs` (fonctions `gris` et `ecart`).
  - Chemins absolus ou relatifs au fichier (`import.meta.url`), jamais au dossier courant.
- **Figer les animations** : `el.getAnimations().forEach(a => { a.pause(); a.currentTime = t })` sur `img` et la toile ; pour un calque de lumière, `document.getAnimations()`.
- **Onglet caché**, simulé : Playwright headless ne cache pas la page quand on ouvre un 2e onglet (`visibilityState` reste `visible`, aucun `visibilitychange` [contre-expert F, `contre-navigateur-ACDE.json` → `D_ongletCache_headless`]). Procédure :
  1. `Object.defineProperty(document, 'hidden', { get: () => true, configurable: true })`, et même chose pour `visibilityState` (`'hidden'`) ;
  2. `document.dispatchEvent(new Event('visibilitychange'))` ;
  3. vérifier qu'un message `actif` = false a bien été émis (témoin) ;
  4. faire l'action (défilement) ;
  5. `delete document.hidden ; delete document.visibilityState`, puis redéclencher l'événement.
- **Défilement continu** : `page.mouse.wheel(0, 5)` à chaque `requestAnimationFrame` pendant 2 s, ou CDP `Input.synthesizeScrollGesture`.
  - Témoin : au moins 100 changements de `scrollY` sur la fenêtre.
  - La molette par pas de 60 px ne donne que 10 positions pour 136 à 143 rAF [contre-expert F, `contre-gpu.json`].
- **WebGL 1 forcé** : lancer avec `--disable-webgl2` en plus des drapeaux de carte graphique. Témoin : `compte.webgl2 === false`.
  - Si le témoin ne passe pas, retirer la branche WebGL 1 des critères et la déclarer non testée.
- **Contraste** : injecter `.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}` ; capturer en PNG ; luminance relative sRGB des pixels de la boîte de `.hero h1` ; 90e centile L ; contraste = 1,05/(L + 0,05).
- **Lighthouse** :
  - servir `public/sites-demo/lestraque` en local, puis lancer 5 fois `node scripts/sonde-lighthouse.mjs http://127.0.0.1:<port>/index.html` et prendre la médiane. Sans argument, le script vise `https://prestiapp.fr/` (sonde-lighthouse.mjs:13) et ne fait qu'un passage (l.16-24) ;
  - `node scripts/site-qa.mjs public/sites-demo/lestraque` : sans argument, il sort en erreur (site-qa.mjs:646-649) ;
  - les deux commandes partagent le verrou Lighthouse de site-qa.mjs : les lancer l'une après l'autre.
- **Références « avant »** (020-00, sur c62c866) : captures des 4 pages communes et de l'accueil, écart toile/photo, contrastes par format, Lighthouse et site-qa.

### 8.1 Juge `scripts/signature-repos-qa.mjs` (tâche 020-02, au repos)

Il régénère la démo, puis contrôle R-1 à R-16 et P-1 à P-4. Il ne contrôle **aucune** règle de défilement : plateau, fondus et descente appartiennent à 020-03 [contre-expert F].

- **R-1 — C2-a.** Sans carte graphique, en 1088×800, 1280×800 et 1440×900.
  - Mesure : captures PNG à 2,5 s, 5 s et 8 s après `domcontentloaded`, sans défiler.
  - Seuil : part > 8 **≥ 0,56** par paire (§3.3), ou la valeur de l'annexe A si Benj a retenu un geste plus sobre (Q1).
  - Témoin : en ligne aujourd'hui, 0,072 / 0,178.
- **R-2 — C2-b et C2-c.** Mêmes conditions ; relevé de 10 s à 125 ms à partir de 8 s.
  - Seuils :
    - plage figée la plus longue ≤ 0,8 s, **ou** écart moyen par image ≥ 0,020 (sauf seuil de l'annexe A) ;
    - aucune paire au-dessus de 0,085.
  - Origine : video-qa.mjs:26-27, 29-30.
- **R-3 — Nature du geste**, anti-contournement [contre-expert F].
  - **Animations** : `img.getAnimations()` contient `pousse` et les animations nommées dans l'annexe A. En 1440×900 pour R : `signature-tourne-4`.
  - **Aucune animation de `filter`**, et aucune animation d'`opacity`, sur `.hero__media`, `picture`, `img` ou la toile. Contrôle : `getKeyframes()` de chaque animation.
  - **Si le geste comporte une rotation** :
    - `rotate` calculé ∈ [−A, A] ;
    - variation absolue entre 2,5 s et 5 s ≥ 0,5·A. Calcul de la relecture : sinusoïde de 10 s et retard d'animation de 0,34 s (`contre-navigateur-B.json`, état 2500 : `pousse@2867` pour une capture à 3 208 ms), soit 0,67·A attendu ;
    - **recalage** : calque de lumière masqué par une feuille de test, l'image à 5 s re-tournée de −Δangle et remise à l'échelle de 1/Δscale autour de l'œil (valeurs lues par `getComputedStyle`) doit donner une part > 8 < 0,10 contre l'image à 2,5 s. Seuil : choix du contre-expert F.
  - **Si le geste comporte une lumière** : les animations du calque ne portent que `transform`, `rotate`, `translate` ou `opacity` (`document.getAnimations()` + `getKeyframes()`).
- **R-4 — Aucun coin découvert.**
  - **Feuille de test** : `.hero--plein{background:#f0f!important}`, plus `display:none` sur `.hero--plein .hero__media::after`, `.hero--plein .hero__media::before`, `.ouverture .hero--plein::after`, `.hero__contenu` et `.nav`.
  - **Détecteur** : pixel où |R − 255| < 40, G < 60 et |B − 255| < 40.
    - Témoin obligatoire (photo cachée) : la feuille doit rendre du magenta. Chez le contre-expert F, 1 207 825 px en 1440×900.
  - **Formats** : 1088×800, 1280×800, 1366×768, 1440×900, 1920×1080, 1920×1200, 2560×1080, sans et avec carte graphique, à y = 0.
  - **Cas** :
    1. animations figées aux 80 instants du cycle de 40 s (pas de 500 ms) ;
    2. déphasage forcé : rotation à ±A, `pousse` à `currentTime` 0 ;
    3. redimensionnement réel : chargement en 1280×1024, passage en 1440×900 à t ≈ 10 s, puis relevé en temps réel pendant 8-12 s et 28-32 s de l'animation de rotation, au pas de 250 ms ;
    4. une fois en 1440×900 et 1088×800 avec barres visibles (`ignoreDefaultArgs: ['--hide-scrollbars']`).
  - **Seuil** : **0 pixel** dans tous les cas.
  - **Origine** : §3.5 et §5. Avec E_b = 1,045, le cas 2 découvrait 458 à 1 178 px et le cas 3 jusqu'à 608 px [contre-expert F].
- **R-5 — Le relief n'adoucit plus le bois.** Avec carte graphique, 1440×900, trois essais, médiane.
  - **Mesure** : animations de la photo et de la toile figées à `currentTime` 0. Capture avant « pret » (photo visible), puis 3,2 s après « pret ». Variance du laplacien sur x 900-1400, y 120-420 (bois) et x 150-500, y 120-420 (marches).
  - **Seuils** :
    - ratio avec relief / avant relief **∈ [0,90 ; 1,15]** sur les deux zones ;
    - `compte.largeurTexture` = 2880 ;
    - écart moyen entre la capture de la toile et celle de la photo (toile masquée par une feuille de test), sur la zone bois, **≤ la même mesure faite en 020-00 sur c62c866**.
  - **Origine** : aujourd'hui 0,60 à 0,70 (`cdc-verif2.json`). La dispersion de ±5,5 % des trois essais laisse la marge de 0,90. La borne haute de 1,15 empêche un filtre d'accentuation de passer (choix du contre-expert F).
- **R-6 — Mouvement réduit** (`reducedMotion: 'reduce'`), 1440×900.
  - Seuils : 0 requête dont l'URL contient `relief` ; `rotate` de la photo = `none` ; aucune animation `signature-*` ; haut du plateau = h ± 1 px à y = 0.
  - Origine : kit.js:183 ; kit.css:259-264.
- **R-7 — Téléphone**, 390×844, dpr 3, `isMobile`.
  - Seuils : 0 requête `relief` ; `animationName` de la photo = `derive-tel-haut` ; `rotate` = `none` ; `margin-top` calculé du plateau = 0 ; capture identique à `cahier/avant/tel-p000-y0.jpg` à part > 8 < 0,02 près, animations figées.
  - Origine : kit.css:940 ; decisions.md:9.
- **R-8 — Sans JavaScript** (`javaScriptEnabled: false`), 1440×900.
  - Seuils : `rotate` de la photo = `none` ; aucune animation `signature-*` sur la photo.
  - Origine : §5.
- **R-9 — Sans carte graphique.**
  - Seuils : `data-relief-etat` = `sans` à 8 s, et R-1 passe.
  - Origine : §0.3.
- **R-10 — Pages communes inchangées.** 1440×900 et 1088×800, les 4 pages `menuisier-*`.
  - Mesure : animations figées à `currentTime` 0.
  - Seuils :
    - `objectPosition` et boîte de `picture` identiques à la référence de 020-00 ;
    - aucune animation `signature-*` ;
    - part > 8 **< 0,02** contre la capture de référence.
  - Origine : [contre-expert F], `C_communes_1440x900`.
- **R-11 — C6-a.** Sans carte graphique, 1088×800 et 1440×900.
  - Seuil : écart de luminance moyenne sur la zone des marches entre t25 et t80 ≥ 0,9 × la valeur de l'annexe A.
  - Origine : §3.4.
- **R-12 — Contraste du titre au repos.**
  - Conditions : sans carte graphique en 1088×800, 1280×800, 1366×768, 1440×900 et 1536×864 ; avec carte graphique en 1440×900.
  - Mesure : animations figées aux 80 instants du cycle de 40 s.
  - Seuil : p90 **≥ 3,0** partout.
  - Si le seuil n'est pas tenu : bloc 1 bis (§7.3), puis réduction de A du côté qui assombrit le moins, sans toucher au bois au-dessus de 46 %.
  - Origine : WCAG 2.2, 1.4.3. En 1366×768, déjà 2,96 à 3,02 aujourd'hui, et 2,82 à 2,97 avec la rotation de la première rédaction [contre-expert E, `mesure-repos.json` → `extremes`].
- **R-13 — Hiérarchie des gestes avec le relief.** Avec carte graphique, 1440×900.
  - Seuils : `compte.calme` = true ; `compte.derive` = 0 ; `compte.lumiere` = 0 si `lumiereCss`.
  - Voile : pour A = 4, `uVoile` envoyé ≤ la fraction du coin le plus haut du h1 tourné, moins 0,04 (formule du §7.4, recalculée par le juge).
  - Origine : §3.6 ; §6, ligne « Voile ».
- **R-14 — Chargement lent.** Avec carte graphique, `page.route` retarde `heros-escalier-2880.avif` de 6 s.
  - Seuils : `data-relief-etat` = `pret` avant 10 s ; `compte.largeurTexture` < 2880.
  - Origine : §3.7.
- **R-15 — Contexte perdu pendant le fondu.** Avec carte graphique.
  - Mesure : `hero.reliefFil.onmessage({ data: { type: 'perdu' } })` **100 ms après** « pret », pendant le fondu de 0,7 s.
  - Seuils :
    - photo `visibility` ≠ `hidden` à +0 ms **et à +1 000 ms** ;
    - à +100 ms, toile encore dans le DOM avec une opacité calculée strictement entre 0 et 1 ;
    - à +1 100 ms, toile retirée.
  - Refaire avec `perdu` 3 s après « pret ».
  - Origine : relief.js:48-49 ; [contre-expert F].
- **R-16 — Cadrage de la toile après redimensionnement.** Avec carte graphique.
  - Mesure : relief prêt en 1440×900, passage en 1280×1024, puis retour en 1440×900. Dans chaque format, animations figées ; capture de la toile, puis de la photo (toile masquée).
  - Seuil : part > 8 **< 0,05** entre les deux.
  - Origine : relief.js:26 ; [contre-expert F].

### 8.2 Juge `scripts/signature-defile-qa.mjs` (tâche 020-03, si Q2 = garder)

Il régénère la démo, puis contrôle D-1 à D-15, R-4 à y = 0,30 h, R-6, R-8 complet et P-1 à P-4.

- **D-1 — Géométrie du palier**, 1440×900 et 1280×800 (valeurs × 800/900).
  - Mesure : `scrollTo`, attente de 400 ms.
  - Seuils : table du §2 (haut du plateau 1170 / 900 / 652 / 405 / 0 aux y 0 / 270 / 518 / 765 / 1170 ; opacité du contenu 1 / 1 / 0,50 / 0 ; voile 0,30 à y = 765 et 0,60 à y = 1170) ; ±1 px, ±0,02 ; `.ouverture` 2158 ± 1 px.
  - Origine : `cdc-en-ligne.json` → `palier30svh`.
- **D-2 — Surtitre et pied**, 1440×900.
  - Seuils : opacité 1 à y = 0 (2 s après le chargement) ; 0,50 ± 0,05 à y = 112 ; 0 et `visibility:hidden` pour y ≥ 225.
  - Origine : `cdc-css-test.json`.
- **D-3 — Titre immobile.** Pour y ∈ {0, 90, 180, 270} : `top` de `.h1__ligne` constant à ±0,5 px, opacité du contenu = 1.
- **D-4 — Un seul appel visible** : `node scripts/nav-retenue-qa.mjs` PASS (`.orchestre/fait/019-02.md:7`).
- **D-5 — Contraste pendant la descente.**
  - Formats : 1280×800, 1366×768 et 1440×900, sans et avec carte graphique.
  - Mesure : y ∈ {0 ; 0,10 h ; 0,20 h ; 0,30 h} × huit instants du cycle au repos, animations figées.
  - Seuil : p90 ≥ 3,0 partout où l'opacité du contenu est ≥ 0,5.
  - Si le seuil n'est pas tenu : baisser δmax et le zoom du palier, sans ajouter de calque.
  - Origine : en fin de palier émulée, à −4° : 3,06 en 1280×800 et 3,11 en 1440×900 [contre-expert E, `extremes`].
- **D-6 — Le worker suit la page.** Avec carte graphique, 1440×900.
  - Seuils :
    - à y ∈ {0 ; 135 ; 270 ; 540}, `compte.descente` = clamp(y/270) ± 0,01 ;
    - après `scrollTo(0, 3000)` puis `scrollTo(0, 0)`, `descente` = 0 en moins de 200 ms ;
    - même chose avec le saut fait **pendant l'onglet caché simulé** (§8.0), mesuré après réactivation.
  - Origine : `mesure-en-ligne.json` (`defile` bloqué à 0,933).
- **D-7 — Course utilisée.**
  - Seuils :
    - WebGL 2 et texture 2880 : `dmax` = `dmax1` ± 0,002 (dpr 1) ou `dmax15` ± 0,002 (`deviceScaleFactor` 1,5) ;
    - `--disable-webgl2` avec son témoin (§8.0), ou 2880 bloquée par `page.route` : `dmax` = 0.
- **D-8 — Budget de grossissement**, calcul dans le juge, non circulaire.
  - Mesure : lire `dmax`, `largeurTexture` et le dpr de toile dans `compte`, et E_b dans le `transform` calculé. Calculer p90 avec le modèle de proto7.mjs:19-24 **pour ce dmax**, sur la grille 64 × 40 de `relecture/bornes-et-budget.mjs`, avec des facteurs CSS E_b × 1,06 × 1,04 × (1440 ou 2880 selon la texture).
  - Seuil : **p90 ≤ 1,53** à dpr 1 et à dpr 1,5.
  - Origine : §6. `cdc-delta-final.mjs` cherchait δ au lieu de le vérifier [contre-expert F]. Avec E_b = 1,07, δ = 0,12 donnerait 1,567 [relecture].
- **D-9 — Netteté en fin de palier** (indicatif).
  - Seuil : variance du laplacien à y = 270, zone bois ≥ 0,68 × « avant relief » de R-5.
  - Origine : `zoom/mesures-zoom.json` (62,3 / 91,8).
- **D-10 — Précision de l'inversion.** Porter en JS la boucle GLSL du §7.5 et la comparer à la dichotomie de proto7.mjs:21-31.
  - Grille : 64 × 48 sur **1440×1080** (la toile rend la photo entière), rp jusqu'au coin le plus lointain de l'œil, δ ∈ {0,03 ; 0,06 ; 0,09 ; δmax}.
  - Deux essais : double précision, puis **demi-précision** simulée (arrondi IEEE 754 sur 16 bits à chaque opération, `Math.f16round` si disponible). `mediump` peut n'offrir que cette précision (spécification GLSL ES 1.00, §4.5.2) ; `Math.fround` donne 32 bits et n'approche pas `mediump`.
  - Seuil : |r_Newton − r_référence| × 1080 **≤ 0,5 px** au maximum, dans les deux essais. Si la demi-précision échoue, forcer `highp` dans le shader quand il est disponible.
- **D-11 — Latence de la descente**, qui remplace le ratio d'images.
  - Mesure : avec carte graphique, 1440×900, défilement continu de 600 px en 2 s (§8.0).
  - Seuils :
    - `latences` (émission du message → image dessinée) : p95 **≤ 34 ms**, maximum **≤ 50 ms** ;
    - 100 ms après la fin du défilement, `derniereDescenteDessinee` = `descente()` du fil principal.
  - Origine : 34 ms = deux trames à 60 Hz ; 50 ms = seuil des tâches longues. L'ancien D-11 (≥ 0,9 × rAF) était inatteignable : plafond de 30 images/s (relief-fil.js:92) et 0,57 attendu au mieux [contre-expert F, `contre-gpu.json`].
- **D-12 — Pas de tâche longue** : `PerformanceObserver({type:'longtask'})` pendant D-11, **0 tâche > 50 ms**.
- **D-13** — remplacé par R-15.
- **D-14 — Redimensionnement.**
  - Mesure : à y = 300 en 1440×900, passer à 1000×800.
  - Seuils : `descente` = 0 dans les 300 ms. Retour en 1440×900 : `descente` = 1 dans les 300 ms, et R-16 passe.
  - Origine : `mesure-en-ligne.json` → `apres1000`.
- **D-15 — La descente se voit.**
  - Mesure : sans et avec carte graphique, 1440×900. Déplacement mesuré (appariement de blocs de 16 px sur l'image réduite) de la zone de l'œil et des nez de marche entre y = 0 et y = 0,30 h, animations au repos figées.
  - Seuil : ≥ 0,9 × la valeur du film retenu par Benj (annexe B).
  - Origine : [contre-expert E].
- **R-8 complet** : sans JavaScript, haut du plateau à y = 0 = 1170 ± 1 px ; opacité du pied à y = 225 = 0.

### 8.3 Performance et non-régression (les deux juges)

- **P-1 — Lighthouse mobile.**
  - Mesure : commande du §8.0, 5 passes, médiane.
  - Seuil : **≥ médiane de référence de 020-00 sur c62c866 − (maximum − minimum des 5 passes de référence)**, et jamais sous 90 (budget de sonde-lighthouse.mjs:28).
  - Origine : le « 97 » du message de e78b6c2 (« Lighthouse mobile médiane 97 ») n'a ni URL ni méthode ; il n'est donc pas repris comme seuil.
- **P-2 — Poids.** Croissance de `lestraque/styles.css` **≤ 1 000 octets en brotli 11**.
  - Origine : deux fois le bloc de l'ouverture (535 octets, `calculs.json`). Le bloc 1 de la première rédaction pesait +352 octets [contre-expert F, `contre-calculs.json` → `p2`].
- **P-3 — Juge du site.** `node scripts/site-qa.mjs public/sites-demo/lestraque` PASS. Un échec déjà présent sur c62c866 (relevé en 020-00) n'est pas imputé à l'exécutant.
- **P-4 — Bureau.**
  - Conditions : avec carte graphique, 1440×900, `deviceScaleFactor` 1 et 1,5, relief prêt, geste au repos actif ; 20 s au repos, puis pendant D-11.
  - Seuils :
    - `compte.dureeP95` ≤ 16,7 ms (une trame à 60 Hz) ;
    - 0 tâche longue ;
    - 95e centile des intervalles de `requestAnimationFrame` du fil principal ≤ 20 ms (choix du cahier : 16,7 ms plus une marge de 3,3 ms).
  - Si P-4 échoue à dpr 1,5 : `dmax15` = 0 dans da.json. Aucun repli à l'exécution.

## 9. Contrôle à l'œil

**Règles.**
- Images rangées dans `.orchestre/preuves/<tâche>/` : PNG pour le travail, planches en JPEG.
- Seules les planches JPEG sont recopiées dans ce qui est suivi par git (§11, 020-00).
- Planche « avant » : `cahier/avant/bureau-planche.jpg`.

| Nom | Tâche | Instant / défilement | Écran | Ce qu'on doit y voir |
|---|---|---|---|---|
| `film-<candidat>-1440.webm`, `-1088.webm` | 020-01 | 10 s au repos | 1440×900 et 1088×800, sans carte | Le héros vit de lui-même, sans clignoter. La lumière fait lire le fil du bois et les nez de marche. Rien sous le titre. |
| `grille-t06`, `-t25`, `-t50`, `-t80` | 020-01, 020-02 | y = 0 | 1088×800 sans carte | Quatre images visiblement différentes, comme la planche `presti/.orchestre/preuves/refs/planche-refs.jpg`. Aucun coin magenta ni noir plat. |
| `repos-gpu-t50` | 020-02 | Relief prêt + 3 s | 1440×900 avec carte | Grain du bois aussi net que `cahier/cdc3/avant-relief.png`, pas le moelleux de `cahier/cdc3/avec-relief.png` ; pas de lumière du shader qui déborde sur le haut du titre. |
| `communes-*` | 020-02 | y = 0 | 1440×900 | Identiques aux références de 020-00 : les cintres de bruz toujours là, contrairement à `cahier/contre/images/C-menuisier-bruz-avant-apres.jpg`. |
| `resize-coin` | 020-02 | Relevé du cas 3 de R-4 | 1440×900 | Aucune bande en bas à gauche, contrairement à `cahier/contre/images/resize-coin-t10500.jpg`. |
| `ecran-1024x768-y0` | 020-02 | y = 0 | 1024×768 | Pas de rotation ; cadrage d'aujourd'hui. |
| `reduit-y0`, `tel-y0` | 020-02 | y = 0 | Mouvement réduit ; 390×844 dpr 3 | Page d'aujourd'hui ; identique à `cahier/avant/tel-p000-y0.jpg`. |
| `descente-d116`, `-d066`, `-sansgpu` | 020-01 | Film du défilement de 0 à 0,30 h | 1440×900 | Pour Q2 : ce que Benj voit à δ 0,116, à δ 0,066 et sans WebGL. |
| `palier-y090`, `-y180`, `-y270` | 020-03 | y 90, 180, 270 | 1440×900 avec carte | L'image plonge vers le puits. Surtitre et bouton effacés sans fantôme (contrairement à `cahier/zoom/B-fantomes.png`). Titre immobile et lisible. « Devis » visible à 180 et 270. Bois au moins aussi net que `cahier/moment-B-y270.jpg`, jamais comme `cahier/zoom/D-bois.png`. |
| `palier-sansgpu-y240` | 020-03 | y 240 | 1280×800 sans carte | Zoom léger vers le puits ; palier non vide. |
| `plateau-y518`, `-y765`, `-y1170`, `apres-y1270` | 020-03 | y 518 à 1270 | 1440×900 | Plateau avec son ombre haute ; texte qui se lève ; aucune bande de photo sous la barre (contrairement à `cahier/zoom/F-couture.png`). |
| `reduit-y270`, `tel-y422` | 020-03 | y 270 ; y 422 | Mouvement réduit ; téléphone | Pas de palier ; identique à `cahier/avant/tel-p050-y422.jpg`. |

**Doit disparaître pour de bon :**
- la tache noire de `cahier/proto7-t068.jpg` ;
- le disque en dégradé de `cahier/tel6-t055.jpg` ;
- le bois « bavé » de `cahier/zoom/D-bois.png` ;
- le coin découvert de `cahier/contre/img/coins-1440x900--4deg_pousse1.png`.

## 10. Risques et ce qui n'est pas établi

1. **La cible C2 haute est peut-être hors d'atteinte pour un geste sobre** sur une photo. Aucune variante mesurée ne tient C2-b (§3.2, §3.3). D'où Q1, et Q5 si rien ne tient.
2. **La part > 8 ne classe pas les notes** : luxury-real-estate, noté C2 = 3, est à 0,779 (`cdc-refs-mouvement.json`). Le jugement de Benj reste la mesure.
3. **Capture de la grille non versionnée** (§0.3). Rejouer la grille sans figer la commande rendrait les notes incomparables.
4. **Contraste en 1366×768 déjà sous 3,0** (2,96 à 3,02, [contre-expert E]). Assombrir le dégradé pour le tenir peut coûter en matière perçue sous le titre.
5. **Coût du compositeur** : lumière en `mix-blend-mode` et rotation de la toile non mesurées en images par seconde. P-4 doit le dire.
6. **Mémoire graphique de la texture 2880** : environ 33 Mo avec mipmaps, par calcul (2880 × 2160 × 4 × 4/3). Non mesurée, faute de méthode fiable dans Playwright (§13, constats écartés). +745 293 octets téléchargés au bureau avec WebGL 2.
7. **Budget de grossissement** calculé sur 1440×900 seulement. À dpr 2, la toile est rendue à 1,5 puis agrandie par le navigateur : le flou y dépasse le calcul.
8. **Inversion de Newton non écrite en GLSL** ; comportement en `mediump` testé seulement par simulation (D-10).
9. **Cause de la perte de netteté du relief** (31 à 40 %) non isolée : la 2880 est une hypothèse de correction.
10. **Coût en retenue du palier** (+30svh avant le premier contenu) non jugé : Q2.
11. **Moteur graphique** : mesures avec carte graphique sur ANGLE Intel UHD / D3D11 seulement (`mesure-en-ligne.json`). Firefox non essayé.
12. **Relais de la barre** : entre y ≈ 180 et 225, le bouton du héros est encore faiblement visible (opacité < 0,2) en même temps que « Devis ». nav-retenue-qa passe, mais un œil peut voir deux appels sur 45 px.
13. **Les chiffres des contre-experts** sont repris de leurs JSON sans avoir été refaits dans cette relecture, sauf les bornes de couverture et le budget, recalculés [relecture] avec les mêmes résultats aux arrondis près.

## 11. Découpage en tâches

### Tâche 020-00 — Protocole et références (Claude Code)

- **Objectif** :
  1. **Figer le protocole de la grille** et le consigner dans decisions.md. Recommandation :
     - la démo est capturée en **1088×800 sans carte graphique**, par une commande versionnée (`scripts/demo-images-cles.mjs`, avec un viewport 1088×800 en option) ;
     - sa planche montre **quatre instants du héros** (t06, t25, t50, t80, déjà nommés à la l.29), comme les références (`refs-images-cles.mjs:1-3`) ;
     - C2, C6 et C7 sont rejoués sur ce protocole ; les autres critères gardent leurs notes du 15/09.
  2. **Mesurer les références « avant » sur c62c866** (§8.0) :
     - captures des pages communes et de l'accueil ;
     - écart toile/photo ;
     - contrastes par format ;
     - P-1 (5 passes) et P-3.
  3. **Recopier dans `presti/.orchestre/preuves/020-signature/`**, sans les PNG de travail :
     - `cahier-des-charges.md` et `params.json` ;
     - les JSON et scripts `cdc-*`, `calculs.json`, `titre.json`, `tel-grossissement.json`, `mesure-en-ligne.json`, `zoom/mesures-zoom.json`, `contre/*.mjs|json`, `relecture/*.mjs|json` ;
     - les images nommées au §9, converties en JPEG de qualité 85, moins de 5 Mo au total.
     - `du -sh cahier` donne 137 Mo et 88 PNG à la relecture. Le 14/09, 57 Mo d'originaux sont partis par erreur dans le commit 80472e8 (.gitignore:79). Le .gitignore ne couvre aujourd'hui que `017-*`, `*/photos/` et `refs/*.mp4` (.gitignore:71-86).
  4. **Avant la copie**, ajouter `.orchestre/preuves/020-*/**/*.png` au .gitignore. Réécrire les renvois `signature/…` vers la copie.
- **Périmètre** : `scripts/**`, `.orchestre/**`, `.gitignore`.
- **Interdit** : `public/sites-demo/**`.
- **Fini quand** : la décision est dans decisions.md, les références sont dans `.orchestre/preuves/020-00/`, la copie fait moins de 5 Mo et `git status` ne montre aucun PNG de 020.

### Tâche 020-01 — Prototypes et choix de Benj (Claude Code)

- **Dépend de 020-00.**
- **Objectif** :
  1. prototyper R, L1, L2 et RL (§3.5) par injection de CSS sur la page en ligne, dans le navigateur de test seulement ;
  2. mesurer C2-a, C2-b, C2-c, C6-a, R-4 (cas 1, 2 et 4) et R-12 ;
  3. filmer (§9) et envoyer à Benj les films, à côté des images-clés de stellar-launch et art-landing → **Q1** ;
  4. filmer la descente (δ 0,116, δ 0,066, sans WebGL ; injection du bloc 2 et d'un rendu hors ligne du modèle proto7 pour la perspective) → **Q2** ;
  5. écrire **l'annexe A** : bloc CSS exact du geste retenu, A, noms d'animations, `lumiereCss`, E_b, δmax recalculé, seuils de R-1, R-2 et R-11 si Benj retient plus sobre que la cible, date et mot de Benj ;
  6. écrire **l'annexe B** : décision sur la descente, δmax, roulis, seuil de D-15 ;
  7. écrire les deux juges du §8 ;
  8. vérifier qu'ils **échouent** sur c62c866 (R-1, R-2, R-5, R-11 attendus en échec ; en ligne, part > 8 = 0,072 et netteté 0,60 à 0,70).
- **Périmètre** : `scripts/**`, `.orchestre/**`.
- **Interdit** : `public/sites-demo/**`.

### Tâche 020-02 — Le geste au repos (exécutant)

- **Dépend de 020-01** (annexe A signée par Benj).
- **Objectif** : au bureau (≥ 1024 px, rapport ≥ 34/25, mouvement permis, JavaScript actif), le héros de l'accueil porte le geste de l'annexe A.
  - Coins couverts dans les deux sens ; pages communes inchangées.
  - Avec WebGL 2, texture 2880 avec mipmaps, délai de 3 s et `saveData`.
  - Shader calme (§3.6) ; `fin()` sûr ; `taille` avec `pos` et voile tourné.
- **Périmètre** : `public/sites-demo/_kit/kit.css`, `_kit/relief.js`, `_kit/relief-fil.js`, `_kit/da.json`, `public/sites-demo/generer.mjs`, `public/sites-demo/lestraque/**`, `.orchestre/preuves/020-02/**`.
- **À faire** : §3.5 à §3.7 ; §5 (sauf descente) ; §7.0 ; §7.1, §7.2, §7.4 et §7.5 (parties 020-02) ; §7.3 blocs 1 et 1 bis.
- **Interdit** :
  - `scripts/**`, `app/**`, `lib/**`, `public/promo/**` ;
  - les dossiers des neuf autres démos (liste de `.orchestre/fait/019-02.md:6`) ;
  - `.orchestre/decisions.md`, `.orchestre/verdicts.jsonl` ;
  - toute règle de défilement (palier, fondus, descente) ;
  - tout sélecteur du geste qui ne commence pas par `.ouverture>` ou `.da--signature .ouverture`.
- **Vérificateur** : `node scripts/signature-repos-qa.mjs` (R-1 à R-16, P-1 à P-4, `nav-retenue-qa.mjs`). Images `grille-*`, `repos-gpu-t50`, `communes-*`, `resize-coin`, `ecran-1024x768-y0`, `reduit-y0` et `tel-y0`.
- **Budget indicatif** : 5 fichiers de kit et générateur, 45 minutes.

### Tâche 020-03 — La descente (exécutant ; seulement si Q2 = garder)

- **Dépend de 020-02** (PASS, et images regardées par Claude Code) et de l'annexe B.
- **Objectif** : palier de 30svh, zoom 1 → 1,04 vers l'œil, fondus sur 25svh, titre immobile, chorégraphie décalée. Avec WebGL 2 et la 2880 : δ jusqu'à δmax, ρ selon l'annexe B. Worker synchronisé, latence tenue.
- **Périmètre** : les mêmes fichiers que 020-02, et `.orchestre/preuves/020-03/**`.
- **À faire** : §2 ; §5 (descente) ; §7.1, §7.2, §7.4 et §7.5 (parties 020-03) ; §7.3 bloc 2.
- **Interdit** : les mêmes que 020-02, sauf les règles de défilement, plus toute modification du geste au repos.
- **Vérificateur** : `node scripts/signature-defile-qa.mjs` (D-1 à D-15, R-4 à y = 0,30 h, R-6, R-8 complet, P-1 à P-4, `nav-retenue-qa.mjs`).
- **Budget indicatif** : 5 fichiers, 45 minutes.

### Tâche 020-04 — Vidéo, grille et jugement final (Claude Code)

- **Dépend de 020-02**, et de 020-03 si elle a lieu.
- **Objectif** :
  1. si le palier existe, adapter le plan `heros_souris` de `scripts/demo-video.mjs:245-257` ;
  2. rejouer la vidéo et `node scripts/video-qa.mjs --profil=landing` ;
  3. rejouer la grille à l'aveugle sur C2, C6 et C7 avec le protocole de 020-00 ;
  4. regarder les planches du §9 ;
  5. montrer le résultat à Benj, dont la réaction reste la mesure finale.
- **Périmètre** : `scripts/**`, `.orchestre/**`, `plans/**`.
- **Interdit** : `public/sites-demo/**`.
- **Fini quand** : video-qa PASS ; grille rejouée et consignée ; avis de Benj consigné.

## 12. Questions ouvertes pour le propriétaire (Benj)

Elles se posent en 020-01, sur film ; chaque réponse est consignée avec sa date dans l'annexe A ou B, et dans decisions.md.

- **Q1 — Quel geste au repos ?** Parmi les films R (la cage tourne), L1 (projecteur tournant), L2 (lumière rasante) et RL (rotation et lumière), vus à côté de stellar-launch et art-landing. Si le geste qui te plaît reste sous la cible haute (C2-a ≥ 0,56, C2-b), le garde-t-on quand même ? Ta réaction prime, l'écart est alors écrit dans l'annexe A.
- **Q2 — La descente au défilement : garder, amplifier ou supprimer ?** Films à δ 0,116, à δ 0,066 (écrans à dpr 1,5) et sans WebGL (zoom de 4 % seulement). Elle ajoute 30svh de défilement avant le premier contenu, la grille ne la voit jamais, et elle oblige à refaire le plan « héros » de la vidéo de la landing.
- **Q3 — Le roulis :** si la cage tourne déjà au repos, le cahier le coupe pendant la descente pour n'avoir qu'un geste à la fois. Le veux-tu malgré tout ?
- **Q4 — Le téléphone :** rien n'y change dans ce chantier. Ouvre-t-on une tâche séparée pour un geste mobile en CSS pur, gardé par la même médiane Lighthouse ?
- **Q5 — Et si aucun geste sur la photo n'atteint le haut de MotionSites / PromptedSite ?** S'arrête-t-on au meilleur geste photo, ou accepte-t-on le temps (et éventuellement l'achat d'un modèle) d'une vraie scène 3D de l'escalier ?

## 13. Suivi des constats des deux contre-experts

**F** = contre-expert faisabilité (4 bloquants, 9 importants, 8 mineurs). **E** = contre-expert exigence (3 bloquants, 5 importants, 2 mineurs).

| # | Gravité | Constat (résumé) | Vérifié dans les fichiers | Traitement | Où |
|---|---|---|---|---|---|
| F1 | bloquant | Le vérificateur de 020-01 exigeait R-8 / R-9, qui dépendaient de règles de défilement interdites à la tâche | Oui (ancien §11 ; ancien R-8, R-9) | Corrigé : critères séparés par juge ; R-8 réduit au repos ; R-8 complet dans 020-03 | §8.1, §8.2 |
| F2 | bloquant | Le bloc 1 recadrait et faisait tourner les héros des 4 pages communes | Oui : generer.mjs:385 (classe sur toutes les pages), :684 (`hero--plein` sur les communes), kit.css:429 battu en spécificité | Corrigé : portée `.ouverture>` (accueil seulement, generer.mjs:646) ; R-10 | §5, §6, §7.3, R-10 |
| F3 | bloquant | Couverture des coins dépendante d'une phase ; « sens indifférent » faux ; redimensionnement découvre un coin | Oui ; recalculé : 1,0646 requis à −4° [relecture] | Corrigé : E_b = 1,07 couvrant les deux sens ; R-4 sur 40 s, déphasage forcé, redimensionnement réel, barres visibles | §3.5, §6, R-4 |
| F4 | bloquant | D-11 (≥ 0,9 × rAF) hors d'atteinte | Oui : plafond relief-fil.js:92 ; protocole molette de `contre-gpu.json` | Corrigé : critère de latence, défilement continu | §6, §7.5, D-11 |
| F5 | important | D-6 : le 2e onglet ne cache pas la page en headless | Mesure F (`D_ongletCache_headless`) | Corrigé : simulation de `hidden` avec témoin | §8.0, D-6 |
| F6 | important | P-1 non exécutable, vise la production | Oui : sonde-lighthouse.mjs:13, 16-24 ; message de e78b6c2 | Corrigé : commande locale, 5 passes, référence mesurée sur c62c866 | §8.0, P-1, 020-00 |
| F7 | important | `site-qa.mjs` sans argument sort en erreur ; état actuel inconnu ; verrou partagé | Oui : site-qa.mjs:646-649 | Corrigé : chemin donné, référence en 020-00, séquencement | §8.0, P-3 |
| F8 | important | R-1 / R-2 / R-3 / R-5 contournables | Oui (définitions des anciens critères) | Corrigé : R-3 nature du geste et recalage ; R-5 borne haute et comparaison toile/photo ; C2-c anti-clignotement | R-2, R-3, R-5 |
| F9 | important | `pos` jamais renvoyé : toile décalée après un redimensionnement | Oui : relief.js:26, 86 ; relief-fil.js:186 | Corrigé : `taille` renvoie `pos` ; R-16 | §5, §7.4, §7.5, R-16 |
| F10 | important | Contexte perdu pendant le fondu : héros sans photo | Oui : relief.js:48 (`once`, `isConnected`), l.49 | Corrigé : garde `fini`, `fin()` réécrit ; R-15 à +100 ms | §5, §7.4, R-15 |
| F11 | important | D-8 circulaire ; `../params.json` introuvable après copie | Oui : cdc-delta-final.mjs:4, 9-11 ; params.json absent de cahier/ | Corrigé : calcul pour le dmax lu ; params.json copié dans `cahier/` (md5 identique) | D-8, §11 |
| F12 | important | La décision sur la planche de la grille venait après l'implémentation | Oui (ancien 020-03, point 3) | Corrigé : 020-00 d'abord | §11 |
| F13 | important | Copie de 80 Mo dans un dossier suivi ; renvois hors de cahier/ | Oui : `du -sh cahier` = 137 Mo à la relecture, 88 PNG ; .gitignore:71-86 | Corrigé : liste restreinte, JPEG, entrée .gitignore avant copie | §11 (020-00) |
| F14 | mineur | Chiffres de la variante « retenue » pas ceux du CSS prescrit | Oui : cdc-c2-variantes.mjs:35-39 (pas d'E_b, média 4/3) | Corrigé : valeurs de `contre-navigateur-B.json` | §3.2 |
| F15 | mineur | Heures incompatibles avec le commit cité | Oui : c62c866 à 09:50:35 ; JSON à 07:17Z-07:58Z | Corrigé : en-tête et §0.1 | En-tête, §0.1 |
| F16 | mineur | « 75vw » : risque présenté comme non mesuré | Mesure F (`E_barreDefilement_1440x900`) | Corrigé : valeurs et essai avec barres visibles | §5, §7.3, R-4 |
| F17 | mineur | Méthode WebGL 1 absente | Oui : relief-fil.js:115 | Corrigé : `--disable-webgl2` avec témoin, ou branche déclarée non testée | §8.0, D-7 |
| F18 | mineur | Grille de D-10 hors du domaine réel | Oui : toile 1440×1080 | Corrigé : grille 1440×1080 ; simulation de demi-précision (voir « Constats écartés », point 3) | D-10 |
| F19 | mineur | Limite de lumière du shader basculée par la rotation | Oui : relief-fil.js:46, relief.js:32 ; calcul E | Corrigé : voile calculé sur le h1 tourné | §6, §7.4, R-13 |
| F20 | mineur | Pas de délai pour la texture 2880 | Oui : relief-fil.js:146 | Corrigé : 3 s, `saveData`, R-14 | §3.7, §5, R-14 |
| F21 | mineur | `v` non défini ; précondition sans suite | Oui : relief.js:76 ; ancien §7 | Corrigé : `defileV()` ; arrêt avec question | §7.0, §7.4 |
| E1 | bloquant | La rotation ne joue pas au format noté (1088×800) ; une seule image du héros ; ancien « 1280×800 (conditions de la grille) » faux | Oui : decisions.md:49 ; image regardée [relecture] ; grille-aveugle.mjs:77 ; demo-images-cles.mjs:26 | Corrigé : protocole figé en 020-00 ; geste exigé en 1088×800 (A = 2,25° pour R) ; 1088×800 dans R-1, R-4, R-11, R-12 | §0.3, §3.5, §11 |
| E2 | bloquant | Rotation « figée » pour video-qa et sous les références ; seuils calés sur la proposition | Mesures E et F ; video-qa.mjs:26-30 | Corrigé : cible haute C2-a / C2-b / C2-c ; prototypes filmés et choix de Benj avant tout exécutant | §3.2, §3.3, §3.5, 020-01, Q1 |
| E3 | bloquant | Aucun gain C6 visible là où C6 a été noté | Oui : capture sans relief ; 2880 réservée au chemin WebGL | Corrigé : objectif C6 sans WebGL (lumière), C6-a, planche comparée ; 2880 reclassée en correctif WebGL | §3.4, §3.5, §3.7, R-11 |
| E4 | important | « Un seul geste » faux avec le relief ; deux moments | Oui : relief-fil.js:98-104, kit.css:322-323 | Corrigé : hiérarchie (§3.6), shader calme, pas de roulis cumulé ; notation de C7 par vidéo écartée pour la grille (voir « Constats écartés », point 1) | §1, §2, §3.6, R-13, Q3 |
| E5 | important | Contraste mesuré à trois instants ; sous 3,0 en 1366×768 | Mesure E (`extremes`) | Corrigé : R-12 et D-5 sur le cycle et cinq formats ; seul l'assombrissement du dégradé est permis | §6, §7.3, R-12, D-5 |
| E6 | important | Coins : 1,065 requis à −4° ; phase jamais écrite | Recalculé [relecture] | Corrigé comme F3 (E_b = 1,07 plutôt que 1,066, voir la ligne F3) | §3.5 |
| E7 | important | Descente diluée (grille aveugle, 4 % sans WebGL, 27 % de la course à dpr 1,5) | Oui (§5, §6 de l'ancienne version ; `grille-format.json`) | Transformé en question : films puis Q2 ; D-15 de perceptibilité | §2, Q2, D-15 |
| E8 | important | Aucun critère de performance au bureau | Oui (ancien P-1 mobile) | Corrigé : P-4 ; plafond de 60 images/s ; repli `dmax15` = 0 | §6, P-4 |
| E9 | mineur | Voile du shader sous le h1 tourné | Oui (comme F19) | Corrigé comme F19 | §7.4 |
| E10 | mineur | Téléphone : rien ne change, sans que ce soit dit | Oui : ancien §4 | Corrigé au §1 et §4 ; tâche mobile en question | §1, §4, Q4 |

### Constats écartés

Aucun constat bloquant ou important n'est écarté en entier. Les parties suivantes le sont, avec leur raison :

1. **E4, « Faire noter C7 sur une vidéo, pas sur des images fixes »** : écarté pour la grille. Les références y sont notées sur quatre images fixes (`refs-images-cles.mjs:1-3`) ; noter la seule démo sur vidéo romprait la comparaison qui fonde les barres du 3e quartile. Le moment est jugé en mouvement par Benj, sur film (020-01, Q1 à Q3).
2. **E8, « mémoire graphique relevée »** : écarté comme critère bloquant. Ce cahier n'identifie aucune méthode fiable pour lire, dans Playwright, la mémoire d'un contexte WebGL tenu par un worker. La valeur calculée (≈ 33 Mo) reste un risque (§10.6). Si 020-01 trouve une méthode, l'ajouter à P-4.
3. **F18, « essai en simple précision (`Math.fround`) pour approcher `mediump` »** : écarté dans sa méthode. `Math.fround` arrondit à 32 bits, la précision de `highp` sur un bureau, alors que `mediump` peut n'offrir que la demi-précision (spécification GLSL ES 1.00, §4.5.2). Remplacé par une simulation sur 16 bits (D-10). Le reste du constat (grille 1440×1080) est corrigé.
4. **F3, option (a) « une seule animation `signature-repos` portant `scale` et `rotate` »** : non retenue. L'option (b), une échelle couvrant les deux sens, ne dépend d'aucune synchronisation : entre deux animations, entre photo et toile, ou après un redimensionnement. Coût : netteté de 1,021 au lieu de 0,997 pixel d'image par pixel d'écran [relecture]. La valeur de E demandée, 1,066, est portée à 1,07 : 1,066 ne laisse que 0,75 à 1,12 px au pire coin à 16:10 [relecture, `bornes-et-budget.json`].
5. **F4, variante « ratio rapporté au nombre de changements de scrollY »** : non retenue au profit de la variante latence du même constat, qui mesure ce que voit le visiteur (le retard) et non un décompte dépendant du navigateur de test.
6. **F8, « écart moyen ≤ un seuil mesuré sur c62c866 relief coupé »** : reformulé. Relief coupé, il n'y a pas de toile à comparer : la référence est l'écart toile/photo relief prêt sur c62c866 (R-5, 020-00).

## Annexes à produire en 020-01

- **Annexe A — le geste au repos retenu** : bloc CSS exact (portée, conditions, noms d'animations, A par format, `--signature-a`), `lumiereCss`, E_b, δmax recalculé par `relecture/bornes-et-budget.mjs`, seuils de R-1 / R-2 / R-11 et leur origine, lien des films, date et réponse de Benj à Q1.
- **Annexe B — la descente** : réponse de Benj à Q2 et Q3, δmax (dpr 1 et 1,5), `roulisParDelta`, seuil de D-15, lien des films.
