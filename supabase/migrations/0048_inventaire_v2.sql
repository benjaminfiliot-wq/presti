-- Sprint J-1 §8 F1 + F2 — Inventaire v2 : fiche matériau complète, fournisseurs de
-- l'artisan, historique des prix vus.
--
-- Vocabulaire : lib/inventaire/CONTEXT.md (matériau / fournisseur / observation de prix).
--
-- Règle juridique (plan §8, art. L342-1 CPI) : une OBSERVATION DE PRIX appartient à
-- l'artisan qui l'a demandée. Aucune lecture croisée, aucune agrégation : la RLS de
-- `prix_observations` est par artisan, et il n'existe aucune vue ni fonction qui la
-- contourne. On ne constitue pas de base de prix — on garde la trace de ce que CET
-- artisan a vu, pour lui seul.

-- ── F2. Mes fournisseurs ─────────────────────────────────────────────────────────
create table if not exists public.fournisseurs (
  id             uuid primary key default gen_random_uuid(),
  artisan_id     uuid not null references public.artisans(id) on delete cascade,
  nom            text not null,
  url            text,
  type           text not null default 'negoce' check (type in ('negoce', 'gsb', 'fabricant', 'marketplace')),
  numero_compte  text,
  remise_pct     numeric(5,2) check (remise_pct is null or (remise_pct >= 0 and remise_pct <= 100)),
  delai_jours    smallint check (delai_jours is null or delai_jours >= 0),
  agence         text,
  contact        text,
  -- Ordre de préférence : c'est lui qui trie les résultats de recherche à prix égal.
  ordre          smallint not null default 0,
  -- Le site affiche-t-il ses prix sans compte ? Vérifié par curl (docs/fournisseurs.md),
  -- jamais supposé. À false, l'assistant ne peut voir que le catalogue.
  prix_publics   boolean not null default false,
  note_acces     text,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);
create index if not exists fournisseurs_artisan_ordre_idx on public.fournisseurs(artisan_id, ordre);
-- Un même fournisseur une seule fois chez un artisan : c'est ce qui rend la « liste de
-- départ » idempotente même si deux clics partent en même temps.
create unique index if not exists fournisseurs_artisan_nom_idx on public.fournisseurs(artisan_id, lower(nom));

