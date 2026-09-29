#!/usr/bin/env bash
# verifier-isole.sh <id> — rejoue `orchestre.mjs verifier <id>` dans une copie de travail ISOLÉE, pour les preuves qui exigent
# un dépôt immobile (JA-5, JP-6, JL-5 : « git status identique avant et après ») pendant que d'autres lignes écrivent dans
# presti. La copie = HEAD + les chemins non commités du périmètre de la fiche + la fiche (posée en fait/) + ses preuves.
# Rapporte ensuite dans le dépôt principal : les preuves régénérées et la ligne de verdict ; si PASS, la fiche passe en fait/.
# Le lien node_modules est une jonction : elle est retirée par « cmd /c rmdir » AVANT « git worktree remove » (sinon le
# retrait suivrait la jonction et effacerait le vrai node_modules). Codes : 0 PASS ; 1 FAIL ; 2 usage ou panne de l'outil.
set -u
R=/c/Users/benja/Documents/presti
id="${1:-}"; [[ "$id" =~ ^[0-9]{3}-[0-9]{2,3}$ ]] || { echo "usage : verifier-isole.sh <id>"; exit 2; }
cd "$R" || exit 2
f=$(ls .orchestre/en-cours/"$id".md .orchestre/fait/"$id".md .orchestre/refuse/"$id".md 2>/dev/null | head -1)
[ -n "$f" ] || { echo "✗ $id n'est ni en en-cours/, ni en fait/, ni en refuse/"; exit 2; }
W="/c/Users/benja/AppData/Local/Temp/vi-$id-$$"
git worktree add --detach -q "$W" HEAD || { echo "✗ copie impossible"; exit 2; }
nettoyer() {
  [ -e "$W/node_modules" ] && cmd //c rmdir "$(cygpath -w "$W/node_modules")" >/dev/null 2>&1
  if [ -e "$W/node_modules" ]; then echo "⚠ jonction node_modules encore là : copie laissée en place ($W)"; return; fi
  git -c core.longpaths=true worktree remove --force "$W" 2>/dev/null || git worktree prune
}
trap nettoyer EXIT
chemins=$(node -e '
const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const m=t.match(/^perimetre:\s*\[(.*)\]/m);
const p=m?m[1].split(",").map(s=>s.trim().replace(/^["\x27]|["\x27]$/g,"").replace(/\/\*\*.*$/,"")).filter(Boolean):[];
console.log(p.filter(x=>fs.existsSync(x)).join("\n"))' "$f" | tr -d '\r')
while IFS= read -r p; do
  [ -n "$p" ] && [ -e "$p" ] || continue
  mkdir -p "$W/$(dirname "$p")"; cp -r "$p" "$W/$(dirname "$p")/"
done <<<"$chemins"
[ -d ".orchestre/preuves/$id" ] && { mkdir -p "$W/.orchestre/preuves"; cp -r ".orchestre/preuves/$id" "$W/.orchestre/preuves/"; }
mkdir -p "$W/.orchestre/fait"; cp "$f" "$W/.orchestre/fait/$id.md"
rm -f "$W/.orchestre/en-cours/$id.md" "$W/.orchestre/refuse/$id.md" "$W/.orchestre/file/$id.md"
powershell -NoProfile -Command "New-Item -ItemType Junction -Path '$(cygpath -w "$W/node_modules")' -Target '$(cygpath -w "$R/node_modules")' | Out-Null" || { echo "✗ jonction node_modules impossible"; exit 2; }
( cd "$W" && timeout 3600 node scripts/orchestre.mjs verifier "$id" ) | tail -3
ligne=$(grep "\"id\":\"$id\"" "$W/.orchestre/verdicts.jsonl" | tail -1)
[ -n "$ligne" ] || { echo "✗ aucun verdict écrit pour $id dans la copie"; exit 2; }
mkdir -p ".orchestre/preuves/$id"; cp -r "$W/.orchestre/preuves/$id/." ".orchestre/preuves/$id/"
echo "$ligne" | sed 's/}$/,"copie_isolee":true}/' >> .orchestre/verdicts.jsonl
if echo "$ligne" | grep -q '"verdict":"PASS"'; then
  [ "$f" != ".orchestre/fait/$id.md" ] && mv "$f" ".orchestre/fait/$id.md"
  rm -f ".orchestre/en-cours/$id.lock" ".orchestre/en-cours/$id.avant.txt" 2>/dev/null
  echo "✓ $id : PASS dans une copie isolée — fiche en fait/, preuves et verdict rapportés"; exit 0
fi
echo "✗ $id : $(echo "$ligne" | grep -o '"verdict":"[A-Z]*"') dans la copie isolée — fiche laissée où elle était"; exit 1
