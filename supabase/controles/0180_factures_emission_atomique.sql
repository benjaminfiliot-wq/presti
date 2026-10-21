select 'facture_emettre (attendu 1)' as quoi, count(*)::text as resultat from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'devis_lignes_remplacer (attendu 1)', count(*)::text from pg_proc where oid = to_regprocedure('public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb)')
union all select 'facture_emettre security definer (attendu true)', prosecdef::text from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'search_path fige (attendu true)', (array_to_string(proconfig, ',') like 'search_path=%')::text from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'authenticated execute facture_emettre (attendu false)', has_function_privilege('authenticated', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'anon execute facture_emettre (attendu false)', has_function_privilege('anon', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'service_role execute facture_emettre (attendu true)', has_function_privilege('service_role', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'authenticated execute devis_lignes_remplacer (attendu false)', has_function_privilege('authenticated', 'public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb)', 'execute')::text
union all select 'index unique (artisan_id, numero) (attendu 1)', count(*)::text from pg_indexes where schemaname = 'public' and tablename = 'factures' and indexname = 'factures_artisan_numero_unique'
union all select 'factures emises sans numero (attendu 0)', count(*)::text from public.factures where statut in ('emise', 'payee') and numero is null
union all select 'declencheur factures_situation_verifier (attendu 1)', count(*)::text from pg_trigger where tgname = 'factures_situation_verifier' and not tgisinternal;
