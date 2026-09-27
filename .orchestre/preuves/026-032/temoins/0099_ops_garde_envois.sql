-- 0099_ops_garde_envois.sql — TÉMOIN de 026-032 : une implémentation de référence du contrat de 026-034, écrite pour prouver
-- que scripts/prospection-sql-qa.mjs sait être VERT sur une migration conforme (et rouge sur chacun de ses sabotages, voir
-- .orchestre/preuves/026-032/eprouver.mjs). Ce fichier n'est pas la migration de 026-034 et n'est jamais appliqué.
--
-- La base garde l'ENTRÉE d'un envoi en prepare ou approuve, jamais le passage à envoye : ce passage consigne un message déjà
-- parti, et le refuser effacerait une trace réelle ; s'il contredit une règle, un événement envoi_hors_regle le signale.
-- La règle la plus stricte s'applique. Les fonctions acq_* sont la première serrure ; ce déclencheur est la seconde.
-- Seul le Facteur approuve, et jamais sans les trois verdicts.

create or replace function ops.garde_envois()
returns trigger
language plpgsql
as $fn$
declare
  p ops.prospects%rowtype;
  v_nb int;
  v_dernier timestamptz;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_preuve jsonb := to_jsonb(new) -> 'preuve_demande';
  v_etape text;
  v_ok boolean;
  v_ligne record;
