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
