-- ============================================================================================
-- 0114 · Contenu : lignes éditoriales, publications, mesures, idées (fiche 026-206, C03)
-- ============================================================================================
-- Source : Ecosysteme-Marketing-Reel-2026-09-25.md §3.7 (ligne C03) et §4 bis. Numéro 0114 : 0113 est promis à N2.
-- Dépend de 0096/0098 (ops.decisions, ops.evenements) et de public.is_founder() (0004).
--
-- Ce que ce fichier pose, et pourquoi.
--   · Cinq lignes L1 à L5, chacune avec sa campagne UTM en liste fermée (ligne-l1 … ligne-l5, à ajouter à CAMPAGNES de
--     lib/audience.ts AVANT toute diffusion, fiche 026-213), et un compte par réseau avec son code d'apport
--     (^[a-z0-9]{6,24}$) et son unique lien de bio. Aucun code par ligne : TikTok et Instagram n'ont qu'un lien en bio,
--     donc la ligne d'une visite n'y est jamais certaine (la mesure la range en « estimation »).
--   · Une publication ne devient « publiable » que si UNE décision du bus est réellement `tranchee`, choix `accorder`,
--     portée `securite`, prise par un fondateur, non expirée, et dont la clé est EXACTEMENT la cible de la publication
--     (`contenu:post:<id>:<empreinte du texte visible et du rendu>`). Un défaut appliqué à l'échéance (`defaut_applique`),
--     un refus, une autre portée, une autre cible, une décision de plus de 7 jours : rien ne s'ouvre. Retoucher le texte
--     ou le rendu change l'empreinte : l'accord tombe et la publication retourne en attente. Une ligne approuvée n'ouvre
--     JAMAIS une publication seule : l'accord individuel reste exigé (R24 ouverte).
--   · La garde est dans des DÉCLENCHEURS, pas seulement dans les fonctions : une écriture directe de service_role ne la
--     contourne pas. Un score de Laya n'y entre nulle part : seule la trace du verdict (affirmations) est vérifiée.
--   · Suspension par agent et par ligne (table en ajout seul, jamais d'effacement de la preuve d'une publication) ; la
--     lever exige, elle aussi, une décision `tranchee`/`accorder`/`securite` sur la cible `contenu:reprise:<id>`.
--   · Mesures à H+1, H+24, J+7, une ligne par métrique : « non mesuré » ou « en attente » n'est jamais un zéro ; la source
--     est fermée et cohérente avec la métrique ; ventes et demandes de maquette restent des ESTIMATIONS par fenêtre.
--   · Idées : provenance obligatoire ; une idée nominative de veille expire au plus tard à 30 jours.
--
-- Fermé au public : RLS active, aucune politique d'écriture, anon sans accès, authenticated en lecture seule et
-- seulement fondateur. Écritures : service_role (les agents de lib/contenu), sous les déclencheurs ci-dessous.
-- Erreurs métier : `raise exception using message = 'contenu:<code>', errcode = 'P0001'`.
-- Codes : transition, publie_fige, accord, ligne_fermee, canal, suspendue, affirmation, chiffre, preuve_conservee,
-- suspension_figee, ligne, suspension, post_non_publie, mesure_figee, mesure_trop_tot, ajout_seul.
-- Aucune clé, aucun jeton, aucun nom ni adresse de personne dans ce fichier.
-- Rejouable sans dommage (if not exists, or replace, on conflict do nothing).
-- ============================================================================================

-- ── Fonctions pures, sans accès aux tables ───────────────────────────────────────────────────
-- L'empreinte de ce qui sera VU : réseau, texte, légende, sous-titres incrustés, texte de miniature, description, film.
-- Chaque champ est précédé de sa longueur : deux découpages différents ne donnent jamais la même empreinte.
create or replace function public.contenu_empreinte(p_canal text, p_texte text, p_legende text, p_sous_titres text, p_miniature text, p_description text, p_rendu text)
returns text
language sql
stable
set search_path = public, pg_temp
as $fn$
  select encode(sha256(convert_to(concat_ws('|', 'v1',
    format('%s:%s', char_length(coalesce(p_canal, '')), coalesce(p_canal, '')),
    format('%s:%s', char_length(coalesce(p_texte, '')), coalesce(p_texte, '')),
    format('%s:%s', char_length(coalesce(p_legende, '')), coalesce(p_legende, '')),
    format('%s:%s', char_length(coalesce(p_sous_titres, '')), coalesce(p_sous_titres, '')),
    format('%s:%s', char_length(coalesce(p_miniature, '')), coalesce(p_miniature, '')),
    format('%s:%s', char_length(coalesce(p_description, '')), coalesce(p_description, '')),
    format('%s:%s', char_length(coalesce(p_rendu, '')), coalesce(p_rendu, ''))), 'UTF8')), 'hex')
