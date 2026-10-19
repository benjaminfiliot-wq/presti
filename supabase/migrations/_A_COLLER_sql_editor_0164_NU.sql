---------------------------- _A_COLLER_sql_editor_0164_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.crm_agenda (
  artisan_id        uuid primary key references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);
alter table public.crm_agenda enable row level security;
revoke all on public.crm_agenda from anon;
revoke all on public.crm_agenda from authenticated;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'RLS active (attendu true)' as quoi, relrowsecurity::text as resultat from pg_class where oid = 'public.crm_agenda'::regclass
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_agenda'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.crm_agenda', 'select')::text
union all select 'authenticated lit (attendu false)', has_table_privilege('authenticated', 'public.crm_agenda', 'select')::text;
