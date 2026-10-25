-- Contrôle de 0181 (lecture seule).
select 'colonnes sujet et texte (attendu 2)' as quoi, count(*)::text as resultat
  from information_schema.columns where table_schema = 'public' and table_name = 'relances_impayes' and column_name in ('sujet', 'texte') and is_nullable = 'YES'
union all select 'contrainte de statut elargie (attendu 1)', count(*)::text
  from pg_constraint where conrelid = 'public.relances_impayes'::regclass and conname = 'relances_impayes_statut' and pg_get_constraintdef(oid) ilike '%a_valider%' and pg_get_constraintdef(oid) ilike '%rejetee%'
union all select 'contraintes CHECK parlant du statut (attendu 2)', count(*)::text
  from pg_constraint where conrelid = 'public.relances_impayes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%statut%'
union all select 'index relances_impayes_a_valider (attendu 1)', count(*)::text
  from pg_indexes where schemaname = 'public' and tablename = 'relances_impayes' and indexname = 'relances_impayes_a_valider'
union all select 'RLS active (attendu true)', relrowsecurity::text from pg_class where oid = 'public.relances_impayes'::regclass
union all select 'authenticated peut ecrire (attendu false)', has_table_privilege('authenticated', 'public.relances_impayes', 'update')::text;
