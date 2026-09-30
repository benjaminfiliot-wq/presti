# OpenClaw sur l'usine (installé le 28/09/2026)

OpenClaw est l'agent open source (licence MIT) de la fondation OpenClaw. Il tourne sur l'usine Oracle dans un conteneur isolé. Il ne se sert QUE de modèles gratuits, et Claude Code lui confie du travail sans enjeu par `tache.sh`.

- **Source officielle :** https://github.com/openclaw/openclaw et https://docs.openclaw.ai/install/docker
- **Image :** `ghcr.io/openclaw/openclaw:2026.9.6-slim`, version 2026.9.6 (révision eb377ac, publiée le 23/09/2026), arm64
  - empreinte : `sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15`
- **Conditions de Benj (26/09), toutes tenues :**
  - jamais l'abonnement Claude, jamais de clé Anthropic : le greffon `anthropic` est interdit dans la config ;
  - isolé dans Docker, sans aucun port ouvert vers l'extérieur ;
  - modèles gratuits seulement ;
  - aucun secret de Presti dans le conteneur.

## Ce qu'il sait faire, et ce qu'on ne lui donne pas

- **Missions prévues :** relire des documents publics, faire des recherches web, écrire des premiers jets de documentation, donner un avis après un échec.
- **Jamais de données de prospects.** Le modèle par défaut est un modèle `:cloud`, et l'agent a le web.
- **Aucune donnée personnelle, aucun secret, aucun geste sortant :** pas de canal de messagerie, pas de publication, pas d'achat.

## Architecture

```
  usine (hôte)                                       réseau Docker « openclaw_isole »
  ───────────────────────────────────────            ───────────────────────────────────────
  Ollama     127.0.0.1:11434 ◄─┐                      conteneur « openclaw » (uid 995, lecture seule)
  freellmapi 127.0.0.1:3001  ◄─┤                        passerelle OpenClaw :18789
                               │                        pont : 127.0.0.1:11434 et :3001
  conteneur « openclaw-relais »│                               │
  (réseau de l'hôte, node seul)┘◄── sockets Unix ──────────────┘
                                    /srv/openclaw/relais/*.sock
  127.0.0.1:18800 ──► passerelle (interface de contrôle, par tunnel ssh seulement)
```

- **Pourquoi un relais.** Le pare-feu de l'usine (INPUT : `lo` + ssh) refuse tout ce qui vient d'un réseau Docker vers l'hôte. Ollama et freellmapi n'écoutent que sur 127.0.0.1. On NE touche PAS au pare-feu. Deux petits relais Node (`pont.mjs`) passent par des sockets Unix.
  - Destinations fixes : 11434 et 3001, rien d'autre.
  - Vérifié le 28/09 : depuis le conteneur, les autres services de l'hôte (43455, 4311, containerd 41801, IP privée 10.0.0.224) sont injoignables (`EHOSTUNREACH`/`ECONNREFUSED`). Seul le ssh (22), ouvert au monde de toute façon, répond.
- **Conteneur `openclaw`**, compte système `openclaw` (uid 995, gid 989, sans shell). Réglages :
  - système de fichiers en lecture seule ; toutes les capacités retirées ; `no-new-privileges` ;
  - 4 Go de mémoire, 1,5 cœur, 512 processus ;
  - redémarrage `unless-stopped` ;
  - pas de socket Docker ; journaux limités à 5 × 10 Mo.
- **Au repos :** environ 1 Go de mémoire.
- **Conteneur `openclaw-relais`** : 128 Mo, 0,25 cœur, mêmes durcissements.

Dossiers (`/srv/openclaw`) :

