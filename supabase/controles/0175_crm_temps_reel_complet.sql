select 'clients et crm_journal publiés (attendu 2)' as quoi, count(*)::text as resultat from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('clients', 'crm_journal')
union all select 'tables CRM publiées en tout (attendu 15)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux', 'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur', 'crm_rappels', 'clients', 'crm_journal')
union all select 'clients RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.clients'::regclass
union all select 'crm_journal RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.crm_journal'::regclass
union all select 'anon lit crm_journal (attendu false)', has_table_privilege('anon', 'public.crm_journal', 'select')::text
union all select 'artisans NON publiée (attendu 0)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'artisans';
