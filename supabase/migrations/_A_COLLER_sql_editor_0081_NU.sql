---------------------------- _A_COLLER_sql_editor_0081_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.factures add column if not exists tva_regime text
  check (tva_regime is null or tva_regime in ('franchise', 'reel'));
comment on column public.factures.tva_regime is
  'Le régime de TVA de l''artisan AU MOMENT DE L''ÉMISSION (0081). Le PDF est régénéré à la demande : sans cette colonne, une facture émise à 20 % se réimprimait à 0 % le jour où l''artisan repassait en franchise. NULL = facture antérieure à 0081, le régime courant s''applique faute de mieux.';
update public.factures
   set tva_regime = case when coalesce(total_tva, 0) > 0 then 'reel' else null end
 where tva_regime is null and verrouillee = true and coalesce(total_tva, 0) > 0;

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
