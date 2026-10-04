-- ============================================================================================
-- 0115 · Les quatre postes de l'organigramme du 27/09 : les graines sav, qualite_sites et vigile, les deux
--        lectures du Vigile, et la répartition des salles de la station à 28 noms (fiche 026-251, série 026)
--
-- S'applique APRÈS 0097 (ops_agent_enregistrer), 0099 (envoi_hors_regle), 0107 (ops.couts lus par la station) et
-- 0113 (pilotage_activite_salles, que ce fichier remplace). Le numéro 0115 est celui de la fiche ; le juge trouve le
-- fichier par son nom (*_postes_agents.sql).
--
-- Les graines : trois fiches d'agent, SANS jeton, SANS pause et SANS capacité (comme celles de 0105 et 0110) :
-- chaque agent peut être mis en pause par le bus (423). Le jeton se pose après, par un geste de Claude Code (026-251).
-- Rejouable sans dommage : ops_agent_enregistrer insère ou met à jour, sans jamais toucher jeton_hash, en_pause ni
-- battement_le. Le Comptable n'a pas de graine : il parle sous le Trésorier.
--
-- Les deux lectures du Vigile (026-248) : SECURITY DEFINER, search_path fixé, exécutables par service_role seul. Elles
-- ne rendent que des NOMS DE CONTRÔLE et des COMPTES : jamais un nom d'objet, une valeur de ligne, un texte ni une
-- donnée personnelle.
--   · vigile_conseiller() : les contrôles du conseiller de Supabase qui se rejouent sur le catalogue (lint, niveau,
--     categorie, nombre) ;
--   · vigile_agents() : par agent non retiré, les échecs de tâche de la dernière heure, le coût du jour de Paris et les
--     envois consignés hors règle sur 24 h.
--
-- pilotage_activite_salles : même signature que 0113, son case fermé suit EQUIPAGE (28 noms) ; un nom inconnu en
-- machines. « Deux chiffres, un écran » : la base et l'écran rangent un agent dans la même salle.
-- ============================================================================================

