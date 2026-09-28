# Application de 0107_pilotage_lecture.sql (fiche 026-076) — 2026-09-28

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main).

## 1. Lecture entière du fichier
`supabase/migrations/0107_pilotage_lecture.sql` lu en entier (369 lignes) avant application.

## 2. apply_migration
`apply_migration` nommée `0107_pilotage_lecture`, `query` = contenu exact du fichier. Résultat :
`{"success":true}`. Avant application : `to_regclass('ops.code_etat')` = null,
`to_regprocedure('public.pilotage_decisions(integer)')` = null — rien n'existait.

## 3. md5(prosrc) des fonctions
`node md5-migration.mjs supabase/migrations/0107_pilotage_lecture.sql '<json base>'` (json obtenu
par `select n.nspname||'.'||p.proname as f, md5(p.prosrc) as h from pg_proc p join pg_namespace n
... where n.nspname='public' and p.proname like 'pilotage\_%'`) →
**`13 corps identiques, 0 différents, sur 13 fonction(s) du fichier`**. Tout identique.

## 4. Contrôle supabase/controles/0107_pilotage_lecture.sql
Exécuté tel quel (execute_sql, lecture seule) : **6 lignes, 6 « oui »** — les 13 fonctions
`pilotage_*` existent ; toutes `security definer`, `search_path ops, public, pg_temp` posé ; `anon`
sans droit d'exécution ; `authenticated` sans droit d'exécution ; `service_role` a le droit
d'exécution sur les 13 ; `ops.code_etat` sous RLS, aucune politique. Aucune correction n'était
nécessaire sur ce contrôle (contrairement à 0106).

## 5. Juge de la fiche en --reel
`node scripts/pilotage-sql-qa.mjs --migration=lecture --reel` (ce juge ne demande pas
`--confirmer-reel`, à la différence de `ops-acquisition-qa.mjs`) :
```
pilotage-sql-qa --migration=lecture (fiche 026-076) — racine ... — base 2737c74
✅ SQ-1 … ✅ SQ-10 (tous verts)
✅ SQ-11 clé de service : pilotage_decisions, pilotage_agents, pilotage_chef, pilotage_couts_modeles,
   pilotage_attention_sources, pilotage_evenements, pilotage_code_lire, pilotage_code_publier non
   appelée : aucun état publié avant (rien ne doit rester) ; clé anonyme refusée partout ; rien
   d'écrit de durable
pilotage-sql-qa --migration=lecture : PASS
```

## 6. Zéro trace
Après le `--reel` (lecture seule, execute_sql) : `ops.code_etat` = 0 ligne, `ops.decisions` = 0,
`ops.agents` portant un nom `cv076%`/`essai%` = 0, `ops.evenements` d'un agent `cv076%` = 0.

## Étape 8
`.orchestre/en-cours/026-076.md` déplacée vers `.orchestre/fait/026-076.md` ; `026-076.lock` et
`026-076.avant.txt` rangés dans `.orchestre/preuves/026-076/`. `node scripts/orchestre.mjs verifier
026-076` rejoué après application (voir la sortie de la commande suivante, PASS attendu avant
commit).
