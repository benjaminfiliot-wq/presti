-- 0187 · factures.envoyee_le : le premier envoi d'une facture émise à son client, la donnée qui manque au détecteur 5 (« facture émise
-- jamais envoyée »).
--
-- ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj. (tâche 032-025, sur le Oracle, par claude-code ; rien n'a touché la base)
-- Ordre : essai à sec (session principale), « go » écrit, application, contrôle du pied du jumeau. Le détecteur 5 reste coupé jusque-là
-- (plan §9 l.590 : « coupé jusqu'à 0187 »).
--
-- Source : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §8.2 (l.569 : « la colonne qui manque au détecteur 5 ») et §9 n° 5
-- (l.590 : « aucune donnée : l'envoi n'écrit rien », lib/envoisPdfServeur.ts:101-138, relu le 02/11 : sendEmail puis 200, sans écriture).
--
-- Ce que fait 0187, additive et idempotente :
--   1. une colonne NULLABLE, sans défaut : aucune ligne existante n'est réécrite (ajout de métadonnée seulement). Null = « jamais envoyée
--      par Presti » OU « envoyée avant 0187 » : le détecteur 5 ne doit donc viser que les factures émises après la pose de 0187 (à écrire
--      dans son workflow : emise_le >= date de pose) ;
--   2. une contrainte : seule une facture scellée (verrouillee, 0044) peut porter une date d'envoi — un brouillon ne s'envoie pas.
-- Qui l'écrit : la route d'envoi, par la clé de service, une fois l'e-mail accepté, en `envoyee_le = coalesce(envoyee_le, now())` (lot
-- d'interface à part : lib/** n'est pas dans cette tâche). Le navigateur ne modifie aucune facture (0044 : pas de politique update).
-- Le déclencheur factures_immuables (0041:41-61) ne surveille pas cette colonne : l'écrire sur une facture scellée est permis, sans rien
-- toucher de ce qu'il protège (numéro, totaux, date, client, empreinte).
-- RLS : inchangée (factures_select_own, 0044). Gardes de 0138 : déjà posées sur factures. Le rôle n8n_lecture (0189) ne reçoit pas la
-- colonne : il reste inutilisé par n8n (plan §0.1 l.30-32).
--
-- Retour arrière :
--   alter table public.factures drop constraint if exists factures_envoyee_scellee;
--   alter table public.factures drop column if exists envoyee_le;

-- Un verrou qui tarde sur factures fait échouer la migration proprement (on la rejoue), au lieu de bloquer la facturation.
set local lock_timeout = '5s';

alter table public.factures add column if not exists envoyee_le timestamptz;
alter table public.factures drop constraint if exists factures_envoyee_scellee;
alter table public.factures add constraint factures_envoyee_scellee check (envoyee_le is null or coalesce(verrouillee, false));

comment on column public.factures.envoyee_le is
  'Premier envoi de la facture émise à son client par Presti (0187), écrit par la route d envoi. Null : jamais envoyée par Presti, ou envoyée avant 0187.';
