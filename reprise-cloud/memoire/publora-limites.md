---
name: publora-limites
description: "Publora (formule Starter) ne tient que 3 parutions programmées à la fois et 7 jours d'horizon — le postage des dix se fait par une tâche planifiée qui relance le pipeline toutes les six heures"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-13T23:07:33.785Z
---

Le 13/09/2026 au soir, Benj a demandé de poster les dix publications Presti. Publora (`api.publora.com`, formule **Starter**) a deux plafonds, lus dans ses réponses 403 : `SCHEDULE_HORIZON_REACHED` (programmation à 7 jours au plus, `maxScheduledDate`) et `SCHEDULED_POST_LIMIT_REACHED` (`posts.scheduled_active`, **3 parutions programmées actives** dans l'espace). Les trois premières sont posées (pub-01 LinkedIn 15/09 7 h 15, pub-01 B Facebook 17/09 19 h 30, pub-07 Instagram 19/09 12 h 30) ; les sept autres partent au fil de l'eau.

**Why:** impossible de tout programmer d'un coup sans changer de formule ; Benj a dit « poste-les toi-même, ne me demande pas l'autorisation ».

**How to apply:** `scripts/publier-suite.mjs` (tâche planifiée Windows « Presti publications », toutes les 6 h dès 6 h, `--installer` / `--retirer`) rejoue le juge vidéo puis `scripts/pipeline.mjs --sans-rendu --programmer --sauf=03 --ancre=2026-09-14 --juge-vert=<log> --passe-maintenant` : ce qui est déjà au journal (`plans/journal-publications.md`) est sauté, ce que Publora refuse attend le passage suivant, un créneau manqué part dans les trois minutes. Le calendrier resserré (dix parutions en une semaine, jamais deux le même jour sur le même canal) est dans `plans/publications-10.md`. Pièges : `spawnSync('node', video-qa.mjs, 30 fichiers)` sous le pipeline reste parfois suspendu après la dernière vidéo (d'où `--juge-vert`, un journal de juge de moins de 30 min) ; l'ancre « prochain lundi strictement après aujourd'hui » saute d'une semaine dès minuit le lundi (d'où `--ancre`). Pub-03 a été postée à la main par Benj (réseau inconnu) : exclue. Voir [[social-skills-plugins]] et [[presti-qui-tient-quel-reseau]].

**Mise à jour du 16/09/2026 (mesure en lecture seule)** : la tâche Windows « Presti publications » n'existe plus (schtasks, Get-ScheduledTask : rien) ; la programmation passe par une automatisation de l'application Codex (`~/.codex/automations/`). L'espace a 3 connexions (Instagram prestiapp, LinkedIn Benjamin Filiot, Facebook Presti), soit le plafond Starter, 15 posts/mois, et 3 parutions programmées actives le 16/09. Il ne peut accueillir aucun autre projet (voir [[clipforge-clipping]]).
