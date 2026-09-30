# Contre-vérification 026-226 (29/09)

sha256 de scripts/chef/douleurs.mjs avant : d41d7828b7a9fdbf12e8a84d2cadc92619d034c09fd407d8605ea0f6f8c698be

- sabotage DO-2 : code 1, rouges DO-0, DO-2 -> critère attendu ROUGE (ok)
- sabotage DO-4 : code 1, rouges DO-0, DO-4 -> critère attendu ROUGE (ok)
- sabotage DO-6 : code 1, rouges DO-0, DO-6 -> critère attendu ROUGE (ok)
- sabotage DO-8 : code 1, rouges DO-0, DO-8 -> critère attendu ROUGE (ok)

sha256 après restauration : d41d7828b7a9fdbf12e8a84d2cadc92619d034c09fd407d8605ea0f6f8c698be -> identique

Note : DO-0 (dépendance 026-103 DISJONCTÉE, absente de fait/) reste rouge dans tous les cas ; les autres critères DO-1..DO-9 et DO-R sont verts sur la référence non sabotée.
