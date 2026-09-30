# Inventaire — service pubs (Hugo Matias + aibymatty)

Relevé le 25/09/2026. Lecture seule des sources. Rien n'est inventé : ce qui n'est pas lisible est dit illisible.

## Sources et méthode

- **Vidéo Hugo Matias** : `veille/2026-09-24/videos/hugomatias-DcODQPCMsLl.mp4` (reel Instagram, 59,7 s).
  - 42 images `images/hugomatias-DcODQPCMsLl/tNNN.N.jpg` regardées une par une, dans l'ordre (t000.0 à t058.0).
  - Transcription `hugomatias-DcODQPCMsLl.txt` lue en entier (18 segments).
  - 4 images ajoutées par ffmpeg, une à la fois, dans le scratchpad (hors dossier source) : t027.0 (pleine image), et trois recadrages pleine définition de t014.0, t017.8, t024.0 pour lire les petits textes.
- **Carrousel aibymatty** : 8 diapositives `images/aibymatty/diapo-01.jpg` à `diapo-08.jpg` regardées dans l'ordre, planche comprise. Légende `images/aibymatty/legende.txt` et section `carrousels.md` lues.

**Conventions.**
- **MONTRÉ** = visible à l'image (tNN.N pour la vidéo, dNN pour la diapositive).
- **DIT** = dans la voix (m:ss de la transcription) ou dans la légende écrite du carrousel.
- **M+D** = les deux.
- **CALCUL** et **DÉDUCTION** = de moi, pas de la source. Toujours signalé.

---

## A. Vidéo Hugo Matias

### A1. Fiche de la source

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 1 | Format vertical 1080×1920, 30 i/s, 59,7 s | ffprobe ; en-tête de la transcription | MONTRÉ | Nos vidéos UGC : 9:16, 1080×1920, moins de 60 s. |
| 2 | Auteur « Hugo Matias \| Contenu IA », compte hugomatias.ai, publié le 19/08/2026 | info.json | MONTRÉ | Rien (identité de la source). |
| 3 | Compteurs : 1 322 j'aime, 1 646 commentaires (plus de commentaires que de j'aime) | info.json | MONTRÉ | DÉDUCTION : le mot-clé en commentaire fait réagir ; à utiliser sur nos propres posts. |

### A2. Accroche et mise en forme

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 4 | Bandeau fixe « 1300€ en 2h de travail » (fond blanc, texte noir gras, haut de l'écran) | t000.0, t002.0 | MONTRÉ | Accroche chiffrée gain + temps en bandeau, les 2 premières secondes. |
| 5 | Phrase d'ouverture : Hugo AFFIRME qu'un client vient de payer 1 300 € (affirmation du créateur, aucune preuve de paiement) pour des vidéos « qui m'ont pris littéralement 2h » | 0:00.0–0:05.2 | DIT | Vendre avec une preuve de paiement et un temps réel, pas une promesse. |
| 6 | Geste main sur le front, sourire (mise en scène « je n'y crois pas ») | t000.0, t002.0 | MONTRÉ | Rien pour le produit. |
| 7 | Incrustation d'un exemple UGC au-dessus du visage : femme blonde qui tient un tube rose (lettrage lu à l'envers, probablement « rhode ») | t004.0, t005.3 | MONTRÉ | Montrer une vidéo générée dès les 5 premières secondes. |
| 8 | Sous-titres mot à mot, blancs, gras, centre bas, sur toute la vidéo | t000.0 « y a un client » … t058.0 « si tu veux la recevoir » | MONTRÉ | Sous-titres incrustés sur toutes nos pubs UGC (lecture sans le son). |
| 9 | Tournage face caméra en selfie : écouteurs filaires, débardeur noir, décor tropical (toit en paille, plantes) | t006.0, t008.0, t030.0, t042.0 | MONTRÉ | Référence de ton pour nos avatars : créateur chez lui, pas de studio. |
| 10 | Écran d'ordinateur filmé au téléphone (pas de capture d'écran), le doigt pointe ce qu'il dit | t009.1 à t029.8 | MONTRÉ | Dans nos démos, surligner l'élément cité au moment où la voix le nomme. |
| 11 | Passage promesse → démonstration : « je te montre comment faire, let's go » | 0:05.4–0:07.0 ; t006.0, t007.0 | M+D | Transition vers la démo en moins de 2 s. |
| 12 | Dock macOS : Notion, ChatGPT, CapCut, Claude, WhatsApp, Chrome, Photoshop, Creative Cloud (icônes reconnues) | t014.0, t016.0, t017.8, t026.0 | MONTRÉ | Chez lui tout est manuel entre applis ; chez nous tout passe par l'orchestre. |

