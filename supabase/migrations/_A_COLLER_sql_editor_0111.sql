---------------------------- _A_COLLER_sql_editor_0111.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists ops.paliers (
 id text primary key check (id in ('P0','P1','P2','P3','P4')),
 canal text not null default 'formulaire_site', par_jour int not null check (par_jour between 0 and 300),
 jours_au_vert int, regle text
);
insert into ops.paliers(id,par_jour,jours_au_vert,regle) values
 ('P0',5,5,'5 jours au vert'),('P1',10,5,'5 jours au vert'),
 ('P2',20,null,'passage au bilan seulement (P2 lui-même ne demande que la sécurité)'),
 ('P3',30,5,'5 jours au vert'),('P4',40,null,'plafond des agents : au-delà, seul Benj')
on conflict do nothing;
create table if not exists ops.etat_envoi (
 id boolean primary key default true check(id), palier text not null default 'P0' references ops.paliers(id),
 palier_depuis date not null default (now() at time zone 'Europe/Paris')::date,
 bilan_le date, bilan_verdict text check (bilan_verdict in ('P3','nouveau_message','arret_froid')),
 p2_prolonge_jusqua date, formulaire_coupe_jusqua timestamptz, formulaire_coupe_motif text,
 gmail_coupe_jusqua timestamptz, meta_coupe_jusqua timestamptz,
 notice_verifiee_le timestamptz, maj_le timestamptz not null default now()
);
insert into ops.etat_envoi(id,palier) values(true,'P0') on conflict do nothing;
create table if not exists ops.technologies (
 technologie text primary key, etat text not null default 'active' check(etat in ('active','pause')),
 pause_jusqua timestamptz, pause_motif text check(char_length(pause_motif)<=200),
 echecs_affilee int not null default 0, envois_300 int not null default 0,
 reponses_300 int not null default 0, maj_le timestamptz not null default now()
);
create table if not exists ops.signaux (
 id bigint generated always as identity primary key,
 type text not null check(type in ('stop','plainte','avis_abus','echec_soumission','reponse_positive','gmail_refus','erreur_meta_politique','erreur_meta_debit')),
 envoyeur text, envoi_id uuid references ops.envois(id) on delete set null,
 modele_id text, technologie text, le timestamptz not null default now()
);
create index if not exists signaux_type_le on ops.signaux(type,le);
create index if not exists signaux_modele_le on ops.signaux(modele_id,le);
create index if not exists signaux_technologie_le on ops.signaux(technologie,le);
create table if not exists ops.modeles_suspendus (
 modele_id text primary key, motif text check(char_length(motif)<=200),
 le timestamptz not null default now(), par text
);
create table if not exists ops.jauges (
 fournisseur text not null, periode text not null check(periode ~ '^([0-9]{4}-[0-9]{2}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2})$'),
 utilise int not null default 0 check(utilise>=0), plafond int not null check(plafond>=0),
 maj_le timestamptz not null default now(), primary key(fournisseur,periode)
);
alter table ops.paliers enable row level security;
alter table ops.etat_envoi enable row level security;
alter table ops.technologies enable row level security;
alter table ops.signaux enable row level security;
alter table ops.modeles_suspendus enable row level security;
alter table ops.jauges enable row level security;
revoke all on ops.paliers,ops.etat_envoi,ops.technologies,ops.signaux,ops.modeles_suspendus,ops.jauges from public,anon,authenticated,service_role;
create or replace function ops.maintenant() returns timestamptz language sql stable security definer set search_path = public, ops, pg_temp as $$ select now() $$;
revoke all on function ops.maintenant() from public,anon,authenticated,service_role;
create or replace function ops.garde_modeles() returns trigger language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if new.statut = 'approuve' and exists(select 1 from ops.modeles_suspendus where modele_id=new.modele_id) then
  raise exception 'ops:modele_suspendu';
 end if;
 return new;
