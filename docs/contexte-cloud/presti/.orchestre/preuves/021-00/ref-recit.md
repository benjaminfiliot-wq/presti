# Récit au défilement et animations fluides — Atelier Lestraque (vague 5, 021-00)

**15/09/2026, rédigé entre 13 h 03 et 13 h 20 (heure de Paris, `date` : 13:14:37 +0200 pendant la rédaction).**
Sous-agent de Claude Code, mission « scroll based storyline » + « smooth animation » de la décision de Benj
(decisions.md:54). Aucune écriture hors de `.orchestre/preuves/021-00/` et `.orchestre/travail/motionsites-apercus/`
(dossier ignoré par git, .gitignore:84). Aucun `get_prompt`, aucun déblocage, aucune commande git.

## 0. Ce qui a été regardé, et comment

- **Connecteur MotionSites** : `search_prompts` ×5 et `get_related_prompts` ×2 (métadonnées seulement). Il répond, malgré
  l'avis d'authentification affiché au démarrage de la session.
- **Connecteur PromptedSite** : `search_design_templates` ×3, `compare_design_templates` ×1, `get_design_template` ×1.
- **Aperçus téléchargés** sous `.orchestre/travail/motionsites-apercus/` (préfixes `recit-` et `ps-`).
  - Les **WebP animés** ont été réduits en planches de 12 images, avec leur numéro et leur heure, par sharp
    (`021-00/recit/planches-webp.mjs`). Les métadonnées sont dans `planches-recit/webp-meta.json`.
  - Les **MP4** ont été réduits par ffmpeg en planches de 16 images, plus des bandes serrées à 3 images/s sur les transitions.
- **Toutes les planches citées ont été ouvertes et regardées** : `.orchestre/travail/motionsites-apercus/planches-recit/*.jpg`.
- **Prompt complet** : un seul texte est lu, et de seconde main. C'est l'analyse de Cast and Render
  (`.orchestre/travail/motionsites/cast-and-render.md`), ouvert par Benj à 13 h 10 (motionsites-recherche.md:59-68).
- **Mesure de la démo en ligne**, en lecture seule, par Playwright le 15/09 à 11:10:04Z :
  - script et résultat : `021-00/recit/mesure-demo.mjs` et `mesure-demo.json` ;
  - lu en plus : les rapports Lighthouse du 15/09 (`017-vague-3/final/lighthouse/accueil-{1..5}.report.json`).
- **Limite** : les prompts premium sont fermés. La technique des références premium est donc **déduite de l'aperçu**, et
  marquée « probable ». Trois aperçus sont des images fixes (scroll-landing, data-storytelling, 3d-story) : leur mécanique
  au défilement est invisible, ils ne sont pas retenus.

## 1. Références qui racontent au défilement

### R1 — Cast and Render (MotionSites, gratuit, ouvert par Benj)

- **Adresse** : https://motionsites.ai/?prompt=cast-and-render
- **Vu** : l'analyse du prompt (cast-and-render.md). **Je n'ai pas ouvert son aperçu** : je ne décris donc aucune image.

**Structure du récit :**
- **Une seule scène**, épinglée par construction : une vidéo plein écran fixe dont le défilement déplace la tête de lecture
  (cast-and-render.md:9-10).
- **Hauteur de page** : une piste vide de 560vh, 3 200 px au moins (l.11).
- **Trois panneaux de texte**, chacun sur sa tranche de progression :
  - tranches [0 ; 0 ; 0,15 ; 0,23], [0,35 ; 0,43 ; 0,57 ; 0,65] et [0,77 ; 0,85 ; 1,10 ; 1,20] ;
  - des **trous voulus** entre deux panneaux : la vidéo reste seule, jamais deux textes à la fois (l.32-34).
- **Progression** : un trait de 2 px en haut de l'écran, `scaleX(progress)` (l.42).

**Technique (connue) :**
- boucle rAF, sans IntersectionObserver ni scroll-timeline (l.36) ;
- vidéo toutes images clés, préchargée en blob (l.15-19) ;
- lissage `seekAt += (seekTo − seekAt) × 0,115` (l.26) ;
- texte : smoothstep, dérive de 22 px (l.35).

**Ce qui la rend mémorable** : le visiteur tient la tête de lecture d'un film, et les trous entre les textes laissent respirer.

**Pour Lestraque** : c'est la mécanique de la vue éclatée, qui relève d'une autre mission. Deux idées se reprennent ici :
- les **trous entre les textes** ;
- le **lissage d'une valeur pilotée par le défilement** (§3.3).

### R2 — Nimbus Sticky Cards (MotionSites, premium)

- **Adresse** : https://motionsites.ai/?prompt=nimbus-sticky-cards
- **Aperçu regardé** : `recit-nimbus-sticky-cards-planche.jpg` (70 images, 4,67 s ; webp-meta.json).

