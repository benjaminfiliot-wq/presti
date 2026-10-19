# Prompt de Benj — refonte de la console et du site (reçu le 18/10/2026, 22 h)

Texte fourni par Benj, conservé tel quel ; c'est la référence du chantier.

---

## 0. Qui tu es pour ce chantier

Tu es **directeur artistique et designer-intégrateur senior** (*design engineer*). Tu as conçu des
interfaces de logiciels exigeants, de la famille de Linear, Vercel, Stripe, Attio ou Raycast, et des
pages de lancement primées. Tu penses d'abord **hiérarchie de l'information, lisibilité et
parcours**, ensuite effets. Tu codes toi-même ce que tu dessines, au pixel près, et tu ne livres
rien que tu n'aies vu à l'écran, sur ordinateur et sur téléphone.

Tu travailles dans les règles du dépôt (`CLAUDE.md`) : anti-fabrication, « une fonctionnalité non
finie n'apparaît pas » (drapeaux), « poussé n'est pas déployé », white-label des surfaces artisan,
corrections incrémentales (on fait évoluer, on ne rase pas), auditeurs distincts des auteurs,
preuves par sortie de commande ou capture.

## 1. Ce que veut Benj (ses mots, reformulés fidèlement)

1. **La console** — l'espace où l'artisan arrive quand il se connecte (`qg.prestiapp.fr`) :
   - beaucoup plus **avancée** et **technologique** ;
   - **mieux faite** et **plus agréable à l'œil** ;
   - les fonctionnalités **mieux mises en avant** ;
   - de **meilleurs « slides »** : des panneaux de présentation, des carrousels, une visite guidée.
2. **Le site public** (`prestiapp.fr`) : il y a **énormément d'informations qui défilent**. Il faut
   les **mettre en avant**, les **ranger**, et arrêter de tout empiler dans un long défilement.
   Avec les bons outils de mise en page : onglets, sections épinglées qui font défiler des slides,
   grille bento, accordéons, pages dédiées.

## 2. L'état actuel (relevé le 18/10/2026 — revérifie-le avant de commencer)

### 2.1 Le site public : 16 sections à la suite
Dans l'ordre, sur `app/page.tsx` :
1. **Héros** : « Le premier qui répond décroche le chantier. » + `HeroApp` + `BandeMots`.
2. **Quatre arguments** : Rapide, Fiable, Sécurisé, Sans carte.
3. **Statistique** : « 7× plus de chances » (source citée).
4. **La chaîne complète** : 4 étapes, `#comment`.
5. **01 · De 22 h 14 à 7 h 52** : `DemoSequence`, `DemoGestion` (CRM et assistant, Signature), `DemoSite`.
6. **Le site qui donne envie d'appeler** : la démo de site.
7. **02 · Vos chiffres sans tableur** : `DemoChiffres`.
8. **03 · Votre compta rangée par l'IA** : `DemoCompta`.
9. **04 · Pour qui** : 4 métiers.
10. **05 · Et nous, on voit quoi ?** : confidentialité, 4 cartes.
11. **06 · Abonnements** : 3 offres, essai, `Comparatif` d'environ 45 lignes, 4 notes sur les crédits.
12. **Le site à la demande, 300 €.**
13. **07 · Comparatif** : `ComparatifConcurrents`, 11 critères × 5 colonnes, 6 cartes, 3 points,
    sources et mentions.
14. **Formulaire de maquette** : `MaquetteForm`, `#maquette`.
15. **08 · FAQ** : 8 questions.
16. **Appel final.**

Le bouton « Essayer gratuitement » apparaît environ 6 fois. C'est une page de lecture très longue :
le visiteur ne voit pas l'essentiel en 10 secondes.

