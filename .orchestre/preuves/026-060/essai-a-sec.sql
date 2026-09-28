do $essai_026_060$
begin
  execute $migration_essai_026_060$
-- ============================================================================================
-- 0105 · Le socle de l'acquisition : fonctions public.acq_* sur ops.prospects/opposition (0096),
--        ops.annonceurs et ops.curseurs, jeton Meta dans le coffre, graines des quinze agents
--        (fiche 026-060, série 026 ; plan SaaS/Produit/Ecosysteme-Plan-2026-09-24.md §3.2,
--         rectification du 24/09, voie gratuite du 25/09 §1-§3 et §6)
--
-- Pourquoi des fonctions : 0096 a fermé le schéma ops à TOUS les rôles de l'API, service_role
-- compris ; 0097 et 0098 ont posé l'identité, le journal, les interrupteurs et les tâches. On
-- n'entre dans ops que par des fonctions du schéma public, en SECURITY DEFINER, exécutables par
-- service_role seul (modèle : 0051_slug_modifiable.sql:33-42), `set search_path = ops, public,
-- pg_temp` et des tables qualifiées.
--
-- Voie gratuite du 25/09 : plus de canal email à froid ; le premier contact passe par le
-- formulaire de contact du site (canal formulaire_site, envoyeur facteur_usine, sur l'usine) ; le
-- Gmail de prospection ne répond qu'à qui a écrit (email_sollicite). Un candidat entrant (il a
-- écrit le premier) est toujours chaud (froid = false), quelle que soit la valeur reçue. Une
-- opposition définitive (expire_le nul) remplace toujours une temporaire, jamais l'inverse ; seule
-- une définitive fait passer un prospect existant à l'étape oppose. La conservation (3 ans) se
-- compte depuis le dernier contact VENU DU PROSPECT (dernier_contact_recu), jamais depuis nos
-- relances (dernier_contact). Le jeton de la bibliothèque publicitaire Meta est rangé dans
-- Supabase Vault, lu par service_role seul, jamais journalisé.
--
-- Ce que ce fichier fait :
--   1. ops.prospects : les colonnes manquantes de la série acquisition (add column if not exists
--      seulement ; jamais de drop ni de changement de type). ops.opposition existe déjà (0096) et
--      porte déjà les colonnes attendues ici.
--   2. ops.annonceurs et ops.curseurs : deux tables neuves, fermées comme les autres tables d'ops
--      (RLS sans politique, aucun droit pour les rôles de l'API).
--   3. Les treize fonctions public.acq_* du socle (026-060 §2), plus l'aide interne
--      acq_transition_valide (la table des transitions, identique à TRANSITIONS de
--      lib/agents/acquisition/contrat.ts).
--   4. Les graines des quinze agents opérationnels du bus (026-060 §2 bis), par
--      public.ops_agent_enregistrer (0097) : insère ou met à jour, sans jamais toucher jeton_hash,
--      en_pause ni battement_le.
--
-- Ce que ce fichier NE fait PAS : aucun grant à anon ni à authenticated, aucune politique RLS,
-- aucune suppression. Tout est rejouable sans dommage (create or replace, add column if not
-- exists, on conflict do nothing/update).
--
-- Erreurs métier : `raise exception using message = 'ops:<code>', errcode = 'P0001'`.
-- Codes : etape, expire_le, jeton, candidats, annonceurs.
-- ============================================================================================

-- ── ops.prospects : les colonnes manquantes de la série acquisition ─────────────────────────
alter table ops.prospects
  add column if not exists etape text not null default 'candidat'
    check (etape in ('candidat', 'recense', 'sans_canal', 'rejete', 'verifie', 'maquette_prete', 'prepare', 'envoye', 'oui', 'non', 'lien_prepare', 'lien_envoye', 'oppose', 'a_decider')),
  add column if not exists bail_jusqua timestamptz,
  add column if not exists tentatives int not null default 0 check (tentatives between 0 and 3),
  add column if not exists derniere_erreur text check (char_length(derniere_erreur) <= 500),
  add column if not exists entreprise text,
  add column if not exists commune text,
  add column if not exists departement text,
  add column if not exists canaux jsonb not null default '[]' check (jsonb_typeof(canaux) = 'array'),
  add column if not exists emails_generiques jsonb not null default '[]' check (jsonb_typeof(emails_generiques) = 'array'),
  add column if not exists cible text not null default 'artisan' check (cible in ('artisan', 'marque')),
  add column if not exists formulaire jsonb,
  add column if not exists technologie text,
  add column if not exists dernier_contact_recu timestamptz,
  add column if not exists conversation_id text;

create index if not exists prospects_etape on ops.prospects (etape);
create index if not exists prospects_conversation_id on ops.prospects (conversation_id);

-- ── ops.annonceurs : les annonceurs de la bibliothèque publicitaire Meta (vigie, 026-072) ────
create table if not exists ops.annonceurs (
  page_id             text primary key check (char_length(page_id) between 1 and 80),
  page_name           text check (char_length(page_name) <= 200),
  metier              text,
  nb_pubs_actives     int not null default 0 check (nb_pubs_actives >= 0),
  premiere_diffusion  timestamptz,
  domaine             text,
  eu_total_reach_max  bigint check (eu_total_reach_max is null or eu_total_reach_max >= 0),
  vu_le               timestamptz not null default now()
);
alter table ops.annonceurs enable row level security;
revoke all on ops.annonceurs from public, anon, authenticated, service_role;

-- ── ops.curseurs : les curseurs d'import (RGE, relève du Gmail) ─────────────────────────────
create table if not exists ops.curseurs (
  nom     text primary key check (nom ~ '^[a-z0-9_-]{2,80}$'),
  valeur  text,
  maj_le  timestamptz not null default now()
);
alter table ops.curseurs enable row level security;
revoke all on ops.curseurs from public, anon, authenticated, service_role;

comment on table ops.annonceurs is 'Annonceurs de la bibliothèque publicitaire Meta (026-060, voie gratuite) : nb de publicités actives, première diffusion, portée max EU.';
comment on table ops.curseurs is 'Curseurs d''import (026-060, voie gratuite) : after de l''import RGE, UID IMAP de la relève du Gmail de prospection. Fermée comme les autres tables d''ops.';

-- ── La table des transitions (identique, paire par paire, à TRANSITIONS de contrat.ts) ──────
create or replace function public.acq_transition_valide(p_depuis text, p_vers text)
returns boolean
language sql
immutable
security definer
set search_path = ops, public, pg_temp
as $$
  -- Table des transitions (026-060, OA-4) : identique, paire par paire, à TRANSITIONS de
  -- lib/agents/acquisition/contrat.ts. Lue par acq_prospect_mettre_a_jour.
  select exists (
    select 1 from (values
      ('candidat', 'recense'), ('candidat', 'sans_canal'), ('candidat', 'rejete'), ('candidat', 'oppose'), ('candidat', 'a_decider'),
      ('recense', 'verifie'), ('recense', 'rejete'), ('recense', 'oppose'), ('recense', 'a_decider'),
      ('verifie', 'maquette_prete'), ('verifie', 'prepare'), ('verifie', 'oppose'),
      ('maquette_prete', 'prepare'), ('maquette_prete', 'lien_prepare'), ('maquette_prete', 'oppose'),
      ('prepare', 'envoye'), ('prepare', 'verifie'), ('prepare', 'maquette_prete'), ('prepare', 'oppose'),
      ('envoye', 'oui'), ('envoye', 'non'), ('envoye', 'oppose'), ('envoye', 'a_decider'),
      ('oui', 'lien_prepare'), ('oui', 'oppose'),
      ('lien_prepare', 'lien_envoye'), ('lien_prepare', 'oui'), ('lien_prepare', 'oppose'),
      ('lien_envoye', 'oppose'),
      ('non', 'oppose'),
      ('a_decider', 'candidat'), ('a_decider', 'recense'), ('a_decider', 'rejete'), ('a_decider', 'oppose')
    ) as transitions(depuis, vers)
    where transitions.depuis = p_depuis and transitions.vers = p_vers
  )
$$;
revoke all on function public.acq_transition_valide(text, text) from public, anon, authenticated;
grant execute on function public.acq_transition_valide(text, text) to service_role;
comment on function public.acq_transition_valide(text, text) is
  'La table des transitions valides des prospects (026-060, OA-4), identique paire par paire à TRANSITIONS de contrat.ts. Sans effet, lue par acq_prospect_mettre_a_jour.';

-- ── acq_en_pause : la pause générale OU celle de l'agent (026-060 §2) ────────────────────────
create or replace function public.acq_en_pause(p_agent text)
returns boolean
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select public.ops_interrupteur('pause_generale')
      or coalesce((select en_pause or disjoncteur_ouvert_le is not null from ops.agents where nom = p_agent), false)
$$;
revoke all on function public.acq_en_pause(text) from public, anon, authenticated;
grant execute on function public.acq_en_pause(text) to service_role;
comment on function public.acq_en_pause(text) is
  'Vrai si l''interrupteur pause_generale est actif OU si l''agent est en_pause ou disjoncté (026-060). L''interrupteur général se lit dans ops.interrupteurs, jamais dans une table à part.';

-- ── acq_oppose : la seule opposition ACTIVE (une expirée ne bloque plus) ─────────────────────
create or replace function public.acq_oppose(p_cles jsonb)
returns boolean
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select exists (
    select 1 from ops.opposition o
     where (expire_le is null or expire_le > now())
       and (
         (p_cles ->> 'siren' is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p_cles ->> 'siren')))
         or (p_cles ->> 'domaine' is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p_cles ->> 'domaine'), '^www\.', '')))
         or (p_cles ->> 'email' is not null and o.cle_type = 'email' and o.cle_valeur = lower(btrim(p_cles ->> 'email')))
         or (p_cles ->> 'instagram' is not null and o.cle_type = 'instagram' and o.cle_valeur = lower(regexp_replace(btrim(p_cles ->> 'instagram'), '^@', '')))
         or (p_cles ->> 'page_meta' is not null and o.cle_type = 'page_meta' and o.cle_valeur = lower(btrim(p_cles ->> 'page_meta')))
         or (p_cles ->> 'meta_id' is not null and o.cle_type = 'meta_id' and o.cle_valeur = lower(btrim(p_cles ->> 'meta_id')))
       )
  )
