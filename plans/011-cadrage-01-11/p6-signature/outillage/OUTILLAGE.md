# Les vrais outils dans les systèmes n8n — spécification de l'outillage (prompt 6)

Écrit le 03/11/2026 vers 14 h par Claude Code, après les messages de Benj de 13 h 30 à 14 h :
« c'est normal que aucune automatisation n'affiche d'outil à utiliser et qu'elles sont pas énormes comme dans les vidéos ? » ;
« il faut bien plus d'outils… du Insta, du Facebook, du LinkedIn, du Brevo, d'autres logiciels faits pour les leads… pour l'entreprise sur
mesure il y a beaucoup de choses… relis-toi, réanalyse et vérifie, contre-vérifie » ; « pas besoin de connexion, ces automatisations ne sont
pas pour moi » ; « utilise tous les dépôts GitHub, les vidéos, les prompts ».

Ce document **corrige** la première réponse (`../premiere-reponse.md`, décision 1) sur un point : les workflows portent maintenant les vrais
nœuds des outils. Tout le reste du plan tient.

## 1. Le constat, mesuré

Les 31 exports des lots 036-001 à 036-007 comptent 132 nœuds Code, 60 If, 57 Execute Workflow, un seul envoi (SMTP) et un seul agent IA
(relevé sur `.orchestre/preuves/036-00*/*.workflow.json`, 03/11). Aucun nœud Gmail, Agenda, Drive, Sheets, WhatsApp, Telegram, Stripe, fiche
Google, réseau social ou CRM.

Le prompt exige l'inverse :
- « des vrais outils dans les systèmes » (p6:13) ;
- un nœud n8n par outil (p6:242-256) ;
- tout canal déposé dans la plateforme (p6:281).

Pourquoi les workflows sont nus :
1. La décision 1 (`../premiere-reponse.md:358-371`) gardait les autorisations dans Supabase et faisait lire l'IMAP dans des nœuds Code.
2. Les juges des lots interdisaient tout nœud réseau (`scripts/apres-reputation-n8n-qa.mjs:4`, « AUCUN nœud réseau »).
3. Les agents ont appliqué les patrons du plan sans relire les vidéos (`.orchestre/preuves/036-001/resume.md`, « J'ai appliqué ces patterns,
   pas les vidéos elles-mêmes »).

## 2. Les sources, relues mécaniquement

| Relevé | Quoi | Où |
|---|---|---|
| Outils cités | 141 outils dans les 10 prompts, les fiches et les 66 transcriptions de @restructureai, l'analyse des vidéos du 01/11, les fiches des dépôts, les plans, la carte des outils du vault ; chaque outil avec ses lignes | `inventaire-outils.md` (script `inventaire-outils.mjs`) |
| Noms propres hors dictionnaire | 612 noms relus à la main : ManyChat, Metricool, Semrush, Grok, Yelp, WaveSpeed (interdit), Scrapin (interdit)… | fin de `inventaire-outils.md` |
| Dépôts clonés sur Oracle | 9 dépôts (`enescingoz/awesome-n8n-templates`, `Zie619/n8n-workflows`, `n8n-io/test-workflows`, `self-hosted-ai-starter-kit`, `skills`, `automation-mining-skill`, `n8n-dynamic-credentials-example`, `n8n-observability`, `n8n-hosting`) : 2 669 workflows, 482 types de nœuds. **Aucun JSON n'est importé** (p6:143-145) : on compte et on s'inspire | `releve-depots.md`, `types-noeuds-depots.md` (script `miner-depots.mjs`), copies dans `~/agents/depots/` sur Oracle |
| Catalogue n8n | chaque nœud ci-dessous vérifié par le MCP n8n (`search_nodes`, 03/11) | § 3 |

Ce que montrent les vrais workflows (types de nœuds métier, nombre de workflows sur 2 669) :
- **Les plus employés** : Google Sheets 334, Telegram 219, Google Drive 205, Gmail 200, Slack 162, modèle OpenAI 161, Airtable 137,
  formulaire n8n 136, **agent IA 120**, déclencheur Telegram 118, SMTP 83, Notion 71, déclencheur Gmail 69, chaîne LLM 69, mémoire 63.
- **Autour de l'agent** : parseur structuré 49, Google Calendar 38, HubSpot 37, Postgres 37, IMAP 35, **appel de workflow en outil 32**,
  outil Agenda 27, Outlook 26, WhatsApp 26, outil Gmail 24, Twilio 24, Pipedrive 23, LinkedIn 18, Facebook Graph 12.

