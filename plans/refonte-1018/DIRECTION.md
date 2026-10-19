# Refonte 18/10 — Étape 3 : deux pistes de direction artistique, et une recommandation

Les deux pistes partagent **la même architecture** (`ARCHITECTURE.md`) et **les mêmes jetons** (`app/base.css` pour la
console, `.lp` pour la landing : sombre, corail `#D97757`, Bricolage Grotesque / Hanken Grotesk / JetBrains Mono, **aucun bleu
ni violet**). Elles ne diffèrent que par le caractère. Données affichées : fictives, marquées « Données d'exemple » / « Exemple ».

## Où les voir

Maquettes HTML statiques (Figma indisponible, voir §5), dans `C:\Users\benja\Documents\presti-ops\refonte-1018\pistes\` :

| Écran | Fichier (ouvrir avec `?p=a` ou `?p=b`) | Planche A \| B 1440 | Planche A \| B 390 |
|---|---|---|---|
| Accueil de la console « Aujourd'hui » | `accueil.html` | `planche-accueil-1440.png` | `planche-accueil-390.png` |
| Liste Devis | `devis.html` | `planche-devis-1440.png` | `planche-devis-390.png` |
| Fiche d'un devis envoyé | `fiche.html` | `planche-fiche-1440.png` | `planche-fiche-390.png` |
| Haut de la landing (héros + « Comment ça marche ») | `landing.html` | `planche-landing-1440.png` | `planche-landing-390.png` |

Captures unitaires : `pistes\captures\<écran>-<a|b>-<1440|390>.png` (16 images). Structure commune : `commun.css` + `coque.js` ;
caractère : `piste-a.css`, `piste-b.css`. Relancer : `node scripts/refonte-pistes-captures.mjs`.

Contrôle mécanique des 16 captures (`pistes\captures\rapport.json`) : **0 violation de contraste axe-core (WCAG AA)**, **0 px
de défilement de côté** en 390. Encre sur le corail : `#1A0F0A` (6,0:1) — le blanc sur corail (3,1:1, défaut actuel de « Lire
la vidéo ») n'est utilisé nulle part.

## 1. Piste A — « Instrument »

L'outil d'un artisan qui mesure : **papier millimétré** en fond (grille de 24 px à 2,8 % de blanc, plus de jeton bleuté),
arêtes nettes (rayons 7-8 px), aucune ombre portée, chiffres et en-têtes de tableau en JetBrains Mono, lignes de 48 px.
Une seule lueur : le liseré corail au survol et au focus.

