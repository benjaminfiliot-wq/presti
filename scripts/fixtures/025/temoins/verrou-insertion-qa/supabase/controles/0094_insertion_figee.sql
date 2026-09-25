-- Contrôle après collage de 0094 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche
-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if
-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.
-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :
-- ni désactivé, ni réservé à la réplication).
select 'is_founder forcée à false à l''insertion (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.is_founder\s*:=\s*false\s*;' then 'oui' else 'NON (anormal)' end as resultat
union all
select 'plan forcée à gratuit à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.plan\s*:=\s*''gratuit''\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits forcée à 3 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits\s*:=\s*3\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits_reset_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits_reset_le\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'stripe_customer_id forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.stripe_customer_id\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'stripe_subscription_id forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.stripe_subscription_id\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'compteur_devis forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.compteur_devis\s*:=\s*0\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'compteur_facture forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.compteur_facture\s*:=\s*0\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits_forfait_servi forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits_forfait_servi\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'credits_periode forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits_periode\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'credits_offerts forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.credits_offerts\s*:=\s*0\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'sessions_invalides_avant forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.sessions_invalides_avant\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'suppression_demandee_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.suppression_demandee_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'connexion_verifiee_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.connexion_verifiee_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'slugs_anciens forcée à vide à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.slugs_anciens\s*:=\s*''\{\}''\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'domaine forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.domaine\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'domaine_verifie forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.domaine_verifie\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'role_interne forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.role_interne\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'est_demo forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.est_demo\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_active forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_active\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_tier forcée à 3 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_tier\s*:=\s*3\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_contenu forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_contenu\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_contenu_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_contenu_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_origine forcée à abonnement à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.site_origine\s*:=\s*''abonnement''\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'created_at forcée à now() à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*new\.created_at\s*:=\s*now\(\)\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'verrou d''insertion branché : BEFORE INSERT FOR EACH ROW sur lock_artisan_privileges_ins(), actif (attendu : oui)',
       case when exists (select 1 from pg_trigger t
                          where t.tgname = 'trg_lock_artisan_ins' and t.tgrelid = 'public.artisans'::regclass
                            and t.tgfoid = 'public.lock_artisan_privileges_ins()'::regprocedure
                            and (t.tgtype & 3) = 3 and (t.tgtype & 4) = 4 and t.tgenabled = 'O')
            then 'oui' else 'NON (anormal)' end;
