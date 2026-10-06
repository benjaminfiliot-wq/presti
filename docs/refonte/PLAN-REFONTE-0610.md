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

## 4. Vague 2 : priorisée, non faite

1. **Formulaire d'entrée** : « laissez votre numéro, on vous rappelle ». Il faut lever `prospectsEntrant` après décision de Benj,
   écrire la route et le juge. Effet attendu : capter les visiteurs qui ne créent pas de compte. Fichiers : `lib/flags.ts`, nouvelle
   route, `app/page.tsx`.
2. **Mesure Lighthouse sur la production après la vague 1.** LCP, CLS et poids de la page en 4G, qui ne peuvent pas être mesurés
   sur un serveur de développement. Les chiffres de vitesse de ce plan ne sont donc **pas mesurés**.
3. **Une rangée « pour qui »** avec les quatre métiers de la cible (`docs/presti/STRATEGIE-GLOBALE-0610.md` §1) et un exemple de
   demande par métier. Ce sont des demandes types, pas des clients.
4. **Haut de page en 390 px** : le texte d'introduction fait encore 5 lignes et la scène produit commence à 750 px. On peut tester
   une version plus courte du texte, ou placer la scène avant les boutons.
5. **Capture réelle de `/chiffres`** dans `scripts/demo-captures.mjs`, si Benj préfère une 6ᵉ scène dans `DemoSequence` à la section
   actuelle.
6. **Lien « Vos chiffres » dans la navigation publique** (`app/PublicNav.tsx`), si la section convertit, ce qui se mesure par
   l'onglet Visiteurs.
7. **Hors landing, signalé** : le juge `promesses-qa` est rouge sur PR-1 (`lib/crieur/faits.ts:15`, « Réponse en moins d'une
   minute »). Il faut corriger la phrase ou la règle.
