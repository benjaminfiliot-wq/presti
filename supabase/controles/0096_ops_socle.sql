select 'schéma ops présent (attendu : oui)' as quoi,
       case when to_regnamespace('ops') is not null
             and exists (select 1 from pg_namespace where nspname = 'ops') then 'oui' else 'NON (anormal)' end as resultat
union all
select 'les 11 tables sous RLS (attendu : oui)',
       case when (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'ops' and c.relkind = 'r' and c.relrowsecurity
                     and c.relname in ('agents', 'taches', 'evenements', 'decisions', 'prospects', 'envois', 'opposition',
                                       'maquettes', 'quotas_canaux', 'couts', 'interrupteurs')) = 11
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune politique sur ops (attendu : oui)',
       case when not exists (select 1 from pg_policies where schemaname = 'ops') then 'oui' else 'NON (anormal)' end
union all
select 'usage du schéma refusé à anon, authenticated et service_role (attendu : oui)',
       case when not has_schema_privilege('anon', 'ops', 'usage')
             and not has_schema_privilege('authenticated', 'ops', 'usage')
             and not has_schema_privilege('service_role', 'ops', 'usage') then 'oui' else 'NON (anormal)' end
union all
select 'aucun droit de table pour public, anon, authenticated ni service_role (attendu : oui)',
       case when not exists (select 1 from information_schema.role_table_grants
                              where table_schema = 'ops' and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role'))
            then 'oui' else 'NON (anormal)' end
union all
select 'agents semés : systeme et a0 (attendu : oui)',
       case when exists (select 1 from ops.agents where nom = 'systeme' and libelle = 'Plomberie SQL'
                           and periode_minutes = 10080 and cardinality(tables_ecrites) = 0)
             and exists (select 1 from ops.agents where nom = 'a0' and libelle = 'Veilleur' and periode_minutes = 5
                           and tables_ecrites @> array['evenements', 'decisions'] and tables_ecrites <@ array['evenements', 'decisions'])
            then 'oui' else 'NON (anormal)' end
union all
select 'quotas : les 8 lignes semées, exactes (attendu : oui)',
       case when (select count(*) from ops.quotas_canaux) = 8
             and (select count(*) from ops.quotas_canaux where (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) in (
                   ('instagram', '*', 0, 0), ('facebook', '*', 0, 0), ('linkedin', '*', 0, 0), ('formulaire_site', '*', 0, 0),
                   ('email_sollicite', '*', 50, 0), ('reponse_privee', '*', 50, 0), ('messagerie', '*', 100, 0),
                   ('essai_e2e', '*', 4, 4))) = 8
            then 'oui' else 'NON (anormal)' end
union all
select 'quotas : instagram et formulaire_site à 0, email_sollicite à 50, aucune ligne email (attendu : oui)',
       case when exists (select 1 from ops.quotas_canaux where canal = 'instagram' and envoyeur = '*' and plafond_jour = 0)
             and exists (select 1 from ops.quotas_canaux where canal = 'formulaire_site' and envoyeur = '*' and plafond_jour = 0)
             and exists (select 1 from ops.quotas_canaux where canal = 'email_sollicite' and envoyeur = '*' and plafond_jour = 50)
             and not exists (select 1 from ops.quotas_canaux where canal = 'email')
            then 'oui' else 'NON (anormal)' end
union all
select 'interrupteurs : pause_generale et envoi_froid semés fermés (attendu : oui)',
       case when (select count(*) from ops.interrupteurs where nom in ('pause_generale', 'envoi_froid') and not actif) = 2
             and exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and actif = false)
            then 'oui' else 'NON (anormal)' end;
