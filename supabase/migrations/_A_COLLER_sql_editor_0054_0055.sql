-- 0054 — Purge des comptes de TEST (sprint v5, §11).
-- Constat : les suites de test et les captures de démo créent des comptes « @presti-test.invalid »
-- qui émettent une facture d'acompte (règle « réactif »). Une facture émise est conservée 10 ans
-- (trigger factures_conservees, 0041) : la suppression du compte échouait SILENCIEUSEMENT et
-- trois comptes de test sont restés en base. Cette fonction ne s'applique QU'AUX comptes de test
-- (email se terminant par @presti-test.invalid) : les vraies factures restent intouchables.
create or replace function public.purger_compte_test(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text;
  v_factures int := 0;
begin
  select email into v_email from public.artisans where id = p_id;
  if v_email is null then
    select email into v_email from auth.users where id = p_id;
  end if;
  if v_email is null or v_email not like '%@presti-test.invalid' then
    raise exception 'purger_compte_test : réservé aux comptes de test (@presti-test.invalid)';
  end if;

  -- Les factures de test sont sans valeur légale : on lève les gardes le temps de la purge.
  alter table public.factures disable trigger factures_conservees;
  alter table public.factures disable trigger factures_immuables;
  begin
    delete from public.factures_lignes where facture_id in (select id from public.factures where artisan_id = p_id);
    delete from public.factures where artisan_id = p_id;
    get diagnostics v_factures = row_count;
  exception when others then
    alter table public.factures enable trigger factures_conservees;
    alter table public.factures enable trigger factures_immuables;
    raise;
  end;
  alter table public.factures enable trigger factures_conservees;
  alter table public.factures enable trigger factures_immuables;

  delete from public.messages where lead_id in (select id from public.leads where artisan_id = p_id);
  delete from public.devis_lignes where devis_id in (select id from public.devis where artisan_id = p_id);
  delete from public.devis where artisan_id = p_id;
  delete from public.leads where artisan_id = p_id;
  delete from public.artisans where id = p_id;
  delete from auth.users where id = p_id;
  return jsonb_build_object('id', p_id, 'email', v_email, 'factures', v_factures);
end $fn$;

revoke all on function public.purger_compte_test(uuid) from public, anon, authenticated;
grant execute on function public.purger_compte_test(uuid) to service_role;


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
