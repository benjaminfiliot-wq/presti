set -u
J="node scripts/station-claw3d-qa.mjs --partie=verite"
for v in s1 s2; do rm -rf ../bst-clb-$v; mkdir ../bst-clb-$v; cp -r app lib ../bst-clb-$v/; cp proxy.ts next.config.mjs tsconfig.json package.json ../bst-clb-$v/; done
# S1 : un agent SANS aucun changement marche quand meme (une marche sans evenement)
sed -i 's|if (connu \&\& connu.signature === signature) { connu.acteur = acteur; continue; }|if (connu \&\& connu.signature === signature) { connu.acteur = acteur; if (acteur.nom === "chef") this.partir(connu, acteur, { x: but.x + 32, y: but.y }, true); continue; }|' ../bst-clb-s1/app/controle/station/moteur/scene/StationPixelScene.ts
grep -c 'acteur.nom === "chef"' ../bst-clb-s1/app/controle/station/moteur/scene/StationPixelScene.ts
# S2 : la pause teleporte au Repos au lieu de marcher
sed -i "s/const direct = !avecMarche || !extras || extras.etat.reduit;/const direct = !avecMarche || !extras || extras.etat.reduit || acteur.motif === 'pause';/" ../bst-clb-s2/app/controle/station/moteur/scene/StationPixelScene.ts
grep -c "acteur.motif === 'pause'" ../bst-clb-s2/app/controle/station/moteur/scene/StationPixelScene.ts
for v in s1 s2; do echo "== $v"; uptime; $J --racine=../bst-clb-$v 2>&1 | grep -E "^(✅|❌) CL-|partie=verite" | cut -c1-360; done
