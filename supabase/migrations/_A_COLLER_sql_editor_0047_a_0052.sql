-- Presti — migrations 0047 → 0052 à coller TELLES QUELLES dans Supabase → SQL Editor → Run.
-- Générées le 04/09/2026 09:35. Chaque bloc est rejouable (if not exists / or replace).


-- ═══════════════════════════ 0047_aide ═══════════════════════════
-- 0047 — Système d'explication (sprint J-1 §4 B3) : mémoire des visites guidées.
--
-- `aide_vues` liste ce que l'artisan a déjà vu (ex : 'visite:console'). C'est ce qui fait
-- que la visite guidée se lance à la première ouverture et pas à la seconde, sur tous
-- ses appareils — et qu'il peut la rejouer depuis le panneau « ? » sans que ça la
-- relance partout.
--
-- Choix : un tableau de texte plutôt qu'une table dédiée. La liste tient en quelques
-- entrées, n'est jamais filtrée ni jointe (donc pas d'index), et s'écrit en un seul
-- `update` depuis le navigateur — avec repli localStorage côté client si la base ne
-- répond pas. Une colonne NON sensible : elle n'entre volontairement PAS dans
-- `lock_artisan_privileges()` (0045/0051), l'artisan doit pouvoir l'écrire lui-même.

alter table public.artisans
  add column if not exists aide_vues text[] not null default '{}';

comment on column public.artisans.aide_vues is
  'Repères d''aide déjà vus par l''artisan (ex : visite:console). Écrit par le navigateur via la RLS artisan_update_own ; non sensible, hors du verrou de privilèges.';

-- Garde-fou de taille : la colonne est écrivable depuis le navigateur, elle ne doit pas
-- pouvoir servir de stockage libre (schema-constraints). 64 repères de 60 caractères, c'est
-- déjà dix fois ce que le produit utilisera.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artisans_aide_vues_taille') then
    alter table public.artisans
      add constraint artisans_aide_vues_taille
      check (cardinality(aide_vues) <= 64 and length(array_to_string(aide_vues, ',')) <= 4000);
  end if;
end $$;


-- ═══════════════════════════ 0048_inventaire_v2 ═══════════════════════════
-- Sprint J-1 §8 F1 + F2 — Inventaire v2 : fiche matériau complète, fournisseurs de
-- l'artisan, historique des prix vus.
--
-- Vocabulaire : lib/inventaire/CONTEXT.md (matériau / fournisseur / observation de prix).
--
-- Règle juridique (plan §8, art. L342-1 CPI) : une OBSERVATION DE PRIX appartient à
-- l'artisan qui l'a demandée. Aucune lecture croisée, aucune agrégation : la RLS de
-- `prix_observations` est par artisan, et il n'existe aucune vue ni fonction qui la
-- contourne. On ne constitue pas de base de prix — on garde la trace de ce que CET
-- artisan a vu, pour lui seul.

-- ── F2. Mes fournisseurs ─────────────────────────────────────────────────────────
create table if not exists public.fournisseurs (
  id             uuid primary key default gen_random_uuid(),
  artisan_id     uuid not null references public.artisans(id) on delete cascade,
  nom            text not null,
  url            text,
  type           text not null default 'negoce' check (type in ('negoce', 'gsb', 'fabricant', 'marketplace')),
  numero_compte  text,
  remise_pct     numeric(5,2) check (remise_pct is null or (remise_pct >= 0 and remise_pct <= 100)),
  delai_jours    smallint check (delai_jours is null or delai_jours >= 0),
  agence         text,
  contact        text,
  -- Ordre de préférence : c'est lui qui trie les résultats de recherche à prix égal.
  ordre          smallint not null default 0,
  -- Le site affiche-t-il ses prix sans compte ? Vérifié par curl (docs/fournisseurs.md),
  -- jamais supposé. À false, l'assistant ne peut voir que le catalogue.
  prix_publics   boolean not null default false,
  note_acces     text,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);
create index if not exists fournisseurs_artisan_ordre_idx on public.fournisseurs(artisan_id, ordre);
-- Un même fournisseur une seule fois chez un artisan : c'est ce qui rend la « liste de
-- départ » idempotente même si deux clics partent en même temps.
create unique index if not exists fournisseurs_artisan_nom_idx on public.fournisseurs(artisan_id, lower(nom));

