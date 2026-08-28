-- Presti — CORRECTIF SÉCURITÉ CRITIQUE (audit C1/C2/I1).
-- C1 : les RPC security-definer étaient appelables directement par le client (anon/authenticated)
--      → un user pouvait s'auto-recharger des crédits (coût négatif) ou incrémenter le compteur d'un tiers.
-- Fix : REVOKE des rôles clients (les routes serveur utilisent service_role) + garde-fous.

-- consume_credit : garde-fou coût > 0 (défense en profondeur) + search_path
create or replace function public.consume_credit(p_uid uuid, p_cost int, p_credits_mois int)
returns int language plpgsql security definer set search_path = public as $$
declare cur int; rl date; today date := current_date;
begin
  if p_cost is null or p_cost < 1 then p_cost := 1; end if;                 -- jamais négatif
  if p_credits_mois is null or p_credits_mois < 0 then p_credits_mois := 0; end if;
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

-- next_numero : ajout search_path (durcissement I1)
create or replace function public.next_numero(p_artisan uuid, p_type text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_type = 'facture' then
    update public.artisans set compteur_facture = coalesce(compteur_facture,0)+1 where id = p_artisan returning compteur_facture into n;
  else
    update public.artisans set compteur_devis = coalesce(compteur_devis,0)+1 where id = p_artisan returning compteur_devis into n;
  end if;
  return n;
end $$;

-- C1/I1 : retirer l'exécution des RPC aux rôles clients, la réserver au serveur (service_role)
revoke execute on function public.consume_credit(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.next_numero(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid, int, int) to service_role;
grant execute on function public.next_numero(uuid, text) to service_role;

-- C2 : verrou INSERT complet (le profil est créé côté client par upsert → figer les colonnes sensibles)
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
  end if;
  return new;
end $$;
