# Notes du juge (lot k, fiche 026-170)

Écrit par le sous-agent « juge » le 30/09 (`scripts/station-claw3d-qa.mjs` et les aides `k/juge-*.mjs`). `CONTRAT.md` n'est pas modifié ;
ce qu'il laissait ouvert, ou ce que le témoin a précisé, est tranché ici. Le moteur réel (026-179 à 026-186) doit respecter ces points :
les juges de rendu n'y lisent que ceci.

## 1. Regroupement des seize critères et ordre du jugement

Quatre entrées de `lot.mjs`, chacune d'au moins trois critères, chacune dont le PREMIER critère échoue sur la référence sans serveur
ni navigateur :

| Entrée (`--partie=`) | Critères, dans l'ordre où le juge les rend | `attendu` | `criteresMin` |
|---|---|---|---|
| `provenance` | CL-1 CL-2 CL-3 CL-4 | CL-1 | 4 |
| `verite,grille` | CL-6 CL-15 CL-5 CL-7 CL-8 | CL-6 | 5 |
| `repos,garde,pixel,contexte` | CL-9 CL-10 CL-13 CL-14 | CL-9 | 4 |
| `hygiene,csp,poids` | CL-16 CL-11 CL-12 | CL-16 | 3 |

Le juge lit d'abord ce qui se lit (provenance, CL-6, CL-15, CL-16 : aucun serveur, aucun navigateur), puis mesure. Un critère rouge
parmi ceux qui se lisent suffit : le rendu n'est pas lancé et ses critères sont rendus « non jugés » (rouges, comme tout critère jamais
évalué). Sans moteur (`app/controle/station/moteur/entree.tsx` absent) chaque critère de rendu dit « moteur absent » et rien n'est
construit. Dans la fiche, `verite` regroupait CL-5..8 et `grille` CL-15 ; l'ordre d'affichage n'est plus celui des numéros.

## 2. Ce que le juge exige du moteur en plus de CONTRAT.md

1. **Le jeu** : au moins un `new Phaser.Game(…)` sous `moteur/` (le juge le réécrit, dans sa COPIE, en
   `((globalThis as unknown as Record<string, unknown>).__stationGame = new Phaser.Game(…))` : la forme sans `as` ne compile pas sous
   `next build`, TS7017). Sans lui : « aucun `new Phaser.Game(` sous moteur/ », tous les critères de rendu rouges.
2. **Le pont** : `moteur/claw3d/OfficeSceneBridge.ts` exporte la classe nommée `OfficeSceneBridge` (méthodes sur le prototype) ; le juge la
   renomme `OfficeSceneBridge.orig.ts` dans sa copie et pose une enveloppe qui compte chaque appel (`globalThis.__stationPontAppels`).
3. **La grille** (CL-15) : `moteur/grille/grille.ts`, module pur (ni Phaser ni DOM), chargeable par Node 22 sans transpileur
   (`import type` pour les types), exporte `construireGrille(theme)`, `astar2D(grille, de, vers)` (chemin en cases, haut-gauche en
   pixels, départ exclu, `null` si inatteignable), `destinations(theme)` → `{ salles, postes }` (sans la salle réservée) et
   `tapisContinu(theme)`. Le juge joue le thème d'essai dessus depuis le poste du Commandement : chaque porte et chaque poste, chemins
   continus à quatre voisins, aucune case du rectangle réservé joignable, la réservée absente de `destinations`.
4. **Le décor** (CL-8) : les écrans sont `[data-ecran="<salle>"]` (un par salle non réservée, texte « — »), dans le DOM, cachés à la vue
   par un style « lecteur d'écran » (jamais `display:none`). La texture du décor, si elle s'appelle `decor`
   (`__stationGame.textures.get('decor').getSourceImage().toDataURL()`), est comparée octet pour octet entre quatre jeux de données ; sinon
   le juge compare les clichés du canevas de quatre pages (jeu vide, jeu vide autre, deux jeux chargés aux chiffres et textes tous
   différents). Le mot « — » doit figurer dans une chaîne de `moteur/`.
