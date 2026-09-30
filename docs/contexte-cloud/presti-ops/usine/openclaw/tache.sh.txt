#!/usr/bin/env bash
# tache.sh : confier une tâche à OpenClaw (usine Oracle, modèles gratuits seulement).
#
#   tache.sh <consigne.md> [dossier-de-sortie]
#
# Entrée  : un fichier texte/Markdown, la consigne.
# Sortie  : un dossier avec
#             consigne.md             la consigne reçue
#             resultats/              ce que l'agent a écrit (dont RESUME.md)
#             reponse.json            l'enveloppe JSON de « openclaw agent » (texte final, modèle, usage)
#             journal-conteneur.txt   le journal du conteneur pendant la tâche
#             statut.txt              OK | ECHEC-AGENT | ECHEC-RESUME-VIDE
# Variables (facultatives) :
#   OPENCLAW_MODELE  modèle imposé, ex. freellmapi/gpt-oss-120b (défaut : celui de la config)
#   OPENCLAW_DELAI   délai en secondes (défaut 900)
#   OPENCLAW_USINE   cible ssh depuis le PC (défaut usine@88.96.53.3)
#   OPENCLAW_CLE     clé ssh depuis le PC (défaut ~/.ssh/presti-usine)
#
# Marche des deux côtés :
#   - sur l'usine (conteneur « openclaw » présent) : lance la tâche directement ;
#   - sur le PC : envoie la consigne par scp, lance sur l'usine, rapatrie le dossier.
# Codes de sortie : 0 OK ; 1 échec de l'agent ; 2 usage ; 3 aucun RESUME.md non vide.
set -uo pipefail

CONSIGNE=${1:-}
if [ -z "$CONSIGNE" ] || [ ! -s "$CONSIGNE" ]; then
  echo "usage : tache.sh <consigne.md non vide> [dossier-de-sortie]" >&2
  exit 2
fi
ID=${OPENCLAW_ID:-$(date +%Y%m%d-%H%M%S)-$(head -c 3 /dev/urandom | od -An -tx1 | tr -d ' \n')}
DELAI=${OPENCLAW_DELAI:-900}
MODELE=${OPENCLAW_MODELE:-}

# ---------------------------------------------------------------- côté PC
if ! docker inspect openclaw >/dev/null 2>&1; then
  USINE=${OPENCLAW_USINE:-usine@88.96.53.3}
  CLE=${OPENCLAW_CLE:-$HOME/.ssh/presti-usine}
  SORTIE=${2:-./openclaw-resultats/$ID}
  DISTANT=/tmp/openclaw-consigne-$ID.md
  mkdir -p "$SORTIE"
  scp -q -i "$CLE" "$CONSIGNE" "$USINE:$DISTANT" || { echo "scp de la consigne impossible" >&2; exit 1; }
  ssh -i "$CLE" "$USINE" "OPENCLAW_ID='$ID' OPENCLAW_DELAI='$DELAI' OPENCLAW_MODELE='$MODELE' /srv/openclaw/bin/tache.sh '$DISTANT' \"\$HOME/openclaw-resultats/$ID\"; rc=\$?; rm -f '$DISTANT'; exit \$rc"
  RC=$?
  scp -q -r -i "$CLE" "$USINE:openclaw-resultats/$ID/." "$SORTIE/" || echo "rapatriement incomplet" >&2
  echo "résultats : $SORTIE"
  exit $RC
fi

# ---------------------------------------------------------------- côté usine
SORTIE=${2:-$HOME/openclaw-resultats/$ID}
mkdir -p "$SORTIE"
DEBUT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DOSSIER=/work/taches/$ID

MESSAGE=$(mktemp)
trap 'rm -f "$MESSAGE"' EXIT
{
  echo "Tâche $ID."
  echo "Ton dossier : taches/$ID/ (la consigne y est copiée dans consigne.md)."
  echo "Écris tous tes résultats dans taches/$ID/resultats/ et termine par taches/$ID/resultats/RESUME.md."
  echo "Personne ne répondra à tes questions : décide seul, prudemment, et note tes choix dans le résumé."
  echo
  echo "----- CONSIGNE -----"
  cat "$CONSIGNE"
} > "$MESSAGE"

docker exec -i openclaw sh -c "mkdir -p '$DOSSIER/resultats' && cat > '$DOSSIER/consigne.md'" < "$CONSIGNE"
docker exec -i openclaw sh -c "cat > '$DOSSIER/message.md'" < "$MESSAGE"

ARGS=(agent --agent main --session-key "agent:main:tache-$ID" --message-file "$DOSSIER/message.md" --json --timeout "$DELAI")
[ -n "$MODELE" ] && ARGS+=(--model "$MODELE")

echo "tâche $ID lancée ($(date +%H:%M:%S)), délai ${DELAI} s…"
docker exec openclaw node /app/openclaw.mjs "${ARGS[@]}" > "$SORTIE/reponse.json" 2> "$SORTIE/erreurs.txt"
RC=$?

docker cp -q "openclaw:$DOSSIER/." "$SORTIE/" 2>/dev/null || docker cp "openclaw:$DOSSIER/." "$SORTIE/" >/dev/null
docker logs --since "$DEBUT" openclaw > "$SORTIE/journal-conteneur.txt" 2>&1
[ -s "$SORTIE/erreurs.txt" ] || rm -f "$SORTIE/erreurs.txt"

if [ $RC -ne 0 ]; then
  STATUT=ECHEC-AGENT; CODE=1
elif [ ! -s "$SORTIE/resultats/RESUME.md" ]; then
  STATUT=ECHEC-RESUME-VIDE; CODE=3
else
  STATUT=OK; CODE=0
fi
echo "$STATUT" > "$SORTIE/statut.txt"
echo "statut : $STATUT ; résultats : $SORTIE"
exit $CODE
