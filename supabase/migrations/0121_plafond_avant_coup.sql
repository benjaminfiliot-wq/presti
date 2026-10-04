-- ============================================================================================
-- 0121 · Le plafond de 0 € par agent, contrôlé AVANT la dépense (règle du 30/09 : l'écosystème agit seul, le plafond est mécanisé)
--        (juge : scripts/garde-plafond-qa.mjs ; à appliquer AVANT le code de lib/agents/llm.ts, qui appelle ops_cout_autoriser)
--
-- Ce que ce fichier change :
--   · le plafond par défaut d'un agent passe de 1 € (0096) à 0 € ; les lignes déjà semées au défaut (0096 sème sans plafond) sont remises à 0 ;
--   · ops_cout_autoriser (NOUVELLE) : dit oui ou non AVANT l'appel d'une voie ; un coût NULL, NaN ou négatif est refusé, un agent inconnu est
--     refusé, et un dépassement du plafond du jour met l'agent en pause et ouvre une décision d'argent (comme avant, mais avant le coût) ;
--   · ops_cout_ajouter (REMPLACÉE) : refuse un montant inconnu (ops:cout_inconnu) et un dépassement (ops:plafond) AVANT d'inscrire la
--     ligne ; elle ne rend plus un total constaté après coup.
-- Rejouable sans dommage (create or replace, alter … set default, update idempotent).
-- ============================================================================================

alter table ops.agents alter column plafond_euros_jour set default 0;
update ops.agents set plafond_euros_jour = 0 where plafond_euros_jour <> 0;

create or replace function public.ops_cout_autoriser(p_agent text, p_montant_eur numeric)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent ops.agents%rowtype;
  v_jour timestamptz;
  v_total numeric;
begin
  if p_montant_eur is null or p_montant_eur = 'NaN'::numeric or p_montant_eur < 0 then
    return false;
  end if;
  select a.* into v_agent from ops.agents a where a.nom = p_agent and a.retire_le is null;
  if not found then
    return false;
  end if;
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(c.montant_eur), 0) into v_total from ops.couts c where c.agent = p_agent and c.le >= v_jour;
  if v_total + p_montant_eur > v_agent.plafond_euros_jour then
    if not v_agent.en_pause then
      perform public.ops_agent_pause(p_agent, true, 'plafond de coûts du jour atteint');
      perform public.ops_decision_creer(p_agent,
        left('L''agent ' || p_agent || ' a atteint son plafond du jour (' || to_char(v_agent.plafond_euros_jour, 'FM999990.00') || ' euros) : il est en pause. Le reprendre ou le laisser en pause ?', 300),
        left('coût prévu : ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros ; déjà dépensé aujourd''hui : ' || to_char(v_total, 'FM999999990.00') || ' euros', 2000),
        jsonb_build_array(jsonb_build_object('cle', 'reprendre', 'libelle', 'Reprendre l''agent', 'recommandee', false),
                          jsonb_build_object('cle', 'laisser_en_pause', 'libelle', 'Le laisser en pause', 'recommandee', true)),
        'laisser_en_pause', null, 'argent', now() + interval '24 hours',
        'cout_plafond:' || p_agent || ':' || (extract(epoch from now()) * 1000000)::bigint, null);
    end if;
    return false;
  end if;
  return true;
end
$$;
revoke all on function public.ops_cout_autoriser(text, numeric) from public, anon, authenticated;
grant execute on function public.ops_cout_autoriser(text, numeric) to service_role;
comment on function public.ops_cout_autoriser(text, numeric) is
  'Contrôle AVANT la dépense (0121) : vrai si total du jour + montant prévu tient dans plafond_euros_jour ; faux pour un montant NULL, NaN ou négatif, un agent inconnu ou un dépassement (qui met l''agent en pause et ouvre une décision d''argent).';

create or replace function public.ops_cout_ajouter(p_agent text, p_fournisseur text, p_montant_eur numeric, p_detail jsonb, p_tache uuid)
returns numeric
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent ops.agents%rowtype;
  v_jour timestamptz;
  v_total numeric;
begin
  if p_montant_eur is null or p_montant_eur = 'NaN'::numeric or p_montant_eur < 0 then
    raise exception using message = 'ops:cout_inconnu', errcode = 'P0001';
  end if;
  select a.* into v_agent from ops.agents a where a.nom = p_agent for update;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(c.montant_eur), 0) into v_total from ops.couts c where c.agent = p_agent and c.le >= v_jour;
  if v_total + p_montant_eur > v_agent.plafond_euros_jour then
    raise exception using message = 'ops:plafond', errcode = 'P0001';
  end if;
  insert into ops.couts (agent, fournisseur, montant_eur, detail, tache_id)
  values (p_agent, p_fournisseur, p_montant_eur, coalesce(p_detail, '{}'::jsonb), p_tache);
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'cout', left('cout:' || p_fournisseur, 200),
          left('coût de ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros chez ' || p_fournisseur, 200), p_tache);
  return v_total + p_montant_eur;
end
$$;
revoke all on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) to service_role;
comment on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) is
  'Inscrit un coût APRÈS l''avoir contrôlé (0121) : montant NULL, NaN ou négatif = ops:cout_inconnu ; total du jour + montant au-dessus de plafond_euros_jour = ops:plafond, rien n''est inscrit. Rend le total du jour de Paris. Agent absent : ops:agent_inconnu.';
