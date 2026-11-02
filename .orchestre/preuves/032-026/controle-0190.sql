select 'table' as quoi, coalesce(string_agg(table_name, ', '), 'ABSENTE') as resultat
  from information_schema.tables where table_schema = 'public' and table_name = 'demandes_demo'
union all
select 'rls active', coalesce((select relrowsecurity::text from pg_class where oid = 'public.demandes_demo'::regclass), 'ABSENTE')
union all
select 'politiques', coalesce(string_agg(policyname, ', ' order by policyname), 'aucune')
  from pg_policies where schemaname = 'public' and tablename = 'demandes_demo'
union all
select 'droits anon ou authenticated (attendu : aucun)', coalesce(string_agg(grantee || ':' || privilege_type, ', '), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'demandes_demo' and grantee in ('anon', 'authenticated')
union all
select 'lignes', count(*)::text from public.demandes_demo;
