-- A/B du formulaire plateforme (J8, décision Benj = tester en A/B avant bascule).
-- Variante A = formulaire complet (nom+contact+besoin). Variante B = « 1 champ » (besoin d'abord,
-- coordonnées demandées APRÈS la 1re réponse IA). On mesure le taux de complétion (M8).

-- Variante servie au lead (pour corréler complétion et qualité par bras).
alter table public.leads add column if not exists ab_variant text; -- 'A' | 'B' | NULL

-- Événements ANONYMES d'entonnoir (aucune PII) : view / lead / contact, par variante.
-- Écriture réservée au serveur (service_role) via /api/plat-event ; RLS active sans policy.
create table if not exists public.plat_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  variant text,
  event text not null,        -- 'view' | 'lead' | 'contact'
  created_at timestamptz default now()
);
alter table public.plat_events enable row level security;
create index if not exists plat_events_slug_idx on public.plat_events (slug, created_at);
