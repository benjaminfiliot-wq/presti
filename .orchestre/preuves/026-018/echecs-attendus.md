# Échecs attendus des juges du lot A (026-018) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=A` le 2026-09-26T09:13:30Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| livraison-schema-qa --numero=0103 | 026-021 | `4041ec9` | SC-1 | 1 | ❌ SC-1 supabase/migrations/0103_livraison_commandes.sql absent : la migration de la fiche 026-021 n'existe pas (encore) | PASS, code 0 (NR : SC-9) |
| tresorerie-qa | 026-055 | `4041ec9` | TR-1 | 1 | ❌ TR-1 lib/direction/tresorerie.ts absent : le module de la fiche 026-055 n'existe pas (encore) | PASS, code 0 (NR : TR-8) |
| livraison-tour-qa | 026-024 | `4041ec9` | TL-1 | 1 | ❌ TL-1 lib/siteLivraison.ts absent : le module de la fiche 026-024 n'existe pas (encore) | PASS, code 0 (NR : TL-8) |
| tuile-argent-qa | 026-059 | `4041ec9` | TA-1 | 1 | ❌ TA-1 app/api/controle/tresorerie/route.ts absent : la route de la fiche 026-059 n'existe pas (encore) | PASS, code 0 (NR : TA-5) |
