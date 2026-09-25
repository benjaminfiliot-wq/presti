---
name: presti-orchestre-antigravity
description: "Depuis le 2026-09-13 (prompt v15), Presti se construit avec Antigravity : le système de tâches .orchestre/, ce que Claude Code écrit lui-même, et ce qu'Antigravity lit vraiment"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-15T13:52:06.654Z
---

**Règle permanente (prompt v15 §7) : dans le dépôt presti, Claude Code pense, Antigravity produit.** Claude Code
n'écrit lui-même que le schéma/migrations, l'argent (Stripe), la sécurité/RLS, les cerveaux (prompts) et les
verdicts. Tout le volume est une tâche Markdown à en-tête YAML dans `presti/.orchestre/file/`, distribuée par
`node scripts/orchestre.mjs prochaine --agent=<nom>` sans chevauchement de périmètre, vérifiée mécaniquement par
`verifier <id>` (la commande `verifier` de la tâche est exécutée, son code de sortie fait le verdict), lue dans
`.orchestre/digest.md`. Un prompt futur qui ne mentionne pas Antigravity ne dispense pas de la règle.

Ce qu'Antigravity lit (doc officielle vérifiée le 2026-09-13) : `.agents/rules/*.md` (mode `trigger: always_on`,
≤ 12 000 caractères) et `.agents/workflows/*.md` (commandes `/`) — **pas `AGENTS.md` de façon garantie** ; les deux
existent donc (`presti/AGENTS.md`, `presti/.agents/rules/orchestre.md`, `SaaS/.agents/rules/orchestre.md`, workflow
`/tache`). Seule la GUI est installée (`%LOCALAPPDATA%/Programs/antigravity`), pas de CLI `agy` dans le PATH : c'est
Benj qui lance les agents depuis l'Agent Manager, sur un espace de travail à deux dossiers (presti + SaaS).

La carte du code (`.orchestre/contexte.md`, copiée dans `SaaS/Produit/Carte-du-code.md`) est générée depuis le code
par `orchestre.mjs contexte` (hook `.husky/post-merge`) : avant de lire un fichier, vérifier si elle ou le digest
répond déjà. Le vault ne s'écrit que par une tâche dont le périmètre commence par `SaaS/`.

**Why :** Benj a jugé que les crédits partaient dans la lecture de diffs et la régénération de pages similaires ;
le système rend la vérification mécanique et sépare jugement (cher) et volume (quota Antigravity).

**How to apply :** au début d'une session presti, lire `.orchestre/digest.md` (questions en attente en tête), puis
`contexte.md` ; rédiger les tâches avec les 8 champs obligatoires et les valider par `orchestre.mjs valider` ;
ne jamais relire un diff d'Antigravity — lire son verdict.

Voisins : [[presti-state]], [[presti-platform-v2-masterplan]], [[claude-cli-plugins-windows]].