end $$;
revoke all on function ops.garde_modeles() from public,anon,authenticated,service_role;
drop trigger if exists garde_modeles on ops.envois;
create trigger garde_modeles before insert or update of statut on ops.envois for each row execute function ops.garde_modeles();
create or replace function ops.suivre_technologies() returns trigger language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if new.canal='formulaire_site' and new.statut='envoye' and old.statut is distinct from 'envoye' and new.technologie is not null then
  insert into ops.technologies(technologie,echecs_affilee) values(new.technologie,0)
  on conflict(technologie) do update set echecs_affilee=0,maj_le=ops.maintenant();
 end if;
 return new;
end $$;
revoke all on function ops.suivre_technologies() from public,anon,authenticated,service_role;
drop trigger if exists suivre_technologies on ops.envois;
create trigger suivre_technologies after update of statut on ops.envois for each row execute function ops.suivre_technologies();
create or replace function public.acq_palier_appliquer() returns void language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v ops.etat_envoi%rowtype; n int; ouvert boolean;
begin
 select * into v from ops.etat_envoi where id for update;
 select actif into ouvert from ops.interrupteurs where nom='envoi_froid';
 select par_jour into n from ops.paliers where id=v.palier;
 if not coalesce(ouvert,false) or coalesce(v.formulaire_coupe_jusqua>ops.maintenant(),false) or v.notice_verifiee_le is null or v.notice_verifiee_le<ops.maintenant()-interval '7 days' then n:=0; end if;
 insert into ops.quotas_canaux(canal,envoyeur,plafond_jour,plafond_nouveaux_jour) values('formulaire_site','*',n,n)
 on conflict(canal,envoyeur) do update set plafond_jour=excluded.plafond_jour,plafond_nouveaux_jour=excluded.plafond_nouveaux_jour,maj_le=ops.maintenant();
 insert into ops.quotas_canaux(canal,envoyeur,plafond_jour,plafond_nouveaux_jour) values('email_sollicite','*',case when v.gmail_coupe_jusqua>ops.maintenant() then 0 else 50 end,0)
 on conflict(canal,envoyeur) do update set plafond_jour=excluded.plafond_jour,plafond_nouveaux_jour=0,maj_le=ops.maintenant();
 insert into ops.quotas_canaux(canal,envoyeur,plafond_jour,plafond_nouveaux_jour) values
 ('reponse_privee','*',case when v.meta_coupe_jusqua>ops.maintenant() then 0 else 50 end,0),
 ('messagerie','*',case when v.meta_coupe_jusqua>ops.maintenant() then 0 else 100 end,0)
 on conflict(canal,envoyeur) do update set plafond_jour=excluded.plafond_jour,plafond_nouveaux_jour=0,maj_le=ops.maintenant();
end $$;
revoke all on function public.acq_palier_appliquer() from public,anon,authenticated;
grant execute on function public.acq_palier_appliquer() to service_role;
create or replace function public.acq_etat_envoi() returns jsonb language plpgsql stable security definer set search_path = public, ops, pg_temp as $$
declare v ops.etat_envoi%rowtype; ads record; ep record; mesure record;
begin
 select * into v from ops.etat_envoi where id;
 select le,resume into ads from ops.evenements where agent='systeme' and type='lecture_ads_archive' order by le desc,id desc limit 1;
 select le,resume into ep from ops.evenements where agent='systeme' and type='epreuve_bout_en_bout' order by le desc,id desc limit 1;
 select le,resume into mesure from ops.evenements where agent='systeme' and type='mesure_a_sec' order by le desc,id desc limit 1;
 return jsonb_build_object('palier',v.palier,'envoi_froid',(select actif from ops.interrupteurs where nom='envoi_froid'),
  'formulaire_coupe_jusqua',v.formulaire_coupe_jusqua,'formulaire_coupe_motif',v.formulaire_coupe_motif,
  'gmail_coupe_jusqua',v.gmail_coupe_jusqua,'meta_coupe_jusqua',v.meta_coupe_jusqua,
  'technologies',coalesce((select jsonb_agg(jsonb_build_object('technologie',technologie,'etat',etat)) from ops.technologies),'[]'::jsonb),
  'modeles_suspendus',coalesce((select jsonb_agg(modele_id) from ops.modeles_suspendus),'[]'::jsonb),
  'notice_verifiee_le',v.notice_verifiee_le,'bilan_le',v.bilan_le,'bilan_verdict',v.bilan_verdict,
  'releve_gmail_le',(select maj_le from ops.curseurs where nom='gmail'),
  'ads_archive',jsonb_build_object('permis',coalesce(ads.resume like 'PERMIS%',false),'le',ads.le),
  'epreuve',jsonb_build_object('passee',coalesce(ep.resume like 'PASS%',false),'le',ep.le),
  'mesure_a_sec',jsonb_build_object('passee',coalesce(mesure.resume like 'PASS%',false),'le',mesure.le));
