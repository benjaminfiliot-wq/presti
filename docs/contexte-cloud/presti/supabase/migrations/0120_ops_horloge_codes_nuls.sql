-- 0120 — ops_horloge_etat plantait au-delà de 60 min (22023 « field name must not be null ») : une requête pg_net
-- sans réponse (délai, erreur réseau) a un status_code nul, et jsonb_object_agg refuse une clé nulle. Ces réponses
-- sont comptées sous « sans_code ». Même correction reportée dans 0101 pour qu'un rejeu reste identique (026-138).

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
