-- 0166 · CRM : la PIÈCE de chaque tâche du chantier (plan plans/crm-idees-twenty-1810.md, n°8, version 1 : le plan du chantier).
-- Écrite le 19/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord (DO + EXECUTE + raise exception), puis application, puis les
-- contrôles du bas, puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot5-qa.mjs`.
-- Idempotente et additive : une colonne FACULTATIVE sur chantier_taches (0141), rien d'autre. Aucun droit ne change : la table
-- reste en lecture seule pour `authenticated` (0152), les écritures passent par /api/crm/* (clé de service, après garde).
--
-- `piece` : la pièce que l'artisan a choisie pour la tâche (« Cuisine », « Salle de bain »…), 40 caractères au plus. Vide, l'écran
-- la DEVINE d'après le libellé (lib/crm/plan.ts, mots-clés) sans rien écrire : les tâches existantes ont donc leur pièce dès
-- l'affichage, et la colonne ne garde que les corrections de l'artisan et les pièces reconnues à la création depuis le devis.
-- La table est déjà dans la publication temps réel (0141) : rien à ajouter.

alter table public.chantier_taches add column if not exists piece text;
alter table public.chantier_taches drop constraint if exists chantier_taches_piece_check;
alter table public.chantier_taches add constraint chantier_taches_piece_check
  check (piece is null or char_length(piece) between 1 and 40);

-- Contrôles (résultats attendus entre crochets) :
-- select data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'chantier_taches' and column_name = 'piece';   -- [text | YES]
-- select count(*) from pg_constraint where conname = 'chantier_taches_piece_check';   -- [1]
-- select has_table_privilege('authenticated', 'public.chantier_taches', 'update');   -- [false]
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chantier_taches';   -- [1]
