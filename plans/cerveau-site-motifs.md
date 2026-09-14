# Cerveau site v2 — la bibliothèque de motifs (ce que PromptedSite et MotionSites nous ont appris)

Écrit le 14/09/2026, après le verdict de Benj sur les démos v1 : « très nul, pire que ce qu'on avance via le site ». Les sites v1
étaient propres — juge vert, Lighthouse 95, textes écrits — mais **sans geste** : un thème clair, une photo, des cartes, un reveal
timide. Le juge mesurait la substance, pas le métier de design. Ce document fixe ce qu'un site « niveau MotionSites » contient,
en valeurs exactes, et comment le kit (`public/sites-demo/_kit/`) les porte. Il sert à trois choses : générer les démos sans
IA (`generer.mjs`), écrire la direction artistique d'un nouveau métier (`_kit/da.json`), et juger (`scripts/site-qa.mjs`, bloc
« Le geste »).

Sources étudiées (prompts gratuits, lus via leurs connecteurs) : PromptedSite `verdant-spine-clinic-h66`, `voltline-automation-h60`,
`viktor-oddy-landing` ; MotionSites `vision-reveal` (code complet). Rien n'est recopié : les motifs sont réécrits en CSS/JS maison,
sans framework, sans police tierce, sans requête externe.

## 1. La forme d'un prompt de design (PromptedSite) — et ce qu'on en garde

Un prompt PromptedSite a toujours la même ossature. C'est cette ossature qui fait la différence avec « fais-moi un site » :

| Bloc du prompt | Ce qu'il fixe | Chez nous |
|---|---|---|
| **Aesthetic identity** — deux ou trois mots (« bone & volt », « verdant clinical ») et une phrase de ton | l'intention avant les pixels | `da.json` : `label`, la ligne du métier dans `cerveau-site.md` §3 |
| **Palette** — 5 à 7 couleurs nommées par rôle (canvas, ink, accent, muted, line), en valeurs exactes | jamais « bleu », toujours `#1E6FA8` | `--fond --fond-2 --encre --encre-2 --accent --accent-texte --ligne` |
| **Typography** — une display, une texte, une mono pour les étiquettes ; tailles fluides `clamp()`, approche négative sur les titres, `text-wrap: balance` | la hiérarchie | `--police-display --police-texte`, `.mono`, `h1{clamp(2.6rem,6.4vw,5.6rem)}` |
| **Section breakdown** — 8 à 10 sections nommées, dans l'ordre, chacune avec son gabarit (grille, sticky, marquee, bento, accordéon) | le rythme de la page | §3 ci-dessous, `generer.mjs → genre()` |
| **Motion spec** — les easings et durées, le reveal au défilement, les survols, le marquee, le respect de `prefers-reduced-motion` | le mouvement, en chiffres | §4, `kit.css` / `kit.js` |
| **Responsive** — composé mobile d'abord, ce qui change à 768/960 px (rail → bento, burger → liens) | le mobile n'est pas une version dégradée | `kit.css` : points de rupture 700/760/900/960/1024 |
| **Deliverable** — fichiers, polices auto-hébergées, aucune dépendance, performance | ce qui est livré | `cerveau-site.md` §6 (budget) et §8 (livrer) |

## 2. Les motifs de mouvement (MotionSites, PromptedSite) — valeurs et classes

