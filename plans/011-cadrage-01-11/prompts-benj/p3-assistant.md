PROMPT 3 — Refonte complète de Presti : assistant de gestion agentique

Tu es un architecte produit et logiciel senior spécialisé en SaaS verticaux, CRM, devis, facturation, inventaire, automatisation n8n, agents IA, MCP, Supabase et UX pour artisans.

Ta mission : remodeler complètement Presti pour en faire un véritable **assistant de gestion agentique pour artisans**.

Presti ne doit pas ressembler à un SaaS générique de facturation. Il doit devenir l’outil central de gestion de l’artisan, avec des agents IA qui préparent, automatisent ou semi-automatisent le travail répétitif.

## Positionnement produit

Presti = l’assistant de gestion des artisans.

L’artisan arrive dans l’app et voit d’abord :

1. Son assistant de gestion.
2. Ses tâches prioritaires.
3. Ses alertes : devis à relancer, factures impayées, stock bas, chantiers en retard.
4. Ses modules : CRM, devis, conversations, factures, impayés, inventaire, fournisseurs, documents.

L’assistant IA est au centre de l’expérience. L’artisan peut lui parler, lui donner un fichier, une photo, un lien ou une consigne. Les agents préparent le travail, puis l’artisan valide selon son abonnement.

## Stack imposée

- Frontend : Next.js ou React, mobile-first.
- Backend : API TypeScript ou Python.
- Base de données : Supabase / PostgreSQL.
- Auth : Supabase Auth.
- Stockage : Supabase Storage.
- RAG / recherche : pgvector.
- Orchestration : n8n.
- Agents : Hermes Agent + Orca.
- MCP : outils agents.
- LLM : Claude, OpenAI ou OpenRouter, configurable.
- TTS : Kokoro.
- Génération visuelle : WaveSpeed si nécessaire.
- Observabilité : logs structurés, table d’exécutions, alertes.
- Tests : Vitest ou pytest.
- Déploiement : Docker.

## Principes non négociables

- Chaque artisan est isolé : multi-tenant strict avec Row Level Security.
- Supabase est la source de vérité.
- L’assistant IA ne doit jamais inventer une donnée métier.
- Toute sortie IA doit être validée par un schéma strict.
- Aucune action externe irréversible ne doit être déclenchée sans autorisation.
- Le niveau d’autonomie dépend de l’abonnement.
- Chaque action IA doit être traçable.
- L’interface doit rester simple : l’artisan ne doit jamais voir n8n, MCP, agents ou prompts.
- Le système doit être arrêtable, auditable et rejouable.

## Niveaux d’autonomie par abonnement

### Abonnement 1 : Assisté

- L’IA prépare.
- L’artisan valide tout.
- Devis, factures, messages, commandes et relances nécessitent une validation manuelle.

### Abonnement 2 : Semi-automatique

- L’IA prépare et propose.
- Certaines actions simples peuvent partir automatiquement :
  - rappels de rendez-vous,
  - relances de devis après délai,
  - relances de factures,
  - alertes de stock.
- Les devis, factures et messages clients importants restent validés.

### Abonnement 3 : Autonome supervisé

- L’IA peut exécuter beaucoup plus d’actions automatiquement :
  - devis selon des règles,
  - factures après validation du devis,
  - relances,
  - commandes fournisseurs selon seuils,
  - réponses clients simples,
  - classement des documents.
- L’artisan garde :
  - un journal complet,
  - des limites de budget,
  - des règles de blocage,
  - une validation humaine pour les cas à risque,
  - une possibilité d’arrêt immédiat.

## Architecture cible

```text
Artisan
   │
   ▼
Interface Presti
   ├── Assistant de gestion
   ├── Tableau de bord
   ├── CRM
   ├── Devis
   ├── Conversations
   ├── Factures
   ├── Impayés
   ├── Inventaire
   ├── Fournisseurs
   ├── Chantiers
   ├── Documents
   └── Paramètres / abonnement
        │
        ▼
Backend Presti
   ├── Auth
   ├── Rôles
   ├── Règles métier
   ├── API agents
   ├── Webhooks
   └── Files d’attente
        │
        ├── Supabase
        │     ├── données métier
        │     ├── documents
        │     ├── mémoire / RAG
        │     └── audit
        │
        ├── n8n
        │     ├── workflows
        │     ├── intégrations
        │     ├── notifications
        │     └── relances
        │
        └── Hermes + Orca
              ├── Assistant de gestion
              ├── Devis Agent
              ├── Facturation Agent
              ├── Inventaire Agent
              ├── Fournisseur Agent
              ├── Relance Agent
              ├── Conversation Agent
              └── Document Agent
```

## Interface à construire

### Écran 1 : Accueil / Assistant

L’écran par défaut est l’assistant de gestion.

Il affiche :

- Une zone de conversation.
- Les tâches prioritaires.
- Les alertes.
- Les actions recommandées.
- Les derniers documents.
- Les derniers devis.
- Les dernières factures.
- Les chantiers en cours.

