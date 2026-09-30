# Écosystème Presti — veille des 7 contenus envoyés par Benj (24/09/2026)

> Analyse faite par Claude Code le 24/09.
> - **Méthode :** son des vidéos téléchargé avec l'accord de Benj, puis transcrit en local (faster-whisper large-v3-turbo). Les images ont été relevées à l'écran, sans téléchargement.
> - **Sources brutes :** `presti-ops/veille/2026-09-24/` (transcriptions `*.txt`, métadonnées `*.info.json`, carrousels `carrousels.md`).
> - **Statut :** ce sont des contenus de créateurs qui vendent aussi leur méthode (appel à commenter un mot-clé). Leurs chiffres de revenus ne sont pas vérifiés.

## 1. Hugo Matias (@hugomatias.ai, 118 k abonnés) — reel DcODQPCMsLl, 19/08, 1 322 j'aime, 1 646 commentaires — **LE PLUS IMPORTANT**

« Un client vient de me payer 1 300 € pour des vidéos qui m'ont pris 2 h. »

**Méthode, mot pour mot :**
1. **Trouver le client dans la bibliothèque publicitaire de Meta.** Filtres : France, toutes les pubs, nom de la niche. On choisit parmi les pubs « les plus intéressantes » : l'annonceur dépense déjà en pub, donc il a un budget et un besoin de créas.
2. **Récupérer le site de la marque**, dans son exemple « Luxeol ».
3. **Dans Claude, ouvrir la skill « Alexia UGC Omni ».** On importe la photo du produit et le lien. Quelques secondes plus tard, la vidéo UGC est générée.
4. **Télécharger la vidéo, trouver l'Instagram de la marque, la lui envoyer gratuitement.** Message : c'est offert ; si vous en voulez plus, pack de 10 vidéos à 1 300 €.
5. **Argument de prix :** 3 hooks par vidéo, donc 30 vidéos pour le prix de 10. Un créateur UGC humain facture 200 à 300 € la vidéo et livre en 2 semaines ; ici, 2 h.
6. **Appel final :** « commente GUIDE ». C'est un aimant à prospects par commentaire.

**Ce que c'est :**
- **« Alexia » = Alexya** (alexya.ai), studio d'images ultra-réalistes et de vidéos verticales.
- **Formules :** 9 $/mois (1 900 crédits, environ 13 vidéos), 29 $ (7 400 crédits, environ 52 vidéos), 99 $ (29 200 crédits, environ 208 vidéos).
- **Connecteur Claude officiel** (MCP, OAuth) : `https://mcp.alexya.ai/mcp`, à ajouter dans Claude → Réglages → Connecteurs.
- **« UGC Omni »** est probablement une skill construite par-dessus ce connecteur, peut-être avec le modèle vidéo « Gemini Omni » de Google. Le nom exact n'est pas documenté publiquement.

## 2. Jt — reel DdKrZjlg1eC, 12/09, 231 j'aime, 119 commentaires — prospection à froid (la vidéo « stratégie de DM » envoyée le 16/09)

1. **Liste ICP serrée :** secteur exact, poste, taille d'entreprise, lieu.
2. **Douleurs trouvées sur Reddit :** Claude en « recherche approfondie » ramène mots-clés, phrases de douleur, subreddits et formulations d'aimant.
3. **Offre d'appel tirée de ces douleurs :** la douleur, qui la ressent, son intensité, les mots exacts, une question qui « appuie là où ça fait mal », et des accroches.
4. **Stratégie de la vidéo Loom :** « J'ai préparé une courte vidéo qui montre comment régler ce problème chez vous, je vous l'envoie ? » On ne pousse plus à l'aveugle : un aimant attire, annoncé à 20-30 % de conversion (chiffre du créateur).
5. **Appel final :** « commente EMAIL ».

## 3. aibymatty — carrousel TikTok, 8 diapositives, 1 622 enregistrements — mini-agence Meta Ads dans Claude

- **La mémoire marketing :** Claude travaille sur TES données (offre, audience, concurrents, anciennes pubs, résultats, hooks gagnants), rangées dans Obsidian.
- **4 skills :**
  - `/espionne` : pubs actives des concurrents, hooks récurrents, angles.
  - `/metrics` : compte Meta relié ; classement des pubs, hooks qui accrochent ou floppent, audiences qui convertissent, quoi couper ou pousser.
  - `/crea` : 30 variantes (copies, hooks, scripts) en 10 min.
  - `/note` : note chaque pub AVANT d'y mettre 1 €, sur 6 critères (hook, clarté, appel à l'action, émotion, offre, preuve).
- **Appel final :** « commente META ».

