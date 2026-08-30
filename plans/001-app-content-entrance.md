# Plan 001 — Entrée en cascade du contenu de l'espace connecté

**Sévérité :** LOW (polish / cohésion — catégorie « missed opportunity » d'Emil)
**Leverage :** élevé (effort bas, gain de cohésion fort avec la landing niveau Apple)

## Constat
La landing a une entrée orchestrée (hero cascade, révélations au scroll, spring). L'espace connecté
(`/devis`, `/factures`, `/dashboard`) affiche son contenu **sans aucun mouvement** — rupture de craft
entre le marketing et le produit. Les cartes (`.doc-card`) et les rangées apparaissent d'un coup.

## Correctif
Entrée sobre et physique du contenu de l'app, avec la courbe existante `--ease-apple`
(`cubic-bezier(.16,1,.3,1)`), en fade + légère montée, **en cascade** (stagger léger), transform/opacity
uniquement (perf), **désactivée sous `prefers-reduced-motion`**. Aucune modif JS — pur CSS sur les classes
existantes (`.doc-card`, `.psh-panel`).

## Valeurs exactes
- keyframe `app-in` : `from { opacity:0; transform: translateY(10px) } to { opacity:1; transform:none }`
- durée `.5s`, easing `var(--ease-apple)`, `both`.
- stagger : `nth-child(n)` → delay `(n-1) * .05s`, plafonné à ~6 items.

## Vérification
- Charger `/devis` et `/factures` (avec données) : les cartes montent en cascade, une fois, sans jank.
- `prefers-reduced-motion: reduce` → aucune animation (contenu visible immédiatement).
- Aucune régression de layout (transform n'affecte pas le flux).

Stamp commit : (voir git log au moment de l'exécution)
