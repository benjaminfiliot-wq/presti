---
type: decision
title: "ADR-003 — Infrastructure auto-hébergée sur Oracle"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - infrastructure
  - oracle
  - scraping
  - docker
aliases:
  - ADR-003
  - Infrastructure Oracle
sources:
  - "Addendum de Benj du 01/11/2026, §3 (infrastructure auto-hébergée, outils payants ou interdits), §7 (règle 7)"
  - "Relevé SSH en lecture seule du serveur 88.96.53.3, 01/11/2026 à 15 h 43 (Paris) : uname -m, nproc, free -g, df -h /, ss -ltn"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:76"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-14h40-presti-chasse-artisans-reseaux.md:11"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-11h40-harvey-boucle-quotidienne.md:16"
  - "C:/Users/benja/Documents/presti-ops/agents-prospection/outils/enrichir_sites.py:9-13, 46-52, 432"
  - "C:/Users/benja/Documents/presti/CLAUDE.md:34-35, 46-47, 54, 70-74 (version de travail du 01/11, non commitée)"
  - "https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm (consultée le 01/11/2026)"
  - "https://github.com/firecrawl/firecrawl ; https://docs.firecrawl.dev/contributing/self-host ; docker-compose.yaml de la branche main (consultés le 01/11/2026)"
  - "https://github.com/apify/crawlee ; https://crawlee.dev/js/docs/guides/docker-images ; API Docker Hub (consultés le 01/11/2026)"
  - "https://github.com/searxng/searxng ; https://docs.searxng.org/admin/installation-docker.html (consultés le 01/11/2026)"
  - "https://github.com/ScrapeGraphAI/Scrapegraph-ai (consultée le 01/11/2026)"
  - "https://www.linkedin.com/legal/user-agreement (consultée le 01/11/2026)"
  - "https://wavespeed.ai/pricing (consultée le 01/11/2026)"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-003 — Infrastructure auto-hébergée sur Oracle

> Décision de Benj du 01/11/2026. La section « Décision » reprend son texte. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».

## Contexte

**Le besoin, selon Benj :** la contrainte « zéro outil payant ». Elle prolonge « Rien à payer » du 29/10 et « On paye rien » du 26/10 ([[Journal-Decisions]], l. 8 et 18).

**L'état des outils de collecte, au 01/11.**
- *Firecrawl en ligne* : erreur 402 dès le premier appel de l'après-midi ; les crédits du jour partent dans la passe du matin, environ 9 recherches (`SaaS/inbox/sessions/2026-11-01-14h40-presti-chasse-artisans-reseaux.md:11`).
- *Apify* : clé invalide selon Benj (addendum §3 ; `CLAUDE.md:70`). L'enrichisseur garde pourtant une étape Apify : un acteur PagesJaunes, plafonné à 0,15 $ par jour (`presti-ops/agents-prospection/outils/enrichir_sites.py:9-11`, `:46-52`). Harvey a noté « Apify 0 $ » le 01/11 (`SaaS/inbox/sessions/2026-11-01-11h40-harvey-boucle-quotidienne.md:16`).
- *Scrapin* : jamais branché. Aucune occurrence dans `lib/`, `app/`, `scripts/` ni `presti-ops/agents-prospection/` (recherche du 01/11).
- *LinkedIn* : ses conditions d'utilisation interdisent les logiciels, scripts, robots ou extensions qui extraient ou copient le service, profils compris (§8.2, point 2, version en vigueur depuis le 3 novembre 2025 : https://www.linkedin.com/legal/user-agreement, consultée le 01/11). Voir [[Démarchage LinkedIn - cadence et règles]].
- *WaveSpeed* : paiement à l'usage ; un nouveau compte reçoit 1 $ de crédit d'essai (https://wavespeed.ai/pricing, consultée le 01/11). Aucune occurrence dans le code.
- *SearXNG* : installé sur Oracle le 01/11, avec n8n (fil du 01/11, l. 76 ; `CLAUDE.md:54`).
- *ScrapeGraphAI* : déjà utilisé, mais sur le PC. Un venv dédié (`outils-ia/scrapegraph`) porte la bibliothèque `scrapegraphai` 2.3.1 (dossier `scrapegraphai-2.3.1.dist-info` du venv, relevé le 01/11). L'enrichisseur s'en sert avec `claude-haiku-5-5` et la clé Anthropic de Presti (`enrichir_sites.py:12-13`, `:432`). Harvey a fait 83 appels ScrapeGraphAI le 01/11 (`…-11h40-harvey-boucle-quotidienne.md:16`). Voir [[ScrapeGraphAI]] et [[Enrichisseur-sites-2026-10-26]].
- *Crawlee* : aucune trace dans le dépôt ni dans `presti-ops/agents-prospection/` (recherche du 01/11).

**Le serveur Oracle, relevé le 01/11 à 15 h 43 (Paris)**, en lecture seule par SSH (`usine@88.96.53.3`) :
- processeur ARM (`aarch64`), 4 cœurs (`nproc`) ;
- 23 Gio de mémoire, dont 1 Gio utilisé et 20 Gio en cache (`free -g`) ;
- disque `/dev/sda1` de 96 Go : 86 Go utilisés, 11 Go libres, **90 %** (`df -h /`) ;
- services à l'écoute, tous sur `127.0.0.1` : `5678` (n8n), `3001` (freellmapi), `11434` (port par défaut d'Ollama), `41801` (non identifié) ; SSH sur `22` (`ss -ltn`) ;
- les conteneurs ne se listent pas avec ce compte (accès Docker refusé).

