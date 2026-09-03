-- v4 §8/F2 — Correctif : l'index unique doit être ciblable par un upsert.
--
-- L'index posé en 0038 portait sur `lower(designation)` : un index FONCTIONNEL ne peut
-- pas servir de cible à `on conflict (colonnes)`, donc le ré-import d'un tarif aurait
-- échoué. On repasse sur les colonnes brutes, avec NULLS NOT DISTINCT (PG15) pour que
-- deux lignes sans fournisseur ni référence soient bien considérées comme la même.
drop index if exists public.prix_artisan_unique_idx;
create unique index if not exists prix_artisan_unique_idx
  on public.prix_artisan (artisan_id, designation, fournisseur, reference) nulls not distinct;
