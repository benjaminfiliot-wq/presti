#!/usr/bin/env bash
# ~/ollama/demarrer.sh : démarre Ollama (IA locale) sur l'usine, en espace utilisateur, sans root.
#
# Idempotent : si le serveur et son gardien tournent déjà, il ne fait rien.
#   ~/ollama/demarrer.sh                 lance si besoin, attend la réponse (15 s au plus), dit ce qu'il a fait
#   ~/ollama/demarrer.sh --silencieux    lance si besoin et rend la main tout de suite (~/.profile, gardien)
#   touch ~/ollama/ARRET                 bloque toute relance (arrêt voulu) ; rm ~/ollama/ARRET pour la rétablir
#
# Deux processus :
#   - « ollama serve », le serveur (nice 10, oom_score_adj 300) ;
#   - ~/ollama/gardien.sh, qui relance le serveur en quelques secondes s'il s'arrête (plantage, pkill, manque de mémoire).
#   Aucun des deux ne survit à un redémarrage de l'usine : voir ollama-LISEZMOI.md, « Persistance ».
# Codes : 0 serveur en marche (ou arrêt voulu) ; 1 serveur non lancé ou muet (le gardien est lancé quand même et réessaie).
#
# Écoute : 127.0.0.1:11434 seulement (jamais l'IP publique).
# Journal : ~/ollama/serve.log (mis de côté en serve.log.1 au-delà de 20 Mo).
# Copie de référence sur le PC : C:/Users/benja/Documents/presti-ops/usine/ollama-demarrer.sh

set -u

DOSSIER="$(dirname "$(readlink -f "$0")")"   # ~/ollama
BIN="$DOSSIER/bin/ollama"
JOURNAL="$DOSSIER/serve.log"
VERROU="$DOSSIER/.demarrer.lock"
GARDIEN="$DOSSIER/gardien.sh"
VERROU_GARDIEN="$DOSSIER/.gardien.lock"     # tenu par le gardien toute sa vie
SILENCIEUX=0
[ "${1:-}" = "--silencieux" ] && SILENCIEUX=1

horodate() { date -u '+%Y-%m-%d %H:%M:%S UTC'; }
note() { echo "$(horodate) demarrer : $*" >> "$JOURNAL"; [ "$SILENCIEUX" = 1 ] || echo "$*"; }

# Arrêt voulu : tant que ~/ollama/ARRET existe, rien n'est relancé (ni ici, ni par ~/.profile, ni par le gardien).
if [ -e "$DOSSIER/ARRET" ]; then
  [ "$SILENCIEUX" = 1 ] || echo "$DOSSIER/ARRET existe : arrêt voulu, rien lancé (supprimer ce fichier pour relancer)"
  exit 0
fi

if [ ! -x "$BIN" ]; then
  note "$BIN absent : rien à lancer"
  exit 1
fi

# Un seul demarrer à la fois (deux connexions ssh qui arrivent ensemble).
exec 9>"$VERROU"
if ! flock -n 9; then
  [ "$SILENCIEUX" = 1 ] || echo "un autre demarrer est en cours"
  exit 0
fi

# nice 10 ABSOLU, quel que soit l'appelant : le gardien tourne lui-même à nice 10, et « nice -n 10 » y donnerait 19.
cran=$((10 - $(nice)))
[ "$cran" -lt 0 ] && cran=0