### 2.2 La console
- **Le menu** (`app/AppShell.tsx`) : une colonne d'environ **15 entrées à plat** :
  - Tableau de bord, Messages, Devis, Factures, Mes chiffres, CRM atelier (en essai),
    Mes tarifs, Inventaire, Ma page, Commander mon site, Ma plateforme, Abonnement ;
  - puis Réponses instantanées, Assistant de gestion (en essai), Centre d'aide ;
  - et le menu du compte : Paramètres, Abonnement & usage, Sécurité.
- **Ce qu'on ne voit pas** : aucun regroupement, aucune hiérarchie, des fonctionnalités verrouillées
  (« Disponible avec Studio / Signature ») peu valorisées.
- **Ce qui existe et qu'on réutilise** :
  - le Poste de contrôle (`app/controle/`) : barre d'état, rail d'onglets avec compteurs, palette
    **Ctrl+K** (`Recherche.tsx`), tableaux denses ;
  - la visite guidée (`Visite.tsx`, drapeau `aideVisites`) ;
  - le centre d'aide.

### 2.3 Le design system (lis `.claude/skills/presti-design/SKILL.md` en entier)
- **Palette** : sombre cinématique et **corail `#D97757`**, jamais de bleu ni de violet. Jetons dans
  `app/base.css` (socle, gris froid) et `app/globals.css` `.lp` (landing, gris chaud).
- **Polices** : Bricolage Grotesque (titres), Hanken Grotesk (texte), JetBrains Mono (données).
- **Mouvement** : GSAP ScrollTrigger (`app/Motion.tsx`), Lenis. Filet de sécurité : rien ne reste
  caché sans JavaScript. Respect de `prefers-reduced-motion`.
- **Code mort à ne pas repeindre** : le HUD « Jarvis » (`.hud*`, `.jv-*`). Ne jamais le réintroduire.
- **Surfaces artisan** (`/site`, `/p`) : claires, thémables par `--pc`. **Hors périmètre de ce
  chantier** (voir §8).

## 3. Tes outils : skills, plugins et connecteurs à utiliser

Avant de dessiner, **lis la description de chaque skill ci-dessous** (dans `.claude/skills/` du
dépôt et dans tes skills globales) et sers-toi de toutes celles qui aident. Note dans le journal
lesquelles tu as utilisées, et pour quoi.

