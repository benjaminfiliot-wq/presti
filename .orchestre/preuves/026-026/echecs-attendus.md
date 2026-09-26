# Échecs attendus des juges du lot D (026-026) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=D` le 2026-09-26T15:34:44Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| dossier-zip-qa | 026-028 | `4041ec9` | DZ-1 | 1 | ❌ DZ-1 (NR) ❌ DZ-1 app/api/controle/dossier/route.ts absent | PASS, code 0 (NR : DZ-1) |
| retrait-site-qa | 026-031 | `4041ec9` | RT-1 | 1 | ❌ RT-1 (NR) ❌ RT-1 app/api/controle/retrait/route.ts absent | PASS, code 0 (NR : RT-6, RT-1) |
| poste-sites-qa | 026-078 | `4041ec9` | PS-1 | 1 | ❌ PS-1 (NR) ❌ PS-1 app/poste/page.tsx absent | PASS, code 0 (NR : PS-1) |
| bus-livraison-qa | 026-141 | `4041ec9` | BL-1 | 2 | ❌ BL-1 préalable absent 026-049 app/api/agents/tic/route.ts | PASS, code 0 (NR : BL-1) |
