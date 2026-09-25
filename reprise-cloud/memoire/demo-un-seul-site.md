---
name: demo-un-seul-site
description: "Benj veut UN seul site de démo au meilleur niveau (Atelier Lestraque), pas dix démos métier — les neuf autres sont gelées depuis le 14/09"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T15:09:38.801Z
---

Le 14/09/2026 vers 17 h 10 (juste après le commit efda4a7 de la vague 1, pendant le premier lancement de la vague 2), Benj a écrit : « pas besoin d'en faire 10, seulement un est suffisant, ça te permet de te focus dessus pour un résultat encore meilleur avec tous les nouveaux skills ; continue les vagues mais que sur un seul site ».

**Why:** l'effort dispersé sur dix démos (garde-fous de non-régression, drapeaux da--*, régénération --tous, juges sur d'autres métiers) ralentit et dilue ; ce qui compte pour lui, c'est UN site qui atteint le haut du panier MotionSites.

**How to apply:** toutes les retouches visent `public/sites-demo/lestraque/` seul. Les neuf démos métier (carreleur, chauffagiste, couvreur, electricien, macon, menuisier, peintre, plombier, serrurier) restent telles qu'elles sont en ligne (commit efda4a7) : ne plus les régénérer, ne plus les juger, ne plus exiger qu'elles ne régressent pas. Le générateur peut prendre des chemins propres à Lestraque ; on le regénéralisera plus tard à partir de ce site. Utiliser les agents spécialisés des plugins (design web moderne, GSAP ScrollTrigger…) pour exécuter. Voir [[demo-niveau-benj]], [[claude-design-skillstack]].
