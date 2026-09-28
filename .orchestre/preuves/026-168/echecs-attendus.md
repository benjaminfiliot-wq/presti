# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:p:debut -->
## Lot p — fiche 026-168 — référence `4041ec9`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=p` le 2026-09-28T06:04:23Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-p`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| station-planche-qa --partie=planche --atelier=atelier-temoin | PN-1 | 1 | ❌ PN-1 docs/station/planche.md absent ; docs/station/grille.json absent ; docs/station/licence-planche.json absent | PASS, code 0 (PN-5, PN-9) | PASS, code 0, 9 critères verts | 19/19 (k-1440-faux → ❌ PN-3, reserve-deplacee → ❌ PN-2, palette-sans-magenta → ❌ PN-4, licence-auteur → ❌ PN-5, echelle-hors-licence → ❌ PN-7, atelier-autre-commit → ❌ PN-1, grille-retiree → ❌ PN-1, donnee-peinte-1280 → ❌ PN-6, donnee-peinte-telephone → ❌ PN-6, donnee-vaisseau → ❌ PN-6, portrait-donnee → ❌ PN-6, ecran-chiffre → ❌ PN-6, ecran-transparent → ❌ PN-6, plaques-masquees → ❌ PN-2, feuille-brute → ❌ PN-8, vues-confondues → ❌ PN-9, sortie-reseau → ❌ PN-5, personnage-fantome → ❌ PN-7, decor-lisse → ❌ PN-3) |
<!-- lot:p:fin -->
