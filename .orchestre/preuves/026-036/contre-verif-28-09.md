# Contre-vérification 026-036 — 2026-09-28

Contre-vérificateur : session Claude Code séparée, indépendante de celle qui a produit la fiche
(exécutant `claude-code`, verdict `PASS`, verifier.log + essai-a-sec.txt du 2026-09-28T08:15:59Z).
Méthode imposée : essais à sec sur la vraie base (`gorcdvmueakcncsmrouo`), par
`mcp__692ffb0a-135d-434e-8d36-36d86f4b81c3__execute_sql` uniquement — **`apply_migration` n'a été
appelé à aucun moment**, ni par cette session ni, à ma connaissance, par la session précédente
(son propre essai-a-sec.txt le dit aussi explicitement).

## État de départ constaté (avant tout essai)

Requête en lecture seule sur la base réelle :
- `to_regclass('ops.argent_messages')` → `null` (la table n'existe pas)
- `pg_extension` pour `pgmq` → aucune ligne (extension non installée)
- fonctions `public.ops_argent_*` → 0
- `ops.evenements` → existe déjà (posée par 0096, appliquée le 2026-09-27)
- `pg_available_extensions` pour `pgmq` → présente, version par défaut `1.5.1`, non installée

`list_migrations` sur le projet s'arrête à `0099_ops_garde_envois` (0100 n'est pas dans la liste :
elle n'est pas appliquée). Cohérent avec la fiche et avec le compte rendu de la session précédente.

## Attaques menées (script écrit indépendamment, différent du scénario `essais/0100.sql` de FA-6)

Un seul appel `execute_sql`, une seule transaction implicite (vérifié au préalable par un essai
`create table` + `raise exception` : le `create table` est bien annulé avec l'erreur — la
transactionnalité multi-instructions est confirmée avant de bâtir le reste). Contenu, dans l'ordre :
1. le fichier `0100_ops_file_argent.sql` **exact** (copié tel quel, hash sha256
   `c92413e31d97e4921017700b958cf68ea62a2c306a7321811cec8d8504e32161`, vérifié contre le fichier du
   dépôt juste avant l'essai) ;
2. un bloc `do` **Groupe 1 — droits** ;
3. un bloc `do` **Groupe 2 — contraintes** ;
4. le fichier `0100_ops_file_argent.sql` **rejoué une seconde fois, intégralement**, dans la même
   transaction (pas un jumeau — le fichier réel, tel quel, une deuxième fois) ;
5. un bloc `do` **Groupe 3 — rejouabilité** (lu l'état après le rejeu ci-dessus) et **Groupe 4 — cas
   limites** ;
6. un dernier bloc `do` qui agrège tout dans un seul `raise exception` (errcode `P0001`) — abandon
   volontaire de la transaction entière.

### Groupe 1 — droits anon / authenticated (7 attaques + 2 privilèges de schéma)

`set local role anon` puis tentative des 5 fonctions `ops_argent_*`, de `pgmq.list_queues()` en
direct, et d'un `select` direct sur `ops.argent_messages` ; même chose pour `authenticated`.

| Attaque | Résultat |
|---|---|
| anon : 5 fonctions | 5/5 refusées (42501) |
| authenticated : 5 fonctions | 5/5 refusées (42501) |
| anon : `pgmq.list_queues()` en direct | refusé (42501) |
| authenticated : `pgmq.list_queues()` en direct | refusé (42501) |
| anon : `select` direct sur `ops.argent_messages` | refusé |
| authenticated : `select` direct sur `ops.argent_messages` | refusé |
| `has_schema_privilege('anon','pgmq','usage')` | faux |
| `has_schema_privilege('authenticated','pgmq','usage')` | faux |
| `pgmq_public` existe | non (`to_regnamespace` rend `null`) |

Le `select` direct sur la table (hors des 5 fonctions) est une attaque que le scénario FA-6 ne fait
pas explicitement — elle confirme que la fermeture de la table (RLS sans politique + revoke) tient
aussi si quelqu'un contourne les fonctions.

### Groupe 2 — contraintes, attaquées en contournant les fonctions (insert direct, en tant que
rôle propriétaire — donc les seules barrières qui restent sont les `check` de la table, pas les
droits)

| Attaque | Résultat |
|---|---|
| `insert` direct, `cle='ab'` (2 caractères) | refusé (23514 — contrainte de longueur) |
| `insert` direct, `type='type_qui_nexiste_pas'` | refusé (23514 — contrainte de type, **au niveau table**, indépendamment du contrôle applicatif de la fonction) |
| `insert` direct, `charge` de ~6000 octets | refusé (23514 — `pg_column_size(charge) <= 4096`) |
| `ops_argent_envoyer('type_invalide_via_fonction', …)` | refusé (`ops:type_argent`, P0001) |
| `insert` direct d'une clé déjà envoyée par la fonction (doublon) | refusé (23505 — clé primaire) |

Ces cinq attaques contournent délibérément les fonctions pour vérifier que les contraintes vivent
dans la table elle-même (défense en profondeur), pas seulement dans la logique applicative. C'est
un angle que le scénario FA-6 ne prend pas (il n'attaque que par les fonctions).

### Groupe 3 — rejouabilité (la migration, le vrai fichier, rejouée une seconde fois)

| Vérification après le second passage | Résultat |
|---|---|
| une seule version de chaque fonction `ops_argent_*` (pas de doublon dans `pg_proc`) | oui (5) |
| la ligne témoin du groupe 2 (`contre28:doublon`) a survécu au rejeu | oui |
| la file `argent` reste unique (`pgmq.list_queues()`) | oui |
| l'extension `pgmq` reste unique (`pg_extension`) | oui |

Le fichier entier — `create extension if not exists`, le bloc `do` de création de file, `create
table if not exists`, les cinq `create or replace function`, les `revoke`/`grant` — a été exécuté
deux fois de suite dans la même transaction sans qu'aucune instruction n'échoue et sans perte de
données. C'est un test plus dur que celui de la fiche : FA-6/FA-7 ne rejouent jamais 0100 sur
lui-même, ils ne testent que sa non-régression sur les autres fichiers.

### Groupe 4 — cas limites hors du cahier FA-6

| Cas | Résultat |
|---|---|
| `p_vt_s = 5` (borne basse incluse) | acceptée (le scénario FA-6 ne teste que les refus à 2 et 3601, pas les bornes exactes) |
| `p_vt_s = 3600` (borne haute incluse) | acceptée |
| `p_n = -5` | pas d'erreur, écrêté à 1 lecture rendue |
| `p_delai_s = -100` | pas d'erreur, écrêté à 0 (`greatest(…, 0)`) |
| `p_charge = null` | pas d'erreur, `charge` posée à `{}` |
| `ops_argent_fait` sur un `msg_id`/`cle` qui n'a jamais existé | rend `false` sans erreur (pas d'exception sur `pgmq.delete` d'un message inconnu) |
| ré-envoi de la même clé **après** `fait` (pas juste avant, comme FA-6) | rend `null` pour toujours — la clé reste bloquée même une fois le travail terminé |

## Contrôle officiel (`supabase/controles/0100_ops_file_argent.sql`) — rejoué indépendamment

Un second essai à sec, séparé, applique la migration une fois puis exécute la logique exacte du
fichier de contrôle (les six mêmes prédicats, réécrits pour être agrégés en JSON). Résultat, avant
l'abandon de la transaction :

```
{"file_argent": "oui", "table_fermee": "oui", "extension_pgmq": "oui",
 "une_seule_version": "oui", "cinq_fonctions_securisees": "oui",
 "anon_authenticated_sans_pgmq": "oui"}
```

Les 6 lignes du contrôle rendent **oui**, aucune n'échoue.

## Après chaque essai : zéro trace

Vérifié après l'essai principal (26 attaques) **et** après l'essai du contrôle officiel :
- `to_regclass('ops.argent_messages')` → `null`
- `pg_extension` pour `pgmq` → aucune ligne
- fonctions `public.ops_argent_*` → 0
- `ops.evenements` (table réelle, pas touchée par les essais) → aucune ligne `argent:%` ajoutée
- table temporaire `_contre_026_036` → `null` (jamais commitée)

## Vérifications hors SQL

- Hash du fichier de migration utilisé dans l'essai == hash du fichier du dépôt (vérifié avant
  l'essai, pas seulement après — donc pas de version édulcorée testée à ma place).
- Jumeaux (`_A_COLLER_sql_editor_0100.sql`, `_A_COLLER_sql_editor_0100_NU.sql`) : `diff` contre
  `0100_ops_file_argent.sql` → vide (le premier jumeau est un copier-coller identique ; le second en
  est la version « nue » à coller, cohérente en tête de lecture).
- `git status` scopé au périmètre : seuls des fichiers `??` (nouveaux, non suivis) dans
  `supabase/migrations/`, `supabase/controles/` et `.orchestre/preuves/026-036/` — rien
  d'inattendu, rien touché par cette contre-vérification hors de
  `.orchestre/preuves/026-036/contre-verif-28-09.md` (ce fichier).
- Aucun fichier de la liste `interdit` de la fiche n'a été modifié (je ne les ai pas ouverts en
  écriture).

## Verdict

**vert = true.**

Les 26 attaques du script indépendant (groupes 1 à 4 : droits, contraintes en contournant les
fonctions, rejouabilité par un vrai second passage du fichier, cas limites absents du cahier FA-6)
ont toutes été refusées ou traitées comme promis — aucune n'a réussi à casser une garantie de la
fiche. Le contrôle officiel rend « oui » sur ses 6 points, rejoué indépendamment. Chaque essai a
laissé la base dans l'état exact où il l'a trouvée. Cela corrobore le verdict PASS de la session
précédente par une méthode différente (attaques directes sur la table en contournant les fonctions,
rejeu réel du fichier plutôt que du jumeau nu, bornes exactes de `p_vt_s`, ré-envoi après
complétion) — pas une simple relecture de son compte rendu.

La fiche reste correctement en `en-cours/` : la migration n'est pas appliquée pour de vrai (FA-8
attend `--reel`, après une vraie application par `apply_migration`, que je n'ai pas faite ici — ce
n'était pas ma tâche).
