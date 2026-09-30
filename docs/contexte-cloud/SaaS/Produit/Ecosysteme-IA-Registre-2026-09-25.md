# Registre des IA et routage de l'écosystème Presti (25/09/2026)

> Demande de Benj (25/09) : « normalement, à court de crédit, ça devrait plus être possible avec tout le système déjà en place pour les IA de l'écosystème ; pas en oublier une seule ; pense à Nano Banana ou Perplexity ; et pour les sites, n'oublie pas le kit Figma, la structure et le squelette de base ».
> Le kit Figma, la structure et le squelette des sites ont leur document compagnon : `SaaS/Produit/Ecosysteme-Sites-Kit-2026-09-25.md`, écrit par la même passe (fiches 026-167 à 026-171). Ce document-ci tient le **registre des IA**, le **routage**, les **jauges** et **la règle de Claude Code**.
> Écrit en lecture seule le 25/09 entre 19 h 10 et 19 h 40. Aucun commit, aucune génération (ni image, ni vidéo, ni voix), aucun appel Perplexity Computer, aucune estimation ElevenLabs. Aucune valeur de clé lue : ni `.env.local`, ni `presti-secrets`, ni le `.env` de freellmapi, ni la colonne `unified_api_key`, ni `encrypted_key`.
> Lectures gratuites faites pour ce document : `get_usage` (limites Claude), `whoami` (Figma), `search_prompts` (MotionSites), `projects_list` (Perplexity), la base de freellmapi en lecture seule (noms de fournisseurs, compteurs, catalogue), le dernier journal de session de Codex sur l'usine (compteurs de quota seulement), deux pages officielles (prix de l'API Gemini, limites du connecteur Figma).

---

## Décision du chef d'entreprise (27/09)

Source : `SaaS/Produit/Ecosysteme-Organigramme-2026-09-27.md` §7.3 (incohérences 11 à 17) et §8 (points 4 et 5), et les règles de Benj. **Cette section l'emporte sur tout le reste du document** ; les tableaux plus bas ont été corrigés en conséquence, l'ancienne valeur est notée entre parenthèses quand elle sert à comprendre.

**Pourquoi.** Le registre du 25/09 à 19 h 40 envoyait encore toute la voie des données de prospect (D1) vers la clé Anthropic « agents » (R16). Cette clé a été **annulée le soir même** par la revue transverse (« aucun achat ») ; les fiches 026-041 et 026-043 ont été réécrites sur Codex, pas le registre. Groq y restait une bascule alors que Benj l'a refusé. Deux points restaient ouverts : le secours gratuit du chef et Firecrawl.

**Ce qui change :**
1. **Données de prospect (D1) : Codex ou local, rien d'autre.** Codex = l'abonnement ChatGPT de Benj, par le lanceur `presti-ia-modele` sur l'usine (026-043, 026-129) ; G3 est fait depuis le 25/09, Codex les reçoit donc en automatique. Local = Ollama et Laya sur l'usine ; leur drapeau ne s'allume que sur le « oui » daté de Benj (026-041, ajout du 26/09). Sans l'une de ces deux voies, la tâche **attend**. La clé « agents » (réserve C) n'existe pas et ne reçoit rien ; aucun agent ne l'utilise. Claude (réserve A) n'est pas une voie D1. Jamais une IA gratuite distante ni un modèle `:cloud`.
2. **Groq est retiré de tout secours** (refusé par Benj le 25/09) : ni recherche (`compound`), ni transcription (Whisper), ni texte. Aucune clé Groq dans freellmapi ; le geste G2 se réduit à Cloudflare, branché le 25/09.
3. **Secours de Matt (le chef) : Ollama Cloud permis, parce que son entrée ne contient aucune donnée de prospect.** Le cycle lit `ops_etat()`, dont le texte ne porte ni la clé `prospects` ni rien qui ressemble à une adresse (026-013, critère m). Ordre : Codex `gpt-6-sol`, puis `gpt-6-luna`, puis Codex sur Ollama Cloud `gpt-oss:120b-cloud`, puis cycle sauté (« chef à sec »). **Toute entrée qui contiendrait une donnée de prospect reste sur Codex ou local** : un cycle de secours ne reçoit que `ops_etat()` ; les consignes de Benj et les événements restent pour le prochain cycle Codex (le curseur n'avance pas). La file IA des agents (`presti-ia-modele`), qui tourne sous le même compte `chef-modele`, ne suit jamais ce secours.
4. **Firecrawl ne reçoit que l'URL publique d'un site d'entreprise**, jamais un nom, un téléphone ni un e-mail, ni dans l'adresse, ni dans une requête. L'opération `chercher` de 026-223 (une requête libre peut porter un nom qu'aucun filtre ne reconnaît) n'est une voie d'aucun agent.
5. **Juges** : écrire un juge et rendre un verdict sur une fiche ou une livraison, c'est Claude seulement ; jamais Gemini ni Antigravity, ni Codex en contre-juge. Les contrôles des envois (second juge et rejugement du Facteur) lisent des données de prospect : la règle 1 l'emporte, ils tournent sur Codex (026-089), jamais sur Gemini ni Antigravity.
6. **Rappels de Benj qui s'appliquent au registre** : publication, envoi et dépense demandent son accord à chaque fois (R24) ; OpenClaw tourne dans un conteneur isolé (026-221), sur des modèles gratuits seulement, jamais sur l'abonnement Claude, et ne reçoit aucune donnée de prospect.

---

## En bref

1. **Aujourd'hui, se retrouver « à court de crédit » peut encore arriver.** Trois raisons. freellmapi n'a servi **aucune requête** depuis son installation : sa base compte 0 requête. Aucun routeur ne bascule d'une IA à l'autre. Et la série 026, qui porte les agents, les jauges et le réaiguillage, n'existe encore qu'en brouillons.
2. **Mesuré à 19 h 28.** Claude Max : 62 % de la semaine consommés (remise à zéro dimanche 27/09 à 07 h 59). Codex : 56 % de la semaine (remise à zéro lundi 28/09 à 23 h 43). Le PC, l'usine et le chef tirent tous sur le **même** abonnement ChatGPT.
3. **L'inventaire contenait des erreurs, corrigées au §0.** Les 3 clés de freellmapi sont Google, Mistral et Cerebras, pas Groq, et Cerebras n'a aucun modèle au catalogue. Nano Banana n'a **aucune offre gratuite** sur l'API Gemini. ElevenLabs gratuit ne donne **pas le droit commercial**. Enfin, Antigravity, Gemini CLI, Qwen Code, Kokoro et la clé « agents » manquaient.
4. **Le routage (§2) donne une voie principale et 2 ou 3 bascules à chacun des 18 types de travail.** Les bascules passent par des réserves de quota distinctes et se déclenchent sur 6 règles. Les données de prospect ne vont qu'à Codex ou à un modèle local de l'usine, jamais au gratuit distant (27/09 ; le texte du 25/09 disait « aux API Anthropic payantes », clé annulée). Quand toutes les voies sont épuisées, la tâche attend dans la file au lieu d'échouer.
5. **Claude ne garde que ce qui demande du jugement.** Juges, décisions et relecture visuelle restent en Opus. Fiches et synthèses passent en Sonnet ou chez Codex ; l'exploration, en Haiku ou chez freellmapi. Les seuils de la semaine (70, 85 et 95 %) coupent ce qui n'est pas du jugement bien avant la coupure.
6. **Le 25/09, il manquait 3 gestes groupés de Benj.** Récupérer la clé unifiée et poser les clés Groq et Cloudflare, dans le même tableau de bord. Couper deux interrupteurs de confidentialité. Créer la clé « agents », déjà décidée. S'y ajoutent 7 fiches `026-nouv-ia` et 9 retouches. Nano Banana et Perplexity sont inscrits au registre, avec leur prix réel. **État au 27/09** : G1 fait (clé freellmapi posée le 25/09) ; G2 réduit à Cloudflare, branché le 25/09, Groq refusé ; G3 fait le 25/09 ; G4 (clé « agents ») annulé.

---

## 0. Ce que l'inventaire disait de faux, avec la preuve