-- ── F1. Fiche matériau complète ──────────────────────────────────────────────────
-- Colonnes déjà présentes (0040) : nom, marque, reference, categorie, unite, code_barres,
-- fournisseur_prefere (texte libre, conservé pour l'ancien écran), prix_dernier_ht (dernier
-- prix PAYÉ, posé par les mouvements d'entrée), prix_moyen_ht, seuil_alerte, photo_url, notes.
alter table public.materiaux
  add column if not exists reference_fabricant   text,
  add column if not exists reference_fournisseur text,
  add column if not exists sous_categorie        text,
  add column if not exists conditionnement       text,
  add column if not exists fiche_technique_url   text,
  add column if not exists fournisseur_id        uuid references public.fournisseurs(id) on delete set null,
  -- Prix d'achat : ce que l'artisan paie réellement (négocié). Distinct du dernier prix
  -- payé (mouvement) et du prix vu (observation publique).
  add column if not exists prix_achat_ht         numeric(12,2) check (prix_achat_ht is null or prix_achat_ht >= 0),
  -- Prix vu : copie de la DERNIÈRE observation, pour lister sans jointure. L'historique
  -- complet est dans prix_observations.
  add column if not exists prix_vu_ht            numeric(12,2) check (prix_vu_ht is null or prix_vu_ht >= 0),
  add column if not exists prix_vu_le            timestamptz,
  add column if not exists prix_vu_url           text,
  add column if not exists prix_vu_source        text check (prix_vu_source is null or prix_vu_source in ('recherche_ia', 'saisie', 'facture')),
  add column if not exists disponibilite_vue     text,
  add column if not exists tags                  text[] not null default '{}',
  -- Chantiers = devis acceptés (choix 0040 : pas de table chantiers). Pas de FK sur un
  -- tableau ; l'API vérifie que chaque devis appartient à l'artisan.
  add column if not exists chantiers_lies        uuid[] not null default '{}';
create index if not exists materiaux_fournisseur_idx on public.materiaux(fournisseur_id) where fournisseur_id is not null;
create index if not exists materiaux_categorie_idx on public.materiaux(artisan_id, categorie);

-- ── Historique des prix vus ──────────────────────────────────────────────────────
create table if not exists public.prix_observations (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  materiau_id      uuid references public.materiaux(id) on delete cascade,
  fournisseur_id   uuid references public.fournisseurs(id) on delete set null,
  -- Nom du fournisseur figé au moment de l'observation : si la fiche fournisseur est
  -- supprimée, l'observation garde son sens.
  fournisseur_nom  text,
  designation_vue  text,
  prix_ht          numeric(12,2) check (prix_ht is null or prix_ht >= 0),
  prix_ttc         numeric(12,2) check (prix_ttc is null or prix_ttc >= 0),
  unite            text,
  url              text,
  source           text not null check (source in ('recherche_ia', 'saisie', 'facture')),
  -- Ce que l'assistant (ou l'artisan) a VU, cité — jamais reformulé (1-2 lignes).
  extrait          text,
  disponibilite    text,
  vu_le            timestamptz not null default now(),
  cree_le          timestamptz not null default now()
);
create index if not exists prix_obs_materiau_idx on public.prix_observations(materiau_id, vu_le desc);
create index if not exists prix_obs_artisan_idx on public.prix_observations(artisan_id, vu_le desc);

-- ── RLS : chacun ne voit que le sien. Aucune lecture croisée. ────────────────────
alter table public.fournisseurs      enable row level security;
alter table public.prix_observations enable row level security;

drop policy if exists "fournisseurs propres" on public.fournisseurs;
create policy "fournisseurs propres" on public.fournisseurs for all
  to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);

drop policy if exists "observations propres" on public.prix_observations;
create policy "observations propres" on public.prix_observations for all
  to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);

-- Cohérence : une observation ne peut pointer que vers un matériau ou un fournisseur du
-- même artisan (la RLS protège la lecture, ceci protège l'écriture — y compris via la
-- clé de service, que les routes utilisent).
create or replace function public.verifier_observation_artisan()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  if new.materiau_id is not null and not exists (
    select 1 from materiaux m where m.id = new.materiau_id and m.artisan_id = new.artisan_id
  ) then raise exception 'Materiau d un autre artisan'; end if;
  if new.fournisseur_id is not null and not exists (
    select 1 from fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id
  ) then raise exception 'Fournisseur d un autre artisan'; end if;
  return new;
end $fn$;
drop trigger if exists trg_observation_artisan on public.prix_observations;
create trigger trg_observation_artisan
  before insert or update on public.prix_observations
  for each row execute function public.verifier_observation_artisan();

-- Même garde sur materiaux.fournisseur_id.
create or replace function public.verifier_materiau_fournisseur()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  if new.fournisseur_id is not null and not exists (
    select 1 from fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id
  ) then raise exception 'Fournisseur d un autre artisan'; end if;
  return new;
end $fn$;
drop trigger if exists trg_materiau_fournisseur on public.materiaux;
create trigger trg_materiau_fournisseur
  before insert or update of fournisseur_id on public.materiaux
  for each row execute function public.verifier_materiau_fournisseur();

comment on table public.prix_observations is
  'Prix vus par UN artisan, pour lui seul (art. L342-1 CPI : aucune base mutualisee). RLS par artisan, jamais de lecture croisee.';
comment on table public.fournisseurs is
  'Fournisseurs designes par l artisan ; leur liste borne la recherche de prix (section 8 F3).';
