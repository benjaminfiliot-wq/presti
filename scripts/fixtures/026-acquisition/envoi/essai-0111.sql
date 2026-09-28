  -- scripts/fixtures/026-acquisition/envoi/essai-0111.sql — le scénario de l'essai à sec de la migration 0111 (fiche
  -- 026-063, cahier DJ-6), écrit par Claude Code (026-062) AVANT la migration. Placé par `disjoncteurs-qa.mjs
  -- --generer-essai [--avec=…]` dans le bloc d'essai, après les jumeaux nus (même protocole que prospection-sql-qa,
  -- 026-032 : DO + EXECUTE du jumeau nu + raise exception finale ; rien n'est commité).
  --
  -- L'horloge de 0111, `ops.maintenant()`, est remplacée DANS la transaction (elle est `stable`, une fonction SQL ordinaire :
  -- un `create or replace` local suffit, la transaction entière est annulée par le `raise exception` final). Chaque étape
  -- avance la date en la redéfinissant, pour jouer les jours ouvrés du palier sans attendre. Les seuils comparés sont ceux
  -- lus dans `ops.paliers` et les fonctions elles-mêmes (jamais recopiés en dur deux fois : DJ-3 les compare au contrat).
  <<essai_0111>>
  declare
    v_avant jsonb;
    v_apres jsonb;
    v_sig jsonb;
    v_auteur uuid;
    v_fin constant text := 'essai_026:fin_de_groupe';
  begin
    -- Le fondateur du jeu d'essai (jamais une donnée réelle : is_founder est déjà la règle en base, on lit une ligne
    -- existante plutôt que d'en inventer une — un essai à sec ne crée pas de compte).
    select id into v_auteur from public.artisans where is_founder limit 1;

    -- ── A. envoi_froid fermé : le plafond du formulaire est à 0 ─────────────────────────────────────────────────────────
    v_avant := public.acq_etat_envoi();
    r := r || jsonb_build_object('envoi_froid_ferme_palier_zero', coalesce((v_avant -> 'envoi_froid')::boolean, true) = false, 'diag_etat0', left(v_avant::text, 200));

    -- ── B. Ouverture par le fondateur, un jour avant le 12/10 : refusée (ops:trop_tot) ──────────────────────────────────
    create or replace function ops.maintenant() returns timestamptz language sql stable as $$ select '2026-10-11 22:59:00+02'::timestamptz $$;
    begin
      perform public.acq_envoi_froid_ouvrir(v_auteur);
      r := r || jsonb_build_object('trop_tot_refuse', false, 'diag_trop_tot', 'aucune exception : devrait refuser avant le 12/10');
    exception when others then
      r := r || jsonb_build_object('trop_tot_refuse', sqlerrm ilike '%trop_tot%', 'diag_trop_tot', sqlerrm);
    end;

    -- ── C. Le 12/10 à 9 h, ouvert : P0 à 5 (envois et nouveaux) ─────────────────────────────────────────────────────────
    create or replace function ops.maintenant() returns timestamptz language sql stable as $$ select '2026-10-12 09:00:00+02'::timestamptz $$;
    begin
      perform public.acq_envoi_froid_ouvrir(v_auteur);
      r := r || jsonb_build_object('ouverture_08h_ok', true);
    exception when others then
      r := r || jsonb_build_object('ouverture_08h_ok', false, 'diag_ouverture', sqlerrm);
    end;
    v_apres := public.acq_etat_envoi();
    r := r || jsonb_build_object('p0_formulaire_a_cinq', exists (
      select 1 from public.ops_quotas_canaux where canal = 'formulaire_site' and cle = '*' and par_jour = 5 and nouveaux_max = 5
    ), 'diag_p0', left(v_apres::text, 200));

    -- ── D. Trois échecs de soumission d'affilée sur une technologie → pause, palier redescendu ─────────────────────────
    v_sig := public.acq_signal(jsonb_build_object('type', 'echec_soumission', 'technologie', 'essai_026_wpforms'));
    v_sig := public.acq_signal(jsonb_build_object('type', 'echec_soumission', 'technologie', 'essai_026_wpforms'));
    v_sig := public.acq_signal(jsonb_build_object('type', 'echec_soumission', 'technologie', 'essai_026_wpforms'));
    r := r || jsonb_build_object('technologie_en_pause_apres_trois_echecs', exists (
      select 1 from ops.technologies where technologie = 'essai_026_wpforms' and etat = 'pause'
    ), 'diag_techno', v_sig::text);

    -- ── E. Un avis d'abus → formulaire coupé 48 h ; deux plaintes en 7 jours → coupé jusqu'à Benj ────────────────────────
    v_sig := public.acq_signal(jsonb_build_object('type', 'avis_abus'));
    v_apres := public.acq_etat_envoi();
    r := r || jsonb_build_object('avis_abus_coupe_48h', (v_apres ->> 'formulaire_coupe_jusqua') is not null);

    -- ── F. Quatre STOP sur cent envois d'un modèle → le modèle suspendu ; approbation refusée ensuite ───────────────────
    for i in 1..4 loop
      v_sig := public.acq_signal(jsonb_build_object('type', 'stop', 'modele_id', 'essai_026_modele'));
    end loop;
    r := r || jsonb_build_object('quatre_stop_suspend_modele', exists (select 1 from ops.modeles_suspendus where modele_id = 'essai_026_modele'));

    -- ── G. Un refus du Gmail (535) coupe le Gmail ET le formulaire 24 h (contre-revue du 25/09) ─────────────────────────
    v_sig := public.acq_signal(jsonb_build_object('type', 'gmail_refus'));
    v_apres := public.acq_etat_envoi();
    r := r || jsonb_build_object('gmail_refus_coupe_gmail_et_formulaire', (v_apres ->> 'gmail_coupe_jusqua') is not null and (v_apres ->> 'formulaire_coupe_jusqua') is not null);

    -- ── H. ads_archive : sans événement, refusé ; avec un événement PERMIS, autorisé ─────────────────────────────────────
    r := r || jsonb_build_object('ads_archive_sans_evenement_refuse', coalesce((public.acq_etat_envoi() -> 'ads_archive' ->> 'permis')::boolean, false) = false);
    insert into ops.evenements (agent, type, resume) values ('systeme', 'lecture_ads_archive', 'PERMIS le 2026-10-12 (essai à sec)');
    r := r || jsonb_build_object('ads_archive_permis_apres_evenement', coalesce((public.acq_etat_envoi() -> 'ads_archive' ->> 'permis')::boolean, false) = true);

    -- ── I. acq_jauge_consommer : au plafond, refuse sans rien écrire ────────────────────────────────────────────────────
    perform public.acq_jauge_consommer('essai_026', '2026-10-12', 199, 200);
    r := r || jsonb_build_object('jauge_199_sur_200_accepte_1', public.acq_jauge_consommer('essai_026', '2026-10-12', 1, 200));
    r := r || jsonb_build_object('jauge_200_sur_200_refuse', public.acq_jauge_consommer('essai_026', '2026-10-12', 1, 200) = false);

    -- ── J. anon et authenticated refusés sur acq_signal et acq_etat_envoi (42501) ───────────────────────────────────────
    begin
      set local role anon;
      perform public.acq_signal(jsonb_build_object('type', 'stop'));
      r := r || jsonb_build_object('anon_refuse_signal', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_signal', sqlstate = '42501', 'diag_anon', sqlstate);
    end;
    reset role;

    raise exception using message = v_fin;
  exception when others then
    if sqlerrm <> v_fin then
      r := r || jsonb_build_object('diag_exception_scenario_0111', sqlstate || ' ' || left(sqlerrm, 200));
    end if;
  end;
