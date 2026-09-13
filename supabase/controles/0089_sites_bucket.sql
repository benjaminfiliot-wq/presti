select 'bucket sites' as quoi,
       coalesce((select case when public then 'PUBLIC (anormal)' else 'privé, limite ' || coalesce(file_size_limit::text, '?') || ' octets' end from storage.buckets where id = 'sites'), 'ABSENT (anormal)') as resultat
union all
select 'politiques sur le bucket sites',
       coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual ilike '%''sites''%' or with_check ilike '%''sites''%')), 'aucune (attendu : le service_role seul)')
union all
select 'place utilisee (Mo, tous buckets)',
       coalesce((select round(sum((metadata->>'size')::bigint) / 1048576.0, 1)::text from storage.objects), '0');
