---
name: benj-corrections-incrementales
description: "Quand Benj demande des corrections, corriger l'existant en incrémental — ne JAMAIS tout supprimer et relancer"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5909abae-0d81-4735-a013-dd539e3913ac
---

Quand Benj envoie une liste de corrections sur un livrable (vidéo, montage, pipeline) : **corriger uniquement ce qui est fautif, jamais tout raser pour relancer de zéro.**

**Why:** sur la vidéo Chicago 20 min, il a envoyé 9 puis 7 corrections. J'ai supprimé `assets.json` (185 archives déjà validées) + le cache d'images, et relancé le sourcing complet — alors que 5 des 7 corrections (plein cadre, Ken Burns, cartouches, typewriter, cartons) étaient **du rendu pur** et ne touchaient pas aux images. Ça a coûté ~1h pour rien. Sa réaction : *"recommence pas tout juste corrige simplement t'es bete"* puis *"c'est beaucoup trop long... depeche toi putain"*. Il valorise la vitesse et l'incrémental bien plus que l'exhaustivité d'une refonte.

**How to apply:**
- Avant toute suppression : demander « cette correction touche-t-elle les données ou juste le rendu ? ». Rendu → ne toucher qu'au script de rendu et re-render.
- Si les données sont partiellement fautives : ne re-traiter **que les entrées fautives** (les scripts sont resumables — s'appuyer dessus), garder le reste.
- Ne jamais `rm` un artefact coûteux (assets sourcés, cache, clips) sans que ce soit strictement nécessaire — et le dire avant.
- Optimiser la vitesse dès le départ sur ce genre de pipeline : cache des réponses API, test sur vignette avant download plein format, sources interrogées en paresseux. (Voir [[doc-montage-ffmpeg-pipeline]].)
- Éviter les micro-benchmarks à répétition quand il attend : lancer et laisser tourner.
