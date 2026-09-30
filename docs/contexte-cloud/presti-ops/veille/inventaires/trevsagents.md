# Inventaire — trevsagents (station « Mission Control » en pixel art)

Relevé le 25/09/2026. Lecture seule des sources. Rien n'est inventé : ce qui est flou est dit flou.

## Sources et méthode

- **Vidéo** : `veille/2026-09-24/videos/trevsagents.mp4` (TikTok, 1080×1920, 59,94 i/s, 116,8 s).
- **Images** : les 60 images `images/trevsagents/tNNN.N.jpg` regardées une par une, dans l'ordre (t000.0 à t116.0).
- **6 images ajoutées** par ffmpeg, une à la fois, dans le dossier source (préfixe x-), pour les moments sans image : x-t018.0, x-t058.0 (Revenue Bay chargée), x-t064.0 et x-t066.0 (Trésorerie détaillée), x-t074.0 (Factory, onglet Bunc), x-t080.0 (Media Lab).
- **Zooms** : recadrages pleine définition dans le scratchpad (hors dossier source) pour t020.0, t060.0, t072.0, t082.0, t084.0, t090.0, t106.0, t110.0. Plus les trois zooms déjà présents dans `images/zoom-fidelite/` (barre du haut t049.2, colonne droite t060.0, Trésorerie t063.0).
- **Voix** : `trevsagents-voix-video.txt` lu en entier. C'est un **résumé**, pas une transcription. J'ai donc refait une transcription **mot à mot** de la piste de la vidéo (faster-whisper small, sans VAD, 60 segments, 0:00 à 1:57), copie dans le scratchpad (`trev-mot-a-mot.txt`). Les citations ci-dessous viennent de cette transcription.
- `trevsagents.txt` est vide (0 segment). Confirmé : `trevsagents.m4a` (244,9 s) est la musique TikTok, pas la voix de la vidéo.

**Conventions.**
- **MONTRÉ** = visible à l'image (tNNN.N). **DIT** = dans la voix (m:ss). **M+D** = les deux.
- **CALCUL** et **DÉDUCTION** = de moi, pas de la source. Toujours signalé.
- « Presti reprend » vise le Poste (interface CLAW3D pixel art, choix de Benj du 25/09) et nos 12 agents.

---

## A. Fiche de la source

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 1 | Compte @trevsagents, TikTok, publié le 26/05/2026 | info.json | MONTRÉ | Rien (identité de la source). |
| 2 | Vertical 1080×1920, 59,94 i/s, 116,8 s | ffprobe, plans.json | MONTRÉ | Nos vidéos du Poste : 9:16, moins de 2 min. |
| 3 | 153 100 vues, 7 422 j'aime, 180 commentaires | info.json | MONTRÉ | DÉDUCTION : une station d'agents « façon jeu » attire ; le Poste filmé est un sujet de vidéo. |
| 4 | Titre « AUTOMATE YOUR BUSINESSES. IF YOU DONT HAVE ANY YET, DO THIS! » | info.json | MONTRÉ | Rien. |
| 5 | Mots-clés #aiagents #aiautomation #claudecode #openclaw | info.json | MONTRÉ | Rien. |
| 6 | Musique « Sci-fi ambient with a desolate and lonely atmosphere » (harryfaoki) | info.json | MONTRÉ | Son d'ambiance possible, pris dans les sons sous licence TikTok. |
| 7 | Texte incrusté « do NOT fall behind » | t000.0, t002.0 | MONTRÉ | Accroche courte en surimpression sur l'écran filmé. |
| 8 | Voix off en anglais du début à la fin | 0:00-1:57 | DIT | Rien. |

