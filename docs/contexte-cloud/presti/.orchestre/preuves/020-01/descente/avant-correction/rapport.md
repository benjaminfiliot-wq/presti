# Descente au défilement — films pour Q2 (tâche 020-01, point 4)

15/09/2026. Dossier : `signature/films/descente/`. Page filmée : https://prestiapp.fr/sites-demo/lestraque/index.html, identique au dépôt (md5 de `styles.css` et `index.html` égaux à `public/sites-demo/lestraque`). Rien n'a été écrit dans `presti/`.

## Ce que Benj regarde

| Film | Ce qu'il montre | Planche |
|---|---|---|
| `descente-d116.mp4` (a) | Plongée δmax = 0,116 (toile à dpr 1), palier, fondus, titre immobile | `planche-a.jpg` |
| `descente-d066.mp4` (b) | La même plongée à δmax = 0,066 (écrans à dpr 1,5) | `planche-b.jpg` |
| `descente-sansgpu.mp4` (c) | Sans WebGL : zoom 1 → 1,04, fondus, titre immobile (la grille et les visiteurs sans WebGL) | `planche-c.jpg` |
| `descente-d116-roulis.mp4` (a′, en plus, pour Q3) | (a) avec le roulis du §2 : ρ = −76,923·δ, soit −8,9° en fin de palier | `planche-a-roulis.jpg` |

Chaque film dure 8 s, en 1440×900 à 30 images/s, h264 yuv420p, sans son (ffprobe : 240 images, 8,000 s). Parcours : 0,5 s à y = 0, puis défilement sinusoïdal jusqu'à y = 1170 (plateau entré) en 7 s, puis 0,5 s à l'arrêt. Le palier (y de 0 à 270) occupe 2,17 s du film. Une vraie molette le traverse bien plus vite : le film ralentit le geste pour qu'on le juge.

Six images-clés par film dans `images-cles/` (y = 0, 90, 180, 270, 518, 1170). Loupes 1:1 du bois : `loupe-bois.jpg`, `loupe-marches.jpg`.

## Comment c'est fait (déterministe)

- **Navigateur.** Chromium de Playwright (Chrome 153.0.8010.12), `chromium.launch()` sans drapeau. `data-relief-etat` vaut `sans` à 8 s, dans les quatre films et les témoins : le relief refuse bien le rendu logiciel.
- **Injection.** Classe `da--signature` sur `<html>`, puis le **bloc 2 du §7.3 recopié tel quel**. Avant l'injection, la page ne contient aucune règle `signature`.
  - Harnais de test : `html{scroll-behavior:auto!important}`, et la règle du titre transparent du §8.0, activée par une classe.
- **Perspective (a, b, a′).** `rendu.mjs` applique le modèle de `proto7.mjs:19-31` (D(r) = (max(r, RW)/RW)^−γ ; r′ = r·D/(D−δ) ; γ 0,6 ; RW 0,045 ; œil 0,404 ; 0,386), sans ombre ni « nuit du puits ».
  - Source : `heros-escalier-2400.webp`, rendue en 2400×1800, soit la photo 4:3 entière, avec 4 sous-échantillons par pixel.
  - Chaque image est servie à la page par `page.route` à la place de la photo (`<source>` retirées, comme `moment.mjs`), avec δ = δmax·clamp(y/270). La poussée, le zoom du palier et le zoom de sortie restent faits par le CSS, comme ils le seraient sur la toile.
- **Temps.** Aucune capture en temps réel dans les films.
  - Animations au temps en pause et positionnées : poussée = t du film, départ à 0 ; entrées menées à leur fin ; transitions menées à leur fin. Relevé : 0 animation au temps en marche au moment des captures.
  - Défilement posé par `scrollTo`. Les animations liées au défilement suivent la position.
- **Contrôle unique, image positionnée ↔ capture en temps réel** (film a, y = 135). Écart moyen 0,0032, part > 8 de 0,006 : sous le seuil « identiques » de 0,006.
  - Limite : la capture en temps réel a duré 1,3 s, et un décalage d'une seconde de poussée ne donne que 0,0067. Le contrôle exclut un état faux, pas un décalage de moins d'une seconde.
