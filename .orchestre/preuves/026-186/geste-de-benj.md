# 026-186 — la carte au téléphone : ce qui reste à Benj

Code : `moteur/telephone/` (index.ts, telephone.css) et `moteur/entree.tsx` (accroche `telephone`, et l'hôte qui remonte le moteur en entier quand un contexte WebGL perdu n'est pas rendu).

Verdict observé le 05/10 sur l'usine (`verdict-informatif-05-10.txt`) : `station-ecran-qa --partie=webkit` PASS (CE-24 : cadre de 358 px, scrollWidth 390, touch-action none, gesturestart et touchmove bloqués, boutons 44×44, plaques à partir de ×2, feuille ouverte) et `station-claw3d-qa --partie=contexte` PASS (CL-14 : perte de contexte simulée, la carte revient et suit l'étape suivante, 15 personnages au miroir). Le premier passage (`...-1er-passage.txt`) avait deux vrais défauts, corrigés ensuite : cadre de 390 px au lieu de 358, et un crash au premier changement servi après une perte de contexte (la scène morte restait abonnée au pont). Capture `telephone-webkit.jpg` non rapatriée (le juge la prend sur l'usine à la recette).

Geste de Benj : essayer la station sur son téléphone une fois `stationCarte` levé (pincer, glisser, +, −, ⊞) et dire oui ou non ; le pincement et le blocage du zoom de page ne se prouvent que là (Playwright ne pince pas).
