-- Contrôle APRÈS application de 0124 (lecture seule) : tout doit rendre true.
-- Les deux empreintes sont celles du corps des deux fonctions réécrites, calculées sur le fichier de la migration
-- (md5 du texte entre $$ et $$, fins de ligne LF) : si une ligne change dans la base ou dans le fichier, la comparaison tombe.
select
  (select md5(prosrc) from pg_proc where oid = 'ops.garde_envois()'::regprocedure) = '1d97bad6c2b8d529182a705caf96861c' as garde_envois_empreinte,
  (select md5(prosrc) from pg_proc where oid = 'public.acq_envoi_reserver(uuid,text)'::regprocedure) = 'faed5cf5b5be74fd6818d22e19d5225d' as reserver_empreinte,
  (select md5(prosrc) from pg_proc where oid = 'public.acq_envoi_approuver(uuid,jsonb)'::regprocedure) = '288daa09c4e73c7ffb133f53921ab2ff' as approuver_inchangee,
  not exists (select 1 from pg_proc where oid = 'ops.garde_envois()'::regprocedure and prosrc like '%accord_absent%') as plus_d_accord_exige_a_l_approbation,
  exists (select 1 from pg_proc where oid = 'ops.garde_envois()'::regprocedure and prosrc like '%ops:pause_generale%' and prosrc like '%ops:opposition%' and prosrc like '%ops:envoi_froid_ferme%' and prosrc like '%ops:quota%' and prosrc like '%ops:verdicts%' and prosrc like '%ops:envoi_fige%') as gardes_conservees,
  exists (select 1 from pg_proc where oid = 'public.acq_envoi_reserver(uuid,text)'::regprocedure and prosrc like '%''pause''%' and prosrc like '%''opposition''%' and prosrc like '%''plafond''%' and prosrc like '%''quota_absent''%' and prosrc like '%unique_violation%') as reservation_relit_pause_opposition_plafond,
  not has_function_privilege('anon', 'ops.garde_envois()', 'execute') and not has_function_privilege('authenticated', 'ops.garde_envois()', 'execute') and not has_function_privilege('service_role', 'ops.garde_envois()', 'execute') as garde_envois_fermee,
  has_function_privilege('service_role', 'public.acq_envoi_reserver(uuid,text)', 'execute') and not has_function_privilege('anon', 'public.acq_envoi_reserver(uuid,text)', 'execute') and not has_function_privilege('authenticated', 'public.acq_envoi_reserver(uuid,text)', 'execute') as reserver_service_role_seul,
  exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and actif = false) as envoi_froid_ferme,
  exists (select 1 from ops.interrupteurs where nom = 'pause_generale') as pause_generale_presente,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'opposition' and t.tgname = 'annuler_sur_opposition' and t.tgenabled = 'O') = 1 as declencheur_stop_actif;
