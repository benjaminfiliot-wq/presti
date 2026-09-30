#!/usr/bin/env bash
# commit-fiche.sh <id> "<résumé>" — commite UNE fiche faite (périmètre + fait/ + preuves + retrait de file/ + digest/verdicts), pousse.
# Ne touche à rien d'autre de l'arbre (d'autres sessions y travaillent).
# 27/09 : l'application Codex (ChatGPT.exe) tient .git/index.lock une à deux minutes pour ses propres `git` ; un add ou un
# commit lancé à ce moment échouait en silence et l'ancien script affichait quand même le dernier commit. Désormais : on attend
# que le verrou se libère (5 min au plus ; le guetteur retire les orphelins de plus de 8 min), on réessaie, et on dit ✗ en clair.
# 28/09 : garde des imports (garde-imports.mjs) avant le commit — 026-077 importait un fichier présent sur le PC mais hors de
# git, le build Vercel a cassé. PRESTI_RACINE ne sert qu'au banc d'essai (juges-croises-qa.mjs) : un dépôt jetable.
set -u
ICI="$(cd "$(dirname "$0")" && pwd)"
cd "${PRESTI_RACINE:-/c/Users/benja/Documents/presti}" || exit 1
id="$1"; resume="$2"; f=".orchestre/fait/$id.md"
[ -f "$f" ] || { echo "✗ $id pas en fait/"; exit 1; }
attendre() { local n=0; while [ -e .git/index.lock ] && [ $n -lt 150 ]; do sleep 2; n=$((n+1)); done; [ ! -e .git/index.lock ]; }
g() { # git avec attente du verrou et 5 essais ; rend le code du dernier essai
  local i out rc
  for i in 1 2 3 4 5; do
    attendre || { echo "✗ verrou encore là après 5 min ($*)" >&2; return 99; }
    out=$(git "$@" 2>&1); rc=$?
    if [ $rc -ne 0 ] && grep -q "index.lock" <<<"$out"; then sleep 3; continue; fi
    [ -n "$out" ] && grep -vE "LF will|^warning" <<<"$out"
    return $rc
  done
  echo "✗ git $1 : verrou pris 5 fois de suite" >&2; return 98
}
avant=$(git rev-parse HEAD)
chemins=$(node -e '
const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const m=t.match(/^perimetre:\s*\[(.*)\]/m);
const p=m?m[1].split(",").map(s=>s.trim().replace(/^["\x27]|["\x27]$/g,"").replace(/\/\*\*.*$/,"")).filter(Boolean):[];
console.log(p.filter(x=>fs.existsSync(x)).join("\n"))' "$f" | tr -d '\r')
while IFS= read -r p; do [ -n "$p" ] && { g add -- "$p" >/dev/null || { echo "✗ add $p refusé"; exit 1; }; }; done <<<"$chemins"
g add -- "$f" >/dev/null || { echo "✗ add $f refusé"; exit 1; }
[ -d ".orchestre/preuves/$id" ] && { g add -- ".orchestre/preuves/$id" >/dev/null || { echo "✗ add des preuves refusé"; exit 1; }; }
git ls-files --error-unmatch ".orchestre/file/$id.md" >/dev/null 2>&1 && [ ! -f ".orchestre/file/$id.md" ] && g rm -q --cached ".orchestre/file/$id.md" >/dev/null
for x in .orchestre/digest.md .orchestre/verdicts.jsonl; do git diff --quiet -- "$x" || g add -- "$x" >/dev/null; done
echo "indexé : $(git diff --cached --name-only | wc -l) fichier(s)"
# Garde de l'index (27/09 : efe0ac9 annonçait des fixtures qu'il ne contenait pas) : chaque chemin du périmètre, la fiche et
# ses preuves doivent être entièrement suivis et sans modification hors index, sinon on ne commite pas.
restes=$( { echo "$chemins"; echo "$f"; echo ".orchestre/preuves/$id"; } | while IFS= read -r p; do [ -n "$p" ] && [ -e "$p" ] && { git ls-files --others --exclude-standard -- "$p"; git diff --name-only -- "$p"; }; done | sort -u)
[ -n "$restes" ] && { echo "✗ $id : INDEX INCOMPLET, rien n'est commité :"; echo "$restes" | head -10 | sed 's/^/    /'; git reset -q; exit 1; }
# Seulement NOS chemins (27/09 : un commit nu du moteur a emporté des fichiers indexés par une autre session, et inversement).
nos=(); while IFS= read -r p; do [ -n "$p" ] && nos+=("$p"); done <<<"$chemins"
nos+=("$f"); [ -d ".orchestre/preuves/$id" ] && nos+=(".orchestre/preuves/$id")
git ls-files --error-unmatch ".orchestre/file/$id.md" >/dev/null 2>&1 && nos+=(".orchestre/file/$id.md")
nos+=(.orchestre/digest.md .orchestre/verdicts.jsonl)
# Garde des imports : chaque import « @/ » ou relatif du code commité vise un fichier de HEAD ou de ce commit.
garde=$(node "$ICI/garde-imports.mjs" --id="$id" -- "${nos[@]}"); rc=$?
[ $rc -ne 0 ] && { echo "$garde" | head -10; echo "✗ $id : rien n'est commité (garde des imports)"; git reset -q; exit 1; }
g commit -q -m "$id : $resume

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- "${nos[@]}" | grep -E "❌|refusé|failed|error|régression|fatal" | head -5
if [ "$(git rev-parse HEAD)" = "$avant" ]; then echo "✗ $id : AUCUN commit (voir ci-dessus)"; exit 1; fi
echo "✓ $(git log --oneline -1 | cut -c1-110)"
g push -q origin main | tail -1
git status -sb | head -1
