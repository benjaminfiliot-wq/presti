do $essai_026$
declare
  r jsonb := '{}'::jsonb;
begin
  execute $migration_026$---------------------------- _A_COLLER_sql_editor_0108_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.pilotage_envois_du_jour()
returns table(id uuid, canal text, technologie text, type text, statut text, envoyeur text, metier text, commune text, variante text, froid boolean, verdicts jsonb, prepare_le timestamptz, envoye_le timestamptz)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select e.id,e.canal,e.technologie,e.type,e.statut,e.envoyeur,p.metier,p.commune,e.variante,p.froid,
 jsonb_build_object('j1',case when e.verdicts->>'j1' in ('pass','refus') then e.verdicts->>'j1' end,
 'j3',case when e.verdicts->>'j3' in ('pass','refus') then e.verdicts->>'j3' end,
 'second',case when e.verdicts->>'second' in ('pass','refus') then e.verdicts->>'second' end),e.prepare_le,e.envoye_le
 from ops.envois e left join ops.prospects p on p.id=e.prospect_id
 where coalesce(e.envoye_le,e.prepare_le)>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris')
 and coalesce(e.envoye_le,e.prepare_le)<(((now() at time zone 'Europe/Paris')::date+1)::timestamp at time zone 'Europe/Paris')
 order by coalesce(e.envoye_le,e.prepare_le) desc limit 300
$$;
revoke all on function public.pilotage_envois_du_jour() from public, anon, authenticated;
grant execute on function public.pilotage_envois_du_jour() to service_role;
comment on function public.pilotage_envois_du_jour() is 'Envois parisiens du jour, verdicts bornés, sans contenu.';
create or replace function public.pilotage_compteurs_du_jour()
returns table(canal text, palier text, plafond integer, utilises integer, plaintes_7j integer, avis_abus integer, stop_100 integer, echecs_affilee integer, reponses_positives integer)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select c.canal,(public.acq_etat_envoi()->>'palier')::text,
 coalesce((public.acq_plafond_du_jour(c.canal)->>'envois')::integer,0),
 coalesce((public.acq_envois_du_jour(c.canal)->>'envois')::integer,0),
 (select coalesce(sum(1),0)::integer from ops.signaux s where s.type='plainte' and s.le>=now()-interval '7 days' and exists(select 1 from ops.envois e where e.id=s.envoi_id and e.canal=c.canal)),
 (select coalesce(sum(1),0)::integer from ops.signaux s where s.type='avis_abus' and exists(select 1 from ops.envois e where e.id=s.envoi_id and e.canal=c.canal)),
 (select coalesce(sum(1),0)::integer from ops.signaux s where s.type='stop' and exists(select 1 from ops.envois e where e.id=s.envoi_id and e.canal=c.canal)),
 null::integer,
 (select coalesce(sum(1),0)::integer from ops.signaux s where s.type='reponse_positive' and exists(select 1 from ops.envois e where e.id=s.envoi_id and e.canal=c.canal))
 from (values ('formulaire_site'),('email_sollicite'),('reponse_privee'),('messagerie'),('instagram'),('facebook')) c(canal)
$$;
revoke all on function public.pilotage_compteurs_du_jour() from public, anon, authenticated;
grant execute on function public.pilotage_compteurs_du_jour() to service_role;
comment on function public.pilotage_compteurs_du_jour() is 'Plafonds et usages lus dans les fonctions de l acquisition.';
create or replace function public.pilotage_compteurs_technologies()
returns table(technologie text, envois_jour integer, echecs_affilee integer, etat text, pause_motif text, envois_300 integer, reponses_300 integer)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select t.technologie,null::integer,t.echecs_affilee,t.etat,t.pause_motif,t.envois_300,t.reponses_300
 from ops.technologies t
$$;
revoke all on function public.pilotage_compteurs_technologies() from public, anon, authenticated;
grant execute on function public.pilotage_compteurs_technologies() to service_role;
comment on function public.pilotage_compteurs_technologies() is 'État des technologies connu de l acquisition.';
create or replace function public.pilotage_entonnoir(p_depuis timestamptz)
returns table(id uuid, canal text, variante text, froid boolean, envoye_le timestamptz, repondu boolean, oui boolean, appel boolean, vente boolean)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select e.id,e.canal,e.variante,p.froid,e.envoye_le,
 exists(select 1 from ops.reponses r where r.prospect_id=p.id and not r.auto),
 (p.etape in ('oui','lien_prepare','lien_envoye') or exists(select 1 from ops.reponses r where r.prospect_id=p.id and r.classe in ('oui','question','prix','appel'))),
 exists(select 1 from ops.reponses r where r.prospect_id=p.id and r.classe='appel'),
 ops.acq_commande_du_prospect(p.id) is not null
 from ops.envois e join ops.prospects p on p.id=e.prospect_id
 where e.type='premier_contact' and e.statut='envoye' and e.envoye_le>=greatest(p_depuis,now()-interval '31 days')
