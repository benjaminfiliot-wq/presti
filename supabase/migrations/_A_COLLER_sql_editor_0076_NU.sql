---------------------------- _A_COLLER_sql_editor_0076_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.acces_support_lectures_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'artisan_id') = (to_jsonb(old) - 'artisan_id')
       and (new.artisan_id is null or new.artisan_id is not distinct from old.artisan_id) then
      return new;
    end if;
    raise exception 'acces_support_lectures : une trace de lecture ne se modifie pas';
  end if;
  -- Le droit à l'effacement de l'artisan passe avant notre conservation : si son compte s'en va,
  -- ses traces s'en vont avec. On ne refuse que la suppression d'une trace SEULE, celle qui
  -- servirait à faire disparaître un regard qui a eu lieu.
  if tg_op = 'DELETE'
     and old.lu_le > now() - interval '24 months'
     and exists (select 1 from public.artisans a where a.id = old.artisan_id) then
    raise exception 'acces_support_lectures : conservation 24 mois (la suppression du compte, elle, emporte tout)';
  end if;
  return old;
end $fn$;
comment on function public.acces_support_lectures_immuable() is
  'Immuabilité des traces de lecture du support (0074, corrigé par 0076). Une trace ne se modifie jamais et ne se supprime pas seule avant 24 mois — mais la suppression du compte de l''artisan les emporte, sinon une seule consultation rendrait son compte indestructible.';

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
