---
name: juge-relais-continu
description: "Un juge qui vérifie un état à deux positions de défilement laisse passer un trou pendant la transition — échantillonner tout le parcours (tous les 150 px) et tester la visibilité réelle (elementFromPoint), pas IntersectionObserver"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-15T07:18:15.695Z
---

Le 15/09/2026, la tâche 019-01 (barre retenue de la démo Lestraque : un seul appel visible, le bouton du héros puis « Devis » dans la barre) a eu PASS au premier tour. Son juge, écrit par Claude Code, ne vérifiait que le haut de page, #prestations et #realisations. Les captures de contrôle, puis un relevé tous les 150 px, ont montré qu'aucun appel n'était visible de 150 à 1 650 px en 1440×900 : le héros est collant, le plateau noir le recouvre, et IntersectionObserver voit encore le bouton « à l'écran ».

**Why:** un relais, une transition ou une chorégraphie au défilement se juge sur tout le parcours, pas à ses extrémités. Et « dans l'écran » n'est pas « visible » : un élément collant peut être recouvert, ou transparent.

**How to apply:**
- Tout juge d'état lié au défilement échantillonne de 0 à au moins un écran après la fin de la zone chorégraphiée, par pas réguliers (150 px).
- Il définit « visible » comme : centre dans l'écran, `elementFromPoint` qui touche l'élément, et produit des opacités ≥ 0,2.
- La même définition est donnée à l'exécutant, pour que code et juge mesurent la même chose.
- Après un PASS, regarder des captures prises aux positions intermédiaires avant de publier.

Voir [[juge-capture-lui-meme]], [[preuve-vide-est-un-mensonge]], [[demo-v16-grille]].
