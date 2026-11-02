select 'tables neuves (attendu : 7)' as quoi, count(*)::text as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'tables neuves sans RLS (attendu : aucune)', coalesce(string_agg(c.relname, ', '), 'aucune')
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not c.relrowsecurity
   and c.relname in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'gardes de session posées (attendu : 28)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')
   and tablename in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'droits restants pour anon (attendu : aucun)', coalesce(string_agg(distinct table_name, ', '), 'aucun')
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'écritures ouvertes à authenticated (attendu : aucune)', coalesce(string_agg(distinct table_name, ', '), 'aucune')
  from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public'
   and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'index unique des opportunités ouvertes (attendu : 1)', count(*)::text
  from pg_catalog.pg_indexes where schemaname = 'public' and indexname = 'opportunites_ouverte_unique'
union all
select 'colonne motif des arrêts d impayé (attendu : 1)', count(*)::text
  from information_schema.columns where table_schema = 'public' and table_name = 'relances_impayes_arrets' and column_name = 'motif';
