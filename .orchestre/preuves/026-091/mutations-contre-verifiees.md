# Contre-mutations du méta-juge — 026-091

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-091 --script=scripts/juges-026-horloge-bus-mutations.mjs --rapport=.orchestre/preuves/026-091/mutations.json` le 2026-09-30T04:00:22.050Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 222741712 (rejouer : `--graine=222741712`).

- 1. entrée 21 · `scripts/prospection-sql-qa.mjs` · PG-4 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL PG-4 — une branche « envoye » lève ops:opposition : le passage à envoye n'est refusé que par ops:pause_generale et ops:accord_perime (décision du 27/09) »
- 2. entrée 5 · `scripts/ops-sql-qa.mjs` · OS-3 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL OS-3 — déclencheur absent ou incomplet : un déclencheur `before update or delete` (fonction `ops.evenements_ajout_seul()`) lève une exception, sauf si… »
- 3. entrée 46 · `scripts/veilleur-qa.mjs` · VA-3 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL VA-3 — notifications_jour déjà à 3 au créneau du matin : 1 digest envoyé (agents:2026-10-20:matin), aucun attendu (3 envois non urgents au plus par jour) ; notifications_jour déjà à 3 : 1 événement(s) « notification » écrit(s), aucun attendu »
