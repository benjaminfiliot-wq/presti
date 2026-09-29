# 026-253 — budget-perf.mjs : diagnostic

## Poids mesuré AVANT (script d'origine, avant cette fiche)

Sur le dépôt réel (`C:/Users/benja/Documents/presti`, Next 15.5.26, `.next` déjà construit) :

```
✅ /site/[slug] — 102 Ko (budget 135 Ko)
✅ /p/[slug] — 102 Ko (budget 135 Ko)
```

Ces deux chiffres identiques (102/102) étaient un signal auquel il fallait prêter attention : ils
n'ont pas résisté à la casse volontaire (b), voir plus bas.

## Découverte en cours de route : un bug préexistant, pas seulement une adaptation Next 16

La casse volontaire (b) exigée par la fiche (« gonfler un fichier, vérifier que ça rougit ») a
immédiatement révélé que l'ancien script **ne mesurait pas la bonne route**. Sa recherche de clé :

```js
const clef = Object.keys(app).find((k) => k === `${b.route}/page` || k === b.route || k.startsWith(`${b.route}/`))
```

rend la PREMIÈRE clé de `app-build-manifest.json` à satisfaire une des trois conditions — sans
préférence pour la correspondance exacte. Pour `/site/[slug]`, `pages` contient aussi
`/site/[slug]/icon/route`, `/site/[slug]/opengraph-image/route`, `/site/[slug]/apple-icon/route`,
`/site/[slug]/layout`, `/site/[slug]/not-found` et `/site/[slug]/[...reste]/page`, qui commencent
tous par `/site/[slug]/`. Selon l'ordre d'écriture du manifeste par Next, `.find()` rendait
**`/site/[slug]/icon/route`** (une icône de quelques Ko) au lieu de **`/site/[slug]/page`** (la
vraie page) — vérifié directement :

```
clef trouvée: /site/[slug]/icon/route
fichiers: [webpack…, 4bd1b696…, 8004…, main-app…, app/site/[slug]/icon/route-9bc4a9f7a57014be.js]
```

Conséquence pratique : j'ai gonflé de 200 Ko (base64 aléatoire) le vrai fichier de la page
(`app/site/[slug]/page-495287f006882e10.js`) sur une copie, relancé le juge — **toujours ✅, 102 Ko,
rien n'a bougé**. Le juge de poids du dépôt mesurait silencieusement la mauvaise route depuis le
début (au moins depuis que `/site/[slug]/icon/route` existe dans le manifeste), et serait resté vert
même si la vraie page avait doublé de poids.

**Corrigé** (dans le périmètre de cette fiche, `scripts/budget-perf.mjs` seul) : correspondance
exacte d'abord (`${route}/page`, puis `route` seul), plus aucun repli approximatif sur un chemin
imbriqué. Une route sans clé exacte est une route ABSENTE (échec), jamais une invitation à deviner
une clé voisine.

## Poids mesuré APRÈS (script corrigé, mesure honnête) — dépôt réel, Next 15.5.26

```
✅ /site/[slug] — 116 Ko (budget 135 Ko) · le site vitrine, ouvert au téléphone depuis un chantier
❌ /p/[slug] — 179 Ko (budget 135 Ko) · la plateforme où le client écrit sa demande
```

**`/p/[slug]` dépasse réellement son budget de 44 Ko, sur le dépôt Next 15 actuellement en
production.** Ce n'est pas un effet de cette fiche (aucun fichier d'`app/` ni de `lib/` n'a été
touché — hors périmètre, interdit) : c'est une dérive de poids réelle et déjà présente, restée
invisible parce que le juge mesurait la mauvaise route depuis le début. Application de la règle du
fichier lui-même (conservée) : **je ne relève pas le budget** — c'est une décision qui revient à
Benj (alléger `/p/[slug]`, ou accepter explicitement un budget plus haut). Signalé ici en clair,
comme le fichier le demande.

