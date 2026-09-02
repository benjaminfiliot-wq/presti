-- Domaine personnalisé (offre Signature, J9/G2). L'artisan branche son propre domaine
-- (ex: plomberie-martel.fr) sur son site vitrine. Ajouté au projet Vercel via l'API,
-- vérifié automatiquement ; une fois servi, l'URL Presti redirige (301) vers le domaine.
alter table public.artisans add column if not exists domaine text;              -- domaine nu, minuscules (ex: 'mondomaine.fr')
alter table public.artisans add column if not exists domaine_verifie boolean default false; -- DNS pointant + servi

-- Recherche par domaine (middleware multi-tenant : hostname → slug).
create index if not exists artisans_domaine_idx on public.artisans (domaine);
