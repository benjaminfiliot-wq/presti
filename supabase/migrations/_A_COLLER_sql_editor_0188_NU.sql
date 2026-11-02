---------------------------- _A_COLLER_sql_editor_0188_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
do $rejeu$
declare
  t record;
  g record;
  n_posees integer := 0;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
    order by c.relname
  loop
    for g in
      select * from (values
        ('garde_session', 'as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))'),
        ('garde_suspension_ins', 'as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))'),
        ('garde_suspension_maj', 'as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))'),
        ('garde_suspension_sup', 'as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))')
      ) as v(nom, corps)
    loop
      if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.relname and p.policyname = g.nom) then
        execute format('create policy %I on public.%I %s', g.nom, t.relname, g.corps);
        execute format('comment on policy %I on public.%I is %L', g.nom, t.relname, 'posée par 0188');
        n_posees := n_posees + 1;
        raise notice '0188 : % posée sur %', g.nom, t.relname;
      end if;
    end loop;
  end loop;
  raise notice '0188 : % garde(s) posée(s)', n_posees;
end
$rejeu$;
do $controle$
declare manquantes text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into manquantes
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
     and (select count(*) from pg_policies p
            join (values ('garde_session', 'ALL', 'jeton_session_valide'), ('garde_suspension_ins', 'INSERT', 'compte_non_suspendu'),
                         ('garde_suspension_maj', 'UPDATE', 'compte_non_suspendu'), ('garde_suspension_sup', 'DELETE', 'compte_non_suspendu'))
                 as v(nom, commande, fonction) on v.nom = p.policyname
           where p.schemaname = 'public' and p.tablename = c.relname
             and p.permissive = 'RESTRICTIVE' and p.cmd = v.commande and p.roles = array['authenticated']::name[]
             and coalesce(p.qual, p.with_check) like '%' || v.fonction || '%'
             and (p.cmd = 'INSERT' or p.qual like '%' || v.fonction || '%')
             and (p.cmd = 'DELETE' or p.with_check like '%' || v.fonction || '%')) < 4;
  if manquantes is not null then
    raise exception '0188 : tables à RLS sans leurs quatre gardes restrictives : %', manquantes;
  end if;
end
$controle$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables à RLS sans leurs quatre gardes restrictives (attendu : aucune)' as quoi, coalesce(string_agg(c.relname, ', '), 'aucune') as resultat
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
   and (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.permissive = 'RESTRICTIVE'
         and p.policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')) < 4
union all
select 'gardes posées par 0188 (attendu : le nombre rendu par l''essai à sec)', count(*)::text
  from pg_catalog.pg_policy pol where obj_description(pol.oid, 'pg_policy') = 'posée par 0188';
