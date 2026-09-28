# Contre-vérification indépendante — fiche 026-054 (0110_usine_socle.sql)

Date : 2026-09-28. Exécutant : agent de contre-vérification (session distincte de l'agent qui a produit la fiche). Objet : rejouer
l'attaque sur la vraie base de production Supabase (projet `gorcdvmueakcncsmrouo`), sans jamais appeler `apply_migration`, pour
confirmer ou infirmer le verdict `PRET_A_APPLIQUER` rendu par l'agent producteur (`node scripts/usine-sql-qa.mjs` : PASS US-1 à
US-7).

## Empreinte du jumeau attaqué

Avant toute attaque, l'empreinte sha256 du jumeau nu (`supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql`, coupé à
`MARQUE_CONTROLE`, fins de ligne LF) a été recalculée **indépendamment** (sans le module `scripts/lib/sql-essai.mjs`, en Node pur) :

```
36cba5f60a69ab7033b04d0c8bba18ab06e9baa3fddda349cb2cb0efac5ae026
```

Identique à l'empreinte citée dans `.orchestre/preuves/026-054/essai-a-sec.txt` et `verifier.log` (US-7). Le fichier attaqué ici
est donc bien celui que l'agent producteur a déjà éprouvé — rien n'a changé entre-temps.

## État de départ (lecture seule, avant tout essai)

Vérifié par une requête `execute_sql` en lecture seule avant le premier essai : `public.ops_tache_detenue` n'existait pas, le
bucket `usine` n'existait pas, aucun agent `usine`/`livreur_usine` n'existait, `storage.objects` avait RLS activée
(`relrowsecurity = true`) avec 2 politiques préexistantes, toutes deux scopées à `bucket_id = 'artisan-media'` (aucune ne touche
`usine`). Base propre, migration réellement non appliquée.

## Méthode

Deux essais à sec successifs, chacun un **seul** énoncé `do $tag$ … raise exception '…' … end $tag$;` envoyé par l'outil MCP
`execute_sql` (jamais `apply_migration`). Chaque bloc :
1. applique le jumeau nu (`execute $mig...$ <jumeau nu octet pour octet> $mig...$;`) — un seul énoncé multi-commandes exécuté par
   SPI, technique déjà validée par l'agent producteur et par la mémoire `essai-a-sec-migration` ;
2. tente ses attaques, chacune dans son propre `begin … exception when others … end;` pour capturer un refus sans avorter le
   reste du script ;
3. termine par un `raise exception` non intercepté, qui annule tout le bloc (DDL compris — transactionnel en Postgres) : rien ne
   peut survivre, quel que soit le résultat des attaques.

Un premier essai (celui des attaques, ci-dessous) a échoué au montage à cause de deux bugs **dans mon propre scénario** (une
capacité de tâche `essai_contre_054` refusée par `taches_capacite_check` car elle contient des chiffres — la contrainte
n'admet que `[a-z_]` — puis un `jeton_hash` factice qui ne respectait pas `agents_jeton_hash_check`, `^[0-9a-f]{64}$`). Corrigés
(`essai_contre_temoin`, `repeat('a', 64)`), le second essai est passé intégralement. Le premier essai raté a lui aussi été
vérifié sans trace avant de corriger et relancer (voir plus bas) : aucune donnée n'a persisté entre les deux passes.

Scripts complets déposés dans `.orchestre/travail/026-054-contre-verif-28-09/` (`build-attaque.mjs` → `attaque.sql`,
`build-controle.mjs` → `controle.sql`), pour rejeu.

## Essai 1 — les attaques (bloc `$ctrverif054$`)

Résultat brut (`ESSAI_A_SEC_OK` suivi du JSON, recopié tel que l'outil l'a rendu) :

```
ERROR:  P0001: ESSAI_A_SEC_OK {"diag_a1": "anon 42501 permission denied for function ops_tache_detenue",
"diag_a2": "authenticated 42501 permission denied for function ops_tache_detenue",
"diag_b1": "anon 42501 new row violates row-level security policy for table \"objects\"",
"installation": true, "a1_anon_refuse": true, "migration_appliquee": true, "b2_sabotage_applique": true,
"c1_rejeu_sans_doublon": true, "b1_anon_objects_refuse": true, "d4_pas_pour_id_invente": true,
"a2_authenticated_refuse": true, "d3_pas_pour_bail_expire": true, "d5_pas_pour_tache_faite": true,
"d6_injection_sans_effet": true, "d1_pas_pour_livreur_usine": true, "d2_pas_pour_tache_en_file": true,
"b1_aucun_objet_usine_present": true, "b2_bucket_repare_apres_rejeu": true,
"a3_hijack_search_path_now_refuse": true, "c2_colonnes_intouchables_preservees": true,
"controle_final_aucune_politique_usine": true, "controle_final_droits_service_role_seul": true,
"d7_pas_de_correspondance_insensible_a_la_casse": true, "controle_final_securite_definer_stable_search_path": true}
CONTEXT:  PL/pgSQL function inline_code_block line 240 at RAISE
```

**22 clés, toutes à `true`** — chaque attaque a été refusée. Détail par promesse attaquée (au moins 4 exigées ; j'en ai monté
quatre catégories, dix-sept sous-attaques) :

### A — Droits anon / authenticated (sur `ops_tache_detenue`)
- **a1** `set local role anon` puis appel de la fonction sur une tâche réellement sous bail vivant → **refusé**, `42501 permission
  denied for function ops_tache_detenue`.
- **a2** même chose en `authenticated` → **refusé**, même code.
- **a3** attaque plus fine, absente de l'essai de l'agent producteur : détournement du `search_path`. J'ai créé un faux
  `public.now()` renvoyant 1970, puis posé `set local search_path = public, pg_catalog, ops` (public passé devant pg_catalog)
  avant d'appeler la fonction sur une tâche dont le bail était **réellement expiré**. Si la fonction avait résolu `now()` via le
  chemin de recherche de l'appelant, le faux `now()=1970` aurait fait croire que le bail n'était pas expiré et la ligne serait
  sortie. Elle n'est **pas** sortie : `set search_path = pg_catalog, ops` gravé dans la définition de la fonction (026-054 le
  décrit, le contrôle le vérifie) protège bien contre ce détournement classique des fonctions `security definer`. Décoy détruit
  et `search_path` réinitialisé aussitôt après.