## B. Ce que dit la voix, phrase par phrase

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 9 | « This is not a video game. » | 0:00 | DIT | Accroche : ouvrir la vidéo du Poste sur la station, pas sur un tableau. |
| 10 | Les agents marchent vers la salle de réunion « to think how can we improve the business » | 0:01-0:07, t007.4 | M+D | Une réunion d'agents visible comme un déplacement. |
| 11 | « automate a ton of businesses to make me a bunch of money all while I sleep » | 0:08-0:12 | DIT | Rien (promesse non prouvée à l'écran, voir n° 189). |
| 12 | Liste des agents : recherche, manager, Fiverr, musique IA YouTube « we're so [still ?] setting up », produits Etsy, marketing TikTok, expérimental solo | 0:12-0:23 | DIT | Présenter nos agents par métier, en une phrase chacun. |
| 13 | « they're all having this clanker meeting » pour décider quoi faire | 0:23-0:27 | DIT | Rien (mot d'argot). |
| 14 | Le manager Matt « is gonna write up a briefing » de la réunion | 0:27-0:32 | DIT | Un compte rendu écrit après chaque réunion d'agents, lisible dans le Poste. |
| 15 | « they're not just moving around randomly… on the back end having a meeting, they're talking to each other » | 0:32-0:39 | DIT | Un sprite ne bouge que si un vrai événement a lieu derrière (voir n° 184). |
| 16 | « I just built this visual representation so I can see better than looking in here » (il montre le terminal) | 0:39-0:44, t036.0 | M+D | Le Poste remplace la lecture des journaux. |
| 17 | « it displays exactly what's happening on the back end on the front end » | 0:46-0:49 | DIT | Même règle : l'écran reflète l'état réel, rien de décoratif sur les chiffres. |
| 18 | Les salles de la station ont chacune un rôle, « like our revenue bay » | 0:49-0:54 | DIT | Une salle = une fonction = un tableau de bord. |
| 19 | « I can click on it… tells me how much money we've made in 30 days, what it comes from » | 0:53-1:01 | DIT | Salle Revenus : total 30 jours et provenance. |
| 20 | « the treasury… how much money we've been spending on our API costs » | 1:01-1:05 | DIT | Salle Trésorerie : coûts IA. |
| 21 | « what Matt's running on GPT 5.5 » | 1:05-1:09 | DIT | Afficher le modèle qui fait tourner chaque agent. |
| 22 | « the factory room where I can see all the deliveries that Blanc [= Bunc] has made » | 1:09-1:13 | DIT | Salle Production : ce que les agents ont livré. |
| 23 | Bunc fait des bougies et des t-shirts « on Printify and then posts them to Etsy » | 1:13-1:17 | DIT | Rien (métier étranger à Presti). |
| 24 | « then Luke posts TikToks about it… Luke lives in the Media Lab » | 1:16-1:22 | DIT | Un agent contenu par salle ; voir l'écart n° 185. |
| 25 | « chill room, bar room, game room which doesn't do anything… they work around the clock 24-7 » | 1:22-1:29 | DIT | Des salles décor assumées, sans fausse fonction. |
| 26 | « it's just open claw and then this is like a custom thing… all you need is open claw really » | 1:29-1:39 | DIT | Rien (OpenClaw écarté pour Presti le 24/09). |
| 27 | Son appli existante « BOF bot » : les agents gèrent le support client | 1:39-1:48 | DIT | Nos agents mails : même rôle de support client. |
| 28 | « They can push updates to the app… make the app better » | 1:48-1:51 | DIT | Rien pour l'instant (pas d'agent qui pousse du code en prod chez nous). |
| 29 | « so you really don't have to do anything… check in during the day » | 1:52-1:57 | DIT | Le Poste doit se lire en un passage par jour. |

## C. Décor et cadrage

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 30 | Écran filmé au téléphone, doigt qui pointe ce dont il parle | t002.0, t020.0 | MONTRÉ | Filmer le vrai Poste sur un vrai écran, doigt compris. |
| 31 | Moniteur principal ASUS | t038.0, t049.2 | MONTRÉ | Rien. |
| 32 | Second écran à gauche avec un terminal (fond clair, barre verte en bas) | t006.0, t036.0, t090.0 | MONTRÉ | Rien. |
| 33 | Clavier à touches lumineuses | t096.0, t098.0 | MONTRÉ | Rien. |
| 34 | Titre de l'appli « TONKAS · MISSION CONTROL v5 » | t014.0 | MONTRÉ | Nommer la vue et afficher sa version. |
| 35 | Fond de nébuleuse rose et violette avec étoiles | t052.9, t068.8, t084.9 | MONTRÉ | Fond d'ambiance derrière la station. |
| 36 | Station vue en coupe, coque octogonale à néons roses | t000.0, t048.0 | MONTRÉ | Même principe : coupe latérale, toutes les salles visibles d'un coup. |
| 37 | Antenne parabolique sur le toit | t000.0, t010.0 | MONTRÉ | Détail de décor. |
| 38 | Pixel art, sprites avec étiquette de nom au-dessus de la tête | t004.0, t102.0 | MONTRÉ | Étiquette de nom permanente sur chaque agent. |
| 39 | Aile droite de la station (Solar System, Analytics, Maverick, Treasury, Chill / Bar) | t049.2, t068.0, t084.0 | MONTRÉ | Prévoir de la place pour ajouter des salles. |

## D. Barre du haut (compteurs)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 40 | Barre de compteurs toujours visible, même au-dessus des fenêtres ouvertes | t004.0, t054.0, t070.0 | MONTRÉ | Barre de compteurs fixe en haut du Poste. |
| 41 | TOTAL REVENUE $2216 | t004.0, t049.2 | MONTRÉ | Chiffre d'affaires en tête (en séparant la part des agents, voir n° 189). |
| 42 | TOTAL SPENT $31.88 | t004.0, t049.2 | MONTRÉ | Dépense IA en tête. |
| 43 | MATT NEXT 1h 38m, puis 1h 37m, puis 1h 36m | t004.0, t026.0, t068.0 | MONTRÉ | Compte à rebours du prochain cycle de l'agent chef. |
| 44 | MATT MODEL gpt-5.5 | t004.0 | MONTRÉ | Modèle affiché. |
| 45 | MATT CYCLES 12 today | t007.4 | MONTRÉ | Nombre de cycles faits aujourd'hui. |
| 46 | CODEX 5H 1% | t008.0, t049.2 | MONTRÉ | Jauge de quota de l'abonnement (fenêtre de 5 h). |
| 47 | MEETING 16h 46m, puis 16h 45m, puis 16h 44m | t026.0, t060.0, t110.0 | MONTRÉ | Heure de la prochaine réunion d'agents. |
| 48 | MAVERICK D6/30 · $0 | t049.2 | MONTRÉ | Suivi d'une expérience : jour X sur 30 et gain. |
| 49 | Couleurs fixes : argent en orange, temps en cyan, modèle en vert | t049.2 (zoom) | MONTRÉ | Une couleur par nature de chiffre. |

