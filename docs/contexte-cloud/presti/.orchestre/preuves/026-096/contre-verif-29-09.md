# 026-096 — contre-vérification du 29/09 (juge `repondeur-qa` corrigé)

Chaque sabotage est appliqué à `lib/agents/acquisition/repondeur.ts` (sauvegarde en dehors du dépôt, restauration dans un `finally`, module rendu identique octet pour octet), puis `node --import ./scripts/ts-loader.mjs scripts/repondeur-qa.mjs` est rejoué. Sortie brute : `sabotages-juge-29-09.txt`.

| Sabotage | Critère rouge | Pris |
|---|---|---|
| S1 : la règle des 10 minutes est neutralisée (`false &&`) | RP-12 (envoi préparé 4 min après notre réponse, aucun `reponse_trop_rapide`) | oui |
| S2 : l'entrant sans candidat reçoit `questions_entrant_v1` au lieu de `_v2` | RP-14 (et RP-4, côté Meta) | oui |
| S3 : `fil_envoi_id` n'est jamais posé | RP-4 (fil rompu : `undefined`, l'envoi d'origine réel attendu) | oui |
| S4 : la relance part sans attendre 4 jours | RP-15 (relance préparée à 3 jours) | oui |
| S6 : l'offre du Studio est remplacée par un second accusé | RP-16 (`studio_accuse_v1`, `studio_offre_v1` attendu) | oui |
| S5 : la réponse privée ignore la fenêtre de 7 jours | aucun | non : mutant équivalent, le magasin (0106, règle `fenetre_fermee` sur `reponse_privee_jusqua`) refuse quand même l'envoi ; la double garde est voulue |

Notes : au moment de S1, `tsc` (RP-10) a aussi rougi (une comparaison morte que TypeScript refuse) ; au moment de S2, RP-10 a rougi sur `@/lib/studio/xoffre` introuvable, un fichier d'une autre session qui travaillait au même moment sur `lib/studio/offre` : le rouge de RP-10 ne vient pas de S2 et n'a pas servi à le prendre (RP-14 l'a pris seul).

Avant la correction du juge (défauts de mise en scène, voir la ligne de `decisions.md` du 29/09), RP-12, RP-15 et RP-16 étaient rouges avec le module actuel ; RP-4 était vert à vide. Le module actuel passe désormais 16 critères sur 16, l'auto-contrôle (`--auto-controle`) est vert : 28 échantillons fautifs repérés, 15 conformes acceptés.
