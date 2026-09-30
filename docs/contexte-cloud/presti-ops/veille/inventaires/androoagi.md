# Inventaire — androoagi (vaisseau d'agents, modules vus de dessus)

Relevé le 25/09/2026. Lecture seule des sources. Rien n'est inventé : ce qui n'est pas lisible est dit illisible, ce qui est douteux porte « (?) ».

## Sources et méthode

- **Vidéo** : `veille/2026-09-24/videos/androoagi.mp4` (TikTok @androoagi, 1080×1920, 30 i/s, 179,8 s).
- **60 images** `images/androoagi/tNNN.N.jpg` regardées une par une, dans l'ordre (t000.0 à t176.0). `plans.json` : 93 candidats, 33 doublons retirés, aucun fichier de 0 octet.
- **Transcription** `androoagi.txt` lue en entière (31 segments, anglais).
- **Métadonnées** `androoagi.info.json` lues (titre, légende, compteurs).
- **Trous comblés** : pour les passages sans image dans le dossier (0:56–1:06, 1:20–1:52, 2:26, 2:46, 2:58), j'ai regardé des images pleine définition de la vidéo déjà extraites lors du passage précédent (dossier temporaire), plus des recadrages agrandis des petits textes. Aucun ffmpeg relancé cette fois.

**Conventions.**
- **tNNN** = image du dossier. **vid m:ss** = image pleine définition de la vidéo à cet instant. **m:ss** seul = transcription.
- **MONTRÉ** = visible à l'image. **DIT** = dans la voix ou la légende. **M+D** = les deux.
- **CONSTAT** = comparaison de deux chiffres montrés ou dits, faite par moi. Toujours signalé.
- Colonne « Presti reprend » : une ligne, pensée pour le Poste en pixel art (CLAW3D) et ses 12 agents en 4 pôles.

---

## A. Fiche de la source

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 1 | Format vertical 1080×1920, 30 i/s, 2:59 | en-tête transcription ; info.json | MONTRÉ | Démo du Poste en 9:16, moins de 3 min. |
| 2 | Auteur androoAGI, TikTok, publié le 01/04/2026 | info.json | MONTRÉ | Rien (identité de la source). |
| 3 | Compteurs : 280 200 vues, 10 600 j'aime, 290 commentaires, 3 064 partages, 5 948 enregistrements | info.json | MONTRÉ | Preuve que « voir ses agents travailler » attire : sujet porteur pour nos posts. |
| 4 | Titre/légende : « Best ways to create automated businesses with AI agents #aiagents #openclaw » | info.json | DIT | Le hashtag OpenClaw ne change rien : OpenClaw reste écarté, on reprend l'interface, pas l'outil. |
| 5 | Son : « original sound » (sa voix) | info.json | MONTRÉ | Voix réelle de Benj sur la démo, pas de voix de synthèse. |

## B. Tournage et gestes

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 6 | Écran filmé au téléphone, à la main, face à un moniteur LG ; pièce rose, Rubik's cube, boîtes Velo sur le bureau | t000, t010, t172 | MONTRÉ | Filmer l'écran réel du Poste qui tourne, pas une maquette. |
| 7 | Pointeur « main de dessin animé au bout d'une tige » qui désigne chaque zone | t010, t016, t022, t026, t044, t142 | MONTRÉ | Dans la démo, désigner chaque module au moment précis où la voix le nomme. |
| 8 | Curseur de souris visible sur la carte | t016, t018, t156 | MONTRÉ | La carte est cliquable : chaque module ouvre sa fiche. |
| 9 | Aller-retour carte → page réelle → carte (Etsy, YouTube, Fiverr, GameDev Market) | t024→t026→t028 ; t052→t054→t068 ; t076→t088→t118 ; t134→t136→t150 | MONTRÉ | Chaque module du Poste doit ouvrir sa preuve réelle (devis PDF, mail parti, site en ligne). |
| 10 | Pages web montrées sur un second écran (portable) | t054, vid 1:00, vid 1:06 | MONTRÉ | Rien (décor de tournage). |
| 11 | Troisième écran vertical à droite, liste colorée illisible | t077.7 | MONTRÉ | Rien (illisible). |
| 12 | Passages flous pendant les bascules d'écran | t006, t028, t078, t128, t134 | MONTRÉ | Couper les passages flous au montage. |
| 13 | Fin sur un dézoom : tout le vaisseau d'un coup | t174, t176, vid 2:58 | MONTRÉ | Finir la démo sur la vue « tout le Poste ». |