Le matin même, le ménage des conteneurs de Hermes et d'OpenClaw avait fait passer le disque de 95 % à 89 % (fil du 01/11, l. 76).

**Son histoire.**
- VM `VM.Standard.A1.Flex` (Ubuntu 24.04 ARM, Paris) créée le 24/09, en 2 OCPU et 12 Go ([[Session-2026-09-15-Lestraque-Vague-5]], l. 177 ; [[Usine]]).
- Passée à 4 OCPU et 24 Go le 26/09 ([[Ecosysteme-IA-Registre-2026-09-25]], l. 339).
- Déclarée abandonnée le 11/10 ([[Usine]]).
- Passation du 19/10 : « Benj résilie Oracle avant le 24/10 : l'instance tourne en 4 OCPU / 24 Go, au-dessus de la limite gratuite de 2/12 » ([[Passation-2026-10-19]], l. 105).
- Le QG notait ensuite « l'essai Oracle a expiré le 24/10 (usine à vérifier) » (cité par [[Usine]]).

**L'offre gratuite d'Oracle, page officielle** (https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm, consultée le 01/11) :
- instances Ampere A1 : 1 500 heures d'OCPU et 9 000 Go-heures par mois, soit 2 OCPU et 12 Go de mémoire ;
- 200 Go de stockage bloc au total, volumes de démarrage compris ;
- les instances Always Free inactives peuvent être récupérées ; pour les formes A1, le critère d'inactivité inclut une mémoire utilisée sous 20 %.

**Licences et hébergement des quatre outils** (pages officielles, consultées le 01/11) :

| Outil | Licence | Hébergement en Docker | Points d'attention |
|---|---|---|---|
| Firecrawl | AGPL-3.0 ; SDK et quelques composants sous MIT (github.com/firecrawl/firecrawl) | Docker Compose : API sur le port 3002, avec Playwright, Redis, PostgreSQL (la file) et RabbitMQ (docs.firecrawl.dev/contributing/self-host). Le `docker-compose.yaml` construit l'API, Playwright et la base depuis les sources ; les images `ghcr.io` sont en option (l. 5-7, 65-67, 167-169) | Fire-engine non inclus ; captures et actions absentes de la pile par défaut ; aucune taille minimale publiée ; ARM non mentionné ; extraction par modèle via un fournisseur compatible OpenAI ou Ollama |
| Crawlee | Apache-2.0 ; c'est une bibliothèque, paquet npm `crawlee` (github.com/apify/crawlee) | Dockerfiles prêts à déployer (README) ; images de base `apify/actor-node*` (crawlee.dev/js/docs/guides/docker-images) | Les trois dernières étiquettes de `apify/actor-node-playwright` et de `apify/actor-node-playwright-chrome` sont publiées en amd64 seulement (API Docker Hub, 01/11). Développé par Apify ; le README dit qu'il tourne partout |
| SearXNG | AGPL-3.0 (github.com/searxng/searxng) | Docker Compose recommandé ; images sur Docker Hub et GHCR (docs.searxng.org/admin/installation-docker.html) | Déjà installé ; ARM non mentionné sur cette page |
| ScrapeGraphAI | MIT pour la bibliothèque ; l'API hébergée est payante (github.com/ScrapeGraphAI/Scrapegraph-ai) | Le dépôt contient un `Dockerfile` et un `docker-compose.yml`, que le README ne décrit pas | Il lui faut un modèle : par API (OpenAI, Groq, Gemini…) ou local par Ollama |

