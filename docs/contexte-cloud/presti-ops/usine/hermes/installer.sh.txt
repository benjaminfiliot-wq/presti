#!/usr/bin/env bash
# installer.sh : installe ou met à jour Hermes Agent dans /srv/hermes (usine Oracle).
# À lancer en root sur l'usine, depuis le dossier qui contient les fichiers :
#   sudo bash installer.sh            (garde la config existante)
#   sudo bash installer.sh --config   (remplace la config, ancienne copie en .avant-<date>)
#
# Calqué sur /srv/openclaw/installer.sh (en production). Corrigé le 28/09/2026 contre le vrai
# CLI — voir LISEZMOI.md et compose.yaml pour le détail des essais réels. La garde de config
# utilise maintenant `hermes config check` (la seule sous-commande réelle ; "config validate"
# n'existe pas, contrairement à ce que visait le premier brouillon).
#
# Ne touche NI ufw, NI iptables, NI sshd, NI les comptes usine/agents/openclaw, NI /srv/presti-agents.
# Lit seulement la clé freellmapi du compte usine pour en poser une copie privée (600) au compte
# système « hermes », sous forme d'un fichier env_file (FREELLMAPI_KEY=…), jamais affichée.
set -euo pipefail
cd "$(dirname "$0")"

RACINE=/srv/hermes
CLE_SOURCE=/home/usine/.config/presti/freellmapi.key
IMAGE=nousresearch/hermes-agent:v2026.9.24

# L'image pèse ~3,6-3,9 Go réels une fois extraite (951 Mo transférés — mesuré le 28/09/2026).
# On vise une marge confortable après coup, pas seulement de quoi loger l'image.
LIBRE_KO=$(df -Pk / | awk 'NR==2{print $4}')
if [ "$LIBRE_KO" -lt 6291456 ]; then
  echo "ARRÊT : moins de 6 Go libres sur / ($((LIBRE_KO/1024)) Mo). Rien n'est installé." >&2
  exit 1
fi

# uid/gid FORCÉS à 10000 (pas laissés au hasard de useradd) : testé le 28/09/2026, le mécanisme
# documenté par l'image ("le stage2 hook remape l'utilisateur interne hermes vers HERMES_UID/GID
# via usermod/groupmod") ne modifie PAS réellement /etc/passwd à l'intérieur du conteneur — seul
# le chown des fichiers suit la variable. Le binaire continue en interne de faire
# `s6-setuidgid hermes` (par NOM), qui résout vers l'uid par défaut GRAVÉ dans l'image : 10000.
# Un HE_UID différent de 10000 casse silencieusement le pont (les sockets Unix appartiennent à
# HE_UID, mais le process qui les ouvre tourne réellement en 10000 → EACCES avalé sans log,
# "Connection error" côté hermes -z après 3 essais). Vérifié libre sur l'usine le 28/09/2026
# (aucun compte n'utilisait déjà 10000).
if ! id hermes >/dev/null 2>&1; then
  getent group hermes >/dev/null || groupadd --gid 10000 hermes
  useradd --system --uid 10000 --gid 10000 --no-create-home --home-dir "$RACINE" --shell /usr/sbin/nologin hermes
fi
HE_UID=$(id -u hermes); HE_GID=$(id -g hermes)
if [ "$HE_UID" != "10000" ] || [ "$HE_GID" != "10000" ]; then
  echo "ARRÊT : le compte « hermes » existant a l'uid:gid $HE_UID:$HE_GID, pas 10000:10000 — voir le" >&2
  echo "commentaire ci-dessus (le pont resterait cassé). Corriger le compte avant de réinstaller." >&2
  exit 1
fi

install -d -o root -g root -m 755 "$RACINE" "$RACINE/pont" "$RACINE/bin"
install -d -o hermes -g hermes -m 700 "$RACINE/etat" "$RACINE/work" "$RACINE/relais"

install -o root -g root -m 644 compose.yaml "$RACINE/compose.yaml"
install -o root -g root -m 644 pont.mjs lancer.sh sante.mjs "$RACINE/pont/"
install -o root -g root -m 755 tache.sh "$RACINE/bin/tache.sh"
printf 'HE_UID=%s\nHE_GID=%s\n' "$HE_UID" "$HE_GID" > "$RACINE/.env"
chmod 644 "$RACINE/.env"

# Secret freellmapi : posé en env_file (FREELLMAPI_KEY=…) pour le conteneur, jamais dans ce dépôt
# ni affiché. Différent d'OpenClaw (qui lit un fichier via son propre mécanisme "secrets:") parce
# que le "providers.freellmapi.key_env" de Hermes attend une variable d'environnement.
if [ -s "$CLE_SOURCE" ]; then
  ( umask 077; printf 'FREELLMAPI_KEY=%s\n' "$(cat "$CLE_SOURCE")" > "$RACINE/etat/secrets.env" )
  chown hermes:hermes "$RACINE/etat/secrets.env"; chmod 600 "$RACINE/etat/secrets.env"
else
  echo "ATTENTION : $CLE_SOURCE absente, freellmapi ne répondra pas." >&2
  ( umask 077; : > "$RACINE/etat/secrets.env" )
  chown hermes:hermes "$RACINE/etat/secrets.env"; chmod 600 "$RACINE/etat/secrets.env"
fi

CONF="$RACINE/etat/config.yaml"
if [ ! -s "$CONF" ] || [ "${1:-}" = "--config" ]; then
  [ -s "$CONF" ] && cp -p "$CONF" "$CONF.avant-$(date +%Y%m%d-%H%M%S)"
  install -o hermes -g hermes -m 600 config.yaml "$CONF"
fi

# Garde : une config invalide échouerait bruyamment à la première tâche. On la valide d'abord
# dans un conteneur jetable, sans réseau, avec `hermes config check` (sous-commande réelle,
# confirmée par `hermes config --help` le 28/09/2026 — pas de "config validate"). On monte le
# vrai $RACINE/etat (déjà en place, en écriture) : le run par défaut de l'image (root -> chown
# -> setuid vers HERMES_UID/HERMES_GID) est nécessaire pour que "config check" s'exécute avec les
# bons droits sur ce dossier, comme le service réel — un conteneur jetable "--user" direct
# échouerait (voir compose.yaml : l'image refuse un uid Docker arbitraire).
if ! docker run --rm --network none \
     -v "$RACINE/etat:/opt/data" \
     -e HERMES_UID="$HE_UID" -e HERMES_GID="$HE_GID" \
     -e HERMES_HOME=/opt/data -e HERMES_WRITE_SAFE_ROOT=/work \
     "$IMAGE" hermes config check \
   >/tmp/hermes-config-check.log 2>&1; then
  echo "ARRÊT : config.yaml invalide ou incomplet (voir /tmp/hermes-config-check.log). Rien n'est installé/relancé." >&2
  exit 1
fi

install -d -o hermes -g hermes -m 755 "$RACINE/work/taches"

docker compose -f "$RACINE/compose.yaml" --project-directory "$RACINE" up -d
echo "OK : Hermes installé dans $RACINE (uid $HE_UID)."
