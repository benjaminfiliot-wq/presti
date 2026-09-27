# 026-013 — application de 0098 sur la vraie base (27/09, session principale Claude Code)

Projet gorcdvmueakcncsmrouo, par le connecteur Supabase (apply_migration, nom 0098_ops_taches), le corps exact de
supabase/migrations/0098_ops_taches.sql (sha256 94580588e3a9…, identique au jumeau _A_COLLER_sql_editor_0098.sql).
Avant : essai à sec vert (essai-a-sec.txt) et contre-vérification indépendante verte (ligne 6, wf_7a77f90c-b0b).

1. **Corps en base = fichier** : md5(prosrc) des 13 fonctions comparé au md5 du texte entre les $$ du fichier :
   13 identiques sur 13, 0 différent.
2. **Contrôle** supabase/controles/0098_ops_taches.sql en lecture seule : 16 lignes sur 16 à « oui » (13 fonctions
   security definer, search_path=ops, public, pg_temp, exécutables par service_role seul ; une seule version de chacune ;
   ops_type_sortant immutable ; aucune public.ops_* exécutable par anon ni authenticated).
3. **--reel** : `node scripts/ops-sql-qa.mjs --migration=0098 --reel` → PASS OT-8 (agent d'essai enregistré, tâche
   créée, prise, rendue faite, close par clé, décisions…), ménage fait par le juge.
4. **Zéro trace** relu après : ops.taches 0, ops.decisions 0, ops.couts 0, ops.evenements 0, agents d'essai 0,
   agents 2 (a0, systeme), interrupteurs envoi_froid=false, pause_generale=false (inchangés).
