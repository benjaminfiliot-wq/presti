# 026-254 — contre-vérification : 5 sabotages de la production, tous attrapés par le bon critère

Fait le 2026-10-04 (le nom du fichier est celui que la fiche demande). Méthode de 026-073 : chaque sabotage est appliqué à une COPIE de `lib/agents/acquisition/douleurs.ts` sous le scratchpad, jugée par `douleurs-qa.mjs --cible-complete --racine=<copie>`. La production n'est jamais ouverte en écriture pendant l'épreuve : un autre chantier du dépôt qui l'importerait au même moment ne verrait pas un fichier saboté. Le juge relit à chaque fois les 43 pages sur le réseau réel.

## Empreintes (sha256)

| Fichier | Avant les sabotages | Après les sabotages |
|---|---|---|
| lib/agents/acquisition/douleurs.ts (production) | ccdccd1161399032db075ec70e7822e08f8dc120e6e55cb956d2f526ace65a17 | ccdccd1161399032db075ec70e7822e08f8dc120e6e55cb956d2f526ace65a17 |
| docs/agents/douleurs-methode.md | e845f96a2a7e844f67ce482779f901e9c0c2da8f187f6eabc0e54ba8d0eb4bbd | e845f96a2a7e844f67ce482779f901e9c0c2da8f187f6eabc0e54ba8d0eb4bbd |

Avant la relève : douleurs.ts 42afba2ffe9609f0107098cbd06b4116b8ca267664d251fea874f5f35d3635c7 (14 entrées) ; douleurs-methode.md 1fff5ff821058c64a245489b88275ee22c0de24cc05f74d992ce4a5f94d80e12. Le diff de douleurs.ts est de 29 lignes ajoutées et 0 retirée : les 14 entrées de 026-073 sont inchangées, octet pour octet (le script d'insertion a aussi comparé le préfixe et le suffixe du fichier par sha256 : identiques).

## Les sabotages

| # | Sabotage | Verdict du juge | Critère attendu |
|---|---|---|---|
| 1 | citation d'un mot changé (menuisier-detail-oublie-devis : « plombe » devient « plomb ») | `DL-4 en échec — menuisier-detail-oublie-devis : code 200, absente` · FAIL | DL-4 (substance sur la page) |
| 2 | un plaquiste relabellisé « tous » (plaquiste-mal-a-tarifer-a-son-compte) | `DL-1 métier plaquiste : 2 entrée(s), 3 au moins` · FAIL | DL-1 (3 par métier couvert) |
| 3 | 4 entrées retirées (43 devient 39) | `DL-1 39 entrée(s), 40 au moins attendues` · FAIL | DL-1 (la cible complète) |
| 4 | une nouvelle entrée (couvreur-aucun-retour-apres-devis) passée à `approuve: true` sans ligne d'approbation | `DL-2 couvreur-aucun-retour-apres-devis : approuve vaut true sans ligne d'approbation (approbation.txt de 026-083)` · FAIL | DL-2 (rien n'est approuvé en douce) |
| 5 | « Presti » glissé dans la question de macon-impayes-clients-tresorerie | `DL-5 macon-impayes-clients-tresorerie : question : terme interdit « presti »` · FAIL | DL-5 (liste noire) |

Chaque sabotage ne fait échouer que son critère ; la production, rejugée ensuite (`verifier.log`), est verte : DL-1 à DL-5, 43 entrées, 43/43 citations retrouvées mot pour mot.

## Ce que la contre-vérification ne couvre pas

Le juge prouve qu'une citation est sur sa page, pas que son auteur est un artisan : cela, c'est la lecture de chaque page par celui qui a fait la relève (voir `docs/agents/douleurs-methode.md`, section de la relève du 2026-10-04) puis la lecture de Benj, qui approuve les 29 nouvelles entrées une par une.
