# Écosystème Presti : l'interface dans le Poste (la station Mission Control, spécification complète)

Liens : [[Ecosysteme-Rectification-2026-09-24]] · [[Ecosysteme-Plan-2026-09-24]] · [[Session-2026-09-15-Lestraque-Vague-5]]

*Écrit le 25/09/2026 par Claude Code. Il répond à ta demande du 24/09 à 23 h 52 : l'interface de l'écosystème doit être dans le Poste, personnalisable comme dans les vidéos, et contenir tout. Il complète le §4 de la rectification, qu'il remplace pour la station.*

**Sur quoi il repose.**
- **L'étude du code de Claw3D**, relu sur l'usine en lecture seule (commit 0565b78).
- **L'inventaire des deux vidéos de référence** (trevsagents et androoagi), élément par élément.
- **L'alternative en pixel art**, déjà écrite dans la série 026.
- **Une décision**, puis **une attaque** de cette décision : 14 défauts, dont 3 graves. La décision ci-dessous est la version corrigée.

**Statut.**
- Rien n'a été modifié ailleurs. Les brouillons 026 sont intacts ; le §8 dit quoi y changer.
- Rien n'est lancé. La station n'a pas encore une ligne de code (§2.6).
- **Mis à jour le 25/09 vers midi**, après ta décision de 11 h 45 (Claw3D) : §0 ajouté ; « En bref » et §9 réécrits ; un renvoi vers le §0 en tête des §2 et §8, au §3.0.5 et au §7. Rien d'autre n'a été supprimé.
- **Corrigé le 25/09 après-midi**, après deux relectures adverses du §0 : 36 défauts, dont 5 graves, tous revérifiés et corrigés (tableau au §0.11). §0 réécrit ; « En bref » et §9 mis à jour ; renvois d'une ligne aux §3.0.1, §3.0.3, §3.0.5, §3.3 et §5.5 ; au §4, les renvois à 026-113 réattribués.

**Étiquettes** (celles du plan) : [prouvé], [mesuré], [déduit], [supposé], [à vérifier], [calculé]. « **vu** » veut dire que j'ai ouvert et regardé l'image le 25/09. « **relu** » veut dire que j'ai relu la ligne de code citée le 25/09.

**Images.** Les chemins sont relatifs à `../../presti-ops/veille/2026-09-24/images/`. « t049.2 » veut dire `trevsagents/t049.2.jpg` ou `androoagi/t049.2.jpg`, selon la vidéo nommée juste avant.

---

## En bref

1. **La voie (ta décision du 25/09, §0).** Claw3D dans le Poste, à `/controle/station`. On copie dans presti le squelette 2D de Claw3D (son hôte Phaser, son pont vers React, ses types de carte, sa recherche de chemin), et on y met notre dessin en pixel art. Pas d'iframe, pas de serveur Claw3D : l'usine n'est jamais exposée, et la garde fondateur s'applique à tout.
2. **Le rendu.** Le prototype du 25/09 a essayé la 3D et la 2D de Claw3D. La 2D ressemble à trevsagents par sa structure : une station en coupe, 20 salles, la nébuleuse (capture B, §0.2). Mais B est agrandie ×3 en plein écran : dans la vraie mise en page, elle sera à ×2, et 7 salles sur 20 y sont encore pauvres. La 3D reste un bureau en bois vu de biais.
3. **Tout y est, et rien ne ment.** 20 salles, 105 éléments des vidéos : 103 repris ou adaptés, 2 écartés. Tout le hasard de Claw3D est retiré : un agent ne bouge que sur un vrai événement, et le juge le prouve en rejouant deux fois la même suite d'événements. Deux thèmes, Station et Vaisseau, réglés depuis la station et rangés en base.
4. **Ce qui te revient** : dire « 2D, pas 3D » (captures A et B) ; choisir un pack dans le lot A, déjà sur l'usine (R9) ; regarder la planche F0 (les 20 salles, dans la vraie mise en page) et dire oui ; décider du Studio de l'usine, qui laisse un relais ouvert sur sa boucle locale (§0.5). Le prix : environ 307 Kio de Phaser, sur la seule page de la station.
5. **La série 026** : 8 fiches nouvelles (les juges K0 ; le moteur K1, K2, K3, K4a, K4b, K4c, K5, qui remplace 026-113) ; N1 coupée en deux ; N3 gardée ; N8 réduite, car 026-164 existe ; deux règles de l'INDEX retouchées : plus rien ne se construit ni ne se juge sur le PC (§0.9). Rien n'est lancé.

---

## 0. Décision de Benj du 25/09 : Claw3D, avec des dessins pixel art, dans le Poste

*Écrit le 25/09 vers midi par Claude Code, **corrigé le 25/09 après-midi** après deux relectures adverses (§0.11). Ta décision de 11 h 45 : l'interface de l'écosystème sera Claw3D, avec des dessins en pixel art dedans. **Ce §0 remplace la voie du §2**, qui écartait Claw3D. Le §2 reste en place, comme historique. Les §3 à §7 restent la spécification (ce qu'on voit, ce qu'on règle, d'où viennent les chiffres) ; le §0 dit comment Claw3D les porte, et corrige les endroits qu'il nomme.*

**Sur quoi il repose.**
- Trois études du 25/09, faites sur l'usine, en lecture seule sur `~/claw3d` (commit 0565b78) : l'architecture, un prototype pixel art, et la carte des exigences vers Claw3D.
- Deux relectures adverses du §0 (sécurité et vérité ; faisabilité et coût) : 36 défauts. J'ai revérifié chacun moi-même, en lecture seule, sur l'usine et dans presti (3315141). Tous sont réels ; sept corrections s'écartent un peu de ce que proposait l'attaque (§0.11).
- J'ai regardé moi-même les captures du prototype, et relu les lignes marquées « relu » (liste dans les Notes).

**Tes règles, qui tiennent toujours.**
- Dans le Poste, pas à côté.
- Elle contient tout : 20 salles, 105 éléments des vidéos.
- Personnalisable, pour ressembler à trevsagents et à androoagi.
- Gratuit : aucun achat.
- Et deux règles de fond : rien n'expose l'usine, et la garde fondateur s'applique à tout ; rien ne bouge sans un vrai événement.

### 0.1 La voie : on copie le moteur de Claw3D dans le Poste, pas son application

**La décision.**
- Le moteur 2D de Claw3D est copié dans presti, sous `app/controle/station/moteur/claw3d/`, avec sa licence MIT.
- Le cadre de la carte, `Carte.tsx` (laissé vide par 026-111), charge le moteur par `next/dynamic(..., { ssr: false })`, et Phaser à la demande, comme Claw3D le fait déjà (`await import("phaser")`, `OfficePhaserCanvas.tsx:53`, relu). Il n'est monté qu'après une première réponse 200 de `vue=direct` (§0.5).
- Les gardes sont celles du Poste : le drapeau `direction` (`app/controle/layout.tsx:18-20`, relu), puis `pilotage`. Toutes les données passent par `/api/controle/**`, derrière `estFondateur`.
- Rien de Claw3D ne tourne ailleurs que dans ce code copié : ni son serveur, ni ses routes, ni sa passerelle, ni le Studio de l'usine.

**Pourquoi pas les deux autres voies.**

| | Copier le moteur (retenue) | Brancher Claw3D à côté (multi-zones) | L'afficher dans une iframe |
|---|---|---|---|
| La garde fondateur | Sur tout, comme aujourd'hui | Seulement si on supprime toutes les routes de Claw3D. Sinon elles répondent sous notre domaine, sans garde. L'une est un relais qui va chercher n'importe quelle adresse quand sa liste blanche est vide **et hors production** (`src/app/api/runtime/custom/route.ts:12-20`, relu) | Il faut donner ton jeton à une autre origine, ou écrire un protocole de messages qui refait la voie retenue, en plus lourd |
| L'usine | Jamais appelée | Jamais appelée | Jamais appelée |
| La CSP de Presti | Inchangée (à prouver, §0.5) | Une seconde CSP, bien plus large (`connect-src ws: wss: http: https:`, `next.config.ts:23` de Claw3D), à tenir en phase | `frame-src` à ouvrir |
| Vercel | Rien ne casse | Le serveur maison de Claw3D ne tourne pas sur Vercel (`server/index.js:91-128`) ; plusieurs de ses modules écrivent sur le disque [déduit] | Idem |
| Versions | Une seule, celle de Presti : Next 16 quand la station arrive (026-006 et 026-008 passent avant, §0.10) | Deux cadriciels à tenir en phase | Deux |

Ces cellules viennent de l'étude d'architecture. J'ai relu moi-même les versions de Claw3D (Next 16.1.7, React 19.2.3), la CSP de Presti (`next.config.mjs:30-62`) et le relais.

### 0.2 Le rendu : la carte 2D de Claw3D, passée en pixel art

**Claw3D a deux moteurs de rendu.**
- **La 3D** : le bureau isométrique que tu as vu, en three.js et React Three Fiber (`RetroOffice3D.tsx`, 7 248 lignes).
- **La 2D** : une carte en Phaser (`OfficePhaserCanvas.tsx`, 91 lignes, et ses scènes). Claw3D s'en sert pour son éditeur de plan. D'origine, elle tourne sans pixel art (`pixelArt: false`, `OfficePhaserCanvas.tsx:72-73`, relu).

**Le prototype du 25/09 a essayé les deux**, dans une copie à part sur l'usine (`~/claw3d-pixel`), sans toucher `~/claw3d` : `git status` y est vide et le commit n'a pas bougé (relu à nouveau l'après-midi).

**Les captures**, regardées par moi le 25/09. Dossier : `C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/claw3d-pixel/`. Ce dossier est temporaire : la copie qui fait foi est sur l'usine, dans `~/claw3d-pixel-state/captures/`.

| Capture | Poids | Ce qu'on y voit |
|---|---|---|
| `avant-1440x900.png` | 190 Ko | Claw3D tel quel : le bureau 3D en bois beige [décrit par le prototype] |
| `apres-A-1440x900.png` | 135 Ko | **A, la 3D pixelisée** (vu) : nébuleuse violette, sol en plaques, néons magenta, un agent en sprite. Mais c'est toujours le bureau isométrique de Claw3D, pas une station, et son habillage reste autour (« LUKE HEADQUARTERS », « DEMO · CONNECTING ») |
| `apres-A-plongee-1440x900.png` | 105 Ko | A vue de dessus (vu) : la nébuleuse est belle, mais les meubles 3D deviennent des taches |
| `apres-B-1440x900.png` | 28 Ko | **B, la carte 2D en pixel art** (vu deux fois) : une coque octogonale à néon magenta sur la nébuleuse, l'antenne et son voyant rouge, quatre ponts, les 20 salles avec leur plaque. Treize ont un meuble propre (hublot de la Réunion, égaliseur du Radar, planète de l'Observatoire, coffre de la Trésorerie, baies des Machines, canapé du Repos…) ; **les sept autres n'ont que la même paire de bureaux** (Rédaction, Envois, Standard, Studio pubs, Presti, Audience, Chantier). Sept agents nommés dans leur couleur. Le Crieur est au Repos avec « Zz », qui chevauche sa plaque : **ce n'est pas une pause**, le jeu d'essai le dit seulement inactif, et le prototype envoie tout agent inactif au Repos (un défaut, corrigé au §0.4). L'égaliseur, l'histogramme des Recettes et « J6/30 » sont peints en dur (§0.11) |
| `apres-B-390x844.png` | 12,5 Ko | B au téléphone (vu) : le milieu de la station ; les salles des bords sont coupées |

**On retient la 2D (B), pas la 3D (A).** Quatre raisons, dites honnêtement :
1. **B ressemble aux vidéos par sa structure.** Les deux références sont en 2D. B est déjà proche de trevsagents (t049.2) : la coupe, la nébuleuse, les plaques néon. Le thème Vaisseau (androoagi, modules vus de dessus) est, lui aussi, un dessin 2D. **Par la richesse du dessin, pas encore** : c'est le travail de R9 et de F0.
2. **B est la bonne base pour la règle de vérité, pas encore une preuve.** Son code n'a aucun `Math.random` (recherche du 25/09 : un seul commentaire, `config.ts:29`, relu). Mais il fait trois fautes, corrigées au §0.4 : il envoie au Repos tout agent inactif et au Commandement tout agent sans poste (`StationPixelScene.ts:32-33`, relu) ; il peint des chiffres en dur dans le décor (`stationDecor.ts:241`, `:272-276`, `:317`, relus) ; et il réveille Phaser à chaque appel du pont, changement ou non (`OfficeSceneBridge.ts:39-55`, `StationPixelScene.ts:68-72`, relus).
3. **B est léger ; A ne l'est pas.** Sous rendu logiciel, sur l'usine sans carte graphique, A tournait à 3,8 images par seconde. Pour B, les « 60 images par seconde » mesurent une page au repos, pas un rendu : la boucle de B dort 50 ms après son démarrage (`StationPixelScene.ts:73`, relu), et la mesure commence 25 s après le chargement (`capture.mjs`, relu). La cadence pendant une marche reste [à mesurer] (K3), et sur un vrai écran, sur ton téléphone.
4. **Ce qui vient vraiment de Claw3D.** L'hôte Phaser (91 lignes), le pont entre React et la scène (63), les types de carte et de zone, la recherche de chemin 2D (que le prototype n'appelle pas encore : aucun `astar2D` dans l'atelier, relu), et le générateur d'avatar (`lib/avatars/profile.ts`, 272 lignes). **Le dessin est à nous** : tout ce qu'on voit sur B est peint par du code écrit le 25/09, et la suite viendra d'un pack CC0 du lot A (R9). Claw3D apporte le squelette ; l'habit est le nôtre.

**Ce que B n'est pas : l'écran que tu auras.**
- B est une grille de 480 × 300 agrandie ×3 en plein écran, sans barre, sans colonnes, sans bandeau (`stationDecor.ts:8-9` ; `OfficePhaserCanvas.tsx:72` de l'atelier ; relus).
- Dans la vraie mise en page (§3.1 : barre de 80 px, colonnes de 300 et 340 px, bandeau de 44 px), il reste 800 × 776 px pour la carte à 1440 px de large.
- La coque fait 398 pixels de grille de large (`HULL`, `stationDecor.ts:171-173`, élargie de 3 px par son néon, `:350`, relus). Elle tient donc à ×2 à 1440 px, pas à ×3. Sous 1396 px de large (colonnes de 280 et 320), elle ne tient qu'à ×1, ou en vue d'ensemble lissée [calculé].
- **Donc** : A et B suffisent pour trancher « 2D, pas 3D ». Mais ton oui sur le rendu se donne sur la planche F0, prise dans la vraie mise en page (§0.9), pas sur B.

**Un point qui rassure.** Le prototype peint tout en Canvas 2D (`drawStation`, `drawNebula`, `drawAgentSheet`, relus), puis confie ces images à Phaser (`StationPixelScene.ts:59-65`, relu). Phaser ne tient que la caméra, le zoom, les personnages, les clics et la boucle. Si un juge prouvait que Phaser casse la CSP ou le téléphone, on changerait l'hôte sans redessiner quoi que ce soit [déduit].

**Ce que le prototype ne fait pas encore bien** (corrigé par les fiches du §0.9) :
- **L'échelle est comptée en pixels CSS** : 3 au bureau, 2 au téléphone (`OfficePhaserCanvas.tsx` de l'atelier, l.69-85, relu). Le §3.0.3 exige des pixels de l'appareil, sinon l'image scintille sur les écrans de densité 2,625 → K4a.
- **La police 3 × 5 n'a pas d'accents**, et « 0 € » s'y lit « DEUR » (vu) → les textes passent dans le calque HTML, en police OFL → K4c.
- **Au téléphone, la station est coupée** : 195 pixels de grille visibles sur 480 → K5.
- **Tout est dessiné par du code**, sept salles sur vingt n'ont qu'une paire de bureaux (le cas par défaut de `drawRoomProps`, `stationDecor.ts:328-331`, relu). Il n'y a ni tapis, ni marche par les coursives, ni survol, ni zoom → R9, F0, K3, K4a, N5.
- **Les 20 salles sont codées en dur** (`STATION_ROOMS`, `stationDecor.ts:35`, relu) → `theme.json`, K2.
- **Des chiffres sont peints dans le décor** : l'égaliseur du Radar (« valeurs figées du jeu d'essai », `stationDecor.ts:240-243`), l'histogramme des Recettes (`:272-276`), « J6/30 0EUR » à l'Expérience (`:317`), relus. Or l'Expérience doit dire « FERMÉE · R13 » avant la première vente (§3.2). → Le décor ne porte **aucune donnée** ; ces trois écrans passent dans les calques (c) et (d), nourris par les enveloppes (K4b).
- **La salle est devinée par la scène** : inactif → Repos, sans poste → Commandement (`StationPixelScene.ts:30-34`, relu). C'est le « canapé après inactivité » de Claw3D, qu'on disait ne pas copier → K3 (§0.4).
- **La couleur dépend du rang dans la liste, et les textures sont gardées par identifiant** (`StationPixelScene.ts:100`, `:102-108`, `:118`, relus) : si l'ordre change, les couleurs s'échangent sans événement ; un nom changé ne s'affiche pas. → K3 : couleur prise dans les réglages ; clé de cache = nom + couleur + avatar.

**Les règles du pixel art dans Phaser.**
- `pixelArt: true`, `antialias: false`, `roundPixels: true` ; aucune texture lissée ; `seed: ['station']` (§0.4).
- Taille du canevas = grille du thème × k, k entier, en pixels de l'appareil (§3.0.3).
- Les quatre calques du §3.0.3 tiennent, portés par Claw3D :
  - (a) la nébuleuse, en fond CSS sous un canevas transparent, pour qu'elle continue sous les colonnes ;
  - (b) le décor, peint une fois dans un canevas hors écran, puis donné à Phaser comme une seule texture ; repeint seulement si le thème, les réglages, le zoom ou la nuit changent ; **il ne porte aucun chiffre** ;
  - (c) les acteurs, en sprites Phaser. **Phaser efface et redessine tout le canevas à chaque image active** (`CanvasRenderer.js:394-396`, relu) : les « rectangles sales » du §3.0.3 n'existent pas ici. Ce qui compte est que la boucle dorme au repos (§0.4) ;
  - (d) le calque HTML des plaques, des noms, des bulles, des « Zz » et des « +1 », placé d'après la caméra, et recalculé seulement quand elle ou un agent bouge.

### 0.3 Ce qu'on garde, adapte, ajoute et retire de Claw3D

**Les comptes de la carte des exigences** (faite sur tout Claw3D, 3D comprise) :
- 105 éléments des vidéos : 8 déjà là, 46 à adapter, 49 à ajouter, 2 écartés par la spécification (n° 16 et 57).
- 20 salles : aucune ne se reprend telle quelle ; 11 partent d'une pièce ou d'un meuble de Claw3D, 9 sont à créer (Commandement, Radar, Usine à sites, Studio pubs, Expérience, Audience, Sécurité, Presti, Observatoire).
- Avec la 2D comme base, quatre « déjà là » venaient de la 3D : le survol (n° 50), l'info-bulle (n° 55), la vue d'ensemble (n° 67), le zoom et le glissé (n° 99). Ils se refont avec la caméra de Phaser, qui sait déjà zoomer et se déplacer [déduit].

**Gardé, copié sous la notice MIT** (`LICENSE-claw3d.txt` : « MIT License, Copyright (c) 2026 Luke The Dev », relu ; et `PROVENANCE.md`, qui donne le commit et chaque modification) :
- l'hôte Phaser, `OfficePhaserCanvas.tsx`, **réécrit en mode station seul** : sans les imports des scènes `OfficeBuilderScene` et `OfficeViewerScene` (`:10-11` de l'atelier, relu), sans les classes Tailwind (`className="h-full w-full overflow-hidden rounded-lg"`, `:102` de l'atelier, relu), absentes de Presti : le cadre ferait 0 px. Un module CSS du moteur les remplace ;
- le pont entre React et la scène, `OfficeSceneBridge.ts` (63 lignes), derrière une comparaison par valeur (§0.4) ;
- les types de carte et de zone de `lib/office/schema.ts`, dont les zones en polygone (le hublot rond) ;
- la recherche de chemin 2D : `buildNavGrid2D` et `astar2D` (`lib/office/pathfinding.ts:95` et `:223`, relus), sans three ;
- **le générateur d'avatar**, `lib/avatars/profile.ts` (272 lignes : un avatar tiré d'une empreinte du nom, sans `multiavatar` ni `Math.random`, relu). Le prototype l'importait (`StationPixelScene.ts:4`, `agentPainter.ts:5`) sans que le §0 le déclare.

**Plus gardé : le type `OfficeAgentPresence`.** Il n'a que `agentId`, `name`, `state` et `preferredDeskId` (`lib/office/presence.ts:8-13`, relu), et `state` n'a que quatre valeurs, `idle`, `working`, `meeting` et `error` (`schema.ts:17`, relu). Ni salle, ni motif, ni couleur, ni bulle, ni pause : il ne peut pas porter la règle de vérité. Le moteur reçoit notre type, `ActeurStation` (§0.7).

**Repris de l'atelier du prototype** (notre code, écrit le 25/09) : `StationPixelScene.ts` (166 lignes, sans sa fonction `roomFor`), `agentPainter.ts` (132), `stationDecor.ts` (407, qui devient le thème d'essai, **sans aucune donnée**), et de `config.ts` **la seule `PIXEL_PALETTE`**. Pas `PIXEL_MODE` ni `PIXEL_TRUTH_MODE` : ils se coupent par `?pixel=0` dans l'adresse (`config.ts:6-15` et `:32`, relus), un interrupteur de vérité qu'on ne veut pas [mesuré].

**Adapté :**
- les 8 cibles de salle de Claw3D (`places.ts:1-10`) deviennent les 20 clés de `SALLES`. Six servent (poste de bureau, salle des serveurs, réunion, labo QA, cabine SMS, cabine téléphone) ; deux disparaissent (salle de sport, jukebox) ;
- les six trajets écrits à la main (`*Route.ts`) deviennent une seule fonction, porte puis poste, d'après `theme.json` ;
- les plaques de bureau (`DeskNameplates`) passent dans le calque HTML ;
- le profil d'avatar devient Réglages › Équipage, en listes fermées ;
- les écrans de Claw3D (distributeur, Analytics, Kanban, Historique, boîte de réception) guident nos panneaux HTML, **mais leur code n'est pas copié**. Il est écrit en Tailwind, absent de Presti. Et deux d'entre eux sont dangereux : un code PIN en clair dans `localStorage` (`AtmImmersiveScreen.tsx:16-46`), des boutons d'approbation qui écrivent (`GithubImmersiveScreen.tsx:663-681`).

