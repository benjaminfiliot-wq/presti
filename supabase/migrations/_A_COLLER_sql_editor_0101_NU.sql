---------------------------- _A_COLLER_sql_editor_0101_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
do $$ begin if not exists (select 1 from pg_extension where extname = 'pg_cron') then create extension pg_cron; end if; end $$;
do $$ begin if not exists (select 1 from pg_extension where extname = 'pg_net') then create extension pg_net; end if; end $$;
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
  select coalesce(jsonb_object_agg(r.code::text, r.n), '{}'::jsonb)
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
select cron.schedule('presti-agents-tic', '* * * * *', 'select public.ops_horloge_minute()');
select cron.schedule('presti-cron-menage', '17 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
with fonctions(signature) as (
  values ('public.ops_horloge_minute()'),
         ('public.ops_horloge_etat(integer)')
), lues as (
  select f.signature, to_regprocedure(f.signature) as fonction from fonctions f
), taches as (
  select jobname, schedule, active from cron.job where jobname in ('presti-agents-tic', 'presti-cron-menage')
)
select 'extensions pg_cron et pg_net installées (pg_extension) (attendu : oui)' as quoi,
       case when (select count(*) from pg_extension where extname in ('pg_cron', 'pg_net')) = 2
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'les deux tâches existent et sont actives, presti-agents-tic chaque minute (cron.job) (attendu : oui)',
       case when (select count(*) from taches) = 2
             and not exists (select 1 from taches where not active)
             and exists (select 1 from taches where jobname = 'presti-agents-tic' and schedule = '* * * * *')
            then 'oui' else 'NON (anormal)' end
union all
select 'secret_present : cron_secret existe dans le Vault (vault.decrypted_secrets, exists) (attendu : oui, une fois posé par Benj)',
       case when exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
            then 'oui' else 'NON (anormal) : Benj pose cron_secret par l''écran Vault du tableau de bord' end
union all
select 'les deux fonctions sont security definer, search_path posé (ops), ops_horloge_etat exécutable par service_role (prosecdef, proconfig, has_function_privilege) (attendu : oui)',
       case when (select count(*) from lues l where l.fonction is not null) = 2
             and not exists (select 1 from lues l join pg_proc p on p.oid = l.fonction
                              where not coalesce(p.prosecdef, false)
                                 or not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c like 'search_path=%ops%'))
             and has_function_privilege('service_role', 'public.ops_horloge_etat(integer)', 'execute')
            then 'oui' else 'NON (anormal)' end
union all
select 'anon, authenticated et service_role n''exécutent pas ops_horloge_minute (has_function_privilege) (attendu : oui)',
       case when not has_function_privilege('anon', 'public.ops_horloge_minute()', 'execute')
             and not has_function_privilege('authenticated', 'public.ops_horloge_minute()', 'execute')
             and not has_function_privilege('service_role', 'public.ops_horloge_minute()', 'execute')
            then 'oui' else 'NON (anormal)' end;