## C. Barre du haut (tableau de bord)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 14 | Nom du logiciel en haut à gauche : « …TRON OS » (ULTRON OS, lecture probable) | t000, vid 0:38 | MONTRÉ | Un nom au Poste, en haut à gauche. |
| 15 | Onglet « FACTORY II » à côté du nom (module ouvert) | t000, vid 0:38 | MONTRÉ | Rappeler en haut le module ouvert. |
| 16 | Voyant vert « STATION ONLINE » | t000, vid 0:38 | MONTRÉ | Voyant « Poste en ligne » branché sur un vrai contrôle de santé. |
| 17 | Horloge de simulation « Day 3 — 01:0x » avec une lune | t000, vid 0:14 | MONTRÉ | Heure du Poste = heure réelle ; jour/nuit si les agents tournent la nuit. |
| 18 | Boutons de vitesse : pause, 1x (actif), 2x, 5x, 10x | t000, t016, t020, t166, vid 0:14 | MONTRÉ | Rejouer la journée des agents en accéléré à partir du vrai journal. |
| 19 | « REVENUE: $1,836.72 » en vert | t010, vid 0:47 | MONTRÉ | Chiffre d'affaires en haut, tiré de la même source que la page factures. |
| 20 | « ORDERS: » suivi d'un seul chiffre, illisible | t000, vid 0:14 | MONTRÉ | Voir n° 212 : ne pas afficher un compteur qui contredit la page source. |
| 21 | « PRODUCTS: 10 LIVE » en violet | t000, t018, vid 0:14 | MONTRÉ | Compteur « sites en ligne / devis ouverts » vivant. |
| 22 | « AGENTS: 4/6 ACTIVE » en orange | t016, t018, t166 | MONTRÉ | « Agents actifs x/12 » en haut du Poste. |
| 23 | Cloche avec pastille rouge « 50 » | t022, vid 0:21 | MONTRÉ | Cloche d'alertes avec un compteur réel. |
| 24 | Deux icônes à côté (drapeau ou plume, tablette bleue), rôle non dit | t022 | MONTRÉ | Rien (rôle inconnu). |
| 25 | Interrupteur vert « AUTO » | t022, t024 | MONTRÉ | Interrupteur visible autonome/manuel ; « Publier » reste soumis à l'accord de Benj. |
| 26 | « SHIP TIME 13:38:44 → 13:38:46 → 13:38:47 EST » : horloge réelle à la seconde | vid 0:21, t022, t024 | MONTRÉ | Heure réelle à la seconde : preuve simple que l'écran est vivant. |

## D. Panneau gauche « SHIP CREW »

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 27 | Titre « SHIP CREW » + consigne « Click name for profile · [icône] to DM » | t000, vid 0:38 | MONTRÉ | Liste des 12 agents : clic = fiche, icône = message direct. |
| 28 | Pastille de couleur devant chaque nom (bleue ; jaune devant Forge (?)) | t000 | MONTRÉ | Pastille d'état : vert actif, jaune « attend Benj », gris au repos. |
| 29 | Andrew — « Commander / Founder », carte en surbrillance, étiquette grise illisible | t000 | MONTRÉ | Benj en tête de liste, carte distincte. |
| 30 | Agent au nom cyan illisible — « Monitoring — 10 cycles completed · L… » | t000, vid 0:38 | MONTRÉ | Statut en une ligne : ce que fait l'agent + nombre de cycles faits. |
| 31 | Agent au nom vert illisible — « Idle — last research 7h ago » | t000, vid 0:38 | MONTRÉ | Dire honnêtement « au repos — dernière recherche il y a 7 h ». |
| 32 | Forge (?) — « 40 products awaiting approval · 10 p… » | t000, vid 0:38 | MONTRÉ | Un statut d'agent peut être « attend ta validation », avec le nombre. |
| 33 | Pixel (?) — « Idle — last design activity 7h ago » | t000 | MONTRÉ | Même format pour tous : état + dernière action + ancienneté. |
| 34 | Cipher — « Idle — last analysis 7h ago » | t000 | MONTRÉ | Idem. |
| 35 | Atlas (?) — « Last briefing: "Gwen's Crumbles & a…" » (lecture incertaine) | t000, vid 0:38 | MONTRÉ | Montrer le dernier briefing reçu par l'agent. |
| 36 | Quest (?) — « Idle — last inspection 7h ago » | t000 | MONTRÉ | Idem n° 33. |
| 37 | Ledger — « Financial Officer » | t000 | MONTRÉ | Un rôle métier lisible sous chaque nom (ex. « Relances factures »). |
| 38 | Echo — « Signal Analyst » | t000 | MONTRÉ | Idem. |
| 39 | Bouton bulle (message) à droite de chaque agent | t000, vid 0:38, t150 | MONTRÉ | Bouton « écrire à l'agent » sur chaque ligne. |
| 40 | Petite ligne colorée sous chaque agent, illisible | t000 | MONTRÉ | Rien (illisible). |
| 41 | Flèche « ◀ » pour replier le panneau | t000 | MONTRÉ | Panneaux repliables pour libérer la carte. |
| 42 | 10 fiches dans la liste | t000 | MONTRÉ | Voir n° 214. |

