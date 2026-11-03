# Fiches de lecture : lot 1 (fiches 12 à 29) des vidéos TikTok de @restructureai

> Écrit le 02/11/2026 par Hermes, tâche 035-009, lot 1 sur 3, au format de `fiches-videos-restructureai.md`.
> Entrées : `/home/usine/agents/videos/references-2026-11-02/restructureai/` (transcriptions Whisper, métadonnées, images). Rien n'a été téléchargé ni publié.
> Conventions : `[mm:ss]` tiré de la transcription. Les noms d'outils suivent l'audio ; Whisper écrit « Hicksfield » pour Higgsfield et « 11 Labs » pour ElevenLabs. « Jeff » est l'outil entendu ainsi, non identifié.
> Les chiffres de l'auteur sont marqués « annoncé par l'auteur, non vérifié ». Le champ « Ce qui s'applique à Presti » et les ajouts « Planche, images … » de « Ce qu'elle montre » sont de Claude Code (tâche 035-014, 03/11/2026), écrits d'après la transcription et la planche de 9 images de chaque vidéo.

---

## 12. « I Built an AI Marketing Team For Solo Founders » (20/10/2026)

Source : « I Built an AI Marketing Team For Solo Founders », @restructureai, https://www.tiktok.com/@restructureai/video/7698582717008448789 · publiée le 20/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:13] Équipe marketing IA pour fondateurs solo, présentée comme « vingt-trois employés » ; plan annoncé gratuit ; rien ne part sans approbation.
- [00:15]-[00:33] Module un, acquisition : on décrit ce qu'on vend ; l'outil entendu « Jeff » trouve sur Reddit et chez les concurrents des personnes qui demandent, puis leur envoie une réponse avec le lien ; des créateurs payés à la vente sont aussi repérés.
- [00:35]-[00:56] Module deux, studio créatif : quelques photos deviennent des vidéos (Hicksfield), Claude écrit les accroches, la voix de 11 Labs narre ; dix versions d'une publicité sont testées et seules celles qui rapportent reçoivent de l'argent.
- [00:58]-[01:18] Module trois, conversion : un agent vocal rappelle dans la minute, répond aux questions, vérifie que l'acheteur est sérieux et réserve l'agenda.
- [01:21]-[01:36] Claude Code relie client, vidéo et appel à l'argent gagné ; un résumé d'une page chaque matin.
- Planche, images 23, 34, 56, 67, 78, 89 (écrans de maquette que l'audio ne décrit pas) : image 23, trois fichiers « produit », « prix » et « cibles » rédigés par Claude Code à partir d'une phrase ; image 34, des créateurs à commission et un tableau de commissions ; image 56, un tableau de dix versions avec budget et revenu par ligne ; image 67, un appel manqué devenu une fiche de demande ; image 78, l'agent vocal, une note d'acheteur et trois créneaux proposés ; image 89, un écran verrouillé à 7 h. L'icône que l'audio rend par « Jeff » est étiquetée « Jev » (images 23, 67).
Principes et patterns réutilisables :
- Une validation humaine avant toute sortie ([00:13]).
- Chercher les acheteurs là où ils demandent déjà ([00:18]-[00:27]).
- Tester des variantes et ne dépenser que sur celles qui marchent ([00:48]-[00:56]).
- Rappeler dans la minute : un prospect non rappelé achète souvent ailleurs ([01:01]-[01:04]).
- Relier chaque action à l'argent gagné, puis résumer chaque matin ([01:24]-[01:30]).
Erreurs à éviter :
- Dit par l'auteur : attendre le lendemain pour répondre, c'est perdre l'acheteur ([01:01]-[01:04]).
- Dit par l'auteur : une vidéo faite par quelqu'un coûte des centaines de dollars et une semaine ([00:37]-[00:41]).
- Constaté : la vidéo ne donne aucun résultat chiffré ; le « vingt-trois employés » n'est pas démontré.
- Constaté : elle ne dit pas comment éviter que les messages sur Reddit soient jugés indésirables.
Ce qui s'applique à Presti / à ce client :
- « Rappeler dans la minute » [01:01]-[01:04] : chez Presti, c'est la réponse écrite préparée en moins d'une minute (`lib/ai.ts`), qui attend le clic de l'artisan en Studio et part seule en Signature (`lib/plans.ts:11`). L'agent vocal de l'image 78 (appel, note d'acheteur, créneaux proposés) est exclu. Une demande tombée sans réponse (image 67) est le détecteur 6 du chantier 4 (« demandes sans réponse », L3 n8n).
- L'écran verrouillé de 7 h (image 89) et le résumé d'une page [01:21]-[01:36] : c'est `presti-briefing-matin` (L15, n8n d'Oracle), qui propose et ne déclenche jamais le pilote.
- Les trois fichiers « produit », « prix », « cibles » (image 23) : une description écrite une fois, dont tout découle. C'est « Décrire mon entreprise » (A6, mise en route L14) et la fiche de découverte d'un client Entreprise (035-002), relue par lui. Les prix n'en sortent pas par déduction : ils viennent de sa liste.
- Relier chaque action à l'argent gagné [01:24]-[01:30] : `leads.origine` (`0177_canaux_reseaux.sql`) et l'entonnoir lien → demande → devis → facture ; pour l'Entreprise, `lib-rapport-hebdo`, qui refuse un chiffre sans source.
- Tester dix versions (image 56) est une idée pour les contenus de Presti lui-même (chantier 5), mesurés en demandes reçues ; toute dépense publicitaire attend l'accord de Benj (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- Les réponses postées sur Reddit et chez les concurrents : prospection publique, à vérifier au regard des règles de chaque plateforme.
- Les créateurs payés à la commission : modèle de vente en ligne, hors d'un service local.
- Les outils nommés (Claude, Higgsfield, 11 Labs) : la vidéo ne dit pas comment ils sont branchés.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « Vingt-trois employés » : annoncé par l'auteur, non vérifié ([00:03]).
- « Des centaines de dollars » pour une vidéo : annoncé par l'auteur, non vérifié ([00:37]).
- Dix versions d'une publicité : annoncé par l'auteur, non vérifié ([00:48]).

---

## 13. « I Built an AI Social Media Team For Venture Capital Firms » (19/10/2026)

