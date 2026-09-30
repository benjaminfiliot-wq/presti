# Ollama sur l'usine : l'IA locale de Presti

Installé le 26/09/2026 vers 1 h (heure de Paris), soit le 25/09 vers 23 h UTC à l'horloge de l'usine, sur `usine@88.96.53.3`. Tout tourne sous le compte `usine`, sans root, sans sudo, sans Docker.

## En bref

- **Ce que c'est :** un serveur d'IA qui tourne sur l'usine même. Il n'a ni quota ni clé, et aucune donnée ne sort du serveur.
- **Adresse :** `http://127.0.0.1:11434`, joignable **depuis l'usine seulement**. Adresse compatible OpenAI : `http://127.0.0.1:11434/v1`.
- **Modèle par défaut :** `qwen3:4b-instruct-2507-q4_K_M`, **9 à 10 jetons/s** en génération quand l'usine travaille (jusqu'à 11,7 quand elle est calme).
- **Modèle pour les cas difficiles :** `qwen3:8b-q4_K_M`, **5 à 5,5 jetons/s** quand l'usine travaille (jusqu'à 6,35 quand elle est calme).
- **Relance :** un gardien le relance en quelques secondes s'il tombe (1,5 à 3,4 s mesurés, 6 s au plus). Après un redémarrage de l'usine, **la première arrivée par ssh, quelle qu'elle soit** (`ssh usine@… 'commande'`, `bash -s`, scp, `usine.mjs`, connexion), le relance avant que sa commande ne s'exécute (`~/.bashrc`, depuis le 26/09). **Entre le démarrage et cette première arrivée, il ne tourne pas** : un vrai démarrage automatique attend que Benj choisisse une des trois options de « Persistance ».
- **Données de prospects : PAS ENCORE.** Ce sera la seule IA autorisée à les traiter, mais seulement quand Benj l'aura validé. D'ici là, on n'y envoie que des données inventées.

## Ce qui est installé

| Élément | Détail |
|---|---|
| Version | **Ollama v0.34.4**, dernière version stable au 26/09/2026 (publiée le 23/09), vérifiée par l'API GitHub. |
| Archive | `ollama-linux-arm64.tar.zst`, 1 549 684 612 octets, prise sur https://github.com/ollama/ollama/releases/download/v0.34.4/. C'est la version ARM64 générique, pas `-jetpack5`/`-jetpack6`, qui sont réservées aux cartes Jetson. |
| **sha256 vérifié** | `96f50a1192133028cf4e010d8c333f8af14b1505db6be7b2034c11487e7fd7e6`. `sha256sum.txt` a été téléchargé à part depuis la même version, puis `sha256sum -c` a répondu **OK** avant toute extraction. |
| Extraction | Dans `~/ollama` seulement, **sans** `lib/ollama/cuda_v12` ni `cuda_v13`. Ces 2,19 Go de bibliothèques NVIDIA ne servent à rien : l'usine n'a pas de GPU. Restent `bin/` (25 Mo) et `lib/ollama/` (23 Mo). L'archive a été supprimée juste après. |
| Modèles | 2 modèles, 7,72 Go au total, dans `~/ollama/models` (plafond : 2 modèles, 10 Go). |

```
~/ollama/
├── bin/ollama               le programme
├── lib/ollama/              ses bibliothèques (CPU ARM, llama.cpp)
├── models/                  les modèles (OLLAMA_MODELS)
├── demarrer.sh              lance le serveur et son gardien s'ils ne tournent pas (copie : ollama-demarrer.sh, à côté de ce fichier)
├── gardien.sh               relance le serveur s'il tombe (copie : ollama-gardien.sh) ; verrou et pid dans .gardien.lock
├── tirer.sh                 seul chemin pour télécharger un modèle : refuse s'il crève un plafond (copie : ollama-tirer.sh)
├── bashrc-crochet.txt       les lignes posées en tête de ~/.bashrc (copie : ollama-bashrc-crochet.txt)
├── demarrer.sh.avant-gardien-2026-09-26   la version d'avant le gardien (c'est elle qui avait l'empreinte ef298a55…, annoncée à tort pour demarrer.sh)
├── serve.log                journal du serveur, de demarrer et du gardien (mis de côté en serve.log.1 au-delà de 20 Mo)
├── ARRET                    (absent) : s'il existe, rien n'est relancé et le gardien s'arrête
├── mesure.sh, mesure-json.sh   scripts de mesure
├── mesures/*.json           réponses brutes des mesures du 26/09
├── sha256sum.txt, contenu.txt  sommes publiées et liste de l'archive
└── pull-*.log               journaux des téléchargements de modèles
~/.ollama/id_ed25519         clé créée par le serveur au 1er démarrage, pour ollama.com ; inutilisée (pas de connexion, cloud coupé)
```

