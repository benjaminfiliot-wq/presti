-- SEO du site vitrine : l'artisan peut retirer son site de l'indexation Google.
-- Défaut = true → un site PUBLIÉ (site_active) est indexable, sauf choix contraire.
alter table public.artisans add column if not exists site_seo boolean not null default true;
