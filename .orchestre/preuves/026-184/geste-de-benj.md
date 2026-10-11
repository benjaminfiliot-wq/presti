# 026-184 — le calque HTML de la carte : ce qui reste

Code : `moteur/calque/**` (livré et commité avec 026-181, 8aa18f84, qui l'a posé avec la scène) et `Carte.tsx` (la liste des salles gardée sous la carte, ce commit).

Verdict observé le 05/10 sur l'usine (`verdict-informatif-05-10.log`, `station-ecran-qa --partie=calque`) : CE-15 (miroir complet, liste des salles, clavier), CE-16 (le piège `<img onerror>` affiché tel quel) et CE-28 (l'info-bulle et son modèle) PASS ; CE-14 FAIL : « l'écran de l'Expérience dit «  », « 0 € » attendu » — l'écran `[data-ecran]` de l'Expérience est le dessin des acteurs de 026-183 (pas encore livrée), pas du calque. Les parties `verite`, `camera` et `acteurs` du `verifier` dépendent de 026-182 et 026-183 : non jouées.

Geste de Benj : regarder les captures du juge une fois 026-183 livrée et `stationCarte` levé.
