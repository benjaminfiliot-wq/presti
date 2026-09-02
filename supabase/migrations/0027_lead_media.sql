-- Photos de chantier jointes par le prospect (J8, priorité chiffrage).
-- Bucket dédié, séparé des médias artisan. Les prospects sont ANONYMES : aucune écriture
-- publique — l'upload passe uniquement par le serveur (service_role, via /api/leads) après
-- compression + strip EXIF côté client. Lecture publique (URLs affichées dans la console).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-media', 'lead-media', true, 3145728,
        array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 3145728,
  allowed_mime_types = array['image/webp','image/jpeg','image/png'];

-- Lecture publique (la console affiche les vignettes via URL publique immuable).
drop policy if exists "lead_media_public_read" on storage.objects;
create policy "lead_media_public_read" on storage.objects for select
  using (bucket_id = 'lead-media');

-- Pas de policy d'écriture publique : seul le service_role (serveur) écrit. RGPD : le client
-- strippe l'EXIF (géoloc incluse) avant l'envoi ; le serveur ne stocke que l'image ré-encodée.

-- URLs publiques des photos jointes au lead (tableau de chaînes) ou NULL.
alter table public.leads add column if not exists photos jsonb;
