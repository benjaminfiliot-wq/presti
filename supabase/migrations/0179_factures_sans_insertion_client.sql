-- 0179 · FACTURES : le navigateur ne crée plus de facture ni de ligne de facture.
-- Écrite et appliquée le 21/10/2026 (audit argent du 21/10, E3).
--
-- 0044 (l.32 et l.39) avait posé deux politiques d'insertion « à soi » : un artisan connecté pouvait, depuis son navigateur,
-- insérer directement une facture (numéro libre, statut « emise », scellée ou non, montant libre) et ses lignes, sans
-- passer par le serveur ni par ses contrôles (numérotation continue, jamais plus que le devis, mentions obligatoires).
-- Aucun code de Presti ne s'en sert : toute création passe par le serveur avec la clé de service (lib/factureDepuisDevis.ts,
-- app/api/factures/[id]/avoir/route.ts). On retire donc ces deux politiques ; la lecture « à soi » reste.
-- Idempotente. La clé de service n'est pas concernée par la RLS.

drop policy if exists factures_insert_own on public.factures;
drop policy if exists factures_lignes_insert_own on public.factures_lignes;
