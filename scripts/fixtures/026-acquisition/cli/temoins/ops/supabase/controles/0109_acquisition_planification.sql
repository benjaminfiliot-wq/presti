-- Contrôle TÉMOIN de 0109 (lecture seule).
select n as quoi, case when exists (select 1 from cron.job j where j.jobname = n and j.active) then 'oui' else 'NON' end as resultat
  from unnest(array['acq-vigie-meta', 'acq-recenseur', 'acq-rge', 'acq-juge-faits', 'acq-redacteur', 'acq-standardiste', 'acq-maquettes-purge', 'acq-facteur', 'acq-facteur-soir', 'acq-repondeur', 'acq-purge-prospects']) n;