Source : « I Built an AI Social Media Team For Venture Capital Firms », @restructureai, https://www.tiktok.com/@restructureai/video/7698213845478706440 · publiée le 19/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:17] Équipe IA de réseaux sociaux pour fonds de capital-risque, présentée comme « plus de cinq cents heures » de construction ; rien ne sort sous le nom d'un associé sans son accord.
- [00:17]-[00:33] Module un, Deal Radar : balayage de X, LinkedIn, Product Hunt et GitHub pour repérer des startups en croissance ; l'outil entendu « Jeff » note chaque entreprise selon la thèse du fonds, puis la fiche part dans le CRM avec un résumé d'une page.
- [00:37]-[00:53] Module deux, Partner Brand : les notes et podcasts d'un associé deviennent posts et fils ; une version audio hebdomadaire à sa voix (11 Labs) ; chaque publication est approuvée.
- [00:58]-[01:08] Module trois, screening : un appel de dix minutes avec l'IA ; les dossiers forts obtiennent un rendez-vous, les autres une vraie réponse.
- [01:13]-[01:21] Claude Code suit quel post a amené quel fondateur ; résumé d'une page chaque matin.
- Planche, images 28, 37, 46, 55, 64 : image 28, la fiche d'une startup avec le post du fondateur et une carte de classement ; image 37, un tableau à colonnes (repérée, premier appel, rendez-vous associé, accord) et une frise « qui l'a vu en premier, jours après le post » ; image 46, la même idée sortie en post LinkedIn et en fil X ; image 55, la courbe d'abonnés, une alerte « a suivi votre page » et l'envoi d'un dossier ; image 64, l'écran d'appel de dépistage avec transcription.
Principes et patterns réutilisables :
- La personne qui signe valide avant toute publication ([00:43]-[00:53]).
- Filtrer un flux en amont par une grille explicite, puis solliciter un humain ([00:22]-[00:33]).
- Garder une réponse humaine même pour les refus ([01:05]-[01:10]).
- Mesurer jusqu'au résultat final (rendez-vous, affaire), pas seulement les réactions ([01:13]-[01:17]).
Erreurs à éviter :
- Dit par l'auteur : ne jamais laisser partir un message sous le nom d'un associé sans son accord ([00:17]-[00:21]).
- Dit par l'auteur : ne laisser aucun fondateur sans réponse, même refusé ([01:05]-[01:10]).
- Constaté : la vidéo ne montre aucun taux de conversion.
- Constaté : elle ne dit pas comment le flux public est filtré contre le spam.
Ce qui s'applique à Presti / à ce client :
- Le balayage noté selon la grille du fonds [00:22]-[00:33] est la chasse aux prospects de Presti (chantier 3) : un tri par critères écrits (l'ICP du réseau neuronal), jamais sur LinkedIn, dont la collecte est interdite à Presti (`architecture-outils.md`).
- Le tableau à colonnes (image 37) est le suivi d'une demande dans le CRM de l'artisan (capacité `crm`, `lib/plans.ts`) ; la frise « qui a vu en premier » (image 37) est l'attribution de `leads.origine` et de l'onglet Visiteurs.
- « La personne qui signe valide » [00:43]-[00:53] est Studio : rien ne part sans le clic de l'artisan (`lib/plans.ts:11`) ; pour l'Entreprise, le gérant ou un membre habilité (rang 0 de la hiérarchie, §4.2 de `premiere-reponse.md`).
- Garder une réponse humaine même pour le refus [01:05]-[01:10] : une demande hors zone ou hors métier reçoit une réponse polie préparée (rédaction + porte de conformité), jamais un silence ; c'est le détecteur 6.
- Un contenu source décliné en deux formats (image 46) est le principe des carrousels et vidéos de Presti : 2 ou 3 premiers validés par Benj, puis publication automatique sous contrôle qualité (`autonomie-abonnements.md`).
Ce qui ne s'applique pas, et pourquoi :
- Le capital-risque et ses fondateurs : métier sans rapport avec les artisans.
- La collecte sur X, LinkedIn, Product Hunt et GitHub : la collecte LinkedIn est interdite à Presti (règle architecture-outils, `.hermes.md`).
- La voix clonée d'un associé : à exclure sans accord écrit.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Plus de cinq cents heures de construction : annoncé par l'auteur, non vérifié ([00:00]).
- Appel de dix minutes avec l'IA : annoncé par l'auteur, non vérifié ([00:58]).
- Un résumé d'une page chaque matin : annoncé par l'auteur, non vérifié ([01:17]).

---

## 14. « I Built an AI Social Media Team That Runs Your Entire Marketing » (16/10/2026)

Source : « I Built an AI Social Media Team That Runs Your Entire Marketing », @restructureai, https://www.tiktok.com/@restructureai/video/7697097038286130453 · publiée le 16/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:15] Équipe IA pour recherche, publicités, contenus, publications, prospects, appels et relances ; « plus de deux cents heures » de construction annoncées ; aucune publicité ni post ne part sans validation.
- [00:19]-[00:46] Module un, publicités : un budget fixé par le propriétaire (« 500 dollars » par semaine) ; l'outil entendu « Jeff » retrouve les publicités concurrentes diffusées depuis des semaines ; Claude écrit vingt nouvelles publicités ; des vidéos sont tirées de photos ; après validation, diffusion pendant quarante-huit heures, budget réaffecté aux gagnantes sans dépasser la limite.
- [00:50]-[01:04] Module deux, prospects : chaque commentaire et message privé est lu ; une question sur le prix ou la livraison déclenche un lien pour laisser son numéro.
- [01:05]-[01:19] Module trois, ventes : un agent vocal (11 Labs) rappelle dans la minute et prend rendez-vous ; les gros dossiers arrivent directement au propriétaire.
- [01:22]-[01:34] Claude Code relie publicités, commentaires et appels, puis envoie un résumé quotidien d'une page.
- Planche, images 11, 21, 31, 41, 61, 71, 81 : la phrase de l'image 11, « Claude écrit, Jev décide, la voix parle, vous approuvez », fixe quatre rôles ; image 31, une grille de publicités concurrentes avec leur durée de diffusion ; image 41, trois photos de produit devenues une vidéo ; image 61, une liste de commentaires et de messages privés où ceux qui demandent un prix sont surlignés ; image 71, l'appel d'un agent vocal décompté sur soixante secondes ; image 81, une frise « vitesse de réponse » qui oppose un rendez-vous pris et un acheteur parti ailleurs.
Principes et patterns réutilisables :
- Réutiliser ce qui a tenu : une publicité diffusée longtemps est un signal de rentabilité ([00:24]-[00:29]).
- Budget plafonné : l'outil ne dépasse jamais la limite fixée ([00:46]-[00:50]).
- Qualifier par une question simple avant l'appel humain ([00:52]-[01:00]).
- Relier chaque canal à la vente finale pour savoir quelle source rapporte ([01:23]).
Erreurs à éviter :
- Dit par l'auteur : rappeler le lendemain, c'est laisser l'acheteur partir ([01:17]-[01:19]).
- Dit par l'auteur : compter les abonnés ne suffit pas, il faut des clients ([01:32]-[01:34]).
- Constaté : aucun résultat réel n'est donné ; la vidéo ne précise pas qui valide les publicités ni comment la limite est bornée.
- Constaté : elle ne dit pas comment la lecture des messages privés respecte les règles des plateformes.
Ce qui s'applique à Presti / à ce client :
- Les quatre rôles de l'image 11 (écrire, décider, parler, approuver) se retrouvent dans les gabarits : `lib-rediger-message` écrit, `lib-decider` choisit carte, pilote ou rien, `lib-executer` agit, le gérant approuve (rang 0). Différence : chez Presti, aucune décision d'argent n'est prise par un modèle (p5:216-218).
- Le budget plafonné [00:46]-[00:50] est l'idée du `lib-disjoncteur` et des plafonds par type d'action (300 e-mails par jour, ADR-005, `email-brevo.md`) ; une publicité payante pour un client reste hors de Presti sans accord de Benj (une dépense).
- Les messages surlignés pour une question de prix (image 61) sont le tri par intention des réponses entrantes (fiche 2, image 044) ; chez Presti, ils arrivent par la page de l'artisan et par les canaux branchés (`0177_canaux_reseaux.sql`, `/api/canaux/relever`), pas par une lecture de messages privés d'un réseau.
- Le rappel d'un acheteur en une minute (images 71, 81) : réponse écrite préparée ; l'appel est exclu (voir « Ce que Presti ne reprend pas »).
- Le résumé quotidien d'une page [01:22]-[01:34] : `presti-briefing-matin` (L15).
Ce qui ne s'applique pas, et pourquoi :
- Les publicités Meta et Google à budget hebdomadaire : outil d'un e-commerçant, non décrit pour un service local.
- Les messages de vente tirés des commentaires : pratique de plateforme à vérifier avant toute reprise.
- L'agent vocal qui prend des rendez-vous : la vidéo ne dit rien du consentement à l'appel.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Deux cents heures de construction : annoncé par l'auteur, non vérifié ([00:00]).
- Budget de 500 dollars par semaine : annoncé par l'auteur, non vérifié ([00:21]).
- Vingt nouvelles publicités : annoncé par l'auteur, non vérifié ([00:33]).
- Diffusion de quarante-huit heures : annoncé par l'auteur, non vérifié ([00:43]).

---

## 15. « I Built an Entire AI Creator Studio With 0 Employees » (15/10/2026)

Source : « I Built an Entire AI Creator Studio With 0 Employees », @restructureai, https://www.tiktok.com/@restructureai/video/7696723588501556498 · publiée le 15/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:15] Studio IA de créateur pour une personne seule : scripts, voix, vidéo, traduction, publication, vente ; rien ne sort publiquement sans validation.
- [00:18]-[00:29] Module un, voix : deux minutes de parole au téléphone ; Claude écrit le script, 11 Labs le lit avec la voix du créateur ; il écoute et approuve.
- [00:31]-[00:52] Module deux, vidéo et doublage : des photos deviennent des clips (Hicksfield), le script cale les sous-titres, puis le doublage en dix langues ; Metricool publie sur quatre réseaux à l'heure locale de chaque pays.
- [00:57]-[01:15] Module trois, ligne de vente : une version IA du créateur répond aux demandes de cours, de coaching ou de partenariat, se présente comme IA, puis envoie vers le paiement ou un rendez-vous.
- [01:15]-[01:27] Claude Code suit l'argent plutôt que les vues ; résumé quotidien : quels appels ont vendu, quelle vidéo produire ensuite.
- Planche, images 11, 31, 41, 51, 61, 71, 81 : la phrase de l'image 11 pose les mêmes rôles que dans la vidéo du 16/10 (Claude écrit, Jev décide, la voix parle, vous approuvez) ; image 31, l'approbation se fait dans un message Slack « #approvals » avec un bouton, sur un téléphone ; image 41, un montage à sous-titres avec la transcription ; image 51, un planning de publication par pays ; images 61 et 71, une ligne de vente tenue par une « AI Maya », avec un badge « AI ASSISTANT » et une note de convenance ; image 81, un tableau de bord où le revenu des trente jours domine les vues.
Principes et patterns réutilisables :
- Enregistrer une fois, déléguer la mise en forme : la voix du créateur est la matière première ([00:20]-[00:29]).
- Le doublage dans plusieurs langues élargit l'audience sans équipe ([00:40]-[00:52]).
- L'IA s'annonce comme IA dans la vente ([01:06]-[01:07]).
- Le rapport du matin relie ventes et production suivante ([01:20]-[01:27]).
Erreurs à éviter :
- Dit par l'auteur : suivre les vues plutôt que l'argent est une erreur ([01:18]).
- Dit par l'auteur : n'intervenir que pour les affaires qui valent le temps ([01:13]-[01:14]).
- Constaté : la vidéo ne montre aucun chiffre de vente.
- Constaté : aucune règle n'est décrite sur le clonage de voix ni sur l'accord de la personne doublée.
Ce qui s'applique à Presti / à ce client :
- L'approbation par un bouton unique dans un message (image 31) est la forme des cartes de Presti : chez l'artisan, une carte dans « Aujourd'hui » (L5, 032-041) et la carte de lot (L16), jamais un message d'un outil tiers ; pour Benj, les 2 ou 3 premiers contenus validés d'un geste (`autonomie-abonnements.md`).
- Le badge « AI ASSISTANT » (images 61, 71) pose une question à trancher par Benj : aujourd'hui les e-mails partent au nom de l'artisan (`lib/email.ts:6-11`) après son clic en Studio ; aucune mention d'assistant n'y figure.
- La note de convenance (image 71) est la qualification : `lib-qualifier-lead` la calcule selon la grille du client, avec les données, jamais par le modèle seul.
- « L'argent plutôt que les vues » (image 81) est le rapport hebdomadaire de l'Entreprise (`lib-rapport-hebdo`) et les « chiffres du mois » de l'artisan (capacité `chiffres`).
- Le clonage de voix, le doublage et la vente de cours sont exclus (voir le champ suivant).
Ce qui ne s'applique pas, et pourquoi :
- Le doublage et la voix du créateur : sujet propre aux créateurs de contenu, sans équivalent direct pour un service local.
- La vente de cours et de coaching : modèle d'affaires non décrit pour une entreprise de services.
- Les réseaux à plusieurs langues : hors de portée d'une activité à zone locale, sauf besoin avéré.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « Deux minutes » de parole : annoncé par l'auteur, non vérifié ([00:22]).
- Doublage en dix langues : annoncé par l'auteur, non vérifié ([00:40]).
- Publication sur quatre réseaux : annoncé par l'auteur, non vérifié ([00:45]).

---

## 16. « How to Build a Local AI System for Free (Then Scale Up) » (13/10/2026)

Source : « How to Build a Local AI System for Free (Then Scale Up) », @restructureai, https://www.tiktok.com/@restructureai/video/7695984261769202945 · publiée le 13/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:17] L'auteur affirme que la pile d'abonnements IA coûte plus de deux mille dollars par an, et propose une installation locale gratuite.
- [00:07]-[00:17] Calcul narratif : ChatGPT à 20 dollars par mois, soit 240 par an ; Claude Pro, puis Gemini, chacun 240.
- [00:21]-[00:45] L'API facturée à la tâche ajoute environ 150 dollars par mois ; chaque prompt quitte l'ordinateur, donc les dossiers et les données financières aussi.
- [00:52]-[01:03] Installation : Ollama en une commande, un modèle Llama 3.2, qui tourne sur un ordinateur de 8 Go de mémoire, et une interface Open WebUI présentée comme un ChatGPT privé.
- [01:06]-[01:23] Si l'application utilise l'API d'OpenAI, changer une ligne suffit ; tester une fin de semaine sur un vrai travail, garder un seul abonnement pour les tâches difficiles.
- Planche, images 28, 37, 64, 73 : image 28, un « assistant de boîte de réception » (nouveau courriel, agent IA, brouillon de réponse) facturé à l'usage ; image 37, une demande de relecture de contrat client qui part vers le nuage ; image 64, dans l'interface locale, le brouillon d'une réponse qui confirme un rendez-vous et joint le devis mis à jour ; image 73, la ligne de code changée pour viser l'ordinateur au lieu du service payant.
Principes et patterns réutilisables :
- Tester sur un vrai travail avant de couper un abonnement ([01:13]-[01:15]).
- Garder le modèle payant pour les tâches difficiles seulement ([01:19]).
- Un modèle local garde les documents sur la machine ([00:33]-[00:35]).
- Mesurer le coût total en abonnements et en tokens ([00:41]-[00:45]).
Erreurs à éviter :
- Dit par l'auteur : une facturation à la tâche grimpe vite ([00:21]-[00:27]).
- Dit par l'auteur : un modèle local tient sur un ordinateur d'entrée de gamme ([00:57]).
- Constaté : aucun test de qualité n'est montré ; la vidéo ne dit pas qu'un modèle local répond souvent moins bien.
- Constaté : elle ne dit rien de la sécurité du poste ni des sauvegardes.
Ce qui s'applique à Presti / à ce client :
- L'exemple de la vidéo est le cœur de Presti : un courriel arrive, l'agent rédige, un brouillon attend (images 28, 64). Chez Presti, le brouillon passe par `lib/ai.ts` et ses paliers de modèle (`routerModele`, `lib/ai/routage`). Le modèle local n'est pas retenu : aucun test de qualité n'est montré, et une réponse à un client d'artisan ne se joue pas à moindre qualité.
- « Les données ne quittent pas la machine » [00:33]-[00:35] rejoint la règle de Presti, plus stricte : aucune donnée de prospect ni de client vers un modèle gratuit en ligne (`securite.md`). Un modèle auto-hébergé sur Oracle serait une piste à proposer à Benj pour les petites tâches (tri, classement), à mesurer au banc d'évaluation (`presti-ai-lab`) avant tout usage, et jamais pour un montant ou un devis.
- Changer une ligne pour changer de modèle (image 73) est l'argument du point d'appel unique : `lib/ai.ts` côté application, et côté n8n `lib-rediger-message`, au modèle épinglé (§5.5 de `premiere-reponse.md`).
- Le coût mesuré (image 28, usage du mois) est le journal de coût de `lib-journaliser` (jetons, coût, source du tarif) et le solde de crédits visible dans l'assistant (A8).
Ce qui ne s'applique pas, et pourquoi :
- Le calcul des abonnements : prix américains annoncés par l'auteur, à revérifier.
- Les dossiers de patients et les données financières cités : à ne confier à aucun modèle sans étude de conformité préalable.
- La réduction de coût annoncée (plus de mille dollars par an) : dépend de l'usage, non démontrée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Plus de deux mille dollars par an : annoncé par l'auteur, non vérifié ([00:00]).
- Vingt dollars par mois pour ChatGPT : annoncé par l'auteur, non vérifié ([00:07]).
- Cent cinquante dollars par mois pour l'API : annoncé par l'auteur, non vérifié ([00:27]).
- Huit gigaoctets de mémoire : annoncé par l'auteur, non vérifié ([00:57]).
- Plus de mille dollars d'économie par an : annoncé par l'auteur, non vérifié ([01:19]).

---

## 17. « How Grok Bot Runs an Entire Finance Team for You » (12/10/2026)

Source : « How Grok Bot Runs an Entire Finance Team for You », @restructureai, https://www.tiktok.com/@restructureai/video/7695613034554805524 · publiée le 12/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:11] Un bot Grok branché sur une équipe finance IA, qui surveille chaque dollar ; le propriétaire garde la décision finale.
- [00:11]-[00:33] Module un, intelligence financière : chaque jour, l'analyste rassemble revenus, dépenses, factures et marges ; il repère l'abonnement oublié, le fournisseur qui augmente, le client qui grignote la marge.
- [00:34]-[00:53] Module deux, prévision : trésorerie et marge sur trois à six mois ; questions « et si » sur la perte d'un client ou une hausse de prix de 10 %.
- [00:55]-[01:11] Module trois, décision : le stratège classe les actions ; une fois validées, relances de factures et paiements ; ce qui réclame un humain arrive devant lui.
- [01:17]-[01:34] Le directeur financier envoie chaque matin une page : trésorerie, évolutions, trois actions du jour.
- Planche, images 21, 31, 41, 51, 61, 71, 81 : image 21, un grand livre des trente jours (revenus, dépenses, factures ouvertes, marge) avec la mention « quatre sources, un seul endroit » ; image 31, l'analyste a lu des centaines de transactions et lève trois alertes chiffrées ; image 41, la courbe de trésorerie sur six mois ; image 51, la question « et si je monte mes prix » avec deux scénarios marqués risque et sûr ; image 61, la liste des mouvements du jour, classés ; image 71, trois mouvements approuvés puis une facture envoyée ; image 81, un schéma « chaque tâche commence ici, chaque matin finit en une page ».
Principes et patterns réutilisables :
- Trier les actions par ordre d'importance pour un humain ([00:55]-[01:03]).
- Simuler avant de décider ([00:43]-[00:50]).
- Ce qui n'est pas validé n'est pas exécuté ([01:07]-[01:11]).
- Un résumé d'une page chaque matin ([01:20]-[01:27]).
Erreurs à éviter :
- Dit par l'auteur : une hausse de prix se décide après simulation, jamais avant ([00:43]-[00:52]).
- Dit par l'auteur : un abonnement oublié est une fuite à traquer ([00:23]).
- Constaté : aucune donnée réelle ni accès bancaire n'est montré ; la vidéo ne dit pas comment les données entrent.
- Constaté : elle ne traite ni des erreurs de rapprochement comptable ni du rôle d'un expert-comptable.
Ce qui s'applique à Presti / à ce client :
- « Quatre sources, un seul endroit » (image 21) est la section « À valider, l'argent d'abord » de l'accueil (L5) : quatre sources réunies sans en réécrire aucune ; les mouvements classés (image 61) suivent l'ordre des détecteurs, par argent récupéré (plan du chantier 4, §9).
- Parmi les trois alertes (image 31), seule la marge qui s'érode a un équivalent : la marge estimée sur matériaux (A7, L21), jamais appelée « bénéfice ». L'abonnement oublié et le fournisseur qui augmente supposent des relevés bancaires : Presti n'y a aucun accès.
- « Trois mouvements approuvés, puis une facture envoyée » (image 71) est la suite après-chantier du lot L18 : facture préparée, validée par l'artisan, envoyée ; les relances d'impayés restent un workflow n8n distinct de la prospection (`email-brevo.md`, détecteurs 1 et 11).
- Les scénarios « et si » sur le prix (image 51) restent hors du périmètre : l'assistant ne simule ni ne fixe le prix de l'artisan ; même en Signature, jamais un prix estimé ni un paiement sans lui (`autonomie-abonnements.md`).
- Le résumé du matin [01:17]-[01:34] : `presti-briefing-matin` (L15).
Ce qui ne s'applique pas, et pourquoi :
- Les décisions de prix et de résiliation : décisions commerciales à garder humaines ; la vidéo le reconnaît en partie.
- Les relances de factures : elles relèvent d'un workflow n8n distinct (règle email-brevo, `.hermes.md`), pas d'une équipe finance IA.
- Une « équipe finance » entière : la vidéo ne décrit pas les obligations comptables.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Trois à six mois de prévision : annoncé par l'auteur, non vérifié ([00:36]).
- Hausse de prix de 10 % : annoncé par l'auteur, non vérifié ([00:47]).
- Trois actions chaque matin : annoncé par l'auteur, non vérifié ([01:25]).

---

## 18. « I Built an Entire AI Sales Department That Runs 24/7 » (09/10/2026)

Source : « I Built an Entire AI Sales Department That Runs 24/7 », @restructureai, https://www.tiktok.com/@restructureai/video/7694496440655039750 · publiée le 09/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Une équipe de sept agents IA pour un service commercial ouvert en continu ; plan annoncé gratuit.
- [00:10]-[00:26] Un agent chef, « Reece CSO », répartit le travail entre les six autres ; chacun est relié aux outils (HubSpot, Gmail, agenda) ; l'auteur peut parler au chef ou à un agent.
- [00:29]-[00:41] Reece Research prépare chaque compte avant tout contact ; Reece Outreach écrit et envoie courriels, appels et textos en huit langues.
- [00:41]-[00:52] Reece Calls analyse chaque appel ; Reece Followup rédige le courriel suivant pour qu'aucun client ne tombe dans l'oubli.
- [00:56]-[01:10] Reece RevOps tient le CRM et le scoring ; Reece Logistics gère planning, devis et documents commerciaux.
- [01:11]-[01:20] Les agents se passent des notes ; l'auteur insiste sur « un seul système ».
- Planche, images 10, 21, 31, 37, 46, 55, 64, 73 : image 10, l'auteur parle face caméra, ce que l'audio ne dit pas ; image 21, un service commercial fictif de chauffage et climatisation à Phoenix, avec le chef, quatre agents et une grille d'outils connectés (HubSpot, Gmail, agenda, un logiciel d'interventions, Slack, Twilio, Zoom…) munis d'interrupteurs ; image 46, l'analyse d'un appel avec transcription ; image 55, l'agent « RevOps » et ses fonctions (hygiène du CRM, notes, prévision, préparation de rencontre) ; image 64, un tableau de pipeline avec notes et une fiche de préparation avant un rendez-vous ; image 73, un canal « #sales-floor » où les agents écrivent et où le propriétaire pose une question.
Principes et patterns réutilisables :
- Un agent chef qui route, et des agents spécialisés par étape ([00:10]-[00:17]).
- Chaque agent travaille dans les outils que l'équipe utilise déjà ([00:17]-[00:23]).
- L'analyse d'appel alimente directement la relance ([00:43]-[00:52]).
- Le passage de notes entre agents est le vrai point de valeur ([01:14]-[01:16]).
Erreurs à éviter :
- Dit par l'auteur : ne pas traiter les agents comme sept chatbots séparés ([01:18]-[01:20]).
- Dit par l'auteur : une relance non envoyée fait tomber le client ([00:48]).
- Constaté : aucun résultat chiffré n'est donné.
- Constaté : la vidéo ne dit pas comment se règlent les erreurs d'envoi ni les doublons de contacts.
Ce qui s'applique à Presti / à ce client :
- Le chef qui répartit entre six spécialistes (image 21) est `ent-exemple-parent` (035-007) et les chaînes `lib-*` (035-003 à 035-005). Différence voulue : l'orchestrateur n'est pas un agent, il route sans modèle (§4.2 de `premiere-reponse.md`).
- La grille d'outils connectés, chacun avec son interrupteur (image 21), est `gabarit-synchroniser-outil` (rang 3) et sa liste d'accès signée par le client : un outil se branche en lecture, jamais sans accord écrit.
- Le canal où les agents postent et où l'on demande « sommes-nous prêts pour mardi ? » (image 73) ressemble à l'écran « Messages » ; chez Presti, c'est l'assistant de gestion unique dans « Aujourd'hui » (L5, 032-041). Aucun nom d'agent, ni Hermes, n'y apparaît (`architecture-outils.md` ; vocabulaire interdit, §7 du plan).
- Le message de relance posté avec « besoin de votre accord », un bouton d'envoi et un bouton de modification (image 73) est une carte à brouillon et un geste : Studio. Les notes passées d'un agent à l'autre sont le contrat de sortie de chaque enfant n8n (p5:159-162).
- La fiche de préparation avant un rendez-vous (image 64) suggère une capacité nouvelle pour l'artisan : une fiche avant la visite chez le client, faite des seules données de la demande et de ses photos, sans aucun fait inventé. À proposer à Benj, dans n8n.
Ce qui ne s'applique pas, et pourquoi :
- L'envoi de courriels et de textos en huit langues : soumis à la règle Brevo et au consentement, pas repris tel quel.
- Les appels à des contacts : la règle de sécurité exige l'accord avant toute sortie, que la vidéo ne précise pas.
- Les outils cités (HubSpot, Gmail) : non décrits pour Presti.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Sept agents : annoncé par l'auteur, non vérifié ([00:00]).
- Six agents sous le chef : annoncé par l'auteur, non vérifié ([00:13]).
- Huit langues : annoncé par l'auteur, non vérifié ([00:37]).

