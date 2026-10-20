---------------------------- _A_COLLER_sql_editor_0173_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
revoke execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) to service_role;
do $fige$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'facture_immuable', 'facture_non_supprimable', 'leads_photos_octets_sync', 'journal_direction_immuable', 'releve_immuable',
      'sujet_norme', 'nature_courrier', 'devis_envoye_conserve', 'acces_support_lectures_immuable', 'factures_lignes_immuables',
      'relances_jours_valides')
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $fige$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'authenticated execute appliquer_mouvement (attendu false)' as quoi, has_function_privilege('authenticated', 'public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text)', 'execute')::text as resultat
union all select 'anon execute appliquer_mouvement (attendu false)', has_function_privilege('anon', 'public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text)', 'execute')::text
union all select 'service_role execute appliquer_mouvement (attendu true)', has_function_privilege('service_role', 'public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text)', 'execute')::text
union all select 'fonctions sans search_path fige (attendu 0)', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('facture_immuable','facture_non_supprimable','leads_photos_octets_sync','journal_direction_immuable','releve_immuable','sujet_norme','nature_courrier','devis_envoye_conserve','acces_support_lectures_immuable','factures_lignes_immuables','relances_jours_valides')
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
