# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:6:debut -->
## Lot 6 — fiche 026-081 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=6` le 2026-09-29T01:43:02Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| meta-webhooks-qa | `86ce0f3` | MW-1 | 1 | ❌ MW-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/metaWebhooks.ts ; route absente : .orchestre/travail/026-acquisition/reference/app/api/webhooks/meta/route.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| repondeur-qa | `86ce0f3` | RP-1 | 1 | ❌ RP-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/repondeur.ts ; route absente : .orchestre/travail/026-acquisition/reference/app/api/cron/repondeur/route.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| rendez-vous-qa | `86ce0f3` | RV-1 | 1 | ❌ RV-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/rendezVous.ts ; route absente : .orchestre/travail/026-acquisition/reference/app/rendez-vous/[jeton]/route.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
<!-- lot:6:fin -->
