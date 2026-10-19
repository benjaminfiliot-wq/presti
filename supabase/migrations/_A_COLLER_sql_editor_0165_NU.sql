---------------------------- _A_COLLER_sql_editor_0165_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.crm_apres_chantier (
  artisan_id       uuid primary key references public.artisans(id) on delete cascade,
  avis             boolean not null default false,
  entretien        boolean not null default false,
  texte_avis       text check (texte_avis is null or char_length(texte_avis) between 20 and 1500),
  texte_entretien  text check (texte_entretien is null or char_length(texte_entretien) between 20 and 1500),
  actif_depuis     timestamptz,
  maj_le           timestamptz not null default now()
);
alter table public.crm_rappels drop constraint if exists crm_rappels_type_check;
alter table public.crm_rappels add constraint crm_rappels_type_check
  check (type in ('rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre', 'demande_avis', 'entretien'));
alter table public.crm_apres_chantier enable row level security;
drop policy if exists crm_apres_chantier_lecture on public.crm_apres_chantier;
create policy crm_apres_chantier_lecture on public.crm_apres_chantier for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.crm_apres_chantier;
create policy garde_session on public.crm_apres_chantier as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.crm_apres_chantier;
create policy garde_suspension_ins on public.crm_apres_chantier as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.crm_apres_chantier;
create policy garde_suspension_maj on public.crm_apres_chantier as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.crm_apres_chantier;
create policy garde_suspension_sup on public.crm_apres_chantier as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.crm_apres_chantier from anon;
revoke insert, update, delete on public.crm_apres_chantier from authenticated;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables' as quoi, string_agg(table_name, ', ' order by table_name) as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('tickets', 'acces_support', 'acces_support_lectures', 'support_verrou')
union all
select 'fonctions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines where routine_schema = 'public' and routine_name like '%support%'
union all
select 'policies fondateur restantes', coalesce(string_agg(policyname, ', '), 'aucune (attendu)')
  from pg_policies where schemaname = 'public' and policyname like 'founders_all_%';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'RLS active (attendu true)' as quoi, relrowsecurity::text as resultat from pg_class where oid = 'public.crm_apres_chantier'::regclass
union all select 'politiques (attendu 5)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_apres_chantier'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.crm_apres_chantier', 'select')::text
union all select 'authenticated ecrit (attendu false)', has_table_privilege('authenticated', 'public.crm_apres_chantier', 'insert')::text
union all select 'types demande_avis et entretien (attendu true)', (pg_get_constraintdef(oid) like '%demande_avis%entretien%')::text from pg_constraint where conname = 'crm_rappels_type_check'
union all select 'hors temps reel (attendu 0)', count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'crm_apres_chantier';
