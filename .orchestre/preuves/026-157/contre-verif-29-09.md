# 026-157 — contre-vérification du 29/09 (4 sabotages réversibles, PC saturé à 100 % de CPU)

Chaque sabotage : modification d'une ligne de la production, `node scripts/pack-pub-livraison-qa.mjs --partie=depot`, restauration, comparaison sha256.
sha256 avant = après : deposer.mjs dcad072cec164765fdbd550795606650866f68239d6e047e4eb47fd57f66d582 · exporter.mjs 6ae3c24607f8bd2f357d0e970389627623d4da9febc8c734cc98232d08c121e6 (contrôlé, identiques).

| # | sabotage | attendu | résultat |
|---|----------|---------|----------|
| S1 | deposer : `.eq('etat', 'payee')` retiré du passage payee → fabriquee | LV-2 FAIL | DÉTECTÉ — « passage d'état .eq('etat', 'payee') absent » |
| S2 | deposer : marge 400 Mo ramenée à 40 Mo | LV-2 FAIL | NON DÉTECTÉ — LV-2 reste PASS (le juge cherche « 400 » dans le source ; le message d'erreur le contient encore) : faiblesse du juge, `pack-pub-livraison-qa.mjs` est interdit ici |
| S3 | exporter : `email` recopié dans pack.json | LV-10 FAIL | DÉTECTÉ — « pack.json contient une adresse de courriel » |
| S4 | exporter : lecture `.eq('id', packId)` remplacée par `.limit(1)` | LV-11 FAIL | NON DÉTECTÉ par LV-11 (un autre `.eq('id', …)` du fichier suffit au juge) ; sur l'essai fichier, LV-10 échoue seulement par SIGTERM de la charge machine : faiblesse du juge |

Constat : S2 et S4 sont deux trous du juge (à traiter dans une fiche qui a le droit de toucher `scripts/pack-pub-livraison-qa.mjs` : contrôler que la marge est bien dans la comparaison, et que le `.eq('id', packId)` est sur la lecture de `packs_pubs`). Le code livré est conforme à la fiche dans les deux cas (marge 400 Mo ligne 87 de deposer.mjs, lecture filtrée ligne 27 de exporter.mjs).

Charge : sur ce PC saturé, LV-1 (--a-sec, juge local complet) est tué par SIGTERM à ~250 s dans tous les passages ; le juge local `pub-locale-qa.mjs --partie=complet` lancé seul sur le témoin rend PASS (12 critères PL-1 à PL-12) en 509 s.

## Rejeu après durcissement du juge (29/09 au soir, Claude Code, sur copie du dépôt sous .orchestre/scratch/r157)

Juge `pack-pub-livraison-qa --partie=depot` corrigé (LV-2 : seuils 400 et 30 Mo exigés dans une comparaison en octets ; LV-11 : `.eq('id', …)` exigé sur `from('packs_pubs').select(…)` ; délais LV-1 et LV-10 relevés). Témoin S0 (production inchangée) : LV-2, LV-10, LV-11 PASS. Sabotages sur la copie :

| # | sabotage | résultat |
|---|----------|----------|
| S1 | deposer : `.eq('etat', 'payee')` retiré | DÉTECTÉ (LV-2 FAIL) |
| S2 | deposer : marge 400 Mo → 40 Mo | DÉTECTÉ (LV-2 FAIL) — était non détecté |
| S3 | exporter : `email` recopié dans pack.json | DÉTECTÉ (LV-10 FAIL) |
| S4 | exporter : `.eq('id', packId)` → `.limit(1)` | DÉTECTÉ (LV-11 FAIL) — était non détecté |
| S5 | deposer : plafond 30 Mo → 300 Mo | DÉTECTÉ (LV-2 FAIL) — nouveau |

Fichiers de production non touchés par ces essais (copies jetables).
