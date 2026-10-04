# 026-138 — contre-vérification (rédigée le 04/10/2026 ; le nom du fichier garde le « 29-09 » de la consigne)

Le juge n'a rien de « réversible » côté production : l'épreuve est une LECTURE de la production, qu'on ne sabote pas (aucune migration, aucune donnée touchée). Les quatre sabotages portent donc sur le JUGE, rejoués en `--reel --fenetre=24` (donc contre les vraies données du jour) sur une COPIE temporaire de `scripts/horloge-qa.mjs` (`scripts/horloge-qa-sabotage.tmp.mjs`, retirée ensuite). Le fichier réel n'est jamais écrit.

Chaque sabotage doit faire rougir exactement UN critère, avec son message, les huit autres restant verts :

- S1 : on remet le défaut du 04/10 (la lecture du journal s'arrête sur une page courte) : code 1, PRIS ; 8 critères restés verts ; `FAIL E24-2 — 0 passages de a0, 276 au moins attendus` (le symptôme exact du relevé rouge du 04/10 15:00 UTC : la preuve que le juge corrigé ne l'est pas par hasard).
- S2 : le seuil de E24-2 passe de 276 à 300 passages : code 1, PRIS ; 8 critères restés verts ; `FAIL E24-2 — 288 passages de a0, 300 au moins attendus`.
- S3 : le plafond de notifications de E24-7 passe de 3 à 1 par jour : code 1, PRIS ; 8 critères restés verts ; `FAIL E24-7 — 2 notifications le 2026-10-04 (3 au plus par jour de Paris)` (prouve que le juge lit enfin de vraies notifications : l'ancien « aucune notification » n'était qu'une page tronquée).
- S4 : la clé de digest attendue par E24-3 est faussée : code 1, PRIS ; 8 critères restés verts ; `FAIL E24-3 — aucun digest de clé agents:2026-10-04:soirx ; aucun digest de clé agents:2026-10-04:matinx`.

sha256 de `scripts/horloge-qa.mjs` avant et après : `bca7a81b644441542539a5a6bac752df0c76faf3e5668e215c4a6135f277109b`, identique ; copie temporaire retirée.

Ménage de la production : chaque `--reel` enregistre puis retire un agent d'essai `essai_e2e_<aléa>` (dans un `finally`) ; après les cinq passages du jour (le juge propre et les quatre sabotages), `select count(*) from ops.agents where nom like 'essai\_e2e\_%'` rend 0 (lecture SQL du 04/10).

Le script de rejeu vit dans le scratchpad de la session, pas dans le dépôt.
