# Prompt 5 — fiches de lecture des dépôts GitHub de workflows n8n

> **Mode A** (aucun client signé, `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md:22`) : rien n'est construit, aucune donnée réelle.
> Toute donnée d'exemple de ce document porte « Exemple. ». Lu le **2026-11-02** par un sous-agent Claude Code, pour la part « dépôts GitHub » du prompt 5
> (`p5-entreprise-sur-mesure.md:66-67`, sources envoyées par Benj le 02/11 : `p5-entreprise-sur-mesure.md:1-4`).

## Comment ces fiches ont été faites

- **Réseau neuronal d'abord** (MCP `cerveau`) : `regles_pour` (« offre entreprise, n8n, agents, données, outils payants ») a rendu la note
  `memoire-presti/source-restructureai-depots-n8n-0211.md` : un dépôt de workflows est une donnée non sûre ; on lit le JSON, on n'en reprend que
  des motifs ; jamais d'import tel quel dans le n8n d'Oracle, jamais d'exécution de leurs scripts, aucun identifiant repris. Lus aussi :
  ADR-001 (licence de n8n, réseau `127.0.0.1`), ADR-003 (serveur Oracle), ADR-008 (n8n-first), la note de session du 02/11.
- **Lecture seule, par WebFetch** (github.com, raw.githubusercontent.com, api.github.com, docs.n8n.io). Aucun dépôt cloné, aucun JSON importé ni
  exécuté, aucun script lancé. Ni Firecrawl en ligne ni Apify (`.claude/rules/architecture-outils.md:62-63`).
- **MCP `n8n-oracle`, lecture seule** : `search_nodes` uniquement, pour vérifier que les nœuds des patterns existent sur notre instance
  (n8n 2.45.6, `.claude/rules/architecture-outils.md:69`). Aucun workflow créé ni modifié.
