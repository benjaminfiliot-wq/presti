-- Crash reporting self-hosté (point #15 des 20 pré-lancement) : on capture les erreurs
-- (rendu React côté client + erreurs serveur volontairement rapportées) dans une table,
-- lisible seulement côté serveur (service_role) et surfacée dans le poste de contrôle.
-- Additif, idempotent.
create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  uid uuid,                        -- utilisateur si connu (nullable)
  contexte text,                   -- ex. 'global-error', 'api/devis'
  message text,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.app_errors enable row level security;
-- Aucune policy cliente : non lisible/écrivable par anon/authenticated. Seul le
-- service_role (routes serveur) y accède → pas de fuite, pas d'abus d'écriture directe.
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
