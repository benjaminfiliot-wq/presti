-- 0138 — La garde de session descend dans la base (audit d'attaque du 11/10/2026, constat E1).
--
-- Le défaut : la révocation des sessions (0042), la double authentification et le code par email (0063) ne sont
-- contrôlés que par les routes de Presti (lib/authArtisan.ts). Or le navigateur lit et écrit aussi directement par
-- PostgREST avec le jeton de l'artisan, et la clé anonyme comme l'API GoTrue sont publiques : un mot de passe volé
-- suffisait à obtenir un jeton « mot de passe seul » et à lire tout le compte par PostgREST, sans code, sans second
-- facteur, et même après « se déconnecter partout ». La parade documentée par Supabase : une politique RESTRICTIVE,
-- combinée en ET avec les politiques existantes, sur chaque table protégée.
--
-- Ce qu'un jeton `authenticated` doit désormais prouver, sur toutes les tables à RLS du schéma public :
--   1. ne pas être antérieur à `artisans.sessions_invalides_avant` (révocation réelle, 0042) ;
--   2. être `aal2` si le compte a une application d'authentification vérifiée ;
--   3. si sa session n'a prouvé que le mot de passe (amr = password seul), figurer dans `sessions_verifiees`
--      (code email, appareil de confiance ou service) — SEULEMENT pour un compte qui a déjà passé le code une fois
--      (`connexion_verifiee_le` non nul). Un compte tout neuf garde sa session d'inscription : sans cette réserve,
--      selon le réglage « confirmer l'email » de Supabase, l'écran de premiers pas (upsert direct sur `artisans`)
--      serait refusé. Un compte neuf n'a encore rien à voler, et ses routes exigent déjà le code.
--      Les sessions ouvertes par lien (magic link, récupération de mot de passe, confirmation) portent une autre
--      méthode que « password » : elles ont prouvé la boîte mail, elles passent.
--   4. pour ÉCRIRE (insert, update, delete) : ne pas être suspendu (`suspensions` sans `levee_le`, 0068). La lecture
--      reste ouverte au titulaire : ses données sont intactes et c'est l'accès aux routes qui est coupé ; refuser aussi
--      la lecture enverrait le compte suspendu vers l'écran d'inscription, faute de profil lisible.
--
-- Ne change rien pour `anon` (pages publiques) ni pour la clé service (routes serveur, crons) : la politique ne vise
-- que le rôle `authenticated`, et la clé service ne passe pas par la RLS.
-- ⚠️ Le code par email (drapeau `codeEmail`, lib/flags.ts) est supposé levé : si on le baisse un jour, la condition 3
-- refuserait les nouvelles connexions au mot de passe d'un compte déjà vérifié. Baisser le drapeau = retirer aussi la
-- condition 3 ici (ou marquer les sessions).
-- Posée en production le 11/10/2026 (accord de Benj) en six passes : les fonctions, une table d'essai, puis les 62 autres
-- tables en quatre lots d'instructions simples (le bloc `do` ci-dessous dépassait le délai de l'outil). 252 gardes, vérifiées
-- sur jetons simulés : une session passée par le code lit ses devis, le même compte au mot de passe seul n'en lit aucun.
-- Banc d'essai PGlite (24 cas) : /mnt/project-files/securite/2026-10-11-garde-session/.
-- ⚠️ Une table créée APRÈS cette migration n'a pas la garde : la boucle ci-dessous est à rejouer (elle est idempotente).

create or replace function public.jeton_session_valide()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with j as (
    select auth.uid() as uid, coalesce(auth.jwt(), '{}'::jsonb) as c
  ), a as (
    select ar.sessions_invalides_avant, ar.connexion_verifiee_le
    from public.artisans ar, j where ar.id = j.uid
  )
  select
    -- Pas d'utilisateur dans le jeton : ce n'est pas une session d'artisan, les politiques permissives décident seules.
    (select uid from j) is null
    or (
      -- 1. Révocation : un jeton émis avant le seuil est mort, même s'il n'a pas expiré. Même arrondi que
      --    lib/authArtisan.ts (seuil tronqué à la seconde), sinon un jeton émis dans la seconde du seuil passerait les
      --    routes et serait refusé ici pendant toute sa vie.
      not exists (select 1 from a where a.sessions_invalides_avant is not null
                    and coalesce(((select c from j)->>'iat')::bigint, 0) < floor(extract(epoch from a.sessions_invalides_avant))::bigint)
      -- 2. Application d'authentification vérifiée : seul un jeton aal2 passe.
      and (
        coalesce((select c from j)->>'aal', '') = 'aal2'
        or not exists (select 1 from auth.mfa_factors f, j
                       where f.user_id = j.uid and f.factor_type = 'totp' and f.status = 'verified')
      )
      -- 3. Mot de passe seul sur un compte déjà vérifié : la session doit avoir passé le code.
      and (
        coalesce((select c from j)->>'aal', '') = 'aal2'
        or not exists (select 1 from a where a.connexion_verifiee_le is not null)
        or jsonb_typeof((select c from j)->'amr') is distinct from 'array'
        or exists (select 1 from jsonb_array_elements((select c from j)->'amr') m
                   where coalesce(m->>'method', '') <> 'password')
        or exists (select 1 from public.sessions_verifiees s, j
                   where s.session_id::text = j.c->>'session_id' and s.user_id = j.uid)
      )
    )
$$;

comment on function public.jeton_session_valide() is
  'Garde de session commune à toutes les tables (0138) : révocation, aal2 si TOTP, code email pour une session au mot de passe seul. Miroir SQL de lib/authArtisan.ts.';

create or replace function public.compte_non_suspendu()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is null
    or not exists (select 1 from public.suspensions s where s.artisan_id = auth.uid() and s.levee_le is null)
$$;

comment on function public.compte_non_suspendu() is
  'Vrai si l''utilisateur du jeton n''a aucune suspension en cours (0138, 0068). Garde des écritures.';

revoke all on function public.jeton_session_valide() from public;
revoke all on function public.compte_non_suspendu() from public;
grant execute on function public.jeton_session_valide() to authenticated, anon;
grant execute on function public.compte_non_suspendu() to authenticated, anon;

-- La garde sur chaque table à RLS du schéma public. `(select …)` : évaluée une fois par requête, pas par ligne.
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists garde_session on public.%I', t.relname);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated
                      using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t.relname);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t.relname);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated
                      with check ((select public.compte_non_suspendu()))', t.relname);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t.relname);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated
                      using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t.relname);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t.relname);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated
                      using ((select public.compte_non_suspendu()))', t.relname);
  end loop;
end $$;

-- Marche arrière (si un parcours légitime se révélait refusé) — retire les quatre gardes, laisse les fonctions :
-- do $$ declare t record; begin
--   for t in select tablename from pg_policies where schemaname = 'public' and policyname like 'garde\_%' loop
--     execute format('drop policy if exists garde_session on public.%I', t.tablename);
--     execute format('drop policy if exists garde_suspension_ins on public.%I', t.tablename);
--     execute format('drop policy if exists garde_suspension_maj on public.%I', t.tablename);
--     execute format('drop policy if exists garde_suspension_sup on public.%I', t.tablename);
--   end loop; end $$;
