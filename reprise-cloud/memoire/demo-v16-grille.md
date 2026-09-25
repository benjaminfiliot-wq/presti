---
name: demo-v16-grille
description: "LA démo v16 (Atelier Lestraque) : un geste écrit en CSS peut être invisible — seule une comparaison d'images-clés par un juge indépendant l'attrape ; Next sert public/ sans barre finale (liens index.html) ; video-qa a un profil landing"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T11:24:59.784Z
---

Le 14/09/2026, la démo « Atelier Lestraque » (menuisier-agenceur fictif à Rennes, `public/sites-demo/lestraque/`) passait tout le juge site-qa (Lighthouse mobile 96/99, « Le geste » 4/4) et échouait pourtant la grille C1–C8 (`scripts/grille-qa.mjs`, notes d'un sous-agent indépendant sur `planche-refs.jpg` et `planche-demo.jpg`) : « quatre captures du héros identiques de 0,6 s à 8 s ». Le balayage de lumière, trop large, ne traversait l'écran que 1,5 s sur 7 et jamais aux instants capturés.

**Why :** un juge qui vérifie que l'animation EXISTE (classes, keyframes, reveal) ne voit pas si elle se VOIT. Et un juge qui a construit la démo note avec indulgence.

**How to apply :**
- Pour tout geste « ambiant » : mesurer la différence entre images-clés du héros (`scripts/demo-images-cles.mjs` puis diff de pixels ; au 2e essai 0,06–0,10 de différence moyenne, 45–57 % de pixels changés) avant de le déclarer fait.
- La grille se fait noter par un sous-agent qui n'a pas lu les notes antérieures, et qui re-note aussi les références (médianes différentes des miennes : C3 3, C5 2, C7 3).
- Les démos sont servies par Next depuis `public/` : `/sites-demo/x/` est redirigé (308) vers `/sites-demo/x` et les chemins relatifs cassent (styles.css en 404). Les liens internes visent `index.html` (`generer.mjs` → `liensIndex`), la landing lie `/sites-demo/lestraque/index.html`.
- `scripts/video-qa.mjs --profil=landing` : 16:9, muette, ≤ 1,5 Mo, même exigence sur le figé/l'énergie/les coupes — le profil réseaux (3 000 kbps + piste son) contredit « courte, muette, ≤ 1,5 Mo ».
- Photos d'atelier : la recherche plein texte (Commons, Openverse) ne ramène rien d'utilisable ; la recherche par **catégories** Commons (Workbenches, Wood shavings, Wood grain) oui. Openverse sert Flickr en 1024 px seulement.
- Design Rocket (compte Benj en Free Plan) et les prompts MotionSites premium sont derrière un paiement : ne rien cliquer, le dire (décision d'argent de Benj).
- Voir [[cerveau-site-v2]], [[orchestre-autonome]], [[juge-capture-lui-meme]].

**Suite du 14/09 (après-midi) :** trois passes de grille. 1) C1 4, C2 2, C8 2 (héros figé à l'œil). 2) balayage recadré + lueur + poussée : C2 4, C8 4, C1 reste 4 (« photo fixe »). 3) **révélation brut → fini** (un cercle montre l'escalier hélicoïdal dans la photo du rabot, bureau ≥ 1024 px seulement, suit la souris) : PASS 8/8, C7 5. Leçons : un effet qui se voit mais ne se lit pas (première révélation : tache brune floue, image étirée) est corrigé AVANT le verdict — poser l'image de l'ouvrage à droite et garder le cercle sur son centre ; un seul geste signature par photo (le balayage se retire quand la révélation est là) ; tout changement après un PASS annule le PASS (repasser le juge). Les vidéos libres d'atelier sur Commons (Carpentry 0x, Mondial des Métiers) sont inutilisables pour un héros (visages, machines, lumière crue).

**Performance instable (14/09, vers 13 h 45) :** l'accueil Lestraque passait à 97 puis tombait à 91–93 (TBT 0 à 317 ms sur le même build) — un seuil, pas un score. Lighthouse accusait `site.js`, mais la trace du fil principal (`scripts/trace-longues-taches.mjs <dossier> 3` : Playwright + CDP, mobile, CPU ×4) montrait des longues tâches faites de **Layout**, pas de script : la première mise en page d'une page longue (~300 ms) et une seconde complète à l'arrivée de la police de texte (~150 ms), aggravées par `text-wrap: balance` sur tous les h3. Correctifs : balance réservé aux h1/h2, police de texte en `font-display: optional` (la display reste swap + preload). Règle : mesurer au moins trois fois au repos avant de conclure, et tracer avant de corriger — la ligne des étapes « fautive » n'y était pour rien. Et une chaîne qui pousse s'arrête au premier FAIL (`&&`), sinon elle met en ligne une démo refusée.
