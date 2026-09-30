# Rapport de tournage et mesures — Tâche 021-14

## 1. Contexte et configuration matérielle
- **Machine d'exécution** : Windows 11, GPU intégré Intel UHD Graphics.
- **Rendu WebGL / GPU** : `ANGLE (Intel, Intel(R) UHD Graphics (0x00004628) Direct3D11 vs_5_0 ps_5_0, D3D11)`.

## 2. Analyse de la cadence (rafP95Ms) et stratégie de tournage
- **Passe 1 (Télémétrie en direct sans capture)** :
  - **Natif** : `rafP95Ms = 16.7 ms` (<= 25 ms).
  - **Lenis** : `rafP95Ms = 16.7 ms` (<= 25 ms).
- **Passe 2 (Tournage image par image en temps virtuel)** : Capture de 360 images (12,0 secondes à 30 ips) avec pilotage précis de `window.lenis.raf(t)` et encodage direct par pipe ffmpeg.
  - Durée exacte : 12,0 s pour `natif.mp4` et `lenis.mp4`.
  - Synchronisation parfaite dans `cote-a-cote.mp4`.

## 3. Défilement natif Chrome (lisseNatif)
- Test avec `--enable-smooth-scrolling` activé.
- Position `scrollY` relevée 50 ms après émission d'un cran de molette de 100 px : `lisseNatif = false`.

## 4. Visibilité et fluidité de Lenis (LN-5)
- **Programme de molette** : 6 gestes de 4 crans de 100 px (tous |dy| <= 120 px), espacés de 60 ms au sein d'un geste.
- **Comportement Lenis** :
  - Lenis interpole le défilement avec `lerp: 0.1`.
  - Moins de 5% d'images figées pendant les gestes (seuil max 25%).
- **Temps d'arrêt** :
  - Natif : `16 ms`.
  - Lenis : `2198 ms` (lenis.arretMs > natif.arretMs vérifié).

## 5. Livrables produits
- `.orchestre/preuves/021-14/natif.mp4`
- `.orchestre/preuves/021-14/lenis.mp4`
- `.orchestre/preuves/021-14/cote-a-cote.mp4`
- `.orchestre/preuves/021-14/planche.jpg`
- `.orchestre/preuves/021-14/mesures.json`
- `.orchestre/preuves/021-14/tournage.mjs`
- `.orchestre/preuves/021-14/lenis.min.js`
- `.orchestre/preuves/021-14/rapport.md`
