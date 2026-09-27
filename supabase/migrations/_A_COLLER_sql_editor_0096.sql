-- ============================================================================================
-- 0096 · Le socle du bus des agents : le schéma ops et ses 11 tables, fermées à toute l'API
--        (fiche 026-010, série 026 ; plan SaaS/Produit/Ecosysteme-Plan-2026-09-24.md §3.2,
--         rectification du 24/09 §3.4, §3.6, §3.11, voie gratuite du 25/09 §1, §2, §6)
--
-- Pourquoi un schéma à part : le bus (tâches, journal, décisions, prospection) est la mémoire de
-- travail des agents. Il n'a rien à faire dans `public`, que PostgREST expose au navigateur. `ops`
-- n'est pas dans les schémas exposés, et il est en plus fermé ici à TOUS les rôles de l'API :
-- public, anon, authenticated ET service_role. Aucun rôle ne lit ni n'écrit une table d'ops en
-- direct, pas même la clé de service.
--
-- Qui écrit : personne en direct. Les fonctions `public.ops_*` et `public.acq_*` en SECURITY DEFINER
-- des migrations suivantes (0097, 0098, 0099, 0105, 0106 …), exécutables par service_role seul, sur le
-- modèle de `artisan_par_ancien_slug` (0051_slug_modifiable.sql:33-42). Cette migration ne pose QUE
-- les tables, leurs contraintes, leur fermeture et leurs graines : aucune fonction d'accès.
--
-- Qui lit : les mêmes fonctions (la station de pilotage, les agents du bus par leurs routes gardées).
--
-- Ce que la base garantit dès ici, quel que soit le code qui l'appelle :
--   · une tâche a au plus 3 tentatives et 3 niveaux de profondeur, une seule tâche ouverte par objet,
--     un bail porte toujours son agent et son échéance, « faite » exige une preuve ;
--   · le journal (ops.evenements) est en ajout seul : ni modification ni effacement, sauf purge
--     déclarée (`set_config('ops.purge', 'oui', true)`) ;
--   · un envoi porte ses trois verdicts (objet JSON borné) et n'est approuvé ou envoyé que par le
--     Facteur (le canal essai_e2e sert aux essais à sec) ; aucun message ne part à la main ;
--   · la voie gratuite du 25/09 : plus de canal `email` (aucun e-mail à froid), le premier contact
--     passe par `formulaire_site` (le porteur de l'usine, envoyeur facteur_usine), le Gmail de
--     prospection ne répond qu'à qui a écrit (`email_sollicite`, envoyeur gmail) ;
--   · une opposition est définitive (expire_le nul) ou temporaire (le « pas maintenant » de 90 jours) ;
--   · les plafonds par canal vont de 0 à 300, les premiers contacts jamais au-dessus du total ;
--   · l'interrupteur `envoi_froid` est semé FERMÉ : la base refusera tout premier contact et toute
--     relance (0099) tant que Benj ne l'ouvre pas depuis la station (0111, au plus tôt le 12/10/2026).
--
-- Graines : deux agents (systeme, a0), huit plafonds '*' (formulaire, Instagram, Facebook et LinkedIn
-- à 0 ; email_sollicite et reponse_privee à 50 ; messagerie à 100 ; essai_e2e à 4), deux interrupteurs
-- fermés. Ce sont les chiffres de PLAFONDS_DEFAUT (lib/agents/acquisition/contrat.ts) : un seul chiffre,
-- deux endroits interdits de diverger. Tout est idempotent (if not exists, or replace, on conflict do
-- nothing) : rejouer ce fichier ne change rien.
--
-- Interdits dans ce fichier : create policy, tout grant, drop table, create extension.
-- ============================================================================================

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated, service_role;

-- ── Les agents du bus ────────────────────────────────────────────────────────────────────────
create table if not exists ops.agents (
  nom                     text primary key check (nom ~ '^[a-z0-9_]{2,40}$'),
  libelle                 text not null check (char_length(libelle) between 1 and 80),
  capacites               text[] not null default '{}',
  types_crees             text[] not null default '{}',
  tables_ecrites          text[] not null default '{}'
                          check (tables_ecrites <@ array['taches', 'evenements', 'decisions', 'prospects', 'envois', 'opposition', 'maquettes', 'couts']),
  jeton_hash              text unique check (jeton_hash is null or jeton_hash ~ '^[0-9a-f]{64}$'),
  jeton_pose_le           timestamptz,
  debit_minute            int not null default 30 check (debit_minute between 1 and 600),
  quota_creations_jour    int not null default 50 check (quota_creations_jour between 0 and 1000),
  plafond_euros_jour      numeric(8,2) not null default 1 check (plafond_euros_jour >= 0),
  periode_minutes         int not null default 60 check (periode_minutes between 1 and 10080),
  battement_le            timestamptz,
  en_pause                boolean not null default false,
  pause_motif             text check (char_length(pause_motif) <= 200),
  disjoncteur_ouvert_le   timestamptz,
  jeton_externe_expire_le timestamptz,
  retire_le               timestamptz,
  cree_le                 timestamptz not null default now()
);

-- ── Les tâches ───────────────────────────────────────────────────────────────────────────────
create table if not exists ops.taches (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type ~ '^[a-z_]{2,40}$'),
  cle_idempotence  text not null unique check (char_length(cle_idempotence) between 3 and 200),
  objet            text check (char_length(objet) <= 200),
  capacite         text not null check (capacite ~ '^[a-z_]{2,40}$'),
  sortante         boolean not null default false,
  statut           text not null default 'file' check (statut in ('file', 'bail', 'faite', 'echec', 'a_decider', 'annulee')),
  agent            text references ops.agents(nom) on delete set null,
  bail_jusqua      timestamptz,
  tentatives       int not null default 0 check (tentatives between 0 and 3),
  derniere_erreur  text check (char_length(derniere_erreur) <= 500),
  origine_id       uuid references ops.taches(id) on delete set null,
  profondeur       int not null default 0 check (profondeur between 0 and 3),
  charge           jsonb not null default '{}' check (pg_column_size(charge) <= 8192),
  preuve_url       text check (char_length(preuve_url) <= 500),
  cree_par         text not null references ops.agents(nom) on delete cascade,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  constraint taches_bail_coherent check ((statut = 'bail' and agent is not null and bail_jusqua is not null) or (statut <> 'bail' and bail_jusqua is null)),
  constraint taches_faite_avec_preuve check (statut <> 'faite' or char_length(coalesce(preuve_url, '')) > 0)
);
create unique index if not exists taches_une_ouverte_par_objet on ops.taches (objet)
  where objet is not null and statut in ('file', 'bail', 'a_decider');
