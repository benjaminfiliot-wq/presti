select 'audience_cloturer (attendu : p_mois integer → jsonb, une seule)' as quoi,
       coalesce((select string_agg(pg_get_function_identity_arguments(oid) || ' → ' || pg_get_function_result(oid), ' ; ') from pg_proc where pronamespace = 'public'::regnamespace and proname = 'audience_cloturer'), 'ABSENTE (anormal)') as resultat
union all
select 'flux sans campagne ni navigateur (attendu : oui)',
       case when pg_get_functiondef('public.audience_direct()'::regprocedure) like '%''navigateur''%' then 'NON (anormal)' else 'oui' end
union all
select 'appel depuis le navigateur (attendu : non)',
       case when has_function_privilege('anon', 'public.audience_cloturer(integer)', 'execute') or has_function_privilege('authenticated', 'public.audience_cloturer(integer)', 'execute') or has_function_privilege('anon', 'public.audience_direct()', 'execute') then 'OUI (anormal)' else 'non' end
union all
select 'créneaux de plafond audience terminés encore en base (0 après la prochaine clôture)',
       (select count(*)::text from public.limites where cle like 'audience:%' and fenetre + make_interval(secs => fenetre_s) <= now());
