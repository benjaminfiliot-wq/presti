# Échecs attendus des juges du lot D (026-026) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=D` le 2026-09-27T16:26:44Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| dossier-zip-qa | 026-028 | `4041ec9` | DZ-1 | 1 | ❌ DZ-1 lib/siteDossier.ts absent : le module de la fiche 026-028 n'existe pas (encore) | PASS, code 0 (NR : DZ-3) |
| retrait-site-qa | 026-031 | `4041ec9` | RT-1 | 1 | ❌ RT-1 lib/siteRetrait.ts absent : le module de la fiche 026-031 n'existe pas (encore) | PASS, code 0 (NR : RT-6) |
| poste-sites-qa | 026-078 | `4041ec9` | PS-1 | 1 | ❌ PS-1 app/api/controle/sites/[id]/route.ts n'accepte pas valider_et_mettre_en_ligne, search_console, envoyer_dossier : valider_et_mettre_en_ligne → 400 (« Action inconnue : valider, regenerer ou mettre_en_ligne. ») ; search_console → 400 (« Action inconnue : valider, regenerer ou mettre_en_ligne. » | PASS, code 0 (NR : PS-2) |
| bus-livraison-qa | 026-141 | `4041ec9` | BL-1 | 2 | ❌ BL-1 préalable absent : .orchestre/travail/026-lt-preuve/reference/scripts/fixtures/026-horloge-bus/contrat-ops.json (fiche 026-009) ; app/api/agents/tic/route.ts (fiche 026-049, le tic du bus) — app/api/agents/tic/route.ts et le contrat du bus doivent exister avant 026-141 | PASS, code 0 (NR : BL-5) |
