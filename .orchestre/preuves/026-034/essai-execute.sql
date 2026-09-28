do $essai_026$
declare
  r jsonb := '{}'::jsonb;
begin
  execute $migration_026$---------------------------- _A_COLLER_sql_editor_0099_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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

$migration_026$;
  r := r || jsonb_build_object('diag_controle', (select jsonb_agg(c.resultat) from (
with fonctions(signature, publique) as (
  values ('ops.garde_envois()', false),
         ('ops.annuler_sur_opposition()', false),
         ('ops.garde_accords()', false),
         ('public.ops_garde_etat()', true)
), lues as (
  select f.signature, f.publique, to_regprocedure(f.signature) as fonction from fonctions f
), declencheurs as (
  select t.tgname, c.relname, t.tgenabled, t.tgtype, t.tgfoid,
         (select string_agg(a.attname, ',' order by a.attname)
            from pg_attribute a
           where a.attrelid = c.oid and a.attnum = any (t.tgattr::int2[])) as colonnes
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'ops' and not t.tgisinternal
     and t.tgname in ('garde_envois', 'annuler_sur_opposition', 'garde_accords')
), accords as (
  select to_regclass('ops.accords_benj') as t
)
select 'déclencheur garde_envois : before insert or update (toutes les colonnes) on ops.envois, for each row, actif, ops.garde_envois() (attendu : oui)' as quoi,
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'garde_envois' and d.relname = 'envois'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 23 and d.colonnes is null
                            and d.tgfoid = to_regprocedure('ops.garde_envois()'))
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'déclencheur annuler_sur_opposition : after insert or update of expire_le on ops.opposition, for each row, actif (attendu : oui)',
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'annuler_sur_opposition' and d.relname = 'opposition'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 21 and d.colonnes = 'expire_le'
                            and d.tgfoid = to_regprocedure('ops.annuler_sur_opposition()'))
            then 'oui' else 'NON (anormal)' end
union all
select 'déclencheur garde_accords : before insert or update on ops.accords_benj, for each row, actif, ops.garde_accords() (attendu : oui)',
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'garde_accords' and d.relname = 'accords_benj'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 23 and d.colonnes is null
                            and d.tgfoid = to_regprocedure('ops.garde_accords()'))
            then 'oui' else 'NON (anormal)' end
