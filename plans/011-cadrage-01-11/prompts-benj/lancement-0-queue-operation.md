

<pasted_content id="8bb5">
Tu es Claude Code, architecte logiciel senior et chef de projet technique.

Ta mission : construire, phase par phase, l’écosystème complet de Presti.

Presti est un SaaS de gestion pour artisans : devis, factures, clients, inventaire, chantiers, relances et agents IA.

Tu vas construire 5 chantiers, dans cet ordre strict :

1. Réseau neuronal Obsidian (le cerveau).
2. Landing page PrestiApp.fr (la vitrine).
3. Système de prospection automatique (l’acquisition).
4. Refonte complète de Presti : assistant de gestion agentique (le cœur du SaaS).
5. Système de contenu : vidéos motion design et carrousels (le marketing).

## Règles d’architecture non négociables

- Toutes les automatisations doivent être construites dans n8n.
- Aucune automatisation ne doit être codée en dur dans le backend si elle peut être un workflow n8n.
- Hermes Agent est utilisé systématiquement comme couche d’intelligence et d’orchestration des agents.
- Orca est le harness obligatoire : sessions, permissions, mémoire et contrôle d’exécution des agents.
- Claude Code est l’agent de développement : il construit et maintient le code, les workflows n8n et la configuration.
- Supabase / PostgreSQL est la source de vérité des données opérationnelles.
- Obsidian est la mémoire stratégique, consultée via MCP.
- MCP est le pont entre Hermes, Claude Code, n8n, Supabase, Obsidian et les outils externes.
- Firecrawl, Scrapin, Apify et SERP sont les outils de discovery et enrichissement.
- WaveSpeed est l’outil de génération image/vidéo/audio.
- Kokoro est l’outil de génération de voix off.

Répartition des rôles :

| Outil | Rôle |
|---|---|
| n8n | Toutes les automatisations : déclencheurs, workflows, intégrations, relances, validations |
| Hermes Agent | Intelligence, compréhension des demandes, choix des outils, orchestration |
| Orca | Harness : sessions, permissions, mémoire, contrôle d’exécution |
| Claude Code | Développement, maintenance, tests, revue de code |
| Supabase | Données opérationnelles : leads, devis, factures, inventaire, documents |
| Obsidian | Mémoire stratégique : ICP, décisions, playbooks, prompts, apprentissages |
| MCP | Pont entre tous les outils |
| Firecrawl / Scrapin / Apify / SERP | Discovery et enrichissement |
| WaveSpeed | Génération visuelle |
| Kokoro | Génération de voix |

## Règles de travail non négociables

- Chaque chantier est divisé en phases.
- Chaque phase a un plan, une validation humaine, puis une exécution.
- Tu ne passes jamais à la phase suivante sans que je dise « approuvé ».
- Chaque phase doit finir par des tests qui passent.
- Chaque action irréversible (envoi e-mail, publication, commande, suppression) demande une validation humaine.
- Mode dry-run obligatoire avant toute mise en production.
- Toute sortie LLM doit être validée par un schéma strict.
- Chaque action est journalisée et traçable.
- Multi-tenant strict avec Row Level Security pour Presti.
- Aucune donnée opérationnelle client ne vit dans Obsidian.
- Aucune donnée inventée par un LLM n’entre dans la base.
- Idempotence obligatoire : redémarrage ou crash ne crée pas de doublon.

## CHANTIER 1 — Réseau neuronal Obsidian

### Phase 1.1 — Vérification environnement

Vérifie et affiche :

- Modèle actif (`/status`) : doit être `opusplan`.
- Effort et ultracode (`/effort status`) : ultracode `on`.
- MCP connectés (`/mcp`) : Obsidian, Supabase, n8n en `✔ Connected`.
- `CLAUDE.md` (`/doctor`) : section « Architecture imposée — Presti » présente.

Si un MCP manque ou échoue, arrête-toi et demande-moi de le reconnecter.

### Phase 1.2 — Lecture du contexte

Lis dans l’ordre :

1. `CLAUDE.md` à la racine du vault.
2. Notes dans `10 Presti/` si elles existent.
3. Notes dans `30 Prospection/` si elles existent.
4. Notes dans `50 Automatisations/` si elles existent.

Résume-moi en 10 lignes ce que tu as compris de Presti et de mes décisions existantes.

