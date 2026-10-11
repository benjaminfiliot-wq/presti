set -u
rm -rf ../bst-sbw && mkdir ../bst-sbw && cp -r app lib proxy.ts ../bst-sbw/ && (ls middleware.ts >/dev/null 2>&1 && cp middleware.ts ../bst-sbw/ || true)
# le drapeau pilotage est LEVE dans l'arbre depuis le 05/10 (demande de Benj) : le banc le veut baisse pour le lever lui-meme
sed -i 's/^  pilotage: true,.*/  pilotage: false,/' ../bst-sbw/lib/flags.ts
node scripts/pilotage-ecran-qa.mjs --partie=salles-suite --racine=../bst-sbw 2>&1
