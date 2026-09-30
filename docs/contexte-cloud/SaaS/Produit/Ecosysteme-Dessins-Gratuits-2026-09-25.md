# Dessins pixel art gratuits pour la station (Claw3D dans le Poste)

*Recherche du 25/09/2026, licences vérifiées par un second agent. Rien n'est téléchargé tant que Benj n'a pas dit oui.*

Tu parlais des dessins pixel art : la voie ci-dessous part donc de vrais sprites et de vraies tuiles dessinés à la main. Le code ne sert qu'à combler ce qu'aucun pack gratuit ne fournit. Je n'ai rien téléchargé. Je ne garde que les sources dont l'usage commercial a été confirmé à la vérification.

**1. La voie à 0 € pour chaque thème**

**Règles communes aux deux thèmes**
- **Grille :** une seule, de 16 px. Les packs en 32×32 se posent en blocs de 2×2 cases. Ceux en 18×18 (Kenney Pixel Platformer) et 24×24 (Hyptosis) sont écartés.
- **Taille des pixels :** on n'agrandit jamais un pack plus qu'un autre. On dessine toute la scène à 480×270, puis on l'agrandit d'un facteur entier sans lissage (imageSmoothingEnabled=false).
- **Palette :** une seule, de 24 à 32 couleurs (fond violet nuit, métal froid sur 4 tons, néon magenta, néon cyan, peaux, 6 couleurs d'agents).
  - Après le téléchargement, un script local ramène une fois pour toutes chaque pixel de chaque pack à la couleur la plus proche, sans trame sur les sprites.
  - Les couleurs des agents sont des numéros de palette : on obtient toutes les variantes en échangeant ces couleurs.
- **Lumière et contours :** lumière venant d'en haut à gauche, une seule règle de contour. Un dessin qui les contredit est retouché ou écarté.
- **Style :** un auteur donne le style de chaque thème, les autres packs s'alignent sur lui.

**Thème Station (vue en coupe, façon trevsagents) — style de référence : Ansimuz**
- **Cloisons, coursives, plafonniers :** Ansimuz Sideview Sci-Fi (décors bulkhead-walls, sci-fi-interior-platform, cyberpunk-corridor). RottingPixels complète avec des murs violet-magenta, des échelles, des gaines et des tuyaux.
- **Néons, enseignes, climatiseurs, fond en couches :** Ansimuz Warped City.
  - On prend les dessins seulement, jamais la musique.
  - Les enseignes en faux japonais (pseudo-katakana) sont à remplacer.
- **Meubles (terminaux, casiers, portes, couchettes, cuve, écrans) :** Ganamoda.
  - À trancher à l'œil : le premier vérificateur voit des objets vus de dessus en 3/4. L'autre cite une capture d'un utilisateur qui les pose en coupe, par étages.
  - Les objets vus de face (casiers, terminaux, portes) marchent dans les deux vues. Les bureaux et les chaises vus de dessus devront être redessinés de profil.
- **Personnages :** base zwonky Spacers.
  - 16 px de haut, avec déjà la course, la grimpe et la pose assise, en 4 couleurs.
  - C'est la bonne taille pour voir toute la station d'un coup, avec des étages de 48 à 64 px.
  - Option : CraftPix Free 3 Cyberpunk (48 px, palette magenta et cyan, marche), seulement si l'on ajoute une vue « zoom sur une salle ». Dans la vue d'ensemble, un personnage de 48 px remplit un étage entier.
- **En appoint :** Eris (planchers et panneaux à lumière cyan).

**Thème Vaisseau (vue de dessus, façon androoagi) — style de référence : Ansimuz Tech Lab**
- **Sols, murs à consoles, portes de sas, bandes de danger :** Warped Top-Down Tech Lab, volumes 1 et 2. Leurs tuiles de 32×32 occupent 2×2 cases.
- **Sol en hexagones :** on part du motif d'Emcee Flesher (en choisissant la licence CC0).
  - On le recolore en bleu et cyan.
  - Au besoin, on le redessine dans Pixelorama, qui gère les tuiles hexagonales.
- **Tapis roulants, tuyaux, machines, grue :** Kenney Tiny Factory.
  - Son style plat jure avec le détail d'Ansimuz.
  - On s'en sert comme modèle (formes, sens de défilement, images d'animation) qu'on redessine au style Tech Lab. On ne le pose pas tel quel.