L’artisan peut écrire :

- « Prépare un devis pour M. Martin. »
- « Quelles factures sont impayées ? »
- « Est-ce que j’ai assez de carrelage pour le chantier Dupont ? »
- « Relance les devis envoyés il y a plus de 5 jours. »
- « Analyse cette facture fournisseur. »
- « Prépare un message pour relancer ce client. »

L’assistant doit pouvoir :

- Comprendre la demande.
- Demander une information manquante.
- Consulter les données autorisées.
- Proposer une action.
- Créer un brouillon.
- Demander validation.
- Exécuter si l’abonnement l’autorise.

### Écran 2 : CRM

- Liste des clients.
- Fiche client complète.
- Historique des échanges.
- Devis liés.
- Factures liées.
- Chantiers liés.
- Documents.
- Notes.
- Statut.
- Prochaine action recommandée.

### Écran 3 : Devis

- Liste des devis.
- Création assistée.
- Devis en brouillon.
- Devis à valider.
- Devis envoyés.
- Devis acceptés.
- Devis refusés.
- Relances.
- Conversion en facture.

### Écran 4 : Factures et impayés

- Factures.
- Factures impayées.
- Relances automatiques ou proposées.
- Historique des paiements.
- Rappels.
- Documents PDF.
- Statuts de paiement.

### Écran 5 : Inventaire

- Produits.
- Quantités.
- Seuils d’alerte.
- Fournisseurs.
- Commandes proposées.
- Besoins par chantier.
- Alertes de rupture.
- Historique des mouvements.

### Écran 6 : Conversations

- WhatsApp.
- E-mail.
- SMS.
- Notes internes.
- Réponses proposées par l’IA.
- Validation avant envoi selon abonnement.

### Écran 7 : Documents

- Devis.
- Factures.
- Devis fournisseurs.
- Photos de chantier.
- PDF.
- Contrats.
- Documents classés automatiquement.

## Agents à créer

1. **Assistant de gestion** : point d’entrée, compréhension des demandes, orchestration.
2. **Devis Agent** : extraction du besoin, recherche produits, calcul, rédaction du devis.
3. **Facturation Agent** : conversion devis → facture, TVA, PDF, suivi.
4. **Inventaire Agent** : vérification stock, besoins chantier, alertes, propositions de commande.
5. **Fournisseur Agent** : recherche, comparaison, demande de devis, relance.
6. **Relance Agent** : relances devis, factures, clients et chantiers.
7. **Conversation Agent** : réponses aux clients, tri des messages, escalade.
8. **Document Agent** : lecture PDF, extraction, classement, rattachement au bon client ou chantier.
9. **Reporting Agent** : chiffre d’affaires, impayés, devis, marge, charge, alertes.
10. **QA Agent** : vérifie la qualité et la cohérence des sorties IA.

## Modèle de données

Crée au minimum :

- `users`
- `organizations`
- `memberships`
- `clients`
- `contacts`
- `leads`
- `devis`
- `devis_lignes`
- `factures`
- `factures_lignes`
- `paiements`
- `produits`
- `inventaire`
- `mouvements_inventaire`
- `fournisseurs`
- `commandes`
- `commandes_lignes`
- `chantiers`
- `taches`
- `conversations`
- `messages`
- `documents`
- `relances`
- `agent_runs`
- `agent_actions`
- `tool_calls`
- `human_approvals`
- `subscription_plans`
- `permissions`
- `automation_rules`
- `errors`
- `audit_log`
- `metrics_daily`

Chaque table doit avoir :

- `id`
- `organization_id`
- `created_at`
- `updated_at`
- `created_by`
- statut
- audit
- Row Level Security

## Règles de sécurité

- Isolation stricte par `organization_id`.
- Aucun agent ne peut lire une autre organisation.
- Chaque tool call est journalisé.
- Chaque action sensible demande une permission.
- Les actions financières sont traçables.
- Les documents sont stockés de façon sécurisée.
- Les données personnelles sont minimisées.
- Le droit à la suppression doit être géré.

## Fiabilité

Implémente :

- Idempotency.
- Retry avec backoff.
- Dead letter queue.
- Rate limiting.
- Timeouts.
- Circuit breaker.
- Versioning des prompts.
- Versioning des règles.
- Audit complet.
- Mode dry-run.
- Feature flags par abonnement et par agent.

## Tests obligatoires

- Multi-tenant.
- Permissions.
- Création de devis.
- Conversion devis → facture.
- Calculs TVA et marges.
- Inventaire.
- Alertes de stock.
- Relances.
- Impayés.
- Validation humaine.
- Reprise après crash.
- Sorties LLM invalides.
- Documents illisibles.
- Mode dry-run.

## Méthode de travail

