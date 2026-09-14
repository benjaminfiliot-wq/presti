select 'flux : seulement a, chemin, entree (attendu : oui)' as quoi,
       case when coalesce((select bool_and(k in ('a', 'chemin', 'entree')) from jsonb_array_elements(public.audience_direct()->'flux') x, jsonb_object_keys(x) k), true) then 'oui' else 'NON (anormal)' end as resultat
union all
select 'définition sans source/appareil/pays dans le flux (attendu : oui)',
       case when pg_get_functiondef('public.audience_direct()'::regprocedure) ~ '''flux''[^$]*''(source|appareil|pays)''' then 'NON (anormal)' else 'oui' end
union all
select 'campagnes sans /login ni /signup (attendu : oui)',
       case when pg_get_functiondef('public.audience_direct()'::regprocedure) like '%chemin not in (''/login'', ''/signup'')%' then 'oui' else 'NON (anormal)' end
union all
select 'appel depuis le navigateur (attendu : non)',
       case when has_function_privilege('anon', 'public.audience_direct()', 'execute') or has_function_privilege('authenticated', 'public.audience_direct()', 'execute') then 'OUI (anormal)' else 'non' end;
