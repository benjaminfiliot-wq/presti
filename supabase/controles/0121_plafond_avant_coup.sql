-- 0121 · Contrôle en lecture seule (juge garde-plafond-qa) : à lancer APRÈS l'application, il ne fait que LIRE.
-- Chaque ligne « resultat » doit valoir « oui ».
select 'le plafond par défaut d''un agent est 0 (attendu : oui)' as quoi,
       case when (select column_default from information_schema.columns where table_schema = 'ops' and table_name = 'agents' and column_name = 'plafond_euros_jour') = '0' then 'oui' else 'NON (anormal)' end as resultat
union all
select 'aucun agent n''a un plafond non nul (attendu : oui)',
       case when not exists (select 1 from ops.agents where plafond_euros_jour <> 0) then 'oui' else 'NON (anormal)' end
union all
select 'ops_cout_autoriser existe, service_role seul peut l''exécuter (attendu : oui)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ops_cout_autoriser')
             and not has_function_privilege('anon', 'public.ops_cout_autoriser(text,numeric)', 'execute')
             and not has_function_privilege('authenticated', 'public.ops_cout_autoriser(text,numeric)', 'execute')
             and has_function_privilege('service_role', 'public.ops_cout_autoriser(text,numeric)', 'execute') then 'oui' else 'NON (anormal)' end;
