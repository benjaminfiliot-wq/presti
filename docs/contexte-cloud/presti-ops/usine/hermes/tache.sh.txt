#!/usr/bin/env bash
# tache.sh : confier une tâche à Hermes (usine Oracle, modèles gratuits seulement).
#
#   tache.sh <consigne.md> [dossier-de-sortie]
#
# Entrée  : un fichier texte/Markdown, la consigne.
# Sortie  : un dossier avec
#             consigne.md             la consigne reçue
#             resultats/              ce que l'agent a écrit (dont RESUME.md), si l'agent en a créé
#             reponse.txt             la réponse texte de `hermes -z`
#             usage.json              modèle réellement utilisé, jetons, coût estimé (si produit)
#             journal-conteneur.txt   le journal du conteneur pendant la tâche
#             statut.txt              OK | ECHEC-AGENT | ECHEC-RESUME-VIDE
#
# Variables (facultatives) :
#   HERMES_MODELE   "provider/modèle" imposé, ex. freellmapi/mistral-large-3 (défaut : ollama/gpt-oss:120b-cloud)
#   HERMES_DELAI    délai en secondes (défaut 900)
#   HERMES_USINE    cible ssh depuis le PC (défaut usine@88.96.53.3)
#   HERMES_CLE      clé ssh depuis le PC (défaut ~/.ssh/presti-usine)
#
# CORRIGÉ le 28/09/2026 contre le vrai CLI (voir LISEZMOI.md et config.yaml pour le détail) :
#   - `hermes -z` ne prend PAS de fichier ("--query-file" n'existe pas) : le prompt passe en
#     argument direct, dans un tableau bash (pas de sous-shell côté conteneur, donc pas
#     d'échappement à gérer pour les guillemets/retours à la ligne de la consigne).
#   - --provider/-m sont TOUJOURS passés explicitement (jamais seulement model.default du
#     config.yaml) : un modèle "provider/modèle" combiné dans la config envoie un champ "model"
#     mal formé à l'API réelle (testé, HTTP 404 des deux côtés — voir config.yaml).
#   - --usage-file prend un chemin CÔTÉ CONTENEUR (le brouillon initial visait un chemin côté PC,
#     inutilisable depuis `docker exec`) : posé sous /work/taches/$ID, rapatrié avec le reste par
#     `docker cp`.
set -uo pipefail

CONSIGNE=${1:-}
if [ -z "$CONSIGNE" ] || [ ! -s "$CONSIGNE" ]; then
  echo "usage : tache.sh <consigne.md non vide> [dossier-de-sortie]" >&2
  exit 2
fi
ID=${HERMES_ID:-$(date +%Y%m%d-%H%M%S)-$(head -c 3 /dev/urandom | od -An -tx1 | tr -d ' \n')}
DELAI=${HERMES_DELAI:-900}
MODELE=${HERMES_MODELE:-ollama/gpt-oss:120b-cloud}
PROVIDER=${MODELE%%/*}
MODELE_BRUT=${MODELE#*/}

# ---------------------------------------------------------------- côté PC
if ! docker inspect hermes >/dev/null 2>&1; then
  USINE=${HERMES_USINE:-usine@88.96.53.3}
  CLE=${HERMES_CLE:-$HOME/.ssh/presti-usine}
  SORTIE=${2:-./hermes-resultats/$ID}
  DISTANT=/tmp/hermes-consigne-$ID.md
  mkdir -p "$SORTIE"
  scp -q -i "$CLE" "$CONSIGNE" "$USINE:$DISTANT" || { echo "scp de la consigne impossible" >&2; exit 1; }
  ssh -i "$CLE" "$USINE" "HERMES_ID='$ID' HERMES_DELAI='$DELAI' HERMES_MODELE='$MODELE' /srv/hermes/bin/tache.sh '$DISTANT' \"\$HOME/hermes-resultats/$ID\"; rc=\$?; rm -f '$DISTANT'; exit \$rc"
  RC=$?
  scp -q -r -i "$CLE" "$USINE:hermes-resultats/$ID/." "$SORTIE/" || echo "rapatriement incomplet" >&2
  echo "résultats : $SORTIE"
  exit $RC
