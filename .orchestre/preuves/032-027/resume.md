## Ressources utilisées

- **Skill `reseau-neuronal`** (chargée d'abord) : elle fixe l'ordre `regles_pour`, puis `chercher` et `lire`, et rien d'écrit dans le vault. Rien n'a été écrit dans le vault.
- **MCP `cerveau`** : `regles_pour` (« corriger la réponse au prompt 5, offre entreprise, n8n, sources fichier:ligne ») ne rend aucune règle propre ; `chercher` (« offre Entreprise sur mesure n8n kit mode A démo avant contrat ») ne rend aucune décision du vault qui tranche les questions 25 à 28. Il confirme que le C4 range l'Entreprise « → L20, après un contrat signé » (§ 0 bis, n° 14). Conséquence : les quatre contradictions avec le C4 deviennent des questions à Benj, sans être tranchées ici.
- **MCP `n8n-oracle`, en lecture seule** : `search_workflows` (19:20 UTC) rend 5 workflows. `presti-detecteurs`, `presti-suivi-artisan` et `presti-briefing-matin` sont inactifs ; `reseau-neuronal-revue-hebdo` et `hermes-file-taches-v1` sont actifs, hors du chantier 4. `list_credentials` rend 4 identifiants. `get_workflow_details` sur `presti-detecteurs` rend 41 nœuds, douze détecteurs, aucun `errorWorkflow` dans ses réglages. Conséquence : l'en-tête, le § 2, le schéma du § 4.1 et l'interdit de 035-003 sont mis à jour. Rien n'est créé ni modifié dans n8n. `get_workflow_sdk_reference` et `get_workflow_best_practices` ne sont pas chargés : cette tâche ne construit aucun workflow.
- **Fiches de la méthode n8n et des dépôts** (`fiche-methode-n8n.md`, `fiches-depots.md`) : relues pour les écarts 1, 11 et 12. Leurs 13 rubriques trop longues sont ramenées au format de p5:75.
- **Vidéos déjà analysées** : `fiches-videos.md`, pour les écarts 7 et 12, et `fiches-videos-restructureai.md` (032-022, lu sans y toucher). Conséquence : le § 3.1, le § 3.3, la question 23 et la tâche 035-009 sont mis à jour. Les 11 vidéos sont lues, et une seule nomme n8n à l'oral (`fiches-videos-restructureai.md:271`).
- **Sources du dépôt** : `ecarts-contre-verification-2.md` en entier ; le prompt 5 aux lignes citées ; `chantier-4-assistant-plan.md`, état de 17 h 32, celui du HEAD (C4:118-124, :140-146, :176-184, :199-200, :234-258, :680-686, :716-752, :822-823, :834-852) ; `0174:20-26` ; `0189:6-9` ; `.orchestre/digest.md` ; l'objectif des tâches 032-017 à 032-026 ; `scripts/n8n-specs-qa.mjs:1-14`.
- **Le serveur Oracle lui-même** : `free -m`, `df -h /`, `nproc`, `uptime`, à 19:20 UTC. Conséquence : la mémoire disponible est passée de 22 135 à 17 542 Mo, le disque de 31 % à 39 %, et l'en-tête le dit.

Limite à signaler : la copie du dépôt sur Oracle est au commit `5cb575d`, soit « HEAD 74db706a du PC + travail en cours » ; le HEAD `49d22f09` n'y est pas (`git cat-file` : objet inconnu). `scripts/tout-verifier.mjs:196` n'a donc pas pu être relu ici. Ce fait vient du contre-vérificateur n° 2 (`ecarts-contre-verification-2.md:7`, `:33`) et de la consigne de la tâche, et la réponse le dit. Le C4 local (16:32 UTC) est bien l'état de 17 h 32, celui du HEAD (écart 7).

## Les 16 écarts

| N° | Où (fichier:ligne d'origine) | Verdict | Ligne d'arrivée |
|---|---|---|---|
| 1 | premiere-reponse.md:35, :954 ; fiche-methode-n8n.md:38 ; fiches-depots.md:651 | corrigé, comme proposé, avec une réserve : le fait est cité d'après le contre-vérificateur, car la copie d'Oracle est antérieure à `49d22f09` | premiere-reponse.md:40, :990 ; fiche-methode-n8n.md:39 ; fiches-depots.md:689-690 |
| 2 | premiere-reponse.md:787, :759, § 8 | corrigé : colonne « Lot du C4 » de A4, titre du § 7.1, question 25 ajoutée. En plus, le paragraphe « L20-A » dit « proposé » et renvoie à la question 25, et la ligne « La démo » du § 7.1 aussi | premiere-reponse.md:819, :790, :907 ; aussi :807-809, :802 |
| 3 | premiere-reponse.md:765, B1 à B3 | corrigé : case « Écart à trancher » remplie et question 26 ajoutée. En plus, B1 et B3 reprennent le défaut (fiche par processus après la signature, la brique d'entrée d'abord, un workflow à la fois) | premiere-reponse.md:796, :908 ; B1 :822, B3 :824 |
| 4 | premiere-reponse.md:598, :901, :597, :443, :665 | corrigé : `lib-normaliser-telephone` passe en couche « exécution, au moment d'envoyer seulement » et dans 035-005 ; `lib-capturer-lead` filtre par `not.is.null` ; question 27 ajoutée. En plus, la fiche Qualification et le champ `doublon` renvoient à l'empreinte (question 27) | premiere-reponse.md:629, :938 (035-005), :937 (035-004), :628, :909 ; :469-470, :696 |
| 5 | premiere-reponse.md:516, :536 | corrigé : Execute Workflow Trigger appelé par le parent. En plus, les deux lignes « Déclencheurs » disent que le parent route « balayage » et « rapport dû » | premiere-reponse.md:544, :566 ; :541-542, :563-564 |
| 6 | premiere-reponse.md:111, § 3.3 | corrigé : « Non : … » dans « Lu en entier ? » et ligne ajoutée au § 3.3 (prompts maîtres 1 à 4, contexte.md, état des lieux du 29/10, ADR-005 et ADR-006 non lus ; à lire avant le « approuvé ») | premiere-reponse.md:128, :177 |
| 7 | fiches-videos.md:11, :17-18, renvois C4, :383-384 ; premiere-reponse.md:130, :773 | corrigé : convention datée, 15 renvois recalés, citation de C4:122 rétablie, « retient déjà » remplacé par la contradiction (question 25). En plus, 10 autres renvois décalés de la même façon, non listés par l'écart, sont recalés (C4:236 → :240 aux l. d'origine 259, 457, 485, 905 ; C4:723-726 → :729-732 aux l. 265, 903 ; C4:736 → :742 aux l. 279, 909 ; C4:727-729 → :733-735 à la l. 420 ; C4:721-722 → :727-728 à la l. 905) | fiches-videos.md:11, :18-19, :411-413 ; premiere-reponse.md:147-148, :804 |
| 8 | premiere-reponse.md:91, :900, :34 | corrigé, et relu au MCP à 19:20 UTC : toujours 5 workflows. Précision ajoutée : deux d'entre eux sont **actifs** (`reseau-neuronal-revue-hebdo`, `hermes-file-taches-v1`), hors du chantier 4. L'interdit de 035-003 couvre aussi les workflows qui naîtront avant la tâche (`presti-sauvegarde`, `presti-garde-sauvegarde`, 032-023 en cours) | premiere-reponse.md:108, :936, :39 |
| 9 | premiere-reponse.md:365 | corrigé : l'accord vient de C4:244 et C4:247-248 ; l'ADR-008 veut ensuite l'exception écrite | premiere-reponse.md:390-391 |
| 10 | premiere-reponse.md:746, fiche Reporting | corrigé : le PDF de p5:427 redevient le défaut ; le lien devient une proposition (question 28). En plus, la fiche Reporting (« Outils n8n », « Permissions ») et la ligne « Le rapport du gérant » du § 7.1 le disent | premiere-reponse.md:777, :910 ; :566, :573-574 ; :803 |
| 11 | premiere-reponse.md:291, :668 ; fiche-methode-n8n.md:674 | corrigé : un paragraphe après le § 4.3 dit que l'autonomie par type n'est écrite qu'une fois. En plus, le nœud C1 du schéma et la description de `lib-decider@1.config.autonomie` le reprennent | premiere-reponse.md:358-360 ; C1 :312 ; :699 |
| 12 | fiches-depots.md:58, :144, :282, :400 ; fiche-methode-n8n.md:150, :208, :262, :360, :412, :499, :541, :657 ; fiches-videos.md:114, :223 | corrigé : chaque rubrique « Ce qu'elle montre » tient en 8 lignes au plus, faits seulement ; le relevé complet passe sous « Détail de la lecture », en fin de fiche, sans perte. En plus, trois rubriques de 9 lignes (fiche-methode-n8n.md:97 ; fiches-videos.md:307, :599 d'origine) sont ramenées à 8 lignes ou moins. Tous les renvois de la réponse vers les fiches sont recalés, chaque texte cité retrouvé mot pour mot (`/tmp/c027/recaler.py`) | 17 blocs « Détail de la lecture » : fiches-depots.md (4), fiche-methode-n8n.md (9), fiches-videos.md (4) ; mesure finale : aucune rubrique au-delà de 8 lignes |
| 13 | premiere-reponse.md:18 et les « (arbre) » | corrigé, comme proposé. Les marques « (arbre) » restent, avec leur nouveau sens. Vérifié ici : les lignes citées de `lib/pilote/regles.ts` (:27, :30, :32, :36, :70, :79-82, :137, :174, :205, :278) et de `architecture-outils.md` (:62-65, :69-79, :82, :100-102) sont toujours les bonnes. « (arbre, 17 h 30) » devient « (arbre) » | premiere-reponse.md:22-23 ; :37 |
| 14 | premiere-reponse.md:816-825 | corrigé : colonne « Cible proposée au client » ajoutée (K1 à K6 et K8 : à proposer en mode B ; K7 : zéro doublon, zéro geste interdit parti, p5:300) | premiere-reponse.md:848-857 |
| 15 | premiere-reponse.md:696 | corrigé : `client_qui_decroche` ajouté à l'énumération. En plus, il est ajouté aux irritants d'origine de l'agent Alerte (p5:192) | premiere-reponse.md:727 ; :537-539 |
| 16 | premiere-reponse.md:872 | corrigé, comme proposé (le client paie, contre C4:683) | premiere-reponse.md:904 |

