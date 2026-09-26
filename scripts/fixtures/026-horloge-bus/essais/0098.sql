  -- scripts/fixtures/026-horloge-bus/essais/0098.sql — le scénario de l'essai à sec de 0098 (026-013, cahier OT-6, cas a à t),
  -- écrit par 026-009 avant la migration. Placé par `ops-sql-qa.mjs --migration=0098 --generer-essai [--avec=0096,0097]` dans
  -- le bloc d'essai, après les jumeaux nus. Une clé par cas dans `r`, préfixée par la lettre du cahier ; les clés
  -- `diag_*` ne sont que des diagnostics. Chaque cas a ses propres agents d'essai (une capacité chacun) : une tâche prise par
  -- un cas ne l'est jamais par un autre, même si toutes ont le même `cree_le` (now() est figé dans la transaction). Les erreurs
  -- métier se lisent `sqlstate = 'P0001' and sqlerrm = 'ops:<code>'`. Seules des lignes d'essai (agents essai_e2e_*, clés
  -- essai_e2e:*) sont écrites ; tout part avec l'exception finale.
  <<essai_0098>>
  declare
    v_ok boolean;
    v_n0 bigint;
    v_n1 bigint;
    v_c bigint;
    v_cnt0 bigint;
    v_cnt1 bigint;
    v_t1 uuid;
    v_t2 uuid;
    v_t3 uuid;
    v_b1 boolean;
    v_b2 boolean;
    v_g0 uuid;
    v_g1 uuid;
    v_g2 uuid;
    v_g3 uuid;
    v_ts timestamptz;
    v_s text;
    v_s2 text;
    v_s3 text;
    v_f uuid;
    v_d uuid;
    v_kv uuid;
    v_ke uuid;
    v_ra1 uuid;
    v_ra2 uuid;
    v_rb1 uuid;
    v_etat jsonb;
    v_num numeric;
    v_num2 numeric;
    v_role text;
    v_opts jsonb := '[{"cle": "oui", "libelle": "Oui", "recommandee": false}, {"cle": "non", "libelle": "Non", "recommandee": true}]'::jsonb;
  begin
    -- ── Installation : un agent par cas ──────────────────────────────────────────────────────────────────────────────────
    begin
      perform public.ops_agent_enregistrer('essai_e2e_z', 'Essai Z, fabrique les taches', array['essai_z']::text[],
        array['essai', 'envoi', 'livrer_site']::text[], array['taches', 'evenements']::text[], 60, 30, 1000, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_a', 'Essai A', array['essai_a']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_q', 'Essai Q', array['essai_q']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 2, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_n', 'Essai N', array['essai_rien']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_e', 'Essai E', array['essai_e']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_f', 'Essai F', array['essai_f']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_f2', 'Essai F2', array['essai_f']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_g', 'Essai G', array['essai_g']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_g3', 'Essai G3', array['essai_g_trois']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_h', 'Essai H', array['essai_h']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_i', 'Essai I', array['essai_i']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_j', 'Essai J', array['envoi', 'livraison']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_k', 'Essai K', array['essai_k']::text[], array['essai']::text[], array['decisions', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_l', 'Essai L', array['essai_l']::text[], array['essai']::text[], array['couts', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_c', 'Essai C', array['essai_c']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_c2', 'Essai C2', array['essai_autre']::text[], array['essai']::text[], array['taches', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_ra', 'Essai RA', array['essai_ra']::text[], array['essai']::text[], array['decisions', 'evenements']::text[], 60, 30, 50, 1::numeric);
      perform public.ops_agent_enregistrer('essai_e2e_rb', 'Essai RB', array['essai_rb']::text[], array['essai']::text[], array['decisions', 'evenements']::text[], 60, 30, 50, 1::numeric);
      select count(*) = 18 into v_ok from ops.agents
       where nom = any (array['essai_e2e_z', 'essai_e2e_a', 'essai_e2e_q', 'essai_e2e_n', 'essai_e2e_e', 'essai_e2e_f', 'essai_e2e_f2',
                              'essai_e2e_g', 'essai_e2e_g3', 'essai_e2e_h', 'essai_e2e_i', 'essai_e2e_j', 'essai_e2e_k', 'essai_e2e_l',
                              'essai_e2e_c', 'essai_e2e_c2', 'essai_e2e_ra', 'essai_e2e_rb']);
      r := r || jsonb_build_object('installation_agents', v_ok);
    exception when others then
      r := r || jsonb_build_object('installation_agents', false, 'diag_installation', sqlstate || ' ' || left(sqlerrm, 160));
    end;
    select id into v_f from public.artisans where is_founder limit 1;

    -- ── (a) même clé deux fois : même id, creee = false, un seul événement ───────────────────────────────────────────────
    begin
      select count(*) into v_n0 from ops.evenements;
      select t.id, t.creee into v_t1, v_b1 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:a', 'essai_a', '{}'::jsonb, null::uuid, null::text) t;
      select t.id, t.creee into v_t2, v_b2 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:a', 'essai_a', '{}'::jsonb, null::uuid, null::text) t;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('a_meme_cle_meme_id', v_t1 is not null and v_t1 = v_t2 and v_b1 and not v_b2);
      r := r || jsonb_build_object('a_un_seul_evenement', v_n1 = v_n0 + 1);
      r := r || jsonb_build_object('a_tache_non_sortante_profondeur_0', exists (
        select 1 from ops.taches where id = v_t1 and not sortante and profondeur = 0 and statut = 'file' and cree_par = 'essai_e2e_a'));
    exception when others then
      r := r || jsonb_build_object('a_meme_cle_meme_id', false, 'a_un_seul_evenement', false, 'a_tache_non_sortante_profondeur_0', false,
                                   'diag_a', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (b) trois générations, pas de quatrième ; cinq enfants, pas de sixième ; origine absente ─────────────────────────
    begin
      select t.id into v_g0 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b0', 'essai_a', '{}'::jsonb, null::uuid, null::text) t;
      select t.id into v_g1 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b1', 'essai_a', '{}'::jsonb, v_g0, null::text) t;
      select t.id into v_g2 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b2', 'essai_a', '{}'::jsonb, v_g1, null::text) t;
      select t.id into v_g3 from public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b3', 'essai_a', '{}'::jsonb, v_g2, null::text) t;
      r := r || jsonb_build_object('b_trois_generations_passent', exists (
        select 1 from ops.taches where id = v_g3 and profondeur = 3 and origine_id = v_g2));
    exception when others then
      r := r || jsonb_build_object('b_trois_generations_passent', false, 'diag_b_generations', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b4', 'essai_a', '{}'::jsonb, v_g3, null::text);
      r := r || jsonb_build_object('b_quatrieme_generation_refusee', false);
    exception when others then
      r := r || jsonb_build_object('b_quatrieme_generation_refusee', v_g3 is not null and sqlstate = 'P0001' and sqlerrm = 'ops:profondeur',
                                   'diag_b_quatrieme', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      for k in 2..5 loop
        perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b0_enfant_' || k, 'essai_a', '{}'::jsonb, v_g0, null::text);
      end loop;
      r := r || jsonb_build_object('b_cinq_enfants_passent', v_g0 is not null and (select count(*) from ops.taches where origine_id = v_g0) = 5);
    exception when others then
      r := r || jsonb_build_object('b_cinq_enfants_passent', false, 'diag_b_enfants', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b0_enfant_6', 'essai_a', '{}'::jsonb, v_g0, null::text);
      r := r || jsonb_build_object('b_sixieme_enfant_refuse', false);
    exception when others then
      r := r || jsonb_build_object('b_sixieme_enfant_refuse', v_g0 is not null and sqlstate = 'P0001' and sqlerrm = 'ops:sous_taches',
                                   'diag_b_sixieme', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:b_orpheline', 'essai_a', '{}'::jsonb, gen_random_uuid(), null::text);
      r := r || jsonb_build_object('b_origine_absente_refusee', false);
    exception when others then
      r := r || jsonb_build_object('b_origine_absente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:origine', 'diag_b_origine', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (c) quota de 2 : la 3e création est refusée, une clé déjà connue passe ───────────────────────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_q', 'essai', 'essai_e2e:c1', 'essai_q', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_q', 'essai', 'essai_e2e:c2', 'essai_q', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('c_deux_creations_passent', (select count(*) from ops.taches where cree_par = 'essai_e2e_q') = 2);
    exception when others then
      r := r || jsonb_build_object('c_deux_creations_passent', false, 'diag_c_deux', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_q', 'essai', 'essai_e2e:c3', 'essai_q', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('c_troisieme_refusee_quota', false);
    exception when others then
      r := r || jsonb_build_object('c_troisieme_refusee_quota', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_c_quota', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select t.id, t.creee into v_t1, v_b1 from public.ops_tache_creer('essai_e2e_q', 'essai', 'essai_e2e:c1', 'essai_q', '{}'::jsonb, null::uuid, null::text) t;
      r := r || jsonb_build_object('c_cle_connue_passe_malgre_quota', v_t1 is not null and not v_b1);
    exception when others then
      r := r || jsonb_build_object('c_cle_connue_passe_malgre_quota', false, 'diag_c_cle_connue', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (d) type hors types_crees ────────────────────────────────────────────────────────────────────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_a', 'publication', 'essai_e2e:d', 'essai_a', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('d_type_hors_liste_refuse', false);
    exception when others then
      r := r || jsonb_build_object('d_type_hors_liste_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:type', 'diag_d', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (e) prendre : rien sans la capacité ; avec elle, un bail de 30 min (et un événement, cas p) ─────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:e', 'essai_e', '{}'::jsonb, null::uuid, null::text);
      select count(*) into v_c from public.ops_tache_prendre('essai_e2e_n');
      r := r || jsonb_build_object('e_sans_capacite_ne_prend_rien', v_c = 0);
      select count(*) into v_n0 from ops.evenements;
      select t.id, t.bail_jusqua into v_t1, v_ts from public.ops_tache_prendre('essai_e2e_e') t;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('e_prise_bail_30_min', v_t1 is not null
        and v_t1 = (select id from ops.taches where cle_idempotence = 'essai_e2e:e')
        and v_ts between now() + interval '29 minutes' and now() + interval '31 minutes'
        and exists (select 1 from ops.taches where id = v_t1 and statut = 'bail' and agent = 'essai_e2e_e'));
      r := r || jsonb_build_object('p_un_evenement_prendre', v_n1 = v_n0 + 1);
    exception when others then
      r := r || jsonb_build_object('e_sans_capacite_ne_prend_rien', false, 'e_prise_bail_30_min', false, 'p_un_evenement_prendre', false,
                                   'diag_e', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (f) rendre : bail perdu, preuve exigée, faite avec une preuve https ─────────────────────────────────────────────
    v_t1 := null;
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:f', 'essai_f', '{}'::jsonb, null::uuid, null::text);
      select t.id into v_t1 from public.ops_tache_prendre('essai_e2e_f') t;
    exception when others then
      r := r || jsonb_build_object('diag_f_prise', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_rendre('essai_e2e_f2', v_t1, 'faite', 'https://essai.invalid/f', null::text);
      r := r || jsonb_build_object('f_autre_agent_bail_perdu', false);
    exception when others then
      r := r || jsonb_build_object('f_autre_agent_bail_perdu', v_t1 is not null and sqlstate = 'P0001' and sqlerrm = 'ops:bail_perdu',
                                   'diag_f_bail_perdu', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_rendre('essai_e2e_f', v_t1, 'faite', null::text, null::text);
      r := r || jsonb_build_object('f_faite_sans_preuve_refusee', false);
    exception when others then
      r := r || jsonb_build_object('f_faite_sans_preuve_refusee', v_t1 is not null and sqlstate = 'P0001' and sqlerrm = 'ops:preuve',
                                   'diag_f_preuve', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      select public.ops_tache_rendre('essai_e2e_f', v_t1, 'faite', 'https://essai.invalid/preuve', null::text) into v_s;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('f_faite_avec_preuve_https', v_s = 'faite' and exists (
        select 1 from ops.taches where id = v_t1 and statut = 'faite' and preuve_url = 'https://essai.invalid/preuve' and bail_jusqua is null));
      r := r || jsonb_build_object('p_un_evenement_rendre', v_n1 = v_n0 + 1);
    exception when others then
      r := r || jsonb_build_object('f_faite_avec_preuve_https', false, 'p_un_evenement_rendre', false, 'diag_f_faite', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (g) même erreur deux fois → a_decider ; trois erreurs différentes → a_decider à la 3e ─────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:g', 'essai_g', '{}'::jsonb, null::uuid, null::text);
      select count(*) into v_cnt0 from ops.decisions where statut = 'ouverte' and option_defaut = 'annuler';
      select t.id into v_t1 from public.ops_tache_prendre('essai_e2e_g') t;
      select public.ops_tache_rendre('essai_e2e_g', v_t1, 'echec', null::text, 'essai_e2e erreur identique') into v_s;
      select t.id into v_t2 from public.ops_tache_prendre('essai_e2e_g') t;
      select public.ops_tache_rendre('essai_e2e_g', v_t2, 'echec', null::text, 'essai_e2e erreur identique') into v_s2;
      select count(*) into v_cnt1 from ops.decisions where statut = 'ouverte' and option_defaut = 'annuler';
      r := r || jsonb_build_object('g_meme_erreur_deux_fois_a_decider', v_s = 'file' and v_t2 = v_t1 and v_s2 = 'a_decider'
        and exists (select 1 from ops.taches where id = v_t1 and statut = 'a_decider') and v_cnt1 = v_cnt0 + 1);
    exception when others then
      r := r || jsonb_build_object('g_meme_erreur_deux_fois_a_decider', false, 'diag_g_meme', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:g3', 'essai_g_trois', '{}'::jsonb, null::uuid, null::text);
      select count(*) into v_cnt0 from ops.decisions where statut = 'ouverte' and option_defaut = 'annuler';
      select t.id into v_t1 from public.ops_tache_prendre('essai_e2e_g3') t;
      select public.ops_tache_rendre('essai_e2e_g3', v_t1, 'echec', null::text, 'essai_e2e erreur 1') into v_s;
      select t.id into v_t2 from public.ops_tache_prendre('essai_e2e_g3') t;
      select public.ops_tache_rendre('essai_e2e_g3', v_t2, 'echec', null::text, 'essai_e2e erreur 2') into v_s2;
      select t.id into v_t3 from public.ops_tache_prendre('essai_e2e_g3') t;
      select public.ops_tache_rendre('essai_e2e_g3', v_t3, 'echec', null::text, 'essai_e2e erreur 3') into v_s3;
      select count(*) into v_cnt1 from ops.decisions where statut = 'ouverte' and option_defaut = 'annuler';
      r := r || jsonb_build_object('g_trois_erreurs_a_decider_a_la_troisieme', v_s = 'file' and v_s2 = 'file' and v_s3 = 'a_decider'
        and v_t1 = v_t2 and v_t2 = v_t3 and v_cnt1 = v_cnt0 + 1
        and exists (select 1 from ops.taches where id = v_t1 and statut = 'a_decider' and tentatives = 3 and derniere_erreur = 'essai_e2e erreur 3'));
    exception when others then
      r := r || jsonb_build_object('g_trois_erreurs_a_decider_a_la_troisieme', false, 'diag_g_trois', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (h) trois échecs en une heure → agent en pause, disjoncteur ouvert, une décision ──────────────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:h1', 'essai_h', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:h2', 'essai_h', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:h3', 'essai_h', '{}'::jsonb, null::uuid, null::text);
      select count(*) into v_cnt0 from ops.decisions where statut = 'ouverte' and option_defaut = 'laisser_en_pause';
      for k in 1..3 loop
        select t.id into v_t1 from public.ops_tache_prendre('essai_e2e_h') t;
        perform public.ops_tache_rendre('essai_e2e_h', v_t1, 'echec', null::text, 'essai_e2e erreur h ' || k);
      end loop;
      select count(*) into v_cnt1 from ops.decisions where statut = 'ouverte' and option_defaut = 'laisser_en_pause';
      r := r || jsonb_build_object('h_trois_echecs_pause_disjoncteur_decision', v_cnt1 = v_cnt0 + 1 and exists (
        select 1 from ops.agents where nom = 'essai_e2e_h' and en_pause and disjoncteur_ouvert_le is not null));
    exception when others then
      r := r || jsonb_build_object('h_trois_echecs_pause_disjoncteur_decision', false, 'diag_h', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (i) bail daté du passé → remis en file avec une tentative de plus, a_decider à 3 ─────────────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:i', 'essai_i', '{}'::jsonb, null::uuid, null::text);
      select t.id into v_t1 from public.ops_tache_prendre('essai_e2e_i') t;
      update ops.taches set bail_jusqua = now() - interval '1 minute' where id = v_t1;
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_baux_expirer();
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('i_bail_expire_remis_en_file', exists (
        select 1 from ops.taches where id = v_t1 and statut = 'file' and tentatives = 1 and agent is null and bail_jusqua is null));
      r := r || jsonb_build_object('i_un_evenement_par_bail_expire', v_n1 = v_n0 + 1);
      for k in 2..3 loop
        select t.id into v_t2 from public.ops_tache_prendre('essai_e2e_i') t;
        update ops.taches set bail_jusqua = now() - interval '1 minute' where id = v_t2;
        perform public.ops_baux_expirer();
      end loop;
      r := r || jsonb_build_object('i_a_decider_a_trois', v_t2 = v_t1 and exists (
        select 1 from ops.taches where id = v_t1 and statut = 'a_decider' and tentatives = 3));
    exception when others then
      r := r || jsonb_build_object('i_bail_expire_remis_en_file', false, 'i_un_evenement_par_bail_expire', false, 'i_a_decider_a_trois', false,
                                   'diag_i', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (j) pause générale : prendre ignore une tâche envoi et prend une tâche livrer_site ────────────────────────────────
    begin
      r := r || jsonb_build_object('j_types_sortants', public.ops_type_sortant('envoi') and public.ops_type_sortant('publication')
        and public.ops_type_sortant('mise_en_ligne') and not public.ops_type_sortant('livrer_site'));
    exception when others then
      r := r || jsonb_build_object('j_types_sortants', false, 'diag_j_types', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_creer('essai_e2e_z', 'envoi', 'essai_e2e:j_envoi', 'envoi', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_z', 'livrer_site', 'essai_e2e:j_livrer', 'livraison', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('j_envoi_sortante', exists (select 1 from ops.taches where cle_idempotence = 'essai_e2e:j_envoi' and sortante)
        and exists (select 1 from ops.taches where cle_idempotence = 'essai_e2e:j_livrer' and not sortante));
      update ops.interrupteurs set actif = true where nom = 'pause_generale';
      select t.type into v_s from public.ops_tache_prendre('essai_e2e_j') t;
      select count(*) into v_c from public.ops_tache_prendre('essai_e2e_j');
      update ops.interrupteurs set actif = false where nom = 'pause_generale';
      r := r || jsonb_build_object('j_pause_generale_ignore_envoi_prend_livraison', v_s = 'livrer_site' and v_c = 0);
    exception when others then
      r := r || jsonb_build_object('j_envoi_sortante', false, 'j_pause_generale_ignore_envoi_prend_livraison', false,
                                   'diag_j', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (k) décisions : options, défaut, échéance, fondateur seul, une fois, défaut à l'échéance ─────────────────────────
    begin
      perform public.ops_decision_creer('essai_e2e_k', 'essai_e2e : une seule option ?', null::text,
        '[{"cle": "oui", "libelle": "Oui", "recommandee": true}]'::jsonb, 'oui', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_une', null::uuid);
      r := r || jsonb_build_object('k_une_option_refusee', false);
    exception when others then
      r := r || jsonb_build_object('k_une_option_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:options', 'diag_k_une', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_creer('essai_e2e_k', 'essai_e2e : aucune recommandee ?', null::text,
        '[{"cle": "oui", "libelle": "Oui", "recommandee": false}, {"cle": "non", "libelle": "Non", "recommandee": false}]'::jsonb,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_sans_reco', null::uuid);
      r := r || jsonb_build_object('k_aucune_recommandee_refusee', false);
    exception when others then
      r := r || jsonb_build_object('k_aucune_recommandee_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:options', 'diag_k_reco', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_creer('essai_e2e_k', 'essai_e2e : defaut hors options ?', null::text, v_opts,
        'peut_etre', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_defaut', null::uuid);
      r := r || jsonb_build_object('k_defaut_hors_options_refuse', false);
    exception when others then
      r := r || jsonb_build_object('k_defaut_hors_options_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:defaut', 'diag_k_defaut', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_creer('essai_e2e_k', 'essai_e2e : echeance trop proche ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '10 minutes', 'essai_e2e:k_proche', null::uuid);
      r := r || jsonb_build_object('k_echeance_trop_proche_refusee', false);
    exception when others then
      r := r || jsonb_build_object('k_echeance_trop_proche_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:echeance', 'diag_k_echeance', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      select d.id, d.creee into v_kv, v_b1 from public.ops_decision_creer('essai_e2e_k', 'essai_e2e : trancher ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_ok', null::uuid) d;
      select count(*) into v_n1 from ops.evenements;
      select d.id, d.creee into v_d, v_b2 from public.ops_decision_creer('essai_e2e_k', 'essai_e2e : trancher ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_ok', null::uuid) d;
      r := r || jsonb_build_object('k_decision_creee', v_kv is not null and v_b1 and exists (
        select 1 from ops.decisions where id = v_kv and statut = 'ouverte' and creee_par = 'essai_e2e_k' and option_defaut = 'non'));
      r := r || jsonb_build_object('p_un_evenement_decision_creer', v_n1 = v_n0 + 1);
      r := r || jsonb_build_object('k_meme_cle_meme_decision_sans_evenement', v_d = v_kv and not v_b2 and (select count(*) from ops.evenements) = v_n1);
    exception when others then
      r := r || jsonb_build_object('k_decision_creee', false, 'p_un_evenement_decision_creer', false, 'k_meme_cle_meme_decision_sans_evenement', false,
                                   'diag_k_creer', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_trancher(v_kv, 'oui', gen_random_uuid());
      r := r || jsonb_build_object('k_non_fondateur_refuse', false);
    exception when others then
      r := r || jsonb_build_object('k_non_fondateur_refuse', v_kv is not null and sqlstate = 'P0001' and sqlerrm = 'ops:auteur',
                                   'diag_k_auteur', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_trancher(v_kv, 'peut_etre', v_f);
      r := r || jsonb_build_object('k_choix_hors_options_refuse', false);
    exception when others then
      r := r || jsonb_build_object('k_choix_hors_options_refuse', v_kv is not null and v_f is not null and sqlstate = 'P0001' and sqlerrm = 'ops:choix',
                                   'diag_k_choix', coalesce(v_f::text, 'aucun fondateur') || ' ' || sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      perform public.ops_decision_trancher(v_kv, 'oui', v_f);
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('k_fondateur_tranche', v_f is not null and exists (
        select 1 from ops.decisions where id = v_kv and statut = 'tranchee' and choix = 'oui' and tranchee_le is not null));
      r := r || jsonb_build_object('p_un_evenement_decision_trancher', v_n1 = v_n0 + 1);
    exception when others then
      r := r || jsonb_build_object('k_fondateur_tranche', false, 'p_un_evenement_decision_trancher', false,
                                   'diag_k_trancher', coalesce(v_f::text, 'aucun fondateur') || ' ' || sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decision_trancher(v_kv, 'non', v_f);
      r := r || jsonb_build_object('k_trancher_deux_fois_refuse', false);
    exception when others then
      r := r || jsonb_build_object('k_trancher_deux_fois_refuse', v_f is not null and sqlstate = 'P0001' and sqlerrm = 'ops:deja_tranchee',
                                   'diag_k_deux_fois', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select d.id into v_ke from public.ops_decision_creer('essai_e2e_k', 'essai_e2e : echue ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:k_echue', null::uuid) d;
      update ops.decisions set echeance = now() - interval '1 minute' where id = v_ke;
      perform public.ops_decisions_echues();
      r := r || jsonb_build_object('k_echeance_passee_defaut_applique', exists (
        select 1 from ops.decisions where id = v_ke and statut = 'defaut_applique' and choix = 'non' and tranchee_le is not null));
    exception when others then
      r := r || jsonb_build_object('k_echeance_passee_defaut_applique', false, 'diag_k_echue', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (l) un coût au-delà du plafond : pause et décision de portée argent ──────────────────────────────────────────────
    begin
      select count(*) into v_cnt0 from ops.decisions where portee = 'argent';
      select count(*) into v_n0 from ops.evenements;
      select public.ops_cout_ajouter('essai_e2e_l', 'essai_e2e', 0.6, '{}'::jsonb, null::uuid) into v_num;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('l_cout_rend_le_total_du_jour', v_num = 0.6);
      r := r || jsonb_build_object('p_un_evenement_cout_ajouter', v_n1 = v_n0 + 1);
      select public.ops_cout_ajouter('essai_e2e_l', 'essai_e2e', 0.6, '{}'::jsonb, null::uuid) into v_num2;
      select count(*) into v_cnt1 from ops.decisions where portee = 'argent';
      r := r || jsonb_build_object('l_cout_au_dela_pause_decision_argent', v_num2 = 1.2 and v_cnt1 = v_cnt0 + 1 and exists (
        select 1 from ops.agents where nom = 'essai_e2e_l' and en_pause));
    exception when others then
      r := r || jsonb_build_object('l_cout_rend_le_total_du_jour', false, 'p_un_evenement_cout_ajouter', false, 'l_cout_au_dela_pause_decision_argent', false,
                                   'diag_l', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (m) et (t) l'état du bus : six clés, capacites par agent, aucune donnée de prospect ──────────────────────────────
    begin
      insert into ops.prospects (cle_dedup, domaine) values ('domaine:essai-e2e-m.invalid', 'essai-e2e-m.invalid') returning id into v_t1;
    exception when others then
      r := r || jsonb_build_object('diag_m_prospect', sqlstate || ' ' || left(sqlerrm, 160));
    end;
    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte)
      values (v_t1, 'email_sollicite', 'gmail', 'reponse', 'essai_e2e@example.invalid', repeat('0', 64));
    exception when others then
      r := r || jsonb_build_object('diag_m_envoi', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      v_etat := public.ops_etat();
      r := r || jsonb_build_object('m_etat_six_cles', v_etat ?& array['taches', 'agents', 'decisions_ouvertes', 'interrupteurs', 'couts_mois', 'notifications_jour']);
      r := r || jsonb_build_object('m_etat_sans_prospects', position('"prospects"' in v_etat::text) = 0);
      r := r || jsonb_build_object('m_etat_sans_adresse_email', v_etat::text !~* '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+');
      select coalesce(bool_and(x.e ? 'capacites'), false) and count(*) > 0 into v_ok from (
        select a.value as e from jsonb_array_elements(case when jsonb_typeof(v_etat -> 'agents') = 'array' then v_etat -> 'agents' else '[]'::jsonb end) a
        union all
        select o.value from jsonb_each(case when jsonb_typeof(v_etat -> 'agents') = 'object' then v_etat -> 'agents' else '{}'::jsonb end) o
      ) x;
      r := r || jsonb_build_object('t_etat_capacites_par_agent', v_ok and position('essai_a' in (v_etat -> 'agents')::text) > 0);
    exception when others then
      r := r || jsonb_build_object('m_etat_six_cles', false, 'm_etat_sans_prospects', false, 'm_etat_sans_adresse_email', false,
                                   't_etat_capacites_par_agent', false, 'diag_m', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (n) le stockage ──────────────────────────────────────────────────────────────────────────────────────────────────
    begin
      r := r || jsonb_build_object('n_stockage_octets_positif', public.ops_stockage_octets() >= 0);
    exception when others then
      r := r || jsonb_build_object('n_stockage_octets_positif', false, 'diag_n', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (q) clôture par clé ──────────────────────────────────────────────────────────────────────────────────────────────
    begin
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:q_file', 'essai_c', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:q_bail', 'essai_c', '{}'::jsonb, null::uuid, null::text);
      perform public.ops_tache_creer('essai_e2e_z', 'essai', 'essai_e2e:q_decider', 'essai_c', '{}'::jsonb, null::uuid, null::text);
      select count(*) into v_n0 from ops.evenements;
      select public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_inconnue', 'supabase://essai/q') into v_s;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('q_cle_inconnue_absente_sans_evenement', v_s = 'absente' and v_n1 = v_n0);
    exception when others then
      r := r || jsonb_build_object('q_cle_inconnue_absente_sans_evenement', false, 'diag_q_inconnue', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_clore('essai_e2e_c2', 'essai_e2e:q_file', 'supabase://essai/q');
      r := r || jsonb_build_object('q_sans_capacite_refuse', false);
    exception when others then
      r := r || jsonb_build_object('q_sans_capacite_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:capacite', 'diag_q_capacite', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_file', 'ftp://essai.invalid/q');
      r := r || jsonb_build_object('q_preuve_ftp_refusee', false);
    exception when others then
      r := r || jsonb_build_object('q_preuve_ftp_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:preuve', 'diag_q_ftp', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      select count(*) into v_n0 from ops.evenements;
      select public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_file', 'supabase://essai/q_file') into v_s;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('q_file_close_faite_un_evenement', v_s = 'faite' and v_n1 = v_n0 + 1
        and exists (select 1 from ops.taches where cle_idempotence = 'essai_e2e:q_file' and statut = 'faite' and preuve_url = 'supabase://essai/q_file')
        and exists (select 1 from ops.evenements where id > 0 and type = 'tache_close'));
      select count(*) into v_n0 from ops.evenements;
      select public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_file', 'supabase://essai/q_file') into v_s2;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('q_cloture_rejouee_sans_evenement', v_s2 = 'faite' and v_n1 = v_n0);
    exception when others then
      r := r || jsonb_build_object('q_file_close_faite_un_evenement', false, 'q_cloture_rejouee_sans_evenement', false,
                                   'diag_q_file', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      update ops.taches set statut = 'bail', agent = 'essai_e2e_c2', bail_jusqua = now() + interval '30 minutes'
       where cle_idempotence = 'essai_e2e:q_bail';
      select public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_bail', 'git:essai_e2e') into v_s;
      r := r || jsonb_build_object('q_bail_d_un_autre_close', v_s = 'faite' and exists (
        select 1 from ops.taches where cle_idempotence = 'essai_e2e:q_bail' and statut = 'faite' and agent is null and bail_jusqua is null));
    exception when others then
      r := r || jsonb_build_object('q_bail_d_un_autre_close', false, 'diag_q_bail', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      update ops.taches set statut = 'a_decider' where cle_idempotence = 'essai_e2e:q_decider';
      perform public.ops_tache_clore('essai_e2e_c', 'essai_e2e:q_decider', 'supabase://essai/q');
      r := r || jsonb_build_object('q_a_decider_refusee', false);
    exception when others then
      r := r || jsonb_build_object('q_a_decider_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:statut', 'diag_q_statut', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (r) décisions tranchées, relues par leur auteur ─────────────────────────────────────────────────────────────────
    begin
      select d.id into v_ra1 from public.ops_decision_creer('essai_e2e_ra', 'essai_e2e : RA 1 ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:ra1', null::uuid) d;
      select d.id into v_ra2 from public.ops_decision_creer('essai_e2e_ra', 'essai_e2e : RA 2 ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:ra2', null::uuid) d;
      select d.id into v_rb1 from public.ops_decision_creer('essai_e2e_rb', 'essai_e2e : RB 1 ?', null::text, v_opts,
        'non', null::integer, 'aucune', now() + interval '2 hours', 'essai_e2e:rb1', null::uuid) d;
      perform public.ops_decision_trancher(v_ra1, 'oui', v_f);
      perform public.ops_decision_trancher(v_rb1, 'oui', v_f);
      select count(*) into v_n0 from ops.evenements;
      select count(*) = 1 and coalesce(bool_and(t.id = v_ra1 and t.cle_idempotence = 'essai_e2e:ra1' and t.choix = 'oui' and t.tranchee_le is not null), false)
        into v_ok from public.ops_decisions_tranchees('essai_e2e_ra', now() - interval '1 hour') t;
      select count(*) into v_n1 from ops.evenements;
      r := r || jsonb_build_object('r_tranchees_rend_la_decision_de_a', v_f is not null and v_ok);
      r := r || jsonb_build_object('r_tranchees_sans_evenement', v_n1 = v_n0);
      update ops.decisions set echeance = now() - interval '1 minute' where id = v_ra2;
      perform public.ops_decisions_echues();
      select count(*) = 2 and coalesce(bool_or(t.id = v_ra2 and t.choix = 'non'), false)
        into v_ok from public.ops_decisions_tranchees('essai_e2e_ra', now() - interval '1 hour') t;
      r := r || jsonb_build_object('r_echue_apparait_avec_le_defaut', v_ok);
      select count(*) = 0 into v_ok from public.ops_decisions_tranchees('essai_e2e_ra', now() + interval '1 hour');
      r := r || jsonb_build_object('r_depuis_apres_zero_ligne', v_ok);
    exception when others then
      r := r || jsonb_build_object('r_tranchees_rend_la_decision_de_a', false, 'r_tranchees_sans_evenement', false,
                                   'r_echue_apparait_avec_le_defaut', false, 'r_depuis_apres_zero_ligne', false,
                                   'diag_r', coalesce(v_f::text, 'aucun fondateur') || ' ' || sqlstate || ' ' || left(sqlerrm, 160));
    end;

    begin
      perform public.ops_decisions_tranchees('essai_e2e_inconnu', now() - interval '1 hour');
      r := r || jsonb_build_object('r_agent_inconnu_refuse', false);
    exception when others then
      r := r || jsonb_build_object('r_agent_inconnu_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:agent_inconnu', 'diag_r_inconnu', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (s) un coût pour un agent absent : ops:agent_inconnu, jamais 23503 ──────────────────────────────────────────────
    begin
      perform public.ops_cout_ajouter('essai_e2e_inconnu', 'essai_e2e', 0.1, '{}'::jsonb, null::uuid);
      r := r || jsonb_build_object('s_cout_agent_inconnu', false);
    exception when others then
      r := r || jsonb_build_object('s_cout_agent_inconnu', sqlstate = 'P0001' and sqlerrm = 'ops:agent_inconnu', 'diag_s', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── (o) anon et authenticated n'exécutent rien (42501) ──────────────────────────────────────────────────────────────
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:o_anon', 'essai_a', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('o_anon_refuse_tache_creer', false);
    exception when others then
      r := r || jsonb_build_object('o_anon_refuse_tache_creer', v_role = 'anon' and sqlstate = '42501', 'diag_o_anon_creer', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_etat();
      r := r || jsonb_build_object('o_anon_refuse_etat', false);
    exception when others then
      r := r || jsonb_build_object('o_anon_refuse_etat', v_role = 'anon' and sqlstate = '42501', 'diag_o_anon_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_decision_trancher(gen_random_uuid(), 'oui', gen_random_uuid());
      r := r || jsonb_build_object('o_anon_refuse_decision_trancher', false);
    exception when others then
      r := r || jsonb_build_object('o_anon_refuse_decision_trancher', v_role = 'anon' and sqlstate = '42501', 'diag_o_anon_trancher', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_tache_creer('essai_e2e_a', 'essai', 'essai_e2e:o_auth', 'essai_a', '{}'::jsonb, null::uuid, null::text);
      r := r || jsonb_build_object('o_authenticated_refuse_tache_creer', false);
    exception when others then
      r := r || jsonb_build_object('o_authenticated_refuse_tache_creer', v_role = 'authenticated' and sqlstate = '42501', 'diag_o_auth_creer', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_etat();
      r := r || jsonb_build_object('o_authenticated_refuse_etat', false);
    exception when others then
      r := r || jsonb_build_object('o_authenticated_refuse_etat', v_role = 'authenticated' and sqlstate = '42501', 'diag_o_auth_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_decision_trancher(gen_random_uuid(), 'oui', gen_random_uuid());
      r := r || jsonb_build_object('o_authenticated_refuse_decision_trancher', false);
    exception when others then
      r := r || jsonb_build_object('o_authenticated_refuse_decision_trancher', v_role = 'authenticated' and sqlstate = '42501', 'diag_o_auth_trancher', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
  end essai_0098;
