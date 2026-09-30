# Vidéo de héros (« hero vidéo ») : références, sources à 0 €, place dans la démo

Recherche 021-00, 15/09/2026 vers 13 h 20. Aucun fichier du site touché. Les aperçus MotionSites sont dans `.orchestre/travail/motionsites-apercus/` (ignoré par git). Les essais d'encodage et le rendu Blender sont dans le scratchpad de la session (chemins au §6). Aucun prompt MotionSites ouvert (`get_prompt` jamais appelé).

## 0. En bref

1. **Pas de vidéo dans le héros de l'accueil au bureau.** Les trois gestes que Benj garde agissent sur la photo fixe : RL (rotation et lumière), descente et relief WebGL, dont la carte de profondeur est calculée depuis cette photo. Une vidéo à la place de la photo casse les trois (§3.1).
2. **Deux emplacements utiles** :
   - **A. Le héros au téléphone**, où rien ne bouge aujourd'hui (cahier:351-353). C'est une réponse possible à Q4. Un plan en portrait de 5 s au plus, joué une fois puis figé sur sa dernière image. L'affiche est l'AVIF portrait déjà préchargée : 0 octet de plus.
   - **B. La scène plein cadre « Dans l'atelier »** (generer.mjs:500), avec de vrais gestes (rabot, copeaux), chargée seulement à l'approche.
