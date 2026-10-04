# Contre-mutations du méta-juge — 026-192

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-192 --script=scripts/juges-026-station-poste-mutations.mjs --rapport=.orchestre/preuves/026-192/mutations.json` le 2026-10-04T23:53:30.937Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 773314688 (rejouer : `--graine=773314688`).

- 1. entrée 6 · `scripts/station-route-qa.mjs` · SL-2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL SL-2 — salle=audience sans le domaine audience : {"vue":"salle","role":"direction","valeur":{"en_ligne":2,"visiteurs_jour":31,"v…, « hors périmètre » attendu »
- 2. entrée 5 · `scripts/poste-extraction-qa.mjs` · XT-3 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL XT-3 — lib/controle/lectures/tickets.ts nomme une colonne de contenu dans une chaîne (« message ») : ni message, ni corps, ni sujet, ni contenu ; la requête sur tickets sélectionne « id, message » : une colonne de contenu »
- 3. entrée 3 · `scripts/station-reglages-qa.mjs` · RX-4 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL RX-4 — PUT : journaliser( vient APRÈS station_reglages_ecrire : le journal se pose avant d’écrire ; PUT : 1 appel(s) de journaliser(, 2 attendus (avant, puis le résultat) ; ordre des appels : ecriture → journal1, journal1 → ecriture → journal2 attendu (le journal AVANT l’écriture, puis le résultat) ; journal avant : action « station_reglages », avant undefined ; station_reglages et { version: 3 } attendus ; journaliser → false : la base est écrite quand même ; journaliser → false → 200, 503 (refusJournal) attendu »
