PROMPT 1 — Système de prospection automatique Presti

Tu es un architecte logiciel senior spécialisé en systèmes d’agents IA, automatisation B2B, scraping conforme, prospection d’artisans, n8n, MCP, Supabase et fiabilité en production.

Ta mission : construire un système complet de prospection automatique pour Presti.

Presti est un SaaS de gestion pour artisans : devis, factures, clients, inventaire, chantiers, relances et agents IA.

L’objectif de ce système est de trouver des artisans et petites entreprises du bâtiment qui ont de vraies difficultés opérationnelles, puis de les qualifier et préparer des messages ultra-personnalisés expliquant précisément comment Presti peut les aider.

## Infrastructure imposée

Utilise cette stack :

- Claude Code : développement, maintenance et amélioration du système.
- Hermes Agent : assistant IA persistant, orchestration intelligente et interface conversationnelle.
- Orca : harness d’exécution des agents, sessions, permissions, mémoire et contrôle.
- n8n : orchestration des workflows, déclencheurs, intégrations, relances et validations humaines.
- Obsidian : mémoire stratégique, ICP, offres, playbooks, objections, décisions produit.
- Supabase / PostgreSQL : source de vérité opérationnelle.
- MCP : connexion des agents aux outils.
- Firecrawl : crawling et extraction de sites web.
- Scrapin : données LinkedIn professionnelles lorsque l’accès est légitime.
- Apify : actors de scraping Google Maps, annuaires, réseaux sociaux et sources sectorielles.
- SERP / recherche web : détection de signaux publics.
- Vibe Prospecting : transformation d’une intention naturelle en plan de recherche structuré.
- Slack / Telegram : alertes, validation humaine et suivi.
- Docker : déploiement.
- Pydantic ou Zod : validation stricte des sorties IA.

## Objectif métier

Trouver des artisans qui présentent des signaux réels de difficulté ou d’opportunité :

- Ils reçoivent beaucoup de demandes mais répondent lentement.
- Ils ont des avis mentionnant des délais, devis ou suivi client.
- Ils recrutent, ce qui peut indiquer une croissance ou une surcharge.
- Ils ont un site obsolète, sans devis en ligne ou sans processus clair.
- Ils utilisent encore des méthodes manuelles : WhatsApp, papier, tableurs.
- Ils publient sur Facebook, Instagram, LinkedIn ou TikTok mais semblent surchargés.
- Ils parlent de problèmes de devis, factures, relances, inventaire, planning ou administratif.
- Ils sont artisans du bâtiment, plombiers, électriciens, menuisiers, maçons, paysagistes, carreleurs, peintres, couvreurs, chauffagistes, serruriers, etc.

L’objectif n’est pas d’envoyer un maximum de messages. L’objectif est de trouver les bons artisans, comprendre leur situation réelle et proposer une aide pertinente.

## Architecture du système

Construis ces couches :

### 1. Vibe Prospecting

L’utilisateur peut écrire une intention naturelle :

« Trouve des plombiers dans un rayon de 50 km autour de La Rochelle, avec entre 2 et 20 salariés, qui recrutent ou ont des avis mentionnant des délais. »

L’agent doit :

1. Comprendre l’intention.
2. Créer un plan de recherche.
3. Générer des requêtes web, Google Maps, LinkedIn et sources locales.
4. Choisir les outils adaptés : Apify, Firecrawl, Scrapin, SERP, navigation agentique.
5. Extraire les candidats.
6. Vérifier chaque candidat avec au moins deux sources quand possible.
7. Normaliser les résultats.
8. Marquer les données incertaines comme `unverified`.
9. Envoyer les candidats vers l’enrichissement et la qualification.

Chaque session doit produire :

{
  "session_id": "string",
  "natural_language_goal": "string",
  "search_plan": [],
  "queries_executed": [],
  "tools_used": [],
  "sources_checked": [],
  "candidates_found": [],
  "candidates_rejected": [],
  "confidence": 0.0,
  "cost_estimate": {},
  "next_recommended_action": "string"
}

### 2. Ingestion et déduplication

Chaque lead entrant doit être normalisé :

{
  "source": "string",
  "source_id": "string",
  "company_name": "string",
  "company_domain": "string | null",
  "contact_name": "string | null",
  "contact_email": "string | null",
  "contact_role": "string | null",
  "phone": "string | null",
  "linkedin_url": "string | null",
  "facebook_url": "string | null",
  "instagram_url": "string | null",
  "website_url": "string | null",
  "city": "string | null",
  "department": "string | null",
  "sector": "string | null",
  "company_size": "string | null",
  "signals": [],
  "pain_signals": [],
  "verification_status": "verified | partially_verified | unverified",
  "raw_payload": {},
  "ingested_at": "ISO 8601"
}

Implémente :

