# Les modèles de l'écosystème : un registre, une sonde, un juge (08/10/2026)

Ordre de Benj : tout modèle ou IA qu'il utilise doit être **accessible et implémenté pour les agents de l'écosystème** (ceux du bus : chef, preneur, recenseur, facteur, repondeur… qui tournent sur l'usine Oracle), exactement comme un moteur du relais existant. Trois objets :

| | Fichier | Rôle |
|---|---|---|
| Registre | `scripts/modeles/registre.mjs` | une entrée par IA : accès, modèle, lieux, branché ou non (avec la raison écrite), coût, aptitudes, données personnelles permises |
| Adaptateurs + sonde | `scripts/modeles/adaptateurs.mjs`, `scripts/modeles/sonde.mjs` | pour chaque entrée, UN vrai appel minimal (« Réponds uniquement le mot OK »), latence, OK / KO / NON BRANCHÉ / NON SONDÉ ; exit 1 si une IA déclarée branchée ne répond pas |
| Juge | `node scripts/modeles-qa.mjs [--preuve-echecs]` | 12 critères (MQ-1 à MQ-12) et 21 sabotages sur copie |

Règle : **« branché » veut dire qu'un adaptateur vérifié a fait un vrai appel dans ce lieu**. Une IA sans sonde réelle n'est jamais OK ; une IA déclarée non branchée porte sa raison (`reserve`) et la sonde dit quand même si elle répondrait. Les clés ne sont jamais dans le registre (seulement l'endroit où elles se lisent), jamais affichées : `assainir` retire toute valeur de clé et toute forme de clé de ce qui sort.

## Comment un agent choisit son modèle

1. **Le relais des agents** (`scripts/usine/relais-chef.mjs`, `CHAINE_SECOURS`) : Codex d'abord, puis, pour une donnée **publique** : `claude_haiku` → `freellmapi_gemini` → `freellmapi_mistral` → `freellmapi_auto` → `ollama_cloud` → `ollama_chef_leger` (plans légers seulement) → `ollama_8b` → `ollama_4b`. Pour une donnée de **prospect** : Codex, puis les seuls modèles **locaux** de l'usine, et seulement avec le « oui » daté de Benj (`IA_LOCALE_PROSPECTS_OUI`). Le preneur (`scripts/usine/preneur.mjs`) essaie son modèle maison (tâches courtes et cadrées), puis Haiku (si actif), puis les Ollama.
2. **Le registre** dit la même chose, en données : `choisirModeles({ aptitude, nature, lieu, etat })` rend les entrées branchées dans le lieu, qui ont l'aptitude, qui peuvent recevoir la nature de la donnée, dans l'ordre (`ordre`), en écartant celles que le dernier relevé de la sonde (`.orchestre/travail/modeles/derniere-sonde.json`) marque KO. Le juge MQ-2 compare le registre et `CHAINE_SECOURS` (modèle, gratuit, local, ordre) : l'un ne peut pas changer sans l'autre.
3. **Une IA gratuite ou externe ne reçoit JAMAIS de donnée de prospect** (règle de Benj du 26/09). Trois verrous : `donnees_personnelles_ok` (faux pour tout ce qui est gratuit ou distant, `defautsDuRegistre` refuse l'inverse), `peutRecevoir`/`choisirModeles` (prospect : Codex ou local de l'usine seulement), et le relais (`secoursPermis`, `natureDeTexte`, refus dans `appelDirect`). MQ-8 et trois sabotages le jugent.

Écart assumé avec la demande (« Haiku après les gratuits locaux ») : Haiku est **avant** tous les gratuits distants **et** avant les locaux, pour les données publiques. Les locaux de l'usine sont lents (4 B : ≈ 5 jetons/s, 8 B : ≈ 1,7 ; le 4 B n'a fini un plan plein qu'en 18 min) : les mettre avant Haiku ferait perdre le cycle du chef (858 s). Pour une donnée de prospect, Haiku n'est jamais essayé (il est externe), donc il ne peut venir « après les locaux » nulle part.

## Haiku 5.5 (`claude_haiku`)

- API Messages : `POST https://api.anthropic.com/v1/messages`, `x-api-key`, `anthropic-version: 2023-06-01`, modèle `claude-haiku-5-5`, blocs `type=text` recollés, **`thinking: {type: "disabled"}`** (ajouté le 08/10 dans `scripts/usine/moteurs-anthropic.mjs` ; la sonde l'envoie aussi). Vérifié : 200, « OK », 20 jetons en entrée, 4 en sortie.
- Dépense : 0,10 $ / 0,50 $ le million de jetons, réservation de 0,02 $ avant chaque appel, plafond **1 $ par jour UTC** (`PRESTI_HAIKU_PLAFOND_USD`), compteur partagé chef + preneur (`PRESTI_HAIKU_COMPTEUR`, sans lui : aucun appel payant). 429, plafond, erreur ou réponse vide : le moteur suivant prend la demande (juge MQ-12 et `relais-ia-qa` RC-H).
- Essai réel du 08/10 : un plan JSON écrit par `appelDirect` avec le vrai Haiku, 52 + 20 jetons, 0,0000152 $, compteur à jour. Dépense totale de mes essais Haiku (sondes comprises) : **moins de 0,0005 $** (plafond de 0,30 $).

### Déploiement sur l'usine : PAS FAIT, c'est un geste de Benj

La clé de l'écosystème est sur le PC (`presti-secrets/anthropic-ecosysteme.txt`, testée valide). Elle n'est **pas** sur l'usine, parce que le mécanisme de coffre l'interdit par décision de Benj : `scripts/usine/coffre-regles.mjs` refuse toute valeur `sk-ant-…` (« plus aucune clé de modèle n'entre au coffre, R16 annulée »), et `presti-coffre` (le script de l'usine) rejoue la même règle. Je ne l'ai pas contourné (pas de scp, pas d'écriture directe sous `~/.config`). Ce que Benj doit décider et faire, dans cet ordre :

1. **Trancher la règle** : soit lever R16 pour ce seul nom (`PRESTI_HAIKU_CLE` dans `NOMS_PERMIS`, exception à `FORMES_REFUSEES` pour ce nom, même changement dans `scripts/usine/presti-coffre.sh`, table `scripts/fixtures/026/usine-socle/coffre/cas-valeurs.json`, puis `usine-socle-qa`), puis `node scripts/usine-coffre.mjs poser PRESTI_HAIKU_CLE --depuis-env=<VAR>` dans SON terminal ; soit garder la règle et poser la clé comme celle de freellmapi (fichier 600 hors coffre) : `~chef-modele/.config/presti/haiku.key` (le chef) et `~agents/.config/presti/haiku.key` (le preneur), puis `PRESTI_HAIKU_CLE_FICHIER=` dans les unités.
2. **Poser dans les unités** `presti-chef-modele.service` et `presti-preneur.service` : `PRESTI_HAIKU_ACTIF=oui`, `PRESTI_HAIKU_CLE_FICHIER=<le fichier>` (ou la clé du coffre) et **le même** `PRESTI_HAIKU_COMPTEUR=<chemin absolu>` dans un dossier où les comptes `chef-modele` et `agents` peuvent tous deux écrire (un groupe commun ; `/srv/presti-ia/echange` est à `agents` seul).
3. **`scripts/usine/avec-coffre.mjs`** ne passe à l'enfant que sa liste `PASSANTS` : le preneur démarre par lui, donc `PRESTI_HAIKU_ACTIF`, `PRESTI_HAIKU_COMPTEUR` et `PRESTI_HAIKU_CLE_FICHIER` doivent y être ajoutés (et jugés par `usine-socle-qa`), sinon le preneur n'aura jamais Haiku, quelles que soient les unités.
4. **Console Anthropic** : un plafond de dépense mensuel (le plafond de 1 $/jour du code est une seconde garde, pas celui du compte).
5. Puis `node scripts/modeles/sonde.mjs --usine --id=claude_haiku` doit rendre OK pour `claude_haiku@usine`, et `branche.usine` passe à `true` dans le registre (le juge MQ-2/MQ-9 suivent).

## Ajouter une IA

1. Une entrée dans `REGISTRE` (`scripts/modeles/registre.mjs`) : `id`, `acces`, `modele`, `lieux`, `branche` **à `false` avec `reserve`** tant que l'appel n'a pas été vu répondre, `gratuit`, `donnees_personnelles_ok` (faux sauf Codex et un modèle local de l'usine), `aptitudes`, `cle` (l'endroit, jamais la valeur), `sonde`.
2. Si l'accès existe déjà (`anthropic`, `openai`, `ollama`, `api`, `cli`, `agent`), rien d'autre ; sinon un adaptateur dans `adaptateurs.mjs` qui fait un VRAI appel et ne rend `OK` que si l'IA a répondu.
3. Si c'est un moteur de secours du chef : l'ajouter aussi à `CHAINE_SECOURS` (`relais-chef.mjs`) avec le même modèle, le même `gratuit`, et un `relais`/`ordre` cohérents au registre (MQ-2 le juge).
4. `node scripts/modeles/sonde.mjs --id=<id> [--usine]` → quand la ligne est OK, passer `branche` à `true`, lancer `node scripts/modeles-qa.mjs --preuve-echecs`, puis le juge du relais (`relais-ia-qa --temoin`, `chef-qa`, `preneur-qa`).
5. Ajouter l'`id` (entre apostrophes inversées) à cette doc : MQ-11 le vérifie.

## La sonde

```
node scripts/modeles/sonde.mjs                     # les IA du PC + « NON SONDÉ » pour celles de l'usine
node scripts/modeles/sonde.mjs --usine             # + la sonde sur l'usine par ssh (clé presti-usine-gardien, sudo -n)
node scripts/modeles/sonde.mjs --id=claude_haiku   # une seule (ou une liste séparée par des virgules)
node scripts/modeles/sonde.mjs --json --forcer     # JSON ; --forcer : modèles locaux même pendant un cycle du chef
```

`--usine` envoie `registre.mjs`, `adaptateurs.mjs` et `sonde.mjs` par `tar` dans un dossier jetable de l'usine, les lance avec node 24, les efface. Les clés de l'usine sont lues par `sudo -n cat` dans l'instant, jamais copiées. Hermes et OpenClaw reçoivent une **vraie tâche** (`tache.sh`, données publiques, `RESUME.md` attendu) après un contrôle de leurs sockets ; Codex un `codex exec` sous `chef-modele` ; les modèles Ollama un `/api/chat` en flux. **Les modèles locaux se chargent en mémoire** : la sonde les refuse de H:05 à H:20 UTC (cycle du chef) sans `--forcer`.

## Sortie réelle de la sonde (08/10/2026, 10:33 à 10:58 UTC, `node scripts/modeles/sonde.mjs --tous --usine`)

```
IA                     lieu   état         latence    détail
---------------------  -----  -----------  ---------  ------
claude_haiku           pc     OK           1132 ms    « OK » · 20 + 4 jetons
claude_haiku           usine  NON BRANCHÉ             appel réel : KO (cle_absente : aucune clé sur l'usine (voir docs/agents/modeles-ecosysteme.md)) | non branché : clé non déployée sur l'usine : le coffre refuse toute clé de modèle (coffre-regles.mjs, …
codex                  pc     OK           67259 ms   ✓ codex : répond en 65 s (code 0) · journal .orchestre\travail\executant\sonde-codex-2026-10-08-10-33-07.log
codex                  usine  OK           6248 ms    codex exec a répondu OK (compte chef-modele)
codex_gratuit          pc     NON BRANCHÉ  540 ms     appel réel : KO (configuration_absente : PRESTI_CODEX_GRATUIT_URL absent ou invalide) | non branché : l'exécutant existe mais PRESTI_CODEX_GRATUIT_URL / _CLE ne sont pas posées sur le PC
antigravity            pc     OK           27954 ms   ✓ sonde flash_lite : Antigravity répond
freellmapi_gemini      usine  KO           31 ms      quota : HTTP 429 {"error":{"message":"All models exhausted: 1 route checked (1 rate-limited or on cooldown). Add more API keys or wait for rate limits to reset. Soonest reset ~3…
freellmapi_mistral     usine  KO           9 ms       quota : HTTP 429 {"error":{"message":"All models exhausted: 2 routes checked (2 rate-limited or on cooldown). Add more API keys or wait for rate limits to reset. Soonest reset ~…
freellmapi_auto        usine  OK           9436 ms    « OK. Je suis un modèle de… » · servi par @cf/google/gemma-7b-it-lora
freellmapi_cloudflare  usine  KO           7 ms       quota : HTTP 429 {"error":{"message":"All models exhausted: 1 route checked (1 rate-limited or on cooldown). Add more API keys or wait for rate limits to reset. Soonest reset ~8…
freellmapi_cerebras    usine  NON BRANCHÉ             aucun appel possible | non branché : la clé Cerebras est posée dans freellmapi mais le catalogue appliqué n'a AUCUN modèle Cerebras (constat du 25/09, docs/contexte-cloud/SaaS/Produit/Ecosysteme-IA-Re…
groq                   usine  NON BRANCHÉ             aucun appel possible | non branché : EXCLU par Benj le 25/09 : aucune clé Groq ne sera posée
ollama_cloud           usine  KO           456 ms     quota : HTTP 429 {"error":"You reached the Free usage limit. Pro is $20/month for $60 of usage, with no 5-hour or weekly caps: https://ollama.com/upgrade (ref: 4067c365-d558-4f2…
ollama_chef_leger      usine  OK           3142 ms    « OK »
ollama_8b              usine  OK           84325 ms   « OK »
ollama_4b              usine  OK           6537 ms    « OK »
ollama_preneur_v2      usine  OK           22994 ms   « OK. »
ollama_preneur_v1      usine  NON BRANCHÉ  23230 ms   appel réel : OK (« OK ») | non branché : installé mais NON branché dans le preneur : la v1 refuse à tort 4 tâches faisables sur 12 (docs/agents/modele-maison-preneur.md) ; la v2 le remplace
ollama_vision          usine  OK           64904 ms   « OK »
ollama_pc              pc     NON BRANCHÉ  7819 ms    appel réel : OK (« OK ») | non branché : Ollama du PC n'est pas un service permanent (lancé à la demande pour OpenClaw du PC) ; la sonde dit s'il répond au moment de l'appel
hermes                 pc     KO           308512 ms  erreur : code 1 ✗ sonde hermes : ECHEC-AGENT · servi par ? · essais ollama/gpt-oss:120b-cloud:delai ; freellmapi/gemini-3-flash-preview:delai-total-epuise
hermes                 usine  KO           239433 ms  erreur : statut ECHEC-AGENT · code 1 · RESUME.md vide {"id":"20261008-104953-4fbcf5","agent":"hermes","donnees":"publique","demande":"freellmapi/ministral-14b","servi":null,"jetons_entree":null,"jeton…
openclaw               pc     KO           336911 ms  quota : code 1 ✗ sonde openclaw : ECHEC-AGENT · servi par ? · essais ollama/gpt-oss:120b-cloud:epuise-429-21600s ; freellmapi/gemini-3-flash-preview:epuise-429-300s ; freellmapi/ministral-14b:delai-to…
openclaw               usine  KO           272109 ms  quota : statut ECHEC-AGENT · code 1 · RESUME.md vide 2026-10-08T12:54:46.360+02:00 [state/database-verify] database integrity verification passed / 2026-10-08T12:54:46.361+02:00 [state/database-verify…
atomic_agent           pc     KO           35795 ms   quota : code 1 ✗ sonde atomicagent : ECHEC-AGENT · servi par ? · essais ministral-14b:limite-429 ; gemini-3-flash-preview:limite-429
perplexity             pc     NON BRANCHÉ             aucun appel possible | non branché : AUCUNE clé d'API Perplexity : seule la voie du chef (connecteur Claude) existe ; aucun agent de l'usine ne peut l'appeler, le script ne peut pas l'appeler non plus…
firecrawl              pc     NON BRANCHÉ  624 ms     appel réel : OK (clé valide · 244 crédits restants (rien consommé)) | non branché : clé valide mais aucun agent ne l'appelle (recherche_web est éteint et la garde de dépense de lib/agents/depense.mjs …
firecrawl              usine  NON BRANCHÉ  329 ms     appel réel : OK (clé valide · 244 crédits restants (rien consommé)) | non branché : idem : la clé est dans ~usine/.config/presti/firecrawl.key mais aucune unité ne la reçoit
fish_audio             pc     NON BRANCHÉ  508 ms     appel réel : OK (clé valide · solde 7416 (rien consommé)) | non branché : forfait gratuit NON commercial : la garde du dépôt (lib/studio/voixFish.ts) exige un forfait commercial prouvé ; usage interne…
fish_audio             usine  NON BRANCHÉ  398 ms     appel réel : OK (clé valide · solde 7416 (rien consommé)) | non branché : idem ; la clé est dans ~usine/.config/presti/fishaudio.key, aucune unité ne la reçoit

10 OK · 9 KO · 11 non branché(s) · 0 non sondé(s) · dépense de la sonde (Haiku) : 0.000004 $
```
(Les détails longs sont tronqués à l'affichage. La ligne `codex_gratuit` est celle d'une relance isolée après avoir corrigé son registre : lors de la passe complète, il était encore déclaré branché et sortait KO pour la même cause. Code de sortie de la passe complète : **1**, par construction : 9 IA déclarées branchées n'ont pas répondu.)

### Lecture, IA par IA

- **Répondent pour de vrai** (10) : `claude_haiku` (PC, 1,1 s), `codex` (PC 65 s, usine 6 s), `antigravity` (PC, l'IDE est ouvert), `freellmapi_auto` (le routeur répond, mais il a servi ce jour-là un petit modèle Cloudflare, gemma-7b-it-lora, parce que tout le reste était en quota), `ollama_chef_leger`, `ollama_8b` (84 s : chargement), `ollama_4b`, `ollama_preneur_v2`, `ollama_vision`.
- **KO : quota, donc réel et du jour** : `freellmapi_gemini`, `freellmapi_mistral` et `freellmapi_cloudflare` (HTTP 429, « All models exhausted »), `ollama_cloud` (« You reached the Free usage limit »). Conséquence mesurée : *tous* les modèles gratuits distants sont à sec ; Hermes, OpenClaw et AtomicAgent, qui n'ont que ceux-là, échouent avec eux.
- **KO : `hermes` (PC et usine), `openclaw` (PC et usine), `atomic_agent` (PC)** : le même quota (`ECHEC-AGENT`, `RESUME.md` vide, essais « épuisé-429 » / « limite-429 » / délai total épuisé dans leurs journaux). Ils sont bien branchés (leurs sockets /srv/hermes/relais et /srv/openclaw/relais existent, la tâche part), mais **aucune tâche réelle n'a abouti ce jour-là**.
- **NON BRANCHÉ avec une raison écrite** : `claude_haiku`@usine (clé non déployée : voir plus haut ; l'appel réel depuis l'usine rend KO `cle_absente`), `codex_gratuit` (variables d'environnement absentes), `freellmapi_cerebras` (aucun modèle Cerebras au catalogue du routeur, constat du 25/09 non revérifié car le routeur ne dit pas le fournisseur de ses modèles), `groq` (exclu par Benj), `ollama_preneur_v1` (installé, répond, volontairement non branché), `ollama_pc` (répond quand il est lancé), `perplexity` (aucune clé d'API : seule la voie du chef, par connecteur), `firecrawl` (clé valide, 244 crédits, aucune consommation par la sonde, mais aucun agent ne l'appelle), `fish_audio` (clé valide, solde 7 416, forfait gratuit non commercial, aucun agent ne l'appelle ; la synthèse elle-même n'est pas testée pour ne rien consommer).
- Aucune IA du registre n'est « NON SONDÉE » dans cette passe.

## Ce qui est vérifié, ce qui ne l'est pas, ce qui reste

Vérifié ce jour par un appel réel : tout ce qui est marqué OK ci-dessus ; l'appel de Haiku par le relais lui-même (`appelDirect`, plan JSON écrit, compteur à jour) ; `relais-ia-qa --temoin`, `preneur-qa` (22/22) ; `modeles-qa` (12/12, 21/21 sabotages).

Non vérifié ou à faire :
1. **Haiku sur l'usine** : clé non déployée (geste de Benj, ci-dessus). Tant que ce n'est pas fait, les agents du bus n'ont pas Haiku, même si le code du relais le prévoit.
2. **Les modèles gratuits distants sont tous à sec** : freellmapi (gemini, mistral, cloudflare) et Ollama Cloud. C'est exactement pourquoi Haiku vaut d'être déployé : sans lui, le chef retombe sur les locaux (lents) dès que Codex est à bout.
3. **Les adaptateurs du parc de la passerelle (`scripts/passerelle-code/adaptateurs/*.mjs`, 7 fichiers) sont des coquilles** : chacun copie la fiche vers `fait/`, écrit « Fait par <nom> » et inscrit un verdict `PASS` dans `verdicts.jsonl` **sans appeler aucune IA**. Tant qu'elles existent, `parc.mjs` annonce comme « branchées » des IA qui ne le sont pas, et une fiche peut passer PASS sans que personne l'ait faite. Le registre ne s'appuie sur aucune (MQ-10 le vérifie et signale le constat). Ce n'est pas mon périmètre (fichiers d'une autre session, non versionnés) : à remplacer par de vrais appels (ceux d'`agents-libres.mjs`, `antigravity.mjs`, `executant.mjs`) ou à retirer. De même `parc.mjs` donne au moteur `haiku` un coût « abonnement » alors qu'il est facturé au jeton.
4. Les agents qui passent par `lib/agents/relais.ts` (standardiste, facteur, rédacteur, veille pubs, douleurs, studio) n'ont pas Haiku : ce module est du TypeScript de l'application, hors de ce chantier, et leurs données sont presque toutes des données de prospect (Haiku y est interdit de toute façon).
5. Non couverts par le registre (ce ne sont pas des modèles de texte pour les agents) : Kokoro, faster-whisper, Laya, ElevenLabs, StarNet, Apify. Perplexity peut être appelé par Claude via le connecteur, pas par un script.
6. `ollama_pc` répond mais n'est pas un service permanent ; `freellmapi_cerebras` mérite un contrôle direct dans la base de freellmapi (l'API ne donne pas le fournisseur de chaque modèle).
