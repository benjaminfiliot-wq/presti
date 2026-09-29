# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:1:debut -->
## Lot 1 — fiche 026-016 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=1` le 2026-09-29T01:41:52Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| recenseur-qa --partie=sirene | `86ce0f3` | RS-1 | 1 | ❌ RS-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/sirene.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| recenseur-qa --partie=rge | `86ce0f3` | RG-1 | 1 | ❌ RG-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/rge.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| recenseur-qa --partie=site | `86ce0f3` | LS-1 | 1 | ❌ LS-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/lecteurSite.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| recenseur-qa --partie=orchestration | `86ce0f3` | RC-1 | 1 | ❌ RC-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/recenseur.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| faits-qa | `86ce0f3` | JF-1 | 1 | ❌ JF-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/jugeFaits.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
<!-- lot:1:fin -->
