---------------------------- _A_COLLER_sql_editor_0187_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
alter table public.factures add column if not exists envoyee_le timestamptz;
alter table public.factures drop constraint if exists factures_envoyee_scellee;
alter table public.factures add constraint factures_envoyee_scellee check (envoyee_le is null or coalesce(verrouillee, false));
comment on column public.factures.envoyee_le is
  'Premier envoi de la facture émise à son client par Presti (0187), écrit par la route d envoi. Null : jamais envoyée par Presti, ou envoyée avant 0187.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonne factures.envoyee_le (attendu : 1)' as quoi, count(*)::text as resultat
  from information_schema.columns where table_schema = 'public' and table_name = 'factures' and column_name = 'envoyee_le'
union all
select 'contrainte factures_envoyee_scellee (attendu : 1)', count(*)::text
  from pg_catalog.pg_constraint where conname = 'factures_envoyee_scellee';
