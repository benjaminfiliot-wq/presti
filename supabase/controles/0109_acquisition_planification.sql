with attendues(nom, calendrier) as (
  values
    ('acq-vigie-meta', '10 * * * *'),
    ('acq-recenseur', '*/10 * * * *'),
    ('acq-rge', '15 2 * * *'),
    ('acq-juge-faits', '35 * * * *'),
    ('acq-redacteur', '0 * * * *'),
    ('acq-standardiste', '*/5 * * * *'),
    ('acq-maquettes-purge', '20 2 * * *'),
    ('acq-facteur', '*/15 * * * *'),
    ('acq-facteur-soir', '0 18,19 * * *'),
    ('acq-repondeur', '*/15 * * * *'),
    ('acq-purge-prospects', '40 2 * * *')
), verdicts as (
  select a.nom,
         case when j.jobid is not null and j.active and j.schedule = a.calendrier
              then 'oui' else 'NON (absente, inactive ou calendrier différent)' end as resultat
  from attendues a
  left join cron.job j on j.jobname = a.nom
)
select nom as quoi, resultat from verdicts
union all
select 'exactement onze tâches acq actives, sans autre tâche acq' as quoi,
       case when (select count(*) from cron.job where jobname like 'acq-%' and active) = 11
                  and not exists (select 1 from cron.job where jobname like 'acq-%' and not active)
            then 'oui' else 'NON (anormal)' end as resultat;
