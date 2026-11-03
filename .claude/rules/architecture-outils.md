# Architecture et outils — qui fait quoi

Décision de Benj du 01/11/2026, non négociable (addendum §2, §3 et §6).
Pourquoi : vault `C:/Users/benja/Documents/SaaS`, notes posées le 01/11/2026 (phase 1.4) :
`10 Presti/04 Décisions/ADR-001 — Toutes les automatisations dans n8n.md`,
`10 Presti/04 Décisions/ADR-002 — Hermes Agent systématique + Orca harness.md`,
`10 Presti/04 Décisions/ADR-003 — Infrastructure auto-hébergée sur Oracle.md`.

## Agents
- Claude Code et Hermes Agent sont les agents qui font le travail.
- **03/11/2026 au soir, Benj** : « utilise aussi Antigravity et Codex pour terminer », pour économiser sa clé API Claude.
  - Antigravity (Gemini, `node scripts/antigravity.mjs lancer … --model=pro`) et Codex (abonnement ChatGPT, `node scripts/executant.mjs
    lancer … --moteur=codex`) sont de nouveau exécutants (`.orchestre/orchestre.json`).
  - Ils ne prennent que du code, des contenus et des tests : jamais une donnée de prospect ni de client, jamais un secret.
  - Le jugement (schéma, argent, sécurité, cerveaux, verdicts) reste à Claude Code.
- **03/11/2026 vers 22 h 45, Benj : « arrête d'utiliser la clé Anthropic API, ça bousille nos réserves ».**
  - Plus aucun agent de développement sur la clé API : la clé des agents d'Oracle est coupée (`~/agents/cle-api.env` renommé en
    `cle-api.env.coupee-0311`).
  - Le travail se termine avec Codex, Antigravity, et freellmapi pour les petites tâches seulement.
  - freellmapi ne reçoit jamais une donnée de prospect ni de client : c'est la règle de `securite.md`. Les agents n8n de production, qui
    traitent ces données, gardent donc leur identifiant Anthropic (Haiku, appelé seulement quand une vraie demande arrive).
- Pas d'autre exécutant.
- Claude Code : développement, maintenance, tests, revue de code, verdicts.
- Hermes Agent : intelligence, compréhension des demandes, choix des outils, orchestration,
  préparation des tâches.
- Orca : harness obligatoire de Hermes — sessions, permissions, mémoire, contrôle.
- n8n : moteur de TOUTES les automatisations, sans exception. Aucune automatisation en dur dans le backend.
- Hermes reste derrière : jamais montré à un artisan ni à un client, qui ne parlent qu'à l'assistant de Presti.
- Les agents travaillent dans une conversation Orca visible (Hermes comme Claude Code, règle de Benj du 02/11) ; ce qui tourne
  seul passe par n8n.

## Règle n8n-first (NON NÉGOCIABLE, Benj, 02/11/2026)
- Toute automatisation, relance, workflow, déclencheur, notification ou logique métier récurrente DOIT être construite dans
  n8n, jamais codée en dur dans l'app (Next.js, fonctions Supabase, etc.).
- Claude Code écrit et modifie les workflows n8n par l'API ou le MCP (`n8n-oracle`).
- Le code custom (Next.js, Supabase) sert UNIQUEMENT à l'interface (dashboard, formulaires, app membre), jamais à la logique
  d'automatisation.
- Devant une nouvelle automatisation, la première question est « quel workflow n8n je crée ou je modifie ? », pas « quel code
  j'écris ? ».
- Toute exception se justifie explicitement dans la réponse. Les automatisations déjà codées en production (pg_cron, crons Vercel,
  pilote, relances) se corrigent sur place quand une faille l'exige, et migrent une par une dans n8n (`migration-production.md`).

