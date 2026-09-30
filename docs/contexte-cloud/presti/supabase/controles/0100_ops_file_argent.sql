with fonctions(signature) as (
  values ('public.ops_argent_envoyer(text,text,jsonb,integer)'),
         ('public.ops_argent_lire(integer,integer)'),
         ('public.ops_argent_fait(bigint,text,jsonb)'),
         ('public.ops_argent_etat()'),
         ('public.ops_argent_essai_effacer()')
), lues as (
  select f.signature, to_regprocedure(f.signature) as fonction from fonctions f
), table_argent as (
  select to_regclass('ops.argent_messages') as t
)
select 'extension pgmq installée (pg_extension) (attendu : oui)' as quoi,
       case when exists (select 1 from pg_extension where extname = 'pgmq')
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'file argent existe (pgmq.list_queues()) (attendu : oui)',
       case when exists (select 1 from pgmq.list_queues() where queue_name = 'argent')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.argent_messages : existe, RLS active (relrowsecurity), sans politique, aucun droit pour anon, authenticated ni service_role (attendu : oui)',
       case when x.t is not null
             and (select c.relrowsecurity from pg_class c where c.oid = x.t)
             and not exists (select 1 from pg_policy p where p.polrelid = x.t)
             and not has_table_privilege('anon', x.t, 'select, insert, update, delete')
             and not has_table_privilege('authenticated', x.t, 'select, insert, update, delete')
             and not has_table_privilege('service_role', x.t, 'select, insert, update, delete')
            then 'oui' else 'NON (anormal)' end
  from table_argent x
union all
select 'les 5 fonctions ops_argent_* existent, security definer (prosecdef), search_path avec pgmq (proconfig), exécutables par service_role seul (has_function_privilege), rien pour anon ni authenticated (attendu : oui)',
       case when (select count(*) from lues l where l.fonction is not null) = 5
             and not exists (select 1 from lues l join pg_proc p on p.oid = l.fonction
                              where not coalesce(p.prosecdef, false)
                                 or not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c like 'search_path=%pgmq%')
                                 or has_function_privilege('anon', l.fonction, 'execute')
                                 or has_function_privilege('authenticated', l.fonction, 'execute')
                                 or not has_function_privilege('service_role', l.fonction, 'execute'))
            then 'oui' else 'NON (anormal)' end
union all
select 'anon et authenticated sans usage du schéma pgmq (has_schema_privilege) (attendu : oui)',
       case when not has_schema_privilege('anon', 'pgmq', 'usage') and not has_schema_privilege('authenticated', 'pgmq', 'usage')
            then 'oui' else 'NON (anormal)' end
union all
select 'une seule version de chaque fonction ops_argent_* (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname in ('ops_argent_envoyer', 'ops_argent_lire', 'ops_argent_fait', 'ops_argent_etat', 'ops_argent_essai_effacer')
                              group by n.nspname, p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end;
