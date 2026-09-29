  -- scripts/fixtures/026-horloge-bus/essais/0099.sql — le scénario de l'essai à sec de 0099 (026-034, cahier PG-6), écrit par
  -- 026-032 avant la migration. Placé par `prospection-sql-qa.mjs --generer-essai [--avec=0096,0097,0098]` dans le bloc
  -- d'essai, après les jumeaux nus. Une clé par cas dans `r` ; les clés `diag_*` ne sont que des diagnostics. Les erreurs
  -- métier se lisent `sqlstate = 'P0001' and sqlerrm = 'ops:<code>'` (contrat de 0099).
  --
  -- Voie gratuite du 25/09 : aucune boîte d'envoi, aucun canal à froid par courriel. Le scénario n'écrit que des lignes
  -- d'essai (prospects « essai-e2e-026-… » en .invalid, SIREN 999026…, source essai_e2e) ; il sème dans sa transaction les
  -- agents facteur et redacteur (0105 n'est pas appliquée), ajoute la colonne preuve_demande et l'étape du prospect si 0106
  -- et 0105 manquent, crée une table ops.reponses minimale si 0106 manque, ferme la pause et ouvre envoi_froid.
  --
  -- Chaque groupe de cas finit par l'exception « essai_026:fin_de_groupe » : ses écritures sont défaites, les clés posées
  -- dans `r` restent (une variable n'est pas défaite). Les groupes ne se gênent donc pas : un plafond rempli par l'un n'est
  -- pas vu par le suivant. Tout le reste part avec l'exception finale du bloc.
  --
  -- Deux lectures du cahier, notées ici parce que le contrat les impose :
  --   · formulaire (5, 5) : sur formulaire_site, les deux compteurs comptent la même chose ; le 6e premier contact est refusé
  --     par ops:quota ou ops:quota_nouveaux selon l'ordre des contrôles. Le code ops:quota_nouveaux est exigé, lui, sur une
  --     ligne (6, 5), où seul le compteur des nouveaux est plein ;
  --   · relance « à 71 h » : la règle sollicitée (dernier envoi de tout type à moins de 72 h → ops:relance_sollicitee) vient
  --     avant la règle générale (ops:72_heures) ; l'une ou l'autre refuse. ops:relance_sollicitee seule est exigée quand le
  --     dernier envoi est un lien_maquette, que la règle générale ne compte pas.
  --
  -- Correction du 27/09 de 026-034 (écrite juge d'abord, rouge sur le SQL d'avant) : groupes N (accord individuel de Benj,
  -- R24 ; PG-9), O (envoi figé dès l'attente ; PG-10) et P (dates posées par la base, diag_g1 rejoué ; PG-11). Une
  -- approbation passe désormais par attend_accord_benj et un accord d'un fondateur (le premier fondateur de public.artisans,
  -- lu dans la transaction, jamais rendu). La base datant tout ce qu'elle voit passer, le passé (envois antidatés, accord
  -- échu, accord qui ne correspond plus) se sème en désactivant le déclencheur le temps de l'insertion.
  <<essai_0099>>
  declare
    v_p uuid;
    v_p2 uuid;
    v_pg uuid;
    v_e uuid;
    v_e2 uuid;
    v_rep text;
    v_rep2 text;
    v_repg text;
    v_ps uuid[];
    v_reps text[];
    v_n int;
    v_i int;
    v_k int;
    v_base int;
    v_base2 int;
    v_ok boolean;
    v_diag text;
    v_role text;
    v_statut text;
    v_ev0 bigint;
    v_ev1 bigint;
    v_etat jsonb;
    v_txt text;
    v_h text := md5('essai_e2e:0099:texte:1') || md5('essai_e2e:0099:texte:2');
    v_jour date := (now() at time zone 'Europe/Paris')::date;
    v_hier timestamptz;
    v_ok3 constant jsonb := '{"j1": "ok", "j2": "ok", "j3": "ok"}'::jsonb;
    v_okl constant jsonb := '{"j1": "sans_objet", "j2": "ok", "j3": "ok"}'::jsonb;
    v_fin constant text := 'essai_026:fin_de_groupe';
    v_benj uuid;
    v_acc uuid;
    v_e3 uuid;
    v_h2 text := md5('essai_e2e:0099:texte:3') || md5('essai_e2e:0099:texte:4');
  begin
    -- ── Mise en place, pour tout le scénario ─────────────────────────────────────────────────────────────────────────────
    insert into ops.agents (nom, libelle) values ('facteur', 'Facteur (essai 0099)'), ('redacteur', 'Plume (essai 0099)')
      on conflict (nom) do nothing;
    alter table ops.envois add column if not exists preuve_demande jsonb;
    alter table ops.prospects add column if not exists etape text;
    if to_regclass('ops.reponses') is null then
      create table ops.reponses (
        id uuid primary key default gen_random_uuid(),
        id_externe text not null unique,
        envoi_id uuid references ops.envois(id) on delete cascade,
        conversation_id uuid,
        prospect_id uuid references ops.prospects(id) on delete cascade,
        canal text,
        source text,
        texte text,
        auto boolean not null default false,
        accuse_site boolean not null default false,
        en_reponse_a text,
        recu_le timestamptz not null default now(),
        classe text
      );
    end if;
    insert into ops.interrupteurs (nom, actif) values ('pause_generale', false), ('envoi_froid', true)
      on conflict (nom) do update set actif = excluded.actif;
    -- le fondateur qui donne les accords d'essai (R24) : lu ici, jamais rendu
    select ar.id into v_benj from public.artisans ar where ar.is_founder order by ar.id limit 1;
    -- le prospect témoin du Gmail sollicité : il a écrit (une réponse reçue il y a une heure), c'est sa preuve de demande
    insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026001', '999026001', 'essai-e2e-026-g.invalid', 'essai_e2e')
      returning id into v_pg;
    insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
      values ('essai_e2e:0099:rep:g', v_pg, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour')
      returning id::text into v_repg;

    -- ── A. Envoi à froid fermé ───────────────────────────────────────────────────────────────────────────────────────────
    begin
      update ops.interrupteurs set actif = false where nom = 'envoi_froid';
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300), ('essai_e2e', '*', 300, 300)
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026101', '999026101', 'essai-e2e-026-a1.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('froid_ferme_formulaire_refuse', false, 'diag_froid_ferme_formulaire', 'accepté');
      exception when others then
        r := r || jsonb_build_object('froid_ferme_formulaire_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_froid_ferme', 'diag_froid_ferme_formulaire', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('froid_ferme_lien_maquette_email_passe', true);
      exception when others then
        r := r || jsonb_build_object('froid_ferme_lien_maquette_email_passe', false, 'diag_froid_ferme_lien', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'essai_e2e', 'essai_e2e', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('froid_ferme_essai_e2e_passe', true);
      exception when others then
        r := r || jsonb_build_object('froid_ferme_essai_e2e_passe', false, 'diag_froid_ferme_essai', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_froid', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── B. Formulaire : palier, un formulaire par entreprise, jamais de relance ──────────────────────────────────────────
    begin
      select count(*) into v_base from ops.envois e
       where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 5), least(300, v_base + 5))
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      v_n := 0; v_diag := null;
      begin
        for v_i in 1..5 loop
          insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902620' || v_i, '99902620' || v_i, 'essai-e2e-026-b' || v_i || '.invalid', 'essai_e2e')
            returning id into v_p;
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
            values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('formulaire_cinq_passent', v_n = 5, 'diag_formulaire_cinq', coalesce(v_diag, v_base || ' déjà ce jour, 5 ajoutés'));
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026206', '999026206', 'essai-e2e-026-b6.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_sixieme_refuse', false, 'diag_formulaire_sixieme', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_sixieme_refuse', sqlstate = 'P0001' and sqlerrm in ('ops:quota_nouveaux', 'ops:quota'), 'diag_formulaire_sixieme', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- (6, 5) : le compteur des envois a encore une place, celui des nouveaux est plein
      update ops.quotas_canaux set plafond_jour = least(300, v_base + 6) where canal = 'formulaire_site' and envoyeur = '*';
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_nouveaux_sixieme_quota_nouveaux', false, 'diag_formulaire_nouveaux', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_nouveaux_sixieme_quota_nouveaux', sqlstate = 'P0001' and sqlerrm = 'ops:quota_nouveaux', 'diag_formulaire_nouveaux', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.quotas_canaux set plafond_jour = 300, plafond_nouveaux_jour = 300 where canal = 'formulaire_site' and envoyeur = '*';
      -- un autre prospect, même SIREN que b1 : l'entreprise a déjà reçu son formulaire
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('domaine:essai-e2e-026-b7.invalid', '999026201', 'essai-e2e-026-b7.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_deja_meme_siren', false, 'diag_formulaire_siren', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_deja_meme_siren', sqlstate = 'P0001' and sqlerrm = 'ops:formulaire_deja', 'diag_formulaire_siren', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- un autre prospect sans SIREN, même domaine que b2
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('page_meta:essai-e2e-026-b8', null, 'essai-e2e-026-b2.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_deja_meme_domaine', false, 'diag_formulaire_domaine', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_deja_meme_domaine', sqlstate = 'P0001' and sqlerrm = 'ops:formulaire_deja', 'diag_formulaire_domaine', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- un prospect neuf : une relance, puis un lien de maquette, par le formulaire
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026209', '999026209', 'essai-e2e-026-b9.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'relance', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_relance_refusee', false, 'diag_formulaire_relance', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_relance_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_formulaire_relance', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'lien_maquette', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('formulaire_autre_type_refuse', false, 'diag_formulaire_autre_type', 'accepté');
      exception when others then
        r := r || jsonb_build_object('formulaire_autre_type_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_formulaire_autre_type', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_formulaire', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── C. Gmail sollicité : jamais de premier contact, toujours une preuve de demande, 50 par jour ─────────────────────
    begin
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'premier_contact', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('email_premier_contact_interdit', false, 'diag_email_premier_contact', 'accepté');
      exception when others then
        r := r || jsonb_build_object('email_premier_contact_interdit', sqlstate = 'P0001' and sqlerrm = 'ops:froid_email_interdit', 'diag_email_premier_contact', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', null);
        r := r || jsonb_build_object('email_sans_preuve_refuse', false, 'diag_email_sans_preuve', 'accepté');
      exception when others then
        r := r || jsonb_build_object('email_sans_preuve_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_sans_preuve', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- la réponse d'un AUTRE prospect ne prouve rien pour celui-ci
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026301', '999026301', 'essai-e2e-026-c1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:c1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour')
        returning id::text into v_rep2;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep2));
        r := r || jsonb_build_object('email_preuve_autre_prospect_refusee', false, 'diag_email_preuve_autre', 'accepté');
      exception when others then
        r := r || jsonb_build_object('email_preuve_autre_prospect_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_preuve_autre', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', gen_random_uuid()::text));
        r := r || jsonb_build_object('email_preuve_inconnue_refusee', false, 'diag_email_preuve_inconnue', 'accepté');
      exception when others then
        r := r || jsonb_build_object('email_preuve_inconnue_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_preuve_inconnue', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('email_avec_preuve_passe', true);
      exception when others then
        r := r || jsonb_build_object('email_avec_preuve_passe', false, 'diag_email_avec_preuve', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- 50 par jour, tous types : on remplit jusqu'à 50, le 51e est refusé
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('email_sollicite', '*', 50, 0)
        on conflict (canal, envoyeur) do update set plafond_jour = 50, plafond_nouveaux_jour = 0;
      select count(*) into v_base from ops.envois e
       where e.canal = 'email_sollicite' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      v_n := 0; v_diag := null;
      begin
        for v_i in 1..(50 - v_base) loop
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
            values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('email_cinquante_passent', v_base <= 50 and v_n = 50 - v_base, 'diag_email_cinquante', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutés'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('email_51e_quota', false, 'diag_email_51e', 'accepté');
      exception when others then
        r := r || jsonb_build_object('email_51e_quota', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_email_51e', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_email', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── D. Relances : une seule, après un « oui », à 72 h au moins du dernier envoi ; puis les règles générales ─────────
    begin
      -- d1 : à l'étape oui, il a écrit, rien ne lui est jamais parti
      insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026401', '999026401', 'essai-e2e-026-d1.invalid', 'essai_e2e', 'oui')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_sans_contact', false, 'diag_relance_sans_contact', 'accepté');
      exception when others then
        r := r || jsonb_build_object('relance_sans_contact', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sans_contact', 'diag_relance_sans_contact', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- d2 : à l'étape oui, son formulaire est parti il y a 73 h : la relance passe, une seconde est refusée
      insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026402', '999026402', 'essai-e2e-026-d2.invalid', 'essai_e2e', 'oui')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '74 hours', 'facteur', now() - interval '74 hours', now() - interval '73 hours', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_73h_passe', true);
      exception when others then
        r := r || jsonb_build_object('relance_73h_passe', false, 'diag_relance_73h', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('seconde_relance_sollicitee', false, 'diag_seconde_relance', 'accepté');
      exception when others then
        r := r || jsonb_build_object('seconde_relance_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_seconde_relance', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- d3 : à l'étape oui, son formulaire est parti il y a 71 h
      insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026403', '999026403', 'essai-e2e-026-d3.invalid', 'essai_e2e', 'oui')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '71 hours 30 minutes', 'facteur', now() - interval '71 hours 30 minutes', now() - interval '71 hours', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_71h_refusee', false, 'diag_relance_71h', 'accepté');
      exception when others then
        r := r || jsonb_build_object('relance_71h_refusee', sqlstate = 'P0001' and sqlerrm in ('ops:72_heures', 'ops:relance_sollicitee'), 'diag_relance_71h', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- d4 : lien envoyé il y a 71 h (le dernier envoi, de tout type), formulaire il y a 10 jours
      insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026404', '999026404', 'essai-e2e-026-d4.invalid', 'essai_e2e', 'lien_envoye')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '5 days') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-d4.invalid', v_h, 'envoye', 'redacteur', now() - interval '71 hours 30 minutes', 'facteur', now() - interval '71 hours 30 minutes', now() - interval '71 hours', v_ok3, jsonb_build_object('type', 'message_recu', 'id', v_rep));
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_moins_72h_dernier_envoi_sollicitee', false, 'diag_relance_dernier_envoi', 'accepté');
      exception when others then
        r := r || jsonb_build_object('relance_moins_72h_dernier_envoi_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_relance_dernier_envoi', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- d5 : pas encore de « oui » (maquette prête), formulaire parti il y a 10 jours
      insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026405', '999026405', 'essai-e2e-026-d5.invalid', 'essai_e2e', 'maquette_prete')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_avant_oui_sollicitee', false, 'diag_relance_avant_oui', 'accepté');
      exception when others then
        r := r || jsonb_build_object('relance_avant_oui_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_relance_avant_oui', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- d6 : à l'étape oui, trois premiers contacts partis depuis 90 jours (formulaire, Instagram, LinkedIn)
      insert into ops.prospects (cle_dedup, siren, domaine, instagram, source, etape) values ('siren:999026406', '999026406', 'essai-e2e-026-d6.invalid', 'essai_e2e_026_d6', 'essai_e2e', 'oui')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:d6', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '20 days', 'facteur', now() - interval '20 days', now() - interval '20 days', v_ok3),
               (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_d6', v_h, 'envoye', 'redacteur', now() - interval '15 days', 'facteur', now() - interval '15 days', now() - interval '15 days', v_ok3),
               (v_p, 'linkedin', 'repondeur', 'premier_contact', 'essai_e2e_026_d6', v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d6.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('relance_trois_envois_3_messages', false, 'diag_relance_3_messages', 'accepté');
      exception when others then
        r := r || jsonb_build_object('relance_trois_envois_3_messages', sqlstate = 'P0001' and sqlerrm = 'ops:3_messages', 'diag_relance_3_messages', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_relances', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── E. Autres plafonds : Instagram à 0, canal sans ligne, palier plein, messagerie tout type, places libérées ─────────
    begin
      insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026501', '999026501', 'essai-e2e-026-e1.invalid', 'essai_e2e_026_e1', 'essai_e2e')
        returning id into v_p;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('instagram', '*', 0, 0)
        on conflict (canal, envoyeur) do update set plafond_jour = 0, plafond_nouveaux_jour = 0;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_e1', v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('instagram_zero_refuse_premier_contact', false, 'diag_instagram_zero', 'accepté');
      exception when others then
        r := r || jsonb_build_object('instagram_zero_refuse_premier_contact', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_instagram_zero', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      delete from ops.quotas_canaux where canal = 'linkedin';
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'linkedin', 'repondeur', 'premier_contact', 'essai_e2e_026_e1', v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('quota_absent_refuse', false, 'diag_quota_absent', 'accepté');
      exception when others then
        r := r || jsonb_build_object('quota_absent_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:quota_absent', 'diag_quota_absent', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- le palier du formulaire plein : les messages du Gmail sollicité ne lui prennent aucune place
      select count(*) into v_base from ops.envois e
       where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base), least(300, v_base))
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('palier_plein_lien_maquette_email_passe', true);
      exception when others then
        r := r || jsonb_build_object('palier_plein_lien_maquette_email_passe', false, 'diag_palier_lien', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('palier_plein_reponse_email_passe', true);
      exception when others then
        r := r || jsonb_build_object('palier_plein_reponse_email_passe', false, 'diag_palier_reponse', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.quotas_canaux set plafond_jour = least(300, v_base + 1), plafond_nouveaux_jour = least(300, v_base + 1) where canal = 'formulaire_site' and envoyeur = '*';
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026502', '999026502', 'essai-e2e-026-e2.invalid', 'essai_e2e')
        returning id into v_p2;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p2, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('email_hors_palier', true);
      exception when others then
        r := r || jsonb_build_object('email_hors_palier', false, 'diag_email_hors_palier', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- messagerie : 100 par jour, tout type compté
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('messagerie', '*', 100, 0)
        on conflict (canal, envoyeur) do update set plafond_jour = 100, plafond_nouveaux_jour = 0;
      select count(*) into v_base from ops.envois e
       where e.canal = 'messagerie' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      v_n := 0; v_diag := null; v_e := null; v_e2 := null;
      begin
        for v_i in 1..(100 - v_base) loop
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
            values (null, 'messagerie', 'repondeur', 'reponse', 'essai_e2e_026_meta_' || v_i, v_h, 'prepare', 'redacteur')
            returning id into v_e2;
          if v_e is null then v_e := v_e2; end if;
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('messagerie_cent_passent', v_base < 100 and v_n = 100 - v_base, 'diag_messagerie_cent', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutés'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (null, 'messagerie', 'repondeur', 'lien_maquette', 'essai_e2e_026_meta_101', v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('messagerie_101e_refuse', false, 'diag_messagerie_101e', 'accepté');
      exception when others then
        r := r || jsonb_build_object('messagerie_101e_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_messagerie_101e', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.envois set statut = 'saute' where id = v_e;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (null, 'messagerie', 'repondeur', 'lien_maquette', 'essai_e2e_026_meta_102', v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('saute_libere_une_place', v_e is not null);
      exception when others then
        r := r || jsonb_build_object('saute_libere_une_place', false, 'diag_saute', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.envois set statut = 'perime' where id = v_e2;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (null, 'messagerie', 'repondeur', 'reponse', 'essai_e2e_026_meta_103', v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('perime_libere_une_place', v_e2 is not null and v_e2 <> v_e);
      exception when others then
        r := r || jsonb_build_object('perime_libere_une_place', false, 'diag_perime', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_plafonds', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── F. Verdicts : seul le Facteur approuve, et jamais sans les trois ────────────────────────────────────────────────
    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
        on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026601', '999026601', 'essai-e2e-026-f1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e;
      begin
        update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = '{"j1": "ok", "j3": "ok"}'::jsonb where id = v_e;
        r := r || jsonb_build_object('verdicts_sans_j2_refuse', false, 'diag_verdicts_sans_j2', 'accepté');
      exception when others then
        r := r || jsonb_build_object('verdicts_sans_j2_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_verdicts_sans_j2', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set statut = 'approuve', approuve_par_agent = 'redacteur', verdicts = v_ok3 where id = v_e;
        r := r || jsonb_build_object('verdicts_redacteur_refuse', false, 'diag_verdicts_redacteur', 'accepté');
      exception when others then
        r := r || jsonb_build_object('verdicts_redacteur_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_verdicts_redacteur', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        -- le formulaire approuvé ne se compte pas lui-même (un formulaire par entreprise, plafond du jour) ; depuis le 27/09,
        -- l'approbation passe par l'attente de l'accord de Benj, puis par son accord (R24)
        update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_e;
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('verdicts_complets_acceptes', true);
      exception when others then
        r := r || jsonb_build_object('verdicts_complets_acceptes', false, 'diag_verdicts_complets', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      r := r || jsonb_build_object('approuve_le_pose', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and approuve_le is not null));
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026602', '999026602', 'essai-e2e-026-f2.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e;
      begin
        update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = '{"j1": "sans_objet", "j2": "ok", "j3": "ok"}'::jsonb where id = v_e;
        r := r || jsonb_build_object('premier_contact_j1_sans_objet_refuse', false, 'diag_premier_contact_j1', 'accepté');
      exception when others then
        r := r || jsonb_build_object('premier_contact_j1_sans_objet_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_premier_contact_j1', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e;
      begin
        update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('lien_maquette_j1_sans_objet_accepte', exists (select 1 from ops.envois where id = v_e and statut = 'approuve'));
      exception when others then
        r := r || jsonb_build_object('lien_maquette_j1_sans_objet_accepte', false, 'diag_lien_j1', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_verdicts', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── G. Opposition : annulation des envois en attente, refus, confirmation unique, opposition expirée ────────────────
    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
        on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
      -- g1 : un lien et une confirmation préparés, puis une opposition définitive sur son domaine
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026701', '999026701', 'essai-e2e-026-g1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:g1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e2;
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-g1.invalid', 'Témoin essai 0099', 'essai_e2e');
      select statut into v_statut from ops.envois where id = v_e;
      r := r || jsonb_build_object('opposition_annule_prepare', v_statut = 'annule', 'diag_opposition_annule', coalesce(v_statut, '?'));
      select statut into v_statut from ops.envois where id = v_e2;
      r := r || jsonb_build_object('opposition_epargne_confirmation_stop', v_statut = 'prepare', 'diag_opposition_epargne', coalesce(v_statut, '?'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('opposition_refuse_nouvel_envoi', false, 'diag_opposition_nouvel', 'accepté');
      exception when others then
        r := r || jsonb_build_object('opposition_refuse_nouvel_envoi', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_nouvel', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('opposition_refuse_lien_maquette', false, 'diag_opposition_lien', 'accepté');
      exception when others then
        r := r || jsonb_build_object('opposition_refuse_lien_maquette', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_lien', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- g3 : STOP à l'instant (opposition définitive sur le SIREN) : une seule confirmation part
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026703', '999026703', 'essai-e2e-026-g3.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:g3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'stop', now() - interval '10 minutes') returning id::text into v_rep;
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('siren', '999026703', 'Témoin essai 0099', 'essai_e2e');
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('confirmation_stop_passe_une_fois', true);
      exception when others then
        r := r || jsonb_build_object('confirmation_stop_passe_une_fois', false, 'diag_confirmation_une', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('confirmation_stop_seconde_refusee', false, 'diag_confirmation_seconde', 'accepté');
      exception when others then
        r := r || jsonb_build_object('confirmation_stop_seconde_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:confirmation_stop', 'diag_confirmation_seconde', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- g4 : une opposition temporaire expirée ne refuse plus rien ; g5 : une temporaire encore active refuse
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026704', '999026704', 'essai-e2e-026-g4.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:g4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.opposition (cle_type, cle_valeur, motif, source, cree_le, expire_le)
        values ('domaine', 'essai-e2e-026-g4.invalid', 'Témoin essai 0099', 'essai_e2e', now() - interval '100 days', now() - interval '10 days');
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('opposition_expiree_ne_refuse_plus', true);
      exception when others then
        r := r || jsonb_build_object('opposition_expiree_ne_refuse_plus', false, 'diag_opposition_expiree', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026705', '999026705', 'essai-e2e-026-g5.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:g5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le) values ('domaine', 'essai-e2e-026-g5.invalid', 'Témoin essai 0099', 'essai_e2e', now() + interval '30 days');
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('opposition_temporaire_active_refuse', false, 'diag_opposition_temporaire', 'accepté');
      exception when others then
        r := r || jsonb_build_object('opposition_temporaire_active_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_temporaire', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_opposition', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── H. 90 jours sans recontact ─────────────────────────────────────────────────────────────────────────────────────
    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
        on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
      insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026801', '999026801', 'essai-e2e-026-h1.invalid', 'essai_e2e_026_h1', 'essai_e2e')
        returning id into v_p;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_h1', v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('premier_contact_10_jours_refuse', false, 'diag_90_jours_10', 'accepté');
      exception when others then
        r := r || jsonb_build_object('premier_contact_10_jours_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:90_jours', 'diag_90_jours_10', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026802', '999026802', 'essai-e2e-026-h2.invalid', 'essai_e2e_026_h2', 'essai_e2e')
        returning id into v_p;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_h2', v_h, 'envoye', 'redacteur', now() - interval '91 days', 'facteur', now() - interval '91 days', now() - interval '91 days', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('premier_contact_91_jours_passe', true);
      exception when others then
        r := r || jsonb_build_object('premier_contact_91_jours_passe', false, 'diag_90_jours_91', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026803', '999026803', 'essai-e2e-026-h3.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:h3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      alter table ops.envois disable trigger garde_envois;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '1 day', 'facteur', now() - interval '1 day', now() - interval '1 day', v_ok3);
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-h3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('lien_maquette_1_jour_passe', true);
      exception when others then
        r := r || jsonb_build_object('lien_maquette_1_jour_passe', false, 'diag_lien_1_jour', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_90_jours', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── I. Pause générale : tout refusé à l'entrée et au passage à envoye (décision du 27/09) ────────────────────────────
    begin
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
        on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
      update ops.envois set statut = 'approuve' where id = v_e;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026901', '999026901', 'essai-e2e-026-i1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
        values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e2;
      update ops.interrupteurs set actif = true where nom = 'pause_generale';
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026902', '999026902', 'essai-e2e-026-i2.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('pause_refuse_prepare', false, 'diag_pause_prepare', 'accepté');
      exception when others then
        r := r || jsonb_build_object('pause_refuse_prepare', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_prepare', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('pause_refuse_lien_maquette', false, 'diag_pause_lien', 'accepté');
      exception when others then
        r := r || jsonb_build_object('pause_refuse_lien_maquette', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_lien', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- décision de Benj du 27/09 : la pause active bloque aussi le passage à envoye ; l'envoi reste approuvé, rien n'est
      -- consigné ni signalé (PG-13)
      select count(*) into v_ev0 from ops.evenements where type = 'envoi_hors_regle';
      begin
        update ops.envois set statut = 'envoye', envoye_le = now() where id = v_e;
        r := r || jsonb_build_object('pause_envoye_refuse', false, 'diag_pause_envoye', 'accepté');
      exception when others then
        r := r || jsonb_build_object('pause_envoye_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_envoye', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      select count(*) into v_ev1 from ops.evenements where type = 'envoi_hors_regle';
      r := r || jsonb_build_object('pause_envoye_reste_approuve', v_ev1 = v_ev0 and exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and envoye_le is null),
                                   'diag_pause_envoye_evenements', v_ev0 || ' puis ' || v_ev1);
      update ops.interrupteurs set actif = false where nom = 'pause_generale';
      select count(*) into v_ev0 from ops.evenements where type = 'envoi_hors_regle';
      begin
        update ops.envois set statut = 'envoye', approuve_par_agent = 'facteur', envoye_le = now() where id = v_e2;
        select count(*) into v_ev1 from ops.evenements where type = 'envoi_hors_regle';
        r := r || jsonb_build_object('prepare_vers_envoye_evenement_hors_regle', v_ev1 = v_ev0 + 1 and exists (select 1 from ops.envois where id = v_e2 and statut = 'envoye'), 'diag_prepare_envoye', v_ev0 || ' puis ' || v_ev1);
        -- R24 : un envoi parti sans accord consommé de Benj est signalé comme tel au veilleur
        r := r || jsonb_build_object('envoye_sans_accord_signale', exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and objet = 'envoi:' || v_e2::text and resume like '%sans accord de Benj%'));
      exception when others then
        r := r || jsonb_build_object('prepare_vers_envoye_evenement_hors_regle', false, 'diag_prepare_envoye', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      r := r || jsonb_build_object('hors_regle_sans_donnee_personnelle', exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and le >= now())
        and not exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and le >= now()
                         and (coalesce(resume, '') || ' ' || coalesce(objet, '')) ~* '(essai-e2e-026|@|999026)'));
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_pause', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── J. Le filet des réponses : 3 par prospect sur 24 h, 20 par jour pour le Gmail ──────────────────────────────────
    begin
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027001', '999027001', 'essai-e2e-026-j1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:j1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      v_n := 0; v_diag := null;
      begin
        for v_i in 1..3 loop
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
            values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('reponses_trois_passent', v_n = 3, 'diag_reponses_trois', coalesce(v_diag, '3 ajoutées'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('reponse_quatrieme_quota_reponses', false, 'diag_reponse_quatrieme', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('reponse_quatrieme_quota_reponses', sqlstate = 'P0001' and sqlerrm = 'ops:quota_reponses', 'diag_reponse_quatrieme', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_prospect', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;
    begin
      -- sept prospects qui ont écrit : 3 réponses au plus chacun, 20 en tout ce jour
      v_ps := '{}'; v_reps := '{}';
      for v_k in 1..8 loop
        insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902710' || v_k, '99902710' || v_k, 'essai-e2e-026-j2-' || v_k || '.invalid', 'essai_e2e')
          returning id into v_p;
        insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
          values ('essai_e2e:0099:rep:j2:' || v_k, v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
        v_ps := v_ps || v_p; v_reps := v_reps || v_rep;
      end loop;
      select count(*) into v_base from ops.envois e
       where e.canal = 'email_sollicite' and e.type = 'reponse' and e.envoyeur = 'gmail' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      v_n := 0; v_diag := null;
      begin
        for v_i in 1..(20 - v_base) loop
          v_k := 1 + (v_i - 1) / 3;
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
            values (v_ps[v_k], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j2-' || v_k || '.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[v_k]));
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('reponses_vingt_jour_passent', v_base <= 20 and v_n = 20 - v_base, 'diag_reponses_vingt', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutées'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_ps[8], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j2-8.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[8]));
        r := r || jsonb_build_object('reponse_21e_quota_reponses', false, 'diag_reponse_21e', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('reponse_21e_quota_reponses', sqlstate = 'P0001' and sqlerrm = 'ops:quota_reponses', 'diag_reponse_21e', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_jour', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;
    begin
      -- vingt réponses parties HIER à 23 h (heure de Paris), sur sept autres prospects : elles ne comptent plus aujourd'hui
      v_hier := (v_jour::timestamp - interval '1 hour') at time zone 'Europe/Paris';
      v_ps := '{}'; v_reps := '{}';
      for v_k in 1..8 loop
        insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902720' || v_k, '99902720' || v_k, 'essai-e2e-026-j3-' || v_k || '.invalid', 'essai_e2e')
          returning id into v_p;
        insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
          values ('essai_e2e:0099:rep:j3:' || v_k, v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', v_hier - interval '1 hour') returning id::text into v_rep;
        v_ps := v_ps || v_p; v_reps := v_reps || v_rep;
      end loop;
      alter table ops.envois disable trigger garde_envois;
      for v_i in 1..20 loop
        v_k := 1 + (v_i - 1) / 3;
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts, preuve_demande)
          values (v_ps[v_k], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j3-' || v_k || '.invalid', v_h, 'envoye', 'redacteur', v_hier, 'facteur', v_hier, v_hier, v_ok3, jsonb_build_object('type', 'message_recu', 'id', v_reps[v_k]));
      end loop;
      alter table ops.envois enable trigger garde_envois;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_ps[8], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j3-8.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[8]));
        r := r || jsonb_build_object('reponse_veille_non_comptee', true);
      exception when others then
        r := r || jsonb_build_object('reponse_veille_non_comptee', false, 'diag_reponse_veille', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_veille', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── K. Réponse RGPD : due malgré l'opposition à qui a fait une demande, 3 au plus sur 35 jours ────────────────────
    begin
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027301', '999027301', 'essai-e2e-026-k1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:k1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'rgpd', now() - interval '3 days') returning id::text into v_rep;
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-k1.invalid', 'Témoin essai 0099', 'essai_e2e');
      v_n := 0; v_diag := null;
      begin
        for v_i in 1..3 loop
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
            values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
          v_n := v_n + 1;
        end loop;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 120);
      end;
      r := r || jsonb_build_object('reponse_rgpd_trois_passent', v_n = 3, 'diag_rgpd_trois', coalesce(v_diag, '3 ajoutées'));
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('reponse_rgpd_4e_refusee', false, 'diag_rgpd_4e', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('reponse_rgpd_4e_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:rgpd_hors_demande', 'diag_rgpd_4e', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027302', '999027302', 'essai-e2e-026-k2.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:k2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '3 days') returning id::text into v_rep;
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-k2.invalid', 'Témoin essai 0099', 'essai_e2e');
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('reponse_rgpd_sans_demande_refusee', false, 'diag_rgpd_sans_demande', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('reponse_rgpd_sans_demande_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:rgpd_hors_demande', 'diag_rgpd_sans_demande', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_rgpd', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── L. ops_garde_etat() : déclencheurs, interrupteurs, plafonds, compteurs du jour, aucune donnée de prospect ────────
    begin
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
      v_etat := public.ops_garde_etat();
      v_txt := coalesce(v_etat -> 'declencheurs', 'null'::jsonb)::text;
      r := r || jsonb_build_object('garde_etat_declencheurs_actifs', position('garde_envois' in v_txt) > 0 and position('annuler_sur_opposition' in v_txt) > 0
                                     and position('garde_accords' in v_txt) > 0
                                     and position('true' in v_txt) > 0 and position('false' in v_txt) = 0, 'diag_garde_etat_declencheurs', left(v_txt, 200));
      v_txt := coalesce(v_etat -> 'interrupteurs', 'null'::jsonb)::text;
      r := r || jsonb_build_object('garde_etat_interrupteurs', position('pause_generale' in v_txt) > 0 and position('envoi_froid' in v_txt) > 0);
      v_txt := coalesce(v_etat -> 'plafonds', 'null'::jsonb)::text;
      r := r || jsonb_build_object('garde_etat_plafonds', position('formulaire_site' in v_txt) > 0 and position('email_sollicite' in v_txt) > 0 and position('instagram' in v_txt) > 0);
      v_txt := coalesce(v_etat -> 'du_jour', 'null'::jsonb)::text;
      r := r || jsonb_build_object('garde_etat_du_jour', position('"envois"' in v_txt) > 0 and position('"nouveaux"' in v_txt) > 0 and position('email_sollicite' in v_txt) > 0);
      r := r || jsonb_build_object('garde_etat_sans_donnee_prospect', v_etat::text !~* '(essai-e2e-026|@|999026)');
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_garde_etat', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── N. L'accord individuel de Benj (R24, correction du 27/09 ; PG-9) ──────────────────────────────────────────────
    begin
      -- n1 : un lien de maquette sollicité, jugé, qui attend l'accord de Benj
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027401', '999027401', 'essai-e2e-026-n1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      begin
        update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = '{"j1": "sans_objet", "j3": "ok"}'::jsonb where id = v_e;
        r := r || jsonb_build_object('attente_sans_verdicts_refusee', false, 'diag_attente_sans_verdicts', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('attente_sans_verdicts_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_attente_sans_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
        r := r || jsonb_build_object('approuve_sans_attente_refuse', false, 'diag_approuve_sans_attente', 'accepté');
      exception when others then
        r := r || jsonb_build_object('approuve_sans_attente_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent', 'diag_approuve_sans_attente', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
        r := r || jsonb_build_object('accord_hors_attente_refuse', false, 'diag_accord_hors_attente', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_hors_attente_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_hors_attente', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
        r := r || jsonb_build_object('attente_verdicts_passe', exists (select 1 from ops.envois where id = v_e and statut = 'attend_accord_benj'));
      exception when others then
        r := r || jsonb_build_object('attente_verdicts_passe', false, 'diag_attente_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- un envoi qui attend prend sa place au plafond : plafond = les autres + 1, le suivant est refusé
      select count(*) into v_base from ops.envois e
       where e.canal = 'email_sollicite' and e.statut in ('prepare', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      update ops.quotas_canaux set plafond_jour = least(300, v_base + 1) where canal = 'email_sollicite' and envoyeur = '*';
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
          values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-n1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
        r := r || jsonb_build_object('attente_compte_au_plafond', false, 'diag_attente_plafond', v_base || ' autres ce jour ; accepté');
      exception when others then
        r := r || jsonb_build_object('attente_compte_au_plafond', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_attente_plafond', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.quotas_canaux set plafond_jour = 50 where canal = 'email_sollicite' and envoyeur = '*';
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_absent_refuse', false, 'diag_accord_absent', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_absent_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent', 'diag_accord_absent', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, gen_random_uuid());
        r := r || jsonb_build_object('accord_non_fondateur_refuse', false, 'diag_accord_non_fondateur', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_non_fondateur_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_auteur', 'diag_accord_non_fondateur', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          values (v_e, 'email_sollicite', 'autre@essai-e2e-026-n1.invalid', v_h, v_benj);
        r := r || jsonb_build_object('accord_autre_destinataire_refuse', false, 'diag_accord_autre_destinataire', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_autre_destinataire_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_autre_destinataire', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          values (v_e, 'messagerie', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
        r := r || jsonb_build_object('accord_autre_canal_refuse', false, 'diag_accord_autre_canal', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_autre_canal_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_autre_canal', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
          values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h2, v_benj);
        r := r || jsonb_build_object('accord_texte_modifie_refuse', false, 'diag_accord_texte_modifie', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_texte_modifie_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_texte_modifie', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- l'accord valide ; la base date l'émission (l'écrivain ne recule ni l'émission ni l'échéance au-delà de 24 h)
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj, now() - interval '10 hours', now() + interval '30 hours')
        returning id into v_acc;
      r := r || jsonb_build_object('accord_emis_le_pose_par_la_base', exists (select 1 from ops.accords_benj a where a.id = v_acc and a.emis_le = now()
                                     and a.expire_le <= now() + interval '24 hours' and a.utilise_le is null and a.annule_le is null));
      -- Benj a cliqué deux fois : un second accord, qui tombera quand le premier sera consommé
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_valide_approuve', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and approuve_le = now()));
      exception when others then
        r := r || jsonb_build_object('accord_valide_approuve', false, 'diag_accord_valide', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      r := r || jsonb_build_object('accord_consomme', (select count(*) from ops.accords_benj a where a.envoi_id = v_e and a.utilise_le is not null) = 1);
      r := r || jsonb_build_object('accord_unique_par_envoi', (select count(*) from ops.accords_benj a where a.envoi_id = v_e and a.utilise_le is null and a.annule_le is null) = 0);
      begin
        update ops.accords_benj set utilise_le = null where envoi_id = v_e and utilise_le is not null;
        r := r || jsonb_build_object('accord_fige_refuse', false, 'diag_accord_fige', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_fige_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_fige', 'diag_accord_fige', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set statut = 'attend_accord_benj' where id = v_e;
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_rejoue_refuse', false, 'diag_accord_rejoue', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_rejoue_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_rejoue', 'diag_accord_rejoue', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- n2 : un accord échu (semé hors garde : il a été émis il y a 3 h pour 2 h)
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027402', '999027402', 'essai-e2e-026-n2.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      alter table ops.accords_benj disable trigger garde_accords;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n2.invalid', v_h, v_benj, now() - interval '3 hours', now() - interval '1 hour');
      alter table ops.accords_benj enable trigger garde_accords;
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_perime_refuse', false, 'diag_accord_perime', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_perime_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime', 'diag_accord_perime', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- n4 : un accord qui ne correspond plus à l'envoi (semé hors garde : un autre destinataire)
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027404', '999027404', 'essai-e2e-026-n4.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      alter table ops.accords_benj disable trigger garde_accords;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
        values (v_e, 'email_sollicite', 'autre@essai-e2e-026-n4.invalid', v_h, v_benj, now(), now() + interval '1 hour');
      alter table ops.accords_benj enable trigger garde_accords;
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_different_refuse', false, 'diag_accord_different', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_different_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_different', 'diag_accord_different', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- n5 : une opposition arrive pendant l'attente : l'envoi est annulé, son accord tombe
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027405', '999027405', 'essai-e2e-026-n5.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n5.invalid', v_h, v_benj) returning id into v_acc;
      insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-n5.invalid', 'Témoin essai 0099', 'essai_e2e');
      r := r || jsonb_build_object('accord_opposition_annule', exists (select 1 from ops.envois where id = v_e and statut = 'annule')
                                     and exists (select 1 from ops.accords_benj a where a.id = v_acc and a.annule_le is not null and a.utilise_le is null),
                                   'diag_accord_opposition', (select statut from ops.envois where id = v_e));
      -- n6 : l'envoi quitte l'attente (retour en prepare) : son accord tombe, et ne revient pas avec lui
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027406', '999027406', 'essai-e2e-026-n6.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n6', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n6.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n6.invalid', v_h, v_benj) returning id into v_acc;
      update ops.envois set statut = 'prepare' where id = v_e;
      update ops.envois set statut = 'attend_accord_benj' where id = v_e;
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_annule_hors_attente', false, 'diag_accord_hors_attente_annule', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_annule_hors_attente', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent'
                                       and exists (select 1 from ops.accords_benj a where a.id = v_acc and a.annule_le is not null),
                                     'diag_accord_hors_attente_annule', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- n3 (en dernier : la pause bouge) : un accord donné, puis la pause mise et levée ; l'accord ne vaut plus
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027403', '999027403', 'essai-e2e-026-n3.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:n3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n3.invalid', v_h, v_benj);
      update ops.interrupteurs set actif = true, change_le = now() where nom = 'pause_generale';
      update ops.interrupteurs set actif = false, change_le = now() where nom = 'pause_generale';
      begin
        update ops.envois set statut = 'approuve' where id = v_e;
        r := r || jsonb_build_object('accord_pause_annule', false, 'diag_accord_pause', 'accepté');
      exception when others then
        r := r || jsonb_build_object('accord_pause_annule', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime', 'diag_accord_pause', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_accord', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── O. L'envoi figé dès l'attente : aucune retouche après les verdicts (PG-10, diag_g2) ───────────────────────────
    begin
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027501', '999027501', 'essai-e2e-026-o1.invalid', 'essai_e2e')
        returning id into v_p;
      insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
        values ('essai_e2e:0099:rep:o1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-o1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
        returning id into v_e;
      -- en prepare, la Plume retouche encore son texte
      begin
        update ops.envois set empreinte_texte = v_h2 where id = v_e;
        r := r || jsonb_build_object('retouche_prepare_passe', exists (select 1 from ops.envois where id = v_e and empreinte_texte = v_h2));
      exception when others then
        r := r || jsonb_build_object('retouche_prepare_passe', false, 'diag_retouche_prepare', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      begin
        update ops.envois set empreinte_texte = v_h where id = v_e;
        r := r || jsonb_build_object('retouche_texte_attente_refusee', false, 'diag_retouche_attente', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_texte_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_attente', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- décision de Benj du 27/09 : les en-têtes, les verdicts et le Facteur qui les porte sont figés dès l'attente. Une retouche
      -- acceptée (SQL d'avant) est défaite aussitôt par v_fin, pour que la suite du groupe se juge sur l'envoi intact.
      begin
        update ops.envois set entetes = jsonb_build_object('Subject', 'Autre objet (essai 0099)') where id = v_e;
        r := r || jsonb_build_object('retouche_entetes_attente_refusee', false, 'diag_retouche_entetes_attente', 'acceptée');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('retouche_entetes_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_entetes_attente', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      begin
        update ops.envois set verdicts = v_ok3 where id = v_e;
        r := r || jsonb_build_object('retouche_verdicts_attente_refusee', false, 'diag_retouche_verdicts_attente', 'acceptée');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('retouche_verdicts_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_verdicts_attente', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      begin
        update ops.envois set approuve_par_agent = 'redacteur' where id = v_e;
        r := r || jsonb_build_object('retouche_approuve_par_agent_attente_refusee', false, 'diag_retouche_agent_attente', 'acceptée');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('retouche_approuve_par_agent_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_agent_attente', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        values (v_e, 'email_sollicite', 'contact@essai-e2e-026-o1.invalid', v_h2, v_benj);
      update ops.envois set statut = 'approuve' where id = v_e;
      -- l'envoi approuvé : aucun des six champs ne bouge plus
      begin
        update ops.envois set destinataire = 'autre@essai-e2e-026-o1.invalid' where id = v_e;
        r := r || jsonb_build_object('retouche_destinataire_approuve_refusee', false, 'diag_retouche_destinataire', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_destinataire_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_destinataire', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set empreinte_texte = v_h where id = v_e;
        r := r || jsonb_build_object('retouche_texte_approuve_refusee', false, 'diag_retouche_texte', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_texte_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_texte', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set canal = 'messagerie' where id = v_e;
        r := r || jsonb_build_object('retouche_canal_approuve_refusee', false, 'diag_retouche_canal', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_canal_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_canal', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set type = 'reponse' where id = v_e;
        r := r || jsonb_build_object('retouche_type_approuve_refusee', false, 'diag_retouche_type', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_type_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_type', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set prospect_id = v_pg where id = v_e;
        r := r || jsonb_build_object('retouche_prospect_approuve_refusee', false, 'diag_retouche_prospect', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_prospect_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_prospect', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set envoyeur = 'repondeur' where id = v_e;
        r := r || jsonb_build_object('retouche_envoyeur_approuve_refusee', false, 'diag_retouche_envoyeur', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_envoyeur_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_envoyeur', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- décision de Benj du 27/09 (info_a3) : ni un Cc ajouté, ni les verdicts effacés sur un envoi approuvé
      begin
        update ops.envois set entetes = jsonb_build_object('Cc', 'autre@essai-e2e-026-o1.invalid') where id = v_e;
        r := r || jsonb_build_object('retouche_entetes_approuve_refusee', false, 'diag_retouche_entetes', 'acceptée');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('retouche_entetes_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_entetes', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      begin
        update ops.envois set verdicts = '{}'::jsonb where id = v_e;
        r := r || jsonb_build_object('retouche_verdicts_approuve_refusee', false, 'diag_retouche_verdicts', 'acceptée');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('retouche_verdicts_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      -- une colonne libre (l'identifiant externe) se pose sans rien défaire
      begin
        update ops.envois set id_externe = 'essai_e2e:0099:o1' where id = v_e;
        r := r || jsonb_build_object('approuve_champ_libre_passe', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and id_externe = 'essai_e2e:0099:o1'));
      exception when others then
        r := r || jsonb_build_object('approuve_champ_libre_passe', false, 'diag_champ_libre', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- parti : ni retouché, ni ramené en arrière
      update ops.envois set statut = 'envoye' where id = v_e;
      begin
        update ops.envois set canal = 'messagerie' where id = v_e;
        r := r || jsonb_build_object('retouche_envoye_refusee', false, 'diag_retouche_envoye', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('retouche_envoye_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_envoye', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        update ops.envois set statut = 'attend_accord_benj' where id = v_e;
        r := r || jsonb_build_object('envoye_ne_revient_pas', false, 'diag_envoye_revient', 'accepté');
      exception when others then
        r := r || jsonb_build_object('envoye_ne_revient_pas', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_envoye_revient', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_fige', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── P. Les dates sont celles de la base (PG-11, diag_g1 rejoué : plafond à 1, envois antidatés de deux jours) ─────
    begin
      select count(*) into v_base from ops.envois e
       where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      v_n := 0; v_diag := null; v_e := null;
      for v_i in 1..4 loop
        insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902760' || v_i, '99902760' || v_i, 'essai-e2e-026-p' || v_i || '.invalid', 'essai_e2e')
          returning id into v_p;
        begin
          insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le)
            values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur', now() - interval '2 days')
            returning id into v_e2;
          if v_e is null then v_e := v_e2; end if;
          v_n := v_n + 1;
        exception when others then
          if v_diag is null then v_diag := sqlstate || ' ' || left(sqlerrm, 120); end if;
        end;
      end loop;
      r := r || jsonb_build_object('antidate_prepare_le_pose_par_la_base', v_e is not null and exists (select 1 from ops.envois where id = v_e and prepare_le = now()));
      r := r || jsonb_build_object('antidate_ne_contourne_pas_plafond', v_n = 1 and v_diag in ('P0001 ops:quota', 'P0001 ops:quota_nouveaux'),
                                   'diag_antidate', v_n || ' passé(s) sur 4, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027605', '999027605', 'essai-e2e-026-p5.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
        r := r || jsonb_build_object('antidate_puis_du_jour_refuse', false, 'diag_antidate_du_jour', 'accepté');
      exception when others then
        r := r || jsonb_build_object('antidate_puis_du_jour_refuse', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_antidate_du_jour', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- la date d'un envoi ne se réécrit pas ensuite
      begin
        update ops.envois set prepare_le = now() - interval '2 days' where id = v_e;
        r := r || jsonb_build_object('prepare_le_immuable', exists (select 1 from ops.envois where id = v_e and prepare_le = now()));
      exception when others then
        r := r || jsonb_build_object('prepare_le_immuable', false, 'diag_prepare_le_immuable', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- le passage à envoye est daté par la base, pas par l'écrivain (les 90 jours et les 72 h le lisent)
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e3;
      begin
        update ops.envois set statut = 'envoye', envoye_le = now() - interval '100 days' where id = v_e3;
        r := r || jsonb_build_object('envoye_le_pose_par_la_base', exists (select 1 from ops.envois where id = v_e3 and statut = 'envoye' and envoye_le = now()));
      exception when others then
        r := r || jsonb_build_object('envoye_le_pose_par_la_base', false, 'diag_envoye_le', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_dates', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── Q. La réanimation compte au plafond du jour (contre-vérification du 27/09, a4 ; PG-12) ─────────────────────────
    --    Plafond du formulaire à 1 : trois fiches de la VEILLE (sautée, périmée, annulée ; semées hors garde) reviennent
    --    aujourd'hui, et une fiche du jour arrive. Une seule entrée passe, datée du jour ; ops_garde_etat dit le même chiffre.
    --    Puis une fiche écrite directement en saute passe les mêmes contrôles (relance du formulaire, plafond plein).
    begin
      select count(*) into v_base from ops.envois e
       where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      v_ps := '{}';
      v_hier := now() - interval '1 day';
      alter table ops.envois disable trigger garde_envois;
      for v_i in 1..3 loop
        insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902770' || v_i, '99902770' || v_i, 'essai-e2e-026-q' || v_i || '.invalid', 'essai_e2e')
          returning id into v_p;
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, (array['saute', 'perime', 'annule'])[v_i], 'redacteur', v_hier)
          returning id into v_e;
        v_ps := v_ps || v_e;
      end loop;
      alter table ops.envois enable trigger garde_envois;
      v_n := 0; v_k := 0; v_diag := null;
      begin
        update ops.envois set statut = 'prepare' where id = v_ps[1];
        v_n := v_n + 1;
      exception when others then
        v_diag := sqlstate || ' ' || left(sqlerrm, 80);
      end;
      r := r || jsonb_build_object('reanimation_datee_par_la_base', exists (select 1 from ops.envois where id = v_ps[1] and statut = 'prepare' and prepare_le = now()));
      begin
        update ops.envois set statut = 'prepare' where id = v_ps[2];
        v_n := v_n + 1;
      exception when others then
        if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
        v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
      end;
      begin
        update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_ps[3];
        v_n := v_n + 1;
      exception when others then
        if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
        v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
      end;
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027704', '999027704', 'essai-e2e-026-q4.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur')
          returning id into v_e;
        v_ps := v_ps || v_e;
        v_n := v_n + 1;
      exception when others then
        if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
        v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
      end;
      r := r || jsonb_build_object('reanimation_respecte_plafond', v_n = 1 and v_k = 3,
                                   'diag_reanimation', v_n || ' entrée(s) sur 4, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
      -- le compteur de la station est celui du déclencheur : chaque fiche en file aujourd'hui y est comptée une fois
      v_etat := public.ops_garde_etat();
      select coalesce(sum((x ->> 'envois')::int), -1) into v_i
        from jsonb_array_elements(coalesce(v_etat -> 'du_jour', '[]'::jsonb)) x
       where x ->> 'canal' = 'formulaire_site' and x ->> 'envoyeur' = '*';
      select count(*) into v_k from ops.envois e where e.id = any (v_ps) and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye');
      r := r || jsonb_build_object('du_jour_compte_les_reanimes', v_i = v_base + v_k,
                                   'diag_du_jour_reanimes', 'du_jour ' || v_i || ', en file ' || (v_base + v_k));
      -- q5 : une fiche écrite directement en saute passe les mêmes contrôles
      insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027705', '999027705', 'essai-e2e-026-q5.invalid', 'essai_e2e')
        returning id into v_p;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'relance', null, v_h, 'saute', 'redacteur');
        r := r || jsonb_build_object('insertion_saute_controlee', false, 'diag_insertion_saute', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('insertion_saute_controlee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_insertion_saute', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'saute', 'redacteur');
        r := r || jsonb_build_object('insertion_saute_plafond_plein_refusee', false, 'diag_insertion_saute_plafond', 'acceptée');
      exception when others then
        r := r || jsonb_build_object('insertion_saute_plafond_plein_refusee', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_insertion_saute_plafond', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_reanimation', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── Q bis. Le stock de la veille ne part pas en un jour (contre-vérification du 27/09, a4c ; PG-12) ──────────────
    --    Plafond du formulaire à 1 : trois fiches préparées la veille passent en attente puis sont approuvées aujourd'hui ;
    --    une seule y arrive. Puis deux fiches en attente depuis la veille, une seule place : une seule approbation passe.
    begin
      select count(*) into v_base from ops.envois e
       where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
        on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
      v_ps := '{}';
      v_hier := now() - interval '1 day';
      alter table ops.envois disable trigger garde_envois;
      for v_i in 1..5 loop
        insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902771' || v_i, '99902771' || v_i, 'essai-e2e-026-qb' || v_i || '.invalid', 'essai_e2e')
          returning id into v_p;
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, verdicts)
          values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, case when v_i <= 3 then 'prepare' else 'attend_accord_benj' end, 'redacteur', v_hier,
                  case when v_i <= 3 then null else 'facteur' end, case when v_i <= 3 then '{}'::jsonb else v_ok3 end)
          returning id into v_e;
        v_ps := v_ps || v_e;
      end loop;
      alter table ops.envois enable trigger garde_envois;
      v_n := 0; v_k := 0; v_diag := null;
      for v_i in 1..3 loop
        begin
          update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_ps[v_i];
          insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
            select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_ps[v_i];
          update ops.envois set statut = 'approuve' where id = v_ps[v_i];
          v_n := v_n + 1;
        exception when others then
          if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
          v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
        end;
      end loop;
      r := r || jsonb_build_object('attente_veille_compte_au_plafond', v_n = 1 and v_k = 2
                                     and (select count(*) from ops.envois e where e.id = any (v_ps[1:3]) and e.statut = 'approuve' and e.prepare_le = now()) = 1,
                                   'diag_attente_veille', v_n || ' approuvée(s) sur 3, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
      select count(*) into v_base2 from ops.envois e
       where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
      update ops.quotas_canaux set plafond_jour = least(300, v_base2 + 1), plafond_nouveaux_jour = least(300, v_base2 + 1) where canal = 'formulaire_site' and envoyeur = '*';
      v_n := 0; v_k := 0; v_diag := null;
      for v_i in 4..5 loop
        begin
          insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
            select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_ps[v_i];
          update ops.envois set statut = 'approuve' where id = v_ps[v_i];
          v_n := v_n + 1;
        exception when others then
          if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
          v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
        end;
      end loop;
      r := r || jsonb_build_object('approbation_veille_compte_au_plafond', v_n = 1 and v_k = 1,
                                   'diag_approbation_veille', v_n || ' approuvée(s) sur 2, plafond ' || (v_base2 + 1) || coalesce(' ; ' || v_diag, ''));
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_stock', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── R. Le passage à envoye refusé sous pause active ou accord tombé (décision de Benj du 27/09 ; PG-13) ───────────
    --    Des liens de maquette sollicités au prospect témoin, jugés et approuvés avec un accord de Benj. Un refus accepté
    --    (SQL d'avant) est défait aussitôt par v_fin.
    begin
      -- r1 : l'accord consommé a échu depuis (semé hors garde : émis il y a 26 h pour 24 h)
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
      update ops.envois set statut = 'approuve' where id = v_e;
      alter table ops.accords_benj disable trigger garde_accords;
      update ops.accords_benj set emis_le = now() - interval '26 hours', expire_le = now() - interval '2 hours' where envoi_id = v_e and utilise_le is not null;
      alter table ops.accords_benj enable trigger garde_accords;
      begin
        update ops.envois set statut = 'envoye' where id = v_e;
        r := r || jsonb_build_object('envoye_accord_echu_refuse', false, 'diag_envoye_echu', 'accepté');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('envoye_accord_echu_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime'
                                         and exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and envoye_le is null),
                                       'diag_envoye_echu', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      -- r2 : un accord valable, pas de pause : l'envoi part, daté par la base, sans signalement
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h2, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e2;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e2;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e2;
      update ops.envois set statut = 'approuve' where id = v_e2;
      begin
        update ops.envois set statut = 'envoye' where id = v_e2;
        r := r || jsonb_build_object('envoye_accord_valide_passe', exists (select 1 from ops.envois where id = v_e2 and statut = 'envoye' and envoye_le = now())
                                       and not exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and objet = 'envoi:' || v_e2::text));
      exception when others then
        r := r || jsonb_build_object('envoye_accord_valide_passe', false, 'diag_envoye_valide', sqlstate || ' ' || left(sqlerrm, 120));
      end;
      -- r3 : pause active : une fiche insérée directement en envoye est refusée
      update ops.interrupteurs set actif = true where nom = 'pause_generale';
      begin
        insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, approuve_par_agent, verdicts, preuve_demande)
          values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'envoye', 'redacteur', 'facteur', v_okl, jsonb_build_object('type', 'message_recu', 'id', v_repg));
        r := r || jsonb_build_object('envoye_insere_pause_refuse', false, 'diag_envoye_insere_pause', 'accepté');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('envoye_insere_pause_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_envoye_insere_pause', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      update ops.interrupteurs set actif = false where nom = 'pause_generale';
      -- r4 (en dernier : la pause bouge) : approuvé, puis la pause mise et levée ; son accord est tombé, il ne part pas
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
        values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
        returning id into v_e3;
      update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e3;
      insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
        select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e3;
      update ops.envois set statut = 'approuve' where id = v_e3;
      update ops.interrupteurs set actif = true, change_le = now() where nom = 'pause_generale';
      update ops.interrupteurs set actif = false, change_le = now() where nom = 'pause_generale';
      begin
        update ops.envois set statut = 'envoye' where id = v_e3;
        r := r || jsonb_build_object('envoye_pause_levee_refuse', false, 'diag_envoye_pause_levee', 'accepté');
        raise exception using message = v_fin;
      exception when others then
        if sqlerrm <> v_fin then
          r := r || jsonb_build_object('envoye_pause_levee_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime'
                                         and exists (select 1 from ops.envois where id = v_e3 and statut = 'approuve'),
                                       'diag_envoye_pause_levee', sqlstate || ' ' || left(sqlerrm, 120));
        end if;
      end;
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_envoye', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── M. anon et authenticated : ops_garde_etat refusée (42501) ───────────────────────────────────────────────────────
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_garde_etat();
      r := r || jsonb_build_object('anon_refuse_garde_etat', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_garde_etat', v_role = 'anon' and sqlstate = '42501', 'diag_anon_garde_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_garde_etat();
      r := r || jsonb_build_object('authenticated_refuse_garde_etat', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_garde_etat', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_garde_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
  end essai_0099;
