# Contre-mutations du méta-juge — 026-152

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-152 --script=scripts/juges-026-lt-mutations.mjs --rapport=.orchestre/preuves/026-152/mutations.json` le 2026-09-29T17:29:38.524Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 1863748343 (rejouer : `--graine=1863748343`).

- 1. entrée 21 · `scripts/bus-livraison-qa.mjs` · BL-1 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL BL-1 — ops_tache_clore appelée 0 fois, une attendue (appels : ops_interrupteur, ops_tache_rendre, ops_battement, ops_battement) »
- 2. entrée 8 · `scripts/commande-exporter-qa.mjs` · EX-7 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL EX-7 — le serveur du juge a reçu 1 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/voisin.jpg »
- 3. entrée 5 · `scripts/complement-dossier-qa.mjs` · CD-4 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL CD-4 — l'objet de mise à jour porte etat (seuls domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, modifie_le sont permis) ; etat a changé ("payee" → "en_ligne") »