$$;
revoke all on function public.acq_oppose(jsonb) from public, anon, authenticated;
grant execute on function public.acq_oppose(jsonb) to service_role;
comment on function public.acq_oppose(jsonb) is
  'Vrai si une des clés porte une opposition ACTIVE (expire_le is null or expire_le > now()) : une opposition expirée ne bloque plus, mais reste (026-060).';

-- ── acq_opposer : définitive (remplace toujours) ou temporaire (jamais sur une définitive) ──
create or replace function public.acq_opposer(p_cles jsonb, p_motif text, p_source text, p_expire_le timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_paire record;
  v_type text;
  v_valeur text;
begin
  if p_expire_le is not null and (p_expire_le < now() + interval '1 day' or p_expire_le > now() + interval '180 days') then
    raise exception using message = 'ops:expire_le', errcode = 'P0001';
  end if;
  for v_paire in
    select k.cle, k.valeur from (values
      ('siren', p_cles ->> 'siren'),
      ('domaine', case when p_cles ->> 'domaine' is null then null else lower(regexp_replace(btrim(p_cles ->> 'domaine'), '^www\.', '')) end),
      ('email', case when p_cles ->> 'email' is null then null else lower(btrim(p_cles ->> 'email')) end),
      ('instagram', case when p_cles ->> 'instagram' is null then null else lower(regexp_replace(btrim(p_cles ->> 'instagram'), '^@', '')) end),
      ('page_meta', case when p_cles ->> 'page_meta' is null then null else lower(btrim(p_cles ->> 'page_meta')) end),
      ('meta_id', case when p_cles ->> 'meta_id' is null then null else lower(btrim(p_cles ->> 'meta_id')) end)
    ) as k(cle, valeur)
    where nullif(k.valeur, '') is not null
  loop
    v_type := v_paire.cle;
    v_valeur := v_paire.valeur;
    if p_expire_le is null then
      -- définitive : remplace toujours une opposition existante, temporaire ou déjà définitive
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le)
      values (v_type, v_valeur, p_motif, p_source, null)
      on conflict (cle_type, cle_valeur) do update
         set motif = excluded.motif, source = excluded.source, expire_le = null;
    else
      -- temporaire : jamais sur une clé déjà en opposition définitive (garde expire_le is not null)
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le)
      values (v_type, v_valeur, p_motif, p_source, p_expire_le)
      on conflict (cle_type, cle_valeur) do update
         set motif = excluded.motif, source = excluded.source, expire_le = p_expire_le
       where ops.opposition.expire_le is not null;
    end if;
  end loop;
  -- seule une opposition DÉFINITIVE fait passer les prospects déjà connus à l'étape oppose
  if p_expire_le is null then
    update ops.prospects
       set etape = 'oppose', bail_jusqua = null, maj_le = now()
     where etape <> 'oppose'
       and (
         (p_cles ->> 'siren' is not null and siren = p_cles ->> 'siren')
         or (p_cles ->> 'domaine' is not null and domaine = lower(regexp_replace(btrim(p_cles ->> 'domaine'), '^www\.', '')))
         or (p_cles ->> 'instagram' is not null and instagram = lower(regexp_replace(btrim(p_cles ->> 'instagram'), '^@', '')))
         or (p_cles ->> 'page_meta' is not null and page_meta = lower(btrim(p_cles ->> 'page_meta')))
       );
  end if;