end $$;
revoke all on function public.acq_etat_envoi() from public,anon,authenticated;
grant execute on function public.acq_etat_envoi() to service_role;
create or replace function public.acq_notice_verifiee(p_le timestamptz) returns void language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if p_le is null or p_le>ops.maintenant() then raise exception 'ops:date'; end if;
 update ops.etat_envoi set notice_verifiee_le=p_le,maj_le=ops.maintenant() where id;
 perform public.acq_palier_appliquer();
end $$;
revoke all on function public.acq_notice_verifiee(timestamptz) from public,anon,authenticated;
grant execute on function public.acq_notice_verifiee(timestamptz) to service_role;
create or replace function public.acq_modele_suspendre(p_modele text,p_motif text,p_par text) returns void language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if nullif(btrim(p_modele),'') is null then raise exception 'ops:modele'; end if;
 insert into ops.modeles_suspendus(modele_id,motif,par) values(p_modele,left(p_motif,200),p_par) on conflict do nothing;
 insert into ops.evenements(agent,type,resume) values('systeme','disjoncteur_modele','Modèle suspendu');
end $$;
revoke all on function public.acq_modele_suspendre(text,text,text) from public,anon,authenticated;
grant execute on function public.acq_modele_suspendre(text,text,text) to service_role;
create or replace function public.acq_modeles_suspendus() returns text[] language sql stable security definer set search_path = public, ops, pg_temp as $$ select coalesce(array_agg(modele_id),'{}'::text[]) from ops.modeles_suspendus $$;
revoke all on function public.acq_modeles_suspendus() from public,anon,authenticated;
grant execute on function public.acq_modeles_suspendus() to service_role;
create or replace function public.acq_signal(p jsonb) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare t text:=p->>'type'; tech text:=p->>'technologie'; mod text:=p->>'modele_id'; action text:=null; descendre boolean:=false; v_palier text; v_echecs int; v_n int;
begin
 if t not in ('stop','plainte','avis_abus','echec_soumission','reponse_positive','gmail_refus','erreur_meta_politique','erreur_meta_debit') then raise exception 'ops:signal'; end if;
 insert into ops.signaux(type,envoyeur,envoi_id,modele_id,technologie,le) values(t,p->>'envoyeur',nullif(p->>'envoi_id','')::uuid,mod,tech,ops.maintenant());
 if t='avis_abus' then
  update ops.etat_envoi set formulaire_coupe_jusqua=greatest(coalesce(formulaire_coupe_jusqua,ops.maintenant()),ops.maintenant()+interval '48 hours'),formulaire_coupe_motif='avis_abus',maj_le=ops.maintenant() where id;
  action:='disjoncteur_formulaire'; descendre:=true;
 elsif t='plainte' and (select count(*) from ops.signaux where type='plainte' and le>=ops.maintenant()-interval '7 days')>=2 then
  update ops.etat_envoi set formulaire_coupe_jusqua='infinity',formulaire_coupe_motif='plainte',maj_le=ops.maintenant() where id;
  action:='disjoncteur_formulaire'; descendre:=true;
 elsif t='plainte' then
  descendre:=true;
 elsif t='gmail_refus' then
  update ops.etat_envoi set gmail_coupe_jusqua=greatest(coalesce(gmail_coupe_jusqua,ops.maintenant()),ops.maintenant()+interval '24 hours'),
   formulaire_coupe_jusqua=greatest(formulaire_coupe_jusqua,ops.maintenant()+interval '24 hours'),formulaire_coupe_motif='gmail_refus',maj_le=ops.maintenant() where id;
  action:='disjoncteur_gmail'; descendre:=true;
 elsif t in ('erreur_meta_politique','erreur_meta_debit') then
  update ops.etat_envoi set meta_coupe_jusqua=greatest(coalesce(meta_coupe_jusqua,ops.maintenant()),ops.maintenant()+interval '24 hours'),maj_le=ops.maintenant() where id;
  action:='disjoncteur_meta'; descendre:=true;
 elsif t='echec_soumission' and tech is not null then
  insert into ops.technologies(technologie,echecs_affilee) values(tech,1)
   on conflict(technologie) do update set echecs_affilee=ops.technologies.echecs_affilee+1,maj_le=ops.maintenant()
   returning echecs_affilee into v_echecs;
  if v_echecs>=3 then
   update ops.technologies set etat='pause',pause_motif='3 echecs de soumission',pause_jusqua=null where technologie=tech and etat='active';
   if found then action:='disjoncteur_technologie'; descendre:=true; end if;
  end if;
 elsif t='stop' and mod is not null then
  select count(*) into v_n from (select s.type from ops.signaux s where s.modele_id=mod order by s.le desc limit 100) s where s.type='stop';
  if v_n>=4 then perform public.acq_modele_suspendre(mod,'4 STOP sur 100','systeme'); action:='disjoncteur_modele'; descendre:=true; end if;
 end if;
 if action is not null then insert into ops.evenements(agent,type,resume) values('systeme',action,left(action,200)); end if;
 if descendre then
  select palier into v_palier from ops.etat_envoi where id for update;
  update ops.etat_envoi set palier=case v_palier when 'P4' then 'P3' when 'P3' then 'P2' when 'P2' then 'P1' when 'P1' then 'P0' else 'P0' end,
   palier_depuis=(ops.maintenant() at time zone 'Europe/Paris')::date,maj_le=ops.maintenant() where id;
  insert into ops.evenements(agent,type,resume) values('systeme','palier_descendu','Palier descendu après un signal rouge');
  perform public.acq_palier_appliquer();
 end if;
 return jsonb_build_object('actions',case when action is null then '[]'::jsonb when descendre then jsonb_build_array(action,'palier_descendu') else jsonb_build_array(action) end);
