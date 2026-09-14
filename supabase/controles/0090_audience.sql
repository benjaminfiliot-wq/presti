select 'tables audience' as quoi,
       coalesce((select string_agg(tablename || case when rowsecurity then ' (RLS)' else ' (RLS ABSENTE, anormal)' end, ', ' order by tablename) from pg_tables where schemaname = 'public' and tablename in ('audience_vues', 'audience_jours')), 'ABSENTES (anormal)') as resultat
union all
select 'politiques (attendu : aucune)',
       coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname = 'public' and tablename in ('audience_vues', 'audience_jours')), 'aucune')
union all
select 'fonctions',
       coalesce((select string_agg(proname, ', ' order by proname) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('audience_direct', 'audience_historique', 'audience_cloturer')), 'ABSENTES (anormal)')
union all
select 'appel depuis le navigateur (attendu : non)',
       case when has_function_privilege('anon', 'public.audience_direct()', 'execute') or has_table_privilege('anon', 'public.audience_vues', 'select') then 'OUI (anormal)' else 'non' end;
