# Refonte 18/10 — Étape 1 : audit de l'existant (état « AVANT »)

Relevé le 18/10/2026 entre 22 h 40 et 23 h 45, **sur la production** (`prestiapp.fr`, `qg.prestiapp.fr`), commit déployé
`8ade943`. Aucune ligne de code applicatif touchée. Toutes les mesures sortent de scripts relançables :

| Script (lecture seule, sauf les comptes de test) | Sortie |
|---|---|
| `node scripts/refonte-avant-landing.mjs` | `presti-ops/refonte-1018/avant/landing/*.png`, `landing-mesures.json` |
| `node scripts/refonte-avant-console.mjs` | `presti-ops/refonte-1018/avant/console/*.png`, `console-mesures.json` |
| `node scripts/refonte-avant-css.mjs` (lit les fichiers **au commit HEAD**, pas l'arbre de travail du CRM en cours) | `presti-ops/refonte-1018/avant/css-mesures.json` |
| `node_modules/.bin/lighthouse` 13.4.1 | `presti-ops/refonte-1018/avant/lighthouse/` |

**Comptes de test** : deux comptes jetables (`refonte-rempli-…` et `refonte-vide-…@presti-test.invalid`, offre Signature,
données fictives « Exemple-… »), créés par l'API admin, **détruits dans le `finally`** par `purger_compte_test` puis table par
table ; relu après coup : 0 ligne `artisans`, 0 `auth.users` en `refonte-*`. Aucun e-mail envoyé, aucun appel IA, aucun clic
sur un bouton d'action. Aucune donnée réelle de client ou de prospect dans une capture.

> ⚠️ **`scripts/zero-demo-e2e.mjs` est ROUGE, mais pas à cause de ce chantier** (9 vérifications passées, 2 en échec) : il
> trouve **trois comptes `capture.direction.*@presti-test.invalid` créés le 04/10 et portant `is_founder`**, plus deux comptes
> de capture sans `est_demo`. Aucun compte `refonte-*` n'apparaît. Je ne les ai **pas** supprimés (comptes privilégiés créés par
> un autre chantier, suppression = décision de l'agent principal ou de Benj). À traiter vite : ce sont des comptes de test
> fondateurs en production, exactement l'incident du 07/09.

> ⚠️ **Conditions de mesure** : pendant l'audit, la machine faisait tourner en parallèle un `next build` et d'autres rendus
> (charge CPU ≈ 70 %, moins de 600 Mo de mémoire libre). Lighthouse l'a signalé lui-même (« slower CPU than Lighthouse
> expects »). Les scores d'accessibilité, de bonnes pratiques et de SEO ne dépendent pas de la charge ; **le score de
> performance, si** : il est donné à titre indicatif et doit être repris sur une machine au repos (ou PageSpeed Insights avec
> une clé : l'API sans clé a répondu « quota épuisé »).

---

## 1. Le site public

### 1.1 Landing (`/`)

| Mesure | 1440 px | 390 px |
|---|---|---|
| Sections de premier niveau | **15** | **15** |
| Hauteur de défilement | 23 113 px = **25,7 écrans** (de 900 px) | 29 143 px = **34,5 écrans** (de 844 px) |
| Liens d'appel « Essayer… » / vers `/signup` | **11** | **11** |
| … dont boutons principaux « Essayer gratuitement » | 4 (en-tête, héros, appel final, pied) | 4 |
| Échecs de contraste calculés (texte mesurable) | 4 sur 659 éléments | 4 sur 650 |
| Textes posés sur une image ou un dégradé (non calculables) | 204 | 197 |
| Défilement de côté | 0 px | 0 px |

Cible du chantier en 390 px : **− 40 %**, soit au plus **17 486 px (≈ 20,7 écrans)**.

Les 15 sections, dans l'ordre, avec leur poids en 390 px (`landing-mesures.json`) :

| # | Section | Hauteur 1440 | Hauteur 390 |
|---|---|---|---|
| 1 | Héros (`HeroApp` + étiquettes) | 1,41 écran | 1,22 |
| 2 | Bande de mots (`BandeMots`) | 0,50 | 0,20 |
| 3 | Réassurance (Rapide, Fiable, Sécurisé, Sans carte) | 0,31 | 0,50 |
| 4 | Preuve « 7× » (source HBR) | 0,46 | 0,55 |
| 5 | `#comment` La chaîne complète (4 cartes empilées) | 2,94 | 3,51 |
| 6 | `#fonctionnalites` 22 h 14 → 7 h 52 (`DemoSequence`, `DemoGestion`, `DemoSite` + site 300 €) | 3,28 | 3,58 |
| 7 | `#chiffres` (`DemoChiffres`) | 1,47 | 1,36 |
| 8 | `#compta` (`DemoCompta`) | 2,50 | 3,79 |
| 9 | `#pour-qui` (4 métiers) | 0,87 | 0,77 |
| 10 | `#confiance` (4 cartes) | 0,89 | 0,82 |
| 11 | `#tarifs` (3 offres, essai, crédits, tableau replié, site 300 €) | 3,81 | **7,71** |
| 12 | `#comparatif` (`ComparatifConcurrents`) | 3,56 | **5,96** |
| 13 | `#maquette` (formulaire) | 0,88 | 1,55 |
| 14 | `#questions` (8 questions) | 1,17 | 1,20 |
| 15 | Appel final | 0,85 | 0,67 |

À 390 px, **Tarifs + Comparatif = 13,7 écrans, 40 % de la page**. C'est là que se gagne la cible.

Les 4 contrastes en échec : `button.dg-lire` « Lire la vidéo » blanc sur corail **3,12:1** (×2, `#fonctionnalites`) ;
numéros de section `03` et `05` sur fond clair `#F0E0D5` **4,32:1** (`#compta`, `#confiance`).

**Lighthouse, landing** (machine chargée, voir l'avertissement) :

| | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Mobile | **42** (indicatif ; 83-85 relevé par Benj sur machine libre) — LCP 5,0 s, TBT 2 900 ms, CLS 0 | **99** | 100 | 100 |
| Ordinateur | **62** (indicatif) — LCP 1,2 s, TBT 950 ms, CLS 0 | **96** | 100 | 100 |

Accessibilité : `heading-order` (titres qui sautent un niveau) et `label-content-name-mismatch` (un nom accessible qui ne
reprend pas le texte visible) en échec. CLS à 0 : la page ne saute pas. Le temps de blocage (TBT 950 ms à 2 900 ms sous
charge) est le poste qui tire la performance : WebGL de l'anneau (`ObjetVivant`), GSAP, démos animées, tout chargé sur une
seule page. Rapports HTML complets : `lighthouse/accueil-mobile.report.html`, `accueil-desktop.report.html`.

### 1.2 Pages publiques annexes

| Page | État | 1440 | 390 |
|---|---|---|---|
| `/faq` | 200 | 1,8 écran | 2,8 |
| `/contact` | 200 | 1,7 | 2,7 |
| `/confidentialite` | 200 | 7,7 | 15,2 |
| `/mentions-legales` | 200 | 2,8 | 4,1 |
| `/cgu` | 200 | 10,7 | 20,1 |
| `/comparatif` | **404** (n'existe pas) | | |
| `/tarifs` | **c'est l'écran console « Mes tarifs »** (redirige vers `/login` sans session) | | |

**Conflit d'adresse à trancher** : le prompt prévoit une page publique `/tarifs`, mais `/tarifs` est déjà la page console
« Mes tarifs » de l'artisan (`app/tarifs/page.tsx`, `AppShell`). Voir `ARCHITECTURE.md` §2.3 (proposition : `/offres`).

---

## 2. La console

### 2.1 Menu

- **15 entrées** de menu (14 dans `NAV` + Centre d'aide) en **3 groupes** : « Pilotage » (**12 entrées**, dont Abonnement et
  Ma page), « Outils IA » (2), « Aide » (1). Plus 3 entrées dans le menu du compte (Paramètres, Abonnement & usage, Sécurité) :
  **« Abonnement » existe deux fois** (menu et menu du compte).
- En **1440 × 900**, la dernière entrée (**Centre d'aide**) est **cachée derrière la carte du compte** : on ne la voit qu'en
  faisant défiler la colonne (`console/rempli-dashboard-1440.png`, libellé « AIDE » sans entrée).
- Sur **téléphone**, le tiroir fait 823 px de contenu pour 844 px d'écran ; « Assistant de gestion » est coupé et
  « Centre d'aide » invisible sans défiler (`console/rempli-menu-ouvert-390.png`). **Aucune barre du bas.**
- **Pastilles d'offre trompeuses** : « Signature » s'affiche à côté de « CRM atelier » et « Assistant de gestion » **pour un
  compte déjà Signature** (l'entrée CRM n'a pas de `cap`, donc la pastille s'affiche toujours, `AppShell.tsx:38` et `:279`).
- **Ctrl+K : absent** de la console (testé : aucune palette ne s'ouvre ; elle n'existe que dans `/controle`).
- Après connexion, l'artisan atterrit sur **`/outils` (Réponses instantanées)**, pas sur le tableau de bord
  (`app/login/page.tsx:34`).

### 2.2 Les 6 tâches clés — nombre de clics (depuis l'écran d'arrivée, ordinateur, saisie non comptée)

Compté sur l'interface en production, d'après les boutons réellement présents (`console-mesures.json`, champ `actions`).

| Tâche | Chemin actuel | Clics | Chemin proposé (ARCHITECTURE.md) | Clics |
|---|---|---|---|---|
| Répondre à une demande | menu Messages → la conversation → « Envoyer » la réponse préparée | **3** | carte « 2 demandes à répondre » de l'accueil → conversation ouverte sur la réponse → Envoyer | **2** |
| Faire un devis | menu Devis → « Nouveau devis » → « Chiffrer avec l'IA » → « Enregistrer » | **4** | « Nouveau devis » (en-tête, ou Ctrl+K → « Créer un devis ») → Chiffrer → Enregistrer | **3** |
| L'envoyer | menu Devis → « Ouvrir » → « Envoyer au client » (+ confirmation éventuelle) | **3** | menu Devis → action de ligne « Envoyer » (brouillon relu) | **2** |
| Facturer | menu Devis → « Ouvrir » (devis accepté) → « Créer la facture » | **3** | menu Devis → action de ligne « Facturer » | **2** |
| Ajouter un matériau | menu Inventaire → champ rapide → « Ajouter » | **2** | identique (déjà bon), ou Ctrl+K → « Ajouter un matériau » | **2** |
| Voir ses chiffres | menu Mes chiffres | **1** | les chiffres du mois sont **sur l'accueil** (0 clic) ; détail : 1 | **0-1** |

Cible du prompt (« jamais plus qu'avant, au moins 3 tâches avec 1 clic de moins ») : atteinte sur le papier pour 5 tâches.

### 2.3 Pages capturées

26 vues du compte rempli et 9 du compte vide, chacune en 1440 et 390 px (`avant/console/`), plus la visite guidée (5 étapes),
le menu ouvert sur téléphone, le menu du compte, et une capture « 350 ms après navigation » de chaque page (état de chargement).

Hauteurs notables : **Factures 3,8 écrans en 1440 / 5,5 en 390**, Abonnement 5,5 / **11,4**, Ma page 3,6 / 5,9, fiche devis
2,3 / 4,9, Centre d'aide 3,3 / 4,1.

### 2.4 Contrastes (axe-core, règle `color-contrast`, WCAG 2 AA — outil, pas impression)

- **Messages** et **Ma plateforme** : 4 violations chacune, sur les pastilles d'état des conversations :
  `.pil-etat.ia` « Assistant » **#2451A6 sur #1B2233 : 2,11:1** — c'est **du bleu**, en pleine console, contre la règle de
  palette ; `.pil-etat.validation` « Attend votre validation » **#9A4B00 sur #29211B : 2,54:1** (des teintes de thème clair
  restées dans le thème sombre).
- Toutes les autres pages capturées : 0 violation axe.
- Landing : voir §1.1 (blanc sur corail 3,12:1 sur « Lire la vidéo »).
- Mon calcul maison (couleur composée sur fond effectif) recoupe axe sur ces cas ; il signale en plus quelques textes en
  `--faint` sur cartes, sans échec axe : non retenus.

### 2.5 États vides et états de chargement

- **Squelettes de chargement : 0** sur les 35 vues. **20 pages sur 26** affichent le texte « Chargement… » au premier instant
  (« CHARGEMENT… Devis Chargement… » sur la fiche devis, deux fois). Les autres affichent une page vide.
- **États vides** (compte vide) : présents mais pauvres — un point dans un cercle et une phrase (« Aucune demande pour
  l'instant. Dès qu'un client remplira votre lien, elle apparaîtra ici. »), aucun premier geste proposé, aucune illustration
  (`console/vide-dashboard-1440.png`, `vide-devis-*.png`). Les cartes de compteurs affichent « 0 » en grand.
- **Visite guidée** (1re connexion) : 5 bulles ancrées sur le menu, page assombrie derrière, « Plus tard / Suivant »
  (`console/vide-visite-guidee-1440*.png`). Ce ne sont pas des « slides » : rien ne montre ce que fait chaque fonction.

### 2.6 Cohérence des composants (compté dans le CSS au commit HEAD, `css-mesures.json`)

Méthode : chaque règle qui dessine un bouton (`btn|button|bouton|cta`), une carte (`card|carte|tuile|panel|bloc|kpi|stat`
avec fond + rayon ou bordure) ou un titre (`h1-h3|titre|title|head`) ; deux règles = un même style si elles ont le même fond,
la même couleur, la même bordure, le même rayon, le même rembourrage et la même taille de texte. C'est une borne basse (une
classe nommée autrement échappe au compte), pas un inventaire exhaustif.

| | Console (`base.css`, `globals.css` hors `.lp`, `crm.css`, `chiffres.css`, `assistant.css`, `accueil.css`, `relances-auto.css`, `atelier.css`) | Landing (`.lp-*`) |
|---|---|---|
| Styles de **bouton** distincts | **52** | 5 |
| Styles de **carte** distincts | **30** | ≥ 2 (heuristique trop étroite pour les `.lp-*`) |
| Styles de **titre** distincts | **56** (**46 tailles** de titre différentes) | 10 (10 tailles) |
| Rayons de bordure distincts | 37 | 20 |
| Ombres distinctes | 41 | 22 |
| Couleurs codées en dur (hors jetons) | 159 | 83 |

Styles en ligne (`style={{…}}`) dans les pages de la console : Ma plateforme **55**, Commander mon site **52**,
Paramètres **45**, Ma page **38**, Inventaire **36**, Messages **28**, Tableau de bord **19**, CRM 14, Devis 12, Tarifs 10,
Abonnement 9, Assistant 8, Chiffres 6, Réponses instantanées 5, Factures 0, Aide 0.

Palette : le contrôle de `presti-design` ne trouve, hors `.hud`/`.jv-` (code mort connu), qu'**un bleu vivant** dans le CSS :
`.orb` (`globals.css:884`, dégradé `#6C8CFF`), qu'aucun `.tsx` n'utilise (code mort, à supprimer dans une passe dédiée). Mais :
- le jeton **`--grid: rgba(120,150,255,.06)`** de `base.css` est **bleuté** et sert à trois grilles de fond (`globals.css:792,
  819, 855`) ; le commentaire d'en-tête de `base.css` parle encore de « nuit graphite + bleu plan » ;
- les pastilles bleues des Messages (§2.4) ne sont pas dans le CSS : elles viennent de styles en ligne ou de couleurs calculées.

---

## 3. Les 10 défauts les plus visibles, par gravité

Chemins relatifs à `C:\Users\benja\Documents\presti-ops\refonte-1018\avant\`.

| # | Gravité | Défaut | Preuve |
|---|---|---|---|
| 1 | **Grave** | **La landing est un long couloir** : 15 sections, 25,7 écrans en 1440 et **34,5 en 390** ; Tarifs (7,7 écrans) et Comparatif (6,0) font 40 % de la page sur téléphone ; « Essayer… » apparaît **11 fois** | `landing/accueil-390-plein.png`, `landing/accueil-390-section-11.png`, `-12.png` |
| 2 | **Grave** | **Factures : la liste des factures commence après 2,7 écrans de réglages** des relances automatiques (trois textes de relance, trois aperçus) ; une facture échue depuis 20 jours est affichée « Émise », pas « En retard » | `console/rempli-factures-1440.png` |
| 3 | **Grave** | **Du bleu dans la console et des pastilles illisibles** : « Assistant » #2451A6 sur #1B2233 (2,11:1), « Attend votre validation » 2,54:1, dans Messages et Ma plateforme ; sur téléphone les pastilles débordent sous la carte | `console/rempli-messages-390.png`, `rempli-plateforme-1440.png` |
| 4 | **Haute** | **Menu à plat** : 15 entrées, un groupe « Pilotage » de 12 entrées qui mélange devis, abonnement et page publique ; « Centre d'aide » caché en 1440 × 900 ; tiroir téléphone plein ; aucune barre du bas ; « Abonnement » deux fois ; pas de Ctrl+K | `console/rempli-dashboard-1440.png`, `rempli-menu-ouvert-390.png` |
| 5 | **Haute** | **La fiche d'un devis envoyé reste un formulaire d'édition** : 7 boutons de même poids dans l'en-tête, le bloc « Chiffrer avec l'IA » et « Tout effacer & recommencer » sur un devis déjà parti, statut en liste déroulante manuelle ; 4,9 écrans sur téléphone | `console/rempli-devis-fiche-envoye-1440.png`, `-390.png` |
| 6 | **Haute** | **Aucun squelette de chargement** (0/35 vues) : « Chargement… » en texte sur 20 pages, page vide ailleurs ; la fiche devis affiche « CHARGEMENT… Devis Chargement… » | `console/rempli-*-chargement.png` |
| 7 | Moyenne | **L'accueil ne dit pas quoi faire** : 4 compteurs cumulés (« 5 demandes reçues au total »), pas d'action prioritaire, pas de chiffres du mois ; statut brut « en_discussion » affiché ; « Bonjour Atelier » (premier mot du nom de l'entreprise) ; et l'artisan n'y arrive même pas après connexion (atterrissage sur `/outils`) | `console/rempli-dashboard-1440.png` |
| 8 | Moyenne | **Liste Devis peu dense et peu parlante** : une carte de ~100 px par devis, pastille d'avatar « E » identique partout, pas de filtre « À relancer », pas de date ni de dernier geste, mention « Conservé » énigmatique | `console/rempli-devis-1440.png` |
| 9 | Moyenne | **Héros de la landing** : en 1440, la démo produit est sous la ligne de flottaison ; chapeau de 6 lignes posé sur l'anneau de plasma WebGL (texte sur image, contraste non mesurable) ; « Lire la vidéo » blanc sur corail 3,12:1 | `landing/accueil-1440-ecran1.png`, `landing/accueil-1440-section-01.png` |
| 10 | Moyenne | **Mise en avant des fonctionnalités inexistante ou trompeuse** : pastille « Signature » affichée à un compte déjà Signature ; aucune présentation de ce que l'artisan n'utilise pas encore ; visite guidée en bulles sur fond assombri plutôt qu'en slides ; états vides sans premier geste | `console/vide-visite-guidee-1440.png`, `console/vide-dashboard-1440.png` |

Hors classement, à noter : 52 styles de bouton, 46 tailles de titre, 159 couleurs en dur dans la console (§2.6) ; Abonnement
à 11,4 écrans sur téléphone ; jeton `--grid` bleuté.
