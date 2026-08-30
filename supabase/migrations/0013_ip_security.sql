-- Système de sécurité anti-hacker : bannissement d'IP + journal d'abus (auto-ban).
-- Accès uniquement via le serveur (service_role) et le poste de contrôle fondateur — aucune policy cliente.

create table if not exists public.ip_bans (
  ip text primary key,
  raison text,
  auto boolean default false,          -- true = banni automatiquement par le système
  created_at timestamptz default now(),
  expires_le timestamptz               -- null = permanent
);
alter table public.ip_bans enable row level security;
-- (pas de policy : anon/authenticated n'y accèdent jamais ; le serveur utilise service_role)

-- Journal d'abus (fenêtre glissante) qui alimente l'auto-ban.
create table if not exists public.ip_abus (
  id uuid primary key default gen_random_uuid(),
  ip text,
  raison text,
  at timestamptz default now()
);
alter table public.ip_abus enable row level security;
create index if not exists ip_abus_ip_at_idx on public.ip_abus (ip, at);
create index if not exists ip_bans_expires_idx on public.ip_bans (expires_le);
