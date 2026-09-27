  -- scripts/fixtures/026-horloge-bus/essais/0100.sql — le scénario de l'essai à sec de 0100 (026-036, cahier FA-6), écrit par
  -- 026-032 avant la migration. Placé par `argent-sql-qa.mjs --generer-essai [--avec=0096,0097,0098,0099]` dans le bloc
  -- d'essai, après les jumeaux nus. Une clé par cas dans `r` ; les clés `diag_*` ne sont que des diagnostics. Les erreurs
  -- métier se lisent `sqlstate = 'P0001' and sqlerrm = 'ops:<code>'`.
  --
  -- Seules des clés essai_e2e:0100:… sont écrites. pgmq travaille dans la transaction : les messages envoyés, lus, archivés
  -- ou supprimés ici partent avec l'exception finale. La mort d'un travailleur est simulée par pgmq.set_vt(…, 0), qui rend le
  -- message aussitôt visible. Chaque groupe finit par l'exception « essai_026:fin_de_groupe » : ses écritures (et ses
  -- messages) sont défaites, les clés posées dans `r` restent ; la file de chaque groupe ne voit donc que ses messages.
  <<essai_0100>>
  declare
    v_cle text := 'essai_e2e:0100:a';
    v_cle2 text := 'essai_e2e:0100:b';
    v_m bigint;
    v_m2 bigint;
    v_x bigint;
    v_n int;
    v_lect int;
    v_i int;
    v_b boolean;
    v_role text;
    v_ev0 bigint;
    v_ev1 bigint;
    v_etat jsonb;
    v_fin constant text := 'essai_026:fin_de_groupe';
  begin
    -- ── A. Envoyer une fois par clé, lire sous délai, relire après la mort du travailleur, marquer fait ──────────────────
    begin
      v_m := public.ops_argent_envoyer('essai_e2e', v_cle, '{"essai": 1}'::jsonb, 0);
      r := r || jsonb_build_object('envoyer_rend_un_msg_id', v_m is not null);
      r := r || jsonb_build_object('msg_id_note', exists (select 1 from ops.argent_messages where cle = v_cle and msg_id = v_m));
      v_m2 := public.ops_argent_envoyer('essai_e2e', v_cle, '{"essai": 2}'::jsonb, 0);
      r := r || jsonb_build_object('second_envoi_rend_null', v_m2 is null);
      select count(*) into v_n from pgmq.q_argent where message ->> 'cle' = v_cle;
      r := r || jsonb_build_object('un_seul_message_en_file', v_n = 1, 'diag_en_file', v_n);
      select count(*), max(msg_id), max(lectures) into v_n, v_x, v_lect from public.ops_argent_lire(30, 10) where cle = v_cle;
      r := r || jsonb_build_object('lire_30s_rend_le_message', v_n = 1 and v_x = v_m);
      r := r || jsonb_build_object('lire_30s_lectures_1', v_lect = 1, 'diag_lectures_1', v_lect);
      select count(*) into v_n from public.ops_argent_lire(30, 10) where cle = v_cle;
      r := r || jsonb_build_object('relu_aussitot_rien', v_n = 0, 'diag_relu_aussitot', v_n);
      perform pgmq.set_vt('argent', v_m, 0);
      select count(*), max(msg_id), max(lectures) into v_n, v_x, v_lect from public.ops_argent_lire(30, 10) where cle = v_cle;
      r := r || jsonb_build_object('set_vt_0_relu_meme_msg_id', v_n = 1 and v_x = v_m);
      r := r || jsonb_build_object('relu_lectures_2', v_lect = 2, 'diag_lectures_2', v_lect);
      v_b := public.ops_argent_fait(v_m, v_cle, '{"essai": "fait"}'::jsonb);
      r := r || jsonb_build_object('fait_rend_true', v_b is true);
      r := r || jsonb_build_object('fait_le_pose', exists (select 1 from ops.argent_messages where cle = v_cle and fait_le is not null and resultat is not null));
      v_b := public.ops_argent_fait(v_m, v_cle, '{"essai": "fait"}'::jsonb);
      r := r || jsonb_build_object('fait_second_rend_false', v_b is false);
      r := r || jsonb_build_object('fait_plus_en_file', not exists (select 1 from pgmq.q_argent where msg_id = v_m));
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_envoi', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── B. Lu 4 fois sans « fait » : archivé à la 4e lecture, abandonne_le, un événement argent_abandonne ────────────────
    begin
      v_m := public.ops_argent_envoyer('essai_e2e', v_cle2, '{}'::jsonb, 0);
      v_n := 0;
      for v_i in 1..3 loop
        select v_n + count(*) into v_n from public.ops_argent_lire(30, 10) where cle = v_cle2 and lectures = v_i;
        perform pgmq.set_vt('argent', v_m, 0);
      end loop;
      r := r || jsonb_build_object('trois_lectures_rendues', v_n = 3, 'diag_trois_lectures', v_n);
      select count(*) into v_ev0 from ops.evenements where type = 'argent_abandonne';
      select count(*) into v_n from public.ops_argent_lire(30, 10) where cle = v_cle2;
      r := r || jsonb_build_object('quatrieme_lecture_non_rendue', v_n = 0, 'diag_quatrieme', v_n);
      r := r || jsonb_build_object('quatrieme_lecture_archive', exists (select 1 from pgmq.a_argent where msg_id = v_m) and not exists (select 1 from pgmq.q_argent where msg_id = v_m));
      r := r || jsonb_build_object('abandonne_le_pose', exists (select 1 from ops.argent_messages where cle = v_cle2 and abandonne_le is not null));
      select count(*) into v_ev1 from ops.evenements where type = 'argent_abandonne';
      r := r || jsonb_build_object('evenement_argent_abandonne', v_ev1 = v_ev0 + 1 and exists (select 1 from ops.evenements where type = 'argent_abandonne' and agent = 'systeme' and le >= now()),
                                   'diag_abandon', v_ev0 || ' puis ' || v_ev1);
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_abandon', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── C. Refus : type inconnu, délai hors 5-3600 ; p_n borné à 1-10 ────────────────────────────────────────────────────
    begin
      begin
        perform public.ops_argent_envoyer('type_inconnu', 'essai_e2e:0100:c', '{}'::jsonb, 0);
        r := r || jsonb_build_object('type_inconnu_type_argent', false, 'diag_type', 'accepté');
      exception when others then
        r := r || jsonb_build_object('type_inconnu_type_argent', sqlstate = 'P0001' and sqlerrm = 'ops:type_argent', 'diag_type', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        perform 1 from public.ops_argent_lire(2, 1);
        r := r || jsonb_build_object('vt_2s_refuse', false, 'diag_vt_2', 'accepté');
      exception when others then
        r := r || jsonb_build_object('vt_2s_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:vt', 'diag_vt_2', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        perform 1 from public.ops_argent_lire(3601, 1);
        r := r || jsonb_build_object('vt_3601_refuse', false, 'diag_vt_3601', 'accepté');
      exception when others then
        r := r || jsonb_build_object('vt_3601_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:vt', 'diag_vt_3601', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      v_m := public.ops_argent_envoyer('essai_e2e', 'essai_e2e:0100:d', '{}'::jsonb, 0);
      select count(*) into v_n from public.ops_argent_lire(30, 0) where cle = 'essai_e2e:0100:d';
      r := r || jsonb_build_object('n_zero_lit_un_message', v_n = 1, 'diag_n_zero', v_n);
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_refus', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── D. L'état de la file et le ménage des essais ────────────────────────────────────────────────────────────────────
    begin
      v_m := public.ops_argent_envoyer('essai_e2e', 'essai_e2e:0100:e', '{}'::jsonb, 0);
      v_etat := public.ops_argent_etat();
      r := r || jsonb_build_object('etat_cinq_cles', v_etat ?& array['en_file', 'plus_vieux_s', 'abandonnes_24h', 'faits_24h', 'non_faits_plus_de_15_min'], 'diag_etat', left(v_etat::text, 160));
      v_n := public.ops_argent_essai_effacer();
      r := r || jsonb_build_object('essai_effacer_efface', v_n >= 1 and not exists (select 1 from ops.argent_messages where cle like 'essai_e2e:%')
                                   and not exists (select 1 from pgmq.q_argent where msg_id = v_m), 'diag_effacer', v_n);
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_etat', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── E. anon et authenticated : les 5 fonctions et le schéma pgmq refusés (42501) ────────────────────────────────────
    v_role := null; v_n := 0;
    begin
      set local role anon;
      v_role := current_user;
      begin perform public.ops_argent_envoyer('essai_e2e', 'essai_e2e:0100:anon', '{}'::jsonb, 0); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform 1 from public.ops_argent_lire(30, 1); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_fait(0, 'essai_e2e:0100:anon', '{}'::jsonb); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_etat(); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_essai_effacer(); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      r := r || jsonb_build_object('anon_refuse_cinq_fonctions', v_role = 'anon' and v_n = 5, 'diag_anon_fonctions', coalesce(v_role, '?') || ' ' || v_n || '/5');
      begin
        perform 1 from pgmq.list_queues();
        r := r || jsonb_build_object('anon_refuse_pgmq', false, 'diag_anon_pgmq', 'accepté');
      exception when others then
        r := r || jsonb_build_object('anon_refuse_pgmq', sqlstate = '42501', 'diag_anon_pgmq', sqlstate || ' ' || left(sqlerrm, 120));
      end;
    exception when others then
      r := r || jsonb_build_object('anon_refuse_cinq_fonctions', false, 'anon_refuse_pgmq', false, 'diag_anon', sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null; v_n := 0;
    begin
      set local role authenticated;
      v_role := current_user;
      begin perform public.ops_argent_envoyer('essai_e2e', 'essai_e2e:0100:auth', '{}'::jsonb, 0); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform 1 from public.ops_argent_lire(30, 1); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_fait(0, 'essai_e2e:0100:auth', '{}'::jsonb); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_etat(); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      begin perform public.ops_argent_essai_effacer(); exception when others then if sqlstate = '42501' then v_n := v_n + 1; end if; end;
      r := r || jsonb_build_object('authenticated_refuse_cinq_fonctions', v_role = 'authenticated' and v_n = 5, 'diag_authenticated_fonctions', coalesce(v_role, '?') || ' ' || v_n || '/5');
      begin
        perform 1 from pgmq.list_queues();
        r := r || jsonb_build_object('authenticated_refuse_pgmq', false, 'diag_authenticated_pgmq', 'accepté');
      exception when others then
        r := r || jsonb_build_object('authenticated_refuse_pgmq', sqlstate = '42501', 'diag_authenticated_pgmq', sqlstate || ' ' || left(sqlerrm, 120));
      end;
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_cinq_fonctions', false, 'authenticated_refuse_pgmq', false, 'diag_authenticated', sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    begin
      r := r || jsonb_build_object('anon_sans_usage_pgmq', not has_schema_privilege('anon', 'pgmq', 'usage'));
      r := r || jsonb_build_object('authenticated_sans_usage_pgmq', not has_schema_privilege('authenticated', 'pgmq', 'usage'));
    exception when others then
      r := r || jsonb_build_object('anon_sans_usage_pgmq', false, 'authenticated_sans_usage_pgmq', false, 'diag_usage_pgmq', sqlstate || ' ' || left(sqlerrm, 120));
    end;
  end essai_0100;