end $$;
revoke all on function public.acq_signal(jsonb) from public,anon,authenticated;
grant execute on function public.acq_signal(jsonb) to service_role;
create or replace function public.acq_palier_evaluer() returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v ops.etat_envoi%rowtype; j date:=(ops.maintenant() at time zone 'Europe/Paris')::date;
 n int; verts int:=0; curseur date; oui int; ventes int; prochain text; centieme timestamptz; bilan date;
begin
 select * into v from ops.etat_envoi where id for update;
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
 if v.palier in ('P0','P1','P3') and verts>=5 then
  prochain:=case v.palier when 'P0' then 'P1' when 'P1' then 'P2' when 'P3' then 'P4' end;
  update ops.etat_envoi set palier=prochain,palier_depuis=j,maj_le=ops.maintenant() where id;
  insert into ops.evenements(agent,type,resume) values('systeme','palier_monte','Palier monté à '||prochain);
 elsif v.palier='P2' and v.bilan_le is not null and j>=coalesce(v.p2_prolonge_jusqua,v.bilan_le) and v.bilan_verdict is distinct from 'P3' and v.bilan_verdict is distinct from 'arret_froid' then
  select count(distinct e.prospect_id) into oui from ops.reponses r join ops.envois e on e.id=r.envoi_id join ops.prospects p on p.id=e.prospect_id
   where p.froid and e.type='premier_contact' and e.statut='envoye' and r.classe='oui' and e.envoye_le<=ops.maintenant();
  ventes:=public.acq_ventes_froides('-infinity'::timestamptz);
  if ventes>=1 or oui>=4 then
   update ops.etat_envoi set palier='P3',palier_depuis=j,bilan_verdict='P3',maj_le=ops.maintenant() where id;
   insert into ops.evenements(agent,type,resume) values('systeme','bilan_p3','Bilan favorable : passage à P3');
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
create or replace function public.acq_disjoncteurs_etat() returns jsonb language plpgsql stable security definer set search_path = public, ops, pg_temp as $$
declare v jsonb;
begin
 v:=public.acq_etat_envoi();
 return v || jsonb_build_object('technologies',coalesce((select jsonb_agg(jsonb_build_object('technologie',technologie,'etat',etat,'motif',pause_motif,'echecs_affilee',echecs_affilee,'envois_300',envois_300,'reponses_300',reponses_300)) from ops.technologies),'[]'::jsonb),
 'bilan',jsonb_build_object('le',v->'bilan_le','verdict',v->'bilan_verdict'),
 'alerte_message',exists(select 1 from ops.technologies where envois_300>=300 and reponses_300=0));
