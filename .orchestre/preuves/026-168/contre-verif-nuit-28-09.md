# 026-168 — contre-vérification indépendante, nuit du 28/09

## Verifier

- `node scripts/orchestre.mjs verifier 026-168` dans le dépôt partagé (05:37 UTC) : FAIL, code 1, 90 s, **sortie vide**. Rejoué à la main, la preuve n'a rien de rouge dans ses journaux : elle a simplement été coupée par mon `timeout 900` (paquet d'`usine.mjs executer` à 55 s par appel dans le dépôt qui bouge). Ce n'est pas un défaut du juge.
- `bash presti-ops/usine/verifier-isole.sh 026-168` : **PASS, 642 s**, JA-1 à JA-10 verts (`verifier.log` rapporté).

## Trace existante

`juges-savent-echouer.md` et `echecs-attendus.md` (lot p) : 19 sabotages déclarés dans `lot.mjs`, tous vus par JA-8 ; plus 7 défauts de l'ancien juge rejoués. Trace présente.

## Incident pendant la contre-vérification (réparé)

Mon passage coupé de la preuve a laissé `.orchestre/travail/juges-026-pilotage/temoin-p/atelier-temoin/planche/index.html` dans l'état du sabotage `decor-lisse` (la preuve sabote en place et restaure ensuite). Mon premier témoin (copie de `temoin-p`) était donc rouge sur PN-3, PN-4 et PN-7. Le juge a bien vu la faute. Le fichier est recopié depuis la fixture (`cmp` identique sur tous les fichiers `.temoin`), et le banc reconstruit maintenant chaque copie depuis la fixture.
À noter pour la preuve 026-012 : un passage interrompu laisse `temoin-p` saboté. Le passage suivant le reconstruit (rmSync), donc c'est sans conséquence sur le verdict.

## Nouveaux sabotages (banc : `scratchpad/sabot.sh`)

Pour chaque sabotage : une copie jetable de la racine témoin (`.orchestre/travail/station-planche-qa/cv-<nom>`, reconstruite depuis la fixture), une seule modification, puis le juge lancé directement (`station-planche-qa --partie=planche --atelier=atelier-temoin --racine=<copie>`, `JUGE_BASE_GIT` = référence). La copie est supprimée ensuite, et la fixture n'est jamais touchée.
**Témoin sur la même copie non modifiée : code 0, 9 ✅** (mesures réelles : 533 632 pixels dans la palette, 5 rendus a/b identiques, 4 personnages dessinés).

| # | Sabotage (nouveau, absent des 19 du lot) | Fichier | Verdict du juge | Bon critère |
|---|---|---|---|---|
| 1 | écran « - » (trait d'union fixe, sans donnée) au lieu de « — » | planche.js | code 1, seul ❌ PN-6 « écran commandement dit « - », « — » attendu » | oui |
| 2 | plaque « Radars » au lieu de « Radar » | planche.js | code 1, seul ❌ PN-2 « plaque « RADAR » absente de sa zone (lu : « RADARS ») ; plaque(s) inconnue(s) » | oui |
| 3 | réservée avec `data-poste="oui"` | planche.js | code 1, seul ❌ PN-2 « réservée : data-poste « oui », « non » attendu (sans poste) » | oui |
| 4 | une couleur de l'atelier décalée d'un cran (#1b0b33 → #1b0b35) | planche.js | code 1, seul ❌ PN-4 « 82544 pixel(s) hors palette (#1b0b35) », portrait compris | oui |
| 5 | `k.390: 6` → `5` | planche.md | code 1, seul ❌ PN-3 « telephone : canevas 1056×1920, grille 176×320 × k 5 = 880×1600 attendu » | oui |
| 6 | atlas.png gonflé de 800 Ko (visait PN-8) | atlas.png | **code 2** : préalable « 1 093 486 caractères compressés, 30 000 au plus pour partir avec la relance » | non : PN-8 n'est pas atteint |

**5 sabotages rougis sur le bon critère, et sur lui seul** (8 ✅ + 1 ❌ chaque fois). Le sixième est une limite du banc, pas du juge : la charge `--envoi` d'un atelier témoin est plafonnée à 30 000 caractères, donc le poids de PN-8 ne peut pas être éprouvé sur le témoin. Sur `~/claw3d-pixel` (026-169), il n'y a pas de charge `--envoi`. PN-8 est couvert dans le lot par `feuille-brute`.

## Restauration

`git diff -- scripts/station-planche-qa.mjs scripts/fixtures/026-pilotage/p | sha1sum` = 71c63438… avant et après. `git status --porcelain` sur ce même périmètre = cffe4d74… avant et après. Aucun dossier `cv-*` restant. `temoin-p` est identique à la fixture.

## Conclusion

Le juge mesure le rendu (DOM visible, pixels, grille). Ce n'est pas un contrôle de présence, et son témoin vert n'est pas inconditionnel. Contre-vérification : **verte**.
