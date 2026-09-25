# 025-04 — essai à sec de 0093 sur la vraie base

- **Quand** : 2026-09-24, par Claude Code (fiche 025-04).
- **Où** : projet Supabase `presti` (`gorcdvmueakcncsmrouo`, eu-central-1, Postgres 17), vérifié par `list_projects` ;
  la même référence figure dans l'URL de `.env.local` (compté, jamais affiché).
- **Outil** : `execute_sql` du connecteur Supabase, rôle `postgres`. Jamais `apply_migration`.
- **Technique** (mémoire « essai-a-sec-migration ») : UN seul énoncé `do $essai$ … $essai$` qui `EXECUTE` le texte du jumeau nu
  `_A_COLLER_sql_editor_0093_NU.sql` (coupé à la marque de contrôle), fait les vérifications, puis se termine par
  `raise exception 'ESSAI_A_SEC %', r` : l'exception rend le résultat ET annule tout (fonction, comptes d'essai, écritures).
- **Rien n'est appliqué en production** : relu après coup (section « Après l'essai »).

## Verdict

| Étape | Attendu | Obtenu |
|---|---|---|
| A. Contrôle `supabase/controles/0093_site_fige.sql` sur la fonction en production | NON sur les 4 colonnes | NON × 4 (verrou branché : oui) |
| C. AVANT 0093, le navigateur (`authenticated`, sa propre ligne) écrit site_active=true, site_tier=3, site_contenu, site_origine='commande' | passe (le trou existe) | **passe** : 1 ligne, relu true / 3 / {"verrou":"force"} / commande |
| D. `EXECUTE` du jumeau nu | sans erreur | sans erreur |
| E. Le même contrôle après | oui × 5 | **oui × 5** |
| F. APRÈS 0093, le navigateur retente la même écriture + une bio témoin | bio changée, 4 colonnes inchangées | **1 ligne, bio = navigateur-apres-0093, colonnes relues false / 1 / {"verrou":"initial"} / abonnement** |
| G. APRÈS 0093, `service_role` (le serveur) ouvre le site | accepté | **accepté** : 1 ligne, relu true / 3 / {"verrou":"serveur"} / commande |
| H. Hors périmètre : un compte NEUF crée sa ligne depuis le navigateur avec le site ouvert | (constat) | **accepté** : relu true / 3 / {"verrou":"insertion"} / commande — voir « Reste ouvert » |

La bio témoin de F prouve que la mise à jour du navigateur a bien eu lieu : ce n'est pas la RLS qui a refusé, c'est le verrou
qui a remis les quatre colonnes à leur ancienne valeur. Le contrôle répond NON avant et oui après : il dit en une requête si le
collage a pris.

## Reste ouvert (hors périmètre de 025-04, à trancher par une autre fiche)

0093 ferme la porte de la MISE À JOUR. L'INSERTION reste ouverte : `lock_artisan_privileges_ins` (dernière définition :
`supabase/migrations/0008_secure_rpc.sql:44-58`) force is_founder, plan, credits, credits_reset_le, les deux identifiants Stripe
et les deux compteurs, mais aucune colonne site_* (ni est_demo, role_interne, domaine, slug…), et la ligne `artisans` est créée
depuis le navigateur à l'onboarding (`app/onboarding/page.tsx:60-66`, `upsert` sous la politique `artisan_insert_own`).
Un compte neuf qui appelle l'API lui-même peut donc naître avec `site_active = true`, `site_tier = 3`, `site_origine = 'commande'`
(étape H). Les autres colonnes figées à la mise à jour mais pas à l'insertion (est_demo, domaine, domaine_verifie…) sont dans le
même cas à la lecture du code : non testé ici.
La fiche dit « Rien d'autre » et le juge exige une seule instruction dans 0093 : rien n'a été ajouté.

## Après l'essai (relu sur la base, énoncé séparé, lecture seule)

```
fonction en production contient site_ (attendu : false)      → false
comptes essai-0093 restants dans auth.users (attendu : 0)    → 0
lignes essai-0093 restantes dans artisans (attendu : 0)      → 0
```

## Résultat brut (message de l'exception, P0001)