- **Meubles et machines des salles :** Ganamoda (sa vue en 3/4 va très bien ici).
- **Bordures des modules :** Buch Sci-fi Interior tiles, en appoint.
- **Personnages vus de dessus :** Shade Puny Characters.
  - Ils marchent dans 8 directions, en 16 px dans une case de 32.
  - Leurs tenues fantasy sont à repeindre en combinaisons.

**Communs aux deux thèmes**
- **Nébuleuse :** générée en code avec simplex-noise, tramée sur la palette, calculée une fois puis gardée en mémoire. Solution de repli : Screaming Brain Seamless Space Backgrounds, réduit et ramené à la palette.
- **Portraits :** DiceBear, styles Pixel Art, Pixel Art Neutral et Pixelbot.
  - Générés dans le navigateur par le paquet npm, jamais par leur API en ligne.
- **« Zz », « ! », étincelles :** dessinés par nous (quelques pixels, une police de 3×5). En complément, les arcs électriques de Ganamoda ; Kenney Emotes en option.
- **Minicarte :** la coque octogonale de ChaosShark, en effaçant le mot « NAME » peint dessus.
- **Outils de dessin gratuits et sans compte :** Piskel (hors ligne) et Pixelorama (version web).
- **Code de référence :** le moteur de Pixel Agents (personnage qui marche jusqu'au bureau, s'assoit, cherche son chemin). Seulement le code, jamais son dossier d'images.

**2. Packs que le propriétaire doit autoriser avant tout téléchargement**

**Lot A — indispensables : environ 15,5 Mo, plus Kenney Tiny Factory (taille non affichée)**
1. **190+ Pixel Art Assets (Sci-fi & Forest)**
   - URL : https://opengameart.org/content/190-pixel-art-assets-sci-fi-forest
   - Auteur : Ganamoda (Sunnyside Games)
   - Licence : CC0
   - Crédit : aucun obligatoire (« Ganamoda » par politesse)
   - Taille : 8,2 Mo (la moitié forêt est inutile)
2. **Sideview Sci-Fi – Patreon Collection**
   - URL : https://opengameart.org/content/sideview-sci-fi-patreon-collection
   - Auteur : Luis Zuno (Ansimuz)
   - Licence : CC0
   - Crédit : aucun (apprécié)
   - Taille : 2,5 Mo
3. **Warped City**
   - URL : https://opengameart.org/content/warped-city
   - Auteur : Ansimuz
   - Licence : CC0 pour les dessins
   - Crédit : aucun pour les dessins. La musique de Pascal Belisle exige un crédit : on ne la prend pas.
   - Taille : 4,3 Mo
4. **2D Sci-Fi Platformer Tileset [16x16]**
   - URL : https://opengameart.org/content/2d-sci-fi-platformer-tileset-16x16
   - Auteur : Rotting Pixels
   - Licence : CC0
   - Crédit : aucun
   - Taille : 54,4 Ko
5. **Spacers**
   - URL : https://opengameart.org/content/spacers
   - Auteur : zwonky
   - Licence : CC0 (la page indique « None » au champ du crédit)
   - Crédit : aucun
   - Taille : 3,2 Ko + 3,3 Ko
6. **Tiny Factory**
   - URL : https://kenney.nl/assets/tiny-factory
   - Auteur : Kenney
   - Licence : CC0
   - Crédit : aucun. Le logo Kenney est interdit.
   - Taille : non affichée (130 fichiers)
