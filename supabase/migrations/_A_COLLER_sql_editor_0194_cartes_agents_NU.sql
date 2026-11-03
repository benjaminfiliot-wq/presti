---------------------------- _A_COLLER_sql_editor_0194_cartes_agents_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
create unique index if not exists assistant_actions_cle_unique on public.assistant_actions (artisan_id, cle);
create index if not exists assistant_actions_agents_attente on public.assistant_actions (artisan_id, cree_le desc) where origine = 'agent';
comment on column public.assistant_actions.origine is 'assistant (assistant intégré) ou agent (département n8n) (0194).';
comment on column public.assistant_actions.departement is 'Département n8n qui a préparé la carte, pour une carte d agent (0194).';
comment on column public.assistant_actions.motif is 'Pourquoi la carte est proposée, sans donnée de client (0194).';
comment on column public.assistant_actions.sources is 'La source de chaque fait de la carte : [{fait, source}] (0194).';
comment on column public.assistant_actions.cle is 'Clé d idempotence d une carte d agent, unique par compte (0194).';
grant select on public.n8n_evenements_a_traiter to service_role;
grant execute on function public.evenements_marquer_traites(uuid, uuid[]) to service_role;
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

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Attendu entre crochets.
select 'colonnes cartes d agents [5]', count(*)::text from information_schema.columns
 where table_schema = 'public' and table_name = 'assistant_actions' and column_name in ('origine', 'departement', 'motif', 'sources', 'cle')
union all
select 'contrainte assistant_actions_agent [1]', count(*)::text from pg_constraint where conname = 'assistant_actions_agent'
union all
select 'index de cle unique [1]', count(*)::text from pg_indexes where schemaname = 'public' and indexname = 'assistant_actions_cle_unique'
union all
select 'declencheur de naissance [1]', count(*)::text from pg_trigger where tgname = 'assistant_actions_agent_naissance'
union all
select 'vue lisible par service_role [true]', has_table_privilege('service_role', 'public.n8n_evenements_a_traiter', 'select')::text
union all
select 'marque executable par service_role [true]', has_function_privilege('service_role', 'public.evenements_marquer_traites(uuid, uuid[])', 'execute')::text
union all
select 'vue fermee au navigateur [false]', has_table_privilege('authenticated', 'public.n8n_evenements_a_traiter', 'select')::text
union all
select 'lignes d assistant non touchees [0 agent]', count(*)::text from public.assistant_actions where origine = 'agent';
