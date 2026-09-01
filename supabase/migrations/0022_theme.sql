-- Thème / DNA visuelle choisie par l'artisan pour son site ET sa plateforme.
-- 'atelier' (crème éditorial, défaut) | 'nuit' (sombre cinématique) | 'epure' (blanc minimal).
alter table public.artisans add column if not exists theme text not null default 'atelier';
