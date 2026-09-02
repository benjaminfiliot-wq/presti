-- Cartes riches dans la conversation (v4 §A3) : relier un devis à SON fil, et rendre
-- l'acceptation par le client opposable (horodatée + journalisée).
alter table public.devis add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.devis add column if not exists accepte_le timestamptz;   -- horodatage de l'acceptation
alter table public.devis add column if not exists accepte_ip text;          -- IP de l'acceptant (preuve)
alter table public.devis add column if not exists accepte_canal text;       -- 'plateforme' | 'email' | 'artisan'

-- Retrouver rapidement le devis d'une conversation.
create index if not exists devis_lead_idx on public.devis (lead_id, created_at desc);
