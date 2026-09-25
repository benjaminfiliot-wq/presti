# Registre des IA et routage de l'écosystème Presti (25/09/2026)

> Demande de Benj (25/09) : « normalement, à court de crédit, ça devrait plus être possible avec tout le système déjà en place pour les IA de l'écosystème ; pas en oublier une seule ; pense à Nano Banana ou Perplexity ; et pour les sites, n'oublie pas le kit Figma, la structure et le squelette de base ».
> Le kit Figma, la structure et le squelette des sites ont leur document compagnon : `SaaS/Produit/Ecosysteme-Sites-Kit-2026-09-25.md`, écrit par la même passe (fiches 026-167 à 026-171). Ce document-ci tient le **registre des IA**, le **routage**, les **jauges** et **la règle de Claude Code**.
> Écrit en lecture seule le 25/09 entre 19 h 10 et 19 h 40. Aucun commit, aucune génération (ni image, ni vidéo, ni voix), aucun appel Perplexity Computer, aucune estimation ElevenLabs. Aucune valeur de clé lue : ni `.env.local`, ni `presti-secrets`, ni le `.env` de freellmapi, ni la colonne `unified_api_key`, ni `encrypted_key`.
> Lectures gratuites faites pour ce document : `get_usage` (limites Claude), `whoami` (Figma), `search_prompts` (MotionSites), `projects_list` (Perplexity), la base de freellmapi en lecture seule (noms de fournisseurs, compteurs, catalogue), le dernier journal de session de Codex sur l'usine (compteurs de quota seulement), deux pages officielles (prix de l'API Gemini, limites du connecteur Figma).

---

## En bref

