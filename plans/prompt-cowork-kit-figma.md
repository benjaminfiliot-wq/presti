# Prompt Cowork — le kit Figma des sites d'artisans Presti

> À coller tel quel dans Cowork, avec le connecteur Figma branché et, si possible, l'accès au dossier
> `C:\Users\benja\Documents\presti`. Écrit par Claude Code le 15/09/2026 à partir du vrai générateur de sites
> (`public/sites-demo/generer.mjs`, `_kit/da.json`, `site.json`, `contenu.json`) et de la démo Atelier Lestraque.

---

## Ta mission

Construis dans Figma **le kit de sites vitrines d'artisans de Presti**. C'est un fichier unique qui contient :
- le système de design, en variables ;
- tous les composants d'une page d'artisan ;
- la bibliothèque des animations ;
- les gabarits de pages.

Il sert à une chose : quand un artisan commande un site, il n'envoie que ses photos et ses informations, puis on choisit
quelques variables (ambiance, héros, ordre des scènes, geste signature), et le site sort original, sans repartir de zéro.

Le kit est le miroir exact du générateur de Presti : les noms Figma sont les noms du code. Un site généré et un écran du kit
doivent pouvoir se comparer case par case.

**Référence de niveau** : MotionSites (motionsites.ai), les meilleurs sites, pas la moyenne. **Référence de contenu** : la démo
en ligne https://prestiapp.fr/sites-demo/lestraque/index.html (Atelier Lestraque, menuisier fictif à Rennes). Tous les exemples
du kit utilisent ses vrais textes, jamais de lorem ipsum.

## Où lire la vérité (si tu as accès au dossier)

- `public/sites-demo/_kit/da.json` : les directions artistiques. L'entrée `lestraque` est la référence ; `_` porte les
  valeurs communes.
- `public/sites-demo/lestraque/site.json` : le dossier de l'artisan (metier, nom, telephone, siren, decennale, communes,
  metiers_secondaires, pages, da, devis, artisan, plateau).
- `public/sites-demo/lestraque/contenu.json` : les textes.
- `public/sites-demo/lestraque/attributions.json` : les photos et leurs licences.
- `public/sites-demo/generer.mjs` : l'ordre et le balisage des scènes.
- `public/sites-demo/_kit/kit.css` et `kit.js` : les animations réelles (durées, courbes, déclencheurs).
- `.orchestre/preuves/020-01/cahier/cahier-des-charges.md` : le moment signature (geste au repos, descente).

Sans accès au dossier, travaille avec ce prompt et la démo en ligne. Quand une valeur ne se lit pas sur la page, écris
« à relever dans le code » au lieu d'inventer.

## Structure du fichier Figma

Crée un nouveau fichier **« Presti — Kit sites d'artisans »** dans les brouillons, avec ces pages, dans cet ordre.

### 0 · Mode d'emploi
- En une page : ce que le client envoie, les variables à choisir, comment un gabarit devient un site, et ce qui n'existe
  qu'en code (voir « Animations »).

### 1 · Fondations (variables)
Quatre collections de variables. Les noms de variables reprennent **exactement** les clés du code.

1. **DA** : un mode par direction artistique. Crée au moins `lestraque`, puis `menuisier`, `plombier`, `electricien`,
   `macon`, `peintre`, `carreleur`, `couvreur`, `serrurier` et `chauffagiste`, avec les valeurs de `da.json`.
   - Couleurs : `accent`, `accentTexte`, `fond`, `fond2`, `encre`, `encre2`, `ligne`.
   - Formes : `rayon`, `ombre`, `grain`, `texture` (papier, grain ou aucune).
   - Typographie : `display`, `texte`, `graisse`, `graisseLigne`, `approche` (espacement des lettres).
2. **Échelle** : la typographie et les espacements fluides, chacun documenté par sa valeur à 390 px et à 1440 px
   (le code utilise des `clamp()`).
3. **Mouvement** : les durées, les courbes (`cubic-bezier` du kit) et les décalages en cascade. Ajoute un mode
   `mouvement-réduit` où les durées tombent à 0 ou à un simple fondu.
4. **Contenu** : ce que le client fournit.
   - Textes : `nom`, `metier`, `ville`, `telephone`, `siren`, `decennale`, `communes`, `kicker`, `h1`, `chapeau`, la
     citation du plateau, trois chiffres avec leur unité et leur légende, les prestations, les étapes, la FAQ.
   - Booléens, un par option du code : `etapesMonumentales`, `communesMonumentales`, `navRetenue`, `relief`, `heroVideo`,
     `recitDefilement`, `survolRevele`, `objetDecompose`.

Ajoute une vérification de contraste sur chaque mode de DA :
- titre sur photo ≥ 3,0 (règle R-12 du cahier signature) ;
- texte courant ≥ 4,5 ;
- bouton ≥ 4,5.

### 2 · Composants
Des composants à variantes et à propriétés, en auto layout, nommés comme les classes du kit :

