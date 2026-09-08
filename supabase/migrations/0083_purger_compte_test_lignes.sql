-- ============================================================================================
-- 0083 · Le ménage des comptes de test doit passer la garde posée par 0078
--
-- `purger_compte_test` (0054) lève le temps de la purge les deux gardes de `factures` — ces
-- pièces-là n'ont aucune valeur légale. 0078 en a posé une TROISIÈME, sur `factures_lignes`, et la
-- fonction ne la connaissait pas : le `delete from factures_lignes` lève désormais « cette facture
-- est scellée », toute la purge échoue, et un compte de test reste en production avec ses données.
--
-- Ce n'est pas théorique : c'est exactement ce que `zero-demo-e2e` surveille. Une garde qui empêche
-- le ménage fabrique précisément ce qu'une autre suite interdit.
--
-- Le corps ci-dessous est celui de 0054, repris À L'IDENTIQUE — trois lignes ajoutées, rien
-- retiré. Réécrire une fonction SQL de mémoire fait disparaître une ligne sans que personne le voie.
-- ============================================================================================

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
  -- 0083 — la garde posée par 0078 sur les LIGNES rejoint les deux autres : sans elle, le
  -- `delete from factures_lignes` lève « cette facture est scellée », toute la purge échoue, et
  -- un compte de test reste en production — ce que `zero-demo-e2e` interdit par ailleurs.
  alter table public.factures_lignes disable trigger factures_lignes_immuables;
  begin
    delete from public.factures_lignes where facture_id in (select id from public.factures where artisan_id = p_id);
    delete from public.factures where artisan_id = p_id;
    get diagnostics v_factures = row_count;
  exception when others then
    alter table public.factures enable trigger factures_conservees;
    alter table public.factures enable trigger factures_immuables;
    alter table public.factures_lignes enable trigger factures_lignes_immuables;
    raise;
  end;
  alter table public.factures enable trigger factures_conservees;
  alter table public.factures enable trigger factures_immuables;
  alter table public.factures_lignes enable trigger factures_lignes_immuables;

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
