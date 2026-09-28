-- 0114_contenu.sql — TÉMOIN (fiche 026-204, partie « sql »). Non appliqué à une base réelle par cette fiche : jugé
-- statiquement par contenu-qa.mjs --partie=sql (026-206 applique la vraie migration, en séance Claude Code).
create table if not exists public.contenu_lignes (
  id text primary key,
  suspendue boolean not null default false,
  canaux text[] not null,
  quota_jour integer,
  cree_le timestamptz not null default now()
);

create table if not exists public.contenu_posts (
  id uuid primary key default gen_random_uuid(),
  ligne_id text not null references public.contenu_lignes(id),
  canal text not null,
  texte text not null,
  source text,
  statut text not null default 'brouillon',
  accord_decision_id uuid,
  utm_campagne text,
  code_apport text,
  preuve_publique text,
  cree_le timestamptz not null default now(),
  constraint contenu_posts_statut_check check (statut in ('brouillon', 'en_attente', 'publiable', 'publie', 'refuse')),
  constraint contenu_posts_publiable_exige_accord check (statut not in ('publiable', 'publie') or accord_decision_id is not null)
);

create table if not exists public.contenu_mesures (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.contenu_posts(id),
  echeance text not null check (echeance in ('H+1', 'H+24', 'J+7')),
  valeur numeric,
  disponible boolean not null default false,
  source text not null,
  mesure_le timestamptz not null default now(),
  unique (post_id, echeance)
);

create table if not exists public.contenu_idees (
  id uuid primary key default gen_random_uuid(),
  texte text not null,
  source text not null,
  score_niveau integer,
  cree_le timestamptz not null default now()
);

alter table public.contenu_lignes enable row level security;
alter table public.contenu_posts enable row level security;
alter table public.contenu_mesures enable row level security;
alter table public.contenu_idees enable row level security;

revoke all on public.contenu_lignes, public.contenu_posts, public.contenu_mesures, public.contenu_idees from anon, authenticated;
grant select on public.contenu_lignes, public.contenu_posts, public.contenu_mesures, public.contenu_idees to authenticated;
