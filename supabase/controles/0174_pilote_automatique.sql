select 'tables 0174 (attendu 3)' as quoi, count(*)::text as resultat from information_schema.tables where table_schema = 'public' and table_name in ('pilote_reglages', 'actions_auto', 'chantier_pointage')
union all select 'RLS actives (attendu 3)', count(*)::text from pg_class where oid in ('public.pilote_reglages'::regclass, 'public.actions_auto'::regclass, 'public.chantier_pointage'::regclass) and relrowsecurity
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename in ('pilote_reglages', 'actions_auto', 'chantier_pointage')
union all select 'anon lit actions_auto (attendu false)', has_table_privilege('anon', 'public.actions_auto', 'select')::text
union all select 'authenticated lit actions_auto (attendu false)', has_table_privilege('authenticated', 'public.actions_auto', 'select')::text
union all select 'authenticated ecrit pilote_reglages (attendu false)', has_table_privilege('authenticated', 'public.pilote_reglages', 'insert')::text
union all select 'authenticated lit chantier_pointage (attendu false)', has_table_privilege('authenticated', 'public.chantier_pointage', 'select')::text
union all select 'contrainte unique (artisan_id, cle) (attendu 1)', count(*)::text from pg_constraint where conrelid = 'public.actions_auto'::regclass and conname = 'actions_auto_cle_unique'
union all select 'declencheurs (attendu 2)', count(*)::text from pg_trigger where tgname in ('actions_auto_verifier', 'crm_pointage_verifier') and not tgisinternal;
