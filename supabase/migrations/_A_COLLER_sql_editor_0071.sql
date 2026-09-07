-- À coller dans Supabase → SQL Editor. La comptabilité de l'entreprise : achats fournisseurs, relevés
-- mensuels du partenaire, échéances fiscales, et les seuils de TVA et taux URSSAF en base (ils changent
-- par décret, et un décret ne doit pas demander un déploiement).
--
-- Un relevé ARRÊTÉ est figé par un trigger : recalculer un mois clos changerait un montant déjà annoncé
-- à Alexandre. Seuls le paiement et la réception de sa facture restent modifiables ensuite.

-- 0071 — La comptabilité de l'entreprise (prompt v11 §3, J5) : achats, relevés du partenaire, obligations.
--
-- Trois tables, et une règle commune : ce sont les livres de l'entreprise. Ils ne se lisent pas depuis
-- un navigateur, même celui d'un fondateur — la garde du Poste de contrôle les sert, et le partenaire
-- n'y a accès que pour SON relevé (v11 §5).

-- ══ 1. Les achats : ce que l'entreprise dépense ═══════════════════════════════════════════════════════
--
-- Vercel, Supabase, Anthropic, Resend, OVH, Apple, Google, Stripe (frais), assurance, comptable. Chaque
-- ligne porte son fournisseur, sa date, ses montants et sa catégorie — et surtout la façon dont elle est
-- ARRIVÉE : déposée à la main, tirée d'une API, ou détectée dans un email. On doit pouvoir dire d'où
-- vient un chiffre, y compris quand il vient d'un robot.
create table if not exists public.achats (
  id            uuid primary key default gen_random_uuid(),
  fournisseur   text not null,
  libelle       text,
  categorie     text not null default 'autre'
                check (categorie in ('hebergement', 'base', 'ia', 'email', 'domaine', 'store', 'paiement', 'assurance', 'comptable', 'materiel', 'autre')),
  date_facture  date not null,
  -- En CENTIMES, entiers. Une comptabilité en flottants perd des centimes, et un centime perdu dans un
  -- livre est une erreur de livre.
  ht_cents      int not null default 0,
  tva_cents     int not null default 0,
  ttc_cents     int not null default 0,
  -- Presti est en franchise en base (art. 293 B du CGI) : la TVA sur les achats n'est PAS déductible.
  -- On la garde pour la facture, pas pour la récupérer — et le jour de l'assujettissement, elle est là.
  payee         boolean not null default true,
  echeance      date,
  origine       text not null default 'manuel' check (origine in ('manuel', 'api', 'email')),
  piece         text,
  note          text,
  cree_le       timestamptz not null default now(),
  cree_par      uuid references public.artisans(id) on delete set null
);
comment on table public.achats is 'Factures fournisseurs de l''entreprise (v11 §3). Montants en CENTIMES. La TVA n''est pas déductible tant que Presti est en franchise en base — elle est gardée pour la pièce, pas pour la récupérer.';
comment on column public.achats.origine is 'Comment la ligne est arrivée : déposée à la main, tirée d''une API, ou détectée dans un email. On doit pouvoir dire d''où vient un chiffre.';
create index if not exists achats_date_idx on public.achats (date_facture desc);
create index if not exists achats_impayes_idx on public.achats (echeance) where not payee;
alter table public.achats enable row level security;
revoke all on public.achats from public, anon, authenticated;

