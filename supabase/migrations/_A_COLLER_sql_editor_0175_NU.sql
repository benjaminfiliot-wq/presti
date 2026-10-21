---------------------------- _A_COLLER_sql_editor_0175_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['clients', 'crm_journal'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'clients et crm_journal publiés (attendu 2)' as quoi, count(*)::text as resultat from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('clients', 'crm_journal')
union all select 'tables CRM publiées en tout (attendu 15)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux', 'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur', 'crm_rappels', 'clients', 'crm_journal')
union all select 'clients RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.clients'::regclass
union all select 'crm_journal RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.crm_journal'::regclass
union all select 'anon lit crm_journal (attendu false)', has_table_privilege('anon', 'public.crm_journal', 'select')::text
union all select 'artisans NON publiée (attendu 0)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'artisans';
