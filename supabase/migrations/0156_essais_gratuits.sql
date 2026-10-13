-- 0156 · Registre des essais gratuits sans carte : public.essais_gratuits.
-- Écrite le 13/10/2026, NON APPLIQUÉE. À appliquer par Benj (ou par Claude Code, apply_migration) après l'essai à sec ci-dessous.
--
-- Décision de Benj (13/10) : les abonnements payants s'essaient gratuitement et SANS CARTE (Essentiel 7 jours, Studio 14,
-- Signature 21). Un seul essai par compte. Cette table est la mémoire de « qui a déjà eu son essai », pour qu'un compte
-- recréé avec la même boîte mail ne rouvre pas un essai : une ligne par ADRESSE NORMALISÉE (minuscules, sans « +étiquette »,
-- sans points Gmail — lib/essaiGratuit.ts normaliserEmail), stockée sous forme d'EMPREINTE (SHA-256 précédé d’un préfixe fixe)
-- et non en clair : on retient qu'une boîte a eu son essai, pas laquelle. Pas de clé étrangère vers artisans : la ligne doit
-- SURVIVRE à la suppression du compte (c'est tout son but).
--
-- Accès : service_role seulement (RLS activée, aucune policy, droits retirés à anon et authenticated). Le code lit et écrit avec
-- supabaseAdmin (lib/essaiGratuitServeur.ts).
--
-- Déploiement : le code PEUT PARTIR AVANT l'application. Tant que la table est absente, evaluerEssai ignore le registre
-- (PGRST205 / 42P01) et ne s'appuie que sur Stripe (le client du compte et tout client de même e-mail qui a déjà eu un
-- abonnement) ; marquerEssai ne fait rien. Une fois appliquée, plus rien à faire.
--
-- ESSAI À SEC (avant d'appliquer), dans l'éditeur SQL : tout le bloc, qui finit par une exception volontaire (rien ne reste) :
--   do $essai$
--   declare n integer; refus boolean := false;
--   begin
--     create table public.essais_gratuits (email_hash text primary key, artisan_id uuid, plan text not null, jours integer not null check (jours > 0),
--       stripe_customer_id text, stripe_subscription_id text, debut timestamptz not null default now(), fin timestamptz);
--     insert into public.essais_gratuits (email_hash, plan, jours) values ('h1', 'essentiel', 7);
--     begin insert into public.essais_gratuits (email_hash, plan, jours) values ('h1', 'studio', 14); exception when unique_violation then refus := true; end;
--     select count(*) into n from public.essais_gratuits;
--     raise notice 'une ligne par e-mail : % ligne(s), doublon refusé : % (attendu : 1 et true)', n, refus;
--     raise exception 'essai à sec terminé : tout est annulé';
--   end $essai$;
--   [une NOTICE conforme, puis l'erreur « essai à sec terminé » : rien n'a été écrit]
--
-- REQUÊTES DE CONTRÔLE, APRÈS application (attendu entre crochets) :
--   select c.relname, c.relrowsecurity,
--          has_table_privilege('anon', c.oid, 'select') as anon,
--          has_table_privilege('authenticated', c.oid, 'select') as auth,
--          has_table_privilege('service_role', c.oid, 'select') as service
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relname = 'essais_gratuits';
--     [1 ligne : relrowsecurity = true, anon = false, auth = false, service = true]
--   select count(*) from public.essais_gratuits;   [0 tant qu'aucun essai n'a commencé]

create table if not exists public.essais_gratuits (
  email_hash text primary key,
  artisan_id uuid,
  plan text not null,
  jours integer not null check (jours > 0),
  stripe_customer_id text,
  stripe_subscription_id text,
  debut timestamptz not null default now(),
  fin timestamptz
);

create index if not exists essais_gratuits_artisan_idx on public.essais_gratuits (artisan_id);

alter table public.essais_gratuits enable row level security;

revoke all on public.essais_gratuits from public, anon, authenticated;
grant select, insert, update, delete on public.essais_gratuits to service_role;
