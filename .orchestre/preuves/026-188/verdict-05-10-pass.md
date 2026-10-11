· station-ecran-qa : ce poste (LAPTOP-6KDEHT8P) n'est pas l'usine ; les parties de rendu (salles2) sont relancées par scripts/usine.mjs executer
station-ecran-qa --partie=salles2 --lot=a — racine .
✅ CE-1 app/controle/station/moteur/ porte 26 source(s) dont entree.tsx ; Carte.tsx lit actif('stationCarte') et charge ./moteur/ ; lib/flags.ts présent (le juge lève pilotage et stationCarte dans une COPIE)
✅ CE-21 le panneau du Commandement porte l'objectif, les missions, les succès, le compte rendu, les consignes reçues par le Chef et le niveau servis ; sans comptabilite : « hors périmètre », jamais 0
✅ CE-23 commandement : le résumé [data-resume-salle] sur chaque panneau, scrollWidth ≤ 390 à 390×844, captures bureau.jpg et telephone.jpg prises par le juge
station-ecran-qa --partie=salles2 --lot=a : PASS
