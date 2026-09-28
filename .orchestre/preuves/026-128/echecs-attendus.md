# Échecs attendus des juges du lot 17 (026-128) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=17` le 2026-09-28T20:45:15Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `4041ec9b4143` sous `.orchestre/travail/juges-026-pubs-contenu/reference-17`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| studio-garde-qa | SG-1 | FAIL SG-1 — .orchestre/travail/juges-026-pubs-contenu/reference-17/scripts/studio/garde.mjs absent | PASS, code 0 (3 s) |
| pub-qa --monter-temoin | PQ-1 | FAIL PQ-1 — .orchestre/travail/juges-026-pubs-contenu/reference-17/scripts/studio/monter.mjs absent : scripts/studio/monter.mjs n'est pas encore écrit (fiche 026-158) | PASS, code 0 (99 s) |
| studio-offre-qa | SO-1 | FAIL SO-1 — .orchestre/travail/juges-026-pubs-contenu/reference-17/lib/studio/offre.ts absent | PASS, code 0 (0 s) |
