# Échecs attendus des juges du lot 09 (026-124) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=09` le 2026-09-28T17:40:15Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `4041ec9b4143` sous `.orchestre/travail/juges-026-pubs-contenu/reference-09`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| socle-pubs-qa | SP-1 | FAIL SP-1 — code 1 sur le film conforme : Rythme des coupes, Une piste audio, au niveau d’un fond ; 10 critère(s) sans « (pub locale) » : Format reconnu, Durée, Images par seconde, Débit, Aucun plan figé, L’image vit, Rythme des coupes, Le cadre est rempli, Dernière image non blanche, Une piste audio, au niveau d’un fond | PASS, code 0 (10 s) |
| socle-pubs-qa | SP-4 | FAIL SP-4 — visages-qa.mjs absent sous .orchestre/travail/juges-026-pubs-contenu/reference-09 | PASS, code 0 (9 s) |
