-- ============================================================================================
-- 0094 · Un compte neuf ne naît plus avec des privilèges — TÉMOIN du juge scripts/verrou-insertion-qa.mjs (fiche 025-12)
--
-- Ce fichier n'est pas la migration : c'est l'état « après » que le juge doit accepter (node scripts/verrou-insertion-qa.mjs
-- --temoin). La migration réelle est écrite par la fiche 025-12 dans supabase/migrations/0094_insertion_figee.sql.
--
-- La ligne `artisans` d'un compte neuf est créée par le navigateur (app/onboarding/page.tsx:60-66, upsert sous la politique
-- artisan_insert_own, qui ne vérifie que auth.uid() = id). Le corps de 0008_secure_rpc.sql:44-58 est recopié à l'identique,
-- plus dix-sept lignes dans la branche « then » du bloc if current_user not in ('service_role', 'postgres') : chaque colonne
-- que le navigateur ne peut pas écrire ensuite (figée par lock_artisan_privileges, 0068 et 0093) ou que seul le serveur
-- écrit est remise à sa valeur par défaut. L'inscription normale n'envoie aucune de ces colonnes : elle passe à l'identique.
-- Le serveur (service_role) et l'éditeur SQL (postgres) écrivent toujours ce qu'ils veulent.
-- ============================================================================================

create or replace function public.lock_artisan_privileges_ins()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := false;
    new.plan := 'gratuit';
    new.credits := 3;
    new.credits_reset_le := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.compteur_devis := 0;
    new.compteur_facture := 0;
    -- 0094 : les crédits et la session. Figées aussi à la mise à jour par 0068 : credits_forfait_servi, credits_periode,
    -- sessions_invalides_avant, suppression_demandee_le ; credits_offerts et connexion_verifiee_le seulement depuis 0095.
    -- credits_offerts ne se donne que par offrir_credits.
    new.credits_forfait_servi := null;
    new.credits_periode := null;
    new.credits_offerts := 0;
    new.sessions_invalides_avant := null;
    new.suppression_demandee_le := null;
    new.connexion_verifiee_le := null;
    -- 0094 : l'adresse du site (anciens slugs, domaine vérifié) passe par le serveur (/api/account/slug, /api/domain).
    new.slugs_anciens := '{}';
    new.domaine := null;
    new.domaine_verifie := false;
    -- 0094 : rôle d'entreprise et marqueur de démonstration — jamais depuis un navigateur.
    new.role_interne := null;
    new.est_demo := false;
    -- 0094 : le site se commande (300 €) ; un compte neuf naît hors ligne, sans contenu généré.
    new.site_active := false;
    new.site_tier := 3;
    new.site_contenu := null;
    new.site_contenu_le := null;
    new.site_origine := 'abonnement';
    -- 0094 : la date d'inscription est celle de la base (chiffres du Poste, registre des apports).
    new.created_at := now();
  end if;
  return new;
end $$;
