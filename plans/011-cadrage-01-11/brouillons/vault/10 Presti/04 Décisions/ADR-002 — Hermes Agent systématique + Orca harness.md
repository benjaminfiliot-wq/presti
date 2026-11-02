---
type: decision
title: "ADR-002 — Hermes Agent systématique + Orca harness"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - agents
  - hermes
  - orca
  - orchestre
aliases:
  - ADR-002
  - Hermes et Orca
sources:
  - "Addendum de Benj du 01/11/2026, §2 (agents), §6 (méthode), §7 (sécurité)"
  - "C:/Users/benja/Documents/presti/CLAUDE.md:27-28, 57-58, 68-69, 130-140 (version de travail du 01/11, non commitée)"
  - "C:/Users/benja/Documents/presti/.orchestre/orchestre.json:20"
  - "C:/Users/benja/Documents/presti/scripts/orchestre.mjs:925-947"
  - "C:/Users/benja/Documents/presti/scripts/verifier-outils-obligatoires.mjs:1-9, 60-70"
  - "C:/Users/benja/AppData/Local/hermes/config.yaml:80, 113, 117, 2392-2445 (lu le 01/11, modifié à 16 h 05)"
  - "C:/Users/benja/AppData/Local/Programs/orca/resources/app-update.yml"
  - "https://github.com/NousResearch/hermes-agent (consultée le 01/11/2026)"
  - "https://github.com/stablyai/orca (consultée le 01/11/2026)"
  - "C:/Users/benja/Documents/SaaS/wiki/concepts/Hermes OpenClaw AtomicAgent - évaluations et verdicts.md"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:34, 43, 76"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-002 — Hermes Agent systématique + Orca harness

> Décision de Benj du 01/11/2026. La section « Décision » reprend son texte. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».

## Contexte

**Le besoin, selon Benj :** une couche d'intelligence persistante et contrôlée.

**Jusqu'ici, le travail partait chez plusieurs exécutants.** La méthode du dépôt dit : « Claude Code pense, les exécutants produisent (antigravity, codex) » (`CLAUDE.md:133`). Quand Antigravity est à sec, `scripts/executant.mjs` prend le relais avec Gemini CLI ou Qwen Code (`CLAUDE.md:139`). Le routage envoie le volume à Antigravity ou à `executant.mjs` (`CLAUDE.md:140`). Histoire et détail : [[Methode Claude Code x executants]], [[Exécutants et routage des modèles]], [[Règles de Benj — délégation et exécutants]].

**Ce bloc de méthode est régénéré.** `node scripts/orchestre.mjs contexte` le réécrit dans `CLAUDE.md` depuis sa configuration (`scripts/orchestre.mjs:925-947`). Cette configuration liste encore `"executants": ["antigravity", "codex", "claude-code"]` (`.orchestre/orchestre.json:20`).

**Hermes Agent est installé sur le PC.**
- Dossier `%LOCALAPPDATA%/hermes`, version 0.21.5 (`CLAUDE.md:57`).
- Modèle par défaut `claude-opus-5-5`, fournisseur `anthropic`, adresse `https://api.anthropic.com` (`config.yaml:80`, `:113`, `:117`).
- Le 01/11 à 16 h 05, son repli vers freellmapi a été retiré : plus aucun fournisseur de repli ; si Anthropic ne répond pas, Hermes s'arrête et réessaie (`config.yaml:2392-2404`).
- Deux serveurs MCP sont déclarés : `n8n-oracle`, par le tunnel `localhost:5679`, en lecture et en exécution de workflows, données traitées comme non fiables (`config.yaml:2410-2436`) ; `cerveau`, le réseau neuronal (`config.yaml:2437-2445`).
- Essais d'octobre : déconnecté de Nous Portal le 04/10 ; outils de fichiers non confinés à un dossier ; pas de recherche web sans moteur ; démarrage de 30 à 130 s. La note de l'époque le range parmi les « candidats non retenus » ([[Hermes OpenClaw AtomicAgent - évaluations et verdicts]]).
- Sur Oracle, les quatre anciens conteneurs arrêtés de Hermes et d'OpenClaw ont été supprimés le 01/11, données gardées (fil du 01/11, l. 76).

**Ce que Hermes sait faire, selon son dépôt officiel** (github.com/NousResearch/hermes-agent, consulté le 01/11) : licence MIT ; mémoire tenue par l'agent et recherche dans les sessions passées ; compétences (skills) qu'il crée et améliore à l'usage ; planificateur intégré ; une quarantaine d'outils ; exécution en local, en Docker ou par SSH ; sécurité par approbation des commandes et isolation en conteneur.

