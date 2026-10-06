# Refonte de la vitrine : plan priorisé (06/10/2026)

Mesures prises sur le serveur de développement local (`next dev --webpack`, dossier `.next-dev-0610`), le 06/10 vers 19 h.
Les captures Playwright sont en 390 × 844 et 1440 × 900, après un défilement complet pour déclencher les apparitions.
`docs/refonte/audit/AUDIT.md` n'est repris que là où le code le confirme (voir §3).

## 1. Mesures de départ (avant la vague 1)

| Mesure | 390 px | 1440 px |
|---|---|---|
| Hauteur totale de la page | 11 154 px | 8 564 px |
| Section Tarifs | 5 164 px (46 % de la page) | 3 021 px |
| ↳ explication des crédits, placée avant les prix | 529 px | — |
| ↳ comparatif « qui a quoi », toujours ouvert | 1 503 px | — |
| Premier prix visible | ≈ 6 140 px (sous les crédits et l'essai) | — |
| Prix mentionné dans le haut de page | non | non |
| Défilement horizontal | aucun (390 px) | aucun |
| Erreurs de console | 0 | 0 |
| Appel « Essayer gratuitement » du haut | à 537 px, au-dessus de la ligne de flottaison | visible |

Freins relevés, chacun avec son fichier :

1. **La promesse ne dit pas d'où viennent les demandes** (`app/page.tsx`, texte d'introduction). « Chaque demande arrive dans
   Presti » ne dit pas comment. La réponse existait déjà dans la FAQ (`lib/faq.ts:3` : un lien à coller sur Le Bon Coin, Google,
   Facebook…), mais pas sur la landing.
2. **Le prix est invisible avant la moitié de la page** (mesure ci-dessus). Le haut de page dit « 3 crédits offerts », sans
   jamais dire ce qui suit.
3. **Une fonctionnalité livrée manque à la vitrine** : le tableau de bord `/chiffres` (commit `18b474b2`, déjà sur `origin/main`).
   La règle de la maison est enfreinte : `docs/produit/tableau-de-bord-artisan.md`, « À ajouter à la vitrine ».
4. **Le balisage FAQPage décrit 8 questions qui n'apparaissent pas à l'écran** (`app/page.tsx`, JSON-LD `FAQ.slice(0, 8)`, aucune
   FAQ visible). Google exige que le contenu balisé soit visible. Les objections d'avant l'essai n'ont pas non plus de réponse sur
   la page.
5. **L'appel final répète mot pour mot l'introduction** (même phrase dans le texte d'introduction, le JSON-LD et l'appel final).
   Il ne donne aucune raison nouvelle de cliquer.
6. **Aucune preuve sociale**, car aucun client ne peut être cité (`SaaS/Récap-Projet.md:114`). On n'invente rien : la preuve est
   le produit montré tel quel (scènes réelles, site Lestraque, tableau de bord).
7. **Pas de formulaire d'entrée** pour l'artisan qui ne veut pas créer de compte. `prospectsEntrant: false`, `lib/flags.ts:117`.

## 2. Vague 1 : faite le 06/10

| # | Changement | Fichier | Avant → après (mesure) |
|---|---|---|---|
| 1 | Promesse concrète : d'où viennent les demandes, puis devis, facture, relances | `app/page.tsx` (texte d'introduction) | « Chaque demande arrive dans Presti… » → « Votre lien sur Google, Le Bon Coin ou Facebook : chaque demande arrive… Puis le devis sur vos prix, la facture, et trois relances » |
| 2 | Prix d'appel dans le haut de page, lu dans la grille | `app/page.tsx` (`PRIX_MIN`, tiré de `OFFRES`) | « 3 crédits offerts · sans carte bancaire » → « … · ensuite dès 29 € par mois, sans engagement » |
| 3 | Section « Vos chiffres, sans tableur » : le vrai composant `Tableau`, nourri par le vrai `calculer()`, sur un artisan fictif. Écran inerte, données déclarées inventées, résumé pour les lecteurs d'écran | `app/DemoChiffres.tsx`, `lib/tableau-de-bord/exemple.ts`, `app/globals.css` (`.lp-chiffres*`) | absente → section de 1 323 px (bureau) et 1 149 px (390 px), coupée en fondu |
| 4 | Tarifs : les prix d'abord, l'essai et les crédits ensuite, le comparatif replié dans un `<details>` | `app/page.tsx`, `app/globals.css` (`.lp-cmp-pli`) | section Tarifs : 5 164 → 3 727 px en 390 px, 3 021 → 2 030 px en bureau |
| 5 | Questions visibles : les 8 mêmes que le balisage FAQPage, en accordéon, et un lien vers `/faq` | `app/page.tsx`, `app/globals.css` (`.lp-faq`) | balisage sans contenu visible → contenu visible et identique |
| 6 | Appel final : une raison de cliquer, pas une répétition | `app/page.tsx` | phrase de l'introduction → « 3 réponses ou devis offerts, sur vos vraies demandes, sans carte bancaire… » |

