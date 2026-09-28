-- Contrôle TÉMOIN de 0106 (lecture seule).
select 'fonction ' || f as quoi,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f and p.prosecdef)
            then 'oui' else 'NON' end as resultat
  from unnest(array['acq_envoi_preparer', 'acq_envoi_approuver', 'acq_envoi_envoye', 'acq_formulaires_a_porter', 'acq_formulaire_echec',
                    'acq_reponse_recue', 'acq_reponse_reclasser', 'acq_preuves_a_garder', 'acq_decision_creer', 'acq_echanges_purger']) f
union all
select 'bucket maquettes privé', case when exists (select 1 from storage.buckets where id = 'maquettes' and not public and file_size_limit = 3145728) then 'oui' else 'NON' end
union all
select 'déclencheur de la fenêtre de Meta', case when exists (select 1 from pg_trigger where tgname = 'envois_garde_fenetre_meta') then 'oui' else 'NON' end;
