# Provenance du moteur de la carte (fiche 026-179, K1)

On a copié dans Presti le **moteur 2D** de Claw3D, pas son application : aucune route, aucune passerelle, aucun WebSocket, rien de 3D.
Projet d'origine : **Claw3D**, licence MIT, « Copyright (c) 2026 Luke The Dev » (notice complète : `LICENSE-claw3d.txt`, à côté de ce fichier).
Commit d'origine : **0565b78** (dépôt `~/claw3d` sur l'usine, lu en lecture seule le jour de la copie).

## Ce qui vient de Claw3D (dans ce dossier, `claw3d/`)

| Fichier ici | Origine dans Claw3D (0565b78) | État | Ce qui a changé |
|---|---|---|---|
| `LICENSE-claw3d.txt` | `LICENSE` | copié | rien (sha256 `1810ae0465a16134…`, identique) |
| `OfficePhaserCanvas.tsx` | `src/features/office/components/OfficePhaserCanvas.tsx` (91 lignes) | **réécrit en mode station seul** | plus de `mode` viewer/builder : les imports d'`OfficeBuilderScene` et d'`OfficeViewerScene` sont retirés ; plus de `map` ni de `presence` (la scène vient de l'extérieur par `fabrique`, elle lit le pont) ; plus de classe Tailwind (`h-full w-full overflow-hidden rounded-lg`, absentes de Presti : le cadre ferait 0 px) mais un module CSS ; configuration de Phaser de la station : `pixelArt: true`, `antialias: false`, `roundPixels: true`, `seed: ["station"]`, `audio: { noAudio: true }`, `banner: false`, un canevas de `grille × k` pixels de l'appareil (k entier, taille CSS = canevas ÷ densité) à la place de `Scale.RESIZE` ; Phaser reste importé par `await import("phaser")` |
| `OfficePhaserCanvas.module.css` | (aucune : remplace les classes Tailwind de la ligne 90 de `OfficePhaserCanvas.tsx`) | neuf | un cadre sans Tailwind, `image-rendering: pixelated` |
| `OfficeSceneBridge.ts` | `src/features/office/phaser/OfficeSceneBridge.ts` (63 lignes) | **modifié** | `createOfficeSceneBridge` (fabrique d'un objet) devient la classe `OfficeSceneBridge` (méthodes sur le prototype : `getState`, `setState`, `subscribe`) ; l'état n'est plus `map`, `presence`, `debug`, `runtime` mais une liste d'acteurs ; `setState` compare **par valeur** et ne prévient les abonnés que sur un vrai changement (celui de Claw3D prévenait à chaque appel, ce qui réveillait Phaser à chaque lecture des vues) |
| `schema.ts` | `src/lib/office/schema.ts`, lignes 1 à 183 | **extrait** | les types de carte et de zone seulement (dont les zones en polygone : `OfficePolygon`, `OfficeZone`, `OfficeCollision`) ; les normalisateurs et les cartes d'exemple (`createEmptyOfficeMap`, `createStarterOfficeMap`, `normalizeOfficeMap`) ne sont pas copiés |
| `pathfinding.ts` | `src/lib/office/pathfinding.ts` (400 lignes) | copié | un en-tête de deux lignes ; l'import des types (`@/lib/office/schema` devient `./schema`). `buildNavGrid2D` et `astar2D` sont ceux de Claw3D, sans three |
| `profile.ts` | `lib/avatars/profile.ts` (`src/lib/avatars/profile.ts`, 272 lignes) | **copié sans aucune modification** | rien (sha256 `5766652369a4aabf…`, identique) : un avatar tiré d'une empreinte du nom, sans `multiavatar` ni `Math.random` |

## Ce qui vient de l'atelier du prototype (`../scene/`) : notre code, pas celui de Claw3D

L'atelier est `~/claw3d-pixel` sur l'usine (commit `d4922d0`, écrit le 25/09 par nous, lu en lecture seule). Ces fichiers ne sont pas sous la notice MIT de Claw3D, mais ils reposent sur `profile.ts` ci-dessus.

| Fichier | Origine dans l'atelier | Ce qui a changé |
|---|---|---|
| `scene/StationPixelScene.ts` | `src/features/office/phaser/StationPixelScene.ts` (166 lignes) | **sans sa fonction `roomFor`** (qui devinait la salle d'un agent d'après son état) ; plus de décor, de nébuleuse, de police ni de `performance.now()` (K2 et K3 apportent le décor d'après le thème, K4a le calque HTML des noms) ; la salle et le motif viennent de l'acteur (`ActeurStation`), l'emplacement d'un placeur fourni de l'extérieur (null à K1 : rien n'est dessiné) ; plus de `__stationStats.sleeping` (une preuve vide) : la boucle s'endort après trois images de calme et se réveille sur un vrai changement du pont |
| `scene/agentPainter.ts` | `src/features/retro-office/pixel/agentPainter.ts` (132 lignes) | une ligne : l'import du profil (`@/lib/avatars/profile` devient `../claw3d/profile`) |
| `scene/palette.ts` | `src/features/retro-office/pixel/config.ts`, **la seule `PIXEL_PALETTE`** | ni `PIXEL_MODE` ni `PIXEL_TRUTH_MODE` : `?pixel=0` dans l'adresse coupait la vérité |

## Ce qui n'est pas copié, jamais

Toute la 3D (three, React Three Fiber, drei, `RetroOffice3D.tsx`, les `.glb`) ; l'orchestrateur `OfficeScreen.tsx` ; tout ce qui suppose OpenClaw ou une passerelle (`server/`, `src/app/api/*`, `lib/gateway`, `lib/runtime`) ; `lib/office/presence.ts` (disque et passerelle) ; `multiavatar` ; les systèmes d'ambiance (`LightingSystem`, `AmbienceSystem`, `AgentEffectsSystem` : lumières qui vacillent, vapeur, bulles tirées au hasard) ; `OfficeBuilderScene` et `OfficeViewerScene`.
