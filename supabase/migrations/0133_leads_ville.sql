-- ============================================================================================
-- 0133 · La ville d'une demande (06/10/2026, décision 2 de Benj ; plan docs/refonte/PLAN-REFONTE-0610.md §5.1)
--
-- Le bloc « Villes » de /chiffres lisait clients.ville : table vide, bloc toujours vide. Il lit désormais la ville des
-- DEMANDES, écrite à l'arrivée (formulaire : app/api/leads/route.ts ; email : lib/releveCanal.ts) par villeDe() de
-- lib/ville.ts, qui ne rend que le nom exact d'une commune d'une liste FERMÉE (« à Noël » ne donne jamais une ville).
--
-- Ce que ce fichier change (rejouable) :
--   · public.leads.ville (NOUVELLE colonne, nulle par défaut) : le nom officiel de la commune, 80 signes au plus, comme
--     artisans_ville_borne (0058) ;
--   · aucune politique RLS nouvelle : la colonne hérite de celles de leads (l'artisan ne lit que ses demandes).
-- Les demandes existantes restent sans ville : rien n'est deviné après coup.
-- Contrôle : supabase/controles/0133_leads_ville.sql
-- ============================================================================================
alter table public.leads add column if not exists ville text;
alter table public.leads drop constraint if exists leads_ville_borne;
alter table public.leads
  add constraint leads_ville_borne check (ville is null or char_length(ville) between 1 and 80) not valid;
alter table public.leads validate constraint leads_ville_borne;
comment on column public.leads.ville is
  'La commune de la demande (0133), lue dans le message par villeDe() de lib/ville.ts sur une liste fermée de communes (INSEE) ; nulle quand le message n''en nomme aucune. 80 signes au plus.';
