# 026-243 — contre-vérification : quatre sabotages réversibles de la production

Chaque sabotage altère UNE ancre de lib/direction/comptable.ts, lance le juge (scripts/comptable-qa.mjs), puis le fichier est restauré (sha256 comparés).

- sha256 de lib/direction/comptable.ts avant : 718fc71a6b6ab0ec6a8c5f6232ebbefc6e3f08e353ad70f1cd205d6e26d54dd1
- ROUGE ATTENDU doublon-recompte (CPT-2) : code 1 — FAIL CPT-2 — 10 paiements distincts attendus — comptable-qa : FAIL — CPT-2, CPT-3, CPT-4
- ROUGE ATTENDU alerte-muette (CPT-3) : code 1 — FAIL CPT-3 — seuil 92000 incorrect — comptable-qa : FAIL — CPT-3
- ROUGE ATTENDU libelle-moteur-gratuit (CPT-6) : code 1 — FAIL CPT-6 — repli fixe requis — comptable-qa : FAIL — CPT-6
- ROUGE ATTENDU totaux-differents (CPT-7) : code 1 — FAIL CPT-7 — totaux publics différents — comptable-qa : FAIL — CPT-7
- sha256 après restauration : 718fc71a6b6ab0ec6a8c5f6232ebbefc6e3f08e353ad70f1cd205d6e26d54dd1 (identique)
- juge après restauration : code 0 — comptable-qa : PASS
