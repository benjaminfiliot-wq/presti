# Mutations des juges de la station Claw3D (026-191)

## ÉCHECS (17)
- CL-14 le rattrapage de la perte de contexte WebGL retiré : texte « avant » présent 0 fois dans app/controle/station/moteur/claw3d/OfficePhaserCanvas.tsx (une seule attendue) ; mutation non jouée
- CE-13 l’égaliseur de l’écran de l’Expérience perd une barre (moteur/acteurs, 026-183) : fichier absent de la copie (app/controle/station/moteur/acteurs/index.ts) — la fiche qui le livre n'est pas passée ; mutation non jouée
- CE-22 un nom de personne affiché dans l’Observatoire (salle de 026-189) : fichier absent de la copie (app/controle/station/salles/Observatoire.tsx) — la fiche qui le livre n'est pas passée ; mutation non jouée
- TÉMOIN claw3d --partie=verite rouge : code 1 ; critères en échec : CL-5, CL-7, CL-8 ; station-claw3d-qa --partie=verite : FAIL — CL-5, CL-7, CL-8
- FAIL CL-16 — station\/.* retiré de CHEMINS_APP_PRESTI (les thèmes se serviraient sur le domaine d’un artisan) ; proxy.ts ; code 1 : CL-16 en échec pour une raison d'infrastructure, pas pour la faute : « CHEMINS_APP_PRESTI ne porte pas l'alternative station\/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« next », rewrite:/site/-/i… »
- CL-5 un hasard caché (Math["Mat"+"h"].random) qui décale le sprite à l’arrivée : deux pages, deux images : non concluante, le témoin est déjà rouge sur CL-5
- CL-7 un agent sans motif (inactif) est envoyé au Repos : la déduction du prototype remise dans la scène : non concluante, le témoin est déjà rouge sur CL-7
- CL-8 le nombre d’agents peint dans la texture du décor : non concluante, le témoin est déjà rouge sur CL-8
- CL-13 la largeur CSS du canevas n’est plus divisée par la densité (l’échelle comptée en pixels CSS) : non jouée — le budget de 19 min est épuisé
- CE-4 un agent qui prend une tâche ne va plus dans sa salle (tache_prise sans destination) : non jouée — le budget de 19 min est épuisé
- CE-11 une zone [data-salle] ne pose plus ?salle= dans l’adresse : non jouée — le budget de 19 min est épuisé
- CE-16 un nom d’agent rendu en HTML par le calque : non jouée — le budget de 19 min est épuisé
- CE-17 la palette du thème posée sur <html> (:root) au lieu du nœud .mc : non jouée — le budget de 19 min est épuisé
- CE-19 l’aperçu écrit par PUT à chaque changement du brouillon : non jouée — le budget de 19 min est épuisé
- CE-24 touch-action: none retiré du cadre de la carte au téléphone : non jouée — le budget de 19 min est épuisé
- PN-2 la salle réservée absente de la planche (docs/station/grille.json) : non jouée — le budget de 19 min est épuisé
- PN-6 un chiffre peint dans le décor de la planche (la planche vit dans l’atelier, hors du dépôt) : non jouée — le budget de 19 min est épuisé

## Témoins (copie intacte)
- claw3d --partie=provenance : témoin vert en 1 s
- claw3d --partie=verite : témoin rouge (code 1 ; CL-5, CL-7, CL-8) en 179 s
- claw3d --partie=grille : témoin vert en 1 s
- claw3d --partie=hygiene : témoin vert en 0 s
- themes --partie=modules : témoin vert en 4 s
- themes --theme=station : témoin vert en 2 s
- ecommerce  : témoin vert en 0 s
- claw3d --partie=repos : témoin vert en 38 s
- claw3d --partie=garde : témoin vert en 19 s
- claw3d --partie=csp : témoin vert en 21 s
- claw3d --partie=poids : témoin vert en 144 s

