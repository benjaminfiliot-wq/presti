# Rapport — 021-22 : le relevé au trait du tronçon d'escalier, le fond des rendus, la recopie de l'éclaté

Produit par un agent de Claude Code le 2026-09-15 (Codex et Antigravity à court de quota), depuis les rendus retenus de 021-04.

## Le point de départ : quel script, quels rendus

- **Rendus retenus** : les six AVIF et `eclate.json` de `.orchestre/preuves/021-04/rendus/`, recopiés octet pour octet
  (`cp`, sha256 identiques) dans `rendus/`. Ce sont ceux du 2e rendu (021-04b), regardés par Claude Code.
- **Script de la scène** : ces rendus sortent de `021-04b/outils/marche.py` (Cycles, limon de 68 mm entaillé de 17 mm, caméra
  orthographique calée sur l'union des deux vues), et non de `021-04/render.py` (16 h 47) ni de `build_render.mjs` (15 h 57),
  qui sont les scripts du 1er rendu refusé : autre géométrie, autre caméra, EEVEE. Un trait tiré de `render.py` ne tomberait sur
  aucune arête du rendu retenu. J'ai donc recopié dans la preuve `marche.py` et `construire.mjs` (le script d'assemblage et
  d'encodage), et `releve.py` reprend la scène de `marche.py` mot pour mot pour tout ce qui fixe le cadre.
- **Témoin de caméra** : `releve.py` imprime l'échelle orthographique et la projection de la cote d'`eclate.json` ; il redonne
  2,367693880419882 m (celle de `021-04b/brut/scene.json`) et (0,683534 ; 0,449099) → (0,683534 ; 0,469252), à l'identique.

## Fond des rendus : copie, pas de nouveau rendu

Points lus avec `sharp(f).ensureAlpha().raw()` sur `rendus/assemble.avif` et `rendus/eclate.avif` : (0, 0), (700, 0),
(1399, 0), (0, 525), (1399, 525), (0, 1049), (700, 1049), (1399, 1049). Les huit points valent **rgba(21, 17, 14, 255)** dans
les deux images : opaques, à 1 niveau de #14110E. Décision : **copie telle quelle**, aucun rendu relancé (le fond #14110E était
déjà posé par `construire.mjs` de 021-04b). Le juge le confirme : rendus identiques à 021-04, pas de nouveau rendu à juger.

## Outil de trait : Freestyle

