# Contre-vérification de 026-179 (le moteur nu de la carte, K1) : sabotages réversibles de la production, 04/10/2026

La production est posée dans le dépôt (`node .orchestre/preuves/026-179/livraison/appliquer.mjs`, idempotent) après l'accord du chef (D-0410-5) : `phaser` 3.90.0 exact
dans `package.json` et `package-lock.json` (produits sur l'usine, bac `~/bacs/lock-179`, `npm install --package-lock-only --ignore-scripts` : seuls `phaser` et `eventemitter3`
entrent au verrou, 17 lignes ajoutées, aucune retirée ; commit 72625e5c, poussé), puis `node scripts/usine.mjs preparer --forcer` (npm ci, node_modules à jour, Chromium et WebKit démarrent).
Les sabotages ne touchent JAMAIS le dépôt : ils tournent dans un bac de l'usine (`usine.mjs executer`, bac jetable recréé à chaque appel, état du PC), chacun jugé par la partie de
`station-claw3d-qa` qui doit le voir, puis la production est restaurée et les sha256 (16 premiers caractères) sont comparés. Script : `sabotages-moteur-179.sh` ; journal brut rapatrié :
`sab-moteur/journal.md`. Référence avant sabotage et arbre après les six : provenance et hygiène PASS.

| # | Sabotage | Fichier | sha256 avant → sabotée → restaurée | Ce que le juge a rendu |
|---|---|---|---|---|
| S1 | « station\/.* » ôté de CHEMINS_APP_PRESTI | proxy.ts | 68284f8adba40213 → dc3ea06f20dfc51e → 68284f8adba40213 | ❌ CL-16 (hygiene) : sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json |
| S2 | la graine de Phaser retirée | moteur/claw3d/OfficePhaserCanvas.tsx | d7280c1a224005dc → 031ae29b169d7723 → d7280c1a224005dc | ❌ CL-6 (verite) : la configuration de Phaser ne porte pas seed: ['station'] |
| S3 | Carte.tsx importe le moteur en statique | Carte.tsx | 6bb5eb97c874e372 → a022938e2587c568 → 6bb5eb97c874e372 | ❌ CL-4 (provenance) : 0 appel de next/dynamic ; import statique de ./moteur/entree |
| S4 | la scène ne s'endort plus (la boucle tourne en continu) | moteur/scene/StationPixelScene.ts | a6a35726f5c3142f → 07453543d310c558 → a6a35726f5c3142f | ❌ CL-9 (repos) : game.loop.frame avance sans cesse |
| S5 | Carte.tsx charge le moteur sans lire le drapeau | Carte.tsx | 6bb5eb97c874e372 → 609470e475b23f1d → 6bb5eb97c874e372 | ❌ CL-4 (provenance) : Carte.tsx ne lit pas actif('stationCarte') |
| S6 | phaser sans version exacte (^3.90.0) | package.json | 6a5f9f2574d82300 → becd8d5fb07d657b → 6a5f9f2574d82300 | ❌ CL-3 (provenance) : "phaser" doit valoir exactement "3.90.0" |

S1 à S4 sont les quatre sabotages de la note du 29/09 (`contre-verif-29-09.md`, faits sur le banc de la livraison avant que le moteur soit posé) : rejoués ici sur la production réelle posée
dans le dépôt, mêmes sha256 (c'est le même fichier), même verdict. S5 et S6 sont ajoutés pour les deux gestes propres à cette fiche (le drapeau et la version exacte de Phaser).

## Correction trouvée par un autre juge (pas par ce verifier) : N16-8

`node scripts/next16-qa.mjs --statique` (026-004) était rouge sur N16-8 avec la livraison telle que posée : `proxy.ts` portait un commentaire de 3 lignes là où l'ancien en avait 2
(le juge retire les commentaires mais garde leurs sauts de ligne, puis compare le corps LIGNE À LIGNE à `middleware-reference.ts`). Le commentaire de `CHEMINS_APP_PRESTI` est ramené à 2 lignes
(le nombre exact de l'ancien ; celui du matcher en a toujours 3) : N16-8 PASS, `next16-qa --statique` PASS N16-1 à N16-3 et N16-8 à N16-11. Aucun juge touché. `appliquer.mjs` porte le même
texte. Les sabotages ci-dessus ont tourné avant ce raccourcissement : CL-16 lit la liste, pas le commentaire ; S1 est rejoué en fin de fiche sur le `proxy.ts` définitif (voir en bas).

## Ce qui n'est pas du moteur : la correction du juge 026-170

Cinq sabotages de la vraie page (`app/controle/station/page.tsx`, bac `sab-170`) et un témoin vert sont dans `sab-170/journal.md` (voir `.orchestre/preuves/026-170/decisions-juges-04-10.md`).
