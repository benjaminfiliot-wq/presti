-- Personnalisation de la plateforme : couleur d'accent choisie par l'artisan.
alter table public.artisans add column if not exists accent text default '#D97757';
