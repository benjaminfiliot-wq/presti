set -u
uptime
node scripts/station-claw3d-qa.mjs --partie=contexte 2>&1 | grep -E "^(✅|❌) CL-|station-claw3d" | cut -c1-420
uptime
echo "== sabotage : le reveil d'une scene detruite retire celui de la scene rebatie (le defaut que la verification a fait apparaitre)"
rm -rf ../bst-clr-s0; mkdir ../bst-clr-s0; cp -r app lib ../bst-clr-s0/; cp proxy.ts next.config.mjs tsconfig.json package.json ../bst-clr-s0/
sed -i 's/if (extras \&\& this.reveilMien \&\& extras.etat.reveiller === this.reveilMien) extras.etat.reveiller = null;/if (extras \&\& extras.etat.reveiller) extras.etat.reveiller = null;/' ../bst-clr-s0/app/controle/station/moteur/scene/StationPixelScene.ts
grep -c "if (extras && extras.etat.reveiller) extras.etat.reveiller = null;" ../bst-clr-s0/app/controle/station/moteur/scene/StationPixelScene.ts
node scripts/station-claw3d-qa.mjs --partie=contexte --racine=../bst-clr-s0 2>&1 | grep -E "^(✅|❌) CL-|station-claw3d" | cut -c1-420
