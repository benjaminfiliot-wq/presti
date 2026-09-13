---------------------------- _A_COLLER_sql_editor_0089_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
insert into storage.buckets (id, name, public, file_size_limit)
values ('sites', 'sites', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;
drop policy if exists "sites_public_read" on storage.objects;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'bucket sites' as quoi,
       coalesce((select case when public then 'PUBLIC (anormal)' else 'privé, limite ' || coalesce(file_size_limit::text, '?') || ' octets' end from storage.buckets where id = 'sites'), 'ABSENT (anormal)') as resultat
union all
select 'politiques sur le bucket sites',
       coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual ilike '%''sites''%' or with_check ilike '%''sites''%')), 'aucune (attendu : le service_role seul)')
union all
select 'place utilisee (Mo, tous buckets)',
       coalesce((select round(sum((metadata->>'size')::bigint) / 1048576.0, 1)::text from storage.objects), '0');
