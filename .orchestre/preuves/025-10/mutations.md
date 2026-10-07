# 025-10 — témoin actuel bloqué avant les mutations

025-10 est réellement manquante : scripts/juges-025-mutations.mjs absent. Les huit préalables 025-02 à 07, 09 et 11 disposent de PASS historiques depuis fait/ (24 septembre), mais cela ne rend pas le témoin actuel vert.

023-03 a déjà un runner non suivi, cinq mutations rejetées et un témoin signature FAIL daté du 16 septembre : aucune réécriture de ce travail.

Premier témoin 025, promesses-qa : FAIL PR-1 sur lib/crieur/faits.ts:15, texte « Réponse en moins d’une minute » dans le motif de preuve du fait reponse-rapide (plans/promesses.md). Tous les autres PR-2 à PR-12 PASS. Le témoin doit passer avant d'attribuer un refus aux mutations : mutations non exécutées, aucun PASS global.

Mesure sur la copie PC préparée pour 026-255 (/home/usine/reprise-1001/vaisseau255-1007), sans correction de sources ni de juge, avec les références Git historiques lues depuis /home/usine/presti/.git (GIT_DIR, lecture seule). Le premier essai sans ces références refusait aussi la substance historique ; l'essai avec références isole PR-1. Ce n'est pas une validation officielle depuis fait/.

Blocage hors périmètre : lib/crieur/faits.ts et promesses-qa.mjs sont interdits à cette fiche. Question formelle déposée, aucun contournement ni mutation sans témoin sain.

