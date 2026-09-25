# 025-12 — essai à sec de 0094 sur la vraie base

- **Quand** : 2026-09-24, par Claude Code (fiche 025-12).
- **Où** : projet Supabase `presti` (`gorcdvmueakcncsmrouo`, eu-central-1, Postgres 17.6), vérifié par `list_projects`.
- **Outil** : `execute_sql` du connecteur Supabase (rôle `postgres`). Jamais `apply_migration`.
- **Technique** (mémoire « essai-a-sec-migration ») : UN seul énoncé `do $essai$ … $essai$`, généré par un script depuis les fichiers
  (jamais retapé), qui `EXECUTE` le jumeau nu `_A_COLLER_sql_editor_0094_NU.sql` coupé à la marque de contrôle, lit le contrôle
  `supabase/controles/0094_insertion_figee.sql`, et finit TOUJOURS par `raise exception 'ESSAI_A_SEC %', r` : l'exception rend le
  résultat ET annule tout (fonction, comptes, lignes).
- **Preuve que c'est bien le fichier qui a tourné** : le bloc calcule lui-même, dans la base, l'empreinte du texte qu'il a reçu
  (`current_query()`, moins le pied « -- source: POST /mcp … » que le connecteur ajoute), de la migration et du contrôle qu'il
  exécute. Les trois sont égales à celles des fichiers (ligne « Empreintes »).
- **Joué deux fois**, résultats identiques ; la première passe ne savait pas encore ôter le pied du connecteur de son empreinte
  (seule différence entre les deux blocs : les lignes 138-139). Le résultat et le bloc ci-dessous sont ceux de la seconde.
- **Rien n'est appliqué en production** : relu après coup (dernière ligne du verdict, et section « Après l'essai »).

## Verdict : tout est conforme

| Étape | Attendu | Obtenu |
|---|---|---|
| Empreintes | le bloc reçu par la base = bloc.sql ; la migration et le contrôle exécutés = les fichiers du dépôt ; fonction de production = 0008 | **OK** : bloc reçu identique ; migration identique ; contrôle identique ; fonction prod = 0008 oui ; fonction pendant l'essai = corps du jumeau nu oui |
| A. Contrôle sur la production (avant 0094) | 26 lignes : 9 oui (les 8 de 0008 + déclencheur), 17 NON = les 17 nouvelles | **OK** : 26 lignes, 9 oui, 17 NON (exactement les 17 nouvelles) |
| B. Comptes d'essai | 7 comptes essai-0094-…@presti-test.invalid | **OK** : 7 |
| C. Navigateur hostile AVANT 0094 (25 colonnes) | passe : les 8 de 0008 forcées, les 17 nouvelles gardent la valeur envoyée (la faille) | **OK** : 1 ligne ; 0008 au défaut : 8/8 ; nouvelles gardées : 17/17 ; inscription intacte : true |
| C2. L'insertion demandée AVANT 0094 | site_active, domaine essai-insertion.invalid vérifié, partenaire, est_demo relus tels quels (site_tier 3 = défaut) | **OK** : domaine envoyé, est_demo envoyé, site_tier défaut=envoyé, site_active envoyé, role_interne envoyé, domaine_verifie envoyé |
| D. Le jumeau nu exécuté | sans erreur | **OK** : exécutée sans erreur |
| E. Contrôle après | 26 oui | **OK** : 26/26 oui |
| F. Navigateur hostile APRES 0094 | les 25 relues à leur défaut, les 9 de l'inscription intactes | **OK** : 1 ligne ; au défaut : 25/25 ; inscription intacte : true |
| F2. L'insertion demandée APRES 0094 | les six colonnes à leur défaut | **OK** : domaine défaut, est_demo défaut, site_tier défaut=envoyé, site_active défaut, role_interne défaut, domaine_verifie défaut |
| G. Inscription normale avant/après | acceptée ; identique colonne par colonne (hors id, email, nom, slug) ; nom, metier, tel, ton_style, slug, origine gardés | **OK** : 1 ligne ; 72 colonnes comparées, 0 différence ; champs gardés : true ; site_active false ; created_at = now() : true |
| H. service_role APRES 0094 (ligne privilégiée) | les 25 valeurs envoyées gardées : le serveur garde la main | **OK** : 1 ligne ; gardées : 25/25 |
| I. Upsert d'onboarding rejoué sur la ligne de H | accepté, aucun privilège retiré | **OK** : 1 ligne ; privilèges gardés : 25/25 |
| Après l'essai (lecture seule) | fonction de production inchangée (sha = avant, sans site_active), 0 compte et 0 ligne d'essai, totaux inchangés | **OK** : sha ead2e67187e4… ; site_active dans la fonction : false ; comptes essai 0, lignes essai 0 ; artisans 15 → 15, comptes 15 → 15 |

Correspondance avec la tâche : (A) avant 0094 = C et C2 ; (B) le jumeau nu = D ; (C) même insertion après = F et F2 ; (D) inscription
normale = G ; (E) service_role = H ; (F) contrôle = E. `site_tier = 3` de l'insertion demandée est aussi le défaut : il ne prouve rien
seul, d'où l'insertion hostile C/F (niveau 1) sur les 25 colonnes.

