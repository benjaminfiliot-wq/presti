do $essai$
-- Essai à sec du TÉMOIN de verrou-maj-qa (fiche 025-13) : tout est annulé par le raise exception final.
declare
  r jsonb := '{}'::jsonb; j jsonb; k jsonb; c record; kk record; n int; s text; ok boolean; res jsonb; v_sub text;
  v93 text := $m93$---------------------------- _A_COLLER_sql_editor_0093_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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

$m93$;
  v94 text := $m94$---------------------------- _A_COLLER_sql_editor_0094_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.lock_artisan_privileges_ins()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := false;
    new.plan := 'gratuit';
    new.credits := 3;
    new.credits_reset_le := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.compteur_devis := 0;
    new.compteur_facture := 0;
    -- 0094 : crédits et session. Figées aussi à la mise à jour par 0068 : credits_forfait_servi, credits_periode,
    -- sessions_invalides_avant, suppression_demandee_le ; credits_offerts et connexion_verifiee_le seulement depuis 0095.
    -- credits_offerts ne se donne que par offrir_credits.
    new.credits_forfait_servi := null;
    new.credits_periode := null;
    new.credits_offerts := 0;
    new.sessions_invalides_avant := null;
    new.suppression_demandee_le := null;
    new.connexion_verifiee_le := null;
    -- 0094 : l'adresse du site (anciens slugs, domaine vérifié) passe par le serveur (/api/account/slug, /api/domain).
    new.slugs_anciens := '{}';
    new.domaine := null;
    new.domaine_verifie := false;
    -- 0094 : rôle d'entreprise et marqueur de démonstration, jamais depuis un navigateur.
    new.role_interne := null;
    new.est_demo := false;
    -- 0094 : le site se commande (300 €) ; un compte neuf naît hors ligne, sans contenu généré.
    new.site_active := false;
    new.site_tier := 3;
    new.site_contenu := null;
    new.site_contenu_le := null;
    new.site_origine := 'abonnement';
    -- 0094 : la date d'inscription est celle de la base (chiffres du Poste, registre des apports).
    new.created_at := now();
  end if;
  return new;
end $$;

$m94$;
  v95 text := $m95$---------------------------- _A_COLLER_sql_editor_0095_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.slug_ancien_d_un_autre(p_slug text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.artisans a
    where a.id is distinct from p_id and a.slugs_anciens @> array[p_slug]
  )
$$;
revoke all on function public.slug_ancien_d_un_autre(text, uuid) from public, anon;
grant execute on function public.slug_ancien_d_un_autre(text, uuid) to authenticated, service_role;
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
    -- 0095 : crédits offerts (servis à chaque renouvellement, 0080), date de génération du site (nulle : génération
    -- offerte), date d'inscription, connexion vérifiée, adresse email. Le serveur seul les écrit.
    new.credits_offerts := old.credits_offerts;
    new.site_contenu_le := old.site_contenu_le;
    new.created_at := old.created_at;
    new.connexion_verifiee_le := old.connexion_verifiee_le;
    new.email := old.email;
    -- v11 §4.2 : l'artisan répond une fois, puis c'est scellé.
    if old.origine_declaree is not null then
      new.origine_declaree  := old.origine_declaree;
      new.origine_precision := old.origine_precision;
    end if;
  end if;
  return new;
end $$;
create or replace function public.lock_artisan_privileges_ins()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    new.is_founder := false;
    new.plan := 'gratuit';
    new.credits := 3;
    new.credits_reset_le := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.compteur_devis := 0;
    new.compteur_facture := 0;
    -- 0094 : crédits et session. Figées aussi à la mise à jour par 0068 : credits_forfait_servi, credits_periode,
    -- sessions_invalides_avant, suppression_demandee_le ; credits_offerts et connexion_verifiee_le seulement depuis 0095.
    -- credits_offerts ne se donne que par offrir_credits.
    new.credits_forfait_servi := null;
    new.credits_periode := null;
    new.credits_offerts := 0;
    new.sessions_invalides_avant := null;
    new.suppression_demandee_le := null;
    new.connexion_verifiee_le := null;
    -- 0094 : l'adresse du site (anciens slugs, domaine vérifié) passe par le serveur (/api/account/slug, /api/domain).
    new.slugs_anciens := '{}';
    new.domaine := null;
    new.domaine_verifie := false;
    -- 0094 : rôle d'entreprise et marqueur de démonstration, jamais depuis un navigateur.
    new.role_interne := null;
    new.est_demo := false;
    -- 0094 : le site se commande (300 €) ; un compte neuf naît hors ligne, sans contenu généré.
    new.site_active := false;
    new.site_tier := 3;
    new.site_contenu := null;
    new.site_contenu_le := null;
    new.site_origine := 'abonnement';
    -- 0094 : la date d'inscription est celle de la base (chiffres du Poste, registre des apports).
    new.created_at := now();
    -- 0095 : l'adresse choisie à l'inscription, APRÈS les colonnes forcées (les contrôles cherchent chaque affectation
    -- avant tout if imbriqué). Mots réservés : ceux de lib/urls.ts (SLUGS_RESERVES). Ancienne adresse d'un AUTRE artisan :
    -- les pages publiques cherchent le slug actuel avant l'ancien, le nouveau venu prendrait ses visiteurs.
    if lower(new.slug) = any (array['www', 'qg', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'demande', 'site', 'p', 'login', 'signup', 'onboarding', 'contact', 'presti', 'prestiapp', 'static', 'assets', 'infos-legales', 'cgu', 'mentions-legales', 'confidentialite', 'faq', 'aide']) then
      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';
    end if;
    if public.slug_ancien_d_un_autre(new.slug, new.id) then
      raise exception 'Cette adresse est déjà utilisée : essayez-en une autre.' using errcode = '23505';
    end if;
  end if;
  return new;
