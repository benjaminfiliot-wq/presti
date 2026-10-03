# Contre-mutations du méta-juge — 026-151

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-151 --script=scripts/juges-026-orchestre-chef-mutations.mjs --rapport=.orchestre/preuves/026-151/mutations.json` le 2026-10-02T01:54:20.228Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 142960676 (rejouer : `--graine=142960676`).

- 1. entrée 17 · `scripts/chef-qa.mjs` · CH-A9 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL CH-A9 — le jeton d'essai est écrit dans .orchestre/travail/chef/appliquer-2026-10-02T01-53-36-469Z.json »
- 2. entrée 21 · `scripts/chef-qa.mjs` · CH-C2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL CH-C2 — plein : argv porte « sandbox_workspace_write.network_access=true » »
- 3. entrée 11 · `../orchestre/test/preuve-026.mjs` · ORB-9 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL ORB-9 — prix sans --benj refusé et décisions intactes : false (code 0) · gabarit decisions.md (section quarantaine + règle) : true · hors quarantaine → FAIL nommant decisions.md : true (code 1) · sous « Proposées » → PASS : true (code 0) · rappel « décisions tranchées » sur prochaine(D) : true · pas de fuite du texte de la proposition : true · Attention cite promouvoir : true »
