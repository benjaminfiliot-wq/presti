# 026-120 / 026-117 — essais du 04/10 (décision D-0410-11) : le faux panneau retiré, les prothèses de Barre.tsx éprouvées

## 1. Fait : le faux panneau « envois » retiré d'Attention.tsx (périmètre étendu par D-0410-11)

`app/controle/station/Attention.tsx` : retirés le rendu `[data-salle-panneau="envois"]`, le sondage de
`/api/controle/station?vue=salle&salle=envois` (toutes les 100 ms), `DEFAUT_ENVOIS`, `salle`, `envois`, `donneesEnvois` et les deux
imports devenus inutiles (`apiDirection`, `GestesEnvoi`). Rien d'autre n'a bougé (les feuilles Décisions et Appels, la détection du
rôle, le lien profond restent : c'est l'ouvrage de 026-117). sha256 après : `ce4422245be86f0f9c9bb9db0d38b29019473a84b628ba699615b1ab2e9d5534`. `tsc --noEmit` sur la racine (Barre.tsx restauré) : code 0, 21 h 38 → 21 h 40 UTC.

## 2. Ce que contient `Barre.tsx` (non commité, 026-117) : TROIS prothèses de test, pas une

1. `Storage.prototype.removeItem` ignoré pour toute clé `sb-…-auth-token` : la déconnexion ne retire plus le jeton dans cet onglet ;
2. `supabase.auth.getSession` remplacé : rend la session de `window.__BANC__.session`, sinon un jeton gardé en mémoire à la
   première lecture (expiration fabriquée : 36 000 000 s), même après déconnexion ;
3. `window.fetch` remplacé : rend `{}` (200) à toute requête vers un hôte non local, Supabase compris.

Le chef n'a nommé que la troisième ; les deux premières sont du même ordre (jamais en production).

## 3. Essais du juge de 026-117 (`pilotage-ecran-qa --partie=gestes`) SANS les trois prothèses

| Essai | Racine | Résultat | Journal |
|---|---|---|---|
| A. juge officiel, les trois prothèses retirées | réelle (next dev, compte fondateur d'essai) | FAIL 14/15, dont EG-12 : « 7 requête(s) du navigateur hors de la page servie, refusée(s) par le routeur du juge (…/auth/v1/token?grant_type=refresh_token) » + `page.goto` 60 s dépassé sur tous les scénarios | `reel-gestes-sans-protheses-04-10.log` |
| B. juge de travail (copie hors dépôt, UNE ligne changée : `expires_at: 4102444800` dans la session posée) | réelle | les 7 requêtes de rafraîchissement disparaissent ; FAIL quand même : `page.goto` 60 s dépassé (voir 4) | `reel-gestes-juge-expires-04-10.log` |
| C. juge officiel, sans prothèses, sans le faux panneau, sans l'ouvrage Phaser non commité | banc (`--racine=`) | **PASS 15/15** en 42 s | `banc-gestes-04-10.log` |
| D. juge officiel `--partie=salles`, même racine | banc | **PASS 20/20** en 90 s | `banc-salles-04-10.log` |

Cause des requêtes de rafraîchissement (A) : le juge fige l'horloge de la page (`page.clock.setFixedTime` / `install`, jeux datés
du 11 et 12/10) alors que la session posée est une vraie session Supabase (`expires_at` = maintenant + 1 h) : pour supabase-js elle est
« expirée », il appelle `auth/v1/token?grant_type=refresh_token`, le juge refuse (piège réseau EG-12). Les trois prothèses de Barre.tsx
sont ce qu'Antigravity a ajouté dans le code de production pour que cette course passe (le garde `fetch` cache même ces requêtes au
piège réseau du juge). Une ligne du juge la lève sans rien assouplir (B).

Racine du banc (C et D) : copie de `app/` et `lib/` de la production du 04/10 à 23 h, SAUF `Carte.tsx` (HEAD) et `moteur/` (non commité,
Phaser, autre fiche), et `Barre.tsx` sans les trois prothèses (obtenu par retrait mécanique de tout ce qui précède `export function lire`).

## 4. Pourquoi le `verifier` réel (racine réelle) n'a pas pu être rejoué

Tous les `page.goto` du juge réel dépassent 60 s (A et B : 14 scénarios sur 14 ; c'était déjà le cas le 04/10 à 13 h 54, voir
`verifier.log`) : le PC n'a que 580 Mo de RAM libre sur 7,9 Go, une quarantaine de processus node, treize `next start` et une dizaine de
juges d'autres fiches tournent ; et la racine contient maintenant l'ouvrage non commité de la carte (`Carte.tsx` charge `moteur/entree`
par `next/dynamic` : `next dev` compile Phaser dans la page de la station). Le juge copie `app/` et `lib/` de la racine réelle, ouvrage
des autres fiches compris. Aucune de ces causes n'est dans les fichiers de 026-117 ni de 026-120.

## 5. Incident de mon fait, réparé

Les essais A et B ont écrasé `.orchestre/preuves/026-117/telephone.jpg` (le juge efface puis réécrit la capture : 4 258 octets, capture
d'échec). L'original du 02/10 n'était pas dans git (dossier jamais commité). Remplacé par la capture du juge en banc du 04/10
(`telephone.jpg` 390×844, 49 734 octets, sha256 `a6ccf9f390b24bf6f8673279327bd0e756b6077e633d89cd657519668de9fd23`, prise par le juge lui-même
en essai C). `bureau.jpg` (02/10, 155 935 octets, racine réelle) est intact. Un PASS réel du juge de 026-117 réécrira les deux.

## 6. État laissé

`Barre.tsx` RESTAURÉ tel que 026-117 l'a livré (sha256 `cb7b2c2eb531252097aec443fce4c3112fd4f245856ca89839d45bae9dbe7149`) : il a été
sans ses trois prothèses dans l'arbre partagé de ~20 h 43 à ~21 h 30 UTC (essais A et B). Un juge réel d'une autre fiche dont la copie
d'`app/` a été prise dans cette fenêtre (ex. `copie-18972`, 20 h 57 UTC) a pu embarquer ce Barre sans garde et rougir à tort sur son critère
de piège réseau : à rejouer. Rien n'est commité. Le juge de travail est dans
`.orchestre/travail/026-120/juge-expires.mjs` (dossier ignoré par git ; imports réécrits en URL absolues, une ligne changée, ligne 283).
