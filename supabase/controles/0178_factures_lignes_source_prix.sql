-- Contrôle de 0178 (lecture seule) : la colonne existe sur les deux tables de lignes, en texte facultatif.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and column_name = 'source_prix' and table_name in ('devis_lignes', 'factures_lignes')
order by table_name;
-- Attendu : 2 lignes — devis_lignes | source_prix | text | YES  et  factures_lignes | source_prix | text | YES
