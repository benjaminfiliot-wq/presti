---------------------------- _A_COLLER_sql_editor_0110_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('usine', 'usine', false, 8388608, array['text/html', 'text/css', 'text/javascript', 'application/javascript',
  'application/json', 'image/webp', 'image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'font/woff2', 'text/plain',
  'application/xml', 'text/xml']::text[])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;
create or replace function public.ops_tache_detenue(p_agent text, p_id uuid)
returns table (id uuid, type text, cle_idempotence text, capacite text, charge jsonb, bail_jusqua timestamptz)
language sql stable security definer set search_path = pg_catalog, ops as $$
  select t.id, t.type, t.cle_idempotence, t.capacite, t.charge, t.bail_jusqua
    from ops.taches t
   where t.id = p_id and t.agent = p_agent and t.statut = 'bail' and t.bail_jusqua > now()
$$;
revoke all on function public.ops_tache_detenue(text, uuid) from public, anon, authenticated;
grant execute on function public.ops_tache_detenue(text, uuid) to service_role;
comment on function public.ops_tache_detenue(text, uuid) is
  'Rend la tâche détenue par p_agent sous un bail vivant (026-054), ou zéro ligne sinon. Lecture seule, sans événement : la porte de la route de dépôt de l''usine.';
select public.ops_agent_enregistrer('usine', 'Surveillance de l''usine', array['surveillance']::text[], array[]::text[],
  array['evenements', 'decisions']::text[], 30, 30, 2, 0);
select public.ops_agent_enregistrer('livreur_usine', 'Livreur de sites (usine)', array['livraison']::text[], array[]::text[],
  array['taches', 'evenements']::text[], 60, 30, 0, 0);

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
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
