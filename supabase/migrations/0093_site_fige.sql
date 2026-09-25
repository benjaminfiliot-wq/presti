-- ============================================================================================
-- 0093 · Le site ne s'ouvre plus depuis le navigateur : site_active, site_tier, site_contenu et site_origine
--        rejoignent les colonnes figées du verrou (fiche 025-04)
--
-- Le verrou lock_artisan_privileges (dernière définition : 0068_controle.sql:157-187) empêche un artisan de
-- changer depuis son navigateur plan, credits, slug, domaine… mais pas les colonnes du site. Or /profil les
-- écrivait avec la clé du navigateur : un artisan pouvait donc s'ouvrir un site sans payer les 300 €, ou se
-- donner le niveau 3, ou se déclarer « commande » (0088:76). Les écritures légitimes passent déjà par le
-- serveur, en service_role : app/api/donnees/route.ts, lib/purgeComptes.ts, app/api/controle/sites/[id]/route.ts.
--
-- Ce fichier recopie le corps de 0068 À L'IDENTIQUE et ajoute quatre lignes dans le bloc « tout rôle autre que
-- service_role et postgres ». Rien d'autre : ni trigger (trg_lock_artisan_upd, 0005, pointe déjà sur cette
-- fonction), ni droits. Un « create or replace » se recolle sans dommage.
--
-- ORDRE DE COLLAGE : seulement APRÈS le déploiement de 025-05 (l'écran /profil qui passe par le serveur).
-- Collé avant, la case « Mon site est publié » de l'ancien écran serait ignorée sans le moindre message.
-- Après collage : supabase/controles/0093_site_fige.sql doit répondre « oui » sur ses quatre lignes.
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
    -- 0093 : le site (ouvert ou non, son niveau, son contenu, son origine) ne s'écrit que par le serveur.
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
