// scripts/fixtures/026-pilotage/b/scenarios-sql.mjs — les scénarios des essais à sec de pilotage-sql-qa (fiche 026-066).
//
// Chaque scénario est le corps PL/pgSQL que blocEssai (scripts/lib/sql-essai.mjs) place après l'exécution des jumeaux nus,
// dans `do $essai_026$ declare r jsonb … begin … raise exception 'ESSAI_A_SEC % %' … end $essai_026$;` : tout est annulé par
// l'exception finale. Chaque cas est un sous-bloc qui pose sa clé (`r := r || jsonb_build_object('<clé>', …)`) et, s'il lève,
// la pose à false avec un `diag_<clé>` (SQLSTATE et message) : un cas cassé ne masque pas les autres. Les cas marqués
// « annulé » se défont eux-mêmes (exception EA000 rattrapée) pour ne pas peser sur les suivants (quotas, réunions du jour).
//
// Écrits le 27/09 sans pouvoir être exécutés (la fiche 026-066 interdit tout essai sur la base) : les colonnes des tables de
// 0106 et 0111 (ops.reponses, ops.rendez_vous, ops.technologies, ops.etat_envoi) et de public.sites_commandes sont celles des
// contrats des fiches 026-061 et 026-079. Si l'essai de 026-076, 026-079, 026-088 ou 026-175 rend un diag_* qui vient du
// scénario et non de la migration, c'est une question à poser, jamais une clé à contourner.
const SALLES_SQL = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos'].map((x) => `'${x}'`).join(', ')
const cas = (cle, corps, decl = '') => `
  declare ok boolean := false; ${decl}
  begin
${corps}
    r := r || jsonb_build_object('${cle}', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('${cle}', false, 'diag_${cle}', left(sqlstate || ' ' || sqlerrm, 200));
  end;`
/** Un bloc qui se défait lui-même : ses écritures sont annulées, ses variables gardées. */
const annule = (corps) => `
    begin
${corps}
      raise sqlstate 'EA000';
    exception when sqlstate 'EA000' then null;
    end;`
/** Attend l'erreur `code` (ops:…) de l'instruction : ok vaut true si elle lève ce code, false sinon. */
const leve = (instr, code) => `
    begin
      ${instr};
      ok := false;
    exception when others then
      ok := sqlerrm like '%${code}%';
      if not ok then raise; end if;
    end;`
/** anon et authenticated se voient refuser (42501) chaque appel. */
const refus = (cle, appels) => cas(cle, `
    ${appels.flatMap((a) => ['anon', 'authenticated'].map((role) => `begin execute 'set local role ${role}'; perform ${a}; execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;`)).join('\n    ')}
    execute 'reset role';
    ok := n = ${appels.length * 2};
    r := r || jsonb_build_object('diag_${cle}', n || '/' || ${appels.length * 2});`, 'n integer := 0;')

