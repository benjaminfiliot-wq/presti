# Références et support — animations au téléphone (tâche 024-01)

Rédigé le 16/09/2026. Chaque affirmation porte sa source et sa date de lecture (toutes lues le 16/09/2026) ; chaque chiffre
« mesuré » vient d'une mesure faite ce jour par `references-mesures/*.mjs` (Chromium 1243 de Playwright 1.63, appareil
« Pixel 7 », 412 × 839, tactile), fichiers bruts à côté. Rien n'a été mesuré sur un vrai iPhone ni avec WebKit (absent).

## 0. Synthèse opérationnelle (à lire d'abord)

1. **Qui n'a pas les animations liées au défilement.** Chrome Android et Samsung Internet les ont depuis 2023 (115 / 23),
   iOS depuis Safari 26 (15/09/2025), hors du thread principal depuis 26.4 (24/03/2026). Firefox stable ne les a pas
   (préférence activée en Nightly seulement). En France (StatCounter, août 2026), cela laisse **≈ 4 à 11 % des pages vues
   au téléphone sans `view()`** : iPhone restés en iOS 18.7 / 16.7 (dont les XS / XR, bloqués en iOS 18) et Firefox
   Android. Tout ce que la démo met sous `@supports (animation-timeline: view())` n'existe pas pour eux ; au téléphone
   Lestraque, cela touche la citation mot à mot, les verbes de l'atelier et l'éclaté des étapes (telephone.css).
2. **Les références primées n'utilisent pas `view()` du tout** : 0 site sur 8 (mesuré). Elles révèlent à l'entrée (IO ou
   GSAP), découpent le texte, font un héros vivant, et suivent le doigt en JavaScript. Leur niveau ne dépend donc pas
   d'iOS 26 — mais elles le paient : 2,2 à 29,3 Mo transférés pendant la visite, Lighthouse mobile 0,06 à 0,38 et,
   pour cinq d'entre elles, 123 à 181 appels `requestAnimationFrame` par seconde **au repos** (Lenis + GSAP).
   Lestraque : 0,8 Mo, Lighthouse 0,93 et 0 rAF/s au repos. Ne pas
   perdre cet avantage : **pas de Lenis, pas de boucle permanente, pas de polyfill** (15,3 Ko brotli, thread principal,
   dépôt inactif depuis le 26/08/2024).
3. **Chemin à ajouter pour les 4 à 11 %** (même rendu final, sans `view()`), sous `@supports not (animation-timeline: view())`
   et mouvement permis :
   - citation et verbes : **déclenchés** par l'IntersectionObserver existant du kit (classe `.vu`) — opacité 0,55 → 1 et
     `translate` 0,12 em → 0, **500 à 700 ms, ease-out** (`cubic-bezier(.16, 1, .3, 1)` déjà dans le kit ; relevé chez les
     références : 0,5 à 1,3 s pour une révélation, 0,3 à 1,5 s par fragment de texte), décalage de 40 à 60 ms par mot ;
   - éclaté des étapes : soit déclenché (≈ 900 ms à 1,2 s, une fois), soit **lié au défilement en WAAPI** (§ 3.2 :
     `currentTime` piloté par `scrollY`, actif seulement près de la scène, géométrie lue à l'entrée et au
     redimensionnement, progression bornée pour le rebond) — il suit le doigt avec au plus une image de retard, à 30 i/s
     en économie d'énergie ;
   - héros : la rotation et le projecteur sont des animations CSS au temps, pas au défilement : ils tournent déjà sur
     tous les iPhone.
4. **Pièges iPhone à vérifier sur un vrai appareil** (WebKit absent ici, rien de mesuré sous iOS) : iOS 26.0 à 26.4 donne
   une progression fausse près de 0 % et 100 % d'une view timeline (corrigé en 26.5, 11/05/2026 — la citation démarre à
   cover 2 %) ; 26.2 / 26.3 (4,24 % des pages vues iOS) font tourner `view()` sur le thread principal ; en économie
   d'énergie, rAF passe à 30 i/s et la vidéo ne part pas (affiche + bouton lecture, WebKit bug 219889) — sans effet au
   téléphone aujourd'hui, video.js ne s'active qu'à partir de 1 024 px, mais un iPad paysage y entre ; hauteurs en
   `svh` (le kit le fait) ; `decode()` avant de révéler une grande image (calques de l'éclaté).
5. **Accessibilité** : garder le tout sous `prefers-reduced-motion: no-preference` (le kit le fait) et offrir un fondu
   plutôt que rien (WebKit 2017). Point à trancher : la rotation et le projecteur du héros tournent sans fin et
   démarrent seuls ; WCAG 2.2.2 (niveau A) demande un moyen de mettre en pause un mouvement automatique de plus de 5 s
   présenté avec d'autres contenus.

6. **Mesures clés de ce jour** (§ 2) : 6 références primées sur 7 ignorent `prefers-reduced-motion` (Storey seule le
   respecte, en partie) ; Lighthouse mobile 0,06 à 0,38 pour elles contre 0,93 pour Lestraque ; aucune n'appelle
   `startViewTransition` ; deux (Storey, Kononenko) gardent le document à la navigation (Nuxt), rideau de 1,1 s chez
   Kononenko.
7. **Ce qui n'a pas pu être vérifié** : tout comportement WebKit réel (iOS 18 sans `view()`, iOS 26.x avec, économie
   d'énergie, rebond, barre d'adresse) — Chromium seul ici. Le profil « iPhone sans animations liées au défilement » de
   la tâche simule l'absence de `view()`, pas WebKit. Un passage sur un vrai iPhone (iOS 18 et iOS 26) reste nécessaire
   avant de conclure sur la fluidité.

Fichiers : `references-mesures/` (scripts, JSON bruts, captures au téléphone `<site>-0/1/2.jpg`, extraits et rapports
Lighthouse). Relancer : `powershell -File references-mesures/tout-lancer.ps1 -brut <dossier> [-phases normal,reduit,transitions,lighthouse] [-exclure illoca]`.

