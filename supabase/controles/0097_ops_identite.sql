with attendues(signature) as (
  values ('public.ops_agent_enregistrer(text, text, text[], text[], text[], integer, integer, integer, numeric)'),
         ('public.ops_agent_poser_jeton(text, text)'),
         ('public.ops_agent_par_jeton(text)'),
         ('public.ops_agent_retirer(text)'),
         ('public.ops_agent_pause(text, boolean, text)'),
         ('public.ops_agent_echeance(text, timestamptz)'),
         ('public.ops_battement(text)'),
         ('public.ops_evenement_ajouter(text, text, text, text, uuid)'),
         ('public.ops_evenements_lire(text, bigint, integer)'),
         ('public.ops_evenements_purger(integer)'),
         ('public.ops_interrupteur(text)'),
         ('public.ops_interrupteur_poser(text, boolean, text, uuid)')
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
select 'les 12 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 12
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('ops_agent_enregistrer', 'ops_agent_poser_jeton', 'ops_agent_par_jeton',
                                                  'ops_agent_retirer', 'ops_agent_pause', 'ops_agent_echeance', 'ops_battement',
                                                  'ops_evenement_ajouter', 'ops_evenements_lire', 'ops_evenements_purger',
                                                  'ops_interrupteur', 'ops_interrupteur_poser')
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.ops_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'ops\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end;
