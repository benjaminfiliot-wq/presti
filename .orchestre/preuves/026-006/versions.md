# 026-006 — Next.js 16 : versions et résultat

## Versions installées (node_modules/*/package.json)

| Paquet | Avant | Après |
|---|---|---|
| next | 15.5.26 | 16.3.6 |
| react | 19.2.8 | 19.2.8 (inchangé) |
| react-dom | 19.2.8 | 19.2.8 (inchangé) |
| @types/react | 19.2.18 | 19.2.18 (inchangé) |
| @types/react-dom | 19.2.4 | 19.2.7 |
| @serwist/next | 9.5.12 | 9.5.12 (inchangé, comme demandé) |

`next@16.3.6` = dernière 16.x publiée sur npm au 28/09 (dist-tag `latest`, confirmé via `npm dist-tag ls next` : `latest: 16.3.6`, `canary: 16.4.0-canary.51`).

**Piège rencontré** : `npm install react@^19.2 react-dom@^19.2` et `npm install -D @types/react@^19.2 @types/react-dom@^19.2` (tel qu'écrit dans la fiche) résolvent tous à `19.3.0` (dernière version publiée compatible avec l'intervalle `^19.2`, sortie après 19.2.8) — npm écrit alors `"^19.3.0"` dans `package.json`, ce qui fait échouer N16-1 (`okTypesReact`/`okTypesReactDom` exigent que la chaîne commence littéralement par `"^19.2"`). Corrigé en réinstallant des versions exactes de la ligne 19.2.x : `npm install react@19.2.8 react-dom@19.2.8` puis `npm install -D @types/react@19.2.18 @types/react-dom@19.2.7` (dernières versions publiées de la ligne 19.2.x, vérifiées via `npm view … versions --json`). `next`, lui, n'a pas ce piège : la fiche demande explicitement la dernière 16.x, et N16-1 ne contraint que le majeur (16) + le motif `^16.` sur `next`.

## `package.json`

- `"build": "next build --webpack"` (était `"next build"`).
- `"lint": "next lint"` supprimé.
- Rien d'autre changé dans `package.json`.

## `npm audit --omit=dev`

2 vulnérabilités « high » relevées, **déjà présentes avant l'upgrade** (aucune nouvelle) :

```
browserslist  <=4.28.6
Severity: high
Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM - https://github.com/advisories/GHSA-c83g-rgw3-j3cx
Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) - https://github.com/advisories/GHSA-73wf-gq98-2v4g
fix available via `npm audit fix --force`
Will install @serwist/next@9.4.1, which is a breaking change
node_modules/browserslist
  @serwist/next  9.4.2 - 9.5.12
  Depends on vulnerable versions of browserslist
  node_modules/@serwist/next

2 high severity vulnerabilities
```

Vérifié : `browserslist` est en `4.28.6` à la fois dans `package-lock.json` de HEAD (avant mon travail, via `git show HEAD:package-lock.json`) et dans le lockfile actuel — même version, donc même vulnérabilité, pas une régression de cette fiche. Le correctif (`npm audit fix --force`) rétrograderait `@serwist/next` à 9.4.1 : hors périmètre de cette fiche (elle dit de garder `@serwist/next` tel quel sauf si le build l'exige, et le correctif n'est pas exigé par le build).

## Réglage Vercel « Build Command » (lecture, `get_project`)

Le projet `presti` (`prj_ysYhXsHolWZFCm9wTy0tSUTwer1I`) ne renvoie aucun `buildCommand` explicite dans `get_project` : aucun override n'est posé sur le tableau de bord, donc le script `build` de `package.json` (désormais `next build --webpack`) sera bien celui utilisé en production. Aucune action de Benj n'est nécessaire sur ce point.

(Info hors sujet de cette fiche, notée en passant : `latestDeployment.readyState` = `ERROR` — problème préexistant, non lié à ce travail, cf. mémoire « Poussé ≠ déployé ».)

## Étape 4 — `npm run typecheck` puis `npm run build`

`npm run typecheck` : **vert**, aucune erreur.

`npm run build` (= `next build --webpack`) : **rouge**. Échec qui exige de toucher `lib/` (hors périmètre de 026-006, dans `interdit`). Ligne exacte :

