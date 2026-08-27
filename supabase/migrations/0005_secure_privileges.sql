-- ============================================================
-- 0005 · SÉCURITÉ CRITIQUE — verrou d'escalade de privilèges
-- Problème : les policies RLS de `artisans` ne contrôlent que la LIGNE, pas les COLONNES.
-- Un utilisateur pouvait donc faire, depuis la console du navigateur :
--     update artisans set is_founder = true, plan = 'business' where id = auth.uid()
-- → accès total à la plateforme (données de tous, Stripe, mailbox) + IA premium gratuite.
-- Correctif : des triggers qui figent les colonnes sensibles pour tout rôle autre que
-- `service_role` (le serveur) et `postgres` (l'admin SQL). Aucune colonne légitime n'est bloquée.
-- ============================================================

-- UPDATE : un utilisateur ne peut pas changer is_founder / plan / compteurs
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_artisan_upd on public.artisans;
create trigger trg_lock_artisan_upd
  before update on public.artisans
  for each row execute function public.lock_artisan_privileges();

-- INSERT : à la création de compte, is_founder est forcé à false et plan à 'gratuit'
create or replace function public.lock_artisan_privileges_ins()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := false;
    new.plan := 'gratuit';
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_artisan_ins on public.artisans;
create trigger trg_lock_artisan_ins
  before insert on public.artisans
  for each row execute function public.lock_artisan_privileges_ins();

-- Remettre à zéro d'éventuels comptes qui se seraient auto-promus (garde les vrais fondateurs par email)
update public.artisans a set is_founder = false, plan = 'gratuit'
where a.is_founder = true
  and a.id not in (
    select u.id from auth.users u
    where lower(u.email) in ('benjaminfiliot@gmail.com', 'alexandremesroua@gmail.com')
  );