- **Contrôle des mp4.** Dans les quatre films, l'image 82 (y = 270), décodée par ffmpeg, s'écarte de 0,0165 à 0,0177 de l'image-clé du même état (`controle-film-*.json`).
  - Diagnostic sur (c) : l'écart est minimal pile à l'image 82 et remonte de part et d'autre, donc aucun décalage d'images. Niveaux conservés (moyennes RGB à 1,4 niveau près).
  - L'image de différence ×4 (`diag-difference-y270.jpg`, ouverte) ne montre que le contour des lettres et du grain : c'est la perte de compression, pas un autre état.

### Deux corrections en cours de route

1. **Rendu à 1440 px abandonné.** Il était plus doux que la photo : laplacien 205,8 contre 239,3 pour la même source réduite en lanczos3 (`essai-rendu.json`).
2. **Rendu à un échantillon abandonné, premiers films arrêtés.** À δ = 0, il recopiait la source ; dès δ > 0, le bilinéaire adoucissait d'un coup (bois 239,4 → 165,7 à δ = 0,0064, et → 169,6 à δ = 0,0037 : c'est le filtre, pas la perspective).
   - Avec 4 sous-échantillons, la netteté est continue : 69,7 / 63,3 / 60,9 aux trois premiers δ, sur la source brute (`essai-rendu3.json`). Les films livrés sont ceux de ce rendu.

## Mesures (détail : `mesures.json`)

**Géométrie du bloc 2 injecté (témoin D-1 à D-3, `mesures-temoins.json`), conforme à la table du §2 :**
- haut du plateau 1170 / 900 / 652 / 405 / 0 aux y 0 / 270 / 518 / 765 / 1170 ; hauteur de `.ouverture` 2158 ;
- opacité du contenu 1 / 1 / 0,499 / 0 ; voile 0,117 / 0,30 / 0,60 ;
- zoom du palier 1,01333 à y = 90, 1,04 à 270 ;
- surtitre et pied à 0,6 (y 90), 0,502 (y 112), puis 0 et `hidden` à 225 ;
- haut du titre 526,13 px constant de y = 0 à 270 ;
- « Devis » dans la barre : absent à y = 180, où le pied est à 0,2 pile alors que le relais demande < 0,2 ; présent dès **y = 181** dans les quatre films (première image où `nav--appel` est posé).

**Contraste du titre (D-5)**, p90, 1,05/(L + 0,05), là où l'opacité du contenu est ≥ 0,5.

| | (a) 0,116 | (b) 0,066 | (c) sans WebGL | (a′) roulis |
|---|---|---|---|---|
| Parcours du film, 1440×900 (113 images) | **2,982** (y 429-446, 3 images sous 3, après le palier) | 3,113 | 3,128 | **2,547** (46 images sous 3) |
| Grille D-5, 1440×900 (y 0-270 × 8 instants de la poussée) | 3,194 | 3,225 | 3,262 | **2,742** |
| Grille D-5, 1280×800 | 3,013 | 3,130 | 3,146 | **2,556** |
| Grille D-5, 1366×768 | **2,352** | **2,645** | **2,871** | **2,125** |

- En 1366×768, la page est **déjà sous 3 à y = 0** : 2,94 dans (a) et (b), 2,956 dans (c) au pire instant. Le cahier le signale (§6, 2,96 à 3,02). Chaque plongée creuse l'écart : minimum à y = 230 dans les trois versions.
- Le roulis fait passer des marches claires sous le titre : **échec dans les trois formats**.

**Netteté du bois (D-9, indicatif).** Variance du laplacien, zone x 900-1400, y 120-420, poussée figée, PNG. Référence : la page en ligne à y = 0 = **109,8** (cdc-verif2 donnait 109,0 avant relief). Seuil : 0,68 × la référence.

| | y = 0 | y = 270 | Ratio contre la page en ligne | Marches à y = 270 (ligne : 107,9) |
|---|---|---|---|---|
| (c) | 109,8 | 96,4 | **0,878** | 95,0 |
| (b) | 160,9 | 85,0 | **0,774** | 98,6 |
| (a) | 160,9 | 55,3 | **0,504** (sous 0,68) | 77,2 |
| (a′) | 160,9 | 51,1 | 0,465 | 75,5 |

- **Sensibilité à la source**, même état, perspective rendue depuis la 2880 : 75,9 pour (a), soit un ratio de 0,691 ; 123,5 pour (b).
- (a) passe donc de justesse avec la texture que prévoit le cahier, et échoue avec la 2400 du prototype.

