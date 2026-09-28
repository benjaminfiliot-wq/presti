# 026-086 — application de 0101 (28/09, après le correctif du blocage ACL 2BP01)

Préalables : essai à sec vert (`essai-a-sec.txt`, HS-8), contre-vérification indépendante verte
(`contre-verif-2026-09-28.md`, 4 attaques + rejeu réel double, zéro trace), juge statique PASS
HS-1 à HS-9 (`verifier.log`).

## Le correctif (rappel)

Les deux `create extension if not exists pg_cron/pg_net` nues relançaient, sur ce projet, le script
de réinstallation interne de pg_cron même quand l'extension est déjà là, qui échouait en `2BP01
dependent privileges exist` sur `cron.job` (ACL dupliquée, diagnostiquée le 24/09 et confirmée
inchangée à trois reprises le 28/09 — `relance-2026-09-28.md`, `relecture-claude-28-09.md`).
Correction : un bloc gardé (`do $$ begin if not exists (select 1 from pg_extension where extname =
…) then create extension …; end if; end $$;`), qui n'exécute jamais `create extension` quand
l'extension est déjà installée — donc ne relance jamais ce script. Aucun `revoke`/`grant` sur
`cron.job` n'a été touché ; aucun geste de tableau de bord n'a été nécessaire.

## Application

1. `apply_migration` (connecteur Supabase, projet `gorcdvmueakcncsmrouo`, nom `0101_ops_horloge`),
   contenu exact de `supabase/migrations/0101_ops_horloge.sql` : succès, aucune erreur 2BP01.
2. **md5(prosrc) en base = corps du fichier** (`md5-migration.mjs`) : 2/2 identiques
   (`public.ops_horloge_minute` `eb61190eaaebf1b645dc2a6acb470746`, `public.ops_horloge_etat`
   `2c8ecab492a939239e3a039ec190527a`).
3. **Contrôle** `supabase/controles/0101_ops_horloge.sql` (lecture seule) : 5/5 « oui » (extensions
   installées, deux tâches actives dont `presti-agents-tic` à `* * * * *`, `secret_present`, les
   deux fonctions sécurisées, `anon`/`authenticated`/`service_role` sans droit sur
   `ops_horloge_minute`).
4. **Tâches planifiées relues** (`cron.job`, sans le secret — le secret n'y figure pas : il est lu
   à l'exécution dans le Vault, jamais stocké dans la définition de la tâche) :

   | jobid | jobname | schedule | command | active |
   |---|---|---|---|---|
   | 7 | presti-agents-tic | `* * * * *` | `select public.ops_horloge_minute()` | true |
   | 8 | presti-cron-menage | `17 3 * * *` | `delete from cron.job_run_details where end_time < now() - interval '7 days'` | true |

5. **`node scripts/horloge-sql-qa.mjs --reel`** (10 min après l'application) : **PASS HS-10** —
   `ops_horloge_etat(10)` avec la clé de service (200) ; `job_actif` ; `secret_present` ; **10
   exécutions réussies** en 10 min ; **10 réponses 200** ; **aucune réponse 401** ; refusée avec la
   clé anonyme (401, `42501`).
6. `pg_extension` après application : `pg_cron` 1.6.4, `pg_net` 0.20.4 — mêmes versions qu'avant
   (le bloc gardé ne les a pas réinstallées, elles étaient déjà là).
7. `select type, count(*) from ops.evenements where type like 'horloge%' … group by type` sur la
   fenêtre d'attente : aucune ligne — aucun `horloge_erreur` ni `horloge_sans_secret` : la minute
   tourne sans incident.

## Verdict

**Vert.** La migration 0101 est en place, l'horloge tourne (10/10 exécutions réussies, 200 sur
toute la ligne, secret bien lu sans jamais fuiter), et le blocage ACL du 28/09 ne s'est reproduit à
aucun moment de l'application réelle.