end $$;

$m95$;
  ctl jsonb := $j${"c93":"-- Contrôle après collage de 0093 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche\n-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if\n-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.\n-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :\n-- ni désactivé, ni réservé à la réplication).\nselect 'site_active figée pour le navigateur (attendu : oui)' as quoi,\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_active\\s*:=\\s*old\\.site_active\\s*;' then 'oui' else 'NON (0093 pas collée)' end as resultat\nunion all\nselect 'site_tier figée pour le navigateur (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_tier\\s*:=\\s*old\\.site_tier\\s*;' then 'oui' else 'NON (0093 pas collée)' end\nunion all\nselect 'site_contenu figée pour le navigateur (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_contenu\\s*:=\\s*old\\.site_contenu\\s*;' then 'oui' else 'NON (0093 pas collée)' end\nunion all\nselect 'site_origine figée pour le navigateur (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_origine\\s*:=\\s*old\\.site_origine\\s*;' then 'oui' else 'NON (0093 pas collée)' end\nunion all\nselect 'verrou de mise à jour branché : BEFORE UPDATE FOR EACH ROW sur lock_artisan_privileges(), actif (attendu : oui)',\n       case when exists (select 1 from pg_trigger t\n                          where t.tgname = 'trg_lock_artisan_upd' and t.tgrelid = 'public.artisans'::regclass\n                            and t.tgfoid = 'public.lock_artisan_privileges()'::regprocedure\n                            and (t.tgtype & 3) = 3 and (t.tgtype & 16) = 16 and t.tgenabled = 'O')\n            then 'oui' else 'NON (anormal)' end","c94":"-- Contrôle après collage de 0094 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche\n-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if\n-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.\n-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :\n-- ni désactivé, ni réservé à la réplication).\nselect 'is_founder forcée à false à l''insertion (attendu : oui)' as quoi,\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.is_founder\\s*:=\\s*false\\s*;' then 'oui' else 'NON (anormal)' end as resultat\nunion all\nselect 'plan forcée à gratuit à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.plan\\s*:=\\s*''gratuit''\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'credits forcée à 3 à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits\\s*:=\\s*3\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'credits_reset_le forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits_reset_le\\s*:=\\s*null\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'stripe_customer_id forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.stripe_customer_id\\s*:=\\s*null\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'stripe_subscription_id forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.stripe_subscription_id\\s*:=\\s*null\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'compteur_devis forcée à 0 à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.compteur_devis\\s*:=\\s*0\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'compteur_facture forcée à 0 à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.compteur_facture\\s*:=\\s*0\\s*;' then 'oui' else 'NON (anormal)' end\nunion all\nselect 'credits_forfait_servi forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits_forfait_servi\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'credits_periode forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits_periode\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'credits_offerts forcée à 0 à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits_offerts\\s*:=\\s*0\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'sessions_invalides_avant forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.sessions_invalides_avant\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'suppression_demandee_le forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.suppression_demandee_le\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'connexion_verifiee_le forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.connexion_verifiee_le\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'slugs_anciens forcée à vide à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.slugs_anciens\\s*:=\\s*''\\{\\}''\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'domaine forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.domaine\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'domaine_verifie forcée à false à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.domaine_verifie\\s*:=\\s*false\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'role_interne forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.role_interne\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'est_demo forcée à false à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.est_demo\\s*:=\\s*false\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'site_active forcée à false à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_active\\s*:=\\s*false\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'site_tier forcée à 3 à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_tier\\s*:=\\s*3\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'site_contenu forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_contenu\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'site_contenu_le forcée à null à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_contenu_le\\s*:=\\s*null\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'site_origine forcée à abonnement à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_origine\\s*:=\\s*''abonnement''\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'created_at forcée à now() à l''insertion (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.created_at\\s*:=\\s*now\\(\\)\\s*;' then 'oui' else 'NON (0094 pas collée)' end\nunion all\nselect 'verrou d''insertion branché : BEFORE INSERT FOR EACH ROW sur lock_artisan_privileges_ins(), actif (attendu : oui)',\n       case when exists (select 1 from pg_trigger t\n                          where t.tgname = 'trg_lock_artisan_ins' and t.tgrelid = 'public.artisans'::regclass\n                            and t.tgfoid = 'public.lock_artisan_privileges_ins()'::regprocedure\n                            and (t.tgtype & 3) = 3 and (t.tgtype & 4) = 4 and t.tgenabled = 'O')\n            then 'oui' else 'NON (anormal)' end","c95":"-- Contrôle après collage de 0095 — lecture seule. Sensible à la branche (fiche 025-13) : chaque ligne cherche\n-- l'affectation DANS le bloc « if current_user not in ('service_role', 'postgres') then », à sa profondeur 1, avant tout if\n-- imbriqué : commentée (-- ou /* */), déplacée après le « end if; » ou enfermée sous un « if false », elle répond NON.\n-- Le déclencheur est vérifié par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement, et actif (tgenabled = 'O' :\n-- ni désactivé, ni réservé à la réplication).\nselect 'credits_offerts figée pour le navigateur à la mise à jour (attendu : oui)' as quoi,\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.credits_offerts\\s*:=\\s*old\\.credits_offerts\\s*;' then 'oui' else 'NON (0095 pas collée)' end as resultat\nunion all\nselect 'site_contenu_le figée pour le navigateur à la mise à jour (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.site_contenu_le\\s*:=\\s*old\\.site_contenu_le\\s*;' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'created_at figée pour le navigateur à la mise à jour (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.created_at\\s*:=\\s*old\\.created_at\\s*;' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'connexion_verifiee_le figée pour le navigateur à la mise à jour (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.connexion_verifiee_le\\s*:=\\s*old\\.connexion_verifiee_le\\s*;' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'email figée pour le navigateur à la mise à jour (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* 'if\\s+current_user\\s+not\\s+in\\s*\\(\\s*''service_role''\\s*,\\s*''postgres''\\s*\\)\\s*then[ \\t\\r]*(?:--[^\\n]*)?(?:\\n(?:(?!\\mif\\M|\\melse\\M|\\melsif\\M|\\mend\\M|/\\*|--)[^\\n])*(?:--[^\\n]*)?)*?\\n\\s*new\\.email\\s*:=\\s*old\\.email\\s*;' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'adresse réservée refusée à l''inscription (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '\\mif\\s+lower\\s*\\(\\s*new\\.slug\\s*\\)\\s*=\\s*any\\s*\\(\\s*array\\s*\\[\\s*''www''.*?\\]\\s*\\)\\s*then\\s+raise\\s+exception\\M' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'ancienne adresse d''un autre artisan refusée à l''inscription (attendu : oui)',\n       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '\\mif\\s+public\\.slug_ancien_d_un_autre\\s*\\(\\s*new\\.slug\\s*,\\s*new\\.id\\s*\\)\\s*then\\s+raise\\s+exception\\M' then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'anciennes adresses lues avec les droits du propriétaire, appelables par le navigateur, pas par anon (attendu : oui)',\n       case when exists (select 1 from pg_proc p\n                          where p.oid = to_regprocedure('public.slug_ancien_d_un_autre(text, uuid)') and p.prosecdef\n                            and has_function_privilege('authenticated', p.oid, 'execute')\n                            and not has_function_privilege('anon', p.oid, 'execute'))\n            then 'oui' else 'NON (0095 pas collée)' end\nunion all\nselect 'verrou de mise à jour branché : BEFORE UPDATE FOR EACH ROW sur lock_artisan_privileges(), actif (attendu : oui)',\n       case when exists (select 1 from pg_trigger t\n                          where t.tgname = 'trg_lock_artisan_upd' and t.tgrelid = 'public.artisans'::regclass\n                            and t.tgfoid = 'public.lock_artisan_privileges()'::regprocedure\n                            and (t.tgtype & 3) = 3 and (t.tgtype & 16) = 16 and t.tgenabled = 'O')\n            then 'oui' else 'NON (anormal)' end\nunion all\nselect 'verrou d''insertion branché : BEFORE INSERT FOR EACH ROW sur lock_artisan_privileges_ins(), actif (attendu : oui)',\n       case when exists (select 1 from pg_trigger t\n                          where t.tgname = 'trg_lock_artisan_ins' and t.tgrelid = 'public.artisans'::regclass\n                            and t.tgfoid = 'public.lock_artisan_privileges_ins()'::regprocedure\n                            and (t.tgtype & 3) = 3 and (t.tgtype & 4) = 4 and t.tgenabled = 'O')\n            then 'oui' else 'NON (anormal)' end"}$j$::jsonb;
  reserves text[] := $q${"www","qg","api","admin","app","mail","smtp","imap","ftp","ns1","ns2","demande","site","p","login","signup","onboarding","contact","presti","prestiapp","static","assets","infos-legales","cgu","mentions-legales","confidentialite","faq","aide"}$q$::text[];
  normaux text[] := $q${"dupont-plomberie-qfch","www-rozv","admin-036j","site-vc0w","faq-r1uy","mentions-legales-q7z4","presti-f3at"}$q$::text[];
  cibles jsonb := $j$[["c93","maj","site_active","new.site_active := old.site_active;","noooo","noooo","noooo","nnnno","noooo","nnnno","noooo"],["c93","maj","site_tier","new.site_tier := old.site_tier;","onooo","onooo","onooo","onnno","onooo","onnno","onooo"],["c93","maj","site_contenu","new.site_contenu := old.site_contenu;","oonoo","oonoo","oonoo","oonno","oonoo","oonno","oonoo"],["c93","maj","site_origine","new.site_origine := old.site_origine;","ooono","ooono","ooono","ooono","ooono","ooono","ooono"],["c94","ins","is_founder","new.is_founder := false;","nooooooooooooooooooooooooo","nooooooooooooooooooooooooo","nooooooooooooooooooooooooo","nnnnnnnnnnnnnnnnnnnnnnnnno","nooooooooooooooooooooooooo","nnnnnnnnnnnnnnnnnnnnnnnnno","nooooooooooooooooooooooooo"],["c94","ins","plan","new.plan := 'gratuit';","onoooooooooooooooooooooooo","onoooooooooooooooooooooooo","onoooooooooooooooooooooooo","onnnnnnnnnnnnnnnnnnnnnnnno","onoooooooooooooooooooooooo","onnnnnnnnnnnnnnnnnnnnnnnno","onoooooooooooooooooooooooo"],["c94","ins","credits","new.credits := 3;","oonooooooooooooooooooooooo","oonooooooooooooooooooooooo","oonooooooooooooooooooooooo","oonnnnnnnnnnnnnnnnnnnnnnno","oonooooooooooooooooooooooo","oonnnnnnnnnnnnnnnnnnnnnnno","oonooooooooooooooooooooooo"],["c94","ins","credits_reset_le","new.credits_reset_le := null;","ooonoooooooooooooooooooooo","ooonoooooooooooooooooooooo","ooonoooooooooooooooooooooo","ooonnnnnnnnnnnnnnnnnnnnnno","ooonoooooooooooooooooooooo","ooonnnnnnnnnnnnnnnnnnnnnno","ooonoooooooooooooooooooooo"],["c94","ins","stripe_customer_id","new.stripe_customer_id := null;","oooonooooooooooooooooooooo","oooonooooooooooooooooooooo","oooonooooooooooooooooooooo","oooonnnnnnnnnnnnnnnnnnnnno","oooonooooooooooooooooooooo","oooonnnnnnnnnnnnnnnnnnnnno","oooonooooooooooooooooooooo"],["c94","ins","stripe_subscription_id","new.stripe_subscription_id := null;","ooooonoooooooooooooooooooo","ooooonoooooooooooooooooooo","ooooonoooooooooooooooooooo","ooooonnnnnnnnnnnnnnnnnnnno","ooooonoooooooooooooooooooo","ooooonnnnnnnnnnnnnnnnnnnno","ooooonoooooooooooooooooooo"],["c94","ins","compteur_devis","new.compteur_devis := 0;","oooooonooooooooooooooooooo","oooooonooooooooooooooooooo","oooooonooooooooooooooooooo","oooooonnnnnnnnnnnnnnnnnnno","oooooonooooooooooooooooooo","oooooonnnnnnnnnnnnnnnnnnno","oooooonooooooooooooooooooo"],["c94","ins","compteur_facture","new.compteur_facture := 0;","ooooooonoooooooooooooooooo","ooooooonoooooooooooooooooo","ooooooonoooooooooooooooooo","ooooooonnnnnnnnnnnnnnnnnno","ooooooonoooooooooooooooooo","ooooooonnnnnnnnnnnnnnnnnno","ooooooonoooooooooooooooooo"],["c94","ins","credits_forfait_servi","new.credits_forfait_servi := null;","oooooooonooooooooooooooooo","oooooooonooooooooooooooooo","oooooooonooooooooooooooooo","oooooooonnnnnnnnnnnnnnnnno","oooooooonooooooooooooooooo","oooooooonnnnnnnnnnnnnnnnno","oooooooonooooooooooooooooo"],["c94","ins","credits_periode","new.credits_periode := null;","ooooooooonoooooooooooooooo","ooooooooonoooooooooooooooo","ooooooooonoooooooooooooooo","ooooooooonnnnnnnnnnnnnnnno","ooooooooonoooooooooooooooo","ooooooooonnnnnnnnnnnnnnnno","ooooooooonoooooooooooooooo"],["c94","ins","credits_offerts","new.credits_offerts := 0;","oooooooooonooooooooooooooo","oooooooooonooooooooooooooo","oooooooooonooooooooooooooo","oooooooooonnnnnnnnnnnnnnno","oooooooooonooooooooooooooo","oooooooooonnnnnnnnnnnnnnno","oooooooooonooooooooooooooo"],["c94","ins","sessions_invalides_avant","new.sessions_invalides_avant := null;","ooooooooooonoooooooooooooo","ooooooooooonoooooooooooooo","ooooooooooonoooooooooooooo","ooooooooooonnnnnnnnnnnnnno","ooooooooooonoooooooooooooo","ooooooooooonnnnnnnnnnnnnno","ooooooooooonoooooooooooooo"],["c94","ins","suppression_demandee_le","new.suppression_demandee_le := null;","oooooooooooonooooooooooooo","oooooooooooonooooooooooooo","oooooooooooonooooooooooooo","oooooooooooonnnnnnnnnnnnno","oooooooooooonooooooooooooo","oooooooooooonnnnnnnnnnnnno","oooooooooooonooooooooooooo"],["c94","ins","connexion_verifiee_le","new.connexion_verifiee_le := null;","ooooooooooooonoooooooooooo","ooooooooooooonoooooooooooo","ooooooooooooonoooooooooooo","ooooooooooooonnnnnnnnnnnno","ooooooooooooonoooooooooooo","ooooooooooooonnnnnnnnnnnno","ooooooooooooonoooooooooooo"],["c94","ins","slugs_anciens","new.slugs_anciens := '{}';","oooooooooooooonooooooooooo","oooooooooooooonooooooooooo","oooooooooooooonooooooooooo","oooooooooooooonnnnnnnnnnno","oooooooooooooonooooooooooo","oooooooooooooonnnnnnnnnnno","oooooooooooooonooooooooooo"],["c94","ins","domaine","new.domaine := null;","ooooooooooooooonoooooooooo","ooooooooooooooonoooooooooo","ooooooooooooooonoooooooooo","ooooooooooooooonnnnnnnnnno","ooooooooooooooonoooooooooo","ooooooooooooooonnnnnnnnnno","ooooooooooooooonoooooooooo"],["c94","ins","domaine_verifie","new.domaine_verifie := false;","oooooooooooooooonooooooooo","oooooooooooooooonooooooooo","oooooooooooooooonooooooooo","oooooooooooooooonnnnnnnnno","oooooooooooooooonooooooooo","oooooooooooooooonnnnnnnnno","oooooooooooooooonooooooooo"],["c94","ins","role_interne","new.role_interne := null;","ooooooooooooooooonoooooooo","ooooooooooooooooonoooooooo","ooooooooooooooooonoooooooo","ooooooooooooooooonnnnnnnno","ooooooooooooooooonoooooooo","ooooooooooooooooonnnnnnnno","ooooooooooooooooonoooooooo"],["c94","ins","est_demo","new.est_demo := false;","oooooooooooooooooonooooooo","oooooooooooooooooonooooooo","oooooooooooooooooonooooooo","oooooooooooooooooonnnnnnno","oooooooooooooooooonooooooo","oooooooooooooooooonnnnnnno","oooooooooooooooooonooooooo"],["c94","ins","site_active","new.site_active := false;","ooooooooooooooooooonoooooo","ooooooooooooooooooonoooooo","ooooooooooooooooooonoooooo","ooooooooooooooooooonnnnnno","ooooooooooooooooooonoooooo","ooooooooooooooooooonnnnnno","ooooooooooooooooooonoooooo"],["c94","ins","site_tier","new.site_tier := 3;","oooooooooooooooooooonooooo","oooooooooooooooooooonooooo","oooooooooooooooooooonooooo","oooooooooooooooooooonnnnno","oooooooooooooooooooonooooo","oooooooooooooooooooonnnnno","oooooooooooooooooooonooooo"],["c94","ins","site_contenu","new.site_contenu := null;","ooooooooooooooooooooonoooo","ooooooooooooooooooooonoooo","ooooooooooooooooooooonoooo","ooooooooooooooooooooonnnno","ooooooooooooooooooooonoooo","ooooooooooooooooooooonnnno","ooooooooooooooooooooonoooo"],["c94","ins","site_contenu_le","new.site_contenu_le := null;","oooooooooooooooooooooonooo","oooooooooooooooooooooonooo","oooooooooooooooooooooonooo","oooooooooooooooooooooonnno","oooooooooooooooooooooonooo","oooooooooooooooooooooonnno","oooooooooooooooooooooonooo"],["c94","ins","site_origine","new.site_origine := 'abonnement';","ooooooooooooooooooooooonoo","ooooooooooooooooooooooonoo","ooooooooooooooooooooooonoo","ooooooooooooooooooooooonno","ooooooooooooooooooooooonoo","ooooooooooooooooooooooonno","ooooooooooooooooooooooonoo"],["c94","ins","created_at","new.created_at := now();","oooooooooooooooooooooooono","oooooooooooooooooooooooono","oooooooooooooooooooooooono","oooooooooooooooooooooooono","oooooooooooooooooooooooono","oooooooooooooooooooooooono","oooooooooooooooooooooooono"],["c95","maj","credits_offerts","new.credits_offerts := old.credits_offerts;","noooooo?oo","noooooo?oo","noooooo?oo","nnnnnoo?oo","noooooo?oo","nnnnnoo?oo","noooooo?oo"],["c95","maj","site_contenu_le","new.site_contenu_le := old.site_contenu_le;","onooooo?oo","onooooo?oo","onooooo?oo","onnnnoo?oo","onooooo?oo","onnnnoo?oo","onooooo?oo"],["c95","maj","created_at","new.created_at := old.created_at;","oonoooo?oo","oonoooo?oo","oonoooo?oo","oonnnoo?oo","oonoooo?oo","oonnnoo?oo","oonoooo?oo"],["c95","maj","connexion_verifiee_le","new.connexion_verifiee_le := old.connexion_verifiee_le;","ooonooo?oo","ooonooo?oo","ooonooo?oo","ooonnoo?oo","ooonooo?oo","ooonnoo?oo","ooonooo?oo"],["c95","maj","email","new.email := old.email;","oooonoo?oo","oooonoo?oo","oooonoo?oo","oooonoo?oo","oooonoo?oo","oooonoo?oo","oooonoo?oo"]]$j$::jsonb;
  refus jsonb := $j$[["    if lower(new.slug) = any (array['www', 'qg', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'demande', 'site', 'p', 'login', 'signup', 'onboarding', 'contact', 'presti', 'prestiapp', 'static', 'assets', 'infos-legales', 'cgu', 'mentions-legales', 'confidentialite', 'faq', 'aide']) then\n      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';\n    end if;\n","ooooono?oo"],["    if public.slug_ancien_d_un_autre(new.slug, new.id) then\n      raise exception 'Cette adresse est déjà utilisée : essayez-en une autre.' using errcode = '23505';\n    end if;\n","oooooon?oo"]]$j$::jsonb;
  bases jsonb := $j${"c93":["ooooo","ooooo"],"c94":["oooooooooooooooooooooooooo","oooooooooooooooooooooooooo"],"c95":["ooooooo?oo","ooooooo?oo"]}$j$::jsonb;
  declencheurs jsonb := $j$[["trg_lock_artisan_upd","absent","","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","autre fonction (tgfoid)","tgfoid = 'public.artisans_slug_historique()'::regprocedure","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","AFTER au lieu de BEFORE","tgtype = (tgtype & ~2)::int2","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","FOR EACH STATEMENT","tgtype = (tgtype & ~1)::int2","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","autre événement (INSERT)","tgtype = ((tgtype & ~16) | 4)::int2","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","désactivé (tgenabled = 'D')","tgenabled = 'D'","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","réplication seulement (tgenabled = 'R')","tgenabled = 'R'","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","toujours, même en réplication (tgenabled = 'A')","tgenabled = 'A'","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_upd","autre table","tgrelid = 'public.leads'::regclass","oooon","oooooooooooooooooooooooooo","ooooooo?no"],["trg_lock_artisan_ins","absent","","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","autre fonction (tgfoid)","tgfoid = 'public.artisans_slug_historique()'::regprocedure","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","AFTER au lieu de BEFORE","tgtype = (tgtype & ~2)::int2","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","FOR EACH STATEMENT","tgtype = (tgtype & ~1)::int2","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","autre événement (UPDATE)","tgtype = ((tgtype & ~4) | 16)::int2","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","désactivé (tgenabled = 'D')","tgenabled = 'D'","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","réplication seulement (tgenabled = 'R')","tgenabled = 'R'","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","toujours, même en réplication (tgenabled = 'A')","tgenabled = 'A'","ooooo","ooooooooooooooooooooooooon","ooooooo?on"],["trg_lock_artisan_ins","autre table","tgrelid = 'public.leads'::regclass","ooooo","ooooooooooooooooooooooooon","ooooooo?on"]]$j$::jsonb;
  modes text[] := $q${retire,commente,ligne-commentee,bloc,apres,si-faux,garde}$q$::text[];
  va uuid := gen_random_uuid(); vm uuid := gen_random_uuid(); vn uuid := gen_random_uuid(); vs uuid := gen_random_uuid();
  ancien_autre text; ancien_moi text; b text; t text; L text; att text; ecarts jsonb := '[]'::jsonb; total int := 0;
