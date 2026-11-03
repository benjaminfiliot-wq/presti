# Ce que les 66 vidéos de @restructureai changent (prompt 5, tâche 035-014)

> Écrit le 03/11/2026 par Claude Code, d'après les 66 fiches : les 11 premières (`fiches-videos-restructureai.md`, n° 1 à 11) et les trois lots
> de la nuit (`fiches-compte-restructureai-lot1.md` n° 12 à 29, `-lot2.md` n° 30 à 47, `-lot3.md` n° 48 à 66), lues avec la transcription ET la
> planche d'images de chaque vidéo. Les citations sont « n° de fiche, horodatage `[mm:ss]` ou image NNN » ; l'identifiant TikTok de chaque vidéo
> est sur la ligne Source de sa fiche.
> Toutes les vidéos sont des présentations de maquettes animées : aucun résultat réel, aucun journal d'exécution. Les nombres d'agents, de
> modules, d'heures de construction, d'économies et de revenus qu'elles annoncent sont « annoncés par l'auteur, non vérifiés » ; aucun n'est repris ici
> comme un gain de Presti. Ce qui est tiré des vidéos est de la **structure**, pas des chiffres.
> Rappel de cadre : toute automatisation vit dans n8n (ADR-001) ; Studio prépare et l'artisan valide, Signature envoie seul ; l'artisan ne parle qu'à
> l'assistant de Presti, jamais à Hermes (`architecture-outils.md`, `autonomie-abonnements.md`). Rien de ce qui suit n'est construit ni déployé : ce sont des
> constats et des propositions, pour validation de Benj.

**Ce que les 66 vidéos disent, en une phrase.** Un cerveau qui route, des départements qui exécutent, une porte de validation humaine avant toute
sortie, un résumé d'une page chaque matin, et une mesure en argent plutôt qu'en vues ; Presti a déjà posé ces cinq choses, les vidéos confirment
l'ordre, et apportent surtout trois écrans (l'arrêt toujours visible, la lecture seule prouvée, le tri avant l'alerte) et quelques capacités à proposer.

## Pour les workflows n8n

1. **Le parent route, il ne pense pas, et chaque module écrit son état.** L'orchestrateur est un workflow qui reçoit un événement et appelle la
   chaîne (fiches 24, image 64 et 73 ; 30, image 81 ; 42, image 81 ; 49, image 078 ; 57, image 081 ; 58 et 59, image 089), avec un état écrit par module
   (38, images 2 à 9 : « defined », « mapped », « captured », « validated », « running » ; 43, images 1 à 13). C'est `ent-exemple-parent` (035-007) : il réclame les
   événements échus, appelle l'enfant, écrit son battement (`lib-battement`, alerte sans signe depuis 26 h) et ses lignes (`lib-journaliser`). Ce que les maquettes
   font en plus, un orchestrateur à modèle (57, image 081), Presti ne le reprend pas : aucun modèle pour une décision d'argent (p5:156, p5:216-218).
2. **Quatre rôles séparés : écrire, décider, exécuter, approuver.** La phrase est écrite à l'écran (14 et 15, image 11 ; 25, image 73) : un modèle écrit, une
   règle décide, un outil agit, une personne approuve. Dans Presti : `lib-rediger-message`, `lib-decider`, `lib-executer`, la carte du gérant (rang 0). La décision
   « est-ce que ça compte ? » précède l'alerte (24, image 28) : un tri en Switch avec une sortie de repli obligatoire (meilleures pratiques n8n « triage » :
   jamais de perte silencieuse, un texte classé sous schéma avec une raison, une température basse), puis `lib-alerter`, une alerte par workflow, catégorie et fenêtre de 5 min.
