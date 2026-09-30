# Rapport — 021-04, 2e rendu : « Anatomie d'une marche »

Tronçon de trois marches en chêne (40 mm) sur un limon à la française, trois contremarches et douze vis. Rendu par Claude Code
(agent), dans `.orchestre/preuves/021-04b/`, le 2026-09-15.

## Commande et réglages

- **Blender** : 5.2.1 LTS (Blender 5.2 LTS), Cycles sur processeur, sans carte graphique.
- **Commande exacte** (lancée par `node outils/construire.mjs`, une fois pour `brut/` → `rendus/`, une fois pour `brut-bis/` → `rendus-bis/`) :
  `"C:/Program Files/Blender Foundation/blender.exe" --background --factory-startup --python C:\Users\benja\Documents\presti\.orchestre\preuves\021-04b\outils\marche.py -- C:\Users\benja\Documents\presti\.orchestre\preuves\021-04b\brut 5204 final`
  puis `"C:/Program Files/Blender Foundation/blender.exe" --background --factory-startup --python C:\Users\benja\Documents\presti\.orchestre\preuves\021-04b\outils\marche.py -- C:\Users\benja\Documents\presti\.orchestre\preuves\021-04b\brut-bis 5204 final` pour le second lancement.
- **Graine** (seed Cycles) : 5204, graine non animée, échantillonnage adaptatif coupé. Même graine pour les deux lancements.
- **Échantillons** : 48 par pixel pour les passes « beauté » (débruitage OpenImageDenoise), 32 pour les passes d'ombre (rendues à mi-définition, agrandies et adoucies).
- **Caméra** orthographique, largeur de champ 2,368 m pour 1 400 px ; cadre 1 400 × 1 050 ; transformation de vue « Standard ».
- **Fond** des deux vues complètes : uni, #14110E (fond de `.section--noir`, kit.css:468).
- **Vecteurs d'éclatement** (pixels entiers, arrondis dans le plan de l'image avant le rendu) : limon (-274 ; -27), contremarche (-265 ; 144), marche (136 ; -66), vis (136 ; -161).

## Durée des rendus

- 1er lancement (`rendus/`) : 242 s dans Blender (252,4 s avec le démarrage).
- 2e lancement (`rendus-bis/`) : 272,1 s dans Blender (279 s avec le démarrage).
- Détail du 1er lancement : assemble_beaute.png 67,4 s ; assemble_ombre.png 11,5 s ; calque-limon_beaute.png 31,5 s ; calque-limon_ombre.png 3,6 s ; calque-contremarche_beaute.png 22,1 s ; calque-contremarche_ombre.png 2,4 s ; calque-marche_beaute.png 25,1 s ; calque-marche_ombre.png 3,7 s ; calque-vis_beaute.png 7,5 s ; calque-vis_ombre.png 1,1 s ; eclate_beaute.png 56,5 s ; eclate_ombre.png 8,7 s.
- Machine partagée avec d'autres sessions (processeur chargé) : les durées varient d'un lancement à l'autre.

## Qualité AVIF employée, par fichier

Encodage sharp (`avif({ quality, effort: 6, chromaSubsampling: '4:4:4' })`), depuis les PNG assemblés.

| Fichier | Qualité AVIF | Octets |
|---|---|---|
| `assemble.avif` | 54 | 9478 |
| `eclate.avif` | 54 | 15070 |
| `calque-limon.avif` | 54 | 7844 |
| `calque-contremarche.avif` | 54 | 8372 |
| `calque-marche.avif` | 54 | 10915 |
| `calque-vis.avif` | 56 | 5140 |
| **Total** | | **56819** (plafond 60 000) |

## Teinte du chêne (OB-9), médianes L*a*b*

- Médiane L\*a\*b\* des pixels opaques (alpha > 200) de `rendus/calque-marche.avif` : **40,2 / 12,9 / 32,6**.
- Médiane L\*a\*b\* des deux zones de marches de `heros-escalier-1600.avif` (zones du juge) : **33,3 / 17,0 / 39,1**.

