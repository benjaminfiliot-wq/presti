\i essai-aides.sql
insert into public.artisans (id, is_founder, email) values ('00000000-0000-0000-0000-00000000f001', true, 'fond@essai.invalid') on conflict do nothing;
update ops.interrupteurs set actif = true where nom = 'envoi_froid';
update ops.quotas_canaux set plafond_jour = 2, plafond_nouveaux_jour = 2 where canal = 'formulaire_site' and envoyeur = '*';
insert into ops.prospects (cle_dedup, siren, domaine, etape, formulaire, technologie) values
 ('siren:111111111', '111111111', 'a-essai.invalid', 'prepare', '{"eligible":true,"url_action":"https://a-essai.invalid/f"}', 'wpforms'),
 ('siren:222222222', '222222222', 'b-essai.invalid', 'prepare', '{"eligible":true}', 'wpforms'),
 ('siren:333333333', '333333333', 'c-essai.invalid', 'prepare', '{"eligible":true}', 'wpforms');
create or replace function pg_temp.mkf(p_siren text) returns uuid language plpgsql as $$
declare v_id uuid; v_p uuid; v_txt text := 'form ' || gen_random_uuid()::text;
begin
  select id into v_p from ops.prospects where siren = p_siren;
  insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, texte, modele_id, fait_id, technologie)
  values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, encode(extensions.digest(v_txt, 'sha256'), 'hex'), v_txt, 'mf1', 'fait-' || p_siren, 'wpforms') returning id into v_id;
  update ops.envois set statut = 'attend_accord_benj', verdicts = '{"j1":"ok","j2":"ok","j3":"ok"}', approuve_par_agent = 'facteur' where id = v_id;
  insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, expire_le)
  select id, canal, destinataire, empreinte_texte, '00000000-0000-0000-0000-00000000f001', now() + interval '23 hours' from ops.envois where id = v_id;
  update ops.envois set statut = 'approuve' where id = v_id;
  return v_id;
end $$;
do $$
declare a uuid; b uuid; c uuid; r jsonb; n int;
begin
  a := pg_temp.mkf('111111111'); b := pg_temp.mkf('222222222'); 
  r := public.acq_formulaires_a_porter(10, 900);
  perform pg_temp.ok('T11 porteur : 2 formulaires servis, réservés', jsonb_array_length(r) = 2 and (select count(*) = 2 from ops.envois where statut = 'en_cours_envoi' and canal = 'formulaire_site' and cle_envoi is not null and reserve_le is not null), jsonb_array_length(r)::text);
  perform pg_temp.ok('T11b clés du formulaire : identité = prospect (destinataire nul)', (select cle_envoi from ops.envois where id = a) = ops.cle_envoi('prospect:' || (select prospect_id::text from ops.envois where id = a), 'mf1', 'fait-111111111'));
  perform pg_temp.ok('T11c colonnes rendues : id, texte, objet, reference, formulaire seulement', (select array_agg(k order by k) from (select distinct jsonb_object_keys(x) k from jsonb_array_elements(r) x) z) = array['formulaire','id','objet','reference','texte']);
  r := public.acq_formulaires_a_porter(10, 900);
  perform pg_temp.ok('T11d deuxième appel : rien (plus de bail qui expire)', jsonb_array_length(r) = 0);
  update ops.envois set bail_porteur_jusqua = now() - interval '1 hour' where id in (a, b);
  r := public.acq_formulaires_a_porter(10, 900);
  perform pg_temp.ok('T11e bail expiré : le même formulaire n''est PAS redonné', jsonb_array_length(r) = 0);
  -- plafond du jour : 2 réservés => le 3e attend
  update ops.quotas_canaux set plafond_jour = 5, plafond_nouveaux_jour = 5 where canal = 'formulaire_site' and envoyeur = '*';
  c := pg_temp.mkf('333333333');
  update ops.quotas_canaux set plafond_jour = 2, plafond_nouveaux_jour = 2 where canal = 'formulaire_site' and envoyeur = '*';
  r := public.acq_formulaires_a_porter(10, 900);
  perform pg_temp.ok('T11f plafond du jour (2 réservés) : le 3e n''est pas servi', jsonb_array_length(r) = 0 and (select statut = 'approuve' from ops.envois where id = c), jsonb_array_length(r)::text);
  update ops.quotas_canaux set plafond_jour = 3, plafond_nouveaux_jour = 3 where canal = 'formulaire_site' and envoyeur = '*';
  r := public.acq_formulaires_a_porter(10, 900);
  perform pg_temp.ok('T11g plafond relevé : le 3e est servi', jsonb_array_length(r) = 1, jsonb_array_length(r)::text);
  -- consignation avec preuve
  r := public.acq_envoi_envoye(a, '{"code_http":200,"empreinte_texte":"x","empreinte_avant":"y","empreinte_apres":"z","chemin_usine":"p/q"}'::jsonb);
  perform pg_temp.ok('T12 consigner un formulaire réservé avec preuve => envoye + étape prospect', r = '{"ok":true}'::jsonb and (select statut = 'envoye' and preuve is not null from ops.envois where id = a) and (select etape = 'envoye' from ops.prospects where siren = '111111111'), r::text || ' ' || (select etape from ops.prospects where siren = '111111111'));
  r := public.acq_envoi_envoye(b, '{"code_http":200}'::jsonb);
  perform pg_temp.ok('T12b preuve incomplète => preuve, reste en_cours', r ->> 'raison' = 'preuve' and (select statut = 'en_cours_envoi' from ops.envois where id = b));
  -- échec non définitif : relâché
  r := public.acq_formulaire_echec(b, 'champ_introuvable', false);
  perform pg_temp.ok('T13 échec non définitif => approuve, clé effacée, 1 essai', r = '{"ok":true}'::jsonb and (select statut = 'approuve' and cle_envoi is null and tentatives_envoi = 1 and bail_porteur_jusqua is null from ops.envois where id = b), r::text || ' ' || pg_temp.st(b));
  r := public.acq_formulaire_echec(b, 'inexistant_definitif', true);
  perform pg_temp.ok('T13b échec définitif => annule + formulaire inéligible', (select statut = 'annule' from ops.envois where id = b) and (select (formulaire ->> 'eligible') = 'false' from ops.prospects where siren = '222222222'), pg_temp.st(b));
  -- doublon de clé dans le porteur : même prospect/modèle/fait => annule, n'est pas servi
  r := public.acq_formulaire_echec(gen_random_uuid(), 'x', false);
  perform pg_temp.ok('T13c envoi inconnu => introuvable', r ->> 'raison' = 'introuvable');
