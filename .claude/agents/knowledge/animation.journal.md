# Journal d'apprentissage — ANIMATION

Mémoire vivante de la catégorie Animation. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `animation.md`.

## 2026-08-31 — presti-animateur — Amorçage + chat plateforme
- Contexte : refonte cinématique de `/l/[slug]` + chat live + onglet vitrine « Conversation ».
- Constat : révélations `.plat-reveal` via `PlatMotion.tsx` avec filet de sécurité 3 s ;
  bulles `plat-bub-in`, indicateur de frappe `plat-typing`. Thème dérivé de `--pc` (color-mix).
  La démo vitrine `ConversationDemo` réutilise `fsr` + `R(delay)` (cohérent).
- Constat perf : le pane de capture ne composite pas comme un vrai navigateur → vérifier
  le rendu sur `next start` (build de prod), pas en dev.
- À retenir : tout nouvel élément de la plateforme doit utiliser les tokens `--pc*` (jamais
  une couleur corail en dur) pour rester personnalisable ; garder `prefers-reduced-motion`.

## 2026-08-31 — presti-anim-accessibilite — Contraste thème dérivé
- À retenir : le contraste doit tenir sur CHAQUE accent possible (`--pc` libre). Piège
  passé : `--p-mut` trop clair (< AA) corrigé. Re-tester le contraste quand on ajoute un accent preset.

## 2026-08-31 — Animation / Direction artistique — Audit site vitrine Atelier Vasseur
- Contexte : Revue tier-3 white-label (menuisier ébéniste Lyon). Palette sombre chaud, Fraunces,
  Lenis, blocs éditoriaux alternés, 4 mots géants animés, galerie mosaïque.
- **Constat 1 – Hiérarchie typo "mots géants"** : 4 mots (Sur-mesure/Massif/Façonné/Assemblages)
  tous iso-taille, iso-timing, masque wipe + drift identiques → zéro tension, ça sent le template IA.
  **Fix** : échelonner size 40 % (40/38/34/30 px), priority first word en accent ocre, delays 300 ms écart.
- **Constat 2 – Blocs éditoriaux alternance** : sombre/clair/sombre trop mécanique, ressemble à grille.
  **Fix** : décaler y (+1.2rem), ombrer par bloc (nth-child), casser la régularité optique.
- **Constat 3 – Révélations scroll** : cascade .site-reveal partout iso-speed (300 ms). Pas de hiérarchie
  temporelle, feeling très IA. **Fix** : 3 vitesses (fast 200ms hero, mid 300ms bloc, slow 400ms média)
  via `--reveal-speed` CSS tokens.
- **Constat 4 – Voiles images** : SVG placeholders dégradés + voile blanc uniform rgba(255,255,255,.7)
  sur tous. Zéro dramatisation, contraste texte faible. **Fix** : augmenter contrast voile par section
  (hero 0.55, features 0.3, manifesto 0.65), ajouter vignettage radial ::after.
- **Constat 5 – Phrase manifeste** : taille clamp trop petite (~2rem), positionnement loose.
  Manque la monumentalité du cri de marque. **Fix** : augmenter clamp 2.1→3.8rem, ajouter line-height
  1.05, fixer position bottom, accent ocre sur "le bois" final.
- **À retenir** : white-label = zéro redondance. Chaque section doit avoir UN geste fort, le reste calme.
  Hiérarchie temporelle (cascade) tout aussi importante que spatiale. Les voiles/contraste images
  doivent être intégrés à la storytelling (dramatisation progressive), pas uniformes. Template IA se
  repère d'abord à : taille/timing/couleur identiques, absence de respiration temporelle.

## 2026-08-31 — Accessibilité — Revue motion + robustesse (Atelier Vasseur, Lenis + hero ciné)
- Constat & audit : Lenis activé sauf si `prefers-reduced-motion:reduce` → ✓ OK. Hero cinétique avec opacity
  inline (`i.style.opacity=String(Math.max(0,1-1.15*t))`) piloté au scroll JS. Chat `.plat-thread` marqué
  `data-lenis-prevent` ✓. `.site-reveal` transitions 1s opacity+transform, pas de guard `@media(prefers-reduced-motion)`.
  ✓ focus:focus-visible sur inputs/buttons (border-color + box-shadow 3px green-050). Site sombre: --ink #EDEFF4
  (88% lum), --muted #8B93A2 (47% lum) → contrastes globalement AA. Pas d'outline:none destructif sur links.
  Keyboards: arrows/Space/PgDn fonctionnent natifs (scrollBy), Lenis ne bloque pas. HTML sémantique: h1/h2/h3
  présents, header/section/footer, SVG aria-hidden="true" où d'ore. Chat bot: aria-label="Envoyer" ✓.
- Risques identifiés :
  1. **Hero-in opacity à 0 sur reduced-motion** : si JS échoue ou prefers-reduced-motion, contenu reste invisible
     (aucun CSS fallback). Perte complète du hero en mode accessible.
  2. **.site-reveal pas d'exception prefers-reduced-motion** : les 1s transitions continuent même en mode réduit.
     Plus d'impact UX que rupture d'accès, mais non-conforme WCAG orientation.
  3. **Contraste sur voiles (hero-veil, manifesto-veil)** : gradient rgba(16,14,11,.55→.82) sur --sbg. Au calcul
     requis: text clair (--sink) #141210 sur voile doit faire >4.5:1. Pas testé avec --pc accent blond Vasseur.
  4. **Zoom navigateur + Lenis momentum** : pas de blocage détecté (Lenis respecte scrollHeight), mais tactile
     drag peut glisser si friction trop basse (touchMultiplier:1.6 agressif). Mobile non-testée.
  5. **Liens h1/h2 non-suffisamment lisibles au clavier** : pas de visible outline renforcé sur focus, seulement
     border de nav-cta. h1 "Atelier Vasseur" n'est pas un lien → audit correct.
- À retenir : Lenis bien intégré côté accessibilité (guard reduced-motion ✓, thread safe).
  **Le risque n1** : hero-in opacity inline JS sans fallback CSS. Si JS crash ou désactivé, copie du héro
  (le texte posé sur l'image) passe à opacity:0 et devient invisible. Risque: utilisateur pense qu'il n'y a
  rien au-dessus de la page.
