# 026-086 — contre-vérification indépendante, 2026-09-28 (après le correctif du blocage ACL)

Méthode imposée : essais à sec sur la vraie base (`gorcdvmueakcncsmrouo`), par `execute_sql`
uniquement (script écrit indépendamment du scénario `essais/0101.sql`, un seul appel, une seule
transaction implicite, abandonnée volontairement par un `raise exception` final — donc zéro trace
quoi qu'il arrive). `apply_migration` n'a été appelé à aucun moment ici.

## Ce qui est attaqué

Le correctif du 28/09 (voir `.orchestre/preuves/026-086/essai-a-sec.txt` et l'en-tête de
`supabase/migrations/0101_ops_horloge.sql`) : les deux `create extension if not exists` nues sont
remplacées par un bloc gardé (`do $$ begin if not exists (select 1 from pg_extension where extname
= …) then create extension …; end if; end $$;`), qui n'exécute `create extension` que si
`pg_extension` ne porte pas déjà la ligne — donc ne relance jamais le script de réinstallation
interne de pg_cron qui échouait en `2BP01 dependent privileges exist`.

## Les 4 attaques (+ 1 test de rejouabilité qui les porte toutes)

1. **Rejeu du fichier RÉEL** (`supabase/migrations/0101_ops_horloge.sql`, pas un jumeau, pas le
   scénario) **deux fois de suite** dans la même transaction, par deux `execute $tag$…$tag$` séparés
   avec des étiquettes distinctes. But : prouver que le bloc gardé est idempotent même rejoué en
   entier avec le reste de la migration (fonctions en `create or replace`, `cron.schedule` qui se
   remplace), pas seulement en isolation.
2. **Droits, en direct** (pas via le scénario de la fiche) : `anon`, `authenticated` et
   `service_role` tentent chacun `ops_horloge_minute()` et `ops_horloge_etat(10)` par `set local
   role` + `perform`, hors de toute fonction wrapper.
3. **Fuite du secret** : comparaison **interne au SQL**, jamais affichée — `(ops_horloge_etat(60)::text)
   not ilike ('%' || <valeur réelle du secret, lue une seule fois en local> || '%')`. La valeur du
   secret n'est à aucun moment renvoyée par `execute_sql` ni écrite dans ce fichier : seul le
   booléen du test sort de la transaction.
4. **Le bloc gardé, isolé** du reste de la migration, rejoué **quatre fois de suite** (deux fois
   pour chaque extension) par quatre `execute $tag$…$tag$` séparés (pour rester en SQL dynamique et
   éviter toute ambiguïté sur l'imbrication d'un `DO` bare dans un bloc plpgsql) : ne doit jamais
   lever d'erreur et ne doit jamais changer `pg_extension`.

## Résultat (message d'erreur `CONTRE_086`, recopié tel quel, seul le JSON compte)

```
CONTRE_086 {"diag_ext": "2 puis 2", "anon_etat": true, "anon_minute": true, "rejeu_double_ok": true,
"service_role_etat": true, "authenticated_etat": true, "service_role_minute": true,
"authenticated_minute": true, "secret_absent_du_json_etat": true,
"bloc_garde_rejoue_sans_erreur": true, "bloc_garde_extensions_inchangees": true}
```

| Attaque | Clé | Résultat |
|---|---|---|
| 1. rejeu du fichier réel × 2 | `rejeu_double_ok` | **vrai** — aucune erreur, aucune 2BP01, sur le fichier réel rejoué en entier deux fois |
| 2. droits anon/authenticated/service_role | `anon_minute`, `anon_etat`, `authenticated_minute`, `authenticated_etat`, `service_role_minute` | **tous refusés** (42501) : personne n'exécute `ops_horloge_minute` |
| 2. droits, `ops_horloge_etat` par service_role | `service_role_etat` | **vrai** (accepté) : cohérent, service_role seul y a droit |
| 3. fuite du secret dans le JSON d'état | `secret_absent_du_json_etat` | **vrai** : la valeur réelle du secret n'apparaît nulle part dans `ops_horloge_etat(60)::text` |
| 4. bloc gardé rejoué × 4, isolé | `bloc_garde_rejoue_sans_erreur` | **vrai** : aucune erreur, donc plus de 2BP01 |
| 4. bloc gardé, extensions inchangées | `bloc_garde_extensions_inchangees` | **vrai** — `diag_ext: "2 puis 2"` : `pg_extension` ne bouge jamais |

Les 4 attaques et le test de rejouabilité qui les porte sont tous verts.

## Après : zéro trace (execute_sql, lecture seule)

```sql
select (select count(*) from cron.job where jobname in ('presti-agents-tic','presti-cron-menage')) as jobs,
       to_regprocedure('public.ops_horloge_minute()') as f1,
       to_regprocedure('public.ops_horloge_etat(integer)') as f2,
       (select count(*) from pg_extension where extname in ('pg_cron','pg_net')) as ext,
       (select extversion from pg_extension where extname='pg_cron') as v_cron,
       (select extversion from pg_extension where extname='pg_net') as v_net;
-- → {"jobs":0,"f1":null,"f2":null,"ext":2,"v_cron":"1.6.4","v_net":"0.20.4"}
```

Aucune tâche, aucune fonction créée, extensions inchangées (mêmes versions qu'avant l'essai). Le
`raise exception 'CONTRE_086 %', …` final a annulé toute la transaction d'un bloc, y compris les
deux rejeux complets de la migration et les huit essais de rôles.

## Verdict

**vert.** Les 4 attaques ciblées sur le correctif (rejeu réel double, droits en direct, non-fuite du
secret, bloc gardé isolé rejoué 4×) et le rejeu intégral du fichier confirment que le blocage ACL du
28/09 (`2BP01 dependent privileges exist`) ne se reproduit plus, sans qu'aucune garantie du contrat
026-086 (droits, non-fuite du secret, rejouabilité) n'ait été affaiblie. Corrobore le juge statique
(`horloge-sql-qa.mjs`, PASS HS-1 à HS-9) et l'essai à sec du scénario officiel
(`essai-a-sec.txt`, HS-8) par une méthode indépendante.
