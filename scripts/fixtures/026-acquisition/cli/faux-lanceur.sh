#!/bin/sh
# Faux lanceur du juge routes-acquisition-qa (fiche 026-037, RB-17), à la place de /usr/local/bin/presti-ia-modele.
# Il consigne son argv (une ligne par appel, jamais son entrée), lit et jette son entrée standard, puis écrit la réponse
# prévue (FAUX_LANCEUR_BRUT) dans le fichier qui suit --output-last-message, comme le ferait `codex exec`.
journal="${FAUX_LANCEUR_JOURNAL:?FAUX_LANCEUR_JOURNAL absent}"
brut="${FAUX_LANCEUR_BRUT}"
[ -z "$brut" ] && brut='{"classe":"oui","certitude":0.9,"extrait":""}'
sortie=""
precedent=""
for a in "$@"; do
  if [ "$precedent" = "--output-last-message" ]; then sortie="$a"; fi
  precedent="$a"
done
printf '%s\n' "$*" >> "$journal"
cat > /dev/null
if [ -n "$sortie" ]; then printf '%s' "$brut" > "$sortie"; fi
exit 0
