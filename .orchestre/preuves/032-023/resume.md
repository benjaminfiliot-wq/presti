# 032-023 — la sauvegarde planifiée et sa garde, dans n8n (chantier 4, lot L8) : résumé de preuve

Fait le 02/11/2026 au soir par Claude Code, sur l'hôte d'agents Oracle (`/home/usine/Documents/presti`), session lancée par Orca.

## Ressources utilisées

- **MCP `cerveau`** — `regles_pour` (« sauvegarde, n8n, workflow planifié inactif, alerte Slack ») a rendu `regles-presti/architecture-outils.md` (toute automatisation dans n8n, Claude Code écrit les workflows par le MCP `n8n-oracle`) et l'ADR-001 : d'où deux workflows n8n, rien dans le backend. `chercher` (« sauvegarde clé privée restaurer alerte Slack presti-auto battement ») a rendu `memoire-presti/slack-comptes-rendus-2610` (`#presti-auto` est un canal privé, zéro donnée de prospect : le message d'alerte ne porte que des comptes et des noms de fichier, l'application Slack doit être invitée au canal) et `vault/wiki/concepts/Sauvegardes - restaurer et garder la cle a part` (la clé privée reste hors dépôt et hors hôte : le brief la garde dans `coffre-presti`).
- **MCP `n8n-oracle`** — `get_workflow_sdk_reference` (syntaxe du SDK : pas de flèche ni de destructuration dans le code du graphe, `ifElse`, `.onTrue/.onFalse`, `expr`, échappement des `\` dans les `jsCode`), `get_workflow_best_practices` (scheduling : fuseau posé sur le workflow, éviter le chevauchement par un délai plus court que l'intervalle ; monitoring : sans fiche, connaissance générale), `search_nodes` et `get_node_types` (SSH 1 `command/execute`, Slack 2.7 `message/post`, Schedule Trigger 1.4, Error Trigger 1, If 2.2), `list_credentials` (« Slack account 2 » existe ; aucun identifiant SSH : donc aucun posé), `search_workflows`, `validate_workflow`, `create_workflow_from_code`, `update_workflow` (réglages : fuseau, délai), `prepare_workflow_pin_data` (a révélé que les nœuds SSH sans identifiant ne sont pas épinglés d'office : j'ai épinglé les huit moi-même), `test_workflow`, `get_workflow_execution` (`includeData`), `get_workflow_details` (l'export).
- **Plan du chantier 4** (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §4.1, §4.3 (battement : plus de 26 h sans signe), §14 ligne 3, §15 points 3 et 4, règles communes du §0 bis : horaires 3 h 40 et 4 h, 14 jours gardés, nœud SSH (le nœud « Execute Command » n'existe pas sur ce n8n), alerte `#presti-auto`.
- **Preuve `032-020` et `scripts/sauvegarde.mjs`** (non modifié) : les motifs de sortie que les nœuds Code lisent (`✅ … N tables, L lignes, C comptes, K Ko, S s` ; `▶ Vérification de …` ; `manifeste version … : N tables …` ; `✅ archive relue, comptes égaux`), les codes de sortie (0, 1, 2) et `--dernier --dossier`.
- **Gabarits des juges déjà livrés** : `scripts/detecteurs-n8n-qa.mjs` (empreintes SHA-256, rejeu en processus `node --permission` dans un contexte vm vide, mutants) et `scripts/n8n-specs-qa.mjs` (règles communes R1 à R7), `.orchestre/preuves/032-014/` (forme de l'export et de `resume.md`) ; `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` point 5 (workflow d'erreur : posé dans les réglages de chaque workflow, ne part jamais sur une exécution manuelle).
- Aucun skill de design ni de vidéo : la tâche n'a ni page ni vidéo. Aucun `security-review` formel : la revue de sécurité est dans le juge (R2 secrets et identifiants, R6 commandes exactes, R12 code sans réseau ni disque).

## Les deux workflows

| Workflow | Identifiant | État | Horaire | Nœuds |
|---|---|---|---|---|
| `presti-sauvegarde` | `16Gbnw1jg1JmFbfV` | `active: false`, jamais publié | 3 h 40, Europe/Paris, délai 1 200 s | 14 |
| `presti-garde-sauvegarde` | `2uovL6sfTnINC3ka` | `active: false`, jamais publié | 4 h, Europe/Paris, délai 600 s | 12 |

Détail des nœuds, des commandes et des défauts : `plans/011-cadrage-01-11/briefs/c4-n8n-sauvegarde.md`. Exports : `presti-sauvegarde.workflow.json`, `presti-garde-sauvegarde.workflow.json`.

- **Sauvegarde** : SSH `flock -n -E 75 … timeout -k 30 900 node scripts/sauvegarde.mjs --dossier /home/usine/sauvegardes-presti`, puis la relecture `--verifier --dernier --dossier …`, un bilan (tables, lignes, comptes, taille, durée), un battement par passage, la purge à 14 jours seulement si tout est vert, et une alerte Slack `#presti-auto` en échec seulement.
- **Garde** : première ligne (manifeste) des trois dernières archives, relecture, battement de la sauvegarde ; alerte si aucune archive, pas d'archive **du jour de Paris**, relecture rouge ou portée sur une autre archive, nombre de tables **inférieur** à l'archive précédente, battement absent ou de plus de 26 h ; son propre battement à chaque passage.
- **Aucun identifiant créé ni modifié** : les huit nœuds SSH n'ont pas de `credentials` ; les quatre nœuds Slack (deux par workflow : l’alerte d’échec et l’alerte d’erreur) citent l'identifiant existant « Slack account 2 ». Aucune publication, aucune exécution réelle de la sauvegarde, aucune donnée lue.

## L'essai sur données épinglées

Détail dans `essai-n8n.json`. Huit essais `test_workflow` (exécutions 338 à 345), SSH, Slack et déclencheur épinglés, données fictives ; les nœuds Code et If tournent pour de vrai dans n8n :

| Workflow | Réussite | Échec / verrou | Relecture rouge | Autre |
|---|---|---|---|---|
| `presti-sauvegarde` | 338 : bilan `ok:true`, purge faite, aucune alerte | 339 (code 1), 341 (code 75, « verrou ») : alerte Slack, pas de purge | 340 : alerte, raison `table_fictive…` | — |
| `presti-garde-sauvegarde` | 342 : `ok:true`, 3 tables contre 3, battement 16,7 h | 343 archive absente : alerte | 344 : alerte | 345 tables en baisse (2 contre 3) : alerte |

## Le juge `scripts/sauvegarde-n8n-qa.mjs`

Hors ligne (aucun réseau, base ni modèle), 3 s environ. Il relit les deux exports et :

1. juge la **structure** contre une spécification écrite dans le script : inactif et jamais publié, aucun secret, aucun identifiant SSH, seul l'identifiant Slack existant, horaire et fuseau exacts, commandes SSH et dossiers de travail **exacts**, délai borné, réglages en liste blanche (pas d'`errorWorkflow`), graphe **exact**, alerte atteignable seulement depuis la sortie « échec » ou l'Error Trigger, battement avant la décision ;
2. épingle l'**empreinte** SHA-256 du code de chaque nœud Code (5 nœuds) ;
3. **rejoue** ce code dans un processus `node --permission` (ni disque, ni processus, ni réseau) dans un contexte vm vide, sur **47 cas fictifs** (22 pour la sauvegarde, 25 pour la garde : réussite, échec, verrou, délai, préconditions, SSH en panne, secret long dans une sortie, relecture rouge, contradictoire, d'une autre archive, tables en baisse d'une seule table, archive de 23 h 30 UTC qui est du jour à Paris, jour d'été, battement de 26 h pile / 26,1 h / 30 h…) ;
4. prouve qu'il rougit : **122 mutants**, tous tués pour la bonne raison (regex attendue par mutant). Ceux que la tâche demandait : activé (`active: true`, version publiée), mauvais fuseau (UTC, New York), mauvaise heure/minute, second horaire, alerte retirée / débranchée / câblée sur la réussite / à chaque passage, commande changée (relecture sans `--dernier` ou `--verifier`, autre dossier, autre script, `--sans-chiffrer`, `--fichiers`, sans verrou, sans délai, purge à 0 jour ou hors du dossier), identifiant SSH posé, secret dans l'export, délai ôté ou démesuré, Error Trigger retiré, nœud HTTP ou Execute Command ajouté. Plus 28 mutants du **code** (jugés sans les empreintes, pour que le rejeu les voie seul ; l'empreinte doit en plus bouger). Un premier passage a laissé survivre « texte de réussite non exigé » (bilan de la sauvegarde) : j'ai ajouté le cas qui le tue.

Sortie : `verifier.log` (code 0, « ✅ sauvegarde-n8n-qa VERTE »).

## Ce que cette preuve ne prouve pas

- **Aucune commande SSH n'a été exécutée**, pas même `--verifier` : les motifs lus par les nœuds Code viennent du texte de `scripts/sauvegarde.mjs` (l.341-361 pour la relecture, l.459 pour le bilan), pas d'un passage réel. Le comportement réel du nœud SSH de n8n sur un code de sortie non nul (il rend `code`, `stdout`, `stderr` ; sinon l'erreur devient `{ error }` avec `onError: continueRegularOutput`, lue comme « connexion SSH » : le message serait imprécis, l'alerte partirait quand même) est à éprouver au premier essai.
- **Les exports sont reconstitués** : n8n n'a pas écrit de fichier ; je les ai fabriqués depuis les paramètres rendus par `get_workflow_details` (mêmes identifiants de nœud, mêmes versions, même code, mêmes commandes) par un script jetable. Le juge relit ces fichiers ; un ré-export par la session principale (étape 8 du brief) lèvera le doute.
- **Les nœuds Slack étaient épinglés** pendant les essais : le texte du message n'a jamais été rendu par n8n. Le juge ne vérifie que ses champs.
- **La branche d'erreur** (Error Trigger → Slack) ne part que sur une exécution de production : elle est prouvée par le graphe, pas par un essai. Poser `errorWorkflow` sur le workflow lui-même est refusé par n8n tant qu'il n'est pas publié.
- **La durée réelle** d'une sauvegarde (90 tables) est inconnue : la garde de 4 h suppose 20 minutes de marge.
- Les groupes de nœuds : un seul des trois groupes demandés est passé sur `presti-sauvegarde` (« Lancer et relire » refusé, sortie d'un nœud non terminal) ; aucun sur la garde. Cosmétique.

## Avant l'activation

Les gestes de Benj (aucun agent ne les fait ; le détail est dans le brief, section du même nom) :

1. Poser la **clé de service** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) dans `.env.local` du dépôt de l'hôte (`node scripts/ranger-env.mjs`), et vérifier que `cle-sauvegarde.pub.pem` y est ; la clé privée reste dans `coffre-presti`.
2. Créer le dossier `/home/usine/sauvegardes-presti` (ou valider un autre chemin : le changer dans le juge et dans les deux workflows).
3. Créer dans n8n l'**identifiant SSH** (clé privée réservée à cet usage, vers l'hôte) et le poser sur les **huit** nœuds SSH.
4. Inviter l'application Slack dans `#presti-auto` (canal privé) et confirmer que « Slack account 2 » est le bon identifiant.
5. Un **essai à la main** de `presti-sauvegarde` depuis l'éditeur, puis `--verifier --dernier --vivant` sur l'hôte ; mesurer la durée.
6. **Publier** les deux workflows (« go » de Benj), `presti-sauvegarde` d'abord. Le lendemain à 4 h, la garde doit être silencieuse.
7. La session principale inscrit `scripts/sauvegarde-n8n-qa.mjs` au tableau `SUITES` (L11), ré-exporte les deux workflows après publication et rejoue le juge.

Questions à Benj (défaut appliqué d'ici sa réponse) :

1. **Qui lit le battement de la garde ?** Défaut : personne encore (n8n arrêté ne peut pas s'alerter). Options : (a) un contrôle de `/controle` qui lit le fichier ; (b) une alerte indépendante hors n8n. — rien de construit ici.
2. **Telegram du fondateur** (cité au plan) : aucun identifiant Telegram n'existe dans n8n. Défaut : Slack seul.
3. **Dossier, délais, conservation** (`/home/usine/sauvegardes-presti`, 900 s / 120 s, 14 jours) : défauts du lot.

## Contrôle croisé avec la tâche

| Exigence de la tâche | Où |
|---|---|
| `presti-sauvegarde` 3 h 40 Europe/Paris, SSH, sauvegarde puis relecture, bilan, Slack en échec seulement, délai borné, une seule exécution, erreur désignée | export + juge R4, R5, R6, R9, R10 ; `flock` ; Error Trigger |
| `presti-garde-sauvegarde` 4 h, archive du jour, relecture, tables ≥ veille, battement, alerte | export + juge ; 25 cas rejoués |
| Inactifs, jamais publiés, aucun identifiant créé | juge R1, R2 |
| `test_workflow` sur données épinglées : réussite, archive absente, relecture rouge, tables en baisse | `essai-n8n.json` (exécutions 338 à 345) |
| Juge hors ligne qui rougit : activé, mauvais fuseau, alerte retirée, commande changée | `scripts/sauvegarde-n8n-qa.mjs`, 122 mutants |
| Brief et « Avant l'activation » | `plans/011-cadrage-01-11/briefs/c4-n8n-sauvegarde.md`, section ci-dessus |
