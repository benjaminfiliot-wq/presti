## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« n8n, workflow, erreur, données… migration non appliquée ») : a rendu la règle de migration (go
  écrit de Benj, voies 1 et 2, jumeau testé) et la mémoire `migrations-je-les-applique` (essai à sec). Effet : 0191 écrite, son jumeau
  fabriqué par `scripts/sql-nu.mjs` et prouvé par `migrations-jumelles-e2e`, **rien appliqué**.
- **MCP `cerveau`, `chercher` et `lire`** (« workflow d'erreur doit-il être publié ? ») : a remonté le brief de la sauvegarde
  (`c4-n8n-sauvegarde.md:63`, refus « has no published version » déjà vu), `fiches-depots.md` fiche 4 (la doc : « n'a pas besoin d'être
  publié ») et `fiche-methode-n8n.md` fiche 9 (le code 2.45.6 lance la **version publiée** hors du manuel). Effet : la doc et le code se
  contredisent, donc la publication n'est **pas prouvée par la documentation** et presti-erreurs reste inactif. La seule question est
  posée à Benj (`.orchestre/en-cours/032-033.question.md`).
- **Fiche `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 5 et 9, fiche 2, fiche 3, §3.5, §5 q. 4) : un seul
  workflow d'erreur pour toute la flotte, posé dans les réglages de chacun ; il ne part jamais en manuel. Recommandation : « succès non
  sauvés, échecs gardés 7 jours, purge à 168 h ». Effet : `saveDataSuccessExecution: none` et `saveDataErrorExecution: all` sur les
  six ; la durée des échecs est la purge de l'instance (aucun réglage par workflow ne la borne), à demander à Benj.
- **Audit `.orchestre/preuves/032-029/rapport.md`** (S-1, S-2, S-M2, S-M3, B-1, B-2, D-1, D-M1, « Ce qu'il faut pour publier en
  simulation ») : la liste exacte des réglages et des juges à changer ensemble, et le droit `artisans.notifications` pour `n8n_lecture`
  (S-M2), versé dans 0191.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference` (patterns, functions), `get_workflow_best_practices` (`notification` : un seul
  nœud qui compose le message, Slack en texte), `search_nodes` (errorTrigger 1, slack 2.7, code 2), `list_credentials` (« Slack account
  2 » `lR0GZ7FGXI3FCAF8` existe déjà, celui des workflows de sauvegarde et de démo : réutilisé, aucun identifiant créé),
  `validate_workflow`, `create_workflow_from_code`, `update_workflow` (réglages seulement), `get_workflow_details` (les sept exports).
- **Vidéos déjà analysées** : `plans/analyse-videos.md:144` (« alerte e-mail à Benj en cas d'échec d'un workflow », source du rang 26).
  Effet : presti-erreurs est jugé sur ce qu'il fait (une alerte à Benj), pas sur sa seule présence.
- **Briefs** `plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md` (colonnes l.61-64, question 1 de `032-014/resume.md:108-111`) et
  migration `0190_demandes_demo.sql` (modèle : en-tête, RLS, gardes 0138, `anon` retiré, bloc `n8n_lecture` conditionnel).
- **Non chargés, et pourquoi** : skills de design et de vidéo (sans objet) ; `security-review` et `presti-audit-attaque` : l'audit
  distinct de ces correctifs revient à un autre agent (règle « les auditeurs sont distincts de celui qui corrige »).

# 032-033 — les workflows du soir, publiables en simulation (après l'audit 032-029)

Fait le 02/11/2026 au soir par Claude Code (Opus 5.5), hôte d'agents Oracle, `/home/usine/Documents/presti`. Aucune publication, aucune
activation, aucun identifiant créé ni modifié, aucune exécution supprimée, aucune lecture ni écriture de la base, aucune migration
appliquée. Tout reste **inactif** (`active: false`, `activeVersionId: null` sur les sept, relu par `get_workflow_details`).

## État : bloqué sur un seul point (question à Benj)

**n8n refuse de désigner un workflow d'erreur non publié.** `update_workflow` (setWorkflowSettings `errorWorkflow: AQeHiC58UgbMR4Kr`)
sur presti-suivi-artisan a rendu : « Error workflow 'presti-erreurs' (AQeHiC58UgbMR4Kr) has no published version, so n8n cannot run it
when this workflow fails. Publish that workflow first (publish_workflow), then set it as the error workflow. » La tâche dit : s'il faut
le publier, le dire à Benj et le laisser inactif. C'est fait, la question est dans `.orchestre/en-cours/032-033.question.md`. Les juges
exigent déjà `errorWorkflow = AQeHiC58UgbMR4Kr`. `verifier` est donc **rouge sur ce seul réglage** (`verifier.log`) et **vert sur
une racine factice** où il est posé (`rejeu-*.log`). Une fois le geste de Benj fait, il reste quatre commandes (question, option 1).

## presti-erreurs — `AQeHiC58UgbMR4Kr` (créé, inactif, jamais publié)

Error Trigger « Échec d un workflow » → Code « Message sans donnée » → Slack « Alerte #presti-auto » (`Slack account 2`,
`lR0GZ7FGXI3FCAF8`, canal `presti-auto` par son nom, `includeLinkToWorkflow: false`, notes `pied: aucun`). Le message ne porte que le
nom du workflow (s'il a la forme `presti-…`), le nom du nœud fautif (lettres, chiffres et ponctuation simple, 60 caractères au plus),
le numéro d'exécution (chiffres seuls) et l'heure de Paris. Jamais `execution.error` (message, pile), `execution.url`, `trigger.error`,
ni rien de ce que le passage a lu. Code : `message-sans-donnee.js` ; SDK : `presti-erreurs.sdk.js`. Essayé hors ligne sur une erreur
fictive contenant une adresse et un e-mail : ils ne sortent pas (« presti-detecteurs a échoué au nœud « Lire factures » (exécution
412, 02/11/2026 21:13, heure de Paris)… »). Réglages : `saveDataSuccessExecution: none`, `saveDataErrorExecution: all`,
`executionTimeout: 60`, `Europe/Paris`, sans `errorWorkflow` (pas de boucle). Export : `presti-erreurs.workflow.json`, versionId
`feb50b6a-9cb2-48b8-8143-ca50845c06cd`. `n8n-specs-qa` sur cet export : **OK** (R1 inactif, R3 branche interne, R4 pied déclaré, R6).
Il ne se teste pas à la main : un Error Trigger ne part que sur l'échec d'une exécution de production (fiche méthode, point 5).

## Réglages posés, workflow par workflow (relus en ligne, puis reposés dans les exports)

| Workflow | id | Avant | Après | nodes / connections | versionId |
|---|---|---|---|---|---|
| presti-suivi-artisan | `2HsfV00lGSX1KGY1` | succès `none` | + `saveDataErrorExecution: all` | identiques (sha `b61a5f27…`) | `8cd9a2dc…` inchangé |
| presti-briefing-matin | `xPIDCvkp8Gk08A2E` | rien | succès `none`, échecs `all` | identiques (`8a9d3abc…`) | `d19fec51…` inchangé |
| presti-detecteurs | `J8pduyxn9seR8Z9t` | rien | succès `none`, échecs `all` | identiques (`0f971278…`) | `9106bdf6…` inchangé |
| presti-sauvegarde | `16Gbnw1jg1JmFbfV` | succès `all`, échecs `all`, délai 1200 | succès `none` | identiques (`2846b15e…`) | `90fa1b61…` inchangé |
| presti-garde-sauvegarde | `2uovL6sfTnINC3ka` | succès `all`, échecs `all`, délai 600 | succès `none` | identiques (`1b6176af…`) | `f68c4b7e…` inchangé |
| presti-demande-demo | `4R2wS9374GUxb63F` | succès `none` | + `saveDataErrorExecution: all` | identiques (`bc3b2f73…`) | `8e9ec1e2…` inchangé |

`errorWorkflow` : **non posé sur les six** (refus de n8n, plus haut). Les nœuds n'ont pas bougé : les empreintes des nœuds Code des juges
sont identiques (juges verts). **Durée des échecs** : aucun réglage par workflow ne la borne (`saveDataErrorExecution` vaut `all` ou
`none`, rien d'autre ; le délai d'exécution n'est pas une durée de conservation). La borne est la purge de l'instance
(`EXECUTIONS_DATA_PRUNE`, `EXECUTIONS_DATA_MAX_AGE`, défaut 336 h), à régler par Benj (plus bas).

**Exports reposés** par `get_workflow_details` après modification, avec `reposer-exports.mjs`. Le script relit les réponses du MCP
dans le journal du harnais, ou dans son fichier `tool-results` pour les détecteurs (83 672 caractères). Il les recopie sans
retouche : il ôte `scopes` (les droits de l'utilisateur du MCP), ajoute `exporte_le` et `source`, compare `nodes` et `connections`
en sha256. Fichiers : `032-014/presti-suivi-artisan.workflow.json`, `032-013/presti-briefing-matin.workflow.json`,
`032-019/presti-detecteurs.workflow.json`, `032-023/presti-sauvegarde.workflow.json`, `032-023/presti-garde-sauvegarde.workflow.json`,
`032-026/presti-demande-demo.workflow.json`, `032-033/presti-erreurs.workflow.json`.

## Listes blanches des juges ouvertes, et leurs mutants

Chaque juge prend la même liste : `executionOrder: v1`, `availableInMCP: true`, `timezone: Europe/Paris`,
`saveDataSuccessExecution: none`, `saveDataErrorExecution: all`, `errorWorkflow: AQeHiC58UgbMR4Kr` (`PRESTI_ERREURS`). Exactement ces
clés et ces valeurs (la sauvegarde garde aussi son `executionTimeout` borné). Toute autre valeur rougit.

| Juge | Changement | Mutants neufs ou retournés (rouges sur la racine factice) |
|---|---|---|
| `scripts/suivi-artisan-qa.mjs` | `REGLAGES_ATTENDUS` (l.81-82) | succès `all` ; échecs `none` ; errorWorkflow retiré ; errorWorkflow en expression (plus « inconnu branché » et « réglage ôté », gardés) → **63/63** |
| `scripts/briefing-n8n-qa.mjs` | `REGLAGES` (l.91-92) et le message de clés | errorWorkflow vers un autre ; retiré ; succès `all` ; succès ôté ; échecs `none` (5/5 rouges, raison citée dans `rejeu-briefing-n8n-qa.log`) |
| `scripts/detecteurs-n8n-qa.mjs` | `REGLAGES` + `CLES_REGLAGES` (l.131-133), contrôle de valeur dans `structure` | autre errorWorkflow ; retiré ; succès `all` ; succès ôté ; échecs `none` ; `saveManualExecutions` neuf (6/6) |
| `scripts/sauvegarde-n8n-qa.mjs` | `REGLAGES` (l.41-42) ; le mutant « succès non gardés » est retourné en « succès `all` » | autre errorWorkflow ; retiré ; succès `all` ; échecs `none`, sur les deux workflows (8/8) |
| `scripts/demandes-demo-qa.mjs` | `REGLAGES` (l.448-449) | succès `all` (déjà là) ; échecs `none` ; errorWorkflow retiré ; errorWorkflow vers un autre (4/4) |

`scripts/n8n-specs-qa.mjs` est **interdit** à cette tâche : pas modifié. Il ne juge par défaut que les détecteurs, verts par leur
branche interne (R3).

## Sortie des juges

- **Sur les exports réels** (`verifier.log`) : rouges sur `errorWorkflow` absent seulement. Exemple du suivi : 63 mutants « rouges,
  mais pas pour la raison attendue (settings hors liste blanche…) ». Le témoin rougit sur ce réglage, et c'est ce qu'on attend tant
  que Benj n'a pas tranché.
- **Sur la racine factice** `/tmp/racine-032-033` (`rejeu-avec-errorworkflow.mjs`). Les cinq juges y sont copiés, et les exports
  reposés y portent en plus `errorWorkflow: AQeHiC58UgbMR4Kr`. Sortie : suivi **OK** (63/63 mutants), briefing **OK**, détecteurs
  **OK** (178 s), sauvegarde **VERTE**, demandes-demo **vert** (`rejeu-*.log`).
- `migrations-jumelles-e2e` : **vert**, dont `_A_COLLER_sql_editor_0191_NU.sql` (chaînes, blocs `$…$`, parenthèses ; ⊂ 0191).

## Migration 0191_suivi_artisan_envois — préparée, NON APPLIQUÉE

`supabase/migrations/0191_suivi_artisan_envois.sql`. En tête : « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj ».
Retour arrière : `drop table … cascade` et `revoke select (notifications) … from n8n_lecture`. Colonnes du brief seulement :
`cle text primary key`, `artisan_id uuid not null references artisans(id) on delete cascade`, `etape` (premiers_pas | bilan_j14 |
bilan_j30), `envoye_le timestamptz not null default now()`. Une contrainte impose la forme de la clé : `cle = 'suivi:' ||
artisan_id || ':' || etape`. Un index `(artisan_id, envoye_le desc)`. RLS active, aucune politique pour un jeton de navigateur.
`revoke all … from public, anon, authenticated`. Les quatre gardes de session de 0138.

**Droits pour `n8n_lecture`** (bloc conditionnel, comme 0190 ; un avis si 0189 manque) : `select (cle, artisan_id, etape, envoye_le)`
sur la table et sa politique `n8n_lecture_select`. En plus, `select (notifications)` sur `artisans`, que « Lire comptes » lit déjà
(S-M2 ; un jsonb de booléens).

Jumeau : `_A_COLLER_sql_editor_0191_NU.sql`, fabriqué par `node scripts/sql-nu.mjs … --controle .orchestre/preuves/032-033/controle-0191.sql`.
Le contrôle après collage ne fait que lire : table, RLS, politiques, droits anon/authenticated (attendu : aucun), colonnes de
`n8n_lecture`, `artisans.notifications`, nombre de lignes.

**Pas d'essai à sec local** : le crochet `garde-agents-orca` refuse toute commande qui nomme Postgres sur l'hôte d'agents. L'essai à
sec (bloc DO qui joue le jumeau puis `RAISE EXCEPTION`) revient à la session principale, au « go » de Benj.

## Ce qui reste à Benj

1. **Trancher la question** (`.orchestre/en-cours/032-033.question.md`) : publier presti-erreurs seul (recommandé). Il ne démarre rien
   de lui-même, et les six restent inactifs. Ensuite, quatre commandes, et `verifier` vert.
2. **Purge de l'instance n8n d'Oracle** (`/opt/n8n-complet`, interdit aux agents) : `EXECUTIONS_DATA_PRUNE=true`,
   `EXECUTIONS_DATA_MAX_AGE=168` (7 jours, fiche méthode §5 q. 4). Sans ce réglage, un échec garde ses données réelles 14 jours. Le cas
   prévisible : presti-suivi-artisan publié avant 0191 échouerait chaque matin après avoir lu les comptes (S-2).
3. **Supprimer les exécutions 333 et 334 de presti-detecteurs** (vraies données) : geste de Benj, non fait.
4. **Le « go » de 0191**, puis une lecture réelle du registre avant de publier le suivi.
5. Session principale : la section « Lectures de n8n sur le serveur Oracle » du registre des traitements (P-1 de l'audit). Exécutions
   réussies : rien ; en erreur : la purge choisie au point 2.
6. **Un audit distinct de ces correctifs** (réglages, juges, empreintes reposées), puis le « go » de publication en simulation.

## Risques et points à valider

- Une fois `errorWorkflow` posé, il passe devant l'Error Trigger interne de presti-detecteurs, presti-sauvegarde et
  presti-garde-sauvegarde (description du MCP `update_workflow`). Leurs « Alerte Slack (erreur du workflow) » internes ne partiront
  plus ; presti-erreurs envoie la même information (nœud, numéro), sans le lien du brief. Les nœuds sont gardés tels quels : la tâche
  dit « rien d'autre ne change ».
- Les succès de la sauvegarde ne sont plus gardés. Le bilan (tables, lignes, durée) ne reste que dans le battement et dans une alerte
  en cas d'échec. Le brief de 032-023 voulait le garder (« des comptes seulement ») ; la tâche demande `none` sur chacun.
- S-M3 (réserver la clé avant l'envoi) n'est pas dans 0191 : il faudrait une colonne que le brief ne prévoit pas. À trancher avec le
  lot d'envoi.
- `availableInMCP: true` reste sur les sept (S-F1, B-M1, D-F3) : hors du périmètre de la tâche.
