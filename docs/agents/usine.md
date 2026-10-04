# L'usine des agents : le compte, le coffre, les services

> Écrit le 27 septembre 2026 (fiche 026-050). Le code est jugé sur jeux d'essai par
> `node scripts/usine-socle-qa.mjs --groupe=coffre,socle` ; **rien n'est encore installé sur l'usine** : la mise en
> service est la fiche 026-058, jugée par `node scripts/usine-socle-qa.mjs --reel`.

L'usine, c'est `presti-usine` : un serveur Oracle Always Free à Paris (ARM, Ubuntu 24.04), allumé 24 h/24. Tout ce qui
la concerne en dehors des agents (création, réseau, Codex, Ollama) est dans
`C:/Users/benja/Documents/presti-ops/usine/LISEZMOI.md`. Ici : ce qu'il faut pour que les agents y tournent **PC
éteint**, sans qu'aucun secret n'en sorte.

Les outils, tous lancés depuis le poste :

| Commande | Ce qu'elle fait |
|---|---|
| `node scripts/usine-coffre.mjs poser <NOM>` | pose une clé au coffre (saisie masquée) |
| `node scripts/usine-coffre.mjs noms` / `etat` / `retirer <NOM>` | les noms du coffre, son mode, retirer une clé |
| `node scripts/usine-coffre.mjs poser-jeton-agent <agent> [--nom=<NOM>] [--copie-windows=<VAR>]` | crée le jeton d'un agent et le pose sans jamais l'afficher |
| `node scripts/usine-agents.mjs socle [--a-sec]` | le compte `agents`, le code déployé, les deux assistants, le sudoers |
| `node scripts/usine-agents.mjs maj [--forcer]` | avance le code déployé sur `origin/main` |
| `node scripts/usine-agents.mjs installer <groupe>` / `arreter <groupe>` | met en route ou coupe les minuteurs d'un groupe |
| `node scripts/usine-agents.mjs etat` | compte, minuteurs, noms du coffre, commit déployé, mémoire, disque |

