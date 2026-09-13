---------------------------- _A_COLLER_sql_editor_0087_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.apporteurs
  add column if not exists canal boolean not null default false;
insert into public.apporteurs (code, nom, canal) values
  ('instagram', 'Instagram — canal d''acquisition', true),
  ('linkedindm', 'LinkedIn — messages privés (démarchage)', true)
on conflict (code) do update set canal = true;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'canaux d acquisition' as quoi,
       coalesce((select string_agg(code || ' (' || nom || ')', ', ' order by code) from public.apporteurs where canal), 'aucun (anormal)') as resultat
union all
select 'instagram est bien un canal actif',
       coalesce((select case when canal and actif then 'oui' else 'NON (anormal) : canal=' || canal || ', actif=' || actif end
                   from public.apporteurs where code = 'instagram'), 'NON (anormal) : le code n existe pas')
union all
select 'apporteurs remuneres (commission due)',
       coalesce((select string_agg(code || case when actif then '' else ' [inactif]' end, ', ' order by code) from public.apporteurs where not canal), 'aucun')
union all
select 'arrivees deja rattachees a un canal',
       (select count(*)::text from public.registre_apports r join public.apporteurs a on a.id = r.apporteur_id where a.canal);
