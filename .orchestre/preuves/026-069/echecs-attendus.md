# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:2:debut -->
## Lot 2 — fiche 026-069 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=2` le 2026-09-28T11:39:09Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| vigie-meta-qa | `86ce0f3` | VM-1 | 1 | ❌ VM-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/vigieMeta.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
| conformite-qa | `86ce0f3` | CO-1 | 1 | ❌ CO-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/modeles.ts ; module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/affirmations.ts ; module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/faq.ts ; m | PASS, code 0 (AC-1, AC-1, AC-2) |
| redacteur-qa | `86ce0f3` | RD-1 | 1 | ❌ RD-1 module absent : .orchestre/travail/026-acquisition/reference/lib/agents/acquisition/redacteur.ts | PASS, code 0 (AC-1, AC-2, AC-3) |
<!-- lot:2:fin -->
