# Ce que le cloud ne peut pas faire tel quel — et le réglage exact qui le rendrait possible

*29/09/2026. Sources : l'inventaire des connecteurs et des tâches du PC du 29/09, et la documentation d'Anthropic sur les sessions cloud, les environnements et les routines (relues le 29/09). Ce qui n'a PAS pu être vérifié depuis le PC est marqué **[à tester]** et repris au §5 : rien n'est présenté comme acquis quand il ne l'est pas.*

**En une phrase** : une session cloud est une machine Linux neuve, sans le PC, sans l'usine, sans un seul secret, avec le dépôt cloné et les connecteurs du compte claude.ai. Elle peut lire, écrire, juger et pousser une branche ; elle ne peut ni piloter l'usine, ni lancer le moteur, ni toucher ce qui vit sur le PC. **Pour l'égalité complète sans rien exposer, la seule voie est Remote Control** (§6, D) : la session reste sur le PC et Benj la pilote depuis claude.ai/code ou son téléphone.

## 1. Ce que le cloud fait mieux que le PC

- **Il tourne PC éteint** (la session continue quand on ferme le capot ; elle est récupérée après une longue inactivité, et les tâches de fond en cours sont alors perdues : commiter souvent).
- **Il est isolé** : chaque session a son propre clone. C'est exactement la « copie isolée » que la fiche **026-006 (Next 16)** exige pour son `npm install` : aucun agent du PC n'y est touché. Décision de Benj du 29/09 : Next 16 oui, avant le 21/10. `026-253` (budget-perf pour Next 16) est faite : la fiche peut se mener ici, par une PR dédiée qui porte `package.json` et le lock ; le PC fait ensuite `npm ci` au calme.
- **Il est parallèle** : plusieurs sessions en même temps, chacune sur sa branche `claude/…`. VM : environ 4 vCPU, 16 Go, 30 Go de disque (bien plus que le PC de Benj, 8 Go).
- **Ses juges « navigateur » ne subissent pas la saturation du PC** (le faux rouge du 25/09 : WebKit 390×844 avec 170 Mo libres).

## 2. Ce qu'il ne peut pas faire, un point à la fois

### 2.1 Joindre l'usine Oracle
- **Pourquoi.** La clé SSH `~/.ssh/presti-usine` n'existe que sur le PC. `scripts/usine.mjs` (dans le dépôt) la cherche à cet endroit précis et vise `usine@88.96.53.3` (variable `PRESTI_USINE` pour changer l'hôte). De plus, tout le trafic sortant d'une session cloud passe par un proxy HTTP/HTTPS : la documentation ne promet pas le TCP brut sur le port 22 **[à tester]**. Sans l'usine : ni Codex, ni freellmapi, ni Ollama, ni Laya/Jev, ni Cloudflare IA, ni OpenClaw, ni Hermes, ni les juges « usine » (`usine.mjs executer`).
- **Réglage exact.** (1) Environnement en réseau **Full**, puis `timeout 8 bash -c '</dev/tcp/88.96.53.3/22' && echo ouvert || echo ferme`. (2) Si ouvert : une variable d'environnement `USINE_CLE_SSH` (la clé privée, entre guillemets, sur plusieurs lignes) et ce script d'installation :
  ```bash
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  printf '%s\n' "$USINE_CLE_SSH" > ~/.ssh/presti-usine && chmod 600 ~/.ssh/presti-usine
  ssh-keyscan -T 5 88.96.53.3 >> ~/.ssh/known_hosts 2>/dev/null || true
  ```
  Ensuite `node scripts/usine.mjs …` marche sans changement. **Jamais la clé du PC** : créer une clé dédiée `presti-cloud` et la restreindre dans `~usine/.ssh/authorized_keys` (`restrict,command="~/usine/porte-cloud.sh"`), où `porte-cloud.sh` n'accepte que quelques verbes (`preparer`, `lancer <id>`, `recuperer <id>`, `statut`). **Ce script n'existe pas : il est à écrire (une fiche) avant de poser la clé.**
