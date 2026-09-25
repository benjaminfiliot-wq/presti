-- Contrôle après collage de 0095 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche
-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if
-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.
-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :
-- ni désactivé, ni réservé à la réplication).
select 'credits_offerts figée pour le navigateur à la mise à jour (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits_offerts\s*:=\s*old\.credits_offerts\s*;' then 'oui' else 'NON (0095 pas collée)' end as resultat
union all
select 'site_contenu_le figée pour le navigateur à la mise à jour (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_contenu_le\s*:=\s*old\.site_contenu_le\s*;' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'created_at figée pour le navigateur à la mise à jour (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.created_at\s*:=\s*old\.created_at\s*;' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'connexion_verifiee_le figée pour le navigateur à la mise à jour (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.connexion_verifiee_le\s*:=\s*old\.connexion_verifiee_le\s*;' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'email figée pour le navigateur à la mise à jour (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.email\s*:=\s*old\.email\s*;' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'adresse réservée refusée à l''inscription (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '\mif\s+lower\s*\(\s*new\.slug\s*\)\s*=\s*any\s*\(\s*array\s*\[\s*''www''.*?\]\s*\)\s*then\s+raise\s+exception\M' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'ancienne adresse d''un autre artisan refusée à l''inscription (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '\mif\s+public\.slug_ancien_d_un_autre\s*\(\s*new\.slug\s*,\s*new\.id\s*\)\s*then\s+raise\s+exception\M' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'adresse d''un compte supprimé (supprime-…) refusée à l''inscription (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '\mif\s+lower\s*\(\s*new\.slug\s*\)\s+like\s+''supprime-%''\s+then\s+raise\s+exception\M' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'email du compte connecté imposée à l''inscription (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.email\s*:=\s*coalesce\s*\(\s*auth\.email\s*\(\s*\)\s*,\s*new\.email\s*\)\s*;' then 'oui' else 'NON (0095 pas collée)' end
union all
select 'anciennes adresses lues avec les droits du propriétaire, appelables par le navigateur, pas par anon (attendu : oui)',
       case when exists (select 1 from pg_proc p
                          where p.oid = to_regprocedure('public.slug_ancien_d_un_autre(text, uuid)') and p.prosecdef
                            and has_function_privilege('authenticated', p.oid, 'execute')
                            and not has_function_privilege('anon', p.oid, 'execute'))
            then 'oui' else 'NON (0095 pas collée)' end
union all
select 'verrou de mise à jour branché : BEFORE UPDATE FOR EACH ROW sur lock_artisan_privileges(), actif (attendu : oui)',
       case when exists (select 1 from pg_trigger t
                          where t.tgname = 'trg_lock_artisan_upd' and t.tgrelid = 'public.artisans'::regclass
                            and t.tgfoid = 'public.lock_artisan_privileges()'::regprocedure
                            and (t.tgtype & 3) = 3 and (t.tgtype & 16) = 16 and t.tgenabled = 'O')
            then 'oui' else 'NON (anormal)' end
union all
select 'verrou d''insertion branché : BEFORE INSERT FOR EACH ROW sur lock_artisan_privileges_ins(), actif (attendu : oui)',
       case when exists (select 1 from pg_trigger t
                          where t.tgname = 'trg_lock_artisan_ins' and t.tgrelid = 'public.artisans'::regclass
                            and t.tgfoid = 'public.lock_artisan_privileges_ins()'::regprocedure
                            and (t.tgtype & 3) = 3 and (t.tgtype & 4) = 4 and t.tgenabled = 'O')
            then 'oui' else 'NON (anormal)' end;
