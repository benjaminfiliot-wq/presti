---------------------------- _A_COLLER_sql_editor_0166_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.chantier_taches add column if not exists piece text;
alter table public.chantier_taches drop constraint if exists chantier_taches_piece_check;
alter table public.chantier_taches add constraint chantier_taches_piece_check
  check (piece is null or char_length(piece) between 1 and 40);

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables' as quoi, string_agg(table_name, ', ' order by table_name) as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('tickets', 'acces_support', 'acces_support_lectures', 'support_verrou')
union all
select 'fonctions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines where routine_schema = 'public' and routine_name like '%support%'
union all
select 'policies fondateur restantes', coalesce(string_agg(policyname, ', '), 'aucune (attendu)')
  from pg_policies where schemaname = 'public' and policyname like 'founders_all_%';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonne piece (attendu text YES)' as quoi, data_type || ' ' || is_nullable as resultat from information_schema.columns where table_schema = 'public' and table_name = 'chantier_taches' and column_name = 'piece'
union all select 'contrainte (attendu 1)', count(*)::text from pg_constraint where conname = 'chantier_taches_piece_check'
union all select 'authenticated modifie (attendu false)', has_table_privilege('authenticated', 'public.chantier_taches', 'update')::text
union all select 'temps reel (attendu 1)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chantier_taches';
