# Architecture et outils — qui fait quoi

Décision de Benj du 01/11/2026, non négociable (addendum §2, §3 et §6).
Pourquoi : vault `C:/Users/benja/Documents/SaaS`, liens à créer (phase 1.4) :
`10 Presti/04 Décisions/ADR-001 — Toutes les automatisations dans n8n.md`,
`10 Presti/04 Décisions/ADR-002 — Hermes Agent systématique + Orca harness.md`,
`10 Presti/04 Décisions/ADR-003 — Infrastructure auto-hébergée sur Oracle.md`.

## Agents
- Claude Code et Hermes Agent sont les SEULS agents qui font le travail.
- Pas d'Antigravity, pas de Codex, pas d'autre exécutant.
- Claude Code : développement, maintenance, tests, revue de code, verdicts.
- Hermes Agent : intelligence, compréhension des demandes, choix des outils, orchestration,
  préparation des tâches.
- Orca : harness obligatoire de Hermes — sessions, permissions, mémoire, contrôle.
- n8n : moteur de TOUTES les automatisations, sans exception. Aucune automatisation en dur dans le backend.
- Hermes reste derrière : jamais montré à un artisan ni à un client, qui ne parlent qu'à l'assistant de Presti.

## Méthode
- Claude Code pense ; Hermes Agent produit et orchestre.
- Claude Code n'écrit lui-même que : schéma et migrations, argent, sécurité, cerveaux (prompts), verdicts.
- Tout le reste va dans `.orchestre/file/`, en tâche Markdown à en-tête YAML.
- Avant toute tâche : lire `.orchestre/contexte.md` et le vault, pas le dépôt entier.
- Vérification mécanique : `node scripts/orchestre.mjs verifier <id>`.
- Bloqué : une question à options dans `.orchestre/en-cours/<id>.question.md`, jamais une discussion.
- Le bloc « Méthode » régénéré dans `CLAUDE.md` cite encore Antigravity et Codex : ce fichier fait foi.

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
- n8n cible : Oracle, Docker `/opt/n8n-complet` (n8n 2.45.6, exécuteurs, bac à sable, SearXNG),
  lié à `127.0.0.1:5678`, joint par tunnel SSH. Aucun workflow métier.
- n8n cloud `presti.app.n8n.cloud` : branché à Claude Code par MCP, 0 workflow,
  ne reçoit aucune donnée personnelle.
- n8n local (Docker Desktop du PC, `Documents/n8n`) : arrêté.
- Hermes Agent : PC, v0.21.5 (`%LOCALAPPDATA%/hermes`) ; deux serveurs MCP déclarés le 01/11 dans
  `config.yaml` (`n8n-oracle`, `cerveau`), fonctionnement non vérifié ; l'OAuth Anthropic attend un geste de Benj.
- Orca : PC, v1.4.245 ; crochet `orca-agent-hook` dans `~/.claude/settings.json`.
- Supabase : projet `gorcdvmueakcncsmrouo`, eu-central-1, Postgres 17 ; MCP connecté.
- Obsidian : vault `C:/Users/benja/Documents/SaaS` ; MCP `cerveau` en lecture seule
  (`chercher`, `lire`, `regles_pour`, `quoi_de_neuf`).
- freellmapi : Oracle, Docker, en service.