## Décision

Texte de Benj (addendum du 01/11, §3) :

- **Tout tourne en Docker sur le serveur Oracle (88.96.53.3), à côté de n8n :**
  - **Firecrawl auto-hébergé** (Docker) — remplace Firecrawl en ligne ;
  - **Crawlee** (Docker) — scraping de pages dynamiques ;
  - **SearXNG** (déjà installé) — recherche web méta ;
  - **ScrapeGraphAI** (Docker) — extraction structurée assistée par IA.
- **Outils payants ou interdits — ne pas utiliser :**
  - Firecrawl en ligne : à sec ;
  - Apify : clé invalide ;
  - Scrapin : jamais branché ;
  - LinkedIn : collecte interdite par ses conditions ;
  - WaveSpeed : payant, ne pas utiliser sans accord explicite.

## Alternatives rejetées

Payants ou interdits, selon Benj (addendum §3 ; ADR demandé le 01/11) :
- **Firecrawl en ligne** : à sec.
- **Apify** : clé invalide.
- **Scrapin** : jamais branché.
- **LinkedIn** : collecte interdite par ses conditions.
- **WaveSpeed** : payant ; aucun usage sans accord explicite de Benj.

## Conséquences

**La machine est petite pour tout ce qu'elle doit porter.** Elle porte déjà n8n (avec ses exécuteurs et son bac à sable), SearXNG, freellmapi et un service sur le port d'Ollama. S'y ajoutent Firecrawl (API, Playwright, Redis, PostgreSQL, RabbitMQ), Crawlee (un navigateur) et ScrapeGraphAI (et son modèle). Firecrawl ne publie aucune taille minimale. Avec 11 Go libres, l'installation demande d'abord de la place.

**Les images doivent être ARM.** Le serveur est en `aarch64`. Les images de base publiées pour Crawlee sont en amd64 : il faudra construire une image arm64. Firecrawl se construit depuis ses sources. L'architecture des autres images reste à vérifier.

**Le modèle de ScrapeGraphAI et de l'extraction Firecrawl suit la règle 7.** Aucune donnée de prospect ni de client ne part vers un modèle gratuit en ligne (addendum §7). freellmapi est donc exclu pour ces données. Restent un modèle local (Ollama sur le serveur) ou Claude par l'API, payé sur le crédit, comme aujourd'hui sur le PC.

**Tout reste fermé à internet.** Les services écoutent sur `127.0.0.1` ; n8n les appelle par le réseau Docker du serveur.

