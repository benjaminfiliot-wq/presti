with attendues(signature) as (
  values ('public.ops_type_sortant(text)'),
         ('public.ops_decision_creer(text, text, text, jsonb, text, integer, text, timestamptz, text, uuid)'),
         ('public.ops_decision_trancher(uuid, text, uuid)'),
         ('public.ops_decisions_tranchees(text, timestamptz)'),
         ('public.ops_decisions_echues()'),
         ('public.ops_tache_creer(text, text, text, text, jsonb, uuid, text)'),
         ('public.ops_tache_prendre(text)'),
         ('public.ops_tache_rendre(text, uuid, text, text, text)'),
         ('public.ops_tache_clore(text, text, text)'),
         ('public.ops_baux_expirer()'),
         ('public.ops_cout_ajouter(text, text, numeric, jsonb, uuid)'),
         ('public.ops_etat()'),
         ('public.ops_stockage_octets()')
), lues as (
  select a.signature, to_regprocedure(a.signature) as fonction from attendues a
)
select l.signature || ' : existe, security definer, search_path, exécutable par service_role seul (attendu : oui)' as quoi,
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end as resultat
  from lues l
  left join pg_proc p on p.oid = l.fonction
union all
select 'les 13 fonctions de 0098 présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 13
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('ops_type_sortant', 'ops_decision_creer', 'ops_decision_trancher',
                                                  'ops_decisions_tranchees', 'ops_decisions_echues', 'ops_tache_creer',
                                                  'ops_tache_prendre', 'ops_tache_rendre', 'ops_tache_clore', 'ops_baux_expirer',
                                                  'ops_cout_ajouter', 'ops_etat', 'ops_stockage_octets')
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'ops_type_sortant est immutable (attendu : oui)',
       case when (select p.provolatile from pg_proc p where p.oid = to_regprocedure('public.ops_type_sortant(text)')) = 'i'
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.ops_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'ops\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end;
