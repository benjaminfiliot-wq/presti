# 026-114 — contre-vérification du 28/09 (passage 15:14–15:30 UTC)

Verdict de l'exécutant : **PRET_A_APPLIQUER / vert** (pack-pub-base-qa PASS 8/8, `orchestre.mjs verifier 026-114` PASS). Contre-vérification, rejouée intégralement par moi depuis zéro (nouvelles attaques, nouvelle transaction, aucune donnée reprise d'un essai antérieur) : **VERT confirmé**. Une contre-vérification identique existait déjà dans ce fichier (13:16) ; je l'ai relue après coup et mes résultats, obtenus indépendamment, corroborent les siens au SQLSTATE près — y compris son observation la plus fine (voir plus bas). Rien de nouveau n'a été corrigé dans la migration : ce passage est une seconde mesure indépendante, pas une reprise de la première.

## Moyen

Migration **non encore appliquée** avant comme après ce passage (`apply_migration` jamais appelé par moi ; contrôle préalable `to_regclass('public.packs_pubs') is null` et aucun bucket `packs-pubs` — confirmé absent avant tout essai). Projet Supabase confirmé unique par `list_projects` (`gorcdvmueakcncsmrouo`, presti, eu-central-1, Postgres 17.6). J'ai attaqué le contenu exact de `supabase/migrations/0102_packs_pubs.sql` (recopié statement par statement depuis le fichier, pas depuis le jumeau) sur la vraie base de production, par l'outil MCP `execute_sql`, en **deux blocs indépendants** `do $$ … raise exception … end $$;` — chacun applique la migration complète depuis zéro puis se termine TOUJOURS par un `raise exception`, qui annule tout dans la même transaction quel que soit le résultat des attaques qu'il contient (mémoire `essai-a-sec-migration`). Aucune connexion directe à la base, aucune écriture qui survit à un bloc. Les deux blocs sont montrés intégralement plus bas.

Avant chaque bloc, deux lignes de préparation qui ne font pas partie de la migration : un artisan factice (`insert into auth.users(id)` + `insert into public.artisans(id, email)`, jamais une donnée réelle, effacé avec tout le reste au rollback) pour pouvoir simuler un `auth.uid()` correct — la migration 0088 fait dépendre `artisans.id` d'`auth.users`, donc un artisan de test a besoin d'une ligne `auth.users` derrière lui.

## Bloc A — contraintes, droits anon/authenticated, storage.objects (12 attaques)

