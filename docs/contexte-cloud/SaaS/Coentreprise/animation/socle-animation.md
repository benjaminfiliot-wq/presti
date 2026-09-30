# Base de connaissances — ANIMATION (motion · a11y · direction artistique)

Socle stable de la catégorie Animation. Lire aussi `animation.journal.md`.
Niveau visé : **Apple / Emil Kowalski** — avec retenue (sur-animer = signe de vibecoding).

## 1. Systèmes d'animation existants (à étendre, pas réinventer)

**Tokens d'easing** (`app/globals.css`) :
- `--ease-apple:cubic-bezier(.16,1,.3,1)` (entrées, le plus utilisé)
- `--ease-out:cubic-bezier(.23,1,.32,1)`, `--ease-io` (in-out)
- `--pe` (easing de la plateforme publique)

**Landing (`app/page.tsx`)** :
- Entrée hero en cascade : `lp-in` (delays échelonnés).
- Révélations au scroll : `.reveal` / `.reveal-kids` pilotées par `app/Motion.tsx`
  (IntersectionObserver, `both`, reduced-motion géré).
- Vitrine interactive `FeatureShowcase` : onglets, `.fs-enter` (crossfade + blur au
  changement d'onglet), démos qui se rejouent au montage / au clic / à l'entrée viewport.
  **Règle vitrine** : chaque nouvelle fonctionnalité livrée reçoit son onglet animé
  ([[presti-feature-showcase-rule]]). Compteurs animés `useCount` (0→cible, relancés au montage).

**Espace connecté** : `.doc-card` entrée en cascade `app-in` (devis, factures, listes).

**Plateforme publique (`/l/[slug]`)** : révélations `.plat-reveal` via `PlatMotion.tsx`
(IntersectionObserver, filet de sécurité 3 s qui révèle tout, reduced-motion → tout
visible d'emblée). Aurores `.plat-glow` (drift lent), chat live : bulles `plat-bub-in`,
indicateur de frappe `plat-typing` (3 points).

## 2. Principes de motion (grille d'audit)
Pour chaque animation, se demander :
1. **But & fréquence** : sert-elle la compréhension ? Vue 100×/jour → discrète ; rare → peut marquer.
2. **Easing & durée** : entrées 300–500 ms `--ease-apple` ; micro-interactions 120–200 ms ;
   jamais de `linear` sur du mouvement physique ; sorties plus rapides que les entrées.
3. **Physique & origine** : le mouvement part d'où l'action a lieu (transform-origin cohérent).
4. **Interruptibilité** : une animation ne doit pas bloquer l'utilisateur (annulable/reprenable).
5. **Perf** : **transform + opacity uniquement** (compositing GPU) ; éviter d'animer
   layout (width/height/top/left) et filter coûteux. `will-change` avec parcimonie.
6. **Accessibilité** : `prefers-reduced-motion: reduce` **toujours** géré (désactive ou
   réduit) ; contenu jamais bloqué caché (animations `both` qui finissent à l'état normal).
7. **Cohésion** : réutiliser les tokens et patterns du repo ; ne pas introduire un easing
   ou une durée hors système sans raison.
8. **Opportunités manquées** : transitions d'état, hover, focus, feedback d'envoi, vides.

## 3. Accessibilité & perf (spécialiste a11y)
- `prefers-reduced-motion` : chaque bloc d'animation a sa garde `@media(prefers-reduced-motion:no-preference)` OU un fallback JS (`matchMedia`).
- Focus visible clavier sur tous les interactifs ; ordre de tab logique ; `aria-hidden` sur le décoratif (aurores, grilles).
- Contraste **WCAG AA** (≥4.5:1 texte normal, ≥3:1 gros texte). Piège connu : les gris
  atténués sur fond sombre — vérifier `--p-mut` & co. Le thème plateforme dérive d'une
  seule variable `--pc` via `color-mix` ; vérifier le contraste sur **chaque accent** possible.
- Reduced-motion ne doit pas casser la lisibilité (pas de contenu qui reste à opacity 0).
- Vérifier le **rendu réel** (Playwright headless) : le pane ne composite pas les
  animations comme un vrai navigateur ; capturer sur un `next start` (build de prod).

## 4. Direction artistique / marque (spécialiste marque)
- **White-label** : la plateforme publique ne porte JAMAIS le nom « Presti » (c'est la
  marque de l'artisan). Vérifier headers/footers/titres. La console (espace connecté)
  garde la marque Presti.
- **Système d'accent personnalisable** : `--pc` (accent artisan) → tout le thème dérivé
  par `color-mix` (`--pc2`, `--pcd`, `--psoft`, `--pglow`…). Valider qu'un nouvel élément
  utilise ces tokens et pas une couleur corail codée en dur. Tester plusieurs accents.
- Palette Presti (console) : corail `--accent`/`--co`, verts `--ok`, neutres chauds.
  Typo : display (titres), mono (labels/data). Cohérence du rythme d'espacement.
- Retenue : dépenser l'audace à UN endroit (le « signature ») et garder le reste calme.

## 5. Méthode & sortie
- Recon (stack, tokens, fréquence d'usage) → Audit (grille §2) → Vetting au fichier:ligne
  → Plans **self-contained** dans `plans/NNN-*.md` (valeurs exactes : cubic-bezier, durée,
  keyframes, code prêt à coller). Sévérité : HIGH (feel-breaking), MEDIUM (notablement off),
  LOW (polish). **Ne modifie pas le code source** (plans uniquement).
- Skills : `improve-animations`, `frontend-design`. Mémoires : [[presti-guiding-videos]].
