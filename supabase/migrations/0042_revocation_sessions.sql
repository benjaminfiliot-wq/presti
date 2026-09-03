-- v4 §11 — Révocation réelle des sessions.
--
-- Un jeton d'accès Supabase est autoporteur : `signOut` révoque le jeton de
-- rafraîchissement, pas le jeton d'accès déjà émis, qui reste valable jusqu'à son
-- expiration. Un jeton copié depuis un poste partagé ouvrait donc encore le compte
-- pendant une heure après la déconnexion.
--
-- Cette date est le seuil : tout jeton émis avant est refusé par les routes de Presti.
alter table public.artisans
  add column if not exists sessions_invalides_avant timestamptz;

comment on column public.artisans.sessions_invalides_avant is
  'Tout jeton d''accès émis avant cette date est refusé (v4 §11). Posé par « se déconnecter partout » et par le changement de mot de passe.';
