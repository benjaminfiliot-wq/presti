# StarNet : le harnais de bureau de l'équipe Presti

> Mis en place le 05/10/2026 sur ordre de Benj (« MET L'ÉCOSYSTÈME DESSUS »). StarNet (`androoAGI/starnet`) : code MIT ; nom, logo et
> dessins réservés à son auteur → rien de cela ne va dans le site Presti. Installé dans `%LOCALAPPDATA%\StarNet` (version 0.12.5) ;
> données dans `%APPDATA%\ai.skynet.harness\workspaces`. C'est un **poste d'observation** : il ne remplace ni le Poste (`/controle`) ni les
> agents de l'usine, il montre l'équipe réelle dans une station en pixel-art et lui parle en lecture seule.

## 1. Ce qu'on a appris de StarNet (lu dans le code installé)

| Sujet | Réalité |
|---|---|
| Architecture | Une application Tauri (`skynet-desktop.exe`) qui lance un **sidecar Node** (`sidecar/index.js`, 22 700 lignes) sur un port local (64598 cette fois ; 8787 depuis les sources) et une page web servie par lui. Tout est HTTP loopback. |
| Authentification locale | Chaque route `/api/*` exige l'en-tête `X-StarNet-Token` (jeton propre à chaque lancement, injecté dans la page servie). Origine et `Host` verrouillés sur le loopback. |
| Où vivent les agents | **Dans la page** (état « frontend »), pas dans le sidecar : `App.summonAgent(spec)` crée un agent ; la page pousse le roster au sidecar (`POST /api/roster`) et l'enregistre dans `workspaces/agent.save.json` (`POST /api/save`). Un agent = `id` (≤ 40 car.), `name` (≤ 18, MAJUSCULES), `skin` (apparence, 51 choix), `purpose` + `manual` (sa consigne), `model`/`provider`, `approvalMode` (`ask` ou `full`), `executionProfile`. |
| Salles | Modèle `WorldModel` : `addRoom`, `addProp` (bureau), `assignPropAgent`. Les salles contiguës se relient toutes seules. Le menu **BUILD** (REFIT) fait la même chose à la souris. |
| Permissions | `approvalMode: ask` = chaque écriture, exécution ou sortie demande l'accord de Benj. `executionProfile` : `station-gear` (aucun connecteur, aucun terminal), `trusted-project` (connecteurs + terminal dans des dossiers approuvés), `safe-cell` (Docker), `this-computer`. `/api/permissions` : aucun accord global (`masterBypass: false`). |
| Budget | `/api/budget/caps` : `perRun`, `perAgent`, `perDay`, `global` en dollars. **Piège : `0` veut dire « sans plafond »**, pas « zéro dépense ». Valeur livrée : 25 $/jour. |
| Fournisseurs | `/api/providers` : Codex, Grok, Kimi (connexion à un compte), OpenRouter, OpenAI, Anthropic… (clé), **Ollama** (local, sans clé), **Custom** (point d'accès OpenAI-compatible, clé facultative). |
| Connecteurs MCP | `/api/connectors`. Transport `http` (loopback accepté) ou `stdio` ; **le `stdio` exige un agent « Safe Cell » donc Docker** (absent ici) → le connecteur Presti est servi en HTTP. |
| Autres | Widgets agents, tâches planifiées, canaux (Telegram, Discord, Slack…), skills, import OpenClaw/Hermes, sauvegarde/restauration de configuration (`/api/config/export`). |

## 2. Ce qui est branché (état du 05/10/2026)

- **Équipe** : 28 agents, ceux de `lib/pilotage/equipage.ts` (MATT en chef, les 27 autres de l'organigramme du 27/09), chacun avec rôle, pôle,
  supérieur, salle et limites dans sa consigne. Source unique : `presti-ops/ia-pc/starnet-equipe-source.js` → `starnet-equipe.json`.
- **Station** : 20 salles Presti (Commandement, Réunion, Radar, Rédaction, Envois, Standard, Atelier, Usine à sites, Recettes, Trésorerie, Tour du Crieur,
  Studio pubs, Expérience, Machines, Chantier du code, Audience, Sécurité, Presti, Observatoire, Repos), un bureau par agent.
- **Permissions** : approbation `ask` pour les 28 ; profil `trusted-project` pour MATT et les 6 agents d'observation (QUALITE SITES, TRESORIER, VEILLEUR,
  SURVEILLANT, SYSTEME, VIGILE) qui ont le connecteur ; `station-gear` (rien) pour les 21 autres ; aucun accord global ; consigne de chaque agent :
  il n'envoie, ne publie, ne dépense, ne touche aucun secret.
- **Budget** : 0,000001 $ sur les quatre plafonds (le plus petit non nul : aucune dépense possible ; l'équivalent de 0 €).
- **Cerveau** : fournisseur `custom` → `http://127.0.0.1:11435/v1` = l'Ollama de l'usine par tunnel ssh, modèle `qwen3:4b-instruct-2507-q4_K_M`. Gratuit,
  sans clé, sans compte.
- **Connecteur « presti »** (`scripts/mcp/presti-station.mjs`, 7 outils de lecture : `equipe_etat`, `journal_recent`, `decisions_en_attente`, `jauges`,
  `interrupteurs`, `attention`, `sante_production`). Déclaré dans StarNet (id `presti`, HTTP `127.0.0.1:8799/mcp`, état « up », 7 outils).
  Garanties testées (`node scripts/mcp/presti-station.test.mjs`) : liste blanche de 7 fonctions SQL `stable` (aucune écriture possible), textes masqués
  (adresses, liens, numéros, noms), aucune donnée de prospect, clé de service lue dans `.env.local` en mémoire seulement et filtrée de toute sortie.
- **Relevé réel affiché** : le journal de bord et l'état de l'équipe (nombres vrais de la base du 05/10 12 h 42) sont dans la session de MATT, en lignes
  « système » signées « relevé par Claude Code, pas par un agent » (affichage de la session, non conservé au rechargement de la page). Capture : `presti-ops/ia-pc/starnet-capture-2026-10-05.jpg`.

## 3. Ce qui ne marche PAS encore (dit franchement)

1. **Aucun agent ne peut encore répondre en direct.** L'Ollama de l'usine tourne déjà pour l'écosystème réel (charge 5-6, processus à 270 % de CPU) : le 4B
   met plusieurs dizaines de secondes à lire la grosse consigne de StarNet (≈ 10 000 signes + outils) et StarNet coupe à 30 s (« retry 3/6 (timeout) »).
   Les agents existent, le connecteur répond (testé à la main, et StarNet le voit « up »), mais la réponse d'un agent attend un modèle plus rapide :
   voir `presti-ops/ia-pc/starnet-reste-pour-benj.md`, geste 1 (clé freellmapi) ; on ne surcharge pas l'usine pour une démo.
2. Le relevé réel est un **instantané** collé dans la session, pas un flux : pour le rafraîchir, voir « Relancer » (étape 4).
3. Le dessin de la station est très sombre dans le panneau (éclairage de l'application, pas un défaut de données) ; les murs entre salles sont discrets.

## 4. Relancer

1. `powershell -ExecutionPolicy Bypass -File presti-ops\ia-pc\starnet-lancer.ps1` : remet le tunnel Ollama (11435) et le connecteur (8799) ; chaque
   processus n'est lancé que si son port est libre, et affiche son PID. Arrêt : `Stop-Process -Id <PID>` (jamais par nom).
2. Ouvrir StarNet (l'application). Les agents, les salles, le budget et le connecteur sont déjà enregistrés dans `workspaces/` : rien à refaire.
3. Si la configuration a été perdue : ouvrir la page du harnais, passer l'écran « Create your Overseer » (nom MATT, `ask for approval`, fournisseur Custom,
   URL du tunnel, modèle ci-dessus), puis coller `starnet-appliquer-page.js` dans la console ; le budget et le connecteur se repoussent par
   `POST /api/budget/caps` (`{"perRun":0.000001,"perAgent":0.000001,"perDay":0.000001,"global":0.000001}`) et `POST /api/connectors`
   (`{"id":"presti","transport":"http","url":"http://127.0.0.1:8799/mcp","label":"Presti (lecture seule)","enabled":true}`) avec l'en-tête `X-StarNet-Token`.
4. Relevé réel : `node scripts/mcp/presti-station.mjs` expose les outils ; dans StarNet, demander à MATT d'appeler `equipe_etat` (dès qu'un modèle
   rapide est branché), ou relancer le relevé instantané décrit au § 2.

## 5. Règles

- StarNet ne reçoit **jamais** une donnée de prospect : le connecteur n'en rend pas (noms d'agents et nombres) ; ne pas y brancher la boîte de prospection.
- Aucune connexion à un compte (Anthropic, OpenAI, Google) depuis StarNet : geste de Benj, pas des agents.
- Le connecteur ne s'étend pas à l'écriture : toute action sur l'écosystème passe par le Poste, Telegram ou Claude Code.
- Ne pas copier le nom, le logo ni les dessins de StarNet dans le site Presti.
