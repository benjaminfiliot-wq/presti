-- ============================================================================================
-- 0095 · Les verrous de public.artisans complétés : cinq colonnes de plus figées à la mise à jour, et
--        l'adresse choisie à l'inscription contrôlée en base (fiche 025-13)
--
-- Des portes restaient ouvertes au navigateur (attaque du 24/09 sur 025-12, relecture adverse du 25/09, essais à sec sur
-- la vraie base) :
--
--   1. LA MISE À JOUR. La politique artisan_update_own (0001) laisse l'artisan réécrire sa propre ligne ;
--      lock_artisan_privileges (0068, puis 0093) remet en place ce qu'il ne doit pas choisir, mais pas :
--        - credits_offerts : consume_credit (0080) sert le forfait PLUS credits_offerts au premier appel IA de
--          chaque période ; 5 000 crédits offerts, c'est l'IA illimitée payée par Presti ;
--        - site_contenu_le : remise à nul, la génération du site redevient gratuite (app/api/site/generate) ;
--        - created_at et email : lus par le score de confiance des apports (lib/controle/confiance.ts) ;
--        - connexion_verifiee_le : écrite par le serveur seul, après le code (lib/connexion.ts).
--      Aucun écran n'écrit ces colonnes depuis le navigateur : site_contenu_le et connexion_verifiee_le passent par le
--      serveur (service_role), credits_offerts par offrir_credits (security definer).
--      email : figée à old.email. Aucune mise à jour du navigateur n'envoie email, aucun écran ne change l'adresse de
--      connexion (pas de supabase.auth.updateUser({ email })) ; seule l'inscription l'envoie (l'adresse de la session,
--      app/onboarding/page.tsx), et l'anonymisation de la purge passe par le serveur. Si un écran se met un jour à
--      changer l'adresse, il faudra figer email à auth.email() ou la laisser au serveur (verrou-maj-qa rougit alors).
--
--   2. L'INSCRIPTION. Le navigateur choisit son slug (app/onboarding/page.tsx), sans contrôle en base. Les mots
--      réservés (lib/urls.ts, SLUGS_RESERVES) et les anciennes adresses des autres artisans (slugs_anciens, 0051)
--      n'étaient refusés qu'au changement d'adresse (/api/account/slug). Or les pages publiques cherchent le slug
--      actuel AVANT l'ancien : un compte neuf qui prenait l'ancienne adresse d'un artisan prenait ses visiteurs et
--      ses demandes.
--
--   3. L'ADRESSE EMAIL ET LA PURGE (relecture du 25/09). Un compte neuf pouvait s'inscrire avec l'adresse email d'un
--      autre, qui ne pouvait alors plus réinitialiser son mot de passe et recevait ses notifications : la base garde
--      maintenant l'adresse du compte connecté. Il pouvait aussi prendre « supprime-… », l'adresse que la purge donne à
--      un compte effacé, et faire échouer cet effacement sans bruit : ce début d'adresse est désormais réservé.
--
-- Ce que fait 0095, et rien d'autre :
--   a. slug_ancien_d_un_autre(slug, id) : « un AUTRE artisan a-t-il déjà porté cette adresse ? ». Security definer :
--      le navigateur ne voit que sa propre ligne (artisan_select_own) et, sous ses droits, ne trouverait jamais
--      l'adresse d'un autre. Appelable par authenticated (le déclencheur tourne sous son rôle) et par service_role,
--      pas par anon. Elle ne répond que oui ou non pour une adresse donnée : ce qu'une visite de /site/<adresse>
--      dit déjà (l'ancienne adresse y redirige).
--   b. lock_artisan_privileges : le corps de 0093 à l'identique, plus cinq lignes.
--   c. lock_artisan_privileges_ins : le corps de 0094 à l'identique, plus, pour le navigateur, l'adresse email du
--      compte connecté (auth.email() ; sans elle, celle envoyée) et trois refus : mot réservé, ancienne adresse d'un
--      autre, début « supprime- » (PREFIXE_ADRESSE_PURGEE de lib/urls.ts). Leurs messages s'affichent tels quels à
--      l'inscription ; un nouvel essai tire un autre suffixe (pas pour « supprime- », qui vient du nom saisi).
-- Ni drop, ni create trigger : les déclencheurs de 0005 appellent les fonctions par leur nom. service_role et
-- postgres ne sont ni forcés ni refusés.
--
-- ORDRE DE COLLAGE : 0095 reprend le corps de 0093 ; la coller ferme donc aussi les colonnes du site. Elle se colle
-- APRÈS 0093, donc après le déploiement de 025-05, jamais avant. 0094 est déjà en production : ne pas la recoller.
-- (Relevé le 25/09 : 0093 est en production depuis 10 h 43 UTC, schema_migrations 20260925104326.)
-- Après collage : supabase/controles/0095_verrous_maj_slug.sql répond « oui » sur ses douze lignes.
-- ============================================================================================

create or replace function public.slug_ancien_d_un_autre(p_slug text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.artisans a
    where a.id is distinct from p_id and a.slugs_anciens @> array[p_slug]
  )
$$;
revoke all on function public.slug_ancien_d_un_autre(text, uuid) from public, anon;
grant execute on function public.slug_ancien_d_un_autre(text, uuid) to authenticated, service_role;

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
    -- 0095 : crédits offerts (servis à chaque renouvellement, 0080), date de génération du site (nulle : génération
    -- offerte), date d'inscription, connexion vérifiée, adresse email. Le serveur seul les écrit.
    new.credits_offerts := old.credits_offerts;
    new.site_contenu_le := old.site_contenu_le;
    new.created_at := old.created_at;
    new.connexion_verifiee_le := old.connexion_verifiee_le;
    new.email := old.email;
    -- v11 §4.2 : l'artisan répond une fois, puis c'est scellé.
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;

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
    -- 0095 : l'adresse email est celle du compte connecté (son jeton), pas celle que le navigateur envoie.
    new.email := coalesce(auth.email(), new.email);
    -- 0095 : l'adresse choisie à l'inscription, APRÈS les colonnes forcées (les contrôles cherchent chaque affectation
    -- avant tout if imbriqué). Mots réservés : ceux de lib/urls.ts (SLUGS_RESERVES). Ancienne adresse d'un AUTRE artisan :
    -- les pages publiques cherchent le slug actuel avant l'ancien, le nouveau venu prendrait ses visiteurs.
    if lower(new.slug) = any (array['www', 'qg', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'demande', 'site', 'p', 'login', 'signup', 'onboarding', 'contact', 'presti', 'prestiapp', 'static', 'assets', 'infos-legales', 'cgu', 'mentions-legales', 'confidentialite', 'faq', 'aide']) then
      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';
    end if;
    if public.slug_ancien_d_un_autre(new.slug, new.id) then
      raise exception 'Cette adresse est déjà utilisée : essayez-en une autre.' using errcode = '23505';
    end if;
    -- 0095 : « supprime-… » est l'adresse que la purge donne à un compte anonymisé (lib/urls.ts, PREFIXE_ADRESSE_PURGEE).
    if lower(new.slug) like 'supprime-%' then
      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
