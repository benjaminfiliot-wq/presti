#!/usr/bin/env bash
# scripts/usine/presti-coffre.sh — l'assistant du coffre des agents de l'usine (fiche 026-050).
#
# Installé par scripts/usine/socle.sh dans /usr/local/bin/presti-coffre (root:root 755), depuis /srv/presti-agents, et
# lancé sous le compte agents : `sudo -n -u agents /usr/local/bin/presti-coffre <sous-commande>` (le sudoers du socle ne
# permet à usine que cet assistant et presti-journal).
#
#   presti-coffre poser <NOM>      la valeur arrive sur l'entrée standard, une ligne ; jamais en argument
#   presti-coffre retirer <NOM>    nom absent : code 0, « absent »
#   presti-coffre noms             les noms du coffre, triés ; jamais une valeur
#   presti-coffre etat             mode=<octal> proprietaire=<compte> noms=<n>
# Codes : 0 fait ; 1 verrou occupé ; 2 refus (sous-commande, nom hors de la liste fermée, valeur hors des règles).
#
# Les règles sont celles de scripts/usine/coffre-regles.mjs, jugées sur la même table de cas (usine-socle-qa CF-3, CF-10) :
# qui change une règle ici la change là-bas. Aucune sous-commande ne sait relire une valeur, aucun message ne la cite.
# Écriture atomique : sous flock d'un verrou du dossier, un temporaire créé DANS le dossier du coffre (mktemp, 600), la copie
# des autres lignes, la ligne NOM=valeur, puis mv -f sur le coffre. Le coffre n'est jamais chargé par le shell.
# Le fichier : $HOME/.config/presti/agents.env. PRESTI_COFFRE_FICHIER ne sert qu'aux essais : sudo remet l'environnement à
# zéro, en service c'est toujours le chemin par défaut.
set -euo pipefail
umask 077
export LC_ALL=C

coffre="${PRESTI_COFFRE_FICHIER:-$HOME/.config/presti/agents.env}"
dossier=$(dirname "$coffre")
verrou="$dossier/.agents.env.verrou"

refuser() {
  echo "✗ presti-coffre : $1" >&2
  exit 2
}

usage() {
  echo "usage : presti-coffre poser <NOM> (valeur sur l'entrée standard) | retirer <NOM> | noms | etat" >&2
  exit 2
}

# La liste fermée (NOMS_PERMIS de coffre-regles.mjs).
nom_permis() {
  case "$1" in
    PRESTI_JETON_CHEF | PRESTI_JETON_USINE | PRESTI_JETON_ATELIER | PRESTI_JETON_LIVREUR_USINE | PRESTI_JETON_FACTEUR_USINE) return 0 ;;
    PRESTI_JETON_TELEGRAM | TELEGRAM_BOT_TOKEN | TELEGRAM_CHAT_ID | PRESTI_JETON_STANDARDISTE | PRESTI_JETON_FACTEUR) return 0 ;;
    TELEGRAM_CODE_APPAIRAGE | PRESTI_JETON_STUDIO) return 0 ;;
    PRESTI_JETON_SAV | PRESTI_JETON_QUALITE | PRESTI_JETON_VIGILE | FIRECRAWL_API_KEY | PRESTI_JETON_PRENEUR | APIFY_TOKEN) return 0 ;;
    *) return 1 ;;
  esac
}

# Les règles de valeur (validerValeur de coffre-regles.mjs). Code 0 : acceptée ; sinon la raison dans $raison, sans la valeur.
raison=""
valeur_permise() {
  local nom=$1 v=$2
  if [ -z "$v" ]; then raison="valeur vide"; return 1; fi
  # Un JWT (clés de Supabase) : eyJ en tête, puis deux points au moins.
  case "$v" in
    eyJ*.*.*) raison="un JWT (eyJ… à deux points) n'entre jamais au coffre, quel que soit le nom"; return 1 ;;
  esac
  # Les formes de clés connues, quel que soit le nom (sk-ant- couvre les clés d'administration Anthropic).
  case "$v" in
    sb_secret_* | sk_live_* | sk_test_* | rk_live_* | whsec_* | sk-ant-admin* | sk-ant-*)
      raison="une clé de forme connue (Supabase, Stripe ou Anthropic) n'entre jamais au coffre, quel que soit le nom"; return 1 ;;
  esac
  # Les formes propres du pont Telegram [à vérifier : forme actuelle des jetons de bot Telegram].
  local re_bot='^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$'
  local re_chat='^-?[0-9]{5,15}$'
  local re_code='^[A-HJ-NP-Z2-9]{8}$'
  local re_firecrawl='^fc-[A-Za-z0-9]{32}$'
  local re_apify='^apify_api_[A-Za-z0-9]{36}$'
  case "$nom" in
    TELEGRAM_BOT_TOKEN)
      if [[ $v =~ $re_bot ]]; then return 0; fi
      raison="TELEGRAM_BOT_TOKEN : 6 à 12 chiffres, deux-points, puis 30 signes au moins de [A-Za-z0-9_-]"; return 1 ;;
    TELEGRAM_CHAT_ID)
      if [[ $v =~ $re_chat ]] || [ "$v" = aucun ]; then return 0; fi
      raison="TELEGRAM_CHAT_ID : un entier de 5 à 15 chiffres (signe - permis), ou « aucun »"; return 1 ;;
    TELEGRAM_CODE_APPAIRAGE)
      if [[ $v =~ $re_code ]] || [ "$v" = epuise ]; then return 0; fi
      raison="TELEGRAM_CODE_APPAIRAGE : 8 signes de [A-HJ-NP-Z2-9], ou « epuise »"; return 1 ;;
    APIFY_TOKEN)
      if [[ $v =~ $re_apify ]]; then return 0; fi
      raison="APIFY_TOKEN : « apify_api_ » puis 36 signes de [A-Za-z0-9]"; return 1 ;;
    FIRECRAWL_API_KEY)
      if [[ $v =~ $re_firecrawl ]]; then return 0; fi
      raison="FIRECRAWL_API_KEY : « fc- » puis 32 signes de [A-Za-z0-9]"; return 1 ;;
  esac
  # Tout autre nom : 20 à 256 signes de [A-Za-z0-9._~+/=-] (LC_ALL=C : un octet par signe, aucun accent dans les plages).
  local re_signes='^[A-Za-z0-9._~+/=-]+$'
  if [ "${#v}" -lt 20 ] || [ "${#v}" -gt 256 ]; then raison="longueur hors de 20 à 256 signes"; return 1; fi
  if ! [[ $v =~ $re_signes ]]; then
    raison="signe interdit : seuls [A-Za-z0-9._~+/=-] sont permis (ni blanc, ni guillemet, ni \$, ni barre oblique inverse, ni accent grave, ni retour à la ligne)"
    return 1
  fi
  case "$nom" in
    PRESTI_JETON_*)
      case "$v" in
        sk-* | eyJ*) raison="un PRESTI_JETON_* ne commence ni par sk- ni par eyJ"; return 1 ;;
      esac ;;
  esac
  return 0
}

