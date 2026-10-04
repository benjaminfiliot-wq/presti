# 026-175 — réponse du chef (délégué : lot ménage de l'orchestre, 04/10/2026)

## Décision

**Option 1, en deux temps.** La question du 29/09 (usine, rédaction croisée de la migration) portait sur deux choses ; l'une est
réglée par les faits, l'autre reste à faire et n'est pas une affaire de ménage.

- **SR-9 (scénario `ecriture_v1_v2` du juge)** : réglé. Le scénario a été corrigé le 30/09 (instructions séparées, mêmes assertions,
  `question.md` section « RÉSOLU »), 0113 est appliquée en production (`application-2026-09-30.md`, `list_migrations` la confirme, audit du 04/10 C §4.3).
  Le verifier officiel `pilotage-sql-qa --migration=reglages` a été REJOUÉ sur l'usine le 04/10 : **PASS à 10:57:25Z (62 s) et à 11:17:24Z (55 s)**,
  `machine: usine`, journalisés dans `verdicts.jsonl`. Le PASS du 30/09 à 14:16:40Z (1 s, agent « ? ») venait de la session cloud : celui-ci est local.
- **Les cinq graines d'agents (garde, tresorier, studio, contenu, douleurs)** : option 1 (étendre le juge, SR-1 admet les cinq appels
  `ops_agent_enregistrer`, SR-11 les contrôle), mais **dans une migration NOUVELLE** : 0113 est appliquée, on ne la réécrit pas. Vérifié le 04/10 :
  aucune migration du dépôt ne sème ces cinq agents (`grep ops_agent_enregistrer supabase/migrations/*.sql` : vigie_meta, recenseur, juge_faits,
  redacteur, standardiste, atelier_maquettes, crieur, chef, pont, redacteur_site, livreur, facteur, facteur_usine, repondeur, experience, livreur_usine
  seulement). Conséquence réelle : `ops_cout_ajouter('studio' | 'douleurs', …)` échouera tant qu'ils ne sont pas semés.

## Ménage fait

- copie périmée `refuse/026-175.md` rangée dans `.orchestre/archive/doublons-0410/refuse/` ;
- cette note `a-decider/026-175.md` rangée dans `a-decider/traitees/`.

## Reste (hors ce lot)

Une fiche (ou une extension de 026-176 / du lot pilotage) : étendre `scripts/pilotage-sql-qa.mjs` (PERMIS + SR-11), puis une migration
numérotée au-dessus de 0124 qui sème les cinq agents (essai à sec par DO + EXECUTE du jumeau nu, application par le connecteur, contrôle, zéro trace),
puis `node scripts/juges-026-pilotage-preuve.mjs --lot=b` à rejouer (le fichier de scénario a changé le 30/09). Le `--reel` de pilotage-sql-qa reste au PC.
