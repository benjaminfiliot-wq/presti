set -u
J=scripts/pilotage-ecran-qa.mjs
for v in ref s1 s2; do rm -rf ../bst-ex-$v; mkdir ../bst-ex-$v; cp -r app lib proxy.ts ../bst-ex-$v/; ls middleware.ts >/dev/null 2>&1 && cp middleware.ts ../bst-ex-$v/; done
F=app/controle/station/salles/Experience.tsx
# S1 : le texte servi disparait pour une experience arretee seule
sed -i 's|<p className="mc-texte-exact mc-experience-texte" data-experience-texte>{v.texte}</p>|{v.statut !== "arretee" ? <p className="mc-texte-exact mc-experience-texte" data-experience-texte>{v.texte}</p> : null}|' ../bst-ex-s1/$F
# S2 : la progression perd son aria-valuenow
sed -i 's| aria-valuenow={v.jour}||' ../bst-ex-s2/$F
for v in s1; do echo "== $v"; node $J --partie=experience --racine=../bst-ex-$v 2>&1 | grep -E "^(✅|❌) EX-|partie=experience :" | cut -c1-200; done
