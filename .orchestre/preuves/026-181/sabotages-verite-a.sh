set -u
J="node scripts/station-claw3d-qa.mjs --partie=verite"
for v in ref s1 s2; do rm -rf ../bst-cl-$v; mkdir ../bst-cl-$v; cp -r app lib ../bst-cl-$v/; cp proxy.ts next.config.mjs tsconfig.json package.json ../bst-cl-$v/; done
# S1 : la position du sprite depend d'une donnee (la couleur servie) : « un chiffre est peint dans le decor » doit etre vu par CL-8
sed -i 's/p.image.setPosition(Math.round(x), Math.round(y));/p.image.setPosition(Math.round(x) + (p.acteur.couleur.length % 3), Math.round(y));/' ../bst-cl-s1/app/controle/station/moteur/scene/StationPixelScene.ts
grep -c "couleur.length" ../bst-cl-s1/app/controle/station/moteur/scene/StationPixelScene.ts
# S2 : l'ecran d'une AUTRE salle que l'Experience parle
sed -i "s|dire(bloc(garde(\`ecran:\${salle}\`), () => el('span', { 'data-ecran': salle }, couche), () => null), '—')|dire(bloc(garde(\`ecran:\${salle}\`), () => el('span', { 'data-ecran': salle }, couche), () => null), salle === 'recettes' ? 'FERMÉE · R13' : '—')|" ../bst-cl-s2/app/controle/station/moteur/acteurs/index.ts
grep -c "salle === 'recettes'" ../bst-cl-s2/app/controle/station/moteur/acteurs/index.ts
for v in ref s1 s2; do echo "== $v"; uptime; $J --racine=../bst-cl-$v 2>&1 | grep -E "^(✅|❌) CL-|partie=verite" | cut -c1-330; done
