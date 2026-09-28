do $essai_026$
declare
r jsonb := '{}'::jsonb;
begin
execute $migration_026$
alter table ops.envois drop constraint if exists envois_statut_check;
alter table ops.envois add constraint envois_statut_check
check (statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye', 'saute', 'perime', 'annule'));
create table if not exists ops.accords_benj (
id uuid primary key default gen_random_uuid(),
envoi_id uuid not null references ops.envois(id) on delete cascade,
canal text not null,
destinataire text,
empreinte_texte text not null check (empreinte_texte ~ '^[0-9a-f]{64}$'),
donne_par uuid not null references public.artisans(id),
emis_le timestamptz not null default now(),
expire_le timestamptz not null,
utilise_le timestamptz,
annule_le timestamptz,
constraint accords_benj_24_heures check (expire_le > emis_le and expire_le <= emis_le + interval '24 hours')
);
create index if not exists accords_benj_envoi on ops.accords_benj (envoi_id, emis_le desc);
alter table ops.accords_benj enable row level security;
revoke all on table ops.accords_benj from public, anon, authenticated, service_role;
create or replace function ops.garde_accords()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
v_e record;
begin
if tg_op = 'UPDATE' then
if new.id is distinct from old.id
or new.envoi_id is distinct from old.envoi_id
or new.canal is distinct from old.canal
or new.destinataire is distinct from old.destinataire
or new.empreinte_texte is distinct from old.empreinte_texte
or new.donne_par is distinct from old.donne_par
or new.emis_le is distinct from old.emis_le
or new.expire_le is distinct from old.expire_le
or (old.utilise_le is not null and new.utilise_le is distinct from old.utilise_le)
or (old.annule_le is not null and new.annule_le is distinct from old.annule_le)
or (new.utilise_le is not null and new.annule_le is not null) then
raise exception using message = 'ops:accord_fige', errcode = 'P0001';
end if;
return new;
end if;
if new.donne_par is null
or not exists (select 1 from public.artisans ar where ar.id = new.donne_par and ar.is_founder) then
raise exception using message = 'ops:accord_auteur', errcode = 'P0001';
end if;
new.emis_le := now();
new.expire_le := least(coalesce(new.expire_le, now() + interval '24 hours'), now() + interval '24 hours');
new.utilise_le := null;
new.annule_le := null;
if new.expire_le <= now() then
raise exception using message = 'ops:accord_perime', errcode = 'P0001';
end if;
select e.statut, e.canal, e.destinataire, e.empreinte_texte into v_e
from ops.envois e
where e.id = new.envoi_id
for update;
if not found
or v_e.statut <> 'attend_accord_benj'
or new.canal is distinct from v_e.canal
or lower(btrim(new.destinataire)) is distinct from lower(btrim(v_e.destinataire))
or new.empreinte_texte is distinct from v_e.empreinte_texte then
raise exception using message = 'ops:accord_envoi', errcode = 'P0001';
end if;
return new;
end
$$;
revoke all on function ops.garde_accords() from public, anon, authenticated, service_role;
drop trigger if exists garde_accords on ops.accords_benj;
create trigger garde_accords
before insert or update on ops.accords_benj
for each row execute function ops.garde_accords();
create or replace function ops.garde_envois()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
v_pj jsonb := '{}'::jsonb;
v_dest text;
v_siren text;
v_domaine text;
v_page_meta text;
v_instagram text;
v_pause boolean;
v_oppose boolean;
v_verdicts_ok boolean;
v_hors text;
v_preuve jsonb;
v_id_preuve text;
v_ok boolean;
v_n integer;
v_dernier timestamptz;
v_jour date;
v_debut timestamptz;
v_fin timestamptz;
v_q_jour integer;
v_q_nouveaux integer;
v_pause_le timestamptz;
v_acc record;
begin
if tg_op = 'INSERT' then
new.prepare_le := now();
new.approuve_le := null;
new.envoye_le := case when new.statut = 'envoye' then now() end;
else
new.prepare_le := old.prepare_le;
if old.statut in ('attend_accord_benj', 'approuve', 'envoye')
and ( new.canal is distinct from old.canal
or new.envoyeur is distinct from old.envoyeur
or new.type is distinct from old.type
or new.prospect_id is distinct from old.prospect_id
or new.destinataire is distinct from old.destinataire
or new.empreinte_texte is distinct from old.empreinte_texte
or (to_jsonb(new) -> 'preuve_demande') is distinct from (to_jsonb(old) -> 'preuve_demande')) then
raise exception using message = 'ops:envoi_fige', errcode = 'P0001';
end if;
if old.statut = 'envoye' and new.statut is distinct from old.statut then
raise exception using message = 'ops:envoi_fige', errcode = 'P0001';
end if;
new.approuve_le := old.approuve_le;
new.envoye_le := old.envoye_le;
if new.statut is not distinct from old.statut then
return new;
end if;
if new.statut = 'envoye' then
new.envoye_le := now();
end if;
if old.statut = 'attend_accord_benj' and new.statut <> 'approuve' then
update ops.accords_benj a
set annule_le = now()
where a.envoi_id = new.id
and a.utilise_le is null
and a.annule_le is null;
end if;
end if;
if new.statut <> 'envoye' and new.statut not in ('prepare', 'attend_accord_benj', 'approuve') then
return new;
end if;
if new.prospect_id is not null then
select to_jsonb(p) into v_pj from ops.prospects p where p.id = new.prospect_id;
end if;
v_pj := coalesce(v_pj, '{}'::jsonb);
v_dest := lower(btrim(coalesce(new.destinataire, '')));
v_siren := nullif(lower(btrim(coalesce(v_pj ->> 'siren', ''))), '');
v_domaine := nullif(lower(btrim(coalesce(v_pj ->> 'domaine', ''))), '');
v_page_meta := nullif(lower(btrim(coalesce(v_pj ->> 'page_meta', ''))), '');
v_instagram := nullif(lower(btrim(coalesce(v_pj ->> 'instagram', ''))), '');
select i.actif, i.change_le into v_pause, v_pause_le from ops.interrupteurs i where i.nom = 'pause_generale';
select exists (
select 1
from ops.opposition o
where (o.expire_le is null or o.expire_le > now())
and ( (o.cle_type = 'siren' and o.cle_valeur = v_siren)
or (o.cle_type = 'domaine' and o.cle_valeur in (v_domaine, split_part(v_dest, '@', 2)))
or (o.cle_type = 'page_meta' and o.cle_valeur = v_page_meta)
or (o.cle_type = 'instagram' and o.cle_valeur in (v_instagram, v_dest))
or (o.cle_type in ('email', 'meta_id', 'facebook', 'linkedin', 'telephone') and o.cle_valeur = v_dest))
) into v_oppose;
v_verdicts_ok := (coalesce(new.approuve_par_agent, '') = 'facteur' or new.canal = 'essai_e2e')
and coalesce(new.verdicts ->> 'j3', '') = 'ok'
and coalesce(new.verdicts ->> 'j2', '') = 'ok'
and (coalesce(new.verdicts ->> 'j1', '') = 'ok'
or (new.type <> 'premier_contact' and coalesce(new.verdicts ->> 'j1', '') = 'sans_objet'));
if new.statut = 'envoye' then
v_hors := null;
if coalesce(v_pause, true) then
v_hors := 'pause générale';
end if;
if v_oppose and new.type not in ('confirmation_stop', 'reponse_rgpd') then
v_hors := concat_ws(', ', v_hors, 'opposition active');
end if;
if tg_op = 'INSERT' then
v_hors := concat_ws(', ', v_hors, 'jamais approuvé');
elsif old.statut <> 'approuve' then
v_hors := concat_ws(', ', v_hors, 'pas approuvé avant');
end if;
if not v_verdicts_ok then
v_hors := concat_ws(', ', v_hors, 'verdicts incomplets');
end if;
select a.emis_le, a.expire_le into v_acc
from ops.accords_benj a
where a.envoi_id = new.id
and a.utilise_le is not null
order by a.utilise_le desc
limit 1;
if not found then
v_hors := concat_ws(', ', v_hors, 'sans accord de Benj');
elsif v_acc.expire_le <= now() then
v_hors := concat_ws(', ', v_hors, 'accord échu');
elsif v_acc.emis_le <= coalesce(v_pause_le, '-infinity'::timestamptz) then
v_hors := concat_ws(', ', v_hors, 'pause depuis l''accord');
end if;
if v_hors is not null then
begin
perform public.ops_evenement_ajouter('systeme', 'envoi_hors_regle', 'envoi:' || new.id::text,
left('Envoi ' || new.canal || ' ' || new.type || ' consigné hors règle : ' || v_hors, 200), null);
exception when others then
raise warning 'garde_envois : événement envoi_hors_regle non écrit (%)', sqlstate;
end;
end if;
return new;
end if;
if public.ops_interrupteur('pause_generale') then
raise exception using message = 'ops:pause_generale', errcode = 'P0001';
end if;
perform pg_advisory_xact_lock(hashtext('ops:quota:' || new.canal));
if v_oppose and new.type not in ('confirmation_stop', 'reponse_rgpd') then
raise exception using message = 'ops:opposition', errcode = 'P0001';
end if;
if v_oppose and new.type = 'confirmation_stop' then
select exists (
select 1
from ops.opposition o
where o.expire_le is null
and o.cree_le > now() - interval '24 hours'
and ( (o.cle_type = 'siren' and o.cle_valeur = v_siren)
or (o.cle_type = 'domaine' and o.cle_valeur in (v_domaine, split_part(v_dest, '@', 2)))
or (o.cle_type = 'page_meta' and o.cle_valeur = v_page_meta)
or (o.cle_type = 'instagram' and o.cle_valeur in (v_instagram, v_dest))
or (o.cle_type in ('email', 'meta_id', 'facebook', 'linkedin', 'telephone') and o.cle_valeur = v_dest)))
and not exists (
select 1
from ops.envois e
where e.type = 'confirmation_stop'
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and ( (new.prospect_id is not null and e.prospect_id = new.prospect_id)
or (new.prospect_id is null and lower(btrim(e.destinataire)) = v_dest)))
into v_ok;
if not coalesce(v_ok, false) then
raise exception using message = 'ops:confirmation_stop', errcode = 'P0001';
end if;
end if;
if new.type = 'reponse_rgpd' then
v_ok := false;
if to_regclass('ops.reponses') is not null and new.prospect_id is not null then
select exists (
select 1
from ops.reponses r
where r.prospect_id = new.prospect_id
and r.recu_le > now() - interval '35 days'
and r.classe in ('rgpd', 'rgpd_acces', 'rgpd_effacement', 'rgpd_autre')
) into v_ok;
end if;
if v_ok then
select count(*) into v_n
from ops.envois e
where e.type = 'reponse_rgpd'
and e.id <> new.id
and e.prospect_id = new.prospect_id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le > now() - interval '35 days';
v_ok := v_n < 3;
end if;
if not coalesce(v_ok, false) then
raise exception using message = 'ops:rgpd_hors_demande', errcode = 'P0001';
end if;
end if;
if new.type = 'premier_contact' and new.canal <> 'essai_e2e' and not public.ops_interrupteur('envoi_froid') then
raise exception using message = 'ops:envoi_froid_ferme', errcode = 'P0001';
end if;
if new.canal = 'formulaire_site' then
if new.type <> 'premier_contact' then
raise exception using message = 'ops:relance_formulaire', errcode = 'P0001';
end if;
perform pg_advisory_xact_lock(hashtext('ops:formulaire:' || coalesce(v_siren, v_domaine, new.prospect_id::text)));
if v_siren is not null and v_domaine is not null then
perform pg_advisory_xact_lock(hashtext('ops:formulaire:' || v_domaine));
end if;
if exists (
select 1
from ops.envois e
left join ops.prospects p2 on p2.id = e.prospect_id
where e.canal = 'formulaire_site'
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and ( e.prospect_id = new.prospect_id
or (v_siren is not null and p2.siren = v_siren)
or (v_domaine is not null and lower(btrim(p2.domaine)) = v_domaine))
) then
raise exception using message = 'ops:formulaire_deja', errcode = 'P0001';
end if;
end if;
if new.canal = 'email_sollicite' then
if new.type = 'premier_contact' then
raise exception using message = 'ops:froid_email_interdit', errcode = 'P0001';
end if;
v_preuve := to_jsonb(new) -> 'preuve_demande';
v_ok := false;
if jsonb_typeof(v_preuve) = 'object' and new.prospect_id is not null then
v_id_preuve := lower(btrim(coalesce(v_preuve ->> 'id', '')));
if v_preuve ->> 'type' = 'message_recu' and to_regclass('ops.reponses') is not null then
select exists (
select 1
from ops.reponses r
where r.id::text = v_id_preuve
and r.prospect_id = new.prospect_id
and r.recu_le <= now()
and coalesce((to_jsonb(r) ->> 'auto')::boolean, false) = false
and coalesce((to_jsonb(r) ->> 'accuse_site')::boolean, false) = false
) into v_ok;
elsif v_preuve ->> 'type' = 'case_entrant' then
v_ok := v_id_preuve = new.prospect_id::text
and coalesce(v_pj ->> 'source', '') = 'entrant'
and exists (
select 1
from jsonb_array_elements(case when jsonb_typeof(v_pj -> 'canaux') = 'array' then v_pj -> 'canaux' else '[]'::jsonb end) c
where c ->> 'nature' = 'donnee_par_la_personne'
and lower(btrim(coalesce(c ->> 'valeur', ''))) = v_dest
and nullif(c ->> 'case_cochee_le', '') is not null);
end if;
end if;
if not coalesce(v_ok, false) then
raise exception using message = 'ops:preuve_demande_absente', errcode = 'P0001';
end if;
end if;
if new.type = 'premier_contact' then
if exists (
select 1
from ops.envois e
where e.prospect_id = new.prospect_id
and e.id <> new.id
and e.type in ('premier_contact', 'relance')
and ( (e.statut = 'envoye' and coalesce(e.envoye_le, e.prepare_le) > now() - interval '90 days')
or e.statut in ('prepare', 'attend_accord_benj', 'approuve'))
) then
raise exception using message = 'ops:90_jours', errcode = 'P0001';
end if;
end if;
if new.type = 'relance' then
select max(coalesce(e.envoye_le, e.prepare_le)) into v_dernier
from ops.envois e
where e.prospect_id = new.prospect_id
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye');
if coalesce(v_pj ->> 'etape', '') not in ('lien_envoye', 'oui')
or exists (select 1
from ops.envois e
where e.prospect_id = new.prospect_id
and e.id <> new.id
and e.type = 'relance'
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye'))
or coalesce(v_dernier > now() - interval '72 hours', false) then
raise exception using message = 'ops:relance_sollicitee', errcode = 'P0001';
end if;
if not exists (
select 1
from ops.envois e
where e.prospect_id = new.prospect_id
and e.id <> new.id
and e.statut = 'envoye'
and coalesce(e.envoye_le, e.prepare_le) > now() - interval '90 days'
) then
raise exception using message = 'ops:relance_sans_contact', errcode = 'P0001';
end if;
select count(*), max(coalesce(e.envoye_le, e.prepare_le)) into v_n, v_dernier
from ops.envois e
where e.prospect_id = new.prospect_id
and e.id <> new.id
and e.type in ('premier_contact', 'relance')
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and coalesce(e.envoye_le, e.prepare_le) > now() - interval '90 days';
if v_n >= 3 then
raise exception using message = 'ops:3_messages', errcode = 'P0001';
end if;
if coalesce(v_dernier > now() - interval '72 hours', false) then
raise exception using message = 'ops:72_heures', errcode = 'P0001';
end if;
end if;
if new.canal = 'email_sollicite' and new.type = 'reponse' then
perform pg_advisory_xact_lock(hashtext('ops:reponses:' || new.envoyeur));
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.type = 'reponse'
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le > now() - interval '24 hours'
and ( (new.prospect_id is not null and e.prospect_id = new.prospect_id)
or (new.prospect_id is null and lower(btrim(e.destinataire)) = v_dest));
if v_n >= 3 then
raise exception using message = 'ops:quota_reponses', errcode = 'P0001';
end if;
v_jour := (now() at time zone 'Europe/Paris')::date;
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.type = 'reponse'
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= (v_jour::timestamp at time zone 'Europe/Paris')
and e.prepare_le < ((v_jour + 1)::timestamp at time zone 'Europe/Paris');
if v_n >= 20 then
raise exception using message = 'ops:quota_reponses', errcode = 'P0001';
end if;
end if;
if new.canal in ('formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie')
or new.type in ('premier_contact', 'relance') then
v_jour := (now() at time zone 'Europe/Paris')::date;
v_debut := v_jour::timestamp at time zone 'Europe/Paris';
v_fin := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
select q.plafond_jour, q.plafond_nouveaux_jour into v_q_jour, v_q_nouveaux
from ops.quotas_canaux q
where q.canal = new.canal and q.envoyeur = '*';
if not found then
raise exception using message = 'ops:quota_absent', errcode = 'P0001';
end if;
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin
and (new.canal in ('email_sollicite', 'reponse_privee', 'messagerie') or e.type in ('premier_contact', 'relance'));
if v_n >= v_q_jour then
raise exception using message = 'ops:quota', errcode = 'P0001';
end if;
if new.type = 'premier_contact' then
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.id <> new.id
and e.type = 'premier_contact'
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin;
if v_n >= v_q_nouveaux then
raise exception using message = 'ops:quota_nouveaux', errcode = 'P0001';
end if;
end if;
select q.plafond_jour, q.plafond_nouveaux_jour into v_q_jour, v_q_nouveaux
from ops.quotas_canaux q
where q.canal = new.canal and q.envoyeur = new.envoyeur;
if found then
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.envoyeur = new.envoyeur
and e.id <> new.id
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin
and (new.canal in ('email_sollicite', 'reponse_privee', 'messagerie') or e.type in ('premier_contact', 'relance'));
if v_n >= v_q_jour then
raise exception using message = 'ops:quota', errcode = 'P0001';
end if;
if new.type = 'premier_contact' then
select count(*) into v_n
from ops.envois e
where e.canal = new.canal
and e.envoyeur = new.envoyeur
and e.id <> new.id
and e.type = 'premier_contact'
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin;
if v_n >= v_q_nouveaux then
raise exception using message = 'ops:quota_nouveaux', errcode = 'P0001';
end if;
end if;
end if;
end if;
if new.statut in ('attend_accord_benj', 'approuve') then
if not coalesce(v_verdicts_ok, false) then
raise exception using message = 'ops:verdicts', errcode = 'P0001';
end if;
end if;
if new.statut = 'approuve' then
if tg_op = 'INSERT' or old.statut <> 'attend_accord_benj' then
raise exception using message = 'ops:accord_absent', errcode = 'P0001';
end if;
select a.id, a.canal, a.destinataire, a.empreinte_texte, a.donne_par, a.emis_le, a.expire_le, a.utilise_le
into v_acc
from ops.accords_benj a
where a.envoi_id = new.id
and a.annule_le is null
order by a.emis_le desc, a.id desc
limit 1
for update;
if not found then
raise exception using message = 'ops:accord_absent', errcode = 'P0001';
end if;
if v_acc.utilise_le is not null then
raise exception using message = 'ops:accord_rejoue', errcode = 'P0001';
end if;
if v_acc.expire_le <= now() or v_acc.emis_le <= coalesce(v_pause_le, '-infinity'::timestamptz) then
raise exception using message = 'ops:accord_perime', errcode = 'P0001';
end if;
if not exists (select 1 from public.artisans ar where ar.id = v_acc.donne_par and ar.is_founder) then
raise exception using message = 'ops:accord_absent', errcode = 'P0001';
end if;
if v_acc.canal is distinct from new.canal
or lower(btrim(v_acc.destinataire)) is distinct from lower(btrim(new.destinataire))
or v_acc.empreinte_texte is distinct from new.empreinte_texte then
raise exception using message = 'ops:accord_different', errcode = 'P0001';
end if;
update ops.accords_benj a
set annule_le = now()
where a.envoi_id = new.id
and a.id <> v_acc.id
and a.utilise_le is null
and a.annule_le is null;
update ops.accords_benj a
set utilise_le = now()
where a.id = v_acc.id;
new.approuve_le := now();
end if;
return new;
end
$$;
revoke all on function ops.garde_envois() from public, anon, authenticated, service_role;
drop trigger if exists garde_envois on ops.envois;
create trigger garde_envois
before insert or update on ops.envois
for each row execute function ops.garde_envois();
create or replace function ops.annuler_sur_opposition()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
v_n integer;
begin
if new.expire_le is not null and new.expire_le <= now() then
return null;
end if;
update ops.envois e
set statut = 'annule'
where e.statut in ('prepare', 'attend_accord_benj', 'approuve')
and e.type <> 'confirmation_stop'
and ( exists (select 1
from ops.prospects p
where p.id = e.prospect_id
and ( (new.cle_type = 'siren' and p.siren = new.cle_valeur)
or (new.cle_type = 'domaine' and lower(btrim(p.domaine)) = new.cle_valeur)
or (new.cle_type = 'page_meta' and lower(btrim(p.page_meta)) = new.cle_valeur)
or (new.cle_type = 'instagram' and lower(btrim(p.instagram)) = new.cle_valeur)))
or (new.cle_type = 'domaine' and split_part(lower(btrim(e.destinataire)), '@', 2) = new.cle_valeur)
or (new.cle_type in ('email', 'meta_id', 'instagram', 'facebook', 'linkedin', 'telephone')
and lower(btrim(e.destinataire)) = new.cle_valeur));
get diagnostics v_n = row_count;
if v_n > 0 then
perform public.ops_evenement_ajouter('systeme', 'envois_annules_opposition', 'opposition:' || new.id::text,
v_n || ' envoi(s) en attente annulé(s) : nouvelle opposition ' || new.cle_type, null);
end if;
return null;
end
$$;
revoke all on function ops.annuler_sur_opposition() from public, anon, authenticated, service_role;
drop trigger if exists annuler_sur_opposition on ops.opposition;
create trigger annuler_sur_opposition
after insert or update of expire_le on ops.opposition
for each row execute function ops.annuler_sur_opposition();
create or replace function public.ops_garde_etat()
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
v_jour date := (now() at time zone 'Europe/Paris')::date;
v_debut timestamptz := v_jour::timestamp at time zone 'Europe/Paris';
v_fin timestamptz := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
begin
return jsonb_build_object(
'declencheurs', coalesce((
select jsonb_agg(jsonb_build_object('nom', t.tgname, 'table', 'ops.' || c.relname, 'actif', t.tgenabled in ('O', 'A')) order by t.tgname)
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'ops'
and not t.tgisinternal
and ( (c.relname = 'envois' and t.tgname = 'garde_envois')
or (c.relname = 'opposition' and t.tgname = 'annuler_sur_opposition')
or (c.relname = 'accords_benj' and t.tgname = 'garde_accords'))
), '[]'::jsonb),
'interrupteurs', coalesce((
select jsonb_object_agg(i.nom, i.actif)
from ops.interrupteurs i
where i.nom in ('pause_generale', 'envoi_froid')
), '{}'::jsonb),
'plafonds', coalesce((
select jsonb_agg(jsonb_build_object('canal', q.canal, 'envoyeur', q.envoyeur, 'plafond_jour', q.plafond_jour,
'plafond_nouveaux_jour', q.plafond_nouveaux_jour) order by q.canal, q.envoyeur)
from ops.quotas_canaux q
), '[]'::jsonb),
'du_jour', coalesce((
select jsonb_agg(jsonb_build_object('canal', k.canal, 'envoyeur', k.envoyeur, 'envois', k.envois, 'nouveaux', k.nouveaux)
order by k.canal, k.envoyeur)
from (
select l.canal, l.envoyeur,
(select count(*)
from ops.envois e
where e.canal = l.canal
and (l.envoyeur = '*' or e.envoyeur = l.envoyeur)
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin
and (l.canal in ('email_sollicite', 'reponse_privee', 'messagerie') or e.type in ('premier_contact', 'relance'))) as envois,
(select count(*)
from ops.envois e
where e.canal = l.canal
and (l.envoyeur = '*' or e.envoyeur = l.envoyeur)
and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin
and e.type = 'premier_contact') as nouveaux
from (select q.canal, q.envoyeur
from ops.quotas_canaux q
union
select e.canal, e.envoyeur
from ops.envois e
where e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and e.prepare_le >= v_debut and e.prepare_le < v_fin) l
) k
), '[]'::jsonb)
);
end
$$;
revoke all on function public.ops_garde_etat() from public, anon, authenticated;
grant execute on function public.ops_garde_etat() to service_role;
$migration_026$;
<<essai_0099>>
declare
v_p uuid;
v_p2 uuid;
v_pg uuid;
v_e uuid;
v_e2 uuid;
v_rep text;
v_rep2 text;
v_repg text;
v_ps uuid[];
v_reps text[];
v_n int;
v_i int;
v_k int;
v_base int;
v_base2 int;
v_ok boolean;
v_diag text;
v_role text;
v_statut text;
v_ev0 bigint;
v_ev1 bigint;
v_etat jsonb;
v_txt text;
v_h text := md5('essai_e2e:0099:texte:1') || md5('essai_e2e:0099:texte:2');
v_jour date := (now() at time zone 'Europe/Paris')::date;
v_hier timestamptz;
v_ok3 constant jsonb := '{"j1": "ok", "j2": "ok", "j3": "ok"}'::jsonb;
v_okl constant jsonb := '{"j1": "sans_objet", "j2": "ok", "j3": "ok"}'::jsonb;
v_fin constant text := 'essai_026:fin_de_groupe';
v_benj uuid;
v_acc uuid;
v_e3 uuid;
v_h2 text := md5('essai_e2e:0099:texte:3') || md5('essai_e2e:0099:texte:4');
begin
insert into ops.agents (nom, libelle) values ('facteur', 'Facteur (essai 0099)'), ('redacteur', 'Plume (essai 0099)')
on conflict (nom) do nothing;
alter table ops.envois add column if not exists preuve_demande jsonb;
alter table ops.prospects add column if not exists etape text;
if to_regclass('ops.reponses') is null then
create table ops.reponses (
id uuid primary key default gen_random_uuid(),
id_externe text not null unique,
envoi_id uuid references ops.envois(id) on delete cascade,
conversation_id uuid,
prospect_id uuid references ops.prospects(id) on delete cascade,
canal text,
source text,
texte text,
auto boolean not null default false,
accuse_site boolean not null default false,
en_reponse_a text,
recu_le timestamptz not null default now(),
classe text
);
end if;
insert into ops.interrupteurs (nom, actif) values ('pause_generale', false), ('envoi_froid', true)
on conflict (nom) do update set actif = excluded.actif;
select ar.id into v_benj from public.artisans ar where ar.is_founder order by ar.id limit 1;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026001', '999026001', 'essai-e2e-026-g.invalid', 'essai_e2e')
returning id into v_pg;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:g', v_pg, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour')
returning id::text into v_repg;
begin
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
update ops.envois set statut = 'approuve' where id = v_e;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026901', '999026901', 'essai-e2e-026-i1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e2;
update ops.interrupteurs set actif = true where nom = 'pause_generale';
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026902', '999026902', 'essai-e2e-026-i2.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('pause_refuse_prepare', false, 'diag_pause_prepare', 'accepté');
exception when others then
r := r || jsonb_build_object('pause_refuse_prepare', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_prepare', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('pause_refuse_lien_maquette', false, 'diag_pause_lien', 'accepté');
exception when others then
r := r || jsonb_build_object('pause_refuse_lien_maquette', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_lien', sqlstate || ' ' || left(sqlerrm, 120));
end;
select count(*) into v_ev0 from ops.evenements where type = 'envoi_hors_regle';
begin
update ops.envois set statut = 'envoye', envoye_le = now() where id = v_e;
r := r || jsonb_build_object('pause_envoye_refuse', false, 'diag_pause_envoye', 'accepté');
exception when others then
r := r || jsonb_build_object('pause_envoye_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_pause_envoye', sqlstate || ' ' || left(sqlerrm, 120));
end;
select count(*) into v_ev1 from ops.evenements where type = 'envoi_hors_regle';
r := r || jsonb_build_object('pause_envoye_reste_approuve', v_ev1 = v_ev0 and exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and envoye_le is null),
'diag_pause_envoye_evenements', v_ev0 || ' puis ' || v_ev1);
update ops.interrupteurs set actif = false where nom = 'pause_generale';
select count(*) into v_ev0 from ops.evenements where type = 'envoi_hors_regle';
begin
update ops.envois set statut = 'envoye', approuve_par_agent = 'facteur', envoye_le = now() where id = v_e2;
select count(*) into v_ev1 from ops.evenements where type = 'envoi_hors_regle';
r := r || jsonb_build_object('prepare_vers_envoye_evenement_hors_regle', v_ev1 = v_ev0 + 1 and exists (select 1 from ops.envois where id = v_e2 and statut = 'envoye'), 'diag_prepare_envoye', v_ev0 || ' puis ' || v_ev1);
r := r || jsonb_build_object('envoye_sans_accord_signale', exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and objet = 'envoi:' || v_e2::text and resume like '%sans accord de Benj%'));
exception when others then
r := r || jsonb_build_object('prepare_vers_envoye_evenement_hors_regle', false, 'diag_prepare_envoye', sqlstate || ' ' || left(sqlerrm, 120));
end;
r := r || jsonb_build_object('hors_regle_sans_donnee_personnelle', exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and le >= now())
and not exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and le >= now()
and (coalesce(resume, '') || ' ' || coalesce(objet, '')) ~* '(essai-e2e-026|@|999026)'));
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_pause', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027501', '999027501', 'essai-e2e-026-o1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:o1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-o1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
begin
update ops.envois set empreinte_texte = v_h2 where id = v_e;
r := r || jsonb_build_object('retouche_prepare_passe', exists (select 1 from ops.envois where id = v_e and empreinte_texte = v_h2));
exception when others then
r := r || jsonb_build_object('retouche_prepare_passe', false, 'diag_retouche_prepare', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
begin
update ops.envois set empreinte_texte = v_h where id = v_e;
r := r || jsonb_build_object('retouche_texte_attente_refusee', false, 'diag_retouche_attente', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_texte_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_attente', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set entetes = jsonb_build_object('Subject', 'Autre objet (essai 0099)') where id = v_e;
r := r || jsonb_build_object('retouche_entetes_attente_refusee', false, 'diag_retouche_entetes_attente', 'acceptée');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('retouche_entetes_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_entetes_attente', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
begin
update ops.envois set verdicts = v_ok3 where id = v_e;
r := r || jsonb_build_object('retouche_verdicts_attente_refusee', false, 'diag_retouche_verdicts_attente', 'acceptée');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('retouche_verdicts_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_verdicts_attente', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
begin
update ops.envois set approuve_par_agent = 'redacteur' where id = v_e;
r := r || jsonb_build_object('retouche_approuve_par_agent_attente_refusee', false, 'diag_retouche_agent_attente', 'acceptée');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('retouche_approuve_par_agent_attente_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_agent_attente', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-o1.invalid', v_h2, v_benj);
update ops.envois set statut = 'approuve' where id = v_e;
begin
update ops.envois set destinataire = 'autre@essai-e2e-026-o1.invalid' where id = v_e;
r := r || jsonb_build_object('retouche_destinataire_approuve_refusee', false, 'diag_retouche_destinataire', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_destinataire_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_destinataire', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set empreinte_texte = v_h where id = v_e;
r := r || jsonb_build_object('retouche_texte_approuve_refusee', false, 'diag_retouche_texte', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_texte_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_texte', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set canal = 'messagerie' where id = v_e;
r := r || jsonb_build_object('retouche_canal_approuve_refusee', false, 'diag_retouche_canal', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_canal_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_canal', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set type = 'reponse' where id = v_e;
r := r || jsonb_build_object('retouche_type_approuve_refusee', false, 'diag_retouche_type', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_type_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_type', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set prospect_id = v_pg where id = v_e;
r := r || jsonb_build_object('retouche_prospect_approuve_refusee', false, 'diag_retouche_prospect', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_prospect_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_prospect', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set envoyeur = 'repondeur' where id = v_e;
r := r || jsonb_build_object('retouche_envoyeur_approuve_refusee', false, 'diag_retouche_envoyeur', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_envoyeur_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_envoyeur', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set entetes = jsonb_build_object('Cc', 'autre@essai-e2e-026-o1.invalid') where id = v_e;
r := r || jsonb_build_object('retouche_entetes_approuve_refusee', false, 'diag_retouche_entetes', 'acceptée');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('retouche_entetes_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_entetes', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
begin
update ops.envois set verdicts = '{}'::jsonb where id = v_e;
r := r || jsonb_build_object('retouche_verdicts_approuve_refusee', false, 'diag_retouche_verdicts', 'acceptée');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('retouche_verdicts_approuve_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
begin
update ops.envois set id_externe = 'essai_e2e:0099:o1' where id = v_e;
r := r || jsonb_build_object('approuve_champ_libre_passe', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and id_externe = 'essai_e2e:0099:o1'));
exception when others then
r := r || jsonb_build_object('approuve_champ_libre_passe', false, 'diag_champ_libre', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.envois set statut = 'envoye' where id = v_e;
begin
update ops.envois set canal = 'messagerie' where id = v_e;
r := r || jsonb_build_object('retouche_envoye_refusee', false, 'diag_retouche_envoye', 'acceptée');
exception when others then
r := r || jsonb_build_object('retouche_envoye_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_retouche_envoye', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'attend_accord_benj' where id = v_e;
r := r || jsonb_build_object('envoye_ne_revient_pas', false, 'diag_envoye_revient', 'accepté');
exception when others then
r := r || jsonb_build_object('envoye_ne_revient_pas', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_fige', 'diag_envoye_revient', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_fige', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
select count(*) into v_base from ops.envois e
where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
v_ps := '{}';
v_hier := now() - interval '1 day';
alter table ops.envois disable trigger garde_envois;
for v_i in 1..3 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902770' || v_i, '99902770' || v_i, 'essai-e2e-026-q' || v_i || '.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, (array['saute', 'perime', 'annule'])[v_i], 'redacteur', v_hier)
returning id into v_e;
v_ps := v_ps || v_e;
end loop;
alter table ops.envois enable trigger garde_envois;
v_n := 0; v_k := 0; v_diag := null;
begin
update ops.envois set statut = 'prepare' where id = v_ps[1];
v_n := v_n + 1;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 80);
end;
r := r || jsonb_build_object('reanimation_datee_par_la_base', exists (select 1 from ops.envois where id = v_ps[1] and statut = 'prepare' and prepare_le = now()));
begin
update ops.envois set statut = 'prepare' where id = v_ps[2];
v_n := v_n + 1;
exception when others then
if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
end;
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_ps[3];
v_n := v_n + 1;
exception when others then
if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027704', '999027704', 'essai-e2e-026-q4.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur')
returning id into v_e;
v_ps := v_ps || v_e;
v_n := v_n + 1;
exception when others then
if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
end;
r := r || jsonb_build_object('reanimation_respecte_plafond', v_n = 1 and v_k = 3,
'diag_reanimation', v_n || ' entrée(s) sur 4, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
v_etat := public.ops_garde_etat();
select coalesce(sum((x ->> 'envois')::int), -1) into v_i
from jsonb_array_elements(coalesce(v_etat -> 'du_jour', '[]'::jsonb)) x
where x ->> 'canal' = 'formulaire_site' and x ->> 'envoyeur' = '*';
select count(*) into v_k from ops.envois e where e.id = any (v_ps) and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye');
r := r || jsonb_build_object('du_jour_compte_les_reanimes', v_i = v_base + v_k,
'diag_du_jour_reanimes', 'du_jour ' || v_i || ', en file ' || (v_base + v_k));
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027705', '999027705', 'essai-e2e-026-q5.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'relance', null, v_h, 'saute', 'redacteur');
r := r || jsonb_build_object('insertion_saute_controlee', false, 'diag_insertion_saute', 'acceptée');
exception when others then
r := r || jsonb_build_object('insertion_saute_controlee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_insertion_saute', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'saute', 'redacteur');
r := r || jsonb_build_object('insertion_saute_plafond_plein_refusee', false, 'diag_insertion_saute_plafond', 'acceptée');
exception when others then
r := r || jsonb_build_object('insertion_saute_plafond_plein_refusee', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_insertion_saute_plafond', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_reanimation', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
select count(*) into v_base from ops.envois e
where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
v_ps := '{}';
v_hier := now() - interval '1 day';
alter table ops.envois disable trigger garde_envois;
for v_i in 1..5 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902771' || v_i, '99902771' || v_i, 'essai-e2e-026-qb' || v_i || '.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, case when v_i <= 3 then 'prepare' else 'attend_accord_benj' end, 'redacteur', v_hier,
case when v_i <= 3 then null else 'facteur' end, case when v_i <= 3 then '{}'::jsonb else v_ok3 end)
returning id into v_e;
v_ps := v_ps || v_e;
end loop;
alter table ops.envois enable trigger garde_envois;
v_n := 0; v_k := 0; v_diag := null;
for v_i in 1..3 loop
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_ps[v_i];
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_ps[v_i];
update ops.envois set statut = 'approuve' where id = v_ps[v_i];
v_n := v_n + 1;
exception when others then
if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
end;
end loop;
r := r || jsonb_build_object('attente_veille_compte_au_plafond', v_n = 1 and v_k = 2
and (select count(*) from ops.envois e where e.id = any (v_ps[1:3]) and e.statut = 'approuve' and e.prepare_le = now()) = 1,
'diag_attente_veille', v_n || ' approuvée(s) sur 3, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
select count(*) into v_base2 from ops.envois e
where e.canal = 'formulaire_site' and e.type in ('premier_contact', 'relance') and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
update ops.quotas_canaux set plafond_jour = least(300, v_base2 + 1), plafond_nouveaux_jour = least(300, v_base2 + 1) where canal = 'formulaire_site' and envoyeur = '*';
v_n := 0; v_k := 0; v_diag := null;
for v_i in 4..5 loop
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_ps[v_i];
update ops.envois set statut = 'approuve' where id = v_ps[v_i];
v_n := v_n + 1;
exception when others then
if sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux') then v_k := v_k + 1; end if;
v_diag := concat_ws(' ; ', v_diag, sqlstate || ' ' || left(sqlerrm, 80));
end;
end loop;
r := r || jsonb_build_object('approbation_veille_compte_au_plafond', v_n = 1 and v_k = 1,
'diag_approbation_veille', v_n || ' approuvée(s) sur 2, plafond ' || (v_base2 + 1) || coalesce(' ; ' || v_diag, ''));
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_stock', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
update ops.envois set statut = 'approuve' where id = v_e;
alter table ops.accords_benj disable trigger garde_accords;
update ops.accords_benj set emis_le = now() - interval '26 hours', expire_le = now() - interval '2 hours' where envoi_id = v_e and utilise_le is not null;
alter table ops.accords_benj enable trigger garde_accords;
begin
update ops.envois set statut = 'envoye' where id = v_e;
r := r || jsonb_build_object('envoye_accord_echu_refuse', false, 'diag_envoye_echu', 'accepté');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('envoye_accord_echu_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime'
and exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and envoye_le is null),
'diag_envoye_echu', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h2, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e2;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e2;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e2;
update ops.envois set statut = 'approuve' where id = v_e2;
begin
update ops.envois set statut = 'envoye' where id = v_e2;
r := r || jsonb_build_object('envoye_accord_valide_passe', exists (select 1 from ops.envois where id = v_e2 and statut = 'envoye' and envoye_le = now())
and not exists (select 1 from ops.evenements where type = 'envoi_hors_regle' and objet = 'envoi:' || v_e2::text));
exception when others then
r := r || jsonb_build_object('envoye_accord_valide_passe', false, 'diag_envoye_valide', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.interrupteurs set actif = true where nom = 'pause_generale';
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, approuve_par_agent, verdicts, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'envoye', 'redacteur', 'facteur', v_okl, jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('envoye_insere_pause_refuse', false, 'diag_envoye_insere_pause', 'accepté');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('envoye_insere_pause_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:pause_generale', 'diag_envoye_insere_pause', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
update ops.interrupteurs set actif = false where nom = 'pause_generale';
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e3;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e3;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e3;
update ops.envois set statut = 'approuve' where id = v_e3;
update ops.interrupteurs set actif = true, change_le = now() where nom = 'pause_generale';
update ops.interrupteurs set actif = false, change_le = now() where nom = 'pause_generale';
begin
update ops.envois set statut = 'envoye' where id = v_e3;
r := r || jsonb_build_object('envoye_pause_levee_refuse', false, 'diag_envoye_pause_levee', 'accepté');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then
r := r || jsonb_build_object('envoye_pause_levee_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime'
and exists (select 1 from ops.envois where id = v_e3 and statut = 'approuve'),
'diag_envoye_pause_levee', sqlstate || ' ' || left(sqlerrm, 120));
end if;
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_envoye', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
end essai_0099;
raise exception 'ESSAI_A_SEC % %', '4856a6a8110dfb6f3d3c2f43110c20b3567725d11ed6ab9e564a6529a7d35e35', r::text;
end $essai_026$;
