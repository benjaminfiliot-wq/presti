# Méthode v2 de la chaîne TikTok « Brico Travaux » (07/10)

Le verdict de Benj sur les quatre vidéos « keynote » du 07/10 : nulles, pareilles aux anciennes, la référence pas suivie,
accroche ennuyante, pas de musique tendance, voix horrible, rien de réaliste, animations à revoir, quatre fois la même
vidéo, et une phrase fausse (« Deux batteries fournies. Et la voiture aussi… »). La v2 ne retouche pas : elle change la
matière première. **Des images réelles du produit en action, d'abord ; l'animation ne fait que les servir.**

Outils : `v2/monter.mjs` (montage), `v2/juge.mjs` (juge + sabotages), `v2/rushes.mjs` (rushes du fournisseur),
`v2/provenance.json` (origine de chaque plan), `v2/videos/*.json` (une fiche par vidéo).

## 1. Ce que disent les anciens posts du compte (relevé du 07/10)

Relevé dans TikTok Studio (API de la page Publications, compte @bricotravauxfrance) : **52 publications** du 10/02 au
29/04/2026. Les meilleures :

| Publication | Vues | J'aime | Partages | Durée |
|---|---:|---:|---:|---:|
| « Des maisons de haute qualité pour 3000€ ?? » (7619393807628422422) | 386 911 | 4 928 | 813 | 50 s |
| « Il fabrique un Barbecue pour 120€ ! » (7615132180326501654) | 373 827 | 3 092 | 388 | 47 s |
| « La nouvelle isolation thermique ultra rentable » (7620916018352835862) | 283 173 | 1 617 | 176 | 54 s |
| « La technique qui révolutionne les sols pour moins de 300€ » (7608920512194120982) | 263 506 | 2 148 | 986 | 60 s |
| « Construction d'un magnifique four à pizza pour 2000€ » (7614019607090793750) | 245 322 | 1 573 | 82 | 55 s |
| « Isoler pour 50€/mois ? Le secret qui tue EDF » (7626062616519052566) | 233 907 | 1 400 | 126 | 42 s |

La moitié basse du compte tourne entre 1 400 et 6 000 vues : l'écart ne vient pas du montage (identique partout) mais du
**sujet et de la première phrase**. Les six meilleures ont été téléchargées et regardées à 4 i/s (3 premières secondes)
et à 1 i/s (en entier), et écoutées (faster-whisper + mesures de hauteur et de niveau). Ce qu'elles ont toutes :

1. **100 % d'images réelles, en action.** Un chantier filmé, des mains qui posent, coupent, versent. Jamais une photo
   fixe, jamais une animation. Le geste est déjà en cours à la première image (un coup de maillet, un bloc posé).
2. **Une accroche dite à 0,00 s**, toujours un défi chiffré ou une promesse de secret : « Une maison montée sans vis, sans
   clou, sans artisan pour moins de 5 000 euros ? », « Il a eu une idée de génie pour ne plus jamais avoir à surveiller son
   barbecue », « En Russie, certaines familles ne paient que 50 euros d'électricité… », « Personne ne parle de cette
   solution, pourtant… », « Pourquoi personne ne construit un four à pizza dans son salon ? ».
3. **Une voix off d'homme, la même partout**, rapide et dense : 3,1 à 3,9 mots par seconde, du premier au dernier
   instant, hauteur moyenne 134-144 Hz, intonation vivante (3,4 à 3,6 demi-tons de variation) ; récit à la 3ᵉ personne
   (« Ce gars… il commence par… ») qui finit en tutoiement.
4. **Une musique de fond basse** (les silences entre les mots restent 12 à 20 dB sous la voix : il y a une musique).
5. **Des sous-titres mot à mot** : 2 à 3 mots, MAJUSCULES, police grasse géométrique blanche, contour noir, **le mot dit
   en jaune**, au centre vers 70-75 % de la hauteur. Une pastille « Brico & Travaux + S'abonner » passe vers 5 s.
