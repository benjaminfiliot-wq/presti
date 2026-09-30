-- ============================================================================================
-- 0101 · L'horloge 24 h/24 : pg_cron + pg_net + Supabase Vault
--        (fiche 026-086, série 026 ; horloge-bus 16 ; dépend de 026-032 et 026-036, PASS)
--
-- Pourquoi : Presti reste en Vercel Hobby, qui ne permet qu'une tâche planifiée par jour, et les
-- deux sont déjà prises. L'horloge 24 h/24 est donc portée par Supabase : pg_cron programme,
-- pg_net appelle. pg_net attend 2 secondes par défaut : `timeout_milliseconds` est explicite dans
-- chaque appel HTTP, sinon le tic serait noté en échec à chaque minute.
--
-- Ordre des préalables (fiche 026-086) :
--   1. 0096 à 0100 appliquées (le bus des agents : ops_baux_expirer, ops_decisions_echues) ;
--   2. la fiche 15 (026-049) déployée et `busAgents` levé : sinon le tic répond 404 chaque
--      minute, sans dommage mais pour rien (le 404 le dit, jamais un 401) ;
--   3. le secret `cron_secret` posé par Benj, à la main, dans l'écran Vault du tableau de bord
--      Supabase — aucun SQL, jamais par Claude Code. Sans lui, la minute écrit un événement
--      `horloge_sans_secret` (une fois par heure au plus) et ne fait aucun appel HTTP.
--
-- Ce que fait la minute, dans cet ordre : les baux expirés (0098), les décisions échues (0098),
-- chacun dans son propre bloc protégé (une erreur de l'un n'empêche pas l'autre), puis l'appel au
-- tic (`GET https://prestiapp.fr/api/agents/tic`, jeton lu dans Supabase Vault, jamais dans ce
-- dépôt). `public.ops_horloge_minute()` n'est exécutable par PERSONNE d'autre que son propriétaire
-- (revoke des quatre rôles de l'API, aucun grant) : ni anon, ni authenticated, ni même service_role.
-- `public.ops_horloge_etat(p_minutes)` (lecture, service_role seul) ne rend jamais la valeur du
-- secret, seulement sa présence (`secret_present`, un booléen par `exists (…)`).
--
-- Arrêter l'horloge (Claude Code, par `execute_sql`, sur l'ordre de Benj) :
--   select cron.unschedule('presti-agents-tic');
-- La revoir sans l'arrêter : select public.ops_horloge_etat(60);
--
-- Rejouable : les deux extensions (posées seulement si absentes), les deux fonctions en
-- `create or replace`, les deux `cron.schedule` (un planning du même nom se remplace). Interdits
-- dans ce fichier : toute table, toute politique, tout secret, tout SQL qui poserait un secret du
-- Vault.
--
-- Pourquoi un bloc gardé et non `create extension if not exists` tout court (026-086, relance du
-- 28/09) : sur ce projet, même la forme `if not exists` relance le script de (ré)installation
-- interne de l'extension quand pg_cron est déjà installé, qui tente de révoquer un droit SELECT sur
-- `cron.job` déjà consenti deux fois (avec et sans option de transmission) — Postgres refuse avec
-- `2BP01 dependent privileges exist`, reproductible à volonté (`.orchestre/preuves/026-086/`). Le
-- bloc ci-dessous ne lance `create extension` (sans `if not exists`, donc sans ce script) que si
-- `pg_extension` ne porte pas encore la ligne : sur une base où l'extension existe déjà, l'exécution
-- de `create extension` est évitée entièrement.
-- ============================================================================================

do $$ begin if not exists (select 1 from pg_extension where extname = 'pg_cron') then create extension pg_cron; end if; end $$;
do $$ begin if not exists (select 1 from pg_extension where extname = 'pg_net') then create extension pg_net; end if; end $$;

-- ── La minute : baux, décisions, puis l'appel au tic (026-086, contrat public.ops_horloge_minute) ──
create or replace function public.ops_horloge_minute()
returns bigint
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_secret text;
  v_recemment integer;
begin
  -- Les baux expirés d'abord : ils tournent même si le tic est en panne. Une erreur ici n'empêche
  -- ni les décisions ni l'appel au tic qui suit.
  begin
    perform public.ops_baux_expirer();
  exception when others then
    insert into ops.evenements (agent, type, objet, resume)
    values ('systeme', 'horloge_erreur', 'horloge:baux',
            left('ops_baux_expirer en échec : ' || sqlstate || ' ' || sqlerrm, 200));
  end;

  -- Puis les décisions échues, même protection.
  begin
    perform public.ops_decisions_echues();
  exception when others then
    insert into ops.evenements (agent, type, objet, resume)
    values ('systeme', 'horloge_erreur', 'horloge:decisions',
            left('ops_decisions_echues en échec : ' || sqlstate || ' ' || sqlerrm, 200));
  end;

  -- Le jeton, lu dans Supabase Vault. Jamais posé ni lu ailleurs que par Benj, à la main.
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_secret is null then
    -- Sans secret : un événement, une fois par heure au plus, et aucun appel HTTP.
    select count(*) into v_recemment from ops.evenements
     where type = 'horloge_sans_secret' and le > now() - interval '1 hour';
    if v_recemment = 0 then
      insert into ops.evenements (agent, type, objet, resume)
      values ('systeme', 'horloge_sans_secret', 'horloge:tic',
              'cron_secret absent du Vault : appel au tic sauté (026-086)');
    end if;
    return null;
  end if;

  return net.http_get(
    url := 'https://prestiapp.fr/api/agents/tic',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
end
$$;
revoke all on function public.ops_horloge_minute() from public, anon, authenticated, service_role;
comment on function public.ops_horloge_minute() is
  'Baux expirés puis décisions échues (chacun protégé, 0098), puis GET https://prestiapp.fr/api/agents/tic avec le jeton cron_secret du Vault (Bearer, timeout 30 s) ; sans secret : return null et un événement horloge_sans_secret par heure au plus. Exécutable par PERSONNE d''autre que son propriétaire : revoke de public, anon, authenticated et service_role, aucun grant. Appelée chaque minute par pg_cron (026-086).';

-- ── L'état de l'horloge, pour la station et pour Benj (026-086, contrat public.ops_horloge_etat) ──
create or replace function public.ops_horloge_etat(p_minutes integer)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_fenetre interval := make_interval(mins => greatest(coalesce(p_minutes, 60), 1));
  v_fenetre_reponses interval := least(v_fenetre, interval '6 hours');
  v_trous jsonb;
  v_reponses jsonb;
begin
  -- Les écarts de plus de 5 min entre deux exécutions du tic, 20 au plus.
  select coalesce(jsonb_agg(jsonb_build_object(
           'avant', x.debut, 'apres', x.suivant, 'ecart_minutes', round(extract(epoch from (x.suivant - x.debut)) / 60, 1)
         ) order by x.debut desc), '[]'::jsonb)
    into v_trous
    from (
      select jrd.start_time as debut, lead(jrd.start_time) over (order by jrd.start_time) as suivant
        from cron.job_run_details jrd
        join cron.job j on j.jobid = jrd.jobid
       where j.jobname = 'presti-agents-tic' and jrd.start_time > now() - v_fenetre
    ) x
   where x.suivant is not null and x.suivant - x.debut > interval '5 minutes'
   limit 20;

  -- Le nombre de réponses par code HTTP, sur 6 heures au plus.
  select coalesce(jsonb_object_agg(coalesce(r.code::text, 'sans_code'), r.n), '{}'::jsonb)
    into v_reponses
    from (
      select status_code as code, count(*) as n
        from net._http_response
       where created > now() - v_fenetre_reponses
       group by status_code
    ) r;

  return jsonb_build_object(
    'job_actif', exists (select 1 from cron.job where jobname = 'presti-agents-tic' and active),
    'planning', (select schedule from cron.job where jobname = 'presti-agents-tic'),
    'secret_present', exists (select 1 from vault.decrypted_secrets where name = 'cron_secret'),
    'executions', jsonb_build_object(
      'reussies', (select count(*) from cron.job_run_details jrd join cron.job j on j.jobid = jrd.jobid
                    where j.jobname = 'presti-agents-tic' and jrd.status = 'succeeded' and jrd.start_time > now() - v_fenetre),
      'echouees', (select count(*) from cron.job_run_details jrd join cron.job j on j.jobid = jrd.jobid
                    where j.jobname = 'presti-agents-tic' and jrd.status = 'failed' and jrd.start_time > now() - v_fenetre)
    ),
    'trous', v_trous,
    'reponses', v_reponses,
    'derniere_execution', (select max(jrd.start_time) from cron.job_run_details jrd join cron.job j on j.jobid = jrd.jobid
                             where j.jobname = 'presti-agents-tic')
  );
end
$$;
revoke all on function public.ops_horloge_etat(integer) from public, anon, authenticated;
grant execute on function public.ops_horloge_etat(integer) to service_role;
comment on function public.ops_horloge_etat(integer) is
  'État en lecture (service_role seul) sur la fenêtre des p_minutes dernières minutes : job_actif, planning, secret_present (booléen, jamais la valeur), executions (reussies, echouees), trous (écarts de plus de 5 min, 20 au plus), reponses (par code HTTP, 6 h au plus), derniere_execution (026-086).';

-- ── Les deux tâches planifiées. Un planning du même nom se remplace : ce fichier est rejouable. ──
select cron.schedule('presti-agents-tic', '* * * * *', 'select public.ops_horloge_minute()');
select cron.schedule('presti-cron-menage', '17 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