**Structure du récit :**
- **À gauche**, un mini-index de 4 entrées, dont le point actif descend d'une entrée à l'autre.
- **Au centre**, les titres des chapitres **s'accumulent** : « Programmable infra », puis « Data residency » en dessous,
  et ainsi de suite jusqu'à 4. Seul le dernier arrivé garde son paragraphe.
- **À droite**, un panneau d'image par chapitre monte et **recouvre** le précédent (visible de 0,87 s à 1,27 s, puis de
  2,53 s à 2,93 s).
- **Progression** : quatre chapitres, sans compteur chiffré ; l'index tient ce rôle.

**Technique probable** : `position: sticky` à décalages successifs, les titres empilés comme des en-têtes collants. Code non
visible.

**Ce qui la rend mémorable** : rien ne disparaît. Les chapitres s'empilent comme les feuilles d'un dossier, et l'on sait
toujours où l'on est.

### R3 — Projects Catalog (MotionSites, premium)

- **Adresse** : https://motionsites.ai/?prompt=projects-catalog
- **Aperçu regardé** : `recit-projects-catalog-planche.jpg` (75 images, 5,0 s).

**Structure du récit :**
- Un titre géant « PROJECT », puis des cartes « 01 », « 02 », « 03 », chacune avec un **numéro surdimensionné** et une mosaïque
  de trois images.
- Chaque carte monte et se pose sur la précédente, dont il ne reste qu'un **liseré** en haut : trois liserés empilés à 4,93 s.
- **Transition** : 02 entre vers 1,80 s et couvre 01 à 2,67 s.

**Technique probable** : cartes `sticky` à `top` croissant, avec une légère réduction de la carte recouverte.

**Ce qui la rend mémorable** : un paquet de cartes physique, et des numéros qu'on lit de loin.

### R4 — Transitions « matière » : Layered Depth (Qelora) et Art Landing (MotionSites, premium)

**Layered Depth**
- **Adresse** : https://motionsites.ai/?prompt=layered-depth
- **Aperçu regardé** : `recit-layered-depth-planche.jpg` (74 images, 4,93 s).
- **Structure** :
  - le mot géant « Qelora » est **derrière** une sculpture de pierre moussue, qui déborde sur les lettres ;
  - au défilement (1,33 s → 2,20 s), la sculpture monte et passe devant le mot, qui sort ;
  - une phrase centrée sur la durée arrive, au-dessus d'un fil vertical terminé par un petit cercle, qui sert de repère de
    défilement (2,67 s à 3,53 s).
- **Technique probable** : calques en parallaxe, avec des vitesses de translation différentes. Code non visible.

**Art Landing**
- **Adresse** : https://motionsites.ai/?prompt=art-landing
- **Aperçu regardé** : `recit-art-landing-planche.jpg`. MP4 de 8,22 s, 976×720, 50 images/s (ffprobe).
- **Structure** :
  - un tableau classique en héros ;
  - un **panneau rouge au bord déchiré** monte par-dessus (1,54 s → 3,60 s), portant un logo, un court texte centré et une
    signature ;
  - un second tableau monte ensuite du bas (4,11 s → 4,62 s) ;
  - des cadres de détection numérotés et une pixellisation s'affichent sur les figures.
- **Technique probable** : panneau à bord détouré (image ou masque) en translation liée au défilement.

**Ce qui les rend mémorables** : la transition est une matière (papier déchiré, objet devant la typographie), pas un fondu.

**Pour Lestraque** : c'est déjà la grammaire du plateau noir qui monte sur le héros (kit.css:1077-1084). La phrase de Qelora
sur ce qui dure fait écho à « Fait pour rester ».

### R5 — Arceage Stats (MotionSites, gratuit, prompt non ouvert)

- **Adresse** : https://motionsites.ai/?prompt=arceage-stats
- **Aperçu regardé** : `recit-arceage-stats-planche.jpg` (73 images, 5,0 s).

**Structure :**
- Le titre se révèle mot à mot : « that *Maximiz…* » est encore incomplet à 0,60 s.
- Les chiffres **comptent** pendant que la mise en page reste immobile :
  - 201K+ à 0,60 s, 385K+ à 1,00 s, 493K+ à 1,47 s, 500K+ à 1,87 s ;
  - 40,1 % → 76,9 % → 98,4 % → 99,8 % aux mêmes instants ;
  - soit **environ 1,3 s de comptage, décéléré** (mesure sur la planche).
- L'image est dans un masque triangulaire.

**Technique probable** : comptage **au temps**, lancé à l'entrée dans l'écran. La page ne bouge pas pendant que les chiffres
changent, ce n'est donc pas un comptage lié au défilement.

**Ce qui la rend mémorable** : le chiffre se gagne sous les yeux.

**Risque à ne pas copier** : un comptage lié au défilement s'arrête avec la molette et affiche un **faux chiffre figé**
(par exemple « 93 m² »).

### R6 — Sticky Content Switch (PromptedSite, premium, en appui)

- **Adresse** : https://promptedsite.com/t/sticky-content-switch
- **Pile technique** : « html-css-js » (compare_design_templates).
- **Aperçu regardé** : `ps-sticky-content-switch-planche.jpg` et `-zoom-3.jpg`. demo.mp4 de 36 s, 1152×720, 30 images/s.

