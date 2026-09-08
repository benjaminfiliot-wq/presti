---------------------------- _A_COLLER_sql_editor_0079_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
drop policy if exists founders_read_artisans on public.artisans;
comment on table public.artisans is
  'Le profil d''un artisan. Depuis 0079, aucun rôle ne lit les lignes des autres via la RLS : le Poste de contrôle passe par la clé de service (journalisée), et le mode support par la fenêtre que l''artisan ouvre lui-même. La table porte l''IBAN et le BIC — c''est pour eux que cette policy a été retirée.';

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