Après la vague 1, la page fait 11 928 px en 390 px et 9 981 px en bureau, avec deux sections ajoutées. Aucune erreur de console
et aucun défilement horizontal dans les deux largeurs. Le typecheck est vert. `node scripts/promesses-qa.mjs` passe de PR-2 à PR-12,
et sa règle PR-7 couvre les nouveaux fichiers de la landing (`DemoChiffres.tsx`, `chiffres/Tableau.tsx`). PR-1 est rouge, mais
sur `lib/crieur/faits.ts:15`, un fichier que cette vague ne touche pas (inchangé depuis le 29/09).

Choix assumé : la scène « Vos chiffres » n'est **pas une capture** (`scripts/demo-captures.mjs`). Une capture aurait exigé de
semer des factures sur un compte de démonstration en production. Ici, c'est le composant livré lui-même, nourri par le calcul livré.
Il ne peut pas diverger de l'écran réel, et rien n'est écrit en base.

## 3. Ce que l'audit Antigravity (non fiable) dit, et ce qu'on en garde

- Rejeté : « GSAP synchrone, bloquant ». Il est chargé par `import()` dynamique (`app/Motion.tsx`).
- Rejeté : « toutes les images chargées d'un coup ». Seule la première scène est en `eager` (`app/DemoSequence.tsx`).
- Gardé : il n'y a pas de formulaire d'entrée. C'est confirmé par `lib/flags.ts:117` (vague 2, point 1).
- Non vérifié : le poids « 70 Ko » du moteur d'animation, et le jugement esthétique du haut de page.

## 4. Vague 2 : faite le 06/10 (soir)

### 4.1 Vitesse réelle de prestiapp.fr (Lighthouse 12, local, sur l'URL de production)

Script : `node lh.mjs https://prestiapp.fr/ <dossier> 3` (Lighthouse en module, Chromium de Playwright, catégorie performance
seule). Mobile = réglages par défaut (simulation 4G lente, processeur ×4, 412 × 823). Bureau = `formFactor: desktop`, 1350 × 940,
débit 10 Mbit/s, processeur ×1. Trois passes, médiane. **La machine de mesure était chargée** (autres sessions, usine) : le TBT varie
du simple au double d'une passe à l'autre (1 321 à 2 920 ms en mobile), il faut lire les médianes comme un ordre de grandeur.

| Médiane de 3 passes | Mobile, avant | Mobile, après | Bureau, avant | Bureau, après |
|---|---|---|---|---|
| Score performance | 57 | 54 | 82 | 96 |
| FCP | 1,39 s | 1,40 s | 0,67 s | 0,67 s |
| LCP | 3,93 s | 3,74 s | 1,07 s | 0,88 s |
| TBT | 2 469 ms | 4 011 ms | 293 ms | 135 ms |
| CLS | 0 | 0 | 0 | 0 |
| Speed Index | 4,05 s | 5,87 s | 1,60 s | 1,41 s |
| Poids transféré | 476 Ko, 26 requêtes | 426 Ko, 25 requêtes | 503 Ko, 29 requêtes | 452 Ko, 28 requêtes |

« Après » = commit `55ca6f0`, en ligne, mesuré à 20 h 40. Lecture honnête :

- **Bureau : 82 → 96**, LCP 1,07 → 0,88 s, TBT 293 → 135 ms (deux passes sur trois à 96-97 ; la première, à 57, est une passe
  bruitée de la machine).
