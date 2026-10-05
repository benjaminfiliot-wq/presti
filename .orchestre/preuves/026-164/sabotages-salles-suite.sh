set -u
J=scripts/pilotage-ecran-qa.mjs
for v in ref s1 s2 s3; do rm -rf ../bst-sbw-$v; mkdir ../bst-sbw-$v; cp -r app lib proxy.ts ../bst-sbw-$v/; ls middleware.ts >/dev/null 2>&1 && cp middleware.ts ../bst-sbw-$v/
  sed -i 's/^  pilotage: true,.*/  pilotage: false,/' ../bst-sbw-$v/lib/flags.ts; done
# S1 : Échap ne ferme plus rien
sed -i "s/e.key === 'Escape'/e.key === 'EscapeX'/" ../bst-sbw-s1/app/controle/station/Panneaux.tsx
# S2 : plus aucune lecture a l'ouverture (la premiere lecture n'a lieu qu'a la premiere minuterie)
sed -i 's/^    void tour()$/    \/\/ void tour()/' ../bst-sbw-s2/app/controle/station/salles/lecture.ts*
# S3 : « Fermer » ne ferme plus
sed -i 's/data-fermer className="mc-fermer" onClick={onFermer}/data-fermer className="mc-fermer"/' ../bst-sbw-s3/app/controle/station/salles/Fenetre.tsx
for v in ref s1 s2 s3; do echo "== $v"; node $J --partie=salles-suite --racine=../bst-sbw-$v 2>&1 | grep -E "^(✅|❌) SB-|partie=salles-suite :" | cut -c1-230; done
