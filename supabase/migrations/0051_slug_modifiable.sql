-- 0051 — L'adresse de l'artisan est modifiable, et l'ancienne redirige (v5, demande de Benj).
--
-- Deux garanties :
--  1. Une adresse changée ne casse rien : l'ancien slug est conservé dans `slugs_anciens`
--     et les pages publiques redirigent définitivement (308) vers la nouvelle. Les cartes
--     de visite imprimées avec l'ancien lien continuent de mener au bon endroit.
--  2. Le slug ne se change que par /api/account/slug (validation, mots réservés, unicité,
--     y compris contre les anciens slugs de TOUT LE MONDE — sinon l'artisan B pourrait
--     reprendre l'ancienne adresse de A et récupérer ses clients).

alter table public.artisans add column if not exists slugs_anciens text[] not null default '{}';
create index if not exists artisans_slugs_anciens_idx on public.artisans using gin (slugs_anciens);

comment on column public.artisans.slugs_anciens is
  'Anciennes adresses de cet artisan, conservées pour rediriger (308). Alimenté par trigger, jamais à la main.';

-- Historique automatique : à chaque changement de slug, l'ancien rejoint la liste.
create or replace function public.artisans_slug_historique()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.slug is distinct from old.slug and old.slug is not null then
    new.slugs_anciens := array_remove(array_append(old.slugs_anciens, old.slug), new.slug);
  end if;
  return new;
end $$;

drop trigger if exists trg_artisans_slug_historique on public.artisans;
create trigger trg_artisans_slug_historique
  before update of slug on public.artisans
  for each row execute function public.artisans_slug_historique();

-- Retrouver l'artisan actuel derrière une ancienne adresse (utilisé par les pages publiques).
create or replace function public.artisan_par_ancien_slug(p_slug text)
returns table (slug text, domaine text, domaine_verifie boolean)
language sql stable security definer set search_path = public as $$
  select a.slug, a.domaine, a.domaine_verifie
  from public.artisans a
  where a.slugs_anciens @> array[p_slug]
  limit 1
$$;
revoke all on function public.artisan_par_ancien_slug(text) from public, anon, authenticated;
grant execute on function public.artisan_par_ancien_slug(text) to service_role;

-- Verrou de privilèges : le slug et son historique rejoignent les colonnes que l'artisan ne
-- peut PAS modifier depuis son navigateur. (Sans ça, un `update artisans set slug='www'`
-- contournait la validation et les mots réservés.) Corps complet repris de 0045.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
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
  end if;
  return new;
end $$;

comment on function public.lock_artisan_privileges() is
  'Colonnes que l''artisan ne peut PAS modifier depuis son navigateur. ⚠️ Toute nouvelle colonne sensible ajoutée à `artisans` doit être ajoutée ici — c''est l''oubli qui a produit les failles du 2026-09-03.';