3. **La lecture seule se prouve par un refus.** L'écran montre une écriture refusée (24, image 28 « write : denied ») et deux terminaux, l'un qui parle et lit l'agenda, l'autre
   qui écrit (42, image 71). Dans Presti : n8n lit la base par un rôle en lecture seule (`0189_role_lecture_n8n.sql`), le MCP n8n de Hermes aussi, et chaque outil du client se
   branche par `gabarit-synchroniser-outil` sur une liste d'accès signée. À ajouter au banc de chaque client : un test hors ligne qui rougit si un workflow écrit là où il ne doit que lire.
4. **L'état est relu juste avant l'effet.** La frise de relances saute le rappel quand la facture est déjà payée (41, image 66) ; un tableau de factures par ancienneté propose « relancer » ou
   « enregistrer le paiement » (60, image 071) ; une relance arrêtée par une réponse revient en carte (exigence 1 du plan du chantier 4, §0 bis). C'est `lib-relancer` (« palier atteint et non envoyé », stop, escalade, jamais deux
   relances en 3 jours, `lib/relancesRegistre.ts:18`) puis `lib-executer`, qui relit l'interrupteur et l'état avant d'agir (une lecture en erreur ne fait rien). Presti n'enregistre aucun paiement.
5. **Un interrupteur et un état « arrêté, attend un humain ».** Un bouton « prendre la main » reste affiché (19, images 28 à 73), un « kill switch » surmonte le plan de contrôle (49, image 023), un panneau
   réunit journal, permissions et arrêt (46, image 15), un agent peut passer en « stopped, needs a human » (44, image 89). C'est `lib-disjoncteur` (coupé seul après N échecs, ou à la main par le gérant ou par Benj)
   et le journal de `lib-journaliser` / `assistant_journal` (0185) ; ajouter l'état « arrêté, attend un humain » à la fiche du disjoncteur.
6. **Des détecteurs qui regardent les silences avant la plainte.** Un client qui décroche se repère à une demande restée sans réponse, un rappel manqué (46, image 29 ; 12, image 67 ; 13, [01:05]-[01:10]),
   une relance d'impayé qui reçoit une réponse (2, image 044). Ce sont les détecteurs du chantier 4 (n8n, L3 : 6 demandes sans réponse, 1 impayé ; L12 : 11 réponse à une relance d'impayé, 12 entretien),
   classés par argent récupéré (§9 du plan) et jamais déclencheurs du pilote.
