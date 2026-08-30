-- Plateforme de communication — étape « conversation » : le prospect peut échanger
-- en direct sur la page de l'artisan (pas seulement un email one-shot), et l'IA
-- lui répond dans le fil. Chaque lead = une conversation ; on lui donne un jeton
-- secret (uuid non devinable) pour que le prospect anonyme puisse rouvrir SON fil
-- et poster des messages sans compte, sans jamais voir ceux des autres.
-- Additif, idempotent, sûr à rejouer.

-- Jeton public de conversation (bearer secret côté prospect).
alter table public.leads add column if not exists token uuid default gen_random_uuid();
-- Backfill des leads existants (le default ne couvre que les nouvelles lignes).
update public.leads set token = gen_random_uuid() where token is null;
-- Unicité (les NULL ne s'égalent pas en SQL — aucun risque après backfill).
create unique index if not exists leads_token_key on public.leads (token);

-- Marqueur « vu par l'artisan » pour la boîte de réception (badge non-lu).
alter table public.leads add column if not exists lu_le timestamptz;

-- Le prospect peut adresser plusieurs messages : messages.sens = 'in' | 'out',
-- messages.type = 'manuel' (prospect ou artisan) | 'reponse_auto' (IA). Table déjà
-- créée en 0010 ; on s'assure juste d'un index pour charger un fil rapidement.
create index if not exists messages_lead_sent_idx on public.messages (lead_id, sent_at);

-- Ordonnancement de la boîte de réception par dernière activité.
create index if not exists leads_artisan_updated_idx on public.leads (artisan_id, updated_at desc);