- **Mobile : pas de conclusion sur le score.** Le TBT des trois passes « après » va de 3 023 à 6 351 ms, et sur les mêmes scripts
  l'évaluation JavaScript passe de 1,8 à 4,0 s d'une passe à l'autre : c'est la charge de la machine, pas la page. Ce qui ne dépend
  pas du bruit a bougé dans le bon sens : **animations non composées 7 → 0**, poids 476 → 426 Ko (−50 Ko, l'affiche), 26 → 25
  requêtes, LCP médian 3,93 → 3,74 s, délai de rendu du LCP 1 538-2 740 ms → 1 066-1 839 ms. Le plus grand élément est maintenant
  le titre (`h1`), plus l'introduction.
- **Reste lourd en mobile : 4 à 5 s de styles et mise en page** sur le fil principal, avant comme après. Ce n'était donc pas la barre
  de progression ; la cause n'est pas identifiée (voir §5.5).

Ce que la trace disait (mobile, avant) :

- **Le LCP est le texte d'introduction** (`p.lp-lede`), avec 1,9 s de « délai de rendu » : il entrait à opacité 0 avec un flou de
  7 px (`@keyframes lp-in`), et Chrome ne le compte peint qu'à la fin de l'entrée. Le flou (`filter`) n'est pas composé : il
  repeignait les six éléments du haut de page à chaque image.
- **10,3 s de travail sur le fil principal, dont 4,4 s de styles et mise en page.** Lighthouse signale 7 animations non composées ;
  la plus coûteuse est la barre de progression de la démo (`.dm-prog`), qui animait `width` en boucle (4,8 s par scène) et relançait
  la mise en page à chaque image tant que la page était ouverte.
- **L'affiche de la démo Lestraque** (53 Ko, 1 280 × 720 pour un cadre de 364 px) partait dès le chargement, en même temps que les
  polices : un attribut `poster` ne se charge pas paresseusement.
- Écartés : polices (3 fichiers woff2, `font-display` correct, score 1), JS inutilisé (score 1), CLS (0). Le reste du coût de script
  est le socle de Next/React (deux morceaux de 63 et 65 Ko), qu'on ne réduit pas sans toucher à l'architecture.

Corrigé (trois causes, sûres, sans changement de contenu) :

| # | Correction | Fichier | Avant → après |
|---|---|---|---|
| 1 | Entrée du haut de page sans flou ; titre et introduction peints dès la première image (montée seule, sans fondu) | `app/globals.css` (`lp-in`, `lp-in-texte`) | opacité 0 + `blur(7px)` pendant ≈ 1 s → opacité 1 au premier rendu, `filter: none` (vérifié au DOM prêt) |
| 2 | Barre de progression de la démo par `transform: scaleX()` | `app/globals.css` (`.dm-prog`) | `width` 0 → 100 % (mise en page à chaque image) → `scaleX(0 → 1)`, composé ; progression vérifiée échantillon par échantillon (6 → 56 px, retour à 6 à la scène suivante) |
| 3 | Affiche de la démo posée à 800 px de son bloc | `app/DemoSite.tsx` | demandée au chargement → aucune requête au chargement, `poster` posé à l'approche (vérifié : 0 requête, puis 1) |

### 4.2 Rangée « Pour qui » (`app/page.tsx`, `POUR_QUI` ; `app/globals.css`, `.lp-pq*`)

Section `#pour-qui`, entre la preuve « 7× » et la démo. Quatre cartes, une par métier de la cible (§1 de la stratégie) :
le métier, une **demande type** citée (l'en-tête dit « écrites pour l'exemple, pas des clients »), puis la situation que Presti règle.
Aucun chiffre ; aucun mot d'escalade (`escalade_mots`), donc PR-7 reste vert ; aucune promesse d'envoi seul (PR-4 vert). La phrase des
relances dit ce que fait le code : elles sont planifiées quand l'artisan envoie sa réponse (`app/api/messages/route.ts:99`,
`lib/relances.ts:35`). Hauteur : 753 px en bureau (4 colonnes), 1 231 px en 390 px (une colonne).

### 4.3 Haut de page en 390 px

Deux versions de la même promesse : une courte sous 640 px, la longue (vague 1) au-delà ; marges du haut de page resserrées sous 640 px.

| 390 × 844 | Avant (production) | Après (production, 55ca6f0) |
|---|---|---|
| Texte d'introduction | 6 lignes, 161 px | 2 lignes, 54 px (« Chaque demande Google ou Le Bon Coin a sa réponse prête : vous l'envoyez. ») |
| Bas du bouton « Essayer gratuitement » | 624 px | 478 px |
| Haut de la scène produit | ≈ 822 px (sous la ligne de flottaison) | 672 px (visible sans défiler) |
| Défilement horizontal / console | aucun / 0 erreur | aucun / 0 erreur ni avertissement (390 et 1440 px) |

La promesse courte tient en 2 lignes de 360 à 414 px (mesuré à 360, 375, 390 et 414). Elle ne nomme plus Facebook : à 3 sources,
elle passait à 3 lignes.

### 4.4 Type de chantier rempli automatiquement (`lib/qualification.ts`, juge `scripts/qualification-qa.mjs`)

**Ce que la base dit vraiment (relevé du 06/10).** « 6 demandes sur 88 ont un type » est exact mais trompeur : **76 des 88 n'ont plus
d'`artisan_id`** (demandes détachées de tout compte, la plupart « Un escalier en chêne » semées par `scripts/devis-conversation-e2e.mjs`)
et ne s'affichent chez aucun artisan. Sur les **12 demandes rattachées, 6 avaient un type.** Les 6 autres : une demande antérieure à
la qualification (01/09), des demandes semées en base sans passer par la route, et des mots manquants (« mitigeur », « vitre »,
« bibliothèque »). Et un défaut : la clé `electric` ne prenait pas « électrique » (q, pas c).

