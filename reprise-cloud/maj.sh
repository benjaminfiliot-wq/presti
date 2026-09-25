#!/usr/bin/env bash
# Rafraîchit reprise-cloud/ depuis le PC (mémoire Presti, docs de l'écosystème, usine, veille), puis scanne les secrets.
# Usage (depuis presti/) : bash reprise-cloud/maj.sh   — puis relire le scan et commiter.
set -e
R=reprise-cloud; M=/c/Users/benja/.claude/projects/C--Users-benja-Documents-ofm/memory
EXCL='user-benj|ofm-agence|bac-amc|side-projects|channel-pivot|youtube-publishing|video-production-method|doc-montage|space-doc|clipforge|clipping|content-rewards|beatforge|loudnorm|delogo|voix-cache'
rm -rf $R/memoire; mkdir -p $R/memoire $R/docs $R/usine $R/veille
for f in $M/*.md; do b=$(basename "$f"); [ "$b" = MEMORY.md ] && continue; echo "$b" | grep -Eq "$EXCL" && continue; cp "$f" $R/memoire/; done
grep -vE "$EXCL" $M/MEMORY.md > $R/memoire/MEMORY.md
cp ../SaaS/Produit/Ecosysteme-*.md ../SaaS/Produit/Prompt-Codex-2026-09-15.md ../SaaS/Produit/Session-2026-09-15-Lestraque-Vague-5.md $R/docs/
cp ../SaaS/CLAUDE.md $R/docs/CLAUDE-coffre-SaaS.md
cp -r ../presti-ops/usine/. $R/usine/
find ../presti-ops/veille -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.md' -o -name '*.sh' \) -exec cp {} $R/veille/ \;
echo "scan (préfixes cités et clés factices = faux positifs ; toute vraie clé = NE PAS COMMITER) :"
grep -roE 'sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|re_[A-Za-z0-9]{20,}|whsec_[A-Za-z0-9]{10,}|BEGIN [A-Z ]*PRIVATE KEY' $R .orchestre/brouillons-ecosysteme | awk -F: '{print $1": "substr($2,1,14)"…"}' || echo "aucun motif"
