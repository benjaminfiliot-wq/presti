---
name: essai-a-sec-migration
description: "Éprouver une migration Presti sur la vraie base SANS rien laisser : un DO qui EXECUTE le jumeau nu, vérifie, puis lève une exception ; et DIRECT_URL refusée depuis le 14/09"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 80cc957c-aa60-452a-9898-68b6b198a63a
  modified: 2026-09-14T16:10:46.975Z
---

**Constat du 14/09/2026** : `DIRECT_URL` et `SUPABASE_DB_PASSWORD` de `presti/.env.local` sont refusés
(`28P01 password authentication failed`) — mot de passe de la base changé. `scripts/appliquer-migration.mjs`
ne marche donc plus tant que Benj n'a pas remis le bon mot de passe (lui seul peut le faire).

**La technique qui marche quand même** (MCP Supabase `execute_sql`, projet `gorcdvmueakcncsmrouo`) : UN SEUL
énoncé `do $essai$ … $essai$` qui `execute $migration$<contenu du jumeau _NU, sans le pied de contrôle>$migration$`,
insère des lignes d'essai, appelle les fonctions, teste les refus (`set local role anon` dans un sous-bloc
`begin … exception when others then msg := sqlerrm; end`), accumule un jsonb, puis
`raise exception 'ESSAI_A_SEC %', r::text`. L'exception rend le résultat ET annule tout — un seul énoncé est
atomique quelle que soit la façon dont l'outil l'exécute. Vérifier après coup par `to_regclass(...)` = null.

Pièges : une variable PL/pgSQL qui porte le nom d'une colonne (`vues`) → « ambiguous » ; préfixer (`nb_vues`) et
aliaser la table. Générer le DO depuis le fichier (node) plutôt que le retaper, pour éprouver le texte réellement
collé. Dire à Benj qu'un essai à sec a tourné sur la production.

Voir [[livrable-colle-a-la-main]], [[presti-audience-vitrine]].
