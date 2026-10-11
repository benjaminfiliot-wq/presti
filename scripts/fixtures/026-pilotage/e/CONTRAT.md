# Contrat des juges d'écran de la carte (lot e, fiche 026-172) — ce que le moteur expose, ce que le juge observe

Écrit par Claude Code le 04/10. Il lie deux morceaux : **le témoin** (`e/temoin/`, un moteur MINIMAL : un module de moins de 300 lignes par partie, sans une ligne de Claw3D, sans Phaser, sans image) et **le juge** (`scripts/station-ecran-qa.mjs`, ses parties dans `e/juge-*.mjs`). Le moteur réel (026-179 à 026-189) doit exposer les mêmes points : les parties du juge n'y lisent que ceci. Rien de ce qui suit n'est un « drapeau de test » dans le moteur : le juge instrumente lui-même sa COPIE, et les données qu'il sert sont des jeux d'essai (`e/jeux.mjs`, `s/`, `k/session-simulee.mjs`), jamais le réseau.

Ce contrat prolonge celui du lot k (`k/CONTRAT.md`, juge `station-claw3d-qa`) : le canevas, le miroir `ul[data-miroir]`, `[data-bulle]` et `[data-zz]`, le jeu Phaser instrumenté (`globalThis.__stationGame`), la session simulée et le thème d'essai sont les mêmes.

## 1. Comment le juge sert la station

- **La copie** : `app/` élagué à la station et à ce qu'elle importe, `lib/`, `proxy.ts`, `package.json`, `tsconfig.json` ; `lib/flags.ts` de la COPIE a `pilotage` et `stationCarte` levés (un drapeau absent est ajouté) ; dans `moteur/**` de la copie `new Phaser.Game(…)` devient `(globalThis.__stationGame = new Phaser.Game(…))`. Un seul `next build` (cache par contenu), puis `next start` sur `127.0.0.1`.
- **Les réponses** (interceptées par Playwright, aucune clé, aucun compte) : `GET /api/controle/station?vue=direct|fil|salle|agent`, `/api/controle/station/reglages` (GET, PUT, `?historique=1`), `/api/controle/tresorerie`, `/api/controle/journal` (le rôle), `/station/themes/<clé>/theme.json` (clé de la liste fermée `station`, `vaisseau`, `essai`). Le juge modifie ce qu'il sert à la lecture suivante : c'est ainsi qu'il injecte un événement (`tache_prise`, réunion, pause, panne, bulle du Radar, `+1`, `carte.nuit`).
- **La cadence** : la station relit `vue=fil` toutes les 5 s et `vue=direct` dès qu'une bulle nouvelle arrive (au plus une fois par 5 s) : un événement injecté se voit donc dans les 15 s.
- **Le thème** : le réglage `theme` vaut `essai` (le thème d'essai de `k/themes/essai/`, dont le hublot de la salle de réunion est un polygone) ; `themes` : chaque thème livré sous `public/station/themes/<clé>/theme.json` est servi tel quel.

## 2. Ce que le juge lit (attributs et éléments)

### 2.1 Le cadre et le miroir (`verite`, `calque`)

| Élément | Contrat |
|---|---|
| `[data-station]` | la racine `.mc` de la station ; `data-role` (`direction` ou `lecture`), `data-mise-en-page` (`colonnes` ou `flottante`, celle du thème) |
| `[data-station-carte]` | le cadre de la carte ; un seul `<canvas>` dedans ; porte `data-nuit` (`oui` ou `non`), `data-zoom` (1 à 3), `data-vue-x` et `data-vue-y` (le centre de la vue, en pixels de la grille), `data-vue` (`ensemble` ou `zoom`) |
| `ul[data-miroir] > li[data-personnage="<nom>"]` | un `li` par agent servi avec une salle, aucun autre ; `data-salle`, `data-motif` (`porte`, `tache`, `reunion`, `pause`, `panne`), `data-etat` (`marche` ou `arrive`), `data-x` et `data-y` (entiers, pixels de la grille), `data-halo` (`oui` pour le motif `tache`, sinon `non`) ; un texte (le nom, la salle et le motif en clair) ; mis à jour à chaque pas de marche et à l'arrivée |
| `[data-bulle="<agent>"]` | le texte servi exact de la dernière bulle de l'agent, en texte |
| `[data-zz="<agent>"]` | « Zz », seulement pour le motif `pause` une fois arrivé au Repos |
| `[data-antenne]` | un élément qui recouvre la zone de l'antenne du toit ; `data-etat` : `fixe`, ou `tourne` pendant les 2 s qui suivent une bulle NOUVELLE du Radar ou du Veilleur (jamais au premier relevé, jamais sur une lecture identique, jamais en mouvement réduit) |
| `[data-infobulle]` | l'info-bulle d'un personnage (survol, puis focus) : `hidden` tant qu'elle n'est pas montrée ; son nom, son rôle, EXACTEMENT le `modele.texte` servi (« sans IA » pour un agent sans modèle), en texte |
| `[data-perso="<agent>"]` | un élément focusable par personnage (ou `li[data-personnage][tabindex]`) : le clavier montre l'info-bulle |
| `[data-plaque="<clé>"]`, `[data-nom="<agent>"]` | les plaques des salles et les noms des personnages, en texte HTML dans la police pixel OFL (`--mc-police-pixel`), 12 px au moins |
| `[data-liste-salles]` et ses `[data-salle="<clé>"]` | la liste des salles reste SOUS la carte (un bouton par clé de `SALLES`, plus la réservée) |
| `[data-onglet-tel="station"]` | l'onglet du téléphone (026-111) qui monte la carte : le juge l'ouvre avant de lire |

Le canevas ne porte que le décor, les personnages, le halo, l'étincelle et l'antenne. **Rien d'autre n'y est peint** : les lignes, l'égaliseur, l'écran de l'Expérience, les badges, les plaques, les noms, les bulles et les « +1 » sont des éléments HTML. Pour mesurer le canevas, le juge masque pendant la capture tout ce qui est dans `[data-station-carte]` sauf le `<canvas>` (une feuille `style[data-juge-masque]` qu'il pose et retire lui-même), puis il prend une capture de la page : jamais un `toDataURL`.

