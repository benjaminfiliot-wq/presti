set -u
rm -rf ../bst-lg ../bst-lg-s1 ../bst-lg-s2
mkdir ../bst-lg && cp -r lib ../bst-lg/
cp -r ../bst-lg ../bst-lg-s1; cp -r ../bst-lg ../bst-lg-s2
echo "== reference"; node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules --racine=../bst-lg 2>&1 | grep -E "XP-1|SM-2|partie=modules :"
# S1 : aucune_vente ignoree
sed -i 's/const ventes = l.ventes ?? (l.aucune_vente === false ? 1 : 0)/const ventes = l.ventes ?? 0/' ../bst-lg-s1/lib/pilotage/experience.ts
echo "== S1 (aucune_vente ignoree)"; node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules --racine=../bst-lg-s1 2>&1 | grep -E "XP-1|partie=modules :"
# S2 : arret_le jamais servi
sed -i "s/arret_le: statut === 'en_cours' ? l.fin_prevue_le ?? null : null/arret_le: null/" ../bst-lg-s2/lib/pilotage/experience.ts
echo "== S2 (arret_le jamais servi)"; node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules --racine=../bst-lg-s2 2>&1 | grep -E "XP-1|partie=modules :"
echo "== temoin"; node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules --temoin 2>&1 | grep -E "XP-1|partie=modules :"