```json
{
  "A_controle_avant": {
    "site_tier figée pour le navigateur (attendu : oui)": "NON (0093 pas collée)",
    "site_active figée pour le navigateur (attendu : oui)": "NON (0093 pas collée)",
    "verrou toujours branché sur artisans (attendu : oui)": "oui",
    "site_contenu figée pour le navigateur (attendu : oui)": "NON (0093 pas collée)",
    "site_origine figée pour le navigateur (attendu : oui)": "NON (0093 pas collée)"
  },
  "E_controle_apres": {
    "site_tier figée pour le navigateur (attendu : oui)": "oui",
    "site_active figée pour le navigateur (attendu : oui)": "oui",
    "verrou toujours branché sur artisans (attendu : oui)": "oui",
    "site_contenu figée pour le navigateur (attendu : oui)": "oui",
    "site_origine figée pour le navigateur (attendu : oui)": "oui"
  },
  "C_navigateur_avant_0093": {
    "relu": {
      "bio": "navigateur-avant-0093",
      "site_tier": 3,
      "site_active": true,
      "site_contenu": {
        "verrou": "force"
      },
      "site_origine": "commande"
    },
    "lignes": 1
  },
  "F_navigateur_apres_0093": {
    "relu": {
      "bio": "navigateur-apres-0093",
      "site_tier": 1,
      "site_active": false,
      "site_contenu": {
        "verrou": "initial"
      },
      "site_origine": "abonnement"
    },
    "lignes": 1
  },
  "G_service_role_apres_0093": {
    "relu": {
      "bio": "navigateur-apres-0093",
      "site_tier": 3,
      "site_active": true,
      "site_contenu": {
        "verrou": "serveur"
      },
      "site_origine": "commande"
    },
    "lignes": 1
  },
  "H_insertion_navigateur_apres_0093": {
    "relu": {
      "site_tier": 3,
      "site_active": true,
      "site_contenu": {
        "verrou": "insertion"
      },
      "site_origine": "commande"
    },
    "lignes": 1
  }
}
```

## Le bloc exécuté (généré depuis les fichiers, jamais retapé)

sha256 du bloc : `0b982eb8dc116f92d785eb3c5e13c815d77f158b571fa03768911dbe55c479ff` · sha256 de la partie migration (jumeau nu coupé à la marque) : `24de472cb571b4c48c6625b7c735897dab1f72ac1d00f5891271c656eeb56cdb`.
Généré par un script qui lit `supabase/migrations/_A_COLLER_sql_editor_0093_NU.sql` et `supabase/controles/0093_site_fige.sql` ;
le script vérifie que le bloc porte le jumeau nu actuel. Le rejouer rend le même résultat et ne laisse rien : la dernière
instruction est toujours `raise exception`.

