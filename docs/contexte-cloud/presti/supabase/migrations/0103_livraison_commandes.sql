-- ============================================================================================
-- 0103 · La livraison des sites commandés : ce que public.sites_commandes doit savoir pour vendre sans
--        compte, envoyer trois e-mails une seule fois, rendre le dossier par un lien qui expire, suivre
--        la génération distante et retirer un site douze mois après la suppression du compte
--        (fiche 026-021, série 026, domaine livraison-tresor ; juge : scripts/livraison-schema-qa.mjs)
--
-- Rien d'autre que des colonnes ajoutées, l'état 'retiree' et trois index partiels. Idempotente :
-- « add column if not exists », « create index if not exists », et la contrainte d'état supprimée
-- « if exists » puis recréée. Aucune donnée touchée, aucune colonne retirée ni retypée.
--
-- Sécurité par ligne : inchangée. 0088 a posé « enable row level security » et
-- « revoke all … from public, anon, authenticated » ; lecture et écriture passent par service_role seul
-- (vérifié le 27/09 : ni anon ni authenticated n'ont le droit select, aucun droit par colonne). Les
-- colonnes ajoutées héritent de cette fermeture ; dossier_jeton_hash n'est d'ailleurs qu'une empreinte.
--
-- Pourquoi l'état 'retiree' en sixième : l'article 3 bis des CGU (app/cgu/page.tsx) promet que le
-- site reste en ligne douze mois après la suppression du compte, puis disparaît. Un site retiré n'est
-- ni 'en_ligne' ni supprimé : la commande payée reste, comme sa facture. L'ordre des cinq premiers
-- est celui d'ETATS (lib/siteCommande.ts) ; le juge le compare (SC-3).
--
-- Ordre d'application : par Claude Code, par le connecteur Supabase (apply_migration nommée
-- 0103_livraison_commandes), après son essai à sec, AVANT le déploiement de toute fiche qui lit ces
-- colonnes (026-024, 026-025, 026-027, 026-030, 026-028, 026-031, 026-078, 026-106). Ces routes
-- répondent 503 tant que la colonne manque, jamais un vide. Contrôle après application :
-- supabase/controles/0103_livraison_commandes.sql (une ligne « oui » par colonne, contrainte, index).
-- ============================================================================================

-- L'achat public : la commande passée sans compte, avant le profil (artisan_id déjà nullable, 0088).
alter table public.sites_commandes add column if not exists entreprise text;
alter table public.sites_commandes add column if not exists achat_public boolean not null default false;
alter table public.sites_commandes add column if not exists cgu_acceptees_le timestamptz;
alter table public.sites_commandes add column if not exists lien_envoye_le timestamptz;
alter table public.sites_commandes add column if not exists lien_envois integer not null default 0 check (lien_envois >= 0);
alter table public.sites_commandes add column if not exists rattachee_le timestamptz;

-- Les trois e-mails (payee, generee, en_ligne) : la date d'envoi de chacun, pour n'en envoyer qu'un.
alter table public.sites_commandes add column if not exists courriels jsonb not null default '{}'::jsonb;

-- La Search Console : le plan du site soumis par Benj.
alter table public.sites_commandes add column if not exists search_console_le timestamptz;

-- Le retrait à douze mois (article 3 bis des CGU).
alter table public.sites_commandes add column if not exists compte_supprime_le timestamptz;
alter table public.sites_commandes add column if not exists retiree_le timestamptz;

-- Le dossier du site, par un lien qui expire : l'empreinte SHA-256 du jeton, jamais le jeton.
alter table public.sites_commandes add column if not exists dossier_jeton_hash text;
alter table public.sites_commandes add column if not exists dossier_expire_le timestamptz;
alter table public.sites_commandes add column if not exists dossier_envoye_le timestamptz;
alter table public.sites_commandes add column if not exists fichiers_purges_le timestamptz;

-- La génération distante (GitHub Actions, phase 3).
alter table public.sites_commandes add column if not exists generation_demandee_le timestamptz;
alter table public.sites_commandes add column if not exists generation_tentatives integer not null default 0 check (generation_tentatives >= 0);
alter table public.sites_commandes add column if not exists generation_duree_s integer check (generation_duree_s >= 0);

-- L'état 'retiree' : les cinq états de 0088 (ETATS de lib/siteCommande.ts), dans leur ordre, puis 'retiree'.
-- Nom de la contrainte confirmé sur la vraie base le 27/09 (pg_constraint) : sites_commandes_etat_check.
alter table public.sites_commandes drop constraint if exists sites_commandes_etat_check;
alter table public.sites_commandes add constraint sites_commandes_etat_check check (etat in ('brouillon', 'payee', 'generee', 'validee', 'en_ligne', 'retiree'));

-- Les retraits dus : les sites en ligne dont le compte a été supprimé.
create index if not exists sites_commandes_retraits_dus_idx on public.sites_commandes (compte_supprime_le) where etat = 'en_ligne' and compte_supprime_le is not null;
-- La purge des brouillons publics jamais payés.
create index if not exists sites_commandes_brouillons_publics_idx on public.sites_commandes (cree_le) where etat = 'brouillon' and achat_public;
-- Le rattachement d'une commande publique au compte créé après paiement (même adresse, sans la casse).
create index if not exists sites_commandes_rattachement_idx on public.sites_commandes (lower(email)) where artisan_id is null and achat_public;

comment on column public.sites_commandes.courriels is 'Date d envoi de chacun des trois e-mails a l artisan : cles payee, generee, en_ligne (un envoi par cle, jamais deux).';
comment on column public.sites_commandes.dossier_jeton_hash is 'Empreinte SHA-256 du jeton du lien du dossier, jamais le jeton lui-meme.';
comment on column public.sites_commandes.compte_supprime_le is 'Date de purge du compte de l artisan : le site est retire douze mois plus tard (article 3 bis des CGU).';
