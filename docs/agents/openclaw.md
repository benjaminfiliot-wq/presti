# OpenClaw sur l'usine

OpenClaw est un agent open source qui tourne sur l'usine Oracle dans un conteneur isolé. Claude Code lui confie du travail sans enjeu (relire des documents publics, chercher sur le web, écrire des premiers jets, donner un avis après un échec) par `tache.sh`. C'est un outil interne : il n'est **pas une porte d'envoi**, il ne publie rien, n'achète rien et ne parle à personne.

Décision de Benj du 26/09 : OpenClaw est admis **confiné**, **modèles gratuits seulement**, **jamais l'abonnement Claude**, **aucun secret de Presti dans le conteneur**. Cette décision inverse l'ancien refus du 25/09 ; elle ne donne aucune permission de connecter l'abonnement Claude. La mise en service ne déduit aucun accord d'une décision d'outil : les gestes de Benj restent les siens (voir « Ce qui reste à Benj »).

L'installation date du 28/09. La fiche 026-221 la rattache à un profil écrit, vérifié par un juge et par un contrôle qui lit l'installation réelle.

## Origine, licence, empreinte (étape 1)

| | |
|---|---|
| Source | github.com/openclaw/openclaw ; docs.openclaw.ai/install/docker |
| Licence | MIT |
| Image | `ghcr.io/openclaw/openclaw:2026.9.6-slim`, révision eb377ac, publiée le 23/09/2026, arm64 |
| Empreinte | `sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15` |
| Relevée | sur l'usine le 04/10/2026 (`docker image inspect`), identique à celle de la fiche du 28/09 |

Le profil (`scripts/usine/openclaw/lanceur.mjs`) épingle l'image par cette empreinte, pas par son étiquette : une image dont l'empreinte change est refusée avant tout lancement.

**Ce que fait l'installateur** (`presti-ops/usine/openclaw/installer.sh`, lu en entier avant usage) : il crée le compte système `openclaw` (sans shell), pose les fichiers sous `/srv/openclaw`, crée le jeton de la passerelle une fois (jamais affiché), copie la clé freellmapi du compte usine en 600, **valide la configuration dans un conteneur jetable sans réseau** (une configuration invalide mettrait la passerelle en boucle de redémarrage), puis lance `docker compose up -d`. Il ne touche ni au pare-feu, ni à sshd, ni aux comptes `usine` et `agents`, ni à `/srv/presti-agents`.

**Greffons** : seuls `ollama` et `openai` (ce dernier pour le protocole compatible OpenAI de freellmapi) sont chargés. Refusés : `anthropic`, `codex`, `xai`, `github`, `cua-computer`, `browser`, `canvas`, `memory-core`. `models.mode = "replace"` : aucun catalogue intégré, donc aucun modèle Claude ou OpenAI par défaut. Le contrôle (voir plus bas) échoue si `anthropic` sort de la liste des greffons refusés.

## Le profil d'isolement (étapes 2 à 4)

Tenu par `configuration()` et `preparerLancement()` ; chaque refus arrive **avant** tout appel à docker et à une connexion.

- **Utilisateur** : uid 995, gid 989 (compte `openclaw`). Jamais root.
- **Système de fichiers** en lecture seule, toutes les capacités retirées, `no-new-privileges`. Jamais de mode privilégié, de réseau hôte, de périphérique, de `--env-file`, d'espace de noms de l'hôte.
- **Limites** : 4 Go, 1,5 cœur, 512 processus.
- **Montages** : dossiers dédiés sous `/srv/openclaw` seulement. Jamais `~`, le dépôt, le coffre `presti-secrets`, la socket Docker, ni un identifiant du PC.
- **Port d'administration** : `127.0.0.1:18800`, atteint par tunnel ssh. Rien n'est exposé.
- **Environnement** : une liste de **noms** fermée, aucune clé. Le lanceur ne lit jamais `process.env` en entier. Un nom contenant ANTHROPIC ou CLAUDE, ou une valeur commençant par `sk-ant-`, est refusé.

## Les sorties réseau et les modèles (étape 3)

Liste fermée de **voies modèles**, chacune avec sa sortie déclarée :

| Voie | Chemin | Donnée de prospect |
|---|---|---|
| `ollama-local` | Ollama de l'usine, `127.0.0.1:11434` par le pont | **oui, seule voie admise** |
| `ollama-cloud` | Ollama de l'usine relié au compte gratuit de Benj (`gpt-oss:120b-cloud`), déclaré `https://ollama.com` | jamais |
| `freellmapi` | `127.0.0.1:3001` par le pont | jamais |

