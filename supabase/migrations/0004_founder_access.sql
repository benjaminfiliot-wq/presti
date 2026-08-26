-- ============================================================
-- 0004 · Accès fondateur "voir tout" (poste de contrôle)
-- Permet aux fondateurs de lire/gérer TOUTES les données de la
-- plateforme (devis, lignes, demandes) — pas seulement les leurs.
-- Utilise une fonction SECURITY DEFINER pour éviter la récursion RLS.
-- ============================================================

create or replace function public.is_founder()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select is_founder from public.artisans where id = auth.uid()), false)
$$;

-- DEVIS
drop policy if exists founders_all_devis on public.devis;
create policy founders_all_devis on public.devis for all
  using (public.is_founder()) with check (public.is_founder());

-- LIGNES DE DEVIS
drop policy if exists founders_all_devis_lignes on public.devis_lignes;
create policy founders_all_devis_lignes on public.devis_lignes for all
  using (public.is_founder()) with check (public.is_founder());

-- DEMANDES
drop policy if exists founders_all_leads on public.leads;
create policy founders_all_leads on public.leads for all
  using (public.is_founder()) with check (public.is_founder());

-- PROFILS ARTISANS (lecture de tous par les fondateurs)
drop policy if exists founders_read_artisans on public.artisans;
create policy founders_read_artisans on public.artisans for select
  using (public.is_founder());