## Adaptation Next 16 `--webpack` (objet premier de la fiche)

`.next/app-build-manifest.json` a disparu sous Next 16.3.6 `--webpack` (confirmé : aucune trace
dans `node_modules/next/dist/`, `.next/` après un build réussi ne le contient plus — recherche déjà
faite par 026-252, reconfirmée ici). Remplacé par deux sources qui existent toujours :

- `.next/build-manifest.json` → `rootMainFiles` (runtime webpack + framework + chunks partagés,
  chargés sur TOUTE page).
- `.next/static/chunks/app/<segments de la route>/{layout,page}-*.js` (convention de nommage stable
  des chunks webpack par segment) : le code de la page et de chaque layout parent, lu UNIQUEMENT
  dans le dossier exact de chaque segment (jamais récursivement) — les routes sœurs
  (`icon/route`, `opengraph-image/route`, `[...reste]/page`, etc.) vivent dans leurs propres
  sous-dossiers et ne sont donc jamais ramassées. C'est structurellement immunisé contre le bug
  décrit plus haut : il n'y a pas de `.find()` sur une liste de clés voisines.

`polyfillFiles` (bundle de compatibilité pour navigateurs anciens, ~39 Ko gzip mesurés) est
**délibérément exclu** : Next 15 ne le comptait déjà pas dans son manifeste par route (vérifié :
absent de `pages["/site/[slug]/page"]`), donc l'inclure aurait gonflé la mesure sans rapport avec
l'ancien comportement ni avec ce qu'un navigateur moderne exécute réellement.

### Poids mesuré — copie isolée Next 16.3.6 `--webpack` (worktree `C:/Users/benja/AppData/Local/Temp/n16-253`)

```
❌ /site/[slug] — 138 Ko (budget 135 Ko)
❌ /p/[slug] — 143 Ko (budget 135 Ko)
```

Détail du calcul pour `/site/[slug]` (7 fichiers, aucun doublon avec `/p/[slug]` sauf les 4
`rootMainFiles`) :

```
static/chunks/webpack-23fa1703edc05ec1.js          2 Ko gzip
static/chunks/4bd1b696-93bf506b236d6248.js         62 Ko gzip  (framework)
static/chunks/8755-dd811af270f28f15.js             65 Ko gzip  (vendor partagé)
static/chunks/main-app-87a3adc960ae2a9c.js          0 Ko gzip
static/chunks/app/layout-27790b676297cca2.js        5 Ko gzip  (layout racine)
static/chunks/app/site/[slug]/layout-*.js           0 Ko gzip  (layout de segment, vide ici)
static/chunks/app/site/[slug]/page-*.js             4 Ko gzip
```

Comparé aux 116 Ko mesurés sous Next 15 pour la même route (correction du bug comprise) : Next 16
est plus lourd de 22 Ko sur `/site/[slug]`, essentiellement parce que le chunk vendor partagé
(65 Ko, `8755-*.js`) est plus gros que l'équivalent Next 15 (deux chunks, `8004`+`1356`+`2691`,
~57 Ko cumulés) — un changement de découpage webpack entre versions majeures, pas une erreur de
mesure : vérifié fichier par fichier, aucun contenu inattendu.

**Les deux routes dépassent donc aussi sous Next 16, pour une raison distincte et cumulative avec
celle de Next 15** (`/p/[slug]` était déjà au-dessus avant même la migration). Même règle : je ne
touche pas `maxKo`, je le signale.

## Les trois essais volontaires (esprit de `echecs-attendus.md`), sur les DEUX versions

Toutes les copies sont sous `%TEMP%` (scratchpad de cette session), jamais sur le dépôt réel ni sur
le worktree de build lui-même. Le worktree `n16-253` a servi uniquement à produire un vrai `.next`
Next 16 (npm ci + next build --webpack dans son propre `node_modules`, aucune jonction).

### (a) route renommée dans BUDGETS → doit échouer dès l'absence de clé

