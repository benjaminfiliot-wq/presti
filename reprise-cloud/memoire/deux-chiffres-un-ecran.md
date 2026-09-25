---
name: deux-chiffres-un-ecran
description: "Deux endroits d'un écran qui parlent de la même chose doivent la calculer au même endroit et l'écrire pareil"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7e59f8cf-41af-4413-b326-b03458018a55
  modified: 2026-09-07T13:23:29.380Z
---

Quand deux zones d'un même écran parlent de la même chose, elles doivent la **calculer au même
endroit** et l'**écrire de la même façon**. Sinon l'écran perd sa crédibilité entière, y compris sur
ce qu'il dit de juste.

**Pourquoi** : le 2026-09-07, sur le Poste de contrôle de Presti, trois occurrences en une séance,
toutes trouvées **à l'œil sur une capture**, aucune par une assertion :

- la barre disait « Service normal » et le bandeau « Service dégradé », dix pixels plus bas — elles
  mesuraient deux sous-ensembles différents des mêmes contrôles ;
- « Coût IA 0,00 € / 50,00 € » à côté de « Facture Anthropic 464,97 € » — l'un mesurait un espace de
  travail, l'autre l'organisation, sans que leur nom le dise ;
- « 0,00 € » à côté de « ≈ 0,07 € » — l'un facturé, l'autre estimé, la même dépense.

**Comment l'appliquer** : extraire la règle dans une lib partagée (ex. `lib/controle/sante.ts`), faire
porter à chaque valeur le nom de ce qu'elle mesure vraiment, et garder le même signe (« ≈ » pour une
estimation) partout. Corollaire : un seuil de dépense ne doit pas peser sur un état de service — un
budget dépassé n'est pas une panne, et les confondre apprend à ignorer un bandeau orange.

Corollaire de méthode : prendre une capture et la REGARDER après chaque changement d'écran. Voir
aussi [[presti-state]], [[suites-menage-finally]].
