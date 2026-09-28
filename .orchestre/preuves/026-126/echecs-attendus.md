# Échecs attendus des juges du lot 10 (026-126) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=10` le 2026-09-28T21:40:26Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `a537149a81da` sous `.orchestre/travail/juges-026-pubs-contenu/reference-10`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| pub-locale-qa --partie=gabarit | PL-G1 | FAIL PL-G1 — non évalué : gabarits-pubs/locale/contrat.json introuvable | PASS, code 0 (59 s) |
| pub-locale-qa --partie=textes | PL-T1 | FAIL PL-T1 — non évalué : gabarits-pubs/locale/contrat.json introuvable | PASS, code 0 (0 s) |
| pub-locale-qa --partie=complet | PL-1 | FAIL PL-1 — non évalué : gabarits-pubs/locale/contrat.json introuvable | PASS, code 0 (96 s) |
