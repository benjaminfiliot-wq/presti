-- 0047 — Système d'explication (sprint J-1 §4 B3) : mémoire des visites guidées.
--
-- `aide_vues` liste ce que l'artisan a déjà vu (ex : 'visite:console'). C'est ce qui fait
-- que la visite guidée se lance à la première ouverture et pas à la seconde, sur tous
-- ses appareils — et qu'il peut la rejouer depuis le panneau « ? » sans que ça la
-- relance partout.
--
-- Choix : un tableau de texte plutôt qu'une table dédiée. La liste tient en quelques
-- entrées, n'est jamais filtrée ni jointe (donc pas d'index), et s'écrit en un seul
-- `update` depuis le navigateur — avec repli localStorage côté client si la base ne
-- répond pas. Une colonne NON sensible : elle n'entre volontairement PAS dans
-- `lock_artisan_privileges()` (0045/0051), l'artisan doit pouvoir l'écrire lui-même.

alter table public.artisans
  add column if not exists aide_vues text[] not null default '{}';

comment on column public.artisans.aide_vues is
  'Repères d''aide déjà vus par l''artisan (ex : visite:console). Écrit par le navigateur via la RLS artisan_update_own ; non sensible, hors du verrou de privilèges.';

-- Garde-fou de taille : la colonne est écrivable depuis le navigateur, elle ne doit pas
-- pouvoir servir de stockage libre (schema-constraints). 64 repères de 60 caractères, c'est
-- déjà dix fois ce que le produit utilisera.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artisans_aide_vues_taille') then
    alter table public.artisans
      add constraint artisans_aide_vues_taille
      check (cardinality(aide_vues) <= 64 and length(array_to_string(aide_vues, ',')) <= 4000);
  end if;
end $$;