## Ombre

Une ombre au sol par groupe, rendue par un capteur d'ombre Cycles attaché au groupe (il se déplace avec lui), posée sous les
pièces avec une opacité de 0,5. Alpha maximal de l'ombre seule, par calque : limon 0,5, contremarche 0,5, marche 0,5, vis 0,237.
Pourquoi deux passes : dans Cycles, un capteur d'ombre cache ce qui se trouve derrière lui (vérifié sur une scène d'essai) ;
un plan d'ombre sous un groupe éclaté aurait masqué les autres pièces. La passe « ombre » rend les capteurs seuls, les pièces
étant invisibles à la caméra mais portant ombre ; la passe « beauté » rend les pièces. `construire.mjs` pose la première
sous la seconde, de la même façon pour les calques et pour l'éclaté.

## Ce qui a changé depuis le 1er rendu (retour de Claude Code, 15 h 25)

1. **Éclaté recentré, rien de coupé** : l'échelle de la caméra orthographique est calculée sur l'union des deux vues (pièces et
   ombres), avec 4 % de marge visée ; le cadre glisse de 1,5 % vers la gauche pour que la queue d'ombre des marches, à droite,
   garde sa marge (au 2e tour, à -3,5 %, elle finissait à 0,983 du cadre et OB-10 échouait).
2. **Limon non percé** : les entailles sont des rainures de 17 mm, le quart des 68 mm du limon (booléens limités à la face
   intérieure) ; plus de triangles noirs.
3. **Vis noyées dans l'assemblé** : têtes fraisées affleurantes (0,3 mm), tiges dans le bois ; seul l'éclaté les montre entières.
4. **Ombre au sol par pièce** : capteur d'ombre Cycles attaché à chaque groupe, opacité 0,5 (alpha ≤ 0,6). Pour les vis, l'ombre
   est gardée au contact seulement (à moins d'une trentaine de pixels d'une vis) : les deux rangs du haut portaient leur ombre
   18 et 36 cm plus bas, en taches floues détachées qui auraient glissé sur les marches pendant l'éclatement.
5. **Contremarches lisibles** : vecteur (-0,20 ; -0,46 ; -0,16) m au lieu de (0 ; -0,26 ; -0,12) ; la plus haute ne passe plus
   qu'en partie sous la marche du bas (elle y était aux trois quarts cachée), les trois s'étagent sous le limon.

## Avis

- **Le bois fait-il chêne ?** Oui, un chêne moyen huilé : brun chaud, fil marqué en bandes sombres, pores fins. La médiane est
  un peu plus claire et un peu moins saturée que les marches de la photo du héros, mais dans la même famille (ΔE00 sous 10).
  Le fil reste un peu régulier, plus « planche » que plot de chêne sur quartier : ça se voit de près, pas à 720 px de large.
- **Les vis se voient-elles ?** Oui dans l'éclaté : douze vis à tête fraisée, filetées, pointe dirigée vers leur avant-trou,
  à 6 cm au-dessus de leur marche. Dans l'assemblé, on ne voit que les têtes affleurantes, en petits disques d'acier.
- **L'éclaté se lit-il comme un escalier ?** Oui : le limon à gauche avec ses entailles en escalier, les trois contremarches
  qui descendent vers l'avant, les trois marches qui montent vers la droite en gardant l'ordre des girons, les vis au-dessus.
  Chaque groupe s'est écarté d'un seul vecteur, l'ordre de l'escalier se devine encore.
- **Réserve** : dans l'éclaté, le bout droit de la contremarche du haut passe sous le bout gauche de la marche du bas (une bande
  d'environ un tiers de sa hauteur) ; c'est l'ordre réel des pièces en profondeur, et la pièce se lit quand même entière.
  Le bois s'écarte davantage de la photo qu'au 1er rendu (ΔE00 6,5 contre 1,4 annoncé alors), plus clair et moins jaune ;
  la cause n'a pas été isolée (matière reprise avec un nœud d'occlusion au 2e tour) ; la teinte reste dans le seuil d'OB-9.
