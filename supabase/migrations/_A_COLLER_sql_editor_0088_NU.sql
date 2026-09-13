---------------------------- _A_COLLER_sql_editor_0088_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.sites_commandes (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete set null,
  email text not null,
  etat text not null default 'brouillon' check (etat in ('brouillon', 'payee', 'generee', 'validee', 'en_ligne')),
  domaine_mode text not null default 'aucun' check (domaine_mode in ('existant', 'a_prendre', 'aucun')),
  domaine text,
  metier text not null default '',
  metiers_secondaires text[] not null default '{}',
  communes text[] not null default '{}',
  matiere jsonb not null default '{}'::jsonb,
  prix_cents integer not null default 30000 check (prix_cents > 0),
  devise text not null default 'eur',
  stripe_session_id text,
  stripe_payment_intent_id text,
  paye_le timestamptz,
  genere_le timestamptz,
  apercu_jeton text,
  scores jsonb,
  verifications jsonb,
  consigne text,
  regenerations integer not null default 0,
  valide_le timestamptz,
  en_ligne_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists sites_commandes_stripe_session_key on public.sites_commandes (stripe_session_id) where stripe_session_id is not null;
create index if not exists sites_commandes_artisan_idx on public.sites_commandes (artisan_id);
create index if not exists sites_commandes_etat_idx on public.sites_commandes (etat);
comment on table public.sites_commandes is 'Site a la demande (300 euros, une fois) : le dossier, le paiement et les quatre etats - prompt v15.';
alter table public.sites_commandes enable row level security;
revoke all on public.sites_commandes from public, anon, authenticated;
drop policy if exists "site commande : l artisan lit ses commandes" on public.sites_commandes;
create policy "site commande : l artisan lit ses commandes" on public.sites_commandes for select using (auth.uid() = artisan_id);
alter table public.artisans add column if not exists site_origine text not null default 'abonnement' check (site_origine in ('abonnement', 'commande'));
comment on column public.artisans.site_origine is 'Origine du site vitrine : abonnement (historique, reste actif tant que le compte existe) ou commande (site a la demande, 300 euros).';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'table sites_commandes' as quoi,
       coalesce((select 'oui (' || count(*)::text || ' colonnes)' from information_schema.columns where table_schema = 'public' and table_name = 'sites_commandes'), 'NON (anormal)') as resultat
union all
select 'index unique sur stripe_session_id',
       coalesce((select 'oui' from pg_indexes where schemaname = 'public' and indexname = 'sites_commandes_stripe_session_key'), 'NON (anormal)')
union all
select 'RLS activee sur sites_commandes',
       coalesce((select case when relrowsecurity then 'oui' else 'NON (anormal)' end from pg_class where oid = 'public.sites_commandes'::regclass), 'NON (anormal) : table absente')
union all
select 'politiques sur sites_commandes',
       coalesce((select string_agg(policyname || ' [' || cmd || ']', ', ' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'sites_commandes'), 'aucune (anormal)')
union all
select 'artisans.site_origine',
       coalesce((select 'oui, defaut ' || coalesce(column_default, '?') from information_schema.columns where table_schema = 'public' and table_name = 'artisans' and column_name = 'site_origine'), 'NON (anormal)')
union all
select 'sites existants (site_active) tous en origine abonnement',
       (select count(*)::text || ' actifs, dont ' || count(*) filter (where site_origine = 'abonnement')::text || ' en abonnement' from public.artisans where site_active);
