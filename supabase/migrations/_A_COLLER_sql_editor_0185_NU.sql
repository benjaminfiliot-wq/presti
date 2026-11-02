---------------------------- _A_COLLER_sql_editor_0185_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
create or replace function public.faits_sans_texte(f jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select f is not null
    and jsonb_typeof(f) = 'object'
    and pg_column_size(f) <= 4000
    and not exists (
      select 1 from jsonb_each(f) e
       where e.key !~ '^[a-z][a-z0-9_]{0,39}$'
          or jsonb_typeof(e.value) not in ('number', 'boolean', 'null', 'string')
          or (jsonb_typeof(e.value) = 'string' and (e.value #>> '{}') !~ '^([a-z][a-z0-9_:.-]{0,63}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.+Z-]{0,20})?)$')
    )
$fn$;
create or replace function public.bilan_sans_texte(b jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select b is not null
    and jsonb_typeof(b) = 'object'
    and pg_column_size(b) <= 8000
    and not exists (
      select 1 from jsonb_each(b) d
       where d.key !~ '^[a-z][a-z0-9_]{0,39}$'
          or jsonb_typeof(d.value) <> 'object'
          or exists (select 1 from jsonb_each(d.value) c
                      where c.key !~ '^[a-z][a-z0-9_]{0,39}$' or jsonb_typeof(c.value) <> 'number')
    )
$fn$;
create or replace function public.automatisation_maj_le() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  new.maj_le := now();
  return new;
end
$fn$;
create or replace function public.automatisation_objet_du_compte(p_artisan uuid, p_type text, p_id uuid) returns boolean
language plpgsql stable security invoker set search_path = '' as $fn$
declare
  v_table text;
  v_ok boolean;
begin
  if p_type is null and p_id is null then
    return true;
  end if;
  if p_artisan is null or p_type is null or p_id is null then
    return false;
  end if;
  v_table := case p_type
    when 'devis' then 'devis'
    when 'facture' then 'factures'
    when 'lead' then 'leads'
    when 'chantier' then 'chantiers'
    when 'client' then 'clients'
    when 'materiau' then 'materiaux'
    when 'rappel' then 'crm_rappels'
    when 'commande' then 'commandes_fournisseur'
  end;
  if v_table is null then
    return false;
  end if;
  execute format('select exists (select 1 from public.%I t where t.id = $1 and t.artisan_id = $2)', v_table) into v_ok using p_id, p_artisan;
  return coalesce(v_ok, false);
end
$fn$;
revoke all on function public.automatisation_objet_du_compte(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.automatisation_objet_du_compte(uuid, text, uuid) to service_role;
create table if not exists public.evenements_metier (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  type        text not null check (type ~ '^[a-z][a-z0-9_]{1,39}$'),
  objet_type  text check (objet_type is null or objet_type in ('devis', 'facture', 'lead', 'chantier', 'client', 'materiau', 'rappel', 'commande')),
  objet_id    uuid,
  cle         text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  faits       jsonb not null default '{}'::jsonb,
  survenu_le  timestamptz not null default now(),
  cree_le     timestamptz not null default now(),
  constraint evenements_metier_cle_unique unique (artisan_id, cle),
  constraint evenements_metier_objet check ((objet_type is null) = (objet_id is null)),
  constraint evenements_metier_faits check (public.faits_sans_texte(faits))
);
alter table public.evenements_metier enable row level security;
drop policy if exists evenements_metier_lecture on public.evenements_metier;
create policy evenements_metier_lecture on public.evenements_metier for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists evenements_metier_compte_date on public.evenements_metier (artisan_id, survenu_le desc);
create or replace function public.evenements_metier_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'UPDATE' then
    raise exception 'evenements_metier : un fait ne se modifie pas';
  end if;
  if not public.automatisation_objet_du_compte(new.artisan_id, new.objet_type, new.objet_id) then
    raise exception 'evenements_metier : l''objet n''appartient pas à cet artisan';
  end if;
  return new;
end
$fn$;
drop trigger if exists evenements_metier_coherence on public.evenements_metier;
create trigger evenements_metier_coherence before insert or update on public.evenements_metier
  for each row execute function public.evenements_metier_coherence();
create table if not exists public.detecteurs_reglages (
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  detecteur   text not null check (detecteur ~ '^[a-z][a-z0-9_]{1,39}$'),
  actif       boolean not null default false,
  seuils      jsonb not null default '{}'::jsonb,
  acteur_id   uuid,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  primary key (artisan_id, detecteur),
  constraint detecteurs_reglages_seuils check (public.faits_sans_texte(seuils))
);
alter table public.detecteurs_reglages enable row level security;
drop policy if exists detecteurs_reglages_lecture on public.detecteurs_reglages;
create policy detecteurs_reglages_lecture on public.detecteurs_reglages for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop trigger if exists detecteurs_reglages_maj_le on public.detecteurs_reglages;
create trigger detecteurs_reglages_maj_le before update on public.detecteurs_reglages
  for each row execute function public.automatisation_maj_le();
create table if not exists public.autonomie_reglages (
  artisan_id    uuid not null references public.artisans(id) on delete cascade,
  type_action   text not null check (type_action ~ '^[a-z][a-z0-9_]{1,39}$'),
  niveau        smallint not null default 1 check (niveau between 1 and 3),
  plafond_jour  integer check (plafond_jour is null or plafond_jour between 0 and 500),
  pose_par      text not null default 'artisan' check (pose_par in ('artisan', 'presti')),
  acteur_id     uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now(),
  primary key (artisan_id, type_action)
);
alter table public.autonomie_reglages enable row level security;
drop policy if exists autonomie_reglages_lecture on public.autonomie_reglages;
create policy autonomie_reglages_lecture on public.autonomie_reglages for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop trigger if exists autonomie_reglages_maj_le on public.autonomie_reglages;
create trigger autonomie_reglages_maj_le before update on public.autonomie_reglages
  for each row execute function public.automatisation_maj_le();
create table if not exists public.passages_detecteurs (
  id               uuid primary key default gen_random_uuid(),
  cle              text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  workflow         text not null check (workflow ~ '^[a-z][a-z0-9-]{1,59}$'),
  mode             text not null default 'simulation' check (mode in ('simulation', 'reel')),
  debut_le         timestamptz not null default now(),
  fin_le           timestamptz,
  comptes_traites  integer not null default 0 check (comptes_traites >= 0),
  opportunites     integer not null default 0 check (opportunites >= 0),
  erreurs          integer not null default 0 check (erreurs >= 0),
  bilan            jsonb not null default '{}'::jsonb,
  cree_le          timestamptz not null default now(),
  constraint passages_detecteurs_cle_unique unique (cle),
  constraint passages_detecteurs_duree check (fin_le is null or fin_le >= debut_le),
  constraint passages_detecteurs_bilan check (public.bilan_sans_texte(bilan))
);
alter table public.passages_detecteurs enable row level security;
create index if not exists passages_detecteurs_recents on public.passages_detecteurs (workflow, debut_le desc);
create table if not exists public.opportunites (
  id                   uuid primary key default gen_random_uuid(),
  artisan_id           uuid not null references public.artisans(id) on delete cascade,
  detecteur            text not null check (detecteur ~ '^[a-z][a-z0-9_]{1,39}$'),
  detecteur_version    smallint not null default 1 check (detecteur_version between 1 and 999),
  cle                  text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  objet_type           text not null check (objet_type in ('devis', 'facture', 'lead', 'chantier', 'client', 'materiau', 'rappel', 'commande')),
  objet_id             uuid not null,
  outil                text check (outil is null or outil ~ '^[a-z][a-z0-9_]{1,59}$'),
  niveau               smallint not null default 1 check (niveau between 1 and 3),
  statut               text not null default 'detectee' check (statut in ('detectee', 'a_completer', 'preparee', 'bloquee', 'a_valider',
                         'programmee', 'validee', 'refusee', 'reportee', 'expiree', 'annulee', 'manuel', 'partie', 'reussie', 'echec', 'resolue')),
  montant_centimes     bigint check (montant_centimes is null or montant_centimes between 0 and 100000000000),
  priorite             smallint not null default 0 check (priorite between 0 and 100),
  faits                jsonb not null default '{}'::jsonb,
  motif_blocage        text check (motif_blocage is null or motif_blocage ~ '^[a-z][a-z0-9_]{1,59}$'),
  assistant_action_id  uuid references public.assistant_actions(id) on delete set null,
  action_auto_id       uuid references public.actions_auto(id) on delete set null,
  tentatives           smallint not null default 0 check (tentatives between 0 and 20),
  prochaine_tentative  timestamptz,
  reportee_au          timestamptz,
  expire_le            timestamptz,
  cree_le              timestamptz not null default now(),
  maj_le               timestamptz not null default now(),
  ferme_le             timestamptz,
  constraint opportunites_faits check (public.faits_sans_texte(faits)),
  constraint opportunites_expiration check (expire_le is null or expire_le > cree_le),
  constraint opportunites_bloquee_motif check (statut <> 'bloquee' or motif_blocage is not null),
  constraint opportunites_reportee_date check (statut <> 'reportee' or reportee_au is not null)
);
alter table public.opportunites enable row level security;
drop policy if exists opportunites_lecture on public.opportunites;
create policy opportunites_lecture on public.opportunites for select to authenticated
  using ((select auth.uid()) = artisan_id);
create unique index if not exists opportunites_ouverte_unique on public.opportunites (artisan_id, cle)
  where statut not in ('resolue', 'refusee', 'expiree', 'annulee', 'reussie');
create index if not exists opportunites_compte_statut on public.opportunites (artisan_id, statut, cree_le desc);
create index if not exists opportunites_assistant_action on public.opportunites (assistant_action_id) where assistant_action_id is not null;
create index if not exists opportunites_action_auto on public.opportunites (action_auto_id) where action_auto_id is not null;
create or replace function public.opportunites_cycle() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'detectee' then
      raise exception 'opportunites : une opportunité naît detectee (reçu : %)', new.statut;
    end if;
    new.cree_le := now();
    new.maj_le := now();
    -- L'objet n'est vérifié qu'à la naissance : il ne change plus ensuite (plus bas), et une cascade de suppression du compte
    -- ne doit pas buter sur un objet déjà effacé.
    if not public.automatisation_objet_du_compte(new.artisan_id, new.objet_type, new.objet_id) then
      raise exception 'opportunites : l''objet n''appartient pas à cet artisan';
    end if;
  else
    if new.artisan_id is distinct from old.artisan_id or new.cle is distinct from old.cle or new.detecteur is distinct from old.detecteur
       or new.objet_type is distinct from old.objet_type or new.objet_id is distinct from old.objet_id or new.cree_le is distinct from old.cree_le then
      raise exception 'opportunites : le compte, la clé, le détecteur et l''objet ne changent pas';
    end if;
    if new.statut is distinct from old.statut then
      if (old.statut || '>' || new.statut) <> all (array[
          'detectee>a_completer', 'detectee>preparee', 'detectee>resolue', 'detectee>expiree',
          'a_completer>preparee', 'a_completer>resolue', 'a_completer>expiree',
          'preparee>bloquee', 'preparee>a_valider', 'preparee>programmee', 'preparee>resolue', 'preparee>expiree',
          'bloquee>resolue', 'bloquee>expiree',
          'a_valider>validee', 'a_valider>refusee', 'a_valider>reportee', 'a_valider>expiree', 'a_valider>resolue',
          'reportee>a_valider', 'reportee>expiree', 'reportee>resolue',
          'programmee>annulee', 'programmee>manuel', 'programmee>partie',
          'manuel>validee', 'manuel>refusee', 'manuel>expiree', 'manuel>resolue',
          'validee>partie',
          'partie>reussie', 'partie>echec',
          'echec>partie']) then
        raise exception 'opportunites : passage interdit de % à %', old.statut, new.statut;
      end if;
      -- Aucun départ sans carte confirmée ou ligne de pilote réclamée (cadrage-p3.md:290), lues dans LEUR statut réel :
      --   programmee : niveau 3 et une ligne du pilote qui attend (actions_auto a_partir ou en_cours, 0174) ;
      --   partie : une carte confirmée (assistant_actions en_cours ou executee, 0157) ou une ligne réclamée (en_cours ou partie) ;
      --   reussie : carte executee ou ligne partie ; echec : carte ou ligne en_cours ou en echec.
      if new.statut = 'programmee' and (new.niveau <> 3 or new.action_auto_id is null
         or not exists (select 1 from public.actions_auto a where a.id = new.action_auto_id and a.statut in ('a_partir', 'en_cours'))) then
        raise exception 'opportunites : programmee exige le niveau 3 et sa ligne de pilote en attente';
      end if;
      if new.statut in ('partie', 'reussie', 'echec') and not (
           exists (select 1 from public.assistant_actions a where a.id = new.assistant_action_id
                    and a.statut = any (case new.statut when 'partie' then array['en_cours', 'executee']
                                                        when 'reussie' then array['executee'] else array['en_cours', 'echec'] end))
        or exists (select 1 from public.actions_auto a where a.id = new.action_auto_id
                    and a.statut = any (case new.statut when 'partie' then array['en_cours', 'partie']
                                                        when 'reussie' then array['partie'] else array['en_cours', 'echec'] end))) then
        raise exception 'opportunites : aucun départ sans carte confirmée ni ligne de pilote réclamée';
      end if;
      if new.statut in ('resolue', 'refusee', 'expiree', 'annulee', 'reussie') then
        new.ferme_le := coalesce(new.ferme_le, now());
      end if;
    end if;
    new.maj_le := now();
  end if;
  -- Une carte ou une ligne de pilote rattachée vient du même artisan (vérifié quand elle est posée ; une mise à null passe).
  if new.assistant_action_id is not null and (tg_op = 'INSERT' or new.assistant_action_id is distinct from old.assistant_action_id)
     and not exists (select 1 from public.assistant_actions a where a.id = new.assistant_action_id and a.artisan_id = new.artisan_id) then
    raise exception 'opportunites : carte d''un autre artisan';
  end if;
  if new.action_auto_id is not null and (tg_op = 'INSERT' or new.action_auto_id is distinct from old.action_auto_id)
     and not exists (select 1 from public.actions_auto a where a.id = new.action_auto_id and a.artisan_id = new.artisan_id) then
    raise exception 'opportunites : ligne de pilote d''un autre artisan';
  end if;
  return new;
end
$fn$;
drop trigger if exists opportunites_cycle on public.opportunites;
create trigger opportunites_cycle before insert or update on public.opportunites
  for each row execute function public.opportunites_cycle();
create table if not exists public.opportunites_decisions (
  id               uuid primary key default gen_random_uuid(),
  opportunite_id   uuid not null references public.opportunites(id) on delete cascade,
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  acteur_id        uuid,
  decision         text not null check (decision in ('valider', 'modifier_valider', 'refuser', 'reporter', 'annuler', 'rejouer')),
  motif            text check (motif is null or motif ~ '^[a-z][a-z0-9_]{1,59}$'),
  empreinte_avant  text check (empreinte_avant is null or empreinte_avant ~ '^[0-9a-f]{64}$'),
  empreinte_apres  text check (empreinte_apres is null or empreinte_apres ~ '^[0-9a-f]{64}$'),
  cree_le          timestamptz not null default now()
);
alter table public.opportunites_decisions enable row level security;
drop policy if exists opportunites_decisions_lecture on public.opportunites_decisions;
create policy opportunites_decisions_lecture on public.opportunites_decisions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists opportunites_decisions_opportunite on public.opportunites_decisions (opportunite_id);
create index if not exists opportunites_decisions_compte_date on public.opportunites_decisions (artisan_id, cree_le desc);
create or replace function public.opportunites_decisions_journal() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'UPDATE' then
    raise exception 'opportunites_decisions : une décision ne se réécrit pas';
  end if;
  if not exists (select 1 from public.opportunites o where o.id = new.opportunite_id and o.artisan_id = new.artisan_id) then
    raise exception 'opportunites_decisions : l''opportunité n''appartient pas à cet artisan';
  end if;
  return new;
end
$fn$;
drop trigger if exists opportunites_decisions_journal on public.opportunites_decisions;
create trigger opportunites_decisions_journal before insert or update on public.opportunites_decisions
  for each row execute function public.opportunites_decisions_journal();
create table if not exists public.relances_exclusions (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete cascade,
  lead_id     uuid references public.leads(id) on delete cascade,
  motif       text check (motif is null or motif ~ '^[a-z][a-z0-9_]{1,59}$'),
  acteur_id   uuid,
  cree_le     timestamptz not null default now(),
  levee_le    timestamptz,
  leve_par    uuid,
  constraint relances_exclusions_cible check ((client_id is null) <> (lead_id is null)),
  constraint relances_exclusions_levee check (levee_le is null or levee_le >= cree_le)
);
alter table public.relances_exclusions enable row level security;
drop policy if exists relances_exclusions_lecture on public.relances_exclusions;
create policy relances_exclusions_lecture on public.relances_exclusions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create unique index if not exists relances_exclusions_client_unique on public.relances_exclusions (artisan_id, client_id)
  where levee_le is null and client_id is not null;
create unique index if not exists relances_exclusions_lead_unique on public.relances_exclusions (artisan_id, lead_id)
  where levee_le is null and lead_id is not null;
create index if not exists relances_exclusions_compte on public.relances_exclusions (artisan_id);
create index if not exists relances_exclusions_client on public.relances_exclusions (client_id) where client_id is not null;
create index if not exists relances_exclusions_lead on public.relances_exclusions (lead_id) where lead_id is not null;
create or replace function public.relances_exclusions_coherence() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.client_id is distinct from old.client_id
                           or new.lead_id is distinct from old.lead_id or new.cree_le is distinct from old.cree_le) then
    raise exception 'relances_exclusions : seule la levée se modifie';
  end if;
  if tg_op = 'UPDATE' and old.levee_le is not null and new.levee_le is distinct from old.levee_le then
    raise exception 'relances_exclusions : une exclusion levée le reste (en poser une nouvelle)';
  end if;
  if tg_op = 'UPDATE' then
    return new;
  end if;
  if new.client_id is not null and not public.automatisation_objet_du_compte(new.artisan_id, 'client', new.client_id) then
    raise exception 'relances_exclusions : le client n''appartient pas à cet artisan';
  end if;
  if new.lead_id is not null and not public.automatisation_objet_du_compte(new.artisan_id, 'lead', new.lead_id) then
    raise exception 'relances_exclusions : la conversation n''appartient pas à cet artisan';
  end if;
  return new;
end
$fn$;
drop trigger if exists relances_exclusions_coherence on public.relances_exclusions;
create trigger relances_exclusions_coherence before insert or update on public.relances_exclusions
  for each row execute function public.relances_exclusions_coherence();
alter table public.relances_impayes_arrets add column if not exists motif text;
alter table public.relances_impayes_arrets drop constraint if exists relances_impayes_arrets_motif;
alter table public.relances_impayes_arrets add constraint relances_impayes_arrets_motif
  check (motif is null or motif in ('oubli', 'dit_avoir_paye', 'litige', 'autre'));
do $gardes$
declare t text;
begin
  foreach t in array array['evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites',
                           'opportunites_decisions', 'relances_exclusions'] loop
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
revoke all on public.passages_detecteurs from authenticated;
comment on table public.evenements_metier is 'Faits métier datés, uniques par (artisan_id, cle), sans texte libre (0185). Écrits par la clé de service ; l artisan lit les siens.';
comment on table public.detecteurs_reglages is 'Réglage d un détecteur n8n par compte : coupé par défaut, seuils numériques (0185).';
comment on table public.autonomie_reglages is 'Niveau 1 à 3 par type d action, plafond par jour, posé par l artisan ou par Presti (0185). pilote_reglages reste en place.';
comment on table public.passages_detecteurs is 'Bilan agrégé de chaque passage de n8n, unique par cle (0185). Clé de service seulement.';
comment on table public.opportunites is 'Constats des détecteurs et leur cycle (cadrage-p3 §4.2) ; une seule ouverte par (artisan_id, cle) ; montant en centimes calculé par le code (0185).';
comment on table public.opportunites_decisions is 'Journal des gestes sur une opportunité : décision, motif codé, empreintes du texte (0185). Ne se réécrit pas.';
comment on table public.relances_exclusions is 'Ne plus relancer ce client : une exclusion en cours par client ou par conversation ; se lève, ne s efface pas (0185).';
comment on column public.relances_impayes_arrets.motif is 'Motif rangé par l artisan après une réponse du client (0185) : oubli, dit_avoir_paye, litige, autre ; null = pas encore rangé.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables neuves (attendu : 7)' as quoi, count(*)::text as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'tables neuves sans RLS (attendu : aucune)', coalesce(string_agg(c.relname, ', '), 'aucune')
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not c.relrowsecurity
   and c.relname in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'gardes de session posées (attendu : 28)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')
   and tablename in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'droits restants pour anon (attendu : aucun)', coalesce(string_agg(distinct table_name, ', '), 'aucun')
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'écritures ouvertes à authenticated (attendu : aucune)', coalesce(string_agg(distinct table_name, ', '), 'aucune')
  from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public'
   and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
   and table_name in ('evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions')
union all
select 'index unique des opportunités ouvertes (attendu : 1)', count(*)::text
  from pg_catalog.pg_indexes where schemaname = 'public' and indexname = 'opportunites_ouverte_unique'
union all
select 'colonne motif des arrêts d impayé (attendu : 1)', count(*)::text
  from information_schema.columns where table_schema = 'public' and table_name = 'relances_impayes_arrets' and column_name = 'motif';
