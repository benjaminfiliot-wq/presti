-- Comptes CLIENTS de la plateforme (v4 §6). Totalement séparés des comptes artisans :
-- ils ne vivent PAS dans auth.users (sinon un client pourrait atterrir dans la console).
-- Session maison : cookie httpOnly opaque + ligne révocable en base → la déconnexion
-- invalide RÉELLEMENT côté serveur (§D4), pas seulement dans le navigateur.

-- Un compte est SCOPÉ PAR ARTISAN : le même particulier chez deux artisans = deux comptes
-- étanches, aucune donnée croisée.
create table if not exists public.clients_plateforme (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  email text not null,
  nom text,
  tel text,
  adresse_chantier text,
  created_at timestamptz default now(),
  derniere_connexion timestamptz,
  supprime_le timestamptz,
  unique (artisan_id, email)
);
create index if not exists clients_plateforme_artisan_idx on public.clients_plateforme (artisan_id);

-- Liens magiques (usage unique, courte durée). On ne stocke QUE l'empreinte du jeton.
create table if not exists public.clients_liens (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expire_le timestamptz not null,
  utilise_le timestamptz,
  ip text,
  cree_le timestamptz default now()
);
create index if not exists clients_liens_expire_idx on public.clients_liens (expire_le);

-- Sessions client : le cookie porte un jeton opaque, la base son empreinte.
create table if not exists public.clients_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients_plateforme(id) on delete cascade,
  token_hash text not null unique,
  cree_le timestamptz default now(),
  expire_le timestamptz not null,
  revoque_le timestamptz,          -- révocation SERVEUR à la déconnexion
  ip text, user_agent text
);
create index if not exists clients_sessions_client_idx on public.clients_sessions (client_id);

-- Rattacher une conversation à un compte client (le fil anonyme se rattache après connexion).
alter table public.leads add column if not exists client_plateforme_id uuid references public.clients_plateforme(id) on delete set null;
create index if not exists leads_client_plateforme_idx on public.leads (client_plateforme_id);

-- RLS : ces tables ne sont JAMAIS lues directement par un navigateur. Tout passe par les
-- routes serveur (service_role) qui vérifient la session. RLS active sans policy = verrouillé.
alter table public.clients_plateforme enable row level security;
alter table public.clients_liens enable row level security;
alter table public.clients_sessions enable row level security;

-- Seule exception : l'artisan peut voir SES clients depuis sa console.
drop policy if exists "clients_plateforme_artisan_read" on public.clients_plateforme;
create policy "clients_plateforme_artisan_read" on public.clients_plateforme for select to authenticated
  using (artisan_id = auth.uid());