**Perceptibilité (D-15).** Appariement de blocs de 16 px sur la réduction de 160 px, entre y = 0 et y = 270, poussée figée. Recherche de ±32 px réduits ; les blocs qui touchent la limite sont exclus (`mesures-d15.json`).

| | Œil : médiane (modèle) | Nez de marche : médiane (modèle) | Blocs exclus (marches) |
|---|---|---|---|
| (c) | 3,9 px (4,3) | 9,4 px (10,9) | 0 / 99 |
| (b) | 14,0 px (17,6) | 71,5 px (75,7) | 0 / 99 |
| (a) | 23,2 px (29,9) | 125,5 px (134,5) | 13 / 99 |
| (a′) | 23,4 px (35,4) | 89,5 px (139,9) : **non fiable**, la rotation fait décrocher l'appariement | 20 / 99 |

Seuil D-15 de 020-03 : 0,9 × la valeur du film retenu. Pour (a), 113 px sur les nez de marche ; pour (b), 64 px.

**Budget de grossissement (D-8, calcul `budget.mjs`, non circulaire).** Témoin : on retrouve δmax = 0,1169 pour E_b = 1,07.

| E_b | δ | Toile dpr 1 | Toile dpr 1,5 |
|---|---|---|---|
| 1,07 | 0,116 | p90 1,519 | 2,278 |
| 1,07 | 0,066 | 1,019 | 1,529 |
| 1 (aucune rotation au repos) | 0,116 | 1,419 | 2,129 |
| 1 | 0,066 | 0,953 | 1,429 |

- Le cahier laissait « à calculer en 020-01 » **δmax pour E_b = 1** : **0,1257** à dpr 1, **0,0744** à dpr 1,5.
- Le film (a) lui-même (source 2400, écran dpr 1, y = 270) est à p90 = 1,61, au-dessus du budget de 1,53. Il est donc un peu plus doux que la cible ; avec la 2880, ce serait 1,342.

**Mouvement des films** (8 images/s, réduction de video-qa) :
- écart moyen par image : 0,032 (a), 0,029 (b), 0,023 (c), 0,032 (a′) ;
- aucune paire au-dessus de 0,085 ;
- plage figée la plus longue : 0,625 s (a, b, a′), 1,25 s (c). Pour (c), elle vient du parcours (arrêt de départ et démarrage lent), pas du geste.
- Écart y = 0 → y = 270 sur la page entière : 0,193 (a), 0,156 (b), 0,074 (c).

## Ce qui ne se mesure pas sur un prototype hors ligne

- **D-4** : aucune démo régénérée ; `nav-retenue-qa` non rejoué. Seul relevé : « Devis » apparaît à y = 181, quand le pied passe sous 0,2. Entre 181 et 225, le bouton du héros est encore faiblement visible en même temps que « Devis » : c'est le risque 12 du §10, que le film permet de juger.
- **D-5 et D-9 « avec carte graphique »** : le shader n'existe pas. On mesure l'image injectée, sans lumière du shader, sans `uVoile`, sans montée `intro`.
- **D-6, D-7, D-11, D-12, D-14** : ni worker, ni message `descente`, ni toile, ni latence, ni redimensionnement.
- **D-10** : l'inversion est une dichotomie en double précision ; la boucle de Newton GLSL et la demi-précision ne sont pas écrites.
- **Netteté réelle** : elle dépendra du filtrage de la texture 2880 (mipmaps) et du dpr de la toile.
  - (b) est filmé à dpr 1 : l'amplitude de δ = 0,066 est juste, pas la netteté d'une toile de 2160 px.
  - La première image de (a) et (b) est plus nette que la page (160,9 contre 109,8), car la 2400 remplace la 1600 avif choisie par `srcset`. L'adoucissement vu *à l'intérieur* de ces films est exagéré : lire D-9 contre la page en ligne.
- **Risque à signaler pour 020-02 (non établi)** : la 2880 injectée à y = 0 mesure 209,5, soit 1,91 × la photo actuelle. Si le shader la rend aussi nettement, le plafond de R-5 (1,15) pourrait être dépassé par le correctif lui-même.
- **P-1 à P-4, R-8 complet** : hors prototype.
- **Q1 non tranchée** : aucun geste au repos n'est filmé (poussée existante seulement, E_b = 1). ρ = 0 dans (a) et (b), comme le prévoit le §2 si le geste retenu tourne.

## Avis d'œil

