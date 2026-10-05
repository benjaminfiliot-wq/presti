# Contre-mutations du méta-juge — 026-161

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-161 --script=scripts/juges-026-mutations.mjs --rapport=.orchestre/preuves/026-161/mutations.json` le 2026-10-05T01:22:13.885Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 839075645 (rejouer : `--graine=839075645`).

- 1. entrée 31 · `scripts/juges-026-preuve.mjs` · CV-2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL CV-2 — 2 défaut(s) : 026-008 : juge scripts/c-qa.mjs écrit par aucune fiche de juges (fiche de fabrication) »
- 2. entrée 28 · `scripts/prospects-entrant-qa.mjs` · PE-4 · code intact 0 · code muté 1 · NON PRISE (code 1, PE-4 non attrapé : aucune ligne « FAIL PE-4 — … » ; aucun bilan « … : FAIL — ids » (en échec : ✗ PE-4 accord-absent (accord) : status 200 (400 attendu), 1 appel(s) base | accord-chaine (accord) …)) · extrait : « — »
- 3. entrée 7 · `scripts/agents-llm-qa.mjs` · LL-7 · code intact 0 · code muté 1 · NON PRISE (code 1, LL-7 non attrapé : le bilan « … : FAIL —  » ne nomme pas LL-7 (en échec : FAIL LL-7 — échec)) · extrait : « — »
