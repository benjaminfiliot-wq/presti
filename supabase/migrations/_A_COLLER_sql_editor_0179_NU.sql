---------------------------- _A_COLLER_sql_editor_0179_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
drop policy if exists factures_insert_own on public.factures;
drop policy if exists factures_lignes_insert_own on public.factures_lignes;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle de 0179 (lecture seule).
select 'politiques d insertion client restantes (attendu 0)' as quoi, count(*)::text as resultat
  from pg_policies where schemaname = 'public' and tablename in ('factures', 'factures_lignes') and policyname in ('factures_insert_own', 'factures_lignes_insert_own')
union all select 'lecture a soi toujours la (attendu 2)', count(*)::text
  from pg_policies where schemaname = 'public' and tablename in ('factures', 'factures_lignes') and policyname in ('factures_select_own', 'factures_lignes_select_own')
union all select 'RLS active sur les deux tables (attendu 2)', count(*)::text
  from pg_class where oid in ('public.factures'::regclass, 'public.factures_lignes'::regclass) and relrowsecurity;
