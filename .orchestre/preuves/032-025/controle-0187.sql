select 'colonne factures.envoyee_le (attendu : 1)' as quoi, count(*)::text as resultat
  from information_schema.columns where table_schema = 'public' and table_name = 'factures' and column_name = 'envoyee_le'
union all
select 'contrainte factures_envoyee_scellee (attendu : 1)', count(*)::text
  from pg_catalog.pg_constraint where conname = 'factures_envoyee_scellee';
