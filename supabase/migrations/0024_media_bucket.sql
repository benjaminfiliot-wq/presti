-- Bucket public des médias artisan (logos + réalisations). Remplace le stockage base64 en DB
-- (perf/LCP + permet next/image). Un dossier par artisan : `artisan-media/<uid>/fichier`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artisan-media', 'artisan-media', true, 15728640,
        array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/svg+xml'];

-- Lecture publique (les pages /site et /l sont publiques).
drop policy if exists "artisan_media_public_read" on storage.objects;
create policy "artisan_media_public_read" on storage.objects for select
  using (bucket_id = 'artisan-media');

-- Écriture (insert/update/delete) réservée au propriétaire du dossier = auth.uid().
drop policy if exists "artisan_media_owner_insert" on storage.objects;
create policy "artisan_media_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artisan-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "artisan_media_owner_update" on storage.objects;
create policy "artisan_media_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artisan-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'artisan-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "artisan_media_owner_delete" on storage.objects;
create policy "artisan_media_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artisan-media' and (storage.foldername(name))[1] = auth.uid()::text);
