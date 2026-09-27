#!/usr/bin/env bash
# scripts/usine/presti-journal.sh — la fin des journaux des agents de l'usine (fiche 026-050).
#
# Installé par scripts/usine/socle.sh dans /usr/local/bin/presti-journal (root:root 755), depuis /srv/presti-agents, et
# lancé sous le compte agents : `sudo -n -u agents /usr/local/bin/presti-journal <journal> [n]` (le sudoers du socle ne
# permet à usine que cet assistant et presti-coffre). Il sert à Benj et aux juges du poste, par ssh : relire ce que les
# agents ont écrit, qui ne contient aucune donnée personnelle par construction (leurs juges le vérifient).
#
#   presti-journal chef [n]           ~/travail/chef/cycles.jsonl
#   presti-journal atelier [n]        ~/travail/atelier/atelier.log (la sortie de l'atelier, que son unité y ajoute)
#   presti-journal livreur [n]        ~/travail/usine/tourneur-livraison.jsonl
#   presti-journal surveillance [n]   le dernier ~/travail/surveillance/mesures-<AAAA-MM-JJ>.jsonl
#   presti-journal config-codex       les seules lignes model, sandbox_mode et network_access de ~/.codex/config.toml
# n : les n dernières lignes, 50 par défaut, 500 au plus (au-delà, 500). Tout autre argument : code 2, rien n'est lu.
# Codes : 0 lu ; 1 journal absent ; 2 usage ; 3 journal suspect (lien, ou chemin réel hors de ~/travail : rien n'est lu).
# Les chemins sont fixés ici : aucun argument ne devient un chemin, et rien d'autre (ni le coffre, ni la connexion de
# Codex) n'est jamais ouvert.
set -euo pipefail
export LC_ALL=C

usage() {
  echo "usage : presti-journal <chef|atelier|livreur|surveillance> [n, 1 à 500] | presti-journal config-codex" >&2
  exit 2
}

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage

n=50
if [ "$#" -eq 2 ]; then
  [ "$1" != config-codex ] || usage
  [[ $2 =~ ^[0-9]{1,6}$ ]] || usage
  n=$((10#$2))
  [ "$n" -ge 1 ] || usage
  if [ "$n" -gt 500 ]; then
    echo "presti-journal : $n lignes demandées, 500 au plus" >&2
    n=500
  fi
fi

travail="$HOME/travail"
case "$1" in
  chef) fichier="$travail/chef/cycles.jsonl" ;;
  atelier) fichier="$travail/atelier/atelier.log" ;;
  livreur) fichier="$travail/usine/tourneur-livraison.jsonl" ;;
  surveillance)
    # Le dernier jour (Paris) : les noms portent la date, l'ordre des noms est celui des jours.
    fichier=""
    for f in "$travail"/surveillance/mesures-*.jsonl; do
      [ -f "$f" ] && fichier=$f
    done
    ;;
  config-codex)
    config="$HOME/.codex/config.toml"
    if [ ! -f "$config" ]; then
      echo "presti-journal : ~/.codex/config.toml absent" >&2
      exit 1
    fi
    grep -E '^[[:space:]]*(model|sandbox_mode|network_access)[[:space:]]*=' "$config" || true
    exit 0
    ;;
  *) usage ;;
esac

if [ -z "$fichier" ] || [ ! -f "$fichier" ]; then
  echo "presti-journal : aucun journal $1 pour l'instant" >&2
  exit 1
fi
# Un journal est un fichier ordinaire de ~/travail, sous un seul nom : ni lien symbolique, ni lien physique, ni chemin
# réel hors de ~/travail. Sinon un lien posé là ferait lire à usine un fichier du compte agents qu'il ne doit jamais voir.
racine=$(realpath -e -- "$travail")
reel=$(realpath -e -- "$fichier")
if [ -L "$fichier" ] || [ "$(stat -c '%h' -- "$fichier")" != 1 ] || [[ $reel != "$racine"/* ]]; then
  echo "presti-journal : le journal $1 n'est pas un fichier ordinaire de ~/travail : rien n'est lu" >&2
  exit 3
fi
tail -n "$n" -- "$fichier"