**Structure du récit :**
- **Titre d'ouverture** sur deux lignes, noir puis orange.
- **À gauche, un bloc de texte épinglé** : un rail vertical à graduations, rempli en orange, et un index « 01 / 06 ».
  Au-dessous : une catégorie, un grand titre et deux lignes de texte.
- **À droite, les images montent** en cartes. Quand une carte atteint le centre, le texte de gauche change pour la décrire.
  La page le dit elle-même, en substance : le titre reste épinglé, les images bougent.
- **Rythme** : six projets, de « MONUMENT » à « HORIZON ». Le bloc « 01 / 06 » arrive avec la première carte, entre
  3,0 et 5,0 s de la vidéo.
- **Final** : un appel centré, avec un mot fantôme géant derrière (20,25 s).

**Technique probable** : bloc `sticky` et changement de texte à l'entrée au centre, en IntersectionObserver ou en
view-timeline. Code non visible.

**Ce qui la rend mémorable** : une place de lecture fixe, et les images qui viennent au visiteur.

### 1.7 Vues et non retenues

| Référence | Vu | Pourquoi écartée |
|---|---|---|
| Scroll Marquee (MotionSites) | Planche : rangées de captures qui entrent en diagonale | Une bande qui défile est interdite par le juge (`class="defile"`, site-qa.mjs:451) |
| NexaCore Process (MotionSites) | Planche : quatre cartes qui s'allument au curseur | Révélation au survol, pas un récit au défilement |
| Interior Features (MotionSites) | Planche : titre **flouté** à 2,27 s, puis cartes agrandies en carrousel | Un flou animé a coûté 500 ms de TBT sur Lighthouse mobile (mémoire « cerveau site v2 ») |
| Stacking Cards Portfolio (PromptedSite) | Planche et bande : paquet de cartes numérotées, panneau de contact sombre qui monte à la fin | Même grammaire que R3 |
| Forest & Sage (PromptedSite) | Planche et bande : panneaux à coins arrondis qui montent, image inclinée qui se redresse | Proche du plateau existant ; ton trop « pop » pour un menuisier |
| Editorial Manifesto et Terroir (PromptedSite) | Planches : serif lent, lignes alternées blanc et beige ; chez Terroir, « Four steps, no shortcuts. » en 01 à 04 | **Appui de ton** seulement : même structure que « En quatre temps », aucune mécanique de récit neuve |
| scroll-landing, data-storytelling, 3d-story (MotionSites) | Images fixes (WebP non animés, `file`) | Mécanique invisible |

### 1.8 Ce que les meilleures ont en commun (sur ce qui a été vu)

1. **Une place de lecture fixe** pendant que la matière bouge (R1, R2, R6).
2. **Toujours savoir où l'on en est** : index, rail ou compteur (R1, R2, R3, R6).
3. **Des chapitres qui s'empilent**, au lieu de fondus au blanc (R2, R3).
4. **Des transitions en matière** : panneau, déchirure, objet devant le texte (R4).
5. **Des trous** : jamais deux textes lisibles à la fois (R1).
6. **Des chiffres gagnés au temps**, pas au défilement (R5).

## 2. Le récit de l'Atelier Lestraque

### 2.0 Point de départ mesuré

Mesure Playwright sur la page en ligne (`recit/mesure-demo.json`, 11:10:04Z) :

| Section | 1440×900 : haut / hauteur (écrans) | 1088×800 : hauteur (écrans) | 390×844 : hauteur (écrans) | Mécanique existante |
|---|---|---|---|---|
| `.ouverture` : héros collant + plateau | 0 / 1 888 px (2,10) | 1,96 | 2,10 | Héros collant, plateau qui monte, texte, photo, voile (kit.css:1079-1084) |
| `#prestations` | 1 888 / 1 125 (1,25) | 1,20 | 1,15 | Titre mot à mot (kit.css:1088-1091) |
| `#atelier` | 3 013 / 900 (1,00) | 1,00 | 1,07 | Photo en dérive (kit.css:582) |
| `#realisations` : travelling épinglé | 3 913 / 1 656 (1,84) | 1,84 | 1,23 | Travelling horizontal, compteur 01/04 (kit.css:630-645) |
| `#communes` | 5 569 / 509 (0,57) | 0,49 | 1,18 | — |
| `#etapes` : épinglé | 6 078 / 2 700 (3,00) | 3,00 | 1,22 | Tranches par étape, jauge verticale (kit.css:1110-1125) |
| `#questions` | 8 778 / 743 (0,83) | — | 1,22 | — |
| `#contact` | 9 520 / 902 (1,00) | 1,00 | 1,07 | — |
| **Page** | **10 729 px = 11,92 écrans** | 11,81 | 10,71 | `scroll-behavior: auto` mesuré |