## E. La carte et ses modules

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 43 | Carte vue de dessus, pixel art, fond espace étoilé violet | t000, t040 | M+D (« ecosystem I built for my AI agents », 0:00) | Le Poste CLAW3D : modules vus de dessus, pixel art, fond sombre. |
| 44 | Module FACTORY II, LV.1 (salle de gauche) | t000, t040 | M+D (« two little factory rooms », 0:11) | Un module = un pôle (audit, animation, gestion, mails). |
| 45 | Module FACTORY DECK, LV.1 (salle de droite) | t004, t018 | M+D (0:11) | Idem. |
| 46 | Module TREASURY, LV.1, lingots jaunes (bas gauche) | t000, t122 | MONTRÉ | Salle « Trésorerie » = factures, acomptes, relances. |
| 47 | Module ARMORY, LV.1 (bas droite) | t004, t018 | MONTRÉ | Rien (rôle non dit). |
| 48 | « RADAR BAY » au-dessus de Factory II : barres montantes + courbe | t040, vid 0:47 | MONTRÉ | Salle de veille / prospection, graphique branché sur des données réelles. |
| 49 | Panneau de voyants verts et bleus en haut, au centre | t000, t046 | MONTRÉ | Voyants = tâches planifiées en service. |
| 50 | Sas lumineux verticaux entre les modules | t000, t018, t164 | MONTRÉ | Couloirs où les agents passent d'un pôle à l'autre. |
| 51 | Badge de niveau « LV.1 » sous chaque nom de module | t000, t018, t122 | MONTRÉ | Niveau seulement s'il mesure quelque chose de vrai (ex. automatisations en service). |
| 52 | Cartouche de nom de module (point coloré + nom en lettres pixel) | t018, t040 | MONTRÉ | Nom de pôle lisible au-dessus de chaque salle. |
| 53 | Vue d'ensemble finale : grille d'au moins 12 salles (3 rangées, 4 colonnes visibles), une couleur par salle (orange, bleu, vert, violet, jaune, cyan) | t174, t176, vid 2:58 | MONTRÉ | La vue « tout le Poste » : 12 salles pour 12 agents, une couleur chacune. |
| 54 | Une salle de la grille encadrée de blanc (sélection) | t174, t176 | MONTRÉ | Sélection visible au survol ou au clic. |
| 55 | Petits personnages dans les couloirs de la grille | t174, vid 2:58 | MONTRÉ | Les agents restent visibles même en vue dézoomée. |
| 56 | Libellé au-dessus de la grille, illisible | t174, vid 2:58 | MONTRÉ | Rien (illisible). |

## F. Factory II (studio musique, services, assets)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 57 | Studio de Vybes : cabine rose « MUSIC » avec icône casque, en haut à gauche | t040, t072, t074 | M+D (« top left corner … little studio », 0:34.8–0:40.2) | Chaque agent a son poste de travail dessiné dans son module. |
| 58 | Chaîne MUSIC : COMPOSE → PRODUCE → MASTER → RELEASE | t040, t042, t046 | M+D (house, deep house, techno, 0:40–0:51) | Une chaîne = les étapes nommées du métier (ex. demande → chiffrage → envoi → signé). |
| 59 | Compteur « ♪ TRACKS: 326 », puis 333 | t002, vid 0:14, t166 | MONTRÉ | Compteur de sortie en bout de chaîne, qui ne fait que monter. |
| 60 | Enceintes roses en bout de chaîne MUSIC | t042, t046 | MONTRÉ | Rien (décor). |
| 61 | Chaîne SERVICES : ORDER → CREATE → REVIEW → DELIVER | t040, t076, t120 | M+D (« services is actually a Fiverr service », 1:09.8–1:16.7) | Chaîne « demande client → réponse → relecture → envoi ». |
| 62 | Compteur « ORDERS: 51 », puis 52 | t002, vid 0:14, t166 | MONTRÉ | Idem n° 59. |
| 63 | Événement flottant « +1 DELIVERED » | t124 | MONTRÉ | Chaque livraison réelle fait apparaître un « +1 » sur la carte. |
| 64 | Chaîne ASSETS : CONCEPT → DESIGN → PACKAGE → PUBLISH | t040, t122 | M+D (« 2D game assets », 2:08–2:38) | Idem n° 58. |
| 65 | Compteur « PACKS: 256 », puis 262 | t002, vid 0:14, t166 | MONTRÉ | Idem n° 59. |
| 66 | Événement flottant « +1 PUBLISHED » | vid 0:47 | MONTRÉ | Idem n° 63. |
| 67 | Étiquettes d'objets en cours : « BEAT 1 », « ASSET 1 », « ASSET 3 » | t042, t072, t124, vid 0:07 | MONTRÉ | L'objet sur le tapis porte son nom (ex. « Devis Martin »). |
| 68 | Tapis roulant hachuré jaune et noir, objets qui avancent | t040, t122 | MONTRÉ | Les tâches avancent physiquement d'une étape à l'autre. |
| 69 | Écran égaliseur bleu au centre de la salle | t042, t122 | MONTRÉ | Rien (décor). |
| 70 | Trois cases de couleur (violet, vert, jaune) en bas à gauche | t040, t044 | MONTRÉ | Rien (rôle inconnu). |
| 71 | Libellés de voie à gauche : « ♪ MUSIC », « ⚡ SERVICES », « ◆ ASSETS » dans un cartouche de couleur | t040, t044 | MONTRÉ | Une couleur par chaîne, reprise sur son cartouche. |

