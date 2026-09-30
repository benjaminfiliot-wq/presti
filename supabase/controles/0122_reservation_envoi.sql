-- Contrôle APRÈS application de 0122 (lecture seule) : tout doit rendre true.
select
  exists (select 1 from information_schema.columns where table_schema='ops' and table_name='envois' and column_name='cle_envoi') as colonne_cle,
  exists (select 1 from information_schema.columns where table_schema='ops' and table_name='envois' and column_name='reserve_le') as colonne_reserve_le,
  exists (select 1 from pg_trigger where tgrelid='ops.envois'::regclass and tgname='garde_reservation' and not tgisinternal) as declencheur,
  (select count(*) = 4 from pg_proc where proname in ('acq_envoi_reserver','acq_envoi_incertain','acq_envoi_reconcilier','acq_envois_orphelins')) as quatre_fonctions,
  not has_function_privilege('anon','public.acq_envoi_reserver(uuid,text)','execute') as anon_refuse,
  has_function_privilege('service_role','public.acq_envoi_reserver(uuid,text)','execute') as service_ok;
