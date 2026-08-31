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
