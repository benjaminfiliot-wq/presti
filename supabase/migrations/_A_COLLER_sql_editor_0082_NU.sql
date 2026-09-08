---------------------------- _A_COLLER_sql_editor_0082_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
drop policy if exists "support : l'artisan lit ses tickets"          on public.tickets;
drop policy if exists "support : l'artisan lit son verrou"           on public.support_verrou;
drop policy if exists "support : l'artisan lit ses accès"            on public.acces_support;
drop policy if exists "support : l'artisan lit ses lectures"         on public.acces_support_lectures;
comment on table public.tickets is
  'Les demandes d''aide d''un artisan (0074). Aucun rôle client n''a de privilège SQL sur cette table (0082) : la lecture passe par /api/securite/acces-support, qui borne à l''artisan connecté. Une policy y serait inatteignable et donnerait à croire le contraire.';

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
