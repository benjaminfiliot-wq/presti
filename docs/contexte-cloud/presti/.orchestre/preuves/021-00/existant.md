# Vague 5 — l'existant et les contraintes de la démo « Atelier Lestraque » (021-00)

Relevé du 15/09/2026, entre 13 h et 13 h 10 à Paris, par un sous-agent de Claude Code, en lecture seule.
- **Code lu** : `public/sites-demo/generer.mjs`, `_kit/da.json`, `_kit/kit.css`, `_kit/kit.js`, `_kit/relief.js` et `_kit/relief-fil.js`, tous lus en entier ou par plages. Les numéros de ligne sont ceux du disque au moment du relevé.
- **Version** : HEAD = `4138ad5` (12:42:32 +0200). La démo n'a pas changé depuis `2e225af` (09:34:02, `git log -1 -- public/sites-demo/lestraque/index.html`).
- **Lignes du cahier recontrôlées** : kit.css:1156 et 1157, generer.mjs:385, 608, 646 et 820-825, relief.js:26-90, relief-fil.js:92, 98-104, 143-146 et 186. Elles correspondent toujours au texte cité.
- **Mesures en ligne** : faites le 15/09 à 11:04Z (13 h 04). Script : `scratchpad/021-00/poids.mjs`, sortie `poids.json`.
- **Connecteur MotionSites** : il demande une authentification dans cette session de sous-agent. Il n'a pas servi : cette partie n'en avait pas besoin.

---

## 0. Alertes à lire avant de découper

1. **Onze captures blanches, non suivies par git, dans le dossier de la démo** (`git status --short public/sites-demo`).
   - **Fichiers** : `bureau-t06/t25/t50/t80/d30/d60/d100/page.png` en 1280×800, `mobile-t25/d45.png` en 780×1688, et `planche-demo.jpg`. Tous écrits entre 12:36:49 et 12:37:06.
   - **Mesure sharp** : moyenne 255 et écart-type 0 sur les trois canaux pour les dix PNG, qui font donc tous un blanc uni. J'ai aussi ouvert `bureau-t25.png` : il est blanc.
   - **Origine probable, non prouvée** : les noms sont ceux de `scripts/demo-images-cles.mjs:46-58`, lancé avec le dossier de la démo comme sortie. Le fichier `avant.txt` de 020-14 date de 12:38:02, juste après.
   - **Conséquence 1** : la précondition §7.0 du cahier (`git status --short public/sites-demo` vide) n'est plus tenue. 020-02 et 020-03 s'arrêteraient.
   - **Conséquence 2** : un `git add public/sites-demo` les mettrait en ligne.
   - **Conséquence 3** : `scripts/grille-aveugle.mjs:77` lit justement `bureau-t25/d30/d60/d100.png` dans le dossier de la démo. La planche de la démo serait blanche.
   - **À faire** : Claude Code les retire. Je n'ai pas le droit d'écrire hors de 021-00.
2. **La marge LCP est quasi nulle sur l'accueil.**
   - Dernière série Lighthouse mobile (5 passes, `017-vague-3/final/lighthouse/resume.json`, 02:00Z) : LCP de 2 486, 2 485, 2 487, 2 480 et 2 483 ms.
   - Barre de site-qa : **< 2 500 ms** (`site-qa.mjs:50`). Page de Rennes : 2 631 et 2 635 ms dans la même série.
   - Toute vidéo de héros ou image plus lourde au chargement risque de faire échouer ce critère.
3. **Aucun Lighthouse n'a été mesuré après la barre retenue.** La série de 02:00Z porte sur `index.html` d'empreinte `9d982c50…`, antérieure à `2e225af`. Le cahier le note déjà (P-1).
4. **Deux candidats du moment signature sont encore en cours** : 020-11 (L1) et 020-13 (RL) (`.orchestre/en-cours/`). `020-01/RL/travail/` est vide au relevé. Pour la descente, seul `descente/avant-correction/` existe.
5. **La copie du cahier dans presti est incomplète.** `020-01/cahier/` ne contient que `cahier-des-charges.md`, `moment.mjs`, `params.json` et `proto7.mjs`. Les JSON cités (`cdc-*.json`, `contre/*`, `relecture/*`, `mesure-en-ligne.json`) restent dans le scratchpad de la session, où un exécutant n'a pas accès. C'est la copie prévue en 020-00 (§11).

---

## 1. La page aujourd'hui

### 1.1 Carte des scènes de l'accueil (ordre du HTML rendu)

**Comment l'ordre est produit.**
- L'ordre des sections vient de `contenu.json`. Chaque genre a son gabarit (generer.mjs:620-638).
- `ouverture` englobe le héros et le plateau (generer.mjs:646).
- Relevé sur `lestraque/index.html` : `div.ouverture` › `section.hero.hero--plein` › `section.plateau` › `#prestations` › `#atelier` › `#realisations` › `#communes` › `#etapes` › `#questions` › `#contact` › `footer.pied`.

**Conventions du tableau.**
- « Bureau » = `(min-width:1024px) and (prefers-reduced-motion:no-preference)` + `@supports (animation-timeline: view())`.
- La colonne « Fond » est le classement du garde-fou `fondDe` (generer.mjs:158).
- Hauteur de page mesurée : 10 729 px en 1440×900, 9 042 px en 390×844.
- `document.getAnimations()` au chargement : 70 animations au bureau, 2 au téléphone.