**Orca est installé sur le PC.**
- `%LOCALAPPDATA%/Programs/orca`, installé le 30/10 (dates des fichiers), mis à jour depuis le dépôt GitHub `stablyai/orca` (`resources/app-update.yml`). Version 1.4.245, avec le crochet `orca-agent-hook` dans `~/.claude/settings.json` (`CLAUDE.md:58`). La skill `orca-cli` est présente (`~/.claude/skills/orca-cli`).
- Son dépôt officiel (github.com/stablyai/orca, consulté le 01/11) le présente comme le poste de travail d'une flotte d'agents, sous licence MIT. Hermes Agent figure dans sa liste d'agents. Chaque agent travaille dans son propre worktree Git ; les terminaux gardent leur historique après un redémarrage ; une application mobile suit et pilote les agents ; une CLI le commande.

**Un crochet rend les trois outils obligatoires.** Avant chaque écriture de Claude Code, `scripts/verifier-outils-obligatoires.mjs` vérifie que le n8n d'Oracle répond par le tunnel, que Hermes déclare les MCP `n8n-oracle` et `cerveau` sans repli gratuit, et que le moteur d'Orca répond. Sinon, l'écriture est bloquée (`l. 1-9`, `l. 60-70`). Le fichier se présente comme une « règle de Benj du 01/11/2026 » (`l. 1`).

**Le PC a 8 Go de mémoire**, dont 7,7 Go utiles ([[Mémoire du PC 8 Go - seuils et conséquences]], l. 26).

## Décision

Texte de Benj (addendum du 01/11, §2, §6 et §7) :

- **Claude Code et Hermes Agent sont les SEULS agents qui font le travail.** Pas d'Antigravity, pas de Codex, pas d'autres exécutants. C'est non négociable.
- **Claude Code** : développement, maintenance, tests, revue de code, verdicts.
- **Hermes Agent** : intelligence, compréhension des demandes, choix des outils, orchestration, préparation des tâches.
- **Orca** : harness obligatoire pour Hermes — sessions, permissions, mémoire, contrôle.
- **n8n** reste le moteur de toutes les automatisations ([[ADR-001 — Toutes les automatisations dans n8n]]).
- **Méthode du dépôt.** Claude Code pense, Hermes Agent produit et orchestre. Claude Code n'écrit lui-même que : schéma et migrations, argent, sécurité, cerveaux (prompts), verdicts. Tout le reste va dans `.orchestre/file/`, en tâche Markdown à en-tête YAML. On lit `.orchestre/contexte.md` et le vault avant toute tâche, pas le dépôt entier. La vérification est mécanique : `node scripts/orchestre.mjs verifier <id>`. Bloqué = une question à options dans `.orchestre/en-cours/<id>.question.md`, jamais une discussion.

## Alternatives rejetées

- **Antigravity** : l'IDE agentique de Google, piloté par `scripts/antigravity.mjs`.
- **Codex** : l'abonnement ChatGPT de Benj.
- **Autres exécutants** : notamment Gemini CLI et Qwen Code, lancés par `scripts/executant.mjs` (`CLAUDE.md:139`). OpenClaw et AtomicAgent, essayés en octobre, n'avaient pas été retenus ([[Hermes OpenClaw AtomicAgent - évaluations et verdicts]]).

## Conséquences

**L'orchestre change d'exécutant.** Antigravity et Codex sortent de `.orchestre/orchestre.json:20` et de ses compléments de méthode ; sinon `orchestre.mjs contexte` les réécrit dans `CLAUDE.md` (`scripts/orchestre.mjs:925-947`). Hermes prend les tâches de `.orchestre/file/` au même contrat (en-tête `id, type, objectif, perimetre, interdit, verifier, budget, preuve`) et passe par le même verdict (`orchestre.mjs verifier <id>`).

**`scripts/antigravity.mjs` et `scripts/executant.mjs` ne sont plus appelés.** Leur retrait ou leur archivage n'est pas tranché.

**Hermes tourne sous Orca.** Orca apporte les sessions (un worktree par agent, des terminaux persistants) et le contrôle (suivi, pilotage, CLI). Hermes est déjà branché aux MCP `n8n-oracle` et `cerveau` (`config.yaml:2410-2445`).

**Hermes reste invisible.** Il orchestre derrière ; il n'est jamais montré à un artisan ni à un client (`CLAUDE.md:68-69`).

**Chaque tâche de Hermes consomme du crédit Claude.** Son modèle passe par l'API Anthropic (`config.yaml:80`, `:113`). Ce crédit est la seule dépense de Benj ([[Journal-Decisions]], 29/10, l. 8). Sans repli, un crédit épuisé arrête Hermes (`config.yaml:2394`).