| Chemin | Rôle | Droits |
|---|---|---|
| `compose.yaml`, `.env` (OC_UID/OC_GID) | lancement | root, 644 |
| `pont/` (pont.mjs, lancer.sh, sante.mjs) | relais, démarrage, santé | root, 644 |
| `bin/tache.sh` | confier une tâche | root, 755 |
| `etat/` → `/home/node/.openclaw` | config `openclaw.json`, sessions, journaux | openclaw, 700 |
| `work/` → `/work` | espace de travail de l'agent (`AGENTS.md`, `taches/<id>/`) | openclaw, 700 |
| `secrets/` | `gateway.token` (créé par l'installateur), `freellmapi.key` (copie) | openclaw, 600 |
| `relais/` | sockets Unix | openclaw, 700 |

Aucune valeur de secret n'est affichée par les scripts.
- **La clé freellmapi** est une COPIE de `~/.config/presti/freellmapi.key`, le fichier du compte usine. Si la clé change, relancer l'installateur, qui rafraîchit la copie.
- **Aucun autre secret** dans le conteneur : pas de base, pas de Stripe, pas de Gmail, pas de jeton d'agent, pas de Firecrawl.

## Modèles (tous gratuits)

| Rang | Modèle | Chemin | Mesuré le 28/09 |
|---|---|---|---|
| 1 (défaut) | `ollama/gpt-oss:120b-cloud` | Ollama de l'usine → Ollama Cloud (compte de Benj, offre gratuite) | hello.md en 3 s ; recherche web complète en 89 s |
| 2 | `freellmapi/gpt-oss-120b` | freellmapi (servi par Cloudflare) | 8 s |
| 3 | `freellmapi/mistral-large-3` | freellmapi | 503 au moment du test (quota ou clé) |
| 4 | `ollama/qwen3:8b-q4_K_M` | local, privé, **sans web** | non testé dans OpenClaw |
| hors liste | `ollama/qwen3:4b-instruct-2507-q4_K_M` | local, privé, **sans web** | fichier écrit, mais délai de 420 s dépassé |

- **Le repli est automatique** (`agents.defaults.model.fallbacks`). Pour imposer un modèle : `OPENCLAW_MODELE=freellmapi/gpt-oss-120b tache.sh …`.
- **Recherche web :** fournisseur `ollama`, par l'Ollama local connecté au compte, sans clé. `web_fetch` tourne en local.
  - DuckDuckGo et SearXNG ne sont pas dans l'image slim.
- **Réglages de la config :**
  - `models.mode = "replace"` : seuls ces deux fournisseurs existent, aucun catalogue intégré (Anthropic, OpenAI…) ;
  - greffons chargés : `ollama` et `openai` seulement (le second sert au protocole compatible OpenAI de freellmapi) ;
  - greffons interdits : `anthropic`, `codex`, `xai`, `github`, `cua-computer`, `browser`, `canvas`, `memory-core`…

## Outils de l'agent

- **Profil `coding` + web.** L'agent a lecture, écriture et édition de fichiers, `web_search` et `web_fetch`.
- **Interdits :**
  - `group:runtime` : pas de shell, donc pas de moyen de lire `/run/secrets` ;
  - messagerie, nœuds, automatisations, interface.
- **Fichiers limités à `/work`** (`tools.fs.workspaceOnly`). Vérifié : « lis /etc/hostname » est refusé, car le chemin échappe au répertoire de travail.
- **Pas de persona.** Pas de `BOOTSTRAP.md` (`skipBootstrap`). Les règles de travail sont dans `/work/AGENTS.md` : français, résultats dans `taches/<id>/resultats/`, `RESUME.md` obligatoire, aucune question, rien d'inventé.
- **Rien ne tourne tout seul :** pas de battement de cœur (`heartbeat.every = "0m"`), pas de « dreaming », pas de revue automatique des skills. `cron list` → « No automations ».

## Skills

Ajouté le 28/09 : le skill **prompt-master** (github.com/nidhinjs/prompt-master, MIT, audité en quarantaine avant copie — aucun script, aucun binaire, aucune instruction cachée). Il aide à rédiger des prompts optimisés pour un outil IA donné (Cursor, Claude Code, Midjourney...).

- **Déposé dans** `/work/skills/prompt-master` (côté hôte : `/srv/openclaw/work/skills/prompt-master`), écrit via `docker exec` pour hériter du bon propriétaire (uid/gid `openclaw`).
- **Config :** `skills.load.extraDirs: ["/work/skills"]` ajouté dans `openclaw.json` (les deux copies : ce dossier et `/srv/openclaw/etat/openclaw.json`). En creusant `docs/tools/skills.md` du conteneur : `<workspace>/skills` (donc `/work/skills`, puisque `agents.defaults.workspace = "/work"`) est déjà la source de plus haute précédence, chargée automatiquement — `extraDirs` est la source la plus basse et n'était donc pas nécessaire ici. Gardé quand même (explicite, sans risque, ne change aucun comportement) suite à la demande de Benj.
- **Validé comme `installer.sh` :** `docker run --rm --network none ... config validate` sur la nouvelle config avant de la poser en live ; ancienne config sauvegardée en `openclaw.json.avant-<date>` ; aucune tâche en cours vérifiée (`docker top openclaw`) avant `docker restart openclaw`. Reparti `healthy` en 35 s.
- **Preuve :** `docker exec openclaw node /app/openclaw.mjs skills list` → `prompt-master ✓ ready`, source `openclaw-workspace`. Tâche réelle par `tache.sh` (consigne : écrire un prompt Cursor pour corriger `validateEmail`) : `reponse.json` → `meta.systemPromptReport.skills.entries` contient `{"name":"prompt-master","blockChars":475}` (le skill est bien injecté dans le prompt système, pas juste listé), et la réponse suit exactement le Template G (File/Function/Current behavior/Desired change/Constraints/Done when) + la ligne `🎯 Target / ... 💡 Strategy` du format de sortie du skill.
- **Pour ajouter un autre skill custom :** même geste — écrire dans `/work/skills/<nom>/SKILL.md` via `docker exec` (pas besoin de toucher `openclaw.json`, la précédence 1 le charge déjà).

## `openclaw-relais` « unhealthy » (corrigé le 28/09/2026)

Vu « unhealthy » en continu pendant ~2 h dans `docker ps` alors qu'une vraie tâche par
`tache.sh` aboutissait sans problème. Diagnostiqué :
`docker inspect openclaw-relais --format '{{json .State.Health}}'` → 40 échecs consécutifs
(`ExitCode: 1`, toutes les 3 min). `docker inspect ... .Config.Healthcheck` a montré que
`relais` n'a **aucune** sonde définie dans `compose.yaml` — il hérite donc du `HEALTHCHECK`
gravé dans l'image (`node dist/docker-healthcheck.js`), qui teste le vrai service `openclaw`
(la passerelle) et n'a aucun sens pour un conteneur qui ne fait tourner que le pont
(`pont.mjs hote`). Le service `openclaw` principal, lui, a sa propre sonde explicite
(`sante.mjs`) et restait sain tout du long.

**Correctif :** `healthcheck: disable: true` ajouté au service `relais` dans les deux
`compose.yaml` (ce dossier et `/srv/openclaw/compose.yaml`), avec sauvegarde de l'ancien fichier
en `.avant-sonde-relais-28-09`. `docker compose up -d` n'a recréé QUE `relais` (le service
`openclaw` n'a pas bougé). Depuis : `docker ps` affiche `Up …` sans plus jamais de statut de
santé pour ce conteneur (sonde désactivée, pas « fausse healthy ») — comportement voulu, à
l'identique de ce que fait déjà le brouillon Hermes pour son propre `relais` (qui, lui, n'a
carrément pas de `HEALTHCHECK` gravé dans son image — testé, `docker inspect` rend `null`).