1. Analyse l’existant si je te fournis le code.
2. Pose-moi uniquement les questions bloquantes.
3. Propose la nouvelle architecture produit.
4. Propose le nouveau modèle de données.
5. Attends ma validation.
6. Implémente le socle : auth, multi-tenant, base, API.
7. Implémente l’assistant de gestion.
8. Implémente le MVP devis.
9. Implémente la facturation.
10. Implémente l’inventaire.
11. Implémente les relances.
12. Implémente les documents.
13. Implémente les abonnements et niveaux d’autonomie.
14. Ajoute les tests, l’observabilité et la documentation.

## Definition of Done

Le système est terminé seulement si :

- L’artisan arrive sur un assistant clair, pas sur un menu complexe.
- Il peut créer un devis en langage naturel.
- Il peut valider avant envoi.
- Il peut transformer un devis en facture.
- Il peut voir son inventaire et ses alertes.
- Il peut relancer devis et factures.
- Chaque action IA est traçable.
- Chaque organisation est isolée.
- Le niveau d’autonomie dépend de l’abonnement.
- Aucune action irréversible ne part sans autorisation.
- Le système est testé, documenté et déployable.

Commence par :

1. Résumé de compréhension.
2. Questions bloquantes.
3. Nouvelle architecture produit.
4. Arborescence de l’interface.
5. Modèle de données.
6. Plan de migration depuis l’existant.
7. Plan de phases.

Ne génère pas le code complet avant ma validation.

---

# ANNEXE 1 — Les données réelles de Presti au 01/11/2026

Cette annexe ne change pas la consigne ci-dessus : elle te donne ce que tu ne peux pas savoir seul (où on en est, ce qui existe, ce qui a été décidé, comment on fonctionne). Lis-la avant ta première réponse, et vérifie chaque point dans le code ou la base avant de t'appuyer dessus.

## A. Où trouver la mémoire du projet
- **Le cerveau Obsidian** (outils MCP `cerveau` : `regles_pour` avant une action à risque, `chercher` puis `lire` ; à défaut le vault `C:/Users/benja/Documents/SaaS` : `wiki/hot.md`, `wiki/concepts/`, `Decisions/Journal-Decisions.md`, `Récap-Projet.md`, la dernière note de `Produit/`). La RAM du PC est presque pleine : sous RAM basse, le cerveau n'injecte plus rien dans les sessions. Il faut alors le lire à la main.
- **`presti-ops/QG/`** sur le PC : `ETAT.md`, `DECISIONS.md` et le dernier `BILAN-*.md`.
- **Le dépôt `presti`** : `CLAUDE.md` et `AGENTS.md` (règles du dépôt), `.orchestre/contexte.md` (carte du code), `plans/` (journaux).
- **L'audit du 29/10** : `presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md`.

## B. L'état réel des outils au 01/11/2026
| Outil | État | Où |
|---|---|---|
| Claude Code | marche, avec 13 agents `presti-*` et 53 skills dans `.claude/` | session ouverte sur `C:/Users/benja/Documents/presti` |
| Hermes Agent | branché sur Claude Code depuis le 01/11 (avant : en pause depuis le 11/10) | serveur Oracle |
| Orca | à vérifier : installé ou non, et comment il se connecte | — |
| n8n | marche (Benj, 01/11) | serveur Oracle, sous Docker |
| Docker | marche (Benj, 01/11) | serveur Oracle |
| Serveur Oracle | en service (Benj, 01/11) ; disque relevé à 99 % le 11/10, à vérifier avant d'installer | — |
| Supabase | marche : projet `gorcdvmueakcncsmrouo`, `pg_cron` avec 15 tâches, un « tic » chaque minute (`/api/agents/tic`) | production |
| Vercel | offre Hobby : 2 crons au plus, tous deux pris (`/api/cron/relances` à 8 h, `/api/canaux/relever` à 7 h) | production, prestiapp.fr |
| Obsidian | marche, mais limité par la RAM du PC | PC |
| MCP | connecteurs Supabase, Vercel, GitHub, Gmail, Slack, Figma, Blender, HyperFrames, ElevenLabs… | Claude Code |
| Firecrawl | l'API en ligne est à sec (erreur 402) ; une version open source s'auto-héberge avec Docker | — |
| Scrapin | jamais branché | — |
| Apify | clé invalide sur le PC ; Crawlee, sa bibliothèque open source, s'installe gratuitement | — |
| WaveSpeed | payant à l'usage | — |
| Kokoro | gratuit, local (Apache-2.0), voix française `ff_siwis` | PC |
| Whisper | gratuit, local | PC |
| ScrapeGraphAI | installé en local | PC |
| Slack `#presti-auto`, Telegram | branchés (`lib/agents/telegram.ts`) | — |
| GitHub Actions | quota épuisé : audit, sauvegarde et qualité échouent depuis le 25/10, donc **plus aucune sauvegarde nocturne** | — |
| Relève de la boîte e-mail (cron de 8 h) | en échec : identifiants refusés | — |
| Tâches planifiées du PC | ne tournent plus depuis le 28/10 | PC |
| Budget IA | alerte dépassée (1 547 € relevés le 21/10 pour une alerte à 50 €, chiffre à revérifier) | — |