5. **La CSP** (CL-11) : les requêtes admises sont le document `/controle/station`, `/api/controle/station?vue=…`,
   `/api/controle/tresorerie`, `/api/controle/station/reglages`, `/station/themes/(station|vaisseau|essai)/…`, `/_next/static/…`,
   `/favicon.ico`, `/icon*`, `/apple-icon*`, l'hôte Supabase factice (`127.0.0.1:9`, intercepté) et les URL `data:` / `blob:`. Tout le
   reste est signalé : si la page réelle a besoin d'une requête de plus, on l'ajoute à `AUTORISEES` de `k/juge-rendu.mjs` par une décision
   écrite, pas dans le moteur.
6. **Le poids** (CL-12) : le juge construit DEUX arbres avec la même commande que `npm run build` (`next build --webpack`) : la copie
   jugée, et la même copie où `Carte.tsx` est remplacé par un cadre vide (« le même moteur absent » de la contre-revue D4 ; aucun
   commit d'avant 026-179 n'existe dans la référence du lot). Il mesure dans le navigateur, en gzip niveau 9, les `.js` réellement
   demandés de `/controle/station`, `/controle`, `/site/essai-artisan` et `/p/essai-artisan`. Il exige aussi que
   `/controle/station − /controle` pèse au moins 100 Kio : sinon Phaser n'est pas chargé avec la carte et la mesure ne prouve rien.
7. **La perte de contexte** (CL-14) : `WEBGL_lose_context.loseContext()` sur le canevas, SANS jamais le rendre (Phaser sait se restaurer seul : un moteur qui ne fait qu'attendre passerait ; il doit se rebâtir, en WebGL neuf ou en rendu Canvas) ; la carte doit être de nouveau dessinée (canevas non uniforme, décodé par le juge) dans les 5 s ET redessiner un NOUVEL état servi ensuite (un cliché d'un canevas perdu garde la dernière image : seul un état neuf prouve le retour ; constaté sous Chromium : un moteur qui ne fait que `preventDefault` survit, le juge ne peut donc pas le sanctionner), le
   miroir garder le même nombre de personnages, aucune `pageerror`. Le juge cherche à chaque fois le canevas dans
   `[data-station-carte]` : un moteur qui en rebâtit un (rendu Canvas) est accepté. Sans contexte WebGL possible : préalable (code 2).
8. **Le repos** (CL-9) : baseline prise quand `game.loop.frame` est figé (il doit se figer dans les 20 s), puis attente, à la vraie
   cadence, d'au moins 3 lectures du fil et d'1 de `direct` (75 s au plus) aux réponses identiques : `frame`, appels du pont et
   empreinte du canevas ne bougent pas.
9. **La vérité** (CL-5, CL-7) : `evenements.json` rejoué sur deux pages neuves EN PARALLÈLE (les chemins comparés sont, par
   personnage, la suite des positions `(x,y)` relevées dans le miroir par un MutationObserver posé par le juge ; les états
   intermédiaires — un motif qui arrive une lecture avant une bulle — n'en font pas partie car ils dépendent de la cadence de la
   station) et une empreinte du canevas par étape, prise sur une scène figée (deux clichés successifs identiques). CL-7 compare le miroir
   à `attendu`, exige que ceux qui marchent soient exactement `marche`, que « Zz » et bulles soient ceux du fil servi, que seul le motif
   « pause » mène au Repos, et, après une pause, 3 s de silence (journal, canevas, `game.loop.frame`).
10. **La garde** (CL-10) : trois pages neuves (sans session ; session avec `vue=direct` retenu 3,5 s ; session avec `vue=direct` refusé
    en 403) : ni morceau de Phaser (les fichiers du build dont le contenu porte `https://phaser.io`), ni canevas, ni `[data-station-carte]`
    avant la première réponse 200.
11. **CL-3** : `import("phaser")` dynamique est admis sous `moteur/` seulement ; tout import de phaser (même dynamique) ailleurs dans
    `app/` ou `lib/` est rouge (un module partagé qui le charge charge Phaser sur toute la console). `import type … from 'phaser'` est
    effacé à la compilation et admis.
