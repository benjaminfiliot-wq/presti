---
type: decision
title: "ADR-006 — Vidéos et carrousels : validation initiale puis auto"
date: 2026-11-01
status: accepted
project: presti
created: 2026-11-01
updated: 2026-11-01
tags:
  - decision
  - adr
  - video
  - carrousel
  - publication
  - autonomie
  - qa
aliases:
  - ADR-006
  - "ADR-006 — Vidéos et carrousels : validation initiale puis auto"
  - Validation initiale puis auto
sources:
  - "Addendum de Benj du 01/11/2026, §5 (seule exception : vidéos motion design et carrousels), §7 (exceptions à l'accord de Benj)"
  - "C:/Users/benja/Documents/presti/.claude/workflows/post-du-jour.js:1-12, 78 (non suivi par Git)"
  - "C:/Users/benja/Documents/presti/.claude/workflows/pub-10-sur-10.js:1-14, 39, 41 (non suivi par Git)"
  - "C:/Users/benja/Documents/presti-ops/publication/REGISTRE-POSTS.md (état du 29/10)"
  - "C:/Users/benja/Documents/presti/plans/011-cadrage-01-11/cadrage-00-synthese.md:15, 71, 113"
  - "Outil list_scheduled_tasks, état des tâches planifiées du PC au 01/11/2026"
  - "C:/Users/benja/Documents/SaaS/wiki/concepts/Règles de publication vidéo.md"
  - "C:/Users/benja/Documents/SaaS/wiki/concepts/Juges vidéo et preuves visuelles.md"
origine: "brouillon de la phase 1.4 (01/11/2026), rédigé depuis l'addendum de Benj ; à relire avant rangement dans le vault"
---

# ADR-006 — Vidéos et carrousels : validation initiale puis auto

> Décision de Benj du 01/11/2026. La section « Décision » reprend son texte. Ce qui contredit ou complète la décision est rangé à part, en fin de note, dans « Points à signaler à Benj ».
>
> Nom du fichier : le titre exact contient « : », un caractère interdit dans un nom de fichier sous Windows et dans Obsidian. Le fichier remplace donc « : » par « - » ; le titre exact reste dans `title`, dans les alias et ci-dessus.

## Contexte

**Le besoin, selon Benj :** la qualité créative sans friction.

**La règle d'avant : Benj voyait tout avant publication.**
- Le 07/10, Benj veut voir les vidéos avant toute publication sur TikTok ([[Règles de Benj — accords et gestes interdits]]).
- La fiche TikTok exige un accord par vidéo et par version. Pour Instagram et Facebook, les contrôles automatiques de la ligne éditoriale ont remplacé l'accord le 30/09 ([[Règles de publication vidéo]]).
- Le 01/11 au matin, une règle écrite pose : « Aucune action sortante sans Benj (publication…) » (`plans/011-cadrage-01-11/cadrage-00-synthese.md:15`).

**La publication automatique a existé, avec un juge seul.**
- Le workflow `post-du-jour` répond à la demande de Benj du 26/10 au soir : « au moins deux par jour, qui changent à chaque fois de sujet, qui innovent » (`.claude/workflows/post-du-jour.js:4`). Il décide, fabrique, fait juger, publie et apprend ; il publie un carrousel à midi et une vidéo courte le soir, sur Instagram, la Page Facebook, la page LinkedIn de Presti (carrousels) et TikTok (`post-du-jour.js:1-12`).
- Un post passe si son juge lui donne au moins 8 sur 10 et qu'aucun interdit n'est violé (`post-du-jour.js:78`).
- La tâche planifiée `presti-ligne-editoriale` le lançait à 12 h 15 et 18 h 15. Elle est désactivée depuis le 01/11 ; son dernier passage date du 01/11 à 12 h 18 (outil `list_scheduled_tasks`). Motif de la pause : elle « publiait seule 2 posts par jour (juge à 8/10) » (`cadrage-00-synthese.md:15`).
- Le registre des posts compte deux lignes : une vidéo publiée à la main le 26/10, et un carrousel du 29/10 sans lien de publication. Il n'a aucune colonne pour le verdict de Benj (`presti-ops/publication/REGISTRE-POSTS.md`).

**Les pubs vidéo passent par le workflow `pub-10-sur-10`** (`.claude/workflows/pub-10-sur-10.js:1-14`) : décortiquer la référence, monter le squelette, produire, mesurer, faire juger par 7 juges indépendants, corriger jusqu'à 10/10 (arrêt après 3 tours sans progrès), livrer. Sa consigne commune interdit de publier (`l. 41`). Ni ce fichier ni `post-du-jour.js` ne sont suivis par Git (`git ls-files`, 01/11).

**Un juge vert ne prouve pas le goût de Benj.** Le 19/10, un film passait tous les contrôles mesurés, et Benj l'a jugé « horrible » ([[Juges vidéo et preuves visuelles]]). Quatorze pubs ont été refusées avant la v15 (`pub-10-sur-10.js:39`). Historique : [[Verdicts de Benj sur les films - historique]].

**Ce que l'automatisation ne sait pas faire aujourd'hui** ([[Règles de publication vidéo]]) :
- Facebook, Instagram et LinkedIn refusent le téléversement de vidéo piloté (mesuré le 09/09) ;
- TikTok Studio demande un onglet visible et une confirmation à la main (22/09).

**Les règles de contenu déjà écrites** ([[Règles de publication vidéo]]) : voix obligatoire ; licences prouvées ; mention de l'IA ; format 1080×1920 ; piste entre −26 et −19 LUFS ; comptes Presti seulement.