| Besoin | Skills et outils |
|---|---|
| Identité Presti, jetons, règles | `presti-design` (obligatoire, en premier) |
| Direction artistique, typographie, sortir du « gabarit » | `frontend-design`, `apple-design`, `emil-design-eng` |
| Choisir une brique d'interface (onglets, carrousel, palette de commandes, tableau…) | `pick-ui-library` : réutiliser l'existant d'abord, n'ajouter une dépendance que si elle est légère, maintenue et justifiée |
| Animation et mouvement | `motion-doctrine`, `animation-vocabulary`, `animate`, `animate-expo`, `find-animation-opportunities`, `improve-animations`, puis `review-animations` comme relecture |
| Prototyper vite avant d'intégrer | `prototype` |
| Cadrer et découper | `to-spec`, `to-tickets`, `grill-me` (fais-toi challenger ta direction avant de coder) |
| Architecture des composants | `codebase-design`, `improve-codebase-architecture` |
| Vérifier avant de dire « c'est bon » | `presti-verify` (obligatoire), `code-review` |
| Maquettes visuelles | **connecteur Figma** (le skill `figma` puis les outils `mcp__Figma__*` : `search_design_system`, `use_figma`, `get_screenshot`). Un fichier Figma « Presti — Refonte 2026-10 » avec les écrans clés, sur ordinateur et téléphone |
| Références de niveau | **connecteur MotionSites** (`search_prompts`, `get_prompt` : métadonnées et aperçus, sans consommer d'ouvertures payantes inutilement) ; vidéos de référence déjà décortiquées dans `presti-ops\references\` (animation-scalyx, animation-troiscoups) : même grammaire sombre, bento, titres cinétiques |
| Captures et contrôle visuel | navigateur intégré ou Claude in Chrome ; Playwright (`scripts/`) pour des captures reproductibles |
| Prévisualisation en ligne | **connecteur Vercel** : déploiement de prévisualisation de la branche, logs, état des déploiements |
| Données réelles du tableau de bord | **connecteur Supabase** en **lecture** pour connaître le schéma ; jamais d'écriture hors migration validée |
| Montrer des pistes à Benj | une maquette publiée (type Design de Claude) ou le lien Figma ; jamais une capture contenant des données réelles de client |

Si un connecteur n'est pas disponible dans ta session, dis-le dans le journal et continue avec le
reste (par exemple : maquettes en HTML statique au lieu de Figma).

## 4. Méthode (dans cet ordre, sans sauter d'étape)

### Étape 1 — Audit de l'existant (preuves, pas d'impressions)
1. Crée un **compte de test** (API admin Supabase) avec des données de démonstration (demandes, devis,
   factures, inventaire, chantiers) ; tu le supprimeras à la fin (`scripts/zero-demo-e2e.mjs` doit
   rester vert).
2. Capture **chaque page de la console** et **toute la landing**, en 1440 px et en 390 px de large,
   dans `presti-ops\refonte-1018\avant\`.
3. Mesure et écris dans `plans/refonte-1018/AUDIT.md` :
   - landing : nombre de sections, hauteur totale de défilement (en écrans), nombre de boutons
     d'appel, Lighthouse mobile et ordinateur (performance, accessibilité) ;
   - console : nombre d'entrées de menu, nombre de clics pour les 6 tâches clés (répondre à une
     demande, faire un devis, l'envoyer, facturer, ajouter un matériau, voir ses chiffres),
     contrastes (WCAG AA), états vides, états de chargement, cohérence des composants (combien de
     styles de bouton, de carte, de titre différents) ;
   - les 10 défauts les plus visibles, classés par gravité, avec capture.

### Étape 2 — Architecture de l'information (avant tout visuel)
**Landing** : un **inventaire complet du contenu**, ligne par ligne, avec pour chaque bloc sa
nouvelle place. **Rien ne disparaît sans destination** : une mention légale, une source ou une
promesse vérifiée garde sa place, quitte à changer de page. Cible proposée, à affiner :

| # | Nouvelle section | Ce qu'elle absorbe | Forme |
|---|---|---|---|
| 1 | **Héros** | héros + arguments (Rapide, Fiable, Sécurisé, Sans carte) en une ligne de pastilles | promesse, démo produit vivante, 1 bouton principal + 1 secondaire |
| 2 | **Preuve** | la statistique 7× (avec sa source) | bande courte |
| 3 | **Comment ça marche** | la chaîne en 4 étapes + la frise de 22 h 14 à 7 h 52 | **section épinglée** : le défilement fait avancer **4 slides** (demande → réponse → devis → relance et facture), la démo change avec la slide, barre de progression |
| 4 | **Fonctionnalités** | Réponses et devis, Chiffres, Compta, Inventaire, Site, CRM et assistant (seulement si leurs drapeaux sont levés) | **onglets** : une démo par onglet, le texte court à gauche, la démo à droite ; sur téléphone, onglets défilants |
| 5 | **Pour qui** | les 4 métiers | **sélecteur de métier** (pastilles) qui change l'exemple de demande affiché |
| 6 | **Confiance** | « Et nous, on voit quoi ? » | grille bento compacte de 4 tuiles + lien vers la page confidentialité |
| 7 | **Tarifs** | les 3 offres, l'essai, le site à 300 € (4ᵉ carte ou bande dédiée), les notes sur les crédits | cartes + bouton « Voir le comparatif détaillé » → le tableau de 45 lignes part sur `/tarifs` |
| 8 | **Maquette offerte** | le formulaire | inchangé sur le fond (il alimente la prospection), mieux mis en scène |
| 9 | **Questions** | les 5 questions les plus fréquentes | accordéon + lien vers `/faq` |
| 10 | **Appel final** + pied de page | | |

Le **comparatif concurrents** (tableau, 6 cartes, 3 points, sources et mentions) part sur une page
dédiée `/comparatif`, avec **toutes** ses sources et mentions légales, liée depuis Tarifs et depuis
le pied de page. Les ancres actuelles (`#tarifs`, `#comment`, `#fonctionnalites`, `#maquette`,
`#questions`, `#comparatif`) continuent de mener quelque part : redirection ou ancre conservée.
Cible mesurable : **la landing passe d'environ 16 sections à 10 au plus**, et sa hauteur de
défilement baisse d'au moins 40 % en 390 px, **sans perdre une seule information vérifiée**.

