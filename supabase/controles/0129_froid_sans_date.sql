-- Contrôle APRÈS application de 0129 (lecture seule) : tout doit rendre true.
-- L'empreinte est celle du corps de acq_envoi_froid_ouvrir calculée sur le fichier de la migration (md5 du texte entre $$ et $$,
-- fins de ligne LF) ; les autres lignes prouvent que les garde-fous de l'ouverture sont tous restés en place.
select
  (select md5(prosrc) from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure) = '0d0aa4bcfc9edf71cb653f8e5ffb190a' as ouvrir_empreinte,
  not exists (select 1 from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure and (prosrc like '%2026-10%' or prosrc like '%ops:trop_tot%' or prosrc like '%current_date%' or prosrc like '%now()%')) as plus_de_date,
  exists (select 1 from pg_proc where oid = 'public.acq_envoi_froid_ouvrir(uuid)'::regprocedure and prosrc like '%is_founder%' and prosrc like '%ops:auteur%' and prosrc like '%ops:mesure_absente%' and prosrc like '%ops:epreuve_absente%' and prosrc like '%ops:notice_absente%' and prosrc like '%acq_palier_appliquer%') as garde_fous_presents,
  has_function_privilege('service_role', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') and not has_function_privilege('anon', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.acq_envoi_froid_ouvrir(uuid)', 'execute') as droits_inchanges,
  exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and actif = false) as envoi_froid_toujours_ferme,
  not exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and motif like '%12/10%') as motif_sans_date;
