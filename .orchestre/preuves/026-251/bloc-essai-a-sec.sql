do $essai_026$
declare
  r jsonb := '{}'::jsonb;
begin
  execute $migration_026$---------------------------- _A_COLLER_sql_editor_0115_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
select public.ops_agent_enregistrer('sav', 'SAV (clients déjà payants)', '{}'::text[], '{}'::text[], array['evenements', 'decisions']::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('qualite_sites', 'Contrôleur qualité des sites', '{}'::text[], '{}'::text[], array['evenements', 'decisions']::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('vigile', 'Vigile (sécurité)', '{}'::text[], '{}'::text[], array['evenements']::text[], 1440, 30, 0, 0);
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
comment on function public.vigile_conseiller() is
  'Les contrôles du conseiller Supabase rejoués sur le catalogue (026-251, pour le Vigile 026-248) : nom de contrôle, niveau, catégorie, nombre ; jamais un nom d''objet ni une donnée. service_role seul.';
comment on function public.vigile_agents() is
  'Les mesures par agent du seuil de pause du Vigile (026-251) : échecs de tâche sur 1 h, coût du jour de Paris, envois consignés hors règle sur 24 h ; jamais un texte. service_role seul.';
comment on function public.pilotage_activite_salles(timestamptz) is
  'Le temps actif par salle depuis p_depuis (026-175, ACTIVE AUJ. ; 026-251 : 28 noms d''EQUIPAGE), calculé sur les événements de ops.evenements (hors battements), par plages de cinq minutes ; un nom inconnu compte en machines.';

$migration_026$;

  r := r || jsonb_build_object('graines', (select count(*) from ops.agents a where a.nom in ('sav', 'qualite_sites', 'vigile') and a.retire_le is null
        and a.jeton_hash is null and not a.en_pause and a.capacites = '{}'::text[] and a.battement_le is null) = 3);
  r := r || jsonb_build_object('graine_sav', (select a.periode_minutes = 15 and a.tables_ecrites = array['evenements', 'decisions']::text[] and a.plafond_euros_jour = 0 from ops.agents a where a.nom = 'sav'));
  r := r || jsonb_build_object('graine_qualite', (select a.periode_minutes = 1440 and a.tables_ecrites = array['evenements', 'decisions']::text[] from ops.agents a where a.nom = 'qualite_sites'));
  r := r || jsonb_build_object('graine_vigile', (select a.periode_minutes = 1440 and a.tables_ecrites = array['evenements']::text[] from ops.agents a where a.nom = 'vigile'));
  perform public.ops_agent_enregistrer('vigile', 'Vigile (sécurité)', '{}'::text[], '{}'::text[], array['evenements']::text[], 1440, 30, 0, 0);
  r := r || jsonb_build_object('rejouable', (select count(*) = 1 from ops.agents where nom = 'vigile' and jeton_hash is null and not en_pause));
  r := r || jsonb_build_object('refus_anon_authenticated', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')
          and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') or not has_function_privilege('service_role', p.oid, 'execute'))));
  r := r || jsonb_build_object('definer_et_search_path', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')
          and (not p.prosecdef or p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))));
  r := r || jsonb_build_object('conseiller_six_controles', (select count(*) = 6 and bool_and(nombre >= 0) and bool_and(lint ~ '^[a-z0-9_]{1,60}$') from public.vigile_conseiller()));
  r := r || jsonb_build_object('conseiller_forme', (select array_agg(distinct niveau order by niveau) <@ array['ERROR', 'INFO', 'WARN']::text[]
        and array_agg(distinct categorie order by categorie) <@ array['PERFORMANCE', 'SECURITY']::text[] from public.vigile_conseiller()));
  r := r || jsonb_build_object('agents_une_ligne_par_agent', (select count(*) from public.vigile_agents()) = (select count(*) from ops.agents where retire_le is null));
  r := r || jsonb_build_object('agents_chiffres', (select bool_and(echecs_1h >= 0 and cout_jour_eur >= 0 and envois_hors_regle_24h >= 0) from public.vigile_agents()));
  r := r || jsonb_build_object('agents_sav_present', exists (select 1 from public.vigile_agents() where nom = 'sav'));
  r := r || jsonb_build_object('salles_vingt', (select count(*) = 20 from public.pilotage_activite_salles(now() - interval '1 day')));
  r := r || jsonb_build_object('salles_jamais_ecommerce', not exists (select 1 from public.pilotage_activite_salles(now() - interval '1 day') where salle = 'ecommerce'));
  perform public.ops_evenement_ajouter('vigile', 'essai_postes', null, 'événement d''essai, annulé par l''exception finale', null);
  r := r || jsonb_build_object('sav_range_en_presti', (select minutes >= 0 from public.pilotage_activite_salles(now() - interval '1 hour') where salle = 'presti'));
  r := r || jsonb_build_object('vigile_range_en_securite', (select minutes >= 5 from public.pilotage_activite_salles(now() - interval '1 hour') where salle = 'securite'));
  raise exception 'ESSAI_A_SEC % %', '591c80af5f3eff69e1c6061cf5c43c48a1e6ec750eda2c3348322075f6d2a0a3', r::text;
end $essai_026$;