// ── lecture (0107, 026-076) : critère SQ-9 ──────────────────────────────────────────────────────────────────────────────
const OPTIONS = `'[{"cle":"oui","libelle":"Oui","recommandee":true},{"cle":"non","libelle":"Non","recommandee":false}]'::jsonb`
const lecture = `
  declare
    v_mois timestamptz := date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
    v_jour text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
    v_d uuid[] := '{}';
    v_t uuid; v_t2 uuid; v_id uuid;
    v_att0 jsonb := '{}'; v_att1 jsonb := '{}';
    v_chef0 integer := 0;
    v_ade boolean := false; v_ade_diag jsonb := '{}';
    v_montants integer[] := array[5000, null, 5000, 100, null, 0, 20000];
    v_heures integer[] := array[48, 24, 24, 72, 12, 6, 96];
    v_portees text[] := array['argent', 'aucune', 'aucune', 'artisan', 'aucune', 'aucune', 'argent'];
  begin
${cas('preparation', `
    select coalesce(jsonb_object_agg(cle, nombre), '{}') into v_att0 from public.pilotage_attention_sources();
    select coalesce(cycles_jour, 0) into v_chef0 from public.pilotage_chef();
    perform public.ops_agent_enregistrer('essai_e2e_pl1', 'Essai pilotage un', array['essai'], array['essai_pl'], array['taches', 'evenements', 'decisions', 'couts'], 10, 60, 100, 100);
    perform public.ops_agent_enregistrer('essai_e2e_pl2', 'Essai pilotage deux', array['essai'], array[]::text[], array['evenements', 'couts'], 10, 60, 0, 100);
    perform public.ops_agent_enregistrer('essai_e2e_ret', 'Essai pilotage retiré', array['essai'], array[]::text[], array['evenements'], 10, 60, 0, 100);
    update ops.agents set retire_le = now() where nom = 'essai_e2e_ret';
    if not exists (select 1 from ops.agents where nom = 'chef') then
      perform public.ops_agent_enregistrer('chef', 'Chef', array['chef'], array[]::text[], array['evenements', 'decisions'], 30, 60, 0, 0);
    end if;
    select id into v_t from public.ops_tache_creer('essai_e2e_pl1', 'essai_pl', 'essai_e2e:pilotage:t1', 'essai', '{}'::jsonb, null, 'Tâche d''essai un');
    select id into v_t2 from public.ops_tache_creer('essai_e2e_pl1', 'essai_pl', 'essai_e2e:pilotage:t2', 'essai', '{}'::jsonb, null, 'Tâche d''essai deux');
    update ops.taches set statut = 'echec', derniere_erreur = 'essai' where id = v_t2;
    insert into ops.couts (le, agent, fournisseur, montant_eur, detail, tache_id) values
      (now() - interval '3 minutes', 'essai_e2e_pl1', 'freellmapi', 2.50, '{"modele":"essai_e2e_modele"}', null),
      (now() - interval '1 minute', 'essai_e2e_pl1', 'openai-codex', 1.25, '{"modele":"gpt-6-luna"}', v_t),
      (v_mois - interval '2 days', 'essai_e2e_pl1', 'freellmapi', 4.00, '{"modele":"essai_e2e_modele"}', null),
      (now() - interval '8 days', 'essai_e2e_pl2', 'freellmapi', 0.10, '{"modele":"essai_e2e_vieux"}', null);
    perform public.ops_evenement_ajouter('essai_e2e_pl1', 'essai_fait', 'objet d''essai', 'Essai fait par un', null);
    perform public.ops_evenement_ajouter('essai_e2e_pl1', 'battement', null, 'battement', null);
    perform public.ops_evenement_ajouter('essai_e2e_pl2', 'battement', null, 'battement', null);
    -- capturé ICI, avant la boucle des sept ops_decision_creer plus bas (qui pose ses propres événements
    -- decision_creee pour essai_e2e_pl1) : sinon le dernier événement non-battement de pl1 devient une décision,
    -- jamais 'essai_fait', et l'assertion ne teste plus ce qu'elle prétend tester (026-076, correction du 28/09).
    -- pl2 n'a reçu, avant cette capture, qu'un enregistrement et un battement : ops_agent_enregistrer pose TOUJOURS
    -- un événement 'agent_enregistre' (0097_ops_identite.sql, hors de mon périmètre), jamais aucun agent de cette
    -- fixture n'a « aucun événement autre que battement » — son dernier événement réel est donc 'agent_enregistre',
    -- jamais null ; le contrat (« dernier_* … nuls s'il n'en a aucun ») n'est pas contredit, juste jamais atteint ici.
    select jsonb_build_object(
      'pl1', (select jsonb_build_object('type', dernier_type, 'resume', dernier_resume) from public.pilotage_agents() where nom = 'essai_e2e_pl1'),
      'pl2', (select jsonb_build_object('type', dernier_type, 'resume', dernier_resume) from public.pilotage_agents() where nom = 'essai_e2e_pl2')
    ) into v_ade_diag;
    v_ade := (v_ade_diag #>> '{pl2,type}' = 'agent_enregistre' and v_ade_diag #>> '{pl2,resume}' = 'fiche créée : Essai pilotage deux')
      and (v_ade_diag #>> '{pl1,type}' = 'essai_fait' and v_ade_diag #>> '{pl1,resume}' = 'Essai fait par un');
    perform public.ops_evenement_ajouter('chef', 'cycle_termine', 'essai-modele-a', 'Cycle d''essai A', null);
    perform public.ops_evenement_ajouter('chef', 'cycle_termine', 'essai-modele-b', 'Cycle d''essai B', null);
    update ops.agents set disjoncteur_ouvert_le = now() where nom = 'essai_e2e_pl1';
    for i in 1..7 loop
      select id into v_id from public.ops_decision_creer('essai_e2e_pl1', 'Décision d''essai ' || i, 'Contexte d''essai', ${OPTIONS}, 'oui',
        v_montants[i], v_portees[i], now() + make_interval(hours => v_heures[i]), 'essai_e2e:pilotage:d' || i, null);
      v_d := v_d || v_id;
    end loop;
    perform public.ops_decision_creer('chef', 'Idée d''essai du Chef', 'Contexte', ${OPTIONS}, 'oui', null, 'aucune', now() + interval '2 days', 'chef:' || v_jour || ':idee-essai', null);
    select coalesce(jsonb_object_agg(cle, nombre), '{}') into v_att1 from public.pilotage_attention_sources();
    ok := cardinality(v_d) = 7 and v_t is not null and v_t2 is not null;`, 'i integer;')}
${cas('decisions_ordre', `
    select array_agg(x.id order by x.n) into v_ids from (select p.id, row_number() over () as n from public.pilotage_decisions(100) p) x where x.id = any(v_d);
    ok := v_ids = array[v_d[7], v_d[3], v_d[1], v_d[4], v_d[6], v_d[5], v_d[2]];
    r := r || jsonb_build_object('diag_decisions_ordre', v_ids::text);`, 'v_ids uuid[];')}
${cas('decisions_limite_3', `
    select count(*) = 3 into ok from public.pilotage_decisions(3);`)}
${cas('decision_tranchee', `
    update ops.decisions set statut = 'tranchee', choix = 'non', tranchee_le = now() where id = v_d[2];
    ok := not exists (select 1 from public.pilotage_decisions(100) where id = v_d[2])
      and not exists (select 1 from public.pilotage_decision(v_d[2]))
      and exists (select 1 from public.pilotage_decision(v_d[1]))
      and exists (select 1 from public.pilotage_decisions_par_cles(array['essai_e2e:pilotage:d2']) where statut = 'tranchee' and choix = 'non');`)}
${cas('agents_cout_mois', `
    select cout_mois_eur = 3.75 into ok from public.pilotage_agents() where nom = 'essai_e2e_pl1';`)}
${cas('couts_taches', `
    ok := exists (select 1 from public.pilotage_couts_taches(v_mois, 50) where tache_id = v_t and agent = 'essai_e2e_pl1' and montant_eur = 1.25);`)}
${cas('couts_modeles', `
    ok := exists (select 1 from public.pilotage_couts_modeles(v_mois) where fournisseur = 'freellmapi' and modele = 'essai_e2e_modele' and appels = 1 and eur = 2.50)
      and exists (select 1 from public.pilotage_couts_modeles(v_mois) where fournisseur = 'openai-codex' and modele = 'gpt-6-luna' and appels >= 1);`)}
${cas('agents_modele', `
    select modele = 'gpt-6-luna' and fournisseur = 'openai-codex' and modele_le is not null into ok from public.pilotage_agents() where nom = 'essai_e2e_pl1';`)}
${cas('agents_modele_vieux', `
    select modele is null and fournisseur is null into ok from public.pilotage_agents() where nom = 'essai_e2e_pl2';`)}
${cas('agents_retire_absent', `
    ok := exists (select 1 from public.pilotage_agents() where nom = 'essai_e2e_pl1') and not exists (select 1 from public.pilotage_agents() where nom = 'essai_e2e_ret');`)}
${cas('agents_dernier_evenement', `
    -- capturée dans 'preparation', AVANT la boucle des sept ops_decision_creer (qui poserait sept 'decision_creee'
    -- plus récents pour essai_e2e_pl1 et invaliderait l'assertion) : voir v_ade (026-076, correction du 28/09).
    ok := v_ade;
    r := r || jsonb_build_object('diag_agents_dernier_evenement', v_ade_diag::text);`)}
${cas('evenements_cinq_derniers', `
    select array_agg(x.id order by x.n), bool_and(x.type <> 'battement'), count(*) into v_ids, v_sans, v_n from (select e.id, e.type, row_number() over () as n from public.pilotage_evenements(null, 5, null, null) e) x;
    ok := v_n = 5 and v_sans and v_ids = (select array_agg(i order by i) from unnest(v_ids) i)
      and v_ids[5] = (select max(id) from ops.evenements where type <> 'battement');`, 'v_ids bigint[]; v_sans boolean; v_n integer;')}
${cas('evenements_filtres', `
    ok := (select count(*) >= 2 and bool_and(type = 'cycle_termine') from public.pilotage_evenements(null, 50, null, array['cycle_termine']))
      and (select bool_and(agent = 'essai_e2e_pl1') and bool_or(type = 'essai_fait') from public.pilotage_evenements(null, 50, 'essai_e2e_pl1', null));`)}
${cas('chef_cycles', `
    select cycles_jour = v_chef0 + 2 and modele = 'essai-modele-b' into ok from public.pilotage_chef();`)}
${cas('attention_sources', `
    ok := (select count(*) from public.pilotage_attention_sources()) = 6
      and (v_att1->>'taches_bloquees')::int = coalesce((v_att0->>'taches_bloquees')::int, 0) + 1
      and (v_att1->>'disjoncteur')::int = coalesce((v_att0->>'disjoncteur')::int, 0) + 1
      and (v_att1->>'decision_argent')::int = coalesce((v_att0->>'decision_argent')::int, 0) + 3
      and (v_att1->>'idee_chef')::int = coalesce((v_att0->>'idee_chef')::int, 0) + 1
      and (v_att1->>'escalade_chef')::int = coalesce((v_att0->>'escalade_chef')::int, 0)
      and v_att1 ? 'pause_generale';
    r := r || jsonb_build_object('diag_attention_sources', v_att0::text || ' -> ' || v_att1::text);`)}
${cas('code_trop_gros', `
    ok := public.pilotage_code_publier(jsonb_build_object('x', repeat('a', 25000))) = 'trop_gros';`)}
${cas('code_forme', `
    ok := public.pilotage_code_publier('[]'::jsonb) = 'forme';`)}
${cas('code_ok_relu', `
    -- deux instructions PL/pgSQL séparées (publier, PUIS lire), pas une seule expression combinée : Postgres fixe
    -- l'instantané de toute une expression avant de l'exécuter, la lecture stable n'y voit alors jamais l'écriture
    -- faite par le premier appel DANS LA MÊME expression, même en READ COMMITTED, même même transaction, même agent
    -- (026-076, correction du 28/09 — reproduit hors 0107 sur deux fonctions jetables sans rapport avec la migration).
    v_pub := public.pilotage_code_publier('{"essai": true, "n": 1}'::jsonb);
    select etat into v_lu from public.pilotage_code_lire();
    ok := v_pub = 'ok' and v_lu = '{"essai": true, "n": 1}'::jsonb;`, 'v_pub text; v_lu jsonb;')}
${refus('refus_anon_authenticated', ['public.pilotage_decisions(1)', 'public.pilotage_decision(gen_random_uuid())', "public.pilotage_decisions_par_cles(array['x'])", 'public.pilotage_agents()', 'public.pilotage_couts_agents(now())', 'public.pilotage_couts_taches(now(), 1)', 'public.pilotage_couts_modeles(now())', 'public.pilotage_chef()', 'public.pilotage_evenements(null, 1, null, null)', 'public.pilotage_attention_sources()', "public.pilotage_taches_agent('x', 1)", "public.pilotage_code_publier('{}'::jsonb)", 'public.pilotage_code_lire()'])}
  end;`

// ── echanges (0108, 026-079) : critère SE-9 ─────────────────────────────────────────────────────────────────────────────
const echanges = `
  declare
    v_minuit timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
    v_p uuid; v_pc uuid; v_pv uuid; v_e uuid[] := '{}'; v_hier uuid; v_vieux uuid;
    v_froids boolean;
  begin
${cas('preparation', `
    insert into ops.prospects (cle_dedup, siren, domaine, metier, commune, faits, source, froid) values ('siren:900000001', '900000001', 'essai-pilotage-un.invalid', 'Plombier', 'Lyon', '[]', 'essai', true) returning id into v_p;
    insert into ops.prospects (cle_dedup, siren, domaine, metier, commune, faits, source, froid) values ('siren:900000002', '900000002', 'essai-pilotage-deux.invalid', 'Peintre', 'Nantes', '[]', 'essai', false) returning id into v_pc;
    insert into ops.prospects (cle_dedup, siren, domaine, metier, commune, faits, source, froid) values ('siren:900000003', '900000003', 'essai-pilotage-trois.invalid', 'Maçon', 'Lille', '[]', 'essai', true) returning id into v_pv;
    -- garde_envois (0099) date tout envoi à now() à l'insertion : le temps d'antidater ceux d'hier et de 40 jours, les déclencheurs sont mis de côté
    set local session_replication_role = replica;
    for i in 1..3 loop
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, verdicts, prepare_par, prepare_le, envoye_le)
        values (v_p, 'essai_e2e', 'essai', case when i = 1 then 'premier_contact' else 'relance' end, 'essai' || i || '@essai-pilotage.invalid', repeat('a', 64), 'envoye',
                jsonb_build_object('j1', 'pass', 'j3', case when i = 2 then 'refus' else 'pass' end, 'second', null), 'facteur', now() - interval '10 minutes', now() - make_interval(mins => i))
        returning id into v_id;
      v_e := v_e || v_id;
    end loop;
    insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, verdicts, prepare_par, prepare_le, envoye_le)
      values (v_pc, 'essai_e2e', 'essai', 'premier_contact', 'hier@essai-pilotage.invalid', repeat('b', 64), 'envoye', '{}'::jsonb, 'facteur', v_minuit - interval '1 day', v_minuit - interval '20 hours') returning id into v_hier;
    insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, verdicts, prepare_par, prepare_le, envoye_le)
      values (v_pv, 'essai_e2e', 'essai', 'premier_contact', 'vieux@essai-pilotage.invalid', repeat('c', 64), 'envoye', '{}'::jsonb, 'facteur', now() - interval '41 days', now() - interval '40 days') returning id into v_vieux;
    set local session_replication_role = origin;
    select exists (select 1 from ops.envois e join ops.prospects p on p.id = e.prospect_id where p.froid and e.type = 'premier_contact' and e.statut = 'envoye' and e.canal <> 'essai_e2e') into v_froids;
    ok := cardinality(v_e) = 3;`, 'i integer; v_id uuid;')}
${cas('envois_du_jour', `
    ok := (select count(*) from public.pilotage_envois_du_jour() where id = any(v_e)) = 3
      and not exists (select 1 from public.pilotage_envois_du_jour() where id = v_hier)
      and (select bool_and(verdicts ? 'j1' and verdicts ? 'j3' and verdicts ? 'second') from public.pilotage_envois_du_jour() where id = any(v_e))
      and exists (select 1 from public.pilotage_envois_du_jour() where id = v_e[2] and verdicts->>'j3' = 'refus');`)}
${cas('compteurs_egaux', `
    ok := (select count(*) > 0 and bool_and(plafond = coalesce((public.acq_plafond_du_jour(canal)->>'envois')::integer, 0) and utilises = coalesce((public.acq_envois_du_jour(canal)->>'envois')::integer, 0)) from public.pilotage_compteurs_du_jour())
      and not exists (select 1 from public.pilotage_compteurs_du_jour() where canal = 'email');`)}
${cas('entonnoir', `
    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le) values ('essai_e2e:pilotage:auto', v_e[1], v_p, 'essai_e2e', 'essai', 'Réponse automatique d''absence', true, now());
    ok := exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_e[1] and froid and not repondu)
      and exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_hier and not froid)
      and not exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_vieux);`)}
${cas('bilan_vide', `
    if v_froids then
      ok := true;
      r := r || jsonb_build_object('diag_bilan_vide', 'branche sautée : des contacts froids réels sont déjà partis');
    else
      ${annule(`      delete from ops.reponses where prospect_id in (v_p, v_pc, v_pv);
      delete from ops.envois where id = v_vieux or id = any(v_e);
      ok := (select count(*) = 1 and bool_and(bilan_le is null and verdict is null and prolonge_jusqua is null) from public.pilotage_bilan_date())
        and (select count(*) = 0 from public.pilotage_bilan(100));
      v_ok := ok;`)}
      ok := v_ok;
    end if;`, 'v_ok boolean;')}
${cas('bilan_101', `
    ${annule(`    delete from ops.reponses where prospect_id in (v_p, v_pc, v_pv);
      delete from ops.envois where id = v_vieux or id = v_hier or id = any(v_e);
      set local session_replication_role = replica;
    for i in 1..101 loop
      insert into ops.prospects (cle_dedup, siren, domaine, metier, faits, source, froid) values ('domaine:bilan-' || i || '.invalid', null, 'bilan-' || i || '.invalid', 'Plombier', '[]', 'essai', true) returning id into v_id;
      insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, verdicts, prepare_par, prepare_le, envoye_le)
        values (v_id, 'essai_e2e', 'essai', 'premier_contact', 'b' || i || '@essai-pilotage.invalid', repeat('d', 64), 'envoye', '{}'::jsonb, 'facteur', now() - interval '30 days', now() - interval '29 days' + make_interval(secs => i)) returning id into v_id;
      v_b := v_b || v_id;
    end loop;
    set local session_replication_role = origin;
    update ops.etat_envoi set bilan_le = (now() at time zone 'Europe/Paris')::date;
    v_ok := (select bilan_le = (now() at time zone 'Europe/Paris')::date from public.pilotage_bilan_date())
      and (select count(*) = 100 from public.pilotage_bilan(100))
      and (v_froids or (select array_agg(id order by envoye_le) from public.pilotage_bilan(100)) = v_b[1:100]);`)}
    ok := v_ok;`, 'i integer; v_id uuid; v_b uuid[] := \'{}\'; v_ok boolean;')}
${cas('technologie_pause', `
    insert into ops.technologies (technologie, etat, pause_motif) values ('essai_e2e_techno', 'pause', 'essai de pause') on conflict (technologie) do update set etat = 'pause', pause_motif = 'essai de pause';
    ok := exists (select 1 from public.pilotage_compteurs_technologies() where technologie = 'essai_e2e_techno' and etat = 'pause' and pause_motif = 'essai de pause')
      and exists (select 1 from public.pilotage_etat_envoi() where 'essai_e2e_techno' = any(technologies_pause));`)}
${cas('appels_ordre', `
    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe, traitee_le) values ('essai_e2e:pilotage:appel', v_e[1], v_p, 'essai_e2e', 'essai', 'Rappelez-moi au 06 12 34 56 78 svp', false, now() - interval '1 day', 'appel', now()) returning id into v_rep;
    insert into ops.rendez_vous (prospect_id, creneau, telephone, statut, reserve_le) values (v_p, date_trunc('hour', now()) + interval '1 day', '0611223344', 'reserve', now()) returning id into v_r1;
    insert into ops.rendez_vous (prospect_id, creneau, telephone, statut, reserve_le) values (v_p, date_trunc('hour', now()) + interval '2 days', '0611223355', 'reserve', now()) returning id into v_r2;
    select array_agg(x.id order by x.n) into v_ids from (select a.id, row_number() over () as n from public.pilotage_appels(20) a) x where x.id in (v_rep, v_r1, v_r2);
    ok := v_ids = array[v_rep, v_r1, v_r2]
      and exists (select 1 from public.pilotage_appels(20) where id = v_r1 and source = 'rdv' and telephone = '0611223344' and contexte = 'Plombier · Lyon' and creneau is not null)
      and exists (select 1 from public.pilotage_appels(20) where id = v_rep and source = 'reponse' and regexp_replace(telephone, '\\D', '', 'g') = '0612345678');
    update ops.rendez_vous set appel_rendu_le = now() where id = v_r1;
    update ops.reponses set appel_rendu_le = now() where id = v_rep;
    ok := ok and not exists (select 1 from public.pilotage_appels(20) where id in (v_r1, v_rep)) and exists (select 1 from public.pilotage_appels(20) where id = v_r2);`, 'v_rep uuid; v_r1 uuid; v_r2 uuid; v_ids uuid[];')}
${cas('appel_sans_numero', `
    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe) values ('essai_e2e:pilotage:appel2', v_e[2], v_p, 'essai_e2e', 'essai', 'Appelez-moi demain matin', false, now(), 'appel') returning id into v_rep;
    ok := exists (select 1 from public.pilotage_appels(20) where id = v_rep and telephone is null);`, 'v_rep uuid;')}
${cas('reponses_du_jour', `
    select coalesce(jsonb_object_agg(classe, nombre), '{}') into v_avant from public.pilotage_reponses_du_jour();
    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe) values
      ('essai_e2e:pilotage:prix1', v_e[1], v_p, 'essai_e2e', 'essai', 'Combien ?', false, now(), 'prix'),
      ('essai_e2e:pilotage:prix2', v_e[2], v_p, 'essai_e2e', 'essai', 'Quel prix ?', false, now(), 'prix'),
      ('essai_e2e:pilotage:lire', v_e[3], v_p, 'essai_e2e', 'essai', 'Bonjour', false, now(), null),
      ('essai_e2e:pilotage:hier', v_e[3], v_p, 'essai_e2e', 'essai', 'Hier', false, v_minuit - interval '2 hours', 'prix');
    select coalesce(jsonb_object_agg(classe, nombre), '{}') into v_apres from public.pilotage_reponses_du_jour();
    ok := coalesce((v_apres->>'prix')::int, 0) = coalesce((v_avant->>'prix')::int, 0) + 2 and coalesce((v_apres->>'a_lire')::int, 0) = coalesce((v_avant->>'a_lire')::int, 0) + 1;`, 'v_avant jsonb; v_apres jsonb;')}
${cas('etat_envoi', `
    perform public.ops_evenement_ajouter('systeme', 'mesure_a_sec', 'essai', 'PASS mesure à sec d''essai', null);
    ok := (select count(*) = 1 from public.pilotage_etat_envoi())
      and (select envoi_froid = (select actif from ops.interrupteurs where nom = 'envoi_froid') and mesure_a_sec from public.pilotage_etat_envoi());`)}
${cas('vente_froide', `
    v_n0 := public.acq_ventes_froides(now() - interval '60 days');
    insert into public.sites_commandes (email, matiere, etat, prix_cents, paye_le) values ('essai1@essai-pilotage.invalid', '{"siren": "900000001"}'::jsonb, 'payee', 30000, now());
    insert into public.sites_commandes (email, matiere, etat, prix_cents, paye_le) values ('essai2@essai-pilotage.invalid', '{"siren": "900000002"}'::jsonb, 'payee', 30000, now());
    insert into public.sites_commandes (email, matiere, etat, prix_cents) values ('essai3@essai-pilotage.invalid', '{"siren": "900000003"}'::jsonb, 'brouillon', 30000);
    ok := exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_e[1] and vente)
      and not exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_hier and vente and froid)
      and public.acq_ventes_froides(now() - interval '60 days') = v_n0 + 1
      and exists (select 1 from public.pilotage_recettes_agents(now() - interval '1 day') where source = 'agents' and commandes >= 1)
      and exists (select 1 from public.pilotage_recettes_agents(now() - interval '1 day') where source = 'hors_agents' and commandes >= 1)
      and (select nombre >= 1 from public.pilotage_tapis(v_minuit) where etape = 'paye');`, 'v_n0 bigint;')}
${cas('tapis_dix_lignes', `
    select array_agg(x.etape order by x.n) into v_etapes from (select t.etape, row_number() over () as n from public.pilotage_tapis(v_minuit) t) x;
    ok := v_etapes = array['trouve', 'verifie', 'maquette', 'contacte', 'repondu', 'oui', 'paye', 'en_ligne', 'rejet', 'juges'];`, 'v_etapes text[];')}
${cas('sans_texte', `
    ok := not exists (select 1 from jsonb_object_keys((select to_jsonb(x) from public.pilotage_envois_du_jour() x limit 1)) k where k ~ '^(texte|destinataire|entreprise)');`)}
${refus('refus_anon_authenticated', ['public.pilotage_envois_du_jour()', 'public.pilotage_compteurs_du_jour()', 'public.pilotage_compteurs_technologies()', 'public.pilotage_entonnoir(now())', 'public.pilotage_bilan_date()', 'public.pilotage_bilan(1)', 'public.pilotage_appels(1)', 'public.pilotage_etat_envoi()', 'public.pilotage_reponses_du_jour()', 'public.pilotage_tapis(now())', 'public.pilotage_recettes_agents(now())', 'public.pilotage_atelier(now())', 'public.pilotage_reponses_recentes(1)'])}
  end;`