Une origine qui n'est pas déclarée est refusée par `sortieAutorisee`, même interne : `127.0.0.1:22`, `host.docker.internal:22`, `169.254.169.254`, un nom de service non déclaré, un sosie comme `ollama.com.attaquant…`, une adresse avec identifiants. Jamais `anthropic.com` ni `claude.ai`.

`choisirModele` classe par la **voie** déclarée, pas par le nom du modèle (l'API directe d'Ollama Cloud n'a pas de suffixe `-cloud`). Une donnée de prospect, une classe absente, vide ou inconnue ne va qu'à l'Ollama local ; sans Ollama local, la tâche est refusée et l'outil reste arrêté. Seule une donnée déclarée `publique` ouvre Ollama Cloud et freellmapi. Dans la pratique, `tache.sh` exige `OPENCLAW_DONNEES=publique`, passe la consigne par `garde-prospects.mjs` (mêmes motifs que `scripts/usine.mjs`) et refuse sinon avec le code 4.

## Les clés des voies gratuites (étape 4) : un écart à connaître

La fiche demande de lire les credentials « depuis le coffre de l'usine ». Or le coffre `presti-coffre` **refuse par règle toute clé de modèle** (`scripts/usine/coffre-regles.mjs`, en-tête et R16 annulée : il ne reçoit que des jetons d'agents et les valeurs du pont Telegram) ; il ne contient aujourd'hui que `PRESTI_JETON_USINE`. Les clés sont donc lues ailleurs, sans jamais passer par l'environnement :

