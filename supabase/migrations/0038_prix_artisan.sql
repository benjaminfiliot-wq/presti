-- v4 §8/F2 — La bibliothèque de prix DE L'ARTISAN.
--
-- Le prix pertinent n'est pas « le prix du marché », c'est le prix négocié de cet
-- artisan chez son fournisseur. C'est ce qu'aucun concurrent ne peut deviner et ce
-- que l'artisan possède déjà. `postes_types` reste ce qu'elle est : des ordres de
-- grandeur génériques par métier, à présenter comme tels et jamais comme ses prix.

create table if not exists public.prix_artisan (
  id            uuid primary key default gen_random_uuid(),
  artisan_id    uuid not null references public.artisans(id) on delete cascade,
  designation   text not null,
  unite         text not null default 'u',
  prix_ht       numeric(12,2) not null check (prix_ht >= 0),
  tva_taux      numeric(4,1) not null default 10,
  fournisseur   text,
  reference     text,                        -- référence fournisseur (pour retrouver la ligne)
  source        text not null default 'saisie'
                check (source in ('saisie', 'import', 'facture', 'devis_valide')),
  source_detail text,                        -- nom du fichier, n° de facture… : la traçabilité
  date_prix     date not null default current_date,
  actif         boolean not null default true,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);

create index if not exists prix_artisan_artisan_idx on public.prix_artisan(artisan_id, actif);
-- Recherche par libellé, insensible à la casse et aux accents (« Câble » ≈ « cable »).
create index if not exists prix_artisan_design_idx on public.prix_artisan using gin (to_tsvector('french', designation));
-- Un même article, chez un même fournisseur, ne doit exister qu'une fois : un ré-import
-- met à jour la ligne au lieu d'empiler des doublons.
create unique index if not exists prix_artisan_unique_idx
  on public.prix_artisan(artisan_id, lower(designation), coalesce(lower(fournisseur), ''), coalesce(lower(reference), ''));

alter table public.prix_artisan enable row level security;
drop policy if exists "prix_artisan lecture propre" on public.prix_artisan;
create policy "prix_artisan lecture propre" on public.prix_artisan for select using (auth.uid() = artisan_id);
drop policy if exists "prix_artisan ecriture propre" on public.prix_artisan;
create policy "prix_artisan ecriture propre" on public.prix_artisan for all using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

-- Provenance du prix, ligne par ligne : l'artisan doit pouvoir voir d'où sort chaque
-- chiffre de son devis (v4 §8/F4).
alter table public.devis_lignes add column if not exists source_prix text;
comment on column public.devis_lignes.source_prix is
  'D''où vient ce prix : "vos tarifs · <fournisseur> · <date>", "ordre de grandeur du marché" ou "estimation". Jamais un nom de grossiste dont le prix ne vient pas réellement (v4 §8/F4).';
