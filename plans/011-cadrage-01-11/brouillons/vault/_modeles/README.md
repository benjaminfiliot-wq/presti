---
type: meta
title: "Modèles de notes - mode d'emploi"
description: "Les sept modèles du réseau neuronal : à quoi sert chacun, où ranger la note créée, ce que Benj doit trancher."
status: brouillon
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - meta
  - modeles
aliases: []
liens:
  - "[[Système neuronal du cerveau]]"
  - "[[Journal-Decisions]]"
sources:
  - "Addendum de Benj du 01/11/2026 (benj-0111-addendum.md), consigne ADR l.133-179"
  - "Consigne « Contexte cerveau » de Benj du 01/11/2026 (contexte-cerveau.md:16-32)"
  - "C:/Users/benja/Documents/SaaS/.obsidian/core-plugins.json"
  - "https://obsidian.md/fr/help/plugins/templates"
  - "https://obsidian.md/help/properties"
---

# Modèles de notes du réseau neuronal

Brouillon du 01/11/2026. Rien n'est encore écrit dans le vault. Ces fichiers attendent le « oui » de Benj ; ils iront alors dans `SaaS/_modeles/`.

Sept modèles, un par type de note : décision, idée, playbook, apprentissage, client type, prompt, erreur.

## L'outil installé

