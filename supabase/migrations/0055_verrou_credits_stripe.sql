-- 0055 — Verrou des privilèges : crédits et Stripe à nouveau figés (régression 0045, trouvée par l'audit v5 du 04/09).
-- 0007 figeait credits, credits_reset_le, stripe_customer_id, stripe_subscription_id ; 0045 a réécrit la fonction
-- depuis 0005 et les a perdus (0051 et 0052 ont recopié cette version). Le trigger reste le même.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    -- Crédits et abonnement Stripe : figés depuis 0007, PERDUS par 0045 (corps repris de 0005) — audit v5.
    -- Sans ces lignes, `update artisans set credits = 999999` passait depuis le navigateur.
    new.credits := old.credits;
    new.credits_reset_le := old.credits_reset_le;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    -- Sécurité : la révocation de sessions ne doit pas pouvoir être annulée par un
    -- jeton volé — sinon « fermer toutes mes sessions » ne protège de rien.
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    -- Domaine personnalisé : réservé à l'offre Signature et vérifié par /api/domain.
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- Adresse : ne se change que par /api/account/slug (0051).
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    -- Suppression du compte : programmée et annulée par /api/account/delete seulement (0052).
    new.suppression_demandee_le := old.suppression_demandee_le;
  end if;
  return new;
end $$;

-- Le maillon « tout auto » écrit devis.envoye_le : la colonne n'existait dans aucune migration (échec silencieux).
alter table public.devis add column if not exists envoye_le timestamptz;
