# Application de 0102_packs_pubs.sql (fiche 026-114) — 2026-09-28

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main).

## 1. Lecture entière du fichier
`supabase/migrations/0102_packs_pubs.sql` lu en entier (85 lignes) avant application.

## 2. apply_migration
`apply_migration` nommée `0102_packs_pubs`, `query` = contenu exact du fichier. Résultat : `{"success":true}`.
Avant application : `to_regclass('public.packs_pubs')` = null, `count(storage.buckets où id='packs-pubs')` = 0, et `list_migrations` ne portait pas 0102 (vérifié juste avant l'appel).
Après application : `select version, name from supabase_migrations.schema_migrations where name ilike '%packs_pubs%'` → `{"version":"20260928153551","name":"0102_packs_pubs"}` — migration enregistrée par Supabase.

## 3. md5(prosrc) des fonctions
0102 ne définit aucune fonction (`create table`, index, RLS, bucket — pas de `create or replace function`).
`node md5-migration.mjs supabase/migrations/0102_packs_pubs.sql '[]'` → `0 corps identiques, 0 différents, sur 0 fonction(s) du fichier :` — rien à comparer, conforme par vacuité.

## 4. Contrôle supabase/controles/0102_packs_pubs.sql
Exécuté tel quel (execute_sql, lecture seule) :
- table public.packs_pubs existe (to_regclass) → **oui**
- securite par ligne activee (pg_class.relrowsecurity) → **oui**
- une seule politique en lecture, aucune en ecriture (pg_policy.polcmd) → **oui**
- bucket packs-pubs existe, prive, file_size_limit = 20971520 → **oui**

Tout à « oui ».

## 5. Juge de la fiche en --reel
`node scripts/pack-pub-base-qa.mjs --reel` :
```
PASS PB-REEL — table packs_pubs lisible avec la clé de service (200) ; bucket packs-pubs lisible avec la clé de service (200) ; clé anonyme : refusée (401) — aucune ligne attendue ; bucket packs-pubs refusé à la clé anonyme (400)
pack-pub-base-qa : PASS
```

## 6. Zéro trace
`select count(*) from public.packs_pubs where email like '%essai%' or coalesce(consigne,'') like '%essai%';` → `lignes_essai: 0`.
Aucune ligne réelle n'a été insérée par cette application (apply_migration ne fait que DDL + upsert du bucket, aucun insert de ligne).

## Étape 8
`.orchestre/en-cours/026-114.md` était déjà déplacée vers `.orchestre/fait/026-114.md` (et son `.lock`/`.avant.txt` déjà rangés dans les preuves) lors d'une session antérieure. `node scripts/orchestre.mjs verifier 026-114` → **PASS** (3s, 0 ligne produite, preuve `.orchestre/preuves/026-114/verifier.log`), rejoué après application.