# Les noms du coffre (lignes NOM=…, commentaires, lignes vides et lignes mal formées ignorés), un par ligne, dans l'ordre.
lister_noms() {
  [ -f "$coffre" ] || return 0
  local ligne
  while IFS= read -r ligne || [ -n "$ligne" ]; do
    ligne=${ligne%$'\r'}
    if [[ $ligne =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      printf '%s\n' "${BASH_REMATCH[1]}"
    fi
  done < "$coffre"
}

tmp=""
nettoyer() {
  if [ -n "$tmp" ]; then rm -f -- "$tmp"; fi
}
trap nettoyer EXIT

# Réécrit le coffre sous verrou. $1 : poser ou retirer ; $2 : le nom ; pour poser, la valeur est dans $valeur.
# La ligne du nom est remplacée à sa place (poser) ou ôtée (retirer) ; toutes les autres sont recopiées dans leur ordre
# (une fin de ligne \r\n devient \n). La lecture de l'ancien coffre se fait sous le verrou : deux poses simultanées de deux
# noms gardent les deux lignes.
ecrire() {
  local action=$1 nom=$2 ligne trouve=0
  if [ "$action" = retirer ] && [ ! -f "$coffre" ]; then
    echo "absent : $nom n'est pas dans le coffre"
    return 0
  fi
  if [ ! -d "$dossier" ]; then mkdir -p -m 700 "$dossier"; fi
  exec 9> "$verrou"
  if ! flock -w 30 9; then
    echo "✗ presti-coffre : verrou du coffre occupé depuis 30 s, rien n'est écrit" >&2
    exit 1
  fi
  tmp=$(mktemp -p "$dossier" .agents.env.XXXXXX)
  if [ -f "$coffre" ]; then
    while IFS= read -r ligne || [ -n "$ligne" ]; do
      ligne=${ligne%$'\r'}
      if [[ $ligne == "$nom="* ]]; then
        if [ "$action" = poser ] && [ "$trouve" = 0 ]; then
          cat >> "$tmp" <<FIN
$nom=$valeur
FIN
        fi
        trouve=1
        continue
      fi
      printf '%s\n' "$ligne" >> "$tmp"
    done < "$coffre"
  fi
  if [ "$trouve" = 0 ]; then
    if [ "$action" = retirer ]; then
      rm -f -- "$tmp"
      tmp=""
      echo "absent : $nom n'est pas dans le coffre"
      return 0
    fi
    cat >> "$tmp" <<FIN
$nom=$valeur
FIN
  fi
  mv -f -- "$tmp" "$coffre"
  tmp=""
  if [ "$action" = poser ]; then echo "posé : $nom"; else echo "retiré : $nom"; fi
}

[ "$#" -ge 1 ] || usage
case "$1" in
  poser)
    [ "$#" -eq 2 ] || usage
    nom_permis "$2" || refuser "nom hors de la liste fermée du coffre (voir docs/agents/usine.md, « Le coffre ») : rien n'est écrit"
    valeur=""
    # Au terminal (un humain sur l'usine), la saisie n'est pas renvoyée à l'écran.
    if [ -t 0 ]; then
      IFS= read -r -s valeur || true
      echo >&2
    else
      IFS= read -r valeur || true
      # Une seule ligne : un reste sur l'entrée standard (une valeur coupée par un retour à la ligne) est un refus.
      reste=""
      if IFS= read -r reste || [ -n "$reste" ]; then
        refuser "plus d'une ligne sur l'entrée standard : rien n'est écrit"
      fi
    fi
    if ! valeur_permise "$2" "$valeur"; then
      refuser "$2 refusé : $raison ; rien n'est écrit"
    fi
    ecrire poser "$2"
    ;;
  retirer)
    [ "$#" -eq 2 ] || usage
    nom_permis "$2" || refuser "nom hors de la liste fermée du coffre : rien n'est écrit"
    ecrire retirer "$2"
    ;;
  noms)
    [ "$#" -eq 1 ] || usage
    lister_noms | sort
    ;;
  etat)
    [ "$#" -eq 1 ] || usage
    if [ ! -f "$coffre" ]; then
      echo "absent : aucun coffre"
      exit 0
    fi
    n=$(lister_noms | wc -l)
    echo "mode=$(stat -c '%a' -- "$coffre") proprietaire=$(stat -c '%U' -- "$coffre") noms=$((n + 0))"
    ;;
  *)
    usage
    ;;
esac
