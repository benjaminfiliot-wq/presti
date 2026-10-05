# 026-150

ÉCHECS : message commit inspecté: faute non détectée pour GG-3
MU-3 : états des dépôts différents

| Juge | Faute | Critère | Verdict réel |
|---|---|---|---|
| media | détection déplacée après upload | MO-2 | FAIL MO-2 — 7 défaut(s) — consommerLimite( vient avant detecterTypeImage(corps · .upload( vient avant detecterTypeImage(corps · HEIC déclaré png → 415 mais .upload appelé avant le refus · AVIF déclaré jpg → 415 mais .upload appelé avant le refus · … |
| media | type fourni par ext | MO-3 | FAIL MO-3 — 3 défaut(s) — PNG déclaré webp : contentType image/webp au lieu de image/png · JPEG déclaré png : contentType image/png au lieu de image/jpeg · WebP déclaré jpg : contentType image/jpg au lieu de image/webp |
| media | HEIC accepté | MO-1 | FAIL MO-1 — 5/21 cas faux — ftyp heic : {"ok":true,"type":"image/jpeg","ext":"jpg"} au lieu de {"ok":false,"raison":"heic"} · ftyp heix : {"ok":true,"type":"image/jpeg","ext":"jpg"} au lieu de {"ok":false,"raison":"heic"} · ftyp hevc : {"ok":true,"type":"image/jpeg","ext":"jpg"} au lieu de {"ok":false,"raison":"heic"} · ftyp mif1 : {"ok":true,"type":"image/jpeg","ext":"jpg"} au lieu de {"ok":false,"raison":"heic"} · … |
| media | sharp ajouté | MO-5 | FAIL MO-5 — dépendances différentes de HEAD — dependencies : sharp ajoutée |
| instantane | push forcé | IQ-7 | FAIL IQ-7 — second passage en code 1 · aucune branche instantane-<date>-<HHMM> créée par le second passage (nouvelles : aucune) · le texte du script contient --force |
| instantane | deux exclusions exe retirées | IQ-2 | FAIL IQ-2 — outil.exe présent dans l'arbre |
| instantane | secrets non exclus | IQ-4 | FAIL IQ-4 — config/cles.txt présent dans l'arbre poussé · git grep trouve la valeur du faux secret dans le commit poussé · config/cles.txt absent de exclus dans le journal |
| instantane | index réel utilisé | IQ-3 | FAIL IQ-3 — git status --porcelain a changé · .git/index a changé (empreinte SHA-256) |
| instantane | contenu exclu écrit au journal | IQ-4 | FAIL IQ-4 — config/cles.txt absent de exclus dans le journal |
| garde | option C non retirée | GG-2 | FAIL GG-2 — 2/82 refus manqué(s) — [Bash] git -C ../presti restore x → code 0 · [PowerShell] git -C ../presti restore x → code 0 |
| garde | Remove-Item ordre unique | GG-2 | FAIL GG-2 — 1/82 refus manqué(s) — [PowerShell] Remove-Item app -Force -Recurse → code 0 |
| garde | message commit inspecté | GG-3 | aucune ligne attendue |
| garde | JSON invalide exception non absorbée | GG-4 | FAIL GG-4 — entrée vide → code 1 avec une trace de pile · JSON invalide → code 1 avec une trace de pile · tool_name Read → code 1 avec une trace de pile |
| garde | checkout force et arbre chemins permis | GG-2 | FAIL GG-2 — 6/82 refus manqué(s) — [Bash] git checkout HEAD app/page.tsx → code 0 · [PowerShell] git checkout HEAD app/page.tsx → code 0 · [Bash] git checkout -f main → code 0 · [PowerShell] git checkout -f main → code 0 · [Bash] git checkout --force main → code 0 · … |
| garde | Invoke-Expression iex non inspectés | GG-2 | FAIL GG-2 — 2/82 refus manqué(s) — [PowerShell] Invoke-Expression "git reset --hard" → code 0 · [PowerShell] iex 'git clean -fdx' → code 0 |
| garde | node eval non inspecté | GG-2 | FAIL GG-2 — 6/82 refus manqué(s) — [Bash] node -e "require('child_process').execSync('git reset --hard')" → code 0 · [PowerShell] node -e "require('child_process').execSync('git reset --hard')" → code 0 · [Bash] node --eval "require('child_process').spawnSync('git', ['clean', '-fd'])" → code 0 · [PowerShell] node --eval "require('child_process').spawnSync('git', ['clean', '-fd'])" → code 0 · [Bash] python -c "import os; os.system('git reset --hard')" → code 0 · … |
| garde | rm cached refusé | GG-3 | FAIL GG-3 — 2/34 permis refusé(s) — [Bash] git rm --cached secret.txt → code 2 « git-garde : commande refusée (règle git-rm-force)… » · [PowerShell] git rm --cached secret.txt → code 2 « git-garde : commande refusée (règle git-rm-force)… » |
| next | ancien export middleware rétabli dans proxy | N16-8 | FAIL N16-8 — pas de 'export async function proxy' |
| next | runtime edge | N16-8 | FAIL N16-8 — exporte un runtime, corps différent de middleware-reference.ts (au-delà de la tolérance station/.*) |
| next | tolérance admin non autorisée | N16-8 | FAIL N16-8 — corps différent de middleware-reference.ts (au-delà de la tolérance station/.*) |
| next | webpack retiré | N16-2 | FAIL N16-2 — next.config.mjs importe @serwist/next, script build = "next build" |
| next | suite build sans webpack | N16-9 | FAIL N16-9 — tout-verifier.mjs : npm-build=false, diff=0 ligne(s) ; qualite.yml : npm-build=true, diff=1 ligne(s) |
| next | autre ligne workflow modifiée | N16-9 | FAIL N16-9 — tout-verifier.mjs : npm-build=true, diff=1 ligne(s) ; qualite.yml : npm-build=true, diff=2 ligne(s) |
| next | headers synchrone | N16-11 | FAIL N16-11 — app/site/[slug]/page.tsx : headers() sans await |