## 1. Support des animations liées au défilement

### 1.1 Tableau de support (`animation-timeline: scroll()` / `view()`, `ScrollTimeline` / `ViewTimeline`)

| Navigateur | Support | Depuis | Date de sortie | Source |
|---|---|---|---|---|
| Chrome Android | oui | 115 | 18/07/2023 (stable actuelle : 153, 08/09/2026) | BCD `css/properties/animation-timeline.json` (chrome 115, chrome_android « mirror ») ; BCD `browsers/chrome.json` ; article Chrome « Animate elements on scroll with Scroll-driven animations » (05/05/2023) |
| Android WebView (navigateurs intégrés d'Instagram, Facebook… sur Android) | oui | 115 | idem Chrome | BCD `webview_android: mirror` |
| Samsung Internet | oui | 23.0 (moteur Chromium 115) | 18/10/2023 (actuelle : 30.0, Chromium 143, 11/05/2026) | BCD `browsers/samsunginternet_android.json` |
| Safari iOS / iPadOS **et tous les navigateurs d'iPhone** (Chrome, Firefox, Instagram… y sont WebKit) | oui | Safari 26.0 (iOS 26) | 15/09/2025 | WebKit, « WebKit Features in Safari 26.0 » (15/09/2025) ; BCD `browsers/safari_ios.json` ; règle App Store 2.5.6 (« Apps that browse the web must use the appropriate WebKit framework », entitlement d'autre moteur possible pour l'UE et le Japon) |
| Safari iOS — exécution hors du thread principal | oui | Safari 26.4 | 24/03/2026 | WebKit, « WebKit Features for Safari 26.4 » : « the animations driven by scroll position run on the compositor thread, separate from the main thread » |
| Safari iOS — correctifs | — | Safari 26.5 | 11/05/2026 | WebKit, « WebKit Features for Safari 26.5 » : progression fausse d'une view timeline près de 0 % et 100 % ; plage `scroll` ; `animation-play-state: paused` posé dynamiquement non respecté ; timelines mal restaurées au retour depuis le cache avant/arrière |
| Safari macOS | oui | 26.0 (Tahoe, Sequoia, Sonoma) | 15/09/2025 | WebKit, Safari 26.0 |
| Firefox Android et bureau (stable 155 du 01/09/2026) | **non** | — | — | BCD : `firefox: "preview"` ; MDN « Experimental features in Firefox » (modifiée le 15/09/2026) : préférence `layout.css.scroll-driven-animations.enabled`, vraie par défaut en Nightly seulement, fausse en Beta et Release |
| iPhone XS, XS Max, XR | **non, définitivement** | — | — | iOS 26 exige un iPhone 11 ou plus récent (9to5Mac, 15/09/2025) : ces modèles restent sur iOS 18 |

Caniuse (`mdn-css_properties_animation-timeline_view`, données issues de BCD) affichait le 16/09/2026 un usage mondial de
87,22 % et « non supporté » pour Firefox Android (page lue à travers un outil de résumé : BCD et MDN font foi ci-dessus).

Ce qui vient après et n'existe **que dans Chrome** : les animations *déclenchées* au défilement (`timeline-trigger`,
`animation-trigger`), l'équivalent CSS d'un IntersectionObserver. Blog Chrome du 12/12/2025 (« CSS scroll-triggered
animations are coming! ») : Chrome 145 ; BCD `animation-trigger` : Chrome 146 (10/03/2026), Safari `false`, Firefox `false`.
Inutilisable pour l'iPhone. Safari 27 (sorti le 14/09/2026 selon BCD) : l'annonce WWDC26 (08/06/2026) ne mentionne ni
les animations déclenchées ni de changement des animations liées au défilement ; elle annonce le *scroll anchoring*.

Transitions de page entre documents (`@view-transition { navigation: auto }`) : Chrome 126, Safari 18.2, Firefox non
(BCD `css/at-rules/view-transition.json`).

### 1.2 Qui, en France, n'a pas `view()`

Sources : StatCounter Global Stats, France, mobile, **août 2026** (lu le 16/09/2026) — ce sont des parts de pages vues, pas
un parc installé.

- Systèmes : Android 63,73 %, iOS 36,26 %.
- Fabricants : Apple 36,26 %, Samsung 31,55 %, Xiaomi 12,38 %, inconnu 7,68 %, Google 1,99 %, Oppo 1,91 %.
- Navigateurs mobiles : Chrome 60,28 %, Safari 29,95 %, Samsung Internet 4,19 %, Firefox 2,16 %, Opera 0,85 %, Ecosia 0,75 %.
  (Safari 29,95 % < iOS 36,26 % : Chrome, Firefox et les applis sur iPhone sont comptés à part mais tournent sur WebKit.)
- Versions d'iOS (les six affichées) : 26.5 36,46 %, 26.6 33,8 %, 18.7 9,82 %, 26.3 2,27 %, 16.7 2,2 %, 26.2 1,97 % ;
  86,52 % affichés, 13,48 % non détaillés. StatCounter précise que les changements anti-empreinte de Safari faisaient passer
  iOS 26.2 pour 18.7 et 26.1 pour 18.6, corrigé le 19/01/2026.

Calcul (arithmétique sur ces chiffres, pas une mesure) :
- iPhone sans `view()` : au moins 18.7 + 16.7 = **12,02 % des pages vues iOS**, au plus 12,02 + 13,48 = 25,5 % si tout le
  non-détaillé était ancien → **4,36 % à 9,25 % de toutes les pages vues mobiles en France**.
- Firefox mobile (2,16 %) : sur Android, sans `view()` ; sur iPhone, il est WebKit et suit la version d'iOS. Borne haute
  totale : 9,25 + 2,16 = **≈ 11,4 %**.
- Donc : **environ 4 à 11 % des visites au téléphone n'ont aucune animation liée au défilement**. Pour eux, ce qui vit
  sous `@supports (animation-timeline: view())` n'existe pas.
