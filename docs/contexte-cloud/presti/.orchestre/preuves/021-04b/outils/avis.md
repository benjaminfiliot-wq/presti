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