- Déduplication par e-mail.
- Déduplication par téléphone normalisé.
- Déduplication par domaine.
- Déduplication par URL LinkedIn.
- Déduplication par empreinte nom + ville + activité.
- Liste d’exclusion.
- Exclusion des clients existants.
- Exclusion des concurrents.
- Exclusion des contacts désabonnés.
- Exclusion des domaines interdits.

### 3. Enrichissement

Pour chaque lead, récupère uniquement les données utiles :

- Site web.
- Services proposés.
- Zone d’intervention.
- Taille estimée.
- Avis Google, Facebook ou autres sources publiques.
- Présence sur les réseaux.
- Offres d’emploi.
- Signaux de croissance.
- Signaux de difficulté opérationnelle.
- Technos utilisées si pertinent.
- Contact décisionnaire si disponible.

Règles :

- Ne jamais inventer une donnée.
- Toute donnée incertaine devient `null` ou `unverified`.
- Chaque donnée doit avoir une source et une date.
- Si une API échoue, le lead ne doit pas être perdu.
- Les échecs doivent partir en retry, puis en dead letter queue.

### 4. Détection des douleurs

Crée un agent `Pain Signal Detector`.

Il analyse les signaux publics et retourne :

{
  "lead_id": "string",
  "pain_score": 0,
  "detected_pains": [],
  "evidence": [],
  "confidence": 0.0,
  "recommended_angle": "string",
  "risks": []
}

Types de douleurs à détecter :

- Mauvaise gestion des devis.
- Réponses lentes aux clients.
- Avis négatifs sur le suivi ou les délais.
- Manque de présence en ligne.
- Recrutement en cours.
- Activité sur les réseaux mais faible conversion.
- Absence de processus digital.
- Utilisation de méthodes manuelles.
- Croissance rapide probable.
- Problèmes de planning ou de relance.

Chaque douleur doit être prouvée par une source :

- Avis client.
- Offre d’emploi.
- Post réseau social.
- Contenu de site.
- Annonce.
- Actualité publique.

Interdiction absolue d’inventer une douleur.

### 5. Qualification

Crée un agent `Qualification Agent`.

Sortie stricte :

{
  "lead_id": "string",
  "fit_score": 0,
  "pain_score": 0,
  "intent_score": 0,
  "priority": "hot | warm | cold | discard",
  "icp_match": true,
  "qualification_reasons": [],
  "disqualification_reasons": [],
  "missing_information": [],
  "confidence": 0.0,
  "recommended_action": "draft_outreach | research_more | nurture | discard",
  "risks": []
}

Règles :

- `fit_score` : correspondance avec l’ICP Presti.
- `pain_score` : intensité des difficultés détectées.
- `intent_score` : signaux d’ouverture ou d’urgence.
- Si `confidence < 0.7`, action forcée : `research_more`.
- Si le lead est exclu, action forcée : `discard`.
- Aucun lead ne peut aller en rédaction sans qualification validée.

L’ICP doit être dans `config/icp.yaml` :

- Métiers cibles.
- Zones géographiques.
- Tailles d’entreprise.
- Signaux positifs.
- Signaux négatifs.
- Exclusions.
- Règles de scoring.
- Seuils de passage.

### 6. Recherche et message ultra-personnalisé

Pour les leads `hot` ou `warm` :

- Recherche un angle précis fondé sur des faits vérifiés.
- Identifie la douleur principale.
- Explique comment Presti peut aider concrètement.
- Génère 3 angles possibles.
- Sélectionne le meilleur.
- Rédige un message court, humain et personnalisé.

Sortie attendue :

{
  "lead_id": "string",
  "selected_angle": "string",
  "angle_rationale": "string",
  "facts_used": [],
  "message_channel": "email | linkedin | facebook | instagram",
  "message_subject": "string | null",
  "message_body": "string",
  "personalization_score": 0.0,
  "compliance_check": "passed | failed",
  "human_review_required": true
}

Règles de rédaction :

- Maximum 100 mots.
- Une seule idée principale.
- Montrer que tu as compris leur situation réelle.
- Expliquer concrètement ce que Presti peut leur apporter.
- Proposer une action simple : voir une démo, recevoir un exemple de devis, ou échanger 10 minutes.
- Pas de promesse non vérifiable.
- Pas de flatterie générique.
- Pas de « J’espère que vous allez bien ».
- Pas de ton agressif.
- Pas de faux problème inventé.
- Langue adaptée au prospect.
- Mention d’opt-out dans les e-mails.

### 7. Conformité

Crée une étape `compliance_gate` indépendante de l’IA.

Avant toute mise en file :

- Vérifie les exclusions.
- Vérifie les désabonnements.
- Vérifie les doublons.
- Vérifie les quotas quotidiens.
- Vérifie la conformité RGPD.
- Vérifie la présence d’un opt-out.
- Vérifie que le message ne contient pas de promesse interdite.
- Vérifie que les affirmations sont sourcées.
- Vérifie que la validation humaine est obtenue.

Si échec :