Aucun écart n'est écarté : les 16 corrections proposées tiennent contre les sources relues (C4, p5, 0174, 0189, `fiche-methode-n8n.md:744`, ancienne :674).

## Ce qui a changé en plus à la relecture

- **En-tête relu au HEAD `49d22f09`** et au soir du 02/11 :
  - la mémoire, le disque et la charge d'Oracle ont été remesurés (19:20 UTC) ;
  - `presti-detecteurs` est passé à 41 nœuds et douze détecteurs (L12, 032-019) ;
  - les migrations sont relues : toujours aucun fichier 0183 à 0188 ; 0185 à 0187 (032-025) et 0190 (032-026) sont en préparation, rien d'appliqué ;
  - une liste « Changé le soir du 02/11 » est ajoutée : 032-013, 032-014, 032-017 à 032-022, et ce qui est en cours (032-023 à 032-026) ;
  - le PASS de 033-001 est corrigé à 16:27 UTC, l'heure du digest.
- **Les nouveaux workflows n8n sont nommés**, avec leur état :
  - `presti-suivi-artisan` et `presti-briefing-matin` sont inactifs ;
  - `presti-sauvegarde` et `presti-garde-sauvegarde` sont en cours ;
  - un nœud `SUI` est ajouté au schéma du § 4.1, et le nœud `HFT` dit que ses deux workflows sont actifs et hors du chantier 4.
