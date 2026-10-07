---
id: 025-resolution-identifiants
type: test
objectif: Résoudre globalement un identifiant exact avant les préfixes et refuser les ambiguïtés pour empêcher un verdict attribué à une autre fiche
perimetre: [scripts/orchestre.mjs, ../orchestre/bin/orchestre.mjs, .orchestre/preuves/025-resolution-identifiants/**, ../presti-ops/resolution-1007/**]
interdit: [scripts/juges-025-mutations.mjs, scripts/*-qa.mjs, scripts/fixtures/**, app/**, lib/**, supabase/**, .orchestre/decisions.md]
verifier: node C:/Users/benja/Documents/presti-ops/resolution-1007/test-resolution.mjs
budget: { fichiers: 8, minutes: 30 }
preuve: CLI réelles sur projets jetables pour exact en-cours vs préfixe fait, inverse, unique, ambigu, double exact et inexistant ; source canonique et vendor SHA identiques
executant: codex
---

Correction mécanique autorisée par Benjamin et déléguée par root : la commande025-10 a exécuté la fiche025-10-preuve-crieur par collision de préfixe. Garder ce journal comme preuve d'incident ; aucun verdict historique réécrit à la main. Source canonique identifiée par config.source et README : ../orchestre/bin/orchestre.mjs. Sauvegardes et tests jetables OPS avant modification ; aucun juge ni fichier étranger modifié, aucune API payante ni push. Nouveau verdict025-10 seulement via sa vraie commande, après bail canonique acquis et budgetdistinct.
