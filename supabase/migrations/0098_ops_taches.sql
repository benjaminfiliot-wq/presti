-- ============================================================================================
-- 0098 · Le bus des agents : tâches, baux, clôture par clé, disjoncteurs, décisions, coûts, état
--        (fiche 026-013, série 026 ; plan SaaS/Produit/Ecosysteme-Plan-2026-09-24.md §3.3-3.4 et
--         §4.3, recherche Ecosysteme-Recherche-Agents-2026-09-24.md R4, revue du 24/09 A4 et A6)
--
-- Pourquoi des fonctions : 0096 a fermé le schéma ops à TOUS les rôles de l'API, service_role
-- compris ; 0097 a posé l'identité, le journal et les interrupteurs. On n'entre dans ops que par
-- des fonctions du schéma public, en SECURITY DEFINER, exécutables par service_role seul, avec
-- `set search_path = ops, public, pg_temp` (pg_temp en dernier) et des tables qualifiées.
--
-- Ce que la base tient ici, quel que soit le code qui l'appelle :
--   · une tâche porte une clé d'idempotence : la même clé rend la même tâche, AVANT tout quota ;
--     profondeur 3 au plus, 5 sous-tâches au plus par origine, quota de créations par jour de Paris ;
--   · une tâche se prend sous un bail de 30 min (for update skip locked) ; un bail expiré la remet
--     en file avec une tentative de plus ; à 3 tentatives, elle devient une décision ;
--   · disjoncteur par tâche (R4) : la même erreur deux fois de suite l'arrête (a_decider) ;
--     disjoncteur par agent : 3 échecs en une heure le mettent en pause et ouvrent une décision ;
--   · une tâche se clôt par sa clé quand son effet a eu lieu ailleurs (la livraison clôt
--     livrer_site:<commande> sans prendre de bail) ;
--   · les agents créent les décisions, SEUL un fondateur (public.artisans.is_founder) les tranche ;
--     l'agent relit celles qu'il a créées une fois tranchées (A12 : les idées à « lancer ») ;
--     l'option par défaut, appliquée à l'échéance, est toujours la plus prudente (plan §4.3) ;
--   · un coût au-delà du plafond du jour met l'agent en pause et ouvre une décision d'argent ;
--   · la pause générale n'arrête pas le bus : elle empêche seulement de PRENDRE une tâche sortante
--     (envoi, publication, mise_en_ligne) ; les commandes payées continuent (plan §5.7).
--
-- La règle du journal est celle de 0097 : chaque écriture insère sa ligne dans ops.evenements dans
-- la même transaction. Seules exceptions : les lectures (ops_decisions_tranchees, ops_etat,
-- ops_stockage_octets), la clé déjà connue (rien n'est écrit) et la clôture rejouée d'une tâche déjà
-- faite (rien n'est écrit). Aucune boucle sans borne : ops_baux_expirer et ops_decisions_echues
-- traitent 200 lignes au plus par appel.
--
-- Ce que ce fichier NE fait PAS : aucune table, aucune politique, aucun type, aucun grant à anon ni à
-- authenticated. Seulement les treize `create or replace function`, leurs revoke, leurs grant à
-- service_role et leurs commentaires. Tout est rejouable sans dommage (or replace).
--
-- Erreurs métier : `raise exception using message = 'ops:<code>', errcode = 'P0001'`.
-- Codes : agent_inconnu, agent_en_pause, type, origine, profondeur, sous_taches, quota, bail_perdu,
-- preuve, capacite, statut, options, defaut, echeance, auteur, deja_tranchee, choix.
-- ============================================================================================

-- ── Le type sortant : ce que la pause générale empêche de prendre ────────────────────────────
create or replace function public.ops_type_sortant(p_type text)
returns boolean
language sql
immutable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(p_type in ('envoi', 'publication', 'mise_en_ligne'), false)
$$;
revoke all on function public.ops_type_sortant(text) from public, anon, authenticated;
grant execute on function public.ops_type_sortant(text) to service_role;
comment on function public.ops_type_sortant(text) is
  'Vrai pour envoi, publication et mise_en_ligne : les tâches sortantes, que la pause générale empêche de prendre (026-013).';

-- ── Les décisions : créer, trancher, relire, appliquer le défaut ─────────────────────────────
create or replace function public.ops_decision_creer(p_agent text, p_question text, p_contexte text, p_options jsonb, p_defaut text, p_montant_cents integer, p_portee text, p_echeance timestamptz, p_cle text, p_tache uuid)
returns table(id uuid, creee boolean)
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_n integer;
  v_valides integer;
  v_reco integer;
  v_distinctes integer;
begin
  if not exists (select 1 from ops.agents a where a.nom = p_agent and a.retire_le is null) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  -- une clé déjà connue rend la décision existante, sans rien écrire
  if p_cle is not null then
    select d.id into v_id from ops.decisions d where d.cle_idempotence = p_cle;
    if found then
      return query select v_id, false;
      return;
    end if;
  end if;
  -- 2 ou 3 options {cle, libelle, recommandee}, une seule recommandée, des clés distinctes
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception using message = 'ops:options', errcode = 'P0001';
  end if;
  select count(*)::integer,
         (count(*) filter (where coalesce(jsonb_typeof(o.value) = 'object'
                                          and jsonb_typeof(o.value -> 'cle') = 'string'
                                          and char_length(o.value ->> 'cle') between 2 and 30
                                          and (o.value ->> 'cle') !~ '[^a-z_]'
                                          and jsonb_typeof(o.value -> 'libelle') = 'string'
                                          and char_length(o.value ->> 'libelle') between 1 and 80
                                          and jsonb_typeof(o.value -> 'recommandee') = 'boolean', false)))::integer,
         (count(*) filter (where o.value -> 'recommandee' = 'true'::jsonb))::integer,
         (count(distinct o.value ->> 'cle'))::integer
    into v_n, v_valides, v_reco, v_distinctes
    from jsonb_array_elements(p_options) o;
  if v_n not between 2 and 3 or v_valides <> v_n or v_reco <> 1 or v_distinctes <> v_n then
    raise exception using message = 'ops:options', errcode = 'P0001';
  end if;
  if p_defaut is null or not exists (select 1 from jsonb_array_elements(p_options) o where o.value ->> 'cle' = p_defaut) then
    raise exception using message = 'ops:defaut', errcode = 'P0001';
  end if;
  if p_echeance is null or p_echeance < now() + interval '1 hour' or p_echeance > now() + interval '30 days' then
    raise exception using message = 'ops:echeance', errcode = 'P0001';
  end if;
  insert into ops.decisions as d (cle_idempotence, question, contexte, options, option_defaut, montant_cents, portee, echeance, creee_par, tache_id)
  values (p_cle, p_question, p_contexte, p_options, p_defaut, p_montant_cents, coalesce(p_portee, 'aucune'), p_echeance, p_agent, p_tache)
  on conflict (cle_idempotence) do nothing
  returning d.id into v_id;
  if v_id is null then
    -- une création concurrente de même clé a gagné : c'est la sienne qui est rendue
    select d.id into v_id from ops.decisions d where d.cle_idempotence = p_cle;
    return query select v_id, false;
    return;
  end if;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'decision_creee', 'decision:' || v_id, left('décision ouverte : ' || p_question, 200), p_tache);
  return query select v_id, true;
end
$$;
revoke all on function public.ops_decision_creer(text, text, text, jsonb, text, integer, text, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.ops_decision_creer(text, text, text, jsonb, text, integer, text, timestamptz, text, uuid) to service_role;
comment on function public.ops_decision_creer(text, text, text, jsonb, text, integer, text, timestamptz, text, uuid) is
  'Ouvre une décision d''un agent (026-013) : 2 ou 3 options {cle, libelle, recommandee}, une seule recommandée (ops:options), défaut parmi les clés (ops:defaut), échéance entre 1 h et 30 jours (ops:echeance). Clé déjà connue : la décision existante, creee = false, sans événement. Sinon événement decision_creee.';

create or replace function public.ops_decision_trancher(p_id uuid, p_choix text, p_auteur uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_d record;
begin
  -- seul un fondateur tranche : contrôlé avant toute lecture ou écriture du bus
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  select d.statut, d.options, d.question, d.tache_id into v_d from ops.decisions d where d.id = p_id for update;
  if not found or v_d.statut <> 'ouverte' then
    raise exception using message = 'ops:deja_tranchee', errcode = 'P0001';
  end if;
  if p_choix is null or not exists (select 1 from jsonb_array_elements(v_d.options) o where o.value ->> 'cle' = p_choix) then
    raise exception using message = 'ops:choix', errcode = 'P0001';
  end if;
  update ops.decisions
     set statut = 'tranchee', choix = p_choix, auteur = p_auteur, tranchee_le = now()
   where id = p_id;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values ('systeme', 'decision_tranchee', 'decision:' || p_id, left('tranchée par le fondateur : ' || p_choix || ' — ' || v_d.question, 200), v_d.tache_id);
end
$$;
revoke all on function public.ops_decision_trancher(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.ops_decision_trancher(uuid, text, uuid) to service_role;
comment on function public.ops_decision_trancher(uuid, text, uuid) is
  'Tranche une décision ouverte (026-013). Auteur is_founder dans public.artisans, sinon ops:auteur ; décision absente ou déjà tranchée : ops:deja_tranchee ; choix hors des clés : ops:choix. Pose tranchee_le = now(). Événement decision_tranchee de l''agent systeme.';

create or replace function public.ops_decisions_tranchees(p_agent text, p_depuis timestamptz)
returns table(id uuid, cle_idempotence text, choix text, tranchee_le timestamptz)
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
#variable_conflict use_column
begin
  if not exists (select 1 from ops.agents a where a.nom = p_agent) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  return query
    select d.id, d.cle_idempotence, d.choix, d.tranchee_le
      from ops.decisions d
     where d.creee_par = p_agent
       and d.statut in ('tranchee', 'defaut_applique')
       and d.tranchee_le > greatest(coalesce(p_depuis, now() - interval '30 days'), now() - interval '30 days')
     order by d.tranchee_le, d.id
     limit 50;
end
$$;
revoke all on function public.ops_decisions_tranchees(text, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_decisions_tranchees(text, timestamptz) to service_role;
comment on function public.ops_decisions_tranchees(text, timestamptz) is
  'Lecture seule, sans événement (026-013) : les décisions CRÉÉES PAR p_agent, tranchées ou au défaut appliqué, dont tranchee_le est postérieur à p_depuis (borné à 30 jours), triées par tranchee_le, 50 au plus. Ni question ni contexte : l''agent se reconnaît à sa clé. Agent inconnu : ops:agent_inconnu.';

create or replace function public.ops_decisions_echues()
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_d record;
  v_n integer := 0;
begin
  for v_d in
    select d.id, d.option_defaut, d.question, d.tache_id
      from ops.decisions d
     where d.statut = 'ouverte' and d.echeance < now()
     order by d.echeance, d.id
     limit 200
       for update skip locked
  loop
    update ops.decisions
       set statut = 'defaut_applique', choix = option_defaut, tranchee_le = now()
     where id = v_d.id;
    insert into ops.evenements (agent, type, objet, resume, tache_id)
    values ('systeme', 'decision_defaut', 'decision:' || v_d.id,
            left('échéance passée, défaut appliqué : ' || v_d.option_defaut || ' — ' || v_d.question, 200), v_d.tache_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;
revoke all on function public.ops_decisions_echues() from public, anon, authenticated;
grant execute on function public.ops_decisions_echues() to service_role;
comment on function public.ops_decisions_echues() is
  'Les décisions ouvertes dont l''échéance est passée passent à defaut_applique, choix = option_defaut, tranchee_le = now() ; 200 au plus par appel ; un événement decision_defaut par décision ; rend leur nombre (026-013).';

-- ── Les tâches : créer, prendre, rendre, clore par clé, expirer les baux ─────────────────────
create or replace function public.ops_tache_creer(p_agent text, p_type text, p_cle text, p_capacite text, p_charge jsonb, p_origine uuid, p_objet text)
returns table(id uuid, creee boolean)
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
#variable_conflict use_column
declare
  v_agent ops.agents%rowtype;
  v_id uuid;
  v_profondeur integer := 0;
  v_parent integer;
  v_enfants integer;
  v_jour timestamptz;
  v_creees integer;
begin
  -- 1. l'agent : existant, non retiré, ni en pause ni disjoncté
  select a.* into v_agent from ops.agents a where a.nom = p_agent;
  if not found or v_agent.retire_le is not null then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  if v_agent.en_pause or v_agent.disjoncteur_ouvert_le is not null then
    raise exception using message = 'ops:agent_en_pause', errcode = 'P0001';
  end if;
  -- 2. le type parmi ceux que l'agent crée (l'agent systeme crée sans restriction de type)
  if p_agent <> 'systeme' and not coalesce(p_type = any(v_agent.types_crees), false) then
    raise exception using message = 'ops:type', errcode = 'P0001';
  end if;
  -- 3. une clé déjà connue rend la tâche existante, AVANT tout quota, sans rien écrire
  select t.id into v_id from ops.taches t where t.cle_idempotence = p_cle;
  if found then
    return query select v_id, false;
    return;
  end if;
  -- 4. l'origine, la profondeur, les sous-tâches
  if p_origine is not null then
    select t.profondeur into v_parent from ops.taches t where t.id = p_origine for update;
    if not found then
      raise exception using message = 'ops:origine', errcode = 'P0001';
    end if;
    v_profondeur := v_parent + 1;
    if v_profondeur > 3 then
      raise exception using message = 'ops:profondeur', errcode = 'P0001';
    end if;
    select count(*) into v_enfants from ops.taches t where t.origine_id = p_origine;
    if v_enfants >= 5 then
      raise exception using message = 'ops:sous_taches', errcode = 'P0001';
    end if;
  end if;
  -- 5. le quota du jour, depuis minuit à Paris
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select count(*) into v_creees from ops.taches t where t.cree_par = p_agent and t.cree_le >= v_jour;
  if v_creees >= v_agent.quota_creations_jour then
    raise exception using message = 'ops:quota', errcode = 'P0001';
  end if;
  -- une seule tâche ouverte par objet (index de 0096) : un conflit plutôt qu'une violation brute
  if p_objet is not null and exists (select 1 from ops.taches t where t.objet = p_objet and t.statut in ('file', 'bail', 'a_decider')) then
    raise exception using message = 'ops:statut', errcode = 'P0001';
  end if;
  insert into ops.taches as t (type, cle_idempotence, objet, capacite, sortante, charge, origine_id, profondeur, cree_par)
  values (p_type, p_cle, p_objet, p_capacite, public.ops_type_sortant(p_type), coalesce(p_charge, '{}'::jsonb), p_origine, v_profondeur, p_agent)
  on conflict (cle_idempotence) do nothing
  returning t.id into v_id;
  if v_id is null then
    -- une création concurrente de même clé a gagné : c'est la sienne qui est rendue
    select t.id into v_id from ops.taches t where t.cle_idempotence = p_cle;
    return query select v_id, false;
    return;
  end if;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'tache_creee', left('tache:' || p_cle, 200),
          left('tâche ' || p_type || ' créée (capacité ' || p_capacite || ', profondeur ' || v_profondeur || ')', 200), v_id);
  return query select v_id, true;
end
$$;
revoke all on function public.ops_tache_creer(text, text, text, text, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.ops_tache_creer(text, text, text, text, jsonb, uuid, text) to service_role;
comment on function public.ops_tache_creer(text, text, text, text, jsonb, uuid, text) is
  'Crée une tâche (026-013). Dans l''ordre : agent (ops:agent_inconnu, ops:agent_en_pause), type parmi types_crees sauf pour l''agent systeme (ops:type), clé déjà connue rendue avec creee = false AVANT tout quota, origine (ops:origine), profondeur 3 au plus (ops:profondeur), 5 sous-tâches au plus (ops:sous_taches), quota du jour de Paris (ops:quota), objet déjà ouvert (ops:statut). sortante = ops_type_sortant(p_type). Événement tache_creee.';

create or replace function public.ops_tache_prendre(p_agent text)
returns table(id uuid, type text, cle_idempotence text, objet text, capacite text, charge jsonb, tentatives integer, bail_jusqua timestamptz, origine_id uuid, profondeur integer)
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
#variable_conflict use_column
declare
  v_agent ops.agents%rowtype;
  v_pause boolean;
  v_id uuid;
  v_cle text;
  v_type text;
begin
  select a.* into v_agent from ops.agents a where a.nom = p_agent;
  if not found or v_agent.retire_le is not null then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  if v_agent.en_pause or v_agent.disjoncteur_ouvert_le is not null then
    raise exception using message = 'ops:agent_en_pause', errcode = 'P0001';
  end if;
  -- la pause générale n'arrête que les tâches sortantes ; les commandes payées continuent
  select coalesce(bool_or(i.actif), false) into v_pause from ops.interrupteurs i where i.nom = 'pause_generale';
  select t.id, t.cle_idempotence, t.type into v_id, v_cle, v_type
    from ops.taches t
   where t.statut = 'file'
     and t.capacite = any(v_agent.capacites)
     and (not v_pause or not t.sortante)
   order by t.cree_le, t.id
   limit 1
     for update skip locked;
  if v_id is null then
    return;
  end if;
  update ops.taches t
     set statut = 'bail', agent = p_agent, bail_jusqua = now() + interval '30 minutes', maj_le = now()
   where t.id = v_id;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'tache_prise', left('tache:' || v_cle, 200), left('tâche ' || v_type || ' prise sous un bail de 30 min', 200), v_id);
  return query
    select t.id, t.type, t.cle_idempotence, t.objet, t.capacite, t.charge, t.tentatives, t.bail_jusqua, t.origine_id, t.profondeur
      from ops.taches t
     where t.id = v_id;
end
$$;
revoke all on function public.ops_tache_prendre(text) from public, anon, authenticated;
grant execute on function public.ops_tache_prendre(text) to service_role;
comment on function public.ops_tache_prendre(text) is
  'Prend la plus ancienne tâche en file dont la capacité est celle de l''agent, hors tâches sortantes si la pause générale est active ; for update skip locked, limit 1 ; bail de 30 min ; 0 ou 1 ligne (026-013). Agent en pause ou disjoncté : ops:agent_en_pause. Événement tache_prise.';

create or replace function public.ops_tache_rendre(p_agent text, p_id uuid, p_resultat text, p_preuve_url text, p_erreur text)
returns text
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_t ops.taches%rowtype;
  v_tentatives integer;
  v_meme boolean;
  v_statut text;
  v_disjoncteur timestamptz;
  v_echecs integer;
begin
  select t.* into v_t from ops.taches t where t.id = p_id for update;
  if not found or v_t.statut <> 'bail' or v_t.agent is distinct from p_agent or v_t.bail_jusqua <= now() then
    raise exception using message = 'ops:bail_perdu', errcode = 'P0001';
  end if;
  if p_resultat = 'faite' then
    if p_preuve_url is null or char_length(p_preuve_url) > 500
       or not (p_preuve_url like 'https://_%' or p_preuve_url like 'supabase://_%' or p_preuve_url like 'git:_%') then
      raise exception using message = 'ops:preuve', errcode = 'P0001';
    end if;
    update ops.taches
       set statut = 'faite', preuve_url = p_preuve_url, bail_jusqua = null, maj_le = now()
     where id = p_id;
    insert into ops.evenements (agent, type, objet, resume, tache_id)
    values (p_agent, 'tache_faite', left('tache:' || v_t.cle_idempotence, 200), left('tâche ' || v_t.type || ' faite, preuve jointe', 200), p_id);
    return 'faite';
  end if;
  if p_resultat is distinct from 'echec' then
    raise exception using message = 'ops:statut', errcode = 'P0001';
  end if;
  -- disjoncteur par tâche (R4) : la même erreur deux fois de suite, ou la 3e tentative, l'arrête
  v_tentatives := least(v_t.tentatives + 1, 3);
  v_meme := coalesce(left(p_erreur, 500) = v_t.derniere_erreur, false);
  v_statut := case when v_meme or v_tentatives >= 3 then 'a_decider' else 'file' end;
  update ops.taches
     set statut = v_statut, tentatives = v_tentatives, derniere_erreur = left(p_erreur, 500),
         agent = case when v_statut = 'file' then null else agent end,
         bail_jusqua = null, maj_le = now()
   where id = p_id;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'tache_echec', left('tache:' || v_t.cle_idempotence, 200),
          left('échec de la tâche ' || v_t.type || ', tentative ' || v_tentatives || ' sur 3 : '
               || case when v_statut = 'file' then 'remise en file' else 'à décider' end, 200), p_id);
  if v_statut = 'a_decider' then
    perform public.ops_decision_creer(p_agent,
      left('La tâche ' || v_t.type || ' (' || left(p_id::text, 8) || ') a échoué '
           || case when v_meme then 'deux fois de suite avec la même erreur' else v_tentatives || ' fois' end
           || ' : la relancer ou l''annuler ?', 300),
      left('clé : ' || v_t.cle_idempotence || ' ; dernière erreur : ' || coalesce(left(p_erreur, 500), 'aucune'), 2000),
      jsonb_build_array(jsonb_build_object('cle', 'relancer', 'libelle', 'Relancer la tâche', 'recommandee', false),
                        jsonb_build_object('cle', 'annuler', 'libelle', 'Annuler la tâche', 'recommandee', true)),
      'annuler', null, 'aucune', now() + interval '24 hours',
      'a_decider:' || p_id || ':' || (extract(epoch from now()) * 1000000)::bigint, p_id);
  end if;
  -- disjoncteur par agent : 3 échecs en une heure, comptés depuis sa dernière reprise
  select a.disjoncteur_ouvert_le into v_disjoncteur from ops.agents a where a.nom = p_agent for update;
  if v_disjoncteur is null then
    select count(*) into v_echecs
      from ops.evenements e
     where e.agent = p_agent and e.type = 'tache_echec'
       and e.le > greatest(now() - interval '1 hour',
                           coalesce((select max(r.le) from ops.evenements r where r.agent = p_agent and r.type = 'agent_reprise'),
                                    '-infinity'::timestamptz));
    if v_echecs >= 3 then
      perform public.ops_agent_pause(p_agent, true, 'disjoncteur : 3 échecs en une heure');
      update ops.agents set disjoncteur_ouvert_le = now() where nom = p_agent;
      perform public.ops_decision_creer(p_agent,
        left('L''agent ' || p_agent || ' a échoué 3 fois en une heure : son disjoncteur est ouvert. Le reprendre ou le laisser en pause ?', 300),
        left('dernière tâche : ' || v_t.cle_idempotence || ' ; dernière erreur : ' || coalesce(left(p_erreur, 500), 'aucune'), 2000),
        jsonb_build_array(jsonb_build_object('cle', 'reprendre', 'libelle', 'Reprendre l''agent', 'recommandee', false),
                          jsonb_build_object('cle', 'laisser_en_pause', 'libelle', 'Le laisser en pause', 'recommandee', true)),
        'laisser_en_pause', null, 'aucune', now() + interval '24 hours',
        'disjoncteur:' || p_agent || ':' || (extract(epoch from now()) * 1000000)::bigint, p_id);
    end if;
  end if;
  return v_statut;
end
$$;
revoke all on function public.ops_tache_rendre(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.ops_tache_rendre(text, uuid, text, text, text) to service_role;
comment on function public.ops_tache_rendre(text, uuid, text, text, text) is
  'Rend une tâche tenue sous bail par p_agent (sinon ops:bail_perdu) et rend son nouveau statut (026-013). faite : preuve https://, supabase:// ou git: exigée (ops:preuve). echec : tentative + 1 ; même erreur deux fois ou 3e tentative : a_decider et décision (relancer, annuler ; défaut annuler) ; sinon retour en file. 3 échecs de l''agent en une heure : pause, disjoncteur ouvert, décision (reprendre, laisser_en_pause ; défaut laisser_en_pause).';

create or replace function public.ops_tache_clore(p_agent text, p_cle text, p_preuve_url text)
returns text
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent ops.agents%rowtype;
  v_t ops.taches%rowtype;
begin
  select a.* into v_agent from ops.agents a where a.nom = p_agent;
  if not found or v_agent.retire_le is not null then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  select t.* into v_t from ops.taches t where t.cle_idempotence = p_cle for update;
  if not found then
    -- une commande payée avant le bus n'a pas de tâche : ni erreur ni événement
    return 'absente';
  end if;
  if not coalesce(v_t.capacite = any(v_agent.capacites), false) then
    raise exception using message = 'ops:capacite', errcode = 'P0001';
  end if;
  if p_preuve_url is null or char_length(p_preuve_url) > 500
     or not (p_preuve_url like 'https://_%' or p_preuve_url like 'supabase://_%' or p_preuve_url like 'git:_%') then
    raise exception using message = 'ops:preuve', errcode = 'P0001';
  end if;
  if v_t.statut = 'faite' then
    -- le tic peut rejouer : rien n'est réécrit
    return 'faite';
  end if;
  if v_t.statut not in ('file', 'bail') then
    raise exception using message = 'ops:statut', errcode = 'P0001';
  end if;
  update ops.taches t
     set statut = 'faite', preuve_url = p_preuve_url, agent = null, bail_jusqua = null, maj_le = now()
   where t.id = v_t.id and t.statut in ('file', 'bail');
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'tache_close', left('tache:' || p_cle, 200),
          left('tâche ' || v_t.type || ' close par sa clé depuis ' || v_t.statut || ' : son effet a eu lieu', 200), v_t.id);
  return 'faite';
end
$$;
revoke all on function public.ops_tache_clore(text, text, text) from public, anon, authenticated;
grant execute on function public.ops_tache_clore(text, text, text) to service_role;
comment on function public.ops_tache_clore(text, text, text) is
  'Clôt par sa clé une tâche dont l''effet a eu lieu ailleurs, sans bail (026-013, revue du 24/09 A4). Clé inconnue : absente, sans événement. Capacité de la tâche hors de celles de l''agent : ops:capacite ; preuve comme pour faite : ops:preuve ; déjà faite : faite, rien d''écrit ; file ou bail (de n''importe quel agent) : faite, agent et bail effacés, événement tache_close ; echec, a_decider ou annulee : ops:statut. Verrou for update.';

create or replace function public.ops_baux_expirer()
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_t record;
  v_tentatives integer;
  v_n integer := 0;
begin
  for v_t in
    select t.id, t.type, t.agent, t.tentatives, t.cle_idempotence
      from ops.taches t
     where t.statut = 'bail' and t.bail_jusqua < now()
     order by t.bail_jusqua, t.id
     limit 200
       for update skip locked
  loop
    v_tentatives := least(v_t.tentatives + 1, 3);
    update ops.taches
       set statut = case when v_tentatives >= 3 then 'a_decider' else 'file' end,
           tentatives = v_tentatives, agent = null, bail_jusqua = null, maj_le = now()
     where id = v_t.id;
    insert into ops.evenements (agent, type, objet, resume, tache_id)
    values ('systeme', 'bail_expire', left('tache:' || v_t.cle_idempotence, 200),
            left('bail expiré' || coalesce(' chez ' || v_t.agent, '') || ', tentative ' || v_tentatives || ' sur 3 : '
                 || case when v_tentatives >= 3 then 'à décider' else 'remise en file' end, 200), v_t.id);
    if v_tentatives >= 3 then
      perform public.ops_decision_creer('systeme',
        left('La tâche ' || v_t.type || ' (' || left(v_t.id::text, 8) || ') a perdu son bail 3 fois : la relancer ou l''annuler ?', 300),
        left('clé : ' || v_t.cle_idempotence || coalesce(' ; dernier bail : ' || v_t.agent, ''), 2000),
        jsonb_build_array(jsonb_build_object('cle', 'relancer', 'libelle', 'Relancer la tâche', 'recommandee', false),
                          jsonb_build_object('cle', 'annuler', 'libelle', 'Annuler la tâche', 'recommandee', true)),
        'annuler', null, 'aucune', now() + interval '24 hours',
        'a_decider:' || v_t.id || ':' || (extract(epoch from now()) * 1000000)::bigint, v_t.id);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;
revoke all on function public.ops_baux_expirer() from public, anon, authenticated;
grant execute on function public.ops_baux_expirer() to service_role;
comment on function public.ops_baux_expirer() is
  'Chaque tâche en bail échu : tentative + 1, agent et bail effacés, retour en file, ou a_decider avec sa décision (relancer, annuler ; défaut annuler) à 3 ; 200 au plus par appel ; un événement bail_expire par tâche ; rend leur nombre. Appelée chaque minute par pg_cron et par le tic (026-013).';

-- ── Les coûts, l'état du bus, le stockage ────────────────────────────────────────────────────
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
  -- un agent absent est une erreur métier, jamais une violation de clé étrangère
  select a.* into v_agent from ops.agents a where a.nom = p_agent for update;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  insert into ops.couts (agent, fournisseur, montant_eur, detail, tache_id)
  values (p_agent, p_fournisseur, p_montant_eur, coalesce(p_detail, '{}'::jsonb), p_tache);
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'cout', left('cout:' || p_fournisseur, 200),
          left('coût de ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros chez ' || p_fournisseur, 200), p_tache);
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(c.montant_eur), 0) into v_total from ops.couts c where c.agent = p_agent and c.le >= v_jour;
  if v_total > v_agent.plafond_euros_jour and not v_agent.en_pause then
    perform public.ops_agent_pause(p_agent, true, 'plafond de coûts du jour dépassé');
    perform public.ops_decision_creer(p_agent,
      left('L''agent ' || p_agent || ' a dépassé son plafond du jour (' || to_char(v_total, 'FM999999990.00') || ' euros pour '
           || to_char(v_agent.plafond_euros_jour, 'FM999990.00') || ') : il est en pause. Le reprendre ou le laisser en pause ?', 300),
      left('dernier coût : ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros chez ' || p_fournisseur, 2000),
      jsonb_build_array(jsonb_build_object('cle', 'reprendre', 'libelle', 'Reprendre l''agent', 'recommandee', false),
                        jsonb_build_object('cle', 'laisser_en_pause', 'libelle', 'Le laisser en pause', 'recommandee', true)),
      'laisser_en_pause', round(v_total * 100)::integer, 'argent', now() + interval '24 hours',
      'cout_plafond:' || p_agent || ':' || (extract(epoch from now()) * 1000000)::bigint, p_tache);
  end if;
  return v_total;
end
$$;
revoke all on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) to service_role;
comment on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) is
  'Ajoute un coût et rend le total du jour de Paris de l''agent (026-013). Agent absent : ops:agent_inconnu. Au-delà de plafond_euros_jour : pause et décision de portée argent (reprendre, laisser_en_pause ; défaut laisser_en_pause). Événement cout.';

