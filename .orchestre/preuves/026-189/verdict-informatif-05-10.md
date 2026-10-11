· station-ecran-qa : ce poste (LAPTOP-6KDEHT8P) n'est pas l'usine ; les parties de rendu (salles2) sont relancées par scripts/usine.mjs executer
station-ecran-qa --partie=salles2 --lot=b — racine .
✅ CE-1 app/controle/station/moteur/ porte 26 source(s) dont entree.tsx ; Carte.tsx lit actif('stationCarte') et charge ./moteur/ ; lib/flags.ts présent (le juge lève pilotage et stationCarte dans une COPIE)
✅ CE-22 audience, securite, presti, observatoire, repos, ecommerce ouvrent leur panneau ; refusées : « hors périmètre », jamais 0 ; aucun nom de personne ; Presti : un nombre de tickets ; l'Observatoire agrège par département ; Salle de repos : « Reprendre », jamais « bientôt » ; E-commerce : « Branche réservée : rien n'est construit. », sans chiffre ni bouton
✅ CE-23 audience, securite, presti, observatoire, repos, ecommerce : le résumé [data-resume-salle] sur chaque panneau, scrollWidth ≤ 390 à 390×844, captures bureau.jpg et telephone.jpg prises par le juge
station-ecran-qa --partie=salles2 --lot=b : PASS