| # | L'inventaire disait | La réalité, vérifiée le 25/09 | Preuve |
|---|---|---|---|
| 1 | freellmapi : « Gemini + Groq actifs, Cerebras + Mistral en secours » (vient de la mémoire [[ecosysteme-presti]]) | Les **3 clés posées** sont `google`, `cerebras` et `mistral`, toutes `healthy`. **Groq n'a pas de clé.** | table `api_keys` de `~/freellmapi` (volume `freellmapi-data`, `freeapi.db`), colonnes `platform`, `status` seulement |
| 2 | 3 clés saines = prêtes | La clé Cerebras ne sert à rien : **0 modèle Cerebras** au catalogue appliqué (`monthly`, version `2026.09.25`). Le seul journal d'erreur du serveur dit « Key 3 (cerebras) transport error: The operation was aborted ». | tables `models` et `server_logs` |
| 3 | « outil configuré, pas encore branchable » | Plus précis : **aucune requête n'a jamais été servie** (`requests` vide, `total_requests = 0`). Les quotas observés n'ont ni plafond ni reste (`limit_value null`, confiance 0,1). | tables `requests`, `settings` (nom des clés seulement), `provider_quota_state` |
| 4 | Gemini gratuit = « travail de masse » | Le gratuit de Google est **mince** : gemini-3.7, 3.6 et 3.5-flash ont 10 req/min et **20 req/jour chacun**. Seuls Gemma 4 31B et 26B montent à 1 000 req/jour. Mistral : 2 req/min, 500 000 jetons/min, sans plafond journalier déclaré. | table `models` (`rpm_limit`, `rpd_limit`, `tpm_limit`) |
| 5 | « Nano Banana — voie API Gemini gratuite (palier gratuit Google AI Studio) » | **Faux.** La page de prix officielle dit qu'**aucun modèle d'image n'a d'offre gratuite** sur l'API. Prix : Nano Banana 2 Lite 0,0336 $/image (0,0168 $ par lots), Nano Banana 2 0,067 $/image en 1K, Nano Banana Pro 0,134 $ (0,24 $ en 4K). La version 2.5 est dépréciée. Seules l'interface AI Studio et l'application Gemini restent gratuites, et à la main. | https://ai.google.dev/gemini-api/docs/pricing, lue à 19 h 25 ; `Ecosysteme-Recherche-Pubs-2026-09-24.md:187` |
| 6 | ElevenLabs Creative « opérationnel » pour UGC, voix, Nano Banana | Le compte est en formule gratuite, **sans licence commerciale**. Il ne sert donc ni pour un pack vendu ni pour une pub de Presti. 026-156 l'a déjà écarté : la voix `ff_siwis` (locale, gratuite) passe par défaut, « ElevenLabs Creative seulement avec une offre payante qui donne le droit commercial ». Autre point : le connecteur de session peut rester branché sur l'ancien espace à sec (f22a0045…). | [[clipforge-regles-permanentes]] (24/09) ; `.orchestre/brouillons-ecosysteme/026/INDEX.md:174` |
| 7 | (absent) | **Antigravity manquait**, alors que c'est un exécutant majeur. On y trouve Gemini 3.8 et 3.7 Flash (High), `pro`, `flash_lite`, ainsi que Claude Opus et Sonnet 4.6. Chaque modèle a son quota (429 `RESOURCE_EXHAUSTED`). Dernier lancement : 16/09 à 20 h 08. | [[presti-orchestre-antigravity]] ; `.orchestre/agents.jsonl` (130 lignes) |
| 8 | (absent) | **Gemini CLI et Qwen Code** sont déjà câblés dans `scripts/executant.mjs:37-38` (`--moteur=gemini\|qwen`), mais n'ont jamais servi. Depuis le 14/09, Gemini CLI demande une clé AI Studio : Google a refusé la connexion par compte (« IneligibleTierError »). Qwen demande une connexion OAuth, une fois. | `scripts/executant.mjs:10-18` ; `SaaS/Produit/Antigravity.md` § Second exécutant |
| 9 | (absent) | Il manquait aussi les outils suivants. **Kokoro** (`hyperframes tts`, voix française `ff_siwis`) : local et gratuit, vérifié dans le CLI le 24/09. **Gemini TTS** (2 modèles) : déjà servi par la clé Google de freellmapi. **Cloudflare Workers AI** : images FLUX, MeloTTS, Whisper, sans clé pour l'instant. **Groq Whisper**, sans clé. Et la **clé Anthropic « agents »** (R16, 30 $/mois, 026-043), la seule voie des données personnelles chez les agents. *27/09 : Groq refusé par Benj ; clé « agents » annulée le 25/09 (voir la décision en tête).* | `026-126.md:32` ; table `media_models` ; `026-043.md` |
| 10 | « Ce run : Sonnet 5 » | Ce sous-agent tourne sur **Opus 5.5** (`claude-opus-5-5`). L'abonnement est **Max**. | en-tête de session ; `get_usage` |
| 11 | Codex PC : « gpt-5.6-sol (défaut) » | Le modèle par défaut est **gpt-6-sol** depuis le 24/09, sur le PC comme sur l'usine. gpt-5.6 est marqué « older ». | `scripts/executant.mjs:33-36` ; `scripts/usine.mjs:58` |
| 12 | Figma : « vérifier que le siège permet l'écriture » | Figma, formule **Starter** avec siège **View**, applique au connecteur ces limites : **20 appels par mois** pour les outils de lecture (`get_design_context`, etc.). Les outils qui écrivent dans un fichier, plus `create_new_file`, `whoami` et `add_code_connect_map`, en sont **exemptés**. L'écriture reste à éprouver sur un fichier d'essai (026-170 du doc Sites-Kit). | `whoami` à 19 h 24 ; https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/ |
| 13 | « plan déjà écrit dans `Ecosysteme-Sites-Kit-2026-09-25.md` » | Le fichier était absent à mes deux premières lectures (jusque vers 19 h 27). Il est paru à 19 h 29, écrit par la passe sœur. | `ls SaaS/Produit` |
| 14 | Perplexity : « plan non vérifié » | Le connecteur répond : `projects_list` renvoie 0 projet à 19 h 24. En revanche, son plan et le coût d'un appel Computer restent **inconnus**, et aucun appel n'est fait dans l'écosystème. | appel `projects_list` |
| 15 | MotionSites | Le connecteur répond (`search_prompts` à 19 h 24). Les 2 résultats sont « premium », donc `get_prompt` est payant. L'avis du harnais « requires authentication » est une fausse alerte. | [[motionsites-connecteur-marche]] |

---

## 1. Le registre : toutes les IA, rangées par réserve de quota

La notion qui compte pour « ne jamais être à court », c'est la **réserve**. Deux IA qui tirent sur la même réserve tombent ensemble. Codex sur le PC, Codex sur l'usine et le chef (`chef-modele`) tirent tous sur l'abonnement ChatGPT de Benj : ils ne sont pas trois bascules, mais une seule.

**Classes de données** (utilisées au §2) :
- **D0** : rien de personnel. Cela couvre le code, les fiches, le contenu de Presti, les pages publiques d'entreprises sans nom de personne et les vidéos de référence publiques.
- **D1** : personnel. Le nom d'un artisan en entreprise individuelle, un e-mail, un téléphone, un message reçu, une adresse, la photo d'une personne.
- **D2** : secret. Aucune IA n'y a accès, jamais.

