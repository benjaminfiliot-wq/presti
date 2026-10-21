select 'colonne leads.origine (attendu 1)' as quoi, count(*)::text as resultat from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'origine'
union all select 'contrainte leads_origine_connue (attendu 1)', count(*)::text from pg_constraint where conrelid = 'public.leads'::regclass and conname = 'leads_origine_connue'
union all select 'index leads_artisan_contact_idx (attendu 1)', count(*)::text from pg_indexes where schemaname = 'public' and indexname = 'leads_artisan_contact_idx'
union all select 'canaux_type_connu connait telegram (attendu true)', (pg_get_constraintdef(oid) like '%telegram%')::text from pg_constraint where conrelid = 'public.canaux'::regclass and conname = 'canaux_type_connu'
union all select 'fonction connait telegram et linkedin (attendu true)', (prosrc like '%''telegram''%' and prosrc like '%''linkedin''%' and prosrc like '%''starofservice''%')::text from pg_proc where proname = 'canaux_conversation_ouvrir' and pronamespace = 'public'::regnamespace
union all select 'fonction security definer (attendu true)', prosecdef::text from pg_proc where proname = 'canaux_conversation_ouvrir' and pronamespace = 'public'::regnamespace
union all select 'anon execute la fonction (attendu false)', has_function_privilege('anon', 'public.canaux_conversation_ouvrir(jsonb, timestamptz)', 'execute')::text
union all select 'authenticated execute la fonction (attendu false)', has_function_privilege('authenticated', 'public.canaux_conversation_ouvrir(jsonb, timestamptz)', 'execute')::text
union all select 'RLS actives leads, canaux, canaux_evenements (attendu 3)', count(*)::text from pg_class where oid in ('public.leads'::regclass, 'public.canaux'::regclass, 'public.canaux_evenements'::regclass) and relrowsecurity
union all select 'politiques canaux_evenements (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'canaux_evenements';
