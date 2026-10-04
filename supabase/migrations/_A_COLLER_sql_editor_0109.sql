---------------------------- _A_COLLER_sql_editor_0109.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
select cron.schedule('acq-vigie-meta', '10 5-8 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/vigie-meta', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-recenseur', '*/10 5-19 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/recenseur', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-rge', '15 2 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/recenseur?passe=rge', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-juge-faits', '35 6-19 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/juge-faits', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-redacteur', '0 5,12 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/redacteur', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-standardiste', '*/5 * * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/standardiste', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-maquettes-purge', '20 2 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/maquettes-purge', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-facteur', '*/15 * * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/facteur', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-facteur-soir', '0 18,19 * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/facteur?passe=soir', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-repondeur', '*/15 * * * *', $$ select net.http_get(url := 'https://prestiapp.fr/api/cron/repondeur', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')), timeout_milliseconds := 60000) $$);
select cron.schedule('acq-purge-prospects', '40 2 * * *', $$ select public.acq_purger(); select public.acq_echanges_purger(); $$);

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
with attendues(nom, calendrier) as (
  values
    ('acq-vigie-meta', '10 5-8 * * *'),
    ('acq-recenseur', '*/10 5-19 * * *'),
    ('acq-rge', '15 2 * * *'),
    ('acq-juge-faits', '35 6-19 * * *'),
    ('acq-redacteur', '0 5,12 * * *'),
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