Valeurs hostiles envoyées (C, F, H) : is_founder true, plan signature, credits 5000, credits_reset_le 2030-01-01, identifiants Stripe
« cus_/sub_essai_0094 », compteurs 99, credits_forfait_servi 5000, credits_periode 2030-01-01, credits_offerts 5000, les trois dates de
session/suppression/connexion et created_at au 2020-01-01, slugs_anciens {essai-0094-ancien-…}, domaine essai-0094-….invalid vérifié,
role_interne partenaire, est_demo true, site_active true, site_tier 1, site_contenu {"essai":"hostile"}, site_contenu_le 2020-01-01,
site_origine commande. « défaut » = la valeur relue est le défaut de la colonne (created_at : now() de la transaction) ; « envoyé » =
la valeur hostile est restée ; « défaut=envoyé » = les deux se confondent.

## Collage : 0094 peut se coller tout de suite, 0093 attend 025-05

**0094, maintenant.** Vérifié : aucune écriture légitime du navigateur ne choisit l'une des 17 colonnes à l'INSERTION.
- Le seul `insert`/`upsert` sur `artisans` de `app/` et `lib/` est `app/onboarding/page.tsx:60-66`, dans l'arbre de travail comme
  dans le code en production (`HEAD`) ; il envoie les neuf colonnes de l'inscription, aucune des 17 (le juge VI-3 le relit).
- Tout le reste (`/profil`, `/parametres`, `/plateforme`) écrit par `update` : le déclencheur d'insertion ne le voit pas.
- Le serveur (`service_role`) et l'éditeur SQL (`postgres`) sont hors du bloc : les créations de comptes de démonstration, les
  suites qui insèrent en `service_role` et le webhook Stripe gardent la main (étape H). Aucune fonction SQL n'insère dans `artisans`.
- L'`upsert` d'onboarding rejoué sur une ligne qui existe déjà ne retire rien (étape I) : PostgREST ne met à jour que les colonnes
  envoyées.
- Les suites qui insèrent comme un navigateur (`scripts/abonnement-e2e.mjs`, `scripts/site-commande-e2e.mjs`) n'envoient que les
  colonnes de l'inscription ou les huit de 0008, déjà forcées.

Geste de Benj : SQL Editor, coller `supabase/migrations/_A_COLLER_sql_editor_0094_NU.sql` EN ENTIER, exécuter ; le contrôle en pied
doit répondre « oui » sur ses 26 lignes (avant collage : 9 oui, 17 « NON (0094 pas collée) », étape A).