**Décision de Benj (01/11) : on ne paie aucun outil en plus.** Ce qui est payant ou à sec est remplacé par un équivalent gratuit, installé sur le serveur Oracle ou le PC.

## C. Presti en production (ne rien raser)
- **Site** : prestiapp.fr ; console sur qg.prestiapp.fr.
- **Code** : Next.js 16.4.3 sur Vercel, Supabase avec environ 180 migrations, et une RLS par `artisan_id` (garde de session sur 63 tables, migration 0138).
- **Branches et déploiement** : un push sur `main` déploie en production. Ensuite, `node scripts/attendre-deploiement.mjs`. Avant de pousser une page, `npm run build`.
- **Tests** : la vraie commande est `node scripts/tout-verifier.mjs`. Une suite absente de son tableau `SUITES` n'est jouée par personne. `npm test` n'existe pas, et `npm run lint` est mort.
- **Drapeaux** : `lib/flags.ts` cache ce qui n'est pas fini. On colle la migration, PUIS on lève le drapeau.
- **Offres** : elles sont dans `lib/plans.ts`, seule source de vérité.
  - **Studio** : 59 €/mois. L'IA prépare et l'artisan valide. Essai de 7 jours sans carte.
  - **Signature** : 99 €/mois. Envoi autonome, pilote automatique, CRM. Essai de 21 jours sans carte.
  - **Business** : compte interne du fondateur.
  - **Essentiel** : n'est plus vendu.
  - **Troisième offre décidée le 01/11** : « Presti pour l'entreprise », sur mesure, sur démonstration et sur devis, sans prix public. Elle sert aux entreprises à plusieurs collaborateurs et aux architectes qui veulent intégrer Presti à leur organisation, avec des automatisations IA branchées sur leurs outils.
- **White-label** : les sites et pages des artisans (`/site`, `/p`) et les e-mails envoyés à leurs clients n'affichent jamais « Presti ».
- **Données** : aucune donnée réelle dans les tests, aucun secret versionné, aucune donnée de prospect ou de client envoyée à un modèle gratuit en ligne.

## D. L'assistant de gestion tel qu'il est (audit du 29/10 et commits depuis)
- **L'assistant** vit dans `lib/assistant/*` :
  - les fichiers `boucle`, `outils`, `outils-actions`, `actions-serveur`, `executeurs`, `cartes`, `briefing`, `cadrage`, `garde`, `journal`, `crm`, `magasin`… ;
  - environ 21 outils de lecture et 45 outils d'action ;
  - les cartes à valider dans `assistant_actions` et le journal dans `assistant_journal`.
- **Depuis le commit `8022cc6` (29/10)**, les outils d'action sont toujours donnés : avant, l'assistant n'agissait que sur des mots-clés, dans `lib/assistant/cadrage.ts`. Ce commit ajoute :
  - le mode « fait tout seul » ;
  - les outils `rechercher_fournisseurs`, `retenir_resultat`, `exporter_tableau` (Excel), `creer_facture_libre`, `supprimer_article` et `preparer_liste_achat`.
- **Le commit `a51a12a`** élargit la recherche de fournisseurs aux mots-clés courts et affiche « sans TVA » sur une facture en franchise.
- **Le pilote automatique** vit dans `lib/pilote/*`, avec la table `actions_auto` :
  - délai d'annulation de 10 minutes et plafond de 20 actions par jour ;
  - une liste fermée d'outils pilotables (`OUTIL_TYPE`) ;
  - des prix sourcés obligatoires (`prixSources`) et une attente maximale (`ATTENTE_MAX_MS`).

  Sa file n'est remplie que par `piloterCarte` et `piloterProposition`. **Aucun détecteur ne la remplit.**
- **Constat en production le 29/10** :
  - `assistant_actions` : 0 ligne ; `actions_auto` : 0 ; `pilote_reglages` : 0 ; 6 appels d'outils en tout.
  - Le compte fondateur a 0 tarif, 0 facture, 0 chantier et 0 stock.
  - Toutes les automatisations sont désactivées par défaut.
  - La plomberie marche : tic chaque minute, pilote, cartes, garde-fous.
