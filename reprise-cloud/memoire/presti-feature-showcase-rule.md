---
name: presti-feature-showcase-rule
description: Chaque nouvelle fonctionnalité Presti livrée doit se montrer dans la vitrine de la landing (aujourd'hui DemoSequence, captures réelles)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-09-10T12:31:43.423Z
---

Quand une nouvelle fonctionnalité de Presti est livrée, elle doit apparaître dans la vitrine de la landing. Benj l'a demandé explicitement le 2026-08-28 en ajoutant Facturation.

**Why :** la vitrine est l'argument de vente central ; une feature absente de la vitrine = invisible pour le prospect.

**How to apply :** le support a changé — `app/FeatureShowcase.tsx` (onglets click-to-play, classes `.fs-*`, `FEATURES`, `fsr`/`useCount`) a été **supprimé** dans le commit `393f9ba` et remplacé par `app/DemoSequence.tsx` : **un scénario, pas un catalogue** — « Une demande arrive » en cinq scènes, chacune étant une **capture du vrai produit** prise au Playwright (`scripts/demo-captures.mjs`, compte de démo détruit ensuite). Donc : ajouter une scène au scénario et/ou une rangée `.lp-feat`, et régénérer les captures — ne rien dessiner à la main. Vérifier le rendu réel (skill `presti-verify`). Ne plus chercher `FeatureShowcase` ni `.fs-*`. Voir [[presti-state]] et [[benj-corrections-incrementales]].

**Leçon générale :** ne pas figer un nom de composant dans une mémoire ou une skill sans le revérifier — celui-ci a survécu deux semaines à sa propre suppression. Même piège que [[decomptes-dans-la-doc]].
