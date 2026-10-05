# Contre-mutations du méta-juge — 026-152

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-152 --script=scripts/juges-026-lt-mutations.mjs --rapport=.orchestre/preuves/026-152/mutations.json` le 2026-10-05T02:24:01.463Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 332411484 (rejouer : `--graine=332411484`).

- 1. entrée 13 · `scripts/livraison-schema-qa.mjs` · SC-3 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL SC-3 — la contrainte liste ["brouillon","payee","generee","validee","en_ligne"], ["brouillon","payee","generee","validee","en_ligne","retiree"] attendu (ETATS de lib/siteCommande.ts, dans l'ordre, suivis de 'retiree') »
- 2. entrée 18 · `scripts/commande-exporter-qa.mjs` · EX-7 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL EX-7 — le serveur du juge a reçu 1 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/ailleurs.jpg »
- 3. entrée 3 · `scripts/tuile-argent-qa.mjs` · TA-2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL TA-2 — la route contient .reduce( (ligne 20) »
