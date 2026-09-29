# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:a:debut -->
## Lot a — fiche 026-012 — référence `4041ec9`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=a` le 2026-09-29T14:10:21Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-a`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| pilotage-logique-qa --partie=decider | DC-1 | 1 | ❌ DC-1 lib/pilotage/decisions.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/appels.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/liens.ts absent de C:\Users\benja\Documents\pre | PASS, code 0 (DC-T1, DC-T2, DC-T3) | PASS, code 0, 11 critères verts | 5/5 (lientel-indicatif → ❌ DC-6, heures-arrondies → ❌ DC-4, blocs-sans-code → ❌ DC-8, fusion-douze → ❌ DC-7, decisions-retire → ❌ DC-1) |
| pilotage-logique-qa --partie=envois | LE-1 | 1 | ❌ LE-1 lib/pilotage/envois.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/entonnoir.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (LE-T1, LE-T2, LE-T3) | PASS, code 0, 9 critères verts | 4/4 (sante-echecs-strict → ❌ LE-5, alerte-a-301 → ❌ LE-7, bilan-mois-jour → ❌ LE-8, compteur-texte → ❌ LE-4) |
| pilotage-logique-qa --partie=agents | AC-1 | 1 | ❌ AC-1 lib/pilotage/agents.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference ; lib/pilotage/code.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (AC-T1, AC-T2, AC-T3, AC-T4) | PASS, code 0, 8 critères verts | 3/3 (muet-trois-periodes → ❌ AC-2, priorite-inversee → ❌ AC-3, attention-huit → ❌ AC-4) |
| pilotage-push-qa | PF-1 | 1 | ❌ PF-1 lib/pilotage/notifications.ts absent de C:\Users\benja\Documents\presti\.orchestre\travail\juges-026-pilotage\reference | PASS, code 0 (PF-T1, PF-T2, PF-T3) | PASS, code 0, 10 critères verts | 4/4 (motifs-sans-digest → ❌ PF-2, aucun-fondateur-muet → ❌ PF-4, demo-comprise → ❌ PF-5, push-attendu → ❌ PF-7) |
<!-- lot:a:fin -->