# 1. Le serveur. Rend 0 s'il est lancé, 1 sinon (et le dit dans le journal).
lancer_serveur() {
  # Le port est-il pris par autre chose ? Alors on ne lance rien.
  if curl -fsS -m 3 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
    note "le port 127.0.0.1:11434 répond mais pas notre ollama serve : rien lancé, à regarder"
    return 1
  fi

  # Processus de modèle orphelins : un serveur tué net (kill -9, plantage) laisse son « llama-server » en vie,
  # rattaché à init, qui garde sa mémoire (4 à 6 Go) pour toujours ; le nouveau serveur en chargerait un second.
  # On ne vise que les llama-server de CE dossier dont le parent n'est pas un « ollama serve » vivant.
  orphelins=""
  for r in $(pgrep -u "$(id -u)" -f "^$DOSSIER/lib/ollama/llama-server( |\$)"); do
    pp=$(ps -o ppid= -p "$r" 2>/dev/null | tr -d ' ')
    [ -n "$pp" ] || continue
    parent=$(tr '\0' ' ' < "/proc/$pp/cmdline" 2>/dev/null)
    [ "$parent" = "$BIN serve " ] && continue
    kill "$r" 2>/dev/null && orphelins="$orphelins $r"
  done
  if [ -n "$orphelins" ]; then
    for _ in $(seq 1 30); do
      vivants=""; for r in $orphelins; do kill -0 "$r" 2>/dev/null && vivants="$vivants $r"; done
      [ -z "$vivants" ] && break
      sleep 0.1
    done
    for r in $vivants; do kill -9 "$r" 2>/dev/null; done
    note "processus de modèle orphelins arrêtés :$orphelins"
  fi

  # Journal trop gros : on le met de côté (une seule génération gardée).
  if [ -f "$JOURNAL" ] && [ "$(stat -c %s "$JOURNAL")" -gt 20971520 ]; then
    mv -f "$JOURNAL" "$JOURNAL.1"
  fi

  # Réglages : posés ici seulement, jamais dans ~/.bashrc ni ~/.profile.
  export OLLAMA_HOST=127.0.0.1:11434          # écoute locale, jamais 0.0.0.0 ni 88.96.53.3
  export OLLAMA_MODELS="$DOSSIER/models"      # modèles dans ~/ollama/models
  export OLLAMA_NUM_PARALLEL=1                # une requête à la fois (les autres attendent en file)
  export OLLAMA_MAX_LOADED_MODELS=1           # un seul modèle en mémoire
  export OLLAMA_KEEP_ALIVE=10m                # déchargé après 10 min sans requête
  export OLLAMA_CONTEXT_LENGTH=8192           # contexte par défaut (24 Go de RAM ; revenir à 4096 si l'usine repasse à 12 Go)
  # 26/09 : Ollama Cloud ouvert (oui de Benj). RÈGLE : aucune donnée de prospect vers un modèle :cloud, elles restent sur les modèles locaux.

  # nice 10 : Codex et freellmapi passent devant en cas de contention.
  # setsid : hors de la session ssh qui l'a lancé (une fin de session ou un timeout ne l'arrête pas).
  # 8>&- 9>&- : le serveur n'hérite d'aucun verrou (sinon il le tiendrait tant qu'il tourne).
  setsid nohup nice -n "$cran" "$BIN" serve >> "$JOURNAL" 2>&1 < /dev/null 8>&- 9>&- &

  # Retrouver le pid réel du serveur (setsid/nohup/nice font exec, mais on ne s'y fie pas).
  pid=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    pid=$(pgrep -u "$(id -u)" -xf "$BIN serve" | head -1)
    [ -n "$pid" ] && break
    sleep 0.2
  done
  if [ -z "$pid" ]; then
    note "ollama serve n'a pas démarré (voir la fin de $JOURNAL)"
    return 1
  fi

  # Sacrifié en premier par le noyau en cas de manque de mémoire, avant Codex et freellmapi.
  # Augmenter son propre score est permis sans droit particulier ; les « runner » l'héritent.
  echo 300 > "/proc/$pid/oom_score_adj" 2>/dev/null || note "oom_score_adj non posé pour le pid $pid"

  # Un serveur qui ne peut pas écouter (port pris) s'arrête dans la seconde : ne pas le dire « lancé ».
  sleep 0.5
  etat=$(ps -o stat= -p "$pid" 2>/dev/null | tr -d ' ')
  if [ -z "$etat" ] || [ "${etat#Z}" != "$etat" ]; then   # disparu, ou zombie pas encore ramassé
    note "ollama serve (pid $pid) s'est arrêté aussitôt : voir la fin de $JOURNAL"
    return 1
  fi

  note "lancé (pid $pid, nice $(ps -o ni= -p "$pid" | tr -d ' '), oom_score_adj $(cat "/proc/$pid/oom_score_adj" 2>/dev/null || echo '?'))"
  return 0
}

# Déjà en marche ? (le processus « serve » de ce compte, lancé depuis ce binaire)
code=0
lance=0
pid=$(pgrep -u "$(id -u)" -xf "$BIN serve" | head -1)
if [ -n "$pid" ]; then
  [ "$SILENCIEUX" = 1 ] || note "déjà en marche (pid $pid), rien relancé"
elif lancer_serveur; then
  lance=1
else
  code=1   # le gardien est lancé quand même : c'est lui qui réessaiera
fi

# 2. Le gardien, même si le lancement vient d'échouer.
#    Verrou libre = aucun gardien ne tourne (quand c'est le gardien qui appelle, il le tient : rien de plus).
if [ ! -x "$GARDIEN" ]; then
  note "$GARDIEN absent : pas de relance automatique si le serveur s'arrête"
elif flock -n "$VERROU_GARDIEN" true 2>/dev/null; then
  setsid nohup nice -n "$cran" "$GARDIEN" >> "$JOURNAL" 2>&1 < /dev/null 8>&- 9>&- &
  # Attendre qu'il ait pris son verrou (1 s au plus), pour dire vrai.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    flock -n "$VERROU_GARDIEN" true 2>/dev/null || break
    sleep 0.1
  done
  if flock -n "$VERROU_GARDIEN" true 2>/dev/null; then
    note "le gardien n'a pas démarré (voir la fin de $JOURNAL)"
  else
    note "gardien lancé (pid $(cat "$VERROU_GARDIEN" 2>/dev/null))"
  fi
else
  [ "$SILENCIEUX" = 1 ] || echo "gardien déjà en veille (pid $(cat "$VERROU_GARDIEN" 2>/dev/null))"
fi

[ "$SILENCIEUX" = 1 ] && exit "$code"
[ "$lance" = 0 ] && exit "$code"

# Mode normal : attendre que l'API réponde (15 s au plus).
for _ in $(seq 1 30); do
  if v=$(curl -fsS -m 2 http://127.0.0.1:11434/api/version 2>/dev/null); then
    note "répond : $v"
    exit 0
  fi
  sleep 0.5
done
note "ne répond pas après 15 s (voir la fin de $JOURNAL)"
exit 1
