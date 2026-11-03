-- 0194 · Les cartes des agents n8n dans assistant_actions, et la voie de lecture réelle du Cerveau (tâche 036-030, audit 036-029 § « En tête »,
-- points 2 et 4 ; plans/011-cadrage-01-11/p6-signature/branchement-reel.md).
--
-- ÉTAT : NON APPLIQUÉE. Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle par claude-code (tâche 036-030) ; rien n'a touché la base.
-- Elle attend le « go » écrit de Benj (.claude/rules/securite.md, .claude/rules/migration-production.md). La session principale la pose.
--
-- Ordre de pose, jamais un autre (on colle PUIS on lève) :
--   1. 0185, 0192, puis 0193 (dont celle-ci dépend : le bloc « prérequis » REFUSE la pose sans elles) ;
--   2. CETTE migration (ou son jumeau _A_COLLER_sql_editor_0194_cartes_agents_NU.sql), puis les contrôles du pied du jumeau ;
--   3. seulement ensuite : un département passé en « ombre » sur un compte de test (geste de Presti, acteur fondateur, 0193:205-226), puis
--      le drapeau boiteAgents (lib/flags.ts). Le Cerveau de n8n tourne déjà avec ses lectures réelles : sans 0193, elles échouent et le
--      passage s'arrête sans effet (fail-closed, constaté : .orchestre/preuves/036-030/resume.md) ; sans 0194, l'écriture d'une carte
--      échoue (colonnes absentes) et rien n'est écrit.
-- Essai à sec : AUCUN sur l'hôte des agents (ni PGlite ni Postgres). Le juge scripts/branchement-reel-qa.mjs la contrôle par lecture du
-- texte et mutants. À faire avant de la coller : l'essai à sec de la session principale (bloc do qui exécute le jumeau puis raise exception).
--
-- Ce qu'elle pose :
--   • assistant_actions (0157) reçoit les cartes préparées par les agents n8n, à côté de celles de l'assistant intégré :
--       origine      'assistant' (défaut : toutes les lignes d'aujourd'hui) ou 'agent' (une carte d'un département n8n) ;
--       departement  le département qui l'a préparée (les sept de 0193) ;
--       motif        pourquoi elle est proposée, une phrase sans donnée de client (écrite par le code du Cerveau, pas par un modèle) ;
--       sources      la source de chaque fait de la carte : [{ "fait": …, "source": … }], au moins une, 40 au plus ;
--       cle          la clé d'idempotence de la carte (celle du chef : « h:decision:… ») ; unique par compte : un rejeu n'écrit rien de plus.
--     Une carte d'agent est TOUJOURS « à confirmer » (mode confirmation, échéance posée) et naît « en_attente » : la contrainte
--     assistant_actions_agent le garantit en base, même par la clé de service. Rien ne part sans le clic de l'artisan, sur aucune offre,
--     tant que le réel n'est pas branché (lib-executer s'arrête hors simulation).
--   • n8n_evenements_a_traiter (0193:425) : lisible par service_role. Pourquoi : le seul identifiant de n8n est « Supabase account »
--     (clé de service, celle des workflows publiés, presti-accuse-reception compris) et aucun identifiant Postgres de n8n_lecture n'existe
--     (en créer un est un geste de Benj). La clé de service lit déjà toute la table evenements_metier : la vue, plus étroite (colonnes d'un
--     fait, comptes en suppression écartés), ne lui ouvre rien de neuf.
--   • evenements_marquer_traites (0193) : exécutable par service_role, pour la même raison ; la fonction reste bornée (un compte, 200 ids,
--     événements de ce compte seulement, une fois, jamais un compte en suppression).
--   • departements_reglages : lisible par n8n_lecture (colonnes de réglage, politique SELECT propre), pour le jour où n8n lira par son rôle
--     en lecture seule ; la clé de service la lit déjà (0193:41-42).
--
-- Multi-tenant : chaque requête de n8n filtre artisan_id (la clé de service passe outre la RLS) ; l'artisan lit ses cartes sous la RLS
-- de 0157 (auth.uid() = artisan_id) ; l'écran les lit par une route de session (app/api/assistant/agents/route.ts), filtrée par compte.
--
-- Retour arrière (dans cet ordre ; les cartes d'agents écrites entre-temps sont supprimées d'abord) :
--   delete from public.assistant_actions where origine = 'agent';
--   drop index if exists public.assistant_actions_cle_unique;
--   drop index if exists public.assistant_actions_agents_attente;
--   alter table public.assistant_actions drop constraint if exists assistant_actions_agent;
--   alter table public.assistant_actions drop column if exists cle, drop column if exists sources, drop column if exists motif,
--     drop column if exists departement, drop column if exists origine;
--   revoke select on public.n8n_evenements_a_traiter from service_role;
--   revoke execute on function public.evenements_marquer_traites(uuid, uuid[]) from service_role;
--   drop policy if exists n8n_lecture_select on public.departements_reglages;
--   revoke select on public.departements_reglages from n8n_lecture;
-- Idempotente : rejouée, elle repose les mêmes objets.