**Les copies du PC concordent-elles avec l'usine ?** Aucune empreinte n'est écrite ici : elle serait fausse à la prochaine modification. On la calcule des deux côtés, et les deux listes doivent être identiques :

```bash
# sur le PC, dans presti-ops/usine
sha256sum ollama-demarrer.sh ollama-gardien.sh ollama-tirer.sh ollama-bashrc-crochet.txt
ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'cd ~/ollama && sha256sum demarrer.sh gardien.sh tirer.sh bashrc-crochet.txt'
```

## Les modèles et leurs mesures

Mesures prises le 26/09/2026 sur l'usine à **4 OCPU / 24 Go** (`nproc` = 4), par `/api/generate` sans flux.

- **Génération** = `eval_count / eval_duration`.
- **Lecture** = `prompt_eval_count / prompt_eval_duration`.
- **« Sans cache »** : un préfixe unique force la relecture de toute la consigne. Répétée à l'identique, une consigne sort du cache et donne de fausses lectures, de 470 à 570 jetons/s.
- **Deux fourchettes, parce que la vitesse dépend de ce que fait l'usine à côté.** Ollama tourne à nice 10 : dès que Codex, un juge ou Chromium prend le processeur, il lui cède la place.
  - **« Usine en service »** : les passes d'un juge indépendant, le 26/09, pendant que l'usine travaillait. **C'est la fourchette à retenir pour prévoir un délai.**
  - **« Usine calme »** : 4 passes par modèle le 26/09 à 23:48 UTC, charge 0,2, un seul `codex exec` en attente réseau (`mesure.sh`, étiquettes `verif-4b-*` et `verif-8b-*`).
- **D'une passe à l'autre, l'écart dépasse parfois 30 %.** Le juge a vu une passe du 4B à 7,1 jetons/s et une du 8B à 3,6. Un agent prévoit donc un délai large (5 min) et ne conclut jamais d'une seule passe.

| Modèle | Taille | Mémoire chargé (contexte 8192) | Génération, usine en service | Génération, usine calme | Lecture, en service / calme | Premier chargement |
|---|---|---|---|---|---|---|
| **`qwen3:4b-instruct-2507-q4_K_M`** (par défaut) | 2,5 Go | 3,9 Go | **9 à 10 jetons/s** (médiane 9,07 sur 6 passes ; la plus lente 7,1) | 11,5 à 11,7 | **34 à 37** / 36 à 40 jetons/s | 5,3 à 5,8 s |
| `qwen3:8b-q4_K_M`, avec `think: false` | 5,2 Go | 6,2 Go | **5 à 5,5 jetons/s** (médiane 5,11 ; la plus lente 3,6) | 6,2 à 6,35 | **19 à 20** / 19 à 22 jetons/s | 9,1 à 9,8 s |
| `qwen3:8b-q4_K_M` en mode réflexion (par défaut chez ce modèle) | idem | idem | non mesuré en service | 5,95 jetons/s, mais 295 jetons pour une réponse de 3 phrases | 20,5 (calme) | — |

La réponse JSON, plus longue, sort un peu plus lentement que la courte réponse de secrétaire : 8,7 à 10,2 jetons/s pour le 4B et 5,8 pour le 8B, usine calme.

Licence Apache 2.0 pour les deux : usage commercial permis.

**Essai 1, la secrétaire :** « Un client écrit : "Bonjour, j'ai une fuite sous l'évier, vous pouvez passer quand ?" Réponds en 3 phrases comme la secrétaire d'un plombier. »

- **4B, 5,6 à 6,4 s à chaud :** « Bonjour, merci pour votre message. Nous pouvons passer dans la journée, selon notre disponibilité. Veuillez me confirmer votre adresse et le moment souhaité, pour que nous puissions vous proposer un créneau adapté. » C'est correct et prudent, mais passe-partout.
- **8B sans réflexion, 10,4 à 11,1 s à chaud :** « Bonjour, merci pour votre message. Nous serons sur place dès que possible pour inspecter et réparer la fuite sous l'évier. Veuillez nous préciser votre adresse pour que nous puissions planifier notre intervention. » Le ton est plus naturel et plus concret, mais **deux fois sur trois il invente un créneau** (« demain matin dès 8h30 »).
- **8B avec réflexion, 52,8 s :** 1 137 caractères de réflexion pour une réponse qui n'est pas meilleure. **À ne pas utiliser : toujours passer `think: false`.**

**Essai 2, extraction JSON** d'une fiche d'entreprise **inventée** (8 champs, `format: "json"`, `temperature: 0`) :

