---------------------------- _A_COLLER_sql_editor_0108_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select p.proname as fonction,
       p.prosecdef,
       p.provolatile = 's' as stable,
       p.proconfig,
       not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_refuse,
       not has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_refuse,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_autorise
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'pilotage_envois_du_jour','pilotage_compteurs_du_jour','pilotage_compteurs_technologies',
 'pilotage_entonnoir','pilotage_bilan_date','pilotage_bilan','pilotage_appels',
 'pilotage_etat_envoi','pilotage_reponses_du_jour','pilotage_tapis',
 'pilotage_recettes_agents','pilotage_atelier','pilotage_reponses_recentes')
order by p.proname;
select to_regprocedure('ops.pilotage_commande_du_prospect(uuid)') is null as jointure_privee_absente;