$fn$;
revoke all on function public.contenu_empreinte(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.contenu_empreinte(text, text, text, text, text, text, text) to service_role;
comment on function public.contenu_empreinte(text, text, text, text, text, text, text) is
  'Empreinte sha256 (hex) de ce qui est vu : réseau, texte, légende, sous-titres, texte de miniature, description, empreinte du film (026-206). Champs préfixés par leur longueur.';

-- La forme d'un tableau d'affirmations chiffrées : {texte, source_ref, verdict, probabilite, le}. Une entrée invalide
-- (NULL compris) rend faux : jamais de valeur par défaut flatteuse.
create or replace function public.contenu_affirmations_ok(j jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select coalesce(case when jsonb_typeof(j) = 'array' and jsonb_array_length(j) <= 20 then
    not exists (
      select 1 from jsonb_array_elements(j) e
       where (jsonb_typeof(e) = 'object'
          and jsonb_typeof(e -> 'texte') = 'string' and char_length(e ->> 'texte') between 3 and 300
          and jsonb_typeof(e -> 'source_ref') = 'string' and char_length(btrim(e ->> 'source_ref')) between 3 and 200
          and jsonb_typeof(e -> 'verdict') = 'string' and (e ->> 'verdict') in ('pass', 'refus', 'indisponible')
          and jsonb_typeof(e -> 'le') = 'string' and (e ->> 'le') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          and case when jsonb_typeof(e -> 'probabilite') = 'number' then (e ->> 'probabilite')::numeric between 0 and 1
                   else coalesce(jsonb_typeof(e -> 'probabilite'), 'null') = 'null' end) is not true
    )
  else false end, false)
$fn$;
revoke all on function public.contenu_affirmations_ok(jsonb) from public, anon, authenticated;
grant execute on function public.contenu_affirmations_ok(jsonb) to service_role;
comment on function public.contenu_affirmations_ok(jsonb) is
  'Forme d''un tableau d''affirmations chiffrées {texte, source_ref, verdict pass|refus|indisponible, probabilite 0..1 ou null, le AAAA-MM-JJ}, 20 au plus ; toute entrée invalide rend faux (026-206).';

-- Toutes les affirmations ont une source, un verdict « pass » et une probabilité d'au moins 0,5 (jev noul, Laya local).
-- Vide : vrai (aucune affirmation à prouver) ; la règle des chiffres nus est dans contenu_verdict_post.
create or replace function public.contenu_affirmations_passent(j jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select case when public.contenu_affirmations_ok(j) then not exists (
    select 1 from jsonb_array_elements(j) e
     where ((e ->> 'verdict') = 'pass'
        and char_length(btrim(coalesce(e ->> 'source_ref', ''))) >= 3
        and jsonb_typeof(e -> 'probabilite') = 'number' and (e ->> 'probabilite')::numeric >= 0.5) is not true
  ) else false end
$fn$;
revoke all on function public.contenu_affirmations_passent(jsonb) from public, anon, authenticated;
grant execute on function public.contenu_affirmations_passent(jsonb) to service_role;
comment on function public.contenu_affirmations_passent(jsonb) is
  'Vrai si le tableau est bien formé et si chaque affirmation a une source, le verdict pass et une probabilité >= 0,5 (026-206). Un verdict refus ou indisponible (panne de Laya) bloque.';

-- ── Les lignes ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.contenu_lignes (
  id                      text primary key check (id ~ '^L[1-5]$'),
  libelle                 text not null check (char_length(libelle) between 3 and 120),
  canaux                  text[] not null check (cardinality(canaux) between 1 and 4 and canaux <@ array['tiktok', 'instagram', 'facebook', 'linkedin']),
  utm_campagne            text not null unique check (utm_campagne in ('ligne-l1', 'ligne-l2', 'ligne-l3', 'ligne-l4', 'ligne-l5')),
  empreinte               text not null default '',
  approuvee_le            timestamptz,
  approbation_decision_id uuid references ops.decisions(id),
  approbation_cible       text,
  cree_le                 timestamptz not null default now(),
  constraint contenu_lignes_utm_de_la_ligne check (utm_campagne = 'ligne-' || lower(id)),
  constraint contenu_lignes_approbation_complete check ((approuvee_le is null) = (approbation_decision_id is null and approbation_cible is null))
);

-- ── Un compte par réseau : un code d'apport, un lien de bio ──────────────────────────────────
create table if not exists public.contenu_comptes (
  reseau      text primary key check (reseau in ('tiktok', 'instagram', 'facebook', 'linkedin')),
  compte      text check (compte is null or compte ~ '^@?[a-z0-9._]{2,40}$'),
  code_apport text not null unique check (code_apport ~ '^[a-z0-9]{6,24}$'),
  lien_bio    text generated always as ('https://prestiapp.fr/a/' || code_apport) stored,
  cree_le     timestamptz not null default now()
);

-- ── Les publications ─────────────────────────────────────────────────────────────────────────
create table if not exists public.contenu_posts (
  id                 uuid primary key default gen_random_uuid(),
  ligne_id           text not null references public.contenu_lignes(id),
  canal              text not null check (canal in ('tiktok', 'instagram', 'facebook', 'linkedin')),
  agent              text not null check (agent ~ '^[a-z0-9_]{2,40}$'),
  texte              text not null check (char_length(btrim(texte)) between 1 and 5000),
  legende            text check (char_length(legende) <= 5000),
  sous_titres        text check (char_length(sous_titres) <= 5000),
  miniature_texte    text check (char_length(miniature_texte) <= 500),
  description        text check (char_length(description) <= 5000),
  rendu_type         text not null default 'texte' check (rendu_type in ('texte', 'image', 'video')),
  rendu_ref          text check (char_length(rendu_ref) <= 300),
  rendu_empreinte    text check (rendu_empreinte ~ '^[0-9a-f]{64}$'),
  affirmations       jsonb not null default '[]'::jsonb,
  chiffres_neutres   boolean not null default false,
  statut             text not null default 'brouillon',
  empreinte          text not null default '',
  accord_decision_id uuid references ops.decisions(id),
  accord_cible       text,
  accord_le          timestamptz,
  id_externe         text check (id_externe ~ '^[A-Za-z0-9_.:-]{3,120}$'),
  preuve_publique    text check (preuve_publique ~ '^https://[^[:space:]]+$' and char_length(preuve_publique) between 12 and 500),
  preuve_le          timestamptz,
  publie_le          timestamptz,
  cree_le            timestamptz not null default now(),
  constraint contenu_posts_statut_check check (statut in ('brouillon', 'en_attente', 'publiable', 'publie', 'refuse')),
  constraint contenu_posts_publiable_exige_accord check (statut not in ('publiable', 'publie') or accord_decision_id is not null),
  constraint contenu_posts_accord_complet check (statut not in ('publiable', 'publie') or (accord_cible is not null and accord_le is not null)),
  constraint contenu_posts_ferme_sans_accord check (statut not in ('brouillon', 'en_attente') or (accord_decision_id is null and accord_cible is null and accord_le is null)),
  constraint contenu_posts_preuve_si_publie check ((statut = 'publie') = (preuve_publique is not null and publie_le is not null)),
  constraint contenu_posts_rendu_dit check (rendu_type = 'texte' or rendu_empreinte is not null),
  constraint contenu_posts_tiktok_video check (canal <> 'tiktok' or rendu_type = 'video'),
  constraint contenu_posts_affirmations_forme check (public.contenu_affirmations_ok(affirmations))
);
-- Déduplication : le même contenu exact ne part pas deux fois sur un réseau ; un identifiant externe n'est jamais réutilisé.
create unique index if not exists contenu_posts_dedup on public.contenu_posts (canal, empreinte) where statut <> 'refuse';
create unique index if not exists contenu_posts_externe on public.contenu_posts (canal, id_externe) where id_externe is not null;
create index if not exists contenu_posts_ligne_statut on public.contenu_posts (ligne_id, statut);

-- ── Les mesures : une ligne par publication, échéance et métrique ────────────────────────────
create table if not exists public.contenu_mesures (
  id                    uuid primary key default gen_random_uuid(),
  post_id               uuid not null references public.contenu_posts(id),
  echeance              text not null check (echeance in ('H+1', 'H+24', 'J+7')),
  metrique              text not null check (metrique in ('vues', 'lectures_completes', 'temps_moyen_s', 'enregistrements', 'partages', 'commentaires', 'j_aime', 'visites', 'demandes_maquette', 'ventes')),
  etat                  text not null default 'en_attente' check (etat in ('mesure', 'non_mesure', 'en_attente')),
  valeur                numeric check (valeur >= 0),
  source                text not null check (source in ('api_officielle', 'releve_main', 'audience_maison', 'base_presti')),
  source_ref            text check (source_ref ~ '^[a-z0-9_.:/-]{2,80}$'),
  certitude             text not null default 'mesure' check (certitude in ('mesure', 'estimation')),
  fenetre_attribution_h integer check (fenetre_attribution_h between 1 and 168),
  mesure_le             timestamptz not null default now(),
  unique (post_id, echeance, metrique),
  -- « non mesuré » et « en attente » n'ont jamais de valeur : ni zéro ni succès ; une valeur mesurée en a toujours une.
  constraint contenu_mesures_valeur_si_mesure check ((etat = 'mesure') = (valeur is not null)),
  -- ventes et demandes de maquette : rattachées à une ligne par une fenêtre de temps, donc estimées, jamais certaines.
  constraint contenu_mesures_attribution_estimee check ((metrique in ('ventes', 'demandes_maquette')) = (certitude = 'estimation')),
  constraint contenu_mesures_fenetre_si_estimee check ((certitude = 'estimation') = (fenetre_attribution_h is not null)),
  -- provenance cohérente : le réseau par voie officielle ou relevé à la main ; la base de Presti pour ventes et demandes.
  constraint contenu_mesures_source_coherente check (case
    when metrique in ('ventes', 'demandes_maquette') then source = 'base_presti'
    when metrique = 'visites' then source = 'audience_maison'
    else source in ('api_officielle', 'releve_main') end)
);
create index if not exists contenu_mesures_post on public.contenu_mesures (post_id);

-- ── Les suspensions : par ligne et par agent, en ajout seul ──────────────────────────────────
create table if not exists public.contenu_suspensions (
  id                uuid primary key default gen_random_uuid(),
  ligne_id          text not null references public.contenu_lignes(id),
  agent             text not null check (agent = '*' or agent ~ '^[a-z0-9_]{2,40}$'),
  motif             text not null check (char_length(btrim(motif)) between 1 and 200),
  posee_par         text not null check (posee_par ~ '^[a-z0-9_]{2,40}$'),
  posee_le          timestamptz not null default now(),
  levee_le          timestamptz,
  levee_decision_id uuid references ops.decisions(id),
  constraint contenu_suspensions_levee_complete check ((levee_le is null) = (levee_decision_id is null))
);
create unique index if not exists contenu_suspensions_active on public.contenu_suspensions (ligne_id, agent) where levee_le is null;

-- ── La banque d'idées, notée par du code ─────────────────────────────────────────────────────
create table if not exists public.contenu_idees (
  id          uuid primary key default gen_random_uuid(),
  ligne_id    text references public.contenu_lignes(id),
  post_id     uuid references public.contenu_posts(id) on delete set null,
  texte       text not null check (char_length(btrim(texte)) between 3 and 500),
  source      text not null check (char_length(btrim(source)) between 3 and 200),
  origine     text not null check (origine in ('faits', 'douleur', 'veille', 'benj', 'boucle', 'mesure')),
  statut      text not null default 'nouvelle' check (statut in ('nouvelle', 'retenue', 'ecartee', 'realisee')),
  score       integer check (score between 0 and 100),
  score_par   text not null default 'code' check (score_par in ('code', 'laya')),
  nominative  boolean not null default false,
  expire_le   timestamptz,
  cree_le     timestamptz not null default now(),
  -- une donnée nominative de veille expire au plus tard à 30 jours
  constraint contenu_idees_veille_expire check (not nominative or (expire_le is not null and expire_le <= cree_le + interval '30 days'))
);
create index if not exists contenu_idees_ligne on public.contenu_idees (ligne_id);

-- ── Le journal du bus (fonction privée : aucun rôle ne l'exécute) ────────────────────────────
create or replace function public.contenu_journal(p_type text, p_objet text, p_resume text)
returns void
language sql
security definer
set search_path = ops, public, pg_temp
as $fn$
  insert into ops.evenements (agent, type, objet, resume) values ('systeme', p_type, left(p_objet, 200), left(p_resume, 200))
$fn$;
revoke all on function public.contenu_journal(text, text, text) from public, anon, authenticated, service_role;
comment on function public.contenu_journal(text, text, text) is 'Écrit dans ops.evenements (agent systeme) ; privée, appelée par les fonctions du contenu (026-206).';

-- ── L'accord : une décision du bus réellement tranchée, « accorder », portée sécurité, cible exacte ──
create or replace function public.contenu_accord_valide(p_decision uuid, p_cible text)
returns boolean
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $fn$
  select coalesce((
    select true from ops.decisions d
     where d.id = p_decision
       and p_cible is not null
       and d.cle_idempotence = p_cible
       and d.statut = 'tranchee'                 -- jamais defaut_applique ni annulee : un défaut à l'échéance n'ouvre rien
       and d.choix = 'accorder'
       and d.portee = 'securite'
       and d.auteur is not null                   -- posée par un fondateur (ops_decision_trancher)
       and d.tranchee_le is not null
       and d.tranchee_le <= d.echeance            -- tranchée après l'échéance : expirée
       and d.tranchee_le > now() - interval '7 days'
  ), false)
$fn$;
revoke all on function public.contenu_accord_valide(uuid, text) from public, anon, authenticated;
grant execute on function public.contenu_accord_valide(uuid, text) to service_role;
comment on function public.contenu_accord_valide(uuid, text) is
  'Vrai seulement si la décision est tranchee (pas defaut_applique), choix accorder, portée securite, tranchée par un fondateur, avant son échéance, il y a moins de 7 jours, et de clé exactement égale à la cible (026-206).';

-- Le verdict d'une publication : NULL si elle peut sortir maintenant, sinon le code du premier obstacle.
create or replace function public.contenu_verdict_post(p public.contenu_posts)
returns text
language plpgsql
stable
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  v_l public.contenu_lignes;
  v_vu text;
begin
  if not public.contenu_accord_valide(p.accord_decision_id, 'contenu:post:' || p.id || ':' || p.empreinte) then
    return 'accord';
  end if;
  select * into v_l from public.contenu_lignes l where l.id = p.ligne_id;
  if not found or v_l.approuvee_le is null then return 'ligne_fermee'; end if;
  if not (p.canal = any (v_l.canaux)) then return 'canal'; end if;
  if exists (select 1 from public.contenu_suspensions s where s.ligne_id = p.ligne_id and s.levee_le is null and s.agent in ('*', p.agent)) then
    return 'suspendue';
  end if;
  if not public.contenu_affirmations_passent(p.affirmations) then return 'affirmation'; end if;
  v_vu := concat_ws(' ', p.texte, p.legende, p.sous_titres, p.miniature_texte, p.description);
  if v_vu ~ '[0-9]' and jsonb_array_length(p.affirmations) = 0 and not p.chiffres_neutres then return 'chiffre'; end if;
  return null;
end
$fn$;
revoke all on function public.contenu_verdict_post(public.contenu_posts) from public, anon, authenticated;
grant execute on function public.contenu_verdict_post(public.contenu_posts) to service_role;
comment on function public.contenu_verdict_post(public.contenu_posts) is
  'NULL si la publication peut sortir ; sinon accord, ligne_fermee, canal, suspendue, affirmation ou chiffre (chiffre visible sans affirmation sourcée ni attestation chiffres_neutres). Ne déduit jamais l''autorisation d''un score (026-206).';

-- ── Les déclencheurs : la garde tient même pour une écriture directe ─────────────────────────
create or replace function public.contenu_lignes_garde()
returns trigger
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
begin
  new.empreinte := encode(sha256(convert_to(concat_ws('|', 'v1', new.id, new.libelle, new.utm_campagne,
    (select string_agg(c, ',' order by c) from unnest(new.canaux) c)), 'UTF8')), 'hex');
  if tg_op = 'INSERT' then
    new.approuvee_le := null; new.approbation_decision_id := null; new.approbation_cible := null;
  elsif old.approuvee_le is not null and new.approuvee_le is not null then
    -- une approbation posée ne se réécrit pas ; si la définition change, elle tombe
    if new.empreinte <> old.empreinte then
      new.approuvee_le := null; new.approbation_decision_id := null; new.approbation_cible := null;
    else
      new.approuvee_le := old.approuvee_le; new.approbation_decision_id := old.approbation_decision_id; new.approbation_cible := old.approbation_cible;
    end if;
  elsif old.approuvee_le is null and new.approuvee_le is not null then
    if new.empreinte <> old.empreinte
       or not public.contenu_accord_valide(new.approbation_decision_id, 'contenu:ligne:' || new.id || ':' || new.empreinte) then
      raise exception using message = 'contenu:accord', errcode = 'P0001';
    end if;
    new.approbation_cible := 'contenu:ligne:' || new.id || ':' || new.empreinte;
  end if;
  return new;
end
$fn$;
revoke all on function public.contenu_lignes_garde() from public, anon, authenticated, service_role;
drop trigger if exists contenu_lignes_garde on public.contenu_lignes;
create trigger contenu_lignes_garde before insert or update on public.contenu_lignes
  for each row execute function public.contenu_lignes_garde();

create or replace function public.contenu_posts_garde()
returns trigger
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  v_verdict text;
  v_cible text;
begin
  if tg_op = 'DELETE' then
    if old.statut in ('publiable', 'publie') or old.preuve_publique is not null then
      raise exception using message = 'contenu:preuve_conservee', errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'publie' then
    raise exception using message = 'contenu:publie_fige', errcode = 'P0001';
  end if;
  new.empreinte := public.contenu_empreinte(new.canal, new.texte, new.legende, new.sous_titres, new.miniature_texte, new.description, new.rendu_empreinte);
  v_cible := 'contenu:post:' || new.id || ':' || new.empreinte;
  if tg_op = 'INSERT' then
    if new.statut not in ('brouillon', 'en_attente') then
      raise exception using message = 'contenu:transition', errcode = 'P0001';
    end if;
    return new;
  end if;
  -- publication déjà accordée : retouchée, l'accord tombe (retour en attente) ; sinon l'accord posé ne se réécrit pas
  if old.statut = 'publiable' and new.statut in ('publiable', 'publie') then
    if new.statut = 'publiable' and new.empreinte <> old.empreinte then
      new.statut := 'en_attente'; new.accord_decision_id := null; new.accord_cible := null; new.accord_le := null;
    else
      new.accord_decision_id := old.accord_decision_id; new.accord_cible := old.accord_cible; new.accord_le := old.accord_le;
    end if;
  end if;
  if new.statut in ('brouillon', 'en_attente') then
    new.accord_decision_id := null; new.accord_cible := null; new.accord_le := null;
  end if;
  if new.statut is distinct from old.statut
     and (old.statut, new.statut) not in (('brouillon', 'en_attente'), ('brouillon', 'refuse'), ('en_attente', 'brouillon'),
         ('en_attente', 'publiable'), ('en_attente', 'refuse'), ('publiable', 'publie'), ('publiable', 'en_attente'), ('publiable', 'refuse')) then
    raise exception using message = 'contenu:transition', errcode = 'P0001';
  end if;
  if new.statut = 'publiable' and old.statut <> 'publiable' then
    v_verdict := public.contenu_verdict_post(new);
    if v_verdict is not null then
      raise exception using message = 'contenu:' || v_verdict, errcode = 'P0001';
    end if;
    new.accord_cible := v_cible;
    new.accord_le := now();
  elsif new.statut = 'publie' then
    -- publier n'est pas un accord neuf : l'accord posé doit viser encore exactement ce texte et ce rendu
    if new.accord_cible is distinct from v_cible then
      raise exception using message = 'contenu:accord', errcode = 'P0001';
    end if;
    new.publie_le := coalesce(new.publie_le, now());
    new.preuve_le := coalesce(new.preuve_le, now());
  end if;
  return new;
end
$fn$;
revoke all on function public.contenu_posts_garde() from public, anon, authenticated, service_role;
drop trigger if exists contenu_posts_garde on public.contenu_posts;
create trigger contenu_posts_garde before insert or update or delete on public.contenu_posts
  for each row execute function public.contenu_posts_garde();

create or replace function public.contenu_suspensions_garde()
returns trigger
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception using message = 'contenu:ajout_seul', errcode = 'P0001';
  end if;
  if (new.id, new.ligne_id, new.agent, new.motif, new.posee_par, new.posee_le)
     is distinct from (old.id, old.ligne_id, old.agent, old.motif, old.posee_par, old.posee_le) then
    raise exception using message = 'contenu:suspension_figee', errcode = 'P0001';
  end if;
  if old.levee_le is not null then
    if (new.levee_le, new.levee_decision_id) is distinct from (old.levee_le, old.levee_decision_id) then
      raise exception using message = 'contenu:suspension_figee', errcode = 'P0001';
    end if;
  elsif new.levee_le is not null
        and not public.contenu_accord_valide(new.levee_decision_id, 'contenu:reprise:' || new.id) then
    raise exception using message = 'contenu:accord', errcode = 'P0001';
  end if;
  return new;
end
$fn$;
revoke all on function public.contenu_suspensions_garde() from public, anon, authenticated, service_role;
drop trigger if exists contenu_suspensions_garde on public.contenu_suspensions;
create trigger contenu_suspensions_garde before update or delete on public.contenu_suspensions
  for each row execute function public.contenu_suspensions_garde();

create or replace function public.contenu_mesures_garde()
returns trigger
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  v_publie timestamptz;
  v_statut text;
  v_delai interval;
begin
  if tg_op = 'DELETE' then
    raise exception using message = 'contenu:ajout_seul', errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    if old.etat = 'mesure'
       or (new.post_id, new.echeance, new.metrique) is distinct from (old.post_id, old.echeance, old.metrique) then
      raise exception using message = 'contenu:mesure_figee', errcode = 'P0001';
    end if;
  end if;
  select p.statut, p.publie_le into v_statut, v_publie from public.contenu_posts p where p.id = new.post_id;
  if v_statut is distinct from 'publie' then
    raise exception using message = 'contenu:post_non_publie', errcode = 'P0001';
  end if;
  -- une mesure « mesurée » ne précède pas son échéance
  v_delai := case new.echeance when 'H+1' then interval '1 hour' when 'H+24' then interval '24 hours' else interval '7 days' end;
  if new.etat = 'mesure' and new.mesure_le < v_publie + v_delai then
    raise exception using message = 'contenu:mesure_trop_tot', errcode = 'P0001';
  end if;
  return new;
end
$fn$;
revoke all on function public.contenu_mesures_garde() from public, anon, authenticated, service_role;
drop trigger if exists contenu_mesures_garde on public.contenu_mesures;
create trigger contenu_mesures_garde before insert or update or delete on public.contenu_mesures
  for each row execute function public.contenu_mesures_garde();

-- ── Les fonctions du contenu (service_role seulement) ────────────────────────────────────────
-- Ouvre une publication : la décision du bus doit être valable pour CETTE version exacte (le déclencheur juge).
create or replace function public.contenu_post_ouvrir(p_post uuid, p_decision uuid)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
begin
  update public.contenu_posts set accord_decision_id = p_decision, statut = 'publiable'
   where id = p_post and statut = 'en_attente';
  if not found then
    raise exception using message = 'contenu:transition', errcode = 'P0001';
  end if;
  perform public.contenu_journal('contenu_accord', 'contenu_post:' || p_post, 'publication ouverte par accord individuel, décision ' || p_decision);
end
$fn$;
revoke all on function public.contenu_post_ouvrir(uuid, uuid) from public, anon, authenticated;
grant execute on function public.contenu_post_ouvrir(uuid, uuid) to service_role;
comment on function public.contenu_post_ouvrir(uuid, uuid) is
  'en_attente -> publiable si la décision est tranchee/accorder/securite, non expirée, de cible exacte (contenu:post:<id>:<empreinte>) ; sinon contenu:accord et rien ne bouge (026-206). Journal contenu_accord.';

-- Le verdict maintenant : « ok » ou le code de l'obstacle ; à relire juste avant de publier (accord expiré, suspension).
create or replace function public.contenu_post_verdict(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  p public.contenu_posts;
begin
  select * into p from public.contenu_posts x where x.id = p_id;
  if not found then return 'absente'; end if;
  if p.statut <> 'publiable' then return 'statut'; end if;
  return coalesce(public.contenu_verdict_post(p), 'ok');
end
$fn$;
revoke all on function public.contenu_post_verdict(uuid) from public, anon, authenticated;
grant execute on function public.contenu_post_verdict(uuid) to service_role;
comment on function public.contenu_post_verdict(uuid) is
  'ok, ou absente, statut, accord, ligne_fermee, canal, suspendue, affirmation, chiffre : à relire juste avant « Publier » (026-206).';

create or replace function public.contenu_post_peut_publier(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $fn$
  select public.contenu_post_verdict(p_id) = 'ok'
$fn$;
revoke all on function public.contenu_post_peut_publier(uuid) from public, anon, authenticated;
grant execute on function public.contenu_post_peut_publier(uuid) to service_role;
comment on function public.contenu_post_peut_publier(uuid) is 'Vrai seulement si contenu_post_verdict rend ok maintenant (026-206).';

-- Approuve une ligne : décision tranchee/accorder/securite sur contenu:ligne:<id>:<empreinte>. N'ouvre aucune publication.
create or replace function public.contenu_ligne_approuver(p_ligne text, p_decision uuid)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
begin
  update public.contenu_lignes set approuvee_le = now(), approbation_decision_id = p_decision
   where id = p_ligne and approuvee_le is null;
  if not found then
    raise exception using message = 'contenu:ligne', errcode = 'P0001';
  end if;
  perform public.contenu_journal('contenu_ligne', 'contenu_ligne:' || p_ligne, 'ligne approuvée par décision ' || p_decision || ' ; aucune publication n''est ouverte');
end
$fn$;
revoke all on function public.contenu_ligne_approuver(text, uuid) from public, anon, authenticated;
grant execute on function public.contenu_ligne_approuver(text, uuid) to service_role;
comment on function public.contenu_ligne_approuver(text, uuid) is
  'Approuve une ligne proposée par une décision valable pour sa version exacte (contenu:ligne:<id>:<empreinte>) ; sinon contenu:accord. Une ligne approuvée n''autorise jamais une publication seule (026-206).';

-- Suspend une ligne pour un agent (ou '*' pour tous) ; sans effet sur les publications ni sur leurs preuves. Sens sûr : sans accord.
create or replace function public.contenu_suspendre(p_ligne text, p_agent text, p_motif text, p_par text)
returns uuid
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.contenu_lignes l where l.id = p_ligne) then
    raise exception using message = 'contenu:ligne', errcode = 'P0001';
  end if;
  insert into public.contenu_suspensions (ligne_id, agent, motif, posee_par)
  values (p_ligne, p_agent, p_motif, p_par)
  on conflict (ligne_id, agent) where levee_le is null do nothing
  returning id into v_id;
  if v_id is null then
    select s.id into v_id from public.contenu_suspensions s where s.ligne_id = p_ligne and s.agent = p_agent and s.levee_le is null;
    return v_id;
  end if;
  perform public.contenu_journal('contenu_suspension', 'contenu_ligne:' || p_ligne, 'ligne suspendue pour ' || p_agent || ' par ' || p_par);
  return v_id;
end
$fn$;
revoke all on function public.contenu_suspendre(text, text, text, text) from public, anon, authenticated;
grant execute on function public.contenu_suspendre(text, text, text, text) to service_role;
comment on function public.contenu_suspendre(text, text, text, text) is
  'Pose (ou rend) la suspension active d''une ligne pour un agent ou pour * ; rejouable ; n''efface ni ne modifie aucune publication ni preuve (026-206).';

-- Lève une suspension : le sens risqué, il exige une décision tranchee/accorder/securite sur contenu:reprise:<id>.
create or replace function public.contenu_reprendre(p_suspension uuid, p_decision uuid)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
begin
  update public.contenu_suspensions set levee_le = now(), levee_decision_id = p_decision
   where id = p_suspension and levee_le is null;
  if not found then
    raise exception using message = 'contenu:suspension', errcode = 'P0001';
  end if;
  perform public.contenu_journal('contenu_reprise', 'contenu_suspension:' || p_suspension, 'suspension levée par décision ' || p_decision);
end
$fn$;
revoke all on function public.contenu_reprendre(uuid, uuid) from public, anon, authenticated;
grant execute on function public.contenu_reprendre(uuid, uuid) to service_role;
comment on function public.contenu_reprendre(uuid, uuid) is
  'Lève une suspension active si la décision est valable pour contenu:reprise:<id> ; sinon contenu:accord et la suspension reste (026-206).';

-- Purge les idées nominatives de veille échues (30 jours au plus) ; rend le nombre de lignes retirées.
create or replace function public.contenu_veille_purger()
returns integer
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $fn$
declare
  v_n integer;
begin
  delete from public.contenu_idees where nominative and expire_le < now();
  get diagnostics v_n = row_count;
  return v_n;
end
$fn$;
revoke all on function public.contenu_veille_purger() from public, anon, authenticated;
grant execute on function public.contenu_veille_purger() to service_role;
comment on function public.contenu_veille_purger() is 'Retire les idées nominatives de veille dont expire_le est passé (30 jours au plus) ; rend leur nombre (026-206).';

-- ── Les cinq lignes et les quatre comptes (aucune approuvée : l'approbation est un geste de Benj) ──
insert into public.contenu_lignes (id, libelle, canaux, utm_campagne) values
  ('L1', 'Ton site en 20 secondes', array['tiktok', 'instagram', 'facebook'], 'ligne-l1'),
  ('L2', 'La question du métier', array['tiktok', 'instagram', 'facebook'], 'ligne-l2'),
  ('L3', 'Ce que fait vraiment le logiciel', array['tiktok', 'instagram', 'facebook'], 'ligne-l3'),
  ('L4', 'Une boîte tenue par des agents', array['tiktok'], 'ligne-l4'),
  ('L5', 'Un fait Presti', array['instagram', 'facebook', 'linkedin'], 'ligne-l5')
on conflict (id) do nothing;

insert into public.contenu_comptes (reseau, code_apport) values
  ('tiktok', 'tiktok'), ('instagram', 'instagram'), ('facebook', 'facebook'), ('linkedin', 'linkedin')
on conflict (reseau) do nothing;

-- ── Fermé au public ──────────────────────────────────────────────────────────────────────────
alter table public.contenu_lignes enable row level security;
alter table public.contenu_comptes enable row level security;
alter table public.contenu_posts enable row level security;
alter table public.contenu_mesures enable row level security;
alter table public.contenu_suspensions enable row level security;
alter table public.contenu_idees enable row level security;

revoke all on public.contenu_lignes, public.contenu_comptes, public.contenu_posts, public.contenu_mesures, public.contenu_suspensions, public.contenu_idees from public, anon, authenticated;
grant select on public.contenu_lignes, public.contenu_comptes, public.contenu_posts, public.contenu_mesures, public.contenu_suspensions, public.contenu_idees to authenticated;

drop policy if exists contenu_lignes_lecture on public.contenu_lignes;
create policy contenu_lignes_lecture on public.contenu_lignes for select to authenticated using (public.is_founder());
drop policy if exists contenu_comptes_lecture on public.contenu_comptes;
create policy contenu_comptes_lecture on public.contenu_comptes for select to authenticated using (public.is_founder());
drop policy if exists contenu_posts_lecture on public.contenu_posts;
create policy contenu_posts_lecture on public.contenu_posts for select to authenticated using (public.is_founder());
drop policy if exists contenu_mesures_lecture on public.contenu_mesures;
create policy contenu_mesures_lecture on public.contenu_mesures for select to authenticated using (public.is_founder());
drop policy if exists contenu_suspensions_lecture on public.contenu_suspensions;
create policy contenu_suspensions_lecture on public.contenu_suspensions for select to authenticated using (public.is_founder());
drop policy if exists contenu_idees_lecture on public.contenu_idees;
create policy contenu_idees_lecture on public.contenu_idees for select to authenticated using (public.is_founder());

comment on table public.contenu_lignes is 'Les cinq lignes éditoriales L1 à L5, campagne UTM en liste fermée ; approuvée seulement par une décision du bus (026-206).';
comment on table public.contenu_comptes is 'Un compte par réseau : code d''apport et lien de bio unique ; jamais un code par ligne (026-206).';
comment on table public.contenu_posts is 'Une publication : texte exact, sources des affirmations, rendu, preuve publique et accord individuel de Benj ; fermée tant que l''accord n''est pas valable (026-206).';
comment on table public.contenu_mesures is 'Mesures H+1, H+24, J+7 par métrique, avec leur provenance ; non mesuré n''est jamais zéro ; ventes et demandes = estimations (026-206).';
comment on table public.contenu_suspensions is 'Suspensions par ligne et par agent, en ajout seul ; les lever exige un accord (026-206).';
comment on table public.contenu_idees is 'Banque d''idées notée par du code, avec provenance ; la veille nominative expire à 30 jours (026-206).';