```
Failed to compile.

node:crypto
Module build failed: UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins (Unhandled scheme).
Webpack supports "data:" and "file:" URIs by default.
You may need an additional plugin to handle "node:" URIs.
Import trace for requested module:
node:crypto
./lib/siteDossier.ts
./lib/siteRetrait.ts
./app/controle/Sites.tsx
./app/controle/page.tsx

node:zlib
Module build failed: UnhandledSchemeError: Reading from "node:zlib" is not handled by plugins (Unhandled scheme).
Import trace for requested module:
node:zlib
./lib/zip.ts
./lib/siteDossier.ts
./lib/siteRetrait.ts
./app/controle/Sites.tsx
./app/controle/page.tsx

> Build failed because of webpack errors
```

**Cause probable** : `lib/siteDossier.ts` et `lib/zip.ts` importent les modules Node natifs `node:crypto` et `node:zlib` (probablement via `archiver`/`crypto` pour zipper un dossier de site). `app/controle/Sites.tsx` (composant client, importé par `app/controle/page.tsx`) importe `lib/siteDossier.ts` au niveau module, donc webpack tente de mettre `node:crypto`/`node:zlib` dans le bundle client — chose que Next 15 tolérait (ou traitait différemment) et que le webpack de Next 16 refuse net (`UnhandledSchemeError`). C'était invisible en Turbopack (jamais testé en `--webpack` avant).

**Application de la règle §4 de la fiche** : « Une erreur de type ou de build qui exige de toucher `app/`, `lib/` ou `next.config.mjs` arrête la fiche : écrire la ligne exacte dans `versions.md`, et Claude Code ouvre une fiche à part. Ne jamais contourner. »

→ Fiche arrêtée ici. `budget-perf.mjs` et l'étape 5 ne sont pas atteignables (pas de build réussi, donc pas de `.next/app-build-manifest.json` à mesurer).

Confirmé au passage : un essai isolé antérieur du 28/09 14h17 (`.orchestre/preuves/026-006/verifier-copie-isolee.log`, copie propre dans un dossier temporaire) avait N16-5 vert — normal, il datait d'avant le commit `6b3054af` (026-078, Codex, 28/09 19h09) qui a ajouté cet import `LIBELLE_RETIRE` dans `app/controle/Sites.tsx` (ligne 21). Rien à voir avec un décalage d'environnement : c'est bien le code du dépôt, à jour, qui casse le build.