**Le fil est déjà écrit dans la page.**
- La citation du plateau dit : « Du premier relevé à la dernière marche posée, je ne passe la main à personne. »
  (index.html, `plateau__citation`).
- Les quatre étapes : « Prise de contact », « Visite technique », « Plan et devis », « Fabrication et pose »
  (contenu.json:141-169).
- L'atelier : « Je trace, débite, assemble et ponce chaque pièce ici, à Rennes » (contenu.json:75).
- La galerie : « du relevé à la pose » (contenu.json:85). Sa **dernière pièce est l'escalier hélicoïdal du héros**
  (index.html, `galerie__n` 04).
- Le chiffre : « 8 semaines, délai type d'un escalier, du relevé à la pose » (index.html, `chiffres`).

**Le récit proposé tient la promesse de la citation, dans l'ordre**, et **finit sur l'escalier du héros** : la boucle se
ferme.

### 2.1 Le récit en sept actes, numérotés de 0 à 6 (bureau ≥ 1024 px, mouvement permis, `view()` disponible)

**Changement de structure proposé** : `#etapes` passe **avant** `#realisations`.
- **Nouvel ordre** : ouverture → prestations → atelier → **étapes** → réalisations → communes → questions → contact.
- **Ancres et juges** : les identifiants restent, et l'ordre des liens de la barre (Prestations, Réalisations, Communes,
  Questions ; index.html:32) suit toujours l'ordre de la page.
- **Faisabilité** : le générateur peut prendre des chemins propres à Lestraque (decisions.md:43).
- **Réversible** : c'est un ordre de sections.

