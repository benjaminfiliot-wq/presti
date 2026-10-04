# 026-246 — contre-vérification : 4 sabotages réversibles de la production

Date : 2026-10-04 (le nom du fichier suit la consigne du lot). Production sabotée : le juge `scripts/qualite-sites-qa.mjs` et ses jeux d'essai
(`scripts/fixtures/026/qualite-sites/serveur-factice.mjs`, `sonde.mjs`) — la fiche est une fiche de juge : sa production est ce qui juge. Chaque sabotage
est appliqué à la copie vivante, `node scripts/qualite-sites-qa.mjs --preuve-echecs` est lancé (c'est la commande `verifier` de la fiche), son CODE DE SORTIE et les
lignes `FAIL AUTO-…` sont lus, puis le fichier est restauré depuis la sauvegarde et son sha256 comparé à celui d'avant. Un juge affaibli doit faire rougir sa propre
preuve des échecs : c'est ce que l'on mesure ici.

Témoin avant sabotage : `--preuve-echecs` code 0, les 29 essais PASS (arbre sans module → QSI-2 en premier, témoin vert, 26 sabotages tous pris avec leur critère).

sha256 avant tout sabotage, et après le dernier rétablissement (identiques) :

- `scripts/qualite-sites-qa.mjs` : `a98e14c09ec1fe794602ca0a13960549325009d5be128e9dfa15b4116f2f3f32`
- `scripts/fixtures/026/qualite-sites/serveur-factice.mjs` : `15e4b66366ac5f59e676bb47fc96f32eb72dffe91ecd7494c30c3d10dba5838f`
- `scripts/fixtures/026/qualite-sites/sonde.mjs` : `1309fbbb713e4969c9a5cc17d25a7c35a88bcc9c34cae9689e5ab47b1ab74a68`

| # | sabotage | fichier | code | ce qui devient rouge | restauré |
|---|---|---|---|---|---|
| S1 | le juge rend toujours le code 0 (`return rouges.length ? 1 : 0` → `return 0`) : un rouge ne fait plus échouer le processus | `qualite-sites-qa.mjs` | 1 | `qualite-sites-qa --preuve-echecs : FAIL` : les 26 sabotages deviennent « non pris » (`FAIL AUTO-ecriture-sur-le-site — QSI-1`, `…soumission-reelle-du-formulaire — QSI-7`, `…site-programme-au-retrait-audite — QSI-2`, etc.) | oui (sha256 identique) |
| S2 | la lecture du source ne cherche plus les interactions de page (`.click(`, `.fill(`…) | `qualite-sites-qa.mjs` | 1 | `FAIL AUTO-clic-sur-envoyer — QSI-7` (et lui seul : le clic n'existe que dans le texte du module, le navigateur factice n'a pas de page) | oui (sha256 identique) |
| S3 | le serveur factice consigne toute requête comme un `GET` : une écriture devient invisible côté serveur | `serveur-factice.mjs` | 1 | `FAIL AUTO-ecriture-obfusquee — QSI-1` (et lui seul : `ecriture-sur-le-site` reste pris par la lecture du source, `soumission-obfusquee` par le compteur `soumissions`) | oui (sha256 identique) |
| S4 | la sonde ne vérifie plus les pannes de poids (budget STRICT de 3 Mio) | `sonde.mjs` | 1 | `FAIL AUTO-budget-au-seuil-inclus — QSI-3` (et lui seul : les deux autres sabotages de poids sont pris par l'égalité des octets) | oui (sha256 identique) |

Témoin après restauration : `--preuve-echecs` relancé propre (code 0, 29 essais PASS) — `echecs-attendus.md` et `verifier.log` régénérés de ce passage propre, pas d'un passage saboté.

Lecture honnête :
- S1 casse le verdict lui-même : tous les sabotages passent au vert côté juge, et c'est `--preuve-echecs` qui le dit, avec 26 lignes rouges, pas une seule.
- S2 et S3 montrent la défense en profondeur voulue : la lecture du texte du module et la mesure côté serveur se recoupent (une écriture littérale est vue des deux côtés ; une écriture
  obfusquée — `['DEL', 'ETE'].join('')` — n'est vue que du serveur ; un clic n'est vu que du texte). Retirer un des deux étages fait rougir **exactement** le sabotage que seul cet étage prenait.
- S4 retire une assertion de la sonde et fait rougir le seul sabotage (`>=` au lieu de `>`) qu'elle seule détectait.
- Limite connue : le juge ne prouve ni Playwright ni Lighthouse réels, ni le coffre de l'usine, ni les gardes de jeton, ni la vraie Search Console ; `--reel` est refusé (code 2) tant que Benj n'a pas confirmé un premier audit réel (026-251).
- Verdict de la contre-vérification : PASS.
