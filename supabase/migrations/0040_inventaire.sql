-- v4 §9 — Inventaire & achats.
--
-- Choix assumé : pas de table `chantiers`. Le chantier, chez Presti, c'est le DEVIS
-- accepté — inventer une entité de plus obligerait l'artisan à ressaisir ce qu'il a
-- déjà. Les mouvements de stock se rattachent donc à un devis (et par lui au lead).

create table if not exists public.materiaux (
  id                  uuid primary key default gen_random_uuid(),
  artisan_id          uuid not null references public.artisans(id) on delete cascade,
  nom                 text not null,
  marque              text,
  reference           text,
  categorie           text,
  unite               text not null default 'u',
  code_barres         text,
  fournisseur_prefere text,
  prix_dernier_ht     numeric(12,2),
  prix_moyen_ht       numeric(12,2),
  seuil_alerte        numeric(12,2) not null default 0,
  photo_url           text,
  notes               text,
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now()
);
create index if not exists materiaux_artisan_idx on public.materiaux(artisan_id);
-- Le code-barres identifie un article de façon unique CHEZ CET ARTISAN : c'est ce qui
-- permet au scan de retrouver l'article existant au lieu d'en créer un doublon.
create unique index if not exists materiaux_code_idx
  on public.materiaux(artisan_id, code_barres) where code_barres is not null;
create unique index if not exists materiaux_nom_idx
  on public.materiaux(artisan_id, nom, reference) nulls not distinct;

-- Le stock est réparti par LIEU : un artisan a du matériel à l'atelier et dans son camion,
-- et « il m'en reste combien » n'a de sens que par endroit.
create table if not exists public.stock (
  id           uuid primary key default gen_random_uuid(),
  materiau_id  uuid not null references public.materiaux(id) on delete cascade,
  lieu         text not null default 'atelier',
  quantite     numeric(12,2) not null default 0,
  maj_le       timestamptz not null default now(),
  unique (materiau_id, lieu)
);

-- Chaque variation laisse une trace : sans historique, un inventaire dérive en quelques
-- semaines et l'artisan cesse d'y croire — c'est ainsi que meurent tous ces outils.
create table if not exists public.mouvements_stock (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  materiau_id      uuid not null references public.materiaux(id) on delete cascade,
  type             text not null check (type in ('entree', 'sortie', 'inventaire', 'perte')),
  quantite         numeric(12,2) not null,
  lieu             text not null default 'atelier',
  devis_id         uuid references public.devis(id) on delete set null,
  source           text not null default 'manuel' check (source in ('manuel', 'scan', 'facture', 'devis')),
  cout_unitaire_ht numeric(12,2),
  note             text,
  cree_le          timestamptz not null default now()
);
create index if not exists mouvements_artisan_idx on public.mouvements_stock(artisan_id, cree_le desc);
create index if not exists mouvements_materiau_idx on public.mouvements_stock(materiau_id, cree_le desc);

-- Liste d'achat : ce qu'il faut acheter, agrégé, avec le prix visé.
create table if not exists public.listes_achat (
  id         uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  nom        text not null default 'Liste d achat',
  statut     text not null default 'ouverte' check (statut in ('ouverte', 'commandee', 'recue', 'annulee')),
  devis_id   uuid references public.devis(id) on delete set null,
  cree_le    timestamptz not null default now()
);
create table if not exists public.lignes_achat (
  id                uuid primary key default gen_random_uuid(),
  liste_id          uuid not null references public.listes_achat(id) on delete cascade,
  materiau_id       uuid references public.materiaux(id) on delete set null,
  designation_libre text,
  quantite          numeric(12,2) not null default 1,
  prix_cible_ht     numeric(12,2),
  fournisseur       text,
  achete            boolean not null default false
);
create index if not exists lignes_achat_liste_idx on public.lignes_achat(liste_id);

-- RLS : chacun ne voit que son inventaire. Les tables filles passent par leur parent.
alter table public.materiaux        enable row level security;
alter table public.stock            enable row level security;
alter table public.mouvements_stock enable row level security;
alter table public.listes_achat     enable row level security;
alter table public.lignes_achat     enable row level security;

drop policy if exists "materiaux propres" on public.materiaux;
create policy "materiaux propres" on public.materiaux for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

drop policy if exists "mouvements propres" on public.mouvements_stock;
create policy "mouvements propres" on public.mouvements_stock for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

drop policy if exists "listes propres" on public.listes_achat;
create policy "listes propres" on public.listes_achat for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

drop policy if exists "stock propre" on public.stock;
create policy "stock propre" on public.stock for all
  using (exists (select 1 from public.materiaux m where m.id = stock.materiau_id and m.artisan_id = auth.uid()))
  with check (exists (select 1 from public.materiaux m where m.id = stock.materiau_id and m.artisan_id = auth.uid()));

drop policy if exists "lignes achat propres" on public.lignes_achat;
create policy "lignes achat propres" on public.lignes_achat for all
  using (exists (select 1 from public.listes_achat l where l.id = lignes_achat.liste_id and l.artisan_id = auth.uid()))
  with check (exists (select 1 from public.listes_achat l where l.id = lignes_achat.liste_id and l.artisan_id = auth.uid()));

-- Applique un mouvement ET met à jour le stock dans la MÊME transaction : sans ça, une
-- erreur entre les deux écritures laisse un inventaire faux, et un inventaire faux ne
-- sert plus à rien.
create or replace function public.appliquer_mouvement(
  p_artisan uuid, p_materiau uuid, p_type text, p_quantite numeric,
  p_lieu text default 'atelier', p_devis uuid default null,
  p_source text default 'manuel', p_cout numeric default null, p_note text default null
) returns numeric
language plpgsql security definer set search_path = public as $fn$
declare v_reste numeric;
begin
  if not exists (select 1 from materiaux where id = p_materiau and artisan_id = p_artisan) then
    raise exception 'Materiau introuvable';
  end if;

  insert into mouvements_stock (artisan_id, materiau_id, type, quantite, lieu, devis_id, source, cout_unitaire_ht, note)
  values (p_artisan, p_materiau, p_type, p_quantite, p_lieu, p_devis, p_source, p_cout, p_note);

  insert into stock (materiau_id, lieu, quantite) values (p_materiau, p_lieu, 0)
  on conflict (materiau_id, lieu) do nothing;

  update stock set
    quantite = case
      when p_type = 'inventaire' then p_quantite              -- comptage : on POSE la valeur
      when p_type in ('sortie', 'perte') then quantite - p_quantite
      else quantite + p_quantite
    end,
    maj_le = now()
  where materiau_id = p_materiau and lieu = p_lieu
  returning quantite into v_reste;

  -- Le dernier prix payé sert de référence de chiffrage : on ne le met à jour que sur
  -- une vraie entrée de marchandise.
  if p_type = 'entree' and p_cout is not null then
    update materiaux set prix_dernier_ht = p_cout, maj_le = now() where id = p_materiau;
  end if;

  return v_reste;
end $fn$;
