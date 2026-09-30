#!/usr/bin/env bash
# menage-bacs.sh — ménage des bacs de `usine.mjs executer` sur l'usine (écrit le 25/09/2026).
#
# Un bac (~/bacs/<nom>) est un worktree git de ~/presti, recréé à chaque `executer` et jamais retiré ensuite : 27 bacs
# pesaient 6,3 Go le 25/09 (leur node_modules est en liens physiques, seul le reste compte). Ce script retire les bacs
#   - NON verrouillés : il prend lui-même le verrou du bac (flock -n sur ~/bacs/.verrous/<nom>.lock, celui d'executer) et
#     le garde pendant le retrait ; un bac tenu par un executer en cours est laissé ;
#   - plus vieux que N heures (défaut 6) : âge = dernière prise du bac (le plus récent de la date du dossier et de
#     ~/bacs/.verrous/<nom>.qui, réécrit à chaque prise) ;
# par `git -C ~/presti worktree remove --force`, puis `git worktree prune`. Il retire aussi les .fin et .code de
# ~/bacs/.runs de plus de 24 h. Il affiche l'espace avant/après.
# Il ne touche NI ~/presti (hors les métadonnées de worktree que git tient pour ses bacs), NI ~/taches, NI les
# fichiers .lock (supprimer un verrou pendant qu'un executer l'attend donnerait deux détenteurs du même bac).
#
# Usage, depuis le PC (Git Bash ou PowerShell) :
#   ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'bash -s' < menage-bacs.sh                          → pour de vrai, bacs > 6 h
#   ssh -i ~/.ssh/presti-usine usine@88.96.53.3 'bash -s -- --essai --heures=3' < menage-bacs.sh    → dit ce qu'il ferait
# Sur l'usine : bash menage-bacs.sh [--heures=6] [--essai]
# Codes : 0 ok ; 1 un retrait a échoué ; 2 usage.
set -euo pipefail

HEURES=6
ESSAI=non
for a in "$@"; do
  case "$a" in
    --heures=*) HEURES=${a#--heures=} ;;
    --essai) ESSAI=oui ;;
    -h|--help) sed -n '2,20p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "✗ option inconnue : $a (--heures=N, --essai)"; exit 2 ;;
  esac
done
[[ "$HEURES" =~ ^[0-9]+$ ]] || { echo "✗ --heures=$HEURES : un nombre entier d'heures"; exit 2; }

B="$HOME/bacs"; V="$B/.verrous"; R="$B/.runs"; P="$HOME/presti"
NOM_BAC='^[a-z0-9][a-z0-9_-]{0,31}$' # la règle d'executer (NOM_BAC dans usine.mjs)
[ -d "$B" ] || { echo "· rien à faire : $B absent"; exit 0; }
[ -d "$P/.git" ] || { echo "✗ $P absent : pas de git pour retirer les worktrees"; exit 1; }

mo() { awk -v o="$1" 'BEGIN { printf "%.1f Mo", o / 1048576 }'; }
go() { awk -v o="$1" 'BEGIN { printf "%.2f Go", o / 1073741824 }'; }
mesurer() {
  # df : la place réellement libre. du --apparent-size ~/bacs : taille apparente (les liens physiques d'un même passage
  # comptés une fois, donc un node_modules). du ~/presti/node_modules ~/bacs : la part des bacs HORS node_modules
  # partagé, c'est-à-dire ce qu'un retrait peut rendre.
  LIBRE=$(df -B1 --output=avail "$HOME" | tail -1 | tr -d ' ')
  APPARENT=$(du -s --apparent-size -B1 "$B" 2>/dev/null | cut -f1)
  PROPRE=$(du -s -B1 "$P/node_modules" "$B" 2>/dev/null | tail -1 | cut -f1)
  NB=$(find "$B" -mindepth 1 -maxdepth 1 -type d ! -name '.*' | wc -l)
  RUNS=$(find "$R" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)
}

maintenant=$(date +%s)
seuil=$(( HEURES * 3600 ))
mesurer
AV_LIBRE=$LIBRE; AV_APPARENT=$APPARENT; AV_PROPRE=$PROPRE; AV_NB=$NB; AV_RUNS=$RUNS
mode="pour de vrai"; [ "$ESSAI" = oui ] && mode="ESSAI : rien n'est retiré"
echo "· $(date -u +%FT%TZ) · ménage des bacs (${mode}) · seuil ${HEURES} h, non verrouillés seulement"
echo "  avant : ${AV_NB} bac(s) · ~/bacs $(go "$AV_APPARENT") apparents, $(go "$AV_PROPRE") hors node_modules partagé · disque libre $(go "$AV_LIBRE") · ${AV_RUNS} entrée(s) dans .runs"

