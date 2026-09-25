---------------------------- _A_COLLER_sql_editor_0093_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.credits := old.credits;
    new.credits_reset_le := old.credits_reset_le;
    new.credits_forfait_servi := old.credits_forfait_servi;
    new.credits_periode := old.credits_periode;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    new.slug := old.slug;
    new.slugs_anciens := old.slugs_anciens;
    new.suppression_demandee_le := old.suppression_demandee_le;
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
    -- v11 : rôle d'entreprise et marqueur de démonstration — jamais depuis un navigateur.
    new.role_interne := old.role_interne;
    new.est_demo := old.est_demo;
    -- 0093 : le site (ouvert ou non, son niveau, son contenu, son origine) ne s'écrit que par le serveur.
    new.site_active := old.site_active;
    new.site_tier := old.site_tier;
    new.site_contenu := old.site_contenu;
    new.site_origine := old.site_origine;
    -- v11 §4.2 : l'artisan répond une fois, puis c'est scellé.
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
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