**Ajouté** (ce que Claw3D n'a pas) :
- les 9 salles nouvelles, le Commandant, les tapis, les lignes du Crieur et de l'Usine, le résumé de salle, le niveau et l'XP, les missions, les succès, le bandeau, les compteurs, l'antenne et l'égaliseur figés entre deux événements, les hublots ;
- le thème Vaisseau ;
- l'adaptateur de données Presti (§0.4), le type `ActeurStation`, le calque HTML, le miroir accessible, le téléphone.

**Retiré, jamais copié :**
- **toute la 3D** : three, React Three Fiber, drei, `RetroOffice3D.tsx`, et les 17 modèles `.glb` (leur licence n'est écrite nulle part dans le dépôt) ;
- **l'orchestrateur** `OfficeScreen.tsx` (5 792 lignes) : un `Station.tsx` mince le remplace ;
- **tout ce qui suppose OpenClaw ou une passerelle** : `server/`, toutes les routes `src/app/api/*`, `lib/gateway`, `lib/runtime`, `lib/studio`, `lib/openclaw`, `lib/ssh`, `lib/clawdbot`, les approbations d'exécution, la boutique de compétences, le générateur d'entreprise, l'assistant d'accueil, la page `/agents`, et les dépendances `ws` et `@noble/ed25519` ;
- **le module `lib/office/presence.ts`** : il lit le disque et la passerelle (`node:fs`, `lib/gateway/agentConfig`, l.1-6, relu) ;
- **ce qui sort du périmètre** : salle de sport, jukebox et Spotify, cuisine (sauf une machine à café au Repos), drapeaux, ville, confettis ;
- **ce qui se range dans le navigateur ou sur le disque** : la disposition en `localStorage` (`persistence.ts`), les réglages sur disque (`settings-store.ts`). Tout passe en base (§0.6) ;
- **les avatars `multiavatar`** : pas d'en-tête de licence ;
- **la scène 2D d'origine** (`OfficeViewerScene.ts`) et ses trois systèmes d'ambiance (§0.4) ;
- **l'éditeur de plan** (`OfficeBuilderScene.ts`) n'est pas livré (§0.6).

### 0.4 La règle de vérité dans Claw3D

**Ce qui bouge au hasard dans Claw3D, et ce qu'on en fait.** Les lignes viennent des études du 25/09, sauf celles marquées « relu ».

| Où | Ce qui s'y passe | Ce qu'on en fait |
|---|---|---|
| 3D, `RetroOffice3D.tsx:2104` (`Math.random() < 0.005`) et `:901-919` | promenades et apparitions au hasard | non copié |
| 3D, `:2068-2103` | canapé après 15 min sans activité | non copié ; seule une vraie pause envoie au Repos, une seule fois. **Le prototype le refaisait** (`StationPixelScene.ts:32`, relu) : corrigé ci-dessous |
| 3D, `:4470-4540`, `core/janitors.ts` | ping-pong, agents d'entretien | non copiés |
| 3D, `:1649`, `core/constants.ts:18` | vitesse tirée au hasard, marche ×3 au travail | non copiés ; une seule vitesse |
| 3D, `cameraLighting.tsx:296-330` | jour et nuit en 5 min | non copié ; la nuit suit l'heure de Paris, et le décor change une fois, à l'heure pile |
| 2D, `LightingSystem.ts:60-68` (relu) | lumières qui vacillent en `Math.sin(temps)` | non copié |
| 2D, `AmbienceSystem.ts` | vapeur de café et particules | non copié |
| 2D, `AgentEffectsSystem.ts:32` | bulles de pensée tirées d'une liste | non copié |
| `deskDirectives.ts:159-203`, `eventTriggers.ts:926+` | un agent qui marche parce qu'un message contient « go to the gym » | non copié |
| Phaser lui-même, `src/core/Config.js:167` (relu) | son générateur est semé par `Date.now() * Math.random()` si on ne lui donne pas de graine ; `Phaser.Math.Between` appelle `Math.random` (`src/math/Between.js:20`, relu) | `seed: ['station']` dans la configuration ; les fonctions de hasard de Phaser interdites dans `moteur/` |

**Comment un agent bouge chez nous** (corrigé).
1. `apiDirection()` (`app/controle/client.ts`, jeton de la session Supabase) lit `GET /api/controle/station?vue=direct` toutes les 30 s, et `?vue=fil&apres=` toutes les 5 s.
2. Les réponses remplissent un seul magasin, dans `Station.tsx`, qui passe l'équipage, les tapis et les bulles à `<Carte />` (026-111).
3. **La salle et le motif viennent de `positions()` (026-070), et d'elle seule** : `porte`, `tache`, `reunion`, `pause` ou `panne` (026-070 l.50, relu). Une pause donne `{ salle: 'repos', motif: 'pause' }` (§8.1). La route les calcule (026-092) ; l'écran ne les recalcule pas.
4. `Carte.tsx` en fait une liste d'`ActeurStation` (§0.7) et calcule leur **signature** : salle, motif, bulle, nom, couleur et avatar de chaque agent. **Il n'appelle le pont que si la signature change.** Le pont de Claw3D prévient ses abonnés à chaque appel, sans comparer (`OfficeSceneBridge.ts:39-55`, relu), et l'hôte le rappelle dès que l'objet change d'identité (`OfficePhaserCanvas.tsx:41-48` de l'atelier, relu) : sans cette garde, Phaser se réveillerait et recréerait tous les personnages toutes les 5 s.
5. **La scène ne traite que les agents qui ont changé, et ne déduit jamais une salle.** Un acteur sans salle n'est pas dessiné ; la liste de l'équipage le montre « — ». Seul le motif `pause` mène au Repos. Un agent `porte` attend à la porte de sa salle.
6. La salle donne un emplacement, puis un poste, d'après `theme.json`.
7. `astar2D` calcule le chemin, une seule fois par vrai changement.
8. L'agent marche à une seule vitesse. L'image de marche dépend de la distance parcourue, pas du temps.
9. À l'arrivée, la boucle de Phaser s'endort. Plus aucune image n'est dessinée.

**Ce qu'on n'utilise pas : l'adaptateur « custom runtime » de Claw3D.** Il ne pousse aucun événement (`onRuntimeEvent` rend `() => {}`, `provider.ts:328-330`), il invente des agents sans salle, et chaque appel passe par le relais ouvert. Plus tard, Supabase Realtime pourra servir de sonnette sans donnée (« le fil a bougé ») ; l'écran relira alors par la route gardée.

**Le juge** (K0), corrigé.
- **Déterminisme** (partie `verite`) : mêmes jeux d'essai, même suite d'événements, deux fois ; les chemins et l'empreinte du canevas doivent être identiques. C'est lui qui attrape un tirage caché, où qu'il soit, même quand un vrai événement déclenche la marche.
- **Sources interdites dans `moteur/`** : `Math.random`, `Phaser.Math.Between`, `Phaser.Math.RND`, `GetRandom`, `Shuffle`, `Date.now`, `performance.now`, `new Date`, `setInterval`, `time.addEvent` en boucle, les tweens en `repeat: -1` ou `yoyo`, `URLSearchParams`. L'heure de Paris (la nuit, l'horloge) vient d'un seul fichier, `horloge.ts`, hors du moteur. **Plus de recherche de `Math.sin`** : elle touchait le hublot, tracé une seule fois (`stationDecor.ts:85`, relu), et le déterminisme couvre le cas.
- **Le piège de la pause** : un agent `porte` ou `tache` ne va pas au Repos. Une mutation qui remet « inactif → Repos » doit faire échouer le juge.
- **Le repos, à la vraie cadence** (partie `repos`) : au moins 3 lectures du fil et 1 de `direct`, aux réponses identiques ; `game.loop.frame` ne doit pas bouger. Jamais un drapeau comme `__stationStats.sleeping`, qui passe à `true` et n'est jamais remis à `false` (`StationPixelScene.ts:77`, relu) : une preuve vide.
- **Un décor sans donnée** : rendu avec un jeu vide, chaque écran de la carte affiche « — ».
- **Un témoin positif** : le portage corrigé de B passe toutes les parties. Un juge qui échoue sur tout ne passe pas.

### 0.5 La sécurité

- **Rien n'expose l'usine.** Le navigateur ne l'appelle jamais. Le Studio Claw3D (127.0.0.1:3000 et [::1]:3000) et l'atelier du prototype (127.0.0.1:3300, quand il tourne) restent sur l'usine, derrière SSH, et ne sont jamais liés depuis le Poste (`ss -ltnp`, relu). En production : pas de serveur Claw3D, pas de passerelle, pas de WebSocket.
- **Mais un relais ouvert tourne sur la boucle locale de l'usine.**
  - La route `/api/runtime/custom` de Claw3D va chercher n'importe quelle adresse quand aucune liste blanche n'est posée et que `NODE_ENV` n'est pas `production` (`src/app/api/runtime/custom/route.ts:12-20`, relu).
  - Le Studio tourne en `node server/index.js --dev` (lu dans `/proc` ce 25/09). Ni son environnement, ni son `.env` ne posent de liste blanche (noms de variables comptés, sans lire les valeurs).
  - Rien n'est exposé sur Internet. Mais tout processus de l'usine peut s'en servir pour faire chercher n'importe quelle adresse.
  - Je n'y ai pas touché (ta règle). **Ton geste** (§9) : arrêter le Studio, que l'atelier remplace, ou le relancer avec une liste blanche.
  - L'atelier de F0 et de K0 (`~/claw3d-pixel`, même code) se lance avec `CUSTOM_RUNTIME_ALLOWLIST=aucun.invalid` : une liste non vide qui ne permet rien.
- **Le moteur démarre après la garde.** `Station.tsx` ne monte `<Carte />` qu'après un 200 sur `vue=direct`, avec les redirections du Poste : pas de session ou 401 → `/login` ; 403 ou 404 → `/dashboard` (`app/controle/page.tsx:79-83`, relu). Sans session, aucun morceau de Phaser n'est demandé et aucun canevas n'existe (K0, partie `garde`).
- **La garde s'applique à tout.** La page est une coquille vide, servie après les drapeaux `direction` et `pilotage`. Les chiffres passent par `estFondateur`, `exigerDomaine`, puis une garde par sous-partie (§3.0.1, corrigée au §0.7). Le moteur ne fait aucune requête de données : il ne reçoit que ce que `Carte.tsx` lui donne.
- **Ce que lit la station, et rien d'autre.**
  - Par `apiDirection(` : `/api/controle/station?vue=direct|fil|salle|agent`, `/api/controle/tresorerie`, `/api/controle/station/reglages`.
  - Les fichiers du thème, par un seul chargeur, sous le préfixe fixe `/station/themes/<clé d'une liste fermée>/`.
  - Le chargeur de Phaser passe par XHR, que la recherche de `fetch` (ST-1) ne voit pas. C'est donc K0 qui vérifie, dans le navigateur, que chaque requête de la page est l'une de celles-là, ou sous `/_next/static/`.
- **Les réglages sont derrière le drapeau `pilotage`.** Le `GET` et le `PUT` de `/api/controle/station/reglages` commencent par `if (!actif('pilotage'))` → 404. Leur fichier entre dans la ligne `pilotage` de `scripts/fermeture-e2e.mjs`, qui exige que chaque route lise elle-même son drapeau (`:220-277`, relu ; le précédent de `comptabilite` le 07/09). Sans cela, un `PUT` écrirait dans `ops.station_reglages` drapeau baissé. → N4, jugé par `station-reglages-qa`.
- **Aucune route de Claw3D n'est copiée**, dont le relais.
- **La CSP ne change pas** [à prouver par K0]. Phaser est servi depuis `/_next/static`, sur notre origine. Ses textures de base arrivent en `data:`, que `img-src 'self' data: blob:` permet déjà (`next.config.mjs:36`, relu) ; `connect-src 'self'` suffit. Le son est coupé (`audio: { noAudio: true }`) [supposé utile]. Le juge exige zéro violation.
- **La notice MIT est gardée**, avec la provenance (dont `profile.ts`). Aucun `.glb`, aucun `multiavatar`.
- **Aucune donnée d'entreprise dans le navigateur.** La disposition en `localStorage` de Claw3D n'est pas reprise ; les réglages sont en base (§5.5).
- **Les textes venus des agents** (noms, bulles, plaques réglées) passent par le calque HTML, en texte, jamais en HTML (SA-12).
- **Hygiène** : ajouter `station\/.*` à `CHEMINS_APP_PRESTI`, pour que les thèmes de `public/station/` ne soient jamais servis sur le domaine d'un artisan [déduit], comme `marque/`.
  - Ce sera dans `proxy.ts`, pas dans `middleware.ts` : 026-008 renomme le fichier avant la station (`INDEX.md:26`, relu).
  - Le matcher couvre déjà les chemins à point (`/((?!api|_next/).*)`, `middleware.ts:141`, relu ; le commentaire de la l.62 est périmé).
  - La ligne est faite par K1, avec ton accord sur le diff.
- **Le §7 reste valable** pour tout le reste, sauf sa phrase « rien de Claw3D ».

### 0.6 La personnalisation dans Claw3D

- **Les thèmes restent des données** (§5.2) : un `theme.json`, un atlas, un fond, un `licence.json`. Le moteur est le même pour les deux.
  - **Station** (trevsagents) : la coupe latérale du prototype B, enrichie.
  - **Vaisseau** (androoagi) : des modules vus de dessus, des sols en hexagones, un sas entre deux modules. En 2D, c'est un autre dessin et d'autres emplacements, pas une autre caméra.
- **La grille se fixe d'après le dessin, avant K2.**
  - Les packs du lot A sont surtout en tuiles de 16 px (Rotting Pixels, Ansimuz, l'équipage de Zwonky en 16 × 16). Ganamoda, le plus riche pour une coupe, a des murs de 110 px et des personnages de 27 × 75 (`~/station-assets/INDEX.md`, relu) : il n'entre pas dans des salles de 60 × 48.
  - F0 fixe la grille du thème et la taille des salles d'après le pack retenu.
  - Plus la grille est grande, plus le facteur entier est petit dans le cadre : F0 te le montre aux vraies tailles.
- **Le téléphone a sa grille.** `theme.json` gagne un bloc `portrait` facultatif (`grille`, `emplacements`, `coursives`). L'échange de deux salles (§5.3) vaut pour les deux grilles, et `validerDisposition` vérifie les deux.
- **Les réglages du §5.3 ne changent pas** : noms, avatars, couleurs, plaques, place des salles, titre. Ils sont rangés dans `ops.station_reglages` (migration 0113), au lieu du `localStorage` et du fichier sur disque de Claw3D.
- **L'éditeur d'emplacements reste fermé** : on place une salle dans un emplacement du thème, on ne dessine pas le plan (§5.3). L'éditeur de plan de Claw3D (`OfficeBuilderScene.ts`, 149 lignes) n'est pas livré. Il peut servir, dans l'atelier de l'usine, à tracer les emplacements d'un thème [supposé].
- **Gratuit** : le dessin vient de R9 (§9), sans achat.

### 0.7 Les données

- **Rien ne change au §6**, sauf les deux points ci-dessous : une route, des enveloppes, la même fonction que le Poste pour un même chiffre, les mêmes rythmes.
- **Le moteur reçoit des `ActeurStation`**, notre type : `{ nom, couleur, avatar, salle, motif: 'porte' | 'tache' | 'reunion' | 'pause' | 'panne', bulle }`. La salle et le motif viennent de `positions()` seule ; le nom, la couleur et l'avatar viennent des réglages. La bulle est masquée (026-070). Sans transcription, sans `streamText`, sans `thinkingTrace`.
- **Un domaine par objet, pas par zone** (corrige §3.0.1, §3.1 et §3.2).
  - Le §3 gardait un même chiffre sous quatre domaines selon l'endroit. COMMANDES · MOIS : `comptabilite` dans la barre (§3.1 B), `clients` en tuile de l'Usine à sites (§3.2). VENTES · MOIS, « le même objet », au Commandement : `sante` (§3.1 E). L'étape PAYÉ du tapis : `sante` (§6.2).
  - Avec la règle « un chiffre, un seul objet », l'objet aurait pris le domaine le plus permissif.
  - Corrigé : une table `DOMAINE_DE`, par objet, dans `lib/pilotage/station.ts` (026-092).
  - Commandes, ventes, étape PAYÉ, packs payés : `comptabilite` partout. Sans ce domaine, l'étape PAYÉ du tapis dit « hors périmètre ». SITES EN LIGNE reste `clients`.
- **La garde par sous-partie ne se prouve pas avec un vrai compte.**
  - Un fondateur a tous les domaines (`peutFaire`, `lib/controle/droits.ts:96`, relu).
  - Le partenaire est arrêté à l'entrée, faute de `sante` (`:70`, relu). Il a pourtant `clients` en lecture (`:63`) et pas `comptabilite` (`:68`).
  - Le tri est donc une fonction pure, `trier(enveloppes, peut)`. Le juge l'appelle avec un verdict synthétique, « `sante` sans `comptabilite` ». La mutation de 026-130 (« sous-partie d'argent servie sans `comptabilite` ») devient vérifiable.
- **Jusqu'au bus** (migrations 0096 à 0098), la station tourne sur les jeux d'essai du juge, interceptés par le juge et jamais dans le code client (026-104). Au 25/09 à midi, les migrations s'arrêtent toujours à `0095_verrous_maj_slug.sql`, et `app/controle/station/` n'existe pas [mesuré].

### 0.8 Le poids et la cadence