6. **Une coupe toutes les 1 à 2 s.**
7. **Une fin qui fait réagir** : « Tu donnes quelle note sur 10 à cette invention ? », « Révolution du logement ou belle
   promesse ? », « Abonne-toi pour… ».

Attention : ces posts sont des compilations de chantiers filmés par d'autres (maisons en kit anglaises, isolation
russe…). On garde la **grammaire**, jamais la matière : pour nos produits, les rushes viennent du fournisseur (§2).

La référence animation de Benj (@tonytuyisenge, « boss de fin de jeu avec Claude Code », 9 233 vues) n'est pas une
animation plein écran : c'est **un vrai ordinateur filmé dans une vraie pièce** (lumière bleue, reflets, clavier), dont
l'écran joue l'animation, et un texte TikTok sur pavé blanc en haut. Ce qui la rend réaliste, c'est la caméra dans un
lieu réel. Le style « keynote » du 07/10 a copié les effets et oublié ça. Pour un produit physique, l'équivalent est le
produit filmé en action. Les quatre analyses de `docs/connaissance-videos/` (ray_fu, milesreevesai, robbedoesecom)
sont des vidéos face caméra sur l'IA : elles confirment seulement la règle « une personne réelle / une scène réelle dès la
première image » et le sous-titre mot à mot ; rien à reprendre pour le montage produit.

## 2. Les images réelles : d'où elles viennent

- **CJ Dropshipping** : l'API `product/query` (avec `features=enable_video`) donne les identifiants des vidéos d'un
  produit, et `POST product/queryVideosByProductId` (doc CJ 6.1) donne l'adresse, la durée et la licence
  (`isFree = 1`, `copyrightBuyType = 1` : vidéo gratuite pour les revendeurs). Téléchargement avec l'en-tête
  `Referer: https://developers.cjdropshipping.com/` (exigé par la doc). `node v2/rushes.mjs --chercher <pid>` liste les
  vidéos d'un produit ; `node v2/rushes.mjs` rapatrie et vérifie l'empreinte de chaque rush de `provenance.json`.
- **Aspirateur** : la fiche vendue (pid 2039611415532191746) n'a **aucune** vidéo ; sa fiche jumelle chez un autre
  fournisseur CJ (pid 2082406046851715074, même titre, même aspirateur vu à l'image) en a **deux, gratuites** : 20 s et
  55 s de démonstrations réelles (voiture, porte-gobelet, siège, canapé, souffle). Plages écartées : la boîte du
  fournisseur (le colis livré peut différer) et le gonflage / la mise sous vide (absents de la fiche vendue). Le rush 1 a
  un bandeau rouge et des sous-titres anglais incrustés : seul le cadre utile entre eux est utilisé ; le rush 2 a des
  bandes floues de remplissage : cadre utile mesuré (lignes nettes 96-864).
- **Nettoyeur** : **aucune vidéo réelle prouvée du même pistolet à ce jour.** La fiche AliExpress vendue n'a pas de vidéo
  dans sa galerie ; chez CJ, les deux candidats ont des vidéos d'AUTRES machines (pistolet blanc MDHL ; compilation de
  plusieurs modèles avec de faux slogans) : refusés. Les autres annonces AliExpress du même pistolet n'ont pas pu être
  ouvertes (vérification « robot » hors du Chrome connecté, jamais contournée ; onglets du Chrome connecté gelés par une
  autre session). Les deux vidéos du nettoyeur sont donc faites des **illustrations du fournisseur** et le juge les
  **refuse au critère R1** : elles ne sont pas publiables en l'état. Remède, par ordre de valeur : (1) Benj filme le
  pistolet reçu, 3 × 5 s au téléphone (seau, jet sur une dalle sale, voiture) ; (2) reprendre dans le Chrome connecté les
  annonces 1005007709740110, 1005013028043183, 1005013028561266, 1005013138630877 (vidéo de galerie, même écran rond
  « Z »).
- **Jamais** une vidéo d'un créateur TikTok / YouTube tiers.

## 3. La voix

Comparées le 07/10 sur la même phrase (« Personne ne lave sa voiture comme ça. Pas de prise, pas de robinet : le tuyau
plonge dans un seau, et ça part. »), transcription faster-whisper et mesure de l'intonation :