| Réserve | IA / outil | Modèles | Coût réel | Quota (mesuré 25/09 ou déclaré) | Porte d'entrée | D1 permis ? | Droit commercial | État 25/09 |
|---|---|---|---|---|---|---|---|---|
| **A · Claude Max** | Claude Code : session, sous-agents, workflows, Claude in Chrome, WebSearch/WebFetch | Opus 5.5, Sonnet, Haiku ; un compteur hebdomadaire séparé « Fable » à 0 % | abonnement Max (rectification §4.5 l.786) | **5 h : 12 %** (remise à zéro à 23 h 59) · **semaine : 62 %** (remise à zéro dim. 27/09, 07 h 59) · dépassement payant **coupé** | PC | **non** comme voie de travail (27/09 : une donnée de prospect ne va qu'à Codex ou au local ; les contrôles de Claude Code se font sur des données fictives) | oui (textes, code) | en service ; c'est le **goulot** |
| **B · API Anthropic « produit »** | `lib/ai.ts` (cerveaux du produit : réponses, relances, devis) | `claude-haiku-4-5` / `claude-sonnet-5` / `claude-opus-5` selon le palier (`lib/models.ts:6-10`) | à l'usage | crédit de la clé non lu. **Aucun repli de modèle** sur 429/529 dans `lib/ai.ts` (seulement un message « réessaie ») | Vercel | **oui** (l'API n'entraîne pas sur les données par défaut) | oui | en prod |
| **C · API Anthropic « agents »** (R16) | `lib/agents/llm.ts`, seul lecteur de `ANTHROPIC_AGENTS_KEY` (026-043) | `MODELE_AGENTS = claude-haiku-4-5` ; `MODELE_REJUGE` (un autre Claude) | plafond de **30 $/mois**, alertes à 50 et 80 % ; 0,05 € par appel ; 1 €/jour pour le standardiste, 2 €/jour pour le rédacteur | coûts dans `ops.couts` (0098) | routes Vercel, coffre de l'usine | **aucune donnée** : réserve annulée (le 25/09, c'était « la voie D1 des agents ») | — | **annulée le 25/09** (aucun achat) : jamais créée ; `ANTHROPIC_AGENTS_KEY` ne doit apparaître nulle part dans `app/` ni `lib/` (LL-10 de 026-041) |
| **D · ChatGPT de Benj** | Codex (PC, `scripts/executant.mjs`), Codex sur l'usine (`scripts/usine.mjs`), chef (`chef-modele`, 026-102) | défaut `gpt-6-sol` ; `gpt-6-luna` (léger) ; `gpt-6-astra` (gros) ; catalogue de l'usine : + `gpt-reserve`, `gpt-5.6-*`, `gpt-5.5`, `codex-auto-review` | abonnement ChatGPT | **5 h : 0 %** · **semaine : 56 %** (remise à zéro lun. 28/09, 23 h 43) · **crédits : 0** (dernier journal de session de l'usine, tâche lancée à 19 h 20) | usine (≤ 2 à la fois), PC (≤ 1) | **oui** : G3 fait le 25/09 ; avec le local, c'est la **seule** voie D1 (27/09), en automatique par `presti-ia-modele` sur l'usine (026-043). Jamais sur un secours `:cloud` ou freellmapi | oui | en service |
| **E · Google, via Antigravity** | agents d'Antigravity (`scripts/antigravity.mjs`) | Gemini 3.8 / 3.7 Flash (High), `pro`, `flash_lite` ; Claude Opus et Sonnet 4.6 dans l'IDE (coupés le 17/09) | gratuit (compte Google) | quota **par modèle**, épuisé en quelques minutes à 2 agents ou plus ; retours par vagues (1 h 25 à 6 h 24) | PC seulement, IDE ouvert, politique EAGER | **non** | oui (code) | **dormant** depuis le 16/09 |
| **F · freellmapi** (usine, `127.0.0.1:3001`) | une porte compatible OpenAI (`/v1`) | **google** (clé saine) : gemini-3.7, 3.6 et 3.5-flash (20/j chacun), 3.5-flash-lite (20/j), gemma-4-31b-it et gemma-4-26b (1 000/j), TTS `gemini-2.5-flash-preview-tts` et `gemini-3.1-flash-tts-preview` · **mistral** (clé saine) : ministral 3b/8b/14b, mistral-code, codestral (2/min) · **cerebras** (clé saine, 0 modèle) · sans clé : groq (**refusé par Benj le 25/09 : aucune clé n'y sera posée**, 27/09), cloudflare (25 textes, 9 images, 4 voix, 4 transcriptions), openrouter (12), huggingface (117), nvidia, cohere, zhipu… | 0 € | **0 requête servie** ; quotas non encore observés | usine ; PC par tunnel `-L 3001:127.0.0.1:3001` | **jamais** : les offres gratuites peuvent entraîner leurs modèles | selon le fournisseur (sorties de l'API Gemini : oui ; modèles ouverts : leur licence) | installé, **jamais branché** (clé unifiée non récupérée) |
| **F′ · Ollama Cloud** (ajout du 27/09, voir §6) | serveur Ollama de l'usine (`127.0.0.1:11434`), relié au compte ollama.com de Benj | `gpt-oss:120b-cloud`, `gpt-oss:20b-cloud`, `gemma4:cloud`, `nemotron-3-super:cloud` (gratuits) ; les autres sont payants, rien n'est acheté | 0 € | quota du compte gratuit, non mesuré | usine | **jamais** : un modèle `:cloud` ne reçoit aucune donnée de prospect | selon le modèle | en service : secours de Codex **pour le code (D0)** et **secours de Matt** (entrée = `ops_etat()` seul, décision 3) ; jamais pour la file IA des agents |
| **G · Gemini CLI** | `executant.mjs --moteur=gemini` | `gemini-2.5-pro` par défaut | 0 € (clé AI Studio) | quota du projet Google de la clé | PC | non | oui (code) | non configuré |
| **H · Qwen Code** | `executant.mjs --moteur=qwen` | Qwen (OAuth) | 0 € [à vérifier : l'offre gratuite est-elle toujours ouverte] | inconnu | PC | non | [à vérifier] | non configuré |
| **I · Perplexity** | Perplexity Computer (connecteur `66d36602…`) : recherche web, navigation, code, documents, **images** | modèle interne, non précisé ; modèle d'image [à vérifier] | plan de Benj **inconnu** ; chaque appel Computer consomme des crédits [à vérifier] | expire au bout de 2 min par appel, reprise par `thread_id` | cette session (et Codex, qui partage les connecteurs [à vérifier]) | non | [à vérifier] | branché, **jamais appelé** |
| **J · ElevenLabs Creative** | connecteur `b25622fe…`, ou elevenlabs.io dans Chrome | **Nano Banana Pro**, Gemini Omni, Veo 3.1, Kling 3, Seedance, HeyGen Avatar 4, Creatify Aurora, voix FR, transcription | formule gratuite, **10 000 crédits/mois**. Une vidéo de 8 s en Gemini Omni ≈ 6 087 crédits : environ 1,6 vidéo par mois | crédits du mois ; toujours `estimate_only` avant de générer | cette session / Chrome | non | **non en gratuit** | utilisable pour l'interne |
| **K · API Gemini payante** | Nano Banana, Veo par l'API | Nano Banana 2 Lite 0,0336 $/img · Nano Banana 2 0,067 $ · Pro 0,134 $ · Veo 3.1 Lite 0,08 $/s en 1080p | **payant, sans offre gratuite** | — | aucune | non (les conditions gratuites ne s'appliquent pas, mais pas de D1 par prudence) | oui | **non branchée** : décision d'argent |
| **L · Local** | Kokoro (`hyperframes tts`, `ff_siwis`) ; faster-whisper large-v3-turbo (`presti-ops/transcription/transcrire.py`) ; HyperFrames (rendu, sans IA) ; Blender (sans IA) | — | 0 € | processeur. Le PC dispose de **1,07 Go libres** (19 h 25) ; l'usine, de 9,2 Go disponibles | PC, usine | **oui** (rien ne sort) ; Ollama local et Laya de l'usine (§6) : seulement après le « oui » daté de Benj (026-041) | Kokoro : [licence de la voix `ff_siwis` à confirmer : la base SIWIS a sa propre licence] | en service |
| **M · Design** | Figma (`305cf665…`) | `use_figma`, `get_design_context`… | Starter | **20 appels de lecture par mois** (siège View) ; écriture exemptée | cette session | — | — | en service |
| | Figma Weave (Nano Banana dans Figma) | `weave_find_model` | crédits Weave [à vérifier] | — | Figma | non | [à vérifier] | **refusé** : compte non lié (17 h 16) |
| | Canva (`6883f693…`) | `generate-image`, `create-design` | plan non vérifié | — | cette session | non | selon le plan | branché |
| | Lovable (`ccb20b9d…`) | projet complet à partir d'un brief | crédits non vérifiés | — | cette session | non | — | branché, hors Presti |
| | PromptedSite (`c045a44d…`) | modèles de sites | gratuit seulement (`hasAccess:false`) | — | cette session | — | — | aperçus gratuits |
| | MotionSites (`26de8380…`) | bibliothèque de prompts de sites | recherche gratuite ; `get_prompt` payant | — | cette session | — | — | répond (19 h 24) |
| | claude-design-skillstack + skills | du savoir, chargé dans Claude | réserve A | — | Claude Code | — | — | installé |
| **N · Données** | Apify (`Apify`) | Actors | **5 $/mois offerts** ([[social-skills-plugins]]) | `/v2/users/me/limits` | cette session, skills | pas de D1 vers un Actor non vérifié | — | branché |
| | Firecrawl (ajout du 27/09) | lecture d'une page publique (`lib/agents/lectureFirecrawl.ts`, 026-223) | clé fournie le 26/09 ; borne de 1 000 crédits (026-223) | compteur daté de 026-223 | usine | **jamais** : il ne reçoit **que l'URL publique d'un site d'entreprise**, jamais un nom, un téléphone ni un e-mail (décision 4) ; l'opération `chercher` n'est la voie d'aucun agent | — | branché ; repli : lecteur maison 026-020 |
| | Windsor.ai (`ad6c5421…`) | analytics d'Instagram | **essai** | durée de l'essai | cette session | agrégats seulement | — | branché |
| | AISO (`02d246d9…`) | visibilité de Presti dans les réponses des IA | — | — | cette session | — | — | aucun projet |
| | scrapegraphai (`presti-ops/scraper`, venv) | extraction de pages par un modèle | 0 € | — | PC | — | — | [backend à vérifier] : à brancher sur freellmapi (D0) |
| **O · Non branché** | Vercel AI Gateway (`3ca17fbf…`) | multi-fournisseurs | à l'usage ; crédit mensuel offert [à vérifier] | — | Vercel | — | — | aucun modèle virtuel |
| | HyperFrames / HeyGen hébergé (`08933270…`) | `compose`, `render_video` | **payant** | refusé aux agents CLI le 10/09 [à revérifier] | — | non | — | inutilisé |
| | ChatGPT, AI Studio, application Gemini (interfaces) | images, Nano Banana | inclus / gratuit | — | **à la main seulement** | non | selon l'outil | hors automatisation |

**Ce qui n'est pas une IA mais porte l'IA :** Vercel (Hobby, non commercial ; passer en Pro au premier site vendu), Supabase (horloge `pg_cron`/`pg_net`, `ops.couts`), l'usine Oracle (A1 2 OCPU / 12 Go), TikTok Studio (sons sous licence), Publora.

---

## 2. Le routage par type de travail

### 2.1 Les déclencheurs de bascule (une seule liste pour tous)

| Code | Déclencheur | Ce qui se passe |
|---|---|---|
| **Q** | **Quota épuisé annoncé.** Codex « hit your usage limit … try again at » ; Claude `get_usage` ≥ 100 % ou « usage limit » ; Antigravity `RESOURCE_EXHAUSTED` ou « flux coupé » ; freellmapi 429 après **son** repli interne (toutes les clés du modèle en pause, table `rate_limit_cooldowns`) ; ElevenLabs : estimation supérieure aux crédits restants | Bascule immédiate. L'échéance est notée dans `.orchestre/quotas.json` (026-115), la voie n'est plus essayée avant cette heure, et un événement `ia_bascule` part au bus |
| **R** | **429 ponctuel** (débit à la minute, `Retry-After`) | Un nouvel essai si l'attente est de 60 s ou moins ; sinon, bascule **pour cette tâche seulement** |
| **S** | **Seuil préventif.** Claude semaine ≥ 70 % ; Codex semaine ≥ 85 % ; freellmapi à 90 % du plafond journalier d'un modèle (27/09 : plus de seuil de clé « agents », clé annulée) | Claude : voir le §5. Codex : `gpt-6-luna` seul, les chantiers de **code** partent vers Antigravity (jamais un juge, jamais une donnée de prospect). freellmapi : fournisseur suivant |
| **C** | **Coût du jour.** Une voie atteint son plafond du jour : plafonds par agent de 0098 (tous à 0 € depuis 026-060 : le premier euro met l'agent en pause), plafond que Benj fixe pour l'API Gemini payante (non branchée), crédit offert d'Apify, borne de 1 000 crédits de Firecrawl | Bascule vers le gratuit en D0 ; **attente** en D1 |
| **P** | **Panne.** Erreur 5xx ; délai supérieur à 2 fois l'habituel ou à celui de la fiche ; transcript d'Antigravity immobile depuis 10 min (leçon du 15/09) ; usine injoignable | Bascule, puis retour à la voie principale dès que sa sonde répond |
| **J** | **Trois refus du juge d'affilée** sur la même voie | Monter d'un cran (règle du 15/09, [[benj-executants-d-abord]]) |
| **fin** | **Toutes les voies sont épuisées** | La tâche **reste dans la file** avec une carte « à sec jusqu'au … ». Jamais d'IA hors registre. Jamais Claude pour du volume |

**Règle des données, sans exception** (réécrite le 27/09 ; le 25/09 elle disait « D1 → réserves B, C ou L », et Codex « jamais en automatique ») :
- **D1 → Codex (réserve D) ou local (réserve L), rien d'autre.** Codex la reçoit en automatique depuis G3 (fait le 25/09), par le lanceur `presti-ia-modele` de l'usine (026-043, 026-129). Le local, c'est Ollama et Laya sur l'usine, après le « oui » daté de Benj (026-041).
- **D1 n'y va jamais :** la clé « agents » (C, annulée : aucun agent ne l'utilise), Claude (A : les contrôles de Claude Code se font sur des données fictives), freellmapi, Ollama Cloud (`:cloud`), Groq (refusé), Antigravity, Gemini CLI, Qwen, Perplexity, ElevenLabs, Canva, Lovable, Weave, OpenClaw. Firecrawl ne reçoit que l'URL publique d'un site d'entreprise (décision 4).
- **La clé « produit » (B)** reste celle des cerveaux du produit (`lib/ai.ts`, les clients des artisans) : jamais un agent, jamais un prospect de Presti.
- **Pas de passage au gratuit sous D1** : sans Codex ni local, une tâche D1 **attend**. C'est la consigne de Benj du 24/09 au soir : « jamais de donnée personnelle de prospect vers une offre gratuite » ([[ecosysteme-presti]]).

**Règle de licence (L) :** ce qui est **publié ou vendu** ne sort que d'une voie qui en donne le droit :
- **autorisé :** captures réelles, textes de Claude et de Codex, Kokoro (licence de la voix à confirmer), FLUX.1 [schnell] (Apache-2.0), sorties de l'API Gemini ;
- **exclu :** ElevenLabs en gratuit, et tout modèle « non commercial » (par exemple FLUX.2 [dev] [licence à relire]).

### 2.2 Le tableau

| Type de travail | Données | Voie principale | Bascule 1 | Bascule 2 | Bascule 3 | Déclencheurs | Source, remarque |
|---|---|---|---|---|---|---|---|
| **Code et fiches** : code | D0 | Codex `gpt-6-sol` sur l'usine (`usine.mjs lancer`, 2 au plus) | Antigravity : Gemini 3.8 Flash (High), puis `pro` (`antigravity.mjs lancer ag-N`) | Gemini CLI ou Qwen Code (`executant.mjs --moteur=`), après G5 et G6 | sous-agent Claude **Sonnet** (exception du 15/09 : exécutants bloqués, sans surcoût) | Q, P, J | Codex sur le PC n'est **pas** une bascule sur Q (même réserve D) ; il ne remplace l'usine qu'en cas de panne (P) |
| Code et fiches : fiches | D0 | Découpage, juges et critères « C'est fini quand » : Claude **Opus**. Corps de la fiche (contexte, chemins, lecture du code) : Codex `gpt-6-sol` | Claude **Sonnet** pour le corps | Antigravity `pro` | attente | Q, S | Fiches argent, sécurité ou cerveaux : Opus seulement (`CLAUDE.md:30`) ; `orchestre valider` reste mécanique |
| **Juges et relectures** | D0 | Écrire un juge : Claude **Opus**. Exécuter un juge : du code, sans IA, sur l'usine. Regarder une capture ou une vidéo livrée : **Opus** | Claude **Sonnet** (juges simples, mutations) | **attente** (27/09 : un juge ne se délègue pas ; le 25/09, Opus 4.6 dans Antigravity puis Codex `gpt-6-astra` en contre-juge, retirés : les juges seulement par Claude, jamais Gemini ni Antigravity) | — | Q, S, P | [[juge-capture-lui-meme]] : le vérificateur capture lui-même |
| Contrôles des envois (second juge, rejugement du soir ; J1 et J3 sont du code) | **D1** | Codex `gpt-6-luna` sur l'usine (`creerLecteur('facteur')`, `presti-ia-modele`) | rejugement du soir : Codex `gpt-6-sol` (`MODELE_REJUGE`, même réserve D) ; Laya `noul` en troisième avis local | **attente** : l'envoi ne part pas sans ses verdicts | — | R, Q, P | 026-041, 026-043, 026-065, 026-089. Le 25/09 : clé « agents » `claude-haiku-4-5` (annulée). Ce n'est pas un juge de fiche : il lit des données de prospect, donc Codex (décision 5) |
| **Réflexion et décisions** | D0 (une décision qui touche un prospect se prend sur des comptes et des faits, sans sa donnée) | Claude Code **Opus** (session principale) | Codex `gpt-6-astra` (contre-expertise écrite) | Claude Opus 4.6 dans Antigravity (D0 seulement, jamais un verdict) | attente, ou carte à Benj | Q, S | Jamais une IA gratuite pour décider |
| Chef de l'usine (cycles, réunion de 18 h) | D0 (`ops_etat()` : chiffres rassemblés sans modèle, sans clé `prospects` ni adresse, 026-013 critère m) | Codex `gpt-6-sol` sous `chef-modele` | `gpt-6-luna` | Codex sur **Ollama Cloud** `gpt-oss:120b-cloud`, entrée = `ops_etat()` **seul** (ni consignes de Benj ni événements : ils attendent le prochain cycle Codex, le curseur n'avance pas) ; une entrée qui porte la clé `prospects`, une adresse ou un numéro fait sauter ce secours | cycle sauté, avec un événement « chef à sec » | Q, P | 026-102 (CH-C2), 026-129, 026-148 ; même réserve D que les exécutants. Décision 3 du 27/09 (le 25/09 : « jamais du gratuit ») |
| **Recherche web et veille** | D0 | Recherche profonde, ponctuelle : **Perplexity Computer** (routage v16, `CLAUDE.md:30` ; `Orchestre.md:34`), si son plan et son coût sont connus | Pages récupérées par du code (lecteur 026-020, Playwright, scrapegraphai ; Firecrawl `lire` sur l'**URL publique d'un site d'entreprise**, 026-223), puis résumées par Gemma 4 ou Gemini Flash via freellmapi, ou Ollama local | WebSearch/WebFetch de Claude Code (réserve A), en dernier | attente | Q, C, S | La **veille récurrente** (C12, labo des accroches) passe par du code et freellmapi, **jamais** par Perplexity en boucle (crédits). Le 25/09, Groq `compound` était la bascule 1 : retiré (refusé par Benj) |
| **Lecture de vidéos à l'image** | D0 | Images-clés extraites par ffmpeg sur l'usine, décrites par Gemini 3.7 ou 3.6 Flash via freellmapi (vision [à vérifier : `models.supports_vision`], 1 M de contexte) | Antigravity Flash (lit les images du dossier) | sous-agent Claude **Sonnet** sur les images-clés | — | Q, R | Le **verdict** « conforme à la référence » reste à **Opus** (règle de conformité du 25/09, [[benj-reverifier-decisions-et-videos]]) |
| **Transcription** | D0 ; D1 pour la voix d'un prospect | faster-whisper large-v3-turbo **sur l'usine** (à y déplacer : IA08) | Cloudflare `whisper-large-v3-turbo` via freellmapi (branché le 25/09), D0 seulement | faster-whisper `base` sur le PC | ElevenLabs (crédits, interne), D0 seulement | P, Q | D1 : **local seulement** (usine ou PC). Le 25/09, Groq Whisper était la bascule 1 : retiré (refusé par Benj) |
| **Rédaction des messages aux prospects** (Plume) | **D1** | **aucun modèle** : la Plume remplit des modèles approuvés (026-083, 026-087) | — | **attente** : le Facteur ne part pas | — | — | 026-094 ; aucune voie gratuite, jamais. Le 25/09 : clé « agents » `claude-haiku-4-5` (annulée) |
| **Classement des réponses** (Standard ; le Répondeur n'a pas de modèle, il choisit un modèle approuvé selon la classe) | **D1** | le code d'abord (STOP, RGPD, accusé automatique), puis Codex `gpt-6-luna` sur l'usine (`creerLecteur('standardiste')`) | Laya `score` en tri local, après le « oui » de Benj | lecteur nul ou 30 min sans classe : **tout ce qui n'est pas un refus devient « à lire »** (026-094), Benj tranche en 7 choix | — | R, Q, P | Le STOP est repéré par du code **avant** tout modèle (`Ecosysteme-Prospection-Gratuite-2026-09-24.md:188`). Le 25/09 : clé « agents » (annulée) |
| Répondeur **du produit** (clients des artisans) | **D1** | clé « produit », palier de l'artisan (`lib/models.ts`) | palier inférieur, même clé (**à écrire** : IA07) | message « réessaie » (l'existant) | — | R, P | Cerveau, donc réservé à Claude Code |
| **Qualification** | **D1** | Règles déterministes d'abord (le modèle d'`analyzeLead`, `lib/ai.ts`), puis Laya `score` (local, après le « oui » de Benj) | Codex `gpt-6-luna` sur l'usine | règles seules, puis « à lire » | — | R, Q, P | Aucun agent porteur désigné (organigramme §7.1). Le 25/09 : clé « agents » Haiku (annulée) |
| **Résumé et tri de masse** | D0 | freellmapi : **Gemma 4 31B** (1 000/j), puis Mistral `ministral-14b` (2/min, sans plafond journalier) | Ollama local `qwen3` (§6) | Codex `gpt-6-luna` sur l'usine (réserve D : à éviter si la semaine dépasse 85 %) | sous-agent Claude **Haiku** (réserve A) | Q, R, S | En D1 (tri des réponses) : Codex `gpt-6-luna` ou local, jamais freellmapi (le 25/09 : clé « agents » Haiku). Antigravity `flash_lite` retiré des bascules : dormant |
| **Traduction** | D0 | freellmapi : Mistral `ministral-14b` | Gemini 3.x Flash via freellmapi | Codex `gpt-6-luna` | Claude **Haiku** | Q, R | D1 : Codex ou local (le 25/09 : clé « agents ») |
| **Visuels de contenu** (images) | D0, règle L | **Captures réelles** du produit (Playwright) + HyperFrames : 0 €, sans IA (C06 du doc marketing ; [[presti-feature-showcase-rule]]) | **FLUX.1 [schnell]** via Cloudflare Workers AI, dans freellmapi (Apache-2.0, « 10 k neurones/jour » partagés), après G2 | **Nano Banana 2 Lite** par l'API Gemini payante (0,0336 $/image, par lots 0,0168 $), avec plafond du jour : **décision d'argent** | Canva `generate-image` (plan à vérifier) | Q, C | **Nano Banana Pro via ElevenLabs gratuit** : brouillons et planches **internes** seulement. Perplexity : modèle d'image [à vérifier]. AI Studio : à la main. Un Nano Banana **gratuit et publiable en automatique n'existe pas aujourd'hui** |
| **Vidéos UGC** (Studio pubs) | D0 (le produit de l'annonceur), règle L | **Pub locale** : HyperFrames + Kokoro `ff_siwis` + images licenciées, 0 € (026-126, 026-156) | **Studio IA** : ElevenLabs Creative (Nano Banana Pro, puis Veo 3.1, Kling 3 ou Gemini Omni), toujours `estimate_only` d'abord. Un livrable **vendu** exige une offre payante (026-156) | Veo 3.1 Lite par l'API Gemini payante (0,08 $/s en 1080p) | LTX-Video par Hugging Face (0,10 $/mois de crédits : pour essayer seulement) ; rendu HeyGen (payant) | Q, C | Alexya en dernier repli seulement (9 à 99 $/mois), [[ecosysteme-presti]] |
| **Voix** | D0, règle L | **Kokoro** `ff_siwis` (`hyperframes tts`, local) | **Gemini TTS** via freellmapi : clé Google **déjà posée**, plus de 30 voix, quota à mesurer | MeloTTS (Cloudflare, multilingue), après G2 | ElevenLabs : interne en gratuit, commercial seulement en payant | Q, P | Mention IA pour toute voix de synthèse (C05) ; clé de cache = le texte ([[voix-cache-par-texte]]) |
| **Montage** | D0 | HyperFrames CLI (local ou usine, 0 €, sans IA) ; **CapCut** pour le clipping ([[clipforge-regles-permanentes]]) ; ffmpeg | Écriture de la composition : Antigravity (026-153, 026-158) | Codex | `compose` et `render_video` de HeyGen (payants, avec l'accord de Benj) | P, Q | [[hyperframes-en-local]] |
| **Design de site** | D0 | **Squelette maison** : `public/sites-demo/generer.mjs` + `_kit/` (déterministe, 0 €), DA par métier (`da.json`) ; jugement de Claude **Opus** | Inspiration : MotionSites `search_prompts` (gratuit), PromptedSite (gratuits), skillstack | Code : Codex, puis Antigravity | Figma : 20 lectures par mois, écriture exemptée à éprouver (026-170) ; Lovable hors Presti | Q | **Ni Nano Banana ni Perplexity sur un site** : « rien d'inventé » (`lib/siteCommande.ts:21`, doc Sites-Kit). Kit Figma : doc Sites-Kit, 026-167 à 026-171 |
| **Maquettes** (Atelier) | **D1** (nom et coordonnées de l'artisan) | `generer.mjs --maquette` (sans IA) + rédacteur `creerLecteur('redacteur_site')`, Codex `gpt-6-sol` sur l'usine (026-043, 026-093) | — (aucune autre voie D1 ; le local après le « oui » de Benj) | `--sans-ia` : texte du gabarit métier (026-093) | — | R, Q, P | Photos : celles de l'artisan, ou une banque créditée ; jamais un visage généré. Le 25/09 : clé « agents », puis Sonnet (annulés) |
| **Données et scraping autorisé** | D0/D1 | Du **code** sur l'usine : Playwright, scrapegraphai, lecteur 026-020, données ouvertes RGE, API Meta `ads_archive` (jeton) | Firecrawl `lire` (026-223) : **l'URL publique d'un site d'entreprise, rien d'autre** ; repli : lecteur 026-020 | Apify (5 $/mois offerts ; aucun D1 vers un Actor non vérifié) ; Windsor (essai) | Extraction par IA : freellmapi en D0 ; en nominatif (R4), Codex ou local seulement | C, P | Les CGU de chaque source s'appliquent ; aucun contournement (Prospection-Gratuite l.189). Le 25/09 : extraction nominative par la clé « agents » (annulée) |

**Capacité gratuite déclarée**, une fois G1 fait, sans Groq ni Cloudflare :
- 5 modèles Gemini Flash (3.7, 3.6, 3.5, 3.5-lite, 3-preview) × 20 requêtes = 100 req/jour ;
- 2 modèles Gemma 4 × 1 000 = 2 000 req/jour ;
- Mistral : 2 req/min, soit jusqu'à environ 2 880 req/jour.

G2 se réduit à Cloudflare (branché le 25/09 ; Groq refusé par Benj) : on ajoute sa réserve de textes, d'images et de voix, mais pas les environ 4 000 req/jour que Groq aurait apportées. Le relais illimité est Ollama local (§6), D0 tant que Benj n'a pas dit « oui ». **Ces chiffres sont déclarés par le catalogue** : à confirmer par la première semaine de relevés (§3).

---

## 3. Les jauges de la salle des machines

Elles s'accrochent à ce que la série a déjà prévu, sans le dupliquer :
- `GET /api/controle/jauges` (026-064), seule source des jauges ;
- `Machines.tsx` (026-120, SA-17) ;
- la barre du haut (026-070 : « QUOTA CLAUDE 5 H · SEMAINE », « QUOTA CODEX 5 H »), où 026-092 renvoie pour l'instant `null` avec « jauges de quota non branchées » ;
- `ops.couts` étendu au modèle et aux jetons (C15 du doc marketing).

Les règles d'affichage de 026-070 tiennent :
- une source absente affiche « non mesuré », **jamais « 0 % »** ;
- au-delà de 0,75 : alerte ; plein : pastille `crit` ;
- les voies gratuites affichent « 0 € » (C15).

### 3.1 Une jauge par réserve : d'où vient le chiffre (sources éprouvées aujourd'hui)

| Jauge | Réserve | Source réelle | Lu le 25/09 | Fréquence | « Reste du jour » |
|---|---|---|---|---|---|
| Claude 5 h, semaine, par modèle | A | outil `get_usage` de l'application Claude (plan, fenêtres, % et remise à zéro). À défaut, `node scripts/orchestre.mjs budget --tous` (jetons lus et produits, d'après les transcripts) | 12 % / 62 % ; « Fable » 0 % ; dépassement payant coupé | à chaque bloc de Claude Code, écrit dans `quotas.json` | 100 − % de la fenêtre, et l'heure de remise à zéro |
| Codex 5 h, semaine | D | `rate_limits` du dernier `~/.codex/sessions/**/rollout-*.jsonl` (`primary` 300 min, `secondary` 10 080 min, `resets_at`, `credits`) ; `total_token_usage` par tâche | 0 % / 56 % ; remise à zéro lun. 23 h 43 ; crédits 0 | battement de l'usine + fin de chaque tâche | idem. **Une seule jauge** pour le PC, l'usine et le chef |
| Antigravity, par modèle | E | `antigravity.mjs sonde --model=<m>` (10 s) ; `ERROR_MESSAGE` des transcripts | non mesuré (IDE fermé ; dernier lancement le 16/09) | toutes les 30 min, IDE ouvert seulement | « ok » ou « à sec jusqu'à … » ; sinon « non mesuré » |
| freellmapi, par fournisseur et par modèle | F | base `freeapi.db` en **lecture seule**, par `docker compose exec` sur l'usine (tables `requests`, dont `caller` et `client_agent`, `rate_limit_usage`, `rate_limit_cooldowns`, `provider_quota_state`, `key_monthly_usage`, `models.rpd_limit`). **Aucune clé n'est nécessaire** pour ce relevé | 0 requête ; 3 clés saines ; plafonds non observés | battement de l'usine (5 min) | `rpd_limit` − requêtes du jour ; une pause active = une bascule en cours |
| ~~Clé « agents »~~ | C | **supprimée le 27/09** : clé annulée le 25/09, plus de jauge `cle_agents` (026-064) ; les appels des agents s'inscrivent à 0 € dans `ops.couts` avec leur moteur (026-043) | — | — | — |
| Clé « produit » | B | [à vérifier : `lib/ai.ts` n'inscrit pas son coût] ; console Anthropic à la main | non mesuré | — | « non mesuré » tant qu'IA07 n'inscrit rien |
| ElevenLabs | J | aucune lecture sans clé d'API ; `estimate_only` avant chaque génération | non mesuré | à chaque génération | crédits estimés restants, ou « non mesuré » |
| API Gemini payante | K | coût calculé par le routeur × prix de la page officielle | 0 (non branchée) | à chaque appel | plafond du jour − dépensé |
| Perplexity | I | [à vérifier : pas d'API de solde connue] | non mesuré | — | « non mesuré » |
| Apify | N | `https://api.apify.com/v2/users/me/limits` (ressource du connecteur) | non lu | 1 fois par jour | 5 $ − le mois |
| Windsor, Publora, Meta, Instagram, formulaires | — | déjà dans 026-064 | — | — | — |
| Local | L | charge de l'usine (battement `usine`, 026-053) ; mémoire libre du PC (`Win32_OperatingSystem`) | usine : 9,2 Go disponibles ; PC : 1,07 Go libre | 5 min | — |

### 3.2 Par agent et par IA (le tableau central de la salle)

- Une ligne par (agent, IA, modèle) pour le jour. Colonnes : jetons d'entrée, jetons de sortie, requêtes, euros (0 € affiché pour le gratuit), part du quota de la réserve, dernière bascule.
- **Source :** `ops.couts` gagne `modele`, `jetons_entree` et `jetons_sortie` (C15). Le routeur (IA03) y inscrit **chaque** appel, gratuit compris. Le relevé de l'usine (IA04) rapproche les `requests` de freellmapi par `client_agent` : chaque agent se nomme dans son en-tête `User-Agent: presti-agent/<nom>`.
- **Bascules survenues :** l'événement `ia_bascule` (`{agent, travail, de, vers, cause: Q|R|S|C|P|J, echeance}`) va dans le bus ; les 10 dernières sont listées, et la barre compte celles du jour.

### 3.3 Dans la barre du haut (retouche de 026-070)

Les compteurs, dans cet ordre :
- **QUOTA CLAUDE 5 H · SEMAINE** (existant, désormais sourcé) ;
- **QUOTA CODEX 5 H · SEMAINE** (on ajoute la semaine : c'est elle qui a bloqué 4 jours le 17/09) ;
- **IA GRATUITES** : requêtes du jour sur la capacité déclarée ;
- **COÛT IA DU JOUR** : clés B et K, en euros (C annulée le 25/09) ;
- **BASCULES** : nombre du jour, rouge si une réserve est à sec.

---

## 4. Ce qui manque aujourd'hui pour que ce soit vrai

### 4.1 Les gestes de Benj : le moins possible, groupés en une séance d'environ 20 min

| # | Geste | Pourquoi aucun agent ne peut le faire | Ce qu'il débloque |
|---|---|---|---|
| **G1** | Ouvrir le tableau de bord de freellmapi par le tunnel : `ssh -i ~/.ssh/presti-usine -N -L 3001:127.0.0.1:3001 usine@88.96.53.3`, puis http://localhost:3001. **Copier la clé unifiée** dans `presti-secrets/freellmapi.txt`. Claude Code la pose ensuite dans le coffre de l'usine (`~/.config/presti/agents.env`). Jamais dans une conversation. | c'est un secret, et la matérialisation d'identifiants est refusée aux agents | toute la réserve F : résumé, tri, traduction, veille, vision, Gemini TTS |
| **G2** *(27/09 : réduit à Cloudflare, branché le 25/09 ; Groq refusé par Benj, aucune clé Groq)* | Dans le **même** tableau, créer deux comptes gratuits et coller leurs clés : **Groq** (console.groq.com) et **Cloudflare Workers AI** (identifiant de compte + jeton « Workers AI »). OpenRouter, si Benj le veut. Laisser ou retirer Cerebras : elle n'a aucun modèle | créer un compte est un geste humain | Groq : gpt-oss-120b, `compound`, Whisper. Cloudflare : FLUX.1 schnell, MeloTTS, Whisper. C'est la seule voie **image** gratuite et publiable |
| **G3** | **Deux interrupteurs de confidentialité.** ChatGPT › Paramètres › Contrôle des données › « Améliorer le modèle pour tout le monde » : **coupé**. claude.ai › Paramètres › Confidentialité › « Aider à améliorer Claude » : **coupé** [libellés exacts à vérifier à l'écran] | réglages de compte | *(fait le 25/09)* le droit de faire passer du D1 par Codex, en automatique sur l'usine (27/09). Claude Code, lui, ne reçoit toujours pas de D1 (données fictives) |
| **G4** *(annulé le 25/09 : aucun achat ; ne rien créer)* | **R16, déjà décidée** : créer l'espace de travail Anthropic « agents », plafonné à 30 $/mois (alertes à 50 et 80 %), et sa clé dans `presti-secrets`. Claude Code la pose dans `ANTHROPIC_AGENTS_KEY` | argent et secret | (25/09) Plume, Répondeur, qualification, juges des envois, rédacteur des maquettes. Depuis le 27/09, toute cette voie D1 passe par Codex ou le local |
| G5 *(facultatif)* | Une **seconde** clé AI Studio, dans un **autre** projet Google, dans `presti-secrets`. Claude Code posera `GEMINI_API_KEY` | secret | Gemini CLI comme exécutant, avec une réserve distincte de la clé Google de freellmapi |
| G6 *(facultatif)* | `npx @qwen-code/qwen-code` → `/auth` → « Qwen OAuth », une fois, dans un terminal | connexion à un compte | un exécutant de plus (réserve H) |

**Ce qui n'est pas demandé**, et pourquoi :
- **Lier Figma à Weave** : Nano Banana passe déjà par ElevenLabs, et un site n'utilise pas d'image générée.
- **Payer l'API Gemini ou ElevenLabs** : c'est une **décision d'argent** à prendre au premier pack vendu, pas un manque d'aujourd'hui.
- **Ouvrir le dépassement payant de Claude** : il reste coupé.

### 4.2 Fiches à créer (ids provisoires `026-nouv-ia-01` à `-09`)

Elles se rangent en fin de série, comme la voie gratuite du 25/09 et les C01 à C16 du doc marketing, et sans collision avec 026-167 à 026-171 du doc Sites-Kit. Les règles des vagues tiennent : au plus 1 fiche Claude Code, 1 exécutant sur le PC et 2 fiches Codex sur l'usine à la fois.

| Id provisoire | Objet | Exécutant | Juge (`verifier`) | Dépend de |
|---|---|---|---|---|
| **IA01** | Juges du registre, du routeur et des relevés : `scripts/ia-routeur-qa.mjs` + `juges-026-ia-preuve.mjs`, avec de faux fournisseurs (429 et `Retry-After`, « hit your usage limit … try again at », `RESOURCE_EXHAUSTED`, 5xx, délai). Ce que les juges vérifient : chacun des 18 types a au moins 2 bascules sur des **réserves distinctes** ; **aucune** voie gratuite n'accepte du D1 (lu dans le registre) ; aucune clé n'est lue hors de `lib/agents/llm.ts` ; chaque bascule émet `ia_bascule` ; « non mesuré » n'apparaît jamais comme « 0 % » | claude-code | elle-même (`--preuve-echecs`) | 026-001 |
| **IA02** | `lib/ia/registre.ts` (données pures : réserves, modèles, classes de données permises, droit commercial, quotas déclarés, prix datés) + `docs/agents/registre-ia.md` généré depuis lui. **Le §1 de ce document en est la source** | codex (usine) | `ia-routeur-qa --partie=registre` (IA01) | IA01 |
| **IA03** | `lib/ia/routeur.ts` : `choisirVoie(travail, classe, etat)` pur, et `appelerAvecBascule()`, qui applique Q, R, S, C, P et J, inscrit jetons et coûts dans `ops.couts` et émet `ia_bascule`. La voie D1 (Codex, local) passe **par** `creerLecteur` (026-043) ; la réserve C est annulée (27/09 : le routeur ne la connaît pas). freellmapi est appelé par fetch compatible OpenAI, sur l'usine seulement, avec la clé du coffre. N'importe **jamais** `@/lib/ai` | codex (usine) | `ia-routeur-qa --partie=routeur` (IA01) | IA02, 026-040, 026-043, C15 |
| **IA04** | Relevé des IA sur l'usine, `scripts/usine/releve-ia.mjs` : la base de freellmapi en lecture seule (sans clé ; colonnes de compteurs seulement, jamais `encrypted_key` ni `settings.unified_api_key`) et les `rate_limits` des journaux de session de Codex (`usine` et `chef-modele`). Envoi au bus `ia_releve` à chaque battement. **Absorbe la partie « relevé de freellmapi » de C15** | codex (usine) | `ia-routeur-qa --partie=releve-usine` (IA01) | IA01, 026-053, C15 |
| **IA05** | Relevé du PC et réaiguillage multi-moteurs, extension de 026-115 : `quotas.json` gagne `claude` (écrit par Claude Code depuis `get_usage`), `antigravity:<modèle>` (sonde), `gemini`, `qwen` et `freellmapi:<fournisseur>`. Nouvelle commande `orchestre quotas`. Le bloc Attention propose l'exécutant suivant **selon le registre**. Le pont (026-160) pousse `quotas.json` au bus | codex | `../orchestre/test/preuve-026.mjs --groupe=quota` (026-098, étendu par Claude Code avant la fiche) | 026-115, 026-160, IA02 |
| **IA06** | Jauges IA : retouche de 026-064 (jauges `claude_5h`, `claude_semaine`, `codex_5h`, `codex_semaine`, `antigravity:<m>`, `freellmapi:<fournisseur>`, `gemini_payant_jour`, `elevenlabs_credits`, `cle_produit`) + panneau `Machines.tsx` (026-120) + barre (026-070) | codex (usine), antigravity pour le panneau | `jauges-qa` (026-062) et `pilotage-ecran-qa --partie=salles` (026-104), étendus avant | IA04, IA05, 026-064, 026-120 |
| **IA07** | Repli de modèle du produit : dans `lib/ai.ts`, sur 429 ou 529, Opus 5 → Sonnet 5 → Haiku 4.5, même clé, avec inscription du coût (jauge `cle_produit`) | **claude-code** (cerveau) | `node scripts/ai-eval.mjs` (non-régression) + un critère de faux 429 | — |
| **IA08** | Transcription sur l'usine : faster-whisper large-v3-turbo en venv sur l'usine, appelé par `usine.mjs executer` ; cela retire le plus lourd du PC | codex (usine) | `ia-routeur-qa --partie=transcription` (IA01) | IA01 |
| **IA09** | Mutations des juges IA | codex | `juges-026-mutations-preuve.mjs --script=scripts/juges-026-ia-mutations.mjs` (026-001) | IA01 à IA08 |

### 4.3 Fiches existantes à retoucher (par Claude Code, dans les brouillons, avant l'assemblage)

- **026-043** : *(27/09 : sans objet, la fiche est réécrite sur Codex et le local ; la bascule du rejugement est `MODELE_REJUGE` = `gpt-6-sol`)* écrire la bascule R (Haiku → `MODELE_REJUGE` ou Sonnet sur la même clé, par modèle) et rappeler que le routeur (IA03) ne lit jamais la clé.
- **026-064** : la liste fermée des jauges s'élargit aux IA (IA06).
- **026-070** : les compteurs de la barre (§3.3).
- **026-092** : les quotas ne sont plus `null` une fois IA04 et IA05 passées ; `manque` reste le repli.
- **026-102 et 026-129** : le chef bascule de `gpt-6-sol` à `gpt-6-luna`, puis (27/09, décision 3) sur Codex + Ollama Cloud `gpt-oss:120b-cloud` avec `ops_etat()` pour seule entrée, puis saute son cycle avec un événement. Jamais Claude. Le seul gratuit permis est ce secours, parce que son entrée ne porte aucune donnée de prospect ; la file IA des agents ne le suit jamais. 026-102 est faite : le cas nouveau se juge par l'extension de `chef-qa.mjs` que Claude Code écrit avant 026-129 (voir sa section du 27/09) ; 026-148 pose le fournisseur Ollama du compte `chef-modele`.
- **026-165, 026-215 et 026-228** (27/09) : Firecrawl ne reçoit que l'URL publique d'un site d'entreprise (décision 4).
- **026-115** : devient la base d'IA05. Aujourd'hui, elle ne connaît que « Codex à sec → Antigravity ».
- **026-120** : `Machines.tsx` affiche le tableau agent × IA et les bascules (§3.2).
- **C12 et C15** (doc marketing) : C12 « classé par une IA gratuite » passe par le routeur, en D0 ; C15 garde `ops.couts`, et son relevé de freellmapi passe à IA04.
- **026-156 et 026-157** : déjà justes (Kokoro par défaut). Il reste une ligne : « licence de la voix `ff_siwis` lue par Claude Code » dans les gestes de 026-155.

### 4.4 Hors fiches : Claude Code, dans la session principale, sans Benj

- Mettre à jour `presti/CLAUDE.md` §8 (routage v16) avec la règle du §5 et le renvoi à ce registre.
- Mettre à jour la mémoire [[ecosysteme-presti]] :
  - les 3 clés sont Google, Mistral et Cerebras, pas Groq ;
  - aucune offre gratuite pour Nano Banana ;
  - une seule réserve ChatGPT.
- Relever `get_usage` en tête de chaque bloc tant qu'IA05 n'existe pas.
- **Ne jamais relancer** les 3 lectures de la base de freellmapi faites ici hors d'IA04 : elles ont été faites à la main pour ce document, par un script supprimé aussitôt de l'usine et du conteneur.

---

## 5. La règle pour Claude Code lui-même : que l'abonnement ne soit plus le goulot

**Constat du 25/09 à 19 h 28 :**
- 62 % de la semaine sont consommés, avec une remise à zéro dimanche à 07 h 59.
- Au rythme moyen de la semaine (environ 11 %/jour, déduit : 62 % en 5,5 jours), on arriverait vers 79 % dimanche matin, donc sans coupure si le rythme tient.
- Ce document lui-même a été écrit par un sous-agent **Opus 5.5** pour un travail d'inventaire. C'est exactement ce qui doit changer.

| Travail | Qui | Modèle |
|---|---|---|
| Décisions, arbitrages, conformité aux décisions de Benj, contre-expertise finale | Claude Code, session principale | **Opus** |
| Écrire un juge ; verdicts d'argent, de sécurité et de cerveaux ; regarder une image ou une vidéo livrée | Claude Code ou sous-agent | **Opus** |
| Rédiger le corps d'une fiche, compiler un document, un inventaire, synthétiser une recherche, relire un diff mécanique | Codex `gpt-6-sol`, sinon sous-agent | **Sonnet** (jamais Opus) |
| Explorer, chercher (grep), lister, résumer des fichiers | sous-agent (règle v16, `CLAUDE.md:30`), ou freellmapi si c'est scriptable et en D0 | **Haiku** |
| Produire du code, des pages, des variantes, des boucles de contrôle qualité | Codex sur l'usine, puis Antigravity, puis Gemini CLI / Qwen | — (jamais Claude, sauf l'exception du 15/09) |
| Masse : tri, résumés, traduction, veille | freellmapi, puis Codex `gpt-6-luna` | — |
| Recherche web | Perplexity (plan et coût connus), puis pages lues par du code (lecteur 026-020, Firecrawl sur l'URL publique d'un site d'entreprise) ; WebSearch en dernier (27/09 : Groq `compound` retiré) | — |
| Gestes publics dans Chrome | Claude in Chrome (réserve A), ponctuels ; les captures répétées passent par Playwright sur l'usine | — |

**Les workflows** passent le modèle **par agent** :
- `opus` seulement pour les rôles « juge », « conformité » et « contre-expertise » ;
- `sonnet` pour la conception et la compilation ;
- `haiku` pour les inventaires et les lectures.

Un workflow qui lance plus de 3 agents Opus doit le justifier dans son en-tête.

**Seuils de la semaine Claude** (lus par `get_usage`, écrits dans `quotas.json`) :

| Semaine Claude | Ce qui change |
|---|---|
| < 70 % | la table ci-dessus |
| ≥ 70 % | les workflows passent en Sonnet et Haiku seulement ; Opus reste à la session principale |
| ≥ 85 % | Opus ne sert plus qu'aux verdicts et aux décisions d'argent ou de sécurité ; tout le reste part chez Codex ou freellmapi |
| ≥ 95 % | Claude Code ne lance plus rien ; les tâches attendent dans la file ; Codex et Antigravity continuent sur le code. **Aucun juge de secours** : les verdicts attendent la remise à zéro de Claude (27/09 ; le 25/09, Claude Opus 4.6 dans Antigravity, retiré : jamais Gemini ni Antigravity pour un juge) |
| fenêtre 5 h ≥ 90 % | fin du bloc, `/compact`, reprise à la remise à zéro |

**Deux points à éclaircir, sans les utiliser d'ici là :**
- Le compteur hebdomadaire « **Fable** » (0 %) est une réserve Claude distincte. Avant d'en faire une bascule, il faut savoir quel modèle il couvre : skill `claude-api`.
- Le **dépassement payant** reste coupé : c'est une décision d'argent.

---

## Gestes de Benj (récapitulatif)

1. **G1 (5 min)** : tunnel vers freellmapi, puis copier la **clé unifiée** dans `presti-secrets/freellmapi.txt` (Claude Code la pose sur l'usine).
2. **G2 (10 min, même tableau)** : comptes gratuits **Groq** et **Cloudflare Workers AI**, avec leurs clés collées dans freellmapi (OpenRouter en option ; Cerebras inutile). *27/09 : Cloudflare seul, fait le 25/09 ; Groq refusé.*
3. **G3 (2 min)** : couper « Améliorer le modèle pour tout le monde » (ChatGPT) et « Aider à améliorer Claude » (claude.ai). *Fait le 25/09.*
4. ~~**G4 (5 min, R16 déjà décidée)** : espace Anthropic « agents » plafonné à 30 $/mois, clé dans `presti-secrets`.~~ *Annulé le 25/09 (aucun achat) : ne rien créer.*
4 bis. *(27/09)* **Le « oui » daté de Benj** pour qu'Ollama local et Laya reçoivent des données de prospect (026-041). D'ici là, Codex est la seule voie D1.
5. *Facultatif* : **G5**, seconde clé AI Studio (autre projet Google) pour Gemini CLI ; **G6**, `/auth` Qwen OAuth une fois.
6. *Décisions d'argent, plus tard, au premier pack vendu* : API Gemini payante (Nano Banana 2 Lite à 0,0336 $/image, Veo) ou ElevenLabs payant pour le droit commercial.

## Sources

- **Mémoire :** [[ecosysteme-presti]], [[usine-oracle]], [[codex-executant]], [[presti-ai-architecture]], [[presti-orchestre-antigravity]], [[clipforge-regles-permanentes]], [[motionsites-connecteur-marche]], [[benj-executants-d-abord]], [[benj-reverifier-decisions-et-videos]], [[social-skills-plugins]], [[hyperframes-en-local]].
- **Dépôt presti (HEAD `7d68786`) :** `lib/models.ts:6-10`, `lib/ai.ts`, `scripts/executant.mjs:1-38`, `scripts/usine.mjs:58`, `.orchestre/agents.jsonl`, `CLAUDE.md:30`, `.orchestre/brouillons-ecosysteme/026/` (INDEX, 026-043, 026-064, 026-070, 026-092, 026-102, 026-115, 026-120, 026-126, 026-156).
- **Coffre (vault) :** `SaaS/Produit/Orchestre.md:34`, `Antigravity.md`, `Ecosysteme-Rectification-2026-09-24.md` (l. 786, 865), `Ecosysteme-Prospection-Gratuite-2026-09-24.md` (l. 60, 109, 188-189), `Ecosysteme-Recherche-Pubs-2026-09-24.md:187`, `Ecosysteme-Marketing-Reel-2026-09-25.md` §3.7 (C12, C15), `Ecosysteme-Sites-Kit-2026-09-25.md`.
- **Usine (lecture seule, 19 h 20-19 h 27) :** `docker compose ps` (`freellmapi-freellmapi-1` en service depuis 22 h, sain), `/api/ping`, `freeapi.db` (noms de tables, fournisseurs, compteurs, catalogue), dernier `rollout-*.jsonl` de Codex (`rate_limits`, `total_token_usage`), `free -m`, `df -h`.
- **Pages officielles :** https://ai.google.dev/gemini-api/docs/pricing ; https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/.
- **Connecteurs lus gratuitement :** `get_usage`, `whoami` (Figma), `search_prompts` (MotionSites), `projects_list` (Perplexity).

## 6. Ajouts de la nuit du 26/09/2026

- **Ollama, l'IA locale de l'usine** : installé le 26/09 (v0.34.4, archive officielle, sha256 vérifié), sans root, sur `127.0.0.1:11434` seulement. C'est un réservoir **illimité et privé**.
  - Modèles : `qwen3:4b-instruct-2507` par défaut (environ 9 à 11 jetons/s) et `qwen3:8b` pour le difficile (environ 6 jetons/s). Tous deux sous licence Apache 2.0, usage commercial permis.
  - Usages : le relais quand freellmapi sature, les travaux de masse courts, et plus tard les données de prospects (après le « oui » de Benj).
  - Doc : `presti-ops/usine/ollama-LISEZMOI.md`. Intégré au contrat des moteurs : fiche 026-041, section « Ajout du 26/09 ».
- **Codex sur les modèles gratuits** : la ligne de commande Codex peut tourner sur freellmapi, avec `wire_api="responses"`, quand la connexion ChatGPT ne marche plus.
  - Modèles qui tiennent une boucle d'outils, vérifié le 26/09 : `gpt-oss-120b` et `gemini-3.5-flash`.
  - Échecs : `gemini-3.7-flash` s'arrête après deux appels ; Kimi, GLM, DeepSeek et Qwen 3.5 rendent 503, faute de clé de fournisseur dans freellmapi.
  - Les lanceurs de l'usine font tourner les modèles à chaque tour pour étaler les quotas.
- **Capacité** : l'usine est passée à 4 OCPU / 24 Go le 26/09. Attention, l'offre Always Free est limitée à 2/12 depuis le 15/06/2026 : Benj vérifie le statut d'essai et revient à 2/12 si nécessaire.
- **Ollama Cloud (26/09, matin)** : relié au compte ollama.com de Benj (`ollama signin`, geste fait). Modèles **gratuits** vérifiés un par un :
  - `gpt-oss:120b-cloud`, `gpt-oss:20b-cloud`, `gemma4:cloud` et `nemotron-3-super:cloud` ;
  - Kimi (K2.6, K2.7-code, K3), DeepSeek V4, GLM 5.3, MiniMax M3 : **payants**, rien n'est acheté.
  - Il n'y a ni Fable ni GPT-5.x chez Ollama. Les « Fable » de la recherche sont des envois d'utilisateurs : de petits Qwen de 8 à 9 milliards de paramètres, « sans censure », à ne jamais employer.
  - Codex tourne sur `gpt-oss:120b-cloud` (fournisseur `ol`, `wire_api="responses"`, boucle d'outils vérifiée). C'est le premier secours après ChatGPT, avant freellmapi, **pour le code (D0)** et, depuis le 27/09, **pour les cycles de Matt** dont l'entrée est `ops_etat()` seul (décision 3).
  - Aucune donnée de prospect vers un modèle `:cloud` : la file IA des agents (`presti-ia-modele`) et toute entrée qui en porterait restent sur Codex ChatGPT ou le local.
- **Laya (+ Jev)** : ce n'est pas un modèle qui rédige. C'est un modèle local de **décision**, en une seule passe :
  - `choice` : choisir une option ;
  - `score` : une note sur une échelle ;
  - `noul` : la probabilité calibrée qu'une affirmation soit vraie.
  Il tourne sur l'usine (ONNX, ~1,7 Go), sans quota, et rien ne sort. Ses emplois dans l'écosystème :
  - **qualifier les prospects** (`score`). Comme il est local, les données de prospects sont permises, après le « oui » de Benj ;
  - **vérifier chaque chiffre et chaque promesse** avant une publication ou un envoi (`noul`, seuil 0,5) ;
  - **router** un travail vers le bon moteur (`choice`) ;
  - **troisième avis** dans les contrôles : conformité, inventaires vidéo.
  - Doc : `presti-ops/usine/laya-LISEZMOI.md`.
