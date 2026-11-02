# Fiches de lecture : les 11 vidéos TikTok de @restructureai (sources obligatoires du prompt 5)

> Écrit le 02/11/2026 par Claude Code (exception au routage : le brief était prévu pour Hermes, qui ne tourne que sur le PC), tâche 032-022.
> Entrées : transcriptions Whisper (`<id>.transcription.json`), métadonnées (`<id>.info.json`) et images une par seconde (`<id>-images/`),
> sur le serveur d'agents, dossier `/home/usine/agents/videos/restructureai/`. Rien n'a été téléchargé.
>
> Conventions.
> - `[mm:ss]` : début du segment Whisper dans la vidéo. « image NNN » : le fichier `NNN.jpg` du dossier d'images, soit la seconde NNN environ.
> - Les phrases anglaises sont traduites ; une citation courte reste entre guillemets, traduite à côté.
> - Whisper a entendu tantôt « Jeff », tantôt « Jev », pour un outil qui trie ou note (des prospects, des appels, des hooks). Aucune image ne
>   porte ce nom : l'outil reste non identifié, et chaque fiche l'écrit « l'outil entendu "Jeff" ».
> - « Higgsfield » est écrit « Hicksfield » ou « Higgs Field » par Whisper ; le mot-dièse de la vidéo du 31/10 l'écrit `#higgsfield`.
> - Les écrans montrés sont des maquettes animées aux données fictives (noms, téléphones, montants) : ils illustrent, ils ne prouvent rien.
>   Aucune donnée personnelle n'est recopiée ici.
> - Un chiffre de l'auteur est toujours marqué « annoncé par l'auteur, non vérifié ». Un chiffre lu sur une maquette est marqué « lu sur une
>   maquette, non vérifié ».
> - Les 11 vidéos ont toutes un son parlé (anglais) et une transcription complète, durées de 84 s à 119 s.

---

## 1. « I Built an AI Dropshipping Operating System » (29/09/2026)

