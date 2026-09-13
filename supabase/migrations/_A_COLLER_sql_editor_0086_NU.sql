---------------------------- _A_COLLER_sql_editor_0086_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.apporteurs
  add column if not exists canal boolean not null default false;
comment on column public.apporteurs.canal is 'true = CANAL d’acquisition (Facebook, LinkedIn) : un lien /a/<code> qui sert à savoir par où l’artisan est arrivé, derrière lequel il n’y a PERSONNE à rémunérer. Le relevé du partenaire lui applique un taux de 0 % et il n’entre pas dans la file de revue. false = apporteur au sens de l’article 5 du contrat : commission due. Voir verdict() dans lib/direction/apports.ts, qui teste cette colonne avant tout le reste.';
insert into public.apporteurs (code, nom, canal) values
  ('facebook', 'Facebook — canal d''acquisition', true),
  ('linkedin', 'LinkedIn — canal d''acquisition', true)
on conflict (code) do update set canal = true;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonne canal' as quoi,
       coalesce((select case when is_nullable = 'NO' then 'oui, not null, defaut ' || coalesce(column_default, '?') else 'oui' end
                   from information_schema.columns
                  where table_schema = 'public' and table_name = 'apporteurs' and column_name = 'canal'), 'NON (anormal)') as resultat
union all
select 'canaux d acquisition',
       coalesce((select string_agg(code || ' (' || nom || ')', ', ' order by code) from public.apporteurs where canal), 'aucun (anormal)')
union all
select 'apporteurs remuneres (commission due)',
       coalesce((select string_agg(code || case when actif then '' else ' [inactif]' end, ', ' order by code) from public.apporteurs where not canal), 'aucun')
union all
select 'arrivees deja rattachees a un canal',
       (select count(*)::text from public.registre_apports r join public.apporteurs a on a.id = r.apporteur_id where a.canal);