- les deux modèles rendent un JSON valide et **juste sur les 8 champs** ;
- **4B : 27 à 30 s**, pour 325 jetons lus et 160 générés ;
- **8B : 44 s**, pour 332 jetons lus et 157 générés.

**Pourquoi le 4B est le modèle par défaut :**

- il est aussi juste que le 8B sur l'extraction, qui est le vrai travail des agents ;
- il génère et lit environ 1,8 fois plus vite ;
- il prend 2,3 Go de mémoire de moins.

On garde le 8B pour ce qui demande plus de finesse : une rédaction plus naturelle, un raisonnement en plusieurs étapes.

**À savoir pour le choix :**

- Un seul modèle est chargé à la fois. Passer de l'un à l'autre coûte un rechargement de 5 à 9 s.
- Un agent garde donc un seul modèle pour toute une série.

**Les deux modèles inventent parfois des engagements.** Même avec la consigne « sans inventer de rendez-vous », le 4B a répondu « à partir de 14h ». Une réponse de l'IA locale ne part donc **jamais** telle quelle chez un client ou un prospect.

**Ordres de grandeur à 4 OCPU, avec le 4B, usine en service :**

- une page de 2 000 jetons se lit en 55 à 60 s (50 s usine calme) ;
- une réponse de 150 jetons s'écrit en 15 à 17 s (13 s usine calme, 21 s sur une passe lente).

C'est fait pour le travail de fond des agents, pas pour une conversation en direct.

## Appeler l'IA depuis un agent

Toujours **sur l'usine** : un agent lancé par `usine.mjs` (Codex, juge, script de la veille) ou un script lancé par ssh. Il n'y a pas de clé : un SDK OpenAI qui en exige une accepte n'importe quelle valeur, par exemple `ollama`.

### curl

```bash
# Santé
curl -s http://127.0.0.1:11434/api/version            # {"version":"0.34.4"}
curl -s http://127.0.0.1:11434/api/tags | jq '.models[].name'   # modèles installés
curl -s http://127.0.0.1:11434/api/ps                 # modèle chargé en mémoire, et jusqu'à quand

# Adresse native : JSON imposé, réflexion coupée, mesures de vitesse dans la réponse
curl -s http://127.0.0.1:11434/api/generate -d '{
  "model": "qwen3:4b-instruct-2507-q4_K_M",
  "prompt": "Extrais le métier et la ville en JSON {\"metier\":\"...\",\"ville\":\"...\"} : Menuiserie Exemple, menuisier à Villefictive.",
  "format": "json", "think": false, "stream": false, "options": {"temperature": 0}
}' | jq -r '.response'

# Adresse compatible OpenAI
curl -s http://127.0.0.1:11434/v1/chat/completions -H 'Content-Type: application/json' -d '{
  "model": "qwen3:4b-instruct-2507-q4_K_M",
  "messages": [{"role": "user", "content": "Dis bonjour en une phrase."}]
}' | jq -r '.choices[0].message.content'
```

Avec le 8B, ajouter `"think": false` sur `/api/generate` et `/api/chat`, sinon il réfléchit de longues secondes avant de répondre. Le 4B `instruct-2507` ne réfléchit jamais.

### Node (fetch intégré, Node 18+)

Cet exemple a été testé sur l'usine le 26/09. Réponses obtenues : un texte de secrétaire en 3 phrases, puis `{ metier: 'menuisier', ville: 'Villefictive-sur-Loire' }` à 12,1 jetons/s, le tout en 15 s.

```js
const OLLAMA = 'http://127.0.0.1:11434'

// Adresse compatible OpenAI (/v1)
async function discuter(message, modele = 'qwen3:4b-instruct-2507-q4_K_M') {
  const r = await fetch(`${OLLAMA}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modele,
      messages: [
        { role: 'system', content: 'Tu es la secrétaire d\'un plombier. Réponds en français, en 3 phrases.' },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(300_000), // CPU seul : de quelques secondes à quelques minutes
  })
  if (!r.ok) throw new Error(`Ollama ${r.status} : ${await r.text()}`)
  return (await r.json()).choices[0].message.content
}

