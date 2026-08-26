-- ============================================================
-- 0003 · Comptes fondateurs (Benjamin + Alexandre)
-- Accès total à l'outil, sans passer par le parcours client :
-- offre "business" débloquée (tous les modèles IA) + badge fondateur.
-- ============================================================

alter table public.artisans
  add column if not exists is_founder boolean not null default false;

-- Débloque l'accès total pour les fondateurs (par email du compte auth).
-- ⚠️ Ajoute l'email d'Alexandre dans la liste dès que son compte est créé.
update public.artisans a
set is_founder = true,
    plan = 'business'
from auth.users u
where a.id = u.id
  and lower(u.email) in (
    'benjaminfiliot@gmail.com'
    -- , 'email-d-alexandre@exemple.com'
  );
