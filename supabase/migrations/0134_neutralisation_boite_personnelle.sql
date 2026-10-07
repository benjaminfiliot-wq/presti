-- 0134_neutralisation_boite_personnelle.sql — 07/10/2026
--
-- INCIDENT : du 06/10 ~16 h UTC au 07/10, la relève du standardiste lisait la boîte « de l'entreprise » (IMAP_USER), qui est
-- le Gmail PERSONNEL de Benj (repli de lib/agents/acquisition/boiteProspection.ts, coupé le 07/10). Elle a recopié des
-- messages personnels dans ops.reponses, en a tiré des oppositions (ops.opposition) et des signaux STOP (ops.signaux).
-- Aucun de ces messages ne vient d'un prospect : aucun ne cite un de nos envois, aucun n'est dans une conversation, aucun
-- n'est rattaché à un prospect.
--
-- Cette migration NEUTRALISE, SANS RIEN SUPPRIMER (la purge définitive est une décision de Benj,
-- docs/agents/vercel-variables-prospection.md) :
--   1. ops.reponses : colonnes neutralisee_le / neutralisee_motif / classe_avant_neutralisation ; les lignes de cette
--      origine passent en classe « neutralisee » (classe d'origine gardée) : plus aucun agent ne les classe ni n'y répond.
--   2. ops.opposition : colonnes neutralisee_le / neutralisee_motif ; les oppositions tirées de ces messages sont échues
--      (expire_le = maintenant : toutes les lectures du dépôt ne tiennent que « expire_le is null or expire_le > now() »).
--      Un déclencheur efface la marque si une VRAIE opposition redevient définitive sur la même clé (acq_opposer).
--   3. ops.signaux : colonnes neutralise_le / neutralise_motif ; type « stop » → « stop_neutralise » (le palier, les
--      disjoncteurs et le pilotage ne comptent que type = 'stop').
--   4. Les lectures des agents excluent toute ligne neutralisée (défense en profondeur) : acq_reponses_a_traiter,
--      acq_reponses_a_repondre, acq_reponses_reclassees, acq_reponse_classer, acq_reponse_reclasser ; le pilotage ne les
--      affiche plus (pilotage_reponses_recentes, pilotage_reponses_du_jour).
--   5. acq_reponses_a_repondre ne rend plus QUE les réponses d'un fil ouvert par nous (un de nos envois cité, une
--      conversation sur nos canaux, ou un prospect à qui nous avons déjà écrit) : le répondeur reste muet sur tout le reste
--      (même règle que filInitieParNous dans lib/agents/acquisition/repondeur.ts). Remplace la règle 0123 (STOP / RGPD
--      hors fil), qu'elle englobe.
--
-- Critère d'origine (fermé) : source = 'courriel', imap_uid posé, ni envoi, ni conversation, ni prospect, reçu depuis le
-- 06/10 15:00 UTC. Oppositions : source releve_gmail / standardiste, motif stop, créées depuis le 06/10 15:00 UTC.
-- Signaux : type stop, sans envoi, depuis le 06/10 15:00 UTC.

-- ── 1. Colonnes ───────────────────────────────────────────────────────────────────────────────────────────────────────
alter table ops.reponses
  add column if not exists neutralisee_le timestamptz,
  add column if not exists neutralisee_motif text,
  add column if not exists classe_avant_neutralisation text;
alter table ops.reponses drop constraint if exists reponses_neutralisee_motif_check;
alter table ops.reponses add constraint reponses_neutralisee_motif_check check (neutralisee_motif is null or char_length(neutralisee_motif) <= 120);

alter table ops.opposition
  add column if not exists neutralisee_le timestamptz,
  add column if not exists neutralisee_motif text;
alter table ops.opposition drop constraint if exists opposition_neutralisee_motif_check;
alter table ops.opposition add constraint opposition_neutralisee_motif_check check (neutralisee_motif is null or char_length(neutralisee_motif) <= 120);

alter table ops.signaux
  add column if not exists neutralise_le timestamptz,
  add column if not exists neutralise_motif text;
