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
