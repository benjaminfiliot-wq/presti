-- Presti — Étape 1 : table profil artisan (base pour l'étape 2)
-- À exécuter dans Supabase → SQL Editor.

create table if not exists public.artisans (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nom text,
  metier text,
  slug text unique,
  ton_style text,
  tel text,
  plan text default 'gratuit',
  created_at timestamptz default now()
);

-- Sécurité : chaque artisan ne voit/modifie que SON profil
alter table public.artisans enable row level security;

create policy "artisan_select_own" on public.artisans
  for select using (auth.uid() = id);

create policy "artisan_insert_own" on public.artisans
  for insert with check (auth.uid() = id);

create policy "artisan_update_own" on public.artisans
  for update using (auth.uid() = id);