## 4. mr_pynk — TikTok 7637274283470753056, 07/05, 226 k vues, 1 929 commentaires — studio de pub IA dans Claude Code

« Je donne ma marque à Claude » : une chaîne de 3 skills, sans écrire de prompt.
1. **Générateur de photos produit** conformes à la marque.
2. **Générateur de pubs** adaptées à l'audience.
3. **Animateur :** analyse les scènes et les anime en vidéos finales.

Idéation, génération, création de la pub et animation se font au même endroit.

## 5. trevsagents — TikTok 7644344691688770846, 26/05, 153 k vues — « Mission Control » d'agents (#openclaw #claudecode)

Vidéo sans voix, relevée image par image.
- **Agents à rôles fixes :**
  - Matt, directeur des opérations : cycle environ toutes les 2 h, 12 cycles par jour, GPT-5.5 via Codex, abonnement ChatGPT Pro à 100 $/mois forfaitaire.
  - Finn (Fiverr), Dennis (recherche et stratégie), Pham (musique YouTube), Bumc (Etsy), Luke (marketing TikTok), Maverick (expérience autonome isolée, minuterie de 6 h).
  - Les agents d'exécution sont déclenchés par événement : ils démarrent quand une tâche leur arrive.
- **File « Attention » pour l'humain :**
  - « Pham bloqué : chaîne YouTube + OAuth non configurés » ;
  - « 1 brouillon Etsy → à relire » ;
  - « Crédits bas : 2,12 $ » ;
  - « 3 tâches bloquées → à relire » ;
  - « 1 → approuver ou tuer » ;
  - « 14 escalades de Matt → ta décision ».
- **Trésorerie :** dépense par agent et par tâche (OpenRouter et Replicate), crédits restants, abonnements. Au total, 31,88 $ dépensés pour 2 216 $ de revenus affichés.
- **Revenue Bay :** tous les revenus au même endroit (Etsy, Fiverr…).
- **Factory :** pipeline de commandes (fiches actives, brouillons, publiées, en attente d'approbation).
- **Vue ludique :** station en pixel art, une pièce par agent.

## 6. androoagi — TikTok 7623856430621134110, 01/04, 280 k vues — l'« écosystème » visible (#openclaw)

« Un écosystème pour voir où sont mes agents et ce qu'ils font. » Des usines tournent 24 h/24 :
- **Etsy :** environ 2 000 $ et 37 commandes en 2 semaines (chiffres du créateur).
- **Vibes :** musique house/techno publiée sur Spotify et YouTube, avec ses visualiseurs.
- **Services Fiverr :** miniatures YouTube faites avec Nano Banana Pro ; une commande est remplie automatiquement.
- **Packs d'assets 2D, newsletter, contenu marketing** pour son vrai métier (logiciel pour concessionnaires).
- **Vue ludique :** usines en pixel art (tapis roulant concept → design → package → publish), trésorerie, canal « comms » où les agents proposent des idées.
- **Méthode notable :** copier un service Fiverr existant et mal servi, le vendre moins cher, et le faire exécuter par les agents.

## 7. photography_by_raa — carrousel TikTok, 25/04 — publicité pour adaptive.ai

Une entreprise tenue seul, avec des agents :
- **Matin :** briefing (agenda, e-mails urgents, messages → priorités).
- **Journée :** agents de prospects, de support (brouillons de réponses) et de veille concurrentielle.
- **Fin de semaine :** revue automatique (fait, avance, à regarder).
- **Fin de mois :** comptabilité, dossier comptable, rapport de ventes.

## Ce qui revient partout (les briques de l'écosystème)

1. **Un chef d'orchestre qui tourne par cycles**, et des exécutants spécialisés déclenchés par tâche. Chez Presti, c'est l'orchestre (`presti/.orchestre/`, `executant.mjs`, `antigravity.mjs`) avec Codex et Antigravity : il existe déjà.
2. **Une mémoire partagée** que tous les agents lisent : le vault (`SaaS/`), `contexte.md`, `decisions.md`, et désormais la mémoire ECC.
3. **Une file « à décider par l'humain »** courte et claire : approuver ou tuer, crédits bas, OAuth manquant. Le reste avance seul.
4. **Trésorerie et revenus visibles** : dépense par agent, revenus par source.
5. **Acquisition par « preuve offerte »** :
   - la bibliothèque Meta sert à trouver qui dépense déjà ;
   - on génère un échantillon gratuit à SES produits ;
   - on l'envoie en message privé ;
   - on vend un pack.
   C'est exactement la logique Presti : un site maquette offert à l'artisan, puis vendu.
6. **Aimant par commentaire** (« commente X »), qui déclenche un message privé automatique.
7. **Studio de pub en skills** : espionner, créer, noter, animer, mesurer.