Source : « I Built an AI Dropshipping Operating System », @restructureai, https://www.tiktok.com/@restructureai/video/7690784360898874645 · publiée le 29/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:12] L'auteur annonce un « système d'exploitation » de dropshipping (recherche produit, créatifs, publicités, commandes, support, suivi du profit) et donne le plan « gratuit » ; « vous n'êtes jamais écarté de la boucle » : chaque grande décision (lancer un produit, monter une publicité) attend l'accord du propriétaire.
- [00:17]-[00:30] Module 1, « Intelligence » : les agents étudient la boutique « comme un analyste de fonds spéculatif étudie une action » (ce qui se vend, ce que font les concurrents, quelles publicités se paient, quel produit fait perdre de l'argent) ; le suivi porte sur le profit, pas sur le chiffre d'affaires. Images 010 et 022 : un schéma en blocs, « Market Research » (agents Tendance, Concurrent, Demande, PD) et « Marketing » (agents Meta, TikTok, Google, Social), puis un bloc « Intelligence » (agents BA, Attribution, Prévision, Anomalie).
- [00:34]-[00:52] Module 2, « Creative Studio » : un produit gagnant devient accroches, angles publicitaires, scripts UGC et dizaines de variantes, construits sur ce que disent déjà les clients ; l'outil entendu « Jeff » surveille ce qui marche sur le marché ; « rien ne se lance seul » : chaque publicité attend dans une file d'approbation. Image 055 : une fenêtre « APPROVAL QUEUE » avec 26 variations de vidéos, deux lignes en attente et des boutons « Green light » (feu vert) par ligne et pour tout.
- [00:52]-[01:10] Module 3, « Operations » : une commande à 3 h du matin ; à l'ouverture, le paiement est vérifié, la commande envoyée au fournisseur, le numéro de suivi récupéré, le client prévenu par e-mail ; un colis bloqué ou un remboursement est soit déjà traité, soit posé sur le bureau avec une solution prête. Image 070 : le bloc « Operations » (agents Commande, Livraison, Suivi, Retours) et une liste de lignes avec un bouton vert par ligne.
- [01:13]-[01:22] Un « orchestrateur IA », « le directeur des opérations qui n'a jamais besoin d'un jour de congé », relie les 12 modules, garde les agents synchronisés et dépose chaque matin une page unique de pertes et profits (vendu, coût, quoi faire ensuite). Image 080 : le bloc « The Brain · Command Center » (agents Commande, Gestion des tâches, Approbation, Boîte d'alertes), la phrase « Every task starts here. Every morning ends in one P&L brief. » et un tableau de bord circulaire.
Principes et patterns réutilisables :
- Un orchestrateur central, avec un bloc d'approbation et une boîte d'alertes, au-dessus de départements d'agents (images 010, 080).
- Une file d'approbation à feu vert groupé (image 055) : l'humain ne regarde que ce qui doit sortir.
- Mesurer le profit et pas l'activité [00:30].
- Pour un événement hors norme (colis bloqué, remboursement), deux issues seulement : « déjà traité » ou « sur ton bureau avec la solution prête » [01:05]-[01:10].
- Un résumé d'une page chaque matin [01:18]-[01:22].
Erreurs à éviter :
- Dit par l'auteur : rien. La vidéo n'énonce aucune erreur.
- Constaté : les écrans sont des maquettes sans journal d'exécution ; le texte ne dit ni comment les 12 modules échangent, ni ce qui se passe si une étape échoue.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- La file d'approbation à feu vert groupé (image 055) est la carte de lot de l'assistant (lot L16, 032-021, `lib/assistant/cartes.ts`) : l'artisan valide en un geste ce qui sort ; en Studio rien ne part sans ce geste (`lib/plans.ts:11`).
- « Déjà traité, ou sur ton bureau avec la solution prête » est la forme des cartes de Presti : une exception arrive préparée (brouillon, montant calculé par le code), jamais comme une simple alerte.
- La page unique du matin est `presti-briefing-matin` (lot L15, n8n d'Oracle, inactif) ; « le profit, pas l'activité » est l'ordre des détecteurs, classés par argent récupéré (plan du chantier 4, §9).
- Pour l'offre Entreprise : l'orchestrateur au-dessus des départements est le workflow parent par client, qui ne fait que router (p5:156-158), avec un bloc d'approbation et une boîte d'alertes.
Ce qui ne s'applique pas, et pourquoi :
- Le dropshipping et ses fournisseurs : la vidéo ne décrit aucune autre activité.
- Les 12 modules : la vidéo n'en décrit que trois ; les neuf autres ne sont pas montrés.
- Aucun outil de workflow n'est nommé dans l'audio ; les agents sont des noms de rôles sur un schéma.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « un système de 25 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « 12 modules » [01:13] : annoncé par l'auteur, non vérifié.
- « une commande à 3 h du matin » [00:52] : exemple narratif, annoncé par l'auteur, non vérifié.

---

## 2. « I Built 32 Grok Bots That Run Your Entire Sales Department » (21/10/2026)

Source : « I Built 32 Grok Bots That Run Your Entire Sales Department », @restructureai, https://www.tiktok.com/@restructureai/video/7698948033576275220 · publiée le 21/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:15] Quatre équipes de bots : génération de pistes, prospection, appels de vente, opérations commerciales.
- [00:16]-[00:30] Génération de pistes : des bots lisent X, Reddit, des sites d'avis et l'actualité en temps réel pour trouver des gens qui demandent ce que l'entreprise vend, se plaignent d'un concurrent ou viennent de lever des fonds ; l'outil entendu « Jeff » choisit ceux prêts à acheter. Images 010 et 018 : un bloc « Grok Lead Gen (Manager + 7) » avec Scanner X, Scanner Reddit, Veille d'avis, Suivi des financements, Recherche de contact, Notation de piste, Pistes similaires ; à gauche un encart sombre qui liste des dossiers de consignes (/messaging, /voice, /compliance, /reporting).
- [00:30]-[00:39] Prospection : chaque message est écrit à partir des publications récentes de la personne, « pas de copier-coller », et « rien n'est envoyé tant que vous n'approuvez pas ». Image 033 : une fiche de profil fictive avec deux publications et l'icône d'un agent qui la lit.
- [00:39]-[00:50] Appels de vente : quand quelqu'un répond et donne son numéro, un agent vocal ElevenLabs l'appelle « en quelques minutes », répond aux questions et réserve un créneau. Image 044 : un e-mail de réponse, son numéro surligné, et une requête `POST /webhook/gmail-reply` dont la réponse JSON porte `"intent": "interested"` et un numéro de téléphone.
- [00:51]-[01:21] Opérations commerciales : CRM, relances, suivi des affaires, page d'une feuille chaque matin. Au sommet, un « chef des ventes », bot qui supervise et confie les tâches aux managers d'équipe ; l'auteur peut discuter avec lui, un manager ou n'importe quel bot. Les bots se passent des notes (le chercheur de pistes au rédacteur, l'appelant aux opérations) : « un système, un vrai organigramme ». Images 052 et 066 : un tableau « Deals · Sales pipeline » (colonnes Nouveau, Contacté, Démo réservée, Proposition) puis un organigramme (chef, quatre managers) avec un panneau de discussion « CHATS » (Head of Sales, Outreach Lead, Reply Sorter, Lead Scorer, Caller) et la question « Who replied today? ».
Principes et patterns réutilisables :
- Un organigramme explicite : un chef, des managers d'équipe, des agents ; on peut parler à chaque niveau (images 066, 010).
- Les agents s'échangent des notes structurées d'un département à l'autre [01:07]-[01:13].
- Un agent trie les réponses entrantes et un appel de webhook porte l'intention détectée (image 044).
- Un message « sur la personne » à partir de ses publications [00:31] ; approbation humaine avant tout envoi [00:36].
- Un dossier de consignes par domaine (messagerie, voix, conformité, reporting) lisible à côté du schéma (images 010, 018).
Erreurs à éviter :
- Dit par l'auteur : le copier-coller de messages [00:31]-[00:36].
- Constaté : l'agent vocal appelle sur la seule foi d'un numéro lâché dans une réponse [00:40]-[00:45] ; la vidéo ne dit rien du consentement, de l'opposition à être démarché ni d'un plafond d'envoi.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- L'organigramme explicite et les notes structurées d'un département à l'autre sont le contrat d'entrée et de sortie de chaque enfant n8n (p5:159-162). L'artisan parle à l'assistant de gestion, jamais à Hermes, qui reste derrière (`.claude/rules/architecture-outils.md`).
- Le trieur des réponses entrantes, intention dans le webhook (image 044) : Presti le fait déjà à l'arrivée d'une demande ; pour l'Entreprise, c'est le détecteur 11, « réponse à une relance d'impayé » (lot L12, 032-019).
- « Rien n'est envoyé tant que vous n'approuvez pas » [00:36] est Studio ; Signature n'envoie seul que les types prévus (`lib/plans.ts:90`).
Ce qui ne s'applique pas, et pourquoi :
- La lecture de X, de Reddit et d'avis publics pour repérer des personnes : la vidéo ne dit pas d'où viennent les droits de collecte ni la base légale.
- Les appels sortants par agent vocal : la vidéo ne montre aucune condition de déclenchement hors « la personne a répondu et donné son numéro ».
- Le modèle de langage de la vidéo (Grok) et ses outils sont des noms sur un schéma ; aucun détail de mise en œuvre n'est donné.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 32 bots », « quatre équipes » [00:00]-[00:09] : annoncé par l'auteur, non vérifié.
- « un appel en quelques minutes » [00:43] : annoncé par l'auteur, non vérifié.
- « Manager + 7 » pour l'équipe de génération de pistes (image 010) : lu sur une maquette, non vérifié.

---

## 3. « OpenAI Dots Runs an Entire Content Team for Your Business » (22/10/2026)

Source : « OpenAI Dots Runs an Entire Content Team for Your Business », @restructureai, https://www.tiktok.com/@restructureai/video/7699324388650323201 · publiée le 22/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:16] L'auteur annonce « plus de 200 heures » de construction d'une équipe de contenu avec « OpenAI Dots » : six départements, trente agents, qui gèrent recherche, stratégie, vidéo, commentaires, publicités et suivi, mais « rien ne sort tant que vous n'approuvez pas ». Image 008 : le logo « dots » et six mascottes reliées à un agent central, chacune entourée de logos d'outils.
- [00:16]-[00:30] « Voix du client » : lit les appels de vente, les avis Google et les messages privés, puis les fils Reddit et les commentaires YouTube du secteur ; il cherche les questions posées juste avant l'achat et les raisons presque dissuasives. Image 018 : le schéma, avec les blocs « Takes Your Brief » et « Routes the Work » (« Every task starts here »), « CUSTOMER VOICE » et « REVENUE TRACKER ».
- [00:30]-[00:50] « Le créateur » : écrit les scripts, dessine les graphismes, monte les vidéos « et tout sonne comme vous » ; une idée devient un short, un carrousel et un post LinkedIn, un par plateforme ; l'humain relit un lot et approuve. Image 038 : une fenêtre à trois agents (Creator, Voice, Publisher) et un échange fictif : « Top 3 ideas sent », « Scripts and captions are mine, in [le nom du patron] voice », « Sizes and platforms are mine ».
- [00:50]-[01:11] « Le suivi des revenus » : après l'approbation, programme et publie à l'heure optimale par canal, surveille les commentaires et signale ceux qui veulent acheter ; à 48 heures, mesure ce qui marche réellement (clics et pistes, pas les vues) pour ne financer en publicité que les contenus qui marchent déjà. Image 072 : un « Content scorecard » (lignes Short, Carousel, LinkedIn post, chiffres de vues, clics, pistes), une file de publication « Buffer », un tableau « 48 hour check ».
- [01:11]-[01:26] Un « directeur de contenu » orchestre ; chaque lundi matin un rapport arrive dans la boîte mail (ce qui a rapporté, quoi produire cette semaine) ; les sujets gagnants retournent à « Voix du client » : la boucle repart. « La plupart des équipes optimisent les vues ; celle-ci optimise les clients. » Image 085 : le schéma d'ensemble « The AI Content Team for Your Business ».
Principes et patterns réutilisables :
- Une boucle fermée : l'écoute du client nourrit la création, la mesure à 48 h décide de ce qu'on amplifie, les gagnants reviennent à l'écoute [01:11]-[01:20].
- Mesurer des pistes et des clics, pas des vues [01:00]-[01:06].
- Un contenu source décliné par plateforme [00:41]-[00:47].
- Un rapport hebdomadaire unique, le lundi [01:11].
- Approbation humaine par lot avant publication [00:47]-[00:50].
Erreurs à éviter :
- Dit par l'auteur : optimiser pour les vues plutôt que pour les clients [01:20]-[01:24] ; mettre de l'argent publicitaire sur des contenus non éprouvés [01:06].
- Constaté : « tout sonne comme vous » [00:36] sans que la vidéo dise comment la voix est apprise ni contrôlée.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- La boucle fermée (écoute → création → mesure à 48 h → on n'amplifie que ce qui marche) est le modèle du chantier 5 pour Presti lui-même : 2 ou 3 premiers contenus validés par Benj, puis publication automatique sous QA (`.claude/rules/autonomie-abonnements.md`), mesurée en demandes reçues, pas en vues.
- « Tout sonne comme vous » [00:36] : chez Presti, le ton de l'artisan est appris de ses vrais messages et prouvé par un test (`scripts/persona-e2e.mjs`), jamais affirmé.
- Pour le client Entreprise : un rapport hebdomadaire unique le lundi (p5:427).
Ce qui ne s'applique pas, et pourquoi :
- « OpenAI Dots » est présenté comme la plateforme d'exécution ; aucune autre information sur ses capacités n'est donnée.
- Les sources (appels de vente, messages privés, avis) sont décrites comme lues sans dire sous quelles conditions.
- Les contenus visés sont des publications de réseaux sociaux et de LinkedIn.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « plus de 200 heures » de construction [00:00] : annoncé par l'auteur, non vérifié.
- « 6 départements, 30 agents » [00:05] : annoncé par l'auteur, non vérifié.
- « 48 heures » avant la mesure [01:00] : annoncé par l'auteur, non vérifié.
- Chiffres de vues, clics et pistes du « Content scorecard » (image 072) : lus sur une maquette, non vérifiés.

---

## 4. « I Built a AI Social Media Team for Real Estate » (23/10/2026)

Source : « I Built a AI Social Media Team for Real Estate », @restructureai, https://www.tiktok.com/@restructureai/video/7699692280952720692 · publiée le 23/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:19] « Une équipe de 41 agents IA » pour toute la présence sociale d'un agent immobilier : huit départements, un agent. Elle gère étude de marché, vidéos d'annonce, publication, recherche d'acheteurs, prise de rendez-vous de visite, relances et avis ; « aucune vidéo ne passe en ligne sans votre accord ». Image 008 : le titre « 41-Agent AI Social Media Team for Real Estate » avec les logos de Claude, d'ElevenLabs et de deux autres outils, au-dessus d'un grand schéma.
- [00:22]-[00:35] Département « moteur de contenu » : l'agent prend quelques photos de la maison au téléphone ; Claude écrit le script, Higgsfield transforme les photos en vidéo de visite, ElevenLabs fait la voix off ; après approbation, publication sur Instagram, TikTok, Facebook et YouTube. Image 025 : l'onglet « Content Engine », 12 photos, un téléphone en train de photographier, une fiche d'annonce et un terminal.
- [00:35]-[00:50] Département « intelligence des pistes » : une fois la vidéo en ligne, lecture de chaque commentaire et message privé, et des publications Reddit publiques de personnes qui cherchent à acheter ; l'outil entendu « Jeff » sépare les vrais acheteurs des curieux ; les vrais reçoivent une réponse avec l'annonce et un lien pour laisser leur numéro. Image 040 : l'onglet « Lead Intelligence », deux colonnes « Real buyers » et « Browsers ».
- [00:50]-[01:04] Département « réservation et qualification » : quand l'acheteur laisse son numéro, un agent vocal ElevenLabs le rappelle « dans les 60 secondes », demande budget, délai, préapprobation de prêt, puis réserve la visite dans l'agenda ; « les acheteurs sérieux viennent directement à vous ». Image 055 : l'onglet « Booking », un téléphone « AI voice agent » avec compteur de rappel et les champs Budget, Pre-approved, Timeline, au-dessus d'un agenda de semaine.
- [01:05]-[01:22] « Le directeur de croissance » : un directeur IA, huit chefs de département, 32 spécialistes, « le tout sous Claude Code » ; il relie quelle vidéo a amené quel acheteur et quelle visite a produit une offre ; chaque matin, une page : « pas plus de vues, plus de visites ». Images 070 et 080 : un bloc « Growth Director / Claude Code », un terminal `claude --team reale`, un tableau « This week » (vidéos, acheteur, visite, offre) et l'écran d'un téléphone « Good morning » avec vues, acheteurs, visites, offres et une ligne « Waiting for you · 2 videos · Approve ».
Principes et patterns réutilisables :
- Une chaîne contenu → écoute des réactions → rappel immédiat → rendez-vous, avec un indicateur final de visites et d'offres plutôt que de vues [01:10]-[01:22].
- Une qualification par un petit questionnaire (budget, délai, préapprobation) avant la réservation [00:57]-[01:01].
- Un trieur qui sépare acheteurs et curieux avant toute réponse [00:44]-[00:47].
- L'attribution : relier la vidéo, l'acheteur, la visite et l'offre [01:13]-[01:17].
- La page du matin, avec une ligne « en attente de vous » et un bouton d'approbation (image 080).
Erreurs à éviter :
- Dit par l'auteur : mesurer des vues plutôt que des visites [01:20].
- Constaté : un rappel téléphonique dans les 60 secondes est présenté sans condition de consentement ; les valeurs du tableau de bord sont à zéro dans l'image 070 puis remplies dans l'image 080, sans journal.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- La chaîne contenu → réactions → rappel → rendez-vous, mesurée en rendez-vous et non en vues, est la promesse de Presti côté artisan : demande → réponse → devis → signé. Pour un client Entreprise, le KPI à suivre est « demande → devis accepté » (délai et taux), pas le trafic.
- La qualification par quelques questions avant le rendez-vous [00:57]-[01:01] est ce que l'assistant demande avant un devis (photo, dimensions), sans jamais inventer un créneau (règle anti-fabrication de `CLAUDE.md`).
- L'attribution vidéo → acheteur → offre a son équivalent dans `leads.origine` (`0177_canaux_reseaux.sql`) et l'onglet Visiteurs : relier une campagne à des devis signés.
- La ligne « en attente de vous · Approuver » de la page du matin est la section « À valider, l'argent d'abord » de l'accueil v2 (plan du chantier 4, §7, lot L5).
Ce qui ne s'applique pas, et pourquoi :
- Les visites immobilières, le prêt préapprouvé, les annonces : propres à l'immobilier.
- La création de vidéos à partir de photos par Higgsfield et la voix off ElevenLabs : outils nommés, sans détail de mise en œuvre.
- Les données de l'écran téléphone (noms, vues, visites) sont fictives.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 41 agents », « huit départements » [00:00]-[00:04] : annoncé par l'auteur, non vérifié.
- « un directeur, huit chefs de département, 32 spécialistes » [01:08]-[01:10] : annoncé par l'auteur, non vérifié.
- « rappel dans les 60 secondes » [00:53] : annoncé par l'auteur, non vérifié.
- Vues, acheteurs, visites, offres de l'image 080 : lus sur une maquette, non vérifiés.

---

## 5. « How an AI Marketing System Turns $5K in Ads Into $45K » (26/10/2026)

Source : « How an AI Marketing System Turns $5K in Ads Into $45K », @restructureai, https://www.tiktok.com/@restructureai/video/7700803999376755989 · publiée le 26/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:14] Un concessionnaire automobile qui transforme 5 000 dollars de publicité en 45 000 dollars de profit grâce à un système : publicités, réponses, relances, essais routiers, avis ; « aucune publicité ne passe tant que vous n'avez pas validé ». Image 008 : un schéma en étoile « 41 agents · 1 326 tâches aujourd'hui », autour de cinq pôles (Ads, Replies, Reviews, Follow-ups, Test drives).
- [00:14]-[00:45] Module 1, ciblage : un budget de 5 000 dollars réparti entre Facebook, Instagram et Google ; Claude écrit les publicités, Higgsfield transforme les photos du parc en courtes vidéos, l'humain approuve les bonnes ; elles ne s'affichent qu'aux gens proches qui cherchent un SUV ; le système coupe celles qui ne marchent pas et déplace l'argent vers celles qui marchent ; « quelques semaines plus tard, environ 125 personnes laissent leur numéro, soit environ 40 dollars la piste ». Images 020 et 045 : un « Ads Manager » avec curseur de budget à 5 000 par mois, puis une bulle « $40 / lead ».
- [00:45]-[01:12] Module 2, « vitesse de réponse » : « les pistes arrivent après le départ de l'équipe et personne ne répond » ; à 21 h 47, l'IA répond en moins d'une minute, envoie les photos de la voiture exacte et réserve un essai dans l'agenda ; un agent vocal ElevenLabs décroche s'il y a appel ; à l'arrivée de l'équipe, le rendez-vous est déjà là, avec des notes. Image 062 : une conversation « Replied in 38s » sur la disponibilité d'un SUV, avec photo et prix.
- [01:12]-[01:28] Module 3, relances : un texto à J+2, une vidéo de la voiture à J+5 ; l'outil entendu « Jeff » note qui est encore intéressé pour que les vendeurs n'appellent que les chauds ; les autres reçoivent « un petit rappel ». Image 080 : une carte « Follow-up · DAY 5 · VIDEO EMAIL » à l'état « Quiet ».
- [01:28]-[01:49] Claude Code suit chaque piste du premier clic à la vente signée ; chaque matin, le chef des ventes reçoit une page (qui vient, qui est proche d'acheter, quelle publicité a vendu) ; fin : « commentez "dealer" et je vous envoie le plan ». Image 100 : un message de canal « # sales », « Morning brief », trois rubriques (qui vient, proche d'acheter, publicités qui ont vendu).
Principes et patterns réutilisables :
- Déplacer le budget des publicités qui ne marchent pas vers celles qui marchent, automatiquement [00:34]-[00:39].
- « Vitesse de réponse » : répondre en moins d'une minute hors horaires, avec la photo exacte et un créneau [00:45]-[01:04].
- Relance en séquence datée (J+2 texto, J+5 vidéo) et notation de l'intérêt avant d'envoyer un humain [01:13]-[01:28].
- Suivi d'une piste du premier clic à la vente [01:28]-[01:33].
- Un mot-clé en commentaire pour déclencher l'envoi d'un document [01:49] (appel à l'action de la vidéo).
Erreurs à éviter :
- Dit par l'auteur : « c'est là que la plupart des concessionnaires perdent de l'argent » : les pistes qui arrivent après la fermeture et restent sans réponse [00:45]-[00:49] ; la vente qui « meurt » quand la personne se tait [01:09]-[01:13].
- Constaté : le passage de 5 000 à 45 000 n'est pas décomposé : ni marge, ni nombre de ventes, ni durée.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- La « vitesse de réponse » hors horaires est le cœur de Presti : la réponse est préparée en Studio et part seule en Signature. Sur la landing, une durée (« moins d'une minute ») ne se dit qu'avec une mesure réelle (test 16 du plan du chantier 2).
- Les relances datées (J+2, J+5) et la note d'intérêt avant d'envoyer un humain sont les relances de Presti (J+2, J+5, J+10, `lib/plans.ts:249`) sous le registre commun : jamais deux relances en 3 jours (`lib/relancesRegistre.ts:18`). Une note d'intérêt chez un client Entreprise se calcule par le code, pas par le modèle (p5:216-218).
- Le suivi du premier clic à la vente est l'entonnoir lien → demande → conversation → devis → facture, déjà mesuré par Presti.
Ce qui ne s'applique pas, et pourquoi :
- Le budget publicitaire de 5 000 dollars et le ciblage par proximité : propres à un concessionnaire ; la vidéo ne dit rien d'un autre type d'entreprise.
- L'agent vocal et le texto sortant : la vidéo ne dit rien du consentement.
- L'ensemble est un récit à valeur d'exemple ; aucun client réel n'est nommé.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 5 000 dollars de publicité transformés en 45 000 dollars de profit » [00:00] : annoncé par l'auteur, non vérifié.
- « environ 125 personnes » laissent leur numéro, « environ 40 dollars la piste » [00:39] : annoncé par l'auteur, non vérifié (125 × 40 = 5 000, soit la totalité du budget annoncé : un calcul, pas une preuve).
- « 21 h 47 », « moins d'une minute » [00:49]-[00:55] : annoncé par l'auteur, non vérifié.
- « 41 agents · 1 326 tâches aujourd'hui » (image 008) et « Replied in 38s » (image 062) : lus sur une maquette, non vérifiés.

---

## 6. « AI Marketing System Vs. AI Sales System » (27/10/2026)

Source : « AI Marketing System Vs. AI Sales System », @restructureai, https://www.tiktok.com/@restructureai/video/7701176337448357172 · publiée le 27/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:08] Une comparaison : choisir le mauvais système « peut faire perdre des milliers de dollars ». Image 010 : le titre « AI Marketing System » avec les logos de Claude et d'ElevenLabs au-dessus du grand schéma.
- [00:08]-[00:40] Le problème « marketing » : on paie de la publicité chaque mois et le téléphone reste muet ; on ne sait pas quelles publicités marchent ; des gens proches cherchent exactement ce qu'on vend et trouvent un concurrent. Le système : Claude écrit publicités et publications à partir de ce que les gens proches cherchent réellement, Higgsfield transforme les photos en vidéos, le budget suit ce qui amène des clients. Image 028 : un terminal « Claude Code · running » avec `read_trends(google_maps)`, « 38 searches · "SUV near me" 1.2K » et `write_ads(meta, google)`.
- [00:40]-[01:12] Le problème « vente » : des gens appellent mais personne n'achète ; quelqu'un pose une question à 21 h et on répond le lendemain, il a acheté ailleurs ; « vous avez payé pour obtenir ce client, un autre a fait la vente ». Le système : réponse en moins d'une minute, jour et nuit ; un agent vocal ElevenLabs décroche, répond, réserve et continue de relancer ; l'outil entendu « Jeff » désigne qui est prêt à acheter. Images 045 et 062 : une carte « Incoming calls · 8 today » avec « 8 unanswered », puis une conversation « Replied in 38s ».
- [01:13]-[01:30] « C'est là que la plupart des propriétaires se trompent » : avec un problème de vente, acheter plus de publicité ne fait que payer plus de pistes (« vous perdrez ») ; avec un problème de marketing, la qualité des relances ne sert à rien faute de personne à relancer ; d'abord trouver où l'on perd de l'argent, puis corriger cela. Images 075 et 088 : un entonnoir « Leads / month » (124 pistes pour un budget de 5 000 dollars) et « Closed / month » (6 conclus), la seconde image surlignant la ligne du budget.
Principes et patterns réutilisables :
- Diagnostiquer avant d'agir : marché (pas assez de demandes qualifiées) ou vente (demandes perdues) [01:13]-[01:29].
- Un entonnoir chiffré à deux étages, demandes puis conclus, pour dire où l'on perd (images 075, 088).
- Un budget qui suit ce qui amène des clients [00:32].
- Une réponse en moins d'une minute à toute heure, avec relances continues [00:59]-[01:05].
Erreurs à éviter :
- Dit par l'auteur : acheter plus de publicité quand le problème est la vente [01:15]-[01:20] ; soigner le suivi quand le problème est le manque de pistes [01:21]-[01:24] ; répondre le lendemain [00:47]-[00:54].
- Constaté : la vidéo ne donne aucun seuil pour décider quel problème est le sien.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- « Diagnostiquer avant d'agir » est la première étape de la découverte d'un client Entreprise : mesurer où il perd (demandes sans réponse, ou demandes non converties) avant de proposer un seul agent ; l'entonnoir à deux étages (images 075, 088) ouvre la fiche de découverte.
- Appliqué à la prospection de Presti : 176 e-mails sans aucune réponse positive (`SaaS/wiki/hot.md`) est un problème de message et de cible, pas de relance. Relancer davantage n'y changera rien : il faut un nouvel objet et un texte plus court (60 à 90 mots).
Ce qui ne s'applique pas, et pourquoi :
- Les exemples sont des entreprises à clientèle locale (recherches « près de moi », SUV) ; aucun autre cas.
- Aucune mesure ni source : c'est un cadrage en deux cas, pas une étude.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « des milliers de dollars » de pertes possibles [00:03] : annoncé par l'auteur, non vérifié.
- « 21 h », « moins d'une minute » [00:47]-[00:59] : annoncé par l'auteur, non vérifié.
- 124 pistes par mois, 5 000 dollars de budget, 6 conclus par mois (images 075, 088) ; « 38 searches », « 1.2K » (image 028) ; « 8 unanswered » (image 045) : lus sur des maquettes, non vérifiés.

---

## 7. « I Built an AI Deal Sourcing System for VC Firms » (28/10/2026)

Source : « I Built an AI Deal Sourcing System for VC Firms », @restructureai, https://www.tiktok.com/@restructureai/video/7701546969398873352 · publiée le 28/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:19] « 33 agents IA » pour toute l'équipe de repérage d'un fonds de capital-risque, huit départements : trouver les jeunes entreprises tôt, retenir celles qui collent au fonds, obtenir une introduction chaleureuse auprès du fondateur. Image 006 : un schéma en étoile « 33 agents · 1 304 tâches aujourd'hui » avec quatre pôles (Radar, Scoring, Founders, Intros).
- [00:19]-[00:37] Module 1, « radar du marché » : chaque jour, lecture des lancements sur Product Hunt et GitHub, des pics d'embauche, des hausses de trafic et des publications de fondateurs ; Claude signale les sociétés en croissance soudaine, souvent avant l'annonce d'un tour. Image 022 : le bloc « Market Radar » (Launch Watcher, Hiring Tracker, Founder Watcher, Traffic & App Tracker, Funding News Reader).
- [00:37]-[01:03] Module 2, notation : l'outil entendu « Jeff » compare chaque société à la thèse du fonds (secteurs, stade, taille de ticket), signale ce qui concurrence le portefeuille, classe qui contacter cette semaine. Image 042 : le bloc « Deal Scoring » (Thesis Matcher, Deal Scorer, Conflict Checker, Priority Ranker), au-dessus d'un bloc « Inbound Deal Flow ».
- [01:03]-[01:21] Module 3, « moteur d'introduction chaleureuse » : le système cartographie le réseau du fonds (fondateurs, investisseurs du fonds, co-investisseurs), trouve qui connaît déjà le fondateur et rédige la demande d'introduction ; « l'associé approuve, puis elle part ». Image 066 : une carte « Fund network » (1 240 contacts, trois catégories).
- [01:21]-[01:34] Claude Code orchestre ; chaque matin, une page : sociétés à regarder, introductions en attente d'approbation, rendez-vous de la semaine. Image 090 : un message « # deal-flow » avec ces trois rubriques et un bouton « Approve ».
Principes et patterns réutilisables :
- Un entonnoir de tri : des milliers de sociétés surveillées, dix retenues pour la semaine [00:32]-[00:44].
- Un « contrôleur de conflit » qui écarte ce qui concurrence un existant avant d'agir [00:47] (image 042).
- Le classement selon des critères écrits du client (sa « thèse ») [00:41]-[00:47].
- Une demande d'introduction rédigée par le système et approuvée par un humain avant envoi [01:09]-[01:15].
- Les signaux faibles surveillés par catégories nommées (image 022).
Erreurs à éviter :
- Dit par l'auteur : passer la semaine sur des sociétés peu susceptibles de réussir [00:51]-[00:56].
- Constaté : la vidéo ne dit pas comment le réseau du fonds est constitué ni avec quel consentement.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- L'entonnoir de tri (des milliers surveillés, dix retenus pour la semaine) et le « contrôleur de conflit » sont la chasse aux prospects de Presti (chantier 3) : un tri par critères écrits (l'ICP du réseau neuronal) et l'exclusion de ce qui est déjà en cours (un message par artisan, puis 5 jours ; mémoire `un-message-par-artisan-avant-5-jours`).
- La demande rédigée par le système est le premier message de prospection (présenter Presti, démo de 10 min, essai gratuit). Il part seul, dans les plafonds et les garde-fous de l'ADR-005 (300 par jour, opposition, exclusion, journal), sans approbation de Benj (décision du 01/11).
Ce qui ne s'applique pas, et pourquoi :
- Le capital-risque, les thèses, les tickets, les tours de financement : propres à ce métier.
- Les sources (Product Hunt, GitHub) sont des sources publiques d'un autre monde ; aucune équivalence n'est donnée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 33 agents », « huit départements » [00:00]-[00:06] : annoncé par l'auteur, non vérifié.
- « des milliers de sociétés » surveillées, « les 10 » retenues [00:32]-[00:41] : annoncé par l'auteur, non vérifié.
- « 33 agents · 1 304 tâches aujourd'hui » (image 006), « 1 240 contacts » (image 066) : lus sur des maquettes, non vérifiés.

---

## 8. « I Built a Private AI Operating System to Run Your Entire Business » (29/10/2026)

Source : « I Built a Private AI Operating System to Run Your Entire Business », @restructureai, https://www.tiktok.com/@restructureai/video/7701924045775801601 · publiée le 29/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:19] « 26 agents IA privés » qui font tourner l'entreprise « sans que vos données ne quittent votre bureau » : accueil, devis, paiements, fichiers, réunions, tâches, embauches ; « rien ne part vers un client sans votre accord ». Image 008 : un agent « Hermes » au centre, quatre entrées (Messages, E-mail, Appels, Réservations), un nuage barré d'une croix rouge et la ligne `egress → cloud: 0 bytes`.
- [00:19]-[00:41] Module 1, accueil : une IA privée sur la machine du propriétaire répond en quelques secondes avec ses services, ses prix, ses réalisations ; elle vérifie si la personne convient et réserve dans l'agenda ; un appel à minuit devient un message vocal transcrit en texte, et la réponse part avant que la personne ait raccroché. Image 028 : « 01 · FRONT DESK », une chaîne Client → Pare-feu → Chatwoot (messagerie) et une boîte de réception.
- [00:41]-[00:59] Module 2, devis et propositions : la réunion devient des notes automatiques ; l'IA rédige la proposition en quelques minutes à partir des prix du propriétaire et des propositions déjà gagnées ; il vérifie, elle part le jour même. Image 050 : « 02 · QUOTES & PROPOSALS », une visioconférence Jitsi avec sous-titres en direct par Whisper « sur votre serveur » et un encart « Meeting notes — written for you ».
- [00:59]-[01:21] Module 3, paiements : la facture est prête quand le travail est fini, le propriétaire approuve, elle part ; si le client oublie, un rappel poli part à l'heure ; chaque matin, le flux bancaire est contrôlé pour savoir qui a payé ; un retard important prévient le propriétaire en premier. Image 068 : « 03 · PAYMENTS », une chaîne Vikunja (tâches) → n8n → Invoice Ninja, un brouillon de facture et un workflow n8n « invoice-when-job-done » : tâche terminée → création de la facture → « Ask you » → envoi.
- [01:21]-[01:39] Au centre, « Hermes, un agent IA open source qui vit sur votre machine » fait passer chaque client du premier message au paiement final ; chaque matin une page ; « vos données ne quittent jamais votre bureau ». Images 085 et 095 : Hermes entouré de Qwen, Llama, Ollama (modèles), n8n, Langfuse (suivi), Qdrant et PostgreSQL (données), puis une carte « Since Hermes » : nouveaux clients par mois, délai demande → signé.
Principes et patterns réutilisables :
- Une architecture « privée » : modèles locaux, un seul agent central, aucun envoi vers un nuage, la preuve affichée par un compteur (image 008).
- Un enchaînement front desk → devis → facture → rappels → contrôle bancaire, en trois modules (images 028, 050, 068).
- Un workflow n8n dont une étape s'appelle « Ask you » : l'humain approuve avant l'envoi (image 068).
- Un journal de suivi des agents (Langfuse) et une base de connaissances vectorielle (Qdrant) à côté de la base relationnelle (image 085).
- Le contrôle quotidien des paiements reçus [01:12]-[01:16] ; le retard important remonté d'abord au propriétaire [01:16]-[01:20].
Erreurs à éviter :
- Dit par l'auteur : perdre un prospect sur messagerie vocale [00:37]-[00:41] ; laisser un concurrent finir sa proposition avant soi [00:54]-[00:59] ; client qui oublie de payer [01:08].
- Constaté : un compteur « 0 octet vers le nuage » est une illustration ; la vidéo ne précise ni le matériel, ni la taille des modèles, ni la qualité des réponses locales.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- C'est la vidéo la plus proche de l'architecture de Presti : Hermes au centre, n8n pour moteur, et une étape « Ask you » avant l'envoi (image 068), c'est-à-dire Studio. Le workflow « invoice-when-job-done » est le lot L18 « après-chantier » : chantier terminé → facture préparée → l'artisan valide → envoi.
- Le contrôle quotidien des paiements, avec le retard remonté d'abord au patron, correspond aux relances d'impayés de Presti (sur option, Signature) et au détecteur « facture impayée » (n8n) ; Presti n'a aucun accès bancaire.
- Le journal de suivi des agents (Langfuse) correspond, chez Presti, à `assistant_journal` et `passages_detecteurs` (0185, préparée). La promesse « vos données restent chez vous » se lit chez Presti comme : hébergement à Paris (Oracle eu-paris-1) et aucune donnée de client envoyée à un modèle gratuit en ligne (`.claude/rules/securite.md`). Différence : chez Presti, Hermes n'est jamais montré au client.
Ce qui ne s'applique pas, et pourquoi :
- « Zéro donnée hors du bureau » suppose du matériel local de l'entreprise ; la vidéo ne dit rien d'un hébergement partagé.
- Les outils nommés (Chatwoot, Jitsi, Vikunja, Invoice Ninja) sont des logiciels précis ; aucune raison de ce choix n'est donnée.
- Le contrôle du flux bancaire : la vidéo ne dit pas comment l'accès est obtenu.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 26 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « le jour même » pour la proposition, « en quelques minutes » [00:48]-[00:59] : annoncé par l'auteur, non vérifié.
- `egress → cloud: 0 bytes` (image 008) ; « 14 nouveaux clients par mois », « demande → signé : 4 jours » (image 095) : lus sur des maquettes, non vérifiés.

---

## 9. « How an AI Marketing & Sales System Makes $10K/Month for Urgent Services » (30/10/2026)

Source : « How an AI Marketing & Sales System Makes $10K/Month for Urgent Services », @restructureai, https://www.tiktok.com/@restructureai/video/7702288090131418374 · publiée le 30/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qui suit est la seule des 11 vidéos dont l'audio nomme n8n [01:29].
Ce qu'elle montre :
- [00:00]-[00:24] Les entreprises locales de dépannage urgent « peuvent faire 10 000 dollars de plus par mois » avec un système de marketing et de vente : de la recherche de clients à la prise de chaque appel et à la conclusion du chantier ; « l'argent va à celui qui arrive le premier ». Image 010 : le titre de la vidéo avec les logos de Claude, d'ElevenLabs, d'un outil de vidéo et de Google Ads.
- [00:24]-[00:48] Trouver des clients : le système rédige les publicités Google et publie chaque jour sur la fiche Google de l'entreprise ; Higgsfield transforme les photos de chantier en courtes vidéos ; l'outil entendu « Jev » vérifie quelles publicités amènent des chantiers et déplace le budget automatiquement ; objectif : être en tête pour « plombier urgence près de moi ». Image 030 : une carte « Claude · ads & posts · Every day » avec une annonce Google Search (« Emergency Plumber Near You · Here in 30 Min ») et un post de fiche d'entreprise.
- [00:49]-[01:09] Prendre chaque appel : un agent vocal ElevenLabs décroche à la première sonnerie, 24 h sur 24 ; en quelques secondes, l'outil entendu « Jev » classe l'appel (vraie urgence, peut attendre, curieux) ; si le client envoie une photo, le système la lit et connaît le problème avant le départ du technicien. Images 052 et 072 : « Module 2 · Catching every call » et une scène « No answer » (appel sans réponse, « to your competitor »).
- [01:09]-[01:33] Conclure : le devis est construit « avec vos prix » en moins d'une minute ; le technicien libre le plus proche est réservé ; le client reçoit un texto avec son nom et l'heure d'arrivée ; Stripe prend l'acompte pendant l'appel. Claude orchestre tout « avec n8n qui fait passer chaque chantier d'une étape à la suivante ». Image 092 : un schéma « Find / Catch / Follow-up / Close » et une carte « n8n · job #4821 · Claude running » avec une chaîne de sept étapes (appel reçu, tri, devis, réservation du technicien, envoi, facture, avis ; libellés lus à 720 px, lecture partielle).
- [01:33]-[01:48] Le travail fini, le système envoie la facture et demande l'avis ; chaque matin, une page : appels, chantiers, argent encaissé. Image 105 : une vue de ville avec des lignes reliant un point central à des maisons, « every emergency ».
Principes et patterns réutilisables :
- Un enchaînement en quatre temps : trouver, prendre l'appel, conclure, relancer ; n8n comme moteur qui avance un chantier d'une étape à l'autre [01:29]-[01:33] (image 092).
- Un tri d'appel en trois classes (urgence, peut attendre, curieux) [00:57]-[01:01].
- Un devis sur les prix du client en moins d'une minute [01:14]-[01:17] et un acompte pris au moment de l'appel [01:21]-[01:24].
- Une photo envoyée par le client, lue avant l'intervention [01:01]-[01:05].
- Après le chantier : facture puis demande d'avis [01:33]-[01:36].
Erreurs à éviter :
- Dit par l'auteur : laisser un client à un concurrent faute de réponse [01:05]-[01:09].
- Constaté : un devis et un acompte construits sans validation humaine apparente [01:14]-[01:24], alors que la vidéo dit « rien ne part sans accord » dans d'autres (par exemple n° 8) ; ici la question n'est pas abordée.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- C'est le métier des artisans de Presti, et la seule vidéo qui nomme n8n [01:29]. La chaîne trouver → prendre l'appel → conclure → relancer, avec n8n qui fait avancer un chantier d'une étape à l'autre, est exactement la règle n8n-first (ADR-008).
- Le tri en trois classes (urgence, peut attendre, curieux) est l'escalade et l'intention de Presti (`lib/pilote/regles.ts:191`, la perte d'eau classée urgente). La photo lue avant l'intervention est la demande avec photo sur la page de l'artisan (`/p/[slug]`).
- « Le devis sur vos prix » est Presti, avec les prix sourcés et sinon marqués « estimé ». Exclus : l'acompte pris pendant l'appel et le devis envoyé sans validation. Même en Signature, jamais un prix estimé ni un paiement sans l'artisan (`lib/plans.ts:290`).
- Après le chantier, la facture puis la demande d'avis : la facture va au lot L18 ; la demande d'avis serait une capacité nouvelle, à proposer à Benj (dans n8n).
Ce qui ne s'applique pas, et pourquoi :
- Le dépannage urgent (plomberie, « près de moi ») : propre à des métiers où la vitesse décide.
- L'agent vocal à la première sonnerie : demande une ligne téléphonique et des règles que la vidéo ne décrit pas.
- Aucune valeur de prix, de délai ou d'acompte n'est donnée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 10 000 dollars de plus par mois » [00:03] : annoncé par l'auteur, non vérifié.
- « à la première sonnerie, 24 h sur 24 » [00:53] : annoncé par l'auteur, non vérifié.
- « un devis en moins d'une minute » [01:14] : annoncé par l'auteur, non vérifié.
- « job #4821 » (image 092) : lu sur une maquette, non vérifié.

---

## 10. « This AI Social Media Team Replaces Your $25K Agency » (31/10/2026)

Source : « This AI Social Media Team Replaces Your $25K Agency », @restructureai, https://www.tiktok.com/@restructureai/video/7702667600089632007 · publiée le 31/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:35] « Vous pourriez perdre 25 000 dollars par an avec une agence de réseaux sociaux » : huit départements, 41 agents, qui font ce que fait une agence (contenu, publication, publicités, commentaires, messages privés) mais pour « amener de vrais clients, pas courir après les vues » ; « aucune publication ne passe sans votre accord ». Image 010 : un grand schéma à grille avec un bloc « Head of Social » et un terminal de statut du jour (vidéos, réponses aux commentaires, appels réservés ; lecture partielle).
- [00:35]-[00:58] Module 1, « Content Studio » : chaque matin l'outil entendu « Jeff » parcourt des milliers de vidéos du secteur et en extrait les accroches qui marchent ; Claude en fait des scripts, Higgsfield transforme les photos en vidéos, ElevenLabs fait la voix ; « chaque lundi, 10 minutes pour approuver une semaine de contenu ; pas de tournage, pas de monteur, pas d'agence ». Image 038 : le bloc « Content Studio » (Hook Finder, Hook Picker, Script Writer, Video Maker, Voiceover).
- [00:58]-[01:17] Module 2, « Publishing » : met chaque vidéo au format TikTok, Instagram, YouTube et LinkedIn, publie quand l'audience est la plus active et « en fait plus de ce qui attire l'attention ». Image 062 : le bloc « Publishing » (Approval Desk, Formatter, Scheduler, Short-Form Poster, Long-Form Poster), au-dessus de « Community & Reputation ».
- [01:18]-[01:37] Module 3, « Comments to Customers » : chaque commentaire et message privé reçoit une réponse en moins d'une minute, jour et nuit ; l'outil entendu « Jeff » repère ceux qui veulent acheter et leur envoie le lien ou réserve un appel. Image 085 : un message privé Instagram fictif (« How much is 1:1 coaching? ») avec les icônes Instagram et TikTok à côté.
- [01:37]-[01:51] Claude Code orchestre ; chaque matin une page : ce qui a eu des vues, qui est prêt à acheter, combien d'appels sont réservés cette semaine ; « plus de factures d'agence, juste un agenda plein de clients ». Images 100 et 110 : le bloc « The Brain · Head of Social » (Triage, Reads & Writes, Speaks, Checks the Work) et un calendrier de mois.
Principes et patterns réutilisables :
- Dix minutes d'approbation par semaine pour tout un lot [00:50]-[00:55].
- Un département de réponse (« commentaires vers clients ») qui oriente vers un lien ou un appel [01:24]-[01:33].
- Un chef avec quatre fonctions nommées : trier, lire et écrire, parler, contrôler le travail (image 100).
- Les accroches repérées chaque jour sur le marché avant d'écrire [00:35]-[00:44].
- Le résultat attendu mesuré en appels réservés, pas en vues [01:43]-[01:47].
Erreurs à éviter :
- Dit par l'auteur : courir après les vues [00:26]-[00:30].
- Constaté : la phrase « remplace votre agence de 25 000 dollars » compare un coût annuel annoncé à un système dont le coût n'est pas donné.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- « Dix minutes le lundi pour approuver une semaine de contenu » est le format visé par le chantier 5 pour Presti lui-même : un lot par semaine à valider, puis l'automatique après 2 ou 3 validations.
- Le département « commentaires → clients » répond, pour Presti, aux commentaires de ses propres publications (« commentez… ») : à construire dans n8n, jamais en dur, dans les règles des publications réseaux (aucune publication sans URL relue).
- Mesurer en rendez-vous réservés plutôt qu'en vues : règle déjà adoptée (« Publications réseaux - règle de vérité »).
Ce qui ne s'applique pas, et pourquoi :
- La production de vidéos et de voix par des outils tiers payants : la vidéo ne donne ni leur coût ni leurs limites.
- Les réseaux visés (TikTok, Instagram, YouTube, LinkedIn) : propres à un coach ou un créateur.
- Aucun détail du contrôle (« Checks the Work ») n'est montré.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 25 000 dollars par an » pour une agence [00:00] : annoncé par l'auteur, non vérifié.
- « huit départements, 41 agents » [00:12] : annoncé par l'auteur, non vérifié.
- « 10 minutes chaque lundi » [00:50] ; « réponse en moins d'une minute » [01:24] : annoncé par l'auteur, non vérifié.

---

## 11. « I Built a $25,000 AI Reputation Management System For Restaurants » (02/11/2026)

Source : « I Built a $25,000 AI Reputation Management System For Restaurants », @restructureai, https://www.tiktok.com/@restructureai/video/7703401774446562581 · publiée le 02/11/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:21] Un système de réputation pour restaurants, « plan gratuit » : il répond à chaque avis, en fait venir de nouveaux, prend chaque appel et attrape les clients mécontents avant qu'ils publient ; « une étoile de plus peut valoir 5 à 9 % de revenu en plus ». Image 008 : « AI REPUTATION SYSTEM », « $25,000 », cinq étoiles et une rangée d'icônes (Google, Yelp, TripAdvisor et des outils de messagerie).
- [00:22]-[00:42] Module 1, réponse aux avis : chaque avis Google, Yelp et TripAdvisor reçoit une réponse en quelques minutes, « dans la voix de votre restaurant » ; Claude l'écrit, « les difficiles viennent d'abord à vous » ; aucun avis à une étoile ne reste sans réponse. Image 026 : le bloc « Review Response » (Review Reader, Reply Writer, Approval Desk, Reply Poster, Fake Review Flagger).
- [00:42]-[01:01] Module 2, croissance des avis : après chaque repas, une invitation à laisser un avis, par un code QR sur la table ou un texto « si le client y consent » ; « de nouveaux avis chaque semaine, la note monte toute seule ». Image 052 : un plat et une note de table à l'état « PAID », sous le titre « 2 REVIEW GROWTH ».
- [01:02]-[01:25] Module 3, « récupération du client » : un agent vocal ElevenLabs répond à chaque appel, même un vendredi soir chargé, prend les réservations, répond aux questions ; si un client est mécontent, le responsable est prévenu le jour même, pour réparer « pendant qu'il est encore votre client ». Image 072 : un appel entrant, une phrase d'accueil d'un assistant fictif et une grille de 12 lignes L01 à L12 cochées.
- [01:25]-[01:37] Claude Code orchestre ; chaque matin, une page : la note de la semaine, les avis qui attendent, ce que les clients mentionnent le plus ; « plus d'étoiles, plus de réservations, une salle pleine ». Images 088 et 095 : une carte « STARS 4.3 » et le bloc « The Brain · Head of Reputation » (Triage, Reads & Writes, Speaks, Guards the Gate).
Principes et patterns réutilisables :
- Les avis difficiles passent d'abord par le propriétaire ; les autres partent seuls [00:30]-[00:35] (image 026 : un bloc « Approval Desk » avant « Reply Poster »).
- L'invitation à laisser un avis ne se fait que par un canal accepté : code QR ou texto avec consentement [00:51]-[00:58].
- Un signalement des faux avis, bloc dédié (image 026).
- Attraper l'insatisfaction avant la publication : alerte du responsable le jour même [01:14]-[01:20].
- Un chef avec quatre fonctions, dont « garder la porte » (image 095), puis une page du matin avec la note, les avis en attente et les thèmes récurrents [01:27]-[01:34].
Erreurs à éviter :
- Dit par l'auteur : un avis à une étoile laissé sans réponse [00:35]-[00:38] ; répondre sans chercher d'avis nouveaux, ce qui ne fait que protéger la note actuelle [00:42]-[00:48] ; laisser un mécontent publier avant qu'on ait pu réparer [01:20]-[01:25].
- Constaté : la phrase « une étoile de plus = 5 à 9 % de revenu » n'a aucune source donnée.
Ce qui s'applique à Presti / à ce client (Claude Code, 02/11 au soir) :
- « Les avis difficiles d'abord au patron, les autres seuls » est le schéma Studio et Signature appliqué aux avis Google de l'artisan. Ce serait une capacité nouvelle, « répondre à un avis » : en Studio, la réponse est préparée ; en Signature, seules les réponses aux avis positifs partent seules, et un avis négatif ne part jamais sans l'artisan (escalade). À proposer à Benj, dans n8n.
- L'invitation à laisser un avis, par un canal consenti (code QR, texto avec consentement), relève de l'après-chantier (L18) et des SMS (L7). « Demande d'avis » n'est pas dans la liste fermée des SMS : elle n'y entre qu'avec un consentement recueilli.
- Attraper le mécontent avant qu'il publie, c'est le détecteur de contestation des impayés (032-017) et l'escalade ; pour l'Entreprise, l'agent Alerte, avec la catégorie « client qui décroche » (écart 15 de la contre-vérification n° 2).
Ce qui ne s'applique pas, et pourquoi :
- Les restaurants, leurs réservations et leurs tables : propres à ce métier.
- Les plateformes d'avis citées (Google, Yelp, TripAdvisor) : la vidéo ne dit rien des règles de ces plateformes sur les réponses automatisées.
- L'agent vocal décroche tous les appels, y compris aux heures de pointe : aucune limite ni qualité de service n'est donnée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « un système de 25 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « une étoile de plus peut valoir 5 à 9 % de revenu en plus » [00:18] : annoncé par l'auteur, non vérifié.
- « une réponse en quelques minutes » [00:25] : annoncé par l'auteur, non vérifié.
- « 4,3 étoiles » (image 088) ; « 12 lignes » (image 072) : lus sur des maquettes, non vérifiés.

---

## Vidéos manquantes ou sans son

- Aucune. Les 11 vidéos ont un fichier de transcription complet (langue détectée : anglais, durées de 84,7 s à 119,5 s) et leur dossier de 84 à 119 images.
- Comble un manque signalé : l'analyse du 05/10 de la vidéo du 29/09 (`docs/ecommerce/sources/restructureai-7690784360898874645.analyse.md`) n'avait « pas de transcription audio », et `fiches-videos.md` listait son audio parmi ce qui manquait ; ici la piste audio (89,3 s) est transcrite en 20 segments (fiche 1).
- Limite de lecture : les images n'ont pas toutes été regardées une à une ; six images par vidéo ont été regardées (celles citées dans chaque fiche, soit 66 images au total), choisies aux changements de module. Les textes très petits des schémas d'ensemble ne sont pas lisibles à 720 px et ne sont pas rapportés.
