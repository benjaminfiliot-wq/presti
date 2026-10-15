-- 0140 · Compta de l'artisan (/chiffres) : date de règlement des factures, et réglages des automatisations.
-- Écrite le 12/10/2026, sections 1 à 3 appliquées le 12/10 (drapeaux restés baissés), section 4 (gardes) ajoutée et appliquée le 15/10/2026
-- avec la levée des drapeaux. Les trois drapeaux qui s'en servent (lib/flags.ts : comptaDateReglement,
-- comptaAlerteImpayes, comptaExportMensuel) restent baissés jusqu'à son application : levés sans elle, la route du
-- tableau de bord lirait une colonne absente et les réglages une table absente (erreur franche, jamais un faux zéro).
--
--  1. factures.payee_le : le jour (heure de Paris) où la facture passe à « payée ». Posé par un déclencheur, pour que
--     AUCUN chemin d'écriture (PATCH /api/factures/[id], un futur paiement en ligne, une correction en base) ne l'oublie.
--     Pas de reprise des factures déjà payées : la base n'a jamais su quand elles l'ont été, on n'invente pas une date.
--     Le tableau de bord range ces factures-là au mois d'émission (lib/comptaTableau.ts).
--     La colonne n'est pas dans le scellement (facture_immuable, 0041) : c'est un fait de règlement, pas une mention
--     de la pièce.
--  2. compta_reglages : une ligne par artisan (alerte impayés, export mensuel au comptable).
--  3. compta_alertes_envoyees : la mémoire des factures déjà signalées (une facture n'est signalée qu'une fois).
--     Écrite et lue par le service seulement (la tâche planifiée) ; l'artisan n'y a pas accès.

-- 1 ─ Date de règlement
alter table public.factures add column if not exists payee_le date;
comment on column public.factures.payee_le is
  'Jour (Europe/Paris) du passage au statut payee, posé par le déclencheur factures_payee_le (0140). Null pour les factures payées avant 0140.';

create or replace function public.facture_payee_le() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.statut = 'payee' and (tg_op = 'INSERT' or old.statut is distinct from 'payee') and new.payee_le is null then
    new.payee_le := (now() at time zone 'Europe/Paris')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists factures_payee_le on public.factures;
create trigger factures_payee_le before insert or update of statut on public.factures
  for each row execute function public.facture_payee_le();

-- 2 ─ Réglages des automatisations
create table if not exists public.compta_reglages (
  artisan_id          uuid primary key references public.artisans(id) on delete cascade,
  alerte_impayes      boolean not null default false,
  alerte_jours        integer not null default 15 check (alerte_jours between 1 and 180),
  export_mensuel      boolean not null default false,
  export_email        text check (export_email is null or (char_length(export_email) <= 254 and export_email ~ '^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$')),
  dernier_export_mois text check (dernier_export_mois is null or dernier_export_mois ~ '^\d{4}-\d{2}$'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint compta_reglages_export_adresse check (not export_mensuel or export_email is not null)
);
alter table public.compta_reglages enable row level security;
-- L'artisan lit et règle SA ligne. La route passe par le service et filtre de toute façon sur la session.
drop policy if exists compta_reglages_own on public.compta_reglages;
create policy compta_reglages_own on public.compta_reglages for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);
create index if not exists compta_reglages_actifs on public.compta_reglages (artisan_id) where alerte_impayes or export_mensuel;

-- 3 ─ Factures déjà signalées
create table if not exists public.compta_alertes_envoyees (
  facture_id  uuid primary key references public.factures(id) on delete cascade,
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  envoyee_le  timestamptz not null default now()
);
alter table public.compta_alertes_envoyees enable row level security;
-- Aucune politique : seul le service (clé de service, tâche planifiée) y lit et y écrit.
create index if not exists compta_alertes_envoyees_artisan on public.compta_alertes_envoyees (artisan_id);

-- 4 ─ Ajout du 15/10 : gardes de session et de suspension (0138/0151) et rien pour anon, comme 0157-0159. Idempotent.
--     compta_reglages : l'artisan lit et règle SA ligne (politique de la section 2) tant que sa session est valide et son compte non suspendu.
--     compta_alertes_envoyees : service seulement (aucune politique) ; on retire en plus tout droit à anon et authenticated.
do $$
declare t text;
begin
  foreach t in array array['compta_reglages'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))', t);
  end loop;
end $$;
revoke all on public.compta_alertes_envoyees from anon, authenticated;
