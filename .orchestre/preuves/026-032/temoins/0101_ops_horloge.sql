-- 0101_ops_horloge.sql — TÉMOIN de 026-032 : une implémentation de référence du contrat de 026-086, écrite pour prouver que
-- scripts/horloge-sql-qa.mjs sait être VERT sur une migration conforme. Jamais appliquée.
-- Presti reste en Vercel Hobby (deux tâches planifiées par jour, prises) : l'horloge est pg_cron + pg_net. Préalables : 0096 à
-- 0100 appliquées, la route du tic déployée, le secret cron_secret posé par Benj dans l'écran Vault. Arrêter l'horloge :
-- select cron.unschedule('presti-agents-tic'), exécuté par Claude Code.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.ops_horloge_minute()
returns bigint
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $fn$
declare
  v_s text;
begin
  begin
    perform public.ops_baux_expirer();
  exception when others then
    perform public.ops_evenement_ajouter('systeme', 'horloge_erreur', 'ops_baux_expirer', left(sqlerrm, 200), null);
  end;
  begin
    perform public.ops_decisions_echues();
  exception when others then
    perform public.ops_evenement_ajouter('systeme', 'horloge_erreur', 'ops_decisions_echues', left(sqlerrm, 200), null);
  end;
  select decrypted_secret into v_s from vault.decrypted_secrets where name = 'cron_secret';
  if v_s is null then
    if not exists (select 1 from ops.evenements where type = 'horloge_sans_secret' and le > now() - interval '1 hour') then
      perform public.ops_evenement_ajouter('systeme', 'horloge_sans_secret', null, 'Aucun secret de l''horloge dans le Vault : le tic n''est pas appelé', null);
    end if;
    return null;
  end if;
  return net.http_get(url := 'https://prestiapp.fr/api/agents/tic', headers := jsonb_build_object('Authorization', 'Bearer ' || v_s), timeout_milliseconds := 30000);
end
$fn$;

create or replace function public.ops_horloge_etat(p_minutes integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $fn$
declare
  v_depuis timestamptz := now() - make_interval(mins => least(greatest(coalesce(p_minutes, 60), 1), 1440));
begin
  return jsonb_build_object(
    'job_actif', coalesce((select j.active from cron.job j where j.jobname = 'presti-agents-tic'), false),
    'planning', (select j.schedule from cron.job j where j.jobname = 'presti-agents-tic'),
    'secret_present', exists (select 1 from vault.decrypted_secrets where name = 'cron_secret'),
    'executions', (select jsonb_build_object('reussies', count(*) filter (where d.status = 'succeeded'), 'echouees', count(*) filter (where d.status = 'failed'))
                     from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                    where j.jobname = 'presti-agents-tic' and d.start_time >= v_depuis),
    'trous', (select coalesce(jsonb_agg(jsonb_build_object('debut', t.debut, 'ecart_s', t.ecart_s)), '[]'::jsonb)
                from (select y.debut, y.ecart_s
                        from (select d.start_time as debut, extract(epoch from d.start_time - lag(d.start_time) over (order by d.start_time))::int as ecart_s
                                from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                               where j.jobname = 'presti-agents-tic' and d.start_time >= v_depuis) y
                       where y.ecart_s > 300 order by y.debut desc limit 20) t),
    'reponses', (select coalesce(jsonb_object_agg(x.code, x.n), '{}'::jsonb)
                   from (select coalesce(h.status_code, 0)::text as code, count(*) as n from net._http_response h
                          where h.created >= greatest(v_depuis, now() - interval '6 hours') group by 1) x),
    'derniere_execution', (select max(d.start_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'presti-agents-tic'));
end
$fn$;

revoke all on function public.ops_horloge_minute() from public, anon, authenticated, service_role;
revoke all on function public.ops_horloge_etat(integer) from public, anon, authenticated;
grant execute on function public.ops_horloge_etat(integer) to service_role;

select cron.schedule('presti-agents-tic', '* * * * *', 'select public.ops_horloge_minute()');
select cron.schedule('presti-cron-menage', '17 3 * * *', $fn$delete from cron.job_run_details where end_time < now() - interval '7 days'$fn$);

comment on function public.ops_horloge_minute() is 'La minute de l''horloge (0101) : baux, décisions, puis le tic ; exécutable par personne.';
comment on function public.ops_horloge_etat(integer) is 'L''état de l''horloge (0101) ; jamais la valeur du secret.';