1. **Aujourd'hui, se retrouver « à court de crédit » peut encore arriver.** Trois raisons. freellmapi n'a servi **aucune requête** depuis son installation : sa base compte 0 requête. Aucun routeur ne bascule d'une IA à l'autre. Et la série 026, qui porte les agents, les jauges et le réaiguillage, n'existe encore qu'en brouillons.
2. **Mesuré à 19 h 28.** Claude Max : 62 % de la semaine consommés (remise à zéro dimanche 27/09 à 07 h 59). Codex : 56 % de la semaine (remise à zéro lundi 28/09 à 23 h 43). Le PC, l'usine et le chef tirent tous sur le **même** abonnement ChatGPT.
3. **L'inventaire contenait des erreurs, corrigées au §0.** Les 3 clés de freellmapi sont Google, Mistral et Cerebras, pas Groq, et Cerebras n'a aucun modèle au catalogue. Nano Banana n'a **aucune offre gratuite** sur l'API Gemini. ElevenLabs gratuit ne donne **pas le droit commercial**. Enfin, Antigravity, Gemini CLI, Qwen Code, Kokoro et la clé « agents » manquaient.
4. **Le routage (§2) donne une voie principale et 2 ou 3 bascules à chacun des 18 types de travail.** Les bascules passent par des réserves de quota distinctes et se déclenchent sur 6 règles. Les données personnelles ne vont qu'aux API Anthropic payantes, jamais au gratuit. Quand toutes les voies sont épuisées, la tâche attend dans la file au lieu d'échouer.
5. **Claude ne garde que ce qui demande du jugement.** Juges, décisions et relecture visuelle restent en Opus. Fiches et synthèses passent en Sonnet ou chez Codex ; l'exploration, en Haiku ou chez freellmapi. Les seuils de la semaine (70, 85 et 95 %) coupent ce qui n'est pas du jugement bien avant la coupure.
6. **Il manque 3 gestes groupés de Benj.** Récupérer la clé unifiée et poser les clés Groq et Cloudflare, dans le même tableau de bord. Couper deux interrupteurs de confidentialité. Créer la clé « agents », déjà décidée. S'y ajoutent 7 fiches `026-nouv-ia` et 9 retouches. Nano Banana et Perplexity sont inscrits au registre, avec leur prix réel.

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
| 9 | (absent) | Il manquait aussi les outils suivants. **Kokoro** (`hyperframes tts`, voix française `ff_siwis`) : local et gratuit, vérifié dans le CLI le 24/09. **Gemini TTS** (2 modèles) : déjà servi par la clé Google de freellmapi. **Cloudflare Workers AI** : images FLUX, MeloTTS, Whisper, sans clé pour l'instant. **Groq Whisper**, sans clé. Et la **clé Anthropic « agents »** (R16, 30 $/mois, 026-043), la seule voie des données personnelles chez les agents. | `026-126.md:32` ; table `media_models` ; `026-043.md` |
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
| **A · Claude Max** | Claude Code : session, sous-agents, workflows, Claude in Chrome, WebSearch/WebFetch | Opus 5.5, Sonnet, Haiku ; un compteur hebdomadaire séparé « Fable » à 0 % | abonnement Max (rectification §4.5 l.786) | **5 h : 12 %** (remise à zéro à 23 h 59) · **semaine : 62 %** (remise à zéro dim. 27/09, 07 h 59) · dépassement payant **coupé** | PC | seulement si « Aider à améliorer Claude » est coupé (geste G3) | oui (textes, code) | en service ; c'est le **goulot** |
| **B · API Anthropic « produit »** | `lib/ai.ts` (cerveaux du produit : réponses, relances, devis) | `claude-haiku-4-5` / `claude-sonnet-5` / `claude-opus-5` selon le palier (`lib/models.ts:6-10`) | à l'usage | crédit de la clé non lu. **Aucun repli de modèle** sur 429/529 dans `lib/ai.ts` (seulement un message « réessaie ») | Vercel | **oui** (l'API n'entraîne pas sur les données par défaut) | oui | en prod |
| **C · API Anthropic « agents »** (R16) | `lib/agents/llm.ts`, seul lecteur de `ANTHROPIC_AGENTS_KEY` (026-043) | `MODELE_AGENTS = claude-haiku-4-5` ; `MODELE_REJUGE` (un autre Claude) | plafond de **30 $/mois**, alertes à 50 et 80 % ; 0,05 € par appel ; 1 €/jour pour le standardiste, 2 €/jour pour le rédacteur | coûts dans `ops.couts` (0098) | routes Vercel, coffre de l'usine | **oui** : c'est **la** voie D1 des agents | oui | **pas créée** : `lib/agents/` n'existe pas, fiche en brouillon |
| **D · ChatGPT de Benj** | Codex (PC, `scripts/executant.mjs`), Codex sur l'usine (`scripts/usine.mjs`), chef (`chef-modele`, 026-102) | défaut `gpt-6-sol` ; `gpt-6-luna` (léger) ; `gpt-6-astra` (gros) ; catalogue de l'usine : + `gpt-reserve`, `gpt-5.6-*`, `gpt-5.5`, `codex-auto-review` | abonnement ChatGPT | **5 h : 0 %** · **semaine : 56 %** (remise à zéro lun. 28/09, 23 h 43) · **crédits : 0** (dernier journal de session de l'usine, tâche lancée à 19 h 20) | usine (≤ 2 à la fois), PC (≤ 1) | seulement si « Améliorer le modèle pour tous » est coupé (G3) | oui | en service |
| **E · Google, via Antigravity** | agents d'Antigravity (`scripts/antigravity.mjs`) | Gemini 3.8 / 3.7 Flash (High), `pro`, `flash_lite` ; Claude Opus et Sonnet 4.6 dans l'IDE (coupés le 17/09) | gratuit (compte Google) | quota **par modèle**, épuisé en quelques minutes à 2 agents ou plus ; retours par vagues (1 h 25 à 6 h 24) | PC seulement, IDE ouvert, politique EAGER | **non** | oui (code) | **dormant** depuis le 16/09 |
| **F · freellmapi** (usine, `127.0.0.1:3001`) | une porte compatible OpenAI (`/v1`) | **google** (clé saine) : gemini-3.7, 3.6 et 3.5-flash (20/j chacun), 3.5-flash-lite (20/j), gemma-4-31b-it et gemma-4-26b (1 000/j), TTS `gemini-2.5-flash-preview-tts` et `gemini-3.1-flash-tts-preview` · **mistral** (clé saine) : ministral 3b/8b/14b, mistral-code, codestral (2/min) · **cerebras** (clé saine, 0 modèle) · sans clé : groq (gpt-oss-120b 1 000/j, compound 250/j, whisper), cloudflare (25 textes, 9 images, 4 voix, 4 transcriptions), openrouter (12), huggingface (117), nvidia, cohere, zhipu… | 0 € | **0 requête servie** ; quotas non encore observés | usine ; PC par tunnel `-L 3001:127.0.0.1:3001` | **jamais** : les offres gratuites peuvent entraîner leurs modèles | selon le fournisseur (sorties de l'API Gemini : oui ; modèles ouverts : leur licence) | installé, **jamais branché** (clé unifiée non récupérée) |
| **G · Gemini CLI** | `executant.mjs --moteur=gemini` | `gemini-2.5-pro` par défaut | 0 € (clé AI Studio) | quota du projet Google de la clé | PC | non | oui (code) | non configuré |
| **H · Qwen Code** | `executant.mjs --moteur=qwen` | Qwen (OAuth) | 0 € [à vérifier : l'offre gratuite est-elle toujours ouverte] | inconnu | PC | non | [à vérifier] | non configuré |
| **I · Perplexity** | Perplexity Computer (connecteur `66d36602…`) : recherche web, navigation, code, documents, **images** | modèle interne, non précisé ; modèle d'image [à vérifier] | plan de Benj **inconnu** ; chaque appel Computer consomme des crédits [à vérifier] | expire au bout de 2 min par appel, reprise par `thread_id` | cette session (et Codex, qui partage les connecteurs [à vérifier]) | non | [à vérifier] | branché, **jamais appelé** |
| **J · ElevenLabs Creative** | connecteur `b25622fe…`, ou elevenlabs.io dans Chrome | **Nano Banana Pro**, Gemini Omni, Veo 3.1, Kling 3, Seedance, HeyGen Avatar 4, Creatify Aurora, voix FR, transcription | formule gratuite, **10 000 crédits/mois**. Une vidéo de 8 s en Gemini Omni ≈ 6 087 crédits : environ 1,6 vidéo par mois | crédits du mois ; toujours `estimate_only` avant de générer | cette session / Chrome | non | **non en gratuit** | utilisable pour l'interne |
| **K · API Gemini payante** | Nano Banana, Veo par l'API | Nano Banana 2 Lite 0,0336 $/img · Nano Banana 2 0,067 $ · Pro 0,134 $ · Veo 3.1 Lite 0,08 $/s en 1080p | **payant, sans offre gratuite** | — | aucune | non (les conditions gratuites ne s'appliquent pas, mais pas de D1 par prudence) | oui | **non branchée** : décision d'argent |
| **L · Local** | Kokoro (`hyperframes tts`, `ff_siwis`) ; faster-whisper large-v3-turbo (`presti-ops/transcription/transcrire.py`) ; HyperFrames (rendu, sans IA) ; Blender (sans IA) | — | 0 € | processeur. Le PC dispose de **1,07 Go libres** (19 h 25) ; l'usine, de 9,2 Go disponibles | PC, usine | **oui** (rien ne sort) | Kokoro : [licence de la voix `ff_siwis` à confirmer : la base SIWIS a sa propre licence] | en service |
| **M · Design** | Figma (`305cf665…`) | `use_figma`, `get_design_context`… | Starter | **20 appels de lecture par mois** (siège View) ; écriture exemptée | cette session | — | — | en service |
| | Figma Weave (Nano Banana dans Figma) | `weave_find_model` | crédits Weave [à vérifier] | — | Figma | non | [à vérifier] | **refusé** : compte non lié (17 h 16) |
| | Canva (`6883f693…`) | `generate-image`, `create-design` | plan non vérifié | — | cette session | non | selon le plan | branché |
| | Lovable (`ccb20b9d…`) | projet complet à partir d'un brief | crédits non vérifiés | — | cette session | non | — | branché, hors Presti |
| | PromptedSite (`c045a44d…`) | modèles de sites | gratuit seulement (`hasAccess:false`) | — | cette session | — | — | aperçus gratuits |
| | MotionSites (`26de8380…`) | bibliothèque de prompts de sites | recherche gratuite ; `get_prompt` payant | — | cette session | — | — | répond (19 h 24) |
| | claude-design-skillstack + skills | du savoir, chargé dans Claude | réserve A | — | Claude Code | — | — | installé |
| **N · Données** | Apify (`Apify`) | Actors | **5 $/mois offerts** ([[social-skills-plugins]]) | `/v2/users/me/limits` | cette session, skills | pas de D1 vers un Actor non vérifié | — | branché |
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
| **S** | **Seuil préventif.** Claude semaine ≥ 70 % ; Codex semaine ≥ 85 % ; freellmapi à 90 % du plafond journalier d'un modèle ; clé « agents » à 80 % du mois | Claude : voir le §5. Codex : `gpt-6-luna` seul, les chantiers partent vers Antigravity. freellmapi : fournisseur suivant. Clé « agents » : carte Attention (déjà prévue dans 026-047) |
| **C** | **Coût du jour.** Une voie payante à l'usage atteint son plafond du jour : plafonds par agent de 0098 pour la clé « agents », plafond que Benj fixe pour l'API Gemini payante, crédit offert d'Apify | Bascule vers le gratuit en D0 ; **attente** en D1 |
| **P** | **Panne.** Erreur 5xx ; délai supérieur à 2 fois l'habituel ou à celui de la fiche ; transcript d'Antigravity immobile depuis 10 min (leçon du 15/09) ; usine injoignable | Bascule, puis retour à la voie principale dès que sa sonde répond |
| **J** | **Trois refus du juge d'affilée** sur la même voie | Monter d'un cran (règle du 15/09, [[benj-executants-d-abord]]) |
| **fin** | **Toutes les voies sont épuisées** | La tâche **reste dans la file** avec une carte « à sec jusqu'au … ». Jamais d'IA hors registre. Jamais Claude pour du volume |

**Règle des données, sans exception :**
- **D1 → réserves B, C ou L seulement.** Codex (D) et Claude Code (A) n'y ont droit qu'après le geste G3, et seulement dans une fiche, jamais en automatique.
- **D1 n'y va jamais :** freellmapi, Antigravity, Gemini CLI, Qwen, Perplexity, ElevenLabs, Canva, Lovable, Weave.
- **Pas de passage au gratuit sous D1** : sans voie payante, une tâche D1 **attend**. C'est la consigne de Benj du 24/09 au soir : « jamais de donnée personnelle de prospect vers une offre gratuite » ([[ecosysteme-presti]]).

**Règle de licence (L) :** ce qui est **publié ou vendu** ne sort que d'une voie qui en donne le droit :
- **autorisé :** captures réelles, textes de Claude et de Codex, Kokoro (licence de la voix à confirmer), FLUX.1 [schnell] (Apache-2.0), sorties de l'API Gemini ;
- **exclu :** ElevenLabs en gratuit, et tout modèle « non commercial » (par exemple FLUX.2 [dev] [licence à relire]).

### 2.2 Le tableau

| Type de travail | Données | Voie principale | Bascule 1 | Bascule 2 | Bascule 3 | Déclencheurs | Source, remarque |
|---|---|---|---|---|---|---|---|
| **Code et fiches** : code | D0 | Codex `gpt-6-sol` sur l'usine (`usine.mjs lancer`, 2 au plus) | Antigravity : Gemini 3.8 Flash (High), puis `pro` (`antigravity.mjs lancer ag-N`) | Gemini CLI ou Qwen Code (`executant.mjs --moteur=`), après G5 et G6 | sous-agent Claude **Sonnet** (exception du 15/09 : exécutants bloqués, sans surcoût) | Q, P, J | Codex sur le PC n'est **pas** une bascule sur Q (même réserve D) ; il ne remplace l'usine qu'en cas de panne (P) |
| Code et fiches : fiches | D0 | Découpage, juges et critères « C'est fini quand » : Claude **Opus**. Corps de la fiche (contexte, chemins, lecture du code) : Codex `gpt-6-sol` | Claude **Sonnet** pour le corps | Antigravity `pro` | attente | Q, S | Fiches argent, sécurité ou cerveaux : Opus seulement (`CLAUDE.md:30`) ; `orchestre valider` reste mécanique |
| **Juges et relectures** | D0 | Écrire un juge : Claude **Opus**. Exécuter un juge : du code, sans IA, sur l'usine. Regarder une capture ou une vidéo livrée : **Opus** | Claude **Sonnet** (juges simples, mutations) | Claude Opus 4.6 **dans Antigravity** (réserve E ; sonder d'abord : coupé le 17/09) | Codex `gpt-6-astra` en contre-juge, sinon attente | Q, S, P | [[juge-capture-lui-meme]] : le vérificateur capture lui-même |
| Juges des envois (J1 à J3, second juge, rejugement du soir) | **D1** | clé « agents » `claude-haiku-4-5` | `MODELE_REJUGE`, **même clé** (limites séparées par modèle chez Anthropic) | **attente** : l'envoi ne part pas sans ses verdicts | — | R, Q, C | 026-043, 026-065, 026-089 |
| **Réflexion et décisions** | D0/D1 | Claude Code **Opus** (session principale) | Codex `gpt-6-astra` (contre-expertise écrite) | Claude Opus 4.6 dans Antigravity | attente, ou carte à Benj | Q, S | Jamais une IA gratuite pour décider |
| Chef de l'usine (cycles, réunion de 18 h) | D0 (chiffres rassemblés sans modèle) | Codex `gpt-6-sol` sous `chef-modele` | `gpt-6-luna` | cycle sauté, avec un événement « chef à sec » | — | Q, P | 026-102 (CH-C2), 026-129 ; même réserve D que les exécutants |
| **Recherche web et veille** | D0 | Recherche profonde, ponctuelle : **Perplexity Computer** (routage v16, `CLAUDE.md:30` ; `Orchestre.md:34`) | Groq `compound` par freellmapi (recherche web intégrée [à vérifier], 250/jour), après G2 | Pages récupérées par du code (Playwright, scrapegraphai) puis résumées par Gemini 3.7 Flash ou Gemma 4 via freellmapi | WebSearch/WebFetch de Claude Code (réserve A), en dernier | Q, C, S | La **veille récurrente** (C12, labo des accroches) passe par du code et freellmapi, **jamais** par Perplexity en boucle (crédits) |
| **Lecture de vidéos à l'image** | D0 | Images-clés extraites par ffmpeg sur l'usine, décrites par Gemini 3.7 ou 3.6 Flash via freellmapi (vision [à vérifier : `models.supports_vision`], 1 M de contexte) | Antigravity Flash (lit les images du dossier) | sous-agent Claude **Sonnet** sur les images-clés | — | Q, R | Le **verdict** « conforme à la référence » reste à **Opus** (règle de conformité du 25/09, [[benj-reverifier-decisions-et-videos]]) |
| **Transcription** | D0 ; D1 pour la voix d'un prospect | faster-whisper large-v3-turbo **sur l'usine** (à y déplacer : IA08) | Groq `whisper-large-v3-turbo` via freellmapi (25 Mo), après G2 | Cloudflare `whisper-large-v3-turbo`, après G2 | faster-whisper `base` sur le PC ; ElevenLabs (crédits) | P, Q | D1 : **local seulement** (usine ou PC) |
| **Rédaction des messages aux prospects** (Plume) | **D1** | clé « agents » `claude-haiku-4-5`, sur un modèle approuvé une fois | Sonnet, même clé, si le 429 est propre à Haiku | **attente** : le Facteur ne part pas. Cartes `cle_agents_vide` ou `jauge_pleine` (026-070) | — | R, Q, C | 026-043, 026-094 ; aucune voie gratuite, jamais |
| **Réponses du Répondeur** | **D1** | clé « agents » `claude-haiku-4-5` | Sonnet, même clé | lecteur nul : **tout ce qui n'est pas un refus devient « à lire »** (026-094), Benj tranche en 7 choix | — | R, Q, C | Le STOP est repéré par du code **avant** tout modèle (`Ecosysteme-Prospection-Gratuite-2026-09-24.md:188`) |
| Répondeur **du produit** (clients des artisans) | **D1** | clé « produit », palier de l'artisan (`lib/models.ts`) | palier inférieur, même clé (**à écrire** : IA07) | message « réessaie » (l'existant) | — | R, P | Cerveau, donc réservé à Claude Code |
| **Qualification** | **D1** | Règles déterministes d'abord (le modèle d'`analyzeLead`, `lib/ai.ts`), puis clé « agents » Haiku | Sonnet, même clé | règles seules, puis « à lire » | — | R, Q, C | |
| **Résumé et tri de masse** | D0 | freellmapi : **Gemma 4 31B** (1 000/j), puis Mistral `ministral-14b` (2/min, sans plafond journalier) | Codex `gpt-6-luna` sur l'usine (réserve D : à éviter si la semaine dépasse 85 %) | Antigravity `flash_lite` | sous-agent Claude **Haiku** (réserve A) | Q, R, S | En D1 (tri des réponses) : clé « agents » Haiku |
| **Traduction** | D0 | freellmapi : Mistral `ministral-14b` | Gemini 3.x Flash via freellmapi | Codex `gpt-6-luna` | Claude **Haiku** | Q, R | D1 : clé « agents » |
| **Visuels de contenu** (images) | D0, règle L | **Captures réelles** du produit (Playwright) + HyperFrames : 0 €, sans IA (C06 du doc marketing ; [[presti-feature-showcase-rule]]) | **FLUX.1 [schnell]** via Cloudflare Workers AI, dans freellmapi (Apache-2.0, « 10 k neurones/jour » partagés), après G2 | **Nano Banana 2 Lite** par l'API Gemini payante (0,0336 $/image, par lots 0,0168 $), avec plafond du jour : **décision d'argent** | Canva `generate-image` (plan à vérifier) | Q, C | **Nano Banana Pro via ElevenLabs gratuit** : brouillons et planches **internes** seulement. Perplexity : modèle d'image [à vérifier]. AI Studio : à la main. Un Nano Banana **gratuit et publiable en automatique n'existe pas aujourd'hui** |
| **Vidéos UGC** (Studio pubs) | D0 (le produit de l'annonceur), règle L | **Pub locale** : HyperFrames + Kokoro `ff_siwis` + images licenciées, 0 € (026-126, 026-156) | **Studio IA** : ElevenLabs Creative (Nano Banana Pro, puis Veo 3.1, Kling 3 ou Gemini Omni), toujours `estimate_only` d'abord. Un livrable **vendu** exige une offre payante (026-156) | Veo 3.1 Lite par l'API Gemini payante (0,08 $/s en 1080p) | LTX-Video par Hugging Face (0,10 $/mois de crédits : pour essayer seulement) ; rendu HeyGen (payant) | Q, C | Alexya en dernier repli seulement (9 à 99 $/mois), [[ecosysteme-presti]] |
| **Voix** | D0, règle L | **Kokoro** `ff_siwis` (`hyperframes tts`, local) | **Gemini TTS** via freellmapi : clé Google **déjà posée**, plus de 30 voix, quota à mesurer | MeloTTS (Cloudflare, multilingue), après G2 | ElevenLabs : interne en gratuit, commercial seulement en payant | Q, P | Mention IA pour toute voix de synthèse (C05) ; clé de cache = le texte ([[voix-cache-par-texte]]) |
| **Montage** | D0 | HyperFrames CLI (local ou usine, 0 €, sans IA) ; **CapCut** pour le clipping ([[clipforge-regles-permanentes]]) ; ffmpeg | Écriture de la composition : Antigravity (026-153, 026-158) | Codex | `compose` et `render_video` de HeyGen (payants, avec l'accord de Benj) | P, Q | [[hyperframes-en-local]] |
| **Design de site** | D0 | **Squelette maison** : `public/sites-demo/generer.mjs` + `_kit/` (déterministe, 0 €), DA par métier (`da.json`) ; jugement de Claude **Opus** | Inspiration : MotionSites `search_prompts` (gratuit), PromptedSite (gratuits), skillstack | Code : Codex, puis Antigravity | Figma : 20 lectures par mois, écriture exemptée à éprouver (026-170) ; Lovable hors Presti | Q | **Ni Nano Banana ni Perplexity sur un site** : « rien d'inventé » (`lib/siteCommande.ts:21`, doc Sites-Kit). Kit Figma : doc Sites-Kit, 026-167 à 026-171 |
| **Maquettes** (Atelier) | **D1** (nom et coordonnées de l'artisan) | `generer.mjs --maquette` (sans IA) + rédacteur `creerLecteur('redacteur_site')`, clé « agents » (026-093) | Sonnet, même clé | `--sans-ia` : texte du gabarit métier (026-093) | — | R, Q, C | Photos : celles de l'artisan, ou une banque créditée ; jamais un visage généré |
| **Données et scraping autorisé** | D0/D1 | Du **code** sur l'usine : Playwright, scrapegraphai, données ouvertes RGE, API Meta `ads_archive` (jeton) | Apify (5 $/mois offerts ; aucun D1 vers un Actor non vérifié) | Windsor (essai) | Extraction par IA : freellmapi en D0, clé « agents » en nominatif (R4) | C, P | Les CGU de chaque source s'appliquent ; aucun contournement (Prospection-Gratuite l.189) |

**Capacité gratuite déclarée**, une fois G1 fait, sans Groq ni Cloudflare :
- 5 modèles Gemini Flash (3.7, 3.6, 3.5, 3.5-lite, 3-preview) × 20 requêtes = 100 req/jour ;
- 2 modèles Gemma 4 × 1 000 = 2 000 req/jour ;
- Mistral : 2 req/min, soit jusqu'à environ 2 880 req/jour.

Avec G2 (Groq et Cloudflare), on ajoute environ 4 000 req/jour de texte et une réserve d'images et de voix. **Ces chiffres sont déclarés par le catalogue** : à confirmer par la première semaine de relevés (§3).

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
| Clé « agents » | C | `ops.couts` (026-043) ; jauge `cle_agents` de 026-064 | clé non créée | à chaque appel | 30 $ − le mois ; plafond du jour par agent |
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
- **COÛT IA DU JOUR** : clés B, C et K, en euros ;
- **BASCULES** : nombre du jour, rouge si une réserve est à sec.

---

## 4. Ce qui manque aujourd'hui pour que ce soit vrai

### 4.1 Les gestes de Benj : le moins possible, groupés en une séance d'environ 20 min

| # | Geste | Pourquoi aucun agent ne peut le faire | Ce qu'il débloque |
|---|---|---|---|
| **G1** | Ouvrir le tableau de bord de freellmapi par le tunnel : `ssh -i ~/.ssh/presti-usine -N -L 3001:127.0.0.1:3001 usine@88.96.53.3`, puis http://localhost:3001. **Copier la clé unifiée** dans `presti-secrets/freellmapi.txt`. Claude Code la pose ensuite dans le coffre de l'usine (`~/.config/presti/agents.env`). Jamais dans une conversation. | c'est un secret, et la matérialisation d'identifiants est refusée aux agents | toute la réserve F : résumé, tri, traduction, veille, vision, Gemini TTS |
| **G2** | Dans le **même** tableau, créer deux comptes gratuits et coller leurs clés : **Groq** (console.groq.com) et **Cloudflare Workers AI** (identifiant de compte + jeton « Workers AI »). OpenRouter, si Benj le veut. Laisser ou retirer Cerebras : elle n'a aucun modèle | créer un compte est un geste humain | Groq : gpt-oss-120b, `compound`, Whisper. Cloudflare : FLUX.1 schnell, MeloTTS, Whisper. C'est la seule voie **image** gratuite et publiable |
| **G3** | **Deux interrupteurs de confidentialité.** ChatGPT › Paramètres › Contrôle des données › « Améliorer le modèle pour tout le monde » : **coupé**. claude.ai › Paramètres › Confidentialité › « Aider à améliorer Claude » : **coupé** [libellés exacts à vérifier à l'écran] | réglages de compte | le droit de faire passer du D1 par Codex et Claude Code dans une fiche. Sans ce geste, le D1 reste chez les API B et C |
| **G4** | **R16, déjà décidée** : créer l'espace de travail Anthropic « agents », plafonné à 30 $/mois (alertes à 50 et 80 %), et sa clé dans `presti-secrets`. Claude Code la pose dans `ANTHROPIC_AGENTS_KEY` | argent et secret | Plume, Répondeur, qualification, juges des envois, rédacteur des maquettes : toute la voie D1 |
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
| **IA03** | `lib/ia/routeur.ts` : `choisirVoie(travail, classe, etat)` pur, et `appelerAvecBascule()`, qui applique Q, R, S, C, P et J, inscrit jetons et coûts dans `ops.couts` et émet `ia_bascule`. La réserve C passe **par** `creerLecteur` (026-043), jamais par la clé elle-même. freellmapi est appelé par fetch compatible OpenAI, sur l'usine seulement, avec la clé du coffre. N'importe **jamais** `@/lib/ai` | codex (usine) | `ia-routeur-qa --partie=routeur` (IA01) | IA02, 026-040, 026-043, C15 |
| **IA04** | Relevé des IA sur l'usine, `scripts/usine/releve-ia.mjs` : la base de freellmapi en lecture seule (sans clé ; colonnes de compteurs seulement, jamais `encrypted_key` ni `settings.unified_api_key`) et les `rate_limits` des journaux de session de Codex (`usine` et `chef-modele`). Envoi au bus `ia_releve` à chaque battement. **Absorbe la partie « relevé de freellmapi » de C15** | codex (usine) | `ia-routeur-qa --partie=releve-usine` (IA01) | IA01, 026-053, C15 |
| **IA05** | Relevé du PC et réaiguillage multi-moteurs, extension de 026-115 : `quotas.json` gagne `claude` (écrit par Claude Code depuis `get_usage`), `antigravity:<modèle>` (sonde), `gemini`, `qwen` et `freellmapi:<fournisseur>`. Nouvelle commande `orchestre quotas`. Le bloc Attention propose l'exécutant suivant **selon le registre**. Le pont (026-160) pousse `quotas.json` au bus | codex | `../orchestre/test/preuve-026.mjs --groupe=quota` (026-098, étendu par Claude Code avant la fiche) | 026-115, 026-160, IA02 |
| **IA06** | Jauges IA : retouche de 026-064 (jauges `claude_5h`, `claude_semaine`, `codex_5h`, `codex_semaine`, `antigravity:<m>`, `freellmapi:<fournisseur>`, `gemini_payant_jour`, `elevenlabs_credits`, `cle_produit`) + panneau `Machines.tsx` (026-120) + barre (026-070) | codex (usine), antigravity pour le panneau | `jauges-qa` (026-062) et `pilotage-ecran-qa --partie=salles` (026-104), étendus avant | IA04, IA05, 026-064, 026-120 |
| **IA07** | Repli de modèle du produit : dans `lib/ai.ts`, sur 429 ou 529, Opus 5 → Sonnet 5 → Haiku 4.5, même clé, avec inscription du coût (jauge `cle_produit`) | **claude-code** (cerveau) | `node scripts/ai-eval.mjs` (non-régression) + un critère de faux 429 | — |
| **IA08** | Transcription sur l'usine : faster-whisper large-v3-turbo en venv sur l'usine, appelé par `usine.mjs executer` ; cela retire le plus lourd du PC | codex (usine) | `ia-routeur-qa --partie=transcription` (IA01) | IA01 |
| **IA09** | Mutations des juges IA | codex | `juges-026-mutations-preuve.mjs --script=scripts/juges-026-ia-mutations.mjs` (026-001) | IA01 à IA08 |

### 4.3 Fiches existantes à retoucher (par Claude Code, dans les brouillons, avant l'assemblage)

- **026-043** : écrire la bascule R (Haiku → `MODELE_REJUGE` ou Sonnet sur la même clé, par modèle) et rappeler que le routeur (IA03) ne lit jamais la clé.
- **026-064** : la liste fermée des jauges s'élargit aux IA (IA06).
- **026-070** : les compteurs de la barre (§3.3).
- **026-092** : les quotas ne sont plus `null` une fois IA04 et IA05 passées ; `manque` reste le repli.
- **026-102 et 026-129** : le chef bascule de `gpt-6-sol` à `gpt-6-luna`, puis saute son cycle avec un événement. Jamais Claude, jamais du gratuit.
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
| Recherche web | Perplexity, puis Groq `compound` ; WebSearch en dernier | — |
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
| ≥ 95 % | Claude Code ne lance plus rien ; les tâches attendent dans la file ; Codex et Antigravity continuent. Juge de secours : Claude Opus 4.6 **dans Antigravity** (réserve E, sonder d'abord) |
| fenêtre 5 h ≥ 90 % | fin du bloc, `/compact`, reprise à la remise à zéro |

**Deux points à éclaircir, sans les utiliser d'ici là :**
- Le compteur hebdomadaire « **Fable** » (0 %) est une réserve Claude distincte. Avant d'en faire une bascule, il faut savoir quel modèle il couvre : skill `claude-api`.
- Le **dépassement payant** reste coupé : c'est une décision d'argent.

---

## Gestes de Benj (récapitulatif)

1. **G1 (5 min)** : tunnel vers freellmapi, puis copier la **clé unifiée** dans `presti-secrets/freellmapi.txt` (Claude Code la pose sur l'usine).
2. **G2 (10 min, même tableau)** : comptes gratuits **Groq** et **Cloudflare Workers AI**, avec leurs clés collées dans freellmapi (OpenRouter en option ; Cerebras inutile).
3. **G3 (2 min)** : couper « Améliorer le modèle pour tout le monde » (ChatGPT) et « Aider à améliorer Claude » (claude.ai).
4. **G4 (5 min, R16 déjà décidée)** : espace Anthropic « agents » plafonné à 30 $/mois, clé dans `presti-secrets`.
5. *Facultatif* : **G5**, seconde clé AI Studio (autre projet Google) pour Gemini CLI ; **G6**, `/auth` Qwen OAuth une fois.
6. *Décisions d'argent, plus tard, au premier pack vendu* : API Gemini payante (Nano Banana 2 Lite à 0,0336 $/image, Veo) ou ElevenLabs payant pour le droit commercial.

## Sources

- **Mémoire :** [[ecosysteme-presti]], [[usine-oracle]], [[codex-executant]], [[presti-ai-architecture]], [[presti-orchestre-antigravity]], [[clipforge-regles-permanentes]], [[motionsites-connecteur-marche]], [[benj-executants-d-abord]], [[benj-reverifier-decisions-et-videos]], [[social-skills-plugins]], [[hyperframes-en-local]].
- **Dépôt presti (HEAD `7d68786`) :** `lib/models.ts:6-10`, `lib/ai.ts`, `scripts/executant.mjs:1-38`, `scripts/usine.mjs:58`, `.orchestre/agents.jsonl`, `CLAUDE.md:30`, `.orchestre/brouillons-ecosysteme/026/` (INDEX, 026-043, 026-064, 026-070, 026-092, 026-102, 026-115, 026-120, 026-126, 026-156).
- **Coffre (vault) :** `SaaS/Produit/Orchestre.md:34`, `Antigravity.md`, `Ecosysteme-Rectification-2026-09-24.md` (l. 786, 865), `Ecosysteme-Prospection-Gratuite-2026-09-24.md` (l. 60, 109, 188-189), `Ecosysteme-Recherche-Pubs-2026-09-24.md:187`, `Ecosysteme-Marketing-Reel-2026-09-25.md` §3.7 (C12, C15), `Ecosysteme-Sites-Kit-2026-09-25.md`.
- **Usine (lecture seule, 19 h 20-19 h 27) :** `docker compose ps` (`freellmapi-freellmapi-1` en service depuis 22 h, sain), `/api/ping`, `freeapi.db` (noms de tables, fournisseurs, compteurs, catalogue), dernier `rollout-*.jsonl` de Codex (`rate_limits`, `total_token_usage`), `free -m`, `df -h`.
- **Pages officielles :** https://ai.google.dev/gemini-api/docs/pricing ; https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/.
- **Connecteurs lus gratuitement :** `get_usage`, `whoami` (Figma), `search_prompts` (MotionSites), `projects_list` (Perplexity).
