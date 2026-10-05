-- Contrôle APRÈS application de 0131 (lecture seule) : tout doit rendre true.
-- Les empreintes sont celles du corps des deux fonctions calculées sur le fichier de la migration (md5 du texte entre $$ et $$,
-- fins de ligne LF). 0131 REMPLACE la définition de acq_envoi_froid_ouvrir posée par 0129 (le contrôle de 0129 qui exige
-- ops:epreuve_absente décrit l'état d'alors) et celle de acq_palier_evaluer posée par 0111.
select
  (select md5(prosrc) from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure) = '18b06dafa31494993743171ebbc18456' as ouvrir_empreinte,
  (select md5(prosrc) from pg_proc where oid = 'public.acq_palier_evaluer()'::regprocedure) = 'b28def308c0780b2c345ecb3924fcbf6' as evaluer_empreinte,
  exists (select 1 from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure and prosrc like '%is_founder%' and prosrc like '%ops:auteur%' and prosrc like '%ops:mesure_absente%' and prosrc like '%ops:notice_absente%' and prosrc like '%acq_palier_appliquer%') as garde_fous_ouverture_presents,
  not exists (select 1 from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure and (prosrc like '%ops:epreuve_absente%' or prosrc like '%2026-10%' or prosrc like '%ops:trop_tot%')) as ouverture_sans_epreuve_ni_date,
  exists (select 1 from pg_proc where oid = 'public.acq_palier_evaluer()'::regprocedure and prosrc like '%epreuve_bout_en_bout%' and prosrc like '%interval ''30 days''%' and prosrc like '%epreuve_ok%' and prosrc like '%froid_ouvert%' and prosrc like '%palier_attente_epreuve%') as montee_gardee,
  not exists (select 1 from pg_proc where oid = 'public.acq_palier_evaluer()'::regprocedure and prosrc like '%''bilan_p3''%') as plus_de_type_invalide,
  has_function_privilege('service_role', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') and not has_function_privilege('anon', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') as droits_ouvrir_inchanges,
  has_function_privilege('service_role', 'public.acq_palier_evaluer()', 'execute') and not has_function_privilege('anon', 'public.acq_palier_evaluer()', 'execute') and not has_function_privilege('authenticated', 'public.acq_palier_evaluer()', 'execute') as droits_evaluer_inchanges,
  exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and actif = false) as envoi_froid_toujours_ferme,
  (select palier from ops.etat_envoi where id) = 'P0' as palier_toujours_p0;
