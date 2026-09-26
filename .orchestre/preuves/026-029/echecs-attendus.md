# Échecs attendus des juges du lot C (026-029) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=C` le 2026-09-26T15:26:29Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| commande-exporter-qa | 026-033 | `4041ec9` | EX-1 | 1 | ❌ EX-1 (NR) scripts/commande-exporter.mjs absent | PASS, code 0 (NR : EX-1, EX-2, EX-3, EX-4, EX-5, EX-6, EX-7, EX-8, EX-9, EX-10) |
| redacteur-v2-qa | 026-093 | `4041ec9` | RV-1 | 1 | ❌ RV-1 (NR) lib/siteRedacteur.ts absent | PASS, code 0 (NR : RV-1, RV-2, RV-3, RV-4, RV-5, RV-6, RV-7, RV-8, RV-9, RV-10) |
| livrer-site-qa | 026-100 | `4041ec9` | CH-1 | 1 | ❌ CH-1 (NR) scripts/livrer-site.mjs absent | PASS, code 0 (NR : CH-1, CH-2, CH-3, CH-4, CH-5, CH-6, CH-7, CH-8, CH-9, CH-10, CH-11, CH-12) |
| generation-actions-qa | 026-106 | `4041ec9` | GA-1 | 1 | ❌ GA-1 (NR) .github/workflows/generer-site.yml absent | PASS, code 0 (NR : GA-1, GA-2, GA-3, GA-4, GA-5, GA-6, GA-7, GA-8, GA-9, GA-10) |
