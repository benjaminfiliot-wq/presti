-- 0188 · Les gardes de session reposées sur les tables à RLS qui n'en ont pas, pas M6 (chantier 4, lot L6b).
--
-- ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj. (tâche 032-032, sur le Oracle, par claude-code ; rien n'a touché la base)
-- Ordre : essai à sec par la session principale (il rend la liste des tables qui reçoivent une garde, par raise notice) ; « go » écrit ;
-- application ; contrôle du pied du jumeau. Indépendante de 0183 et de 0184 (§10 l.647, « indépendant »).
--
-- Source : plans/011-cadrage-01-11/chantier-4-assistant-plan.md §8.2 0188 (l.569), pas M6 (l.647) ; cadrage-p3.md §5.5 M6 (l.330 : une
-- dizaine de tables créées après 0138 sans garde) ; 0138_garde_session_rls.sql:28 (« une table créée APRÈS cette migration n'a pas la garde :
-- la boucle est à rejouer ») et sa boucle (l.99-119).
--
-- La boucle de 0138 rejouée, mais STRICTEMENT ADDITIVE : là où 0138 retirait puis recréait chaque garde, celle-ci ne crée une garde que si la
-- table ne l'a pas. Aucune politique existante n'est modifiée ni retirée, même une garde déjà en place. Chaque garde posée ici porte le
-- commentaire « posée par 0188 », qui sert au retour arrière. À la fin, un contrôle lève une exception (tout est annulé) s'il reste une
-- table à RLS du schéma public sans ses quatre gardes, ou une garde_session qui n'est pas restrictive.
-- Ne change rien pour anon ni pour la clé de service : les gardes ne visent que le rôle authenticated (0138:24-25).
--
-- Retour arrière : retire les seules gardes posées par 0188 (les gardes de 0138 et des migrations suivantes restent) :
--   do $$ declare p record; begin
--     for p in select pol.polname, c.relname from pg_policy pol join pg_class c on c.oid = pol.polrelid
--                join pg_namespace n on n.oid = c.relnamespace
--               where n.nspname = 'public' and obj_description(pol.oid, 'pg_policy') = 'posée par 0188' loop
--       execute format('drop policy if exists %I on public.%I', p.polname, p.relname);
--     end loop; end $$;
-- Idempotente : rejouée, elle ne pose rien de plus (toutes les gardes sont alors présentes).

-- Un verrou qui tarde fait échouer la migration proprement, au lieu de bloquer la production.
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

-- Le contrôle : chaque table à RLS du schéma public a ses quatre gardes, restrictives, sur la bonne commande, pour authenticated, et
-- appelant la bonne fonction. Une garde existante qui porte le bon nom mais un autre corps est donc signalée. Sinon, rien ne reste.
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
