---------------------------- _A_COLLER_sql_editor_0115_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
