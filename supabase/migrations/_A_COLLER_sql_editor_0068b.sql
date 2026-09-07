-- À coller dans Supabase → SQL Editor. Complément de 0068 : deux colonnes ajoutées après votre collage,
-- quand la revue adversariale a trouvé qu'un aller-retour d'offre servait le forfait entier à chaque
-- montée (des crédits sans fin pour un prorata net nul).
--
-- Sans elles, rien ne casse : le code se replie sur le forfait de l'offre en cours. Avec elles, la
-- règle devient exacte, période par période.

alter table public.artisans add column if not exists credits_forfait_servi int;
alter table public.artisans add column if not exists credits_periode       date;
comment on column public.artisans.credits_forfait_servi is 'Le plus haut forfait mensuel déjà servi pour la période en cours. Une montée d''offre ne sert que la DIFFÉRENCE.';
comment on column public.artisans.credits_periode is 'Début de la période de facturation Stripe pour laquelle le forfait ci-dessus a été servi.';

-- Le verrou des privilèges les gèle comme les crédits eux-mêmes : sans ça, un navigateur pourrait
-- remettre le compteur à zéro et se resservir.
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
    new.role_interne := old.role_interne;
    new.est_demo := old.est_demo;
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;
