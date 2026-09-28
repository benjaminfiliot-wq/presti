# 026-169 — contre-vérification indépendante (28/09, ~10:20–11:10 UTC)

Contre-vérification de la fiche `026-169` (verdict déclaré : VERT, `station-planche-qa --partie=planche` → PASS
9/9, PN-1 à PN-9, 2026-09-28T10:20:16Z). Elle ne relit pas seulement le journal d'un autre agent : elle relance
elle-même le verifier, sabote elle-même une partie de la production (atelier réel + documentation), et
recoupe les affirmations de `planche.md`/`licence-planche.json` avec les fichiers réels de l'atelier et de
`~/station-assets` sur l'usine.

## 1. Reproduction du verifier (avant tout sabotage)

`cd presti && node scripts/station-planche-qa.mjs --partie=planche` relancé à neuf (pas une relecture du log
fourni) : **PASS**, 9/9 verts (PN-1 à PN-9), atelier `~/claw3d-pixel` au commit `d4922d06c51f`, git status propre,
128 s au total (paquet 69 s + commande sur l'usine 47 s + rapatriement). Les cinq captures ont été réécrites par
ce passage (donc les fichiers actuellement dans `.orchestre/preuves/026-169/*.jpg` sont d'un PASS que j'ai
produit moi-même, pas seulement celui de l'exécutant). Empreintes des trois documents de production avant tout
sabotage :

```
f5d26927adce614e3bff27e40ff7a507d0464c98defb9a042eb414e42ebd127a  docs/station/planche.md
f5daa8af539b34c5dbc535fe19aae070f106ff504d136ad7d250346f2809be04  docs/station/grille.json
f3d5674d760b869a35e8ae1987571f72ec20256a13098439fe5a35375bbfea64  docs/station/licence-planche.json
b87e825bd5657ae5e0bb9d6fe718e7302ae1b47fc4e3e0059dd18861cd4de41b  ~/claw3d-pixel/src/features/planche/grid.ts (usine)
```

## 2. D'abord Codex sur l'usine (économie de Claude)

```
cd presti && node ../presti-ops/usine/revue-codex.mjs 026-169 --sabotages=4
```
Résultat : **code 125 (NON JUGÉ)**. `usine executer` n'a rien envoyé : « construction du paquet : Command failed:
git -c core.quotepath=false add --pathspec-from-file=…index.liste --pathspec-file-nul » — un échec de l'outillage
de paquet, pas un verdict sur 026-169. Journal : `.orchestre/travail/revue-codex/026-169/executer.log` (seul
fichier produit ; ni `verdict.json` ni `journal.json` n'ont été écrits, cohérent avec un échec avant tout envoi).
Conformément à la consigne (125 = pas jugé), la contre-vérification est passée aux sabotages manuels.

## 3. Sabotage réel de l'atelier (réussi, en conditions live)

Cible : `~/claw3d-pixel/src/features/planche/grid.ts` sur l'usine (la vraie production jugée, pas un témoin/fixture
— 026-169 n'a pas de banc dédié comme 026-168).

- Édition : `K['390']` `3` → `5` (canevas téléphone attendu).
- `station-planche-qa --partie=planche` relancé : **FAIL**, ❌ **PN-1 seul** : « git status de l'atelier n'est pas
  propre : 1 entrée(s), dont « M src/features/planche/grid.ts » » ; PN-2 à PN-9 non évalués (arrêt sur PN-1, tel
  que conçu : `arreterSurPN1`).
- Restauration : `cp /tmp/grid.ts.bak src/features/planche/grid.ts` (sur l'usine) → `git status` propre, `git diff`
  vide, `git rev-parse HEAD` = `d4922d06c51ffafac5e4fc769773946a776c91cd` (inchangé) → sha256 restauré =
  `b87e825b…4de41b`, identique à la base.

Le juge a bien vu la faute — pas exactement le critère visé (PN-3, la taille du canevas), mais PN-1 en amont :
toute dérive non commitée de l'atelier est bloquante avant même de regarder le rendu. C'est une garantie plus
forte que celle demandée, pas une faiblesse.

## 4. Obstacle infra : les 3 autres sabotages prévus n'ont pas pu être rejoués en direct

Plan initial (isolés de PN-1 car ce sont des documents **locaux**, lus sans exiger que l'atelier soit sale) :
`grille.json.reserve.x` (PN-2), `grille.json.tuile` (PN-3, isolé de PN-2 car `tuile` n'entre pas dans le calcul
`kx/ky` des salles — seul `grille.l/h` y entre), `planche.md` bloc `palette:` (PN-4), `licence-planche.json.licence`
(PN-5). J'ai appliqué le premier (`reserve.x` 272→290) puis tenté de relancer le verifier : **8 essais consécutifs
sur ~25 min, tous code 2** — `usine executer` refuse d'envoyer le paquet (« contrôle du paquet, 1 problème(s) »)
à cause de `lib/agents/llm.ts:82 : motif nom sensible : valeur`, un **fichier non suivi d'une autre session en
cours** (absent du `git status` de tête de cette session, apparu à 12:48 CEST, toujours présent et non modifié
21+ min plus tard) — sans rapport avec 026-169. Le contrôle de paquet scanne tout le diff du dépôt, pas le
périmètre d'une fiche ; c'est le même mécanisme qui a fait échouer `revue-codex` pour 026-142 la nuit dernière
pour une raison identique (voir `.orchestre/preuves/026-142/contre-verif-28-09.md`). Le code source dit
explicitement « Ne contourne jamais » (`scripts/executant.mjs`) : je n'ai ni touché ni contourné ce fichier tiers.
`docs/station/grille.json` a été restauré immédiatement (sha256 `f5daa8af…09be04`, identique à la base) plutôt
que laissé sale en attendant un déblocage incertain.

Faute de pouvoir rejouer ces 3 sabotages en direct, voici pourquoi chacun ciblerait bien son seul critère (lecture
du code du juge, `scripts/station-planche-qa.mjs`) :
- **PN-2** (`reserve.x`) : la position attendue vient de `d.grille.reserve` (ligne 1104), comparée à la position
  rendue ; aucune autre variable n'en dépend → PN-2 seul rougirait.
- **PN-3** (`tuile`) : `controlerGrille` (l. 784-788) vérifie `l/h % tuile` indépendamment de `grille.l/h` (qui
  restent 400×384, utilisés par ailleurs pour `kx/ky`, l. 1095) → l'erreur reste dans `e3`/PN-3, sans toucher PN-2.
  (Écarté à l'inverse : `grille.bureau.h` lui-même est réutilisé dans `ky` du calcul des salles, l. 1095-1096 — le
  modifier aurait fait rougir PN-2 *et* PN-3 à la fois ; `tuile` évite ce croisement.)
- **PN-4** (`palette:` du bloc fenced de `planche.md`) : seule source de `d.palette` (l. 285-294), comparée pixel
  par pixel au rendu réel (l. 1080-1085) — un rendu qui utilise réellement la couleur retirée ferait rougir PN-4
  seul.
- **PN-5** (`licence-planche.json.licence`) : comparé champ à champ au `licence.json` réel du pack sur l'usine
  (l. 816) ; le `licence.json` réel reste `CC0`, donc seule la ligne de comparaison (PN-5) rougirait, pas le test
  « CC0 attendu » sur le fichier réel (l. 817, qui lit le fichier réel, pas la déclaration).

Ce n'est pas une preuve d'exécution — seulement un audit de code — et c'est noté comme tel : à rejouer pour de
vrai une fois `lib/agents/llm.ts` hors du chemin (l'autre session terminée ou ce fichier committé/retiré).

## 5. Recoupements indépendants (sans passer par le verifier)

- **Tailles d'atlas** : `public/planche/atlas-station.png` = 18994 o (≈ 19,0 Ko, conforme) ; `atlas-vaisseau.png`
  = 5464 o (≈ 5,5 Ko, conforme).
- **Police (PN-5)** : `src/app/layout.tsx` ne charge plus `next/font/google` (commentaire en tête l'explique) ;
  `globals.css:53-55` définit bien `--font-display/--font-sans/--font-mono` avec repli `sans-serif`/`monospace`
  — exactement ce que dit `planche.md` §« Police (PN-5) ».
- **Commit local, jamais poussé** : `git log --oneline -3` = 3 commits `f0-planche` cohérents avec le récit de
  `planche.md` (décor initial → retrait next/font/google → fix portrait/PN-4) ; `git remote -v` montre `origin`
  = le dépôt amont `iamlukethedev/Claw3D` (pas « le nôtre ») ; `git log origin/main -1` est à un commit sans
  rapport (`0565b78`) et `git branch -r --contains d4922d06…` est **vide** → confirmé jamais poussé.
- **Licences (PN-5), les 4 packs** : `titre`/`auteur`/`page`/`licence`/`date` de `licence-planche.json` comparés
  champ à champ aux 4 `licence.json` réels sur `~/station-assets` (04, 05, 07, 09) — **identiques sur toute la
  ligne**, y compris les cas particuliers (« CC0 (les deux volumes) » pour 07, deux adresses jointes par « ; »).

## 6. Défaut trouvé (important, non bloquant) : fichiers de l'atelier non déclarés

`git diff --stat 81f43b1~1 d4922d06` (les 3 commits `f0-planche`, en base l'origine du fork) touche **21
fichiers**, alors que la fiche et `planche.md` n'en citent que 9. Fichiers absents de toute liste : 
`src/app/office/pixel2d/page.tsx` (nouveau), `src/features/office/components/OfficePhaserCanvas.tsx` (modifié,
34 lignes), `src/features/office/components/StationPixel2D.tsx` (nouveau, 48 l.), 
`src/features/office/phaser/StationPixelScene.ts` (nouveau, 166 l.), `src/features/retro-office/RetroOffice3D.tsx`
(modifié, 41 l.), `src/features/retro-office/objects/agents.tsx` (modifié, 14 l.), et tout le dossier
`src/features/retro-office/pixel/` (6 nouveaux fichiers, `PixelAgentSprite.tsx`/`PixelPipeline.tsx`/
`agentPainter.ts`/`config.ts`/`pixelFont.ts`/`stationDecor.ts`, ~1200 lignes au total).

`planche.md` affirme (§« Commit de l'atelier ») : « Cette planche F0 ajoute uniquement des fichiers nouveaux
(…) » en ne citant que les 3 dossiers `planche/`. **C'est factuellement inexact** : deux fichiers existants du
prototype B (`OfficePhaserCanvas.tsx`, `RetroOffice3D.tsx`) sont modifiés, pas seulement complétés par des
fichiers neufs. J'ai vérifié que ces deux diffs sont bien des ajouts *conditionnels* (nouveau `mode: "station"`
dans un type union existant, nouveaux drapeaux `PIXEL_MODE`/`PIXEL_TRUTH_MODE` avec branches `else` qui
préservent le chemin existant) — donc le comportement par défaut de `/office/pixel2d` n'est probablement pas
cassé, mais l'affirmation « laissée intacte » est trompeuse au sens littéral (les fichiers ont bel et bien
changé). Vérifié aussi : `PlancheView.tsx` n'importe **rien** de `retro-office/pixel/` ni de `StationPixelScene`
(seul import local : `./grid`, `./manifest.json` + React) — ce code Phaser est donc mort pour la route
`/office/planche` jugée par `station-planche-qa`, ce qui explique que PN-1 à PN-9 restent verts malgré cette
non-déclaration. C'est un défaut de **transparence de la preuve** (scope non déclaré, ~1200 lignes muettes dans
`planche.md`), pas un défaut du rendu jugé.

## 7. Restauration finale

```
docs/station/planche.md            f5d26927…1e42ebd127a   = base
docs/station/grille.json           f5daa8af…46d2809be04   = base
docs/station/licence-planche.json  f3d5674d…35375bbfea64   = base   (jamais modifié)
~/claw3d-pixel/…/grid.ts (usine)   b87e825b…c4de41b        = base
```
`git status --porcelain -- docs/station .orchestre/preuves/026-169 .orchestre/fait/026-169.md` = seulement les
3 entrées `??` attendues (documents + preuves de la fiche elle-même), rien d'autre. Atelier sur l'usine :
`git status` propre, `HEAD` = `d4922d06c51f…`, inchangé. Aucun fichier commité, aucun fichier touché hors de
`.orchestre/preuves/026-169/` et `.orchestre/travail/` (côté dépôt) ou de l'atelier lui-même (côté usine, et
restauré).

## Verdict de la contre-vérification

**VERT confirmé** pour les 9 critères du juge : PASS reproduit à neuf, un sabotage réel de production a été vu
et bloqué par PN-1, et cinq affirmations indépendantes de `planche.md`/`licence-planche.json` (tailles d'atlas,
retrait de police, historique/non-push de l'atelier, licences des 4 packs) recoupent exactement les fichiers
réels sur l'usine.

**Un défaut important, non bloquant** : le commit `f0-planche` embarque ~1200 lignes et 2 fichiers modifiés du
prototype B non déclarés dans `planche.md` ni dans la fiche (§6) — inerte pour la route jugée, mais la
documentation de scope de la fiche est incomplète et devrait être corrigée ou expliquée avant que 026-169 serve
de référence à une fiche future.

**Limite de cette contre-vérification** : Codex sur l'usine n'a pas pu juger (125, échec d'outillage), et 3 des
5 sabotages prévus n'ont pas pu être rejoués en direct (8 tentatives, ~25 min, bloquées par un fichier tiers
d'une autre session — `lib/agents/llm.ts`, jamais touché) ; ils sont justifiés par lecture de code (§4) et
restent à rejouer pour de vraies preuves d'exécution. Ceci n'est pas un défaut de 026-169.

Reste, comme le dit la fiche elle-même, le seul geste qui n'est pas technique : **le oui ou le non de Benj**
devant les captures (R9) — hors du périmètre d'une contre-vérification automatique.