### A3. Étape 1 — trouver le client dans la bibliothèque Meta

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 13 | « Première étape, il faut que tu trouves un client » : la bibliothèque publicitaire de Meta | 0:07.0–0:10.9 ; t008.0, t009.1 | M+D | L'agent de prospection pubs part de la bibliothèque Meta (par l'API, jeton de Benj). |
| 14 | Navigateur Arc : espace « Hugo », onglet « Ad Library », facebook.com | t009.1, t010.0 | MONTRÉ | Rien : l'agent passe par l'API, pas par un navigateur. |
| 15 | Filtre pays « France » | t009.1, t012.0 ; 0:11.1 | M+D | Paramètre pays = FR par défaut. |
| 16 | Filtre « All ads » (« toutes les ads ») | t012.0 ; 0:11.1 | M+D | Type de pub = toutes, pas seulement politiques. |
| 17 | Recherche par mot-clé de niche : « complément alimentaire » | t012.0, t013.8 ; 0:11.1–0:13.7 « le nom de ta niche » | M+D | Une liste de niches en entrée ; une niche = une requête. |
| 18 | Compteur « ~3,800 results » + « These results include ads that match your keyword search » | t009.1 à t013.8 | MONTRÉ | Afficher le volume d'annonceurs par niche dans la station. |
| 19 | Onglets « Ad Library », « Ad Library report », « Ad Library API », « Branded co[ntent] » | t014.0 | MONTRÉ | L'API officielle existe : c'est notre voie (déjà choisie). |
| 20 | Boutons « Filters », « Sort » et pastille « Active status: Active ad[s] » | t014.0 | MONTRÉ | Ne garder que les pubs actives (annonceur qui dépense maintenant). |
| 21 | Pastille verte « Active » sur chaque carte | t009.1, t014.0 | MONTRÉ | Critère de score : pub active. |
| 22 | « Library ID » (939568438280843, 1672130913515961, 569931375863946) | t010.0, t014.0 | MONTRÉ | Stocker l'ID de chaque pub repérée (preuve, dédoublonnage). |
| 23 | « Started running on 16 Jan 2025 » (Luxéol) et « 1 Jul 2026 » (autre carte) | t010.0, t014.0 | MONTRÉ | Ancienneté de la pub = budget durable → score. |
| 24 | « Platforms » : icônes Facebook, Instagram, Audience Network, Messenger | t010.0, t014.0 | MONTRÉ | Noter les plateformes pour livrer les bons formats. |
| 25 | « This ad has multiple versions » | t010.0, t014.0 | MONTRÉ | Plusieurs versions = la marque teste déjà des créas → bon prospect pour un pack de variantes. |
| 26 | « EU transparency » et « See ad details » | t010.0, t014.0 | MONTRÉ | Lire les détails UE de la pub par l'API pour choisir l'avatar (DÉDUCTION : contenu non montré ici). |
| 27 | Bouton violet « SAVE » sous chaque carte | t009.1 à t014.0 | MONTRÉ | Une liste « annonceurs retenus » dans la station. DÉDUCTION : bouton d'extension, pas natif. |
| 28 | Annonceur « Luxéol · Sponsored » : « 30% de réduction avec WEB30 🌸 Des cheveux longs et forts aidés par la roquette et la prêle des champs ✨ Vous connaissez enfin le secret Luxéol 😉 » | t010.0, t014.0 (recadrage) | MONTRÉ | Lire le texte de la pub : angle + code promo réutilisables dans le script. |
| 29 | Visuels Luxéol : « POUSSE, CROISSANCE, FORTIFICATION DES CHEVEUX » et « N'ACHETEZ SURTOUT PAS CE PRODUIT. », bouton « Shop Now » | t014.0 (recadrage) | MONTRÉ | Relever les angles déjà pris pour proposer un angle neuf. |
| 30 | Autre annonceur : « Health France », pub vidéo ZzzQuil « Sommeil Nuit Complète, dormez plus… » | t014.0 (recadrage) | MONTRÉ | La recherche ramène aussi des grands groupes : les écarter du score. |
| 31 | « Ici tu recherches parmi les ads les plus intéressantes » (critère jamais précisé) | 0:13.9–0:15.9 ; t014.0, t016.0 | DIT | Écrire le critère : active, ancienne, multi-versions, marque moyenne. |
| 32 | Écran blanc de chargement entre deux pages | t016.0 | MONTRÉ | Rien. |

