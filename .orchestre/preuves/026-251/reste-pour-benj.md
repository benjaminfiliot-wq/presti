# 026-251 — ce qui reste pour Benj (05/10/2026)

1. **Clé Stripe restreinte en lecture** (Balance, Charges, Invoices, Subscriptions) : seul Benj peut la créer dans son compte Stripe ; il la donne une fois, Claude Code la pose dans Vercel sous `STRIPE_CLE_LECTURE_COMPTABLE` sans l'afficher. Le Comptable et le jeton `tresorier` attendent cette clé.
2. **Seuils provisoires de `docs/agents/vigile.json`** (`pause_securite.seuils`, `accord: null`) : à confirmer par Benj avant que la pause de sécurité ne soit en service ; elle reste inerte (aucune pause posée, `pauses: []` au relevé du 05/10).
