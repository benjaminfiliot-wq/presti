-- 0131_froid_p0_sans_epreuve.sql — l'envoi à froid s'ouvre au palier P0 SANS l'épreuve de bout en bout ; l'épreuve conditionne la MONTÉE (05/10/2026).
-- Décision du propriétaire (Benj, chat, 05/10/2026 soir, « B ») : l'épreuve de bout en bout (026-163) était une exigence que nous nous
-- étions fixée, pas une obligation légale ; la landing n'a même pas de formulaire d'entrée, elle est irréalisable aujourd'hui. On ouvre
-- donc au palier le plus bas (P0 : 5 formulaires par jour), l'épreuve se fera ensuite, en parallèle, et devient la condition pour
-- MONTER de palier (P0 -> P1 -> P2 -> P3 -> P4), non pour ouvrir P0.
-- Le cadre légal reste ENTIER :
--   - acq_envoi_froid_ouvrir : réservée au fondateur (is_founder, avant toute écriture) et au service_role ; exige toujours, dans cet
--     ordre, la mesure à sec PASS (ops:mesure_absente) puis la notice CNIL B2B vérifiée depuis moins de 7 jours (ops:notice_absente) ;
--     seule la ligne « épreuve PASS < 30 jours -> ops:epreuve_absente » disparaît de cette fonction (le code ops:epreuve_absente n'existe
--     plus). Même signature, mêmes droits. Le reste est identique à 0129 (écriture de l'interrupteur, palier_depuis, événement, paliers).
--   - ops_interrupteur_poser (0130) refuse toujours d'ouvrir envoi_froid ; l'interrupteur reste fermé tant que cette fonction ne l'ouvre pas.
--   - acq_palier_appliquer (plafonds par palier, notice < 7 jours, formulaire coupé), les STOP, les opposants, les plafonds
--     (ops.quotas_canaux) et les paliers eux-mêmes (ops.paliers) ne sont PAS touchés.
-- acq_palier_evaluer (0111) est la SEULE fonction qui change le palier. Elle reçoit deux gardes sur toute montée (P0->P1, P1->P2,
-- P2->P3, P3->P4) :
--   (1) l'épreuve de bout en bout : un événement systeme/epreuve_bout_en_bout dont le résumé commence par PASS, de moins de 30 jours ;
--       sans lui la montée est retenue et un événement palier_attente_epreuve est écrit (une fois par jour) ;
--   (2) l'envoi à froid doit être OUVERT : avant 0131 la fonction pouvait monter P0 -> P1 alors que l'interrupteur était encore fermé
--       (palier_depuis valait la date de la graine) ; l'ouverture aurait alors commencé à 10 par jour et non à 5.
-- Le reste de la fonction est identique à la définition en vigueur (0111) : descentes, bilan P2, arrêt du froid, compteurs.
-- Rejouable sans dommage (create or replace + revoke/grant).
create or replace function public.acq_envoi_froid_ouvrir(p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v_notice timestamptz; deja boolean;
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 select actif into deja from ops.interrupteurs where nom='envoi_froid';
 if deja then return jsonb_build_object('deja',true); end if;
 if not exists(select 1 from ops.evenements where agent='systeme' and type='mesure_a_sec' and resume like 'PASS%') then raise exception 'ops:mesure_absente'; end if;
 select notice_verifiee_le into v_notice from ops.etat_envoi where id for update;
 if v_notice is null or v_notice<ops.maintenant()-interval '7 days' then raise exception 'ops:notice_absente'; end if;
 update ops.interrupteurs set actif=true,motif='Ouverture par le fondateur',change_le=ops.maintenant(),change_par=p_auteur where nom='envoi_froid';
 update ops.etat_envoi set palier_depuis=(ops.maintenant() at time zone 'Europe/Paris')::date,maj_le=ops.maintenant() where id;
 insert into ops.evenements(agent,type,resume) values('systeme','envoi_froid_ouvert','Envoi froid ouvert par le fondateur');
 perform public.acq_palier_appliquer();
 return jsonb_build_object('deja',false,'ouvert',true);
end $$;
revoke all on function public.acq_envoi_froid_ouvrir(uuid) from public,anon,authenticated;
grant execute on function public.acq_envoi_froid_ouvrir(uuid) to service_role;

create or replace function public.acq_palier_evaluer() returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v ops.etat_envoi%rowtype; j date:=(ops.maintenant() at time zone 'Europe/Paris')::date;
 n int; verts int:=0; curseur date; oui int; ventes int; prochain text; centieme timestamptz; bilan date; epreuve_ok boolean; froid_ouvert boolean;
begin
 select * into v from ops.etat_envoi where id for update;
 -- Les deux gardes de toute montée de palier (0131) : l'épreuve de bout en bout PASS de moins de 30 jours, l'envoi à froid ouvert.
 epreuve_ok:=exists(select 1 from ops.evenements where agent='systeme' and type='epreuve_bout_en_bout' and resume like 'PASS%' and le>=ops.maintenant()-interval '30 days');
 select actif into froid_ouvert from ops.interrupteurs where nom='envoi_froid';
 update ops.technologies set etat='active',pause_jusqua=null,pause_motif=null,echecs_affilee=0,maj_le=ops.maintenant()
  where etat='pause' and pause_jusqua is not null and pause_jusqua<=ops.maintenant();
 update ops.etat_envoi set formulaire_coupe_jusqua=null,formulaire_coupe_motif=null where id and formulaire_coupe_jusqua<=ops.maintenant();
 update ops.etat_envoi set gmail_coupe_jusqua=null where id and gmail_coupe_jusqua<=ops.maintenant();
 update ops.etat_envoi set meta_coupe_jusqua=null where id and meta_coupe_jusqua<=ops.maintenant();
 update ops.technologies t set
  envois_300=(select count(*) from (select 1 from ops.envois e where e.technologie=t.technologie and e.statut='envoye' order by e.envoye_le desc limit 300) x),
  reponses_300=(select count(*) from ops.reponses r where r.envoi_id in
    (select id from ops.envois e where e.technologie=t.technologie and e.statut='envoye' order by e.envoye_le desc limit 300)
    and r.classe in ('oui','question','prix','appel')),
  maj_le=ops.maintenant();
 insert into ops.evenements(agent,type,resume)
  select 'systeme','alerte_message','300 envois sans réponse' from ops.technologies t
  where t.envois_300>=300 and t.reponses_300=0
   and not exists(select 1 from ops.evenements e where e.type='alerte_message' and e.le::date=j);
 if v.notice_verifiee_le is null or v.notice_verifiee_le<ops.maintenant()-interval '7 days' then
  insert into ops.evenements(agent,type,resume)
  select 'systeme','notice_perimee','Notice à revérifier' where not exists(select 1 from ops.evenements where type='notice_perimee' and le::date=j);
 end if;
 -- Le centième envoi froid fixe la seule date du bilan. Le lundi doit être au moins 3 jours après.
 if v.bilan_le is null then
  select e.envoye_le into centieme from ops.envois e join ops.prospects p on p.id=e.prospect_id
   where e.type='premier_contact' and e.statut='envoye' and p.froid
   order by e.envoye_le,e.id offset 99 limit 1;
  if centieme is not null then
   bilan:=((centieme at time zone 'Europe/Paris')::date+1);
   while extract(isodow from bilan)<>1 or bilan-(centieme at time zone 'Europe/Paris')::date<3 loop bilan:=bilan+1; end loop;
   update ops.etat_envoi set bilan_le=bilan,maj_le=ops.maintenant() where id;
   v.bilan_le:=bilan;
  end if;
 end if;
 -- Compteurs absolus des derniers 7 jours et 100 envois. Un jour vert est un jour ouvré
 -- sans signal rouge ; P3 et P4 demandent en plus une réponse positive.
 if extract(isodow from j) between 1 and 5 and
  not exists(select 1 from ops.signaux where type in ('plainte','avis_abus') and le>=ops.maintenant()-interval '7 days') and
  (select count(*) from (select s.type from ops.signaux s join ops.envois e on e.id=s.envoi_id order by e.envoye_le desc limit 100) z where z.type='stop')<4 and
  not exists(select 1 from ops.technologies where echecs_affilee>=3) and
  (v.palier not in ('P3','P4') or exists(select 1 from ops.signaux where type='reponse_positive' and le>=v.palier_depuis::timestamptz)) then
  curseur:=v.palier_depuis;
  while curseur<=j loop
   if extract(isodow from curseur) between 1 and 5 then verts:=verts+1; end if;
   curseur:=curseur+1;
  end loop;
 end if;
 if v.palier in ('P0','P1','P3') and verts>=5 and coalesce(froid_ouvert,false) and epreuve_ok then
  prochain:=case v.palier when 'P0' then 'P1' when 'P1' then 'P2' when 'P3' then 'P4' end;
  update ops.etat_envoi set palier=prochain,palier_depuis=j,maj_le=ops.maintenant() where id;
  insert into ops.evenements(agent,type,resume) values('systeme','palier_monte','Palier monté à '||prochain);
 elsif v.palier in ('P0','P1','P3') and verts>=5 and coalesce(froid_ouvert,false) then
  insert into ops.evenements(agent,type,resume)
  select 'systeme','palier_attente_epreuve','Montée de palier retenue : l''épreuve de bout en bout n''a pas réussi (moins de 30 jours)'
   where not exists(select 1 from ops.evenements where type='palier_attente_epreuve' and le::date=j);
 elsif v.palier='P2' and v.bilan_le is not null and j>=coalesce(v.p2_prolonge_jusqua,v.bilan_le) and v.bilan_verdict is distinct from 'P3' and v.bilan_verdict is distinct from 'arret_froid' then
  select count(distinct e.prospect_id) into oui from ops.reponses r join ops.envois e on e.id=r.envoi_id join ops.prospects p on p.id=e.prospect_id
   where p.froid and e.type='premier_contact' and e.statut='envoye' and r.classe='oui' and e.envoye_le<=ops.maintenant();
  ventes:=public.acq_ventes_froides('-infinity'::timestamptz);
  if ventes>=1 or oui>=4 then
   if epreuve_ok then
    update ops.etat_envoi set palier='P3',palier_depuis=j,bilan_verdict='P3',maj_le=ops.maintenant() where id;
    insert into ops.evenements(agent,type,resume) values('systeme','bilan_favorable','Bilan favorable : passage à P3');
   else
    insert into ops.evenements(agent,type,resume)
    select 'systeme','palier_attente_epreuve','Montée de palier retenue : l''épreuve de bout en bout n''a pas réussi (moins de 30 jours)'
     where not exists(select 1 from ops.evenements where type='palier_attente_epreuve' and le::date=j);
   end if;
  elsif oui>=1 then
   if v.p2_prolonge_jusqua is null then
    curseur:=j; n:=0;
    while n<10 loop curseur:=curseur+1; if extract(isodow from curseur) between 1 and 5 then n:=n+1; end if; end loop;
    update ops.etat_envoi set p2_prolonge_jusqua=curseur,bilan_verdict='nouveau_message',maj_le=ops.maintenant() where id;
    insert into ops.evenements(agent,type,resume) values('systeme','bilan_nouveau_message','Bilan : nouveau message, P2 prolongé');
   end if;
  else
   update ops.interrupteurs set actif=false,motif='bilan sans oui',change_le=ops.maintenant() where nom='envoi_froid';
   update ops.etat_envoi set bilan_verdict='arret_froid',maj_le=ops.maintenant() where id;
   insert into ops.evenements(agent,type,resume) values('systeme','bilan_arret_froid','Bilan : aucun oui, froid fermé');
  end if;
 end if;
 perform public.acq_palier_appliquer();
 return public.acq_etat_envoi();
end $$;
revoke all on function public.acq_palier_evaluer() from public,anon,authenticated;
grant execute on function public.acq_palier_evaluer() to service_role;