create or replace function public.ops_etat()
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object(
    'taches', (
      select jsonb_build_object(
               'file', count(*) filter (where t.statut = 'file'),
               'bail', count(*) filter (where t.statut = 'bail'),
               'faite', count(*) filter (where t.statut = 'faite'),
               'echec', count(*) filter (where t.statut = 'echec'),
               'a_decider', count(*) filter (where t.statut = 'a_decider'),
               'annulee', count(*) filter (where t.statut = 'annulee'),
               'echecs_24h', (select count(*) from ops.evenements e where e.type = 'tache_echec' and e.le > now() - interval '24 hours'))
        from ops.taches t),
    'agents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nom', a.nom, 'capacites', to_jsonb(a.capacites), 'battement_le', a.battement_le,
               'periode_minutes', a.periode_minutes, 'en_pause', a.en_pause,
               'disjoncteur_ouvert', a.disjoncteur_ouvert_le is not null, 'disjoncteur_ouvert_le', a.disjoncteur_ouvert_le,
               'jeton_externe_expire_le', a.jeton_externe_expire_le) order by a.nom)
        from ops.agents a
       where a.retire_le is null), '[]'::jsonb),
    'decisions_ouvertes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'question', d.question, 'echeance', d.echeance, 'defaut', d.option_defaut,
               'montant_cents', d.montant_cents, 'portee', d.portee)
             order by coalesce(d.montant_cents, 0) desc, d.echeance, d.cree_le)
        from (select x.id, x.question, x.echeance, x.option_defaut, x.montant_cents, x.portee, x.cree_le
                from ops.decisions x
               where x.statut = 'ouverte'
               order by coalesce(x.montant_cents, 0) desc, x.echeance, x.cree_le
               limit 5) d), '[]'::jsonb),
    'interrupteurs', coalesce((select jsonb_object_agg(i.nom, i.actif) from ops.interrupteurs i), '{}'::jsonb),
    'couts_mois', (
      select round(coalesce(sum(c.montant_eur), 0), 2)
        from ops.couts c
       where c.le >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'),
    'notifications_jour', (
      select count(*)
        from ops.evenements e
       where e.type = 'notification'
         and e.le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'),
    'dernier_evenement_id', (select max(e.id) from ops.evenements e)
  )
$$;
revoke all on function public.ops_etat() from public, anon, authenticated;
grant execute on function public.ops_etat() to service_role;
comment on function public.ops_etat() is
  'L''état du bus, lecture seule (026-013) : taches (compte par statut, echecs_24h), agents non retirés (nom, capacites, battement_le, periode_minutes, en_pause, disjoncteur_ouvert, jeton_externe_expire_le), decisions_ouvertes (5 au plus, montant décroissant puis échéance : id, question, echeance, defaut, montant_cents, portee), interrupteurs, couts_mois (euros), notifications_jour (depuis minuit à Paris) et dernier_evenement_id. Aucune donnée de prospect.';

create or replace function public.ops_stockage_octets()
returns bigint
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint from storage.objects o
$$;
revoke all on function public.ops_stockage_octets() from public, anon, authenticated;
grant execute on function public.ops_stockage_octets() to service_role;
comment on function public.ops_stockage_octets() is
  'Octets occupés dans Supabase Storage, tous buckets (1 Go partagé) : somme de metadata.size de storage.objects, 0 si vide (026-013).';
