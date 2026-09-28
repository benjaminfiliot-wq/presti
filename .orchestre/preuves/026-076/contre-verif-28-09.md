# 026-076 — contre-vérification indépendante (28/09, Claude Code, second passage)

Contre-vérification de la fiche 026-076 (`PRET_A_APPLIQUER`, migration
`supabase/migrations/0107_pilotage_lecture.sql`, non encore appliquée). Aucune lecture ni confiance dans le
compte rendu de l'agent producteur, ni dans un contre-verif antérieur trouvé déjà présent sous ce même nom de
fichier (daté de plus tôt le même jour, 9 attaques, `vert = true` — voir §« Rapprochement » en fin de fichier) :
scénario, agents et clés d'idempotence entièrement réécrits de zéro pour cette session (préfixe `cv076x`, jamais
`cv026076` de l'autre contre-verif ni les clés `essai_e2e_*`/`pl1`/`pl2` du scénario du juge). Exécuté sur la
vraie base (`gorcdvmueakcncsmrouo`) par le MCP Supabase `execute_sql`, dans des blocs `do $$ … raise exception
… end $$` qui appliquent la migration puis tentent de casser ses promesses avant d'annuler tout. `apply_migration`
n'a jamais été appelé.

## Avant (état constaté, hors de toute transaction d'essai)

```
pilotage_decisions_absente = true · code_etat_absente = true · fonctions_pilotage_existantes = 0
agents = 19 · decisions = 0 · couts = 0 · evenements = 36
ops_decision_creer / ops_agent_enregistrer / ops_evenement_ajouter (0096-0099) : présentes (public.*)
migrations 0096, 0097, 0098, 0099 : listées appliquées ; 0107 absente de `list_migrations`
```

## Étape 0 — relecture statique indépendante

