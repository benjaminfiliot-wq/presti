---------------------------- _A_COLLER_sql_editor_0190_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.demandes_demo (
  id               uuid primary key default gen_random_uuid(),
  motif            text not null default 'entreprise' check (motif in ('entreprise')),
  taille           text not null check (taille in ('1', '2 à 5', '6 à 20', 'plus de 20')),
  activite         text not null check (activite in ('Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre')),
  prenom           text not null check (char_length(prenom) between 1 and 120),
  email            text not null check (char_length(email) between 3 and 200 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message          text check (message is null or char_length(message) between 1 and 4000),
  etat             text not null default 'nouvelle' check (etat in ('nouvelle', 'traitee')),
  rendez_vous_le   timestamptz,
  fiche_diagnostic jsonb check (fiche_diagnostic is null or jsonb_typeof(fiche_diagnostic) = 'object'),
  traitee_le       timestamptz,
  traitee_par      uuid,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  check ((etat = 'traitee') = (traitee_le is not null))
);
comment on table public.demandes_demo is
  'Demandes de démo « Presti pour l''entreprise » (0190, chantier 4 L19). Écrites par /api/contact (clé de service, drapeau demandesDemo), lues et marquées « traitée » par le Poste de contrôle. Sans IP. Jamais lisible par un jeton de navigateur.';
comment on column public.demandes_demo.etat is 'nouvelle | traitee — le geste « traitée » du Poste de contrôle (app/api/controle/demandes-demo).';
comment on column public.demandes_demo.fiche_diagnostic is 'Fiche de diagnostic du premier échange (plan du chantier 4, rang 17). Jamais dans le vault.';
create index if not exists demandes_demo_cree_le_idx on public.demandes_demo (cree_le desc);
create index if not exists demandes_demo_nouvelles_idx on public.demandes_demo (cree_le) where etat = 'nouvelle';
create or replace function public.demandes_demo_maj() returns trigger
language plpgsql set search_path = public as $maj$
begin
  new.maj_le := now();
  return new;
end
$maj$;
drop trigger if exists demandes_demo_maj on public.demandes_demo;
create trigger demandes_demo_maj before update on public.demandes_demo
  for each row execute function public.demandes_demo_maj();
alter table public.demandes_demo enable row level security;
revoke all on table public.demandes_demo from public, anon, authenticated;
revoke all on function public.demandes_demo_maj() from public, anon, authenticated;
drop policy if exists garde_session on public.demandes_demo;
create policy garde_session on public.demandes_demo as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.demandes_demo;
create policy garde_suspension_ins on public.demandes_demo as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.demandes_demo;
create policy garde_suspension_maj on public.demandes_demo as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.demandes_demo;
create policy garde_suspension_sup on public.demandes_demo as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
do $lecture$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    execute 'grant select (id, motif, taille, activite, etat, cree_le, maj_le, traitee_le) on public.demandes_demo to n8n_lecture';
    execute 'drop policy if exists n8n_lecture_select on public.demandes_demo';
    execute 'create policy n8n_lecture_select on public.demandes_demo for select to n8n_lecture using (true)';
  end if;
end
$lecture$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'table' as quoi, coalesce(string_agg(table_name, ', '), 'ABSENTE') as resultat
  from information_schema.tables where table_schema = 'public' and table_name = 'demandes_demo'
union all
select 'rls active', coalesce((select relrowsecurity::text from pg_class where oid = 'public.demandes_demo'::regclass), 'ABSENTE')
union all
select 'politiques', coalesce(string_agg(policyname, ', ' order by policyname), 'aucune')
  from pg_policies where schemaname = 'public' and tablename = 'demandes_demo'
union all
select 'droits anon ou authenticated (attendu : aucun)', coalesce(string_agg(grantee || ':' || privilege_type, ', '), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'demandes_demo' and grantee in ('anon', 'authenticated')
union all
select 'lignes', count(*)::text from public.demandes_demo;
