#!/usr/bin/env bash
# ~/ollama/tirer.sh : télécharge un modèle du registre Ollama SEULEMENT si les plafonds de l'usine tiennent.
#
#   ~/ollama/tirer.sh <modèle:étiquette>            vérifie, puis « ollama pull » si tout passe
#   ~/ollama/tirer.sh --essai <modèle:étiquette>    vérifie et dit ce qu'il ferait, sans rien télécharger
#
# Plafonds (consigne du 26/09/2026) :
#   - 2 modèles au plus : un 3e impose d'abord « ~/ollama/bin/ollama rm <tag> » (ce script ne supprime jamais rien) ;
#   - 10 Go de modèles au plus (10^9 octets, du -sb ~/ollama/models) ;
#   - 8 Gio de disque libre au moins APRÈS le téléchargement (1 Gio = 1024^3 octets : l'unité de « df -h ~ ») ;
#   - registre Ollama seulement (pas de hf.co ni d'autre hôte), jamais de modèle « cloud ».
# La taille vient du manifeste du registre ; seules les couches absentes de ~/ollama/models/blobs comptent.
# Codes : 0 fait (avec --essai : passerait) ; 2 usage ; 3 refusé par un plafond ; 4 registre ou serveur injoignable ;
#         autre : le code de « ollama pull ».
# Copie de référence sur le PC : C:/Users/benja/Documents/presti-ops/usine/ollama-tirer.sh

set -u

DOSSIER="$(dirname "$(readlink -f "$0")")"   # ~/ollama
BIN="$DOSSIER/bin/ollama"
MODELES="$DOSSIER/models"
MAX_MODELES=2
MAX_TOTAL=10000000000                        # 10 Go de modèles
PLANCHER=$((8 * 1024 * 1024 * 1024))         # 8 Gio libres après téléchargement

ESSAI=0
if [ "${1:-}" = "--essai" ]; then ESSAI=1; shift; fi
if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage : tirer.sh [--essai] <modèle:étiquette>" >&2
  exit 2
fi
ref="$1"

go()  { awk -v o="$1" 'BEGIN { printf "%.2f Go", o / 1e9 }'; }
gio() { awk -v o="$1" 'BEGIN { printf "%.2f Gio", o / 1073741824 }'; }

nom="${ref%%:*}"
etiq=latest
case "$ref" in *:*) etiq="${ref#*:}" ;; esac
case "$nom" in
  *.*/*) echo "✗ $ref : seul le registre Ollama est autorisé (pas d'autre hôte)"; echo "REFUSÉ : rien téléchargé"; exit 3 ;;
esac
case "$ref" in
  *cloud*) echo "✗ $ref : modèle « cloud », interdit (rien ne sort de l'usine)"; echo "REFUSÉ : rien téléchargé"; exit 3 ;;
esac
if ! [[ "$nom" =~ ^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)?$ && "$etiq" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "✗ nom de modèle illisible : $ref" >&2
  exit 2
fi
case "$nom" in */*) chemin="$nom" ;; *) chemin="library/$nom" ;; esac

# État local
deja=0
[ -f "$MODELES/manifests/registry.ollama.ai/$chemin/$etiq" ] && deja=1
nb=$(find "$MODELES/manifests" -type f 2>/dev/null | wc -l)
total=$(du -sb "$MODELES" | cut -f1)
libre=$(df -B1 --output=avail "$MODELES" | tail -1 | tr -d ' ')

# Taille annoncée par le registre (manifeste seulement, quelques Ko)
if ! manifeste=$(curl -fsS -m 30 -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
    "https://registry.ollama.ai/v2/$chemin/manifests/$etiq" 2>&1); then
  echo "✗ manifeste introuvable pour $ref sur registry.ollama.ai : $manifeste"
  exit 4
fi
couches=$(printf '%s' "$manifeste" | jq -r '(.config, .layers[]) | "\(.digest) \(.size)"' 2>/dev/null) || couches=""
if [ -z "$couches" ]; then
  echo "✗ manifeste illisible pour $ref"
  exit 4
fi
taille=0; besoin=0
while read -r digest size; do
  if ! [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ && "$size" =~ ^[0-9]+$ ]]; then
    echo "✗ couche illisible dans le manifeste : $digest $size"
    exit 4
  fi
  taille=$((taille + size))
  [ -e "$MODELES/blobs/sha256-${digest#sha256:}" ] || besoin=$((besoin + size))
done <<< "$couches"

refus=0
echo "modèle : $ref, $(go "$taille") ; à télécharger : $(go "$besoin")"
if [ "$deja" = 1 ]; then
  echo "modèles installés : $nb (plafond $MAX_MODELES), celui-ci compris"
else
  echo "modèles installés : $nb (plafond $MAX_MODELES)"
  if [ "$nb" -ge "$MAX_MODELES" ]; then
    echo "✗ déjà $nb modèles : en retirer un d'abord (~/ollama/bin/ollama rm <tag>), puis relancer tirer.sh"
    refus=1
  fi
fi
apres_total=$((total + besoin))
echo "modèles sur le disque : $(go "$total") -> $(go "$apres_total") (plafond 10 Go)"
if [ "$apres_total" -gt "$MAX_TOTAL" ]; then
  echo "✗ dépasserait 10 Go de modèles"
  refus=1
fi
apres_libre=$((libre - besoin))
echo "disque libre : $(gio "$libre") -> $(gio "$apres_libre") (plancher 8 Gio, comme df -h ~)"
if [ "$apres_libre" -lt "$PLANCHER" ]; then
  echo "✗ passerait sous le plancher de 8 Gio libres"
  refus=1
fi

if [ "$refus" = 1 ]; then
  echo "REFUSÉ : rien téléchargé"
  exit 3
fi
if [ "$ESSAI" = 1 ]; then
  echo "passerait : ollama pull $ref (--essai : rien téléchargé)"
  exit 0
fi

if ! curl -fsS -m 3 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  echo "✗ le serveur ne répond pas : lancer ~/ollama/demarrer.sh d'abord"
  exit 4
fi
OLLAMA_HOST=127.0.0.1:11434 "$BIN" pull "$ref"
code=$?
echo "après : $(df -h "$MODELES" | tail -1)"
exit "$code"