- **Retenu : Freestyle** (`scene.render.use_freestyle = True`, `view_layer.use_freestyle = True`), moteur EEVEE,
  `film_transparent = True`, `view_layer.use_solid = False` (seules les lignes sont rendues), `line_thickness_mode = 'ABSOLUTE'`,
  style de ligne créé par `bpy.data.linestyles.new('trait')` (avec `--factory-startup` le jeu de lignes n'en a pas), blanc,
  épaisseur 2 px centrée, bouts ronds ; lignes **visibles** seulement : silhouette, contour, contour extérieur, bords, plis
  (angle de pli 134°).
- **Pourquoi pas Line Art** : il faut un objet Grease Pencil, le rendre à la même caméra et régler son occlusion ; Freestyle
  trace directement depuis la caméra du rendu, dans la même scène, sans objet de plus, et se relance en 6 à 10 s sur cette
  machine. La recette de la fiche a marché du premier coup.
- **Biseaux** : coupés au rendu (`show_render = False` sur chaque modificateur `BEVEL`). Avec eux, un angle de 90° devient trois
  pans de 30° que Freestyle ne voit pas comme un pli, et les nez de marche disparaissent. La surface évaluée que le juge mesure
  (réglages de la vue) les garde.
- **Vis** : cachées au rendu (`hide_render`), et les fraisages des marches bouchés au rendu (booléens `creuse-fraise-*` en
  `show_render = False`) : un relevé se fait avant la pose, et sinon douze cercles vides apparaîtraient sur les marches.
- **Noms** : la marche du haut, `marche-3` dans `marche.py`, est renommée `marche` (elle porte la cote « 40 mm ») ; `limon`
  garde son nom.

## Commande et version

- **Blender 5.2.1 LTS** (hash 9e2066aef7ef, 2026-08-25).
- Commande exacte :
  `"C:/Program Files/Blender Foundation/blender.exe" --background --factory-startup --python-exit-code 1 --python .orchestre/preuves/021-22/releve.py -- C:/Users/benja/Documents/presti/.orchestre/travail/021-22/b2`
  (sorties `releve.png` et `releve.json` dans ce dossier seulement ; rendu du trait en 6,3 s, 10 s avec le démarrage).
- Encodage : `node .orchestre/travail/021-22/construire-releve.mjs .orchestre/travail/021-22/b2 60` : l'alpha de `releve.png`
  tel quel, le RVB posé à (244, 237, 226), puis `avif({ quality: 60, effort: 9, chromaSubsampling: '4:4:4' })`.

## Le relevé

- **Qualité AVIF 60**, **12 100 octets** (plafond 15 000), 1400 × 1050 avec alpha ; 98,2 % du cadre transparent ; 15 116 pixels
  de trait (alpha > 128).
- Mesures du juge (`juge/mesures.json`) : 93,7 % du trait sur une arête du rendu assemblé (85 % au moins) ; contour de la
  silhouette tracé à 87,1 % (70 %) ; arêtes intérieures tracées à 73,2 % (60 %) ; concordance avec le trait relancé 100 % dans les
  deux sens ; médiane du trait rgb(244, 238, 226). Ce qui reste orange sur `juge/alignement.jpg` : les têtes de vis (non dessinées,
  voulu) et quelques veines du bois.

## Dimensions lues dans le script (`marche.py`)

- **Épaisseur des marches** : `EP_MARCHE = 0.040`, 40 mm ; biseau des marches 3 mm, 2 segments.
- **Profondeur des entailles** : `ENTAILLE = 0.017`, 17 mm, sur la face intérieure du limon (`X_INT = X0 + ENTAILLE`) ; le fond
  de l'entaille est à `X0 − JEU`, avec `JEU = 0.0005` : 17,5 mm depuis la face du limon. Limon de 68 mm (`EP_LIMON`).
- Contrairement au `render.py` du 1er rendu, les marches **entrent** dans les entailles (de 17 mm) : le fond est caché par la
  marche dans la vue assemblée.

## Les deux cotes (`releve.json`, projetées par Blender)

- **« 40 mm », pièce `marche`** : a = (0,396 ; 0,45 ; 0,54), b = (0,396 ; 0,45 ; 0,50) m, sur l'arête verticale du nez de la
  marche du haut, à son bout droit ; 21,2 px à l'écran ; extrémités à 0,2 et 0,1 px du trait ; a et b à 1,24 mm au plus de la
  surface biseautée ; 40,0 mm dans le modèle.
- **« 17 mm », pièce `limon`** : a = (−0,383 ; 0,2095 ; 0,3605) m, coin avant-haut de la bouche de l'entaille de la marche du
  milieu, sur la face intérieure du limon ; b = (−0,4005 ; 0,2095 ; 0,3605) m, le même coin au fond de l'entaille ; 8,5 px à
  l'écran ; extrémités à 0,6 px (a, visible) et 6,8 px (b, caché) du trait ; a et b sur la surface (0,00 mm).

## Écarts

- **« 17 mm » mesure 17,5 mm dans le modèle** : le fond de l'entaille est à 0,5 mm au-delà de 17 mm (le jeu laissé autour de la
  marche). L'écart est sous les 2 mm tolérés, et la cote reste « 17 mm », la profondeur voulue par le script.
- **Le fond de l'entaille est caché** : la marche remplit l'entaille. La cote part du coin visible de sa bouche et s'enfonce
  dans le limon ; son extrémité b tombe sur la face du limon, à 6,8 px du trait.
- **« 40 mm » est prise 4 mm avant le bout de la marche** : au coin même, le biseau de 3 mm creuse le bois de 2,2 mm sous le
  point vif (le juge exige 2 mm au plus) ; 4 mm plus loin, sur les arêtes du dessus et du dessous du nez, l'écart tombe à
  1,24 mm et la cote garde 40,0 mm. Elle se déplace de 1,8 px à gauche de la cote d'`eclate.json`.
- **Script recopié** : `marche.py` au lieu de `render.py` (voir plus haut).

## Recopie

`public/sites-demo/lestraque/eclate/` : les six AVIF et `eclate.json` depuis `rendus/`, `releve.avif` et `releve.json` depuis la
preuve (copies d'octets, sha256 vérifiés), et `attributions.json` (sept entrées « rendu », une par AVIF, auteur Presti).
