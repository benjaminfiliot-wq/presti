-- Canaux de réception de l'artisan (v4 §B2) : email IMAP/SMTP d'abord (universel, sans
-- dépendre d'une application OAuth tierce). Les identifiants sont CHIFFRÉS applicativement
-- (AES-256-GCM, clé en variable d'environnement) — jamais en clair en base.
create table if not exists public.canaux (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  type text not null,                       -- 'email' (imap/smtp) · plus tard : whatsapp, sms…
  libelle text,                             -- ce que l'artisan reconnaît ("Ma boîte OVH")
  adresse text not null,                    -- l'adresse email relevée
  imap_hote text, imap_port int default 993,
  smtp_hote text, smtp_port int default 465,
  identifiant text,                         -- souvent = adresse
  secret text,                              -- MOT DE PASSE CHIFFRÉ (v1.<iv>.<tag>.<data>)
  actif boolean not null default true,
  derniere_releve timestamptz,
  dernier_uid bigint,                       -- reprise de la relève IMAP là où on s'est arrêté
  derniere_erreur text,
  cree_le timestamptz default now()
);
create index if not exists canaux_artisan_idx on public.canaux (artisan_id);

-- RLS : jamais lu par le navigateur (tout passe par /api/canaux côté serveur).
-- L'artisan peut néanmoins lister SES canaux ; la colonne `secret` n'est jamais renvoyée par l'API.
alter table public.canaux enable row level security;
drop policy if exists "canaux_select_own" on public.canaux;
create policy "canaux_select_own" on public.canaux for select to authenticated
  using (artisan_id = auth.uid());

-- Rattacher un message à son canal d'origine (un fil = un client, tous canaux confondus).
alter table public.messages add column if not exists canal_id uuid references public.canaux(id) on delete set null;
alter table public.messages add column if not exists externe_id text;
create index if not exists messages_externe_idx on public.messages (externe_id);
