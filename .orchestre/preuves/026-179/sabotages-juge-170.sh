#!/usr/bin/env bash
# Contre-vérification de la correction du juge 026-170 (session-simulee.mjs répond au journal ; AUTORISEES de CL-11 admet le journal et /controle
# par leur FORME exacte), faite sur un bac de l'usine : jamais sur le dépôt. Lancé par :
#   node scripts/usine.mjs executer --nom=sab-170 --id=026-179 --delai=25 --rapatrier=.orchestre/preuves/026-179/sab-170 -- bash .orchestre/preuves/026-179/sabotages-juge-170.sh
# Chaque scénario ajoute à app/controle/station/page.tsx (la vraie, dans le bac) des requêtes que la page ne fait pas, juge CL-11 (partie csp,
# sur next build puis next start de la copie), puis RESTAURE le fichier (sha256 comparé). Le témoin positif (formes admises) doit rester vert.
set -u
SORTIE=".orchestre/preuves/026-179/sab-170"
mkdir -p "$SORTIE"
F="app/controle/station/page.tsx"
ORIG="$(mktemp)"
cp "$F" "$ORIG"
sha() { sha256sum "$1" | cut -c1-16; }
AVANT="$(sha "$F")"
LOG="$SORTIE/journal.md"
{
  echo "# Sabotages de la correction du juge 026-170 (bac $(basename "$PWD"), $(date -u +%FT%TZ))"
  echo "page.tsx avant tout sabotage : sha256 $AVANT"
} > "$LOG"

semer() { # semer <charge> : ajoute la charge juste après setRole(...) dans page.tsx
  CHARGE="$1" node -e '
    const fs = require("fs"); const f = process.argv[1]; let t = fs.readFileSync(f, "utf8");
    const a = "setRole(r.data.role ?? \x27direction\x27)";
    if (t.split(a).length !== 2) { console.error("ancre absente"); process.exit(3) }
    fs.writeFileSync(f, t.replace(a, () => a + "; " + process.env.CHARGE));
  ' "$F"
}
scenario() { # scenario <nom> <charge> <attendu : FAIL|PASS> <motif attendu dans la sortie, ou ->
  local nom="$1" charge="$2" attendu="$3" motif="$4" sortie code apres restaure
  cp "$ORIG" "$F"
  semer "$charge" || { echo "- $nom : sabotage non posé" >> "$LOG"; return; }
  apres="$(sha "$F")"
  sortie="$(node scripts/station-claw3d-qa.mjs --partie=csp 2>&1)"; code=$?
  cp "$ORIG" "$F"; restaure="$(sha "$F")"
  local verdict="PASS"; [ "$code" -ne 0 ] && verdict="FAIL"
  local ok="✓"; [ "$verdict" != "$attendu" ] && ok="✗ (attendu $attendu)"
  if [ "$motif" != "-" ] && ! grep -qF -- "$motif" <<<"$sortie"; then ok="✗ (motif « $motif » absent de la sortie)"; fi
  [ "$restaure" = "$AVANT" ] || ok="✗ (page.tsx NON restaurée : $restaure)"
  {
    echo
    echo "## $nom : $ok"
    echo "- charge ajoutée après setRole : \`$charge\`"
    echo "- sha256 page.tsx : $AVANT → $apres (sabotée) → $restaure (restaurée)"
    echo "- juge CL-11 (--partie=csp) : $verdict, code $code, attendu $attendu"
    echo '```'
    grep -E "CL-11|FAIL|PASS" <<<"$sortie" | cut -c1-420
    echo '```'
  } >> "$LOG"
  echo "$nom : $verdict (attendu $attendu) $ok"
}

# Témoin positif : les DEUX formes admises, une seconde fois (GET ?limite=1, GET ?_rsc=…) : rien à dire.
scenario "T0 formes admises (témoin vert)" "void fetch('/api/controle/journal?limite=1'); void fetch('/controle?_rsc=abc')" PASS -
# Quatre formes que la liste n'admet PAS : chacune doit être nommée dans le message du juge.
scenario "S1 journal avec une autre limite" "void fetch('/api/controle/journal?limite=50')" FAIL "GET /api/controle/journal?limite=50"
scenario "S2 journal en POST" "void fetch('/api/controle/journal?limite=1', { method: 'POST' })" FAIL "POST /api/controle/journal?limite=1"
scenario "S3 /controle sans ?_rsc=" "void fetch('/controle')" FAIL "GET /controle"
scenario "S4 /controle?_rsc= en POST" "void fetch('/controle?_rsc=abc', { method: 'POST' })" FAIL "POST /controle?_rsc=abc"
# Hors liste depuis toujours : un chemin voisin du journal (non admis par AUTORISEES).
scenario "S5 /api/controle/journal/export (chemin voisin)" "void fetch('/api/controle/journal/export')" FAIL "/api/controle/journal/export"

cp "$ORIG" "$F"
FIN="$(sha "$F")"
{ echo; echo "page.tsx à la fin : sha256 $FIN ($( [ "$FIN" = "$AVANT" ] && echo identique || echo DIFFÉRENT ))"; } >> "$LOG"
echo "fin : page.tsx $FIN (avant $AVANT)"
[ "$FIN" = "$AVANT" ] && ! grep -q "✗" "$LOG"
