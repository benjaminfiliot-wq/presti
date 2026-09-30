#!/bin/sh
# Point d'entrée du conteneur « openclaw » (sous tini).
# 1) le pont vers Ollama et freellmapi, relancé s'il tombe ;
# 2) la passerelle OpenClaw, liée à l'interface du réseau Docker isolé
#    (publiée sur l'hôte en 127.0.0.1:18800 seulement).
(
  while :; do
    node /opt/pont/pont.mjs conteneur
    echo "[pont] arrêté, relance dans 2 s" >&2
    sleep 2
  done
) &
exec node /app/openclaw.mjs gateway run --bind lan --port 18789
