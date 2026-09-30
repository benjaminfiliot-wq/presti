-- 0124 · Automatisme sous gardes (décision Benjamin du 30/09/2026).
-- Migration corrective : 0099/0122 appliquées restent intactes.
-- Remplace l'accord INDIVIDUEL par les gardes automatiques, relues avant réservation.
-- Conserve approbation Facteur et j1/j2/j3, pause, opposition, ouverture du froid,
-- preuves, quotas, délais, immutabilité, réservation atomique et traitement incertain.
-- Aucun interrupteur, plafond, compte, budget, jeton, texte d'envoi ni donnée métier n'est modifié.
-- Les accords historiques restent archivés, sans faux accords créés ou consommés.
-- Sans accord individuel ne signifie pas droit de dépenser : 0121 et le contrôle avant coût restent inchangés.
-- Ne programme aucune publication : l'adaptation Crieur et l'arrêt des publications externes sont distincts.
-- Pas de rattrapage automatique du stock : les anciennes attentes sont rejugées par le Facteur.
-- Préalables : 0121, 0122 et 0123 ; revoir les juges R24 avant mise en service.

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
    -- L'envoi est figé dès approbation (ou ancienne attente) : les octets jugés sont ce
    -- qui part, en-têtes et verdicts compris. Pour changer un texte qui
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
    -- Un envoi parti ne revient pas en arrière : il ne doit jamais repartir.
    if old.statut = 'envoye' and new.statut is distinct from old.statut then
      raise exception using message = 'ops:envoi_fige', errcode = 'P0001';
    end if;
    new.approuve_le := old.approuve_le;
    new.envoye_le := old.envoye_le;
    -- 0122 : la RELÂCHE d'une réservation (refus net du transport : rien n'est parti) ne se rejuge pas : l'envoi revient à approuve
    -- avec sa date d'entrée (prepare_le) ; la réservation relit pause, opposition et quotas.
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
    -- Une ancienne attente quitte son statut autrement que vers approuve (prepare, saute, perime,
    -- annule, dont l'annulation sur opposition) : les anciens accords non consommés sont archivés annulés.
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

  -- La consignation ordinaire refuse sous pause active, puis le
  -- signalement de tout autre écart au veilleur.
  if new.statut = 'envoye' then
    -- 0122 : un envoi incertain qui se constate PARTI (acq_envoi_reconcilier) se consigne sans refus : le message est déjà parti,
    -- un changement de pause ne peut plus l'empêcher, seulement empêcher qu'on en fasse état.
    if tg_op = 'UPDATE' and old.statut = 'envoi_incertain' then
      return new;
    end if;
    -- la pause générale active (un interrupteur absent ferme aussi) : rien ne part
    if public.ops_interrupteur('pause_generale') then
      raise exception using message = 'ops:pause_generale', errcode = 'P0001';
    end if;
    -- 0124 : aucun accord individuel ; la consignation reste sous pause et signalement des écarts.
    v_hors := null;
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

  -- 6. Les verdicts : seul le Facteur approuve automatiquement, jamais sans les trois.
  if new.statut in ('attend_accord_benj', 'approuve') then
    if not coalesce(v_verdicts_ok, false) then
      raise exception using message = 'ops:verdicts', errcode = 'P0001';
    end if;
  end if;

  -- 0124 : approbation automatique, uniquement après préparation et les trois verdicts du Facteur.
  -- Le vieux statut attend_accord_benj reste lisible pour les envois historiques, sans accord nouveau.
  -- Aucun stock annulé/périmé/sauté ne redevient approuvé directement, aucune insertion approuvée.
  if new.statut = 'approuve' then
    if tg_op = 'INSERT' or old.statut not in ('prepare', 'attend_accord_benj') then
      raise exception using message = 'ops:transition_approbation', errcode = 'P0001';
    end if;
    new.approuve_le := now();
  end if;

  return new;
end
$$;

revoke all on function ops.garde_envois() from public, anon, authenticated, service_role;
comment on function ops.garde_envois() is '0124 : approbation automatique depuis prepare ou ancienne attente, par Facteur avec trois verdicts ; pause, opposition, froid, preuves, quotas et délais inchangés. Aucun accord individuel.';

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
  v_pj       jsonb;
  v_dest     text;
  v_siren    text;
  v_domaine  text;
  v_page_meta text;
  v_instagram text;
  v_oppose   boolean;
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
  select e.canal, e.envoyeur, e.type, e.statut, e.prospect_id, e.destinataire into v_e
    from ops.envois e
   where e.id = p_envoi
     for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;
  if v_e.statut in ('en_cours_envoi', 'envoi_incertain', 'envoye') then
    return jsonb_build_object('ok', false, 'raison', 'deja_reserve');
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
  -- 0124 : STOP peut être arrivé APRÈS approbation. Relire toutes les clés AVANT de prendre une place.
  -- Une table/lecture indisponible ferme la porte ; ni clé ni statut ni quota ne sont consommés.
  begin
    v_pj := '{}'::jsonb;
    if v_e.prospect_id is not null then
      select to_jsonb(p) into v_pj from ops.prospects p where p.id=v_e.prospect_id;
    end if;
    v_pj := coalesce(v_pj, '{}'::jsonb);
    v_dest := lower(btrim(coalesce(v_e.destinataire, '')));
    v_siren := nullif(lower(btrim(coalesce(v_pj ->> 'siren', ''))), '');
    v_domaine := nullif(lower(btrim(coalesce(v_pj ->> 'domaine', ''))), '');
    v_page_meta := nullif(lower(btrim(coalesce(v_pj ->> 'page_meta', ''))), '');
    v_instagram := nullif(lower(btrim(coalesce(v_pj ->> 'instagram', ''))), '');
    select exists (
      select 1 from ops.opposition o
      where (o.expire_le is null or o.expire_le > now())
      and ((o.cle_type='siren' and o.cle_valeur=v_siren)
        or (o.cle_type='domaine' and o.cle_valeur in (v_domaine,split_part(v_dest,'@',2)))
        or (o.cle_type='page_meta' and o.cle_valeur=v_page_meta)
        or (o.cle_type='instagram' and o.cle_valeur in (v_instagram,v_dest))
        or (o.cle_type in ('email','meta_id','facebook','linkedin','telephone') and o.cle_valeur=v_dest))
    ) into v_oppose;
  exception when others then
    return jsonb_build_object('ok',false,'raison','opposition_indisponible');
  end;
  if coalesce(v_oppose,true) and v_e.type not in ('confirmation_stop','reponse_rgpd') then
    return jsonb_build_object('ok',false,'raison','opposition');
  end if;
  if v_e.statut <> 'approuve' then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;
  -- 0124 : aucun accord humain à relire ; pause, statut, clé unique et quotas restent obligatoires.
  -- le plafond du jour de Paris, avec le filtre de type de 0099 ; il compte ce qui a été RÉSERVÉ aujourd'hui (les envois d'avant
  -- 0122, sans reserve_le, comptent à leur date d'envoi), sans l'envoi lui-même ; la ligne '*' du canal, puis celle de l'envoyeur
  if v_e.canal in ('formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie') or v_e.type in ('premier_contact', 'relance') then
    -- 0124 : une configuration supprimée après approbation ferme aussi le canal.
    if not exists (select 1 from ops.quotas_canaux q where q.canal=v_e.canal and q.envoyeur='*') then
      return jsonb_build_object('ok', false, 'raison', 'quota_absent');
    end if;
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
comment on function public.acq_envoi_reserver(uuid, text) is '0124 : réservation atomique avant transport, sous pause, opposition relue et quota obligatoire, clé unique ; pas de nouvelle exigence d accord individuel. Issue incertaine jamais rejouée sans réconciliation.';
