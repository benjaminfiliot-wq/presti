-- Contrôle APRÈS application de 0123 (lecture seule) : tout doit rendre true.
select
  exists (select 1 from information_schema.columns where table_schema='ops' and table_name='reponses' and column_name='expediteur') as colonne_expediteur,
  exists (select 1 from pg_proc where proname='acq_reponse_recue' and pronargs=2) as reponse_recue_2_arguments,
  not exists (select 1 from pg_proc where proname='acq_reponse_recue' and pronargs=1) as ancienne_forme_retiree,
  not has_function_privilege('anon','public.acq_reponse_recue(jsonb,text)','execute') as anon_refuse,
  not exists (select 1 from ops.reponses where classe='hors_fil' and classe_par is null and traitee_le is null) as plus_de_hors_fil_pose_par_la_base;
