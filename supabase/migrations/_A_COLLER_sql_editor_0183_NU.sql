---------------------------- _A_COLLER_sql_editor_0183_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
create or replace function public.organisations_maj_le() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  new.maj_le := now();
  return new;
end
$fn$;
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
  constraint membres_titulaire_soi check ((role = 'titulaire') = (utilisateur_id = organisation_id)),
  constraint membres_equipe_compagnon check (equipe_membre_id is null or role = 'compagnon'),
  constraint membres_dates check (statut <> 'actif' or (actif_le is not null and retire_le is null))
);
create index if not exists membres_utilisateur_actif_idx on public.membres (utilisateur_id) where statut = 'actif';
create unique index if not exists membres_un_titulaire on public.membres (organisation_id) where role = 'titulaire';
alter table public.membres enable row level security;
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
drop policy if exists membres_lecture on public.membres;
create policy membres_lecture on public.membres for select to authenticated
  using ((select auth.uid()) = organisation_id or (select auth.uid()) = utilisateur_id);
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
  constraint invitations_usage check (utilisee_par is null or utilisee_le is not null),
  constraint invitations_equipe_compagnon check (equipe_membre_id is null or role = 'compagnon')
);
create index if not exists invitations_organisation_idx on public.invitations (organisation_id);
alter table public.invitations enable row level security;
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
create or replace function public.organisations_ouvertes_lu() returns boolean
language sql stable security definer set search_path = '' as $fn$
  select coalesce((select i.actif from ops.interrupteurs i where i.nom = 'organisations_ouvertes'), false)
$fn$;
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
create or replace function public.peut_acceder(p_artisan uuid, p_domaine text, p_niveau text) returns boolean
language sql stable security invoker set search_path = '' as $fn$
  select p_artisan is not null
     and exists (select 1 from public.comptes_accessibles(p_domaine, p_niveau) c where c = p_artisan)
$fn$;
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
insert into public.organisations (id)
select a.id from public.artisans a
on conflict (id) do nothing;
insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le)
select a.id, a.id, 'titulaire', 'actif', now() from public.artisans a
on conflict (organisation_id, utilisateur_id) do nothing;
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
revoke all on public.invitations from authenticated;
revoke all on public.droits_roles from authenticated;
comment on table public.organisations is 'Une organisation par compte artisan, id = artisans.id (0183, chantier 4 §8.2). actif = faux la ferme à ses membres.';
comment on table public.membres is 'Les membres d''une organisation : titulaire (l''artisan lui-même), associé, administratif, compagnon, invité (0183, §10).';
comment on table public.invitations is 'Invitations à rejoindre une organisation : empreinte du jeton, 7 jours au plus, usage unique (0183). Clé de service seulement.';
comment on table public.utilisateurs is 'Sécurité par personne pour qui n''a pas de ligne artisans : révocation et code par e-mail (0183, lus par 0184).';
comment on table public.droits_roles is 'La matrice des rôles (0183, chantier 4 §10) ; même contenu que lib/organisations/droits.ts.';
comment on function public.comptes_accessibles(text, text) is 'Comptes accessibles à l''utilisateur pour un domaine et un niveau : lui-même, plus ses organisations (membre actif, droit suffisant, non suspendue pour l''écriture), si organisations_ouvertes (0183).';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables des organisations (attendu : 5)' as quoi, count(*)::text as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles')
union all
select 'tables des organisations sans RLS (attendu : aucune)', coalesce(string_agg(c.relname, ', '), 'aucune')
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not c.relrowsecurity and c.relname in ('utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles')
union all
select 'gardes de session posées (attendu : 20)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')
   and permissive = 'RESTRICTIVE' and tablename in ('utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles')
union all
select 'politiques org_* (attendu : 0)', count(*)::text from pg_policies where schemaname = 'public' and policyname like 'org\_%'
union all
select 'droits restants pour anon (attendu : aucun)', coalesce(string_agg(distinct table_name, ', '), 'aucun')
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'
   and table_name in ('utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles')
union all
select 'écritures ouvertes à authenticated (attendu : aucune)', coalesce(string_agg(distinct table_name, ', '), 'aucune')
  from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public'
   and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') and table_name in ('utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles')
union all
select 'lignes de droits_roles (attendu : 60)', count(*)::text from public.droits_roles
union all
select 'artisans sans organisation (attendu : 0)', count(*)::text
  from public.artisans a where not exists (select 1 from public.organisations o where o.id = a.id)
union all
select 'artisans sans titulaire actif (attendu : 0)', count(*)::text
  from public.artisans a where not exists (select 1 from public.membres m where m.organisation_id = a.id and m.utilisateur_id = a.id and m.role = 'titulaire' and m.statut = 'actif')
union all
select 'membres autres que titulaires (attendu : 0)', count(*)::text from public.membres where role <> 'titulaire'
union all
select 'interrupteur organisations_ouvertes (attendu : false)', coalesce((select actif::text from ops.interrupteurs where nom = 'organisations_ouvertes'), 'absent')
union all
select 'comptes_accessibles exécutable par anon (attendu : false)', has_function_privilege('anon', 'public.comptes_accessibles(text, text)', 'execute')::text;