- **controle_final_droits_service_role_seul** : après tout le sabotage plus bas, seul `service_role` exécute encore la fonction.

### B — Contraintes (bucket, `storage.objects`)
- **b1** `set local role anon` puis `insert into storage.objects (bucket_id, name) values ('usine', …)` → **refusé**,
  `42501 new row violates row-level security policy for table "objects"`. J'ai vérifié au préalable que `anon` a bien le GRANT
  INSERT au niveau table sur `storage.objects` (comportement Supabase par défaut) : le refus vient donc bien de la RLS — donc de
  l'absence de toute politique pour `usine` promise par 026-054 — et non d'un défaut de droit générique.
- **b2** sabotage direct du bucket (`update storage.buckets set public = true, file_size_limit = 999999999,
  allowed_mime_types = array['application/x-evil']`), puis rejeu de la **seule** instruction `insert … on conflict … do update`
  extraite de la migration → le bucket est **réparé** : privé, 8 388 608 octets, les 14 types exacts, plus aucune trace du type
  évil. Prouve que le `on conflict do update` protège vraiment contre une dérive du bucket, pas seulement à la première pose.
- **controle_final_aucune_politique_usine** : toujours aucune politique nommant ou filtrant `usine` sur `storage.objects`.

### C — Rejouabilité
- Sabotage des trois colonnes intouchables de l'agent `usine` (`jeton_hash`, `en_pause`, `pause_motif`, `battement_le` —
  simulateur d'un agent déjà en service, jeton posé, en pause, avec un battement récent), puis rejeu du jumeau **entier** une
  deuxième fois (une ré-application accidentelle de 0110).
- **c1** aucun doublon : toujours exactement une ligne `usine`, une `livreur_usine`, un bucket `usine`.
- **c2** les quatre colonnes intouchables ressortent **identiques** à leur valeur saboté avant le rejeu — 0097
  (`ops_agent_enregistrer`) ne les touche jamais, confirmé sur la vraie fonction, pas en lecture du code source.

### D — Cas limites de la fiche (sur `ops_tache_detenue`)
Avec une tâche créée par un agent d'essai fabriqué (`essai_contre_temoin`, jamais une vraie capacité), une prise réellement sous
bail, une laissée en file, une marquée `faite` :
- **d1** tenue par `livreur_usine` (agent réel semé par 026-054) au lieu du détenteur → zéro ligne.
- **d2** tâche jamais prise (`statut = 'file'`) → zéro ligne, même pour son créateur.
- **d3** bail réellement expiré (`bail_jusqua` mis dans le passé par `clock_timestamp()`, sans triche) → zéro ligne.
- **d4** id inventé (`gen_random_uuid()`) → zéro ligne.
- **d5** tâche déjà `faite` (avec preuve, bail nettoyé) → zéro ligne, même pour l'agent qui l'a faite.
- **d6** `p_agent` de forme injection (`x'; drop table ops.agents; --`, passé comme littéral dollar-quoté) → zéro ligne, **aucun
  dégât** (la table `ops.agents` existe toujours, la tâche testée existe toujours) : l'appel de fonction paramétré ne concatène
  jamais la valeur dans du SQL dynamique.