end $$;
revoke all on function public.acq_disjoncteurs_etat() from public,anon,authenticated;
grant execute on function public.acq_disjoncteurs_etat() to service_role;
create or replace function ops.acq_commande_du_prospect(p_prospect uuid) returns uuid language sql stable security definer set search_path = public, ops, pg_temp as $$
 select c.id from ops.prospects p join public.sites_commandes c on
  ((p.siren is not null and c.matiere->>'siren'=p.siren) or (p.domaine is not null and lower(c.domaine)=lower(p.domaine)))
 where p.id=p_prospect and c.etat<>'brouillon' order by c.cree_le,c.id limit 1
$$;
revoke all on function ops.acq_commande_du_prospect(uuid) from public,anon,authenticated,service_role;
create or replace function public.acq_ventes_froides(p_depuis timestamptz) returns int language sql stable security definer set search_path = public, ops, pg_temp as $$
 select count(distinct ops.acq_commande_du_prospect(p.id))::int from ops.prospects p
 join ops.envois e on e.prospect_id=p.id and e.type='premier_contact' and e.statut='envoye'
 where p.froid and e.envoye_le>=p_depuis and ops.acq_commande_du_prospect(p.id) is not null
$$;
revoke all on function public.acq_ventes_froides(timestamptz) from public,anon,authenticated;
grant execute on function public.acq_ventes_froides(timestamptz) to service_role;
create or replace function public.acq_jauge_consommer(p_fournisseur text,p_periode text,p_n int,p_plafond int) returns boolean language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v int;
begin
 if p_n<=0 or p_plafond<0 or p_n>p_plafond then return false; end if;
 insert into ops.jauges(fournisseur,periode,utilise,plafond) values(p_fournisseur,p_periode,p_n,p_plafond)
 on conflict(fournisseur,periode) do update set utilise=ops.jauges.utilise+excluded.utilise,
  plafond=least(ops.jauges.plafond,excluded.plafond),maj_le=ops.maintenant()
 where ops.jauges.utilise+excluded.utilise<=least(ops.jauges.plafond,excluded.plafond)
 returning utilise into v;
 return found;
end $$;
revoke all on function public.acq_jauge_consommer(text,text,int,int) from public,anon,authenticated;
grant execute on function public.acq_jauge_consommer(text,text,int,int) to service_role;
create or replace function public.acq_jauges() returns jsonb language plpgsql stable security definer set search_path = public, ops, pg_temp as $$
declare j date:=(ops.maintenant() at time zone 'Europe/Paris')::date; pub int:=0;
begin
 if to_regclass('public.crieur_posts') is not null then
  execute 'select count(*) from public.crieur_posts where statut in (''brouillon_publora'',''programmee'') and programmee_pour > $1' into pub using ops.maintenant();
 end if;
 return jsonb_build_object('jauges',coalesce((select jsonb_agg(to_jsonb(x)) from ops.jauges x where x.periode like to_char(j,'YYYY-MM')||'%'),'[]'::jsonb),
 'formulaires_jour',public.acq_envois_du_jour('formulaire_site','*'),
 'email_sollicite_jour',public.acq_envois_du_jour('email_sollicite','*'),
 'reponse_privee_jour',public.acq_envois_du_jour('reponse_privee','*'),
 'messagerie_jour',public.acq_envois_du_jour('messagerie','*'),
 'technologies',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from ops.technologies t),
 'programmees_a_venir',pub,
 'cout_agents_mois',(select coalesce(sum(montant_eur),0) from ops.couts where le>=date_trunc('month',ops.maintenant() at time zone 'Europe/Paris') at time zone 'Europe/Paris'));