7. **Warped Top-Down Tech Lab, volumes 1 et 2**
   - URL : https://opengameart.org/content/warped-top-down-tech-lab et https://opengameart.org/content/warped-top-down-tech-lab-2
   - Auteur : Ansimuz
   - Licence : CC0
   - Crédit : facultatif
   - Taille : 55,3 Ko + 45,1 Ko
8. **Sci-Fi RogueLike Pixel Art**
   - URL : https://opengameart.org/content/sci-fi-roguelike-pixel-art
   - Auteur : Emcee Flesher
   - Licence : double, OGA-BY 3.0 ou CC0. On choisit CC0, par écrit, dans le fichier qui garde la trace des sources.
   - Crédit : aucun
   - Taille : 9 images PNG de 1,2 à 25,3 Ko chacune, moins de 230 Ko en tout
9. **Puny Characters**
   - URL : https://opengameart.org/content/puny-characters
   - Auteur : Shade
   - Licence : CC0 (la page autorise l'usage commercial)
   - Crédit : aucun
   - Taille : 236 Ko (on ne prend pas la version à 510,7 Ko avec les orcs)
10. **Sci-fi Interior tiles**
    - URL : https://opengameart.org/content/sci-fi-interior-tiles
    - Auteur : Michele « Buch » Bucelli
    - Licence : CC0
    - Crédit : aucun
    - Taille : 13,4 Ko

**Lot B — à autoriser seulement si le besoin se confirme**
- **Eris — Sci-fi platform tiles**
  - URL : https://opengameart.org/content/sci-fi-platform-tiles
  - Licence : CC0, sans crédit
  - Taille : 150,1 Ko (version 16×16 seulement)
- **Free 3 Cyberpunk Sprites**
  - URL : https://free-game-assets.itch.io/free-3-cyberpunk-sprites-pixel-art
  - Auteur : CraftPix
  - Licence : licence « Freebie » de CraftPix, usage commercial permis sans attribution
  - Taille : 71 Ko (non vérifiée)
  - À télécharger sur itch à 0 € ou sur craftpix.net. Si craftpix.net demande un compte, on s'arrête.
  - Jamais la copie d'OpenGameArt : elle est sous OGA-BY 3.0, avec un crédit obligatoire.
  - Conditions :
    - le Poste de contrôle ne doit offrir aucune fonction pour enregistrer ou exporter ces dessins ;
    - interdiction d'entraîner une IA dessus.
- **Seamless Space Backgrounds**
  - URL : https://opengameart.org/content/seamless-space-backgrounds
  - Auteur : Screaming Brain Studios
  - Licence : CC0, sans crédit
  - Taille : 7,9 Mo en 512×512 (la version 1024, 26 Mo, est inutile)
- **Emotes Pack**
  - URL : https://kenney.nl/assets/emotes-pack
  - Auteur : Kenney
  - Licence : CC0, sans crédit
  - Taille : non affichée (480 fichiers)
- **Sci Fi Top Down Centrifuge Space Station**
  - URL : https://opengameart.org/content/sci-fi-top-down-centrifuge-space-station
  - Auteur : ChaosShark
  - Licence : CC0
  - Taille : 13,9 Ko
- **Sci-Fi Facility Asset Pack**
  - URL : https://opengameart.org/content/sci-fi-facility-asset-pack
  - Auteur : HaywardMorihara (murphysdad)
  - Licence : CC0. Crédit « Pixel art by murphysdad » par courtoisie.
  - Taille : 28,9 Ko
  - Ne pas reprendre l'image de couverture : sa police n'est pas incluse.
- **32 x 32 Portraits**
  - URL : https://opengameart.org/content/32-x-32-portraits
  - Auteur : Seafood5040
  - Licence : CC0
  - Taille : 65,9 Ko
  - Seulement si les portraits DiceBear déplaisent.
- **Glitch furniture - Spaceship**
  - URL : https://opengameart.org/content/glitch-furniture-spaceship
  - Auteur : Tiny Speck, fichiers nettoyés par anarres
  - Licence : CC0
  - Taille : 15 fichiers SVG de 15,6 à 325,8 Ko
  - Ce sont des dessins vectoriels à convertir en pixels. Ne jamais afficher la marque Glitch.

**Code et outils : pas des images, mais `npm install` reste un téléchargement à autoriser**
- **simplex-noise**
  - URL : https://github.com/jwagner/simplex-noise.js
  - Licence : MIT. Sa mention de licence doit rester dans le code livré.
  - Taille : environ 2 Ko. Le paquet alea, qui sert aux graines, est à contrôler à l'installation.
- **@dicebear/core et ses styles**
  - URL : https://www.dicebear.com/styles/pixel-art/
  - Licence : les styles sont en CC0 ; le code est sous MIT (Florian Körner), mention à garder.
- **Si l'on reprend un shader de nébuleuse :**
  - le composant Nebula de starbase (MIT, fusionné dans le dépôt par la PR n° 7) ;
  - PixelSpace de Deep-Fold (MIT pour le code, mais « do not distribute or sell any generated images on their own ») ;
  - space-2d (Unlicense, domaine public).
  - La mention MIT reste dans le code repris.
- **Pixel Agents**
  - URL : https://github.com/pixel-agents-hq/pixel-agents
  - Licence : MIT, « Copyright (c) 2026 Pablo De Lucca ». Le code seulement, pas les images.
- **Piskel** (Apache-2.0) et **Pixelorama** (MIT). Pour Pixelorama, la version web gratuite suffit : ne pas acheter la version Steam.

**Refusés après vérification (usage commercial non confirmé)**
- Not Jam Space Generator : licence jamais lue, et le dépôt GitHub n'a aucune licence.
- PixelPlanetsPlus : la chaîne des droits est cassée, le fork de Timur310 n'ayant jamais eu de licence.
- Pixelship : licence non confirmée.
- Galacti-Chron : fichiers retirés.
- Images de Star-Office-UI : réservées à un usage non commercial.
- CryPixels : payant.
- Générateur de Lospec : licence floue.
- FLUX avec un LoRA pixel art : compte obligatoire, et le LoRA cité sert en réalité SDXL, pas FLUX.

**Licence correcte, mais écartés parce qu'ils ne servent pas le besoin**
- Kenney Pixel Platformer (grille de 18).
- Hyptosis 24× (grille de 24, pack incomplet).
- Kenney 1-Bit, Roguelike Characters, Roguelike Indoors et les autres packs Kenney.
- surt (palette Apple II ; utile seulement comme exemple de composition).
- Jesse McCarthy (CC-BY 3.0, gris terne).
- Hyptosis Cyberpunk Portraits (pas du pixel art).
- Universal LPC : style fantasy, et des pièces en CC-BY-SA ou GPL dont le partage à l'identique s'étendrait aux vidéos de démo. Son code GPL ne doit jamais entrer dans le code livré.
- Sprite Forge, pixel-sprite-generator, proceduralart : à lire comme exemples de code, pas comme dessins.

**3. Ce qu'aucun pack ne fournit et qu'il faudra dessiner (une vingtaine de sprites clés)**

**Station**
- La coque octogonale en coupe (contour, rivets, liseré néon), l'antenne du toit et la salle de réunion au hublot rond. Le hublot peut montrer la nébuleuse.
- Les ascenseurs : la gaine et la cabine animée. Les échelles de RottingPixels ne suffisent pas.
- Les bureaux et les chaises de profil, les baies de serveurs avec des voyants qui clignotent (2 à 3 images).
- Les personnages :
  - marche sur 4 images ;
  - au poste, assis et en train de taper, sur 2 images ;
  - 6 couleurs obtenues en échangeant la palette.
  - zwonky donne la pose assise et une course sur 2 images. Il manque 2 images de marche et l'animation de frappe.
- La touche magenta sur les meubles de Ganamoda, qui sont d'origine verts et cyan.

**Vaisseau**
- La tuile hexagonale bleu et cyan définitive : le motif d'Emcee Flesher est beige et daté.
- Les tapis roulants et les machines redessinés au style Tech Lab, avec l'animation de défilement.
- Les sas entre les modules (les portes de Tech Lab donnent la base) et le contour extérieur des modules sur fond d'espace.
- Les personnages en combinaison, et une pose « au poste » vue de dessus.

**Communs**
- Les « Zz » et les étincelles (rapide à faire).
- Les halos des néons, sur un second canvas en mode « lighter ».
- La police de 3×5.

**4. Risques**

**Qualité**
- **Les personnages sont le point faible.** Aucun pack gratuit ne propose un employé sci-fi qui marche jusqu'à son bureau puis s'y assoit, dans les deux vues et à la bonne taille. C'est pourtant ce qui fait le charme des vidéos.
  - Un personnage de 16 px dessiné par un agent sort souvent médiocre.
  - Parade : des silhouettes simples, une retouche dans Piskel, et un juge visuel indépendant qui capture lui-même le rendu.
- **Des aperçus pas tous revus.** Pour Ganamoda, la note de 5 donnée à la seconde vérification repose sur les commentaires de la page : le vérificateur n'a pas vu l'image. Le premier vérificateur l'a vue et met 4. Les aperçus de Sideview, CraftPix et Screaming Brain n'ont pas non plus été revus par le vérificateur.

**Cohérence entre packs**
- **Six auteurs, six styles :** Ansimuz détaillé, Kenney plat, Ganamoda aux ombres douces, zwonky en palette Arne16. Sans palette commune et sans retouche, la scène aura l'air d'un collage.
- **Des vues mêlées :** le 3/4 de Ganamoda face à une coupe stricte, le dessus pur de Tiny Factory face aux murs en 3/4 de Tech Lab.
- **Les grilles :** tout ce qui n'est pas un multiple de 16 est exclu, et on n'agrandit jamais un pack seul.

**Licences**
- **CraftPix :**
  - la licence change selon le site où on le prend ;
  - aucune fonction d'export des dessins dans le Poste ;
  - pas d'entraînement d'IA.
- **Emcee Flesher :** noter le choix de CC0 par écrit.
- **Warped City :** pas la musique.
- **Deep-Fold :** jamais un fond proposé en téléchargement seul.
- **Marques et éléments de tiers :** pas de logo Kenney, pas de marque Glitch, pas de « NAME » ChaosShark, pas de couverture HaywardMorihara. Les mentions MIT restent dans le code livré.
- **Pages itch.io :** elles renvoient une erreur 403 ici. Toutes les licences retenues ont été lues sur OpenGameArt, kenney.nl, GitHub ou craftpix.net, sauf la copie itch de CraftPix.
- **Pages qui changent :** une page peut évoluer. Au moment du téléchargement, garder une capture de la page de licence et un fichier de provenance par pack : URL, date, auteur, licence, empreinte du zip.

**5. En clair**

Avec ces packs et une vingtaine de sprites dessinés par nous, on peut obtenir la même famille visuelle que les vidéos : même palette, mêmes néons, même type de décor, même fond violet.
- **Vaisseau** s'en approche le plus : Tech Lab, Tiny Factory et Ganamoda couvrent l'essentiel.
- **Station :** Ansimuz donne des coursives au niveau des vidéos. Mais la silhouette octogonale, les meubles de profil et les agents au travail seront à dessiner par nous.

Mon estimation : une ambiance reconnaissable, à environ 70 % du rendu des vidéos, mais pas l'unité d'un dessin fait par un seul artiste. L'écart se jouera sur les personnages et sur l'harmonisation, et la réaction de Benj restera la vraie mesure.
