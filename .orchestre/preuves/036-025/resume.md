## Ressources utilisées

- **Inventaire de la session** (hôte d'agents d'Oracle, sans écran) : outil Skill ; MCP `cerveau` (lecture seule, copie du vault du 02/11) ; MCP `n8n-oracle` (dans le périmètre : `n8n-oracle:lib-`, `n8n-oracle:presti-`). Les connecteurs Supabase, Slack et les autres n'ont pas servi : ils sont hors du périmètre. Les skills de design et de vidéo ne servent pas ce lot (aucune page, aucune vidéo).
- **Skill `reseau-neuronal`** : il a fixé l'ordre de travail : `regles_pour` avant de publier, puis `chercher` et `lire`, sans rien écrire dans le vault.
- **MCP `cerveau`** :
  - `regles_pour` « publier des workflows n8n en simulation… » a rendu `memoire-presti/decisions-benj-0311-apres-midi.md` (« Active toutes les automatisations en les testant », dans l'ordre de `mise-en-service.md`). Cette règle m'a confirmé de publier et de tester, sans lever aucune porte.
  - `chercher` « mise en service n8n… » m'a mené au journal de 036-024, à `mise-en-service.md` et aux fiches `fiches-depots.md` (fiche 4 : « un enfant qui contient des erreurs ne peut pas être déclenché ») et `fiche-methode-n8n.md`.
  - `lire` de la fiche 9 de `fiche-methode-n8n.md` (« Version appelée : le brouillon en exécution manuelle, la version publiée sinon ») explique pourquoi `lib-rediger-message`, dépublié, a quand même tourné sous le banc manuel 818 (exécution 820). D'où la note du journal : un banc manuel juge le brouillon des enfants, pas leur version publiée.
- **MCP `n8n-oracle`** :
  - `list_credentials` a trouvé l'identifiant ; `get_workflow_details` m'a servi à relire chaque workflow avant de le toucher ;
  - `update_workflow` a fait un seul geste par `lib-*`, `setNodeCredential` ;
  - `publish_workflow` et `unpublish_workflow` pour publier puis dépublier ; `execute_workflow` (mode manuel) pour les six bancs ;
  - `get_workflow_execution` (relu nœud par nœud) et `search_workflow_executions` (erreurs depuis 16 h 14 UTC) ;
  - `get_workflow_sdk_reference` et `get_workflow_best_practices` n'ont pas été appelés : ils servent à construire un workflow, et aucun n'a été construit ni modifié au-delà de l'affectation de l'identifiant.
- **Sources du dépôt** :
  - `plans/011-cadrage-01-11/p6-signature/journal-mise-en-service.md` (036-024), `mise-en-service.md` (étapes 6 et 7) et `runbook.md` (§ 1.f : retour arrière en dépubliant, enfants avant parents à la remise) ;
  - les exports `.orchestre/preuves/036-001`, `036-004`, `036-005` et `035-005`. Leur `versionId` est identique à celui en ligne pour les quatre chefs ; ils ont servi à relire le code du Cerveau (arrêt sur interrupteur absent), les enfants appelés par chaque chef et la structure des bancs, sans recharger 30 nœuds par workflow.

## Ce qui a été fait (détail : `etat.json` et la section « 036-025 » du journal)

1. Identifiant trouvé : « Anthropic account », `anthropicApi`, `hZsu1Oq5gUfaa2jB`. Il a été affecté aux deux nœuds Haiku, et rien d'autre n'a changé.
2. Les six workflows ont été publiés dans l'ordre imposé, entre 16 h 33 et 16 h 34 UTC.
3. Bancs :
   - argent (775), cerveau/accueil (787) et suivi (797) : en échec. Le modèle épuise son plafond de sortie (700 ou 300 jetons) sans rendre de texte, d'où « The AI model returned an empty response to the Structured Output Parser » ;
   - socle (805) et métier (811) : verts, relus nœud par nœud ;
   - relance (818) : vert sur les gestes et le rapport, arrêté à la rédaction.
4. `lib-rediger-message` a échoué deux fois (784, 802), puis une troisième (820). La chaîne a été dépubliée, parents d'abord : `presti-cerveau`, `presti-dep-suivi`, `presti-dep-facturation`, puis `lib-rediger-message`. `lib-lire-photo` (un seul échec) et `presti-dep-accueil` restent publiés, mais ne peuvent être appelés que par un banc manuel.
5. Aucun workflow actif planifié n'a d'exécution en erreur depuis 16 h 14 UTC. Le « appel en erreur: 1 » de `presti-boite` (696) est une étiquette de bilan fausse, pas une panne.
6. La porte « simulation » n'a été levée nulle part, rien n'a été envoyé, aucun identifiant n'a été créé ni modifié, aucun `gabarit-*`, `client-*`, `hermes-*` ni `reseau-neuronal-*` n'a été touché, ni `presti-detecteurs`, ni `presti-briefing-matin`.

## Ce qui relancera la chaîne (à trancher, ce n'est pas un geste de cette tâche)

La panne vient du nœud « Claude Haiku 5.5 » des deux `lib-*` : `completionTokens` égale exactement `maxTokensToSample` (700 et 300), et le texte est vide. La tâche interdisait de toucher au modèle et aux paramètres de ce nœud, donc rien n'a été corrigé. Deux voies, chacune touche au cerveau (domaine de Claude Code, et une décision) :

1. relever `maxTokensToSample` (par exemple à 2 000) ;
2. couper la réflexion du modèle si le nœud l'active par défaut.

Ensuite, rejouer une fois `presti-banc-argent`, puis republier dans l'ordre : `lib-rediger-message`, `presti-dep-suivi`, `presti-dep-facturation`, `presti-cerveau`.

Pour `lib-lire-photo`, il reste aussi à décider si le modèle doit recevoir l'image. Aujourd'hui, il ne reçoit que sa référence (`passthroughBinaryImages: false`), donc il « décrit » une photo qu'il ne voit pas.
