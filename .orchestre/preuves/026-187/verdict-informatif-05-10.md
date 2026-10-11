· station-ecran-qa : ce poste (LAPTOP-6KDEHT8P) n'est pas l'usine ; les parties de rendu (reglages) sont relancées par scripts/usine.mjs executer
station-ecran-qa --partie=reglages — racine .
✅ CE-1 app/controle/station/moteur/ porte 25 source(s) dont entree.tsx ; Carte.tsx lit actif('stationCarte') et charge ./moteur/ ; lib/flags.ts présent (le juge lève pilotage et stationCarte dans une COPIE)
✅ CE-18 ?vue=reglages : un panneau de 480 px au bureau, une feuille de 390 px au téléphone, absent pour le rôle lecture
❌ CE-19 scénario gestes interrompu : locator.click: Timeout 20000ms exceeded.
❌ CE-20 deux salles dans un emplacement : le panneau ne dit pas pourquoi (« e thème est illisible Enregistrer Annuler Revenir au thème par défaut Historique version 3 ») ; un graphe coupé : le panneau ne dit pas « n'est plus reliée au reste » (« ci. Voir la procédure Enregistrer Annuler Revenir au thème par défaut Historique version 3 ») ; une couleur #RRGGBB ne s'applique pas sur .mc ()
✅ CE-29 thèmes station (colonnes), vaisseau (flottante) : leur mise en page sur data-mise-en-page et leur palette sur .mc seulement
station-ecran-qa --partie=reglages : FAIL — CE-19, CE-20
