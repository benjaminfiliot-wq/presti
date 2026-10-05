-- Scénario de l'essai à sec de 0131 (DO + raise exception final : rien n'est commité). Placé APRÈS le texte de 0131.
do $essai$
declare f uuid; r jsonb := '{}'::jsonb; x jsonb; j date := (ops.maintenant() at time zone 'Europe/Paris')::date;
begin
 select id into f from public.artisans where is_founder limit 1;
 r := r || jsonb_build_object('A0_etat_initial', jsonb_build_object('froid', (select actif from ops.interrupteurs where nom='envoi_froid'), 'palier', (select palier from ops.etat_envoi where id), 'epreuve_events', (select count(*) from ops.evenements where type='epreuve_bout_en_bout'), 'mesure_pass', exists(select 1 from ops.evenements where type='mesure_a_sec' and resume like 'PASS%'), 'notice', (select notice_verifiee_le from ops.etat_envoi where id), 'jour_ouvre', extract(isodow from j) between 1 and 5));

 -- A1 : ouverture par un fondateur, notice fraîche + mesure PASS, SANS épreuve : OK (puis annulée).
 begin
  x := public.acq_envoi_froid_ouvrir(f);
  r := r || jsonb_build_object('A1_ouverture_sans_epreuve', x, 'A1_interrupteur_actif', (select actif from ops.interrupteurs where nom='envoi_froid'), 'A1_palier', (select palier from ops.etat_envoi where id),
    'A1_plafond_formulaire_jour_nouveaux', (select plafond_jour||'/'||plafond_nouveaux_jour from ops.quotas_canaux where canal='formulaire_site' and envoyeur='*'),
    'A1_evenement_ouvert', exists(select 1 from ops.evenements where type='envoi_froid_ouvert' and le>=now()-interval '1 minute'));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('A1_ERREUR', sqlerrm); end if; end;
 r := r || jsonb_build_object('A1_apres_annulation_ferme', (select not actif from ops.interrupteurs where nom='envoi_froid'));

 -- A2 : refus ops:auteur (inconnu, null, non-fondateur).
 begin perform public.acq_envoi_froid_ouvrir(gen_random_uuid()); r := r || jsonb_build_object('A2_inconnu', 'AUCUN REFUS'); exception when others then r := r || jsonb_build_object('A2_inconnu', sqlerrm); end;
 begin perform public.acq_envoi_froid_ouvrir(null); r := r || jsonb_build_object('A2_null', 'AUCUN REFUS'); exception when others then r := r || jsonb_build_object('A2_null', sqlerrm); end;
 begin
  perform public.acq_envoi_froid_ouvrir((select id from public.artisans where not is_founder limit 1));
  r := r || jsonb_build_object('A2_non_fondateur', 'AUCUN REFUS');
 exception when others then r := r || jsonb_build_object('A2_non_fondateur', sqlerrm); end;

 -- A3 : notice absente, puis périmée (8 jours), puis fraîche (6 jours : ouvre).
 begin update ops.etat_envoi set notice_verifiee_le = null where id; perform public.acq_envoi_froid_ouvrir(f); r := r || jsonb_build_object('A3_notice_nulle', 'AUCUN REFUS'); exception when others then r := r || jsonb_build_object('A3_notice_nulle', sqlerrm); end;
 begin update ops.etat_envoi set notice_verifiee_le = ops.maintenant() - interval '8 days' where id; perform public.acq_envoi_froid_ouvrir(f); r := r || jsonb_build_object('A3_notice_8_jours', 'AUCUN REFUS'); exception when others then r := r || jsonb_build_object('A3_notice_8_jours', sqlerrm); end;
 begin update ops.etat_envoi set notice_verifiee_le = ops.maintenant() - interval '6 days' where id; x := public.acq_envoi_froid_ouvrir(f); r := r || jsonb_build_object('A3_notice_6_jours_ouvre', x); raise exception 'rb'; exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('A3_notice_6_jours', sqlerrm); end if; end;

 -- A4 : mesure à sec absente (l'événement est renommé dans la transaction), puis en échec (FAIL).
 begin
  alter table ops.evenements disable trigger evenements_ajout_seul;
  update ops.evenements set type = 'mesure_a_sec_x' where type = 'mesure_a_sec';
  perform public.acq_envoi_froid_ouvrir(f);
  r := r || jsonb_build_object('A4_mesure_absente', 'AUCUN REFUS');
 exception when others then r := r || jsonb_build_object('A4_mesure_absente', sqlerrm); end;
 begin
  alter table ops.evenements disable trigger evenements_ajout_seul;
  update ops.evenements set resume = 'FAIL (essai)' where type = 'mesure_a_sec';
  perform public.acq_envoi_froid_ouvrir(f);
  r := r || jsonb_build_object('A4_mesure_fail', 'AUCUN REFUS');
 exception when others then r := r || jsonb_build_object('A4_mesure_fail', sqlerrm); end;

 -- B : la MONTÉE. palier_depuis 14 jours plus tôt (>= 5 jours ouvrés), aucun signal rouge.
 -- B1 : froid ouvert, SANS épreuve : la montée P0 -> P1 est retenue, événement d'attente.
 begin
  perform public.acq_envoi_froid_ouvrir(f);
  update ops.etat_envoi set palier_depuis = j - 14 where id;
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B1_sans_epreuve_palier', (select palier from ops.etat_envoi where id), 'B1_evenement_attente', exists(select 1 from ops.evenements where type='palier_attente_epreuve' and le>=now()-interval '1 minute'), 'B1_evenement_monte', exists(select 1 from ops.evenements where type='palier_monte' and le>=now()-interval '1 minute'), 'B1_plafond', (select plafond_jour from ops.quotas_canaux where canal='formulaire_site' and envoyeur='*'));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B1_ERREUR', sqlerrm); end if; end;
 -- B2 : froid ouvert, épreuve PASS de moins de 30 jours : P0 -> P1 (10 par jour).
 begin
  perform public.acq_envoi_froid_ouvrir(f);
  update ops.etat_envoi set palier_depuis = j - 14 where id;
  insert into ops.evenements(agent,type,resume) values('systeme','epreuve_bout_en_bout','PASS (essai à sec)');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B2_avec_epreuve_palier', (select palier from ops.etat_envoi where id), 'B2_evenement_monte', exists(select 1 from ops.evenements where type='palier_monte' and le>=now()-interval '1 minute'), 'B2_plafond', (select plafond_jour from ops.quotas_canaux where canal='formulaire_site' and envoyeur='*'));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B2_ERREUR', sqlerrm); end if; end;
 -- B3 : épreuve PASS vieille de 31 jours : retenue.
 begin
  perform public.acq_envoi_froid_ouvrir(f);
  update ops.etat_envoi set palier_depuis = j - 14 where id;
  insert into ops.evenements(agent,type,resume,le) values('systeme','epreuve_bout_en_bout','PASS (essai à sec)', ops.maintenant() - interval '31 days');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B3_epreuve_31_jours_palier', (select palier from ops.etat_envoi where id));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B3_ERREUR', sqlerrm); end if; end;
 -- B4 : épreuve en échec (FAIL) : retenue.
 begin
  perform public.acq_envoi_froid_ouvrir(f);
  update ops.etat_envoi set palier_depuis = j - 14 where id;
  insert into ops.evenements(agent,type,resume) values('systeme','epreuve_bout_en_bout','FAIL (essai à sec)');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B4_epreuve_fail_palier', (select palier from ops.etat_envoi where id));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B4_ERREUR', sqlerrm); end if; end;
 -- B5 : épreuve PASS mais envoi à froid FERMÉ : retenue (la montée suppose l'ouverture).
 begin
  update ops.etat_envoi set palier_depuis = j - 14 where id;
  insert into ops.evenements(agent,type,resume) values('systeme','epreuve_bout_en_bout','PASS (essai à sec)');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B5_froid_ferme_palier', (select palier from ops.etat_envoi where id), 'B5_froid', (select actif from ops.interrupteurs where nom='envoi_froid'));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B5_ERREUR', sqlerrm); end if; end;
 -- B6 : P1 -> P2 sans épreuve (retenue) puis avec (montée).
 begin
  update ops.interrupteurs set actif = true where nom = 'envoi_froid';
  update ops.etat_envoi set palier = 'P1', palier_depuis = j - 14 where id;
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B6_P1_sans_epreuve', (select palier from ops.etat_envoi where id));
  insert into ops.evenements(agent,type,resume) values('systeme','epreuve_bout_en_bout','PASS (essai à sec)');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B6_P1_avec_epreuve', (select palier from ops.etat_envoi where id));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B6_ERREUR', sqlerrm); end if; end;
 -- B7 : P2 -> P3 (bilan favorable simulé : acq_ventes_froides remplacée par 1 DANS la transaction) sans épreuve (retenue), puis avec.
 begin
  execute 'create or replace function public.acq_ventes_froides(p_depuis timestamptz) returns integer language sql as $f$ select 1 $f$';
  update ops.interrupteurs set actif = true where nom = 'envoi_froid';
  update ops.etat_envoi set palier = 'P2', palier_depuis = j - 14, bilan_le = j - 1, p2_prolonge_jusqua = null, bilan_verdict = null where id;
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B7_P2_sans_epreuve', (select palier||'/'||coalesce(bilan_verdict,'-') from ops.etat_envoi where id), 'B7_froid_encore_ouvert', (select actif from ops.interrupteurs where nom='envoi_froid'), 'B7_evenement_attente', exists(select 1 from ops.evenements where type='palier_attente_epreuve' and le>=now()-interval '1 minute'));
  insert into ops.evenements(agent,type,resume) values('systeme','epreuve_bout_en_bout','PASS (essai à sec)');
  perform public.acq_palier_evaluer();
  r := r || jsonb_build_object('B7_P2_avec_epreuve', (select palier||'/'||coalesce(bilan_verdict,'-') from ops.etat_envoi where id));
  raise exception 'rb';
 exception when others then if sqlerrm <> 'rb' then r := r || jsonb_build_object('B7_ERREUR', sqlerrm); end if; end;

 -- C : droits (anon et authenticated refusés sur les deux fonctions).
 r := r || jsonb_build_object('C_droits', jsonb_build_object(
   'ouvrir_service_role', has_function_privilege('service_role','public.acq_envoi_froid_ouvrir(uuid)','execute'), 'ouvrir_anon', has_function_privilege('anon','public.acq_envoi_froid_ouvrir(uuid)','execute'), 'ouvrir_auth', has_function_privilege('authenticated','public.acq_envoi_froid_ouvrir(uuid)','execute'),
   'evaluer_service_role', has_function_privilege('service_role','public.acq_palier_evaluer()','execute'), 'evaluer_anon', has_function_privilege('anon','public.acq_palier_evaluer()','execute'), 'evaluer_auth', has_function_privilege('authenticated','public.acq_palier_evaluer()','execute')));
 raise exception 'ESSAI-0131 %', r::text;
end $essai$;