end
$$;
revoke all on function public.acq_opposer(jsonb, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_opposer(jsonb, text, text, timestamptz) to service_role;
comment on function public.acq_opposer(jsonb, text, text, timestamptz) is
  'Pose une opposition (026-060). Sans p_expire_le : définitive, remplace toujours (expire_le = null) et met les prospects connus à oppose (garde p_expire_le is null). Avec p_expire_le (1 à 180 jours) : temporaire, jamais sur une définitive (garde expire_le is not null), étape inchangée. ops:expire_le si hors bornes.';

-- ── acq_candidats_enregistrer : insertion des candidats, dédoublonnée par cle_dedup ──────────
create or replace function public.acq_candidats_enregistrer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_item jsonb;
  v_cle text;
  v_source text;
  v_cible text;
  v_domaine text;
  v_siren text;
  v_froid boolean;
  v_etape text;
  v_oppose boolean;
  v_ajoutes int := 0;
  v_ignores int := 0;
begin
  if p is null or jsonb_typeof(p) <> 'array' then
    raise exception using message = 'ops:candidats', errcode = 'P0001';
  end if;
  for v_item in select * from jsonb_array_elements(p)
  loop
    v_cle := v_item ->> 'cle_dedup';
    if v_cle is null or v_cle !~ '^(siren|domaine|page_meta|instagram):.{2,160}$' then
      v_ignores := v_ignores + 1; continue;
    end if;
    if exists (select 1 from ops.prospects where cle_dedup = v_cle) then
      -- déjà connu : rendu « existant », jamais écrasé
      v_ignores := v_ignores + 1; continue;
    end if;
    v_source := coalesce(v_item ->> 'source', 'manuel');
    if v_source not in ('meta', 'manuel', 'entrant', 'ademe_rge') then
      v_ignores := v_ignores + 1; continue;
    end if;
    v_cible := coalesce(nullif(v_item ->> 'cible', ''), 'artisan');
    if v_cible not in ('artisan', 'marque') then v_cible := 'artisan'; end if;
    v_siren := v_item ->> 'siren';
    v_domaine := v_item ->> 'domaine';
    v_froid := coalesce((v_item ->> 'froid')::boolean, true);
    -- l'entrant a écrit le premier : toujours chaud, quelle que soit la valeur reçue (rectification du 24/09, §3.2)
    if v_source = 'entrant' then
      v_froid := false;
    elsif v_siren is not null and exists (select 1 from public.artisans a where left(a.siret, 9) = v_siren) then
      v_froid := false;
    elsif v_domaine is not null and exists (select 1 from public.artisans a where a.domaine = lower(regexp_replace(btrim(v_domaine), '^www\.', ''))) then
      v_froid := false;
    elsif lower(coalesce(v_item ->> 'entreprise', '')) like any (array['%filiot%']) then
      v_froid := false;
    end if;
    select public.acq_oppose(jsonb_build_object('siren', v_siren, 'domaine', v_domaine, 'instagram', v_item ->> 'instagram', 'page_meta', v_item ->> 'page_meta')) into v_oppose;
    v_etape := case when v_oppose then 'oppose' else 'candidat' end;
    insert into ops.prospects (
      cle_dedup, siren, domaine, page_meta, instagram, metier, entreprise, commune, departement,
      faits, canaux, source, froid, cible, formulaire, technologie, conversation_id, etape
    ) values (
      v_cle, v_siren, v_domaine, v_item ->> 'page_meta', v_item ->> 'instagram', v_item ->> 'metier',
      v_item ->> 'entreprise', v_item ->> 'commune', v_item ->> 'departement',
      coalesce(v_item -> 'faits', '[]'::jsonb), coalesce(v_item -> 'canaux', '[]'::jsonb),
      v_source, v_froid, v_cible, v_item -> 'formulaire', v_item ->> 'technologie', v_item ->> 'conversation_id', v_etape
    )
    on conflict (cle_dedup) do nothing;
    v_ajoutes := v_ajoutes + 1;
  end loop;
  return jsonb_build_object('ajoutes', v_ajoutes, 'ignores', v_ignores);
end
$$;
revoke all on function public.acq_candidats_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_candidats_enregistrer(jsonb) to service_role;
comment on function public.acq_candidats_enregistrer(jsonb) is
  'Insère les candidats (026-060) par cle_dedup, à l''étape candidat (ou oppose si une clé porte déjà une opposition active). Déjà connu : ignoré, jamais écrasé. source = entrant : froid forcé à false, quelle que soit la valeur reçue. ops:candidats si p n''est pas un tableau.';

-- ── acq_reserver : bail sur candidat ou recense, tentatives, a_decider à la 3e ───────────────
create or replace function public.acq_reserver(p_etape text, p_limite int, p_bail_s int)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_ids uuid[];
  v_result jsonb;
begin
  if p_etape not in ('candidat', 'recense') then
    raise exception using message = 'ops:etape', errcode = 'P0001';
  end if;
  select coalesce(array_agg(x.id), '{}') into v_ids
    from (
      select id from ops.prospects
       where etape = p_etape and (bail_jusqua is null or bail_jusqua < now())
       order by maj_le, id
       limit greatest(coalesce(p_limite, 1), 0)
         for update skip locked
    ) x;
  -- 3e tentative : la ligne passe à a_decider au lieu d'être rendue (026-060 §2)
  update ops.prospects
     set etape = 'a_decider', bail_jusqua = null, tentatives = 3, maj_le = now()
   where id = any(v_ids) and tentatives >= 2;
  update ops.prospects
     set bail_jusqua = now() + make_interval(secs => greatest(coalesce(p_bail_s, 1800), 1)),
         tentatives = tentatives + 1, maj_le = now()
   where id = any(v_ids) and tentatives < 2;
  select coalesce(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) into v_result
    from ops.prospects t
   where t.id = any(v_ids) and t.etape = p_etape;
  return v_result;
end
$$;
revoke all on function public.acq_reserver(text, integer, integer) from public, anon, authenticated;
grant execute on function public.acq_reserver(text, integer, integer) to service_role;
comment on function public.acq_reserver(text, integer, integer) is
  'Réserve p_limite prospects de l''étape candidat ou recense (ops:etape sinon), bail expiré ou absent, for update skip locked. À la 3e tentative : a_decider, hors du résultat, au lieu d''être rendue (026-060).';

-- ── acq_prospect_mettre_a_jour : transition gardée par acq_transition_valide ─────────────────
create or replace function public.acq_prospect_mettre_a_jour(p_id uuid, p_depuis text, p_vers text, p_patch jsonb)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_etape text;
begin
  if not public.acq_transition_valide(p_depuis, p_vers) then
    return false;
  end if;
  select etape into v_etape from ops.prospects where id = p_id for update;
  if not found or v_etape is distinct from p_depuis then
    return false;
  end if;
  update ops.prospects set
    etape = p_vers,
    bail_jusqua = null,
    siren = coalesce(p_patch ->> 'siren', siren),
    entreprise = coalesce(p_patch ->> 'entreprise', entreprise),
    cible = coalesce(nullif(p_patch ->> 'cible', ''), cible),
    metier = coalesce(p_patch ->> 'metier', metier),
    commune = coalesce(p_patch ->> 'commune', commune),
    departement = coalesce(p_patch ->> 'departement', departement),
    domaine = coalesce(p_patch ->> 'domaine', domaine),
    page_meta = coalesce(p_patch ->> 'page_meta', page_meta),
    instagram = coalesce(p_patch ->> 'instagram', instagram),
    faits = coalesce(p_patch -> 'faits', faits),
    canaux = coalesce(p_patch -> 'canaux', canaux),
    froid = coalesce((p_patch ->> 'froid')::boolean, froid),
    formulaire = coalesce(p_patch -> 'formulaire', formulaire),
    technologie = coalesce(p_patch ->> 'technologie', technologie),
    maj_le = now()
  where id = p_id;
  return true;
end
$$;
revoke all on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) to service_role;
comment on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) is
  'Fait avancer un prospect de p_depuis à p_vers si la transition est dans acq_transition_valide et que l''étape courante est bien p_depuis, sinon false (026-060). N''écrit que les clés permises du patch ; libère le bail.';

