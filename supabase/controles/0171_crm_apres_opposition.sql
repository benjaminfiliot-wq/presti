select 'RLS active (attendu true)' as quoi, relrowsecurity::text as resultat from pg_class where oid = 'public.crm_apres_opposition'::regclass
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_apres_opposition'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.crm_apres_opposition', 'select')::text
union all select 'authenticated lit (attendu false)', has_table_privilege('authenticated', 'public.crm_apres_opposition', 'select')::text
union all select 'authenticated ecrit (attendu false)', has_table_privilege('authenticated', 'public.crm_apres_opposition', 'insert')::text;