**0093, après le déploiement de 025-05.** Le `/profil` en production (`HEAD`, `app/profil/page.tsx:224-227`) écrit encore
`site_active`, `site_tier` et `site_contenu` par `update` depuis le navigateur ; 0093 les fige à la mise à jour, donc collée avant,
elle ferait ignorer en silence ces enregistrements. 025-05 (PASS à l'orchestre) retire ces écritures, mais ses fichiers ne sont pas
encore committés : pousser, vérifier le déploiement (`node scripts/deploiement-etat.mjs`), puis coller 0093. Les deux migrations
touchent deux fonctions différentes : leur ordre entre elles est indifférent.

**Numérotation.** 0094 est pris par cette fiche : la chaîne que l'assemblage du 24/09 réservait au bus ops se décale d'un cran
(0094-0099 de 026 → 0095-0100, et ce qui suivait). La liste des brouillons à renuméroter :
`grep -l -E "009[4-9]|010[0-7]" .orchestre/brouillons-ecosysteme/026/*.md`.

**Reste ouvert** (hors périmètre, une autre fiche) : le même trou à la MISE À JOUR pour `credits_offerts`, `site_contenu_le`,
`connexion_verifiee_le` et `created_at` (non figées par `lock_artisan_privileges`, ni par 0068 ni par 0093) — voir la fiche.

## Avant et après l'essai (énoncés séparés, lecture seule)

```
avant : {"comptes_essai_0094":0,"lignes_essai_0094":0,"artisans_total":15,"comptes_total":15}
après : {"sha256_fonction_prod":"ead2e67187e4f02767cd5c16c803b91f05dcdc2a6fa6893985127303ca2bce70","fonction_prod_contient_site_active":false,"comptes_essai_0094":0,"lignes_essai_0094":0,"artisans_total":15,"comptes_total":15,"declencheur_branche":1}
```

Production relue avant l'essai (même session) : 76 colonnes dans `public.artisans`, INSERT ouvert à `authenticated` sur les 76 ;
un seul déclencheur BEFORE INSERT (`trg_lock_artisan_ins`, les deux autres sont BEFORE UPDATE) ; fonction non SECURITY DEFINER ;
`lock_artisan_privileges()` sans `site_active` (0093 pas collée) ; politiques `artisan_insert_own` / `artisan_select_own` /
`artisan_update_own` sur `auth.uid() = id` ; index unique `lower(domaine)`.

## Résultat brut (message de l'exception, P0001, seconde passe)

```json
{
  "A": {
    "non": [
      "credits_forfait_servi",
      "credits_periode",
      "credits_offerts",
      "sessions_invalides_avant",
      "suppression_demandee_le",
      "connexion_verifiee_le",
      "slugs_anciens",
      "domaine",
      "domaine_verifie",
      "role_interne",
      "est_demo",
      "site_active",
      "site_tier",
      "site_contenu",
      "site_contenu_le",
      "site_origine",
      "created_at"
    ],
    "oui": 9,
    "lignes": 26
  },
  "B": 7,
  "C": {
    "lignes": 1,
    "colonnes": {
      "plan": "défaut",
      "credits": "défaut",
      "domaine": "envoyé",
      "est_demo": "envoyé",
      "site_tier": "envoyé",
      "created_at": "envoyé",
      "is_founder": "défaut",
      "site_active": "envoyé",
      "role_interne": "envoyé",
      "site_contenu": "envoyé",
      "site_origine": "envoyé",
      "slugs_anciens": "envoyé",
      "compteur_devis": "défaut",
      "credits_offerts": "envoyé",
      "credits_periode": "envoyé",
      "domaine_verifie": "envoyé",
      "site_contenu_le": "envoyé",
      "compteur_facture": "défaut",
      "credits_reset_le": "défaut",
      "stripe_customer_id": "défaut",
      "connexion_verifiee_le": "envoyé",
      "credits_forfait_servi": "envoyé",
      "stripe_subscription_id": "défaut",
      "suppression_demandee_le": "envoyé",
      "sessions_invalides_avant": "envoyé"
    },
    "inscription_intacte": true
  },
  "D": "exécutée sans erreur",
  "E": {
    "non": [],
    "oui": 26,
    "lignes": 26
  },
  "F": {
    "lignes": 1,
    "colonnes": {
      "plan": "défaut",
      "credits": "défaut",
      "domaine": "défaut",
      "est_demo": "défaut",
      "site_tier": "défaut",
      "created_at": "défaut",
      "is_founder": "défaut",
      "site_active": "défaut",
      "role_interne": "défaut",
      "site_contenu": "défaut",
      "site_origine": "défaut",
      "slugs_anciens": "défaut",
      "compteur_devis": "défaut",
      "credits_offerts": "défaut",
      "credits_periode": "défaut",
      "domaine_verifie": "défaut",
      "site_contenu_le": "défaut",
      "compteur_facture": "défaut",
      "credits_reset_le": "défaut",
      "stripe_customer_id": "défaut",
      "connexion_verifiee_le": "défaut",
      "credits_forfait_servi": "défaut",
      "stripe_subscription_id": "défaut",
      "suppression_demandee_le": "défaut",
      "sessions_invalides_avant": "défaut"
    },
    "inscription_intacte": true
  },
  "G": {
    "differences": [],
    "lignes_apres": 1,
    "garde_inscription": true,
    "site_active_apres": false,
    "colonnes_comparees": 72,
    "created_at_apres_est_now": true
  },
  "H": {
    "lignes": 1,
    "colonnes": {
      "plan": "envoyé",
      "credits": "envoyé",
      "domaine": "envoyé",
      "est_demo": "envoyé",
      "site_tier": "envoyé",
      "created_at": "envoyé",
      "is_founder": "envoyé",
      "site_active": "envoyé",
      "role_interne": "envoyé",
      "site_contenu": "envoyé",
      "site_origine": "envoyé",
      "slugs_anciens": "envoyé",
      "compteur_devis": "envoyé",
      "credits_offerts": "envoyé",
      "credits_periode": "envoyé",
      "domaine_verifie": "envoyé",
      "site_contenu_le": "envoyé",
      "compteur_facture": "envoyé",
      "credits_reset_le": "envoyé",
      "stripe_customer_id": "envoyé",
      "connexion_verifiee_le": "envoyé",
      "credits_forfait_servi": "envoyé",
      "stripe_subscription_id": "envoyé",
      "suppression_demandee_le": "envoyé",
      "sessions_invalides_avant": "envoyé"
    },
    "inscription_intacte": true
  },
  "I": {
    "lignes": 1,
    "colonnes": {
      "plan": "envoyé",
      "credits": "envoyé",
      "domaine": "envoyé",
      "est_demo": "envoyé",
      "site_tier": "envoyé",
      "created_at": "envoyé",
      "is_founder": "envoyé",
      "site_active": "envoyé",
      "role_interne": "envoyé",
      "site_contenu": "envoyé",
      "site_origine": "envoyé",
      "slugs_anciens": "envoyé",
      "compteur_devis": "envoyé",
      "credits_offerts": "envoyé",
      "credits_periode": "envoyé",
      "domaine_verifie": "envoyé",
      "site_contenu_le": "envoyé",
      "compteur_facture": "envoyé",
      "credits_reset_le": "envoyé",
      "stripe_customer_id": "envoyé",
      "connexion_verifiee_le": "envoyé",
      "credits_forfait_servi": "envoyé",
      "stripe_subscription_id": "envoyé",
      "suppression_demandee_le": "envoyé",
      "sessions_invalides_avant": "envoyé"
    },
    "inscription_intacte": true
  },
  "C2": {
    "lignes": 1,
    "colonnes": {
      "domaine": "envoyé",
      "est_demo": "envoyé",
      "site_tier": "défaut=envoyé",
      "site_active": "envoyé",
      "role_interne": "envoyé",
      "domaine_verifie": "envoyé"
    },
    "inscription_intacte": true
  },
  "F2": {
    "lignes": 1,
    "colonnes": {
      "domaine": "défaut",
      "est_demo": "défaut",
      "site_tier": "défaut=envoyé",
      "site_active": "défaut",
      "role_interne": "défaut",
      "domaine_verifie": "défaut"
    },
    "inscription_intacte": true
  },
  "sha256_controle": "ab34d87443a264b1a99b4eb4c13ad959706a64cc037549d6d7ade8f1cbd80599",
  "sha256_bloc_recu": "4d07c88e1b098d658d23229aff30b3095e95f06c4d1736ac4b44f5e41609ba45",
  "sha256_migration": "b33e74bf32e021321d7f4bc6f7351fa54497e04290948086b05acf2ee2a07a98",
  "sha256_fonction_prod": "ead2e67187e4f02767cd5c16c803b91f05dcdc2a6fa6893985127303ca2bce70",
  "sha256_fonction_essai": "f7575c7d0b386d2ec8a955d4ce1bf5b08f76e9c6beef5e189a05a4df180e7b19"
}
```

## Le bloc exécuté (seconde passe)

sha256 du bloc : `4d07c88e1b098d658d23229aff30b3095e95f06c4d1736ac4b44f5e41609ba45` (= `sha256_bloc_recu` calculé par la base) ·
sha256 de la partie migration (jumeau nu coupé à la marque) : `b33e74bf32e021321d7f4bc6f7351fa54497e04290948086b05acf2ee2a07a98` ·
sha256 du contrôle exécuté (« ; » final ôté) : `ab34d87443a264b1a99b4eb4c13ad959706a64cc037549d6d7ade8f1cbd80599` ·
sha256 du jumeau nu entier : `ac61e562a84089b86abee831f8156b0033bdbcf9f6dd8e87a498cf5775560296`.

```sql
do $essai$
declare
  r jsonb := '{}'::jsonb;
  j jsonb;
  k jsonb;
  h jsonb;
  ga jsonb;
  gb jsonb;
  c record;
  n int;
  d jsonb := jsonb_build_object('is_founder', false, 'plan', 'gratuit'::text, 'credits', 3, 'credits_reset_le', null::date, 'stripe_customer_id', null::text, 'stripe_subscription_id', null::text, 'compteur_devis', 0, 'compteur_facture', 0, 'credits_forfait_servi', null::int, 'credits_periode', null::date, 'credits_offerts', 0, 'sessions_invalides_avant', null::timestamptz, 'suppression_demandee_le', null::timestamptz, 'connexion_verifiee_le', null::timestamptz, 'slugs_anciens', '{}'::text[], 'domaine', null::text, 'domaine_verifie', false, 'role_interne', null::text, 'est_demo', false, 'site_active', false, 'site_tier', 3::smallint, 'site_contenu', null::jsonb, 'site_contenu_le', null::timestamptz, 'site_origine', 'abonnement'::text, 'created_at', now());
  v_migration text := $migration$---------------------------- _A_COLLER_sql_editor_0094_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
    -- 0094 : crédits et session, comme à la mise à jour (0068) ; credits_offerts ne se donne que par offrir_credits.
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

$migration$;
  v_controle text := $controle$select 'is_founder forcée à false à l''insertion (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.is_founder\s*:=\s*false\s*;' then 'oui' else 'NON (anormal)' end as resultat
union all
select 'plan forcée à gratuit à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.plan\s*:=\s*''gratuit''\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits forcée à 3 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.credits\s*:=\s*3\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits_reset_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.credits_reset_le\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'stripe_customer_id forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.stripe_customer_id\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'stripe_subscription_id forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.stripe_subscription_id\s*:=\s*null\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'compteur_devis forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.compteur_devis\s*:=\s*0\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'compteur_facture forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.compteur_facture\s*:=\s*0\s*;' then 'oui' else 'NON (anormal)' end
union all
select 'credits_forfait_servi forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.credits_forfait_servi\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'credits_periode forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.credits_periode\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'credits_offerts forcée à 0 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.credits_offerts\s*:=\s*0\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'sessions_invalides_avant forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.sessions_invalides_avant\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'suppression_demandee_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.suppression_demandee_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'connexion_verifiee_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.connexion_verifiee_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'slugs_anciens forcée à vide à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.slugs_anciens\s*:=\s*''\{\}''\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'domaine forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.domaine\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'domaine_verifie forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.domaine_verifie\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'role_interne forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.role_interne\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'est_demo forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.est_demo\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_active forcée à false à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.site_active\s*:=\s*false\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_tier forcée à 3 à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.site_tier\s*:=\s*3\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_contenu forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.site_contenu\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_contenu_le forcée à null à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.site_contenu_le\s*:=\s*null\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'site_origine forcée à abonnement à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.site_origine\s*:=\s*''abonnement''\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'created_at forcée à now() à l''insertion (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) ~* '(^|\n)\s*new\.created_at\s*:=\s*now\(\)\s*;' then 'oui' else 'NON (0094 pas collée)' end
union all
select 'verrou d''insertion toujours branché sur artisans (attendu : oui)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_ins' and tgrelid = 'public.artisans'::regclass and tgenabled <> 'D') then 'oui' else 'NON (anormal)' end$controle$;
  vc uuid := gen_random_uuid();
  vc2 uuid := gen_random_uuid();
  vga uuid := gen_random_uuid();
  vf uuid := gen_random_uuid();
  vf2 uuid := gen_random_uuid();
  vgb uuid := gen_random_uuid();
  vh uuid := gen_random_uuid();
begin
  -- Les textes exécutés sont ceux du dépôt : leurs empreintes, calculées ici, se comparent à celles du générateur.
  -- Le connecteur ajoute « \n\n-- source: POST /mcp … -- date: … » après le texte envoyé : ôté avant l'empreinte.
  r := r || jsonb_build_object('sha256_bloc_recu', encode(sha256(convert_to(regexp_replace(current_query(), '\n\n-- source: POST /mcp[\s\S]*$', ''), 'UTF8')), 'hex'),
                               'sha256_migration', encode(sha256(convert_to(v_migration, 'UTF8')), 'hex'),
                               'sha256_controle', encode(sha256(convert_to(v_controle, 'UTF8')), 'hex'),
                               'sha256_fonction_prod', encode(sha256(convert_to(pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure), 'UTF8')), 'hex'));

  -- A. Le contrôle sur la fonction EN PRODUCTION (avant 0094) : 8 oui (0008), 17 NON, déclencheur oui.
  declare
    n_oui int := 0; n_tot int := 0; non jsonb := '[]'::jsonb;
  begin
    for c in execute v_controle loop
      n_tot := n_tot + 1;
      if c.resultat = 'oui' then n_oui := n_oui + 1; else non := non || to_jsonb(split_part(c.quoi, ' ', 1)); end if;
    end loop;
    r := r || jsonb_build_object('A', jsonb_build_object('lignes', n_tot, 'oui', n_oui, 'non', non));
  end;

  -- B. Les comptes d'essai (uuid neufs, adresses @presti-test.invalid), dans la transaction annulée à la fin.
  insert into auth.users (id, email, aud, role)
    select u, 'essai-0094-' || u || '@presti-test.invalid', 'authenticated', 'authenticated' from unnest(array[vc, vc2, vga, vf, vf2, vgb, vh]) as u;
  get diagnostics n = row_count;
  r := r || jsonb_build_object('B', n);

  -- C. AVANT 0094, le navigateur insère sa ligne avec les 25 colonnes privilégiées à une valeur hostile : les 17 nouvelles passent.
  h := jsonb_build_object('is_founder', true, 'plan', 'signature'::text, 'credits', 5000, 'credits_reset_le', '2030-01-01'::date, 'stripe_customer_id', 'cus_essai_0094'::text, 'stripe_subscription_id', 'sub_essai_0094'::text, 'compteur_devis', 99, 'compteur_facture', 99, 'credits_forfait_servi', 5000, 'credits_periode', '2030-01-01'::date, 'credits_offerts', 5000, 'sessions_invalides_avant', '2020-01-01T00:00:00Z'::timestamptz, 'suppression_demandee_le', '2020-01-01T00:00:00Z'::timestamptz, 'connexion_verifiee_le', '2020-01-01T00:00:00Z'::timestamptz, 'slugs_anciens', array['essai-0094-ancien-c']::text[], 'domaine', 'essai-0094-c.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true, 'site_active', true, 'site_tier', 1::smallint, 'site_contenu', '{"essai":"hostile"}'::jsonb, 'site_contenu_le', '2020-01-01T00:00:00Z'::timestamptz, 'site_origine', 'commande'::text, 'created_at', '2020-01-01T00:00:00Z'::timestamptz);
  begin
    perform set_config('request.jwt.claim.sub', vc::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vc, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision, is_founder, plan, credits, credits_reset_le, stripe_customer_id, stripe_subscription_id, compteur_devis, compteur_facture, credits_forfait_servi, credits_periode, credits_offerts, sessions_invalides_avant, suppression_demandee_le, connexion_verifiee_le, slugs_anciens, domaine, domaine_verifie, role_interne, est_demo, site_active, site_tier, site_contenu, site_contenu_le, site_origine, created_at)
      values (vc, 'essai-0094-' || vc || '@presti-test.invalid', 'Essai 0094 C', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vc, 'presente', 'Essai 0094', true, 'signature'::text, 5000, '2030-01-01'::date, 'cus_essai_0094'::text, 'sub_essai_0094'::text, 99, 99, 5000, '2030-01-01'::date, 5000, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, array['essai-0094-ancien-c']::text[], 'essai-0094-c.invalid'::text, true, 'partenaire'::text, true, true, 1::smallint, '{"essai":"hostile"}'::jsonb, '2020-01-01T00:00:00Z'::timestamptz, 'commande'::text, '2020-01-01T00:00:00Z'::timestamptz)
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision, is_founder = excluded.is_founder, plan = excluded.plan, credits = excluded.credits, credits_reset_le = excluded.credits_reset_le, stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id, compteur_devis = excluded.compteur_devis, compteur_facture = excluded.compteur_facture, credits_forfait_servi = excluded.credits_forfait_servi, credits_periode = excluded.credits_periode, credits_offerts = excluded.credits_offerts, sessions_invalides_avant = excluded.sessions_invalides_avant, suppression_demandee_le = excluded.suppression_demandee_le, connexion_verifiee_le = excluded.connexion_verifiee_le, slugs_anciens = excluded.slugs_anciens, domaine = excluded.domaine, domaine_verifie = excluded.domaine_verifie, role_interne = excluded.role_interne, est_demo = excluded.est_demo, site_active = excluded.site_active, site_tier = excluded.site_tier, site_contenu = excluded.site_contenu, site_contenu_le = excluded.site_contenu_le, site_origine = excluded.site_origine, created_at = excluded.created_at;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vc;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('C', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vc, 'email', 'essai-0094-' || vc || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vc, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('C_erreur', sqlerrm);
  end;
  reset role;

  -- C2. AVANT 0094, l'insertion demandée : site_active, site_tier 3, domaine essai-insertion.invalid vérifié, partenaire, est_demo.
  h := jsonb_build_object('site_active', true, 'site_tier', 3::smallint, 'domaine', 'essai-insertion.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true);
  begin
    perform set_config('request.jwt.claim.sub', vc2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vc2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision, site_active, site_tier, domaine, domaine_verifie, role_interne, est_demo)
      values (vc2, 'essai-0094-' || vc2 || '@presti-test.invalid', 'Essai 0094 C2', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vc2, 'presente', 'Essai 0094', true, 3::smallint, 'essai-insertion.invalid'::text, true, 'partenaire'::text, true)
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision, site_active = excluded.site_active, site_tier = excluded.site_tier, domaine = excluded.domaine, domaine_verifie = excluded.domaine_verifie, role_interne = excluded.role_interne, est_demo = excluded.est_demo;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vc2;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('C2', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vc2, 'email', 'essai-0094-' || vc2 || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vc2, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('C2_erreur', sqlerrm);
  end;
  reset role;

  -- G (avant). L'inscription normale : exactement les neuf champs de app/onboarding/page.tsx:62-66, en upsert.
  begin
    perform set_config('request.jwt.claim.sub', vga::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vga, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision)
      values (vga, 'essai-0094-' || vga || '@presti-test.invalid', 'Essai 0094 G', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vga, 'presente', 'Essai 0094')
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into ga from public.artisans a where a.id = vga;
  exception when others then
    r := r || jsonb_build_object('G_avant_erreur', sqlerrm);
  end;
  reset role;

  -- D. La migration : le texte du jumeau nu, tel que Benj le collera (coupé à la marque de contrôle).
  execute v_migration;
  r := r || jsonb_build_object('D', 'exécutée sans erreur', 'sha256_fonction_essai', encode(sha256(convert_to(pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure), 'UTF8')), 'hex'));

  -- E. Le même contrôle après : 26 oui.
  declare
    n_oui int := 0; n_tot int := 0; non jsonb := '[]'::jsonb;
  begin
    for c in execute v_controle loop
      n_tot := n_tot + 1;
      if c.resultat = 'oui' then n_oui := n_oui + 1; else non := non || to_jsonb(split_part(c.quoi, ' ', 1)); end if;
    end loop;
    r := r || jsonb_build_object('E', jsonb_build_object('lignes', n_tot, 'oui', n_oui, 'non', non));
  end;

  -- F. APRES 0094, la même insertion hostile : les 25 relues à leur défaut, l'inscription intacte.
  h := jsonb_build_object('is_founder', true, 'plan', 'signature'::text, 'credits', 5000, 'credits_reset_le', '2030-01-01'::date, 'stripe_customer_id', 'cus_essai_0094'::text, 'stripe_subscription_id', 'sub_essai_0094'::text, 'compteur_devis', 99, 'compteur_facture', 99, 'credits_forfait_servi', 5000, 'credits_periode', '2030-01-01'::date, 'credits_offerts', 5000, 'sessions_invalides_avant', '2020-01-01T00:00:00Z'::timestamptz, 'suppression_demandee_le', '2020-01-01T00:00:00Z'::timestamptz, 'connexion_verifiee_le', '2020-01-01T00:00:00Z'::timestamptz, 'slugs_anciens', array['essai-0094-ancien-f']::text[], 'domaine', 'essai-0094-f.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true, 'site_active', true, 'site_tier', 1::smallint, 'site_contenu', '{"essai":"hostile"}'::jsonb, 'site_contenu_le', '2020-01-01T00:00:00Z'::timestamptz, 'site_origine', 'commande'::text, 'created_at', '2020-01-01T00:00:00Z'::timestamptz);
  begin
    perform set_config('request.jwt.claim.sub', vf::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vf, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision, is_founder, plan, credits, credits_reset_le, stripe_customer_id, stripe_subscription_id, compteur_devis, compteur_facture, credits_forfait_servi, credits_periode, credits_offerts, sessions_invalides_avant, suppression_demandee_le, connexion_verifiee_le, slugs_anciens, domaine, domaine_verifie, role_interne, est_demo, site_active, site_tier, site_contenu, site_contenu_le, site_origine, created_at)
      values (vf, 'essai-0094-' || vf || '@presti-test.invalid', 'Essai 0094 F', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vf, 'presente', 'Essai 0094', true, 'signature'::text, 5000, '2030-01-01'::date, 'cus_essai_0094'::text, 'sub_essai_0094'::text, 99, 99, 5000, '2030-01-01'::date, 5000, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, array['essai-0094-ancien-f']::text[], 'essai-0094-f.invalid'::text, true, 'partenaire'::text, true, true, 1::smallint, '{"essai":"hostile"}'::jsonb, '2020-01-01T00:00:00Z'::timestamptz, 'commande'::text, '2020-01-01T00:00:00Z'::timestamptz)
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision, is_founder = excluded.is_founder, plan = excluded.plan, credits = excluded.credits, credits_reset_le = excluded.credits_reset_le, stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id, compteur_devis = excluded.compteur_devis, compteur_facture = excluded.compteur_facture, credits_forfait_servi = excluded.credits_forfait_servi, credits_periode = excluded.credits_periode, credits_offerts = excluded.credits_offerts, sessions_invalides_avant = excluded.sessions_invalides_avant, suppression_demandee_le = excluded.suppression_demandee_le, connexion_verifiee_le = excluded.connexion_verifiee_le, slugs_anciens = excluded.slugs_anciens, domaine = excluded.domaine, domaine_verifie = excluded.domaine_verifie, role_interne = excluded.role_interne, est_demo = excluded.est_demo, site_active = excluded.site_active, site_tier = excluded.site_tier, site_contenu = excluded.site_contenu, site_contenu_le = excluded.site_contenu_le, site_origine = excluded.site_origine, created_at = excluded.created_at;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vf;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('F', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vf, 'email', 'essai-0094-' || vf || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vf, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('F_erreur', sqlerrm);
  end;
  reset role;

  -- F2. APRES 0094, l'insertion demandée : les six colonnes à leur défaut.
  h := jsonb_build_object('site_active', true, 'site_tier', 3::smallint, 'domaine', 'essai-insertion.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true);
  begin
    perform set_config('request.jwt.claim.sub', vf2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vf2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision, site_active, site_tier, domaine, domaine_verifie, role_interne, est_demo)
      values (vf2, 'essai-0094-' || vf2 || '@presti-test.invalid', 'Essai 0094 F2', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vf2, 'presente', 'Essai 0094', true, 3::smallint, 'essai-insertion.invalid'::text, true, 'partenaire'::text, true)
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision, site_active = excluded.site_active, site_tier = excluded.site_tier, domaine = excluded.domaine, domaine_verifie = excluded.domaine_verifie, role_interne = excluded.role_interne, est_demo = excluded.est_demo;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vf2;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('F2', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vf2, 'email', 'essai-0094-' || vf2 || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vf2, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('F2_erreur', sqlerrm);
  end;
  reset role;

  -- G (après). La même inscription normale, comparée colonne par colonne à celle d'avant (hors id, email, nom, slug).
  begin
    perform set_config('request.jwt.claim.sub', vgb::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vgb, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision)
      values (vgb, 'essai-0094-' || vgb || '@presti-test.invalid', 'Essai 0094 G', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vgb, 'presente', 'Essai 0094')
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into gb from public.artisans a where a.id = vgb;
  exception when others then
    r := r || jsonb_build_object('G_apres_erreur', sqlerrm);
  end;
  reset role;

  r := r || jsonb_build_object('G', jsonb_build_object(
    'lignes_apres', n,
    'colonnes_comparees', (select count(*) from jsonb_object_keys(ga - array['id', 'email', 'nom', 'slug'])),
    'differences', coalesce((select jsonb_agg(x) from jsonb_object_keys(ga - array['id', 'email', 'nom', 'slug']) as x where ga->x is distinct from gb->x), '[]'::jsonb),
    'garde_inscription', gb @> jsonb_build_object('nom', 'Essai 0094 G', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vgb, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094'),
    'site_active_apres', gb->'site_active', 'created_at_apres_est_now', (gb->>'created_at')::timestamptz = now()));

  -- H. APRES 0094, le serveur (service_role) crée une ligne privilégiée : il garde la main.
  h := jsonb_build_object('is_founder', true, 'plan', 'signature'::text, 'credits', 5000, 'credits_reset_le', '2030-01-01'::date, 'stripe_customer_id', 'cus_essai_0094'::text, 'stripe_subscription_id', 'sub_essai_0094'::text, 'compteur_devis', 99, 'compteur_facture', 99, 'credits_forfait_servi', 5000, 'credits_periode', '2030-01-01'::date, 'credits_offerts', 5000, 'sessions_invalides_avant', '2020-01-01T00:00:00Z'::timestamptz, 'suppression_demandee_le', '2020-01-01T00:00:00Z'::timestamptz, 'connexion_verifiee_le', '2020-01-01T00:00:00Z'::timestamptz, 'slugs_anciens', array['essai-0094-ancien-h']::text[], 'domaine', 'essai-0094-h.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true, 'site_active', true, 'site_tier', 1::smallint, 'site_contenu', '{"essai":"hostile"}'::jsonb, 'site_contenu_le', '2020-01-01T00:00:00Z'::timestamptz, 'site_origine', 'commande'::text, 'created_at', '2020-01-01T00:00:00Z'::timestamptz);
  begin
    set local role service_role;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision, is_founder, plan, credits, credits_reset_le, stripe_customer_id, stripe_subscription_id, compteur_devis, compteur_facture, credits_forfait_servi, credits_periode, credits_offerts, sessions_invalides_avant, suppression_demandee_le, connexion_verifiee_le, slugs_anciens, domaine, domaine_verifie, role_interne, est_demo, site_active, site_tier, site_contenu, site_contenu_le, site_origine, created_at)
      values (vh, 'essai-0094-' || vh || '@presti-test.invalid', 'Essai 0094 H', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vh, 'presente', 'Essai 0094', true, 'signature'::text, 5000, '2030-01-01'::date, 'cus_essai_0094'::text, 'sub_essai_0094'::text, 99, 99, 5000, '2030-01-01'::date, 5000, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, '2020-01-01T00:00:00Z'::timestamptz, array['essai-0094-ancien-h']::text[], 'essai-0094-h.invalid'::text, true, 'partenaire'::text, true, true, 1::smallint, '{"essai":"hostile"}'::jsonb, '2020-01-01T00:00:00Z'::timestamptz, 'commande'::text, '2020-01-01T00:00:00Z'::timestamptz)
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision, is_founder = excluded.is_founder, plan = excluded.plan, credits = excluded.credits, credits_reset_le = excluded.credits_reset_le, stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id, compteur_devis = excluded.compteur_devis, compteur_facture = excluded.compteur_facture, credits_forfait_servi = excluded.credits_forfait_servi, credits_periode = excluded.credits_periode, credits_offerts = excluded.credits_offerts, sessions_invalides_avant = excluded.sessions_invalides_avant, suppression_demandee_le = excluded.suppression_demandee_le, connexion_verifiee_le = excluded.connexion_verifiee_le, slugs_anciens = excluded.slugs_anciens, domaine = excluded.domaine, domaine_verifie = excluded.domaine_verifie, role_interne = excluded.role_interne, est_demo = excluded.est_demo, site_active = excluded.site_active, site_tier = excluded.site_tier, site_contenu = excluded.site_contenu, site_contenu_le = excluded.site_contenu_le, site_origine = excluded.site_origine, created_at = excluded.created_at;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vh;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('H', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vh, 'email', 'essai-0094-' || vh || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vh, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('H_erreur', sqlerrm);
  end;
  reset role;

  -- I. L'upsert d'onboarding (neuf colonnes, on conflict (id) do update) rejoué par le navigateur sur la ligne de H : rien retiré.
  h := jsonb_build_object('is_founder', true, 'plan', 'signature'::text, 'credits', 5000, 'credits_reset_le', '2030-01-01'::date, 'stripe_customer_id', 'cus_essai_0094'::text, 'stripe_subscription_id', 'sub_essai_0094'::text, 'compteur_devis', 99, 'compteur_facture', 99, 'credits_forfait_servi', 5000, 'credits_periode', '2030-01-01'::date, 'credits_offerts', 5000, 'sessions_invalides_avant', '2020-01-01T00:00:00Z'::timestamptz, 'suppression_demandee_le', '2020-01-01T00:00:00Z'::timestamptz, 'connexion_verifiee_le', '2020-01-01T00:00:00Z'::timestamptz, 'slugs_anciens', array['essai-0094-ancien-h']::text[], 'domaine', 'essai-0094-h.invalid'::text, 'domaine_verifie', true, 'role_interne', 'partenaire'::text, 'est_demo', true, 'site_active', true, 'site_tier', 1::smallint, 'site_contenu', '{"essai":"hostile"}'::jsonb, 'site_contenu_le', '2020-01-01T00:00:00Z'::timestamptz, 'site_origine', 'commande'::text, 'created_at', '2020-01-01T00:00:00Z'::timestamptz);
  begin
    perform set_config('request.jwt.claim.sub', vh::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', vh, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.artisans (id, email, nom, metier, tel, ton_style, slug, origine_declaree, origine_precision)
      values (vh, 'essai-0094-' || vh || '@presti-test.invalid', 'Essai 0094 I', 'Menuisier', '05 46 00 00 00', 'pro', 'essai-0094-' || vh, 'presente', 'Essai 0094')
      on conflict (id) do update set email = excluded.email, nom = excluded.nom, metier = excluded.metier, tel = excluded.tel, ton_style = excluded.ton_style, slug = excluded.slug, origine_declaree = excluded.origine_declaree, origine_precision = excluded.origine_precision;
    get diagnostics n = row_count;
    reset role;
    select to_jsonb(a) into j from public.artisans a where a.id = vh;
    select jsonb_object_agg(x, case when j->x = d->x and j->x = h->x then 'défaut=envoyé' when j->x = d->x then 'défaut' when j->x = h->x then 'envoyé' else 'AUTRE:' || coalesce(j->>x, 'null') end) into k from jsonb_object_keys(h) as x;
    r := r || jsonb_build_object('I', jsonb_build_object('lignes', n, 'colonnes', k, 'inscription_intacte', j @> jsonb_build_object('id', vh, 'email', 'essai-0094-' || vh || '@presti-test.invalid', 'metier', 'Menuisier', 'tel', '05 46 00 00 00', 'ton_style', 'pro', 'slug', 'essai-0094-' || vh, 'origine_declaree', 'presente', 'origine_precision', 'Essai 0094')));
  exception when others then
    r := r || jsonb_build_object('I_erreur', sqlerrm);
  end;
  reset role;

  -- Toujours : tout est annulé (fonction, comptes, lignes).
  raise exception 'ESSAI_A_SEC %', r::text;
end
$essai$;
```
