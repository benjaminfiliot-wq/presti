# L'usine des agents (serveur Oracle Cloud Always Free)

## À quoi elle sert

Elle fait le travail lourd des agents quand le PC de Benj est éteint : recherche de prospects (scrapegraphai, API publiques), maquettes de sites, captures et juges (Chromium), pubs, exécutions Codex.

Le site `prestiapp.fr` n'y tourne **jamais** : il reste chez Vercel. Si Oracle reprend ce serveur, seuls les agents ralentissent ; les artisans ne voient rien.

## Qui fait quoi

- **Benj, une seule fois (environ 10 min)** : il crée le compte Oracle Cloud (https://signup.cloud.oracle.com), avec sa carte pour la vérification (0 € prélevé en Free Tier), région **France Central (Paris)**, et il reste en Free Tier. Claude Code n'a pas le droit de créer un compte ni de saisir une carte.
- **Claude Code, tout le reste** :
  - l'instance `VM.Standard.A1.Flex` (2 OCPU, 12 Go, Ubuntu 24.04), avec `cloud-init.yaml` ;
  - la clé SSH `~/.ssh/presti-usine`, créée le 24/09 et réservée au compte Windows de Benj ;
  - le branchement à l'orchestre et à la file `ops` de Supabase ;
  - la surveillance.

## État (24/09/2026, 16:28)

- **Instance :** `presti-usine`, Paris AD-1, VM.Standard.A1.Flex 2 OCPU / 12 Go, Ubuntu 24.04 Minimal aarch64, disque de 46,6 Go.
- **Accès :** `ssh -i ~/.ssh/presti-usine usine@88.96.53.3`. L'IP est **éphémère** : elle reste tant que l'instance existe, mais change si l'instance est recréée.
- **Installé :**
  - Node 24.21 et uv 0.12 ;
  - Playwright 1.63 avec Chromium (dans `~/usine`) ;
  - git, ffmpeg, python3-venv, build-essential, jq ;
  - fail2ban (prison sshd active) et unattended-upgrades.
- **Réseau :** VCN `vcn-20260924-1611` avec sa passerelle Internet, et le NSG `ig-quick-action-NSG` (sortie seule).
  - La liste de sécurité par défaut laisse entrer le SSH.
  - Le pare-feu de la machine est celui d'Oracle (iptables-persistent).

### Pièges rencontrés à la création

1. **Pas d'IP publique avec un VCN neuf.** L'assistant « Create instance » grise le bouton de l'IP publique quand on lui fait créer le VCN. L'instance démarre donc sans Internet et cloud-init rate toute l'installation des paquets.
   - Correctif : VNIC → IP administration → Edit → *Ephemeral public IP*.
   - Rejouer ensuite `rattrapage.sh` : `ssh -i ~/.ssh/presti-usine ubuntu@<IP> 'bash -s' < rattrapage.sh` (sous `ubuntu` : depuis le 25/09, `usine` n'a plus de sudo complet, voir « Sudo restreint »).
2. **Pas de ufw sur une image Oracle.** Installer ufw retire `iptables-persistent` et donc les règles d'Oracle (SSH seul en entrée, protection des services internes 169.254.x). Le pare-feu d'Oracle suffit.
3. **Le bac à sable de Codex était bloqué par Ubuntu 24.04.** Avec `kernel.apparmor_restrict_unprivileged_userns=1`, le `bwrap` embarqué par Codex échouait (« bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted ») et Codex ne pouvait rien exécuter.
   - Correctif : le profil `codex/apparmor-codex-bwrap`, posé dans `/etc/apparmor.d/codex-bwrap`. Il donne le droit `userns` à CE binaire seulement, sur le modèle des profils chrome et linux-sandbox d'Ubuntu.
   - **Ne pas installer le paquet `bubblewrap`** : Codex prendrait alors `/usr/bin/bwrap`, que le profil ne couvre pas, et le blocage reviendrait.
   - Vérifié le 24/09 avec `codex sandbox -P :workspace -C <dossier> -- sh -c "…"` : l'écriture passe dans le dossier et est refusée ailleurs (« Read-only file system »).
4. **Codex 0.156.1** est installé dans `~/.npm-global`, avec un lien dans `~/.local/bin`.
   - Config : `codex/config.toml`, soit workspace-write, réseau et gpt-6-sol.
   - Règles : `codex/garde-git.rules`, vérifiées avec `codex execpolicy check`. restore, reset --hard, clean, push --force et rm -rf sont refusés ; git status reste permis.
   - **Connexion au compte ChatGPT de Benj :** `codex login --device-auth`. Benj valide le code affiché ; Claude Code ne saisit jamais d'identifiants. **Connecté le 24/09.** Essai réel `codex exec` réussi : écriture dans le dossier, réseau 200, écriture ailleurs refusée.
5. **Accès au dépôt presti :** clé de déploiement GitHub **en lecture seule**, `~/.ssh/presti-depot` sur l'usine (la partie privée n'en sort pas), titre « presti-usine (Oracle) - lecture seule - 2026-09-24 », empreinte SHA256:haaWJaD0J+mTWqvqYzX7ZqRAz/Ft1C4U5R5e053bZ8s. `~/.ssh/config` l'impose pour github.com ; l'empreinte de GitHub a été vérifiée (SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU). Clone : `~/presti`. Vérifié le 24/09 : `git push` refusé (« marked as read only »). L'usine ne commite jamais : ses résultats reviennent au PC, où Claude Code vérifie et commite.
6. **Le statut cloud-init « error » peut être trompeur.** Il signalait seulement l'étape paquets ratée ; le reste (Node, uv, Chromium) était bien installé. Lire `/var/log/cloud-init-output.log` avant de conclure.

## Limites à connaître (vérifiées le 24/09/2026)

- **Always Free :** 2 OCPU Ampere A1 et 12 Go de mémoire au total depuis le 15/06/2026. Oracle a divisé l'offre par deux sans annonce, puis a supprimé les instances au-dessus des nouvelles limites à partir du 18/08/2026 ([InfoQ](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)).
- **Récupération pour inactivité :** une instance est jugée inactive si, sur 7 jours, le 95e centile du processeur, du réseau ET de la mémoire reste sous 20 % ([doc Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)). L'usine garde donc un vrai travail en continu.
  - **Ce qui est vrai au 25/09/2026 : personne ne relève ces mesures.** Aucun service de surveillance ne tourne sur l'usine, `sysstat` n'est pas installé, et rien ne prévient Benj. Le seul relevé est ponctuel, fait à la main lors du contre-examen du 25/09 (machine âgée de 23 h, donc aucun 95e centile sur 7 jours possible) : processeur 4,6 % en moyenne depuis le démarrage, réseau 0,03 % des 2 Gbit/s, mémoire 21,6 % sur un instantané, tenue au-dessus des 20 % surtout par le Studio Claw3D en mode dev (15 % à lui seul). Studio arrêté, les trois mesures passeraient sous 20 %.
  - **Ce qui le rendra vrai :** la fiche **026-053** (`scripts/usine/surveillance.mjs` et son unité `presti-surveillance.service` : mesure chaque minute, 95e centiles sur 7 jours, point chaque matin, décision quand le seuil approche, jamais de charge factice), mise en service par la fiche **026-058** (après les « oui » de Benj). Les deux sont encore des brouillons (`.orchestre/brouillons-ecosysteme/026/`). Tant qu'elles ne sont pas passées, une mesure se prend à la main.
- **Oracle peut changer ses conditions sans préavis.** Rien d'indispensable à l'argent ne doit dépendre de l'usine seule : chaque tâche reste reprenable par le PC.

## Sécurité

- **Accès :** SSH par clé seulement (mot de passe coupé, root interdit), fail2ban, mises à jour de sécurité automatiques. Seul le port 22 est ouvert en entrée.
- **Secrets :** jamais dans `cloud-init.yaml`. Ils arrivent par un fichier `~/.config/presti/agents.env` en mode 600 : clé « agents » plafonnée et jetons d'agents à portée limitée. Jamais la clé du produit, ni la clé Stripe, ni la clé de service Supabase en écriture complète.
- **Codex :** mêmes règles que sur le PC (bac à sable `workspace-write`, `garde-git.rules`). Sa connexion au compte ChatGPT de Benj passe par `codex login --device-auth`, dont Benj valide le code.
- **Sudo :** `usine` n'a plus de sudo complet depuis le 25/09/2026 (section suivante). L'administration (apt, AppArmor, sudoers, services) passe par le compte **`ubuntu`**, même clé : `ssh -i ~/.ssh/presti-usine ubuntu@88.96.53.3`.

### Sudo restreint (25/09/2026)

**Avant :** `sudo -n -l` rendait pour `usine` `(ALL) NOPASSWD: ALL` (ligne `sudo:` de `cloud-init.yaml`, dans `/etc/sudoers.d/90-cloud-init-users`) plus `(ALL : ALL) ALL` (groupe `sudo`). Tout ce qui tourne sous `usine` pouvait donc devenir root : Codex, et surtout les juges d'`executer`, qui tournent sans bac à sable.

**Après :** `usine` n'a droit, sans mot de passe, qu'à **une** commande, exacte, sans joker : celle que lance `npx playwright install --with-deps chromium webkit` (le `preparer` de `usine.mjs`) pour les dépendances apt de Chromium et WebKit :

```
usine ALL=(root) NOPASSWD: /usr/bin/sh -c apt-get update&& apt-get install -y --no-install-recommends libasound2t64 … libavif16
```

(78 paquets pour Playwright 1.63.0 sur Ubuntu 24.04 arm64 ; le fichier complet est `/etc/sudoers.d/usine-restreint`, identique à celui que pose `cloud-init.yaml`, même SHA-256 `2df98882…`). `usine` n'est plus dans le groupe `sudo` ; la ligne `usine` de `90-cloud-init-users` est retirée, celle d'`ubuntu` reste.

- **Comment la liste a été obtenue :** un faux `sudo` placé en tête du `PATH` a noté les arguments que Playwright 1.63.0 lui passe (`sudo -- sh -c "apt-get update&& apt-get install …"`, code de Playwright : `transformCommandsForRoot`), sans rien lancer. Il n'y a pas de `--dry-run` qui l'affiche en 1.63.
- **Vérifié le 25/09 à 14:30 UTC, depuis une nouvelle session ssh :** `sudo -n true` → « a password is required », code 1 ; `sudo -n id`, `-s`, `-i`, `bash -c id`, `sh -c id`, `apt-get update`, `cat /etc/shadow`, `-u ubuntu id` → tous refusés, code 1 ; `sudo -n -l /usr/bin/sh -c "<la commande>"` → autorisée, code 0 ; la même avec un paquet de plus, ou de moins → refusée, code 1. Le vrai `playwright install --with-deps chromium webkit` passe (code 0, 4 s, « 0 upgraded, 0 newly installed »). `codex --version` (0.156.1, connecté) et `node scripts/usine.mjs etat` marchent.
- **Le filet :** avant l'activation, un minuteur systemd (`systemd-run --on-active=15min`, unité `usine-sudo-filet`) armé en root devait remettre l'ancien fichier et le groupe `sudo` au bout de 15 min, sauf si `usine` confirmait en écrivant un jeton dans `~/.sudo-restreint-confirme`. Confirmé après les vérifications (14:31 UTC) ; le minuteur est passé à 14:45:33 et a noté dans `/var/log/usine-sudo-filet.log` (lisible par tous) : « confirme par usine : restriction gardee, rien n est restaure ». Relu à 14:46 : l'unité a disparu, `sudo -n true` refuse toujours, `sudo -n -l` ne liste que la règle Playwright. Sauvegardes en root dans `/root/usine-sudo-filet/` (`90-cloud-init-users.avant`, `restaurer.sh`).
- **Revenir en arrière :** `ssh -i ~/.ssh/presti-usine ubuntu@88.96.53.3 'sudo rm -f /home/usine/.sudo-restreint-confirme && sudo bash /root/usine-sudo-filet/restaurer.sh && sudo tail -1 /var/log/usine-sudo-filet.log'`.
- **Si Playwright change de version** (et que sa liste apt change) : la commande de `preparer` ne correspond plus, sudo la refuse. Refaire la capture avec le faux `sudo` (`PATH=<dossier du faux sudo>:$PATH node ~/presti/node_modules/playwright/cli.js install --with-deps chromium webkit`), puis poser la nouvelle ligne sous `ubuntu` (`visudo -cf` d'abord), et reporter la même dans `cloud-init.yaml`.

**⚠ Trois conséquences à connaître :**

1. **`preparer` : garde sudo corrigée le 25/09/2026 au soir.** L'ancienne garde, `sudo -n true`, échouait depuis la restriction (code 3, « sudo sans mot de passe indisponible ») : `preparer` s'arrêtait après `npm ci`, avant les navigateurs. Elle est remplacée par la vérification que **la règle autorisée figure dans `sudo -n -l`** :
   ```
   regles=$(sudo -n -l 2>/dev/null || true)
   case "$regles" in *'NOPASSWD: /usr/bin/sh -c apt-get update&& apt-get install'*) ;; *) echo "✗ sudo -n -l ne donne pas la règle des dépendances apt de Playwright …"; exit 3;; esac
   ```
   (Lu dans une variable, pas `sudo -n -l | grep -q` : sous `set -o pipefail`, un `grep -q` qui ferme le tube tôt peut faire échouer la garde.) Puis, si `playwright install --with-deps` échoue quand même (sudo refuse une commande apt qui ne correspond plus à la règle : Playwright a changé de version), un message le dit et renvoie à « Si Playwright change de version » ci-dessus, code 3.
   **Prouvé le 25/09 au soir (juste avant l’essai de 17 h 20 UTC) :** `node scripts/usine.mjs preparer` → « sudo -n -l : la règle des dépendances apt de Playwright est là », apt « 0 upgraded, 0 newly installed » (sudo accepté sur la règle exacte), « chromium démarre : ok (153.0.8010.12) », « webkit démarre : ok (26.6) », « ✓ usine prête », **code 0**, 8,2 s (`npm ci` sauté, `~/presti` avancé à `7d68786`). Contre-épreuve sur l'usine, sous `set -euo pipefail` : avec la vraie sortie de `sudo -n -l`, la garde passe ; avec une liste qui n'a pas la règle, elle refuse, code 3. `sudo -n true` refuse toujours (code 1) : la restriction tient.
2. **`usine` est dans le groupe `docker`** (ajouté pour freellmapi, après cloud-init). Le groupe `docker` vaut root : `docker run -v /:/hote …` écrit partout. **Le sudo restreint ne ferme donc pas tout le chemin vers root.** Pour le fermer : Docker sans root (rootless) pour `usine`, ou freellmapi sous un compte à part. Non fait : c'est le chantier de freellmapi, pas celui-ci.
3. **Les mises en service prévues sous `usine` avec sudo** (fiches 026-050 `socle.sh`, 026-058, 026-148 : compte `agents`, `/etc/sudoers.d/presti-agents`, `/srv/presti-agents`, `systemctl start …`) : leur garde « `sudo -n true` sous `usine` » échouera. Leurs gestes root passent par le compte `ubuntu` (même clé), pas par la console d'Oracle. Leurs futures règles (`usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre`…) restent compatibles : un fichier de plus dans `/etc/sudoers.d/`.

## Ollama (IA locale)

Installé le 26/09/2026, sous `usine`, sans root : Ollama v0.34.4 dans `~/ollama` (sha256 de l'archive vérifié). L'IA répond sur **`http://127.0.0.1:11434`**, et sur `/v1` en compatible OpenAI, **depuis l'usine seulement**.

- **Modèles :** `qwen3:4b-instruct-2507-q4_K_M` par défaut, 9 à 10 jetons/s quand l'usine travaille (11,7 quand elle est calme) ; `qwen3:8b-q4_K_M` pour les cas difficiles, 5 à 5,5 jetons/s (6,35 au calme), avec `think: false`. Mesuré à 4 OCPU ; l'écart d'une passe à l'autre dépasse parfois 30 %.
- **Relance :** un gardien (`~/ollama/gardien.sh`) relance le serveur en 6 s au plus s'il tombe. `~/.bashrc` (en tête, avant le `return` des shells non interactifs) et `~/.profile` appellent `~/ollama/demarrer.sh --silencieux`, qui relance serveur et gardien à **toute** arrivée par ssh : `ssh usine@… 'commande'`, `bash -s`, scp, `usine.mjs`. **Après un redémarrage de l'usine, Ollama ne tourne pas avant la première arrivée par ssh.** Un vrai démarrage automatique attend que Benj choisisse une option (cron par `ubuntu`, tâche planifiée du PC ou lingering) : voir `ollama-LISEZMOI.md`, « Persistance ». Pour l'arrêter durablement : `touch ~/ollama/ARRET`.
- **Disque :** la marge au-dessus du plancher de 8 Gio n'est que d'environ 1,7 Gio (`df -h ~`). Un modèle ne se télécharge que par `~/ollama/tirer.sh`, qui refuse tout ce qui crèverait un plafond.
- **Données de prospects :** Ollama sera la seule IA autorisée à les traiter, et **seulement une fois que Benj l'aura validé**. Ce n'est pas encore le cas.
- **Instance :** elle est passée à **4 OCPU / 24 Go** le 26/09. Cela contredit la limite Always Free de 2/12 citée plus haut (« Limites à connaître ») : Benj doit la vérifier dans la console Oracle.

Tout le reste (mesures, appel depuis un agent, persistance, règles) est dans **[`ollama-LISEZMOI.md`](ollama-LISEZMOI.md)**. Les scripts sont copiés à côté : `ollama-demarrer.sh`, `ollama-gardien.sh`, `ollama-tirer.sh` et `ollama-bashrc-crochet.txt`. La commande qui compare leurs sha256 avec l'usine est dans `ollama-LISEZMOI.md`, juste après l'arborescence. Aucune empreinte n'est recopiée ici.

## Exécuter une fiche sur l'usine

Le pont est `scripts/usine.mjs`, dans le dépôt presti, lancé depuis le PC. Codex traite une fiche de `.orchestre/file/` sur l'usine au lieu du PC (8 Go, saturé). Il reçoit le même contrat de tâche que les autres exécutants : le prompt vient de `scripts/antigravity.mjs`, la boucle de `scripts/executant.mjs`. **Le PC reste le seul à committer, et c'est lui qui rend le verdict officiel.**

### Les commandes (depuis `C:/Users/benja/Documents/presti`)

| Commande | Ce qu'elle fait |
|---|---|
| `node scripts/usine.mjs etat` | Dit si l'usine répond, donne sa charge, sa mémoire et son disque, si Codex est connecté, où en est `~/presti` et quelles tâches sont en cours. |
| `node scripts/usine.mjs preparer` | À lancer une fois, puis après chaque changement de `package-lock.json` sur `main`. Fait `git fetch`, avance `~/presti` en fast-forward, lance `npm ci` et installe les navigateurs Playwright de la version du dépôt. Idempotent : `npm ci` est sauté si le `package-lock.json` n'a pas changé. Refuse de tourner si une tâche est en cours (`--forcer` pour passer outre). Sa garde sudo vérifie que la règle des dépendances apt de Playwright figure dans `sudo -n -l` (correctif du 25/09 au soir : voir « Sudo restreint »). |
| `node scripts/usine.mjs paquet <id>` | Essai à sec : construit le paquet, le contrôle et l'affiche, sans rien prendre ni envoyer. |
| `node scripts/usine.mjs lancer <id> [--model=gpt-6-sol] [--boucle=3] [--effort=medium] [--minutes=40]` | Prend la fiche sur le PC, envoie le paquet et lance Codex, détaché. Pour une tâche légère : `--model=gpt-6-luna`. |
| `node scripts/usine.mjs recuperer <id> [--attendre[=60]] [--forcer]` | Rapatrie le résultat, l'applique, passe la fiche en `fait/` et lance `verifier` sur le PC. Si le PC rend FAIL, le patch est retiré. Sans `--attendre`, répond seulement « en cours » (code 4). Relancé plus tard, il redit le verdict du PC avec son code. |
| `node scripts/usine.mjs nettoyer <id> [--forcer]` | Retire le worktree et le dossier de la tâche sur l'usine. Refuse si la tâche tourne encore ou n'a pas été récupérée ; `--forcer` arrête Codex et jette tout. |
| `node scripts/usine.mjs executer [options] -- <commande…>` | Fait tourner un **juge** (pas Codex) sur l'usine, sur l'état actuel du PC, et rend son code de sortie tel quel. Voir « Faire tourner un juge sur l'usine (executer) », plus bas. |

Codes de sortie : 0 ok ou PASS ; 1 FAIL ou refus ; 2 usage ; 3 usine pas prête ; 4 encore en cours ; 5 injoignable. (`executer` a les siens : ceux de la commande, 124, 125.)

L'IP de l'usine est éphémère. Si l'instance est recréée, préfixer les commandes avec `PRESTI_USINE=usine@<nouvelle ip>` (PowerShell : `$env:PRESTI_USINE='usine@<ip>'`).

### Ce que fait `lancer`, dans l'ordre

1. **Contrôles sur le PC.** La fiche doit être dans `file/`, valide, et pas réservée à `claude-code`. Son périmètre doit rester hors du vault SaaS, absent de l'usine. HEAD du PC doit être égal à `origin/main`, sinon refus : « pousse d'abord ».
2. **Le paquet, construit avant la prise.** Il ne contient que ce que git connaît :
   - les fichiers suivis modifiés depuis HEAD ;
   - les fichiers non suivis **non ignorés**.

   Sont retirés : `public/promo/`, `promo-src/`, `.claude/`, `.orchestre/travail/`, `.orchestre/brouillons-ecosysteme/`, les preuves des autres tâches, tout `.env*`, tout fichier de clé (`.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, `.ppk`, `id_rsa`…, hors `.pub`) et tout fichier de plus de 5 Mo. Le paquet est figé par un index git temporaire : ni l'index réel ni l'arbre de travail ne bougent.
3. **Seconde barrière, indépendante du filtre.** Elle lit le paquet réellement construit et refuse l'envoi si elle trouve :
   - un `.env*` ou un fichier de clé ;
   - un chemin ignoré (`git check-ignore`) ;
   - une clé dans une ligne ajoutée : `sk_`, `sk-`, `whsec_`, `eyJ` (y compris un JWT court en `eyJ….eyJ…`), `sb_secret_`, `-----BEGIN` hors clé publique, `service_role=`, une ligne de `.env` collée (`NOM_SECRET=valeur`, `_TOKEN`, `_PASS`, `_KEY`…), `ghp_`/`github_pat_`, `AIza`, `re_` (Resend) ;
   - la même chose dans le contenu **entier** de chaque fichier que git traite en binaire (octet NUL) : son patch est en base 85, illisible ligne à ligne, donc le blob envoyé est relu octet pour octet, et une seconde fois sans les NUL pour l'UTF-16.

   La liste des fichiers est imprimée. La valeur trouvée ne l'est jamais : seulement le chemin, la ligne (ou `binaire`) et le motif.
4. **La prise sur le PC.** L'agent `usine-codex-<N>` est inscrit dans `.orchestre/agents.jsonl`, puis `orchestre prochaine` fait passer la fiche en `en-cours/`. Aucun autre exécutant ne peut plus la prendre.
5. **Envoi par scp** dans `~/taches/<id>/` : le paquet, le prompt, la configuration et une copie de `usine.mjs`, qui sert de tourneur. Si `.orchestre/travail/usine/<id>/` existe déjà (fiche rejouée puis relancée), il est d'abord rangé en `<id>.<date>/` : sinon `recuperer` redirait l'ancien verdict.
6. **Montage sur l'usine.**
   - Git crée un worktree jetable `~/taches/<id>/arbre` sur le commit du PC, puis applique le paquet.
   - `node_modules` y est une copie en liens physiques de `~/presti/node_modules` (`cp -al` : aucune donnée copiée, quelques secondes). Pas un lien symbolique : tsc le résout vers son chemin réel, et `constructeur-ferme-qa` CF-8, qui exige `<arbre>/node_modules`, rendait un faux rouge (relecture à froid du 24/09, U2).
   - Un commit local « base » est créé par `git commit-tree`. Il n'est jamais poussé et ne déclenche aucun crochet.
   - Le tourneur démarre détaché de ssh avec `setsid`.
7. **Le tourneur.** Il lance `codex exec` : bac à sable `workspace-write`, réseau autorisé, `-C` sur le worktree. Ensuite :
   - le vérificateur tourne hors bac à sable ;
   - si c'est vert, la fiche passe en `fait/` et le vérificateur est relancé ;
   - si c'est rouge, sa sortie est ajoutée au prompt et Codex est relancé, `--boucle` fois au plus.

   Dans `~/taches/<id>/` : `codex.log`, `etat.json`, puis `code` à la fin. Valeurs de `code` : 0 PASS, 1 FAIL, 3 quota épuisé, 4 fiche non prise, 5 erreur, 6 Codex déconnecté, 7 question posée, 8 arrêté.

### Ce que fait `recuperer`

1. **Le diff.** Sur l'usine, un diff binaire depuis « base », limité au `perimetre` de la fiche et à `.orchestre/preuves/<id>/`.
   - Un fichier modifié ailleurs est **signalé et exclu**, y compris s'il est dans le périmètre mais aussi dans `interdit`.
   - Le reste de `.orchestre/` n'est pas rapatrié.
   - Le `avant.txt` et le `verifier.log` de l'usine ne passent pas dans le patch : le PC a les siens.
2. **Le rapatriement** dans `.orchestre/travail/usine/<id>/` (ignoré par git) :
   - `resultat.patch` et `codex.log` ;
   - `verifier-usine.log`, `etat.json`, puis `applique.json`, `verdict-pc.log` et `verdict-pc.json` une fois le PC passé ;
   - le paquet envoyé et la copie reçue par l'usine (`paquet.patch`, `paquet-recu-par-l-usine.patch`, `paquet.liste.txt`).
3. **Si l'usine n'a pas rendu PASS,** rien n'est appliqué et la fiche reste en `en-cours/`. Avec `--forcer`, le patch est appliqué et le PC juge, exactement comme au point 4 : un rouge le retire. Si Codex a posé une question, elle est copiée en `en-cours/<id>.question.md`.
4. **Sinon, sur le PC, dans cet ordre :**
   1. `git apply --check`, puis `git apply`. Seul l'arbre de travail change : ni l'index ni HEAD ne bougent. `applique.json` note l'empreinte du patch appliqué.
   2. La fiche passe d'`en-cours/` à `fait/`, puis `orchestre verifier <id>` donne le verdict officiel.
   3. **Rouge :** l'orchestre range la fiche en `refuse/`, et le patch est **retiré du PC** (`git apply -R`, seulement s'il se retire proprement ; sinon il reste, avec un avertissement). Le PC ne garde que ce que son propre verdict juge PASS ; le patch refusé attend dans `resultat.patch`.
   4. Le verdict est écrit dans `verdict-pc.json`, puis **seulement ensuite** la marque `recupere` est posée sur l'usine, avec ce verdict (`etat` l'affiche : « récupéré PASS PC »).
5. **Un second `recuperer`** redit le verdict enregistré : code 0 seulement si c'est PASS et que la fiche est toujours en `fait/`, sinon 1. Si le patch est appliqué mais qu'aucun verdict n'a été enregistré (vérificateur tué, coupure), il rejuge. Si l'usine dit « récupérée » sans verdict enregistré sur le PC, il refuse de conclure (code 1).

### Essai de bout en bout (24/09/2026)

- **Fiches :** `000-usine-essai`, puis `000-usine-essai-2` pour la version finale du script, puis `000-usine-essai-3` après les corrections de l'attaque (ci-dessous).
- **Déroulé :** Codex (gpt-6-luna) a pris la fiche lui-même dans sa copie, écrit `bonjour.txt` et lancé `verifier`. Le tourneur a revérifié hors bac à sable : PASS. Retour au PC : 1 fichier rapatrié, 0 hors périmètre, **PASS sur le PC**.
- **Durées :** 62 s, 64 s et 69 s de `lancer` au verdict du PC, dont 21 à 24 s de Codex. `preparer` : `npm ci` en 15 s la première fois, 4 s ensuite.
- **Paquet :** l'empreinte SHA-256 de ce qui a été envoyé est identique à celle de ce que l'usine a reçu (essai 3 : `4b82e866…`, 137 fichiers, 4,0 Mo, 12 binaires lus en entier). Aucun `.env*`, aucun fichier de clé, aucun chemin ignoré par git, pas de `.env.local`.
- **Essai 3, reprise :** un second `recuperer` a redit « PASS sur le PC » (code 0). Avec `verdict-pc.json` mis de côté (vérificateur supposé interrompu), il a rejugé sur le PC : PASS.

### Attaque du 24/09/2026 : ce qu'elle a montré, ce qui a changé

Une première session d'attaque avait été coupée avant tout essai réel. Les essais ont été menés ensuite, d'abord avec le script d'origine (sha256 `eb1956b7…`), puis avec le script corrigé. Journaux, fixtures et copie du script d'origine : `.orchestre/travail/usine/attaques-2026-09-24/` (sur le PC, ignoré par git).

| Essai | Script d'origine | Script corrigé |
|---|---|---|
| Paquet : `eyJ-FAUX-JETON-ESSAI` dans un texte | refusé | refusé |
| Paquet : JWT court `eyJ….eyJ….…` | **envoyé** (code 0) | refusé |
| Paquet : jeton dans un fichier à octet NUL | **envoyé** | refusé (`:binaire`) |
| Paquet : ligne ajoutée qui commence par `++ sk_live_…` (lue comme un en-tête `+++`) | **envoyé** | refusé |
| Paquet : `VERCEL_TOKEN=…` collé dans un `.txt` | **envoyé** | refusé |
| Paquet : `sb_secret_…` seul | **envoyé** | refusé |
| Paquet : fichier `.pem` | refusé par la seconde barrière seule | écarté par le filtre, la seconde barrière reste |
| Retour : PASS de l'usine, intrus posé sur le PC dans le périmètre, FAIL du PC | résultat refusé **laissé appliqué**, second `recuperer` : « ✓ déjà récupérée », **code 0** | patch retiré, fiche en `refuse/`, second `recuperer` : « ✗ … FAIL », code 1 |
| Retour : FAIL de l'usine (simulé en réécrivant son `etat.json`), `recuperer --forcer`, FAIL du PC | (même chemin que ci-dessus) | refus sans `--forcer` ; avec, patch appliqué, jugé, retiré ; code 1 |
| Débordement : 2 fichiers écrits hors périmètre dans le worktree | exclus du patch, signalés | idem |
| Concurrence : second `lancer` de la même fiche pendant qu'elle tourne (pas une vraie course) | — | refusé (« n'est pas dans file/ ») |

Non changé, après lecture :
- **PC en retard sur GitHub :** `lancer` compare HEAD à l'`origin/main` connu du PC, sans `fetch`. L'usine, elle, fait `git fetch` et refuse avant toute prise (« pousse d'abord (ou tire) »). Pas d'essai réel possible sans pousser.
- **`v` indéfini au dernier tour du tourneur :** chaque branche lance le vérificateur ou sort, donc le cas ne se produit pas ; un repli a quand même été ajouté (FAIL au lieu d'ERREUR).

### Pièges

- **Pas de `bash -l` pour les commandes distantes.** En shell de connexion, un `exit 0` exécute `~/.bash_logout`, dont `clear_console` échoue sans terminal ; avec `set -e`, le code devenait 1. Le script lance `bash -s` après avoir chargé `~/.profile`, ce qui donne le même PATH (`~/.local/bin`, donc codex).
- **`npm ci` lance `husky`**, qui poserait `core.hooksPath` et ferait tourner le pre-commit (`npm run typecheck`) à chaque commit. `preparer` passe donc `HUSKY=0`, et la « base » est faite par `commit-tree`.
- **Fins de ligne.** Un fichier que Codex écrit avec `\n` arrive en `\r\n` sur le PC (`core.autocrlf=true`). Un juge doit tolérer l'une ou l'autre.
- **Valeurs factices dans les juges.** Un jeu d'essai qui contient `SERVICE_ROLE_KEY=cle-supabase-du-fichier` déclenchait le motif `service_role=`. Une valeur n'est tenue pour une clé que si elle en a la forme : un JWT, `sb_secret_`, ou des chiffres ET des lettres (même règle pour `sk_`, `sk-`, `whsec_`, `sb_secret_`, `NOM_SECRET=` et `re_`). Celles qui sont écartées sont affichées à chaque paquet. Un faux jeton de test qui a des chiffres et des lettres bloque `lancer` : l'écrire en lettres seules.

### Limites

- **`lancer` reste à la main :** Claude Code lance. Le rapatriement, lui, peut se faire sans personne : `scripts/usine-veille.mjs` (section « La veille », plus bas) récupère les tâches finies que personne ne suit. Tant que sa tâche planifiée n'est pas installée (elle attend le « oui » de Benj), c'est Claude Code qui fait `recuperer`.
- **Le paquet part de l'état non commité du PC,** chantiers des autres sessions compris. Si, entre `lancer` et `recuperer`, le PC modifie un fichier du patch, `git apply --check` refuse et rien n'est écrasé ; s'il ajoute autre chose dans le périmètre, le patch s'applique et le verdict du PC tranche (rouge : patch retiré).
- **Le verdict officiel tourne sur le PC.** Un vérificateur lourd (Playwright, build) y reste donc lourd, sauf si la fiche le fait passer par `executer` (section suivante). Depuis le 25/09 au soir, une telle fiche peut aussi être **lancée** sur l'usine : là-bas, `executer` fait tourner le juge sur place (« Lancé sur l'usine même », plus bas).
- **Ce qui ne revient pas :** les fichiers ignorés par git que Codex produit (captures `.png` des séries ignorées, par exemple). Le juge du PC doit capturer lui-même.
- **Aucun secret sur l'usine :** une fiche qui a besoin de `.env.local`, de la base ou de Stripe ne peut pas y tourner. Codex écrit une question et `recuperer` la rapporte.
- **Une question de Codex ne se répond pas en cours de route :** il faut `liberer`, puis `nettoyer --forcer`, puis relancer.
- **`node_modules` est partagé.** Un paquet qui modifie `package.json` ou `package-lock.json` est refusé (`--forcer` pour passer outre) ; `preparer` refuse pendant qu'une tâche tourne.
- **Pas de vault sur l'usine :** un périmètre en `SaaS/` est refusé.
- **Deux `lancer` simultanés de fiches différentes** peuvent tirer le même numéro `usine-codex-<N>`. L'orchestre refuse alors le second (« un agent, une tâche ») avant tout envoi : il suffit de le relancer.
- **Un rouge du PC retire le patch.** Pour regarder le résultat refusé : `git apply .orchestre/travail/usine/<id>/resultat.patch` (puis `git apply -R` pour le retirer).

## La veille : rapatriement automatique (`usine-veille.mjs`)

Ajoutée le 25/09/2026. Une tâche Codex finie sur l'usine attendait qu'une session Claude Code lance `recuperer` : si la session qui l'avait lancée était fermée, le résultat restait sur le serveur. `scripts/usine-veille.mjs` (dans le dépôt presti, lancé depuis le PC) rapatrie ces tâches-là, et seulement elles.

```
node scripts/usine-veille.mjs [--essai] [--grace=30] [--boucle=<minutes>] [--simuler=<etat.json>]
```

| Option | Effet |
|---|---|
| `--essai` | Dit ce qu'il ferait, sans rien faire : ssh en lecture seule, ni `recuperer` ni `nettoyer`, aucun fichier écrit. |
| `--grace=<min>` | Une tâche finie depuis moins de tant de minutes est laissée à l'agent qui l'a lancée (défaut 30). |
| `--boucle=<min>` | Un passage toutes les N minutes, jusqu'à Ctrl+C, SIGTERM ou la création de `.orchestre/travail/usine/veille.stop`. L'étape en cours n'est jamais coupée : `recuperer` tourne dans sa propre console, la veille attend sa fin puis s'arrête. |
| `--simuler=<json>` | Rejoue un état de l'usine écrit à la main (essai forcé), pour éprouver les décisions. |

**Un passage :** il lit l'état des tâches de l'usine (`~/taches/<id>/` : `code`, pid vivant, marque `recupere`, `etat.json`) par une seule connexion ssh en lecture seule, puis les processus node du PC dont la ligne de commande contient `usine.mjs`. Pour chaque tâche, il décide :

| Cas | Décision |
|---|---|
| En cours, ou arrêtée sans code | rien (arrêtée : « à regarder à la main ») |
| Déjà marquée `recupere` | rien ; si le PC a rendu PASS, il rappelle `nettoyer <id>` |
| Fiche absente de `.orchestre/en-cours/` sur le PC | rien |
| `verdict-pc.json` déjà là, ou `applique.json` sans verdict | rien : un `recuperer` tourne peut-être ailleurs, ou a été interrompu |
| Processus du PC illisibles | rien, pour aucune tâche |
| Un processus `usine.mjs … <id>` tourne sur le PC | rien : un agent la suit |
| Finie depuis moins de `--grace` | rien : laissée à l'agent qui l'a lancée |
| Déjà rapatriée une fois sans être appliquée (même `etat.json` en local : verdict de l'usine QUESTION, FAIL, QUOTA…, ou `git apply --check` refusé) | rien : « à traiter à la main », la veille ne rejoue pas |
| Sinon | `node scripts/usine.mjs recuperer <id>`, puis `nettoyer <id>` si le verdict du PC est PASS |

Juste avant chaque `recuperer`, les processus du PC sont relus : une tâche prise entre-temps est laissée. Une tâche à la fois.

**Ce qu'il ne fait jamais :** lancer une tâche Codex (ni `lancer`, ni `executer`), committer, toucher `usine.mjs` ou `orchestre.mjs`. Il appelle `recuperer` et `nettoyer` comme Claude Code le ferait, et leurs règles tiennent : le PC ne garde que ce que SON verdict juge PASS.

**Ce qu'il écrit** (dans `.orchestre/travail/usine/`, ignoré par git) : `veille.jsonl`, une ligne par tâche rapatriée (date, id, agent, verdicts de l'usine et du PC, codes de `recuperer` et `nettoyer`, durées : Codex sur l'usine, attente avant la veille, `recuperer`, `nettoyer`) ; `veille-dernier.txt`, le résumé lisible du dernier passage ; `<id>/veille.log`, la sortie complète de `recuperer` et `nettoyer`. Un verrou (`veille.verrou`, pid et date) empêche deux veilles à la fois.

Codes : 0 passage fait ; 1 un rapatriement n'a pas rendu PASS ; 2 usage ; 3 une autre veille tourne ; 5 usine injoignable.

### Essais du 25/09/2026

| Essai | Résultat |
|---|---|
| `--essai` sur l'usine réelle (14:24 UTC) | 025-10 : finie il y a 19 h, verdict QUESTION, déjà rapatriée une fois → « à traiter à la main » ; 025-21 : en cours → rien. **0 tâche à rapatrier.** 1,3 s. Aucun fichier créé (liste de `.orchestre/travail/usine/` identique avant et après). |
| Passage réel sur le même état (14:26) | 025-21 venait de finir (QUESTION) : moins de 30 min → laissée. 0 action, `veille-dernier.txt` écrit, pas de ligne dans `veille.jsonl`. |
| `--simuler` : 8 cas écrits à la main | la seule tâche orpheline (PASS, finie depuis 45 min, fiche en `en-cours/`, personne) → « FERAIT recuperer » ; finie depuis 10 min → grâce ; suivie par un processus → laissée ; fiche en `fait/` → rien ; marquée récupérée PASS → rappel de `nettoyer` ; arrêtée sans code, en cours, identifiant hors règle → rien. |
| Un faux suiveur (`node … usine.mjs recuperer 025-10 --attendre`) lancé sur le PC | 025-10 : « suivie sur le PC par pid … » ; suiveur fini, elle redevient « à traiter à la main ». |
| `--boucle=1`, puis une seconde veille, puis `veille.stop` | la seconde : « une autre veille tourne », code 3 ; la boucle s'arrête 6 s après le fichier, « arrêtée proprement après 1 passage », verrou retiré. |
| L'action de la tâche planifiée (ci-dessous), lancée à la main en `--essai` | tourne sans fenêtre, sortie dans le fichier journal, code 0. |

**Pas encore prouvé :** un rapatriement réel par la veille. Le 25/09, aucune tâche n'était finie, non récupérée ET sans agent pour la suivre (025-18 à 025-22 étaient suivies par la session de production). Le premier se lira dans `veille.jsonl`.

### La tâche planifiée (NON installée : configuration permanente, elle attend le « oui » de Benj)

Un passage toutes les 15 minutes, sans fenêtre (`conhost --headless`), tant que la session Windows de Benj est ouverte. PowerShell :

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\conhost.exe' -Argument '--headless cmd.exe /d /c "node scripts\usine-veille.mjs >> .orchestre\travail\usine\veille-tache.log 2>&1"' -WorkingDirectory 'C:\Users\benja\Documents\presti'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 15)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Presti usine veille' -Action $action -Trigger $trigger -Settings $settings -Description 'Veille de l usine Presti : rapatrie les taches finies que personne ne suit (scripts/usine-veille.mjs)'
```

L'objet de la tâche a été construit (`New-ScheduledTask`, sans `Register`) le 25/09 : répétition toutes les 15 min sans fin, une seule instance à la fois. Pour la retirer : `Unregister-ScheduledTask -TaskName 'Presti usine veille' -Confirm:$false`. Pour la mettre en pause (pendant une production suivie de près, par exemple) : créer `.orchestre/travail/usine/veille.stop` — tant qu'il est là, chaque passage dit « veille en pause » et ne fait rien ; le supprimer pour reprendre. (Avec `--boucle`, ce même fichier arrête la boucle.)

### Limites

- **Une session qui suit une tâche sans processus vivant** (elle regarde `etat` de temps en temps, puis lancera `recuperer`) n'est vue que par le délai de grâce. Si elle lance `recuperer` pendant que la veille le fait déjà, les deux se marchent dessus (`recuperer` n'a pas de verrou) : le second tombe en général sur `git apply --check` refusé ou sur le verdict déjà rendu, sans dégât, mais ce n'est pas garanti. Pendant une production suivie de près, allonger `--grace` ou mettre la tâche planifiée en pause.
- **`recuperer` juge sur le PC** (`orchestre verifier`) : un vérificateur lourd le reste, à l'heure où la veille passe, sauf s'il passe lui-même par `executer`.
- **La veille ne tourne que PC allumé** : elle rapatrie au PC. PC éteint, les tâches attendent sur l'usine, comme avant.
- **Le verrou se fie au pid :** si Windows a redonné le pid d'une veille morte à un autre processus, la veille refuse (code 3) ; le message donne le fichier à supprimer.

## Faire tourner un juge sur l'usine (executer)

Ajouté le 25/09/2026. Le PC (8 Go, saturé) n'a plus à faire tourner les juges lourds (Chromium, tsc, build). `executer` monte l'état **actuel** du PC sur l'usine, y lance une commande et rend son code de sortie tel quel. Ce n'est pas un exécutant : aucune fiche prise, pas de Codex, pas de bac à sable Codex (c'est un juge écrit par Claude Code), aucun patch rendu.

```
node scripts/usine.mjs executer [--nom=verif] [--delai=30] [--attendre=30] [--id=<id>] [--rapatrier=<chemin>] [--forcer] [--liste] -- <commande et arguments>
```

Dans une fiche :

```
verifier: node scripts/usine.mjs executer -- node scripts/<juge>.mjs
```

Le verdict reste celui de l'orchestre, sur le PC : il lit le code de sortie et écrit `verifier.log` comme d'habitude. Le travail lourd tourne sur l'usine.

### Les options (toutes AVANT `--` ; ce qui suit appartient à la commande)

| Option | Effet |
|---|---|
| `--nom=<bac>` | Le bac `~/bacs/<bac>` (défaut `verif`). Minuscules, chiffres, `-` et `_`, 32 caractères au plus. Deux noms différents tournent en parallèle. |
| `--delai=<min>` | Délai de la commande (défaut 30, 600 au plus). Dépassé : la commande et ses enfants sont arrêtés, code 124. |
| `--attendre=<min>` | Si le bac est pris par un autre `executer` : attendre au plus tant (défaut 30), puis refuser. `--attendre=0` refuse tout de suite. |
| `--id=<id>` | Met dans le paquet les preuves de cette fiche (`.orchestre/preuves/<id>/`). Sans lui, aucune preuve ne part. |
| `--rapatrier=<chemin>` | Ramène sur le PC les fichiers **écrits par la commande** sous ce chemin. Seulement sous `.orchestre/travail/<…>` (hors `usine/` et `executant/`) ou `.orchestre/preuves/<id>/` (hors `avant.txt` et `verifier.log`, qui sont ceux du PC). |
| `--forcer` | Laisse passer un paquet qui modifie `package.json` ou `package-lock.json`, ou un `node_modules` d'un autre `package-lock.json`. |
| `--liste` | Imprime la liste complète des fichiers du paquet. |

### Codes de sortie

- **Celui de la commande, quand elle est sortie d'elle-même** : 0, 1, 2, 3… C'est l'usine qui le dit (voir plus bas « Comment l'usine sait que la commande a fini d'elle-même ») ; le code de sortie de `ssh.exe` n'est jamais pris pour celui du juge.
- **124** : délai dépassé (`--delai`).
- **125** : verdict non rendu. Soit la commande n'a pas été lancée (usine injoignable, paquet refusé par les barrières, bac occupé au-delà de `--attendre`, option invalide, HEAD du PC inconnu de GitHub), soit elle n'a pas fini d'elle-même : session ssh coupée pendant la commande (PC tué, `ssh.exe` tué, connexion perdue, juge qui coupe sa propre session), commande tuée par un signal (mémoire saturée, arrêt venu d'ailleurs), ou code introuvable. Le message commence toujours par `✗ usine executer :`, et par `✗ usine executer : verdict non rendu :` quand la commande a tourné sans rendre de verdict.
- Avec `--rapatrier` : si rien n'est rapporté, ou si un fichier rapporté fait 0 octet (« preuve vide »), alors que la commande a rendu 0, le code devient 125. Une preuve absente ou vide ne passe pas pour une preuve. Quand le verdict n'est pas rendu, rien n'est rapatrié.
- Une commande qui rend elle-même 124 ou 125 est relayée telle quelle : l'orchestre ne peut pas la distinguer de l'outil. Un juge ne doit pas utiliser ces deux codes.

L'outil ne parle que sur la sortie d'erreur (lignes `· usine executer :`). La sortie standard est celle de la commande seule, relayée en direct, comme ses erreurs.

### Comment l'usine sait que la commande a fini d'elle-même (correctif du 25/09/2026)

Trois marques, écrites sur l'usine, jamais par le PC :

1. **La veille** lit l'entrée de la session ssh. Si elle se ferme pendant la commande, c'est que le PC n'écoute plus : elle écrit **d'abord** sa marque, puis arrête la commande (TERM, puis KILL 5 s après). Avec cette marque, le code de la commande ne compte pas (125), même si elle est sortie 0 sur le TERM : c'était l'attaque r5, rendue 0 avant le correctif.
2. **Le lanceur** (quelques lignes de `perl`, présent sur toute Ubuntu) lance `bash -c <commande>`, l'attend (`waitpid`) et écrit « code N » si elle est sortie d'elle-même, « signal N » si elle a été tuée. `bash` seul rend 128+N dans les deux cas : il ne sait pas faire la différence. Si le lanceur est arrêté lui-même (veille, délai), il n'écrit rien : pas de marque, pas de fin d'elle-même (125).
3. **La fin** (`~/bacs/.runs/<jeton>.fin` : code rendu, cause, code brut) est écrite quand tout est arrêté, puis envoyée au PC dans un repère de fin signé d'un jeton que la commande ne voit pas (ni exporté, ni en argument). Si le PC n'a pas reçu ce repère (ssh tué, connexion perdue), il relit la fin sur l'usine par une nouvelle connexion, en l'attendant 90 s au plus, et dit si des processus de la commande tournent encore. Introuvable : 125.

Causes possibles : `seule` (code de la commande), `delai` (124), `veille`, `signal-<NOM>`, `sans-marque` (125). Sur place (section suivante), `veille` est remplacée par `interrompu-<SIGNAL>`, et `non-lancee` s'y ajoute (125 tous deux).

### Lancé sur l'usine même : la commande tourne sur place (correctif du 25/09/2026, soir)

**Le défaut.** Une fiche dont le `verifier` passe par `executer` ne pouvait **jamais** être verte sur l'usine. Lancée par `lancer`, son vérificateur (celui du tourneur, hors bac à sable, comme celui que Codex lance lui-même) appelait `executer` dans le worktree `~/taches/<id>/arbre`, qui tentait ssh vers l'usine… depuis l'usine, sans la clé du PC : « Host key verification failed », 125 à chaque tour. 025-19, 025-20 et 025-21 y ont brûlé leurs 3 tours chacune, puis il a fallu `recuperer --forcer`.

**Le correctif.** `executer` reconnaît qu'il tourne déjà sur l'usine (fonction `surUsine`) et lance alors la commande **dans l'arbre courant** (le worktree de la tâche, ou le bac d'un autre `executer`), **sans paquet ni ssh**, avec le même lanceur perl sous le même `timeout -k 20 <délai>` : mêmes codes (celui de la commande sortie d'elle-même ; 124 délai ; 125 tuée par un signal, sans marque de fin, commande non lancée, ou `executer` lui-même arrêté par SIGTERM/SIGINT/SIGHUP pendant la commande, qu'il arrête alors avec lui). Les processus laissés par la commande (variable `USINE_EXECUTER_RUN`, même détachés) sont arrêtés à la fin. `--rapatrier` garde sa règle de preuve (rien d'écrit sous le chemin, ou un fichier de 0 octet : 125 si la commande rendait 0) mais ne copie rien : la commande a écrit dans l'arbre même, et `recuperer` rapporte les preuves de la fiche par son patch. `--nom`, `--attendre`, `--forcer`, `--id`, `--liste` n'ont pas d'effet sur place (ni bac, ni verrou, ni paquet). La première ligne le dit : « · usine executer : déjà sur l'usine (<raison>) : la commande tourne ici, dans <arbre>, sans paquet ni ssh ».

**Comment l'usine est reconnue** — jamais sous Windows (le PC reste toujours sur le chemin ssh), puis, sous Linux, dans cet ordre :
1. `PRESTI_SUR_USINE=1` : posée par le tourneur (`usine.mjs tourner`, donc héritée par Codex et par le vérificateur), et par `executer` dans l'environnement de sa commande (sur un bac comme sur place) ;
2. `USINE_EXECUTER_RUN` : la commande d'un bac ;
3. à défaut de variable : `~/presti/node_modules/.usine-lock` présent (posé par `preparer`) et **pas** de `~/.ssh/presti-usine` (la clé du PC, absente de l'usine).

**Prouvé le 25/09/2026 (17 h 20 UTC) :**
- **Fiche `000-usine-executer-local`** (`.orchestre/fait/`), `verifier: node scripts/usine.mjs executer --nom=essai-local --delai=5 -- node scripts/fixtures/usine-essai-qa.mjs usine-essai-5`, lancée par `lancer … --model=gpt-6-luna` (11 s). Sur l'usine : **PASS au tour 1** (`etat.json` : `tour 1`, `codes [0]`, 31 s de la prise au verdict) ; `verifier-usine.log` : « déjà sur l'usine (PRESTI_SUR_USINE=1) : la commande tourne ici, dans /home/usine/taches/000-usine-executer-local/arbre », « bonjour.txt … (22 octets) », code 0. Codex, dans son bac à sable, a lui aussi lancé le vérificateur sur place (un premier FAIL de son fait, apostrophe perdue, puis PASS). Puis `recuperer --attendre` sur le PC : 1 fichier rapatrié, 0 hors périmètre, `verifier` du PC par ssh (bac `essai-local`, total 10,4 s) : **PASS sur le PC**, code 0. Tâche et bacs d'essai retirés ensuite.
- **Codes sur place**, par un `executer` imbriqué dans un bac (bac `essai-ici`, retiré ensuite) : `exit(0)` → **0** (sortie standard relayée) ; `exit(3)` → **3** ; `--delai=0.05 -- sleep 30` → **124** en 3 s ; `kill -9 $$` → **125** (`signal-KILL`) ; `--rapatrier` d'un fichier de 0 octet → **125** « preuve vide » ; d'un fichier de 3 octets → **0** ; d'un chemin où rien n'est écrit → **125** ; sans aucune variable (`env -u USINE_EXECUTER_RUN -u PRESTI_SUR_USINE`) → reconnue par « ~/presti préparé, pas de clé », `exit(7)` → **7** ; `setsid sleep 301 & exit 0` → **0**, le `sleep` resté est arrêté (0 restant, `pgrep -x`) ; `executer` tué par SIGTERM au bout de 4 s pendant `sleep 302` → **125** (`interrompu-SIGTERM`), 0 `sleep` restant ; 0 dossier temporaire laissé.

**Limite.** Si `executer` est tué par SIGKILL (qui ne s'attrape pas), la commande continue jusqu'à son `--delai`, où `timeout` l'arrête : il n'y a pas de veille sur place. (Sur le PC, rien ne change : il n'est jamais reconnu comme l'usine.)

### Ce que fait `executer`, dans l'ordre

1. **Le paquet de `lancer`**, construit par les mêmes fonctions (`construirePaquet`, `controlerPaquet`) : même filtre, mêmes deux barrières anti-secret, `.env*` jamais ouvert. Il part dans l'entrée de ssh, derrière le script. L'usine vérifie sa taille et son SHA-256 à l'arrivée.
   - **Une troisième barrière, propre à `executer`** (`controlerPaquetExecuter`, correctif du 25/09) : refus si une ligne ajoutée contient une **URL avec identifiants** (`schéma://utilisateur:motdepasse@hôte` ; les gabarits `<mdp>`, `${mdp}`, `[MDP]` ne comptent pas), ou un **nom sensible suivi d'une valeur** écrit en JSON (`"SUPABASE_SERVICE_ROLE_KEY": "…"`), en YAML (`nom: valeur`), en minuscules ou en camelCase (`imap_pass=…`, `apiKey: '…'`) — la valeur doit avoir la forme d'une clé (chiffres et lettres, 16 caractères ou plus) et ne pas être une référence de code (`process.env.X`, `${{ secrets.X }}`, `a.b.c`) ; refus aussi de **toute archive** (`.zip .gz .tgz .7z .rar .bz2 .xz .tar .zst .lz4 .lzma`), et de tout fichier binaire qui en est une à sa signature, quel que soit son nom (un `.docx` ou un `.xlsx` est un zip : refusé). Le contenu entier de chaque fichier binaire du paquet — le blob exact que transporte le patch — passe aux mêmes motifs. Jamais de valeur affichée : chemin, ligne, motif. Code 125, rien n'est envoyé. `lancer` et `paquet` ne changent pas.
   - **Ce qui ne part pas est dit à chaque appel** (correctif du 25/09) : chemin, raison, effet dans le bac (« le bac garde la version du commit » pour un fichier suivi modifié sur le PC, « absent du bac » pour un non suivi). À l'écran en entier : les fichiers suivis, les > 5 Mo, les `.env*`, les fichiers de clé, les liens symboliques ; les non suivis des dossiers exclus (`EXCLUS`, preuves des autres tâches), par groupe : trois exemples puis le compte. La liste entière va dans `.orchestre/travail/usine/executer-<bac>.ne-part-pas.txt` (ignoré par git), et à l'écran avec `--liste`. Rappel : ne partent jamais les dossiers `public/promo/`, `promo-src/`, `.claude/`, `.orchestre/travail/`, `.orchestre/brouillons-ecosysteme/`, les preuves des autres fiches, les `.env*`, les fichiers de clé, les liens symboliques, les fichiers de plus de 5 Mo, et tout ce que git ignore.
2. **Sur l'usine, une seule session ssh** (`bash -s` après `~/.profile`, comme le reste) :
   - le verrou du bac (`flock` sur `~/bacs/.verrous/<bac>.lock`) : un second appel sur le même bac attend, puis refuse. Le fichier `.qui` dit qui tient le bac ;
   - le bac est recréé **au commit HEAD du PC** (c'est `origin/main` quand le PC est à jour ; s'il est en retard, le bac reste fidèle au PC). S'il est inconnu de GitHub : « pousse d'abord ». Recréation par `git worktree remove --force` puis `git worktree add`, **jamais de `reset --hard`** ;
   - le paquet est appliqué ;
   - `node_modules` est copié en liens physiques (`cp -al`, la solution U2 de `lancer`), donc tsc voit bien `<bac>/node_modules`.
3. **La commande** tourne dans le bac : `bash -c`, lancé par le lanceur perl, entrée `/dev/null`, sous `timeout`, sans bac à sable. Elle est marquée par la variable `USINE_EXECUTER_RUN`, ce qui permet d'arrêter à la fin les processus qu'elle aurait laissés, même détachés. Si ssh se coupe (PC tué, `ssh.exe` tué, orchestre qui abandonne sur son budget de minutes, juge qui coupe sa propre session), la veille de l'usine écrit sa marque et arrête la commande : 125.
4. **Rien ne revient sur le PC**, sauf avec `--rapatrier` : `scp` vers un dossier temporaire, puis chaque fichier est recontrôlé avant d'être posé dans le dépôt (aucun lien symbolique, 200 Mo au plus). Un fichier de 0 octet n'est **pas** posé (il écraserait peut-être une vraie preuve) : il est nommé, et le code devient 125 « preuve vide ». Le bilan donne la taille réelle, en octets, fichier par fichier. Le dépôt du PC n'est pas touché autrement : l'index temporaire du paquet est supprimé à la fin.
5. **Le ménage.** Le dossier du run (`~/bacs/.runs/<run>/`) est retiré à la fin, y compris quand la mise en place échoue (correctif du 25/09 : un refus laissait un dossier vide, un échec laissait la copie du paquet). Le fichier `<jeton>.fin` reste 24 h (il sert au PC à relire la fin si ssh se coupe), comme les anciens `<run>.code` d'avant le correctif ; tout ce qui a plus de 24 h dans `~/bacs/.runs/` est retiré au lancement suivant.

### Essais du 25/09/2026 (usine réelle, bacs de test retirés ensuite)

| Essai | Résultat | Durées |
|---|---|---|
| `executer -- node -e "process.exit(3)"` | code **3** relayé | paquet 22,8 s · envoi et bac 2,8 s · commande 0,1 s · total 25,8 s |
| `executer -- node scripts/promesses-qa.mjs` | **PASS**, sortie identique ligne à ligne à celle du PC (hors la ligne « racine ») | usine : commande 3,1 s, total 33,0 s (dont paquet 26,3 s) · PC seul : 43,3 s |
| `executer -- node scripts/maquette-qa.mjs --metier=menuisier` | **PASS** (MQ-1 à MQ-11, T1, T2), comme le dernier verdict connu (`.orchestre/preuves/025-02/verifier.log`, PASS). Rien de lourd sur le PC. | commande 12,6 s · total 59,9 s (dont paquet 43,7 s) |
| Fichier non suivi `scripts/fixtures/executer-essai/marque.txt` créé sur le PC, puis `executer -- cat …` | contenu identique, octet pour octet ; fichier retiré du PC après | total 19,7 s |
| `executer --delai=1 -- sleep 120` | code **124**, message « délai de 60 s dépassé » ; aucun `sleep` resté sur l'usine | commande 60,9 s |
| `--nom=a` et `--nom=b` en parallèle | les deux aboutissent (codes 0 et 7 relayés), 12 s de chevauchement mesuré sur l'usine | paquets 46 et 59 s (construits en même temps sur le PC) |
| Trois appels sur le bac `meme` | le second (`--attendre=0`) est refusé : « bac meme occupé (… qui …) : refusé », code 125 ; le troisième attend, puis prend le bac 4 s après la fin du premier | — |
| `--rapatrier` | seul le fichier écrit sous le chemin demandé revient (35 octets, contenu réel) ; un fichier écrit ailleurs ne revient pas ; 4 chemins interdits refusés (code 125) | rapatriement 5,8 s |

### Attaque du 25/09/2026 sur `executer` : ce qu'elle a montré, ce qui a changé

Une attaque le matin du 25/09 (journaux r1 à r8) a prouvé six défauts et un risque. État après correctifs :

| # | Défaut prouvé | Correctif | État |
|---|---|---|---|
| 1 | **Mensonge sur coupure ssh** (r5) : un juge qui coupe sa propre session ssh, puis sort 0 sur le TERM de la veille, rendait **0**. | La veille écrit sa marque avant d'arrêter ; le lanceur perl ne marque que la fin d'elle-même ; la fin (cause comprise) vient de l'usine. | Corrigé : **125** |
| 2 | **`ssh.exe` tué sur le PC** (r6) : code 1 sans message (Windows rend 1 pour un processus tué). | Le code de `ssh.exe` n'est plus lu : sans repère de fin, le PC relit la fin sur l'usine. | Corrigé : **125** + message ; un vrai 1 reste 1 |
| 3 | **Barrière anti-fuite** (r2) : passaient une URL avec identifiants, un nom de clé en JSON/YAML/minuscules, une archive `.gz`. | Troisième barrière, propre à `executer`. | Corrigé ; mots de passe d'application Google non détectés (limite) |
| 4 | **Exclus en silence** : les `EXCLUS` et les > 5 Mo ne partaient pas sans qu'on le sache. | Liste « ne part pas » à chaque appel + fichier complet. | Corrigé |
| 5 | **Preuve vide** (r8) : un fichier rapatrié de 0 octet rendait 0, « 1 Ko » au bilan. | 0 octet : non posé, 125 « preuve vide », tailles en octets. | Corrigé |
| 6 | **Fins de ligne** : PC en CRLF, bac en LF. | Documenté (Limites). | Non corrigé, voulu |
| 7 | **`node_modules` partagé par liens physiques** : un juge qui réécrit un fichier sur place touche `~/presti` et les autres bacs. | Documenté, avec deux pistes (Limites). | Non corrigé |

Essais rejoués sur l'usine réelle le 25/09/2026 entre 11 h 16 et 11 h 31 (bacs `fix-*`, retirés ensuite, comme leurs verrous et leurs fins ; PC avec au moins 1 200 Mo libres avant chaque appel) :

| Essai | Attendu | Obtenu |
|---|---|---|
| (a) `executer -- node -e "process.exit(3)"` | 3 | **3** (cause `seule`) · total 9,5 s. Le premier essai avait été refusé (125) par la nouvelle barrière : un commentaire de `usine.mjs` contenait une URL factice `postgres://…:…@hôte`. Commentaire réécrit, et `…` ajouté aux gabarits. |
| (b) `executer -- node scripts/promesses-qa.mjs` | 0, PASS | **0**, PR-1 à PR-8 PASS · commande 3,1 s, total 16,7 s |
| (c) r5 rejouée : le juge coupe sa session ssh (`kill` de son `sshd`), attrape le TERM et sort 0 | 125 | **125** : « verdict non rendu : la session ssh s'est coupée pendant la commande et la veille de l'usine l'a arrêtée ; son code (143) ne compte pas ». Trace du juge dans son bac : « TERM reçu, je sors 0 ». Rien ne tourne ensuite. |
| (d) `ssh.exe` tué (taskkill) 5 s après le montage, pendant `sleep 60` | 125, plus rien sur l'usine | **125** (ssh avait rendu 1) ; fin relue : `veille` ; aucun `sleep`, `timeout` ni lanceur, 0 processus marqué `USINE_EXECUTER_RUN` · total 26,2 s |
| (e) URL factice avec identifiants dans un fichier non suivi | 125, rien envoyé | **125** : `scripts/fixtures/fix-essai/url.txt:1 : motif URL avec identifiants`, valeur jamais affichée ; aucune connexion à l'usine : `~/bacs`, `.verrous` et `.runs` identiques avant et après, aucune trace de la valeur dans `~/bacs` |
| (e bis) JSON, YAML, minuscules, `.gz`, gzip renommé `.png` | 125 | **125**, 8 problèmes : `cfg.json:2` (deux motifs), `cfg.yml:2`, `minuscules.txt:1`, `url.txt:1`, `trace.gz` (au nom et à la signature), `image.png` (à la signature) |
| (f) `--rapatrier` d'une `capture.png` vide (et d'une trace de 20 octets) | 125 | **125** « preuve vide » ; la trace est posée (20 octets), la capture vide ne l'est pas |
| (g) `--delai=1 -- sleep 120` | 124 | **124**, « délai de 60 s dépassé », aucun `sleep` resté |
| (h) le juge se tue (`kill -KILL $$`) | 125 | **125** « tuée par le signal SIGKILL » |
| (i) `node -e "process.exit(1)"` | 1 | **1** |
| (j) `--delai=1`, le juge ignore TERM | 124 | **124** ; les 2 processus restés arrêtés par le ménage ; aucun `sleep` resté |

### Limites

- **La construction du paquet sur le PC coûtait 7 à 107 s** selon la charge du PC (8 Go saturés), surtout à cause de `git ls-files --others --exclude-standard` (23,7 s seule, PC saturé, contre 2,6 s pour `git status --porcelain`). **Corrigé le 25/09 au soir** (fonction `nonSuivis`, commune à `lancer`, `paquet` et `executer`) : les non suivis sont lus par `git --no-optional-locks status --porcelain=v1 -uall -z --no-renames`, qui profite du cache du système de fichiers de Git pour Windows (`core.fscache`, dont `ls-files` ne se sert pas). Même liste : comparée sur l'arbre réel (2 792 chemins, identiques et dans le même ordre, trois fois), et sur un dépôt d'essai (espaces, accents, dossier non suivi imbriqué, dépôt git imbriqué `imbrique/`). `--no-optional-locks` : `status` ne réécrit pas le vrai index (il prendrait `index.lock` et pourrait faire échouer le git d'une autre session). Le contenu du paquet et les barrières anti-secret ne changent pas. Mesures (`node scripts/usine.mjs paquet <id>`, bout en bout, 3 fois chacun, même arbre, PC à 1,5-1,9 Go libres) : **avant 4,3 · 3,7 · 4,7 s ; après 1,8 · 2,6 · 2,9 s** (127 fichiers, 3,7 Mo, 2 673 exclus). Commandes seules : `ls-files --others` 0,49 · 0,49 · 0,68 s, `status` 0,28 · 0,30 · 0,59 s. Le PC n'était pas saturé à ce moment-là : le gain attendu sous saturation est celui du 23,7 s → 2,6 s mesuré plus tôt, non remesuré.
- **Pas de secret sur l'usine :** un juge qui lit `.env.local`, la base de production ou Stripe ne peut pas passer par `executer`.
- **Les fichiers ignorés par git du PC ne partent pas** (captures d'une série ignorée, `.orchestre/travail/`). Un juge qui en a besoin doit les produire lui-même.
- **Les juges et Linux :** l'usine distingue les majuscules des minuscules. Un contrôle « autre casse » de Windows peut donc s'y dérouler autrement (vu avec `maquette-qa` MQ-2), sans changer le verdict.
- **Un bac vit jusqu'à ce qu'on le retire :** `executer` le recrée à chaque appel mais ne le retire jamais (27 bacs, 5,8 Go, le 25/09 à 14 h). Le ménage : `menage-bacs.sh` (section suivante), ou à la main `git -C ~/presti worktree remove --force ~/bacs/<nom>` sur l'usine. Retirer `verif` ne coûte rien : le prochain `executer` le recrée.
- **Fins de ligne : le PC est en CRLF, le bac en LF.** Sur le PC, `core.autocrlf=true` : les fichiers sortis par git sont en `\r\n`. Le paquet est un diff git, donc normalisé en `\n`, et l'usine sort ses fichiers en `\n`. Un juge qui compare des octets, compte des `\r`, ou calcule une empreinte de fichier obtient sur l'usine un autre résultat que sur le PC. Un juge doit tolérer les deux (lire en retirant `\r`). Non corrigé : c'est voulu (le bac est ce que git produirait sous Linux).
- **`node_modules` du bac est une copie en liens physiques** de `~/presti/node_modules` (`cp -al`, 659 Mo, 31 883 fichiers mesurés le 25/09) : les fichiers sont **les mêmes** sur le disque. Un juge qui réécrit un fichier de `node_modules` sur place (patch d'un paquet, `npm install` dans le bac, écriture dans un fichier existant) modifie `~/presti` et tous les autres bacs et tâches. Ajouter ou supprimer un fichier, lui, ne touche que le bac. Non corrigé. Pistes, **non appliquées** : (1) *détecter* — après la commande, `find "$B/node_modules" -type f -links +1 -newer "$R/debut"` liste les fichiers partagés réécrits pendant la commande ; l'outil pourrait les signaler en rouge et rendre 125 (quelques secondes sur 31 883 fichiers, rien ne change pour les juges honnêtes) ; (2) *isoler* — une copie pleine (`cp -a`, 659 Mo et plusieurs secondes par appel) ou un montage superposé (overlayfs, qui demande root ou un espace de noms utilisateur qu'Ubuntu 24.04 restreint par AppArmor). Mettre les fichiers en lecture seule n'est **pas** une solution : `chmod` sur un lien physique change aussi `~/presti`, et npm y écrit.
- **Mots de passe d'application Google non détectés.** Seize lettres minuscules, souvent en quatre groupes : impossible à distinguer d'un mot ou d'une phrase française par motif sans bloquer du texte ordinaire. Un tel mot de passe, collé seul dans un fichier, part. Seuls les noms sensibles (`IMAP_PASS=…`, `password: …`) sont vus, et la valeur doit avoir la forme d'une clé (chiffres et lettres) : un mot de passe en lettres seules passe aussi.
- **Ce que la barrière ne voit pas :** une archive encodée en base 64 dans un fichier texte, une clé découpée sur plusieurs lignes, une valeur factice qui a la forme d'une clé (elle bloque : l'écrire en lettres seules, comme pour `lancer`).
- **Même utilisateur Unix.** Le juge tourne sous `usine`, comme l'outil : un juge malveillant pourrait tuer la veille ou écrire de fausses marques. Les marques protègent contre les accidents (TERM attrapé et sortie 0, ssh coupé, commande tuée), pas contre un juge écrit pour tromper. Le jeton du repère de fin et du fichier de fin n'est ni exporté ni passé en argument, pour qu'un juge ne tombe pas dessus par hasard.
- **Signal dans une commande composée.** Le lanceur voit « tuée par un signal » quand c'est la commande elle-même (`bash -c` exécute directement une commande simple). Dans `a && b`, si `b` est tué, `bash` sort d'elle-même avec 128+N : le code est relayé tel quel (non nul, donc jamais un faux PASS), avec une ligne « un sous-processus a peut-être été tué par un signal ».

## Revue d'une fiche par Codex, juge indépendant (`revue-codex.mjs`)

Depuis presti : `node ../presti-ops/usine/revue-codex.mjs <id> [--sabotages=4] [--delai=90] [--a-sec]`. Codex (abonnement ChatGPT seul, sans réseau, sans conseiller : permis pour une fiche de prospects) relit la fiche dans un bac `rc-<id>` d'executer, fait ses sabotages ; le verifier est lancé par le coureur hors bac à sable et seul son relevé compte. Codes : 0 vert, 1 rouge, 3 quota, 125 pas jugé. Tout est rendu dans `.orchestre/travail/revue-codex/<id>/`. Détail : l'en-tête du script.

## Ménage des bacs (`menage-bacs.sh`)

Ajouté le 25/09/2026. `executer` recrée son bac à chaque appel et ne le retire jamais : le 25/09 à 14 h, 27 bacs occupaient 5,8 Go (hors `node_modules`, qui est en liens physiques et ne compte qu'une fois). `menage-bacs.sh`, lancé **sur l'usine**, retire les bacs :

- **non verrouillés** : il prend lui-même le verrou d'`executer` (`flock -n` sur `~/bacs/.verrous/<nom>.lock`) et le garde pendant le retrait ; un bac tenu par un `executer` en cours est laissé (« ! … verrouillé ») ; un `executer` qui arrive pendant le retrait attend, puis recrée son bac ;
- **plus vieux que N heures** (défaut 6) : l'âge est celui de la dernière prise du bac (le plus récent de la date du dossier et de `~/bacs/.verrous/<nom>.qui`, réécrit à chaque prise) ;

par `git -C ~/presti worktree remove --force`, puis `git worktree prune`. Il retire aussi les `.fin` et `.code` de `~/bacs/.runs` de plus de 24 h. Il ne touche ni `~/taches`, ni les fichiers `.lock` (supprimer un verrou qu'un `executer` attend donnerait deux détenteurs du même bac), ni rien d'autre dans `~/presti` que les inscriptions de worktree que git y tient pour ses bacs.

```
ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'bash -s' < menage-bacs.sh                          # pour de vrai, bacs de plus de 6 h
ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'bash -s -- --essai --heures=3' < menage-bacs.sh    # dit ce qu'il ferait
```

Il affiche avant et après : le disque libre (`df`), la taille apparente de `~/bacs` (`du --apparent-size`), et sa taille hors `node_modules` partagé (ce qu'un retrait peut rendre). Codes : 0 ok ; 1 un retrait a échoué ; 2 usage. Rien ne le lance tout seul : pas de minuteur posé (ce serait une configuration permanente).

### Essais du 25/09/2026

| Essai | Résultat |
|---|---|
| `--essai`, seuil 6 h (14:21 UTC) | 27 bacs, tous pris il y a moins de 6 h (le plus vieux, `vue`, 4,8 h) : 0 à retirer. |
| `--essai --heures=2` | 7 bacs seraient retirés : `vue` (515 Mo), `verif` et les cinq `base-*` (174 à 204 Mo chacun), soit 1,6 Go environ ; 0 verrouillé. |
| Bac d'essai `menage-essai` monté comme par `executer` (worktree + `node_modules` en `cp -al`), vieilli à 7 h, **verrou tenu** par un faux `executer` | « ! menage-essai : verrouillé (…), laissé », le bac reste. |
| Le même, **verrou libre** | retiré (`git worktree remove --force`, 168 Mo hors `node_modules`) ; plus inscrit comme worktree ; `~/presti/node_modules` intact (31 883 fichiers avant et après ; le fichier témoin a un lien physique de moins, celui du bac). Gain : **179,5 Mo** au `df`, 160,6 Mo de taille apparente. |
| **Passage réel, seuil 6 h** (14:39 UTC) | **0 bac retiré** : les 28 bacs avaient été pris il y a moins de 6 h (la production 025 tournait) ; 0 `.fin`/`.code` de plus de 24 h (les plus vieux datent de 07:30 le 25/09). Gain : 0 (`df` 28 164 939 776 → 28 164 653 056 octets libres, l'écart est l'activité de l'autre session ; `du --apparent-size ~/bacs` inchangé, 6 503 930 310 octets). `vue` passera les 6 h vers 15:34 UTC, `verif` et les `base-*` vers 17:20. |

**À savoir :** le gain mesuré au `df` est bruité quand une autre session crée ou retire des bacs en même temps ; la ligne par bac (« retiré, N Mo hors node_modules ») est la mesure propre.