Immobilité (CE-3) : trois témoins sur 3 s, `globalThis.__stationGame.loop.frame` constant, l'empreinte du canevas constante, et aucune animation `running` (`document.getAnimations()`) dans `[data-station]`. Le décor (`__stationGame.textures.get('decor')`, s'il s'appelle ainsi) est redessiné UNE fois au changement de `carte.nuit`.

### 2.2 La caméra et les zones (`camera`, `themes`)

| Élément | Contrat |
|---|---|
| `[data-camera]` | la barre des trois boutons : elle ne recouvre le centre d'aucune zone |
| `[data-action="zoom-avant"]`, `[data-action="zoom-arriere"]`, `[data-action="vue-ensemble"]` | +, − et ⊞ (dans `[data-camera]`) ; la molette zoome aussi (×1 à ×3, borné), les flèches déplacent la vue |
| `[data-station-carte] [data-zone-salle="<clé>"]` | une zone par emplacement du thème (les vingt clés de `SALLES` plus la réservée) : son centre est dans le rectangle du canevas et `elementFromPoint` à ce centre rend la zone ; un clic pose `?salle=<clé>` sans changer de page ; `data-teinte` (la teinte de la salle en vue d'ensemble), `data-survol` (`oui` sous le pointeur), `data-selectionnee` (`oui` pour la salle choisie, encadrée de blanc) ; la zone du hublot est un polygone (`clip-path: polygon(…)`) |
| `[data-etiquette]` | l'étiquette à pointe qui apparaît au survol d'une salle ; elle contient `[data-pointe]` |

La taille du canevas est la grille du thème × k, **k entier ≥ 1 en pixels de l'appareil** ; sa taille CSS est sa taille divisée par `devicePixelRatio`. Le curseur est une croix sur le vide, une main sur une zone.

### 2.3 Les acteurs (`acteurs`)

| Élément | Contrat |
|---|---|
| `[data-tapis-etape="<clé>"]` | les huit étapes du tapis (« PAYÉ » comprise, « hors périmètre » si le domaine est refusé) avec le compteur du jour servi, « — » si la source est absente, jamais 0 |
| `[data-tapis-rejet]` | « REJET <nombre> · PASS <taux> % » |
| `[data-carre="<étape>"]` | un par carré en route d'une étape à la suivante (un `li` du miroir ou tout autre élément) ; exactement un par « +1 » servi, aucun au premier relevé, aucun sur une relecture identique |
| `[data-plus-un="<étape>"]` | « +1 <LIBELLÉ> » 1,5 s, un par mouvement |
| `[data-ligne-etape="<ligne>:<clé>"]` | les lignes du Crieur (`contenu`) et de l'Usine (`sites`, `packs`), un compteur par étape servi |
| `[data-egaliseur]` et ses `[data-barre]` | douze barres, `data-valeur` : figées entre deux lectures |
| `[data-ecran="experience"]` | « J6/30 · 0 € » en cours, « FERMÉE · R13 » avant la première vente |
| `[data-badge-lv="<salle>"]` | un badge LV seulement là où `palierSalle` en rend un |

### 2.4 Les réglages (`reglages`)

`?vue=reglages` ouvre `[data-vue="reglages"]` : 480 px de large au bureau, une feuille plein écran au téléphone, absent pour le rôle `lecture`. Dedans : `select[data-theme-choix]` (les thèmes livrés), `input[data-couleur="--mc-accent"]` (une couleur `#RRGGBB`), `select[data-salle-emplacement="<salle>"]` (un par salle ; la valeur est une clé d'emplacement), des boutons « Enregistrer », « Annuler », « Revenir au thème par défaut », « Historique » ; `[data-version]` par version de l'historique (dix au plus) avec son bouton « Rétablir » ; `[data-message]` (ou le texte du panneau) pour les messages, dont « modifié ailleurs : recharge » sur un 409. L'aperçu est en direct SANS écriture (aucun `PUT`) ; « Enregistrer » envoie UN `PUT` avec la version lue ; une disposition refusée (la réservée déplacée, deux salles dans un emplacement, un graphe coupé : « n'est plus reliée au reste ») désactive « Enregistrer » et dit pourquoi. Le thème choisi pose sa palette sur `.mc` SEULEMENT (ni `html` ni `body`) et sa mise en page sur `data-mise-en-page` de `.mc`.

### 2.5 Les salles nouvelles (`salles2`)

`?salle=<clé>` ouvre `[data-salle-panneau="<clé>"]` (Commandement, Audience, Sécurité, Presti, Observatoire, Salle de repos, E-commerce) avec le résumé `[data-resume-salle]` (la touche I le replie), et dit « hors périmètre » (jamais 0) pour chaque sous-partie refusée ; aucun nom de personne ; E-commerce dit « Branche réservée : rien n'est construit. », sans chiffre ni bouton. `scrollWidth` ≤ 390 à 390×844. Un panneau de salle plus ancien (`[data-salle-agents]`) compte aussi pour « une feuille s'ouvre » (CE-24).

### 2.6 Le téléphone (`webkit`)

Sous WebKit à 390×844 (densité 3) : `scrollWidth` ≤ 390 ; le cadre de la carte fait 358 px de large et s'ouvre en vue d'ensemble (`data-vue="ensemble"`) ; `touch-action: none` sur le cadre ; `gesturestart` bloqué dans le cadre ; +, − et ⊞ de 44 px au moins ; les plaques ne se voient qu'à partir du zoom ×2 ; un `touchmove` envoyé au cadre est bloqué. **Le pincement ne se prouve pas** (Playwright 1.63 n'offre au toucher que `tap(x, y)`) : il se prouve sur le téléphone de Benj.