- **Risque.** Une clé non restreinte donne un shell sur l'usine ; or le compte `usine` est dans le groupe `docker` (root de fait, à retirer : suivi ouvert), et l'usine porte la session ChatGPT de Codex, les clés freellmapi, Firecrawl et Fish, le coffre et OpenClaw. La variable est lisible par tout code que la session exécute (une page web piégée, un paquet npm) et par quiconque utilise l'environnement ; le réseau Full permet de l'exfiltrer. Avec la clé restreinte, une fuite ne permet que les verbes de la porte.
- **Sans clé du tout : le relais par Git.** Le cloud pousse `claude/<id>` ; le moteur du PC (ou un poller sur l'usine, qui a déjà une clé de dépôt en lecture seule) prend la branche. Rien à poser dans le cloud ; latence de quelques minutes ; **à construire**.

### 2.2 Le moteur multi-IA
- **Pourquoi.** `moteur.mjs` (dépose les fiches, lance Codex, appelle Gemini par Antigravity, commite et pousse toutes les 5 min) vit dans `presti-ops/`, **hors du dépôt**, et tourne sur le PC ; ses démons (moteur, guetteur, « reste éveillé ») sont relancés par `relancer-demons.ps1` (WMI, Windows). Les copies dans `usine/` sont pour la lecture.
- **Réglage.** Aucun réglage du cloud ne le rend possible. Le déplacer sur l'usine est un chantier : il faudrait une clé de dépôt en **écriture** sur l'usine (aujourd'hui en lecture seule) et un remplaçant à Antigravity (PC). Risque : clé d'écriture GitHub sur un serveur hors du PC. Tant que ce n'est pas fait, le moteur exige le PC allumé (« reste éveillé » jusqu'au 05/10 à 9 h ; un redémarrage du PC tue tout, même les processus WMI).

### 2.3 Les variables `.env.local` et `presti-secrets/`
Les noms suivants sont ceux de `.env.local` (les valeurs ne sont jamais dans ce dossier). Le mécanisme du cloud : les « variables d'environnement » de l'environnement (format `.env`), **lisibles par quiconque utilise l'environnement et par tout ce que la session exécute** ; il n'y a pas de coffre. Sur les comptes Pro et Max seulement, les « **identifiants d'API** » stockent une clé que le proxy ajoute aux requêtes vers des hôtes précis **sans qu'elle entre dans la VM**.

| Variable | Pour | Dans le cloud ? | Risque si posée |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | build, juges de rendu | **Oui**, variables d'environnement | nul : valeurs publiques |
| `STRIPE_SECRET_KEY_TEST`, `STRIPE_PRIX_SITE` | juges Stripe en mode test | Oui si un juge l'exige | faible : mode test seulement |
| `SUPABASE_SERVICE_ROLE_KEY` | juges `--reel`, essais avec supabase-js | **Non par défaut** ; si Benj veut : « identifiant d'API » pour l'hôte `gorcdvmueakcncsmrouo.supabase.co` (en-têtes `apikey` et `Authorization: Bearer`) **[à tester : que supabase-js accepte une valeur de remplacement]** | très élevé en clair : tous les droits sur la base, RLS contournée |
| `DIRECT_URL`, `SUPABASE_DB_PASSWORD` | connexion Postgres directe | Non (refusés par la base depuis le 14/09) | inutile |
| `VERCEL_TOKEN` | `deploiement-etat.mjs` | Non : le connecteur Vercel le remplace | élevé (pilote la production) |
| `RESEND_API_KEY`, `EMAIL_ENTREPRISE`, `PRESTI_ALERTES_EMAIL` | envoi de mail | Non : aucun envoi depuis le cloud (R24) | élevé : envoi au nom de Presti |
| `PUBLORA_API_KEY` | publications | Non (R24 : accord de Benj) | élevé : publier |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_ADMIN_KEY`, `ANTHROPIC_WORKSPACE_PRESTI` | le produit, `ai-eval`, facturation | Non : le cloud travaille sur l'abonnement | élevé : dépense |
| `STRIPE_SECRET_KEY` | Stripe réel | Non | très élevé |
| `VAPID_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `CANAUX_KEY`, `RELECTURE_EMAIL`, `RELECTURE_CODE`, `RELECTURE_MOT_DE_PASSE` | push, canaux, boîte de relecture | Non | élevé |

Restent sur le PC, sans exception : tout `presti-secrets/` (freellmapi, Meta, Firecrawl, relecture), `cle-sauvegarde.key.pem`, `.demo-compte.local`, `.stripe-*.local`. **Conséquence pratique :** les juges `--reel` et l'étape 6 du protocole des migrations restent au PC, sauf si Benj choisit l'identifiant d'API ci-dessus.

### 2.4 Les connecteurs : voir §3.

### 2.5 Antigravity et Codex
- **Antigravity** : `language_server.exe` du PC (gRPC local, jeton CSRF lu dans la ligne de commande du processus, compte Google connecté). Rien ne peut le joindre depuis le cloud, et il n'y a pas de réglage. **Remplaçant partiel** : `scripts/executant.mjs` (Gemini CLI ou Qwen Code, même contrat de tâche) avec une clé Gemini en variable d'environnement ; le domaine `*.googleapis.com` est déjà dans la liste « Trusted ». Risque : la clé est lisible par la session ; les données partent chez Google (le cloud n'a aucune donnée de prospect). À ne faire qu'avec l'accord de Benj (« juges croisés » : ce que Gemini écrit passe toujours par la contre-vérification de Claude).
- **Codex** : connecté au ChatGPT de Benj **sur l'usine**. Un login ChatGPT est interactif : il ne se fait pas dans le cloud. Seule voie : le §2.1.

### 2.6 OpenClaw et Hermes
Deux conteneurs isolés sur l'usine (modèles gratuits seulement, aucune clé Claude), pilotés depuis le PC par `presti-ops/usine/openclaw/tache.sh` et `hermes/tache.sh` (via SSH). Même réglage et même risque que le §2.1 ; rien de plus à poser. Jamais avec l'abonnement Claude.

### 2.7 Les tâches planifiées
| Ce qui tourne | Où | Équivalent cloud |
| --- | --- | --- |
| Tâche Claude Desktop `relance-chantier-ecosysteme` (toutes les heures, active) : relance le moteur et le guetteur, reprend le chantier si la session du PC est tombée | PC | Une **routine** (claude.ai/code/routines) qui lance la boucle cloud du §7 de `LISEZ-MOI-D-ABORD.md`. Elle ne peut PAS relancer le moteur. |
| Sauvegarde quotidienne du dépôt (026-007, tâche Windows, en service depuis le 28/09) | PC | aucun |
| « Presti usine veille » (toutes les 15 min) | PC | aucun |
| « Presti publications » (toutes les 6 h, Publora) | PC | aucun : R24 |
| Démons : moteur, guetteur de verrous, reste-éveillé | PC (WMI) | aucun |
- **Routines : ce qu'il faut savoir.** Intervalle minimum : une heure. Elles s'exécutent **sans aucune demande de permission** et « **tous vos connecteurs sont inclus par défaut, écritures comprises** » : retirer tout sauf Supabase (et Vercel en lecture). Elles poussent sur des branches `claude/…`. Elles consomment la même limite que le PC, plus un plafond quotidien de runs. Une routine n'applique jamais une migration. Risque : deux sessions qui prennent la même fiche ; l'écriture involontaire par un connecteur.

### 2.8 Ce qui est hors du dépôt
- Le coffre `../SaaS` (fiches à périmètre `SaaS/…`) et l'outil `../orchestre` (fiches à périmètre `../orchestre/…`, dont 026-115) : ces fiches restent au PC ; `etat.mjs --pretes` les classe « à laisser au PC ». Les docs utiles sont recopiées dans `docs/`.
- Le navigateur de Benj (Claude in Chrome, ses sessions TikTok, Instagram, Facebook, LinkedIn), la prospection de Marans, les données de prospects : **PC seulement, par principe**.
- La mémoire vivante (`~/.claude/projects/…/memory`) : le cloud ne l'écrit pas. Ses leçons se rendent dans la PR (`reprise-cloud/retours/`).

### 2.9 Plugins, skills, hooks et garde-fous
- **Les plugins du PC** (ecc, linkedin-skills, facebook-skills, core-3d-animation…) sont installés au niveau utilisateur : **une session cloud ne les installe pas**, même déclarés dans `.claude/settings.json` du dépôt. Disponibles ici : `.claude/skills` (160 fichiers) et `.claude/agents` (22 fichiers) du dépôt, et les skills activés sur claude.ai. Réglage : recopier dans `.claude/skills/` les skills voulus (poids du dépôt, mises à jour à la main).
- **Les garde-fous du PC ne sont PAS dans le cloud.** Les 35 règles `permissions.deny` (git restore/checkout --/reset --hard/clean/push --force/stash drop, rm -rf, achats Vercel, `create_project` et `confirm_cost` Supabase, suppression d'agents et de numéros ElevenLabs) sont dans `~/.claude/settings.json` : **absentes du cloud**. Les hooks et règles du `.claude/settings.json` du dépôt, eux, y sont : les 11 règles `Bash` à y reporter sont dans `outils/permissions-deny-cloud.json`. Les noms d'outils de connecteurs peuvent différer dans le cloud : relever ceux de `/mcp` avant de les y écrire. **C'est le réglage n°1 du §6 : sans lui, une session cloud peut faire un `git reset --hard`.**
- Le crochet `pre-commit` (typecheck, garde-commit, évaluateur) dure 2 à 3 minutes : mettre `BASH_DEFAULT_TIMEOUT_MS=600000` dans les variables de l'environnement (sinon la commande passe en arrière-plan à 2 minutes).

## 3. Les connecteurs : lesquels sont liés au compte, lesquels sont locaux

Relevé du 29/09 par `session_connectors_status` sur la session du PC.

**Connecteurs claude.ai (liés au compte, utilisables dans le cloud quand on les active pour la session ; leur trafic passe par les serveurs d'Anthropic, sans toucher au réseau de la VM) :** Supabase (29 outils), Vercel (243), Gmail (30), Google Drive (11), perplexity (10), ElevenLabs (116), Windsor.ai (19), Figma (40), Shopify (40), Lovable (41), PromptedSite (5), MotionSites (4), HyperFrames by HeyGen (10), Aiso (21), Claude Docs (8), visualize (2).

**Locaux au PC (absents du cloud) :** `scheduled-tasks` (application Desktop), l'entrée `motionsites` de la config utilisateur (à réautoriser ; doublon du connecteur MotionSites), le plugin `ecc:chrome-devtools` (en échec de connexion), et tous les outils fournis par l'application Desktop et l'extension Chrome (`mcp__Claude_Browser__*`, `mcp__claude-in-chrome__*`, `mcp__terminal__*`, `mcp__ccd_*`).

| Connecteur | Dans une session cloud | Pourquoi |
| --- | --- | --- |
| **Supabase** | **Activer** | migrations et SQL : le protocole du §6 de `LISEZ-MOI-D-ABORD.md` marche d'ici. Écritures (`apply_migration`, `execute_sql`) sans clé dans la VM. Jamais `create_project`, `confirm_cost`. |
| **Vercel** | Activer en session interactive, **jamais en routine** | `list_deployments` / `get_deployment` remplacent `deploiement-etat.mjs`. 243 outils dont des achats, suppressions, changements de production : règles deny à reporter. |
| **perplexity** | Activer si besoin | recherche ; l'étude de marché du 27/09 y est. |
| Gmail, Windsor.ai, ElevenLabs | **Désactiver** | Gmail envoie ; Windsor publie et commente sur Instagram ; ElevenLabs dépense des crédits. Trois gestes réservés à Benj. |
| Google Drive, Shopify, Lovable, Figma, PromptedSite, MotionSites, HyperFrames, Aiso, Claude Docs, visualize | Désactiver | inutiles à la série 026 ; Shopify est la branche dropshipping, réservée ; Lovable crée et déploie des projets. |

Les connecteurs du compte s'appliquent à une session cloud « **que vous activez** ». Chaque appel d'outil de connecteur peut demander une approbation selon le mode de permission ; une session qui attend cette approbation compte comme inactive et peut expirer.

## 4. Les différences d'environnement qui trompent

- **Linux, pas Windows.** Un juge vert sur le PC peut rougir ici et inversement : fins de ligne (CRLF/LF : le vrai rouge de 026-039 et le plantage de RV-4 venaient de là), séparateurs de chemin, `spawn` avec `shell:true`, jonctions Windows. **Un rouge du cloud n'est pas un verdict** tant qu'il n'a pas été rejoué dans un clone propre du PC (`verifier-isole.sh`) ; un vert non plus pour une fiche qui touche aux chemins ou aux fins de ligne.
- **Node.** Le PC est en Node 24.16, le cloud en Node 22 par défaut (`/opt/node22`, aussi 20 et 21). Le crochet `pre-commit` utilise `--experimental-strip-types` (Node 22.6 ou plus) **[à tester : `node -v`]**. Le piège `process.exit()` de Node 24 Windows ne se produit pas sous Linux, mais les scripts tournent aussi sur le PC : `process.exitCode` partout.
- **Réseau.** Niveau « Trusted » par défaut : registres de paquets, GitHub, `*.googleapis.com`, `*.amazonaws.com`, `*.r2.cloudflarestorage.com`… mais **pas** les téléchargements de navigateurs de Playwright **[à tester]**. Un accès refusé s'affiche « 403 host_not_allowed ».
- **Git.** Le proxy GitHub n'autorise `git push` que sur la branche courante de la session : **le cloud ne pousse pas sur `main`** **[à tester : la création d'une autre branche `claude/<id>` par `git switch -c`]**. `commit-fiche-cloud.sh` pousse la branche `claude/…` et la PR se fusionne côté PC. `gh` est installé dans la VM (il n'est pas installé sur le PC de Benj). Auto-fix des PR : nécessite l'appli GitHub de Claude.
- **Le dépôt avance sans cesse** (le moteur pousse toutes les 5 min) : `git fetch origin` avant chaque fiche ; deux fiches qui se chevauchent d'après leur périmètre ne se prennent pas en même temps.
- **Sessions inactives** : la VM est récupérée après une longue inactivité ; les sous-agents et commandes en arrière-plan ne sont pas restaurés. Commiter (sur la branche) après chaque fiche.
- **Limite** : la même que le PC. Une session cloud ne donne aucun quota en plus. À 100 %, elle s'arrête aussi (sauf crédit supplémentaire, aujourd'hui désactivé sur le compte).

## 5. Les vérifications du premier quart d'heure (rien n'est acquis avant)

```bash
node -v                                                              # 22.6 ou plus ; sinon : export PATH=/opt/node22/bin:$PATH
npm ci --no-audit --no-fund && npm run typecheck                     # attendu : vert sur HEAD (sinon, dire pourquoi avant tout)
node reprise-cloud/outils/etat.mjs && git ls-remote --heads origin 'claude/*'
echo "$GH_TOKEN"                                                     # « proxy-injected » attendu : l'auth GitHub passe par le proxy
env | grep -E 'KEY|TOKEN|SECRET|PASSWORD' | sed 's/=.*/=<masqué>/'   # ce que l'environnement expose ; seulement les noms
timeout 8 bash -c '</dev/tcp/88.96.53.3/22' && echo ssh-ouvert || echo ssh-ferme     # informatif (§2.1)
npx --yes playwright install chromium 2>&1 | tail -3                 # les téléchargements de navigateurs passent-ils ? (§4)
```
Puis dans `/mcp` : activer Supabase (et Vercel), désactiver le reste ; appeler `list_migrations` (Supabase) et `list_deployments` (Vercel) pour le prouver. Tester `git push -u origin HEAD` sur une branche `claude/essai` (**jamais `origin main`**). Noter dans une PR ce qui a marché et ce qui a échoué.

**Ce que je n'ai pas pu établir depuis le PC** : le TCP 22 depuis la VM ; les téléchargements de Playwright ; le mode de permission le plus autonome de l'interface ; la présence de l'outil `Workflow` dans une session cloud ; les noms d'outils des connecteurs dans le cloud (préfixe) ; le type de compte de Benj (Pro ou Max : les identifiants d'API ; Team ou Enterprise : les environnements auto-hébergés) ; la taille du clone ; la création d'une branche `claude/<id>` autre que celle reçue par la session.

## 6. Les réglages que Benj devrait faire, dans cet ordre, avec le risque

**A. Sans risque, à faire tout de suite**
1. **Créer l'environnement « presti »** (claude.ai/code → icône du nuage au-dessus de la zone de saisie → Add cloud environment) : nom `presti` ; réseau **Custom** avec la liste par défaut cochée (Full seulement pour l'essai du §5) ; variables : `BASH_DEFAULT_TIMEOUT_MS=600000`, `BASH_MAX_TIMEOUT_MS=600000`, `NEXT_TELEMETRY_DISABLED=1`, `NEXT_PUBLIC_SUPABASE_URL=…`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=…` (les deux valeurs publiques) ; script d'installation : `npm ci --no-audit --no-fund || true`. Risque : aucun (valeurs publiques).
2. **Ne laisser actifs que Supabase (et Vercel en session interactive)** dans chaque session et chaque routine (§3). Risque de ne pas le faire : envoi de mail, publication ou dépense sans demande, surtout en routine.
3. **Faire reporter les règles `deny` dans `.claude/settings.json` du dépôt** par la session du PC (un commit dédié ; modèle : `outils/permissions-deny-cloud.json`). Risque : nul. Sans cela, le cloud n'a aucun des garde-fous git du PC.
4. **Ajouter deux lignes à `CLAUDE.md`** (chargé automatiquement dans le cloud) : « Session cloud : lis `reprise-cloud/LISEZ-MOI-D-ABORD.md` d'abord ». Risque : nul.

**B. Valeur moyenne, risque contenu**
5. **Clé de service Supabase** : soit ne rien poser (les `--reel` et l'étape 6 des migrations restent au PC : recommandé), soit un **identifiant d'API** (Pro/Max) pour `gorcdvmueakcncsmrouo.supabase.co`. Risque : la clé donne tous les droits sur la base ; en identifiant d'API elle ne passe pas dans la VM mais s'applique à **toute** session de l'environnement, quel que soit son auteur, jusqu'à suppression.
6. **`STRIPE_SECRET_KEY_TEST`** si un juge en a besoin. Risque : faible (mode test).
7. **Une clé Gemini** pour `executant.mjs` si Benj veut un exécutant dans le cloud. Risque : clé lisible, gratuite.
8. **Une routine horaire** pour la boucle cloud, avec Supabase seul comme connecteur. Risque : consommation de la limite (même limite que le PC) ; fiches prises en double sans la règle « branche = fiche prise ».

**C. L'usine (risque élevé : dans cet ordre, en s'arrêtant au premier « fermé »)**
9. **Essai du TCP 22** en réseau Full (§5). Si fermé : seul le relais par Git est possible (à construire, sans secret dans le cloud).
10. **Une clé dédiée `presti-cloud`, restreinte** par `command="…"`/`restrict` à une porte de quelques verbes (à écrire), posée en variable `USINE_CLE_SSH`. Risque : fuite = exécution de ces seuls verbes ; sans la restriction (déconseillé) = shell d'un compte qui est root de fait.
11. **Ne PAS** poser la clé `presti-usine` du PC, ni une clé GitHub en écriture sur l'usine, ni le jeton ChatGPT de Codex.

**D. Pour l'égalité TOTALE**
12. **Remote Control** : lancer la session sur le PC avec `/remote-control` (ou `claude remote-control`) et la piloter depuis claude.ai/code ou le téléphone. Le PC garde tout (usine, moteur, Antigravity, secrets, connecteurs locaux, mémoire vivante) sans rien exposer. Limite : le PC doit rester allumé et éveillé, ce que le moteur exige déjà. Disponible sur Pro et Max. **C'est la seule option qui donne les mêmes capacités, le même accès, les mêmes connaissances et le même contrôle.**
13. **Environnement auto-hébergé sur l'usine** : la session cloud s'exécuterait sur l'usine (Codex, freellmapi, Ollama, OpenClaw en local). Réservé aux plans **Team et Enterprise** (bêta) : indisponible sur un compte Pro/Max. Risque : un runner avec des identifiants git sur un serveur de 2 cœurs et 12 Go déjà chargé.
