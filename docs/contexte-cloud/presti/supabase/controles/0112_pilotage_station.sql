select p.proname as fonction,
       p.prosecdef,
       p.provolatile = 's' as stable,
       p.proconfig,
       not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_refuse,
       not has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_refuse,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_autorise
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
 'station_consigne_transmettre','station_reunion_ouvrir','station_reunion_clore','station_reunion_abandonner',
 'station_reunions_echues_abandonner','station_experience_lancer','station_experience_arreter',
 'station_experiences_echues_arreter','station_pause_par_agent','station_consigne_par_agent',
 'station_reunion_chiffres','station_reunion_lire','station_objectif_actif','station_experience_etat')
order by p.proname;
select c.relname as table_ops,
       c.relrowsecurity as row_level_security_active,
       (select count(*) from pg_policies pp where pp.schemaname = 'ops' and pp.tablename = c.relname) as politiques,
       not has_table_privilege('service_role', c.oid, 'SELECT') as service_role_sans_lecture
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'ops' and c.relname in ('reunions', 'experiences')
order by c.relname;
select j.jobname, j.schedule, j.active, j.command
from cron.job j
where j.jobname in ('station-reunions-echues', 'station-experiences-echues')
order by j.jobname;
select a.nom, a.capacites, a.types_crees, a.tables_ecrites, a.plafond_euros_jour
from ops.agents a
where a.nom = 'pont_telegram';
