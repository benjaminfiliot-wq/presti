# Hermes Agent sur l'usine — INSTALLÉ ET VÉRIFIÉ le 28/09/2026

**État réel : ça tourne, et une vraie tâche a abouti par les deux routes (Ollama et freellmapi),
via l'architecture isolée complète (pas un raccourci de test).** Compte système `hermes` créé
(uid **10000**, voir plus bas pourquoi ce nombre précis est obligatoire), `/srv/hermes/` peuplé,
conteneurs `hermes` (sain) et `hermes-relais` en service.

## Comment confier une tâche

```bash
bash presti-ops/usine/hermes/tache.sh consigne.md ./sortie
# ou, pour forcer un modèle :
HERMES_MODELE=freellmapi/mistral-large-3 bash tache.sh consigne.md ./sortie
```
Par défaut : `ollama/gpt-oss:120b-cloud`. Sortie : `reponse.txt` (texte), `usage.json` (modèle
réel, jetons, coût — toujours 0 $, modèles gratuits), `resultats/RESUME.md` si l'agent en écrit
un, `statut.txt` (OK / ECHEC-AGENT / ECHEC-RESUME-VIDE).

## Ce qui a été vérifié en conditions réelles (pas juste lu dans la doc)

Tout le premier brouillon (versions antérieures de ce dossier) venait uniquement de la
documentation publique du dépôt `NousResearch/hermes-agent`, jamais confronté au vrai binaire.
Cette version-ci corrige **quatre écarts réels**, trouvés en faisant tourner l'image
`nousresearch/hermes-agent:v2026.9.24` (arm64, digest
`sha256:93b4e2877a2f48f4474b6dd2b99386ae32c4c552d32639df1a869b3f13c50b5a`) pour de vrai :

1. **L'ENTRYPOINT de l'image ne se court-circuite pas.** Le premier brouillon voulait un `tini`
   perso à la place de l'ENTRYPOINT par défaut (`/init`, s6-overlay), pour ne jamais risquer de
   lancer `gateway run`. Testé : ça casse l'initialisation de `HERMES_HOME` (`hermes config set`
   échouait sur `/opt/data/cron`, « Permission denied »). Le fichier officiel
   `/opt/hermes/docker-compose.yml` embarqué dans l'image le dit d'ailleurs explicitement :
   bypasser `/init` casse le bootstrap. **Le bon levier n'est pas l'ENTRYPOINT, c'est le
   `command:`** — `/init` reste celui de l'image, et notre script (`lancer.sh`, qui ne lance
   jamais `gateway run`) est passé en `command:`. `/init` fait aussi le travail de tini (reaper
   PID 1), donc plus besoin de tini pour le service principal.
2. **Le conteneur doit démarrer root.** C'est `/init` qui chowne `/opt/data` vers l'uid interne
   « hermes » puis fait le `setuid` vers ce compte — contrairement à OpenClaw, l'image Hermes
   **refuse** un `docker run --user <uid arbitraire>` (message dédié dans `main-wrapper.sh`).
   `cap_drop: [ALL]` sans rien d'autre casse ce chown/setuid (« Operation not permitted »). Le
   minimum testé qui laisse ça marcher : `cap_add: [CHOWN, FOWNER, SETUID, SETGID, DAC_OVERRIDE]`.
3. **`read_only: true` exige un `/run` en tmpfs avec l'option `exec`.** Le tmpfs par défaut de
   Docker est `noexec` ; sans `exec`, s6 échoue sur `/run/s6/basedir/bin/init: Permission denied`.
