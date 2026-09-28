# Contre-vérification 026-061 (0106_acquisition_echanges) — 2026-09-28

**Contre-vérificateur** : Claude (orchestrateur), en contre-vérification indépendante de la fiche
produite par un autre agent (`.orchestre/preuves/026-061/essai-a-sec.md`, `essai-a-sec.json`).
**Projet Supabase** : `gorcdvmueakcncsmrouo` (presti-usine, prod). **Outil** : `execute_sql`
uniquement — **`apply_migration` n'a jamais été appelé**. La migration n'est donc **toujours pas
appliquée** à l'issue de ce travail.

## Verdict

**`vert = true`**

Les quatre catégories d'attaque demandées (droits anon/authenticated/service_role par
`set local role`, contraintes de la base, rejouabilité du schéma et des fonctions, cas limites de
la fiche) ont chacune été essayées à sec sur la vraie base, dans des blocs `do … raise exception`
qui appliquent la migration puis attaquent ses promesses. **40 attaques distinctes, toutes
refusées comme attendu.** Le contrôle statique (`supabase/controles/0106_acquisition_echanges.sql`)
a aussi été exécuté contre la base réellement migrée (dans le même genre de lot annulé) : **59
lignes sur 61 rendent « oui »** ; les 2 lignes restantes sont des défauts du contrôle lui-même
(diagnostiqués ci-dessous), pas de la migration — voir « Les deux « NON » du contrôle » avant de
conclure à un problème de 0106.

