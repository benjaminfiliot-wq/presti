---
type: decision
title: "ADR-001 — Toutes les automatisations dans n8n"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - automatisation
  - n8n
  - migration
aliases:
  - ADR-001
  - Automatisations dans n8n
sources:
  - "Addendum de Benj du 01/11/2026, §1 (règle de migration), §2 (n8n, moteur de toutes les automatisations), §3 (Oracle), §7 (drapeau)"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0109_acquisition_planification.sql:1-17"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0101_ops_horloge.sql:93-94, 164-165"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0104_crieur.sql:77"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0112_pilotage_station.sql:626-628"
  - "C:/Users/benja/Documents/presti/vercel.json:2-11"
  - "C:/Users/benja/Documents/presti/app/api/agents/tic/route.ts:5-11, 20-23, 95"
  - "C:/Users/benja/Documents/presti/app/api/cron/relances/route.ts:1-30"
  - "C:/Users/benja/Documents/presti/lib/pilote/regles.ts:24, 27"
  - "C:/Users/benja/Documents/presti/lib/flags.ts:17, 243"
  - "C:/Users/benja/Documents/presti/CLAUDE.md:25-26, 54-56, 68-69, 101-103 (version de travail du 01/11, non commitée)"
  - "C:/Users/benja/Documents/presti/scripts/verifier-outils-obligatoires.mjs:1-7"
  - "Base Supabase : select jobname, schedule, active from cron.job (lecture seule, 01/11/2026)"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:47, 76, 92"
  - "https://docs.n8n.io/n8n-community-license/community-license/license-faq.md (consultée le 01/11/2026)"
  - "https://docs.n8n.io/choose-how-to-use-n8n.md (consultée le 01/11/2026)"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-001 — Toutes les automatisations dans n8n

> Décision de Benj du 01/11/2026. La section « Décision » reprend son texte. Les faits de l'existant sont cités au fichier et à la ligne. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».

## Contexte

**Le besoin, selon Benj :** unifier l'exécution et éviter le code en dur.

**Ce que Benj a dit le 01/11.** Il relie les pannes répétées à l'absence de n8n : « je sais pourquoi à chaque fois ça déconne et pourquoi ça bug, c'est à cause qu'on n'a pas N8N » (`SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md:47`).

**Presti est en production.** Le dépôt compte 53 pages, 224 routes API et 168 migrations, la dernière étant `0181` (comptage du 01/11 : fichiers `page.tsx` et `route.ts` sous `app/`, fichiers de `supabase/migrations/` hors jumeaux `_A_COLLER`).

**Les automatisations tournent aujourd'hui dans le code, à quatre endroits.**

*1. Les tâches pg_cron de Supabase.* La base en porte 16, dont 15 actives (requête en lecture seule sur `cron.job`, 01/11) :

| Tâche | Écrite dans | Rythme (UTC) | Active le 01/11 |
|---|---|---|---|
| `acq-vigie-meta` | `0109_acquisition_planification.sql:6` | `10 * * * *` | non |
| `acq-recenseur` | `0109:7` | `*/10 * * * *` | oui |
| `acq-rge` | `0109:8` | `15 2 * * *` | oui |
| `acq-juge-faits` | `0109:9` | `35 * * * *` | oui |
| `acq-redacteur` | `0109:10` | `0 * * * *` | oui |
| `acq-standardiste` | `0109:11` | `*/5 * * * *` | oui |
| `acq-maquettes-purge` | `0109:12` | `20 2 * * *` | oui |
| `acq-facteur` | `0109:13` | `*/15 * * * *` | oui |
| `acq-facteur-soir` | `0109:14` | `0 18,19 * * *` | oui |
| `acq-repondeur` | `0109:15` | `*/15 * * * *` | oui |
| `acq-purge-prospects` | `0109:17` | `40 2 * * *` | oui |
| `presti-agents-tic` (le tic) | `0101_ops_horloge.sql:164` | `* * * * *` | oui |
| `presti-cron-menage` | `0101:165` | `17 3 * * *` | oui |
| `presti-crieur` | `0104_crieur.sql:77` | `0 5 * * *` | oui |
| `station-reunions-echues` | `0112_pilotage_station.sql:626` | `*/5 * * * *` | oui |
| `station-experiences-echues` | `0112:628` | `17 3 * * *` | oui |