Le geste des vidéos et des dépôts est toujours le même : un déclencheur sur l'outil, un **agent IA** avec son modèle, ses **outils branchés**
(lecture) et un **parseur de sortie**, puis les nœuds d'écriture de l'outil. C'est ce qu'on construit, avec la porte de Presti devant chaque
écriture.

## 3. Ce que n8n fournit (catalogue vérifié le 03/11)

**Nœuds natifs**, avec leur outil d'agent et, pour certains, leur outil de validation humaine (« HITL ») :
- **Boîtes mail** :
  - Gmail 2.2 (outil, validation humaine, déclencheur à intervalle) ;
  - Outlook 2 (validation humaine) ;
  - SMTP 2.1 (outil, validation humaine) ;
  - déclencheur IMAP.
- **Google** : Agenda 1.3 (outil, déclencheur), Drive 3, Docs 2, Sheets 4.7, Chat 1, Ads 1, fiche Google Business Profile 1 (outil).
- **Microsoft** : OneDrive 1.1 (outil, déclencheur), Excel 2.2 (outil), Teams 2 (validation humaine), To Do.
- **Messageries** : WhatsApp 1.1 (outil, validation humaine, déclencheur), Telegram 1.2 (outil, validation humaine, déclencheur), Twilio 1 (SMS,
  outil, déclencheur), Slack 2.7 (outil, validation humaine, déclencheur).
- **E-mailing** : Brevo (nœud `sendInBlue` 1.1, outil, déclencheur), Mailchimp, ActiveCampaign, Lemlist 2.
- **Réseaux** :
  - Facebook Graph API 1 (outil), déclencheurs Facebook et **Facebook Lead Ads** ;
  - LinkedIn 1 (outil, publication) ;
  - YouTube 1 ;
  - X 2.
- **CRM et bases** : HubSpot 2.2, Pipedrive 2, Salesforce 1.1, Zoho CRM 1, Odoo 2, Airtable 2.2, Notion 3, monday 2, ClickUp 1 (chacun avec son
  outil, la plupart avec un déclencheur).
- **Paiements et compta** : Stripe 1 (outil, déclencheur), QuickBooks 1, Xero 1.
- **Prise de rendez-vous et formulaires** : déclencheurs Calendly, Cal.com, Typeform, Jotform.
- **Support et commerce** : Zendesk 1, Shopify 1, WooCommerce 1.
- **IA** :
  - agent 3.1 (« AI Agent ») et agent en outil 3, pour les sous-agents ;
  - modèle Claude (`lmChatAnthropic` 1.6) et nœud Anthropic 1, qui lit les images et les documents ;
  - parseur structuré 1.3, extracteur d'informations 1.2 ;
  - appel de workflow en outil 2.2.

**Sans nœud natif, par l'API (nœud HTTP)** :
- **Instagram** : API Graph de Meta, par le nœud Facebook Graph.
- **Réseaux et leads** : TikTok (API Business et Content Posting), ManyChat, Tally.
- **Signature** : Yousign, DocuSign.
- **Compta et banque** : Pennylane, Tiime, Sage, Qonto.
- **Support** : Chatwoot, Trustpilot.
- **Données publiques** : Sirene/INSEE.
- **Plateformes de devis** : Habitatpresto, Travaux.com, Quotatis, StarOfService, MesDépanneurs. Aucune n'a d'API publique connue : on lit
  leurs e-mails de notification dans la boîte de l'artisan (p6:332, « notification d'une plateforme de devis »).

**Deux contraintes qui décident de l'architecture**, vérifiées :
1. **Les identifiants dynamiques de n8n exigent une licence Enterprise.** C'est le mécanisme où chaque client branche son compte sur un workflow
   partagé (n8n-io/n8n, PR sur `n8nOAuth2` : « Requires the `dynamic-credentials` module (enterprise license) »). Docs :
   https://docs.n8n.io/administer/manage-credentials/end-user-credentials. Notre instance est la Community 2.45.7. Un nœud natif ne sert donc
   qu'un seul compte.
2. **n8n d'Oracle n'est pas exposé à Internet** (p6:225-227) : un déclencheur à webhook ne reçoit rien. Sont concernés WhatsApp, Telegram,
   Facebook Lead Ads, Stripe, Calendly, Cal.com, Typeform, Jotform, HubSpot, Brevo. Exposer un webhook est une décision de sécurité de Benj.