### A4. Étape 2 — récupérer le produit

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 33 | « Moi j'ai récupéré le site de Luxeol » : page produit ouverte | 0:16.0–0:17.8 ; t017.8 | M+D | L'agent ouvre la page de destination de la pub et en tire photo, nom, prix, avis. |
| 34 | Menu du site « PRODUITS / MEILLEURES VENTES / LA MARQUE », logo LUXÉOL | t017.8 (recadrage) | MONTRÉ | Rien de plus que le n° 33. |
| 35 | Titre « Pousse Croissance & Fortifica[tion] », note « 4,5 (7 398 avis) » | t017.8 (recadrage) | MONTRÉ | Note et nombre d'avis = preuve sociale à citer dans le script. |
| 36 | Encart « Accélère la pous[se] », « Cheveux plu[s]… » ×3, pastille vidéo ronde | t017.8 (recadrage) | MONTRÉ | Extraire les bénéfices listés par la marque. |
| 37 | Packshot : boîte verte « LUXÉOL · POUSSE CROISSANCE & FORTIFICATION · 3 MOIS · CHEVEUX », plaquette de gélules | t017.8 | MONTRÉ | La photo packshot = entrée « image produit » de la génération. |
| 38 | Bloc d'achat : « QUANTITÉ », « CONSEILLÉ 1 BOÎTE », « MEILLEUR PRIX 2 BOÎTES -6% », « SUMMER DEALS -30% avec le cod[e] », « M'abonner et éc[onomiser] », « scalapay à partir [de] » | t017.8 (recadrage) | MONTRÉ | Reprendre l'offre en cours (remise, code) dans l'appel à l'action de la vidéo. |
| 39 | Lien produit collé avec des paramètres de suivi de pub : `cid=363`, `esc-creative={{ad.id}}`, `esc-creativetype=Feed_and_Stories`, `esc-location`, `esc-name={{adset.name}}`, `esc-publisher`, `f1={{campaign.name}}`, `f2={{adset.name}}` | t020.0, t022.0, t022.7 | MONTRÉ | DÉDUCTION : lien copié depuis la pub. Prendre l'URL de destination de la pub, pas la page d'accueil. |