- iOS 26.2 + 26.3 = 4,24 % des pages vues iOS ont `view()` **sur le thread principal** (le passage au compositeur date de
  26.4) : les animations y existent mais peuvent saccader pendant le défilement.

## 2. Ce que font au téléphone les sites de référence (mesuré le 16/09/2026)

### 2.1 Échantillon et méthode

Huit sites d'architectes, de menuisiers ou d'agenceurs primés sur Awwwards (fiches en § 4), plus la démo Lestraque en
ligne comme témoin. MotionSites n'a rien fourni d'exploitable (fiche verrouillée, § 4).

Instrument : `references-mesures/mesurer-references.mjs`, lancé par `tout-lancer.ps1` (attente « aucun `-qa.mjs` » avant
chaque site). Pour chaque site, Chromium headless en appareil « Pixel 7 », script injecté avant la page qui compte :
IntersectionObserver créés et éléments observés (avec leurs options), `transitionrun` / `animationstart` (propriété,
durée, courbe, délai lus dans le style calculé), `document.getAnimations()` à chaque pas (type de timeline compris),
écritures de style en ligne sur transform / opacity / clip-path (animations GSAP invisibles autrement, groupées en rafales),
appels `play()`, écouteurs scroll / touch / wheel et leur option `passive`, requêtes `matchMedia`, appels
`requestAnimationFrame` pendant 3 s de repos après 4 s de chargement, octets reçus par type. Défilement : glissements du
doigt (touchStart, 12 × touchMove de 40 px, touchEnd) jusqu'à trois pas immobiles, 90 pas ou 150 s ; repli `scrollBy` si
le doigt ne fait rien bouger. Deuxième passage identique avec `reducedMotion: 'reduce'`. Transitions de page :
`transitions-page.mjs` clique le premier lien interne. Lighthouse 13.4.1 mobile (réglages par défaut) : `lighthouse-lancer.ps1`.

Limites : Chromium n'est pas WebKit ; headless sans GPU réel (les cadences et Lighthouse sont des ordres de grandeur, pas des
chiffres de téléphone) ; les bannières de cookies ne sont pas acceptées ; les signatures de bibliothèques sont des chaînes
trouvées dans le JS et le CSS téléchargés (présence du code, pas preuve d'usage) ; les courbes des animations GSAP ne sont
pas lisibles (seules leurs durées de rafale le sont).

### 2.2 Relevé brut (passage « mouvement permis », 16/09/2026 entre 21:51 et 22:18, heure de Paris)

| Site | Défilement mesuré | Transfert | rAF/s au repos | IO (créés / éléments) | Bibliothèques repérées | Texte découpé (fragments) | Vidéos | `(hover:none),(pointer:coarse)` / `reduced-motion` interrogés |
|---|---|---|---|---|---|---|---|---|
| Hays Woodworking (menuiserie) | 17 pas, scrollY max 6 426, document 7 265 px | 3,9 Mo | 0 | 0 / 0 | aucune | 2 | 0 | non / oui |
| Marmé (menuiserie, FR) | 6 pas (repli scrollBy), document 839 px : accueil en diaporama plein écran | 2,2 Mo | 0 | 3 / 9 | gsap, SplitText, swiper | 0 | 0 | non / oui |
| Storey (architecte) | 28 pas (repli scrollBy : le glissement du doigt n'a pas fait défiler), scrollY max 10 842 | 5,1 Mo | 124 | 19 / 61 | gsap, ScrollTrigger, SplitText, split-type, lenis | 51 | 0 | oui / oui |
| Nabil Issa (architecte) | 58 pas, scrollY max 24 558 | 8,6 Mo | 124,7 | 0 / 0 | gsap, ScrollTrigger, SplitText, lenis, swiper | 166 | 0 | oui / oui |
| Kononenko (architecte, SOTD) | 27 pas, scrollY max 11 123 | 3,6 Mo | 124,7 | 2 / 23 | gsap, ScrollTrigger, split-type, lenis, three | 0 (lignes en `span.ln`, 166 éléments animés) | 0 | oui / oui |
| 317c → SEVA (architecte, FR) | 30 pas, scrollY max 12 203 | 17,0 Mo | 181 | 0 / 0 | gsap, ScrollTrigger, split-type, swiper (Webflow) | 103 | 0 | oui / oui |
| ERA Residence (SOTM) | 36 pas, scrollY max 14 486 | 29,3 Mo (dont 11,9 Mo de vidéo, 15,7 Mo d'images) | 123,3 | 3 / 3 | gsap, ScrollTrigger, SplitText, split-type, lenis, barba, swiper (Webflow) | 1 569 | 8 WebM 1080 × 1080, 10 s, `muted playsinline loop preload=metadata poster`, lancées par `play()` (8/8 résolues), sans attribut `autoplay` | oui / oui |
| Illoca (WebGL) | 4 pas, budget de 150 s épuisé, document 839 px | 8,2 Mo (6,2 Mo de `fetch`) | 2,3 (rendu WebGL logiciel en headless, non représentatif) | 1 / 2 | gsap, ScrollTrigger, lenis, three | 2 | 0 | oui / oui |
| **Lestraque (témoin)** | 20 pas, scrollY max 7 583 | **0,8 Mo** | **0** | 4 / 47 | aucune | 0 | 0 | non / oui |

Constats transverses (mesurés) :
- **Aucune des huit références n'utilise `animation-timeline`, `view-timeline` ni `scroll-timeline`** (recherche dans tout le
  CSS et le HTML téléchargés) ; seule la démo Lestraque le fait. Le niveau Awwwards au téléphone s'obtient ici en JavaScript
  (GSAP ScrollTrigger dans 6 sites sur 8), donc **sans dépendre de la version d'iOS**.
- Au repos, sans toucher l'écran, cinq références appellent `requestAnimationFrame` 123 à 181 fois par seconde (les sites
  avec Lenis, hors Illoca, sont tous à ≈ 124/s, soit l'ordre de deux boucles à la cadence de l'écran — interprétation) ; Hays, Marmé et
  Lestraque : 0. C'est un coût batterie permanent, et une boucle que l'économie d'énergie d'iOS bride à 30 i/s.
- Écouteurs `touchstart` / `touchmove` / `wheel` déclarés non passifs (`passive: false`) : sur `window` chez Storey,
  Nabil Issa, Kononenko, ERA, Illoca ; sur des éléments chez SEVA, ERA, Illoca ; aucun chez Hays, Marmé, Lestraque.
- `svh/lvh/dvh` présents chez Hays, Storey, Nabil Issa, Kononenko, ERA, Illoca, Lestraque ; absents chez Marmé et SEVA.
- La requête `(hover: none), (pointer: coarse)` est posée par tous les sites à Lenis ou GSAP : elle peut venir de la
  bibliothèque et ne prouve pas à elle seule un remplacement du survol.

### 2.3 Motif par motif

Durées « JS » = médiane des rafales d'écritures de style d'un même type d'élément (≥ 3 écritures, rafale close après
150 ms sans écriture) : c'est la durée d'un tween déclenché, ou d'un geste de défilement quand l'élément suit le doigt
(alors plusieurs rafales par élément). Durées « CSS » = valeurs lues dans le style calculé au `transitionrun` /
`animationstart`.

