---------------------------- _A_COLLER_sql_editor_0184_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
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
    -- La personne : sa ligne artisans (0138) ET sa ligne utilisateurs (0183). Les conditions 1 et 3 portent sur toutes : la plus
    -- stricte gagne.
    select ar.sessions_invalides_avant, ar.connexion_verifiee_le
    from public.artisans ar, j where ar.id = j.uid
    union all
    select u.sessions_invalides_avant, u.connexion_verifiee_le
    from public.utilisateurs u, j where u.id = j.uid
  )
  select
    -- Pas d'utilisateur dans le jeton : ce n'est pas une session d'artisan, les politiques permissives décident seules.
    (select uid from j) is null
    or (
      -- 0. La faille de 0138 : un membre actif non titulaire sans aucune ligne de sécurité est refusé (échec fermé). Un compte neuf,
      --    sans adhésion active, garde sa session d'inscription (app/onboarding/page.tsx:62-67).
      (exists (select 1 from a)
        or not exists (select 1 from public.membres m, j
                       where m.utilisateur_id = j.uid and m.statut = 'actif' and m.role <> 'titulaire'))
      -- 1. Révocation : un jeton émis avant le seuil est mort, même s'il n'a pas expiré. Même arrondi que
      --    lib/authArtisan.ts (seuil tronqué à la seconde).
      and not exists (select 1 from a where a.sessions_invalides_avant is not null
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
  'Garde de session commune à toutes les tables (0138, étendue aux membres par 0184) : révocation, aal2 si TOTP, code email pour une session au mot de passe seul ; artisans et utilisateurs, le plus strict gagne ; membre actif sans ligne refusé. Miroir SQL de lib/authArtisan.ts.';
revoke all on function public.jeton_session_valide() from public;
grant execute on function public.jeton_session_valide() to authenticated, anon;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'jeton_session_valide lit utilisateurs (attendu : true)' as quoi,
       (select prosrc ilike '%public.utilisateurs%' from pg_proc where proname = 'jeton_session_valide' and pronamespace = 'public'::regnamespace)::text as resultat
union all
select 'compte_non_suspendu inchangée depuis 0138, ne lit pas membres (attendu : false)',
       (select prosrc ilike '%public.membres%' from pg_proc where proname = 'compte_non_suspendu' and pronamespace = 'public'::regnamespace)::text
union all
select 'les deux fonctions de garde en security definer (attendu : 2)', count(*)::text
  from pg_proc where pronamespace = 'public'::regnamespace and proname in ('jeton_session_valide', 'compte_non_suspendu') and prosecdef
union all
select 'gardes de session restrictives en place (attendu : inchangé depuis 0138, > 0)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname = 'garde_session' and permissive = 'RESTRICTIVE';
