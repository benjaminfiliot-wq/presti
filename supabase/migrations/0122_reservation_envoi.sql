-- ============================================================================================
-- 0122 · Réserver AVANT d'envoyer : la base refuse le doublon, pas seulement le code
--        (décision de Benj du 30/09 : l'écosystème agit seul, les garde-fous automatiques sont la protection ;
--         juge : scripts/garde-doublon-qa.mjs ; à appliquer AVANT le code de lib/agents/acquisition/magasinSupabase.ts,
--         qui appelle acq_envoi_reserver et acq_envoi_incertain)
--
-- Le défaut. Le Facteur envoyait AVANT de marquer `envoye` : si l'écriture échouait, ou si acq_envoi_envoye rendait
-- { ok: false } (que le magasin taisait), l'envoi restait `approuve` et repartait au passage suivant ; deux passes
-- concurrentes lisaient la même ligne sans réservation ; en base, `envoye` n'était jamais refusé hors règle (0099 ne
-- fait que signaler envoi_hors_regle).
--
-- La règle. approuve → en_cours_envoi (RÉSERVATION, atomique : une seule tentative gagne, clé d'idempotence unique) →
-- envoye (consignation). Issue inconnue (base tombée après l'envoi, délai dépassé) : envoi_incertain, JAMAIS de renvoi
-- automatique ; un contrôle tranche par acq_envoi_reconcilier (parti → envoye ; pas_parti → annule, jamais approuve).
-- Un refus net (rien n'est parti) relâche la réservation : acq_envoi_echec, en_cours_envoi → approuve.
-- La pause générale, l'accord de Benj et le plafond du jour se lisent AU MOMENT de réserver.
--
-- Ce que ce fichier pose (tout est rejouable : create or replace, if not exists, drop … if exists) :
--   · envois_statut_check admet en_cours_envoi et envoi_incertain ; ops.envois reçoit cle_envoi (empreinte sha256, unique
--     quand elle est posée) et reserve_le ; ops.cle_envoi(destinataire, modèle, fait) calcule la clé (la même formule que
--     le Facteur, TS) ; ops.identite_envoi(envoi) donne l'identité qu'on met dans la clé quand l'envoi n'a pas d'adresse ;
--   · acq_envoi_reserver (NOUVELLE), acq_envoi_incertain (NOUVELLE), acq_envoi_reconcilier (NOUVELLE),
--     acq_envois_orphelins (NOUVELLE : une réservation sans issue depuis trop longtemps devient incertaine) ;
--   · acq_envoi_envoye (REMPLACÉE : n'accepte plus que en_cours_envoi ; tout le reste de 0106 est conservé : preuve du
--     formulaire, en-têtes, avancée de l'étape du prospect) ; acq_envoi_echec et acq_formulaire_echec (REMPLACÉES :
--     relâchent une réservation) ; acq_formulaires_a_porter (REMPLACÉE : réserve dans l'instruction qui sert le porteur,
--     plus de bail qui expire et redonne le même formulaire) ;
--   · ops.garde_envois (REMPLACÉE, 0099 + 0122) et ops_garde_etat (REMPLACÉE) : les listes de statuts qui comptent un envoi
--     (plafond du jour, 90 jours, 3 messages, 72 h, un formulaire par entreprise, filet des réponses) connaissent les deux
--     statuts neufs, sinon un envoi réservé ou incertain ne compterait plus nulle part ;
--   · ops.garde_reservation (NOUVEAU déclencheur) : la base REFUSE `envoye` sans réservation (ops:envoye_sans_reservation)
--     et n'admet que les transitions de la réservation (ops:transition_envoi). Il ne joue que sur les passages de statut
--     à venir : une ligne déjà `envoye` ou `approuve` reste lisible et modifiable comme avant.
-- Aucune donnée n'est supprimée ni réécrite, sauf un rattrapage : les formulaires dont le bail du porteur court encore au
-- moment de l'application passent en_cours_envoi (ils sont en vol ; sans cela leur consignation serait refusée).
--
-- Écarts avec le brouillon d'étude du juge (scripts/fixtures/026-garde/doublon/temoin/, écrit sans voir la base) : le
-- brouillon réécrivait acq_envoi_envoye, acq_formulaires_a_porter et acq_envoi_echec en perdant ce que 0106 fait (preuve
-- du formulaire, étape du prospect, acq_en_pause, opposition, bail, essai_e2e, colonnes rendues, annulation à la 3e
-- erreur) ; il ne voyait pas ops.garde_envois, qui refuse en_cours_envoi → approuve (ops:accord_absent) et ne compte pas
-- les statuts neufs ; il lisait le plafond sans son filtre de type ni la ligne de l'envoyeur ; il ne regardait pas
-- l'accord de Benj à la réservation ; il laissait acq_envoi_reconcilier répondre `found` sans rattraper les refus ops:%.
--
-- Erreurs métier : `raise exception using message = 'ops:<code>', errcode = 'P0001'`. Codes neufs : envoye_sans_reservation,
-- transition_envoi. Refus rendus par acq_envoi_reserver : introuvable, statut, deja_reserve, cle, pause, accord_perime, plafond.
-- ============================================================================================

-- ── 1. Les statuts, la clé, la date de réservation ──────────────────────────────────────────
alter table ops.envois drop constraint if exists envois_statut_check;
alter table ops.envois add constraint envois_statut_check
  check (statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye', 'saute', 'perime', 'annule'));

alter table ops.envois
  add column if not exists cle_envoi  text check (cle_envoi ~ '^[0-9a-f]{64}$'),
  add column if not exists reserve_le timestamptz;

-- Une clé, un envoi : la même (destinataire, modèle, fait) ne part jamais deux fois, par aucun des envoyeurs. Les envois
-- d'avant cette migration n'ont pas de clé (null) : l'index ne les voit pas, rien n'est réécrit.
create unique index if not exists envois_cle_envoi_unique on ops.envois (cle_envoi) where cle_envoi is not null;

comment on column ops.envois.cle_envoi is
  'Clé d''idempotence de l''envoi (0122) : sha256(lower(btrim(destinataire)) | modèle | fait ou sans_fait), posée à la réservation, unique. Jamais l''adresse en clair.';
comment on column ops.envois.reserve_le is
  'Quand l''envoi a été réservé (0122, approuve → en_cours_envoi), à l''horloge de la base ; le plafond du jour compte les réservations du jour de Paris.';

-- La clé : la MÊME formule que le Facteur (TS) : sha256 de « destinataire normalisé | modèle | fait », destinataire en minuscules
-- et rogné, fait absent = « sans_fait ».
create or replace function ops.cle_envoi(p_destinataire text, p_modele text, p_fait text)
returns text
language sql
immutable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select encode(sha256(convert_to(lower(btrim(coalesce(p_destinataire, ''))) || '|' || coalesce(p_modele, '') || '|' || coalesce(p_fait, 'sans_fait'), 'UTF8')), 'hex')
$$;
revoke all on function ops.cle_envoi(text, text, text) from public, anon, authenticated;
grant execute on function ops.cle_envoi(text, text, text) to service_role;
comment on function ops.cle_envoi(text, text, text) is
  'La clé d''idempotence d''un envoi (0122) : sha256(lower(btrim(destinataire)) | modèle | coalesce(fait, sans_fait)) en hexadécimal. Même formule que le Facteur.';

-- L'identité à mettre dans la clé : l'adresse, ou, quand l'envoi n'en a pas (formulaire d'un site), le prospect, sinon la
-- conversation. Sans elle, deux envois sans adresse au même modèle et au même fait porteraient la même clé.
create or replace function ops.identite_envoi(p_envoi uuid)
returns text
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(nullif(lower(btrim(e.destinataire)), ''), 'prospect:' || e.prospect_id::text, 'conversation:' || e.conversation_id::text, 'envoi:' || e.id::text)
    from ops.envois e
   where e.id = p_envoi
$$;
revoke all on function ops.identite_envoi(uuid) from public, anon, authenticated;
grant execute on function ops.identite_envoi(uuid) to service_role;
comment on function ops.identite_envoi(uuid) is
  'Ce que la clé d''idempotence reçoit à la place de l''adresse (0122) : l''adresse normalisée, sinon prospect:<id>, sinon conversation:<id>.';

-- ── 2. La seconde serrure, mise à jour : les statuts neufs comptent, la réservation se relâche ─
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
    -- 0122 : un envoi réservé ou incertain est figé lui aussi (mêmes champs, sauf les en-têtes et l'identifiant externe, que la
    -- consignation écrit dans la même instruction que le passage à envoye).
    if old.statut in ('en_cours_envoi', 'envoi_incertain')
       and (   new.canal is distinct from old.canal
            or new.envoyeur is distinct from old.envoyeur
            or new.type is distinct from old.type
            or new.prospect_id is distinct from old.prospect_id
            or new.destinataire is distinct from old.destinataire
            or new.empreinte_texte is distinct from old.empreinte_texte
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
    -- 0122 : la RELÂCHE d'une réservation (refus net du transport : rien n'est parti) ne se rejuge pas : l'envoi revient à approuve
    -- avec sa date d'entrée (prepare_le) et son accord d'origine, qui se relisent à la prochaine réservation et à la consignation.
    if old.statut = 'en_cours_envoi' and new.statut = 'approuve' then
      return new;
    end if;
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
    -- 0122 : un envoi incertain qui se constate PARTI (acq_envoi_reconcilier) se consigne sans refus : le message est déjà parti,
    -- la pause ou l'accord échu ne peuvent plus l'empêcher, seulement empêcher qu'on en fasse état.
    if tg_op = 'UPDATE' and old.statut = 'envoi_incertain' then
      return new;
    end if;
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
    elsif old.statut not in ('approuve', 'en_cours_envoi') then
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
                and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
         and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
         and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
              or e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain'))
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
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye');
    if coalesce(v_pj ->> 'etape', '') not in ('lien_envoye', 'oui')
       or exists (select 1
                    from ops.envois e
                   where e.prospect_id = new.prospect_id
                     and e.id <> new.id
                     and e.type = 'relance'
                     and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye'))
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
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
       and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
         and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
         and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
           and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
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
  'Déclencheur de ops.envois (0099, amendé par 0122) : comme en 0099, plus trois choses : en_cours_envoi et envoi_incertain comptent partout où compte un envoi préparé ou approuvé (plafond, 90 jours, 3 messages, 72 h, un formulaire par entreprise) ; la relâche en_cours_envoi → approuve ne se rejuge pas (rien n''est reparti, prepare_le et l''accord restent) ; un envoi incertain qui se constate parti (acq_envoi_reconcilier) se consigne sans refus de pause ni d''accord : le message est déjà parti.';

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
                     and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
                     and e.prepare_le >= v_debut and e.prepare_le < v_fin
                     and (l.canal in ('email_sollicite', 'reponse_privee', 'messagerie') or e.type in ('premier_contact', 'relance'))) as envois,
                 (select count(*)
                    from ops.envois e
                   where e.canal = l.canal
                     and (l.envoyeur = '*' or e.envoyeur = l.envoyeur)
                     and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
                     and e.prepare_le >= v_debut and e.prepare_le < v_fin
                     and e.type = 'premier_contact') as nouveaux
            from (select q.canal, q.envoyeur
                    from ops.quotas_canaux q
                  union
                  select e.canal, e.envoyeur
                    from ops.envois e
                   where e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi', 'envoi_incertain', 'envoye')
                     and e.prepare_le >= v_debut and e.prepare_le < v_fin) l
        ) k
    ), '[]'::jsonb)
  );
end
$$;
revoke all on function public.ops_garde_etat() from public, anon, authenticated;
grant execute on function public.ops_garde_etat() to service_role;
comment on function public.ops_garde_etat() is
  'L''état de la garde des envois (0099, amendé par 0122) : les trois déclencheurs, pause_generale et envoi_froid, les plafonds, et par canal et par envoyeur les compteurs du jour, qui comptent aussi les envois réservés et incertains (le même chiffre que le déclencheur).';

-- ── 3. La réservation ────────────────────────────────────────────────────────────────────────
-- Atomique : la ligne est verrouillée (même ordre que ops.garde_envois : la ligne, puis le verrou du canal), puis UN update
-- conditionnel (statut = approuve) ; la perdante d'une course ne trouve plus la ligne approuvée. La pause, l'accord de Benj
-- et le plafond du jour se lisent ici, avant d'écrire.
create or replace function public.acq_envoi_reserver(p_envoi uuid, p_cle text)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_e        record;
  v_q        record;
  v_acc      record;
  v_pause    boolean;
  v_pause_le timestamptz;
  v_jour     date := (now() at time zone 'Europe/Paris')::date;
  v_debut    timestamptz;
  v_fin      timestamptz;
  v_n        integer;
begin
  if p_cle is null or p_cle !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'raison', 'cle');
  end if;
  select e.canal, e.envoyeur, e.type, e.statut into v_e
    from ops.envois e
   where e.id = p_envoi
     for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;
  if v_e.statut in ('en_cours_envoi', 'envoi_incertain', 'envoye') then
    return jsonb_build_object('ok', false, 'raison', 'deja_reserve');
  end if;
  if v_e.statut <> 'approuve' then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;
  -- la pause générale, lue ICI (un interrupteur absent ferme aussi : le refus est net, l'envoi reste approuve)
  begin
    v_pause := public.ops_interrupteur('pause_generale');
  exception when others then
    v_pause := true;
  end;
  if v_pause then
    return jsonb_build_object('ok', false, 'raison', 'pause');
  end if;
  select i.change_le into v_pause_le from ops.interrupteurs i where i.nom = 'pause_generale';
  -- le verrou du canal : le même que ops.garde_envois, pris avant tout comptage
  perform pg_advisory_xact_lock(hashtext('ops:quota:' || v_e.canal));
  -- l'accord de Benj consommé par l'approbation : tombé (échu, ou émis avant le dernier mouvement de la pause), rien ne part
  select a.emis_le, a.expire_le into v_acc
    from ops.accords_benj a
   where a.envoi_id = p_envoi
     and a.utilise_le is not null
   order by a.utilise_le desc
   limit 1;
  if found and (v_acc.expire_le <= now() or v_acc.emis_le <= coalesce(v_pause_le, '-infinity'::timestamptz)) then
    return jsonb_build_object('ok', false, 'raison', 'accord_perime');
  end if;
  -- le plafond du jour de Paris, avec le filtre de type de 0099 ; il compte ce qui a été RÉSERVÉ aujourd'hui (les envois d'avant
  -- 0122, sans reserve_le, comptent à leur date d'envoi), sans l'envoi lui-même ; la ligne '*' du canal, puis celle de l'envoyeur
  if v_e.canal in ('formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie') or v_e.type in ('premier_contact', 'relance') then
    v_debut := v_jour::timestamp at time zone 'Europe/Paris';
    v_fin := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
    for v_q in
      select q.envoyeur, q.plafond_jour, q.plafond_nouveaux_jour
        from ops.quotas_canaux q
       where q.canal = v_e.canal
         and (q.envoyeur = '*' or q.envoyeur = v_e.envoyeur)
    loop
      select count(*) into v_n
        from ops.envois e
       where e.canal = v_e.canal
         and (v_q.envoyeur = '*' or e.envoyeur = v_q.envoyeur)
         and e.id <> p_envoi
         and e.statut in ('en_cours_envoi', 'envoye', 'envoi_incertain')
         and coalesce(e.reserve_le, e.envoye_le) >= v_debut and coalesce(e.reserve_le, e.envoye_le) < v_fin
         and (v_e.canal in ('email_sollicite', 'reponse_privee', 'messagerie') or e.type in ('premier_contact', 'relance'));
      if v_n >= v_q.plafond_jour then
        return jsonb_build_object('ok', false, 'raison', 'plafond');
      end if;
      if v_e.type = 'premier_contact' then
        select count(*) into v_n
          from ops.envois e
         where e.canal = v_e.canal
           and (v_q.envoyeur = '*' or e.envoyeur = v_q.envoyeur)
           and e.id <> p_envoi
           and e.type = 'premier_contact'
           and e.statut in ('en_cours_envoi', 'envoye', 'envoi_incertain')
           and coalesce(e.reserve_le, e.envoye_le) >= v_debut and coalesce(e.reserve_le, e.envoye_le) < v_fin;
        if v_n >= v_q.plafond_nouveaux_jour then
          return jsonb_build_object('ok', false, 'raison', 'plafond');
        end if;
      end if;
    end loop;
  end if;
  -- la réservation : UN update conditionnel ; la clé unique refuse le même (destinataire, modèle, fait) venu d'une autre ligne
  begin
    update ops.envois
       set statut = 'en_cours_envoi', cle_envoi = p_cle, reserve_le = now()
     where id = p_envoi and statut = 'approuve';
    get diagnostics v_n = row_count;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'raison', 'deja_reserve');
  end;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_reserver(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_reserver(uuid, text) to service_role;
comment on function public.acq_envoi_reserver(uuid, text) is
  'Réserve un envoi AVANT qu''il parte (0122) : approuve → en_cours_envoi, cle_envoi et reserve_le posés, une seule tentative gagne. Rend { ok: true } ou { ok: false, raison } : cle (forme), introuvable, deja_reserve (déjà réservé ou envoyé, ou clé prise par une autre ligne), statut, pause (lue ici), accord_perime, plafond (jour de Paris, lu ici sous le verrou du canal). Un refus ne change rien : l''envoi reste approuve.';

-- ── 4. La consignation : seul un envoi réservé devient envoye ──────────────────────────────────
-- Conserve tout ce que faisait 0106 (preuve complète d'un formulaire, en-têtes, avancée de l'étape du prospect) ; la seule
-- différence : l'envoi doit être en_cours_envoi, plus approuve.
create or replace function public.acq_envoi_envoye(p_envoi uuid, p_preuve jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_canal     text;
  v_prospect  uuid;
  v_type      text;
begin
  select canal, prospect_id, type into v_canal, v_prospect, v_type
    from ops.envois where id = p_envoi and statut = 'en_cours_envoi' for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;

  if v_canal in ('formulaire_site', 'essai_e2e') then
    if p_preuve is null
       or coalesce(p_preuve ->> 'code_http', '') = ''
       or coalesce(p_preuve ->> 'empreinte_texte', '') = ''
       or coalesce(p_preuve ->> 'empreinte_avant', '') = ''
       or coalesce(p_preuve ->> 'empreinte_apres', '') = ''
       or coalesce(p_preuve ->> 'chemin_usine', '') = ''
    then
      return jsonb_build_object('ok', false, 'raison', 'preuve');
    end if;
    begin
      update ops.envois set statut = 'envoye', preuve = p_preuve where id = p_envoi;
    exception when others then
      if sqlerrm like 'ops:%' then
        return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
      end if;
      raise;
    end;
  else
    begin
      update ops.envois
         set statut = 'envoye', id_externe = nullif(p_preuve ->> 'id_externe', ''), entetes = coalesce(p_preuve -> 'entetes', '{}'::jsonb)
       where id = p_envoi;
    exception when others then
      if sqlerrm like 'ops:%' then
        return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
      end if;
      raise;
    end;
  end if;

  if v_prospect is not null then
    if v_type = 'premier_contact' then
      update ops.prospects set etape = 'envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'prepare';
    elsif v_type = 'lien_maquette' then
      update ops.prospects set etape = 'lien_envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'lien_prepare';
    else
      update ops.prospects set dernier_contact = now(), maj_le = now() where id = v_prospect;
    end if;
  end if;

  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_envoye(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_envoye(uuid, jsonb) to service_role;
comment on function public.acq_envoi_envoye(uuid, jsonb) is
  'envoye, envoye_le (0122, sur 0106) : N''accepte QUE un envoi en_cours_envoi (réservé par acq_envoi_reserver ou acq_formulaires_a_porter) ; un autre statut rend { ok: false, raison: statut }. Pour formulaire_site/essai_e2e, preuve = p_preuve (PreuveSoumission complète, sinon refus sans écrire) ; sinon id_externe et entetes ; prospect prepare → envoye ou lien_prepare → lien_envoye. Un refus de la base (pause, accord tombé) est rendu, jamais levé : l''appelant doit le lire.';

-- ── 5. L'issue incertaine : jamais de renvoi, un contrôle tranche ────────────────────────────
create or replace function public.acq_envoi_incertain(p_envoi uuid, p_raison text)
returns void
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  update ops.envois
     set statut = 'envoi_incertain', derniere_erreur = left(coalesce(p_raison, ''), 200)
   where id = p_envoi and statut = 'en_cours_envoi'
$$;
revoke all on function public.acq_envoi_incertain(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_incertain(uuid, text) to service_role;
comment on function public.acq_envoi_incertain(uuid, text) is
  'L''issue de l''envoi est inconnue (0122) : en_cours_envoi → envoi_incertain, la raison (200 signes) dans derniere_erreur. Sans effet sur un envoi qui n''est pas en_cours_envoi (une consignation déjà faite n''est jamais défaite). Il ne repart plus : acq_envoi_reconcilier le tranche.';

create or replace function public.acq_envoi_reconcilier(p_envoi uuid, p_resultat text, p_preuve jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_canal     text;
  v_prospect  uuid;
  v_type      text;
begin
  if p_resultat is null or p_resultat not in ('parti', 'pas_parti') then
    return jsonb_build_object('ok', false, 'raison', 'resultat');
  end if;
  select canal, prospect_id, type into v_canal, v_prospect, v_type
    from ops.envois where id = p_envoi and statut = 'envoi_incertain' for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;
  begin
    if p_resultat = 'parti' then
      -- le message est parti : on le constate (le déclencheur ne refuse plus ni pause ni accord pour un envoi incertain)
      update ops.envois
         set statut = 'envoye',
             id_externe = coalesce(nullif(p_preuve ->> 'id_externe', ''), id_externe),
             entetes = coalesce(p_preuve -> 'entetes', entetes),
             preuve = case when v_canal in ('formulaire_site', 'essai_e2e') and p_preuve is not null and p_preuve <> '{}'::jsonb then p_preuve else preuve end
       where id = p_envoi;
    else
      -- rien n'est parti : annule (jamais approuve : un renvoi se prépare et s'approuve à neuf) ; la clé se libère
      update ops.envois
         set statut = 'annule', cle_envoi = null, derniere_erreur = 'reconcilie_pas_parti'
       where id = p_envoi;
    end if;
  exception when others then
    if sqlerrm like 'ops:%' then
      return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
    end if;
    raise;
  end;
  if v_prospect is not null then
    if p_resultat = 'parti' then
      if v_type = 'premier_contact' then
        update ops.prospects set etape = 'envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'prepare';
      elsif v_type = 'lien_maquette' then
        update ops.prospects set etape = 'lien_envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'lien_prepare';
      else
        update ops.prospects set dernier_contact = now(), maj_le = now() where id = v_prospect;
      end if;
    elsif v_type = 'premier_contact' then
      update ops.prospects set etape = 'verifie', maj_le = now() where id = v_prospect and etape = 'prepare';
    elsif v_type = 'lien_maquette' then
      update ops.prospects set etape = 'oui', maj_le = now() where id = v_prospect and etape = 'lien_prepare';
    end if;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_reconcilier(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_reconcilier(uuid, text, jsonb) to service_role;
comment on function public.acq_envoi_reconcilier(uuid, text, jsonb) is
  'Le contrôle (jamais l''envoyeur) tranche un envoi incertain (0122) : parti → envoye (id_externe et en-têtes de la preuve, étape du prospect avancée) ; pas_parti → annule, la clé d''idempotence libérée, l''étape du prospect rendue ; JAMAIS approuve. Résultat inconnu → { ok: false, raison: resultat } ; envoi qui n''est pas incertain → raison statut.';

-- Une réservation sans issue depuis trop longtemps (le processus est mort entre la réservation et l'envoi, ou entre l'envoi et
-- la consignation) : elle devient incertaine et lève une carte « à réconcilier » sans donnée personnelle. Jamais de renvoi.
create or replace function public.acq_envois_orphelins(p_minutes int default 30)
returns int
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
  v_n  int := 0;
begin
  for v_id in
    select e.id
      from ops.envois e
     where e.statut = 'en_cours_envoi'
       and e.reserve_le < now() - make_interval(mins => greatest(coalesce(p_minutes, 30), 5))
     order by e.reserve_le
       for update skip locked
  loop
    update ops.envois set statut = 'envoi_incertain', derniere_erreur = 'reservation_orpheline' where id = v_id;
    begin
      perform public.ops_evenement_ajouter('facteur', 'envoi_a_reconcilier', 'envoi:' || v_id::text, 'Envoi réservé sans issue connue : à réconcilier', null);
    exception when others then
      raise warning 'acq_envois_orphelins : événement envoi_a_reconcilier non écrit (%)', sqlstate;
    end;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;
revoke all on function public.acq_envois_orphelins(integer) from public, anon, authenticated;
grant execute on function public.acq_envois_orphelins(integer) to service_role;
comment on function public.acq_envois_orphelins(integer) is
  'Les réservations (en_cours_envoi) vieilles de plus de p_minutes (5 au moins, 30 par défaut) passent envoi_incertain et lèvent un événement envoi_a_reconcilier sans donnée personnelle ; rend leur nombre (0122). Aucun renvoi.';

-- ── 6. Les échecs relâchent la réservation ─────────────────────────────────────────────────
-- acq_envoi_echec : un refus net (rien n'est parti) relâche en_cours_envoi → approuve et compte l'essai ; à la 3e, annule.
create or replace function public.acq_envoi_echec(p_envoi uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_statut     text;
  v_tentatives int;
begin
  select e.statut, least(e.tentatives_envoi + 1, 3) into v_statut, v_tentatives
    from ops.envois e
   where e.id = p_envoi
     for update;
  if not found then
    return;
  end if;
  if v_tentatives >= 3 and v_statut in ('prepare', 'attend_accord_benj', 'approuve', 'en_cours_envoi') then
    update ops.envois
       set tentatives_envoi = v_tentatives, derniere_erreur = left(coalesce(p_raison, ''), 200), statut = 'annule',
           cle_envoi = case when v_statut = 'en_cours_envoi' then null else cle_envoi end,
           reserve_le = case when v_statut = 'en_cours_envoi' then null else reserve_le end
     where id = p_envoi;
    perform public.ops_evenement_ajouter('systeme', 'envoi_echec_definitif', 'envoi:' || p_envoi::text, 'envoi annulé après 3 échecs', null);
  elsif v_statut = 'en_cours_envoi' then
    begin
      update ops.envois
         set tentatives_envoi = v_tentatives, derniere_erreur = left(coalesce(p_raison, ''), 200), statut = 'approuve', cle_envoi = null, reserve_le = null
       where id = p_envoi;
    exception when others then
      -- la relâche est refusée (fenêtre Meta fermée, modèle suspendu…) : rien n'est parti et rien ne peut plus partir : annule
      if sqlerrm like 'ops:%' then
        update ops.envois
           set tentatives_envoi = v_tentatives, derniere_erreur = left('relache_refusee:' || substring(sqlerrm from 5), 200), statut = 'annule', cle_envoi = null, reserve_le = null
         where id = p_envoi;
      else
        raise;
      end if;
    end;
  else
    update ops.envois
       set tentatives_envoi = v_tentatives, derniere_erreur = left(coalesce(p_raison, ''), 200)
     where id = p_envoi;
  end if;
end
$$;
revoke all on function public.acq_envoi_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_echec(uuid, text) to service_role;
comment on function public.acq_envoi_echec(uuid, text) is
  'tentatives_envoi + 1 (3 au plus), derniere_erreur ; un envoi en_cours_envoi est RELÂCHÉ (approuve, clé et reserve_le effacés : rien n''est parti) ; à la 3e, annule et un événement (0122, sur 0106). Ne s''appelle que pour un refus net : une issue inconnue passe par acq_envoi_incertain.';

-- acq_formulaire_echec : le porteur rend un échec de soumission ; non définitif, le formulaire est relâché pour un autre essai.
create or replace function public.acq_formulaire_echec(p_envoi uuid, p_raison text, p_definitif boolean)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_prospect     uuid;
  v_technologie  text;
  v_statut       text;
begin
  select e.statut into v_statut from ops.envois e where e.id = p_envoi for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;

  begin
    update ops.envois
       set tentatives_envoi = case when tentatives_envoi < 3 then tentatives_envoi + 1 else 3 end,
           derniere_erreur = left(coalesce(p_raison, ''), 200),
           bail_porteur_jusqua = null,
           statut = case when p_definitif then 'annule' when v_statut = 'en_cours_envoi' then 'approuve' else statut end,
           cle_envoi = case when p_definitif or v_statut = 'en_cours_envoi' then null else cle_envoi end,
           reserve_le = case when p_definitif or v_statut = 'en_cours_envoi' then null else reserve_le end
     where id = p_envoi
    returning prospect_id, technologie into v_prospect, v_technologie;
  exception when others then
    -- la relâche est refusée (modèle suspendu…) : rien n'est parti et rien ne peut plus partir : annule
    if sqlerrm like 'ops:%' then
      update ops.envois
         set tentatives_envoi = case when tentatives_envoi < 3 then tentatives_envoi + 1 else 3 end,
             derniere_erreur = left('relache_refusee:' || substring(sqlerrm from 5), 200),
             bail_porteur_jusqua = null, statut = 'annule', cle_envoi = null, reserve_le = null
       where id = p_envoi
      returning prospect_id, technologie into v_prospect, v_technologie;
      p_definitif := true;
    else
      raise;
    end if;
  end;

  begin
    perform public.acq_signal('echec_soumission', v_technologie);
  exception when undefined_function then
    null;
  end;

  if p_definitif and v_prospect is not null then
    update ops.prospects
       set etape = case when etape = 'prepare' then 'verifie' else etape end,
           formulaire = coalesce(formulaire, '{}'::jsonb) || jsonb_build_object('eligible', false, 'raison', coalesce(p_raison, '')),
           maj_le = now()
     where id = v_prospect;
  end if;

  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_formulaire_echec(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.acq_formulaire_echec(uuid, text, boolean) to service_role;
comment on function public.acq_formulaire_echec(uuid, text, boolean) is
  'tentatives_envoi + 1 (3 au plus), derniere_erreur, bail libéré (0122, sur 0106) ; un formulaire en_cours_envoi est relâché (approuve, clé effacée) pour un nouvel essai. Si p_definitif : annule, le prospect revient à son étape d''avant et son formulaire est marqué eligible=false.';

-- ── 7. Le porteur du formulaire réserve dans l'instruction qui le sert ────────────────────────
-- Le bail (bail_porteur_jusqua) reste posé pour la lecture du porteur, mais ce n'est plus lui qui retient le formulaire :
-- en_cours_envoi le retient, et ne redonne le même formulaire à personne. Le reste du plafond du jour se calcule sur ce qui
-- a été RÉSERVÉ aujourd'hui (sous le verrou du canal), plus sur ce qui a été préparé : un envoi approuvé compte déjà à
-- l'entrée, il ne doit pas compter deux fois contre celui qu'on va porter.
create or replace function public.acq_formulaires_a_porter(p_limite int, p_bail_s int)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_bail      int := greatest(coalesce(p_bail_s, 300), 30);
  v_jour      date := (now() at time zone 'Europe/Paris')::date;
  v_debut     timestamptz;
  v_fin       timestamptz;
  v_reste_f   int;
  v_reste_e   int;
  v_plafond   int;
  v_n         int;
  v_c         record;
  v_ids       uuid[] := '{}'::uuid[];
begin
  if public.acq_en_pause('facteur_usine') then
    return '[]'::jsonb;
  end if;

  v_debut := v_jour::timestamp at time zone 'Europe/Paris';
  v_fin := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
  -- les verrous des deux canaux, dans l'ordre alphabétique, puis le reste de chacun
  perform pg_advisory_xact_lock(hashtext('ops:quota:essai_e2e'));
  perform pg_advisory_xact_lock(hashtext('ops:quota:formulaire_site'));
  select q.plafond_jour into v_plafond from ops.quotas_canaux q where q.canal = 'formulaire_site' and q.envoyeur = '*';
  select count(*) into v_n from ops.envois e
   where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('en_cours_envoi', 'envoye', 'envoi_incertain')
     and coalesce(e.reserve_le, e.envoye_le) >= v_debut and coalesce(e.reserve_le, e.envoye_le) < v_fin;
  v_reste_f := v_plafond - v_n;
  select q.plafond_jour into v_plafond from ops.quotas_canaux q where q.canal = 'essai_e2e' and q.envoyeur = '*';
  select count(*) into v_n from ops.envois e
   where e.canal = 'essai_e2e' and e.type in ('premier_contact', 'relance') and e.statut in ('en_cours_envoi', 'envoye', 'envoi_incertain')
     and coalesce(e.reserve_le, e.envoye_le) >= v_debut and coalesce(e.reserve_le, e.envoye_le) < v_fin;
  v_reste_e := v_plafond - v_n;

  for v_c in
    select e.id, e.canal, e.modele_id, e.fait_id
      from ops.envois e
      left join ops.prospects p on p.id = e.prospect_id
     where e.statut = 'approuve'
       and (e.bail_porteur_jusqua is null or e.bail_porteur_jusqua < now())
       and (
             (e.canal = 'formulaire_site'
              and not exists (
                    select 1 from ops.opposition o
                     where (o.expire_le is null or o.expire_le > now())
                       and ((p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                         or (p.domaine is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p.domaine), '^www\.', ''))))
                  ))
          or (e.canal = 'essai_e2e'
              and coalesce(p.formulaire ->> 'url_action', '') = 'https://prestiapp.fr/essai-formulaire/envoi')
           )
     order by e.prepare_le, e.id
     limit 200
       for update of e skip locked
  loop
    exit when coalesce(array_length(v_ids, 1), 0) >= greatest(coalesce(p_limite, 1), 0);
    if v_c.canal = 'formulaire_site' then
      continue when coalesce(v_reste_f, 0) <= 0;
    else
      continue when coalesce(v_reste_e, 0) <= 0;
    end if;
    begin
      update ops.envois e
         set statut = 'en_cours_envoi', reserve_le = now(), bail_porteur_jusqua = now() + make_interval(secs => v_bail),
             cle_envoi = ops.cle_envoi(ops.identite_envoi(e.id), e.modele_id, e.fait_id)
       where e.id = v_c.id and e.statut = 'approuve';
      get diagnostics v_n = row_count;
    exception when unique_violation then
      -- le même (destinataire, modèle, fait) est déjà réservé ou parti par une autre ligne : celle-ci est un doublon, elle ne part pas
      update ops.envois set statut = 'annule', derniere_erreur = 'doublon_cle_envoi' where id = v_c.id and statut = 'approuve';
      v_n := 0;
    end;
    if v_n > 0 then
      v_ids := v_ids || v_c.id;
      if v_c.canal = 'formulaire_site' then
        v_reste_f := v_reste_f - 1;
      else
        v_reste_e := v_reste_e - 1;
      end if;
    end if;
  end loop;

  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'texte', e.texte, 'objet', e.objet, 'reference', e.reference, 'formulaire', p.formulaire) order by e.prepare_le)
      from ops.envois e
      left join ops.prospects p on p.id = e.prospect_id
     where e.id = any(v_ids)
  ), '[]'::jsonb);
end
$$;
revoke all on function public.acq_formulaires_a_porter(integer, integer) from public, anon, authenticated;
grant execute on function public.acq_formulaires_a_porter(integer, integer) to service_role;
comment on function public.acq_formulaires_a_porter(integer, integer) is
  'Pour le porteur du formulaire, sur l''usine (0122, sur 0106) : formulaire_site approuvé, sans opposition, hors pause, dans le reste du plafond du jour ; et, pour les essais, essai_e2e vers https://prestiapp.fr/essai-formulaire/envoi seulement. RÉSERVE ce qu''elle sert dans son update (en_cours_envoi, cle_envoi, reserve_le, bail) : plus de bail qui expire et redonne le même formulaire. Un doublon de clé est annulé. Ne rend que id, texte, objet, reference, formulaire.';

-- ── 8. La base refuse `envoye` sans réservation ───────────────────────────────────────────
-- Il ne joue que sur un passage à envoye (insertion, ou changement de statut) et sur les transitions de la réservation : une
-- ligne déjà envoye ou approuve reste lisible et modifiable. Seule exemption : le canal d'essai, vers un destinataire .invalid.
create or replace function ops.garde_reservation()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if new.statut = 'envoye' and (tg_op = 'INSERT' or old.statut is distinct from 'envoye') then
    if tg_op = 'INSERT' or old.statut not in ('en_cours_envoi', 'envoi_incertain') or new.cle_envoi is null then
      if not (new.canal = 'essai_e2e' and lower(btrim(coalesce(new.destinataire, ''))) like '%.invalid') then
        raise exception using message = 'ops:envoye_sans_reservation', errcode = 'P0001';
      end if;
    end if;
  end if;
  -- les seules transitions de la réservation : approuve → en_cours_envoi (avec une clé) → (envoye | envoi_incertain | approuve relâché
  -- | annule) ; envoi_incertain → (envoye | annule), jamais approuve
  if new.statut in ('en_cours_envoi', 'envoi_incertain') and tg_op = 'INSERT' then
    raise exception using message = 'ops:transition_envoi', errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and old.statut is distinct from new.statut then
    -- une réservation porte toujours sa date : celle de la base, jamais celle de l'écrivain
    if new.statut = 'en_cours_envoi' then
      new.reserve_le := now();
    end if;
    if (new.statut = 'en_cours_envoi' and (old.statut <> 'approuve' or new.cle_envoi is null))
       or (new.statut = 'envoi_incertain' and old.statut <> 'en_cours_envoi')
       or (old.statut = 'en_cours_envoi' and new.statut not in ('approuve', 'envoi_incertain', 'envoye', 'annule'))
       or (old.statut = 'envoi_incertain' and new.statut not in ('envoye', 'annule')) then
      raise exception using message = 'ops:transition_envoi', errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
revoke all on function ops.garde_reservation() from public, anon, authenticated, service_role;
comment on function ops.garde_reservation() is
  'Déclencheur de ops.envois (0122) : refuse envoye sans réservation (ops:envoye_sans_reservation : il faut venir de en_cours_envoi ou envoi_incertain avec une cle_envoi ; exemption bornée au canal essai_e2e vers un destinataire .invalid) et toute transition hors de la réservation (ops:transition_envoi, dont envoi_incertain → approuve). Ne joue que sur les passages de statut à venir.';

drop trigger if exists garde_reservation on ops.envois;
create trigger garde_reservation
  before insert or update of statut on ops.envois
  for each row execute function ops.garde_reservation();
comment on trigger garde_reservation on ops.envois is
  'La base refuse le doublon et l''envoi sans réservation (0122), même si le code se trompe.';

-- ── 9. Le rattrapage des formulaires en vol ───────────────────────────────────────────────
-- Un formulaire que le porteur tient encore (bail en cours) au moment de l'application est peut-être en train d'être soumis :
-- il passe en_cours_envoi avec sa clé, sinon sa consignation serait refusée (l'envoi est approuve, plus réservé) et le
-- porteur suivant le reprendrait. Une clé déjà prise laisse la ligne telle quelle. Rien d'autre n'est touché.
do $$
declare
  v_id uuid;
begin
  for v_id in
    select e.id
      from ops.envois e
     where e.statut = 'approuve'
       and e.canal in ('formulaire_site', 'essai_e2e')
       and e.bail_porteur_jusqua is not null
       and e.bail_porteur_jusqua > now()
     order by e.prepare_le
  loop
    begin
      update ops.envois e
         set statut = 'en_cours_envoi', reserve_le = now(),
             cle_envoi = ops.cle_envoi(ops.identite_envoi(e.id), e.modele_id, e.fait_id)
       where e.id = v_id and e.statut = 'approuve';
    exception when unique_violation then
      null;
    end;
  end loop;
end
$$;
