-- 0115 · Contrôle en lecture seule (fiche 026-251) : à lancer APRÈS l'application, il ne fait que LIRE.
-- Chaque ligne « resultat » doit valoir « oui ».
select 'les trois graines existent, sans jeton, sans pause, sans capacité (attendu : oui)' as quoi,
       case when (select count(*) from ops.agents a where a.nom in ('sav', 'qualite_sites', 'vigile') and a.retire_le is null
                     and a.jeton_hash is null and not a.en_pause and a.capacites = '{}'::text[]) = 3
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'les trois fonctions existent (vigile_conseiller, vigile_agents, pilotage_activite_salles) (attendu : oui)',
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')) = 3
            then 'oui' else 'NON (anormal)' end
union all
select 'security definer, search_path posé, exécution pour service_role seul : anon et authenticated refusés (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')
                                and (not p.prosecdef or p.proconfig is null
                                     or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
                                     or has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')
                                     or not has_function_privilege('service_role', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'vigile_conseiller rend ses six contrôles, des comptes positifs ou nuls (attendu : oui)',
       case when (select count(*) from public.vigile_conseiller()) = 6
             and not exists (select 1 from public.vigile_conseiller() where nombre is null or nombre < 0)
            then 'oui' else 'NON (anormal)' end
union all
select 'vigile_agents rend une ligne par agent non retiré (attendu : oui)',
       case when (select count(*) from public.vigile_agents()) = (select count(*) from ops.agents where retire_le is null)
            then 'oui' else 'NON (anormal)' end
union all
select 'pilotage_activite_salles rend les vingt salles (attendu : oui)',
       case when (select count(*) from public.pilotage_activite_salles(now() - interval '1 day')) = 20
            then 'oui' else 'NON (anormal)' end;