## Confier une tâche : `tache.sh`

Depuis le PC (Git Bash) ou sur l'usine :

```bash
# PC : la consigne part par scp, la tâche tourne sur l'usine, le dossier revient
bash ~/Documents/presti-ops/usine/openclaw/tache.sh consigne.md ./sortie

# usine (compte usine)
/srv/openclaw/bin/tache.sh consigne.md ~/openclaw-resultats/ma-tache

# options par variables
OPENCLAW_MODELE=freellmapi/gpt-oss-120b OPENCLAW_DELAI=1200 bash tache.sh consigne.md ./sortie
```

Le dossier de sortie contient :

| Fichier | Contenu |
|---|---|
| `consigne.md` | la consigne reçue |
| `message.md` | ce qui a été envoyé à l'agent |
| `resultats/` | les fichiers écrits par l'agent, dont `RESUME.md` |
| `reponse.json` | l'enveloppe de `openclaw agent --json`, dont `result.meta.executionTrace.winnerProvider/winnerModel`, `toolSummary` et `durationMs` |
| `journal-conteneur.txt` | `docker logs` pendant la tâche |
| `statut.txt` | `OK`, `ECHEC-AGENT` ou `ECHEC-RESUME-VIDE` |

Codes de sortie : 0 OK ; 1 échec de l'agent ou délai dépassé ; 2 mauvais usage ; 3 aucun `RESUME.md` non vide.