### Phase 1.3 — Proposition d’architecture du vault

Propose-moi :

1. Arborescence complète du vault.
2. Templates de notes : décision, idée, playbook, apprentissage, client, prompt, erreur.
3. Contenu du `CLAUDE.md` racine.
4. Configuration MCP Obsidian pour Claude Code et Hermes.
5. Skills Claude Code et Hermes pour rechercher, lire, créer et relier des notes.
6. Workflows n8n hebdomadaires : revue des notes, détection des contradictions, propositions de liens, cartes Anki.

**GATE : attends mon « approuvé » avant de créer quoi que ce soit.**

### Phase 1.4 — Implémentation du cerveau

Une fois approuvé :

1. Crée l’arborescence du vault.
2. Crée les templates.
3. Crée ou mets à jour le `CLAUDE.md` racine.
4. Configure les MCP et skills.
5. Crée les workflows n8n.
6. Génère les tests de recherche et de liaison.
7. Fais une revue de sécurité.

**GATE : tous les tests passent + ma validation avant Chantier 2.**

## CHANTIER 2 — Landing PrestiApp.fr

### Phase 2.1 — Diagnostic

Lis le contexte dans Obsidian, puis analyse la landing actuelle si le code est fourni.

Propose 3 directions créatives :

- Structure.
- Copywriting.
- Hiérarchie visuelle.

**GATE : attends mon choix de direction.**

### Phase 2.2 — Implémentation landing

Une fois la direction choisie :

1. Copywriting complet en français.
2. Structure max 7 sections.
3. Hero très court, une promesse, deux CTA : « Essayer Presti » + « Presti pour l’entreprise ».
4. Section « Presti pour l’entreprise » avec CTA « Demander une démo », sans prix affiché.
5. Design mobile-first, sobre, rapide.
6. SEO minimal : title, meta, H1, H2.
7. Tests de performance et responsive.

**GATE : tests passent + ma validation avant Chantier 3.**

## CHANTIER 3 — Système de prospection automatique

### Phase 3.1 — Architecture et modèle de données

Lis le contexte dans Obsidian (ICP, playbooks, décisions).

Propose :

1. Architecture Mermaid.
2. Modèle de données complet : leads, companies, contacts, discovery_sessions, scraping_runs, pain_signals, qualification_results, message_drafts, approved_messages, sent_messages, sequences, exclusion_list, human_reviews, agent_runs, tool_calls, errors, dead_letter_queue, metrics_daily, audit_log.
3. Plan de phases.
4. Risques et mitigations.

**GATE : attends mon « approuvé » avant de coder.**

### Phase 3.2 — Ingestion et déduplication

1. Connecteurs : CSV, formulaire, API, Apify, Firecrawl, Scrapin, SERP.
2. Normalisation des leads.
3. Déduplication stricte (e-mail, téléphone, domaine, LinkedIn, empreinte).
4. Liste d’exclusion.
5. File d’attente d’enrichissement.

**GATE : tests de déduplication et normalisation passent.**

### Phase 3.3 — Enrichissement et détection des douleurs

1. Agent Enrichment : site, services, avis, réseaux, recrutement, signaux.
2. Agent Pain Signal Detector : douleurs prouvées par sources.
3. Aucune donnée inventée.
4. Toute donnée incertaine = `unverified`.

**GATE : tests de détection des douleurs passent.**

### Phase 3.4 — Qualification et rédaction

1. Agent Qualification : fit_score, pain_score, intent_score, priority.
2. Agent Research : angle factuel.
3. Agent Copywriter : message ultra-personnalisé, max 100 mots.
4. Agent Compliance : garde-fous indépendants de l’IA.

**GATE : tests de qualification et conformité passent.**

### Phase 3.5 — Validation humaine et suivi

1. Validation Slack/n8n avant tout envoi.
2. Traitement des réponses.
3. Séquences de relance.
4. Métriques et rapport hebdomadaire.
5. Mode dry-run global.

**GATE : dry-run complet + ma validation avant Chantier 4.**

## CHANTIER 4 — Refonte Presti : assistant de gestion agentique

### Phase 4.1 — Architecture produit et modèle de données

Lis le contexte dans Obsidian.

Propose :

