-- ============================================================================================
-- 0093 · Le site ne s'ouvre plus depuis le navigateur — TÉMOIN du juge scripts/verrou-site-qa.mjs (fiche 025-01)
--
-- Ce fichier n'est pas la migration : c'est l'état « après » que le juge doit accepter (node scripts/verrou-site-qa.mjs
-- --temoin). La migration réelle est écrite par la fiche 025-04 dans supabase/migrations/0093_site_fige.sql.
--
-- Le corps de 0068_controle.sql:157-186, recopié à l'identique, plus quatre lignes dans la branche « then » du bloc
-- if current_user not in ('service_role', 'postgres') : site_active, site_tier, site_contenu, site_origine.
-- Les écritures légitimes passent par le serveur (service_role) : app/api/donnees/route.ts, lib/purgeComptes.ts,
-- app/api/controle/sites/[id]/route.ts.
-- ============================================================================================

create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.credits := old.credits;
    new.credits_reset_le := old.credits_reset_le;
    new.credits_forfait_servi := old.credits_forfait_servi;
    new.credits_periode := old.credits_periode;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    new.suppression_demandee_le := old.suppression_demandee_le;
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- v11 : rôle d'entreprise et marqueur de démonstration — jamais depuis un navigateur.
    new.role_interne := old.role_interne;
    new.est_demo := old.est_demo;
    -- 0093 : le site vitrine se commande (300 €) ; le navigateur ne l'ouvre plus, ne le change plus.
    new.site_active := old.site_active;
    new.site_tier := old.site_tier;
    new.site_contenu := old.site_contenu;
    new.site_origine := old.site_origine;
    -- v11 §4.2 : l'artisan répond une fois, puis c'est scellé.
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;