union all
select 'contrainte envois_statut_check : les sept statuts, dont attend_accord_benj (attendu : oui)',
       case when exists (select 1 from pg_constraint k
                          where k.conrelid = to_regclass('ops.envois') and k.conname = 'envois_statut_check'
                            and pg_get_constraintdef(k.oid) like '%''attend_accord_benj''%'
                            and pg_get_constraintdef(k.oid) like '%''prepare''%'
                            and pg_get_constraintdef(k.oid) like '%''approuve''%'
                            and pg_get_constraintdef(k.oid) like '%''envoye''%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.garde_envois porte la correction du 28/09 : entetes et verdicts figés, toute insertion jugée, chaque entrée datée par la base, envoye refusé sous pause ou accord tombé (attendu : oui)',
       case when exists (select 1 from pg_proc p
                          where p.oid = to_regprocedure('ops.garde_envois()')
                            and p.prosrc like '%new.entetes is distinct from old.entetes%'
                            and p.prosrc like '%new.verdicts is distinct from old.verdicts%'
                            and p.prosrc like '%if tg_op = ''UPDATE'' and new.statut not in%'
                            and p.prosrc like '%then%new.prepare_le := now();%new.prepare_le := old.prepare_le;%then%new.prepare_le := now();%'
                            and p.prosrc like '%''ops:accord_perime''%''ops:accord_perime''%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.accords_benj : existe, RLS active sans politique, aucun droit pour anon, authenticated ni service_role (attendu : oui)',
       case when x.t is not null
             and (select c.relrowsecurity from pg_class c where c.oid = x.t)
             and not exists (select 1 from pg_policy p where p.polrelid = x.t)
             and not has_table_privilege('anon', x.t, 'select, insert, update, delete')
             and not has_table_privilege('authenticated', x.t, 'select, insert, update, delete')
             and not has_table_privilege('service_role', x.t, 'select, insert, update, delete')
            then 'oui' else 'NON (anormal)' end
  from accords x
union all
select '(instagram, *), (facebook, *) et (formulaire_site, *) à 0 tant que 0111 n''a pas appliqué de palier, (email_sollicite, *) à 50 (attendu : oui)',
       case when (select count(*) from ops.quotas_canaux q
                   where q.envoyeur = '*' and q.canal in ('instagram', 'facebook', 'formulaire_site')
                     and q.plafond_jour = 0 and q.plafond_nouveaux_jour = 0) = 3
             and exists (select 1 from ops.quotas_canaux q
                          where q.canal = 'email_sollicite' and q.envoyeur = '*' and q.plafond_jour = 50)
            then 'oui' else 'NON (anormal)' end
union all
select 'envoi_froid fermé (attendu : oui)',
       case when exists (select 1 from ops.interrupteurs i where i.nom = 'envoi_froid' and i.actif = false)
            then 'oui' else 'NON (anormal)' end
union all
select 'ops_garde_etat : existe, security definer, search_path=ops, public, pg_temp, exécutable par service_role seul, comme en 0097 (attendu : oui)',
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end
  from lues l
  left join pg_proc p on p.oid = l.fonction
 where l.signature = 'public.ops_garde_etat()'
union all
select 'anon et authenticated n''exécutent rien de 0099 ; les trois fonctions de déclencheur, service_role non plus (attendu : oui)',
       case when (select count(*) from lues l where l.fonction is not null) = 4
             and not exists (select 1 from lues l
                              where has_function_privilege('anon', l.fonction, 'execute')
                                 or has_function_privilege('authenticated', l.fonction, 'execute')
                                 or (not l.publique and has_function_privilege('service_role', l.fonction, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'une seule version de chaque fonction de 0099 (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where (n.nspname = 'ops' and p.proname in ('garde_envois', 'annuler_sur_opposition', 'garde_accords'))
                                 or (n.nspname = 'public' and p.proname = 'ops_garde_etat')
                              group by n.nspname, p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
) c));
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
update ops.interrupteurs set actif = false where nom = 'envoi_froid';
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300), ('essai_e2e', '*', 300, 300)
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026101', '999026101', 'essai-e2e-026-a1.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('froid_ferme_formulaire_refuse', false, 'diag_froid_ferme_formulaire', 'accepté');
exception when others then
r := r || jsonb_build_object('froid_ferme_formulaire_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:envoi_froid_ferme', 'diag_froid_ferme_formulaire', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('froid_ferme_lien_maquette_email_passe', true);
exception when others then
r := r || jsonb_build_object('froid_ferme_lien_maquette_email_passe', false, 'diag_froid_ferme_lien', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'essai_e2e', 'essai_e2e', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('froid_ferme_essai_e2e_passe', true);
exception when others then
r := r || jsonb_build_object('froid_ferme_essai_e2e_passe', false, 'diag_froid_ferme_essai', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_froid', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
select count(*) into v_base from ops.envois e
where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 5), least(300, v_base + 5))
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
v_n := 0; v_diag := null;
begin
for v_i in 1..5 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902620' || v_i, '99902620' || v_i, 'essai-e2e-026-b' || v_i || '.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('formulaire_cinq_passent', v_n = 5, 'diag_formulaire_cinq', coalesce(v_diag, v_base || ' déjà ce jour, 5 ajoutés'));
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026206', '999026206', 'essai-e2e-026-b6.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_sixieme_refuse', false, 'diag_formulaire_sixieme', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_sixieme_refuse', sqlstate = 'P0001' and sqlerrm in ('ops:quota_nouveaux', 'ops:quota'), 'diag_formulaire_sixieme', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.quotas_canaux set plafond_jour = least(300, v_base + 6) where canal = 'formulaire_site' and envoyeur = '*';
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_nouveaux_sixieme_quota_nouveaux', false, 'diag_formulaire_nouveaux', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_nouveaux_sixieme_quota_nouveaux', sqlstate = 'P0001' and sqlerrm = 'ops:quota_nouveaux', 'diag_formulaire_nouveaux', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.quotas_canaux set plafond_jour = 300, plafond_nouveaux_jour = 300 where canal = 'formulaire_site' and envoyeur = '*';
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('domaine:essai-e2e-026-b7.invalid', '999026201', 'essai-e2e-026-b7.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_deja_meme_siren', false, 'diag_formulaire_siren', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_deja_meme_siren', sqlstate = 'P0001' and sqlerrm = 'ops:formulaire_deja', 'diag_formulaire_siren', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('page_meta:essai-e2e-026-b8', null, 'essai-e2e-026-b2.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_deja_meme_domaine', false, 'diag_formulaire_domaine', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_deja_meme_domaine', sqlstate = 'P0001' and sqlerrm = 'ops:formulaire_deja', 'diag_formulaire_domaine', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026209', '999026209', 'essai-e2e-026-b9.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'relance', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_relance_refusee', false, 'diag_formulaire_relance', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_relance_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_formulaire_relance', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'lien_maquette', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('formulaire_autre_type_refuse', false, 'diag_formulaire_autre_type', 'accepté');
exception when others then
r := r || jsonb_build_object('formulaire_autre_type_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:relance_formulaire', 'diag_formulaire_autre_type', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_formulaire', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'premier_contact', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('email_premier_contact_interdit', false, 'diag_email_premier_contact', 'accepté');
exception when others then
r := r || jsonb_build_object('email_premier_contact_interdit', sqlstate = 'P0001' and sqlerrm = 'ops:froid_email_interdit', 'diag_email_premier_contact', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', null);
r := r || jsonb_build_object('email_sans_preuve_refuse', false, 'diag_email_sans_preuve', 'accepté');
exception when others then
r := r || jsonb_build_object('email_sans_preuve_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_sans_preuve', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026301', '999026301', 'essai-e2e-026-c1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:c1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour')
returning id::text into v_rep2;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep2));
r := r || jsonb_build_object('email_preuve_autre_prospect_refusee', false, 'diag_email_preuve_autre', 'accepté');
exception when others then
r := r || jsonb_build_object('email_preuve_autre_prospect_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_preuve_autre', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', gen_random_uuid()::text));
r := r || jsonb_build_object('email_preuve_inconnue_refusee', false, 'diag_email_preuve_inconnue', 'accepté');
exception when others then
r := r || jsonb_build_object('email_preuve_inconnue_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:preuve_demande_absente', 'diag_email_preuve_inconnue', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('email_avec_preuve_passe', true);
exception when others then
r := r || jsonb_build_object('email_avec_preuve_passe', false, 'diag_email_avec_preuve', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('email_sollicite', '*', 50, 0)
on conflict (canal, envoyeur) do update set plafond_jour = 50, plafond_nouveaux_jour = 0;
select count(*) into v_base from ops.envois e
where e.canal = 'email_sollicite' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
v_n := 0; v_diag := null;
begin
for v_i in 1..(50 - v_base) loop
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('email_cinquante_passent', v_base <= 50 and v_n = 50 - v_base, 'diag_email_cinquante', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutés'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('email_51e_quota', false, 'diag_email_51e', 'accepté');
exception when others then
r := r || jsonb_build_object('email_51e_quota', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_email_51e', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_email', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026401', '999026401', 'essai-e2e-026-d1.invalid', 'essai_e2e', 'oui')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_sans_contact', false, 'diag_relance_sans_contact', 'accepté');
exception when others then
r := r || jsonb_build_object('relance_sans_contact', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sans_contact', 'diag_relance_sans_contact', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026402', '999026402', 'essai-e2e-026-d2.invalid', 'essai_e2e', 'oui')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '74 hours', 'facteur', now() - interval '74 hours', now() - interval '73 hours', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_73h_passe', true);
exception when others then
r := r || jsonb_build_object('relance_73h_passe', false, 'diag_relance_73h', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('seconde_relance_sollicitee', false, 'diag_seconde_relance', 'accepté');
exception when others then
r := r || jsonb_build_object('seconde_relance_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_seconde_relance', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026403', '999026403', 'essai-e2e-026-d3.invalid', 'essai_e2e', 'oui')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '71 hours 30 minutes', 'facteur', now() - interval '71 hours 30 minutes', now() - interval '71 hours', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_71h_refusee', false, 'diag_relance_71h', 'accepté');
exception when others then
r := r || jsonb_build_object('relance_71h_refusee', sqlstate = 'P0001' and sqlerrm in ('ops:72_heures', 'ops:relance_sollicitee'), 'diag_relance_71h', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026404', '999026404', 'essai-e2e-026-d4.invalid', 'essai_e2e', 'lien_envoye')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '5 days') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
alter table ops.envois enable trigger garde_envois;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-d4.invalid', v_h, 'envoye', 'redacteur', now() - interval '71 hours 30 minutes', 'facteur', now() - interval '71 hours 30 minutes', now() - interval '71 hours', v_ok3, jsonb_build_object('type', 'message_recu', 'id', v_rep));
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_moins_72h_dernier_envoi_sollicitee', false, 'diag_relance_dernier_envoi', 'accepté');
exception when others then
r := r || jsonb_build_object('relance_moins_72h_dernier_envoi_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_relance_dernier_envoi', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source, etape) values ('siren:999026405', '999026405', 'essai-e2e-026-d5.invalid', 'essai_e2e', 'maquette_prete')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_avant_oui_sollicitee', false, 'diag_relance_avant_oui', 'accepté');
exception when others then
r := r || jsonb_build_object('relance_avant_oui_sollicitee', sqlstate = 'P0001' and sqlerrm = 'ops:relance_sollicitee', 'diag_relance_avant_oui', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, instagram, source, etape) values ('siren:999026406', '999026406', 'essai-e2e-026-d6.invalid', 'essai_e2e_026_d6', 'essai_e2e', 'oui')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:d6', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '20 days', 'facteur', now() - interval '20 days', now() - interval '20 days', v_ok3),
(v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_d6', v_h, 'envoye', 'redacteur', now() - interval '15 days', 'facteur', now() - interval '15 days', now() - interval '15 days', v_ok3),
(v_p, 'linkedin', 'repondeur', 'premier_contact', 'essai_e2e_026_d6', v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'relance', 'contact@essai-e2e-026-d6.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('relance_trois_envois_3_messages', false, 'diag_relance_3_messages', 'accepté');
exception when others then
r := r || jsonb_build_object('relance_trois_envois_3_messages', sqlstate = 'P0001' and sqlerrm = 'ops:3_messages', 'diag_relance_3_messages', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_relances', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026501', '999026501', 'essai-e2e-026-e1.invalid', 'essai_e2e_026_e1', 'essai_e2e')
returning id into v_p;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('instagram', '*', 0, 0)
on conflict (canal, envoyeur) do update set plafond_jour = 0, plafond_nouveaux_jour = 0;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_e1', v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('instagram_zero_refuse_premier_contact', false, 'diag_instagram_zero', 'accepté');
exception when others then
r := r || jsonb_build_object('instagram_zero_refuse_premier_contact', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_instagram_zero', sqlstate || ' ' || left(sqlerrm, 120));
end;
delete from ops.quotas_canaux where canal = 'linkedin';
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'linkedin', 'repondeur', 'premier_contact', 'essai_e2e_026_e1', v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('quota_absent_refuse', false, 'diag_quota_absent', 'accepté');
exception when others then
r := r || jsonb_build_object('quota_absent_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:quota_absent', 'diag_quota_absent', sqlstate || ' ' || left(sqlerrm, 120));
end;
select count(*) into v_base from ops.envois e
where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base), least(300, v_base))
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('palier_plein_lien_maquette_email_passe', true);
exception when others then
r := r || jsonb_build_object('palier_plein_lien_maquette_email_passe', false, 'diag_palier_lien', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
r := r || jsonb_build_object('palier_plein_reponse_email_passe', true);
exception when others then
r := r || jsonb_build_object('palier_plein_reponse_email_passe', false, 'diag_palier_reponse', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.quotas_canaux set plafond_jour = least(300, v_base + 1), plafond_nouveaux_jour = least(300, v_base + 1) where canal = 'formulaire_site' and envoyeur = '*';
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026502', '999026502', 'essai-e2e-026-e2.invalid', 'essai_e2e')
returning id into v_p2;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p2, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('email_hors_palier', true);
exception when others then
r := r || jsonb_build_object('email_hors_palier', false, 'diag_email_hors_palier', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('messagerie', '*', 100, 0)
on conflict (canal, envoyeur) do update set plafond_jour = 100, plafond_nouveaux_jour = 0;
select count(*) into v_base from ops.envois e
where e.canal = 'messagerie' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
v_n := 0; v_diag := null; v_e := null; v_e2 := null;
begin
for v_i in 1..(100 - v_base) loop
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (null, 'messagerie', 'repondeur', 'reponse', 'essai_e2e_026_meta_' || v_i, v_h, 'prepare', 'redacteur')
returning id into v_e2;
if v_e is null then v_e := v_e2; end if;
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('messagerie_cent_passent', v_base < 100 and v_n = 100 - v_base, 'diag_messagerie_cent', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutés'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (null, 'messagerie', 'repondeur', 'lien_maquette', 'essai_e2e_026_meta_101', v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('messagerie_101e_refuse', false, 'diag_messagerie_101e', 'accepté');
exception when others then
r := r || jsonb_build_object('messagerie_101e_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_messagerie_101e', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.envois set statut = 'saute' where id = v_e;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (null, 'messagerie', 'repondeur', 'lien_maquette', 'essai_e2e_026_meta_102', v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('saute_libere_une_place', v_e is not null);
exception when others then
r := r || jsonb_build_object('saute_libere_une_place', false, 'diag_saute', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.envois set statut = 'perime' where id = v_e2;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (null, 'messagerie', 'repondeur', 'reponse', 'essai_e2e_026_meta_103', v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('perime_libere_une_place', v_e2 is not null and v_e2 <> v_e);
exception when others then
r := r || jsonb_build_object('perime_libere_une_place', false, 'diag_perime', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_plafonds', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026601', '999026601', 'essai-e2e-026-f1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e;
begin
update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = '{"j1": "ok", "j3": "ok"}'::jsonb where id = v_e;
r := r || jsonb_build_object('verdicts_sans_j2_refuse', false, 'diag_verdicts_sans_j2', 'accepté');
exception when others then
r := r || jsonb_build_object('verdicts_sans_j2_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_verdicts_sans_j2', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'approuve', approuve_par_agent = 'redacteur', verdicts = v_ok3 where id = v_e;
r := r || jsonb_build_object('verdicts_redacteur_refuse', false, 'diag_verdicts_redacteur', 'accepté');
exception when others then
r := r || jsonb_build_object('verdicts_redacteur_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_verdicts_redacteur', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_ok3 where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('verdicts_complets_acceptes', true);
exception when others then
r := r || jsonb_build_object('verdicts_complets_acceptes', false, 'diag_verdicts_complets', sqlstate || ' ' || left(sqlerrm, 120));
end;
r := r || jsonb_build_object('approuve_le_pose', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and approuve_le is not null));
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026602', '999026602', 'essai-e2e-026-f2.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur') returning id into v_e;
begin
update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = '{"j1": "sans_objet", "j2": "ok", "j3": "ok"}'::jsonb where id = v_e;
r := r || jsonb_build_object('premier_contact_j1_sans_objet_refuse', false, 'diag_premier_contact_j1', 'accepté');
exception when others then
r := r || jsonb_build_object('premier_contact_j1_sans_objet_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_premier_contact_j1', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e;
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
select e.id, e.canal, e.destinataire, e.empreinte_texte, v_benj from ops.envois e where e.id = v_e;
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('lien_maquette_j1_sans_objet_accepte', exists (select 1 from ops.envois where id = v_e and statut = 'approuve'));
exception when others then
r := r || jsonb_build_object('lien_maquette_j1_sans_objet_accepte', false, 'diag_lien_j1', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_verdicts', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026701', '999026701', 'essai-e2e-026-g1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:g1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e2;
insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-g1.invalid', 'Témoin essai 0099', 'essai_e2e');
select statut into v_statut from ops.envois where id = v_e;
r := r || jsonb_build_object('opposition_annule_prepare', v_statut = 'annule', 'diag_opposition_annule', coalesce(v_statut, '?'));
select statut into v_statut from ops.envois where id = v_e2;
r := r || jsonb_build_object('opposition_epargne_confirmation_stop', v_statut = 'prepare', 'diag_opposition_epargne', coalesce(v_statut, '?'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('opposition_refuse_nouvel_envoi', false, 'diag_opposition_nouvel', 'accepté');
exception when others then
r := r || jsonb_build_object('opposition_refuse_nouvel_envoi', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_nouvel', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('opposition_refuse_lien_maquette', false, 'diag_opposition_lien', 'accepté');
exception when others then
r := r || jsonb_build_object('opposition_refuse_lien_maquette', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_lien', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026703', '999026703', 'essai-e2e-026-g3.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:g3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'stop', now() - interval '10 minutes') returning id::text into v_rep;
insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('siren', '999026703', 'Témoin essai 0099', 'essai_e2e');
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('confirmation_stop_passe_une_fois', true);
exception when others then
r := r || jsonb_build_object('confirmation_stop_passe_une_fois', false, 'diag_confirmation_une', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'confirmation_stop', 'contact@essai-e2e-026-g3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('confirmation_stop_seconde_refusee', false, 'diag_confirmation_seconde', 'accepté');
exception when others then
r := r || jsonb_build_object('confirmation_stop_seconde_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:confirmation_stop', 'diag_confirmation_seconde', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026704', '999026704', 'essai-e2e-026-g4.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:g4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.opposition (cle_type, cle_valeur, motif, source, cree_le, expire_le)
values ('domaine', 'essai-e2e-026-g4.invalid', 'Témoin essai 0099', 'essai_e2e', now() - interval '100 days', now() - interval '10 days');
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('opposition_expiree_ne_refuse_plus', true);
exception when others then
r := r || jsonb_build_object('opposition_expiree_ne_refuse_plus', false, 'diag_opposition_expiree', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026705', '999026705', 'essai-e2e-026-g5.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:g5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le) values ('domaine', 'essai-e2e-026-g5.invalid', 'Témoin essai 0099', 'essai_e2e', now() + interval '30 days');
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('opposition_temporaire_active_refuse', false, 'diag_opposition_temporaire', 'accepté');
exception when others then
r := r || jsonb_build_object('opposition_temporaire_active_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:opposition', 'diag_opposition_temporaire', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_opposition', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', 300, 300)
on conflict (canal, envoyeur) do update set plafond_jour = 300, plafond_nouveaux_jour = 300;
insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026801', '999026801', 'essai-e2e-026-h1.invalid', 'essai_e2e_026_h1', 'essai_e2e')
returning id into v_p;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_h1', v_h, 'envoye', 'redacteur', now() - interval '10 days', 'facteur', now() - interval '10 days', now() - interval '10 days', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('premier_contact_10_jours_refuse', false, 'diag_90_jours_10', 'accepté');
exception when others then
r := r || jsonb_build_object('premier_contact_10_jours_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:90_jours', 'diag_90_jours_10', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, instagram, source) values ('siren:999026802', '999026802', 'essai-e2e-026-h2.invalid', 'essai_e2e_026_h2', 'essai_e2e')
returning id into v_p;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'instagram', 'repondeur', 'premier_contact', 'essai_e2e_026_h2', v_h, 'envoye', 'redacteur', now() - interval '91 days', 'facteur', now() - interval '91 days', now() - interval '91 days', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('premier_contact_91_jours_passe', true);
exception when others then
r := r || jsonb_build_object('premier_contact_91_jours_passe', false, 'diag_90_jours_91', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999026803', '999026803', 'essai-e2e-026-h3.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:h3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
alter table ops.envois disable trigger garde_envois;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'envoye', 'redacteur', now() - interval '1 day', 'facteur', now() - interval '1 day', now() - interval '1 day', v_ok3);
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-h3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('lien_maquette_1_jour_passe', true);
exception when others then
r := r || jsonb_build_object('lien_maquette_1_jour_passe', false, 'diag_lien_1_jour', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_90_jours', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
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
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027001', '999027001', 'essai-e2e-026-j1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:j1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
v_n := 0; v_diag := null;
begin
for v_i in 1..3 loop
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('reponses_trois_passent', v_n = 3, 'diag_reponses_trois', coalesce(v_diag, '3 ajoutées'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('reponse_quatrieme_quota_reponses', false, 'diag_reponse_quatrieme', 'acceptée');
exception when others then
r := r || jsonb_build_object('reponse_quatrieme_quota_reponses', sqlstate = 'P0001' and sqlerrm = 'ops:quota_reponses', 'diag_reponse_quatrieme', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_prospect', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
v_ps := '{}'; v_reps := '{}';
for v_k in 1..8 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902710' || v_k, '99902710' || v_k, 'essai-e2e-026-j2-' || v_k || '.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:j2:' || v_k, v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
v_ps := v_ps || v_p; v_reps := v_reps || v_rep;
end loop;
select count(*) into v_base from ops.envois e
where e.canal = 'email_sollicite' and e.type = 'reponse' and e.envoyeur = 'gmail' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
v_n := 0; v_diag := null;
begin
for v_i in 1..(20 - v_base) loop
v_k := 1 + (v_i - 1) / 3;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_ps[v_k], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j2-' || v_k || '.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[v_k]));
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('reponses_vingt_jour_passent', v_base <= 20 and v_n = 20 - v_base, 'diag_reponses_vingt', coalesce(v_diag, v_base || ' déjà ce jour, ' || v_n || ' ajoutées'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_ps[8], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j2-8.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[8]));
r := r || jsonb_build_object('reponse_21e_quota_reponses', false, 'diag_reponse_21e', 'acceptée');
exception when others then
r := r || jsonb_build_object('reponse_21e_quota_reponses', sqlstate = 'P0001' and sqlerrm = 'ops:quota_reponses', 'diag_reponse_21e', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_jour', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
v_hier := (v_jour::timestamp - interval '1 hour') at time zone 'Europe/Paris';
v_ps := '{}'; v_reps := '{}';
for v_k in 1..8 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902720' || v_k, '99902720' || v_k, 'essai-e2e-026-j3-' || v_k || '.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:j3:' || v_k, v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', v_hier - interval '1 hour') returning id::text into v_rep;
v_ps := v_ps || v_p; v_reps := v_reps || v_rep;
end loop;
alter table ops.envois disable trigger garde_envois;
for v_i in 1..20 loop
v_k := 1 + (v_i - 1) / 3;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le, approuve_par_agent, approuve_le, envoye_le, verdicts, preuve_demande)
values (v_ps[v_k], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j3-' || v_k || '.invalid', v_h, 'envoye', 'redacteur', v_hier, 'facteur', v_hier, v_hier, v_ok3, jsonb_build_object('type', 'message_recu', 'id', v_reps[v_k]));
end loop;
alter table ops.envois enable trigger garde_envois;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_ps[8], 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-j3-8.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_reps[8]));
r := r || jsonb_build_object('reponse_veille_non_comptee', true);
exception when others then
r := r || jsonb_build_object('reponse_veille_non_comptee', false, 'diag_reponse_veille', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_filet_veille', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027301', '999027301', 'essai-e2e-026-k1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:k1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'rgpd', now() - interval '3 days') returning id::text into v_rep;
insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-k1.invalid', 'Témoin essai 0099', 'essai_e2e');
v_n := 0; v_diag := null;
begin
for v_i in 1..3 loop
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
v_n := v_n + 1;
end loop;
exception when others then
v_diag := sqlstate || ' ' || left(sqlerrm, 120);
end;
r := r || jsonb_build_object('reponse_rgpd_trois_passent', v_n = 3, 'diag_rgpd_trois', coalesce(v_diag, '3 ajoutées'));
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('reponse_rgpd_4e_refusee', false, 'diag_rgpd_4e', 'acceptée');
exception when others then
r := r || jsonb_build_object('reponse_rgpd_4e_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:rgpd_hors_demande', 'diag_rgpd_4e', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027302', '999027302', 'essai-e2e-026-k2.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:k2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '3 days') returning id::text into v_rep;
insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-k2.invalid', 'Témoin essai 0099', 'essai_e2e');
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse_rgpd', 'contact@essai-e2e-026-k2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('reponse_rgpd_sans_demande_refusee', false, 'diag_rgpd_sans_demande', 'acceptée');
exception when others then
r := r || jsonb_build_object('reponse_rgpd_sans_demande_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:rgpd_hors_demande', 'diag_rgpd_sans_demande', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_rgpd', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg));
v_etat := public.ops_garde_etat();
v_txt := coalesce(v_etat -> 'declencheurs', 'null'::jsonb)::text;
r := r || jsonb_build_object('garde_etat_declencheurs_actifs', position('garde_envois' in v_txt) > 0 and position('annuler_sur_opposition' in v_txt) > 0
and position('garde_accords' in v_txt) > 0
and position('true' in v_txt) > 0 and position('false' in v_txt) = 0, 'diag_garde_etat_declencheurs', left(v_txt, 200));
v_txt := coalesce(v_etat -> 'interrupteurs', 'null'::jsonb)::text;
r := r || jsonb_build_object('garde_etat_interrupteurs', position('pause_generale' in v_txt) > 0 and position('envoi_froid' in v_txt) > 0);
v_txt := coalesce(v_etat -> 'plafonds', 'null'::jsonb)::text;
r := r || jsonb_build_object('garde_etat_plafonds', position('formulaire_site' in v_txt) > 0 and position('email_sollicite' in v_txt) > 0 and position('instagram' in v_txt) > 0);
v_txt := coalesce(v_etat -> 'du_jour', 'null'::jsonb)::text;
r := r || jsonb_build_object('garde_etat_du_jour', position('"envois"' in v_txt) > 0 and position('"nouveaux"' in v_txt) > 0 and position('email_sollicite' in v_txt) > 0);
r := r || jsonb_build_object('garde_etat_sans_donnee_prospect', v_etat::text !~* '(essai-e2e-026|@|999026)');
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_garde_etat', sqlstate || ' ' || left(sqlerrm, 160)); end if;
end;
begin
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027401', '999027401', 'essai-e2e-026-n1.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n1', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = '{"j1": "sans_objet", "j3": "ok"}'::jsonb where id = v_e;
r := r || jsonb_build_object('attente_sans_verdicts_refusee', false, 'diag_attente_sans_verdicts', 'acceptée');
exception when others then
r := r || jsonb_build_object('attente_sans_verdicts_refusee', sqlstate = 'P0001' and sqlerrm = 'ops:verdicts', 'diag_attente_sans_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'approuve', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
r := r || jsonb_build_object('approuve_sans_attente_refuse', false, 'diag_approuve_sans_attente', 'accepté');
exception when others then
r := r || jsonb_build_object('approuve_sans_attente_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent', 'diag_approuve_sans_attente', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
r := r || jsonb_build_object('accord_hors_attente_refuse', false, 'diag_accord_hors_attente', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_hors_attente_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_hors_attente', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
r := r || jsonb_build_object('attente_verdicts_passe', exists (select 1 from ops.envois where id = v_e and statut = 'attend_accord_benj'));
exception when others then
r := r || jsonb_build_object('attente_verdicts_passe', false, 'diag_attente_verdicts', sqlstate || ' ' || left(sqlerrm, 120));
end;
select count(*) into v_base from ops.envois e
where e.canal = 'email_sollicite' and e.statut in ('prepare', 'approuve', 'envoye') and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
update ops.quotas_canaux set plafond_jour = least(300, v_base + 1) where canal = 'email_sollicite' and envoyeur = '*';
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'reponse', 'contact@essai-e2e-026-n1.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep));
r := r || jsonb_build_object('attente_compte_au_plafond', false, 'diag_attente_plafond', v_base || ' autres ce jour ; accepté');
exception when others then
r := r || jsonb_build_object('attente_compte_au_plafond', sqlstate = 'P0001' and sqlerrm = 'ops:quota', 'diag_attente_plafond', sqlstate || ' ' || left(sqlerrm, 120));
end;
update ops.quotas_canaux set plafond_jour = 50 where canal = 'email_sollicite' and envoyeur = '*';
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_absent_refuse', false, 'diag_accord_absent', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_absent_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent', 'diag_accord_absent', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, gen_random_uuid());
r := r || jsonb_build_object('accord_non_fondateur_refuse', false, 'diag_accord_non_fondateur', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_non_fondateur_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_auteur', 'diag_accord_non_fondateur', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'autre@essai-e2e-026-n1.invalid', v_h, v_benj);
r := r || jsonb_build_object('accord_autre_destinataire_refuse', false, 'diag_accord_autre_destinataire', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_autre_destinataire_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_autre_destinataire', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'messagerie', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
r := r || jsonb_build_object('accord_autre_canal_refuse', false, 'diag_accord_autre_canal', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_autre_canal_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_autre_canal', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h2, v_benj);
r := r || jsonb_build_object('accord_texte_modifie_refuse', false, 'diag_accord_texte_modifie', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_texte_modifie_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_envoi', 'diag_accord_texte_modifie', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj, now() - interval '10 hours', now() + interval '30 hours')
returning id into v_acc;
r := r || jsonb_build_object('accord_emis_le_pose_par_la_base', exists (select 1 from ops.accords_benj a where a.id = v_acc and a.emis_le = now()
and a.expire_le <= now() + interval '24 hours' and a.utilise_le is null and a.annule_le is null));
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n1.invalid', v_h, v_benj);
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_valide_approuve', exists (select 1 from ops.envois where id = v_e and statut = 'approuve' and approuve_le = now()));
exception when others then
r := r || jsonb_build_object('accord_valide_approuve', false, 'diag_accord_valide', sqlstate || ' ' || left(sqlerrm, 120));
end;
r := r || jsonb_build_object('accord_consomme', (select count(*) from ops.accords_benj a where a.envoi_id = v_e and a.utilise_le is not null) = 1);
r := r || jsonb_build_object('accord_unique_par_envoi', (select count(*) from ops.accords_benj a where a.envoi_id = v_e and a.utilise_le is null and a.annule_le is null) = 0);
begin
update ops.accords_benj set utilise_le = null where envoi_id = v_e and utilise_le is not null;
r := r || jsonb_build_object('accord_fige_refuse', false, 'diag_accord_fige', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_fige_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_fige', 'diag_accord_fige', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set statut = 'attend_accord_benj' where id = v_e;
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_rejoue_refuse', false, 'diag_accord_rejoue', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_rejoue_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_rejoue', 'diag_accord_rejoue', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027402', '999027402', 'essai-e2e-026-n2.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n2', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n2.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
alter table ops.accords_benj disable trigger garde_accords;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n2.invalid', v_h, v_benj, now() - interval '3 hours', now() - interval '1 hour');
alter table ops.accords_benj enable trigger garde_accords;
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_perime_refuse', false, 'diag_accord_perime', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_perime_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime', 'diag_accord_perime', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027404', '999027404', 'essai-e2e-026-n4.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n4', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n4.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
alter table ops.accords_benj disable trigger garde_accords;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par, emis_le, expire_le)
values (v_e, 'email_sollicite', 'autre@essai-e2e-026-n4.invalid', v_h, v_benj, now(), now() + interval '1 hour');
alter table ops.accords_benj enable trigger garde_accords;
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_different_refuse', false, 'diag_accord_different', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_different_refuse', sqlstate = 'P0001' and sqlerrm = 'ops:accord_different', 'diag_accord_different', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027405', '999027405', 'essai-e2e-026-n5.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n5', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n5.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n5.invalid', v_h, v_benj) returning id into v_acc;
insert into ops.opposition (cle_type, cle_valeur, motif, source) values ('domaine', 'essai-e2e-026-n5.invalid', 'Témoin essai 0099', 'essai_e2e');
r := r || jsonb_build_object('accord_opposition_annule', exists (select 1 from ops.envois where id = v_e and statut = 'annule')
and exists (select 1 from ops.accords_benj a where a.id = v_acc and a.annule_le is not null and a.utilise_le is null),
'diag_accord_opposition', (select statut from ops.envois where id = v_e));
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027406', '999027406', 'essai-e2e-026-n6.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n6', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n6.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n6.invalid', v_h, v_benj) returning id into v_acc;
update ops.envois set statut = 'prepare' where id = v_e;
update ops.envois set statut = 'attend_accord_benj' where id = v_e;
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_annule_hors_attente', false, 'diag_accord_hors_attente_annule', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_annule_hors_attente', sqlstate = 'P0001' and sqlerrm = 'ops:accord_absent'
and exists (select 1 from ops.accords_benj a where a.id = v_acc and a.annule_le is not null),
'diag_accord_hors_attente_annule', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027403', '999027403', 'essai-e2e-026-n3.invalid', 'essai_e2e')
returning id into v_p;
insert into ops.reponses (id_externe, prospect_id, canal, source, texte, classe, recu_le)
values ('essai_e2e:0099:rep:n3', v_p, 'email_sollicite', 'courriel', 'Témoin essai 0099', 'question', now() - interval '1 hour') returning id::text into v_rep;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_p, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-n3.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_rep))
returning id into v_e;
update ops.envois set statut = 'attend_accord_benj', approuve_par_agent = 'facteur', verdicts = v_okl where id = v_e;
insert into ops.accords_benj (envoi_id, canal, destinataire, empreinte_texte, donne_par)
values (v_e, 'email_sollicite', 'contact@essai-e2e-026-n3.invalid', v_h, v_benj);
update ops.interrupteurs set actif = true, change_le = now() where nom = 'pause_generale';
update ops.interrupteurs set actif = false, change_le = now() where nom = 'pause_generale';
begin
update ops.envois set statut = 'approuve' where id = v_e;
r := r || jsonb_build_object('accord_pause_annule', false, 'diag_accord_pause', 'accepté');
exception when others then
r := r || jsonb_build_object('accord_pause_annule', sqlstate = 'P0001' and sqlerrm = 'ops:accord_perime', 'diag_accord_pause', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_accord', sqlstate || ' ' || left(sqlerrm, 160)); end if;
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
where e.canal = 'formulaire_site' and e.type = 'premier_contact' and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
and (e.prepare_le at time zone 'Europe/Paris')::date = v_jour;
insert into ops.quotas_canaux (canal, envoyeur, plafond_jour, plafond_nouveaux_jour) values ('formulaire_site', '*', least(300, v_base + 1), least(300, v_base + 1))
on conflict (canal, envoyeur) do update set plafond_jour = excluded.plafond_jour, plafond_nouveaux_jour = excluded.plafond_nouveaux_jour;
v_n := 0; v_diag := null; v_e := null;
for v_i in 1..4 loop
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:99902760' || v_i, '99902760' || v_i, 'essai-e2e-026-p' || v_i || '.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, prepare_le)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur', now() - interval '2 days')
returning id into v_e2;
if v_e is null then v_e := v_e2; end if;
v_n := v_n + 1;
exception when others then
if v_diag is null then v_diag := sqlstate || ' ' || left(sqlerrm, 120); end if;
end;
end loop;
r := r || jsonb_build_object('antidate_prepare_le_pose_par_la_base', v_e is not null and exists (select 1 from ops.envois where id = v_e and prepare_le = now()));
r := r || jsonb_build_object('antidate_ne_contourne_pas_plafond', v_n = 1 and v_diag in ('P0001 ops:quota', 'P0001 ops:quota_nouveaux'),
'diag_antidate', v_n || ' passé(s) sur 4, plafond ' || (v_base + 1) || coalesce(' ; ' || v_diag, ''));
insert into ops.prospects (cle_dedup, siren, domaine, source) values ('siren:999027605', '999027605', 'essai-e2e-026-p5.invalid', 'essai_e2e')
returning id into v_p;
begin
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par)
values (v_p, 'formulaire_site', 'facteur_usine', 'premier_contact', null, v_h, 'prepare', 'redacteur');
r := r || jsonb_build_object('antidate_puis_du_jour_refuse', false, 'diag_antidate_du_jour', 'accepté');
exception when others then
r := r || jsonb_build_object('antidate_puis_du_jour_refuse', sqlstate = 'P0001' and sqlerrm in ('ops:quota', 'ops:quota_nouveaux'), 'diag_antidate_du_jour', sqlstate || ' ' || left(sqlerrm, 120));
end;
begin
update ops.envois set prepare_le = now() - interval '2 days' where id = v_e;
r := r || jsonb_build_object('prepare_le_immuable', exists (select 1 from ops.envois where id = v_e and prepare_le = now()));
exception when others then
r := r || jsonb_build_object('prepare_le_immuable', false, 'diag_prepare_le_immuable', sqlstate || ' ' || left(sqlerrm, 120));
end;
insert into ops.envois (prospect_id, canal, envoyeur, type, destinataire, empreinte_texte, statut, prepare_par, preuve_demande)
values (v_pg, 'email_sollicite', 'gmail', 'lien_maquette', 'contact@essai-e2e-026-g.invalid', v_h, 'prepare', 'redacteur', jsonb_build_object('type', 'message_recu', 'id', v_repg))
returning id into v_e3;
begin
update ops.envois set statut = 'envoye', envoye_le = now() - interval '100 days' where id = v_e3;
r := r || jsonb_build_object('envoye_le_pose_par_la_base', exists (select 1 from ops.envois where id = v_e3 and statut = 'envoye' and envoye_le = now()));
exception when others then
r := r || jsonb_build_object('envoye_le_pose_par_la_base', false, 'diag_envoye_le', sqlstate || ' ' || left(sqlerrm, 120));
end;
raise exception using message = v_fin;
exception when others then
if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_dates', sqlstate || ' ' || left(sqlerrm, 160)); end if;
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
v_role := null;
begin
set local role anon;
v_role := current_user;
perform public.ops_garde_etat();
r := r || jsonb_build_object('anon_refuse_garde_etat', false);
exception when others then
r := r || jsonb_build_object('anon_refuse_garde_etat', v_role = 'anon' and sqlstate = '42501', 'diag_anon_garde_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
end;
reset role;
v_role := null;
begin
set local role authenticated;
v_role := current_user;
perform public.ops_garde_etat();
r := r || jsonb_build_object('authenticated_refuse_garde_etat', false);
exception when others then
r := r || jsonb_build_object('authenticated_refuse_garde_etat', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_garde_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
end;
reset role;
end essai_0099;
  r := r || jsonb_build_object('diag_md5', (select jsonb_object_agg(n.nspname || '.' || p.proname, md5(p.prosrc)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname = 'ops' and p.proname in ('garde_envois', 'garde_accords', 'annuler_sur_opposition')) or (n.nspname = 'public' and p.proname = 'ops_garde_etat')), 'diag_md5_bloc', md5(split_part(current_query(), E'\n\n-- source: POST /mcp', 1)));
  r := (select jsonb_object_agg(t.k, t.v) from jsonb_each(r) as t(k, v) where t.k !~ '^diag_' or t.k in ('diag_md5', 'diag_md5_bloc', 'diag_controle'));
  raise exception 'ESSAI_A_SEC % %', '92eacd6e82b884d84bb70b4daff3f78fda156ad76167e4548a1562967dc0a82e', r::text;
end $essai_026$;