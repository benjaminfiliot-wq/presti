-- Contrôle APRÈS application de 0130 (lecture seule) : tout doit rendre true.
select
  (select md5(prosrc) from pg_proc where oid = 'public.ops_interrupteur_poser(text,boolean,text,uuid)'::regprocedure) = '556c46a0b30829a6f69f66d7850c66d5' as poser_empreinte,
  exists (select 1 from pg_proc where oid = 'public.ops_interrupteur_poser(text,boolean,text,uuid)'::regprocedure and prosrc like '%ops:envoi_froid_par_geste%' and prosrc like '%ops:auteur%' and prosrc like '%is_founder%') as porte_fermee,
  has_function_privilege('service_role', 'public.ops_interrupteur_poser(text,boolean,text,uuid)', 'execute') and not has_function_privilege('anon', 'public.ops_interrupteur_poser(text,boolean,text,uuid)', 'execute') and not has_function_privilege('authenticated', 'public.ops_interrupteur_poser(text,boolean,text,uuid)', 'execute') as droits_inchanges,
  exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and actif = false) as envoi_froid_toujours_ferme;