-- ══ 2. Les relevés du partenaire ══════════════════════════════════════════════════════════════════════
--
-- Un relevé est un ENGAGEMENT : une fois émis, il dit ce que Presti doit pour un mois. Il se recalcule
-- tant qu'il est en brouillon ; une fois arrêté, ses chiffres sont figés — recalculer un mois clos
-- changerait un montant déjà annoncé, et personne ne pourrait plus se fier à ce qu'il a reçu.
create table if not exists public.reversements (
  id                 uuid primary key default gen_random_uuid(),
  partenaire_id      uuid not null references public.artisans(id) on delete restrict,
  mois               text not null check (mois ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  statut             text not null default 'brouillon' check (statut in ('brouillon', 'arrete', 'paye')),
  encaisse_cents     int not null default 0,
  couts_cents        int not null default 0,
  resultat_cents     int not null default 0,
  commission_cents   int not null default 0,
  interessement_cents int not null default 0,
  du_cents           int not null default 0,
  part_fondateur_cents int not null default 0,
  -- Le détail par client, figé à l'arrêté : le relevé doit pouvoir se vérifier ligne à ligne, même si
  -- le registre des apports change ensuite.
  detail             jsonb not null default '[]'::jsonb,
  arrete_le          timestamptz,
  arrete_par         uuid references public.artisans(id) on delete set null,
  paye_le            timestamptz,
  facture_recue      boolean not null default false,
  note               text,
  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now()
);
comment on table public.reversements is 'Relevés mensuels du partenaire (contrat art. 4.2). Un relevé ARRÊTÉ est figé : recalculer un mois clos changerait un montant déjà annoncé.';
create unique index if not exists reversements_mois_idx on public.reversements (partenaire_id, mois);
alter table public.reversements enable row level security;
revoke all on public.reversements from public, anon, authenticated;

-- Un relevé arrêté ne se réécrit pas. Seuls le paiement et la réception de facture restent modifiables :
-- ce sont des faits qui arrivent APRÈS l'arrêté, pas des chiffres qu'on révise.
create or replace function public.releve_immuable() returns trigger language plpgsql as $$
begin
  if old.statut in ('arrete', 'paye') then
    if new.encaisse_cents is distinct from old.encaisse_cents
      or new.couts_cents is distinct from old.couts_cents
      or new.commission_cents is distinct from old.commission_cents
      or new.interessement_cents is distinct from old.interessement_cents
      or new.du_cents is distinct from old.du_cents
      or new.detail is distinct from old.detail
      or new.mois is distinct from old.mois then
      raise exception 'Un relevé arrêté est figé : ses chiffres ont été annoncés au partenaire.';
    end if;
  end if;
  new.maj_le := now();
  return new;
end $$;
drop trigger if exists releve_immuable_trg on public.reversements;
create trigger releve_immuable_trg before update on public.reversements
  for each row execute function public.releve_immuable();

-- ══ 3. Les obligations : ce qui tombe et quand ════════════════════════════════════════════════════════
--
-- URSSAF, CFE, impôt, seuils de TVA. Une échéance oubliée coûte des pénalités ; elle doit apparaître
-- dans « À faire » avant, pas après.
create table if not exists public.obligations (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('urssaf', 'cfe', 'impot', 'tva', 'autre')),
  libelle       text not null,
  echeance      date not null,
  montant_cents int,
  -- Une estimation n'est pas un montant dû : l'écran doit pouvoir le dire.
  estime        boolean not null default true,
  statut        text not null default 'a_venir' check (statut in ('a_venir', 'payee', 'sans_objet')),
  paye_le       date,
  note          text,
  cree_le       timestamptz not null default now()
);
comment on table public.obligations is 'Échéances fiscales et sociales (v11 §3). Une estimation porte `estime = true` : l''écran ne doit jamais présenter une estimation comme un montant dû.';
create index if not exists obligations_echeance_idx on public.obligations (echeance) where statut = 'a_venir';
alter table public.obligations enable row level security;
revoke all on public.obligations from public, anon, authenticated;

-- ══ 4. Les réglages de l'entreprise ═══════════════════════════════════════════════════════════════════
--
-- Les seuils et les taux vivent en BASE, pas dans le code : ils changent par décret, et un décret ne
-- doit pas demander un déploiement. `reglages_globaux` existe depuis 0065 ; on l'amorce.
-- `valeur` est du jsonb : un nombre s'écrit nu, une chaîne entre guillemets JSON.
insert into public.reglages_globaux (cle, valeur, description) values
  ('tva_seuil_franchise_cents', '3750000', 'Seuil de franchise en base de TVA pour les prestations de services (art. 293 B du CGI), en centimes. À vérifier chaque année.'),
  ('tva_seuil_majore_cents',    '4110000', 'Seuil majoré : au-delà, la TVA s''applique dès le premier jour du dépassement.'),
  ('tva_alerte_pourcent',       '80',      'On prévient à ce pourcentage du seuil, pour avoir le temps de réagir.'),
  ('urssaf_taux_pourcent',      '21.2',    'Taux de cotisations sur le chiffre d''affaires (BNC, prestations de services). À confirmer avec le comptable.'),
  ('urssaf_periodicite',        '"trimestriel"', 'mensuel ou trimestriel')
on conflict (cle) do nothing;