- Statut : `blocked`.
- Raison enregistrée.
- Aucun envoi.
- Alerte Slack.

### 8. Validation humaine

Aucun message ne part sans validation humaine en phase initiale.

Crée un flux de validation via Slack ou n8n :

- Affichage du lead.
- Affichage des douleurs détectées.
- Affichage des sources.
- Affichage du score.
- Affichage du message.
- Boutons : Approuver, Modifier, Rejeter, Mettre en pause.
- Historique des décisions.

### 9. Suivi et amélioration

Ajoute :

- Traitement des réponses.
- Détection des intérêts, refus, hors-sujet et demandes de démo.
- Arrêt immédiat en cas de refus ou désabonnement.
- Rapport hebdomadaire.
- Analyse des meilleurs angles.
- Analyse des sources les plus rentables.
- Analyse des faux positifs.
- Suggestions d’amélioration soumises à validation humaine.

## Tables obligatoires

Crée au minimum :

- `leads`
- `companies`
- `contacts`
- `lead_sources`
- `discovery_sessions`
- `discovery_queries`
- `scraping_runs`
- `scraping_results`
- `lead_events`
- `pain_signals`
- `enrichment_records`
- `qualification_results`
- `message_drafts`
- `approved_messages`
- `sent_messages`
- `message_events`
- `sequences`
- `exclusion_list`
- `human_reviews`
- `agent_runs`
- `tool_calls`
- `mcp_tool_invocations`
- `errors`
- `dead_letter_queue`
- `metrics_daily`
- `prompt_versions`
- `config_versions`
- `audit_log`

## Fiabilité

Implémente :

- Retry avec backoff exponentiel.
- Timeout sur chaque appel externe.
- Circuit breaker.
- Rate limiting.
- Dead letter queue.
- Locks anti-concurrence.
- Idempotency keys.
- Reprise après crash.
- Mode dry-run.
- Feature flags.
- Logs structurés.
- Traçabilité complète.

## Tests obligatoires

Écris des tests pour :

- Déduplication.
- Normalisation.
- Exclusions.
- Parsing Apify, Firecrawl, Scrapin et SERP.
- Détection des douleurs.
- Rejet des données inventées.
- Validation stricte des sorties LLM.
- Reprise après erreur.
- Quotas.
- Conformité.
- Validation humaine.
- Mode dry-run.

## Méthode de travail

1. Pose-moi uniquement les questions bloquantes.
2. Propose l’architecture et le modèle de données.
3. Attends ma validation.
4. Implémente le squelette avec tests.
5. Implémente l’ingestion et la déduplication.
6. Implémente la discovery.
7. Implémente l’enrichissement.
8. Implémente la détection des douleurs.
9. Implémente la qualification.
10. Implémente la rédaction.
11. Implémente la conformité et la validation humaine.
12. Implémente le suivi et les métriques.
13. Ne passe à l’étape suivante que si les tests passent.

## Definition of Done

Le système est terminé seulement si :

- Je peux écrire une intention naturelle.
- Le système trouve des artisans pertinents.
- Chaque lead a des sources et un niveau de vérification.
- Les douleurs détectées sont prouvées.
- Les messages sont personnalisés et factuels.
- Aucun message ne part sans validation humaine.
- Le système survit aux erreurs API.
- Aucun doublon n’est créé.
- Je peux arrêter et relancer sans perte.
- Je peux voir coûts, erreurs, décisions et résultats.

Commence par :

1. Résumé de compréhension en 10 lignes.
2. Questions bloquantes.
3. Architecture Mermaid.
4. Modèle de données.
5. Plan de phases.
6. Risques et mitigations.

Ne génère pas le code complet avant ma validation de l’architecture.

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

## D. La prospection déjà en place
- **Côté serveur (production)**
  - Le code vit dans `lib/agents/acquisition/` : recenseur, rge, sirene, lecteurSite, douleurs, scoreDouleur, plaintes, plaintesParTheme, redacteur, gabaritsPremierContactV2, jugeFaits, secondJuge, conformite, disjoncteurs, jauges, facteur, expediteur, repondeur, standardiste, rendezVous, maquettesLien, porteurFormulaire, entrant, faq, affirmations, modeles…
  - Les données sont dans les tables `ops.*`. Au 01/11 : 5 040 prospects, 186 signaux, 52 envois, 32 oppositions, 1 149 réponses relevées. Il existe aussi `ops.accords_benj`, `ops.quotas_canaux`, `ops.couts`, `ops.opposition` et `ops.maquettes`.
  - Les tâches `pg_cron` `acq-*` couvrent : recenseur, rge, rédacteur, juge des faits, facteur du matin et du soir, répondeur, standardiste, purges (dont `acq-purge-prospects`).
  - L'écran de suivi est dans `/controle`.