| Motif | Exemples réels mesurés | Durée / courbe relevée | Coût relevé | Accessibilité relevée / documentée |
|---|---|---|---|---|
| Révélation à l'entrée (IO + transition, ou tween GSAP déclenché) | Kononenko https://kononenkogroup.com/ : IO `rootMargin 50% 0px`, 29 `transform` ; Storey https://www.storeyarchitecture.co.uk/ : 19 IO sur 61 éléments, `rootMargin 60% 0px 60% 0px`, 70 lignes `div.appear-line`, 4 images `scale-[1.05] opacity-0` ; SEVA https://www.317c.net/ : 18 `div.fade-up` ; ERA : 3 IO au seuil 0,2 | Kononenko CSS 0,5 s `cubic-bezier(0.17, 0.84, 0.44, 1)` ; Storey JS lignes 731 ms, images (échelle 1,05 + opacité) 865 ms ; SEVA JS 1 299 ms ; Lestraque CSS 0,55 s `cubic-bezier(0.2, 0.7, 0.2, 1)`. (Les courbes CSS vues ailleurs servent aux couleurs du menu : ERA 0,4 et 0,8 s `cubic-bezier(0.25, 1, 0.5, 1)`, Nabil Issa 0,6 s `cubic-bezier(0.83, 0, 0.17, 1)`.) NN/g : 100 à 500 ms pour l'interface, ease-out à l'entrée | nul au repos quand c'est IO + CSS (Lestraque, Hays : 0 rAF/s) ; boucle permanente quand c'est GSAP + Lenis (≈ 124 rAF/s) | réduire en fondu court ; ne jamais cacher le contenu sans JS (le kit pose `html.js`) |
| Texte révélé mot à mot / ligne à ligne | ERA https://era-residence.com/ : 1 569 fragments (277 lettres, 83 lignes animées, 324 ms par ligne) ; SEVA : 143 mots `span.tricksword`, 1 498 ms par mot (transform + opacité) ; Nabil Issa https://nabilissa.com/ : lignes `split-line` en opacité 598 ms ; Kononenko : 166 lignes `span.ln`, mots `span.wd` 1 089 ms ; Marmé https://marme.fr/ : titre tapé lettre à lettre, `typeIn` / `typeOut` 0,1 s par lettre, curseur 1 s en boucle | 0,3 à 1,5 s par fragment, décalés | nœuds DOM en plus (1 569 chez ERA) ; SplitText : « Only split what you need » (docs GSAP) | SplitText pose `aria-label` sur le parent et `aria-hidden` sur les fragments (docs GSAP) ; la démo Lestraque découpe 15 mots en `span.citation__mot` |
| Héros vivant | Hays https://www.hayswoodworking.com/ : `zoomOutImage` 2,5 s `ease` sur le `picture` (zoom arrière d'entrée, une fois) + rideau `clip-path` 1 s ; Storey : diaporama du héros, barres de progression `scale-x` de 10,5 s par image ; SEVA : 2 207 écritures de `transform` sur l'image du héros en 36,9 s ; ERA : 8 vidéos WebM en boucle de 10 s ; Lestraque : rotation 10 s aller-retour + projecteur 9 s `linear` infini | zoom d'entrée 2,5 s ; cycles de 9 à 10,5 s | vidéo : 11,9 Mo reçus chez ERA pendant la visite ; Ken Burns ou rotation : une grande couche composée (§ 3.4) | WCAG 2.2.2 : un mouvement automatique de plus de 5 s demande pause / arrêt / masquage ; iOS économie d'énergie : vidéo remplacée par son affiche + bouton lecture (§ 3.4). Aucun Ken Burns en CSS dans l'échantillon ; le mouvement du héros de SEVA (écriture de `transform` à ≈ 60 par seconde en une seule rafale de 36,9 s, défilement compris) peut être un zoom lent ou une parallaxe : nature non identifiée |
| Scènes épinglées au doigt | Nabil Issa : 7 scènes `position: sticky` (parent ≥ 1,5 × la scène, scène ≥ 40 % d'écran) ; SEVA et ERA : 2 ; Illoca : 6 `pin-spacer` GSAP ; Hays, Storey, Kononenko, Lestraque : aucune au téléphone | défilement = durée | `position: sticky` tient au compositeur (Firefox Source Docs) ; épinglage GSAP = `position: fixed` ou transform recalculé en JS | — |
| Survol remplacé | CSS sous `@media (hover: hover)` : Hays, Nabil Issa, Illoca, Lestraque ; règles `(hover: none)` / `(pointer: coarse)` dans le CSS : Marmé, ERA, Illoca. L'instrument ne touche l'écran que pour défiler (aucun toucher simple simulé) : le remplacement du survol par un toucher n'a pas été cherché. Ce que les références montrent au téléphone sans toucher, c'est l'entrée dans l'écran (lignes ci-dessus) | — | — | un effet réservé au survol ne doit pas porter d'information |
| Compteurs | **aucun compteur de chiffres clés confirmé** : Kononenko révèle « 15+ », « 490+ », « 45+ », « 40K » par masque de ligne (texte fixe) ; un nombre `p.fn-h4` y passe de 45 à 97 pendant le chargement (probablement le pourcentage du préchargeur, non confirmé) ; ERA : fragments re-créés, pas de décompte | — | — | un compteur doit avoir sa valeur finale dans le HTML (lecteurs d'écran, pas de JS) |
| Parallaxe légère | Nabil Issa : 14 `div.parallax-image` (2,6 rafales par élément) et 15 `img.inner-img` (5,1 rafales par élément) suivent le défilement ; ERA : `img.img-p` 4,7 rafales, fleurs décoratives 7 à 9 ; Storey : `credit__glass-inner` 8 | suit le doigt | écritures de `transform` à chaque image pendant le défilement (thread principal) | parallaxe = déclencheur vestibulaire cité par WebKit (2017), web.dev et WCAG 2.3.3 |

### 2.4 Mouvement réduit : qui l'honore (second passage, `reducedMotion: 'reduce'`, 22:19 à 22:42)

`matchMedia('(prefers-reduced-motion: reduce)')` répondait vrai dans les huit pages. Comparaison des mêmes compteurs :

| Site | Évènements `transitionrun` | `animationstart` | Écritures de style JS (transform / opacité / clip ; 20 types d'éléments les plus écrits) | IO (créés / éléments) | Texte découpé | Verdict |
|---|---|---|---|---|---|---|
| Hays | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | 2 → 2 | inchangé : le zoom d'entrée de 2,5 s du héros joue quand même |
| Marmé | 0 → 0 | 59 → 62 | 6 → 10 | 3/9 → 3/9 | 0 → 0 | inchangé : le titre tapé lettre à lettre continue |
| Storey | 6 → 6 | 0 → 0 | 8 491 → 5 199 | 19/61 → 1/43 | 51 → 4 | **partiel** : plus de lignes révélées ni de texte découpé ; images (échelle 1,05 + opacité) et barres du diaporama restent |
| Nabil Issa | 139 → 139 | 46 → 46 | 7 405 → 7 132 | 0 → 0 | 166 → 166 | inchangé : parallaxe, lignes, bandeau de 33 s |
| Kononenko | 30 → 30 | 0 → 0 | 7 993 → 7 938 | 2/23 → 2/23 | 0 → 0 | inchangé |
| SEVA | 331 → 328 | 0 → 0 | 56 070 → 54 230 | 0 → 0 | 103 → 103 | inchangé : mots révélés en 1,5 s |
| ERA | 92 → 92 | 3 → 3 | 11 812 → 9 598 | 3/3 → 3/3 | 1 569 → 1 675 | inchangé : vidéos (8 `play()` résolus), bandeau de 32 s, parallaxe |
| **Lestraque** | 102 → 140 (toutes à 0,001 s) | 38 → 4 | 0 → 0 | 4/47 → 2/14 | 0 → 0 | **honoré** : rotation, projecteur, mots, verbes, éclaté coupés ; reste la jauge de lecture (`ScrollTimeline`) |

Six références primées sur sept mesurées ignorent le réglage dans ce qui a été compté (Illoca non repassée). C'est un
point où la démo fait mieux que la référence ; le garder dans tout repli (§ 0).

### 2.5 Transitions de page (clic sur le premier lien interne, relevé 3 s, 22:42 à 22:44)

| Site | Lien cliqué | Document | `startViewTransition` | Ce qui s'anime pendant le changement (CSS) |
|---|---|---|---|---|
| Hays | /showroom/ | rechargé | 0 | fondu d'arrivée `fadeIn` 500 ms |
| Marmé | /entrees/ (domaine menuiserieretaise.fr) | rechargé | 0 | rien de notable (une couleur 300 ms) |
| Storey | /projects | **conservé** (1 `pushState`, Nuxt) | 0 | couleur 500 ms ; le reste éventuel est en JS, non relevé par cette sonde |
| Nabil Issa | — | aucun `<a href>` interne trouvé (navigation en JS) | — | non mesuré |
| Kononenko | /work | **conservé** (1 `pushState`, Nuxt) | 0 | rideau `::before` en `transform` 1 109 ms `cubic-bezier(0.17, 0.84, 0.44, 1)` |
| SEVA | /projets (domaine seva.archi) | rechargé | 0 | opacités 250 à 400 ms |
| ERA | /apartments | rechargé (le code de Barba est présent, la navigation mesurée a rechargé) | 0 | `visibility` 400 et 800 ms `cubic-bezier(0.25, 1, 0.5, 1)` sur 65 relevés |

Aucune référence n'appelle `document.startViewTransition`. Les transitions « de marque » (rideau de 1,1 s chez Kononenko)
supposent une application monopage ; pour un site statique comme la démo, l'équivalent natif est
`@view-transition { navigation: auto }` (Chrome 126, Safari 18.2, rien chez Firefox : BCD) — il se dégrade en navigation
normale là où il manque.

### 2.6 Lighthouse mobile (13.4.1, throttling simulé par défaut, 22:45 à 22:52)

Chaque passage précédé du contrôle « aucun `-qa.mjs` ». Lighthouse a averti partout que la machine est plus lente
qu'attendu (benchmarkIndex 632 à 850) : les scores absolus sont pessimistes, la comparaison entre sites reste valable.
Extraits : `references-mesures/<site>.lighthouse.json` ; rapports complets : `references-mesures/lighthouse-brut/*.json.gz`.

| Site | Score perf. | FCP | LCP | TBT | CLS | Poids au chargement | Temps d'exécution JS |
|---|---|---|---|---|---|---|---|
| Hays | 0,34 | 7,1 s | 13,0 s | 860 ms | 0,076 | 2,1 Mo | 5,6 s |
| Marmé (redirigé vers menuiserieretaise.fr) | 0,27 | 6,8 s | 13,4 s | 3 763 ms | 0,018 | 2,6 Mo | 7,9 s |
| Storey | 0,38 | 2,7 s | 15,2 s | 1 379 ms | 0 | 4,9 Mo | 3,5 s |
| Nabil Issa | 0,25 | 10,5 s | 27,5 s | 5 518 ms | 0 | 7,6 Mo | 8,9 s |
| Kononenko | 0,06 | 4,4 s | 8,1 s | 3 011 ms | 0,813 | 3,1 Mo | 5,7 s |
| SEVA (317c.net redirigé vers seva.archi) | 0,29 | 3,8 s | 10,7 s | 4 320 ms | 0,013 | 6,8 Mo | 11,0 s |
| ERA (redirigé vers www.) | 0,36 | 3,3 s | 5,8 s | 3 352 ms | 0,000 | 10,1 Mo | 6,9 s |
| **Lestraque** | **0,93** | 1,1 s | 2,4 s | 192 ms | 0 | 0,3 Mo | 0,1 s |

Lecture : le « niveau Awwwards » de l'échantillon se paie en Lighthouse mobile (0,06 à 0,38), surtout en TBT (bibliothèques
d'animation, découpe du texte, lissage du défilement). La démo est à 0,93 : **un repli sans `view()` doit rester en CSS +
IntersectionObserver (+ WAAPI ciblé), sans bibliothèque**, pour ne pas rejoindre ces chiffres.

## 3. Techniques sans `animation-timeline` qui tiennent au téléphone

### 3.1 Déclenché : IntersectionObserver + transition CSS (le socle, partout)

- Principe : un observateur ajoute une classe une fois (`.vu`), puis `unobserve` ; la classe lance une transition de
  `opacity` / `transform` / `translate` / `clip-path`. Au repos, zéro travail ; pendant le défilement, rien ne tourne tant
  qu'aucun seuil n'est franchi.
- Pourquoi ça tient : MDN (« Intersection Observer API », modifiée le 02/09/2026) — l'ancienne méthode (écouteurs +
  `getBoundingClientRect()`) « runs on the main thread » ; l'observateur laisse le navigateur optimiser, mais son rappel
  s'exécute sur le thread principal et doit rester court. Il n'est pas précis au pixel (« around N% »).
  web.dev « Animations guide » (06/10/2020) : se limiter à `opacity` et `transform` pour rester à l'étape de composition,
  `will-change` avec parcimonie. Lighthouse « Avoid non-composited animations » (page du 08/12/2024) : une animation non
  composée saccade sur téléphone modeste et compte dans le CLS.
- Réglages vus chez les références (§ 2) : `rootMargin` large pour précharger (Storey « 60% 0px 60% 0px », Kononenko
  « 50% 0px », Marmé « 300px » pour le chargement paresseux), seuil 0,2 chez ERA. Le kit Presti utilise déjà
  `threshold: .12, rootMargin: '0px 0px -6% 0px'` (kit.js l. 159).
- Limite : ce n'est pas lié au défilement — l'effet part et finit à sa propre durée ; il ne recule pas quand on remonte
  (sauf si l'on retire la classe à la sortie).

### 3.2 Lié : Web Animations API dont `currentTime` suit le défilement

Le repli le plus fidèle à `view()` là où `view()` manque. Squelette (même vocabulaire que `animation-range: cover a% cover b%`) :

```js
if (!(window.CSS && CSS.supports('animation-timeline: view()')) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const scene = document.querySelector('#etapes figure.eclate')
  // valeurs en px calculées une fois (var() dans les images-clés WAAPI : non vérifié sous WebKit)
  const anims = [...scene.querySelectorAll('.eclate__calque')].map(img =>
    img.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${img.dataset.dx}px, ${img.dataset.dy}px)` }],
      { duration: 1000, fill: 'both', easing: 'linear' }))
  anims.forEach(a => a.pause())
  let haut = 0, h = 0, vh = 0, actif = false, attendu = false
  const mesurer = () => { const r = scene.getBoundingClientRect(); haut = r.top + scrollY; h = r.height; vh = innerHeight }
  const peindre = () => {
    attendu = false
    const cover = (scrollY + vh - haut) / (vh + h)                   // 0 : haut de la scène au bas de l'écran ; 1 : bas au haut
    const p = Math.min(1, Math.max(0, (cover - 0.12) / (0.45 - 0.12))) // cover 12 % → 45 % ; borne aussi le rebond iOS
    anims.forEach(a => { a.currentTime = p * 1000 })
  }
  new IntersectionObserver(([e]) => { actif = e.isIntersecting; if (actif) { mesurer(); peindre() } },
    { rootMargin: '25% 0px' }).observe(scene)
  addEventListener('scroll', () => { if (actif && !attendu) { attendu = true; requestAnimationFrame(peindre) } }, { passive: true })
  addEventListener('resize', () => { if (actif) { mesurer(); peindre() } })
}
```

- Coût : un calcul par image, seulement quand la scène est proche (observateur) ; la géométrie est lue à l'entrée et au
  redimensionnement, jamais par image (pas de mise en page forcée). Les propriétés animées restent composées.
- Limites documentées :
  - retard d'au moins une image sur le défilement asynchrone : « the visual scroll position is updated in the compositor
    thread and is visible to the user before the `scroll` event is updated in the DOM » (Firefox Source Docs,
    « Scroll-linked effects ») → réserver ce repli à des effets où une image de retard ne se voit pas (opacité, glissement
    court, éclaté), jamais à un faux « collant » (utiliser `position: sticky`, que la même page recommande) ;
  - iOS en mode économie d'énergie : `requestAnimationFrame` limité à 30 images/s (WebKit bug 168837, corrigé le
    28/02/2017) ; Motion Magazine (M. Perry, 01/10/2020) ajoute que les animations CSS le sont aussi ; les iframes
    d'autre origine sont bridées tant qu'on n'y a pas touché ;
  - Safari rend par défaut près de 60 Hz même sur écran 120 Hz (drapeau « Prefer Page Rendering Updates near 60fps »,
    MacRumors et iDownloadBlog 04/05/2026 ; README de Lenis : « capped to 60fps on Safari ») ;
  - c'est l'approche de Motion (`scroll()` : « ScrollTimeline API where possible », calcul JS sinon) et de GSAP
    ScrollTrigger `scrub`.
- **Non vérifié ici** (pas de WebKit) : cadence réelle des événements `scroll` pendant l'inertie sur iOS 16–18. À valider sur
  un vrai iPhone avant d'en dépendre.

### 3.3 Polyfill `scroll-timeline` (flackr) — à éviter ici

Mesuré le 16/09/2026 sur `https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js` :
**61 347 octets bruts, 16 930 en gzip -9, 15 308 en brotli**. Paquet npm `scroll-timeline-polyfill` : dernière version 1.1.0
du 15/05/2024 ; dépôt : dernier commit le 26/08/2024, 86 tickets ouverts (API GitHub). Le code contient un écouteur `scroll`
et trois `requestAnimationFrame` : tout passe par le thread principal, comme 3.2, avec 15 Ko de plus et une réécriture
du CSS. README : les feuilles doivent être sur le même domaine ou dans un `<style>`, sinon « the polyfill might not be
able to fetch and apply them ». Non testé : s'il lit les règles placées sous `@supports (animation-timeline: view())` —
le moteur, lui, jugera toujours la condition fausse, donc ces blocs du kit resteraient inactifs.

### 3.4 Pièges iOS (et Android) à traiter quel que soit le chemin

| Piège | Ce qui se passe | Parade | Source |
|---|---|---|---|
| Barre d'adresse | la hauteur visible change en défilant ; `100vh` = grande fenêtre | `svh` pour le héros et les scènes (stables), `dvh` seulement pour ce qui doit suivre (relayout pendant le défilement), `lvh` pour un fond qui doit toujours couvrir | WebKit « New WebKit Features in Safari 15.4 » (14/03/2022) ; BCD : Chrome 108, Firefox 101, Safari 15.4 |
| Recalcul au redimensionnement | les scripts de défilement recalculent tout quand la barre bouge | ignorer les variations verticales de moins de 25 % sur écran tactile (GSAP `ignoreMobileResize`, depuis 3.10.0) ; dans 3.2, `mesurer()` sur `resize` ne coûte qu'une lecture | GSAP docs `ScrollTrigger.config()` |
| Clavier Android | depuis Chrome 108 il ne redimensionne plus que le viewport visuel | rien à faire pour une vitrine ; `interactive-widget` si besoin | Chrome for Developers, 28/10/2022 |
| Rebond (rubber-band) | `scrollY` négatif ou au-delà du bas | borner la progression (3.2) ; `overscroll-behavior` depuis Safari 16 (sans effet sur un conteneur sans débordement) | BCD `overscroll-behavior` |
| Décodage d'image | la première peinture d'une grande image décode sur le fil et fait sauter l'animation qui la révèle | `decoding="async"`, et `await img.decode()` avant d'ajouter la classe qui révèle ; images à la taille affichée × densité (iPhone 13 : 390 px × 3) | BCD : `decode()` et `decoding` Safari 11.1 |
| Couche en mouvement (Ken Burns, rotation) | une image plein écran composée en densité 3 pèse ≈ 1 170 × 2 532 × 4 octets = 11,3 Mio de mémoire graphique (calcul) | une seule grande couche animée à la fois ; durée longue et amplitude faible | web.dev « Animations guide » (nombre de couches) |
| Vidéo en lecture auto | autorisée si `muted` (ou sans piste audio) + `playsinline` ; se met en pause hors écran ; `display:none` / `visibility:hidden` exigent un geste ; `play()` renvoie une promesse rejetée sinon | `muted playsinline loop preload="metadata"` + `poster` identique à la première image ; `play().catch()` → garder l'affiche | WebKit « New <video> Policies for iOS » (25/07/2016) |
| Économie d'énergie iOS | **lecture auto désactivée**, bouton lecture affiché : « Autoplay is disabled when in low power mode to conserve battery » (Eric Carlson, Apple) | l'affiche doit suffire seule ; repli animé en CSS sur l'affiche si l'on veut du mouvement | WebKit bug 219889 (15/12/2020, RESOLVED WONTFIX) |
| Défilement « doux » (Lenis) | boucle `requestAnimationFrame` permanente ; `syncTouch` « can be unstable on iOS<16 » | défilement natif au doigt (défaut de Lenis : `syncTouch` faux) | README Lenis (v1.3.26) ; mesures § 2 |
| Mouvement réduit | iOS « Réduire les animations », Android « Supprimer les animations » → `prefers-reduced-motion: reduce` | réduire plutôt que tout retirer : fondu à la place de zoom, rotation, parallaxe (déclencheurs vestibulaires) | WebKit « Responsive Design for Motion » (J. Craig, 15/05/2017) ; web.dev « prefers-reduced-motion » (T. Steiner) ; WCAG 2.3.3 (AAA) cite la parallaxe |
| Mouvement de plus de 5 s lancé tout seul | vidéo en boucle, bandeau défilant, Ken Burns infini | un moyen de mettre en pause, arrêter ou masquer (niveau A) | WCAG 2.2.2 Pause, Stop, Hide |

## 4. Sources (toutes lues le 16/09/2026)

Support et versions
- MDN browser-compat-data (branche main) : https://github.com/mdn/browser-compat-data — fichiers `css/properties/animation-timeline.json`, `api/ViewTimeline.json`, `css/properties/animation-trigger.json`, `css/at-rules/view-transition.json`, `css/types/length.json`, `css/properties/overscroll-behavior.json`, `api/HTMLImageElement.json`, `browsers/{chrome,firefox,safari_ios,samsunginternet_android}.json`
- caniuse : https://caniuse.com/mdn-css_properties_animation-timeline_view
- WebKit, Safari 26.0 (15/09/2025) : https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- WebKit, Safari 26.4 (24/03/2026) : https://webkit.org/blog/17862/webkit-features-for-safari-26-4/
- WebKit, Safari 26.5 (11/05/2026) : https://webkit.org/blog/17938/webkit-features-for-safari-26-5/
- WebKit, WWDC26 / Safari 27 beta (08/06/2026) : https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/
- WebKit, guide des animations liées au défilement (S. Yitbarek, 20/06/2025) : https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/
- Chrome for Developers, Scroll-driven animations (05/05/2023) : https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- Chrome for Developers, scroll-triggered animations (12/12/2025) : https://developer.chrome.com/blog/scroll-triggered-animations
- MDN, fonctionnalités expérimentales de Firefox (modifiée le 15/09/2026) : https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features
- Apple, App Review Guidelines 2.5.6 : https://developer.apple.com/app-store/review/guidelines/
- 9to5Mac, appareils compatibles iOS 26 (15/09/2025) : https://9to5mac.com/2025/09/15/ios-26-supports-these-recent-iphones-but-drops-three-models/

Audience France (StatCounter, août 2026)
- https://gs.statcounter.com/os-market-share/mobile/france
- https://gs.statcounter.com/vendor-market-share/mobile/france
- https://gs.statcounter.com/browser-market-share/mobile/france
- https://gs.statcounter.com/ios-version-market-share/mobile/france

Techniques, performance, pièges
- MDN Intersection Observer API (02/09/2026) : https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- Firefox Source Docs, Scroll-linked effects : https://firefox-source-docs.mozilla.org/performance/scroll-linked_effects.html
- web.dev, Animations guide (06/10/2020) : https://web.dev/articles/animations-guide
- Lighthouse, Avoid non-composited animations (08/12/2024) : https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations
- Motion, `scroll()` : https://motion.dev/docs/scroll
- Motion Magazine, When browsers throttle requestAnimationFrame (M. Perry, 01/10/2020) : https://motion.dev/magazine/when-browsers-throttle-requestanimationframe
- WebKit bug 168837, rAF à 30 i/s en économie d'énergie (24/02/2017) : https://bugs.webkit.org/show_bug.cgi?id=168837
- WebKit bug 219889, lecture auto coupée en économie d'énergie (15/12/2020) : https://bugs.webkit.org/show_bug.cgi?id=219889
- WebKit, New <video> Policies for iOS (25/07/2016) : https://webkit.org/blog/6784/new-video-policies-for-ios/
- WebKit, Safari 15.4 et unités svh/lvh/dvh (14/03/2022) : https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/
- Chrome for Developers, redimensionnement du viewport au clavier (28/10/2022) : https://developer.chrome.com/blog/viewport-resize-behavior
- MacRumors, 120 Hz dans Safari : https://www.macrumors.com/how-to/enable-smoother-120hz-browsing-in-safari/ ; iDownloadBlog (04/05/2026) : https://www.idownloadblog.com/2026/05/04/120fps-browsing-safari/
- Polyfill scroll-timeline : https://github.com/flackr/scroll-timeline ; https://www.npmjs.com/package/scroll-timeline-polyfill
- GSAP ScrollTrigger : https://gsap.com/docs/v3/Plugins/ScrollTrigger/ ; `config()` : https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()/ ; SplitText : https://gsap.com/docs/v3/Plugins/SplitText/ ; GSAP gratuit (Webflow, 30/04/2025) : https://webflow.com/blog/gsap-becomes-free
- Lenis README : https://github.com/darkroomengineering/lenis

Accessibilité et durées
- WebKit, Responsive Design for Motion (J. Craig, 15/05/2017) : https://webkit.org/blog/7551/responsive-design-for-motion/
- web.dev, prefers-reduced-motion (T. Steiner) : https://web.dev/articles/prefers-reduced-motion
- WCAG 2.2, 2.2.2 Pause, Stop, Hide : https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- WCAG 2.2, 2.3.3 Animation from Interactions : https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- NN/g, Animation duration (P. Laubheimer, 09/02/2020) : https://www.nngroup.com/articles/animation-duration/

Références (fiches Awwwards lues le 16/09/2026)
- Hays Woodworking, mention d'honneur 26/06/2025 : https://www.awwwards.com/sites/hays-woodworking-group-inc → https://www.hayswoodworking.com/
- Marmé – Menuiserie Rétaise, mention d'honneur 15/09/2020 (sphynx.studio, WordPress) : https://www.awwwards.com/sites/marme-menuiserie-retaise → https://marme.fr/
- Storey Architecture, mention d'honneur 20/08/2026 (Dirty Martini ; DatoCMS, GSAP, Nuxt) : https://www.awwwards.com/sites/storey-architecture → https://www.storeyarchitecture.co.uk/
- Nabil Issa Architect, mention d'honneur 14/08/2026 (The First The Last ; GSAP, Vue, Nuxt) : https://www.awwwards.com/sites/nabil-issa-architect → https://nabilissa.com/
- Kononenko Architectural Bureau, site du jour 23/08/2026 : https://www.awwwards.com/sites/kononenko-architectural-bureau → https://kononenkogroup.com/
- 317c Architectes, mention d'honneur 21/06/2023 (polish_) : https://www.awwwards.com/sites/317c-architectes → https://www.317c.net/ (le domaine affiche aujourd'hui « SEVA ARCHITECTURE », Webflow : ce n'est plus forcément le site primé)
- ERA Residence, site du mois août 2026 : liste https://www.awwwards.com/websites/architecture/ → https://era-residence.com/
- Illoca, site du jour 04/09/2026 : liste https://www.awwwards.com/websites/architecture/ → https://illoca.unseen.co/
- MotionSites (connecteur appelé le 16/09/2026) : `search_prompts` répond ; la fiche « Cordex » (catégorie Manufacturing) est verrouillée (`free_limit_reached`, 0 prompt gratuit restant) → aucune donnée MotionSites exploitable ici.
