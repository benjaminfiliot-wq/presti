---
name: cerveau-site-v2
description: "Sites de démo Presti v2 (14/09/2026) : un générateur déterministe + un kit d'animation valent mieux que des agents ; les pièges rencontrés (photos à attribution inventée, scroll-behavior smooth, flou animé, picture sans hauteur)"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T09:08:39.810Z
---

Le 14/09/2026, Benj a jugé les neuf sites de démo v1 (produits par des agents Antigravity/Claude en une nuit) « très nuls, pires que ce qu'on avance via le site », alors que le juge `scripts/site-qa.mjs` les disait verts. Réponse : le **cerveau site v2** — `plans/cerveau-site-motifs.md` (la grammaire PromptedSite/MotionSites en valeurs exactes : easings, durées, sections, gestes de héros), `public/sites-demo/_kit/` (kit.css + kit.js + da.json par métier) et `public/sites-demo/generer.mjs` qui rend un site entier depuis `contenu.json` (textes extraits des v1, déjà jugés) + `attributions.json` + `site.json`, **sans aucun modèle de langage**. Le juge a gagné un bloc « Le geste » (mot à mot, reveal, rideau, marquee, étapes, accordéon, survols, reduced-motion, rien qui anime la mise en page) et trois mesures au rendu réel.

**Why :** un juge qui mesure la substance laisse passer un site sans caractère ; des agents sans direction artistique chiffrée produisent le thème par défaut ; et la seule façon d'avoir la même qualité demain sans quota IA est un générateur qu'on relit.

**How to apply :**
- Nouveau métier → une ligne dans `_kit/da.json` (voir motifs §4), photos via `node scripts/photos-demo.mjs chercher|prendre`, puis `node public/sites-demo/generer.mjs <metier>`, `node scripts/site-qa.mjs public/sites-demo/<metier>`, `node scripts/capture-site.mjs` et regarder.
- **Photos : la provenance se prouve.** 26 attributions sur 53 étaient inventées (Picsum + auteur Commons fictif). `scripts/photos-provenance.mjs` compare l'image locale à la vignette Commons (empreinte perceptuelle) et l'auteur à l'API. La recherche « Quality images » de Commons est belle mais hors sujet pour un métier du bâtiment : recherche plein texte (`--simple`) + choix à l'œil sur la planche numérotée.
- **Pièges de rendu mesurés :** `scroll-behavior: smooth` en CSS bloque tout défilement programmé (le juge et la capture ne voient jamais le bas de page — 19 reveals « cachés ») ; un `filter: blur` animé sur des spans sort du compositeur (TBT 500 ms sur mobile Lighthouse) ; lire `getBoundingClientRect` au chargement force une mise en page (822 ms attribués à site.js) ; un `<picture>` dans un cadre à `aspect-ratio` doit avoir `height: 100%` sinon l'image ne remplit que la moitié ; le h1 en spans doit garder de vrais espaces (le juge lit le texte sans balises).
- Le juge lit le h1 sans ses balises (corrigé le 14/09) — un h1 mot à mot est légitime.
- Second exécutant sans quota Antigravity : `scripts/executant.mjs` (Gemini CLI avec clé d'API, ou Qwen Code gratuit ; même prompt de tâche importé de `antigravity.mjs`). Le 14/09, la connexion Google gratuite de Gemini CLI est refusée par Google (UNSUPPORTED_CLIENT) : Gemini gratuit = Antigravity ; Qwen OAuth non tenté. Voir [[presti-orchestre-antigravity]], [[juge-capture-lui-meme]], [[preuve-vide-est-un-mensonge]], [[presti-state]].