## E. Colonne « CREW » (les agents)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 50 | Colonne gauche « CREW », une carte par agent | t014.0 | MONTRÉ | Colonne équipe à gauche du Poste. |
| 51 | Carte = pastille d'état + nom + rôle + état + mode de réveil | t014.0 | MONTRÉ | Même gabarit de carte pour nos 12 agents. |
| 52 | Matt — Operations Manager — Awaiting orders — « next cycle: 1h 38m » | t014.0 | MONTRÉ | Un agent chef à cycle fixe. |
| 53 | Finn — Fiverr Fulfillment — « event-driven (fires on task) » | t014.0 | MONTRÉ | Rien (métier étranger). |
| 54 | Dennis — Research & Strategy — event-driven | t014.0 | MONTRÉ | Un agent de recherche qui ne se réveille que sur tâche. |
| 55 | Pham — YouTube AI Music — « awaiting_setup » | t020.0 | MONTRÉ | État « à configurer » distinct de « en panne ». |
| 56 | Sous Pham, en rouge : « ⚠ YouTube channel + OAuth not configured » | t020.0 | MONTRÉ | Le blocage de configuration écrit sur la carte même. |
| 57 | Bunc — Etsy Executor — event-driven | t020.0 | MONTRÉ | Rien. |
| 58 | Luke — TikTok Marketing — event-driven | t020.0 | MONTRÉ | Un agent réseaux sociaux (chez nous : FB/Insta de Gabriel, LinkedIn de LV). |
| 59 | Maverick — Solo Autonomous Experiment — « solo · 8h timer · isolated » | t020.0 | MONTRÉ | Un agent d'essai isolé, sur minuterie, sans toucher au reste. |
| 60 | Pastilles cyan pour six agents, ambre pour Pham | t022.0 | MONTRÉ | Couleur de pastille = état. |
| 61 | Les sept agents affichent « Awaiting orders » | t014.0 à t022.7, t078.0 | MONTRÉ | Voir l'écart n° 186. |
| 62 | Deux modes de réveil : minuterie (Matt, Maverick) ou sur tâche (les cinq autres) | t020.0 | MONTRÉ | Montrer comment chaque agent se réveille. |

## F. Bloc « ATTENTION » (décisions humaines)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 63 | Bloc « ⚡ ATTENTION » sous la colonne équipe | t020.0 | MONTRÉ | File des décisions de Benj dans le Poste. |
| 64 | Rose : « Pham blocked: YouTube channel + OAuth not configured » | t020.0 | MONTRÉ | Un agent bloqué remonte en tête. |
| 65 | Jaune : « 1 Etsy draft → review » | t020.0 | MONTRÉ | Un brouillon à relire = une ligne. |
| 66 | Jaune : « Credits low: $8.12 » | t020.0 | MONTRÉ | Alerte crédits ; même chiffre que la Trésorerie (n° 119). |
| 67 | Jaune : « 5 tasks blocked → review » (chiffre flou : 5 ou 6) | t022.0 | MONTRÉ | Compteur de tâches bloquées. |
| 68 | Cyan : « 8 ideas → approve or kill » | t022.0 | MONTRÉ | Les idées des agents passent par un oui ou un non humain. |
| 69 | Cyan : « 34 Matt escalations → your call » | t020.0 | MONTRÉ | Les escalades de l'agent chef, comptées. |
| 70 | Chaque ligne = nombre + flèche + verbe (review, approve or kill, your call) | t020.0 | MONTRÉ | Écrire chaque alerte comme une action à faire. |
| 71 | Couleur par gravité : rose = bloqué, jaune = à revoir, cyan = à décider | t020.0 | MONTRÉ | Même code à trois couleurs. |

