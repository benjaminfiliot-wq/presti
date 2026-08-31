-- Connexion plateforme <-> site : intégrer (ou non) le formulaire de contact/chat de la
-- plateforme directement DANS le site vitrine. Activable/désactivable par l'artisan
-- ("enlevé du site et remis"). Par défaut intégré. Additif, idempotent.
alter table public.artisans add column if not exists site_contact_integre boolean default true;
