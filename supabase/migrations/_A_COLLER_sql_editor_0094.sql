-- ============================================================================================
-- 0094 · Un compte neuf ne naît plus avec des privilèges (fiche 025-12)
--
-- La faille (prouvée le 24/09 sur la vraie base, étape H de .orchestre/preuves/025-04/essai-a-sec.md) :
-- la ligne `artisans` d'un compte neuf est insérée par le NAVIGATEUR (app/onboarding/page.tsx:60-66,
-- upsert sous la politique artisan_insert_own de 0001_artisans.sql:22-23, qui ne vérifie que
-- auth.uid() = id). Le déclencheur trg_lock_artisan_ins (0005) appelle lock_artisan_privileges_ins,
-- dont la dernière définition (0008_secure_rpc.sql:44-58) ne force que huit colonnes. Un compte neuf
-- qui appelle l'API lui-même pouvait donc naître avec son site en ligne sans payer les 300 €
-- (app/site/[slug]/page.tsx publie dès site_active = true), un domaine réservé et « vérifié », le rôle
-- « partenaire » (bénéficiaire du relevé de commissions), est_demo (hors des chiffres), des crédits
-- offerts qui reviennent à chaque renouvellement, une date d'inscription au choix…
--
-- Ce que fait 0094 : le corps de 0008 recopié à l'identique, plus dix-sept lignes dans la branche
-- « then » du bloc if current_user not in ('service_role', 'postgres') : chaque colonne que le
-- navigateur ne peut pas réécrire ensuite (figée à la mise à jour par lock_artisan_privileges, 0068
-- et 0093) ou que seul le serveur écrit est remise à sa valeur par défaut.
--
-- Ce qui ne change pas :
--   - l'inscription normale (id, email, nom, metier, tel, ton_style, slug, origine_declaree,
--     origine_precision) : aucune de ces colonnes n'est touchée ;
--   - les colonnes que l'artisan réécrit légitimement ensuite (/profil, /parametres, /plateforme) ;
--   - le serveur (service_role) et l'éditeur SQL (postgres) insèrent toujours ce qu'ils veulent ;
--   - le déclencheur de 0005 reste branché : il appelle la fonction par son nom.
--
-- Une seule instruction. Se colle avant ou après 0093, indifféremment (0093 ne touche que la
-- fonction de MISE À JOUR). Contrôle après collage : supabase/controles/0094_insertion_figee.sql.
--
-- 24/09 (fiche 025-13) : 0094 est collée en production. Seuls ses commentaires ont changé depuis (celui des
-- crédits disait credits_offerts figée à la mise à jour par 0068 : c'était faux, 0095 la fige) : ne pas la
-- recoller. 0095 reprend ce corps et y ajoute deux refus pour l'adresse choisie à l'inscription.
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
    -- 0094 : crédits et session. Figées aussi à la mise à jour par 0068 : credits_forfait_servi, credits_periode,
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
    -- 0094 : rôle d'entreprise et marqueur de démonstration, jamais depuis un navigateur.
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
