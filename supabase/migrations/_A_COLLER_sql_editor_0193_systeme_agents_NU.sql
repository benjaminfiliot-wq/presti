---------------------------- _A_COLLER_sql_editor_0193_systeme_agents_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
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
  constraint connexions_portees check (cardinality(portees) <= 40 and array_position(portees, null) is null
    and (cardinality(portees) = 0 or (array_to_string(portees, ' ') ~ '^[A-Za-z0-9_.:/+-]+( [A-Za-z0-9_.:/+-]+)*$'
         and cardinality(string_to_array(array_to_string(portees, ' '), ' ')) = cardinality(portees)))),
  constraint connexions_secret_app_format check (secret_app is null
    or (char_length(secret_app) <= 16384 and secret_app ~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$')),
  constraint connexions_secret_n8n_format check (secret_n8n is null
    or (char_length(secret_n8n) <= 16384 and secret_n8n ~ '^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$')),
  constraint connexions_retiree_sans_secret check (etat <> 'retiree' or (secret_app is null and secret_n8n is null and retiree_le is not null)),
  constraint connexions_active_verifiee check (etat <> 'active' or verifiee_le is not null),
  constraint connexions_erreur_motif check (etat <> 'erreur' or motif_erreur is not null)
);
alter table public.connexions enable row level security;
drop policy if exists connexions_lecture on public.connexions;
create policy connexions_lecture on public.connexions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists connexions_compte on public.connexions (artisan_id);
create unique index if not exists connexions_vivante_unique on public.connexions (artisan_id, fournisseur, lower(coalesce(compte_affiche, '')))
  where etat <> 'retiree';
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
alter table public.evenements_metier add column if not exists traite_le timestamptz;
create index if not exists evenements_metier_a_traiter on public.evenements_metier (survenu_le, id) where traite_le is null;
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

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables (attendu : competences, connexions, couts_ia_appels, couts_ia_jour, departements_reglages)' as controle,
  coalesce(string_agg(table_name, ', ' order by table_name), 'ABSENTES') as valeur
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
   and table_name in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour')
union all
select 'RLS activée (attendu : les cinq, t)', coalesce(string_agg(relname || ':' || relrowsecurity::text, ', ' order by relname), 'aucune')
  from pg_catalog.pg_class where relnamespace = 'public'::regnamespace
   and relname in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour')
union all
select 'politiques (attendu : 5 par table, une lecture et quatre gardes)', coalesce(string_agg(tablename || ':' || n::text, ', ' order by tablename), 'aucune')
  from (select tablename, count(*) as n from pg_policies where schemaname = 'public'
         and tablename in ('connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour') group by tablename) p
union all
select 'colonnes de connexions lisibles par authenticated (attendu : 13, ni secret_app ni secret_n8n)',
  coalesce(string_agg(column_name, ', ' order by column_name), 'aucune')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'connexions'
   and grantee = 'authenticated' and privilege_type = 'SELECT'
union all
select 'droits de table sur connexions pour anon et authenticated (attendu : aucun)',
  coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'connexions' and grantee in ('anon', 'authenticated')
union all
select 'défaut du palier (attendu : simulation)', coalesce((select column_default from information_schema.columns
  where table_schema = 'public' and table_name = 'departements_reglages' and column_name = 'palier'), 'ABSENT')
union all
select 'colonne evenements_metier.traite_le (attendu : timestamp with time zone)', coalesce((select data_type from information_schema.columns
  where table_schema = 'public' and table_name = 'evenements_metier' and column_name = 'traite_le'), 'ABSENTE')
union all
select 'colonnes de la vue (attendu : 8, de id à survenu_le)', coalesce(string_agg(column_name, ', ' order by ordinal_position), 'VUE ABSENTE')
  from information_schema.columns where table_schema = 'public' and table_name = 'n8n_evenements_a_traiter'
union all
select 'options de la vue (attendu : security_barrier=true)', coalesce((select array_to_string(reloptions, ' ') from pg_catalog.pg_class
  where oid = to_regclass('public.n8n_evenements_a_traiter')), 'VUE ABSENTE')
union all
select 'droits sur la vue (attendu : n8n_lecture:SELECT seul, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'n8n_evenements_a_traiter'
   and grantee <> (select pg_get_userbyid(relowner) from pg_catalog.pg_class where oid = to_regclass('public.n8n_evenements_a_traiter'))
union all
select 'fonction evenements_marquer_traites (attendu : security definer, search_path vide)', coalesce((select case when prosecdef then 'security definer' else 'INVOKER' end
  || ', ' || coalesce(array_to_string(proconfig, ' '), 'sans réglage') from pg_proc where oid = to_regprocedure('public.evenements_marquer_traites(uuid, uuid[])')), 'ABSENTE')
union all
select 'qui exécute evenements_marquer_traites (attendu : n8n_lecture, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'personne')
  from information_schema.role_routine_grants where routine_schema = 'public' and routine_name = 'evenements_marquer_traites'
   and grantee <> (select pg_get_userbyid(proowner) from pg_proc where oid = to_regprocedure('public.evenements_marquer_traites(uuid, uuid[])'))
union all
select 'événements à traiter maintenant (lecture de la vue)', count(*)::text from public.n8n_evenements_a_traiter
union all
select 'lignes de réglages et de connexions (attendu : 0 juste après la pose)',
  ((select count(*) from public.departements_reglages) + (select count(*) from public.connexions))::text;
