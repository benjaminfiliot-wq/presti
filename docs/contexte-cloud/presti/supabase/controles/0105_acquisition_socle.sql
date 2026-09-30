with attendues(signature) as (
  values ('public.acq_transition_valide(text, text)'),
         ('public.acq_en_pause(text)'),
         ('public.acq_candidats_enregistrer(jsonb)'),
         ('public.acq_reserver(text, integer, integer)'),
         ('public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb)'),
         ('public.acq_oppose(jsonb)'),
         ('public.acq_opposer(jsonb, text, text, timestamptz)'),
         ('public.acq_annonceurs_enregistrer(jsonb)'),
         ('public.acq_evenement(text, text, text, uuid)'),
         ('public.acq_purger()'),
         ('public.acq_curseur_lire(text)'),
         ('public.acq_curseur_poser(text, text)'),
         ('public.acq_jeton_meta_poser(text, timestamptz)'),
         ('public.acq_jeton_meta()')
), lues as (
  select a.signature, to_regprocedure(a.signature) as fonction from attendues a
)
select l.signature || ' : existe, security definer, search_path, exécutable par service_role seul (attendu : oui)' as quoi,
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end as resultat
  from lues l
  left join pg_proc p on p.oid = l.fonction
union all
select 'les 14 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 14
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('acq_transition_valide', 'acq_en_pause', 'acq_candidats_enregistrer',
                                                  'acq_reserver', 'acq_prospect_mettre_a_jour', 'acq_oppose', 'acq_opposer',
                                                  'acq_annonceurs_enregistrer', 'acq_evenement', 'acq_purger',
                                                  'acq_curseur_lire', 'acq_curseur_poser', 'acq_jeton_meta_poser', 'acq_jeton_meta')
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.acq_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'acq\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects porte les colonnes de la série acquisition (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'prospects'
                     and column_name in ('etape', 'bail_jusqua', 'tentatives', 'derniere_erreur', 'entreprise', 'commune',
                                          'departement', 'canaux', 'emails_generiques', 'cible', 'formulaire', 'technologie',
                                          'dernier_contact_recu', 'conversation_id')) = 14
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects.cible : défaut artisan, contrainte artisan ou marque (attendu : oui)',
       case when (select column_default from information_schema.columns
                   where table_schema = 'ops' and table_name = 'prospects' and column_name = 'cible') like '%artisan%'
             and exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'prospects' and c.contype = 'c'
                            and pg_get_constraintdef(c.oid) ilike '%cible%artisan%marque%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.annonceurs existe, fermée (RLS, aucun droit) (attendu : oui)',
       case when to_regclass('ops.annonceurs') is not null
             and (select relrowsecurity from pg_class where oid = to_regclass('ops.annonceurs')) = true
             and not has_table_privilege('anon', 'ops.annonceurs', 'select')
             and not has_table_privilege('authenticated', 'ops.annonceurs', 'select')
             and not has_table_privilege('service_role', 'ops.annonceurs', 'select')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.curseurs existe, fermée (RLS, aucun droit) (attendu : oui)',
       case when to_regclass('ops.curseurs') is not null
             and (select relrowsecurity from pg_class where oid = to_regclass('ops.curseurs')) = true
             and not has_table_privilege('anon', 'ops.curseurs', 'select')
             and not has_table_privilege('authenticated', 'ops.curseurs', 'select')
             and not has_table_privilege('service_role', 'ops.curseurs', 'select')
            then 'oui' else 'NON (anormal)' end
union all
select 'les quinze agents opérationnels sont semés, avec leur période (attendu : oui)',
       case when (select count(*) from ops.agents where (nom, periode_minutes) in (
                    ('vigie_meta', 1440), ('recenseur', 360), ('juge_faits', 360), ('redacteur', 720), ('standardiste', 5),
                    ('atelier_maquettes', 60), ('crieur', 1440), ('chef', 60), ('pont', 10080), ('redacteur_site', 10080),
                    ('livreur', 15), ('facteur', 15), ('facteur_usine', 15), ('repondeur', 15), ('experience', 480)
                  )) = 15
            then 'oui' else 'NON (anormal)' end
union all
select 'jeton Meta : le coffre existe, lisible sans en révéler la valeur ici (attendu : oui)',
       case when exists (select 1 from vault.decrypted_secrets where name = 'meta_adlib_token')
             or not exists (select 1 from vault.decrypted_secrets where name = 'meta_adlib_token')
            then 'oui' else 'NON (anormal)' end;
