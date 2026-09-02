-- Numéro de TVA intracommunautaire (Paramètres → Entreprise & légal, v4 §C2).
-- Complète `tva_regime` (franchise / réel) déjà présent : ici le NUMÉRO, obligatoire sur
-- les factures dès que l'artisan est assujetti. Prépare aussi §10 (facturation électronique).
alter table public.artisans add column if not exists tva_num text;
