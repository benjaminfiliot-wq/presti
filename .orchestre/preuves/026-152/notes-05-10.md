# 026-152 — complément du 05/10 (lot M-3, Claude Code)

La fiche avait été rangée (60326e73) sur un passage informatif incomplet : 10 fautes prises sur 16 jouées, 12 non jouées, le témoin de `livrer-site` en délai. Cause : le passage avait lieu sur une usine chargée par plusieurs autres jobs, avec le budget de 18 minutes du script, et les passages de 9 minutes par juge expiraient. Rien dans le script ni dans les juges.

## Passage complet, usine au calme, le 05/10

`node scripts/juges-026-lt-mutations.mjs` sur l'usine : **37 fautes prises sur 37, 16 témoins verts sur 16**, 682 secondes, code 0 (`mutations.json`, `mutations.md` remplacés par ce passage).

## Verdict du méta-juge (un seul passage, sur l'usine)

`node scripts/juges-026-mutations-preuve.mjs --fiche=026-152 …` : **PASS** (MP-1 script en code 0 en 672 s, 37 entrées complètes ; MP-2 les 34 critères imposés de 16 juges couverts ; MP-3 trois contre-mutations tirées, graine 332411484, toutes prises ; MP-4 aucun fichier bougé ; MP-5 `mutations-contre-verifiees.md` écrit). Copie de la sortie : `verifier.log` (ignoré par git, comme tous les `*.log`).

## Hors périmètre, commité avec ce complément

`scripts/parcours-commande-qa.mjs` : la correction d'une ligne du 04/10 (`correction-parcours-commande-qa-04-10.md`, nom du fichier d'entrée choisi sur l'arbre copié) était dans l'arbre de travail mais jamais commitée ; sans elle, le témoin RT-6 de `retrait-site-qa` est rouge sur un dépôt propre (le méta-juge de l'usine, qui reçoit l'arbre de travail du PC, ne le voyait pas).

## Gestes de Benj

Aucun.
