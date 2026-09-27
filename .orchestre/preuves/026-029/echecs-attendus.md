# Échecs attendus des juges du lot C (026-029) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=C` le 2026-09-27T12:37:52Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| commande-exporter-qa | 026-033 | `4041ec9` | EX-1 | 1 | ❌ EX-1 scripts/commande-exporter.mjs absent de .orchestre/travail/026-lt-preuve/reference : l'exporteur de 026-033 n'existe pas encore | PASS, code 0 (NR : EX-4) |
| redacteur-v2-qa | 026-093 | `4041ec9` | RV-1 | 1 | ❌ RV-1 lib/siteRedacteur.ts absent de .orchestre/travail/026-lt-preuve/reference : le rédacteur de 026-093 n'existe pas encore | PASS, code 0 (NR : RV-3) |
| livrer-site-qa | 026-100 | `4041ec9` | CH-1 | 1 | ❌ CH-1 scripts/livrer-site.mjs absent de .orchestre/travail/026-lt-preuve/reference : la chaîne de 026-100 n'existe pas encore | PASS, code 0 (NR : CH-3) |
| generation-actions-qa | 026-106 | `4041ec9` | GA-1 | 1 | ❌ GA-1 .github/workflows/generer-site.yml absent de .orchestre/travail/026-lt-preuve/reference : le flux de 026-106 n'existe pas encore | PASS, code 0 (NR : GA-7) |