- **Chaque tâche a sa propre session** (`agent:main:tache-<id>`), donc pas de mémoire croisée.
- **La réussite n'est pas prouvée par le statut.** `OK` dit seulement que l'agent a fini et rendu un résumé non vide : relire `resultats/` avant de s'en servir.

Essai réel du 28/09 (tâche `20260928-160823-f97d5e`, recherche + lecture de la doc Docker) :
- `OK` en 89 s, sur `ollama/gpt-oss:120b-cloud` ;
- 12 appels d'outils, dont 4 `web_fetch` refusés par des sites (LinkedIn…) ;
- l'agent a marqué « à vérifier » ce qu'il n'avait pas confirmé ;
- la fiche est sortie en anglais malgré la règle du français.

## Commandes

```bash
ssh -i ~/.ssh/presti-usine usine@88.96.53.3        # compte usine (groupe docker)

docker ps --filter name=openclaw                   # état (healthy attendu)
docker logs -f --tail 50 openclaw                  # journal de la passerelle
docker logs --tail 20 openclaw-relais              # journal du relais
docker stats --no-stream openclaw openclaw-relais  # mémoire et processeur

OC="docker exec openclaw node /app/openclaw.mjs"
$OC health                                         # santé via la passerelle
$OC config validate                                # config valide ?
$OC security audit                                 # audit (voir « Limites »)
$OC cron list                                      # doit rester vide
$OC models list                                    # modèles vus par OpenClaw
$OC agent --agent main --session-key agent:main:essai --message "…" --json --timeout 300

docker compose -f /srv/openclaw/compose.yaml restart openclaw   # redémarrer
docker compose -f /srv/openclaw/compose.yaml down               # ARRÊTER (les deux conteneurs)
docker compose -f /srv/openclaw/compose.yaml up -d              # relancer
```

**Interface de contrôle** (facultatif), depuis le PC :
1. `ssh -i ~/.ssh/presti-usine -N -L 18800:127.0.0.1:18800 usine@88.96.53.3`
2. Ouvrir http://localhost:18800 : le jeton est dans `/srv/openclaw/secrets/gateway.token`, lisible par root seulement (`sudo cat`, ne pas le coller dans un chat).
3. Le port 18800 est lié à 127.0.0.1 : rien n'est exposé.

## Installer, mettre à jour, désinstaller

Fichiers source : ce dossier (`compose.yaml`, `openclaw.json`, `pont.mjs`, `lancer.sh`, `sante.mjs`, `AGENTS.md`, `installer.sh`, `tache.sh`).

```bash
# depuis le PC
cd ~/Documents/presti-ops/usine/openclaw
ssh -i ~/.ssh/presti-usine ubuntu@88.96.53.3 'rm -rf /tmp/openclaw-install; mkdir /tmp/openclaw-install'
scp -i ~/.ssh/presti-usine compose.yaml openclaw.json pont.mjs lancer.sh sante.mjs AGENTS.md installer.sh tache.sh ubuntu@88.96.53.3:/tmp/openclaw-install/
ssh -i ~/.ssh/presti-usine ubuntu@88.96.53.3 'sed -i "s/\r$//" /tmp/openclaw-install/*.sh /tmp/openclaw-install/*.mjs; sudo bash /tmp/openclaw-install/installer.sh --config; sudo docker restart openclaw'
```

- **Sans `--config`,** la config en place est gardée. **Avec `--config`,** elle est remplacée, et l'ancienne est copiée en `openclaw.json.avant-<date>`.
- **L'installateur VALIDE d'abord la config** dans un conteneur jetable, sans réseau. Si elle est invalide, il s'arrête sans rien changer.
- **Changer de version :**
  1. modifier le tag dans `compose.yaml` (deux services) ;
  2. `docker pull …` ;
  3. `installer.sh` ;
  4. `docker compose … up -d` ;
  5. refaire l'essai hello.md.
  - L'image fait 4,9 Go : vérifier `df -h /` avant (disque à 90 % le 28/09 à 16 h 15).