Après chaque lot, une lecture seule hors transaction confirme trace nulle : aucune des 4 tables
neuves, aucune des fonctions `acq_*`/`ops.garde_fenetre_meta`, aucun bucket `maquettes` n'existent
dans la base ; `ops.prospects`, `ops.envois`, `ops.decisions` sont à 0 ligne (comme avant l'essai) ;
`ops.interrupteurs.envoi_froid` est revenu à `false` et le plafond de `formulaire_site` à 0 (les
deux avaient été temporairement ouverts **dans la transaction annulée**, pour pouvoir tester les
règles de premier contact autrement bloquées par l'état actuel de prod).

## Méthode

Trois lots `execute_sql`, chacun une seule soumission multi-instructions (donc une seule
transaction implicite), chacun se terminant par un `do $fin$ … raise exception … $fin$` qui annule
tout le lot (DDL compris) — aucun `BEGIN`/`ROLLBACK` explicite requis. Le message de l'exception,
renvoyé par l'outil comme une erreur HTTP, porte la synthèse complète (JSON clé→booléen et détail
des échecs), capturée ci-dessous.

- **Lot 1** : migration 0106 entière (copiée telle quelle depuis
  `supabase/migrations/0106_acquisition_echanges.sql`) + sonde (`envoi_froid` ouvert,
  `formulaire_site` gonflé à 100/100, les deux annulés à la fin) + 40 attaques (attaques 1 à 6
  ci-dessous) + synthèse. 37/40 refusées comme attendu ; 3 ont révélé un défaut du **harnais de
  test** (pas de la migration), diagnostiqué et corrigé dans le lot 2.
- **Lot 2** : migration réappliquée (idempotente) + les 3 attaques corrigées, rejouées avec le bon
  paramétrage. 3/3 refusées comme attendu.
- **Lot 3** : migration réappliquée + le contrôle statique complet (copié tel quel depuis
  `supabase/controles/0106_acquisition_echanges.sql`) exécuté contre la base réellement migrée par
  ce même lot, capturé dans une table temporaire puis renvoyé par l'exception finale. 59/61 « oui ».

Entre chaque lot, une requête en lecture seule (hors transaction, donc après rollback) a confirmé
qu'aucune trace ne subsiste (détaillé plus bas, « Trace nulle »).

## Attaque 1 — anon / authenticated / service_role : lecture ou écriture directe des tables

Contournement total de la couche métier, par `set local role` puis tentative directe sur les
quatre tables neuves (`ops.conversations`, `ops.meta_evenements`, `ops.reponses`,
`ops.rendez_vous`) — fermées par `revoke all ... from public, anon, authenticated, service_role`
dans la migration, donc **même `service_role` ne doit rien pouvoir y lire directement** (seules les
fonctions `security definer` y accèdent).

| Attaque | Rôle | Opération | Résultat |
|---|---|---|---|
| `a1_anon_select_conversations` | anon | `select` | **refusé** (`insufficient_privilege`) |
| `a1_anon_select_meta_evenements` | anon | `select` | **refusé** |
| `a1_anon_select_reponses` | anon | `select` | **refusé** |
| `a1_anon_select_rendez_vous` | anon | `select` | **refusé** |
| `a1_authenticated_select_reponses` | authenticated | `select` | **refusé** |
| `a1_service_role_select_reponses` | service_role | `select` | **refusé** (même service_role) |
| `a1_service_role_select_conversations` | service_role | `select` | **refusé** |
| `a1_anon_insert_reponses` | anon | `insert` | **refusé** |

8/8 refusées. Le modèle « fermé à tous, y compris service_role, passage obligé par les fonctions »
tient réellement sur la base, pas seulement dans le texte SQL.

## Attaque 2 — anon / authenticated / service_role : exécution directe des fonctions sensibles

| Attaque | Rôle | Fonction | Résultat |
|---|---|---|---|
| `a2_anon_exec_envoi_approuver` | anon | `acq_envoi_approuver` | **refusé** |
| `a2_anon_exec_formulaires_a_porter` | anon | `acq_formulaires_a_porter` | **refusé** |
| `a2_anon_exec_echanges_purger` | anon | `acq_echanges_purger` (purge réelle) | **refusé** |
| `a2_anon_exec_prospect_export` | anon | `acq_prospect_export` | **refusé** |
| `a2_authenticated_exec_effacement_demander` | authenticated | `acq_effacement_demander` | **refusé** |
| `a2_authenticated_exec_reponse_recue` | authenticated | `acq_reponse_recue` | **refusé** |
| `a2_service_role_exec_garde_fenetre_meta` | service_role | `ops.garde_fenetre_meta()` | **refusé** |

7/7 refusées. Même `acq_echanges_purger` (qui efface pour de vrai si on pouvait l'appeler) est
inaccessible à anon.

## Attaque 3 — contraintes de la base contournées par une écriture directe (hors fonctions)

Insertions directes, comme propriétaire de table (donc sans passer par les `grant`/`revoke`), pour
vérifier que les contraintes tiennent même si une fonction métier avait un bogue.

| Attaque | Contrainte visée | Résultat |
|---|---|---|
| `a3_contrainte_reponses_envoi_ou_conversation` | ni envoi ni conversation, source≠courriel | **refusé** (`check_violation`) |
| `a3_contrainte_envois_prospect_ou_conversation` | ni prospect ni conversation | **refusé** |
| `a3_contrainte_reference_unique` (corrigé lot 2) | deux envois même `reference` | **refusé** (`unique_violation`) |
| `a3_contrainte_rdv_telephone` | téléphone hors regex | **refusé** |
| `a3_contrainte_rdv_expire_21j` | `expire_le` à 22 jours | **refusé** |
| `a3_contrainte_rdv_creneau_unique` | deux réservations au même créneau (bypass direct) | **refusé** |
| `a3_contrainte_meta_evenements_8ko` | `charge` > 8192 octets | **refusé** |
| `a3_contrainte_reference_format` | `reference` en minuscules | **refusé** |

8/8 refusées (la 3ᵉ après correction, voir « Défauts du harnais » ci-dessous).

## Attaque 4 et 5 — rejouabilité (schéma et applicative)

- `a4_rejeu_schema_sans_erreur` : les six idiomes de la migration (`add column if not exists`,
  `create table if not exists`, contrainte via `do $$ … exception when duplicate_object`,
  `create or replace function`, `drop trigger if exists` + `create trigger`, `insert … on conflict
  do update`) rejoués une seconde fois sur la base déjà migrée par le même lot. **Passe sans
  erreur** — confirme littéralement la mention de la migration « Rejouable sans dommage ».
- `a5_meta_evenement_rejoue_refuse` : `acq_meta_evenement_enregistrer` appelée deux fois avec le
  même `id_externe` → 1ᵉʳ `true`, 2ᵉ `false`, une seule ligne. **Refusé** (le doublon est rejeté).
- `a5_reponse_rejouee_refusee` (corrigé lot 2) : `acq_reponse_recue` appelée deux fois avec le même
  `id_externe` → même id, `nouvelle` passe de `true` à `false`, une seule ligne. **Refusé**.
- `a5_decision_rejouee_refusee` (corrigé lot 2) : `acq_decision_creer` appelée deux fois avec la
  même `cle_idempotence` → même id, `cree` passe de `true` à `false`, une seule ligne. **Refusé**.

4/4 confirmées (2 après correction).

## Attaque 6 — cas limites de la fiche (§4), redérivés indépendamment

Pas une relecture du scénario du premier agent : prospects et conversations construits à part
(préfixe `cv0261-`), pour vérifier moi-même que chaque promesse « sans lever » tient.

| Attaque | Promesse | Résultat |
|---|---|---|
| `a6_opposition_refuse_sans_lever` | opposition active → `{ok:false, raison:'opposition'}` | **confirmé** |
| `a6_formulaire_deja_refuse_sans_lever` | 2ᵉ formulaire même SIREN → `formulaire_deja` | **confirmé** |
| `a6_email_sans_preuve_demande_refuse` | `email_sollicite` sans preuve → `preuve_demande_absente` | **confirmé** |
| `a6_90_jours_refuse_sans_lever` | 2ᵉ premier contact < 90 j → `90_jours` | **confirmé** |
| `a6_relance_non_sollicitee_refusee` | relance hors `lien_envoye`/`oui` → `relance_sollicitee` | **confirmé** |
| `a6_verdicts_incomplets_refuses` | verdicts incomplets → `{ok:false, raison:'verdicts'}` | **confirmé** |
| `a6_verdicts_complets_sans_accord_benj_refuse_proprement` | verdicts complets **sans** l'accord de Benj (0099, 27/09) → refus propre, pas d'exception non rattrapée | **confirmé** (voir note ci-dessous) |
| `a6_garde_fenetre_meta_messagerie_24h` | 23 h accepté, 25 h → `fenetre_fermee` | **confirmé** |
| `a6_garde_fenetre_meta_reponse_privee` | 6 j accepté, 2ᵉ réponse au même commentaire refusée, 8 j refusé | **confirmé** |
| `a6_lien_maquette_22j_refuse` | lien à 22 jours → `expire_le` | **confirmé** |
| `a6_rdv_double_creneau_refuse` | 2ᵉ réservation au même créneau (par la RPC) → `pris` | **confirmé** |
| `a6_preuves_a_garder_borne_501` | 501 ids → exception `ops:borne` | **confirmé** |
| `a6_decision_bornes_options_refusees` | 8 options et 1 option → `{ok:false, raison:'options'}` | **confirmé** |

13/13 confirmées.

**Note sur `a6_verdicts_complets_sans_accord_benj`** : ce n'est pas une découverte nouvelle — le
premier agent l'avait déjà documentée (« découverte architecturale », `essai-a-sec.md`) : la
migration 0099 du 27/09 (postérieure à la rédaction de 026-061) impose un mécanisme « accord de
Benj » que `acq_envoi_approuver` ne joue pas explicitement. Ce que **cette** attaque vérifie en
plus : que le `sqlerrm like 'ops:%'` générique de 0106 rattrape bien `ops:accord_absent` même si ce
code d'erreur précis n'existait pas encore quand 0106 a été écrite — la propriété de
« forward-compatibility » du filtre par préfixe tient réellement, pas seulement en théorie.

## Défauts du harnais de test (lot 1), corrigés au lot 2 — **pas des défauts de la migration**

Trois attaques ont d'abord échoué avec une exception non rattrapée. Diagnostic : dans les trois
cas, mon script de test avait un paramètre invalide, révélé par la contrainte qui a réagi
correctement — la migration a donc **bien fonctionné**, c'est mon harnais qui avait un bogue.

1. **`a3_contrainte_reference_unique`** : j'avais utilisé `empreinte_texte = 'x1-3c'` (pas un SHA-256
   valide), qui a heurté `envois_empreinte_texte_check` (`^[0-9a-f]{64}$`) **avant** d'atteindre la
   contrainte `reference` que je voulais tester. Corrigé avec un vrai SHA-256 de 64 hex.
2. **`a5_reponse_rejouee_refusee`** : j'avais utilisé `source: 'essai'` pour un message sans
   rattachement, qui heurte `reponses_envoi_ou_conversation_ou_courriel` (seul `source='courriel'`
   dispense de rattachement). Corrigé avec `source: 'courriel'`.
3. **`a5_decision_rejouee_refusee`** : j'avais utilisé `agent: 'essai'`, qui heurte
   `decisions_creee_par_fkey` (`creee_par` doit référencer une ligne de `ops.agents` ; `systeme` en
   fait partie). Corrigé avec `agent: 'systeme'`.

Les trois, corrigés, passent (lot 2, voir tableaux ci-dessus).

## Les deux « NON » du contrôle statique (lot 3) — **défauts du contrôle, pas de la migration**

Le contrôle (`supabase/controles/0106_acquisition_echanges.sql`), exécuté à l'identique contre la
base réellement migrée par le lot 3, rend « oui » sur 59 des 61 lignes — **toutes** les 49 vérifications
individuelles par fonction (existe, `security definer`, `search_path`, exécutable par
`service_role` seul), les quatre tables neuves fermées, les colonnes, les contraintes, le
déclencheur, le bucket. Deux lignes composites rendent « NON (anormal) », et j'ai vérifié la cause
de chacune en lecture seule, hors transaction :

1. **« les 47 fonctions présentes, une seule version de chacune »** : le contrôle liste en réalité
   **49** signatures dans sa CTE `attendues` (je les ai comptées : lignes 2 à 50 du fichier), mais
   son test compare `count(*) = 47`. Les 49 existent bien, toutes uniques, toutes correctes
   individuellement (voir les 49 lignes « oui » à côté) — c'est le chiffre codé en dur dans le
   contrôle qui est resté à 47, probablement depuis une version antérieure de la fiche avant
   l'ajout de fonctions par la « voie gratuite » du 25/09. **Défaut du contrôle, pas de 0106.**
2. **« ni public.courriers, ni acq_reponse_relayer, ni acq_envoi_marquer, ni
   acq_oppositions_depuis »** : j'ai vérifié séparément (hors transaction, donc sur l'état réel
   actuel de la prod, indépendamment de mon essai) que `acq_reponse_relayer`, `acq_envoi_marquer`
   et `acq_oppositions_depuis` **n'existent pas** — cette partie est bonne. Mais
   **`to_regclass('public.courriers')` rend `courriers` : la table existe déjà en prod**,
   héritée d'une migration antérieure à la « voie gratuite ». Or 0106 a une politique explicite et
   documentée de « jamais de drop » (le fichier le dit lui-même : « aucune suppression ») ; OB-6 de
   la fiche ne demande que « le texte de 0106 ne contient aucune mention de public.courriers » —
   ce que j'ai confirmé (aucune ligne de la migration ne cite `courriers`). Le contrôle, lui, teste
   en plus que la **table** n'existe pas en base, ce qui ne peut structurellement jamais être vrai
   tant qu'une migration de nettoyage séparée ne la supprime pas (hors du périmètre de 026-061).
   **Défaut du contrôle (test plus large que la promesse de la fiche), pas de 0106.**

