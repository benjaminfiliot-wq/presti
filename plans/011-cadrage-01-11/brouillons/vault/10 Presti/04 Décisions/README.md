---
type: meta
title: "Décisions de Presti (ADR)"
date: 2026-11-01
status: developing
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - index
aliases:
  - Index des ADR
  - Décisions ADR
sources:
  - "Addendum de Benj du 01/11/2026 : consigne pour la phase 1.4 (décisions à migrer dans le vault) et consigne sur CLAUDE.md et .claude/rules/"
origine: "brouillon de la phase 1.4 (01/11/2026) ; à relire avant rangement dans le vault"
---

# Décisions de Presti (ADR)

**Les ADR sont la source de vérité du « pourquoi ».** Le `CLAUDE.md` du dépôt et les fichiers de `.claude/rules/` ne gardent que le « quoi », en court, et renvoient ici pour la raison. C'est la consigne de Benj du 01/11/2026.

Chaque ADR suit le format demandé par Benj : un en-tête (`type: decision`, `date`, `status`, `project`), puis Contexte, Décision, Alternatives rejetées, Conséquences, Sources et liens. Une dernière section, « Points à signaler à Benj », range à part ce que l'existant contredit ou complète, sans toucher à la décision.

## Index

| N° | Décision | Date | Statut | En une ligne |
|---|---|---|---|---|
| 001 | [[ADR-001 — Toutes les automatisations dans n8n]] | 01/11/2026 | acceptée | Toute automatisation vit dans n8n, sans exception ; l'existant migre une par une, rien n'est rasé en attendant. |
| 002 | [[ADR-002 — Hermes Agent systématique + Orca harness]] | 01/11/2026 | acceptée | Claude Code et Hermes Agent sont les seuls agents ; Orca est le harness obligatoire de Hermes. |
| 003 | [[ADR-003 — Infrastructure auto-hébergée sur Oracle]] | 01/11/2026 | acceptée | Firecrawl, Crawlee, SearXNG et ScrapeGraphAI tournent en Docker sur Oracle ; Firecrawl en ligne, Apify, Scrapin, LinkedIn et WaveSpeed sont écartés. |
| 004 | [[ADR-004 — Brevo gratuit pour l'e-mail en masse]] | 01/11/2026 | acceptée | Brevo gratuit, 300 envois par jour, quota vérifié avant chaque campagne ; Listmonk + SES au-delà de 9 000 par mois ou de 2 000 contacts en automatisation. |
| 005 | [[ADR-005 — Prospection e-mail automatique]] | 01/11/2026 | acceptée | La prospection par e-mail part sans validation de Benj, sous plafond, opt-out, exclusion et journalisation. |
| 006 | [[ADR-006 — Vidéos et carrousels - validation initiale puis auto\|ADR-006 — Vidéos et carrousels : validation initiale puis auto]] | 01/11/2026 | acceptée | Benj valide les 2-3 premiers contenus d'un format, puis le format se publie seul, sous QA continue. |

Le statut `accepted` traduit des décisions verrouillées par Benj le 01/11. Le texte des notes, lui, reste un brouillon à relire.

## Règles courtes et ADR

Benj a demandé le 01/11 cinq fichiers dans `.claude/rules/`, chacun repris d'une section de l'addendum, et un `CLAUDE.md` racine de moins de 200 lignes qui renvoie vers eux. Rattachement proposé entre ces fichiers et les ADR :

| Fichier de règles | Section de l'addendum | ADR qui en donnent le pourquoi |
|---|---|---|
| `architecture-outils.md` | §2 et §3 | 001, 002, 003 |
| `autonomie-abonnements.md` | §5 | 005, 006 |
| `email-brevo.md` | §4 | 004, 005 |
| `migration-production.md` | §1 | 001 |
| `securite.md` | §7 | transversal ; exceptions écrites : 005 et 006 |

La méthode du dépôt (§6 de l'addendum) est reprise dans [[ADR-002 — Hermes Agent systématique + Orca harness]].

## Tenue du dossier (proposition, à valider par Benj)

- Un fichier par décision, nommé `ADR-00N — <titre>.md` ; un numéro n'est jamais réutilisé.
- L'en-tête reprend les champs de Benj et ceux des notes du wiki : `title`, `created`, `updated`, `tags`, `aliases`, `sources`, `origine`.
- Une décision prise ne se réécrit pas. Une nouvelle ADR la remplace ; l'ancienne passe en `status: superseded`, avec le lien vers la nouvelle.
- Chaque nouvelle ADR est notée en une ligne dans [[Journal-Decisions]].
- Un titre qui contient un caractère interdit dans un nom de fichier (`:` par exemple) garde son texte exact dans `title` et dans les alias ; le nom du fichier remplace le caractère.

## Ce qui reste à trancher (vue d'ensemble)

Le détail est dans la dernière section de chaque ADR. Les points qui touchent plusieurs décisions :

1. **Brevo interdit la prospection prévue.** Sa politique interdit les listes relevées sur internet et exige une preuve d'opt-in par contact, sous peine de suspension du compte entier. La prospection automatique (005) repose sur ce prestataire (004, points 1 et 2).
2. **Le coût réel du serveur Oracle.** Relevé du 01/11 : 4 cœurs et 23 Gio, pour une offre gratuite de 2 OCPU et 12 Go ; disque à 90 % (003, points 1 à 3). Toutes les automatisations y passeraient (001).
3. **La règle 7 face à freellmapi.** Aucune donnée de prospect ni de client ne doit partir vers un modèle gratuit en ligne. Or le n8n d'Oracle n'a que freellmapi comme accès à un modèle (001, point 4 ; 003, point 8). Hermes, lui, n'a plus de repli gratuit depuis le 01/11 à 16 h 05 (002).
4. **La notice publique contredit plusieurs décisions.** Prestataires (Brevo absent, Codex et Firecrawl présents), lien de désinscription, canal des réponses, liste RGE de l'ADEME (002, 003, 004, 005).
5. **Le périmètre de « sans exception ».** Tâches planifiées du PC, crons GitHub Actions, planificateur de Hermes (001, point 1).
6. **Tout le développement dépend d'un tunnel tenu par le PC.** Le crochet `verifier-outils-obligatoires.mjs` bloque les écritures de Claude Code quand le tunnel vers n8n tombe (002, point 4).
7. **Un jeton en clair dans un fil du vault**, indexé par le cerveau (002, point 7).

## Points à signaler à Benj (sur ce dossier)

- **Le dossier `10 Presti/04 Décisions/` n'existe pas encore dans le vault.** Les décisions vivent aujourd'hui dans [[Journal-Decisions]], et les notes de fond dans `wiki/concepts/` (inventaire du 01/11, `presti/plans/011-cadrage-01-11/cadrage-00-synthese.md:38`).
- **Le texte source n'est pas dans le vault.** Les six ADR citent l'addendum du 01/11 ; tant qu'il n'est pas rangé (par exemple dans `inbox/` ou `Decisions/`), leur source première peut se perdre.
- **Le titre exact de l'ADR-006 contient « : ».** Ce caractère est interdit dans un nom de fichier sous Windows et dans Obsidian. Le fichier s'appelle « ADR-006 — Vidéos et carrousels - validation initiale puis auto » ; le titre exact reste dans son en-tête, ses alias et son titre.
- **Les décisions du 01/11 en remplacent d'autres.** « n8n écarté » (25/09), « Brevo pas pour le froid » (24/09, 19/10, D1 du 26/10), « usine abandonnée » (11/10), exécutants Antigravity et Codex (méthode v16) : les notes qui les portent sont citées dans chaque ADR et restent à mettre à jour.

## Liens

- [[Journal-Decisions]] · [[Récap-Projet]] · [[Système neuronal du cerveau]] · [[Documents perimes et ce qui fait foi]] · [[Lecons validees - comment une regle devient consigne]]
- Cartes : [[Carte - Outils IA et automatisation]] · [[Carte - Prospection et relation artisan]] · [[Carte - Vidéo et pubs]] · [[Carte - Exploitation, docs et agents]]
