# 026-190 — le thème Vaisseau : ce qui reste à Benj

Le thème est livré dans `public/station/themes/vaisseau/` (theme.json, atlas.png, fond.webp, licence.json ; 60 Kio, lot A seul : Ganamoda, Kenney Tiny Factory, Ansimuz Tech Lab, Shade Puny Characters ; aucun téléchargement).

Verdict observé le 05/10 sur l'usine (`verdict-informatif-05-10.log`) : `station-themes-qa --theme=vaisseau` PASS (TH-7 à TH-12, 1,5 Mo pour les deux thèmes tenu), CL-15 PASS ; CL-13 FAIL pour une cause hors du thème (le `next build` de la copie casse sur `moteur/scene/StationPixelScene.ts`, travail non commité de 026-181) ; `station-ecran-qa --partie=themes,reglages` non jugé (la chaîne s'arrête au premier échec) ; la fiche 026-187 (réglages, `Habillage.tsx`) n'est pas non plus livrée : CE-29 sur le Vaisseau reste à jouer.

Geste de Benj (2 clics) : choisir le thème « vaisseau » dans les réglages de la station une fois `stationCarte` levé et 026-187 livrée, regarder `bureau-vaisseau.jpg` et `telephone-vaisseau.jpg` (prises par le juge) et dire oui ou non.
