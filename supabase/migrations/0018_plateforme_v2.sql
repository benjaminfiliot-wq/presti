-- Plateforme v2 : rendre la page /l/[slug] beaucoup plus riche et personnalisable.
--  • realisations : portfolio par IMAGE (montrer ce qu'on fait, par spécialité)
--  • reseaux : liens réseaux/contacts (instagram, facebook, tiktok, linkedin, whatsapp, site, google…)
--  • tel_public / email_public : coordonnées affichées sur la plateforme (l'artisan choisit)
--  • reponse_auto : l'IA répond automatiquement (true) OU l'artisan répond lui-même (false)
-- Additif, idempotent.
alter table public.artisans add column if not exists realisations jsonb default '[]'::jsonb; -- [{image, titre, specialite}]
alter table public.artisans add column if not exists reseaux jsonb default '{}'::jsonb;       -- {instagram, facebook, tiktok, linkedin, whatsapp, site, google}
alter table public.artisans add column if not exists tel_public text;
alter table public.artisans add column if not exists email_public text;
alter table public.artisans add column if not exists reponse_auto boolean default true;