- **Désinstaller :** `docker compose -f /srv/openclaw/compose.yaml down`. Ensuite, et seulement avec l'accord de Benj :
  - supprimer `/srv/openclaw` ;
  - `userdel openclaw` ;
  - `docker image rm ghcr.io/openclaw/openclaw:2026.9.6-slim`.

## Pièges constatés

1. **Une config invalide = boucle de redémarrage.** La passerelle refuse de démarrer et `restart-loop breaker tripped` s'affiche. Le 28/09, `skills.workshop.autonomous` attendait un OBJET (`{ "mode": "off" }`), pas un booléen.
   - La garde de validation de l'installateur vient de là.
   - Toujours `config validate` avant de remplacer.
2. **L'image slim n'a pas les greffons de recherche** DuckDuckGo, SearXNG et Parallel : le fournisseur `ollama` est le seul sans clé.
3. **Ce qu'OpenClaw fait tout seul par défaut, sans rien demander :**
   - battement de cœur toutes les 30 min (un appel au modèle à chaque fois) ;
   - « dreaming » de la mémoire à 3 h ;
   - revue hebdomadaire des skills.

   Les trois sont coupés dans la config. Le travail cron de « dreaming » avait déjà été créé : je l'ai retiré par `cron rm`. Après une mise à jour, vérifier `cron list`.
4. **Modèle local = très lent.** Le système d'OpenClaw fait environ 5 500 jetons, et 20 000 avec les outils web. Sur les 4 cœurs ARM :
   - Qwen3 4B met plus de 7 min pour une tâche triviale ;
   - il occupe l'Ollama partagé (`OLLAMA_NUM_PARALLEL=1`), et une demande abandonnée continue côté serveur, ce qui bloque aussi l'entraide de Codex.

   Le réserver aux petits textes privés, avec `OPENCLAW_DELAI` ≥ 1200.
5. **Le pare-feu refuse Docker → hôte.** Sans le relais, `host.docker.internal:11434` ne répond pas. Ne PAS ouvrir le pare-feu ni monter le socket Docker. Ce dernier donnerait root, et c'est pourtant ce que propose le bac à sable « docker » d'OpenClaw.
6. **L'agent crée certains fichiers en 600** (propriétaire openclaw). Le compte usine ne les lit pas directement : `tache.sh` les récupère par `docker cp`. Ne pas ajouter usine au groupe openclaw.
7. **Rotation de la clé freellmapi :** relancer `installer.sh` (sans `--config`), puis `docker restart openclaw`.
8. **Les sites refusent parfois `web_fetch`** (LinkedIn…). L'agent peut alors déduire à partir de sources faibles : exiger les liens et relire.

## Limites (audit `openclaw security audit`, 28/09)

- **CRITICAL `models.small_params`.** Les modèles de 120 B ont le web sans le bac à sable interne d'OpenClaw. C'est accepté ainsi :
  - le conteneur EST le bac à sable : pas de shell, fichiers limités à `/work`, aucun secret utile hors de l'usine ;
  - la clé freellmapi et le jeton ne servent qu'en 127.0.0.1 de l'usine ;
  - les modèles locaux (plus faibles) n'ont pas le web ;
  - le bac à sable interne exigerait le socket Docker, donc un accès root.
- **WARN `models.weak_tier`.** Les modèles gratuits sont sous la gamme « GPT-5 ». Ils sont plus sensibles à l'injection de consignes par une page web. D'où : pas de geste sortant, pas de secret, relecture humaine ou par Claude.
- **Ce qui reste joignable depuis le conteneur :**
  - Internet sortant (nécessaire aux recherches) ;
  - le service de métadonnées Oracle (169.254.169.254), comme depuis tout conteneur. Le bloquer demanderait iptables, ce qui est interdit ici.
- **La qualité reste celle d'un modèle gratuit.** Premiers jets et avis seulement ; les décisions et le code de Presti restent chez Claude ou Codex.
