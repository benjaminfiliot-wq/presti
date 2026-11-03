## Ressources utilisées

| Ressource | Usage | Ce qu'elle a changé dans l'audit |
|---|---|---|
| Skill `reseau-neuronal` | mode d'emploi du vault : lire avant de produire, ne rien écrire | lecture seule du réseau neuronal, aucune note créée (consigne de l'hôte : copie du vault du 02/11) |
| MCP `cerveau` : `regles_pour`, `chercher` | règles de Benj sur l'audit ; notes `memoire-presti/decisions-benj-0311-apres-midi.md`, `p6-signature/mode-ombre.md`, `provisionnement.md`, `mise-en-service.md`, `premiere-reponse.md` | m'a donné la cible de Benj (« tout dans l'outil de gestion », branchement O3 a, activer les automatisations en les testant), contre laquelle chaque maillon est jugé |
| MCP `n8n-oracle`, lecture seule : `search_workflows`, `get_workflow_details` (`presti-cerveau`, `lib-executer`, `presti-boite`, `presti-accuse-reception`), `search_workflow_executions`, `get_workflow_execution` (790, 820, 844), `list_credentials`, `search_data_tables` | état réel de n8n | **découverte principale** : lectures `noOp` du Cerveau, `stopAndError` de `lib-executer` hors simulation, absence de `presti-provisionnement`, de copies `client-*`, d'identifiant n8n API ou Google, de table `presti_provisionnement` |
| Skill `ecc:security-review` (grille) | secrets, autorisation, RLS, données sensibles | section 6 du rapport : photo vers Anthropic contre le registre § 23, `service_role` dans n8n, gardes de session 0184 et 0188, état contradictoire des migrations |
| Trois sous-agents `Explore` (modèle haiku, lecture seule) : chaîne de l'artisan, assistant de gestion, CRM | lecture du code au fichier:ligne | leurs affirmations clés ont été revérifiées à la main : `faitToutSeul` sans `peut()` (`app/api/assistant/route.ts:131`, `lib/assistant/cadrage.ts:325-328`), verrou CRM (`lib/crm/acces.ts:19`), exemple par défaut (`app/crm/page.tsx:132`), `consoleV2` (`app/dashboard/page.tsx:238-245`) |
| `plans/analyse-videos.md` (l.672, 933, 1051 et passages voisins) | fidélité du CRM 3D aux vidéos du 01/11 | tableau de la section 4 : le monde 3D cliquable est là ; la boîte « À valider » à trois colonnes est absente |
| `plans/011-cadrage-01-11/p6-signature/journal-mise-en-service.md` (036-024, -025, -027), `RAPPORT-0311.md`, `outil-gestion.md`, `chantier-4-assistant-plan.md` | ce que la session principale déclare | chaque déclaration est confrontée à n8n ou au code ; une contradiction est relevée sur l'état des migrations |

Non chargés, et pourquoi : skills de design, de vidéo et de méthode n8n de construction (`get_workflow_sdk_reference`, `get_workflow_best_practices`). Cette tâche est un audit en lecture, sans page ni workflow à bâtir.

## Ce qui a été fait

- Audit en lecture seule, écrit dans `plans/011-cadrage-01-11/p6-signature/audit-0311-fonctionnement.md`. Il contient :
  - la chaîne Studio (S1 à S18) et Signature (G1 à G8), avec pour chaque maillon un état, ce qui le bloque, une preuve et qui le lève ;
  - les cartes ;
  - l'assistant ;
  - le CRM ;
  - la santé de n8n ;
  - la sécurité ;
  - le verdict.
- Rien n'a été écrit dans n8n. Aucun banc ni workflow n'a été lancé. Aucune porte n'a été levée. Rien n'a été envoyé, migré, commité ni compilé.

## Le constat principal, en trois lignes

1. Aucune carte d'un agent n8n ne peut atteindre un écran :
   - rien n'écrit `evenements_metier` ;
   - les lectures du Cerveau sont des `noOp` qui visent des tables ou colonnes inexistantes (`systeme_reglages`, colonnes de `departements_reglages`, `evenements_a_traiter`) ;
   - `lib-executer` s'arrête hors simulation ;
   - `opportunites` n'est lue par aucun écran.
2. Ce qui sert un artisan payant aujourd'hui, c'est le produit codé dans l'app : réponse IA, relances par le cron, devis et factures, assistant et cartes `assistant_actions`, pilote de Signature, CRM 3D.
3. À trancher par Benj : le mode « fait tout seul » de l'assistant exécute en Studio un ordre net de l'artisan sans contrôle d'offre.

## Limites

- Aucun accès à la base ni au site depuis l'hôte : l'état des migrations est déclaré, pas constaté. Les sources se contredisent (`0193_systeme_agents.sql:4` contre `RAPPORT-0311.md:14`).
- Le contenu du conteneur n8n (variables, modules) n'a pas été lu : `docker` et `ssh` sont refusés aux agents.
- Les exécutions planifiées réussies ne sont pas conservées (`saveDataSuccessExecution: none`).
- La lecture de `vercel.json` a été refusée par le crochet `garde-agents-orca.mjs` : les horaires des crons sont cités d'après `CLAUDE.md`.

## Sortie de la commande `verifier`

Voir `verifier.log`, rempli après `node scripts/orchestre.mjs verifier 036-029`.
