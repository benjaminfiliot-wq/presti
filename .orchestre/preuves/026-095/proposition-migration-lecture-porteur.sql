-- PROPOSITION (fiche 026-095, hors périmètre : supabase/** est interdit à la fiche) — les deux lectures que les routes du porteur
-- appellent et qu'aucune migration ne pose encore : acq_porteur_verifier (GET travail?verifier=<id>) et acq_oppositions_porteur
-- (GET oppositions). Lecture seule, service_role seul. À passer par une migration (0117) avant la mise en service 026-143 ;
-- tant qu'elle manque, les routes REFUSENT (un doute vaut un refus) : le porteur ne soumet rien, jamais l'inverse.
--
-- acq_porteur_verifier : « cet envoi peut-il partir MAINTENANT ? » — pause (générale ou de l'agent), statut encore approuve,
-- canal du formulaire, opposition active sur les clés du prospect, et accord de Benj consommé par l'approbation de CET envoi
-- (ni annulé, ni échu, ni antérieur au dernier mouvement de la pause : les mêmes refus que ops.garde_envois à la consignation).
-- Il rend l'empreinte du texte : le porteur la compare à celle du texte qu'il s'apprête à soumettre.

create or replace function public.acq_porteur_verifier(p_envoi uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_e        record;
  v_pj       jsonb;
  v_siren    text;
  v_domaine  text;
  v_pause_le timestamptz;
  v_acc      record;
begin
  if public.acq_en_pause('facteur_usine') then
    return jsonb_build_object('ok', false, 'raison', 'pause');
  end if;
  select e.id, e.statut, e.canal, e.prospect_id, e.empreinte_texte into v_e from ops.envois e where e.id = p_envoi;
  if not found then return jsonb_build_object('ok', false, 'raison', 'introuvable'); end if;
  if v_e.canal not in ('formulaire_site', 'essai_e2e') then return jsonb_build_object('ok', false, 'raison', 'canal'); end if;
  if v_e.statut <> 'approuve' then return jsonb_build_object('ok', false, 'raison', 'statut'); end if;

  if v_e.prospect_id is not null then
    select to_jsonb(p) into v_pj from ops.prospects p where p.id = v_e.prospect_id;
    v_siren := nullif(lower(btrim(coalesce(v_pj ->> 'siren', ''))), '');
    v_domaine := nullif(lower(regexp_replace(btrim(coalesce(v_pj ->> 'domaine', '')), '^www\.', '')), '');
    if exists (
      select 1 from ops.opposition o
       where (o.expire_le is null or o.expire_le > now())
         and ((o.cle_type = 'siren' and o.cle_valeur = v_siren) or (o.cle_type = 'domaine' and o.cle_valeur = v_domaine))
    ) then
      return jsonb_build_object('ok', false, 'raison', 'opposition');
    end if;
  end if;

  select i.change_le into v_pause_le from ops.interrupteurs i where i.nom = 'pause_generale';
  select a.emis_le, a.expire_le into v_acc
    from ops.accords_benj a
   where a.envoi_id = p_envoi and a.utilise_le is not null and a.annule_le is null
   order by a.utilise_le desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'raison', 'accord_absent'); end if;
  if v_acc.expire_le <= now() or v_acc.emis_le <= coalesce(v_pause_le, '-infinity'::timestamptz) then
    return jsonb_build_object('ok', false, 'raison', 'accord_perime');
  end if;
  return jsonb_build_object('ok', true, 'empreinte_texte', v_e.empreinte_texte);
end
$$;
revoke all on function public.acq_porteur_verifier(uuid) from public, anon, authenticated;
grant execute on function public.acq_porteur_verifier(uuid) to service_role;
comment on function public.acq_porteur_verifier(uuid) is
  'Lecture seule pour le porteur du formulaire (026-095) : pause, statut approuve, canal, opposition active, accord de Benj consommé ni échu ni antérieur à la pause ; rend l''empreinte du texte.';

-- acq_oppositions_porteur : les lignes d'opposition, actives et expirées, pour l'export de nuit de l'usine (50 000 au plus).
create or replace function public.acq_oppositions_porteur()
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('cle_type', x.cle_type, 'cle_valeur', x.cle_valeur, 'expire_le', x.expire_le, 'cree_le', x.cree_le)), '[]'::jsonb)
    from (select o.cle_type, o.cle_valeur, o.expire_le, o.cree_le from ops.opposition o order by o.cree_le, o.id limit 50000) x
$$;
revoke all on function public.acq_oppositions_porteur() from public, anon, authenticated;
grant execute on function public.acq_oppositions_porteur() to service_role;
comment on function public.acq_oppositions_porteur() is
  'Les lignes d''opposition (cle_type, cle_valeur, expire_le, cree_le), 50 000 au plus, pour la copie de nuit de l''usine (026-095).';
