-- v4 §7/E1 — Personnalisation avancée du site vitrine.
-- Un seul champ jsonb versionné : typographie, couleurs, formes, rythme, texture, motion.
-- NULL = l'artisan n'a jamais ouvert le mode avancé → le rendu reste celui d'avant.
alter table public.artisans add column if not exists site_style jsonb;

comment on column public.artisans.site_style is
  'Réglages fins du site vitrine (v4 §7/E1). Voir lib/siteStyle.ts : { v, couple, taille, echelle, interlettrage, accent2, fond, rayon, filet, bouton, rythme, largeur, texture, texture_force, motion }. NULL = réglages par défaut.';