**Console** : regroupe le menu en sections nommées, par exemple :
- **Aujourd'hui** (accueil) ;
- **Clients** : Messages, Devis, Factures, CRM ;
- **Atelier** : Inventaire, Mes tarifs ;
- **Ma présence** : Ma page, Ma plateforme, Mon site ;
- **Pilotage** : Mes chiffres, Assistant ;
- **Compte**.

Avec en plus :
- un menu repliable en icônes ;
- la **palette Ctrl+K** reprise du Poste de contrôle (aller à une page, créer un devis, chercher un
  client) ;
- des compteurs (demandes non lues, devis à relancer) sur les entrées concernées ;
- sur téléphone, une barre du bas avec les 4 entrées essentielles et « Plus ».

Écris l'architecture dans `plans/refonte-1018/ARCHITECTURE.md`, avec un schéma.

### Étape 3 — Direction artistique (2 pistes, puis 1)
Prépare **deux pistes** dans Figma (ou en HTML statique si Figma est indisponible). Chaque piste
contient 4 écrans, en 1440 px et en 390 px :
1. l'accueil de la console ;
2. une page liste (Devis) ;
3. une fiche (un devis ouvert) ;
4. le haut de la landing (héros + slides « Comment ça marche »).

Les deux pistes restent **dans l'identité Presti** (sombre, corail, Bricolage/Hanken) mais diffèrent
par le caractère. Par exemple :
- **A, « Instrument »** : densité de logiciel professionnel, grille nette, données en JetBrains Mono,
  lueurs très discrètes ;
- **B, « Cinéma »** : plus de profondeur, verre dépoli, lueur corail de l'aube, transitions plus
  présentes, dans l'esprit des vidéos de référence.

Ce qui rend une console « technologique » sans la rendre gadget :
- une grille de fond très fine ;
- des **bordures lumineuses** au survol (`.sweepborder` existe) ;
- des **chiffres qui s'animent** à l'arrivée ;
- des **squelettes de chargement** au lieu des écrans vides ;
- des **transitions de page** courtes (150-250 ms) ;
- une **barre d'état** (synchronisation, crédits restants) ;
- des raccourcis clavier affichés ;
- des **micro-interactions** sur chaque action (envoyé, validé, copié) ;
- des **graphiques** propres (lis la skill `dataviz` si elle est disponible) ;
- **aucun** radar, HUD ni effet de science-fiction.

Envoie les deux pistes à Benj (lien Figma ou maquette publiée, plus un mail court avec les captures
côte à côte), avec ta recommandation argumentée. **Si Benj n'a pas tranché au bout de 12 heures,
pars sur ta recommandation** et note-le dans le journal : tout se fait derrière des drapeaux (§5),
donc rien n'est irréversible.

### Étape 4 — Le système, avant les pages
Dans cet ordre, chaque pas compilable et déployable :
1. **Jetons** : élévations, verre, lueurs, grille de fond, rayons, durées et courbes d'animation.
   Ils étendent `app/base.css` (console) et `.lp` (landing), **sans casser les surfaces existantes**.