| Motif (nom du glossaire) | Valeurs retenues | Classe du kit |
|---|---|---|
| **Rideau d'ouverture** — dix cases (deux rangées de cinq) qui glissent vers le haut et le bas, décalées de 50 ms, puis disparaissent | `.9s cubic-bezier(.96,-.02,.38,1.01)`, délais 0/.05/.1/.15/.2 s, `opacity` à 1.3 s ; **une fois par session** (`sessionStorage`), jamais sans JS, jamais en mouvement réduit | `.splash` |
| **Mot à mot** — le h1 apparaît mot par mot : flou 8 px + 0,45 em vers le haut → net | `.75s cubic-bezier(.16,1,.3,1)`, départ .45 s, +60 ms par mot (`--i`) ; les mots sont dans le HTML (pas de CLS) | `.mot` |
| **Ken Burns du héros** — la photo passe de 1,1 à 1 | `2.2s cubic-bezier(.16,1,.3,1)` sur la propriété `scale` (la parallaxe utilise `translate`, pas de conflit) | `.hero__media img` |
| **Parallaxe légère** — la photo du héros descend à 16 % du défilement, bureau seulement | `requestAnimationFrame`, `translate`, borné à la hauteur de l'écran | `kit.js` |
| **Reveal au défilement** — 30 px + opacité, une fois, cascade par index | `.95s cubic-bezier(.16,1,.3,1)`, `transition-delay: calc(var(--i)*90ms)`, `IntersectionObserver` seuil .12, marge -6 % | `.reveal`, `.reveal.vu` |
| **Bouton pilule** — texte + cercle accent ; au survol le bouton monte de 2 px, le cercle tourne de 45° (la flèche ↗ devient →) ; à l'appui, 0,97 | `.4s cubic-bezier(.16,1,.3,1)` | `.bouton`, `.bouton__cercle` |
| **Marquee** — prestations et communes qui défilent, pause au survol, deux copies pour la boucle exacte | `36s linear infinite`, `translateX(-50%)` | `.defile` |
| **Cartes** — montée de 6 px, ombre en couches, halo radial qui suit le pointeur (`--mx/--my`) | `.55s cubic-bezier(.16,1,.3,1)` ; halo `radial-gradient(520px …)` à 16 % d'accent | `.carte` |
| **Galerie bento** — rail à défilement horizontal sur mobile (`scroll-snap`), grille 6 colonnes au-delà de 900 px (4-2-2 / 2-2-4), zoom 1,05 au survol | `1.1s cubic-bezier(.16,1,.3,1)` | `.galerie` |
| **Panneau collant + ligne qui avance** — titre qui reste, étapes à droite, une ligne accent qui monte avec le défilement, le point s'allume quand l'étape est vue | `--avancee` calculée en JS, `height` de la ligne ; point `.4s` | `.etapes` |
| **Grands liens** — les communes en display, flèche qui file en haut à droite, retrait de 1 rem au survol | `.45s cubic-bezier(.16,1,.3,1)` | `.commune` |
| **Accordéon** — `<details>` natif, le « + » tourne de 45°, la hauteur s'anime (`::details-content`, `interpolate-size`) ; une seule question ouverte | `.45s cubic-bezier(.16,1,.3,1)` | `.faq` |
| **Bande d'appel** — bloc encre, halo accent en orbite lente derrière le titre | `orbite 16s ease-in-out infinite alternate` | `.bande` |
| **Menu panneau** — bouton rond à deux barres qui deviennent une croix, panneau encre qui descend, liens en display 2,6 rem qui glissent de 8 px | `.55s cubic-bezier(.16,1,.3,1)` | `.burger`, `.panneau` |
| **Navigation qui se solidifie** — transparente sur le héros (texte blanc si photo/aplat), fond flouté + filet après 40 px | `.45s ease`, `backdrop-filter: blur(14px)` | `.nav`, `.nav.solide`, `.nav--claire` |
| **Filigrane** — le mot du métier en 22 vw à 7 % d'opacité derrière le héros | `clamp(6rem,22vw,21rem)`, `letter-spacing:-.05em` | `.hero__filigrane` |
| **Matière** — grain (`feTurbulence`) ou papier en surimpression fixe, `mix-blend-mode` multiply (clair) ou screen (sombre) | opacité .07–.14 (`--grain`) | `.texture--grain`, `.texture--papier` |

Deux easings suffisent : **`cubic-bezier(.16,1,.3,1)`** (sortie longue, tout ce qui entre ou répond) et `linear` (marquee). Aucun `ease-in`.
Rien n'anime `width`, `height`, `top`, `left` (sauf la ligne des étapes, 1 px de large, et l'accordéon natif).

Ce qu'on n'a **pas** pris : la traînée de curseur (gadget, coûte des images par seconde), le masque à la souris de `vision-reveal`
(`canvas.toDataURL()` à chaque image : injouable sur un téléphone de chantier), les carrousels automatiques (le juge les refuse).

## 3. La grammaire des sections (l'accueil)

1. **Nav** fixe, marque à gauche (point accent + nom), liens sur bureau, téléphone, bouton rond → panneau.
2. **Héros** — l'un des trois gestes, jamais le même pour deux métiers voisins :
   - `plein` : photo plein cadre avec dégradé bas, texte en bas à gauche, filigrane, indice « défiler » (plombier, chauffagiste, couvreur).
   - `scinde` : texte à gauche, photo 4:5 à droite dans un cadre avec un aplat accent décalé (`--motif` = calepinage CSS pour le carreleur), légende en pastille (électricien, maçon, menuisier, carreleur, serrurier).
   - `aplat` : fond accent plein, photo 4:3 qui déborde en bas (peintre).
   Toujours : kicker mono, h1 mot à mot, chapeau, bouton pilule + téléphone souligné.
3. **Bande qui défile** — prestations · communes.
4. **Trois faits** vérifiables (décennale + assureur + numéro, SIREN, devis gratuit) — jamais un chiffre non sourcé.
5. **Prestations** — cartes numérotées 01…06, halo au pointeur.
6. **Réalisations** — bento, légende + « Photo auteur · licence » sous chaque image.
7. **Zone d'intervention** — texte à gauche, grands liens de communes à droite (le maillage interne).
8. **Comment ça se passe** — panneau collant + ligne qui avance.
9. **Questions** — accordéon.
10. **Bande d'appel** — titre, bouton, téléphone, adresse, horaires, assurance, SIREN.
11. **Pied** — communes, pages, mention « site de démonstration ».

