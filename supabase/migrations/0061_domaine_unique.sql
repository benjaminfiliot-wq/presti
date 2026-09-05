-- 0061 — Un domaine perso n'appartient qu'à un artisan (suite domaine-perso-e2e, 05/09).
--
-- 0029 avait créé un index simple sur artisans.domaine : deux comptes pouvaient donc porter le
-- même domaine, et le middleware servait le premier venu. Avec un index UNIQUE (insensible à la
-- casse), la base refuse le second — et /api/domain le refuse avant même d'appeler Vercel.
create unique index if not exists artisans_domaine_unique_idx
  on public.artisans (lower(domaine)) where domaine is not null;
comment on index public.artisans_domaine_unique_idx is
  'Un domaine perso par artisan. Posé le 05/09/2026 après la suite domaine-perso-e2e.';
