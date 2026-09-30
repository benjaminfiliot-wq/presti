-- ============================================================================================
-- 0099 · La garde des envois, tenue par la base : deux déclencheurs sur ops.envois et
--        ops.opposition, et l'état de la garde (ops_garde_etat)
--        (fiche 026-034, série 026 ; plan SaaS/Produit/Ecosysteme-Plan-2026-09-24.md §3.2 (fin),
--         rectification du 24/09 §3.6, §3.10 et §3.11, voie gratuite du 25/09 §1 et §3.1,
--         garde-fous 8 et 9 ; revue du 25/09 : filet des réponses, réponse RGPD)
--
-- Pourquoi dans la base : le plan veut que la loi et les plateformes soient respectées MÊME SI LE
-- CODE SE TROMPE. Les fonctions acq_* de la série acquisition (0105, 0106, 0111) contrôlent déjà ces
-- règles avant d'écrire un envoi : elles sont la PREMIÈRE serrure, celle qui rend un refus propre
-- ({ ok: false, raison }). Ce fichier pose la SECONDE : elle tient même si une fonction future
-- oublie un contrôle, et aucun agent ne peut la lever (aucune fonction ici ne retire une opposition,
-- n'ouvre envoi_froid ni ne change un plafond).
--
-- Pourquoi on garde surtout l'ENTRÉE en `prepare`, `attend_accord_benj` ou `approuve` : tant
-- qu'un envoi n'est pas parti, le refuser ne coûte qu'une ligne. Le passage à `envoye` n'a que
-- deux refus, décidés par Benj le 27/09 : la pause générale active (`ops:pause_generale`) et
-- l'accord consommé qui est tombé, échu (24 h) ou émis avant le dernier mouvement de la pause
-- (`ops:accord_perime`). Le porteur de l'usine (026-095) consigne donc `envoye` AVANT de soumettre
-- le message, et ne soumet rien si la base refuse : sinon un message réel resterait sans trace.
-- Hors ces deux cas, le passage à `envoye` passe ; s'il contredit une autre règle (opposition
-- arrivée entre-temps, envoi jamais approuvé, verdicts incomplets, aucun accord consommé), un
-- événement `envoi_hors_regle` le signale au veilleur A0.
--
-- Pourquoi la règle la plus stricte s'applique : deux serrures qui comptent chacune de leur côté ne
-- peuvent pas se contredire à l'avantage d'un envoi. Un envoi ne passe que si les acq_* ET ce
-- déclencheur l'acceptent ; une ligne de plafond par envoyeur s'ajoute à la ligne '*' du canal sans
-- jamais la remplacer ; une opposition se lit sur toutes les clés connues du prospect et du
-- destinataire ; un premier contact encore en attente compte déjà pour les 90 jours ; un doute
-- (table ou colonne pas encore là, preuve illisible) vaut un refus.
--
-- Seul le Facteur approuve, et jamais sans les trois verdicts : `attend_accord_benj` et `approuve`
-- exigent approuve_par_agent = 'facteur' (sauf le canal essai_e2e), j3 et j2 à « ok », et j1 à
-- « ok » pour un premier contact (« ok » ou « sans_objet » pour les autres types) ; sinon
-- ops:verdicts.
--
-- Et jamais sans l'accord de Benj (R24, correction du 27/09 de la fiche) : un envoi jugé passe
-- en `attend_accord_benj` ; Benj (un fondateur) donne un accord qui porte sur ce canal, ce
-- destinataire et les octets exacts du texte (empreinte_texte), daté par la base, valable 24 h au
-- plus, consommé une seule fois par l'entrée en `approuve`. Une pause, une opposition, une sortie
-- de l'attente ou l'échéance le font tomber, avant l'approbation comme avant l'envoi. Dès
-- l'attente, l'envoi est figé : ni canal, ni envoyeur, ni type, ni prospect, ni destinataire, ni
-- texte, ni en-têtes, ni verdicts, ni le Facteur qui les porte ne changent plus (ops:envoi_fige ;
-- en-têtes et verdicts : décision de Benj du 27/09), et un envoi parti ne revient pas en arrière.
-- Les dates (prepare_le, approuve_le, envoye_le, emis_le) sont celles de la base, jamais celles de
-- l'écrivain : un envoi antidaté ne libère aucune place au plafond du jour.
--
-- Le plafond du jour compte les ENTRÉES (contre-vérification du 27/09) : toute entrée ou
-- ré-entrée en `prepare`, `attend_accord_benj` ou `approuve` reprend prepare_le := now(), et compte
-- au jour de Paris où elle a lieu. Une fiche sautée, périmée ou annulée la veille qui revient
-- aujourd'hui prend donc une place d'aujourd'hui, et un stock préparé sur plusieurs jours ne part
-- pas en un seul. Une fiche insérée directement en `saute`, `perime` ou `annule` passe les mêmes
-- contrôles qu'une entrée en `prepare`.
--
-- Ce que la base garantit, dans cet ordre, à l'entrée en `prepare`, `attend_accord_benj` ou
-- `approuve`, et à toute insertion :
--   1. la pause générale refuse tout ;
--   2. une opposition active (définitive, ou « pas maintenant » non échue) refuse tout, sauf une
--      seule confirmation de STOP dans les 24 h et la réponse due à une demande RGPD (35 jours,
--      3 au plus) ; une nouvelle opposition annule les envois en attente (sauf la confirmation) ;
--   3. envoi_froid fermé : aucun premier contact (hors essai_e2e) ;
--   4. formulaire_site : premier contact seulement, UN formulaire par entreprise (SIREN ou domaine,
--      à vie) ; email_sollicite : jamais de premier contact, toujours une preuve de demande
--      (message reçu de ce prospect, ou case cochée d'une demande entrante), une seule relance,
--      après un « oui », à 72 h au moins du dernier envoi ; 90 jours sans recontact, 3 messages
--      au plus, 72 h d'écart ; le filet des réponses (3 par prospect sur 24 h, 20 par jour) ;
--   5. les plafonds du jour de Paris, ligne (canal, '*') obligatoire : un canal sans plafond est
--      fermé ; le palier du formulaire ne compte que les formulaires ; email_sollicite,
--      reponse_privee et messagerie comptent tous leurs messages ;
--   6. les verdicts, ci-dessus ;
--   7. en `approuve` : l'accord de Benj, ci-dessus.
-- Un envoi qui attend l'accord compte partout où compte un envoi préparé ou approuvé.
-- Les comptages se font sous pg_advisory_xact_lock, pris dans le même ordre partout (canal, puis
-- entreprise, puis envoyeur) : deux envois simultanés ne peuvent pas passer par la même place.
--
-- Avant 0105 et 0106 : la colonne preuve_demande, la table ops.reponses et l'étape du prospect
-- n'existent pas encore. Elles sont lues par to_jsonb(new), to_jsonb(p) et to_regclass : tant
-- qu'elles manquent, tout email_sollicite est refusé (ops:preuve_demande_absente) et toute relance
-- aussi (ops:relance_sollicitee). La garde ne casse pas ; elle ferme.
--
-- Ce que ce fichier pose : la contrainte de statut d'ops.envois (le statut attend_accord_benj),
-- la table ops.accords_benj (RLS sans politique, aucun droit d'API), quatre fonctions, trois
-- déclencheurs (drop trigger if exists puis create trigger), leurs droits et leurs commentaires.
-- Aucune autre table, aucune colonne, aucune politique. Rejouable sans dommage.
--
-- Le froid reste fermé jusqu'au 12/10 au moins : envoi_froid ne s'ouvre que par
-- acq_envoi_froid_ouvrir (0111), qui exige la date ; ce fichier ne l'écrit pas en dur.
--
-- Erreurs métier : `raise exception using message = 'ops:<code>', errcode = 'P0001'`.
-- Codes : pause_generale, opposition, confirmation_stop, rgpd_hors_demande, envoi_froid_ferme,
-- relance_formulaire, formulaire_deja, froid_email_interdit, preuve_demande_absente, 90_jours,
-- relance_sollicitee, relance_sans_contact, 3_messages, 72_heures, quota_reponses, quota_absent,
-- quota, quota_nouveaux, verdicts ; et depuis le 27/09 : envoi_fige, accord_absent,
-- accord_perime, accord_rejoue, accord_different, accord_auteur, accord_envoi, accord_fige.
-- Au passage à envoye, seuls pause_generale et accord_perime.
-- ============================================================================================

-- ── 0. L'accord de Benj : le statut d'attente et la table des accords (R24) ─────────────────
alter table ops.envois drop constraint if exists envois_statut_check;
alter table ops.envois add constraint envois_statut_check
  check (statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye', 'saute', 'perime', 'annule'));

create table if not exists ops.accords_benj (
  id               uuid primary key default gen_random_uuid(),
  envoi_id         uuid not null references ops.envois(id) on delete cascade,
  canal            text not null,
  destinataire     text,
  empreinte_texte  text not null check (empreinte_texte ~ '^[0-9a-f]{64}$'),
  donne_par        uuid not null references public.artisans(id),
  emis_le          timestamptz not null default now(),
  expire_le        timestamptz not null,
  utilise_le       timestamptz,
  annule_le        timestamptz,
  constraint accords_benj_24_heures check (expire_le > emis_le and expire_le <= emis_le + interval '24 hours')
);
create index if not exists accords_benj_envoi on ops.accords_benj (envoi_id, emis_le desc);
alter table ops.accords_benj enable row level security;
revoke all on table ops.accords_benj from public, anon, authenticated, service_role;
comment on table ops.accords_benj is
  'Accords individuels de Benj (R24, 026-034) : un fondateur accepte UN envoi en attend_accord_benj, sur son canal, son destinataire et les octets de son texte (empreinte_texte) ; daté par la base, 24 h au plus, consommé une fois par l''entrée en approuve, annulé par une pause, une opposition ou la sortie de l''attente.';

-- ── 0 bis. L'émission d'un accord, gardée elle aussi ─────────────────────────────────────────
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
    -- un accord ne change plus : seul utilise_le ou annule_le se pose, une fois, jamais les deux
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

  -- l'émission : un fondateur seulement
  if new.donne_par is null
     or not exists (select 1 from public.artisans ar where ar.id = new.donne_par and ar.is_founder) then
    raise exception using message = 'ops:accord_auteur', errcode = 'P0001';
  end if;
  -- la base date l'accord ; 24 h au plus ; ni consommé ni annulé à sa naissance
  new.emis_le := now();
  new.expire_le := least(coalesce(new.expire_le, now() + interval '24 hours'), now() + interval '24 hours');
  new.utilise_le := null;
  new.annule_le := null;
  if new.expire_le <= now() then
    raise exception using message = 'ops:accord_perime', errcode = 'P0001';
  end if;
  -- l'accord porte sur l'envoi tel qu'il attend : son canal, son destinataire, les octets de son texte
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
comment on function ops.garde_accords() is
  'Déclencheur de ops.accords_benj (026-034, R24) : un accord ne naît que d''un fondateur (ops:accord_auteur), daté par la base et valable 24 h au plus (ops:accord_perime), sur un envoi en attend_accord_benj dont il recopie exactement le canal, le destinataire et l''empreinte du texte (ops:accord_envoi) ; ensuite il ne change plus, sauf consommé ou annulé une fois (ops:accord_fige).';

drop trigger if exists garde_accords on ops.accords_benj;
create trigger garde_accords
  before insert or update on ops.accords_benj
  for each row execute function ops.garde_accords();
comment on trigger garde_accords on ops.accords_benj is
  'Aucun accord de Benj ne se fabrique ni ne se recycle (026-034, R24).';

-- ── 1. La garde de l'entrée d'un envoi ───────────────────────────────────────────────────────
create or replace function ops.garde_envois()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_pj          jsonb := '{}'::jsonb;
  v_dest        text;
  v_siren       text;
  v_domaine     text;
  v_page_meta   text;
  v_instagram   text;
  v_pause       boolean;
  v_oppose      boolean;
  v_verdicts_ok boolean;
  v_hors        text;
  v_preuve      jsonb;
  v_id_preuve   text;
  v_ok          boolean;
  v_n           integer;
  v_dernier     timestamptz;
  v_jour        date;
  v_debut       timestamptz;
  v_fin         timestamptz;
  v_q_jour      integer;
  v_q_nouveaux  integer;
  v_pause_le    timestamptz;
  v_acc         record;
begin
  -- Les dates sont celles de la base, jamais celles de l'écrivain : le plafond du jour, les 90
  -- jours et les 72 h ne comptent que ce que la base a daté (un envoi antidaté ne libère rien).
  if tg_op = 'INSERT' then
    new.prepare_le := now();
    new.approuve_le := null;
    new.envoye_le := case when new.statut = 'envoye' then now() end;
  else
    new.prepare_le := old.prepare_le;
    -- L'envoi est figé dès l'attente de l'accord de Benj : ce que les juges et Benj ont vu est ce
    -- qui part, en-têtes et verdicts compris (décision de Benj du 27/09). Pour changer un texte qui
    -- attend, on le saute et on en prépare un autre. id_externe reste libre (l'identifiant rendu
    -- par Gmail ou Meta).
    if old.statut in ('attend_accord_benj', 'approuve', 'envoye')
       and (   new.canal is distinct from old.canal
            or new.envoyeur is distinct from old.envoyeur
            or new.type is distinct from old.type
            or new.prospect_id is distinct from old.prospect_id
            or new.destinataire is distinct from old.destinataire
            or new.empreinte_texte is distinct from old.empreinte_texte
            or new.entetes is distinct from old.entetes
            or new.verdicts is distinct from old.verdicts
            or new.approuve_par_agent is distinct from old.approuve_par_agent
            or (to_jsonb(new) -> 'preuve_demande') is distinct from (to_jsonb(old) -> 'preuve_demande')) then
      raise exception using message = 'ops:envoi_fige', errcode = 'P0001';
    end if;
    -- Un envoi parti ne revient pas en arrière (son accord a servi une fois).
    if old.statut = 'envoye' and new.statut is distinct from old.statut then
      raise exception using message = 'ops:envoi_fige', errcode = 'P0001';
    end if;
    new.approuve_le := old.approuve_le;
    new.envoye_le := old.envoye_le;
    -- Un statut qui ne change pas ne se juge pas une seconde fois.
    if new.statut is not distinct from old.statut then
      return new;
    end if;
    -- Toute entrée ou ré-entrée dans la file (prepare, attente, approbation) est datée ici par la
    -- base : elle compte au plafond du jour où elle a lieu, pas au jour de la première préparation
    -- (une fiche de la veille réanimée, ou approuvée aujourd'hui, prend une place d'aujourd'hui).
    if new.statut in ('prepare', 'attend_accord_benj', 'approuve') then
      new.prepare_le := now();
    end if;
    if new.statut = 'envoye' then
      new.envoye_le := now();
    end if;
    -- L'envoi quitte l'attente autrement que vers approuve (retour en prepare, saute, perime,
    -- annule, dont l'annulation sur opposition) : ses accords non consommés tombent.
    if old.statut = 'attend_accord_benj' and new.statut <> 'approuve' then
      update ops.accords_benj a
         set annule_le = now()
       where a.envoi_id = new.id
         and a.utilise_le is null
         and a.annule_le is null;
    end if;
  end if;
  -- Une mise à jour n'est regardée qu'à l'entrée en prepare, attend_accord_benj ou approuve, ou à
  -- la consignation d'un envoi parti. Une insertion l'est toujours : une fiche écrite directement
  -- en saute, perime ou annule passe les mêmes contrôles qu'une entrée en prepare.
  if tg_op = 'UPDATE' and new.statut not in ('prepare', 'attend_accord_benj', 'approuve', 'envoye') then
    return new;
  end if;

  -- Ce que les règles lisent. Le prospect est lu en jsonb : la série acquisition lui ajoute des
  -- colonnes (etape, canaux) que ce fichier ne doit pas exiger.
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

  -- L'opposition ACTIVE : définitive, ou temporaire pas encore échue. Toutes les clés du prospect,
  -- et le destinataire (adresse, domaine de l'adresse, identifiant Meta ou compte).
  select exists (
    select 1
      from ops.opposition o
     where (o.expire_le is null or o.expire_le > now())
       and (   (o.cle_type = 'siren' and o.cle_valeur = v_siren)
            or (o.cle_type = 'domaine' and o.cle_valeur in (v_domaine, split_part(v_dest, '@', 2)))
            or (o.cle_type = 'page_meta' and o.cle_valeur = v_page_meta)
            or (o.cle_type = 'instagram' and o.cle_valeur in (v_instagram, v_dest))
            or (o.cle_type in ('email', 'meta_id', 'facebook', 'linkedin', 'telephone') and o.cle_valeur = v_dest))
  ) into v_oppose;

  -- Les trois verdicts et le seul Facteur.
  v_verdicts_ok := (coalesce(new.approuve_par_agent, '') = 'facteur' or new.canal = 'essai_e2e')
                   and coalesce(new.verdicts ->> 'j3', '') = 'ok'
                   and coalesce(new.verdicts ->> 'j2', '') = 'ok'
                   and (coalesce(new.verdicts ->> 'j1', '') = 'ok'
                        or (new.type <> 'premier_contact' and coalesce(new.verdicts ->> 'j1', '') = 'sans_objet'));

  -- La consignation d'un envoi : deux refus seulement (décision de Benj du 27/09), puis le
  -- signalement de tout autre écart au veilleur.
  if new.statut = 'envoye' then
    -- la pause générale active (un interrupteur absent ferme aussi) : rien ne part
    if public.ops_interrupteur('pause_generale') then
      raise exception using message = 'ops:pause_generale', errcode = 'P0001';
    end if;
    -- R24 : l'accord de Benj consommé par l'approbation de CET envoi est tombé depuis, échu ou émis
    -- avant le dernier mouvement de la pause : rien ne part (on repasse par l'attente et un accord neuf)
    select a.emis_le, a.expire_le into v_acc
      from ops.accords_benj a
     where a.envoi_id = new.id
       and a.utilise_le is not null
     order by a.utilise_le desc
     limit 1;
    if found and (v_acc.expire_le <= now() or v_acc.emis_le <= coalesce(v_pause_le, '-infinity'::timestamptz)) then
      raise exception using message = 'ops:accord_perime', errcode = 'P0001';
    end if;
    v_hors := null;
    if not found then
      v_hors := 'sans accord de Benj';
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

  -- ── Entrée en prepare ou approuve ──
  -- 1. La pause générale (ops_interrupteur refuse aussi un interrupteur absent : la garde ferme).
  if public.ops_interrupteur('pause_generale') then
    raise exception using message = 'ops:pause_generale', errcode = 'P0001';
  end if;

  -- Le verrou du canal, pris le premier et gardé jusqu'à la fin de la transaction : les comptages
  -- qui suivent (formulaire par entreprise, relances, réponses, plafonds) ne voient pas un envoi
  -- concurrent passer par la même place.
  perform pg_advisory_xact_lock(hashtext('ops:quota:' || new.canal));

  -- 2. L'opposition, et ses deux seules exceptions.
  if v_oppose and new.type not in ('confirmation_stop', 'reponse_rgpd') then
    raise exception using message = 'ops:opposition', errcode = 'P0001';
  end if;
  if v_oppose and new.type = 'confirmation_stop' then
    -- une seule confirmation, et seulement dans les 24 h d'une opposition définitive d'une de ses clés
    select exists (
             select 1
               from ops.opposition o
              where o.expire_le is null
                and o.cree_le > now() - interval '24 hours'
                and (   (o.cle_type = 'siren' and o.cle_valeur = v_siren)
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
                and (   (new.prospect_id is not null and e.prospect_id = new.prospect_id)
                     or (new.prospect_id is null and lower(btrim(e.destinataire)) = v_dest)))
      into v_ok;
    if not coalesce(v_ok, false) then
      raise exception using message = 'ops:confirmation_stop', errcode = 'P0001';
    end if;
  end if;
  if new.type = 'reponse_rgpd' then
    -- due (RGPD art. 12(3)) à qui a fait une demande sur ses données depuis moins de 35 jours,
    -- opposé ou non, 3 au plus ; sans demande connue (ops.reponses pas encore là), refusée
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

  -- 3. L'envoi à froid fermé : aucun premier contact tant que Benj n'a pas ouvert envoi_froid.
  if new.type = 'premier_contact' and new.canal <> 'essai_e2e' and not public.ops_interrupteur('envoi_froid') then
    raise exception using message = 'ops:envoi_froid_ferme', errcode = 'P0001';
  end if;

  -- 4. Selon le canal et le type.
  if new.canal = 'formulaire_site' then
    -- le formulaire ne sert qu'au premier contact, et une seule fois par entreprise, à vie
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
         and (   e.prospect_id = new.prospect_id
              or (v_siren is not null and p2.siren = v_siren)
              or (v_domaine is not null and lower(btrim(p2.domaine)) = v_domaine))
    ) then
      raise exception using message = 'ops:formulaire_deja', errcode = 'P0001';
    end if;
  end if;

  if new.canal = 'email_sollicite' then
    -- le Gmail de prospection n'écrit qu'à qui a écrit : jamais de premier contact, toujours une preuve
    if new.type = 'premier_contact' then
      raise exception using message = 'ops:froid_email_interdit', errcode = 'P0001';
    end if;
    v_preuve := to_jsonb(new) -> 'preuve_demande';
    v_ok := false;
    if jsonb_typeof(v_preuve) = 'object' and new.prospect_id is not null then
      v_id_preuve := lower(btrim(coalesce(v_preuve ->> 'id', '')));
      if v_preuve ->> 'type' = 'message_recu' and to_regclass('ops.reponses') is not null then
        -- un message reçu de CE prospect ; ni un répondeur automatique, ni l'accusé d'un site
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
        -- la demande entrante de ce prospect, case cochée, sur l'adresse qu'il a donnée lui-même
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
    -- 90 jours sans recontact ; un premier contact encore en attente compte déjà
    if exists (
      select 1
        from ops.envois e
       where e.prospect_id = new.prospect_id
         and e.id <> new.id
         and e.type in ('premier_contact', 'relance')
         and (   (e.statut = 'envoye' and coalesce(e.envoye_le, e.prepare_le) > now() - interval '90 days')
              or e.statut in ('prepare', 'attend_accord_benj', 'approuve'))
    ) then
      raise exception using message = 'ops:90_jours', errcode = 'P0001';
    end if;
  end if;

  if new.type = 'relance' then
    -- d'abord la règle sollicitée : une seule relance, après un « oui », à 72 h au moins du dernier envoi
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
    -- puis les règles générales : un contact dans les 90 jours, 3 messages au plus, 72 h d'écart
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

  -- lien_maquette, reponse, confirmation_stop et reponse_rgpd : des réponses dans un fil ouvert,
  -- sans règle de 90 jours, de 72 h ni de 3 messages. La réponse par e-mail a son filet propre :
  -- un répondeur automatique mal classé ne doit pas lancer une boucle depuis le Gmail.
  if new.canal = 'email_sollicite' and new.type = 'reponse' then
    perform pg_advisory_xact_lock(hashtext('ops:reponses:' || new.envoyeur));
    select count(*) into v_n
      from ops.envois e
     where e.canal = new.canal
       and e.type = 'reponse'
       and e.id <> new.id
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
       and e.prepare_le > now() - interval '24 hours'
       and (   (new.prospect_id is not null and e.prospect_id = new.prospect_id)
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

  -- 5. Les plafonds du jour de Paris (le verrou du canal est tenu depuis le début). Sur
  --    formulaire_site, le palier ne compte que les formulaires ; sur email_sollicite,
  --    reponse_privee et messagerie, tout message compte ; sur les autres canaux, les premiers
  --    contacts et les relances. Un canal sans ligne '*' est fermé.
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
    -- une ligne propre à l'envoyeur n'est jamais obligatoire ; si elle existe, elle s'ajoute
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

  -- 6. Les verdicts : seul le Facteur présente à Benj, puis approuve, et jamais sans les trois.
  if new.statut in ('attend_accord_benj', 'approuve') then
    if not coalesce(v_verdicts_ok, false) then
      raise exception using message = 'ops:verdicts', errcode = 'P0001';
    end if;
  end if;

  -- 7. L'accord de Benj (R24) : approuve ne s'entre que depuis l'attente, avec l'accord le plus
  --    récent non annulé de CET envoi, donné par un fondateur, ni consommé, ni échu, ni antérieur
  --    à un mouvement de la pause, sur le canal, le destinataire et les octets du texte de l'envoi.
  --    Il est consommé ici, une seule fois ; les autres accords de l'envoi tombent.
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
comment on function ops.garde_envois() is
  'Déclencheur de ops.envois (026-034) : date tout par la base (prepare_le à chaque entrée en prepare, attend_accord_benj ou approuve, qui compte au plafond du jour où elle a lieu ; approuve_le, envoye_le), fige un envoi dès l''attente de l''accord de Benj, en-têtes et verdicts compris (ops:envoi_fige), n''entre en approuve que depuis attend_accord_benj avec un accord de Benj valable, consommé une fois (ops:accord_*), et refuse l''entrée en prepare, attend_accord_benj ou approuve, comme toute insertion, contraire à la pause, à l''opposition active, à envoi_froid, aux règles du formulaire et du Gmail sollicité, aux 90 jours, 3 messages et 72 h, au filet des réponses, aux plafonds du jour de Paris ou aux trois verdicts du seul Facteur (codes ops:*) ; le passage à envoye n''est refusé que sous pause active (ops:pause_generale) ou accord tombé (ops:accord_perime), et signalé (envoi_hors_regle) s''il contredit une autre règle.';

drop trigger if exists garde_envois on ops.envois;
create trigger garde_envois
  before insert or update on ops.envois
  for each row execute function ops.garde_envois();
comment on trigger garde_envois on ops.envois is
  'La seconde serrure des envois (026-034) : les fonctions acq_* sont la première ; celle-ci tient même si l''une d''elles oublie un contrôle. Elle écoute toute mise à jour (correction du 27/09) : aucune colonne oubliée ne lui échappe.';

-- ── 2. Une nouvelle opposition annule les envois en attente ──────────────────────────────────
create or replace function ops.annuler_sur_opposition()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n integer;
begin
  -- une opposition déjà échue ne bloque plus rien : elle n'annule rien non plus
  if new.expire_le is not null and new.expire_le <= now() then
    return null;
  end if;
  -- les envois préparés, en attente d'accord ou approuvés dont le prospect ou le destinataire porte la clé passent en
  -- annule, sauf la confirmation de STOP ; l'étape du prospect n'est pas touchée (acq_opposer)
  update ops.envois e
     set statut = 'annule'
   where e.statut in ('prepare', 'attend_accord_benj', 'approuve')
     and e.type <> 'confirmation_stop'
     and (   exists (select 1
                       from ops.prospects p
                      where p.id = e.prospect_id
                        and (   (new.cle_type = 'siren' and p.siren = new.cle_valeur)
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
comment on function ops.annuler_sur_opposition() is
  'Déclencheur de ops.opposition (026-034) : une opposition active fait passer en annule les envois prepare, attend_accord_benj ou approuve de son prospect ou de son destinataire, sauf la confirmation de STOP ; un événement sans donnée personnelle ; l''étape du prospect reste à acq_opposer.';

drop trigger if exists annuler_sur_opposition on ops.opposition;
create trigger annuler_sur_opposition
  after insert or update of expire_le on ops.opposition
  for each row execute function ops.annuler_sur_opposition();
comment on trigger annuler_sur_opposition on ops.opposition is
  'Une nouvelle opposition, ou une opposition prolongée, annule les envois en attente (026-034).';

-- ── 3. L'état de la garde, pour la station ───────────────────────────────────────────────────
create or replace function public.ops_garde_etat()
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_jour  date := (now() at time zone 'Europe/Paris')::date;
  v_debut timestamptz := v_jour::timestamp at time zone 'Europe/Paris';
  v_fin   timestamptz := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
begin
  -- Les compteurs du jour sont ceux du déclencheur, écrits de la même façon : un seul chiffre.
  return jsonb_build_object(
    'declencheurs', coalesce((
      select jsonb_agg(jsonb_build_object('nom', t.tgname, 'table', 'ops.' || c.relname, 'actif', t.tgenabled in ('O', 'A')) order by t.tgname)
        from pg_catalog.pg_trigger t
        join pg_catalog.pg_class c on c.oid = t.tgrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'ops'
         and not t.tgisinternal
         and (   (c.relname = 'envois' and t.tgname = 'garde_envois')
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
comment on function public.ops_garde_etat() is
  'L''état de la garde des envois (026-034) : les trois déclencheurs (garde_envois, annuler_sur_opposition, garde_accords) et s''ils sont actifs, pause_generale et envoi_froid, les plafonds, et par canal et par envoyeur les compteurs du jour de Paris (envois, nouveaux). Aucune donnée de prospect.';
