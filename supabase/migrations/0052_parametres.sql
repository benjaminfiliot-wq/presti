-- 0052 — Paramètres & compte, niveau Claude (sprint J-1 §6).
--
-- Quatre choses, et rien d'autre :
--  1. `artisans.notifications` : quels emails l'artisan veut recevoir, par type d'événement.
--     Lu par lib/notifications.ts avant CHAQUE envoi à l'artisan. Défaut : tout activé.
--     Écrite par l'artisan lui-même depuis son navigateur (pas une colonne sensible).
--  2. `artisans.suppression_demandee_le` : la suppression du compte a 30 jours de grâce.
--     Posée UNIQUEMENT par /api/account/delete (service_role) — figée côté navigateur,
--     sinon un jeton volé pourrait programmer la disparition d'un compte, ou annuler
--     une suppression que l'artisan a voulue.
--  3. `sessions_de_l_artisan()` : la liste de SES sessions ouvertes (auth.sessions n'est
--     pas exposé à PostgREST). Security definer, mais ne rend que les lignes de auth.uid().
--  4. `revoquer_session_auth(uid, session)` : fermer UNE session. Même principe que
--     `revoquer_sessions_auth` (0043) : on supprime la ligne, la cascade emporte le jeton
--     de rafraîchissement, et GoTrue refuse ensuite le jeton d'accès (session_not_found).

-- 1. Notifications par type d'événement.
alter table public.artisans
  add column if not exists notifications jsonb not null default '{}'::jsonb;

comment on column public.artisans.notifications is
  'Emails que l''artisan veut recevoir, par type : {nouvelle_demande, proposition, devis_accepte} → booléen. Absent = activé. Lu par lib/notifications.ts avant chaque envoi.';

-- 2. Suppression du compte avec 30 jours de grâce.
alter table public.artisans
  add column if not exists suppression_demandee_le timestamptz;

comment on column public.artisans.suppression_demandee_le is
  'Date à laquelle l''artisan a demandé la suppression de son compte. Le compte est purgé 30 jours plus tard par /api/cron/purge-comptes ; tant que la date n''est pas atteinte, l''artisan peut annuler. Posée par le serveur seulement.';

-- Index partiel : le cron ne parcourt que les comptes en attente (quasi aucun).
create index if not exists artisans_suppression_demandee_idx
  on public.artisans (suppression_demandee_le) where suppression_demandee_le is not null;

-- 3. Les sessions ouvertes de l'artisan connecté.
create or replace function public.sessions_de_l_artisan()
returns table (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
language sql
stable
security definer
set search_path = auth, public
as $fn$
  select s.id, s.created_at, s.updated_at, s.user_agent, host(s.ip)
  from auth.sessions s
  where s.user_id = auth.uid()          -- jamais celles d'un autre : auth.uid() est le seul filtre possible
    and auth.uid() is not null
  order by s.updated_at desc nulls last, s.created_at desc
$fn$;

revoke all on function public.sessions_de_l_artisan() from public, anon;
grant execute on function public.sessions_de_l_artisan() to authenticated, service_role;

comment on function public.sessions_de_l_artisan() is
  'Sessions ouvertes de l''utilisateur connecté (Paramètres → Sécurité). Ne rend que les lignes de auth.uid().';

-- 4. Fermer UNE session — réservé au serveur, qui a déjà vérifié le porteur du jeton.
create or replace function public.revoquer_session_auth(p_uid uuid, p_session uuid)
returns integer
language plpgsql
security definer
set search_path = auth, public
as $fn$
declare v_n integer;
begin
  delete from auth.sessions where user_id = p_uid and id = p_session;
  get diagnostics v_n = row_count;
  delete from auth.refresh_tokens where user_id = p_uid::text and session_id = p_session;
  return v_n;
end $fn$;

revoke all on function public.revoquer_session_auth(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoquer_session_auth(uuid, uuid) to service_role;

comment on function public.revoquer_session_auth(uuid, uuid) is
  'Ferme une seule session (Paramètres → Sécurité → révocation unitaire). Appelée par /api/securite/sessions DELETE et par le changement de mot de passe (session de vérification).';

-- Verrou de privilèges : `suppression_demandee_le` rejoint les colonnes figées côté navigateur.
-- Corps complet repris de 0051 — c'est la règle (voir le commentaire de la fonction).
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    -- Sécurité : la révocation de sessions ne doit pas pouvoir être annulée par un
    -- jeton volé — sinon « fermer toutes mes sessions » ne protège de rien.
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    -- Domaine personnalisé : réservé à l'offre Signature et vérifié par /api/domain.
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- Adresse : ne se change que par /api/account/slug (0051).
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    -- Suppression du compte : programmée et annulée par /api/account/delete seulement (0052).
    new.suppression_demandee_le := old.suppression_demandee_le;
  end if;
  return new;
end $$;

comment on function public.lock_artisan_privileges() is
  'Colonnes que l''artisan ne peut PAS modifier depuis son navigateur. ⚠️ Toute nouvelle colonne sensible ajoutée à `artisans` doit être ajoutée ici — c''est l''oubli qui a produit les failles du 2026-09-03.';
