---------------------------- _A_COLLER_sql_editor_0123.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
-- ============================================================================================
-- 0123 · Un STOP reçu hors de tout fil n'est plus classé `hors_fil` par la base : le Standard le lit
--        (décision de Benj du 30/09 : l'écosystème agit seul, les garde-fous automatiques sont la protection ;
--         juge : scripts/garde-stop-qa.mjs ; le Standard corrigé est lib/agents/acquisition/standardiste.ts)
--
-- Le défaut. acq_reponse_recue (0106) posait classe = 'hors_fil' à l'insertion d'une réponse sans envoi, sans conversation ni
-- prospect connus. Or acq_reponses_a_traiter ne rend que les classes NULLES : le Standard ne voyait jamais ces réponses, donc
-- jamais un STOP ni une demande sur les données arrivés en nouvel e-mail. Et l'expéditeur n'était pas gardé : même lu, le STOP
-- n'aurait eu aucune adresse à mettre en opposition.
--
-- Ce que ce fichier change (rejouable : add column if not exists, drop function if exists, create or replace) :
--   · ops.reponses.expediteur (NOUVELLE colonne, 320 signes au plus) : l'en-tête From de la réponse ;
--   · acq_reponse_recue (REMPLACÉE) : reçoit l'expéditeur (argument p_expediteur, valeur par défaut null, ou la clé `expediteur`
--     du JSON comme avant : aucun appelant n'est cassé), le garde, et NE CLASSE PLUS hors_fil à l'insertion : la classe reste
--     nulle, le Standard la pose (STOP, RGPD, puis hors_fil pour un message ordinaire, sans aucun appel au modèle). Le
--     rattachement (référence, domaine, en_reponse_a) est inchangé, il lit seulement l'expéditeur par la variable ;
--   · acq_reponses_a_repondre (REMPLACÉE) : un STOP ou une demande RGPD hors de tout fil n'est PAS rendu au Répondeur (il n'écrira
--     à aucune adresse non vérifiée) ; seule une décision de Benj (classe_par = benj) la rend lisible ;
--   · un rattrapage : les réponses classées hors_fil PAR LA BASE à l'insertion (classe_par et traitee_le nuls) repassent à la
--     classe nulle, pour que le Standard les relise : un STOP perdu par le défaut ci-dessus se retrouve (sans adresse gardée, le
--     Standard ouvre alors une carte verifier_demande pour Benj, il n'invente aucune clé). Les lignes classées par le Standard
--     (classe_par regle) ou par Benj ne sont pas touchées.
-- Aucune donnée n'est supprimée.
--
-- Attention à la signature : acq_reponse_recue gagne un argument (avec valeur par défaut). L'ancienne forme (jsonb) est donc
-- supprimée avant la création de la neuve, sinon les deux coexisteraient et PostgREST refuserait l'appel par ambiguïté (les
-- appelants, eux, ne changent pas : { p: … } continue de marcher). Le déploiement en une seule transaction (appliquer-migration)
-- évite tout instant sans fonction ; collée à la main, la coupure dure le temps de l'instruction.
--
-- Pourquoi la base ne devine pas « ça ressemble à un STOP » : décider si un texte est un STOP ou une demande RGPD est le travail du
-- Standard (estStop, estDemandeRgpd, en code, éprouvé par garde-stop-qa) ; une seconde règle écrite en SQL pourrait diverger et
-- perdre un STOP de plus. La base ne classe donc plus rien à l'insertion ; un message ordinaire hors fil est classé hors_fil par le
-- Standard au passage suivant, sans aucun appel au modèle.
-- ============================================================================================

alter table ops.reponses
  add column if not exists expediteur text check (char_length(expediteur) <= 320);
comment on column ops.reponses.expediteur is
  'L''en-tête From de la réponse reçue (0123), tel que reçu (adresse, avec ou sans nom affiché), 320 signes au plus : le Standard y lit l''adresse à mettre en opposition pour un STOP reçu hors de tout fil. Nul pour une réponse d''avant 0123 ou sans en-tête.';

drop function if exists public.acq_reponse_recue(jsonb);

create or replace function public.acq_reponse_recue(p jsonb, p_expediteur text default null)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id_externe    text := p ->> 'id_externe';
  v_texte         text := coalesce(p ->> 'texte', '');
  v_source        text := p ->> 'source';
  v_conversation  uuid := nullif(p ->> 'conversation_id', '')::uuid;
  v_prospect_id   uuid;
  v_envoi_id      uuid;
  v_ref           text;
  v_dom           text;
  v_expediteur    text := left(nullif(btrim(coalesce(nullif(btrim(p_expediteur), ''), p ->> 'expediteur', '')), ''), 320);
  v_accuse        boolean := coalesce((p ->> 'accuse_site')::boolean, false);
  v_id            uuid;
  v_deja          uuid;
