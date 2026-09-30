# Contrat des juges Claw3D (lot k, fiche 026-170) — ce que le moteur expose, ce que le juge observe

Écrit par Claude Code le 30/09. Il lie deux morceaux : **le témoin** (`k/temoin/`, un moteur MINIMAL, moins de 300 lignes par partie, sans une ligne de Claw3D ni de l'atelier) et **le juge** (`scripts/station-claw3d-qa.mjs`). Le moteur réel (026-179 à 026-186, Codex) devra respecter les mêmes points : les juges de rendu n'y lisent que ceci. Rien de ce qui suit n'est un « drapeau de test » dans le moteur : le juge instrumente lui-même sa COPIE.

## 1. Les fichiers du moteur que le juge lit (chemins du dépôt)

| Fichier | Rôle |
|---|---|
| `app/controle/station/Carte.tsx` | `export default function Carte(props)` ; props `{ equipage, tapis, bulles, reglages, carte }` ; lit `actif('stationCarte')` (`@/lib/flags`) ; levé : charge `./moteur/entree` par `next/dynamic(..., { ssr: false })` ET SEULEMENT lui ; baissé : le cadre d'attente et la liste des salles |
| `app/controle/station/Station.tsx` (026-111) et `app/controle/station/page.tsx` | la page `/controle/station` : sans session Supabase elle ne monte rien du moteur ; avec session elle lit `GET /api/controle/station?vue=direct` (en-tête `Authorization: Bearer <access_token>`), et ne monte `<Carte />` qu'après la première réponse 200 ; puis relit `vue=fil` (bulles) et `vue=direct` à ses cadences |
| `app/controle/station/moteur/entree.tsx` | le SEUL module que `Carte.tsx` charge ; monte l'hôte ; `import("phaser")` dynamique |
| `app/controle/station/moteur/claw3d/LICENSE-claw3d.txt`, `PROVENANCE.md` | notice MIT (« MIT License », « Luke The Dev ») ; PROVENANCE cite le commit `0565b78` et chaque fichier copié ou modifié dont `lib/avatars/profile.ts` |
| `app/controle/station/moteur/claw3d/OfficeSceneBridge.ts` | le pont React → Phaser : `export class OfficeSceneBridge` dont chaque méthode publique est un appel du pont |
| `app/controle/station/moteur/scene/`, `calque/`, `theme/charger.ts` | la scène, le calque HTML (miroir, bulle, Zz), le chargeur de thème (un seul `fetch(`, préfixe fixe `/station/themes/`) |
| `proxy.ts` | `CHEMINS_APP_PRESTI` porte l'alternative `station\/.*` |
| `lib/flags.ts` | `stationCarte` (baissé dans le dépôt) |
| `package.json` | `"phaser": "3.90.0"` exactement |

## 2. Ce que le juge observe dans le navigateur (Playwright, Chromium ; WebGL logiciel accepté)

- **Le canevas** : un seul `<canvas>` dans `[data-station-carte]`. `canvas.width = theme.grille.largeur × k` avec **k entier ≥ 1** (le juge lit k = canvas.width / grille.largeur, exige un entier, et exige `style.width = canvas.width / devicePixelRatio`) ; `pixelArt`, `antialias:false`, `roundPixels:true` dans la config de Phaser (lu dans le source).
- **Le miroir** (HTML, en texte, jamais `innerHTML`) : `ul[data-miroir] > li[data-personnage="<nom>"]` avec `data-salle`, `data-motif` (`porte|tache|reunion|pause|panne`), `data-etat` (`marche|arrive`), `data-x`, `data-y` (pixels logiques), mis à jour à chaque pas de marche et à l'arrivée. **Un acteur sans salle n'a pas de `li`.**
- **La bulle** : `[data-bulle="<nom>"]` au texte exact servi ; **Zz** : `[data-zz="<nom>"]` présent seulement pour le motif `pause`.
- **Le jeu Phaser** : le juge ne demande AUCUN crochet. Il **instrumente sa copie** avant de la construire : dans les fichiers de `moteur/**`, `new Phaser.Game(` devient `(globalThis.__stationGame = new Phaser.Game(` … `)` (le moteur doit construire par `new Phaser.Game(config)` après `const Phaser = (await import('phaser')).default`) ; il lit `globalThis.__stationGame.loop.frame` (le compteur d'images).
- **Le pont** : le juge remplace, dans sa copie, `OfficeSceneBridge.ts` par un enveloppeur (l'original renommé `OfficeSceneBridge.orig.ts`, ré-exporté) qui incrémente `globalThis.__stationPontAppels` à chaque appel d'une méthode de `OfficeSceneBridge.prototype`. Le moteur doit donc exporter **une classe nommée `OfficeSceneBridge`** et n'appeler ses méthodes que sur un vrai changement de signature.
- **Le canevas au repos** : l'empreinte d'un cliché (`page.screenshot({ clip: <boîte du canevas> })`, sha256) sert de « même image » ; deux clichés d'une scène immobile sont identiques.
- **Les requêtes** : toutes celles de la page sont relevées (`page.on('request')`) ; CL-11 exige que chacune soit l'une de `/api/controle/station?vue=`, `/api/controle/tresorerie`, `/api/controle/station/reglages`, `/station/themes/<clé de la liste fermée : station, vaisseau, essai>/…`, `/_next/static/…` (et l'hôte Supabase de la session simulée, intercepté). Aucun `securitypolicyviolation`.

## 3. La session simulée (`k/session-simulee.mjs`, sans compte ni clé)

Le juge sert la copie avec des `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port mort>` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` factices (assemblées à l'exécution), pose dans le `localStorage` de la page la session Supabase factice (`sb-<ref>-auth-token`, jeton fabriqué : `eyJ…` construit à l'exécution, `exp` dans le futur), et **intercepte** par `page.route` : l'hôte Supabase (rend l'utilisateur factice), `/api/controle/station?vue=direct|fil|salle|agent` (réponses tirées des jeux d'essai de `scripts/fixtures/026-pilotage/s/`, validées par `s/contrat-vues.mjs`), `/api/controle/tresorerie`, `/api/controle/station/reglages`, et `/station/themes/essai/**` (servi depuis `k/themes/essai/`, jamais depuis `public/`).

## 4. Le thème d'essai et son schéma (`k/theme.schema.json`, `k/themes/essai/`)

Le thème d'essai est neutre (aucune donnée : écrans « — »), tiré de la disposition des 20 salles de `lib/pilotage/equipage.ts` + une salle réservée `ecommerce`. Le schéma est celui de la fiche 026-170 (`cle`, `nom`, `version`, `grille`, `mise_en_page`, `palette`, `emplacements` ≥ 20 dont **un et un seul** `reservee` sans poste, `coursives`, `tapis`, `defauts`, `avatars`, `nuit`, `portrait` facultatif ; aucun champ de code, aucune adresse `http`).

## 5. Les parties du juge et leurs critères (CL-1 à CL-16 de la fiche)

`provenance` (CL-1 à CL-4, statique) · `verite` (CL-5 à CL-8) · `repos` (CL-9) · `garde` (CL-10) · `csp` (CL-11, build de production) · `poids` (CL-12, build de production) · `pixel` (CL-13) · `contexte` (CL-14) · `grille` (CL-15) · `hygiene` (CL-16, statique + `ts-loader`). Regroupées par la preuve en quatre entrées de `lot.mjs` d'au moins **trois critères** chacune (plancher de la preuve générique) : voir `lot.mjs`.
