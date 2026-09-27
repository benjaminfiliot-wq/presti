#!/usr/bin/env bash
# TÉMOIN du juge usine-socle-qa (026-048) : l'assistant des journaux, minimal, écrit par Claude Code pour prouver que le juge
# sait passer au vert. Ce n'est PAS le livrable de 026-050.   presti-journal <chef|atelier|livreur|surveillance|config-codex> [n]
set -euo pipefail
export LC_ALL=C
usage() { printf 'usage : presti-journal <chef|atelier|livreur|surveillance|config-codex> [n]\n' >&2; exit 2; }
[ $# -ge 1 ] && [ $# -le 2 ] || usage
quoi=$1
n=${2:-50}
[[ "$n" =~ ^[0-9]{1,4}$ ]] || usage
[ "$n" -ge 1 ] || usage
[ "$n" -le 500 ] || n=500
T="$HOME/travail"
f=""
case "$quoi" in
  chef) f="$T/chef/cycles.jsonl" ;;
  atelier) f="$T/atelier/atelier.log" ;;
  livreur) f="$T/usine/tourneur-livraison.jsonl" ;;
  surveillance) f=$(ls -1 "$T"/surveillance/mesures-*.jsonl 2>/dev/null | sort | tail -n 1 || true) ;;
  config-codex)
    [ $# -eq 1 ] || usage
    grep -E '^[[:space:]]*(model|sandbox_mode|network_access)[[:space:]]*=' "$HOME/.codex/config.toml" || true
    exit 0
    ;;
  *) usage ;;
esac
[ -n "$f" ] && [ -f "$f" ] || exit 0
tail -n "$n" "$f"