**AGPL-3.0 pour Firecrawl et SearXNG.** Utilisés tels quels et en interne, ils ne changent rien à nos obligations. Toute modification de leur code est à faire relire avant (clause réseau de l'AGPL).

**La chasse et Harvey changent d'outils.** Ils passent de Firecrawl en ligne, de WebSearch et d'Apify aux outils du serveur, dans des workflows n8n ([[ADR-001 — Toutes les automatisations dans n8n]]).

**La notice et le registre changent.** La notice nomme Firecrawl comme prestataire qui reçoit le nom d'une entreprise et sa commune (`presti-notice/index.html:24`) ; auto-hébergé, Firecrawl ne reçoit plus rien. Elle présente Oracle comme le serveur de fabrication des maquettes et des sites (`index.html:19`) ; son rôle s'élargit à la collecte et aux automatisations.

## Sources et liens

- Addendum de Benj du 01/11/2026, §3 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Serveur : relevé SSH en lecture seule du 01/11/2026, 15 h 43 (Paris) : `uname -m`, `nproc`, `free -g`, `df -h /`, `ss -ltn`.
- Fils du 01/11 : `SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:76` · `2026-11-01-14h40-presti-chasse-artisans-reseaux.md:11` · `2026-11-01-11h40-harvey-boucle-quotidienne.md:16`.
- Code : `presti-ops/agents-prospection/outils/enrichir_sites.py:9-13`, `:46-52`, `:432` · `CLAUDE.md:34-35`, `:46-47`, `:54`, `:70-74` (version de travail du 01/11).
- Notice publique : `presti-notice/index.html:19`, `:24` (commit `1f9a8bd`).
- Pages officielles consultées le 01/11/2026 : Oracle Always Free, https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm · Firecrawl, https://github.com/firecrawl/firecrawl et https://docs.firecrawl.dev/contributing/self-host · Crawlee, https://github.com/apify/crawlee et https://crawlee.dev/js/docs/guides/docker-images · SearXNG, https://github.com/searxng/searxng et https://docs.searxng.org/admin/installation-docker.html · ScrapeGraphAI, https://github.com/ScrapeGraphAI/Scrapegraph-ai · LinkedIn, https://www.linkedin.com/legal/user-agreement · WaveSpeed, https://wavespeed.ai/pricing
- Vault : [[Usine]] · [[Usine Oracle presti-usine]] · [[Routines et usine - qui tourne PC eteint]] · [[Passation-2026-10-19]] · [[Session-2026-09-15-Lestraque-Vague-5]] · [[Ecosysteme-IA-Registre-2026-09-25]] · [[ScrapeGraphAI]] · [[Enrichisseur-sites-2026-10-26]] · [[Harvey]] · [[Démarchage LinkedIn - cadence et règles]] · [[Journal-Decisions]] · [[Carte - Outils IA et automatisation]]
- ADR liés : [[ADR-001 — Toutes les automatisations dans n8n]] · [[ADR-002 — Hermes Agent systématique + Orca harness]]

## Points à signaler à Benj

1. **Le serveur dépasse l'offre gratuite d'Oracle.** Relevé du 01/11 : 4 cœurs et 23 Gio, pour une offre gratuite de 2 OCPU et 12 Go (page officielle). L'essai était noté « expiré le 24/10 » et la résiliation prévue « avant le 24/10 » ; l'instance tourne toujours. Seule la console Oracle dit si elle est facturée. Si elle l'est, la contrainte « zéro outil payant » est contredite. Si on revient à 2 OCPU et 12 Go, toute la pile devra tenir dans la moitié.
2. **Le disque est à 90 %** (86 Go sur 96, 01/11). Il était plein à 99 % le 12/10 ([[Usine]]). L'offre gratuite compte 200 Go de volumes au total.
3. **Une instance Always Free peut être récupérée par Oracle.** La mémoire utilisée relevée (1 Gio sur 23) pourrait être sous le seuil de 20 % de la page officielle. Une machine récupérée arrêterait toutes les automatisations ([[ADR-001 — Toutes les automatisations dans n8n]]). Ce risque ne vaut que si l'instance est en Always Free.
4. **Le vault dit encore « abandonnée ».** [[Usine]] porte « abandonnée le 11/10 » et « Ne pas proposer de le relancer ». [[Usine]], [[Usine Oracle presti-usine]] et [[Routines et usine - qui tourne PC eteint]] sont à mettre à jour.
5. **L'adresse IP peut changer.** [[Usine Oracle presti-usine]] la dit éphémère si l'instance est recréée. L'addendum et `CLAUDE.md:54` l'écrivent en dur.
6. **`CLAUDE.md` contredit la décision.** Sa version de travail nomme encore « Firecrawl, Scrapin, Apify, SERP » pour la découverte et « WaveSpeed » pour les visuels (`CLAUDE.md:34-35`, `:46-47`), alors que ses lignes 70-74 les écartent.
7. **L'enrichisseur garde une étape Apify payante** (`enrichir_sites.py:9-11`, `:46-52`), contraire à la décision.
8. **ScrapeGraphAI tourne aujourd'hui avec Claude Haiku, sur le crédit payant.** Sur Oracle, il faudra choisir : Ollama local ou Claude par l'API. En septembre, les données de prospects ne devaient passer par l'Ollama du serveur qu'après une validation de Benj, jamais donnée ([[Usine]]).
9. **Firecrawl auto-hébergé n'a pas Fire-engine** (doc officielle). Les sites protégés passeront moins bien qu'avec le service en ligne.
10. **SearXNG n'est pas vérifiable avec le compte `usine`** : accès Docker refusé, aucun port de l'hôte. Sa présence repose sur le fil du 01/11 et sur `CLAUDE.md:54`.