alter table ops.signaux drop constraint if exists signaux_neutralise_motif_check;
alter table ops.signaux add constraint signaux_neutralise_motif_check check (neutralise_motif is null or char_length(neutralise_motif) <= 120);
alter table ops.signaux drop constraint if exists signaux_type_check;
alter table ops.signaux add constraint signaux_type_check check (type = any (array['stop', 'plainte', 'avis_abus', 'echec_soumission',
  'reponse_positive', 'gmail_refus', 'erreur_meta_politique', 'erreur_meta_debit', 'stop_neutralise']));

-- Une vraie opposition définitive reposée sur une clé neutralisée efface la marque (acq_opposer remet expire_le à null).
create or replace function ops.opposition_reactivee() returns trigger language plpgsql set search_path to 'ops', 'public', 'pg_temp' as $f$
begin
  if new.expire_le is null or new.expire_le > now() then
    new.neutralisee_le := null;
    new.neutralisee_motif := null;
  end if;
  return new;
end
$f$;
drop trigger if exists opposition_reactivee on ops.opposition;
create trigger opposition_reactivee before update of expire_le on ops.opposition
  for each row when (old.neutralisee_le is not null) execute function ops.opposition_reactivee();

-- ── 2. Neutralisation (aucune suppression) ────────────────────────────────────────────────────────────────────────────
update ops.reponses
   set classe_avant_neutralisation = classe,
       classe = 'neutralisee',
       classe_par = 'neutralisation',
       traitee_le = coalesce(traitee_le, now()),
       neutralisee_le = now(),
       neutralisee_motif = 'boite_personnelle_0610 : relevé hors prospection (repli IMAP_USER)'
 where neutralisee_le is null
   and source = 'courriel' and imap_uid is not null
   and envoi_id is null and conversation_id is null and prospect_id is null
   and recu_le >= timestamptz '2026-10-06 15:00:00+00';

update ops.opposition
   set expire_le = now(),
       neutralisee_le = now(),
       neutralisee_motif = 'boite_personnelle_0610 : opposition tirée d''un message personnel'
 where neutralisee_le is null
   and source in ('releve_gmail', 'standardiste') and motif = 'stop'
   and cree_le >= timestamptz '2026-10-06 15:00:00+00'
   and (expire_le is null or expire_le > now());

update ops.signaux
   set type = 'stop_neutralise',
       neutralise_le = now(),
       neutralise_motif = 'boite_personnelle_0610 : STOP tiré d''un message personnel'
 where type = 'stop' and envoi_id is null
   and le >= timestamptz '2026-10-06 15:00:00+00';

-- ── 3. Les lectures des agents ────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_reponses_a_traiter(p_limite integer) returns jsonb
  language sql security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
  select coalesce(jsonb_agg(to_jsonb(r.*) order by r.recu_le), '[]'::jsonb)
    from (select * from ops.reponses where classe is null and neutralisee_le is null order by recu_le limit greatest(coalesce(p_limite, 1), 0)) r
$function$;

