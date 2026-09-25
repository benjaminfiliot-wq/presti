---
name: livrable-colle-a-la-main
description: "Un fichier que Benj colle à la main (migration SQL, variable Vercel) est un livrable et doit avoir son test — sinon la panne se découvre chez lui"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7e59f8cf-41af-4413-b326-b03458018a55
  modified: 2026-09-08T08:42:44.160Z
---

Tout artefact que Benj exécute lui-même — un `_A_COLLER_*.sql` dans le SQL Editor, une variable posée sur Vercel — est un **livrable**, pas un brouillon. S'il n'a pas de test, sa panne se découvre au pire moment : pendant qu'il le colle, en pleine action, avec un message d'erreur Postgres brut.

**Why :** le 2026-09-08, le générateur du jumeau `_NU` de la migration 0074 retirait les lignes commençant par `--` par simple comparaison de texte. Il ne savait pas reconnaître un `--` **à l'intérieur d'une chaîne SQL** : il a coupé un `comment on … is '…'` en deux et livré un fichier qui ne se parsait plus. Rien ne le voyait, parce qu'aucun test ne regardait les jumeaux — seulement les migrations d'origine.

**How to apply :** `scripts/migrations-jumelles-e2e.mjs` (branchée au lanceur) vérifie que chaque `_A_COLLER_*` se parse — chaînes refermées, blocs `$tag$` appariés, parenthèses équilibrées — et qu'il porte le SQL de sa migration. `scripts/sql-nu.mjs` génère et compare avec le même tokenizer : **deux façons de compter, c'est deux vérités**. Avant de tendre un fichier à coller, le faire passer par ces deux-là. Voir [[suites-menage-finally]].

Corollaire trouvé le même jour : `pg_column_size` dans un `CHECK` **n'est pas** un piège — `0053_plateforme_persona.sql` en porte un et tourne en prod ; Postgres n'exige l'immutabilité que pour les index. Un contrôle qui allume un rouge permanent sur du code qui marche apprend à ignorer ses propres rouges : le retirer vaut mieux que le garder.