### A5. Étape 3 — générer la vidéo dans Claude

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 40 | Application Claude, accueil « Bon vendredi, hugo » | t018.0 à t022.0 ; 0:16.0–0:20.3 « ensuite sur Claude » | M+D | Chez nous, l'orchestrateur lance la tâche, pas un chat à la main. |
| 41 | Skill « /alexya-ugc-omni » (dit « Alexia UGC Omni », sous-titre « Alexya UGC omni ») | t018.0, t020.0 ; 0:16.0–0:20.3 | M+D | Une skill « ugc » Presti branchée sur ElevenLabs Creative (Gemini Omni) ; Alexya en repli seulement. |
| 42 | Prompt : « crée une ugc de ce produit avec le mcp alexya » | t018.0, t020.0 | MONTRÉ | Entrée minimale = image + lien + une phrase ; la skill décide du reste. |
| 43 | Photo produit jointe (miniature boîte Luxéol) + lien : « J'importe la photo du produit, le lien, et on est parti » | t018.0 ; 0:20.4–0:22.6 | M+D | Deux entrées obligatoires par vidéo : photo produit + URL. |
| 44 | Sélecteur de modèle « Fable 5 · Élevé » | t018.0, t026.0, t027.0 | MONTRÉ | Afficher le modèle de chaque agent dans la station (déjà prévu). |
| 45 | Étape « Analyzed product benefits and awaited visual reference generation » | t022.7 | MONTRÉ | 1re étape de la skill : extraire les bénéfices produit de la page. |
| 46 | Q/R : « Quel profil d'avatar pour ce produit cheveux ? » → « Femme 25-35 ans » | t022.7 | MONTRÉ | L'agent choisit l'avatar d'après la cible du produit. |
| 47 | Q/R : « Quel format de vidéo ? » → « A — 1 scène talking (le plus fiable) » | t022.7, t024.0 | MONTRÉ | Format par défaut = une scène face caméra ; multi-scènes en option. |
| 48 | Indicateur « Reckoning » (réflexion en cours) | t022.7 | MONTRÉ | État « réfléchit » visible par agent. |
| 49 | Étape « Orchestrated avatar reference image generation in high-quality format » | t024.0 (recadrage), t025.1 | MONTRÉ | Générer d'abord une image de référence avatar + produit, puis la vidéo. |
| 50 | « Found tools » | t024.0 | MONTRÉ | Rien (mécanique MCP). |
| 51 | Outil « Get a direct upload URL (code-execution clients) » | t024.0 | MONTRÉ | Téléverser la photo produit chez le générateur avant l'appel. |
| 52 | « Uploader la photo produit Luxéol sur le stockage Alexya » | t024.0 | MONTRÉ | Garder aussi la photo dans le dossier du prospect (provenance). |
| 53 | Outil « Alexya generate_image », carte « Image · HD », « Generating · 4s » puis « 5s » | t024.0, t025.1 | MONTRÉ | Compteur de temps par génération dans la station. |
| 54 | Légende de l'image en cours « …in her late twenties holds the Luxéol "P… » + décompte de crédits en bas à droite (chiffre illisible) | t024.0, t025.1 | MONTRÉ | Afficher le coût de chaque génération ; estimer avant (estimate_only). |
| 55 | « Quelques secondes plus tard, il est déjà en train de me créer ma vidéo » | 0:22.7–0:25.8 | DIT | Montrer l'avancement en direct. |
| 56 | Étape « Orchestrated continuous shot strategy, eliminating distracting gestures » | t026.0, t027.0 | MONTRÉ | Plan continu + gestes parasites retirés, dans notre modèle de prompt. |
| 57 | Outil « Alexya generate_omni_video », carte « Omni video » | t026.0 à t029.8 | MONTRÉ | Modèle vidéo = Gemini Omni (via ElevenLabs), même famille. |
| 58 | Vidéo générée : femme fin de vingtaine, longs cheveux châtains, pull beige, selfie dans une chambre, boîte Luxéol tenue face caméra, logo lisible | t026.0, t027.0, t028.0, t029.8 | MONTRÉ | Barre de réalisme à atteindre : selfie, décor domestique, produit lisible. |
| 59 | Prompt vidéo tronqué « ONE SINGLE CONTINUOUS UNBROKEN SHOT from the first fra… » | t026.0 | MONTRÉ | Consigne « plan unique » en tête du prompt vidéo. |
| 60 | « 173s » sur la carte vidéo (sens non dit ; probablement le temps de génération) | t026.0 à t029.8 | MONTRÉ | Mesurer et afficher la vraie durée ; ne pas promettre « quelques secondes ». |
| 61 | Bouton « Regenerate », icônes télécharger et ouvrir | t026.0, t027.0 | MONTRÉ | Chaque vidéo : « régénérer » et « télécharger » dans la station. |
| 62 | « Relancé avec triple verrou anti-cut : » (une 1re version a donc échoué) | t026.0, t027.0 | MONTRÉ | Boucle qualité : l'agent regarde la vidéo, nomme le défaut, relance. |
| 63 | Verrou 1 : « Plan unique en tête de prompt » : zéro cut, zéro transition, zéro changement d'angle | t026.0 | MONTRÉ | Règle écrite dans notre modèle de prompt. |
| 64 | Verrou 2 : « PRODUCT HOLD RULE dédiée : la boîte reste dans sa main du premier au dernier f[rame], jamais posée, jamais hors cadre » | t026.0, t027.0 | MONTRÉ | Règle écrite + test du juge : produit visible sur toutes les images. |
| 65 | Verrou 3 : geste « main dans les cheveux » retiré, « très probablement lui qui faisait disparaître la boîte (elle changeait de main ou la lâchait pour toucher ses cheveux) » | t026.0, t027.0 | MONTRÉ | Liste noire de gestes qui cassent la tenue du produit, notée au journal d'apprentissage. |
| 66 | Titre de conversation « produit Luxeol » | t026.0, t027.0 | MONTRÉ | Un dossier par prospect et par produit. |
| 67 | Pied de page « Claude est une IA et peut faire des erreurs. Veuillez vérifier les réponses. » | t026.0, t027.0 | MONTRÉ | Juge indépendant avant tout envoi. |
| 68 | Voix de la vidéo générée, lue dans les sous-titres : « franchement », « 3 mois de Luxéol », « cassent beaucoup moins » ; absente de la transcription | t026.0, t028.0, t029.8 ; 0:25.8–0:30.7 ne contient que « C'est une dinguerie » | MONTRÉ | Script en français, témoignage à la 1re personne, durée d'usage + bénéfice concret. |
| 69 | Allégation « cassent beaucoup moins » sur un complément alimentaire | t029.8 | MONTRÉ | Contrôler les allégations santé avant envoi (compléments = allégations encadrées). |
| 70 | Réaction « C'est une dinguerie. Je sais pas si vous vous rendez compte », main derrière la tête | 0:25.8–0:33.4 ; t030.0 | M+D | Rien pour le produit. |

### A6. Étape 4 — démarcher la marque

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 71 | « Tout ce que t'as à faire c'est télécharger la vidéo » | 0:30.8–0:33.4 ; t032.0 | DIT | Téléchargement automatique dans le dossier prospect. |
| 72 | « Trouver l'Instagram de la marque » | 0:33.7 ; t034.0 | DIT | L'agent retrouve le compte Instagram de l'annonceur. |
| 73 | « Leur envoyer la vidéo gratuitement, leur disant que c'est gratuit » | 0:33.7–0:37.5 ; t036.0 | DIT | 1er message = vidéo offerte, « gratuit » écrit en clair ; envoi par agent, limite Instagram respectée. |
| 74 | Offre dans la foulée : « si vous en voulez plus, je peux vous faire un pack de 10 vidéos à 1300€ » | 0:37.7–0:40.8 ; t038.0, t040.0, t040.9 « à 1.300€ » | DIT | Pack de départ 5 vidéos à 490 € (paramètre), annoncé dans le même message. |

