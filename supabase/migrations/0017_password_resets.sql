-- Réinitialisation de mot de passe MAÎTRISÉE (email envoyé via Resend, domaine vérifié)
-- plutôt que via le SMTP Supabase. On stocke un JETON HASHÉ (jamais en clair), à usage
-- unique et expirant. RLS : aucune policy cliente (service_role only) → pas de fuite.
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  token_hash text not null,     -- sha256(token) : une fuite DB n'expose aucun jeton utilisable
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
alter table public.password_resets enable row level security;
create index if not exists password_resets_token_idx on public.password_resets (token_hash);
create index if not exists password_resets_uid_idx on public.password_resets (uid, created_at desc);