**La plongée se sent-elle ?**
- **(a), oui, franchement.** Dès y = 90 (planche), le puits s'ouvre et les marches glissent vers les bords. À y = 270, on voit nettement moins de marches et le trou central a grossi : on se penche au-dessus de la cage. Les nez de marche bougent d'environ 125 px. C'est un vrai mouvement de caméra, et il ne ressemble pas à un zoom.
- **(b), oui, en plus retenu** (72 px) : une avancée lente qui déforme à peine. Le geste reste lisible si l'on sait qu'il existe.
- **(c), presque pas.** 9 px sur les marches : sur la planche, les vignettes y = 0 et y = 270 ne se distinguent que par les fondus. Pour la grille et pour un visiteur sans WebGL, la descente n'existe pas ; il reste une courte pause où le texte s'efface.

**Le bois reste-t-il net ?**
- **(c) oui** : à la loupe, identique à la page en ligne.
- **(b) oui pour le limon** : les rayures du bois grossissent et restent nettes. Les grandes marches claires perdent en revanche leur fil fin et deviennent des aplats crème.
- **(a) moins** : le limon garde ses rayures, plus grosses et plus douces. Les marches sont lisses et le haut à gauche devient doux. Ce n'est pas le bois « bavé » de `cahier/zoom/D-bois.png` : pas de traînées, la matière se lit encore. Mais c'est sous le seuil indicatif avec la 2400, et juste au seuil avec la 2880.

**Un moment ou un tunnel ?**
- **Un moment, pour (a) et (b).** Le palier ne fait que 30svh ; le titre reste seul et lisible ; il n'y a pas de trou noir. Le plateau referme la cage juste après, et le film enchaîne la citation sans temps mort. À la vitesse d'une vraie molette, la plongée dure moins d'une seconde : c'est un battement, pas un couloir.
- **(c) n'est pas un tunnel non plus**, mais un petit temps mort : 270 px où la page semble hésiter, avec les seuls fondus.

**Ce qu'apporte chaque version.**
- **(a)** : le vrai « moment signature ». C'est le seul des trois que Benj rapprochera d'un site MotionSites. Il se paie en douceur sur les marches, et en contraste limite juste après le palier (2,98 à y ≈ 440).
- **(b)** : ce que verront les écrans à dpr 1,5. Plus sage, bois plus net, contraste tenu. Si Benj trouve (a) trop appuyé, (b) montre qu'on peut descendre sans perdre la matière.
- **(c)** : ce que voient la grille et les visiteurs sans WebGL. Il ne fait rien gagner visuellement ; il ne coûte que 30svh et l'adaptation du plan « héros » de la vidéo.
- **(a′), roulis** : la rotation se voit et ajoute du vertige. Mais elle fait passer des marches claires sous le titre, et le contraste tombe sous 3 dans les trois formats (2,13 à 2,74). **À déconseiller tel que spécifié** (Q3).

**Mon avis pour Q2** (Benj décide) :
- garder la descente **sans roulis**, à la valeur de (a) sur les écrans où le budget la permet, en acceptant des marches plus douces ;
- ou retenir (b) partout si la netteté du bois compte davantage ;
- dans les deux cas, le format 1366×768 échoue déjà D-5 aujourd'hui : il faudra traiter le dégradé (bloc 1 bis) avant de juger la descente sur ce format.

## Fichiers

- **Films** : `descente-d116.mp4`, `descente-d066.mp4`, `descente-sansgpu.mp4`, `descente-d116-roulis.mp4`.
- **Planches** : `planche-a.jpg`, `planche-b.jpg`, `planche-c.jpg`, `planche-a-roulis.jpg`.
- **Images** : `images-cles/*.jpg` ; captures figées `fige-*-y0000.png` et `fige-*-y0270.png` ; `loupe-bois.jpg`, `loupe-marches.jpg`.
- **Mesures** :
  - `mesures.json` (assemblé) ;
  - `mesures-d116.json`, `mesures-d066.json`, `mesures-sansgpu.json`, `mesures-d116-roulis.json`, `mesures-temoins.json`, `mesures-d15.json` ;
  - `budget.json`, `references.json`, `controle-film-*.json`.
- **Scripts** : `rendu.mjs`, `descente.mjs` (modes `temoins`, `d116`, `d066`, `sansgpu`, `d116-roulis`), `d15.mjs`, `budget.mjs`, `references.mjs`, `loupe.mjs`, `controle-film.mjs`, `diag-film*.mjs`, `essai-rendu*.mjs`, `assembler.mjs`.
