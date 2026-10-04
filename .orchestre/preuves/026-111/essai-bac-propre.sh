#!/usr/bin/env bash
# 026-111 : jugement de la station dans l'etat commite (HEAD) au BANC : racine = worktree detache de HEAD (sans les travaux non commites
# d'autres fiches), sans .env.local, sans compte, sans reseau. Bac jetable de l'usine seulement.
set -u
cd "$(dirname "$0")/.."
case "$PWD" in /home/usine/bacs/*) ;; *) echo "refus : pas un bac jetable de l'usine ($PWD)"; exit 2 ;; esac
R="/tmp/racine-111-$$"
git worktree add --detach "$R" HEAD >/dev/null 2>&1 || { echo "worktree impossible"; exit 3; }
[ -d node_modules ] && ln -s "$PWD/node_modules" "$R/node_modules"
echo "banc : racine $R, base $(git -C "$R" rev-parse HEAD)"
node scripts/pilotage-ecran-qa.mjs --partie=station --racine="$R"; rc=$?
echo "code du juge au banc : $rc"
(cd "$R" && npm run typecheck 2>&1 | tail -3; echo "code du typecheck : $?")
git worktree remove --force "$R" >/dev/null 2>&1
exit $rc
