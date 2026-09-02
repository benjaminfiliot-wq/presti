-- Composition du site vitrine pilotée par les données (sections réordonnables / activables).
-- NULL = composition par défaut dérivée du niveau (aucun site existant modifié).
alter table public.artisans add column if not exists site_layout jsonb;
