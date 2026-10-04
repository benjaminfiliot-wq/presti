\set ON_ERROR_STOP 0
set client_min_messages = notice;
-- données communes
insert into public.artisans (id, is_founder, email) values ('00000000-0000-0000-0000-00000000f001', true, 'fond@essai.invalid') on conflict do nothing;
insert into ops.conversations (plateforme, meta_id, dernier_message_recu_le) values ('instagram', 'conv-essai-1', now()) on conflict do nothing;

create or replace function pg_temp.mk(p_dest text, p_modele text default 'm1', p_fait text default 'f1', p_canal text default 'messagerie', p_type text default 'reponse', p_prospect uuid default null) returns uuid
language plpgsql as $$
declare v_id uuid; v_conv uuid; v_txt text := 'texte ' || gen_random_uuid()::text; v_emp text;
begin
  v_emp := encode(extensions.digest(v_txt, 'sha256'), 'hex');
  select id into v_conv from ops.conversations where meta_id = 'conv-essai-1';
  insert into ops.envois (prospect_id, conversation_id, canal, envoyeur, type, destinataire, empreinte_texte, texte, modele_id, fait_id)
  values (p_prospect, case when p_prospect is null then v_conv end, p_canal, 'repondeur', p_type, p_dest, v_emp, v_txt, p_modele, p_fait) returning id into v_id;
  update ops.envois set statut = 'attend_accord_benj', verdicts = '{"j1":"ok","j2":"ok","j3":"ok"}', approuve_par_agent = 'facteur' where id = v_id;
  insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, expire_le)
  select id, canal, destinataire, empreinte_texte, '00000000-0000-0000-0000-00000000f001', now() + interval '23 hours' from ops.envois where id = v_id;
  update ops.envois set statut = 'approuve' where id = v_id;
  return v_id;
end $$;

create or replace function pg_temp.cle(p_dest text, p_modele text default 'm1', p_fait text default 'f1') returns text language sql as $$ select ops.cle_envoi(p_dest, p_modele, p_fait) $$;
create or replace function pg_temp.st(p_id uuid) returns text language sql as $$ select statut || coalesce(' cle=' || left(cle_envoi,6), ' cle=null') || ' t=' || tentatives_envoi from ops.envois where id = p_id $$;
create or replace function pg_temp.ok(p_nom text, p_cond boolean, p_detail text default '') returns void language plpgsql as $$ begin raise notice '% % %', case when p_cond then 'OK  ' else 'ÉCHEC' end, p_nom, p_detail; end $$;

-- T0 la clé : valeur connue
select pg_temp.ok('T0 cle_envoi = sha256(a@b.fr|m1|f1)', ops.cle_envoi('  A@B.fr ', 'm1', 'f1') = encode(extensions.digest('a@b.fr|m1|f1', 'sha256'), 'hex'));
select pg_temp.ok('T0b sans fait', ops.cle_envoi('a@b.fr', 'm1', null) = encode(extensions.digest('a@b.fr|m1|sans_fait', 'sha256'), 'hex'));

