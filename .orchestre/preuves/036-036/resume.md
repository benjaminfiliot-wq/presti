# 036-036 — reprise locale du 03/11/2026

- Changements antérieurs relus avec `git diff` avant poursuite : `lib/evenements/ecrivain.ts`, `lib/evenements/departements.ts`, `app/api/cron/relances/route.ts`, `app/api/devis/route.ts`.
- Ajout du calendrier public des jours fériés sans donnée de compte ; une panne conserve les relances dues. Le fait `relance_due` est maintenant écrit après la prise atomique, avec STOP inconnu quand il n'est pas lu.
- Ajout du juge hors ligne à six mutants et inscription à `SUITES`. Rejeu fictif des quatre faits du matin et des six cartes sourcées : vert. Voir `qa-hors-ligne.txt`.
- Les sources n8n dans `noeuds/` sont locales. Le MCP `n8n-oracle` est absent des outils actifs et l'hôte du navigateur est indisponible ; **aucune publication ni exécution n8n, aucune carte réelle observée**.
- Le vérificateur de l'orchestre, npm, npx et le build n'ont pas été lancés, conformément au prompt d'exécution Codex. La session principale doit les lancer hors bac à sable et fournir les preuves réelles de chaque département.