## 4. Les décisions (elles remplacent la décision 1 de la première réponse sur ce point)

**O1 — Un gabarit par département, avec les vrais nœuds, et une copie par client.** Le gabarit `gabarit-<système>-<département>` porte tous les
nœuds de ses outils : déclencheurs, agent IA et ses outils, écritures. Il est inactif et ne porte aucun identifiant. Quand un client branche ses
comptes, un déploiement crée sa copie, `client-<slug>-<département>`, liée à **ses** identifiants. C'est le geste des vidéos : chaque client a
son système.

Pourquoi c'est sûr :
- une copie ne voit que les comptes de son client ;
- la logique métier vérifiée reste partagée : les chefs `presti-dep-*` et les spécialistes `lib-*`, appelés par la copie, jugés hors ligne ;
- les montants restent calculés par le code (p6:292).

Le déploiement (script, puis lot) attend trois gestes : l'accord écrit du client, le « go » de Benj et la décision O3.

**O2 — Les entrées.**
- **Outils lus à intervalle**, par leur déclencheur natif : Gmail, Outlook, IMAP, Agenda, Drive, OneDrive, Sheets. Les autres le sont par un
  déclencheur horaire suivi du nœud de l'outil en lecture : fiche Google, Facebook Lead Ads par l'API Graph, Stripe, CRM, Calendly et Cal.com
  par l'API.
- **Canaux à webhook** (WhatsApp, Telegram, Messenger, Instagram, SMS, page `/p`) : ils arrivent déjà chez Presti, qui les range en base
  (`lib/canaux/`). n8n les lit dans les événements (p6:279-285). Leur nœud natif sert à **répondre**, jamais à recevoir.
- Chaque entrée **dépose d'abord le message dans la plateforme**, dans la même conversation par client, avec son canal (p6:280-285).

**O3 — Les identifiants.**
- Aucun dans un gabarit.
- Dans une copie, ceux du client seul, branchés par lui. Deux voies sont à trancher par Benj :
  - (a) l'application crée l'identifiant n8n de la copie par l'API de n8n au moment du « Connecter », depuis l'autorisation qu'elle a reçue ;
    la faisabilité pour les jetons OAuth2 est à prouver sur un compte d'essai ;
  - (b) la copie lit le jeton déchiffré (décision 1) et appelle l'API par un nœud HTTP, ce qui perd l'icône de l'outil.
- Un agent ne crée jamais d'identifiant (`.claude/rules/securite.md`).

**O4 — La porte devant chaque effet.** Tout nœud qui écrit, envoie, publie, pose un rendez-vous ou appelle le modèle ne s'atteint que par la
sortie « réel » d'une porte « simulation » (règle R15 du juge commun, étendue). Ensuite, pour un envoi :
- Studio : brouillon et carte, jamais d'envoi ;
- Signature : seulement les types activés, par le pilote (`lib/pilote/regles.ts`).

Le gabarit garde les deux branches visibles. En simulation, la sortie du modèle vient d'un enregistrement daté.

**O5 — L'agent IA, comme dans les vidéos, sans lui donner la main.**
- Chaque spécialiste rédactionnel est un nœud « AI Agent » avec son modèle Claude et un **parseur structuré** (schéma strict, p6:294).
- Ses outils sont **en lecture seulement** : lire le fil Gmail, les disponibilités de l'Agenda, un fichier Drive, une ligne Sheets, un
  spécialiste `lib-*` en outil.
- Un outil d'agent qui écrit ou envoie est refusé par le juge : l'écriture se fait après la porte, par un nœud du chemin principal. Seuls les
  outils de validation humaine de n8n (Slack, Teams, Telegram, Gmail) sont admis, et seulement pour une validation d'équipe Entreprise
  (p6:253).

**O6 — Marque blanche et quotas.**
- Un envoi part au nom de l'artisan, de sa boîte ou de son numéro (`lib/email.ts:6-11`).
- Brevo sert à deux choses :
  - la prospection de Presti, 300 par jour (`.claude/rules/email-brevo.md`) ;
  - les campagnes d'un client depuis **son** compte Brevo.
- Le Brevo gratuit porte sa propre marque, jamais « Presti ».
- Collecte LinkedIn interdite : LinkedIn sert seulement à publier, sur le compte du client.

## 5. La matrice des outils — Studio et Signature (prompt 1, p6:330-338)