create index if not exists taches_file on ops.taches (statut, capacite, cree_le);

-- ── Le journal, en ajout seul ────────────────────────────────────────────────────────────────
create table if not exists ops.evenements (
  id        bigint generated always as identity primary key,
  le        timestamptz not null default now(),
  agent     text not null references ops.agents(nom) on delete cascade,
  type      text not null check (type ~ '^[a-z_]{2,40}$'),
  objet     text check (char_length(objet) <= 200),
  resume    text not null check (char_length(resume) between 1 and 200),
  tache_id  uuid references ops.taches(id) on delete set null
);
create index if not exists evenements_le on ops.evenements (le);
create index if not exists evenements_agent_id on ops.evenements (agent, id);

create or replace function ops.evenements_ajout_seul()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if coalesce(current_setting('ops.purge', true), '') = 'oui' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  raise exception 'ops:ajout_seul (ops.evenements ne se modifie ni ne s''efface hors purge : %)', tg_op;
end
$fn$;

drop trigger if exists evenements_ajout_seul on ops.evenements;
create trigger evenements_ajout_seul
  before update or delete on ops.evenements
  for each row execute function ops.evenements_ajout_seul();

-- ── Les décisions (2 ou 3 options pour un agent du bus, jusqu'à 7 pour une carte de l'acquisition) ──
create table if not exists ops.decisions (
  id               uuid primary key default gen_random_uuid(),
  cle_idempotence  text unique,
  question         text not null check (char_length(question) between 5 and 300),
  contexte         text check (char_length(contexte) <= 2000),
  options          jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 7),
  option_defaut    text not null,
  montant_cents    int check (montant_cents >= 0),
  portee           text not null default 'aucune' check (portee in ('aucune', 'argent', 'artisan', 'securite')),
  echeance         timestamptz not null,
  statut           text not null default 'ouverte' check (statut in ('ouverte', 'tranchee', 'defaut_applique', 'annulee')),
  choix            text,
  auteur           uuid references public.artisans(id) on delete set null,
  creee_par        text not null references ops.agents(nom) on delete cascade,
  tache_id         uuid references ops.taches(id) on delete set null,
  cree_le          timestamptz not null default now(),
  tranchee_le      timestamptz,
  constraint decisions_choix_si_tranchee check ((statut in ('tranchee', 'defaut_applique')) = (choix is not null))
);

