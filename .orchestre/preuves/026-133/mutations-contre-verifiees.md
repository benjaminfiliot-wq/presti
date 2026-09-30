# Contre-mutations du méta-juge — 026-133

> Écrit par `node scripts/juges-026-mutations-preuve.mjs --fiche=026-133 --script=scripts/juges-026-usine-mutations.mjs --rapport=.orchestre/preuves/026-133/mutations.json` le 2026-09-30T08:24:50.884Z.
> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.

Graine : 479265078 (rejouer : `--graine=479265078`).

- 1. entrée 25 · `scripts/usine-sql-qa.mjs` · US-2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL US-2 — on conflict : public = true (false attendu) »
- 2. entrée 36 · `scripts/usine-production-qa.mjs` · UT-2 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL UT-2 — scripts/usine/tourneur.mjs lance par un shell (shell: true ou exec de child_process) ; 0 lancement(s) du fabricant (un attendu) ; 0 requête(s) de dépôt (une attendue) ; rendre : [{"tache":"4ea4d314-a5b9-444f-ba34-dc7dc3ce877d","resultat":"echec","erreur":"fabrication:code 127"}] (une fois, faite, supabase://usine/<tache>/sortie/ attendu) (et 1 autre(s)) »
- 3. entrée 34 · `scripts/usine-routes-qa.mjs` · UR-6 · code intact 0 · code muté 1 · attrapée · extrait : « FAIL UR-6 — signatures de dépôt ["usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/rapport-qa.json","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/site/images/photo.webp","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/site/index.html","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/site/styles.css"] (exactement ["usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/sortie/rapport-qa.json","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/sortie/site/images/photo.webp","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/sortie/site/index.html","usine/c3b81e3e-b8d7-45c3-844e-3537a2880d3d/sortie/site/styles.css"] attendues) ; dépôt « site/index.html » sans signature reçue ; dépôt « site/styles.css » sans signature reçue ; dépôt « site/images/photo.webp » sans signature reçue (et 1 autre(s)) »
