# Contre-vérification de 026-179 : quatre sabotages réversibles de la production

Le « production » de cette fiche est le moteur de la carte (la livraison de .orchestre/preuves/026-179/livraison/). Il n'est pas posé dans le
dépôt (préalable Phaser, voir en-cours/026-179.question.md) : les sabotages sont faits sur le banc de l'usine (~/bacs/claude-179, voir
banc-usine.log), jamais sur le dépôt. Chaque sabotage est jugé par la partie du juge qui doit le voir, puis la production est restaurée ; les
sha256 (16 premiers caractères) d'avant et d'après sont comparés.

| # | Sabotage | Fichier | sha256 avant → sabotée | Ce que le juge a rendu | Restauration |
|---|---|---|---|---|---|
| S1 | « station/.* » ôté de CHEMINS_APP_PRESTI | proxy.ts | 68284f8adba40213 → dc3ea06f20dfc51e | ❌ CL-16 : CHEMINS_APP_PRESTI ne porte pas l'alternative station/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json | 68284f8adba40213 (identique) |
| S2 | la graine de Phaser retirée de la configuration | moteur/claw3d/OfficePhaserCanvas.tsx | d7280c1a224005dc → 58b85d4ea5aa8c09 | ❌ CL-6 : la configuration de Phaser ne porte pas seed: ['station'] | d7280c1a224005dc (identique) |
| S3 | Carte.tsx importe le moteur en statique | Carte.tsx | 6bb5eb97c874e372 → 1957c6dfe4bd2bab | ❌ CL-4 : Carte.tsx importe ./moteur/entree en statique (le moteur ne se charge que par next/dynamic) | 6bb5eb97c874e372 (identique) |
| S4 | la scène ne s'endort plus (la boucle de Phaser tourne en continu) | moteur/scene/StationPixelScene.ts | a6a35726f5c3142f → 07453543d310c558 | ❌ CL-9 : game.loop.frame avance sans cesse : la boucle de Phaser ne s'endort jamais | a6a35726f5c3142f (identique) |

Après les quatre : provenance et hygiene de nouveau PASS (CL-1 à CL-4, CL-16), puis le verifier complet PASS (banc-usine.log, passage final).

Honnêteté : le premier essai de S1 (expression sed qui ne trouvait rien, sha256 inchangé, donc sabotage nul, le juge est resté vert) a été refait avec
une expression correcte (le résultat ci-dessus). Les journaux bruts : premier lot S1 nul puis S2 à S4 ; S1 rejoué.

## Journal brut : S1 à S4 (S1 nul, voir ci-dessus)

