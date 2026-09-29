---
name: usine-oracle
description: "Serveur Oracle Always Free « presti-usine » (24/09) : accès, ce qui est installé, et les 3 pièges (pas d'IP publique avec un VCN neuf, pas de ufw, bac à sable Codex bloqué par AppArmor)"
metadata:
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-26T09:26:47.766Z
---

Le 24/09/2026, Claude Code a créé l'usine des agents sur le compte Oracle de Benj. Benj a créé le compte et s'est connecté lui-même.
- **Instance :** `presti-usine`, Paris AD-1, A1.Flex 2 OCPU / 12 Go, Ubuntu 24.04 ARM.
- **Accès :** `ssh -i ~/.ssh/presti-usine usine@88.96.53.3`. L'IP est éphémère : elle change si l'instance est recréée.
- **Doc et scripts :** `Documents/presti-ops/usine/` (LISEZMOI, cloud-init.yaml, rattrapage.sh, codex/).
- **Rôle :** le travail lourd des agents. Le site reste sur Vercel.

**Why :** Benj reste en gratuit tant qu'il n'y a pas de revenus. Il m'a confié le serveur de bout en bout (« tu fais tout »).

**How to apply :**
- **IP publique :** avec un VCN neuf, l'assistant Oracle grise l'IP publique. L'instance démarre sans Internet et cloud-init rate les paquets.
  - Attacher l'IP à la main : VNIC → IP administration → Edit → Ephemeral.
  - Rejouer ensuite `rattrapage.sh`.
- **Pare-feu :** jamais de ufw sur une image Oracle. Il désinstalle iptables-persistent, qui est le vrai pare-feu (SSH seul en entrée).
- **Codex sur Ubuntu 24.04 :** le `bwrap` embarqué est refusé par AppArmor (« loopback: Failed RTM_NEWADDR »).
  - Correctif : le profil `/etc/apparmor.d/codex-bwrap` (userns pour ce binaire seul).
  - Ne PAS installer le paquet `bubblewrap` : Codex prendrait `/usr/bin/bwrap` et resterait bloqué.
  - Tester avec `codex sandbox -P :workspace -C <dir> -- …`. En 0.156, il n'y a plus de sous-commande `linux`.
