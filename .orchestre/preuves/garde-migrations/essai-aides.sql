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
