-- 0165 · CRM : l'APRÈS-CHANTIER (plan plans/crm-idees-twenty-1810.md, n°7) — demande d'avis et rappel d'entretien.
-- Écrite le 19/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord (DO + EXECUTE + raise exception), puis application, puis les
-- contrôles du bas, puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot4-qa.mjs`.
-- Idempotente. Une table neuve ; sur crm_rappels (0162), seule la liste des types s'allonge (rien n'est retiré, aucune ligne
-- touchée). Rien sur public.artisans (verrou de colonnes du 18/10).
--
-- 1 ─ crm_apres_chantier : les réglages de l'artisan, une ligne par compte. DÉSACTIVÉS par défaut (opt-in) : `avis` (proposer
--     une demande d'avis 2 jours après la fin d'un chantier) et `entretien` (proposer l'entretien d'une chaudière, d'une pompe à
--     chaleur, d'un conduit, à la date anniversaire). Les textes sont ceux de l'artisan (≤ 1 500, sans lien : contrôlé par l'API,
--     lib/apresChantier.ts). `actif_depuis` : à l'activation, pas de rattrapage en rafale des vieux chantiers.
--     AUCUN message ne part tout seul : le passage quotidien POSE UN RAPPEL pour l'artisan (crm_rappels, origine « systeme »),
--     et chaque envoi est relu puis confirmé par lui (POST /api/crm/apres-chantier/message). L'historique des envois est le
--     rappel lui-même, coché, avec `envoye_le` (sans garder le texte).
-- 2 ─ crm_rappels.type accepte `demande_avis` et `entretien` (posés par le système, jamais par le formulaire de l'artisan).
-- 3 ─ RLS comme 0162 : lecture de SA ligne, gardes de session et de suspension, aucune écriture directe pour `authenticated`
--     (tout passe par /api/crm/apres-chantier, clé de service, après garde et offre), rien pour `anon`. Pas de temps réel.

-- 1 ─ Les réglages
create table if not exists public.crm_apres_chantier (
  artisan_id       uuid primary key references public.artisans(id) on delete cascade,
  avis             boolean not null default false,
  entretien        boolean not null default false,
  texte_avis       text check (texte_avis is null or char_length(texte_avis) between 20 and 1500),
  texte_entretien  text check (texte_entretien is null or char_length(texte_entretien) between 20 and 1500),
  actif_depuis     timestamptz,
  maj_le           timestamptz not null default now()
);

-- 2 ─ Les deux types de rappel posés par l'après-chantier
alter table public.crm_rappels drop constraint if exists crm_rappels_type_check;
alter table public.crm_rappels add constraint crm_rappels_type_check
  check (type in ('rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre', 'demande_avis', 'entretien'));

-- 3 ─ RLS
alter table public.crm_apres_chantier enable row level security;
drop policy if exists crm_apres_chantier_lecture on public.crm_apres_chantier;
create policy crm_apres_chantier_lecture on public.crm_apres_chantier for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.crm_apres_chantier;
create policy garde_session on public.crm_apres_chantier as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.crm_apres_chantier;
create policy garde_suspension_ins on public.crm_apres_chantier as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.crm_apres_chantier;
create policy garde_suspension_maj on public.crm_apres_chantier as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.crm_apres_chantier;
create policy garde_suspension_sup on public.crm_apres_chantier as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.crm_apres_chantier from anon;
revoke insert, update, delete on public.crm_apres_chantier from authenticated;

-- Contrôles (résultats attendus entre crochets) :
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'crm_apres_chantier';   -- [5]
-- select has_table_privilege('anon', 'public.crm_apres_chantier', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.crm_apres_chantier', 'insert');   -- [false]
-- select relrowsecurity from pg_class where oid = 'public.crm_apres_chantier'::regclass;   -- [true]
-- select pg_get_constraintdef(oid) like '%demande_avis%entretien%' from pg_constraint where conname = 'crm_rappels_type_check';   -- [true]
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'crm_apres_chantier';   -- [0]