| Voix | Gratuite | Licence commerciale | Transcription | Intonation |
|---|---|---|---|---|
| Kokoro ff_siwis (v1) | oui | Apache-2.0 | correcte | 2,4 demi-tons (plate) ; refusée par Benj |
| Piper fr_FR-siwis / tom | oui | CC-BY 4.0 / AGPLv3 | « ça » lu « Attilda » | 2,5-2,9 (robotique) |
| Edge neural fr-FR-Remy / Henri / Vivienne | oui (non officiel) | **non prouvée** : service de lecture d'Edge, usage personnel | parfaite | Remy 4,2 (la plus proche des anciens posts) |
| Azure Speech, même voix Remy (offre gratuite F0) | oui | oui (conditions Azure) | parfaite | 4,2 |
| ElevenLabs (connecté) | crédits | **non** sans offre payante | — | — |
| Alexya | crédits d'essai | non prouvée (question « unauthorised advertising » jamais répondue) | — | — |
| XTTS v2 | oui | **non** (licence non commerciale de Coqui) | — | — |
| Fish Audio | non | forfait payant exigé (garde `lib/studio/voixFish.ts`) | — | — |
| Voix de synthèse de l'appli TikTok | oui | oui, pour une publication sur TikTok | — | — |

Aucune voix gratuite, naturelle ET à licence prouvée n'est utilisable par la chaîne automatique aujourd'hui. Les vidéos
v2 sont donc livrées **sans voix off**, avec des sous-titres forts et la musique ; la voix se pose au dépôt :

- **Dans l'appli TikTok** (gratuit, licence TikTok) : à la publication, `Texte` → taper la phrase → toucher le texte →
  `Synthèse vocale` → choisir une voix française masculine → réduire la durée du texte à l'instant voulu (ou le poser
  hors cadre) ; puis `Sons` → baisser « Son d'origine » si la musique couvre la voix.
- **Ou Azure Speech gratuit** (un geste de Benj : créer une ressource Speech F0, clé dans `presti-secrets`) : la voix
  fr-FR-RemyMultilingualNeural devient légale et la chaîne pourra la poser automatiquement. Les échantillons d'écoute
  (non publiables, même phrase pour chaque voix) sont dans `sorties/v2/echantillons-voix/`.

## 4. La musique

Seulement **TikTok Studio > Sons libres de droits** (`is_commerce_music` vrai, `commercial_right_type` 2), relevés le
07/10 par l'API de la page (`POST /tiktok/v1/creator/music/unlimited/search/list/?aid=1988`), preuves dans
`musique/preuves/`, temps forts = le fichier `beats_tracker` de la réponse (millisecondes). Cinq pistes au manifeste,
une par vidéo : « I'll Never Let You Go » (100 M d'utilisations, 96 BPM), « Sunrise » (22 M), « Future » (12 M,
120 BPM), « Ready » (8,3 M, 140 BPM), « Give it to me like » (3,7 M, funk, 100 BPM). Le départ de chaque vidéo est
pris sur un temps fort de la partie la plus forte de la piste (énergie mesurée seconde par seconde). Chaque coupe tombe
sur un temps fort.

Piège rencontré : le profil Chrome par défaut **demande où enregistrer chaque téléchargement** ; un téléchargement
déclenché par script ouvre une boîte « Enregistrer sous » invisible qui bloque Chrome. Ne jamais déclencher de
téléchargement depuis une page : lire l'adresse (`play_url`, `beats_tracker`) et télécharger avec `curl` (ces adresses
`/obj/` n'ont pas de jeton).

## 5. Quatre vidéos, quatre structures

