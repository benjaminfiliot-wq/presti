---------------------------- _A_COLLER_sql_editor_0174_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.pilote_reglages (
  artisan_id  uuid primary key references public.artisans(id) on delete cascade,
  actif       boolean not null default false,
  types       jsonb not null default '{}'::jsonb check (jsonb_typeof(types) = 'object'),
  maj_le      timestamptz not null default now()
);
create table if not exists public.actions_auto (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  type        text not null check (type in ('reponse_prospect', 'relance_devis', 'relance_impaye', 'envoi_devis', 'envoi_facture', 'assistant_client')),
  source      text not null check (source in ('carte', 'proposition')),
  ref_id      uuid not null,
  lead_id     uuid references public.leads(id) on delete cascade,
  libelle     text not null check (char_length(libelle) between 1 and 200),
  prete_le    timestamptz not null default now(),
  part_le     timestamptz not null,
  statut      text not null default 'a_partir' check (statut in ('a_partir', 'en_cours', 'annulee', 'partie', 'echec', 'manuel')),
  motif       text check (motif is null or char_length(motif) <= 300),
  traite_le   timestamptz,
  cle         text not null check (char_length(cle) <= 80),
  constraint actions_auto_cle_unique unique (artisan_id, cle),
  constraint actions_auto_delai check (part_le >= prete_le)
);
create index if not exists actions_auto_a_partir_idx on public.actions_auto (part_le) where statut = 'a_partir';
create index if not exists actions_auto_compte_idx on public.actions_auto (artisan_id, prete_le desc);
create index if not exists actions_auto_parties_idx on public.actions_auto (artisan_id, traite_le) where statut = 'partie';
create or replace function public.actions_auto_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.lead_id is not null and not exists (select 1 from public.leads l where l.id = new.lead_id and l.artisan_id = new.artisan_id) then
    raise exception 'pilote : conversation d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.ref_id is distinct from old.ref_id
      or new.cle is distinct from old.cle or new.prete_le is distinct from old.prete_le or new.part_le is distinct from old.part_le) then
    raise exception 'pilote : une action en file ne change ni de compte, ni d objet, ni d heure de depart';
  end if;
  return new;
end $fn$;
drop trigger if exists actions_auto_verifier on public.actions_auto;
create trigger actions_auto_verifier before insert or update on public.actions_auto
  for each row execute function public.actions_auto_verifier();
create table if not exists public.chantier_pointage (
  chantier_id       uuid primary key references public.chantiers(id) on delete cascade,
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);
create index if not exists chantier_pointage_artisan_idx on public.chantier_pointage (artisan_id);
create or replace function public.crm_pointage_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.chantier_id is distinct from old.chantier_id) then
    raise exception 'crm : un lien de pointage ne change ni de compte ni de chantier';
  end if;
  return new;
end $fn$;
drop trigger if exists crm_pointage_verifier on public.chantier_pointage;
create trigger crm_pointage_verifier before insert or update on public.chantier_pointage
  for each row execute function public.crm_pointage_verifier();
alter table public.pilote_reglages enable row level security;
alter table public.actions_auto enable row level security;
alter table public.chantier_pointage enable row level security;
revoke all on public.pilote_reglages from anon;
revoke all on public.pilote_reglages from authenticated;
revoke all on public.actions_auto from anon;
revoke all on public.actions_auto from authenticated;
revoke all on public.chantier_pointage from anon;
revoke all on public.chantier_pointage from authenticated;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables 0174 (attendu 3)' as quoi, count(*)::text as resultat from information_schema.tables where table_schema = 'public' and table_name in ('pilote_reglages', 'actions_auto', 'chantier_pointage')
union all select 'RLS actives (attendu 3)', count(*)::text from pg_class where oid in ('public.pilote_reglages'::regclass, 'public.actions_auto'::regclass, 'public.chantier_pointage'::regclass) and relrowsecurity
union all select 'politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename in ('pilote_reglages', 'actions_auto', 'chantier_pointage')
union all select 'anon lit actions_auto (attendu false)', has_table_privilege('anon', 'public.actions_auto', 'select')::text
union all select 'authenticated lit actions_auto (attendu false)', has_table_privilege('authenticated', 'public.actions_auto', 'select')::text
union all select 'authenticated ecrit pilote_reglages (attendu false)', has_table_privilege('authenticated', 'public.pilote_reglages', 'insert')::text
union all select 'authenticated lit chantier_pointage (attendu false)', has_table_privilege('authenticated', 'public.chantier_pointage', 'select')::text
union all select 'contrainte unique (artisan_id, cle) (attendu 1)', count(*)::text from pg_constraint where conrelid = 'public.actions_auto'::regclass and conname = 'actions_auto_cle_unique'
union all select 'declencheurs (attendu 2)', count(*)::text from pg_trigger where tgname in ('actions_auto_verifier', 'crm_pointage_verifier') and not tgisinternal;
