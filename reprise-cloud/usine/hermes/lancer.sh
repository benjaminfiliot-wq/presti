#!/bin/sh
# Point d'entrée réel du conteneur « hermes » — passé en `command:` (compose.yaml), PAS en
# ENTRYPOINT. L'ENTRYPOINT reste celui de l'image (/init, s6-overlay) : c'est lui qui chowne
# /opt/data vers HERMES_UID/HERMES_GID puis exécute ce script déjà en non-root (confirmé le
# 28/09/2026 ; /init fait aussi office de reaper PID 1, donc plus besoin de tini ici).
#
# On ne lance JAMAIS « hermes gateway run » : c'est le gateway qui ouvrirait les canaux de
# messagerie (Telegram/Discord/Slack/WhatsApp/Signal), un serveur API et un dashboard. Le service
# s6 "dashboard" de l'image démarre bien son slot de supervision, mais reste un échec permanent
# tant que HERMES_DASHBOARD n'est pas positionné (jamais posé ici) : aucun serveur n'écoute.
#
# Le conteneur reste vivant avec seulement le pont vers Ollama/freellmapi ; les tâches sont
# confiées par `docker exec hermes hermes --provider … -m … -z "…"` (voir bin/tache.sh), un
# process qui se termine après chaque tâche — donc rien de persistant entre deux tâches.
while :; do
  node /opt/pont/pont.mjs conteneur
  echo "[pont] arrêté, relance dans 2 s" >&2
  sleep 2
done