- **`scripts/n8n-specs-qa.mjs` existe déjà** (032-019, fichier de 18:55 UTC, non commité). La tâche 035-001 devient « étendre » au lieu d'« écrire ». Sa règle « lectures GET seulement » refuserait un `lib-*` qui écrit derrière la porte « simulation » : c'est signalé, sans être réglé. A1 et la ligne « Le juge des exports » du § 7.1 sont mis à jour, tout comme `fiches-depots.md:686-690`.
- **`fiche-methode-n8n.md`** : le relevé de `presti-detecteurs` est daté (34 nœuds à 16 h 07, 41 depuis 18:46 UTC). Ses réglages ne désignent toujours aucun workflow d'erreur (MCP, 19:20 UTC) ; sa branche d'erreur est interne.
- **SMS** : `lib/sms/` n'est plus « absent » ; il s'écrit à blanc (032-024, en cours, non commité).
- **@restructureai** : le § 3.1, le § 3.3, la question 23 et la tâche 035-009 tiennent compte des 11 vidéos lues par 032-022.
- **§ 1, point 9** : « sans les contredire » devient « là où elle s'en écarte, c'est posé en question à Benj (questions 25 à 28) ».
- **B0** : la sauvegarde de toutes les tables est faite (032-020) ; son lancement par n8n (L8) est en cours.
- **Contrôles mécaniques** : le bloc JSON des contrats se lit (`JSON.parse`) ; chaque tableau de la réponse a le même nombre de colonnes à chaque ligne ; les questions vont de 1 à 28 sans trou.
- **Rien n'est construit** : ni n8n, ni code, ni migration, ni vault. Aucun prix de l'offre n'est écrit, et aucun chiffre d'auteur n'est ajouté.

## Non touché (hors périmètre)

- `ecarts-contre-verification-2.md`, `inventaire.md` et `fiches-videos-restructureai.md` restent tels quels, comme le veut l'interdit. Les numéros de ligne des fiches, cités par l'écart 12 (`ecarts-contre-verification-2.md:98`), décrivent l'état d'avant cette tâche.
- `.claude/rules/architecture-outils.md:70-71` dit encore « Workflows métier : `presti-detecteurs` (inactif) ». C'est périmé, mais hors du périmètre : à la session principale.

## Vérification

Sortie de `node scripts/orchestre.mjs verifier 032-027` : voir `verifier.txt`, dans ce dossier.

Incident de verdict, à savoir : un premier passage depuis `fait/` a rendu FAIL (« preuve vide : verifier.txt »). Ce n'était pas le
travail : ma commande `tee` vidait ce fichier pendant que le vérificateur le relisait. Le fichier est rempli, la tâche est revenue de
`refuse/` à `en-cours/`, puis à `fait/` ; le verdict final, rejoué depuis `fait/`, est PASS (digest, 19:36 UTC). La session principale
peut le rejouer à son tour.
