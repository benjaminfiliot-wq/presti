---------------------------- _A_COLLER_sql_editor_0167_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.chantier_suivi (
  chantier_id       uuid primary key references public.chantiers(id) on delete cascade,
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);
create index if not exists chantier_suivi_artisan_idx on public.chantier_suivi (artisan_id);
create or replace function public.crm_suivi_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.chantier_id is distinct from old.chantier_id) then
    raise exception 'crm : un lien de suivi ne change ni de compte ni de chantier';
  end if;
  return new;
end $fn$;
drop trigger if exists crm_suivi_verifier on public.chantier_suivi;
create trigger crm_suivi_verifier before insert or update on public.chantier_suivi
  for each row execute function public.crm_suivi_verifier();
alter table public.chantier_suivi enable row level security;
revoke all on public.chantier_suivi from anon;
revoke all on public.chantier_suivi from authenticated;

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
select 'RLS active (attendu true)' as quoi, relrowsecurity::text as resultat from pg_class where oid = 'public.chantier_suivi'::regclass
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'chantier_suivi'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.chantier_suivi', 'select')::text
union all select 'authenticated lit (attendu false)', has_table_privilege('authenticated', 'public.chantier_suivi', 'select')::text
union all select 'declencheur (attendu 1)', count(*)::text from pg_trigger where tgrelid = 'public.chantier_suivi'::regclass and tgname = 'crm_suivi_verifier';
