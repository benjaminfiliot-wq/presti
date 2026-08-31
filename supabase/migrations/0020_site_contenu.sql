-- Site vitrine : contenu RÉDIGÉ PAR L'IA (sur-mesure par artisan), stocké pour ne pas
-- régénérer à chaque affichage (coût + latence). Le site rend ce contenu s'il existe,
-- sinon il retombe sur les données brutes du profil. Généré à la demande depuis /profil.
-- Structure : { hero_titre?, hero_accroche?, hero_lede?, apropos?, prestations_intro?,
--               realisations_intro?, cta_titre?, cta_texte?, meta_description? }
-- Additif, idempotent.
alter table public.artisans add column if not exists site_contenu jsonb;
alter table public.artisans add column if not exists site_contenu_le timestamptz;
