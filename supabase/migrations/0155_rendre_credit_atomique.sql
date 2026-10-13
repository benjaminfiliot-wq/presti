-- 0155 · Remboursement de crédit ATOMIQUE : public.rendre_credit(p_artisan uuid, p_n integer).
-- Écrite le 13/10/2026, NON APPLIQUÉE. À appliquer par Benj après l'essai à sec ci-dessous.
--
-- Audit d'attaque du 12/10 : lib/credits.ts rendreCredit LISAIT le solde puis ÉCRIVAIT solde + coût. Deux restitutions
-- en même temps, ou une restitution pendant un débit (consume_credit), pouvaient s'écraser : un crédit perdu, ou un
-- débit effacé (crédit gratuit). Ici, une seule instruction : credits = coalesce(credits, 0) + p_n, sous le verrou de ligne
-- que prend l'UPDATE — consume_credit (0080, `for update`) attend son tour, et inversement.
--
-- Même famille que consume_credit : security definer, search_path vide, réservée au service (révoquée pour public, anon,
-- authenticated). Le verrou de privilèges (lock_artisan_privileges, 0007 → 0095) laisse passer : la fonction s'exécute en
-- tant que son propriétaire (postgres), comme consume_credit.
-- Rend le nouveau solde, ou -2 si le compte n'existe pas. p_n doit être un entier de 1 à 100 (le plus gros coût d'une
-- génération est 3 ; la recherche fournisseurs, coutForce, reste bien en dessous) : sinon, exception.
--
-- Déploiement : le code (lib/credits.ts restituerCredits) appelle d'abord cette fonction et, tant qu'elle est ABSENTE
-- (PGRST202 / 42883), garde l'ancien chemin. Le code peut donc partir avant l'application ; une fois appliquée, plus rien
-- à faire. Une autre erreur de la fonction ne retombe pas sur l'ancien chemin (pas de double restitution).
--
-- ESSAI À SEC (avant d'appliquer), dans l'éditeur SQL : tout le bloc, qui finit par une exception volontaire (rien ne reste) :
--   do $essai$
--   declare a uuid; avant int; apres int; refus boolean := false;
--   begin
--     -- (le corps de la fonction ci-dessous, créé dans la transaction de l'essai)
--     execute $f$
--       create or replace function public.rendre_credit(p_artisan uuid, p_n integer) returns integer
--       language plpgsql security definer set search_path = '' as $c$
--       declare n integer;
--       begin
--         if p_artisan is null or p_n is null or p_n < 1 or p_n > 100 then raise exception 'rendre_credit : paramètres invalides'; end if;
--         update public.artisans set credits = coalesce(credits, 0) + p_n where id = p_artisan returning credits into n;
--         return coalesce(n, -2);
--       end $c$ $f$;
--     select id, coalesce(credits, 0) into a, avant from public.artisans order by created_at limit 1;
--     apres := public.rendre_credit(a, 3);
--     raise notice 'avant % · après % (attendu : avant + 3)', avant, apres;
--     raise notice 'compte inconnu : % (attendu : -2)', public.rendre_credit('00000000-0000-4000-8000-0000000000ff', 1);
--     begin perform public.rendre_credit(a, 0); exception when others then refus := true; end;
--     raise notice 'p_n = 0 refusé : % (attendu : true)', refus;
--     raise exception 'essai à sec terminé : tout est annulé';
--   end $essai$;
--   [trois NOTICE conformes, puis l'erreur « essai à sec terminé » : rien n'a été écrit]
--
-- REQUÊTES DE CONTRÔLE, APRÈS application (attendu entre crochets) :
--   select p.proname, p.prosecdef, p.proconfig,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth,
--          has_function_privilege('service_role', p.oid, 'execute') as service
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'rendre_credit';
--     [1 ligne : prosecdef = true, proconfig = {search_path=""}, anon = false, auth = false, service = true]
--   Essai sans trace : begin; select public.rendre_credit('<uuid artisan>', 1); rollback;   [solde + 1, puis annulé]

create or replace function public.rendre_credit(p_artisan uuid, p_n integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_artisan is null or p_n is null or p_n < 1 or p_n > 100 then
    raise exception 'rendre_credit : paramètres invalides';
  end if;
  update public.artisans
     set credits = coalesce(credits, 0) + p_n
   where id = p_artisan
  returning credits into n;
  return coalesce(n, -2);
end;
$$;

revoke all on function public.rendre_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.rendre_credit(uuid, integer) to service_role;

comment on function public.rendre_credit(uuid, integer) is
  'Rend p_n crédits (1 à 100) en une instruction (0155, audit d''attaque du 12/10). Service seulement. Nouveau solde, ou -2 si compte inconnu.';

-- Marche arrière :
--   drop function if exists public.rendre_credit(uuid, integer);
--   (le code retombe alors tout seul sur l'ancien chemin)