begin
  select id into v_deja from ops.reponses where id_externe = v_id_externe;
  if found then
    return jsonb_build_object('id', v_deja, 'nouvelle', false, 'prospect', null);
  end if;

  -- (a) la référence citée dans le texte (« Réf. XXXXXX »)
  v_ref := upper((regexp_match(v_texte, 'R[ée]f\.?\s*:?\s*([A-Z0-9]{6})'))[1]);
  if v_ref is not null then
    select e.id, e.prospect_id into v_envoi_id, v_prospect_id from ops.envois e where e.reference = v_ref;
  end if;

  -- (b) le domaine de l'expéditeur, hors messageries gratuites
  if v_prospect_id is null and coalesce(v_expediteur, '') like '%@%' then
    v_dom := lower(split_part(v_expediteur, '@', 2));
    if v_dom <> all (array[
      'gmail.com', 'googlemail.com', 'outlook.fr', 'hotmail.fr', 'live.fr', 'orange.fr', 'wanadoo.fr', 'free.fr',
      'sfr.fr', 'laposte.net', 'yahoo.fr', 'icloud.com'
    ]) then
      select pr.id into v_prospect_id
        from ops.prospects pr
       where pr.domaine = v_dom or lower(btrim(pr.domaine)) = v_dom
       limit 1;
    end if;
  end if;

  -- (c) l'en-tête In-Reply-To (en_reponse_a), égal à l'id_externe d'un de nos envois
  if v_prospect_id is null and v_envoi_id is null and coalesce(p ->> 'en_reponse_a', '') <> '' then
    select e.id, e.prospect_id into v_envoi_id, v_prospect_id from ops.envois e where e.id_externe = p ->> 'en_reponse_a';
  end if;

  if v_prospect_id is null and v_envoi_id is null and v_conversation is not null then
    select c.prospect_id into v_prospect_id from ops.conversations c where c.id = v_conversation;
  end if;

  -- 0123 : la base NE classe PLUS `hors_fil` à l'insertion. Une réponse hors de tout fil peut être un STOP ou une demande sur les
  -- données : classée ici, elle n'arrivait jamais au Standard (acq_reponses_a_traiter ne rend que les classes nulles) et restait
  -- sans suite. La classe reste nulle ; le Standard la lit en code (STOP, RGPD, puis hors_fil pour un message ordinaire).

  insert into ops.reponses (
    id_externe, envoi_id, conversation_id, prospect_id, canal, source, texte, auto, accuse_site,
    en_reponse_a, imap_uid, expediteur
  ) values (
    v_id_externe, v_envoi_id, v_conversation, v_prospect_id, p ->> 'canal', v_source, left(v_texte, 4000),
    coalesce((p ->> 'auto')::boolean, false), v_accuse,
    nullif(p ->> 'en_reponse_a', ''), nullif(p ->> 'imap_uid', '')::bigint, v_expediteur
  )
  on conflict (id_externe) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from ops.reponses where id_externe = v_id_externe;
    return jsonb_build_object('id', v_id, 'nouvelle', false, 'prospect', null);
  end if;

  if v_prospect_id is not null and not v_accuse then
    update ops.prospects set dernier_contact_recu = now() where id = v_prospect_id;
  end if;

  return jsonb_build_object(
    'id', v_id, 'nouvelle', true,
    'prospect', (select jsonb_build_object('id', pr.id, 'siren', pr.siren, 'domaine', pr.domaine) from ops.prospects pr where pr.id = v_prospect_id)
  );
end
$$;
revoke all on function public.acq_reponse_recue(jsonb, text) from public, anon, authenticated;
grant execute on function public.acq_reponse_recue(jsonb, text) to service_role;
comment on function public.acq_reponse_recue(jsonb, text) is
  'Idempotente par id_externe (0123, sur 0106). Rattache dans l''ordre : (a) la référence citée, (b) le domaine de l''expéditeur (hors messageries gratuites), (c) en_reponse_a. Garde l''expéditeur (argument p_expediteur, sinon la clé expediteur du JSON). NE CLASSE PLUS hors_fil : la classe reste nulle pour que le Standard lise la réponse (un STOP hors fil est une opposition). Pose dernier_contact_recu, sauf pour un accusé de site.';

create or replace function public.acq_reponses_a_repondre(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
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
     and r.classe in ('question', 'prix', 'appel', 'stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'entrant')
     -- 0123 : un STOP ou une demande RGPD reçu HORS de tout fil ne reçoit aucune réponse automatique : l'adresse d'un expéditeur
     -- hors fil n'est pas vérifiée (un en-tête From se falsifie), écrire à une adresse non vérifiée ferait de nous un relais de
     -- courrier non sollicité. L'opposition est posée, la carte RGPD est ouverte pour Benj ; seule sa décision (classe_par = benj)
     -- rend la ligne lisible ici.
     and not (r.classe in ('stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement')
              and r.envoi_id is null and r.conversation_id is null and r.prospect_id is null
              and coalesce(r.classe_par, '') <> 'benj')
   limit greatest(coalesce(p_limite, 1), 0)
$$;
revoke all on function public.acq_reponses_a_repondre(integer) from public, anon, authenticated;
grant execute on function public.acq_reponses_a_repondre(integer) to service_role;
comment on function public.acq_reponses_a_repondre(integer) is
  'Classées, repondue_le nul, actes_le posé, classe parmi question/prix/appel/stop/rgpd/rgpd_acces/rgpd_effacement/entrant ; chaque ligne porte notre_dernier_envoi_le et notre_dernier_envoi_type (0106). Depuis 0123, un STOP ou une demande RGPD hors de tout fil n''est pas rendu (adresse non vérifiée) sauf décision de Benj.';

-- Le rattrapage : ce que l'ancien défaut a classé hors_fil sans que le Standard l'ait jamais lu.
update ops.reponses
   set classe = null
 where classe = 'hors_fil'
   and classe_par is null
   and traitee_le is null
   and reclassee_par_decision is null;
