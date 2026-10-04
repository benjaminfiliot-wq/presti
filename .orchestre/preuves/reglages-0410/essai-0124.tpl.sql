do $essai$
declare
  f_av jsonb; f_ap jsonb; s_av jsonb; s_ap jsonb;
  v_conv uuid; v_fond uuid;
  a uuid; b uuid; c uuid; d uuid;
  r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb;
  m1 text; m2 text; m3 text;
  n1 int; n2 int;
  k text; k2 text;
  verd constant jsonb := '{"j1":"sans_objet","j2":"ok","j3":"ok","raisons":[]}'::jsonb;
  jour_debut timestamptz := ((now() at time zone 'Europe/Paris')::date)::timestamp at time zone 'Europe/Paris';
  bilan jsonb;
begin
  -- fixtures et aides (tout vit dans pg_temp et dans cette transaction : l'exception finale emporte tout)
  create temp table essai_res (ord serial, nom text, ok boolean, detail text);
  create function pg_temp.chk(p_nom text, p_ok boolean, p_detail text default '') returns void language sql as $c$
    insert into essai_res (nom, ok, detail) values (p_nom, coalesce(p_ok, false), left(coalesce(p_detail, ''), 220)) $c$;
  create function pg_temp.mk(p_dest text, p_conv uuid, p_canal text default 'messagerie', p_type text default 'reponse') returns uuid language plpgsql as $c$
  declare v_id uuid; v_txt text := 'texte essai ' || gen_random_uuid()::text;
  begin
    insert into ops.envois (conversation_id, canal, envoyeur, type, destinataire, empreinte_texte, texte, modele_id, fait_id)
    values (p_conv, p_canal, 'repondeur', p_type, p_dest, encode(sha256(convert_to(v_txt, 'UTF8')), 'hex'), v_txt, 'm-essai', 'f-' || p_dest) returning id into v_id;
    return v_id;
  end $c$;
  create function pg_temp.cle(p_dest text) returns text language sql as $c$ select ops.cle_envoi(p_dest, 'm-essai', 'f-' || p_dest) $c$;
  create function pg_temp.st(p_id uuid) returns text language sql as $c$ select statut || ' cle=' || coalesce(left(cle_envoi, 6), 'null') || ' t=' || tentatives_envoi from ops.envois where id = p_id $c$;

  insert into ops.conversations (plateforme, meta_id, dernier_message_recu_le) values ('instagram', 'conv-essai-0124', now()) returning id into v_conv;
  select id into v_fond from public.artisans where is_founder limit 1;

  -- instantane AVANT
  select coalesce(jsonb_object_agg(p.oid::regprocedure::text, md5(p.prosrc || coalesce(p.proacl::text, '') || coalesce(p.proconfig::text, '') || p.prosecdef::text)), '{}'::jsonb) into f_av
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname in ('ops', 'public');
  select jsonb_build_object(
    'triggers', (select coalesce(jsonb_agg(c.relname || '.' || t.tgname || '.' || t.tgenabled::text order by c.relname, t.tgname), '[]'::jsonb) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname in ('ops', 'public')),
    'colonnes', (select md5(string_agg(table_schema || '.' || table_name || '.' || column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, ''), '|' order by table_schema, table_name, column_name)) from information_schema.columns where table_schema in ('ops', 'public') and table_name <> 'essai_res'),
    'contraintes', (select md5(string_agg(conrelid::regclass::text || conname || pg_get_constraintdef(oid), '|' order by conrelid::regclass::text, conname)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('ops', 'public'))),
    'interrupteurs', (select coalesce(jsonb_agg(nom || '=' || actif::text order by nom), '[]'::jsonb) from ops.interrupteurs),
    'quotas', (select coalesce(jsonb_agg(canal || '/' || envoyeur || '=' || plafond_jour || '/' || plafond_nouveaux_jour order by canal, envoyeur), '[]'::jsonb) from ops.quotas_canaux),
    'accords', (select count(*) from ops.accords_benj), 'oppositions', (select count(*) from ops.opposition)
  ) into s_av;

  -- B1 : AVANT 0124 (0122 en vigueur), prepare -> approuve exige l'accord de Benj
  a := pg_temp.mk('dest-b1', v_conv);
  r1 := public.acq_envoi_approuver(a, verd);
  perform pg_temp.chk('B1 avant : approbation sans accord refusee (etat de base)', r1 ->> 'ok' = 'false' and (select statut from ops.envois where id = a) = 'prepare', r1::text);

  -- @@MIGRATION@@

  -- instantane APRES
  select coalesce(jsonb_object_agg(p.oid::regprocedure::text, md5(p.prosrc || coalesce(p.proacl::text, '') || coalesce(p.proconfig::text, '') || p.prosecdef::text)), '{}'::jsonb) into f_ap
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname in ('ops', 'public');
  select jsonb_build_object(
    'triggers', (select coalesce(jsonb_agg(c.relname || '.' || t.tgname || '.' || t.tgenabled::text order by c.relname, t.tgname), '[]'::jsonb) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname in ('ops', 'public')),
    'colonnes', (select md5(string_agg(table_schema || '.' || table_name || '.' || column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, ''), '|' order by table_schema, table_name, column_name)) from information_schema.columns where table_schema in ('ops', 'public') and table_name <> 'essai_res'),
    'contraintes', (select md5(string_agg(conrelid::regclass::text || conname || pg_get_constraintdef(oid), '|' order by conrelid::regclass::text, conname)) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('ops', 'public'))),
    'interrupteurs', (select coalesce(jsonb_agg(nom || '=' || actif::text order by nom), '[]'::jsonb) from ops.interrupteurs),
    'quotas', (select coalesce(jsonb_agg(canal || '/' || envoyeur || '=' || plafond_jour || '/' || plafond_nouveaux_jour order by canal, envoyeur), '[]'::jsonb) from ops.quotas_canaux),
    'accords', (select count(*) from ops.accords_benj), 'oppositions', (select count(*) from ops.opposition)
  ) into s_ap;
  select coalesce(jsonb_agg(x.key order by x.key), '[]'::jsonb) into r1 from jsonb_each(f_ap) x where f_av -> x.key is distinct from x.value;
  perform pg_temp.chk('P1 seules ops.garde_envois() et acq_envoi_reserver(uuid,text) ont change (corps, droits, search_path)', r1 = '["acq_envoi_reserver(uuid,text)", "ops.garde_envois()"]'::jsonb, r1::text);
  perform pg_temp.chk('P2 aucune fonction ajoutee ni retiree', (select array_agg(kk.k order by kk.k) from jsonb_object_keys(f_av) as kk(k)) is not distinct from (select array_agg(kk.k order by kk.k) from jsonb_object_keys(f_ap) as kk(k)), '');
  perform pg_temp.chk('P3 declencheurs, colonnes, contraintes, interrupteurs, quotas inchanges', s_av = s_ap, s_av::text || ' / ' || s_ap::text);
  perform pg_temp.chk('P4 interrupteurs inchanges : envoi_froid reste ferme', s_ap -> 'interrupteurs' @> '["envoi_froid=false"]'::jsonb and s_av -> 'interrupteurs' = s_ap -> 'interrupteurs', (s_ap -> 'interrupteurs')::text);
  perform pg_temp.chk('P5 aucun accord cree ni consomme par la migration', (s_av ->> 'accords') = (s_ap ->> 'accords') and (s_av ->> 'oppositions') = (s_ap ->> 'oppositions'), '');
  perform pg_temp.chk('P6 droits : reserver = service_role seul ; garde_envois = personne',
    has_function_privilege('service_role', 'public.acq_envoi_reserver(uuid,text)', 'execute')
    and not has_function_privilege('anon', 'public.acq_envoi_reserver(uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'public.acq_envoi_reserver(uuid,text)', 'execute')
    and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.acq_envoi_reserver(uuid,text)'::regprocedure and a.grantee = 0)
    and not has_function_privilege('anon', 'ops.garde_envois()', 'execute') and not has_function_privilege('authenticated', 'ops.garde_envois()', 'execute') and not has_function_privilege('service_role', 'ops.garde_envois()', 'execute'), '');

  -- T1 a T3 : le chemin automatique complet, sans accord
  a := pg_temp.mk('dest-t1', v_conv);
  r1 := public.acq_envoi_approuver(a, verd);
  perform pg_temp.chk('T1 prepare -> approuve sans accord (trois verdicts du Facteur)', r1 = '{"ok":true}'::jsonb and (select statut = 'approuve' and approuve_le is not null and approuve_par_agent = 'facteur' from ops.envois where id = a), r1::text || ' ' || pg_temp.st(a));
  r2 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t1'));
  perform pg_temp.chk('T2 reservation d un envoi approuve sans accord', r2 = '{"ok":true}'::jsonb and (select statut = 'en_cours_envoi' from ops.envois where id = a), r2::text || ' ' || pg_temp.st(a));
  r3 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t1'));
  perform pg_temp.chk('T2b seconde reservation : deja_reserve', r3 ->> 'raison' = 'deja_reserve', r3::text);
  r4 := public.acq_envoi_envoye(a, '{"id_externe":"mid-essai-1","entetes":{"Message-ID":"<essai@essai.invalid>"}}'::jsonb);
  perform pg_temp.chk('T3 consignation envoye sans accord, aucune ligne d accord creee', r4 = '{"ok":true}'::jsonb and (select statut = 'envoye' from ops.envois where id = a) and (select count(*) from ops.accords_benj where envoi_id = a) = 0, r4::text || ' ' || pg_temp.st(a));

  -- T4 : pause generale (entree en file, approbation, reservation, consignation)
  b := pg_temp.mk('dest-t4b', v_conv); r1 := public.acq_envoi_approuver(b, verd);
  c := pg_temp.mk('dest-t4c', v_conv);
  d := pg_temp.mk('dest-t4d', v_conv); r1 := public.acq_envoi_approuver(d, verd); r1 := public.acq_envoi_reserver(d, pg_temp.cle('dest-t4d'));
  m1 := null; m3 := null;
  begin
    update ops.interrupteurs set actif = true, change_le = now() where nom = 'pause_generale';
    r1 := public.acq_envoi_reserver(b, pg_temp.cle('dest-t4b'));
    r2 := public.acq_envoi_approuver(c, verd);
    begin perform pg_temp.mk('dest-t4e', v_conv); exception when others then m1 := sqlerrm; end;
    r3 := public.acq_envoi_envoye(d, '{"id_externe":"mid-essai-4","entetes":{"Message-ID":"<essai4@essai.invalid>"}}'::jsonb);
    k := pg_temp.st(b); k2 := pg_temp.st(d);
    raise exception using message = 'rollback_t4';
  exception when others then if sqlerrm <> 'rollback_t4' then m3 := sqlerrm; end if; end;
  perform pg_temp.chk('T4a pause : reserver un envoi approuve refuse (pause), rien consomme', r1 ->> 'raison' = 'pause' and k = 'approuve cle=null t=0', coalesce(m3, '') || ' ' || coalesce(r1::text, '') || ' ' || coalesce(k, ''));
  perform pg_temp.chk('T4b pause : approuver un envoi prepare refuse', r2 ->> 'raison' = 'pause_generale', coalesce(r2::text, ''));
  perform pg_temp.chk('T4c pause : entrer en file refuse', m1 = 'ops:pause_generale', coalesce(m1, 'aucune erreur'));
  perform pg_temp.chk('T4d pause : consigner un envoi reserve refuse, il reste en_cours_envoi', r3 ->> 'ok' = 'false' and k2 like 'en_cours_envoi%', coalesce(r3::text, '') || ' ' || coalesce(k2, ''));

  -- T5 : opposition / STOP
  a := pg_temp.mk('dest-t5a', v_conv); r1 := public.acq_envoi_approuver(a, verd);
  b := pg_temp.mk('dest-t5b', v_conv); r1 := public.acq_envoi_approuver(b, verd);
  m1 := null; m3 := null;
  begin
    insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('meta_id', 'dest-t5a', 'essai a sec', 'essai');
    k := pg_temp.st(a);
    r1 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t5a'));
    begin perform pg_temp.mk('dest-t5a', v_conv); exception when others then m1 := sqlerrm; end;
    alter table ops.opposition disable trigger annuler_sur_opposition;
    insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('meta_id', 'dest-t5b', 'essai a sec', 'essai');
    r2 := public.acq_envoi_reserver(b, pg_temp.cle('dest-t5b'));
    k2 := pg_temp.st(b);
    alter table ops.opposition enable trigger annuler_sur_opposition;
    insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('meta_id', 'dest-t5c', 'essai a sec', 'essai');
    c := pg_temp.mk('dest-t5c', v_conv, 'messagerie', 'confirmation_stop');
    r3 := public.acq_envoi_approuver(c, verd);
    r4 := public.acq_envoi_reserver(c, pg_temp.cle('dest-t5c'));
    raise exception using message = 'rollback_t5';
  exception when others then if sqlerrm <> 'rollback_t5' then m3 := sqlerrm; end if; end;
  perform pg_temp.chk('T5a STOP apres approbation : l envoi approuve est annule, la reservation refuse (opposition)', k like 'annule%' and r1 ->> 'raison' = 'opposition', coalesce(m3, '') || ' ' || coalesce(k, '') || ' ' || coalesce(r1::text, ''));
  perform pg_temp.chk('T5b un nouvel envoi vers l opposant est refuse', m1 = 'ops:opposition', coalesce(m1, 'aucune erreur'));
  perform pg_temp.chk('T5c la reservation relit l opposition sans l aide du declencheur : refus, envoi reste approuve, aucune cle prise', r2 ->> 'raison' = 'opposition' and k2 = 'approuve cle=null t=0', coalesce(r2::text, '') || ' ' || coalesce(k2, ''));
  perform pg_temp.chk('T5d la confirmation de STOP (exception) s approuve et se reserve', r3 = '{"ok":true}'::jsonb and r4 = '{"ok":true}'::jsonb, coalesce(r3::text, '') || ' ' || coalesce(r4::text, ''));

  -- T6 : plafonds du jour (entree en file, relus a la reservation)
  a := pg_temp.mk('dest-t6a', v_conv); r1 := public.acq_envoi_approuver(a, verd);
  m1 := null; m3 := null; r2 := null; k := null; n1 := null;
  begin
    select count(*) into n1 from ops.envois e where e.canal = 'messagerie' and e.id <> a and e.statut in ('en_cours_envoi', 'envoye', 'envoi_incertain') and coalesce(e.reserve_le, e.envoye_le) >= jour_debut and coalesce(e.reserve_le, e.envoye_le) < jour_debut + interval '1 day';
    update ops.quotas_canaux set plafond_jour = n1 where canal = 'messagerie' and envoyeur = '*';
    r2 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t6a'));
    k := pg_temp.st(a);
    update ops.quotas_canaux set plafond_jour = 0 where canal = 'messagerie' and envoyeur = '*';
    begin perform pg_temp.mk('dest-t6b', v_conv); exception when others then m1 := sqlerrm; end;
    raise exception using message = 'rollback_t6';
  exception when others then if sqlerrm <> 'rollback_t6' then m3 := sqlerrm; end if; end;
  perform pg_temp.chk('T6a plafond relu a la reservation : refus (plafond), envoi reste approuve, aucune cle prise', r2 ->> 'raison' = 'plafond' and k = 'approuve cle=null t=0', coalesce(m3, '') || ' n=' || coalesce(n1::text, '?') || ' ' || coalesce(r2::text, '') || ' ' || coalesce(k, ''));
  perform pg_temp.chk('T6b plafond du jour atteint : entrer en file refuse', m1 = 'ops:quota', coalesce(m1, 'aucune erreur'));

  -- T7 : un canal dont la ligne de quota disparait apres l approbation est ferme (ajout de 0124)
  a := pg_temp.mk('dest-t7a', v_conv); r1 := public.acq_envoi_approuver(a, verd);
  m1 := null; m3 := null; r2 := null; k := null;
  begin
    delete from ops.quotas_canaux where canal = 'messagerie' and envoyeur = '*';
    r2 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t7a'));
    k := pg_temp.st(a);
    begin perform pg_temp.mk('dest-t7b', v_conv); exception when others then m1 := sqlerrm; end;
    raise exception using message = 'rollback_t7';
  exception when others then if sqlerrm <> 'rollback_t7' then m3 := sqlerrm; end if; end;
  perform pg_temp.chk('T7a ligne de quota supprimee apres approbation : reservation refusee (quota_absent)', r2 ->> 'raison' = 'quota_absent' and k = 'approuve cle=null t=0', coalesce(m3, '') || ' ' || coalesce(r2::text, '') || ' ' || coalesce(k, ''));
  perform pg_temp.chk('T7b canal sans quota : entrer en file refuse', m1 = 'ops:quota_absent', coalesce(m1, 'aucune erreur'));

  -- T8 : l envoi a froid reste ferme
  m1 := null; begin perform pg_temp.mk('dest-t8', v_conv, 'messagerie', 'premier_contact'); exception when others then m1 := sqlerrm; end;
  perform pg_temp.chk('T8 envoi_froid ferme : un premier contact est refuse a l entree en file', m1 = 'ops:envoi_froid_ferme', coalesce(m1, 'aucune erreur'));

  -- T9 a T11 : l approbation n est ouverte qu au Facteur, avec les trois verdicts, depuis prepare (ou l ancienne attente)
  a := pg_temp.mk('dest-t9', v_conv);
  r1 := public.acq_envoi_approuver(a, '{"j1":"sans_objet","j2":"ok","raisons":[]}'::jsonb);
  m1 := null; begin update ops.envois set statut = 'approuve', verdicts = verd, approuve_par_agent = 'repondeur' where id = a; exception when others then m1 := sqlerrm; end;
  perform pg_temp.chk('T9a verdicts incomplets (j3 absent) : approbation refusee', r1 ->> 'raison' = 'verdicts', coalesce(r1::text, ''));
  perform pg_temp.chk('T9b approuver au nom d un autre agent que le Facteur : refuse', m1 is not null, coalesce(m1, 'aucune erreur'));
  m1 := null; begin insert into ops.envois (conversation_id, canal, envoyeur, type, destinataire, empreinte_texte, texte, modele_id, fait_id, statut, verdicts, approuve_par_agent)
    values (v_conv, 'messagerie', 'repondeur', 'reponse', 'dest-t10', encode(sha256(convert_to('t10', 'UTF8')), 'hex'), 't10', 'm-essai', 'f-t10', 'approuve', verd, 'facteur'); exception when others then m1 := sqlerrm; end;
  perform pg_temp.chk('T10 insertion directe en approuve : refusee', m1 is not null, coalesce(m1, 'aucune erreur'));
  b := pg_temp.mk('dest-t11', v_conv); update ops.envois set statut = 'annule' where id = b;
  r2 := public.acq_envoi_approuver(b, verd);
  perform pg_temp.chk('T11 un envoi annule ne redevient pas approuve', r2 ->> 'ok' = 'false' and (select statut from ops.envois where id = b) = 'annule', coalesce(r2::text, ''));

  -- T12 : l ancien stock en attente d accord est rejuge, sans accord ; les accords non consommes d une attente abandonnee tombent
  c := pg_temp.mk('dest-t12a', v_conv);
  update ops.envois set statut = 'attend_accord_benj', verdicts = verd, approuve_par_agent = 'facteur' where id = c;
  r1 := public.acq_envoi_approuver(c, verd);
  perform pg_temp.chk('T12a ancienne attente -> approuve sans accord (rejugee par le Facteur)', r1 = '{"ok":true}'::jsonb and (select statut from ops.envois where id = c) = 'approuve', coalesce(r1::text, ''));
  if v_fond is not null then
    d := pg_temp.mk('dest-t12b', v_conv);
    update ops.envois set statut = 'attend_accord_benj', verdicts = verd, approuve_par_agent = 'facteur' where id = d;
    insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, expire_le)
      select id, canal, destinataire, empreinte_texte, v_fond, now() + interval '23 hours' from ops.envois where id = d;
    update ops.envois set statut = 'saute' where id = d;
    perform pg_temp.chk('T12b une attente abandonnee archive son accord non consomme (annule)', (select count(*) = 1 and bool_and(annule_le is not null and utilise_le is null) from ops.accords_benj where envoi_id = d), '');
  else
    perform pg_temp.chk('T12b (sans objet : aucun fondateur en base)', true, 'ignore');
  end if;

  -- T13 a T17 : ce que 0122 garantissait et que 0124 doit garder (gel, relache, doublon de cle)
  a := pg_temp.mk('dest-t13', v_conv); r1 := public.acq_envoi_approuver(a, verd);
  m1 := null; begin update ops.envois set empreinte_texte = repeat('a', 64) where id = a; exception when others then m1 := sqlerrm; end;
  perform pg_temp.chk('T13 un envoi approuve est fige (les octets juges sont ce qui part)', m1 = 'ops:envoi_fige', coalesce(m1, 'aucune erreur'));
  r2 := public.acq_envoi_reserver(a, pg_temp.cle('dest-t13'));
  perform public.acq_envoi_echec(a, 'refus_essai');
  perform pg_temp.chk('T14 un refus net du transport relache la reservation : approuve, cle effacee, 1 essai', (select statut = 'approuve' and cle_envoi is null and tentatives_envoi = 1 from ops.envois where id = a), pg_temp.st(a));
  b := pg_temp.mk('dest-t16a', v_conv); r1 := public.acq_envoi_approuver(b, verd);
  c := pg_temp.mk('dest-t16a', v_conv); r1 := public.acq_envoi_approuver(c, verd);
  r2 := public.acq_envoi_reserver(b, pg_temp.cle('dest-t16a'));
  r3 := public.acq_envoi_reserver(c, pg_temp.cle('dest-t16a'));
  perform pg_temp.chk('T16 meme cle d envoi sur une autre ligne : une seule reservation gagne (deja_reserve)', r2 = '{"ok":true}'::jsonb and r3 ->> 'raison' = 'deja_reserve' and (select statut from ops.envois where id = c) = 'approuve', coalesce(r3::text, ''));
  r1 := public.acq_envoi_reserver(gen_random_uuid(), pg_temp.cle('x'));
  r2 := public.acq_envoi_reserver(b, 'cle-mal-formee');
  perform pg_temp.chk('T17 envoi inconnu : introuvable ; cle mal formee : cle', r1 ->> 'raison' = 'introuvable' and r2 ->> 'raison' = 'cle', coalesce(r1::text, '') || ' ' || coalesce(r2::text, ''));

  -- bilan
  select jsonb_build_object(
    'ko', (select coalesce(jsonb_agg(nom || ' :: ' || detail), '[]'::jsonb) from essai_res where not ok),
    'n_ok', (select count(*) from essai_res where ok), 'n_ko', (select count(*) from essai_res where not ok),
    'ok', (select coalesce(jsonb_agg(left(nom, 12) order by ord), '[]'::jsonb) from essai_res where ok),
    'empreintes', (select jsonb_object_agg(p.oid::regprocedure::text, jsonb_build_object('md5', md5(p.prosrc), 'n', length(p.prosrc))) from pg_proc p where p.oid in ('ops.garde_envois()'::regprocedure, 'public.acq_envoi_reserver(uuid,text)'::regprocedure))
  ) into bilan;
  raise exception using message = 'ESSAI_A_SEC ' || bilan::text;
end
$essai$;
