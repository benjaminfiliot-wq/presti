# Défaut trouvé le 05/10 (hors périmètre de 026-188 et 026-189) : la carte recouvre les panneaux quand `stationCarte` est levé

Mesure (diagnostic sur l'usine, copie construite par le juge, carte levée, `?salle=commandement` posé) : le panneau `[data-salle-panneau="commandement"]` est dans le DOM, visible (opacity 1, z-index 40, 760×752 à 320,92), mais `document.elementFromPoint` au centre du panneau rend un élément de la carte : le cadre `div.mc-carte` est `position: fixed; z-index: 100; inset: 0` (computed). C'est pourquoi `bureau.jpg`, pris par le juge, montre la carte et la liste des salles et pas le panneau ; au téléphone (carte absente de l'onglet) le panneau se voit.

Cause : `app/controle/station/vues/vues.css` (026-113, pas encore commité) pose `.mc [data-vue] { position: fixed; inset: 0; z-index: 100; background-color: rgb(10,12,17); … }` : le sélecteur d'attribut attrape aussi le cadre de la carte, sur lequel la caméra (026-182, `moteur/camera/index.ts`) pose `data-vue="ensemble"` ou `data-vue="zoom"`.

Correction d'une ligne, dans la fiche 026-113 : remplacer `.mc [data-vue]` par `.mc [data-vue="missions"], .mc [data-vue="succes"], .mc [data-vue="aide"]` (et tout autre sélecteur `[data-vue…]` de vues.css) ; ou renommer l'attribut de la caméra. À faire AVANT de lever `stationCarte` : aujourd'hui (drapeau baissé) la carte est le cadre d'attente, sans `data-vue`, rien n'est recouvert.

Non touché ici : vues.css n'est ni dans le périmètre de 026-188 ni de 026-189, et appartient à une fiche en cours d'une autre session.