- **d7** agent avec une casse différente (`upper(v_agent)`) → zéro ligne : comparaison texte sensible à la casse, pas de
  correspondance approximative.

## Essai 2 — le contrôle réel, tel quel, à sec (bloc `$ctrl054$`)

Pour répondre littéralement à « le contrôle rend oui partout » sans jamais appliquer pour de vrai, un second essai à sec a
appliqué le jumeau nu puis exécuté **le contenu exact** de `supabase/controles/0110_usine_socle.sql` (copié-collé du fichier,
seul le `;` final ôté pour l'emboîter en sous-requête), avant d'annuler par la même exception :

```
ERROR:  P0001: CONTROLE_026_054 [
  {"quoi": "bucket usine privé, 8 Mo, les quatorze types (attendu : oui)", "resultat": "oui"},
  {"quoi": "aucune politique sur storage.objects pour usine (attendu : oui)", "resultat": "oui"},
  {"quoi": "ops_tache_detenue : security definer, stable (attendu : oui)", "resultat": "oui"},
  {"quoi": "ops_tache_detenue : service_role seul (attendu : oui)", "resultat": "oui"},
  {"quoi": "agent usine, période 30 min (attendu : oui)", "resultat": "oui"},
  {"quoi": "agent livreur_usine, période 60 min (attendu : oui)", "resultat": "oui"}
]
```

**6/6 « oui »**, sur le fichier de contrôle tel qu'il est sur le disque — pas une reformulation.

## Zéro trace, vérifié après chacun des trois essais (le raté compris)

Après l'essai 1 raté (bug de mon scénario), après l'essai 1 réussi, et après l'essai 2 (contrôle), une requête `execute_sql` en
lecture seule séparée a confirmé à chaque fois :
- `to_regprocedure('public.ops_tache_detenue(text,uuid)')` → `null` ;
- `storage.buckets` sans ligne `id = 'usine'` ;
- `ops.agents` sans ligne `usine` ni `livreur_usine`, et sans résidu `contre054_%` ;
- `ops.taches` sans résidu `cle_idempotence like 'contre054:%'` ;
- `storage.objects` sans ligne `bucket_id = 'usine'` ;
- `to_regprocedure('public.now()')` (le décoy de l'attaque A3) → `null` ;
- `pg_policies` sur `storage.objects` toujours à 2 lignes, toutes deux `artisan-media`, inchangées.

## Intégrité des fichiers

sha256 de `supabase/migrations/0110_usine_socle.sql`, `_A_COLLER_sql_editor_0110.sql`, `_A_COLLER_sql_editor_0110_NU.sql`,
`supabase/controles/0110_usine_socle.sql`, `.orchestre/preuves/026-054/essai-a-sec.txt`, `verifier.log`,
`.orchestre/en-cours/026-054.md`, `scripts/fixtures/026/usine-production/essai-0110.sql` et `contrat-usine.json` recalculés
avant et après la contre-vérification : **identiques** (diff vide). Aucun fichier du dépôt n'a été modifié — toute l'attaque
s'est jouée dans des transactions annulées sur la base distante ; les seuls fichiers écrits par cette contre-vérification sont
ce rapport et les scripts de rejeu dans `.orchestre/travail/026-054-contre-verif-28-09/`.

`git status` montre des changements ailleurs dans le dépôt (`.orchestre/agents.jsonl`, `.orchestre/file/*`, `docs/`,
`app/confidentialite/page.tsx`, etc.) : préexistants à cette session, produits par d'autres sessions concurrentes sur ce dépôt
(mémoire « Presti — sessions concurrentes »), aucun dans le périmètre de 026-054 et aucun touché par ce travail.

## Verdict

**vert = true.**

Dix-sept sous-attaques couvrant les quatre catégories exigées (droits anon/authenticated y compris un détournement de
`search_path`, contraintes du bucket et de `storage.objects`, rejouabilité avec colonnes intouchables sabotées, six cas limites
de la fonction) ont toutes été **refusées** sur la vraie base de production. Le contrôle réel (fichier inchangé) rend « oui »
sur ses 6 lignes une fois la migration appliquée à sec. Aucune trace ne subsiste après coup, aucun fichier du dépôt n'a bougé.
Le verdict `PRET_A_APPLIQUER` de la fiche 026-054 est confirmé de façon indépendante : Claude Code peut appliquer
`supabase/migrations/0110_usine_socle.sql` par `apply_migration` (nommée `0110_usine_socle`), après 0097 et 0098, comme prévu.