do $$
declare a uuid; b uuid; c uuid; r jsonb; msg text;
begin
  a := pg_temp.mk('dest-a'); 
  raise notice 'a approuve : %', pg_temp.st(a);
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-a'));
  perform pg_temp.ok('T1 réserver', r = '{"ok":true}'::jsonb and (select statut from ops.envois where id=a) = 'en_cours_envoi', r::text || ' ' || pg_temp.st(a));
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-a'));
  perform pg_temp.ok('T2 re-réserver => deja_reserve', r ->> 'raison' = 'deja_reserve', r::text);
  r := public.acq_envoi_reserver(a, 'xyz');
  perform pg_temp.ok('T2b clé mal formée => cle', r ->> 'raison' = 'cle', r::text);
  r := public.acq_envoi_reserver(gen_random_uuid(), pg_temp.cle('q'));
  perform pg_temp.ok('T2c introuvable', r ->> 'raison' = 'introuvable', r::text);
  -- doublon de clé venu d'une autre ligne
  b := pg_temp.mk('dest-a');
  r := public.acq_envoi_reserver(b, pg_temp.cle('dest-a'));
  perform pg_temp.ok('T5 même (dest,modèle,fait) autre ligne => deja_reserve, reste approuve', r ->> 'raison' = 'deja_reserve' and (select statut from ops.envois where id=b) = 'approuve', r::text || ' ' || pg_temp.st(b));
  -- consignation
  r := public.acq_envoi_envoye(a, '{"id_externe":"mid-1","entetes":{"Message-ID":"x"}}'::jsonb);
  perform pg_temp.ok('T3 consigner => envoye', r = '{"ok":true}'::jsonb and (select statut from ops.envois where id=a) = 'envoye', r::text || ' ' || pg_temp.st(a));
  r := public.acq_envoi_envoye(a, '{}'::jsonb);
  perform pg_temp.ok('T3b consigner deux fois => statut (pas de levée)', r ->> 'raison' = 'statut', r::text);
  r := public.acq_envoi_envoye(b, '{}'::jsonb);
  perform pg_temp.ok('T3c consigner un approuve non réservé => statut', r ->> 'raison' = 'statut', r::text);
  -- base : envoye direct refusé
  begin update ops.envois set statut = 'envoye' where id = b; perform pg_temp.ok('T4 envoye direct depuis approuve refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T4 envoye direct depuis approuve refusé', sqlerrm = 'ops:envoye_sans_reservation', sqlerrm); end;
  -- on libère b : echec
  c := pg_temp.mk('dest-c');
  r := public.acq_envoi_reserver(c, pg_temp.cle('dest-c'));
  perform public.acq_envoi_echec(c, 'refus_authentification');
  perform pg_temp.ok('T8 échec relâche en approuve, clé effacée, 1 essai', (select statut = 'approuve' and cle_envoi is null and tentatives_envoi = 1 and reserve_le is null from ops.envois where id=c), pg_temp.st(c));
  r := public.acq_envoi_reserver(c, pg_temp.cle('dest-c'));
  perform public.acq_envoi_echec(c, 'x'); r := public.acq_envoi_reserver(c, pg_temp.cle('dest-c')); perform public.acq_envoi_echec(c, 'x');
  perform pg_temp.ok('T8b 3e échec => annule', (select statut = 'annule' and tentatives_envoi = 3 from ops.envois where id=c), pg_temp.st(c));
  perform pg_temp.ok('T8c événement envoi_echec_definitif', exists (select 1 from ops.evenements where type = 'envoi_echec_definitif' and objet = 'envoi:' || c::text));
end $$;

-- incertain / réconciliation / transitions
do $$
declare a uuid; b uuid; r jsonb; msg text;
begin
  a := pg_temp.mk('dest-i1', 'm1', 'fi1');
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-i1', 'm1', 'fi1'));
  perform public.acq_envoi_incertain(a, 'transport_coupe_apres_envoi');
  perform pg_temp.ok('T9 incertain', (select statut = 'envoi_incertain' from ops.envois where id=a), pg_temp.st(a));
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-i1', 'm1', 'fi1'));
  perform pg_temp.ok('T9b un incertain ne se réserve plus', r ->> 'raison' = 'deja_reserve', r::text);
  begin update ops.envois set statut = 'approuve' where id = a; perform pg_temp.ok('T9c incertain -> approuve refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T9c incertain -> approuve refusé', sqlerrm in ('ops:transition_envoi', 'ops:accord_absent'), sqlerrm); end;
  begin update ops.envois set statut = 'prepare' where id = a; perform pg_temp.ok('T9d incertain -> prepare refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T9d incertain -> prepare refusé', sqlerrm = 'ops:transition_envoi', sqlerrm); end;
  begin update ops.envois set destinataire = 'autre' where id = a; perform pg_temp.ok('T9e destinataire figé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T9e destinataire figé (incertain)', sqlerrm = 'ops:envoi_fige', sqlerrm); end;
  -- pause active : la réconciliation « parti » passe quand même
  update ops.interrupteurs set actif = true where nom = 'pause_generale';
  r := public.acq_envoi_reconcilier(a, 'parti', '{"id_externe":"mid-9"}'::jsonb);
  update ops.interrupteurs set actif = false where nom = 'pause_generale';
  perform pg_temp.ok('T9f réconcilier parti (même en pause) => envoye + id_externe', r = '{"ok":true}'::jsonb and (select statut = 'envoye' and id_externe = 'mid-9' from ops.envois where id=a), r::text || ' ' || pg_temp.st(a));
  b := pg_temp.mk('dest-i2', 'm1', 'fi2');
  r := public.acq_envoi_reserver(b, pg_temp.cle('dest-i2', 'm1', 'fi2'));
  perform public.acq_envoi_incertain(b, 'x');
  r := public.acq_envoi_reconcilier(b, 'pas_parti');
  perform pg_temp.ok('T9g réconcilier pas_parti => annule, clé libérée', r = '{"ok":true}'::jsonb and (select statut = 'annule' and cle_envoi is null from ops.envois where id=b), r::text || ' ' || pg_temp.st(b));
  r := public.acq_envoi_reconcilier(b, 'parti');
  perform pg_temp.ok('T9h réconcilier un annulé => statut', r ->> 'raison' = 'statut', r::text);
  r := public.acq_envoi_reconcilier(a, 'peutetre');
  perform pg_temp.ok('T9i résultat inconnu', r ->> 'raison' = 'resultat', r::text);
  -- en_cours -> prepare interdit
  a := pg_temp.mk('dest-i3', 'm1', 'fi3');
  begin update ops.envois set statut = 'en_cours_envoi' where id = a; perform pg_temp.ok('T9j approuve -> en_cours SANS clé refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T9j approuve -> en_cours SANS clé refusé', sqlerrm = 'ops:transition_envoi', sqlerrm); end;
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-i3', 'm1', 'fi3'));
  begin update ops.envois set statut = 'prepare' where id = a; perform pg_temp.ok('T9k en_cours -> prepare refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T9k en_cours -> prepare refusé', sqlerrm = 'ops:transition_envoi', sqlerrm); end;
