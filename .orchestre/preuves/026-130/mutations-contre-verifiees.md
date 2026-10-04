# Contre-mutations du méta-juge — 026-130

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-130 --script=scripts/juges-026-pilotage-mutations.mjs --rapport=.orchestre/preuves/026-130/mutations.json` le 2026-10-04T23:44:58.130Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 510077423 (rejouer : `--graine=510077423`).

- 1. entrée 42 · `scripts/pilotage-gestes-qa.mjs` · GE-12 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL GE-12 — source=rdv : rpc [["acq_reponse_appel_rendu",{"p_reponse":"90000000-0000-4000-8000-000000000001"}]], un acq_rdv_appel_rendu { p_id } attendu ; ordre journaliser → rpc:acq_reponse_appel_rendu »
- 2. entrée 14 · `scripts/pilotage-logique-qa.mjs` · AC-7 · code intact 1 · code muté — · NON PRISE (copie intacte en code 1 : (Use `node --trace-warnings ...` to show where the warning was created)) · extrait : « — »
- 3. entrée 51 · `scripts/station-route-qa.mjs` · SV-5 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL SV-5 — station.ts contient .sort( »
