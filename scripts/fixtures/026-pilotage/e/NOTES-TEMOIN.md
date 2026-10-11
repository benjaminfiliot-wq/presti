# Notes du témoin du lot e (fiche 026-172)

Écrit par Claude Code le 04/10. Le témoin est ce que la preuve (`juges-026-pilotage-preuve.mjs --lot=e`) pose sur la référence pour montrer que le juge d'écran SAIT être vert, et sur lequel elle joue ses sabotages. Ce n'est pas le moteur de la carte (026-179 à 026-186) : il ne fait que ce que les parties du juge mesurent, et il ne peut pas servir de moteur.

## Pourquoi un témoin sans Phaser, chargé à l'exécution

- **Pas de Phaser** : `phaser` 3.90.0 n'est dans `package.json` que depuis 026-179 et n'est pas installé sur le PC (jamais de `npm install` ici). Le témoin dessine sur un `<canvas>` 2D et expose un FAUX jeu, `globalThis.__stationGame`, qui ne porte que ce que le juge lit : `loop.frame` (le compteur d'images, qui cesse de croître quand la boucle dort), `canvas`, et `textures.get('decor').getSourceImage()` (le décor). Le juge, lui, instrumente `new Phaser.Game(` dans la copie du vrai moteur : ce que le moteur réel doit exposer est dans `CONTRAT.md`.
- **Chargé à l'exécution** : `moteur/entree.tsx` (le seul module que `Carte.tsx` charge) fait `import(/* webpackIgnore: true */ '/temoin-e/index.js')` : les modules de `public/temoin-e/` ne sont pas dans le bundle. Un seul `next build` sert donc toute la preuve (une minute sur l'usine) ; chaque sabotage réécrit un fichier de `public/temoin-e/` et le serveur, relancé par le juge, le sert tel quel. (Le préfixe `/station/` est fermé par les interceptions de la session simulée : d'où `/temoin-e/`.)

## Un module par partie, moins de 300 lignes chacun

| Module | Parties qui le lisent | Ce qu'il fait |
|---|---|---|
| `coeur.js` | verite, themes | le thème (`/station/themes/<clé>/theme.json`), la toile à l'échelle entière, la boucle qui dort, les acteurs posés d'après les positions servies, la marche à vitesse unique (80 pixels par SECONDE : la marche dure autant sous charge), le miroir, la bulle, « Zz », le halo, l'étincelle, l'antenne (2 s par bulle nouvelle du Radar ou du Veilleur), la nuit (le décor redessiné une fois) |
| `camera.js` | camera | zoom ×1 à ×3, ⊞, glissé borné, croix, survol, cadre blanc, vingt zones et la réservée, Échap |
| `acteurs.js` | acteurs | le tapis, un carré et un « +1 » par vrai changement d'étape, les lignes, l'égaliseur figé, l'écran de l'Expérience, les badges |
| `calque.js` | calque | plaques, noms, textes en `textContent` (jamais du HTML), l'info-bulle (survol et focus) |
| `telephone.js` | webkit | le cadre de 358 px, `touch-action: none`, `gesturestart` bloqué, +, − et ⊞ de 44 px, les plaques à partir de ×2 |
| `reglages.js` | reglages | le panneau `?vue=reglages` (aperçu sans écriture, un `PUT`, Annuler, thème par défaut, Historique, Rétablir, 409, refus de disposition) |
| `salles.js` | salles2 | les panneaux des salles nouvelles (et un panneau minimal pour `recettes`) avec `[data-resume-salle]`, la touche I |
| `index.js` | — | monte les sept modules |

Le témoin n'a ni atlas, ni image, ni police, ni coursives, ni code de Claw3D ou de l'atelier (`controles.mjs` le relit : `controleTemoin`). Le thème Station du témoin (`public/station/themes/station/theme.json`) est celui du schéma de 026-170 : ce n'est pas celui que livrera 026-185.

## Ce que la preuve en tire

Chaque entrée de `lot.mjs` rend 0 sur la référence + témoin, et chacun de ses sabotages (un texte d'un module devient une faute : boucle qui ne dort plus, bulle tronquée, antenne sur des lectures identiques, zoom non borné, `touch-action` libre, deux carrés pour un « +1 », plaque en HTML, aperçu qui écrit, euros à 0, panneau trop large…) est pris par le critère `tue` nommé, le témoin rétabli octet pour octet après chaque passage.
