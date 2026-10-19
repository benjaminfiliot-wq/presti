-- 0164 · CRM : le LIEN D'AGENDA privé de l'artisan (plan plans/crm-idees-twenty-1810.md, n°6) — « Abonner mon agenda » : Google
-- Agenda, l'iPhone ou Outlook relisent un flux ICS (chantiers et rendez-vous) à une adresse secrète, sans connexion ni OAuth.
-- Écrite le 18/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord, puis application, puis les contrôles du bas, puis scripts/crm-lot3-qa.mjs.
-- Idempotente et additive : une table neuve, rien d'existant n'est modifié.
--
-- 1 ─ crm_agenda : UN lien par compte. Seule l'EMPREINTE du jeton est gardée (SHA-256, comme les liens de rendez-vous) : le jeton
--     lui-même n'est montré qu'une fois, à sa création ; une base copiée ne donne aucun lien utilisable. « Révoquer » supprime la
--     ligne ; « Nouveau lien » la remplace (l'ancien lien cesse aussitôt de répondre). `dernier_acces_le` dit à l'artisan si un agenda
--     lit encore son lien.
-- 2 ─ Fermée à tous les rôles du navigateur : RLS active SANS politique, et aucun droit pour `anon` ni `authenticated`. Seules les routes
--     (clé de service) la lisent : /api/crm/agenda (gardée : session, offre Signature) et la route publique app/agenda/[jeton] (qui
--     cherche l'empreinte, limite le débit et revérifie l'offre du compte à chaque lecture).

create table if not exists public.crm_agenda (
  artisan_id        uuid primary key references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);

alter table public.crm_agenda enable row level security;
revoke all on public.crm_agenda from anon;
revoke all on public.crm_agenda from authenticated;

-- Contrôles (résultats attendus entre crochets) :
-- select relrowsecurity from pg_class where oid = 'public.crm_agenda'::regclass;   -- [true]
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'crm_agenda';   -- [0]
-- select has_table_privilege('anon', 'public.crm_agenda', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.crm_agenda', 'select');   -- [false]