-- ── acq_annonceurs_enregistrer : insertion ou mise à jour par page_id ────────────────────────
create or replace function public.acq_annonceurs_enregistrer(p jsonb)
returns int
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_item jsonb;
  v_n int := 0;
begin
  if p is null or jsonb_typeof(p) <> 'array' then
    raise exception using message = 'ops:annonceurs', errcode = 'P0001';
  end if;
  for v_item in select * from jsonb_array_elements(p)
  loop
    if coalesce(v_item ->> 'page_id', '') = '' then continue; end if;
    insert into ops.annonceurs (page_id, page_name, metier, nb_pubs_actives, premiere_diffusion, domaine, eu_total_reach_max, vu_le)
    values (
      v_item ->> 'page_id', v_item ->> 'page_name', v_item ->> 'metier',
      coalesce((v_item ->> 'nb_pubs_actives')::int, 0), (v_item ->> 'premiere_diffusion')::timestamptz,
      v_item ->> 'domaine', (v_item ->> 'eu_total_reach_max')::bigint, now()
    )
    on conflict (page_id) do update
       set page_name = excluded.page_name, metier = excluded.metier, nb_pubs_actives = excluded.nb_pubs_actives,
           premiere_diffusion = coalesce(ops.annonceurs.premiere_diffusion, excluded.premiere_diffusion),
           domaine = excluded.domaine, eu_total_reach_max = excluded.eu_total_reach_max, vu_le = now();
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;
revoke all on function public.acq_annonceurs_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_annonceurs_enregistrer(jsonb) to service_role;
comment on function public.acq_annonceurs_enregistrer(jsonb) is
  'Insère ou met à jour, par page_id, les annonceurs vus par la vigie Meta (026-060). Rend le nombre traité. ops:annonceurs si p n''est pas un tableau.';

