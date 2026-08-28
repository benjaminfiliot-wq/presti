-- Presti — Comptage de crédits + abonnements.

alter table public.artisans add column if not exists credits int default 3;
alter table public.artisans add column if not exists credits_reset_le date;
alter table public.artisans add column if not exists stripe_customer_id text;
alter table public.artisans add column if not exists stripe_subscription_id text;

-- Décompte atomique d'un crédit, avec reset mensuel paresseux.
-- Retour : >=0 = crédits restants ; -1 = insuffisant ; -2 = profil introuvable.
create or replace function public.consume_credit(p_uid uuid, p_cost int, p_credits_mois int)
returns int language plpgsql security definer set search_path = public as $$
declare cur int; rl date; today date := current_date;
begin
  select credits, credits_reset_le into cur, rl from public.artisans where id = p_uid for update;
  if not found then return -2; end if;
  if rl is null or rl < today then
    cur := p_credits_mois;
    update public.artisans set credits = p_credits_mois, credits_reset_le = (today + interval '1 month')::date where id = p_uid;
  end if;
  if cur < p_cost then return -1; end if;
  update public.artisans set credits = cur - p_cost where id = p_uid;
  return cur - p_cost;
end $$;

-- Ces colonnes/fonction sont pilotées côté serveur (service_role). On empêche
-- leur modification directe par l'utilisateur : ajout au verrou d'escalade 0005.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    new.credits := old.credits;
    new.credits_reset_le := old.credits_reset_le;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
  end if;
  return new;
end $$;
