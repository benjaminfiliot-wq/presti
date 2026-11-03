-- 0193 · Le système d'agents d'un artisan (prompt 6, prompt 1, lot 036-002) : les connexions chiffrées, le palier et l'interrupteur par
-- département, les compétences, le coût IA par jour, la marque « traité » des événements et la vue étroite des événements à traiter pour n8n.
--
-- ÉTAT : NON APPLIQUÉE. Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle par claude-code (tâche 036-002) ; rien n'a touché la base.
-- Elle attend le « go » écrit de Benj (.claude/rules/securite.md, .claude/rules/migration-production.md).
--
-- Ordre de pose, jamais un autre (on colle PUIS on lève) :
--   1. 0185_automatisation.sql (evenements_metier, sur laquelle 0193 s'appuie), contrôlée ;
--   2. 0192_accuse_reception_n8n.sql, contrôlée ;
--   3. CETTE migration (ou son jumeau _A_COLLER_sql_editor_0193_systeme_agents_NU.sql), puis les contrôles du pied du jumeau, tous au vert ;
--   4. seulement ensuite les drapeaux systemeAgents et connexions (lib/flags.ts), puis les workflows n8n qui lisent ou écrivent ici.
-- Le bloc « prérequis » ci-dessous REFUSE la pose si 0185 ou 0192 manque : l'ordre n'est pas une recommandation.
-- Rejouer 0185 APRÈS 0193 remettrait l'ancienne evenements_metier_coherence (aucune marque ne passerait) : rejouer 0193 ensuite.
-- Essai à sec : AUCUN sur l'hôte des agents (ni PGlite ni Postgres) ; le juge scripts/systeme-agents-schema-qa.mjs la contrôle par lecture
-- du texte et mutants, et la rejoue sous PGlite quand PGLITE_DIR est posé. À faire avant de la coller : l'essai à sec de la session
-- principale (bloc do qui exécute le jumeau puis raise exception, rien ne reste).
--
-- Source : plans/011-cadrage-01-11/p6-signature/premiere-reponse.md § 4 (ligne 036-002), § 2 (A3, A4, A14, B1, D3, E « interrupteur dans
-- Supabase »), § 3.1 (schéma : « connexions chiffrées · departements_reglages · competences · couts_ia_jour · 0193 »), § 5 décision 1 (les
-- autorisations dans Supabase, chiffrées au format v1 de lib/secretBox.ts:21-30, deux secrets : un pour l'app, un pour n8n) ; prompt
-- plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md, partie 0 (§ 0.4 connecteurs, règles « interrupteur général et par
-- département, plafonds de coût par jour ») et prompt 1 (§ 1.3 « Connexions », « Mes départements »).
--
-- 0193 S'APPUIE sur 0185, elle ne la recopie pas : elle réutilise faits_sans_texte, automatisation_maj_le et les gardes de 0138, ajoute UNE
-- colonne à evenements_metier (traite_le) et redéfinit UNE fonction de 0185 (evenements_metier_coherence) pour que cette seule colonne
-- puisse changer : un fait reste un fait, seule sa marque « traité » bouge.
--
-- Règles tenues sur CHAQUE table neuve (comme 0185, l.13-22) :
--   • RLS activée dès la création ; l'artisan ne fait que LIRE ses lignes ((select auth.uid()) = artisan_id) ;
--   • les quatre gardes restrictives de 0138 (garde_session, garde_suspension_ins/_maj/_sup) ;
--   • tout droit retiré à anon ; insert, update, delete, truncate retirés à authenticated : on écrit par la clé de service (route de l'app,
--     ou n8n par l'identifiant « Supabase account », qui passe outre la RLS : CHAQUE requête n8n filtre donc sur artisan_id) ;
--   • connexions : l'artisan lit ses lignes SANS les deux colonnes de secret (droits par colonne : la table entière est retirée à
--     authenticated, puis rendue colonne par colonne) ;
--   • colonnes en français, montants et coûts en entiers calculés par le code, jamais par un modèle ; aucune colonne organization_id ;
--   • toutes les fonctions à search_path vide ; une seule en security definer (evenements_marquer_traites), bornée comme
--     leads_marquer_accuse de 0192.
--
-- Ce que n8n lit et écrit ici :
--   • lit la vue n8n_evenements_a_traiter par le rôle n8n_lecture (0189), comme n8n_accuses_dus (0192:99) : les seules colonnes permises,
--     jamais un texte libre (les faits sont sans texte, 0185) ; marque « traité » par evenements_marquer_traites(compte, ids) ;
--   • lit departements_reglages, competences, connexions (dont secret_n8n, qu'il déchiffre en mémoire avec SA clé, posée par Benj dans le
--     conteneur) et couts_ia_jour par « Supabase account », filtré sur artisan_id ;
--   • écrit couts_ia_appels (un appel de modèle, une ligne, clé unique : « on conflict do nothing ») et l'état d'une connexion (etat,
--     derniere_synchro, motif_erreur) par « Supabase account », filtré sur artisan_id. Jamais secret_app, jamais un réglage de palier.
--
-- Défauts : un département sans ligne vaut « simulation, coupé » (le code lit l'absence comme le défaut) ; une ligne neuve naît
-- « simulation, coupé » ; « ombre » et « reel » ne se posent que par Presti (mise en production compte par compte, p6 § 1.4).
--
-- Retour arrière (dans cet ordre ; aucune donnée existante n'est touchée, hormis la colonne ajoutée à evenements_metier) :
--   drop view if exists public.n8n_evenements_a_traiter;
--   drop function if exists public.evenements_marquer_traites(uuid, uuid[]);
--   drop index if exists public.evenements_metier_a_traiter;
--   alter table public.evenements_metier drop column if exists traite_le;
--   puis rejouer la fonction evenements_metier_coherence de 0185 (0185_automatisation.sql:146-157), qui refuse toute mise à jour ;
--   drop table if exists public.couts_ia_jour;
--   drop table if exists public.couts_ia_appels;
--   drop table if exists public.competences;
--   drop table if exists public.departements_reglages;
--   drop table if exists public.connexions;
--   drop function if exists public.couts_ia_jour_garde();
--   drop function if exists public.departements_reglages_coherence();
--   drop function if exists public.couts_ia_cumuler();
--   drop function if exists public.couts_ia_appels_coherence();
--   drop function if exists public.competences_coherence();
--   drop function if exists public.connexions_coherence();
-- Idempotente : rejouée, elle repose les mêmes objets (create … if not exists, create or replace, drop … if exists).
-- Transaction : celle de scripts/appliquer-migration.mjs (ou du SQL Editor), comme les autres migrations du dépôt.

-- Un verrou qui tarde fait échouer la migration proprement (on la rejoue), au lieu de bloquer les écritures de la production.
set local lock_timeout = '5s';

-- ══ 0. Prérequis : 0185 puis 0192 posées, sinon rien ═══════════════════════════════════════════════════════════════════════════
do $prerequis$
begin
  if to_regclass('public.evenements_metier') is null
     or to_regprocedure('public.faits_sans_texte(jsonb)') is null
     or to_regprocedure('public.automatisation_maj_le()') is null then
    raise exception '0193 : 0185 (evenements_metier, faits_sans_texte, automatisation_maj_le) doit être posée avant';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'leads' and column_name = 'accuse_n8n_le') then
    raise exception '0193 : 0192 (leads.accuse_n8n_le) doit être posée avant';
  end if;
  if to_regprocedure('public.jeton_session_valide()') is null or to_regprocedure('public.compte_non_suspendu()') is null then
    raise exception '0193 : les gardes de 0138 (jeton_session_valide, compte_non_suspendu) manquent';
  end if;
end
$prerequis$;

-- ══ 1. connexions : un compte branché, ses portées, son état, deux secrets chiffrés (décision 1) ═════════════════════════════════
-- secret_app : chiffré par l'app avec CANAUX_KEY (lib/secretBox.ts), lu par l'app seule ; secret_n8n : chiffré par l'app pour n8n, avec
-- la clé propre à n8n, déchiffré par n8n à l'exécution. Format v1.<iv>.<tag>.<données> en base64url (lib/secretBox.ts:21-30) : iv de
-- 12 octets (16 caractères), étiquette GCM de 16 octets (22 caractères). Un secret en clair ne passe pas la contrainte.
-- La base ne voit pas QUELLE clé a chiffré : c'est au code de 036-009 de tenir la séparation. lib/secretBox.ts ne connaît aujourd'hui
-- que CANAUX_KEY ; secret_n8n doit être chiffré avec la clé propre à n8n (jamais CANAUX_KEY, que n8n ne reçoit jamais : il lit
-- secret_app par la clé de service et ne doit pas pouvoir l'ouvrir), et chaque chiffré devrait être lié à sa ligne (id de la
-- connexion en donnée associée GCM) pour qu'un chiffré recopié d'une ligne à l'autre ne s'ouvre pas. Écrit pour 036-009.
create table if not exists public.connexions (
  id                uuid primary key default gen_random_uuid(),
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  fournisseur       text not null check (fournisseur in ('imap', 'gmail', 'outlook', 'google_agenda', 'outlook_agenda', 'google_drive',
                      'onedrive', 'fiche_google', 'whatsapp', 'telegram', 'stripe_artisan')),
  compte_affiche    text check (compte_affiche is null or char_length(btrim(compte_affiche)) between 1 and 254),
  portees           text[] not null default '{}'::text[],
  etat              text not null default 'a_verifier' check (etat in ('a_verifier', 'active', 'expiree', 'retiree', 'erreur')),
  motif_erreur      text check (motif_erreur is null or motif_erreur ~ '^[a-z][a-z0-9_]{1,59}$'),
  verifiee_le       timestamptz,
  derniere_synchro  timestamptz,
  expire_le         timestamptz,
  retiree_le        timestamptz,
  secret_app        text,
  secret_n8n        text,
  acteur_id         uuid,
  cree_le           timestamptz not null default now(),
  maj_le            timestamptz not null default now(),
  -- Chaque portée est un seul mot sans espace : autant de mots que d'éléments (un élément « a b » en ferait deux et serait refusé).
  constraint connexions_portees check (cardinality(portees) <= 40 and array_position(portees, null) is null
    and (cardinality(portees) = 0 or (array_to_string(portees, ' ') ~ '^[A-Za-z0-9_.:/+-]+( [A-Za-z0-9_.:/+-]+)*$'
         and cardinality(string_to_array(array_to_string(portees, ' '), ' ')) = cardinality(portees)))),
  constraint connexions_secret_app_format check (secret_app is null
    or (char_length(secret_app) <= 16384 and secret_app ~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$')),
  constraint connexions_secret_n8n_format check (secret_n8n is null
    or (char_length(secret_n8n) <= 16384 and secret_n8n ~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$')),
  -- Retirer = effacer les jetons (036-009) ; une connexion active a réussi un essai de lecture (C4 : on ne promet qu'après un essai).
  constraint connexions_retiree_sans_secret check (etat <> 'retiree' or (secret_app is null and secret_n8n is null and retiree_le is not null)),
  constraint connexions_active_verifiee check (etat <> 'active' or verifiee_le is not null),
  constraint connexions_erreur_motif check (etat <> 'erreur' or motif_erreur is not null)
);
alter table public.connexions enable row level security;
drop policy if exists connexions_lecture on public.connexions;
create policy connexions_lecture on public.connexions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists connexions_compte on public.connexions (artisan_id);
-- Une seule connexion vivante par compte, fournisseur et compte affiché : rebrancher, c'est retirer puis créer.
create unique index if not exists connexions_vivante_unique on public.connexions (artisan_id, fournisseur, lower(coalesce(compte_affiche, '')))
  where etat <> 'retiree';

-- Une connexion naît « à vérifier » ; le compte, le fournisseur et la naissance ne changent pas ; « retirée » est sans retour et efface
-- les deux secrets d'elle-même (même si l'appelant les oublie).
-- Le format des secrets est vérifié ICI, avant les contraintes : une contrainte refusée recopie la ligne entière dans le détail de
-- l'erreur (« Failing row contains … »), donc un secret arrivé en clair finirait dans un journal. Ce message-ci ne recopie rien.
create or replace function public.connexions_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if (new.secret_app is not null and (char_length(new.secret_app) > 16384
        or new.secret_app !~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$'))
     or (new.secret_n8n is not null and (char_length(new.secret_n8n) > 16384
        or new.secret_n8n !~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$')) then
    raise exception 'connexions : un secret doit arriver chiffré au format v1 (la valeur reçue n''est pas recopiée ici)';
  end if;
  if tg_op = 'INSERT' then
    if new.etat <> 'a_verifier' then
      raise exception 'connexions : une connexion naît a_verifier (reçu : %)', new.etat;
    end if;
    new.cree_le := now();
    new.maj_le := now();
    return new;
  end if;
  if new.id is distinct from old.id or new.artisan_id is distinct from old.artisan_id or new.fournisseur is distinct from old.fournisseur
     or new.cree_le is distinct from old.cree_le then
    raise exception 'connexions : le compte, le fournisseur et la naissance ne changent pas';
  end if;
  if old.etat = 'retiree' then
    raise exception 'connexions : une connexion retirée le reste (en créer une nouvelle)';
  end if;
  if new.etat = 'retiree' then
    new.secret_app := null;
    new.secret_n8n := null;
    new.retiree_le := coalesce(new.retiree_le, now());
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists connexions_coherence on public.connexions;
create trigger connexions_coherence before insert or update on public.connexions
  for each row execute function public.connexions_coherence();

-- ══ 2. departements_reglages : palier, interrupteur et plafonds, par compte et par département ══════════════════════════════════
-- Les sept départements du plan (§ 3.2 : presti-dep-accueil, -devis, -suivi, -facturation, -apres, -operations, -direction), plus « tous »,
-- l'interrupteur général. Le palier effectif d'un département est le plus prudent des deux (le sien, celui de « tous ») : lu par le
-- Cerveau, relu par lib-executer juste avant l'effet. Cette table ne fait que RESTREINDRE ce que l'offre permet (peut(), lib/plans.ts).
create table if not exists public.departements_reglages (
  artisan_id                  uuid not null references public.artisans(id) on delete cascade,
  departement                 text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres',
                                'operations', 'direction')),
  palier                      text not null default 'simulation' check (palier in ('arret', 'simulation', 'ombre', 'reel')),
  en_marche                   boolean not null default false,
  plafond_jour                integer check (plafond_jour is null or plafond_jour between 0 and 500),
  plafond_cout_centimes_jour  bigint check (plafond_cout_centimes_jour is null or plafond_cout_centimes_jour between 0 and 10000000),
  pose_par                    text not null default 'artisan' check (pose_par in ('artisan', 'presti')),
  acteur_id                   uuid,
  cree_le                     timestamptz not null default now(),
  maj_le                      timestamptz not null default now(),
  primary key (artisan_id, departement)
);
alter table public.departements_reglages enable row level security;
drop policy if exists departements_reglages_lecture on public.departements_reglages;
create policy departements_reglages_lecture on public.departements_reglages for select to authenticated
  using ((select auth.uid()) = artisan_id);

-- L'artisan peut toujours arrêter, couper ou revenir en simulation ; l'ombre et le réel se posent compte par compte, par Presti (p6
-- § 1.4). La base ne se fie pas à pose_par, que l'écrivain remplit : une ligne NAÎT en arrêt ou en simulation, et MONTER à l'ombre ou
-- au réel exige un acteur_id qui est un compte fondateur (artisans.is_founder). Ce qui ne change pas de palier (couper l'interrupteur,
-- changer un plafond) passe toujours : l'arrêt ne se bloque jamais. Limite écrite : la clé de service peut tout, cette garde arrête une
-- route ou un workflow qui recopierait un corps de requête, pas un geste délibéré avec la clé.
create or replace function public.departements_reglages_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    if new.palier not in ('arret', 'simulation') then
      raise exception 'departements_reglages : un département naît en arrêt ou en simulation (reçu : %)', new.palier;
    end if;
    new.cree_le := now();
    new.maj_le := now();
    return new;
  end if;
  if new.artisan_id is distinct from old.artisan_id or new.departement is distinct from old.departement or new.cree_le is distinct from old.cree_le then
    raise exception 'departements_reglages : le compte, le département et la naissance ne changent pas';
  end if;
  if new.palier in ('ombre', 'reel') and new.palier is distinct from old.palier then
    if new.acteur_id is null or not exists (select 1 from public.artisans a where a.id = new.acteur_id and a.is_founder) then
      raise exception 'departements_reglages : l''ombre et le réel se posent par Presti (acteur fondateur), jamais par l''artisan';
    end if;
    new.pose_par := 'presti';
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists departements_reglages_maj_le on public.departements_reglages;
drop trigger if exists departements_reglages_coherence on public.departements_reglages;
create trigger departements_reglages_coherence before insert or update on public.departements_reglages
  for each row execute function public.departements_reglages_coherence();

-- ══ 3. competences : le dossier de consignes de chaque département (A4, B1, B2) ══════════════════════════════════════════════════
-- Une compétence = un document pas à pas, consigne de l'agent ET spécification du workflow. Une version ne se réécrit pas : un texte
-- neuf est une version neuve ; une seule version active par (compte, département, clé). Naît inactive (un brouillon se relit).
-- Jamais une donnée de client dans le corps (règle du code qui écrit, comme les faits de 0185) : ce sont les procédures de l'artisan.
create table if not exists public.competences (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  departement  text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction')),
  cle          text not null check (cle ~ '^[a-z][a-z0-9_]{1,59}$'),
  titre        text not null check (char_length(btrim(titre)) between 1 and 120),
  corps        text not null check (char_length(btrim(corps)) between 1 and 8000),
  version      smallint not null default 1 check (version between 1 and 999),
  actif        boolean not null default false,
  pose_par     text not null default 'artisan' check (pose_par in ('artisan', 'presti')),
  acteur_id    uuid,
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  constraint competences_version_unique unique (artisan_id, departement, cle, version)
);
alter table public.competences enable row level security;
drop policy if exists competences_lecture on public.competences;
create policy competences_lecture on public.competences for select to authenticated
  using ((select auth.uid()) = artisan_id);
create unique index if not exists competences_active_unique on public.competences (artisan_id, departement, cle) where actif;

create or replace function public.competences_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    if new.actif then
      raise exception 'competences : une compétence naît inactive (un brouillon se relit avant de servir)';
    end if;
    new.cree_le := now();
    new.maj_le := now();
    return new;
  end if;
  if new.id is distinct from old.id or new.artisan_id is distinct from old.artisan_id or new.departement is distinct from old.departement
     or new.cle is distinct from old.cle or new.version is distinct from old.version or new.titre is distinct from old.titre
     or new.corps is distinct from old.corps or new.cree_le is distinct from old.cree_le then
    raise exception 'competences : une version ne se réécrit pas (en poser une nouvelle) ; seul « actif » change';
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists competences_coherence on public.competences;
create trigger competences_coherence before insert or update on public.competences
  for each row execute function public.competences_coherence();

-- ══ 4. couts_ia_appels et couts_ia_jour : ce que coûte l'IA, par compte et par jour (D3, A14) ════════════════════════════════════
-- Un appel de modèle = une ligne de couts_ia_appels, unique par (artisan_id, cle) : rejoué après un plantage, il ne compte pas deux fois
-- (« on conflict do nothing » ; un upsert « do update » est REFUSÉ, l'appel ne se réécrit pas). Chaque ligne neuve s'ajoute au cumul
-- du jour (couts_ia_jour), par compte, jour de Paris, département (le plafond de coût est par département) et modèle. Le
-- coût est calculé par le CODE (jetons × tarif daté), jamais par un modèle, en millièmes de centime (un appel court coûte moins d'un
-- centime : l'arrondir à l'appel le ferait disparaître) ; le cumul du jour en centimes est arrondi au centime supérieur.
-- externe : vrai si le modèle ne tourne pas sur Oracle (le compteur de ce qui part vers un modèle externe, A14) ; vrai par défaut : un
-- appel qu'on ne sait pas situer compte comme externe.
create table if not exists public.couts_ia_appels (
  id                  uuid primary key default gen_random_uuid(),
  artisan_id          uuid not null references public.artisans(id) on delete cascade,
  cle                 text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  departement         text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction')),
  modele              text not null check (modele ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  externe             boolean not null default true,
  jetons_entree       integer not null default 0 check (jetons_entree between 0 and 10000000),
  jetons_sortie       integer not null default 0 check (jetons_sortie between 0 and 10000000),
  cout_millicentimes  bigint not null default 0 check (cout_millicentimes between 0 and 100000000000),
  survenu_le          timestamptz not null default now(),
  jour                date not null,
  cree_le             timestamptz not null default now(),
  constraint couts_ia_appels_cle_unique unique (artisan_id, cle)
);
alter table public.couts_ia_appels enable row level security;
drop policy if exists couts_ia_appels_lecture on public.couts_ia_appels;
create policy couts_ia_appels_lecture on public.couts_ia_appels for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists couts_ia_appels_compte_jour on public.couts_ia_appels (artisan_id, jour desc);

create table if not exists public.couts_ia_jour (
  artisan_id          uuid not null references public.artisans(id) on delete cascade,
  jour                date not null,
  modele              text not null check (modele ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  externe             boolean not null default true,
  appels              integer not null default 0 check (appels >= 0),
  jetons_entree       bigint not null default 0 check (jetons_entree >= 0),
  jetons_sortie       bigint not null default 0 check (jetons_sortie >= 0),
  cout_millicentimes  bigint not null default 0 check (cout_millicentimes >= 0),
  cout_centimes       bigint generated always as ((cout_millicentimes + 999) / 1000) stored,
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now(),
  departement         text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction')),
  primary key (artisan_id, jour, departement, modele)
);
alter table public.couts_ia_jour enable row level security;
drop policy if exists couts_ia_jour_lecture on public.couts_ia_jour;
create policy couts_ia_jour_lecture on public.couts_ia_jour for select to authenticated
  using ((select auth.uid()) = artisan_id);

-- Un appel ne se réécrit pas ; son jour est celui de Paris, calculé ici, jamais déclaré ; sa date reste proche de maintenant (un
-- rejeu après une panne d'au plus 7 jours passe, une date inventée ne déplace pas le coût d'un autre jour).
-- Limite écrite : une ligne purgée puis rejouée sous la même clé compterait deux fois ; on ne purge donc jamais couts_ia_appels
-- (le runbook 036-012 le dit), et la clé est déterministe (identifiant d'exécution n8n et nœud).
create or replace function public.couts_ia_appels_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'UPDATE' then
    raise exception 'couts_ia_appels : un appel compté ne se réécrit pas';
  end if;
  if new.survenu_le > now() + interval '5 minutes' or new.survenu_le < now() - interval '7 days' then
    raise exception 'couts_ia_appels : date d''appel hors de la fenêtre (7 jours passés, 5 minutes à venir)';
  end if;
  new.jour := (new.survenu_le at time zone 'Europe/Paris')::date;
  new.cree_le := now();
  return new;
end
$fn$;
drop trigger if exists couts_ia_appels_coherence on public.couts_ia_appels;
create trigger couts_ia_appels_coherence before insert or update on public.couts_ia_appels
  for each row execute function public.couts_ia_appels_coherence();

-- Le cumul du jour : un compteur dérivé (comme une somme matérialisée), pas une automatisation ; il ne déclenche rien.
create or replace function public.couts_ia_cumuler() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  insert into public.couts_ia_jour as j (artisan_id, jour, departement, modele, externe, appels, jetons_entree, jetons_sortie, cout_millicentimes)
  values (new.artisan_id, new.jour, new.departement, new.modele, new.externe, 1, new.jetons_entree, new.jetons_sortie, new.cout_millicentimes)
  on conflict (artisan_id, jour, departement, modele) do update set
    externe = j.externe or excluded.externe,
    appels = j.appels + 1,
    jetons_entree = j.jetons_entree + excluded.jetons_entree,
    jetons_sortie = j.jetons_sortie + excluded.jetons_sortie,
    cout_millicentimes = j.cout_millicentimes + excluded.cout_millicentimes,
    maj_le = now();
  return null;
end
$fn$;
drop trigger if exists couts_ia_cumuler on public.couts_ia_appels;
create trigger couts_ia_cumuler after insert on public.couts_ia_appels
  for each row execute function public.couts_ia_cumuler();

-- couts_ia_jour ne s'écrit QUE par le cumul (déclencheur de couts_ia_appels, profondeur 2) : une écriture directe, clé de service
-- comprise, est refusée ; une suppression (compte supprimé, cascade) passe.
create or replace function public.couts_ia_jour_garde() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if pg_trigger_depth() < 2 then
    raise exception 'couts_ia_jour : s''écrit seulement par couts_ia_appels (un appel, une ligne)';
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end
$fn$;
drop trigger if exists couts_ia_jour_maj_le on public.couts_ia_jour;
drop trigger if exists couts_ia_jour_garde on public.couts_ia_jour;
create trigger couts_ia_jour_garde before insert or update on public.couts_ia_jour
  for each row execute function public.couts_ia_jour_garde();

-- ══ 5. evenements_metier.traite_le : la marque « traité » (0185 reste la table ; seule cette colonne s'ajoute) ═══════════════════
alter table public.evenements_metier add column if not exists traite_le timestamptz;
-- La vue lit les non traités, page par page, dans l'ordre (survenu_le, id).
create index if not exists evenements_metier_a_traiter on public.evenements_metier (survenu_le, id) where traite_le is null;

-- 0185 refusait toute mise à jour d'un fait (0185_automatisation.sql:146-157). Même règle, une exception : la marque traite_le (posée,
-- ou remise à vide pour rejouer un événement, runbook 036-012). Le reste d'un fait ne change jamais, même par la clé de service.
create or replace function public.evenements_metier_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.artisan_id is distinct from old.artisan_id or new.type is distinct from old.type
       or new.objet_type is distinct from old.objet_type or new.objet_id is distinct from old.objet_id or new.cle is distinct from old.cle
       or new.faits is distinct from old.faits or new.survenu_le is distinct from old.survenu_le or new.cree_le is distinct from old.cree_le then
      raise exception 'evenements_metier : un fait ne se modifie pas (seule la marque traite_le change)';
    end if;
    return new;
  end if;
  if not public.automatisation_objet_du_compte(new.artisan_id, new.objet_type, new.objet_id) then
    raise exception 'evenements_metier : l''objet n''appartient pas à cet artisan';
  end if;
  return new;
end
$fn$;

-- ══ 6. La vue étroite des événements à traiter, pour n8n (modèle : n8n_accuses_dus, 0192:99) ═══════════════════════════════════
-- Les colonnes d'un fait, rien d'autre (les faits sont sans texte libre, 0185) ; ni la date de création, ni la marque ; les comptes en
-- cours de suppression sont écartés. Droits du propriétaire (pas security_invoker) : n8n_lecture lit ces lignes sans aucun droit sur la
-- table ; security_barrier posé ; retirée à public, anon, authenticated et service_role. Lue par n8n_lecture seul.
create or replace view public.n8n_evenements_a_traiter with (security_barrier = true) as
select
  e.id,
  e.artisan_id,
  e.type,
  e.objet_type,
  e.objet_id,
  e.cle,
  e.faits,
  e.survenu_le
from public.evenements_metier e
where e.traite_le is null
  and exists (select 1 from public.artisans a where a.id = e.artisan_id and a.suppression_demandee_le is null);

revoke all on public.n8n_evenements_a_traiter from public, anon, authenticated, service_role;

-- La marque « traité », bornée : un compte (obligatoire), 200 identifiants au plus, seulement des événements de CE compte, une fois,
-- jamais un compte en suppression (la vue l'écarte, la marque aussi). p_artisan borne l'écriture, ce n'est pas une autorisation :
-- l'autorisation, c'est le droit d'exécution, réservé à n8n_lecture.
-- n8n_lecture ouvre ses transactions en lecture seule (0189) : l'appel se fait dans « start transaction read write; select …; commit; »,
-- trois instructions SANS paramètre lié (une requête paramétrée n'en porte qu'une) : à rejouer à l'essai de n8n, comme pour 0192. Ce
-- réglage de lecture seule n'est pas une barrière (le rôle peut ouvrir une transaction en écriture) : ce sont ses DROITS qui le bornent.
create or replace function public.evenements_marquer_traites(p_artisan uuid, p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $fn$
declare
  n integer;
begin
  if p_artisan is null then
    raise exception 'evenements_marquer_traites : le compte est obligatoire';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'evenements_marquer_traites : 200 identifiants au plus par appel (% reçus)', cardinality(p_ids);
  end if;
  update public.evenements_metier
     set traite_le = now()
   where artisan_id = p_artisan
     and id = any(p_ids)
     and traite_le is null
     and exists (select 1 from public.artisans a where a.id = p_artisan and a.suppression_demandee_le is null);
  get diagnostics n = row_count;
  return n;
end
$fn$;

revoke all on function public.evenements_marquer_traites(uuid, uuid[]) from public, anon, authenticated, service_role;

do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant select on public.n8n_evenements_a_traiter to n8n_lecture;
    grant execute on function public.evenements_marquer_traites(uuid, uuid[]) to n8n_lecture;
  else
    raise notice '0193 : rôle n8n_lecture absent (0189 non appliquée) — droits sautés, à rejouer après 0189';
  end if;
end
$droits$;

-- ══ 7. Les gardes de 0138, les droits retirés (comme 0185, l.451-469) ═════════════════════════════════════════════════════════
-- Tout est retiré à authenticated (« revoke all » : MAINTAIN de Postgres 17 compris), puis la LECTURE est rendue explicitement (la RLS
-- borne à ses lignes) : l'écran ne dépend pas des droits par défaut du projet. connexions n'est pas rendue ici (colonnes, plus bas).
do $gardes$
declare t text;
begin
  foreach t in array array['connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    if t <> 'connexions' then
      execute format('grant select on public.%I to authenticated', t);
    end if;
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))', t);
  end loop;
end
$gardes$;

-- connexions : la table entière retirée au navigateur, puis rendue colonne par colonne, SANS secret_app ni secret_n8n. Un
-- « select * » d'un jeton de navigateur échoue donc (permission refusée) : l'interface nomme ses colonnes.
revoke all on public.connexions from anon, authenticated;
grant select (id, artisan_id, fournisseur, compte_affiche, portees, etat, motif_erreur, verifiee_le, derniere_synchro, expire_le,
  retiree_le, cree_le, maj_le) on public.connexions to authenticated;

comment on table public.connexions is 'Comptes branchés de l artisan (0193) : portées, état, dates ; deux secrets chiffrés au format v1 (app, n8n), jamais lisibles par le navigateur. Écrits par la clé de service.';
comment on column public.connexions.secret_app is 'Jeton chiffré par l app (CANAUX_KEY, lib/secretBox.ts), format v1 ; effacé au retrait (0193).';
comment on column public.connexions.secret_n8n is 'Jeton chiffré pour n8n avec sa clé propre, déchiffré par n8n à l exécution, format v1 ; effacé au retrait (0193).';
comment on table public.departements_reglages is 'Palier (arret, simulation, ombre, reel), interrupteur et plafonds par compte et par département ; « tous » = interrupteur général ; défaut simulation, coupé (0193).';
comment on table public.competences is 'Consignes pas à pas de chaque département, versionnées, une active par clé ; jamais une donnée de client (0193).';
comment on table public.couts_ia_appels is 'Un appel de modèle, une ligne, unique par (artisan_id, cle) ; coût en millièmes de centime calculé par le code (0193).';
comment on table public.couts_ia_jour is 'Coût IA par compte, jour de Paris et modèle, cumulé depuis couts_ia_appels ; externe = hors Oracle (0193).';
comment on column public.evenements_metier.traite_le is 'Marque « traité » posée par n8n (evenements_marquer_traites) ; vide = à traiter (0193).';
comment on view public.n8n_evenements_a_traiter is 'Les événements métier non traités, colonnes d un fait seulement, comptes en suppression écartés (0193). Lue par n8n_lecture seul.';
