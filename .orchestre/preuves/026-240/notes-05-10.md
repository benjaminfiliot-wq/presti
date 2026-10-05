# 026-240 — notes de livraison (05/10, lot M-3, Claude Code)

## Ce qui est livré

`scripts/juges-026-savoir-mutations.mjs` : 32 mutations (socle 11, recherche 7, leçons 8, réflexion 6) appliquées une à une sur une copie jetable ; le script rend le code 0 quand les 32 sont prises. Le patch de l'usine (Codex, 04/10) en était la base ; ce qui a été corrigé ici :

- **Témoin rouge nommé** : le script n'arrête plus tout quand un juge est rouge sur la copie intacte. Un témoin rouge dont les critères sont NOMMÉS est noté au rapport (`mutations.md`, section « Témoins ») ; le script exige seulement que le critère muté ne soit pas l'un d'eux. Un témoin rouge sans critère nommé (plantage, délai) arrête toujours.
- **Une mutation non prise ne coupe plus la série** : toutes sont jouées, les survivantes sont listées, le code final est 1.
- **Quatre mutations de Codex ne prouvaient rien** et ont été remplacées par la faute réelle :
  - SVS-8 « `../` accepté » : retirer le seul test `'..'` du nom tar ne change rien (le manifeste refuse ensuite tout fichier hors manifeste : défense en profondeur). La mutation est maintenant une tranche qui rouvre les deux garde-fous d'un coup (`tranche()`).
  - SVS-10 « garde classe interdite » : retirer cette garde ne change rien d'observable (le jeu d'essai ne range jamais un fichier de classe prospects dans le manifeste general ; la réception le refuse déjà, SVS-8). Remplacée par l'index des prospects écrit sous `general` et les passages des prospects envoyés au modèle d'embeddings.
  - SVR-8 « recopie la question » : la question n'existe pas dans `journaliser()` ; la faute réelle est un extrait recopié dans le résumé.
  - SVB-4 « décision au plan » : le premier essai ajoutait une clé en double, écrasée par `decisions: []` plus bas ; la mutation change maintenant la ligne `decisions: []` elle-même.
  - SVS-11 et SVL-1 : les sabotages de fixtures visent le témoin, pas le code livré ; remplacés par des fautes sur le code livré.
- Options : `--ancres` (vérifie que chaque « avant » existe une seule fois), `--seul=<critère,…>` (rapport sous `essai-<critères>/`).

## Écarts connus, non corrigés ici (hors périmètre, aucun juge ni jeu d'essai touché)

- `savoir-socle-qa` SVS-2 rouge sur l'arbre réel : `scripts/fixtures/026/savoir/socle/sources-essai.json` ne reprend pas `exclusions_memoire` de `docs/savoir/sources.json` (écart connu de la décision D-0410-12). Conséquence : le méta-juge, qui exige la copie INTACTE en code 0 pour chaque contre-mutation, ne peut pas valider une contre-mutation du juge socle tant que cet écart existe.
- `savoir-leçons-qa` SVL-11 et `savoir-reflexion-qa` SVB-9 rouges sur la copie intacte (SVL-11 : hygiène du dépôt partagé, SVB-9 : « savoir_lie non mesuré »). Aucune des 32 mutations ne vise ces critères.

## Verdict du méta-juge (un seul passage, sur l'usine, informatif)

Voir `verdict-informatif-05-10.log` (copie dans `verifier.log`) : MP-1, MP-2, MP-4 et MP-5 PASS ; **MP-3 FAIL** pour une seule raison : la graine 973306882 a tiré une contre-mutation du juge socle, dont la copie intacte est en code 1 (SVS-2). Les deux autres contre-mutations tirées (SVB-4, SVR-5) sont prises.

## Gestes de Benj

Aucun.