-- ── F1. Fiche matériau complète ──────────────────────────────────────────────────
-- Colonnes déjà présentes (0040) : nom, marque, reference, categorie, unite, code_barres,
-- fournisseur_prefere (texte libre, conservé pour l'ancien écran), prix_dernier_ht (dernier
-- prix PAYÉ, posé par les mouvements d'entrée), prix_moyen_ht, seuil_alerte, photo_url, notes.
alter table public.materiaux
  add column if not exists reference_fabricant   text,
  add column if not exists reference_fournisseur text,
  add column if not exists sous_categorie        text,
  add column if not exists conditionnement       text,
  add column if not exists fiche_technique_url   text,
  add column if not exists fournisseur_id        uuid references public.fournisseurs(id) on delete set null,
  -- Prix d'achat : ce que l'artisan paie réellement (négocié). Distinct du dernier prix
  -- payé (mouvement) et du prix vu (observation publique).
  add column if not exists prix_achat_ht         numeric(12,2) check (prix_achat_ht is null or prix_achat_ht >= 0),
  -- Prix vu : copie de la DERNIÈRE observation, pour lister sans jointure. L'historique
  -- complet est dans prix_observations.
  add column if not exists prix_vu_ht            numeric(12,2) check (prix_vu_ht is null or prix_vu_ht >= 0),
  add column if not exists prix_vu_le            timestamptz,
  add column if not exists prix_vu_url           text,
  add column if not exists prix_vu_source        text check (prix_vu_source is null or prix_vu_source in ('recherche_ia', 'saisie', 'facture')),
  add column if not exists disponibilite_vue     text,
  add column if not exists tags                  text[] not null default '{}',
  -- Chantiers = devis acceptés (choix 0040 : pas de table chantiers). Pas de FK sur un
  -- tableau ; l'API vérifie que chaque devis appartient à l'artisan.
  add column if not exists chantiers_lies        uuid[] not null default '{}';
create index if not exists materiaux_fournisseur_idx on public.materiaux(fournisseur_id) where fournisseur_id is not null;
create index if not exists materiaux_categorie_idx on public.materiaux(artisan_id, categorie);

-- ── Historique des prix vus ──────────────────────────────────────────────────────
create table if not exists public.prix_observations (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  materiau_id      uuid references public.materiaux(id) on delete cascade,
  fournisseur_id   uuid references public.fournisseurs(id) on delete set null,
  -- Nom du fournisseur figé au moment de l'observation : si la fiche fournisseur est
  -- supprimée, l'observation garde son sens.
  fournisseur_nom  text,
  designation_vue  text,
  prix_ht          numeric(12,2) check (prix_ht is null or prix_ht >= 0),
  prix_ttc         numeric(12,2) check (prix_ttc is null or prix_ttc >= 0),
  unite            text,
  url              text,
  source           text not null check (source in ('recherche_ia', 'saisie', 'facture')),
  -- Ce que l'assistant (ou l'artisan) a VU, cité — jamais reformulé (1-2 lignes).
  extrait          text,
  disponibilite    text,
  vu_le            timestamptz not null default now(),
  cree_le          timestamptz not null default now()
);
create index if not exists prix_obs_materiau_idx on public.prix_observations(materiau_id, vu_le desc);
create index if not exists prix_obs_artisan_idx on public.prix_observations(artisan_id, vu_le desc);

-- ── RLS : chacun ne voit que le sien. Aucune lecture croisée. ────────────────────
alter table public.fournisseurs      enable row level security;
alter table public.prix_observations enable row level security;

drop policy if exists "fournisseurs propres" on public.fournisseurs;
create policy "fournisseurs propres" on public.fournisseurs for all
  to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);

drop policy if exists "observations propres" on public.prix_observations;
create policy "observations propres" on public.prix_observations for all
  to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);

-- Cohérence : une observation ne peut pointer que vers un matériau ou un fournisseur du
-- même artisan (la RLS protège la lecture, ceci protège l'écriture — y compris via la
-- clé de service, que les routes utilisent).
create or replace function public.verifier_observation_artisan()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  if new.materiau_id is not null and not exists (
    select 1 from materiaux m where m.id = new.materiau_id and m.artisan_id = new.artisan_id
  ) then raise exception 'Materiau d un autre artisan'; end if;
  if new.fournisseur_id is not null and not exists (
    select 1 from fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id
  ) then raise exception 'Fournisseur d un autre artisan'; end if;
  return new;