## Décision

Texte de Benj (addendum du 01/11, §5 et §7 ; ADR demandé le 01/11) :

- **Tout est automatique par défaut. Seule exception : les vidéos motion design et les carrousels.**
- Les 2-3 premières vidéos motion design produites : validation de Benj obligatoire.
- Les 2-3 premiers carrousels produits : validation de Benj obligatoire.
- Une fois ces 2-3 premiers validés par Benj :
  - le système considère le format comme validé ;
  - les vidéos et carrousels suivants sont publiés automatiquement ;
  - Benj peut toujours les consulter a posteriori ;
  - aucune validation n'est plus requise, sauf anomalie détectée par la QA.
- **Règle de passage en automatique.** Après 2-3 validations positives consécutives sur un format donné, le système passe ce format en publication automatique.
- **Garde-fou.** La QA automatique continue de tourner sur chaque contenu. Si elle détecte une anomalie, le contenu repasse en validation humaine.
- C'est une exception écrite à la règle « toute action irréversible attend l'accord de Benj » (addendum §7).

## Alternatives rejetées

Benj n'en nomme pas. La décision écarte de fait deux régimes :
- **valider chaque contenu à la main**, la règle du 07/10 et du 01/11 au matin ;
- **publier dès la note d'un juge**, le régime de `presti-ligne-editoriale` (juge à 8/10), en pause depuis le 01/11.

## Conséquences

**Il faut compter les validations, format par format.** Le passage en automatique suppose de savoir, pour chaque format, combien de validations positives consécutives Benj a données. Le registre des posts n'a ni colonne de format validé ni colonne de verdict de Benj (`REGISTRE-POSTS.md`).

**La QA tourne sur chaque contenu, même après le passage.** Elle peut partir de l'existant : les 7 juges de `pub-10-sur-10`, le juge de `post-du-jour` et les règles de contenu de [[Règles de publication vidéo]]. Une anomalie renvoie le contenu en validation humaine.

**La publication automatique demande un chemin qui marche.** Le téléversement de vidéo piloté par navigateur échoue sur Facebook, Instagram et LinkedIn, et TikTok Studio demande une confirmation à la main ([[Règles de publication vidéo]]).

**L'horloge passe dans n8n, l'orchestration chez Hermes.** La tâche planifiée du PC `presti-ligne-editoriale` est une automatisation hors de n8n ([[ADR-001 — Toutes les automatisations dans n8n]]). Hermes orchestre la production ([[ADR-002 — Hermes Agent systématique + Orca harness]]).

**Benj consulte a posteriori.** Il lui faut un endroit où voir ce qui est parti ; le registre des posts en est la base actuelle.

## Sources et liens

- Addendum de Benj du 01/11/2026, §5 et §7 (texte collé en session ; pas encore rangé dans le vault).
- Workflows : `.claude/workflows/post-du-jour.js:1-12`, `:78` · `.claude/workflows/pub-10-sur-10.js:1-14`, `:39`, `:41` (fichiers hors Git au 01/11).
- Registre : `presti-ops/publication/REGISTRE-POSTS.md`.
- Inventaire du 01/11 : `plans/011-cadrage-01-11/cadrage-00-synthese.md:15`, `:71`, `:113`.
- Tâches du PC : outil `list_scheduled_tasks`, 01/11/2026.
- Vault : [[Règles de publication vidéo]] · [[Juges vidéo et preuves visuelles]] · [[Verdicts de Benj sur les films - historique]] · [[Règles de Benj — barre de qualité vidéo et références]] · [[Règles de Benj — accords et gestes interdits]] · [[Publications réseaux - règle de vérité]] · [[Promesses dans les pubs et garde-fous]] · [[Méthode marketing vidéo - lignes et mesure]] · [[Publora]] · [[TikTok]] · [[Carte - Vidéo et pubs]]
- ADR liés : [[ADR-001 — Toutes les automatisations dans n8n]] · [[ADR-002 — Hermes Agent systématique + Orca harness]] · [[ADR-005 — Prospection e-mail automatique]]

## Points à signaler à Benj

1. **« 2-3 » doit devenir un nombre.** Le système a besoin d'un seuil exact : 2 ou 3 validations consécutives.
2. **Qu'est-ce qu'un « format » ?** Deux formats (vidéo, carrousel), ou un format par gabarit (un modèle de carrousel, un style de vidéo) ? Le compteur en dépend.
3. **Qu'est-ce qu'une « anomalie » ?** Aucune liste n'existe. Les juges actuels ne mesurent pas ton goût ([[Juges vidéo et preuves visuelles]]).
4. **TikTok.** La fiche TikTok exige un accord par vidéo et par version ([[Règles de publication vidéo]]). La décision le remplace-t-elle après les 2-3 validations ?
5. **Le compteur part de zéro.** Aucune validation de Benj n'est inscrite au registre ; le carrousel du 29/10 n'y a même pas de lien de publication.
6. **Relancer `presti-ligne-editoriale` telle quelle contredirait la décision.** Elle publiait dès la note du juge, sans les validations initiales ; elle est en pause depuis le 01/11.
7. **Le cadrage du 01/11 proposait autre chose.** Il suggérait « rien ne part sans ton oui sur la version exacte » (`cadrage-00-synthese.md:71`) et « deux portes de Benj sur chaque pub » (`:113`). Ce n'étaient que des propositions ; la décision les remplace.
8. **Les workflows vidéo sont hors de Git.** `pub-10-sur-10.js` et `post-du-jour.js` ne sont pas suivis (`git ls-files`, 01/11) ; un faux geste les effacerait.
