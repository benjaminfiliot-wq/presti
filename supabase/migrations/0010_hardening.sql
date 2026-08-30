-- Durcissement (audit sécurité) — idempotent, sûr à rejouer sur la base existante.

-- 1) Consolidation leads/messages/relances DANS une migration numérotée (MINEUR-1) :
--    garantit que RLS est toujours présente même si la base est reconstruite à partir
--    des seules migrations (avant, ces tables n'existaient que dans setup.sql).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete cascade,
  nom_prospect text, contact text, canal text, message text,
  statut text default 'nouveau',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.leads enable row level security;
drop policy if exists lead_select_own on public.leads;
drop policy if exists lead_update_own on public.leads;
create policy lead_select_own on public.leads for select using (auth.uid() = artisan_id);
create policy lead_update_own on public.leads for update using (auth.uid() = artisan_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  sens text, type text, contenu text, sent_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists message_select_own on public.messages;
create policy message_select_own on public.messages for select using (
  exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid())
);

create table if not exists public.relances (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  planifiee_le timestamptz, envoyee boolean default false, rang int
);
alter table public.relances enable row level security;
drop policy if exists relance_select_own on public.relances;
create policy relance_select_own on public.relances for select using (
  exists (select 1 from public.leads l where l.id = relances.lead_id and l.artisan_id = auth.uid())
);

-- 2) Rate-limiting par IP de la route publique /api/leads : on stocke l'IP demandeuse
--    pour plafonner le flood/relais email anonyme (aucune policy select cliente → non lisible par les artisans).
alter table public.leads add column if not exists ip text;
create index if not exists leads_ip_created_idx on public.leads (ip, created_at);

-- 3) Défense en profondeur : is_founder() ne doit être exécutable que par les utilisateurs connectés.
revoke execute on function public.is_founder() from public, anon;
grant execute on function public.is_founder() to authenticated;