4. **PIÈGE LE PLUS COÛTEUX EN TEMPS : l'uid interne « hermes » reste bloqué à 10000, quoi que
   valent `HERMES_UID`/`HERMES_GID`.** La doc officielle affirme que le stage2 hook « remape
   l'utilisateur interne hermes vers ces valeurs via usermod/groupmod ». Testé et FAUX pour cette
   version de l'image : le **chown des fichiers** suit bien la variable, mais `/etc/passwd` à
   l'intérieur du conteneur garde `hermes:x:10000:10000`. Le binaire fait ensuite en interne
   `s6-setuidgid hermes` (par NOM), qui retombe donc sur 10000 — jamais sur la valeur qu'on a
   passée. Premier essai avec un compte système `hermes` classique (uid 994, attribué par
   `useradd`) : le pont tournait bien, mais en **uid 10000** alors que les sockets Unix
   partagés (`/relais/*.sock`) appartenaient à **994** → `EACCES` à chaque connexion, **avalé sans
   aucun log** par `pont.mjs` (son gestionnaire d'erreur détruit juste la connexion). Symptôme
   vu côté `hermes -z` : « Connection error » après 3 essais, aucune trace côté conteneur.
   Diagnostiqué avec `docker top hermes -o pid,user,args` (montrait uid 10000 sur le process du
   pont) et `docker exec --user root hermes grep hermes /etc/passwd`.
   **Correctif : le compte système est créé avec `--uid 10000 --gid 10000` imposés** (libres sur
   l'usine, vérifié), pas laissés au hasard de `useradd`. `installer.sh` refuse maintenant de
   continuer si un compte `hermes` préexistant n'a pas exactement ces id.

Une fois ces quatre points corrigés, une vraie tâche a abouti par les DEUX relais (Ollama ET
freellmapi), avec un `usage.json` réel (12 199 jetons côté Ollama, coût 0 $, modèle
`gpt-oss:120b-cloud`, provider `custom`, `completed: true`).

## Un bug de CLI contourné (pas corrigé, contourné — voir config.yaml)

`model.default: "ollama/gpt-oss:120b-cloud"` dans `config.yaml` envoie un champ `model` MAL FORMÉ
à l'API réelle (préfixe `ollama/` conservé à tort, `:120b-cloud` parfois tronqué → HTTP 404 des
deux côtés, testé). **`bin/tache.sh` ne s'appuie jamais là-dessus** : il passe toujours
`hermes --provider <nom> -m <modèle-sans-préfixe> -z "…"` en ligne de commande, qui, lui, marche
(vérifié). Le `config.yaml` garde un `model.default`/`model.provider` raisonnable pour
`hermes chat` en interactif seulement.

## Le service « dashboard » : pas un problème

`docker logs hermes` montre `service dashboard successfully started` à chaque démarrage — ce
n'est PAS un serveur qui tourne. Lu le script réel (`/etc/s6-overlay/s6-rc.d/dashboard/run` et
`finish`) : tant que `HERMES_DASHBOARD` n'est pas positionné (jamais fait ici), le script sort
immédiatement et s6 marque le slot en échec permanent. Rien n'écoute. Conforme à la consigne
« rien qui tourne seul ».

## Conditions tenues

Aucun abonnement ni clé Claude/Anthropic, modèles gratuits seulement (Ollama local + Ollama
Cloud via le relais, freellmapi via le relais), aucun secret de Presti, aucun port ouvert (pas de
`ports:` — sans `gateway run`, rien à publier), aucun compte créé côté Nous Research (ni Portal
ni Docker Hub — pull anonyme). Isolement : réseau Docker dédié `hermes_isole`, `hermes-relais`
sur le réseau hôte relié par sockets Unix dans `/srv/hermes/relais/` (même mécanisme
qu'OpenClaw, instance séparée, aucun socket partagé entre les deux agents).

## Ce qui reste seulement documenté (jamais vérifié)

- La purge/rotation de `~/.hermes/checkpoints` et de `worktree`/`cron` dans le temps (à surveiller
  si `/srv/hermes/etat` grossit).
- Le comportement exact de `hermes fallback add` (bascule automatique Ollama ↔ freellmapi en cas
  d'échec) — pas testé, `tache.sh` ne l'utilise pas.

## Commandes utiles

```bash
ssh -i ~/.ssh/presti-usine usine@88.96.53.3     # compte usine (groupe docker)
docker ps -a --format "table {{.Names}}\t{{.Status}}"
docker logs --tail 30 hermes
docker exec --user 10000:10000 hermes hermes doctor   # diagnostic complet
```
