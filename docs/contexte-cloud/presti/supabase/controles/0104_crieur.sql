-- 0104 · Contrôle en lecture seule (fiche 026-134) : à lancer APRÈS l'application, il ne fait que LIRE.
-- Chaque ligne « resultat » doit valoir « oui ».
select 'la table public.crieur_posts existe (attendu : oui)' as quoi,
       case when to_regclass('public.crieur_posts') is not null then 'oui' else 'NON (anormal)' end as resultat
union all
select 'crieur_posts sous RLS (relrowsecurity), sans aucune politique (pg_policies) (attendu : oui)',
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'public' and c.relname = 'crieur_posts' and c.relrowsecurity)
             and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crieur_posts')
            then 'oui' else 'NON (anormal)' end
union all
select 'anon et authenticated sans aucun droit sur crieur_posts (attendu : oui)',
       case when not has_table_privilege('anon', 'public.crieur_posts', 'select') and not has_table_privilege('authenticated', 'public.crieur_posts', 'select')
             and not has_table_privilege('anon', 'public.crieur_posts', 'insert') and not has_table_privilege('authenticated', 'public.crieur_posts', 'insert')
            then 'oui' else 'NON (anormal)' end
union all
select 'crieur_appel : security definer et exécutable par personne, ni anon, ni authenticated, ni service_role (attendu : oui)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'crieur_appel' and p.prosecdef
                            and not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
                            and not has_function_privilege('service_role', p.oid, 'execute'))
            then 'oui' else 'NON (anormal)' end
union all
select 'la tâche presti-crieur est planifiée « 0 5 * * * » et active (attendu : oui)',
       case when exists (select 1 from cron.job j where j.jobname = 'presti-crieur' and j.schedule = '0 5 * * *' and j.active)
            then 'oui' else 'NON (anormal)' end;