# contre-vérification 2026-10-04T18:36:07Z · bac /home/usine/bacs/claude-179 · 6d146f4a3 + livraison 026-179
## référence, avant tout sabotage
station-claw3d-qa --partie=provenance,hygiene — racine .
✅ CL-1 LICENSE-claw3d.txt (MIT License, Luke The Dev) et PROVENANCE.md (0565b78, lib/avatars/profile.ts, cha
✅ CL-2 28 fichier(s) sous app/controle/station : aucun des fichiers retirés par le §0.3, aucun .glb, rien 
✅ CL-3 542 sources de app/ et lib/ lus : phaser importé seulement par import("phaser") sous app/controle/st
✅ CL-4 Carte.tsx lit actif('stationCarte'), charge moteur/entree par un seul next/dynamic({ ssr: false }), s
✅ CL-16 CHEMINS_APP_PRESTI porte l'alternative station\/.* ; appelé par ts-loader avec un hôte d'artisan f
station-claw3d-qa --partie=provenance,hygiene : PASS
## S1 : proxy.ts sans l'alternative station\/.* (CL-16, hygiene)
── S1 : proxy.ts  sha256 68284f8adba40213 → 68284f8adba40213 (sabotée)
   ✗ le sabotage n'a rien changé
station-claw3d-qa --partie=hygiene — racine .
✅ CL-16 CHEMINS_APP_PRESTI porte l'alternative station\/.* ; appelé par ts-loader avec un hôte d'artisan factice, proxy() rewrite /station/themes/<clé>/theme.json vers la 404 neutre /site/-/introuvable, laisse passer /faq et l'hôte maison
station-claw3d-qa --partie=hygiene : PASS
   ✓ restaurée : sha256 68284f8adba40213 (identique à l'avant)
## S2 : OfficePhaserCanvas.tsx sans la graine de Phaser (CL-6)
── S2 : app/controle/station/moteur/claw3d/OfficePhaserCanvas.tsx  sha256 d7280c1a224005dc → 58b85d4ea5aa8c09 (sabotée)
station-claw3d-qa --partie=verite — racine .
❌ CL-6 la configuration de Phaser ne porte pas seed: ['station'] (Phaser se sème sinon par Date.now() * Math.random())
❌ CL-5 non jugé : CL-6 est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)
❌ CL-7 non jugé : CL-6 est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)
   ✓ restaurée : sha256 d7280c1a224005dc (identique à l'avant)
## S3 : Carte.tsx qui importe le moteur en statique (CL-4)
── S3 : app/controle/station/Carte.tsx  sha256 6bb5eb97c874e372 → 1957c6dfe4bd2bab (sabotée)
station-claw3d-qa --partie=provenance — racine .
❌ CL-4 Carte.tsx importe ./moteur/entree en statique (le moteur ne se charge que par next/dynamic)
station-claw3d-qa --partie=provenance : FAIL — CL-4
   ✓ restaurée : sha256 6bb5eb97c874e372 (identique à l'avant)
## S4 : la scène ne dort jamais, la boucle de Phaser tourne en continu (CL-9, repos)
── S4 : app/controle/station/moteur/scene/StationPixelScene.ts  sha256 a6a35726f5c3142f → 07453543d310c558 (sabotée)
station-claw3d-qa --partie=repos — racine .
❌ CL-9 game.loop.frame avance sans cesse : la boucle de Phaser ne s'endort jamais (rien ne doit se dessiner au repos)
station-claw3d-qa --partie=repos : FAIL — CL-9
   ✓ restaurée : sha256 a6a35726f5c3142f (identique à l'avant)
## après les quatre : arbre restauré, juge de nouveau vert
station-claw3d-qa --partie=provenance,hygiene — racine .
✅ CL-1 LICENSE-claw3d.txt (MIT License, Luke The Dev) et PROVENANCE.md (0565b78, lib/avatars/profile.ts, cha
✅ CL-2 28 fichier(s) sous app/controle/station : aucun des fichiers retirés par le §0.3, aucun .glb, rien 
✅ CL-3 542 sources de app/ et lib/ lus : phaser importé seulement par import("phaser") sous app/controle/st
✅ CL-4 Carte.tsx lit actif('stationCarte'), charge moteur/entree par un seul next/dynamic({ ssr: false }), s
✅ CL-16 CHEMINS_APP_PRESTI porte l'alternative station\/.* ; appelé par ts-loader avec un hôte d'artisan f
station-claw3d-qa --partie=provenance,hygiene : PASS
fin 2026-10-04T18:37:27Z

## Journal brut : S1 rejoué

── S1 rejoué : proxy.ts  sha256 68284f8adba40213 → dc3ea06f20dfc51e (sabotée)
65:const CHEMINS_APP_PRESTI = /^\/(manifest\.webmanifest|sw\.js|hors-ligne(\.html)?|marque\/.*|\.well-known\/.*)$/
station-claw3d-qa --partie=hygiene — racine .
❌ CL-16 CHEMINS_APP_PRESTI ne porte pas l'alternative station\/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« next », rewrite:/site/-/introuvable attendu) : les thèmes ne se servent jamais sur le domaine d'un artisan ; sur un hôte d'artisan, proxy() sert /station/themes/vaisseau/theme.json 
station-claw3d-qa --partie=hygiene : FAIL — CL-16
   ✓ restaurée : sha256 68284f8adba40213 (identique à l'avant)
station-claw3d-qa --partie=hygiene — racine .
station-claw3d-qa --partie=hygiene : PASS