Les tâches `acq-*` appellent les routes `https://prestiapp.fr/api/cron/<nom>` avec le jeton `cron_secret` lu dans le coffre de la base (`0109:6-15`). Le fichier précise que ses calendriers sont en UTC (`0109:1`).

*2. Le tic de la minute.* `presti-agents-tic` appelle `GET https://prestiapp.fr/api/agents/tic` (`0101:93-94`). La route répond 404 si le drapeau `busAgents` est baissé, et 401 sans le bon jeton (`app/api/agents/tic/route.ts:20-23`). Le drapeau est levé (`lib/flags.ts:17`). Le tic fait tourner les baux, la file d'argent, le veilleur et la livraison des sites (`route.ts:5-11`), et le Pilote automatique (`route.ts:95`).

*3. Deux crons Vercel* (`vercel.json:2-11`) : `/api/cron/relances` à `0 8 * * *` et `/api/canaux/relever` à `0 7 * * *`. La route des relances porte les relances des demandes (`app/api/cron/relances/route.ts:29-30`). Elle importe aussi les tours des impayés (`l. 21`), de la comptabilité (`l. 20`), des rappels du CRM (`l. 23`), de l'après-chantier (`l. 24`), de la livraison des sites (`l. 17`), l'expiration des devis (`l. 11`) et trois purges (`l. 8-10`).

*4. Le Pilote automatique* (`lib/pilote/`). Une action préparée part au nom de l'artisan après un délai d'annulation de 10 minutes (`lib/pilote/regles.ts:24`), avec 20 envois automatiques par jour au plus (`regles.ts:27`). Son drapeau `piloteAutomatique` est levé (`lib/flags.ts:243`).

Les relances côté produit sont décrites dans [[Relances - prospection et produit]] ; l'horloge pg_cron et son jeton, dans [[Routines et usine - qui tourne PC eteint]].

**n8n n'existe pas dans le code.** Le mot n'apparaît dans aucun fichier `.ts`, `.tsx` ou `.mjs` de `lib/`, `app/` et `scripts/` (recherche du 01/11). Trois instances ont été montées le 01/11 (`CLAUDE.md:54-56`, version de travail) :
- **Oracle**, la cible : n8n 2.45.6, bac à sable 1.12.0, exécuteurs de code et SearXNG, installés le 01/11 (fil du 01/11, l. 76). Le service écoute sur `127.0.0.1:5678` (relevé `ss -ltn` du 01/11). Il se joint depuis le PC par le tunnel SSH `127.0.0.1:5679` (`scripts/verifier-outils-obligatoires.mjs:6-7`). Il n'a aucun workflow métier (`CLAUDE.md:54`). Son accès à un modèle passe par freellmapi (fil du 01/11, l. 92).
- **n8n cloud** (`presti.app.n8n.cloud`) : branché à Claude Code par MCP ; 0 workflow (outil `search_workflows`, 01/11).
- **n8n local** sur le PC : arrêté (`CLAUDE.md:56`).

**Le choix inverse avait été fait en septembre.** Le 24/09, n8n était jugé « une brique de plus à exploiter et à payer » ([[Ecosysteme-Recherche-Agents-2026-09-24]], l. 251). Le 25/09 : « n8n écarté : le bus et pg_cron font ce travail » ([[Ecosysteme-Marketing-Reel-2026-09-25]], l. 243 et 323).

## Décision

Texte de Benj (addendum du 01/11, §1 à §3) :

- **Toute automatisation vit dans n8n, jamais en dur dans le backend.** n8n est le moteur de **toutes** les automatisations, **sans exception**.
- n8n tourne en Docker sur le serveur Oracle ; les outils auto-hébergés tournent à côté de lui ([[ADR-003 — Infrastructure auto-hébergée sur Oracle]]).
- **Règle de migration.** On remplace les automatisations existantes (pg_cron `acq-*`, tic de la minute, crons Vercel, Pilote automatique, relances) **une par une** dans n8n. Chaque remplacement suit cinq pas :
  1. workflow n8n créé ;
  2. testé en dry-run (à blanc) ;
  3. comparé à l'ancien comportement ;
  4. ancien code désactivé ;
  5. drapeau vérifié.