end $fn$;
drop trigger if exists trg_observation_artisan on public.prix_observations;
create trigger trg_observation_artisan
  before insert or update on public.prix_observations
  for each row execute function public.verifier_observation_artisan();

-- Même garde sur materiaux.fournisseur_id.
create or replace function public.verifier_materiau_fournisseur()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  if new.fournisseur_id is not null and not exists (
    select 1 from fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id
  ) then raise exception 'Fournisseur d un autre artisan'; end if;
  return new;
end $fn$;
drop trigger if exists trg_materiau_fournisseur on public.materiaux;
create trigger trg_materiau_fournisseur
  before insert or update of fournisseur_id on public.materiaux
  for each row execute function public.verifier_materiau_fournisseur();

comment on table public.prix_observations is
  'Prix vus par UN artisan, pour lui seul (art. L342-1 CPI : aucune base mutualisee). RLS par artisan, jamais de lecture croisee.';
comment on table public.fournisseurs is
  'Fournisseurs designes par l artisan ; leur liste borne la recherche de prix (section 8 F3).';


-- ═══════════════════════════ 0049_limites_atomiques ═══════════════════════════
-- 0049 — Compteurs de limitation ATOMIQUES (audit v4 §3 : « course sur les compteurs »).
--
-- Le défaut : chaque garde-fou faisait `select count(*)` PUIS `insert`. Douze requêtes
-- lancées en parallèle lisaient toutes « 5 » avant qu'aucune n'ait écrit, et passaient
-- toutes : 11 réponses IA + 11 emails là où 6 étaient permis. Ça coûte de l'argent, et
-- ça relaie des emails. Le correctif est le même que `consume_credit` (0008) : une seule
-- fonction SQL, un seul aller-retour, et c'est le verrou de ligne de Postgres qui
-- sérialise les concurrents — pas le code applicatif.
--
-- Principe : une clé (« leads:ip:1.2.3.4 »), une fenêtre FIXE (le début du créneau de
-- p_fenetre_s secondes qui contient `now()`), un compteur. `insert … on conflict do update
-- … returning` incrémente atomiquement et renvoie le rang de l'appel : il passe si ce
-- rang est ≤ p_max. Exactement p_max appels passent par fenêtre, quel que soit le
-- parallélisme. Fenêtre fixe plutôt que glissante : c'est ce qui rend l'opération
-- atomique en une ligne, et pour un anti-abus c'est équivalent.

create table if not exists public.limites (
  cle        text        not null,
  fenetre    timestamptz not null,           -- début du créneau
  fenetre_s  int         not null default 60, -- longueur du créneau (sert à la purge)
  compteur   int         not null default 0,
  primary key (cle, fenetre)
);
comment on table public.limites is
  'Compteurs anti-abus par clé et par créneau. Écrits uniquement par consommer_limite() (service_role). Aucune donnée personnelle en clair : les emails y entrent hachés.';

-- Jamais lu ni écrit par le navigateur : RLS activée SANS policy, et privilèges retirés.
alter table public.limites enable row level security;
revoke all on public.limites from public, anon, authenticated;

