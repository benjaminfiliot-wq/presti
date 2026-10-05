# Contre-mutations du méta-juge — 026-250

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-250 --script=scripts/juges-026-postes-mutations.mjs --rapport=.orchestre/preuves/026-250/mutations.json` le 2026-10-05T00:45:27.246Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 2044309464 (rejouer : `--graine=2044309464`).

- 1. entrée 60 · `scripts/vigile-qa.mjs` · VG-13 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL VG-13 — scripts/vigile/releve.mjs contient /api/controle/ ; pause_posee : requête vers /api/controle/pause (route du Poste) ; pause_posee : POST /api/controle/pause hors des routes permises ; pause_relance : requête vers /api/controle/pause (route du Poste) ; pause_relance : POST /api/controle/pause hors des routes permises (et 16 autre(s)) »
- 2. entrée 33 · `scripts/qualite-sites-qa.mjs` · QSI-5 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL QSI-5 — pannes [], ["lien_mort"] attendues »
- 3. entrée 58 · `scripts/vigile-qa.mjs` · VG-12 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL VG-12 — CIBLES_INTERDITES de releve.ts : ["pont","pont_telegram","systeme","a0","usine","vigile"] (exactement chef, pont, pont_telegram, systeme, a0, usine, vigile) ; pause_cibles_omises : pauses : 1 élément(s) au lieu de 0 ([{"agent":"chef","seuil":"boucle_erreurs","mesure":40}]) ; pauses_ecartees.cible_interdite : 1 au lieu de 2 ; pause_toutes_cibles : pauses : 1 élément(s) au lieu de 0 ([{"agent":"chef","seuil":"boucle_erreurs","mesure":30}]) ; pauses_ecartees.cible_interdite : 6 au lieu de 7 ; vigile.json sans chef ni pont : 1 POST pauses (la liste en dur l'emporte : aucune) ; les sept cibles interdites à 30 échecs, réglage vidé : 1 POST pauses (chef) : aucune attendue »
