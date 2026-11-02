---------------------------- _A_COLLER_sql_editor_0191_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.suivi_artisan_envois (
  cle         text primary key,
  artisan_id  uuid not null references public.artisans (id) on delete cascade,
  etape       text not null check (etape in ('premiers_pas', 'bilan_j14', 'bilan_j30')),
  envoye_le   timestamptz not null default now(),
  constraint suivi_artisan_envois_cle_forme check (cle = 'suivi:' || artisan_id::text || ':' || etape)
);
comment on table public.suivi_artisan_envois is
  'Registre des e-mails du suivi des artisans (0191, chantier 4 L17). Une ligne par envoi réussi, clé suivi:<artisan_id>:<étape>. Lu par le workflow n8n presti-suivi-artisan (garde : clé déjà envoyée, 5 jours d''écart). Écrit par la clé de service seulement. Aucune donnée personnelle.';
comment on column public.suivi_artisan_envois.etape is 'premiers_pas | bilan_j14 | bilan_j30 — les étapes du brief c4-n8n-suivi-artisan.md.';
create index if not exists suivi_artisan_envois_artisan_idx on public.suivi_artisan_envois (artisan_id, envoye_le desc);
alter table public.suivi_artisan_envois enable row level security;
revoke all on table public.suivi_artisan_envois from public, anon, authenticated;
drop policy if exists garde_session on public.suivi_artisan_envois;
create policy garde_session on public.suivi_artisan_envois as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.suivi_artisan_envois;
create policy garde_suspension_ins on public.suivi_artisan_envois as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.suivi_artisan_envois;
create policy garde_suspension_maj on public.suivi_artisan_envois as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.suivi_artisan_envois;
create policy garde_suspension_sup on public.suivi_artisan_envois as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
do $lecture$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    execute 'grant select (cle, artisan_id, etape, envoye_le) on public.suivi_artisan_envois to n8n_lecture';
    execute 'drop policy if exists n8n_lecture_select on public.suivi_artisan_envois';
    execute 'create policy n8n_lecture_select on public.suivi_artisan_envois for select to n8n_lecture using (true)';
    execute 'grant select (notifications) on public.artisans to n8n_lecture';
  else
    raise notice '0191 : rôle n8n_lecture absent (0189 non appliquée) — droits de lecture de n8n à rejouer après 0189';
  end if;
end
$lecture$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'table' as quoi, coalesce(string_agg(table_name, ', '), 'ABSENTE') as resultat
  from information_schema.tables where table_schema = 'public' and table_name = 'suivi_artisan_envois'
union all
select 'rls active', coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.suivi_artisan_envois')), 'ABSENTE')
union all
select 'politiques', coalesce(string_agg(policyname, ', ' order by policyname), 'aucune')
  from pg_policies where schemaname = 'public' and tablename = 'suivi_artisan_envois'
union all
select 'droits anon ou authenticated (attendu : aucun)', coalesce(string_agg(grantee || ':' || privilege_type, ', '), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'suivi_artisan_envois' and grantee in ('anon', 'authenticated')
union all
select 'colonnes lues par n8n_lecture (attendu : artisan_id, cle, envoye_le, etape)', coalesce(string_agg(column_name, ', ' order by column_name), 'aucune (0189 absente ?)')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'suivi_artisan_envois' and grantee = 'n8n_lecture' and privilege_type = 'SELECT'
union all
select 'artisans.notifications lue par n8n_lecture', coalesce(string_agg(column_name, ', '), 'non')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'artisans' and column_name = 'notifications' and grantee = 'n8n_lecture'
union all
select 'lignes', count(*)::text from public.suivi_artisan_envois;