## G. La station : salles, sprites, réunion

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 72 | Salle sans étiquette en haut à gauche (objet blanc) | t102.0 | MONTRÉ | Rien. |
| 73 | Salle « WHATAPT » (DÉDUCTION : liée à l'onglet de revenus WHATAPTISTHIS) | t004.0, t102.0 | MONTRÉ | Une salle par produit vendu. |
| 74 | WAR ROOM, avec un grand écran rond | t004.0, t024.0 | MONTRÉ | Une salle de réunion où les agents se rejoignent. |
| 75 | MEDIA LAB (Pham, Luke) | t000.0, t102.0 | MONTRÉ | Salle contenu. |
| 76 | REVENUE BAY | t000.0, t102.0 | MONTRÉ | Salle revenus. |
| 77 | COMMAND (Matt, emblème au sol) | t004.0, t092.0 | MONTRÉ | Salle de l'agent chef. |
| 78 | RESEARCH LAB (Dennis) | t000.0, t102.0 | MONTRÉ | Salle recherche. |
| 79 | ARMORY, jamais ouverte | t000.0, t102.0 | MONTRÉ | Rien. |
| 80 | COMMS BAY, jamais ouverte | t000.0, t102.0 | MONTRÉ | Chez nous, elle aurait un rôle : les mails et messages. |
| 81 | FACTORY (Finn, Bunc) | t004.0, t102.0 | MONTRÉ | Salle production. |
| 82 | SOLAR SYSTEM (planète à l'écran), jamais ouverte | t026.0, t084.0 | MONTRÉ | Rien. |
| 83 | ANALYTICS, jamais ouverte | t084.0 | MONTRÉ | Salle audience (notre onglet Visiteurs). |
| 84 | Salle MAVERICK, écran « DAY 6 / 30 » et « $0 / $200 » | t084.0 (zoom) | MONTRÉ | Écran de salle qui montre l'avancement de l'agent. |
| 85 | TREASURY | t084.0 | MONTRÉ | Salle coûts. |
| 86 | CHILL / BAR | t084.0 | MONTRÉ | Salle décor. |
| 87 | Baie basse à portes de hangar, sans étiquette | t048.0, t092.0 | MONTRÉ | Rien. |
| 88 | Étiquettes de salle roses ; au survol, étiquette en cyan et curseur main | t084.0, t102.0 | MONTRÉ | Survol visible sur chaque salle cliquable. |
| 89 | Sept sprites nommés : MATT, FINN, DENNIS, PHAM, BUNC, LUKE, MAVERICK | t092.0, t102.0 | MONTRÉ | Un sprite par agent, nom au-dessus. |
| 90 | Au repos : Pham et Luke au Media Lab, Dennis au Research Lab, Matt au Command, Finn et Bunc à la Factory, Maverick dans sa salle | t089.1, t092.0, t102.0 | MONTRÉ | Chaque agent a sa salle, celle de son métier. |
| 91 | En route vers la War Room : Dennis et Bunc dans le couloir, Luke sur la passerelle | t007.4 | MONTRÉ | Trajet animé entre deux salles. |
| 92 | Dans la War Room : Luke, Bunc, Matt (étiquette « TT »), Maverick | t030.0, t046.0, t050.0 | MONTRÉ | Réunion = sprites groupés sous l'écran. |
| 93 | Pham reste au Media Lab pendant la réunion | t050.0 | MONTRÉ | Voir l'écart n° 183. |
| 94 | L'écran rond de la War Room montre l'étiquette MAVERICK et un sprite | t024.0, t034.0 | MONTRÉ | L'écran de la salle de réunion montre qui parle. |
| 95 | Après la réunion, chacun est revenu dans sa salle | t089.1 | MONTRÉ | Retour visible à la fin d'un événement. |

## H. Revenue Bay (fenêtre revenus)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 96 | « REVENUE BAY — All income streams in one place · auto-refresh 30s » | x-t058.0 | MONTRÉ | Revenus en un seul endroit, fréquence de rafraîchissement écrite. |
| 97 | Au chargement : cartes à « 0 » et « Loading… » | t054.0, t104.0 | MONTRÉ | Voir le piège n° 188. |
| 98 | 30D TOTAL 2215.98 | x-t058.0 | MONTRÉ | Total 30 jours. |
| 99 | STRIPE (PERSONAL) 891.68 | x-t058.0, t110.0 | MONTRÉ | Une carte par source d'argent. |
| 100 | GUMROAD 1324.30 | x-t058.0, t110.0 | MONTRÉ | Idem. |
| 101 | ETSY 0.00 | t060.0, t110.0 | MONTRÉ | Afficher aussi les sources à zéro. |
| 102 | MANUAL (FIVERR/ETC) 0.00 | t060.0 | MONTRÉ | Case pour les rentrées saisies à la main. |
| 103 | Onglets ALL, BOFBOT, WHATAPTISTHIS, GUMROAD, ETSY, FIVERR (MANUAL) | t054.0, x-t058.0 | MONTRÉ | Un onglet par produit. |
| 104 | « AGENT-ATTRIBUTED REVENUE (30D) $1324.30 — Gumroad + Etsy + manual entries — what the agents earned » | x-t058.0 | MONTRÉ | Séparer ce que les agents ont rapporté du reste. |
| 105 | « …68 — Stripe products, not driven by agents » | t060.0 | MONTRÉ | Dire en clair ce qui ne vient pas des agents. |
| 106 | « 30-DAY REVENUE BY SOURCE (STACKED, $) », échelle $0 / $123 / $245, légende Stripe, Gumroad, Etsy, Manual | x-t058.0 | MONTRÉ | Graphique empilé par source. |
| 107 | Histogramme par jour, barres blanches | t060.0 | MONTRÉ | Revenus au jour le jour. |
| 108 | Bouton « close » en haut à droite de la fenêtre | t060.0 | MONTRÉ | Fermeture visible. |
| 109 | Onglet BOFBOT : 30D REVENUE 879.72 | t106.0 | MONTRÉ | Revenu 30 jours par produit. |
| 110 | BOFBOT : MRR (COMBINED) 964.69 | t110.0 | MONTRÉ | Revenu mensuel récurrent : notre chiffre clé (abonnements artisans). |
| 111 | BOFBOT : TOTAL TRANSACTIONS (30D) 28 | t110.0 | MONTRÉ | Nombre de paiements sur 30 jours. |
| 112 | Canal WEB · STRIPE $859.74, net après frais, badge « real-time » | t106.0, t110.0 | MONTRÉ | Montant net et fraîcheur de la donnée. |
| 113 | iOS · APP STORE $124.95, « net ~$106.21/mo (after 15% Apple cut) · 5 active subs » | t110.0 | MONTRÉ | Net après commission et nombre d'abonnés actifs. |
| 114 | « BOFBOT DAILY REVENUE (30D) — STRIPE CHANNEL ONLY », dates May 4, May 11, May 18 | t106.0, t110.0 | MONTRÉ | Écrire le périmètre sous chaque graphique. |
| 115 | CALCUL : 891.68 + 1324.30 + 0 + 0 = 2215.98 = 30D TOTAL, arrondi à $2216 dans la barre du haut | x-t058.0, t004.0 | CALCUL | Un chiffre, un seul calcul, partout pareil. |

## I. Treasury (fenêtre coûts)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 116 | « TREASURY — OpenRouter spend · per-agent costs · per-task spends · auto-refresh 5s » | x-t066.0 | MONTRÉ | Salle coûts IA, rafraîchie souvent. |
| 117 | Onglets OVERVIEW et RECENT SPENDS (83) ; « (0) » à l'ouverture | x-t066.0, t062.0 | MONTRÉ | Liste des dépenses une par une. |
| 118 | TOTAL SPENT ON OPENROUTER $31.88 | x-t066.0 | MONTRÉ | Total dépensé. |
| 119 | REMAINING $8.12 avec badge « WARN » | x-t066.0 | MONTRÉ | Crédit restant et seuil d'alerte. |
| 120 | « SUBSCRIPTION COSTS (SEPARATE FROM OPENROUTER) » | x-t066.0 | MONTRÉ | Séparer abonnement fixe et paiement à l'usage. |
| 121 | « Matt $100/mo flat · ChatGPT Pro · GPT-5.5 via Codex · unlimited-ish (5× Plus, 20× during May promo) » | x-t064.0, zoom t063.0 | MONTRÉ | Écrire le coût fixe de chaque agent sous abonnement. |
| 122 | « Per-agent table below tracks OpenRouter usage only. Matt's entry there reflects pre-subscription history » | x-t064.0 | MONTRÉ | Dire ce que le tableau ne compte pas. |
| 123 | Tableau « PER-AGENT COSTS — OPENROUTER LLM + REPLICATE (IMAGE/VIDEO GEN) », colonnes TOTAL / LLM / REPLICATE LIFETIME | x-t064.0 | MONTRÉ | Coût par agent, texte et image séparés. |
| 124 | matt $15.42 | x-t066.0 | MONTRÉ | Coût cumulé par agent. |
| 125 | bunc $8.73 | x-t066.0 | MONTRÉ | Idem. |
| 126 | finn $4.07 | x-t066.0 | MONTRÉ | Idem. |
| 127 | dennis $2.99 | x-t066.0 | MONTRÉ | Idem. |
| 128 | luke $2.60 (plutôt en image/vidéo, lecture incertaine) | x-t064.0, x-t066.0 | MONTRÉ | Idem. |
| 129 | pham $0.00 | x-t066.0 | MONTRÉ | Idem. |
| 130 | Pied : « Sum of per-agent lifetime (LLM + Replicate): $33.81 · OpenRouter total: $31.?1 · Replicate spend tracked separately in /root/treasury/… » | x-t066.0 | MONTRÉ | Une ligne de contrôle qui rapproche les deux totaux. |
| 131 | CALCUL : 15.42 + 8.73 + 4.07 + 2.99 + 2.60 + 0 = 33.81 (le pied est juste) | x-t066.0 | CALCUL | Pied de tableau qui se vérifie à la main. |
| 132 | Chargement : « $— » et « No agent data yet. » | t062.0 | MONTRÉ | Un tiret pendant le chargement, pas un zéro. |

## J. Factory (fenêtre production)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 133 | « FACTORY — Order pipeline + executor agents · auto-refresh 5s » | t070.0 | MONTRÉ | Salle production. |
| 134 | Cartes ORDERS TOTAL 0, AWAITING APPROVAL 0 (« needs review »), FINN PENDING 0 | t070.0 | MONTRÉ | Compteurs de commandes en tête. |
| 135 | Onglets FINN, APPROVALS, DELIVERED, BUNC | t070.0 | MONTRÉ | Un onglet par agent, plus « à approuver » et « livré ». |
| 136 | « ACTIVE ORDERS · 0 » ; « NO ORDERS YET — When Fiverr orders arrive they appear here for Finn. » | t070.0 | MONTRÉ | Un état vide qui dit ce qui va arriver ici. |
| 137 | « RECENT FINN TASKS » : numéro, type, pastille d'état, résumé | t070.0 | MONTRÉ | Journal des tâches par agent. |
| 138 | #8 fulfill DONE — « Blocked: Cannot locate FV… » | t070.0 | MONTRÉ | Voir le piège n° 187. |
| 139 | #13 fulfill DONE — « FVR-201 thumbnail v1 produ… » | t070.0 | MONTRÉ | Rien. |
| 140 | #15 meeting REJECTED — « replaced with UI-only meeti… » | t070.0 | MONTRÉ | Voir l'écart n° 184. |
| 141 | #85 task DONE — « Updated /root/agents/finn/p… » | t070.0 | MONTRÉ | Rien. |
| 142 | #5 chat CANCELLED — « test cleanup » | t070.0 | MONTRÉ | Rien. |
| 143 | #12 chat DONE — « Operational. I am currently r… » | t070.0 | MONTRÉ | Rien. |
| 144 | #18, #27, #36 task DONE — « Could not find FVR-001 order… » | t070.0 | MONTRÉ | Voir le piège n° 187. |
| 145 | Onglet BUNC : « TonkaShops · open shop ↗ » | t072.0 | MONTRÉ | Lien direct vers la vitrine réelle. |
| 146 | ACTIVE LISTINGS 5, DRAFT LISTINGS 0 | t072.0 | MONTRÉ | Compteurs en ligne / brouillon. |
| 147 | RECENT ORDERS (0) — « no orders yet — first sale will appear here » | t072.0 | MONTRÉ | État vide honnête. |
| 148 | AWAITING YOUR APPROVAL 1 ; PUBLISHED LIVE 5 | t072.0 | MONTRÉ | Ce qui attend Benj, en gros. |
| 149 | Fiche en revue : « REVISED v2 — READY FOR REVIEW », « from 2026-05-11-candle-niche-humor-novelty-candles » (lecture partielle) | t072.0 | MONTRÉ | Version et origine de chaque livrable à valider. |
| 150 | « last event: revised_v2_printify_product_updated_unpublished » | t072.0 | MONTRÉ | Dernier événement affiché sur la fiche. |
| 151 | Aperçu du produit (bougie), « click to zoom » | t072.0 | MONTRÉ | Aperçu visuel du livrable avant validation. |
| 152 | Journal : « Bunc — Uploaded revised label image and PUT updated Printify product… » | x-t074.0 | MONTRÉ | Ligne de journal = agent + verbe + objet. |
| 153 | Champ de note : « …for Bunc (required for revision · optional note for approve · writes to bu…) » | x-t074.0 | MONTRÉ | Note obligatoire quand on renvoie un travail en correction. |
| 154 | « PUBLISHED LIVE (5) — GROUPED BY NICHE · CLICK [+] TO ADD MORE DESIGNS » | x-t074.0 | MONTRÉ | Livrables publiés rangés par cible ; bouton pour en demander plus. |
| 155 | Niches : bougies (thème flou) 1, t-shirt « internet communities » 1, t-shirt « pickleball enthusiast » 1, t-shirt « skilled trades occupation humor » 2 | x-t074.0, t076.0 | MONTRÉ | Chez nous : sites et posts rangés par métier d'artisan. |
| 156 | Visuel « ANYTHING … DAD DECISIONS » avec lien « #4503336213 · Etsy » | t076.0 | MONTRÉ | Lien vers l'objet publié. |
| 157 | « BUNC'S RECENT TASKS (30) » : tâches fulfill datées du 9 au 11 mai, dont une « blocked » | t076.0 | MONTRÉ | Journal daté par agent, état en clair. |

## K. Media Lab (fenêtre contenu)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 158 | Sous-titre « …(Luke) + YouTube music (Pham) · file-drop pipeline » | t082.0 | MONTRÉ | Dire « dépôt de fichiers » quand l'agent prépare et que l'humain publie. |
| 159 | LUKE VIDEOS 2, PHOTO SETS 1, PHAM STATUS 0 | t082.0, x-t080.0 | MONTRÉ | Compteurs de contenus prêts. |
| 160 | Onglets « …VIDEO (2) » et « PHAM — YOUTUBE MUSIC (0) » | t082.0 | MONTRÉ | Un onglet par agent contenu. |
| 161 | Liste : « Funny Tradesman Gift » (…niche-skilled-trades-occupation-humor…, 6 slides), deux « video slideshow », deux dossiers vides | t082.0 | MONTRÉ | Un dossier par contenu, nommé par cible. |
| 162 | « photo-set-01 · 6 swipeable slides for TikTok Photo Mode » | t082.0 | MONTRÉ | Carrousels prêts à poster. |
| 163 | Diapo d'accroche « tag the tradesman in your life » (hook · 109KB) | t082.0 | MONTRÉ | Accroche en première diapo. |
| 164 | slide 2 · 62KB, slide 3 · 67KB (t-shirt), slide 4… | t082.0, x-t080.0 | MONTRÉ | Poids affiché sous chaque fichier. |
| 165 | Bouton de téléchargement groupé « ↓ DOWN… » (lecture partielle) | x-t080.0 | MONTRÉ | Tout récupérer en un clic. |
| 166 | « CAPTION.TXT (PASTE INTO TIKTOK PHOTO POST) » — Loading… | t082.0 | MONTRÉ | Légende prête à coller. |
| 167 | « AUDIO.TXT (SUGGESTED TRENDING SOUND) » — Loading… | t082.0 | MONTRÉ | Son proposé avec le post. |
| 168 | « Click any slide thumbnail to download, or use the ↓ button to grab all 5. Upload to TikTok as a Photo po… » | t082.0 | MONTRÉ | La publication vidéo reste un geste humain ; même constat que chez nous. |

## L. Chill / Bar

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 169 | Fenêtre « CHILL / BAR — Room kind: game » | t086.0 | MONTRÉ | Un type de salle déclaré (jeu, travail…). |
| 170 | « Custom dashboard for CHILL / BAR coming soon. For now, see Command Center for the full ops view. » | t086.0 | MONTRÉ | Une salle sans tableau renvoie vers la vue complète, jamais une page vide. |

## M. Panneau de commande (colonne droite)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 171 | « COMMAN[DER] LV. 4 », barre d'XP, « Total: 650 XP » | t060.0 (zoom) | MONTRÉ | Gamification possible du propriétaire ; optionnel. |
| 172 | Mission active : « Get first … order — Once gigs a[re]… review, pub… (Reddit, com…) publicly). BY MATT » | t060.0 (zoom) | MONTRÉ | Un objectif du moment, écrit par l'agent chef, signé. |
| 173 | Fil « SHIP COM[MS] », messages « MATT> » | t060.0 (zoom) | MONTRÉ | Fil des comptes rendus de l'agent chef. |
| 174 | Contenu d'un message (lecture partielle) : « cycle complete: worker tasks … verified … gates (#116) … REVISION_REQ… orders … health healthy … anomaly false; WARN remaining 8.1284… todaySpend … todayTaskCount … escalated #116 … setup » | t060.0 (zoom) | MONTRÉ | Rapport de cycle à champs fixes : tâches vérifiées, santé, anomalie, dépense du jour, escalades. |
| 175 | Champ « ▸ Transmit to crew… » | t060.0 (zoom) | MONTRÉ | Donner un ordre aux agents depuis le Poste. |

## N. Terminal (second écran)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 176 | Terminal à conversation et commandes. Fragments lisibles, lecture incertaine : « a TikTok link/screenshot of the EXACT thing you saw », « …of nodes from analyzing a real codebase », « gitnexus@latest serve > /var/log/gitnexus-serv… », « npm install -g gitnexus 2>&1 \| tail -20 » | t036.0, t090.0 (zoom) | MONTRÉ | Rien (outil de développement, texte trop flou pour conclure). |

## O. Gestes et interactions

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 177 | Clic sur une salle → fenêtre de tableau de bord par-dessus la station, barre du haut conservée | t054.0, t062.0, t070.0, t086.0 | M+D (0:53) | Salle cliquable = tableau de bord. |
| 178 | Survol d'une salle → curseur main et étiquette qui change de couleur | t084.0, t102.0 | MONTRÉ | Retour visuel au survol. |
| 179 | Fermeture par le bouton « close » | t060.0 | MONTRÉ | Idem. |
| 180 | Onglets dans chaque fenêtre (Revenue, Treasury, Factory, Media Lab) | t072.0, t104.0 | MONTRÉ | Onglets par agent ou par produit. |
| 181 | Revenue Bay ouverte deux fois : onglet ALL, puis BOFBOT | t054.0-t060.0, t104.0-t112.0 | MONTRÉ | Rien. |
| 182 | Écran rempli de nébuleuse avec curseur en croix, entre deux vues | t052.9, t068.8, t084.9 | MONTRÉ | Rien (nature de la transition non visible). |

## P. Écarts entre ce qui est dit et ce qui est montré (pièges)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 183 | DIT « my AI agents all walking to the meeting room », MONTRÉ : Pham reste au Media Lab | 0:01, t050.0 | M+D | Si un agent ne vient pas, le dire (Pham est « awaiting_setup »). |
| 184 | DIT « on the back end having a meeting », MONTRÉ : tâche #15 « meeting REJECTED — replaced with UI-only meeti… » | 0:35, t070.0 | M+D | DÉDUCTION : au moins une réunion a été remplacée par une réunion d'interface seule. Chez nous : aucun déplacement de sprite sans événement réel en base. |
| 185 | DIT « Luke posts TikToks », MONTRÉ : « Upload to TikTok as a Photo post », dépôt par l'humain | 1:16, t082.0 | M+D | Ne jamais dire « l'agent publie » quand c'est Benj ou Gabriel qui publie. |
| 186 | DIT réunion en cours, MONTRÉ : les sept cartes « Awaiting orders » | 0:23, t014.0-t022.7 | M+D | L'état de la carte doit dire « en réunion » quand l'agent y est. |
| 187 | Tâches marquées DONE dont le texte dit « Blocked » ou « Could not find FVR-001 order » (quatre fois) | t070.0 | MONTRÉ | Un échec n'est jamais « fait » : état = résultat réel. |
| 188 | Zéros affichés pendant le chargement (30D TOTAL 0, STRIPE 0, GUMROAD 0, ETSY 0) | t054.0, t104.0 | MONTRÉ | Pendant un chargement : un tiret, jamais 0. |
| 189 | DIT « make me a bunch of money all while I sleep », MONTRÉ : $2216 en tête, dont 891.68 « not driven by agents » ; part des agents 1324.30, Etsy 0, Fiverr 0 | 0:10, x-t058.0, t060.0 | M+D | En tête, afficher d'abord ce que les agents ont rapporté. |
| 190 | DIT « all the deliveries that Bunc has made », MONTRÉ : 0 commande Fiverr, 0 vente Etsy, 5 fiches en ligne | 1:10, t070.0, t072.0 | M+D | « Livré » = publié, « vendu » = payé ; ne pas mélanger. |
| 191 | DÉDUCTION : MATT NEXT perd 2 min (1h 38m → 1h 36m) en 116 s de vidéo, donc la vidéo est montée avec des coupes | t004.0, t068.0 | DÉDUCTION | Notre vidéo du Poste peut être montée, sans truquer les chiffres. |
| 192 | CALCUL : dépense visible = 31.88 $ d'OpenRouter + 100 $/mois d'abonnement ; revenu attribué aux agents = 1324.30 $ sur 30 jours, tout sur Gumroad | x-t058.0, x-t066.0 | CALCUL | Mettre coût et revenu des agents côte à côte. |

---

## Corrections des relevés précédents

- `trevsagents-voix-video.txt` est un résumé fidèle, mais ce n'est pas une transcription. La transcription mot à mot refaite confirme le résumé. Elle ajoute : « clanker meeting » (0:24), « all you need is open claw really » (1:35), et l'agent musique « that we're so [probablement still] setting up » (0:16).
- La reconnaissance « U2BI music » du premier relevé n'apparaît plus : c'est « a YouTube AI music agent ».
- « Blanc » dans la voix (1:12) = Bunc (étiquette t004.0, carte t020.0).
- Le résumé ne relevait aucun des écarts de la section P.

## Numérotation

**Total : 192 éléments**, numérotés de 1 à 192 sans trou.

## Les 10 éléments les plus importants pour Presti

1. **Barre de compteurs fixe** : revenu, dépense, prochain cycle du chef, modèle, cycles du jour, quota, prochaine réunion, expérience (n° 40 à 49).
2. **Colonne équipe** : une carte par agent avec rôle, état, mode de réveil (minuterie ou sur tâche) et blocage écrit en rouge (n° 50 à 62).
3. **Bloc ATTENTION** : décisions humaines comptées et formulées comme des actions, trois couleurs par gravité (n° 63 à 71).
4. **Salle = tableau de bord** : clic sur une salle, fenêtre par-dessus la station, barre du haut conservée (n° 18, 177).
5. **Sprites nommés qui vivent dans la salle de leur métier** et se rejoignent pour la réunion (n° 89 à 95).
6. **Trésorerie** : coût par agent, crédit restant avec alerte, abonnement séparé du paiement à l'usage, pied de contrôle (n° 116 à 132).
7. **Revenus séparés** : ce que les agents ont rapporté d'un côté, le reste de l'autre ; MRR, net après commission, abonnés actifs (n° 104, 105, 110, 113).
8. **Circuit de validation** : « awaiting your approval », version v2 prête avec aperçu, note obligatoire pour une correction (n° 148 à 154).
9. **Panneau du chef** : rapports de cycle à champs fixes, mission active signée, champ « Transmit to crew » (n° 172 à 175).
10. **Pièges à ne pas copier** : échecs marqués DONE, réunion « UI-only », « l'agent publie » alors que l'humain dépose, zéros pendant le chargement, revenu en tête qui mélange agents et non-agents (n° 183 à 190).