- **Côté PC** : le dossier `presti-ops/agents-prospection/` contient :
  - `MANUEL.md`, `ENVOI.md` et `controles.py` ;
  - la chasse aux plaintes ;
  - Harvey, qui s'appuie sur des sources gratuites : OpenStreetMap et les nouveaux domaines .fr de l'AFNIC ;
  - `ENVOIS.csv`, `OPPOSITIONS.csv` et `FEU-VERT.txt`.

  Ses tâches planifiées ont envoyé 47 premiers e-mails depuis le 26/10 : 7 réponses, aucune chaude, 3 STOP. Elles sont arrêtées depuis le 28/10.
- **Deux chaînes coexistent donc**, une sur le serveur et une sur le PC. **Choix du 01/11 : c'est la chaîne serveur qui fait foi.** Elle a déjà la boîte des envois, l'opposition en base, les quotas, les disjoncteurs et l'écran, et elle tourne sans le PC. Le PC et le serveur Oracle alimentent `ops.*`. L'historique du PC (`ENVOIS.csv`, `OPPOSITIONS.csv`) doit y être importé, pour que la règle « un message à vie » couvre aussi les 47 e-mails déjà partis.
- **La notice publique de prospection** est dans le dépôt `benjaminfiliot-wq/presti-notice`. Elle dit aujourd'hui « un seul message par entreprise, à vie, sans relance ». C'est un engagement public : la changer avant de changer le comportement.
- **Attention aux deux tables** : `public.leads` contient les **clients des artisans**, pas les prospects de Presti, qui sont dans `ops.prospects`. Ne pas les mélanger.

## E. Les règles de prospection de Benj (cerveau : « Règles de Benj prospection et contact », « Offre exacte et interdits en prospection », « Profil du prospect idéal », « Format d'e-mail froid artisan », « Cadre légal et notice de prospection »)
- **Cible principale** : les artisans du bâtiment à leur compte et les TPE qui reçoivent eux-mêmes leurs clients (plombier, couvreur, menuisier, paysagiste, électricien, peintre, carreleur, maçon, chauffagiste, serrurier…).
  - Exclus : chaînes et franchises, entreprises de plus de 20 salariés, litiges d'acompte, avis qui parlent d'escroquerie ou d'avocat.
  - Zone : la Charente-Maritime d'abord, puis les départements voisins.
  - **Deuxième segment (01/11)** : les architectes, les maîtres d'œuvre et les entreprises à plusieurs collaborateurs. On leur présente l'offre « Presti pour l'entreprise ».
- **Une douleur se prouve** par une source datée. **On ne cite jamais un avis négatif de l'artisan dans le message.**
- **Le premier message présente Presti** (format du 21/10) :
  - un fait vrai sur l'artisan ;
  - deux phrases sur Presti ;
  - une démonstration de dix minutes proposée ;
  - l'essai gratuit sans carte ;
  - la source de son adresse ;
  - la sortie STOP.

  On vouvoie et on dit « mon logiciel », pas « mon IA ». Interdits : promesse de résultat, chiffre deviné, « premier sur Google », « rien ne part sans vous » en absolu, fonction non livrée.
