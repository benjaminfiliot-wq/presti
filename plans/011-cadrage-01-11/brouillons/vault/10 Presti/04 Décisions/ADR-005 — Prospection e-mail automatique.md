---
type: decision
title: "ADR-005 — Prospection e-mail automatique"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - prospection
  - envoi
  - autonomie
  - garde-fou
aliases:
  - ADR-005
  - Prospection automatique
sources:
  - "Addendum de Benj du 01/11/2026, §4 (règles d'usage), §5 (autonomie), §7 (exceptions à l'accord de Benj)"
  - "C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-00-synthese.md:18, 32-37"
  - "C:/Users/benja/Documents/presti/CLAUDE.md:75-76, 103 (version de travail du 01/11, non commitée)"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0096_ops_socle.sql:172-193"
  - "C:/Users/benja/Documents/presti/supabase/migrations/0124_automatisme_sous_gardes.sql:290-293"
  - "C:/Users/benja/Documents/presti-notice-publication/index.html:9, 10, 25 (commit 1f9a8bd du 13/10)"
  - "C:/Users/benja/Documents/SaaS/Decisions/Journal-Decisions.md:5, 19"
  - "C:/Users/benja/Documents/SaaS/inbox/sessions/2026-11-01-11h40-harvey-boucle-quotidienne.md:16"
  - "Outil list_scheduled_tasks, état des tâches planifiées du PC au 01/11/2026"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-005 — Prospection e-mail automatique

> Décision de Benj du 01/11/2026. La section « Décision » reprend son texte. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».

## Contexte

**Le besoin, selon Benj :** le volume et l'efficacité.

**La règle d'avant : rien ne partait sans validation.**
- La tâche d'envoi exigeait le feu vert écrit de Benj (`FEU-VERT.txt`), une fenêtre de 8 h 30 à 18 h 30 en semaine et 4 à 15 minutes entre deux envois ([[Garde-fous d'envoi e-mail et délivrabilité]]).
- Le prompt de lancement du 01/11 exige une validation humaine avant tout envoi d'e-mail (`CLAUDE.md:75-76`).
- Le 01/11 au matin, `presti-envoi-prospection` a été mise en pause. Elle cliquait « Envoyer » dans Gmail, contre deux règles écrites ce jour-là : « jamais Claude qui clique Envoyer dans Gmail » et « aucun message ne contredit la notice publiée » (`plans/011-cadrage-01-11/cadrage-00-synthese.md:18`). Elle est toujours désactivée (outil `list_scheduled_tasks`, 01/11).

**Ce qui tourne encore, sans rien envoyer.** `chasse-prospects-quotidienne`, `harvey-boucle-quotidienne` et `presti-file-prospection-matin` sont actives (outil `list_scheduled_tasks`, 01/11).

**Ce qui est déjà parti.** Les 187 envois réels sont tous partis du PC, par Gmail. La chaîne serveur n'a jamais envoyé d'e-mail à froid, et ses 5 040 prospects n'ont pas d'adresse e-mail (inventaire du 01/11, `cadrage-00-synthese.md:32-36`).

**Ce que la base permet.**
- Pas de canal d'e-mail froid : la liste des canaux de `ops.envois` ne le contient pas (`supabase/migrations/0096_ops_socle.sql:175`).
- Un premier contact par e-mail est refusé par un déclencheur (`0124_automatisme_sous_gardes.sql:290-293`).
- Un envoi ne passe au statut « envoyé » que s'il a été approuvé par l'agent `facteur` (`0096:190`).
- La liste d'opposition existe (`ops.opposition`, `0096:193`).

**Ce que promet la notice publique** (`presti-notice`, commit `1f9a8bd` du 13/10) :
- un premier e-mail, une seule fois, à l'adresse que l'entreprise publie sur son propre site, jamais devinée ni prise dans un annuaire ; sans lien ni pièce jointe ; aucune relance (`index.html:9`) ;
- un seul message par entreprise, à vie, sans relance ; l'assistant IA se présente dès sa première phrase (`index.html:10`) ;
- aucune donnée de prospect n'est envoyée à une IA gratuite (`index.html:25`).

**Le cadre légal noté au vault.** Contacter un artisan pour son métier se fait en opt-out, si l'offre touche son activité, s'il est informé et s'il peut refuser simplement ; son droit d'opposition est absolu ([[Cadre légal et notice de prospection]]). La question des relances reste ouverte ([[Un message par artisan puis cinq jours]]).

## Décision

Texte de Benj (addendum du 01/11, §5 et §7 ; ADR demandé le 01/11) :