create or replace function public.consommer_limite(p_cle text, p_max int, p_fenetre_s int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int; f timestamptz;
begin
  if p_cle is null or length(p_cle) = 0 or length(p_cle) > 200 then
    raise exception 'consommer_limite : clé invalide';       -- erreur de programmation, pas un cas métier
  end if;
  if p_max is null or p_max < 0 then p_max := 0; end if;
  if p_fenetre_s is null or p_fenetre_s < 1 then p_fenetre_s := 60; end if;

  f := to_timestamp(floor(extract(epoch from now()) / p_fenetre_s) * p_fenetre_s);

  insert into public.limites (cle, fenetre, fenetre_s, compteur)
    values (p_cle, f, p_fenetre_s, 1)
    on conflict (cle, fenetre) do update set compteur = public.limites.compteur + 1
    returning compteur into n;

  -- Purge opportuniste (≈ 1 appel sur 200) : les créneaux terminés depuis plus de 2 jours
  -- ne servent plus à rien. Pas de pg_cron à configurer, pas de table qui enfle.
  if random() < 0.005 then
    delete from public.limites
      where fenetre + make_interval(secs => fenetre_s) < now() - interval '2 days';
  end if;

  return n <= p_max;
end $$;

-- Même règle que consume_credit (0008) : réservée au serveur.
revoke execute on function public.consommer_limite(text, int, int) from public, anon, authenticated;
grant execute on function public.consommer_limite(text, int, int) to service_role;


-- ═══════════════════════════ 0050_pilotage ═══════════════════════════
-- 0050 — Le poste de pilotage de la plateforme (v5 §9 G1).
--
-- Trois choses que l'interface artisan ne pouvait pas faire :
--  1. « Je prends la main » : l'assistant se tait sur CETTE conversation, et le client le voit.
--  2. Une réponse PROPOSÉE par l'assistant, qui attend la validation de l'artisan (mode assisté)
--     — avant, le mode « assistée » était un réglage sans effet dans la conversation.
--  3. Des règles d'automatisation en phrases (qualifié + photo → devis brouillon → notifier →
--     validation → envoi → acceptation → facture d'acompte), avec 4 préréglages.

-- 1. Prise de main, par conversation.
alter table public.leads add column if not exists prise_en_main boolean not null default false;
alter table public.leads add column if not exists prise_en_main_le timestamptz;
comment on column public.leads.prise_en_main is
  'true = l''artisan répond lui-même : l''assistant ne répond plus sur ce fil, le client en est informé.';

-- 2. État d'un message sortant : null = envoyé · 'proposition' = préparé par l'assistant, en attente
--    de validation · 'rejete' = écarté par l'artisan (conservé pour apprendre, jamais montré au client).
alter table public.messages add column if not exists etat text
  check (etat is null or etat in ('proposition', 'rejete'));
-- Le niveau de modèle qui a produit la réponse, pour l'afficher (« répondu avec Pro »).
alter table public.messages add column if not exists modele text;
create index if not exists messages_lead_etat_idx on public.messages (lead_id) where etat = 'proposition';

-- L'artisan valide/rejette ses propositions depuis son navigateur : UPDATE restreint aux
-- messages de SES leads, et seulement sur la colonne etat (le trigger ci-dessous fige le reste).
drop policy if exists message_update_own on public.messages;
create policy message_update_own on public.messages for update
  using (exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid()))
  with check (exists (select 1 from public.leads l where l.id = messages.lead_id and l.artisan_id = auth.uid()));

create or replace function public.messages_figer_contenu()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.lead_id := old.lead_id; new.sens := old.sens; new.type := old.type;
    new.contenu := old.contenu; new.sent_at := old.sent_at; new.canal_id := old.canal_id;
    new.externe_id := old.externe_id; new.modele := old.modele;
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_figer on public.messages;
create trigger trg_messages_figer before update on public.messages
  for each row execute function public.messages_figer_contenu();

-- 3. Règles d'automatisation : une ligne par artisan, des maillons on/off + seuils.
create table if not exists public.regles_automatisation (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  prereglage text not null default 'equilibre' check (prereglage in ('prudent', 'equilibre', 'reactif', 'tout_auto', 'perso')),
  -- { devis_auto: bool, photo_requise: bool, modele: 'standard'|'pro'|'expert', notifier: bool,
  --   validation: bool, envoyer_apres_validation: bool, acompte_pct: number|null }
  maillons jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  maj_le timestamptz default now()
);
alter table public.regles_automatisation enable row level security;
drop policy if exists regles_select_own on public.regles_automatisation;
create policy regles_select_own on public.regles_automatisation for select using (artisan_id = auth.uid());
drop policy if exists regles_upsert_own on public.regles_automatisation;
create policy regles_upsert_own on public.regles_automatisation for insert with check (artisan_id = auth.uid());
drop policy if exists regles_update_own on public.regles_automatisation;
create policy regles_update_own on public.regles_automatisation for update using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());