- **freellmapi** : copie en 600 de `~/.config/presti/freellmapi.key` (compte usine), propriété de `openclaw`, montée **en lecture seule** sur `/run/secrets/freellmapi.key`. Rafraîchie à chaque passage de `installer.sh` (rotation : relancer l'installateur sans `--config`, puis `docker restart openclaw`).
- **Ollama Cloud** : aucune clé dans le conteneur ; c'est l'Ollama de l'usine, relié au compte de Benj, qui parle au cloud.
- **Jamais** dans un fichier versionné, une preuve, un journal ou un argument de commande.

Si Benj veut un jour que ces clés passent par le coffre, il faut d'abord changer ses règles (`coffre-regles.mjs` et `presti-coffre.sh` dans le même commit), ce qui sort de cette fiche : à trancher par lui.

## Contrat du juge et installation réelle

Le juge (`scripts/juges-026-completude-qa.mjs --partie=openclaw`, écrit le 27/09) suppose un `docker run` à volumes **nommés**. L'installation réelle se lance par `docker compose` avec des dossiers dédiés et deux conteneurs. Les écarts sont écrits ici, jamais cachés ; `lanceur.mjs --controler` les imprime à chaque contrôle.

1. **Montages** : dossiers sous `/srv/openclaw` (liste fermée `montages_installation`), pas des volumes nommés. `preparerLancement` donne la forme `docker run` à volumes nommés, utile pour une relance de secours hors compose.
2. **Relais** : le conteneur `openclaw-relais` est en réseau hôte (Node seul, 128 Mo, lecture seule, toutes capacités retirées). Il porte les sockets Unix vers Ollama et freellmapi, parce que le pare-feu de l'usine refuse tout ce qui vient d'un réseau Docker vers l'hôte. On ne touche pas au pare-feu.
3. **Internet sortant** : le conteneur y garde accès (nécessaire à `web_search` et `web_fetch`). La liste fermée vaut pour les voies modèles, pas pour le web de l'agent : bloquer le reste demanderait iptables, interdit sur l'usine. Aucun jeton ni abonnement Claude n'est dans le conteneur, et le greffon `anthropic` est refusé : c'est la configuration, pas le réseau, qui ferme ce chemin.
4. **Service de métadonnées Oracle** (`169.254.169.254`) : joignable depuis le conteneur, comme depuis tout conteneur.

## Démarrer, arrêter, mettre à jour, journaux (étape 6)

Sur l'usine, compte `usine` (`ssh -i ~/.ssh/presti-usine usine@88.96.53.3`) :

```bash
docker ps --filter name=openclaw                       # openclaw : healthy ; openclaw-relais : Up
docker logs --tail 50 openclaw                         # journal de la passerelle
docker logs --tail 20 openclaw-relais                  # journal du relais
docker compose -f /srv/openclaw/compose.yaml up -d     # démarrer (reproductible : mêmes montages, même profil)
docker compose -f /srv/openclaw/compose.yaml restart openclaw
docker compose -f /srv/openclaw/compose.yaml down      # ARRÊTER les deux conteneurs
```

- **Une tâche** : `OPENCLAW_DONNEES=publique bash presti-ops/usine/openclaw/tache.sh consigne.md ./sortie` depuis le PC. `statut.txt` dit seulement que l'agent a fini : relire `resultats/` avant d'en tirer quoi que ce soit.
- **Mettre à jour** (image ou modèle) : jamais sans nouveau contrôle. Changer le tag dans `compose.yaml` (deux services) **et** l'empreinte dans `lanceur.mjs` ; `docker pull` ; vérifier l'espace (`df -h /`, l'image fait 4,9 Go) ; `installer.sh` ; `up -d` ; relancer les contrôles ci-dessous ; revérifier `docker exec openclaw node /app/openclaw.mjs cron list` (doit rester vide : battement de cœur, « dreaming » et revue des skills sont coupés). Un modèle nouveau est d'abord déclaré, avec sa voie, dans `configuration().modeles`.
- **Indisponibilité** : Ollama ou freellmapi à l'arrêt laisse l'outil arrêté ou en repli ; il ne bascule jamais vers une voie non gratuite. Si un contrôle est rouge, ne pas relancer : écrire la cause.

## Contrôler

```bash
node scripts/juges-026-completude-qa.mjs --partie=openclaw     # le juge : OC-0 à OC-13 et OC-R, hors réseau
node scripts/usine/openclaw/essai-local.mjs                    # l'essai local, tâche fictive, SIMULÉ
node scripts/usine/openclaw/controler-qa.mjs                   # le contrôle sait être vert, et rouge sur 35 fautes
node scripts/usine/openclaw/lanceur.mjs --controler            # docker inspect + config vivante de l'usine (lecture seule)
```

Le dernier est le seul qui lit l'installation réelle : il compare `docker inspect openclaw` au profil (image, utilisateur, lecture seule, capacités, limites, réseau, ports, montages, noms de variables, redémarrage) et la **configuration vivante** du conteneur aux modèles déclarés. Il n'imprime que des écarts, jamais une valeur.

## Coexistence avec le pont Telegram

Le pont (`presti-telegram`, voir `docs/agents/telegram.md`) est le seul transport des commandes de Benj et de ses alertes. OpenClaw ne le remplace pas et ne le double pas :

- le conteneur n'a ni `TELEGRAM_BOT_TOKEN`, ni `TELEGRAM_CHAT_ID`, ni `TELEGRAM_CODE_APPAIRAGE`, ni `PRESTI_JETON_TELEGRAM` (le contrôle refuse tout nom de variable hors liste) ;
- `tools.deny` contient la messagerie, les nœuds et les automatisations : pas de canal, pas de shell, pas de tâche planifiée ;
- il ne pose ni ne lève la pause générale (`docs/agents/pause-generale.md`) ;
- une commande d'envoi n'a qu'un propriétaire ; OpenClaw n'en est pas un. Les fonctions publiques restent coupées tant que la recette et ses permissions ne sont pas vertes.

Couper le pont (`systemctl stop presti-telegram`) et arrêter OpenClaw (`docker compose … down`) sont deux gestes indépendants.

## États honnêtes

- **Prouvé sur l'installation réelle (04/10/2026)** : conteneur sain, empreinte conforme, profil conforme, configuration vivante conforme, ports et montages conformes, `127.0.0.1:11434` et `:3001` joignables par le pont, l'hôte et le réseau privé refusent `11434` et `:3001` (`EHOSTUNREACH`).
- **Simulé** : l'essai local (`essai-local.mjs`), le quota freellmapi, la bascule de voie. Une simulation ne vaut ni réponse de modèle ni envoi.
- **Non mesuré** : la réponse d'un modèle local (Qwen3 8B) dans OpenClaw (le 4B a dépassé 7 minutes le 28/09 ; le partager bloquerait l'Ollama de l'usine, une demande à la fois) ; la consommation réelle du quota gratuit d'Ollama Cloud.
- **Bloqué** : rien, côté installation. Seul reste le choix des clés de modèle dans le coffre (voir plus haut).

## Ce qui reste à Benj

Rien pour faire tourner l'existant. Les décisions qui lui appartiennent : étendre un jour les missions d'OpenClaw au-delà des données publiques (jamais de prospect hors Ollama local), faire entrer les clés de modèle dans le coffre, et toute désinstallation (`/srv/openclaw`, compte `openclaw`, image) qui se fait sur son accord.
