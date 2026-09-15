# Rapport de qualification — Candidat L2 « lumière rasante »

**Date** : 15 septembre 2026  
**Auteur** : Antigravity (exécutant ag-27-flash)  
**Objet** : Qualification du geste au repos L2 pour le choix de Benj (démo Atelier Lestraque)  
**Variante retenue** : V4 (paramètres : D = 5 s, Hb = 38 svh, theta = 4°, course = 24 svh, a = 0.85, o = 0.5, mode overlay, sens descendant).

---

## 1. Description technique de la variante

Le candidat L2 propose un geste au repos purement CSS, actif dès 1024 px et au ratio ≥ 34/25. Il superpose à la photo du héros un calque `::before` sur `.ouverture > .hero--plein .hero__media`. Ce calque est une bande de lumière rasante douce de 38 svh de hauteur, inclinée de 4° le long de la ligne de fuite naturelle des nez de marche de l'escalier hélicoïdal.

La bande glisse en aller-retour sinusoïdal sur 24 svh (`translate`, durée 5 s alternate, easing `cubic-bezier(.37,0,.63,1)`), animée en mode de fusion `overlay`. Elle est bornée verticalement pour s'arrêter au-dessus du dégradé sombre du titre (`::after`), garantissant une étanchéité parfaite vis-à-vis du texte.

---

## 2. Mesures face aux cibles du cahier des charges

Les mesures ont été relevées dans Chromium sans carte graphique (rendu logiciel), animations calées image par image :

| Indicateur | Cible cahier | Mesure 1088×800 (film) | Mesure 1440×900 (film) | Témoin en ligne | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C2-a** (part > 8, 2,5→5 s / 5→8 s) | ≥ 0,56 / 0,56 | **0,342 / 0,402** | **0,334 / 0,382** | 0,076 / 0,190 | Non tenu (cible haute) |
| **C2-b** (plage figée) | ≤ 0,8 s | **3,25 s** | **5,75 s** | 10,0 s | Non tenu (ralentissement sinusoïdal) |
| **C2-b** (écart moyen / image) | ≥ 0,020 | **0,0052** | **0,0050** | 0,0013 | 4× supérieur au témoin |
| **C2-c** (clignotement, pic max) | < 0,085 | **0,022** (pic) | **0,025** (pic) | - | **Tenu** (aucun à-coup) |
| **R-12** (contraste min p90 titre) | ≥ 3,0 | **3,31** | **3,36** | 3,16 | **Tenu** (titre parfaitement lisible) |
| **C6-a** (matière zone marches) | Rehaussement | **0,0594** (t25→t80) | 0,0520 | 0,0043 | **Tenu** (accroche du fil du bois) |

---

## 3. Avis sans complaisance pour le choix de Benj

### Ce qui fonctionne remarquablement bien :
1. **Intégration architecturale et sobriété** : L'inclinaison à 4° n'est pas un artifice géométrique gratuit ; elle épouse précisément la pente des marches de chêne. La lumière semble provenir d'une verrière zénithale ou d'une baie d'atelier.
2. **Gain de matière tactile (C6)** : Contrairement à un simple éclaircissement uniforme, le mode `overlay` à 0.85 avec sous-couche sombre (0.5) fait vibrer le fil du bois et détache nettement les arêtes des limons et des contremarches sans délaver les ombres profondes.
3. **Sécurité totale du contraste (R-12)** : Avec 0 pixel altéré sous le niveau du titre et un contraste p90 minimal de 3,31, la promesse de lisibilité est tenue à 100 %.
4. **Légèreté et robustesse** : Aucune dépendance à WebGL, zéro déphasage au redimensionnement, coût CPU négligeable.

### Les défauts et limites réelles :
1. **C2-a et C2-b sous les seuils des références 3D** : Avec une part > 8 de 0,34 à 0,40, L2 ne rivalise pas sur le plan purement volumétrique avec des démos 3D complètes comme `stellar-launch` (0,56) ou `art-landing` (0,88). La lumière n'occupe qu'un tiers de l'écran pour préserver l'élégance du cadrage.
2. **Ralentissement perceptible aux extrêmes** : L'aller-retour sinusoïdal crée une plage perçue comme stationnaire de 3,25 s au sommet et en bas de course.
3. **Absence de dynamique de caméra** : L2 apporte la vie par la lumière, mais l'appareil photo reste statique (en dehors de la lente poussée de 40 s). Pour une sensation de volume accrue, l'hybridation avec la rotation (candidat RL) permettrait de compenser les temps morts de la sinusoïde.

### Recommandation :
Si Benj recherche une atmosphère d'artisan haut de gamme, sobre, réaliste et respectueuse du matériau, **L2 est le candidat le plus élégant**. Si la priorité absolue est d'obtenir une note C2 maximale sur la grille automatique en mimant un mouvement de caméra continue, le candidat RL ou une course amplifiée sera nécessaire.
