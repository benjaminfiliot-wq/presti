# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:p:debut -->
## Lot p — fiche 026-168 — référence `4041ec9`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=p` le 2026-09-26T15:42:40Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel |
|---|---|---|---|---|
| station-planche-qa --partie=planche | PN-1 | 1 | ❌ PN-1 docs/station/planche.md absent ou vide ; docs/station/grille.json absent ou vide ; docs/station/licence-planche.json absent ou vide | PASS, code 0 (PN-1, PN-2, PN-3, PN-4, PN-5, PN-6, PN-7, PN-8, PN-9) |
<!-- lot:p:fin -->
