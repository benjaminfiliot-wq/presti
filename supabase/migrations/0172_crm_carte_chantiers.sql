-- 0172 — La CARTE du CRM suit le vrai chantier (retours de Benj du 20/10 au soir ; drapeau crmAtelierVivant, déjà levé).
--
-- 1. chantiers.type_batiment : le TYPE de bâtiment du chantier (maison, immeuble, hôtel, restaurant…), qui choisit sa forme dans
--    la maquette 3D. NULL = déduit du titre et de l'objet du devis (lib/crm/infrastructure.ts) ; une valeur = choisie par l'artisan.
-- 2. chantiers.lat / lng / geocode_le : la position du chantier, tirée de son adresse par la Base Adresse Nationale
--    (api-adresse.data.gouv.fr, service public, appelée par le SERVEUR avec l'adresse seule — jamais le nom du client). Sert à
--    placer la maison sur la carte par rapport à la base de l'artisan (direction et distance comprimée). geocode_le posé même
--    quand l'adresse est introuvable (lat/lng NULL) : on ne redemande pas en boucle. Remis à NULL quand l'adresse change.
-- 3. chantiers.retire_carte_le : le chantier VALIDÉ par l'artisan (ou automatiquement, voir 4) quitte la carte mais reste dans
--    les données (liste des chantiers, fiche, pipeline, factures, chiffres). NULL = sur la carte.
-- 4. crm_reglages : les réglages du CRM par compte. validation_auto = quand toutes les tâches d'un chantier sont cochées, il est
--    validé tout seul (statut terminé, date de fin réelle, retiré de la carte) ; false (défaut) = l'artisan clique « Valider ».
--
-- Écritures : uniquement par les routes serveur (clé de service, après la garde du CRM) — chantiers est déjà en lecture seule
-- pour `authenticated` (0152) ; crm_reglages a RLS SANS politique et aucun droit pour anon/authenticated. Rejouable.

alter table public.chantiers add column if not exists type_batiment text
  check (type_batiment is null or type_batiment in (
    'maison', 'appartement', 'immeuble', 'hotel', 'restaurant', 'commerce', 'bureaux', 'entrepot',
    'ecole', 'sante', 'equipement', 'exterieur', 'agricole'
  ));
alter table public.chantiers add column if not exists lat numeric check (lat is null or lat between -90 and 90);
alter table public.chantiers add column if not exists lng numeric check (lng is null or lng between -180 and 180);
alter table public.chantiers add column if not exists geocode_le timestamptz;
alter table public.chantiers add column if not exists retire_carte_le timestamptz;

comment on column public.chantiers.type_batiment is
  'Type de bâtiment du chantier pour la maquette 3D (NULL = déduit du titre / de l''objet du devis). Écrit par le serveur seul.';
comment on column public.chantiers.lat is 'Latitude tirée de l''adresse (Base Adresse Nationale, appel serveur). NULL = inconnue.';
comment on column public.chantiers.lng is 'Longitude tirée de l''adresse (Base Adresse Nationale, appel serveur). NULL = inconnue.';
comment on column public.chantiers.geocode_le is 'Date de la dernière recherche de position (même infructueuse) ; NULL = à chercher.';
comment on column public.chantiers.retire_carte_le is 'Chantier validé : retiré de la carte du CRM, gardé dans les données. NULL = sur la carte.';

create table if not exists public.crm_reglages (
  artisan_id       uuid primary key references public.artisans(id) on delete cascade,
  validation_auto  boolean not null default false,
  maj_le           timestamptz not null default now()
);
alter table public.crm_reglages enable row level security;
revoke all on public.crm_reglages from anon;
revoke all on public.crm_reglages from authenticated;
comment on table public.crm_reglages is
  'Réglages du CRM par compte. validation_auto : un chantier dont toutes les tâches sont cochées est validé tout seul. RLS sans politique : service_role seul.';
