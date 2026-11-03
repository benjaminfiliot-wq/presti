## Ressources utilisées

- **Réseau neuronal (MCP `cerveau`, `regles_pour`)** : rend la règle « workflows de vrais outils » (03/11) : gabarits sans identifiant, outils de l'agent en lecture seule, porte « simulation » devant chaque écriture, juge commun `n8n-specs-qa.mjs`. A fixé le cadre : le chef n'écrit rien, ses spécialistes ne font que lire.
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`** (l.64-66, :75, :133, :341, :377) : l'organigramme (un chef, des managers, des agents qui se passent des notes) et le « chef avec quatre fonctions nommées » ont donné la forme : le chef distribue aux spécialistes, rend une note structurée, ne fait rien d'autre. Les étiquettes « A2/A3/A14 » de la tâche ne figurent pas dans ce fichier sous ce nom : je cite les lignes, pas les étiquettes.
- **MCP `n8n-oracle` (lecture seule : `get_node_types`, `get_workflow_best_practices`)** : `get_node_types` sur `@n8n/n8n-nodes-langchain.agentTool` v3 a donné les vrais paramètres (`toolDescription`, `text`, `options.systemMessage`, `maxIterations`, sous-nœuds `model`, `tools`, `outputParser`) ; la fiche « triage » a confirmé : sortie structurée, température basse, chemin par défaut. Aucun workflow créé, lu ni modifié dans n8n.
- **Dépôts `~/agents/depots/`** : 6 workflows ouverts qui emploient des agents avec `toolWorkflow` (Telegram AI bot with LangChain nodes ; AI Agent for project management and meetings with Airtable and Fireflies ; BambooHR AI-Powered Company Policies and Benefits Chatbot ; Suggest meeting slots using AI ; Chat with a Google Sheet using AI ; MongoDB AI Agent - Intelligent Movie Recommendations), plus `n8n-io_skills/skills/n8n-agents-official/references/TOOLS.md`. **Constat** : aucun des dépôts n'emploie `agentTool` (recherche de la chaîne exacte : 0 fichier) ; ils emploient `toolWorkflow` (34 fichiers). `TOOLS.md` : dans un outil d'agent, `$json` n'est que ce que le modèle passe, d'où le texte de l'agent-outil en `$fromAI("demande", …)`.
- **`scripts/n8n-specs-qa.mjs`** (R15, R18, R19, R23) : lu pour que le juge neuf reprenne ses listes ; rejoué sur les 16 exports (R1 à R23 tenues).
- **`OUTILLAGE.md` O4/O5 et les exports 036-013 à 036-018** : base de la fabrique (sources, sans les modifier).

## Ce qui est fait

Dans les **16 gabarits qui portent des agents IA** (7 `gabarit-artisan-*`, 9 `gabarit-ent-*`) : un **chef de département** (AI Agent 3.1, Claude Sonnet 5.5, un seul Structured Output Parser strict, `autoFix` faux, schéma `additionalProperties: false`, aucune propriété d'argent) qui délègue à **2 ou 3 spécialistes en agents-outils** (`agentTool` 3, Claude Haiku 5.5, leurs outils de **lecture** copiés), suivi d'un nœud Code qui revalide la note (R18) puis rend l'élément d'origine plus `note_du_chef`. Le chef se pose après la porte « simulation » existante, devant l'agent exécutant d'origine (qui ne change pas). Gabarits inactifs, sans identifiant.

**Non concernés** (aucun agent IA, donc aucun chef à poser) : `gabarit-artisan-accueil-boite`, `-accueil-envoi`, `-accueil-leads`. Le juge les liste, ne les compte pas verts.

Organigramme de chaque gabarit : `plans/011-cadrage-01-11/p6-signature/outillage/multi-agents.md` (tableau, forme, limites).

## Preuves (sorties de commande)

- `sortie-du-juge.txt` : `node scripts/multi-agents-qa.mjs` → **OK : 16 gabarits multi-agents tenus, 20 mutants rouges** (10 mutants × 2 gabarits, un artisan et un entreprise) : sans chef, agent-outil qui écrit (Gmail en envoi), outil sans opération (envoi par défaut), chef sans parseur, parseur non strict, montant dans le schéma du chef, **montant pris dans la sortie du chef**, agent-outil sans modèle, un seul agent-outil, porte contournée.
- `sortie-juge-commun.txt` : `n8n-specs-qa.mjs .orchestre/preuves/036-019` → 16 × « R1 à R23 tenues » et « OK ».
- `empreintes-code.json` : SHA-256 de tous les nœuds Code ; la fabrique vérifie que les nœuds d'origine n'ont pas changé d'un octet.
- `essais-n8n.json` : 6 essais de la revalidation du chef (bac à sable `node:vm`) : note valide gardée ; somme écrite, clé `montant` en trop, décision hors liste, spécialiste inconnu, nom de la plateforme : tous rejetés.
- `*.workflow.json` : les 16 exports ; `construire.mjs` et `organigrammes.json` : la fabrique et son relevé.

## Un défaut trouvé par le juge pendant le travail

La première version copiait les outils d'accord humain de Slack et Teams (`sendAndWait`) chez le spécialiste de `gabarit-ent-direction` : le juge a refusé (M3, « outil de spécialiste qui écrit ou envoie »). Corrigé : ces outils restent à l'agent d'origine.

## Points à valider / risques

1. **Non joué dans n8n** : pas de MCP n8n d'écriture ici, aucun appel au modèle (règle de la tâche). Les exports sont à poser dans n8n par la session principale (mises à jour des `gabarit-*` existants, restés inactifs), puis `validate_workflow`. Les paramètres de `agentTool` viennent de `get_node_types` ; la tuyauterie réelle (`ai_tool` d'un agent-outil vers le chef) n'a pas tourné.
2. **La note du chef n'est lue par personne** : elle voyage dans l'élément ; le code reste l'autorité. L'exploiter (`besoin_humain` → carte « À valider ») est une décision de produit.
3. **Coût** : un appel de plus par événement (chef, Sonnet 5.5) et les spécialistes consultés (Haiku 5.5) ; les agents d'origine tournent toujours. À mesurer avant mise en service.
4. **Doublon assumé** : les spécialistes reprennent la consigne des agents d'origine (« rien n'est perdu »). Si Benj préfère supprimer les exécutants d'origine, c'est un lot de plus (schémas et revalidations à réécrire).
5. **Le chef n'a qu'un `maxIterations` de 6** et chaque spécialiste de 4 : à régler à l'essai réel.
6. Les exports d'origine (036-013 à 036-018) ne sont pas modifiés ; les juges `gabarits-*-qa.mjs` de ces lots continuent de juger les anciens exports.
