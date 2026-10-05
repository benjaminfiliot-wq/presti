# Contre-mutations du méta-juge — 026-099

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-099 --script=scripts/juges-026-envoi-mutations.mjs --rapport=.orchestre/preuves/026-099/mutations.json` le 2026-10-05T09:32:20.982Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 1409602339 (rejouer : `--graine=1409602339`).

- 1. entrée 32 · `scripts/disjoncteurs-qa.mjs` · DJ-3 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL DJ-3 — seuil de coupure des échecs consécutifs incorrect »
- 2. entrée 41 · `scripts/repondeur-qa.mjs` · RP-7 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL RP-7 — rdvParJeton(hacherJeton du jeton d'essai) : aucun lien retrouvé (le jeton en clair n'a pas dû être passé à creerLienRdv) »
- 3. entrée 61 · `scripts/prospection-sql-qa.mjs` · PG-4 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL PG-4 — code(s) jamais levé(s) par un raise : ops:formulaire_deja »
