## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle) : skills (outil Skill) : aucun skill n8n ; les skills de design, de vidéo et d'audit ne servent pas ce domaine. MCP utiles : `cerveau` (lecture), `n8n-oracle` (lecture seule ici). Les autres connecteurs (Supabase, Vercel, Slack…) sont hors du périmètre ou interdits par la tâche. Aucun réseau sortant.
- **MCP `cerveau`, `regles_pour`** (« offre entreprise, n8n : étendre le juge… ») : aucune règle rendue (`[]`). D'où les deux lectures suivantes.
- **MCP `cerveau`, `lire` : ADR-008** (`vault/10 Presti/04 Décisions/ADR-008 — n8n-first…`) et **ADR-001** (§ Décision). Le juge reste hors ligne et ne contient aucune logique métier : il garde des workflows n8n, il n'en remplace aucun. Le pas « testé en dry-run » de l'ADR-001 donne R15 : un effet n'est atteignable que hors simulation.
- **MCP `cerveau`, `lire` : `memoire-presti/source-restructureai-depots-n8n-0211.md`**. Un dépôt de workflows est une donnée non sûre : on n'en reprend que des motifs. Aucun JSON externe n'est importé dans les exports fictifs : ils sont écrits ici, et marqués « Exemple. ».
- **MCP `n8n-oracle`, `get_workflow_sdk_reference`** (sections `patterns` et `rules`) : la forme des connexions `ai_languageModel` et `ai_outputParser`, la forme du If (`conditions.options/conditions/combinator`), les sorties 0 et 1 (vrai et faux). R15 coupe exactement la sortie 1.
- **MCP `n8n-oracle`, `get_node_types`** sur Execute Sub-workflow 1.4, Execute Workflow Trigger 1.3, AI Agent 3.1, Structured Output Parser 1.3 et If 2.4. Noms exacts des paramètres lus par R17 et R18 : `source`, `workflowId.__rl`, `options.passthroughBinaryImages` (vrai par défaut), `options.maxIterations`, `schemaType: fromJson | manual`, `autoFix`, `operator { type, operation }`. Rien de deviné.
- **`plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md`** : la ligne 035-001 (l.934), § 4.6 (l.397-430, règles de construction) et § 5.5 (l.619-759, bibliothèque `lib-*` et contrats `enveloppe@1`). Ils donnent la liste des règles neuves, les 7 clés d'entrée et les 9 de sortie (R16), et « un mutant qui retire le If simulation fait rougir le juge » (R15).
- **`plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`** (l.95, 156-162, 216, 247, 255, 263, 312-318) : le contrat par sous-workflow (p5:159), le mode à blanc (p5:318), aucune donnée sensible dans une notification (p5:247, donc R8), n8n ne garde pas les données (p5:95, donc R13).
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (l.17-52, 66-84, 160-170, 210-218, 292-313, 914-933). Ce qui casse en 3.0 donne la liste de R17 ; le fuseau New York par défaut, R10 ; les réglages de workflow, R9 et R11 à R13 ; les modèles, R18 ; les bornes, R12.
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md`** (l.86 : « Error Trigger posé, mais aucun workflow d'erreur désigné… Aucun des 8 n'en désigne »). C'est ce qui fait de R9 une exigence plus stricte que R3 : en `ent` et `lib`, une branche interne ne suffit pas.
- **Fiches vidéo** (`fiches-videos.md`, `docs/connaissance-videos/`, 8 analyses) : survolées. Elles n'apportent aucune règle de juge (vente, preuve, tunnel), donc elles ne changent rien ici.
- **Les juges et exports existants** : `scripts/n8n-specs-qa.mjs` (L12, 032-019), les 9 exports de `.orchestre/preuves/032-0*`, `032-033/resume.md` (qui pose `errorWorkflow` sur les exports), `032-023/resume.md` (la sauvegarde, en SSH, a son propre juge).

## Ce qui a changé

Fichiers (7, budget 8) : `scripts/n8n-specs-qa.mjs` ; `scripts/fixtures/n8n-specs-qa/{lib-exemple-executer,ent-exemple-relance,ent-exemple-parent}.workflow.json` ; `scripts/fixtures/n8n-specs-qa/empreintes-code.json` ; `.orchestre/preuves/035-001/{resume.md,sorties.txt}`. Aucun workflow n8n n'a été écrit, aucun identifiant n'a été touché, aucun export d'une autre tâche n'a été modifié.

**Les familles.** Elles se tirent du nom du workflow. Tout ce qui ne commence ni par `ent-`, ni par `lib-`, ni par `gabarit-` est de la famille « c4 », et y est jugé **à l'identique** de 032-019. R5 « lectures GET seulement » n'y est pas assouplie. Deux mutants neufs le prouvent sur `presti-detecteurs` :
- un POST derrière une porte « simulation » bien formée reste rouge en R5 ;
- un nœud de sous-workflow reste hors liste blanche.

Dans l'autre sens, le `lib-*` fictif renommé `presti-…` retombe sous R5 : son écriture devient rouge. Le droit d'écrire derrière la porte appartient à la famille, jamais au workflow.

**Défaut trouvé et corrigé.** Avant toute modification, le juge lancé sans argument (la commande de la tâche) était déjà **ÉCHEC** (`sorties.txt` § 1). Les mutants « branche d'erreur ôtée » et « Error Trigger relié à rien » laissaient la garde verte : l'export de `presti-detecteurs` porte `settings.errorWorkflow` depuis 032-033, et R3 restait donc tenue par la branche externe. Les deux mutants ôtent désormais les deux branches, et rougissent en R3. Aucune règle n'est affaiblie. Autre correction : les mutants des détecteurs prenaient le premier export nommé `presti-detecteurs`, alors que celui de 032-003 est rouge. Ils prennent maintenant le premier export vert.

**Deux ajouts de service.** Un argument peut être un dossier (tous ses `*.workflow.json`), ce que demandent 035-003, 035-004 et 035-007. Et le registre d'empreintes se lit à côté de chaque export.

## Les règles neuves (familles `ent` et `lib`), leur source, leurs mutants

| Règle | Ce qu'elle exige | Source | Mutants (export fictif) |
|---|---|---|---|
| R5 (réglée par famille) | Liste blanche propre (sans le nœud Supabase ; avec sous-workflows, Switch, Stop and Error, AI Agent, Claude, parseur). HTTP en GET, POST ou PATCH ; un corps seulement hors GET. Le C4 garde « GET seulement » | PR:934 (« la régler par famille, sans l'affaiblir pour les détecteurs ») | « c4 : POST derrière une porte » (rouge R5) ; « c4 : sous-workflow ajouté » ; « lib renommé hors famille » (rouge R5) |
| R8 | Ni `chat_id` ni e-mail écrits dans l'export | PR:934 ; p5:247 | e-mail dans un en-tête (lib) ; `chat_id` 123456789 (lib) ; `chatId` @canal en dur (parent) |
| R9 | `settings.errorWorkflow` désigné (une branche interne ne suffit pas) ; jamais soi-même ; `lib-erreur-commune` porte son Error Trigger | PR § 4.6 ; fiches-depots:86 | branche interne à la place ; le workflow se désigne lui-même |
| R10 | `timezone: Europe/Paris` | PR § 4.6 ; FM:166 | New York ; fuseau absent |
| R11 | Un enfant n'accepte que `workflowsFromAList` avec des `callerIds` ; un workflow non appelé, `none` ou une liste ; jamais `any` | PR § 4.6 | enfant en `any` ; liste vide ; parent en `any` ; politique absente |
| R12 | `executionTimeout` entier de 1 à 3 600 s | PR § 4.6 ; FM:933 | délai retiré ; délai de 2 h |
| R13 | Sur un `ent-*` : `saveDataSuccessExecution: none`, progression non sauvée | PR § 4.6 ; p5:95 ; FM:45, :1038 | succès `all` ; réglage ôté ; progression sauvée ; succès `all` sur le parent |
| R14 | `organisation_id=eq.…` sur chaque GET et PATCH, `organisation_id` dans le corps d'un POST ; nœud Supabase exclu (son filtre ne se lit pas dans la requête) | PR § 4.6 « Les lectures » ; FM:41-43 | filtre ôté ; filtre sans `eq.` ; POST sans `organisation_id` ; nœud Supabase ajouté ; filtre ôté du parent |
| R15 | Une porte `porte: simulation` : un If, une seule condition booléenne « vrai » sur `simulation`, typage strict. Tout effet (envoi, HTTP hors GET) n'est atteignable, depuis **chaque** racine, que par la sortie « faux » d'une porte | p5:318 ; PR § 5.5 `lib-executer` | porte retirée (p5:318) ; écriture sur la sortie « vrai » ; porte inversée ; typage souple ; condition sur un autre champ ; sortie d'erreur de la porte vers l'écriture ; second déclencheur qui contourne ; envoi sans porte (relance) |
| R16 | Un enfant commence par un seul Code « Contrat d'entrée » (notes `contrat: <nom>@N`, les 7 clés de l'`enveloppe@1`) et finit par un seul « Contrat de sortie » (les 9 clés), seul bout de chemin | PR § 4.6, § 5.5 ; p5:159 ; FM:837-849 | contrat contourné ; clé `simulation` non contrôlée ; contrat d'un autre gabarit ; seconde fin de chemin ; `effets_faits` absent |
| R17 | Aucun nœud retiré en 3.0 (Function, Function Item, Workflow Trigger, HTML Extract, LangChain Code, AI Transform) ni Execute Command ; sous-workflow en `database` avec un identifiant fixe ; AI Agent 3.x | PR § 4.6 ; FM:73-81 | Execute Command ; Function ; AI Agent 1.9 ; source `parameter` ; identifiant en expression |
| R18 | AI Agent : `passthroughBinaryImages` à faux, `maxIterations` de 1 à 10, un seul parseur structuré en `manual`, `autoFix` à faux, une revalidation en Code | PR § 4.6 « Les modèles » ; FM:292-313 ; p5:216 | images transmises ; itérations non bornées ; parseur débranché ; parseur `fromJson` ; `autoFix` ; pas de revalidation |
| R19 | Code : ni module, ni réseau, ni `process`, ni `$env` ; empreinte SHA-256 du `jsCode` égale au registre `empreintes-code.json` posé à côté de l'export | PR § 4.6 « Les nœuds Code » (parade à É3) | code modifié après revue ; Code absent du registre ; `require('fs')` ; `helpers.httpRequest` |
| R20 | Un envoi en aval d'un nœud de modèle déclare `pied: mention` (R4 contrôle alors le texte) | PR:934 ; lib/mentionAssistant.ts:14-17 | envoi du texte du modèle déclaré `aucun`, sans mention (R4 seule le laissait passer) |

Les trois exports fictifs, chacun vert seul :
- `lib-exemple-executer` : un `lib-*` qui écrit une carte derrière sa porte ;
- `ent-exemple-relance` : un enfant `ent-*` avec AI Agent 3.1, Claude, un parseur `manual`, une revalidation, la porte et un envoi avec la mention ;
- `ent-exemple-parent` : un parent appelé par personne, qui appelle un enfant en source `database`.

Aucune donnée réelle. Organisation `00000000-0000-4000-8000-000000000001`, identifiants `…Fictif0N`, aucune adresse ; les seules en `@exemple.invalid` sont dans les mutants.

## La sortie (détail dans `sorties.txt`)

- **Commande de la tâche, sans argument** : `n8n-specs-qa : 4 export(s), 88 mutants (23 sur presti-detecteurs, 12 sur fictif, 33 sur lib-exemple-executer, 13 sur ent-exemple-relance, 7 sur ent-exemple-parent)` puis **`OK`**, code 0. Avant l'extension : 33 mutants, dont 2 verts, **ÉCHEC**.
- **Sur les 9 exports existants** (`.orchestre/preuves/032-0*/**.workflow.json`), avant comme après, **verdicts et manquements identiques** (diff vide, `sorties.txt` § 5). Cinq sont verts (032-013, 032-014, 032-019, 032-031, 032-033). Quatre étaient déjà rouges avant cette tâche, pour les mêmes raisons :
  - `032-003`, le premier export des détecteurs (R3), remplacé par 032-019 ;
  - les deux exports de `presti-sauvegarde` de 032-023 (nœuds SSH hors liste blanche, R5 ; Slack sans pied déclaré, R4) : ce sont des workflows d'infrastructure, avec leur propre juge, `sauvegarde-n8n-qa.mjs` ;
  - `presti-demande-demo` de 032-026 (Slack sans `pied:`, R4).

  Les quatre sont des exports d'autres tâches, **interdits ici**. Aucune règle n'a été assouplie pour les verdir. Ils sont signalés plus bas.
- **Contre-épreuve** (`sorties.txt` § 6) : chaque règle neuve, neutralisée à son tour dans une copie du juge, laisse verts tous ses mutants, et seulement les siens. R8 en laisse 3, R9 2, R10 2, R11 4, R12 2, R13 4, R14 5, R15 8, R16 5, R17 5, R18 6, R19 4, R20 1.

## Risques et points à valider

1. **Le masquage des données de production des `ent-*` n'est PAS contrôlé.** Le nom du réglage dans n8n 2.45.7 n'apparaît dans aucun export, aucune fiche, ni dans la référence du SDK. Je ne l'ai pas inventé. R13 contrôle les succès et la progression non sauvés. À faire : lire le réglage sur une instance (035-010, docs.n8n.io), puis l'ajouter à R13, avec son mutant.
2. **La commande `verifier` de la tâche est cassée dans l'en-tête de `035-001.md`.** Elle est coupée sur deux lignes, et `orchestre.mjs` lit une ligne par champ (`lireTache`, l.184-189). Il ne retient que la l.7, qui finit sur un guillemet non fermé (`bash -n` : « unexpected EOF », code 2). Le regex a aussi perdu ses barres obliques inverses (`[sS]`, `^s*`). `verifier.log` (21:00:44Z) : `/bin/sh: 1: Syntax error: Unterminated quoted string`, code 2. Même recollé sur une ligne, le regex abîmé rougirait toujours (essai : code 1). La commande voulue, sur une ligne, passe par `sh -c` avec le code 0 : le juge est OK, et la section compte 12 puces. Ce fichier n'est pas dans mon périmètre : question posée en `035-001.question.md`, avec la ligne corrigée.
3. **R19 ne garantit que ce qu'on relit.** Le registre est posé à côté de l'export, par la même tâche. L'empreinte prouve que le code jugé est le code relu dans le diff. Elle ne prouve pas que le n8n vivant tourne ce code : il faudra une comparaison entre l'export publié et le registre, avant la publication (035-013).
4. **Valeurs retenues sans source chiffrée, à valider par Benj** : `executionTimeout` au plus à 3 600 s, `maxIterations` au plus à 10 (la valeur par défaut de n8n), et la seule méthode POST ou PATCH en écriture (pas de DELETE).
5. **`n8n-specs-qa` n'est PAS dans `SUITES`** : `grep -n "n8n-specs-qa"` sur le lanceur ne rend aucune ligne (02/11, 21 h UTC). Or p5:312 exige que la suite y soit inscrite. Le lanceur est interdit à cette tâche : c'est à la session principale de l'ajouter (`cout` sans IA, hors ligne, environ 1 s).
