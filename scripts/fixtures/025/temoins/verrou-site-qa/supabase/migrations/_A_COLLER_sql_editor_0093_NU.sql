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
    -- 0093 : le site vitrine se commande (300 €) ; le navigateur ne l'ouvre plus, ne le change plus.
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
select 'site_active figé pour le navigateur (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_active := old.site_active;%' then 'oui' else 'NON (anormal)' end as resultat
union all
select 'site_tier figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_tier := old.site_tier;%' then 'oui' else 'NON (anormal)' end
union all
select 'site_contenu figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_contenu := old.site_contenu;%' then 'oui' else 'NON (anormal)' end
union all
select 'site_origine figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_origine := old.site_origine;%' then 'oui' else 'NON (anormal)' end
union all
select 'déclencheur trg_lock_artisan_upd sur artisans (attendu : oui)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_upd' and tgrelid = 'public.artisans'::regclass and not tgisinternal) then 'oui' else 'NON (anormal)' end;
