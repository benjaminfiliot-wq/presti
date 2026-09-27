select 'bucket usine privé, 8 Mo, les quatorze types (attendu : oui)' as quoi,
       case when exists (select 1 from storage.buckets
                          where id = 'usine' and not public and file_size_limit = 8388608
                            and cardinality(allowed_mime_types) = 14 and 'text/html' = any (allowed_mime_types)
                            and 'font/woff2' = any (allowed_mime_types))
            then 'oui' else 'non' end as resultat
union all
select 'aucune politique sur storage.objects pour usine (attendu : oui)',
       case when not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                              and (policyname ilike '%usine%' or coalesce(qual, '') ilike '%usine%'))
            then 'oui' else 'non' end
union all
select 'ops_tache_detenue : security definer, stable (attendu : oui)',
       case when exists (select 1 from pg_proc where oid = to_regprocedure('public.ops_tache_detenue(text,uuid)')
                          and prosecdef and provolatile = 's')
            then 'oui' else 'non' end
union all
select 'ops_tache_detenue : service_role seul (attendu : oui)',
       case when to_regprocedure('public.ops_tache_detenue(text,uuid)') is not null
             and has_function_privilege('service_role', 'public.ops_tache_detenue(text,uuid)', 'execute')
             and not has_function_privilege('anon', 'public.ops_tache_detenue(text,uuid)', 'execute')
             and not has_function_privilege('authenticated', 'public.ops_tache_detenue(text,uuid)', 'execute')
            then 'oui' else 'non' end
union all
select 'agent usine, période 30 min (attendu : oui)',
       case when exists (select 1 from ops.agents where nom = 'usine' and periode_minutes = 30) then 'oui' else 'non' end
union all
select 'agent livreur_usine, période 60 min (attendu : oui)',
       case when exists (select 1 from ops.agents where nom = 'livreur_usine' and periode_minutes = 60) then 'oui' else 'non' end;
