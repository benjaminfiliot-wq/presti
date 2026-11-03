select 'deposer_message definer, search_path vide [true / {search_path=""}]' as quoi, prosecdef::text || ' / ' || coalesce(proconfig::text, 'aucun') as resultat
  from pg_proc where proname = 'deposer_message' and pronamespace = 'public'::regnamespace
union all
select 'anon peut executer [false]', has_function_privilege('anon', 'public.deposer_message(jsonb)', 'execute')::text
union all
select 'authenticated peut executer [false]', has_function_privilege('authenticated', 'public.deposer_message(jsonb)', 'execute')::text
union all
select 'service_role peut executer [true]', has_function_privilege('service_role', 'public.deposer_message(jsonb)', 'execute')::text;