## 3. Les captures

JPEG pris par `page.screenshot(` du juge (taille de la page en pixels CSS, même à la densité 3), de 10 Ko à 1,5 Mo, non uniformes (écart type de la luminance ≥ 4, mesuré sur les octets écrits), différents d'une partie à l'autre. Racine réelle : `.orchestre/preuves/<fiche jugée>/` (026-181 verite, 026-182 camera, 026-183 acteurs, 026-184 calque, 026-185 themes, 026-186 webkit, 026-187 reglages, 026-188 salles2) ; sinon sous `.orchestre/travail/station-ecran-qa/captures/`. `bureau.jpg` (1440×900) et `telephone.jpg` (390×844) pour verite, camera, acteurs, calque, reglages et salles2 ; `bureau-<clé>.jpg` et `telephone-<clé>.jpg` par thème livré ; `telephone-webkit.jpg`.

## 4. Ce que le juge ne fait jamais

Il ne demande aucun crochet au moteur, ne lit ni `.env.local` ni aucune clé, ne sort pas de `127.0.0.1`, n'écrit que sous `.orchestre/travail/` et dans `.orchestre/preuves/<fiche jugée>/`, et ne lève jamais un drapeau dans l'arbre réel : `pilotage` et `stationCarte` ne sont levés que dans sa copie.