**Tout le développement dépend des trois outils.** Le crochet bloque toute écriture de Claude Code si le tunnel vers n8n, la configuration de Hermes ou le moteur d'Orca manque (`scripts/verifier-outils-obligatoires.mjs:1-3`).

**La notice et le registre changent.** La notice publique nomme Codex comme prestataire qui classe les réponses (`presti-notice/index.html:22`) ; le registre aussi (`docs/registre-traitements.md:146`, `:168`). Le retrait de Codex se reporte dans les deux.

**Les notes du vault suivent.** [[Methode Claude Code x executants]], [[Exécutants et routage des modèles]], [[Règles de Benj — délégation et exécutants]] et [[Hermes OpenClaw AtomicAgent - évaluations et verdicts]] décrivent l'ancien partage.

## Sources et liens

- Addendum de Benj du 01/11/2026, §2, §6 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Dépôt : `CLAUDE.md:27-28`, `:57-58`, `:68-69`, `:130-140` (version de travail du 01/11) · `.orchestre/orchestre.json:20` · `scripts/orchestre.mjs:925-947` · `scripts/verifier-outils-obligatoires.mjs:1-9`, `:60-70` · `docs/registre-traitements.md:146`, `:168`.
- Machine : `%LOCALAPPDATA%/hermes/config.yaml:80`, `:113`, `:117`, `:2392-2445` · `%LOCALAPPDATA%/Programs/orca/resources/app-update.yml`.
- Pages officielles consultées le 01/11/2026 : https://github.com/NousResearch/hermes-agent · https://github.com/stablyai/orca
- Notice publique : `presti-notice/index.html:22` (dépôt `benjaminfiliot-wq/presti-notice`, commit `1f9a8bd`).
- Fil du 01/11 : `SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md`, l. 34, 43 et 76.
- Vault : [[Hermes OpenClaw AtomicAgent - évaluations et verdicts]] · [[Methode Claude Code x executants]] · [[Exécutants et routage des modèles]] · [[Règles de Benj — délégation et exécutants]] · [[Orchestre (outil)]] · [[Mémoire du PC 8 Go - seuils et conséquences]] · [[Écosystème d'agents - histoire et pause du 11-10]] · [[Carte - Outils IA et automatisation]]
- ADR liés : [[ADR-001 — Toutes les automatisations dans n8n]] · [[ADR-003 — Infrastructure auto-hébergée sur Oracle]]

## Points à signaler à Benj

1. **Orca ne revendique ni les permissions ni la mémoire.** Son dépôt officiel décrit sessions, worktrees, terminaux et pilotage ; il ne parle ni de permissions ni de mémoire. Ces deux fonctions existent chez Hermes : approbation des commandes, isolation en conteneur, mémoire tenue par l'agent (dépôt de Hermes). La décision les place chez Orca.
2. **Hermes a son propre planificateur.** Son battement tourne sur le PC (`%LOCALAPPDATA%/hermes/cron/ticker_heartbeat`, 01/11). Une tâche planifiée dans Hermes serait une automatisation hors de n8n, contraire à [[ADR-001 — Toutes les automatisations dans n8n]].
3. **Hermes tourne sur le PC, pas sur Oracle.** PC éteint, plus d'orchestration. Le PC n'a que 8 Go ([[Mémoire du PC 8 Go - seuils et conséquences]]). L'addendum ne dit pas où Hermes doit tourner.
4. **Le crochet bloque déjà le travail quand le tunnel tombe.** Le 01/11 vers 16 h 40, il a bloqué deux appels pendant la rédaction de ce brouillon (délai dépassé), et son cache notait « n8n Oracle injoignable par le tunnel 127.0.0.1:5679 ». Tout le développement dépend donc d'un tunnel tenu par le PC.
5. **Le même jour, une consigne plus ancienne allait dans l'autre sens.** Le 01/11, avant l'addendum, Benj demandait de confier des tests « à Monsieur GPT et à Antigravity », puis d'envoyer « les instructions a codex et antigravity » (fil du 01/11, l. 34 et 43). Je lis l'addendum comme la règle qui remplace ces demandes.
6. **Le confinement des fichiers n'est pas prouvé.** En octobre, les outils de fichiers de Hermes n'étaient pas confinés à un dossier ([[Hermes OpenClaw AtomicAgent - évaluations et verdicts]]). Il devra venir d'Orca (worktree) ou de l'exécution en conteneur de Hermes ; rien ne le montre encore.
7. **Un jeton traîne en clair dans le vault.** La ligne 52 du fil `SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md` contient un jeton collé pour Hermes. Le cerveau MCP l'indexe et le renvoie dans ses extraits (recherche du 01/11). Je ne le recopie pas ici. Il faudrait le retirer du fil, puis le changer.