-- ── La prospection : le SOCLE seulement (la série acquisition le complète par add column if not exists) ──
create table if not exists ops.prospects (
  id               uuid primary key default gen_random_uuid(),
  cle_dedup        text not null unique check (cle_dedup ~ '^(siren|domaine|page_meta|instagram):.{2,160}$'),
  siren            text check (siren ~ '^[0-9]{9}$'),
  domaine          text,
  page_meta        text,
  instagram        text,
  metier           text,
  faits            jsonb not null default '[]' check (jsonb_typeof(faits) = 'array'),
  source           text not null default 'inconnue' check (char_length(source) <= 200),
  froid            boolean not null default true,
  dernier_contact  timestamptz,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now()
);
create index if not exists prospects_siren on ops.prospects (siren);
create index if not exists prospects_domaine on ops.prospects (domaine);
create index if not exists prospects_page_meta on ops.prospects (page_meta);
create index if not exists prospects_instagram on ops.prospects (instagram);

create table if not exists ops.envois (
  id                  uuid primary key default gen_random_uuid(),
  prospect_id         uuid references ops.prospects(id) on delete cascade,
  canal               text not null check (canal in ('instagram', 'facebook', 'linkedin', 'formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie', 'telephone', 'essai_e2e')),
  envoyeur            text not null default 'systeme' check (envoyeur ~ '^[a-z0-9_]{2,40}$'),
  type                text not null default 'premier_contact' check (type in ('premier_contact', 'relance', 'lien_maquette', 'reponse', 'confirmation_stop', 'reponse_rgpd')),
  destinataire        text check (char_length(destinataire) <= 200),
  empreinte_texte     text not null check (empreinte_texte ~ '^[0-9a-f]{64}$'),
  statut              text not null default 'prepare' check (statut in ('prepare', 'approuve', 'envoye', 'saute', 'perime', 'annule')),
  verdicts            jsonb not null default '{}' check (jsonb_typeof(verdicts) = 'object' and pg_column_size(verdicts) <= 4096),
  prepare_par         text not null default 'systeme' references ops.agents(nom) on delete cascade,
  prepare_le          timestamptz not null default now(),
  approuve_par_agent  text references ops.agents(nom) on delete set null,
  id_externe          text check (char_length(id_externe) <= 200),
  entetes             jsonb check (pg_column_size(entetes) <= 4096),
  approuve_le         timestamptz,
  envoye_le           timestamptz,
  constraint envois_prospect_sauf_meta check (prospect_id is not null or canal in ('reponse_privee', 'messagerie')),
  constraint envois_approuve_par_facteur check ((statut not in ('approuve', 'envoye')) or approuve_par_agent = 'facteur' or canal = 'essai_e2e')
);

create table if not exists ops.opposition (
  id          uuid primary key default gen_random_uuid(),
  cle_type    text not null check (cle_type in ('siren', 'domaine', 'email', 'instagram', 'page_meta', 'meta_id', 'facebook', 'linkedin', 'telephone')),
  cle_valeur  text not null check (cle_valeur = lower(btrim(cle_valeur)) and char_length(cle_valeur) between 2 and 200),
  motif       text check (char_length(motif) <= 200),
  source      text check (char_length(source) <= 80),
  cree_le     timestamptz not null default now(),
  expire_le   timestamptz,
  constraint opposition_expire_apres_creation check (expire_le is null or expire_le > cree_le),
  constraint opposition_une_par_cle unique (cle_type, cle_valeur)
);

create table if not exists ops.maquettes (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references ops.prospects(id) on delete cascade,
  objet        text check (char_length(objet) <= 300),
  jeton_hache  text unique check (jeton_hache ~ '^[0-9a-f]{64}$'),
  cree_le      timestamptz not null default now(),
  expire_le    timestamptz not null default now() + interval '21 days',
  purgee_le    timestamptz,
  constraint maquettes_21_jours check (expire_le <= cree_le + interval '21 days')
);

create table if not exists ops.quotas_canaux (
  canal                  text not null check (canal in ('instagram', 'facebook', 'linkedin', 'formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie', 'telephone', 'essai_e2e')),
  envoyeur               text not null default '*' check (envoyeur ~ '^([a-z0-9_]{2,40}|\*)$'),
  plafond_jour           int not null check (plafond_jour between 0 and 300),
  plafond_nouveaux_jour  int not null default 0 check (plafond_nouveaux_jour between 0 and 300),
  maj_le                 timestamptz not null default now(),
  constraint quotas_nouveaux_sous_le_jour check (plafond_nouveaux_jour <= plafond_jour),
  primary key (canal, envoyeur)
);