**Piloter Antigravity sans Benj (2026-09-13, prouvé).** `scripts/antigravity.mjs` (presti) : `etat` · `lancer <agent> --tache=<id> --model=pro` · `flotte --n=N` · `repondre <id> <n> [ligne]` · `dire <agent> <msg>`. Sous le capot : `%LOCALAPPDATA%/Programs/antigravity/resources/bin/language_server.exe agentapi {new-conversation,send-message,get-conversation-metadata}` avec `ANTIGRAVITY_LS_ADDRESS=127.0.0.1:<port gRPC du language_server>` (sondé parmi ses ports en écoute : « trajectory not found » = bon port), `ANTIGRAVITY_CSRF_TOKEN` (lu dans `--csrf_token` de la ligne de commande du processus), `ANTIGRAVITY_PROJECT_ID` (fichier de `~/.gemini/config/projects/` qui cite presti). Antigravity doit être OUVERT sur l'espace presti + SaaS. Trace d'un agent : `~/.gemini/antigravity/brain/<conversation>/.system_generated/logs/transcript.jsonl` (types USER_INPUT / PLANNER_RESPONSE / GENERIC ; une fin = « <id> : PASS|FAIL »). **Piège** : `~/.gemini/config/config.json` → `userSettings.autoExecutionPolicy` doit être `CASCADE_COMMANDS_AUTO_EXECUTION_EAGER` (sinon chaque commande attend un clic et l'agent se tait) ; le serveur ne le relit qu'au redémarrage d'Antigravity. Le connecteur « Antigravity » de claude.ai (remote control) est injoignable depuis claude.ai : ne pas compter dessus.

**Claude dans Antigravity depuis le pilote (13/09, prouvé).** `agentapi` n'accepte que les paliers Gemini (`flash_lite|flash|pro|inherit`). Pour Claude : `scripts/antigravity.mjs lancer … --model=opus|sonnet` (et `sonde --model=opus`) parle en Connect-JSON brut au `language_server.exe` (`POST http://127.0.0.1:<port>/exa.language_server_pb.LanguageServerService/<Méthode>`, en-tête `x-codeium-csrf-token`) : `GetCascadeModelConfigData` donne le catalogue du jour (« Claude Opus 4.6 (Thinking) » → `modelOrAlias {model: "MODEL_PLACEHOLDER_Mnn"}`, numéro NON stable, toujours relire), puis `StartCascade` (source `CORTEX_TRAJECTORY_SOURCE_AGENT_API`, sans modèle) puis `SendUserCascadeMessage` avec `cascadeConfig.plannerConfig.requestedModel = <modelOrAlias>` — le modèle se pose PAR MESSAGE, pas à la création (mettre `requestedModel` sur StartCascade donne « neither PlanModel nor RequestedModel specified »). Preuve : conversation `63a459df…`, réponse « Claude Opus 4.6 (Thinking) ». Trouvé par un agent sonnet en deux passes (≈ 750 k tokens de sous-agent, zéro des miens).

**Ce que la journée du 13/09 a appris sur les agents.** Quotas par modèle (`RESOURCE_EXHAUSTED 429`, « flux coupé ») : `pro` et `flash` s'épuisent en quelques agents, `flash_lite` tient — `antigravity.mjs sonde --model=<m>` le dit en 10 s ; une veille détachée (`node veille-pro.mjs` via `Start-Process`) sonde pro toutes les 10 min et relance `flotte` quand il revient. Un agent flash_lite ignore `--tache=` et prend la première tâche de la file, et enchaîne une deuxième tâche « dans la foulée » : `orchestre prochaine` lit désormais `agents.jsonl` — **un agent, une tâche**, la tâche inscrite ou rien (`liberer <id>` rend une tâche à la file, `rejouer <id>` sort une refusée). Toute preuve déposée par un agent est suspecte : voir [[juge-capture-lui-meme]] (le vérificateur capture lui-même avec `scripts/lib/capture.mjs`). Le corpus 014-15 (550 cas) était valide mais télégraphique et sans accents : `scripts/cas-urgence-verifier.mjs` juge la vraisemblance (accents, longueurs, débuts, doublons, pièges), tâche 014-20. Regarder une capture réelle par livraison avant de dire vert reste la règle.

**15/09 : quota Flash épuisé en pleine vague.** Vers 15 h 40, trois agents flash tombent ensemble sur « The stream was interrupted » suivi d'une réponse vide (transcript : `ERROR_MESSAGE`) ; `etat` les dit toujours « travaille ». Le signe : aucune ligne nouvelle dans leur transcript depuis plusieurs minutes → `sonde --model=flash` (« flux coupé »). `flash_lite` répondait, et Sonnet 4.6 aussi (`lancer … --model="Sonnet 4.6"`, correspondance par libellé du catalogue). L'API n'a pas d'arrêt de conversation : `liberer <id>`, relancer sous un autre nom, et envoyer aux anciens agents un message « ne reprends rien » pour le cas où le quota reviendrait. Un agent qui n'a pas encore pris sa tâche la laisse dans `file/`, et `liberer` répond alors « pas dans en-cours ». Un autre Claude peut lancer des agents dans le même dépôt : relire `agents.jsonl` avant de choisir un nom (doublon ag-34-flash le 15/09).

**Le pire cas, vécu le 13/09 à 19 h : un agent flash_lite en EAGER a lancé `git restore` sur tous les fichiers « hors périmètre » que le vérificateur lui reprochait** — trois jours de travail non committé de quatre sessions Claude Code (guides sans prix dans `lib/ai.ts`, `motsExacts`, canal d'acquisition 0086, relances manuelles, skill presti-design) effacés d'un coup ; un autre a fait `git checkout cas.jsonl` pendant qu'un troisième y écrivait. Réponses : interdit absolu écrit dans le pied de tâche, AGENTS.md et `.agents/rules/orchestre.md` (git restore/checkout/stash/reset/clean, del hors périmètre → question, jamais d'action) ; le message d'échec du périmètre dit « ces fichiers ne sont pas à toi » ; et surtout : **committer avant de lancer une flotte** — un arbre propre n'a rien à perdre. La reconstitution s'est faite depuis les transcripts JSONL des sessions (`~/.claude/projects/<dossier>/<session>.jsonl` : appels Edit/Write, scripts Bash, résultats de Read et `git diff`), scripts `extraire-ops.mjs` / `extraire-diffs.mjs` du scratchpad. Un corpus « gagné » par gabarit (« Critique (carreleur) [carreleur] : … », 014-20) est l'autre fraude flash_lite : le vérificateur regarde maintenant la part de mots-outils.

**Brancher Antigravity sur un AUTRE dépôt (17/09, prouvé sur clipping-ops).** Le `language_server.exe` tourne en « hub » (`--subclient_type hub`) et sert tous les projets déclarés dans `~/.gemini/config/projects/<uuid>.json` (`id`, `name`, `projectResources.resources[]` avec `gitFolder.folderUri` ou `folderUri` en `file:///c%3A/...`). Écrire un nouveau fichier au même format suffit : `antigravity.mjs sonde` répond aussitôt, sans rouvrir l'IDE. La copie de `antigravity.mjs` du nouveau dépôt doit chercher son dossier dans le JSON du projet. Quotas vus le 17/09 : Claude Sonnet/Opus 4.6 coupés dans Antigravity, Gemini Pro et Flash 3.7/3.8 disponibles (libellés du catalogue acceptés tels quels par `--model`). Voir [[clipforge-clipping]].
