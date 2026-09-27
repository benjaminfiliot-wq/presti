-- supabase/controles/0101_ops_horloge.sql — TÉMOIN de 026-032 (jamais appliqué) : ne fait que LIRE.
select 'les extensions sont présentes' as quoi,
       case when (select count(*) from pg_extension where extname in ('pg_cron', 'pg_net')) = 2 then 'oui' else 'NON' end as resultat
union all
select 'les deux tâches existent et sont actives',
       case when exists (select 1 from cron.job where jobname = 'presti-agents-tic' and active and schedule = '* * * * *')
             and exists (select 1 from cron.job where jobname = 'presti-cron-menage' and active)
            then 'oui' else 'NON' end
union all
select 'secret_present',
       case when exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') then 'oui' else 'NON' end
union all
select 'les deux fonctions sont sécurisées',
       case when (select count(*) from pg_proc where proname in ('ops_horloge_minute', 'ops_horloge_etat') and prosecdef
                   and array_to_string(proconfig, ',') like '%search_path%') = 2
            then 'oui' else 'NON' end
union all
select 'ops_horloge_minute à personne, ops_horloge_etat à service_role',
       case when not has_function_privilege('anon', 'public.ops_horloge_minute()', 'execute')
             and not has_function_privilege('authenticated', 'public.ops_horloge_minute()', 'execute')
             and not has_function_privilege('service_role', 'public.ops_horloge_minute()', 'execute')
             and has_function_privilege('service_role', 'public.ops_horloge_etat(integer)', 'execute')
            then 'oui' else 'NON' end;
