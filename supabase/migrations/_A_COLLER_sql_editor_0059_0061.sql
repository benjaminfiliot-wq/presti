-- À coller dans Supabase → SQL Editor, APRÈS le déploiement du code du 05/09 (l'ordre compte pour 0059-B).
-- Contient 0059 (quota de stockage), 0060 (index des purges RGPD), 0061 (domaine perso unique).

-- 0059 — Quota de stockage par compte (audit final, auditeur F, majeur 4.3 et 4.4).
--
-- Le défaut : `artisan-media` n'avait AUCUN plafond par compte. La policy de 0024 vérifiait
-- que le dossier portait l'identifiant de l'artisan, et rien d'autre — la taille était bornée
-- par fichier (15 Mo), jamais par compte. Un compte d'essai, gratuit et sans carte, pouvait
-- donc téléverser en boucle depuis le navigateur avec la clé anon (publique) : ~70 envois et
-- l'offre Supabase (1 Go) est pleine. Le dépassement ne punit pas le fautif — il coupe le
-- projet entier, donc les images de TOUS les artisans, en même temps.
--
-- Le comptage vit désormais dans le serveur (lib/quotaMedia.ts + /api/media). Cette migration
-- pose les deux pièces que le serveur ne peut pas fabriquer seul :
--   A. de quoi mesurer les photos de chantier par artisan sans un `list` par conversation ;
--   B. la fermeture de la porte du navigateur — sans elle, le plafond serait décoratif.
--
-- ⚠️ ORDRE : la partie B doit être jouée APRÈS le déploiement du code (sinon les imports
-- d'images cassent, le temps que /api/media existe). Les parties A et B sont séparées plus bas.

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Compteur des photos de chantier (bucket `lead-media`)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Pourquoi un compteur ici, alors qu'`artisan-media` est mesuré pour de vrai : les fichiers
-- de `lead-media` sont rangés PAR CONVERSATION (`<leadId>/<i>.<ext>`), pas par artisan.
-- Mesurer le vrai demanderait un appel `list` par conversation — des centaines d'appels pour
-- répondre à une seule demande de devis. On stocke donc la taille au moment de l'écriture.

alter table public.leads add column if not exists photos_octets integer not null default 0;

comment on column public.leads.photos_octets is
  'Octets de photos de chantier stockés dans lead-media pour cette conversation. Alimente le quota par artisan (audit final F-4.4). Remis à zéro par trigger dès que photos disparaît.';

-- Le piège d'un compteur, c'est qu'il survive à ce qu'il compte : /api/donnees supprime les
-- photos d'une conversation (droit à l'effacement) et le quota resterait consommé pour
-- toujours. Le trigger raccroche le compteur à la vérité, quel que soit le code qui efface.
create or replace function public.leads_photos_octets_sync()
returns trigger language plpgsql as $$
begin
  if new.photos is null or (jsonb_typeof(new.photos) = 'array' and jsonb_array_length(new.photos) = 0) then
    new.photos_octets := 0;
  end if;
  return new;
end $$;

drop trigger if exists leads_photos_octets_sync on public.leads;
create trigger leads_photos_octets_sync
  before insert or update of photos on public.leads
  for each row execute function public.leads_photos_octets_sync();

-- Un seul scalaire au lieu de rapatrier toutes les lignes d'un artisan (index leads_artisan_idx).
create or replace function public.octets_lead_media(p_artisan uuid)
returns bigint language sql security definer stable set search_path = public as $$
  select coalesce(sum(photos_octets), 0)::bigint from public.leads where artisan_id = p_artisan;
$$;

-- Même règle que consommer_limite (0049) : réservé au serveur.
revoke execute on function public.octets_lead_media(uuid) from public, anon, authenticated;
grant execute on function public.octets_lead_media(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Fermeture de la porte du navigateur sur `artisan-media`
--    ⚠️ À JOUER APRÈS LE DÉPLOIEMENT DU CODE (/api/media doit exister).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Sans ceci, le plafond est décoratif : la clé anon est publique, et trois lignes dans la
-- console du navigateur refont l'envoi direct que 0024 autorisait. La lecture reste publique
-- (les pages /site et /l sont publiques) et la SUPPRESSION reste au propriétaire — c'est ce
-- qui lui permet de libérer sa place quand le plafond est atteint.

drop policy if exists "artisan_media_owner_insert" on storage.objects;
drop policy if exists "artisan_media_owner_update" on storage.objects;

-- Ceinture et bretelles : la borne par fichier du bucket suit celle du serveur (4 Mo).
-- 15 Mo n'a jamais servi — le parcours d'import produit au pire 1,6 Mo (lib/media.ts) — et
-- au-delà de ~4,5 Mo la requête n'atteindrait de toute façon plus la route.
update storage.buckets set file_size_limit = 4194304 where id = 'artisan-media';


-- 0060 — Index des purges RGPD (audit final, auditeur B, majeur C6).
--
-- Contexte : `lib/purgesRgpd.ts` applique enfin les durées que les pages légales annoncent
-- (12 mois anti-abus, 3 ans pour une conversation sans suite). Chaque purge lit « les N plus
-- vieilles lignes » d'une table, triées par leur colonne de date. Sans index sur CETTE colonne,
-- chaque passage devient un balayage complet trié : ça tient sur une base neuve, ça tue le cron
-- quotidien le jour où `ip_abus` compte quelques centaines de milliers de lignes — et une purge
-- qui expire, c'est une durée annoncée qui redevient une promesse en l'air.
--
-- Aucune donnée n'est touchée ici : rien que des index, `if not exists`, rejouables.
-- Les index déjà posés ailleurs ne sont pas redoublés : `ip_bans_expires_idx` (0013),
-- `clients_liens_expire_idx` (0034), `messages_lead_sent_idx` (0015), `devis_lead_idx` (0033).

-- Journal d'abus : purge par horodatage global. L'index existant est (ip, at), inutilisable
-- pour un balayage trié sur `at` seul.
create index if not exists ip_abus_at_idx on public.ip_abus (at);

-- Conversations sans suite : on part des fils créés avant le seuil, les plus vieux d'abord.
-- L'index existant est (artisan_id, updated_at desc) — la purge, elle, ignore l'artisan.
create index if not exists leads_created_idx on public.leads (created_at);

-- Empreintes d'IP à effacer : index PARTIELS, donc minuscules et sans coût d'écriture une fois
-- l'IP remise à NULL — la ligne sort de l'index le jour où elle est purgée.
create index if not exists leads_ip_purge_idx on public.leads (created_at) where ip is not null;
create index if not exists devis_ip_purge_idx on public.devis (accepte_le) where accepte_ip is not null;

-- Jetons expirés.
create index if not exists password_resets_expires_idx on public.password_resets (expires_at);
create index if not exists clients_sessions_expire_idx on public.clients_sessions (expire_le);

comment on index public.leads_ip_purge_idx is
  'Purge RGPD (0060) : retrouver les leads dont l''empreinte d''IP dépasse douze mois. Partiel — vide quand tout est purgé.';
comment on index public.devis_ip_purge_idx is
  'Purge RGPD (0060) : retrouver les devis dont l''empreinte d''IP d''acceptation dépasse douze mois.';


-- 0061 — Un domaine perso n'appartient qu'à un artisan (suite domaine-perso-e2e, 05/09).
--
-- 0029 avait créé un index simple sur artisans.domaine : deux comptes pouvaient donc porter le
-- même domaine, et le middleware servait le premier venu. Avec un index UNIQUE (insensible à la
-- casse), la base refuse le second — et /api/domain le refuse avant même d'appeler Vercel.
create unique index if not exists artisans_domaine_unique_idx
  on public.artisans (lower(domaine)) where domaine is not null;
comment on index public.artisans_domaine_unique_idx is
  'Un domaine perso par artisan. Posé le 05/09/2026 après la suite domaine-perso-e2e.';
