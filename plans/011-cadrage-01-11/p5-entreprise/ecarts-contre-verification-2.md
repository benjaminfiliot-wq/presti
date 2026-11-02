# Prompt 5 — les 16 écarts du contre-vérificateur n° 2 (02/11/2026, vers 19 h 45)

Verdict : à corriger. Source : workflow wf_93015a21-598, agent contre-verifier-2. Chaque écart : où, ce qui ne va pas, la correction proposée.

Résumé du contre-vérificateur : Tour 2, en mode A. Les 8 points de la première réponse sont là, et l'en-tête de l'annexe 2 §4 aussi (disque et mémoire d'Oracle, presti-detecteurs, migrations).

Affirmations sur Presti : environ 45 relues au fichier:ligne dans la réponse (lib/plans.ts, lib/pilote/*, 0174, 0157, lib/relancesRegistre.ts, lib/email.ts, lib/legalArtisan.ts, les migrations des KPIs, les routes Stripe et contact, .claude/rules, le C4). Toutes tiennent au HEAD 49d22f09, sauf une, devenue fausse à 19 h 02 : le juge des détecteurs est au lanceur (tout-verifier.mjs:196).

Vérifié aussi :
- les migrations 0183 à 0188 ne sont nulle part : ni fichier, ni git --all, ni objet en base (relu en lecture seule à 18:51 UTC) ;
- les faits externes tiennent : Haiku 5.5 à 0,10 $ et 0,50 $ (page relue le 02/11), Oracle Always Free à 2 OCPU et 12 Go, Resend, Twilio, Sweego ;
- aucun prix de l'offre, aucune phrase interdite par p5:42 ;
- les données d'exemple portent « Exemple. » ;
- n8n-first est tenu : les exceptions A et B sont écrites.

Écarts restants :
- trois contradictions avec le C4, non posées en question à Benj : le kit construit avant contrat mais rangé en L20 ; le moment de la fiche et la brique d'entrée ; la lecture du téléphone par n8n, contre C4:142-145 et 0189 ;
- une contradiction interne : Alerte et Reporting ont leur propre déclencheur, hors du parent ;
- des sources obligatoires non lues et non signalées : prompts maîtres 1 à 4, contexte.md, état des lieux du 29/10 ;
- des renvois C4 faux, une citation déformée et une affirmation trop forte dans fiches-videos.md ;
- le compte des workflows d'Oracle est périmé (5, pas 3), jusque dans l'interdit de 035-003 ;
- l'ADR-008 cité pour une règle qu'il ne pose pas ;
- le PDF du rapport, défaut de Benj, changé sans le dire ;
- une contradiction avec fiche-methode-n8n.md:674 ;
- le format « 3 à 8 lignes » des fiches non tenu ;
- quatre points mineurs : la convention du HEAD, la cible des KPIs, la catégorie churn, le payeur des SMS.

Verdict : à corriger.

## Écart 1

- **Où** : premiere-reponse.md:35 (en-tête, ligne « Workflow presti-detecteurs ») et :954 ; aussi fiche-methode-n8n.md:38 et fiches-depots.md:651
- **Écart** : Faux au HEAD : « Le juge n'est toujours pas dans SUITES (scripts/tout-verifier.mjs, relu vers 18 h 50) ». Le lanceur a été modifié à 19 h 02 et commité dans 49d22f09 (19 h 06), avant le dernier enregistrement de la réponse (19 h 07) : il inscrit scripts/detecteurs-n8n-qa.mjs à scripts/tout-verifier.mjs:196 (« Détecteurs n8n (L3, 032-003, juge réécrit par 032-012, audité par 032-016) »). C'est justement l'état de presti-detecteurs que l'annexe 2 §4 exige en tête.
- **Correction** : l.35 : « Le juge est inscrit au lanceur depuis le commit 49d22f09 (02/11, 19 h 06) : scripts/tout-verifier.mjs:196. » ; l.954 : « scripts/tout-verifier.mjs (detecteurs-n8n-qa à la l.196 depuis 49d22f09) » ; fiche-methode-n8n.md:38 : « (il y est depuis le 02/11 à 19 h 06, l.196) » ; fiches-depots.md:651 : « … et, depuis le 02/11 à 19 h 06, une seule mention de n8n dans scripts/tout-verifier.mjs (l.196, detecteurs-n8n-qa) ».

## Écart 2

- **Où** : premiere-reponse.md:787 (§ 7.2, phase A4, colonne « Lot du C4 »), :759 (titre du § 7.1), § 8
- **Écart** : Contradiction avec le C4 qui n'est pas posée en question. A4, la démo du mode A sans aucun client, est rangée en « L20 ». Or le C4 dit de L20 « rien avant un contrat signé » (C4:721, :849), et la réponse elle-même fait passer « L20-A … avant L20, qui reste « sur contrat » » (l.776). Plus largement, construire les lib-* et la démo avant tout contrat, en bibliothèque partagée, s'écarte du C4, qui range dans L20 les moteurs « copiés et adaptés par client » (C4:736-737). Le titre « sans le contredire » est donc faux, et aucune des 24 questions ne soumet ce point à Benj.
- **Correction** : l.787 : « L20-A, proposé (§ 7.1) ; le C4 range ces moteurs dans L20, « rien avant un contrat signé » (C4:721, :849) : question 25 » ; l.759 : « Ce que le prompt 5 ajoute au chantier 4, et où il s'en écarte » ; ajouter au § 8 : « | 25 | Le kit du mode A (A2 à A4 : les lib-* et la démo ent-exemple-* dans le n8n d'Oracle) se construit-il avant tout contrat, et en bibliothèque partagée, alors que le C4 range les moteurs « copiés et adaptés par client » dans L20, « rien avant un contrat signé » (C4:721, :736-737, :849) ? | Oui : la consigne le demande (p5:22, p5:158, p5:339) et prime en cas de doute (p5:406) ; rien de sur mesure, rien de publié, aucune donnée réelle avant un contrat (C4:726) | Benj | ».

## Écart 3

- **Où** : premiere-reponse.md:765 (§ 7.1, ligne « La mise en place », colonne « Écart à trancher » : « — »), § 5.2 (l.424-426), § 7.2 B1 à B3 (l.790-792)
- **Écart** : Contradiction avec le § 12.1 du C4, non signalée. Le C4 place la fiche de cadrage, outils compris, « après la signature » (C4:729 ; C4:181-182 : les outils sont détaillés après la signature). Il prévoit aussi une seule brique d'entrée, un workflow à la fois, le plus rentable d'abord (C4:727-728, :737-738). La réponse, elle, fait remplir et signer la fiche de découverte (outils, volumes, processus) au rendez-vous, avant la proposition et le contrat (B1, d'après p5:52-54). Ses phases B2 et B3 ne reprennent ni la brique d'entrée unique, ni « un workflow à la fois ». La case « Écart à trancher » dit pourtant « — ».
- **Correction** : l.765, colonne « Écart à trancher » : « Le moment de la fiche (C4:729, :181-182, contre p5:52-54) et la brique d'entrée unique (C4:727-728, :737-738) : question 26 » ; ajouter au § 8 : « | 26 | Quand se remplit la fiche, et que construit-on d'abord ? Le C4 met la fiche de cadrage après la signature et une seule brique d'entrée (C4:727-732, :737-738) ; le prompt 5 met la fiche de découverte au rendez-vous, avant la proposition (p5:52-54) | La fiche de découverte en 8 parties au rendez-vous (p5:52) ; la fiche par processus de la brique retenue après la signature (C4:729-732) ; en B3, la brique d'entrée d'abord, les autres chaînes par avenant (C4:727-728) | Benj | ».

## Écart 4

- **Où** : premiere-reponse.md:598 (§ 5.5, lib-normaliser-telephone), :901 (tâche 035-004), :443 et :665 (doublon de la Qualification), :597 (lib-capturer-lead) ; à rapprocher de :402 (§ 4.6)
- **Écart** : Contradiction avec la règle « Ce que n8n lit » (C4:142-145), non signalée. n8n ne lit que des identifiants, des dates, des montants et des statuts ; il ne lit un contact qu'au moment d'envoyer (C4:144). Le rôle n8n_lecture exclut aussi « ni nom, ni e-mail, ni téléphone, ni adresse » (0189_role_lecture_n8n.sql:8). Or lib-normaliser-telephone lit et normalise un numéro dans la chaîne qui va de la capture à la décision (035-004), et le champ « doublon » de lib-qualifier-lead (p5:189) n'a aucune source permise. La réponse reprend pourtant cette règle au § 4.6.
- **Correction** : l.598 : « | lib-normaliser-telephone | exécution, au moment d'envoyer seulement (C4:144) | … » ; l.901 : retirer lib-normaliser-telephone de 035-004 et l'ajouter à 035-005 ; l.597 : « … rejette ce qui n'a aucun moyen de contact, par un filtre not.is.null, sans lire le contact » ; ajouter au § 8 : « | 27 | Le repérage des doublons (p5:189) peut-il lire un contact dans n8n, alors que n8n n'en lit aucun hors de l'envoi (C4:142-145 ; 0189_role_lecture_n8n.sql:8) ? | Non : le doublon se lit sur une empreinte du contact calculée en base (colonne générée, migration au « go ») | Benj | ».

## Écart 5

- **Où** : premiere-reponse.md:516 (fiche Alerte, « Outils n8n ») et :536 (fiche Reporting, « Outils n8n »)
- **Écart** : Contradiction interne. Les deux fiches donnent à l'agent son propre « Schedule Trigger 1.4 ». Or c'est le parent qui porte seul l'horaire : il route « balayage » vers Alerte et « rapport dû » vers Reporting, après avoir lu l'interrupteur, le verrou et les disjoncteurs (§ 4.3, l.290-315 ; p5:156). Un déclencheur propre à l'agent contournerait ces contrôles, et donc l'arrêt à effet immédiat (p5:263).
- **Correction** : l.516 : « Outils n8n : Execute Workflow Trigger 1.3 (appelé par ent-exemple-parent, qui porte l'horaire et lit l'interrupteur), Code 2, lib-alerter … » ; l.536 : « Outils n8n : Execute Workflow Trigger 1.3 (appelé par ent-exemple-parent le lundi à 8 h et le 1er du mois), Code 2, Summarize, HTTP Request en lecture … ».

## Écart 6

- **Où** : premiere-reponse.md:111 (§ 3.1, ligne « Presti et le réseau neuronal », « Lu en entier ? » : « — ») et § 3.3 (l.142-161)
- **Écart** : Des sources obligatoires n'ont été ni lues ni signalées (p5:69, p5:85). Ni la réponse ni ses fiches ne citent comme lus les prompts maîtres 1 à 4 (prompts-benj/p1-prospection.md, p2-contenu.md, p3-assistant.md, p4-landing.md), .orchestre/contexte.md, ni l'état des lieux de l'assistant du 29/10 (presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md, annexe 1 § A). L'ADR-005 et l'ADR-006 non plus, alors que la ligne annonce « ADR-001 à ADR-008 ». Le C4 n'est lu qu'en partie (§ 0, 0 bis, 6, 8 à 12.1, 14). Enfin, « — » n'est pas le « oui/non » qu'exige le format (p5:74).
- **Correction** : l.111, colonne « Lu en entier ? » : « Non : ADR-008 en entier ; ADR-001 ; ADR-002, ADR-003 et ADR-004 en partie ; ADR-005 et ADR-006 non lus ; Journal-Decisions du 02/11 seulement ; C4 en partie (§ 0, 0 bis, 6, 8 à 12.1, 14) » ; ajouter au § 3.3 : « | Prompts maîtres 1 à 4, .orchestre/contexte.md, état des lieux de l'assistant du 29/10 (annexe 1 § A) | Non lus | Vérifier qu'ils ne contredisent pas l'offre (le prompt 4 porte le bloc entreprise de la landing, le prompt 3 l'assistant) | Les lire avant le « approuvé » (035-010) | ».

## Écart 7

- **Où** : fiches-videos.md:11 (conventions), :17-18, :38, :63, :86, :179, :188, :271, :325, :333, :335, :381-382, :383-384, :542, :899, :905 ; repris dans premiere-reponse.md:130-134 et :773
- **Écart** : Les renvois au C4 ne disent pas dans quel état du plan ils ont été pris. Au-delà de la l.125, ils tombent 4 à 6 lignes trop tôt dans le plan tel qu'il est (état de 17 h 32, celui du HEAD 49d22f09). Deux passages faussent en plus le C4. Les l.17-18 lui prêtent, à C4:122, « la source ne le dit pas » ; C4:122 dit en fait « Détails Entreprise des seules transcriptions … : seules :218, :271 et :375 tiennent ». Les l.383-384 disent que le plan « retient déjà » une démo du mode A ; or le C4 range les moteurs dans L20, « rien avant un contrat signé » (C4:721), et veut une démo qui « ne montre que le vrai produit » (C4:724).
- **Correction** : l.11 : « … chantier-4-assistant-plan.md, dans son état de 17 h 32 » ; corriger : l.38 C4:723-726 → C4:729-732 ; l.63 et l.381-382 C4:236 → C4:240 ; l.86 C4:712-743 → C4:718-751 ; l.179 C4:721-722 → C4:727-728 ; l.188 C4:736-738 → C4:742-744 ; l.271 C4:629-631 → C4:635-637 ; l.325 C4:722 → C4:728 ; l.333 et l.905 C4:727-729 → C4:733-735 ; l.335 C4:188-191 → C4:189-195 ; l.384 C4:730-735 → C4:736-741 ; l.542 C4:619-653 → C4:625-660 ; l.899 C4:172-207 → C4:176-211. l.17-18 : « a écarté deux points : l'un en disant « la source ne le dit pas » (C4:120), l'autre comme « détails des seules transcriptions », dont il ne garde que :218, :271 et :375 (C4:122) » ; l.383-384 : « … alors que le plan range ces moteurs dans L20, « rien avant un contrat signé » (C4:721), et veut une démo qui ne montre que le vrai produit (C4:724) : question 4 de la première réponse ». Même nuance entre C4:120 et C4:122 dans premiere-reponse.md:130 et :773.

## Écart 8

- **Où** : premiere-reponse.md:91 (§ 2, ligne « n8n d'Oracle »), :900 (tâche 035-003, « Interdits »), :34 (en-tête)
- **Écart** : Périmé : le n8n d'Oracle porte 5 workflows, pas 3 (MCP search_workflows relu le 02/11 vers 18:40 UTC). S'y sont ajoutés presti-suivi-artisan (L17, tâche 032-014, créé à 18:03 UTC) et presti-briefing-matin (L15, tâche 032-013, créé à 18:24 UTC), tous deux inactifs. L'interdit de 035-003, « toucher les trois workflows existants », laisserait donc la tâche modifier ces deux workflows.
- **Correction** : l.91 : « 5 workflows (MCP, 02/11 vers 18:40 UTC : les 3 de 16:28 UTC, plus presti-suivi-artisan et presti-briefing-matin, inactifs) ; 4 identifiants … » ; l.900 : « Interdits : publier, toucher un workflow existant (cinq au 02/11 vers 18:40 UTC), écrire dans Supabase, tout identifiant » ; l.34 : ajouter « ; 5 vers 18:40 UTC ».

## Écart 9

- **Où** : premiere-reponse.md:365 (§ 4.5)
- **Écart** : Source fausse. L'ADR-008, à « Garde-fous et seuil de bascule », dit « Une exception est écrite dans la réponse et dans [[Journal-Decisions]] ». Il ne pose pas la condition « qu'avec l'accord écrit de Benj », que la réponse lui attribue. Cette condition vient du C4 (C4:244, C4:247-248).
- **Correction** : « Elles n'entrent au Journal-Decisions qu'avec l'accord de Benj (C4:244, C4:247-248) ; l'ADR-008 (« Garde-fous ») veut ensuite l'exception écrite dans la réponse et dans Journal-Decisions. »

## Écart 10

- **Où** : premiere-reponse.md:746 (§ 6, ligne « Rapports ») ; fiche Reporting, l.536-537 et l.542-543
- **Écart** : Le défaut de Benj est changé sans le dire, et p5:427 est cité pour ce qu'il ne dit pas. p5:427 fixe « dans la console, plus un PDF par e-mail le lundi à 8 h (heure de Paris), au choix du client ». La réponse écrit « plus le lien envoyé par e-mail le lundi à 8 h (p5:427) ; le PDF plus tard ».
- **Correction** : l.746 : « La console de Presti, plus un PDF par e-mail le lundi à 8 h, au choix du client (p5:427, défaut de Benj) ; proposé à la place : un lien vers la console, sans pièce jointe (question 28) » ; ajouter au § 8 : « | 28 | Le rapport du gérant part-il en PDF (p5:427) ou en lien vers la console ? | Le PDF de p5:427, au choix du client | Benj | ».

## Écart 11

- **Où** : premiere-reponse.md:291 (§ 4.3, nœud C1) et :668 (lib-decider@1.config.autonomie) ; fiche-methode-n8n.md:674
- **Écart** : Contradiction, non signalée, avec la fiche dont la réponse part. fiche-methode-n8n.md:674 range parmi les « erreurs à éviter » « une table de configuration Entreprise qui doublerait pilote_reglages ». Or la configuration par organisation porte « interrupteur général · autonomie » par type d'action, que pilote_reglages porte déjà (actif et types, 0174_pilote_automatique.sql:23-24). Seul l'interrupteur est relié au pilote (l.332-335) : l'autonomie par type est écrite deux fois.
- **Correction** : Après la l.335, ajouter : « L'autonomie par type n'est écrite qu'une fois : ce qui part par le pilote suit pilote_reglages.types du compte (0174:24) ; la configuration par organisation ne porte que ce que le pilote n'a pas (simulation, disjoncteurs, interrupteur par agent, niveaux 1 et 2). »

## Écart 12

- **Où** : fiches-depots.md:58, :144, :282, :400 ; fiche-methode-n8n.md:150, :208, :262, :360, :412, :499, :541, :657 ; fiches-videos.md:114, :223 (rubriques « Ce qu'elle montre »)
- **Écart** : Le format imposé n'est pas tenu. La consigne veut « Ce qu'elle montre : <3 à 8 lignes, faits seulement> » (p5:75), pour une « fiche de lecture courte » (p5:71). Ces rubriques font 12 à 25 lignes non vides : 25 pour n8n-docs (fiches-depots.md:282), 24 pour n8n Skills (:400), 22 pour O3A2xnBadFo (fiches-videos.md:114), 21 pour la fiche 10 de la méthode (fiche-methode-n8n.md:541).
- **Correction** : Ramener chaque rubrique « Ce qu'elle montre » à 8 lignes au plus, faits seulement. Le détail passe sous un intertitre « Détail de la lecture », placé après la fiche.

## Écart 13

- **Où** : premiere-reponse.md:18 (conventions) et les mentions « (arbre) » des l.32, :34, :35, :82, :83, :477, :737, :752, :786, :856, :885
- **Écart** : Périmé : le HEAD n'est plus 74db706a mais 49d22f09 (02/11, 19 h 06), qui commite lib/pilote/regles.ts et .claude/rules/architecture-outils.md. « (arbre) » ne signale donc plus un fichier non commité. Les lignes citées, elles, n'ont pas bougé : l'arbre et le HEAD ne diffèrent pas pour ces deux fichiers.
- **Correction** : l.18 : « Le code est cité au commit 74db706a ; « (arbre) » marque lib/pilote/regles.ts et .claude/rules/architecture-outils.md, alors non commités et entrés tels quels, aux mêmes lignes, dans 49d22f09 (02/11, 19 h 06), le HEAD actuel. »

## Écart 14

- **Où** : premiere-reponse.md:816-825 (§ 7.3, tableau des KPIs)
- **Écart** : Il manque une colonne. Le livrable 10 demande, pour chaque KPI de ROI, une « cible proposée au client » (p5:288). Le tableau n'a pas cette colonne et ne dit pas pourquoi. Seul K7 porte une cible (« zéro »).
- **Correction** : Ajouter une colonne « Cible proposée au client » : « à proposer en mode B, une fois la base de départ mesurée (p5:288) ; aucune en mode A » pour K1 à K6 et K8 ; « zéro doublon, zéro geste interdit parti (p5:300) » pour K7.

## Écart 15

- **Où** : premiere-reponse.md:696 (contrat lib-alerter@1, énumération « categorie »)
- **Écart** : Il manque une catégorie. L'agent Alerte doit détecter « un client qui décroche (churn) » (p5:192). La liste fermée du gabarit, qui vaut pour tout client, ne permet pas de l'exprimer.
- **Correction** : « "categorie": {"enum": ["workflow_en_panne", "disjoncteur_ouvert", "cout_qui_derive", "demande_qui_stagne", "client_qui_decroche", "echeance_proche", "stock_bas", "battement_absent"]} ».

## Écart 16

- **Où** : premiere-reponse.md:872 (§ 8, question 22)
- **Écart** : « Inchangé » est faux sur le payeur. Le C4 garde « qui paie (défaut : Presti en v1) » (C4:683). La réponse fait payer le client, comme le veut p5:238, mais sans signaler l'écart avec le C4.
- **Correction** : « Changé pour l'Entreprise sur un point : le SMS par API est payé par le client, sur son compte (p5:238), alors que le C4 fait payer Presti en v1 (C4:683). Inchangé : le lien sms: d'abord ; une API seulement après approbation du coût. »

