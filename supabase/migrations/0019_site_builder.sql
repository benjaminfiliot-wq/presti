-- Constructeur de site web (3 niveaux) — distinct de la plateforme de contact /l/[slug].
-- Le site vitrine complet de l'artisan, généré depuis son profil, à /site/[slug].
--  • site_tier : 1 = Essentiel, 2 = Pro, 3 = Signature (niveau cinématique, "niveau vidéos")
--  • site_active : le site est-il publié (dernier palier d'abonnement, sur demande)
-- Additif, idempotent.
alter table public.artisans add column if not exists site_tier smallint default 3;
alter table public.artisans add column if not exists site_active boolean default false;