3. **Sources** :
   - pour A : un plan fabriqué à partir de la photo du héros et du geste réel filmé ;
   - pour B : des rushes libres « mains seules », à visionner avant tout choix (aucun n'a été regardé ici) ;
   - la 3D Blender sert mieux l'objet décomposé (vue éclatée) que la vidéo de héros.
4. **Poids mesurés** (essais sur les photos de la démo, §2.3) :

| Plan d'essai | AV1 | H.264 |
|---|---|---|
| 6 s en 720×1280 | 187 281 o | 290 622 o |
| 8 s en 1280×720, atelier | 109 208 o | 279 023 o |

   Pour comparer : la page d'accueil pèse aujourd'hui 352 046 octets au Lighthouse mobile (`017-vague-3/final/lighthouse/accueil-2.report.json:2533`).

---

## 1. Références (MotionSites en priorité)

### 1.1 Méthode

- **Recherche** avec le connecteur MotionSites (`search_prompts` et `get_related_prompts`, métadonnées seulement). Requêtes : « fullscreen background video hero with text overlay », « craftsman woodworking architecture interior cinematic video hero warm tones », « looping cinematic video background dark overlay serif headline luxury minimal », et les prompts voisins de visual-hero et de luxury-hero.
- **Aperçus publics téléchargés** : WebP animés sur `pub-86dc5b5484314368ac5436a674b0d919.r2.dev`, flux HLS Mux copiés à 720p avec ffmpeg.
- **Ce que j'ai mesuré** :
  - dimensions, durée, débit et poids (ffprobe, sharp) ;
  - planche de 8 images par aperçu, **toutes ouvertes et regardées** (`travail/motionsites-apercus/images/*-planche.jpg`) ;
  - écart moyen entre images successives : |a−b|/255 sur une réduction grise de 160 px de large, comme scripts/video-qa.mjs. Script `travail/motionsites-apercus/ecarts.mjs`, résultats dans `ecarts.json`.
- **Limite importante.** Un aperçu est un enregistrement de 5 à 9 s de la page générée, pas le fichier vidéo du site. Poids, format, affiche, durée de boucle réelle, comportement au téléphone et en mouvement réduit **ne sont pas observables** sans ouvrir le prompt, et c'est Benj qui décide de cette ouverture.
- **Écarts mesurés sur les aperçus** : à 15 images/s sur environ 5 s. Ils ne sont pas directement comparables au C2-b du cahier (8 images/s sur 10 s, cahier:265).

### 1.2 Les six références retenues

| id (accès) | Ce que montre la vidéo (vu sur la planche) | Aperçu : durée, rythme | Cadrage | Lisibilité du texte (vu) |
|---|---|---|---|---|
| **luxury-hero** (premium, Hero) | Villa blanche à flanc de falaise au couchant, cascade, bougainvilliers. La caméra avance comme un drone, passe sous les arches et entre dans le salon (luminaire en osier). | WebP 640×472, 75 images, 4 999 ms, 2 842 722 o. Écart moyen **0,069**. 28 intervalles > 0,08 après 2,5 s : **travelling rapide**. Première/dernière image : 0,211, la boucle ne se referme pas dans l'aperçu. | Plein cadre ; titre centré au tiers bas | Titre serif en capitales blanches, sans voile visible. Lisible sur la mer et les rochers sombres, **nettement moins** sur les murs beiges des deux dernières images. |
| **unwind-hero** (premium, Hero) | Chalet en bois dans la brume entre des sapins, fenêtres éclairées en orange. Caméra presque fixe qui avance lentement : le chalet grandit d'une image à l'autre. | WebP 640×466, 75 images, 4 999 ms, 1 673 622 o. Écart moyen **0,0046**, max 0,0067 : **ambiance très calme**, du même ordre que la rotation R (0,005, cahier:271). | Plein cadre ; sujet au centre bas | Grand titre sans-serif blanc en haut à gauche, sur une brume uniforme. La 2e ligne est en gris clair. Carte de réservation en verre dépoli à droite. |
| **speakup-venture-hero** (premium, Hero) | Colline d'herbe sur fond blanc : une pousse grandit et des fleurs apparaissent. | HLS Mux : 992×720 à 5 689 kbit/s maximum annoncés dans le manifeste. Copie 720p : 5,24 s, 1 187 595 o. Écart moyen **0,0039**, un seul saut à 0,074. | Sujet en diagonale à droite ; le **vide à gauche est composé dans la vidéo** | Titre serif vert foncé sur la zone blanche de l'image : aucun voile nécessaire. |
| **visual-hero** (free, Hero) | Rocher couvert de mousse, cristaux et fleurs roses sur fond noir. Les fleurs se referment en boutons. | HLS : renditions de 498×360 à 2026×1464 (736 à 8 341 kbit/s, manifeste). Copie 720p : 6,93 s, 1 944 338 o. Écart moyen **0,0061**. Première/dernière image : 0,099. | Objet centré ; coins vert sombre flous | Titre italique serif géant blanc **par-dessus** le haut de l'objet. Le fond noir garantit le contraste, sauf là où les lettres croisent les fleurs. |
| **cinematic-brand** (premium, Hero) | Anneau de plasma bleu et rouge qui ondule sur un ciel étoilé noir. | WebP 640×472, 75 images, 4 999 ms, 2 455 484 o. Écart moyen **0,024**, un saut à 0,081 vers 2,13 s. Noté C2 = 5 à la grille du 14/09 (`refs/grille.json:8`). | Anneau plein cadre, centre vide | Texte blanc centré **dans le noir** au centre de l'anneau. |
| **ember-dsgn-hero** (premium, Hero Section) | Rocher noir en 3D qui se fend et révèle une matière rouge vitreuse (un objet qui se transforme). | WebP 640×464, 74 images, 4 933 ms, 1 479 644 o. Écart moyen **0,0077**. Première/dernière image : 0,136. | Mise en page scindée : objet net à droite, copie floutée de la vidéo en fond du panneau gauche | Texte gris sur le panneau flou clair. « STUDIO » en noir géant sous l'objet. |

**Vues aussi, non retenues :**
- **luxury-focus** (premium, E-commerce) : film de mode (tailleur, gros plans sur une boucle d'oreille et une bague). L'aperçu enchaîne des coupes, du défilement et des fiches produit : écart moyen 0,053, 17 intervalles > 0,08 ; 982×720, 5,88 s, 1 675 557 o. Le titre, en serif jaune-vert et blanc, reste lisible à gauche sur une ombre.
- **no-code-waitlist** (free, Waitlist) : rubans de verre violets abstraits, écart moyen 0,0048, 9,37 s. Le titre fin blanc **perd du contraste** sur les zones violet clair (images 1 et 5 de la planche).
- **Wealth Video Hero** (id 0) et **aethera-hero** : aucun aperçu public.

### 1.3 Ce que les références enseignent

- **La vidéo porte la composition.** Chez speakup, unwind, cinematic-brand et visual-hero, la place du texte est **vide dans l'image même** (fond blanc, brume, centre noir, fond noir), plutôt que couverte d'un voile. luxury-hero montre l'échec inverse : quand la caméra entre dans des murs clairs, le titre blanc faiblit.
- **Deux régimes de mouvement** :
  - l'ambiance lente (écart de 0,004 à 0,008 par image : unwind, speakup, visual-hero, ember, no-code-waitlist) ;
  - le travelling (0,069 : luxury-hero).
  RL appartient au premier régime, la descente au second. Dans la démo, le travelling est déjà piloté par le défilement.
- **Des plans courts.** Tous les aperçus durent entre 5 et 9 s. La durée des boucles réelles n'est pas mesurable.
- **Sujets** : aucun atelier, aucun artisan, aucun bois travaillé dans les résultats. Le plus proche d'un « menuisier » est unwind-hero (un chalet en bois), et le plus proche de la descente est luxury-hero (entrer dans une architecture).

---

## 2. D'où viendrait la vidéo, à 0 € et sous licence compatible

### 2.1 Banques de vidéos libres (licences lues sur leurs pages le 15/09 via WebFetch)

| Banque | Licence : citations relevées | Crédit | Plans pertinents trouvés (**titres seulement, aucun visionné**) |
|---|---|---|---|
| **Pexels** ([licence](https://www.pexels.com/license/), [conditions](https://www.pexels.com/terms-of-service/)) | « All photos and videos on Pexels are free to use. » ; « Attribution is not required. » ; « You can modify the photos and videos ». Interdits : « Don't imply endorsement of your product by people or brands on the imagery. » ; « Don't redistribute or sell the photos and videos on other stock photo or wallpaper platforms. ». Conditions : « We do not warrant that any consents or licenses have been obtained in relation to any Content » ; « You cannot use Content in a misleading or deceptive way...by suggesting that any depicted person [...] is affiliated with you ». | Non requis | [Recherche « carpenter workshop »](https://www.pexels.com/search/videos/carpenter%20workshop/) : 35170034 « Master craftsman working with electric planer », 35323766 « Woodworker polishing timber in workshop », 6790700 « Carpenter at the workshop ». [Recherche « spiral staircase wood »](https://www.pexels.com/search/videos/spiral%20staircase%20wood/) : 34394964 « Spiral staircase descent with wooden detail » (page vidéo en 403 à la lecture). |
| **Pixabay** ([licence](https://pixabay.com/service/license-summary/)) | « Use Content without having to attribute the author » ; « Modify or adapt Content into new works ». Interdits : distribution « on a Standalone basis » ; « If Content contains any recognisable trademarks, logos or brands, you cannot use that Content for commercial purposes » ; « You cannot use Content in a misleading or deceptive way. » | Non requis | [Recherche « woodworking »](https://pixabay.com/videos/search/woodworking/) : 166807 « Carpenter, Construction, Work, Planer » (AndyWolares ; [page](https://pixabay.com/videos/carpenter-construction-work-planer-166807/) : 8 s, 1920×1080, 25 images/s, rabot en gros plan avec les mains selon la page), 91377 « Timber, Wood, Woodworking, Workshop » (14 s), 343063 « Craftsman, Workshop, Tools » (8 s). Des vidéos y sont déposées par « Coverr-Free-Footage » : licence à vérifier à la source. |
| **Coverr** ([licence](https://coverr.co/license)) | « You may use Coverr.co's videos and music for both commercial and non-commercial purposes at no cost. » ; « You are not required to add an attribution credit ». Interdits : un service concurrent, l'entraînement d'IA. Marques : « may require separate permission ». | Non requis | [Recherche « carpenter »](https://coverr.co/s?q=carpenter) : surtout des outils électriques (scie à onglet, visseuse) ; « Filing down wood », « Sawing a plank of wood ». |
| **Mixkit** ([licence](https://mixkit.co/license/), texte non rendu à la lecture ; [page d'information](https://mixkit.co/llm-info/)) | Deux licences selon l'élément : Free (« No attribution required », usage commercial permis) et **Restricted** (« Only allows use in personal, non-commercial projects »). Il faut vérifier **clip par clip**. | Non requis (Free) | [Catégorie « wood »](https://mixkit.co/free-stock-video/wood/) : forêts, feux ; un seul plan de matière (« Detailed tour of the surface of a wooden board »). Aucun atelier. |
| **Wikimedia Commons** (API publique, [requête](https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=woodworking%20filetype:video&srnamespace=6)) | Licence propre à chaque fichier, lue dans les métadonnées. | Selon la licence | « Mondial des Métiers 2020 - atelier de menuiserie.webm » : **CC0**, Benoît Prieur, 1920×1080, 11,13 s, 16 242 045 o. « Lathe in Finland.webm » : **CC0**, Vikebe, 1080×1920, 18,03 s, tour à bois au musée de Luostarinmäki. « Video of making of log furniture… » : CC BY-SA 4.0, 176 s. Aucune vidéo pour « spiral staircase wood » (0 résultat). |

**Qualité attendue.** Inconnue tant que rien n'est visionné. Les pages annoncent du 1080p, parfois du 4K. Les recherches montrent surtout des **outils électriques et des scies** : c'est loin de l'image « main, rabot, copeaux » du reste de la démo. **Aucun escalier hélicoïdal en bois** filmé en atelier n'a été trouvé.

### 2.2 Le risque propre à cette voie : un artisan fictif sur les images d'un vrai atelier

- **Le problème.** Pexels et Pixabay interdisent l'usage « misleading or deceptive ». Pexels vise nommément le fait de suggérer qu'une personne filmée « is affiliated with you », et ne garantit aucune autorisation des personnes filmées.
- **Ce qui existe déjà.** La démo montre déjà des photos Commons de vrais ouvrages sous le nom Lestraque, créditées (attributions.json). Le formulaire dit « Démonstration : rien n'est envoyé » et l'adresse est « 1 rue de la Démonstration » (lestraque/index.html). Mais une **personne** filmée va plus loin qu'un ouvrage photographié.
- **Parade proposée** :
  - **mains seules**, aucun visage, aucun logo, aucun lieu reconnaissable ;
  - sources CC0 d'auteur connu en priorité ;
  - une ligne de crédits « images d'illustration ».
- **À trancher par Benj** (§5).

### 2.3 Une vidéo fabriquée à partir des photos déjà licenciées (mesurée)

**Licences en jeu** (attributions.json) :
- héros `heros-escalier` : **CC BY-SA 4.0**, Petar Milošević ;
- atelier, penderie, cuisines, bibliothèque, tournage : **CC BY 2.0** ;
- `boiserie` et `mains-noyer` : **CC0**.

**Conséquences :**
- Une vidéo tirée du héros est une adaptation. Elle reste sous **CC BY-SA 4.0**, avec auteur, lien et mention de la modification : c'est compatible avec un site commercial.
- Mais `attributions.json:37` dit aujourd'hui « site uniquement — CC BY-SA : jamais dans un film ». decisions.md:48 a levé cette règle pour la vidéo de la landing (« la photo est bien »). Il faudra étendre explicitement la levée à une vidéo **dans** le site et corriger ce champ.
- Photos CC BY 2.0 : adaptation libre avec crédit, sans partage à l'identique.

**Essai mesuré** (ffmpeg 8.1.1, scratchpad `video-essais/`) :
- geste : poussée lente `zoompan` de 1,00 à 1,08 en 8 s vers l'œil de la spirale (0,404 ; 0,386 : da.json:8), 24 images/s, sans son ;
- H.264 : libx264 `-preset slow -crf 26 -tune film`, faststart ;
- AV1 : libsvtav1 `-preset 5 -crf 38`, réencodé depuis le H.264 (un encodage direct depuis les PNG n'a pas été essayé).

| Essai | Définition, durée | H.264 | AV1 | Débit H.264 / AV1 |
|---|---|---|---|---|
| Escalier (héros 2880, étalonné) | 1920×1080, 8 s | 1 190 283 o | 650 092 o | 1 190 / 650 kbit/s |
| Escalier | 1280×720, 8 s | 596 020 o | 329 164 o | 596 / 329 kbit/s |
| Atelier (ponçage 2880) | 1280×720, 8 s | 279 023 o | 109 208 o | 279 / 109 kbit/s |
| Escalier portrait (1440×1800 recadré en 9:16), téléphone | 720×1280, 6 s (zoom 1,00 → 1,06, CRF 27 / 40) | 290 622 o | 187 281 o | 387 / 250 kbit/s |
| Affiche : 1re image en AVIF q50 (sharp) | 1920 px / 1280 px | 123 606 o / 60 289 o | | |

- **Ce que montrent les planches** (`planche-escalier-1080.jpg`, `planche-escalier-tel.jpg`, ouvertes) : le veinage tient en 1080p, mais le mouvement se réduit à un zoom, **ce que la « poussée » CSS fait déjà en direct** (kit.css:322, 20 s).
- **Niveaux mesurés par ffprobe** : H.264 High niveau 5.0 en 1080p (libx264 l'a choisi seul ; forcer `-level 4.0`), High 3.1 en 720×1280 ; AV1 Main, `level=8` en 1080p et `level=5` en 720×1280.
- **Pourquoi le poids de l'escalier** : ses marches à fort contraste compressent 2 à 3 fois moins bien que l'atelier, à définition égale.
- **Qualité attendue** : une vidéo tirée d'une photo n'a de valeur que si elle contient ce que le CSS ne sait pas faire. La meilleure version est **le geste réel de la démo (RL + descente + relief) filmé avec carte graphique**, comme `demo-video.mjs` lance déjà Chromium (`--use-gl=angle`, cahier:618), recadré en 9:16. Le téléphone aurait ainsi le même geste que le bureau, pour 0 octet de WebGL.
- **Risque** : faible sur les droits (les crédits existent). Il y a une redondance au bureau, d'où l'usage réservé au téléphone (§3.2 A).

### 2.4 Une vidéo rendue d'une scène 3D (mesurée)

- **Outil et licences** :
  - Blender **5.2.1 LTS** installé (`blender.exe --version`, build du 2026-08-25). Licence GPL du logiciel. D'après la recherche web sur blender.org ([licence](https://www.blender.org/about/license/), [manuel](https://docs.blender.org/manual/en/latest/getting_started/about/license.html) ; lecture directe refusée en 403), les images et films produits appartiennent à l'utilisateur, la GPL ne s'y applique pas.
  - Textures et éclairages Poly Haven ([licence](https://polyhaven.com/license)) : « You can use our assets for any purpose, including commercial work. » et « You do not need to give credit ».
  - Aucune personne et aucun lieu réels : **zéro risque de tromperie**.
- **Essai** (`video-essais/escalier3d.py`, rendu en ligne de commande) :
  - scène : 40 marches en boîtes, un noyau cylindrique, un soleil, un fond uni, une texture procédurale « wave » ;
  - EEVEE, 1280×720, 32 échantillons ;
  - **3,44 s pour la 1re image, 2,34 s pour la 2e** sur ce PC. Un premier essai, caméra tournée à l'envers, a donné une image grise et a été écarté.
- **Ce que montre l'image** (`blender-essai2.png`, ouverte) : marches vues d'en dessous, à plat, sans ombre lisible, rayures en zigzag au lieu d'un veinage. On dirait un schéma. La chaîne fonctionne ; **la qualité, elle, dépend entièrement du modelage, des matières et de la lumière**, non mesurés ici.
- **Calcul** : 192 images (8 s à 24 images/s) × 2,34 s ≈ 7,5 min pour cette scène triviale. Une scène réaliste reste à mesurer.
- **Risque** : l'aspect « image de synthèse » à côté de vraies photos, et un chantier long.
- **Atout** : la géométrie exacte d'un escalier. C'est la matière naturelle de l'**objet décomposé** (marches, limon, noyau qui s'écartent), l'autre famille demandée par Benj.

### 2.5 Verdict par voie

| Voie | Licence | Crédit | Qualité attendue | Risque | Usage conseillé |
|---|---|---|---|---|---|
| Banques libres | Pexels, Pixabay, Coverr : libres et commerciales ; Mixkit Free seulement | Aucun requis, mais à mettre | Inconnue (rien visionné) ; surtout des outils électriques | Personne réelle présentée comme l'artisan ; logos | **B (scène atelier)**, mains seules, après visionnage |
| Commons (CC0) | CC0 lue dans l'API | Recommandé | Inconnue (rien visionné) ; 1080p | Personnes filmées au Mondial des Métiers | **B**, en concurrence avec les banques |
| Photos existantes → vidéo | BY-SA 4.0 (héros), BY 2.0, CC0 | Déjà en place, avec « modifiée » | Un zoom seul n'apporte rien ; le geste réel filmé est la bonne version | Faible ; corriger `attributions.json:37` | **A (téléphone)** |
| 3D Blender | Rendu à l'utilisateur ; textures CC0 | Aucun | À construire (essai naïf : schéma plat) | Aspect synthétique, temps | **Objet décomposé**, pas le héros |

---

## 3. La vidéo à côté de ce qui est décidé

### 3.1 Pourquoi pas dans le héros de l'accueil au bureau

- **RL** tourne et éclaire la boîte de la photo (`picture` 4:3, origine sur l'œil). Il vit sous `html.js.da--signature .ouverture>.hero--plein`, au-delà de 1024 px (cahier §3.5, l.285-315).
- **Le relief** a été calculé pour cette photo : `da.json:8`, avec `relief.photo` et `relief.profondeur` ; le générateur refuse une autre photo (`generer.mjs:821`). Le fil de rendu reçoit la photo comme texture (cahier §3.7). Avec une vidéo, la carte ne correspondrait plus à l'image, et chaque image vidéo devrait être transférée au fil de rendu.
- **La descente** est une déformation du shader (`uDelta`, `uRoulis`, cahier §7.5) sur cette même texture.
- **Conclusion** : remplacer la photo par une vidéo, c'est défaire ce que Benj a dit de « tout garder » (decisions.md:54).

### 3.2 Emplacements possibles

| Option | Où | Contenu | Pour | Contre |
|---|---|---|---|---|
| **A (recommandée)** | Héros de l'accueil **sous 1024 px** | Le geste réel (RL + descente) filmé en 9:16 ; 5 s au plus, **joué une fois puis figé sur la dernière image** | Le téléphone gagne le geste signature, qui y manque (cahier:351-353, Q4 l.936). Affiche = `heros-escalier-portrait-*.avif`, déjà préchargée (generer.mjs:372), donc 0 octet d'affiche et un premier rendu inchangé. | Pèse sur le Lighthouse **mobile**, celui que la règle mesure (§3.3). |
| **B** | Scène « Dans l'atelier » (generer.mjs:500), bureau et téléphone | Vrais gestes : rabot, copeaux, mains | L'effet « vidéo de cinéma » MotionSites dans le récit. Hors du premier écran, donc hors des métriques de chargement. Affiche = la photo actuelle de l'atelier. | Source à trouver et à visionner (§2.1-2.2). Visible dans la vidéo de la landing (§3.6). |
| C | Héros au bureau, calque d'ambiance (poussière dans la lumière) au-dessus du relief | Particules rendues dans Blender, fond noir, `mix-blend-mode:screen` | La photo reste | Double la lumière L2 ; va contre la retenue C7 et « un seul geste signature » ; composition coûteuse |
| D (déconseillée) | Remplacer la photo du héros par une vidéo au bureau | — | — | Contredit « tout garder » (§3.1) |

### 3.3 Budget de poids (Lighthouse mobile, médiane ≥ 95)

- **Aujourd'hui, 5 passages mobiles** (`017-vague-3/final/lighthouse/resume.json:22`, rapports `accueil-1…5.report.json`) :
  - performance **94, 97, 97, 97, 97** : médiane **97** ;
  - LCP de 2 480 à 2 487 ms ;
  - Speed Index de 1 212 à 1 510 ms ;
  - TBT de 0 à 192 ms ;
  - CLS 0 ;
  - 352 046 octets transférés.
- **Simulation** : débit descendant **1 474,56 kbit/s** et processeur ralenti ×4 (`resume.json:44`, `:46`).
- **Poids des métriques dans la note** ([Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)) : TBT 30 %, LCP 25 %, CLS 25 %, FCP 10 %, SI 10 %. Le poids total de la page n'entre pas dans la note.
- **LCP** : pour une vidéo, compte « the poster image load time or first frame presentation time […] whichever is earlier ». Les « Elements that cover the full viewport » sont exclus comme fonds ([web.dev/articles/lcp](https://web.dev/articles/lcp)). Le LCP actuel (2,48 s) est **à 20 ms du seuil de 2,5 s** : si l'affiche est la même URL que l'image déjà préchargée, il ne doit pas bouger. **À vérifier par la mesure**, pas à supposer.
- **Temps de téléchargement** à 1 474,56 kbit/s (octets mesurés × 8 / débit) :

| Fichier | Durée | Part du poids actuel de la page |
|---|---|---|
| Téléphone AV1, 187 281 o | 1,02 s | +53 % |
| Téléphone H.264, 290 622 o | 1,58 s | +83 % |
| Atelier 720p AV1, 109 208 o | 0,59 s | — |
| Atelier 720p H.264, 279 023 o | 1,51 s | — |
| Escalier 1080p H.264, 1 190 283 o | 6,46 s | — |

- **Plafonds proposés** (à valider par la médiane de 5 passages avec et sans vidéo) :
  - A : **≤ 200 ko en AV1 et ≤ 300 ko en H.264, pour 5 s au plus**. L'essai de 6 s donne 187 / 291 ko ; la baisse attendue à 5 s est une estimation proportionnelle à la durée, pas une mesure.
  - B : **≤ 300 ko en H.264 720p**.
- **Risque principal pour A : le Speed Index.** Une vidéo qui change d'image pendant la trace peut retarder la « complétude visuelle ». Parade : charger après `load`, sur un moment libre, et jouer une seule fois.

### 3.4 Formats et chargement

- **Hébergement sur le site uniquement**, sous `public/sites-demo/lestraque/`. La démo reçoit la CSP stricte (`next.config.mjs:98`, tout sauf `/site/` et `/p/`) : `default-src 'self'` (l.30) et aucun `media-src`. Un flux Mux, Pexels ou autre CDN serait **bloqué**.
- **Deux sources, AV1 d'abord** :
  - AV1 : `video/mp4; codecs="av01.0.05M.08"` pour 720×1280 (niveau mesuré 5) ;
  - H.264 en repli : `avc1.64001f` (High 3.1 mesuré).
  Safari ne décode l'AV1 que sur les appareils à décodeur matériel (« Supported only on devices with hardware decoder, e.g. iPhone 15 Pro, M3 MacBook Pro », [caniuse](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/av1.json)) : le H.264 est indispensable. Pour du 1080p, forcer le niveau 4.0.
- **Balise** : `muted playsinline preload="none"`, `poster` = l'AVIF déjà utilisée, **aucun `src` ni `autoplay` dans le HTML**. Le script ajoute les sources seulement si :
  - `load` est passé et un moment libre est venu ;
  - `prefers-reduced-motion: no-preference` ;
  - `navigator.connection.saveData` n'est pas vrai (même règle que la texture 2880 du relief, cahier §3.7) ;
  - l'élément est visible (IntersectionObserver).
- **iOS** ([WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/)) : « <video muted> elements will also be allowed to autoplay without a user gesture » ; « <video playsinline> elements will now be allowed to play inline » ; « <video autoplay> elements will pause if they become non-visible ». Le comportement en mode économie d'énergie n'est pas documenté dans cet article : **à vérifier sur un iPhone**.
- **Téléphone (A)** : un seul fichier en portrait, jamais de source paysage. Au bureau, ni requête ni balise vidéo pour A.

### 3.5 Mouvement réduit, sans JavaScript, accessibilité

- **Mouvement réduit** : **0 requête vidéo**, l'affiche seule. C'est la même logique que kit.css:259-264 (animations coupées) et kit.js:183 (relief non chargé).
- **Sans JavaScript** : la `<picture>` actuelle, sans vidéo.
- **WCAG 2.2.2** ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)) : un contenu en mouvement qui « starts automatically, lasts more than five seconds, and is presented in parallel with other content » exige « a mechanism for the user to pause, stop, or hide it ».
  - D'où, pour A : **5 s au plus, puis figé**. Aucun bouton pause n'est nécessaire, ce qui préserve la retenue C7.
  - Pour B : jouer une fois aussi, ou ajouter un bouton pause.
  - **Constat hors vidéo** : la poussée actuelle boucle déjà 20 s à l'infini sans commande (kit.css:322, 1156).
- **Lisibilité** (leçon du §1.3) : choisir ou cadrer un plan dont **la zone du titre reste sombre et uniforme** à chaque image. Contrôle : contraste p90 du fond du titre ≥ 3,0 sur toutes les images, comme R-12 (cahier §3.5, point 6). Le voile existant (kit.css:319) reste.

### 3.6 Vidéo de la landing, juges existants

- **Plan du héros filmé** : `scripts/demo-video.mjs` filme la démo en 1280×800 (cahier:608). L'option A, réservée au téléphone, n'y apparaît donc pas.
- **Option B** : elle apparaîtrait dans le film de la landing. Il faudrait revérifier `video-qa --profil=landing`, qui exige un fichier muet de 1,5 Mo au plus (decisions.md:31), et les crédits sous la vidéo (decisions.md:48).
- **Juges existants** (`site-qa`, `demo-usage-qa`, `nav-retenue-qa`) : à relancer. Aucun ne connaît `<video>` aujourd'hui (non vérifié ligne à ligne).

### 3.7 Q3 et Q4

- **Q3 (roulis)** : hors de ce champ, et la vidéo n'y change rien. Le cahier fixe déjà ρ = 0 quand le geste au repos comporte une rotation (cahier:334), ce qui est le cas de RL.
- **Q4 (geste au téléphone)** : proposition = **option A**. Le geste du bureau est filmé en 9:16, ≤ 5 s, joué une fois, avec l'affiche déjà préchargée, 0 octet de WebGL, et une médiane Lighthouse mobile ≥ 95 exigée avant mise en ligne.

---

## 4. Découpage proposé (périmètres disjoints)

| Tâche | Exécutant | Périmètre | Livrable | Dépendance |
|---|---|---|---|---|
| 021-V1 Rushes d'atelier | Antigravity (téléchargement, ffmpeg) | `.orchestre/travail/rushes-atelier/` et `preuves/021-V1/` seulement | 6 à 10 plans candidats (§2.1) : planche de 8 images chacun, licence relue **à la source**, visages, logos et lieux relevés, fiche JSON. Aucun fichier du site. | Aucune |
| 021-V2 Clip téléphone | Antigravity (Playwright avec carte graphique) | `preuves/021-V2/` seulement | Le geste RL + descente filmé en 9:16, encodé en AV1 et H.264, ≤ 5 s, poids, planche, contraste du titre | **Après la mise en ligne de 020-02/03** (sinon on filme un geste provisoire) |
| 021-V3 Balise et chargeur | Codex (écrit sans lancer de sous-processus) | Nouveau fichier `_kit/video.js`, un bloc CSS dédié en fin de `kit.css`, une fonction de `generer.mjs` derrière `da.video` | Balise §3.4, conditions §3.5, entrées `attributions.json` | **Conflit** : kit.css, kit.js et generer.mjs sont modifiés par 020-02/03. À lancer après leur fusion, ou en limitant les écritures aux blocs nouveaux. |
| 021-V4 Juge | Claude Code | `scripts/` (nouveau juge) | 0 requête vidéo en mouvement réduit, avec `saveData` et avant `load` ; affiche = URL du héros ; durée ≤ 5 s et `ended` figé ; sources AV1 puis H.264 sur le site ; médiane de 5 passages Lighthouse mobile ≥ 95 avec la vidéo ; contraste p90 ≥ 3,0 ; crédits présents | Avant 021-V3 |

L'objet décomposé en 3D (Blender, §2.4) relève de la recherche « object breakdown » : je le signale seulement.

## 5. Questions pour Benj

1. **Héros vidéo** : d'accord pour le téléphone seulement (A), le bureau gardant RL, la descente et le relief ? Ou veux-tu voir aussi la scène atelier (B) ?
2. **Personnes réelles** : acceptes-tu, pour B, des mains filmées d'un vrai artisan (banque libre ou CC0), sans visage ni logo, créditées « images d'illustration » ? Ou seulement des images sans personne ?
3. **CC BY-SA** : la levée de decisions.md:48 vaut-elle aussi pour une vidéo **dans** le site tirée de la photo du héros (en corrigeant `attributions.json:37`) ?

## 6. Sources, fichiers et mesures

- **MotionSites** (connecteur, 15/09) : ids, accès et catégories venus de `search_prompts` et `get_related_prompts`. Aperçus : `pub-86dc5b5484314368ac5436a674b0d919.r2.dev/hero%20sections/animated%20(8|37|65|85).webp`, `stream.mux.com/{i9kUFJ…,MSctoq…,a6HPc2…,iY611P…}.m3u8`.
- **Aperçus, planches et mesures** : `C:/Users/benja/Documents/presti/.orchestre/travail/motionsites-apercus/` (`images/*-planche.jpg`, `ecarts.mjs`, `ecarts.json`, `meta-webp.mjs`, `meta-webp.json`). Le script a aussi fait des planches pour les aperçus d'autres recherches présents dans ce dossier (fichiers `*-planche.jpg` créés à 13 h 07-13 h 08) ; rien d'autre n'a été modifié.
- **Essais d'encodage et de rendu** (scratchpad de session, éphémère) : `C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/video-essais/` (`*.mp4`, `affiche-*.avif`, `planche-escalier-*.jpg`, `escalier3d.py`, `blender-essai2.png`). Les commandes sont reproduites au §2.3 et au §2.4, et les chiffres dans `ref-video-mesures.json`, à côté de ce fichier.
- **Pages consultées** : liens au §2.1, §2.4, §3.3, §3.4 et §3.5. Les citations viennent d'une lecture automatique (WebFetch) le 15/09/2026. Trois pages ont répondu 403 (vidéo Pexels 34394964, licence et FAQ blender.org, manuel Blender).
