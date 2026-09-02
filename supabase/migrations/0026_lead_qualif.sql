-- Qualification silencieuse des demandes (J8) : niveau d'urgence + type de chantier.
-- Déduits DÉTERMINISTIQUEMENT à la création du lead (analyzeLead + mots-clés métier),
-- affichés côté artisan dans /messages pour trier l'inbox. NULL = non qualifié (leads anciens).
alter table public.leads add column if not exists urgence text;        -- 'urgent' | 'normal'
alter table public.leads add column if not exists type_chantier text;   -- libellé court (ex: 'Plomberie', 'Électricité') ou NULL

-- Index pour remonter les urgences en tête d'inbox rapidement.
create index if not exists leads_urgence_idx on public.leads (artisan_id, urgence);
