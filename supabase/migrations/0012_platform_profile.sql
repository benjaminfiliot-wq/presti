-- Plateforme de communication artisan — fondation (étape 1) : enrichir le profil public.
-- Additif, idempotent, sans risque. La page /l/[slug] deviendra la "plateforme" de l'artisan.
alter table public.artisans add column if not exists bio text;              -- présentation courte
alter table public.artisans add column if not exists services jsonb default '[]'::jsonb; -- [{nom, description}]
alter table public.artisans add column if not exists zone_intervention text; -- ex. "La Rochelle et 30 km autour"
alter table public.artisans add column if not exists photo_url text;         -- photo/bannière (data URL, comme le logo)
alter table public.artisans add column if not exists horaires text;          -- ex. "Lun-Ven 8h-18h, urgences 7j/7"
alter table public.artisans add column if not exists plateforme_active boolean default true; -- l'artisan peut couper sa page

-- Les leads (= conversations) tracent déjà l'échange ; on ajoute juste le canal préféré de réponse.
alter table public.leads add column if not exists canal_reponse text default 'auto'; -- auto | email | plateforme