L = lecture (libre, après la porte de l'organisation). É = écriture, envoi ou modèle (derrière la porte, Studio = brouillon et carte).

| Département | Entrées | Agent IA et outils de lecture | Écritures |
|---|---|---|---|
| **1. Accueil et réponse** | Gmail, Outlook, IMAP (déclencheurs) ; événements de la plateforme (`/p`, WhatsApp, Telegram, Messenger, Instagram, SMS) ; Facebook Lead Ads (API Graph) ; e-mails des plateformes de devis | Qualificateur et Rédacteur (Claude, parseur ; outils : fil Gmail ou Outlook, photo par le nœud Anthropic, `lib-trier-demande`, `lib-lire-photo`) | É brouillon Gmail ou Outlook (Studio), réponse Gmail, Outlook, SMTP, WhatsApp, Telegram, Messenger ou Instagram par l'API Graph (Signature, `reponse_prospect`) ; carte et dépôt dans la plateforme (HTTP Supabase, filtre du compte) |
| **2. Devis** | demande qualifiée, demande à l'assistant | Rédacteur de lignes (Claude, parseur ; outils : tarifs dans Sheets ou Excel, `lib-*` des prix) ; **montants par le code** | É PDF dans Drive ou OneDrive ; envoi Gmail ou Outlook (Signature, `envoi_devis` si tous les prix viennent des tarifs) ; brouillon et carte (Studio) |
| **3. Suivi et relances** | conversation ou devis sans réponse (événements) | Relanceur (Claude, parseur ; outil : `lib-controler-conflit`) | É relance par le canal d'origine (Gmail, Outlook, SMTP, WhatsApp, Telegram, Twilio quand l'API SMS est choisie) ; registre des relances |
| **4. Facturation et encaissement** | chantier terminé, échéance, **paiement lu dans Stripe** (lecture des paiements) | Relanceur d'impayés (Claude, parseur) | É facture émise envoyée (Gmail, Outlook) ; PDF dans Drive ou OneDrive ; export au comptable (Sheets ou Excel) ; relance d'impayé (opt-in) |
| **5. Après-chantier et réputation** | chantier fini + N jours ; **avis lus sur la fiche Google** (nœud Business Profile) | Préparateur de réponses (Claude, parseur) | É demande d'avis par un canal consenti (Gmail, SMTP, WhatsApp, SMS préparé) ; réponse à l'avis sur la fiche Google (positif seulement en Signature, négatif toujours à l'artisan) |
| **6. Opérations** | Agenda (déclencheur), Drive ou OneDrive (document reçu), stock sous le seuil | Planificateur (Claude, parseur ; outils : **disponibilités de l'Agenda**, fichiers Drive) | É rendez-vous posé dans Google Agenda ou Outlook (après le choix du client, jamais un créneau inventé) ; rappel la veille (Telegram, WhatsApp, SMS) ; commande fournisseur en brouillon Gmail ou Outlook ; classement Drive ; import Sheets ou Excel par le circuit contrôlé |
| **7. Direction** | 7 h, lundi 8 h, interruption | Rédacteur de la page (Claude, parseur ; **le code compte**) | É page du matin et rapport : Telegram, WhatsApp, Gmail, Slack ou Teams ; export Sheets |

## 6. La matrice — Presti lui-même, client zéro (p6:459-466)

| Système | Outils |
|---|---|
| Demandes « Parler à l'équipe » et suivi des abonnés | Gmail (`contact@prestiapp.fr`, boîte de Benj), Agenda (créneaux de Benj), Telegram de Benj, Stripe de Presti (lecture), CRM sur mesure |
| Prospection (système séparé, ADR-005, `email-brevo.md`) | Brevo (300 par jour, quota lu avant chaque envoi, file du lendemain), SearXNG, Firecrawl auto-hébergé, Crawlee, ScrapeGraphAI (Oracle), Sirene/INSEE ; jamais Apify, Scrapin, collecte LinkedIn |
| Contenu (chantier 5) | publication Instagram et Facebook (API Graph), LinkedIn, TikTok (API de publication), YouTube, sur les **comptes Presti seulement** (jamais un compte personnel) |
| Comptes rendus | Slack `#presti-auto`, Telegram |

## 7. La matrice — l'Entreprise sur mesure (prompt 2, p6:446-452, p6:486-533)

Catalogue de gabarits par département type. On ne déploie que ce qu'exige un irritant signé.

| Département type | Outils |
|---|---|
| Accueil et qualification | Gmail, Outlook, IMAP multi-boîtes ; WhatsApp Business ; Messenger et Instagram (API Graph) ; formulaires Typeform, Jotform, Tally (API) ; Calendly et Cal.com (API) ; Twilio |
| **Leads et acquisition** | **Facebook Lead Ads** (API Graph), LinkedIn (publication), Google Ads, Instagram ; séquences Brevo, Mailchimp, ActiveCampaign, Lemlist, sur le compte du client ; ManyChat (API) ; chaque lead arrive dans son CRM et dans la plateforme |
| **Ventes et CRM** | HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday, ClickUp, ou le **CRM sur mesure** de Presti ; signature Yousign ou DocuSign (API) |
| Marketing et réseaux | Instagram et Facebook (publication, messages, commentaires, API Graph), LinkedIn, TikTok (API), YouTube, X, Google Ads (rapports) |
| Opérations | Google Agenda, Outlook ; projets ClickUp, monday, Notion ; Drive, OneDrive ; Sheets, Excel ; logiciel métier par export |
| Administratif | Drive, OneDrive (pièce manquante, échéances), Docs, Gmail, Outlook |
| Finance | Stripe, QuickBooks, Xero ; Pennylane, Tiime, Sage (API ou export) ; banque en lecture (Qonto, agrégateur : à étudier, gratuit d'abord) |
| Après-vente et réputation | fiche Google, Trustpilot (API) ; support Zendesk, Chatwoot (API) |
| Direction et équipe | Slack, Teams, Google Chat ; **validation d'équipe par les outils HITL de n8n** ; Sheets, Docs (PDF du lundi) |

Les applications sur mesure (§ 2.5 : centre de commande, CRM sur mesure, vue « monde », app de terrain, portail, formulaires, tableaux de bord)
lisent ces systèmes ; leur logique vit dans n8n (p6:488-490).

## 8. Le juge commun (`scripts/n8n-specs-qa.mjs`), étendu

- **R5 (liste blanche)** : elle s'ouvre, pour les familles du prompt 6 et des gabarits, à chaque type des § 3 et 5 à 7, outils d'agent compris.
- **R15 (porte)** : les nouveaux effets en font partie.
  - Agenda, Drive, Sheets, Excel, OneDrive, CRM, fiche Google, Stripe, Brevo et réseaux : toute opération qui écrit.
  - L'agent IA, la chaîne LLM et le nœud Anthropic : ils appellent le modèle.
- **R18 (identifiants)** : aucun identifiant sur un nœud d'outil, de modèle ou d'envoi d'un gabarit.
- **R19 (webhooks)** : aucun déclencheur à webhook (n8n n'est pas exposé).
- **R20 (outils d'agent)** : un outil branché sur un agent ne fait que lire. Les outils de validation humaine sont refusés hors des gabarits
  Entreprise.

Chaque règle a son mutant.

## 9. Les lots

| Lot | Quoi | Exécutant |
|---|---|---|
| 036-013 | gabarits Accueil et boîte (§ 5, lignes 1) avec leurs entrées, l'agent et ses outils, les écritures ; juge `scripts/gabarits-accueil-qa.mjs` | Claude Code (Oracle) |
| 036-014 | gabarits Devis, Suivi, Facturation (§ 5, lignes 2 à 4) ; juge `scripts/gabarits-argent-qa.mjs` | Claude Code (Oracle) |
| 036-015 | gabarits Après-chantier, Opérations, Direction (§ 5, lignes 5 à 7) ; juge `scripts/gabarits-terrain-qa.mjs` | Claude Code (Oracle) |
| 036-016 | catalogue Entreprise (§ 7) et client zéro (§ 6) ; juge `scripts/gabarits-entreprise-qa.mjs` | Claude Code (Oracle) |
| 036-017 | les fiches connecteurs de chaque outil des § 5 à 7 (format p6:258-262) | Hermes (Orca, API) |
| 036-012 | intégration : déploiement par client à blanc, tests transverses, runbook | Claude Code |

## 10. Ce qui attend Benj

- **Trancher O3** : la voie (a) ou (b) pour brancher les comptes d'un client sur sa copie.
- **Exposer ou non un webhook** : pour le temps réel de WhatsApp, Telegram et Facebook Lead Ads ; sinon, ils passent par Presti et la base.
- **Le premier client volontaire** (Studio, Signature), puis l'organisation de Benj en client zéro : leur accord écrit avant tout branchement.