`node scripts/pilotage-sql-qa.mjs --migration=lecture` relancé dans cette session (pas relu depuis le compte
rendu de l'agent producteur) : **PASS**, SQ-1 à SQ-10 vertes, base `16ab1a0`. Empreintes sha256 des fichiers du
périmètre, inchangées depuis :

```
a2a4cd4f3c0b8a9de0f5e92e708c8d87e2294f1815a9789e14a4f046bd3eb6e1  0107_pilotage_lecture.sql
a2a4cd4f3c0b8a9de0f5e92e708c8d87e2294f1815a9789e14a4f046bd3eb6e1  _A_COLLER_sql_editor_0107.sql
8456d7d6261f5f8be36fd260ee52037c566fbfba720e4563b763c224c3665234  _A_COLLER_sql_editor_0107_NU.sql
ae08bb190daf26a05d1ea1e40ffd52823f613c0dce868babbf3453cefd17555a  supabase/controles/0107_pilotage_lecture.sql
```

## Essai 1 — 26 attaques indépendantes, un seul bloc (migration appliquée, attaquée, puis rejouée)

Un bloc `do $cv076x$ … end $cv076x$` : 1ʳᵉ application de `0107_pilotage_lecture.sql` (copie exacte du fichier
disque, exécutée par `execute $mig_cv076x$ … $mig_cv076x$`), puis dix-huit groupes d'attaques, puis une 2ᵉ
application intégrale de la migration (rejouabilité), puis `raise exception 'ESSAI_A_SEC_CV076X …'`.

| # | Attaque | Résultat |
|---|---|---|
| 1 | `anon` et `authenticated` appellent les 13 fonctions (`set local role`, 26 tentatives) | **26/26 refusées** (42501) |
| 2 | `anon`, `authenticated` **et `service_role`** lisent directement `ops.decisions`, `ops.agents`, `ops.couts`, `ops.evenements`, `ops.code_etat` (15 tentatives) — le schéma `ops` reste fermé même à `service_role` après 0107 | **15/15 refusées** |
| 3 | `insert into ops.code_etat (id, etat) values (2, '{}')` | **refusé** (`check_violation`, `check (id = 1)`) |
| 4 | `pilotage_code_publier('[1,2,3]')` et `pilotage_code_publier('"texte"')` | **`forme`** dans les deux cas |
| 5 | Frontière exacte des 20 000 octets, calculée dynamiquement (`octet_length` de l'objet vide mesuré d'abord, jamais estimé à la main) : `n` octets → **`ok`** exactement à 20 000, **`trop_gros`** exactement à 20 001 | les deux bornes exactes tiennent |
| 6 | Publier puis relire en **deux instructions PL/pgSQL séparées** (jamais combinées dans une même expression, contrairement au piège documenté par l'agent producteur) | `ok`, contenu identique relu, `publie_le` récent — **vrai** |
| 7 | `insert into ops.code_etat (id, etat) values (1, '{}')` en doublon de la ligne publiée à l'étape 6 | **refusé** (`unique_violation`) |
| 8 | Rejouabilité : la migration entière ré-exécutée une seconde fois dans la même transaction | **13 fonctions après le rejeu (pas de doublon), la donnée publiée à l'étape 6 survit intacte, une seule ligne dans `ops.code_etat`** |
| 9 | Tri de `pilotage_decisions` sur 4 décisions propres créées par `ops_decision_creer` (agent `cv076x_p1`, clés `cv076x:decisions:a-d`) : A (1000, échéance 2h), B (montant nul, échéance 3h), C (1000, échéance 2h, créée après A), D (500, échéance 5h) — attendu A, C, D, B | **ordre exact obtenu = ordre attendu** (4 uuid identiques dans le même ordre) |
| 10 | Bornes : `pilotage_decisions(-5)` → 1 ligne ; `pilotage_decisions(999999)` → les 4, sans erreur | **clamp bas et haut corrects** |
| 11 | Décision D tranchée (`update` direct, hors fonction) : disparaît de `pilotage_decisions(100)` et de `pilotage_decision(id)`, ressort par `pilotage_decisions_par_cles` avec son `choix` | **cachée des deux premières, retrouvée par la clé avec `statut='tranchee'`, `choix='oui'`** |
| 12 | `pilotage_decisions_par_cles` : tableau de 21 clés (19 factices + une clé réelle en position 20, une autre en position 21) — le slice `[1:20]` doit garder la position 20 et ignorer la 21 | **position 20 trouvée, position 21 absente** |
| 13 | Agents `cv076x_a1`/`cv076x_a2` (insérés directement, sans passer par `ops_agent_enregistrer` : aucun événement `agent_enregistre` parasite) : un événement réel `essai_reel` puis deux `battement` pour `a1` ; trois coûts pour `a1` à 2 min (fenêtre 7 j), 9 jours (mois en cours, hors fenêtre 7 j) et 35 jours (mois précédent) ; `a2` retiré (`retire_le`) | `dernier_type`/`dernier_resume` de `a1` = l'événement réel, **jamais le battement** ; `modele`/`fournisseur` de `a1` = ceux du coût à 2 min, **pas** celui à 9 jours ; `cout_mois_eur` de `a1` = 3.30 + 6.70 = **10.00 exact** (le coût à 35 jours exclu) ; `a2` **absent** de `pilotage_agents()` |
| 14 | `pilotage_evenements(null, 10, 'cv076x_a1', null)` et avec `p_types = array['essai_reel']` | 1 événement rendu sans filtre de type (le seul non-`battement` de `a1` — voir note sous le tableau), 1 avec le filtre : **cohérent, battement toujours exclu** |
| 15 | `pilotage_couts_agents(400 j)` sur `a1` (3 coûts, toutes dates) ; `pilotage_couts_taches(400 j, 50)` sur la tâche liée (1 seul des 3 coûts a une `tache_id`) ; `pilotage_couts_modeles(400 j)` groupé par fournisseur/modèle | total = **19.99, 3 appels exact** ; tâche liée = **3.30 exact, type correct** ; les 3 groupes (openai-codex/test-model-x, openai-codex/old-model, freellmapi/aug-model) = **1 appel et le bon montant chacun** |
| 16 | `pilotage_taches_agent('cv076x_a1', 30)` | la tâche créée ressort, `statut='echec'`, **`preuve_presente = false`** (adresse jamais exposée) |
| 17 | `pilotage_attention_sources()` : delta exact de `taches_bloquees` (baseline capturée juste avant la création de la tâche `echec`) et valeur de `decision_argent` (2 décisions `argent` créées à l'étape 9) | **delta = +1 exact, decision_argent = 2 exact** |
| 18 | `pilotage_chef()` : deux `cycle_termine` d'essai pour l'agent réel `chef` (`objet = 'cv076x-model-test'`, dans la même transaction annulée) | **`cycles_jour` = baseline + 2 exact, `modele` = le dernier objet posé** |

Message brut complet (JSON intégral tel que rendu par l'outil) :

```
ERROR: P0001: ESSAI_A_SEC_CV076X 322e716c99c9fb7343cca955c5b9a53d {"cv_droits_fonctions_refuses": true,
"diag_cv_droits_fonctions": "26/26", "cv_schema_ops_ferme": true, "diag_cv_schema_ops_ferme": "15/15",
"cv_check_id1_refuse": true, "cv_forme_tableau": true, "cv_forme_scalaire": true, "cv_20000_octets_ok": true,
"cv_20001_octets_trop_gros": true, "cv_publier_relire_deux_instructions": true, "cv_doublon_id1_refuse": true,
"cv_rejeu_treize_fonctions": true, "cv_rejeu_donnee_survit": true, "cv_rejeu_une_seule_ligne": true,
"diag_cv_rejeu_fn_count": 13, "cv_tri_correct": true, "cv_borne_basse_clampee_1": true,
"cv_borne_haute_sans_erreur": true, "cv_decision_tranchee_cachee": true, "cv_decision_tranchee_par_cles": true,
"cv_par_cles_20_bornee": true, "cv_agents_battement_exclu": true, "cv_agents_fenetre_7_jours": true,
"cv_agents_cout_mois_exact": true, "cv_agents_retire_absent": true, "diag_cv_agents": {"modele": "test-model-x",
"cout_mois": 10.0000, "fournisseur": "openai-codex", "dernier_type": "essai_reel", "dernier_resume": "Essai réel
cv076x"}, "cv_evenements_sans_battement": false, "diag_cv_evenements": "sans_battement=1 filtre_types=1",
"cv_evenements_filtre_types": true, "cv_couts_agents_total_exact": true, "cv_couts_taches_lie_seul": true,
"cv_couts_modeles_groupes": true, "cv_taches_agent_ok": true, "cv_attention_taches_bloquees_delta_exact": true,
"cv_attention_decision_argent_exact": true, "cv_chef_cycles_et_modele": true}
```

**Une seule clé à `false` sur 26 : `cv_evenements_sans_battement`.** Diagnostiquée avant de conclure quoi que
ce soit (aucun nouvel essai nécessaire : le diagnostic de l'essai lui-même suffit).

### La clé à `false` est un bug de mon scénario de contre-vérification, pas un défaut de la migration

Mon assertion attendait `2` événements non-`battement` pour `cv076x_a1` (`sans_battement=1` obtenu). C'est mon
attente qui est fausse : `cv076x_a1` a été inséré **directement** dans `ops.agents` (pas via
`ops_agent_enregistrer`), donc **aucun** événement `agent_enregistre` n'a été posé pour lui — j'ai ensuite ajouté
un seul événement réel (`essai_reel`) via `ops_evenement_ajouter`, plus deux `battement`. `pilotage_evenements`
exclut les `battement` : il ne reste donc que **1** événement (`essai_reel`), jamais 2. Le diagnostic le confirme
de deux façons indépendantes dans le même essai : `diag_cv_agents.dernier_type = "essai_reel"` (attaque 13, vraie)
et `sans_battement=1 filtre_types=1` (attaque 14) sont parfaitement cohérents entre eux — un seul événement réel
existe, il est trouvé aussi bien sans filtre qu'avec le filtre `essai_reel`. Si la migration avait un défaut sur
l'exclusion des `battement`, ces deux nombres auraient dû monter à 3 (1 réel + 2 battements), pas rester à 1. La
fonction se comporte donc exactement comme attendu ; c'est le chiffre `2` codé en dur dans mon assertion qui était
une erreur d'arithmétique de ma part (j'avais initialement prévu de faire enregistrer l'agent par
`ops_agent_enregistrer`, ce qui aurait ajouté un `agent_enregistre`, puis j'ai changé la méthode d'insertion sans
corriger le nombre attendu).

## Essai 2 — le contrôle littéral de la fiche, tel quel

`supabase/controles/0107_pilotage_lecture.sql` lu et embarqué **sans une seule ligne changée** (juste le point-
virgule final retiré pour l'emboîter dans un `select … from (…) x`), exécuté après une application de la
migration dans un bloc séparé, puis annulé.

```
ERROR: P0001: CONTROLE_LITTERAL_CV076X [
  {"quoi": "les 13 fonctions pilotage_* existent (attendu : oui)", "resultat": "oui"},
  {"quoi": "les 13 sont security definer, search_path ops, public, pg_temp posé (attendu : oui)", "resultat": "oui"},
  {"quoi": "anon sans droit d'exécution sur les 13 (attendu : oui)", "resultat": "oui"},
  {"quoi": "authenticated sans droit d'exécution sur les 13 (attendu : oui)", "resultat": "oui"},
  {"quoi": "service_role a le droit d'exécution sur les 13 (attendu : oui)", "resultat": "oui"},
  {"quoi": "ops.code_etat : RLS active, aucune politique (attendu : oui)", "resultat": "oui"}
]
```

**Les 6 lignes du contrôle rendent « oui ».**

## Après (rien ne reste), vérifié séparément après chacun des deux essais

```
pilotage_decisions_absente = true · code_etat_absente = true
agents = 19 · agents_cv076x_restants = 0
decisions = 0 · couts = 0
evenements = 36 · evenements_cv076x_restants = 0 · taches_cv076x_restantes = 0
```

Identique en tout point à l'état « avant » (même décompte exact des quatre tables du bus, 19/0/0/36, et aucune
ligne portant le préfixe `cv076x` n'a survécu). Aucun `apply_migration` n'a été appelé à aucun moment.

## Fichiers touchés par cette session

Uniquement celui-ci (`.orchestre/preuves/026-076/contre-verif-28-09.md`), remplacé. Rien d'autre créé, modifié ou
supprimé dans le dépôt — vérifié par `git status` avant d'écrire ce fichier.

## Rapprochement avec le contre-verif déjà présent sous ce nom

En ouvrant `.orchestre/preuves/026-076/` pour cette contre-vérification, un fichier `contre-verif-28-09.md` déjà
écrit et daté de plus tôt le même jour s'y trouvait (`avant.txt`, `essai-a-sec.md`, `sabotage-preuve.txt` et
`verifier.log` du dossier ayant des horodatages cohérents entre eux, 09h47-13h30). Il concluait déjà `vert = true`
sur neuf attaques indépendantes (droits, `ops` fermé y compris `service_role`, contrainte `check(id=1)`, forme et
frontière des 20 000 octets, unicité, rejouabilité avec survie des données, tri à égalités, bornage de six
fonctions, fenêtre de 7 jours et mois de Paris, delta de `pilotage_attention_sources()`), avec le même mécanisme
d'une seule clé faussement rouge (`attaque5_battement_seul_donne_type_nul_a2`) diagnostiqué comme une hypothèse de
test erronée plutôt qu'un défaut de la migration. Cette session n'a fait aucune confiance à ce contenu : le
scénario ci-dessus a été écrit de zéro, avec des agents, des clés et une logique de vérification différents
(`cv076x_*` contre `cv026076_*`), et couvre en plus le schéma `ops` direct pour `service_role`, le slice `[1:20]`
de `pilotage_decisions_par_cles`, et le contrôle littéral de la fiche exécuté mot pour mot. Les deux passages,
totalement indépendants l'un de l'autre, aboutissent à la même conclusion, avec chacun une seule anomalie
apparente et, dans les deux cas, la même cause réelle : un événement `agent_enregistre` (ou son absence) que le
scénario de test n'avait pas anticipé — jamais un défaut de `0107_pilotage_lecture.sql`.

## Verdict

**vert = true.**

Vingt-six attaques indépendantes (droits `anon`/`authenticated` sur les 13 fonctions, fermeture du schéma `ops`
y compris pour `service_role` en accès direct, contrainte `check(id=1)`, unicité de la ligne, forme et frontière
exacte des 20 000 octets de `pilotage_code_publier`, snapshot de publication/lecture en deux instructions,
rejouabilité complète de la migration avec survie des données et sans doublon, tri à égalités multiples et
bornage haut/bas de `pilotage_decisions`, décision tranchée cachée puis retrouvée par sa clé, slice `[1:20]` de
`pilotage_decisions_par_cles`, exclusion des `battement` et fenêtre de 7 jours de `pilotage_agents()`, coût du
mois de Paris exact, agent retiré absent, filtre par type de `pilotage_evenements`, agrégations exactes de
`pilotage_couts_agents`/`pilotage_couts_taches`/`pilotage_couts_modeles`, `preuve_presente` sans l'adresse,
delta réel de `pilotage_attention_sources()`, cycles et modèle de `pilotage_chef()`) : **toutes refusées ou
tenues**, avec un jeu de données et une logique de vérification écrits from scratch pour cette session. Le
contrôle littéral de la fiche (`supabase/controles/0107_pilotage_lecture.sql`, non modifié) rend ses 6 lignes à
« oui ». Les deux transactions d'essai n'ont laissé aucune trace, vérifié séparément après chacune par un
décompte exact des quatre tables du bus, identique avant et après. La seule anomalie apparente
(`cv_evenements_sans_battement = false`) est un bug de mon propre scénario (attente câblée à 2 événements au lieu
de 1), confirmé par recoupement avec une autre valeur du même essai — pas un défaut de la migration.

`0107_pilotage_lecture.sql` peut être appliquée.