La qualification existait déjà dans la route du formulaire (`app/api/leads/route.ts`, `qualifyLead`) ; **la relève des boîtes email
(`lib/releveCanal.ts`) ne l'appelait pas** : toute demande arrivée par email restait sans type.

Fait, sans migration ni IA :

- `lib/qualification.ts` : le type de chantier sort de `lib/ai.ts` dans un module sans import (`normalize`, `has`, `TYPE_CHANTIER`,
  `typeChantier`) ; `lib/ai.ts` l'importe, `qualifyLead` lui délègue (une seule liste de mots). Ajouts : vocabulaire des quatre
  métiers de la cible, « électrique », une famille Vitrerie, et des **tournures neutres** effacées avant la recherche (« prise en
  charge », « ma demande porte sur », « couverture décennale »…), qui donnaient de faux types.
- `lib/releveCanal.ts` : l'insert d'une demande email écrit `type_chantier: typeChantier(message, metier)` (métier lu une fois).
- Juge `node scripts/qualification-qa.mjs` (inscrit au lanceur `tout-verifier.mjs`) : 6 critères (8 cas réels de production sans nom
  ni contact, 12 cas des quatre métiers, priorités, 12 pièges, repli sur le métier, câblage formulaire + email), 9 sabotages tous vus.

**La ville n'est pas faite : elle exige une migration** (voir §5).

## 5. Reste

1. **La ville de la demande** (plan, non commencé). `leads` n'a pas de colonne `ville` ; `/chiffres` lit `clients.ville`, table vide.
   - Migration : `alter table public.leads add column if not exists ville text`, bornée comme `artisans_ville_borne` (0058 :
     80 signes) ; aucune politique RLS nouvelle (la colonne hérite de celles de `leads`). Jumeau à coller, et essai à sec.
   - Extraction dans `lib/qualification.ts` (`villeDe(message)`) : un code postal à 5 chiffres suivi d'un nom ; ou « à / sur / vers /
     secteur de / commune de » suivi d'un nom **présent dans une liste fermée de communes** (17, 85, 79 d'abord, Code officiel
     géographique de l'INSEE). Sans liste, « à Noël », « à Pâques », « à domicile » deviennent des villes.
   - Écriture : les deux inserts (`app/api/leads/route.ts`, `lib/releveCanal.ts`). Lecture : `/chiffres` (bloc « Villes »).
   - Juge : un critère QU-7 et ses sabotages dans `scripts/qualification-qa.mjs`.
2. **Formulaire d'entrée** « laissez votre numéro » : lever `prospectsEntrant` (`lib/flags.ts`), écrire la route et le juge.
3. **Capture réelle de `/chiffres`** dans `scripts/demo-captures.mjs`, si Benj préfère une 6ᵉ scène à la section actuelle.
4. **Lien « Vos chiffres » dans la navigation publique** (`app/PublicNav.tsx`), si la section convertit (onglet Visiteurs).
5. **Vitesse mobile, au-delà de cette vague** : 4 à 5 s de « styles et mise en page » sur le fil principal, cause non identifiée
   (pistes : la scène du héros et ses boucles `lp-float` / `lp-pulse`, les changements de scène de la démo, la taille des règles CSS de
   `globals.css`, 2 900 lignes chargées sur toutes les pages). Il faut une trace Performance sur une machine calme avant de corriger.
6. **Hors landing, signalé** : `promesses-qa` toujours rouge sur PR-1 (`lib/crieur/faits.ts:15`), fichier non touché.

## 6. Décisions qui reviennent à Benj

1. Lever `prospectsEntrant` (formulaire d'entrée de la vitrine).
2. Poser la migration `leads.ville` du §5.1 — et choisir ce que montre le bloc « Villes » de `/chiffres` : les villes des clients
   (aujourd'hui, table vide) ou celles des demandes.
3. Les 76 demandes sans `artisan_id` : les garder ou les purger (suppression en production). Le chiffre « 6 sur 88 » de la stratégie
   (§6.3) est à lire « 6 sur 12 rattachées ».
4. Requalifier ou non les 6 demandes rattachées restées sans type (écriture en production, non faite).
5. La place de la rangée « Pour qui » (entre la preuve et la démo), qui ajoute une étape avant la démo dans l'ordre du §5 de la
   stratégie ; et la promesse courte du mobile, qui ne nomme plus Facebook.