begin
  if new.prospect_id is not null then
    select * into p from ops.prospects where id = new.prospect_id;
  end if;

  if new.statut = 'envoye' then
    if tg_op = 'INSERT' or old.statut is distinct from 'envoye' then
      if public.ops_interrupteur('pause_generale')
         or tg_op = 'INSERT' or old.statut is distinct from 'approuve'
         or coalesce(new.verdicts ->> 'j2', '') <> 'ok' or coalesce(new.verdicts ->> 'j3', '') <> 'ok' then
        perform public.ops_evenement_ajouter('systeme', 'envoi_hors_regle', left(new.id::text, 200), 'Un envoi consigné envoye contredit une règle (pause, statut précédent ou verdicts)', null);
      end if;
    end if;
    return new;
  end if;

  if new.statut not in ('prepare', 'approuve') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = new.statut then
    return new;
  end if;

  -- 1. la pause générale
  if public.ops_interrupteur('pause_generale') then
    raise exception using message = 'ops:pause_generale', errcode = 'P0001';
  end if;

  -- 2. l'opposition active
  if exists (
    select 1 from ops.opposition o
     where (o.expire_le is null or o.expire_le > now())
       and ((o.cle_type = 'siren' and o.cle_valeur = p.siren)
         or (o.cle_type = 'domaine' and o.cle_valeur = p.domaine)
         or (o.cle_type = 'page_meta' and o.cle_valeur = p.page_meta)
         or (o.cle_type = 'instagram' and o.cle_valeur = p.instagram)
         or (o.cle_type = 'email' and o.cle_valeur = lower(new.destinataire))
         or (o.cle_type = 'domaine' and o.cle_valeur = split_part(lower(new.destinataire), '@', 2))
         or (o.cle_type = 'meta_id' and new.canal in ('reponse_privee', 'messagerie') and o.cle_valeur = lower(new.destinataire)))
  ) then
    if new.type = 'confirmation_stop' then
      if not exists (
           select 1 from ops.opposition o
            where o.expire_le is null and o.cree_le > now() - interval '24 hours'
              and ((o.cle_type = 'siren' and o.cle_valeur = p.siren) or (o.cle_type = 'domaine' and o.cle_valeur = p.domaine)
                or (o.cle_type = 'page_meta' and o.cle_valeur = p.page_meta) or (o.cle_type = 'instagram' and o.cle_valeur = p.instagram)
                or (o.cle_type = 'email' and o.cle_valeur = lower(new.destinataire))))
         or exists (select 1 from ops.envois e where e.prospect_id = new.prospect_id and e.type = 'confirmation_stop' and e.id <> new.id and e.statut in ('prepare', 'approuve', 'envoye')) then
        raise exception using message = 'ops:confirmation_stop', errcode = 'P0001';
      end if;
    elsif new.type = 'reponse_rgpd' then
      if to_regclass('ops.reponses') is null then
        raise exception using message = 'ops:rgpd_hors_demande', errcode = 'P0001';
      end if;
      select exists (select 1 from ops.reponses r
                      where r.prospect_id = new.prospect_id and r.classe in ('rgpd', 'rgpd_acces', 'rgpd_effacement', 'rgpd_autre')
                        and r.recu_le > now() - interval '35 days') into v_ok;
      select count(*) into v_nb from ops.envois e
       where e.prospect_id = new.prospect_id and e.type = 'reponse_rgpd' and e.id <> new.id
         and e.statut in ('prepare', 'approuve', 'envoye') and e.prepare_le > now() - interval '35 days';
      if not coalesce(v_ok, false) or v_nb >= 3 then
        raise exception using message = 'ops:rgpd_hors_demande', errcode = 'P0001';
      end if;
    else
      raise exception using message = 'ops:opposition', errcode = 'P0001';
    end if;
  end if;

  -- 3. l'envoi à froid fermé
  if new.type = 'premier_contact' and new.canal <> 'essai_e2e' and not public.ops_interrupteur('envoi_froid') then
    raise exception using message = 'ops:envoi_froid_ferme', errcode = 'P0001';
  end if;

  -- 4. selon le canal et le type
  if new.canal = 'formulaire_site' then
    if new.type <> 'premier_contact' then
      raise exception using message = 'ops:relance_formulaire', errcode = 'P0001';
    end if;
    perform pg_advisory_xact_lock(hashtext('ops:formulaire:' || coalesce(p.siren, p.domaine, new.prospect_id::text)));
    if exists (select 1 from ops.envois e join ops.prospects q on q.id = e.prospect_id
                where e.canal = 'formulaire_site' and e.statut in ('prepare', 'approuve', 'envoye') and e.id <> new.id
                  and ((p.siren is not null and q.siren = p.siren) or (p.domaine is not null and q.domaine = p.domaine))) then
      raise exception using message = 'ops:formulaire_deja', errcode = 'P0001';
    end if;
  elsif new.canal = 'email_sollicite' then
    if new.type = 'premier_contact' then
      raise exception using message = 'ops:froid_email_interdit', errcode = 'P0001';
    end if;
    v_ok := false;
    if v_preuve is not null and to_regclass('ops.reponses') is not null then
      if v_preuve ->> 'type' = 'message_recu' then
        select exists (select 1 from ops.reponses r where r.id::text = v_preuve ->> 'id' and r.prospect_id = new.prospect_id) into v_ok;
      elsif v_preuve ->> 'type' = 'case_entrant' then
        v_ok := (v_preuve ->> 'id') = new.prospect_id::text and p.source = 'entrant'
                and exists (select 1 from jsonb_array_elements(coalesce(to_jsonb(p) -> 'canaux', '[]'::jsonb)) c
                             where c ->> 'nature' = 'donnee_par_la_personne' and lower(c ->> 'valeur') = lower(new.destinataire) and c ? 'case_cochee_le');
      end if;
    end if;
    if not coalesce(v_ok, false) then
      raise exception using message = 'ops:preuve_demande_absente', errcode = 'P0001';
    end if;
  end if;

  if new.type = 'premier_contact' then
    if exists (select 1 from ops.envois e where e.prospect_id = new.prospect_id and e.id <> new.id and e.type in ('premier_contact', 'relance')
                and e.statut = 'envoye' and e.envoye_le > now() - interval '90 days') then
      raise exception using message = 'ops:90_jours', errcode = 'P0001';
    end if;
  elsif new.type = 'relance' then
    v_etape := to_jsonb(p) ->> 'etape';
    select max(coalesce(e.envoye_le, e.prepare_le)) into v_dernier from ops.envois e
     where e.prospect_id = new.prospect_id and e.id <> new.id and e.statut in ('prepare', 'approuve', 'envoye');
    if coalesce(v_etape, '') not in ('lien_envoye', 'oui')
       or exists (select 1 from ops.envois e where e.prospect_id = new.prospect_id and e.id <> new.id and e.type = 'relance' and e.statut <> 'annule')
       or v_dernier > now() - interval '72 hours' then
      raise exception using message = 'ops:relance_sollicitee', errcode = 'P0001';
    end if;
    if not exists (select 1 from ops.envois e where e.prospect_id = new.prospect_id and e.statut = 'envoye' and e.envoye_le > now() - interval '90 days') then
      raise exception using message = 'ops:relance_sans_contact', errcode = 'P0001';
    end if;
    select count(*), max(e.envoye_le) into v_nb, v_dernier from ops.envois e
     where e.prospect_id = new.prospect_id and e.type in ('premier_contact', 'relance') and e.statut = 'envoye' and e.envoye_le > now() - interval '90 days';
    if v_nb >= 3 then
      raise exception using message = 'ops:3_messages', errcode = 'P0001';
    end if;
    if v_dernier > now() - interval '72 hours' then
      raise exception using message = 'ops:72_heures', errcode = 'P0001';
    end if;
  end if;

  -- le filet des réponses du Gmail sollicité
  if new.type = 'reponse' and new.canal = 'email_sollicite' then
    perform pg_advisory_xact_lock(hashtext('ops:reponses:' || new.envoyeur));
    select count(*) into v_nb from ops.envois e
     where e.canal = new.canal and e.type = 'reponse' and e.id <> new.id and e.statut in ('prepare', 'approuve', 'envoye')
       and e.prepare_le > now() - interval '24 hours'
       and (case when new.prospect_id is not null then e.prospect_id = new.prospect_id else e.destinataire = new.destinataire end);
    if v_nb >= 3 then
      raise exception using message = 'ops:quota_reponses', errcode = 'P0001';
    end if;
    select count(*) into v_nb from ops.envois e
     where e.envoyeur = 'gmail' and e.type = 'reponse' and e.id <> new.id and e.statut in ('prepare', 'approuve', 'envoye')
       and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
    if new.envoyeur = 'gmail' and v_nb >= 20 then
      raise exception using message = 'ops:quota_reponses', errcode = 'P0001';
    end if;
  end if;

  -- 5. les plafonds du jour, à l'heure de Paris
  if new.canal in ('formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie') or new.type in ('premier_contact', 'relance') then
    perform pg_advisory_xact_lock(hashtext('ops:quota:' || new.canal));
    if not exists (select 1 from ops.quotas_canaux q where q.canal = new.canal and q.envoyeur = '*') then
      raise exception using message = 'ops:quota_absent', errcode = 'P0001';
    end if;
    for v_ligne in select q.envoyeur, q.plafond_jour, q.plafond_nouveaux_jour from ops.quotas_canaux q
                    where q.canal = new.canal and (q.envoyeur = '*' or q.envoyeur = new.envoyeur) loop
      select count(*) into v_nb from ops.envois e
       where e.canal = new.canal and e.id <> new.id and e.statut in ('prepare', 'approuve', 'envoye')
         and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour
         and (v_ligne.envoyeur = '*' or e.envoyeur = v_ligne.envoyeur)
         and (new.canal in ('email_sollicite', 'reponse_privee', 'messagerie')
           or (new.canal = 'formulaire_site' and e.type = 'premier_contact')
           or (new.canal <> 'formulaire_site' and e.type in ('premier_contact', 'relance')));
      if v_nb >= v_ligne.plafond_jour then
        raise exception using message = 'ops:quota', errcode = 'P0001';
      end if;
      if new.type = 'premier_contact' then
        select count(*) into v_nb from ops.envois e
         where e.canal = new.canal and e.id <> new.id and e.type = 'premier_contact' and e.statut in ('prepare', 'approuve', 'envoye')
           and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour and (v_ligne.envoyeur = '*' or e.envoyeur = v_ligne.envoyeur);
        if v_nb >= v_ligne.plafond_nouveaux_jour then
          raise exception using message = 'ops:quota_nouveaux', errcode = 'P0001';
        end if;
      end if;
    end loop;
  end if;

  -- 6. les verdicts : le Facteur seul, les trois oui
  if new.statut = 'approuve' then
    if (new.approuve_par_agent is distinct from 'facteur' and new.canal <> 'essai_e2e')
       or coalesce(new.verdicts ->> 'j3', '') <> 'ok' or coalesce(new.verdicts ->> 'j2', '') <> 'ok'
       or (new.type = 'premier_contact' and coalesce(new.verdicts ->> 'j1', '') <> 'ok')
       or (new.type <> 'premier_contact' and coalesce(new.verdicts ->> 'j1', '') not in ('ok', 'sans_objet')) then
      raise exception using message = 'ops:verdicts', errcode = 'P0001';
    end if;
    new.approuve_le := now();
  end if;
  return new;