```sql
do $essai$
declare
  r jsonb := '{}'::jsonb;
  avant jsonb := '{}'::jsonb;
  apres jsonb := '{}'::jsonb;
  c record;
  l record;
  n int;
  cible uuid := gen_random_uuid();
  neuf uuid := gen_random_uuid();
begin
  -- A. Le contrôle sur la fonction EN PRODUCTION (avant 0093) : doit répondre NON sur les quatre colonnes.
  for c in execute $controle$select 'site_active figée pour le navigateur (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_active\s*:=\s*old\.site_active\s*;' then 'oui' else 'NON (0093 pas collée)' end as resultat
union all
select 'site_tier figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_tier\s*:=\s*old\.site_tier\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_contenu figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_contenu\s*:=\s*old\.site_contenu\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_origine figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_origine\s*:=\s*old\.site_origine\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'verrou toujours branché sur artisans (attendu : oui)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_upd' and tgrelid = 'public.artisans'::regclass and tgenabled <> 'D') then 'oui' else 'NON (anormal)' end$controle$ loop
    avant := avant || jsonb_build_object(c.quoi, c.resultat);
  end loop;
  r := r || jsonb_build_object('A_controle_avant', avant);

  -- B. Un compte d'essai, créé dans la transaction (annulée à la fin).
  insert into auth.users (id, email, aud, role) values (cible, 'essai-0093-' || cible || '@presti-test.invalid', 'authenticated', 'authenticated');
  insert into public.artisans (id, email, nom, bio, site_active, site_tier, site_contenu, site_origine)
    values (cible, 'essai-0093-' || cible || '@presti-test.invalid', 'Essai 0093', 'avant', false, 1, '{"verrou":"initial"}'::jsonb, 'abonnement');

  -- C. Témoin AVANT 0093 : le navigateur (authenticated, sa propre ligne) ouvre son site.
  begin
    perform set_config('request.jwt.claim.sub', cible::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', cible, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.artisans set site_active = true, site_tier = 3, site_contenu = '{"verrou":"force"}'::jsonb, site_origine = 'commande', bio = 'navigateur-avant-0093' where id = cible;
    get diagnostics n = row_count;
    reset role;
    select a.site_active, a.site_tier, a.site_contenu, a.site_origine, a.bio into l from public.artisans a where a.id = cible;
    r := r || jsonb_build_object('C_navigateur_avant_0093', jsonb_build_object('lignes', n, 'relu', to_jsonb(l)));
  exception when others then
    r := r || jsonb_build_object('C_erreur', sqlerrm);
  end;
  reset role;
  update public.artisans set site_active = false, site_tier = 1, site_contenu = '{"verrou":"initial"}'::jsonb, site_origine = 'abonnement', bio = 'avant' where id = cible;

  -- D. La migration : le texte du jumeau nu, tel que Benj le collera (sans le pied de contrôle).
  execute $migration$---------------------------- _A_COLLER_sql_editor_0093_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
$migration$;

  -- E. Le contrôle APRÈS : doit répondre oui partout.
  for c in execute $controle$select 'site_active figée pour le navigateur (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_active\s*:=\s*old\.site_active\s*;' then 'oui' else 'NON (0093 pas collée)' end as resultat
union all
select 'site_tier figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_tier\s*:=\s*old\.site_tier\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_contenu figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_contenu\s*:=\s*old\.site_contenu\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'site_origine figée pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) ~* '(^|\n)\s*new\.site_origine\s*:=\s*old\.site_origine\s*;' then 'oui' else 'NON (0093 pas collée)' end
union all
select 'verrou toujours branché sur artisans (attendu : oui)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_upd' and tgrelid = 'public.artisans'::regclass and tgenabled <> 'D') then 'oui' else 'NON (anormal)' end$controle$ loop
    apres := apres || jsonb_build_object(c.quoi, c.resultat);
  end loop;
  r := r || jsonb_build_object('E_controle_apres', apres);

  -- F. APRÈS 0093, le navigateur retente : la bio passe (la mise à jour a bien eu lieu), les quatre colonnes restent.
  begin
    perform set_config('request.jwt.claim.sub', cible::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', cible, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.artisans set site_active = true, site_tier = 3, site_contenu = '{"verrou":"force"}'::jsonb, site_origine = 'commande', bio = 'navigateur-apres-0093' where id = cible;
    get diagnostics n = row_count;
    reset role;
    select a.site_active, a.site_tier, a.site_contenu, a.site_origine, a.bio into l from public.artisans a where a.id = cible;
    r := r || jsonb_build_object('F_navigateur_apres_0093', jsonb_build_object('lignes', n, 'relu', to_jsonb(l)));
  exception when others then
    r := r || jsonb_build_object('F_erreur', sqlerrm);
  end;
  reset role;

  -- G. APRÈS 0093, le serveur (service_role) ouvre le site : accepté.
  begin
    set local role service_role;
    update public.artisans set site_active = true, site_tier = 3, site_contenu = '{"verrou":"serveur"}'::jsonb, site_origine = 'commande' where id = cible;
    get diagnostics n = row_count;
    reset role;
    select a.site_active, a.site_tier, a.site_contenu, a.site_origine, a.bio into l from public.artisans a where a.id = cible;
    r := r || jsonb_build_object('G_service_role_apres_0093', jsonb_build_object('lignes', n, 'relu', to_jsonb(l)));
  exception when others then
    r := r || jsonb_build_object('G_erreur', sqlerrm);
  end;
  reset role;

  -- H. Constat hors périmètre : un compte NEUF crée sa ligne depuis le navigateur (onboarding) avec le site ouvert.
  begin
    insert into auth.users (id, email, aud, role) values (neuf, 'essai-0093-' || neuf || '@presti-test.invalid', 'authenticated', 'authenticated');
    perform set_config('request.jwt.claim.sub', neuf::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', neuf, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, site_active, site_tier, site_contenu, site_origine)
      values (neuf, 'essai-0093-' || neuf || '@presti-test.invalid', 'Essai 0093 neuf', true, 3, '{"verrou":"insertion"}'::jsonb, 'commande');
    get diagnostics n = row_count;
    reset role;
    select a.site_active, a.site_tier, a.site_contenu, a.site_origine into l from public.artisans a where a.id = neuf;
    r := r || jsonb_build_object('H_insertion_navigateur_apres_0093', jsonb_build_object('lignes', n, 'relu', to_jsonb(l)));
  exception when others then
    r := r || jsonb_build_object('H_erreur', sqlerrm);
  end;
  reset role;

  raise exception 'ESSAI_A_SEC %', r::text;
end
$essai$;
```
