  -- scripts/fixtures/026-horloge-bus/essais/0097.sql — le scénario de l'essai à sec de 0097 (026-011, cahier OI-6), écrit par
  -- 026-009 avant la migration. Placé par `ops-sql-qa.mjs --migration=0097 --generer-essai [--avec=0096]` dans le bloc
  -- d'essai, après les jumeaux nus. Une clé par cas dans `r` ; les clés `diag_*` ne sont que des diagnostics. Les
  -- erreurs métier se lisent `sqlstate = 'P0001' and sqlerrm = 'ops:<code>'` (contrat de 0097). Seules des lignes d'essai
  -- (agents essai_e2e_*, et un agent r_essai_e2e pour le retrait ordinaire) sont écrites ; tout part avec l'exception finale.
  <<essai_0097>>
  declare
    v_ok boolean;
    v_h text := md5('essai_e2e_a:jeton:1') || md5('essai_e2e_a:jeton:2');
    v_h2 text := md5('r_essai_e2e:jeton:1') || md5('r_essai_e2e:jeton:2');
    v_n0 bigint;
    v_n1 bigint;
    v_id0 bigint;
    v_idb bigint;
    v_vieux bigint;
    v_jour bigint;
    v_f uuid;
    v_role text;
    v_ts timestamptz;
    v_c bigint;
  begin
    -- ── Enregistrer : un événement ───────────────────────────────────────────────────────────────────────────────────────
    begin
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_agent_enregistrer('essai_e2e_a', 'Essai A', array['essai']::text[], array['essai']::text[],
                                           array['evenements']::text[], 60, 30, 50, 1::numeric);
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_enregistrer', v_n1 = v_n0 + 1
                                     and exists (select 1 from ops.agents where nom = 'essai_e2e_a' and libelle = 'Essai A'));
    exception when others then
      r := r || jsonb_build_object('un_evenement_enregistrer', false, 'diag_enregistrer', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Jeton : format, pose, lecture ────────────────────────────────────────────────────────────────────────────────────
    begin
      perform public.ops_agent_poser_jeton('essai_e2e_a', 'zz_pas_hexadecimal');
      r := r || jsonb_build_object('jeton_hors_format_refuse', false);
    exception when others then
      r := r || jsonb_build_object('jeton_hors_format_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:jeton_format', 'diag_jeton_format', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_agent_poser_jeton('essai_e2e_a', v_h);
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_poser_jeton', v_n1 = v_n0 + 1);
      select count(*) = 1 and coalesce(bool_and(nom = 'essai_e2e_a' and not en_pause), false) into v_ok from public.ops_agent_par_jeton(v_h);
      r := r || jsonb_build_object('par_jeton_rend_agent', v_ok);
      r := r || jsonb_build_object('jeton_absent_du_journal', not exists (
        select 1 from ops.evenements where position(v_h in coalesce(resume, '') || ' ' || coalesce(objet, '')) > 0));
      r := r || jsonb_build_object('jeton_pose_le_pose', exists (select 1 from ops.agents where nom = 'essai_e2e_a' and jeton_pose_le is not null));
    exception when others then
      r := r || jsonb_build_object('un_evenement_poser_jeton', false, 'par_jeton_rend_agent', false, 'jeton_absent_du_journal', false,
                                   'jeton_pose_le_pose', false, 'diag_poser_jeton', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) = 0 into v_ok from public.ops_agent_par_jeton(md5('essai_e2e:inconnu:1') || md5('essai_e2e:inconnu:2'));
      r := r || jsonb_build_object('par_jeton_inconnu_zero_ligne', v_ok);
    exception when others then
      r := r || jsonb_build_object('par_jeton_inconnu_zero_ligne', false, 'diag_par_jeton_inconnu', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Pause, puis reprise qui efface le disjoncteur ────────────────────────────────────────────────────────────────────
    begin
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_agent_pause('essai_e2e_a', true, 'essai_e2e pause');
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_pause', v_n1 = v_n0 + 1);
      select count(*) = 1 and coalesce(bool_and(en_pause), false) into v_ok from public.ops_agent_par_jeton(v_h);
      r := r || jsonb_build_object('pause_puis_par_jeton_en_pause', v_ok);
      update ops.agents set disjoncteur_ouvert_le = now() where nom = 'essai_e2e_a';
      perform public.ops_agent_pause('essai_e2e_a', false, null::text);
      r := r || jsonb_build_object('reprise_efface_disjoncteur', exists (
        select 1 from ops.agents where nom = 'essai_e2e_a' and not en_pause and disjoncteur_ouvert_le is null));
    exception when others then
      r := r || jsonb_build_object('un_evenement_pause', false, 'pause_puis_par_jeton_en_pause', false, 'reprise_efface_disjoncteur', false,
                                   'diag_pause', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Journal : résumé borné, lecture sans ses propres événements ──────────────────────────────────────────────────────
    begin
      perform public.ops_evenement_ajouter('essai_e2e_a', 'essai', null::text, repeat('x', 201), null::uuid);
      r := r || jsonb_build_object('resume_201_refuse', false);
    exception when others then
      r := r || jsonb_build_object('resume_201_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:resume', 'diag_resume_201', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      select public.ops_evenement_ajouter('essai_e2e_a', 'essai', null::text, 'essai_e2e evenement', null::uuid) into v_id0;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_evenement_ajouter', v_id0 is not null and v_n1 = v_n0 + 1);
    exception when others then
      r := r || jsonb_build_object('un_evenement_evenement_ajouter', false, 'diag_evenement_ajouter', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_agent_enregistrer('essai_e2e_b', 'Essai B', array['essai']::text[], array['essai']::text[],
                                           array['evenements']::text[], 60, 30, 50, 1::numeric);
      select coalesce(max(id), 0) into v_id0 from ops.evenements;
      perform public.ops_evenement_ajouter('essai_e2e_a', 'essai', null::text, 'essai_e2e de A', null::uuid);
      select public.ops_evenement_ajouter('essai_e2e_b', 'essai', null::text, 'essai_e2e de B 1', null::uuid) into v_idb;
      perform public.ops_evenement_ajouter('essai_e2e_b', 'essai', null::text, 'essai_e2e de B 2', null::uuid);
      r := r || jsonb_build_object('lire_ecarte_ses_evenements', not exists (
        select 1 from public.ops_evenements_lire('essai_e2e_a', v_id0, 200) l where l.agent = 'essai_e2e_a'));
      select count(*) into v_c from public.ops_evenements_lire('essai_e2e_a', v_id0, 200) l where l.agent = 'essai_e2e_b';
      r := r || jsonb_build_object('lire_rend_les_autres', v_c = 2);
      select count(*) = 1 and coalesce(bool_and(l.id > v_idb), false) into v_ok
        from public.ops_evenements_lire('essai_e2e_a', v_idb, 200) l where l.agent = 'essai_e2e_b';
      r := r || jsonb_build_object('lire_respecte_apres', v_ok and not exists (
        select 1 from public.ops_evenements_lire('essai_e2e_a', v_id0, 200) l where l.id <= v_id0));
      select count(*) <= 200 into v_ok from public.ops_evenements_lire('essai_e2e_a', 0, 100000);
      r := r || jsonb_build_object('lire_limite_bornee_200', v_ok);
    exception when others then
      r := r || jsonb_build_object('lire_ecarte_ses_evenements', false, 'lire_rend_les_autres', false, 'lire_respecte_apres', false,
                                   'lire_limite_bornee_200', false, 'diag_lire', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Purge : 30 jours au moins ────────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.evenements (le, agent, type, resume) values (now() - interval '100 days', 'essai_e2e_a', 'essai', 'essai_e2e vieux')
        returning id into v_vieux;
      insert into ops.evenements (agent, type, resume) values ('essai_e2e_a', 'essai', 'essai_e2e du jour') returning id into v_jour;
      perform public.ops_evenements_purger(30);
      r := r || jsonb_build_object('purger_30_efface_le_vieux', not exists (select 1 from ops.evenements where id = v_vieux));
      r := r || jsonb_build_object('purger_30_garde_le_jour', exists (select 1 from ops.evenements where id = v_jour));
    exception when others then
      r := r || jsonb_build_object('purger_30_efface_le_vieux', false, 'purger_30_garde_le_jour', false, 'diag_purger', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_evenements_purger(10);
      r := r || jsonb_build_object('purger_10_refuse', false);
    exception when others then
      r := r || jsonb_build_object('purger_10_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:purge', 'diag_purger_10', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Interrupteurs : lus par tous, posés par un fondateur seulement ───────────────────────────────────────────────────
    begin
      r := r || jsonb_build_object('interrupteur_lu', public.ops_interrupteur('pause_generale') = false);
    exception when others then
      r := r || jsonb_build_object('interrupteur_lu', false, 'diag_interrupteur_lu', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_interrupteur('essai_e2e');
      r := r || jsonb_build_object('interrupteur_inconnu_refuse', false);
    exception when others then
      r := r || jsonb_build_object('interrupteur_inconnu_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:interrupteur', 'diag_interrupteur_inconnu', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_interrupteur_poser('pause_generale', true, 'essai_e2e non fondateur', gen_random_uuid());
      r := r || jsonb_build_object('interrupteur_non_fondateur_refuse', false);
    exception when others then
      r := r || jsonb_build_object('interrupteur_non_fondateur_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:auteur', 'diag_interrupteur_non_fondateur', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select id into v_f from public.artisans where is_founder limit 1;
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_interrupteur_poser('pause_generale', true, 'essai_e2e fondateur', v_f);
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('interrupteur_fondateur_accepte', v_f is not null and public.ops_interrupteur('pause_generale'));
      r := r || jsonb_build_object('un_evenement_interrupteur_poser', v_f is not null and v_n1 = v_n0 + 1
                                     and exists (select 1 from ops.evenements where id > 0 and agent = 'systeme' and type = 'interrupteur'));
      perform public.ops_interrupteur_poser('pause_generale', false, 'essai_e2e fondateur, retour', v_f);
    exception when others then
      r := r || jsonb_build_object('interrupteur_fondateur_accepte', false, 'un_evenement_interrupteur_poser', false,
                                   'diag_interrupteur_fondateur', coalesce(v_f::text, 'aucun fondateur') || ' ' || sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Retrait : effacement complet d'un agent d'essai, retrait ordinaire sinon, systeme et a0 intouchables ────────────
    begin
      perform public.ops_agent_enregistrer('essai_e2e_x', 'Essai X', array['essai']::text[], array['essai']::text[],
                                           array['evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_evenement_ajouter('essai_e2e_x', 'essai', null::text, 'essai_e2e de X', null::uuid);
      perform public.ops_agent_retirer('essai_e2e_x');
      r := r || jsonb_build_object('retirer_essai_efface_agent_et_evenements',
        not exists (select 1 from ops.agents where nom = 'essai_e2e_x') and not exists (select 1 from ops.evenements where agent = 'essai_e2e_x'));
    exception when others then
      r := r || jsonb_build_object('retirer_essai_efface_agent_et_evenements', false, 'diag_retirer_essai', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_agent_enregistrer('r_essai_e2e', 'Retrait ordinaire', array['essai']::text[], array['essai']::text[],
                                           array['evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_poser_jeton('r_essai_e2e', v_h2);
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_agent_retirer('r_essai_e2e');
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_retirer', v_n1 = v_n0 + 1);
      r := r || jsonb_build_object('retirer_ordinaire_garde_la_fiche', exists (
        select 1 from ops.agents where nom = 'r_essai_e2e' and jeton_hash is null and en_pause and retire_le is not null));
      select count(*) = 0 into v_ok from public.ops_agent_par_jeton(v_h2);
      r := r || jsonb_build_object('par_jeton_ignore_le_retire', v_ok);
    exception when others then
      r := r || jsonb_build_object('un_evenement_retirer', false, 'retirer_ordinaire_garde_la_fiche', false, 'par_jeton_ignore_le_retire', false,
                                   'diag_retirer_ordinaire', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_agent_retirer('a0');
      r := r || jsonb_build_object('retirer_a0_refuse', false);
    exception when others then
      r := r || jsonb_build_object('retirer_a0_refuse', sqlstate = 'P0001', 'diag_retirer_a0', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_agent_retirer('systeme');
      r := r || jsonb_build_object('retirer_systeme_refuse', false);
    exception when others then
      r := r || jsonb_build_object('retirer_systeme_refuse', sqlstate = 'P0001', 'diag_retirer_systeme', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Échéance du jeton externe : une date, puis null (jeton sans expiration, revue du 25/09) ─────────────────────────
    begin
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_agent_echeance('essai_e2e_a', now() + interval '60 days');
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('un_evenement_echeance', v_n1 = v_n0 + 1);
      r := r || jsonb_build_object('echeance_posee', exists (
        select 1 from ops.agents where nom = 'essai_e2e_a' and jeton_externe_expire_le = now() + interval '60 days'));
      perform public.ops_agent_echeance('essai_e2e_a', null::timestamptz);
      r := r || jsonb_build_object('echeance_nulle_acceptee', exists (
        select 1 from ops.agents where nom = 'essai_e2e_a' and jeton_externe_expire_le is null));
    exception when others then
      r := r || jsonb_build_object('un_evenement_echeance', false, 'echeance_posee', false, 'echeance_nulle_acceptee', false,
                                   'diag_echeance', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Battement : sans événement ───────────────────────────────────────────────────────────────────────────────────────
    begin
      select count(*) into v_n0 from ops.evenements;
      select public.ops_battement('essai_e2e_a') into v_ts;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('battement_sans_evenement', v_ts is not null and v_n1 = v_n0
                                     and exists (select 1 from ops.agents where nom = 'essai_e2e_a' and battement_le is not null));
    exception when others then
      r := r || jsonb_build_object('battement_sans_evenement', false, 'diag_battement', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── anon et authenticated n'exécutent rien (42501) ───────────────────────────────────────────────────────────────────
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_agent_par_jeton(v_h);
      r := r || jsonb_build_object('anon_refuse_par_jeton', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_par_jeton', v_role = 'anon' and sqlstate = '42501', 'diag_anon_par_jeton', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_interrupteur_poser('pause_generale', true, 'essai_e2e anon', gen_random_uuid());
      r := r || jsonb_build_object('anon_refuse_interrupteur_poser', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_interrupteur_poser', v_role = 'anon' and sqlstate = '42501', 'diag_anon_interrupteur', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_agent_par_jeton(v_h);
      r := r || jsonb_build_object('authenticated_refuse_par_jeton', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_par_jeton', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_par_jeton', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_interrupteur_poser('pause_generale', true, 'essai_e2e authenticated', gen_random_uuid());
      r := r || jsonb_build_object('authenticated_refuse_interrupteur_poser', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_interrupteur_poser', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_interrupteur', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
  end essai_0097;
