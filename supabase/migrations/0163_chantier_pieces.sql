-- 0163 · CRM : les PHOTOS et PIÈCES du chantier (plan plans/crm-idees-twenty-1810.md, n°5) — état des lieux avant travaux, photos
-- pendant et après, problème constaté, facture fournisseur, plan. Écrite le 18/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord, puis
-- application, puis les contrôles du bas, puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot3-qa.mjs`.
-- Idempotente et additive : une table neuve et un bucket neuf, rien d'existant n'est modifié (ni public.artisans, ni un autre bucket).
--
-- 1 ─ Le bucket PRIVÉ « chantier-pieces » : ce sont des INTÉRIEURS de particuliers (et parfois des visages, des adresses, des factures
--     d'un fournisseur). Jamais public — contrairement à l'ancien lead-media, dont la fuite a été la pire trouvée par l'audit (v4 §11) —
--     et AUCUNE politique sur storage.objects : seul service_role lit et écrit (modèle : 0089, 0110). L'artisan reçoit des adresses
--     SIGNÉES de courte durée, pour SES pièces seulement (GET /api/crm/pieces). 4 Mo par fichier (sous la limite de corps de requête de
--     l'hébergeur, comme /api/media) ; images (déjà compressées dans le navigateur, sans EXIF : lib/media.ts) et PDF.
--     Rangement : <artisan>/<chantier>/<identifiant>.<ext>, jamais un nom choisi par l'utilisateur.
-- 2 ─ chantier_pieces : une ligne par fichier (chemin, type, légende ≤ 200, prise le, taille, type MIME). La taille sert au quota par
--     compte (lib/quotaMedia.ts) : elle disparaît avec la ligne, le compteur ne survit pas à ce qu'il compte. La suppression du chantier
--     ou du compte emporte les lignes (cascade) ; les FICHIERS, eux, sont retirés par les routes et les purges (lib/purgeComptes.ts,
--     scripts de test) — une base ne supprime pas un objet de stockage.
-- 3 ─ RLS comme 0151/0158/0162 : lecture de SES lignes seulement, garde de session et de suspension, aucun droit d'écriture direct pour
--     `authenticated` (tout passe par /api/crm/pieces*, clé de service, après garde, offre Signature, contrôle du type réel du fichier et
--     quota), rien pour `anon`. Un déclencheur refuse un chantier d'un AUTRE artisan, et un chemin hors du dossier du compte.
-- 4 ─ Pas de temps réel : l'écran /crm ne montre pas les pièces (la fiche chantier les relit à l'ouverture et après chaque envoi).
--     La table n'entre donc PAS dans la publication supabase_realtime (scripts/crm-qa.mjs, M3, compare la publication au code).

-- 1 ─ Le bucket privé
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chantier-pieces', 'chantier-pieces', false, 4194304, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']::text[])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = excluded.allowed_mime_types;
-- Aucune politique sur storage.objects pour ce bucket : seul service_role lit et écrit.

-- 2 ─ La table
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

-- 3 ─ Le chantier est celui du compte, et le fichier est rangé dans le dossier du compte et du chantier.
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

-- 4 ─ RLS : lecture de ses lignes ; garde de session et de suspension (0138/0151) ; aucun droit d'écriture direct ; rien pour anon.
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

-- Contrôles (résultats attendus entre crochets) :
-- select public, file_size_limit from storage.buckets where id = 'chantier-pieces';   -- [false | 4194304]
-- select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual like '%chantier-pieces%' or with_check like '%chantier-pieces%');   -- [0]
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'chantier_pieces';   -- [5]
-- select has_table_privilege('anon', 'public.chantier_pieces', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.chantier_pieces', 'insert');   -- [false]
