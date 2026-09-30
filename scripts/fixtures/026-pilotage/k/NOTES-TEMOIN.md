# Notes du témoin (lot k, fiche 026-170)

Écrit par le sous-agent « témoin » le 30/09. Ce que le juge (`station-claw3d-qa.mjs`) doit savoir du témoin et des fixtures.
`CONTRAT.md` n'a pas été modifié ; les points qu'il laissait ouverts sont tranchés ici, au plus simple.

## 1. Poser le témoin

`k/temoin/` porte les 19 fichiers du témoin, chacun au chemin du dépôt suivi de `.temoin`. Poser = copier chaque fichier
sans le suffixe sur l'arbre de référence (`1c87006`, qui ne contient ni `app/controle/station/`, ni `lib/pilotage/station.ts`,
ni `lib/avatars/`). Trois fichiers sont ceux de la référence à une ligne près (octet pour octet sinon, vérifié par `diff`) :

| Fichier | Ligne ajoutée |
|---|---|
| `package.json.temoin` | `"phaser": "3.90.0",` (après `nodemailer`) |
| `lib/flags.ts.temoin` | `stationCarte: false,` et son commentaire « carte Claw3D de la station, levée par 026-193 après sa recette » (après `pilotage`) |
| `proxy.ts.temoin` | l'alternative `station\/.*` dans `CHEMINS_APP_PRESTI` (le fichier s'appelle `proxy.ts` à la référence, pas `middleware.ts`) |

Pour rendre la page : lever `pilotage` (le juge le fait déjà) **et** `stationCarte` dans la COPIE (`direction` est déjà levé
à la référence, et `app/controle/layout.tsx` en a besoin). `pilotage: false,` et `stationCarte: false,` n'apparaissent
chacun qu'une fois dans `lib/flags.ts.temoin`.

Le témoin passe `npm run typecheck` (tsc, 0 erreur) sur la référence, drapeaux baissés comme levés. `scripts/fixtures/**/temoin`
est exclu du typage du dépôt (`tsconfig.json`), et les fichiers portent `.temoin` : rien ne les compile en place.

## 2. Tailles

Aucun fichier de code n'atteint 300 lignes (le plus long : `moteur/grille/grille.ts`, 110). Quatorze fichiers de code, ~700
lignes en tout : `Carte.tsx` 24, `Station.tsx` 58, `page.tsx` 8, `moteur/entree.tsx` 42, `moteur/adaptateur.ts` 53,
`moteur/types.ts` 36, `moteur/claw3d/OfficeSceneBridge.ts` 25, `moteur/scene/{hote 72, scene 98, decor 34}.ts`,
`moteur/calque/calque.ts` 82, `moteur/grille/grille.ts` 110, `moteur/theme/charger.ts` 20, `lib/avatars/profile.ts` 9.
Aucun code de Claw3D ni de l'atelier : `PROVENANCE.md` est un tableau factice (deux lignes) qui le dit.

## 3. Décisions de contrat (là où `CONTRAT.md` se taisait)

1. **Le thème vient de `reglages.theme`.** `Station.tsx` lit `GET /api/controle/station/reglages` avec `vue=direct` (en
   parallèle) et passe `reglages.reglages` à `<Carte />` ; le moteur charge `/station/themes/<cle>/theme.json`, `cle` prise
   dans la liste fermée `station|vaisseau|essai` (sinon `station`). Aucun `URLSearchParams`. La session simulée sert donc
   `reglages.theme = 'essai'` : le juge n'a rien d'autre à faire pour que la carte charge le thème d'essai.
2. **`Station.tsx` n'appelle pas `fetch(`** : il passe par `apiDirection` de `app/controle/client.ts` (qui pose l'en-tête
   `Authorization: Bearer`, après `supabase.auth.getSession()`). Sous `app/controle/station/`, le seul `fetch(` est celui de
   `moteur/theme/charger.ts`. Sans session : le message « Connexion requise. » et rien d'autre (ni redirection, ni
   requête d'API : `compteurs.direct === 0`).
3. **Ordre d'apparition** : `<Carte />` n'est monté qu'après la première réponse 200 de `vue=direct` **et** la première lecture de `vue=fil` et
   de `reglages` (celles-ci sans condition sur leur statut). Une réponse non 200 de `direct` donne « Accès refusé. »