-- D'où vient un devis : 'manuel' (l'artisan), 'outil' (l'assistant, dans la conversation), 'regle'
-- (une règle d'automatisation). Idempotence : jamais deux devis d'une même origine automatique
-- pour une même conversation — l'index unique tranche, même en rafale.
alter table public.devis add column if not exists source text
  check (source is null or source in ('manuel', 'outil', 'regle'));
create unique index if not exists devis_regle_par_lead_idx on public.devis (lead_id) where source = 'regle';
create unique index if not exists devis_outil_par_lead_idx on public.devis (lead_id) where source = 'outil';


-- ═══════════════════════════ 0051_slug_modifiable ═══════════════════════════
-- 0051 — L'adresse de l'artisan est modifiable, et l'ancienne redirige (v5, demande de Benj).
--
-- Deux garanties :
--  1. Une adresse changée ne casse rien : l'ancien slug est conservé dans `slugs_anciens`
--     et les pages publiques redirigent définitivement (308) vers la nouvelle. Les cartes
--     de visite imprimées avec l'ancien lien continuent de mener au bon endroit.
--  2. Le slug ne se change que par /api/account/slug (validation, mots réservés, unicité,
--     y compris contre les anciens slugs de TOUT LE MONDE — sinon l'artisan B pourrait
--     reprendre l'ancienne adresse de A et récupérer ses clients).

alter table public.artisans add column if not exists slugs_anciens text[] not null default '{}';
create index if not exists artisans_slugs_anciens_idx on public.artisans using gin (slugs_anciens);

comment on column public.artisans.slugs_anciens is
  'Anciennes adresses de cet artisan, conservées pour rediriger (308). Alimenté par trigger, jamais à la main.';

-- Historique automatique : à chaque changement de slug, l'ancien rejoint la liste.
create or replace function public.artisans_slug_historique()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.slug is distinct from old.slug and old.slug is not null then
    new.slugs_anciens := array_remove(array_append(old.slugs_anciens, old.slug), new.slug);
  end if;
  return new;
end $$;

drop trigger if exists trg_artisans_slug_historique on public.artisans;
create trigger trg_artisans_slug_historique
  before update of slug on public.artisans
  for each row execute function public.artisans_slug_historique();

-- Retrouver l'artisan actuel derrière une ancienne adresse (utilisé par les pages publiques).
create or replace function public.artisan_par_ancien_slug(p_slug text)
returns table (slug text, domaine text, domaine_verifie boolean)
language sql stable security definer set search_path = public as $$
  select a.slug, a.domaine, a.domaine_verifie
  from public.artisans a
  where a.slugs_anciens @> array[p_slug]
  limit 1
$$;
revoke all on function public.artisan_par_ancien_slug(text) from public, anon, authenticated;
grant execute on function public.artisan_par_ancien_slug(text) to service_role;

-- Verrou de privilèges : le slug et son historique rejoignent les colonnes que l'artisan ne
-- peut PAS modifier depuis son navigateur. (Sans ça, un `update artisans set slug='www'`
-- contournait la validation et les mots réservés.) Corps complet repris de 0045.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    -- Sécurité : la révocation de sessions ne doit pas pouvoir être annulée par un
    -- jeton volé — sinon « fermer toutes mes sessions » ne protège de rien.
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    -- Domaine personnalisé : réservé à l'offre Signature et vérifié par /api/domain.
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- Adresse : ne se change que par /api/account/slug (0051).
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
  end if;
  return new;
end $$;

comment on function public.lock_artisan_privileges() is
  'Colonnes que l''artisan ne peut PAS modifier depuis son navigateur. ⚠️ Toute nouvelle colonne sensible ajoutée à `artisans` doit être ajoutée ici — c''est l''oubli qui a produit les failles du 2026-09-03.';


-- ═══════════════════════════ 0052_parametres ═══════════════════════════
-- 0052 — Paramètres & compte, niveau Claude (sprint J-1 §6).
--
-- Quatre choses, et rien d'autre :
--  1. `artisans.notifications` : quels emails l'artisan veut recevoir, par type d'événement.
--     Lu par lib/notifications.ts avant CHAQUE envoi à l'artisan. Défaut : tout activé.
--     Écrite par l'artisan lui-même depuis son navigateur (pas une colonne sensible).
--  2. `artisans.suppression_demandee_le` : la suppression du compte a 30 jours de grâce.
--     Posée UNIQUEMENT par /api/account/delete (service_role) — figée côté navigateur,
--     sinon un jeton volé pourrait programmer la disparition d'un compte, ou annuler
--     une suppression que l'artisan a voulue.
--  3. `sessions_de_l_artisan()` : la liste de SES sessions ouvertes (auth.sessions n'est
--     pas exposé à PostgREST). Security definer, mais ne rend que les lignes de auth.uid().
--  4. `revoquer_session_auth(uid, session)` : fermer UNE session. Même principe que
--     `revoquer_sessions_auth` (0043) : on supprime la ligne, la cascade emporte le jeton
--     de rafraîchissement, et GoTrue refuse ensuite le jeton d'accès (session_not_found).

-- 1. Notifications par type d'événement.
alter table public.artisans
  add column if not exists notifications jsonb not null default '{}'::jsonb;

comment on column public.artisans.notifications is
  'Emails que l''artisan veut recevoir, par type : {nouvelle_demande, proposition, devis_accepte} → booléen. Absent = activé. Lu par lib/notifications.ts avant chaque envoi.';

-- 2. Suppression du compte avec 30 jours de grâce.
alter table public.artisans
  add column if not exists suppression_demandee_le timestamptz;

comment on column public.artisans.suppression_demandee_le is
  'Date à laquelle l''artisan a demandé la suppression de son compte. Le compte est purgé 30 jours plus tard par /api/cron/purge-comptes ; tant que la date n''est pas atteinte, l''artisan peut annuler. Posée par le serveur seulement.';

-- Index partiel : le cron ne parcourt que les comptes en attente (quasi aucun).
create index if not exists artisans_suppression_demandee_idx
  on public.artisans (suppression_demandee_le) where suppression_demandee_le is not null;

-- 3. Les sessions ouvertes de l'artisan connecté.
create or replace function public.sessions_de_l_artisan()
returns table (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
language sql
stable
security definer
set search_path = auth, public
as $fn$
  select s.id, s.created_at, s.updated_at, s.user_agent, host(s.ip)
  from auth.sessions s
  where s.user_id = auth.uid()          -- jamais celles d'un autre : auth.uid() est le seul filtre possible
    and auth.uid() is not null
  order by s.updated_at desc nulls last, s.created_at desc
$fn$;

revoke all on function public.sessions_de_l_artisan() from public, anon;
grant execute on function public.sessions_de_l_artisan() to authenticated, service_role;

comment on function public.sessions_de_l_artisan() is
  'Sessions ouvertes de l''utilisateur connecté (Paramètres → Sécurité). Ne rend que les lignes de auth.uid().';

-- 4. Fermer UNE session — réservé au serveur, qui a déjà vérifié le porteur du jeton.
create or replace function public.revoquer_session_auth(p_uid uuid, p_session uuid)
returns integer
language plpgsql
security definer
set search_path = auth, public
as $fn$
declare v_n integer;
begin
  delete from auth.sessions where user_id = p_uid and id = p_session;
  get diagnostics v_n = row_count;
  delete from auth.refresh_tokens where user_id = p_uid::text and session_id = p_session;
  return v_n;
end $fn$;

revoke all on function public.revoquer_session_auth(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoquer_session_auth(uuid, uuid) to service_role;

comment on function public.revoquer_session_auth(uuid, uuid) is
  'Ferme une seule session (Paramètres → Sécurité → révocation unitaire). Appelée par /api/securite/sessions DELETE et par le changement de mot de passe (session de vérification).';

-- Verrou de privilèges : `suppression_demandee_le` rejoint les colonnes figées côté navigateur.
-- Corps complet repris de 0051 — c'est la règle (voir le commentaire de la fonction).
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    -- Sécurité : la révocation de sessions ne doit pas pouvoir être annulée par un
    -- jeton volé — sinon « fermer toutes mes sessions » ne protège de rien.
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    -- Domaine personnalisé : réservé à l'offre Signature et vérifié par /api/domain.
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- Adresse : ne se change que par /api/account/slug (0051).
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    -- Suppression du compte : programmée et annulée par /api/account/delete seulement (0052).
    new.suppression_demandee_le := old.suppression_demandee_le;
  end if;
  return new;
end $$;

comment on function public.lock_artisan_privileges() is
  'Colonnes que l''artisan ne peut PAS modifier depuis son navigateur. ⚠️ Toute nouvelle colonne sensible ajoutée à `artisans` doit être ajoutée ici — c''est l''oubli qui a produit les failles du 2026-09-03.';


-- Vérification finale : ces objets doivent exister.
select 'aide_vues' as objet, count(*) as ok from information_schema.columns where table_name='artisans' and column_name='aide_vues'
union all select 'prix_observations', count(*) from information_schema.tables where table_name='prix_observations'
union all select 'consommer_limite', count(*) from pg_proc where proname='consommer_limite'
union all select 'regles_automatisation', count(*) from information_schema.tables where table_name='regles_automatisation'
union all select 'slugs_anciens', count(*) from information_schema.columns where table_name='artisans' and column_name='slugs_anciens'
union all select 'sessions_de_l_artisan', count(*) from pg_proc where proname='sessions_de_l_artisan';