## G. Factory Deck (Etsy, newsletter, production, contenu)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 72 | Tapis du haut : PICKUP → PRESS → QA SCAN → PACKAGE, voyant vert au-dessus de chaque poste | t018, vid 0:19 | M+D (« on this conveyor belt … our Etsy store », 0:17.6) | Chaîne physique claire : prise en charge → fabrication → contrôle → emballage. |
| 73 | Poste « FORGE-2 » à l'étape PRESS | t156, vid 2:40 | MONTRÉ | Nommer le poste par l'agent qui l'occupe. |
| 74 | Bras robotisés, entonnoir, cadre vert au QA SCAN | t018, t020 | MONTRÉ | Un dessin différent par étape pour la reconnaître d'un coup d'œil. |
| 75 | Événement flottant « +1 SHIPPED » | t020, vid 0:19 | MONTRÉ | Idem n° 63. |
| 76 | Boucle centrale : DRAFT → WRITE → DESIGN → SEND | vid 0:19, t160 | MONTRÉ | Chaîne d'écriture des mails : brouillon → rédaction → mise en forme → envoi. |
| 77 | Case rouge « REJECT » sur la boucle | t018, vid 0:19, vid 2:46 | MONTRÉ | Le rebut reste visible : une tâche refusée au contrôle s'affiche en rouge. |
| 78 | Événement flottant « +1 SENT » | t164 | MONTRÉ | Idem n° 63. |
| 79 | Chaîne NEWSLETTER (icônes d'enveloppes) | t018, t156 | M+D (« This is our newsletter », 2:37) | Chaîne du pôle mails. |
| 80 | Compteur « SENT: 1425 », puis 1428 | t004, t020 | MONTRÉ | Idem n° 59. |
| 81 | Chaîne PRODUCTION : PLAN → MAKE → CHECK → SHIP (cases cochées au CHECK) | t018, t162, vid 2:40 | M+D (« this production … marketing content », 2:42) | Chaîne de production de contenu avec une case « vérifié ». |
| 82 | Compteur « SHIPPED: 1582 », puis 1585 | t004, t018 | MONTRÉ | Idem n° 59. |
| 83 | Compteur « OUTPUT 1601 → 1604 → 1605 → 1638 » | t004, t018, t020, t164 | MONTRÉ | Un total général par module, qui ne recule jamais. |
| 84 | Jauge « PASS: 98% » | t018, t156, t162 | MONTRÉ | Taux de réussite du contrôle, seulement s'il est calculé (voir n° 215). |
| 85 | Trois cases violettes vides au-dessus de PASS | t018, t162 | MONTRÉ | Rien (rôle inconnu). |
| 86 | Bande du haut : IDEA → SCRIPT → FILM → EDIT → POST, « n items » par étape (0 / 1 / 0 / 1 / 0) | t018, vid 0:19 | MONTRÉ | Chaîne vidéo de Presti : idée → script → tournage → montage → publication. |
| 87 | Icônes « lecture » colorées qui glissent sur cette bande | t018, t020 | MONTRÉ | Chaque vidéo en cours = une vignette qui avance. |
| 88 | Tête de lecture rouge verticale sur la bande | t018, vid 0:19 | MONTRÉ | Rien (décor). |
| 89 | Compteur « CONTENT SHIPPED: 1021 → 1023 → 1024 → 1044 » | t004, t018, t020, t164 | MONTRÉ | Idem n° 59. |
| 90 | Cartouche « FACTORY DECK » violet, LV.1, roue dentée | t018, t158 | MONTRÉ | Idem n° 52. |

## H. Personnages sur la carte

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 91 | VYBES — robot jaune à casque, sous-titre « Crew », dans le studio | t042, vid 0:07 | M+D (« Vibes », 0:40) | Chaque agent : avatar + nom + rôle écrits au-dessus de sa tête. |
| 92 | PRISM — robot à écran « W », Factory II | t042, t072, t132 | MONTRÉ | Idem. |
| 93 | SPARKY — petit robot sur la chaîne ASSETS | t042, vid 0:47 | MONTRÉ | Idem. |
| 94 | Robots ouvriers « W » sans nom (plusieurs) | t040, t122 | MONTRÉ | Distinguer les agents nommés des exécutants anonymes (Codex, Antigravity). |
| 95 | Anneau lumineux autour de l'agent qui travaille | t040, t122, t164 | MONTRÉ | Anneau autour de l'agent en action. |
| 96 | FORGE — astronaute à visière orange, Factory Deck | t016, t162, vid 2:40 | MONTRÉ | Idem n° 91. |
| 97 | Deux astronautes identiques sur le Factory Deck | t018, vid 0:19 | MONTRÉ | Un agent = un seul avatar ; pas de doublon qui brouille la lecture. |
| 98 | NOVA — personnage féminin en bikini qui sert des boissons | t120, t156, t166 | MONTRÉ | À ne pas reprendre (hors ton pour un produit d'artisans). |
| 99 | Pastille flottante « Nova » (repère de position) | t004, t020, vid 0:21 | MONTRÉ | Pastille nominative qui suit l'agent sur la carte. |
| 100 | ATLAS — astronaute rouge qui traverse le panneau de droite | vid 0:21 | MONTRÉ | Rien (déplacement décoratif hors carte). |
| 101 | Pastille flottante « Atlas » posée sur la fenêtre de chat | t002, t040, t072 | MONTRÉ | Idem n° 99. |
| 102 | ANDREW — avatar du fondateur, debout dans un sas entre les deux usines | t002, vid 0:14, t162 | MONTRÉ | Avatar de Benj sur la carte, au centre. |
| 103 | Étiquette rose « VEGA » sous ANDREW | t162 | MONTRÉ | Rien (rôle inconnu). |
| 104 | Personnage pixel étiqueté « ANDREW TATE », cigare, sur le panneau de droite | t022, vid 0:21 | MONTRÉ | À ne pas reprendre. |
| 105 | Personnage aux cheveux roses près de l'Armory | t032 | MONTRÉ | Rien. |

## I. Bulles d'état des agents (texte sur la carte)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 106 | « Asset pack almost ready to ship. » | t002 | MONTRÉ | Bulle = dernière action réelle de l'agent, tirée du journal. |
| 107 | « Thumbnail rendered. » | vid 0:07 | MONTRÉ | Ex. « Devis Martin envoyé. » quand l'envoi a vraiment eu lieu. |
| 108 | « Switching to Fiverr queue. » | vid 0:14 | MONTRÉ | Annoncer le changement de file d'un agent. |
| 109 | « Mixing track… » (lecture incertaine) | t038 | MONTRÉ | Verbe au présent pour une tâche en cours. |
| 110 | « Quality check passed… » | t040 | MONTRÉ | Bulle de contrôle réussi. |
| 111 | « Techno mode activated. » | t042, t044 | MONTRÉ | Rien (texte d'ambiance). |
| 112 | « Game sprites rendering now. » | t046, t048, vid 0:47 | MONTRÉ | Idem n° 109. |
| 113 | « …ering in progress. » | t072 | MONTRÉ | Idem n° 109. |
| 114 | « Laying down the kick pattern… » | t132 | MONTRÉ | Rien (texte d'ambiance). |
| 115 | « Synth… » | t150 | MONTRÉ | Rien (tronqué). |
| 116 | « QC pass rate 94%. » | t158 | MONTRÉ | Voir n° 215. |
| 117 | « Calibrating assembly bots… » | t164, t166 | MONTRÉ | Rien (texte d'ambiance). |
| 118 | « NOVA looks t… » | t156 | MONTRÉ | Rien (tronqué). |
| 119 | « …, your espresso martini is ready. » | t166 | MONTRÉ | À ne pas reprendre (ambiance). |
| 120 | « Energy drinks on the house today! » | t166 | MONTRÉ | À ne pas reprendre (ambiance). |
| 121 | Bulles en police pixel, fond sombre, couleur de l'agent | t042, t132, t164 | MONTRÉ | Même style de bulle partout, couleur de l'agent. |

## J. Fenêtre « SHIP COMMS » (chat des agents)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 122 | Fenêtre « SHIP COMMS » en bas à gauche | t002, t040, t072 | MONTRÉ | Salle de discussion des agents, lisible par Benj. |
| 123 | Compteur « · 8 online » puis « · 9 online » | t002, t040 | MONTRÉ | Voir n° 214. |
| 124 | Prism, 01:33 PM : réutiliser les maquettes produits en épingles Pinterest, « 15 mins/day max », « The ROI potential is huge » | t002, t040, t072 | MONTRÉ | Un agent propose, avec un coût en temps. |
| 125 | Cipher, 01:34 PM : les épingles sont indexées par Google, donc des liens gratuits vers la boutique Etsy, « Double win for SEO 🏆 » | t002, t040, t072 | MONTRÉ | Un autre agent argumente. |
| 126 | Forge, 01:34 PM : « Sold. Prism take the lead on this. Start with our top 5 sellers as pins and we'll see how the traffic looks. » | t002, t040, t132 | MONTRÉ | L'agent chef tranche et assigne, en clair, horodaté. |
| 127 | Nom de l'agent en couleur + heure devant chaque message | t002, t072 | MONTRÉ | Une couleur par agent, la même dans la liste, sur la carte et dans le chat. |
| 128 | Bouton ▼ pour replier le chat | t002, t072 | MONTRÉ | Chat repliable. |

## K. Panneau de droite (Commander, missions, actions)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 129 | Carte « COMMANDER », « LV.4 Commander », barre 5,050 XP / 8,000 XP | t022, vid 0:21 | MONTRÉ | Rien (jeu d'XP inutile pour un artisan). |
| 130 | « ACTIVE MISSIONS » | t022, vid 0:21 | MONTRÉ | Objectifs du mois affichés dans le Poste. |
| 131 | Mission « Reach $2,000 Revenue » : $1,837/$2,000, +500 XP, barre verte | t022, vid 0:21 | M+D (« almost … $2,000 », 0:17.6–0:23.7) | Objectif chiffré + barre de progression calculée sur les vraies factures. |
| 132 | Mission « Publish 15 Products » : 10/15, +300 XP | vid 0:21 | MONTRÉ | Objectif de production (ex. « 15 publications ce mois »). |
| 133 | Mission « Get 50 Total Sales » : 33/50, +400 XP | vid 0:21, t022 | MONTRÉ | Objectif de ventes, même source que le reste (voir n° 212). |
| 134 | Texte rouge « MISSION OBJECTIVES » superposé en travers | vid 0:21, t022 | MONTRÉ | Rien (chevauchement, illisible par endroits). |
| 135 | « LATEST ACHIEVEMENT » : « Grand Opening — $1,000 revenue milestone — Unlocked 4d ago » | t022, vid 0:21 | MONTRÉ | Dernier jalon atteint, daté (ex. « premier devis signé, il y a 4 j »). |
| 136 | Trois tuiles : « 33 Sales », « 10 Products », « 12 » avec une note de musique | t022, vid 0:21 | MONTRÉ | Trois tuiles de chiffres clés, chacune avec son icône. |
| 137 | Jalons en arrière-plan : « First Client » lisible ; « …Published », « …Active Factories » en partie | t022 | MONTRÉ | Liste des jalons à venir, grisés tant qu'ils ne sont pas atteints. |
| 138 | Bouton ✕ pour fermer le panneau | t022 | MONTRÉ | Panneau fermable. |
| 139 | Deux cartes rouges « ACTION NEEDED — Products Awaiting Approval — 40 product(s) across 38 niche(s)… » avec un bouton | t020, vid 2:46, t166 | MONTRÉ | File rouge « à valider par Benj » avec un bouton d'action. |
| 140 | Libellé « LAT… » (LATEST) en haut de la colonne de cartes | t020 | MONTRÉ | Rien (tronqué). |

## L. Bas d'écran

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 141 | Bandeau défilant des ventes : produit, prix vert, prénom + initiale du client | t000, t018, t132 | MONTRÉ | Bandeau des derniers événements réels (devis signé, message reçu), prénom + initiale seulement. |
| 142 | « Rooting For You Spring Garden Mug $55.01 — Maria L. » | t000, t132 | MONTRÉ | Idem n° 141. |
| 143 | « Introvert Social Battery Hoodie $53.43 / $52.63 — Lauren C. » | t000, t018, t132 | MONTRÉ | Idem. |
| 144 | « Cactus & Coffee Vibe Mug $37.45 — Marcus G. » ; « $35.53 — Megan O. » | t000, t018, t020 | MONTRÉ | Idem. |
| 145 | « … — Brittany V. » (produit illisible) | t000, t038 | MONTRÉ | Idem. |
| 146 | Pastille « $1836.72 · 10 Live » en bas à droite | t004, t020 | MONTRÉ | Rappel CA + nombre en ligne dans un coin. |
| 147 | Seconde pastille bleue en bas à droite, illisible | t020, t166 | MONTRÉ | Rien (illisible). |
| 148 | Barre de navigation : MILESTONES (trophée, pastille bleue), TIMELINE, MISSIONS, STATION, SETTINGS, HELP (« ? » rouge, actif) | t000, t132, t150 | MONTRÉ | Onglets du Poste : Jalons, Journal, Objectifs, Carte, Réglages, Aide. |
| 149 | Notification rouge « 1 error » avec ✕, en bas à gauche | t000 | MONTRÉ | Les erreurs s'affichent, comptées, fermables ; jamais cachées. |

## M. Fiche d'un module (popup « Factory II »)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 150 | Popup « Factory II », badge LV.1, sous-titre « production », icône de boîte | t040, vid 0:44 | MONTRÉ | Fiche de pôle au clic : nom, niveau, type. |
| 151 | INCOME : N/A | t040, vid 0:44 | MONTRÉ | Écrire « N/A » plutôt qu'un faux chiffre quand la donnée n'existe pas. |
| 152 | AGENT : « — » (aucun) | t040, vid 0:44 | MONTRÉ | Agent responsable du pôle, nommé. |
| 153 | AUTOMATIONS : « 6 active » puis « 5 active » selon l'image | t002, t040, t044, t122 | MONTRÉ | Nombre de tâches planifiées actives, lu dans le planificateur réel. |
| 154 | PRODUCED : « n items » (voir n° 216) | t040 à t122 | MONTRÉ | Total produit par le pôle, cumulé. |
| 155 | « Tasks: n » en bas à gauche (17, 11, 10, 15, 12, 7, 22, 14) | t040, t042, t044, t072, t074, t076, t122, t132 | MONTRÉ | Tâches en file, nombre réel. |
| 156 | « Active: 2h 14m », identique sur toutes les images | t040, t044, t076, t122 | MONTRÉ | Durée d'activité qui avance avec l'horloge. |
| 157 | Boutons UPGRADE / MANAGE (encadré) / INFO | t040, vid 0:44 | MONTRÉ | Trois actions par pôle : régler, gérer, s'informer. |
| 158 | « Press I to toggle » (raccourci clavier) | t040, vid 0:44 | MONTRÉ | Raccourci clavier pour ouvrir/fermer la fiche. |
| 159 | ✕ pour fermer la fiche | t040 | MONTRÉ | Fiche fermable. |

## N. Preuves externes montrées

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 160 | Etsy Shop Manager › Stats, adresse etsy.com/your/shops/me/stats | t026 | MONTRÉ | Lien direct du module vers sa page de chiffres réelle. |
| 161 | Période « This month: Mar 1 – Mar 31 », mise à jour « 4 hours ago » | t026 | MONTRÉ | Toujours dater un chiffre (« mis à jour il y a 4 h »). |
| 162 | Visits 8K | t026 | MONTRÉ | Rien (chiffre Etsy). |
| 163 | Orders 37 | t026 | M+D (« 37 orders », 0:23.7) | Le chiffre dit = le chiffre montré. |
| 164 | Conversion rate 0.3% | t026 | MONTRÉ | Rien (chiffre Etsy). |
| 165 | Revenue $1,836.72 | t026 | M+D (« almost … $2,000 », 0:17.6–0:23.7) | Idem n° 163. |
| 166 | Courbe des visites par jour (axe 0 à 300, pics irréguliers) | t026 | MONTRÉ | Rien. |
| 167 | Item favorites 62 ; Shop follows 4 | t026 | MONTRÉ | Rien. |
| 168 | Menu Etsy avec pastilles rouges (Messages 1, Etsy search visibility 2, Finances 3) | t026 | MONTRÉ | Rien. |
| 169 | YouTube : vidéo « AFTERGLOW - Vybes », chaîne VYBES | t054, vid 1:00 | M+D (« his own YouTube channel », 0:51.6) | Montrer la publication réelle produite par l'agent. |
| 170 | « 3 views · 1 day ago », 0 j'aime, « More music coming to you very soon. » | t054, vid 1:00 | MONTRÉ | Montrer aussi les petits chiffres : c'est ce qui rend crédible. |
| 171 | Visualiseur : nuages roses et orangés animés, durée 5:47 | t054, vid 1:00, vid 1:06 | M+D (« makes the visualizers », 0:51.6–0:56.5) | Rien (propre à la musique). |
| 172 | Morceau diffusé à voix haute ~13 s | 0:56.5–1:09.8 | DIT (« he sounds glorious », 0:56.5) | Laisser entendre le résultat réel quelques secondes. |
| 173 | Fiverr : « I will make you a great youtube thumbnail », vendeur Demchuk (demrosjob) | t088, t098, vid 1:20 | MONTRÉ | Rien (page d'un concurrent de l'auteur). |
| 174 | Badges « Fiverr's Choice », « Level 2 » | t088, vid 1:20 | MONTRÉ | Rien. |
| 175 | Note 5.0 (4260 reviews) | t088, vid 1:20 | M+D (« Five star reviews », 1:21) | Rien. |
| 176 | « 11 orders in queue » | t088, vid 1:20 | M+D (« 11 orders he hasn't even fulfilled », 1:33–1:45 ; son interprétation de « in queue ») | Ne jamais présenter une interprétation comme un fait montré. |
| 177 | « People keep coming back! demrosjob has an exceptional number of repeat buyers » | t088 | MONTRÉ | Rien. |
| 178 | Miniature d'exemple « ELON MUSK ISLAND » (SpaceX) | t088, vid 1:52 | MONTRÉ | Rien. |
| 179 | Offre « Youtube Thumbnail $55 », 3-day delivery, Unlimited Revisions, 1 thumbnail, Image sourcing, Custom designed images, boutons Continue / Contact me | vid 1:24, vid 1:52 | M+D (« he charges people $55 », 1:21–1:27) | Rien. |
| 180 | 5,915 favoris sur l'offre | vid 1:24 | MONTRÉ | Rien. |
| 181 | Temps de réponse moyen 2 h | t088, vid 1:52 | MONTRÉ | Rien. |
| 182 | GameDev Market : « 2D Creator Bundle - ElvGames », by GameDev Market, adresse gamedevmarket.net/asset/2d-creator-bundle-elvgames | t142, t144, vid 2:26 | MONTRÉ | Rien. |
| 183 | Prix barré $296.00 → $29.60, pastille « 90% OFF! » | t136, t142, t144 | M+D (« 2D game assets for $30 », 2:13–2:21) | Rien. |
| 184 | « This bundle includes 35 assets » | t136 | MONTRÉ | Rien. |
| 185 | Visuel « 2D TopDown Mega Bundle — Tilesets - Characters - Enemies — 30+ Asset Packs bundle! » | t144, vid 2:26 | MONTRÉ | Rien. |
| 186 | Bandeau cookies en bas de la page | t144, vid 2:26 | MONTRÉ | Rien. |
| 187 | Onglets du navigateur : « Claude », « Make you a great youtube thum… », « AFTERGLOW - Vybes - YouTube », « 2D Creator Bundle - ElvGames » | vid 1:00, vid 1:20, t098, t100 | MONTRÉ | Rien (l'onglet Claude ne dit pas ce qui fait tourner les agents). |
| 188 | Bouton « Ask Gemini » dans Chrome | t136, t142 | MONTRÉ | Rien. |
| 189 | Barre des tâches Windows : Chrome, Steam, Discord, Telegram, Spotify, VS Code, icône orange en astérisque (logo Claude, probable) | t026, vid 1:32, vid 1:52 | MONTRÉ | Rien (poste de travail de l'auteur). |

## O. Ce qu'il dit (récit et phrases-clés)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 190 | But : voir où sont ses agents et sur quoi ils travaillent, à tout moment | 0:00–0:11.1 | DIT | La promesse du Poste, mot pour mot : voir où sont les agents et ce qu'ils font, maintenant. |
| 191 | « two little factory rooms, which essentially run autonomous businesses 24-7 » | 0:11.1–0:17.6 | DIT | Un module = une activité qui tourne seule, jour et nuit. |
| 192 | Le tapis roulant = la boutique Etsy lancée | 0:17.6–0:23.7 | DIT | Montrer du doigt la chaîne en disant l'activité qu'elle porte. |
| 193 | « almost produced $2,000 in revenue in the last two weeks » | 0:17.6–0:23.7 | DIT | Voir n° 213. |
| 194 | « so far, we have 37 orders » | 0:23.7–0:30.7 | DIT | Idem n° 163. |
| 195 | Il a déjà parlé de l'Etsy dans d'autres vidéos | 0:30.7–0:34.8 | DIT | Une vidéo par module : série de démos. |
| 196 | Vybes produit 24 h/24 de la house, deep house et techno | 0:40.2–0:51.6, 1:09.8 | DIT | Rien (activité propre à l'auteur). |
| 197 | Vybes a un compte Spotify et sa chaîne YouTube, donnés par l'auteur | 0:46.9–0:56.5 | DIT | Chaque agent publieur a ses comptes à lui, ouverts par Benj. |
| 198 | Vybes fait aussi les visualiseurs de ses vidéos | 0:51.6–0:56.5 | DIT | Rien. |
| 199 | SERVICES = un service Fiverr tout juste lancé (transcrit « fiber ») | 1:09.8–1:16.7 | DIT | Rien. |
| 200 | Le concurrent vend une miniature générée par IA 55 $ | 1:21–1:33 | DIT | Rien. |
| 201 | Son plan : même produit, moins cher, tout le travail délégué à « la petite usine » | 1:45.5–1:57.8 | DIT | Rien (modèle de l'auteur). |
| 202 | « whenever we get an order on our Fiverr account, it fulfills the order » | 1:57.8–2:03 | DIT | Déclenchement par événement : une demande entrante lance la chaîne. |
| 203 | Outil nommé : Nano Banana Pro, pour faire la miniature | 2:03–2:08.3 | DIT | Rien (outil d'image, hors besoin actuel). |
| 204 | GAME ASSETS : bundles d'assets 2D, le concurrent vend 30 $ | 2:08–2:28 | DIT | Rien. |
| 205 | « all this does is pump out these bundles » | 2:28–2:38 | DIT | Rien. |
| 206 | Newsletter : récente, peu d'abonnés | 2:37–2:42 | DIT | Dire les petits chiffres sans honte. |
| 207 | PRODUCTION : contenu marketing pour son activité principale, un logiciel vendu aux concessionnaires auto | 2:42–2:51.8 | DIT | Un module qui sert la propre promo de Presti (posts, vidéos). |
| 208 | « that is essentially a rundown of the whole factory » | 2:51.8 | DIT | Rien. |
| 209 | Appel : « A thousand likes, fellas » contre une visite complète en vidéo | 2:52.3–2:59.5 | DIT | Rien. |
| 210 | Ton : insultes contre le vendeur Fiverr | 1:16.7–1:51 | DIT | À ne pas reprendre. |
| 211 | Rythme : un module ≈ 15 à 40 s de voix, puis sa preuve | 0:34.8–2:51.8 | DIT | Format de la démo Presti : un pôle, sa preuve, pôle suivant. |

## P. Constats sur les chiffres (CONSTAT, de moi)

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 212 | Commandes : 37 sur Etsy, 33 sur la tuile « Sales » et la mission « 33/50 », un seul chiffre dans « ORDERS » en haut | t026, t022, vid 0:21, t000 | CONSTAT | Deux chiffres, un écran : une seule source par chiffre. |
| 213 | Période : « last two weeks » dit, filtre « This month: Mar 1 – Mar 31 » montré | 0:17.6–0:23.7, t026 | CONSTAT | Écrire la période exacte à côté du chiffre. |
| 214 | Agents : « 4/6 ACTIVE » en haut, 10 fiches dans SHIP CREW, « 8 » puis « 9 online » dans le chat | t018, t000, t002, t040 | CONSTAT | Un seul décompte d'agents, le même partout. |
| 215 | Qualité : « PASS: 98% » sur la jauge, bulle « QC pass rate 94%. » | t156, t158 | CONSTAT | Idem n° 212. |
| 216 | « PRODUCED » du popup recule : 529 → 162 en 2 s (t040 → t042), 586 → 346 → 128 (t072 → t076), alors que « Active: 2h 14m » ne bouge pas | t040, t042, t044, t070, t072, t074, t076, t122 | CONSTAT | Un compteur cumulé ne recule jamais ; sinon c'est du décor, et un juge le verra. |
| 217 | Les compteurs de chaîne, eux, montent sans reculer : TRACKS 326 → 333, ORDERS 51 → 52, PACKS 256 → 262, OUTPUT 1601 → 1638, CONTENT SHIPPED 1021 → 1044 | t002, t166, t004, t164 | CONSTAT | Ce sont eux le modèle à suivre. |
| 218 | Le chiffre d'affaires est le même partout : $1,836.72 (haut, pastille, Etsy), $1,837 (mission, arrondi) | t010, t020, t026, vid 0:21 | CONSTAT | Bon exemple : le même montant dans toutes les zones. |
| 219 | INCOME « N/A » sur Factory II alors que Fiverr et les assets sont présentés comme des ventes | t040, 1:09.8–2:38 | CONSTAT | Si une activité vend, son revenu doit apparaître dans sa fiche. |

---

## Décompte

**219 éléments.** Répartition : fiche 5, tournage 8, barre du haut 13, liste des agents 16, carte 14, Factory II 15, Factory Deck 19, personnages 15, bulles 16, chat 7, panneau droit 12, bas d'écran 9, fiche de module 10, preuves externes 30, récit 22, constats 8.

## Les 10 plus importants pour Presti

1. **n° 190** — La promesse, dite dès la première seconde : voir où sont les agents et ce qu'ils font, maintenant. C'est la phrase du Poste.
2. **n° 43 à 53** — Une carte vue de dessus, un module par activité, une vue « tout le vaisseau » en fin (grille de 12 salles). C'est le squelette du Poste CLAW3D.
3. **n° 58, 61, 64, 72, 76, 79, 81, 86** — Chaque activité est une chaîne d'étapes nommées (ORDER → CREATE → REVIEW → DELIVER) où les tâches avancent sur un tapis.
4. **n° 59, 63, 83, 217** — Un compteur en bout de chaîne qui ne fait que monter, et un « +1 DELIVERED / SHIPPED / SENT » à chaque sortie.
5. **n° 29 à 38** — La liste des agents avec une ligne d'état honnête (« Idle — last research 7h ago ») et un rôle métier (« Financial Officer »).
6. **n° 139 et 32** — La file « ACTION NEEDED : 40 produits à valider » en rouge : le point où l'humain valide, visible de loin.
7. **n° 122 à 126** — Le chat des agents : l'un propose, l'autre argumente, le chef tranche et assigne, horodaté.
8. **n° 106 à 110** — Des bulles au-dessus des agents qui disent leur dernière action (« Thumbnail rendered. »), à brancher sur le vrai journal.
9. **n° 9 et 160 à 170** — Chaque module renvoie à sa preuve réelle (page de stats Etsy, vidéo YouTube publiée), petits chiffres compris.
10. **n° 212 à 216** — Ce qu'il ne faut pas copier : des chiffres qui se contredisent (37 contre 33 commandes, 4/6 contre 10 agents, 98 % contre 94 %) et un compteur « PRODUCED » qui recule.
