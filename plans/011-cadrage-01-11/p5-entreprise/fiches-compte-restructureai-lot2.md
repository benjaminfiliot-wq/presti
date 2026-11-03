# Fiches de lecture : lot 2 (vidéos 30 à 47) du compte TikTok @restructureai (tâche 035-009)

> Écrit le 03/11/2026 par Hermes (agents Oracle), tâche 035-009, lot 2 sur 3. Format du modèle `fiches-videos-restructureai.md`.
> Entrées : `/home/usine/agents/videos/references-2026-11-02/restructureai/` (`<id>.transcription.json`, `<id>.info.json`). Rien n'a été téléchargé.
> Chaque fiche repose sur la transcription (Whisper local) et sur le `info.json` (titre, date, durée). Les horodatages [mm:ss] sont les débuts de segments de la transcription.
> Descriptions d'images : les lignes « Planche, images … » de « Ce qu'elle montre » et le champ « Ce qui s'applique à Presti » sont de Claude Code (tâche 035-014, 03/11/2026), écrits d'après la planche de 9 images de chaque vidéo. Les fiches 38 et 43 (12 s, sans parole) reposent sur la planche seule.
> Erreurs de transcription à garder en tête : « Jeff » désigne un outil de tri non identifié ; « Manichat » = Manychat ; « Higgs Field » = Higgsfield ; « Appify » = Apify ; « Magix » = Magic ; « Genetic AI » = agentic AI ; « Metrical » = Metricool ; « Build.com » = Bill.com.
> Durées réelles : de 12 s (38 et 43, sans parole) à 134 s (36). Tous les horodatages cités sont inférieurs à la durée de leur vidéo.

---

## 30. « Jev AI Inside a Marketing System Is INSANE » (22/09/2026)