create or replace function public.acq_reponses_a_repondre(p_limite integer) returns jsonb
  language sql security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
  select coalesce(jsonb_agg(
    to_jsonb(r.*) || jsonb_build_object('notre_dernier_envoi_le', d.envoye_le, 'notre_dernier_envoi_type', d.type)
    order by r.recu_le), '[]'::jsonb)
    from ops.reponses r
    left join lateral (
      select e.envoye_le, e.type
        from ops.envois e
       where e.statut = 'envoye'
         and ((r.prospect_id is not null and e.prospect_id = r.prospect_id)
           or (r.conversation_id is not null and e.conversation_id = r.conversation_id))
       order by e.envoye_le desc
       limit 1
    ) d on true
   where r.classe is not null
     and r.repondue_le is null
     and r.actes_le is not null
     and r.neutralisee_le is null
     and r.classe in ('question', 'prix', 'appel', 'stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'entrant')
     -- 0134 : seulement un fil ouvert par nous (un de nos envois cité, une conversation sur nos canaux, un prospect à qui
     -- nous avons déjà écrit). Tout le reste ne reçoit AUCUNE réponse automatique (englobe la règle 0123 du STOP hors fil).
     and (r.envoi_id is not null or r.conversation_id is not null or (r.prospect_id is not null and d.envoye_le is not null))
   limit greatest(coalesce(p_limite, 1), 0)
$function$;

create or replace function public.acq_reponses_reclassees(p_limite integer) returns jsonb
  language sql security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
    from (
      select jsonb_build_object('id', r.id, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id, 'classe', r.classe) as x
        from ops.reponses r
       where r.classe_par = 'benj' and r.actes_le is null and r.neutralisee_le is null
       order by r.traitee_le
       limit greatest(coalesce(p_limite, 1), 0)
    ) s
$function$;

create or replace function public.acq_reponse_classer(p_id uuid, p_classement jsonb) returns void
  language plpgsql security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
begin
  update ops.reponses
     set classe = p_classement ->> 'classe',
         classe_par = coalesce(p_classement ->> 'source', 'regle'),
         certitude = nullif(p_classement ->> 'certitude', '')::numeric,
         faq_id = nullif(p_classement ->> 'faq_id', ''),
         rappel_le = nullif(p_classement ->> 'rappel_le', '')::date,
         traitee_le = now(),
         actes_le = case when coalesce(p_classement ->> 'classe', '') = 'accuse_site' then now() else null end
   where id = p_id
     and neutralisee_le is null;
end
$function$;

create or replace function public.acq_reponse_reclasser(p_decision uuid, p_par text) returns jsonb
  language plpgsql security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
declare
  v_d            record;
  v_reponse_id   uuid;
  v_classe       text;
begin
  select id, statut, creee_par, cle_idempotence, choix into v_d from ops.decisions where id = p_decision;
  if not found or v_d.statut <> 'tranchee' or v_d.creee_par <> 'standardiste' or v_d.cle_idempotence not like 'acq:reponse:%' then
    return null;
  end if;
  v_reponse_id := split_part(v_d.cle_idempotence, ':', 3)::uuid;
  v_classe := case when v_d.choix = 'ignorer' then 'ignoree' else v_d.choix end;

  -- 0134 : une réponse neutralisée ne se reclasse pas.
  if exists (select 1 from ops.reponses where id = v_reponse_id and neutralisee_le is not null) then
    return null;
  end if;

  if exists (select 1 from ops.reponses where id = v_reponse_id and reclassee_par_decision = p_decision) then
    return (select jsonb_build_object('reponse_id', r.id, 'classe', r.classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id)
              from ops.reponses r where r.id = v_reponse_id);
  end if;

  update ops.reponses
     set classe = v_classe,
         classe_par = p_par,
         certitude = 1,
         traitee_le = now(),
         actes_le = null,
         reclassee_par_decision = p_decision,
         repondue_le = case when v_classe in ('ignoree', 'rgpd_autre') then now() else null end
   where id = v_reponse_id
     and neutralisee_le is null;
  if not found then
    return null;
  end if;

  return (select jsonb_build_object('reponse_id', r.id, 'classe', r.classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id)
            from ops.reponses r where r.id = v_reponse_id);
end
$function$;

-- ── 4. Le pilotage n'affiche plus ces lignes ──────────────────────────────────────────────────────────────────────────
create or replace function public.pilotage_reponses_recentes(p_limite integer)
  returns table(id uuid, recu_le timestamptz, classe text, texte_recu text, reponse_envoyee text)
  language sql stable security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
 select r.id,r.recu_le,r.classe,r.texte,
 (select e.texte from ops.envois e where e.prospect_id=r.prospect_id and e.type='reponse' and e.prepare_le>=r.recu_le order by e.prepare_le limit 1)
 from ops.reponses r where r.neutralisee_le is null order by r.recu_le desc limit least(greatest(1,coalesce(p_limite,1)),10)
$function$;

create or replace function public.pilotage_reponses_du_jour()
  returns table(classe text, nombre integer)
  language sql stable security definer set search_path to 'ops', 'public', 'pg_temp' as $function$
 select coalesce(r.classe,'a_lire'),count(*)::integer from ops.reponses r
 where r.neutralisee_le is null
 and r.recu_le>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris')
 and r.recu_le<(((now() at time zone 'Europe/Paris')::date+1)::timestamp at time zone 'Europe/Paris')
 group by coalesce(r.classe,'a_lire')
$function$;
