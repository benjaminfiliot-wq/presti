# Journal — sprint « audit final total » (prompt v6)

> Format : `[bloc] titre — début → fin (durée) — statut`, cumul à chaque fin de bloc.
> **Règle du sprint : 0 appel IA sur la réserve Anthropic de Presti.** Compteur affiché à chaque bloc.
> Claude Code tourne sur **abonnement** (limite de session observée le 04/09 à 19 h 20, pas de clé API) → coût marginal nul, auditeurs lancés en deux vagues.

## [0] Cadrage — 00:55 → … — en cours
- Relu : journal-v5, audit-v5, apres-demo, demo-parcours, couts-et-solde, fournisseurs, tout-verifier (33 suites : 19 gratuites, 10 navigateur, 3 IA, 1 build).
- Existant confirmé : `verif-supabase-reglages.mjs`, `run-migration.mjs`, `coentreprise.mjs`, `ai-eval.mjs`, Husky pre-commit, `.github/workflows/qualite.yml`, 13 agents `presti-*`, skills `tdd`, `triage`, `code-review`, `diagnosing-bugs`, `presti-ai-lab`, `review-animations`, `improve-animations`.
- Absent (à livrer) : `.github/workflows/audit.yml`, `lib/alertes.ts`, `scripts/alertes-e2e.mjs`, `scripts/abonnement-e2e.mjs`, `scripts/inventaire-produit.mjs`, `plans/{inventaire-produit,couverture,promesses,audit-final}.md`.
- Surface à auditer : **56 routes API, 30 pages**, 56 migrations, drapeaux, emails, 2 crons.
- Garde-fou IA local : la clé Anthropic de `.env.local` est mise en commentaire pour la durée du sprint (tout script local qui l'appellerait échoue en 401 → défaut visible). La prod garde sa clé.
- Stripe est en **mode RÉEL** (vérifié le 04/09) → §4 attend H4 (clé de test) pour ne rien débiter.

**Appels IA du sprint : 0**