set local lock_timeout = '5s';

do $prerequis$
begin
  if to_regclass('public.assistant_actions') is null then
    raise exception '0194 : 0157 (assistant_actions) doit être posée avant';
  end if;
  if to_regclass('public.departements_reglages') is null or to_regclass('public.n8n_evenements_a_traiter') is null then
    raise exception '0194 : 0193 (departements_reglages, n8n_evenements_a_traiter) doit être posée avant';
  end if;
  if to_regprocedure('public.evenements_marquer_traites(uuid, uuid[])') is null then
    raise exception '0194 : 0193 (evenements_marquer_traites) doit être posée avant';
  end if;
end
$prerequis$;

-- ══ 1. Les colonnes d'une carte d'agent ══════════════════════════════════════════════════════════════════════════════════════════
alter table public.assistant_actions add column if not exists origine text not null default 'assistant';
alter table public.assistant_actions add column if not exists departement text;
alter table public.assistant_actions add column if not exists motif text;
alter table public.assistant_actions add column if not exists sources jsonb;
alter table public.assistant_actions add column if not exists cle text;

alter table public.assistant_actions drop constraint if exists assistant_actions_agent;
alter table public.assistant_actions add constraint assistant_actions_agent check (
  origine in ('assistant', 'agent')
  and (departement is null or departement in ('accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction'))
  and (motif is null or char_length(btrim(motif)) between 1 and 300)
  and (sources is null or (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) between 1 and 40 and pg_column_size(sources) <= 8000))
  and (cle is null or (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'))
  and (origine <> 'agent' or (
    departement is not null and motif is not null and sources is not null and cle is not null
    and mode = 'confirmation' and expire_le is not null
  ))
);

-- Une carte d'agent naît « en_attente » : la seule écriture permise à n8n est l'insertion d'une carte à valider.
create or replace function public.assistant_actions_agent_naissance() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.origine = 'agent' and new.statut <> 'en_attente' then
    raise exception 'assistant_actions : une carte d''agent naît à valider (en_attente), jamais % ', new.statut;
  end if;
  return new;
end
$fn$;
drop trigger if exists assistant_actions_agent_naissance on public.assistant_actions;
create trigger assistant_actions_agent_naissance before insert on public.assistant_actions
  for each row execute function public.assistant_actions_agent_naissance();

-- Idempotence : une clé par compte. Index complet (pas partiel) : PostgREST « on_conflict=artisan_id,cle » l'exige ; les lignes de
-- l'assistant intégré ont une clé vide, et deux vides ne se heurtent jamais (NULL distincts).
create unique index if not exists assistant_actions_cle_unique on public.assistant_actions (artisan_id, cle);
-- La boîte « À valider » lit les cartes d'agents en attente d'un compte, les plus récentes d'abord.
create index if not exists assistant_actions_agents_attente on public.assistant_actions (artisan_id, cree_le desc) where origine = 'agent';

comment on column public.assistant_actions.origine is 'assistant (assistant intégré) ou agent (département n8n) (0194).';
comment on column public.assistant_actions.departement is 'Département n8n qui a préparé la carte, pour une carte d agent (0194).';
comment on column public.assistant_actions.motif is 'Pourquoi la carte est proposée, sans donnée de client (0194).';
comment on column public.assistant_actions.sources is 'La source de chaque fait de la carte : [{fait, source}] (0194).';
comment on column public.assistant_actions.cle is 'Clé d idempotence d une carte d agent, unique par compte (0194).';

-- ══ 2. La voie de lecture réelle du Cerveau (identifiant « Supabase account ») ══════════════════════════════════════════════════
grant select on public.n8n_evenements_a_traiter to service_role;
grant execute on function public.evenements_marquer_traites(uuid, uuid[]) to service_role;

-- ══ 3. n8n_lecture : les réglages des départements, et les nouvelles colonnes des cartes ═══════════════════════════════════════
do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant select (artisan_id, departement, palier, en_marche, plafond_jour, plafond_cout_centimes_jour, maj_le) on public.departements_reglages to n8n_lecture;
    drop policy if exists n8n_lecture_select on public.departements_reglages;
    create policy n8n_lecture_select on public.departements_reglages for select to n8n_lecture using (true);
    grant select (origine, departement, cle) on public.assistant_actions to n8n_lecture;
  else
    raise notice '0194 : rôle n8n_lecture absent (0189 non appliquée) — droits sautés, à rejouer après 0189';
  end if;
end
$droits$;