end
$fn$;

create or replace function ops.annuler_sur_opposition()
returns trigger
language plpgsql
as $fn$
declare
  v_n int;
begin
  if new.expire_le is not null and new.expire_le <= now() then
    return new;
  end if;
  update ops.envois e set statut = 'annule'
   where e.statut in ('prepare', 'approuve') and e.type <> 'confirmation_stop'
     and ((new.cle_type in ('email', 'meta_id') and lower(e.destinataire) = new.cle_valeur)
       or (new.cle_type = 'domaine' and split_part(lower(e.destinataire), '@', 2) = new.cle_valeur)
       or exists (select 1 from ops.prospects q where q.id = e.prospect_id
                   and ((new.cle_type = 'siren' and q.siren = new.cle_valeur) or (new.cle_type = 'domaine' and q.domaine = new.cle_valeur)
                     or (new.cle_type = 'page_meta' and q.page_meta = new.cle_valeur) or (new.cle_type = 'instagram' and q.instagram = new.cle_valeur))));
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform public.ops_evenement_ajouter('systeme', 'envois_annules', null, v_n || ' envoi(s) en attente annulé(s) par une opposition', null);
  end if;
  return new;
end
$fn$;

create or replace function public.ops_garde_etat()
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $fn$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  return jsonb_build_object(
    'declencheurs', (select coalesce(jsonb_agg(jsonb_build_object('nom', t.tgname, 'fonction', f.proname, 'actif', t.tgenabled <> 'D') order by t.tgname), '[]'::jsonb)
                       from pg_trigger t join pg_proc f on f.oid = t.tgfoid join pg_namespace n on n.oid = f.pronamespace
                      where n.nspname = 'ops' and f.proname in ('garde_envois', 'annuler_sur_opposition') and not t.tgisinternal),
    'interrupteurs', jsonb_build_object('pause_generale', public.ops_interrupteur('pause_generale'), 'envoi_froid', public.ops_interrupteur('envoi_froid')),
    'plafonds', (select coalesce(jsonb_agg(jsonb_build_object('canal', q.canal, 'envoyeur', q.envoyeur, 'plafond_jour', q.plafond_jour, 'plafond_nouveaux_jour', q.plafond_nouveaux_jour) order by q.canal, q.envoyeur), '[]'::jsonb)
                   from ops.quotas_canaux q),
    'du_jour', (select coalesce(jsonb_agg(jsonb_build_object('canal', x.canal, 'envoyeur', x.envoyeur, 'envois', x.envois, 'nouveaux', x.nouveaux)), '[]'::jsonb)
                  from (select e.canal, e.envoyeur, count(*) as envois, count(*) filter (where e.type = 'premier_contact') as nouveaux
                          from ops.envois e
                         where e.statut in ('prepare', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour
                         group by e.canal, e.envoyeur) x));
end
$fn$;

drop trigger if exists garde_envois on ops.envois;
create trigger garde_envois before insert or update of statut on ops.envois for each row execute function ops.garde_envois();
drop trigger if exists annuler_sur_opposition on ops.opposition;
create trigger annuler_sur_opposition after insert or update of expire_le on ops.opposition for each row execute function ops.annuler_sur_opposition();

revoke all on function ops.garde_envois() from public, anon, authenticated, service_role;
revoke all on function ops.annuler_sur_opposition() from public, anon, authenticated, service_role;
revoke all on function public.ops_garde_etat() from public, anon, authenticated;
grant execute on function public.ops_garde_etat() to service_role;

comment on function ops.garde_envois() is 'Seconde serrure des envois (0099) : pause, opposition active, envoi à froid, formulaire, Gmail sollicité, relances, plafonds, verdicts.';
comment on function public.ops_garde_etat() is 'État de la garde des envois (0099) : déclencheurs, interrupteurs, plafonds, compteurs du jour ; aucune donnée de prospect.';
