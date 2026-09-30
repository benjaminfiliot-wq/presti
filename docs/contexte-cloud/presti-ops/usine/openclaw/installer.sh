#!/usr/bin/env bash
# installer.sh : installe ou met à jour OpenClaw dans /srv/openclaw (usine Oracle).
# À lancer en root sur l'usine, depuis le dossier qui contient les fichiers :
#   sudo bash installer.sh            (garde la config existante)
#   sudo bash installer.sh --config   (remplace la config, ancienne copie en .avant-<date>)
#
# Ne touche NI ufw, NI iptables, NI sshd, NI les comptes usine/agents, NI /srv/presti-agents.
# Lit seulement la clé freellmapi du compte usine pour en poser une copie privée (600)
# au compte système « openclaw ». Aucune valeur n'est affichée.
set -euo pipefail
cd "$(dirname "$0")"

RACINE=/srv/openclaw
CLE_SOURCE=/home/usine/.config/presti/freellmapi.key

if ! id openclaw >/dev/null 2>&1; then
  useradd --system --user-group --no-create-home --home-dir "$RACINE" --shell /usr/sbin/nologin openclaw
fi
OC_UID=$(id -u openclaw); OC_GID=$(id -g openclaw)

install -d -o root -g root -m 755 "$RACINE" "$RACINE/pont" "$RACINE/bin"
install -d -o openclaw -g openclaw -m 700 "$RACINE/etat" "$RACINE/work" "$RACINE/relais" "$RACINE/secrets"

install -o root -g root -m 644 compose.yaml "$RACINE/compose.yaml"
install -o root -g root -m 644 pont.mjs lancer.sh sante.mjs "$RACINE/pont/"
install -o root -g root -m 755 tache.sh "$RACINE/bin/tache.sh"
printf 'OC_UID=%s\nOC_GID=%s\n' "$OC_UID" "$OC_GID" > "$RACINE/.env"
chmod 644 "$RACINE/.env"

# Jeton de la passerelle : créé une fois, jamais affiché.
if [ ! -s "$RACINE/secrets/gateway.token" ]; then
  ( umask 077; head -c 32 /dev/urandom | base64 | tr -d '/+=\n' > "$RACINE/secrets/gateway.token" )
fi
chown openclaw:openclaw "$RACINE/secrets/gateway.token"; chmod 600 "$RACINE/secrets/gateway.token"

# Clé freellmapi : copie privée (un seul lien, 600, propriétaire openclaw), rafraîchie à chaque passage.
if [ -s "$CLE_SOURCE" ]; then
  install -o openclaw -g openclaw -m 600 "$CLE_SOURCE" "$RACINE/secrets/freellmapi.key"
else
  echo "ATTENTION : $CLE_SOURCE absente, freellmapi ne répondra pas." >&2
fi

CONF="$RACINE/etat/openclaw.json"
# Garde : une config invalide met la passerelle en boucle de redémarrage. On la valide d'abord
# dans un conteneur jetable, sans réseau.
IMAGE=$(sed -n 's/^ *image: *//p' "$RACINE/compose.yaml" | head -1)
if ! docker run --rm --network none -v "$PWD/openclaw.json:/cfg/openclaw.json:ro" \
     -e OPENCLAW_CONFIG_PATH=/cfg/openclaw.json -e OPENCLAW_STATE_DIR=/tmp/etat \
     --entrypoint node "$IMAGE" /app/openclaw.mjs config validate; then
  echo "ARRÊT : openclaw.json invalide, rien n'est installé." >&2
  exit 1
fi
if [ ! -s "$CONF" ]; then
  install -o openclaw -g openclaw -m 600 openclaw.json "$CONF"
elif [ "${1:-}" = "--config" ]; then
  cp -p "$CONF" "$CONF.avant-$(date +%Y%m%d-%H%M%S)"
  install -o openclaw -g openclaw -m 600 openclaw.json "$CONF"
fi

if [ ! -s "$RACINE/work/AGENTS.md" ]; then
  install -o openclaw -g openclaw -m 644 AGENTS.md "$RACINE/work/AGENTS.md"
fi
install -d -o openclaw -g openclaw -m 755 "$RACINE/work/taches"

docker compose -f "$RACINE/compose.yaml" --project-directory "$RACINE" up -d
echo "OK : OpenClaw installé dans $RACINE (uid $OC_UID)."
