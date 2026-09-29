do $essai$
declare
  F uuid; k integer; s uuid; D_L2 text; D_P text;
  d1 uuid; d2 uuid; d3 uuid; d5 uuid; d6 uuid; d7 uuid; d8 uuid; d9 uuid; d10 uuid; d11 uuid; d12 uuid; d13 uuid; d14 uuid; d15 uuid; d16 uuid; d17 uuid; d18 uuid; dx uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid; p9 uuid; p10 uuid; p11 uuid; p12 uuid; p13 uuid;
begin
  create temp table essai_r (n text, ok boolean, m text) on commit drop;
  create function pg_temp.t(nom text, ok boolean, m text default null) returns void language sql as $t$ insert into essai_r values (nom, ok, m) $t$;
  create function pg_temp.x(nom text, attendu text, m text, etat text) returns void language sql as $t$ insert into essai_r values (nom, m like '%' || attendu || '%' or (attendu ~ '^[0-9]+$' and etat like attendu || '%'), m) $t$;
  create function pg_temp.d(cle text, choix text default 'accorder', portee text default 'securite', defaut text default 'refuser') returns uuid language plpgsql as $t$ declare v uuid; f uuid; begin select id into f from public.artisans where is_founder limit 1; select c.id into v from public.ops_decision_creer('crieur', 'Essai 026-206 : accorder ?', null, '[{"cle":"accorder","libelle":"Accorder","recommandee":false},{"cle":"refuser","libelle":"Refuser","recommandee":true}]'::jsonb, defaut, null, portee, now() + interval '2 days', cle, null) c; if choix is not null then perform public.ops_decision_trancher(v, choix, f); end if; return v; end $t$;
  create function pg_temp.np(ligne text, canal text, agent text, texte text, rendu text, h text, aff text, neutres boolean, statut text) returns uuid language plpgsql as $t$ declare v uuid; begin insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte, affirmations, chiffres_neutres, statut) values (ligne, canal, agent, texte, rendu, case when rendu = 'texte' then null else repeat(h, 64) end, aff::jsonb, neutres, statut) returning id into v; return v; end $t$;
  execute $migration$-- ============================================================================================
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
$migration$;
  select id into F from public.artisans where is_founder limit 1;
  perform pg_temp.t('fondateur réel disponible (pour trancher par le vrai chemin)', F is not null);
  begin perform pg_temp.t('cinq lignes L1-L5, aucune approuvée', coalesce((select count(*) = 5 and count(*) filter (where approuvee_le is null) = 5 from public.contenu_lignes), false)); exception when others then perform pg_temp.t('cinq lignes L1-L5, aucune approuvée', false, sqlerrm); end;
  begin perform pg_temp.t('campagnes UTM ligne-l1..l5 distinctes et propres à la ligne', coalesce((select count(distinct utm_campagne) = 5 and bool_and(utm_campagne = 'ligne-' || lower(id)) from public.contenu_lignes), false)); exception when others then perform pg_temp.t('campagnes UTM ligne-l1..l5 distinctes et propres à la ligne', false, sqlerrm); end;
  begin perform pg_temp.t('un compte par réseau, un lien de bio par compte', coalesce((select count(*) = 4 and count(distinct lien_bio) = 4 and bool_and(lien_bio = 'https://prestiapp.fr/a/' || code_apport) from public.contenu_comptes), false)); exception when others then perform pg_temp.t('un compte par réseau, un lien de bio par compte', false, sqlerrm); end;
  begin insert into public.contenu_lignes (id, libelle, canaux, utm_campagne) values ('L1', 'x y z', array['tiktok'], 'lot-20x20'); perform pg_temp.t('campagne hors liste refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('campagne hors liste refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_comptes (reseau, code_apport) values ('tiktok', 'AB'); perform pg_temp.t('code d’apport mal formé refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('code d’apport mal formé refusé', '23', sqlerrm, sqlstate); end;
  d1 := pg_temp.d('contenu:ligne:L2:autre', 'accorder', 'securite');
  begin perform public.contenu_ligne_approuver('L2', d1); perform pg_temp.t('ligne : décision de mauvaise cible refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('ligne : décision de mauvaise cible refusée', 'contenu:accord', sqlerrm, sqlstate); end;
  D_L2 := 'contenu:ligne:L2:' || (select empreinte from public.contenu_lignes where id = 'L2');
  d2 := pg_temp.d(D_L2, 'refuser', 'securite');
  begin perform public.contenu_ligne_approuver('L2', d2); perform pg_temp.t('ligne : choix refuser n’approuve pas', false, 'aucune erreur'); exception when others then perform pg_temp.x('ligne : choix refuser n’approuve pas', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':refus' where id = d2;
  d3 := pg_temp.d(D_L2, 'accorder', 'securite');
  begin perform public.contenu_ligne_approuver('L2', d3); perform pg_temp.t('ligne : décision valable, L2 approuvée', true); exception when others then perform pg_temp.t('ligne : décision valable, L2 approuvée', false, sqlerrm); end;
  begin perform pg_temp.t('ligne L2 approuvée, L1 toujours fermée', coalesce((select (select approuvee_le is not null from public.contenu_lignes where id = 'L2') and (select approuvee_le is null from public.contenu_lignes where id = 'L1')), false)); exception when others then perform pg_temp.t('ligne L2 approuvée, L1 toujours fermée', false, sqlerrm); end;
  begin update public.contenu_lignes set libelle = 'La question du métier, bis' where id = 'L2'; perform pg_temp.t('ligne : retoucher la définition', true); exception when others then perform pg_temp.t('ligne : retoucher la définition', false, sqlerrm); end;
  begin perform pg_temp.t('ligne : approbation caduque après retouche', coalesce((select approuvee_le is null and approbation_decision_id is null from public.contenu_lignes where id = 'L2'), false)); exception when others then perform pg_temp.t('ligne : approbation caduque après retouche', false, sqlerrm); end;
  begin perform public.contenu_ligne_approuver('L2', d3); perform pg_temp.t('ligne : l’ancienne décision ne rouvre pas la version retouchée', false, 'aucune erreur'); exception when others then perform pg_temp.x('ligne : l’ancienne décision ne rouvre pas la version retouchée', 'contenu:accord', sqlerrm, sqlstate); end;
  begin update public.contenu_lignes set libelle = 'La question du métier' where id = 'L2'; perform public.contenu_ligne_approuver('L2', d3); perform pg_temp.t('ligne : retour à la définition exacte, la décision d’origine vaut encore', true); exception when others then perform pg_temp.t('ligne : retour à la définition exacte, la décision d’origine vaut encore', false, sqlerrm); end;
  begin perform pg_temp.t('ligne L2 de nouveau approuvée', coalesce((select approuvee_le is not null from public.contenu_lignes where id = 'L2'), false)); exception when others then perform pg_temp.t('ligne L2 de nouveau approuvée', false, sqlerrm); end;
  p1 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Une question qui appuie là où ça fait mal', 'video', 'a', '[]', false, 'en_attente');
  begin perform pg_temp.t('publication : le déclencheur pose une empreinte sha256', coalesce((select empreinte ~ '^[0-9a-f]{64}$' from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('publication : le déclencheur pose une empreinte sha256', false, sqlerrm); end;
  begin update public.contenu_posts set statut = 'publiable' where id = p1; perform pg_temp.t('publication : sans accord, même ligne approuvée, elle reste fermée', false, 'aucune erreur'); exception when others then perform pg_temp.x('publication : sans accord, même ligne approuvée, elle reste fermée', 'contenu:accord', sqlerrm, sqlstate); end;
  begin perform public.contenu_post_ouvrir(p1, null); perform pg_temp.t('publication : ouvrir sans décision refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('publication : ouvrir sans décision refusé', 'contenu:accord', sqlerrm, sqlstate); end;
  D_P := ('contenu:post:' || p1 || ':' || (select empreinte from public.contenu_posts where id = p1));
  d5 := pg_temp.d(D_P, 'refuser', 'securite');
  begin perform public.contenu_post_ouvrir(p1, d5); perform pg_temp.t('accord : choix refuser n’ouvre rien', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : choix refuser n’ouvre rien', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':refus' where id = d5;
  d6 := pg_temp.d(D_P || ':2', 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p1, d6); perform pg_temp.t('accord : autre cible (suffixe) n’ouvre rien', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : autre cible (suffixe) n’ouvre rien', 'contenu:accord', sqlerrm, sqlstate); end;
  d7 := pg_temp.d(D_P, null, 'securite', 'accorder');
  update ops.decisions set echeance = now() - interval '1 minute' where id = d7;
  perform public.ops_decisions_echues();
  update ops.decisions set auteur = F, echeance = now() + interval '1 day' where id = d7;
  begin perform pg_temp.t('défaut appliqué (défaut = accorder, l’échéance a passé) : statut defaut_applique', coalesce((select statut = 'defaut_applique' and choix = 'accorder' from ops.decisions where id = d7), false)); exception when others then perform pg_temp.t('défaut appliqué (défaut = accorder, l’échéance a passé) : statut defaut_applique', false, sqlerrm); end;
  begin perform public.contenu_post_ouvrir(p1, d7); perform pg_temp.t('accord : un défaut appliqué à l’échéance n’ouvre rien', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : un défaut appliqué à l’échéance n’ouvre rien', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':defaut' where id = d7;
  d8 := pg_temp.d(D_P, 'accorder', 'argent');
  begin perform public.contenu_post_ouvrir(p1, d8); perform pg_temp.t('accord : portée argent n’ouvre rien', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : portée argent n’ouvre rien', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':argent' where id = d8;
  d9 := pg_temp.d(D_P, 'accorder', 'securite');
  update ops.decisions set tranchee_le = now() - interval '8 days' where id = d9;
  begin perform public.contenu_post_ouvrir(p1, d9); perform pg_temp.t('accord : décision de plus de 7 jours expirée', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : décision de plus de 7 jours expirée', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':vieux' where id = d9;
  d10 := pg_temp.d(D_P, 'accorder', 'securite');
  update ops.decisions set echeance = now() - interval '1 hour' where id = d10;
  begin perform public.contenu_post_ouvrir(p1, d10); perform pg_temp.t('accord : tranchée après son échéance, expirée', false, 'aucune erreur'); exception when others then perform pg_temp.x('accord : tranchée après son échéance, expirée', 'contenu:accord', sqlerrm, sqlstate); end;
  update ops.decisions set cle_idempotence = cle_idempotence || ':tard' where id = d10;
  begin perform pg_temp.t('rien ne s’est ouvert pendant les refus', coalesce((select statut = 'en_attente' and accord_decision_id is null from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('rien ne s’est ouvert pendant les refus', false, sqlerrm); end;
  d11 := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p1, d11); perform pg_temp.t('accord valable pour cette version exacte : ouvre', true); exception when others then perform pg_temp.t('accord valable pour cette version exacte : ouvre', false, sqlerrm); end;
  begin perform pg_temp.t('publiable, cible et date d’accord posées', coalesce((select statut = 'publiable' and accord_cible = D_P and accord_le is not null and accord_decision_id = d11 from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('publiable, cible et date d’accord posées', false, sqlerrm); end;
  begin perform pg_temp.t('verdict ok et peut_publier', coalesce((select public.contenu_post_verdict(p1) = 'ok' and public.contenu_post_peut_publier(p1)), false)); exception when others then perform pg_temp.t('verdict ok et peut_publier', false, sqlerrm); end;
  p2 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Deuxième question du métier', 'video', 'b', '[]', false, 'brouillon');
  begin update public.contenu_posts set statut = 'publiable', accord_decision_id = d11 where id = p2; perform pg_temp.t('transition brouillon -> publiable interdite', false, 'aucune erreur'); exception when others then perform pg_temp.x('transition brouillon -> publiable interdite', 'contenu:transition', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte, statut, accord_decision_id, accord_cible, accord_le) values ('L2', 'tiktok', 'fabrique', 'x y', 'video', repeat('c', 64), 'publiable', d11, 'k', now()); perform pg_temp.t('insertion directe en publiable interdite', false, 'aucune erreur'); exception when others then perform pg_temp.x('insertion directe en publiable interdite', 'contenu:transition', sqlerrm, sqlstate); end;
  begin update public.contenu_posts set texte = 'Une question qui appuie là où ça fait mal, retouchée' where id = p1; perform pg_temp.t('retouche du texte d’une publication accordée', true); exception when others then perform pg_temp.t('retouche du texte d’une publication accordée', false, sqlerrm); end;
  begin perform pg_temp.t('retouche : retour en attente, accord effacé', coalesce((select statut = 'en_attente' and accord_decision_id is null and accord_cible is null from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('retouche : retour en attente, accord effacé', false, sqlerrm); end;
  begin perform public.contenu_post_ouvrir(p1, d11); perform pg_temp.t('retouche : l’ancien accord ne vaut plus pour la nouvelle version', false, 'aucune erreur'); exception when others then perform pg_temp.x('retouche : l’ancien accord ne vaut plus pour la nouvelle version', 'contenu:accord', sqlerrm, sqlstate); end;
  begin update public.contenu_posts set sous_titres = 'Promesse cachée dans un sous-titre' where id = p1; perform pg_temp.t('retouche des sous-titres incrustés : l’empreinte change aussi', true); exception when others then perform pg_temp.t('retouche des sous-titres incrustés : l’empreinte change aussi', false, sqlerrm); end;
  D_P := ('contenu:post:' || p1 || ':' || (select empreinte from public.contenu_posts where id = p1));
  d12 := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p1, d12); perform pg_temp.t('nouvel accord sur la version retouchée', true); exception when others then perform pg_temp.t('nouvel accord sur la version retouchée', false, sqlerrm); end;
  begin update public.contenu_posts set statut = 'publie' where id = p1; perform pg_temp.t('publier sans preuve publique refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('publier sans preuve publique refusé', '23', sqlerrm, sqlstate); end;
  begin update public.contenu_posts set statut = 'publie', preuve_publique = 'https://exemple.presti-test.invalid/v/essai1' where id = p1; perform pg_temp.t('publier avec preuve publique', true); exception when others then perform pg_temp.t('publier avec preuve publique', false, sqlerrm); end;
  begin perform pg_temp.t('publié : date et preuve posées', coalesce((select statut = 'publie' and publie_le is not null and preuve_le is not null from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('publié : date et preuve posées', false, sqlerrm); end;
  begin update public.contenu_posts set texte = 'autre chose' where id = p1; perform pg_temp.t('publié : figé (texte)', false, 'aucune erreur'); exception when others then perform pg_temp.x('publié : figé (texte)', 'contenu:publie_fige', sqlerrm, sqlstate); end;
  begin delete from public.contenu_posts where id = p1; perform pg_temp.t('publié : la preuve ne s’efface pas (delete)', false, 'aucune erreur'); exception when others then perform pg_temp.x('publié : la preuve ne s’efface pas (delete)', 'contenu:preuve_conservee', sqlerrm, sqlstate); end;
  p3 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Troisième question du métier', 'video', 'c', '[]', false, 'en_attente');
  D_P := ('contenu:post:' || p3 || ':' || (select empreinte from public.contenu_posts where id = p3));
  d13 := pg_temp.d(D_P, 'accorder', 'securite');
  s := public.contenu_suspendre('L2', 'fabrique', 'essai de suspension', 'boucle');
  begin perform pg_temp.t('suspension : une ligne active, rejouable sans doublon', coalesce((select s is not null and public.contenu_suspendre('L2', 'fabrique', 'essai de suspension', 'boucle') = s and (select count(*) from public.contenu_suspensions where ligne_id = 'L2' and levee_le is null) = 1), false)); exception when others then perform pg_temp.t('suspension : une ligne active, rejouable sans doublon', false, sqlerrm); end;
  begin perform public.contenu_post_ouvrir(p3, d13); perform pg_temp.t('suspension : la publication de cet agent reste fermée', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : la publication de cet agent reste fermée', 'contenu:suspendue', sqlerrm, sqlstate); end;
  begin perform pg_temp.t('suspension : la preuve de la publication déjà en ligne est intacte', coalesce((select preuve_publique is not null and statut = 'publie' from public.contenu_posts where id = p1), false)); exception when others then perform pg_temp.t('suspension : la preuve de la publication déjà en ligne est intacte', false, sqlerrm); end;
  p4 := pg_temp.np('L2', 'tiktok', 'mesureur', 'Question par un autre agent', 'video', 'd', '[]', false, 'en_attente');
  D_P := ('contenu:post:' || p4 || ':' || (select empreinte from public.contenu_posts where id = p4));
  d14 := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p4, d14); perform pg_temp.t('suspension d’un agent : un autre agent n’est pas bloqué', true); exception when others then perform pg_temp.t('suspension d’un agent : un autre agent n’est pas bloqué', false, sqlerrm); end;
  begin perform public.contenu_reprendre(s, null); perform pg_temp.t('suspension : la lever sans décision refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : la lever sans décision refusé', 'contenu:accord', sqlerrm, sqlstate); end;
  begin update public.contenu_suspensions set motif = 'autre' where id = s; perform pg_temp.t('suspension : ligne et motif figés', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : ligne et motif figés', 'contenu:suspension_figee', sqlerrm, sqlstate); end;
  begin delete from public.contenu_suspensions where id = s; perform pg_temp.t('suspension : jamais effacée', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : jamais effacée', 'contenu:ajout_seul', sqlerrm, sqlstate); end;
  d15 := pg_temp.d('contenu:reprise:' || s, 'accorder', 'securite');
  begin perform public.contenu_reprendre(s, d15); perform pg_temp.t('suspension : levée par une décision sur sa cible', true); exception when others then perform pg_temp.t('suspension : levée par une décision sur sa cible', false, sqlerrm); end;
  begin perform pg_temp.t('suspension levée, plus aucune active', coalesce((select (select count(*) from public.contenu_suspensions where levee_le is null) = 0 and (select levee_le is not null from public.contenu_suspensions where id = s)), false)); exception when others then perform pg_temp.t('suspension levée, plus aucune active', false, sqlerrm); end;
  begin perform public.contenu_post_ouvrir(p3, d13); perform pg_temp.t('après la reprise, la publication s’ouvre', true); exception when others then perform pg_temp.t('après la reprise, la publication s’ouvre', false, sqlerrm); end;
  perform public.contenu_suspendre('L2', '*', 'arrêt général de la ligne', 'benj');
  begin perform pg_temp.t('suspension générale * : verdict suspendue pour tout agent', coalesce((select public.contenu_post_verdict(p3) = 'suspendue' and public.contenu_post_verdict(p4) = 'suspendue'), false)); exception when others then perform pg_temp.t('suspension générale * : verdict suspendue pour tout agent', false, sqlerrm); end;
  begin perform public.contenu_suspendre('L2', 'A B', 'x', 'boucle'); perform pg_temp.t('suspension : agent mal formé refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : agent mal formé refusé', '23', sqlerrm, sqlstate); end;
  begin perform public.contenu_suspendre('L9', 'fabrique', 'x', 'boucle'); perform pg_temp.t('suspension : ligne inconnue refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('suspension : ligne inconnue refusée', 'contenu:ligne', sqlerrm, sqlstate); end;
  p5 := pg_temp.np('L1', 'tiktok', 'fabrique', 'Ligne pas encore approuvée', 'video', 'e', '[]', false, 'en_attente');
  D_P := ('contenu:post:' || p5 || ':' || (select empreinte from public.contenu_posts where id = p5));
  d16 := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p5, d16); perform pg_temp.t('ligne non approuvée : publication fermée malgré l’accord individuel', false, 'aucune erreur'); exception when others then perform pg_temp.x('ligne non approuvée : publication fermée malgré l’accord individuel', 'contenu:ligne_fermee', sqlerrm, sqlstate); end;
  p6 := pg_temp.np('L2', 'linkedin', 'fabrique', 'Un texte pour LinkedIn hors canaux de L2', 'texte', 'a', '[]', false, 'en_attente');
  D_P := ('contenu:post:' || p6 || ':' || (select empreinte from public.contenu_posts where id = p6));
  d17 := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p6, d17); perform pg_temp.t('canal hors de la ligne refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('canal hors de la ligne refusé', 'contenu:canal', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte) values ('L2', 'tiktok', 'fabrique', 'Troisième question du métier', 'video', repeat('c', 64)); perform pg_temp.t('doublon exact sur le même réseau refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('doublon exact sur le même réseau refusé', '23505', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte) values ('L2', 'tiktok', 'fabrique', 'texte seul sur TikTok'); perform pg_temp.t('TikTok sans vidéo refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('TikTok sans vidéo refusé', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type) values ('L2', 'instagram', 'fabrique', 'film sans empreinte', 'video'); perform pg_temp.t('vidéo sans empreinte de film refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('vidéo sans empreinte de film refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte, affirmations) values ('L2', 'facebook', 'fabrique', 'x y z', '"oui"'::jsonb); perform pg_temp.t('affirmations mal formées (pas un tableau) refusées', false, 'aucune erreur'); exception when others then perform pg_temp.x('affirmations mal formées (pas un tableau) refusées', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_posts (ligne_id, canal, agent, texte, affirmations) values ('L2', 'facebook', 'fabrique', 'x y z', '[{"texte":"fait","verdict":"pass","probabilite":0.9,"le":"2026-09-29"}]'::jsonb); perform pg_temp.t('affirmation sans source refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('affirmation sans source refusée', '23', sqlerrm, sqlstate); end;
  s := (select id from public.contenu_suspensions where ligne_id = 'L2' and agent = '*' and levee_le is null);
  d18 := pg_temp.d('contenu:reprise:' || s, 'accorder', 'securite');
  begin perform public.contenu_reprendre(s, d18); perform pg_temp.t('reprise de la suspension générale', true); exception when others then perform pg_temp.t('reprise de la suspension générale', false, sqlerrm); end;
  p7 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Ton site en 20 secondes', 'video', 'f', '[]', false, 'en_attente');
  D_P := ('contenu:post:' || p7 || ':' || (select empreinte from public.contenu_posts where id = p7));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p7, dx); perform pg_temp.t('chiffre visible sans affirmation sourcée : fermé', false, 'aucune erreur'); exception when others then perform pg_temp.x('chiffre visible sans affirmation sourcée : fermé', 'contenu:chiffre', sqlerrm, sqlstate); end;
  p8 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Ton site en 20 secondes, version deux', 'video', '1', '[]', true, 'en_attente');
  D_P := ('contenu:post:' || p8 || ':' || (select empreinte from public.contenu_posts where id = p8));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p8, dx); perform pg_temp.t('chiffre neutre attesté (durée du film) : ouvert', true); exception when others then perform pg_temp.t('chiffre neutre attesté (durée du film) : ouvert', false, sqlerrm); end;
  p9 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Réponse prête en moins d’une minute', 'video', '2', '[{"texte":"réponse prête en moins d une minute","source_ref":"lib/crieur/faits.ts#reponse-rapide","verdict":"refus","probabilite":0.2,"le":"2026-09-29"}]', false, 'en_attente');
  D_P := ('contenu:post:' || p9 || ':' || (select empreinte from public.contenu_posts where id = p9));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p9, dx); perform pg_temp.t('affirmation refusée par Laya : fermé', false, 'aucune erreur'); exception when others then perform pg_temp.x('affirmation refusée par Laya : fermé', 'contenu:affirmation', sqlerrm, sqlstate); end;
  p10 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Réponse prête en moins d’une minute, bis', 'video', '3', '[{"texte":"réponse prête en moins d une minute","source_ref":"lib/crieur/faits.ts","verdict":"indisponible","probabilite":null,"le":"2026-09-29"}]', false, 'en_attente');
  D_P := ('contenu:post:' || p10 || ':' || (select empreinte from public.contenu_posts where id = p10));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p10, dx); perform pg_temp.t('affirmation, Laya indisponible (panne) : fermé', false, 'aucune erreur'); exception when others then perform pg_temp.x('affirmation, Laya indisponible (panne) : fermé', 'contenu:affirmation', sqlerrm, sqlstate); end;
  p11 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Réponse prête en moins d’une minute, ter', 'video', '4', '[{"texte":"réponse prête en moins d une minute","source_ref":"lib/crieur/faits.ts#reponse-rapide","verdict":"pass","probabilite":0.4,"le":"2026-09-29"}]', false, 'en_attente');
  D_P := ('contenu:post:' || p11 || ':' || (select empreinte from public.contenu_posts where id = p11));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p11, dx); perform pg_temp.t('affirmation pass mais probabilité 0,4 : fermé', false, 'aucune erreur'); exception when others then perform pg_temp.x('affirmation pass mais probabilité 0,4 : fermé', 'contenu:affirmation', sqlerrm, sqlstate); end;
  p12 := pg_temp.np('L2', 'tiktok', 'fabrique', 'Réponse prête en moins d’une minute, quater', 'video', '5', '[{"texte":"réponse prête en moins d une minute","source_ref":"lib/crieur/faits.ts#reponse-rapide","verdict":"pass","probabilite":0.7,"le":"2026-09-29"}]', false, 'en_attente');
  D_P := ('contenu:post:' || p12 || ':' || (select empreinte from public.contenu_posts where id = p12));
  dx := pg_temp.d(D_P, 'accorder', 'securite');
  begin perform public.contenu_post_ouvrir(p12, dx); perform pg_temp.t('affirmation pass, probabilité 0,7, sourcée : ouvert', true); exception when others then perform pg_temp.t('affirmation pass, probabilité 0,7, sourcée : ouvert', false, sqlerrm); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p3, 'H+1', 'vues', 'mesure', 10, 'releve_main'); perform pg_temp.t('mesure : publication non publiée refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : publication non publiée refusée', 'contenu:post_non_publie', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p1, 'H+1', 'vues', 'mesure', 10, 'releve_main'); perform pg_temp.t('mesure : avant l’échéance refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : avant l’échéance refusée', 'contenu:mesure_trop_tot', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, mesure_le) values (p1, 'H+1', 'vues', 'mesure', 10, 'releve_main', now() + interval '2 hours'); perform pg_temp.t('mesure : H+1 relevée à la main après une heure', true); exception when others then perform pg_temp.t('mesure : H+1 relevée à la main après une heure', false, sqlerrm); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p1, 'H+24', 'vues', 'non_mesure', 0, 'api_officielle'); perform pg_temp.t('mesure : non mesuré ne porte jamais un zéro', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : non mesuré ne porte jamais un zéro', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+24', 'vues', 'non_mesure', 'api_officielle'); perform pg_temp.t('mesure : API indisponible = non mesuré, sans valeur', true); exception when others then perform pg_temp.t('mesure : API indisponible = non mesuré, sans valeur', false, sqlerrm); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, source, mesure_le) values (p1, 'J+7', 'vues', 'mesure', 'api_officielle', now() + interval '8 days'); perform pg_temp.t('mesure : « mesurée » sans valeur refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : « mesurée » sans valeur refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+1', 'vues', 'en_attente', 'api_officielle'); perform pg_temp.t('mesure : doublon (post, échéance, métrique) refusé', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : doublon (post, échéance, métrique) refusé', '23505', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+2', 'vues', 'en_attente', 'api_officielle'); perform pg_temp.t('mesure : échéance inconnue refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : échéance inconnue refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'mesure', now() + interval '8 days'); perform pg_temp.t('mesure : ventes affichées comme certaines refusées', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : ventes affichées comme certaines refusées', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'estimation', now() + interval '8 days'); perform pg_temp.t('mesure : ventes estimées sans fenêtre refusées', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : ventes estimées sans fenêtre refusées', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, fenetre_attribution_h, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'api_officielle', 'estimation', 48, now() + interval '8 days'); perform pg_temp.t('mesure : ventes d’une source de réseau refusées (provenance incohérente)', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : ventes d’une source de réseau refusées (provenance incohérente)', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, fenetre_attribution_h, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'estimation', 48, now() + interval '8 days'); perform pg_temp.t('mesure : ventes estimées par fenêtre de 48 h, source base Presti', true); exception when others then perform pg_temp.t('mesure : ventes estimées par fenêtre de 48 h, source base Presti', false, sqlerrm); end;
  begin insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, mesure_le) values (p1, 'J+7', 'visites', 'mesure', 3, 'releve_main', now() + interval '8 days'); perform pg_temp.t('mesure : les visites viennent de l’Audience maison', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : les visites viennent de l’Audience maison', '23', sqlerrm, sqlstate); end;
  begin update public.contenu_mesures set valeur = 999 where post_id = p1 and echeance = 'H+1' and metrique = 'vues'; perform pg_temp.t('mesure : une valeur mesurée ne se réécrit pas', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : une valeur mesurée ne se réécrit pas', 'contenu:mesure_figee', sqlerrm, sqlstate); end;
  begin delete from public.contenu_mesures where post_id = p1; perform pg_temp.t('mesure : jamais effacée', false, 'aucune erreur'); exception when others then perform pg_temp.x('mesure : jamais effacée', 'contenu:ajout_seul', sqlerrm, sqlstate); end;
  begin update public.contenu_mesures set etat = 'mesure', valeur = 55, source = 'releve_main', mesure_le = now() + interval '2 days' where post_id = p1 and echeance = 'H+24' and metrique = 'vues'; perform pg_temp.t('mesure : « non mesuré » peut devenir mesuré plus tard', true); exception when others then perform pg_temp.t('mesure : « non mesuré » peut devenir mesuré plus tard', false, sqlerrm); end;
  begin insert into public.contenu_idees (ligne_id, texte, source, origine, score) values ('L2', 'une question sur les devis en retard', 'plans/accroches-par-metier.md', 'douleur', 60); perform pg_temp.t('idée : provenance et note', true); exception when others then perform pg_temp.t('idée : provenance et note', false, sqlerrm); end;
  begin insert into public.contenu_idees (texte, source, origine) values ('idée sans source', '', 'veille'); perform pg_temp.t('idée : sans provenance refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('idée : sans provenance refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_idees (texte, source, origine, score) values ('idée notée trop haut', 'docs/x.md', 'veille', 101); perform pg_temp.t('idée : note hors 0-100 refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('idée : note hors 0-100 refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_idees (texte, source, origine, nominative) values ('idée de veille nominative', 'veille du jour', 'veille', true); perform pg_temp.t('idée nominative sans expiration refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('idée nominative sans expiration refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_idees (texte, source, origine, nominative, expire_le) values ('idée de veille nominative', 'veille du jour', 'veille', true, now() + interval '31 days'); perform pg_temp.t('idée nominative expirant à 31 jours refusée', false, 'aucune erreur'); exception when others then perform pg_temp.x('idée nominative expirant à 31 jours refusée', '23', sqlerrm, sqlstate); end;
  begin insert into public.contenu_idees (texte, source, origine, nominative, expire_le) values ('idée de veille nominative', 'veille du jour', 'veille', true, now() + interval '30 days'); perform pg_temp.t('idée nominative à 30 jours acceptée', true); exception when others then perform pg_temp.t('idée nominative à 30 jours acceptée', false, sqlerrm); end;
  begin insert into public.contenu_idees (texte, source, origine, nominative, expire_le, cree_le) values ('idée échue', 'veille ancienne', 'veille', true, now() - interval '10 days', now() - interval '40 days'); perform pg_temp.t('idée nominative déjà échue (posée il y a 40 jours)', true); exception when others then perform pg_temp.t('idée nominative déjà échue (posée il y a 40 jours)', false, sqlerrm); end;
  k := public.contenu_veille_purger();
  begin perform pg_temp.t('purge de la veille : 1 échue retirée, la valide et la non nominative restent', coalesce((select k = 1 and (select count(*) from public.contenu_idees) = 2), false)); exception when others then perform pg_temp.t('purge de la veille : 1 échue retirée, la valide et la non nominative restent', false, sqlerrm); end;
  begin perform pg_temp.t('RLS active sur les six tables', coalesce((select count(*) = 6 and bool_and(relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace and relname in ('contenu_lignes','contenu_comptes','contenu_posts','contenu_mesures','contenu_suspensions','contenu_idees')), false)); exception when others then perform pg_temp.t('RLS active sur les six tables', false, sqlerrm); end;
  begin perform pg_temp.t('aucune politique d’écriture', coalesce((select count(*) = 0 from pg_policies where tablename like 'contenu_%' and cmd <> 'SELECT'), false)); exception when others then perform pg_temp.t('aucune politique d’écriture', false, sqlerrm); end;
  begin perform pg_temp.t('anon et PUBLIC n’ont aucun droit de table', coalesce((select not exists (select 1 from information_schema.role_table_grants where table_name like 'contenu_%' and table_schema = 'public' and grantee in ('anon','PUBLIC'))), false)); exception when others then perform pg_temp.t('anon et PUBLIC n’ont aucun droit de table', false, sqlerrm); end;
  begin perform pg_temp.t('authenticated : SELECT seulement', coalesce((select not exists (select 1 from information_schema.role_table_grants where table_name like 'contenu_%' and table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT')), false)); exception when others then perform pg_temp.t('authenticated : SELECT seulement', false, sqlerrm); end;
  begin perform pg_temp.t('fonctions du contenu : service_role seulement (ni anon, ni authenticated), privées sans exécuteur', coalesce((select count(*) > 0 and not bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) and bool_and(case when p.proname in ('contenu_journal','contenu_lignes_garde','contenu_posts_garde','contenu_suspensions_garde','contenu_mesures_garde') then not has_function_privilege('service_role', p.oid, 'execute') else has_function_privilege('service_role', p.oid, 'execute') end) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'contenu_%'), false)); exception when others then perform pg_temp.t('fonctions du contenu : service_role seulement (ni anon, ni authenticated), privées sans exécuteur', false, sqlerrm); end;
  begin
    set local role anon;
    perform 1 from public.contenu_posts limit 1;
    reset role; perform pg_temp.t('anon : lecture refusée', false);
  exception when others then reset role; perform pg_temp.t('anon : lecture refusée', sqlstate = '42501', sqlerrm);
  end;
  begin
    set local role anon;
    perform public.contenu_post_ouvrir(p3, d13);
    reset role; perform pg_temp.t('anon : fonction du contenu refusée', false);
  exception when others then reset role; perform pg_temp.t('anon : fonction du contenu refusée', sqlstate = '42501', sqlerrm);
  end;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true); set local role authenticated;
    select count(*) into k from public.contenu_posts;
    reset role; perform pg_temp.t('authenticated non fondateur : ne voit aucune ligne', k = 0);
  exception when others then reset role; perform pg_temp.t('authenticated non fondateur : ne voit aucune ligne', false, sqlerrm);
  end;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', F, 'role', 'authenticated')::text, true); set local role authenticated;
    select count(*) into k from public.contenu_posts;
    reset role; perform pg_temp.t('authenticated fondateur : lit les publications', k > 0);
  exception when others then reset role; perform pg_temp.t('authenticated fondateur : lit les publications', false, sqlerrm);
  end;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', F, 'role', 'authenticated')::text, true); set local role authenticated;
    update public.contenu_posts set statut = 'refuse' where id = p3;
    reset role; perform pg_temp.t('authenticated fondateur : écriture refusée', false);
  exception when others then reset role; perform pg_temp.t('authenticated fondateur : écriture refusée', sqlstate = '42501', sqlerrm);
  end;
  begin
    set local role service_role;
    insert into public.contenu_posts (ligne_id, canal, agent, texte) values ('L2', 'facebook', 'fabrique', 'Écriture directe de service_role') returning id into p13; update public.contenu_posts set statut = 'publiable' where id = p13;
    reset role; perform pg_temp.t('service_role : écriture directe ne contourne pas la garde', false);
  exception when others then reset role; perform pg_temp.t('service_role : écriture directe ne contourne pas la garde', sqlerrm like '%contenu:transition%', sqlerrm);
  end;
  begin
    set local role service_role;
    perform public.contenu_post_verdict(p3);
    reset role; perform pg_temp.t('service_role : appelle les fonctions du contenu', true);
  exception when others then reset role; perform pg_temp.t('service_role : appelle les fonctions du contenu', false, sqlerrm);
  end;
  begin perform pg_temp.t('le journal du bus a reçu les gestes (accord, ligne, suspension, reprise)', coalesce((select count(distinct type) = 4 from ops.evenements where type in ('contenu_accord','contenu_ligne','contenu_suspension','contenu_reprise')), false)); exception when others then perform pg_temp.t('le journal du bus a reçu les gestes (accord, ligne, suspension, reprise)', false, sqlerrm); end;
  raise exception 'ESSAI_A_SEC %', (select jsonb_build_object('total', count(*), 'ko', count(*) filter (where not ok), 'echecs', coalesce(jsonb_agg(jsonb_build_object('n', n, 'm', m)) filter (where not ok), '[]'::jsonb)) from essai_r)::text;
end
$essai$;
