---------------------------- _A_COLLER_sql_editor_0102_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.packs_pubs (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete set null,
  commande_site_id uuid references public.sites_commandes(id) on delete set null,
  email text not null,
  etat text not null default 'brouillon' check (etat in ('brouillon', 'payee', 'fabriquee', 'livree')),
  matiere jsonb not null default '{}'::jsonb,
  prix_cents integer not null default 14900 check (prix_cents > 0),
  type text not null default 'locale' check (type in ('locale', 'studio')),
  marque_cle text,
  devise text not null default 'eur',
  stripe_session_id text,
  stripe_payment_intent_id text,
  paye_le timestamptz,
  fabrique_le timestamptz,
  livre_le timestamptz,
  lien_expire_le timestamptz,
  fichiers_effaces_le timestamptz,
  verifications jsonb,
  consigne text,
  refaits integer not null default 0,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists packs_pubs_stripe_session_key on public.packs_pubs (stripe_session_id) where stripe_session_id is not null;
create index if not exists packs_pubs_artisan_idx on public.packs_pubs (artisan_id);
create index if not exists packs_pubs_etat_idx on public.packs_pubs (etat);
comment on table public.packs_pubs is 'Packs pubs locale (149 euros, offre C) et pack Studio (490 euros, 026-166) : dossier, paiement, quatre etats - 026-114.';
comment on column public.packs_pubs.type is 'locale (offre C) ou studio (pack de depart du Studio, decision 3 de Benj du 25/09) - jamais une troisieme valeur.';
comment on column public.packs_pubs.marque_cle is 'Cle de la marque du Studio ; nulle sur un pack locale.';
alter table public.packs_pubs enable row level security;
revoke all on public.packs_pubs from public, anon, authenticated;
drop policy if exists "packs pubs : l artisan lit ses packs" on public.packs_pubs;
create policy "packs pubs : l artisan lit ses packs" on public.packs_pubs for select using (auth.uid() = artisan_id);
insert into storage.buckets (id, name, public, file_size_limit)
values ('packs-pubs', 'packs-pubs', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- supabase/controles/0102_packs_pubs.sql — contrôle en LECTURE SEULE de la migration 0102 (fiche 026-114).
-- Une ligne « oui »/« NON (anormal) » par point : table, sécurité par ligne, politique de lecture
-- seule, absence de politique d'écriture, bucket privé et sa limite.
-- pg_policies.cmd rend le mot entier ('SELECT', pas 'r') : le compte lecture/écriture se lit sur
-- pg_policy.polcmd ('r' select, 'a' insert, 'w' update, 'd' delete, '*' toutes) ; pg_policies reste
-- cité pour le nombre total de politiques de la table.
with t as (
  select to_regclass('public.packs_pubs') as id
), securite as (
  select c.relrowsecurity as rls
    from pg_class c join t on c.oid = t.id
), toutes as (
  select count(*) as total from pg_policies where schemaname = 'public' and tablename = 'packs_pubs'
), commandes as (
  select count(*) filter (where p.polcmd = 'r') as lecture,
         count(*) filter (where p.polcmd <> 'r') as ecriture
    from pg_policy p join t on p.polrelid = t.id
), bucket as (
  select public, file_size_limit from storage.buckets where id = 'packs-pubs'
)
select 'table public.packs_pubs existe (to_regclass) (attendu : oui)' as quoi,
       case when (select id from t) is not null then 'oui' else 'NON (anormal)' end as resultat
union all
select 'securite par ligne activee (pg_class.relrowsecurity) (attendu : oui)',
       case when coalesce((select rls from securite), false) then 'oui' else 'NON (anormal)' end
union all
select 'une seule politique en lecture, aucune en ecriture (pg_policies, pg_policy.polcmd) (attendu : oui)',
       case when coalesce((select total from toutes), 0) = 1
             and coalesce((select lecture from commandes), 0) = 1
             and coalesce((select ecriture from commandes), 0) = 0
            then 'oui' else 'NON (anormal)' end
union all
select 'bucket packs-pubs existe, prive, file_size_limit = 20971520 (storage.buckets) (attendu : oui)',
       case when coalesce((select public from bucket), true) = false
             and coalesce((select file_size_limit from bucket), 0) = 20971520
            then 'oui' else 'NON (anormal)' end;
