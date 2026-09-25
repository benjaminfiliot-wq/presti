---
name: hyperframes-en-local
description: "HyperFrames rend des vidéos en local et gratuitement via son CLI — le MCP hébergé est fermé aux agents, mais ce n'est pas un blocage"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-10T09:43:13.549Z
---

Vérifié le **2026-09-10** sur Presti. Le connecteur MCP *HyperFrames by HeyGen* refuse `compose` et
`render_video` aux agents CLI/IDE (« disabled for local CLI/IDE agents ») — mais **le CLI, lui,
fonctionne, et il ne coûte rien** :

```bash
npx --yes hyperframes@0.8.33 check     # dans le dossier du projet
npx --yes hyperframes@0.8.33 render --quality high --output out.mp4
```

Un projet = **un dossier avec `index.html`** (pas un fichier dans `compositions/` : `check` répond
« No composition found »), plus `hyperframes.json`, plus un dossier `assets/` **à l'intérieur** du
projet — un `../assets/` se rend mais renvoie 404 dans Studio.

Mesuré : 785 images en 1 min 14, 1080 × 1920, ~3 100 kbps. **Zéro appel IA.** Les polices Google
(Bricolage Grotesque, Hanken Grotesk) sont récupérées et mises en cache automatiquement, avec des
`@font-face` déterministes injectés — inutile de les inliner en base64.

## Ce que `check` trouve et qu'on ne verrait pas

- `missing_local_asset` — **le rendu saute une capture absente en silence** et sort une vidéo à trou.
- `gsap_repeated_fromto_without_baseline` — deux `fromTo` sur la même cible : GSAP applique les
  valeurs de départ du **dernier** à l'écriture (`immediateRender`), pas au moment du tween, et le
  plan s'ouvre sur une image fausse. Remède : `immediateRender: false` dès la deuxième écriture.
- `duplicate_media_discovery_risk` — deux `<img>` de même source sans `data-start` propre.
- Un débordement volontaire se déclare avec `data-layout-allow-overflow="true"`.

## Et ce que `check` ne trouve pas

Le premier rendu de Presti passait **0 erreur, 0 avertissement, contraste 18/18 WCAG AA** avec deux
plans ratés : une capture large agrandie 5,4 × (floue et coupée) et un texte à 52 % de la largeur
utile. **Il faut extraire les images et les regarder.** Voir [[presti-guiding-videos]].