- **La prospection e-mail est automatique, sans validation de Benj.**
- C'est l'une des exceptions écrites à la règle « toute action irréversible attend l'accord de Benj » (addendum §7).
- **Garde-fous :** plafond de 300 par jour, opt-out, exclusion, journalisation.
- L'envoi suit les règles d'usage de [[ADR-004 — Brevo gratuit pour l'e-mail en masse]] : quota vérifié avant chaque campagne ; file pour le lendemain si le plafond est atteint, jamais bloquée ni perdue ; réponses, rebonds et désabonnements reportés dans Supabase.

## Alternatives rejetées

Benj n'en nomme pas dans son texte du 01/11. La décision écarte de fait la règle précédente : chaque envoi validé par un humain (feu vert de Benj, file « approuvée », prompt de lancement cité en `CLAUDE.md:75-76`).

## Conséquences

**Les quatre garde-fous ont déjà une base dans l'existant.**

| Garde-fou de Benj | Ce qui existe déjà |
|---|---|
| Plafond de 300 par jour | 50 par jour sur Gmail depuis le 29/10 ([[Journal-Decisions]], l. 5) ; le quota de Brevo ([[ADR-004 — Brevo gratuit pour l'e-mail en masse]]) |
| Opt-out | « stop » vaut opposition immédiate et définitive, pour toute l'entreprise et sur tous les canaux ([[Cadre légal et notice de prospection]]) ; table `ops.opposition` (`0096:193`) |
| Exclusion | une fois par artisan ; dédoublonnage ENVOIS, OPPOSITIONS, `deja-ecrites-gmail.txt` et `ecartes.txt` ([[Journal-Decisions]], 26/10, l. 19) ; clés `siren`, `domaine` et `email` de `ops.opposition` |
| Journalisation | table `ops.envois` : canal, type, statut, verdicts, dates (`0096:172-191`) ; règle « chaque action est journalisée » (`CLAUDE.md:103`) |

**Une migration de schéma est nécessaire.** Tant que la base refuse le premier contact par e-mail (`0124:290-293`), ne connaît pas de canal d'e-mail froid (`0096:175`) et réserve l'envoi au `facteur` (`0096:190`), un workflow n8n ne peut pas journaliser un tel envoi dans `ops.envois`. Claude Code écrit la migration ; on la colle, puis on lève le drapeau (addendum §6 et §7).

**L'envoi quitte le PC.** La tâche `presti-envoi-prospection` (Gmail) laisse la place à un workflow n8n qui envoie par Brevo ([[ADR-001 — Toutes les automatisations dans n8n]] ; [[ADR-004 — Brevo gratuit pour l'e-mail en masse]]).

**La notice reste l'engagement public.** La règle écrite le 01/11 au matin dit qu'aucun message ne la contredit (`cadrage-00-synthese.md:18`). Tout changement de prestataire, de canal de réponse ou de source d'adresse s'y reporte avant l'envoi.

## Sources et liens

- Addendum de Benj du 01/11/2026, §4, §5 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Dépôt : `plans/011-cadrage-01-11/cadrage-00-synthese.md:18`, `:32-37` · `CLAUDE.md:75-76`, `:103` (version de travail du 01/11) · `supabase/migrations/0096_ops_socle.sql:172-193` · `0124_automatisme_sous_gardes.sql:290-293`.
- Notice publique : `presti-notice/index.html:9`, `:10`, `:25` (dépôt `benjaminfiliot-wq/presti-notice`, commit `1f9a8bd`).
- Tâches du PC : outil `list_scheduled_tasks`, 01/11/2026.
- Fil du 01/11 : `SaaS/inbox/sessions/2026-11-01-11h40-harvey-boucle-quotidienne.md:16`.
- Vault : [[Journal-Decisions]] · [[Garde-fous d'envoi e-mail et délivrabilité]] · [[Cadre légal et notice de prospection]] · [[Un message par artisan puis cinq jours]] · [[Format d'e-mail froid artisan]] · [[Offre exacte et interdits en prospection]] · [[Règles de Benj — accords et gestes interdits]] · [[Agents de prospection presti-ops]] · [[Carte - Prospection et relation artisan]]
- ADR liés : [[ADR-004 — Brevo gratuit pour l'e-mail en masse]] · [[ADR-001 — Toutes les automatisations dans n8n]] · [[ADR-006 — Vidéos et carrousels - validation initiale puis auto|ADR-006 — Vidéos et carrousels : validation initiale puis auto]]

## Points à signaler à Benj

1. **Le prestataire choisi interdit cet usage.** Voir [[ADR-004 — Brevo gratuit pour l'e-mail en masse]], points 1 et 2. Selon le vault, le droit français permet l'opt-out entre professionnels ; Brevo, lui, exige un opt-in prouvé pour chaque contact.
2. **La notice contredit déjà la pratique sur un point.** Elle dit qu'une adresse n'est jamais prise dans un annuaire (`index.html:9`). Or la liste RGE de l'ADEME est acceptée depuis ton D2 du 26/10 ([[Journal-Decisions]], l. 19) et a servi au moins deux fois (`cadrage-00-synthese.md:37`) ; Harvey en a tiré 5 adresses le 01/11 (`…-11h40-harvey-boucle-quotidienne.md:16`).
3. **Le lien de désinscription.** Brevo l'exige dans tout envoi en masse ; la notice promet un premier message sans lien (`index.html:9`).
4. **Les relances de prospects ne sont pas tranchées.** La décision n'en parle pas ; la notice dit « sans relance » (`index.html:10`) ; les sources du vault se contredisent ([[Un message par artisan puis cinq jours]]).
5. **Le prompt de lancement dit l'inverse.** `CLAUDE.md:75-76` relève déjà le conflit avec la validation humaine exigée par ce prompt. L'addendum, plus récent et explicite, le tranche ; le prompt et `CLAUDE.md` restent à aligner.
6. **Le plafond change d'échelle** : de 50 par jour (Gmail, 29/10) à 300 (Brevo). La décision ne dit pas s'il faut monter par paliers.
