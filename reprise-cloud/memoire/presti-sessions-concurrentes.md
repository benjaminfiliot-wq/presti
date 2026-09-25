---
name: presti-sessions-concurrentes
description: Plusieurs sessions Claude écrivent dans Documents/presti en même temps — relire un fichier juste avant d'y remplacer un bloc
metadata:
  type: feedback
---

Le dépôt `C:\Users\benja\Documents\presti` est travaillé par plusieurs sessions Claude en
parallèle (`git status` y montre en permanence des dizaines de fichiers modifiés non commités,
qui ne sont pas les miens). Un fichier lu en début de session peut avoir changé quelques minutes
plus tard.

**Why :** le 2026-09-09, j'ai remplacé le bloc `METIER_GUIDES` de `lib/ai.ts` d'après une lecture
faite ~10 minutes plus tôt. Entre-temps, une autre session y avait ajouté un champ `motsExacts` et
la règle des radicaux en début de mot (correctif de la collision « sol » → « i-sol-ation »,
« panneaux sol-aires » recevaient le vocabulaire du carreleur). Mon écriture l'a écrasée. Seul le
`typecheck` l'a révélé, par une erreur sur un champ disparu — sans lui, un bug corrigé revenait en
silence.

**How to apply :** avant tout remplacement de bloc, relire le fichier à l'instant même (pas se fier
à une lecture antérieure du tour). Après écriture, lancer `npm run typecheck` **et** la suite qui
couvre la zone — ici `node --experimental-strip-types --import ./scripts/ts-loader.mjs
scripts/ia-unit-e2e.mjs`. Si du travail concurrent a sauté, il se reconstruit à partir de la suite
de tests, qui fige le comportement attendu ligne par ligne. Voir [[livrable-colle-a-la-main]] et
[[benj-corrections-incrementales]].

**Un fichier de données partagé est une zone de conflit, même en ajout seul** (14/09/2026, 22 h 06) : pendant la vague 2 de la démo Lestraque, Claude Code a fait ajouter par Codex quatre photos « en réserve » (usage « reserve ») dans `public/sites-demo/lestraque/attributions.json`, en protégeant les images et les entrées existantes. Mais le générateur lit ce fichier : `node generer.mjs lestraque` a échoué sur les nouvelles entrées et site-qa a signalé un crédit pour une photo affichée nulle part (« Hanooz ») — le juge de l'étape Usage a rendu FAIL bloquant. Règle : un exécutant parallèle ne touche pas un fichier que le chantier en cours LIT (données, config), pas seulement ceux qu'il écrit ; les nouveautés vont dans un fichier à part (ex. `attributions-reserve.json`) jusqu'au branchement.
