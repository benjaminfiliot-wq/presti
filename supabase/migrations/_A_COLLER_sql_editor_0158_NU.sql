---------------------------- _A_COLLER_sql_editor_0158_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.commandes_fournisseur (
  id                   uuid primary key default gen_random_uuid(),
  artisan_id           uuid not null references public.artisans(id) on delete cascade,
  fournisseur_id       uuid references public.fournisseurs(id) on delete set null,
  fournisseur_nom      text not null check (char_length(fournisseur_nom) between 1 and 120),
  fournisseur_contact  text check (fournisseur_contact is null or char_length(fournisseur_contact) <= 200),
  reference            text check (reference is null or char_length(reference) <= 60),
  statut               text not null default 'commandee' check (statut in ('commandee', 'recue', 'annulee')),
  commandee_le         date not null default current_date,
  livraison_prevue     date not null,
  recue_le             date,
  chantier_id          uuid references public.chantiers(id) on delete set null,
  lignes               jsonb not null default '[]'::jsonb
                       check (jsonb_typeof(lignes) = 'array' and jsonb_array_length(lignes) between 1 and 50),
  note                 text check (note is null or char_length(note) <= 500),
  relances             integer not null default 0 check (relances between 0 and 50),
  relance_le           timestamptz,
  cree_le              timestamptz not null default now(),
  maj_le               timestamptz not null default now(),
  constraint commandes_dates_ordre check (livraison_prevue >= commandee_le),
  constraint commandes_recue_coherente check ((statut = 'recue') = (recue_le is not null))
);
create index if not exists commandes_artisan_idx on public.commandes_fournisseur (artisan_id, statut, livraison_prevue);
create index if not exists commandes_chantier_idx on public.commandes_fournisseur (chantier_id) where chantier_id is not null;

create or replace function public.crm_commande_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
declare l jsonb; m text;
begin
  if new.chantier_id is not null and not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if new.fournisseur_id is not null and not exists (select 1 from public.fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id) then
    raise exception 'crm : fournisseur d un autre artisan';
  end if;
  for l in select * from jsonb_array_elements(new.lignes) loop
    m := l->>'materiau_id';
    if m is not null and not exists (select 1 from public.materiaux x where x.id::text = m and x.artisan_id = new.artisan_id) then
      raise exception 'crm : materiau d un autre artisan';
    end if;
  end loop;
  new.maj_le := now();
  return new;
end $fn$;
drop trigger if exists crm_commande_verifier on public.commandes_fournisseur;
create trigger crm_commande_verifier before insert or update on public.commandes_fournisseur
  for each row execute function public.crm_commande_verifier();

alter table public.commandes_fournisseur enable row level security;
drop policy if exists commandes_fournisseur_lecture on public.commandes_fournisseur;
create policy commandes_fournisseur_lecture on public.commandes_fournisseur for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.commandes_fournisseur;
create policy garde_session on public.commandes_fournisseur as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.commandes_fournisseur;
create policy garde_suspension_ins on public.commandes_fournisseur as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.commandes_fournisseur;
create policy garde_suspension_maj on public.commandes_fournisseur as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.commandes_fournisseur;
create policy garde_suspension_sup on public.commandes_fournisseur as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.commandes_fournisseur from anon;
revoke insert, update, delete on public.commandes_fournisseur from authenticated;

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux',
                           'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
