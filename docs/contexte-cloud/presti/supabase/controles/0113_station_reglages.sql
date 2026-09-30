-- 0113 · Contrôle en lecture seule (fiche 026-175) : à lancer APRÈS l'application, il ne fait que LIRE.
-- Chaque ligne « resultat » doit valoir « oui ».
select 'les cinq fonctions existent (station_reglages_lire, station_reglages_ecrire, pilotage_radar, pilotage_prospects_departements, pilotage_activite_salles) (attendu : oui)' as quoi,
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname in ('station_reglages_lire', 'station_reglages_ecrire', 'pilotage_radar',
                     'pilotage_prospects_departements', 'pilotage_activite_salles')) = 5
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'security definer (prosecdef), search_path posé (proconfig), exécution pour service_role seul : anon et authenticated refusés (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname in ('station_reglages_lire', 'station_reglages_ecrire', 'pilotage_radar',
                                'pilotage_prospects_departements', 'pilotage_activite_salles')
                                and (not p.prosecdef or p.proconfig is null
                                     or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
                                     or has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')
                                     or not has_function_privilege('service_role', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.station_reglages et ops.station_reglages_historique sous RLS (relrowsecurity), sans politique (pg_policies), sans droit pour anon, authenticated ni service_role (attendu : oui)',
       case when (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'ops' and c.relname in ('station_reglages', 'station_reglages_historique') and c.relrowsecurity) = 2
             and not exists (select 1 from pg_policies where schemaname = 'ops' and tablename like 'station\_reglages%')
             and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                              where n.nspname = 'ops' and c.relname in ('station_reglages', 'station_reglages_historique')
                                and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select')
                                     or has_table_privilege('service_role', c.oid, 'select')))
            then 'oui' else 'NON (anormal)' end
union all
select 'une seule ligne de réglages au plus, et jamais plus de 50 versions d''historique (attendu : oui)',
       case when (select count(*) from ops.station_reglages) <= 1
             and (select count(*) from ops.station_reglages_historique) <= 50 then 'oui' else 'NON (anormal)' end;