### A7. Prix et objections

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 75 | Objection : « ah mais c'est cher pour de l'IA » (transcription : « pour Glia », erreur) | 0:41.0–0:42.8 ; t042.0, t043.0 « pour de l'IA » | M+D | Réponse prête à « c'est cher pour de l'IA » chez l'agent qui répond. |
| 76 | « Tu peux générer 3 hooks différents par vidéo » (« avec l'autre » : mot mal transcrit, sans doute « l'outil ») | 0:43.0–0:45.6 ; t044.0 | DIT | 3 accroches par vidéo : même corps, 3 débuts. |
| 77 | « Pour le prix de 10, ils en ont 30 » | 0:45.7–0:47.6 ; t046.0, t047.7 | DIT | Vendre en nombre de variantes : 5 × 3 = 15. |
| 78 | 1 300 € ÷ 30 ≈ 43 € la variante ; chez Presti 490 € ÷ 15 ≈ 33 € | — | CALCUL | Montrer le prix par variante dans l'offre. |
| 79 | Ancrage : « un créateur humain, lui il va demander entre 200 et 300 € » (unité non dite) | 0:47.7–0:51.8 ; t048.0, t050.0 | DIT | Comparer au prix d'un créateur humain. |
| 80 | « Et ça la marque elle le sait très bien » | 0:51.8 | DIT | Argument : la marque connaît déjà le prix du marché UGC. |
| 81 | Délai : le créateur « va prendre 2 semaines de livraison pendant que toi, bah tu prends 2h » | 0:51.8–0:54.9 ; t052.0, t054.0, t054.9 | DIT | Annoncer notre délai réel mesuré, pas « 2h » recopié. |
| 82 | Temps de travail revendiqué : 2 h pour la commande du client | 0:00.0–0:05.2 ; t000.0 ; t005.3 « 2H à faire » | M+D | Mesurer notre temps réel par pack et l'afficher. |

### A8. Appel final

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 83 | « J'ai packagé la méthode dans une vidéo complète sur Youtube » | 0:54.9–0:57.6 ; t056.0 | DIT | Rien (tunnel de l'auteur). |
| 84 | « Si tu veux la recevoir, commande guide, et je te l'envoie » (sans doute « commente GUIDE ») | 0:57.7–0:59.7 ; t058.0 | DIT | Sur nos posts : un mot-clé en commentaire, réponse automatique. |

---

## B. Carrousel aibymatty

### B1. Fiche de la source

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 85 | Carrousel TikTok, photo 7636880397288148246, 8 diapositives ; signature « @AIBYMATT_ » sur les diapos | legende.txt ; d01 à d08 | MONTRÉ | Rien (identité de la source). |
| 86 | Compteurs : 969 j'aime, 558 commentaires, 1 624 enregistrements, 154 partages | legende.txt | MONTRÉ | Plus d'enregistrements que de j'aime : le format « liste de skills » se garde → nos carrousels. |
| 87 | Charte : fond crème, orange corail, titres serif gras serrés soulignés au pinceau, étiquettes en capitales espacées | d02 à d08 | MONTRÉ | Même grammaire pour nos carrousels (le corail est déjà dans presti-design). |
| 88 | Mascotte pixel art corail, déclinée par état (casque + marteau, « ! », bulle, clavier, « ERROR ») | d01, d02, d04, d05, d06, d07 | MONTRÉ | Un personnage pixel par rôle et par état dans la station du Poste. |
| 89 | Plan du carrousel : couverture → avant → aujourd'hui → 4 skills (une par diapo) → appel | planche-01 | MONTRÉ | Gabarit de carrousel Presti. |

