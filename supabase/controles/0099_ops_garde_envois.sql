with fonctions(signature, publique) as (
  values ('ops.garde_envois()', false),
         ('ops.annuler_sur_opposition()', false),
         ('ops.garde_accords()', false),
         ('public.ops_garde_etat()', true)
), lues as (
  select f.signature, f.publique, to_regprocedure(f.signature) as fonction from fonctions f
), declencheurs as (
  select t.tgname, c.relname, t.tgenabled, t.tgtype, t.tgfoid,
         (select string_agg(a.attname, ',' order by a.attname)
            from pg_attribute a
           where a.attrelid = c.oid and a.attnum = any (t.tgattr::int2[])) as colonnes
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'ops' and not t.tgisinternal
     and t.tgname in ('garde_envois', 'annuler_sur_opposition', 'garde_accords')
), accords as (
  select to_regclass('ops.accords_benj') as t
)
select 'déclencheur garde_envois : before insert or update (toutes les colonnes) on ops.envois, for each row, actif, ops.garde_envois() (attendu : oui)' as quoi,
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'garde_envois' and d.relname = 'envois'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 23 and d.colonnes is null
                            and d.tgfoid = to_regprocedure('ops.garde_envois()'))
            then 'oui' else 'NON (anormal)' end as resultat
union all
select 'déclencheur annuler_sur_opposition : after insert or update of expire_le on ops.opposition, for each row, actif (attendu : oui)',
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'annuler_sur_opposition' and d.relname = 'opposition'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 21 and d.colonnes = 'expire_le'
                            and d.tgfoid = to_regprocedure('ops.annuler_sur_opposition()'))
            then 'oui' else 'NON (anormal)' end
union all
select 'déclencheur garde_accords : before insert or update on ops.accords_benj, for each row, actif, ops.garde_accords() (attendu : oui)',
       case when exists (select 1 from declencheurs d
                          where d.tgname = 'garde_accords' and d.relname = 'accords_benj'
                            and d.tgenabled in ('O', 'A') and d.tgtype = 23 and d.colonnes is null
                            and d.tgfoid = to_regprocedure('ops.garde_accords()'))
            then 'oui' else 'NON (anormal)' end
union all
select 'contrainte envois_statut_check : les sept statuts, dont attend_accord_benj (attendu : oui)',
       case when exists (select 1 from pg_constraint k
                          where k.conrelid = to_regclass('ops.envois') and k.conname = 'envois_statut_check'
                            and pg_get_constraintdef(k.oid) like '%''attend_accord_benj''%'
                            and pg_get_constraintdef(k.oid) like '%''prepare''%'
                            and pg_get_constraintdef(k.oid) like '%''approuve''%'
                            and pg_get_constraintdef(k.oid) like '%''envoye''%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.garde_envois porte la correction du 28/09 : entetes et verdicts figés, toute insertion jugée, chaque entrée datée par la base, envoye refusé sous pause ou accord tombé (attendu : oui)',
       case when exists (select 1 from pg_proc p
                          where p.oid = to_regprocedure('ops.garde_envois()')
                            and p.prosrc like '%new.entetes is distinct from old.entetes%'
                            and p.prosrc like '%new.verdicts is distinct from old.verdicts%'
                            and p.prosrc like '%if tg_op = ''UPDATE'' and new.statut not in%'
                            and p.prosrc like '%then%new.prepare_le := now();%new.prepare_le := old.prepare_le;%then%new.prepare_le := now();%'
                            and p.prosrc like '%''ops:accord_perime''%''ops:accord_perime''%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.accords_benj : existe, RLS active sans politique, aucun droit pour anon, authenticated ni service_role (attendu : oui)',
       case when x.t is not null
             and (select c.relrowsecurity from pg_class c where c.oid = x.t)
             and not exists (select 1 from pg_policy p where p.polrelid = x.t)
             and not has_table_privilege('anon', x.t, 'select, insert, update, delete')
             and not has_table_privilege('authenticated', x.t, 'select, insert, update, delete')
             and not has_table_privilege('service_role', x.t, 'select, insert, update, delete')
            then 'oui' else 'NON (anormal)' end
  from accords x
union all
select '(instagram, *), (facebook, *) et (formulaire_site, *) à 0 tant que 0111 n''a pas appliqué de palier, (email_sollicite, *) à 50 (attendu : oui)',
       case when (select count(*) from ops.quotas_canaux q
                   where q.envoyeur = '*' and q.canal in ('instagram', 'facebook', 'formulaire_site')
                     and q.plafond_jour = 0 and q.plafond_nouveaux_jour = 0) = 3
             and exists (select 1 from ops.quotas_canaux q
                          where q.canal = 'email_sollicite' and q.envoyeur = '*' and q.plafond_jour = 50)
            then 'oui' else 'NON (anormal)' end
union all
select 'envoi_froid fermé (attendu : oui)',
       case when exists (select 1 from ops.interrupteurs i where i.nom = 'envoi_froid' and i.actif = false)
            then 'oui' else 'NON (anormal)' end
union all
select 'ops_garde_etat : existe, security definer, search_path=ops, public, pg_temp, exécutable par service_role seul, comme en 0097 (attendu : oui)',
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end
  from lues l
  left join pg_proc p on p.oid = l.fonction
 where l.signature = 'public.ops_garde_etat()'
union all
select 'anon et authenticated n''exécutent rien de 0099 ; les trois fonctions de déclencheur, service_role non plus (attendu : oui)',
       case when (select count(*) from lues l where l.fonction is not null) = 4
             and not exists (select 1 from lues l
                              where has_function_privilege('anon', l.fonction, 'execute')
                                 or has_function_privilege('authenticated', l.fonction, 'execute')
                                 or (not l.publique and has_function_privilege('service_role', l.fonction, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'une seule version de chaque fonction de 0099 (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where (n.nspname = 'ops' and p.proname in ('garde_envois', 'annuler_sur_opposition', 'garde_accords'))
                                 or (n.nspname = 'public' and p.proname = 'ops_garde_etat')
                              group by n.nspname, p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end;
