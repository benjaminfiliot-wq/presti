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
