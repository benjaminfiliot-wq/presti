-- 0132 · La fonction que l'export de nuit du porteur appelle et que personne n'avait créée (constat du 06/10/2026).
-- app/api/usine/porteur/oppositions/route.ts (fiche 026-095) fait rpc('acq_oppositions_porteur') ; la fonction n'existait dans aucune migration :
-- la route répondait 503 « base_injoignable » et presti-export-nuit échouait toutes les nuits (« oppositions illisibles, rien n'est effacé »).
-- Lecture seule de ops.opposition : les oppositions actives ET expirées (clé, valeur, échéance, création), rien d'autre (ni motif ni source), 50 000 lignes au plus.
-- Réservée au service (la route est gardée par le jeton de l'agent facteur_usine).

create or replace function public.acq_oppositions_porteur()
returns table (cle_type text, cle_valeur text, expire_le timestamptz, cree_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select o.cle_type, o.cle_valeur, o.expire_le, o.cree_le
    from ops.opposition o
   order by o.cree_le, o.id
   limit 50000
$$;

revoke all on function public.acq_oppositions_porteur() from public, anon, authenticated;
grant execute on function public.acq_oppositions_porteur() to service_role;
comment on function public.acq_oppositions_porteur() is
  'Export de nuit du porteur (026-095) : les lignes de ops.opposition (cle_type, cle_valeur, expire_le, cree_le), actives et expirées, 50 000 au plus ; ni motif ni source. service_role seulement.';
