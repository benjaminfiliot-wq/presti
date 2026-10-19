-- 0162 · CRM : les RAPPELS et RENDEZ-VOUS de l'artisan sur chaque fiche (plan plans/crm-idees-twenty-1810.md, n°1).
-- Écrite le 18/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord (DO + EXECUTE + raise exception), puis application, puis les
-- contrôles du bas, puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot2-qa.mjs`.
-- Idempotente et additive : une table neuve, rien d'existant n'est modifié (ni colonne, ni ligne, ni droit de public.artisans).
--
-- 1 ─ crm_rappels : « rappeler jeudi », « métré mardi 14 h », « relancer le devis vendredi ». Un rappel vise UNE cible : un client
--     (son identifiant public, 64 hex, lib/crm/empreinte.ts — jamais une adresse en clair), une demande, un devis ou un chantier.
--     `echeance` = le jour (Paris), `heure` facultative ; `fait_le` posé quand l'artisan coche ; `origine` dit qui l'a posé
--     (l'artisan, le passage quotidien, l'assistant). `envoye_le` : le message qui va avec (relance d'un devis, plus tard
--     après-chantier) est PARTI à cet instant, après confirmation de l'artisan — l'historique des relances, sans garder le texte.
--     `cle` (facultative, unique par compte) rend idempotents les rappels posés
--     par le système (un seul « relancer le devis » par devis, un seul rappel d'entretien par chantier…).
--     Le texte est libre (≤ 300) : l'écran rappelle la règle de minimisation (AIDE_TEXTE_LIBRE).
--     La cible supprimée emporte ses rappels (on delete cascade) ; le compte supprimé aussi (purger_compte_test, purge RGPD).
-- 2 ─ RLS comme 0151/0152/0158 : lecture de SES lignes seulement, garde de session et de suspension, aucun droit d'écriture
--     direct pour `authenticated` (tout passe par /api/crm/rappels*, clé de service, après garde, offre Signature et validation),
--     rien pour `anon`. Un déclencheur refuse toute cible (demande, devis, chantier) d'un AUTRE artisan, clé de service comprise.
-- 3 ─ Temps réel : la table rejoint la publication `supabase_realtime` (l'écran CRM l'écoute, filtre `artisan_id=eq.<uid>`).
--     ⚠️ La liste de la publication doit rester identique à TABLES_TEMPS_REEL de lib/crm/tempsReel.ts (scripts/crm-qa.mjs, M3).

-- 1 ─ La table
create table if not exists public.crm_rappels (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  client_cle   text check (client_cle is null or client_cle ~ '^[0-9a-f]{64}$'),
  lead_id      uuid references public.leads(id) on delete cascade,
  devis_id     uuid references public.devis(id) on delete cascade,
  chantier_id  uuid references public.chantiers(id) on delete cascade,
  type         text not null default 'rappeler' check (type in ('rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre')),
  echeance     date not null check (echeance between date '2000-01-01' and date '2100-12-31'),
  heure        time,
  texte        text check (texte is null or char_length(texte) <= 300),
  fait_le      timestamptz,
  envoye_le    timestamptz,
  origine      text not null default 'artisan' check (origine in ('artisan', 'systeme', 'assistant')),
  cle          text check (cle is null or char_length(cle) between 1 and 120),
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  constraint crm_rappels_une_cible check (num_nonnulls(client_cle, lead_id, devis_id, chantier_id) = 1)
);
create index if not exists crm_rappels_a_faire_idx on public.crm_rappels (artisan_id, echeance) where fait_le is null;
create index if not exists crm_rappels_lead_idx on public.crm_rappels (lead_id) where lead_id is not null;
create index if not exists crm_rappels_devis_idx on public.crm_rappels (devis_id) where devis_id is not null;
create index if not exists crm_rappels_chantier_idx on public.crm_rappels (chantier_id) where chantier_id is not null;
create index if not exists crm_rappels_client_idx on public.crm_rappels (artisan_id, client_cle) where client_cle is not null;
-- Index unique COMPLET (les NULL restent distincts) : un index partiel ne servirait pas à « on conflict (artisan_id, cle) » de PostgREST.
create unique index if not exists crm_rappels_cle_unique on public.crm_rappels (artisan_id, cle);

-- 2 ─ Aucune cible d'un autre artisan ; maj_le tenu à jour.
create or replace function public.crm_rappel_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.lead_id is not null and not exists (select 1 from public.leads l where l.id = new.lead_id and l.artisan_id = new.artisan_id) then
    raise exception 'crm : demande d un autre artisan';
  end if;
  if new.devis_id is not null and not exists (select 1 from public.devis d where d.id = new.devis_id and d.artisan_id = new.artisan_id) then
    raise exception 'crm : devis d un autre artisan';
  end if;
  if new.chantier_id is not null and not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and new.artisan_id is distinct from old.artisan_id then
    raise exception 'crm : un rappel ne change pas de compte';
  end if;
  new.maj_le := now();
  return new;
end $fn$;
drop trigger if exists crm_rappel_verifier on public.crm_rappels;
create trigger crm_rappel_verifier before insert or update on public.crm_rappels
  for each row execute function public.crm_rappel_verifier();

-- 3 ─ RLS : lecture de ses lignes ; garde de session et de suspension (0138/0151) ; aucun droit d'écriture direct ; rien pour anon.
alter table public.crm_rappels enable row level security;
drop policy if exists crm_rappels_lecture on public.crm_rappels;
create policy crm_rappels_lecture on public.crm_rappels for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.crm_rappels;
create policy garde_session on public.crm_rappels as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.crm_rappels;
create policy garde_suspension_ins on public.crm_rappels as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.crm_rappels;
create policy garde_suspension_maj on public.crm_rappels as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.crm_rappels;
create policy garde_suspension_sup on public.crm_rappels as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.crm_rappels from anon;
revoke insert, update, delete on public.crm_rappels from authenticated;

-- 4 ─ Le temps réel : la table rejoint la publication (idempotent).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_rappels') then
    alter publication supabase_realtime add table public.crm_rappels;
  end if;
end $$;

-- Contrôles (résultats attendus entre crochets) :
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_rappels';   -- [1]
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'crm_rappels';   -- [5]
-- select has_table_privilege('anon', 'public.crm_rappels', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.crm_rappels', 'insert');   -- [false]
-- select relrowsecurity from pg_class where oid = 'public.crm_rappels'::regclass;   -- [true]
-- select count(*) from pg_trigger where tgrelid = 'public.crm_rappels'::regclass and tgname = 'crm_rappel_verifier';   -- [1]