- **Le reste du produit** existe déjà :
  - CRM, devis et PDF (`lib/DevisPDF.tsx`), factures ;
  - relances (cron de 8 h), compta (l'IA trie les fichiers bruts, le code fait tous les calculs, PR #16) ;
  - inventaire (`lib/inventaire/`), pointage, rendez-vous, équipe de chantier (`chantier_equipe`) ;
  - messagerie, plateforme publique, Stripe.
- **Pages** : dashboard, crm, assistant, devis, factures, inventaire, chiffres, plateforme, messages, controle, parametres, abonnement, tarifs, onboarding, pointage, rendez-vous, studio, site, p…
- **Canaux** :
  - L'e-mail part au nom de l'artisan, son adresse en `Reply-To` (`lib/email.ts`).
  - WhatsApp (`canauxWhatsapp`) et les réseaux (`canauxReseaux`) sont derrière des drapeaux baissés.
  - Le SMS n'existe pas encore.
- **Le modèle de données** : chaque ligne porte `artisan_id`, protégée par la RLS (garde de session sur 63 tables, migration 0138). Il n'y a pas encore de table d'organisations ni de membres.
- **Le plan détaillé, couche par couche**, de l'automatisation de l'artisan est dans `presti-ops/assistant-gestion/PROMPT-AUTOMATISATION-ARTISAN.md` (29/10) :
  - la capture des événements ;
  - les détecteurs ;
  - la mise en route, par import des tarifs, des clients et du stock ;
  - la priorisation et la rédaction ;
  - la porte de conformité ;
  - la boîte « À valider » ;
  - l'exécution ;
  - la boucle d'amélioration.

## E. Décisions de Benj du 01/11 pour ce chantier
- **Trois offres** :
  - **Studio** : l'IA prépare, l'artisan valide.
  - **Signature** : envoi autonome, pilote automatique. C'est la capacité `plateforme.ia.auto` ; sous Signature, `modeEffectif` rétrograde avec le motif `verrou_offre`.
  - **« Presti pour l'entreprise »** : sur mesure, sur démonstration et sur devis, sans prix public. Elle intègre Presti à l'organisation du client et branche des automatisations IA sur ses outils.
- **Les vraies organisations multi-membres se font maintenant** (pas plus tard).
- **SMS : oui.**
- **Outils** : Claude Code, Hermes Agent, Orca, n8n, plus les autres outils cités dans ce prompt.

## F. Règles produit déjà écrites qui s'appliquent
- **Positionnement « automatique »** (25/10) : on le dit partout, mais de façon vraie selon l'offre. Interdits :
  - les appels téléphoniques gérés ;
  - les rendez-vous pris seuls ;
  - les notifications inventées ;
  - le devis envoyé seul sous Studio ;
  - les paiements encaissés par l'IA.
- **Anti-fabrication** (`CLAUDE.md`) : l'IA n'invente jamais un prix sourcé, un fournisseur absent de la liste de l'artisan, un délai intenable ni un créneau. Le code calcule les montants.
- **Le vocabulaire technique** (agent, workflow, n8n, MCP, prompt) n'apparaît jamais devant l'artisan.
- **Refonte du 18/10** (note du cerveau « Refonte 18-10 pistes A et B ») : la piste A « Instrument » est prévue pour la console. Des travaux existent peut-être sur la branche `refonte-1018` et derrière le drapeau `consoleV2`, à vérifier.
- **SMS** : pour un client de l'artisan, un SMS commercial exige son consentement ; un SMS lié à son chantier (rappel, devis prêt, paiement) relève de la relation en cours. Chaque SMS a un coût à l'unité.
- **Sauvegarde** : avec le quota GitHub Actions épuisé, il n'y a plus de sauvegarde nocturne depuis le 25/10. À rétablir avant toute migration lourde, comme celle des organisations.

---

# ANNEXE 2 — Précisions de mise en œuvre (01/11/2026)

Ces précisions appliquent la consigne ci-dessus à Presti tel qu'il est : comment brancher chaque partie du prompt sur l'existant, les règles du dépôt, les tests et la première réponse attendue. Elles complètent le prompt, elles ne le remplacent pas. En cas de doute : la consigne ci-dessus, les décisions de Benj du 01/11 et la loi passent avant.

## Règles de travail sur Presti
- Les règles de `CLAUDE.md` et `AGENTS.md` du dépôt `presti` s'appliquent en entier (identifiants et commentaires en français, drapeau dans `lib/flags.ts` pour tout ce qui n'est pas fini, migration collée PUIS drapeau levé, aucun chiffre non sourcé, aucun secret versionné, zéro donnée réelle dans les tests, auditeurs distincts de celui qui corrige, poussé n'est pas déployé).
- **On ne rase rien** : Presti est en production (≈180 migrations, assistant, CRM, devis, factures, inventaire, pilote automatique, prospection serveur). Chaque prompt commence par **l'inventaire de l'existant**, puis branche et corrige pas à pas.
- **Aucune action irréversible ni sortante sans Benj** (publication, dépense, création de compte, migration en production, suppression, envoi à un client d'artisan hors des réglages de l'artisan), **sauf la prospection par e-mail**, que Benj a voulue automatique et sans lui le 01/11 : elle part seule dans les limites du prompt 1 (porte de conformité, juges, plafonds, disjoncteurs, interrupteur général). Préparer, simuler, mesurer, brouillonner : oui, sans attendre.
- **Installer un outil gratuit** (open source ou auto-hébergé) sur le serveur Oracle ou le PC est autorisé par Benj (01/11) : licence vérifiée et notée, aucune carte bancaire, aucun abonnement. Un outil auto-hébergé qui touche des données de prospect ou de client s'inscrit au registre des traitements (`docs/registre-traitements`) avec l'hébergeur et la région du serveur.
- **Benj veut de l'autonomie** : chaque question bloquante vient avec une réponse par défaut ; tout ce qui se défait avance avec ce défaut.
- **RGPD et vérité** : aucune donnée inventée, chaque fait a une source et une date ; aucune donnée de prospect vers un modèle gratuit en ligne ; une preuve est une sortie de commande, pas une phrase.
- **Un test vert ne prouve que ce qu'il regarde** : chaque suite peut rougir (mutation prouvée), entre au lanceur `scripts/tout-verifier.mjs`, et se joue hors ligne.


### 1. Ta mission

Tu es architecte logiciel senior, expert produit SaaS B2B et ingénieur d'agents IA. Ta mission : faire de l'assistant de gestion de Presti **un vrai bras droit qui agit pour l'artisan** (devis, factures, relances, compta, planning, stock, clients, messages), **en partant de ce qui existe et marche déjà**, sans rien raser.

Le constat de départ est écrit dans `presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md` : la plomberie marche (tic chaque minute, pilote automatique, cartes, garde-fous), mais l'assistant n'a jamais rien automatisé, parce que les comptes sont vides, qu'aucun détecteur ne remplit sa file et que tout est désactivé par défaut. Le plan détaillé couche par couche est dans `presti-ops/assistant-gestion/PROMPT-AUTOMATISATION-ARTISAN.md` : **c'est l'annexe technique de ce prompt, lis-la en entier.**

### 2. Ce qui existe déjà (à inventorier en premier, rien à réécrire)

- **L'assistant** `lib/assistant/*` : boucle, outils de lecture (≈21) et d'action (≈45), cartes à valider (`assistant_actions`), journal (`assistant_journal`), briefing, mémoire, garde. Depuis le commit `8022cc6` (29/10), les outils d'action sont toujours donnés (plus de mots-clés), un mode « fait tout seul » existe, ainsi que `rechercher_fournisseurs`, `retenir_resultat`, `exporter_tableau`, `creer_facture_libre`, `supprimer_article`, `preparer_liste_achat`.
- **Le pilote automatique** `lib/pilote/*` et la table `actions_auto` : délai d'annulation de 10 minutes, plafond de 20 actions par jour, liste fermée d'outils pilotables, prix sourcés obligatoires.
- **Le reste du produit** : CRM, devis et PDF, factures, relances (cron de 8 h), compta (dépôt de fichiers bruts, tri par l'IA, calculs par le code), inventaire, pointage, rendez-vous, équipe de chantier, messagerie, plateforme publique, canaux (e-mail branché ; WhatsApp et réseaux derrière des drapeaux baissés), Stripe.
- **Les offres** (`lib/plans.ts`, seule source de vérité) : **Studio** 59 €/mois (l'IA prépare, l'artisan valide ; essai 7 jours) et **Signature** 99 €/mois (envoi autonome, pilote automatique, CRM ; essai 21 jours). Business est interne (compte fondateur). Essentiel n'est plus vendu. Une troisième offre, « Presti pour l'entreprise » sur mesure, est décidée le 01/11 (§3.1).
- **Le multi-locataire actuel** : chaque ligne porte `artisan_id`, protégée par RLS (garde de session sur 63 tables, migration 0138). L'équipe existe déjà (`chantier_equipe`, pointage).

### 3. Ce que Benj demande, traduit dans le réel

### 3.1 Les trois niveaux d'autonomie
Benj veut trois niveaux : **1. l'IA propose** ; **2. l'IA prépare et l'artisan valide en un geste** ; **3. l'IA fait seule dans des limites fixées et rend compte**. Ils se posent sur l'existant :
| Niveau | Où il vit déjà | Offre |
|---|---|---|
| 1. Propose | briefing, suggestions de l'assistant | Studio, Signature, Entreprise |
| 2. Prépare, l'artisan valide | cartes `assistant_actions`, boîte « À valider » | Studio, Signature, Entreprise |
| 3. Fait seul, sous limites | pilote `actions_auto` (10 min pour annuler, plafond, liste fermée) | Signature (`plateforme.ia.auto`) et Entreprise (types d'action convenus par contrat) ; jamais Studio |

Le niveau se règle **par type d'action** (relance de devis, rappel de paiement, réponse à un prospect, commande de stock…), pas pour tout le compte.

**Troisième offre (décision de Benj, 01/11) : « Presti pour l'entreprise », sur mesure.** Pour les entreprises à plusieurs collaborateurs (et les architectes) qui veulent intégrer Presti à leur organisation et brancher des automatisations IA sur leurs propres outils. Elle se vend sur démonstration et sur devis, **sans prix public** ; elle ouvre les organisations multi-membres (§3.3), les intégrations sur mesure par n8n et le niveau 3 sur les types d'action convenus. Dans `lib/plans.ts`, elle s'ajoute comme une offre « sur devis » sans prix Stripe en libre-service (l'abonnement se crée à la main après accord) ; c'est un changement qui touche à l'argent : il est écrit par la session principale, testé (`scripts/essais-gratuits-qa.mjs` et les tests de la grille), et ne change ni Studio ni Signature.

### 3.2 Ce qui ne s'automatise jamais (même au niveau 3)
Envoyer un devis signé ou modifier un prix sans source ; encaisser, rembourser ou toucher un moyen de paiement ; déclarer à l'URSSAF ou aux impôts ; supprimer des données ; parler au nom de l'artisan sur un sujet d'escalade (litige, sinistre, « fuite », menace, avocat) ; inventer un créneau, un délai, un fournisseur ou un prix. Ces gestes restent des cartes, toujours.

### 3.3 Entreprises et membres (à faire maintenant, décision de Benj du 01/11)
Les vraies organisations multi-membres se construisent **dans ce chantier**, mais par pas réversibles sur l'existant (180 migrations et la RLS reposent sur `artisan_id`) :
1. Migration additive : tables `organisations` et `membres` (rôles : titulaire, associé, administratif, compagnon, invité) ; chaque artisan existant reçoit son organisation, dont il est titulaire ; aucune colonne supprimée.
2. Une fonction SQL unique (par exemple `peut_acceder(artisan_id)`) qui dit si l'utilisateur courant est membre de l'organisation de cet artisan, avec son rôle ; les politiques RLS existantes passent dessus **table par table**, chaque pas testé (isolation entre deux organisations, droits par rôle : un compagnon voit ses chantiers et son pointage, pas la compta).
3. `artisan_id` reste la clé de rattachement des données ; un `organisation_id` ne s'ajoute à une table que si un besoin réel l'exige.
4. Écran d'équipe : inviter, changer un rôle, retirer un membre ; journal de qui a fait quoi. Derrière un drapeau, migration collée PUIS drapeau levé.
Avant la première migration : le plan complet (tables, politiques touchées, ordre, retour arrière) validé par Benj, et une sauvegarde vérifiée.

### 3.4 Hermes, n8n, Orca, Docker (disponibles au 01/11)
- **Supabase reste la source de vérité et la file** : événements, actions, statuts, journal. Rien d'important ne vit seulement dans n8n ou dans Hermes.
- **n8n (serveur Oracle, Docker)** porte les intégrations externes (fournisseurs, calendriers, outils des clients « entreprise »), les déclencheurs planifiés que Vercel Hobby ne peut pas offrir, et les rappels de validation. Il appelle les routes de Presti avec une clé de service dédiée, à droits limités, jamais exposée côté client.
- **Hermes** est l'assistant de Benj (fondateur), branché sur Claude Code : il lit l'état et lance des tâches. Il n'est **jamais** monté devant un artisan ou un client (white-label), qui ne parle qu'à l'assistant de Presti.
- **Orca**, s'il est installé, encadre l'exécution des agents (sessions, permissions, contrôle) ; sinon on s'en passe.
- **Les agents** de ton prompt (Devis, Facture, Relance, Fournisseur, Stock, Planning, Compta, Client) deviennent des **familles d'outils et de détecteurs** de l'assistant existant, pas des processus séparés.
- **Mémoire** : tables (faits retenus, préférences) et recherche plein texte Postgres ; `pgvector` (extension gratuite de Supabase) seulement si un besoin mesuré l'exige.
- Les données d'un artisan qui passent par n8n restent sur le serveur Oracle (inscrit au registre des traitements) et ne partent jamais vers un modèle gratuit en ligne.

### 3.5 Canaux
- **E-mail** : il part au nom de l'artisan, son adresse en `Reply-To` (white-label : jamais « Presti » devant un client).
- **SMS (décision de Benj, 01/11) : oui**, entre l'artisan et ses propres clients : rappel de rendez-vous, devis prêt, rappel de paiement. Le fournisseur est choisi au moins cher, avec le coût par SMS affiché à Benj avant le premier envoi réel (c'est une dépense). Le numéro ou le nom d'expéditeur est celui de l'artisan. Le client a donné son numéro pour ce chantier ; le SMS contient STOP ; rien de commercial sans consentement. Il est livré derrière un drapeau.
- **WhatsApp et réseaux** restent derrière leurs drapeaux baissés : migration collée PUIS drapeau levé.
- **Téléphone** : l'IA ne passe ni ne décroche d'appel.

### 4. Les couches à construire (détail dans l'annexe)

0. **Réparer le socle d'abord** (rien ne s'automatise sur une base qui ne se sauvegarde plus) : sauvegarde nocturne hors GitHub Actions (quota épuisé depuis le 25/10 : tâche n8n ou `pg_cron` sur le serveur Oracle, copie chiffrée hors du serveur), relève de boîte e-mail en échec, tâches du PC arrêtées le 28/10, cerveau qui ne s'injecte plus.
1. **Mise en route** : un compte vide n'automatise rien. Import guidé des tarifs, clients, stock, modèles de devis (fichier, photo, export d'un autre logiciel) ; l'assistant pose 5 questions au plus et remplit le reste.
2. **Capture des événements métier** (`evenements_metier`) : devis envoyé, sans réponse, accepté ; facture échue ; stock sous le seuil ; rendez-vous demain ; prospect entrant sans réponse ; pièce de compta déposée.
3. **Détecteurs** (table catalogue, une ligne par règle, activables par artisan) : chacun lit les événements et produit une carte ou une action pilotée, selon le niveau réglé.
4. **Priorisation** : argent qui dort d'abord (factures échues, devis acceptés non facturés), puis clients qui attendent, puis le reste.
5. **Rédaction** par le modèle au palier le moins cher, sous plafond de coût par artisan ; le code calcule tous les montants, jamais le modèle.
6. **Porte de conformité** : liste §3.2, mentions légales des devis et factures, TVA ou franchise, RGPD.
7. **Une seule boîte « À valider »** et un briefing poussé le matin (notification de l'app, e-mail si l'artisan le veut) : chaque carte se valide, se modifie ou se refuse en un geste.
8. **Exécution et suivi** : statuts (préparée, validée, envoyée, échouée, annulée), relance d'une action échouée, journal lisible par l'artisan (« ce que j'ai fait pour vous cette semaine »).
9. **Boucle d'amélioration** : chaque refus ou modification de l'artisan est retenu et ajuste le détecteur ou le gabarit ; jamais sans trace.

### 5. L'écran

L'accueil de la console devient l'assistant : briefing du jour, boîte « À valider », ce qui a été fait seul (annulable pendant 10 minutes), réglage du niveau d'autonomie par type d'action. Il suit la **piste A « Instrument »** de la refonte du 18/10 (surface de travail : dense, calme, lisible ; `presti-design`) et se construit derrière un drapeau (vérifie si `consoleV2` existe déjà sur la branche `refonte-1018` avant d'en créer un). Le jargon technique (agent, workflow, LLM, pipeline) n'apparaît jamais devant l'artisan.

### 6. Fiabilité

Idempotence de chaque action (clé unique : artisan, type, objet, jour), reprise après panne, délai maximal d'attente, plafonds par jour et par coût, disjoncteur par détecteur (il se coupe seul après N échecs), aucune donnée d'un artisan visible par un autre (test d'isolation RLS), aucune clé côté client, aucun envoi en double.

### 7. Tests

Hors ligne, chacun capable de rougir (mutation prouvée), inscrits au lanceur `scripts/tout-verifier.mjs` :
- chaque détecteur sur des données fictives (déclenche quand il faut, se tait sinon) ;
- un geste de la liste §3.2 ne passe jamais en automatique, même réglé au niveau 3 ;
- niveau 3 refusé sous Studio (motif `verrou_offre`) ; droits par rôle dans une organisation ;
- délai d'annulation respecté, plafond de 20 par jour respecté ;
- isolation entre deux artisans ;
- montants calculés par le code, jamais repris d'un texte du modèle ;
- mode à blanc : tout se prépare, rien ne sort.

### 8. Méthode

Architecture d'abord, validée par Benj avant le code. Puis pas réversibles, chacun compilable et déployable : `npm run build` en local, push, `node scripts/attendre-deploiement.mjs`, vérification en direct, nettoyage des comptes de test. Les auditeurs sont des sous-agents distincts de celui qui corrige. Chaque fin de chantier : note de session dans le vault, `Récap-Projet`, `Journal-Decisions`.

### 9. Première réponse attendue

1. L'inventaire de l'existant (assistant, pilote, offres, tables, drapeaux) en 15 lignes, au fichier:ligne.
2. Le plan du socle (phase 0) : sauvegarde, boîte e-mail, tâches.
3. L'architecture en Mermaid, posée sur l'existant, avec ce qui est ajouté en couleur.
4. Les 10 premiers détecteurs, classés par argent récupéré pour l'artisan.
5. Le plan des organisations (§3.3) : tables, politiques RLS touchées dans l'ordre, retour arrière.
6. Les questions encore ouvertes, avec un défaut : fournisseur de SMS (défaut : le moins cher en France, coût montré avant le premier envoi), notification du briefing (défaut : notification de l'app), contenu exact de l'offre entreprise (défaut : organisations, intégrations n8n, niveau 3 convenu par contrat).

### Definition of Done

- Sur un compte de test rempli par la mise en route, l'assistant produit seul ses cartes du matin sans qu'on lui parle.
- Sous Signature, une relance de devis réglée au niveau 3 part seule, s'annule pendant 10 minutes et apparaît au journal.
- Aucun geste de la liste §3.2 n'est automatisable ; aucun montant ne vient du modèle.
- Deux membres d'une même organisation travaillent sur le même compte avec des droits différents ; deux organisations ne voient jamais leurs données respectives.
- Sauvegarde nocturne de nouveau verte ; tests au lanceur, verts et capables de rougir.
</pasted_content id="8bb5">

