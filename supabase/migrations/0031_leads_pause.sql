-- Mode « pause » des demandes (J8·§6, anti-abus / disponibilité). L'artisan suspend l'accueil
-- de nouvelles demandes (congés, surcharge). Les leads sont TOUJOURS enregistrés (rien perdu),
-- mais aucune réponse IA ni email ne part tant que c'est en pause ; la page l'annonce sobrement.
alter table public.artisans add column if not exists leads_pause boolean default false;
