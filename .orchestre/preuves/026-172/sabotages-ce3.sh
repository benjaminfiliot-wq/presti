set -u
uptime
echo "== claw3d verite,contexte (racine reelle, usine au calme)"
node scripts/station-claw3d-qa.mjs --partie=verite,contexte 2>&1 | grep -E "^(✅|❌) CL-|station-claw3d" | cut -c1-300
for v in s1 s2; do rm -rf ../bst-ce3-$v; mkdir ../bst-ce3-$v; cp -r app lib ../bst-ce3-$v/; cp proxy.ts next.config.mjs tsconfig.json package.json ../bst-ce3-$v/; done
# S1 : la boucle de Phaser ne s'endort plus jamais
sed -i 's/if (this.calme >= IMAGES_DE_CALME) this.game.loop.sleep();/\/\/ sabotage : plus de sommeil/' ../bst-ce3-s1/app/controle/station/moteur/scene/StationPixelScene.ts
grep -c "sabotage : plus de sommeil" ../bst-ce3-s1/app/controle/station/moteur/scene/StationPixelScene.ts
# S2 : une animation CSS infinie sur la couche des acteurs
printf '\n@keyframes sabotage { from { opacity: 1 } to { opacity: 0.99 } }\n[data-acteurs] { animation: sabotage 1s infinite alternate; }\n' >> ../bst-ce3-s2/app/controle/station/moteur/acteurs/acteurs.css
for v in s1 s2; do echo "== $v"; node scripts/station-ecran-qa.mjs --partie=verite --racine=../bst-ce3-$v 2>&1 | grep -E "^(✅|❌) CE-3 |station-ecran-qa" | cut -c1-300; done
