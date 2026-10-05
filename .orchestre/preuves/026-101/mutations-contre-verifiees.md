# Contre-mutations du méta-juge — 026-101

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-101 --script=scripts/juges-026-acquisition-mutations.mjs --rapport=.orchestre/preuves/026-101/mutations.json` le 2026-10-05T01:10:54.361Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 1450100721 (rejouer : `--graine=1450100721`).

- 1. entrée 20 · `scripts/faits-qa.mjs` · JF-11 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL JF-11 — 190 : le fait pub_meta n'est pas gardé en non_verifiable ([]) »
- 2. entrée 49 · `scripts/routes-acquisition-qa.mjs` · RA-2 · code intact 0 · code muté 1 · NON PRISE (code 1, RA-2 non attrapé : aucune ligne « FAIL RA-2 — … » (en échec : ✅ RA-7 vercel.json et les trois routes cron existantes inchangés (git diff HEAD) ; npm run typechec…)) · extrait : « — »
- 3. entrée 55 · `scripts/routes-acquisition-qa.mjs` · RB-4 · code intact 1 · code muté — · NON PRISE (copie intacte en code 1 : routes-acquisition-qa --lot=echanges : FAIL — RB-7) · extrait : « — »