**Conséquence pratique pour la suite** : quand `0106_acquisition_echanges` sera appliquée pour de
vrai et que le contrôle sera relu (étape « C'est fini quand » de la fiche), ces deux lignes précises
rendront très probablement « NON (anormal) » à nouveau — ce n'est pas un signal d'alarme sur la
migration, c'est un défaut connu et diagnostiqué du contrôle lui-même. Je n'ai pas corrigé
`supabase/controles/0106_acquisition_echanges.sql` : mon périmètre pour cette tâche est limité à
`.orchestre/preuves/026-061/` et `.orchestre/travail/`, et ce fichier est hors de ce périmètre.

## Trace nulle (vérifiée après chaque lot, en lecture seule, hors transaction)

Après le lot 1+2 : `ops.conversations`/`meta_evenements`/`reponses`/`rendez_vous` inexistantes,
`acq_envoi_preparer`/`acq_decision_creer`/`ops.garde_fenetre_meta` introuvables, aucun prospect
`cv0261*`, aucune décision `cv0261*`, aucune ligne d'opposition posée par l'essai, bucket
`maquettes` absent, `ops.prospects`/`ops.envois` à 0 ligne (comme avant l'essai).

Après le lot 3 : même résultat — les quatre tables et les fonctions sont de nouveau introuvables,
le bucket absent, `ops.prospects`/`ops.envois`/`ops.decisions` à 0 ligne, `envoi_froid` revenu à
`false`, le plafond de `formulaire_site` revenu à 0 — l'état de prod est strictement identique à
celui relevé avant le tout premier appel `execute_sql` de cette contre-vérification.

## Ce que je n'ai pas refait

Le premier agent avait déjà couvert très largement les 54 assertions OB-14 à OB-24 dans son propre
essai à sec (`essai-a-sec.json`, toutes à `true`) ; je n'ai pas rejoué son scénario à l'identique
(entrants, variantes A/B, réservation d'essai `essai_e2e`, etc.) mais reconstruit mes propres
scénarios minimaux pour les mêmes promesses, plus les quatre catégories d'attaque que son essai ne
couvrait pas explicitement (aucune clé `anon`/`service_role` dans ses 54 assertions ; aucune attaque
directe des contraintes hors fonctions ; pas de rejeu du schéma lui-même). Je n'ai pas non plus
tenté la « vraie » danse `attend_accord_benj` + `ops.accords_benj` jusqu'à `approuve` (déjà faite et
documentée par le premier agent pour OB-20/OB-21) : mon attaque 6f s'arrête à vérifier que l'absence
de cette danse est refusée proprement, ce qui est le point pertinent pour une contre-vérification
(la fonctionnalité complète relève d'026-089/Facteur, hors périmètre de 026-061).

## Conclusion

Les 4 catégories d'attaque demandées ont chacune été essayées avec au moins 4 attaques réelles
(8+7+8+13 sur les catégories droits/contraintes/cas-limites, 4 sur la rejouabilité), toutes
refusées comme attendu, sur la vraie base, sans jamais appeler `apply_migration`, sans laisser de
trace. Le contrôle statique confirme la quasi-totalité de ses lignes ; les deux exceptions sont des
défauts diagnostiqués du contrôle, pas de la migration. **La fiche 026-061 reste `PRET_A_APPLIQUER`
: rien dans cette contre-vérification n'a trouvé de faille dans 0106_acquisition_echanges.sql.**