- **Un seul premier message par entreprise, à vie** (incident du 20/10 : deux e-mails partis au même artisan à 50 minutes d'écart).
- **Relance (01/11)** : celle de ce prompt et du format du 20/10, soit une relance unique, 5 à 7 jours après le premier message, dans le même fil. Elle ne part qu'après la mise à jour de la notice publique.
- **Prospection automatique, sans Benj (décision du 01/11)** : Benj ne valide plus les lots. Il reçoit les comptes rendus et garde un interrupteur général (aujourd'hui `ops.accords_benj` et `FEU-VERT.txt` servent de feu vert par lot). L'envoi passe par le Facteur côté serveur, jamais par un clic « Envoyer » de Claude dans Gmail ou dans un navigateur.
- **Plafond** : 50 premiers e-mails par jour au plus (décision du 27/10), du mardi au jeudi de préférence, jamais le soir ni le week-end.
- **Opposition** : immédiate, définitive, pour toute l'entreprise et sur tous les canaux, appliquée en moins de 10 minutes (engagement de la notice).
- **Données** :
  - Les coordonnées viennent seulement d'une page publique de l'entreprise : site, annuaire ou fiche.
  - Un entrepreneur individuel est une personne physique, donc le RGPD s'applique en entier. Les fiches « non diffusibles » de Sirene sont respectées.
  - Conservation de 3 ans au plus.
  - Aucune donnée de prospect vers un modèle gratuit en ligne.
- **Maquettes de site** : elles portent le nom de vraies entreprises. Elles ne sont jamais publiques, jamais dans le dépôt, et leur lien privé expire au bout de 21 jours.
- **Règle des « 6 mots communs »** de `controles.py` : elle a bloqué 24 messages le 27/10. À comprendre avant de la garder ou de l'ajuster.

## F. Faits de droit et de plateformes à connaître
- **SMS de prospection** : l'article L34-5 du CPCE exige le consentement préalable d'une personne physique, et un artisan à son compte en est une.
- **Instagram et Facebook** : leur API ne permet d'écrire en privé qu'à quelqu'un qui a écrit d'abord. Un message privé à froid envoyé par robot fait risquer le blocage du compte @prestiapp. Les groupes Facebook et les comptes personnels de Benj sont exclus.
- **LinkedIn** : ses conditions d'utilisation interdisent la collecte automatique et les messages envoyés par robot.
- **Reddit** : il sert à trouver des leads. On ne désanonymise jamais un pseudonyme. L'extension Claude in Chrome refuse d'ouvrir reddit.com.
- **Sources gratuites déjà branchées en partie** :
  - Sirene (`sirene.ts`), registre RGE de l'ADEME (`rge.ts`), BODACC ;
  - OpenStreetMap et AFNIC (Harvey) ;
  - sites des entreprises (`lecteurSite.ts`) ;
  - Pages Jaunes en lecture.
- **Vibe Prospecting** : ses crédits sont à revérifier.

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

Tu es un architecte logiciel senior spécialisé en systèmes d'agents IA, prospection B2B conforme au droit français, scraping respectueux des conditions d'utilisation, Supabase et fiabilité en production.

Ta mission : faire du système de prospection **qui existe déjà** un système complet, fiable et mesuré, qui trouve des artisans du bâtiment ayant de **vraies** difficultés que Presti résout, les qualifie, rédige un premier message personnalisé et factuel, **l'envoie tout seul** dans des limites écrites, suit la réponse et s'améliore. **Décision de Benj (01/11) : la prospection est automatique, sans lui.** Benj ne valide plus les lots : ce sont le code, les juges et les disjoncteurs qui tiennent les règles du §3 ; Benj reçoit des comptes rendus, peut tout couper d'un interrupteur, et n'intervient que sur une demande de démo ou une réponse qui l'exige.

Presti est l'assistant de gestion des artisans (prestiapp.fr) : l'IA répond à leurs demandes en moins d'une minute à leur nom, prépare les devis sur leurs tarifs, relance, facture, range la compta, suit le stock et les chantiers ; l'artisan valide (Studio) ou laisse partir seul (Signature).

L'objectif n'est pas le volume. C'est trouver le bon artisan, comprendre sa situation réelle et lui proposer une aide précise, une seule fois.

### 2. Ce qui existe déjà (à inventorier et vérifier en premier, fichier:ligne)

- **Côté serveur (production)** : `lib/agents/acquisition/` (recenseur, rge, sirene, lecteurSite, douleurs, scoreDouleur, plaintes, plaintesParTheme, redacteur, gabaritsPremierContactV2, jugeFaits, secondJuge, conformite, disjoncteurs, jauges, facteur, expediteur, repondeur, standardiste, rendezVous, maquettesLien, porteurFormulaire, entrant, faq, affirmations, modeles…), les tables `ops.*` (au 01/11 : 5 040 prospects, 186 signaux, 52 envois, 32 oppositions, 1 149 réponses relevées ; `ops.accords_benj`, `ops.quotas_canaux`, `ops.couts`, `ops.opposition`, `ops.maquettes`…) et les tâches pg_cron `acq-*` (recenseur, rge, rédacteur, juge des faits, facteur matin et soir, répondeur, standardiste, purges).
- **Côté PC** : `presti-ops/agents-prospection/` (`MANUEL.md`, `ENVOI.md`, `controles.py`, la chasse aux plaintes, Harvey et ses sources gratuites OpenStreetMap et domaines .fr de l'AFNIC, `ENVOIS.csv`, `OPPOSITIONS.csv`, `FEU-VERT.txt`) et les tâches planifiées qui ont envoyé 47 premiers e-mails depuis le 26/10 (7 réponses, aucune chaude, 3 STOP).
- **Le public** : la notice de prospection (`benjaminfiliot-wq/presti-notice`), qui est un engagement : ce que fait le système doit rester vrai au regard de ce texte.

**Il y a donc deux chaînes de prospection** (serveur et PC). **Choix retenu : la chaîne serveur fait foi** (`lib/agents/acquisition/` et le schéma `ops.*` en production) : elle a déjà la boîte des envois, la liste d'opposition appliquée en base, les accords de Benj (`ops.accords_benj`), les quotas, les disjoncteurs et l'écran de validation dans `/controle`, et elle tourne sans le PC. Le PC et le serveur Oracle deviennent des **fournisseurs** : Harvey, ScrapeGraphAI, Crawlee et les scrapers auto-hébergés trouvent et enrichissent, puis écrivent dans `ops.*` ; ils n'envoient plus rien. Première tâche : faire la carte des deux chaînes étape par étape (trouver, vérifier, rédiger, juger, envoyer, relever les réponses, opposer), importer dans `ops.*` l'historique du PC (`ENVOIS.csv`, `OPPOSITIONS.csv`) pour que la règle « à vie » couvre les 47 e-mails déjà partis du PC, puis couper les doubles chemins : **un seul chemin d'envoi, une seule boîte des envois, une seule liste d'oppositions.**

### 3. Les règles de prospection de Benj (elles priment)

- **Cible** : artisans du bâtiment à leur compte et TPE (plombier, couvreur, menuisier, paysagiste, électricien, peintre, carreleur, maçon, chauffagiste, serrurier…), qui reçoivent eux-mêmes leurs clients. Exclus : chaînes et franchises, plus de 20 salariés, litiges d'acompte, avis parlant d'escroquerie ou d'avocat. Zone : la Charente-Maritime d'abord, puis les départements voisins (voir le cerveau : « Profil du prospect idéal »). **Deuxième segment (décision de Benj, 01/11)** : les architectes, maîtres d'œuvre et entreprises du bâtiment à plusieurs collaborateurs, à qui l'on présente l'offre sur mesure « Presti pour l'entreprise » (démonstration, pas de prix). Ce segment a son propre gabarit de message et ne se mélange pas aux artisans dans les quotas ni dans les rapports.
- **Une douleur se prouve** par une source datée (avis public, offre d'emploi, publication, contenu du site, annonce). Sinon elle n'existe pas. **On ne cite jamais un avis négatif de l'artisan dans le message** : il sert à le trouver, pas à lui écrire.
- **Le premier message présente Presti** (décision du 21/10) : un fait vrai sur l'artisan, deux phrases sur ce que fait Presti, une démonstration de dix minutes proposée, l'essai gratuit sans carte, la source de son adresse, et la sortie STOP. Vouvoiement. Ni promesse de résultat, ni chiffre deviné, ni « premier sur Google », ni « rien ne part sans vous » en absolu, ni fonction non livrée (SMS, téléphone, WhatsApp, réseaux) : liste complète dans le cerveau, « Offre exacte et interdits en prospection ». Dire « mon logiciel », pas « mon IA ».
- **Un seul premier message par entreprise, à vie.** Avant chaque envoi, chercher dans la boîte des envois tout ce qui est déjà parti à cette entreprise. **Relance (décision de Benj, 01/11) : celle de son prompt d'origine et du format du 20/10** : une seule relance, 5 à 7 jours ouvrés après le premier message, dans le même fil, courte, avec la même sortie STOP ; puis plus rien sur ce canal. Toute réponse, ouverture d'un désabonnement ou opposition arrête tout. ⚠️ La notice publiée (`presti-notice`) dit aujourd'hui « sans relance » : **la première relance ne part qu'après la mise à jour de la notice** (une PR sur `presti-notice`, que Benj fusionne), sinon le message contredit ce qu'on a annoncé aux prospects.
- **Canal automatique : l'e-mail seul**, à l'adresse professionnelle **publiée par l'entreprise elle-même**. Les autres canaux ne s'automatisent pas : Instagram et Facebook interdisent les messages privés à froid par robot (leur API ne permet d'écrire qu'à quelqu'un qui a écrit d'abord), un commentaire public envoyé par robot est du spam, et le téléphone reste à Benj s'il le veut. Le système peut préparer ces messages en brouillon dans `/controle`, sans jamais attendre qu'ils partent. **Pas de SMS de prospection** : la loi (art. L34-5 du CPCE) exige le consentement préalable d'une personne physique, et un artisan à son compte en est une ; le SMS reste un canal de l'assistant entre l'artisan et ses propres clients (prompt 3). Jamais de groupe Facebook, jamais un compte personnel de Benj. WhatsApp : seulement des conversations neuves ouvertes par lien direct, le matin. **Reddit sert à trouver des leads, jamais à les contacter**, et on ne désanonymise jamais un pseudonyme. LinkedIn : pas de collecte automatique (conditions d'utilisation), pas de message envoyé par un robot.
- **Plafond** : 50 premiers e-mails par jour au plus (décision du 27/10), en montée progressive (par exemple 10, 20, 35, 50 sur quatre semaines) tant que le taux de rebond reste sous 3 % et les plaintes pour spam sous 0,1 % ; mardi à jeudi de préférence, jamais le soir ni le week-end. Les envois de prospection partent d'un **sous-domaine dédié** (SPF, DKIM, DMARC alignés), pour que leur réputation ne puisse jamais abîmer les e-mails des artisans envoyés par Presti.
- **Qui envoie** : le **Facteur** côté serveur (code de Presti, plafonné, journalisé), jamais Claude qui clique « Envoyer » dans Gmail ou dans un navigateur. `ops.accords_benj` et `FEU-VERT.txt` ne servent plus à valider chaque lot : ils deviennent l'**interrupteur général** (marche ou arrêt) que Benj peut couper à tout moment. Chaque message passe seul la porte de conformité (couche 7) et les deux juges ; un message qui échoue à un contrôle n'est pas envoyé, il est écarté avec son motif.
- **Disjoncteurs automatiques** (le système s'arrête seul et prévient Benj) : rebonds au-dessus de 3 % sur la journée, une plainte pour spam, une opposition non appliquée en 10 minutes, un juge en panne, une source d'adresse non prouvée, un taux de refus anormal, un doublon détecté après envoi.
- **Opposition** : « stop », « ne m'écrivez plus »… = opposition immédiate, définitive, pour l'entreprise entière, sur tous les canaux, appliquée en moins de 10 minutes (engagement de la notice).
- **Données** : coordonnées relevées seulement sur un site, un annuaire ou une page publique de l'entreprise ; jamais devinées. Un entrepreneur individuel est une personne physique : RGPD complet, fiches « non diffusibles » respectées. **Aucune donnée de prospect vers un modèle gratuit en ligne.** Conservation de 3 ans au plus, purge automatique (existe : `acq-purge-prospects`).
- **Maquettes de site** : elles portent le nom de vraies entreprises ; **jamais publiques**, jamais dans le dépôt, lien privé qui expire (21 jours).

### 4. Les sources, gratuites seulement

| Source | Statut | Usage |
|---|---|---|
| Sirene (INSEE), registre RGE de l'ADEME, BODACC | gratuites, déjà branchées en partie (`sirene.ts`, `rge.ts`) | existence, activité, taille, date de création |
| OpenStreetMap (Overpass), nouveaux domaines .fr (AFNIC) | gratuites, branchées sur Harvey | entreprises et sites récents |
| Site de l'entreprise (`lecteurSite.ts`), Pages Jaunes en lecture | gratuit, robots.txt et conditions respectés | adresse publiée, services, zone, absence de devis en ligne |
| Recherche web publique, Reddit en lecture | gratuit | signaux de plainte des artisans eux-mêmes |
| Crawlee + Playwright (à la place d'Apify), Firecrawl auto-hébergé (Docker), ScrapeGraphAI local, SearXNG (à la place de Perplexity) | gratuits, à installer sur le serveur Oracle ou le PC (autorisé par Benj le 01/11) | pages publiques des entreprises, annuaires en lecture, recherche web ; robots.txt, conditions d'utilisation et rythme poli respectés |
| Vibe Prospecting | crédits à revérifier | seulement s'il reste des crédits gratuits |
| Scrapin (LinkedIn) | non | la collecte automatique sur LinkedIn est interdite par ses conditions : pas de remplaçant, LinkedIn reste manuel |

Le « vibe prospecting » reste utile comme **méthode** : une intention en langage naturel devient un plan de recherche structuré, exécuté avec les sources gratuites ci-dessus. Le plan, les requêtes, les sources, les candidats retenus et rejetés et le coût de chaque session sont enregistrés (format de session ci-dessous).

```json
{
  "session_id": "string",
  "intention": "string",
  "plan": [],
  "requetes": [],
  "sources_consultees": [],
  "candidats_retenus": [],
  "candidats_rejetes": [{ "id": "string", "raison": "string" }],
  "confiance": 0.0,
  "cout": { "credits_ia": 0, "appels_payants": 0 },
  "suite_conseillee": "string"
}
```

### 5. Architecture (sur l'existant)

Garde les couches de ton prompt d'origine, mais **chacune est d'abord cherchée dans l'existant**, et la stack est celle du §0.2 : **Supabase (`ops.*`) est la source de vérité** ; `pg_cron` et le tic de la minute font l'horloge des envois ; **n8n sur le serveur Oracle** porte les déclencheurs, les intégrations (scrapers, Slack, Telegram) et les alertes ; **Hermes** est l'interface de Benj pour lancer une session (« trouve-moi des couvreurs débordés à Rochefort ») et lire les rapports ; Orca, s'il est installé, encadre l'exécution des agents. Aucun de ces outils n'envoie un message à un prospect en dehors du Facteur :

1. **Découverte** (intention → plan → sources gratuites → candidats).
2. **Ingestion et dédoublonnage** : e-mail normalisé, téléphone normalisé, domaine, SIREN, empreinte nom + commune + métier ; liste d'exclusion ; clients Presti exclus ; concurrents exclus ; oppositions exclues. Un doublon ne crée jamais de fiche : il se rattache et laisse un événement `doublon_detecte`.
3. **Enrichissement** : seulement l'utile ; chaque donnée a une source, une URL et une date ; incertain = `null` ou `non_verifie` ; une API en panne ne perd aucun prospect (rejeu, puis file des échecs).
4. **Détection des douleurs** (l'existant `douleurs.ts` / `scoreDouleur.ts`) : chaque douleur a sa preuve citée mot pour mot ; une douleur sans preuve est supprimée par le code, pas par le modèle.
5. **Qualification** : score d'adéquation, de douleur et d'intention ; priorité calculée **par règles écrites** (fichier de configuration versionné), jamais par le modèle seul ; confiance < 0,7 → `a_creuser` ; exclu → `ecarte`.
6. **Rédaction** : trois angles, un choisi par critères écrits, un message conforme au §3. Le juge des faits (`jugeFaits.ts`, `secondJuge.ts`) vérifie que chaque affirmation sur l'artisan a sa source.
7. **Porte de conformité** (code) : opposition, doublon à vie, plafond du jour, horaires, adresse publiée par l'entreprise, phrase STOP, source de l'adresse dite, aucune affirmation non sourcée, aucun interdit de l'offre, longueur, interrupteur général allumé.
8. **Contrôle sans Benj** : pas d'étape de validation humaine. À la place : la porte de conformité, les deux juges, un **échantillon relu par un troisième juge distinct** (un message sur dix, tiré au hasard, avec arrêt du lot si l'échantillon échoue), et les disjoncteurs. Dans `/controle`, Benj voit tout après coup : le prospect, la douleur et sa preuve, la source de l'adresse, le score, le message envoyé, la réponse ; il peut mettre en pause, interdire un gabarit ou une source, ajouter une opposition. Slack `#presti-auto` et Telegram reçoivent le compte rendu du jour **sans donnée de prospect** et les alertes des disjoncteurs.
9. **Envoi et suivi** : le Facteur existant, plafonné ; relève des réponses (Répondeur, Standardiste) ; classement intéressé / refus / hors sujet / demande de démo / opposition ; toute réponse arrête tout ; une demande de démo arrive à Benj avec le contexte.
10. **Amélioration** : rapport hebdomadaire (sources qui donnent des leads qualifiés, faux positifs, angles qui obtiennent une réponse, causes de blocage, coût) ; le système applique seul les réglages sans risque (abandonner une source qui ne donne rien, privilégier l'angle qui obtient des réponses) et les journalise ; un changement de règle du §3, de gabarit de fond ou de plafond reste une proposition à Benj.

Tables : réutilise `ops.*` ; n'ajoute que ce qui manque (par exemple sessions de découverte et requêtes, si elles n'existent pas déjà). Pas de second jeu de tables `leads` / `contacts` / `companies` à côté de `ops.prospects` : la table `public.leads` est celle des **clients des artisans**, ne la mélange jamais avec les prospects de Presti.

### 6. Fiabilité et tests

Mêmes exigences que ton prompt d'origine (rejeu avec attente croissante, délai maximal, coupe-circuit — `disjoncteurs.ts` existe —, plafonds, file des échecs, verrous, clés d'idempotence, reprise après crash, mode à blanc, drapeaux, journal, traçabilité de l'intention jusqu'à la réponse), avec ces tests en plus :
- un avis négatif cité dans un message est refusé ;
- un deuxième message à la même entreprise est refusé, même après 6 mois, même par un autre canal ;
- une adresse non publiée par l'entreprise est refusée ;
- une opposition reçue bloque tout envoi en moins de 10 minutes ;
- un modèle en ligne gratuit ne reçoit jamais de donnée de prospect ;
- la règle « 6 mots communs » de `controles.py` : un test qui montre ce qu'elle bloque et pourquoi (24 messages bloqués le 27/10).

### 7. Méthode et première réponse

1. Carte des deux chaînes existantes (serveur et PC) et de ce qui fait foi à chaque étape.
2. Questions bloquantes, chacune avec ta réponse par défaut (relances, outils gratuits, chaîne qui fait foi et architectes sont tranchés le 01/11 ; restent ouverts : longueur des e-mails, règle des 6 mots, reprise de Harvey).
3. Architecture Mermaid posée sur l'existant, modèle de données (réutilisé, ajouté).
4. Plan par phases ; ne passe à la suivante que si les suites sont vertes.
5. Risques (droit, réputation de la boîte d'envoi, faux positifs, coût) et parades.

La carte, les mesures et les brouillons commencent tout de suite. L'architecture et les migrations sont validées une fois par Benj ; ensuite, **les envois partent seuls**, d'abord en mode à blanc pendant une journée (tout est préparé et journalisé, rien ne part), puis en réel dès que les tests sont verts, la notice à jour pour les relances et l'interrupteur général allumé.

### Definition of Done

- Une intention en français produit des candidats, chacun avec ses sources, sa date et son niveau de vérification.
- Chaque douleur a sa preuve ; aucune douleur ni aucun fait n'est inventé.
- Un seul chemin d'envoi, une seule liste d'oppositions, aucun doublon à vie, même après crash.
- Les premiers e-mails et la relance partent seuls, chaque jour ouvré, sans action de Benj ; chaque envoi a passé la porte de conformité et les juges ; aucun message ne contredit la notice publiée.
- Un disjoncteur arrête tout seul le système et prévient Benj ; l'interrupteur général l'arrête en une action.
- Le système survit à une source en panne et tourne sans aucun outil payant.
- Benj voit dans `/controle` les coûts, erreurs, décisions, réponses et résultats.
</pasted_content id="8bb5">

 

<pasted_content id="8bb5">
