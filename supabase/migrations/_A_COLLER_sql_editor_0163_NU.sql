---------------------------- _A_COLLER_sql_editor_0163_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chantier-pieces', 'chantier-pieces', false, 4194304, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']::text[])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = excluded.allowed_mime_types;
create table if not exists public.chantier_pieces (
  id           uuid primary key default gen_random_uuid(),
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  chantier_id  uuid not null references public.chantiers(id) on delete cascade,
  chemin       text not null unique check (chemin ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png|pdf)$'),
  type         text not null default 'pendant' check (type in ('avant', 'pendant', 'apres', 'probleme', 'facture_fournisseur', 'plan', 'autre')),
  legende      text check (legende is null or char_length(legende) <= 200),
  pris_le      timestamptz not null default now(),
  taille       integer not null check (taille between 1 and 4194304),
  mime         text not null check (mime in ('image/webp', 'image/jpeg', 'image/png', 'application/pdf')),
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now()
);
create index if not exists chantier_pieces_chantier_idx on public.chantier_pieces (chantier_id, pris_le desc);
create index if not exists chantier_pieces_artisan_idx on public.chantier_pieces (artisan_id);
create or replace function public.crm_piece_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if split_part(new.chemin, '/', 1) <> new.artisan_id::text or split_part(new.chemin, '/', 2) <> new.chantier_id::text then
    raise exception 'crm : chemin hors du dossier du compte';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.chantier_id is distinct from old.chantier_id or new.chemin is distinct from old.chemin) then
    raise exception 'crm : une piece ne change ni de compte, ni de chantier, ni de fichier';
  end if;
  new.maj_le := now();
  return new;
end $fn$;
drop trigger if exists crm_piece_verifier on public.chantier_pieces;
create trigger crm_piece_verifier before insert or update on public.chantier_pieces
  for each row execute function public.crm_piece_verifier();
alter table public.chantier_pieces enable row level security;
drop policy if exists chantier_pieces_lecture on public.chantier_pieces;
create policy chantier_pieces_lecture on public.chantier_pieces for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.chantier_pieces;
create policy garde_session on public.chantier_pieces as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.chantier_pieces;
create policy garde_suspension_ins on public.chantier_pieces as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.chantier_pieces;
create policy garde_suspension_maj on public.chantier_pieces as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.chantier_pieces;
create policy garde_suspension_sup on public.chantier_pieces as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.chantier_pieces from anon;
revoke insert, update, delete on public.chantier_pieces from authenticated;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'bucket privé (attendu false | 4194304)' as quoi, (public::text || ' | ' || file_size_limit::text) as resultat from storage.buckets where id = 'chantier-pieces'
union all select 'politiques storage sur le bucket (attendu 0)', count(*)::text from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') like '%chantier-pieces%' or coalesce(with_check, '') like '%chantier-pieces%')
union all select 'politiques table (attendu 5)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'chantier_pieces'
union all select 'anon lit (attendu false)', has_table_privilege('anon', 'public.chantier_pieces', 'select')::text
union all select 'authenticated écrit (attendu false)', has_table_privilege('authenticated', 'public.chantier_pieces', 'insert')::text;