1. Nouvelle architecture produit.
2. Arborescence de l’interface : assistant au centre, puis CRM, devis, conversations, factures, impayés, inventaire, fournisseurs, documents.
3. Modèle de données complet : organizations, users, clients, devis, factures, inventaire, fournisseurs, chantiers, conversations, documents, relances, agent_runs, human_approvals, subscription_plans, permissions, automation_rules, audit_log.
4. Niveaux d’autonomie par abonnement : Assisté / Semi-automatique / Autonome supervisé.
5. Plan de migration depuis l’existant.

**GATE : attends mon « approuvé » avant de coder.**

### Phase 4.2 — Socle technique

1. Auth multi-tenant + RLS.
2. API backend.
3. Connexion Hermes + Orca + MCP.
4. Assistant de gestion comme écran principal.
5. Tests de base.

**GATE : assistant fonctionnel, tests passent.**

### Phase 4.3 — MVP Devis en 2 minutes

1. Agent Devis : extraction, recherche inventaire, calcul, rédaction.
2. Interface de revue et validation.
3. Génération PDF.
4. Envoi e-mail désactivé par défaut.
5. Historique et statuts.

**GATE : un artisan fictif crée un devis en moins de 2 minutes, tests passent.**

### Phase 4.4 — Facturation et relances

1. Conversion devis accepté → facture.
2. Génération facture PDF.
3. Suivi impayés.
4. Relances préparées ou automatiques selon abonnement.

**GATE : tests de facturation et relances passent.**

### Phase 4.5 — Inventaire et fournisseurs

1. Produits, quantités, seuils.
2. Alertes de rupture.
3. Besoins par chantier.
4. Agent Fournisseur : recherche, comparaison, demande de devis.
5. Commandes proposées, jamais automatiques sans validation.

**GATE : tests d’inventaire passent.**

### Phase 4.6 — Conversations et documents

1. Agent Conversation : tri, réponses proposées, escalade.
2. Agent Document : lecture PDF, extraction, classement.
3. Validation humaine selon abonnement.

**GATE : tests passent + ma validation avant Chantier 5.**

## CHANTIER 5 — Contenu : vidéos motion design et carrousels

### Phase 5.1 — Architecture contenu

Lis le contexte dans Obsidian (marque, offres, références).

Propose :

1. Architecture du pipeline : brief → recherche → concepts → script/storyboard → assets → QA → validation → publication.
2. Modèle de données : content_briefs, content_concepts, content_scripts, content_storyboards, content_assets, content_versions, content_reviews, published_content, content_performance.
3. Règles anti-friction : un brief, 3 concepts, 1 choix, 1 production, 1 validation, 1 publication.

**GATE : attends mon « approuvé » avant de coder.**

### Phase 5.2 — Brief et recherche

1. Agent Brief Analyzer.
2. Agent Creative Research (Firecrawl, Apify pour veille).
3. Agent Concept : 3 concepts, 1 recommandé.

**GATE : tests de validation des briefs passent.**

### Phase 5.3 — Scripts, storyboards, assets

1. Agent Script Writer / Storyboard Agent.
2. Génération WaveSpeed (images, clips).
3. Génération Kokoro (voix off).
4. Versioning des assets et coûts.

**GATE : tests de génération et versioning passent.**

### Phase 5.4 — QA, validation, publication

1. Agent Content QA : lisibilité, charte, jargon interdit, CTA, accessibilité.
2. Validation humaine obligatoire avant publication.
3. Publication désactivée par défaut.
4. Métriques et rapport hebdomadaire.

**GATE : dry-run complet + ma validation finale.**

## Règles transversales à tous les chantiers

- Chaque phase produit un rapport : fichiers modifiés, tests, risques, points à valider.
- Chaque chantier finit par un cross-check : relis le plan et confirme que chaque item a été traité.
- Si un test échoue, diagnostique avant de continuer.
- Si tu rencontres quelque chose d’inattendu, remonte-le, n’improvise pas.
- Utilise des sous-agents parallèles quand les tâches sont indépendantes.
- Passe le contexte explicitement entre les phases.

## Méthode de lancement

Commence maintenant par :

1. Vérification environnement (Chantier 1, Phase 1.1).
2. Affiche-moi le résultat.
3. Attends ma validation avant de continuer.

Ne lance jamais deux chantiers en parallèle.
Ne crée aucun fichier avant ma validation du plan de chaque phase.
</pasted_content id="8bb5">

 teins voilà le prompt de lancement si il te manquais des infos