-- Contrôle TÉMOIN de 0105 (lecture seule) : une ligne « oui » par fonction réservée à service_role.
select 'fonction ' || f as quoi,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = f and p.prosecdef)
             and has_function_privilege('service_role', (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f limit 1), 'execute')
             and not has_function_privilege('anon', (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = f limit 1), 'execute')
            then 'oui' else 'NON' end as resultat
  from unnest(array['acq_en_pause', 'acq_candidats_enregistrer', 'acq_reserver', 'acq_prospect_mettre_a_jour', 'acq_oppose', 'acq_opposer',
                    'acq_annonceurs_enregistrer', 'acq_evenement', 'acq_purger', 'acq_curseur_lire', 'acq_curseur_poser',
                    'acq_jeton_meta_poser', 'acq_jeton_meta']) f
union all
select 'colonne prospects.' || c, case when exists (select 1 from information_schema.columns where table_schema = 'ops' and table_name = 'prospects' and column_name = c) then 'oui' else 'NON' end
  from unnest(array['etape', 'cible', 'formulaire', 'technologie', 'dernier_contact_recu']) c
union all
select 'agents semés', case when (select count(*) from ops.agents) >= 17 then 'oui' else 'NON' end
union all
select 'jeton Meta en coffre', case when exists (select 1 from vault.decrypted_secrets where name = 'meta_adlib_token') then 'oui' else 'pas encore (026-077)' end;
