#!/usr/bin/env bash
# ~/ollama/gardien.sh : relance « ollama serve » s'il s'arrête (plantage, pkill, manque de mémoire), sans root.
#
# Lancé par demarrer.sh seulement (setsid nohup, nice 10), jamais à la main.
#   - toutes les 5 s, il regarde si le serveur tourne ; sinon il appelle demarrer.sh --silencieux ;
#   - il s'arrête de lui-même dès que ~/ollama/ARRET existe (arrêt voulu) ;
#   - un seul gardien à la fois : il tient ~/ollama/.gardien.lock toute sa vie (demarrer.sh s'y fie) ;
#   - un serveur qui avait tenu 30 s est relancé tout de suite (en 5 s au plus) ; un serveur qui retombe moins de 30 s
#     après sa relance (port pris, fichier abîmé…) l'est de plus en plus lentement : 10 s, 20 s, 40 s… 5 min au plus.
# Il ne survit pas à un redémarrage de l'usine (ni cron ni lingering sans root) : voir ollama-LISEZMOI.md, « Persistance ».
# Copie de référence sur le PC : C:/Users/benja/Documents/presti-ops/usine/ollama-gardien.sh

set -u

DOSSIER="$(dirname "$(readlink -f "$0")")"   # ~/ollama
BIN="$DOSSIER/bin/ollama"
JOURNAL="$DOSSIER/serve.log"
VERROU_GARDIEN="$DOSSIER/.gardien.lock"

note() { echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') gardien : $*" >> "$JOURNAL"; }

# Un seul gardien. Ouvert en ajout : un second gardien qui échoue ne vide pas le fichier du premier.
exec 8>>"$VERROU_GARDIEN"
flock -n 8 || exit 0
echo $$ > "$VERROU_GARDIEN"

trap 'note "arrêté par un signal (pid $$) : plus de relance automatique jusqu au prochain demarrer.sh"; exit 0' TERM INT

note "en veille (pid $$), vérifie toutes les 5 s"

serie=0        # pannes de suite survenues moins de 30 s après une relance (serveur qui retombe aussitôt)
derniere=0     # heure de la dernière relance
prochaine=-1   # -1 : pas de panne en cours ; sinon, pas de relance avant cette heure
while :; do
  if [ -e "$DOSSIER/ARRET" ]; then
    note "$DOSSIER/ARRET existe : arrêt voulu, le gardien s'arrête (pid $$)"
    exit 0
  fi
  if pgrep -u "$(id -u)" -xf "$BIN serve" >/dev/null; then
    prochaine=-1
  else
    maintenant=$(date +%s)
    if [ "$prochaine" -lt 0 ]; then
      # Panne constatée. Un serveur qui a tenu 30 s est relancé tout de suite ;
      # un serveur qui retombe aussitôt (port pris, fichier abîmé…) l'est de plus en plus lentement.
      if [ $((maintenant - derniere)) -lt 30 ]; then serie=$((serie + 1)); else serie=0; fi
      [ "$serie" -gt 6 ] && serie=6
      attente=0
      if [ "$serie" -gt 0 ]; then
        attente=$((10 << (serie - 1)))
        [ "$attente" -gt 300 ] && attente=300
      fi
      prochaine=$((derniere + attente))
      [ "$prochaine" -gt "$maintenant" ] && note "le serveur retombe moins de 30 s après sa relance ($serie fois de suite) : prochaine tentative dans $((prochaine - maintenant)) s"
    fi
    if [ "$maintenant" -ge "$prochaine" ]; then
      derniere=$maintenant
      prochaine=-1
      note "serveur absent : relance"
      # 8>&- : ni demarrer.sh ni le serveur n'héritent du verrou du gardien.
      "$DOSSIER/demarrer.sh" --silencieux 8>&- || note "demarrer.sh a échoué (code $?)"
    fi
  fi
  sleep 5
done