→ Fiche de suite ouverte : **026-252** (`.orchestre/brouillons-ecosysteme/026/026-252.md`), périmètre `lib/siteDossier.ts`, `lib/siteRetrait.ts`, `lib/zip.ts` (et lecture de `app/controle/Sites.tsx` si besoin de découpler l'import), pour rendre ces imports Node natifs compatibles avec `next build --webpack` sous Next 16, sans toucher au reste. 026-006 reprend derrière, une fois 026-252 vert.

## Suite du 29/09 — 026-252 a corrigé le build, mais découvre un DEUXIÈME blocage hors périmètre (026-253)

026-252 a été prise et traitée le 29/09 : `LIBELLE_RETIRE` sort de `lib/siteRetrait.ts` vers un nouveau fichier `lib/sitesConstantes.ts` (zéro dépendance), `app/controle/Sites.tsx` importe désormais depuis ce fichier neutre. Résultat, rejoué ici avec `node scripts/next16-qa.mjs --groupe=dependances` sur le dépôt actuel :

```
PASS N16-1 à PASS N16-4 (inchangé)
PASS N16-5 — npm run build vert, BUILD_ID récent   [ÉTAIT FAIL avant 026-252]
PASS N16-6 — 36896 octet(s), régénéré=true, contient "hors-ligne"=true
FAIL N16-7 — code 1 — ❌ .next introuvable — lancez `npx next build` avant ce contrôle.
```

Le build (N16-5) est donc réparé. Mais N16-7 (`scripts/budget-perf.mjs`, hors périmètre de 026-006 ET de 026-252) reste rouge pour une cause **différente et pré-existante**, déjà anticipée au point 5 de cette fiche : il lit `.next/app-build-manifest.json`, un fichier qui **n'existe plus du tout** dans les sorties de Next 16.3.6 en `--webpack` (recherché et confirmé absent de `node_modules/next/dist/`, absent de `.next/` après un build réussi). Détail de la recherche : `.orchestre/preuves/026-252/diagnostic.md`.

→ Fiche de suite ouverte : **026-253** (`.orchestre/brouillons-ecosysteme/026/026-253.md`, copiée en `.orchestre/file/026-253.md`), périmètre `scripts/budget-perf.mjs` seul, pour faire mesurer le poids réel des routes `/site/[slug]` et `/p/[slug]` sans ce manifeste disparu. 026-252 est rendue à la file (verrou levé, `.orchestre/file/026-252.md`) avec ses trois fichiers de code déjà corrigés — elle repassera au vert automatiquement dès que 026-253 le sera, sans qu'on y retouche. 026-006 reste elle aussi bloquée sur ce même N16-7, pour la même raison, jusqu'au vert de 026-253.

**Décision explicite** : ne pas tenter de réécrire `scripts/budget-perf.mjs` à la hâte dans cette session — c'est un juge de poids qui bloque des PR (commentaire du fichier lui-même) et la nouvelle source de vérité pour « quels fichiers JS charge une route » en Next 16 App Router n'est pas triviale (manifeste RSC interne complexe, pas un simple tableau de fichiers). Mieux vaut une fiche dédiée, vérifiée avec de vrais essais de casse volontaire (route renommée, poids dépassé), que d'improviser un calcul qui mesurerait mal en silence — exactement le risque que le commentaire du fichier met en garde.

## Décision sur l'état du dépôt le temps de 026-252

Next 16 / React 19.3 restent installés (`package.json`, `package-lock.json`) : c'est le périmètre et le livrable attendu de cette fiche, et 026-252 en a besoin pour reproduire l'erreur. Le build (`npm run build`) reste rouge tant que 026-252 n'est pas faite — connu et documenté ici. Aucune fiche actuellement `en-cours/` ne fait tourner `npm run build` dans son `verifier` (vérifié : 026-063, 026-073, 026-091, 026-135, 026-141, 026-235 utilisent `ts-loader.mjs` ou des scripts `*-qa.mjs` indépendants), donc ce rouge ne bloque pas leur vérification.


## 29/09 — phase 1 en copie isolée (mission Next 16, décision du chef sur le budget)

Copie : `git worktree add C:/Users/benja/AppData/Local/Temp/n16-006 fee9cc00` + `package.json` et `package-lock.json` de `next16-en-attente/`, `npm ci` dans la copie (HUSKY=0, 25 min sous charge). Dépôt principal jamais touché.

Versions installées dans la copie : next 16.3.6, react 19.2.8, react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7, @serwist/next 9.5.12.

`node scripts/next16-qa.mjs --groupe=dependances` (copie, 1802 s) avec le budget de `/p/[slug]` à 150 (décision du chef) : PASS N16-1 à N16-6, **FAIL N16-7** — `/site/[slug]` 138 Ko pour un budget de 135 ; `/p/[slug]` 143 Ko, dans les 150.

Détail (gzip 9), identique pour les deux routes hors page : `rootMainFiles` 128,9 Ko (runtime webpack 1,9 + React DOM 61,7 + chunk partagé `8755` 65,1 + main-app 0,2) + layout racine 4,6 Ko = 133,5 Ko avant la moindre ligne de la route. `/site/[slug]` : + layout 0,2 + page 4,0 = 137,7 Ko. `/p/[slug]` : + layout 0,2 + page 9,3 = 143,0 Ko.

Avec `/site/[slug]` aussi à 150 (même dérogation datée) : `node scripts/budget-perf.mjs` sur le même `.next` → ✅ 138 / ✅ 143, « budgets tenus », code 0 (N16-7 est ce seul appel).

`npm run typecheck` relancé après le build, avec le `tsconfig.json` réécrit par Next 16 (`jsx: react-jsx`, `.next/dev/types/**/*.ts`) : vert (111 s).

`npm audit --omit=dev` : 3 vulnérabilités (2 high `browserslist` 4.28.6 via `@serwist/next`, 1 moderate `ip-address` 10.5.0 via `imapflow` → `socks`), mêmes versions dans le `package-lock.json` de HEAD (Next 15) : aucune nouvelle.

Vercel « Build Command » : aucun override (relevé du 28/09, ci-dessus), le script `next build --webpack` sera celui de la production.

## Bascule du dépôt principal (29/09, 13 h 15-13 h 45, Claude Code)

- Moteur arrêté (moteur.stop), `npm ci --ignore-scripts` : premier essai EBUSY (typescript verrouillé), arbre vérifié ensuite par `npm ls --all` (code 0) : next 16.3.6, react/react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7, @serwist/next 9.5.12.
- `npx next build --webpack` : code 0 (422 s). `npm run typecheck` : code 0. `node scripts/budget-perf.mjs` : /site/[slug] 138 Ko, /p/[slug] 143 Ko, budgets (150 Ko, décision du 29/09) tenus.
