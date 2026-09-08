---------------------------- _A_COLLER_sql_editor_0077_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.registre_apports add column if not exists taux_pct integer
  check (taux_pct is null or (taux_pct >= 10 and taux_pct <= 20));
comment on column public.registre_apports.taux_pct is
  'Commission décidée par Benjamin pour CET apport, en pourcentage entier, bornée à la fourchette du contrat (10 à 20). NULL = rien de décidé, la règle par défaut s''applique (20 % si l''apport compte, 10 % s''il est contesté). Un apport contesté reste plafonné à 10 % quoi qu''il y ait ici : le contrat prime sur le réglage.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables' as quoi, string_agg(table_name, ', ' order by table_name) as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('tickets', 'acces_support', 'acces_support_lectures', 'support_verrou')
union all
select 'fonctions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines where routine_schema = 'public' and routine_name like '%support%'
union all
select 'policies fondateur restantes', coalesce(string_agg(policyname, ', '), 'aucune (attendu)')
  from pg_policies where schemaname = 'public' and policyname like 'founders_all_%';
