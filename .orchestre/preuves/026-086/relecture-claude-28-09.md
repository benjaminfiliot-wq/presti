# 026-086 — relecture croisée par Claude (28/09, soir)

Reprise de `.orchestre/a-relire/026-086.md` (verdict de l'usine : FAIL HS-8 — Codex, usine-codex-87).
Relecture indépendante de la migration cross-écrite, après la relance déjà tentée le même jour à 18:05
(`.orchestre/preuves/026-086/relance-2026-09-28.md`, restée BLOQUÉE).

## 1. Revue du code de la migration (Codex)

Lu intégralement `supabase/migrations/0101_ops_horloge.sql` (155 lignes), `supabase/controles/0101_ops_horloge.sql`
et `docs/agents/horloge.md` contre le contrat et le cahier du juge de la fiche (HS-1 à HS-9) :

- HS-1 : fichier non vide, ne contient que les instructions du point 1, aucune chaîne qui ressemble à un secret.
- HS-2 : `ops_baux_expirer()` puis `ops_decisions_echues()`, chacun dans son `begin … exception`, avant la
  lecture du secret ; lecture par `name = 'cron_secret'` ; absence → `return null` sans appel HTTP ; URL exacte
  `https://prestiapp.fr/api/agents/tic` ; `timeout_milliseconds := 30000` (dans [10000, 55000]) ; en-tête
  `Authorization` construit par concaténation `'Bearer ' || v_secret`.
- HS-3 : les deux fonctions `security definer`, `set search_path = ops, public, pg_temp` ;
  `ops_horloge_minute` : `revoke all … from public, anon, authenticated, service_role`, aucun grant ;
  `ops_horloge_etat` : `revoke` des trois puis `grant execute … to service_role` seul.
- HS-4 : dans `ops_horloge_etat`, `decrypted_secret` n'apparaît que dans `exists(select 1 from
  vault.decrypted_secrets where name = 'cron_secret')` — jamais dans le `jsonb_build_object` retourné.
- HS-5 : les deux `cron.schedule` présents, noms et plannings conformes au contrat (`* * * * *` et `17 3 * * *`).
- HS-6 : `_A_COLLER_sql_editor_0101.sql` est un jumeau strictement identique (diff vide) ; `_A_COLLER_..._NU.sql`
  la version nue ; `supabase/controles/0101_ops_horloge.sql` est en lecture seule, couvre les 5 points du
  contrat, `decrypted_secret` n'y apparaît que dans un `exists(…)`.
- HS-7 : `docs/agents/horloge.md` pose le secret par l'écran Vault du tableau de bord (nom `cron_secret`),
  ne contient ni « vault.create_secret », ni « SQL Editor », ni « coller » (verbe « recopiée à la main ») ;
  arrêt et lecture par Claude Code via `execute_sql` ; rappel « aux deux endroits » présent ; aucune valeur.

**Verdict sur le code : conforme au contrat.** Rien à corriger dans la migration, le contrôle ou la doc.

## 2. Contre-vérification du blocage (HS-8/HS-10 inatteignables)

Avant de rejouer l'essai à sec complet (`node scripts/horloge-sql-qa.mjs --generer-essai`, coûteux et déjà
exécuté deux fois aujourd'hui pour le même résultat), vérification directe et minimale par `execute_sql`
(lecture seule, MCP Supabase, projet `gorcdvmueakcncsmrouo`) que l'état de blocage n'a pas changé depuis la
relance de 18:05 :

```sql
select name from vault.secrets where name = 'cron_secret';
-- → [{"name":"cron_secret"}]  (secret toujours posé, préalable n°3 OK)

select c.relname, c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='cron' and c.relname in ('job','job_run_details');
-- → job             : {supabase_admin=arwdDxtm/supabase_admin,=r/supabase_admin,postgres=r*/supabase_admin,postgres=r/postgres}
-- → job_run_details : {supabase_admin=arwdDxtm/supabase_admin,=rd/supabase_admin,postgres=a*r*w*d*D*x*m*/supabase_admin,postgres=arwdDxm/postgres}
```

**Empreinte ACL strictement identique**, caractère pour caractère, à celle relevée dans la relance de 18:05 :
le double octroi SELECT sur `postgres` (`r*` avec option, `r` sans) est toujours là. C'est la cause du
`ERROR 2BP01 dependent privileges exist` que le script de réinstallation interne de pg_cron lève dès
`create extension if not exists pg_cron;`, avant même d'atteindre une seule ligne du scénario HS-8. Le geste
« Database → Extensions → pg_cron → désactiver/réactiver » annoncé comme fait le 24/09 n'a donc **toujours pas**
changé l'état réel de la base — confirmé une seconde fois, par une voie indépendante (comparaison d'ACL plutôt
que relance de l'essai complet).

Je ne relance pas l'essai à sec en entier (même échec garanti tant que l'ACL n'a pas bougé — inutile de rebrûler
le budget de la fiche) et je ne corrige pas l'ACL moi-même : un `revoke … cascade` sur `postgres` touche un
rôle large dont je n'ai pas l'inventaire complet des dépendants, c'est un geste de sécurité sur la base réelle
de production, explicitement hors périmètre de 026-086 et explicitement réservé à Benj par la fiche elle-même
(« Activer pg_cron et pg_net dans le tableau de bord, si la création par SQL est refusée » — geste de Benj,
seul lui le peut). Je confirme donc la décision de l'agent précédent (18:05) : correcte, à maintenir.

## 3. Verdict de cette relecture

- Le FAIL HS-8 rapporté par l'usine est **confirmé légitime** et **non imputable à Codex** : la migration, le
  contrôle et la doc qu'il a écrits sont conformes au contrat ; le blocage est un état de la base Supabase
  (ACL dupliquée sur `cron.job`/`cron.job_run_details`), externe à 026-086.
- `node scripts/orchestre.mjs verifier 026-086` ne peut pas être vert tant que ce blocage persiste (HS-8 et
  HS-10 resteront FAIL par construction : aucune fonction ni tâche ne peut être créée).
- **Aucun commit.** Aucun chemin du périmètre n'est modifié par cette relecture (revue + vérification en
  lecture seule uniquement). La fiche reste `en-cours`, non déplacée en `fait/`.
- **Geste attendu de Benj, précis** : tableau de bord Supabase du projet `gorcdvmueakcncsmrouo` → Database →
  Extensions → pg_cron → désactiver puis réactiver l'interrupteur (aucun SQL). Si l'ACL ne bouge toujours pas
  après ce geste (vérifiable par la requête `pg_class.relacl` ci-dessus), c'est un dossier à ouvrir auprès du
  support Supabase — l'anomalie est dans leur script interne de réinstallation de pg_cron, pas dans 0101.
- Une fois l'ACL propre : relancer `node scripts/horloge-sql-qa.mjs --generer-essai`, le rejouer par
  `execute_sql`, réécrire `essai-a-sec.txt`, puis `node scripts/orchestre.mjs verifier 026-086` (HS-8 devrait
  passer), puis `apply_migration` (0101_ops_horloge), 10 min d'attente, `--reel`, puis `commit-fiche.sh`.

Zéro trace laissée sur la base par cette relecture : les deux requêtes ci-dessus sont des `select` en lecture
seule (`vault.secrets.name`, `pg_class.relacl`). Aucun `apply_migration`, aucun réglage Supabase changé.

Écrit par Claude Code (chef) le 2026-09-28, en soirée.