-- ── Les coûts et les interrupteurs ───────────────────────────────────────────────────────────
create table if not exists ops.couts (
  id           bigint generated always as identity primary key,
  le           timestamptz not null default now(),
  agent        text not null references ops.agents(nom) on delete cascade,
  fournisseur  text not null check (char_length(fournisseur) <= 40),
  montant_eur  numeric(10,4) not null check (montant_eur >= 0),
  detail       jsonb not null default '{}' check (pg_column_size(detail) <= 2048),
  tache_id     uuid references ops.taches(id) on delete set null
);

create table if not exists ops.interrupteurs (
  nom         text primary key check (nom in ('pause_generale', 'envoi_froid')),
  actif       boolean not null default false,
  motif       text check (char_length(motif) <= 200),
  change_le   timestamptz,
  change_par  uuid references public.artisans(id) on delete set null
);

-- ── La fermeture : RLS sans politique, aucun droit pour les rôles de l'API ────────────────────
alter table ops.agents enable row level security;
alter table ops.taches enable row level security;
alter table ops.evenements enable row level security;
alter table ops.decisions enable row level security;
alter table ops.prospects enable row level security;
alter table ops.envois enable row level security;
alter table ops.opposition enable row level security;
alter table ops.maquettes enable row level security;
alter table ops.quotas_canaux enable row level security;
alter table ops.couts enable row level security;
alter table ops.interrupteurs enable row level security;

revoke all on all tables in schema ops from public, anon, authenticated, service_role;
alter default privileges in schema ops revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema ops revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema ops revoke all on functions from public, anon, authenticated, service_role;

-- ── Les graines, et rien d'autre ─────────────────────────────────────────────────────────────
insert into ops.agents (nom, libelle, periode_minutes, tables_ecrites)
values ('systeme', 'Plomberie SQL', 10080, '{}'),
       ('a0', 'Veilleur', 5, '{evenements,decisions}')
on conflict do nothing;

insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour)
values ('instagram', '*', 0, 0),
       ('facebook', '*', 0, 0),
       ('linkedin', '*', 0, 0),
       ('formulaire_site', '*', 0, 0),
       ('email_sollicite', '*', 50, 0),
       ('reponse_privee', '*', 50, 0),
       ('messagerie', '*', 100, 0),
       ('essai_e2e', '*', 4, 4)
on conflict do nothing;

insert into ops.interrupteurs (nom, actif, motif)
values ('pause_generale', false, 'semé fermé par 0096'),
       ('envoi_froid', false, 'semé fermé par 0096 : Benj l''ouvre depuis la station, au plus tôt le 12/10/2026')
on conflict do nothing;

-- ── Les commentaires ─────────────────────────────────────────────────────────────────────────
comment on schema ops is 'Bus des agents (026) : fermé à public, anon, authenticated et service_role ; joignable par les seules fonctions public.ops_* et public.acq_* en security definer.';
comment on table ops.agents is 'Agents du bus : nom, capacités, tables écrites, jeton haché, débit et plafonds, battement, pause, disjoncteur.';
comment on table ops.taches is 'Tâches du bus : au plus 3 tentatives et 3 niveaux, une seule ouverte par objet, bail avec agent et échéance, preuve exigée pour faite.';
comment on table ops.evenements is 'Journal du bus, en ajout seul : ni modification ni effacement hors purge déclarée (ops.purge = oui).';
comment on table ops.decisions is 'Décisions à trancher par le fondateur : 2 à 7 options, une option par défaut, une échéance.';
comment on table ops.prospects is 'Socle des prospects (dédoublonnage par cle_dedup seule) ; la série acquisition le complète par add column if not exists.';
comment on table ops.envois is 'Envois préparés par la Plume ou le Répondeur, jugés par trois verdicts, approuvés et envoyés par le seul Facteur ; aucun canal email.';
comment on table ops.opposition is 'Oppositions : définitives (expire_le nul) ou temporaires (le pas maintenant de 90 jours) ; une expirée ne bloque plus mais reste.';
comment on table ops.maquettes is 'Maquettes envoyées aux prospects : 21 jours au plus, jeton haché.';
comment on table ops.quotas_canaux is 'Plafonds du jour par canal (envoyeur * : tous confondus), de 0 à 300 ; la ligne formulaire_site est réécrite par 0111 à partir des paliers.';
comment on table ops.couts is 'Coûts des agents, en euros, par fournisseur.';
comment on table ops.interrupteurs is 'Interrupteurs du bus : pause_generale et envoi_froid, semés fermés ; envoi_froid ne s''ouvre que depuis la station.';