begin
  ancien_autre := 'essai-0095-vieille-' || left(va::text, 8); ancien_moi := 'essai-0095-ma-vieille-' || left(vm::text, 8);
  r := r || jsonb_build_object('sha256_bloc_recu', encode(sha256(convert_to(regexp_replace(current_query(), '\n\n-- source: POST /mcp[\s\S]*$', ''), 'UTF8')), 'hex'),
    'sha256_0093', encode(sha256(convert_to(v93, 'UTF8')), 'hex'), 'sha256_0094', encode(sha256(convert_to(v94, 'UTF8')), 'hex'), 'sha256_0095', encode(sha256(convert_to(v95, 'UTF8')), 'hex'),
    'sha256_maj_prod', encode(sha256(convert_to(pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure), 'UTF8')), 'hex'),
    'sha256_ins_prod', encode(sha256(convert_to(pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure), 'UTF8')), 'hex'));

  -- A. Les trois contrôles sur la production (avant) : une lettre par ligne, o = oui, n = autre chose.
  j := '{}'::jsonb;
  for kk in select unnest(array['c93', 'c94', 'c95']) as x loop
    s := '';
    for c in execute ctl->>kk.x loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
    j := j || jsonb_build_object(kk.x, s);
  end loop;
  r := r || jsonb_build_object('A', j);

  -- B. Les comptes d'essai (dans la transaction annulée) : un autre artisan avec une ancienne adresse, « moi », un nouveau.
  insert into auth.users (id, email, aud, role) select u, 'essai-0095-' || u || '@presti-test.invalid', 'authenticated', 'authenticated' from unnest(array[va, vm, vn, vs]) as u;
  insert into public.artisans (id, email, nom, slug, slugs_anciens) values (va, 'essai-0095-' || va || '@presti-test.invalid', 'Essai 0095 autre', 'essai-0095-autre-' || left(va::text, 8), array[ancien_autre]);
  insert into public.artisans (id, email, nom, slug, slugs_anciens, credits_offerts, site_contenu_le, created_at, connexion_verifiee_le, bio)
    values (vm, 'essai-0095-' || vm || '@presti-test.invalid', 'Essai 0095 moi', 'essai-0095-moi-' || left(vm::text, 8), array[ancien_moi], 0, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', 'avant');
  r := r || jsonb_build_object('B', (select count(*) from public.artisans where id in (va, vm)));

  -- C. AVANT : la mise à jour hostile du navigateur sur sa ligne (les cinq colonnes + la bio), puis deux inscriptions hostiles.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', vm, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.artisans set credits_offerts = 5000, site_contenu_le = null, created_at = '2020-01-01T00:00:00Z', connexion_verifiee_le = null, email = 'pirate-0095@presti-test.invalid', bio = 'essai-C' where id = vm;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vm;
    r := r || jsonb_build_object('C1', jsonb_build_object('lignes', n, 'bio', j->>'bio', 'credits_offerts', j->'credits_offerts', 'site_contenu_le', j->'site_contenu_le', 'created_at', j->'created_at', 'connexion_verifiee_le', j->'connexion_verifiee_le', 'email', j->'email'));
    raise exception using errcode = 'P0099', message = 'annule';
  exception when sqlstate 'P0099' then null; when others then r := r || jsonb_build_object('C1_erreur', sqlstate || ' ' || sqlerrm);
  end;
  reset role;
  for kk in select * from (values ('C2', 'www'), ('C3', ancien_autre)) as x(etape, slug) loop
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', vn, 'role', 'authenticated')::text, true);
      set local role authenticated;
      insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision) values (vn, 'essai-0095-' || vn || '@presti-test.invalid', 'Essai 0095', 'Plombier', null, 'pro', kk.slug, 'google', null);
      reset role;
      raise exception using errcode = 'P0099', message = 'accepté';
    exception when sqlstate 'P0099' then r := r || jsonb_build_object(kk.etape, 'accepté'); when others then r := r || jsonb_build_object(kk.etape, 'refusé ' || sqlstate || ' ' || sqlerrm);
    end;
    reset role;
  end loop;

  -- D. Les trois jumeaux nus, coupés à la marque, dans l'ordre de collage.
  execute v93; execute v94; execute v95;
  r := r || jsonb_build_object('D', 'exécutés sans erreur');

  -- E. Les trois contrôles après : tout « oui ».
  j := '{}'::jsonb;
  for kk in select unnest(array['c93', 'c94', 'c95']) as x loop
    s := '';
    for c in execute ctl->>kk.x loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
    j := j || jsonb_build_object(kk.x, s);
  end loop;
  r := r || jsonb_build_object('E', j);

  -- F1. APRÈS : la même mise à jour hostile : la bio change, les cinq colonnes non.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', vm, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.artisans set credits_offerts = 5000, site_contenu_le = null, created_at = '2020-01-01T00:00:00Z', connexion_verifiee_le = null, email = 'pirate-0095@presti-test.invalid', bio = 'essai-F1' where id = vm;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vm;
    r := r || jsonb_build_object('F1', jsonb_build_object('lignes', n, 'bio', j->>'bio', 'credits_offerts', j->'credits_offerts', 'site_contenu_le', j->'site_contenu_le', 'created_at', j->'created_at', 'connexion_verifiee_le', j->'connexion_verifiee_le', 'email', j->'email'));
    raise exception using errcode = 'P0099', message = 'annule';
  exception when sqlstate 'P0099' then null; when others then r := r || jsonb_build_object('F1_erreur', sqlstate || ' ' || sqlerrm);
  end;
  reset role;
  -- F1b. Le serveur (service_role) écrit toujours ces colonnes.
  begin
    set local role service_role;
    update public.artisans set credits_offerts = 7, site_contenu_le = null, connexion_verifiee_le = '2026-09-24T00:00:00Z', email = 'serveur-0095@presti-test.invalid' where id = vm;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vm;
    r := r || jsonb_build_object('F1b', jsonb_build_object('credits_offerts', j->'credits_offerts', 'site_contenu_le', j->'site_contenu_le', 'connexion_verifiee_le', j->'connexion_verifiee_le', 'email', j->'email'));
    raise exception using errcode = 'P0099', message = 'annule';
  exception when sqlstate 'P0099' then null; when others then r := r || jsonb_build_object('F1b_erreur', sqlstate || ' ' || sqlerrm);
  end;
  reset role;

  -- F2 à F6. APRÈS : les inscriptions du navigateur (chacune annulée) : mots réservés, anciennes adresses, slugs normaux,
  -- inscription rejouée par « moi » (upsert), avec sa propre ancienne adresse puis celle de l'autre.
  j := '{}'::jsonb;
  for kk in
    select 'reserve' as sorte, x as slug, vn as id from unnest(reserves) as x
    union all select 'majuscules', 'WWW', vn
    union all select 'ancien_autre', ancien_autre, vn
    union all select 'normal', x, vn from unnest(normaux) as x
    union all select 'presque_ancien', ancien_autre || 'x', vn
    union all select 'presque_ancien', left(ancien_autre, length(ancien_autre) - 1), vn
    union all select 'rejoue_mon_ancien', ancien_moi, vm
    union all select 'rejoue_ancien_autre', ancien_autre, vm
  loop
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', kk.id, 'role', 'authenticated')::text, true);
      set local role authenticated;
      insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision)
        values (kk.id, 'essai-0095-' || kk.id || '@presti-test.invalid', 'Essai 0095', 'Plombier', null, 'pro', kk.slug, 'google', null)
        on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision;
      reset role;
      select to_jsonb(a) into res from public.artisans a where a.id = kk.id;
      raise exception using errcode = 'P0099', message = jsonb_build_object('slug', res->>'slug', 'site_active', res->'site_active', 'credits_offerts', res->'credits_offerts', 'role_interne', res->'role_interne', 'created_at_now', (res->>'created_at')::timestamptz = now())::text;
    exception
      when sqlstate 'P0099' then j := j || jsonb_build_object(kk.sorte || ':' || kk.slug || ':' || left(kk.id::text, 4), jsonb_build_object('accepte', true, 'ligne', sqlerrm::jsonb));
      when others then j := j || jsonb_build_object(kk.sorte || ':' || kk.slug || ':' || left(kk.id::text, 4), jsonb_build_object('accepte', false, 'code', sqlstate, 'message', sqlerrm));
    end;
    reset role;
  end loop;
  r := r || jsonb_build_object('F', j);
  -- F7. Le serveur crée une ligne (slug normal, colonnes privilégiées) : rien de forcé, rien de refusé.
  begin
    set local role service_role;
    insert into public.artisans (id, email, nom, slug, site_active, credits_offerts, role_interne) values (vs, 'essai-0095-' || vs || '@presti-test.invalid', 'Essai 0095 serveur', 'essai-0095-serveur-' || left(vs::text, 8), true, 50, 'partenaire');
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vs;
    r := r || jsonb_build_object('F7', jsonb_build_object('site_active', j->'site_active', 'credits_offerts', j->'credits_offerts', 'role_interne', j->'role_interne'));
    raise exception using errcode = 'P0099', message = 'annule';
  exception when sqlstate 'P0099' then null; when others then r := r || jsonb_build_object('F7_erreur', sqlstate || ' ' || sqlerrm);
  end;
  reset role;

  -- G. Les contrôles, exécutés par Postgres sur chaque mutant du juge (fabriqué ici par replace), comparés au simulateur.
  create temp table essai_def (fn text primary key, def text) on commit drop;
  insert into essai_def values ('maj', pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure)), ('ins', pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure));
  create temp table essai_trg on commit drop as select tgname, tgrelid, tgfoid, tgtype, tgenabled, tgisinternal from pg_trigger where tgrelid = 'public.artisans'::regclass and not tgisinternal;
  create temp table essai_ref on commit drop as select * from essai_def;
  -- G0. les bases, LF et CRLF
  for kk in select x from unnest(array['c93', 'c94', 'c95']) as x loop
    for crlf in 0..1 loop
      update essai_def d set def = case when crlf = 1 then replace(e.def, E'\n', E'\r\n') else e.def end from essai_ref e where e.fn = d.fn;
      v_sub := replace(replace(replace(ctl->>kk.x, 'pg_get_functiondef(''public.lock_artisan_privileges()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''maj'')'), 'pg_get_functiondef(''public.lock_artisan_privileges_ins()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''ins'')'), 'from pg_trigger t', 'from pg_temp.essai_trg t');
      s := ''; for c in execute v_sub loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
      att := bases->kk.x->>crlf; total := total + 1;
      if s !~ ('^' || replace(att, '?', '.') || '$') then ecarts := ecarts || jsonb_build_object('base', kk.x || case when crlf = 1 then '/crlf' else '' end, 'postgres', s, 'juge', att); end if;
    end loop;
  end loop;
  update essai_def d set def = e.def from essai_ref e where e.fn = d.fn;
  -- G1. les affectations : sept mutants chacune
  for kk in select value as x from jsonb_array_elements(cibles) loop
    for m in 1..array_length(modes, 1) loop
      select def into b from essai_ref where fn = kk.x->>1;
      t := kk.x->>3; L := '    ' || t || E'\n';
      b := case modes[m]
        when 'retire' then replace(b, L, '')
        when 'commente' then replace(b, L, '    -- ' || (kk.x->>2) || E'\n')
        when 'ligne-commentee' then replace(b, L, '    -- ' || t || E'\n')
        when 'bloc' then replace(b, L, E'    /*\n    ' || t || E'\n    */\n')
        when 'si-faux' then replace(b, L, E'    if false then\n      ' || t || E'\n    end if;\n')
        when 'garde' then replace(b, L, '    new.' || (kk.x->>2) || ' := new.' || (kk.x->>2) || E';\n')
        when 'apres' then replace(replace(b, L, ''), E'\n  end if;\n  return new;', E'\n  end if;\n  ' || t || E'\n  return new;')
      end;
      update essai_def set def = b where fn = kk.x->>1;
      v_sub := replace(replace(replace(ctl->>(kk.x->>0), 'pg_get_functiondef(''public.lock_artisan_privileges()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''maj'')'), 'pg_get_functiondef(''public.lock_artisan_privileges_ins()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''ins'')'), 'from pg_trigger t', 'from pg_temp.essai_trg t');
      s := ''; for c in execute v_sub loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
      att := kk.x->>(3 + m); total := total + 1;
      if s !~ ('^' || replace(att, '?', '.') || '$') then ecarts := ecarts || jsonb_build_object('mutant', (kk.x->>0) || ':' || (kk.x->>2) || '/' || modes[m], 'postgres', s, 'juge', att); end if;
      update essai_def d set def = e.def from essai_ref e where e.fn = d.fn;
    end loop;
  end loop;
  -- G2. les refus de l'inscription, retirés un à un
  for kk in select value as x from jsonb_array_elements(refus) loop
    update essai_def set def = replace(def, kk.x->>0, '') where fn = 'ins';
    v_sub := replace(replace(replace(ctl->>'c95', 'pg_get_functiondef(''public.lock_artisan_privileges()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''maj'')'), 'pg_get_functiondef(''public.lock_artisan_privileges_ins()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''ins'')'), 'from pg_trigger t', 'from pg_temp.essai_trg t');
    s := ''; for c in execute v_sub loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
    att := kk.x->>1; total := total + 1;
    if s !~ ('^' || replace(att, '?', '.') || '$') then ecarts := ecarts || jsonb_build_object('refus', left(kk.x->>0, 60), 'postgres', s, 'juge', att); end if;
    update essai_def d set def = e.def from essai_ref e where e.fn = d.fn;
  end loop;
  -- G3. les déclencheurs, mutés un à un (catalogue pg_trigger copié)
  create temp table essai_trg_ref on commit drop as select * from essai_trg;
  for kk in select value as x from jsonb_array_elements(declencheurs) loop
    if kk.x->>2 = '' then delete from essai_trg where tgname = kk.x->>0;
    else execute format('update pg_temp.essai_trg set %s where tgname = %L', kk.x->>2, kk.x->>0); end if;
    for m in 0..2 loop
      v_sub := replace(replace(replace(ctl->>(array['c93', 'c94', 'c95'])[m + 1], 'pg_get_functiondef(''public.lock_artisan_privileges()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''maj'')'), 'pg_get_functiondef(''public.lock_artisan_privileges_ins()''::regprocedure)', '(select def from pg_temp.essai_def where fn = ''ins'')'), 'from pg_trigger t', 'from pg_temp.essai_trg t');
      s := ''; for c in execute v_sub loop s := s || case when c.resultat = 'oui' then 'o' else 'n' end; end loop;
      att := kk.x->>(3 + m); total := total + 1;
      if s !~ ('^' || replace(att, '?', '.') || '$') then ecarts := ecarts || jsonb_build_object('declencheur', (kk.x->>0) || ' / ' || (kk.x->>1) || ' / ' || (array['c93', 'c94', 'c95'])[m + 1], 'postgres', s, 'juge', att); end if;
    end loop;
    delete from essai_trg; insert into essai_trg select * from essai_trg_ref;
  end loop;
  r := r || jsonb_build_object('G', jsonb_build_object('comparaisons', total, 'ecarts', ecarts));

  -- Toujours : tout est annulé (fonctions, comptes, lignes, tables temporaires).
  raise exception 'ESSAI_A_SEC %', r::text;
end
$essai$;