fi

# ---------------------------------------------------------------- côté usine
SORTIE=${2:-$HOME/hermes-resultats/$ID}
mkdir -p "$SORTIE"
DEBUT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DOSSIER=/work/taches/$ID

# `docker exec` sans --user tourne en root (le conteneur démarre root pour le chown/setuid
# interne de l'image — voir compose.yaml) : root peut créer des fichiers dans /work, mais
# `hermes` lui-même casse en root sur un ~/.env qu'il ne peut plus relire ensuite (testé le
# 28/09/2026 : PermissionError sur /opt/data/.env). On exécute donc TOUJOURS en uid:gid
# numériques (pas par nom : le remap usermod interne n'est pas garanti propagé à `docker exec`,
# testé aussi le 28/09/2026 — "--user hermes" résolvait encore l'uid par défaut de l'image).
UTIL=$(sed -n 's/^HE_UID=//p' /srv/hermes/.env 2>/dev/null):$(sed -n 's/^HE_GID=//p' /srv/hermes/.env 2>/dev/null)

MESSAGE=$(mktemp)
trap 'rm -f "$MESSAGE"' EXIT
{
  echo "Tâche $ID. Tu travailles pour Presti, en français, sans interlocuteur en direct."
  echo "Écris tous tes résultats dans le chemin ABSOLU /work/taches/$ID/resultats/ (jamais un autre"
  echo "chemin : l'écriture est bloquée ailleurs) et termine par un fichier"
  echo "/work/taches/$ID/resultats/RESUME.md : ce que tu as fait, ce que tu n'as pas pu faire, tes sources."
  echo "Si la consigne est ambiguë, choisis l'interprétation la plus prudente et note-la dans le résumé."
  echo "N'invente ni chiffre, ni citation, ni source : ce qui n'est pas vérifié est marqué « à vérifier »."
  echo "Ne cherche ni ne manipule aucun secret, mot de passe, jeton ou donnée personnelle."
  echo "Ne contacte personne, ne publie rien, n'achète rien, ne crée aucun compte."
  echo
  echo "----- CONSIGNE -----"
  cat "$CONSIGNE"
} > "$MESSAGE"

docker exec --user "$UTIL" hermes sh -c "mkdir -p '$DOSSIER/resultats' && cat > '$DOSSIER/consigne.md'" < "$CONSIGNE"

PROMPT=$(cat "$MESSAGE")
ARGS=(--provider "$PROVIDER" -m "$MODELE_BRUT" -z "$PROMPT" --usage-file "$DOSSIER/usage.json")

echo "tâche $ID lancée ($(date +%H:%M:%S)), délai ${DELAI} s, modèle $PROVIDER/$MODELE_BRUT…"
timeout "$DELAI" docker exec --user "$UTIL" hermes hermes "${ARGS[@]}" > "$SORTIE/reponse.txt" 2> "$SORTIE/erreurs.txt"
RC=$?

docker cp -q "hermes:$DOSSIER/." "$SORTIE/" 2>/dev/null || docker cp "hermes:$DOSSIER/." "$SORTIE/" >/dev/null
docker logs --since "$DEBUT" hermes > "$SORTIE/journal-conteneur.txt" 2>&1
[ -s "$SORTIE/erreurs.txt" ] || rm -f "$SORTIE/erreurs.txt"

if [ $RC -ne 0 ]; then
  STATUT=ECHEC-AGENT; CODE=1
elif [ ! -s "$SORTIE/resultats/RESUME.md" ] && [ ! -s "$SORTIE/reponse.txt" ]; then
  STATUT=ECHEC-RESUME-VIDE; CODE=3
else
  STATUT=OK; CODE=0
fi
echo "$STATUT" > "$SORTIE/statut.txt"
echo "statut : $STATUT ; résultats : $SORTIE"
exit $CODE
