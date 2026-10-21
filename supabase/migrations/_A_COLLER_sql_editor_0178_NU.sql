---------------------------- _A_COLLER_sql_editor_0178_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.factures_lignes add column if not exists source_prix text;
comment on column public.factures_lignes.source_prix is
  'D''où vient ce prix, recopié de la ligne du devis : "vos tarifs · <fournisseur> · <date>", "ordre de grandeur du marché" ou "estimation" (0178, 21/10/2026).';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle de 0178 (lecture seule) : la colonne existe sur les deux tables de lignes, en texte facultatif.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and column_name = 'source_prix' and table_name in ('devis_lignes', 'factures_lignes')
order by table_name;
-- Attendu : 2 lignes — devis_lignes | source_prix | text | YES  et  factures_lignes | source_prix | text | YES
