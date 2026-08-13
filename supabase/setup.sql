-- Presti — schéma complet (étapes 1 à 6).
-- À exécuter UNE fois dans Supabase → SQL Editor.

-- 1) Profil artisan
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
alter table public.artisans enable row level security;
drop policy if exists artisan_select_own on public.artisans;
drop policy if exists artisan_insert_own on public.artisans;
drop policy if exists artisan_update_own on public.artisans;
create policy artisan_select_own on public.artisans for select using (auth.uid() = id);
create policy artisan_insert_own on public.artisans for insert with check (auth.uid() = id);
create policy artisan_update_own on public.artisans for update using (auth.uid() = id);

-- 2) Leads (l'insertion publique passe par le backend avec la clé service, qui bypass la RLS)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete cascade,
  nom_prospect text,
  contact text,
  canal text,
  message text,
  statut text default 'nouveau',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.leads enable row level security;
drop policy if exists lead_select_own on public.leads;
drop policy if exists lead_update_own on public.leads;
create policy lead_select_own on public.leads for select using (auth.uid() = artisan_id);
create policy lead_update_own on public.leads for update using (auth.uid() = artisan_id);

-- 3) Messages échangés
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  sens text,   -- 'in' | 'out'
  type text,   -- 'reponse_auto' | 'relance' | 'manuel'
  contenu text,
  sent_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists message_select_own on public.messages;
create policy message_select_own on public.messages for select using (
  exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid())
);

-- 4) Relances planifiées
create table if not exists public.relances (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  planifiee_le timestamptz,
  envoyee boolean default false,
  rang int
);
alter table public.relances enable row level security;
drop policy if exists relance_select_own on public.relances;
create policy relance_select_own on public.relances for select using (
  exists (select 1 from public.leads l where l.id = relances.lead_id and l.artisan_id = auth.uid())
);
