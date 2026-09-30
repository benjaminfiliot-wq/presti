select p.proname as fonction,
       p.prosecdef,
       p.provolatile = 's' as stable,
       p.proconfig,
       not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_refuse,
       not has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_refuse,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_autorise
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'pilotage_envois_du_jour','pilotage_compteurs_du_jour','pilotage_compteurs_technologies',
 'pilotage_entonnoir','pilotage_bilan_date','pilotage_bilan','pilotage_appels',
 'pilotage_etat_envoi','pilotage_reponses_du_jour','pilotage_tapis',
 'pilotage_recettes_agents','pilotage_atelier','pilotage_reponses_recentes')
order by p.proname;
select to_regprocedure('ops.pilotage_commande_du_prospect(uuid)') is null as jointure_privee_absente;
