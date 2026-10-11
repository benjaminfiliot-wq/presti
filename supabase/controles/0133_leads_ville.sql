-- Contrôle de 0133 (leads.ville) : une ligne par vérification, `ok` doit être vrai partout. Lecture seule.
select 'colonne leads.ville en text' as verification,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'leads' and column_name = 'ville' and data_type = 'text') as ok
union all
select 'contrainte leads_ville_borne validée',
       exists (select 1 from pg_constraint where conname = 'leads_ville_borne' and conrelid = 'public.leads'::regclass and convalidated)
union all
select 'aucune ville hors bornes',
       not exists (select 1 from public.leads where ville is not null and char_length(ville) not between 1 and 80)
union all
select 'RLS toujours active sur leads',
       (select relrowsecurity from pg_class where oid = 'public.leads'::regclass);