end $$;

-- LÉGACY : des lignes envoye / approuve écrites AVANT la migration restent lisibles et modifiables
set session_replication_role = replica;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, approuve_par_agent, verdicts, prepare_le, envoye_le)
select id, 'email_sollicite', 'gmail', 'reponse', 'vieux@essai.invalid', repeat('a', 64), 'envoye', 'facteur', '{"j1":"ok","j2":"ok","j3":"ok"}', now() - interval '3 days', now() - interval '3 days' from ops.prospects where siren = '333333333';
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, approuve_par_agent, verdicts)
select id, 'email_sollicite', 'gmail', 'reponse', 'vieux2@essai.invalid', repeat('b', 64), 'approuve', 'facteur', '{"j1":"ok","j2":"ok","j3":"ok"}' from ops.prospects where siren = '333333333';
set session_replication_role = origin;
do $$
declare r jsonb;
begin
  begin update ops.envois set derniere_erreur = 'note' where destinataire = 'vieux@essai.invalid'; perform pg_temp.ok('T15 ligne legacy envoye : modifiable (hors statut)', true);
  exception when others then perform pg_temp.ok('T15 ligne legacy envoye : modifiable (hors statut)', false, sqlerrm); end;
  begin update ops.envois set id_externe = 'mid-legacy' where destinataire = 'vieux@essai.invalid'; perform pg_temp.ok('T15b ligne legacy envoye : id_externe modifiable', true);
  exception when others then perform pg_temp.ok('T15b ligne legacy envoye : id_externe modifiable', false, sqlerrm); end;
  perform pg_temp.ok('T15c lecture legacy', (select count(*) = 2 from ops.envois where destinataire like 'vieux%'));
  begin update ops.envois set statut = 'annule' where destinataire = 'vieux2@essai.invalid'; perform pg_temp.ok('T15d legacy approuve -> annule permis', true);
  exception when others then perform pg_temp.ok('T15d legacy approuve -> annule permis', false, sqlerrm); end;
  -- exemption essai_e2e
  begin insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, approuve_par_agent, verdicts)
   select id, 'essai_e2e', 'facteur_usine', 'premier_contact', 'x@y.invalid', repeat('c', 64), 'envoye', 'facteur', '{"j1":"ok","j2":"ok","j3":"ok"}' from ops.prospects where siren = '333333333';
   perform pg_temp.ok('T16 essai_e2e vers .invalid : envoye direct toléré', true);
  exception when others then perform pg_temp.ok('T16 essai_e2e vers .invalid : envoye direct toléré', false, sqlerrm); end;
  begin insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, approuve_par_agent, verdicts)
   select id, 'essai_e2e', 'facteur_usine', 'premier_contact', 'x@y.fr', repeat('d', 64), 'envoye', 'facteur', '{"j1":"ok","j2":"ok","j3":"ok"}' from ops.prospects where siren = '333333333';
   perform pg_temp.ok('T16b essai_e2e vers .fr : refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T16b essai_e2e vers .fr : refusé', sqlerrm = 'ops:envoye_sans_reservation', sqlerrm); end;
  begin insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, approuve_par_agent, verdicts)
   select id, 'email_sollicite', 'gmail', 'reponse', 'z@y.invalid', repeat('e', 64), 'envoye', 'facteur', '{"j1":"ok","j2":"ok","j3":"ok"}' from ops.prospects where siren = '333333333';
   perform pg_temp.ok('T16c insert envoye direct (gmail) : refusé', false, 'aucune erreur');
  exception when others then perform pg_temp.ok('T16c insert envoye direct (gmail) : refusé', sqlerrm = 'ops:envoye_sans_reservation', sqlerrm); end;
end $$;
