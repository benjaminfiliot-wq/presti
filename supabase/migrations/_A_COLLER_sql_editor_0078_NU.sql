---------------------------- _A_COLLER_sql_editor_0078_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
drop policy if exists factures_lignes_own on public.factures_lignes;
create or replace function public.factures_lignes_immuables() returns trigger language plpgsql as $fn$
declare v_verrouillee boolean;
begin
  select f.verrouillee into v_verrouillee
    from public.factures f
   where f.id = coalesce(new.facture_id, old.facture_id);
  if coalesce(v_verrouillee, false) then
    raise exception 'factures_lignes : cette facture est scellée, son détail ne change plus';
  end if;
  return coalesce(new, old);
end $fn$;
drop trigger if exists factures_lignes_immuables on public.factures_lignes;
create trigger factures_lignes_immuables before insert or update or delete on public.factures_lignes
  for each row execute function public.factures_lignes_immuables();
comment on function public.factures_lignes_immuables() is
  'Le détail d''une facture scellée ne change plus (0078). 0044 avait visé une policy qui n''existait pas sous ce nom : le droit d''écriture était resté ouvert depuis. Le trigger, lui, ne dépend pas d''un nom.';
create or replace function public.devis_envoye_conserve() returns trigger language plpgsql as $fn$
begin
  -- Un brouillon s'efface : il n'a jamais quitté l'atelier. Tout le reste est parti chez quelqu'un.
  if coalesce(old.statut, 'brouillon') <> 'brouillon'
     and exists (select 1 from public.artisans a where a.id = old.artisan_id) then
    raise exception 'devis : un devis envoyé se conserve (art. L. 123-22 c. com.), il ne se supprime pas';
  end if;
  return old;
end $fn$;
drop trigger if exists devis_envoye_conserve on public.devis;
create trigger devis_envoye_conserve before delete on public.devis
  for each row execute function public.devis_envoye_conserve();
comment on function public.devis_envoye_conserve() is
  'Un devis qui a quitté l''atelier se conserve (0078). Quatre écrans le promettaient à l''artisan ; la route DELETE ne le vérifiait pas, et supprimer un devis accepté faisait perdre à sa facture sa pièce d''origine.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables' as quoi, string_agg(table_name, ', ' order by table_name) as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('tickets', 'acces_support', 'acces_support_lectures', 'support_verrou')
union all
select 'fonctions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines where routine_schema = 'public' and routine_name like '%support%'
union all
select 'policies fondateur restantes', coalesce(string_agg(policyname, ', '), 'aucune (attendu)')
  from pg_policies where schemaname = 'public' and policyname like 'founders_all_%';
