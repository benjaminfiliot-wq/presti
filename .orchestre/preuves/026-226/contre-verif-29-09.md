# Contre-vérification 026-226 (rejouée le 04/10, dépendances 026-220, 026-103, 026-121 en fait/)

sha256 de scripts/chef/douleurs.mjs avant : d41d7828b7a9fdbf12e8a84d2cadc92619d034c09fd407d8605ea0f6f8c698be

- sabotage DO-2 (la clé idempotente est ignorée (une reprise réécrit)) : code 1, rouges DO-2 -> critère attendu ROUGE (ok)
- sabotage DO-4 (une source unique devient une tendance) : code 1, rouges DO-4 -> critère attendu ROUGE (ok)
- sabotage DO-6 (le mois vide invente un autre statut) : code 1, rouges DO-6 -> critère attendu ROUGE (ok)
- sabotage DO-8 (les extraits partent au classeur sans masquage) : code 1, rouges DO-8 -> critère attendu ROUGE (ok)

sha256 après restauration : d41d7828b7a9fdbf12e8a84d2cadc92619d034c09fd407d8605ea0f6f8c698be -> identique

Référence non sabotée : code 0, 11 critère(s) PASS, aucun rouge (DO-0 compris : les trois dépendances sont en fait/).

Chaque sabotage est rejoué depuis le texte original, restauré dans un finally ; aucun appel réseau (juge hors réseau, horloge figée).
