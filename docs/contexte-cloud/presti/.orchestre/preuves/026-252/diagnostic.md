# 026-252 — diagnostic

## Chaîne d'import avant (citée dans la fiche, confirmée)

```
node:crypto
./lib/siteDossier.ts
./lib/siteRetrait.ts
./app/controle/Sites.tsx
./app/controle/page.tsx

node:zlib
./lib/zip.ts
./lib/siteDossier.ts
./lib/siteRetrait.ts
./app/controle/Sites.tsx
./app/controle/page.tsx
```

`app/controle/Sites.tsx` (`'use client'`) n'utilisait que `LIBELLE_RETIRE`, une constante `string`, mais l'importait depuis `lib/siteRetrait.ts` qui tire `lib/siteDossier.ts` (→ `node:crypto`) et `lib/zip.ts` (→ `node:zlib`) dans le bundle client.

## Correctif appliqué (périmètre de la fiche)

1. Nouveau fichier `lib/sitesConstantes.ts` (aucune dépendance) : `ETAT_RETIRE` et `LIBELLE_RETIRE`.
2. `lib/siteRetrait.ts` : la définition locale est remplacée par `import { ETAT_RETIRE, LIBELLE_RETIRE } from './sitesConstantes'` + `export { ETAT_RETIRE, LIBELLE_RETIRE }` (un `export … from` seul ne crée PAS de binding local : `ETAT_RETIRE` est utilisé plus loin dans le fichier, ligne 93 — il a donc fallu importer ET réexporter, pas seulement réexporter).
3. `app/controle/Sites.tsx` : l'import de `LIBELLE_RETIRE` vient désormais de `@/lib/sitesConstantes`.
4. `lib/siteDossier.ts` et `lib/zip.ts` : intouchés.

## Après — chaîne d'import

`app/controle/Sites.tsx` → `@/lib/sitesConstantes` (fichier isolé, zéro import). Plus aucune route vers `node:crypto`/`node:zlib` depuis ce composant client. Confirmé par le build : plus aucune erreur `UnhandledSchemeError`.

## Résultat de `node scripts/next16-qa.mjs --groupe=dependances`

```
PASS N16-1 — next installé 16.3.6 …
PASS N16-2 — next.config.mjs importe @serwist/next, script build = "next build --webpack"
PASS N16-3 — aucun script next lint, aucune clé eslint dans next.config.mjs
PASS N16-4 — npm run typecheck vert
PASS N16-5 — npm run build vert, BUILD_ID récent
PASS N16-6 — 36896 octet(s), régénéré=true, contient "hors-ligne"=true
FAIL N16-7 — code 1 — ❌ .next introuvable — lancez `npx next build` avant ce contrôle.

next16-qa : FAIL — N16-7
```

**N16-5 (l'objectif réel de cette fiche) est passé de FAIL à PASS.** Le `Build failed because of webpack errors` a disparu.

## N16-7 reste rouge — cause DISTINCTE, hors périmètre, pré-existante

`scripts/budget-perf.mjs` (interdit dans le périmètre de 026-252 ET de 026-006) lit `.next/app-build-manifest.json` (ligne 20). Ce fichier **n'existe plus du tout** dans les sorties de build de Next 16.3.6 — pas renommé, supprimé :

- Recherche confirmée : `grep -rl "app-build-manifest" node_modules/next/dist/` → aucun résultat.
- `grep -n "MANIFEST" node_modules/next/dist/shared/lib/constants.js` → il n'existe plus de constante `APP_BUILD_MANIFEST` (les constantes actuelles : `BUILD_MANIFEST`, `APP_PATHS_MANIFEST`, `APP_PATH_ROUTES_MANIFEST`, `CLIENT_REFERENCE_MANIFEST`, etc., aucune ne rejoue le rôle exact de l'ancien fichier).
- `.next/` après un build réussi (`--webpack`) ne contient bien AUCUN fichier `app-build-manifest.json` (listing complet vérifié).

C'est exactement le risque que 026-006 avait anticipé dans son point 5 : « S'il ne trouve plus `.next/app-build-manifest.json` en Next 16 `--webpack`, s'arrêter. Le juge de poids se réécrit dans une fiche Claude Code à part, jamais pour faire passer celle-ci. » Ce n'est pas une régression causée par 026-252 : c'est la conséquence structurelle, déjà documentée, du passage à Next 16.

### Pistes pour la fiche de suite (recherche faite ici pour économiser le travail de la prochaine fiche)

- Les chunks JS par route App Router existent toujours sur disque, convention stable : `.next/static/chunks/app/<route>/page-<hash>.js` (vérifié pour `/p/[slug]/page-*.js`, `/site/acheter/page-*.js`, etc.).
- `.next/server/app/<route>/page_client-reference-manifest.js` existe par route et contient `ssrModuleMapping`/`clientModules`, mais c'est une structure interne complexe (mapping de modules RSC → ids numériques → chunks), pas un simple tableau de fichiers comme l'ancien `app-build-manifest.json`. La reconstituer fidèlement demande un vrai travail d'ingénierie, pas un correctif rapide.
- `.next/build-manifest.json` a toujours `rootMainFiles`/`polyfillFiles` (chunks partagés chargés sur toute page) mais sa clé `pages` est vide pour les routes App Router (elle ne sert plus qu'au Pages Router).
- Une piste raisonnable pour la fiche de suite : additionner `rootMainFiles` + `polyfillFiles` (partagés) + les chunks de `.next/static/chunks/app/<route>/**/*.js` trouvés par glob sur le chemin de la route (page + layouts parents), en excluant les routes API et le contenu serveur. À valider avec un budget connu et un « piège » (route renommée / poids gonflé) comme le fait déjà le reste du dépôt (`echecs-attendus.md`).

## Décision

Fiche **arrêtée à N16-5/N16-6 verts, N16-7 rouge pour une cause hors périmètre**, conformément à la règle de non-improvisation de la fiche (§5). Fiche de suite ouverte : **026-253** (`.orchestre/brouillons-ecosysteme/026/026-253.md`), périmètre `scripts/budget-perf.mjs` uniquement.

`node scripts/next16-qa.mjs --groupe=dependances` restera FAIL (N16-7) pour 026-252 ET pour 026-006 tant que 026-253 n'est pas verte — c'est attendu, documenté ici et dans `.orchestre/preuves/026-006/versions.md`.