Pages de commune et de métier : héros `page` (fil d'Ariane, kicker, h1 mot à mot, chapeau), puis les mêmes gabarits selon les
sections du texte, une galerie de trois photos tournantes, les communes voisines, la bande d'appel.

## 4. Écrire la direction artistique d'un métier (le prompt maison)

Pour un nouveau métier, remplir une ligne de `_kit/da.json` en répondant, dans l'ordre :

1. **Identité en trois mots** (ex. maçon : « brut, condensé, minéral »). Elle décide tout le reste.
2. **Palette** : accent (celui du juge, `DA_METIER`), `accentTexte` (même teinte assombrie si le contraste sur le fond est < 4,5:1 :
   chauffagiste `#D2622A` → `#B04D1B`, menuisier `#A9743F` → `#7F5326`, maçon `#8A8177` → `#5E564D`, peintre `#C2543F` → `#A8432F`),
   fond, fond-2 (surface des cartes), encre, encre-2 (texte secondaire), ligne.
3. **Typographie** : display (OFL, dans `_polices/`), texte (IBM Plex Sans ou la même), `graisse` (Fraunces/Newsreader à 500,
   Instrument Serif à 400), `approche` (-0.025em par défaut, -0.03em pour Syne, -0.01em pour les condensées), `casse` (uppercase
   pour Archivo Narrow : maçon, couvreur).
4. **Le geste du héros** (`plein | scinde | aplat`) et le **filigrane** (un mot du métier, ou vide).
5. **La matière** : `aucune | grain | papier`, `grain` (.07–.14), `grainMode` (`screen` sur fond sombre).
6. **Le rayon** : 0 (maçon, couvreur), 2 (carreleur, serrurier), 6 (électricien, menuisier), 10–14 (chauffagiste, plombier), 20 (peintre), 24 (paysagiste).

Puis : `node scripts/polices-demo.mjs` (si une police manque), `node public/sites-demo/generer.mjs <metier>`,
`node scripts/site-qa.mjs public/sites-demo/<metier>`, et regarder la capture (`node scripts/capture-site.mjs`).

## 5. Ce que le juge mesure désormais (bloc « Le geste »)

Un site v1 propre passe la substance ; il ne passe pas ceci :
- le h1 est en mots (`.mot` ≥ 3) et composé ≥ 56 px sur bureau, approche négative ;
- ≥ 12 éléments `.reveal` sur l'accueil, tous `.vu` après défilement, aucun visible avant (`opacity` 0 sous `html.js`) ;
- un rideau, une bande qui défile, une galerie, un panneau d'étapes, un accordéon `<details>` ;
- ≥ 8 règles `:hover` avec transition, un `cubic-bezier` dans le CSS, `@media (prefers-reduced-motion: reduce)` présent ;
- en mouvement réduit (émulé), tout est visible sans défiler ;
- aucune animation sur `width/height/top/left` hors ligne des étapes et accordéon.

## 6. Les gestes à la carte (v16, démo « Atelier Lestraque »)

Posés par la direction artistique (`_kit/da.json` → drapeaux), jamais par défaut : les neuf démos v2 ne changent pas.

| Drapeau `da.json` | Ce qui se voit | Valeurs | Garde-fous |
|---|---|---|---|
| `monumental` | un seul titre, 12,5 vw (160 px sur 1280), interligne 0,9, approche −0,035 em | `clamp(3.1rem,12.5vw,12rem)` | le h1 reste « <Métier> à <Ville> » (juge SEO) ; la promesse va dans le kicker |
| `lumiere` | un balayage de lumière dans le cadre la moitié d'un cycle de 6 s ; une poussée lente de la photo (13 % + translation, 12 s) ; une lueur chaude qui dérive en continu (bureau ≥ 900 px) | `balayage`, `respire`, `lueur` — transform/opacity seulement | rien en mouvement réduit ; **mesuré** : différence entre images-clés du héros ≥ 0,05 |
| `sombre` | la section d'un genre donné (`etapes`…) passe en fond atelier `#1F160E`, grain en surimpression, accents `#D4A574` (contraste 8:1) | `.section--sombre` | les couleurs de texte sont redéfinies dans la section (Lighthouse Accessibilité) |
| `raccords` | la section sombre entre et sort en biais | `clip-path` fixe à 3,5 vw, marge négative | `clip-path` non animé |
| `bandeAccent` | la bande qui défile sur l'accent sombre `accentTexte`, texte clair | `.defile--accent` | contraste ≥ 4,5:1 même en petit |
| `galerie` | la galerie de l'accueil est une liste choisie (six photos : le motif bento 4-2-2 / 2-2-4 reste propre) | liste de `base` | les autres photos servent les pages de commune |

**La leçon qui a coûté une passe :** un geste écrit n'est pas un geste vu. Le premier balayage (240 % de large) ne traversait l'écran que 1,5 s sur 7 ; la grille l'a noté 2/5 (« quatre images identiques »). Avant de déclarer un mouvement ambiant, prendre les images-clés (`scripts/demo-images-cles.mjs`) et mesurer la différence entre elles. Et un effet qui se voit mais ne se comprend pas (la « révélation » : une tache floue sur l'outil) est pire que rien.
