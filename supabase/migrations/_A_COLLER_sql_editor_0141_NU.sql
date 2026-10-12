---------------------------- _A_COLLER_sql_editor_0141_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.equipe_membres (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  nom         text not null check (char_length(nom) between 1 and 120),
  role        text not null default 'compagnon' check (role in ('artisan', 'compagnon', 'apprenti', 'salarie', 'sous_traitant', 'autre')),
  telephone   text check (telephone is null or char_length(telephone) <= 30),
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);
create index if not exists equipe_membres_artisan_idx on public.equipe_membres (artisan_id, actif);
create table if not exists public.vehicules (
  id                      uuid primary key default gen_random_uuid(),
  artisan_id              uuid not null references public.artisans(id) on delete cascade,
  nom                     text not null check (char_length(nom) between 1 and 80),
  immatriculation         text check (immatriculation is null or char_length(immatriculation) <= 20),
  conducteur_id           uuid references public.equipe_membres(id) on delete set null,
  controle_technique_le   date,
  entretien_le            date,
  notes                   text check (notes is null or char_length(notes) <= 1000),
  actif                   boolean not null default true,
  cree_le                 timestamptz not null default now(),
  maj_le                  timestamptz not null default now()
);
create index if not exists vehicules_artisan_idx on public.vehicules (artisan_id, actif);
create index if not exists vehicules_conducteur_idx on public.vehicules (conducteur_id) where conducteur_id is not null;
create table if not exists public.chantiers (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  devis_id         uuid references public.devis(id) on delete set null,
  client_nom       text check (client_nom is null or char_length(client_nom) <= 200),
  titre            text not null check (char_length(titre) between 1 and 200),
  adresse          text check (adresse is null or char_length(adresse) <= 300),
  code_postal      text check (code_postal is null or char_length(code_postal) <= 10),
  ville            text check (ville is null or char_length(ville) <= 80),
  statut           text not null default 'a_planifier'
                   check (statut in ('a_planifier', 'planifie', 'en_cours', 'en_pause', 'termine', 'annule')),
  date_debut       date,
  date_fin_prevue  date,
  date_fin_reelle  date,
  vehicule_id      uuid references public.vehicules(id) on delete set null,
  notes            text check (notes is null or char_length(notes) <= 4000),
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  constraint chantiers_dates_ordre check (date_debut is null or date_fin_prevue is null or date_fin_prevue >= date_debut)
);
create index if not exists chantiers_artisan_idx on public.chantiers (artisan_id, statut);
create unique index if not exists chantiers_devis_unique on public.chantiers (devis_id) where devis_id is not null;
create index if not exists chantiers_vehicule_idx on public.chantiers (vehicule_id) where vehicule_id is not null;
create table if not exists public.chantier_equipe (
  chantier_id  uuid not null references public.chantiers(id) on delete cascade,
  membre_id    uuid not null references public.equipe_membres(id) on delete cascade,
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  cree_le      timestamptz not null default now(),
  primary key (chantier_id, membre_id)
);
create index if not exists chantier_equipe_membre_idx on public.chantier_equipe (membre_id);
create index if not exists chantier_equipe_artisan_idx on public.chantier_equipe (artisan_id);
create table if not exists public.chantier_taches (
  id              uuid primary key default gen_random_uuid(),
  artisan_id      uuid not null references public.artisans(id) on delete cascade,
  chantier_id     uuid not null references public.chantiers(id) on delete cascade,
  devis_ligne_id  uuid references public.devis_lignes(id) on delete set null,
  libelle         text not null check (char_length(libelle) between 1 and 300),
  quantite        numeric(12,2) check (quantite is null or quantite >= 0),
  unite           text check (unite is null or char_length(unite) <= 16),
  ordre           integer not null default 0,
  faite           boolean not null default false,
  faite_le        timestamptz,
  membre_id       uuid references public.equipe_membres(id) on delete set null,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
create index if not exists chantier_taches_chantier_idx on public.chantier_taches (chantier_id, ordre);
create index if not exists chantier_taches_artisan_idx on public.chantier_taches (artisan_id);
create index if not exists chantier_taches_membre_idx on public.chantier_taches (membre_id) where membre_id is not null;
create unique index if not exists chantier_taches_ligne_unique on public.chantier_taches (chantier_id, devis_ligne_id) where devis_ligne_id is not null;
create table if not exists public.chantier_materiaux (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  chantier_id  uuid not null references public.chantiers(id) on delete cascade,
  materiau_id  uuid not null references public.materiaux(id) on delete cascade,
  quantite     numeric(12,2) not null check (quantite > 0),
  lieu         text not null default 'atelier' check (char_length(lieu) between 1 and 60),
  statut       text not null default 'reserve' check (statut in ('reserve', 'sorti', 'annule')),
  sorti_le     timestamptz,
  note         text check (note is null or char_length(note) <= 300),
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now()
);
create index if not exists chantier_materiaux_chantier_idx on public.chantier_materiaux (chantier_id);
create index if not exists chantier_materiaux_materiau_idx on public.chantier_materiaux (materiau_id);
create index if not exists chantier_materiaux_artisan_idx on public.chantier_materiaux (artisan_id, statut);
create table if not exists public.crm_notes (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  client_cle   text check (client_cle is null or client_cle ~ '^[0-9a-f]{64}$'),
  chantier_id  uuid references public.chantiers(id) on delete cascade,
  lead_id      uuid references public.leads(id) on delete cascade,
  texte        text not null check (char_length(texte) between 1 and 4000),
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  constraint crm_notes_une_cible check (client_cle is not null or chantier_id is not null or lead_id is not null)
);
create index if not exists crm_notes_client_idx on public.crm_notes (artisan_id, client_cle) where client_cle is not null;
create index if not exists crm_notes_chantier_idx on public.crm_notes (chantier_id) where chantier_id is not null;
create index if not exists crm_notes_lead_idx on public.crm_notes (lead_id) where lead_id is not null;
create table if not exists public.crm_journal (
  id             uuid primary key default gen_random_uuid(),
  artisan_id     uuid not null references public.artisans(id) on delete cascade,
  objet          text not null check (objet in ('lead', 'devis', 'chantier', 'tache', 'materiau')),
  objet_id       uuid not null,
  chantier_id    uuid references public.chantiers(id) on delete set null,
  champ          text not null check (champ in ('etape', 'statut', 'faite', 'sortie', 'creation')),
  de             text check (de is null or char_length(de) <= 80),
  vers           text check (vers is null or char_length(vers) <= 80),
  origine        text not null default 'artisan' check (origine in ('artisan', 'systeme')),
  etape_derivee  text check (etape_derivee is null or etape_derivee in ('demande', 'devis_envoye', 'signe', 'chantier', 'a_facturer', 'paye', 'classe')),
  note           text check (note is null or char_length(note) <= 300),
  cree_le        timestamptz not null default now()
);
create index if not exists crm_journal_artisan_idx on public.crm_journal (artisan_id, cree_le desc);
create index if not exists crm_journal_objet_idx on public.crm_journal (artisan_id, objet, objet_id, cree_le desc);
create index if not exists crm_journal_chantier_idx on public.crm_journal (chantier_id, cree_le desc) where chantier_id is not null;
alter table public.equipe_membres     enable row level security;
alter table public.vehicules          enable row level security;
alter table public.chantiers          enable row level security;
alter table public.chantier_equipe    enable row level security;
alter table public.chantier_taches    enable row level security;
alter table public.chantier_materiaux enable row level security;
alter table public.crm_notes          enable row level security;
alter table public.crm_journal        enable row level security;
drop policy if exists equipe_membres_own on public.equipe_membres;
create policy equipe_membres_own on public.equipe_membres for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists vehicules_own on public.vehicules;
create policy vehicules_own on public.vehicules for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists chantiers_own on public.chantiers;
create policy chantiers_own on public.chantiers for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists chantier_equipe_own on public.chantier_equipe;
create policy chantier_equipe_own on public.chantier_equipe for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists chantier_taches_own on public.chantier_taches;
create policy chantier_taches_own on public.chantier_taches for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists chantier_materiaux_own on public.chantier_materiaux;
create policy chantier_materiaux_own on public.chantier_materiaux for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists crm_notes_own on public.crm_notes;
create policy crm_notes_own on public.crm_notes for all to authenticated
  using ((select auth.uid()) = artisan_id) with check ((select auth.uid()) = artisan_id);
drop policy if exists crm_journal_lecture on public.crm_journal;
create policy crm_journal_lecture on public.crm_journal for select to authenticated
  using ((select auth.uid()) = artisan_id);
create or replace function public.crm_verifier_proprietaire()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  if tg_table_name = 'vehicules' then
    if new.conducteur_id is not null and not exists (select 1 from equipe_membres m where m.id = new.conducteur_id and m.artisan_id = new.artisan_id) then
      raise exception 'crm : conducteur d un autre artisan';
    end if;
  elsif tg_table_name = 'chantiers' then
    if new.devis_id is not null and not exists (select 1 from devis d where d.id = new.devis_id and d.artisan_id = new.artisan_id) then
      raise exception 'crm : devis d un autre artisan';
    end if;
    if new.vehicule_id is not null and not exists (select 1 from vehicules v where v.id = new.vehicule_id and v.artisan_id = new.artisan_id) then
      raise exception 'crm : vehicule d un autre artisan';
    end if;
  elsif tg_table_name = 'chantier_equipe' then
    if not exists (select 1 from chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
      raise exception 'crm : chantier d un autre artisan';
    end if;
    if not exists (select 1 from equipe_membres m where m.id = new.membre_id and m.artisan_id = new.artisan_id) then
      raise exception 'crm : membre d un autre artisan';
    end if;
  elsif tg_table_name = 'chantier_taches' then
    if not exists (select 1 from chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
      raise exception 'crm : chantier d un autre artisan';
    end if;
    if new.membre_id is not null and not exists (select 1 from equipe_membres m where m.id = new.membre_id and m.artisan_id = new.artisan_id) then
      raise exception 'crm : membre d un autre artisan';
    end if;
    -- La ligne de devis doit être une ligne du devis DE CE chantier (pas seulement un devis du même artisan).
    if new.devis_ligne_id is not null and not exists (
      select 1 from devis_lignes l join chantiers c on c.devis_id = l.devis_id
       where l.id = new.devis_ligne_id and c.id = new.chantier_id and c.artisan_id = new.artisan_id
    ) then
      raise exception 'crm : ligne d un autre devis';
    end if;
  elsif tg_table_name = 'chantier_materiaux' then
    if not exists (select 1 from chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
      raise exception 'crm : chantier d un autre artisan';
    end if;
    if not exists (select 1 from materiaux m where m.id = new.materiau_id and m.artisan_id = new.artisan_id) then
      raise exception 'crm : materiau d un autre artisan';
    end if;
  elsif tg_table_name = 'crm_notes' then
    if new.chantier_id is not null and not exists (select 1 from chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
      raise exception 'crm : chantier d un autre artisan';
    end if;
    if new.lead_id is not null and not exists (select 1 from leads l where l.id = new.lead_id and l.artisan_id = new.artisan_id) then
      raise exception 'crm : demande d un autre artisan';
    end if;
  elsif tg_table_name = 'crm_journal' then
    if new.chantier_id is not null and not exists (select 1 from chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
      raise exception 'crm : chantier d un autre artisan';
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists crm_proprietaire on public.vehicules;
create trigger crm_proprietaire before insert or update on public.vehicules
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.chantiers;
create trigger crm_proprietaire before insert or update on public.chantiers
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.chantier_equipe;
create trigger crm_proprietaire before insert or update on public.chantier_equipe
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.chantier_taches;
create trigger crm_proprietaire before insert or update on public.chantier_taches
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.chantier_materiaux;
create trigger crm_proprietaire before insert or update on public.chantier_materiaux
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.crm_notes;
create trigger crm_proprietaire before insert or update on public.crm_notes
  for each row execute function public.crm_verifier_proprietaire();
drop trigger if exists crm_proprietaire on public.crm_journal;
create trigger crm_proprietaire before insert or update on public.crm_journal
  for each row execute function public.crm_verifier_proprietaire();
create or replace function public.crm_journal_chantier()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    insert into crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers)
    values (new.artisan_id, 'chantier', new.id, new.id, 'creation', null, new.statut);
  elsif new.statut is distinct from old.statut then
    insert into crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers)
    values (new.artisan_id, 'chantier', new.id, new.id, 'statut', old.statut, new.statut);
  end if;
  return new;
end $fn$;
drop trigger if exists crm_journal_chantier on public.chantiers;
create trigger crm_journal_chantier after insert or update of statut on public.chantiers
  for each row execute function public.crm_journal_chantier();
create or replace function public.crm_journal_tache()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.faite is distinct from old.faite then
    insert into crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers, note)
    values (new.artisan_id, 'tache', new.id, new.chantier_id, 'faite', old.faite::text, new.faite::text, left(new.libelle, 300));
  end if;
  return new;
end $fn$;
drop trigger if exists crm_journal_tache on public.chantier_taches;
create trigger crm_journal_tache after update of faite on public.chantier_taches
  for each row execute function public.crm_journal_tache();
revoke all on function public.crm_journal_chantier() from public, anon, authenticated;
revoke all on function public.crm_journal_tache() from public, anon, authenticated;
create or replace function public.crm_sortir_materiau(p_artisan uuid, p_reservation uuid)
returns numeric language plpgsql security definer set search_path = public as $fn$
declare
  r       chantier_materiaux%rowtype;
  c       chantiers%rowtype;
  v_reste numeric;
begin
  select * into r from chantier_materiaux where id = p_reservation and artisan_id = p_artisan for update;
  if not found then raise exception 'crm : reservation introuvable'; end if;
  if r.statut <> 'reserve' then raise exception 'crm : reservation deja traitee'; end if;
  select * into c from chantiers where id = r.chantier_id and artisan_id = p_artisan;
  if not found then raise exception 'crm : chantier introuvable'; end if;
  v_reste := appliquer_mouvement(p_artisan, r.materiau_id, 'sortie', r.quantite, r.lieu, c.devis_id, 'devis', null,
                                 left('Chantier : ' || c.titre, 300));
  update chantier_materiaux set statut = 'sorti', sorti_le = now(), maj_le = now() where id = r.id;
  insert into crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers, note)
  values (p_artisan, 'materiau', r.id, r.chantier_id, 'sortie', 'reserve', 'sorti', left(r.quantite::text || ' — ' || r.lieu, 300));
  return v_reste;
end $fn$;
revoke all on function public.crm_sortir_materiau(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_sortir_materiau(uuid, uuid) to service_role;
comment on table public.chantiers is
  'CRM (0141) : ce que le devis ne dit pas d un chantier (dates, statut, equipe, vehicule). Client, montant et lignes se lisent sur devis_id. RLS par artisan.';
comment on table public.crm_journal is
  'CRM (0141) : changements de statut, taches cochees, sorties de materiaux, deplacements manuels du pipeline. Lecture artisan, ecriture service et declencheurs.';
comment on column public.crm_notes.client_cle is
  'Empreinte sha-256 (hex) de la cle de regroupement du client (lib/crm/clients.ts) : jamais l adresse ni le nom en clair.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables (attendu 8)' as quoi, count(*)::text as resultat from information_schema.tables
 where table_schema = 'public' and table_name in ('equipe_membres','vehicules','chantiers','chantier_equipe','chantier_taches','chantier_materiaux','crm_notes','crm_journal')
union all
select 'RLS active (attendu 8)', count(*)::text from pg_class
 where relnamespace = 'public'::regnamespace and relrowsecurity
   and relname in ('equipe_membres','vehicules','chantiers','chantier_equipe','chantier_taches','chantier_materiaux','crm_notes','crm_journal')
union all
select 'politiques (attendu 8)', count(*)::text from pg_policies
 where schemaname = 'public' and tablename in ('equipe_membres','vehicules','chantiers','chantier_equipe','chantier_taches','chantier_materiaux','crm_notes','crm_journal')
union all
select 'declencheurs proprietaire (attendu 7)', count(*)::text from pg_trigger where tgname = 'crm_proprietaire' and not tgisinternal
union all
select 'sortie executable par un navigateur (attendu false)', has_function_privilege('authenticated', 'public.crm_sortir_materiau(uuid, uuid)', 'execute')::text;
