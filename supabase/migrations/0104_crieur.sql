-- ============================================================================================
-- 0104 · La mémoire et l'horloge du Crieur : crieur_posts, crieur_appel et la tâche presti-crieur
--        (fiche 026-134, série 026 ; décision du chef d'entreprise du 27/09 : R24 remplace R7 ;
--         revue du 25/09 : la route du Crieur devient quotidienne, 26 h d'avance au plus)
--
-- S'applique APRÈS 0101 (l'horloge : `pg_cron` et `pg_net` sont déjà posés, ce fichier ne crée AUCUNE extension
-- et ne pose aucun secret) et APRÈS le déploiement de la route `/api/cron/crieur` (026-122). Sans elle la tâche
-- tomberait sur une page absente, chaque matin.
--
-- Pourquoi ici : Vercel Hobby n'a que deux tâches planifiées, déjà prises (`vercel.json`). L'horloge 24 h/24 de
-- Presti vit donc dans Supabase : `pg_cron` appelle `public.crieur_appel()`, qui lit le secret `cron_secret` dans
-- Supabase Vault (posé par Benj, à la main, jamais écrit dans ce dépôt) et fait un `GET` de la route par `pg_net`,
-- avec un délai explicite de 30 s (le défaut, 2 s, est trop court).
--
-- Ce que la table garde (la route en a besoin : 15 publications par mois au plus sur Publora Starter, externes
-- comprises ; jamais le même fait avant 30 jours ; une publication par canal et par semaine) :
--   · une ligne par publication du Crieur ; le statut que la route écrit est `brouillon_publora` (le créneau
--     est PROPOSÉ dans `programmee_pour`) ou `erreur` ; `externe` est ce que Claude Code inscrit (posts partis
--     ailleurs, comptés dans le plafond) ; `programmee` reste accepté par la contrainte mais plus aucune route ne
--     l'écrit : la publication attend l'accord de Benj, pour chacune (R24), c'est son geste de programmer le
--     brouillon dans Publora ;
--   · un index unique partiel (semaine, canal) hors `externe` : un créneau déjà inscrit n'est jamais refait ;
--   · les `raisons` d'un refus du juge d'exécution (026-116).
--
-- Qui écrit / qui lit : la route du Crieur, par `service_role` ; personne d'autre (`anon` et `authenticated` sont
-- refusés, aucune politique). `crieur_appel()` n'est exécutable par PERSONNE : ni anon, ni authenticated, ni
-- même service_role ; seul pg_cron, qui l'exécute en propriétaire, l'appelle.
--
-- Arrêter l'horloge du Crieur (Claude Code, par `execute_sql`, sur l'ordre de Benj) : select cron.unschedule('presti-crieur');
-- Rejouable : la table et les index en `if not exists`, la fonction en `create or replace`, `cron.schedule` remplace
-- un planning du même nom.
-- ============================================================================================

-- ── La mémoire du Crieur ────────────────────────────────────────────────────────────────────────
create table if not exists public.crieur_posts (
  id              uuid primary key default gen_random_uuid(),
  semaine         text not null,
  canal           text not null check (canal in ('linkedin', 'facebook', 'instagram')),
  fait_ids        text[] not null default '{}',
  texte           text not null,
  publora_id      text,
  statut          text not null check (statut in ('programmee', 'brouillon_publora', 'erreur', 'externe')),
  programmee_pour timestamptz,
  raisons         text[] not null default '{}',
  cree_le         timestamptz not null default now(),
  check (statut <> 'programmee' or programmee_pour is not null)
);
create unique index if not exists crieur_posts_semaine_canal on public.crieur_posts (semaine, canal) where statut <> 'externe';
create index if not exists crieur_posts_cree_le on public.crieur_posts (cree_le);
alter table public.crieur_posts enable row level security;
revoke all on public.crieur_posts from public, anon, authenticated;

-- ── L'appel de la route : le secret vient du Vault, l'exécution de personne ─────────────────────
create or replace function public.crieur_appel()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    return null;
  end if;
  return net.http_get(
    url := 'https://prestiapp.fr/api/cron/crieur',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
end
$$;
revoke execute on function public.crieur_appel() from public, anon, authenticated, service_role;

-- ── La tâche : chaque jour à 5 h UTC ────────────────────────────────────────────────────────────
select cron.schedule('presti-crieur', '0 5 * * *', 'select public.crieur_appel()');

comment on table public.crieur_posts is 'Les publications du Crieur (026-134) : une ligne par publication ; brouillon_publora (créneau proposé, l''accord de Benj se donne dans Publora) ou erreur écrits par la route, externe inscrit par Claude Code, programmee toléré mais plus écrit (R24). Un créneau (semaine, canal) hors externe n''est jamais refait.';
comment on function public.crieur_appel() is 'GET https://prestiapp.fr/api/cron/crieur avec le secret cron_secret du Vault (Bearer, délai 30 s) ; sans secret : return null, aucun appel. Exécutable par PERSONNE d''autre que son propriétaire (revoke de public, anon, authenticated, service_role). Appelée chaque jour à 5 h UTC par pg_cron (tâche presti-crieur).';