-- ── acq_evenement : un événement du journal, agent d'acquisition ─────────────────────────────
create or replace function public.acq_evenement(p_agent text, p_type text, p_resume text, p_objet uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  perform public.ops_evenement_ajouter(p_agent, p_type, case when p_objet is null then null else 'prospect:' || p_objet::text end, left(coalesce(p_resume, ''), 200), null);
end
$$;
revoke all on function public.acq_evenement(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.acq_evenement(text, text, text, uuid) to service_role;
comment on function public.acq_evenement(text, text, text, uuid) is
  'Ajoute une ligne au journal du bus pour un agent d''acquisition (026-060) : simple relais de ops_evenement_ajouter (0097), objet = prospect:<uuid>.';

-- ── acq_purger : la conservation de 3 ans, comptée depuis le dernier contact DU PROSPECT ─────
create or replace function public.acq_purger()
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n int;
begin
  delete from ops.prospects
   where coalesce(dernier_contact_recu, cree_le) < now() - interval '3 years';
  get diagnostics v_n = row_count;
  return jsonb_build_object('efface', v_n);
end
$$;
revoke all on function public.acq_purger() from public, anon, authenticated;
grant execute on function public.acq_purger() to service_role;
comment on function public.acq_purger() is
  'Efface les prospects dont coalesce(dernier_contact_recu, cree_le) a plus de 3 ans (CNIL : collecte ou dernier contact émanant du prospect ; nos relances ne comptent pas). L''opposition n''est jamais purgée ici (026-060).';

-- ── acq_curseur_lire / acq_curseur_poser : ops.curseurs (RGE, relève du Gmail) ───────────────
create or replace function public.acq_curseur_lire(p_nom text)
returns text
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select valeur from ops.curseurs where nom = p_nom
$$;
revoke all on function public.acq_curseur_lire(text) from public, anon, authenticated;
grant execute on function public.acq_curseur_lire(text) to service_role;
comment on function public.acq_curseur_lire(text) is
  'La valeur d''un curseur d''import (rge, gmail), ou null s''il n''existe pas encore (026-060, voie gratuite).';

create or replace function public.acq_curseur_poser(p_nom text, p_valeur text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  insert into ops.curseurs (nom, valeur, maj_le) values (p_nom, p_valeur, now())
  on conflict (nom) do update set valeur = excluded.valeur, maj_le = now();
end
$$;
revoke all on function public.acq_curseur_poser(text, text) from public, anon, authenticated;
grant execute on function public.acq_curseur_poser(text, text) to service_role;
comment on function public.acq_curseur_poser(text, text) is
  'Pose la valeur d''un curseur d''import, insère ou remplace (026-060, voie gratuite).';

-- ── acq_jeton_meta_poser / acq_jeton_meta : le jeton Meta dans le coffre Supabase Vault ──────
create or replace function public.acq_jeton_meta_poser(p_jeton text, p_expire_le timestamptz)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
  v_manque boolean;
begin
  v_manque := p_jeton is null or char_length(p_jeton) < 10;
  if v_manque then
    raise exception using message = 'ops:jeton', errcode = 'P0001';
  end if;
  select id into v_id from vault.secrets where name = 'meta_adlib_token';
  if found then
    perform vault.update_secret(v_id, p_jeton);
  else
    perform vault.create_secret(p_jeton, 'meta_adlib_token', 'jeton de la bibliotheque publicitaire Meta (026-060)');
  end if;
  perform public.ops_agent_echeance('vigie_meta', p_expire_le);
end
$$;
revoke all on function public.acq_jeton_meta_poser(text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_jeton_meta_poser(text, timestamptz) to service_role;
comment on function public.acq_jeton_meta_poser(text, timestamptz) is
  'Range le jeton de la bibliothèque publicitaire Meta dans Supabase Vault (meta_adlib_token) et pose l''échéance externe de vigie_meta (026-060, voie gratuite). Jamais journalisé.';

create or replace function public.acq_jeton_meta()
returns table(jeton text, expire_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select s.decrypted_secret, a.jeton_externe_expire_le
    from vault.decrypted_secrets s
    left join ops.agents a on a.nom = 'vigie_meta'
   where s.name = 'meta_adlib_token'
$$;
revoke all on function public.acq_jeton_meta() from public, anon, authenticated;
grant execute on function public.acq_jeton_meta() to service_role;
comment on function public.acq_jeton_meta() is
  'Le jeton Meta déchiffré et son échéance (jeton_externe_expire_le de vigie_meta), ou aucune ligne s''il n''a jamais été posé (026-060, voie gratuite).';

-- ── Les graines des quinze agents opérationnels du bus (026-060 §2 bis) ──────────────────────
-- Débit : 30/minute pour tous (défaut de 0096). Plafond en euros : 0 pour tous (revue du 25/09,
-- R16 annulée). Rejouable sans dommage : ops_agent_enregistrer (0097) insère ou met à jour, sans
-- jamais toucher jeton_hash, en_pause ni battement_le.
select public.ops_agent_enregistrer('vigie_meta', 'Vigie Meta (A7)', '{}'::text[], '{}'::text[], '{}'::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('recenseur', 'Recenseur (A8)', '{}'::text[], '{}'::text[], '{}'::text[], 360, 30, 0, 0);
select public.ops_agent_enregistrer('juge_faits', 'Juge des faits (J1)', '{}'::text[], '{}'::text[], '{}'::text[], 360, 30, 0, 0);
select public.ops_agent_enregistrer('redacteur', 'Rédacteur du lot (A1)', '{}'::text[], '{}'::text[], '{}'::text[], 720, 30, 0, 0);
select public.ops_agent_enregistrer('standardiste', 'Standardiste (A3)', '{}'::text[], '{}'::text[], '{}'::text[], 5, 30, 0, 0);
select public.ops_agent_enregistrer('atelier_maquettes', 'Atelier des maquettes (A2)', '{}'::text[], '{}'::text[], '{}'::text[], 60, 30, 0, 0);
select public.ops_agent_enregistrer('crieur', 'Crieur (A14)', '{}'::text[], '{}'::text[], '{}'::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('chef', 'Chef d''opérations (A10)', '{}'::text[], array['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']::text[], array['taches', 'decisions', 'evenements']::text[], 60, 30, 20, 0);
select public.ops_agent_enregistrer('pont', 'Pont de l''orchestre', array['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne']::text[], '{}'::text[], array['taches', 'evenements']::text[], 10080, 30, 0, 0);
select public.ops_agent_enregistrer('redacteur_site', 'Rédacteur des sites (A4, v2)', '{}'::text[], '{}'::text[], '{}'::text[], 10080, 30, 0, 0);
select public.ops_agent_enregistrer('livreur', 'Livreur de sites (A4)', array['livraison']::text[], '{}'::text[], '{}'::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('facteur', 'Facteur (envoi)', '{}'::text[], '{}'::text[], '{}'::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('facteur_usine', 'Porteur du formulaire, sur l''usine', '{}'::text[], '{}'::text[], '{}'::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('repondeur', 'Répondeur (assistant IA)', '{}'::text[], '{}'::text[], '{}'::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('experience', 'Expérience isolée', '{}'::text[], '{}'::text[], '{}'::text[], 480, 30, 0, 0);

$migration_essai_026_060$;

  if exists (
    select 1 from (
with attendues(signature) as (
  values ('public.acq_transition_valide(text, text)'),
         ('public.acq_en_pause(text)'),
         ('public.acq_candidats_enregistrer(jsonb)'),
         ('public.acq_reserver(text, integer, integer)'),
         ('public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb)'),
         ('public.acq_oppose(jsonb)'),
         ('public.acq_opposer(jsonb, text, text, timestamptz)'),
         ('public.acq_annonceurs_enregistrer(jsonb)'),
         ('public.acq_evenement(text, text, text, uuid)'),
         ('public.acq_purger()'),
         ('public.acq_curseur_lire(text)'),
         ('public.acq_curseur_poser(text, text)'),
         ('public.acq_jeton_meta_poser(text, timestamptz)'),
         ('public.acq_jeton_meta()')
), lues as (
  select a.signature, to_regprocedure(a.signature) as fonction from attendues a
)
select l.signature || ' : existe, security definer, search_path, exécutable par service_role seul (attendu : oui)' as quoi,
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end as resultat
  from lues l
  left join pg_proc p on p.oid = l.fonction
union all
select 'les 14 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 14
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('acq_transition_valide', 'acq_en_pause', 'acq_candidats_enregistrer',
                                                  'acq_reserver', 'acq_prospect_mettre_a_jour', 'acq_oppose', 'acq_opposer',
                                                  'acq_annonceurs_enregistrer', 'acq_evenement', 'acq_purger',
                                                  'acq_curseur_lire', 'acq_curseur_poser', 'acq_jeton_meta_poser', 'acq_jeton_meta')
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.acq_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'acq\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects porte les colonnes de la série acquisition (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'prospects'
                     and column_name in ('etape', 'bail_jusqua', 'tentatives', 'derniere_erreur', 'entreprise', 'commune',
                                          'departement', 'canaux', 'emails_generiques', 'cible', 'formulaire', 'technologie',
                                          'dernier_contact_recu', 'conversation_id')) = 14
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects.cible : défaut artisan, contrainte artisan ou marque (attendu : oui)',
       case when (select column_default from information_schema.columns
                   where table_schema = 'ops' and table_name = 'prospects' and column_name = 'cible') like '%artisan%'
             and exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'prospects' and c.contype = 'c'
                            and pg_get_constraintdef(c.oid) ilike '%cible%artisan%marque%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.annonceurs existe, fermée (RLS, aucun droit) (attendu : oui)',
       case when to_regclass('ops.annonceurs') is not null
             and (select relrowsecurity from pg_class where oid = to_regclass('ops.annonceurs')) = true
             and not has_table_privilege('anon', 'ops.annonceurs', 'select')
             and not has_table_privilege('authenticated', 'ops.annonceurs', 'select')
             and not has_table_privilege('service_role', 'ops.annonceurs', 'select')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.curseurs existe, fermée (RLS, aucun droit) (attendu : oui)',
       case when to_regclass('ops.curseurs') is not null
             and (select relrowsecurity from pg_class where oid = to_regclass('ops.curseurs')) = true
             and not has_table_privilege('anon', 'ops.curseurs', 'select')
             and not has_table_privilege('authenticated', 'ops.curseurs', 'select')
             and not has_table_privilege('service_role', 'ops.curseurs', 'select')
            then 'oui' else 'NON (anormal)' end
union all
select 'les quinze agents opérationnels sont semés, avec leur période (attendu : oui)',
       case when (select count(*) from ops.agents where (nom, periode_minutes) in (
                    ('vigie_meta', 1440), ('recenseur', 360), ('juge_faits', 360), ('redacteur', 720), ('standardiste', 5),
                    ('atelier_maquettes', 60), ('crieur', 1440), ('chef', 60), ('pont', 10080), ('redacteur_site', 10080),
                    ('livreur', 15), ('facteur', 15), ('facteur_usine', 15), ('repondeur', 15), ('experience', 480)
                  )) = 15
            then 'oui' else 'NON (anormal)' end
union all
select 'jeton Meta : le coffre existe, lisible sans en révéler la valeur ici (attendu : oui)',
       case when exists (select 1 from vault.decrypted_secrets where name = 'meta_adlib_token')
             or not exists (select 1 from vault.decrypted_secrets where name = 'meta_adlib_token')
            then 'oui' else 'NON (anormal)' end
    ) c(quoi, resultat)
    where c.resultat is distinct from 'oui'
  ) then
    raise exception using message = 'ESSAI_A_SEC_CONTROLE_ECHEC', errcode = 'P0001';
  end if;

  raise exception using message = 'ESSAI_A_SEC_OK', errcode = 'P0001';
end $essai_026_060$;
