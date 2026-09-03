-- v4 §11 — Correctif : « fermer toutes mes sessions » ne fermait pas les sessions.
--
-- Défaut trouvé par l'audit indépendant du 2026-09-03, et que notre propre test ne
-- pouvait pas voir : `auth.admin.signOut(uid, 'global')` attend un JETON D'ACCÈS, pas
-- un identifiant d'utilisateur. L'appel renvoyait donc une erreur 403 (« token is
-- malformed »), qui était jetée en silence — la route répondait « toutes vos sessions
-- ont été fermées » alors que le jeton de rafraîchissement restait valide. Un jeton
-- copié depuis un poste partagé pouvait se refabriquer un accès indéfiniment.
--
-- Notre test ne rejouait que le jeton d'accès. C'est exactement le trou qu'il faut
-- combler des deux côtés : le code ET le test.
--
-- Cette fonction supprime les sessions à la source. `auth.refresh_tokens.session_id`
-- porte un ON DELETE CASCADE : supprimer la session emporte ses jetons de
-- rafraîchissement. On ne dépend plus de la forme de l'API GoTrue.

create or replace function public.revoquer_sessions_auth(p_uid uuid)
returns integer
language plpgsql
security definer
set search_path = auth, public
as $fn$
declare v_sessions integer;
begin
  delete from auth.sessions where user_id = p_uid;
  get diagnostics v_sessions = row_count;
  -- Filet : les jetons hérités d'anciennes versions peuvent ne pas porter de session.
  delete from auth.refresh_tokens where user_id = p_uid::text;
  return v_sessions;
end $fn$;

-- Réservée au serveur : aucun rôle client ne doit pouvoir déconnecter qui que ce soit.
revoke all on function public.revoquer_sessions_auth(uuid) from public, anon, authenticated;
grant execute on function public.revoquer_sessions_auth(uuid) to service_role;

comment on function public.revoquer_sessions_auth(uuid) is
  'Ferme réellement toutes les sessions d''un utilisateur (v4 §11) : supprime auth.sessions, ce qui emporte les jetons de rafraîchissement par cascade. Appelée par lib/authArtisan.ts.';

comment on column public.artisans.sessions_invalides_avant is
  'Tout jeton d''accès émis avant cette date est refusé par les routes de Presti (v4 §11). Posé UNIQUEMENT par « fermer toutes mes sessions » (/api/securite/sessions) — le changement de mot de passe, lui, est géré par GoTrue.';