- **On ne rase rien en attendant.** Chaque refactor est une suite de pas réversibles.

## Alternatives rejetées

- **Code natif.** C'est l'existant : pg_cron dans Supabase, routes Next.js, crons Vercel, Pilote dans `lib/pilote/`. Benj le rejette : il veut une exécution unifiée, sans code en dur.
- **Autres plateformes.** Benj ne les nomme pas. Le comparatif du 24/09 citait Trigger.dev, Temporal et LangGraph ([[Ecosysteme-Recherche-Agents-2026-09-24]], l. 251).

## Conséquences

**Ce qui doit passer dans n8n.** Les 15 tâches pg_cron actives, les 2 crons Vercel, le Pilote et les relances (inventaire du Contexte). Deux dépendances se voient déjà dans le code :
- le tic porte le Pilote (`app/api/agents/tic/route.ts:95`) : remplacer le tic touche le Pilote ;
- la route des relances regroupe une dizaine de traitements (`app/api/cron/relances/route.ts:1-30`) : chacun deviendra un workflow, ou la route entière un seul.

**Chaque remplacement se prouve.** Le pas 2 (à blanc) et le pas 3 (comparaison) rejoignent deux règles du dépôt : le mode à blanc avant la production, et la journalisation de chaque action (`CLAUDE.md:101-103`). Le pas 5 vise un drapeau réel : `busAgents` pour le tic (`lib/flags.ts:17`), `piloteAutomatique` pour le Pilote (`lib/flags.ts:243`). Quand une migration de schéma est nécessaire, on la colle **puis** on lève le drapeau, jamais l'inverse (addendum §7).

**Le jeton des crons change de main.** Les routes exigent `CRON_SECRET` (`route.ts:21-23`) ; pg_cron le lit dans le coffre de la base (`0109:6`). n8n devra le porter comme identifiant. C'est Benj qui le colle : Claude Code ne saisit jamais une clé (addendum §7).

**La licence de n8n le permet, à une condition.** La FAQ officielle autorise n8n comme moteur interne d'un produit si seul le backend parle à n8n et si les utilisateurs finaux n'ouvrent pas l'éditeur ni ne règlent les workflows (FAQ de la licence, l. 50). Pour Presti : l'artisan ne voit jamais n8n et ne règle aucun workflow. Cela rejoint la règle white-label (`CLAUDE.md:68-69`).

**Le serveur Oracle devient le chemin critique.** Aujourd'hui, les horloges tournent chez Supabase (pg_cron) et chez Vercel. Demain, une seule machine les porte toutes. Ses limites sont dans [[ADR-003 — Infrastructure auto-hébergée sur Oracle]].