-- ── Les graines des trois postes ───────────────────────────────────────────────────────────────
select public.ops_agent_enregistrer('sav', 'SAV (clients déjà payants)', '{}'::text[], '{}'::text[], array['evenements', 'decisions']::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('qualite_sites', 'Contrôleur qualité des sites', '{}'::text[], '{}'::text[], array['evenements', 'decisions']::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('vigile', 'Vigile (sécurité)', '{}'::text[], '{}'::text[], array['evenements']::text[], 1440, 30, 0, 0);

-- ── vigile_conseiller : les contrôles du conseiller rejoués sur le catalogue, en comptes ────────
create or replace function public.vigile_conseiller()
returns table(lint text, niveau text, categorie text, nombre integer)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select 'rls_disabled_in_public'::text, 'ERROR'::text, 'SECURITY'::text,
         (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
             and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'))
  union all
  select 'policy_exists_rls_disabled', 'ERROR', 'SECURITY',
         (select count(distinct c.oid)::integer from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and not c.relrowsecurity)
  union all
  select 'rls_enabled_no_policy', 'INFO', 'SECURITY',
         (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
             and not exists (select 1 from pg_policy p where p.polrelid = c.oid))
  union all
  select 'security_definer_view', 'ERROR', 'SECURITY',
         (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'v'
             and not coalesce((select bool_or(o = 'security_invoker=true' or o = 'security_invoker=on') from unnest(coalesce(c.reloptions, '{}'::text[])) o), false))
  union all
  select 'function_search_path_mutable', 'WARN', 'SECURITY',
         (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
  union all
  select 'unindexed_foreign_keys', 'INFO', 'PERFORMANCE',
         (select count(*)::integer from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and k.contype = 'f'
             and not exists (select 1 from pg_index i
                              where i.indrelid = k.conrelid and (i.indkey::int2[])[0:array_length(k.conkey, 1) - 1] @> k.conkey))
$$;
revoke all on function public.vigile_conseiller() from public, anon, authenticated;
grant execute on function public.vigile_conseiller() to service_role;

-- ── vigile_agents : les mesures par agent du seuil de pause du Vigile ───────────────────────────
create or replace function public.vigile_agents()
returns table(nom text, echecs_1h integer, cout_jour_eur numeric, envois_hors_regle_24h integer)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select a.nom,
         (select count(*)::integer from ops.taches t
           where t.statut = 'echec' and t.agent = a.nom and t.maj_le > now() - interval '1 hour') as echecs_1h,
         coalesce((select sum(c.montant_eur) from ops.couts c
                    where c.agent = a.nom
                      and c.le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'), 0) as cout_jour_eur,
         (select count(*)::integer from ops.evenements e
            join ops.envois v on e.objet = 'envoi:' || v.id::text
           where e.type = 'envoi_hors_regle' and e.le > now() - interval '24 hours' and v.envoyeur = a.nom) as envois_hors_regle_24h
    from ops.agents a
   where a.retire_le is null
   order by a.nom
$$;
revoke all on function public.vigile_agents() from public, anon, authenticated;
grant execute on function public.vigile_agents() to service_role;

-- ── pilotage_activite_salles : le temps actif par salle depuis p_depuis, au 28 noms d'EQUIPAGE ───
create or replace function public.pilotage_activite_salles(p_depuis timestamptz)
returns table(salle text, minutes integer)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  with plages as (
    select case e.agent
             when 'chef' then 'commandement'
             when 'vigie_meta' then 'radar' when 'recenseur' then 'radar'
             when 'juge_faits' then 'redaction' when 'redacteur' then 'redaction' when 'garde' then 'redaction'
             when 'facteur' then 'envois' when 'facteur_usine' then 'envois'
             when 'standardiste' then 'standard' when 'repondeur' then 'standard'
             when 'atelier_maquettes' then 'atelier'
             when 'redacteur_site' then 'usine' when 'livreur' then 'usine' when 'livreur_usine' then 'usine'
             when 'qualite_sites' then 'usine'
             when 'tresorier' then 'tresorerie'
             when 'crieur' then 'crieur'
             when 'studio' then 'studio'
             when 'experience' then 'experience'
             when 'a0' then 'machines' when 'systeme' then 'machines' when 'usine' then 'machines'
             when 'pont' then 'chantier'
             when 'contenu' then 'audience'
             when 'pont_telegram' then 'securite' when 'vigile' then 'securite'
             when 'douleurs' then 'observatoire'
             when 'sav' then 'presti'
             else 'machines'
           end as salle,
           count(distinct floor(extract(epoch from e.le) / 300)) as plages
      from ops.evenements e
     where e.type <> 'battement' and e.le >= p_depuis and e.le <= now()
     group by 1
  )
  select s.salle,
         least(coalesce(p.plages, 0) * 5, greatest(0, floor(extract(epoch from (now() - p_depuis)) / 60)))::integer as minutes
    from unnest(array['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie',
                      'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']) as s(salle)
    left join plages p on p.salle = s.salle
   order by s.salle
$$;
revoke all on function public.pilotage_activite_salles(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_activite_salles(timestamptz) to service_role;

-- ── Commentaires ───────────────────────────────────────────────────────────────────────────────
comment on function public.vigile_conseiller() is
  'Les contrôles du conseiller Supabase rejoués sur le catalogue (026-251, pour le Vigile 026-248) : nom de contrôle, niveau, catégorie, nombre ; jamais un nom d''objet ni une donnée. service_role seul.';
comment on function public.vigile_agents() is
  'Les mesures par agent du seuil de pause du Vigile (026-251) : échecs de tâche sur 1 h, coût du jour de Paris, envois consignés hors règle sur 24 h ; jamais un texte. service_role seul.';
comment on function public.pilotage_activite_salles(timestamptz) is
  'Le temps actif par salle depuis p_depuis (026-175, ACTIVE AUJ. ; 026-251 : 28 noms d''EQUIPAGE), calculé sur les événements de ops.evenements (hors battements), par plages de cinq minutes ; un nom inconnu compte en machines.';
