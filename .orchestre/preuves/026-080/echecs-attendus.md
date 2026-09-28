# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:3:debut -->
## Lot 3 — fiche 026-080 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=3` le 2026-09-28T23:36:40Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| standardiste-qa | `86ce0f3` | ST-1 | 1 | ❌ ST-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/standardiste.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| maquette-lien-qa | `86ce0f3` | ML-1 | 1 | ❌ ML-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/maquettesLien.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| atelier-maquettes-qa | `86ce0f3` | AM-1 | 1 | ❌ AM-1 module absent : .orchestre/travail/026-acquisition/reference/scripts/agents/atelier-maquettes.mjs ; module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/magasinUsine.ts ; route absente : app/api/usine/atelier/travail/route.ts ; route absente : app/api/usine/atel | PASS, code 0 (AC-1, AC-2, AC-3) |
<!-- lot:3:fin -->
