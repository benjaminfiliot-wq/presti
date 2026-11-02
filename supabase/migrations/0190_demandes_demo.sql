-- 0190 — Les demandes de démo « Presti pour l'entreprise », rangées et suivies (chantier 4, lot L19 ; tâche 032-026).
--
-- NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj (.claude/rules/securite.md, .claude/rules/migration-production.md).
-- Ordre : cette migration collée et contrôlée, PUIS le drapeau `demandesDemo` levé (lib/flags.ts) — jamais l'inverse.
--
-- Pourquoi : aujourd'hui, une demande de démo part en e-mail à Benj (app/api/contact/route.ts, notifierEntreprise) et rien ne la range
-- ni ne la suit. Plan du chantier 4, §0 bis rang 16 et volet « démo Entreprise » (plans/011-cadrage-01-11/chantier-4-assistant-plan.md),
-- §8.2 (forme des tables), §14 ligne L19.
--
-- Forme (§8.2) :
--   • RLS dès la création, AUCUNE politique pour anon ni authenticated : un jeton de navigateur ne lit ni n'écrit rien ;
--   • droits de anon et authenticated retirés ; on écrit par la clé de service seulement (route /api/contact, route du Poste) ;
--   • les gardes de session de 0138 (garde_session, garde_suspension_*) posées sur la table, comme sur toute table à RLS ;
--   • sans IP (plan, volet démo) ; prénom, e-mail et message ne sont lus que par le Poste de contrôle (n8n ne les demande pas) ;
--   • listes fermées, recopiées du formulaire du chantier 2 (plans/011-cadrage-01-11/c2-lot4/texte.md:284-285) et de lib/demandesDemo.ts.
--
-- n8n : le workflow presti-demande-demo (inactif) lit AUJOURD'HUI par l'identifiant « Supabase account », c'est-à-dire la clé de
-- service, qui passe outre la RLS et les droits par colonne : la seule barrière devant prénom, e-mail et message est le `select=` de
-- ses nœuds, prouvé par scripts/demandes-demo-qa.mjs. Le bloc final prépare la voie stricte : le rôle `n8n_lecture` de 0189, s'il
-- existe, ne reçoit que identifiant, motif, taille, activité, état et dates. Si 0189 n'est pas appliquée, le bloc est sauté sans
-- erreur et devra être rejoué après elle (« Avant l'activation » de .orchestre/preuves/032-026/resume.md).
--
-- Retour arrière (une seule instruction, la table est neuve) :
--   drop table if exists public.demandes_demo cascade; drop function if exists public.demandes_demo_maj();

create table if not exists public.demandes_demo (
  id               uuid primary key default gen_random_uuid(),
  motif            text not null default 'entreprise' check (motif in ('entreprise')),
  taille           text not null check (taille in ('1', '2 à 5', '6 à 20', 'plus de 20')),
  activite         text not null check (activite in ('Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre')),
  prenom           text not null check (char_length(prenom) between 1 and 120),
  email            text not null check (char_length(email) between 3 and 200 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message          text check (message is null or char_length(message) between 1 and 4000),
  etat             text not null default 'nouvelle' check (etat in ('nouvelle', 'traitee')),
  rendez_vous_le   timestamptz,
  fiche_diagnostic jsonb check (fiche_diagnostic is null or jsonb_typeof(fiche_diagnostic) = 'object'),
  traitee_le       timestamptz,
  traitee_par      uuid,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  check ((etat = 'traitee') = (traitee_le is not null))
);

comment on table public.demandes_demo is
  'Demandes de démo « Presti pour l''entreprise » (0190, chantier 4 L19). Écrites par /api/contact (clé de service, drapeau demandesDemo), lues et marquées « traitée » par le Poste de contrôle. Sans IP. Jamais lisible par un jeton de navigateur.';
comment on column public.demandes_demo.etat is 'nouvelle | traitee — le geste « traitée » du Poste de contrôle (app/api/controle/demandes-demo).';
comment on column public.demandes_demo.fiche_diagnostic is 'Fiche de diagnostic du premier échange (plan du chantier 4, rang 17). Jamais dans le vault.';

-- Les listes de la vue du Poste et du workflow n8n : les plus récentes, et les neuves par date.
create index if not exists demandes_demo_cree_le_idx on public.demandes_demo (cree_le desc);
create index if not exists demandes_demo_nouvelles_idx on public.demandes_demo (cree_le) where etat = 'nouvelle';

create or replace function public.demandes_demo_maj() returns trigger
language plpgsql set search_path = public as $maj$
begin
  new.maj_le := now();
  return new;
end
$maj$;

drop trigger if exists demandes_demo_maj on public.demandes_demo;
create trigger demandes_demo_maj before update on public.demandes_demo
  for each row execute function public.demandes_demo_maj();

alter table public.demandes_demo enable row level security;
revoke all on table public.demandes_demo from public, anon, authenticated;
revoke all on function public.demandes_demo_maj() from public, anon, authenticated;

-- Les gardes de session de 0138, posées ici aussi (la boucle de 0138 n'a vu que les tables de son jour).
drop policy if exists garde_session on public.demandes_demo;
create policy garde_session on public.demandes_demo as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.demandes_demo;
create policy garde_suspension_ins on public.demandes_demo as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.demandes_demo;
create policy garde_suspension_maj on public.demandes_demo as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.demandes_demo;
create policy garde_suspension_sup on public.demandes_demo as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));

-- La lecture de n8n (rôle de 0189, s'il existe) : des identifiants, des énumérations et des dates seulement.
do $lecture$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    execute 'grant select (id, motif, taille, activite, etat, cree_le, maj_le, traitee_le) on public.demandes_demo to n8n_lecture';
    execute 'drop policy if exists n8n_lecture_select on public.demandes_demo';
    execute 'create policy n8n_lecture_select on public.demandes_demo for select to n8n_lecture using (true)';
  end if;
end
$lecture$;
