  -- scripts/fixtures/026-horloge-bus/essais/0096.sql — le scénario de l'essai à sec de 0096 (026-010, cahier OS-8), écrit par
  -- 026-009 avant la migration. `ops-sql-qa.mjs --migration=0096 --generer-essai` le place dans le bloc d'essai, après
  -- l'exécution du jumeau nu : il ne déclare que ses propres variables, accumule ses assertions dans `r` (une clé par cas, un
  -- booléen ; les clés `diag_*` ne sont que des diagnostics) et n'écrit que des lignes d'essai marquées essai_e2e, qui partent
  -- avec l'exception finale. Voie gratuite du 25/09 : canaux formulaire_site et email_sollicite, plus de canal email, plus de
  -- boîte d'envoi, colonne id_externe.
  <<essai_0096>>
  declare
    v_ok boolean;
    v_p uuid;
    v_ev bigint;
    v_role text;
  begin
    -- ── Les 11 tables, sous RLS, sans politique ────────────────────────────────────────────────────────────────────────
    select count(*) = 11 into v_ok
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'ops' and c.relkind = 'r'
       and c.relname in ('agents', 'taches', 'evenements', 'decisions', 'prospects', 'envois', 'opposition', 'maquettes',
                         'quotas_canaux', 'couts', 'interrupteurs');
    r := r || jsonb_build_object('tables_11', v_ok);

    select count(*) = 11 into v_ok
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'ops' and c.relkind = 'r' and c.relrowsecurity
       and c.relname in ('agents', 'taches', 'evenements', 'decisions', 'prospects', 'envois', 'opposition', 'maquettes',
                         'quotas_canaux', 'couts', 'interrupteurs');
    r := r || jsonb_build_object('rls_11', v_ok);

    select count(*) = 0 into v_ok from pg_policies where schemaname = 'ops';
    r := r || jsonb_build_object('politiques_0', v_ok);

    -- ── Les graines, exactes ────────────────────────────────────────────────────────────────────────────────────────────
    select count(*) = 2
       and count(*) filter (where nom = 'systeme' and libelle = 'Plomberie SQL' and periode_minutes = 10080
                              and cardinality(tables_ecrites) = 0) = 1
       and count(*) filter (where nom = 'a0' and libelle = 'Veilleur' and periode_minutes = 5
                              and tables_ecrites @> array['evenements', 'decisions']
                              and tables_ecrites <@ array['evenements', 'decisions']) = 1
      into v_ok from ops.agents;
    r := r || jsonb_build_object('graines_agents', v_ok);

    select count(*) = 8
       and count(*) filter (where (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) in (
             ('instagram', '*', 0, 0), ('facebook', '*', 0, 0), ('linkedin', '*', 0, 0), ('formulaire_site', '*', 0, 0),
             ('email_sollicite', '*', 50, 0), ('reponse_privee', '*', 50, 0), ('messagerie', '*', 100, 0),
             ('essai_e2e', '*', 4, 4))) = 8
      into v_ok from ops.quotas_canaux;
    r := r || jsonb_build_object('graines_quotas', v_ok);

    select count(*) = 2 and count(*) filter (where nom in ('pause_generale', 'envoi_froid') and not actif) = 2
      into v_ok from ops.interrupteurs;
    r := r || jsonb_build_object('graines_interrupteurs', v_ok);

    -- ── Tâches : un témoin accepté, puis chaque refus ne diffère du témoin que par la valeur éprouvée ───────────────────
    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, objet)
      values ('essai', 'essai_e2e:temoin', 'essai', 'systeme', 'essai_e2e:objet');
      r := r || jsonb_build_object('temoin_tache_acceptee', true);
    exception when others then
      r := r || jsonb_build_object('temoin_tache_acceptee', false, 'diag_temoin_tache', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, profondeur)
      values ('essai', 'essai_e2e:profondeur_4', 'essai', 'systeme', 4);
      r := r || jsonb_build_object('refus_profondeur_4', false);
    exception when others then
      r := r || jsonb_build_object('refus_profondeur_4', sqlstate = '23514', 'diag_refus_profondeur_4', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, tentatives)
      values ('essai', 'essai_e2e:tentatives_4', 'essai', 'systeme', 4);
      r := r || jsonb_build_object('refus_tentatives_4', false);
    exception when others then
      r := r || jsonb_build_object('refus_tentatives_4', sqlstate = '23514', 'diag_refus_tentatives_4', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par)
      values ('essai', 'essai_e2e:temoin', 'essai', 'systeme');
      r := r || jsonb_build_object('refus_cle_en_double', false);
    exception when others then
      r := r || jsonb_build_object('refus_cle_en_double', sqlstate = '23505', 'diag_refus_cle_en_double', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, objet)
      values ('essai', 'essai_e2e:meme_objet', 'essai', 'systeme', 'essai_e2e:objet');
      r := r || jsonb_build_object('refus_seconde_tache_ouverte_meme_objet', false);
    exception when others then
      r := r || jsonb_build_object('refus_seconde_tache_ouverte_meme_objet', sqlstate = '23505', 'diag_refus_meme_objet', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, objet, statut)
      values ('essai', 'essai_e2e:meme_objet_annulee', 'essai', 'systeme', 'essai_e2e:objet', 'annulee');
      r := r || jsonb_build_object('tache_fermee_meme_objet_acceptee', true);
    exception when others then
      r := r || jsonb_build_object('tache_fermee_meme_objet_acceptee', false, 'diag_tache_fermee', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, statut)
      values ('essai', 'essai_e2e:faite_sans_preuve', 'essai', 'systeme', 'faite');
      r := r || jsonb_build_object('refus_faite_sans_preuve', false);
    exception when others then
      r := r || jsonb_build_object('refus_faite_sans_preuve', sqlstate = '23514', 'diag_refus_faite_sans_preuve', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.taches (type, cle_idempotence, capacite, cree_par, statut, agent)
      values ('essai', 'essai_e2e:bail_sans_echeance', 'essai', 'systeme', 'bail', 'systeme');
      r := r || jsonb_build_object('refus_bail_sans_echeance', false);
    exception when others then
      r := r || jsonb_build_object('refus_bail_sans_echeance', sqlstate = '23514', 'diag_refus_bail_sans_echeance', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Événements : ajout seul, sauf sous ops.purge = 'oui' ─────────────────────────────────────────────────────────────
    begin
      insert into ops.evenements (agent, type, resume) values ('systeme', 'essai', 'essai_e2e evenement') returning id into v_ev;
      r := r || jsonb_build_object('temoin_evenement_accepte', v_ev is not null);
    exception when others then
      r := r || jsonb_build_object('temoin_evenement_accepte', false, 'diag_temoin_evenement', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      update ops.evenements set resume = 'essai_e2e modifie' where id = v_ev;
      r := r || jsonb_build_object('refus_update_evenements', false);
    exception when others then
      r := r || jsonb_build_object('refus_update_evenements', v_ev is not null and sqlstate not like '42%', 'diag_refus_update_evenements', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      delete from ops.evenements where id = v_ev;
      r := r || jsonb_build_object('refus_delete_evenements', false);
    exception when others then
      r := r || jsonb_build_object('refus_delete_evenements', v_ev is not null and sqlstate not like '42%', 'diag_refus_delete_evenements', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform set_config('ops.purge', 'oui', true);
      delete from ops.evenements where id = v_ev;
      r := r || jsonb_build_object('purge_permise_sous_ops_purge', v_ev is not null and not exists (select 1 from ops.evenements where id = v_ev));
      perform set_config('ops.purge', '', true);
    exception when others then
      r := r || jsonb_build_object('purge_permise_sous_ops_purge', false, 'diag_purge', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Décisions : 2 à 7 options ─────────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.decisions (question, options, option_defaut, echeance, creee_par)
      values ('essai_e2e : deux options ?', '[{"cle": "oui"}, {"cle": "non"}]'::jsonb, 'non', now() + interval '1 day', 'systeme');
      r := r || jsonb_build_object('temoin_decision_acceptee', true);
    exception when others then
      r := r || jsonb_build_object('temoin_decision_acceptee', false, 'diag_temoin_decision', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.decisions (question, options, option_defaut, echeance, creee_par)
      values ('essai_e2e : une option ?', '[{"cle": "oui"}]'::jsonb, 'oui', now() + interval '1 day', 'systeme');
      r := r || jsonb_build_object('refus_decision_une_option', false);
    exception when others then
      r := r || jsonb_build_object('refus_decision_une_option', sqlstate = '23514', 'diag_refus_decision_une_option', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Prospects et maquettes ───────────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.prospects (cle_dedup, domaine) values ('domaine:essai-e2e.invalid', 'essai-e2e.invalid') returning id into v_p;
      r := r || jsonb_build_object('temoin_prospect_accepte', v_p is not null);
    exception when others then
      r := r || jsonb_build_object('temoin_prospect_accepte', false, 'diag_temoin_prospect', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.prospects (cle_dedup) values ('essai_e2e');
      r := r || jsonb_build_object('refus_cle_dedup_mal_formee', false);
    exception when others then
      r := r || jsonb_build_object('refus_cle_dedup_mal_formee', sqlstate = '23514', 'diag_refus_cle_dedup', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.maquettes (prospect_id, objet) values (v_p, 'essai_e2e/maquette');
      r := r || jsonb_build_object('temoin_maquette_acceptee', v_p is not null);
    exception when others then
      r := r || jsonb_build_object('temoin_maquette_acceptee', false, 'diag_temoin_maquette', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.maquettes (prospect_id, objet, expire_le) values (v_p, 'essai_e2e/maquette_22', now() + interval '22 days');
      r := r || jsonb_build_object('refus_maquette_22_jours', false);
    exception when others then
      r := r || jsonb_build_object('refus_maquette_22_jours', v_p is not null and sqlstate = '23514', 'diag_refus_maquette_22', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Envois : trois verdicts, approuvés par le seul Facteur, voie gratuite ─────────────────────────────────────────────
    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, empreinte_texte)
      values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', repeat('0', 64));
      r := r || jsonb_build_object('envoi_formulaire_facteur_usine_accepte', v_p is not null);
    exception when others then
      r := r || jsonb_build_object('envoi_formulaire_facteur_usine_accepte', false, 'diag_envoi_formulaire', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte)
      values (v_p, 'email_sollicite', 'gmail', 'reponse', 'essai_e2e@example.invalid', repeat('1', 64));
      r := r || jsonb_build_object('envoi_email_sollicite_gmail_accepte', v_p is not null);
    exception when others then
      r := r || jsonb_build_object('envoi_email_sollicite_gmail_accepte', false, 'diag_envoi_email_sollicite', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (canal, envoyeur, type, destinataire, empreinte_texte)
      values ('reponse_privee', 'repondeur', 'reponse', 'essai_e2e_meta', repeat('2', 64));
      r := r || jsonb_build_object('envoi_reponse_privee_sans_prospect_accepte', true);
    exception when others then
      r := r || jsonb_build_object('envoi_reponse_privee_sans_prospect_accepte', false, 'diag_envoi_reponse_privee', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, empreinte_texte, statut, approuve_par_agent)
      values (v_p, 'essai_e2e', 'systeme', 'premier_contact', repeat('3', 64), 'approuve', 'a0');
      r := r || jsonb_build_object('envoi_essai_approuve_hors_facteur_accepte', v_p is not null);
    exception when others then
      r := r || jsonb_build_object('envoi_essai_approuve_hors_facteur_accepte', false, 'diag_envoi_essai_approuve', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, empreinte_texte, statut)
      values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', repeat('4', 64), 'approuvee');
      r := r || jsonb_build_object('refus_envoi_statut_approuvee', false);
    exception when others then
      r := r || jsonb_build_object('refus_envoi_statut_approuvee', v_p is not null and sqlstate = '23514', 'diag_refus_statut_approuvee', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, empreinte_texte, statut, approuve_par_agent)
      values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', repeat('5', 64), 'approuve', 'a0');
      r := r || jsonb_build_object('refus_envoi_approuve_hors_facteur', false);
    exception when others then
      r := r || jsonb_build_object('refus_envoi_approuve_hors_facteur', v_p is not null and sqlstate = '23514', 'diag_refus_approuve_hors_facteur', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (canal, envoyeur, type, empreinte_texte)
      values ('formulaire_site', 'facteur_usine', 'premier_contact', repeat('6', 64));
      r := r || jsonb_build_object('refus_envoi_formulaire_sans_prospect', false);
    exception when others then
      r := r || jsonb_build_object('refus_envoi_formulaire_sans_prospect', sqlstate = '23514', 'diag_refus_formulaire_sans_prospect', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte)
      values (v_p, 'email', 'gmail', 'premier_contact', 'essai_e2e@example.invalid', repeat('7', 64));
      r := r || jsonb_build_object('refus_envoi_canal_email', false);
    exception when others then
      r := r || jsonb_build_object('refus_envoi_canal_email', v_p is not null and sqlstate = '23514', 'diag_refus_canal_email', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, empreinte_texte, verdicts)
      values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', repeat('8', 64), '[]'::jsonb);
      r := r || jsonb_build_object('refus_verdicts_non_objet', false);
    exception when others then
      r := r || jsonb_build_object('refus_verdicts_non_objet', v_p is not null and sqlstate = '23514', 'diag_refus_verdicts', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Quotas par canal ─────────────────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('essai_e2e', 'essai_e2e_a', 4, 4);
      r := r || jsonb_build_object('temoin_quota_accepte', true);
    exception when others then
      r := r || jsonb_build_object('temoin_quota_accepte', false, 'diag_temoin_quota', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('essai_e2e', 'essai_e2e_b', 301, 0);
      r := r || jsonb_build_object('refus_quota_301', false);
    exception when others then
      r := r || jsonb_build_object('refus_quota_301', sqlstate = '23514', 'diag_refus_quota_301', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('essai_e2e', 'essai_e2e_c', 4, 5);
      r := r || jsonb_build_object('refus_nouveaux_au_dessus_du_jour', false);
    exception when others then
      r := r || jsonb_build_object('refus_nouveaux_au_dessus_du_jour', sqlstate = '23514', 'diag_refus_nouveaux', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Interrupteurs ────────────────────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.interrupteurs (nom) values ('essai_e2e');
      r := r || jsonb_build_object('refus_interrupteur_inconnu', false);
    exception when others then
      r := r || jsonb_build_object('refus_interrupteur_inconnu', sqlstate = '23514', 'diag_refus_interrupteur', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Opposition : définitive ou temporaire ────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le)
      values ('domaine', 'essai-e2e.invalid', 'essai_e2e pas maintenant', 'essai_e2e', now() + interval '90 days');
      r := r || jsonb_build_object('temoin_opposition_temporaire_acceptee', true);
    exception when others then
      r := r || jsonb_build_object('temoin_opposition_temporaire_acceptee', false, 'diag_temoin_opposition', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e.invalid', 'essai_e2e', 'essai_e2e');
      r := r || jsonb_build_object('refus_opposition_en_double', false);
    exception when others then
      r := r || jsonb_build_object('refus_opposition_en_double', sqlstate = '23505', 'diag_refus_opposition_double', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'Essai-E2E-Majuscules.invalid', 'essai_e2e', 'essai_e2e');
      r := r || jsonb_build_object('refus_opposition_hors_minuscules', false);
    exception when others then
      r := r || jsonb_build_object('refus_opposition_hors_minuscules', sqlstate = '23514', 'diag_refus_opposition_minuscules', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le)
      values ('email', 'essai_e2e@example.invalid', 'essai_e2e', 'essai_e2e', now() - interval '1 day');
      r := r || jsonb_build_object('refus_opposition_expire_avant_creation', false);
    exception when others then
      r := r || jsonb_build_object('refus_opposition_expire_avant_creation', sqlstate = '23514', 'diag_refus_opposition_expire', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Aucun rôle de l'API ne lit ops (le schéma est fermé à tous, service_role compris) ─────────────────────────────────
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform 1 from ops.taches limit 1;
      r := r || jsonb_build_object('anon_refuse_select_taches', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_select_taches', v_role = 'anon' and sqlstate = '42501', 'diag_anon', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform 1 from ops.taches limit 1;
      r := r || jsonb_build_object('authenticated_refuse_select_taches', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_select_taches', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role service_role;
      v_role := current_user;
      perform 1 from ops.taches limit 1;
      r := r || jsonb_build_object('service_role_refuse_select_taches', false);
    exception when others then
      r := r || jsonb_build_object('service_role_refuse_select_taches', v_role = 'service_role' and sqlstate = '42501', 'diag_service_role', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
  end essai_0096;
