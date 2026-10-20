---------------------------- _A_COLLER_sql_editor_0171_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.crm_apres_opposition (
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  empreinte   text not null check (empreinte ~ '^[0-9a-f]{32}$'),
  cree_le     timestamptz not null default now(),
  primary key (artisan_id, empreinte)
);
alter table public.crm_apres_opposition enable row level security;
revoke all on public.crm_apres_opposition from anon;
revoke all on public.crm_apres_opposition from authenticated;
comment on table public.crm_apres_opposition is
  'Clients qui ont refusé les messages d''après-chantier d''un artisan (empreinte sha256 de l''adresse, 32 hex ; jamais l''adresse). Lue avant chaque envoi (refus 409). RLS sans politique : service_role seul.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'RLS active (attendu true)' as quoi, relrowsecurity::text as resultat from pg_class where oid = 'public.crm_apres_opposition'::regclass
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_apres_opposition'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.crm_apres_opposition', 'select')::text
union all select 'authenticated lit (attendu false)', has_table_privilege('authenticated', 'public.crm_apres_opposition', 'select')::text
union all select 'authenticated ecrit (attendu false)', has_table_privilege('authenticated', 'public.crm_apres_opposition', 'insert')::text;
