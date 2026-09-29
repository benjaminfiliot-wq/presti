# Application de 0108_pilotage_echanges.sql (fiche 026-079) — 2026-09-29

Projet Supabase Presti (gorcdvmueakcncsmrouo), par `apply_migration` (jamais de SQL collé à la main), par Claude Code (le chef).
Patch de Codex (tour 4, question « à décider ») appliqué au dépôt ; juge SE-12 déjà corrigé (clé JSON `technologies` distincte d'une lecture de table) ;
scénario du juge corrigé (agent `facteur` au lieu de `essai`, FK ops.agents ; antidatage sous session_replication_role) : le compteur `plafond`/`utilises`
comparait déjà des entiers extraits du JSONB (`->>'envois'`), rien à changer côté 0106/0111.
1. Essai à sec : `essai-a-sec.txt` (empreinte 4b78aa729c13…, 15 clés true, rien ne reste).
2. apply_migration `0108_pilotage_echanges`, contenu du fichier : `{"success":true}`. NB : deux lignes du même nom dans schema_migrations
   (10:34 et 10:39 UTC) : une autre session a appliqué en parallèle ; `create or replace`, idempotent, état identique.
3. md5(prosrc) : 13 corps identiques, 0 différents (md5-migration.mjs).
4. Contrôle : 13 fonctions security definer, stable, search_path ops, public, pg_temp, anon et authenticated refusés, service_role autorisé ;
   `ops.pilotage_commande_du_prospect` absente.
5. Juge `--reel` : PASS (SE-1 à SE-12, SE-11 : clé de service ok, anonyme refusée, rien d'écrit).
6. Zéro trace : to_regprocedure essai null, 0 prospect/envoi/technologie/commande/réponse d'essai.