| Fiche | Produit | Structure | Accroche (1ʳᵉ image) | Texte | Musique |
|---|---|---|---|---|---|
| a1-test-voiture | aspirateur | test réel : un endroit sale par plan | les débris disparaissent dans le bac + « REGARDE LES MIETTES » | Poppins ExtraBold, mot à mot, mot en jaune (le style des anciens posts) | Ready, 140 BPM |
| a2-avant-apres | aspirateur | quatre manches AVANT (image figée qui avance) / APRÈS (geste réel) | canapé couvert de miettes, étiquette rouge AVANT + « UN CANAPÉ PLEIN DE MIETTES ? » | Archivo Black noir sur pavé blanc + étiquettes Anton | Future, 120 BPM |
| n1-sans-prise | nettoyeur | choc : un mot énorme par temps fort, éclair à chaque coupe | « PAS DE PRISE. » sur le tuyau plongé dans l'eau | Anton 190 px au centre | I'll Never Let You Go |
| n2-dans-le-colis | nettoyeur | inventaire coché du colis, puis trois usages | le pistolet claque sur fond jaune + « TOUT CE QU'IL Y A DANS LE COLIS » | Archivo Black, liste cochée qui reste | Give it to me like, funk |

Règles d'écriture (vérifiées par le monteur ET le juge) : aucun chiffre (nombres en lettres), rien qui ne soit dans le
colis, aucun « … aussi » après une phrase sur le colis, aucun lieu d'usage dans une phrase sur le colis (la voiture
n'est jamais « fournie »), un appel final « lien dans la bio » tenu jusqu'à la dernière image.

## 6. Le juge v2

`node promo-src/tiktok-chaine/v2/juge.mjs` regarde et écoute chaque vidéo : R1 images réelles prouvées à l'image (≥ 50 %
de la durée), R2 accroche (texte dès 0,05 s, mouvement dans la 1ʳᵉ seconde, son dès 0,5 s), R3 musique au manifeste et
entendue, R4 lot structurellement différent, R5 honnêteté du texte, R6 12-20 s, R7 -14 LUFS, R8 rien de figé > 0,8 s,
R9 appel final. `--sabotages` fabrique douze cas cassés (plans déclarés réels qui ne le sont pas, vidéo de photos, texte à
1,5 s, tête figée, autre musique, piste inconnue, « Deux batteries fournies / Et la voiture aussi », un chiffre, 25 s,
-24 LUFS, 1,2 s figée, pas d'appel) plus un lot de deux vidéos identiques : chacun doit être refusé.
Contrôle de durée en plus (R6) : la durée livrée doit égaler le montage prévu à 0,12 s près, sinon des images ont été
perdues et les coupes ne tombent plus sur les temps forts.

Résultat du 07/10 : **a1 et a2 BONNES** (100 % d'images réelles prouvées, texte à 0 s, musique reconnue, -14,1 / -14,3
LUFS) ; **n1 et n2 REFUSÉES au seul critère R1** (photos du fournisseur, aucune vidéo réelle du pistolet) ; lot :
structures différentes ; sabotages : 13 sur 13 refusés. Écoute faster-whisper des quatre vidéos : aucune parole (la
transcription rend l'hallucination connue « Sous-titres réalisés par la communauté d'Amara.org » sur une musique seule).

Deux pièges de montage trouvés par R1 (l'image livrée ne ressemblait pas au rush déclaré) :
- `scale … eval=frame` puis `crop` pour zoomer change la taille des images en cours de flux : le cadrage dérive.
  Remède : `zoompan` image par image (`d=1`, t = numéro d'image / 30).
- `zoompan` rend une image par image reçue : le passage à 30 i/s doit se faire APRÈS le changement de vitesse
  (`setpts`), sinon le ralenti et l'accéléré disparaissent et la vidéo perd des images (16,07 s au lieu de 16,27 s).
- Les instants lus sur une planche à 2 i/s sont en avance d'environ 0,3 s sur le changement de plan réel : vérifier
  chaque début de plan à l'image (une image de sachet sous vide, plage écartée, passait au début d'un plan).

## 7. Ce qui reste à faire avant de publier

1. Benj regarde les quatre vidéos (rien n'est publié par la chaîne).
2. Nettoyeur : de vraies images (§2), puis refaire n1 et n2 avec les mêmes fiches (les plans « photo » deviennent des
   plans « rush »).
3. La voix (§3) : appli TikTok au dépôt, ou une clé Azure Speech gratuite.
