# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:gpause:debut -->
## Lot gpause — fiche 026-garde-pause — référence `00f0ab5`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=gpause` le 2026-09-30T21:08:32Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-gpause`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| garde-pause-qa | GP-1 | 1 | ❌ GP-1 app/api/cron/relances/route.ts ne lit jamais la pause générale (ni pauseGenerale ni sortiePermise) ; pause posée : 3 e-mail(s) de relance partent quand même ; pause posée : 3 appel(s) au modèle pour rédiger des relances ; pause posée : le tour de livraison est joué (1) ; pause posée : 7 lectu | PASS, code 0 (GP-1, GP-2, GP-3, GP-4, GP-5, GP-6, GP-7) | PASS, code 0, 7 critères verts | 15/15 (relances-ne-lit-pas-la-pause → ❌ GP-1, relances-lit-les-contacts-sous-pause → ❌ GP-1, porte-retiree → ❌ GP-1, email-garde-neutralisee → ❌ GP-2, email-bloque-aussi-le-critique → ❌ GP-2, porte-ouverte-sur-valeur-inattendue → ❌ GP-3, porte-ouverte-quand-la-lecture-leve → ❌ GP-3, crieur-sans-signalement → ❌ GP-4, registre-illisible-compte-zero → ❌ GP-4, prise-non-conditionnelle → ❌ GP-5, meme-prospect-deux-fois → ❌ GP-5, plafond-de-cinq-cents → ❌ GP-6, insiste-apres-le-plafond-du-jour → ❌ GP-6, relances-pause-lue-une-fois → ❌ GP-7, crieur-pause-lue-une-fois → ❌ GP-7) |
<!-- lot:gpause:fin -->