Source : « Jev AI Inside a Marketing System Is INSANE », @restructureai, https://www.tiktok.com/@restructureai/video/7688217790012050695 · publiée le 22/09/2026 · durée 95 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:06] Annonce : un outil entendu « Jeff » (non identifié) a analysé 700 publicités concurrentes ; coût annoncé « 2,7 cents en 41 secondes » [00:06].
- [00:13]-[00:27] Recherche : chaque lundi, l'outil classe chaque publicité par offre, appel à l'action, preuve ou urgence ; la vidéo conclut que plus de la moitié des concurrents affichent un prix et presque aucun une preuve.
- [00:29]-[00:46] Contenu : Claude écrit le post à partir d'un fichier de voix, d'offre et de règles ; l'outil relit chaque brouillon et renvoie au propriétaire ce qui doute.
- [00:46]-[01:10] Boîte de réception : tri des commentaires et messages privés (achat, plainte, spam, colère, urgence) ; les acheteurs vont vers Manychat, les plaintes vers le propriétaire.
- [01:10]-[01:26] Orchestrateur : décide en une demi-seconde qui traite chaque événement ; Claude se connecte via MCP ; « Claude writes, Jeff decides » [01:26].
- Planche, images 1, 11, 31, 41, 51, 61, 71, 81 : image 1, titre « The one-person marketing team » et la légende « I plugged Jev into » (l'icône que l'audio rend par « Jeff » est étiquetée « Jev ») ; image 11, un module « Research & intelligence » (audience, concurrents, tendances, liens, synthèse) ; image 31, un module « Content engine » (brouillon, score de page, briefs, relecture, « Brand gate », variantes) ; image 41, une relecture « Does it promise » avec des lignes à valider ; images 51 et 61, un module « Audience & email » dont une boîte de réception qui classe messages privés et commentaires, avec une réponse proposée ; image 71, un orchestrateur en six pas (collecte, notes, brief, brouillon, planification, approbation) ; image 81, un rond « Jev decides » qui distribue vers Research agent, Content agent, Inbox agent et « You ».
Principes et patterns réutilisables :
- Un fichier de règles écrit une fois (voix, offre, règles) sert à chaque agent [00:29]-[00:35].
- Un doute remonte à l'humain : si l'outil n'est pas sûr, il envoie au propriétaire [01:18]-[01:21].
- Un seul orchestrateur choisit le destinataire, il ne fait pas le travail [01:10]-[01:16].
- Garder le dernier oui humain avant publication : « the final yes is still yours » [00:46], soit « le dernier oui reste le vôtre ».
Erreurs à éviter :
- Dit par l'auteur : « 800 messages sous 2 cents » [01:05] ; le coût par action sert de preuve du système.
- Constaté : aucun résultat commercial n'est montré ; les écrans ne sont pas décrits ici.
- Constaté : la vidéo ne dit rien du traitement des messages privés (consentement, règles de la plateforme).
Ce qui s'applique à Presti / à ce client :
- « Claude writes, Jeff decides » [01:26], image 81 : le rond « Jev decides » envoie chaque événement vers un agent ou vers le propriétaire. C'est le patron de l'orchestrateur Entreprise, un workflow parent qui route sans modèle (`ent-exemple-parent`, 035-007 ; hiérarchie §4.2 de `premiere-reponse.md`) ; le modèle n'intervient qu'à l'étape de rédaction (`lib-rediger-message`). Le propriétaire y est un destinataire parmi les autres (rang 0).
- Image 71, texte lu sur la planche (petit) : seuls les changements de budget et les cas limites arrivent au propriétaire. C'est l'idée de L5, « À valider, l'argent d'abord » (accueil « Aujourd'hui », 032-041) : une liste courte où l'argent passe en tête, le reste part selon l'offre (Studio, rien sans le clic, `lib/plans.ts:11` ; Signature, les types prévus).
- La « Brand gate » et « Does it promise » [00:46]-[01:10], images 31 et 41 : une relecture qui retient un brouillon qui promet trop. Chez Presti, c'est le veto de `lib-porte-conformite` pour l'Entreprise et les garde-fous anti-fabrication des prompts de `lib/ai.ts` (jamais un prix, un délai ou un créneau inventé). Un doute remonte à l'humain [01:18]-[01:21], comme l'escalade de `lib/pilote/regles.ts:191`.
- Le tri des commentaires et messages [00:46]-[01:10], images 51 et 61 : côté Presti, la demande d'un prospect est classée par l'intention détectée dans `lib/ai.ts`, et une demande restée sans réponse remonte par le détecteur 6 (chantier 4, L3 n8n). La réponse proposée attend le clic en Studio. Aucune réponse automatique à un message privé de réseau social sans consentement.
- Le fichier de voix, d'offre et de règles [00:29]-[00:35] : c'est « Décrire mon entreprise » (A6, mise en route L14) et la fiche de découverte 035-002 (§5.2), relues par le client ; le ton de l'artisan est déjà prouvé par `scripts/persona-e2e.mjs`.
- Le classement hebdomadaire d'annonces de concurrents par offre, preuve ou urgence [00:13]-[00:27], image 11 : idée nouvelle pour les contenus de Presti, à proposer à Benj, dans n8n, avec une source déclarée (SearXNG ou Firecrawl auto-hébergé sur Oracle, jamais Firecrawl en ligne ni Apify).
- Le coût par action [00:06] n'est pas repris comme preuve : un chiffre n'entre dans un rapport que s'il a sa source (`lib-rapport-hebdo`).
Ce qui ne s'applique pas, et pourquoi :
- L'outil « Jeff » : non identifié, la vidéo ne donne aucun détail technique.
- La collecte de publicités concurrentes : source et droit d'usage non dits.
- Les réponses automatiques aux messages privés : aucun mot sur le consentement des personnes.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 700 publicités concurrentes » chaque lundi [00:00] : annoncé par l'auteur, non vérifié.
- « 2,7 cents en 41 secondes » [00:06] : annoncé par l'auteur, non vérifié.
- « 800 messages sous 2 cents » [01:05] : annoncé par l'auteur, non vérifié.

---

## 31. « I Spent $5,000 on AI Tokens to Run 36 Agents for an E-commerce Store » (21/09/2026)

Source : « I Spent $5,000 on AI Tokens to Run 36 Agents for an E-commerce Store », @restructureai, https://www.tiktok.com/@restructureai/video/7687815798341061905 · publiée le 21/09/2026 · durée 114 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:05] Annonce : 5 000 $ de jetons IA pour faire tourner 36 agents dans une boutique e-commerce.
- [00:07]-[00:20] Structure : marketing sur Meta, TikTok et Google Ads ; ventes sur Shopify, Gorgias et Rebuy ; tout relié par API et MCP vers une base unique.
- [00:22]-[00:45] Recherche : agents qui relèvent les boutiques concurrentes, les avis, les tendances Google et TikTok, et la bibliothèque publicitaire Meta ; l'écart devient un brief.
- [00:51]-[01:16] Ventes : stock vérifié dans Shopify, lot Rebuy autour du produit gagnant ; les objections relevées au tunnel de commande remontent au marketing.
- [01:22]-[01:37] Un « CIO » (chief intelligence officer, dit l'auteur) porte l'objectif unique du propriétaire ; calcul de seuil de rentabilité et comparaison avec quatre postes.
- Planche, images 1, 13, 25, 37, 61, 85, 97 : image 1, un schéma d'ensemble titré « $5,000 in AI tokens, AI e-commerce OS » ; image 13, des blocs « Sales & conversion » (boutique et paiement, support et FAQ, ventes liées) et « Performance » (attribution, comportement du site, entrepôt de données, tableaux de bord) ; image 25, un chef d'orchestre relié à trois rangées d'agents ; image 37, un entonnoir de plusieurs sources (marchés en ligne, TikTok, Meta) vers un agent ; image 61, quatre publicités dont deux cochées et deux barrées, puis une commande « optimize » qui met en pause deux d'entre elles et en pousse une ; image 85, une carte « CIO, Chief Intelligence Officer » (revenu, marge, budget) avec la phrase « One goal, every agent » ; image 97, Claude au-dessus d'une base de données.
Principes et patterns réutilisables :
- Une couche de données unique sous les agents, chaque département lit son historique [00:14]-[00:26].
- Une objection ou une rupture de stock devient un signal pour le marketing [01:13]-[01:16].
- Un objectif unique (revenu, marge, budget) pour tous les agents, posé par le propriétaire [01:27]-[01:30].
- Couper vite les publicités qui perdent et renforcer les gagnantes [00:58]-[00:59].
Erreurs à éviter :
- Dit par l'auteur : « the agents don't need to be perfect » [01:48] ; soit « les agents n'ont pas besoin d'être parfaits ».
- Constaté : la comparaison salariale ne tient pas compte des ventes réalisées ni des frais d'outils et de mise en place.
- Constaté : aucun résultat de ventes n'est donné dans la transcription.
Ce qui s'applique à Presti / à ce client :
- « One goal, every agent » [01:22]-[01:37], image 85 : un seul objectif posé par le propriétaire, que tous les agents servent. Chez Presti, c'est la fiche de découverte d'un client Entreprise (035-002) et ses KPIs (§7.3 de `premiere-reponse.md`) ; le « CIO » n'est pas un agent mais le rapport hebdomadaire `lib-rapport-hebdo`, qui refuse un chiffre sans source. Le calcul du seuil de rentabilité est fait par le code, pas par un modèle.
- Une couche de données unique sous les agents [00:14]-[00:26], image 97 : c'est Supabase, source de vérité, que n8n lit en lecture seule depuis `0189_role_lecture_n8n.sql` ; aucun accès bancaire ni comptable chez Presti.
- Une objection ou une rupture qui remonte au marketing [01:13]-[01:16] : pour un artisan, une demande refusée ou un devis resté sans suite revient dans l'entonnoir (`leads.origine`, détecteurs 6 et 1 du chantier 4, L3 n8n) ; c'est une idée de lecture, pas une action automatique.
- La commande qui met en pause des publicités et en pousse une [00:58]-[00:59], image 61 : l'achat média piloté par agent n'est pas repris ; toute dépense publicitaire attend l'accord de Benj (`securite.md`). Le ménage des perdants, s'il existe un jour, sera un workflow n8n derrière un plafond écrit.
- Le relevé de boutiques et d'avis concurrents [00:22]-[00:45] : voir « ne s'applique pas » ; seuls SearXNG, Firecrawl auto-hébergé, Crawlee et ScrapeGraphAI sur Oracle sont admis (`architecture-outils.md`).
Ce qui ne s'applique pas, et pourquoi :
- Le scraping de boutiques et d'avis Amazon (« Appify » dans la transcription) : interdit chez Presti (`.claude/rules/architecture-outils.md`, voir `.hermes.md`).
- L'achat média piloté par agents (Meta, TikTok, Google) : aucun plafond de dépense n'est montré.
- Les outils de boutique (Shopify, Gorgias, Rebuy, Triple Whale) : propres à un e-commerce.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 5 000 $ de jetons IA » et « 36 agents » [00:00] : annoncé par l'auteur, non vérifié.
- Seuil de rentabilité « 20 000 par mois » [01:37] : annoncé par l'auteur, non vérifié.
- « plus de 30 000 par mois en salaires » [01:46] : annoncé par l'auteur, non vérifié.

---

## 32. « I Built an Entire Sales and Marketing Team With 0 Employees » (18/09/2026)

Source : « I Built an Entire Sales and Marketing Team With 0 Employees », @restructureai, https://www.tiktok.com/@restructureai/video/7686718534386322695 · publiée le 18/09/2026 · durée 99 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] Annonce : 56 agents, 9 départements, 27 modules, qui couvrent recherche, contenu, publication, prospects, appels, relances et chiffres.
- [00:19]-[00:37] Marketing : tendances (Google Trends, Semrush, SparkToro), Claude écrit à partir d'un fichier, Higgsfield crée le visuel, Remotion rend la vidéo courte, Metricool la planifie sur chaque canal.
- [00:41]-[00:45] Réponses aux commentaires et messages privés dans la voix de la marque ; l'auteur dit que le dernier oui reste le sien.
- [00:49]-[01:05] Ventes : HubSpot note le prospect et n'envoie que ceux prêts à acheter ; Calendly réserve l'appel dès le oui ; Twilio envoie un SMS de confirmation, puis devis et acompte.
- [01:08]-[01:35] Orchestrateur : Claude Code relié par MCP au CRM, à l'agenda et aux canaux ; LookerStudio renvoie les affaires conclues vers la recherche.
- Planche, images 1, 12, 23, 45, 56, 78, 89 : image 1, titre « The one-person sales & marketing team » ; image 12, les modules « Research & intelligence » et « Content engine » ; image 23, Claude « the brain » relié à Google Trends, Semrush et SparkToro ; image 45, un téléphone fictif où ManyChat répond à un prospect qui demande un essai d'une voiture et propose de choisir une heure dans la semaine ; image 56, une « Leads inbox » alimentée par CallRail (appels) et ManyChat (messages), avec une commande « capture_lead » ; image 78, Claude Code relié au CRM (HubSpot), à l'agenda, aux canaux, aux SMS (Twilio) et aux paiements, avec une commande « sync » puis « reconcile » ; image 89, un tableau « Today's recap » (prospects saisis, essais réservés, ventes, revenu du jour, objectif du mois) et la flèche « Back to research ».
Principes et patterns réutilisables :
- Une boucle : ce qui se vend remonte à la recherche la semaine suivante [01:24]-[01:28].
- L'humain garde le dernier pas : « the final yes is still yours » [00:45], soit « le dernier oui reste le vôtre ».
- Une réservation automatique dès le oui du prospect, avec un SMS de confirmation [01:01]-[01:05].
- Une couche de fichiers simples (voix, offre, règles) sous l'orchestrateur [01:20]-[01:24].
Erreurs à éviter :
- Dit par l'auteur : « Nobody chases anyone » [01:08] ; soit « personne ne relance personne », présenté comme automatique.
- Constaté : aucun cas d'erreur ou de refus n'est montré ; les écrans ne sont pas vérifiés ici.
- Constaté : la vidéo ne dit rien du consentement aux SMS de confirmation et de relance.
Ce qui s'applique à Presti / à ce client :
- Le robot qui propose une heure à un prospect (image 45) et la réservation dès le oui [01:01]-[01:05] : exclu. Presti ne prend aucun rendez-vous seul et n'invente aucun créneau (`lib/ai.ts`, anti-fabrication) ; la réponse préparée propose, l'artisan fixe.
- Les « paiements » reliés au centre (image 78) et le devis suivi d'un acompte [00:49]-[01:05] : exclus. Un paiement ou un acompte ne se prend jamais sans l'artisan (`lib/plans.ts:207`) ; une décision d'argent est calculée par le code, jamais par un modèle.
- La « Leads inbox » qui réunit appels et messages (image 56) : c'est le principe du CRM de l'artisan (capacité `crm`, `lib/plans.ts`) et de l'origine d'une demande (`leads.origine`, `0177_canaux_reseaux.sql`) ; pour l'Entreprise, `lib-capturer-lead` puis `lib-dedoublonner`.
- La boucle « ce qui se vend remonte à la recherche » [01:24]-[01:28], image 89 : `lib-rapport-hebdo` pour l'Entreprise, et la page « Mes chiffres » de l'artisan (capacité `chiffres`) ; un chiffre sans source est refusé. Le tableau « Today's recap » ressemble à `presti-briefing-matin` (L15), qui propose et ne déclenche jamais le pilote.
- Le dernier oui qui reste à l'humain [00:41]-[00:45] : Studio le fait par le clic (`lib/plans.ts:11`) ; en Signature, seuls les types prévus partent seuls. Les SMS de confirmation et de relance [01:01]-[01:05] restent dans `lib/sms/` (liste fermée, consentement), jamais en masse.
Ce qui ne s'applique pas, et pourquoi :
- Higgsfield, Remotion, Metricool : outils de création et de planification, nommés sans configuration.
- Les SMS et appels automatiques : aucun mot sur le consentement ni sur l'opposition.
- Les 27 modules : seuls quelques modules sont nommés.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 56 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « 9 départements, 27 modules » [00:05] : annoncé par l'auteur, non vérifié.

---

## 33. « I Built a 27-Agent AI Office to Run an Entire Car Dealership » (17/09/2026)

Source : « I Built a 27-Agent AI Office to Run an Entire Car Dealership », @restructureai, https://www.tiktok.com/@restructureai/video/7686352740364094740 · publiée le 17/09/2026 · durée 100 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] Annonce : un bureau de 27 agents pour un concessionnaire, mise en place estimée à « 15 000 $ » [00:05] ; six départements, 32 modules.
- [00:12]-[00:20] Présentation sous forme de groupe de discussion : chaque agent est un membre du groupe, chacun gère une partie de l'activité.
- [00:20]-[00:32] Marketing : contenus pour TikTok, Instagram et YouTube, tendances, mots-clés et planification ; une demande en message (« make the content shorter ») refait le contenu.
- [00:38]-[00:57] Ventes : réponses aux DM et commentaires, relances, fiche client dans le chat ; un prospect qui dit oui voit son appel réservé dans l'agenda.
- [00:59]-[01:20] Finance (revenus, dépenses, profit, rapport hebdomadaire) puis agent de direction qui envoie un bref chaque matin.
- Planche, images 1, 23, 34, 45, 56, 67, 78, 89 : image 1, titre « 27-agent office running entire car dealership » ; image 23, une messagerie de téléphone avec une conversation par département (centre de commande, marketing, ventes, saisie des prospects, opérations, finance, support) ; image 34, la conversation marketing : trois images de voiture proposées par Higgsfield ; image 45, la conversation ventes : une fiche de prospect créée dans le CRM (budget et financement confirmés) ; image 56, un créneau d'essai proposé, la réponse du propriétaire « approve », puis la réservation et un SMS de confirmation ; image 67, la finance : un dossier chiffré, une demande à un prêteur, un lien de dépôt envoyé au client et un rapprochement dans QuickBooks ; images 78 et 89, un « Command center » (Claude Code, LangChain, PostgreSQL) qui signale un budget publicitaire en avance sur le rythme, reçoit une consigne du propriétaire et met à jour les consignes de tous les agents.
Principes et patterns réutilisables :
- Un département = un membre de groupe, avec un agent de direction au bout [01:09]-[01:14].
- Modifier le système par message, sans toucher au code [01:24]-[01:27].
- Le propriétaire garde les décisions : « You're still the one making the decisions » [01:32] ; soit « c'est vous qui décidez ».
- Un rendez-vous confirmé dans l'agenda par l'agent de vente [00:52].
Erreurs à éviter :
- Dit par l'auteur : « c'est vous qui décidez » [01:32] ; présenté comme acquis.
- Constaté : aucun cas où un agent se trompe ni de contrôle d'accès n'est montré ; aucun journal d'exécution.
- Constaté : la vidéo ne dit rien sur les données financières qui circulent dans le groupe de discussion.
Ce qui s'applique à Presti / à ce client :
- Un département par fil de discussion [00:12]-[00:20], image 23 : c'est le patron d'une vue par métier pour l'artisan ; chez Presti l'artisan ne parle qu'à l'assistant (chantier 4, accueil « Aujourd'hui », L5) et jamais à des « agents ». Pour l'Entreprise, ce sont des workflows rattachés à un parent (`ent-exemple-parent`), pas des conversations.
- Le « approve » du propriétaire avant la réservation (image 56) : la planche montre une validation que la transcription ne dit pas ; c'est la règle de Studio (`lib/plans.ts:11`). Mais Presti ne réserve pas de créneau seul : l'artisan propose ses créneaux, l'IA n'en invente pas.
- La finance (image 67 : lien de dépôt, demande à un prêteur, rapprochement) : exclue. Pas d'acompte pris par l'IA, aucun accès bancaire ni comptable ; une décision d'argent est calculée par le code.
- Le bref du matin de l'agent de direction [01:09]-[01:20] et la consigne du propriétaire qui se propage (images 78 et 89) : `presti-briefing-matin` (L15) pour le résumé ; une consigne du gérant se traduit par un réglage de sa fiche, jamais par un ordre libre à des agents (`gabarit-synchroniser-outil`, liste d'accès signée).
- Modifier le système par message [01:24]-[01:27] : seulement par la fiche de découverte et ses réglages, en lecture par n8n ; toute automatisation passe par un workflow n8n (ADR-001), jamais par du code en dur.
Ce qui ne s'applique pas, et pourquoi :
- La messagerie de groupe comme interface : aucun client réel n'est montré.
- Les intégrations comptables (Stripe, QuickBooks, Xero) : citées sans détail.
- Le chiffre de mise en place : estimation de l'auteur, sans base détaillée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 27 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « 15 000 $ » de mise en place [00:05] : annoncé par l'auteur, non vérifié.
- « six départements, 32 modules » [00:07] : annoncé par l'auteur, non vérifié.

---

## 34. « There are 3 levels of AI. Most people don't know Level 2 and 3 exist. » (16/09/2026)

Source : « There are 3 levels of AI. Most people don't know Level 2 and 3 exist. », @restructureai, https://www.tiktok.com/@restructureai/video/7685975368976583956 · publiée le 16/09/2026 · durée 66 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:20] Niveau 1 : les grands modèles de langage (GPT-5, Claude, Gemini), entraînés sur du texte, qui répondent, écrivent et traduisent.
- [00:20]-[00:40] Niveau 2 : les agents IA perçoivent, décident et agissent pour atteindre un but ; l'auteur cite Devin, Replit Agent et Manus.
- [00:44]-[00:57] Niveau 3 : l'IA « agentique » crée son propre flux de travail et change de stratégie quand une méthode échoue.
- [01:02]-[01:05] L'auteur dit que c'est ce que construit Restructure AI.
- Planche, images 15, 22, 29, 36, 43, 57 : image 15, des entrées (site, livre, document, réseaux) qui alimentent un « Large Language Model » nommé GPT-5, Claude, Gemini ; image 22, ses sorties (questions-réponses, écriture, code, traduction) ; images 29 et 36, une carte « AI Agent » (Devin, Replit Agent, Manus) avec « Your goal » en entrée et, en sortie, quatre verbes : comprend, planifie, agit, vérifie ; image 43, l'agent relié à Gmail, Agenda, Docs et Sheets, qui rend « a finished result » ; image 57, une courbe de trésorerie Fathom avec un repère « tight » et la phrase qu'il reste du temps pour déplacer un paiement ou envoyer une relance avant la tension. La vidéo est faite de schémas pédagogiques, sans écran de produit.
Principes et patterns réutilisables :
- Une définition simple par niveau : modèle (texte), agent (action vers un but), agentique (flux qu'il crée lui-même) [00:00]-[00:57].
- Un agent fonctionne en boucle : planifier, agir, vérifier, ajuster [00:44]-[00:51].
- La différence entre suivre un flux (agent) et en créer un (agentique) [00:57]-[01:00].
Erreurs à éviter :
- Dit par l'auteur : « most people only know of level one » [00:00] ; soit « la plupart des gens ne connaissent que le niveau 1 ».
- Constaté : les définitions sont générales ; aucun exemple d'exécution réelle n'est montré.
- Constaté : la vidéo ne compare aucun niveau à un résultat mesuré ; le mot « agentique » est transcrit « Genetic AI ».
Ce qui s'applique à Presti / à ce client :
- Les trois niveaux (modèle, agent, agentique) [00:00]-[00:57], images 15 à 43 : un vocabulaire de présentation, pas une mesure. Presti n'en tire rien pour le produit ; en interne, l'orchestrateur Entreprise reste un workflow parent qui route sans modèle (`ent-exemple-parent`, 035-007), donc ni « agent » ni « agentique » devant le client.
- La boucle planifier, agir, vérifier, ajuster [00:44]-[00:51], image 36 : c'est le motif de chaque gabarit `lib-*` (décider, exécuter, journaliser, `lib-erreur-commune`), mais écrit en étapes fixes dans n8n (ADR-001), pas laissé à un modèle qui invente son flux.
- « L'agentique crée son propre flux » [00:57]-[01:00] : refusé. Un flux qui se réécrit seul ne passe pas la règle « mode à blanc avant la production » ni l'idempotence ; seuls les workflows écrits et testés par Claude Code tournent (`migration-production.md`).
- La courbe de trésorerie de l'image 57 : une alerte « avant que ce soit tendu » est une bonne forme pour un impayé ou un trou de planning (détecteur 1, impayé ; `lib/relancesImpayes.ts`), à condition que le calcul soit fait par le code et que la relance reste un message préparé, jamais une action d'argent.
Ce qui ne s'applique pas, et pourquoi :
- Les agents cités (Devin, Replit Agent, Manus) : aucun détail de fonctionnement n'est donné.
- La hiérarchie en trois niveaux : c'est un modèle de présentation, pas une mesure.
- Le lien vers Restructure AI : promotion de l'auteur.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 3 niveaux » d'IA [00:00] : annoncé par l'auteur, non vérifié.

---

## 35. « How the Next Trillion-Dollar Company Will Run Agentic AI Marketing in 2030 » (15/09/2026)

Source : « How the Next Trillion-Dollar Company Will Run Agentic AI Marketing in 2030 », @restructureai, https://www.tiktok.com/@restructureai/video/7685587347966004497 · publiée le 15/09/2026 · durée 114 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] Annonce : un moteur marketing agentique pour 2030, « l'équivalent de 23 employés » [00:04], à cinq modules (présence, prospects, contenu, publicités, rétention).
- [00:15]-[00:37] Présence : une question en tendance dans ChatGPT ; outils SEO (Spark Toro, Ahrefs, ClearScope) ; Claude écrit, Surfer fait ressortir, un outil vérifie la citation.
- [00:40]-[00:58] Publicités : mille variantes par nuit, Meta Advantage+ lance la campagne, Smartly déplace le budget, un outil (« Magix ») coupe les créatifs en baisse, NorthBeam mesure les conversions réelles.
- [01:05]-[01:31] Prospects : Claude enrichit le compte signalé par Apollo, un agent écrit le premier e-mail et traite l'objection, Cal.com réserve la réunion, un CRM enregistre l'affaire.
- [01:32]-[01:46] Un même outil central (Claude via MCP) relie CRM, agenda et comptes publicitaires ; fichiers simples en dessous.
- Planche, images 1, 13, 25, 37, 49, 61, 73, 97 : image 1, titre « How agentic AI will run marketing in 2030 » ; image 13, cinq blocs (présence et recherche IA, génération de prospects B2B, contenu, publicités payantes, fidélisation) avec leurs outils ; image 25, SparkToro, Ahrefs et Clearscope reliés ; image 37, Claude, Surfer, Profound et Otterly.AI reliés à une personne, avec deux boutons « Approve » et « Not approve » ; image 49, Meta Advantage+ et Smartly, avec une commande qui lance la campagne et réalloue le budget en temps réel (pastille « Live ») ; image 61, une carte Madgicx qui marque un visuel en baisse, puis Northbeam qui compare « reported » et « verified » par canal ; image 73, Apollo et Clay qui enrichissent un compte, étiqueté « Enriched ».
Principes et patterns réutilisables :
- Un moteur en boucle : la rétention alimente la présence [00:09].
- Mesurer avec un outil indépendant de la plateforme : « what actually converted not the platform's own math » [00:58], soit ce qui convertit, pas les calculs de la plateforme.
- Couper vite une créative qui s'use avant qu'elle consomme le budget [00:55]-[00:58].
- Viser la réunion dans l'agenda, pas la liste d'appels [01:27]-[01:31].
Erreurs à éviter :
- Dit par l'auteur : « sends it through instantly, which keeps the domain from getting burned » [01:17] ; soit l'envoi instantané, présenté comme un avantage.
- Constaté : l'envoi instantané de courriels à froid est montré sans limite, sans consentement ni règle d'opposition.
- Constaté : aucun résultat mesuré n'est donné ; « 23 employés » n'est pas détaillé.
Ce qui s'applique à Presti / à ce client :
- Les boutons « Approve » et « Not approve » après le contenu (image 37) : la planche montre une validation humaine devant la publication, que la transcription ne dit pas ; c'est Studio (`lib/plans.ts:11`). En revanche la campagne publicitaire de l'image 49 part en « Live » sans bouton : exclu, toute dépense publicitaire attend l'accord de Benj (`securite.md`).
- Mesurer avec un outil indépendant [00:58], image 61 (« reported » contre « verified ») : un chiffre déclaré par la plateforme n'est pas une preuve. Chez Presti, `lib-rapport-hebdo` refuse un chiffre sans source et `leads.origine` (`0177_canaux_reseaux.sql`) compte les demandes réellement reçues.
- L'e-mail à froid envoyé instantanément [01:05]-[01:31], images 73 et 85 : refusé tel quel. La prospection de Presti est automatique mais plafonnée à 300 par jour, avec opt-out, exclusion et journalisation (`email-brevo.md`, ADR-005) ; elle relève du chantier 3 et d'un workflow n8n, pas de l'app.
- Enrichir un compte avant le premier contact (image 73, Apollo puis Clay) : l'idée d'une fiche prospect complétée avant l'envoi est utile au chantier 3 ; les sources autorisées sont celles d'Oracle (SearXNG, Crawlee, ScrapeGraphAI) et aucune donnée de prospect ne va à un modèle gratuit en ligne (`securite.md`).
- Couper une créative qui s'use [00:55]-[00:58] (image 61) et le « moteur marketing 2030 » : contenus de Presti lui-même (chantier 5), mesurés en demandes reçues ; aucune promesse d'équivalent en employés.
Ce qui ne s'applique pas, et pourquoi :
- La prospection automatique à froid : aucun mot sur l'opt-out, l'exclusion ni le quota d'envoi.
- Les outils publicitaires (Meta Advantage+, Smartly, NorthBeam) : pensés pour de gros budgets, sans détail.
- Le titre « trillion-dollar » : la transcription dit « million-dollar » ; c'est une promesse de marketing, sans base.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 23 employés » [00:04] : annoncé par l'auteur, non vérifié.
- « cinq modules » [00:07] : annoncé par l'auteur, non vérifié.
- « un millier de variantes » de créatifs en une nuit [00:42] : annoncé par l'auteur, non vérifié.

---

## 36. « I Built an AI Second Brain That Runs an Entire Car Dealership » (14/09/2026)

Source : « I Built an AI Second Brain That Runs an Entire Car Dealership », @restructureai, https://www.tiktok.com/@restructureai/video/7685213708443782420 · publiée le 14/09/2026 · durée 134 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:31] Processus manuel : un commercial ouvre HubSpot, cherche la voiture, précise année et couleur, puis récupère les photos sur Google Drive. Annonce : un « cerveau IA » qui fait le travail de « 100 employés ».
- [00:31]-[00:57] Cent demandes simultanées : le système répond à chacune, demande marque, modèle, année, couleur, tire les photos du Drive et le stock de HubSpot.
- [01:08]-[01:21] Trois clients pour la même voiture noire et deux restantes : les deux premiers à s'engager sont verrouillés dans HubSpot ; le troisième reçoit une alternative proche.
- [01:21]-[01:46] Le troisième client veut un essai : le système vérifie l'agenda Google Calendar et réserve le créneau.
- [01:54]-[02:04] Le commercial reçoit la fiche (client, heure d'arrivée, voiture, prix, questions) avant le rendez-vous.
- Planche, images 1, 16, 31, 46, 61, 76, 91, 106, 121 : image 1, schéma « map the dealership operating flow » ; image 16, un dossier Drive de photos de voitures et un inventaire HubSpot ; image 31, une demande de client interprétée par une commande de recherche, puis une réponse avec trois photos du véhicule ; image 46, la boîte « AI second brain » dont les cinq composants sont lus : approbation humaine, exécuteur d'actions, orchestrateur, registre d'outils, mémoire d'agent ; image 76, une commande qui trie les clients par heure d'arrivée et verrouille deux véhicules (étiquettes « sold ») pour les deux premiers ; image 91, au troisième client, deux alternatives au même prix ; image 106, une demande d'essai et la réponse « let me check the sales team's calendar » ; image 121, un encadré « Approval needed » avec les boutons « Approve » et « Not approve » pour le créneau, puis un écran « Test drive confirmed » avec des questions suggérées.
Principes et patterns réutilisables :
- Répondre à toutes les demandes en même temps, sans file d'attente humaine [00:31]-[00:42].
- Verrouiller le stock au premier engagement, pour éviter une double vente [01:12]-[01:16].
- Proposer une alternative tout de suite à qui arrive trop tard [01:21]-[01:26].
- Remettre au vendeur une fiche avant le rendez-vous [01:54]-[02:04].
Erreurs à éviter :
- Dit par l'auteur : « Nobody falls through the cracks » [01:32] ; soit « personne ne passe entre les mailles », présenté comme garanti.
- Constaté : la vidéo ne dit rien du traitement d'une erreur de stock ni d'une double réservation manquée.
- Constaté : la réservation et l'agenda sont présentés comme fonctionnels, sans journal.
Ce qui s'applique à Presti / à ce client :
- La planche corrige la lecture de la transcription : la réservation de l'essai ne part pas seule, elle passe par un encadré « Approval needed » (image 121) et la boîte « Human approval » du schéma (image 46). C'est le principe de Studio, rien sans le clic (`lib/plans.ts:11`), mais Presti ne réserve ni ne verrouille un créneau de son propre chef (rendez-vous et créneau inventé exclus).
- Verrouiller le stock au premier engagement [01:08]-[01:21], image 76 : l'équivalent pour un artisan est de ne jamais promettre deux fois la même ressource (matériel, jour de chantier). Presti n'a pas de stock de véhicules ; le vocabulaire de l'inventaire est dans `lib/inventaire/CONTEXT.md`, et l'IA ne cite jamais un fournisseur absent de la liste de l'artisan.
- La fiche remise au commercial avant le rendez-vous [01:54]-[02:04], image 121 (« suggested questions ») : c'est la carte de lot de `lib/assistant/cartes.ts` (retenus, exclus, motif, un geste) et le résumé de `presti-briefing-matin` (L15, n8n) ; la fiche reprend ce que le client a dit, sans rien inventer.
- Répondre à toutes les demandes à la fois [00:31]-[00:42] et proposer une alternative aux retardataires [01:21]-[01:26], image 91 : la réponse écrite en moins d'une minute (`lib/ai.ts`) ; une alternative proposée n'est possible que si elle sort de la liste de l'artisan.
- Les photos d'un Drive (image 16) : droit d'usage non établi, exclu ; une pièce jointe de Presti vient du client ou de l'artisan, jamais d'un tiers.
Ce qui ne s'applique pas, et pourquoi :
- Le concessionnaire et son stock de véhicules : secteur précis, sans détail d'inventaire réel.
- Les photos tirées d'un Drive marketing : aucun mot sur le droit d'usage des images.
- L'essai routier réservé dans l'agenda : propre au concessionnaire.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 100 employés » équivalents [00:00] : annoncé par l'auteur, non vérifié.
- « Cent » demandes simultanées [00:31] : annoncé par l'auteur, non vérifié.
- Deux voitures restantes pour trois clients (exemple de l'auteur) [01:08] : annoncé par l'auteur, non vérifié.

---

## 37. « I Built 40 AI Agents Run Your Entire Law Firm » (12/09/2026)

Source : « I Built 40 AI Agents Run Your Entire Law Firm », @restructureai, https://www.tiktok.com/@restructureai/video/7684471200290065685 · publiée le 12/09/2026 · durée 112 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] Annonce : une équipe de 40 agents pour un cabinet d'avocats ; huit départements, 40 modules, un propriétaire.
- [00:09]-[00:19] Prospects : le système repère un contact entrant, rédige le suivi, prépare le dossier ; « You didn't process the lead. It did. » [00:16]-[00:18] (soit « ce n'est pas vous qui avez traité le prospect »).
- [00:21]-[00:37] Premier module, CRM : un prospect écrit, l'agent demande son besoin, enregistre le contact, réserve la consultation dans HubSpot ; Claude prépare les premières questions, envoi après approbation.
- [00:41]-[00:43] Contrôle de conflit : si le nom figure sur la liste de conflits, rien n'est envoyé.
- [00:49]-[01:09] Module « Matters » : surveille les dossiers, nouveaux documents, échéances, tâches ; met à jour le calendrier.
- [01:09]-[01:26] Temps et facturation : rapprochement des entrées de temps, code UTBMS, revue avant facturation le matin ; un orchestrateur vérifie conflits, échéances et codes.
- Planche, images 1, 13, 25, 37, 49, 61, 73, 97 : image 1, titre « 40 AI agents run your entire law firm » ; image 13, des modules de veille (entrées de prospects, calendrier des dossiers, surveillance continue) ; image 25, un téléphone où un prospect écrit qu'il a besoin d'aide pour un litige de contrat et reçoit la demande de son nom et de son numéro ; image 37, un « conflict check » (client contre dossier, correspondance ou blocage) puis un message « Now qualified lead » avec les boutons « Approve » et « Note » ; image 49, le module « Matters » (dossier, surveillance du registre, documents, calendrier d'échéances, tâches) ; image 61, un calendrier où une audience est déplacée, avec la mention « Consult booked » ; image 73, un « Time entry watcher » qui capte appel, tâche et réunion clos ; image 97, le schéma d'ensemble.
Principes et patterns réutilisables :
- Un contrôle avant toute action : conflit vérifié avant envoi [00:41]-[00:43].
- Des événements déclenchent des actions : un document déposé, une échéance modifiée, une tâche à assigner [00:52]-[00:58].
- Un orchestrateur qui ne fait pas le travail mais choisit qui le fait [01:35]-[01:37].
- Les décisions à enjeu restent au propriétaire : conflits, échéances, tout ce qui sort sous son nom [01:39]-[01:42].
Erreurs à éviter :
- Dit par l'auteur : « Same day, not after the deadline. » [01:02] ; soit « le même jour, pas après l'échéance ».
- Constaté : la vidéo ne dit rien de la confidentialité des dossiers ni de la protection des données clients.
- Constaté : aucun cas d'erreur de conflit n'est montré.
Ce qui s'applique à Presti / à ce client :
- Le contrôle de conflit avant tout envoi [00:41]-[00:43], image 37 : rien ne part si le nom est bloqué. C'est le veto de `lib-porte-conformite` (rang 1 de la hiérarchie) et, côté relances, la table `relances_exclusions` (0185) et `lib/relancesRegistre.ts:18` (jamais deux relances en trois jours) ; le contrôle est fait par le code, pas par un modèle.
- « Approve » puis « Note » sur un prospect qualifié (image 37) : la planche montre un clic de validation avant le premier envoi ; c'est la règle de Studio (`lib/plans.ts:11`). Une demande qualifiée devient une note et une priorité calculées par le code (`lib-qualifier-lead`).
- Des événements qui déclenchent des actions (document déposé, échéance modifiée, tâche à assigner) [00:49]-[01:09], images 49 et 61 : c'est le modèle des détecteurs n8n (`passages_detecteurs`, 0185) et du battement `lib-battement` ; pour un artisan, l'équivalent est le chantier terminé qui déclenche la facture préparée puis l'entretien proposé (L18, `lib/apresChantier.ts`).
- Le temps passé capté tout seul (image 73) et la facturation revue le matin [01:09]-[01:26] : idée nouvelle pour le métier, à proposer à Benj, dans n8n, seulement si le client Entreprise l'exprime à la découverte (035-002) ; la facture reste préparée, jamais envoyée sans l'artisan en Studio.
- Le domaine juridique (secret professionnel, UTBMS) : exclu, voir « ne s'applique pas ».
Ce qui ne s'applique pas, et pourquoi :
- Le domaine juridique (dossiers, UTBMS, secret professionnel) : la vidéo ne décrit ni les règles professionnelles ni la confidentialité.
- Les outils nommés (HubSpot, Front, NetDocuments) : cités sans configuration.
- La liste de conflits : la vidéo ne dit pas comment elle est construite ni mise à jour.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 40 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « huit départements, 40 modules » [00:04] : annoncé par l'auteur, non vérifié.
- Surveillance « 24-7 » des dossiers [01:04] : annoncé par l'auteur, non vérifié.

---

## 38. « AI Market Research Operating System » (10/09/2026)

Source : « AI Market Research Operating System », @restructureai, https://www.tiktok.com/@restructureai/video/7683723549206482193 · publiée le 10/09/2026 · durée 12 s · lue le 03/11/2026 · intégralement : non, transcription vide (« You » seulement) : la planche est la seule source
Ce qu'elle montre :
- Aucune parole exploitable dans la transcription (un seul mot, « You »), et la légende (info.json) s'arrête sur « A local business that knows exactly what its customers... » : tout ce qui suit vient de la planche.
- Planche, images 1 à 3 : un schéma animé titré « AI Market Research Operating System », avec cinq blocs d'abord grisés : « Competitor intel », « Target », « Orchestrate », « Customer voice mining », « Local demand radar ». Le bloc « Orchestrate » (Claude, Claude Code) s'ouvre en premier, avec l'état « booting » puis « dispatching » et un terminal où court une commande d'orchestration de l'étude de marché ; « Target » (Claude, Google Maps, profil d'entreprise) passe à « defined ».
- Planche, images 4 à 6 : « Competitor intel » (Claude, Google Maps, Yelp, sites) passe à « mapped » ; « Customer voice mining » (Claude, avis Google, Reddit, commentaires de Facebook, Instagram, TikTok, YouTube, LinkedIn) à « captured » ; « Local demand radar » (Claude, tendances, Search Console, Semrush) à « validated » ; chaque pas écrit une ligne dans le terminal (avis, fils Reddit, mots-clés, tableau de prix des rivaux, carte de positionnement).
- Planche, images 7 à 9 : « Orchestrate » passe à « running » ; un bandeau « Growth engine · live, every research cycle sharpens the next question » avec la pastille « + market intelligence », puis des compteurs de modules actifs et de pipeline, l'image 12 finissant sur « compounding ». Ce sont des écrans de maquette : ils illustrent, ils ne prouvent rien.
Principes et patterns réutilisables :
- Aucun principe énoncé à l'oral ; la planche en montre un : cinq modules d'étude de marché qui s'allument dans un ordre fixe sous un orchestrateur, chacun avec un état écrit (« defined », « mapped », « captured », « validated », « running ») [images 2 à 9].
- Une boucle : chaque cycle d'étude affine la question du suivant [image 9].
Erreurs à éviter :
- Dit par l'auteur : rien (pas de parole).
- Constaté : l'écran est une maquette animée, sans résultat réel ni source des données ; rien n'est chiffré par l'auteur.
Ce qui s'applique à Presti / à ce client :
- Le séquencement, images 1 à 9 : un orchestrateur démarre (« booting »), puis le cadrage de la cible (« defined »), les concurrents (« mapped »), la voix du client (« captured ») et le radar de demande locale (« validated ») s'allument l'un après l'autre. C'est le patron d'un workflow parent n8n qui appelle des modules dans un ordre fixe, avec un état par module (`ent-exemple-parent`, 035-007 ; `lib-journaliser`), et non des agents qui se coordonnent seuls.
- Le module « Customer voice mining » (image 5 : avis Google, Reddit, commentaires de réseaux) : pour un artisan, la voix du client est la demande reçue sur sa page `/p/[slug]` et par les canaux déjà relevés (`/api/canaux/relever`, `leads.origine`) ; pas de collecte hors de ces canaux, et jamais LinkedIn (`architecture-outils.md`).
- Le module « Local demand radar » (image 6 : tendances, Search Console, Semrush) et le « Competitor intel » (image 4 : Maps, Yelp, sites) : idée nouvelle pour la fiche de découverte d'un client Entreprise (035-002, §5.2) ; à proposer à Benj, dans n8n, avec des sources déclarées d'Oracle (SearXNG, Crawlee, ScrapeGraphAI), jamais Firecrawl en ligne ni Apify.
- La sortie « report » en deux formats et la phrase « Every research cycle sharpens the next question » (images 9 et 12) : une étude qui se relit chaque semaine dans `lib-rapport-hebdo`, qui refuse un chiffre sans source ; les compteurs de la maquette ne prouvent rien.
Ce qui ne s'applique pas, et pourquoi :
- La collecte sur Reddit, les réseaux et les avis (image 5) : sources et droits non dits ; LinkedIn y figure et sa collecte est interdite à Presti.
- Les outils nommés (Semrush, Yelp, Search Console) : montrés sans configuration, hors de la liste d'Oracle.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Aucun chiffre énoncé (pas de parole) ; les compteurs lus sur la maquette (images 9 et 12) ne sont pas repris.

---

## 39. « How an AI Marketing System Finds Customers for an Ecommerce Store » (09/09/2026)

Source : « How an AI Marketing System Finds Customers for an Ecommerce Store », @restructureai, https://www.tiktok.com/@restructureai/video/7683354636551556360 · publiée le 09/09/2026 · durée 124 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:19] Problème : une boutique de vêtements en ligne apparaît en cinquième page, derrière trois autres boutiques.
- [00:22]-[00:38] Agent de recherche : il relève chaque jour ce que les acheteurs tapent et ce que font les concurrents.
- [00:41]-[01:04] Contenu : fiches produit réécrites autour des requêtes réelles ; un modèle peut porter le vêtement ; l'auteur affirme que le visuel reste fidèle au produit.
- [01:09]-[01:25] Publicités : le budget est réparti chaque matin vers ce qui marche, « not once a month ».
- [01:29]-[01:37] Relance : SMS ou e-mail aux visiteurs qui n'achètent pas ; l'auteur dit que c'est « Totally normal » [01:35].
- Planche, images 1, 14, 27, 40, 53, 66, 105 : image 1, titre « AI marketing system for ecommerce » ; image 14, une recherche « best men's shirts » où la boutique du client arrive derrière d'autres ; image 27, une boutique reliée à quatre réseaux (Instagram, Facebook, TikTok, YouTube) avec l'alerte « Post more · know what works » ; image 40, un « Research agent » nourri de ce que les gens cherchent, des classements concurrents et de la demande ; image 53, une fiche produit avec la mention « customer intent » autour ; image 66, un produit réel transformé par un studio (Canva, Midjourney, Remotion, Figma, ElevenLabs) en visuel porté, avec la mention « no photoshoot, no studio, no camera » ; image 105, un « client qui n'a pas acheté » relancé par ManyChat, CRM, SMS, agenda et boîte partagée jusqu'à l'achat.
Principes et patterns réutilisables :
- Partir de ce que les acheteurs tapent avant de créer le contenu [00:22]-[00:38].
- Une fiche produit qui répond à la requête, plutôt qu'une photo seule [00:43]-[00:57].
- Réallouer le budget chaque jour, pas chaque mois [01:20]-[01:25].
- Une relance légère pour les visiteurs qui hésitent [01:29]-[01:37].
Erreurs à éviter :
- Dit par l'auteur : « Totally normal » [01:35] ; la relance est présentée sans condition.
- Constaté : aucun consentement aux SMS ni aux e-mails n'est mentionné ; les ventes gagnées ne sont pas chiffrées.
- Constaté : la génération de modèle n'explique ni le droit à l'image ni la mention d'une image générée.
Ce qui s'applique à Presti / à ce client :
- Partir de ce que les gens tapent avant de produire du contenu [00:22]-[00:38], image 40 : c'est la page publique de l'artisan et son site (`/p/[slug]`, `/site/[slug]`) rédigés autour des vraies demandes reçues ; idée à proposer à Benj, dans n8n, pour les contenus de Presti (chantier 5), avec des sources déclarées d'Oracle.
- Le visuel généré à la place d'une photo (image 66 : « no photoshoot ») : exclu pour un artisan, dont les réalisations sont des chantiers réels ; une image générée y serait de la fabrication. Pas de mannequin ni de droit à l'image non réglé.
- La relance d'un client qui n'a pas acheté [01:29]-[01:37], image 105 : le parallèle chez Presti est la relance d'une demande ou d'un devis restés sans réponse (`lib/relances.ts`, J+2, J+5, J+10 ; jamais deux relances en trois jours, `lib/relancesRegistre.ts:18`). « Totally normal » ne vaut pas : une relance de Presti ne culpabilise pas et n'invente pas d'urgence (rang 10 du chantier 4), et un SMS passe par `lib/sms/` (liste fermée, consentement).
- Réallouer le budget chaque matin [01:09]-[01:25] : exclu, achat média sans accord de Benj (`securite.md`).
- Le suivi de ce qui marche (alerte de l'image 27) : l'origine de chaque demande (`leads.origine`) et le rapport `lib-rapport-hebdo` ; rien n'est présenté comme gagné sans source.
Ce qui ne s'applique pas, et pourquoi :
- Le mannequin généré à partir du produit : aucun mot sur le droit à l'image ni la mention d'une image générée.
- La réallocation quotidienne du budget : propre à une boutique à plusieurs canaux publicitaires.
- Les outils de publicité et d'analytique : non nommés dans la vidéo.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « cinquième page » de résultats [00:12] : annoncé par l'auteur, non vérifié.
- « trois autres boutiques » [00:15] : annoncé par l'auteur, non vérifié.
- Réglage du budget « chaque matin » [01:20] : annoncé par l'auteur, non vérifié.

---

## 40. « I Built an Entire Marketing Team With 0 Employees » (08/09/2026)

Source : « I Built an Entire Marketing Team With 0 Employees », @restructureai, https://www.tiktok.com/@restructureai/video/7682977055826251028 · publiée le 08/09/2026 · durée 115 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:05] Annonce : 36 agents, « l'équivalent de 23 employés » ; le marketing tourne en boucle : recherche, contenu, création, diffusion, audience, analyse.
- [00:31]-[00:48] Recherche et contenu : Google Trends, SEMrush, SparkToro ; Claude écrit, Surfer fait ressortir ; « the final yes is still yours » [00:48], soit le dernier oui reste au propriétaire.
- [00:54]-[01:05] Création et diffusion : Canva, Midjourney, Remotion, ElevenLabs, Metricool planifie ; une messagerie répond aux messages dans la voix de la marque.
- [01:16]-[01:31] Analyse : Looker Studio lit ce qui convertit et renvoie vers la recherche ; Claude Code se connecte par MCP.
- Planche, images 1, 25, 37, 49, 61, 85, 97 : image 1, titre « The one-person marketing team » ; image 25, six blocs en boucle (recherche, contenu, création, diffusion, audience et e-mail, analyse) avec la bande « One loop, live, compounds every week » ; image 37, Claude « the brain » relié à Google Trends, Semrush et SparkToro ; image 49, un brouillon de post (score SEO, durée de lecture, portée estimée) en attente de relecture, avec les boutons « Approve » et « Not approve » et la phrase « the final yes is still yours » ; image 61, un visuel Canva et Midjourney devenu court métrage par Remotion et ElevenLabs, étiqueté « short, ready » ; image 85, un tableau Looker Studio (appels réservés, e-mails ouverts, conversion) ; image 97, un orchestrateur dont la ligne dit que chaque événement y entre d'abord et que rien ne se publie seul.
Principes et patterns réutilisables :
- Une boucle : recherche, contenu, diffusion, analyse, puis retour à la recherche [00:10]-[00:26].
- L'analyse renvoie vers la recherche : la semaine suivante produit davantage de ce qui a marché [01:24]-[01:31].
- Chaque agent lit les mêmes fichiers de marque : voix, offre, règles [01:35]-[01:42].
- Le propriétaire garde la marque et le budget [01:47]-[01:52].
Erreurs à éviter :
- Dit par l'auteur : « the final yes is still yours » [00:48] ; la publication passe par une validation.
- Constaté : la vidéo ne montre aucun résultat mesuré ; l'analyse n'a pas d'exemple chiffré.
- Constaté : aucun cas de publication refusée n'est montré.
Ce qui s'applique à Presti / à ce client :
- Le brouillon qui attend « Approve » (image 49) : Studio prépare et l'artisan valide (`lib/plans.ts:11`). La phrase « nothing publishes on its own » lue image 97 est la règle des vidéos et carrousels de Presti : les 2 ou 3 premiers sont validés par Benj, puis publication automatique sous contrôle qualité, un défaut renvoyant en validation (`autonomie-abonnements.md`, ADR-006 ; chantier 5).
- La boucle qui renvoie l'analyse vers la recherche [01:16]-[01:31], images 25 et 85 : `lib-rapport-hebdo` pour l'Entreprise et « Mes chiffres » de l'artisan (capacité `chiffres`) ; les compteurs de la maquette ne prouvent rien.
- Les fichiers de marque que chaque agent relit [01:35]-[01:42] : « Décrire mon entreprise » (A6) et la fiche de découverte 035-002 ; la voix du client est lue, pas inventée. Aucune voix clonée sans accord : la voix d'une publicité de Presti est celle de Benj.
- La diffusion planifiée sur chaque canal (Metricool, nommé à l'oral [00:54]-[01:05]) : outil nommé sans configuration ; chez Presti, la publication de contenus de la marque est un workflow n8n, après les validations, jamais l'app.
- Le « Looker Studio » de l'image 85 : l'équivalent pour l'artisan est son tableau de bord avec l'entonnoir lien, demande, devis, facture ; aucune donnée de client ne va à un outil tiers sans règle écrite.
Ce qui ne s'applique pas, et pourquoi :
- Les outils de création (Canva, Midjourney, ElevenLabs) : nommés sans configuration.
- La voix de marque sur les réseaux : aucune base de données réelle n'est montrée.
- Les chiffres d'équipe annoncés : sans méthode de calcul.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 36 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « 23 employés » [00:00]-[00:05] : annoncé par l'auteur, non vérifié.

---

## 41. « How an Agentic AI Finance Department Will Run in 2030 » (05/09/2026)

Source : « How an Agentic AI Finance Department Will Run in 2030 », @restructureai, https://www.tiktok.com/@restructureai/video/7682052840172440839 · publiée le 05/09/2026 · durée 123 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:17] Annonce : un département finance agentique en huit étapes (capture, rapprochement, catégorisation, facturation, paiement, paie, reporting, prévision).
- [00:17]-[00:43] Capture et rapprochement : Dext lit le reçu photographié, Plaid tire le flux bancaire, QuickBooks rapproche chaque transaction ; Claude catégorise selon le plan comptable de l'entreprise.
- [00:43]-[01:09] Facturation : QuickBooks émet la facture à la fin du travail, Stripe encaisse ; relances à J+3, J+7 et J+14 ; Bill.com gère les paiements fournisseurs.
- [01:13]-[01:36] Reporting : Fathom produit compte de résultat, bilan et flux de trésorerie ; Claude signale ce qui a bougé et prévoit trois semaines à l'avance ; paie Gusto, TVA Avalara.
- [01:39]-[01:54] L'orchestrateur route le travail et s'arrête devant les gros paiements et la signature fiscale.
- Planche, images 1, 27, 40, 53, 66, 79, 92, 105 : image 1, titre « How an AI finance department runs in 2030 » avec un propriétaire, des clients et fournisseurs autour d'un orchestrateur ; image 27, un reçu photographié lu par Dext (« reading receipt ») ; image 40, une commande qui classe une dépense (« Travel & client meals ») avec un score de confiance et un plan de comptes, puis la mention des livres clôturés le soir ; image 53, QuickBooks qui émet une facture quand le travail est marqué fini ; image 66, une frise de relances : un message à J+3, un à J+7, la mention « paid » puis un rappel de J+14 passé car déjà payé ; image 79, des états Fathom (résultat, bilan, flux) ; image 92, une prévision de trésorerie avec un repère « tight » ; image 105, le propriétaire, QuickBooks, Stripe et Claude Code reliés.
Principes et patterns réutilisables :
- Une étape, une source de vérité : les données passent d'un outil à l'autre sans ressaisie [00:05]-[00:11].
- Relances à intervalles fixes, dans la voix de l'entreprise [00:57]-[01:03].
- Une prévision à trois semaines pour agir avant le manque de trésorerie [01:29]-[01:33].
- Le système s'arrête devant les gros paiements et la signature fiscale [01:51]-[01:54].
Erreurs à éviter :
- Dit par l'auteur : « the books are closed every single night » [00:43] ; soit les livres sont clôturés chaque nuit, présenté comme un avantage.
- Constaté : la vidéo ne décrit aucun contrôle de réconciliation ni aucune erreur de rapprochement.
- Constaté : la vidéo ne précise ni le pays ni le régime fiscal ; les écrans ne sont pas vérifiés ici.
Ce qui s'applique à Presti / à ce client :
- La frise de relances de l'image 66, dont le dernier rappel est sauté parce que la facture est payée : c'est la bonne forme de relance d'impayé, à rapprocher de `lib/relancesImpayes.ts` et de `lib/relancesRegistre.ts:18` (jamais deux relances en trois jours) ; les messages sont préparés et partent seuls en Signature uniquement une fois la case d'opt-in cochée (`lib/plans.ts:67`), en Studio après le clic. Les intervalles de la vidéo (J+3, J+7, J+14) ne sont pas ceux de Presti pour les demandes (J+2, J+5, J+10, `lib/relances.ts`).
- La facture émise à la fin du travail [00:43]-[01:09], image 53 : c'est L18, « après-chantier » (`lib/apresChantier.ts`) : facture préparée à la fin du chantier puis entretien proposé, jamais encaissée par l'IA.
- Le classement d'une dépense avec un score de confiance (image 40) : un doute remonte à l'artisan plutôt que d'être tranché par un modèle ; la décision comptable reste à l'artisan et à son comptable, Presti n'ayant aucun accès bancaire ni comptable (Plaid, Dext et QuickBooks exclus).
- Le paiement fournisseur, la paie et la TVA [01:09]-[01:36] : exclus. Le système de la vidéo « s'arrête devant les gros paiements » [01:51]-[01:54], ce que Presti pousse plus loin : aucun paiement ni acompte pris par l'IA.
- Une alerte de trésorerie en avance (image 92) : idée à proposer à Benj, dans n8n, comme détecteur d'impayés cumulés (chantier 4, §9 : détecteurs classés par argent récupéré), calculé par le code et sans chiffre non sourcé.
Ce qui ne s'applique pas, et pourquoi :
- La paie et la TVA (Gusto, Avalara) : la vidéo ne précise ni le pays ni le régime.
- Les relances de factures par système : aucun mot sur le droit de relance ni les règles de contact.
- Les intégrations bancaires (Plaid, Dext) : nommées, sans détail.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 8 étapes » [00:11] : annoncé par l'auteur, non vérifié.
- Relances à J+3, J+7, J+14 [00:57]-[01:03] : annoncé par l'auteur, non vérifié.
- Prévision « trois semaines » à l'avance [01:29] : annoncé par l'auteur, non vérifié.

---

## 42. « How an $18,000 Agentic AI Call Center Actually Works » (04/09/2026)

Source : « How an $18,000 Agentic AI Call Center Actually Works », @restructureai, https://www.tiktok.com/@restructureai/video/7681694309594254613 · publiée le 04/09/2026 · durée 95 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] Annonce : un centre d'appels IA à 18 000 $ pour un commerce local ; sept agents, une douzaine de plateformes (Twilio, Vapi, Google Calendar, HubSpot).
- [00:13]-[00:32] Module 1, prise d'appel : décroche à la première sonnerie, lit services, prix et horaires, réserve dans l'agenda pendant l'appel.
- [00:41]-[00:57] Module 2, appel manqué : un SMS de reprise propose de prendre rendez-vous.
- [01:02]-[01:07] Mémoire partagée : les sept agents lisent et écrivent dans une même base (connaissances, agenda, historique) ; l'orchestrateur décide ce qui exige l'humain.
- [01:21]-[01:28] Les appels difficiles attendent l'humain ; la vidéo se présente comme « supervisé », pas « autonome ».
- Planche, images 1, 11, 21, 31, 41, 51, 71, 81 : image 1, titre « Agentic AI call center » avec client, agents et propriétaire ; image 11, le module « CRM logging » (synchronisation CRM, pipeline et tâches, journal d'appel, automatisation de tâches) ; images 21 et 31, un téléphone « Call in progress » relié au client, à la ligne Twilio et au moteur vocal Vapi, puis une réservation dans l'agenda avec la coche « Confirmed » ; images 41 et 51, le module « Missed-call text-back » et le SMS « Sorry we missed you, want us to book you in » ; image 71, deux terminaux côte à côte, « Bot (talks only) » et « Agent (full access) », où le premier peut lire les disponibilités de l'agenda mais voit refusées la création d'un événement et d'un contact, alors que le second peut les créer et envoyer un SMS ; image 81, un propriétaire, un orchestrateur et les outils (Twilio, Vapi, agenda, ElevenLabs, Deepgram, HubSpot, Postgres).
Principes et patterns réutilisables :
- Un agent par fonction, relié à une base commune : connaissances, agenda, historique [01:02]-[01:07].
- Un appel manqué devient un message de reprise [00:49]-[00:52].
- Un humain garde les appels difficiles ; l'orchestrateur signale [01:17]-[01:25].
Erreurs à éviter :
- Dit par l'auteur : « It's not autonomous. It's supervised. » [01:25] ; soit « ce n'est pas autonome, c'est supervisé ».
- Constaté : la vidéo ne dit rien du consentement pour les SMS de reprise.
- Constaté : aucun traitement d'erreur de réservation n'est montré.
Ce qui s'applique à Presti / à ce client :
- Les deux terminaux de l'image 71 (« bot qui ne fait que parler » contre « agent à accès complet ») : la planche montre une séparation des droits que la transcription ne dit pas : le bot lit l'agenda, seul l'agent écrit. C'est le principe du `gabarit-synchroniser-outil` (rang 3, liste d'accès signée) et de `0189_role_lecture_n8n.sql` (n8n lit en lecture seule) : un workflow ne reçoit que les accès dont son rôle a besoin.
- L'appel vocal décroché par l'IA et réservé dans l'agenda pendant l'appel [00:13]-[00:32], images 21 et 31 : exclu. Presti n'appelle pas et ne répond pas au téléphone par IA, ne prend aucun rendez-vous seul (`lib/ai.ts`, anti-fabrication de créneau).
- L'appel manqué qui devient un message de reprise [00:41]-[00:57], images 41 et 51 : l'équivalent est une demande restée sans réponse, détecteur 6 (chantier 4, L3 n8n), avec un brouillon que l'artisan valide en Studio ; un SMS ne part que par `lib/sms/` (liste fermée, consentement), jamais un SMS libre de l'IA.
- « Supervisé, pas autonome » [01:21]-[01:28] : la phrase résume Studio (`lib/plans.ts:11`), et pour l'Entreprise la hiérarchie du §4.2 : le gérant (rang 0) reçoit ce que l'orchestrateur ne tranche pas. L'orchestrateur de l'image 81 est un workflow parent qui route sans modèle (`ent-exemple-parent`).
- Journaliser chaque appel dans le CRM (image 11) : `lib-journaliser` et `assistant_journal` (0185) ; une action sans trace n'existe pas.
Ce qui ne s'applique pas, et pourquoi :
- Le centre d'appels vocal (Twilio, Vapi) : aucun détail sur les appels, les numéros ni les enregistrements.
- Le prix de 18 000 $ : non détaillé.
- Le commerce local servi : contexte d'un seul cas.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 18 000 $ » [00:00] : annoncé par l'auteur, non vérifié.
- « sept agents » [00:05] : annoncé par l'auteur, non vérifié.

---

## 43. « AI Content Operating System » (03/09/2026)

Source : « AI Content Operating System », @restructureai, https://www.tiktok.com/@restructureai/video/7681132465259351303 · publiée le 03/09/2026 · durée 12 s · lue le 03/11/2026 · intégralement : non, transcription vide (« You » seulement) : la planche est la seule source
Ce qu'elle montre :
- Aucune parole exploitable dans la transcription (un seul mot, « You »), et la légende (info.json) s'arrête sur « A business putting out content every single day, scripted, bra... » : tout ce qui suit vient de la planche.
- Planche, images 1 et 2 : un schéma animé titré « AI Content Operating System » avec cinq blocs d'abord grisés autour d'une roue centrale « AI Content OS » ; le bloc « Research » s'allume d'abord (un outil de mots-clés, Claude, un indicateur de tendance).
- Planche, images 3 à 6 : « Create » (ElevenLabs, un outil vidéo, Claude), puis « Repurpose » (un point central relié à quatre outils de mise en forme, dont Canva) s'allument ; les secteurs de la roue (Research, Create, Repurpose) se colorent en même temps.
- Planche, images 7 à 9, puis image 13 : « Distribute » (un outil de scénario Make relié à Instagram, TikTok, YouTube et LinkedIn, TikTok entouré), puis « Orchestrate » (Claude, une icône d'enchaînement de nœuds, un outil de mesure) ; à la fin les cinq secteurs de la roue sont allumés. Ce sont des écrans de maquette, signés « Structure Webworks » : ils illustrent, ils ne prouvent rien.
Principes et patterns réutilisables :
- Aucun principe énoncé à l'oral ; la planche en montre un : un cycle de contenu en cinq étapes, recherche, création, recyclage, diffusion, orchestration, dont chacune s'allume après la précédente [images 1 à 9].
- Un contenu source est décliné en plusieurs formats avant d'être diffusé [images 5 et 6].
Erreurs à éviter :
- Dit par l'auteur : rien (pas de parole).
- Constaté : l'écran est une maquette animée, sans contenu réel, sans critère de qualité ni validation visible avant la diffusion.
Ce qui s'applique à Presti / à ce client :
- La roue centrale (image 13) et les cinq quadrants, recherche, création, recyclage, diffusion et orchestration, éclairés l'un après l'autre (images 1 à 9) : c'est le patron d'un workflow parent n8n qui appelle des modules dans un ordre fixe (`ent-exemple-parent`, 035-007 ; phases §7.2 de `premiere-reponse.md`). Le quadrant « Orchestrate » est le dernier, avec l'icône d'un enchaînement de nœuds que je lis comme n8n (non légendée sur la planche) et celle d'un outil de mesure : le routage et la mesure ferment la boucle.
- « Repurpose » (images 5 et 6 : un contenu source décliné par quatre outils) : c'est le principe des carrousels et vidéos de Presti, un contenu décliné en plusieurs formats ; les 2 ou 3 premiers sont validés par Benj, puis publication automatique sous contrôle qualité (`autonomie-abonnements.md`, ADR-006 ; chantier 5).
- « Distribute » (images 7 et 8 : un outil de scénario vers Instagram, TikTok, YouTube, LinkedIn) : la publication de la marque de Presti est un workflow n8n, jamais l'app, et seulement sur ses propres comptes ; les comptes de réseaux non Presti sont intouchables (`securite.md`).
- « Research » (images 1 et 2 : un outil de mots-clés, Claude, un indicateur de tendance) : sources à déclarer d'Oracle (SearXNG, Crawlee, ScrapeGraphAI) ; idée nouvelle, à proposer à Benj, dans n8n, pour alimenter les contenus du chantier 5 par les demandes réellement reçues.
- La voix (quadrant « Create », ElevenLabs, image 3) : la voix d'une publicité publiée de Presti est celle de Benj (Fish) ; Kokoro sert aux essais ; aucun clonage de voix sans accord.
Ce qui ne s'applique pas, et pourquoi :
- Les outils nommés (outil de scénario Make, ElevenLabs, Canva) : montrés sans configuration ; l'automatisation de Presti est n8n (ADR-001).
- Le rythme d'un contenu par jour : rien ne le justifie dans la vidéo ; la cadence de Presti suit la règle des 2 ou 3 premières validations.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Aucun chiffre énoncé (pas de parole).

---

## 44. « I Built 67 AI Agents to Find Customers » (02/09/2026)

Source : « I Built 67 AI Agents to Find Customers », @restructureai, https://www.tiktok.com/@restructureai/video/7680788563289459975 · publiée le 02/09/2026 · durée 105 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:13] Annonce : 67 agents avec un seul objectif, trouver des clients ; huit départements, 20 modules, une seule « tête ».
- [00:13]-[00:24] Promesses : prospects contactés avant le réveil, e-mails vérifiés à la découverte, réunions placées dans l'agenda.
- [00:28]-[00:45] Jours 1 et 2 : les agents bâtissent la liste d'entreprises qui correspondent au profil et vérifient les e-mails ; jours 3 et 4 : classement par intention d'achat.
- [00:45]-[01:01] Jours 3 à 5 : prise de contact personnalisée « dans ma voix » ; « If it doesn't sound like me, it doesn't go out » [00:55] ; soit un message qui ne sonne pas comme lui ne part pas.
- [01:01]-[01:13] Jours 5 et 6 : réponse et réservation automatiques ; un brouillon avec un lien attend le oui.
- [01:18]-[01:33] L'orchestrateur vérifie l'adéquation et les limites, s'arrête si un humain est nécessaire ; l'auteur garde l'offre, le budget et les promesses.
- Planche, images 1, 12, 23, 34, 45, 56, 67, 78, 89 : image 1, titre « 67 AI agents lead generation system » ; image 12, des départements (prospection, enrichissement et vérification, notation par intention, conversation et réservation, relance, CRM, pipeline) avec leurs outils nommés (Clay, vérificateur d'e-mails, Claude, Calendly, HubSpot, tableaux de bord) ; image 34, des sources de prospects (Apollo, LinkedIn, Clay, ZoomInfo) qui convergent vers « ICP match » ; image 45, une chronologie « Day 3-4, ranked, filtered, then contacted » avec l'état de chaque module (fait, actif, en attente) ; image 56, un message « Drafting in your voice » adressé à un prospect fictif, avec des compteurs de modules et de messages envoyés ; image 67, « Reply drafted instantly, in your voice » avec un lien pour prendre un créneau ; images 78 et 89, un orchestrateur sous « You » qui passe de « active » à « escalating » et affiche « Stopped, needs a human ».
Principes et patterns réutilisables :
- Une chronologie en jours pour montrer le progrès plutôt qu'un résultat final [00:28].
- Un message ne part que s'il sonne comme le propriétaire [00:55]-[00:57].
- L'orchestrateur décide, il ne fait pas le travail [01:22]-[01:28].
- Le propriétaire garde l'offre, le budget et les promesses [01:28]-[01:33].
Erreurs à éviter :
- Dit par l'auteur : « I booked nothing myself » [01:13] ; présenté comme la preuve de l'autonomie.
- Constaté : la liste d'e-mails « vérifiés » n'a ni source ni règle d'envoi (consentement, opposition, quota).
- Constaté : aucun chiffre de réponse ni de rendez-vous réel n'est donné.
Ce qui s'applique à Presti / à ce client :
- Les sources de l'image 34 (Apollo, LinkedIn, Clay, ZoomInfo) qui convergent vers « ICP match » : l'idée d'un critère d'adéquation écrit est celle du chantier 3 (ICP du réseau neuronal), mais LinkedIn est exclu, la collecte étant interdite par ses conditions et par `architecture-outils.md` ; Presti ne chasse que sur les sources d'Oracle.
- Le message « dans ma voix » qui ne part que s'il lui ressemble [00:45]-[01:01], images 56 et 67 : un contrôle de voix avant envoi, c'est `lib-porte-conformite` en veto ; l'envoi de la prospection est automatique, plafonné à 300 par jour, avec opt-out, exclusion et journalisation (`email-brevo.md`, ADR-005), jamais « libre ».
- La réponse brouillon avec un lien pour réserver [01:01]-[01:13], image 67 : exclu comme réservation automatique ; Presti prépare la réponse, l'artisan fixe le créneau, l'IA n'en invente pas. Le brouillon attend le clic en Studio (`lib/plans.ts:11`).
- L'état « Stopped, needs a human » (image 89) : le motif « un module s'arrête et appelle le gérant » est `lib-alerter` et `lib-disjoncteur`. La chronologie par jours [00:28]-[00:45], image 45, pour montrer le progrès plutôt qu'un résultat final, vaut pour notre rapport de passage (phases, §7.2 de `premiere-reponse.md`).
- La liste d'e-mails « vérifiés » [00:13]-[00:24] n'a ni source ni règle d'envoi : rien à reprendre sans la source déclarée ; aucune donnée de prospect n'est envoyée à un modèle gratuit en ligne (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- La prospection à froid par e-mail : aucun mot sur l'opt-out ni le plafond d'envoi.
- Les 67 agents et les 20 modules : chiffres de l'auteur, sans détail par agent.
- Les outils visibles (HubSpot, données d'intention) : nommés sans configuration.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 67 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « huit départements, 20 modules » [00:07] : annoncé par l'auteur, non vérifié.
- Sept jours de test [00:08]-[00:14] : annoncé par l'auteur, non vérifié.

---

## 45. « I Built 62 AI Agents Run Your Entire Social Media Team » (01/09/2026)

Source : « I Built 62 AI Agents Run Your Entire Social Media Team », @restructureai, https://www.tiktok.com/@restructureai/video/7680388852699204872 · publiée le 01/09/2026 · durée 97 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:12] Annonce : 62 agents qui gèrent les réseaux sociaux ; huit départements, 20 modules, un propriétaire ; surveillance de la recherche et des mentions.
- [00:22]-[00:37] Module « content engine » : lit les recherches et la voix, produit un brief, un brouillon, une passe SEO ; Claude écrit, Surfer fait ressortir, Grammarly corrige.
- [00:40]-[00:52] Module « market radar » : repère une tendance ou une mention qui monte et réoriente le fil avant le déjeuner.
- [00:59]-[01:08] Module avis et réputation : une réponse à un avis ou à un message privé est rédigée dans la voix de la marque, avant le matin.
- [01:13]-[01:27] Orchestrateur : vérifie la voix et le budget, publie ; s'arrête et appelle le propriétaire en cas de doute.
- Planche, images 1, 12, 23, 34, 56, 67, 78, 89 : image 1, titre « 62 AI agents run an entire social media team » ; image 23, des modules de création (Midjourney, Remotion, Figma, ElevenLabs), de diffusion (Metricool, WordPress, Facebook, Instagram, LinkedIn) et « Leads & conversations » (ManyChat, HubSpot, Twilio, Calendly, Front) ; image 34, une carte « Brand voice » (« set once, checked on every draft ») avec curseurs de ton et liste de tournures interdites (majuscules, peur, allégations médicales), liée au module « Content engine » ; image 56, un « Market radar » avec un fil d'événements de marché ; images 67 et 78, « Reviews & reputation » : un message privé reçu la nuit, un brouillon de réponse « awaiting sign-off » avec les boutons « Hold » et « Approve & send », puis « sent to » le client et « customer notified » ; image 89, une liste « Needs your OK » (budget atteint, publication signalée hors voix, réponse à un concurrent prête) avec « Hold » et « Approve », et la vue du téléphone du propriétaire.
Principes et patterns réutilisables :
- Un schéma en modules : chaque module a une entrée (signal) et une sortie (brouillon prêt) [00:09]-[00:22].
- La voix de marque est une règle : un texte qui ne lui ressemble pas ne sort pas [00:35]-[00:37].
- Le propriétaire garde la voix, le budget et les promesses [01:24]-[01:27].
- Répondre aux avis et aux messages avant le matin [01:05]-[01:08].
Erreurs à éviter :
- Dit par l'auteur : « it can't post in a voice that isn't yours » [00:35] ; présenté comme une garantie.
- Constaté : la vidéo ne montre aucun journal de validation réel.
- Constaté : la vidéo ne dit rien du traitement des avis négatifs ni du consentement pour les messages privés.
Ce qui s'applique à Presti / à ce client :
- La liste « Needs your OK » (image 89), avec trois cas, dont un plafond de budget atteint, un message hors voix et une réponse sortante prête : c'est la forme de l'accueil « Aujourd'hui » du chantier 4 (L5, 032-041, « À valider, l'argent d'abord »), où chaque ligne se traite d'un geste (« Hold », « Approve »), comme la carte de lot `lib/assistant/cartes.ts` (retenus, exclus, motif).
- Le brouillon de réponse nocturne à un message privé, « awaiting sign-off » puis envoyé (images 67 et 78) : en Studio, la réponse préparée attend le clic de l'artisan et l'e-mail part au nom de l'artisan, son adresse en `Reply-To` (`lib/email.ts:6-11`) ; en Signature, seuls les types prévus partent seuls (`lib/plans.ts:79-80`). Le résumé du matin est `presti-briefing-matin` (L15).
- La carte « Brand voice » (image 34) : un texte qui n'a pas la voix de l'artisan ne sort pas ; le ton est prouvé par `scripts/persona-e2e.mjs` et, côté Entreprise, par le veto de `lib-porte-conformite`. Les tournures interdites de la carte (peur, allégations) rejoignent les garde-fous de `lib/ai.ts` et le rang 10 : aucune relance ne culpabilise ni n'invente une urgence.
- Le « Market radar » (image 56) : fil d'événements sur concurrents et marché ; idée pour les contenus de Presti (chantier 5), à proposer à Benj, dans n8n, avec des sources déclarées d'Oracle ; pas sur les comptes de réseaux d'un tiers.
- Répondre aux avis avant le matin [00:59]-[01:08] : l'avis négatif reste le sujet sensible ; en Presti, la réponse est préparée et validée, jamais publiée seule. Les comptes réseaux non Presti sont intouchables (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- Les avis Google et les messages privés : aucun mot sur la façon dont les réponses aux personnes sont encadrées.
- Les outils de rédaction et de SEO (Surfer, Grammarly) : nommés sans configuration.
- Les 62 agents : chiffre de l'auteur, sans détail par module.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 62 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « huit départements, 20 modules » [00:04] : annoncé par l'auteur, non vérifié.

---

## 46. « I Built an AI Customer Care Department for a Local Business » (29/08/2026)

Source : « I Built an AI Customer Care Department for a Local Business », @restructureai, https://www.tiktok.com/@restructureai/video/7679292319039786260 · publiée le 29/08/2026 · durée 127 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:03] Annonce : un département de service client IA pour un commerce local, « 28 400 $ » le premier mois.
- [00:08]-[00:20] Problème : des dépenses pour trouver de nouveaux clients pendant que les anciens partent sans que personne ne regarde les avis.
- [00:22]-[00:49] Module 1, réputation : repère les clients qui se détachent avant d'écrire, compare aux concurrents proches ; l'auteur dit que sept foyers allaient partir.
- [00:49]-[01:05] Module 2, récupération de service : une réponse prête en quelques minutes à un client mécontent.
- [01:06]-[01:21] Module 3, moteur d'avis : demande d'avis automatique au bon moment ; 14 avis cinq étoiles en 30 jours [01:14].
- [01:22]-[01:40] Décomposition : 16 800 $ de clients retenus, 7 200 $ de nouvelles réservations, 4 400 $ de clients réguliers ; un orchestrateur produit un rapport hebdomadaire unique et un score de santé client.
- Planche, images 1, 15, 29, 43, 57, 71, 85, 99, 113 : image 1, titre « AI customer care department », avec la mention du premier mois ; image 15, une arborescence de fichiers de savoir (avis, réputation, récupération, rétention, parrainage, post-job, conversations, abonnement) et un « Access (control plane) » avec journal d'activité, permissions, alertes et un interrupteur d'arrêt ; image 29, une liste de silences repérés par type (sans réponse à un e-mail, aucun avis après des chantiers, appel de suivi manqué, renouvellement refusé, retard sans excuse) ; image 43, une carte avec des repères ; image 57, un « Service recovery desk » : un message de client mécontent, un brouillon de réponse qui propose un geste commercial et les boutons « Hold » et « Approve & send », avec « owner sign-off pending » ; image 71, une liste d'avis cinq étoiles récents ; images 85 et 99, un tableau de bord (demandes d'avis, classement sur la carte, nouvelles réservations) et la décomposition « This month's math ».
Principes et patterns réutilisables :
- Capter les signaux avant la plainte : avis, messages, appels [00:15]-[00:22].
- Réponse rapide à un client mécontent, avant qu'il s'en aille [00:49]-[00:57].
- Demander un avis au bon moment, automatiquement [01:06]-[01:11].
- Un rapport hebdomadaire unique et une seule mesure de santé client [01:42]-[01:50].
Erreurs à éviter :
- Dit par l'auteur : « without hiring a single extra person » [01:37] ; soit « sans embaucher une seule personne de plus ».
- Constaté : la décomposition des 28 400 $ n'a pas de méthode de calcul ; « sept foyers » et « plus de 16 000 $ » ne sont pas détaillés, et 16 000 $ (environ 00:42) ne correspond pas à 16 800 $ (01:22).
- Constaté : l'attribution de 7 200 $ à la visibilité Google n'est pas prouvée.
Ce qui s'applique à Presti / à ce client :
- L'« Access (control plane) » de l'image 15 avec journal, permissions, alertes et interrupteur d'arrêt : un pas que la transcription ne dit pas ; il rejoint `lib-disjoncteur`, `lib-journaliser`, la table `assistant_journal` (0185) et le drapeau de `lib/flags.ts`, où un drapeau baissé coupe un chemin entier. Tout ce qui est écrit est journalisé.
- Le brouillon qui propose un geste commercial au client mécontent (image 57), « owner sign-off pending » : le brouillon peut être préparé, mais un crédit ou une remise est une décision d'argent, calculée par le code et décidée par l'artisan, jamais par un modèle ni seule. À l'accueil, cela se range dans « À valider, l'argent d'abord » (L5).
- Les silences repérés avant la plainte [00:15]-[00:22], image 29 (« delay complaint, no acknowledgment », « missed follow-up call ») : ce sont les détecteurs n8n du chantier 4 (L3 : 6 demandes sans réponse, 1 impayé ; L12 : 11 réponse à une relance d'impayé), classés par argent récupéré (§9), sans scoring de clients ni donnée envoyée à un modèle gratuit.
- Une demande d'avis au bon moment [01:06]-[01:11], images 71 et 85 : le bon moment pour un artisan est la fin de chantier, donc l'étape « après-chantier » (L18, `lib/apresChantier.ts`, facture préparée puis entretien proposé) ; ajouter la demande d'avis est une idée à proposer à Benj, dans n8n, validée par l'artisan, sans incitation.
- La décomposition du premier mois (image 99) n'a pas de méthode : rien n'est repris comme gain ; un chiffre de Presti n'entre dans un rapport que s'il a sa source (`lib-rapport-hebdo`).
Ce qui ne s'applique pas, et pourquoi :
- Les demandes d'avis : la vidéo ne dit pas comment elles sont encadrées (fréquence, incitation, plateforme).
- Le commerce local servi : contexte d'un seul cas.
- Les outils (NiceJob, Google Business) : nommés sans configuration.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 28 400 $ » le premier mois [00:03] : annoncé par l'auteur, non vérifié.
- « sept foyers » et « plus de 16 000 $ » [00:40]-[00:42] : annoncé par l'auteur, non vérifié.
- « 14 nouveaux avis cinq étoiles en 30 jours » [01:14] : annoncé par l'auteur, non vérifié.
- Décomposition : 16 800 $ [01:22], 7 200 $ [01:24], 4 400 $ [01:29] : annoncé par l'auteur, non vérifié.

---

## 47. « How a Local Business Runs Marketing With AI Agents Part 2 » (28/08/2026)

Source : « How a Local Business Runs Marketing With AI Agents Part 2 », @restructureai, https://www.tiktok.com/@restructureai/video/7678923105749814549 · publiée le 28/08/2026 · durée 101 s · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:05] Annonce : une équipe marketing d'un commerce local remplacée par un système agentique.
- [00:09]-[00:14] Structure : 14 modules, six étapes, un directeur ; cette partie montre quatre modules de plus.
- [00:14]-[00:35] Radar de signaux : demande de recherche, météo, événements locaux, permis, classement sur carte ; un score hebdomadaire.
- [00:35]-[00:49] SEO local : mots-clés tirés des avis, pages de zone de service, fiche Google Business tenue à jour.
- [00:54]-[01:05] Moteur de publication : contenus, photos, mises à jour de fiches, selon les règles de chaque canal ; pendant les 90 premiers jours, rien ne sort sans validation d'une personne.
- [01:09]-[01:19] Attribution : une page par semaine (source de prospect, taux de réservation, revenu de clôture) ; le propriétaire garde l'offre, le prix et les promesses.
- Planche, images 1, 12, 34, 45, 56, 67, 78, 89 : image 1, titre « The AI marketing department for a local business » ; image 12, un schéma en blocs (usine à contenu, studio créatif, SEO local, moteur de publication, demande payante, réputation) et la mention « Six stages » ; image 34, un « Market signal radar » (demande de recherche, saisonnalité, météo, événements locaux, permis et déménagements) qui calcule un « weekly signal score » ; image 45, « Local SEO & listings » (classement sur la carte, profil, zones de service, questions-réponses) ; image 56, le « Publishing engine » avec règles par canal, un test « gate cleared ? » et la mention d'une porte humaine, aucune publication sans validation pendant la période de départ ; image 67, une liste « Held for your review » (graphique promo, carrousel FAQ, plan de drone, vignettes testées) avec « Hold » et « Approve » ; image 78, un tableau « Attribution & reporting » ; image 89, « Convert & keep » (réponse rapide au prospect, relances de réactivation et de parrainage).
Principes et patterns réutilisables :
- Découper l'équipe marketing en modules, chacun à un métier (signaux, SEO local, publication, rapports) [00:09]-[00:19].
- Une porte de validation avant toute publication, avec une période initiale plus stricte [00:59]-[01:05].
- Une page hebdomadaire d'attribution, au lieu de quatre connexions [01:09]-[01:19].
- Le propriétaire garde l'offre, le prix et les promesses [01:19]-[01:26].
Erreurs à éviter :
- Dit par l'auteur : « Nothing goes live without clearing the gate » [00:59] ; présenté comme une règle.
- Constaté : la vidéo ne dit pas comment la validation est tracée, ni ce qui change après les 90 jours.
- Constaté : « trois salaires » et « deux retainers » remplacés sont annoncés sans base de calcul.
Ce qui s'applique à Presti / à ce client :
- La porte humaine du « Publishing engine » (images 56 et 67) : aucune publication sans validation pendant la période de départ, avec la liste « Held for your review ». C'est la règle des vidéos et carrousels de Presti (`autonomie-abonnements.md`, ADR-006, chantier 5), mais fondée sur un nombre de validations, 2 ou 3, pas sur une durée de 90 jours ; la QA continue de tourner et un défaut renvoie le contenu en validation humaine.
- La page hebdomadaire d'attribution (image 78) : `lib-rapport-hebdo` pour l'Entreprise et « Mes chiffres » de l'artisan (capacité `chiffres`, `lib/plans.ts`) ; un chiffre sans source est refusé, `leads.origine` fournit l'origine réelle des demandes.
- Le « Market signal radar » (image 34 : saisonnalité, météo, événements locaux, permis) : idée nouvelle pour un artisan (le chauffagiste et la première vague de froid), à proposer à Benj, dans n8n ; les sources sont à déclarer, dont l'accès aux permis, et la sortie reste un conseil à l'artisan, pas une action automatique.
- « Convert & keep » (image 89 : réponse rapide puis relances de réactivation) : la réponse en moins d'une minute (`lib/ai.ts`) et les relances J+2, J+5, J+10 (`lib/relances.ts`), jamais deux en trois jours (`lib/relancesRegistre.ts:18`).
- Le SEO local et la fiche Google (image 45) : rien à reprendre tant que la fiche d'un client n'est pas à nous ; les comptes de réseaux non Presti sont intouchables (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- Les données locales (météo, permis, événements) : sources non nommées, droit d'usage non dit.
- Les règles de chaque canal de publication : non détaillées.
- Les chiffres de salaires remplacés : annonce sans base de calcul.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 14 modules, six étapes » [00:09] : annoncé par l'auteur, non vérifié.
- « trois salaires » et « deux agences » [00:05] : annoncé par l'auteur, non vérifié.
- « 90 premiers jours » de validation obligatoire [00:59]-[01:05] : annoncé par l'auteur, non vérifié.
