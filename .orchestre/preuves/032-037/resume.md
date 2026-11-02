## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« n8n, workflow, erreur : désigner presti-erreurs comme workflow d'erreur sur six workflows inactifs ») :
  n'a rendu que la règle des outils (`architecture-outils.md`) ; effet : n8n-first respecté (réglage posé par le MCP, aucun code d'app),
  rien d'actif, aucun identifiant touché.
- **MCP `cerveau`, `chercher`** (« workflow d'erreur n8n presti-erreurs errorWorkflow ») : a remonté les briefs
  (`c4-n8n-sauvegarde.md`, refus « has no published version » ; `c4-n8n-detecteurs.md`, « un `errorWorkflow` rougit » avant le
  changement des juges) et `fiche-methode-n8n.md` fiche 2 (un workflow d'erreur ne part jamais en manuel). Effet : la raison du
  blocage de 032-033 est confirmée et il n'y a pas de test manuel à tenter.
- **MCP `n8n-oracle`** : `get_workflow_details` (presti-erreurs : `active: true`, `activeVersionId: feb50b6a-9cb2-48b8-8143-ca50845c06cd`
  avant d'agir ; les six relus après), `update_workflow` (`setWorkflowSettings { errorWorkflow }`, une opération par workflow, réponse
  citée plus bas). Effet : le réglage refusé par n8n en 032-033 est posé et relu en ligne.
- **Preuve de 032-033** (`.orchestre/preuves/032-033/resume.md`, `.en-cours/032-033.question.md` option 1, `reposer-exports.mjs`) :
  la liste des six, l'ordre des gestes, le script d'export. Effet : copie du script dans `032-037/reposer-exports.mjs` avec
  `presti-erreurs` retiré des cibles (publié, hors périmètre ; l'original aurait refusé son état publié et réécrit un fichier interdit).
- **Non chargés** : skills de design, de vidéo, `security-review`, `presti-audit-attaque` (sans objet : un réglage de workflow, aucun
  code, aucune donnée ; l'audit distinct reste à un autre agent).

# 032-037 — le workflow d'erreur désigné sur les six workflows du soir

Fait le 02/11/2026 par Claude Code (hôte d'agents Oracle). Aucune publication, aucune activation, aucun identifiant n8n, aucun nœud,
aucun juge, aucune base, aucune migration touchés. `presti-erreurs` lu seulement.

## 1. presti-erreurs est bien publié

`get_workflow_details AQeHiC58UgbMR4Kr` : `active: true`, `activeVersionId: feb50b6a-9cb2-48b8-8143-ca50845c06cd`,
`versionId` identique, `activeVersion.sameAsDraft: true`, 4 nœuds (Error Trigger, Code, Slack, note). Pas touché.

## 2. Le réglage, workflow par workflow (réponse de `update_workflow`, puis `get_workflow_details` relu)

Une seule opération par appel : `setWorkflowSettings { errorWorkflow: 'AQeHiC58UgbMR4Kr' }`. Chaque réponse : `appliedOperations: 1`,
`autoAssignedCredentials: []`, aucune erreur (les deux avertissements « TOP_LEVEL_ITEMS_OVER_CEILING » de la sauvegarde et de sa
garde sont signalés `preExisting: true` : rien à voir avec ce réglage).

| Workflow | id | `update_workflow` | relu : `active` / `activeVersionId` | `errorWorkflow` relu | versionId |
|---|---|---|---|---|---|
| presti-suivi-artisan | `2HsfV00lGSX1KGY1` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `8cd9a2dc…` inchangé |
| presti-briefing-matin | `xPIDCvkp8Gk08A2E` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `d19fec51…` inchangé |
| presti-detecteurs | `J8pduyxn9seR8Z9t` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `9106bdf6…` inchangé |
| presti-sauvegarde | `16Gbnw1jg1JmFbfV` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `90fa1b61…` inchangé |
| presti-garde-sauvegarde | `2uovL6sfTnINC3ka` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `f68c4b7e…` inchangé |
| presti-demande-demo | `4R2wS9374GUxb63F` | 1 opération appliquée | `false` / `null` | `AQeHiC58UgbMR4Kr` | `8e9ec1e2…` inchangé |

Les `settings` relus ne diffèrent d'avant que par cette clé (et la valeur `executionTimeout` de la sauvegarde et de sa garde, gardée).
Pour les détecteurs, la réponse (83 707 caractères) est dans le fichier `tool-results` du harnais : lue par `jq` (id, active,
activeVersionId, versionId, settings), et recopiée par le script.

## 3. Exports reposés (`reposer-exports.log`)

`node .orchestre/preuves/032-037/reposer-exports.mjs <journal de session> <fichier tool-results des détecteurs>` : code 0. Pour les six :
`nodes` et `connections` **identiques** en sha256 à l'export d'avant (suivi `b61a5f27…`, briefing `8a9d3abc…`, détecteurs `0f971278…`,
sauvegarde `2846b15e…`, garde `1b6176af…`, démo `bc3b2f73…`), `versionId` inchangé, `active: false`, `activeVersionId: null`. La seule
différence de `settings` est `"errorWorkflow":"AQeHiC58UgbMR4Kr"`. Les empreintes des nœuds Code ne bougent donc pas.
Fichiers : `032-014/presti-suivi-artisan.workflow.json`, `032-013/presti-briefing-matin.workflow.json`,
`032-019/presti-detecteurs.workflow.json`, `032-023/presti-sauvegarde.workflow.json`, `032-023/presti-garde-sauvegarde.workflow.json`,
`032-026/presti-demande-demo.workflow.json`.

## 4. Sortie des juges et de la vérification (`verifier.log`, code 1)

Sur les exports réels reposés (ceux qui portent `errorWorkflow`) :

| Juge | Résultat | Ligne de `verifier.log` |
|---|---|---|
| `suivi-artisan-qa.mjs` | **OK** (63/63 mutants rouges pour la raison attendue, empreintes de 8 nœuds Code inchangées) | l.17 |
| `briefing-n8n-qa.mjs` | **OK** (19 nœuds, 53 mutants, 49 s) | l.137 |
| `detecteurs-n8n-qa.mjs` | **OK** (41 nœuds, 100 mutants, 278 s, 11 empreintes inchangées) | l.354 |
| `sauvegarde-n8n-qa.mjs` | **VERTE** | l.492 |
| `demandes-demo-qa.mjs` | **vert** | l.503 |
| `n8n-specs-qa.mjs` | **ÉCHEC** : 2 mutants sur 33 laissent la garde verte | l.514-517, 577-578 |

**Le seul rouge, et pourquoi.** `n8n-specs-qa` juge `presti-detecteurs` (R3, `scripts/n8n-specs-qa.mjs:82-88`) : une branche d'erreur
est **soit** un Error Trigger interne relié, **soit** `settings.errorWorkflow` = identifiant nu. Ses deux mutants des lignes 174-175
(« branche d’erreur ôtée (rang 26) » et « Error Trigger relié à rien ») ne retirent que la branche **interne** et supposent que
`settings.errorWorkflow` est absent. Maintenant que le réglage demandé par cette tâche est posé, la branche externe reste là : R3 est
satisfaite, le mutant ne rougit plus (« aucun manquement »). Le juge n'est pas faux, ses deux mutants sont périmés par le réglage
même qu'on vient de poser. Les deux autres mutants R3 (expression, l.519 ; branche ôtée du fictif, l.575) rougissent toujours.

Ce n'est pas réparable dans mon périmètre : `interdit` nomme « les juges (scripts/**) » et la tâche ne permet pas de défaire
`errorWorkflow`. Le correctif est de deux mots : ajouter `; delete w.settings.errorWorkflow` à chacun des deux mutants (l.174 et l.175).
Question posée : `.orchestre/en-cours/032-037.question.md`. Tâche laissée dans `en-cours/` ; `verifier` reste rouge sur ce seul point.

Dernier critère du `verifier` (≥ 3 puces dans « Ressources utilisées ») : rempli (4 puces + non chargés), mais jamais atteint, la chaîne
`&&` s'arrête au juge rouge.

## À savoir (déjà dit en 032-033, rien de neuf)

- Une fois `errorWorkflow` posé, il passe devant l'Error Trigger interne de presti-detecteurs, presti-sauvegarde et presti-garde-sauvegarde ;
  leurs alertes Slack internes ne partiront plus, presti-erreurs envoie la même information (nœud, numéro) sans le lien. Nœuds
  gardés tels quels (interdit à cette tâche).
- Toujours à Benj : la purge de l'instance (`EXECUTIONS_DATA_MAX_AGE`), les exécutions 333 et 334 des détecteurs, le « go » de 0191,
  l'audit distinct, puis le « go » de publication en simulation. Les six restent **inactifs**.
