set -u
J=scripts/pilotage-ecran-qa.mjs
for v in ref s1 s2 s3; do rm -rf ../bst-st-$v; mkdir ../bst-st-$v; cp -r app lib proxy.ts ../bst-st-$v/; ls middleware.ts >/dev/null 2>&1 && cp middleware.ts ../bst-st-$v/
  sed -i 's/^  pilotage: true,.*/  pilotage: false,/' ../bst-st-$v/lib/flags.ts; done
# S1 : Carte.tsx importe le moteur STATIQUEMENT (phaser entre dans le paquet initial)
sed -i "s#^const Moteur = dynamic(() => import('./moteur/entree'), { ssr: false })#import MoteurStatique from './moteur/entree'\nconst Moteur = MoteurStatique as any#" ../bst-st-s1/app/controle/station/Carte.tsx
# S2 : Station.tsx importe le moteur statiquement par un effet de bord
sed -i "1,/^import/ s#^import#import './moteur/entree'\nimport#" ../bst-st-s2/app/controle/station/Station.tsx
# S3 : un accès aux données par un client qui n'est pas Array (ST-1)
sed -i "s#^const HEURES = Array.from(#const HEURES = ((globalThis as any).client).from(#" ../bst-st-s3/app/controle/station/reglages/Reglages.tsx
grep -c "moteur/entree" ../bst-st-s1/app/controle/station/Carte.tsx ../bst-st-s2/app/controle/station/Station.tsx; grep -c "client).from(" ../bst-st-s3/app/controle/station/reglages/Reglages.tsx
echo "== ref (partie station entiere)"; uptime; node $J --partie=station --racine=../bst-st-ref 2>&1 | grep -E "^(✅|❌) ST-|partie=station :" | cut -c1-260
for v in s1 s2 s3; do echo "== $v"; PILOTAGE_ECRAN_SCENARIOS=bureau node $J --partie=station --racine=../bst-st-$v 2>&1 | grep -E "^(✅|❌) ST-(1|18) |partie=station :" | cut -c1-260; done