Variante testée : `/site/[slug]` → `/site/[slug-renomme]`, `/p/[slug]` → `/p/[slug-renomme]`.

- **Next 15** (copie de `.next` réel) :
  `❌ /site/[slug-renomme] — route ABSENTE de la sortie de build … ` (code 1)
- **Next 16** (copie du `.next` de la copie isolée) :
  `❌ /site/[slug-renomme] — route ABSENTE de la sortie de build … ` (code 1)

### (b) poids gonflé au-delà du budget → doit rougir

Fichier réel de la page `/site/[slug]` gonflé de 40 Ko (base64 aléatoire, peu compressible) sur une
copie fraîche de chaque `.next` :

- **Next 15** : `/site/[slug]` passe de **116 Ko (✅)** à **157 Ko (❌)** après inflation du fichier
  `static/chunks/app/site/[slug]/page-495287f006882e10.js` (12,6 Ko → 65,1 Ko brut) — code 1.
- **Next 16** : `/site/[slug]` passe de **138 Ko (❌, déjà rouge)** à **178 Ko (❌, plus rouge)**
  après inflation du fichier `static/chunks/app/site/[slug]/page-13092fa96610feab.js` (12,1 Ko →
  64,6 Ko brut) — la mesure réagit bien à l'inflation (+40 Ko mesurés pour +40 Ko ajoutés), preuve
  que le juge suit vraiment le contenu du fichier et ne s'est pas figé sur un ancien calcul.

### (c) arbre réel → doit passer si le poids est honnêtement dans le budget

Sur l'arbre réel actuel, avec `maxKo: 135` inchangé, **aucune des deux routes ne passe plus sur
aucune des deux versions** (`/p/[slug]` dépasse déjà sous Next 15 ; les deux dépassent sous Next 16
— voir sections ci-dessus). Ce n'est pas un défaut du juge : c'est le résultat honnête, exactement ce
que la fiche demande (« ne pas relever les budgets sans le dire explicitement à Benj »).

Pour prouver que le mécanisme SAIT aussi rendre ✅ quand c'est mérité (et n'est pas structurellement
toujours rouge), deux essais complémentaires sur des données réelles, non modifiées, avec un script
de test qui ne touche jamais au fichier livré (`maxKo` reste à 135 dans `scripts/budget-perf.mjs`) :

- **Next 15**, `/site/[slug]` seul (le seul des deux routes déjà dans le budget) :
  `✅ /site/[slug] — 116 Ko (budget 135 Ko)` … `✅ budgets tenus` — code 0.
- **Next 16**, budget de test relevé à 150 Ko (démonstration seulement, jamais dans le fichier
  livré) sur l'arbre réel non modifié :
  `✅ /site/[slug] — 138 Ko (budget 150 Ko)` / `✅ /p/[slug] — 143 Ko (budget 150 Ko)` —
  `✅ budgets tenus` — code 0.

## Ce qui reste (hors périmètre de cette fiche)

- **`/p/[slug]` dépasse déjà son budget sous Next 15, en production actuelle** (179 Ko vs 135 Ko) :
  décision à prendre par Benj (alléger la page, ou relever `maxKo` explicitement). Le bug qui
  masquait cette dérive est corrigé ; la dérive elle-même n'est pas d'`app/` ni de `lib/`, hors
  périmètre de cette fiche.
- **Les deux routes dépassent sous Next 16** (138/143 Ko) : à rejuger une fois le dépôt réellement
  remigré vers Next 16 (026-006 et suivantes) ; même décision à prendre alors.
- `node scripts/next16-qa.mjs --groupe=dependances` ne peut pas finir vert tant que le dépôt reste
  sur Next 15 (N16-1 à N16-3 exigent `next` en version 16 installée — hors périmètre de cette fiche,
  `package.json`/`package-lock.json` sont dans `interdit`) : voir `verifier.log`.
