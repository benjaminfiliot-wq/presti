select 'colonnes chantiers (attendu 5)' as quoi, count(*)::text as resultat from information_schema.columns where table_schema = 'public' and table_name = 'chantiers' and column_name in ('type_batiment', 'lat', 'lng', 'geocode_le', 'retire_carte_le')
union all select 'crm_reglages RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.crm_reglages'::regclass
union all select 'crm_reglages politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_reglages'
union all select 'authenticated lit crm_reglages (attendu false)', has_table_privilege('authenticated', 'public.crm_reglages', 'select')::text
union all select 'authenticated ecrit chantiers (attendu false)', has_table_privilege('authenticated', 'public.chantiers', 'update')::text;