end $$;
revoke all on function public.acq_jauges() from public,anon,authenticated;
grant execute on function public.acq_jauges() to service_role;
create or replace function public.acq_echantillon_du_soir(p_jour date) returns jsonb language sql stable security definer set search_path = public, ops, pg_temp as $$
 with e as (select id,texte,modele_id,verdicts,row_number() over(order by md5(id::text)) as rang,
 count(*) over() as total from ops.envois where statut='envoye' and (envoye_le at time zone 'Europe/Paris')::date=p_jour)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'texte',texte,'modele_id',modele_id,'verdicts',verdicts)),'[]'::jsonb)
 from e where rang<=greatest(1,ceil(total/10.0)::int)
$$;
revoke all on function public.acq_echantillon_du_soir(date) from public,anon,authenticated;
grant execute on function public.acq_echantillon_du_soir(date) to service_role;
create or replace function public.acq_envoi_froid_ouvrir(p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v_notice timestamptz; deja boolean;
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 select actif into deja from ops.interrupteurs where nom='envoi_froid';
 if deja then return jsonb_build_object('deja',true); end if;
 if (ops.maintenant() at time zone 'Europe/Paris')::date<'2026-10-12'::date then raise exception 'ops:trop_tot'; end if;
 if not exists(select 1 from ops.evenements where agent='systeme' and type='mesure_a_sec' and resume like 'PASS%') then raise exception 'ops:mesure_absente'; end if;
 if not exists(select 1 from ops.evenements where agent='systeme' and type='epreuve_bout_en_bout' and resume like 'PASS%' and le>=ops.maintenant()-interval '30 days') then raise exception 'ops:epreuve_absente'; end if;
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
create or replace function public.acq_technologie_reprendre(p_technologie text,p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 update ops.technologies set etat='active',pause_jusqua=null,pause_motif=null,echecs_affilee=0,maj_le=ops.maintenant() where technologie=p_technologie and etat='pause';
 if found then insert into ops.evenements(agent,type,resume) values('systeme','technologie_reprise','Technologie reprise par le fondateur'); end if;
 return jsonb_build_object('reprise',found);
end $$;
revoke all on function public.acq_technologie_reprendre(text,uuid) from public,anon,authenticated;
grant execute on function public.acq_technologie_reprendre(text,uuid) to service_role;
create or replace function public.acq_canal_rouvrir(p_canal text,p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 if p_canal='formulaire_site' then update ops.etat_envoi set formulaire_coupe_jusqua=null,formulaire_coupe_motif=null where id;
 elsif p_canal='email_sollicite' then update ops.etat_envoi set gmail_coupe_jusqua=null where id;
 elsif p_canal in ('reponse_privee','messagerie') then update ops.etat_envoi set meta_coupe_jusqua=null where id;
 else raise exception 'ops:canal'; end if;
 insert into ops.evenements(agent,type,resume) values('systeme','canal_rouvert','Canal rouvert par le fondateur');
 perform public.acq_palier_appliquer();
 return jsonb_build_object('rouvert',true);
end $$;
revoke all on function public.acq_canal_rouvrir(text,uuid) from public,anon,authenticated;
grant execute on function public.acq_canal_rouvrir(text,uuid) to service_role;
create or replace function public.acq_modele_lever(p_modele text,p_auteur uuid) returns boolean language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare fait boolean;
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 delete from ops.modeles_suspendus where modele_id=p_modele; fait:=found;
 if fait then insert into ops.evenements(agent,type,resume) values('systeme','modele_leve','Modèle levé par le fondateur'); end if;
 return fait;
end $$;
revoke all on function public.acq_modele_lever(text,uuid) from public,anon,authenticated;
grant execute on function public.acq_modele_lever(text,uuid) to service_role;
create or replace function public.acq_palier_plafond(p_id text,p_par_jour int,p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 if p_par_jour is null or p_par_jour<0 or p_par_jour>300 then raise exception 'ops:borne'; end if;
 update ops.paliers set par_jour=p_par_jour where id=p_id;
 if not found then raise exception 'ops:palier'; end if;
 insert into ops.evenements(agent,type,resume) values('systeme','palier_plafond','Plafond de palier modifié par le fondateur');
 perform public.acq_palier_appliquer();
 return jsonb_build_object('palier',p_id,'par_jour',p_par_jour);
end $$;
revoke all on function public.acq_palier_plafond(text,int,uuid) from public,anon,authenticated;
grant execute on function public.acq_palier_plafond(text,int,uuid) to service_role;
select public.acq_palier_appliquer();

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle 0111, lecture seule. Chaque ligne rend oui ou non.
select 'table:'||t.nom as objet,
 case when to_regclass('ops.'||t.nom) is not null
   and (select c.relrowsecurity from pg_class c where c.oid=to_regclass('ops.'||t.nom))
   and not exists(select 1 from pg_policy pol where pol.polrelid=to_regclass('ops.'||t.nom))
   and not has_table_privilege('anon','ops.'||t.nom,'SELECT')
   and not has_table_privilege('authenticated','ops.'||t.nom,'SELECT') then 'oui' else 'non' end as conforme
from (values ('paliers'),('etat_envoi'),('technologies'),('signaux'),('modeles_suspendus'),('jauges')) t(nom)
union all
select 'fonction:'||f.nom,
 case when exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=f.schema and p.proname=f.nom
   and p.prosecdef and has_function_privilege('service_role',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not has_function_privilege('authenticated',p.oid,'EXECUTE')) then 'oui' else 'non' end
from (values
 ('public','acq_etat_envoi'),('public','acq_signal'),('public','acq_palier_evaluer'),
 ('public','acq_palier_appliquer'),('public','acq_notice_verifiee'),('public','acq_modele_suspendre'),
 ('public','acq_modeles_suspendus'),('public','acq_envoi_froid_ouvrir'),('public','acq_technologie_reprendre'),
 ('public','acq_canal_rouvrir'),('public','acq_modele_lever'),('public','acq_palier_plafond'),
 ('public','acq_disjoncteurs_etat'),('public','acq_ventes_froides'),('public','acq_jauge_consommer'),
 ('public','acq_jauges'),('public','acq_echantillon_du_soir')) f(schema,nom)
union all
select 'fonction-privee:'||f.nom,
 case when exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='ops' and p.proname=f.nom
   and not has_function_privilege('service_role',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not has_function_privilege('authenticated',p.oid,'EXECUTE')) then 'oui' else 'non' end
from (values ('maintenant'),('garde_modeles'),('suivre_technologies'),('acq_commande_du_prospect')) f(nom)
union all
select 'declencheur:'||d.nom,
 case when exists(select 1 from pg_trigger t where t.tgrelid='ops.envois'::regclass and t.tgname=d.nom and t.tgenabled<>'D') then 'oui' else 'non' end
from (values ('garde_modeles'),('suivre_technologies')) d(nom)
union all
select 'graine:'||v.id,
 case when p.par_jour=v.par_jour and p.jours_au_vert is not distinct from v.jours_au_vert then 'oui' else 'non' end
from (values ('P0',5,5),('P1',10,5),('P2',20,null::int),('P3',30,5),('P4',40,null::int)) v(id,par_jour,jours_au_vert)
left join ops.paliers p on p.id=v.id
union all
select 'etat:P0',case when exists(select 1 from ops.etat_envoi where id and palier='P0') then 'oui' else 'non' end
union all
select 'absence:ancien-schema',case when to_regclass('ops.boites') is null then 'oui' else 'non' end
union all
select 'absence:second-accord',case when to_regclass('ops.accords_envoi') is null
  and not exists(select 1 from information_schema.columns where table_schema='ops' and table_name='envois' and column_name='attend_accord_benj')
  and to_regclass('ops.accords_benj') is not null then 'oui' else 'non' end;