mkdir -p "$V"
retires=0; gardes=0; verrouilles=0; echecs=0
for d in "$B"/*/; do
  [ -d "$d" ] || continue
  nom=$(basename "$d")
  bac="$B/$nom"
  if [ -L "$bac" ]; then echo "  ? $nom : lien symbolique, laissé"; gardes=$((gardes + 1)); continue; fi
  if ! [[ "$nom" =~ $NOM_BAC ]]; then echo "  ? $nom : nom hors de la règle d'executer, laissé"; gardes=$((gardes + 1)); continue; fi
  # Âge : dernière prise du bac.
  t=$(stat -c %Y "$bac")
  if [ -f "$V/$nom.qui" ]; then
    tq=$(stat -c %Y "$V/$nom.qui")
    if [ "$tq" -gt "$t" ]; then t=$tq; fi
  fi
  age=$(( maintenant - t ))
  age_h=$(awk -v s="$age" 'BEGIN { printf "%.1f", s / 3600 }')
  if [ "$age" -lt "$seuil" ]; then
    echo "  = $nom : pris il y a ${age_h} h (< ${HEURES} h), gardé"
    gardes=$((gardes + 1)); continue
  fi
  # Le verrou d'executer. En essai, on ne crée pas de fichier : sans .lock, personne ne peut tenir le bac.
  if [ -e "$V/$nom.lock" ]; then
    exec {fd}<"$V/$nom.lock"
  elif [ "$ESSAI" = oui ]; then
    fd=""
  else
    exec {fd}>>"$V/$nom.lock"
  fi
  if [ -n "$fd" ] && ! flock -n "$fd"; then
    echo "  ! $nom : verrouillé (un executer le tient : $(cut -c1-120 "$V/$nom.qui" 2>/dev/null || echo '?')), laissé"
    exec {fd}<&-
    verrouilles=$((verrouilles + 1)); continue
  fi
  taille=$(du -s -B1 --exclude=node_modules "$bac" 2>/dev/null | cut -f1)
  if [ "$ESSAI" = oui ]; then
    echo "  - $nom : pris il y a ${age_h} h, libre : SERAIT retiré ($(mo "$taille") hors node_modules)"
    [ -n "$fd" ] && exec {fd}<&-
    retires=$((retires + 1)); continue
  fi
  # Verrou tenu : aucun executer ne peut prendre ce bac pendant le retrait (il attendra, puis le recréera).
  if git -C "$P" worktree list --porcelain | grep -qxF "worktree $bac"; then
    if git -C "$P" worktree remove --force "$bac" 2>/tmp/menage-bacs.err.$$; then
      echo "  - $nom : pris il y a ${age_h} h : retiré (git worktree remove --force, $(mo "$taille") hors node_modules)"
      rm -f "$V/$nom.qui"; retires=$((retires + 1))
    else
      echo "  ✗ $nom : git worktree remove a échoué : $(head -c 200 /tmp/menage-bacs.err.$$)"; echecs=$((echecs + 1))
    fi
    rm -f /tmp/menage-bacs.err.$$
  else
    # Pas (ou plus) inscrit comme worktree : un dossier resté seul. Retiré par rm, seulement s'il est bien dans ~/bacs.
    case "$(readlink -f -- "$bac")" in
      "$(readlink -f -- "$B")"/*) rm -rf -- "$bac"; echo "  - $nom : pris il y a ${age_h} h : dossier hors worktree, retiré (rm -rf, $(mo "$taille"))"; rm -f "$V/$nom.qui"; retires=$((retires + 1)) ;;
      *) echo "  ✗ $nom : sort de ~/bacs une fois résolu, laissé"; echecs=$((echecs + 1)) ;;
    esac
  fi
  exec {fd}<&-
done
[ "$ESSAI" = oui ] || git -C "$P" worktree prune

# .runs : les fins (.fin) et les anciens codes (.code) de plus de 24 h. executer retire déjà tout ce qui a plus de 24 h à
# son lancement suivant ; ceci le fait même quand plus rien n'est lancé.
vieux=$(find "$R" -mindepth 1 -maxdepth 1 -type f \( -name '*.fin' -o -name '*.code' \) -mmin +1440 2>/dev/null | wc -l)
if [ "$ESSAI" = oui ]; then
  echo "  .runs : ${vieux} fichier(s) .fin/.code de plus de 24 h SERAIENT retirés"
else
  find "$R" -mindepth 1 -maxdepth 1 -type f \( -name '*.fin' -o -name '*.code' \) -mmin +1440 -delete 2>/dev/null || true
  echo "  .runs : ${vieux} fichier(s) .fin/.code de plus de 24 h retirés"
fi

mesurer
echo "  après : ${NB} bac(s) · ~/bacs $(go "$APPARENT") apparents, $(go "$PROPRE") hors node_modules partagé · disque libre $(go "$LIBRE") · ${RUNS} entrée(s) dans .runs"
if [ "$ESSAI" = oui ]; then
  echo "✓ essai : ${retires} bac(s) seraient retirés, ${gardes} gardé(s) (récents), ${verrouilles} verrouillé(s)"
else
  echo "✓ ${retires} bac(s) retiré(s), ${gardes} gardé(s) (récents), ${verrouilles} verrouillé(s), ${echecs} échec(s) · gain : disque $(mo $(( LIBRE - AV_LIBRE ))) libérés (df), ~/bacs $(mo $(( AV_APPARENT - APPARENT ))) apparents en moins"
fi
[ "$echecs" -eq 0 ]