Codes : 0 fait ; 1 refus ou étape en échec ; 2 usage ou valeur refusée (rien n'est envoyé) ; 3 sudo refusé ; 5 usine
injoignable (l'IP est éphémère : `PRESTI_USINE=<compte>@<ip>` si l'instance a été recréée).

## Le compte agents

- **`agents`** fait tourner les services des agents. Il n'a ni sudo, ni shell de connexion (`/usr/sbin/nologin`), et il
  n'est dans aucun groupe `sudo`, `adm` ni `admin`. Il ne peut pas écrire le code qu'il exécute.
- **`usine`** fait tourner Codex pour l'orchestre, avec le réseau. Il **ne peut pas lire** le coffre : `/home/agents` est
  en 700 et le coffre en 600, à `agents`. Le bac à sable de Codex ne contourne pas ces droits.
- `/home/agents/travail` (sous-dossiers `chef`, `atelier`, `usine`, `surveillance`) est le seul endroit où les agents
  écrivent, avec `/home/agents/.config/presti` (le coffre). Tout est en 700.
- Deux assistants seulement sont permis à `usine` sous `agents` (`/etc/sudoers.d/presti-agents`, deux règles, contrôlées
  par `visudo` avant d'être posées) :
  - `presti-coffre` : poser, retirer, lister les **noms**. Aucune sous-commande ne sait relire une valeur ;
  - `presti-journal <chef|atelier|livreur|surveillance> [n]` et `presti-journal config-codex` : la fin des journaux des
    agents (50 lignes par défaut, 500 au plus), et les seules lignes `model`, `sandbox_mode` et `network_access` de la
    configuration de Codex. Il ne lit ni le coffre ni la connexion de Codex, et refuse (code 3) un journal qui serait un
    lien, symbolique ou physique, ou dont le chemin réel sortirait de `~/travail`.
- **Qui pose le socle.** Les gestes root (`socle`, `maj`, `installer`, `arreter`) demandent sudo sans mot de passe.
  Depuis le 25/09, `usine` ne l'a plus (LISEZMOI, « Sudo restreint ») : ils passent par **`ubuntu`**, même clé :

  ```
  PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs socle --a-sec   (relire)
  PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs socle
  ```

  Les gestes du dépôt (git, npm) tournent quand même sous `usine` (`sudo -u usine`), propriétaire de `~/presti` et du
  code déployé. Sous `usine`, ces quatre commandes s'arrêtent tout de suite, code 3, avec la commande à relancer.
  `etat` marche sous `usine`, le compte par défaut.

## Le coffre

Un fichier, `/home/agents/.config/presti/agents.env`, en 600, à `agents`, une ligne `NOM=valeur` par clé. Il ne reçoit
que des **clés plafonnées**, dans une liste fermée :

| Nom | Pour qui |
|---|---|
| `PRESTI_JETON_CHEF` | le chef d'opérations |
| `PRESTI_JETON_USINE` | la surveillance (l'agent `usine`) |
| `PRESTI_JETON_ATELIER` | l'atelier des maquettes (agent `atelier_maquettes`) |
| `PRESTI_JETON_LIVREUR_USINE` | le livreur de sites |
| `PRESTI_JETON_FACTEUR_USINE` | le porteur du formulaire |
| `PRESTI_JETON_STANDARDISTE` | le Standard (la moitié qui a besoin d'un modèle) |
| `PRESTI_JETON_FACTEUR` | le Facteur (idem) |
| `PRESTI_JETON_TELEGRAM` | le pont Telegram |
| `TELEGRAM_BOT_TOKEN` | le jeton du bot Telegram |
| `TELEGRAM_CHAT_ID` | la conversation Telegram (`aucun` tant qu'elle n'est pas appairée) |
| `TELEGRAM_CODE_APPAIRAGE` | le code d'appairage à usage unique (`epuise` une fois servi) |
| `PRESTI_JETON_SAV` | le SAV (agent `sav`) : le nom est dans la liste, le jeton n'est pas posé (pas encore de côté usine) |
| `PRESTI_JETON_QUALITE` | le Contrôleur qualité des sites (agent `qualite_sites`) |
| `PRESTI_JETON_VIGILE` | le Vigile (agent `vigile`) |

Chaque jeton d'agent est limité à ses types et à ses tables (026-040). Et surtout :

- **jamais la clé de service** Supabase (écriture complète) ;
- **jamais Stripe**, quelle que soit la clé ;
- **jamais la clé du produit** (Anthropic), ni aucune autre clé de modèle ;
- jamais `.env.local`.

Les formes connues de ces clés (un JWT, `sb_secret_`, `sk_live_`, `sk_test_`, `rk_live_`, `whsec_`, et toute valeur
qui commence par `sk-ant-`) sont refusées **quel que soit le nom** sous lequel on essaie de les poser. `PRESTI_URL`
n'est pas un secret : il se pose dans l'unité (`Environment=`), jamais au coffre.

**Poser une clé** — dans son propre terminal, jamais dans une conversation :

```
node scripts/usine-coffre.mjs poser <NOM>
```

La saisie est masquée. Sans terminal, la valeur est lue sur l'entrée standard (une ligne) ; `--depuis-env=<VAR>` la
prend dans une variable du poste. Les règles sont contrôlées **avant** tout ssh (refus : code 2, rien n'est envoyé),
puis rejouées sur l'usine par `presti-coffre`. La valeur voyage une fois, sur l'entrée standard de ssh : jamais en
argument (l'argv d'un processus se lit, sur le poste comme par `ps` sur l'usine), jamais affichée, jamais écrite ailleurs
que dans le coffre (écriture atomique : un temporaire dans le dossier du coffre, sous verrou, puis `mv`).

Le jeton d'un agent se crée et se pose d'un seul geste, sans jamais passer à l'écran :

```
node scripts/usine-coffre.mjs poser-jeton-agent chef --copie-windows=PRESTI_JETON_CHEF
```

(`node scripts/agents-jeton.mjs <agent> --sortie=tube`, 026-040, puis la pose ; nom par défaut
`PRESTI_JETON_<AGENT>`, `--nom=` sinon, par exemple `poser-jeton-agent atelier_maquettes --nom=PRESTI_JETON_ATELIER`.
`--copie-windows` pose aussi la variable d'environnement utilisateur Windows, pour la reprise par le poste.)

**Chaque service ne reçoit que ses variables** : ses unités lancent
`node scripts/usine/avec-coffre.mjs NOM… -- <commande>`, qui lit le coffre sans l'évaluer et passe à la commande un
environnement fait de zéro (`PATH`, `HOME`, `LANG`, `TZ`, `USER`, `PRESTI_HOTE`, `ORCHESTRE_CODEX_BIN`,
`CODEX_LANCEUR`, `PLAYWRIGHT_BROWSERS_PATH`, `PRESTI_URL`, et les noms demandés). Jamais d'`EnvironmentFile=`, qui
chargerait tout le coffre. Un nom hors liste : code 2 ; absent du coffre : code 3, rien n'est lancé ; coffre pas en
600 : code 4. `CODEX_LANCEUR` (le lanceur de la file IA, `/usr/local/bin/presti-ia-modele`, 026-148) n'était pas dans
la liste de la fiche : les unités du livreur, du Standard, du Facteur et des pubs le posent pour `lib/agents/llm.ts`
(026-057, 026-094, 026-200) ; filtré, ces agents tourneraient sans modèle sans que rien ne le dise.

Les règles existent deux fois, `scripts/usine/coffre-regles.mjs` (le poste) et `scripts/usine/presti-coffre.sh`
(l'usine), jugées sur la même table de cas : qui en change une change l'autre dans le même commit. La forme du jeton de
bot Telegram (`chiffres:signes`) est [à vérifier] le jour où le bot est créé : une constante de chaque côté.

## Le code déployé

- `/srv/presti-agents` : un arbre de travail détaché de `~usine/presti` (clone en lecture seule) sur `origin/main`, à
  `usine:agents`, dossiers en 2750, fichiers en 640, exécutables en 750 : `agents` lit, n'écrit jamais. Seul le code
  poussé sur `main` (après PASS et push par Claude Code) y tourne.
- Les deux endroits où un agent écrit sont des liens : `.orchestre/travail` → `/home/agents/travail`, et
  `.orchestre/quotas.json` → `/home/agents/travail/quotas.json` (l'état du quota Codex du chef, 026-127). Ni l'un ni
  l'autre n'est suivi par git : `maj` ne les touche pas.
- **Après chaque push qui touche un agent de l'usine :**

  ```
  PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs maj
  ```

  `git fetch`, l'arbre remis sur `origin/main` (`checkout --force` : un fichier suivi modifié sur place revient à
  `main` ; `etat` en donne le nombre, 0 attendu), `HUSKY=0 npm ci --ignore-scripts` **seulement si `package-lock.json`
  a changé** (lancé sous `usine`, jamais sous `agents` : aucun script d'installation de paquet ne tourne là où le coffre
  est lisible), Chromium de la version du dépôt dans `/srv/playwright` (lisible par `agents`), droits réappliqués,
  assistants réinstallés s'ils ont changé, commit déployé imprimé.
- `maj` **refuse** (code 1) tant qu'un service `presti-*` est en marche, la surveillance comprise : `arreter <groupe>`
  d'abord, ou `maj --forcer` quand on sait qu'aucun cycle n'est en cours.
- Une unité systemd modifiée ne se recharge pas par `maj` : `installer <groupe>` ensuite.
- [à vérifier sur ARM, le jour de la mise en service] qu'aucun paquet n'exige son script d'installation : si
  `--ignore-scripts` casse quelque chose, s'arrêter et le noter ici ; ne jamais lancer ce script sous `agents`.

## Les services

Tous sous le compte `agents`, dans `/srv/presti-agents`, chacun avec ses seules variables du coffre
(`avec-coffre.mjs`). `node scripts/usine-agents.mjs installer <groupe>` copie les unités `presti-<groupe>*` de
`/srv/presti-agents/scripts/usine/systemd/` (rien ne vient du poste), passe `systemd-analyze verify`, recharge systemd
et active les minuteurs du groupe ; `arreter <groupe>` les désactive.

| Service | Minuteur | Compte | Variables du coffre | Groupe | Fiche |
|---|---|---|---|---|---|
| `presti-surveillance.service` | aucun : service permanent, une mesure par minute | agents | `PRESTI_JETON_USINE` | surveillance | 026-053 |
| `presti-atelier.service` | `presti-atelier.timer`, toutes les 15 min | agents | `PRESTI_JETON_ATELIER` | atelier | 026-097, 026-057 |
| `presti-livreur.service` | `presti-livreur.timer`, toutes les 10 min | agents | `PRESTI_JETON_LIVREUR_USINE` | livreur | 026-057 |
| `presti-chef-leger.service`, `presti-chef-plein.service`, `presti-chef-reunion.service` | `presti-chef-leger.timer`, `presti-chef-plein.timer`, `presti-chef-reunion.timer` | agents | `PRESTI_JETON_CHEF` | chef | 026-129, 026-148 |
| `presti-chef-savoir-recevoir.service` (déclenché par `.path`), `presti-chef-savoir-index.service` (déclenché par `.path`), `presti-chef-bilan.service` | `presti-chef-bilan.timer` (7 h 35, Paris) | agents | aucune variable pour la réception et l'index ; `PRESTI_JETON_CHEF` pour le bilan | chef | 026-241 (**écrits, pas installés** au 05/10/2026 : attendent le « oui » de Benj) |
| `presti-porteur.service`, `presti-export-nuit.service` | `presti-porteur.timer` (15 min), `presti-export-nuit.timer` (3 h 30, Paris) | agents | `PRESTI_JETON_FACTEUR_USINE` | porteur | 026-095, 026-143 |
| `presti-standard.service`, `presti-facteur.service`, `presti-facteur-soir.service` | `presti-standard.timer` (5 min), `presti-facteur.timer` (15 min), `presti-facteur-soir.timer` (20 h 05) | agents | `PRESTI_JETON_STANDARDISTE`, `PRESTI_JETON_FACTEUR` | modeles | 026-094, 026-148 |
| `presti-vigile.service` | `presti-vigile.timer` (6 h 50, Paris) | agents | `PRESTI_JETON_VIGILE` | vigile | 026-249, 026-251 (migration 0115 appliquée le 05/10/2026 ; unité non installée, jeton non posé) |
| `presti-qualite`, `presti-sav` | pas encore d'unité | agents | `PRESTI_JETON_QUALITE`, `PRESTI_JETON_SAV` | qualite, sav | 026-247, 026-245 |
| `presti-telegram.service` | aucun : service permanent (long polling) | agents | `TELEGRAM_BOT_TOKEN`, `PRESTI_JETON_TELEGRAM`, `TELEGRAM_CHAT_ID`, `TELEGRAM_CODE_APPAIRAGE` | aucun : sa propre mise en service | 026-195 |

Le groupe `chef` copie aussi `presti-chef-modele.service` et active `presti-chef-modele.path` (026-148) : le modèle du
chef tourne sous son propre compte, `chef-modele`, qui ne lit pas le coffre (026-129). Le détail de chaque service
(son script, ses routes, ses limites) est dans sa fiche.

## Le dépôt du savoir (026-241)

`/srv/presti-savoir/depot` (`agents:agents`, 2770, posé par `gardien`) reçoit le savoir envoyé du poste (`node scripts/savoir/synchroniser.mjs`, tâche Windows `Presti savoir` toutes les 2 h) ; la réception et l'index le prennent par `.path`. Reprise : réenvoyer depuis le poste. Interrupteurs : `docs/savoir/reglages.json` (tous éteints tant que Benj n'a pas dit « oui » geste par geste).

## La surveillance

`presti-surveillance.service` (026-053) mesure chaque minute le processeur, la mémoire et le réseau, garde 8 jours de
mesures et calcule le 95e centile de chacun sur 7 jours, contre la règle d'Oracle : une instance Always Free restée
sous 20 % sur 7 jours peut être reprise.

- Verdict : **danger** si le plus grand des trois p95 est sous 22 %, **approche** sous 30 %, **ok** au-delà
  (**incomplet** tant qu'il n'y a pas une journée de mesures).
- Elle bat au bus toutes les 15 min (muette plus d'une heure : le veilleur affiche « usine injoignable »), publie un
  point chaque matin, et ouvre **une décision par semaine au plus** quand le verdict est `approche` ou `danger` :
  déplacer du vrai travail sur l'usine (recommandé), accepter le risque (défaut : tout est reprenable par le poste,
  section suivante), ou passer le compte Oracle en paiement à l'usage.
- **Aucune charge factice** : ni boucle de calcul, ni mémoire gardée pour rien. Ce serait contourner la règle d'Oracle.
- Relire ses mesures : `ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'sudo -n -u agents /usr/local/bin/presti-journal surveillance 20'`.

## Reprise par le poste

Si l'usine tombe ou si Oracle la reprend, chaque service se relance sur le PC de Benj, dans le dépôt, avec les
variables d'environnement utilisateur Windows posées par `poser-jeton-agent … --copie-windows=<NOM>` :

- **le chef** : `node scripts/chef/cycle.mjs --mode=plein --reprise --base=https://prestiapp.fr` (avec
  `PRESTI_JETON_CHEF`) ;
- **l'atelier** : `node --import ./scripts/ts-loader.mjs scripts/agents/atelier-maquettes.mjs --une-passe`, avec
  `PRESTI_JETON_ATELIER` et `PRESTI_URL=https://prestiapp.fr` (026-097 réécrite) ;
- **le livreur** : `node scripts/usine/tourneur.mjs --capacite=livraison --une-passe --base=https://prestiapp.fr`
  (avec `PRESTI_JETON_LIVREUR_USINE`), ou GitHub Actions (026-106) ;
- **le porteur, le Standard, le Facteur et le pont Telegram** : la commande de reprise est dans leur fiche (026-095,
  026-094, 026-195) ;
- **la surveillance** n'a pas de reprise : c'est le veilleur qui voit l'usine tomber.

## Pièges

- **AppArmor et le chemin du binaire de Codex.** Ubuntu 24.04 restreint les espaces de noms : le `bwrap` embarqué par
  Codex ne marche que grâce au profil `/etc/apparmor.d/codex-bwrap`, qui vise **ce** binaire, à ce chemin. Déplacer ou
  réinstaller Codex ailleurs fait revenir le blocage.
- **Pas de `bubblewrap`.** Installer ce paquet, c'est donner à Codex `/usr/bin/bwrap`, que le profil ne couvre pas :
  le bac à sable retombe en panne.
- **Pas de `ufw`.** L'installer retire `iptables-persistent`, donc les règles d'Oracle (SSH seul en entrée). Le socle
  ne touche ni au pare-feu, ni à sshd.
- **Jamais `bash -l` pour une commande distante.** `clear_console` de `~/.bash_logout` échoue sans terminal et change le
  code de sortie ; les scripts passent par `bash -s` après `. "$HOME/.profile"`.
- **`usine` n'a plus sudo** (25/09) : `socle`, `maj`, `installer` et `arreter` passent par `PRESTI_USINE=ubuntu@<ip>`
  (code 3 sinon). Un compte de plus dans le groupe `docker` vaudrait root : aucun des comptes d'ici ne doit y entrer.
- **Ce que la frontière `usine` / coffre tient, et ce qu'elle ne tient pas encore.** `usine` ne lit pas le coffre, et
  Codex, dans son bac à sable, n'écrit pas `/srv/presti-agents`. Mais `usine` possède le code que lance `agents` (l'arbre
  et son `node_modules`, comme `~/presti` d'où il vient), et il est dans le groupe `docker`, qui vaut root (LISEZMOI,
  « Sudo restreint », point 2) : un processus d'`usine` **hors** bac à sable (un juge d'`executer`) pourrait changer ce
  code, qu'`agents` lancerait ensuite avec le coffre. `maj` remet les fichiers suivis sur `main` et `etat` compte ceux qui
  ont bougé, pas `node_modules`. À fermer avec le chantier `docker` et un compte de déploiement à part [décision de
  Benj].
- **git sous `agents`.** Le `.git` de `/srv/presti-agents` pointe dans `~usine/presti`, qu'`agents` ne lit pas : un
  agent qui appellerait git dans son répertoire de travail échouerait [à vérifier par les fiches des services].
- **Fins de ligne.** Le poste est en `core.autocrlf=true` : les scripts distants partent en LF (`usine-agents.mjs` les
  convertit), sinon bash échoue sur l'usine.
