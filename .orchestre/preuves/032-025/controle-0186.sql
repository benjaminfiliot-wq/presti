select 'tables SMS (attendu : 3)' as quoi, count(*)::text as resultat
  from information_schema.tables where table_schema = 'public' and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'tables SMS sans RLS (attendu : aucune)', coalesce(string_agg(c.relname, ', '), 'aucune')
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not c.relrowsecurity and c.relname in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'gardes de session posées (attendu : 12)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')
   and tablename in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'droits restants pour anon (attendu : aucun)', coalesce(string_agg(distinct table_name, ', '), 'aucun')
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'écritures ouvertes à authenticated (attendu : aucune)', coalesce(string_agg(distinct table_name, ', '), 'aucune')
  from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public'
   and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'colonnes tel_source des clients (attendu : 2)', count(*)::text
  from information_schema.columns where table_schema = 'public' and table_name = 'clients' and column_name in ('tel_source', 'tel_source_le')
union all
select 'interrupteur sms_arret actif (attendu : true)', coalesce((select actif::text from ops.interrupteurs where nom = 'sms_arret'), 'absent');