| Acte | Section | Épinglé ? | Ce qu'on lit (texte réel) | Ce qui bouge | Passage à l'acte suivant |
|---|---|---|---|---|---|
| **0. Fait pour rester** | Héros | Oui, existant | « Menuisier à Rennes », « Fait pour rester », le chapeau, « Demander un devis » | **Décidé** (decisions.md:54) : RL au repos, puis la descente au premier défilement (palier 0,30 h, zoom 1 → 1,04, surtitre et pied qui s'effacent ; cahier §2) | Le plateau noir monte et referme la cage (existant) |
| **1. La promesse** | Plateau | Non | La citation signée, puis « 10 ans », « 180 m² », « 8 semaines » | **Citation** : chaque mot passe d'une encre pâle à pleine, lié au défilement (`view()`, plage `cover`, cascade par mot comme `mot-leve`, kit.css:1091). **Chiffres** : compteur au temps, environ 1,3 s décéléré à l'entrée (R5), rouleaux de chiffres en `transform` (comme `compteur__piste`, kit.css:635), vraie valeur dans le DOM | Le papier de Prestations arrive (existant) |
| **2. Ce que je fabrique** | Prestations | Non | Les six prestations | Inchangé ici. Les vignettes au survol relèvent de la mission « révélation au survol » | — |
| **3. L'annonce** | Atelier | Non | « Je **trace**, **débite**, **assemble** et **ponce** chaque pièce ici… » | Les **quatre verbes** s'allument en cascade au défilement : ils annoncent les quatre temps. La photo garde sa dérive | Le titre « En quatre temps » se lève mot à mot (existant) |
| **4. En quatre temps** | Étapes | **Oui**, 300svh existants (360svh à filmer, §2.2) | Les quatre étapes, mot pour mot | La scène de gauche change à chaque étape (§2.2) ; les numéros s'allument (existant) ; jauge et compteur « 01 / 04 » | La dernière étape, « Fabrication et pose », passe la main aux pièces livrées |
| **5. La dernière marche posée** | Réalisations | Oui, existant | « Pièces livrées », 01 à 04 | Travelling existant. **Option** : dans les 15 derniers % de la plage `contain`, la pièce 04 (l'escalier du héros) grandit en `transform` jusqu'à remplir le cadre, comme un retour au héros | Autour de Rennes |
| **6. Chez vous** | Communes, questions, contact | Non | Les communes, la FAQ, le formulaire | Titres mot à mot existants. **Aucun mouvement lié au défilement dans le formulaire** | — |

**Longueur de page** à 1440×900, par calcul :
- 10 729 px aujourd'hui ;
- + 270 px de palier de descente (.ouverture 2 158 px au lieu de 1 888 ; cahier §2) ;
- + 540 px si l'on passe à 360svh ;
- soit **11 539 px = 12,82 écrans**, contre 11,92.

### 2.2 La scène épinglée « En quatre temps », pas à pas

**Base existante (kit.css:1107-1125)** :
- `#etapes` fait 300svh et son contenu est collant ;
- la plage `contain` couvre 300 − 100 = **200svh** de défilement, soit 1 800 px à 1440×900 (hauteur mesurée : 2 700 px) ;
- la première étape tient seule les **10 %** du début, puis chaque étape occupe **90 % / 4 = 22,5 %** de la plage, soit
  45svh (405 px à 900 px de haut) ;
- le fondu enchaîné dure **0,3 tranche** autour de chaque frontière (kit.css:1136-1138) ;
- à 25, 50 et 75 % de la plage, une seule étape est pleine (même source).

**Ajout : une « scène » à gauche**, à la place de la seule photo `.etapes__photo`, pilotée par **la même timeline
`--etapes` et les mêmes `--e` / `--ne` que la liste** (generer.mjs). Le texte et l'image ne peuvent donc pas se désynchroniser
(règle « Deux chiffres, un écran » de la mémoire du projet).
- **Contenu** : un SVG généré par generer.mjs, sans licence, `aria-hidden`, où **un trait de crayon se dessine**.
- **Portée** : bureau seulement. `stroke-dashoffset` se peint sur le fil principal (§3.4).

| Tranche | Étape active (liste, existant) | Scène (nouveau) | Textes de la scène (réels) |
|---|---|---|---|
| 0 → 10 % | 01 pleine d'emblée | La fiche du formulaire de démonstration apparaît, un champ après l'autre (translation et opacité) | « Votre projet : Escalier » · « Commune : Rennes » · « Quand : Dans les trois mois » (options du formulaire, index.html) |
| 10 → 32,5 % | 01 → 02 | La fiche glisse et sort. **Le trait dessine la trémie**, puis l'empreinte ronde de l'escalier | « aplombs » · « humidité des murs » · « accès » (contenu.json:153) |
| 32,5 → 55 % | 02 → 03 | Le trait **rayonne en marches** : le plan se complète, une cote s'inscrit, et trois lignes de devis s'écrivent **sans prix** | « marches de 40 mm » (contenu.json:25) · « essences » · « ferrures » · « ligne par ligne » (contenu.json:161) |
| 55 → 77,5 % | 03 → 04 | **Emplacement de la vue éclatée d'une marche** (mission « objet décomposé », vidéo pilotée par le défilement comme R1). Sans elle : la photo `tournage-copeaux` (CC BY 2.0, déjà sur la page) entre par un `clip-path` | « Je fabrique les pièces à l'atelier » |
| 77,5 → 100 % | 04 pleine | Le plan coté revient en filigrane sous la photo de l'escalier et se range : fin de l'épinglage | « …puis je les pose chez vous à la date fixée ensemble » |

**Trous (R1)** : dans chaque tranche, la scène change pendant les **30 % centraux** seulement. Hors fondu, elle est immobile,
comme le texte (plateaux des keyframes `etape-num`, kit.css:1139).

**Progression (R2, R6)** :
- la jauge verticale existante (kit.css:1124-1125) ;
- un compteur « 01 / 04 » en rouleau, **construit comme celui du travelling** (kit.css:633-636), pour que les deux scènes
  épinglées parlent la même langue.

**À filmer** : 300svh contre 360svh. À 360svh, une tranche vaut 526 px à 900 px de haut (0,225 × 2 340). Seule la valeur de
300svh est éprouvée aujourd'hui.

### 2.3 Enchaînement avec le héros, le plateau et la descente ; Q3 et Q4

**Héros et descente** : inchangés par ce récit. La descente se termine quand le plateau couvre la cage (cahier §2,
plage 2). L'acte 1 commence sur le plateau déjà en place.

**Q3, le roulis — proposition : non (ρ = 0).**
- Le cahier le coupe dès que le geste au repos tourne (cahier §2, tableau des formules ; §3.6), et RL tourne.
- La retenue (C7) a été notée 3,3 à l'aveugle (decisions.md:49).
- Si Benj veut « plonger » davantage, amplifier **δ**, borné par le budget de grossissement : δmax 0,116 à dpr 1, 0,066 à
  dpr 1,5 (cahier §6).

**Q4, le téléphone — proposition : une tâche séparée, en CSS pur, sans épinglage ni JavaScript neuf.**
- **Ordre** : le même ordre de sections.
- **Étapes** : le rail horizontal existant, avec sa jauge (kit.css:779, 847-851).
- **Plan coté** : affiché **déjà dessiné** (image fixe), révélé par opacité et translation en `view()`.
- **Citation** : mots allumés en `view()`, en transform et opacity.
- **Justification** :
  - decisions.md:9 réserve l'animation lourde au bureau ;
  - Lighthouse mobile du 15/09 à 01:59Z : performance 0,94 / 0,97 / 0,97 / 0,97 / 0,97 sur les 5 passes, médiane
    **0,97** mais une passe à **0,94** (`accueil-1..5.report.json`) : la marge est étroite ;
  - une capture de la vague 3 montre déjà la barre coupée pendant un défilement doux au téléphone
    (`017-vague-3/cles/finitions-tour3-mobile-390-nav-decoupee-pendant-defilement-doux.jpg`, regardée : bande beige
    au-dessus de la barre, logo recouvert).

**Cas particuliers :**
- **Mouvement réduit** : toutes les étapes pleines, le plan dessiné, les chiffres à leur valeur, aucune citation à allumer.
  C'est la règle de kit.css:1075 (tout le chorégraphié vit sous `no-preference`) et du juge site-qa.mjs:410.
- **Sans `view()`** : Firefox stable n'active pas les animations liées au défilement par défaut. La page MDN des
  fonctionnalités expérimentales indique « Release: No » pour `layout.css.scroll-driven-animations.enabled`, activé seulement
  en Nightly. Chemin actuel : dévoilement par IntersectionObserver (kit.js:11, 158-159), plan affiché déjà dessiné.
- **Sans JavaScript** : les chiffres affichent leur vraie valeur, sans comptage.
- **Écran de moins de 680 px de haut** : pas d'épinglage (kit.css:1110), la scène se range au-dessus de la liste.

## 3. Animations et défilement fluides

### 3.1 Les trois voies

| Voie | Ce qui est établi (source) | Pour Lestraque |
|---|---|---|
| **A. Défilement natif + animations CSS liées au défilement** (aujourd'hui) | **Chrome** : `view()` actif en 1440×900, 1088×800 et 390×844 (`CSS.supports`, mesure-demo.json). **Safari 26.4** : ces animations tournent sur le fil du compositeur, séparé du fil principal (webkit.org, Safari 26.4). **Firefox** : non activé en version stable (MDN, fonctionnalités expérimentales). **MDN** : pas « Baseline ». Toute la chorégraphie actuelle est bâtie ainsi (kit.css:1056-1145) | Aucun octet de plus. Le juge et la vidéo pilotent le défilement par `scrollTo` (nav-retenue-qa.mjs:115, demo-usage-qa.mjs:151, demo-video.mjs:61) sans conflit |
| **B. Lenis** (défilement lissé) | MIT, version 1.3.26 (`npm view`). « Runs on native scroll » : sticky, ancres et accessibilité continuent de marcher. Options `lerp` 0,1 par défaut, `smoothWheel` vrai, `syncTouch` faux par défaut (instable sur iOS < 16), `anchors` faux par défaut, `prevent` / `data-lenis-prevent`. Limites écrites : **pas de scroll-snap**, **plafonné à 60 images/s sur Safari**, arrêt au-dessus d'un iframe (README GitHub). CDN unpkg exclu : la CSP de `/sites-demo/` est la stricte, `script-src 'self'…` (next.config.mjs:76, 98), donc fichier servi par le site | Le « glissé » des sites MotionSites. **Mais** : (1) il faut brancher les ancres, car kit.js:253 appelle `scrollIntoView` ; (2) le formulaire et la FAQ doivent être exclus ; (3) il faut vérifier les juges qui font `scrollTo` instantané (conflit possible, non testé) ; (4) une boucle rAF de plus |
| **C. GSAP (ScrollTrigger / ScrollSmoother)** | « GSAP is now 100% free for all users » (gsap.com/pricing) | Refait en JavaScript ce que le CSS fait déjà. Dépendance nouvelle : tâche dédiée obligatoire (decisions.md:12). **Écarté** |

### 3.2 Recommandation

1. **Garder la voie A par défaut**, et porter la fluidité dans les courbes et les plateaux, pas dans un détournement de la
   molette.
   - Les références vues tiennent leur effet par l'épinglage, l'empilement et les trous (§1.8), que le CSS fait.
   - Le compositeur les exécute hors fil principal en Chrome et Safari 26.4.
   - C'est ce qui garde la médiane Lighthouse (0,97, marge étroite) et les juges.
2. **Lisser seulement les valeurs pilotées en JavaScript** : `descente` envoyée au worker du relief, et tête de lecture de
   la vue éclatée.
   - Formule : `v += (cible − v) × k`, avec **k entre 0,10 et 0,115** par image.
   - Sources : 0,1, le `lerp` par défaut de Lenis (README) ; 0,115, Cast and Render (cast-and-render.md:26).
3. **Lenis en A/B filmé, pas en ligne d'emblée.**
   - Montage : `da.json` → `defilementLisse: true`, Lenis copié dans le site comme relief.js. Actif seulement si
     `(min-width:1024px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)`.
   - Réglages : `lerp` 0,1 et `syncTouch` faux ; `prevent` sur `.devis__form`, `details`, `.panneau` ; `lenis.stop()` quand
     le panneau du menu est ouvert ; ancres de kit.js:253 routées vers `lenis.scrollTo(cible, { offset: −hauteur de barre })`.
   - Antigravity filme la même descente de page, avec et sans Lenis, en 1440×900. **Benj choisit sur film** : sa réaction
     reste la mesure (decisions.md:40).
   - S'il retient Lenis, les juges K-5 à K-7 (§3.5) doivent passer avec.

### 3.3 Courbes et durées (jeu de valeurs, déjà présentes ou sourcées)

| Usage | Valeur | Source |
|---|---|---|
| Lié au défilement (plateaux) | `linear` sur la timeline ; forme donnée par les paliers des keyframes (tenue 23,08 % → 76,92 %) | kit.css:1139-1145 |
| Tranche d'étape / fondu enchaîné | 22,5 % de la plage `contain` / 0,3 tranche | kit.css:1118, 1137-1138 |
| Mot qui se lève (titres) | `cover` de 2 % + i×3 % à 24 % + i×3 % | kit.css:1091 |
| Dévoilement au temps (repli) | 0,55 s, `cubic-bezier(.2,.7,.2,1)`, cascade de 70 ms | kit.css:1072 |
| Accent (numéro, point qui s'allume) | 0,4 à 0,6 s, `cubic-bezier(.16,1,.3,1)` | kit.css:182, 289 |
| Relais de la barre | 240 ms, opacité et 6 px | decisions.md:51 |
| Compteur des chiffres (au temps) | ≈ 1,3 s, décéléré : `cubic-bezier(.16,1,.3,1)` | Durée : planche d'arceage-stats ; courbe : kit.css:182 |
| Aller-retour ambiant (héros) | 10 s, `cubic-bezier(.37,0,.63,1)` | cahier §3.5 (4), §6 |
| Poussée | 20 s, `cubic-bezier(.45,0,.55,1)` | kit.css:1156 |
| Apparition de la toile | 0,7 s, ease | kit.css:1154 |
| Lissage d'une valeur JavaScript | k = 0,10 à 0,115 par image | README Lenis ; cast-and-render.md:26 |

**Propriétés animées** : `transform`, `translate`, `scale`, `opacity`, et `clip-path` pour une entrée ponctuelle.
- **Jamais** `filter`, ni `width`, `height`, `top`, `left`, `padding` ou `margin` en transition : site-qa.mjs:458, et le flou
  animé mesuré à 500 ms de TBT (mémoire « cerveau site v2 »).
- **Le trait SVG** (`stroke-dashoffset`) n'est pas une propriété du compositeur : il se peint sur le fil principal. D'où
  bureau seulement, et une mesure dédiée (§3.4).

### 3.4 Risques et parades

| Risque | Parade | Vérifié par |
|---|---|---|
| **Accessibilité : mouvement déclenché par l'interaction.** WCAG 2.3.3 (AAA) : « Motion animation triggered by interaction can be disabled… » ; la parallaxe y est dite « often non-essential » (w3.org) | Tout sous `prefers-reduced-motion: no-preference` (kit.css:1075) ; état final visible en mouvement réduit | site-qa.mjs:410 ; K-3 |
| **Texte des étapes inactives à 45 % d'opacité** (kit.css:1143) : contraste peut-être sous 4,5:1 pour du texte courant | Mesurer. Si c'est trop bas, remonter le plancher des étapes inactives, pas celui des numéros (55 % = 3,2:1 pour les grands caractères, kit.css:1136) | Mesure de contraste dans le juge |
| **Scène décorative lue par un lecteur d'écran** | SVG et fiche `aria-hidden` ; le texte réel reste la liste `<ol>` des étapes | Lecture de l'arbre d'accessibilité |
| **Ancres** : un lien de barre traverse deux épinglages et le palier | Natif : `scrollIntoView` + `scroll-margin-top` (kit.js:246-253) ; avec Lenis : `lenis.scrollTo` avec décalage | K-5 |
| **Formulaire** : molette dans la zone de texte ; défilement doux après envoi (kit.js:280-289) | Aucun mouvement lié au défilement dans `#contact` ; avec Lenis, `prevent` sur le formulaire | demo-usage-qa ; K-6 |
| **Performance au téléphone** : médiane 0,97, une passe à 0,94 | 0 octet de JavaScript neuf au téléphone ; plan affiché déjà dessiné ; pas de peinture liée au défilement | Lighthouse, 5 passes, médiane ≥ 95 ; K-8 |
| **Coût de peinture du trait au bureau** | Bureau seulement ; mesurer les longues tâches pendant une traversée de `#etapes` à 1440×900 | K-9 |
| **Faux chiffre figé** (compteur lié au défilement) | Compteur **au temps**, déclenché une fois (classe `vu`, kit.js:158-159) | K-10 |
| **Pièces interdites par le juge** : bande qui défile, rideau, lentille | Aucune (site-qa.mjs:451) ; au moins 12 `.reveal` gardés (site-qa.mjs:445) | site-qa |
| **Vidéo de la landing** : les plans suivent l'ordre des sections et la fin de l'épinglage des étapes (demo-video.mjs:105-113, 287-293) | Tâche vidéo après le récit (comme 020-04) ; `video-qa --profil=landing` | video-qa |
| **Barre retenue** : relais « Devis » tous les 150 px sur une page plus longue (decisions.md:51) | Rejouer nav-retenue-qa | nav-retenue-qa |
| **Défilement doux au téléphone** : barre coupée déjà vue (capture citée au §2.3) | Pas de Lenis ni de `scroll-behavior: smooth` au téléphone ; `smooth` en CSS bloque le défilement programmé (mémoire « cerveau site v2 ») | demo-usage-qa mobile |
| **Lenis sur Safari** : plafonné à 60 images/s (README) | Seulement si Benj le retient sur film ; sinon, voie A | Film A/B |

### 3.5 Critères proposés pour le juge du récit (écrit par Claude Code, pas par l'exécutant)

- **K-1 — Ordre de la page** : `#prestations` < `#atelier` < `#etapes` < `#realisations` < `#communes` < `#questions` <
  `#contact`.
- **K-2 — Une seule étape active** : à 25, 50 et 75 % de la plage `contain` de `#etapes`, en 1440×900 et en 1088×800, une
  seule étape est pleine **et** un seul panneau de scène a une opacité ≥ 0,95, celui de la même étape.
- **K-3 — Mouvement réduit** : 4 étapes pleines, tracé complet, chiffres à leur valeur finale, sans défiler.
- **K-4 — Sans `view()`** (support simulé absent) : tracé complet et 4 étapes lisibles.
- **K-5 — Ancres** : un clic sur chacun des 4 liens de la barre amène le h2 cible entier sous la barre.
- **K-6 — Formulaire** : la molette dans la zone de texte fait défiler la zone, pas la page. Avec Lenis seulement.
- **K-7 — Juges existants verts** : site-qa, demo-usage-qa, nav-retenue-qa, `video-qa --profil=landing`.
- **K-8 — Téléphone** : Lighthouse mobile, médiane ≥ 95 sur 5 passes, et aucun fichier JavaScript neuf chargé à 390×844.
- **K-9 — Coût du défilement** : aucune longue tâche de plus de 50 ms pendant la traversée de `#etapes` au bureau.
  Seuil proposé : le seuil de « longue tâche » de Chrome (50 ms), à confirmer.
- **K-10 — Compteur** : 2 s après l'entrée du plateau, la capture montre 10 / 180 / 8.
- **K-11 — Propriétés animées** : aucune animation de `filter` ; aucune transition sur une propriété de mise en page
  (site-qa.mjs:458).

## 4. Découpage suggéré (périmètres disjoints)

**Obstacle** : les cinq familles d'effets de la vague 5 écriraient toutes dans `_kit/kit.css` et `generer.mjs`. Deux voies :
- **(a)** une **tâche socle** d'abord : generer.mjs concatène des fichiers par famille (`_kit/recit.css`, `survol.css`,
  `eclate.css`, `heros-video.css`) à côté de kit.css, là où il assemble styles.css (generer.mjs:342), et appelle un module
  de balisage par famille ;
- **(b)** les familles passent l'une après l'autre sur ces fichiers.

**Tâches du récit, avec la voie (a) :**
1. **Codex, sans sous-processus** : `_kit/recit.mjs` (ordre des sections pour Lestraque, SVG de la scène généré, spans des
   verbes et des mots de la citation, rouleaux des chiffres) et `_kit/recit.css`.
2. **Antigravity** : films 1440×900, 1088×800 et 390×844 ; variantes 300svh et 360svh ; A/B Lenis par injection locale ;
   Lighthouse 5 passes ; longues tâches.
3. **Claude Code** : juge K-1 à K-11, regard des films, présentation à Benj.

## 5. Questions pour Benj (goût seulement ; tout le reste est réversible et se tranche ici)

- **Q3** : proposition « pas de roulis pendant la descente ». Si tu veux plonger plus, on amplifie la plongée (δ), pas le
  roulis.
- **Q4** : proposition « au téléphone, même récit sans épinglage, en CSS pur, gardé par Lighthouse ≥ 95 », en tâche séparée.
- **Lenis** : tu choisis sur un film côte à côte (natif ou lissé). Sans avis, on reste en natif.

## Sources consultées

**Pages web :**
- MotionSites (connecteur, métadonnées) : https://motionsites.ai/?prompt=cast-and-render, `nimbus-sticky-cards`,
  `projects-catalog`, `layered-depth`, `art-landing`, `arceage-stats`, `scroll-marquee`, `nexacore-process`,
  `interior-features`, `scroll-landing`, `data-storytelling`, `3d-story`.
- La page publique https://motionsites.ai/?prompt=scroll-landing lue par WebFetch : galerie seule, aucune description.
- PromptedSite : https://promptedsite.com/t/sticky-content-switch, `stacking-cards-portfolio`,
  `superdesign-editorial-manifesto`, `terroir-tasting-room`, `forest-sage-organic-store`.
- Lenis : https://github.com/darkroomengineering/lenis (README) ; `npm view lenis` (1.3.26, MIT).
- WebKit, Safari 26.4 : https://webkit.org/blog/17862/webkit-features-for-safari-26-4/
- MDN `animation-timeline` : https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- MDN, fonctionnalités expérimentales de Firefox : https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features
- W3C WCAG 2.2, critère 2.3.3 : https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- GSAP : https://gsap.com/pricing/

**Fichiers du dépôt** : kit.css, kit.js, index.html, contenu.json et attributions.json de lestraque, generer.mjs,
next.config.mjs, site-qa.mjs, demo-video.mjs, nav-retenue-qa.mjs, demo-usage-qa.mjs, decisions.md, cahier 020-01,
cast-and-render.md, motionsites-recherche.md.