| # | Attaque | Attendu | Observé | Verdict |
|---|---|---|---|---|
| a1 | `insert … etat = 'autre'` (hors liste fermée) | refusé, `check_violation` (23514) | `REFUSE:23514` | conforme |
| a2 | `insert … type = 'gratuit'` (hors liste fermée) | refusé, 23514 | `REFUSE:23514` | conforme |
| a3 | `insert … prix_cents = 0` (contrainte `> 0`) | refusé, 23514 | `REFUSE:23514` | conforme |
| a3b | `insert … prix_cents = -100` (négatif, cas limite non prévu à l'écrit mais couvert par `> 0`) | refusé, 23514 | `REFUSE:23514` | conforme |
| — | insertion légitime (contexte propriétaire, contourne la RLS) pour avoir une ligne cible | réussie | `ligne_ok:true` | conforme |
| a4 | `set local role anon` puis `select` sur la ligne | refusé, `insufficient_privilege` (42501) | `REFUSE:42501` | conforme |
| a5 | `set local role anon` puis `insert` | refusé, 42501 | `REFUSE:42501` | conforme |
| a6 | `set local role authenticated` **avec le bon `auth.uid()`** (l'artisan propriétaire, simulé par `set_config('request.jwt.claim.sub', …, true)`) puis `select` sa propre ligne | — | `REFUSE:42501` | **voir observation ci-dessous** |
| a7 | `authenticated` avec un **autre** `auth.uid()` (uuid aléatoire) puis `select` la ligne d'autrui | refusé | `REFUSE:42501` | conforme |
| a8 | `authenticated` (bon uid) tente un `insert` | refusé (aucune politique d'écriture) | `REFUSE:42501` | conforme |
| a9 | `authenticated` (bon uid) tente un `update` de sa propre ligne (attaque non couverte par le rapport précédent) | refusé | `REFUSE:42501` | conforme |
| a10 | politiques sur `storage.objects` mentionnant `packs-pubs` (`pg_policies.qual`/`with_check`) | 0 | `0` | conforme |
| a11 | `set local role anon` puis `insert into storage.objects (bucket_id='packs-pubs', …)` | refusé, 42501 | `REFUSE:42501` | conforme |
| a12 | `set local role anon` puis `select … from storage.objects where bucket_id='packs-pubs'` | 0 ligne (pas d'erreur : `storage.objects` garde un `grant select` générique, c'est la RLS sans politique qui filtre) | `OK_ZERO` | conforme — pas de fuite, mécanisme différent de la table `packs_pubs` mais résultat identique |

Sortie brute du bloc A (texte du `RAISE EXCEPTION`, recopié tel quel) :
```
ERROR:  P0001: ESSAI_CONTRE_VERIF_028_A {"ligne_ok": true, "bucket_cree": true, "table_creee": true,
"a3_prix_zero": "REFUSE:23514", "a4_anon_select": "REFUSE:42501", "a5_anon_insert": "REFUSE:42501",
"a1_etat_invalide": "REFUSE:23514", "a2_type_invalide": "REFUSE:23514", "a3b_prix_negatif": "REFUSE:23514",
"a11_anon_storage_insert": "REFUSE:42501", "a12_anon_storage_select": "OK_ZERO",
"a8_authenticated_insert": "REFUSE:42501", "a9_authenticated_update": "REFUSE:42501",
"a6_authenticated_bon_uid_select": "REFUSE:42501", "a7_authenticated_mauvais_uid_select": "REFUSE:42501",
"a10_politiques_storage_objects_packs_pubs": 0}
```

Zéro trace après le bloc A, requête séparée :
```
select to_regclass('public.packs_pubs') is null as table_absente,
       not exists (select 1 from storage.buckets where id='packs-pubs') as bucket_absent,
       not exists (select 1 from public.artisans where email like 'essai_e2e_contre_028%') as artisan_absent,
       (select count(*) from pg_policies where schemaname='public' and tablename='packs_pubs') as nb_politiques_packs_pubs;
```
→ `{"table_absente":true,"bucket_absent":true,"artisan_absent":true,"nb_politiques_packs_pubs":0}`. Contrôle complémentaire `select count(*) from public.artisans where email ilike 'essai_e2e_contre_028%'` → `0`.

## Bloc B — index unique partiel, rejouabilité intégrale, auto-correction du bucket (5 attaques)

| # | Attaque | Attendu | Observé | Verdict |
|---|---|---|---|---|
| a13 | deux lignes avec le **même** `stripe_session_id` non nul | refusé, `unique_violation` (23505) | `REFUSE:23505` | conforme |
| a14 | deux lignes avec `stripe_session_id` **NULL** (l'index partiel ne doit pas les bloquer) | acceptées | `OK_ACCEPTES` (3 lignes au total : 1 avec session + 2 null) | conforme |
| a15 | rejeu intégral de la migration (les 12 instructions une seconde fois, dans la même transaction, sur une base qui porte déjà 3 lignes) | aucune erreur (`if not exists` / `on conflict` / `drop policy if exists`) | `OK_SANS_ERREUR` | conforme |
| — | données et objets après le rejeu | 3 lignes, 1 politique, 4 index (comptés) | `nb_lignes_apres_rejeu:3`, `nb_politiques_apres_rejeu:1`, `nb_index_apres_rejeu:4` | conforme — rien dupliqué, rien perdu |
| a16 | bucket trafiqué (`update … public=true, file_size_limit=999999999`) puis rejeu du seul `insert … on conflict do update` de la migration | corrigé à `public=false, file_size_limit=20971520` | avant `{"public":true,"file_size_limit":999999999}` → après `{"public":false,"file_size_limit":20971520}` | conforme — auto-correction confirmée |
| a17 | après le rejeu, un **troisième** doublon sur le même `stripe_session_id` déjà pris | refusé, 23505 | `REFUSE:23505` | conforme — la contrainte tient après le rejeu, pas seulement à la création |

Sortie brute du bloc B :
```
ERROR:  P0001: ESSAI_CONTRE_VERIF_028_B {"table_creee": true, "a15_rejeu_complet": "OK_SANS_ERREUR",
"a16_apres_correction": {"public": false, "file_size_limit": 20971520},
"a16_avant_correction": {"public": true, "file_size_limit": 999999999},
"nb_index_apres_rejeu": 4, "nb_lignes_apres_rejeu": 3, "nb_lignes_avant_rejeu": 3,
"a17_doublon_apres_rejeu": "REFUSE:23505", "nb_politiques_apres_rejeu": 1,
"a13_doublon_stripe_session": "REFUSE:23505", "a14_deux_null_stripe_session": "OK_ACCEPTES"}
```

Zéro trace après le bloc B, requête séparée :
```
select to_regclass('public.packs_pubs') is null as table_absente,
       (select public from storage.buckets where id='packs-pubs') as bucket_public_ou_null,
       not exists (select 1 from storage.buckets where id='packs-pubs') as bucket_absent,
       (select count(*) from pg_policies where schemaname='public' and tablename='packs_pubs') as nb_politiques_packs_pubs;
```
→ `{"table_absente":true,"bucket_public_ou_null":null,"bucket_absent":true,"nb_politiques_packs_pubs":0}` — même le bucket temporairement rendu public par l'attaque a16 n'a laissé aucune trace : sa ligne dans `storage.buckets` n'existait pas avant le bloc B et n'existe plus après.

Toutes les attaques attendues comme refusées l'ont été (23514 sur les trois contraintes CHECK et le cas limite négatif, 42501 sur chaque tentative anon/authenticated — lecture, écriture ET mise à jour, 23505 sur les deux doublons de `stripe_session_id`, avant et après rejeu) ; toutes celles attendues comme réussies (ligne légitime, deux `stripe_session_id` nuls, rejeu idempotent sans duplication ni perte, auto-correction du bucket) l'ont été aussi. Aucune surprise, aucun résultat à contre-courant de ce que promet la fiche.

## Observation reconfirmée (non bloquante) — attaque a6/a9

En donnant à `authenticated` le **bon** `auth.uid()` (celui de l'artisan propriétaire de la ligne), la lecture ET la modification de sa propre ligne sont **quand même refusées** (42501), alors qu'une politique `for select using (auth.uid() = artisan_id)` existe. Cause : `revoke all on public.packs_pubs from public, anon, authenticated` retire tout privilège de table à `authenticated` — en PostgreSQL, la RLS ne s'évalue jamais si le rôle n'a pas déjà le privilège de base sur la table, donc la politique de lecture est aujourd'hui **inatteignable par PostgREST** pour un artisan authentifié.

Ce n'est **pas une régression de 026-114** : c'est le même montage (`revoke all` puis politique de lecture, sans `grant` de retour) déjà en production dans `0088_site_commande.sql:68-73` (l'en-tête de 0102 dit explicitement « même politique que 0088:68-73 »). Une contre-vérification antérieure de ce même fichier, datée 13:16 aujourd'hui, avait déjà relevé exactement ce point (son attaque #7) ; je l'ai retrouvé indépendamment (mes attaques a6 et a9, lecture et écriture), sans avoir relu son texte avant de lancer mes blocs — les deux mesures, faites séparément, s'accordent au SQLSTATE près. Le contrôle `supabase/controles/0102_packs_pubs.sql` et le `--reel` de `pack-pub-base-qa.mjs` ne testent que « une politique de lecture existe » et « la clé anonyme ne lit rien » — aucun des deux ne vérifie qu'un artisan légitime peut lire via PostgREST. Rien à corriger dans 026-114 (le contrat demandé — même politique que 0088 — est rempli à la lettre) ; à garder pour une fiche future qui brancherait une lecture côté client sur `packs_pubs`.

## Autres contrôles (claim de l'exécutant recoupé, relancés par moi maintenant)

- `node scripts/pack-pub-base-qa.mjs` : **PASS 8/8** (PB-1 à PB-8), identique au `verifier.log` produit par l'exécutant (PB-7 rend 368 réussis contre 360 puis 352 lors des passages précédents — écart dû à d'autres sessions concurrentes qui ajoutent des migrations/fixtures depuis, sans rapport avec 026-114 ; toujours 0 échoué).
- `node scripts/orchestre.mjs verifier 026-114` : **PASS · 6s** (code 0), cohérent avec les deux entrées déjà dans `.orchestre/verdicts.jsonl` pour `026-114` (PASS, `10:43:24Z` puis `11:14:24Z`).
- Dépendance **026-108** : présente dans `fait/`, condition de départ satisfaite.
- Un seul fichier `*_packs_pubs.sql` dans `supabase/migrations/` (`0102_packs_pubs.sql`), numéro `0102` porté par lui seul + ses deux jumeaux — confirmé par listage direct.
- Fichier `supabase/controles/0102_packs_pubs.sql` relu : lecture seule (aucun `insert`/`update`/`delete`/`drop`), une ligne oui/non par point du contrat (table, RLS, une politique lecture/zéro écriture via `pg_policy.polcmd`, bucket privé et sa limite) — cohérent avec ce que mes blocs A et B ont mesuré directement en base.
- `git status --porcelain supabase/migrations supabase/controles` : tout untracked (`??`), aucun fichier **existant** modifié ; les 4 fichiers du périmètre de 026-114 y sont, plus des migrations `0101`, `0106`, `0107` sans rapport (autres fiches, sessions concurrentes).
- Périmètre respecté de mon côté : aucun `Write`/`Edit` hors de ce fichier (`.orchestre/preuves/026-114/contre-verif-28-09.md`) ; toutes mes attaques ont tourné en base, jamais sur le disque ; `apply_migration` jamais appelé.

## Verdict

**VERT confirmé**, par une seconde mesure indépendante (17 attaques en base réparties en 2 blocs, chacune prédite puis observée, plus 2 contrôles de trace séparés) qui reproduit au SQLSTATE près les résultats d'une contre-vérification antérieure du même jour sans s'appuyer sur son texte pour construire les attaques. Les quatre contraintes CHECK (`etat`, `type`, `prix_cents > 0`, y compris le cas négatif), les droits `anon` (lecture, écriture, storage), les droits `authenticated` (lecture, écriture ET mise à jour, y compris avec la bonne identité), l'absence de politique `storage.objects`, la rejouabilité intégrale sans duplication ni perte de données, l'index unique partiel (doublon refusé avant et après rejeu, deux nulls acceptés) et l'auto-correction du bucket sont tous conformes à ce que promet la fiche 026-114 — et la base est revenue à zéro trace après chaque bloc, vérifié par requête séparée à chaque fois. Une observation non bloquante (politique de lecture `authenticated` aujourd'hui inatteignable à cause du `revoke all`, héritée telle quelle de 0088) est à garder pour une fiche future qui toucherait la lecture côté client, mais ne remet pas en cause 026-114 : la migration livre exactement le contrat demandé. `apply_migration` jamais appelé, par moi ni observé comme appelé par personne d'autre depuis.
