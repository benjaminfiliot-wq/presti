# Application de 0116_maquette_lien_objet.sql (question 026-082) — 2026-09-29

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main).
Commitée sous **026-061** (fiche déjà en `fait/` qui a écrit `acq_maquette_par_jeton` en 0106) — voir sa section
« Correction du 29/09 ».

## Pourquoi

`acq_maquette_par_jeton` (0106_acquisition_echanges.sql) ne rendait que `objets`, jamais `objet` (colonne pourtant
posée par `acq_maquette_lien_creer`, dans la même migration). `acq_maquette_prete` (même migration, ligne 985)
pose `objets = { variante: … }` — jamais un chemin déjà fait — dès que l'appelant ne fournit que `variante` (le cas
réel : `lib/agents/acquisition/maquettesLien.ts`, patch de 026-082, lit `maquette.objets?.[fichier]` puis retombe
sur `maquette.objet` s'il n'y a pas de chemin direct). Sans `objet` dans la réponse SQL, ce repli échoue toujours :
un lien de maquette pourtant valide, encore dans ses 21 jours, rendrait 404 en production.

## 1. Contre-vérification (avant application)

`select pg_get_functiondef(to_regprocedure('public.acq_maquette_par_jeton(text)'))` : confirme le texte exact déjà
lu dans `0106_acquisition_echanges.sql` — `jsonb_build_object('objets', m.objets, 'entreprise', p.entreprise,
'expire_le', m.expire_le)`, pas d'`objet`.

## 2. Essai à sec

Transaction ouverte (`begin`) : `create or replace function` (le contenu exact de 0116) + un bloc `do $$` qui pose
un prospect et une maquette d'essai (`objets = {"variante":"B"}` seulement, comme le fait réellement
`acq_maquette_prete` sans chemins fournis), appelle `acq_maquette_par_jeton`, vérifie `objet = 'objets/essai-0116'`
et `objets.variante = 'B'` (`raise exception` sinon) — puis `rollback`. Résultat : aucune exception levée (les deux
assertions passent). Après le `rollback` : la fonction est revenue à son texte d'avant (revérifié par
`pg_get_functiondef`), et `select count(*) from ops.prospects where cle_dedup = 'domaine:essai-0116-sentinelle.invalid'`
et l'équivalent sur `ops.maquettes` rendent 0 — rien n'a persisté.

## 3. apply_migration

`apply_migration` nommée `0116_maquette_lien_objet`, `query` = contenu exact de
`supabase/migrations/0116_maquette_lien_objet.sql`. Résultat : `{"success":true}`.

## 4. md5(prosrc) de la fonction

`select n.nspname||'.'||p.proname as f, md5(p.prosrc) as h from pg_proc p join pg_namespace n on n.oid =
p.pronamespace where n.nspname = 'public' and p.proname = 'acq_maquette_par_jeton'` →
`f22791af7f5bdd5b64f81271bdb7d9c7`. `node md5-migration.mjs supabase/migrations/0116_maquette_lien_objet.sql
'[{"f":"public.acq_maquette_par_jeton","h":"f22791af7f5bdd5b64f81271bdb7d9c7"}]'` →
**1 corps identique, 0 différent, sur 1 fonction du fichier**. Tout identique.

## 5. Contrôle `supabase/controles/0116_maquette_lien_objet.sql`

Exécuté tel quel (execute_sql, lecture seule) : **4 lignes, 4 « oui »** — la fonction rend `objet` ET `objets`,
`security definer`/`stable` conservés, `service_role` seul (ni `anon` ni `authenticated`), et aucune autre fonction
`acq_*` touchée (63, compté avant application, inchangé après).

## 6. `--reel`

Même essai que l'essai à sec, mais pour de vrai (pas de `rollback`) : prospect et maquette d'essai réels
(`domaine:essai-0116-sentinelle-reel.invalid`), `acq_maquette_par_jeton` rend `objet = 'objets/essai-0116-reel'` et
`objets.variante = 'B'` — conforme, sinon `raise exception`. Ménage dans le même bloc `do $$`, avant la sortie
normale **et** dans le bloc `exception when others` (donc même si l'assertion avait échoué). Après coup :
`ops.prospects` et `ops.maquettes` filtrés sur les clés d'essai → **0 ligne** dans les deux cas. Zéro trace.

## 7. Jumeaux

`node scripts/sql-nu.mjs supabase/migrations/0116_maquette_lien_objet.sql
supabase/migrations/_A_COLLER_sql_editor_0116.sql --controle supabase/controles/0116_maquette_lien_objet.sql` puis
la même commande vers `..._0116_NU.sql` : les deux écrits (17 lignes de SQL chacun, chaînes équilibrées).
`node scripts/sql-nu.mjs --verifier` entre les deux : identiques.

## Fichiers de cette application

- `supabase/migrations/0116_maquette_lien_objet.sql`
- `supabase/migrations/_A_COLLER_sql_editor_0116.sql`
- `supabase/migrations/_A_COLLER_sql_editor_0116_NU.sql`
- `supabase/controles/0116_maquette_lien_objet.sql`

Commités sous **026-061** avec `.orchestre/fait/026-061.md` et `.orchestre/brouillons-ecosysteme/026/026-061.md`
(périmètre étendu, section « Correction du 29/09 » sur les deux copies) et cette preuve.
