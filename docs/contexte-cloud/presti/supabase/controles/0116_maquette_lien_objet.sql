select 'acq_maquette_par_jeton rend objet ET objets (attendu : oui)' as quoi,
       case when pg_get_functiondef(to_regprocedure('public.acq_maquette_par_jeton(text)')) ilike '%''objet'', m.objet%'
             and pg_get_functiondef(to_regprocedure('public.acq_maquette_par_jeton(text)')) ilike '%''objets'', m.objets%'
            then 'oui' else 'non' end as resultat
union all
select 'acq_maquette_par_jeton : security definer, stable (attendu : oui)',
       case when exists (select 1 from pg_proc where oid = to_regprocedure('public.acq_maquette_par_jeton(text)')
                          and prosecdef and provolatile = 's')
            then 'oui' else 'non' end
union all
select 'acq_maquette_par_jeton : service_role seul (attendu : oui)',
       case when to_regprocedure('public.acq_maquette_par_jeton(text)') is not null
             and has_function_privilege('service_role', 'public.acq_maquette_par_jeton(text)', 'execute')
             and not has_function_privilege('anon', 'public.acq_maquette_par_jeton(text)', 'execute')
             and not has_function_privilege('authenticated', 'public.acq_maquette_par_jeton(text)', 'execute')
            then 'oui' else 'non' end
union all
select 'aucune autre fonction acq_* touchée par 0116 (attendu : oui)',
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname like 'acq\_%') = 63
            then 'oui' else 'non' end;