**Le réseau.** n8n écoute sur `127.0.0.1` : il peut appeler `prestiapp.fr`, mais rien d'extérieur ne peut l'appeler. Un déclencheur entrant, comme le Brevo Trigger de [[ADR-004 — Brevo gratuit pour l'e-mail en masse]], demande une adresse publique en HTTPS, qui n'existe pas aujourd'hui.

**La documentation suit chaque remplacement.** `CLAUDE.md` (crons et déploiement), `.orchestre/contexte.md` et [[Routines et usine - qui tourne PC eteint]] décrivent l'horloge actuelle.

## Sources et liens

- Addendum de Benj du 01/11/2026, §1, §2, §3 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Code : `supabase/migrations/0109_acquisition_planification.sql:1-17` · `0101_ops_horloge.sql:93-94`, `:164-165` · `0104_crieur.sql:77` · `0112_pilotage_station.sql:626-628` · `vercel.json:2-11` · `app/api/agents/tic/route.ts:5-11`, `:20-23`, `:95` · `app/api/cron/relances/route.ts:1-30` · `lib/pilote/regles.ts:24`, `:27` · `lib/flags.ts:17`, `:243` · `scripts/verifier-outils-obligatoires.mjs:1-7` · `CLAUDE.md:25-26`, `:54-56`, `:68-69`, `:101-103` (version de travail du 01/11).
- Base : `select jobname, schedule, active from cron.job`, lecture seule, 01/11/2026.
- Fil du 01/11 : `SaaS/inbox/sessions/2026-11-01-12h33-b6e06ae6-avant-compression.md`, l. 47, 76 et 92.
- n8n, pages officielles consultées le 01/11/2026 : FAQ de la licence, https://docs.n8n.io/n8n-community-license/community-license/license-faq.md · formules cloud et auto-hébergée, https://docs.n8n.io/choose-how-to-use-n8n.md
- Vault : [[Routines et usine - qui tourne PC eteint]] · [[Relances - prospection et produit]] · [[Ecosysteme-Recherche-Agents-2026-09-24]] · [[Ecosysteme-Marketing-Reel-2026-09-25]] · [[Carte - Outils IA et automatisation]] · [[Journal-Decisions]]
- ADR liés : [[ADR-002 — Hermes Agent systématique + Orca harness]] · [[ADR-003 — Infrastructure auto-hébergée sur Oracle]] · [[ADR-004 — Brevo gratuit pour l'e-mail en masse]] · [[ADR-005 — Prospection e-mail automatique]] · [[ADR-006 — Vidéos et carrousels - validation initiale puis auto|ADR-006 — Vidéos et carrousels : validation initiale puis auto]]

## Points à signaler à Benj

1. **« Sans exception » couvre plus que la liste de migration.** L'addendum nomme cinq familles. D'autres automatisations existent :
   - quatre tâches pg_cron hors `acq-*` : `presti-cron-menage`, `presti-crieur`, `station-reunions-echues`, `station-experiences-echues` (table du Contexte) ;
   - deux crons GitHub Actions : l'audit de nuit (`.github/workflows/audit.yml:17`, `17 2 * * *`) et la sauvegarde (`.github/workflows/sauvegarde.yml:18`, `40 1 * * *`) ;
   - huit tâches planifiées actives sur le PC le 01/11 : `chasse-prospects-quotidienne`, `harvey-boucle-quotidienne`, `presti-chasse-artisans-reseaux`, `presti-file-prospection-matin`, `presti-directeur-bilan-soir`, `presti-rangement-vault-soir`, `ia-caller-agenda`, `presti-apprentissage-hebdo` (outil `list_scheduled_tasks`, 01/11) ;
   - le planificateur interne de Hermes, dont le battement tourne sur le PC (`%LOCALAPPDATA%/hermes/cron/ticker_heartbeat`, mis à jour le 01/11). Je n'ai pas vérifié s'il porte des tâches.

   Entrent-elles dans la décision ?
2. **`CLAUDE.md` affaiblit la décision.** Sa version de travail écrit : « Aucune automatisation n'est codée en dur dans le backend si elle peut être un workflow n8n » (`CLAUDE.md:25-26`). L'addendum dit « jamais » et « sans exception ».
3. **Le n8n cloud est payant après l'essai, et l'accès au n8n d'Oracle passe par le PC.** La doc officielle donne au cloud un essai de 14 jours, puis des formules payantes ; seule l'édition auto-hébergée est gratuite (https://docs.n8n.io/choose-how-to-use-n8n.md). Un connecteur MCP `n8n-oracle` est déclaré pour Claude Code (`~/.claude.json`) et pour Hermes (`%LOCALAPPDATA%/hermes/config.yaml:2411`). Il passe par le tunnel `127.0.0.1:5679`, tenu par une tâche du PC (`scripts/verifier-outils-obligatoires.mjs:6-7`) : PC éteint ou tunnel coupé, plus personne ne construit ni ne lance un workflow.
4. **Le n8n d'Oracle ne parle qu'à freellmapi**, donc à des modèles gratuits en ligne (fil du 01/11, l. 92). Un workflow qui y ferait passer une donnée de prospect ou de client violerait la règle 7 de l'addendum et la notice publique (`presti-notice/index.html:25`).
5. **Le serveur Oracle était déclaré abandonné le 11/10** ([[Usine]]) et son coût reste à vérifier (détail dans [[ADR-003 — Infrastructure auto-hébergée sur Oracle]]). Il porterait désormais toutes les horloges.
6. **La décision inverse celle du 25/09** (« n8n écarté »). [[Ecosysteme-Marketing-Reel-2026-09-25]] et [[Routines et usine - qui tourne PC eteint]] sont à mettre à jour.