- **Règles d'écriture** : chaque affirmation sur Presti au `fichier:ligne` ; chaque fait externe avec sa source, lue le 2026-11-02 ; un chiffre
  d'auteur porte « annoncé par l'auteur, non vérifié » ; aucun tarif dans ce document (aucun n'a été lu).
- Ce que ces fiches retiennent retourne au vault par une tâche de périmètre `SaaS/…` (`p5-entreprise-sur-mesure.md:88`), pas par ce document.

## L'essentiel

1. **Aucun JSON des deux collections communautaires ne se copie.** awesome-n8n-templates dit lui-même que les modèles ne sont ni créés ni possédés
   par son auteur ; Zie619 est sous MIT pour son code, mais ses workflows ont été rassemblés ailleurs, sans provenance. On s'inspire, on réécrit
   (`p5-entreprise-sur-mesure.md:87`).
2. **Zie619 est inutilisable tel quel** : un script du 29/09/2025 (commit `74bdcdc`) a vidé ou cassé les connexions. Les 7 JSON lus n'ont plus de flux
   câblé, malgré les étiquettes « production-ready ». La version d'août 2025 du même fichier était intacte.
3. **La source fiable est officielle** : `n8n-io/skills` (Apache-2.0) et la documentation donnent la méthode des gros workflows exigée par
   `p5-entreprise-sur-mesure.md:156-166` : contrats typés, nœud « Return », workflow d'erreur commun, sorties d'erreur câblées, déduplication, validation humaine, tests par données épinglées.
4. **Licence de n8n (FAQ lue)** : Presti peut construire et faire tourner des workflows pour ses clients sur sa propre instance, et les clients
   peuvent y brancher leurs propres comptes, tant qu'ils n'accèdent ni à l'instance ni à la logique. Un éditeur de workflows offert au client,
   même derrière une interface maison, est interdit.
5. **14 gabarits `lib-*`** sont retenus plus bas, chacun avec sa source, son point de branchement et le test qui doit pouvoir rougir.

## Sommaire

1. [enescingoz/awesome-n8n-templates](#fiche-1--enescingozawesome-n8n-templates)
2. [Zie619/n8n-workflows et zie619.github.io/n8n-workflows](#fiche-2--zie619n8n-workflows-et-son-site)
3. [L'organisation n8n-io : vue d'ensemble](#lorganisation-n8n-io--vue-densemble)
   - [n8n-io/n8n](#fiche-3--n8n-ion8n) · [n8n-io/n8n-docs](#fiche-4--n8n-ion8n-docs-et-docsn8nio) ·
     [n8n-io/self-hosted-ai-starter-kit](#fiche-5--n8n-ioself-hosted-ai-starter-kit) · [n8n-io/skills](#fiche-6--n8n-ioskills) ·
     [n8n-io/n8n-hosting](#fiche-7--n8n-ion8n-hosting) · [n8n-io/automation-mining-skill](#fiche-8--n8n-ioautomation-mining-skill) ·
     [n8n-io/n8n-dynamic-credentials-example](#fiche-9--n8n-ion8n-dynamic-credentials-example) ·
     [n8n-io/n8n-observability](#fiche-10--n8n-ion8n-observability) · [n8n-io/test-workflows](#fiche-11--n8n-iotest-workflows)
4. [Patterns retenus pour la bibliothèque lib-*](#patterns-retenus-pour-la-bibliothèque-lib-)
5. [Pièges](#pièges)
6. [Questions ouvertes, chacune avec un défaut](#questions-ouvertes-chacune-avec-un-défaut)
7. [Sources lues et sources manquantes](#sources-lues-et-sources-manquantes)

---

## Fiche 1 — enescingoz/awesome-n8n-templates

**Source :** « Awesome n8n Templates », Enes Cingoz, https://github.com/enescingoz/awesome-n8n-templates · dépôt créé le 2025-05-08, dernier push le
2026-09-12 (API GitHub), README marqué « Last updated: August 2026 » · lue le 2026-11-02 · intégralement : **non** (README en entier, LICENSE,
racine de 41 entrées, 8 JSON sur « 280+ » annoncés).

**Ce qu'elle montre :**
- Une liste de modèles n8n rangés par plateforme ou par usage ; un README en 13 langues ; des liens d'essai n8n Cloud signalés comme liens d'affiliation.
- Le README : importer le JSON, brancher ses identifiants, activer. L'auteur n'a créé ni ne possède aucun modèle ; les droits restent à leurs créateurs.
- 8 JSON lus : capture et score d'un lead (n° 1), battement à 26 h (n° 2), diagnostic d'erreur en 7 catégories (n° 3), reprises à 3 s (n° 4),
  webhook signé HMAC (n° 5), agent de qualification par SMS et agenda, 34 nœuds (n° 6), sous-workflow-outil (n° 7), relances WhatsApp à 7, 14 et 30 jours (n° 8).
- Aucun secret en clair dans ces 8 JSON ; le n° 7 garde un identifiant interne de credential et l'`instanceId` de son auteur.
- Le déroulé de chaque JSON : « Détail de la lecture », après la fiche.

**Principes et patterns réutilisables :**
- Normaliser avant tout : un nœud Code qui accepte plusieurs noms pour un même champ, nettoie, met l'e-mail en minuscules et horodate (n° 1).
- Rejeter tôt ce qui ne peut pas être traité, avant tout enrichissement ou toute alerte (n° 1).
- Écrire la trace d'audit **avant** le routage : chaque lead a sa ligne même si une alerte échoue (n° 1).
- Priorité → délai cible en minutes ; Switch avec sortie de repli explicite (n° 1).
- Battement : liste des workflows actifs comparée à leur dernière exécution, seuil de 26 h (n° 2), le même que `p5-entreprise-sur-mesure.md:255`.
- Le gardien ne se garde pas lui-même : si l'instance tombe, le contrôle ne tourne pas non plus (note du n° 2).
- Diagnostic d'erreur en sous-workflow réutilisable : classer, masquer, tronquer, proposer l'étape suivante (n° 3).
- Deux sorties par nœud faillible : succès, ou erreur assainie (n° 4).
- Webhook signé : signature du corps brut, horodatage dans une fenêtre, comparaison à temps constant, refus générique, en-têtes `no-store` (n° 5).
- Sous-workflow-outil minimal : déclencheur d'appel → une action → un seul champ rendu (n° 7).
- Paliers de relance lus dans une configuration plutôt qu'écrits en dur (n° 8).

**Erreurs à éviter :**
- Webhooks sans authentification (n° 1 et n° 6).
- n8n qui appelle une URL fournie par un inconnu (n° 1 : `page_url` est récupérée telle quelle).
- Clé de déduplication calculée mais jamais vérifiée (n° 1) ; déduplication dans la mémoire du workflow, 24 h (n° 6) : ni durable, ni par organisation.
- Score décidé par le modèle sans schéma ni validation : le JSON prend `Number(ai.score ?? 0)` (n° 6).
- Créneau réservé seul, SMS sans consentement ni « STOP », appels vocaux par agent (n° 6).
- Drapeau `test_mode` déclaré mais lu par aucun nœud (n° 6) : un mode à blanc qui ne bloque rien.
- Error Trigger posé, mais aucun workflow d'erreur désigné dans les réglages (n° 6). Aucun des 8 n'en désigne.
- Enregistrements invalides envoyés quand même vers la sortie « validés » ; `retryable: true` écrit en dur ; attente fixe entre essais (n° 4).
- Paliers en égalité stricte (exactement 7, 14 ou 30 jours) : un passage manqué saute le rappel ; la colonne « dernier rappel » est écrite,
  jamais relue (n° 8).
- 250 exécutions lues sans pagination : un workflow silencieux peut échapper au contrôle, le code du n° 2 le reconnaît.
- Fuseau horaire absent des déclencheurs planifiés (n° 2 et n° 8).
- Firecrawl en ligne (n° 7), passerelle WhatsApp tierce (n° 8, statut au regard des conditions de WhatsApp : à vérifier).

**Ce qui s'applique à Presti / à ce client :** (mode A : s'applique au kit)
- Étape 0, demande de démo (`p5-entreprise-sur-mesure.md:50`) : normalisation, rejet tôt, grille de score déterministe, délai cible →
  `lib-capturer-lead` et `lib-qualifier-lead`. La demande arrive par les routes publiques de Presti, qui écrivent dans Supabase ; n8n lit la base,
  sans webhook (`p5-entreprise-sur-mesure.md:117`).
- Supervision (`p5-entreprise-sur-mesure.md:255`) : le battement à 26 h → `lib-battement`, lu dans le journal Supabase plutôt que dans l'API de n8n.
- Erreurs (`p5-entreprise-sur-mesure.md:162`) : diagnostic, masquage et troncature avant l'alerte Telegram de Benj → `lib-erreur-commune`.
- Webhook exposé, si Benj le décide un jour (`p5-entreprise-sur-mesure.md:117`) : signature, fenêtre, identifiant d'événement dédoublonné en base.
- Relances (`p5-entreprise-sur-mesure.md:190`) : paliers lus dans la configuration du client → `lib-relancer`, corrigé (voir plus bas).

**Ce qui ne s'applique pas, et pourquoi :**
- Les JSON eux-mêmes : droits à leurs créateurs, selon le README. Aucune copie, aucun import.
- Google Sheets ou Gmail comme source de vérité (n° 1, n° 8) : la vérité est Supabase (`p5-entreprise-sur-mesure.md:95`, `:249`).
- Score par le modèle, créneau réservé seul, SMS sans « STOP », appel vocal par l'IA : interdits (`p5-entreprise-sur-mesure.md:42`, `:226`, `:246`, `:253`).
- Firecrawl en ligne et LinkedIn (le README annonce des modèles LinkedIn) : interdits (`.claude/rules/architecture-outils.md:62`, `:65`).
- Les modèles bâtis sur des modèles gratuits en ligne (le README cite Gemini, DeepSeek R1…) : jamais avec une donnée de client
  (`.claude/rules/securite.md:12`).

**Licence (dépôt) :** fichier `LICENSE` lu : Creative Commons Attribution 4.0 International (résumé et renvoi au texte complet),
« Copyright (c) 2024-2026 Enes Cingoz » ; l'API GitHub affiche « Other / NOASSERTION ». Le README précise que les modèles ne sont ni créés ni possédés
par l'auteur : la licence ne peut couvrir que la liste et sa rédaction. **Réutilisable : non pour les JSON** ; la liste, oui avec attribution (sans intérêt pour nous).

**Chiffres annoncés :** « 280+ automation templates across 18 categories » ; « 19,000+ GitHub stars » (l'API en compte 26 230 le 02/11 : le README
est daté) ; nombres par catégorie (Gmail 9, Telegram 20, Google Drive et Sheets 18, OpenAI et LLM 17, WhatsApp 7, recherche IA et RAG 39…) ;
« 400+ built-in integrations » pour n8n. Tous annoncés par l'auteur, non vérifiés.

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- Une liste de modèles n8n rangés par plateforme ou par usage (`Gmail_and_Email_Automation`, `Telegram`, `WhatsApp`, `devops`, `OpenAI_and_LLMs`,
  `Other_Integrations_and_Use_Cases`…), un README traduit en 13 langues, des liens d'essai n8n Cloud signalés comme liens d'affiliation.
- Mode d'emploi du README : télécharger le JSON, l'importer, brancher ses identifiants, activer. Son avertissement : les modèles ont été trouvés en
  ligne, l'auteur n'en a créé ni ne possède aucun, les droits restent à leurs créateurs, aucune responsabilité.
- Les 8 JSON lus, choisis pour l'offre :
  1. *B2B Demo Lead Rescue Desk* (lead) : webhook POST → normalisation et score en nœud Code → rejet 400 si aucun moyen de contact → lecture de la
     page citée par le lead → ligne d'audit Google Sheets → Switch « hot / review / normal » avec sortie de repli → alertes Gmail → escalade.
     Seuils : 72 et 42 points, délai cible 15, 240 ou 1 440 minutes.
  2. *n8n Silent Workflow Check* (alerte) : planifié à 8 h ; lit l'API de n8n (`/api/v1/workflows` et `/api/v1/executions`, 250 au plus, sans pagination) ;
     signale un workflow actif sans exécution depuis 26 h.
  3. *n8n Failed Execution Doctor* (erreur) : sous-workflow sans nœud d'envoi ; classe chaque erreur en 7 catégories (authentification, quota, délai,
     réseau, entrée invalide, expression, exécution), masque clés, jetons et mots de passe, tronque à 300 caractères, propose l'étape suivante.
  4. *Resilient REST API Sync* (erreur) : 3 essais à 3 s d'intervalle, sortie d'erreur sur le nœud HTTP et sur le nœud Code, erreur assainie à
     240 caractères.
  5. *Signed Webhook HMAC Guard* (sécurité) : HMAC-SHA256 du corps brut par le nœud Crypto, comparaison à temps constant, horodatage accepté de 300 s
     avant à 60 s après, réponse 401 unique ; pas de protection contre le rejeu (la note le dit).
  6. *Score inbound leads with AI, reply by SMS or WhatsApp, book calendar slots and alert sales* (agent, 34 nœuds) : déduplication 24 h en
     `staticData`, modèle appelé par HTTP, CRM, SMS en moins de 60 s, créneau réservé seul après un appel vocal, Error Trigger présent.
  7. *Using External Workflows as Tools in n8n* (sous-workflow) : un enfant « get_a_web_page » appelé par un agent, qui interroge Firecrawl en ligne.
  8. *Send Escalating WhatsApp Invoice Reminders from Google Sheets* (relance) : planifié à 9 h, paliers à 7, 14 et 30 jours, envoi par la passerelle WAHA.
- Aucun secret en clair dans ces 8 JSON (placeholders `REPLACE_WITH_…`, domaines `example.com`) ; le n° 7 garde un identifiant interne
  de credential et l'`instanceId` de son auteur.

---

## Fiche 2 — Zie619/n8n-workflows et son site

**Source :** « n8n Workflow Collection », Zie619, https://github.com/Zie619/n8n-workflows et https://zie619.github.io/n8n-workflows/ · dépôt créé le
2025-05-14, dernier push le 2026-06-24, site affiché « novembre 2025 » · lue le 2026-11-02 · intégralement : **non** (README, LICENSE, SECURITY.md,
racine de 38 entrées, environ 188 dossiers de `workflows/`, `scripts/`, historique d'un fichier, commit `74bdcdc`, 7 JSON et une version ancienne
d'un 8e, 4 morceaux de l'index du site sur 2,2 Mo).

**Ce qu'elle montre :**
- Des JSON rangés par intégration et renommés `NNNN_<Intégration>_…_<Déclencheur>.json` : titre et auteur d'origine disparaissent ; le README ne dit pas d'où ils viennent.
- Un moteur de recherche (FastAPI, SQLite FTS5, Docker amd64 et arm64, GitHub Pages) et un index JSON des workflows.
- **Le commit `74bdcdc` du 2025-09-29** (392 780 lignes touchées) ajoute trois scripts de « correction ». Depuis, les 7 JSON lus ont des
  connexions vides (3 fichiers) ou pointant vers des nœuds absents (4 fichiers), et des mentions « production-ready ».
- Preuve : la version du 2025-08-05 (`c4885ee`) du fichier `0454` avait ses connexions intactes ; l'actuelle n'en a plus.
- Les 7 JSON lus : erreurs journalisées, alerte Telegram, sous-workflow de téléphone à 8 cas épinglés, serveur MCP, synchronisation de CRM,
  liste d'attente, export paginé par l'en-tête `Link`. Leur détail : « Détail de la lecture », après la fiche.

**Principes et patterns réutilisables :**
- Journaliser toutes les erreurs en base, n'alerter qu'une fois par fenêtre (5 minutes dans `1777`).
- Alerte minimale : nom du workflow et lien de l'exécution, ni message brut ni données (`0454`, champ unique gardé).
- Sous-workflow de normalisation à entrée déclarée, livré avec ses cas de test épinglés, dont des cas invalides (`1918`).
- Double opt-in par code de vérification (`0633`) : une preuve de consentement pour une liste d'e-mails.
- Pagination par l'en-tête `Link` (« rel=next », 250 par page) et écriture par clé (`appendOrUpdate` sur l'identifiant) (`0792`) : une synchronisation rejouable.

**Erreurs à éviter :**
- Faire confiance à une collection réécrite en masse : connexions vidées, nœuds remplacés (un déclencheur MCP et deux outils devenus `noOp` dans
  `0872`), placeholders « YOUR_CREDENTIAL_HERE » glissés dans des champs sans rapport (sorties d'un Switch dans `1918` et `0872`).
  Un JSON qui s'importe n'est pas un JSON qui marche.
- Réglages `retryOnFail`, `retryCount`, `retryDelay` et `maxExecutions` posés au niveau du workflow : la page des réglages de workflow de n8n n'en
  connaît aucun (docs.n8n.io, lue le 02/11) ; les reprises se règlent par nœud.
- Étiquettes de qualité auto-attribuées sans rapport avec le contenu.
- Données personnelles en clair : un vrai `chat_id` Telegram (`0454`, ancienne et actuelle versions), des adresses e-mail de l'auteur (`1777`),
  des identifiants de feuille et de credential (`0792`).
- Une purge de la table de journal dans le même workflow que la journalisation (`1777`, la note dit elle-même « pas en production ») ; une boucle
  `while (true)` qui ne s'arrête que sur une exception (`0792`).
- Outils Execute Command dont les valeurs, fournies par l'agent, entrent dans des commandes shell sans échappement ni authentification (`0872`) :
  une injection de commandes.
- Nœuds anciens (Cron v1, Merge v1, Set v1) et lecture de `$env` dans les expressions (`1777`, `0792`) : depuis la 2.0, l'accès aux variables
  d'environnement est bloqué par défaut (`N8N_BLOCK_ENV_ACCESS_IN_NODE`, docs.n8n.io, lue le 02/11).
- Des paires de fichiers de même taille à l'octet (`Form/1348` et `1441`, `Form/1537` et `1554`, `Schedule/1399` et `1891`) font penser à des
  doublons (non vérifié).
- L'index du site liste des modèles bâtis sur Gemini (par exemple « High-Level Service Page SEO Blueprint Report », intégration
  `Lmchatgooglegemini`, entrée d'index lue, fichier non lu) : un modèle en ligne, interdit avec une donnée de client.

**Ce qui s'applique à Presti / à ce client :** (mode A : s'applique au kit)
- `lib-alerter` : alerte limitée par fenêtre et message minimal vers le Telegram de Benj (`p5-entreprise-sur-mesure.md:247` : jamais de donnée
  sensible en clair) ; toutes les erreurs au journal Supabase (`p5-entreprise-sur-mesure.md:162`, `:220`).
- `lib-normaliser-telephone` (France, format E.164), livré avec des cas fictifs épinglés, dont des invalides : des tests capables de rougir
  (`p5-entreprise-sur-mesure.md:312`).
- `lib-synchroniser-outil` (rang 3) : pagination bornée, lots, écriture par clé (`p5-entreprise-sur-mesure.md:166`).
- Double opt-in pour la lettre d'information d'un client (`p5-entreprise-sur-mesure.md:245`, `:108`).

**Ce qui ne s'applique pas, et pourquoi :**
- Aucun JSON : provenance non documentée, droits des auteurs d'origine non établis, contenu cassé par le script du 29/09/2025.
- Le moteur de recherche (FastAPI, SQLite) : sans usage pour l'offre.
- Execute Command : désactivé par défaut depuis la 2.0 (`NODES_EXCLUDE`, docs.n8n.io, lue le 02/11) ; une recherche « execute command » sur le
  n8n d'Oracle ne renvoie pas ce nœud (MCP `n8n-oracle`, `search_nodes`, 02/11). On le laisse ainsi.

**Licence (dépôt) :** fichier `LICENSE` lu : MIT, « Copyright (c) 2025 Zie619 » ; il ne parle pas des workflows. La MIT couvre le code du dépôt
(serveur, scripts) ; elle ne peut pas couvrir des workflows d'autres auteurs. **Réutilisable : le code oui** (MIT, mention gardée, sans usage pour
nous), **les JSON non**.

**Chiffres annoncés :** « 4,343 Production-Ready Workflows », « 365 Unique Integrations », « 29,445 Total Nodes », « 15 Organized Categories »,
« 100% Import Success Rate », « < 100ms Search Response », « < 50MB Memory Usage », « 700x Smaller Than v1 », « 10x Faster Load Times »,
« 40x Less RAM Usage », « Full security audit completed, all CVEs resolved ». Tous annoncés par l'auteur, non vérifiés. Le « 100 % » est démenti
pour ce qui compte : l'import peut réussir, mais 7 JSON lus sur 7 n'ont plus de flux câblé.

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- Des JSON rangés dans `workflows/<Intégration>/`, nommés `NNNN_<Intégration>_<Intégration>_<Action>_<Déclencheur>.json` : le titre et l'auteur
  d'origine disparaissent du nom. La description du dépôt dit que les workflows ont été rassemblés, y compris sur le site de n8n ; le README ne dit
  pas d'où ils viennent.
- Un moteur de recherche (Python FastAPI, SQLite FTS5, image Docker amd64 et arm64, site GitHub Pages) et un index JSON (nom, déclencheur,
  complexité, nombre de nœuds, intégrations, lien brut).
- **Le 2025-09-29, le commit `74bdcdc`** (« Add workflow fixer and update multiple workflows », 392 780 lignes touchées) ajoute `workflow_fixer.py`,
  `advanced_security_fixer.py` et `final_excellence_upgrader.py`. Depuis, les 7 JSON lus portent un bloc `meta` daté du 2025-09-29 vers 07 h 07,
  des mentions « production-ready », « excellent » ou « optimized », des réglages de reprise au niveau du workflow, et tous ont des connexions
  vides (3 fichiers) ou pointant vers des nœuds `error-handler-…` absents (4 fichiers) ; quatre ont en plus un nœud « Error Handler » relié à rien.
- **Preuve par comparaison** : la version du 2025-08-05 (commit `c4885ee`) du fichier `0454` avait ses connexions intactes
  (On Error → Set message → Telegram) ; l'actuelle n'en a plus.
- Les 7 JSON lus : `Error/1777` (erreurs journalisées en Postgres, une alerte au plus toutes les 5 minutes), `Error/0454` (alerte Telegram : nom du
  workflow et lien de l'exécution), `Executeworkflow/1918` (sous-workflow « Format US Phone Number », entrée déclarée, 8 cas épinglés),
  `Executeworkflow/0872` (serveur MCP « système de fichiers » par outils Execute Command), `Hubspot/0129` (synchronisation HubSpot ↔ Pipedrive
  planifiée), `Form/0633` (liste d'attente, code de vérification par e-mail, mise à jour Google Sheets), `Splitout/0792` (export Shopify vers Google
  Sheets, paginé par l'en-tête `Link`).

---

## L'organisation n8n-io : vue d'ensemble

L'API GitHub liste **53 dépôts publics** (une page de 100, triée par dernier push, relue en trois morceaux le 02/11 : le compte peut varier
d'une unité). Ceux qui servent l'offre, avec la licence telle que l'API la déclare et, pour les fiches, le fichier lu :

| Dépôt | Licence (API) | Fichier de licence lu | Dernier push | Utilité pour l'offre |
|---|---|---|---|---|
| `n8n` | NOASSERTION | Sustainable Use 1.0 + n8n Enterprise (.ee) | 2026-11-02 | le moteur ; la licence fixe ce que Presti peut vendre |
| `n8n-docs` | NOASSERTION | Apache 2.0 + Commons Clause | 2026-11-02 | méthode officielle : sous-workflows, erreurs, réglages, CLI, FAQ de licence |
| `self-hosted-ai-starter-kit` | Apache-2.0 | Apache 2.0 | 2026-10-12 | modèle local (Ollama) sur un réseau Docker |
| `skills` | Apache-2.0 | Apache 2.0 | 2026-10-30 | les règles officielles pour un agent de code qui écrit des workflows |
| `n8n-hosting` | MIT | MIT | 2026-10-29 | mode file d'attente (worker et Redis), versions épinglées |
| `automation-mining-skill` | Apache-2.0 | Apache 2.0 (titulaire non rempli) | 2026-11-01 | repérer des tâches répétées : les irritants |
| `n8n-dynamic-credentials-example` | aucune | aucun (API `/license` : 404) | 2026-04-08 | identifiants propres à chaque utilisateur final |
| `n8n-observability` | MIT | MIT | 2026-10-13 | métriques et tableaux de bord de supervision |
| `test-workflows` | aucune, **archivé** | aucun (API `/license` : 404) | 2026-06-01 | workflows de test des nœuds |

Non ouverts, sans lien direct avec l'offre : `n8n-nodes-starter` (modèle de nœud communautaire, MIT selon l'API), `task-runner-launcher`,
`n8n-sandbox-service`, `terraform-*`, `n8n-kiro-power`, `n8n-cursor-plugin`, et des dépôts archivés ou des forks (`typeorm`, `vm2`, `localtunnel`…).

---

## Fiche 3 — n8n-io/n8n

**Source :** « n8n », n8n GmbH, https://github.com/n8n-io/n8n · créé le 2019-06-22, dernier push le 2026-11-02 · lue le 2026-11-02 ·
intégralement : **non** (README, LICENSE.md, LICENSE_EE.md, racine de 57 entrées ; le code n'est pas lu : Presti se sert du produit, il ne le modifie pas).

**Ce qu'elle montre :**
- Le dépôt unique du produit (`packages/`, `docker/`…), avec un `AGENTS.md`, un `CLAUDE.md` et un dossier `.claude/` : l'équipe de n8n travaille
  elle-même avec des agents de code.
- Démarrage par un script d'installation ou par Docker (port 5678) ; liens vers la documentation et la galerie de modèles.
- Deux licences : la Sustainable Use License 1.0 pour le code, sauf les fichiers et dossiers marqués « .ee », qui relèvent de la n8n Enterprise
  License. Celle-ci permet copie et modification pour le développement et le test, sans abonnement ; en production, il faut une licence Enterprise valide.
- La Sustainable Use License permet l'usage pour les besoins internes de l'entreprise, ou un usage non commercial ou personnel ; la redistribution
  n'est permise que gratuite et non commerciale ; les mentions de licence se gardent ; une copie modifiée le signale.

**Principes et patterns réutilisables :**
- Rester sur les fonctions communautaires en production ; une fonction marquée Enterprise se vérifie avant d'en dépendre (exemple : un document de
  décision du chart Helm s'intitule « multi-main requires a licence », titre lu dans `n8n-hosting`, contenu non lu).
- Lire la FAQ de la licence avant de vendre quoi que ce soit qui tourne sur n8n (fiche 4).

**Erreurs à éviter :**
- Offrir au client un éditeur de workflows, même derrière l'interface de Presti, ou lui ouvrir l'instance n8n : interdit (FAQ, fiche 4).
- Activer une fonction Enterprise en production sans licence.

**Ce qui s'applique à Presti / à ce client :**
- ADR-001 a lu la FAQ le 01/11 : moteur interne permis si seul le backend parle à n8n. La FAQ relue le 02/11 ajoute deux réponses propres à l'offre
  Entreprise (fiche 4).
- Le n8n d'Oracle est en 2.45.6 (`.claude/rules/architecture-outils.md:69`) : les changements cassants de la 2.0 s'appliquent aux vieux modèles (fiche 4).

**Ce qui ne s'applique pas, et pourquoi :**
- Le code source : aucune raison de le lire, de le forker ou d'y toucher.

**Licence (dépôt) :** `LICENSE.md` lu : Sustainable Use License 1.0 ; `LICENSE_EE.md` lu : n8n Enterprise License ; l'API affiche
« Other / NOASSERTION ». **Réutilisable : le produit oui**, en usage interne (le cadre d'ADR-001) ; **le code non**.

**Chiffres annoncés :** « 1500+ integrations », « 9,000+ workflow templates » (README) ; la description du dépôt dit « 400+ integrations ».
Annoncés par n8n, non vérifiés ; les deux chiffres d'intégrations se contredisent.

---

## Fiche 4 — n8n-io/n8n-docs et docs.n8n.io

**Source :** « n8n-docs », n8n GmbH, https://github.com/n8n-io/n8n-docs et ses pages publiées sur https://docs.n8n.io · dernier push le 2026-11-02 ;
pages sans date affichée · lue le 2026-11-02 · intégralement : **non** (README, LICENSE.md, racine, `docs/`, `docs/build/`, `docs/build/flow-logic/`,
`docs/_workflows/` ; 3 pages Markdown du dépôt ; 7 pages publiées : sous-workflows, réglages de workflow, réglages de nœud, changements cassants
de la 2.0, Error Trigger, commandes CLI, FAQ de la licence).

**Ce qu'elle montre :**
- La documentation en Markdown (GitBook), des workflows d'exemple dans `docs/_workflows/`, une skill `n8n-docs-author`.
- Sous-workflows : un déclencheur à trois modes d'entrée ; le dernier nœud de l'enfant rend ses données ; un enfant en erreur ne se déclenche pas.
- Erreurs : un Error Trigger dans un workflow d'erreur commun, qui ne part jamais sur une exécution manuelle ; « Stop and Error » force un échec.
- Réglages de workflow : fuseau New York par défaut, sauvegarde et **masquage des données d'exécution** ; aucun réglage de reprise.
- 2.0 : Execute Command désactivé par défaut, variables d'environnement bloquées, « Publier » distinct d'« Enregistrer ».
- CLI : `export:workflow --separate` pour versionner ; `export:credentials --decrypted` met tous les secrets en clair.
- **FAQ de la licence** : permis de faire tourner des workflows pour des clients qui n'accèdent pas à l'instance ; interdit de leur offrir un
  constructeur de workflows, même derrière une interface maison. Le détail : « Détail de la lecture », après la fiche.

**Principes et patterns réutilisables :**
- Contrat d'entrée par champs typés sur chaque enfant.
- Appelants restreints : une bibliothèque `lib-*` n'est appelable que par les workflows de Presti (réglage « This workflow can be called by »).
- Un workflow d'erreur commun, désigné dans les réglages de chaque workflow.
- Sortie d'erreur câblée sur chaque nœud faillible, reprises réglées par nœud.
- Masquer les données d'exécution de production : n8n ne garde pas de données personnelles dans ses exécutions, ce que veut
  `p5-entreprise-sur-mesure.md:95` (n8n lit et écrit, ne garde pas).
- Export versionné un fichier par workflow, sans les identifiants (`p5-entreprise-sur-mesure.md:164`).
- « Save execution progress » quand une reprise à l'endroit de la panne vaut la latence ajoutée.

**Erreurs à éviter :**
- `export:credentials --decrypted` : jamais dans une preuve, jamais versionné.
- `import:workflow` sur une instance qui a les mêmes identifiants : écrasement.
- Tester un workflow d'erreur à la main : l'Error Trigger ne part pas.
- Garder le fuseau par défaut : régler `Europe/Paris` sur chaque workflow planifié.
- Compter sur la relance automatique des tâches bloquées en mode file (retirée en 2.0).

**Ce qui s'applique à Presti / à ce client :**
- La méthode de `p5-entreprise-sur-mesure.md:156-166` trouve un appui officiel point par point : parent et enfants (Execute Sub-workflow), contrat
  (champs typés), erreurs (workflow d'erreur, sorties d'erreur, reprises par nœud), versionnage (export CLI).
- L'offre telle que le code la définit, Signature plus `organisation.membres`, sur démonstration et sur devis, hors du tunnel en libre-service
  (`lib/plans.ts:15-18`, `:103`, `:114`), entre dans les cas permis.
- La FAQ valide le modèle de l'offre (Presti construit et fait tourner sur son instance, le client branche ses comptes sans voir n8n,
  `p5-entreprise-sur-mesure.md:165`) et trace sa limite : le CRM sur mesure ne devient jamais un éditeur de logique. Les réglages du client
  (calendrier de relances, seuils) restent des paramètres lus par des workflows écrits par Presti (question ouverte n° 3).
- Les règles de la 2.0 s'appliquent à Oracle, en 2.45.6 (`.claude/rules/architecture-outils.md:69`).

**Ce qui ne s'applique pas, et pourquoi :**
- Quotas et limites de durée de n8n Cloud : le n8n cloud ne reçoit aucune donnée personnelle (`.claude/rules/architecture-outils.md:72`).
- GitBook, le guide de style de la doc.

**Licence (dépôt) :** `LICENSE.md` lu : Apache 2.0 complétée par la « Commons Clause » (concédant n8n GmbH), qui retire le droit de vendre un
produit ou service dont la valeur vient pour l'essentiel du logiciel. Le README, lui, annonce la Sustainable Use License : **contradiction relevée**,
on retient la lecture la plus stricte. **Réutilisable : lire et suivre, oui ; recopier des pages ou des exemples dans un livrable vendu, non**
(on paraphrase et on cite).

**Chiffres annoncés :** aucun chiffre de performance ; versions citées : 1.97.0 (conversion en sous-workflow), 2.0 (changements cassants).

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- La documentation en Markdown, publiée par GitBook ; un dossier `docs/_workflows/` (`advanced-ai/examples`, `credentials`, `integrations`,
  `try-it-out`) pour les workflows d'exemple ; un dossier `skills/n8n-docs-author` et un fichier `context7.json`.
- **Sous-workflows** : déclencheur « Execute Sub-workflow Trigger » à trois modes d'entrée (champs définis, exemple JSON, tout accepter) ; nœud
  « Execute Sub-workflow » qui désigne l'enfant par identifiant, fichier, JSON ou URL ; le dernier nœud de l'enfant rend ses données au parent ; un
  enfant qui contient des erreurs ne peut pas être déclenché ; « This workflow can be called by » se règle par workflow ; conversion d'une sélection
  en sous-workflow depuis la 1.97.0, avec des pièges sur les sous-nœuds IA et les fonctions `first()`, `last()`, `all()`.
- **Erreurs** : un workflow d'erreur commence par l'Error Trigger, se désigne dans les réglages de chaque workflow et peut servir à plusieurs ;
  « Stop and Error » force un échec ; l'Error Trigger ne se déclenche jamais sur une exécution manuelle et n'a pas besoin d'être publié ; il reçoit
  l'identifiant et le lien de l'exécution, la reprise d'origine, le message et la pile, le dernier nœud, le mode, l'identifiant et le nom du
  workflow ; si le déclencheur lui-même échoue, l'objet `trigger.error` remplace une partie de ces champs.
- **Réglages de nœud** : Always Output Data, Execute Once, Retry On Fail (avec Max Tries et Wait Between Tries), On Error (arrêter, continuer,
  continuer par la sortie d'erreur).
- **Réglages de workflow** : ordre d'exécution, workflow d'erreur, appelants permis, fuseau (New York par défaut), sauvegarde des exécutions,
  progression, délai maximal, **masquage des données d'exécution** (production et manuelle), temps gagné estimé. Aucun réglage de reprise.
- **2.0** : Execute Command et LocalFileTrigger désactivés par défaut (`NODES_EXCLUDE`) ; accès aux variables d'environnement bloqué par défaut
  (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`) ; task runners par défaut ; nœud Start retiré ; « Publier » distinct d'« Enregistrer » ; un enfant qui
  attend rend désormais sa sortie finale au parent ; en mode file, plus de relance automatique des tâches bloquées.
- **CLI** : `export:workflow --backup` ou `--separate` (un fichier par workflow, fait pour le versionnage) ; `export:credentials --decrypted` met
  tous les secrets en clair ; `import:workflow` écrase les identifiants déjà présents et désactive par défaut ; la CLI contourne les contrôles d'accès.
- **FAQ de la licence**, ce qui décide de l'offre :
  - permis : construire, faire tourner et maintenir des workflows sur sa propre instance pour le compte de clients, s'ils n'accèdent pas à l'instance ;
  - permis : des clients qui branchent leurs propres OAuth ou clés ; le critère est qui contrôle la logique, pas à qui sont les identifiants ;
  - permis : déclencher des workflows préconstruits par API ou webhook ;
  - interdit : un constructeur de workflows intégré à un SaaS, même derrière une interface maison ; héberger n8n pour que des clients y construisent ;
  - architecture intégrée : la FAQ renvoie vers une licence Enterprise.

---

## Fiche 5 — n8n-io/self-hosted-ai-starter-kit

**Source :** « Self-hosted AI starter kit », n8n GmbH, https://github.com/n8n-io/self-hosted-ai-starter-kit · dernier push le 2026-10-12 · lue le
2026-11-02 · intégralement : **oui pour l'essentiel** (arbre complet de 15 entrées ; lus : README, LICENSE, `docker-compose.yml`, `.env.example`,
le workflow de démonstration, les 2 identifiants de démonstration ; non lus : `CONTRIBUTING.md`, `.gitignore`, le GIF).

**Ce qu'elle montre :**
- Un `docker-compose.yml` : PostgreSQL 16, n8n, Qdrant, Ollama (profils `cpu`, `gpu-nvidia`, `gpu-amd`), téléchargement de llama3.2 au démarrage.
- Un service `n8n-import` qui importe identifiants et workflows de démonstration seulement si l'instance n'a aucun workflow.
- Le workflow de démonstration : Chat Trigger → Basic LLM Chain + Ollama Chat Model (llama3.2). Ni agent, ni mémoire, ni outil.
- Les deux identifiants de démonstration (Ollama, Qdrant) sont chiffrés ; mais le `.env.example` fournit une clé de chiffrement n8n, un mot de passe
  Postgres et un secret JWT **fixes, identiques pour tous** ; le README demande de les changer, le fichier non.
- Ports publiés sans adresse (donc sur toutes les interfaces) ; images n8n, Qdrant et Ollama en `latest`.
- Le README le présente comme non optimisé pour la production, fait pour des preuves de concept.

**Principes et patterns réutilisables :**
- Modèle local par Ollama, joint par n8n sur le réseau Docker interne : la voie « modèle local sur Oracle » de `p5-entreprise-sur-mesure.md:218`, `:248`.
- Import au démarrage seulement si l'instance est vide : utile pour remonter la démonstration « Exemple. » sur un bac à essai, sans écraser.
- Dossier partagé monté dans n8n pour les fichiers.

**Erreurs à éviter :**
- Copier le `.env.example` tel quel : la clé de chiffrement de n8n serait connue de tous, et quiconque lit la base déchiffre les identifiants.
- Publier 5678, 6333 et 11434 sur toutes les interfaces ; laisser des images `latest` non figées.
- Prendre la démonstration pour un agent : c'est une chaîne simple, sans garde-fou.

**Ce qui s'applique à Presti / à ce client :**
- Si un modèle local est envisagé sur Oracle : Ollama et n8n sur le réseau Docker interne, ports liés à `127.0.0.1` comme n8n
  (`.claude/rules/architecture-outils.md:69-70`). Le serveur est en ARM (`aarch64`), 23 Gio de mémoire, disque à 90 % le 01/11 (ADR-003) :
  `df -h` et mémoire libre avant toute installation (`p5-entreprise-sur-mesure.md:359`).
- Qdrant n'est pas nécessaire : la consigne veut la recherche plein texte de Postgres, `pgvector` seulement si un besoin mesuré l'exige
  (`p5-entreprise-sur-mesure.md:219`).

**Ce qui ne s'applique pas, et pourquoi :**
- Le kit comme base : Presti a déjà son n8n sur Oracle (`/opt/n8n-complet`, `.claude/rules/architecture-outils.md:69`) ; un second n8n et un second
  Postgres seraient un doublon sur une petite machine (ADR-003).
- Les profils GPU.

**Licence (dépôt) :** fichier `LICENSE` lu : Apache License 2.0, copyright n8n GmbH, « 2024-present ». **Réutilisable : oui**, licence et mentions
jointes ; n8n, dans le kit, reste sous Sustainable Use.

**Chiffres annoncés :** « 400+ » intégrations pour n8n (README), annoncé, non vérifié ; ports 5678 et 11434 ; modèle llama3.2.

---

## Fiche 6 — n8n-io/skills

**Source :** « n8n Skills », n8n GmbH, https://github.com/n8n-io/skills · dernier push le 2026-10-30 · lue le 2026-11-02 · intégralement : **non**
(README, LICENSE, arbre complet de 103 fichiers ; lus : les `SKILL.md` de `n8n-subworkflows-official`, `n8n-error-handling-official`,
`n8n-credentials-and-security-official` ; les références `STRUCTURED_OUTPUT`, `HUMAN_REVIEW`, `DEDUP_PATTERNS`, `NAMING_CONVENTIONS`, `TESTING` ;
les 3 JSON d'exemple `slack-router`, `agent-core`, `notion-ideas-subagent`).

**Ce qu'elle montre :**
- 15 skills officielles pour qu'un agent de code construise des workflows par le serveur MCP d'instance (n8n 2.2.0 au moins).
- Sous-workflows : entrées à champs typés, schéma d'entrée tenu comme un contrat, un nœud final « Return », erreur rendue `{ success: false, error }`.
- Erreurs : la sortie d'erreur et son câblage sur chaque nœud faillible ; reprises de 3 essais à 5 000 ms par défaut, 5 au plus.
- Identifiants : jamais en champ texte, ni en `$vars`, ni lus par `$env` ; un secret collé dans une conversation se révoque.
- Validation humaine par des nœuds `…HitlTool` ; déduplication par lecture puis IF, ou par upsert ; nommage en verbe et objet.
- **Tests** : les données épinglées ne couvrent ni les sous-workflows, ni les Data Tables, ni les nœuds Code à effet extérieur, qui
  s'exécutent pour de vrai.
- 3 JSON d'exemple (un routeur Slack, un agent central, un sous-agent Notion) : « Détail de la lecture », après la fiche.

**Principes et patterns réutilisables :**
- Routeur sans calcul (slack-router) : c'est le `ent-<client>-parent` de `p5-entreprise-sur-mesure.md:156`.
- Sous-agent sans état, sur un modèle moins cher, nourri d'un schéma frais à chaque appel (notion) : les agents de rang 2
  (`p5-entreprise-sur-mesure.md:178-179`).
- Modèle correcteur seulement quand la sortie ne passe pas le schéma.
- Validation humaine hors de l'agent, sur un canal surveillé, avec les vrais paramètres et un délai.
- Le schéma d'entrée comme contrat versionné (`p5-entreprise-sur-mesure.md:159`).

**Erreurs à éviter :** (vues dans les exemples officiels eux-mêmes)
- `agent-core` : aucune reprise ni sortie d'erreur sur les appels de modèle et d'outils ; schéma du parseur qui ne colle pas au prompt ; entrées du
  déclencheur sans types ; 200 itérations : un coût non borné.
- `notion-ideas-subagent` : lectures sans limite de nombre (`returnAll`).
- Outils tiers des exemples : Tavily (nœud communautaire `@tavily/n8n-nodes-tavily`) et OpenRouter, fournisseurs non inscrits chez Presti.
- La skill dit qu'un workflow d'erreur doit être publié (à partir de la 2.29.0) ; la page de l'Error Trigger dit qu'il n'a pas à l'être :
  contradiction à vérifier sur notre 2.45.6.

**Ce qui s'applique à Presti / à ce client :**
- Claude Code écrit les workflows par le MCP d'instance `n8n-oracle` (`.claude/rules/architecture-outils.md:24`,
  `p5-entreprise-sur-mesure.md:113`), que Hermes n'a qu'en lecture (`.claude/rules/architecture-outils.md:84`) : ces skills sont la méthode
  officielle pour écrire les `ent-*` et les `lib-*`. Les installer en plugin
  est un réglage, donc une décision de Benj (question ouverte n° 1) ; sinon on les lit à la main, comme ici.
- Les nœuds utiles existent sur Oracle (`search_nodes`, 02/11) : Error Trigger v1, Execute Workflow Trigger v1.3, Execute Sub-workflow v1.4 (modes
  « tout en une fois » et « un par élément »), Data table v1.1 (`rowExists`, `rowNotExists`, `upsert`), Remove Duplicates v2, Telegram avec
  `sendAndWait` et `telegramHitlTool`, Structured Output Parser v1.3 (l'ancien parseur correcteur est marqué déprécié), Evaluation.
- Le test hors ligne de `p5-entreprise-sur-mesure.md:164` et `:312-320` s'appuie sur l'export et les données épinglées, avec une règle : tout enfant
  qui écrirait est épinglé ou coupé, et le drapeau `simulation` lui est passé en entrée.

**Ce qui ne s'applique pas, et pourquoi :**
- Les « n8n Agents » de première classe (`n8n-agents-official`), tant que la consigne définit un agent comme un sous-workflow
  (`p5-entreprise-sur-mesure.md:170`) : à réévaluer plus tard.
- Slack, Notion, OpenRouter et Tavily des exemples.

**Licence (dépôt) :** fichier `LICENSE` lu : Apache License 2.0, copyright n8n GmbH 2026. **Réutilisable : oui** (attribution, licence jointe) ;
on paraphrase plutôt que de recopier.

**Chiffres annoncés :** 14 skills de capacité et une d'aiguillage ; n8n 2.2.0 au minimum ; 3 essais à 5 000 ms par défaut, 5 essais et 5 000 ms au
plus ; 45 minutes d'attente par défaut ; environ 10 000 entrées pour Remove Duplicates. Annoncés par n8n, non vérifiés sur l'instance.

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- 15 skills officielles (14 de capacité, une d'aiguillage) pour qu'un agent de code (Claude Code, Codex, OpenCode) construise des workflows par le
  serveur MCP d'instance de n8n ; crochets au démarrage de session et avant les appels MCP à fort impact ; n8n 2.2.0 au minimum, MCP d'instance activé.
- **Sous-workflows** : ce qui se réutilise devient un sous-workflow ; on cherche avant de construire ; entrées à champs typés (seul mode qui permet à
  un agent de remplir les paramètres) ; le schéma d'entrée devient un contrat dès qu'il a des appelants ; un nœud final « Return » ; une erreur
  attendue se rend comme `{ success: false, error }` ; idempotence, reprises et validation se centralisent dans l'enfant ; `waitForSubWorkflow`
  vrai par défaut ; le mode « un appel par élément » sans attente est le seul vrai parallélisme ; découverte par tags (`subworkflow`, domaine, `tool`).
- **Erreurs** : sur chaque nœud faillible, la sortie d'erreur ET son câblage (l'un sans l'autre donne une panne silencieuse) ; un workflow d'erreur
  au niveau du workflow ; reprises par défaut 3 essais à 5 000 ms, plafonds du moteur à 5 essais et 5 000 ms ; code HTTP selon la cause, corps
  `{ error, message }`.
- **Identifiants** : par le système d'identifiants, jamais en champ texte, ni en `$vars`, ni lus par `$env` ; l'agent n'en crée pas ; un secret
  collé dans une conversation est compromis et se révoque ; un webhook s'authentifie par le champ `authentication` du déclencheur.
- **Sortie structurée** : un vrai JSON Schema plutôt qu'un exemple ; correction automatique par un modèle capable en code ; champs inconnus à `""`
  ou `null`, jamais omis.
- **Validation humaine** : nœuds `…HitlTool` (Slack, Telegram, Gmail, e-mail…) placés entre l'agent et l'outil ; formulaire pour modifier avant
  d'exécuter ; afficher les vrais paramètres de l'outil, pas une paraphrase du modèle ; délai d'attente explicite (45 minutes par défaut).
- **Déduplication** : « la ligne n'existe pas » puis insertion, lecture puis IF (avec Always Output Data), upsert ; « Remove Duplicates » entre
  exécutions limité à environ 10 000 entrées ; les marqueurs se purgent ; pour des millions de clés, un vrai cache. Les accès concurrents ne sont pas traités.
- **Tests** : données épinglées sur les déclencheurs, les nœuds à identifiants et les nœuds HTTP ; mais les sous-workflows, les Data Tables, Execute
  Command, les nœuds Code à effet extérieur et Wait s'exécutent pour de vrai : demander avant, ou épingler, ou couper ces nœuds.
- **Nommage** : verbe et objet, catégorie dans les tags, description de 2 à 4 phrases ; les conventions de l'instance priment.
- **Les 3 JSON** : un routeur Slack (Switch par type d'événement et par expéditeur, anti-boucle, appel de l'agent central avec 2 essais à 5 s et
  sortie d'erreur câblée) ; un agent central (AI Agent v3.1, modèle principal et modèle correcteur du parseur, mémoire de 50 messages par fil,
  recherche web, calculatrice, deux sous-agents en outils, 200 itérations au plus, sortie structurée) ; un sous-agent Notion (modèle moins cher,
  schéma de la base relu avant chaque appel, deux lectures et une création, 15 itérations au plus).

---

## Fiche 7 — n8n-io/n8n-hosting

**Source :** « n8n-hosting », n8n GmbH, https://github.com/n8n-io/n8n-hosting · dernier push le 2026-10-29 · lue le 2026-11-02 · intégralement :
**non** (arbre complet de 259 entrées, README, `docker-compose/withPostgresAndWorker/docker-compose.yml` et son README).

**Ce qu'elle montre :**
- Les exemples officiels d'hébergement : chart Helm (avec des décisions numérotées), Docker Compose (Postgres ; Postgres, Redis et worker en mode
  file ; sous-dossier SSL ; Caddy), CloudFormation ECS, manifestes Kubernetes.
- Le compose « withPostgresAndWorker » : Postgres 18, Redis 7, n8n principal, worker et runners externes, `EXECUTIONS_MODE=queue`, la même clé de
  chiffrement pour le principal et le worker, jeton des runners, secrets lus dans `.env` ; port 5678 publié sur toutes les interfaces, aucun
  contrôle de santé sur n8n, un worker qui n'attend pas que Postgres et Redis soient prêts.
- README : changer utilisateurs, mots de passe et jetons par défaut ; épingler une version d'image en production ; SQLite pour le développement et
  les petites installations ; MySQL retiré en 2.0 ; ne jamais lancer `docker compose down -v`.

**Principes et patterns réutilisables :**
- Le mode file (worker et Redis) le jour où le volume l'exige (`p5-entreprise-sur-mesure.md:166`), pas avant.
- Une seule clé de chiffrement pour toutes les instances ; versions épinglées ; runners de code à part.

**Erreurs à éviter :**
- Port 5678 sur toutes les interfaces ; `docker compose down -v`, qui efface les volumes ; un worker sans dépendance de santé.

**Ce qui s'applique à Presti / à ce client :**
- Référence pour une montée en charge du n8n d'Oracle (`127.0.0.1:5678`, `.claude/rules/architecture-outils.md:70`), après mesure de la mémoire et
  du disque (ADR-003, `p5-entreprise-sur-mesure.md:359`).

**Ce qui ne s'applique pas, et pourquoi :**
- Kubernetes, Helm, AWS : surdimensionnés pour une seule VM ARM.

**Licence (dépôt) :** fichier `LICENSE.md` lu : MIT, copyright « n8n - Workflow Automation » 2026. **Réutilisable : oui**, avec la mention.

**Chiffres annoncés :** aucun.

---

## Fiche 8 — n8n-io/automation-mining-skill

**Source :** « automation-mining-skill », n8n labs, https://github.com/n8n-io/automation-mining-skill · dernier push le 2026-11-01 · lue le 2026-11-02 ·
intégralement : **non** (README et licence seulement).

**Ce qu'elle montre :**
- Une skill expérimentale de n8n labs : l'agent lit une activité à laquelle il a accès (exemple cité : un canal Slack de demandes, des fichiers de
  sessions) et rend au plus cinq propositions de tâches manuelles répétées, chacune avec ses pointeurs vers les sources, son nombre d'occurrences
  et le changement proposé. Rien n'est construit : une proposition acceptée devient le cahier des charges d'un workflow.
- Ses principes de confidentialité : lire sans publier, modifier ni réagir ; rendre des pointeurs et des comptes, jamais le texte des messages, des
  données personnelles ou des identifiants ; une nouvelle source s'approuve ; le traitement se fait chez le fournisseur du modèle de l'utilisateur.
- Le README dit que ses résultats d'étude portent sur des données synthétiques et ne mesurent pas le temps gagné en équipe réelle.

**Principes et patterns réutilisables :**
- Un irritant se prouve par des pointeurs et un nombre d'occurrences, pas par une impression : c'est l'esprit de la fiche de découverte
  (`p5-entreprise-sur-mesure.md:102` : fréquence, exemple réel récent).
- Une source à la fois, approuvée ; aucune écriture.

**Erreurs à éviter :**
- Laisser l'agent lire une source sans accord du client, ou envoyer ses données à un modèle gratuit en ligne (`.claude/rules/securite.md:12`).

**Ce qui s'applique à Presti / à ce client :**
- En mode B, après accord écrit du client, une passe de ce type sur un export de ses outils peut nourrir les irritants n° 3 de la fiche de découverte
  (`p5-entreprise-sur-mesure.md:102`), chaque proposition marquée « mesuré par Presti » avec sa date (`p5-entreprise-sur-mesure.md:94`).

**Ce qui ne s'applique pas, et pourquoi :**
- En mode A : aucune donnée réelle, donc rien à miner.

**Licence (dépôt) :** fichier `LICENSE` lu : Apache License 2.0 (ligne de titulaire laissée en modèle, non remplie). **Réutilisable : oui**, licence jointe.

**Chiffres annoncés :** « au plus cinq propositions » ; résultats d'étude sur données synthétiques, sans chiffre de temps gagné.

---

## Fiche 9 — n8n-io/n8n-dynamic-credentials-example

**Source :** « n8n-dynamic-credentials-example », n8n GmbH, https://github.com/n8n-io/n8n-dynamic-credentials-example · dernier push le 2026-04-08 ·
lue le 2026-11-02 · intégralement : **non** (README seulement).

**Ce qu'elle montre :**
- Une application de référence (Express et React, connexion par Okta) où chaque utilisateur final branche ses propres identifiants OAuth à des
  workflows n8n ; le serveur garde le jeton de l'API n8n, masque les adresses internes et les chemins de webhooks, et déclenche les workflows
  par leurs webhooks ; elle exige une instance n8n où les identifiants dynamiques sont activés (version et licence non précisées).

**Principes et patterns réutilisables :**
- Le jeton de l'API n8n et les adresses internes ne quittent jamais le serveur.
- Le client autorise lui-même son compte (fenêtre de consentement OAuth) : aucun agent ne saisit un secret (`.claude/rules/securite.md:14`,
  `p5-entreprise-sur-mesure.md:165`).

**Erreurs à éviter :**
- Exposer au navigateur un chemin de webhook ou une adresse de n8n.

**Ce qui s'applique à Presti / à ce client :**
- Le jour où un client branche ses comptes (agenda, boîte mail, CRM) : identifiants nommés par client et à droits minimaux, branchés par lui
  (`p5-entreprise-sur-mesure.md:165`). Le mécanisme exact des identifiants dynamiques (version de n8n, licence) reste à vérifier avant d'en dépendre.

**Ce qui ne s'applique pas, et pourquoi :**
- Le déclenchement par webhook depuis l'application : n8n n'est pas exposé, il tire (`p5-entreprise-sur-mesure.md:117`).

**Licence (dépôt) :** **aucune** (API `/license` : 404, champ `license` vide). **Réutilisable : non** ; on s'inspire, on réécrit
(`p5-entreprise-sur-mesure.md:87`).

**Chiffres annoncés :** aucun.

---

## Fiche 10 — n8n-io/n8n-observability

**Source :** « n8n-observability », n8n GmbH, https://github.com/n8n-io/n8n-observability · dernier push le 2026-10-13 · lue le 2026-11-02 ·
intégralement : **non** (README et licence).

**Ce qu'elle montre :**
- Cinq tableaux de bord Grafana (webhooks, formulaires, planificateur, déclencheurs par sondage, tâches système) et une pile Prometheus et Grafana
  en local ; côté n8n, `N8N_METRICS=true` et l'adresse `/metrics` ; mesures : volumes, taux d'échec, latences, file du planificateur, retards,
  doublons possibles des déclencheurs par sondage ; alerte Slack facultative (plus de 5 échecs de webhook en 30 secondes) ; identifiants Grafana par
  défaut `admin/admin` à changer ; OpenTelemetry seulement prévu.

**Principes et patterns réutilisables :**
- Superviser le moteur par ses propres métriques, en plus du journal métier.

**Erreurs à éviter :**
- Laisser `admin/admin` ; ajouter une pile de supervision sur un disque déjà presque plein.

**Ce qui s'applique à Presti / à ce client :**
- Plus tard, si la charge d'Oracle le justifie : `N8N_METRICS` lu par un tableau de bord interne. D'abord le journal Supabase et `lib-battement`
  (`p5-entreprise-sur-mesure.md:255`).

**Ce qui ne s'applique pas, et pourquoi :**
- Prometheus et Grafana aujourd'hui : deux services de plus sur une machine dont le disque était à 90 % le 01/11 (ADR-003).

**Licence (dépôt) :** fichier `LICENSE.md` lu : MIT, copyright « n8n - Workflow Automation » 2026. **Réutilisable : oui**, avec la mention.

**Chiffres annoncés :** seuil d'alerte d'exemple de 5 échecs en 30 secondes.

---

## Fiche 11 — n8n-io/test-workflows

**Source :** « test-workflows », n8n GmbH, https://github.com/n8n-io/test-workflows · **archivé**, dernier push le 2026-06-01 · lue le 2026-11-02 ·
intégralement : **non** (métadonnées seulement).

**Ce qu'elle montre :** des workflows « utilisés pour tester les nœuds » (description du dépôt) ; dépôt archivé.

**Principes et patterns réutilisables :** l'idée d'un jeu de workflows de test rejoués contre le moteur, que la consigne demande pour chaque
sous-workflow (`p5-entreprise-sur-mesure.md:312-313`).

**Erreurs à éviter :** s'appuyer sur un dépôt archivé et sans licence.

**Ce qui s'applique à Presti / à ce client :** rien de plus que l'idée ; nos tests vivent dans le lanceur de Presti (`p5-entreprise-sur-mesure.md:312`).

**Ce qui ne s'applique pas, et pourquoi :** le contenu : archivé, sans licence, non lu.

**Licence (dépôt) :** **aucune** (API `/license` : 404). **Réutilisable : non.**

**Chiffres annoncés :** aucun.

---

## Patterns retenus pour la bibliothèque lib-*

La bibliothèque partagée de `p5-entreprise-sur-mesure.md:158` (gabarits partagés d'un client à l'autre, jamais les données). Nommage
`lib-<fonction>` (`p5-entreprise-sur-mesure.md:163`) : la convention de Presti prime sur celle des skills officielles, qui le permettent
(fiche 6) ; s'y ajoutent les tags `subworkflow`, un tag de domaine, et `tool` quand un agent l'appelle. Chaque gabarit : entrée à champs typés et
nœud final « Return » (fiche 6), sortie d'erreur câblée, workflow d'erreur commun, appelants restreints (fiche 4), drapeau `simulation` reçu en
entrée (`p5-entreprise-sur-mesure.md:161`).

Rien de ceci n'est construit (mode A, `p5-entreprise-sur-mesure.md:335`). La démonstration se fera sur une entreprise fictive marquée « Exemple. »
(`p5-entreprise-sur-mesure.md:429`).

| Gabarit | Couche (`p5…:157`) | Ce qu'il fait | Repris de | Adapté pour Presti | Où il se branche | Test hors ligne qui doit pouvoir rougir |
|---|---|---|---|---|---|---|
| `lib-valider-contrat` | entrée de toutes | valide l'entrée d'un enfant contre son schéma ; rend `{ valide, erreur, details }` ; hors schéma : journal, aucune action | skills, gestion d'erreur (sous-workflow de validation) et sous-workflows (champs typés, Return) ; n8n-docs | appelé en tête de chaque `ent-*` et `lib-*` ; schémas versionnés avec les exports (`p5…:159`, `:164`) | Execute Workflow Trigger v1.3 et un nœud Code | une entrée hors schéma ne produit ni écriture ni envoi (`p5…:314`) |
| `lib-capturer-lead` | capture, normalisation | lit les nouvelles demandes écrites par les routes publiques de Presti, toutes les 1 à 5 minutes ; normalise ; rejette sans moyen de contact | awesome n° 1 (normalisation, rejet tôt) ; Zie619 `1918` (normaliseur et cas épinglés) | pas de webhook (`p5…:117`, `:426`) ; lecture GET avec `select=` limité aux colonnes permises (`chantier-4-assistant-plan.md:143-145`), comme le rôle `n8n_lecture` (`supabase/migrations/0189_role_lecture_n8n.sql:41`) ; jamais d'URL venue d'un prospect appelée | table des demandes dans Supabase | cas fictifs « Exemple. » : sans contact → rejet ; téléphone invalide → vide ; doublon → ignoré |
| `lib-normaliser-telephone` | normalisation | met un numéro au format E.164 français, vide un numéro invalide | Zie619 `1918` (pattern seulement : le JSON est US et cassé) | indicatif +33 ; 8 à 10 cas fictifs épinglés, dont des invalides | appelé par `lib-capturer-lead` | « A string », vide, numéro trop court → vide ; jamais d'exception non gérée |
| `lib-dedoublonner` | décision | calcule la clé (organisation, type, objet, jour) et la vérifie en base avant d'agir | skills (déduplication : `rowNotExists`, lecture puis IF avec Always Output Data, purge des marqueurs) ; contre-exemples awesome n° 1 et n° 6 | la clé ne contient ni nom, ni adresse, ni e-mail, comme dans `presti-detecteurs` (`briefs/c4-n8n-detecteurs.md:28`) ; la garde finale est une contrainte d'unicité dans Supabase, source de vérité (`p5…:115`), pas une Data Table n8n | table des actions (migration additive, « go » de Benj) | rejeu du même lot : zéro doublon, zéro double envoi (`p5…:316`) |
| `lib-qualifier-lead` | qualification | note selon la grille écrite avec le client ; calcule priorité et délai cible ; un modèle seulement pour classer un texte libre, sous schéma | awesome n° 1 (poids, seuils, délai cible, Switch avec repli) ; skills (sortie structurée) | le code note, jamais le modèle (`p5…:217`) ; aucun critère discriminant, aucune recherche sur la vie privée (`p5…:189`) | configuration du client dans Supabase (`p5…:424`) | une sortie de modèle hors schéma ne change aucun score |
| `lib-relancer` | décision, exécution | relance selon le calendrier du client (J+1, J+3, J+7 par défaut, `p5…:190`) : « palier atteint et pas encore envoyé » ; s'arrête sur « stop », litige ou escalade | awesome n° 8 (paliers en configuration), corrigé | lit d'abord le registre commun : pas de relance si un autre chemin a relancé il y a moins de 3 jours (`lib/relancesRegistre.ts:18`) ; passe par `lib-porte-conformite` ; Studio et Signature ne bougent pas (`p5…:275`) | cartes à valider (`assistant_actions`, lue par `lib/relancesRegistre.ts:101`) ou pilote (`actions_auto`, `lib/pilote/executeur.ts:37`) | un passage manqué : le palier part au passage suivant, une seule fois ; une relance à moins de 3 jours est bloquée |
| `lib-rediger-message` | rédaction | rédige un e-mail ou un SMS à partir des faits en base, au nom de l'entreprise ; rend un brouillon, n'envoie rien | skills (JSON Schema manuel, champs inconnus à `null`) ; `notion-ideas-subagent` (schéma frais, modèle moins cher, itérations bornées) | aucun prix, délai, créneau ni fournisseur absent de la base (`p5…:191`) ; modèle du produit sous contrat ou modèle local, jamais gratuit en ligne (`p5…:218`, `.claude/rules/securite.md:12`) ; coût journalisé | brouillon → carte « À valider » | un brouillon qui cite un prix absent de la base est arrêté par la porte |
| `lib-porte-conformite` | conformité | veto sur toute sortie : gestes « jamais en automatique » (`p5…:226`), mentions, TVA, opt-out et « STOP », consentement SMS, plafonds, horaires, escalade ; une lecture en erreur vaut refus | skills (validation humaine : vrais paramètres, délai explicite) ; `lib/relancesRegistre.ts:57-58` (une colonne absente est une erreur, donc un refus) | la validation du client passe par la boîte « À valider » de Presti, jamais par un nœud n8n ; `sendAndWait` et `telegramHitlTool` (présents sur Oracle) ne servent qu'aux validations internes de Benj | entre rédaction et exécution | un geste interdit reste une carte même réglé en automatique (`p5…:315`) ; une lecture en erreur donne un refus |
| `lib-journaliser` | journal | une ligne par décision, appel de modèle (coût compris), envoi, refus | Zie619 `1777` (toutes les erreurs journalisées) ; `actions_auto`, qui est déjà le journal du pilote (`lib/pilote/regles.ts:21`) | dans Supabase (`p5…:115`, `:220`) ; n8n ne garde rien : masquage des données d'exécution de production (fiche 4) | table du journal (migration additive, « go » de Benj) | chaque chemin écrit sa ligne ; en simulation, la ligne dit ce qui aurait été fait |
| `lib-alerter` | alerte | alerte la bonne personne ; texte minimal : workflow, catégorie, lien de l'exécution ; une alerte au plus par workflow et catégorie, par fenêtre | Zie619 `0454` (nom et lien, rien d'autre) et `1777` (une alerte par fenêtre de 5 minutes) ; awesome n° 3 (masquage) | Telegram de Benj pour le technique (`p5…:247`), identifiant Telegram de n8n branché par Benj (`.claude/rules/securite.md:14`) ; jamais le client final (`p5…:192`) | Telegram, notifications de l'app | 10 erreurs en une minute → une alerte ; aucun secret ni donnée personnelle dans le texte |
| `lib-erreur-commune` et `lib-diagnostiquer-erreur` | erreurs | Error Trigger → diagnostic (catégorie, message masqué et tronqué, étape suivante) → journal → alerte limitée → compteur du disjoncteur de l'agent | awesome n° 3 (diagnostic) ; n8n-docs (Error Trigger et ses données) ; skills (workflow d'erreur, sorties câblées, reprises) | désigné comme workflow d'erreur de chaque `ent-*` et `lib-*` (`p5…:162`) ; disjoncteur coupé seul après N échecs, réarmé à la main ; reprises de nœud à 3 essais, 5 000 ms ; l'attente croissante passe par une remise en file datée en base, car le moteur plafonne l'attente à 5 000 ms (fiche 6) | tous les workflows | rejeu hors ligne d'un objet d'erreur fictif (le déclencheur ne part pas en manuel) ; N+1 échecs → agent coupé |
| `lib-battement` | supervision | chaque parent écrit son battement ; un contrôle lit le journal et alerte sans signe depuis 26 h (`p5…:255`) | awesome n° 2 (26 h, limite de 250, gardien qui ne se garde pas) | lecture dans Supabase, pas l'API de n8n ; le gardien extérieur reste à décider (question ouverte n° 2) | journal Supabase | un parent muet depuis 26 h → une alerte, une seule |
| `lib-synchroniser-outil` | synchronisation (rang 3) | lit, puis écrit seulement sur la liste signée, dans un outil du client : pagination bornée, lots, écriture par clé, quota de l'API | Zie619 `0792` (pagination par `Link`, écriture par identifiant), sans sa boucle infinie ; Zie619 `0129` (CRM vers CRM), à refaire en nœuds actuels | lecture d'abord (`p5…:254`) ; date de dernière synchronisation visible (`p5…:95`) | outils du client, Supabase | une page vide arrête la boucle ; un rejeu ne duplique rien |
| `lib-rapport-hebdo` | reporting | rapport du gérant : indicateurs calculés en SQL contre la base de départ, ce qui est parti seul, ce qui attend, ce qui a échoué ; chaque chiffre avec sa source et sa date (`p5…:251`) | **aucun JSON de rapport lu** (sources manquantes) ; tiré de la consigne (`p5…:193`) et du bilan agrégé de `presti-detecteurs` (`briefs/c4-n8n-detecteurs.md:100`) | jamais un chiffre déclaré présenté comme mesuré (`p5…:193`) ; commentaire de modèle facultatif, marqué comme tel | console Presti, PDF le lundi à 8 h si le client le veut (`p5…:427`) | un chiffre sans source → rapport refusé |

Ce que la bibliothèque prend à l'existant de Presti, sans le raser : le workflow `presti-detecteurs`, construit en simulation, qui n'écrit ni
n'envoie rien et reste livré inactif, non publié (`plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md:10-11`, tâche `.orchestre/fait/032-003.md:4`) ;
le registre commun des relances (`lib/relancesRegistre.ts:18`) ; le pilote, 10 minutes pour annuler et 20 envois par jour au plus
(`lib/pilote/regles.ts:27`, `:30`) ; l'envoi au nom de l'artisan, son adresse en réponse (`lib/email.ts:6-11`) ; Telegram, déjà branché côté app
(`lib/agents/telegram.ts:12`, commandes `pause`, `etat`, `consigne`). La suite `n8n-specs-qa`, prévue par
`chantier-4-assistant-plan.md:108` et `:145`, n'existait pas au relevé (elle est écrite depuis le 02/11 à 18:55 UTC par 032-019, L12,
pas encore commitée : `scripts/n8n-specs-qa.mjs:1-14`) ; au relevé, aucun `scripts/n8n-*` et, depuis le 02/11 à 19 h 06, une seule mention de n8n dans `scripts/tout-verifier.mjs`
(l.196, `detecteurs-n8n-qa`, commit `49d22f09`).

---

## Pièges

| # | Piège | Où il a été vu | Risque pour Presti | Parade |
|---|---|---|---|---|
| 1 | Copier des JSON dont les droits ne sont pas établis | awesome (le README attribue les droits aux créateurs) ; Zie619 (provenance non documentée) ; dépôts n8n-io sans licence (fiches 9 et 11) | contrefaçon dans un livrable vendu | réécrire, citer la source d'inspiration, ne rien importer (`p5…:87`) |
| 2 | Collection réécrite par un script | Zie619, commit `74bdcdc` du 29/09/2025 : connexions vidées, nœuds remplacés, étiquettes « production-ready » | un workflow importé qui ne fait rien, en silence | ne jamais importer ; pour étudier, lire la version d'avant le 29/09/2025 |
| 3 | Webhooks exposés sans authentification | awesome n° 1 et n° 6 ; Zie619 `0872` | n'importe qui déclenche des envois ou des écritures | n8n reste sur `127.0.0.1` (`.claude/rules/architecture-outils.md:70`) ; exposer est une décision de Benj (`p5…:117`) ; si oui : authentification du déclencheur, signature HMAC, fenêtre de temps, identifiant d'événement dédoublonné en base, limite de débit en amont (awesome n° 5) |
| 4 | n8n qui appelle une URL fournie par un inconnu | awesome n° 1 | requête vers une adresse choisie par un tiers, depuis le réseau d'Oracle | jamais d'URL venue d'un formulaire appelée ; la veille passe par SearXNG ou Firecrawl auto-hébergé (`.claude/rules/architecture-outils.md:56`) |
| 5 | Identifiants et données personnelles dans les JSON | Zie619 `0454` (vrai `chat_id`), `1777` (e-mails), `0792` (identifiants de feuille et de credential) ; awesome n° 7 (identifiant de credential, `instanceId`) | fuite par un export versionné | exports nettoyés : ni identifiant réel, ni `chat_id`, ni e-mail ; contrôle par la suite d'export avant tout dépôt (`.claude/rules/securite.md:9`) |
| 6 | Secrets fixes copiés d'un exemple | starter kit, `.env.example` (clé de chiffrement, mot de passe, JWT identiques pour tous) | identifiants n8n déchiffrables par quiconque lit la base | une clé de chiffrement propre à l'instance, jamais versionnée |
| 7 | Export des identifiants en clair | n8n-docs, `export:credentials --decrypted` | tous les secrets dans un fichier | interdit ; un export de workflow ne porte que la référence de l'identifiant (fiche 6) |
| 8 | Ports ouverts et images non figées | starter kit, n8n-hosting | instance joignable depuis Internet, mise à jour subie | ports liés à `127.0.0.1`, versions épinglées |
| 9 | Modèles gratuits ou fournisseurs non inscrits | Zie619, index (Gemini) ; awesome (Gemini, DeepSeek R1…) ; exemples officiels (OpenRouter, Tavily) | donnée d'un client chez un fournisseur non choisi | modèle du produit sous contrat ou modèle local sur Oracle (`p5…:218`, `.claude/rules/securite.md:12`) ; tout fournisseur inscrit au registre |
| 10 | Nœuds communautaires | `agent-core` (`@tavily/n8n-nodes-tavily`) ; awesome (modèles qui exigent un nœud communautaire ou des crédits, README) | code tiers dans n8n, maintenance inconnue | nœud natif ou HTTP Request d'abord ; un nœud communautaire est une décision de Benj, après lecture de son dépôt, de sa licence et de sa dernière publication |
| 11 | Exécution de commandes par un agent | Zie619 `0872` (valeurs de l'agent dans des commandes shell) | injection de commandes sur Oracle | Execute Command reste exclu (défaut 2.0 ; absent de la recherche sur Oracle le 02/11) |
| 12 | Mode à blanc qui ne bloque rien | awesome n° 6 (`test_mode` lu par personne) ; skills, tests (les sous-workflows s'exécutent pour de vrai pendant un test) | un « essai » qui envoie vraiment | `simulation` passé en entrée de chaque enfant et vérifié par la porte d'exécution ; une suite qui rougit si un envoi part en simulation (`p5…:161`, `:318`) |
| 13 | Reprises mal placées ou fixes | Zie619 (réglages de reprise au niveau du workflow, inexistants) ; awesome n° 4 (3 s fixes) | des reprises qui n'existent pas, ou qui martèlent une API | reprises par nœud (3 essais, 5 000 ms) ; attente croissante par remise en file datée dans Supabase |
| 14 | Workflow d'erreur absent ou non testé | awesome n° 6 (Error Trigger sans workflow d'erreur désigné) ; aucun des 8 JSON d'awesome n'en désigne ; docs : l'Error Trigger ne part pas en manuel ; contradiction docs et skill sur sa publication | pannes muettes | `lib-erreur-commune` désigné partout ; test par rejeu d'un objet d'erreur fictif ; publication vérifiée sur 2.45.6 au premier essai à blanc |
| 15 | Déduplication fragile | awesome n° 1 (clé jamais vérifiée), n° 6 (mémoire du workflow, 24 h) ; skills (Remove Duplicates limité à environ 10 000 entrées, accès concurrents non traités) | doubles envois, surtout au rejeu | contrainte d'unicité dans Supabase sur la clé d'idempotence (`p5…:160`) |
| 16 | Paliers en égalité stricte | awesome n° 8 (exactement 7, 14, 30 jours ; « dernier rappel » jamais relu) | relance sautée ou envoyée deux fois | « palier atteint et non envoyé » avec la clé d'idempotence ; registre commun (`lib/relancesRegistre.ts:18`) |
| 17 | Lectures plafonnées ou sans limite | awesome n° 2 (250 sans pagination) ; `notion-ideas-subagent` (`returnAll`) ; Zie619 `0792` (boucle infinie) | contrôle aveugle à la charge, ou lecture sans fin | pagination bornée et limite explicite (`p5…:166`) |
| 18 | Fuseau par défaut | docs (New York par défaut) ; awesome n° 2 et n° 8 sans fuseau | envois à la mauvaise heure | `Europe/Paris` sur chaque workflow, testé |
| 19 | Vieux nœuds et vieilles habitudes | Zie619 (Cron v1, Merge v1, Set v1, `$env`) ; docs 2.0 (Start retiré, `$env` bloqué, Execute Command exclu) | modèles qui ne tournent plus sur 2.45.6 | nœuds actuels, vérifiés par `search_nodes` sur Oracle avant d'écrire |
| 20 | Offrir un éditeur de logique au client | FAQ de la licence de n8n (fiche 4) | sortie du cadre de la Sustainable Use License | le CRM sur mesure ne règle que des paramètres lus par des workflows de Presti ; question à license@n8n.io pour la limite (question ouverte n° 3) |
| 21 | Agents au coût non borné | `agent-core` (200 itérations, aucune reprise) | facture de modèle qui dérive | itérations bornées, plafond de coût par client et par jour, arrêt et file du lendemain (`p5…:206`, `:264`) |
| 22 | Gestes interdits automatisés par un modèle | awesome n° 6 (créneau réservé seul, SMS sans « STOP », appels vocaux) | geste interdit envoyé au nom du client | liste « jamais en automatique » tenue par la porte (`p5…:226`) ; SMS préparé d'abord (`p5…:246`) |
| 23 | Passerelle de messagerie non officielle | awesome n° 8 (WAHA) | compte WhatsApp du client exposé à un blocage (à vérifier) | rien sans l'API officielle et l'accord du client ; défaut : SMS préparé, e-mail |
| 24 | Chiffres d'auteur pris pour des faits | Zie619 (« 100% Import Success Rate », 4 343) ; awesome (280+, 19 000 étoiles contre 26 230 lues) | promesse fausse dans une proposition | jamais repris ; marqués « annoncé par l'auteur, non vérifié » |

---

## Questions ouvertes, chacune avec un défaut

1. **Installer le plugin officiel `n8n-io/skills` dans Claude Code ?** C'est un réglage de configuration, donc à Benj. Défaut : non ; Claude Code lit
   les skills utiles à la main avant d'écrire chaque `ent-*` ou `lib-*`, comme pour ces fiches.
2. **Qui alerte si Oracle ou n8n tombe ?** Le battement interne ne se garde pas lui-même (awesome n° 2). GitHub Actions n'a plus de quota
   (`p5-entreprise-sur-mesure.md:365`) et les deux crons Vercel sont pris (`p5-entreprise-sur-mesure.md:364`). Défaut : rien de neuf tant que Benj
   n'a pas tranché ; une vérification hors n8n serait une exception à la règle n8n-first, à justifier par écrit (`.claude/rules/architecture-outils.md:21`).
3. **Faire confirmer la limite de licence par license@n8n.io** (un réglage du client qui change la logique, par exemple un calendrier de relances
   ou des seuils, reste-t-il un paramètre ?) Défaut : Claude Code rédige la question, Benj l'envoie (un envoi sortant est à lui) ; d'ici là, les
   réglages du client restent des paramètres bornés, lus par des workflows écrits par Presti.
4. **Le workflow d'erreur doit-il être publié sur 2.45.6 ?** La doc et la skill se contredisent. Défaut : le vérifier au premier essai à blanc, sur le
   bac à essai, sans donnée réelle.
5. **Compléter les sources de rapport** : lire « Run month end close checks and send a management pack with AI commentary » et « Create a Google
   Analytics Data Report with AI… » (awesome, repérés, non lus). Défaut : oui, à la prochaine passe, par une tâche de fiches de lecture pour Hermes,
   sans import.

---

## Sources lues et sources manquantes

### Lues le 2026-11-02

- **Réseau neuronal** : `memoire-presti/source-restructureai-depots-n8n-0211.md` ; `vault/10 Presti/04 Décisions/ADR-001`, `ADR-003`, `ADR-008` ;
  `vault/Produit/Session-2026-11-02-Reseau-neuronal-fin-et-chantier-4.md`.
- **Presti** : `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md` (en entier) ; `lib/plans.ts:15-20`, `:103`, `:114`, `:163` ;
  `lib/email.ts:4-11` ; `lib/relancesRegistre.ts:18`, `:57-58`, `:101` ; `lib/pilote/regles.ts:21`, `:27`, `:30` ; `lib/pilote/executeur.ts:37` ;
  `lib/agents/telegram.ts:12` ; `supabase/migrations/0189_role_lecture_n8n.sql:36-48` ; `plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md:10-11`,
  `:28`, `:100` ; `plans/011-cadrage-01-11/chantier-4-assistant-plan.md:108`, `:143-145` ; `.orchestre/fait/032-003.md:4`, `:6` ;
  `.claude/rules/architecture-outils.md:16`, `:21`, `:24`, `:56`, `:62-65`, `:69-72`, `:84` ; `.claude/rules/securite.md:9-14`.
- **awesome-n8n-templates** : API du dépôt, racine, `LICENSE`, `README.md` (en entier) ; 8 JSON : `Google_Drive_and_Google_Sheets/B2B Demo Lead
  Rescue Desk - Enrich Score Route and Escalate.json`, `devops/n8n Silent Workflow Check.json`, `devops/n8n-failed-execution-doctor.json`,
  `Other_Integrations_and_Use_Cases/Resilient REST API Sync with Retries, Validation, and Sanitized Errors.json`, `…/Signed Webhook HMAC Guard with
  Timestamp Window.json`, `OpenAI_and_LLMs/Score inbound leads with AI, reply by SMS or WhatsApp, book calendar slots and alert sales.json`,
  `Other_Integrations_and_Use_Cases/Using External Workflows as Tools in n8n.json`, `WhatsApp/Send Escalating WhatsApp Invoice Reminders from
  Google Sheets (Hebrew).json`.
- **Zie619/n8n-workflows** : API du dépôt, racine, `LICENSE`, `README.md`, `SECURITY.md`, `scripts/`, liste de `workflows/` et des dossiers `Error`,
  `Executeworkflow`, `Supabase`, `Schedule`, `Hubspot`, `Form` ; historique de `workflows/Error/0454…` ; commit `74bdcdc` ; 7 JSON
  (`Error/1777`, `Error/0454`, `Executeworkflow/1918`, `Executeworkflow/0872`, `Hubspot/0129`, `Form/0633`, `Splitout/0792`) et `Error/0454` au
  commit `c4885ee` ; page d'accueil du site ; index `api/search-index.json` (4 morceaux sur 2,2 Mo).
- **n8n-io** : liste des dépôts de l'organisation (API) ; `n8n` (API, racine, README, LICENSE.md, LICENSE_EE.md) ; `n8n-docs` (racine, README,
  licence, `docs/`, `docs/build/`, `docs/build/flow-logic/`, `docs/_workflows/`, `docs/_workflows/advanced-ai/`, `skills/`, 3 pages de
  `flow-logic`) ; docs.n8n.io : sous-workflows, réglages de workflow, réglages de nœud, changements cassants de la 2.0, Error Trigger, commandes CLI,
  FAQ de la licence ; `self-hosted-ai-starter-kit` (arbre, README, LICENSE, docker-compose, `.env.example`, workflow et 2 identifiants de démo) ;
  `skills` (arbre, README, LICENSE, 3 SKILL.md, 5 références, 3 JSON) ; `n8n-hosting` (arbre, README, LICENSE.md, compose et README du mode file) ;
  `automation-mining-skill` (README, licence) ; `n8n-dynamic-credentials-example` (README, licence absente) ; `n8n-observability` (README, licence) ;
  `test-workflows` (métadonnées, licence absente).
- **n8n d'Oracle, lecture seule** : `search_nodes` sur « error trigger », « execute workflow trigger », « data table », « execute command »,
  « remove duplicates », « postgres », « telegram human review », « structured output parser », « webhook », « schedule trigger ».

### Manquantes ou partielles

| Source | Ce qui manque | Ce que ça empêche | Défaut |
|---|---|---|---|
| Zie619, 4 343 JSON annoncés | 7 lus (et une version ancienne) ; l'index lu en 4 morceaux sur 2,2 Mo ; la liste des fichiers du commit `74bdcdc` tronquée | compter les doublons et les fichiers cassés sur toute la collection | toute la collection est tenue pour non fiable |
| awesome, 280+ modèles annoncés | 8 lus ; les deux modèles de rapport repérés non lus (plafond de 8 par dépôt) | un pattern de rapport tiré d'un exemple réel | `lib-rapport-hebdo` bâti sur la consigne et le journal (question ouverte n° 5) |
| n8n-io, 53 dépôts | 11 ouverts, dont 4 en surface ; liste relue en trois morceaux tronqués | rien d'essentiel pour l'offre (outils de déploiement ou d'éditeurs) | — |
| `n8n`, le code (`packages/`) | non lu | vérifier dans le code le comportement exact d'un nœud | doc officielle et `search_nodes` sur Oracle |
| `n8n-docs` | fragments réutilisables (passage des données entre parent et enfant, bornes de Max Tries et Wait Between Tries) absents des pages lues ; pages du mode file et de l'authentification des webhooks non lues ; JSON de `docs/_workflows/` non lus | les bornes exactes des reprises (la skill dit 5 essais et 5 000 ms, non vérifié dans la doc) | vérifier par `get_node_types` sur Oracle au moment de construire |
| `skills` | 11 SKILL.md non lus, dont `n8n-agents-official`, `n8n-ai-nodes-official`, les listes de revue et de validation de `n8n-workflow-lifecycle-official` (`REVIEW_CHECKLIST.md`, 39 Ko) | la liste officielle de revue avant publication | la lire avant le premier `lib-*` |
| `n8n-dynamic-credentials-example` | le code ; la version et la licence requises | savoir si les identifiants dynamiques sont une fonction Enterprise | ne pas en dépendre ; identifiants nommés par client (`p5…:165`) |
| `test-workflows` | le contenu | — (archivé, sans licence) | — |