## Méthode
- Claude Code pense ; Hermes Agent produit et orchestre.
- Claude Code n'écrit lui-même que : schéma et migrations, argent, sécurité, cerveaux (prompts), verdicts.
- Tout le reste va dans `.orchestre/file/`, en tâche Markdown à en-tête YAML.
- Avant toute tâche : lire `.orchestre/contexte.md` et le vault, pas le dépôt entier.
- Vérification mécanique : `node scripts/orchestre.mjs verifier <id>`.
- Bloqué : une question à options dans `.orchestre/en-cours/<id>.question.md`, jamais une discussion.
- Le bloc « Méthode » régénéré dans `CLAUDE.md` et `AGENTS.md` suit ce fichier depuis le 02/11 (source : `.orchestre/orchestre.json`) ; en cas d'écart, ce fichier fait foi.

## Rôles
| Outil | Rôle |
|---|---|
| n8n | Toutes les automatisations : déclencheurs, workflows, intégrations, relances, validations |
| Hermes Agent | Intelligence, compréhension des demandes, choix des outils, orchestration, préparation des tâches |
| Orca | Harness de Hermes : sessions, permissions, mémoire, contrôle d'exécution |
| Claude Code | Développement, maintenance, tests, revue de code, verdicts |
| Supabase / PostgreSQL | Données opérationnelles, la source de vérité : leads, devis, factures, inventaire, documents |
| Obsidian (vault SaaS) | Mémoire stratégique lue par MCP : ICP, décisions, playbooks, prompts, apprentissages. Aucune donnée opérationnelle client |
| MCP | Pont entre tous les outils : Hermes, Claude Code, n8n, Supabase, Obsidian, outils externes |
| Firecrawl auto-hébergé, Crawlee, SearXNG, ScrapeGraphAI | Discovery, scraping, recherche, extraction (Oracle) |
| Kokoro | Voix des essais ; la voix d'une pub publiée est celle de Benj (Fish) |

## Infrastructure auto-hébergée — serveur Oracle `88.96.53.3`
Tout tourne en Docker sur le serveur Oracle, à côté de n8n :
- Firecrawl auto-hébergé — remplace Firecrawl en ligne.
- Crawlee — scraping de pages dynamiques.
- SearXNG (déjà installé) — recherche web méta.
- ScrapeGraphAI — extraction structurée assistée par IA.

## Outils payants ou interdits — ne pas utiliser
- Firecrawl en ligne : à sec.
- Apify : clé invalide.
- Scrapin : jamais branché.
- LinkedIn : collecte interdite par ses conditions.
- WaveSpeed : payant ; jamais sans accord explicite de Benj.

## Où chaque outil tourne (relevé du 01/11/2026)
- n8n cible : Oracle, Docker `/opt/n8n-complet` (n8n 2.45.7 depuis le 02/11, accord de Benj ; sauvegarde d'avant dans
  `/root/sauvegardes/` ; exécuteurs, bac à sable, SearXNG), lié à `127.0.0.1:5678`, joint par tunnel SSH. Workflows métier : `presti-detecteurs`
  (inactif) ; l'identifiant « Supabase account » vise la vraie API du projet depuis le 02/11 (Benj).
- Hôte d'agents Claude Code (02/11, demande de Benj : « une armée d'agents » sans charger le PC) : Oracle (24 Go, 4 cœurs), utilisateur
  `usine`, copies du dépôt dans `~/Documents/presti` et `~/Documents/presti-c2`, réseau neuronal branché (MCP `cerveau` sur une copie du
  vault), pas de MCP n8n. Lancement par la session principale seulement (`~/agents/lancer.sh`, qui pose `PRESTI_HOTE_AGENTS=oracle` et
  `ORCA_TERMINAL_HANDLE`) ; chaque agent s'affiche dans un onglet Orca du PC. Gardes : les crochets du dépôt (commit, push, build partagé,
  migration refusés), une liste de refus dans `~/.claude/settings.json` (sudo, docker, ssh, curl, `/opt`, les identifiants). Les fichiers du
  périmètre reviennent au PC par la session principale, qui rejoue `verifier`.
