-- supabase/controles/0100_ops_file_argent.sql — TÉMOIN de 026-032 (jamais appliqué) : ne fait que LIRE.
select 'l''extension pgmq est présente' as quoi,
       case when exists (select 1 from pg_extension where extname = 'pgmq') then 'oui' else 'NON' end as resultat
union all
select 'la file argent existe',
       case when exists (select 1 from pgmq.list_queues() where queue_name = 'argent') then 'oui' else 'NON' end
union all
select 'la table a la RLS',
       case when exists (select 1 from pg_class where oid = to_regclass('ops.argent_messages') and relrowsecurity) then 'oui' else 'NON' end
union all
select 'les 5 fonctions sont sécurisées',
       case when (select count(*) from pg_proc
                   where proname in ('ops_argent_envoyer', 'ops_argent_lire', 'ops_argent_fait', 'ops_argent_etat', 'ops_argent_essai_effacer')
                     and prosecdef and array_to_string(proconfig, ',') like '%search_path%') = 5
             and not has_function_privilege('anon', 'public.ops_argent_etat()', 'execute')
            then 'oui' else 'NON' end
union all
select 'anon sans usage de pgmq',
       case when not has_schema_privilege('anon', 'pgmq', 'usage') then 'oui' else 'NON' end;
