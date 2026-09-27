#!/usr/bin/env bash
# TÉMOIN du juge usine-socle-qa (026-048) : l'assistant du coffre, minimal, écrit par Claude Code pour prouver que le juge
# sait passer au vert. Ce n'est PAS le livrable de 026-050.
set -euo pipefail
umask 077
export LC_ALL=C
COFFRE="${PRESTI_COFFRE_FICHIER:-$HOME/.config/presti/agents.env}"
DOSSIER="$(dirname "$COFFRE")"
NOMS=" PRESTI_JETON_CHEF PRESTI_JETON_USINE PRESTI_JETON_ATELIER PRESTI_JETON_LIVREUR_USINE PRESTI_JETON_FACTEUR_USINE PRESTI_JETON_TELEGRAM TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID PRESTI_JETON_STANDARDISTE PRESTI_JETON_FACTEUR TELEGRAM_CODE_APPAIRAGE "

refuser() { printf 'presti-coffre : %s\n' "$1" >&2; exit 2; }

nom_permis() {
  [[ "$1" =~ ^[A-Z_]+$ ]] || return 1
  case "$NOMS" in *" $1 "*) return 0 ;; *) return 1 ;; esac
}

valeur_permise() {
  local nom=$1 v=$2 points re
  [ -n "$v" ] || return 1
  points=${v//[^.]/}
  case "$v" in eyJ*) [ "${#points}" -eq 2 ] && return 1 ;; esac
  case "$v" in sb_secret_* | sk_live_* | sk_test_* | rk_live_* | whsec_* | sk-ant-*) return 1 ;; esac
  case "$nom" in
    TELEGRAM_BOT_TOKEN) re='^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$'; [[ "$v" =~ $re ]]; return ;;
    TELEGRAM_CHAT_ID) re='^-?[0-9]{5,15}$'; [[ "$v" =~ $re ]] || [ "$v" = aucun ]; return ;;
    TELEGRAM_CODE_APPAIRAGE) re='^[A-HJ-NP-Z2-9]{8}$'; [[ "$v" =~ $re ]] || [ "$v" = epuise ]; return ;;
  esac
  # {20,256} dépasse RE_DUP_MAX (255) d'une ERE POSIX : la longueur se contrôle à part.
  [ "${#v}" -ge 20 ] && [ "${#v}" -le 256 ] || return 1
  re='^[A-Za-z0-9._~+/=-]+$'
  [[ "$v" =~ $re ]] || return 1
  case "$nom" in PRESTI_JETON_*) case "$v" in sk-* | eyJ*) return 1 ;; esac ;; esac
  return 0
}

# Réécrit le coffre sous verrou : la ligne du nom remplacée à sa place (ou retirée), les autres dans leur ordre.
# $1 : le nom ; $2 : poser | retirer. La valeur, pour poser, est dans $valeur (jamais imprimée).
reecrire() {
  local nom=$1 action=$2 ligne trouve=0
  mkdir -p "$DOSSIER"
  chmod 700 "$DOSSIER"
  exec 9>>"$DOSSIER/.agents.env.verrou"
  flock -x 9
  tmp=$(mktemp "$DOSSIER/.agents.env.XXXXXX")
  if [ -f "$COFFRE" ]; then
    while IFS= read -r ligne || [ -n "$ligne" ]; do
      if [ "${ligne%%=*}" = "$nom" ] && [ "$ligne" != "${ligne#*=}" ]; then
        trouve=1
        if [ "$action" = poser ]; then
          cat >>"$tmp" <<FIN
$nom=$valeur
FIN
        fi
      else
        printf '%s\n' "$ligne" >>"$tmp"
      fi
    done <"$COFFRE"
  fi
  if [ "$action" = poser ] && [ "$trouve" -eq 0 ]; then
    cat >>"$tmp" <<FIN
$nom=$valeur
FIN
  fi
  if [ "$action" = retirer ] && [ "$trouve" -eq 0 ]; then
    rm -f "$tmp"
    echo "absent"
    return 0
  fi
  chmod 600 "$tmp"
  mv -f "$tmp" "$COFFRE"
}

[ $# -ge 1 ] || refuser "sous-commande attendue : poser <NOM> | retirer <NOM> | noms | etat"
case "$1" in
  poser)
    [ $# -eq 2 ] || refuser "poser <NOM>"
    nom_permis "$2" || refuser "nom hors de la liste fermée"
    valeur=""
    IFS= read -r valeur || [ -n "$valeur" ] || refuser "valeur vide"
    reste=""
    if IFS= read -r reste || [ -n "$reste" ]; then refuser "une seule ligne attendue"; fi
    valeur_permise "$2" "$valeur" || refuser "valeur refusée pour $2"
    reecrire "$2" poser
    ;;
  retirer)
    [ $# -eq 2 ] || refuser "retirer <NOM>"
    nom_permis "$2" || refuser "nom hors de la liste fermée"
    reecrire "$2" retirer
    ;;
  noms)
    [ $# -eq 1 ] || refuser "noms"
    [ -f "$COFFRE" ] || exit 0
    { grep -E '^[A-Z_]+=' "$COFFRE" || true; } | cut -d= -f1 | sort
    ;;
  etat)
    [ $# -eq 1 ] || refuser "etat"
    if [ -f "$COFFRE" ]; then
      n=$({ grep -E '^[A-Z_]+=' "$COFFRE" || true; } | wc -l)
      printf 'mode=%s proprietaire=%s noms=%s\n' "$(stat -c %a "$COFFRE")" "$(stat -c %U "$COFFRE")" "$((n))"
    else
      printf 'mode=000 proprietaire=aucun noms=0\n'
    fi
    ;;
  *) refuser "sous-commande inconnue" ;;
esac
