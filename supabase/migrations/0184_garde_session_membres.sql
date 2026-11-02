-- 0184 · La garde de session étendue aux membres, pas M2 (chantier 4, lot L6b) : un nouveau corps pour jeton_session_valide(), qui
-- ferme la faille de 0138 pour qui n'a pas de ligne artisans ; compte_non_suspendu() reste celle de 0138 (voir plus bas).
--
-- ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj. (tâche 032-032, sur le Oracle, par claude-code ; rien n'a touché la base)
-- Ordre : 0183 posée et contrôlée ; banc de 0138 rejoué (organisations-qa, partie PGlite) ; essai à sec par la session principale ;
-- « go » écrit ; application ; contrôle du pied du jumeau. Aucune politique n'est créée, modifiée ni retirée : seul un corps de
-- fonction change (create or replace), les 252 gardes de 0138 restent telles quelles et appellent les nouveaux corps.
--
-- Source : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §8.2 0184 (l.562-563), §10 « la faille de 0138 » (l.627-633), pas M2
-- (l.646) ; cadrage-p3.md §5.5 M2 (l.322).
--
-- La faille (0138_garde_session_rls.sql:44-47, :55-56, :66) : la CTE `a` lit artisans par auth.uid(). Pour qui n'y figure pas — un membre
-- invité, qui n'a pas de compte artisan — la révocation (condition 1) et le code par e-mail (condition 3) sont VRAIS À VIDE : un membre
-- dont on a révoqué les sessions, ou qui n'a passé que son mot de passe, passerait la garde.
-- La parade :
--   · `a` lit artisans ET utilisateurs (0183), qui porte les mêmes champs pour une personne : le plus strict gagne. Un membre qui se crée
--     plus tard une ligne artisans (onboarding) garde donc sa révocation et son code ; un artisan sans ligne utilisateurs reste tel qu'en
--     0138 ; utilisateurs.connexion_verifiee_le naît à now() (0183), si bien qu'un membre au mot de passe seul passe le code ;
--   · un membre ACTIF non titulaire sans ligne ni dans artisans ni dans utilisateurs est REFUSÉ (échec fermé) ;
--   · un compte neuf (ni artisans, ni adhésion active) reste permis comme en 0138 : il écrit sa ligne artisans à l'inscription, sous la RLS
--     (app/onboarding/page.tsx:62-67, politique artisan_insert_own, 0001:22) ;
--   · compte_non_suspendu n'est PAS changée (écart au §8.2 l.562-563, voulu) : la suspension d'une organisation atteint ses membres par
--     comptes_accessibles, qui l'exclut en écriture (§10 l.633 ; 0183). Une garde restrictive vaut pour toute la table, pas par
--     organisation : l'élargir refuserait à un membre d'écrire dans SES AUTRES organisations (relecture du 02/11). Son corps de 0138
--     reste en place, recopié ci-dessous seulement pour que le retour arrière soit complet.
-- Pour un artisan sans ligne utilisateurs, jeton_session_valide rend exactement ce que rendait celle de 0138.
-- Le TOTP (auth.mfa_factors) reste par utilisateur, inchangé (cadrage-p3.md:322).
--
-- Retour arrière : recoller les corps de 0138 ci-dessous, tels quels (sans les « -- »), dans une transaction. Ils sont recopiés de
-- 0138_garde_session_rls.sql:35-96, à l'octet près (organisations-qa le vérifie). Rien d'autre à défaire : 0184 ne crée aucun objet.
-- Retirer 0184 AVANT 0183 : son corps lit utilisateurs et membres (le retour arrière de 0183 le vérifie).
-- Idempotente : rejouée, elle repose les mêmes corps.
--
-- ▼ CORPS DE 0138 (retour arrière)
-- create or replace function public.jeton_session_valide()
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path = ''
-- as $$
--   with j as (
--     select auth.uid() as uid, coalesce(auth.jwt(), '{}'::jsonb) as c
--   ), a as (
--     select ar.sessions_invalides_avant, ar.connexion_verifiee_le
--     from public.artisans ar, j where ar.id = j.uid
--   )
--   select
--     -- Pas d'utilisateur dans le jeton : ce n'est pas une session d'artisan, les politiques permissives décident seules.
--     (select uid from j) is null
--     or (
--       -- 1. Révocation : un jeton émis avant le seuil est mort, même s'il n'a pas expiré. Même arrondi que
--       --    lib/authArtisan.ts (seuil tronqué à la seconde), sinon un jeton émis dans la seconde du seuil passerait les
--       --    routes et serait refusé ici pendant toute sa vie.
--       not exists (select 1 from a where a.sessions_invalides_avant is not null
--                     and coalesce(((select c from j)->>'iat')::bigint, 0) < floor(extract(epoch from a.sessions_invalides_avant))::bigint)
--       -- 2. Application d'authentification vérifiée : seul un jeton aal2 passe.
--       and (
--         coalesce((select c from j)->>'aal', '') = 'aal2'
--         or not exists (select 1 from auth.mfa_factors f, j
--                        where f.user_id = j.uid and f.factor_type = 'totp' and f.status = 'verified')
--       )
--       -- 3. Mot de passe seul sur un compte déjà vérifié : la session doit avoir passé le code.
--       and (
--         coalesce((select c from j)->>'aal', '') = 'aal2'
--         or not exists (select 1 from a where a.connexion_verifiee_le is not null)
--         or jsonb_typeof((select c from j)->'amr') is distinct from 'array'
--         or exists (select 1 from jsonb_array_elements((select c from j)->'amr') m
--                    where coalesce(m->>'method', '') <> 'password')
--         or exists (select 1 from public.sessions_verifiees s, j
--                    where s.session_id::text = j.c->>'session_id' and s.user_id = j.uid)
--       )
--     )
-- $$;
-- 
-- comment on function public.jeton_session_valide() is
--   'Garde de session commune à toutes les tables (0138) : révocation, aal2 si TOTP, code email pour une session au mot de passe seul. Miroir SQL de lib/authArtisan.ts.';
-- 
-- create or replace function public.compte_non_suspendu()
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path = ''
-- as $$
--   select auth.uid() is null
--     or not exists (select 1 from public.suspensions s where s.artisan_id = auth.uid() and s.levee_le is null)
-- $$;
-- 
-- comment on function public.compte_non_suspendu() is
--   'Vrai si l''utilisateur du jeton n''a aucune suspension en cours (0138, 0068). Garde des écritures.';
-- 
-- revoke all on function public.jeton_session_valide() from public;
-- revoke all on function public.compte_non_suspendu() from public;
-- grant execute on function public.jeton_session_valide() to authenticated, anon;
-- grant execute on function public.compte_non_suspendu() to authenticated, anon;
-- ▲ FIN DES CORPS DE 0138

-- Un verrou qui tarde fait échouer la migration proprement, au lieu de bloquer la production.
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
