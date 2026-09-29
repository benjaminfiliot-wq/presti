#!/usr/bin/env bash
# maj.sh (v2, 29/09/2026) — rafraîchit reprise-cloud/ depuis le PC : mémoire, docs, usine, veille ; puis CAVIARDE et SCANNE.
# Usage (depuis presti/, sur le PC de Benj) :   bash reprise-cloud/maj.sh
# Puis relire la sortie du scan. S'il reste un ✗, retirer la ligne à la main et relancer le scan seul :
#   node reprise-cloud/outils/nettoyer.mjs --scan
# Enfin commiter CE DOSSIER SEUL (d'autres sessions écrivent dans le dépôt, ne jamais faire de commit nu) :
#   git add -- reprise-cloud && git commit -q -m "reprise-cloud : mise à jour du <date>" -- reprise-cloud && git push -q origin main
# Ce qui n'est PAS recopié : les journaux (*.log), les PID, l'état du moteur, les fichiers d'arrêt (ils décrivent le PC, pas le cloud),
# et tout ce qui touche à un projet arrêté (clipping, chaîne YouTube, OFM) ou à la vie privée de Benj.
# Les fichiers écrits à la main pour le cloud (LISEZ-MOI-D-ABORD.md, LIMITES-DU-CLOUD.md, outils/) ne sont PAS touchés par ce script.
set -e
cd "$(dirname "$0")/.."
R=reprise-cloud
M="${MEMOIRE_PC:-/c/Users/benja/.claude/projects/C--Users-benja-Documents-ofm/memory}"
OPS=../presti-ops
SAAS=../SaaS
EXCL='user-benj|ofm-agence|bac-amc|side-projects|channel-pivot|youtube-publishing|video-production-method|doc-montage|space-doc|clipforge|clipping|content-rewards|beatforge|loudnorm|delogo|voix-cache|tiktok-|saas-side-project'

for d in "$M" "$OPS/usine" "$OPS/veille" "$SAAS/Produit"; do [ -d "$d" ] || { echo "✗ dossier source introuvable : $d (ce script se lance sur le PC de Benj)"; exit 1; }; done

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/memoire" "$T/docs" "$T/usine" "$T/veille"

# 1. mémoire : toutes les fiches sauf celles des projets arrêtés / de la vie privée ; l'index est filtré de la même façon
for f in "$M"/*.md; do b=$(basename "$f"); [ "$b" = MEMORY.md ] && continue; echo "$b" | grep -Eq "$EXCL" && continue; cp "$f" "$T/memoire/"; done
grep -vE "$EXCL" "$M/MEMORY.md" > "$T/memoire/MEMORY.md"

# 2. docs de l'écosystème (le coffre SaaS n'est pas dans le cloud)
cp "$SAAS"/Produit/Ecosysteme-*.md "$SAAS/Produit/Prospection-Cadre-Legal-"*.md "$SAAS/Produit/Etude-Marche-"*.md \
   "$SAAS/Produit/Prompt-Codex-2026-09-15.md" "$SAAS/Produit/Session-2026-09-15-Lestraque-Vague-5.md" "$T/docs/"
cp "$SAAS/CLAUDE.md" "$T/docs/CLAUDE-coffre-SaaS.md"

# 3. usine et veille (moteur multi-IA, juges croisés, lanceurs) — sans journaux ni états du PC
( cd "$OPS/usine" && tar cf - --exclude='*.log' --exclude='*.pid' --exclude='moteur-etat.json' --exclude='moteur.stop*' \
    --exclude='ALERTE-*' --exclude='*.lock' --exclude='node_modules' . ) | ( cd "$T/usine" && tar xf - )
find "$OPS/veille" -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.md' -o -name '*.sh' \) -exec cp {} "$T/veille/" \;

# 4. bascule : on remplace les anciennes copies (les fichiers supprimés à la source disparaissent aussi)
rm -rf "$R/memoire" "$R/docs" "$R/usine" "$R/veille"
mv "$T/memoire" "$T/docs" "$T/usine" "$T/veille" "$R/"
echo "recopié : $(ls $R/memoire | wc -l) fiches de mémoire, $(ls $R/docs | wc -l) docs, usine et veille (sans journaux)."

# 5. caviardage (e-mails de personnes, téléphones, SIREN de tiers) puis scan
node "$R/outils/nettoyer.mjs" --caviarder
node "$R/outils/nettoyer.mjs" --scan || { echo "⛔ le scan a trouvé quelque chose : ne commite pas avant de l'avoir retiré."; exit 1; }
echo "✓ reprise-cloud est à jour et propre. Reste : relire git status -- reprise-cloud, puis le commit du dossier seul (voir l'en-tête)."