4. **Cadences de la station témoin** : `vue=fil` toutes les 2 s, `vue=direct` toutes les 4 s (`Station.tsx`, `setInterval` :
   l'interdiction ne vaut que sous `moteur/`). Ce sont les cadences du témoin, pas celles de 026-111. Pour rejouer une étape
   d'`evenements.json`, servir ses vues et attendre au plus ~5 s (le miroir suit ensuite la marche, ~2 images par case). Sur
   une scène immobile, en 7 s : ≥ 3 lectures du fil, ≥ 1 de `direct`.
5. **Ce que `<Carte />` reçoit** : `equipage` = `direct.valeur.equipage.valeur.agents` (le tableau), `tapis` = `direct.valeur.tapis.valeur`,
   `carte` = `direct.valeur.carte.valeur`, `bulles` = `fil.valeur.bulles`, `reglages` = `reglages.reglages`. Le témoin ne lit que
   `equipage` (nom, libelle, avatar, `position.{salle,motif}`), `bulles` (`agent`, `id`, `texte`) et `reglages.theme`.
6. **La salle d'un acteur = `position.salle`, rien d'autre.** Pas de `position` (ou motif hors liste) : pas de `li`, pas de
   carré. Seul le motif `pause` mène à `repos` (`position.motif === 'pause'` ⇒ salle `repos`) ; l'état (`etat`), la salle
   titulaire (`salle`) et `avatar` ne servent jamais à en déduire une. Une salle inconnue du thème ou l'emplacement
   réservé (`ecommerce`) : acteur non dessiné, sans `li`.
7. **Placement** : premier relevé, et tout acteur jamais vu : posé directement (`data-etat="arrive"`, aucun `marche`). Un
   changement de salle (ou de rang) : A* depuis la case courante ; un simple changement de motif ou de bulle dans la même
   salle : pas de marche (le `li` change de `data-motif`). Une case = `grille.pas` (8) ; l'acteur est un carré de `pas − 2`.
   Rang de l'acteur = son indice parmi les noms triés de tout l'équipage servi, modulo les cases de la salle (le poste d'abord,
   puis les cases voisines) : stable, sans hasard.
8. **Marche** : une case toutes les 2 images de Phaser (compte d'images, jamais un temps). Sans marcheur, 3 images de calme
   puis `game.loop.sleep()` ; `appliquer` du pont fait `game.loop.wake()`. `game.loop.frame` est constant à l'arrêt (mesuré : 4
   après la mise en place, sur 7 s d'observation avec relectures des vues).
9. **Le miroir** (`ul[data-miroir]`, caché à la vue par le style « lecteur d'écran », jamais `display:none`) : `li` avec
   `data-personnage`, `data-salle`, `data-motif`, `data-etat`, `data-x`, `data-y` (haut-gauche de la case, en pixels logiques,
   multiples de 8) ; texte « libellé : salle ». Il est écrit à chaque case de marche. Les écrans : `li[data-ecran="<salle>"]`,
   texte « — », vingt (jamais l'emplacement réservé), dans un second `ul` caché ; le décor dessine le même « — » comme un trait.
   Bulle : `[data-bulle="<nom>"]` (dernière bulle de l'agent : `id` le plus haut, texte exact servi, affichage tronqué par le
   style seulement), présente seulement pour un acteur qui a une salle. Zz : `[data-zz="<nom>"]`, seulement à l'arrivée d'un
   acteur au motif `pause`, retiré dès qu'il repart. Rien n'est posé en `innerHTML`.
10. **La texture du décor** (CL-8) porte la clé `decor` : `__stationGame.textures.get('decor').getSourceImage().toDataURL()`.
    Elle est dessinée une fois, au `create` de la scène, à partir du thème seul, sans police (les « — » sont des rectangles) ;
    à `k` égal, deux jeux de données donnent la même image (mesuré). Le contenu du canevas, lui, dépend des acteurs (normal).
11. **`k`** : `max(1, floor(largeur du cadre CSS × densité ÷ grille.largeur))`, le cadre étant `[data-station-carte]`, mesuré
    une fois au chargement ; canevas = `grille.largeur × k` par `grille.hauteur × k` pixels de l'appareil, `style.width/height` =
    dimension ÷ densité (sans arrondi). Mesuré sur un cadre de 1280 px : densités 1, 2, 2,625, 3 donnent k = 2, 5, 7, 8. Il n'y a
    pas de recalcul au redimensionnement.
12. **Perte du contexte** : sur `webglcontextlost` (écouteur posé sur le canevas au `create`), le jeu est détruit et **reconstruit
    en rendu Canvas** (`type: Phaser.CANVAS`) dans le même conteneur ; le pont rebranche la scène neuve et lui rejoue son dernier état
    (donc la scène neuve place directement tout le monde : premier relevé) ; le miroir est vidé puis repeuplé. `__stationGame`
    (le crochet du juge) pointe alors le jeu neuf, et `game.config.renderType` vaut 1 (Canvas) au lieu de 2 (WebGL). Un seul
    canevas dans le DOM avant, un seul après ; le canevas est peint dans la seconde qui suit (mesuré : 0 erreur de page).
13. **Le pont** : `moteur/claw3d/OfficeSceneBridge.ts`, classe nommée exportée, trois méthodes publiques : `brancher(cible)`,
    `debrancher()`, `appliquer(etat)`. Chaque appel du pont réveille la boucle ; l'adaptateur (`moteur/adaptateur.ts`) ne l'appelle
    que si la signature `salle|motif|bulle|nom|couleur|avatar` (tous les acteurs, triés par nom) change. Une relecture à
    l'identique ne fait aucun appel (mesuré : compteur constant).
14. **Grille** (`moteur/grille/grille.ts`, module pur, sans Phaser ni DOM, chargeable par `--experimental-strip-types --import
    scripts/ts-loader.mjs` : vérifié) : `construireGrille(theme) → { pas, colonnes, lignes, libre[] }` ; `astar2D(grille, de, vers) →
    Point[] | null` (points = haut-gauche de case en pixels, départ exclu, quatre voisins, ordre total sans hasard) ;
    `destinations(theme) → { salles (porte), postes }` (sans `ecommerce`) ; `place(theme, salle, rang)` ; `tapisContinu(theme)`.
    Cases libres : intérieur des salles (hors murs) + porte + bandes des coursives ; l'emplacement réservé reste fermé,
    porte comprise. Mesuré : 40 chemins (20 portes, 20 postes) depuis le poste du Commandement, 0 échec ; `astar2D` vers la
    porte réservée : `null` ; `tapisContinu` : vrai.
15. **Instrumentation du juge** : le contrat écrit `(globalThis.__stationGame = new Phaser.Game(…))`. Sous `next build`, ce texte ne
    compile pas (`typeof globalThis` n'a pas de signature d'index : erreur TS7017, le build type-check). **Écrire
    `((globalThis as any).__stationGame = new Phaser.Game(config))`**, comme le fait mon banc, et de même
    `(globalThis as any).__stationPontAppels` dans l'enveloppe du pont. Le témoin n'a aucune déclaration `global` : le moteur réel
    n'en aura pas non plus. Dans le témoin, `new Phaser.Game(` figure **une seule fois** (`moteur/scene/hote.ts`, sur une ligne :
    `jeu = new Phaser.Game(config)`). L'enveloppe du pont du banc : l'original renommé `OfficeSceneBridge.orig.ts`, une classe
    `OfficeSceneBridge extends Orig` dont chaque méthode du prototype de l'original est enveloppée.

## 4. Les fixtures

- **`theme.schema.json`** : sous-ensemble de JSON Schema (`type` (avec union `["object","null"]`), `required`, `enum`, `minimum`, `minItems`,
  `maxItems`, `pattern`, `properties`, `items`, `additionalProperties:false`). Pas de `$ref`, de `oneOf` ni de `patternProperties` :
  le bloc `portrait` répète les définitions. Les textes libres (`nom`, `plaque.texte`) refusent `schéma:` et `//` (pas d'adresse) ;
  chaque objet refuse tout champ inconnu (pas de champ de code). Ce que le schéma ne dit pas et que le juge doit vérifier à
  part : **un et un seul** emplacement `reservee` (et sans `poste`, `poste: null` pour lui) ; les 21 clés présentes une fois ;
  `defauts` couvre les 21 ; `avatars` contient `defaut` ; les extrémités des arêtes sont des nœuds ; le tracé du tapis est continu et
  porte chaque étape. **Toutes les coordonnées sont en pixels logiques, multiples de `grille.pas`**. Les couples (x, y) sont des
  haut-gauche de case. Une arête est axiale : horizontale (`y` égaux) elle occupe les rangées `y … y+largeur`, verticale
  (`x` égaux) les colonnes `x … x+largeur` ; nœuds compris.
- **`themes/essai/theme.json`** : `cle: "essai"`, grille 448 × 208 (pas 8 : 56 × 26 cases), 21 emplacements (les 20 salles de
  `lib/pilotage/equipage.ts` + `ecommerce` réservé, hachuré, sans poste ni écran), rangés en 3 rangées de 7 ; le Commandement est au
  centre ; chaque salle est un carré de 6 cases (murs de 1 case, intérieur 4 × 4, porte au milieu du mur du bas) ; 36 nœuds et 45 arêtes
  de coursives (3 voies horizontales, 6 rues verticales, largeur de 2 cases) ; tapis sur la rangée du haut (56 points, 8 étapes) ;
  26 avatars (les 25 identités + `defaut`, chacun avec une couleur) ; palette de 10 jetons `--mc-*` ; `nuit: false`, pas de
  `portrait` (facultatif). Ni `licence.json`, ni atlas, ni image : c'est du JSON pur, servi par interception.
- **`session-simulee.mjs`** : voir son en-tête. Exporte `envFactice`, `sessionFactice`, `poserSession`, `reponsesParDefaut`,
  `interceptions`, `suiteEvenements`, `appliquerEtape`, `PORT_MORT`, `CLES_THEME`. L'hôte Supabase factice est
  `http://127.0.0.1:9` (rien n'y écoute) ; sa clé anonyme et le jeton de session sont assemblés à l'exécution (aucune valeur de
  clé dans le source). La clé de `localStorage` est `sb-127-auth-token`. `interceptions` coupe tout hôte autre que 127.0.0.1 et
  répond 401 aux routes `/api/controle/**` sans `Authorization: Bearer`. Elle ne sait rien du moteur.
- **`evenements.json`** : `{ note, acteur: "recenseur", etapes: [...] }` ; sept étapes rejouables dans l'ordre :
  `depart` (premier relevé), `pause` (le recenseur marche vers `repos`, puis « Zz »), `reprise` (retour au Radar), `tache` (même salle,
  motif `tache`, une bulle « Recherche des couvreurs de Nantes »), `reunion` (les treize actifs marchent vers `reunion` ; la pause
  et la panne restent), `panne` (le chef retourne au Commandement, motif `panne`), `fin_reunion`. Chaque étape :
  `{ cle, nom, attendu: { <agent>: { salle, motif } }, marche: [agents qui doivent marcher par rapport à l'étape d'avant],
  direct, fil }` ; `direct` et `fil` sont les réponses complètes, chacune repassée par `validerVue` de `s/contrat-vues.mjs`
  (à la génération : 0 défaut). Les agents sont ceux de `s/vue-direct.json` (15, dont `garde` déjà en pause au premier relevé,
  `livreur` en panne et `agent_temoin_inconnu` d'avatar `defaut`). Aucune donnée réelle.

## 5. Ce que j'ai vérifié (banc hors dépôt : `scratchpad/temoin-k/`)

Copie de la référence + témoin + drapeaux levés + instrumentation de §3.15 ; Chromium (`chromium_headless_shell-1194`, WebGL
logiciel), session simulée ; `next dev --webpack` pour le comportement, `next build --webpack` + `next start` pour le poids et
la CSP. Détail des chiffres dans le rapport de livraison ; en résumé :

| Partie | Résultat sur le témoin |
|---|---|
| garde | sans session : 0 morceau de Phaser, 0 canevas, 0 lecture de `vue=direct` |
| pixel | densités 1, 2, 2,625, 3 : k entier (2, 5, 7, 8), CSS = canevas ÷ densité, `pixelArt`/`antialias:false`/`roundPixels` |
| verite | 7 étapes : seuls les acteurs attendus marchent, Zz, bulle exacte, jamais Repos hors pause ; deux rejeux : mêmes chemins, mêmes empreintes |
| repos | `game.loop.frame` constant 7 s, pont non rappelé, ≥ 3 lectures du fil |
| contexte | perte simulée : un seul canevas, repeint, miroir repeuplé, 0 erreur (dev et production) |
| csp / poids | production : 0 violation ; requêtes = celles du contrat ; Phaser 307,5 Kio gzip dans un seul morceau ; `/controle/station` − `/controle` = 248 Kio ; 0 Phaser sur `/controle`, `/site/[slug]`, `/p/[slug]` |
| grille | 40 chemins depuis le Commandement, 0 échec ; réservé injoignable ; tapis continu |