end $$;

-- pause et accord et plafond
do $$
declare a uuid; b uuid; c uuid; d uuid; r jsonb;
begin
  a := pg_temp.mk('dest-p1', 'm1', 'fp1');
  update ops.interrupteurs set actif = true where nom = 'pause_generale';
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-p1', 'm1', 'fp1'));
  update ops.interrupteurs set actif = false where nom = 'pause_generale';
  perform pg_temp.ok('T6 pause lue à la réservation, l''envoi reste approuve sans essai compté', r ->> 'raison' = 'pause' and (select statut = 'approuve' and tentatives_envoi = 0 from ops.envois where id=a), r::text || ' ' || pg_temp.st(a));
  -- pause qui tombe entre la réservation et la consignation : refus rendu, pas de levée
  r := public.acq_envoi_reserver(a, pg_temp.cle('dest-p1', 'm1', 'fp1'));
  update ops.interrupteurs set actif = true where nom = 'pause_generale';
  r := public.acq_envoi_envoye(a, '{"id_externe":"m"}'::jsonb);
  update ops.interrupteurs set actif = false where nom = 'pause_generale';
  perform pg_temp.ok('T6b pause entre réservation et consignation => { ok:false, pause_generale }, reste en_cours', r ->> 'raison' = 'pause_generale' and (select statut = 'en_cours_envoi' from ops.envois where id=a), r::text || ' ' || pg_temp.st(a));
  -- accord tombé
  b := pg_temp.mk('dest-p2', 'm1', 'fp2');
  set session_replication_role = replica;
  update ops.accords_benj set emis_le = now() - interval '2 days', expire_le = now() - interval '1 day' where envoi_id = b;
  set session_replication_role = origin;
  r := public.acq_envoi_reserver(b, pg_temp.cle('dest-p2', 'm1', 'fp2'));
  perform pg_temp.ok('T14 accord échu => accord_perime, reste approuve', r ->> 'raison' = 'accord_perime' and (select statut = 'approuve' from ops.envois where id=b), r::text);
  -- plafond : on crée deux envois approuvés, puis on abaisse le plafond au nombre déjà réservé + 1
  c := pg_temp.mk('dest-p3', 'm1', 'fp3'); d := pg_temp.mk('dest-p4', 'm1', 'fp4');
  update ops.quotas_canaux set plafond_jour = (select count(*) + 1 from ops.envois e where e.canal='messagerie' and e.id not in (c, d) and e.statut in ('en_cours_envoi','envoye','envoi_incertain')) where canal = 'messagerie' and envoyeur = '*';
  r := public.acq_envoi_reserver(c, pg_temp.cle('dest-p3', 'm1', 'fp3'));
  perform pg_temp.ok('T7 plafond : la dernière place est prise', r = '{"ok":true}'::jsonb, r::text);
  r := public.acq_envoi_reserver(d, pg_temp.cle('dest-p4', 'm1', 'fp4'));
  perform pg_temp.ok('T7b plafond atteint => plafond, reste approuve, 0 essai', r ->> 'raison' = 'plafond' and (select statut = 'approuve' and tentatives_envoi = 0 from ops.envois where id=d), r::text || ' ' || pg_temp.st(d));
  update ops.quotas_canaux set plafond_jour = 100 where canal = 'messagerie' and envoyeur = '*';
  r := public.acq_envoi_reserver(d, pg_temp.cle('dest-p4', 'm1', 'fp4'));
  perform pg_temp.ok('T7c plafond relevé => la réservation passe', r = '{"ok":true}'::jsonb, r::text);
  -- orphelins
  update ops.envois set reserve_le = now() - interval '2 hours' where id = c;
  r := to_jsonb(public.acq_envois_orphelins(30));
  perform pg_temp.ok('T10 orphelins : 1 réservation ancienne devient incertaine', r = '1'::jsonb and (select statut = 'envoi_incertain' from ops.envois where id=c), r::text || ' ' || pg_temp.st(c));
  perform pg_temp.ok('T10b carte envoi_a_reconcilier sans donnée personnelle', exists (select 1 from ops.evenements where type = 'envoi_a_reconcilier' and objet = 'envoi:' || c::text and resume not like '%@%'));
end $$;
