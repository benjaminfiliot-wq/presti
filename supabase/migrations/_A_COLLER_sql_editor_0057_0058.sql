-- À coller dans Supabase → SQL Editor (une seule fois). Contient 0057 (passages_cron) puis 0058 (bornes artisans).

-- 0057 — Trace des passages de cron (prompt v6 §6, alerte « un cron sans passage à l'heure prévue »).
--
-- Le problème : un cron qui ne tourne plus ne prévient personne. Les relances J+2/5/10 cessent,
-- la purge des comptes ne se fait plus, et rien ne le dit — Vercel n'envoie pas d'email quand une
-- tâche planifiée n'a pas été appelée. La seule façon de le savoir est que chaque passage laisse
-- une trace, et qu'une autre tâche vérifie que la trace est récente.
--
-- Une ligne par tâche, écrasée à chaque passage : on ne veut pas l'historique (les journaux
-- Vercel l'ont), on veut « quand est-ce que ça a tourné pour la dernière fois, et avec quel
-- résultat ». Écrit uniquement par le serveur (service_role), comme `limites` (0049).

create table if not exists public.passages_cron (
  nom              text        primary key,
  dernier_passage  timestamptz not null default now(),
  -- Ce que le passage a fait, en clair : relances envoyées, comptes purgés, alertes parties…
  detail           jsonb       not null default '{}'::jsonb,
  -- Vrai si le passage s'est terminé sans erreur. Un passage en erreur laisse quand même sa
  -- trace : « il a tourné mais a échoué » n'est pas la même alerte que « il n'a pas tourné ».
  reussi           boolean     not null default true
);

comment on table public.passages_cron is
  'Dernier passage de chaque tâche planifiée. Lu par /api/cron/alertes pour détecter une tâche qui ne tourne plus. Service_role uniquement.';

alter table public.passages_cron enable row level security;
revoke all on public.passages_cron from public, anon, authenticated;


-- 0058 — Bornes sur les champs libres du profil artisan (audit final, auditeur D, majeur 1.6).
--
-- Le problème : l'onboarding et le profil écrivent `artisans` par PostgREST, sans route serveur
-- entre les deux. Un nom de 371 caractères ou un téléphone « abc<script> » passaient tels quels :
-- <title> de 381 caractères sur le site, h1 sur trente lignes, en-tête de la plateforme
-- illisible sur téléphone. Une borne côté navigateur ne suffit pas (elle se contourne d'un
-- appel direct) : la base doit refuser elle-même.
--
-- Les bornes sont larges (un nom d'entreprise de 120 caractères existe), le téléphone accepte
-- chiffres, espaces, points, tirets, parenthèses et « + » (formats français et internationaux).
-- `not valid` : les lignes existantes ne sont pas rejouées (aucune ne dépasse aujourd'hui —
-- mesuré avant la pose), les nouvelles écritures sont contrôlées immédiatement.

alter table public.artisans
  add constraint artisans_nom_borne check (nom is null or char_length(nom) <= 120) not valid,
  add constraint artisans_tel_public_borne check (tel_public is null or (char_length(tel_public) <= 30 and tel_public ~ '^[0-9 .+()\-]+$')) not valid,
  add constraint artisans_email_public_borne check (email_public is null or char_length(email_public) <= 160) not valid,
  add constraint artisans_ville_borne check (ville is null or char_length(ville) <= 80) not valid,
  add constraint artisans_adresse_borne check (adresse is null or char_length(adresse) <= 200) not valid,
  add constraint artisans_zone_borne check (zone_intervention is null or char_length(zone_intervention) <= 200) not valid,
  add constraint artisans_bio_borne check (bio is null or char_length(bio) <= 2000) not valid,
  add constraint artisans_metier_borne check (metier is null or char_length(metier) <= 60) not valid;

-- Valider maintenant (aucune ligne ne dépasse) : la contrainte devient pleine.
alter table public.artisans validate constraint artisans_nom_borne;
alter table public.artisans validate constraint artisans_tel_public_borne;
alter table public.artisans validate constraint artisans_email_public_borne;
alter table public.artisans validate constraint artisans_ville_borne;
alter table public.artisans validate constraint artisans_adresse_borne;
alter table public.artisans validate constraint artisans_zone_borne;
alter table public.artisans validate constraint artisans_bio_borne;
alter table public.artisans validate constraint artisans_metier_borne;

comment on constraint artisans_nom_borne on public.artisans is
  'Audit final D-1.6 : un nom borné à 120 caractères, sinon <title> et h1 du site deviennent illisibles.';
