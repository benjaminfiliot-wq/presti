select 'tables (attendu : competences, connexions, couts_ia_appels, couts_ia_jour, departements_reglages)' as controle,
  coalesce(string_agg(table_name, ', ' order by table_name), 'ABSENTES') as valeur
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
   and table_name in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour')
union all
select 'RLS activée (attendu : les cinq, t)', coalesce(string_agg(relname || ':' || relrowsecurity::text, ', ' order by relname), 'aucune')
  from pg_catalog.pg_class where relnamespace = 'public'::regnamespace
   and relname in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour')
union all
select 'politiques (attendu : 5 par table, une lecture et quatre gardes)', coalesce(string_agg(tablename || ':' || n::text, ', ' order by tablename), 'aucune')
  from (select tablename, count(*) as n from pg_policies where schemaname = 'public'
         and tablename in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour') group by tablename) p
union all
select 'colonnes de connexions lisibles par authenticated (attendu : 13, ni secret_app ni secret_n8n)',
  coalesce(string_agg(column_name, ', ' order by column_name), 'aucune')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'connexions'
   and grantee = 'authenticated' and privilege_type = 'SELECT'
union all
select 'droits de table sur connexions pour anon et authenticated (attendu : aucun)',
  coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'connexions' and grantee in ('anon', 'authenticated')
union all
select 'défaut du palier (attendu : simulation)', coalesce((select column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'departements_reglages' and column_name = 'palier'), 'ABSENT')
union all
select 'colonne evenements_metier.traite_le (attendu : timestamp with time zone)', coalesce((select data_type from information_schema.columns
  where table_schema = 'public' and table_name = 'evenements_metier' and column_name = 'traite_le'), 'ABSENTE')
union all
select 'colonnes de la vue (attendu : 8, de id à survenu_le)', coalesce(string_agg(column_name, ', ' order by ordinal_position), 'VUE ABSENTE')
  from information_schema.columns where table_schema = 'public' and table_name = 'n8n_evenements_a_traiter'
union all
select 'options de la vue (attendu : security_barrier=true)', coalesce((select array_to_string(reloptions, ' ') from pg_catalog.pg_class
  where oid = to_regclass('public.n8n_evenements_a_traiter')), 'VUE ABSENTE')
union all
select 'droits sur la vue (attendu : n8n_lecture:SELECT seul, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'n8n_evenements_a_traiter'
   and grantee <> (select pg_get_userbyid(relowner) from pg_catalog.pg_class where oid = to_regclass('public.n8n_evenements_a_traiter'))
union all
select 'fonction evenements_marquer_traites (attendu : security definer, search_path vide)', coalesce((select case when prosecdef then 'security definer' else 'INVOKER' end
  || ', ' || coalesce(array_to_string(proconfig, ' '), 'sans réglage') from pg_proc where oid = to_regprocedure('public.evenements_marquer_traites(uuid, uuid[])')), 'ABSENTE')
union all
select 'qui exécute evenements_marquer_traites (attendu : n8n_lecture, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'personne')
  from information_schema.role_routine_grants where routine_schema = 'public' and routine_name = 'evenements_marquer_traites'
   and grantee <> (select pg_get_userbyid(proowner) from pg_proc where oid = to_regprocedure('public.evenements_marquer_traites(uuid, uuid[])'))
union all
select 'événements à traiter maintenant (lecture de la vue)', count(*)::text from public.n8n_evenements_a_traiter
union all
select 'lignes de réglages et de connexions (attendu : 0 juste après la pose)',
  ((select count(*) from public.departements_reglages) + (select count(*) from public.connexions))::text;
