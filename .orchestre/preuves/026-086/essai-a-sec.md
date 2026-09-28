# 026-086 — migration 0101 (l'horloge 24 h/24) — essai à sec, 2026-09-28

## Ce qui a été produit

- `supabase/migrations/0101_ops_horloge.sql` — la migration : `create extension if not exists` pour
  pg_cron et pg_net, `public.ops_horloge_minute()` (baux, décisions, appel au tic avec le jeton du
  Vault), `public.ops_horloge_etat(p_minutes)` (lecture d'état, service_role seul), les deux
  `cron.schedule`. Rejouable.
- `supabase/migrations/_A_COLLER_sql_editor_0101.sql` et `..._NU.sql` — jumeaux (générés par
  `scripts/sql-nu.mjs`).
- `supabase/controles/0101_ops_horloge.sql` — contrôle en lecture seule.
- `docs/agents/horloge.md` — la notice pour Benj (poser/changer le secret, arrêter l'horloge, la
  voir).

## Juge statique — `node scripts/horloge-sql-qa.mjs --sans-essai`

Vert sur HS-1 à HS-7 et HS-9 (non-régression, `migrations-jumelles-e2e.mjs` : 368 réussis, 0
échoués). Sortie complète : `.orchestre/preuves/026-086/verifier.log` (la même commande, sans
`--sans-essai`, HS-8 compris).

## Lecture préalable, avant tout essai (execute_sql, lecture seule, projet `gorcdvmueakcncsmrouo`)

- `pg_extension` : **pg_cron 1.6.4 et pg_net 0.20.4 sont déjà installées.**
- `vault.decrypted_secrets` : **0 secret au total dans ce Vault** — `cron_secret` n'y est pas.

## Essai à sec — `node scripts/horloge-sql-qa.mjs --generer-essai`, exécuté par `execute_sql`

Le bloc généré (15 536 octets, empreinte `a2c110b3a3f9…`) suit le protocole de 026-010 : un seul
`do $essai_026$ … end $essai_026$;`, le jumeau nu de 0101 exécuté par `execute $migration_026$…$`,
puis le scénario `scripts/fixtures/026-horloge-bus/essais/0101.sql`, qui se termine toujours par
`raise exception 'ESSAI_A_SEC % %', …` — donc par un ROLLBACK complet, quoi qu'il arrive.

**L'essai n'a pas atteint son scénario.** Il échoue dès la première ligne du jumeau —
`create extension if not exists pg_cron;` — avec une vraie erreur Postgres :

```
ERROR:  2BP01: dependent privileges exist
HINT:  Use CASCADE to revoke them too.
CONTEXT:  SQL statement "grant usage on schema cron to postgres with grant option; … revoke all on
table cron.job from postgres; grant select on table cron.job to postgres with grant option; revoke
trigger on cron.job_run_details from postgres; "
```

Isolée hors du bloc d'essai pour vérifier que ce n'est pas l'imbrication dans `EXECUTE` qui est en
cause : `create extension if not exists pg_cron;` seule lève exactement la même erreur ; juste
après, `create extension if not exists pg_net;` seule ne lève rien (`[]`, no-op confirmé). Ce
script de droits appartient à l'extension `pg_cron` elle-même (pas à 0101_ops_horloge.sql) : Postgres
(ou la couche Supabase) le rejoue à chaque `create extension`, même quand `pg_cron` est déjà
installée et que `IF NOT EXISTS` devrait ne rien faire.

Lecture (toujours seule) du pourquoi probable : `information_schema.role_table_grants` sur
`cron.job` montre pour `postgres` deux lignes `SELECT` (l'une `is_grantable=YES`, l'autre `NO`) — un
état de droits en double que le script de réinstallation ne sait démêler sans `CASCADE`. C'est un
état de la base, pas un défaut de 0101.

**Zéro trace, prouvé après coup :**
- `select not exists (select 1 from cron.job where jobname = 'presti-agents-tic') as rien_ne_reste`
  → `true`.
- `pg_extension` : pg_cron toujours 1.6.4, pg_net toujours 0.20.4 (inchangées).
- `to_regprocedure('public.ops_horloge_minute()')` et `to_regprocedure('public.ops_horloge_etat(integer)')`
  → `null`, `null` (aucune fonction créée — l'échec est survenu avant, dans la même transaction
  implicite, tout annulée d'un bloc).

Compte rendu brut : `.orchestre/preuves/026-086/essai-a-sec.txt`.

## Verdict : BLOQUÉ — deux gestes de Benj, tous deux au tableau de bord Supabase, aucun SQL

1. **Database → Extensions** : désactiver puis réactiver `pg_cron` (le geste de l'écran, pas une
   commande SQL) — pour que Supabase relaie les droits par son chemin normal et que
   `create extension if not exists pg_cron` cesse de lever `2BP01`. C'est exactement le recours prévu
   par la fiche : « si `create extension` est refusé, Benj active l'extension au tableau de bord ».
2. **Vault** (Integrations › Vault, ou Database › Vault) : poser le secret nommé `cron_secret`,
   valeur = celle de `CRON_SECRET` sur Vercel (Settings › Environment Variables). Sans lui, même une
   fois le point 1 réglé, la partie « avec le secret » du scénario (`secret_present_prealable`, groupe
   C) resterait rouge — c'est le préalable que la fiche 026-086 documente déjà.

Après ces deux gestes : relancer `node scripts/horloge-sql-qa.mjs --generer-essai`, l'exécuter par
`execute_sql`, écrire le nouveau `essai-a-sec.txt`, puis `node scripts/horloge-sql-qa.mjs`. Une fois
HS-1 à HS-9 verts, la fiche peut passer en `fait/` et son application (`apply_migration`, jamais par
Benj) attendre l'accord de Benj sur le diff.

## Ce qui n'a pas été fait, volontairement

- Aucun `apply_migration` (interdit par la mission).
- Aucun réglage Supabase changé : les deux `create extension if not exists` isolées ci-dessus sont
  des lectures d'essai (l'une a échoué et s'est annulée seule, l'autre était un no-op réel) — pas des
  actions correctrices. Aucun `grant`/`revoke ... cascade` n'a été tenté pour contourner l'erreur.
- La fiche reste en `en-cours/`, pas déplacée vers `fait/`.