| # | Scène, élément et classes | Fond | Bureau (chorégraphie) | Téléphone | Mouvement réduit, ou sans `view()` |
|---|---|---|---|---|---|
| 0 | **Barre** `header.nav.nav--claire`. kit.js ajoute `nav--retenue` (≥ 960 px, un seul appel visible) et `nav--bande` (deux couches découpées sur la scène sombre) | — | Relais « bouton du héros » → « Devis », par `elementFromPoint` avec opacité ≥ 0,2 (kit.js:21-53). Pilule en verre fumé avec `backdrop-filter` (kit.css:992-995). Bande au pixel (kit.js:72-110, kit.css:978-984) | Burger et « Devis » dans la barre (kit.css:999-1003) | Identique ; sans JS, « Devis » visible |
| 1 | **Héros** `section.hero.hero--plein[data-nav=sombre][data-relief…]` (generer.mjs:609). Dans `.hero__media`, le `picture` (4:5 sous 768 px). Dans `.hero__contenu`, le `h1` (`.h1__cle` puis `.h1__ligne`, mots `.mot`) et `.hero__pied` (`.chapeau`, `.bouton`) | photo | Poussée `pousse` 20 s, `scale` 1 → 1,06 (kit.css:322-323). Titre qui se lève en 0,95 s (337-341) ; pied en fondu 0,8 s après 0,8 s (345-346). Héros **collant** sur 100svh (1080). Au passage du plateau (timeline `--plateau`) : `ouverture-texte`, `ouverture-photo` (`transform` 1 → 1,08) et voile 0 → 0,6 (1082-1084, 1129-1131). **Relief WebGL** : toile `.hero__relief`, fondu 0,7 s, même poussée (1154-1156) | Photo à 1,26 depuis le haut, dérive `derive-tel-haut` de 0 à −3 % en 12 s (kit.css:698, 934-942). 0 octet de WebGL | kit.css:264 coupe l'animation de l'image ; kit.js:183 ne charge pas le relief |
| 2 | **Plateau** `section.plateau` (#14110E) : citation signée, photo `mains-noyer` (`.plateau__photo`), `dl.chiffres` ×3 | noir | Monte sur le héros collant (z-index 1, ombre haute, 1081). Photo `glisse-cadre` ±6 % à l'échelle 1,14 (1105). `.reveal` suit la position (1095) | Phrase, chiffres, photo en bas (709-722) | Dévoilement par IntersectionObserver (kit.js:157-164) |
| 3 | **Prestations** `section.scene.scene--papier.scene--presta#prestations` : `.scene__tete--deux` (h2 en mots `.ml`), `ol.presta` › `li.presta__ligne.reveal` (numéro, h3, texte, `.presta__vignette`) | papier | h2 levé mot à mot (1088-1091). **Survol existant** : h3 décalé de 1,2vw (463-464) ; vignette ouverte en `clip-path` de 50 % à 0, `scale` 1,2 → 1, `rotate` −2° (543-549, 1038-1041) | Rail aimanté à 80vw, la vignette en tête de carte, jauge liée au rail par `scroll-timeline` (551-565, 725-731) | Liste, sans vignette |
| 4 | **Dans l'atelier** `section.scene.atelier#atelier[data-nav=sombre]` : plein cadre 100svh (`atelier-poncage`, recadrage 9:16 au téléphone), h2 `.atelier__titre` | photo | Photo `derive` ±5 % à 1,12, timeline `view()` (580-585) | Voiles plus légers (868) | Fixe |
| 5 | **Réalisations** `section.section.section--noir.scene--galerie#realisations` › `.travelling(--n:4)` › `.travelling__epingle` collant › tête + compteur 01/04 + `.galerie--scene` › `figure.galerie__item.reveal` ×4 + crédits | noir | **Travelling épinglé** sur 184svh (1031, qui l'emporte sur 630, 753 et 961) : `translateX`, images en `glisse` ±4 % (639-645). Compteur piloté par JS (kit.js:115-141). `relief-3d` à la souris fine : `rotateY` jusqu'à 6°, `translateZ` jusqu'à −48 px, ombre (1157-1161). Dévoilement en `clip-path` de 16 % à 0 et `scale` 1,1 → 1 (601-606). Survol : `scale` 1,04 (607) | Rail à 85vw et jauge (734-739, 856-864) | Grille 8 + 4 puis 6 + 6 (741-747, 808-812) |
| 6 | **Communes** `section.scene.scene--papier.scene--communes#communes` : liste monumentale sur deux colonnes | papier | Survol : nom et flèche décalés de 2,5vw (306) | Noms à 11,5vw (853) | — |
| 7 | **Étapes** `section.section.section--noir#etapes[data-nav=sombre]` : `.etapes__tete` (surtitre, h2, photo `tournage-copeaux`), `ol.etapes__liste` › `li.etape` (--k, --e, --ne), jauge | noir | Si la hauteur fait au moins 680 px : **épinglées sur 300svh**, une tranche de timeline par étape (`etape-num`, `etape-corps`), jauge verticale (1110-1126, 1139-1145) | Rail à 76vw et jauge (775-783, 846-852) | Liste ; `--avancee` par JS (kit.js:231-240) |
| 8 | **Questions** `section.scene.scene--papier.scene--faq#questions` : `.faq-scene` (tête, photo `tasseaux-cloison`, questions `details`) | papier | Photo `glisse-cadre` ; première question ouverte (kit.js:260) | Photo en tête (790) | — |
| 9 | **Contact** `section.contact.contact--photo.contact--matiere#contact[data-nav=sombre]` : fond `boiserie`, h2 `.ml`, `form.devis__form[data-demo]`, infos, `tel:` | photo | Photo `glisse-cadre` (1105), h2 levé mot à mot | Voile ouvert en haut et en bas (800-806) | — |
| — | **Grain de papier** `html.texture--papier::before`, calque fixe à z-index 90 (255-256) | — | Oui | Coupé sous 1024 px (869) | — |

**Au téléphone**, les sections sous le plateau sont en `content-visibility:auto` (kit.css:874-878). kit.js les rend toutes au premier défilement (kit.js:55-63).

### 1.2 Drapeaux de `da.json` qui pilotent Lestraque (da.json:8)

- **Hérités du métier menuisier** : `hero:"plein"`, `texture:"papier"`, `graisseLigne 300`, polices statiques préchargées.
- **Classes posées sur `<html>`** (generer.mjs:385) : `etapesMonumentales` → `da--etapes`, `communesMonumentales` → `da--communes`, `navRetenue` → `da--nav-retenue`. Aucune classe `da--signature` n'existe encore.
- **Scènes** : `scenes:true` (gabarits de scène), `noires:["galerie","etapes"]`, `kickers:["etapes","contact"]`, `sansAlt`, `creditsGroupes`.
- **Photos** :
  - `heros` / `herosMobile`, `galerie` : quatre ouvrages ;
  - `plateauPhoto`, `etapesPhoto`, `faqPhoto`, `contactPhoto` (base et position), `atelier` / `atelierMobile` ;
  - `prestationsPhotos` : la clé est un fragment du h3 ;
  - `ouvrages`, `photosCommunes`.
- **Relief** : `{photo, profondeur:"relief/escalier-profondeur.webp", oeil:[0.404,0.386]}`. Il produit les attributs `data-relief*` du héros (generer.mjs:608) et les contrôles de generer.mjs:820-825.

### 1.3 Garde-fous du générateur que toute nouvelle scène doit respecter

Ils s'exécutent **avant** toute écriture : un échec laisse le site intact (generer.mjs:774-776).

- **Le plateau suit immédiatement le héros** (generer.mjs:146-148). Une vidéo ou une scène glissée entre les deux est refusée.
- **Deux scènes voisines n'ont jamais le même fond** (generer.mjs:158-163). Le fond se lit sur les classes : `hero--plein|atelier|contact--photo` → photo ; `plateau|section--noir|section--sombre|contact` → noir ; sinon papier. Séquence actuelle : photo, noir, papier, photo, noir, papier, noir, papier, photo.
- **Surtitres (`.mono`)** : 2 au plus (generer.mjs:164-165).
- **h2** : de 2 à 4 mots (generer.mjs:152).
- **Chaque genre a un gabarit**, sinon la génération échoue (generer.mjs:637). Une nouvelle scène demande donc un nouveau genre dans `contenu.json` **et** un gabarit.
- **Photos.**
  - Aucune photo plus de deux fois sur l'accueil, comptée par `<picture>` et par fichier Commons (generer.mjs:131-136). `heros-escalier` y est déjà deux fois : héros et galerie.
  - Galerie de l'accueil : exactement 4 ouvrages finis (generer.mjs:626-629).
  - Toute photo d'`attributions.json` doit être affichée (generer.mjs:785-787). Toute modification se déclare (generer.mjs:746, 806-813).
- **Interdits** :
  - rideau, lentille, bande qui défile (generer.mjs:109) ;
  - `tel:` dans le héros ; téléphone plus de 2 fois (generer.mjs:140, 145) ;
  - « gratuit » (generer.mjs:117) ;
  - apostrophe droite, ou caractère hors de la couverture de la police (generer.mjs:119-124).
- **Fichiers publiés par le générateur** (generer.mjs:827-832) : `styles.css` (faces + jetons + kit.css sans commentaires, l.341-342), `site.js` (= kit.js), `relief.js`, `relief-fil.js`, `favicon.svg` et `fonts/`.
  - Les images et `relief/` sont posés à la main dans `lestraque/`.
  - Tout nouvel asset (vidéo, module JS, modèle) doit être ajouté ici **et** contrôlé comme le relief.
- **Poids réel de `site.js`** : l'en-tête de kit.js annonce « ≤ 5 Ko », mais le fichier fait 23 147 octets bruts et 8 594 octets en brotli (mesure curl).

### 1.4 Points d'extension pour les cinq familles d'effets

**Précondition : les périmètres parallèles.**
- Aujourd'hui, **tout le mouvement vit dans deux fichiers** : kit.css (1 163 lignes) et kit.js. Les tâches 020-02 et 020-03 modifient aussi kit.css, relief.js, relief-fil.js, da.json et generer.mjs.
- Pour des périmètres disjoints, il faut que generer.mjs concatène **des fichiers de kit par famille**, par exemple `_kit/recit.css`, `_kit/survol.css`, `_kit/eclate.js`, dans le même `styles.css` et le même `site.js`.
- Ce branchement est une petite tâche préalable, qui touche generer.mjs:15-16 et 342, puis 830.

| Famille | Ce qui existe déjà | Où brancher | Contraintes propres |
|---|---|---|---|
| **Récit au défilement** | Trois motifs épinglés et pilotés en CSS : l'ouverture (collant + `view-timeline --plateau`, kit.css:1079-1084), le travelling (`--travelling`, 184svh, 630-645) et les étapes (300svh, tranches `--e/--ne` sur `contain`, 1110-1126). Plus la levée des titres mot à mot et `.reveal` lié à la position | Un nouveau genre de section : gabarit dans generer.mjs:620-638, bloc CSS sous le même `@media` + `@supports` (modèle 1075-1128), drapeau da.json → classe html (385). Emplacement à choisir en respectant l'alternance des fonds | Chaque écran épinglé allonge la page (10 729 px aujourd'hui). La hauteur n'est pas bornée par un juge, mais le travelling a déjà été ramené de 310svh à 184svh sur remarque des juges (kit.css:684-686, 1027). Aucun nouvel appel à l'action visible (nav-retenue-qa). Repli IntersectionObserver obligatoire (téléphone, Firefox, mouvement réduit) |
| **Animations et défilement fluides** | Ancres défilées en douceur par JS (kit.js:246-255). `scroll-behavior:smooth` est **refusé exprès** : il bloque tout défilement programmé (kit.js:246-247). Courbes maison `cubic-bezier(.16,1,.3,1)` et `(.2,.7,.2,1)` | Un défilement amorti (type Lenis) serait un module du kit, hébergé sur place | Les juges et la vidéo pilotent `scrollTo({behavior:'instant'})` (nav-retenue-qa l.86, 106 ; demo-usage-qa l.153) et un défilement par rAF (demo-video.mjs:61-71). Un amortisseur qui intercepte la molette ou `scrollTo` fausse leurs positions. `view()` suit le vrai `scrollY` |
| **Vidéo de héros** | Aucune vidéo sur la démo. `.hero__media` porte le `picture` (kit.css:85-87). relief.js lit `img.currentSrc` et pose la toile dans `.hero__media` (relief.js:16-17, 36, 53). La poussée, la rotation R et la lumière L2 (`.hero__media::before`) visent la photo | **Collision frontale** avec RL, la descente et le relief, qui ont la même boîte. Emplacements sans collision : la bande « Dans l'atelier » (`.atelier__media`, 100svh, déjà en `loading=lazy`) ou le fond du contact | LCP à ~15 ms de la barre (§0.2). CSP : même origine obligatoire, sans `blob:`, donc sans lecteur HLS/MSE (§2.2). Licence libre et crédit : `attributions.json` est modélisé pour des photos (base, largeurs avif/webp). La vidéo de la landing filme la démo ; `demo-video-licences-test.mjs` exige que chaque image visible soit connue d'`attributions.json` |
| **Révélation au survol** | Six survols : vignette de prestation en `clip-path` (543-549, 1038-1041), h3 (463-464), communes (306), galerie à 1,04 (607), bouton (127-128), `relief-3d` du travelling (kit.js:122-134). Suivi du pointeur déjà écrit pour `.carte` (kit.js:242-244) | Étendre `.presta__vignette` (image plus grande qui suit le curseur) ou les figures de la galerie, sous `(hover:hover) and (pointer:fine)` | Invisible dans la grille (quatre captures fixes) et au téléphone, où les cartes du rail montrent déjà la vignette. site-qa exige au moins 8 règles `:hover` et aucune transition sur la mise en page (site-qa.mjs:452-461) |
| **Objet décomposé (vue éclatée)** | Rien. Infrastructure WebGL réutilisable : sonde du worker puis sonde du fil principal (kit.js:182-219), OffscreenCanvas, rendu logiciel refusé (relief-fil.js:56, 121-125). CSS 3D déjà en place (`perspective`, `rotateY`, `translateZ` du travelling, 1159) | Candidat naturel : la scène **Étapes**, déjà épinglée sur 300svh avec une tranche de timeline par étape. Autre choix : la prestation « escalier ». Calques SVG ou PNG dessinés, écartés en `translateZ`/`translate` par timeline : visibles **sans WebGL** en 1088×800 (condition de la grille) | CSP : pas de CDN (three.js à héberger), pas de WebAssembly (§2.2). Un seul worker WebGL existe, attaché au héros : un second contexte est un budget à part (§2.4). Aucune donnée réelle, donc des calques dessinés, pas de photo « éclatée » |

---

## 2. Contraintes mesurées

### 2.1 Lighthouse mobile

- **Barre de site-qa** : les quatre scores ≥ 95, LCP < 2 500 ms, CLS < 0,1, TBT < 200 ms (site-qa.mjs:47-52).
- **Verrou** : un seul Lighthouse à la fois sur la machine (site-qa.mjs:615-629).
- **Cible de Benj** : médiane ≥ 95 sur la démo (contexte de la mission).

| Date et source | Page | Performance | LCP | TBT | Remarque |
|---|---|---|---|---|---|
| 15/09 02:00Z, `017-vague-3/final/lighthouse/resume.json` (5 passes, simulation CPU ×4, 412×823 à dpr 1,75, LH 13.4.1) | accueil | 94 · 97 · 97 · 97 · 97, **médiane 97** | 2 486 · 2 485 · 2 487 · 2 480 · 2 483 ms | 192 · 0 · 84 · 0 · 0 ms | Avant la barre retenue ; accessibilité 100 |
| idem | menuisier-rennes | 96 · 97 | **2 631 · 2 635 ms** | 0 · 0 ms | LCP au-dessus de 2 500 dans cette série |
| 15/09 00:37 (heure locale), `017-vague-3/finitions/tour-3/site-qa.txt:199-214` | accueil / rennes | 98 / 97 | 2 332 / 2 484 ms | 0 / 0 ms | Passage unique |
| `plans/journal-v16.md:44` | accueil (v16) | 97 · 97 · 97 | 2,03 à 2,35 s | 113 à 145 ms | — |

**Historique des tâches longues mesurées** (commentaires du code) :
- site.js : 194 ms (kit.js:16-17), puis 260 ms et TBT 241 ms (kit.js:228-229) ;
- relief : 108 ms sur le fil principal avant déport (kit.js:172), 250 à 350 ms (relief-fil.js:3) ;
- polices : TBT de 338 à 213 ms (generer.mjs:304-306) ;
- mise en page complète au téléphone : 330 à 490 ms (kit.css:870-873).

La démo est au bord de la barre : chaque ajout de JS au chargement ou de police se paie.

### 2.2 CSP de la démo (en-tête réel)

**D'où elle vient.**
- `curl -I https://prestiapp.fr/sites-demo/lestraque/index.html` le 15/09 à 11:04:53Z : `Content-Security-Policy` et `X-Frame-Options: DENY`.
- Source : `next.config.mjs`, `headers()`. La règle stricte `/((?!site/|p/).*)` s'applique à `/sites-demo/` (« sites-demo » ne commence pas par « site/ »).
- Aucune `<meta http-equiv>` dans `index.html` (grep = 0). `vercel.json` ne porte que des crons. Le middleware ne réécrit pas `prestiapp.fr` (`isPrestiHost`).

**Directives servies :**
```
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; default-src 'self'; worker-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.[MASQUE_SECRET]; font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://gorcdvmueakcncsmrouo.supabase.co https://www.google-analytics.com;
connect-src 'self' https://gorcdvmueakcncsmrouo.supabase.co wss://… https://api.stripe.com https://www.google-analytics.com https://*.analytics.google.com;
frame-src 'self' https://js.stripe.com https://checkout.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';
script-src-attr 'none'; frame-ancestors 'none'; upgrade-insecure-requests
```

**Ce que ça impose aux effets :**
- **Pas de CDN de script** : GSAP, three.js et Lenis s'hébergent dans `_kit/` et sont copiés par generer.mjs. cdnjs a été retiré exprès (commentaire de next.config.mjs, « cdnjs n'est plus autorisé »).
- **Ni `'unsafe-eval'` ni `'wasm-unsafe-eval'`** : pas de bibliothèque qui compile par `eval` ou `new Function`, et pas de WebAssembly (décodeurs Draco, Basis/KTX2).
- **`worker-src 'self'`** : pas de worker en URL blob (kit.js:177).
- **Pas de `media-src`** : on retombe sur `default-src 'self'`. Vidéo **en même origine seulement, sans `blob:`**, donc pas de lecteur HLS/MSE et pas d'hébergeur vidéo externe. L'aperçu `luxury-focus` de MotionSites est un flux Mux `.m3u8` (motionsites-recherche.md:27) : ce modèle est inapplicable tel quel.
- **`script-src-attr 'none'`** : aucun `onclick` ni `onerror` en attribut.
- **`frame-ancestors 'none'`** : la démo ne peut pas être intégrée en iframe, d'où la vidéo sur la landing.
- **Juge d'usage** : toute violation remonte en erreur console et fait échouer `console-sans-erreur` (demo-usage-qa.mjs:322-329).

### 2.3 Poids actuel (mesuré)

**Fichiers servis** (`curl`, octets bruts / reçus avec `Accept-Encoding: br,gzip`) :

| Fichier | Brut | Compressé |
|---|---|---|
| index.html | 37 158 | 8 317 |
| styles.css | 74 010 | 16 699 |
| site.js | 23 147 | 8 594 |
| relief.js | 6 146 | 2 710 |
| relief-fil.js | 12 152 | 5 432 |
| relief/escalier-profondeur.webp | 8 264 | 8 264 |
| favicon.svg | 968 | 968 |

**Page réelle.**
- **Méthode** : Chromium de Playwright, cache désactivé, `encodedDataLength` via CDP. Chargement puis 8 s d'attente ; ensuite défilement complet par demi-écrans.
- **Limite** : les requêtes du worker (relief-fil.js, carte de profondeur, relecture de la photo) ne passent pas par la session CDP de la page et ne sont pas comptées.

| Profil | Au chargement (8 s) | Détail | Après défilement complet | Plus grosses pièces |
|---|---|---|---|---|
| Bureau 1440×900, sans carte graphique (relief `sans`) | **337 358 o**, 18 requêtes | Images 213 991 · polices 87 583 · CSS 16 877 · JS 9 558 · HTML 9 349 | 514 778 o, 23 requêtes | heros-escalier-1600.avif 112 849 ; boiserie-1600.avif 56 108 |
| Bureau 1440×900, avec carte graphique (relief `pret`) | **340 242 o**, 19 requêtes | + relief.js 2 894 (+ environ 13,7 Ko du worker non comptés : relief-fil.js 5 432 et profondeur 8 264 selon curl) | 517 094 o, 24 requêtes | idem |
| Téléphone 390×844 à dpr 3 | **324 790 o**, 12 requêtes | Images 220 541 · polices 68 464 · CSS 17 663 · JS 8 773 | **1 187 898 o**, 25 requêtes | **boiserie-2400.avif 229 828** (fond du contact : `sizes` 200vw, generer.mjs:565) ; bibliothèque-1600 121 613 ; heros-escalier-1600 112 868 ; penderie-1600 103 118 |

**Déjà prévu par le cahier (relief sur bureau)** :
- texture `heros-escalier-2880.avif` : **745 293 octets** (§3.7), plus du double du chargement actuel au bureau ;
- environ 33 Mo de mémoire graphique, par calcul (§10.6).

**Budgets écrits.**
- **P-2 du cahier** : croissance de `styles.css` ≤ 1 000 octets en brotli 11 par tâche du moment signature. Il est taillé pour un seul geste : **la vague 5 doit fixer le sien**.
- **Vidéo de la landing** : ≤ 1,5 Mo (video-qa.mjs:172).

### 2.4 Budget du worker WebGL

**Garde d'entrée** (kit.js:183) : IntersectionObserver, ResizeObserver, Worker, WebGL, `transferControlToOffscreen`, et `(min-width:1024px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)`.

**Démarrage.**
- Après `load`, dans un moment libre de 1,2 s au plus (kit.js:217).
- Le worker ouvre d'abord un contexte d'1 px, puis le fil principal sonde « à chaud » (kit.js:184-214).
- Sans réponse en 4 s, pas de relief (kit.js:212). Le rendu logiciel est refusé par son nom (relief-fil.js:56, 121-125).

**Coûts documentés.**
- Premier contexte à froid : 370 à 410 ms, payés dans le worker (kit.js:174-176).
- Un contexte suivant : 4 à 40 ms (idem). Contexte dans le worker : 99 à 221 ms (relief-fil.js:2).

**Cadence et arrêt.**
- dpr de la toile ≤ 1,5 (relief.js:31).
- Texture réduite à la largeur affichée (relief-fil.js:143).
- **30 images/s** quand la souris est au repos (relief-fil.js:92).
- Arrêt quand le héros sort de l'écran, que le haut du plateau est à ≤ 0,5 px, ou que l'onglet est caché (relief.js:59-74). Apparition : 0,7 s puis 1,8 s (relief-fil.js:95).

**Mesuré par le cahier** (`scratchpad/signature/cahier/mesure-en-ligne.json`, 09:18 heure locale, avant la barre retenue ; fichiers du relief identiques en ligne et à HEAD selon leur empreinte) :
- état `pret` après **1 885 ms** ;
- **29,1 images/s** au repos, **25,6 images/s** pendant le défilement, **0** recouvert (y = 1200) ;
- après un saut de y 3000 à 0, le worker garde `defile` à 0,933 (constat F21 du cahier) ;
- téléphone et mouvement réduit : 0 requête du relief.

**Budget exigé par le cahier (P-4)** : `dureeP95` ≤ 16,7 ms, 0 tâche longue, p95 des intervalles rAF ≤ 20 ms. Il n'existe qu'**un** worker et **une** toile, attachés au héros de l'accueil.

### 2.5 Mouvement réduit et règles de mouvement

- **Coupe globale** : `@media(prefers-reduced-motion:reduce)`, durées à 0,001 s, une itération, `.reveal` visibles, image du héros sans animation (kit.css:259-266).
- **kit.js** : `reduit` supprime le dévoilement par observateur, la parallaxe, le défilement doux des ancres et le relief (kit.js:8, 158, 183, 222, 253).
- **Chorégraphie** : tout ce qui suit le défilement est sous `(min-width:1024px) and (prefers-reduced-motion:no-preference)` **et** `@supports (animation-timeline: view())` (kit.css:580-581, 626-627, 750-751, 958-959, 1029-1030, 1075-1076, 1157-1158).
- **Téléphone** : dérive seule ; rails liés au pouce par `scroll-timeline`, présentés comme « pas une animation ambiante » (kit.css:560). decisions.md:9 : « Animation lourde sur mobile ? Non : bureau ≥ 1024 px seulement ».
- **Propriétés** : `transform`, `opacity` et `clip` seulement (kit.css:1059). « Un flou animé (filter) sort du compositeur et coûte 400 ms de fil principal sur mobile » (kit.css:100). Le cahier §3.5 ajoute : aucune animation de `filter`, ni d'`opacity` sur la photo ou la toile.
- **Contrôles de site-qa** (site-qa.mjs:406-410, 436-465) :
  - un bloc `prefers-reduced-motion: reduce` existe ;
  - en mouvement réduit, tout est visible sans défiler ;
  - au moins 12 `.reveal` et 3 `.mot` ;
  - plateau, étapes, `<details>` et galerie présents ;
  - aucune `transition` sur width, height, top, left, padding ou margin.

---

## 3. Juges qui touchent la démo, et ce qu'une grosse modification risque de casser

| Juge | Ce qu'il contrôle | Risque avec les cinq familles d'effets |
|---|---|---|
| `scripts/site-qa.mjs <dossier>` (706 l.) | Contrat du dossier, SEO, substance, geste (436-465), devis, rendu, Lighthouse mobile ×4 ≥ 95, LCP < 2 500, CLS < 0,1, TBT < 200 (47-52). Sans argument, sort en erreur (cahier §8.0) | **LCP** à ~15 ms de la barre ; **TBT** avec tout JS au chargement ; `styles.css` bloque le rendu (generer.mjs:339-341) ; nouvelle feuille non liée (523) ; transition sur la mise en page |
| `scripts/nav-retenue-qa.mjs` (175 l.) | Régénère la démo (l.34-38) ; démos gelées inchangées (l.40-44). En 1440×900 et 1280×800 : **exactement un appel visible tous les 150 px** jusqu'à un écran après la fin de `.ouverture` (l.102-117). « Devis » mène au formulaire ; page commune ≤ 1 appel ; burger au téléphone ; lien `tel:` | Tout `.bouton`, `a[href*="#contact"]` ou `tel:` visible dans une scène de récit donne un **doublon**. Une ouverture plus haute (palier de 30svh, vidéo) déplace le relais (kit.js:30-38). Un défilement amorti fausse `scrollTo` en mode `instant` |
| `scripts/demo-usage-qa.mjs --url --sortie` (338 l.) | 7 contrôles exigés sur 7 (l.336) : menu mobile, chaque accès « devis » mène au formulaire (au bureau, défilement par 150 px jusqu'à 4 000 px, l.150-155), polices au premier passage, voix à la première personne, page commune, liens internes en 200, **console sans erreur** | Violation de CSP (vidéo, modèle ou script externe, wasm) : FAIL console. Relais de « Devis » après 4 000 px : FAIL. Nouveaux liens internes en 404 |
| `scripts/demo-video.mjs` + `scripts/video-qa.mjs --profil=landing` | Plans par sélecteur de section (demo-video.mjs:105-113) : `heros` 0,8 s ; `heros_souris` 1,35 s avec défilement de 300 px et attente du relief (233-258) ; étapes épinglées filmées à l'entrée et à la sortie (276-294) ; contact filmé en remontant (309-326). Recalage sur deux flashs blancs (decisions.md:50). video-qa : plan figé ≤ 0,8 s, images « identiques » sous 0,006, coupe au-dessus de 0,085, ≥ 5 coupes par 10 s, 12 à 60 s (l.26-39) ; landing ≤ 1,5 Mo, 16:9, muette (172-206) | Une nouvelle scène épinglée hors de la liste n'est **pas filmée**, ou sort figée (déjà arrivé aux étapes). Le palier de 30svh casse `heros_souris` (cahier §7.6). Une vidéo ou un objet filmé non connu d'`attributions.json` fait échouer `demo-video-licences-test.mjs`. Budget de 1,5 Mo |
| Grille à l'aveugle (`grille-aveugle.mjs`, `grille-qa.mjs --barre=haut`, `demo-images-cles.mjs --viewport=1088x800`) | Démo notée sur **4 images fixes** : `bureau-t25` puis `d30/d60/d100` à 30, 60 et 100 % de la hauteur (grille-aveugle.mjs:77 ; demo-images-cles.mjs:46-50), recadrées au rapport 1,36 (111-126). 1088×800, sans carte graphique (decisions.md:49). Barre au 3e quartile des références | Survol, défilement fluide et mouvement ne se voient **jamais** sur ces images. Une page plus longue change ce que montrent d30 et d60. Un effet qui dépend de WebGL est absent. **Les 11 PNG blancs actuels** (§0.1) |
| `signature-candidats-qa.mjs`, `demo-images-viewport-qa.mjs` | Films des candidats R, L1, L2, RL ; option `--viewport` | Hors de la démo publiée |
| `landing-demo-qa.mjs`, `credits-landing-qa.mjs` | Le texte de `app/DemoSite.tsx` nomme l'escalier et « Fait pour rester », sans chiffre ; ligne de crédits sous la vidéo | Si le héros change (vidéo), le texte alternatif et l'`aria-label` de la landing doivent rester vrais |
| `photos-heros-qa.mjs` (018-08), `photos-lot-qa.mjs` (018-06) | Fichiers `heros-escalier*`, teinte, empreintes et entrées d'attribution inchangées | Tout réencodage du héros ou toute modification de ses entrées dans `attributions.json` |
| Juges prévus par le cahier : `signature-repos-qa.mjs`, `signature-defile-qa.mjs` | **Pas encore écrits** : absents de `scripts/` | Ils figent la boîte, l'origine et les animations du héros et de sa toile (R-3, R-4, R-10, R-16) : toute famille qui touche le héros doit passer après eux |

---

## 4. Le moment signature : ce qui reste à faire, maintenant que Benj garde RL et la descente

**Décision** (decisions.md:54, vers 12 h 57) :
- **Tranché** : Q1 = RL, même sous la cible chiffrée ; Q2 = garder la descente ;
- **Ouvert** : Q3 (roulis) et Q4 (téléphone).

**État des candidats** : R et L2 sont mesurés ; RL est en tournage (020-13, lumière = L2 imposée à 12 h 46).

**Chiffres des candidats à 1088×800** :
- **R** : part > 8 à 0,493 / 0,540, pour une cible de 0,56 ; plage figée de 10 s sur 10 (C2-b non tenu) ; contraste minimal du titre 3,107 (`020-01/R/rapport.md`).
- **L2** : 0,342 / 0,402 ; plage figée 3,25 s ; écart moyen 0,0052 ; C6-a 0,0594 ; contraste 3,31 (`020-01/L2/rapport.md`).

### 4.1 Avant tout exécutant (Claude Code, 020-00 et fin de 020-01)

1. **020-00 — protocole et références.**
   - Consigner le protocole de la grille (1088×800, sans carte graphique, quatre instants du héros).
   - Mesurer les références sur `c62c866` : communes, écart toile/photo, contrastes, P-1 en 5 passes, P-3.
   - Recopier les JSON du cahier dans `presti/.orchestre/preuves/020-signature/`, en JPEG < 5 Mo, avec la règle `.gitignore` posée d'abord (§11).
2. **Annexe A (RL)**, à écrire :
   - le bloc CSS exact : rotation et calque de lumière L2 en `.hero__media::before`, décalé d'un quart de période ;
   - `lumiereCss: true`, E_b 1,07, noms d'animations, `--signature-a` ;
   - les **seuils de R-1, R-2 et R-11 abaissés** à ce que RL mesure, puisque Benj le garde sous la cible ;
   - **à trancher** : la variante V6 de R est asymétrique (−3,25/+2,25° puis −4/+6°), alors que le §6 et le bloc du §7.3 sont symétriques (±2,25 / ±4). Le rapport de R demande de l'écrire dans l'annexe A.
3. **Annexe B (descente)** : δmax 0,116 (dpr 1) et 0,066 (dpr 1,5), `roulisParDelta` (**0**, puisque le geste au repos tourne ; sauf si Benj répond oui à Q3), seuil de D-15, liens des films (`descente/avant-correction/descente-d116.mp4`, `-d066`, `-d116-roulis`, `-sansgpu`).
4. **Écrire les deux juges** et vérifier qu'ils **échouent** sur `c62c866` (R-1, R-2, R-5 et R-11 attendus en échec).

### 4.2 Tâche 020-02 — le geste au repos (exécutant), juge §8.1 `signature-repos-qa.mjs`

**Fichiers** :
- `da.json` : `signature:true`, `relief.texture`, `relief.calme`, `relief.lumiereCss` ;
- `generer.mjs` : classe `da--signature` (l.385), attributs `data-relief-texture/-calme/-lumiere-css` (l.608), refus si la texture est absente (l.820-825) ;
- `kit.css` : bloc 1 (+ 1 bis si R-12 échoue) entre les l.1156 et 1157, tout sous `html.js.da--signature .ouverture>.hero--plein`.

**relief.js** :
- garde `fini` (l.48-49) et `fin()` sûr, qui retire la toile au plus tard après 1 000 ms ;
- `taille()` : dimensions de la toile, `pos` relu à chaque appel, voile calculé sur le h1 tourné ;
- `synchroniser()` au démarrage et à chaque redimensionnement ;
- message `init` avec `texture`, `calme`, `lumiereCss`, `economie` ;
- ResizeObserver qui observe aussi la toile.

**relief-fil.js** :
- texture 2880 en WebGL 2, sans redimensionnement, mipmaps et `LINEAR_MIPMAP_LINEAR`, délai de 3 s, rien si `saveData` ;
- `calme` : dérive 0, terme de 17 s à 0, `uLumiere` 0 si `lumiereCss` ;
- anneau `durees` ; `taille` qui transporte `pos` ; `compte` enrichi.

**Critères** : R-1 à R-16 et P-1 à P-4, plus nav-retenue-qa.
- **Repos, sans carte graphique** :
  - part > 8 (R-1), plage figée et clignotement (R-2), nature du geste (R-3) ;
  - **0 pixel de coin découvert** sur 7 formats, avec déphasage, redimensionnement et barres visibles (R-4) ;
  - C6-a (R-11), contraste p90 ≥ 3,0 sur 5 formats (R-12).
- **Avec carte graphique** :
  - netteté du relief entre 0,90 et 1,15 de la photo, `largeurTexture` = 2880 (R-5) ;
  - hiérarchie des gestes (R-13), chargement lent (R-14) ;
  - contexte perdu pendant le fondu (R-15), cadrage après redimensionnement (R-16).
- **Cas limites** : mouvement réduit (R-6), téléphone inchangé (R-7), sans JS (R-8), sans carte graphique (R-9), pages communes inchangées (R-10).
- **Performance** : Lighthouse ≥ référence − dispersion, jamais sous 90 (P-1) ; `styles.css` ≤ +1 000 octets en brotli (P-2) ; site-qa (P-3) ; `dureeP95` ≤ 16,7 ms (P-4).

### 4.3 Tâche 020-03 — la descente (exécutant, après 020-02 PASS et regardé), juge §8.2 `signature-defile-qa.mjs`

**Fichiers.**
- **kit.css, bloc 2** :
  - palier `margin-top:30svh` sur le plateau (la hauteur de `.ouverture` passe de 1 888 à 2 158 px en 1440×900) ;
  - `signature-palier` : `scale` 1 → 1,04 sur 0-30svh, autour de l'œil ;
  - `signature-efface` sur `.h1__cle` et `.hero__pied` (0-25svh, puis `visibility:hidden`) ;
  - chorégraphie existante décalée de 0,30 h.
- **da.json** : `relief.descente = {palier .30, dmax1 .116, dmax15 .066, roulisParDelta 0|76.923, gamma .6, rw .045, h -1}`.
- **generer.mjs** : `data-relief-descente` et ses contrôles.
- **relief.js** : `descente()` et message horodaté ; `majActif` renvoie `defile` et `descente` à la réactivation ; écoute du changement de condition.
- **relief-fil.js** :
  - uniformes `uDelta`, `uRoulis`, `uRW`, `uGamma` et inversion de Newton en 4 itérations dans le shader ;
  - dessin sur changement, au plus une image toutes les 16 ms ;
  - `dmax` non nul seulement avec WebGL 2 et la texture 2880.

**Critères** : D-1 à D-15, plus R-4 à 0,30 h, R-6, R-8 complet, P-1 à P-4 et nav-retenue-qa.
- **Géométrie** : table du palier à ±1 px (D-1) ; surtitre et pied (D-2) ; titre immobile (D-3).
- **Lisibilité et appels** : un seul appel visible (D-4) ; contraste ≥ 3,0 pendant la descente (D-5).
- **Worker** : il suit la page, y compris après un saut et un onglet caché simulé (D-6) ; course utilisée (D-7) ; budget de grossissement p90 ≤ 1,53 (D-8).
- **Image** : netteté (D-9) ; inversion ≤ 0,5 px, même en demi-précision (D-10).
- **Réactivité** : **latence p95 ≤ 34 ms, max ≤ 50 ms** (D-11) ; 0 tâche longue (D-12).
- **Robustesse et effet** : redimensionnement (D-14) ; la descente se voit, à ≥ 0,9 × le film retenu (D-15).

### 4.4 Tâche 020-04 (Claude Code)

- Adapter `heros_souris` au palier (demo-video.mjs:245-258).
- Rejouer la vidéo et video-qa en profil landing.
- Rejouer la grille sur C2, C6 et C7.
- Montrer le résultat à Benj.

### 4.5 Ce que ça implique pour la vague 5

- **Même boîte que RL, la descente et le relief** : `.hero__media`, `img`, toile, `::before`. Une **vidéo de héros** à cet endroit invalide R-3, R-4, R-5, R-10, R-16 et D-15.
- **Même zone que la barre retenue** : les 30svh de palier et le pied qui s'efface. Le risque 12 du cahier le signale déjà : de y ≈ 180 à 225, deux appels peuvent se voir sur 45 px.
- **Mêmes fichiers que 020-02 et 020-03** : toute tâche de la vague 5 qui touche kit.css, kit.js, relief.js, relief-fil.js, da.json ou generer.mjs **tourne après** elles, ou dans des fichiers de kit séparés (§1.4).
- **Proposition pour Q3 (roulis)** : roulis coupé (ρ = 0), conforme à la hiérarchie des gestes (§1, §3.6) puisque RL tourne déjà au repos. Le film `descente-d116-roulis.mp4` existe pour que Benj compare. Je ne l'ai pas regardé.
- **Proposition pour Q4 (téléphone)**, dans les contraintes relevées :
  - rien en WebGL ;
  - un geste CSS composé seulement, sur le modèle de la lumière L2 (`translate` d'un calque) ;
  - dans une tâche à part, gardée par la médiane Lighthouse ≥ 95 et **LCP < 2 500 ms** ;
  - le récit au téléphone passe par les rails `scroll-timeline` déjà en place, pas par des sections épinglées.
