-- Paires « avant / après » (offre Signature, J9/S2). L'artisan téléverse, par pièce,
-- une photo AVANT (brut) et une photo APRÈS (fini) ; le site les révèle en 3D au curseur.
-- Tableau d'objets {avant, apres, titre} (URLs du bucket artisan-media) ou NULL.
alter table public.artisans add column if not exists avant_apres jsonb;
