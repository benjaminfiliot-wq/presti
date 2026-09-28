# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:7:debut -->
## Lot 7 — fiche 026-071 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=7` le 2026-09-28T15:51:08Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| maquette-video-qa | `86ce0f3` | MV-1 | 1 | ❌ MV-1 module absent : .orchestre/travail/026-acquisition/reference/scripts/agents/maquette-video.mjs | PASS, code 0 (AC-1, AC-2, AC-3, AC-4) |
| douleurs-qa | `86ce0f3` | DL-1 | 1 | ❌ DL-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/douleurs.ts | PASS, code 0 (AC-1, AC-2, AC-3, AC-4) |
<!-- lot:7:fin -->
