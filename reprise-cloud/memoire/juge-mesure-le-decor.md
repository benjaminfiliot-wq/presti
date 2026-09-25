---
name: juge-mesure-le-decor
description: "Un test qui compte les pixels clairs juge le décor autant que le texte : sur les clips Roblox, la barre d'outils blanche faisait refuser des accroches parfaitement cadrées — mesurer la géométrie, pas la luminosité"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-22T14:01:16.983Z
---

22/09/2026, clips ForgeGUI. Le juge refusait 7 clips sur 9 avec « l'accroche touche le bord de l'écran ».
Le test comptait les pixels au-dessus de 225 dans les 16 colonnes de chaque bord, sur la bande de
l'accroche. Sur 2 clips c'était **vrai** (« I ASKED FOR ELECTRIC POWERS » = 1161 px en Arial Black 64
pour un cadre de 1080, amputée des deux côtés). Sur les 5 autres c'était **faux** : la barre d'outils de
Roblox Studio — icônes et libellés blancs — tombe pile dans cette bande.

**Why:** un seuil de luminosité ne distingue pas ce qu'on veut mesurer de ce qui se trouve derrière.
Sur une capture d'écran de logiciel, le décor est blanc par nature ; le test mesurait donc le jeu, pas
le texte. Et comme il criait juste assez souvent pour paraître utile, il ressemblait à un bon juge.

**How to apply:** quand une propriété est **géométrique**, la mesurer géométriquement.
Ici : largeur réelle du texte avec la police utilisée, comparée à la largeur utile.

```python
from PIL import ImageFont
fonte = ImageFont.truetype("C:/Windows/Fonts/ariblk.ttf", taille)
largeur = fonte.getbbox(ligne)[2] - fonte.getbbox(ligne)[0]   # 1161 px, sans ambiguïté
```

Corollaire côté production : le monteur **calcule** la taille qui tient
(`_taille_qui_tient`, descente de 64 à 28 jusqu'à ce que les deux lignes rentrent, marge 32 px +
bordure 7 px), et écrit `accroche_taille` dans le journal pour que le juge remesure. Un texte ne doit
jamais dépendre du fait que quelqu'un ait écrit une accroche assez courte.

Les deux pièges de méthode, vérifiés ici : **regarder l'image avant de corriger** — c'est en extrayant
la frame que j'ai vu que 2 refus étaient réels et 5 non ; et **valider le nouveau test dans les deux
sens** — vert sur les 9 clips réels, rouge sur un journal trafiqué à `accroche_taille: 64`, avec le
bon chiffre dans le message.

Voir [[preuve-vide-est-un-mensonge]], [[loudnorm-apres-un-carton-muet]], [[juge-capture-lui-meme]].