- n8n cloud `presti.app.n8n.cloud` : branché à Claude Code par MCP, 0 workflow,
  ne reçoit aucune donnée personnelle.
- n8n local (Docker Desktop du PC, `Documents/n8n`) : arrêté.
- Hermes Agent : PC, v0.21.5 (`%LOCALAPPDATA%/hermes`) ; deux serveurs MCP déclarés le 01/11 dans
  `config.yaml` (`n8n-oracle`, `cerveau`), testés le 01/11. Modèle par défaut : **Haiku 5.5** (`claude-haiku-5-5`, fournisseur
  `anthropic`, clé API Claude Platform « presti », crédit partagé avec le produit) ; Sonnet 5.5 si Haiku ne suffit pas ; les
  modèles gratuits de freellmapi (Oracle, tunnel `127.0.0.1:3001` : DeepSeek, gpt-oss…) **seulement pour les petites tâches** ;
  le complexe va à Claude Code (règle de Benj du 01/11 au soir). Depuis le 02/11, freellmapi n'est plus dans le profil
  principal (il garde les MCP, donc l'accès aux données de prospects) : les petites tâches passent par le profil **sans aucun
  MCP** `hermes -p petites-taches` (`profiles/petites-taches/config.yaml`). Le 01/11, gpt-oss-120b était saturé et
  DeepSeek V4 Flash sans clé de fournisseur dans freellmapi. L'abonnement ne couvre plus les outils tiers depuis le 04/04/2026.
  Plafonds posés le 02/11 (audit du chantier 1) : 150 tours et une heure par passage, une seule session à la fois,
  sous-agents bornés, `execute_code` coupé, commandes interdites même sous `--yolo` (`approvals.deny` : git push/commit,
  vercel, migrations, secrets, jeton, build) ; n8n-oracle en lecture seule. Le crochet `scripts/verifier-outils-obligatoires.mjs`
  le contrôle (banc `scripts/config-hermes-e2e.mjs`).
  Deux correctifs locaux du 01/11, à refaire après une mise à jour de Hermes (le crochet bloque s'ils manquent) :
  `hermes-agent/agent/anthropic_credentials.py` (les clés `sk-ant-usr-` sont des clés API) et
  `hermes-agent/ui-tui/src/app/createGatewayEventHandler.ts` (attente de session portée de 4 s à 120 s, sinon la consigne d'Orca
  est jetée) ; les deux diffs sont dans `presti-ops/usine/hermes-correctifs/` (`git apply`). La file n8n de Hermes exige un
  jeton : `%USERPROFILE%\.presti\file-n8n.jeton` (hors d'AppData, que Hermes lancé par Orca voit redirigé), jamais affiché ni
  versionné. Lancer Hermes par `orca agent launch` (vrai onglet) : un passage d'automatisation Orca que l'interface n'a pas
  rattaché à un onglet est refermé dès qu'Orca le croit terminé (01/11).
  Restent à Benj (réglages de comptes, interdits à un agent) : dans Orca, une exception d'accès pour Hermes
  (`agentPermissionOverrides` « own » au lieu de l'accès complet qui lance `--yolo`) ; dans la console Claude Platform, une clé
  propre à Hermes dans un espace de travail à plafond mensuel, pour qu'un Hermes emballé ne vide jamais le crédit du produit.
- Orca : PC, v1.4.245 ; crochet `orca-agent-hook` dans `~/.claude/settings.json`.
- Supabase : projet `gorcdvmueakcncsmrouo`, eu-central-1, Postgres 17 ; MCP connecté.
- Obsidian : vault `C:/Users/benja/Documents/SaaS` ; MCP `cerveau` : lecture
  (`chercher`, `lire`, `regles_pour`, `quoi_de_neuf`, `modele_note`), et depuis le 01/11 écriture
  gardée (`creer_note`, `relier_notes` : `cerveau/src/ecriture.mjs`, preuve `node scripts/test-ecriture.mjs`).
- freellmapi : Oracle, Docker, en service.