## Mutations
- NON JOUÉE CL-14 — le rattrapage de la perte de contexte WebGL retiré ; ancre présente 0 fois dans app/controle/station/moteur/claw3d/OfficePhaserCanvas.tsx
- NON JOUÉE CE-13 — l’égaliseur de l’écran de l’Expérience perd une barre (moteur/acteurs, 026-183) ; app/controle/station/moteur/acteurs/index.ts absent
- NON JOUÉE CE-22 — un nom de personne affiché dans l’Observatoire (salle de 026-189) ; app/controle/station/salles/Observatoire.tsx absent
- PASS CL-1 — la notice MIT de LICENSE-claw3d.txt perd son corps (« Permission is hereby granted… ») ; app/controle/station/moteur/claw3d/LICENSE-claw3d.txt ; FAIL CL-1 — LICENSE-claw3d.txt n'a pas le corps de la licence MIT (« Permission is hereby granted… »)
- PASS CL-3 — Phaser importé en statique dans app/controle/layout.tsx (toute la console le chargerait) ; app/controle/layout.tsx ; FAIL CL-3 — app/controle/layout.tsx importe phaser hors de app/controle/station/moteur/ (il chargerait Phaser bien au-delà de la carte)
- PASS CL-6 — un Phaser.Math.Between dans la scène (reveil()) ; app/controle/station/moteur/scene/StationPixelScene.ts ; FAIL CL-6 — app/controle/station/moteur/scene/StationPixelScene.ts : Phaser.Math.Between (le moteur ne tire rien au hasard et ne lit aucune horloge)
- PASS CL-15 — destinations() range la porte de la salle réservée parmi les destinations ; app/controle/station/moteur/grille/grille.ts ; FAIL CL-15 — la salle réservée (ecommerce) est une destination ou un poste (destinations()) ; destinations() rend 21 portes et 20 postes, 20 attendus (un par salle non réservée)
- FAIL CL-16 — station\/.* retiré de CHEMINS_APP_PRESTI (les thèmes se serviraient sur le domaine d’un artisan) ; proxy.ts ; code 1 : CL-16 en échec pour une raison d'infrastructure, pas pour la faute : « CHEMINS_APP_PRESTI ne porte pas l'alternative station\/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« next », rewrite:/site/-/i… »
- PASS TH-3 — validerDisposition accepte la salle réservée déplacée ; lib/pilotage/disposition.ts ; FAIL TH-3 — « reservee-deplacee » refusée pour une autre raison : « L'emplacement réservé (ecommerce) n'accueille aucune autre salle : Radar ne peut pas y si… » (attendu : /réservée.*ne se déplace pas|ne se déplace pas/) ; « reservee-deplacee-sans-echange » acceptée (elle doit l'être refusée : réservée|déplace)
- PASS TH-6 — appliquerReglages pose aussi les jetons sur document.documentElement ; lib/pilotage/reglages.ts ; FAIL TH-6 — « réglages posés » : écriture hors du nœud passé (documentElement.style --mc-fond, documentElement.style --mc-sol) : jamais sur document.documentElement ni body ; « aucun réglage » : écriture hors du nœud passé (documentElement.style --mc-fond, documentElement.style --mc-sol) : jamais sur document.documentElement ni body ; « réglages hostiles (non validés) » : écriture hors du nœud passé (documentElement.style --mc-fond, documentElement.style --mc-sol) : jamais sur document.documentElement ni body
- PASS TH-9 — un thème de 800 Kio (blancs ajoutés dans licence.json : le poids du dossier dépasse 700 Kio) ; public/station/themes/station/licence.json ; FAIL TH-9 — le thème pèse 815 Kio, 700 Kio au plus (le plus lourd : licence.json)
- PASS TH-10 — un pack hors du lot A cité dans licence.json ; public/station/themes/station/licence.json ; FAIL TH-10 — pack 2 : « 99-hors-du-lot-a » est hors du lot A (10 dossiers de ~/station-assets)
- PASS EC-1 — le drapeau ecommerce levé ; lib/flags.ts ; FAIL EC-1 — « ecommerce: true, » : « ecommerce: false, » attendu ; FLAGS.ecommerce vaut true et actif('ecommerce') true : false et false attendus
- PASS EC-4 — une table ecommerce créée par une migration (le fichier app/api/ecommerce/route.ts ne se plante pas par un remplacement de texte) ; supabase/migrations/0124_automatisme_sous_gardes.sql ; FAIL EC-4 — supabase/migrations/0124_automatisme_sous_gardes.sql : une table ou un objet « ecommerce »
- NON CONCLUANTE CL-5 — un hasard caché (Math["Mat"+"h"].random) qui décale le sprite à l’arrivée : deux pages, deux images ; le témoin échoue déjà sur CL-5 (critère non rejoué intact)
- NON CONCLUANTE CL-7 — un agent sans motif (inactif) est envoyé au Repos : la déduction du prototype remise dans la scène ; le témoin échoue déjà sur CL-7 (critère non rejoué intact)
- NON CONCLUANTE CL-8 — le nombre d’agents peint dans la texture du décor ; le témoin échoue déjà sur CL-8 (critère non rejoué intact)
- PASS CL-9 — le pont est appelé à chaque lecture : la signature n’est plus comparée ; app/controle/station/moteur/adaptateur/index.ts ; FAIL CL-9 — le pont (OfficeSceneBridge) a été appelé 5 fois pendant 4 lectures du fil et 1 de direct aux réponses identiques : aucun appel n'est permis au repos
- PASS CL-10 — <Carte /> monté avant la réponse de vue=direct ; app/controle/station/Station.tsx ; FAIL CL-10 — avant la première réponse 200 de vue=direct (2713 ms après le chargement, la réponse attend 3,5 s) : <Carte /> est monté (cadre : 1, canevas : 0) ; vue=direct refusé (403) : la page demande un morceau de Phaser (/_next/static/chunks/30010d44.de4a2a05367191ac.js)
- PASS CL-11 — un fetch vers un hôte externe au montage de la carte ; app/controle/station/moteur/entree.tsx ; FAIL CL-11 — 1 événement(s) securitypolicyviolation (« connect-src https://cdn.example.net/station.js ») ; la console signale un refus de la CSP : console : Connecting to 'https://cdn.example.net/station.js' violates the following Content Security Policy directive: …
- PASS CL-12 — Phaser importé par la page /controle (hors station) ; app/controle/page.tsx ; FAIL CL-12 — /controle/station ne pèse que 59 Kio de plus que /controle : Phaser (≈ 307 Kio en gzip) n'est pas chargé avec la carte, la mesure ne prouve rien ; /controle charge un morceau de Phaser (/_next/static/chunks/30010d44.de4a2a05367191ac.js) : Phaser ne doit se charger qu'avec la carte
- NON JOUÉE CL-13 — la largeur CSS du canevas n’est plus divisée par la densité (l’échelle comptée en pixels CSS) ; budget épuisé
- NON JOUÉE CE-4 — un agent qui prend une tâche ne va plus dans sa salle (tache_prise sans destination) ; budget épuisé
- NON JOUÉE CE-11 — une zone [data-salle] ne pose plus ?salle= dans l’adresse ; budget épuisé
- NON JOUÉE CE-16 — un nom d’agent rendu en HTML par le calque ; budget épuisé
- NON JOUÉE CE-17 — la palette du thème posée sur <html> (:root) au lieu du nœud .mc ; budget épuisé
- NON JOUÉE CE-19 — l’aperçu écrit par PUT à chaque changement du brouillon ; budget épuisé
- NON JOUÉE CE-24 — touch-action: none retiré du cadre de la carte au téléphone ; budget épuisé
- NON JOUÉE PN-2 — la salle réservée absente de la planche (docs/station/grille.json) ; budget épuisé
- NON JOUÉE PN-6 — un chiffre peint dans le décor de la planche (la planche vit dans l’atelier, hors du dépôt) ; budget épuisé

Bilan : 14/30 mutations prises sur leur critère nommé, en 18.7 min (budget 19 min).