7. **Le résumé du matin est un workflow qui propose, jamais un qui agit.** Une page unique, l'argent perdu d'abord (nombreuses fiches : 1, 12, 14, 17, 19, 23, 25, 27, 29 ; 25, images 55 et 64 pour « l'argent déjà perdu »).
   C'est `presti-briefing-matin` (L15) ; pour l'Entreprise, `lib-rapport-hebdo`, qui refuse tout chiffre sans source.
8. **Un contrôle de voix et de promesse avant toute sortie.** Les maquettes le montrent à trois endroits : « ne promet pas » avant publication (30, images 31 et 41), tournures interdites (45, image 34), règles du fichier de voix,
   dont « pas de fausse urgence » (24, image 37 ; 21, image 57 ; 19, image 55). Dans Presti : une étape de `lib-porte-conformite` (veto) et un test hors ligne des tournures interdites sur les textes
   (rang 10 du plan du chantier 4 : aucune relance ne présume l'accord, ne culpabilise ni n'invente une urgence) ; le ton de l'artisan reste prouvé par `scripts/persona-e2e.mjs`.
9. **Mesurer jusqu'au résultat, relier la source au client.** Le revenu par canal, du premier contact à la vente (12, 14, 15, image 81 ; 23, image 64 ; 29, images 57 et 65 ; 65, image 050 « post par post »). Dans Presti :
   `leads.origine` (`0177_canaux_reseaux.sql`) et l'entonnoir lien, demande, devis, facture, déjà mesurés ; par type de prestation pour un client Entreprise.
10. **La méthode avant l'outil.** Dessiner le processus réel avec ses retours en arrière avant d'ajouter un agent (22, images 17 et 25 ; 6, images 075 et 088 ; 58, image 056 : le module de mesure « à construire d'abord ») ; c'est l'ordre de la
    fiche de découverte (035-002) et de la phase de mesure de départ (§7.3 de `premiere-reponse.md`).

**Capacités nouvelles que les vidéos suggèrent (aucune n'est construite ; chacune est « à proposer à Benj, dans n8n »).**
- Une **fiche avant la visite** chez le client : les seules données de la demande, ses photos, ce qui manque ; aucun fait inventé (18, image 64 ; 28, image 36 ; 54).
- Une **demande d'avis en fin de chantier**, sans incitation, validée par l'artisan, rattachée au lot L18 (11 ; 20, images 31 et 61 ; 46, images 71 et 85 ; 51 ; 56), et une **réponse aux avis** préparée (11).
- Un **radar de signaux locaux** (météo, événements) qui propose une relance de saison, jamais un envoi (47 ; 62, image 065) ; un **classement hebdomadaire des offres concurrentes** à partir de sources d'Oracle (30 ; 38).
- Une **alerte de trésorerie** à partir des seuls impayés cumulés de l'artisan (41) ; un **temps passé** capté sans saisie (37).
- Un **indicateur de mise en route** de l'offre Entreprise (48), et des **contenus tirés de vrais avis et de vrais chantiers** pour le chantier 5 (51 ; 56 ; 65, « The Proof Machine »).

## Pour l'interface

1. **« Aujourd'hui » est le bon écran, et sa forme est celle des vidéos.** Une conversation du matin avec l'équipe, qui commence par « rien que je doive savoir ? » (23, image 73 ; 27, image 73 ; 1, image 080 ; 20, image 81 : une page du jour à 7 h). C'est l'accueil v2 (L5, 032-041) : la barre « à valider », les trois
   priorités calculées par le code (0 appel au modèle) et l'assistant, sans nom d'outil. La messagerie à un fil par service (33, image 23 ; 18, image 73 ; 28, image 57) donne une idée de présentation pour un client Entreprise, mais jamais l'organigramme d'agents devant l'artisan.
2. **Une file « à valider » avec un geste par ligne et un geste pour tout.** « Approve » par ligne et « Approve all » en tête (27, image 46), feu vert groupé (1, image 055), « needs your OK » avec Hold et Approve (45, image 89 ; 47, image 67 ; 49, image 089 ; 50 et 61, image 065), « Approve & schedule » et
   « Request edit » (29, images 33 et 49). C'est la carte de lot (L16, `lib/assistant/cartes.ts`) : retenus, exclus et leur motif, validés d'un geste ; l'argent d'abord.
3. **Une exception arrive préparée.** « Déjà traité, ou sur votre bureau avec la solution prête » (1, [01:05]-[01:10]) ; le brouillon de relance avec « besoin de votre accord », un bouton d'envoi, un bouton de modification (18, image 73 ; 21, image 65). Une carte = un brouillon, Valider, Modifier ; le montant vient de l'artisan
   ou du code, jamais d'un modèle.
4. **« Tout arrêter » est visible partout.** Le bouton « take over » sur chaque écran (19) et le panneau d'arrêt (46, image 15 ; 49, image 023) rejoignent la section « Part tout seul » de l'accueil : « Tout arrêter », annulation pendant 10 minutes (`lib/pilote/regles.ts`). À poser aussi sur la fiche de chaque agent du client Entreprise.
5. **Trois niveaux d'autonomie, et une période de départ.** « Menée par l'humain, assistée, autonome » (61, image 065), « supervisé, pas autonome » (42 ; 58, image 089), une porte humaine sans publication pendant la période de départ (47, image 56 ; 50, image 021). C'est « Je valide | Part seul après 10 min », type d'action par
   type d'action, et la règle des 2 ou 3 premières validations avant l'automatique (`autonomie-abonnements.md`) ; la QA qui repasse un contenu en validation en cas d'anomalie.
6. **Le journal « fait pour vous ».** Une ligne par action, ce que chaque module a fait (62, image 025 ; 46, image 15 ; 8) : l'onglet « Fait pour vous » et `assistant_journal`, lisibles par l'artisan, sans mot technique.
7. **Ce que les maquettes montrent et que l'interface de Presti ne montre pas.** Des noms d'agents, de modèles et d'outils (18, 28, 33 ; 25, image 73) : vocabulaire interdit (§7 du plan, `accueil-qa`) ; des notes de ressemblance, des pourcentages de confiance, des économies chiffrées (19, image 55 ;
   64, image 041 ; 50, image 071) : aucun chiffre affiché sans mesure ni source ; un badge « assistant » sur les messages (15, images 61 et 71) : question ouverte pour Benj, car les e-mails partent au nom de l'artisan (`lib/email.ts:6-11`).
8. **Mobile d'abord.** Les maquettes d'approbation sont des téléphones : un message, un bouton (15, image 31 ; 12, image 89 ; 49, image 089) ; cela confirme la base de 390 px, une première carte, un seul bouton principal (§7 du plan).

## Pour l'offre Entreprise

1. **Le diagnostic avant l'agent.** Mesurer où le client perd (demandes sans réponse, devis non relancés, factures échues) avant de proposer un seul agent (6, images 075 et 088 ; 22, images 17 à 33 ; 63, images 005 à 014 : « problèmes courants », puis « solution »). C'est la fiche de découverte (035-002) et la base de départ de chaque irritant (§5.1, §7.3).
2. **Quatre cases par irritant : supprimer, automatiser (n8n), confier à l'IA (rédaction), garder une personne** (22, image 33) ; la signature et le paiement restent au client, par `lib-porte-conformite`. Un irritant signé donne un workflow, un KPI et une base de départ (le tableau de §5.1).
3. **Une hiérarchie en rangs, et un orchestrateur qui n'est pas un agent.** Gérant et membres habilités au rang 0, orchestrateur et conformité au rang 1, qualification, alerte, reporting, relance et rédaction au rang 2 (§4.2) ; les maquettes à 7, 27, 31, 40, 55 ou 67 agents (18, 33, 37, 44, 49, 60) ne sont reprises qu'en structure.
4. **Les outils du client se branchent en lecture, par une liste signée.** Une grille de connecteurs avec un interrupteur par outil (18, image 21), un panneau d'accès (49, image 023 ; 46, image 15), le CRM, l'agenda, la boîte de réception, un logiciel d'interventions (18) : `gabarit-synchroniser-outil`, copié par client, jamais partagé avec ses données.
5. **L'autonomie se règle par type d'action et se gagne.** Studio prépare, Signature envoie seul les types prévus ; pour l'Entreprise, un interrupteur général et un par agent, une période d'observation, un disjoncteur (voir « Pour l'interface » n° 5). Un geste jamais automatique reste une carte, même réglé en automatique (p5:315).
6. **Des règles par client, surtout pour un métier réglementé.** Les maquettes juridiques portent une porte « conflits » avant l'ouverture d'un dossier (60, image 001 ; 37, image 37 ; 53, images 092 et 105) et une validation par la personne qualifiée (66, images 036 et 043) : `lib-porte-conformite` porte les règles du client ; pour le bâtiment, les mentions obligatoires d'un devis et la TVA
   (`presti-audit-conformite`).
7. **Un seul rapport par semaine, en argent.** Le rapport hebdomadaire unique (3 ; 46, [01:22]-[01:40] ; 59, image 067 : une boucle qui ramène le client) : `lib-rapport-hebdo`, indicateurs calculés en SQL, chacun avec sa source, sa date et sa confiance ; une décomposition sans méthode (46, image 99) n'est jamais reprise.
8. **Ce que l'offre vend : des irritants résolus et prouvés, pas un nombre d'agents.** Les vidéos annoncent des nombres d'agents, des économies et des prix de mise en place (non vérifiés) ; la présentation de l'offre suit l'ordre « problèmes courants, puis solution » (63) sur l'entreprise fictive Bâti-Démo (§5.1), avec un KPI mesuré chez le client (K1 à K5, §7.3) et la mention « inconnue, à mesurer » quand la base de départ manque.
9. **Copier ce qui marche, d'un client à l'autre.** Démarrer par une équipe, corriger la règle, puis copier (22, images 57 et 65) : les gabarits `lib-*` se recopient, jamais les données (p5:158) ; chaque client garde son identifiant dans son `ent-<client>-*`.
10. **Une vue d'ensemble client qui reste celle de l'assistant.** Le client Entreprise parle à l'assistant de Presti ; Hermes reste derrière (`architecture-outils.md`) ; l'interface d'agents et le CRM promis aux clients de l'offre sont des écrans de l'assistant, pas des conversations avec des agents.

## Ce que Presti ne reprend pas

Ce que les vidéos font, et que Presti s'interdit (règles de `securite.md`, `autonomie-abonnements.md`, `architecture-outils.md`, anti-fabrication de `CLAUDE.md`).
- **L'appel téléphonique par l'IA** et la prise d'appel : agent vocal qui rappelle ou décroche (12, image 78 ; 13, image 64 ; 14, image 71 ; 42, images 21 et 31 ; 28 ; 15, image 71). Presti rappelle par un écrit préparé, jamais par la voix.
- **Le rendez-vous ou le créneau pris seul, ou inventé** (25, image 37 ; 32, image 45 ; 33, image 56 ; 50, image 061 ; 65, image 036 ; 36, image 121) ; ainsi que le technicien dépêché, la bâche promise et la consigne technique donnée seule (62, image 065 ; 63, image 012). Une urgence est escaladée à l'artisan (`lib/pilote/regles.ts:191`).
- **Le paiement, l'acompte, le lien de dépôt, la demande à un prêteur, le rapprochement bancaire** (33, image 67 ; 32, image 78 ; 9 ; 61, image 025). Presti n'a aucun accès bancaire ni comptable.
- **Un chiffre de gain promis ou affiché** : les prix de mise en place, les économies, les revenus, les « avant/après » (1, 22 image 65, 46 image 99, 48 image 012, 50 image 071) et les notes de ressemblance (19, image 55). Aucun chiffre sans source, jamais présenté comme vérifié.
- **La publicité payante gérée pour un client**, les budgets déplacés seuls, l'achat média (14, 31 image 61, 35 image 49, 50, 55, 58, 66, 20) : toute dépense attend l'accord de Benj (`securite.md`).
- **La collecte LinkedIn** (13 ; 44, image 34 ; 52 ; 64) et la collecte d'avis, de commentaires ou de fils de réseaux sans droit connu (12, Reddit ; 38, image 5).
- **Le clonage de voix et le doublage** sans accord écrit (13, 15), et la voix de synthèse comme voix de l'artisan.
- **Le routage des avis selon la note** (notes hautes vers Google, basses vers une alerte, 66, images 015 et 050) : sollicitation sélective d'avis, contraire aux règles des plateformes (à vérifier) ; Presti demande l'avis à tous, quel qu'il soit (`lib/apresChantier.ts:47-50`).
- **Un geste commercial proposé au client mécontent, sans l'artisan** (46, image 57) : un crédit ou une remise est une décision d'argent.
- **La tarification dynamique, les promotions automatiques, les paniers abandonnés** (20) ; la surveillance des prix des concurrents (24, 30).
- **Un modèle gratuit en ligne avec des données de client ou de prospect** (16) ; un modèle local reste une piste à mesurer au banc d'évaluation, pour de petites tâches, jamais pour un montant ou un devis.
- **« Claude Code, directeur marketing » ou toute tenue d'un rôle auprès d'un client** (65 ; 12, 14, 29) : Claude Code développe et vérifie, il ne répond à aucun client (`architecture-outils.md`).
- **Publier sans personne** : aucun contenu de Presti ne sort sans les 2 ou 3 premières validations de Benj, puis la QA ; pas de publication sans URL relue.
