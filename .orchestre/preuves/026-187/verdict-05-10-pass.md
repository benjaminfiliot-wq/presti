· station-ecran-qa : ce poste (LAPTOP-6KDEHT8P) n'est pas l'usine ; les parties de rendu (reglages) sont relancées par scripts/usine.mjs executer
station-ecran-qa --partie=reglages — racine .
✅ CE-1 app/controle/station/moteur/ porte 25 source(s) dont entree.tsx ; Carte.tsx lit actif('stationCarte') et charge ./moteur/ ; lib/flags.ts présent (le juge lève pilotage et stationCarte dans une COPIE)
✅ CE-18 ?vue=reglages : un panneau de 480 px au bureau, une feuille de 390 px au téléphone, absent pour le rôle lecture
✅ CE-19 aperçu sans PUT, Enregistrer : un PUT avec la version lue, Annuler revient à la version enregistrée, thème par défaut, Historique de 10 versions, Rétablir en fait une nouvelle, un 409 affiche « modifié ailleurs : recharge »
✅ CE-20 la réservée déplacée, deux salles dans un emplacement et un graphe coupé sont refusés avec leur raison ; une couleur #RRGGBB se pose sur .mc seulement
✅ CE-29 thèmes station (colonnes), vaisseau (flottante) : leur mise en page sur data-mise-en-page et leur palette sur .mc seulement
station-ecran-qa --partie=reglages : PASS
