---
name: playwright-video-horloge
description: "La vidéo recordVideo de Playwright n'est pas à l'heure du script (en avance de 0,05 à 0,8 s, qui dérive) — découper à Date.now() rate les gestes ; recaler sur des repères blancs"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-15T02:49:05.043Z
---

Le 15/09/2026, la vidéo de la landing (scripts/demo-video.mjs) a échoué quatre fois de suite au critère « aucun plan figé » de video-qa. J'ai d'abord accusé le relief WebGL, puis le héros collant : c'était l'horloge. Des écrans blancs de 300 ms placés à des heures connues ressortent dans la webm entre 0,05 et 0,8 s **plus tôt** que l'heure `Date.now()` du script, et l'écart grandit au fil de l'enregistrement (bureau : −0,06 s au début, −0,73 s à la fin). Découpé à l'heure du script, chaque plan commençait trop tard : la partie rapide du geste (défilement en ease-out) tombait avant la coupe, et l'attente d'après se retrouvait dans le plan.

**Why:** la cause se lisait mal. Dans un navigateur normal, tout bougeait bien (défilement de 90 px = 10 % de l'image). Chaque correctif de geste (défilement plus long, saisie dans un champ) déplaçait la plage figée sans la faire disparaître.

**How to apply:**
- Toute découpe d'une vidéo Playwright se cale sur des repères visibles dans la vidéo elle-même : un flash au début, un à la fin, puis une interpolation linéaire. S'il ne trouve pas exactement deux repères, le script s'arrête au lieu de deviner.
- Pour diagnostiquer un plan figé, relever **toutes** les plages figées, car video-qa n'affiche que la pire.
- Deux autres pièges vus le même jour :
  - la vidéo bureau 1280×800 est recadrée à 720 px, donc le bas de page filmé est invisible ;
  - une section épinglée par animation au défilement ne change presque aucun pixel quand on défile à l'intérieur ; il faut filmer l'entrée ou la sortie de l'épinglage.

Voir [[demo-v16-grille]], [[preuve-vide-est-un-mensonge]].
