-- 0173 — Audit de sécurité final du 20/10 (conseiller de sécurité Supabase).
--
-- 1. appliquer_mouvement(p_artisan, …) est SECURITY DEFINER et prend l'artisan EN PARAMÈTRE : appelée directement par
--    /rest/v1/rpc avec le jeton d'un artisan connecté, elle aurait laissé un compte écrire dans le stock d'un AUTRE compte
--    (la fonction ne vérifie que le couple matériau/artisan donné, pas l'appelant). Le site ne l'appelle que côté serveur,
--    avec la clé de service (app/api/inventaire/route.ts, app/api/crm/commandes/[id]/route.ts) et depuis crm_sortir_materiau
--    (SECURITY DEFINER, exécutée par son propriétaire) : on retire le droit d'exécution à public, anon et authenticated.
-- 2. Les fonctions de déclencheur et utilitaires signalées « search_path mutable » reçoivent un search_path FIGÉ
--    (public, pg_temp) : même résolution des noms qu'aujourd'hui, sans qu'un schéma ajouté au chemin puisse les détourner.
-- Rejouable : revoke et alter … set sont idempotents.

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
