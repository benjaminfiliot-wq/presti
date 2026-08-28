-- Logo de l'artisan (data URL base64, redimensionné côté client → petit).
-- Stocké directement dans le profil : le PDF l'intègre sans fetch réseau, l'app l'affiche.
alter table public.artisans add column if not exists logo_url text;
