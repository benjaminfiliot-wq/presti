-- Contrôle après collage de 0093 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche
-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if
-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.
-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :
-- ni désactivé, ni réservé à la réplication).
select 'site_active figée pour le navigateur (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_active\s*:=\s*old\.site_active\s*;' then 'oui' else 'NON (0093 pas collée)' end as resultat
union all
select 'site_tier figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_tier\s*:=\s*old\.site_tier\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_contenu figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_contenu\s*:=\s*old\.site_contenu\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_origine figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_origine\s*:=\s*old\.site_origine\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'verrou de mise à jour branché : BEFORE UPDATE FOR EACH ROW sur lock_artisan_privileges(), actif (attendu : oui)',
       case when exists (select 1 from pg_trigger t
                          where t.tgname = 'trg_lock_artisan_upd' and t.tgrelid = 'public.artisans'::regclass
                            and t.tgfoid = 'public.lock_artisan_privileges()'::regprocedure
                            and (t.tgtype & 3) = 3 and (t.tgtype & 16) = 16 and t.tgenabled = 'O')
            then 'oui' else 'NON (anormal)' end;
