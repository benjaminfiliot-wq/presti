---------------------------- _A_COLLER_sql_editor_0085_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
  -- 0085 — la SECONDE garde posée par 0078. Elle est sur `devis`, elle refuse la suppression d'un
  -- devis envoyé, et 0083 ne l'avait pas levée : la purge passait les factures pour échouer trois
  -- lignes plus bas, sur « un devis envoyé se conserve ». Même défaut, même fichier, deux gardes —
  -- j'en avais corrigé une seule. Le bloc `exception` remet la garde en place quoi qu'il arrive :
  -- une garde de conservation laissée baissée sur `devis` serait bien pire que la panne qu'elle corrige.
  alter table public.devis disable trigger devis_envoye_conserve;
  begin
    delete from public.messages where lead_id in (select id from public.leads where artisan_id = p_id);
    delete from public.devis_lignes where devis_id in (select id from public.devis where artisan_id = p_id);
    delete from public.devis where artisan_id = p_id;
    delete from public.leads where artisan_id = p_id;
    delete from public.artisans where id = p_id;
    delete from auth.users where id = p_id;
  exception when others then
    alter table public.devis enable trigger devis_envoye_conserve;
    raise;
  end;
  alter table public.devis enable trigger devis_envoye_conserve;
  return jsonb_build_object('id', p_id, 'email', v_email, 'factures', v_factures);
end $fn$;
revoke all on function public.purger_compte_test(uuid) from public, anon, authenticated;
grant execute on function public.purger_compte_test(uuid) to service_role;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'gardes de conservation posees' as quoi,
       string_agg(t.tgname, ', ' order by t.tgname) as resultat
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal and c.relname in ('factures', 'factures_lignes', 'devis')
union all
select 'gardes levees par purger_compte_test',
       coalesce(string_agg(m[1], ', ' order by m[1]), 'AUCUNE — anormal')
  from (select distinct regexp_matches(
          pg_get_functiondef('public.purger_compte_test(uuid)'::regprocedure),
          'disable trigger (\w+)', 'g') as m) x
union all
select 'comptes de test restants',
       coalesce(string_agg(email, ', '), 'aucun')
  from public.artisans where email like '%@presti-test.invalid';
