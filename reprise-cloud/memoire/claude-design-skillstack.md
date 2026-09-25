---
name: claude-design-skillstack
description: "Plugins 3D/animation web (Three.js, GSAP, R3F, Babylon, Lottie…) installés le 2026-09-14 : les 5 bundles seulement, audités propres ; pièges npm install et Blender"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 80cc957c-aa60-452a-9898-68b6b198a63a
  modified: 2026-09-14T11:41:29.608Z
---

Marketplace `claude-design-skillstack` (github.com/freshtechbro/claudedesignskills, tiers, pas
Anthropic), ajouté et installé le **2026-09-14** au commit `1da73feb`, scope user, à la demande de Benj.

**Installé : les 5 bundles uniquement** — `core-3d-animation` (Three.js, GSAP ScrollTrigger, R3F,
Motion/Framer, Babylon), `extended-3d-scroll` (A-Frame, Vanta/Zdog, PlayCanvas, PixiJS, Locomotive,
Barba), `animation-components` (React Spring, Magic UI/React Bits, AOS, Anime.js, Lottie),
`authoring-motion` (Blender, Spline, Rive, Substance 3D), `meta-skills` (patterns d'intégration,
modern web design). Soit 22 skills, 45 commandes, 27 agents.
**Coût mesuré** (`claude plugin details`) : **~2 830 tokens ajoutés à chaque session** (521 + 790 +
686 + 540 + 294), puis de ~2,7 k à ~8 k tokens par skill au moment où elle est invoquée (Babylon.js est
la plus lourde). Si le contexte devient serré : désactiver un bundle avec
`claude.exe plugin disable <bundle>@claude-design-skillstack`.
**Ne PAS installer les plugins individuels** (`threejs-webgl`, `gsap-scrolltrigger`…) : ils sont
déjà dans les bundles, les ajouter chargerait les mêmes skills deux fois.

**Audit avant installation** (workflow, 1 agent par bundle, 275 fichiers, 67 scripts lus en entier) :
aucun hook, aucun serveur MCP, aucun appel réseau dans les scripts Python (stdlib seulement), rien
d'encodé, pas d'injection dans les SKILL.md. Aucun point moyen ou plus. Notes à garder en tête :
- `extended-3d-scroll` → `barba-js/scripts/project_setup.py` lance **`npm install` par défaut**
  (subprocess) : passer `--no-install` si on ne veut pas télécharger de paquets.
- `authoring-motion` → `blender-web-pipeline/scripts/optimize_model.py` **réduit de 70 % tous les
  maillages** de la scène ouverte, sans filtre ni sauvegarde : jamais sur un .blend non sauvegardé.
- Les modèles web générés chargent des CDN en version flottante (`gsap@3`, `vanta@latest`,
  `aos@next`) sans SRI, et les `vite.config.js` de démarrage ont `host: true` (écoute sur tout le
  réseau). À corriger avant de livrer quoi que ce soit issu de ces modèles.
- Plusieurs SKILL.md citent des scripts ou références qui n'existent pas dans le dépôt.

**Chevauchement** : `hyperframes-animation` couvre déjà GSAP, Lottie, Three.js et Anime.js pour les
vidéos HyperFrames — pour une composition vidéo, c'est lui qui fait foi ; ces bundles-ci visent les
sites web.

Voir [[claude-cli-plugins-windows]] pour les commandes et le piège des chemins longs.
