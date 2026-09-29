#!/usr/bin/env bash
# commit-fiche-cloud.sh <id> "<résumé>" — l'équivalent, dans une session CLOUD, de presti-ops/usine/commit-fiche.sh (qui vit hors du dépôt, sur le PC).
# Commite UNE fiche faite (son périmètre + sa fiche en fait/ + ses preuves + le retrait de file/), sur la BRANCHE DE LA SESSION, et la pousse.
# Différences voulues avec le script du PC (29/09/2026) :
#   1. On ne pousse JAMAIS sur main : le proxy GitHub du cloud n'autorise le push que sur la branche courante. On pousse la branche `claude/…`
#      et on ouvre une PR ; c'est la session du PC qui fusionne (git fetch + git merge), puis vérifie le déploiement.
#   2. On ne commite NI .orchestre/digest.md NI .orchestre/verdicts.jsonl : le PC les modifie en continu (le moteur commite toutes les
#      5 minutes), ils entreraient en conflit à chaque fusion. La ligne de verdict de la fiche est rangée dans
#      .orchestre/preuves/<id>/verdict-cloud.jsonl ; le PC la reporte avec `node reprise-cloud/outils/recevoir.mjs <id>`.
#   3. Pas d'attente de verrou git : personne d'autre n'écrit dans le clone d'une session.
# Codes : 0 commit fait et branche poussée ; 1 refus (message) ; 2 usage.
set -u
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "✗ pas dans un dépôt git"; exit 2; }
cd "$RACINE"
id="${1:-}"; resume="${2:-}"
[[ "$id" =~ ^[0-9]{3}-[0-9]{2,3}$ ]] && [ -n "$resume" ] || { echo "usage : commit-fiche-cloud.sh <id> \"<résumé>\""; exit 2; }
f=".orchestre/fait/$id.md"
[ -f "$f" ] || { echo "✗ $id n'est pas en fait/ (lance d'abord : node scripts/orchestre.mjs verifier $id, vert, puis la fiche passe en fait/)"; exit 1; }
branche="$(git rev-parse --abbrev-ref HEAD)"
case "$branche" in main|master|HEAD) echo "✗ branche « $branche » : travaille sur la branche de la session (claude/…), jamais sur main"; exit 1;; esac

# Les chemins du périmètre de la fiche qui existent (même lecture de l'en-tête que le script du PC).
chemins="$(node -e '
const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const m=t.match(/^perimetre:\s*\[(.*)\]/m);
const p=m?m[1].split(",").map(s=>s.trim().replace(/^["\x27]|["\x27]$/g,"").replace(/\/\*\*.*$/,"")).filter(Boolean):[];
console.log(p.filter(x=>fs.existsSync(x)).join("\n"))' "$f" | tr -d '\r')"
hors="$(echo "$chemins" | grep -E '^(\.\./|/|SaaS/)' || true)"
[ -n "$hors" ] && { echo "✗ $id : périmètre hors du dépôt ($hors) : cette fiche n'est pas faisable dans le cloud, laisse-la au PC (node scripts/orchestre.mjs liberer $id)"; exit 1; }

# La ligne de verdict de la fiche, rangée avec ses preuves (le PC la reportera dans verdicts.jsonl).
mkdir -p ".orchestre/preuves/$id"
if [ -f .orchestre/verdicts.jsonl ]; then
  ligne="$(grep "\"id\":\"$id\"" .orchestre/verdicts.jsonl | tail -1 || true)"
  [ -n "$ligne" ] && echo "$ligne" > ".orchestre/preuves/$id/verdict-cloud.jsonl"
fi
[ -s ".orchestre/preuves/$id/verdict-cloud.jsonl" ] || { echo "✗ $id : aucun verdict trouvé pour cette fiche dans .orchestre/verdicts.jsonl (relance verifier)"; exit 1; }
grep -q '"verdict":"PASS"' ".orchestre/preuves/$id/verdict-cloud.jsonl" || { echo "✗ $id : le dernier verdict n'est pas PASS"; exit 1; }

# Indexation : les chemins, la fiche, les preuves ; retrait de file/<id>.md s'il était suivi.
while IFS= read -r p; do [ -n "$p" ] && { git add -- "$p" || { echo "✗ add $p refusé"; exit 1; }; }; done <<<"$chemins"
git add -- "$f" ".orchestre/preuves/$id" || { echo "✗ add de la fiche ou des preuves refusé"; exit 1; }
retire_file=0
if git ls-files --error-unmatch ".orchestre/file/$id.md" >/dev/null 2>&1 && [ ! -f ".orchestre/file/$id.md" ]; then git rm -q --cached ".orchestre/file/$id.md" && retire_file=1; fi

# Garde de l'index : chaque chemin du périmètre, la fiche et ses preuves doivent être entièrement suivis et sans modification hors index.
restes="$( { echo "$chemins"; echo "$f"; echo ".orchestre/preuves/$id"; } | while IFS= read -r p; do [ -n "$p" ] && [ -e "$p" ] && { git ls-files --others --exclude-standard -- "$p"; git diff --name-only -- "$p"; }; done | sort -u)"
[ -n "$restes" ] && { echo "✗ $id : INDEX INCOMPLET, rien n'est commité (les fichiers restent indexés : ajoute ce qui manque, puis relance) :"; echo "$restes" | head -10 | sed 's/^/    /'; exit 1; }

nos=(); while IFS= read -r p; do [ -n "$p" ] && nos+=("$p"); done <<<"$chemins"
nos+=("$f" ".orchestre/preuves/$id")
[ "$retire_file" = 1 ] && nos+=(".orchestre/file/$id.md")

# Garde des imports (copie de celle du PC, maj.sh la recopie dans reprise-cloud/usine/) : un import qui vise un fichier absent de git casse le build Vercel.
GARDE="$ICI/../usine/garde-imports.mjs"
if [ -f "$GARDE" ]; then
  garde="$(node "$GARDE" --id="$id" -- "${nos[@]}")"; rc=$?
  [ $rc -ne 0 ] && { echo "$garde" | head -10; echo "✗ $id : rien n'est commité (garde des imports ; corrige, puis relance)"; exit 1; }
else
  echo "⚠ garde-imports.mjs absent : lance reprise-cloud/maj.sh sur le PC. Je continue, le crochet pre-commit (typecheck) reste là."
fi

avant="$(git rev-parse HEAD)"
git commit -q -m "$id : $resume

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- "${nos[@]}" 2>&1 | grep -E "❌|refusé|failed|error|régression|fatal" | head -5
if [ "$(git rev-parse HEAD)" = "$avant" ]; then echo "✗ $id : AUCUN commit (le crochet pre-commit a refusé : lis sa sortie en relançant git commit à la main)"; exit 1; fi
echo "✓ $(git log --oneline -1 | cut -c1-110)"
git push -q -u origin HEAD 2>&1 | tail -2
echo "→ branche « $branche » poussée. Ouvre (ou mets à jour) la PR vers main avec l'outil GitHub de la session ; le PC fusionne, puis : node reprise-cloud/outils/recevoir.mjs $id"
