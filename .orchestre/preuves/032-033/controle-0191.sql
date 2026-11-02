select 'table' as quoi, coalesce(string_agg(table_name, ', '), 'ABSENTE') as resultat
  from information_schema.tables where table_schema = 'public' and table_name = 'suivi_artisan_envois'
union all
select 'rls active', coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.suivi_artisan_envois')), 'ABSENTE')
union all
select 'politiques', coalesce(string_agg(policyname, ', ' order by policyname), 'aucune')
  from pg_policies where schemaname = 'public' and tablename = 'suivi_artisan_envois'
union all
select 'droits anon ou authenticated (attendu : aucun)', coalesce(string_agg(grantee || ':' || privilege_type, ', '), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'suivi_artisan_envois' and grantee in ('anon', 'authenticated')
union all
select 'colonnes lues par n8n_lecture (attendu : artisan_id, cle, envoye_le, etape)', coalesce(string_agg(column_name, ', ' order by column_name), 'aucune (0189 absente ?)')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'suivi_artisan_envois' and grantee = 'n8n_lecture' and privilege_type = 'SELECT'
union all
select 'artisans.notifications lue par n8n_lecture', coalesce(string_agg(column_name, ', '), 'non')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'artisans' and column_name = 'notifications' and grantee = 'n8n_lecture'
union all
select 'lignes', count(*)::text from public.suivi_artisan_envois;
