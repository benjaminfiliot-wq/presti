---------------------------- _A_COLLER_sql_editor_0121_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