// ── station (0112, 026-088) : critères SS-10, SS-13 et SS-15 (clés ss15_) ──────────────────────────────────────────────
const station = `
  declare
    v_jour text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
    v_f uuid; v_nf uuid := gen_random_uuid(); v_r uuid; v_ev bigint;
    v_idee text; v_cles_ok boolean;
    v_lignes5 text[] := array['Ligne une', 'Ligne deux', 'Ligne trois', 'Ligne quatre', 'Ligne cinq'];
  begin
${cas('preparation', `
    select id into v_f from public.artisans where is_founder limit 1;
    if v_f is null then raise exception 'aucun fondateur dans artisans : le scénario ne peut pas tourner'; end if;
    update ops.interrupteurs set actif = false where nom = 'pause_generale';
    if not exists (select 1 from ops.agents where nom = 'chef') then
      perform public.ops_agent_enregistrer('chef', 'Chef', array['chef'], array[]::text[], array['evenements', 'decisions'], 30, 60, 0, 0);
    end if;
    update ops.agents set en_pause = false where nom = 'chef';
    if not exists (select 1 from ops.agents where nom = 'facteur') then
      perform public.ops_agent_enregistrer('facteur', 'Facteur', array['envoyer'], array[]::text[], array['evenements'], 10, 60, 0, 0);
    end if;
    perform public.ops_agent_enregistrer('essai_e2e_st', 'Essai station', array['essai'], array[]::text[], array['evenements', 'decisions'], 10, 60, 0, 0);
    perform public.ops_agent_enregistrer('essai_e2e_sp', 'Essai sans capacité', array['essai'], array[]::text[], array['evenements'], 10, 60, 0, 0);
    perform public.ops_agent_enregistrer('essai_e2e_pp', 'Essai pause', array['pause'], array[]::text[], array['evenements'], 10, 60, 0, 0);
    perform public.ops_agent_enregistrer('essai_e2e_pc', 'Essai consigne', array['consigne'], array[]::text[], array['evenements'], 10, 60, 0, 0);
    v_idee := 'chef:' || v_jour || ':idee-essai-station';
    perform public.ops_decision_creer('chef', 'Idée d''essai du Chef', 'Contexte', ${OPTIONS}, 'oui', null, 'aucune', now() + interval '2 days', v_idee, null);
    perform public.ops_decision_creer('essai_e2e_st', 'Idée étrangère', 'Contexte', ${OPTIONS}, 'oui', null, 'aucune', now() + interval '2 days', 'chef:' || v_jour || ':idee-etrangere', null);
    ok := true;`)}
${cas('consigne_non_fondateur', leve(`perform public.station_consigne_transmettre('Consigne d''essai', v_nf, null)`, 'ops:auteur'))}
${cas('consigne_fondateur', `
    v_ev := public.station_consigne_transmettre('Consigne d''essai exacte', v_f, null);
    ok := exists (select 1 from ops.evenements where id = v_ev and type = 'consigne' and resume = 'Consigne d''essai exacte' and objet = 'fondateur');`)}
${cas('consigne_adressee_facteur', `
    v_ev := public.station_consigne_transmettre('Consigne pour le facteur', v_f, 'facteur');
    ok := (select objet from ops.evenements where id = v_ev) = 'agent:facteur';`)}
${cas('consigne_agent_inconnu', leve(`perform public.station_consigne_transmettre('Consigne perdue', v_f, 'essai_e2e_inconnu')`, 'ops:agent_inconnu'))}
${cas('consigne_201_signes', leve(`perform public.station_consigne_transmettre(repeat('a', 201), v_f, null)`, 'ops:texte'))}
${cas('consigne_quota', `
    ${annule(`    select count(*) into n from ops.evenements where type = 'consigne' and (le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date;
    for i in 1..greatest(0, 20 - n) loop perform public.station_consigne_transmettre('Consigne de quota ' || i, v_f, case when i % 2 = 0 then 'facteur' else null end); end loop;
    begin
      perform public.station_consigne_transmettre('La vingt et unième', v_f, null);
      v_ok := false;
    exception when others then v_ok := sqlerrm like '%ops:quota%';
    end;`)}
    ok := v_ok;`, 'n integer; i integer; v_ok boolean;')}
${cas('reunion_agent_pont', leve(`perform public.station_reunion_ouvrir('pont')`, 'ops:agent'))}
${cas('reunion_ouverte', `
    v_r := public.station_reunion_ouvrir('chef');
    ok := v_r is not null and exists (select 1 from ops.evenements where type = 'reunion_ouverte' and agent = 'chef' and objet = v_r::text);`)}
${cas('reunion_deja_ouverte', leve(`perform public.station_reunion_ouvrir('chef')`, 'ops:deja_ouverte'))}
${cas('reunion_six_lignes', leve(`perform public.station_reunion_clore(v_r, 'chef', v_lignes5 || 'Ligne six'::text, null, '{}')`, 'ops:lignes'))}
${cas('reunion_ligne_arobase', leve(`perform public.station_reunion_clore(v_r, 'chef', array['Écrire à quelqu''un@exemple.invalid'], null, '{}')`, 'ops:lignes'))}
${cas('reunion_idee_etrangere', leve(`perform public.station_reunion_clore(v_r, 'chef', array['Une ligne'], null, array['chef:' || v_jour || ':idee-etrangere'])`, 'ops:idees'))}
${cas('reunion_close', `
    v_ev := coalesce((select max(id) from ops.evenements), 0);
    ok := public.station_reunion_clore(v_r, 'chef', v_lignes5, '{"libelle": "Objectif d''essai", "mesure": "oui", "cible": 3}'::jsonb, array[v_idee]);
    ok := ok and (select count(*) = 5 from ops.evenements where id > v_ev and type = 'reunion_compte_rendu' and objet = v_r::text)
      and (select max(id) from ops.evenements where id > v_ev and type = 'reunion_close') > (select max(id) from ops.evenements where id > v_ev and type = 'reunion_compte_rendu');`)}
${cas('reunion_deja_tenue', leve(`perform public.station_reunion_ouvrir('chef')`, 'ops:deja_tenue'))}
${cas('objectif_actif', `
    ok := exists (select 1 from public.station_objectif_actif() where libelle = 'Objectif d''essai' and mesure = 'oui' and cible = 3);`)}
${cas('reunion_echue', `
    ${annule(`    delete from ops.reunions;
    v_id := public.station_reunion_ouvrir('chef');
    update ops.reunions set ouverte_le = now() - interval '31 minutes' where id = v_id;
    v_n := public.station_reunions_echues_abandonner();
    v_ok := v_n = 1
      and exists (select 1 from ops.evenements where type = 'reunion_abandonnee' and objet = v_id::text)
      and (select statut = 'abandonnee' from ops.reunions where id = v_id);`)}
    ok := v_ok;`, 'v_id uuid; v_ok boolean; v_n integer;')}
${cas('experience_lancer', `
    ${annule(`    if exists (select 1 from public.sites_commandes where etat <> 'brouillon') then
      v_id := public.station_experience_lancer('Expérience d''essai', 0, v_f);
      begin perform public.station_experience_lancer('Seconde expérience', 0, v_f); v_ok := false;
      exception when others then v_ok := v_id is not null and sqlerrm like '%ops:deja_en_cours%'; end;
      v_branche := 'une vente existe : lancée puis ops:deja_en_cours';
    else
      begin perform public.station_experience_lancer('Expérience d''essai', 0, v_f); v_ok := false;
      exception when others then v_ok := sqlerrm like '%ops:aucune_vente%'; end;
      v_branche := 'aucune vente : ops:aucune_vente';
    end if;
    v_ok := v_ok and (select count(*) = 1 from public.station_experience_etat());`)}
    ok := v_ok;
    r := r || jsonb_build_object('diag_experience_lancer', v_branche);`, 'v_id uuid; v_ok boolean; v_branche text;')}
${cas('experiences_echues', `
    ${annule(`    insert into ops.experiences (nom, debut_le, fin_prevue_le, gains_eur) values ('Essai sans gain', now() - interval '31 days', now() - interval '1 day', 0) returning id into v_a;
    v_n := public.station_experiences_echues_arreter();
    v_ok := v_n = 1 and (select statut = 'arretee_auto' from ops.experiences where id = v_a);
    insert into ops.experiences (nom, debut_le, fin_prevue_le, gains_eur) values ('Essai gagnant', now() - interval '31 days', now() - interval '1 day', 5) returning id into v_b;
    v_n := public.station_experiences_echues_arreter();
    v_ok := v_ok and v_n = 1 and (select statut = 'gagnante' from ops.experiences where id = v_b)
      and (select count(*) = 1 from public.station_experience_etat());`)}
    ok := v_ok;`, 'v_a uuid; v_b uuid; v_ok boolean; v_n integer;')}
${cas('experience_etat_une_ligne', `
    ok := (select count(*) = 1 from public.station_experience_etat());`)}
${cas('chiffres_sans_texte', `
    ok := octet_length(public.station_reunion_chiffres()::text) <= 8192
      and not exists (select 1 from jsonb_path_query(public.station_reunion_chiffres(), 'strict $.**') v where jsonb_typeof(v) = 'string' and v #>> '{}' !~ '^[a-z0-9_]{2,40}$' and v #>> '{}' !~ '^\\d{4}-\\d{2}-\\d{2}');`)}
${cas('ss15_pause_sans_capacite', leve(`perform public.station_pause_par_agent('essai_e2e_sp', 'Motif d''essai')`, 'ops:agent'))}
${cas('ss15_pause_motif_court', leve(`perform public.station_pause_par_agent('essai_e2e_pp', 'ab')`, 'ops:motif'))}
${cas('ss15_pause_posee', `
    ${annule(`    update ops.interrupteurs set actif = false where nom = 'pause_generale';
    v_ev := coalesce((select max(id) from ops.evenements), 0);
    v_p := public.station_pause_par_agent('essai_e2e_pp', 'Motif d''essai');
    v_ok := v_p
      and (select actif from ops.interrupteurs where nom = 'pause_generale')
      and exists (select 1 from ops.evenements where id > v_ev and type = 'interrupteur' and agent = 'essai_e2e_pp');
    v_n := (select count(*) from ops.evenements where id > v_ev);
    v_p := public.station_pause_par_agent('essai_e2e_pp', 'Motif d''essai');
    v_ok := v_ok and not v_p and (select count(*) from ops.evenements where id > v_ev) = v_n;`)}
    ok := v_ok;`, 'v_ok boolean; v_n bigint; v_p boolean;')}
${cas('ss15_consigne_sans_capacite', leve(`perform public.station_consigne_par_agent('essai_e2e_sp', 'Texte d''essai', 'chef')`, 'ops:agent'))}
${cas('ss15_consigne_pont', `
    ${annule(`    v_ev := public.station_consigne_par_agent('essai_e2e_pc', 'Consigne du pont', 'chef');
    v_ok := exists (select 1 from ops.evenements where id = v_ev and type = 'consigne' and objet = 'agent:chef');`)}
    ok := v_ok;`, 'v_ok boolean;')}
${cas('ss15_quota_commun', `
    ${annule(`    select count(*) into n from ops.evenements where type = 'consigne' and (le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date;
    for i in 1..greatest(0, 19 - n) loop perform public.station_consigne_transmettre('Consigne ' || i, v_f, null); end loop;
    perform public.station_consigne_par_agent('essai_e2e_pc', 'La vingtième, du pont', 'chef');
    begin perform public.station_consigne_par_agent('essai_e2e_pc', 'La vingt et unième', 'chef'); v_ok := false;
    exception when others then v_ok := sqlerrm like '%ops:quota%'; end;
    v_ok := v_ok and n <= 19;`)}
    ok := v_ok;`, 'n integer; i integer; v_ok boolean;')}
${refus('ss15_refus_anon', ["public.station_pause_par_agent('x', 'motif')", "public.station_consigne_par_agent('x', 'texte', 'chef')"])}
${refus('refus_anon_authenticated', ["public.station_consigne_transmettre('x', gen_random_uuid(), null)", "public.station_reunion_ouvrir('chef')", "public.station_reunion_clore(gen_random_uuid(), 'chef', array['x'], null, '{}')", "public.station_reunion_abandonner(gen_random_uuid(), 'chef', 'motif')", 'public.station_reunions_echues_abandonner()', "public.station_experience_lancer('x', 0, gen_random_uuid())", "public.station_experience_arreter(gen_random_uuid(), gen_random_uuid(), 'motif')", 'public.station_experiences_echues_arreter()', 'public.station_reunion_chiffres()', 'public.station_reunion_lire(1)', 'public.station_objectif_actif()', 'public.station_experience_etat()'])}
  end;`

// ── reglages (0113, 026-175) : critère SR-9 ─────────────────────────────────────────────────────────────────────────────
const reglages = `
  declare
    v_f uuid; v_nf uuid := gen_random_uuid(); v_v integer;
  begin
${cas('preparation', `
    select id into v_f from public.artisans where is_founder limit 1;
    if v_f is null then raise exception 'aucun fondateur dans artisans : le scénario ne peut pas tourner'; end if;
    ok := true;`)}
${cas('lecture_par_defaut', `
    ok := (select count(*) = 1 and bool_and(version = 0 and reglages = '{}'::jsonb) from public.station_reglages_lire());`)}
${cas('ecriture_v1_v2', `
    -- Une instruction par étape (correction du 30/09, 026-175) : dans UNE seule expression, les lectures ne voient pas ce que la
    -- fonction volatile écrit pendant la même requête (instantané de la requête) ; le cas rendait false sur une migration juste.
    v_v := public.station_reglages_ecrire('{"theme": "station"}'::jsonb, v_f, 0);
    v_v2 := public.station_reglages_ecrire('{"theme": "vaisseau", "nuit": {"auto": true}}'::jsonb, v_f, 1);
    select version, reglages, modifie_par into v_lu from public.station_reglages_lire();
    select count(*) into v_n from ops.station_reglages_historique;
    ok := v_v = 1 and v_v2 = 2 and v_lu.version = 2 and v_lu.reglages->>'theme' = 'vaisseau' and v_lu.modifie_par = v_f and v_n = 2;`, 'v_v2 integer; v_lu record; v_n integer;')}
${cas('version_perimee', leve(`perform public.station_reglages_ecrire('{"theme": "station"}'::jsonb, v_f, 1)`, 'ops:version_perimee'))}
${cas('cle_inconnue', leve(`perform public.station_reglages_ecrire('{"inconnue": 1}'::jsonb, v_f, 2)`, 'ops:cle_inconnue'))}
${cas('trop_gros', leve(`perform public.station_reglages_ecrire(jsonb_build_object('theme', repeat('a', 70000)), v_f, 2)`, 'ops:trop_gros'))}
${cas('non_fondateur', leve(`perform public.station_reglages_ecrire('{"theme": "station"}'::jsonb, v_nf, 2)`, 'ops:auteur'))}
${cas('historique_cinquante', `
    ${annule(`    select version into v from public.station_reglages_lire();
    for i in 1..51 loop v := public.station_reglages_ecrire(jsonb_build_object('affichage', jsonb_build_object('n', i)), v_f, v); end loop;
    v_ok := (select count(*) = 50 from ops.station_reglages_historique) and (select max(version) = v from ops.station_reglages_historique);`)}
    ok := v_ok;`, 'v integer; i integer; v_ok boolean;')}
${cas('radar_sans_nom', `
    ok := jsonb_typeof(public.pilotage_radar()) = 'object'
      and not exists (select 1 from jsonb_path_query(public.pilotage_radar(), 'strict $.**') v where jsonb_typeof(v) = 'object' and (v ? 'nom' or v ? 'email' or v ? 'telephone' or v ? 'prenom'));`)}
${cas('departements_agreges', `
    ok := (select count(*) >= 0 from public.pilotage_prospects_departements())
      and not exists (select 1 from public.pilotage_prospects_departements() where departement !~ '^(\\d{2}|2A|2B|\\d{3}|inconnu)$');`)}
${cas('salles_fermees', `
    ok := not exists (select 1 from public.pilotage_activite_salles(now() - interval '1 day') where salle not in (${SALLES_SQL}) or salle = 'ecommerce');`)}
${refus('refus_anon_authenticated', ['public.station_reglages_lire()', "public.station_reglages_ecrire('{}'::jsonb, gen_random_uuid(), 0)", 'public.pilotage_radar()', 'public.pilotage_prospects_departements()', 'public.pilotage_activite_salles(now())'])}
  end;`


export const SCENARIOS = { lecture, echanges, station, reglages }
export const APRES = {
  lecture: "select to_regprocedure('public.pilotage_decisions(integer)') is null as rien_ne_reste",
  echanges: "select to_regprocedure('public.pilotage_tapis(timestamptz)') is null as rien_ne_reste",
  station: "select to_regclass('ops.reunions') is null as rien_ne_reste",
  reglages: "select to_regclass('ops.station_reglages') is null as rien_ne_reste",
}
