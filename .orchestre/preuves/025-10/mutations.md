# Contre-vérification 025-10

**FAIL : constructeur-ferme-qa : témoin non conforme ; aucune attribution causale aux mutations**

Cas après le blocage non exécutés ; aucun PASS global.

| Cas / faute | Critère attendu | Verdict | Extrait réel |
|---|---|---|---|
| promesses-qa témoin | code 0 et PASS | PASS | promesses-qa : PASS |
| PR-M1 : apostrophe typographique dans manifest | PR-1 | REFUSÉE | FAIL PR-1 — app/manifest.ts:49 [moins d’une minute] « Presti répond en moins d’une minute. » |
| PR-M2 : entité apos dans page | PR-1 | REFUSÉE | FAIL PR-1 — app/page.tsx:337 [moins d’une minute] « Presti répond en moins d’une minute. » |
| PR-M3 : présence soignée dans plans | PR-3 | REFUSÉE | FAIL PR-3 — lib/plans.ts:155 [Présence en ligne soignée] « Présence en ligne soignée » |
| constructeur-ferme-qa témoin | code 0 et PASS | FAIL | constructeur-ferme-qa : FAIL — CF-3, CF-4, CF-8 |

Verdict : FAIL.

## Montage et limites (07/10/2026)

Ancien budget 30 min terminé sur le refus PR-1, preuves conservées dans le commit 285124dc et .orchestre/travail/025-10/archives-1007/. Correction distincte dd9c076f validée officiellement depuis fait/. Réponse option1, libération puis nouvelle acquisition codex le 07/10 à 06:31:55Z : nouveau budget explicite de 30 min.

Exécution ci-dessus sur copie isolée Oracle /home/usine/reprise-1001/juges025-1007, archive des sources suivies du HEAD dd9c076f (pas les modifications PC non commitées), références historiques Git lues via GIT_DIR=/home/usine/presti/.git ; aucun push, installation ou API payante. Runner PC/Oracle SHA256 identique : 5798408f1db1512fd95fb3dfe1f54d50565274bca10d8916fc8ed63aa6098a63. Version courante testée ; premier refus et première exécution conservés sur Oracle hors du bac.

Le runner déclare 23 mutations minimales, attend des témoins complets verts et des refus nommés en code1, refuse le timeout et les critères interrompus, crée une copie indépendante par mutation et ne modifie aucun juge. Seules les trois mutations PR ont été exécutées ; les vingt suivantes restent NON VALIDÉES après le témoin CF rouge. Gate PC : relais-ia-qa/chef-qa actifs, aucun nouveau test PC ; gate Oracle libre avant exécution.

CF-3/CF-4 refusent les diffs historiques de scripts/fermeture-e2e.mjs et scripts/sorti-qa.mjs contre 1620723. CF-8 refuse la configuration tsconfig.json actuelle (jsx react-jsx au lieu de preserve) et relève aussi le node_modules Oracle relié par symlink : ce dernier est un défaut de montage, pas une régression produit. Ces motifs doivent être distingués et tranchés par le propriétaire du juge hors périmètre 025-10. Aucun juge corrigé, aucun PASS officiel depuis fait/, aucune mutation attribuée à un témoin déjà rouge.
