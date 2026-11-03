## Ressources utilisées

- **MCP `cerveau` (`regles_pour`)** : appelé avant publier/activer ; il n'a rendu que la règle des comptes non Presti (sans objet ici). Rien de plus n'a été trouvé pour cette action.
- **MCP `n8n-oracle`** : source de vérité de l'état réel. `search_workflows`, `get_workflow_details` (relire chaque réglage avant d'écrire), `update_workflow`
  (uniquement `setWorkflowSettings` des `callerIds`), `publish_workflow`, `execute_workflow` (manuel), `get_workflow_execution`, `search_workflow_executions`,
  `list_credentials` (a révélé qu'aucun identifiant Anthropic n'existe : cause du blocage).
- **`plans/011-cadrage-01-11/p6-signature/mise-en-service.md` (étapes 6 et 7)** : l'ordre de publication et la liste des `callerIds` à ouvrir.
- **`runbook.md`** : le retour arrière (dépublier, parents d'abord).
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 2 et 7) : un parent appelle la version publiée de l'enfant ; n8n l'a confirmé en refusant de publier les parents.
- Non chargés, faute de sujet : les skills de design et de vidéo, `get_workflow_sdk_reference` (aucun workflow construit ici).

## Résumé

Preuve complète : `plans/011-cadrage-01-11/p6-signature/journal-mise-en-service.md`.

- `callerIds` ouverts sur les 7 socles (relus dans la réponse de n8n).
- Publiés : 13 socles, 11 spécialistes de lots, 4 chefs (devis, après, opérations, direction), 6 parents planifiés (dont 2 déjà actifs avant la tâche).
- Non publiés, bloqués : `lib-rediger-message`, `lib-lire-photo` (identifiant `anthropicApi` absent, interdit de le créer), donc `presti-dep-accueil`, `-suivi`, `-facturation` et `presti-cerveau`.
- Premiers passages relus : 6 parents en manuel, 6 bancs d'essai en manuel, tous « succès » sauf l'exécution 750 (chef non publié, attendue).
- Réserves écrites : `presti-boite` manuel peu probant ; succès planifiés non conservés ; treize socles sans passage relu.
- Rien envoyé, rien écrit en base, porte simulation intacte ; aucun identifiant créé.
