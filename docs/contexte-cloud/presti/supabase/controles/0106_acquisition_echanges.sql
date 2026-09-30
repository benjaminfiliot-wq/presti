with attendues(signature) as (
  values ('public.acq_plafond_du_jour(text, text)'),
         ('public.acq_envois_du_jour(text, text)'),
         ('public.acq_historique_contacts(uuid)'),
         ('public.acq_prospects_pour_premier_contact(text, integer)'),
         ('public.acq_prospects_pour_relance(integer)'),
         ('public.acq_prospects_pour_maquette(integer, boolean)'),
         ('public.acq_prospects_oui(integer)'),
         ('public.acq_envois_perimer()'),
         ('public.acq_envoi_preparer(jsonb)'),
         ('public.acq_envois_a_approuver(integer)'),
         ('public.acq_envoi_approuver(uuid, jsonb)'),
         ('public.acq_envoi_annuler(uuid, text)'),
         ('public.acq_envois_approuves(text, integer)'),
         ('public.acq_envoi_envoye(uuid, jsonb)'),
         ('public.acq_formulaires_a_porter(integer, integer)'),
         ('public.acq_formulaire_echec(uuid, text, boolean)'),
         ('public.acq_envoi_echec(uuid, text)'),
         ('public.acq_maquette_de(uuid)'),
         ('public.acq_maquettes_du_jour()'),
         ('public.acq_maquette_prete(uuid, jsonb)'),
         ('public.acq_maquette_lien_creer(uuid, text, text, timestamptz)'),
         ('public.acq_maquette_par_jeton(text)'),
         ('public.acq_maquettes_a_purger(integer)'),
         ('public.acq_maquette_purgee(uuid)'),
         ('public.acq_reponse_recue(jsonb)'),
         ('public.acq_reponses_a_traiter(integer)'),
         ('public.acq_reponse_classer(uuid, jsonb)'),
         ('public.acq_reponses_a_repondre(integer)'),
         ('public.acq_reponse_repondue(uuid, uuid)'),
         ('public.acq_reponse_reclasser(uuid, text)'),
         ('public.acq_reponses_reclassees(integer)'),
         ('public.acq_reponse_actes_faits(uuid)'),
         ('public.acq_reponse_appel_rendu(uuid)'),
         ('public.acq_conversation_enregistrer(jsonb)'),
         ('public.acq_conversation(uuid)'),
         ('public.acq_meta_evenement_enregistrer(jsonb)'),
         ('public.acq_meta_evenements_a_traiter(integer)'),
         ('public.acq_meta_evenement_traite(bigint)'),
         ('public.acq_rdv_lien_creer(uuid, text, timestamptz)'),
         ('public.acq_rdv_par_jeton(text)'),
         ('public.acq_rdv_creneaux_pris(timestamptz, timestamptz)'),
         ('public.acq_rdv_reserver(text, timestamptz, text)'),
         ('public.acq_rdv_appel_rendu(uuid)'),
         ('public.acq_entrant_email_ajouter(uuid, text)'),
         ('public.acq_prospect_export(uuid)'),
         ('public.acq_effacement_demander(uuid)'),
         ('public.acq_echanges_purger()'),
         ('public.acq_preuves_a_garder(uuid[])'),
         ('public.acq_decision_creer(jsonb)')
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
select 'les 49 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 49
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname in (select split_part(split_part(signature, '(', 1), '.', 2) from attendues)
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
select 'ops.garde_fenetre_meta existe, sans aucun droit d''exécution, déclencheur actif sur ops.envois (attendu : oui)',
       case when to_regprocedure('ops.garde_fenetre_meta()') is not null
             and not has_function_privilege('anon', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and not has_function_privilege('authenticated', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and not has_function_privilege('service_role', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'ops' and c.relname = 'envois' and t.tgname = 'garde_fenetre_meta' and t.tgenabled in ('O', 'A'))
            then 'oui' else 'NON (anormal)' end
union all
select 'les quatre tables neuves existent, fermées (RLS, aucun droit) (attendu : oui)',
       case when (select count(*) from (values ('ops.conversations'), ('ops.meta_evenements'), ('ops.reponses'), ('ops.rendez_vous')) t(n)
                   where to_regclass(t.n) is not null
                     and (select relrowsecurity from pg_class where oid = to_regclass(t.n)) = true
                     and not has_table_privilege('anon', t.n, 'select')
                     and not has_table_privilege('authenticated', t.n, 'select')
                     and not has_table_privilege('service_role', t.n, 'select')) = 4
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.envois porte les colonnes des échanges (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'envois'
                     and column_name in ('objet', 'texte', 'variante', 'modele_id', 'fait_id', 'douleur_id', 'fil_envoi_id',
                                          'conversation_id', 'tentatives_envoi', 'derniere_erreur', 'preuve', 'preuve_demande',
                                          'reference', 'technologie', 'bail_porteur_jusqua', 'commentaire_id')) = 16
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.envois.reference : unique, contrainte ^[A-Z0-9]{6}$ (attendu : oui)',
       case when exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'envois' and c.contype = 'u'
                            and exists (select 1 from unnest(c.conkey) k join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k where a.attname = 'reference'))
             and exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'envois' and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%reference%[A-Z0-9]%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.maquettes porte empreintes, prete_le, objets (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'maquettes' and column_name in ('empreintes', 'prete_le', 'objets')) = 3
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.reponses.source limité à courriel/meta/formulaire/essai (attendu : oui)',
       case when exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'reponses' and c.contype = 'c'
                            and pg_get_constraintdef(c.oid) ilike '%source%courriel%meta%formulaire%essai%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.rendez_vous : index unique partiel sur creneau, réservé (attendu : oui)',
       case when exists (select 1 from pg_indexes where schemaname = 'ops' and tablename = 'rendez_vous' and indexdef ilike '%unique%(creneau)%where%reserve%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects.effacement_demande_le existe (attendu : oui)',
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'ops' and table_name = 'prospects' and column_name = 'effacement_demande_le')
            then 'oui' else 'NON (anormal)' end
union all
select 'bucket maquettes : privé, 3145728 octets, image/jpeg et video/mp4, aucune politique (attendu : oui)',
       case when exists (select 1 from storage.buckets where id = 'maquettes' and public = false and file_size_limit = 3145728
                            and allowed_mime_types = array['image/jpeg', 'video/mp4'])
             and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and qual ilike '%maquettes%')
            then 'oui' else 'NON (anormal)' end
union all
-- Le test « public.courriers n'existe pas » a été retiré le 2026-09-28 (contre-vérification
-- 026-061, .orchestre/preuves/026-061/contre-verif-28-09.md) : la table public.courriers existe
-- en production depuis une migration antérieure à 0106, que 0106 ne crée ni ne modifie (aucune
-- ligne de 0106_acquisition_echanges.sql ne cite « courriers ») — un contrôle en base ne peut pas
-- constater cette absence de mention dans le fichier ; seule la lecture du fichier le peut, et elle
-- a été faite. Le test ne porte donc plus que sur les trois fonctions que 0106 promet de ne pas créer.
select 'ni acq_reponse_relayer, ni acq_envoi_marquer, ni acq_oppositions_depuis (attendu : oui)',
       case when to_regprocedure('public.acq_reponse_relayer(jsonb)') is null
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('acq_reponse_relayer', 'acq_envoi_marquer', 'acq_oppositions_depuis'))
            then 'oui' else 'NON (anormal)' end;