- Le plugin de base **Modèles** est actif (`.obsidian/core-plugins.json:14`, `"templates": true`).
- **Templater n'est pas installé** : ni `.obsidian/community-plugins.json`, ni dossier `.obsidian/plugins/` (relevé du 01/11).
- Les modèles utilisent donc la syntaxe du plugin de base : `{{title}}` (titre de la note active), `{{date}}` (format par défaut `YYYY-MM-DD`) et `{{time}}` (https://obsidian.md/help/plugins/templates).
- Dans l'en-tête, les variables sont entre guillemets. La page officielle prévient qu'en Live Preview, le panneau des propriétés peut écraser une variable sans guillemets.
- Obsidian fusionne les propriétés du modèle avec celles de la note (https://obsidian.md/help/properties).
- Le vault a déjà un modèle, `Problemes/MODELE-Fiche-Probleme.md` (phase de recherche, sans en-tête). Il reste où il est.

## Se servir d'un modèle

Dans Obsidian :

1. Une seule fois : Réglages → Modèles → « Emplacement du dossier de modèles » = `_modeles` (libellé de https://obsidian.md/fr/help/plugins/templates). Ce n'est pas fait : le vault n'a pas de `.obsidian/templates.json`.
2. Créer la note dans le bon dossier et lui donner son nom **avant** d'insérer le modèle. `{{title}}` reprend le titre de la note active.
3. Commande « Modèles : Insérer le modèle ». Remplir, puis effacer les commentaires `%% … %%` et la ligne d'exemple.

Pour un agent (Claude Code, Hermes) :

- Le MCP `cerveau` ne fait que lire (`presti/CLAUDE.md:60`). L'agent copie le modèle, remplace lui-même `{{title}}` (nom du fichier sans `.md`) et `{{date}}` (date du jour, AAAA-MM-JJ), efface les commentaires, puis écrit le fichier.
- On n'écrit dans le vault que par une tâche dont le périmètre est `SaaS/…` (`presti/CLAUDE.md:136`).
- Une note écrite par un agent naît au premier statut de son modèle. Seul Benj la fait passer au statut validé : « Ne modifie jamais une note stratégique sans ma validation » (« Contexte cerveau », 01/11).
- Exception : une décision que Benj a déjà prise par écrit naît `acceptee`, avec sa date et sa source. C'est le cas des six ADR du 01/11 : l'addendum les dit « décisions verrouillées », « prises le 01/11/2026 » (l.1, l.135). Les écrire `proposee` les affaiblirait.

Avant d'écrire : `chercher` si la note existe déjà. Mettre à jour plutôt que créer un doublon (`SaaS/.claude/skills/vault-organizer/SKILL.md:39-40`).

## L'en-tête commun

| Champ | Sens |
|---|---|
| `type` | Le type de note, un par modèle. |
| `title` | Le nom de la note (`{{title}}`). |
| `description` | Une phrase. Le cerveau l'affiche dans ses résultats, coupée à 220 signes (`cerveau/src/recherche.mjs:146`). |
| `date` | La date du fait : décision prise, idée eue, erreur survenue, prompt mis en service. Pas la date d'écriture. |
| `status` | L'étape de vie. Valeurs propres à chaque modèle (tableau suivant). |
| `project` | `presti` par défaut. |
| `created`, `updated` | Dates de la note. Avec `title`, `type`, `status` et `tags`, c'est le socle exigé par claude-obsidian (`claude_obsidian/lint_engine.py:75`). |
| `tags` | Le type, plus un domaine déjà en usage : `prospection`, `exploitation`, `video`, `produit`… |
| `aliases` | Autres noms. Pour une ADR, son numéro seul (« ADR-007 »), pour la retrouver au clavier. |
| `liens` | Notes liées, écrites `"[[Nom]]"` entre guillemets (https://obsidian.md/help/properties). |
| `sources` | Fichier:ligne, note du vault ou adresse d'une page officielle. |

Les clés n'ont que des lettres sans accent et des tirets bas, ni chiffre ni tiret : le lecteur d'en-tête du cerveau ignore les autres (`cerveau/src/decoupe.mjs:11`, motif `[A-Za-z_]+`).

## Les sept modèles

| Modèle | `type` | Sert à | Statuts |
|---|---|---|---|
| Modèle - Décision | `decision` | Une décision au format ADR : contexte, décision, alternatives rejetées, conséquences, sources. C'est le « pourquoi » ; le « quoi » court vit dans `CLAUDE.md` et `.claude/rules/` (addendum, l.178-179). | `proposee` → `acceptee` ; `rejetee`, `remplacee`, `abandonnee` |
| Modèle - Idée | `idee` | Une idée qu'on veut tester avant d'y passer du temps. | `brute` → `a-tester` → `retenue` ou `rejetee` |
| Modèle - Playbook | `playbook` | Une méthode rejouée à l'identique : déclencheur, étapes, qui fait quoi, garde-fous, mode à blanc, mesure. Automatisée, elle tourne dans n8n. | `brouillon` → `a-blanc` → `en-service` ; `perime` |
| Modèle - Apprentissage | `apprentissage` | Ce qu'on a appris en route (retour d'artisan, format qui marche, mesure), écrit comme une règle. | `candidate` → `validee` ou `rejetee` |
| Modèle - Client | `segment` | Un **client type** (un segment) : profil, besoins, objections, ce qui marche. Jamais un vrai client. | `hypothese` → `confirme` ; `abandonne` |
| Modèle - Prompt | `prompt` | La fiche d'un prompt : à quoi il sert, où il vit, garde-fous, évaluations, versions. | `brouillon` → `a-blanc` → `en-service` ; `retire` |
| Modèle - Erreur | `erreur` | Une leçon tirée d'une erreur : ce qui s'est passé, cause, preuve, règle, où la règle est écrite. | `ouverte` → `comprise` → `close` |

Champs propres à chaque modèle :

- **Décision** : `decideur` (benj), `remplace` et `remplace_par` (les ADR liées), `regles` (le fichier du « quoi » court).
- **Idée** : `origine` (d'où vient l'idée).
- **Playbook** : `declencheur` ; `executant` (`n8n`, `hermes`, `claude-code` ou `benj`, jamais un autre exécutant, addendum l.17-18) ; `workflow` (nom ou identifiant du workflow n8n) ; `version`.
- **Apprentissage** : `domaines` (ceux de `presti/docs/agents/lecons.md:77-78`), `valide_par`, `valide_le`. La règle a la forme de `lecons.md:71-73` : une phrase d'action, 300 signes au plus, sans nom, coordonnée, secret ni lien.
- **Client** : `relation` (`prospect` ou `abonne`), `metiers`, `zone` (un département), `taille`, `ref_supabase` (au plus un renvoi).
- **Prompt** : `emplacement` (fichier:ligne, workflow n8n ou skill), `modele`, `version`, `evaluation` (commande et dernier résultat). Pour l'IA du produit : `scripts/ai-eval.mjs`, mesuré avant toute modification (`presti/.claude/skills/presti-ai-lab/SKILL.md:17`).
- **Erreur** : `gravite` (`critique`, `elevee`, `moyenne` ou `faible` ; les audits parlent de constat « critique ou élevé », `Journal-Decisions.md:54`), `regle_ecrite_dans` (les chemins où la règle est écrite).

Les exemples des modèles viennent de l'existant : ADR-004 (addendum, l.153-157) ; le parrainage (piste notée dans le cadrage du 01/11) ; le quota Brevo (addendum, l.52-55) ; les juges (note « Verdicts de Benj sur les films - historique », leçon 4) ; le plombier (note « Profil du prospect idéal et portes d'entrée ») ; la réponse au prospect (note « Labo IA - mesurer avant de modifier ») ; la pub v3 (note « Leçons d'incidents », ligne du 26/10).

## Où ranger la note créée

- **Décision** : `10 Presti/04 Décisions/` (addendum, l.135-136). Nom : `ADR-NNN — Titre court.md`, avec le numéro qui suit le plus haut existant. Ajouter une ligne datée en tête de [[Journal-Decisions]] qui renvoie à l'ADR (règle 6 de `SaaS/CLAUDE.md` ; « en haut », `vault-organizer/SKILL.md:30-31`). Ce dossier n'existe pas encore ; aujourd'hui, les décisions sont dans `Decisions/`.
- **Idée** : aucun dossier nommé par Benj. Aujourd'hui, `Idees-Vrac/` : une puce dans [[Inbox]] pour une idée brute (`vault-organizer/SKILL.md:32`), une note de ce modèle quand on veut la tester.
- **Playbook** : `30 Prospection/02 Playbooks/` pour la prospection (« Contexte cerveau », 01/11). Pour un autre domaine, le dossier est à fixer avec l'arborescence. Aujourd'hui, les méthodes vivent dans `wiki/concepts/` (par exemple [[Conversation en quatre temps]]).
- **Apprentissage** : aucun dossier nommé. À fixer avec l'arborescence. En attendant, relier la note à [[Carte - Règles et leçons de Benj]].
- **Client type** : `10 Presti/03 ICP/` ou `30 Prospection/01 ICP/`, les deux nommés par Benj (à trancher). Nom : `Client type - <segment>.md`, jamais le nom d'une entreprise. Aujourd'hui, le profil existant est [[Profil du prospect idéal et portes d'entrée]] : le compléter avant d'en créer un second.
- **Prompt** : `50 Automatisations/04 Prompts/` (« Contexte cerveau », 01/11). Aujourd'hui, aucune fiche : les prompts du produit vivent dans `lib/ai.ts` (`presti/lib/ai/README.md:3`).
- **Erreur** : aucun dossier nommé. À fixer avec l'arborescence. Nom : le sujet, puis la date du fait, comme le wiki le fait déjà (« … - diagnostic du 22-10 »). Dans tous les cas, ajouter une ligne au tableau de [[Leçons d'incidents]] : date, ce qui s'est passé, leçon, source.

Pour toutes les notes : relier la note à sa carte, et ajouter une ligne dans [[hot]] si elle doit revenir à la prochaine session ([[Système neuronal du cerveau]], §4).

## Règles communes

- Aucun secret.
- Aucune donnée opérationnelle client : elle reste dans Supabase (`presti/CLAUDE.md:32`).
- Aucun chiffre sans source.
- Une note, un sujet.
- Une ADR acceptée ne se réécrit pas : une nouvelle ADR la remplace. Une leçon non plus ne se corrige pas en place (`presti/docs/agents/lecons.md:111`).
- Effacer les commentaires une fois la note remplie : le cerveau les indexe comme du texte.

## Points à signaler à Benj

1. **Le dossier des modèles n'est pas réglé.** Le plugin Modèles est actif, mais aucun `.obsidian/templates.json` n'existe. Geste : « Emplacement du dossier de modèles » = `_modeles`.
2. **Les dossiers cibles n'existent pas.** `10 Presti/04 Décisions/` (addendum, l.135-136) et les dossiers de « Contexte cerveau » (`10 Presti/03 ICP`, `30 Prospection/01 ICP`, `30 Prospection/02 Playbooks`, `50 Automatisations/04 Prompts`) sont absents du vault (relevé du 01/11 ; déjà noté dans le cadrage du 01/11). Deux dossiers ICP sont nommés : lequel reçoit le client type ?
3. **« Client » devient « Client type ».** Ta règle : « Ne stocke jamais de donnée opérationnelle client dans Obsidian » (« Contexte cerveau » ; `presti/CLAUDE.md:32`). Une fiche par vrai client la violerait, et elle se diffuserait : le cerveau indexe tout `.md` du vault (`cerveau/src/config.mjs:24`), n'écarte une note pour coordonnées qu'à partir de 3 e-mails, 2 téléphones, ou 2 e-mails et 1 téléphone, sans compter les adresses génériques comme contact@ ou info@ (`config.mjs:65-70`), et son crochet injecte jusqu'à 3 extraits dans chaque demande (`config.mjs:75`). Le modèle décrit donc un segment, avec au plus un renvoi Supabase. Même un identifiant mène à une personne : mieux vaut le nom d'une vue ou d'un filtre.
4. **Le vault contient déjà des données de prospects.** Noms relevés le 01/11, fichiers non ouverts : `Prospection/deja-contactes-email.txt`, `Prospection/deja-contactes-instagram.txt`, `Prospection/emails-artisans/` (10 fichiers, dont un `.csv`), `Prospection/cibles-instagram-2026-09-15.json`, `Prospection/corbeille-gmail-2026-09-15.md`, les lots (`Lot-20x20-2026-09-14.md`, `Lot-Insta-FB-2026-09-10.md`, `FB-10-electriciens-a-coller.md`) et la seule fiche `Prospection/prospect-…-2026-10-21.md` (son nom porte celui de l'entreprise, retiré ici). Le cerveau écarte six de ces `.md` comme « données de prospects » (`cerveau/data/index.json`, champ `exclus`, lu le 01/11). La fiche du 21/10, elle, est **indexée** : aucun motif de `config.mjs:43-49` ne l'écarte. Autre fichier : `Prospection/Influenceurs-artisans-2026-10-27.md` porte 11 adresses e-mail ; le cerveau l'écarte par son contenu (même index). Les déplacer vers Supabase ou les retirer est ta décision ; une suppression attend ton accord.
5. **`regles_pour` ne remonte aucune note du vault, sauf son `CLAUDE.md`.** Le drapeau « règle » n'est posé que sur la mémoire de Claude Code, les skills et les `CLAUDE.md` (`cerveau/src/indexeur.mjs:111-113`), et `regles_pour` ne garde que ce drapeau (`cerveau/src/recherche.mjs:179-183`). Dans l'index du 01/11, seuls deux morceaux du vault le portent, tous deux dans `vault/CLAUDE.md`. Une règle écrite seulement dans une ADR, un apprentissage ou une erreur ne revient donc pas avant une action à risque. D'où la section « Où la règle est écrite ». De même, `.claude/rules/` (à créer, consigne du 01/11) n'est pas une source du cerveau : `config.mjs:29` ne prend que `CLAUDE.md`, `plans/` et `docs/`. Claude Code, lui, charge ces fichiers à chaque session ouverte sur le dépôt (https://code.claude.com/docs/en/memory, consultée le 01/11). Que Hermes les lise n'est pas vérifié.
6. **Les modèles eux-mêmes seront indexés.** `_modeles/` n'est pas dans `DOSSIERS_IGNORES` (`config.mjs:36`), et les commentaires `%% … %%` ne sont pas filtrés (`decoupe.mjs`, `texte.mjs`) : les exemples remonteraient dans `chercher`. Proposition : écarter `vault/_modeles/Modèle - ` dans `EXCLUSIONS` (ce README peut rester indexé). Dans le graphe, `hideUnresolved` vaut `false` (`.obsidian/graph.json:6`) : les modèles ne contiennent donc aucun lien `[[…]]`, pour ne pas créer de nœuds fantômes. Un filtre `-path:_modeles` les cache.
7. **Types et statuts hors du vocabulaire claude-obsidian.** Les sept types ne sont pas dans `PAGE_TYPES` (`claude_obsidian/page_schema.py:36-46`). Le lint ne vérifie que la présence de `type` (`page_schema.py:7-8`), et seulement sous `wiki/` (`lint_engine.py:603`, `1640-1650`). Mais le routeur du plugin refuse un type inconnu (`route_rejection`, code 4) : ces notes se rangent à la main, pas par `/claude-obsidian:save`. Précédent : `type: outil`, 624 notes (décompte du 01/11). Les statuts proposés sont à valider : le wiki n'emploie aujourd'hui que `developing` (106 notes) et `evergreen` (21) (décompte du 01/11), et claude-obsidian demande des statuts que le vault comprend (`WIKI.md:93-95`).
8. **L'en-tête porte tes quatre champs et le socle du vault.** Tu demandes `type`, `date`, `status`, `project` (addendum, l.170-171). Le vault exige aussi `title`, `created`, `updated`, `tags` (`lint_engine.py:75`). Les modèles portent les deux : `date` est la date du fait, `created` celle de la note. Rien de ta liste n'est retiré.
9. **ADR-004 et ADR-005 remplacent des règles déjà écrites.** Le D1 du 26/10 dit « ni Brevo pour le froid » (`Journal-Decisions.md:18`). Le plafond fixé le 27/10 est de 50 premiers e-mails par jour (`Journal-Decisions.md:5` ; `wiki/hot.md:23`). Le prompt de lancement exige une validation humaine avant tout envoi, et `presti/CLAUDE.md:75-76` dit encore « À trancher avant le chantier 3 », alors que l'addendum verrouille la décision (l.70, l.159-161). Les ADR retiennent Brevo gratuit, 300 par jour, sans validation. Elles devraient citer ces entrées dans `remplace` (un lien vers l'entrée du journal suffit). Aucune décision n'a été modifiée ici.
10. **Qui valide un apprentissage ?** `presti/docs/agents/lecons.md:63-66` laisse Claude Code valider seul une leçon du dépôt. Ta règle du 01/11 te réserve la validation d'une note stratégique. Les modèles te nomment ; à confirmer.
11. **Deux homonymes dans le code.** `lib/ai/playbooks.ts` contient déjà des « playbooks », un par intention de conversation (`presti/lib/ai/README.md:11`). Le texte des prompts du produit vit dans `lib/ai.ts` (`lib/ai/README.md:3`). Une fiche du vault y renvoie au lieu de recopier. Pour les prompts de n8n et de Hermes, il reste à choisir où vit le texte qui fait foi.
12. **Les agents n'écrivent pas par le MCP.** Le cerveau n'a pas d'outil d'écriture (`presti/CLAUDE.md:60`). Hermes ne peut donc pas encore créer une note à partir d'un modèle.
13. **ADR-005 et ADR-006 n'ont pas d'alternatives rejetées.** La consigne exige cette section pour chaque ADR (addendum, l.174), mais l'addendum n'en donne aucune pour ces deux-là (l.159-168). Le modèle interdit d'en inventer : la section dira « aucune nommée par Benj » tant que tu n'en as pas donné.

## Sources

- Addendum de Benj du 01/11/2026 : `benj-0111-addendum.md` (l.1, 17-18, 52-55, 70, 104, 133-179).
- « Contexte cerveau — Obligatoire » de Benj, 01/11/2026 : `contexte-cerveau.md:16-32`.
- Vault : `SaaS/CLAUDE.md` (règle 6, l.97) ; `.obsidian/core-plugins.json`, `graph.json`, `workspace.json` ; `.claude/skills/vault-organizer/SKILL.md` ; notes « Système neuronal du cerveau », « Verdicts de Benj sur les films - historique », « Leçons d'incidents », « Lecons validees - comment une regle devient consigne », « Profil du prospect idéal et portes d'entrée », « Labo IA - mesurer avant de modifier ».
- claude-obsidian : `C:/Users/benja/Documents/outils-ia/claude-obsidian/WIKI.md`, `claude_obsidian/page_schema.py`, `claude_obsidian/lint_engine.py`.
- Cerveau : `C:/Users/benja/Documents/cerveau/src/config.mjs`, `indexeur.mjs`, `recherche.mjs`, `decoupe.mjs`, `texte.mjs` ; `data/index.json` (construit le 01/11/2026 à 15 h 20 UTC, lu pour les chemins et les drapeaux seulement).
- Dépôt presti : `CLAUDE.md`, `docs/agents/lecons.md`, `lib/ai/README.md`, `.claude/skills/presti-ai-lab/SKILL.md`.
- Pages officielles consultées le 01/11/2026 : https://obsidian.md/help/plugins/templates, https://obsidian.md/fr/help/plugins/templates, https://obsidian.md/help/properties, https://code.claude.com/docs/en/memory.