- `nav` : claire / sombre, solide, retenue. Barre retenue : un seul appel visible à la fois, le bouton du héros puis
  « Devis » dans la barre ; au bureau, ni numéro ni burger dans la barre.
- `bouton`, avec son cercle et sa flèche.
- `panneau` : le menu mobile.
- `hero` : `plein`, `plein + vidéo`, `page`, `commune`, avec l'option `portrait`. Surtitre, `h1` en mots, chapeau, appel.
- `plateau` : la citation signée de l'artisan et trois chiffres.
- `prestations` : la liste éditoriale au bureau, le rail horizontal au téléphone.
- `atelier` : la photo plein cadre et sa phrase.
- `galerie` : la scène en perspective, sa jauge et les crédits photo.
- `etapes` : les numéros monumentaux, la tête épinglée, la jauge, la photo.
- `communes` : les communes monumentales et leurs liens.
- `faq-scene` : la photo et les questions dépliables.
- `contact` : le formulaire de devis de démonstration (champs `devis-projet`, `devis-commune`, `devis-delai`,
  `devis-message`), les infos et la photo de matière.
- `pied`, `credits`, `ariane`.

Chaque composant existe en 1440 et en 390 px de large.

### 3 · Animations (la bibliothèque)
Une fiche par animation. Chaque fiche contient :
- le déclencheur (chargement, défilement, survol, souris, au repos) ;
- les propriétés animées (transform et opacity uniquement) ;
- la durée et la courbe (variables de la collection Mouvement) ;
- le comportement au téléphone et en mouvement réduit ;
- le fichier et la classe du kit ;
- un prototype Figma quand Figma sait le montrer (Smart Animate, interactions au défilement ou au survol).

Quand Figma ne sait pas le montrer, écris **« code seulement »** et joins une suite d'images-clés.

Les animations à documenter :
- entrées : mots du titre qui se lèvent, révélations au défilement, poussée lente de la photo du héros ;
- ouverture : le plateau noir qui monte sur le héros collant ;
- étapes épinglées qui s'allument une à une, galerie en travelling ;
- barre retenue : le relais entre le bouton du héros et « Devis » ;
- relief de la photo qui suit la souris (WebGL, code seulement) ;
- **moment signature** : la cage de l'escalier qui tourne lentement au repos, avec une lumière rasante sur les marches ;
  puis la descente vers le puits au premier défilement ;
- **vague 5** : le récit raconté au défilement, le défilement fluide, la vidéo dans le héros, la révélation au survol,
  l'objet décomposé en vue éclatée.

### 4 · Gabarits
Des pages complètes, assemblées avec les composants et les variables, dans l'ordre des scènes du générateur :
- **accueil** : héros, plateau, prestations, atelier, galerie, étapes, communes, questions, contact, pied ;
- **page commune** ;
- **mentions légales**.

Chaque gabarit existe en 1440×900 et en 390×844. La démo Atelier Lestraque est l'instance de référence, avec ses vraies
photos (voir « Photos ») et ses vrais textes.

### 5 · Recettes d'originalité
Écris 6 à 8 recettes, pour que deux artisans du même métier n'aient pas le même site. Une recette combine :
- un mode de DA ;
- un type de héros ;
- un ordre de scènes ;
- un geste signature ;
- les options activées.

Pour chaque recette, donne une maquette d'accueil en 1440 et en 390, et ce qui la rend reconnaissable.

Règles de combinaison :
- un seul moment signature par page ;
- un mouvement principal par écran ;
- l'appel au devis toujours visible, une seule fois à l'écran.

### 6 · Fiche client
Ce que l'artisan envoie, relié aux variables de la collection Contenu :
- les photos : liste des cadrages attendus (héros, atelier, ouvrages, étapes, portrait), avec le rapport et la taille minimale
  (2 400 px sur le grand côté) ;
- les licences et crédits ;
- les textes et les chiffres ;
- les communes servies.

## Photos
Utilise les photos de la démo, dans `public/sites-demo/lestraque/images/`, en remplissage d'image, et reporte leur crédit
depuis `attributions.json`. Ce sont des photos Wikimedia Commons sous licence libre : le crédit est obligatoire. Sans accès
au dossier, mets des cadres gris nommés par leur rôle (`photo · héros · 3:2`), jamais une photo trouvée ailleurs.

## Règles
- Français partout, dans les noms comme dans les textes.
- Aucune donnée réelle d'un vrai client. Les exemples sont ceux de l'artisan fictif, marqués « exemple ».
- Ne publie rien dans la communauté Figma et ne partage le fichier avec personne.
- N'invente aucune valeur de code : si elle manque, écris « à relever dans le code ».
- Garde les noms du code, même s'ils sont moins jolis : c'est ce qui permettra plus tard de générer un site depuis le kit.

## À la fin, rends
1. Le lien du fichier Figma.
2. Ce qui est fait, page par page, et ce qui manque.
3. La liste des animations marquées « code seulement ».
4. Un export JSON des variables des collections DA et Contenu, dont les clés reprennent celles de `da.json` et `site.json`.
   Un futur générateur pourra ainsi lire le kit.
