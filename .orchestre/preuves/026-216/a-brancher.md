# 026-216 — ce qui est livré, ce qui reste à brancher (05/10, claude-code)

Ordre de Benj du 05/10 : la fiche est validée dès que son code est fini ; l'écosystème corrige ensuite.

## Livré (dans le périmètre de la fiche)

- `app/controle/contenu/suivi.ts` : le modèle de vue, pur. `construireSuivi(entrée)` range les lignes de `contenu_lignes`, `contenu_posts`, `contenu_mesures` (migration 0114), l'attribution des ventes (`lib/contenu/mesure.ts`) et le classement Laya (`lib/contenu/boucle.ts`) en cinq panneaux (Tour du Crieur, Audience, Recettes, Radar onglet Contenu, Studio pubs) et en cartes de blocage pour Benj.
- `components/controle/contenu/SuiviContenu.tsx` : l'affichage des cinq panneaux, sans bouton ni lien, texte servi toujours écrit tel quel.
- `.orchestre/preuves/026-216/essai-a-blanc.mjs` (12 contrôles) et `rendu-essai.mjs` (rendu statique de quatre états) : personnes et dates fictives, aucun réseau.

Règles tenues par le code : « non mesuré » et « en attente » ne deviennent jamais 0 ; la vente par ligne dit `estimation` et sa fenêtre en heures ; une source non servie est dite « non servie », jamais une liste vide ; une panne de Laya est dite et ne laisse aucun score ; une affirmation chiffrée dont la probabilité `jev noul` est < 0,5, sans source ou « indisponible » devient une carte de blocage (texte exact, preuve manquante) ; un post Meta prêt attend R6 tant que le geste n'est pas ouvert (R6 inconnu = fermé) ; aucune décision d'accord n'est déduite d'un score.

## Ce qui n'est PAS fait, et pourquoi (hors périmètre de la fiche)

1. **Le chargeur serveur** : lire les trois tables par le client service, calculer `ventes` (`attribuerALaLigne`), les recommandations (`recommander`) et l'état de Laya, puis appeler `construireSuivi`. Il faut une route (`app/api/**`) ou une vue de la station (`lib/pilotage/**`) : toutes deux interdites à cette fiche.
2. **Le montage dans la station** : `<PanneauxContenu suivi={…} />` dans `app/controle/station/salles/{Crieur,Radar,Studio}.tsx` et le panneau Audience/Recettes (fichiers de 026-164, hors périmètre ici).
3. **Le juge d'écran** : `scripts/contenu-ecran-qa.mjs` n'existe pas (la fiche 026-204, rangée en fait/, ne l'a pas livré), donc `verifier` de cette fiche rend « Cannot find module ». La source du reel (§3.7) nommait `pilotage-ecran-qa --partie=contenu`, qui n'existe pas non plus.

## Geste de Benj

Aucun. Une fiche suivante (chargeur + montage + juge d'écran) est à écrire.