$$;
revoke all on function public.pilotage_entonnoir(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_entonnoir(timestamptz) to service_role;
comment on function public.pilotage_entonnoir(timestamptz) is 'Premiers contacts et progression sur 31 jours au plus.';
create or replace function public.pilotage_bilan_date()
returns table(bilan_le date, verdict text, prolonge_jusqua date)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select e.bilan_le,e.bilan_verdict,e.p2_prolonge_jusqua from ops.etat_envoi e where e.id
$$;
revoke all on function public.pilotage_bilan_date() from public, anon, authenticated;
grant execute on function public.pilotage_bilan_date() to service_role;
comment on function public.pilotage_bilan_date() is 'Date unique du bilan fixée par l acquisition.';
create or replace function public.pilotage_bilan(p_n integer)
returns table(id uuid, envoye_le timestamptz, oui boolean, vente boolean)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select e.id,e.envoye_le,
 (p.etape in ('oui','lien_prepare','lien_envoye') or exists(select 1 from ops.reponses r where r.prospect_id=p.id and r.classe in ('oui','question','prix','appel'))),
 ops.acq_commande_du_prospect(p.id) is not null
 from ops.envois e join ops.prospects p on p.id=e.prospect_id
 where e.type='premier_contact' and e.statut='envoye' and p.froid
 order by e.envoye_le,e.id limit least(greatest(1,coalesce(p_n,1)),200)
$$;
revoke all on function public.pilotage_bilan(integer) from public, anon, authenticated;
grant execute on function public.pilotage_bilan(integer) to service_role;
comment on function public.pilotage_bilan(integer) is 'Premiers contacts froids du bilan, bornés à 200.';
create or replace function public.pilotage_appels(p_limite integer)
returns table(id uuid, source text, prospect text, telephone text, contexte text, creneau timestamptz, recu_le timestamptz)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select a.id,a.source,a.prospect,a.telephone,a.contexte,a.creneau,a.recu_le from (
 select v.id,'rdv'::text as source,p.entreprise::text as prospect,v.telephone::text as telephone,concat_ws(' · ',p.metier,p.commune)::text as contexte,v.creneau as creneau,v.reserve_le as recu_le
 from ops.rendez_vous v left join ops.prospects p on p.id=v.prospect_id
 where v.statut = 'reserve' and v.appel_rendu_le is null
 union all
 select r.id,'reponse'::text as source,p.entreprise::text as prospect,
 (regexp_match(r.texte,'((\+33|0)[ .-]?[1-9]([ .-]?[0-9]){8})'))[1]::text as telephone,
 left(r.texte,140)::text as contexte,null::timestamptz as creneau,r.recu_le
 from ops.reponses r left join ops.prospects p on p.id=r.prospect_id
 where r.classe='appel' and r.appel_rendu_le is null
 ) a order by coalesce(a.creneau,a.recu_le),a.id limit least(greatest(1,coalesce(p_limite,1)),20)
$$;
revoke all on function public.pilotage_appels(integer) from public, anon, authenticated;
grant execute on function public.pilotage_appels(integer) to service_role;
comment on function public.pilotage_appels(integer) is 'Appels réservés et réponses demandant un appel.';
create or replace function public.pilotage_etat_envoi()
returns table(palier text, envoi_froid boolean, epreuve_passee boolean, epreuve_le timestamptz, mesure_a_sec boolean, notice_verifiee_le timestamptz, technologies_pause text[], modeles_suspendus text[])
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select j->>'palier',(j->>'envoi_froid')::boolean,(j#>>'{epreuve,passee}')::boolean,(j#>>'{epreuve,le}')::timestamptz,
 (j#>>'{mesure_a_sec,passee}')::boolean,(j->>'notice_verifiee_le')::timestamptz,
 array(select x->>'technologie' from jsonb_array_elements(j->'technologies') x where x->>'etat'='pause'),
 array(select jsonb_array_elements_text(j->'modeles_suspendus'))
 from (select public.acq_etat_envoi() j) s
$$;
revoke all on function public.pilotage_etat_envoi() from public, anon, authenticated;
grant execute on function public.pilotage_etat_envoi() to service_role;
comment on function public.pilotage_etat_envoi() is 'État rendu par l acquisition, sans recalcul.';
create or replace function public.pilotage_reponses_du_jour()
returns table(classe text, nombre integer)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select coalesce(r.classe,'a_lire'),count(*)::integer from ops.reponses r
 where r.recu_le>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris')
 and r.recu_le<(((now() at time zone 'Europe/Paris')::date+1)::timestamp at time zone 'Europe/Paris')
 group by coalesce(r.classe,'a_lire')
$$;
revoke all on function public.pilotage_reponses_du_jour() from public, anon, authenticated;
grant execute on function public.pilotage_reponses_du_jour() to service_role;
comment on function public.pilotage_reponses_du_jour() is 'Réponses du jour de Paris, par classe.';
create or replace function public.pilotage_tapis(p_depuis timestamptz)
returns table(etape text, nombre integer)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 with n as (
 select (select count(*)::integer from ops.prospects p where p.cree_le>=p_depuis) trouve,
 (select count(*)::integer from ops.prospects p where p.cree_le>=p_depuis and p.etape in ('verifie','maquette_prete','prepare','envoye','oui','lien_prepare','lien_envoye')) verifie,
 (select count(*)::integer from ops.maquettes m where m.cree_le>=p_depuis) maquette,
 (select count(*)::integer from ops.envois e where e.type='premier_contact' and e.statut='envoye' and e.envoye_le>=p_depuis) contacte,
 (select count(*)::integer from ops.reponses r where not r.auto and r.recu_le>=p_depuis) repondu,
 (select count(*)::integer from ops.reponses r where r.classe in ('oui','question','prix','appel') and r.recu_le>=p_depuis) oui,
 (select count(distinct c.id)::integer from ops.prospects p join public.sites_commandes c on c.id=ops.acq_commande_du_prospect(p.id) where p.froid and c.paye_le>=p_depuis) paye,
 (select count(distinct c.id)::integer from ops.prospects p join public.sites_commandes c on c.id=ops.acq_commande_du_prospect(p.id) where p.froid and c.en_ligne_le>=p_depuis) en_ligne,
 (select count(*)::integer from ops.envois e where e.prepare_le>=p_depuis and (e.verdicts->>'j1'='refus' or e.verdicts->>'j3'='refus' or e.verdicts->>'second'='refus')) rejet,
 (select count(*)::integer from ops.envois e where e.prepare_le>=p_depuis and e.verdicts<>'{}'::jsonb) juges)
 select v.etape,v.nombre from n cross join lateral (values
 ('trouve',n.trouve),('verifie',n.verifie),('maquette',n.maquette),('contacte',n.contacte),('repondu',n.repondu),
 ('oui',n.oui),('paye',n.paye),('en_ligne',n.en_ligne),('rejet',n.rejet),('juges',n.juges)) v(etape,nombre)
$$;
revoke all on function public.pilotage_tapis(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_tapis(timestamptz) to service_role;
comment on function public.pilotage_tapis(timestamptz) is 'Dix étapes de la station depuis la date demandée.';
create or replace function public.pilotage_recettes_agents(p_depuis timestamptz)
returns table(jour date, source text, commandes integer, montant_cents bigint, en_ligne integer)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 with ventes as (
 select distinct c.id,c.paye_le,c.prix_cents,c.en_ligne_le,
 exists(select 1 from ops.prospects p where p.froid and ops.acq_commande_du_prospect(p.id)=c.id) agents
 from public.sites_commandes c where c.paye_le>=greatest(p_depuis,now()-interval '400 days') and c.etat<>'brouillon')
 select (v.paye_le at time zone 'Europe/Paris')::date,case when v.agents then 'agents' else 'hors_agents' end,
 count(*)::integer,sum(v.prix_cents)::bigint,count(*) filter(where v.en_ligne_le is not null)::integer
 from ventes v group by 1,2 order by 1 desc,2
$$;
revoke all on function public.pilotage_recettes_agents(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_recettes_agents(timestamptz) to service_role;
comment on function public.pilotage_recettes_agents(timestamptz) is 'Recettes payées, attribuées aux contacts froids ou non.';
create or replace function public.pilotage_atelier(p_depuis timestamptz)
returns table(id uuid, metier text, commune text, statut text, video boolean, verdict text, le timestamptz)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select m.id,p.metier,p.commune,case when m.purgee_le is not null then 'purgee' when m.expire_le<now() then 'expiree' else 'prete' end,
 coalesce(m.objets ? 'video',false),null::text,m.cree_le
 from ops.maquettes m join ops.prospects p on p.id=m.prospect_id where m.cree_le>=p_depuis order by m.cree_le desc limit 30
$$;
revoke all on function public.pilotage_atelier(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_atelier(timestamptz) to service_role;
comment on function public.pilotage_atelier(timestamptz) is 'Maquettes récentes et état de conservation.';
create or replace function public.pilotage_reponses_recentes(p_limite integer)
returns table(id uuid, recu_le timestamptz, classe text, texte_recu text, reponse_envoyee text)
language sql stable security definer set search_path = ops, public, pg_temp as $$
 select r.id,r.recu_le,r.classe,r.texte,
 (select e.texte from ops.envois e where e.prospect_id=r.prospect_id and e.type='reponse' and e.prepare_le>=r.recu_le order by e.prepare_le limit 1)
 from ops.reponses r order by r.recu_le desc limit least(greatest(1,coalesce(p_limite,1)),10)
$$;
revoke all on function public.pilotage_reponses_recentes(integer) from public, anon, authenticated;
grant execute on function public.pilotage_reponses_recentes(integer) to service_role;
comment on function public.pilotage_reponses_recentes(integer) is 'Textes exacts pour la fiche réservée du Répondeur.';

$migration_026$;

  declare
    v_minuit timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
    v_p uuid; v_pc uuid; v_pv uuid; v_e uuid[] := '{}'; v_hier uuid; v_vieux uuid;
    v_froids boolean;
  begin

  declare ok boolean := false; i integer; v_id uuid;
  begin

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
    ok := cardinality(v_e) = 3;
    r := r || jsonb_build_object('preparation', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('preparation', false, 'diag_preparation', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := (select count(*) from public.pilotage_envois_du_jour() where id = any(v_e)) = 3
      and not exists (select 1 from public.pilotage_envois_du_jour() where id = v_hier)
      and (select bool_and(verdicts ? 'j1' and verdicts ? 'j3' and verdicts ? 'second') from public.pilotage_envois_du_jour() where id = any(v_e))
      and exists (select 1 from public.pilotage_envois_du_jour() where id = v_e[2] and verdicts->>'j3' = 'refus');
    r := r || jsonb_build_object('envois_du_jour', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('envois_du_jour', false, 'diag_envois_du_jour', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := (select count(*) > 0 and bool_and(plafond = coalesce((public.acq_plafond_du_jour(canal)->>'envois')::integer, 0) and utilises = coalesce((public.acq_envois_du_jour(canal)->>'envois')::integer, 0)) from public.pilotage_compteurs_du_jour())
      and not exists (select 1 from public.pilotage_compteurs_du_jour() where canal = 'email');
    r := r || jsonb_build_object('compteurs_egaux', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('compteurs_egaux', false, 'diag_compteurs_egaux', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le) values ('essai_e2e:pilotage:auto', v_e[1], v_p, 'essai_e2e', 'essai', 'Réponse automatique d''absence', true, now());
    ok := exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_e[1] and froid and not repondu)
      and exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_hier and not froid)
      and not exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_vieux);
    r := r || jsonb_build_object('entonnoir', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('entonnoir', false, 'diag_entonnoir', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_ok boolean;
  begin

    if v_froids then
      ok := true;
      r := r || jsonb_build_object('diag_bilan_vide', 'branche sautée : des contacts froids réels sont déjà partis');
    else
      
    begin
      delete from ops.reponses where prospect_id in (v_p, v_pc, v_pv);
      delete from ops.envois where id = v_vieux or id = any(v_e);
      ok := (select count(*) = 1 and bool_and(bilan_le is null and verdict is null and prolonge_jusqua is null) from public.pilotage_bilan_date())
        and (select count(*) = 0 from public.pilotage_bilan(100));
      v_ok := ok;
      raise sqlstate 'EA000';
    exception when sqlstate 'EA000' then null;
    end;
      ok := v_ok;
    end if;
    r := r || jsonb_build_object('bilan_vide', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('bilan_vide', false, 'diag_bilan_vide', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; i integer; v_id uuid; v_b uuid[] := '{}'; v_ok boolean;
  begin

    
    begin
    delete from ops.reponses where prospect_id in (v_p, v_pc, v_pv);
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
      and (v_froids or (select array_agg(id order by envoye_le) from public.pilotage_bilan(100)) = v_b[1:100]);
      raise sqlstate 'EA000';
    exception when sqlstate 'EA000' then null;
    end;
    ok := v_ok;
    r := r || jsonb_build_object('bilan_101', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('bilan_101', false, 'diag_bilan_101', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    insert into ops.technologies (technologie, etat, pause_motif) values ('essai_e2e_techno', 'pause', 'essai de pause') on conflict (technologie) do update set etat = 'pause', pause_motif = 'essai de pause';
    ok := exists (select 1 from public.pilotage_compteurs_technologies() where technologie = 'essai_e2e_techno' and etat = 'pause' and pause_motif = 'essai de pause')
      and exists (select 1 from public.pilotage_etat_envoi() where 'essai_e2e_techno' = any(technologies_pause));
    r := r || jsonb_build_object('technologie_pause', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('technologie_pause', false, 'diag_technologie_pause', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_rep uuid; v_r1 uuid; v_r2 uuid; v_ids uuid[];
  begin

    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe, traitee_le) values ('essai_e2e:pilotage:appel', v_e[1], v_p, 'essai_e2e', 'essai', 'Rappelez-moi au 06 12 34 56 78 svp', false, now() - interval '1 day', 'appel', now()) returning id into v_rep;
    insert into ops.rendez_vous (prospect_id, creneau, telephone, statut, reserve_le) values (v_p, date_trunc('hour', now()) + interval '1 day', '0611223344', 'reserve', now()) returning id into v_r1;
    insert into ops.rendez_vous (prospect_id, creneau, telephone, statut, reserve_le) values (v_p, date_trunc('hour', now()) + interval '2 days', '0611223355', 'reserve', now()) returning id into v_r2;
    select array_agg(x.id order by x.n) into v_ids from (select a.id, row_number() over () as n from public.pilotage_appels(20) a) x where x.id in (v_rep, v_r1, v_r2);
    ok := v_ids = array[v_rep, v_r1, v_r2]
      and exists (select 1 from public.pilotage_appels(20) where id = v_r1 and source = 'rdv' and telephone = '0611223344' and contexte = 'Plombier · Lyon' and creneau is not null)
      and exists (select 1 from public.pilotage_appels(20) where id = v_rep and source = 'reponse' and regexp_replace(telephone, '\D', '', 'g') = '0612345678');
    update ops.rendez_vous set appel_rendu_le = now() where id = v_r1;
    update ops.reponses set appel_rendu_le = now() where id = v_rep;
    ok := ok and not exists (select 1 from public.pilotage_appels(20) where id in (v_r1, v_rep)) and exists (select 1 from public.pilotage_appels(20) where id = v_r2);
    r := r || jsonb_build_object('appels_ordre', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('appels_ordre', false, 'diag_appels_ordre', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_rep uuid;
  begin

    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe) values ('essai_e2e:pilotage:appel2', v_e[2], v_p, 'essai_e2e', 'essai', 'Appelez-moi demain matin', false, now(), 'appel') returning id into v_rep;
    ok := exists (select 1 from public.pilotage_appels(20) where id = v_rep and telephone is null);
    r := r || jsonb_build_object('appel_sans_numero', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('appel_sans_numero', false, 'diag_appel_sans_numero', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_avant jsonb; v_apres jsonb;
  begin

    select coalesce(jsonb_object_agg(classe, nombre), '{}') into v_avant from public.pilotage_reponses_du_jour();
    insert into ops.reponses (id_externe, envoi_id, prospect_id, canal, source, texte, auto, recu_le, classe) values
      ('essai_e2e:pilotage:prix1', v_e[1], v_p, 'essai_e2e', 'essai', 'Combien ?', false, now(), 'prix'),
      ('essai_e2e:pilotage:prix2', v_e[2], v_p, 'essai_e2e', 'essai', 'Quel prix ?', false, now(), 'prix'),
      ('essai_e2e:pilotage:lire', v_e[3], v_p, 'essai_e2e', 'essai', 'Bonjour', false, now(), null),
      ('essai_e2e:pilotage:hier', v_e[3], v_p, 'essai_e2e', 'essai', 'Hier', false, v_minuit - interval '2 hours', 'prix');
    select coalesce(jsonb_object_agg(classe, nombre), '{}') into v_apres from public.pilotage_reponses_du_jour();
    ok := coalesce((v_apres->>'prix')::int, 0) = coalesce((v_avant->>'prix')::int, 0) + 2 and coalesce((v_apres->>'a_lire')::int, 0) = coalesce((v_avant->>'a_lire')::int, 0) + 1;
    r := r || jsonb_build_object('reponses_du_jour', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('reponses_du_jour', false, 'diag_reponses_du_jour', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    perform public.ops_evenement_ajouter('systeme', 'mesure_a_sec', 'essai', 'PASS mesure à sec d''essai', null);
    ok := (select count(*) = 1 from public.pilotage_etat_envoi())
      and (select envoi_froid = (select actif from ops.interrupteurs where nom = 'envoi_froid') and mesure_a_sec from public.pilotage_etat_envoi());
    r := r || jsonb_build_object('etat_envoi', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('etat_envoi', false, 'diag_etat_envoi', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_n0 bigint;
  begin

    v_n0 := public.acq_ventes_froides(now() - interval '60 days');
    insert into public.sites_commandes (email, matiere, etat, prix_cents, paye_le) values ('essai1@essai-pilotage.invalid', '{"siren": "900000001"}'::jsonb, 'payee', 30000, now());
    insert into public.sites_commandes (email, matiere, etat, prix_cents, paye_le) values ('essai2@essai-pilotage.invalid', '{"siren": "900000002"}'::jsonb, 'payee', 30000, now());
    insert into public.sites_commandes (email, matiere, etat, prix_cents) values ('essai3@essai-pilotage.invalid', '{"siren": "900000003"}'::jsonb, 'brouillon', 30000);
    ok := exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_e[1] and vente)
      and not exists (select 1 from public.pilotage_entonnoir(now() - interval '60 days') where id = v_hier and vente and froid)
      and public.acq_ventes_froides(now() - interval '60 days') = v_n0 + 1
      and exists (select 1 from public.pilotage_recettes_agents(now() - interval '1 day') where source = 'agents' and commandes >= 1)
      and exists (select 1 from public.pilotage_recettes_agents(now() - interval '1 day') where source = 'hors_agents' and commandes >= 1)
      and (select nombre >= 1 from public.pilotage_tapis(v_minuit) where etape = 'paye');
    r := r || jsonb_build_object('vente_froide', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('vente_froide', false, 'diag_vente_froide', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; v_etapes text[];
  begin

    select array_agg(x.etape order by x.n) into v_etapes from (select t.etape, row_number() over () as n from public.pilotage_tapis(v_minuit) t) x;
    ok := v_etapes = array['trouve', 'verifie', 'maquette', 'contacte', 'repondu', 'oui', 'paye', 'en_ligne', 'rejet', 'juges'];
    r := r || jsonb_build_object('tapis_dix_lignes', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('tapis_dix_lignes', false, 'diag_tapis_dix_lignes', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := not exists (select 1 from jsonb_object_keys((select to_jsonb(x) from public.pilotage_envois_du_jour() x limit 1)) k where k ~ '^(texte|destinataire|entreprise)');
    r := r || jsonb_build_object('sans_texte', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('sans_texte', false, 'diag_sans_texte', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; n integer := 0;
  begin

    begin execute 'set local role anon'; perform public.pilotage_envois_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_envois_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_compteurs_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_compteurs_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_compteurs_technologies(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_compteurs_technologies(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_entonnoir(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_entonnoir(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_bilan_date(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_bilan_date(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_bilan(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_bilan(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_appels(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_appels(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_etat_envoi(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_etat_envoi(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_reponses_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_reponses_du_jour(); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_tapis(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_tapis(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_recettes_agents(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_recettes_agents(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_atelier(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_atelier(now()); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; perform public.pilotage_reponses_recentes(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform public.pilotage_reponses_recentes(1); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    execute 'reset role';
    ok := n = 26;
    r := r || jsonb_build_object('diag_refus_anon_authenticated', n || '/' || 26);
    r := r || jsonb_build_object('refus_anon_authenticated', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('refus_anon_authenticated', false, 'diag_refus_anon_authenticated', left(sqlstate || ' ' || sqlerrm, 200));
  end;
  end;
  raise exception 'ESSAI_A_SEC % %', '4b78aa729c13431f68c31ba0a154a96b99edab06f01e45c35484bab51ce089b6', r::text;
end $essai_026$;
