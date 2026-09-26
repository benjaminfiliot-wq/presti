# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:a:debut -->
## Lot a — fiche 026-012 — référence `4041ec9`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=a` le 2026-09-26T09:12:15Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel |
|---|---|---|---|---|
| pilotage-logique-qa --partie=decider | DC-1 | 1 | ❌ DC-1 lib/pilotage/decisions.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/appels.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/liens.ts absent de C:\Users\benja\Documents\pre | PASS, code 0 (DC-T1, DC-T2, DC-T3) |
| pilotage-logique-qa --partie=envois | LE-1 | 1 | ❌ LE-1 lib/pilotage/envois.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/entonnoir.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (LE-T1, LE-T2, LE-T3) |
| pilotage-logique-qa --partie=agents | AC-1 | 1 | ❌ AC-1 lib/pilotage/agents.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/code.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (AC-T1, AC-T2, AC-T3, AC-T4) |
| pilotage-push-qa | PF-1 | 1 | ❌ PF-1 lib/pilotage/notifications.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (PF-T1, PF-T2, PF-T3) |
<!-- lot:a:fin -->