---

## 19. « I Built an Entire AI Marketing Department for a Car Dealership » (08/10/2026)

Source : « I Built an Entire AI Marketing Department for a Car Dealership », @restructureai, https://www.tiktok.com/@restructureai/video/7694127517891923207 · publiée le 08/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:16] Un système marketing IA pour un concessionnaire automobile local, présenté à « 25 000 dollars » ; le gérant valide tout ce qui sort.
- [00:19]-[00:36] Module un, études de marché : Reese Research observe les concurrents locaux, leurs prix et les requêtes tapées tard le soir, par exemple un SUV d'occasion à moins de 20 000 dollars.
- [00:39]-[00:53] Module deux, réseaux : Reese content transforme chaque voiture en vidéo de présentation ; les posts répondent aux questions des acheteurs ; une file d'approbation attend le feu vert d'un responsable.
- [00:59]-[01:14] Module trois, publicités : campagnes Meta et Google tirées de l'inventaire réel, arrêtées quand la voiture est vendue ; suivi jusqu'à la vente effective, pas au clic.
- [01:14]-[01:23] Reese Director, « le directeur marketing qui ne prend jamais de jour », envoie chaque matin un résumé d'une page au directeur général.
- Planche, images 21, 28, 37, 46, 55, 64, 73 : image 21, un anneau de six agents autour d'un centre, un cadenas ouvert et une personne qui clique « Approved » ; images 28 à 73, un bouton « Take over » (prendre la main) reste affiché en bas de chaque écran ; image 37, la recherche tournée la nuit sur les requêtes du soir ; image 46, des posts qui portent « demandé N fois ce mois-ci » ; image 55, une règle de voix à quatre cases et une note de ressemblance, puis une file d'approbation « needs manager » ; image 64, des campagnes synchronisées avec l'inventaire réel, un journal d'appels et un agenda d'essais ; image 73, une voiture marquée vendue et sa campagne stoppée.
Principes et patterns réutilisables :
- Arrêter une publicité quand le produit est vendu : la campagne suit l'inventaire ([01:01]-[01:05]).
- Mesurer jusqu'à la vente effective ([01:08]-[01:14]).
- Répondre aux questions que les acheteurs posent déjà ([00:44]-[00:47]).
- Validation par un responsable avant publication ([00:53]).
Erreurs à éviter :
- Dit par l'auteur : mesurer les clics fait passer à côté de l'argent ([01:03]-[01:08]).
- Dit par l'auteur : une voiture vendue ne doit plus être annoncée ([01:03]).
- Constaté : aucun exemple réel ; la vidéo ne donne aucun résultat de vente.
- Constaté : elle ne dit pas comment les prix concurrents sont relevés, ni si cela est permis.
Ce qui s'applique à Presti / à ce client :
- Le bouton « prendre la main », visible sur chaque écran (images 28 à 73), est l'interrupteur de l'agent : « Tout arrêter » du pilote (section 5 de l'accueil, L5) et, pour l'Entreprise, `lib-disjoncteur` que le gérant ou Benj coupe à la main.
- La règle de voix cochée avant publication (image 55) est le ton de l'artisan, appris de ses vrais messages et prouvé par un test (`scripts/persona-e2e.mjs`). La note de ressemblance affichée n'est reprise nulle part : un pourcentage sans mesure serait un chiffre inventé.
- Arrêter ce qui est vendu (image 73, [01:01]-[01:05]) : chez Presti, un devis accepté arrête les relances (`lib/relancesRegistre.ts`) et une proposition écartée ne revient pas (`opportunites_decisions`, 0185). L'inventaire de l'artisan (`lib/inventaire/CONTEXT.md`) n'est relié à aucune publicité.
- « Demandé N fois ce mois-ci » (image 46) : les questions qui reviennent dans les vraies demandes d'un artisan nourrissent sa page `/site/[slug]` et les contenus du chantier 5 ; le compte vient de ses demandes réelles, jamais d'un chiffre posé.
- Mesurer jusqu'à la vente, pas au clic [01:08]-[01:14] : l'entonnoir lien → demande → devis → facture ; résumé du matin : `presti-briefing-matin` (L15).
Ce qui ne s'applique pas, et pourquoi :
- L'inventaire de véhicules et les annonces de concessionnaire : métier et canaux non transposables tels quels.
- Les requêtes nocturnes sur les véhicules d'occasion : analyse propre à l'automobile.
- Le financement malgré un mauvais crédit, cité en exemple : secteur réglementé, hors du champ de cette fiche.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- 25 000 dollars de système : annoncé par l'auteur, non vérifié ([00:00]).
- Moins de 20 000 dollars, exemple de requête : annoncé par l'auteur, non vérifié ([00:32]).
- Un résumé chaque matin : annoncé par l'auteur, non vérifié ([01:19]).

---

## 20. « I Built an AI Marketing Team That Sells Like Amazon » (07/10/2026)

Source : « I Built an AI Marketing Team That Sells Like Amazon », @restructureai, https://www.tiktok.com/@restructureai/video/7693762926615825716 · publiée le 07/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:17] Un moteur marketing IA pour boutique en ligne, inspiré de la façon dont Amazon vend ; validation avant publication.
- [00:21]-[00:32] « Rease Intelligence » : relié à Shopify, Google Trends, Semrush et la bibliothèque publicitaire de Meta ; chaque matin, trois produits à pousser, sur le modèle des « movers and shakers » d'Amazon.
- [00:36]-[00:51] « Rease Pricing » : propose un lot si un concurrent baisse son prix, une promotion si le stock déborde, une pause des publicités si la rupture approche ; un accord avant exécution.
- [00:55]-[01:06] « Rease Content » : transforme les avis clients en publications et publicités ; publication après validation ; suivi des ventes et non des vues.
- [01:10]-[01:26] « Rease Retention » : relance de panier abandonné et de réassort ; « Rease Director » envoie chaque matin ce qui s'est vendu, l'agent le plus rentable et la prochaine action.
- Planche, images 21, 31, 41, 51, 61, 71, 81 : image 21, un module de veille à sept fonctions (tendances, publicités concurrentes, mots-clés, avis, signaux de vente…) ; image 31, des écrans de boutique en ligne qui listent les plaintes les plus fréquentes dans les avis ; image 41, un suivi du prix d'un concurrent ; image 51, une liste « en attente de vous » de trois propositions cochables, puis « Running », et un tableau de bascules On/Off par action ; image 61, des avis réels surlignés et une publicité par type d'acheteur ; image 81, une « page du jour » à 7 h, encore vide.
Principes et patterns réutilisables :
- Transformer les avis clients en contenu ([00:55]-[01:00]).
- Relancer le panier abandonné et le réassort ([01:10]-[01:15]).
- Suivre les ventes, non les vues ([01:06]).
- Un rapport d'une page, puis approbation ([01:17]-[01:26]).
Erreurs à éviter :
- Dit par l'auteur : suivre les vues plutôt que les ventes est un piège ([01:06]).
- Dit par l'auteur : changer le prix chaque nuit, « comme Amazon », est présenté comme un modèle ([00:51]-[00:54]).
- Constaté : aucune vente réelle n'est montrée ; la vidéo est une présentation.
- Constaté : elle ne dit rien des règles de prix, du droit de la concurrence ni des promotions trompeuses.
Ce qui s'applique à Presti / à ce client :
- La liste « en attente de vous » cochable et les bascules On/Off par action (image 51) sont « À valider » (L5) et le réglage « Je valide | Part seul après 10 min » par type d'action (`lib/pilote/regles.ts`, section 7 du plan du chantier 4).
- « Trois produits à pousser chaque matin » [00:21]-[00:32] : les trois priorités du matin, l'argent qui dort d'abord, calculées par le code et sans modèle (B4, `presti-briefing-matin`, L15).
- Des avis clients transformés en contenus (images 31, 61) : pour un artisan, ses vrais avis, repris tels que publiés et jamais inventés ; cela rejoint la capacité « répondre à un avis » (fiche 11) et le chantier 5. À proposer à Benj, dans n8n.
- La relance de réassort [01:10]-[01:15] est l'entretien proposé après chantier : lot L18, détecteur 12 du chantier 4, qui ne propose qu'une date (`lib/apresChantier.ts:47-50`).
- Le prix changé chaque nuit et les promotions automatiques sont exclus (image 51) : jamais un prix sans l'artisan.
Ce qui ne s'applique pas, et pourquoi :
- La tarification dynamique et les promotions automatiques : propres à une boutique en ligne avec stock, hors d'un service.
- Les relances de panier : e-commerce, sans rapport avec une activité de services.
- La comparaison à Amazon : échelle et marque sans rapport.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Trois produits à pousser chaque matin : annoncé par l'auteur, non vérifié ([00:28]).
- Quatre connecteurs cités pour Rease Intelligence : annoncé par l'auteur, non vérifié ([00:21]).
- Un rapport d'une page chaque matin : annoncé par l'auteur, non vérifié ([01:17]).

---

## 21. « 3 Jobs AI Will Replace by the End of 2026 » (06/10/2026)

Source : « 3 Jobs AI Will Replace by the End of 2026 », @restructureai, https://www.tiktok.com/@restructureai/video/7693385777253715252 · publiée le 06/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] Trois métiers que l'IA va remplacer cette année ; plan gratuit annoncé à la fin.
- [00:07]-[00:14] Première tâche, étude de marché : une semaine de travail ramenée à une heure par un agent branché sur SEMrush, Google Trends et les avis clients.
- [00:18]-[00:35] Deuxième, contenus et publicités : cent annonces en un après-midi, contrôlées contre un fichier de voix de marque ; Meta et Google désignent les gagnants.
- [00:38]-[01:04] Troisième, gestion de campagne : agents branchés sur les comptes publicitaires, budgets déplacés vers ce qui marche, dans un plafond fixé.
- [01:02]-[01:11] Conclusion : donner au système son playbook, son offre, son client et sa voix ; garder la décision finale.
- Planche, images 9, 17, 25, 33, 41, 57, 65 : image 9, un module de recherche à huit fonctions (tendances, concurrents, accroches, questions, mots-clés, audience…) ; image 17, une étude annoncée terminée en moins de deux heures, écrite dans une base de lignes ; image 25, une semaine de cinq publicités ; image 33, un test en direct classé par coût du contact ; image 41, une carte par campagne avec interrupteur et budget par jour ; image 57, un « cerveau » en quatre fichiers (playbook, offre, client, voix) ; image 65, une demande d'accord d'une ligne avec « Approved » et « Edit ».
Principes et patterns réutilisables :
- Brancher l'agent sur les outils de travail pour qu'il agisse vraiment ([00:57]-[00:59]).
- Vérifier chaque création avec un fichier de voix de marque ([00:26]-[00:30]).
- Plafonner les budgets publicitaires ([00:42]-[00:47]).
- Garder la décision finale humaine ([01:02]-[01:05]).
Erreurs à éviter :
- Dit par l'auteur : l'IA peut gérer les campagnes, mais pas décider ce que l'entreprise représente ([01:05]-[01:07]).
- Dit par l'auteur : ne plus passer ses soirées sur les tableaux de bord ([00:47]-[00:53]).
- Constaté : aucune démonstration ; la vidéo ne mesure rien.
- Constaté : elle ne traite pas des risques d'une campagne laissée sans contrôle.
Ce qui s'applique à Presti / à ce client :
- Le « cerveau » en quatre fichiers (image 57 : playbook, offre, client, voix) est « Décrire mon entreprise » (A6, mise en route L14) et la fiche de découverte Entreprise (035-002) ; la voix est le ton appris des vrais messages de l'artisan.
- La demande d'accord d'une ligne, avec « Approved » et « Edit » (image 65), est une carte : brouillon, bouton Valider, bouton Modifier (L5, L16). Le budget annoncé dans la carte vient de l'artisan ; Presti n'en devine aucun.
- Une carte par campagne avec interrupteur et plafond par jour (image 41) est le réglage par type d'action et les plafonds de `lib-executer` / `lib-disjoncteur`.
- L'étude de marché ramenée à une heure (images 9, 17) concerne la chasse aux prospects de Presti (chantier 3) : SearXNG et Firecrawl auto-hébergé sur Oracle, jamais un outil payant ni la collecte LinkedIn (`architecture-outils.md`).
Ce qui ne s'applique pas, et pourquoi :
- Les trois métiers listés : le remplacement annoncé n'est pas démontré.
- Le titre « jobs AI will replace » : ton anxiogène, à ne pas reprendre.
- Les publicités à grande échelle : volume sans rapport avec un artisan local.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Une semaine ramenée à une heure : annoncé par l'auteur, non vérifié ([00:07]-[00:14]).
- Cinq annonces par semaine pour un designer et un rédacteur, cent en un après-midi pour l'IA : annoncé par l'auteur, non vérifié ([00:21]).
- Trois métiers : annoncé par l'auteur, non vérifié ([00:00]).

---

## 22. « How $1M AI Engineers Build Systems » (05/10/2026)

Source : « How $1M AI Engineers Build Systems », @restructureai, https://www.tiktok.com/@restructureai/video/7693017322583362824 · publiée le 05/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Des ingénieurs IA très bien payés construisent des systèmes pour les entreprises ; plan en cinq étapes annoncé gratuit.
- [00:09]-[00:31] Étape un, trouver le vrai processus : l'équipe commerciale décrit sept étapes pour un devis ; dans la réalité, six devis sur dix repartent au début et trois sur dix exigent un devis neuf.
- [00:32]-[00:45] Étape deux, trier : chaque étape va dans une de quatre cases : supprimer, automatiser, confier à l'IA, ou garder une personne (signature, paiement).
- [00:45]-[01:09] Étapes trois et quatre : intégrer l'IA dans les outils existants ; une facture arrive, l'IA la lit, la vérifie, l'écrit dans la comptabilité et envoie un seul message d'approbation ; démarrer par la finance.
- [01:09]-[01:30] Étape cinq, copier : une entreprise ramène le délai de traitement des factures de vingt-quatre jours à six, et le coût par facture de trente et un dollars à six.
- Planche, images 9, 17, 25, 33, 41, 49, 57, 65 : image 17, la fiche d'une affaire dans un logiciel de vente avec un devis en sept étapes (rédigé, soumis, relu, approuvé, envoyé, négocié, signé) ; image 25, le processus réel dessiné avec des retours en arrière en pointillé ; image 33, quatre cases (corbeille, rouage, IA, personne) où l'on range chaque étape ; image 41, un message Slack « #finance » à côté d'un tableau de factures fournisseurs ; image 49, la question « approuver cette facture ? » avec deux boutons Oui et Non ; image 65, un avant/après du délai et du coût par facture.
Principes et patterns réutilisables :
- Cartographier le processus réel avant d'ajouter de l'IA ([00:09]-[00:13]).
- Quatre cases : supprimer, automatiser, déléguer à l'IA, garder un humain ([00:35]-[00:41]).
- Intégrer dans l'outil déjà utilisé ([00:45]-[00:52]).
- Démarrer petit, corriger la règle, puis copier ([01:11]-[01:19]).
Erreurs à éviter :
- Dit par l'auteur : partir de l'IA avant d'avoir le processus réel ([00:11]-[00:13]).
- Dit par l'auteur : ne pas imposer un nouveau logiciel à l'équipe ([00:47]-[00:50]).
- Constaté : les chiffres de délai et de coût ne sont sourcés nulle part dans la vidéo.
- Constaté : elle ne dit pas qui valide les factures ni à partir de quel montant.
Ce qui s'applique à Presti / à ce client :
- C'est la méthode de la fiche de découverte d'un client Entreprise (035-002, §5.2 de `premiere-reponse.md`) : dessiner le processus réel, avec ses retours en arrière (image 25), avant d'ajouter un seul agent ; la base de départ de chaque irritant se mesure avant (§5.1, §7.3).
- Les quatre cases (image 33 : supprimer, automatiser, confier à l'IA, garder une personne) sont le tri de chaque irritant : n8n pour l'automatisation, la rédaction pour l'IA, et ce qu'une carte ne fait jamais seule (signature, paiement) reste au client via `lib-porte-conformite`.
- Un message d'approbation unique à deux boutons (image 49) est la carte Studio ; une facture fournisseur approuvée et saisie en comptabilité est hors de Presti, qui n'a aucun accès comptable.
- « Commencer par une équipe, puis copier » (images 57, 65) est le plan par phases de l'Entreprise : un irritant signé, un workflow ; les gabarits `lib-*` se recopient d'un client à l'autre, jamais les données (p5:158). Le délai et le coût avant/après (image 65) ne sont jamais repris comme promesse : la preuve se mesure chez le client.
Ce qui ne s'applique pas, et pourquoi :
- Le salaire d'un ingénieur IA : sans rapport avec le sujet.
- Le cycle de devis en sept étapes : exemple de vente, pas le processus d'un artisan.
- Les économies « de millions par an » : à ne pas reprendre sans source.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Près d'un million de dollars par an pour un ingénieur : annoncé par l'auteur, non vérifié ([00:00]).
- Six devis sur dix renvoyés au début : annoncé par l'auteur, non vérifié ([00:25]).
- Vingt-quatre jours à six, trente et un dollars à six par facture : annoncé par l'auteur, non vérifié ([01:23]-[01:27]).

---

## 23. « I Built an Entire AI Marketing Department That Runs 24/7 » (02/10/2026)

Source : « I Built an Entire AI Marketing Department That Runs 24/7 », @restructureai, https://www.tiktok.com/@restructureai/video/7691897172505152786 · publiée le 02/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:06] Une équipe d'agents IA pour un service marketing, présentée sous le nom « RIS », avec un plan gratuit annoncé.
- [00:06]-[00:22] Quatre agents : recherche, contenus, publicités et un directeur qui fait tourner l'équipe ; ils se transmettent informations ; aucune action sans approbation.
- [00:22]-[00:37] Module un, études : RIS Research est relié à Google Trends, Semrush et la bibliothèque publicitaire de Meta ; il sait qui annonce dans la zone et quelles requêtes apparaissent au petit matin.
- [00:38]-[00:55] Module deux, réseaux : RIS content produit vidéos et posts à partir de la recherche ; conçus dans Canva, planifiés sur quatre réseaux après validation.
- [00:57]-[01:17] Module trois, publicités : campagnes Meta et Google ; rien ne se dépense sans accord ; suivi jusqu'au paiement ; RIS Director envoie chaque matin une page.
- Planche, images 10, 19, 28, 37, 46, 55, 64, 73 : image 19, quatre agents reliés à leurs outils autour d'un centre ; image 37, la recherche tournée à 2 h du matin sur les requêtes de nuit (« ouvert maintenant ») ; image 46, un visuel de questions-réponses conçu dans un éditeur et une bibliothèque de contenus ; image 55, un planning où chaque réseau porte « approuvé par vous » ; image 64, un tableau de campagnes avec revenu par ligne, un journal d'appels et les paiements ; image 73, une conversation du matin avec l'équipe (« rien que je doive savoir ? ») ; un bouton « Take over » est affiché en bas des écrans.
Principes et patterns réutilisables :
- Relier la recherche à la production : le contenu répond aux questions déjà posées ([00:40]-[00:47]).
- Aucune dépense sans accord ([00:57]-[00:59]).
- Mesurer jusqu'au client payant ([01:05]-[01:09]).
- Un résumé quotidien d'une page ([01:11]-[01:17]).
Erreurs à éviter :
- Dit par l'auteur : mesurer les vues ne sert à rien, il faut mesurer le paiement ([01:02]-[01:09]).
- Dit par l'auteur : une publicité ne doit jamais dépenser sans accord ([00:59]).
- Constaté : la vidéo ne montre aucun résultat réel.
- Constaté : elle ne dit rien de la gestion des données personnelles des prospects.
Ce qui s'applique à Presti / à ce client :
- La conversation du matin (image 73) est l'ouverture de l'assistant de gestion dans « Aujourd'hui » (L5, B4) : la page unique y arrive comme un message, sans nom d'agent ni de modèle (vocabulaire interdit, §7 du plan). Le fond est `presti-briefing-matin` (L15).
- Le planning où chaque réseau porte « approuvé par vous » (image 55) est la carte de lot (L16) pour les publications de Presti : 2 ou 3 lots validés par Benj, puis l'automatique sous contrôle qualité (`autonomie-abonnements.md`).
- Le suivi jusqu'au paiement (image 64) s'arrête, chez Presti, à la facture émise : aucun accès bancaire, jamais un paiement sans l'artisan ; l'entonnoir lien → demande → devis → facture est déjà mesuré.
- Les requêtes de nuit (image 37) rappellent le tri par urgence de la fiche 9 : la perte d'eau classée urgente (`lib/pilote/regles.ts:191`) ; la recherche elle-même passe par SearXNG sur Oracle.
Ce qui ne s'applique pas, et pourquoi :
- Canva et la planification sur quatre réseaux : outils et canaux propres à cet exemple.
- La recherche des mots-clés publicitaires des concurrents : pratique à vérifier avant reprise.
- Le produit RIS lui-même : vidéo de promotion, pas une source de fonctionnement vérifiable.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Quatre agents : annoncé par l'auteur, non vérifié ([00:06]).
- Une requête tapée au petit matin, exemple narratif : annoncé par l'auteur, non vérifié ([00:33]).
- Quatre réseaux de publication : annoncé par l'auteur, non vérifié ([00:55]).

---

## 24. « OpenAI Dots Can Run an Entire AI Marketing Team » (01/10/2026)

Source : « OpenAI Dots Can Run an Entire AI Marketing Team », @restructureai, https://www.tiktok.com/@restructureai/video/7691530206690954517 · publiée le 01/10/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:11] Branchement d'« OpenAI Dots » à une équipe marketing IA ; marketing actif en continu ; le propriétaire garde la décision finale.
- [00:12]-[00:21] Recherche : Dots suit concurrents, publicités, pages d'atterrissage, prix et offres ; il regarde sans pouvoir modifier.
- [00:21]-[00:29] Un concurrent baisse son prix : Dots le repère en une demi-seconde ; l'outil entendu « Jeff » décide si c'est important, et l'équipe est prévenue.
- [00:29]-[00:44] Contenu : Claude écrit le post à partir d'un fichier de voix ; Dots fait les visuels dans Canva, les publicités et les posts planifiés ; si une publicité s'use, trois nouvelles versions ; rien ne part sans accord.
- [00:48]-[01:24] Suivi : page d'inscription, formulaire et e-mails construits ; relance automatique si l'inscription traîne ; un orchestrateur route chaque élément ; Dots demande l'accord sur Slack.
- Planche, images 10, 19, 28, 37, 46, 55, 64, 73 : image 19, le terminal « mode : lecture seule » qui enregistre annonces, page d'atterrissage et prix d'un concurrent ; image 28, la même console affiche « write : denied », une baisse de prix et un appel de fonction de décision (« jev.decide », « matters : true ») ; image 37, un fichier de voix écrit une fois, avec la règle « pas de fausse urgence » ; image 46, un cadenas sur quatre brouillons tant qu'aucun accord n'est donné ; image 55, un tableau d'inscriptions sous l'objectif ; images 64, 73, un journal d'événements qui entrent chez l'orchestrateur puis partent vers les agents.
Principes et patterns réutilisables :
- Un fichier de voix écrit une seule fois ([00:31]-[00:36]).
- Surveiller les concurrents sans pouvoir modifier ([00:19]-[00:21]).
- Trancher ce qui compte avant d'alerter ([00:25]-[00:28]).
- Un orchestrateur qui route, et un canal d'approbation unique ([01:00]-[01:14]).
Erreurs à éviter :
- Dit par l'auteur : une publicité qui s'use se remplace, mais jamais sans accord ([00:41]-[00:44]).
- Dit par l'auteur : ne pas laisser un agent publier sans le feu vert ([00:44]).
- Constaté : aucune donnée réelle n'est montrée dans la vidéo.
- Constaté : elle ne dit pas comment l'outil vérifie les données sur les concurrents.
Ce qui s'applique à Presti / à ce client :
- Le refus d'écriture montré à l'écran (image 28, « write : denied ») est le principe à prouver au banc : n8n lit la base par un rôle en lecture seule (`0189_role_lecture_n8n.sql`) et le MCP n8n de Hermes est en lecture seule (`architecture-outils.md`) ; une preuve de refus vaut mieux qu'une promesse.
- La règle « pas de fausse urgence » du fichier de voix (image 37) est la règle des relances de Presti : aucune ne présume l'accord, ne culpabilise ni n'invente une urgence (§0 bis, rang 10 du plan du chantier 4), testée hors ligne sur les textes.
- Un événement entre, l'orchestrateur le route (images 64, 73) : c'est `ent-exemple-parent`, qui réclame les événements échus et appelle la chaîne, sans modèle ni calcul ; le tri « est-ce que ça compte ? » (image 28) précède l'alerte, comme l'anti-bruit de `lib-alerter` (une alerte par workflow, catégorie et fenêtre de 5 min).
- Le cadenas sur les brouillons (image 46) est Studio : rien ne part sans le clic ; la relance quand les inscriptions traînent (image 55) correspond, côté artisan, au devis non relancé (`lib-relancer`) ; la surveillance des prix concurrents n'est pas reprise.
Ce qui ne s'applique pas, et pourquoi :
- Le produit « OpenAI Dots » : annoncé dans le titre, non décrit par une documentation.
- Les pages d'inscription et les e-mails automatisés : hors champ sans règle d'envoi (Brevo, 300 par jour au plus).
- La surveillance de prix des concurrents : pratique commerciale à peser avant reprise.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Une demi-seconde pour repérer un changement de prix : annoncé par l'auteur, non vérifié ([00:21]).
- Trois nouvelles versions d'une publicité : annoncé par l'auteur, non vérifié ([00:42]).
- Marketing actif en continu : annoncé par l'auteur, non vérifié ([00:04]).

---

## 25. « I Built an AI System That Runs an Entire Business » (30/09/2026)

Source : « I Built an AI System That Runs an Entire Business », @restructureai, https://www.tiktok.com/@restructureai/video/7691155026256923925 · publiée le 30/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:08] Plus de deux cents heures de construction annoncées pour un système qui fait tourner l'entreprise ; plan gratuit.
- [00:08]-[00:16] Marketing, ventes, finance et le reste ; chaque grande décision attend l'accord du propriétaire.
- [00:16]-[00:28] Module un, marketing : Claude pilote le marketing comme une équipe de lancement ; l'outil entendu « Jeff » note chaque publicité sur les vrais prospects, pas sur les mentions « j'aime ».
- [00:30]-[00:48] Module deux, ventes : un prospect écrit à vingt-trois heures ; réponse en moins d'une minute, prise de rendez-vous, appel transformé en devis par Claude, relance jusqu'à un oui ou un non.
- [00:48]-[01:05] Module trois, finance : un rapport d'une page chaque matin ; Jeff signale ce qui perd de l'argent ; Claude en explique la cause ; les factures en retard sont relancées.
- [01:05]-[01:18] Claude Code joue le rôle de chef de cabinet ; Jeff prend les décisions rapides ; quarante et un agents, neuf départements ; alerte d'abord si quelque chose casse.
- Planche, images 10, 19, 28, 37, 46, 55, 64, 73 : image 10, une règle à trois issues pour chaque publicité (la pousser si elle amène de vrais contacts, corriger l'accroche si elle fait cliquer sans contact, la couper si elle perd de l'argent) ; image 37, un message reçu à 23 h et une réponse qui propose deux créneaux au choix ; image 46, trois classes de contact (chaud, tiède, froid) et un devis rédigé ; images 55 et 64, la finance, qui ouvre sur « l'argent que vous perdez déjà » avec une publicité qui perd chaque jour ; image 73, le centre de commande, avec la liste de ce que Claude pense et de ce que « Jev » tranche vite.
Principes et patterns réutilisables :
- Une équipe d'agents par fonction, un résumé chaque matin ([00:48]-[00:54]).
- Répondre en moins d'une minute aux prospects ([00:36]-[00:41]).
- Mesurer l'argent perdu avant de chercher de l'argent nouveau ([01:02]-[01:05]).
- Une alerte dès qu'un agent casse ([01:12]-[01:16]).
Erreurs à éviter :
- Dit par l'auteur : répondre le lendemain, c'est perdre le prospect ([00:30]-[00:36]).
- Dit par l'auteur : une décision importante reste à l'humain ([00:14]-[00:16]).
- Constaté : aucun résultat chiffré n'est montré dans la vidéo.
- Constaté : elle ne décrit ni la gestion des erreurs ni la validation des devis.
Ce qui s'applique à Presti / à ce client :
- Les trois classes de contact (image 46 : chaud passe devant, tiède suivi jusqu'à un oui ou un non, froid mis de côté) sont la qualification de `lib-qualifier-lead` : une note, une priorité et un délai cible, calculés par le code selon la grille du client.
- La réponse de 23 h avec deux créneaux (image 37) est à ne pas reprendre telle quelle : l'IA de Presti n'invente jamais un créneau et ne prend aucun rendez-vous seule (anti-fabrication, `CLAUDE.md`) ; elle demande la suite concrète (photo, dimensions) et l'artisan fixe le rendez-vous.
- « L'argent déjà perdu d'abord » (images 55, 64) est l'ordre des détecteurs, classés par argent récupéré (§9 du plan du chantier 4) : l'impayé (détecteur 1) ouvre la page du matin (`presti-briefing-matin`, L15).
- L'alerte dès qu'un agent casse [01:12]-[01:16] : `lib-erreur-commune` et `lib-alerter` (Slack #presti-auto et Telegram de Benj, sans donnée de client) ; `lib-battement` signale un parent sans signe depuis 26 h.
- La répartition « Claude pense, Jev tranche vite » (image 73) est celle des paliers de modèle (`routerModele`, `lib/ai/routage`) ; pour un montant, le code tranche, pas un modèle.
Ce qui ne s'applique pas, et pourquoi :
- L'architecture de quarante et un agents et neuf départements : annoncée, non détaillée.
- Le modèle « un système qui fait tourner toute l'entreprise » : ambition large, hors d'un outil à usage précis.
- La finance pilotée par un rapport : rôle comptable à ne pas automatiser sans validation.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Plus de deux cents heures de construction : annoncé par l'auteur, non vérifié ([00:00]).
- Quarante et un agents : annoncé par l'auteur, non vérifié ([01:12]).
- Quarante dollars de perte par jour sur une publicité : annoncé par l'auteur, non vérifié ([00:57]).

---

## 26. « How to Build a One-Person AI Marketing Team » (28/09/2026)

Source : « How to Build a One-Person AI Marketing Team », @restructureai, https://www.tiktok.com/@restructureai/video/7690415464907934996 · publiée le 28/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Trois étapes pour une équipe marketing d'une seule personne ; un objectif, et le système fait recherche, contenu, campagne et suivi.
- [00:13]-[00:25] Étape un, répartir les tâches : recherche, contenu, publicités, réseaux sociaux, analyse ; Perplexity pour la recherche, Claude ou ChatGPT pour transformer les idées en contenu.
- [00:25]-[00:39] Étape deux, relier : un centre marketing au milieu ; la recherche envoie une idée, le contenu la transforme, la publication attend l'accord, puis l'analyse renvoie les résultats.
- [00:39]-[00:58] Make, Zapier ou n8n pour relier les outils ; l'auteur insiste sur un seul système, pas une pile d'outils.
- [01:01]-[01:20] Étape trois, décider : l'IA travaille, l'humain approuve avant toute publication ou toute dépense.
- Planche, images 10, 19, 28, 37, 46, 55, 64, 73 : une suite de schémas en volume, sans écran réel : image 10, un centre relié à quatre fonctions et à une personne ; image 28, cinq couches empilées (recherche, contenu, publicité, réseaux, analyse) ; images 37 à 55, les couches reliées au centre, avec les logos de trois outils d'intégration ; image 73, une personne en haut qui reçoit sur un téléphone une demande de valider une publication et une dépense, un cadenas ouvert après son accord.
Principes et patterns réutilisables :
- Répartir par fonction avant de choisir l'outil ([00:13]-[00:18]).
- Un centre qui reçoit et répartit les résultats ([00:33]-[00:44]).
- Boucle de retour de l'analyse vers la production ([00:44]-[00:49]).
- Approbation avant toute dépense ([01:05]-[01:10]).
Erreurs à éviter :
- Dit par l'auteur : ne pas laisser les outils travailler seuls ([00:30]-[00:33]).
- Dit par l'auteur : une pile d'outils sans liaison n'est pas un système ([00:53]-[00:58]).
- Constaté : pas de démonstration ni de résultat dans la transcription.
- Constaté : la vidéo ne décrit pas comment les données circulent entre Make, Zapier ou n8n.
Ce qui s'applique à Presti / à ce client :
- Les cinq couches empilées (image 28) et leur liaison par un centre (images 37 à 55) sont l'architecture déjà posée pour l'Entreprise : un parent qui route (`ent-exemple-parent`) au-dessus de couches (capture, qualification, décision, rédaction, conformité, exécution, journal ; p5:157). La vidéo n'apporte rien de plus ; elle confirme.
- Les trois logos d'outils d'intégration (image 64) sont celui du choix déjà fait : n8n pour toute automatisation (ADR-001) ; Make et Zapier sont écartés.
- « Vous décidez » (image 73) : le gérant au rang 0 valide les publications et les dépenses ; le cadenas qui s'ouvre après accord est `lib-porte-conformite`, dont le veto tient même si le client règle l'automatique.
Ce qui ne s'applique pas, et pourquoi :
- Le choix des outils cités (Perplexity, Claude, ChatGPT) : produits à évaluer, pas des choix validés.
- Le marketing de publication sur plusieurs réseaux : hors de l'activité décrite.
- L'idée « une seule personne » : la vidéo ne traite pas d'une équipe réelle.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Trois étapes : annoncé par l'auteur, non vérifié ([00:00]).
- Tout en quelques minutes : annoncé par l'auteur, non vérifié ([00:09]).
- Un seul système pour tous les outils : annoncé par l'auteur, non vérifié ([01:14]).

---

## 27. « I Built an Entire Social Media Team With 0 Employees » (25/09/2026)

Source : « I Built an Entire Social Media Team With 0 Employees », @restructureai, https://www.tiktok.com/@restructureai/video/7689302802555866369 · publiée le 25/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:12] Une équipe de réseaux sociaux pour une seule personne : recherche, contenu, publication, rapport ; rien ne part sans validation.
- [00:15]-[00:29] Module un, recherche : Claude analyse une niche comme un stratège ; tendances, posts concurrents qui marchent, questions des commentaires ; comparaison des accroches des vidéos les plus vues.
- [00:34]-[00:46] Module deux, contenus : une semaine de contenus (vidéos courtes, carrousels, légendes) ; chaque accroche part de ce qui marche, adaptée au créateur ; file d'approbation.
- [00:51]-[01:03] Module trois, publication et communauté : publication après approbation, au bon moment sur chaque plateforme ; réponses aux commentaires et messages ; les demandes de prix sont signalées comme prospects.
- [01:05]-[01:17] Claude Code suit l'argent et non les « j'aime » ; résumé quotidien d'une page.
- Planche, images 10, 28, 37, 46, 55, 64, 73 : image 28, une étude de niche avec une grille de vidéos concurrentes et une liste d'accroches ; image 37, des modules de contenu (accroches, scénarios, légendes, carrousels, miniatures, voix, vérificateur de marque) ; image 46, une file d'approbation avec « Approve » par ligne et « Approve all » en tête ; image 64, des messages privés « combien ça coûte ? » étiquetés comme prospects ; image 73, une page du matin avec les messages lus, les prospects et le chiffre d'affaires.
Principes et patterns réutilisables :
- Analyser les accroches des vidéos qui marchent avant d'écrire ([00:25]-[00:29]).
- Une file d'approbation à chaque étape ([00:46]).
- Repérer les prospects dans les commentaires ([00:58]-[01:01]).
- Relier les clics aux clients payants ([01:07]-[01:10]).
Erreurs à éviter :
- Dit par l'auteur : compter les « j'aime » plutôt que les clients ([01:05]).
- Dit par l'auteur : une demande de prix dans un commentaire, laissée sans réponse, est un prospect perdu ([00:58]-[01:03]).
- Constaté : pas de résultat chiffré ; la vidéo ne montre aucune file d'approbation en action.
- Constaté : la vidéo ne dit pas comment les réponses automatiques sont relues avant envoi.
Ce qui s'applique à Presti / à ce client :
- La file avec « Approve » par ligne et « Approve all » en tête (image 46) est la carte de lot (L16) : retenus, exclus et leur motif, validés d'un geste ; ce format sert aux publications de Presti après les 2 ou 3 premières validées par Benj (`autonomie-abonnements.md`).
- Les messages « combien ça coûte ? » étiquetés prospects (image 64) sont le tri par intention (fiche 2). Chez l'artisan, une demande de prix devient une conversation avec une réponse préparée, jamais un prix deviné (anti-fabrication, prix sourcés ou marqués estimés).
- La réponse automatique aux commentaires est une capacité pour les publications de Presti, à construire dans n8n (fiche 10), sans publication sans URL relue.
- La page du matin (image 73) : `presti-briefing-matin` (L15).
Ce qui ne s'applique pas, et pourquoi :
- La recherche de vidéos concurrentes et d'accroches : pratique de créateur de contenu.
- Les réponses automatiques aux commentaires : à encadrer selon les règles de la plateforme.
- Une équipe à zéro employé : modèle d'un seul créateur, pas d'une entreprise locale.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Une semaine de contenus : annoncé par l'auteur, non vérifié ([00:34]).
- Trois modules : annoncé par l'auteur, non vérifié ([00:15]).
- Publication sur chaque plateforme au bon moment : annoncé par l'auteur, non vérifié ([00:51]).

---

## 28. « I Built An Entire AI Sales Department For a Car Dealership » (24/09/2026)

Source : « I Built An Entire AI Sales Department For a Car Dealership », @restructureai, https://www.tiktok.com/@restructureai/video/7688940278731902216 · publiée le 24/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Quarante-deux agents IA pour un service commercial de concessionnaires ; quatre équipes ; plan annoncé gratuit.
- [00:09]-[00:21] Au sommet, un directeur commercial IA qui répartit les tâches entre les responsables d'équipe ; on peut parler au directeur, à un responsable ou à un agent.
- [00:21]-[00:36] Équipe centre d'appels : rédaction de courriels, téléphone, textos, agents en huit langues ; le plateau de vente prépare chaque client (prix concurrents, client le plus susceptible d'acheter, plan d'échange).
- [00:41]-[00:52] Financement : prêts, assurance, devis, paperasse ; gestion commerciale : fiches clients, stock, planning, formation.
- [00:54]-[01:06] Agents qui se parlent : le chercheur transmet ses notes au rédacteur, l'analyse d'appel prépare une relance ; « un seul organigramme ».
- Planche, images 8, 29, 36, 50, 57 : image 8, l'auteur face caméra (l'audio ne le dit pas) ; image 29, une boîte de réception d'équipe avec des messages non lus ; image 36, une fiche de client préparée avant un rendez-vous (prix de concurrents, estimation de reprise, note de probabilité d'achat) ; image 50, un inventaire en grille ; image 57, un écran « parler à n'importe qui dans l'organisation » qui liste les agents par nom.
Principes et patterns réutilisables :
- Organiser en équipes à responsabilité claire ([00:08]-[00:13]).
- Un agent chef qui route les tâches ([00:16]-[00:21]).
- Transmettre les notes entre agents, pas seulement les réponses ([00:54]-[00:58]).
- Préparer le vendeur avant chaque rendez-vous ([00:32]-[00:41]).
Erreurs à éviter :
- Dit par l'auteur : préparer le vendeur avant le rendez-vous est le point de départ ([00:36]-[00:41]).
- Dit par l'auteur : une relance prête à envoyer évite qu'un client tombe entre les mailles ([00:58]).
- Constaté : aucun résultat chiffré n'est donné.
- Constaté : la vidéo ne dit rien du cadre réglementé des prêts ni du contrôle des offres de financement.
Ce qui s'applique à Presti / à ce client :
- L'écran « parler à n'importe qui » (image 57) est ce que Presti ne montre pas : l'artisan n'a qu'un interlocuteur, l'assistant de gestion, qui route ; aucun organigramme d'agents, aucun nom de Hermes à l'écran (`architecture-outils.md`, vocabulaire interdit du §7 du plan du chantier 4).
- La fiche préparée avant un rendez-vous (image 36) rejoint la fiche de visite proposée à la fiche 18 : les seules données de la demande et de ses photos ; une estimation de prix ne s'y affiche que marquée « estimé », jamais comme un prix sourcé.
- « Transmettre les notes, pas seulement les réponses » [00:54]-[00:58] est le contrat de sortie de chaque enfant n8n (p5:159-162) ; le chef qui route est `ent-exemple-parent`, sans modèle.
Ce qui ne s'applique pas, et pourquoi :
- Les offres de financement et d'assurance : secteur réglementé, décrit sans règle.
- Les quarante-deux agents : architecture d'une grande équipe, sans rapport avec un prestataire seul.
- Le métier de concessionnaire automobile : hors du champ de cette fiche.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Quarante-deux agents : annoncé par l'auteur, non vérifié ([00:00]).
- Huit langues : annoncé par l'auteur, non vérifié ([00:29]).
- Quatre équipes : annoncé par l'auteur, non vérifié ([00:08]).

---

## 29. « I Built an Entire AI Marketing Department for a Law Firm » (23/09/2026)

Source : « I Built an Entire AI Marketing Department for a Law Firm », @restructureai, https://www.tiktok.com/@restructureai/video/7688557375992679698 · publiée le 23/09/2026 · lue le 02/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:06] Un système marketing IA pour un cabinet d'avocats local, « trente-cinq mille dollars » annoncés ; plan gratuit.
- [00:06]-[00:18] Vue d'ensemble : étude de marché, contenus, publicités, accueil, relance, avis, rapport ; l'avocat garde la validation.
- [00:21]-[00:34] Module un, étude de marché : Claude étudie le marché local comme un dossier ; qui annonce dans le comté, sur quels mots-clés, et quelles requêtes apparaissent au petit matin.
- [00:34]-[00:50] Module deux, réseaux : vidéos et posts répondent aux questions déjà posées ; rédigés dans la voix du cabinet ; file d'approbation par un avocat.
- [00:50]-[01:05] Module trois, publicités : Claude écrit les campagnes par domaine de droit et suit l'argent, pas les impressions ; quel appel a donné une consultation, quelle consultation a donné un dossier signé.
- [01:05]-[01:13] Claude Code, « directeur marketing qui ne prend jamais de jour » ; résumé d'une page chaque matin pour l'associé directeur.
- Planche, images 17, 25, 33, 49, 57, 65 : image 17, un relevé du marché local qui note que la plupart des cabinets concurrents annoncent un prix (maquette) ; image 25, la liste des requêtes tapées à 2 h du matin ; images 33, 49, un planning de publications avec « Approve & schedule » et « Request edit » sous chaque post ; images 57, 65, un tableau de campagnes par domaine de droit, avec budget, appels, consultations et dossier signé, des barres vertes ou rouges par ligne.
Principes et patterns réutilisables :
- Une étude de marché alimente les contenus ([00:34]-[00:38]).
- Une file d'approbation tenue par la personne qualifiée ([00:46]-[00:50]).
- Découper les campagnes par domaine d'activité ([00:54]-[00:56]).
- Suivre le dossier signé, pas l'impression ([00:58]-[01:02]).
Erreurs à éviter :
- Dit par l'auteur : suivre les impressions est trompeur, il faut suivre le dossier signé ([00:54]-[01:02]).
- Dit par l'auteur : rien ne doit sortir sans l'accord du professionnel ([00:18]-[00:21]).
- Constaté : aucun résultat réel n'est donné dans la transcription.
- Constaté : la vidéo ne traite pas des règles de publicité des professions réglementées.
Ce qui s'applique à Presti / à ce client :
- « Approve & schedule » et « Request edit » (images 33, 49) sont la carte à deux gestes de Presti : Valider ou Modifier (L5, L16) ; la personne qualifiée valide, c'est l'artisan en Studio.
- Le tableau par domaine, de l'appel au dossier signé (images 57, 65), se transpose par type de prestation (dépannage, rénovation…) : l'entonnoir lien → demande → devis → facture, ventilé par `leads.origine` et par type de demande ; `lib-rapport-hebdo` le rend, avec la source de chaque chiffre.
- Un métier réglementé a des règles de publicité propres : pour l'Entreprise, `lib-porte-conformite` porte des règles par client ; pour l'artisan du bâtiment, les mentions obligatoires d'un devis relèvent de l'agent `presti-audit-conformite`.
Ce qui ne s'applique pas, et pourquoi :
- Le marché des cabinets d'avocats : règles de déontologie et de publicité propres au secteur, non examinées ici.
- Les mots-clés juridiques à acheter : sujet sensible, hors du champ de cette fiche.
- La répartition par domaine de droit : spécifique au droit.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Trente-cinq mille dollars : annoncé par l'auteur, non vérifié ([00:00]).
- Deux heures du matin, exemple narratif : annoncé par l'auteur, non vérifié ([00:30]).
- Trois modules : annoncé par l'auteur, non vérifié ([00:06]).
