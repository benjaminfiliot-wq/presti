-- Best-practices Supabase/Postgres : index sur les colonnes de filtrage (clés étrangères +
-- colonnes tenant utilisées par les policies RLS et les requêtes). Idempotent.
-- Rappel Supabase : "Always add indexes on columns used in RLS policies."

-- Colonnes tenant (RLS filtre en permanence dessus : artisan_id = auth.uid())
create index if not exists devis_artisan_idx on public.devis (artisan_id);
create index if not exists factures_artisan_idx on public.factures (artisan_id);
create index if not exists leads_artisan_idx on public.leads (artisan_id);
create index if not exists clients_artisan_idx on public.clients (artisan_id);

-- Clés étrangères (jointures de propriété + cascades) — non indexées par défaut en Postgres
create index if not exists devis_lignes_devis_idx on public.devis_lignes (devis_id);
create index if not exists factures_lignes_facture_idx on public.factures_lignes (facture_id);
create index if not exists messages_lead_idx on public.messages (lead_id);
create index if not exists relances_lead_idx on public.relances (lead_id);

-- Cron des relances : filtre par échéance + non envoyées → index composite (partiel)
create index if not exists relances_a_envoyer_idx on public.relances (planifiee_le) where envoyee = false;