12. **CL-16** : proxy.ts est chargé par un crochet de résolution (`next/server` doublé) et appelé avec l'hôte `artisan-essai.exemple.invalid` :
    `/station/themes/station/theme.json` et `/vaisseau/` doivent être réécrits vers `/site/-/introuvable`, `/faq` passer, le manifeste
    rester refusé, l'hôte maison `127.0.0.1` servir les thèmes.

## 3. Build, copie, cache

- L'arbre jugé est copié sous `.orchestre/travail/station-claw3d-qa/prep/` puis rangé dans `cache-builds/<sha256 du contenu>/arbre`
  (le cache garde les 12 builds les plus récents) ; `app/` est élagué à `controle`, `p`, `site` et ce que ceux-là importent de `app/` (le
  build passe de 90 s à 45 s) ; `public/` est un dossier réel dont chaque entrée est un lien (Serwist y écrit `sw.js`) ; `node_modules`
  est un lien. Les drapeaux `pilotage` ET `stationCarte` sont levés dans la copie de `lib/flags.ts` (exactement un `…: false` de chaque,
  sinon rouge).
- Aucun réseau au build : les polices Google (`next/font/google` du layout racine) sont simulées par `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`
  (un module qui rend un `@font-face` par sous-ensemble). L'environnement des processus enfants est réduit : `PATH`, `HOME`, le piège
  réseau de la preuve, et des `NEXT_PUBLIC_*` factices (ceux de `session-simulee.mjs`).
- Chromium : celui de Playwright, sinon un `chromium*` de `/opt/pw-browsers` ou de `~/.cache/ms-playwright` (le Playwright du dépôt
  attend `chromium_headless_shell-1243` : cette machine n'a que la 1194) ; WebGL logiciel (`--use-angle=swiftshader`), résolution de
  noms fermée hors de la boucle locale.

## 4. Où il tourne, quoi ne fait-il pas

- Sur l'usine (`os.hostname() === 'presti-usine'`) ou avec `PRESTI_JUGE_LOCAL=1` : sur place. Ailleurs, sans `--racine` ni `--temoin`, et
  si `scripts/usine.mjs` et `~/.ssh/presti-usine` existent : relance par `usine.mjs executer --nom=claw3d`, sortie et code rendus tels
  quels (aucun verdict : code 2). Sans usine.mjs ou sans la clé (le cloud) : sur place. Avec `--racine` ou `--temoin` : sur place, l'usine ne
  voit pas l'arbre. Aucun `verifier` ne lance `scripts/usine.mjs`.
- Écrit sous `.orchestre/travail/station-claw3d-qa/` seulement (copies, builds, arbre témoin). Ne lit ni `.env.local` ni aucune clé.

## 5. Ce qui diffère de la fiche

- « Phaser importé dans `app/controle/layout.tsx` » (JK-3) : `layout.tsx` est le fichier de la référence, qu'un sabotage du témoin ne
  touche pas. Le sabotage `phaser-charge-partout` charge Phaser (`import('phaser')` gardé par `typeof window`) depuis `lib/flags.ts`, que le
  témoin possède et que la console, le site et la page publique importent : CL-3 (statique) et CL-12 (Phaser sur `/controle`) le voient.
- JK-2 « un témoin posé sous une autre partie la fait échouer » : le témoin est un arbre unique, pas un dossier par partie ; chaque
  entrée a ses sabotages, chacun échoue sur SA partie et passe les autres.
- Pour CL-4, le cadre d'attente du drapeau baissé est reconnu à `SALLES`, `data-liste-salles` ou `data-station-attente` (le témoin ne
  reprend pas la liste des salles de `c/temoin`).

## 6. Ce qui a été exécuté (30/09)

`node scripts/juges-026-pilotage-preuve.mjs --lot=k` : PASS (JA-1 à JA-10), 21 min 28 s avec le cache de builds chaud (une première
passe à froid : 31 min). Le témoin du lot k a été jugé par ce juge : les quatre entrées rendent 0 (CL-1 à CL-16 verts), et chacun des
19 sabotages de `lot.mjs` est vu. JA-5 compare `git status` avant et après : il rougit si une autre session touche le dépôt pendant les
~20 minutes de la preuve (constaté deux fois, sur des fichiers d'autres lots). JA-10 a besoin du commit 4041ec9 dans le clone.
