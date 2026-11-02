-- 0183 · Les organisations multi-membres, pas M1 (chantier 4, lot L6b) : utilisateurs, organisations, membres, invitations, la matrice
-- des rôles (droits_roles), les fonctions comptes_accessibles, peut_acceder et role_de, et l'interrupteur organisations_ouvertes (FAUX).
--
-- ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj. (tâche 032-032, sur le Oracle, par claude-code ; rien n'a touché la base)
-- Ordre : M0 (sauvegarde prouvée, essai à sec par la session principale), « go » écrit, application, contrôle du pied du jumeau.
-- Posée seule, elle n'ouvre RIEN : aucune politique existante n'est touchée, aucune politique org_* n'est posée (elles viennent en M3,
-- lot par lot), et l'interrupteur organisations_ouvertes naît FAUX, si bien que comptes_accessibles ne rend que auth.uid().
--
-- Source : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §8.1 (l.535-549), §8.2 0183 (l.555-561), §8.3 (l.570-577), §10 (l.625-659 :
-- matrice l.635-637, pas M1 l.645, retour arrière global l.652, tests l.655-658) ; cadrage-p3.md §5.2 (l.283), §5.3 (la matrice, l.289-302),
-- §5.4 (les fonctions, l.308-311), §5.5 M1 (l.321).
--
-- Règles tenues : RLS dès la création ; les quatre gardes de 0138 ; anon retiré ; insert, update, delete, truncate retirés à authenticated
-- (écriture par la clé de service ou par fonction) ; colonnes en français ; aucune colonne ajoutée à une table existante (artisan_id reste la
-- clé de rattachement, §8.1) ; chaque fonction en security definer a search_path = '' et un contrôle de auth.uid() dans son corps, et son
-- droit d'exécution est retiré à public et à anon.
-- Une organisation et un titulaire par artisan existant (§8.2 l.561). Un artisan inscrit APRÈS 0183 n'a pas de ligne organisations : c'est
-- sans effet (comptes_accessibles rend toujours auth.uid()), et la route d'invitation la crée, par la clé de service, à la première
-- invitation (P4b). Aucun déclencheur n'est posé sur artisans : M1 ne touche aucune table existante (cadrage-p3.md:321).
--
-- ⚠️ ops.interrupteurs : la contrainte de nom est réécrite pour admettre organisations_ouvertes ET sms_arret, pour que 0183 se pose avant
-- comme après 0186. Mais 0186 (préparée, non appliquée) réécrit la même contrainte SANS organisations_ouvertes : posée APRÈS 0183, elle
-- échouerait (tout ou rien, rien ne resterait). Avant d'appliquer 0186 après 0183, ajouter 'organisations_ouvertes' à sa liste
-- (0186_sms_clients.sql:282). organisations-qa le signale.
--
-- ⚠️ Pour M3 (pas ici) : chaque politique org_* s'écrit « to authenticated ». comptes_accessibles est retirée à anon : une politique
-- permissive sans « to » viserait aussi anon, et une requête publique (/p/[slug], /site) échouerait en « permission denied ».
--
-- Retour arrière (dans cet ordre ; 0184 d'abord, ses fonctions de garde lisent utilisateurs et membres) :
--   do $$ begin if exists (select 1 from pg_proc where proname in ('jeton_session_valide', 'compte_non_suspendu')
--       and (prosrc ilike '%utilisateurs%' or prosrc ilike '%membres%')) then
--     raise exception 'retirer 0184 avant 0183 (corps de 0138 recopiés en tête de 0184)'; end if; end $$;
--   delete from ops.interrupteurs where nom = 'organisations_ouvertes';
--   drop function if exists public.role_de(uuid);
--   drop function if exists public.peut_acceder(uuid, text, text);
--   drop function if exists public.comptes_accessibles(text, text);
--   drop function if exists public.organisations_ouvertes_lu();
--   drop table if exists public.invitations;
--   drop table if exists public.membres;
--   drop table if exists public.organisations;
--   drop table if exists public.droits_roles;
--   drop table if exists public.utilisateurs;
--   drop function if exists public.invitations_gardes();
--   drop function if exists public.membres_gardes();
--   drop function if exists public.organisations_maj_le();
--   alter table ops.interrupteurs drop constraint if exists interrupteurs_nom;
--   alter table ops.interrupteurs add constraint interrupteurs_nom check (nom in ('pause_generale', 'envoi_froid', 'sms_arret'));
-- Retour arrière global, à tout moment et sans DDL (§10 l.652) : ops_interrupteur_poser('organisations_ouvertes', false, …) par un fondateur.
-- Idempotente : rejouée, elle repose les mêmes objets et ne recrée aucun doublon (on conflict do nothing).

-- Un verrou qui tarde (ops.interrupteurs) fait échouer la migration proprement, au lieu de bloquer la production.
set local lock_timeout = '5s';

-- ══ 0. La date de mise à jour, posée par la base ═════════════════════════════════════════════════════════════════════════════
create or replace function public.organisations_maj_le() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  new.maj_le := now();
  return new;
end
$fn$;

-- ══ 1. utilisateurs : la sécurité par PERSONNE, pour qui n'a pas de ligne artisans (§8.2 l.558 ; §10 l.629-631) ════════════════
-- Les mêmes champs que artisans (0042:10, 0063:48) : lus par jeton_session_valide (0184), avec ceux d'artisans s'il en a (le plus strict
-- gagne). connexion_verifiee_le naît à now() : une session au mot de passe seul d'un membre exige le code dès le premier jour (échec
-- fermé ; le lien d'invitation porte une autre méthode que « password », il passe). Une ligne est créée pour chaque adhésion non
-- titulaire (déclencheur membres_gardes). ⚠️ P4b : lib/connexion.ts:79 et lib/authArtisan.ts:152 doivent écrire ici pour un membre.
create table if not exists public.utilisateurs (
  id                        uuid primary key references auth.users(id) on delete cascade,
  sessions_invalides_avant  timestamptz,
  connexion_verifiee_le     timestamptz default now(),
  cree_le                   timestamptz not null default now(),
  maj_le                    timestamptz not null default now()
);
alter table public.utilisateurs enable row level security;
drop trigger if exists utilisateurs_maj_le on public.utilisateurs;
create trigger utilisateurs_maj_le before update on public.utilisateurs for each row execute function public.organisations_maj_le();
drop policy if exists utilisateurs_lecture on public.utilisateurs;
create policy utilisateurs_lecture on public.utilisateurs for select to authenticated
  using ((select auth.uid()) = id);

-- ══ 2. organisations : une par compte artisan, id = artisans.id (§8.2 l.556) ═══════════════════════════════════════════════════
-- Le nom affiché reste artisans.nom : on ne le recopie pas. actif = faux ferme l'organisation à ses membres (comptes_accessibles).
create table if not exists public.organisations (
  id       uuid primary key references public.artisans(id) on delete cascade,
  actif    boolean not null default true,
  cree_le  timestamptz not null default now(),
  maj_le   timestamptz not null default now()
);
alter table public.organisations enable row level security;
drop trigger if exists organisations_maj_le on public.organisations;
create trigger organisations_maj_le before update on public.organisations for each row execute function public.organisations_maj_le();
drop policy if exists organisations_lecture on public.organisations;
create policy organisations_lecture on public.organisations for select to authenticated
  using ((select auth.uid()) = id);

-- ══ 3. membres : rôle, statut, rattachement à une fiche d'équipe (§8.2 l.556-557 ; cadrage-p3.md:283) ═══════════════════════════
create table if not exists public.membres (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.organisations(id) on delete cascade,
  utilisateur_id    uuid not null references auth.users(id) on delete cascade,
  role              text not null check (role in ('titulaire', 'associe', 'administratif', 'compagnon', 'invite')),
  statut            text not null default 'invite' check (statut in ('invite', 'actif', 'retire')),
  equipe_membre_id  uuid references public.equipe_membres(id) on delete set null,
  invite_par        uuid references auth.users(id) on delete set null,
  actif_le          timestamptz,
  retire_le         timestamptz,
  cree_le           timestamptz not null default now(),
  maj_le            timestamptz not null default now(),
  constraint membres_unique unique (organisation_id, utilisateur_id),
  -- Le titulaire est l'artisan lui-même, et lui seul : personne d'autre ne peut le devenir par une ligne.
  constraint membres_titulaire_soi check ((role = 'titulaire') = (utilisateur_id = organisation_id)),
  -- Seul un compagnon est rattaché à une fiche d'équipe (ses chantiers, par chantier_equipe : M3-B).
  constraint membres_equipe_compagnon check (equipe_membre_id is null or role = 'compagnon'),
  constraint membres_dates check (statut <> 'actif' or (actif_le is not null and retire_le is null))
);
create index if not exists membres_utilisateur_actif_idx on public.membres (utilisateur_id) where statut = 'actif';
create unique index if not exists membres_un_titulaire on public.membres (organisation_id) where role = 'titulaire';
alter table public.membres enable row level security;

-- La fiche d'équipe d'un compagnon appartient à la même organisation (equipe_membres, 0141:30-39), sans toucher à equipe_membres.
create or replace function public.membres_gardes() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.equipe_membre_id is not null and not exists (
    select 1 from public.equipe_membres e where e.id = new.equipe_membre_id and e.artisan_id = new.organisation_id
  ) then
    raise exception 'membres : la fiche d''équipe n''appartient pas à cette organisation';
  end if;
  if tg_op = 'UPDATE' and (new.organisation_id <> old.organisation_id or new.utilisateur_id <> old.utilisateur_id) then
    raise exception 'membres : une adhésion ne change ni d''organisation ni de personne';
  end if;
  if tg_op = 'UPDATE' and old.role = 'titulaire' and (new.role <> 'titulaire' or new.statut <> 'actif') then
    raise exception 'membres : le titulaire ne se retire pas';
  end if;
  -- Un membre non titulaire a toujours sa ligne de sécurité (0184 la lit) : sans elle, il serait refusé partout (échec fermé).
  if new.role <> 'titulaire' then
    insert into public.utilisateurs (id) values (new.utilisateur_id) on conflict (id) do nothing;
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists membres_gardes on public.membres;
create trigger membres_gardes before insert or update on public.membres for each row execute function public.membres_gardes();

-- Le titulaire lit les membres de son organisation ; chacun lit ses propres adhésions. Aucune lecture croisée (auth.uid() seul).
drop policy if exists membres_lecture on public.membres;
create policy membres_lecture on public.membres for select to authenticated
  using ((select auth.uid()) = organisation_id or (select auth.uid()) = utilisateur_id);

-- ══ 4. invitations : empreinte du jeton, 7 jours au plus, usage unique (§8.2 l.558) ═════════════════════════════════════════
-- Le jeton en clair ne vit que dans l'e-mail ; la base n'en garde que l'empreinte SHA-256 (64 hexadécimaux), comme l'adresse visée.
-- Aucune politique : lue et écrite par la route d'invitation seulement, par la clé de service (P4b).
create table if not exists public.invitations (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  role                text not null check (role in ('associe', 'administratif', 'compagnon', 'invite')),
  jeton_empreinte     text not null check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  courriel_empreinte  text not null check (courriel_empreinte ~ '^[0-9a-f]{64}$'),
  equipe_membre_id    uuid references public.equipe_membres(id) on delete set null,
  invite_par          uuid not null references auth.users(id) on delete cascade,
  cree_le             timestamptz not null default now(),
  expire_le           timestamptz not null,
  utilisee_le         timestamptz,
  utilisee_par        uuid references auth.users(id) on delete set null,
  revoquee_le         timestamptz,
  constraint invitations_jeton_unique unique (jeton_empreinte),
  constraint invitations_duree check (expire_le > cree_le and expire_le <= cree_le + interval '7 days'),
  -- utilisee_par peut repasser à null (personne effacée, on delete set null) ; une invitation utilisée le reste.
  constraint invitations_usage check (utilisee_par is null or utilisee_le is not null),
  constraint invitations_equipe_compagnon check (equipe_membre_id is null or role = 'compagnon')
);
create index if not exists invitations_organisation_idx on public.invitations (organisation_id);
alter table public.invitations enable row level security;

-- La date de création est imposée (la durée de 7 jours ne se contourne pas en datant l'invitation) ; une invitation utilisée ou
-- révoquée est figée : usage unique.
create or replace function public.invitations_gardes() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    new.cree_le := now();
    if new.utilisee_le is not null or new.utilisee_par is not null or new.revoquee_le is not null then
      raise exception 'invitations : une invitation naît ni utilisée ni révoquée';
    end if;
    if new.equipe_membre_id is not null and not exists (
      select 1 from public.equipe_membres e where e.id = new.equipe_membre_id and e.artisan_id = new.organisation_id
    ) then
      raise exception 'invitations : la fiche d''équipe n''appartient pas à cette organisation';
    end if;
    return new;
  end if;
  -- La mise à null par une clé étrangère (fiche d'équipe ou personne effacée : on delete set null) passe toujours, sinon
  -- l'effacement d'une fiche d'équipe ou d'un compte (RGPD) échouerait.
  if (new.utilisee_par is null or new.utilisee_par is not distinct from old.utilisee_par)
     and (new.equipe_membre_id is null or new.equipe_membre_id is not distinct from old.equipe_membre_id)
     and (new.utilisee_par is distinct from old.utilisee_par or new.equipe_membre_id is distinct from old.equipe_membre_id)
     and (new.id, new.organisation_id, new.role, new.jeton_empreinte, new.courriel_empreinte, new.invite_par, new.cree_le,
          new.expire_le, new.utilisee_le, new.revoquee_le)
         is not distinct from
         (old.id, old.organisation_id, old.role, old.jeton_empreinte, old.courriel_empreinte, old.invite_par, old.cree_le,
          old.expire_le, old.utilisee_le, old.revoquee_le) then
    return new;
  end if;
  if old.utilisee_le is not null or old.revoquee_le is not null then
    raise exception 'invitations : une invitation utilisée ou révoquée ne se modifie plus (usage unique)';
  end if;
  if new.jeton_empreinte <> old.jeton_empreinte or new.courriel_empreinte <> old.courriel_empreinte or new.cree_le <> old.cree_le
     or new.expire_le <> old.expire_le or new.organisation_id <> old.organisation_id or new.role <> old.role
     or new.invite_par <> old.invite_par or new.equipe_membre_id is distinct from old.equipe_membre_id then
    raise exception 'invitations : seuls l''usage et la révocation s''écrivent';
  end if;
  if new.utilisee_le is not null and new.utilisee_le > old.expire_le then
    raise exception 'invitations : invitation expirée';
  end if;
  if new.utilisee_le is not null and new.utilisee_par is null then
    raise exception 'invitations : une invitation s''utilise par une personne';
  end if;
  return new;
end
$fn$;
drop trigger if exists invitations_gardes on public.invitations;
create trigger invitations_gardes before insert or update on public.invitations for each row execute function public.invitations_gardes();

-- ══ 5. droits_roles : la matrice (§10 l.635-637 ; cadrage-p3.md §5.3, l.289-302) ═════════════════════════════════════════════════
-- niveau : aucun · lecture · ecriture · siens (ses chantiers, son pointage, ses tâches : filtré ligne par ligne en M3-B, jamais par
-- comptes_accessibles) · restreint (une partie du domaine, déclarée par la route : l'assistant sans actions d'argent, la boîte « À valider »
-- commerciale et factures). comptes_accessibles n'ouvre un compte que pour lecture et ecriture : siens et restreint y valent aucun.
-- Même ordre, ligne pour ligne, que lib/organisations/droits.ts (MATRICE) : organisations-qa le compare.
create table if not exists public.droits_roles (
  role     text not null check (role in ('titulaire', 'associe', 'administratif', 'compagnon', 'invite')),
  domaine  text not null check (domaine in ('abonnement', 'reglages', 'demandes', 'devis', 'factures', 'tarifs', 'stock', 'chantiers',
                                            'pointage', 'assistant', 'a_valider', 'autonomie')),
  niveau   text not null check (niveau in ('aucun', 'lecture', 'ecriture', 'siens', 'restreint')),
  cree_le  timestamptz not null default now(),
  primary key (role, domaine)
);
alter table public.droits_roles enable row level security;

insert into public.droits_roles (role, domaine, niveau) values
  -- titulaire : tout, seul à gérer l'abonnement, les membres et le niveau 3
  ('titulaire', 'abonnement', 'ecriture'),
  ('titulaire', 'reglages', 'ecriture'),
  ('titulaire', 'demandes', 'ecriture'),
  ('titulaire', 'devis', 'ecriture'),
  ('titulaire', 'factures', 'ecriture'),
  ('titulaire', 'tarifs', 'ecriture'),
  ('titulaire', 'stock', 'ecriture'),
  ('titulaire', 'chantiers', 'ecriture'),
  ('titulaire', 'pointage', 'ecriture'),
  ('titulaire', 'assistant', 'ecriture'),
  ('titulaire', 'a_valider', 'ecriture'),
  ('titulaire', 'autonomie', 'ecriture'),
  -- associé : tout sauf l'abonnement, les membres et le niveau 3
  ('associe', 'abonnement', 'aucun'),
  ('associe', 'reglages', 'ecriture'),
  ('associe', 'demandes', 'ecriture'),
  ('associe', 'devis', 'ecriture'),
  ('associe', 'factures', 'ecriture'),
  ('associe', 'tarifs', 'ecriture'),
  ('associe', 'stock', 'ecriture'),
  ('associe', 'chantiers', 'ecriture'),
  ('associe', 'pointage', 'ecriture'),
  ('associe', 'assistant', 'ecriture'),
  ('associe', 'a_valider', 'ecriture'),
  ('associe', 'autonomie', 'aucun'),
  -- administratif : le commercial et la compta ; lit les réglages, les tarifs et le pointage
  ('administratif', 'abonnement', 'aucun'),
  ('administratif', 'reglages', 'lecture'),
  ('administratif', 'demandes', 'ecriture'),
  ('administratif', 'devis', 'ecriture'),
  ('administratif', 'factures', 'ecriture'),
  ('administratif', 'tarifs', 'lecture'),
  ('administratif', 'stock', 'ecriture'),
  ('administratif', 'chantiers', 'ecriture'),
  ('administratif', 'pointage', 'lecture'),
  ('administratif', 'assistant', 'restreint'),
  ('administratif', 'a_valider', 'restreint'),
  ('administratif', 'autonomie', 'aucun'),
  -- compagnon : ses chantiers et son pointage, lit le stock ; jamais la compta
  ('compagnon', 'abonnement', 'aucun'),
  ('compagnon', 'reglages', 'aucun'),
  ('compagnon', 'demandes', 'aucun'),
  ('compagnon', 'devis', 'aucun'),
  ('compagnon', 'factures', 'aucun'),
  ('compagnon', 'tarifs', 'aucun'),
  ('compagnon', 'stock', 'lecture'),
  ('compagnon', 'chantiers', 'siens'),
  ('compagnon', 'pointage', 'siens'),
  ('compagnon', 'assistant', 'aucun'),
  ('compagnon', 'a_valider', 'siens'),
  ('compagnon', 'autonomie', 'aucun'),
  -- invité (le cabinet comptable, par exemple) : lit, n'écrit rien
  ('invite', 'abonnement', 'aucun'),
  ('invite', 'reglages', 'aucun'),
  ('invite', 'demandes', 'lecture'),
  ('invite', 'devis', 'lecture'),
  ('invite', 'factures', 'lecture'),
  ('invite', 'tarifs', 'aucun'),
  ('invite', 'stock', 'aucun'),
  ('invite', 'chantiers', 'lecture'),
  ('invite', 'pointage', 'aucun'),
  ('invite', 'assistant', 'aucun'),
  ('invite', 'a_valider', 'aucun'),
  ('invite', 'autonomie', 'aucun')
on conflict (role, domaine) do update set niveau = excluded.niveau;

-- ══ 6. L'interrupteur organisations_ouvertes, dans ops.interrupteurs (0096:237-243), FAUX, posé par un fondateur (0097:336-357) ════
-- La contrainte de nom de 0096 est anonyme : on retire celle qui parle du nom (comme 0186:271-281), puis on pose la nôtre, nommée.
do $nom$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'ops.interrupteurs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%pause_generale%'
  loop
    execute format('alter table ops.interrupteurs drop constraint %I', c.conname);
  end loop;
end
$nom$;
alter table ops.interrupteurs add constraint interrupteurs_nom
  check (nom in ('pause_generale', 'envoi_froid', 'sms_arret', 'organisations_ouvertes'));
insert into ops.interrupteurs (nom, actif, motif)
values ('organisations_ouvertes', false, 'semé FAUX par 0183 : aucun membre n''accède à un autre compte tant qu''un fondateur ne l''ouvre pas')
on conflict (nom) do nothing;

-- Lu par comptes_accessibles et role_de seulement (droit d'exécution retiré à tous les rôles de l'API). Absent = fermé.
create or replace function public.organisations_ouvertes_lu() returns boolean
language sql stable security definer set search_path = '' as $fn$
  select coalesce((select i.actif from ops.interrupteurs i where i.nom = 'organisations_ouvertes'), false)
$fn$;

-- ══ 7. Les fonctions (cadrage-p3.md §5.4, l.308-311) ════════════════════════════════════════════════════════════════════════
-- comptes_accessibles : le compte de l'utilisateur lui-même, plus les organisations où il est membre ACTIF avec un droit suffisant,
-- hors comptes suspendus pour l'écriture, et seulement si l'interrupteur est ouvert. Un ensemble, pour que les politiques M3 s'écrivent
-- artisan_id in (select public.comptes_accessibles('devis', 'ecriture')) : évalué une fois par requête (InitPlan).
-- security definer : elle lit membres, droits_roles, suspensions et ops.interrupteurs sans dépendre de leurs politiques (et sans
-- récursion de RLS) ; c'est pourquoi chaque ligne est filtrée sur auth.uid() DANS le corps.
create or replace function public.comptes_accessibles(p_domaine text, p_niveau text) returns setof uuid
language sql stable security definer set search_path = '' as $fn$
  select u.uid from (select auth.uid() as uid) u where u.uid is not null
  union
  select m.organisation_id
    from public.membres m
    join public.organisations o on o.id = m.organisation_id
    join public.droits_roles d on d.role = m.role and d.domaine = p_domaine
   where m.utilisateur_id = (select auth.uid())
     and m.statut = 'actif'
     and o.actif
     and (select public.organisations_ouvertes_lu())
     and p_niveau in ('lecture', 'ecriture')
     and (d.niveau = 'ecriture' or (d.niveau = 'lecture' and p_niveau = 'lecture'))
     and (p_niveau = 'lecture'
          or not exists (select 1 from public.suspensions s where s.artisan_id = m.organisation_id and s.levee_le is null))
$fn$;

-- peut_acceder : le contrôle unitaire (le nom voulu par Benj, cadrage-p3.md:309), pour l'application et les tests.
create or replace function public.peut_acceder(p_artisan uuid, p_domaine text, p_niveau text) returns boolean
language sql stable security invoker set search_path = '' as $fn$
  select p_artisan is not null
     and exists (select 1 from public.comptes_accessibles(p_domaine, p_niveau) c where c = p_artisan)
$fn$;

-- role_de : le rôle de l'utilisateur dans un compte, ou null. Le titulaire de son propre compte, toujours.
create or replace function public.role_de(p_artisan uuid) returns text
language sql stable security definer set search_path = '' as $fn$
  select case
    when p_artisan is null or (select auth.uid()) is null then null
    when p_artisan = (select auth.uid()) then 'titulaire'
    else (select m.role
            from public.membres m join public.organisations o on o.id = m.organisation_id
           where m.organisation_id = p_artisan and m.utilisateur_id = (select auth.uid())
             and m.statut = 'actif' and o.actif and (select public.organisations_ouvertes_lu()))
  end
$fn$;

revoke all on function public.organisations_maj_le() from public, anon, authenticated;
revoke all on function public.membres_gardes() from public, anon, authenticated;
revoke all on function public.invitations_gardes() from public, anon, authenticated;
revoke all on function public.organisations_ouvertes_lu() from public, anon, authenticated;
revoke all on function public.comptes_accessibles(text, text) from public, anon;
revoke all on function public.peut_acceder(uuid, text, text) from public, anon;
revoke all on function public.role_de(uuid) from public, anon;
grant execute on function public.comptes_accessibles(text, text) to authenticated, service_role;
grant execute on function public.peut_acceder(uuid, text, text) to authenticated, service_role;
grant execute on function public.role_de(uuid) to authenticated, service_role;

-- ══ 8. Une organisation et un titulaire par artisan existant (§8.2 l.561 ; cadrage-p3.md:321) ════════════════════════════════════
-- Idempotent : rejoué, il ne crée aucun doublon. artisans.id référence auth.users (0001:5) : le titulaire existe toujours.
insert into public.organisations (id)
select a.id from public.artisans a
on conflict (id) do nothing;

insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le)
select a.id, a.id, 'titulaire', 'actif', now() from public.artisans a
on conflict (organisation_id, utilisateur_id) do nothing;

-- ══ 9. Les gardes de 0138, les droits retirés (comme 0186:288-302) ═════════════════════════════════════════════════════════════
do $gardes$
declare t text;
begin
  foreach t in array array['utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
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
-- invitations et droits_roles : aucune lecture pour le navigateur (route par la clé de service ; la matrice se lit dans droits.ts).
revoke all on public.invitations from authenticated;
revoke all on public.droits_roles from authenticated;

comment on table public.organisations is 'Une organisation par compte artisan, id = artisans.id (0183, chantier 4 §8.2). actif = faux la ferme à ses membres.';
comment on table public.membres is 'Les membres d''une organisation : titulaire (l''artisan lui-même), associé, administratif, compagnon, invité (0183, §10).';
comment on table public.invitations is 'Invitations à rejoindre une organisation : empreinte du jeton, 7 jours au plus, usage unique (0183). Clé de service seulement.';
comment on table public.utilisateurs is 'Sécurité par personne pour qui n''a pas de ligne artisans : révocation et code par e-mail (0183, lus par 0184).';
comment on table public.droits_roles is 'La matrice des rôles (0183, chantier 4 §10) ; même contenu que lib/organisations/droits.ts.';
comment on function public.comptes_accessibles(text, text) is 'Comptes accessibles à l''utilisateur pour un domaine et un niveau : lui-même, plus ses organisations (membre actif, droit suffisant, non suspendue pour l''écriture), si organisations_ouvertes (0183).';