- **Statut cloud-init « error » :** il peut ne signaler qu'une étape. Lire `/var/log/cloud-init-output.log` avant de conclure.
- **Dépôt :** `~/presti` cloné par une clé de déploiement GitHub en LECTURE SEULE (`~/.ssh/presti-depot`, ajoutée le 24/09 ; poussée refusée par GitHub, vérifié). L'usine ne commite jamais : résultats → PC → Claude Code vérifie et commite. Ajouter une clé de déploiement passe par la « confirmation d'identité » GitHub (code par mail) : geste de Benj.
- **Récupération pour inactivité :** Oracle reprend l'instance si, sur 7 jours, le p95 du CPU, du réseau ET de la mémoire reste sous 20 %. Il faut donc du vrai travail régulier.
- **Le PC de Benj ne tient pas la charge** : 7,7 Go, 0,8 Go libres le 24/09 à 17 h 40 avec Roblox ouvert ; l'INDEX 026 plafonne à 2 exécutants simultanés sur le poste. J'en avais lancé 4 (production 025) : arrêté aussitôt. Règle : sur le PC, au plus 1 exécutant + les fiches claude-code en série ; tout Codex lourd part sur l'usine via `scripts/usine.mjs` (pont construit le 24/09). Mesurer la mémoire libre (Win32_OperatingSystem.FreePhysicalMemory) AVANT de lancer une vague.
- **Un juge rouge sur un PC saturé n'est pas un verdict (25/09).** 025-14 a été refusée par le PC pour FS-3/FS-4 (WebKit 390×844, `locator.click` Timeout) avec 170 à 700 Mo libres. Le même juge SANS le patch échouait pareil. À 2 Go libres : PASS en 85 s, puis verdict officiel PASS. Avant de relancer Codex sur un rouge « navigateur » ou « délai » : rejouer le juge sans le patch. S'il échoue aussi, c'est le poste. On rejuge alors avec de la mémoire, ou sur l'usine par `usine.mjs executer`.
- **Chercher les processus orphelins avant d'accuser Benj.** Le 25/09, un `grep -rln claw3d SaaS presti-ops …` lancé par un de mes sous-agents tournait depuis 1 h 15 et tenait 583 Mo. Arrêté. Chercher par `Get-CimInstance Win32_Process` (ligne de commande).
- **freellmapi (24/09)** : installé par Docker (docker.io + compose, image arm64) dans ~/freellmapi, lié à 127.0.0.1:3001, rien d'exposé. Il regroupe les offres gratuites de 34 fournisseurs d'IA derrière une adresse compatible OpenAI (/v1). Il lui faut les clés gratuites des fournisseurs : les comptes sont à créer par Benj. Tableau de bord depuis le PC par tunnel : `ssh -i ~/.ssh/presti-usine -N -L 3001:127.0.0.1:3001 usine@88.96.53.3`, puis http://localhost:3001. Ne jamais y faire passer de données personnelles de prospects : les offres gratuites peuvent entraîner leurs modèles. Benj a créé le compte du tableau de bord et ajouté 3 clés de fournisseurs le 24/09 au soir ; le contrôle de santé de freellmapi (« Checking 3 keys… complete ») tourne sans erreur. Le code de première configuration s'affiche dans `docker compose logs`.
- **Claw3D (24/09)** : bureau 3D d'agents (MIT), cloné dans ~/claw3d. Studio `npm run dev` sur 127.0.0.1:3000 (il ignore PORT de .env), passerelle de démo `npm run demo-gateway` sur 127.0.0.1:18789, télémétrie Next coupée. Vu depuis le PC par `ssh -N -L 3100:127.0.0.1:3000 -L 3001:127.0.0.1:3001 usine@…`, puis http://localhost:3100. npm bloque par défaut les scripts d'installation (esbuild, sharp, unrs-resolver) : inutiles en dev. Runtime natif : OpenClaw (évaluation du 24/09, jamais avec l'abonnement Claude) ; sinon, adaptateur « custom runtime » (/health, /state, /registry) branché sur le bus ops.
- **Plusieurs juges dans un `verifier` : toujours `node scripts/juges-en-serie.mjs "juge 1" "juge 2"` (25/09).** Jamais `bash -c "a || r=1; …; exit $r"`.
  - Sur l'usine, le premier shell vide `$r` : il ne reste que `exit`, qui rend 0, soit un faux vert (trouvé en 025-23). Le PC n'était pas touché.
  - Pas de parenthèses nues dans une commande de juge : sous Linux, `sh` les lit.
- **Usine au 25/09 :**
  - `executer` lancé sur l'usine tourne sur place (PRESTI_SUR_USINE=1) ;
  - `preparer` vérifie la règle sudo autorisée ;
  - sudo restreint (le compte `ubuntu` garde le sudo complet, c'est le secours) ;
  - veille « Presti usine veille » toutes les 15 min sur le PC ;
  - `presti-ops/usine/menage-bacs.sh` pour le ménage : depuis le 27/09, une boucle nohup le lance chaque heure (`--heures=2`, pid `~/usine/menage-bacs.pid`). Sans elle, le disque de 45 Go s'est rempli (19 Go de bacs), et le moteur échouait sur « No space left on device » ;
  - le groupe docker de `usine` donne encore accès à root (à retirer).
- **Ne jamais cliquer « Upgrade »** dans la bannière Free Trial.
- **Always Free = 2 OCPU / 12 Go depuis le 15/06/2026** (c'était 4/24). Source : InfoQ, et `LISEZMOI.md` ligne 50.
  - Sur un compte Free Tier, une instance au-dessus de la limite est ARRÊTÉE jusqu'à ce qu'on la redimensionne. Elle n'est pas supprimée d'après InfoQ, mais notre LISEZMOI parle de suppression à partir du 18/08.
  - **Erreur du 26/09 :** j'ai conseillé à Benj de passer à 4/24 « gratuit », de mémoire, sans relire le LISEZMOI. Il l'a fait vers 00:50.
  - Ne JAMAIS reconseiller 4/24. Relire les limites dans la doc avant tout conseil de dimensionnement.
  - À faire : Benj vérifie le statut d'essai dans la console. Hors essai, retour à 2/12.
- **Ollama (26/09)** : v0.34.4, dans ~/ollama, sur 127.0.0.1:11434, sans root.
  - Modèles : qwen3:4b-instruct-2507 par défaut (environ 9 à 11 jetons/s à 4 OCPU) et qwen3:8b pour les cas difficiles (environ 6 jetons/s, avec `think:false`).
  - Pas de cron dans l'image : il est relancé à chaque connexion ssh, donc aussi par la veille du PC toutes les 15 min.
  - Doc : `presti-ops/usine/ollama-LISEZMOI.md`.
  - **Ollama Cloud ouvert le 26/09**, relié au compte de Benj.
    - Gratuits : gpt-oss:120b/20b-cloud, gemma4:cloud, nemotron-3-super:cloud. Kimi, DeepSeek, GLM et MiniMax sont payants.
    - Codex tourne dessus (fournisseur `ol`), en 2ᵉ choix après ChatGPT.
    - Aucune donnée de prospect vers un modèle `:cloud`.
  - **Piège :** `gardien.sh` est une boucle longue qui garde l'environnement de son lancement, par exemple l'ancien `OLLAMA_NO_CLOUD=1`. Après une modification de `demarrer.sh`, arrêter le gardien ET le serveur par leur PID, puis relancer.
  - **Piège :** ne jamais remplacer par scp un script bash en cours d'exécution, car bash lit le fichier au fil de l'eau. Arrêter le lanceur et ses enfants (`pgrep -P <pid>`), puis relancer.
- **Laya/Jev** : un modèle local de DÉCISION (choice, score, noul), pas de rédaction. Benj l'a rappelé plusieurs fois : ne pas l'oublier.
  - Rôles : qualifier les prospects, vérifier les chiffres avant publication, router, et donner un 3ᵉ avis dans les contrôles.
  - Écrit dans le registre des IA et dans la fiche 026-041.

Voir [[ecosysteme-presti]], [[codex-executant]].
- **Entraide des IA (27/09, demande de Benj)** : `~/veille/lancer-codex-tache2.sh` et `conseil.mjs`.
  - Après chaque tour de Codex refusé par le juge, une AUTRE IA relit le verdict et la fin du journal, puis propose 5 corrections, que Codex reçoit au tour suivant.
  - Sans données de prospects : Mistral Large 3, puis GPT-OSS 120B, puis Devstral 2, via freellmapi. Avec `SANS_REPLI=1` (données de prospects) : `--prive`, donc Qwen3 4B en local via Ollama.
  - **Piège trouvé au test :** une option sans valeur (`--prive`) lue par `Object.fromEntries(...split('='))` vaut `undefined`, donc « absente ». Le mode privé partait vers freellmapi : c'était une fuite. Il faut tester `('prive' in A)`, et toujours essayer le mode privé AVANT de s'en servir.
  - **Piège Ollama :** avec `OLLAMA_NUM_PARALLEL=1`, une demande abandonnée côté client continue côté serveur et bloque la file. Garder des demandes courtes en local.
- **Mistral dans freellmapi** : `mistral-large-3`, `mistral-medium-3.5`, `devstral-2`, `codestral`. Les alias « -latest » n'existent pas.

**OpenClaw installé le 28/09** (v2026.9.6, image officielle ghcr.io/openclaw/openclaw, compte système `openclaw`, /srv/openclaw/compose.yaml) : conteneur isolé (FS lecture seule, 4 Go, 1,5 cœur, port 127.0.0.1:18800 seulement), relais `openclaw-relais` par sockets Unix vers Ollama (11434) et freellmapi (3001) parce que le pare-feu refuse Docker→hôte (ne pas y toucher). Aucune clé Claude (greffon anthropic interdit), aucun secret Presti, outils limités à /work + web. Confier une tâche depuis le PC : `bash ~/Documents/presti-ops/usine/openclaw/tache.sh consigne.md ./sortie` (modèle par défaut gpt-oss:120b-cloud ; relire : sortie parfois en anglais). Doc : presti-ops/usine/openclaw/LISEZMOI.md. Disque de l'usine à 90 % le 28/09 16 h : surveiller.
**Hermes Agent installé le 28/09** (image officielle nousresearch/hermes-agent:v2026.9.24, 3,9 Go ; compte système `hermes` uid **10000 imposé**, sinon le pont échoue en silence ; `command:` et non `entrypoint:` ; caps CHOWN/FOWNER/SETUID/SETGID/DAC_OVERRIDE ; /run en tmpfs exec) : conteneurs `hermes` + `hermes-relais`, isolés comme OpenClaw, modèles gratuits seulement. Doc et tâches : presti-ops/usine/hermes/ (LISEZMOI.md, tache.sh). prompt-master (skill audité propre) installé pour Claude, Codex (~/.codex/skills) et OpenClaw (/srv/openclaw/work/skills). openclaw-relais : sonde de santé héritée désactivée. **Disque agrandi à 100 Go le 28/09 par Benj (console Oracle) : 96 Go, 58 Go libres.** Procédure après un agrandissement : sous ubuntu, `dd iflag=direct if=/dev/sda of=/dev/null count=1` puis `echo 1 > /sys/class/block/sda/device/rescan`, `growpart /dev/sda 1`, `resize2fs /dev/sda1` (sans redémarrage).