// Adresse native (/api) : JSON imposé, réflexion coupée
async function extraire(texte, modele = 'qwen3:4b-instruct-2507-q4_K_M') {
  const r = await fetch(`${OLLAMA}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modele,
      prompt: `Extrais le métier et la ville. Réponds uniquement en JSON {"metier": "...", "ville": "..."}.\n\n${texte}`,
      format: 'json', think: false, stream: false, options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(300_000),
  })
  if (!r.ok) throw new Error(`Ollama ${r.status} : ${await r.text()}`)
  const j = await r.json()
  return { resultat: JSON.parse(j.response), vitesse: `${(j.eval_count / (j.eval_duration / 1e9)).toFixed(1)} jetons/s` }
}
```

Avec le SDK `openai` : `new OpenAI({ baseURL: 'http://127.0.0.1:11434/v1', apiKey: 'ollama' })`.

**Une requête à la fois.** Les autres attendent en file (`OLLAMA_NUM_PARALLEL=1`). Un agent prévoit donc un délai généreux, par exemple 5 min, et ne lance pas dix requêtes en parallèle en croyant aller plus vite.

**Depuis le PC, pour un essai seulement :** `ssh -i ~/.ssh/presti-usine -N -L 11434:127.0.0.1:11434 usine@88.96.53.3` ouvre un tunnel chiffré. L'IA répond alors sur `127.0.0.1:11434` du PC tant que le tunnel est ouvert. Le port n'est jamais ouvert sur Internet.

## Les réglages

Ils sont posés **dans `~/ollama/demarrer.sh` seulement**, jamais dans `~/.bashrc` ni dans `~/.profile` : ces deux fichiers ne font qu'appeler `demarrer.sh`. Le journal `serve.log` les confirme, à la ligne « server config ».

| Variable | Valeur | Pourquoi |
|---|---|---|
| `OLLAMA_HOST` | `127.0.0.1:11434` | Écoute locale seulement. Jamais `0.0.0.0` ni `88.96.53.3`. |
| `OLLAMA_MODELS` | `~/ollama/models` | Tout reste dans `~/ollama`. |
| `OLLAMA_NUM_PARALLEL` | `1` | Une requête à la fois. |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | Un seul modèle en mémoire. |
| `OLLAMA_KEEP_ALIVE` | `10m` | Déchargé après 10 min sans requête (vérifié : `expires_at` = dernière requête + 10 min). |
| `OLLAMA_CONTEXT_LENGTH` | `8192` | Contexte par défaut. Sans ce réglage, Ollama prend 4096 quand il n'y a pas de GPU. |
| `OLLAMA_NO_CLOUD` | `1` | Coupe les modèles « cloud » et la recherche web d'ollama.com : rien ne sort. |
| `nice` | 10, absolu | Codex et freellmapi passent devant en cas de contention. `demarrer.sh` calcule l'écart depuis sa propre priorité : relancé par le gardien (lui-même à nice 10), le serveur reste à 10, pas à 19. |
| `oom_score_adj` | `300` | En cas de manque de mémoire, le noyau tue Ollama avant Codex et freellmapi. Le processus du modèle (`llama-server`) en hérite (vérifié). |

`ionice` n'a pas d'effet ici : le disque de l'usine est sans ordonnanceur (`none`).

## Persistance : qui relance Ollama

**Aucun service système** : il n'y a pas de cron sur cette image Ubuntu Minimal, ni de lingering systemd, et les deux demandent root. Sans root, trois mécanismes sont posés :

- le gardien couvre les plantages ;
- `~/.bashrc` couvre **toute** arrivée par ssh, commandes non interactives comprises ;
- `~/.profile` couvre les connexions et `usine.mjs` (il double `~/.bashrc`, sans effet de plus).

**Le démarrage de l'usine lui-même n'est couvert par rien.** Ollama reste arrêté du démarrage jusqu'à la première arrivée par ssh. Sur cette machine, tout travail arrive par ssh : pas de cron, pas de lingering, et Docker ne relance que freellmapi, qui n'appelle pas Ollama. Un agent ne le trouve donc pas fermé en pratique. Mais « relancé au démarrage, sans personne » attend toujours une des trois options de la section 4.

| Événement | Qui relance | Délai mesuré |
|---|---|---|
| Serveur planté, tué (`pkill`, `kill -9`) ou tué par manque de mémoire | le gardien | 1,5 à 3,4 s (6 s au plus : 5 s pour le voir, 1 s pour repartir) |
| Gardien tué, ou les deux | la prochaine arrivée par ssh, quelle qu'elle soit (`~/.bashrc`) | avant la commande : l'API répondait dès le premier `curl` de la commande |
| Redémarrage de l'usine | la première arrivée par ssh (`~/.bashrc`) ; **rien avant elle** sans une des trois options | avant la commande |

### 1. Le gardien (posé le 26/09)

`~/ollama/gardien.sh` est lancé par `demarrer.sh` (setsid, nice 10), une seule fois : il tient le verrou `~/ollama/.gardien.lock`, qui contient son pid. Il ne fait rien d'autre que ceci :

- toutes les 5 s, il regarde si `ollama serve` tourne ; sinon il appelle `demarrer.sh --silencieux`, qui garde tous les réglages ;
- un serveur qui avait tenu 30 s est relancé tout de suite ; un serveur qui retombe moins de 30 s après sa relance (port pris, fichier abîmé) l'est de plus en plus lentement : 10 s, 20 s, 40 s… 5 min au plus, pour ne pas tourner en rond ;
- il s'arrête de lui-même dans les 5 s qui suivent la création de `~/ollama/ARRET` ;
- chaque relance est notée dans `serve.log` (lignes `gardien :` et `demarrer :`).

**Processus de modèle orphelins.** Un serveur tué net (`kill -9`, plantage) laisse son `llama-server` en vie, rattaché à init, avec ses 4 à 6 Go de mémoire. Vu le 26/09 : un orphelin de 4 Go est resté après un `kill -9`. Avant chaque lancement, `demarrer.sh` arrête donc les `llama-server` de `~/ollama/lib/ollama` dont le parent n'est pas un `ollama serve` vivant, et le note (« processus de modèle orphelins arrêtés »).

**Prouvé le 26/09 sur l'usine réelle** (aucune requête en cours, vérifié par `ss` juste avant) :

- mise en place sans coupure : le serveur déjà lancé a été gardé (même pid avant et après) ;
- `pkill` du serveur avec le 4B chargé : l'API répond de nouveau en **2,8 s**, le `llama-server` s'est arrêté avec lui ;
- `kill -9` du serveur avec le 4B chargé : de nouveau en **1,5 s**, et l'orphelin de 4 Go a été arrêté ;
- à vide, `pkill` puis `kill -9` : **3,4 s** et **2,1 s** ;
- à chaque fois : nouveau pid, nice 10, oom_score_adj 300, écoute sur `127.0.0.1:11434` seulement ;
- gardien tué, puis `node scripts/usine.mjs etat` depuis le PC : code 0, gardien relancé, serveur inchangé.

**Prouvé sur une copie d'essai** (`/tmp/ollama-essai`, port 11435, sans modèle) :

- `ARRET` créé : le gardien s'arrête, un `pkill` n'est suivi d'aucune relance pendant 20 s, et `demarrer.sh` ne lance rien ;
- `ARRET` retiré, puis `demarrer.sh` : serveur et gardien repartent ;
- deux `pkill` à 35 s d'écart : relancé en 1,7 s puis 0,7 s ; un troisième 3 s après la relance : 7,5 s ;
- port pris par un autre programme : `demarrer.sh` rend le code 1 (« s'est arrêté aussitôt ») mais lance quand même le gardien ; tentatives à 0, 10, 31, 72 et 153 s, et la dernière reprend seule, le port ayant été libéré entre-temps.

**Ses limites :**

- il ne survit pas à un redémarrage de l'usine ;
- un `pkill -f ollama` le tue aussi, car son chemin contient « ollama ». Pour arrêter le serveur seul, toujours viser le chemin exact (plus bas).

### 2. `~/.profile` (posé)

Une ligne ajoutée en fin de fichier appelle `~/ollama/demarrer.sh --silencieux` à chaque connexion. L'ancien fichier est sauvegardé dans `~/.profile.avant-ollama-2026-09-26`. Le script est silencieux, idempotent, et rend la main en moins d'une seconde. Il relance le serveur **et** le gardien s'ils manquent.

- **Ce qui le déclenche :**
  - toutes les commandes de `scripts/usine.mjs` (`etat`, `preparer`, `lancer`, `recuperer`, `nettoyer`, `executer`), dont le préambule charge `~/.profile` ;
  - toute connexion ssh interactive.
- **Prouvé le 26/09 :**
  - Ollama arrêté, puis `node scripts/usine.mjs etat` lancé depuis le PC : sortie normale, code 0, et Ollama relancé (nouveau pid, nice 10, oom 300) ;
  - avec `~/ollama/ARRET` présent, rien n'est relancé ;
  - `ARRET` retiré, Ollama repart.
- **Ce qui ne le déclenche pas :** `ssh usine@… 'une commande'` et la veille planifiée du PC (`usine-veille.mjs`, qui lance `bash -s` sans ce préambule) ne chargent pas `~/.profile`. Depuis le 26/09 à 00:11 UTC, c'est `~/.bashrc` qui les couvre (section 3).

### 3. `~/.bashrc` : toute arrivée par ssh (posé le 26/09, 00:11 UTC)

Bash lit `~/.bashrc` pour **toute** commande reçue par ssh, même non interactive : `ssh usine@… 'commande'`, `bash -s`, scp et sftp. C'est ainsi que Debian et Ubuntu compilent bash (`SSH_SOURCE_BASHRC`). Mais ce fichier rend la main aussitôt à un shell non interactif (`case $- in … return`). Le crochet est donc posé **en tête**, avant ce `return`.

- Texte exact : `ollama-bashrc-crochet.txt`, à côté de ce fichier (copie sur l'usine : `~/ollama/bashrc-crochet.txt`).
- Ancien fichier sauvegardé dans `~/.bashrc.avant-ollama-2026-09-26`. Le nouveau est le crochet suivi de l'ancien, octet pour octet (vérifié par `cmp` avant de le mettre en place).
- Il appelle `demarrer.sh --silencieux` avec sortie et entrée coupées (`>/dev/null 2>&1 </dev/null`). scp et les sorties JSON n'en voient rien, et il ne mange pas le script envoyé à `bash -s`.
- Coût quand Ollama tourne déjà : 17 ms par connexion (mesuré).

**Prouvé le 26/09 sur l'usine réelle.** Serveur et gardien arrêtés par `ARRET`, puis `ARRET` retiré sans rien relancer : port fermé (`curl` code 7). Ensuite :

- `ssh usine@… 'curl …/api/version'`, sans connexion interactive ni `usine.mjs` : `{"version":"0.34.4"}` au premier essai, code 0. Le serveur est parti dans la seconde de la connexion, avant la commande : nice 10, oom_score_adj 300, gardien relancé, écoute sur `127.0.0.1:11434` seulement ;
- même essai en `bash -s`, le script arrivant par l'entrée standard comme pour la veille : les 3 lignes du script exécutées, `curl` code 0 ;
- avec `ARRET` présent : rien relancé, `curl` code 7 ;
- rien de cassé : `scp` depuis l'usine rend un fichier identique, `ssh 'echo x'` rend exactement `x`, `node scripts/usine.mjs etat` rend le code 0 et sa sortie normale.

**Sa limite : il agit à l'arrivée, pas au démarrage.** Entre le redémarrage et la première connexion ssh, Ollama ne tourne pas. Un programme qui ne passe pas par ssh (un conteneur Docker, une future unité systemd) le trouverait fermé. Pour cela, il faut une des trois options de la section 4.

### 4. Le redémarrage de l'usine : trois options, aucune posée (chacune attend le « oui » de Benj)

Chacune est une configuration permanente, et la A et la C sont des gestes root : c'est à Benj de choisir.

**Refaire l'essai une fois l'option posée.** Redémarrer l'usine (ou attendre le prochain redémarrage), puis attendre 5 minutes **sans se connecter**. Ensuite seulement, lancer `ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'uptime -s; ps -o lstart= -p "$(pgrep -u usine -xf "$HOME/ollama/bin/ollama serve")"'`.

- L'option marche si le serveur est parti **dans la minute qui suit le démarrage**.
- Un `curl` seul ne prouve plus rien : la connexion qui le porte relance Ollama elle-même (section 3). Dans ce cas, le serveur aurait l'heure de cette connexion, pas celle du démarrage.

- **A. cron, recommandé.** Il couvre le redémarrage même quand le PC est éteint, en un seul geste root.
  - Sous `ubuntu` : `ssh -i ~/.ssh/presti-usine ubuntu@88.96.53.3 'sudo apt-get install -y cron'`.
  - Puis sous `usine`, en conservant les lignes existantes : `(crontab -l 2>/dev/null; echo '@reboot $HOME/ollama/demarrer.sh --silencieux') | crontab -`. Le gardien fait le reste, une ligne `*/5` n'est plus utile.
- **B. Chien de garde du PC** (détail ci-dessous). Aucun geste root, mais il ne relance qu'une fois le PC allumé et la session Windows ouverte.
- **C. systemd utilisateur.** `sudo loginctl enable-linger usine` sous `ubuntu`, puis une unité `~/.config/systemd/user/ollama.service` avec `Type=oneshot`, `RemainAfterExit=yes`, `ExecStart=%h/ollama/demarrer.sh --silencieux` et `WantedBy=default.target`, activée par `systemctl --user enable ollama`. Pas essayé.

**Détail de l'option B.** Toutes les 5 minutes, tant que la session Windows est ouverte, la tâche appelle `demarrer.sh --silencieux` par ssh. C'est idempotent : si Ollama tourne, rien ne se passe. La commande ssh a été essayée à la main le 26/09 avec l'ssh de Windows : « déjà en marche », code 0.

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\conhost.exe' -Argument '--headless C:\Windows\System32\OpenSSH\ssh.exe -i C:\Users\benja\.ssh\presti-usine -o BatchMode=yes -o ConnectTimeout=15 usine@88.96.53.3 "~/ollama/demarrer.sh --silencieux"'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Presti usine ollama' -Action $action -Trigger $trigger -Settings $settings -Description 'Relance Ollama sur l usine s il ne tourne pas (~/ollama/demarrer.sh)'
```

Pour la retirer : `Unregister-ScheduledTask -TaskName 'Presti usine ollama' -Confirm:$false`.

### Arrêter, relancer

```bash
# (sur l'usine)
~/ollama/demarrer.sh                              # relancer (dit « déjà en marche » et « gardien déjà en veille » s'ils tournent)
touch ~/ollama/ARRET && pkill -u usine -xf "$HOME/ollama/bin/ollama serve"   # arrêter DURABLEMENT : sans ARRET, le gardien le relance en 6 s au plus
rm ~/ollama/ARRET && ~/ollama/demarrer.sh         # lever l'arrêt et relancer (serveur et gardien)
~/ollama/bin/ollama stop qwen3:8b-q4_K_M          # décharger un modèle de la mémoire sans arrêter le serveur
tail -f ~/ollama/serve.log                        # journal (serveur, demarrer, gardien)
grep -E 'gardien|demarrer' ~/ollama/serve.log | tail   # les relances seulement
```

`pkill -xf` avec le chemin complet n'arrête que **ce** serveur : ni le gardien, ni Codex, ni freellmapi, ni Claw3D. Un `pkill` sans `ARRET` est un plantage aux yeux du gardien : il relance.

## Les règles

1. **Privé.** Ollama écoute sur `127.0.0.1:11434` et nulle part ailleurs.
   - Vérifié le 26/09 : `ss -ltn` ne montre que `127.0.0.1:11434`, et depuis le PC, `http://88.96.53.3:11434` ne répond pas (délai dépassé).
   - Jamais `OLLAMA_HOST=0.0.0.0`, jamais de règle de pare-feu, jamais de tunnel public (ngrok et consorts).
2. **Rien ne sort.**
   - `OLLAMA_NO_CLOUD=1` coupe les modèles `…-cloud` et la recherche web.
   - Ne jamais faire `ollama signin`, ni tirer un modèle `-cloud`.
   - Ne jamais lancer `OLLAMA_DEBUG=1` avec des données réelles : le journal contiendrait les consignes.
   - `ollama run` en interactif garde un historique dans `~/.ollama/history` : pour des données réelles, passer par l'API.
3. **Données de prospects.** Ollama sera la **seule** IA autorisée à les traiter, parce que tout reste sur le serveur. **Mais pas avant que Benj l'ait validé explicitement.** Au 26/09, ce n'est pas le cas : on n'y envoie que des données inventées. Les IA gratuites (freellmapi et les autres) restent interdites pour ces données, dans tous les cas.
4. **Une réponse de l'IA locale ne part jamais telle quelle** chez un client ou un prospect. Les deux modèles ont inventé des créneaux pendant les essais. Elle sert à lire, trier, extraire et préparer un brouillon, qui est ensuite relu.
5. **Ressources.**
   - Au plus 2 modèles et 10 Go de modèles. **Les deux places sont prises** (7,72 Go).
   - Au moins 8 Gio de disque libre, lus avec `df -h ~` (colonne *Avail*, en Gio : 1 Gio = 1,07 Go). **Ce chiffre bouge avec le reste de l'usine** (Codex, veille, captures) : le relire à chaque fois, ne jamais se fier à un chiffre écrit ici.
     - Relevé le 25/09 à 23:51 UTC : `df -h ~` affiche **9.8G**, soit 9,72 Gio ou 10,44 Go en milliards d'octets. Les « 10,4 Go » d'avant et les « 9,8 » du juge disaient la même chose dans deux unités.
     - **La marge au-dessus du plancher n'est que de 1,7 Gio.** Aucun modèle ne peut être ajouté ni remplacé par un plus gros sans passer sous le plancher.
   - Au moins 3 Go de mémoire disponible pour Codex et freellmapi : 16,9 Go disponibles le 26/09 avec le 8B chargé.
   - **Tout téléchargement de modèle passe par `~/ollama/tirer.sh`**, jamais par `ollama pull` en direct (section suivante). Un 3e modèle impose d'abord d'en retirer un (`~/ollama/bin/ollama rm <tag>`), puis de relire `df -h ~`.

## Ajouter ou remplacer un modèle : `tirer.sh`

`~/ollama/tirer.sh` fait le `ollama pull` **seulement si les plafonds tiennent après le téléchargement**. Sinon il refuse et ne télécharge rien. Il ne supprime jamais rien : retirer un modèle reste un geste décidé.

```bash
# (sur l'usine)
df -h ~                                        # d'abord : ce qui est libre maintenant
~/ollama/tirer.sh --essai qwen3:1.7b           # dit ce qu'il ferait, sans rien télécharger
~/ollama/bin/ollama rm qwen3:8b-q4_K_M         # libérer une place, si c'est décidé
~/ollama/tirer.sh qwen3:1.7b                   # télécharge si tout passe
```

Ce qu'il vérifie, en lisant la taille dans le manifeste du registre (quelques Ko ; seules les couches absentes de `~/ollama/models/blobs` comptent) :

- 2 modèles au plus ;
- 10 Go de modèles au plus, en milliards d'octets (`du -sb ~/ollama/models`) ;
- au moins 8 Gio libres **après** le téléchargement (`df`, en Gio comme `df -h`) ;
- le registre Ollama seulement : `hf.co/…` et tout autre hôte sont refusés, comme tout modèle `…cloud`.

Codes : 0 fait (avec `--essai` : passerait) ; 2 usage ; 3 refusé par un plafond ; 4 registre ou serveur injoignable.

**Essayé le 25/09 vers 23:50 UTC, sans rien télécharger** (`~/ollama/models` : 7 722 683 617 octets avant et après) :

| Commande | Résultat |
|---|---|
| `--essai qwen3:4b-instruct-2507-q4_K_M` (déjà là) | 0 Go à télécharger, passerait, code 0 |
| `--essai qwen3:1.7b` | refusé : déjà 2 modèles (il laisserait 8,46 Gio libres), code 3 |
| `qwen3:1.7b`, **sans** `--essai` | même refus, rien téléchargé, code 3 |
| `--essai qwen3:14b` | refusé trois fois : 2 modèles, 17 Go de modèles, 1,09 Gio libres, code 3 |
| `--essai hf.co/unsloth/x:q4` | refusé : autre hôte, code 3 |
| `--essai gpt-oss:120b-cloud` | refusé : modèle cloud, code 3 |
| `--essai qwen3:inexistant-zz` | manifeste introuvable (404), code 4 |

## Ce que change le passage à 4 OCPU / 24 Go

Benj a fait le changement le 26/09, pendant l'installation. L'usine a redémarré à 22:50 UTC. La métadonnée de l'instance donne `VM.Standard.A1.Flex`, `ocpus: 4.0`, `memoryInGBs: 24.0`.

- **Toutes les mesures ci-dessus sont à 4 OCPU / 24 Go.** Il n'y a aucune mesure à 2 OCPU.
- **Le contexte est passé de 4096 à 8192**, puisque la mémoire le permet. Le 8B chargé prend 6,2 Go sur 24, et il reste 16,9 Go disponibles.
- **Si l'usine repasse à 2 OCPU / 12 Go**, ce qui suit n'est pas mesuré :
  - attendre environ la moitié des vitesses : 4,5 à 6 jetons/s pour le 4B, 2,5 à 3 jetons/s pour le 8B ;
  - remettre `OLLAMA_CONTEXT_LENGTH=4096` dans `demarrer.sh` ;
  - n'utiliser que le 4B, car le 8B prendrait 6 Go sur 12 à côté de Codex et du Studio Claw3D.
- **⚠ À vérifier par Benj dans la console Oracle.** `LISEZMOI.md`, section « Limites à connaître », cite InfoQ : depuis le 15/06/2026, Always Free = **2 OCPU / 12 Go**.
  - Toujours d'après InfoQ, un compte Free Tier au-dessus de ces limites voit ses instances arrêtées jusqu'à ce qu'on les réduise.
  - Un compte Pay-As-You-Go garderait 4/24 sans frais, mais Oracle ne l'a pas documenté.
  - Le changement a été accepté, ce qui va plutôt dans le bon sens.
  - Reste à vérifier deux pages de la console :
    - Governance → *Limits, Quotas and Usage* → Compute : la limite A1 Always Free ;
    - Billing → *Cost Analysis*, le lendemain : 0 €.
  - Ollama ne dépend de rien de tout cela : si l'instance est réduite, `demarrer.sh` marche tel quel.

## Refaire les mesures

```bash
# (sur l'usine)
~/ollama/mesure.sh qwen3:4b-instruct-2507-q4_K_M defaut essai-4b   # « defaut » ; pour le 8B, passer false (réflexion coupée)
~/ollama/mesure-json.sh qwen3:4b-instruct-2507-q4_K_M essai-json   # extraction JSON d'une fiche inventée
```

Chaque script donne le chargement, la lecture, la génération, `nproc` et la mémoire, et écrit la réponse brute dans `~/ollama/mesures/<étiquette>.json`.
