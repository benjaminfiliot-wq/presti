---
name: migrations-je-les-applique
description: "Benj, 24/09 : ne JAMAIS lui demander de coller une migration Presti — je l'applique moi-même par le connecteur Supabase (apply_migration), puis contrôle + test réel annulé ; 0088-0092 et 0094 faites ainsi"
metadata:
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-24T18:48:48.605Z
---

Le 24/09 au soir, je lui ai demandé de coller 0094 dans le SQL Editor. Sa réponse : « tu te moques de moi j'espère, on avait réglé ce problème depuis longtemps, tu es connecté à Supabase, tu peux le faire toi-même, tu l'as déjà fait plein de fois ».

C'est vrai : `list_migrations` montre 0088 à 0092, appliquées par moi avec le connecteur.

**Why :** Benj veut une automatisation totale. Lui renvoyer un geste que j'ai le droit et le moyen de faire, c'est exactement ce qu'il reproche.

**How to apply :** pour une migration Presti (projet `gorcdvmueakcncsmrouo`) :
1. **Essai à sec** : bloc DO qui exécute le jumeau nu puis RAISE EXCEPTION ([[essai-a-sec-migration]]).
2. **Application** : `apply_migration`, nommée comme le fichier (ex. `0094_insertion_figee`), avec le corps exact du fichier.
3. **Contrôle** après application (`supabase/controles/<n>.sql`) par `execute_sql`.
4. **Test réel du comportement** : un compte simulé (`set local role authenticated` + `request.jwt.claims`), dans un bloc annulé par RAISE EXCEPTION.
5. **Vérifier qu'il ne reste rien** : 0 ligne et 0 compte d'essai.

Les fichiers `_A_COLLER_*` restent des jumeaux testés (repli si le connecteur tombe), pas une tâche pour Benj. Seule exception, l'ordre de déploiement : une migration qui casserait le code en production (ex. 0093 avant la mise en ligne de 025-05) attend le déploiement. Je l'applique moi-même juste après.

Voir [[livrable-colle-a-la-main]] (qui reste vrai pour ce que Benj doit vraiment faire lui-même : variables Vercel, comptes).