2. **Composants** (`components/ui/` ou l'emplacement en usage dans le dépôt), chacun accessible au
   clavier et au lecteur d'écran :
   - Carte, Tuile de chiffre (avec compteur), Grille bento ;
   - Onglets (ARIA `tablist`) ;
   - Slides épinglées (navigables au clavier, avec repli statique) ;
   - Carrousel (pause, précédent et suivant, **jamais d'avance automatique sans contrôle**) ;
   - Accordéon, Palette de commandes, Barre d'état ;
   - Squelette, État vide illustré, Pastille d'offre (« Disponible avec Studio »), Toasts.
3. Une **page d'atelier** interne (`/outils/ui` derrière un drapeau, ou une page de développement)
   qui montre tous les composants dans tous leurs états. Capture-la.

### Étape 5 — La console, page par page
1. **AppShell v2** : menu groupé, repli, Ctrl+K, compteurs, barre du bas sur téléphone, sélecteur de
   compte. **Les verrous d'offre restent contrôlés côté serveur** (`peut()`, `lib/plans.ts`) : la
   refonte ne change que leur présentation.
2. **Accueil « Aujourd'hui »** :
   - un bonjour à l'artisan ;
   - **les 3 actions prioritaires du jour**, tirées des vraies données : demandes à répondre, devis à
     relancer, factures en retard ;
   - les chiffres clés du mois (vraies données, « — » s'il n'y en a pas) ;
   - le fil d'activité ;
   - un **panneau « Découvrir »** en slides : une fonctionnalité que l'artisan n'utilise pas encore
     par slide, avec un court visuel animé et un bouton qui y mène, ou « Disponible avec Studio /
     Signature » avec la vraie différence d'offre. C'est ce que Benj appelle « mieux mettre en
     avant ».
3. **La visite guidée** (`Visite.tsx`) refaite en **slides** à la première connexion : 4 à 5 écrans,
   passables, relançables depuis l'aide.
4. Puis, dans cet ordre (une PR par page, pour pouvoir revenir en arrière) : Messages, Devis (liste
   et fiche), Factures, Mes chiffres, Inventaire, Ma plateforme, Ma page, CRM et assistant (selon
   leurs drapeaux), Paramètres, Abonnement, Centre d'aide.
5. Sur chaque page : en-tête clair (titre, action principale à droite), filtres en pastilles,
   tableaux lisibles (lignes de 48 px, colonnes alignées, nombres en mono), état vide **utile** (ce
   que fait la page et le premier geste), squelette de chargement, confirmation de chaque action.

### Étape 6 — La landing
1. Construis la nouvelle architecture (§ étape 2) dans une **nouvelle composition** de `app/page.tsx`
   derrière un drapeau, en réutilisant les démos existantes (`HeroApp`, `DemoSequence`,
   `DemoChiffres`, `DemoCompta`, `DemoSite`, `DemoGestion`) **dans les onglets et les slides**,
   plutôt que de les réécrire.
2. Crée `/comparatif` et rends `/tarifs` et `/faq` complètes. Mets à jour le plan du site
   (`app/sitemap.ts`), les liens du pied de page et les métadonnées.
3. **Un seul bouton principal** par écran visible ; « Essayer gratuitement » au plus 3 fois sur la page.
4. Chaque phrase reste **vraie** : relis-les avec `plans/promesses-2026-10.md`. Les données de démo
   sont marquées « exemple ».

## 5. Garde-fous de mise en production
- Travaille sur une **branche** (`refonte-1018`), une PR par étape.
- Drapeaux dans `lib/flags.ts` : `consoleV2` et `landingV2`, **baissés** en production jusqu'à
  l'accord de Benj. Benj (compte fondateur) peut les voir avant tout le monde si le mécanisme
  d'essai le permet (`enEssai`).
- Chaque PR : `npm run typecheck`, `npm run build` (**jamais en parallèle d'un sous-agent** ; les
  sous-agents utilisent `PRESTI_DIST=.next-prod`), `node scripts/tout-verifier.mjs` vert, puis
  déploiement de prévisualisation Vercel vérifié en ligne.
- Après fusion : `node scripts/attendre-deploiement.mjs`, puis vérification en production (routes
  200, drapeau baissé = ancienne interface intacte).
- Toute suite e2e qui casse à cause d'un sélecteur déplacé est **corrigée**, jamais supprimée. Les
  nouveaux écrans ont leurs propres tests, inscrits dans `SUITES`, dont tu prouves qu'ils peuvent
  rougir.

## 6. Critères de réussite (mesurés)
| Critère | Cible |
|---|---|
| Sections de la landing | ≤ 10 (contre ~16) |
| Hauteur de défilement de la landing en 390 px | − 40 % au moins |
| Informations vérifiées perdues | **0** (inventaire de contenu coché ligne par ligne) |
| Lighthouse mobile de la landing | Performance ≥ 90 (83-85 aujourd'hui), Accessibilité ≥ 95 |
| Clics pour les 6 tâches clés de la console | jamais plus qu'avant, au moins 3 tâches avec 1 clic de moins |
| Contrastes | WCAG AA partout (texte ≥ 4,5:1), vérifiés par outil |
| Clavier | toute la console utilisable sans souris ; ordre de focus logique ; focus visible |
| `prefers-reduced-motion` | tout reste visible et utilisable, aucun mouvement |
| Sans JavaScript | la landing reste lisible (filet `.reveal-armed`) |
| Fluidité | aucune tâche longue > 200 ms à l'interaction (INP), CLS < 0,05 |
| Cohérence | un seul style de bouton principal, un seul de carte, une seule échelle de titres (compté dans le CSS) |
| Palette | aucun bleu ni violet hors thèmes artisan ; grep de contrôle de `presti-design` vide |

Plus un **jury de design indépendant** : un sous-agent qui n'a rien construit reçoit les captures
**avant/après** (1440 et 390 px), sans savoir lesquelles sont les nouvelles. Il note de 1 à 5 la
hiérarchie, la lisibilité, la densité, la cohérence, le plaisir visuel et la mise en avant des
fonctionnalités. Seuil : **chaque note ≥ 4, et la nouvelle version gagne sur chaque critère.**
Sinon, on reprend les écrans fautifs.

## 7. Ce que tu rends à Benj
- `plans/refonte-1018/` : `AUDIT.md`, `ARCHITECTURE.md`, l'inventaire de contenu, la direction
  choisie et pourquoi, et les notes du jury.
- `presti-ops\refonte-1018\avant\` et `\apres\` : les captures, page par page, en 1440 et 390 px,
  et une **planche avant/après** par page.
- Le lien de prévisualisation Vercel, et le lien Figma ou la maquette publiée.
- Dans `presti-ops\JOURNAL-PLAN.md` : une section « Refonte 18/10 » tenue à jour. À la fin, la liste
  des décisions qui lui reviennent (lever `consoleV2`, lever `landingV2`), chacune avec 2 ou 3
  options numérotées.

## 8. Ce que tu ne touches pas
- Les **surfaces artisan** `/site/[slug]` et `/p/[slug]` (claires, thémables, white-label) : elles
  ne reçoivent **ni** les nouveaux composants de la console, **ni** la marque Presti.
- La logique métier, les prix, les verrous d'offre côté serveur et les prompts de l'IA : la refonte
  ne change que la présentation.
- Les drapeaux des fonctionnalités en essai (CRM, assistant, canaux Meta, etc.) : une fonctionnalité
  baissée reste invisible, même si elle serait jolie dans une slide.
- Le Poste de contrôle `/controle` : tu peux lui emprunter des composants, pas le redessiner.
- Aucune donnée réelle de client ou de prospect dans une capture, une maquette ou une démo.
