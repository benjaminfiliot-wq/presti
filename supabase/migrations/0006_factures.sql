-- Presti — Facturation. Table factures + lignes (miroir des devis).
-- Numérotation via next_numero(p_artisan,'facture') qui existe déjà (compteur_facture).

-- is_founder() (idempotent — au cas où 0004 n'aurait pas été appliquée)
create or replace function public.is_founder()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_founder from public.artisans where id = auth.uid()), false)
$$;

create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete cascade,
  devis_id uuid references public.devis(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  numero text,
  objet text,
  statut text default 'emise',        -- emise | payee | annulee
  date_emission date default current_date,
  date_echeance date,
  remise_pct numeric default 0,
  acompte_pct numeric default 0,
  conditions text,
  notes text,
  client_nom text, client_email text, client_adresse text,
  total_ht numeric default 0, total_tva numeric default 0, total_ttc numeric default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.factures enable row level security;
drop policy if exists factures_all_own on public.factures;
create policy factures_all_own on public.factures for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);
drop policy if exists founders_all_factures on public.factures;
create policy founders_all_factures on public.factures for all
  using (public.is_founder()) with check (public.is_founder());

create table if not exists public.factures_lignes (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid references public.factures(id) on delete cascade,
  ordre int default 0,
  designation text,
  quantite numeric default 1,
  unite text default 'u',
  prix_unitaire_ht numeric default 0,
  tva_taux numeric default 20
);
alter table public.factures_lignes enable row level security;
drop policy if exists factures_lignes_own on public.factures_lignes;
create policy factures_lignes_own on public.factures_lignes for all
  using (exists (select 1 from public.factures f where f.id = factures_lignes.facture_id and f.artisan_id = auth.uid()))
  with check (exists (select 1 from public.factures f where f.id = factures_lignes.facture_id and f.artisan_id = auth.uid()));
drop policy if exists founders_all_factures_lignes on public.factures_lignes;
create policy founders_all_factures_lignes on public.factures_lignes for all
  using (public.is_founder()) with check (public.is_founder());
