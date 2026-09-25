---------------------------- _A_COLLER_sql_editor_0095_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
    -- 0095 : l'adresse email est celle du compte connecté (son jeton), pas celle que le navigateur envoie.
    new.email := coalesce(auth.email(), new.email);
    -- 0095 : l'adresse choisie à l'inscription, APRÈS les colonnes forcées (les contrôles cherchent chaque affectation
    -- avant tout if imbriqué). Mots réservés : ceux de lib/urls.ts (SLUGS_RESERVES). Ancienne adresse d'un AUTRE artisan :
    -- les pages publiques cherchent le slug actuel avant l'ancien, le nouveau venu prendrait ses visiteurs.
    if lower(new.slug) = any (array['www', 'qg', 'api', 'admin', 'app', 'mail', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'demande', 'site', 'p', 'login', 'signup', 'onboarding', 'contact', 'presti', 'prestiapp', 'static', 'assets', 'infos-legales', 'cgu', 'mentions-legales', 'confidentialite', 'faq', 'aide']) then
      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';
    end if;
    if public.slug_ancien_d_un_autre(new.slug, new.id) then
      raise exception 'Cette adresse est déjà utilisée : essayez-en une autre.' using errcode = '23505';
    end if;
    -- 0095 : « supprime-… » est l'adresse que la purge donne à un compte anonymisé (lib/urls.ts, PREFIXE_ADRESSE_PURGEE).
    if lower(new.slug) like 'supprime-%' then
      raise exception 'Cette adresse est réservée : choisissez-en une autre.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
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