- **Phaser 3.90 complet** : 1 196 122 octets minifié ; 314 863 octets en gzip -9, soit 307 Kio [mesuré le 25/09 sur l'usine, `dist/phaser.min.js`]. Notre code : environ 13 Ko en gzip [mesuré par le prototype].
- **Le budget de 340 Ko était faux par construction.**
  - Les morceaux que `/controle/layout` charge déjà pèsent 102 Kio en gzip [mesuré le 25/09, méthode de `scripts/budget-perf.mjs:27-35`, sur le `.next` du 24/09 du PC]. Le cadriciel plus Phaser font donc ≈ 409 Kio avant la moindre ligne de la station.
  - « 0 octet ailleurs » est impossible. Le runtime de webpack, chargé par toutes les pages, porte la table des morceaux chargés à la demande (`static/chunks/webpack-1d5f2a42ca00e7fa.js`, `.u=e=>…`, relu). Tout `import("phaser")` le modifie.
  - Et `app-build-manifest.json` ne liste pas ces morceaux : la méthode maison ne verrait même pas Phaser.
- **Le budget corrigé**, mesuré **dans le navigateur**, sur les `.js` réellement demandés (K0, partie `poids`) :
  - `/controle/station`, moins ce que demande `/controle` : 400 Kio en gzip au plus [supposé] (Phaser et le code de la station) ;
  - ailleurs (`/controle`, `/site/[slug]`, `/p/[slug]`) : aucun morceau de Phaser demandé, et 1 Kio d'écart au plus (la table du runtime).
- Une version réduite de Phaser reste possible [à mesurer].
- **Les thèmes** : 700 Ko par thème, 1,5 Mo en tout, inchangé.
- **La cadence.** K3 prouve une vraie marche (`astar2D` sur le thème d'essai) et mesure la cadence pendant cette marche : 30 images par seconde à 390 px, processeur ralenti ×4, sous Chromium. L'usine n'a qu'un rendu logiciel : le vrai écran se juge sur ton téléphone, à la recette (026-140).
- **Au repos, aucune image n'est dessinée** (CA-4), prouvé par `game.loop.frame` (§0.4).

### 0.9 Les fiches de la série 026

**Ce que ce paragraphe change au §8.**
- Il **remplace** 026-113 (le moteur) par sept fiches : K1, K2, K3, K4a, K4b, K4c et K5. Le découpage de 026-113 en quatre (§8.1) n'a plus de sens.
- Il **ajoute** K0, les juges propres à Claw3D.
- Il **garde N3** : elle n'est plus fondue dans K2, car N4 en dépend et doit passer avant.
- Il **coupe N1 en deux** : N1a (la partie `planche`, pour que F0 parte tout de suite), puis N1b (le reste).
- Il **réoriente** F0, N1, N5, N6, N8 et N12, et **corrige** N4.
- Il **garde telles quelles** N0, N2, N7, N9, N10 et N11, ainsi que **026-164**, déjà écrite par la revue du 25/09 (panneaux du Radar, de la Tour du Crieur, du Studio pubs et du Chantier du code), que le §8 ignorait.
- Il **complète** six retouches du §8.1 (026-092, 026-104, 026-111, 026-130, 026-132, 026-140).
- Il **retouche deux règles de l'INDEX** (le PC, ci-dessous).
- Il **remplace** l'ordre du §8.3.

Les noms sont provisoires ; l'assemblage leur donne leur id et leur vague. Chaque juge est écrit par Claude Code **avant** la production.

**Le PC ne construit ni ne juge plus rien.** C'était une supposition ; elle contredisait l'INDEX.
- Le PC avait 668 Mo de mémoire vive libres le 25/09 [mesuré par la relecture]. Phaser pèse 148 Mo dans `node_modules`, avec un fichier ESM de 7,9 Mo à minifier au build (`dist/phaser.esm.js`, relu sur l'usine).
- Or l'INDEX dit encore « le verdict officiel reste celui du PC » (`INDEX.md:10`, relu) et « Chaque PASS est poussé par Claude Code (`npm run build`… » (`:186`, relu). 026-001 ne porte pas cette règle (recherche, relu).
- **Retouche de l'INDEX** (« Comment lire » et « Les vagues ») : le verdict officiel et le build d'avant push se font sur l'usine, par `node scripts/usine.mjs executer -- …` (commit 3315141, `scripts/usine.mjs:15-39`, relu). Le PC ne fait que du git.
- **Les fiches qui doivent voir le rendu** (moteur, thèmes, téléphone) vont à Codex, sur l'usine.
- **Antigravity, sur le PC, garde les panneaux HTML** (N7, N8, N9, N11) : il écrit le code ; le juge tourne sur l'usine et rapatrie ses captures (`--rapatrier`) [supposé : l'orchestre sait le faire pour une fiche Antigravity ; à vérifier à l'assemblage].

#### Les fiches nouvelles ou réorientées

Les budgets sont [supposés] ; l'assemblage les fixe. 026-113 avait 10 fichiers et 25 min, jugés impossibles (§8.1).

| Nom | Objet | Exécutant | Juge (écrit avant) | Dépend de | Budget | Tes gestes |
|---|---|---|---|---|---|---|
| **K0** · Juges Claw3D (nouvelle) | `station-claw3d-qa.mjs`, dix parties : **provenance** (notice MIT et `PROVENANCE.md`, `profile.ts` compris ; aucun fichier retiré au §0.3 ; aucun import de `node:*`, `ws`, `three`, `@react-three/*`, `lib/gateway`, `lib/runtime` ; aucun `URLSearchParams` dans `moteur/`) ; **verite** (§0.4 : déterminisme, sources interdites, piège de la pause, décor sans donnée) ; **repos** (vraie cadence, `game.loop.frame`) ; **garde** (sans session : aucun morceau de Phaser, aucun canevas) ; **csp** (zéro violation ; requêtes limitées aux routes du §0.5, au préfixe du thème et à `/_next/static/`) ; **poids** (dans le navigateur, §0.8) ; **pixel** (grille × k entier, à densité 1, 2, 2,625 et 3) ; **contexte** (perte de contexte WebGL simulée : la carte revient) ; **grille** (dans la grille du moteur, chaque salle et chaque poste sont joignables par `astar2D` depuis le Commandement ; le tapis reste continu) ; **hygiene** (`CHEMINS_APP_PRESTI` couvre `/station/themes/…`). Il fixe le format du thème (`theme.schema.json`), que N3 type et que le thème d'essai respecte. Tourne sur l'usine | claude-code | lui-même : un moteur piégé par partie doit échouer (un `Phaser.Math.Between` caché, un `fetch` externe, Phaser importé dans le layout du Poste, notice absente, inactif → Repos, un appel du pont à chaque lecture) ; **et un témoin** : le portage corrigé de B passe toutes les parties | N1b (même lot), 026-104 | — | — |
| **F0** · La planche, dans Claw3D (réorientée) | Dans l'atelier `~/claw3d-pixel` (liste blanche fermée, §0.5), la station redessinée avec le pack retenu (R9). **Les 20 salles**, dans **la vraie mise en page** (barre, colonnes et bandeau vides, à leurs tailles), à 1440 × 900, 1280 × 800 et 390 × 844 à densité 3. L'art du pack à son échelle d'origine, à côté de t049.2. 4 personnages en marche et au poste, 1 portrait, la nébuleuse. **Aucune donnée** (écrans « — »). La grille du thème fixée d'après les tuiles du pack. Pour le Vaisseau, 3 modules. `licence.json` | claude-code (licences et composition) | `station-themes-qa.mjs --partie=planche` (N1a) : il lance l'atelier sur 127.0.0.1, capture lui-même aux trois tailles, vérifie poids, licence, grille entière, palette, 20 plaques, image non uniforme | R9, N1a | — | **Choisir le pack** (R9) ; **regarder la planche et dire oui** |
| **N1a** · Juge de la planche (nouvelle, sortie de N1) | La partie `planche` de `station-themes-qa.mjs` | claude-code | elle-même | 026-104 | — | — |
| **N1b** · Juges de la station (réorientée) | Le reste de N1 (§8.2), plus la partie `carte`, qui reprend les critères de l'ancienne 026-113 | claude-code | elle-même (lot t) | N1a | — | — |
| **N3** · Modules purs (gardée, plus fondue dans K2) | `lib/pilotage/theme.ts` (types, d'après `theme.schema.json`), `disposition.ts` (`validerDisposition`, grilles bureau et portrait), `reglages.ts` (`validerReglages`, `fusionner`, `appliquerReglages`) | codex (usine) | `station-themes-qa --partie=modules` (N1b) | N1b, K0, 026-070 | 6 fichiers, 25 min | — |
| **N4** · Route des réglages (corrigée) | Comme au §8.2, plus : la première instruction du `GET` et du `PUT` est `actif('pilotage')` → 404 ; le fichier entre dans la ligne `pilotage` de `fermeture-e2e.mjs` (seule ligne touchée) | claude-code | `station-reglages-qa.mjs` (N1b), avec « drapeau baissé → 404 » sur `GET` et `PUT` | N2, N3, 026-092 | — | Accord sur le diff |
| **K1** · Le moteur nu (nouvelle) | Copier dans `app/controle/station/moteur/claw3d/` ce que garde le §0.3, avec `LICENSE-claw3d.txt` et `PROVENANCE.md`. L'hôte réécrit en mode station seul, avec un module CSS à la place de Tailwind. `phaser` à version exacte dans `package.json`. **`Carte.tsx`** (le cadre vide de 026-111) charge le moteur par `next/dynamic(..., { ssr: false })`. `station\/.*` dans `CHEMINS_APP_PRESTI` de `proxy.ts`. Jamais de `npm install` dans `~/claw3d-pixel` : ses `node_modules` sont des liens durs vers ceux de `~/claw3d` | codex (usine) | K0 `--partie=provenance,garde,csp,poids,repos,hygiene` | K0, 026-111, 026-008 (Next 16, `proxy.ts`) | 16 fichiers, 30 min | **Accord sur le diff** (`package.json`, `proxy.ts`) |
| **K2** · Le chargeur du thème (nouvelle) | Un seul chargeur de `theme.json`, sous le préfixe fixe, vers la carte du moteur (emplacements rectangles ou polygones, portes, postes, plaques, teintes, coursives, tapis, bloc `portrait`), puis vers la grille de marche ; une seule fonction porte → poste ; `STATION_ROOMS` devient le thème d'essai, sans donnée | codex (usine) | K0 `--partie=grille,provenance` ; `station-themes-qa --partie=modules` (N1b) | K1, N3, F0 acceptée (la grille) | 6 fichiers, 25 min | — |
| **K3** · La vérité dans le moteur (nouvelle) | L'adaptateur du §0.4 : `positions()` → `ActeurStation` → signature → pont (seulement si elle change) → la scène ne traite que les agents changés → emplacement → poste → `astar2D` → une marche → la boucle dort. `seed: ['station']`. Pause : une marche vers le Repos, puis « Zz ». Panne : étincelle fixe. Halo fixe. Bulle jusqu'à l'événement suivant. Antenne : 2 s par événement réel. Couleur et avatar pris dans les réglages ; cache par nom, couleur et avatar. Mouvement réduit. La cadence mesurée pendant une vraie marche | codex (usine) | K0 `--partie=verite,repos` ; 026-104 CA-4, CA-6, CA-7 | K2, 026-070, 026-092 (jeux d'essai d'abord) | 6 fichiers, 30 min | — |
| **K4a** · La caméra et la carte (nouvelle) | Échelle entière en pixels de l'appareil ; zoom ×1 à ×3 ; vue d'ensemble ⊞ ; glissé borné dans la nébuleuse, croix ; cadre blanc ; survol ; étiquette à pointe ; hublot en polygone ; teinte par salle | codex (usine) | `pilotage-ecran-qa --partie=carte` (N1b) et K0 `--partie=pixel` | K3 | 8 fichiers, 30 min | — |
| **K4b** · Ce qui bouge sur la carte (nouvelle) | Tapis et « +1 » ; lignes du Crieur et de l'Usine ; égaliseur ; écran de l'Expérience (« FERMÉE · R13 » avant la première vente) ; badges LV. Tout est nourri par les enveloppes, dans les calques (c) et (d), jamais dans le décor | codex (usine) | `pilotage-ecran-qa --partie=carte` (N1b) ; K0 `--partie=verite` (décor rendu avec un jeu vide : « — ») | K4a, 026-070, 026-092 | 8 fichiers, 30 min | — |
| **K4c** · Le calque HTML (nouvelle) | Plaques, noms, bulles, « Zz » et « +1 » en police OFL (fin de la police 3 × 5) ; miroir accessible ; clavier | codex (usine) | `pilotage-ecran-qa --partie=carte` (N1b) | K4a | 6 fichiers, 25 min | Regarder les captures du juge |
| **N5** · Thème Station (réorientée) | Comme au §8.2, au format du moteur, sur la grille fixée par F0 : `theme.json` à 20 emplacements et son bloc `portrait`, atlas en textures Phaser (personnages en marche et au poste), nébuleuse, portraits, palette tirée de t049.2, `licence.json` | codex (usine) | `station-themes-qa --theme=station` (N1b) et K0 `--partie=pixel,grille` | F0 acceptée, K2, K4a | 8 fichiers, 40 min | Regarder, dire oui |
| **K5** · Le téléphone (nouvelle) | Cadre de 358 px ; vue d'ensemble, ou grille `portrait` du thème ; pincement dans le cadre seulement ; +, − et ⊞ en 44 px ; plaques à partir de ×2 ; `touch-action: none`, `gesturestart` bloqué sous Safari ; perte de contexte ; `scrollWidth ≤ 390` | codex (usine) | `pilotage-ecran-qa --partie=webkit` (N1b) : `scrollWidth`, feuilles, et des `TouchEvent` synthétiques envoyés au cadre. Playwright 1.63 n'offre au toucher que `tap(x, y)` (`playwright-core/types/types.d.ts`, relu sur l'usine) : il ne sait pas pincer. K0 `--partie=contexte` | K4c, N5 | 6 fichiers, 25 min | **L'essayer sur ton téléphone** : le pincement et le blocage du zoom de page ne se prouvent que là |
| **N6** · Thème Vaisseau (réorientée) | Au format du moteur : modules vus de dessus, hexagones, sas ; mise en page flottante | codex (usine) | `station-themes-qa --theme=vaisseau` (N1b) et K0 `--partie=pixel,grille` | N5, K5, ton oui sur la Station | 8 fichiers, 40 min | Regarder, dire oui |
| **N8** · Panneau du Commandement (réduite) | Le seul panneau de la salle Commandement. Radar, Tour du Crieur, Studio pubs et Chantier du code sont à 026-164 | antigravity (juge sur l'usine) | `pilotage-ecran-qa --partie=salles2 --lot=a` (N1b) | 026-120, N10 | — | — |
| **N12** · Mutations (réorientée) | Comme au §8.2, plus les mutations de `station-claw3d-qa` | codex (usine) | méta-juge de 026-001 | N0 à N11, K0 à K5 | — | — |

#### Les fiches qui ne changent pas

N0 (extraction du Poste vers `lib/`), N2 (migration 0113), N7 (panneau Réglages), N9 (panneaux Audience, Sécurité, Presti, Observatoire, Repos), N10 (lecteurs de la route), N11 (Missions, Succès, Aide) ; et 026-164. Leurs juges tournent sur l'usine (INDEX retouché).

#### Les retouches du §8.1 complétées

| Fiche | Ce qui s'ajoute au §8.1 |
|---|---|
| 026-092 | **`DOMAINE_DE` par objet** (§0.7) ; le tri par sous-partie en fonction pure, `trier(enveloppes, peut)` |
| 026-104 | **CA-1 réécrit** : « Phaser permis, seulement sous `app/controle/station/moteur/`, chargé à la demande ; ni three, ni React Three Fiber, ni drei ». Il interdisait three et pixi. **CA-11 réécrit** : la mesure dans le navigateur du §0.8 (plus de « 340 Ko »). **ST-1** : plus le préfixe du thème, par le chargeur unique. **Critères nouveaux** : zéro violation CSP, zéro image au repos (`game.loop.frame`), sources de hasard et de temps interdites dans `moteur/`, notice MIT présente. Les critères de 026-113 (CA-2, CA-4, CA-6, CA-7, CA-10, CA-12) y passent, inchangés sur le fond |
| 026-111 | Budget JS : §0.8. **`Station.tsx` ne rend `<Carte />` qu'après un 200 de `vue=direct`**, avec les redirections du Poste (§0.5). `page.tsx` et `Carte.tsx` restent ceux que 026-111 écrit : `Carte.tsx` est le cadre vide `[data-station-carte]`, que K1 remplit. **Plus rien sur `CHEMINS_APP_PRESTI`** : `proxy.ts` et `middleware.ts` sont interdits à 026-111 (`026-111.md`, ligne `interdit`, relu) ; la ligne passe à K1. Ainsi 026-111 ne dépend plus de K1 |
| 026-113 | **Remplacée par K1 à K5.** L'assemblage peut lui laisser son id pour K1 |
| 026-125 | Toujours gardée. L'écran de la Salle Expérience, sur la carte, est dessiné par K4b et non plus par 026-113 |
| 026-130 | La mutation « sous-partie d'argent servie sans `comptabilite` » passe par le verdict synthétique (§0.7) ; plus une mutation de `DOMAINE_DE` (l'étape PAYÉ sous `sante` doit échouer) |
| 026-132 | Plus les mutations de la partie `carte` de `pilotage-ecran-qa` |
| 026-140 | La recette ouvre la station Claw3D au bureau et sur ton téléphone (pincement compris), et vérifie la provenance |
| INDEX.md | K0 à K5 ; 026-113 remplacée ; N1 coupée en N1a et N1b ; N3 gardée ; **les deux règles du PC** (l.10 et l.186) ; 026-164 dans l'ordre de la station |

**Au §4**, les éléments qui renvoyaient à 026-113 renvoient maintenant à K2, K3, K4a, K4b, K4c ou K5 (corrigé en place le 25/09).

**Le décompte** [calculé]. 23 fiches nouvelles ou réorientées (19 avant : K4 coupée en trois, N3 gardée, N1 coupée en deux), 15 retouchées, 3 gardées (026-055, 026-125, 026-164), 026-113 remplacée, et l'index. Soit 38 fiches à écrire ou à retoucher, contre 34 avant.

#### L'ordre (remplace le §8.3)

1. **Tout de suite, sans attendre le bus** : ton « 2D, pas 3D » (captures A et B) et ton choix dans le lot A (R9) → N1a → F0 dans l'atelier de l'usine → tu regardes la planche des 20 salles, dans la vraie mise en page, et tu dis oui.
2. **En parallèle, les juges puis le code** : la retouche de l'INDEX (le PC) ; les retouches de 026-066, 026-067, 026-104 ; N1b et K0 ; puis 026-070, 026-092, N0, N2, N3, N4.
3. **La station**, après Next 16 (026-006 → 026-008, déjà en tête de la série) : 026-111 → K1 → K2 → K3 → K4a → K4b et K4c → N5 → K5 → ton oui → N6.
4. **Les salles et les vues** : 026-120 → N10 → 026-164, N8 et N9 ; N7 ; N11 ; 026-117 ; 026-123 ; 026-125.
5. **La contre-vérification et la recette** : 026-130, 026-132, N12 → 026-140.

Les règles de la série tiennent : au plus une fiche Claude Code, une fiche d'exécutant sur le PC et deux fiches Codex sur l'usine à la fois (INDEX, « Comment lire »).

### 0.10 Les risques

1. **Le style.** B est proche de trevsagents par la structure, pas encore par la richesse du dessin. F0, jugée dans la vraie mise en page, en décide ; ta réaction reste la mesure.
2. **Le poids** : 307 Kio de Phaser, sur une seule page (§0.8).
3. **Le téléphone** : la perte de contexte WebGL sous iOS [à vérifier] ; Phaser sait aussi dessiner sans WebGL, en Canvas [supposé]. Le pincement ne se prouve que sur ton téléphone (§3.3).
4. **Les versions** : Phaser 3.90 sous Next 16, avec le build en `next build --webpack` (026-006, relu) [à vérifier au premier build, sur l'usine]. Au moment de K1, Presti ne sera plus en 15.5, et `middleware.ts` sera devenu `proxy.ts` (026-008). Le prototype passe `tsc --noEmit` sous Next 16.1.7, la version de Claw3D : c'est plutôt rassurant.
5. **La licence** : garder la notice MIT ; aucun `.glb`.
6. **Les mises à jour de Claw3D** : on part d'un état figé (0565b78). Une nouveauté de Claw3D se reprend à la main, fichier par fichier, d'après `PROVENANCE.md`.
7. **Les données** : jusqu'au bus, des jeux d'essai seulement.
8. **L'usine.** Le relais ouvert de sa boucle locale reste ouvert tant que le Studio tourne ainsi (§0.5). Hors station, vu en passant : `rpcbind` écoute sur 0.0.0.0:111 et [::]:111 (`ss`, le 25/09) ; s'il est joignable depuis Internet [à vérifier].

### 0.11 Ce que l'attaque a changé

Deux relectures adverses du §0 ont trouvé 36 défauts (5 graves, 16 moyens, 15 mineurs). Cinq étaient en double entre les deux : il en reste 31. J'ai revérifié chacun (code relu, captures vues, mesures refaites). **Tous sont réels** ; sept corrections s'écartent un peu de ce que proposait l'attaque, et le disent (en italique).

| # | Défaut | Gravité | Correction |
|---|---|---|---|
| 1 | Le type d'acteur gardé ne porte ni salle, ni motif, ni pause ; le prototype envoie tout agent inactif au Repos, et un agent sans poste au Commandement (`StationPixelScene.ts:32-33`). Le Crieur « en pause » de B n'est qu'inactif | Grave | Type `ActeurStation`, rempli par `positions()` seule ; la scène ne déduit jamais une salle ; piège dans K0 ; ligne de B corrigée (§0.2, §0.3, §0.4, §0.7) |
| 2 | La chaîne suppose encore le PC (668 Mo libres) ; l'INDEX dit « verdict officiel du PC » | Grave | Deux règles de l'INDEX retouchées : verdict et build sur l'usine (`usine.mjs executer`) ; fiches de rendu à Codex (§0.9). *Écart : 026-001 ne porte pas cette règle, rien à y changer* |
| 3 | Budget de 340 Ko faux (cadriciel + Phaser ≈ 409 Kio) ; « identique à l'octet » impossible ; le manifeste ne voit pas Phaser | Grave | Mesure dans le navigateur : 400 Kio au plus en plus de `/controle` ; ailleurs aucun morceau de Phaser, 1 Kio d'écart au plus (§0.8). *Écart : je mesure `/controle/page` à 273 Kio, pas 234 ; la conclusion ne change pas* |
| 4 | B n'est pas l'écran réel (×3 plein écran, sans colonnes) ; 7 salles à la même paire de bureaux ; Ganamoda trop grand pour les salles | Grave | F0 : 20 salles, vraie mise en page, trois tailles, art à son échelle, grille fixée avant K2 ; ton oui sur F0, pas sur B (§0.2, §0.6, §0.9). *Écart : à ×2, la coque tient jusqu'à 1396 px de large, pas 1198 (recalculé)* |
| 5 | 026-111 et K1 dépendent l'une de l'autre et se disputent `page.tsx` ; `proxy.ts` est interdit à 026-111 | Grave | K1 remplit `Carte.tsx`, le cadre vide de 026-111 ; la ligne de `proxy.ts` passe à K1 (§0.9). *Écart : `page.tsx` reste à 026-111* |
| 6 | Chiffres peints en dur dans le décor (égaliseur, histogramme, « J6/30 0EUR ») alors que l'Expérience doit dire « FERMÉE · R13 » | Moyen | Décor sans donnée ; écrans dans les calques (c) et (d), nourris par les enveloppes (K4b) ; critère « jeu vide → — » (§0.2, §0.4) |
| 7 | La route des réglages répond et écrit drapeau `pilotage` baissé | Moyen | `actif('pilotage')` en tête du `GET` et du `PUT` ; ligne de `fermeture-e2e.mjs` ; N4 (§0.5, §0.9) |
| 8 | Un même chiffre sous quatre domaines ; aucun vrai compte ne fait refuser une sous-partie | Moyen | `DOMAINE_DE` par objet ; `trier(enveloppes, peut)` jugée avec un verdict synthétique (§0.7). *Écart : pas de rôle synthétique dans le code de production, un verdict injecté dans une fonction pure* |
| 9 | Phaser réveillé à chaque lecture, pas à chaque changement ; `sleeping` jamais remis à `false` | Moyen | Signature avant d'appeler le pont ; la scène par agent ; juge « repos » à la vraie cadence, sur `game.loop.frame` (§0.4) |
| 10 | Juge « verite » trop large (`Math.sin` du hublot) et contournable (hasard de Phaser, minuteries, tweens) ; pas de témoin positif | Moyen | Déterminisme ; `seed: ['station']` ; liste des sources interdites ; témoin (§0.4, K0). *Écart : la recherche de `sin` est retirée, pas limitée : le déterminisme couvre le cas* |
| 11 | La migration vers Next 16 est ignorée | Moyen | Risque 4 réécrit ; `proxy.ts` ; K1 dépend de 026-008 (§0.5, §0.10) |
| 12 | N8 double 026-164 | Moyen | N8 réduite au Commandement ; 026-164 gardée ; décompte refait (§0.9) |
| 13 | Les preuves de rendu viennent d'une scène qui ne marche jamais ; « 60 images/s » mesure une page au repos ; les « rectangles sales » n'existent pas avec Phaser | Moyen | K3 prouve et mesure une vraie marche ; le chiffre est requalifié ; calque (c) corrigé ; le vrai écran se juge sur ton téléphone (§0.2, §0.8) |
| 14 | « B, c'est bien Claw3D » exagéré | Moyen | La liste exacte de ce qui vient de Claw3D ; le dessin est à nous (§0.2) |
| 15 | Le juge WebKit ne sait pas pincer | Moyen | `TouchEvent` synthétiques ; le pincement se prouve sur ton téléphone (K5, §3.3) |
| 16 | K4 trop grosse ; aucune fiche K n'a de budget | Moyen | K4a, K4b, K4c ; un budget par fiche (§0.9) |
| 17 | N4 dépend de N3, fondue dans K2, qui passe après | Moyen | N3 gardée, avant N4 et K2 (§0.9) |
| 18 | La moitié moteur de K2 n'a pas de juge | Moyen | K0 `--partie=grille` (§0.9) |
| 19 | Le moteur démarre avant la garde | Mineur | `<Carte />` montée après un 200 de `vue=direct` ; K0 `--partie=garde` (§0.5) |
| 20 | Couleur selon le rang ; textures gardées par identifiant | Mineur | Couleur des réglages ; cache par nom, couleur et avatar (K3, §0.2) |
| 21 | On ne sait pas qui charge le thème ; les routes lues ne sont pas toutes listées | Mineur | Un chargeur à préfixe fixe ; la liste des routes ; contrôle des requêtes dans le navigateur (§0.5) |
| 22 | `profile.ts` non déclaré ; hôte qui importe les scènes retirées ; `?pixel=0` dans `config.ts` | Mineur | `profile.ts` déclaré ; hôte réécrit ; seule `PIXEL_PALETTE` ; K0 cherche `URLSearchParams` (§0.3) |
| 23 | L'option 3D chiffrée en poids seulement | Mineur | §9 : la 3D obligerait à refaire la règle de vérité |
| 24 | Un relais ouvert sur la boucle locale de l'usine | Mineur | Ton geste : arrêter le Studio ou le relancer avec une liste blanche ; l'atelier avec une liste fermée (§0.5, §9). *Écart : je n'ai rien arrêté, ta règle l'interdit* |
| 25 | L'hôte copié suppose Tailwind (cadre à 0 px) | Mineur | Module CSS du moteur (K1) |
| 26 | La description de B trop flatteuse | Mineur | Ligne réécrite (§0.2) |
| 27 | R9 et F0 périmés : le lot A est déjà sur l'usine | Mineur | R9 devient un choix dans le lot A ; F0 part tout de suite (§0.9, §9) |
| 28 | K1 oublie ton accord sur le diff (`package.json`) | Mineur | Accord sur le diff de `package.json` et `proxy.ts` (K1) |
| 29 | Le §4 renvoie encore à 026-113 | Mineur | Corrigé en place |
| 30 | Pas de grille portrait dans le format du thème | Mineur | Bloc `portrait` de `theme.json` (§0.6) |
| 31 | F0 attend tout N1 | Mineur | N1a (la planche) d'abord (§0.9) |

**Ce qui n'a pas été repris.**
- **« N8 absorbe 026-164 »** : 026-164 est déjà écrite, avec son juge. On la garde ; N8 se réduit.
- **« Refaire la capture B avant de demander ton oui »** : inutile, ton oui sur le rendu passe à F0.

---

## 1. Ta demande

Le 24/09 à 23 h 52 (`Session-2026-09-15-Lestraque-Vague-5.md:199`), tu as posé trois exigences et une règle :

- **Dans le Poste de contrôle.** Pas une application à côté.
- **Personnalisable comme dans les vidéos.**
- **Elle contient TOUT.**
- **La règle** : Claw3D si on peut l'intégrer au Poste, sinon le pixel art dans le Poste.

Tu as aussi demandé d'accélérer (« Claude aide Codex »). Ce document est la partie « interface » de cette accélération : il donne aux exécutants une spécification qu'ils peuvent produire sans revenir te demander.

Ce que j'ai fait pour y répondre :
1. **Claw3D** : installé sur l'usine le 24/09 à 23 h 42, puis son code relu le 25/09, en lecture seule.
2. **L'inventaire** : chaque élément visible des deux vidéos, avec l'image qui le prouve et son équivalent chez Presti.
3. **La voie pixel art** : elle était déjà écrite dans la série 026 (026-070, 026-092, 026-104, 026-111, 026-113, 026-120).
4. **Une décision, puis son attaque** : 14 défauts, corrigés au §2.4.

---

## 2. La voie retenue (version corrigée)

**Remplacé par le §0 le 25/09.** Ta décision de 11 h 45 retient Claw3D. Ce qui suit est l'historique : la voie « pixel art maison, sans Claw3D ». Ses constats restent utiles, et le §0 y renvoie.

### 2.1 La décision

**Le pixel art DANS le Poste : la voie V3, enrichie.**
- **Où.** `/controle/station`, dans `app/controle/station/**`.
- **Quelles gardes.** La station hérite du drapeau `direction` (`app/controle/layout.tsx:18-20`, relu), puis de son propre drapeau `pilotage`. Drapeau baissé : la page répond 404.
- **D'où viennent les données.** Toutes passent par `/api/controle/**`, derrière `estFondateur` (`lib/direction/garde.ts:40-86`, relu).
- **Où ça tourne.** Sur Vercel, PC éteint.
- **Le rendu.** Canvas 2D, sans aucune dépendance. Le critère CA-1 de 026-113, qui interdit `three` et `pixi`, est gardé.
- **Claw3D est écarté sous toutes ses formes** : ni V1 (le portage), ni V2 (l'iframe), ni un hybride.
- **On ne reprend de Claw3D que deux idées**, refaites en 2D, sans aucun fichier : la cible d'interaction par salle, et les emplacements de salle.

**Ce qui change par rapport à la série 026 telle qu'elle est écrite :**
1. **La couche de thèmes devient une donnée.** Chaque thème apporte son `theme.json` (grille, emplacements, graphe des coursives, palette par défaut, mise en page), son atlas d'images, son fond peint et son `licence.json`.
2. **Les thèmes sont livrés l'un après l'autre** : d'abord « Station », façon trevsagents, puis « Vaisseau », façon androoagi, après ton accord sur la planche.
3. **R9, la source du dessin, devient un préalable bloquant.**

### 2.2 Pourquoi

Ta règle : Claw3D si on peut le brancher au Poste, sinon le pixel art dans le Poste. **Claw3D ne se branche pas d'une façon qui tienne.**

**(1) V2, l'iframe.**
- Les deux politiques qui interdisent l'iframe nous appartiennent : `~/claw3d/next.config.ts:11` et `:39` dans notre copie sur l'usine (relus), `next.config.mjs:40` chez Presti (relu). On pourrait les changer : ce ne sont pas elles qui bloquent.
- **Le vrai blocage est ailleurs.** Il faudrait exposer l'usine sur Internet, derrière un seul jeton partagé en cookie tiers (`access-gate.js:84-104`). Safari bloque ce cookie [déduit]. Et ce chemin contourne `estFondateur` et la reconfirmation par mot de passe : une seconde porte vers les agents.

**(2) V1, le portage, revient à tout réécrire.**
- Les 8 salles sont codées en dur (`src/lib/office/places.ts:1-10`, relu).
- Phaser tourne en `pixelArt: false` (`OfficePhaserCanvas.tsx:73`, relu).
- Il y a environ 5 000 lignes de rendu, plus un orchestrateur de 7 248 lignes.
- `three`, R3F et drei sont absents de `presti/package.json:13-29` : environ 250 à 300 Ko gzip en plus [déduit].
- Le serveur Node maison et son proxy WebSocket ne tournent pas sur Vercel (`server/index.js:98-126`).

**(3) Même par l'adaptateur « custom runtime », Claw3D contredit la règle de vérité.**
- Le journal du 25/09 à 00 h 54 retenait encore « Claw3D par l'adaptateur custom runtime » (`Session-…-Vague-5.md:201`).
- Mais cet adaptateur ne pousse aucun événement : `onRuntimeEvent` rend `() => {}` (`src/lib/runtime/custom/provider.ts:328-330`, relu).
- Et un agent inactif se promène au hasard : `if (Math.random() < 0.005)` (`RetroOffice3D.tsx:2104`, relu). Il y a aussi le canapé et le ping-pong.
- trevsagents dit l'inverse de son propre écran : ses agents « ne bougent pas au hasard » (voix de 33 à 49 s).

**(4) Le style n'est pas le bon.**
- Les deux références sont en 2D pixel art : une coupe octogonale sur nébuleuse chez trevsagents (t049.2, vu), des modules vus de dessus chez androoagi (t040.0 et t174.0, vus).
- Claw3D est un bureau 3D isométrique en bois (vu à `/office` le 25/09).
- trevsagents dit lui-même que son écran est OpenClaw plus une surcouche faite maison (voix de 89 à 99 s). Ce n'est pas Claw3D.
- OpenClaw est écarté depuis le 25/09 à 00 h 54.

**(5) La voie pixel art est déjà écrite et jugée.**
- Des règles de position pures, sans `Math.random` ni `Date.now` (026-070).
- Une seule route de lecture, derrière `estFondateur` (026-092).
- Un juge qui injecte un événement, mesure la marche, puis l'immobilité (026-104, 026-113).
- 0 Ko de dépendance, une CSP inchangée, et au téléphone un canevas qui s'arrête au repos. L'interface de Claw3D est cassée à 390 px (vu le 25/09), et son WebGL redessine sans cesse.

### 2.3 Le risque principal

**La qualité du dessin.** Ta réaction reste la mesure (mémoire « Démo : la barre de Benj »). Ce risque ne se réduit qu'avec la vraie source d'art : c'est la fiche F0 (§8.2), qui produit une planche statique des deux thèmes, avec la source retenue, **avant** toute fiche de moteur.

### 2.4 Ce que l'attaque a changé

| Défaut | Gravité | Correction | Où |
|---|---|---|---|
| La source du dessin n'était pas tranchée. Le seul dessin prévu était un jeu de personnages de 16 × 16 pixels généré par script (026-113 l.50-60), loin des salles meublées des vidéos | Grave | R9 devient un préalable ; trois voies (§9) ; la planche se fait avec la source retenue | §2.3, §8.2 F0 |
| Le « facteur entier » ne tenait pas : une grille de 480 × 270 n'entre dans un cadre de 800 × 776 qu'à ×1, et pas du tout dans 358 px ; il était compté en pixels CSS, qui scintillent sur les écrans de densité 2,625 | Grave | Le facteur se compte en pixels de l'appareil ; chaque thème fixe sa grille pour son cadre ; la vue d'ensemble peut être fractionnaire | §3.0.3 |
| Une seule garde, `sante`, pour toutes les lectures, alors que chaque route du Poste garde le domaine de sa donnée | Grave | Une garde par sous-partie ; le partenaire n'a pas la station | §3.0.1, §6.2 |
| Des sources fausses : `/api/controle/crons` n'existe pas, `/api/controle/support` exige un artisan, `CRONS_ATTENDUS` n'a que 4 crons généraux, et les routes du Poste calculent en ligne | Moyen | Fiche N0 d'extraction ; sources corrigées ; un compte agrégé des tickets de support | §6.3 |
| La nébuleuse et le halo néon ne sont pas du pixel art | Moyen | Quatre calques : fond lisse, décor précalculé, acteurs, textes en HTML | §3.0.3 |
| Dans les vidéos, la carte remplit l'écran sous les panneaux | Moyen | Carte plein cadre, colonnes translucides, `mise_en_page` par thème | §3.1 |
| Cinq contradictions avec les brouillons (pause, poids, 15 zones, ST-1, budget de 026-113) | Moyen | Retouches nommées ; 026-113 découpée en quatre | §8.1 |
| Un éditeur de disposition libre casserait le graphe des coursives et les tapis | Moyen | Emplacements fixes par thème, vérifiés par une fonction pure | §5.3 |
| Le juge du téléphone ne tourne qu'en Chromium | Moyen | Un passage WebKit ; les plaques à partir du zoom ×2 | §3.3, §8 |
| Le numéro de version posé dans le HTML du layout, servi sans garde | Mineur | `direct.barre.version`, derrière la garde | §3.1 A |
| « ENCAISSÉ » ne disait pas si c'est le brut ou le net | Mineur | Le net partout, comme `BarreEtat.tsx:81` | §3.1 B |
| Cinq éléments des vidéos oubliés | Mineur | Ajoutés (n° 101 à 105) | §4 |
| Deux arguments contre Claw3D étaient forcés | Mineur | Réécrits ; la conclusion ne change pas | §2.2 |
| Une police bitmap maison pour un faux problème | Mineur | Une police pixel sous licence OFL, en calque HTML | §3.0.3 |

J'ai relu moi-même, le 25/09, les lignes du Poste que l'attaque cite : `app/controle/layout.tsx:6-10` et `:18-20`, `lib/controle/droits.ts:62-80`, `app/api/controle/barre/route.ts:4`, `app/controle/BarreEtat.tsx:81`, `app/layout.tsx:23`, `lib/alertes.ts:186-188`, `next.config.mjs:36-40`, `app/api/controle/support/route.ts:21-31`. Elles disent ce que l'attaque dit [relu].

### 2.5 Le coût comparé

- **V3 enrichie (retenue)** : 14 fiches ajoutées et 16 retouchées, plus l'index (§8). L'attaque estimait 13 à 15 et environ 18 [estimé] ; le décompte ligne à ligne donne ces chiffres. Aucune n'est lancée.
- **V1, le portage** : environ 7 fiches, 026-113 remplacée, la règle de vérité à reconstruire, et 250 à 300 Ko de plus.
- **V2, l'iframe** : environ 6 fiches, un fork à maintenir, et l'usine exposée sur Internet.
- **Le coût caché de la voie retenue** : deux thèmes doublent le dessin à maintenir. Chaque salle ou agent nouveau se dessine deux fois.

### 2.6 L'état réel au 25/09

Vérifié par moi dans `presti` (branche à 698f8eb) :
- `lib/pilotage/` et `app/controle/station/` n'existent pas [mesuré].
- Les migrations s'arrêtent à `0095_verrous_maj_slug.sql` ; le bus `ops` (0096) est absent [mesuré].
- `.orchestre/file/` est vide ; `en-cours/` ne contient que 023-03 et 025-10 [mesuré]. La série 026 n'est pas lancée.

**La station se construit donc d'abord sur les jeux d'essai du juge**, comme la série 026 le prévoit. Elle ne montrera de vrais chiffres qu'une fois le bus (0096 à 0098) et les lectures (0107, 0108, 0112, 0113) appliqués.

---

## 3. La spécification, écran par écran

Légende :
- **[n]** renvoie au numéro de l'élément dans l'inventaire coché du §4 ;
- **←** désigne la source de la donnée ;
- **fiche** : la fiche qui le construit (existante ou nouvelle, §8).

### 3.0 Le cadre commun

#### 3.0.1 Où, pour qui

- **Adresse.** `/controle/station` (fichiers `app/controle/station/**`).
- **Gardes héritées.** Drapeau `direction` baissé : 404 (`app/controle/layout.tsx:18-20`). Drapeau `pilotage` baissé : 404, par le layout propre de la station (026-111).
- **Accès depuis le Poste.**
  - Une entrée « Station » en tête du rail (`NAV`, `app/controle/page.tsx:49-60`), seulement quand `pilotage` est levé.
  - `/controle?onglet=pilotage` est redirigé vers la station (liens du digest).
  - Un lien « ← Poste » dans la barre ramène à `/controle`.
- **Liens profonds.** `?salle=<clé>`, `?agent=<nom>`, `?decision=<uuid>`, `?vue=missions|succes|aide|reglages`.
- **Qui la voit.**
  - **Les fondateurs.** Le rôle `direction` voit tout et agit.
  - **Un fondateur en lecture seule** (`direction_roles.role = 'lecture'`, `garde.ts`, relu) voit tout, sans aucun bouton et sans Réglages (ST-15).
  - **Le partenaire n'a pas la station.** Son rôle interne n'a ni `sante`, ni `comptabilite`, ni `securite`, ni `audience` (`lib/controle/droits.ts:62-80`, relu). La route lui répond 403 à l'entrée, et le rail ne lui montre pas l'entrée « Station ».
- **La garde des lectures** (corrigée) :
  - **à l'entrée** : `exigerDomaine(f, 'sante', 'voir')` ;
  - **puis une garde par sous-partie**, sur le modèle de `barre/route.ts:4` (qui trie champ par champ avec `peutFaire`) :
    - l'argent (encaissé, dépensé, marge, commandes, recettes, trésorerie, XP, missions en euros) : `comptabilite` ;
    - la Sécurité : `securite` ;
    - l'Audience : `audience` ;
    - Presti et l'Usine à sites : `clients` ;
    - le compte des tickets de support : `support`, en lecture, agrégé seulement ;
    - tout le reste : `sante`.
  - **Une sous-partie refusée** rend `nonMesure` avec la raison « hors périmètre ». Jamais un 0.
  - **Corrigé le 25/09 (§0.7)** : le domaine se fixe par objet, pas par zone (`DOMAINE_DE`). Commandes, ventes, étape PAYÉ du tapis et packs payés : `comptabilite` partout, même dans l'Usine à sites et au Commandement. Le tri est une fonction pure, jugée avec un verdict synthétique : aucun vrai compte ne peut faire refuser une sous-partie.
- **Les gestes.** Tout geste qui touche l'argent ou la sécurité demande le mot de passe (`lib/direction/reconfirmation.ts:11-13`, 300 s).
- **Les réglages** s'écrivent par `estDirection`, domaine `reglages`, verbe `ecrire`. Pas de mot de passe : ils sont cosmétiques. Mais ils sont journalisés avant et après (§5.5).

#### 3.0.2 La règle de vérité

Elle reprend le §4.0 de la rectification, et y ajoute ceci.
- **Aucune boucle décorative.** Les voyants restent fixes, le halo aussi. Le bandeau ne défile pas en boucle. Aucune vitesse ×2 ni ×10.
- **Ce qui déclenche une animation** : un changement des données servies (un événement du fil, un nouveau relevé), ou un changement réel de l'heure (l'horloge à la minute, le passage jour-nuit à l'heure pile). Chaque animation a une durée bornée.
- **Un chiffre, un seul objet.** Un même chiffre affiché à plusieurs endroits vient du même objet en mémoire de `Station.tsx` (mémoire « Deux chiffres, un écran »). Exemple : l'encaissé du mois apparaît dans la barre, la pastille du bandeau, la tuile Recettes et l'XP.
- **L'argent reçu relance l'argent.** Un événement d'argent reçu dans le fil (`commande_payee`, `pack_paye`) relance tout de suite la lecture de la trésorerie, une seule fois.
- **Une pause est un vrai changement d'état.** L'agent marche une fois vers la Salle de repos quand sa pause commence, puis ne bouge plus (§3.1 D).

#### 3.0.3 Le rendu, en quatre calques

- **(a) Le fond.** La nébuleuse peinte et les étoiles, en image lisse et statique (webp ou avif, 200 Ko au plus). Elle est posée en fond CSS sous `.mc` et couvre tout l'écran, sous la barre et sous les colonnes. Sur le vide, le curseur devient une croix [101].
- **(b) Le décor.** La coque, les salles, les meubles, les coursives et les plaques dessinées, en pixel art, depuis l'atlas du thème. Il est précalculé **une seule fois** dans un canevas hors écran, le halo néon déjà cuit : ni `filter` ni `shadowBlur` à chaque image. Il n'est recalculé que si le thème, les réglages, le niveau de zoom ou le passage jour-nuit changent.
- **(c) Les acteurs.** Personnages, carrés des tapis, étincelles, « Zz », antenne, égaliseur. Seuls eux sont redessinés, par rectangles sales. La boucle `requestAnimationFrame` s'arrête au repos (CA-4). **Corrigé le 25/09 (§0.2)** : avec Phaser, il n'y a pas de rectangles sales ; tout le canevas est redessiné à chaque image active, et la boucle dort au repos.
- **(d) Un calque HTML** au-dessus du canevas, pour les plaques, les noms, les bulles et les « +1 ».
  - Une police pixel sous licence OFL, servie par `next/font` depuis le layout de la station : aucun nouvel hôte, CSP inchangée (`font-src 'self'`, `next.config.mjs`, relu). Par exemple Pixelify Sans ou Silkscreen ; les accents français sont [à vérifier].
  - 12 px au moins. Au téléphone, visible à partir du zoom ×2.
  - Ce calque sert aussi aux lecteurs d'écran.
  - La police bitmap maison est abandonnée : `await document.fonts.load()` avant le premier dessin règle déjà le `preload: false` de JetBrains Mono (`app/layout.tsx:23`, relu).
- **L'échelle se compte en pixels de l'appareil.**
  - Taille du canevas = grille du thème × k, où k est entier. Taille CSS = taille du canevas ÷ `devicePixelRatio`.
  - Chaque thème dimensionne sa grille pour son cadre. Exemple : 400 × 388 pour le thème Station, à ×2 sur un écran de densité 1 [supposé].
  - La vue d'ensemble peut être fractionnaire et lissée. Le zoom avance ensuite par facteurs entiers, de ×1 à ×3.
- **Le reste de l'interface** est du HTML aux polices de Presti (`--font-display`, `--font-body`, `--font-mono`, `app/base.css:49-51`). Ses couleurs viennent des jetons `--mc-*`, que le thème actif remplit (§5.4).

#### 3.0.4 Le rythme (Vercel Hobby)

- **Direct et trésorerie** : toutes les 30 s.
- **Fil** : toutes les 5 s, avec le paramètre `apres`.
- **Conditions** : page visible seulement ; pause après 15 min sans geste (026-111, ST-14).
- **Un panneau ouvert** : il lit à l'ouverture, puis au plus 3 fois par minute (SA-10 de 026-120). Aucun panneau ne lit plus souvent, même le Standard : ses réponses nouvelles arrivent aussi par le fil, toutes les 5 s.
- **Réglages** : lus une fois au chargement, puis après chaque enregistrement.

#### 3.0.5 Le budget de performance

- JS de la station : 60 Ko gzip au plus [supposé]. ~~Relevé par le §0.8 le 25/09 : 340 Ko gzip au plus, pour la seule page de la station (Phaser compris), et 0 octet ailleurs.~~ **Corrigé par le §0.8 le 25/09 après-midi** : mesuré dans le navigateur, la station demande au plus 400 Kio gzip de plus que `/controle` (Phaser compris) ; ailleurs, aucun morceau de Phaser, et 1 Kio d'écart au plus.
- Thèmes : 700 Ko au plus par thème, atlas, fond et portraits compris ; 1,5 Mo au total. Le CA-11 de 026-113 (moins de 1 Mo) est relevé en conséquence.
- Les atlas sont des planches composites, jamais les feuilles brutes d'un pack.
- Au moins 30 images par seconde pendant une marche, à 390 px, processeur ralenti ×4 (Chromium seulement : le ralentissement passe par le protocole de Chromium [déduit]).
- `requestAnimationFrame` arrêté au repos.

### 3.1 L'écran de bureau (1440 × 900)

**La grille.**
- Une barre de 80 px, en deux lignes (36 px, puis 44 px).
- Le corps : la carte en plein cadre, avec le fond jusqu'aux bords, sous des colonnes translucides (un aplat semi-opaque, sans flou d'arrière-plan : trop coûteux au téléphone).
- Un bandeau de 44 px en bas.
- De 1024 à 1439 px : colonnes de 280 et 320 px. Sous 1024 px : la disposition téléphone (§3.3).

**La mise en page dépend du thème** (`mise_en_page` dans `theme.json`, réglable, §5) :
- **« colonnes »**, pour le thème Station (trevsagents t014.0 et t060.0, vus) :
  - à gauche, une colonne de 300 px : Équipage, puis Attention ;
  - à droite, une colonne de 340 px : Commandement, puis Journal ;
  - la station est centrée dans l'espace entre les deux ; la nébuleuse continue sous les colonnes.
- **« flottante »**, pour le thème Vaisseau (androoagi t000.0, t022.0, t040.0, vus) :
  - à gauche, la colonne d'équipage ;
  - le résumé de la salle ouverte flotte en haut à gauche, sur la carte ;
  - le Journal flotte en bas à gauche, repliable (▼) ;
  - les cartes Attention flottent à droite, sous la barre, comme les « ACTION NEEDED » (t020.0 et t166.0) ;
  - le Commandement est un panneau droit qu'on ouvre par ⚑ et qu'on ferme par ×.
- **Les colonnes se replient** [5]. L'état replié est gardé dans ce navigateur (`localStorage` sous try/catch). C'est une commodité, pas une donnée.

#### A. La barre, ligne 1 (36 px)

À gauche :
- **« ← Poste ».**
- **Le titre**, réglable, par défaut « PRESTI · MISSION CONTROL », suivi de « v » et des 7 premiers caractères du commit déployé [2].
  - ← `direct.barre.version`, lue derrière la garde (jamais écrite dans le HTML du layout, qui est servi sans vérifier l'identité : `app/controle/layout.tsx:6-10`).
  - La route la lit dans `VERCEL_GIT_COMMIT_SHA` ; que Vercel l'expose à l'exécution est [à vérifier] ; « dev » en local.
- **La pastille d'état** [3] :
  - « STATION EN LIGNE », en vert ;
  - « DÉGRADÉE », en jaune ;
  - « HORS LIGNE », en rouge, avec la raison au survol (« usine muette depuis 42 min »).
  - ← `direct.barre.sante`, calculée par **la même fonction** que la santé du service dans la barre du Poste (`BarreEtat.tsx:75-80`), sortie vers `lib/` par N0, plus les battements de l'agent `usine` (026-053) et du Veilleur `a0`.
- **Le fil d'Ariane** : « Station › Usine à sites », ou « Station › Facteur », selon la salle ou la fiche ouverte [3].

À droite :
- **« JOUR 12 · 14:32 »**, avec une lune ou un soleil [15, 24].
  - Le jour se compte depuis `LANCEMENT`, la date de levée du drapeau, posée par 026-140 dans `lib/pilotage/station.ts`.
  - L'heure est celle de Paris, à la minute. androoagi affiche la seconde (t022.0) : la minute suffit, et elle évite un rafraîchissement par seconde.
  - La lune s'affiche de 20 h à 7 h [paramètre, supposé], le soleil le reste du temps. Si le thème a une variante de nuit, le décor est redessiné une seule fois, à l'heure pile.
- **⚑** ouvre les Missions (`?vue=missions`) ; en thème Vaisseau, il ouvre le panneau Commandement [23].
- **L'icône Notifications** montre l'état de Web Push **sur cet appareil** (026-051), lu dans le navigateur : bleue si elles sont actives, grise sinon. Un appui ouvre Réglages › Notifications [23].
- **La cloche et son nombre** : le TOTAL de la file Attention, pas seulement les 7 cartes affichées [21].
- **L'interrupteur AUTO**, vert ou rouge [22]. Le couper déclenche la pause générale (026-044), sous mot de passe `securite` (026-117).
- **Aucun bouton de vitesse** [16, écarté].

#### B. La barre, ligne 2 (44 px) : les compteurs

- **Le style** [14] : chaque compteur a son étiquette en petites capitales et sa valeur en police mono, colorée selon son genre :
  - argent : `--mc-argent` (or) ;
  - temps : cyan ;
  - modèle : vert ;
  - cycles et comptes : jaune ;
  - expérience : gris ;
  - alerte : `--mc-crit` ;
  - muet : gris clair.
- **Une source absente** donne « — » et sa raison au survol. Jamais un zéro.
- **Si la largeur manque**, les compteurs passent sur deux lignes. Jamais de défilement horizontal.

Les 14 compteurs, dans cet ordre :

| # | Compteur | Source | Domaine |
|---|---|---|---|
| 1 | **ENCAISSÉ · MOIS** [6, 17] | `encaisseDuMois().net` par `/api/controle/tresorerie` (026-059), écrit par `euros()` (`lib/direction/fraicheur.ts:64`), exactement comme la barre du Poste (`BarreEtat.tsx:81`, relu). À côté, « ↗ » mène à `/controle?onglet=comptabilite`, la source | `comptabilite` |
| 2 | **DÉPENSÉ · MOIS** [7] | `depenses_mois` de la trésorerie | `comptabilite` |
| 3 | **MARGE · MOIS** | `marge` de la trésorerie | `comptabilite` |
| 4 | **COMMANDES · MOIS** [18] | `ventes_sites` de la trésorerie, plus les packs payés une fois `packPub` levé | `comptabilite` |
| 5 | **SITES EN LIGNE** [19] | `sites_commandes` à l'état `en_ligne` (`app/controle/Sites.tsx:36`), sous-lecture nouvelle de `direct.barre` | `clients` |
| 6 | **AGENTS 12/15 ACTIFS** [20] | Compté par `barre.ts` sur la sortie d'`equipage()` : les points cyan sur les agents reçus. Un seul calcul, repris par « n en ligne » dans le Journal | `sante` |
| 7 | **CHEF DANS 1 h 37** [8] | `pilotage_chef()` : période et dernier battement du Chef | `sante` |
| 8 | **MODÈLE DU CHEF**, par exemple gpt-6-sol [9] | `pilotage_chef()` | `sante` |
| 9 | **CYCLES AUJ. 12** [10] | `pilotage_compteurs_du_jour()` | `sante` |
| 10 | **RÉUNION DANS 16 h 46** [12] | `prochaineReunion` et `station_reunion_lire` | `sante` |
| 11 | **QUOTA CLAUDE 5 H · SEM.** [11] | Aujourd'hui « non mesuré », en gris : aucune source n'est lisible par un script. Le jour où une source existe : rouge au-delà de 75 % | `sante` |
| 12 | **QUOTA CODEX 5 H** [11] | Idem : `scripts/usine.mjs:322` ne lit que `codex login status` | `sante` |
| 13 | **ENVOIS DU JOUR 18/30 · P2** | `envoisBarre` (026-015). Sans boîte : « — · aucune boîte (R1-R3) » | `sante` |
| 14 | **EXPÉRIENCE J6/30 · 0 €** [13] | `etatExperience`, seulement pendant une expérience en cours | `comptabilite` |

#### C. La colonne gauche (300 px)

**L'en-tête** : « ÉQUIPAGE · 12/15 actifs » et la flèche « ◄ » [5]. La flèche replie la colonne en un rail de 44 px, fait des pastilles colorées des agents. Un appui sur une pastille ouvre la fiche de l'agent.

**La carte du Commandant, en tête** [28] :
- le portrait du fondateur qui regarde, son prénom, « Commandant · fondateur » et « à la console » ;
- tant que la page est ouverte, son personnage est dessiné au Commandement. C'est littéralement vrai ;
- les compteurs « 333, 52, 262 » d'androoagi, illisibles, ne sont pas repris.

**Une carte par agent reçu, dans l'ordre de `SALLES`** [25, 27, 30] :
- le point d'état : cyan (actif), jaune (attend une configuration), rouge (panne ou disjoncteur), gris (pause) ;
- le nom, dans la couleur propre de l'agent (réglable) ;
- le rôle ;
- l'activité masquée, avec son ancienneté (« il y a 7 h », `relTime`, `fraicheur.ts:49`) ;
- « 📍 » et la salle où il se trouve (`position.salle`) ;
- la cadence : « cycle dans 1 h 38 », « sur événement », « toutes les 15 min » ;
- son coût du mois (sous `comptabilite` ; sinon « — · hors périmètre ») ;
- **s'il est bloqué, une ligne rouge « ⚠ »** avec le titre de SA carte Attention [26]. C'est le même texte que la carte : `cartesAttention` porte le champ `agent` (026-070 retouchée), un seul calcul ;
- **le bouton ✉** (44 px), qui laisse une consigne à CET agent [29] (026-117 ; route 026-074 avec `agent` ; fonction 026-088 avec `p_agent`).

Sous-titre de la colonne : « Appuie sur un nom pour sa fiche · ✉ pour lui laisser une consigne ». Le survol d'une carte montre, sur la carte de la station, l'étiquette à pointe de l'agent [55].

**ATTENTION**, sous l'équipage, sur la moitié de la colonne au plus [31 à 38] :
- en tête : « ⚡ ATTENTION » et le total ;
- 7 cartes au plus, pleine largeur, dans l'ordre rouge, orange, jaune, bleu (`cartesAttention`, 026-070) ;
- chaque carte a sa couleur, son nombre, son titre et un seul geste :
  - décisions : 2 ou 3 boutons ;
  - appels : « Appel rendu » ;
  - ouvrir : la salle ou l'onglet ;
  - sites ou maquettes à valider : « Relire », qui ouvre l'Usine ou l'Atelier ;
- le mot de passe est demandé si la carte engage de l'argent ou la sécurité ;
- « N autres » quand il y en a plus ;
- sans carte : « Rien pour toi. L'équipage tourne. » ;
- **jamais** de bouton ni de lien « Envoyer », « Copier » ou « Relayer ».

Correspondance avec les cartes des vidéos (trevsagents t020.0, androoagi t020.0, vus) :

| Dans la vidéo | Chez Presti | Couleur |
|---|---|---|
| « Pham blocked: YouTube channel + OAuth not configured » [32] | « Facteur bloqué : jeton Meta expiré » | rouge |
| « 1 Etsy draft → review » [33] | « 1 site à valider → Relire » | orange |
| « Credits Low: $8.12 » [34] | « Crédit bas : 24 € sur 28 € » (`creditBas`) | jaune |
| « 5 tasks blocked → review » [35] | « 5 tâches bloquées », avec les questions de l'orchestre (motif `orchestre`) | jaune |
| « 8 ideas → approve or kill » [36] | « 2 idées de la réunion → approuver ou tuer » | bleu |
| « 34 Matt escalations → your call » [37] | « 3 escalades du Chef → ta décision » | bleu |
| « ACTION NEEDED · Products Awaiting Approval » [38] | « 4 maquettes à valider → Relire » | orange |

#### D. La carte (au centre)

**La vue.**
- Le décor, la coque, les salles et les coursives viennent du thème actif.
- La vue de départ montre toute la station.
- La molette zoome de ×1 à ×3 ; le glissé déplace la vue [99] (trevsagents, planche-05 à 1:24,9). On peut glisser au-delà de la coque, jusque dans la nébuleuse, dans une limite fixe [101].
- Le bouton « ⊞ vue d'ensemble » revient au plan entier [67]. La salle choisie est encadrée de blanc [100] (androoagi t174.0, t176.0, vus).
- En vue d'ensemble, chaque salle a sa teinte propre [104] (t174.0), réglable.

**Les salles.**
- 20 salles à plaque (§3.2). Chacune est cliquable par une zone `[data-salle]` et par la liste accessible [43].
- Une salle peut ne pas être rectangulaire [105], comme le hublot rond de la WAR ROOM (t049.2) : sa zone est un polygone, pris dans `theme.json`, posé en `clip-path`.
- Au survol, la plaque s'allume dans la couleur de survol du thème, et le curseur devient une main [50].

**Les personnages** [52, 53] :
- les sprites du thème, dans la couleur propre de chaque agent, le nom au-dessus de la tête ;
- ils se déplacent par le graphe de coursives, d'ascenseurs et de sas du thème, à une seule vitesse ;
- les positions suivent 026-070 (retouchée) :
  - une tâche l'envoie dans sa salle ;
  - une vraie réunion l'envoie en salle de réunion ;
  - **une pause l'envoie en Salle de repos**, avec « Zz » : une seule marche, au début de la pause, puis il ne bouge plus. À la reprise, il revient à sa salle. (Cela change EQ-3 de 026-070 et CA-6, CA-7 de 026-113, qui gardaient l'agent en pause dans sa salle.)
  - une panne le laisse immobile à son poste, avec une étincelle rouge.

**Autour des personnages :**
- un halo FIXE au sol sous l'agent qui tient une tâche (motif `tache`) [54] ;
- une étiquette à pointe au survol d'un personnage [55] ;
- une bulle au présent reprend le dernier événement (`derniereBulle`), masquée : le métier et la ville, jamais un nom. Elle reste jusqu'à l'événement suivant [56] ;
- aucune bulle d'ambiance et aucun personnage décoratif [57, écartés].

**Les tapis** [58 à 61] :
- le tapis de la prospection traverse les salles : TROUVÉ → VÉRIFIÉ → MAQUETTE → CONTACTÉ → RÉPONDU → OUI → PAYÉ → EN LIGNE ;
- chaque étape a son compteur du jour ;
- la zone REJET affiche le taux de PASS, calculé à un seul endroit (`tapis.rejet`), et repris par l'Atelier ; les bulles ne portent jamais de taux ;
- un carré n'avance que sur un vrai changement d'étape ;
- « +1 CONTACTÉ » flotte 1,5 s au-dessus de l'étape franchie, un par mouvement.

**Les autres lignes :**
- dans l'Usine à sites, une voie par produit [63] :
  - SITES : payée → générée → validée → en ligne (`Sites.tsx:33-36`) ;
  - PACKS PUBS : payé → dossier → fabriqué → livré (`packs_pubs`, migration 0102) ;
- dans la Tour du Crieur, la ligne de contenu [62] : IDÉE → TEXTE → VISUEL → JUGÉ → PROGRAMMÉE → PUBLIÉE, avec « n en cours » par étape et le compteur « PUBLIÉ · MOIS » (← la mémoire du Crieur, migration 0104 ; ses étapes exactes sont [à vérifier] à l'écriture de 026-134).

**Les pièces du décor :**
- **L'antenne** du toit (thème Station) ou **la parabole** du Radar (thème Vaisseau) tourne 2 s à chaque événement réel du Radar ou du Veilleur. Son voyant rouge reste fixe. Le reste du temps, elle est immobile [42]. Elle est dans le calque des acteurs.
- **L'égaliseur du Radar** : 12 barres, une par heure sur les 12 dernières, pour les requêtes à la bibliothèque publicitaire de Meta. Les voyants disent l'état des crons de la salle. Le tout reste figé entre deux lectures [66]. ← `pilotage_radar` (N2).
- **Le badge « LV.n »** d'une salle n'apparaît que là où un palier réel existe [65] :
  - Salle des envois : palier P1 ou P2 ;
  - Usine à sites : 1, 10, puis 50 sites en ligne [seuils supposés] ;
  - Commandement : niveau de l'équipage.
- **L'écran intégré** de la Salle Expérience affiche « J6/30 · 0 € », ou « FERMÉE · R13 » [49].
- **Le hublot de l'Observatoire** montre la France, avec un point par département qui a des prospects [46].

**L'erreur et l'accessibilité :**
- En bas à gauche de la carte, un toast « 2 erreurs · 24 h × » [39] ← `direct.barre.erreurs` : le compte des 24 dernières heures d'`app_errors`, par la même requête que la ronde « erreurs » (`verifierErreurs`, `lib/alertes.ts:169-175`, relu). Le × le masque dans ce navigateur jusqu'à l'erreur suivante.
- **Mouvement réduit** : les personnages changent de salle sans marcher, les carrés sautent, pas de « +1 » (le compteur change seul), l'antenne ne tourne pas.
- **Le miroir accessible** de l'ancienne 026-113 (aujourd'hui K4c) est complété : halo, badges LV, écran de l'Expérience, lignes du Crieur et de l'Usine.
- **Au clavier** : Tab parcourt la liste des salles ; + et − zooment ; ⊞ revient à l'ensemble ; les flèches déplacent la vue [supposé] ; I replie le résumé de salle ; Échap ferme.

#### E. La colonne droite (340 px)

**COMMANDEMENT** (le × le replie en une ligne « LV.2 · 312/1 000 XP ») :
- le portrait en pixel art du Commandant [76], pris dans l'atlas du thème ;
- « LV.2 · Capitaine », avec une barre « 312 / 1 000 XP » [68, 70]. **1 XP = 1 € NET encaissé venu des agents**, et rien d'autre ;
- l'objectif actif, signé « PAR LE CHEF », avec sa barre [69] ;
- un bandeau rouge « OBJECTIF DE MISSION » : le jalon prioritaire, par exemple « 100 contacts froids avant le 05/11 » [72] ;
- MISSIONS ACTIVES : pour chacune, une icône, une barre verte, « 41/100 » et ce qu'elle débloque (« → succès Premier oui ») [71]. **Aucune récompense en XP** (androoagi en donne, « +500 XP », t022.0) : le niveau ne dépend que de l'argent ;
- DERNIER SUCCÈS, par exemple « Premier oui · il y a 4 j » [73] ;
- trois tuiles [74] :
  - OUI · MOIS ;
  - VENTES · MOIS, le même objet que COMMANDES dans la barre ;
  - PUBLIÉ · MOIS, le même objet que la ligne du Crieur ;
- les 3 lignes du dernier compte rendu du Chef.

**JOURNAL DE BORD** (le ▼ le replie jusqu'au champ) [77 à 80] :
- en tête : « n en ligne », le même calcul qu'AGENTS ACTIFS ;
- une bulle par événement, par exemple « CHEF▸ » : pastille ronde dans la couleur de l'agent, heure de Paris, texte en police mono ;
- une réunion forme une seule bulle, avec ses lignes réelles ;
- un filtre par agent ;
- au survol d'une pastille, une info-bulle donne le nom et le rôle ;
- une consigne adressée s'affiche « BENJ ▸ FACTEUR : … » ;
- le champ « ▶ Transmettre à l'équipage… », 200 signes au plus. La consigne est gardée comme une donnée, jamais exécutée telle quelle.

#### F. Le bandeau du bas (44 px)

- **À gauche, la navigation** : Station · Missions · Journal · Succès · Réglages · Aide [83]. (androoagi : TIMELINE, MISSIONS, STATION, SETTINGS, t132.0.)
- **Au centre, les vrais événements d'argent et les « oui »** (`commande_payee`, `pack_paye`, `reponse_oui`) [81]. Exemple : « Site · menuisier, Nantes · 300 € · il y a 2 h ». Chacun entre une fois par la droite, puis tout s'immobilise. **Jamais le nom d'un client** : androoagi affiche « — Megan G. » (t020.0), Presti non.
- **À droite, la pastille « 1 234 € · 3 en ligne »** [82] : les mêmes objets qu'ENCAISSÉ · MOIS et SITES EN LIGNE.

#### G. Les fenêtres par-dessus la carte

Aucune ne recouvre la barre (SA-11).

- **Salle.** Une fenêtre de 760 × 680 px au plus [51, 90, 91] :
  - une bordure néon dans la couleur de la salle, réglable ;
  - le titre et le sous-titre ;
  - « synchro il y a 12 s · auto 30 s » (trevsagents : « auto-refresh 5s », t070.0) ;
  - Fermer, ou Échap ;
  - pendant le chargement : « — » et « chargement », jamais « 0 » ;
  - **en tête, le RÉSUMÉ DE SALLE** [64], sur le modèle du panneau de module d'androoagi (t040.0, vu : INCOME, AGENT, AUTOMATIONS, PRODUCED, Tasks, Active, Press I to toggle) :
    - RECETTES du mois de la salle, par la même fonction que la salle Recettes (sous `comptabilite`) ;
    - AGENTS titulaires ;
    - AUTOMATISMES : les crons de la salle (une table fermée `CRONS_DE_SALLE` dans `lib/pilotage/`, qui range les passages de pg_cron par salle ; `CRONS_ATTENDUS` n'a que 4 crons généraux, `lib/alertes.ts:186-188`) ;
    - PRODUITS DU JOUR : l'étape du tapis qui correspond ;
    - TÂCHES ;
    - ACTIVE AUJ. 2 h 14 [103], calculé sur les événements (N2) ;
    - les boutons GÉRER (qui ouvre la fiche de l'agent) et INFO (l'aide de la salle) ;
    - la touche I replie ce résumé ;
    - **le bouton UPGRADE d'androoagi n'est pas repris** : c'est un achat dans le jeu.
- **Fiche d'agent.** Un panneau latéral de 420 px (§3.4).
- **Missions, Succès, Aide** : §3.5.
- **Réglages de la station** : un panneau de 480 px, avec un aperçu en direct (§5).

### 3.2 Les 20 salles et leurs panneaux

Pour chaque salle : sa clé, sa plaque par défaut, la salle des vidéos qui lui correspond, ce que montre son panneau, la source, le domaine, le rythme et la fiche qui le construit. Le **genre** (travail, argent, décision, veille, repos) reprend la « Room kind » de trevsagents (t086.0) ; il est affiché dans l'Aide.

| Clé · plaque | Vidéo | Le panneau montre | Source | Domaine | Rythme | Fiche |
|---|---|---|---|---|---|---|
| `commandement` · Commandement (décision) | COMMAND (trev), COMMANDER (andro t022.0) | Objectif, missions, succès, compte rendu, consignes reçues par le Chef | `station_objectif_actif`, `commandement()` | `sante` ; niveau et missions en euros : `comptabilite` | 30 s | N8 |
| `reunion` · Salle de réunion (décision) | WAR ROOM, table ronde, hublot rond (t024.0, t049.2) | Prochaine réunion, « Réunion en cours », les 5 lignes du compte rendu, les idées et leur statut | `station_reunion_lire`, `prochaineReunion` | `sante` | 30 s | 026-120 |
| `radar` · Radar (veille) | RESEARCH LAB, RADAR BAY (andro t040.0) | Annonceurs repérés (métier, commune, pubs actives, score, froid ou chaud), requêtes du jour, égaliseur de 12 h, crons de la salle | `pilotage_radar` (N2, sur `ops.annonceurs`, 0105) | `sante` | 5 min | N8 |
| `redaction` · Rédaction (travail) | — | Modèles actifs, variantes et leurs taux, verdicts J1, J3 et du second juge | `pilotage_entonnoir`, 0106 et 0108 | `sante` | 30 s | 026-120 (SA-16) |
| `envois` · Salle des envois (travail) | COMMS BAY | Par boîte : palier, envoyés, rebonds, plaintes, STOP, chauffe, disjoncteur. **Aucun bouton d'envoi** | `envoisDesAgents` | `sante` | 30 s | 026-120 |
| `standard` · Standard (travail) | COMMS BAY | Réponses du jour par classe, fil exact (fondateurs), cas sensibles en lecture seule, rendez-vous pris | `pilotage_reponses_du_jour` | `sante` | 30 s, plus le fil à 5 s | 026-120 (SA-15) |
| `atelier` · Atelier des maquettes (travail) | Onglet BUNC de FACTORY (trev planche-05 à 1:12 et 1:16) ; QA SCAN, REJECT, PASS (andro t020.0) | Onglets ACTIVES · EN ATTENTE DE JUGE · RÉVISIONS ; chaque maquette avec son aperçu (lien signé de courte durée vers le bucket privé, déjà permis par `img-src`, `next.config.mjs:36`, relu), la pastille « RÉVISION DEMANDÉE » et sa raison, sa vidéo ; la zone REJET et le taux de PASS | `pilotage_atelier`, `tapis.rejet` | `sante` | 30 s | 026-120 |
| `usine` · Usine à sites (travail) | FACTORY (trev t070.0, vu) ; FACTORY DECK (andro t020.0, vu) | Tuiles COMMANDES · MOIS, À VALIDER « à relire », EN GÉNÉRATION, EN LIGNE ; onglets LIVREUR · À VALIDER · LIVRÉES · ATELIER ; chaque commande et son étape, avec l'aperçu du site généré [102] ; TÂCHES RÉCENTES DU LIVREUR (numéro, type, pastille FAIT, REJETÉ, ANNULÉ ou BLOQUÉ, « ↳ résultat ») ; sans commande : « Aucune commande. Quand un artisan paie son site, elle apparaît ici pour le Livreur. » | `sites_commandes`, `vue=agent&nom=livreur` | `clients` | 30 s | 026-120 |
| `recettes` · Recettes (argent) | REVENUE BAY (trev t060.0, vu ; t102.0) | Onglets Tout · Sites · Abonnements · Packs · Hors agents ; une tuile par source, le MRR (`lib/direction/stripe.ts:37`) et le nombre de PAIEMENTS (`encaisseDuMois().paiements`, relu) ; CANAUX : Stripe brut, frais et net (`stripe.ts:60-70`, relu), abonnements actifs ; « Hors agents : la base existante » ; un histogramme sur 30 jours en deux teintes | `pilotage_recettes_agents`, `stripe.ts` | `comptabilite` | 30 s | 026-120 |
| `tresorerie` · Trésorerie (argent) | TREASURY (zoom trev-063.0) | Onglets VUE D'ENSEMBLE · DÉPENSES RÉCENTES (n) ; total dépensé ; crédit restant de la clé « agents » et pastille « crédit bas » (`creditBas`) ; par agent : total, puis texte, image, vidéo et voix (le fournisseur de `ops.couts`, rattaché à une nature par une table fermée) ; les abonnements à part (ChatGPT/Codex, Claude Max, Publora, Vercel, domaines) ; marge et seuil de TVA ; sans dépense : « Aucune dépense d'agent ce mois-ci. » | `tresorerie.ts`, `pilotage_couts` | `comptabilite` | 30 s | 026-120 |
| `crieur` · Tour du Crieur (travail) | MEDIA LAB (trev t082.0) ; ligne IDEA → POST, CONTENT SHIPPED (andro t020.0) | Tuiles PUBLIÉ · MOIS, PROGRAMMÉES (x/3 dans Publora), BROUILLONS ; la dernière publication (vignettes, légende exacte, état, date) ; les commentaires « SITE » et les réponses privées parties ; **aucun bouton Télécharger, Copier ou Publier** : le Crieur publie seul si R7 est tranchée par oui, sinon le panneau dit « brouillon dans Publora » | Crieur (0104), jauge Publora (026-064) | `sante` | 5 min | N8 |
| `studio` · Studio pubs (travail) | La partie vidéo du MEDIA LAB | Les packs C (payé → dossier → fabriqué → livré), les vidéos du jour, les verdicts de pub-qa | `packs_pubs` (0102) | `sante` ; montants : `comptabilite` | 1 min | N8 |
| `experience` · Salle Expérience (travail) | MAVERICK (trev t068.0, t084.0) | J x/30, budget, gains, arrêt automatique ; fermée avant la première vente (R13) | `station_experience_etat` | `sante` ; gains : `comptabilite` | 30 s | 026-125 |
| `machines` · Salle des machines (veille) | — | Battements de chaque agent, crons, usine Oracle (charge, mémoire, Codex connecté, par le battement de `usine`), jauges de quota | `pilotage_agents`, crons de `lib/` (N0, depuis `etat/route.ts:34`), `/api/controle/jauges` (026-064) | `sante` | 30 s | 026-120 (SA-17) |
| `chantier` · Chantier du code (travail) | — | La file de l'orchestre, les derniers PASS et FAIL, les verrous, les questions en attente | `pilotage_code_lire` (026-076) | `sante` | 1 min | N8 |
| `audience` · Audience (veille), **nouvelle** [44] | ANALYTICS (trev t068.0, t084.0) | Visiteurs du site par page et par minute, et les campagnes : l'existant, sans cookie ni IP (`app/controle/Visiteurs.tsx`, migrations 0090 à 0092). Instagram agrégé par Windsor, seulement si tu gardes l'outil. **Jamais la liste des abonnés** | lecture d'audience sortie vers `lib/` (N0, depuis `audience/route.ts:37-50`) | `audience` | 1 min | N9 |
| `securite` · Sécurité (veille), **nouvelle** [45] | ARMORY (trev t000.0 ; andro t020.0, LV.1) | Bans, reconfirmations du jour, disjoncteurs ouverts, pause générale et son historique, erreurs des dernières 24 h | lecture des bans sortie vers `lib/` (N0, depuis `securite/bans/route.ts:51-52`), `journal_direction`, disjoncteurs `ops` | `securite` | 30 s | N9 |
| `presti` · Presti, le SaaS (argent), **nouvelle** [48] | WHATAPT, BOFBOT (trev t054.0, t104.0) | Le business hors agents : MRR et abonnements, artisans actifs, **nombre** de tickets de support ouverts (jamais leur contenu), scores des Cerveaux | `stripe.ts:37`, lectures clients et Cerveaux sorties vers `lib/` (N0), compte agrégé du support (N0) | `clients` ; MRR : `comptabilite` ; compte : `support` en lecture | 1 min | N9 |
| `observatoire` · Observatoire (veille), **nouvelle** [46] | SOLAR SYSTEM, une planète (trev t008.0, t049.2, t068.0) | La France au hublot : par département, les prospects trouvés, contactés et qui ont dit oui. Tout est agrégé, jamais un nom | `pilotage_prospects_departements` (N2, colonne `ops.prospects.departement`, 026-060) | `sante` | 5 min | N9 |
| `repos` · Salle de repos (repos), **nouvelle** [47] | CHILL / BAR (trev t084.0, t086.0) | Les agents en pause, depuis quand, et le bouton Reprendre (mot de passe, 026-117) ; sans personne : « Personne en pause : l'équipage travaille. » ; **jamais** de fenêtre « bientôt » (celle de trevsagents dit « coming soon », t086.0) | `pilotage_agents` | `sante` | 30 s | N9 |

**Ce qui a changé depuis la décision.** Le Standard, la Rédaction et la Salle des machines ont déjà leur panneau dans 026-120 depuis la revue du 25/09 (SA-15 à SA-17, relus). Il manque donc des panneaux à dix salles : les cinq de la série qui répondent encore 400 dans le contrat de 026-092 (Commandement, Radar, Tour du Crieur, Studio pubs, Chantier du code), et les cinq nouvelles. N8 et N9 les construisent.

**Les agents titulaires.** Les cinq salles nouvelles n'ont pas de titulaire. Le Garde reste en Rédaction : c'est le juge J3 des messages (rectification l.335), pas un gardien de la sécurité.

### 3.3 L'écran du téléphone (390 × 844, et tout écran de moins de 1024 px)

- **La barre compacte (88 px, deux lignes).**
  - Ligne 1 : « MISSION CONTROL », le point d'état, la cloche et son nombre, AUTO.
  - Ligne 2 : ENCAISSÉ · MOIS, ENVOIS DU JOUR, CHEF DANS.
  - Un appui sur la ligne 2 ouvre la feuille « Tous les compteurs » : les 14, en grille de deux colonnes, rendus comme au bureau. C'est ce qui donne TOUT au téléphone.
- **Les onglets en bas** (64 px, plus la zone sûre) : **Attention** (ouvert par défaut, avec le total de la file en badge), Journal, Station, Missions, Plus (Succès, Réglages, Aide, retour au Poste).
- **Attention.** Des cartes pleine largeur. Un appui ouvre la feuille du geste (026-117), avec le mot de passe s'il y a un enjeu.
- **Journal.** Le fil, le filtre par sélecteur natif, et « ▶ Transmettre à l'équipage… » collé en bas. Le champ remonte avec le clavier (`visualViewport`).
- **Station.**
  - La carte fait 358 px de large (16 px de marge de chaque côté) et s'ouvre en vue d'ensemble, fractionnaire et lissée.
  - On zoome au pincement dans le cadre de la carte seulement, ou par les boutons +, − et ⊞ de 44 px. Le zoom avance par facteurs entiers en pixels de l'appareil.
  - **Les plaques n'apparaissent qu'à partir du zoom ×2.** En vue d'ensemble, la liste des 20 salles, en boutons de 44 px sous la carte, suffit.
  - `touch-action: none` sur le cadre ; sous Safari, `gesturestart` est bloqué dans le cadre, sinon Safari zoome toute la page [déduit].
  - Jamais de défilement horizontal de la page (`scrollWidth ≤ 390`).
  - Sous la liste des salles, l'équipage en liste.
- **Un panneau de salle ou une fiche d'agent** s'ouvre en feuille plein écran (SA-11).
- **Missions** : le Commandement en grand.
- **Les deux moteurs de navigateur sont jugés.** Chromium (cadence, processeur ralenti ×4) et WebKit (pincement, `scrollWidth ≤ 390`, ouverture des feuilles, cadence mesurée sans ralentissement). La série a déjà eu un défaut propre à WebKit (025-14 FS-3, journal du 25/09 à 09 h 09).
- **Corrigé le 25/09 (§0.9, K5).** Playwright ne sait pas pincer : au toucher, il n'offre que `tap(x, y)`. Le juge WebKit vérifie `scrollWidth`, les feuilles, et des `TouchEvent` synthétiques envoyés au cadre. Le pincement et le blocage du zoom de page ne se prouvent que sur ton téléphone.

### 3.4 La fiche d'un agent (panneau latéral de 420 px)

Elle reprend 026-120 (écran 3) et y ajoute ce qui manquait.
- Nom (réglable), nom technique en petit, rôle, état en pastille, avatar (réglable), couleur propre.
- « 📍 » et la salle où il est ; cadence ; dernier battement ; prochain passage.
- **Les tâches récentes**, sur le modèle de trevsagents (t070.0, vu) : numéro, type, pastille FAIT, REJETÉ, ANNULÉ, BLOQUÉ ou EN COURS, et « ↳ résultat ».
- Son coût, du mois et par tâche (sous `comptabilite`).
- Les consignes reçues, **y compris celles qui lui sont adressées** par ✉.
- Pour le Facteur : une ligne par boîte. Pour le Répondeur : les dernières réponses, en texte exact.
- Les boutons ✉ (consigne à cet agent) et Pause ou Reprendre (mot de passe `securite`). Aucun bouton pour le rôle lecture.
- Pour le rôle direction : un lien « Personnaliser » vers Réglages › Équipage, sur cet agent.

### 3.5 Les vues Missions, Succès et Aide

- **Missions** (`?vue=missions`) : le Commandement en grand ; chaque mission avec sa barre, sa valeur, sa cible et ce qu'elle débloque.
- **Succès** (`?vue=succes`) [75] : tous les succès, chacun avec sa barre et sa date. Débloqués : premier oui, première vente, premier site en ligne, jalon passé (026-070). Les succès à venir sont grisés, jamais cachés.
- **Aide** (`?vue=aide`) :
  - la légende des points, des cartes, des compteurs et des genres de salle ;
  - les raccourcis (I, Échap, + et −, ⊞, flèches) ;
  - pour chaque compteur, « d'où vient ce chiffre » : la source et la fonction, en une ligne. C'est la même table que celle du §3.1 B.

---

## 4. L'inventaire coché : tous les éléments des vidéos

**Comment le lire.**
- **[x]** : repris ou adapté. La ligne dit l'équivalent chez Presti, la section de la spécification et la fiche.
- **[ ]** : écarté. La ligne dit pourquoi.
- **D'où viennent les numéros.** L'inventaire du 25/09 m'est parvenu coupé après le n° 51. Les n° 52 à 100 sont reconstitués d'après les renvois de la décision, et revus sur les images (androoagi t020.0, t022.0, t040.0, t174.0 ; trevsagents t060.0, t070.0 : vues le 25/09). Les n° 101 à 105 sont les cinq manques relevés par l'attaque.

**Total : 105 éléments, 103 repris ou adaptés, 2 écartés.** Cinq éléments repris le sont avec une partie écartée (n° 28, 47, 64, 71 et 81) ; elle est dite sur leur ligne.

### 4.1 Le socle et le cadre

- [x] **[1] La règle de vérité** : chaque mouvement, bulle ou compteur vient d'un événement réel. trevsagents rejette lui-même une réunion « UI-only » (t070.0) ; androoagi, lui, fait sauter ses compteurs (t040.0 à t076.0) → règle §3.0.2 · 026-070, 026-104, K0, K3.
- [x] **[2] Titre et version** « TONKAS · MISSION CONTROL v5 » (trev t014.0, t086.0) → « PRESTI · MISSION CONTROL » et le commit déployé, par `direct.barre.version` · §3.1 A · 026-111, 026-092.
- [x] **[3] En-tête** : nom, lieu ouvert « FACTORY II », pastille « STATION ONLINE » (andro t000.0) → pastille d'état et fil d'Ariane · §3.1 A · 026-111, 026-092, N0.
- [x] **[4] Disposition** : équipage et Attention à gauche, carte au centre, Commandement et journal à droite, bandeau en bas (trev t114.0, t060.0 ; andro t000.0, t166.0) → deux mises en page par thème · §3.1 · 026-111.
- [x] **[5] Panneaux repliables** : ◄, ▼, × (andro t000.0, t022.0, t040.0) → colonnes repliables, gardées dans le navigateur · §3.1 · 026-111, 026-123.

### 4.2 La barre

- [x] **[6] TOTAL REVENUE** (trev zoom 049.2) → ENCAISSÉ · MOIS, le net · §3.1 B · 026-059, 026-111.
- [x] **[7] TOTAL SPENT** → DÉPENSÉ · MOIS · §3.1 B · 026-059, 026-111.
- [x] **[8] MATT NEXT 1h 37m** (le chiffre descend vraiment, t004.0 → t068.0) → CHEF DANS · §3.1 B · 026-070, 026-092.
- [x] **[9] MATT MODEL** → MODÈLE DU CHEF · §3.1 B · 026-070.
- [x] **[10] MATT CYCLES 12 today** → CYCLES AUJ. · §3.1 B · 026-070.
- [x] **[11] CODEX 5H 1 %** → QUOTA CODEX et QUOTA CLAUDE, « non mesuré » tant qu'aucune source n'existe · §3.1 B · 026-070.
- [x] **[12] MEETING 16h 46m** → RÉUNION DANS · §3.1 B · 026-070, 026-088.
- [x] **[13] MAVERICK D6/30 · $0** → EXPÉRIENCE, seulement pendant une expérience · §3.1 B · 026-070, 026-125.
- [x] **[14] Style des compteurs** : petites capitales, valeur mono colorée par genre → six genres de couleur · §3.1 B · 026-111.
- [x] **[15] Horloge « Day 2 — 01:02 » et lune** (andro t000.0) → « JOUR n · HH:MM », lune ou soleil, décor de nuit · §3.1 A · 026-070, 026-111, 026-140, N5, N6.
- [ ] **[16] Boutons de vitesse ⏸ 1x 2x 5x 10x** (andro t000.0, t166.0) → **écarté** : la règle de vérité interdit d'accélérer le temps.
- [x] **[17] REVENUE $1,836.72, le même chiffre que la page Etsy** (andro t000.0, t026.0) → « ↗ » vers la Comptabilité, la source · §3.1 B · 026-111.
- [x] **[18] ORDERS: 5** → COMMANDES · MOIS · §3.1 B · 026-111, 026-092.
- [x] **[19] PRODUCTS: 10 LIVE** → SITES EN LIGNE · §3.1 B · 026-111, 026-092.
- [x] **[20] AGENTS: 4/6 ACTIVE** (andro t166.0) → AGENTS n/N ACTIFS, un seul calcul · §3.1 B · 026-070, 026-111.
- [x] **[21] Cloche « 50 »** (andro zoom 022.0) → le total de la file Attention · §3.1 A · 026-111.
- [x] **[22] Interrupteur AUTO** → pause générale sous mot de passe · §3.1 A · 026-117.
- [x] **[23] Deux boutons-icônes** entre la cloche et AUTO (un fanion, une icône bleue) → ⚑ Missions et l'état des notifications · §3.1 A · 026-111, N11.
- [x] **[24] SHIP TIME 13:38:40 EST** → heure de Paris, à la minute · §3.1 A · 026-111.

### 4.3 L'équipage

- [x] **[25] Colonne CREW** : point d'état, nom, rôle, état, cadence (trev t014.0, t020.0) → une carte par agent · §3.1 C · 026-111.
- [x] **[26] « awaiting_setup » et ligne rouge ⚠** (trev t020.0, t022.7) → ligne ⚠ = titre de la carte Attention de l'agent · §3.1 C · 026-070, 026-111.
- [x] **[27] SHIP CREW d'androoagi** : couleur propre, activité et ancienneté, punaise de la salle, sous-titre (andro t000.0) → couleur réglable, « il y a 7 h », « 📍 salle », sous-titre · §3.1 C · 026-111, N7.
- [x] **[28] Le fondateur dans l'équipage** (Andrew, « Commander / Founder », andro t000.0, t166.0) → carte du Commandant et son personnage au Commandement ; **les compteurs « 333, 52, 262 », illisibles, ne sont pas repris** · §3.1 C · 026-111, K3.
- [x] **[29] Message privé à UN agent** (icône bulle, andro t000.0) → ✉ : une consigne adressée à cet agent · §3.1 C · 026-074, 026-088, 026-117, 026-123.
- [x] **[30] Clic sur le nom → profil** → fiche d'agent · §3.4 · 026-120.

### 4.4 Attention

- [x] **[31] Un seul bloc ⚡ ATTENTION**, couleur = gravité (trev t020.0, t078.0) → 7 cartes au plus, rouge, orange, jaune, bleu · §3.1 C · 026-070, 026-111, 026-117.
- [x] **[32] « Pham blocked »** → carte rouge de blocage · §3.1 C.
- [x] **[33] « 1 Etsy draft → review »** → « 1 site à valider → Relire » · §3.1 C.
- [x] **[34] « Credits Low: $8.12 »** → « Crédit bas », `creditBas` · §3.1 C.
- [x] **[35] « 5 tasks blocked »** → tâches bloquées et questions de l'orchestre · §3.1 C.
- [x] **[36] « 8 ideas → approve or kill »** → idées de la réunion · §3.1 C · 026-088.
- [x] **[37] « 34 Matt escalations »** → escalades du Chef · §3.1 C.
- [x] **[38] « ACTION NEEDED · Products Awaiting Approval »** (andro t020.0, t166.0) → maquettes ou sites à valider, « Relire » · §3.1 C · 026-117.
- [x] **[39] Notification « 1 error × »** (andro t000.0) → toast « n erreurs · 24 h » · §3.1 D · 026-111, 026-092.

### 4.5 La carte

- [x] **[40] Décor station** : coupe octogonale, néons magenta, nébuleuse rose (trev t049.2, t084.0, t102.0) → thème « Station » · §5.2 · F0, N5.
- [x] **[41] Décor vaisseau** : modules vus de dessus, sols en hexagones, sas (andro t000.0, t010.0, t158.0) → thème « Vaisseau » · §5.2 · F0, N6.
- [x] **[42] Antenne parabolique et voyant rouge** (trev t000.0, t030.0, t114.0) → tourne 2 s par événement réel du Radar ou du Veilleur · §3.1 D · K3, N5, N6.
- [x] **[43] Plaques de salles cliquables** (trev t000.0, t049.2, t068.0) → 20 salles, plaques réglables, liste accessible · §3.2 · 026-070, K4a, K4c, N7.
- [x] **[44] Salle ANALYTICS** → Audience · §3.2 · N0, N9, N10.
- [x] **[45] Salle ARMORY** (trev ; andro LV.1) → Sécurité · §3.2 · N0, N9, N10.
- [x] **[46] Salle SOLAR SYSTEM** (une planète) → Observatoire : la France et ses départements, des données réelles au lieu d'un décor · §3.2 · N2, N9.
- [x] **[47] Salle CHILL / BAR**, « Room kind: game … coming soon » (trev t084.0, t086.0) → Salle de repos, où vont les agents en pause, et le genre de salle ; **la fenêtre « bientôt » n'est pas reprise** · §3.2 · 026-070, N9.
- [x] **[48] Salle d'un produit existant** (WHATAPT, BOFBOT, trev t054.0, t104.0) → Presti, le SaaS · §3.2 · N0, N9.
- [x] **[49] Écran intégré « DAY 6/30 · $0 »** de MAVERICK (trev t084.0) → écran de la Salle Expérience · §3.1 D · K4b, 026-125.
- [x] **[50] Survol : plaque allumée, curseur en main** (trev t102.0, t084.0) → §3.1 D · K4a.
- [x] **[51] Clic : fenêtre à bordure néon de la couleur de la salle** (trev t054.0 à t070.0) → couleur réglable · §3.1 G · 026-120, N7.
- [x] **[52] Personnages en pixel art, nom au-dessus de la tête** (trev t024.0, t049.2) → sprites du thème, couleur propre · §3.1 D · N5, N6, K3.
- [x] **[53] Déplacements par coursives et ascenseurs** → graphe du thème, une seule vitesse · §3.1 D · N5, N6, K3.
- [x] **[54] Halo au sol sous l'agent au travail** (andro t040.0) → halo fixe · §3.1 D · K3.
- [x] **[55] Étiquette à pointe au survol** (andro t020.0, « Nova ») → §3.1 C-D · K4a, 026-111.
- [x] **[56] Bulle au présent** (« Quality check passed », andro t040.0) → dernier événement, masqué · §3.1 D · 026-070, K3, K4c.
- [ ] **[57] Bulles d'ambiance et personnages décoratifs** → **écartés** : ils bougeraient ou parleraient sans événement réel.
- [x] **[58] Tapis roulants qui traversent les salles** (andro t020.0) → TROUVÉ → EN LIGNE · §3.1 D · 026-070, K4b.
- [x] **[59] Compteurs d'étape** (SENT, SHIPPED, OUTPUT) → compteur du jour par étape · §3.1 D.
- [x] **[60] Zone REJECT et « PASS 98 % »** → REJET et taux de PASS, un seul calcul · §3.1 D · 026-070.
- [x] **[61] « +1 SHIPPED »** (andro t020.0) → « +1 CONTACTÉ », 1,5 s, un par mouvement · §3.1 D · K4b.
- [x] **[62] Ligne de contenu IDEA → SCRIPT → FILM → EDIT → POST, CONTENT SHIPPED** (andro t020.0) → ligne du Crieur · §3.1 D · 026-070, K4b, 026-164.
- [x] **[63] Voies par produit dans l'usine** (FACTORY DECK : PRESS, FORGE, QA SCAN, PACKAGE) → SITES et PACKS PUBS · §3.1 D · 026-070, K4b.
- [x] **[64] Panneau de module « Factory II »** : INCOME, AGENT, AUTOMATIONS, PRODUCED, Tasks, MANAGE, INFO, « Press I to toggle » (andro t040.0, vu) → résumé de salle ; **le bouton UPGRADE n'est pas repris** (achat dans le jeu) · §3.1 G · 026-120.
- [x] **[65] Badges « LV.1 » des modules** (andro t040.0, t020.0) → seulement là où un palier réel existe · §3.1 D · 026-070, K4b.
- [x] **[66] Égaliseur et voyants du radar** (andro t040.0, en haut à droite) → requêtes Meta par heure sur 12 h, crons de la salle · §3.1 D · N2, K4b.
- [x] **[67] Vue d'ensemble du plan** (andro t174.0, t176.0) → bouton ⊞ · §3.1 D · K4a.

### 4.6 La colonne droite

- [x] **[68] COMMANDER LV.4** (andro t022.0, vu) → niveau de l'équipage · §3.1 E · 026-070, 026-111.
- [x] **[69] Objectif actif « BY MATT »** (trev zoom 060.0) → « PAR LE CHEF » · §3.1 E · 026-111.
- [x] **[70] Barre d'XP 5 050 / 8 000** → XP = € net venus des agents · §3.1 E · 026-070, 026-111.
- [x] **[71] ACTIVE MISSIONS**, barres vertes (andro t022.0) → missions chiffrées ; **les récompenses « +500 XP » ne sont pas reprises** · §3.1 E · 026-070, 026-111.
- [x] **[72] Bandeau rouge « MISSION OBJECTIVE »** → jalon prioritaire · §3.1 E · 026-111.
- [x] **[73] LATEST ACHIEVEMENT « Grand Opening · Unlocked 4d ago »** → DERNIER SUCCÈS · §3.1 E · 026-111.
- [x] **[74] Trois tuiles « 33 Sales, 10 Products, 12 … »** → OUI, VENTES, PUBLIÉ · §3.1 E · 026-111.
- [x] **[75] La liste des succès** → vue Succès · §3.5 · N11.
- [x] **[76] Portrait du Commandant** (andro t022.0, en bas) → portrait pris dans l'atlas du thème · §3.1 E · 026-111, N5, N6.
- [x] **[77] SHIP COMMS · 9 online** (andro t040.0 ; trev t072.0, t132.0) → Journal de bord et « n en ligne » · §3.1 E · 026-123.
- [x] **[78] Filtre par agent** → §3.1 E · 026-123.
- [x] **[79] Pastille ronde de l'agent et son info-bulle** → §3.1 E · 026-123.
- [x] **[80] « ▶ Transmit to crew… »** (trev zoom 060.0) → « ▶ Transmettre à l'équipage… » · §3.1 E · 026-123.

### 4.7 Le bandeau

- [x] **[81] Bandeau des ventes** (andro t020.0) → vrais événements d'argent et « oui », qui entrent une fois ; **les noms des clients ne sont pas repris** · §3.1 F · 026-111.
- [x] **[82] Pastille « $1836.72 · 10 Live »** → « € · n en ligne » · §3.1 F · 026-111.
- [x] **[83] Navigation TIMELINE, MISSIONS, STATION, SETTINGS** (andro t132.0) → six entrées · §3.1 F · 026-111, N11.

### 4.8 Les fenêtres des salles

- [x] **[84] REVENUE BAY : onglets** → Tout · Sites · Abonnements · Packs · Hors agents · §3.2 · 026-120.
- [x] **[85] Une tuile par source** (ETSY, MANUAL, t060.0) → Sites, abonnements, packs · §3.2 · 026-120.
- [x] **[86] Revenus récurrents** → MRR et PAIEMENTS · §3.2 · 026-120.
- [x] **[87] Canaux** → Stripe brut, frais, net · §3.2 · 026-120.
- [x] **[88] « Stripe products, not driven by agents »** (t060.0, vu) → « Hors agents : la base existante » · §3.2 · 026-120.
- [x] **[89] Histogramme sur 30 jours** (t060.0, vu) → deux teintes, agents et hors agents · §3.2 · 026-120.
- [x] **[90] « auto-refresh 5s »** (t070.0, vu) → « synchro il y a n s · auto 30 s » · §3.1 G · 026-120.
- [x] **[91] État de chargement et état vide** (« NO ORDERS YET », t070.0) → « — » et « chargement », puis la phrase de vide · §3.1 G · 026-120.
- [x] **[92] TREASURY : onglets** → VUE D'ENSEMBLE · DÉPENSES RÉCENTES · §3.2 · 026-120.
- [x] **[93] Total dépensé et crédit restant** (zoom trev-063.0) → crédit de la clé « agents », `creditBas` · §3.2 · 026-120.
- [x] **[94] Dépense par agent, par nature, abonnements à part** → texte, image, vidéo, voix ; abonnements · §3.2 · 026-120.
- [x] **[95] FACTORY : tuiles ORDERS TOTAL, AWAITING APPROVAL, FINN PENDING** (t070.0, vu) → COMMANDES, À VALIDER, EN GÉNÉRATION, EN LIGNE · §3.2 · 026-120.
- [x] **[96] FACTORY : onglets FINN · APPROVALS · DELIVERED · BUNC** → LIVREUR · À VALIDER · LIVRÉES · ATELIER · §3.2 · 026-120.
- [x] **[97] RECENT FINN TASKS** (« #15 meeting REJECTED ↳ replaced with UI-only meeting », t070.0) → tâches récentes du Livreur · §3.2 · 026-120.
- [x] **[98] MEDIA LAB** (t082.0) → Tour du Crieur, sans bouton de publication · §3.2 · N8.

### 4.9 La navigation dans la carte

- [x] **[99] Zoom à la molette et glissé** (trev planche-05 à 1:24,9) → ×1 à ×3, pincement au téléphone · §3.1 D, §3.3 · K4a, K5.
- [x] **[100] La salle choisie encadrée de blanc** (andro t174.0, vu) → §3.1 D · K4a.

### 4.10 Les cinq manques relevés par l'attaque

- [x] **[101] Curseur en croix sur le vide, sortie vers la nébuleuse** (trev t052.9, t068.8, t084.9) → croix et glissé borné dans la nébuleuse · §3.0.3, §3.1 D · K4a, N5.
- [x] **[102] Vignette du produit fabriqué dans FACTORY** (trev planche-05 à 1:12,0 et 1:16,0) → aperçu du site généré par lien signé, dans l'Usine · §3.2 · 026-092, 026-120.
- [x] **[103] « Active: 2h 14m »** (andro t040.0, vu) → ACTIVE AUJ., calculé sur les événements · §3.1 G · N2, 026-120.
- [x] **[104] Une teinte propre à chaque module en vue d'ensemble** (andro t174.0, vu) → teinte réglable par salle · §3.1 D · N5, N6, N7.
- [x] **[105] Pièces non rectangulaires** (hublot rond de la WAR ROOM, trev t049.2) → zones en polygone · §3.1 D · N5, K2, K4a.

---

## 5. La personnalisation

### 5.1 Le principe

- **Ce qui se règle, c'est l'habit, jamais les chiffres.** Thème, noms, avatars, couleurs, plaques, place des salles. Pas les sources, pas l'ordre d'Attention, pas les seuils, pas la vitesse.
- **Les réglages sont partagés.** La station est celle de l'entreprise : un seul jeu de réglages, pour les fondateurs. Le rôle direction les écrit, le rôle lecture les voit sans pouvoir les changer.
- **Ils sont rangés en base**, versionnés, journalisés, et on peut revenir en arrière (§5.5).
- **Rien n'est téléversé.** Les avatars se choisissent dans l'atlas du thème ; il n'y a ni image envoyée, ni CSS libre.

### 5.2 Les deux thèmes

| | **Station** (livré d'abord) | **Vaisseau** (livré après ton oui sur la planche) |
|---|---|---|
| Modèle | trevsagents : une coupe latérale octogonale sur une nébuleuse (t049.2, t114.0 ; planche-06 à 1:42) | androoagi : des modules vus de dessus, sols en hexagones, tapis et machines (t040.0, t020.0 ; planche-07 à 2:54 et 2:56) |
| Mise en page par défaut | colonnes | flottante |
| Palette par défaut | Tirée des images de référence. Échantillons approximatifs sur photo d'écran : néon ~#C949BA, intérieurs ~#CF9782, fond ~#750C9C (t049.2) [mesuré sur photo, approximatif] | À tirer de t040.0 et t174.0 par N6 : espace bleu-violet, néons cyan, modules à teinte propre |
| Salles | 20 emplacements, dont le hublot rond de la salle de réunion | 20 modules, et un sas entre chacun |
| Décor propre | Antenne du toit | Parabole du Radar, égaliseur |

**Ce que contient un thème** (dans `public/station/themes/<clé>/`) :
- **`theme.json`** :
  - `cle`, `nom`, `version` ;
  - `grille` : largeur et hauteur en pixels logiques ;
  - `mise_en_page` : `colonnes` ou `flottante` ;
  - `palette` : les couleurs par défaut des jetons (§5.4) ;
  - `emplacements` : au moins 20, chacun avec sa forme (rectangle ou polygone), sa porte, son poste de travail, la place de sa plaque et sa teinte ;
  - `coursives` : le graphe des nœuds et des arêtes (coursives, ascenseurs, sas), déjà calculé ;
  - `tapis` : le tracé et la place de chaque étape ;
  - `defauts` : quelle salle dans quel emplacement ;
  - `avatars` : la liste fermée des avatars proposés ;
  - `nuit` : s'il existe une variante de nuit ;
- **l'atlas** : une planche composite (décor, meubles, personnages en marche et au poste, portraits, étincelles, « Zz ») ;
- **le fond** : la nébuleuse peinte, lisse, 200 Ko au plus ;
- **`licence.json`** : l'auteur, la source (pack, génération, artiste), la licence, les actifs tiers, la date, et la preuve que la licence permet un usage web dans un produit commercial [à vérifier pour un pack].

### 5.3 Ce qui se règle

| Onglet | Réglage | Valeurs permises | Par défaut |
|---|---|---|---|
| Thème | Thème actif | Station, Vaisseau (quand il est livré) | Station |
| Thème | Mise en page | colonnes, flottante | celle du thème |
| Thème | Nuit | active ou non ; heures de début et de fin | 20 h à 7 h [supposé] |
| Équipage | Nom affiché de chaque agent | 2 à 16 signes : lettres, chiffres, espace, tiret, apostrophe. Le nom technique ne change jamais | le libellé d'`EQUIPAGE` |
| Équipage | Avatar | un avatar de la liste du thème | celui du thème |
| Équipage | Couleur propre | une couleur de la palette du thème, ou un hexadécimal validé | celle du thème |
| Salles | Plaque | 2 à 24 signes | la plaque de `SALLES` |
| Salles | Teinte et couleur du néon | idem couleur | celle du thème |
| Salles | Emplacement | un emplacement libre du thème ; ou échanger deux salles | `defauts` du thème |
| Couleurs | Jetons du thème (§5.4) | hexadécimal validé ; contraste d'au moins 4,5:1 pour les jetons de texte [supposé] | la palette du thème |
| Affichage | Titre de la station | 2 à 32 signes | « PRESTI · MISSION CONTROL » |
| Affichage | Taille des plaques | normale, grande | normale |
| Notifications | État de Web Push sur cet appareil (026-051) | lecture seule, et le lien vers la procédure | — |

**L'éditeur d'emplacements (pas de disposition libre).**
- Chaque thème fournit un nombre fixe d'emplacements, avec un graphe de coursives déjà calculé.
- L'éditeur ne fait que placer une salle dans un emplacement (ou échanger deux salles), la renommer, la recolorer, et choisir les avatars.
- **Une seule fonction pure**, `validerDisposition`, au serveur comme à l'écran, vérifie que :
  - chaque salle a un emplacement, et un seul ;
  - le graphe reste connexe (toute salle est joignable depuis le Commandement) ;
  - le tapis de la prospection reste continu.
- Refusée, la disposition n'est pas enregistrée, et l'écran dit pourquoi (« La Salle de repos n'est plus reliée au reste »).

**Le panneau Réglages** (`?vue=reglages`, 480 px au bureau, feuille plein écran au téléphone) :
- **Aperçu en direct.** Chaque changement s'applique tout de suite à l'écran, sans être enregistré.
- **Enregistrer** écrit une nouvelle version. **Annuler** revient à la version enregistrée.
- **Revenir au thème par défaut**, et **Historique** : les 10 dernières versions, chacune avec son auteur et sa date ; « Rétablir » en fait une version nouvelle.
- Absent pour le rôle lecture (ST-15).

**Ce qui ne se règle jamais :**
- les sources et les calculs des chiffres ;
- l'ordre et les couleurs d'Attention ;
- les seuils (crédit bas, niveaux, quotas) ;
- la vitesse de marche, et aucune accélération ;
- la liste des salles : on renomme, on déplace, on recolore, on ne cache pas. La station contient tout.

**Ce qui reste dans le navigateur** (commodités, `localStorage` sous try/catch) : les colonnes repliées, le toast d'erreurs masqué, le dernier filtre du Journal.

### 5.4 Les couleurs et le fichier de la station

- **R8 est étendue** : non plus « le bleu et le violet », mais **toute couleur de thème**, sous `.mc`. Le corail reste partout ailleurs (`app/base.css:25`).
- **ST-11 de 026-111 est réécrit** :
  - les valeurs par défaut des jetons `--mc-*` restent déclarées dans le seul `station.css` ;
  - les surcharges (palette du thème actif, puis réglages) sont posées sur le seul nœud `.mc`, par une seule fonction, `appliquerReglages()` ;
  - aucune couleur de thème n'apparaît hors de `app/controle/station/` et de `public/station/` ;
  - sur `/controle?onglet=aujourdhui`, `--accent` vaut toujours le corail #D97757.
- **Les jetons** : `--mc-fond`, `--mc-neon-1`, `--mc-neon-2`, `--mc-actif`, `--mc-ok`, `--mc-warn`, `--mc-crit`, `--mc-argent`, `--mc-survol`, `--mc-texte`, `--mc-texte-doux`.

### 5.5 Où c'est rangé

- **Table `ops.station_reglages`** (migration 0113, fiche N2) : une seule ligne, avec `version`, `reglages` (JSON), `modifie_par` et `modifie_le`.
- **Table `ops.station_reglages_historique`** : chaque version, avec son auteur et sa date ; les 50 dernières sont gardées [supposé].
- **Fonctions** `station_reglages_lire()` et `station_reglages_ecrire(p_reglages, p_auteur, p_version)`, `SECURITY DEFINER`, réservées à `service_role`. Une version périmée rend 409 (« modifié ailleurs : recharge »).
- **La route** `GET /api/controle/station/reglages` (lecture, `sante`) et `PUT` (écriture, `estDirection`, domaine `reglages`, verbe `ecrire`), fiche N4. **Corrigé le 25/09 (§0.5)** : les deux commencent par `actif('pilotage')` → 404, et le fichier entre dans la ligne `pilotage` de `fermeture-e2e.mjs`.
- **Le journal.** Chaque écriture est journalisée dans `journal_direction` avant d'agir, puis avec son résultat (action `station_reglages`, versions avant et après).

---

## 6. Les données

### 6.1 Les principes

- **Une route, des enveloppes.** `GET /api/controle/station?vue=…` (026-092) rend des sous-parties indépendantes `{ valeur, source, a, erreur?, manque? }`. Une source en panne se voit ; les autres zones s'affichent.
- **La même fonction que le Poste.** Un chiffre qui existe déjà dans le Poste est calculé par la fonction du Poste, jamais recopié.
- **Aucune lecture directe de l'écran.** Pas de `fetch`, `.from(`, `.rpc(` dans `app/controle/station/` (ST-1) : tout passe par `apiDirection(`.
- **La station se construit d'abord sur les jeux d'essai du juge** (§2.6).

### 6.2 D'où vient chaque zone

| Zone | Vue | Source | Domaine | Rythme | Existe aujourd'hui ? |
|---|---|---|---|---|---|
| Compteurs d'argent | `/api/controle/tresorerie` | `lib/direction/stripe.ts`, `tresorerie.ts` (026-055, 026-059) | `comptabilite` | 30 s | `encaisseDuMois` oui ; `tresorerie.ts` et la route non |
| Autres compteurs, version, santé, erreurs | `direct.barre` | `pilotage_chef`, `pilotage_compteurs_du_jour`, `station_reunion_lire`, `station_experience_etat`, `pauseGenerale`, fonction de santé (N0), `app_errors` | `sante` ; SITES EN LIGNE : `clients` | 30 s | non (bus absent) |
| Équipage | `direct.equipage` | `pilotage_agents` → `equipage`, `positions` | `sante` ; coût : `comptabilite` | 30 s | non |
| Attention | `direct.attention` | alertes, `pilotage_attention_sources`, `pilotage_appels`, commandes `generee` | `sante` | 30 s | alertes oui ; le reste non |
| Commandement | `direct.commandement` | `station_objectif_actif`, `pilotage_jalon_date`, `pilotage_recettes_agents` | `sante` ; niveau et euros : `comptabilite` | 30 s | non |
| Tapis et lignes | `direct.tapis` | `pilotage_tapis`, Crieur (0104), `sites_commandes`, `packs_pubs` | `sante` | 30 s | `sites_commandes` oui ; le reste non |
| Bandeau | `direct.bandeau` | `pilotage_evenements(TYPES_BANDEAU)` | `comptabilite` | 30 s | non |
| Journal et bulles | `vue=fil` | `pilotage_evenements(apres)` ; les bulles d'argent seulement avec `comptabilite` | `sante` | 5 s | non |
| Panneaux | `vue=salle&salle=<clé>` | §3.2 | selon la salle | à l'ouverture, puis 3 par minute au plus | 0 sur 20 |
| Fiche d'agent | `vue=agent&nom=<nom>` | `pilotage_agent_taches`, coûts, consignes | `sante` ; coûts : `comptabilite` | idem | non |
| Réglages | `/api/controle/station/reglages` | `station_reglages_lire` | `sante` ; écriture : `reglages` | au chargement | non |

### 6.3 Les lectures à créer

**Migration 0113 (fiche N2)**, prochain numéro libre au 25/09 [à vérifier à l'assemblage] :
- les deux tables des réglages et leurs fonctions (§5.5) ;
- `pilotage_radar()` : les annonceurs repérés du jour, et les requêtes à la bibliothèque de Meta par heure sur 12 h (l'égaliseur) ;
- `pilotage_prospects_departements()` : par département, trouvés, contactés, oui ; agrégé, jamais un nom ;
- `pilotage_activite_salles(<minuit à Paris>)` : le temps actif du jour par salle (ACTIVE AUJ.), calculé sur les événements.

**Fiche 026-088 retouchée** : `station_consigne_transmettre(p_texte, p_auteur, p_agent default null)`. L'événement `consigne` porte `agent_cible`. Le quota de 20 consignes par jour reste le même.

**Extraction du Poste vers `lib/` (fiche N0)**, sorties inchangées, les `controle-*-e2e` existants restant verts :
- la santé du service, aujourd'hui calculée dans `barre/route.ts` ;
- les crons, dans `etat/route.ts:34` (il n'existe pas de route `/api/controle/crons` qui les liste : seule `crons/[nom]/relancer` existe, relu) ;
- l'audience, dans `audience/route.ts:37-50` ;
- les bans, dans `securite/bans/route.ts:51-52` ;
- les clients, dans `clients/route.ts` ;
- les Cerveaux, dans `cerveaux/route.ts` ;
- **un compte agrégé des tickets de support ouverts, nouveau.** `/api/controle/support` ne convient pas : il exige `?artisan=<uuid>` et le drapeau `supportArtisan`, et donne l'état du support d'un seul artisan (`support/route.ts:21-31`, relu). Le compte ne lit jamais le contenu d'un ticket.

**Deux points laissés ouverts :**
- **Instagram agrégé par Windsor** : il faudrait une clé d'API Windsor côté serveur [à vérifier]. Seulement si tu gardes l'outil (§9).
- **Le contour de la France** pour l'Observatoire : dessiné dans l'atlas du thème, sans aucune donnée géographique, avec une table fixe des 96 centres de département (données publiques, Licence Ouverte d'Etalab ou IGN [à vérifier]).

### 6.4 Le coût en appels (Vercel Hobby)

- Au plus 19 appels par minute et par appareil, page visible (ST-14 : 3 direct, 3 trésorerie, 13 fil), soit environ 1 140 par heure [calculé].
- Trois heures par jour sur un appareil : environ 100 000 appels par mois [calculé], à comparer au million d'invocations de l'offre Hobby cité par 026-111 [à vérifier dans le tableau de bord Vercel].
- **Mais l'offre Hobby interdit l'usage commercial** : R17 reste ouverte (rectification l.866).

---

## 7. La sécurité

- **Deux gardes à l'entrée, une par sous-partie ensuite** (§3.0.1). Le partenaire n'entre pas. Une sous-partie refusée dit « hors périmètre », jamais 0.
- **Aucune seconde porte vers les agents.** Pas d'iframe, pas d'usine exposée, pas de jeton partagé, pas de cookie tiers. Tout passe par `estFondateur` et, pour agir, par `estDirection` et la reconfirmation.
- **Aucun nouvel hôte.** La CSP ne change pas. La police pixel est servie par `next/font` depuis Presti. Les aperçus passent par des liens signés de courte durée vers le bucket privé, sur l'hôte Supabase déjà permis (`next.config.mjs:36`, relu).
- **Le numéro de version** est lu derrière la garde, jamais dans le HTML du layout, qui est servi à quiconque connaît l'adresse pendant que le drapeau est levé (`app/controle/layout.tsx:6-10`, relu).
- **Les gestes qui engagent** demandent le mot de passe : AUTO, Pause et Reprendre, les décisions d'argent (300 s, `reconfirmation.ts:11-13`).
- **Les consignes sont des données.** 200 signes au plus, 20 par jour, masquées. Adressée à un agent, une consigne ne change ni ses outils ni ses plafonds, et un agent qui agit vers l'extérieur ne l'exécute jamais telle quelle.
- **Jamais le nom d'une personne** sur la carte, dans une bulle, dans le bandeau ou dans l'Observatoire : `masquer` (026-070) ; métier et ville seulement ; départements agrégés.
- **Le support** : un nombre, jamais un contenu. Le domaine `support` est le plus sensible de la matrice (`droits.ts:52-57`, relu).
- **L'audience** : l'existant, sans cookie ni IP. Identifier un visiteur reste refusé.
- **Les réglages** :
  - schéma fermé : une clé inconnue est refusée (400, avec sa liste) ;
  - couleurs validées (`#RRGGBB`) avant d'être posées sur `.mc` ;
  - noms et plaques affichés en texte, jamais en HTML ;
  - avatars pris dans une liste fermée ; aucun téléversement ;
  - 64 Ko au plus par version, 30 écritures par jour au plus [supposé] ;
  - journalisés avant et après.
- **Les thèmes** sont nos fichiers, servis depuis `public/station/themes/`. Aucun thème distant, aucun code dans un thème.
- **La licence du dessin** : `licence.json` par thème ; rien de StarNet (code sous MIT, marque réservée), rien de Claw3D. **Corrigé par le §0.5 le 25/09** : du code de Claw3D est repris, sous sa licence MIT, notice et provenance gardées ; aucun de ses modèles `.glb`, aucun `multiavatar`.
- **Le navigateur** ne garde que des commodités, sous try/catch. Aucune donnée d'entreprise dans `localStorage`.
- **Le juge attaque aussi l'écran** : le texte `<img src=x onerror=alert(1)>` servi dans une activité s'affiche tel quel, sans créer d'image (SA-12, étendu aux plaques et aux noms réglés).

---

## 8. L'impact sur la série 026

**Corrigé par le §0.9 le 25/09 (version de l'après-midi).** 026-113 est remplacée par K1, K2, K3, K4a, K4b, K4c et K5 ; K0 s'ajoute ; N3 est gardée (elle n'est plus fondue dans K2) ; N1 est coupée en N1a et N1b ; F0, N5, N6, N8 et N12 sont réorientées, N4 corrigée ; 026-164, que ce §8 ignorait, est gardée ; 026-092, 026-104, 026-111, 026-130, 026-132 et 026-140 reçoivent un complément ; deux règles de l'INDEX (le PC) sont retouchées ; l'ordre du §8.3 est remplacé. Le reste de ce §8 tient.

Rien n'a été modifié : ces tableaux disent quoi changer. Les ids sont ceux de `presti/.orchestre/brouillons-ecosysteme/026/INDEX.md` (assemblage du 24/09 au soir). Chaque fiche retouchée repasse par son juge, écrit par Claude Code avant l'exécutant.

### 8.1 Les fiches existantes

| Fiche | Action | Raison |
|---|---|---|
| 026-055 | **Garder.** `encaisseDuMois` rend déjà brut, frais, net et paiements (`stripe.ts:60-70`, relu) | — |
| 026-059 | **Préciser** que `encaisse.mois` est l'objet `encaisseDuMois` entier, et que la station en affiche `.net` partout, comme `BarreEtat.tsx:81` ; brut et frais ne paraissent que dans CANAUX | Deux chiffres, un écran : les deux barres côte à côte |
| 026-066 | **Ajouter** `--migration=reglages` à `pilotage-sql-qa.mjs` pour 0113 : table à une ligne, historique, fonctions réservées à `service_role`, version périmée → 409, clé inconnue refusée ; les trois lectures nouvelles | Les juges d'abord (N2 en a besoin) |
| 026-067 | **Réécrire le contrat des vues** : 20 clés de salle ; sous-parties `version`, `sante`, `erreurs` et compteurs COMMANDES, SITES EN LIGNE ; enveloppe « hors périmètre ». **Retoucher** EQ-1 (20 salles et leur genre), EQ-3 (pause → Salle de repos, une seule marche), AT (champ `agent` des cartes), BA-3 (ordre des compteurs, AGENTS ACTIFS, jour, nuit). **Ajouter** la partie `salles2` de `station-route-qa.mjs` (pour N10) | La décision |
| 026-070 | **`SALLES` passe à 20** (+ `audience`, `securite`, `presti`, `observatoire`, `repos`), avec leur `genre`. **`positions`** (l.50) : une pause → `{ salle: 'repos', motif: 'pause' }`. **`barre`** : AGENTS ACTIFS compté sur `equipage`, `jour(LANCEMENT)`, `nuit(heure)`. **`cartesAttention`** : champ `agent` (la ligne ⚠). **`tapis`** : lignes `contenu` (Crieur), `sites` et `packs` (Usine). **Missions** : XP = € net venus des agents, sans récompense. **Paliers** LV des salles. Budget : 15 → 25 min | §3 ; [20], [26], [47], [62], [63], [65] |
| 026-074 | **Route des consignes** : champ `agent` facultatif, dans la liste fermée des noms d'`EQUIPAGE` ; un nom inconnu → 400 | ✉ par agent [29] |
| 026-088 | **`station_consigne_transmettre`** gagne `p_agent` (défaut : tout l'équipage) ; l'événement `consigne` porte `agent_cible` ; même quota | idem |
| 026-092 | **Porte d'entrée `sante`, puis une garde par sous-partie** (§3.0.1), sur le modèle de `barre/route.ts:4`. `direct.barre` gagne `version`, `sante` (fonction de N0), `erreurs` et les compteurs COMMANDES et SITES EN LIGNE. `vue=salle` accepte les 20 clés ; les dix sans lecteur rendent `manque` « arrive avec sa fiche » jusqu'à N10. Liens signés courts des aperçus (site et maquette). Budget : 5 → 7 fichiers | Défaut grave 3 ; ST-1 ; [2], [3], [39], [102] |
| 026-104 | **Réécrire les critères** : ST-1 (sources : `vue=`, `/tresorerie`, `/station/reglages`), ST-3 (géométrie selon la mise en page), ST-10 (feuille « Tous les compteurs »), ST-11 (§5.4), ST-15 (fondateur en lecture ; partenaire → 403) ; CA-1 (police par `next/font` permise), CA-2 (20 zones, polygones), CA-6 et CA-7 (pause → repos), CA-10 (+ WebKit), CA-11 (700 Ko par thème, 1,5 Mo), CA-12 (captures par thème). Jeux d'essai des 20 salles et d'un **thème d'essai neutre** | Les juges d'abord |
| 026-111 | **Mise en page par thème** (colonnes ou flottante ; carte plein cadre sous des colonnes translucides). **Barre en deux lignes** : « ← Poste », version, pastille, fil d'Ariane, JOUR et lune, ⚑, Notifications. Colonnes repliables ; carte du Commandant ; ligne ⚠, 📍 et ancienneté par agent ; toast d'erreurs ; bandeau à six entrées et pastille « € · n en ligne ». Police pixel chargée par `next/font` dans `layout.tsx`. `appliquerReglages()` posée sur `.mc`. Budget : 14 → 18 fichiers [supposé] | §3.1 |
| 026-113 | **Découper.** Elle devient « moteur et calques » : quatre calques, échelle entière en pixels de l'appareil, zoom ×1 à ×3, glissé jusque dans la nébuleuse, croix, zones en polygone, pause → repos, lignes du Crieur et de l'Usine, antenne, égaliseur, badges LV, halo, étiquette. Elle se juge sur le **thème d'essai neutre** servi par le juge. **Retirer** `presti-v1`, `scripts/station-sprites.mjs` et le plan de 480 × 270 (l.50-60) : l'art vient de F0, N5 et N6. CA-2, CA-6, CA-7, CA-10 et CA-11 retouchés. Budget : 10 → 12 fichiers, 25 → 40 min [supposé] | Défauts graves 1 et 2 ; budget impossible (l.8) |
| 026-117 | **Ajouter** ✉ sur chaque carte d'agent (consigne à cet agent, sans mot de passe : c'est une donnée) ; « Reprendre » aussi depuis le panneau de la Salle de repos ; aucun bouton Réglages pour le rôle lecture | [29], [47] |
| 026-120 | **Ajouter** le résumé de salle commun (`salles/Resume.tsx` : RECETTES, AGENTS, AUTOMATISMES, PRODUITS DU JOUR, TÂCHES, ACTIVE AUJ., GÉRER, INFO, touche I), la bordure à la couleur de la salle, « synchro il y a n s · auto 30 s ». Recettes : 5 onglets, MRR, PAIEMENTS, CANAUX. Trésorerie : texte, image, vidéo, voix. Usine : 4 tuiles, 4 onglets, tâches du Livreur, aperçu signé. Atelier : 3 onglets, aperçu, « RÉVISION DEMANDÉE ». Budget : 10 → 14 fichiers [supposé] | [51], [64], [84] à [97], [102], [103] |
| 026-123 | **Ajouter** la consigne adressée (« BENJ ▸ FACTEUR : … »), l'info-bulle nom et rôle sur la pastille, « n en ligne » = AGENTS ACTIFS, et le Journal flottant et repliable (▼) en thème Vaisseau | [77] à [80] |
| 026-125 | **Garder.** L'écran intégré de la salle sur la carte est dessiné par 026-113 depuis `etatExperience` | [49] |
| 026-130 | **Ajouter** les mutations des règles nouvelles : pause → repos, champ `agent` des cartes, AGENTS ACTIFS, garde par sous-partie (une sous-partie d'argent servie sans `comptabilite` doit faire échouer le juge), `p_agent` de la consigne | Chaque juge est contre-vérifié (026-001) |
| 026-132 | **Ajouter** les mutations des critères réécrits et des parties nouvelles de `pilotage-ecran-qa` (`themes`, `reglages`, `salles2`, `vues`, `webkit`) | idem |
| 026-140 | **Recette élargie** : le thème Station (et Vaisseau s'il est livré), un réglage écrit, relu, rétabli et journalisé, les 20 salles qui s'ouvrent, le passage WebKit, `LANCEMENT` posé | La recette couvre ce qui est livré |
| INDEX.md | **Mettre à jour** les tables des lots, des vagues et des migrations (0113), la ligne « Sans fiche encore » (l.123 : les panneaux du Radar, du Crieur, du Studio et du Chantier ont désormais N8 et N9), la correspondance, et le décompte. **À trancher à l'assemblage** : l'index range les fiches nouvelles « à la fin » (l.123), mais 026-161 « reste la dernière » (§ Comment lire) | Tenue de l'index |

Soit **16 fiches retouchées**, 2 gardées, et l'index.

### 8.2 Les fiches nouvelles

Les noms sont provisoires ; l'assemblage leur donne leur id et leur vague.

| Nom | Objet | Exécutant | Juge (écrit en) | Dépend de | Tes gestes |
|---|---|---|---|---|---|
| **F0** | **Source du dessin et planche statique des deux thèmes**, sans aucune donnée : un décor, 3 salles, 4 personnages en marche et au poste, un portrait, la nébuleuse ; `licence.json` | claude-code (compose la planche ; outils d'image si R9 = IA) | `station-themes-qa.mjs --partie=planche` (N1) : poids, licence, grille entière, palette, image non uniforme | R9, N1 | **Trancher R9** ; acheter ou commander si besoin ; **regarder la planche et dire oui** |
| **N0** | Extraction des lectures du Poste vers `lib/` (santé, crons, audience, bans, clients, Cerveaux) et compte agrégé des tickets ouverts, sorties inchangées | claude-code (sécurité et support) | `poste-extraction-qa.mjs` (N1), et les `controle-*-e2e` existants | N1 | Accord sur le diff |
| **N1** | Juges : `station-themes-qa.mjs` (planche, `theme.json`, emplacements, graphe connexe, tapis continus, licence, poids, modules purs), `station-reglages-qa.mjs`, `poste-extraction-qa.mjs`, et les parties `themes`, `reglages`, `salles2`, `vues`, `webkit` de `pilotage-ecran-qa.mjs` ; jeux d'essai `026-pilotage/t/` | claude-code | elle-même (preuve du lot t) | 026-104 (même fichier) | — |
| **N2** | Migration 0113 : réglages et historique, `pilotage_radar`, `pilotage_prospects_departements`, `pilotage_activite_salles` ; essai à sec, appliquée par Claude Code | claude-code | `pilotage-sql-qa.mjs --migration=reglages` (026-066) | 026-066, 026-088 ; collées : 0105, 0112 | — |
| **N3** | Modules purs : `lib/pilotage/theme.ts` (types), `disposition.ts` (`validerDisposition`), `reglages.ts` (`validerReglages`, `fusionner`, `appliquerReglages`) | codex (usine) | `station-themes-qa.mjs --partie=modules` (N1) | N1, 026-070 | — |
| **N4** | Route `GET` et `PUT /api/controle/station/reglages` : version, journal avant et après | claude-code | `station-reglages-qa.mjs` (N1) | N2, N3, 026-092 | Accord sur le diff |
| **N5** | **Thème « Station »** : `theme.json`, atlas, fond peint, portraits, avatars, 20 emplacements, graphe, palette tirée de t049.2, `licence.json` | antigravity | `station-themes-qa.mjs --theme=station` et `pilotage-ecran-qa --partie=themes` (N1) | F0 acceptée, N3, 026-113 | Regarder les captures, dire oui |
| **N6** | **Thème « Vaisseau »**, mise en page flottante | antigravity | idem, `--theme=vaisseau` | N5 et ton oui sur la Station | Regarder, dire oui |
| **N7** | Panneau Réglages (`?vue=reglages`) : thème, équipage, salles, couleurs, affichage, notifications ; aperçu en direct ; éditeur d'emplacements ; historique | antigravity | `pilotage-ecran-qa --partie=reglages` (N1) | N4, N5, 026-111 | Personnaliser à ton goût |
| **N8** | Panneaux Commandement, Radar, Tour du Crieur, Studio pubs, Chantier du code | antigravity | `pilotage-ecran-qa --partie=salles2 --lot=a` (N1) | 026-120, N10 | — |
| **N9** | Panneaux Audience, Sécurité, Presti, Observatoire (la France en pixel art), Salle de repos | antigravity | `--partie=salles2 --lot=b` (N1) | 026-120, N10, N0 | Garder Windsor ou non |
| **N10** | Route : les lecteurs des dix vues de salle restantes, chacun sous son domaine, par les fonctions de N0 et N2 | codex | `station-route-qa.mjs --partie=salles2` (026-067) | N0, N2, 026-092 | — |
| **N11** | Vues Missions, Succès et Aide | antigravity | `pilotage-ecran-qa --partie=vues` (N1) | 026-111 | — |
| **N12** | Mutations des juges nouveaux (`station-themes-qa`, `station-reglages-qa`, `poste-extraction-qa`) | codex | méta-juge de 026-001 | N0 à N11 | — |

Soit **14 fiches nouvelles**.

### 8.3 L'ordre

1. **Tout de suite, sans attendre le bus** : R9 tranchée → N1 → F0. Tu vois la planche des deux thèmes.
2. **En parallèle, les juges puis le code** : retouches de 026-066, 026-067, 026-104 ; puis 026-070, 026-092, N0, N2, N3, N4.
3. **La station** : 026-111 → 026-113 (moteur, sur le thème d'essai) → N5 (Station) → ton oui → N6 (Vaisseau).
4. **Les salles et les vues** : 026-120 → N10 → N8 et N9 ; N7 ; N11 ; 026-117 ; 026-123 ; 026-125.
5. **La contre-vérification et la recette** : 026-130, 026-132, N12 → 026-140.

La série garde ses règles : au plus une fiche Claude Code, une fiche d'exécutant sur le PC et deux fiches Codex sur l'usine à la fois (INDEX, « Comment lire »).

---

## 9. Ce qui te revient

*Mis à jour le 25/09 vers midi, après ta décision pour Claw3D (§0), puis l'après-midi, après les deux relectures adverses (§0.11). Tout reste gratuit : aucune ligne ne demande un achat.*

| # | Décision | Recommandation | Quand |
|---|---|---|---|
| — | **Le moteur de Claw3D** (nouveau, bloquant) | **La carte 2D de Claw3D en pixel art (capture B), pas sa 3D (captures A).** Regarde `apres-B-1440x900.png` et `apres-A-1440x900.png` (§0.2), puis dis « 2D ». Sache deux choses avant. (1) B n'est pas l'écran que tu auras : elle est agrandie ×3 en plein écran ; ton oui sur le rendu viendra sur la planche F0. (2) Ce qui vient de Claw3D, c'est le squelette : l'hôte Phaser, le pont vers React, les types de carte, la recherche de chemin 2D, le générateur d'avatar. Le dessin est à nous. Si c'est la 3D elle-même que tu voulais, dis-le : ce serait un thème « Bureau 3D » à part, plus lourd (three et React Three Fiber, environ 250 Ko gzip de plus [déduit]), qui ne ressemble pas aux vidéos, **et toute la règle de vérité serait à refaire** : 13 `Math.random` dans `RetroOffice3D.tsx`, dont un seul neutralisé par le prototype (et `?pixel=0` le rallume), 2 dans `NavigationSystem.tsx`, 1 dans `core/district.ts` (relus) | Maintenant, avant K1 |
| **R9** | **La source du dessin** (bloquante) | **Ta règle : gratuit, aucun achat.** Le **lot A est déjà sur l'usine**, téléchargé avec ton accord : 10 packs CC0, 15,49 Mo (`~/station-assets/INDEX.md`, relu). R9 devient un choix parmi eux, ou le dessin procédural du prototype. Pour la coupe (Station), les packs en tuiles de 16 px (Rotting Pixels, Ansimuz, l'équipage de Zwonky) entrent dans des salles à notre échelle ; Ganamoda est le plus riche, mais ses murs de 110 px imposeraient une grille bien plus grande. Pour le Vaisseau : Kenney Tiny Factory, Ansimuz Tech Lab, Shade Puny Characters. F0 compare dans l'atelier et te montre le résultat. Aucun nouveau téléchargement n'est prévu | Avant F0, donc maintenant |
| — | **Le poids de la station** | Accepter environ 307 Kio gzip de Phaser, sur la seule page de la station : au plus 400 Kio de plus que `/controle`, mesuré dans le navigateur (§0.8). Le budget de 340 Ko du midi était faux. Rien ne change ailleurs : ni le reste du Poste, ni la vitrine, ni les sites des artisans | Avec ton « 2D » |
| — | **Le Studio Claw3D de l'usine** (nouveau) | Il tourne en mode développement, sans liste blanche : son relais `/api/runtime/custom` va chercher n'importe quelle adresse pour tout processus de l'usine. Rien n'est exposé sur Internet (§0.5). **L'arrêter** (l'atelier `~/claw3d-pixel` le remplace), ou le relancer avec une liste blanche. Je n'y ai pas touché | Maintenant |
| R8 | **Couleurs de la station**, étendue | Toute couleur de thème, sous `.mc` ; le corail partout ailleurs | Avant 026-111 |
| — | **La planche, dans Claw3D** | La regarder : les 20 salles dans la vraie mise en page, à 1440 × 900, 1280 × 800 et au téléphone (captures prises par le juge sur l'usine). C'est là que tu dis oui ou non au rendu, avant K2 | Après F0 |
| — | **L'ordre des thèmes** | Station d'abord, Vaisseau après ton oui | Avec F0 |
| — | **Accord sur le diff** | K1 (`package.json` et `proxy.ts`) et N4 (la route des réglages) | À leur tour |
| — | **La station sur ton téléphone** | L'ouvrir, pincer, glisser, dire oui ou non. Le pincement ne se prouve que là : le juge ne sait pas pincer | Après K5 |
| R17 | **Vercel Pro** | **Déjà tranchée par toi (24/09)** : on reste en Hobby, gratuit, jusqu'au premier site vendu, puis on passe en Pro ce jour-là. Je te le rappellerai à ce moment-là | Au premier site vendu |
| — | **Windsor** | Le garder seulement si tu veux Instagram agrégé dans l'Audience (il faudrait une clé côté serveur [à vérifier]) | Avant N9 |
| — | **Paramètres** | Heures de nuit (20 h à 7 h [supposé]), paliers de l'Usine (1, 10, 50 sites [supposé]), et ceux qui attendaient déjà (heure de la réunion, seuils de niveau) | Avant 026-070 |

---

## Notes et sources

- **Code relu le 25/09** (dans `presti`, à 698f8eb) : `app/controle/layout.tsx:6-10` et `:18-20` ; `lib/direction/garde.ts:40-86` ; `lib/controle/droits.ts:40-90` ; `app/api/controle/barre/route.ts:1-12` ; `app/controle/BarreEtat.tsx:75-85` ; `app/layout.tsx:18-26` ; `lib/alertes.ts:168-196` ; `next.config.mjs:30-45` ; `app/api/controle/support/route.ts:18-32` ; `app/api/controle/etat/route.ts:25-50` ; `app/api/controle/compta/route.ts:55-66` ; `lib/direction/stripe.ts:49-70` ; la liste de `app/api/controle/`.
- **Code de Claw3D** : relu sur l'usine, en lecture seule (commit 0565b78), par l'étude du 25/09 ; les lignes citées au §2.2 viennent de cette étude.
- **Pour le §0, relu par moi le 25/09 vers midi, en lecture seule.**
  - Sur l'usine, dans `~/claw3d` (commit 0565b78, `git status` vide) : `package.json` (versions : Next 16.1.7, React 19.2.3, Phaser ^3.90.0, three ^0.183.2, R3F ^9.5.0, drei ^10.7.7) ; `LICENSE` (MIT, Luke The Dev) ; `OfficePhaserCanvas.tsx:28`, `:53`, `:65-73` ; `lib/office/presence.ts:1-6` ; `lib/office/pathfinding.ts:10`, `:95`, `:223` ; `LightingSystem.ts:60-70` ; la taille des fichiers de la couche 2D ; aucun `Math.random` dans `features/office/phaser/` ; `node_modules/phaser/dist/phaser.min.js` (1 196 122 octets).
  - Sur l'usine, dans l'atelier `~/claw3d-pixel` : `git diff --stat` (3 fichiers, 70 lignes ajoutées, 19 retirées) ; la taille des fichiers nouveaux ; la recherche de `Math.random`, `Date.now` et `setInterval` (un seul résultat, un commentaire, `config.ts:29`) ; `StationPixelScene.ts:1-13`, `:59-79`, `:103-152` ; `OfficePhaserCanvas.tsx:55-90` de l'atelier.
  - Dans `presti` (à 3315141) : `next.config.mjs:25-62`, `app/controle/layout.tsx:1-22`, `middleware.ts:63` et `:80-95`, la liste de `supabase/migrations/` (dernière : 0095), l'absence de `app/controle/station/`.
  - **Captures vues** : `apres-A-1440x900.png`, `apres-A-plongee-1440x900.png`, `apres-B-1440x900.png`, `apres-B-390x844.png`. Les autres éléments du §0 (lignes de la 3D, routes de Claw3D, comptes des 105 éléments) viennent des trois études du 25/09.
- **Brouillons de la série 026 relus** : `INDEX.md`, 026-070, 026-092 (contrat des vues), 026-104, 026-111, 026-113, 026-120 ; les objectifs, périmètres et budgets de 026-012, 026-055, 026-059, 026-064, 026-066, 026-067, 026-068, 026-074, 026-076, 026-079, 026-088, 026-117, 026-123, 026-125, 026-130, 026-132, 026-140.
- **Images vues le 25/09** : androoagi t020.0, t022.0, t040.0, t174.0 ; trevsagents t060.0, t070.0. Les autres images citées l'ont été par l'inventaire du 25/09 ou par la rectification (qui dit lesquelles elle a vues).
- **Ce qui m'est parvenu coupé** : l'inventaire (après le n° 51), la spécification de la décision (au milieu du téléphone) et la décision corrigée (au milieu du §1 D). J'ai complété à partir des renvois de la décision, des brouillons et des images, et je l'ai dit là où c'est le cas (§4).
- **Pour la correction du §0 après les relectures adverses, relu par moi le 25/09 après-midi, en lecture seule.**
  - Sur l'usine, dans l'atelier `~/claw3d-pixel` : `StationPixelScene.ts` (entier), `StationPixel2D.tsx` (entier), `OfficePhaserCanvas.tsx` de l'atelier (entier), `config.ts:1-45`, `stationDecor.ts:1-100`, `:171-173` et `:180-407`, la recherche d'`astar2D` (aucun appel), les `Math.random` de `RetroOffice3D.tsx` (13, dont un seul neutralisé, l.2112), de `NavigationSystem.tsx` (2) et de `core/district.ts` (1).
  - Dans `~/claw3d` (0565b78, `git status` vide) : `OfficeSceneBridge.ts` (entier), `lib/office/presence.ts:1-20`, `schema.ts:17`, `lib/avatars/profile.ts` (272 lignes, ni `multiavatar` ni `Math.random`), `src/app/api/runtime/custom/route.ts:1-40`, `OfficeViewerScene.ts` (imports).
  - Dans `node_modules/phaser` (3.90.0) : `src/math/Between.js:20`, `src/core/Config.js:160-172`, `src/renderer/canvas/CanvasRenderer.js:390-398`, les tailles de `dist/`, `du -sh` (148 Mo), gzip -9 de `phaser.min.js` (314 863 octets).
  - Le Studio : `ss -ltnp` (3000 sur 127.0.0.1 et [::1], 18789 sur 127.0.0.1 ; `rpcbind` sur 0.0.0.0:111 et [::]:111), `/proc/<pid>/cmdline` (`node server/index.js --dev`), et la présence des variables `NODE_ENV`, `CUSTOM_RUNTIME_ALLOWLIST` et `UPSTREAM_ALLOWLIST` dans son environnement et ses `.env` (aucune ; noms comptés, valeurs jamais lues).
  - `~/station-assets/INDEX.md` (lot A) ; Playwright 1.63 (`Touchscreen` : `tap` seulement) et les navigateurs installés (chromium-1243, webkit-2359).
  - Dans `presti` (à 3315141) : `lib/controle/droits.ts:40-100`, `app/controle/page.tsx:70-90`, `scripts/fermeture-e2e.mjs:215-280`, `scripts/budget-perf.mjs` (entier), `scripts/usine.mjs:15-39`, `middleware.ts:58-66` et `:139-142`, `package.json` (aucun Tailwind), le `.next` du 24/09 du PC (manifeste, runtime webpack, gzip de `/controle/layout` : 102 Kio ; de `/controle/page` : 273 Kio).
  - Brouillons 026 : `INDEX.md:8-12`, `:20-27`, `:182`, `:184-188`, `:393-396` ; 026-001 (aucune règle de verdict sur le PC) ; 026-006 et 026-008 (Next 16, `--webpack`, `proxy.ts`) ; 026-070 l.50 (`positions`) ; 026-092 SV-1 et SV-11 ; les en-têtes de 026-111, 026-113 et 026-164.
  - **Capture revue** : `apres-B-1440x900.png` (sept salles à la même paire de bureaux ; « Zz » sur la plaque du Crieur ; « J6/30 DEUR »).
  - Une copie de ce fichier avant la correction est gardée dans le dossier temporaire de la session (`scratchpad/doc-avant-attaque.md`).
- **Rien n'a été publié, envoyé, acheté, ni modifié ailleurs.** Seul ce fichier a été écrit.