**Signature : la règle graduée** (le mètre de chantier). Elle porte toute progression : le mois en cours au-dessus des
chiffres (31 graduations, aujourd'hui marqué), la progression des 4 slides de « Comment ça marche » (4 graduations majeures).

Priorités du jour en rangée d'instruments, un liseré par nature d'urgence (corail : à répondre, ambre : à relancer, rouge :
en retard). Barre d'état encadrée comme un afficheur : synchronisation · crédits.

## 2. Piste B — « Cinéma »

La profondeur des vidéos de référence : **verre dépoli** (`backdrop-filter` 18 px), plans superposés, rayons 18-28 px,
grands titres Bricolage 700, chiffres des priorités en dégradé corail, démo du héros inclinée en perspective.

**Signature : l'aube.** La nuit de 22 h 14 devient le matin de 7 h 52 : un horizon corail chaud éclaire le haut de chaque
écran de la console et le bas de la scène « Comment ça marche », et monte avec les étapes. La nuit est un noir chaud, jamais
un bleu.

## 3. Le gril (les objections que je me suis faites, et mes réponses)

| Objection | Réponse |
|---|---|
| « A est austère : Benj a demandé plus *technologique* et *plus agréable à l'œil*, pas un tableur. » | Juste pour la landing, faux pour la console : ce qui fait « technologique » dans Linear ou Vercel, c'est la densité maîtrisée, les chiffres en mono, la grille fine, les raccourcis affichés, Ctrl+K, la barre d'état — tout ce que A porte. Les 52 styles de bouton et 46 tailles de titre de l'audit sont le vrai problème d'œil, pas le manque d'effets. |
| « B ressemble aux vidéos que Benj aime (Scalyx, Trois Coups). » | Oui, et c'est pour ça que B doit vivre là où on **regarde** : la landing, le panneau « Découvrir », la visite guidée. Ses retours sur les films (« copier le rendu Scalyx : fond nu, titres géants, objet clair », 13/10) valent pour une vitrine, pas pour l'écran où il refait un devis à 7 h du matin. |
| « Le verre coûte cher. » | Mesuré : la landing fait déjà TBT 950 ms (ordinateur) à 2 900 ms (mobile, machine chargée). `backdrop-filter` sur 10-20 cartes par écran de console, sur un Android d'entrée de gamme dans une camionnette, c'est des images perdues à chaque défilement. Dans la console, B multiplie les couches flou ; A n'en a qu'une (l'en-tête). |
| « Le verre rend les contrastes imprévisibles. » | Les 8 maquettes B passent axe aujourd'hui, mais sur un fond fixe ; avec du contenu réel derrière le verre (listes longues, cartes CRM), le fond effectif varie — c'est exactement la famille des 204 textes « non calculables » de la landing actuelle. A garantit le contraste par construction. |
| « A ne met pas assez les fonctionnalités en avant. » | La mise en avant vient de l'architecture (accueil à 3 actions, compteurs dans le menu, panneau « Découvrir », visite en slides), pas de l'habillage. Et le panneau « Découvrir » peut emprunter l'aube de B sans rien coûter ailleurs. |
| « Deux caractères = deux produits. » | Non si les jetons sont les mêmes (corail, trois polices, mêmes pastilles de statut, même bouton principal) : Stripe et Linear ont une vitrine plus cinématographique que leur tableau de bord, et on les reconnaît partout. La règle est écrite : une surface de travail est A, une surface de présentation est B. |

## 4. Recommandation

**Une direction : « Instrument éclairé à l'aube » — A partout où l'artisan travaille, l'aube de B là où il découvre.**

1. **Console : piste A**, entière (grille millimétrée, mono, lignes de 48 px, règle graduée, barre d'état, zéro ombre, une
   seule lueur au survol/focus). Seules exceptions, empruntées à B : l'**aube** en haut de l'accueil « Aujourd'hui » (un seul
   dégradé, pas de verre), le **panneau « Découvrir »** et la **visite guidée en slides**, qui sont des moments de
   présentation.
2. **Landing : piste B** (titres géants, démo en perspective, aube qui monte avec les 4 slides), mais **sans verre sur les
   cartes de texte** (fonds pleins, contraste garanti) et avec l'anneau WebGL actuel remplacé par l'aube en CSS (gain de TBT ;
   à mesurer).
3. Un seul système : les deux pistes tirent des mêmes jetons ; ce qui change entre surfaces est écrit dans `presti-design`
   (« travail = Instrument, vitrine = Cinéma ») au moment de l'étape 4.

En trois lignes : **la console devient un instrument (dense, net, chiffres en mono, Ctrl+K, règle graduée) ; la landing devient
un film (titres géants, aube corail qui monte de 22 h 14 à 7 h 52) ; les deux partagent les mêmes jetons, et seul le panneau
« Découvrir » et la visite guidée de la console reçoivent la lumière du film.**

Si Benj préfère une seule piste partout : **A**, pour la performance sur téléphone et le contraste garanti — B partout
coûterait sur l'écran le plus utilisé (la console, sur téléphone, en extérieur).

### Décision attendue de Benj (options numérotées)

1. **« Instrument éclairé à l'aube »** (recommandé) : console A, landing B, aube sur « Découvrir » et la visite.
2. **A partout** : le plus sûr pour la performance et l'accessibilité ; landing plus sobre.
3. **B partout** : le plus spectaculaire ; coût de performance à mesurer sur un vrai téléphone avant d'étendre au-delà de
   l'accueil.

Sans réponse au bout de 12 heures, le prompt prévoit de partir sur la recommandation (option 1), derrière les drapeaux
`consoleV2` / `landingV2` baissés : rien n'est irréversible.

## 5. Outils, connecteurs et skills (journal)

- **Figma** : connecteur joignable (`whoami` répond) mais le compte est sur le plan **Starter** avec un siège **« View »**
  (`team::1676702534400710805`). Selon la page des limites de Figma citée par l'outil
  (developers.figma.com/docs/figma-mcp-server/rate-limits-access), ce type de siège a un quota d'appels MCP de l'ordre de
  quelques appels par mois, très en dessous des 16 cadres à construire, et un siège Lecteur n'édite pas les fichiers de
  l'équipe. Je n'ai **pas** créé le fichier « Presti — Refonte 2026-10 » pour ne pas consommer ce quota pour rien : maquettes
  faites en **HTML statique**, capturées en PNG. Pour passer à Figma : un siège Full (ou Dev) sur l'équipe, puis
  `create_new_file` + `use_figma` à partir de ces HTML.
- **Skills utilisées** : `presti-design` (lue en entier : jetons, polices, interdits HUD/Jarvis, filet `.reveal-armed`) ;
  `frontend-design` (plan de jetons + signature par piste, critique avant construction : la démo du héros dupliquait celle
  des slides, remplacée par la notification + le devis) ; `emil-design-eng` (pas d'animation sur Ctrl+K, `scale(.97)` à
  l'appui, transitions 160-220 ms en `ease-out`, `prefers-reduced-motion` coupe tout mouvement).
- **Non utilisées, et pourquoi** : `motion-doctrine` (règles de montage HyperFrames pour la vidéo, pas pour une interface) ;
  `pick-ui-library`, `grill-me`, `to-spec`, `to-tickets`, `review-animations` (absentes de cette session ; le gril est fait à
  la main au §3) ; MotionSites (non authentifié dans cette session) ; Vercel et Supabase en écriture (hors périmètre de
  l'étape 3 : aucune branche, aucun déploiement, aucune migration).
