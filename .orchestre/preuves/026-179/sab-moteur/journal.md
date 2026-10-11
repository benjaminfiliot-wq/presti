# Sabotages de la production de 026-179 (bac sab-179, 2026-10-04T21:01:49Z)

## Référence avant sabotage : code 0
```
✅ CL-1 LICENSE-claw3d.txt (MIT License, Luke The Dev) et PROVENANCE.md (0565b78, lib/avatars/profile.ts, chaque fichier de claw3d/)
✅ CL-2 51 fichier(s) sous app/controle/station : aucun des fichiers retirés par le §0.3, aucun .glb, rien de server/ ni de src/app/api/, aucune classe Tailwind dans moteur/
✅ CL-3 586 sources de app/ et lib/ lus : phaser importé seulement par import("phaser") sous app/controle/station/moteur/, aucun import interdit sous app/controle/station/, 0 fetch( (moteur/theme/ch
✅ CL-4 Carte.tsx lit actif('stationCarte'), charge moteur/entree par un seul next/dynamic({ ssr: false }), sans import direct de moteur/claw3d/, et garde son cadre d'attente
✅ CL-16 CHEMINS_APP_PRESTI porte l'alternative station\/.* ; appelé par ts-loader avec un hôte d'artisan factice, proxy() rewrite /station/themes/<clé>/theme.json vers la 404 neutre /site/-/intro
station-claw3d-qa --partie=provenance,hygiene : PASS
```

## S1 « station\/.* » ôté de CHEMINS_APP_PRESTI : ✓
- fichier : `proxy.ts` ; sha256 68284f8adba40213 → dc3ea06f20dfc51e (sabotée) → 68284f8adba40213 (restaurée)
- juge : `station-claw3d-qa --partie=hygiene` : code 1, motif attendu CL-16
```
❌ CL-16 CHEMINS_APP_PRESTI ne porte pas l'alternative station\/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« next », rewrite:/site/-/introuvable attendu) : les thèmes ne se servent jamais sur le domaine d'un artisan ; sur un hôte d'artisan, proxy() sert /station/themes/vaisseau/theme.json (« next »)
station-claw3d-qa --partie=hygiene : FAIL — CL-16
```

## S2 la graine de Phaser ôtée : ✓
- fichier : `app/controle/station/moteur/claw3d/OfficePhaserCanvas.tsx` ; sha256 d7280c1a224005dc → 031ae29b169d7723 (sabotée) → d7280c1a224005dc (restaurée)
- juge : `station-claw3d-qa --partie=verite` : code 1, motif attendu CL-6
```
❌ CL-6 la configuration de Phaser ne porte pas seed: ['station'] (Phaser se sème sinon par Date.now() * Math.random())
❌ CL-5 non jugé : CL-6 est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)
❌ CL-7 non jugé : CL-6 est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)
❌ CL-8 non jugé : CL-6 est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)
station-claw3d-qa --partie=verite : FAIL — CL-6, CL-5, CL-7, CL-8
```

## S3 Carte.tsx importe le moteur en statique : ✓
- fichier : `app/controle/station/Carte.tsx` ; sha256 6bb5eb97c874e372 → a022938e2587c568 (sabotée) → 6bb5eb97c874e372 (restaurée)
- juge : `station-claw3d-qa --partie=provenance` : code 1, motif attendu CL-4
```
❌ CL-4 Carte.tsx : 0 appel(s) de next/dynamic (un seul attendu) ; Carte.tsx importe ./moteur/entree en statique (le moteur ne se charge que par next/dynamic)
station-claw3d-qa --partie=provenance : FAIL — CL-4
```

## S4 la scène ne s'endort plus : ✓
- fichier : `app/controle/station/moteur/scene/StationPixelScene.ts` ; sha256 a6a35726f5c3142f → 07453543d310c558 (sabotée) → a6a35726f5c3142f (restaurée)
- juge : `station-claw3d-qa --partie=repos` : code 1, motif attendu CL-9
```
❌ CL-9 game.loop.frame avance sans cesse : la boucle de Phaser ne s'endort jamais (rien ne doit se dessiner au repos)
station-claw3d-qa --partie=repos : FAIL — CL-9
```

## S5 Carte.tsx charge le moteur sans lire le drapeau stationCarte : ✓
- fichier : `app/controle/station/Carte.tsx` ; sha256 6bb5eb97c874e372 → 609470e475b23f1d (sabotée) → 6bb5eb97c874e372 (restaurée)
- juge : `station-claw3d-qa --partie=provenance` : code 1, motif attendu CL-4
```
❌ CL-4 Carte.tsx ne lit pas actif('stationCarte')
station-claw3d-qa --partie=provenance : FAIL — CL-4
```

## S6 phaser sans version exacte (^3.90.0) : ✓
- fichier : `package.json` ; sha256 6a5f9f2574d82300 → becd8d5fb07d657b (sabotée) → 6a5f9f2574d82300 (restaurée)
- juge : `station-claw3d-qa --partie=provenance` : code 1, motif attendu CL-3
```
❌ CL-3 package.json : "phaser" doit valoir exactement "3.90.0" (trouvé "^3.90.0")
station-claw3d-qa --partie=provenance : FAIL — CL-3
```

## Après les six : arbre restauré, provenance et hygiène : code 0
```
✅ CL-1 LICENSE-claw3d.txt (MIT License, Luke The Dev) et PROVENANCE.md (0565b78, lib/avatars/profile.ts, chaque fichier de claw3d/)
✅ CL-2 51 fichier(s) sous app/controle/station : aucun des fichiers retirés par le §0.3, aucun .glb, rien de server/ ni de src/app/api/, aucune classe Tailwind dans moteur/
✅ CL-3 586 sources de app/ et lib/ lus : phaser importé seulement par import("phaser") sous app/controle/station/moteur/, aucun import interdit sous app/controle/station/, 0 fetch( (moteur/theme/ch
✅ CL-4 Carte.tsx lit actif('stationCarte'), charge moteur/entree par un seul next/dynamic({ ssr: false }), sans import direct de moteur/claw3d/, et garde son cadre d'attente
✅ CL-16 CHEMINS_APP_PRESTI porte l'alternative station\/.* ; appelé par ts-loader avec un hôte d'artisan factice, proxy() rewrite /station/themes/<clé>/theme.json vers la 404 neutre /site/-/intro
station-claw3d-qa --partie=provenance,hygiene : PASS
```