### B2. Diapo 1 — couverture

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 90 | Logos Claude (astérisque orange) ↔ Meta, en haut à droite | d01 | MONTRÉ | Dessiner la liaison Claude ↔ Meta dans la station. |
| 91 | Titre « J'ai créé une mini-agence meta ads avec claude » (« meta ads » en orange) | d01 | MONTRÉ | Nommer le service : une « mini-agence pubs » pilotée par des agents. |
| 92 | Mascotte au casque de chantier, marteau, bouton rouge | d01 | MONTRÉ | Agent « constructeur » dessiné. |
| 93 | « (SAVE AVANT D'OUBLIER) » | d01 | MONTRÉ | Appel à l'enregistrement sur nos carrousels. |
| 94 | Fond photo sombre flou (ordinateur, mains) | d01 | MONTRÉ | Rien. |

### B3. Diapo 2 — avant

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 95 | « AVANT, Il fallait une équipe entière pour sortir 3 pubs correctes » | d02 | MONTRÉ | Argument client : nos agents remplacent l'équipe. |
| 96 | « QUELQU'UN DEVAIT : Trouver l'angle » | d02 | MONTRÉ | Rôle d'agent : angle. |
| 97 | « Écrire la copy » | d02 | MONTRÉ | Rôle d'agent : texte. |
| 98 | « Créer le visuel » | d02 | MONTRÉ | Rôle d'agent : visuel. |
| 99 | « Et à la fin, personne ne savait vraiment quoi tester ensuite. » | d02 | MONTRÉ | Chaque pack livré avec « quoi tester ensuite ». |
| 100 | « EN AGENCE, TU : Attends les variantes » | d02 | MONTRÉ | Argument : variantes livrées d'un coup. |
| 101 | « Valides les idées » | d02 | MONTRÉ | Rien de plus. |
| 102 | « Payes les allers-retours » | d02 | MONTRÉ | Régénération incluse dans le pack. |
| 103 | « Puis tu découvres seulement après si ça marche » | d02 | MONTRÉ | Note avant diffusion (voir n° 144). |
| 104 | Mascotte renversée « ERROR », yeux en croix | d02 | MONTRÉ | État « échec » dessiné pour un agent. |

### B4. Diapo 3 — aujourd'hui

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 105 | « AUJOURD'HUI — J'ai tout mis dans claude et ça a tout changé » | d03 | MONTRÉ | Rien de plus que le n° 106. |
| 106 | « EN GROS, IL CONNAIT : Mon offre » | d03 | MONTRÉ | Dossier prospect : l'offre (page produit + remise). |
| 107 | « Mon audience » | d03 | MONTRÉ | Dossier prospect : audience (données UE de la pub). |
| 108 | « Mes concurrents » | d03 | MONTRÉ | Dossier prospect : autres annonceurs de la niche. |
| 109 | « Mes anciennes pubs » | d03 | MONTRÉ | Dossier prospect : ses versions dans la bibliothèque. |
| 110 | « Mes résultats » | d03 | MONTRÉ | Après vente : retour de diffusion du client. |
| 111 | « Il ne devine pas. Il travaille avec mes données. » | d03 | MONTRÉ | Règle : aucune vidéo sans dossier de données du prospect. |
| 112 | « CONSEIL PERSO : Installe Obsidian, crée un dossier Ads avec offre, concurrents, pubs, résultats. Claude ne repart plus jamais de zéro. » | d03 | MONTRÉ | Un dossier « Pubs » par client dans la mémoire de domaine. |
| 113 | Mascotte avec étincelles, flèche noire vers la suite | d03 | MONTRÉ | Rien. |

### B5. Diapo 4 — skill 1 `/espionne`

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 114 | « SKILL 1 — Espionne tes concurrents en quelques secondes », skill « /espionne » | d04 | MONTRÉ | Skill « espionne » = notre agent bibliothèque Meta. |
| 115 | « Analyse les ads actives de tes concurrents » | d04 | MONTRÉ | Lire les pubs actives de la niche du prospect. |
| 116 | « Repère les hooks qui reviennent » | d04 | MONTRÉ | Compter les accroches répétées dans la niche. |
| 117 | « Décode les angles créatifs » | d04 | MONTRÉ | Étiqueter l'angle de chaque pub repérée. |
| 118 | « Sort des idées adaptées à ta marque » | d04 | MONTRÉ | Idées pour le prospect tirées de sa niche. |
| 119 | « AVEC ÇA, TU OBTIENS : 1. Les patterns du marché » | d04 | MONTRÉ | Fiche « tendances de la niche » dans le dossier. |
| 120 | « 2. Des idées de contenu » | d04 | MONTRÉ | Liste d'idées jointe au pack. |
| 121 | « 3. Une base solide pour tes prochains tests » | d04 | MONTRÉ | Plan de test livré avec les variantes. |
| 122 | Mascotte avec « ! » rouge | d04 | MONTRÉ | État « trouvaille » d'un agent. |

### B6. Diapo 5 — skill 2 `/metrics`

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 123 | « SKILL 2 — Comprends pourquoi tes pubs ne performent pas », skill « /metrics » | d05 | MONTRÉ | Offre de suivi après vente (plus tard). |
| 124 | « Lie Claude à ton compte Meta ou donne lui tes metrics. » | d05 | MONTRÉ | Accès aux stats du client seulement par son geste (lecture ou export). |
| 125 | « Il compare tes pubs, repère ce qui fatigue et t'aide à décider quoi couper, garder ou améliorer. » | d05 | MONTRÉ | Rapport « couper / garder / améliorer ». |
| 126 | « 1. Tes meilleures pubs classées par performance » | d05 | MONTRÉ | Classement de nos variantes chez le client. |
| 127 | « 2. Les hooks qui accrochent vs ceux qui floppent » | d05 | MONTRÉ | Mémoire des accroches gagnantes (n° 157). |
| 128 | « 3. Les audiences qui convertissent vraiment » | d05 | MONTRÉ | Choix d'avatar suivant l'audience qui convertit. |
| 129 | « 4. Ce qu'il faut couper et ce qu'il faut scaler » | d05 | MONTRÉ | Recommandation écrite dans le rapport. |
| 130 | Mascotte avec bulle de pensée | d05 | MONTRÉ | État « réfléchit » dessiné. |

### B7. Diapo 6 — skill 3 `/crea`

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 131 | « SKILL 3 — 30 variantes d'ads en 10 minutes », skill « /crea » | d06 | MONTRÉ | Skill « créa » : variantes en lot, pas une par une. |
| 132 | Entrée « tes objections » | d06 | MONTRÉ | Le script répond à une objection du produit. |
| 133 | Entrée « tes preuves » | d06 | MONTRÉ | Le script cite une preuve (avis, note). |
| 134 | Entrée « le ton de marque » | d06 | MONTRÉ | Le script reprend le ton des pubs de la marque. |
| 135 | Sortie « des copy » | d06 | MONTRÉ | Texte de pub livré avec chaque vidéo. |
| 136 | Sortie « des hooks » | d06 | MONTRÉ | 3 accroches par vidéo (n° 76). |
| 137 | Sortie « des scripts courts » | d06 | MONTRÉ | Script court par vidéo. |
| 138 | Sortie « des variantes à tester » | d06 | MONTRÉ | Variantes nommées et numérotées. |
| 139 | AVANT : « Un copywriter externe » | d06 | MONTRÉ | Argument de vente. |
| 140 | AVANT : « 2 jours d'attente » | d06 | MONTRÉ | Argument délai. |
| 141 | AVANT : « 3 options au mieux » | d06 | MONTRÉ | Argument volume. |
| 142 | MAINTENANT : « 30 pistes créatives alignées avec ton business à trier et tester » | d06 | MONTRÉ | Livrer des pistes triées, pas un tas. |
| 143 | Mascotte au clavier devant une fenêtre de terminal | d06 | MONTRÉ | Agent « écrit » dessiné. |

### B8. Diapo 7 — skill 4 `/note`

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 144 | « SKILL 4 — Note chaque pub avant de dépenser un euro », skill « /note » | d07 | MONTRÉ | Juge de pub avant tout envoi au prospect. |
| 145 | « Colle ton script, ta copy ou ton idée de visuel. » | d07 | MONTRÉ | Le juge note script, texte et visuel. |
| 146 | Critère « Hook » | d07 | MONTRÉ | Critère du juge. |
| 147 | Critère « Clarté » | d07 | MONTRÉ | Critère du juge. |
| 148 | Critère « CTA » | d07 | MONTRÉ | Critère du juge. |
| 149 | Critère « Émotion » | d07 | MONTRÉ | Critère du juge. |
| 150 | Critère « Offre » | d07 | MONTRÉ | Critère du juge. |
| 151 | Critère « Preuve » | d07 | MONTRÉ | Critère du juge (+ allégations, n° 69). |
| 152 | « Tu sais exactement pourquoi ton ad est faible avant de dépenser un seul euro. » | d07 | MONTRÉ | La note dit pourquoi, pas seulement un chiffre. |

### B9. Diapo 8 — appel

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 153 | « Tu veux installer ta mini-agence dans Claude ? » | d08 | MONTRÉ | Rien. |
| 154 | « Commente "META" » dans un encadré | d08 | MONTRÉ | Mot-clé en commentaire sur nos posts. |
| 155 | « et je t'envoie le guide complet : Skills + Prompts + Workflow » | d08 | MONTRÉ | Aimant à prospects : un guide envoyé. |
| 156 | Carte auteur : photo, « @AIBYMATT_ », « Je t'aide à comprendre l'IA simplement » | d08 | MONTRÉ | Rien. |

### B10. Légende écrite

| # | Élément | Preuve | Type | Presti reprend |
|---|---|---|---|---|
| 157 | Donnée en entrée : « mes hooks gagnants » | legende.txt | DIT | Mémoire des accroches qui ont marché, par niche. |
| 158 | Donnée centralisée : « avatars clients » | legende.txt | DIT | Fiche avatar par produit. |
| 159 | Accroche « Tu pensais qu'il fallait une équipe complète pour sortir des pubs Meta qui performent ? Moi aussi. » | legende.txt | DIT | Modèle d'accroche pour nos posts. |
| 160 | Rôle « Un copywriter pour les hooks » | legende.txt | DIT | Agent accroches. |
| 161 | Rôle « Un media buyer pour les data » | legende.txt | DIT | Agent données (plus tard, après vente). |
| 162 | Rôle « Un designer pour les créas » | legende.txt | DIT | Agent visuel. |
| 163 | « J'ai arrêté d'utiliser l'IA comme un simple chatbot. J'ai commencé à construire un vrai système autour de Claude. » | legende.txt | DIT | Skills + mémoire, pas du chat. |
| 164 | Capacité « trouver de nouveaux angles » | legende.txt | DIT | Angle neuf proposé à chaque prospect. |
| 165 | Capacité « comprendre pourquoi une pub floppe » | legende.txt | DIT | Rapport de suivi (n° 123). |
| 166 | À construire : « une base de connaissances » | legende.txt | DIT | Mémoire de domaine « pubs ». |
| 167 | À construire : « un workflow » | legende.txt | DIT | Chaîne écrite repérage → vidéo → juge → envoi. |
| 168 | À construire : « des prompts solides » | legende.txt | DIT | Modèles de prompt versionnés (verrous n° 63 à 65). |
| 169 | À construire : « une mémoire marketing » | legende.txt | DIT | Journal de ce qui a converti. |
| 170 | Centralisation Obsidian : « offres, avatars clients, hooks, pubs gagnantes, concurrents, résultats… » ; « Claude repart jamais de zéro » | legende.txt | DIT | Coffre par client. |
| 171 | Guide promis : « prompts, skills, workflow, système Obsidian, méthodes d'analyse Meta Ads » | legende.txt | DIT | Rien. |
| 172 | Hashtags « #meta #ia #intelligenceartificielle #claudeai #metaads » | legende.txt | DIT | Hashtags pour nos posts pubs. |

---

## C. Écarts et incertitudes relevés

- **Nom de la skill :** dit « Alexia UGC Omni » (0:16.0–0:20.3), écrit « /alexya-ugc-omni » (t018.0) et sous-titré « Alexya UGC omni » (t020.0). L'écran fait foi.
- **Objection :** transcription « pour Glia », sous-titre « pour de l'IA » (t043.0). Le sous-titre fait foi.
- **« Avec l'autre »** (0:43.0) : mot non vérifiable à l'image. Sans doute « l'outil ».
- **« Commande guide »** (0:57.7) : sans doute « commente guide ». Aucun écran ne le montre.
- **« Quelques secondes »** (0:22.7) contre « 173s » sur la carte vidéo (t026.0). Le sens de 173 s n'est pas dit.
- **Voix de la vidéo générée** : absente de la transcription. Seuls trois bouts se lisent dans les sous-titres (t026.0, t028.0, t029.8). Aucune image ne montre de sous-titre à t027.0.
- **Enregistrements aibymatty :** 1 624 dans legende.txt, 1 622 dans carrousels.md.
- **Compte :** « aibymatty » (carrousels.md) contre « @AIBYMATT_ » sur les diapos.
- **Date aibymatty :** carrousels.md note « 5-6 », sens non précisé.
- **Exemple UGC du début** (t004.0, t005.3) : lettrage à l'envers, marque lue « rhode » sans certitude.
- **Crédits Alexya** (t024.0, t025.1) : le chiffre est illisible, même en pleine définition.
- **Unité des 200-300 €** (0:47.7) : non dite (par vidéo, probablement).

---

## D. Les 10 éléments les plus importants pour le service pubs

1. **Repérage** — bibliothèque Meta filtrée France + toutes les pubs + mot-clé de niche + pubs actives (n° 15, 16, 17, 20).
2. **Score du prospect** — lu sur la carte : « Active », date de début, « multiple versions », plateformes (n° 21, 23, 24, 25).
3. **Entrées de génération** — photo packshot + URL de destination de la pub, avec l'offre en cours (n° 37, 38, 39, 43).
4. **Choix automatiques** — avatar « Femme 25-35 ans » et format « 1 scène talking (le plus fiable) » (n° 46, 47).
5. **Deux temps** — image de référence avatar + produit, puis vidéo Omni (n° 49, 53, 57).
6. **Contrôle qualité** — triple verrou anti-cut et relance après une 1re vidéo ratée (n° 62, 63, 64, 65).
7. **Démarchage** — vidéo offerte sur l'Instagram de la marque, « gratuit » dit clairement, pack proposé dans le même message (n° 72, 73, 74).
8. **Volume** — 3 accroches par vidéo : « pour le prix de 10, ils en ont 30 » ; chez Presti 5 × 3 = 15 (n° 76, 77, 78).
9. **Ancrage prix et délai** — un créateur humain demande 200-300 € et met 2 semaines (n° 79, 81).
10. **Juge avant envoi** — note sur 6 critères (Hook, Clarté, CTA, Émotion, Offre, Preuve), plus un contrôle des allégations santé (n° 146 à 151, 69).
