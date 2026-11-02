# Sécurité — à respecter absolument

Décision de Benj du 01/11/2026 (addendum §7), plus les règles de sécurité de l'ancien `CLAUDE.md`.
Pourquoi des trois exceptions : vault `C:/Users/benja/Documents/SaaS`, notes posées le 01/11/2026 (phase 1.4) :
`10 Presti/04 Décisions/ADR-005 — Prospection e-mail automatique.md`,
`10 Presti/04 Décisions/ADR-006 — Vidéos et carrousels - validation initiale puis auto.md`.

## Les règles
- Aucun secret versionné. `scripts/garde-commit.mjs` bloque au pré-commit les motifs déjà vus,
  dont les clés Stripe live, Anthropic et Supabase (`scripts/garde-commit.mjs:10-27`).
- Aucune clé côté client.
- Aucune donnée de prospect ni de client envoyée à un modèle gratuit en ligne.
- Comptes réseaux non Presti : intouchables.
- Jamais de mot de passe, de clé ni de code OAuth saisi par un agent (ni Claude Code, ni Hermes).
  Claude ne crée aucun compte.
- Migration : on colle PUIS on lève le drapeau, jamais l'inverse (`migration-production.md`).

## Actions irréversibles
- Toute action irréversible ou sortante attend l'accord de Benj : publication, dépense,
  suppression, migration en production, envoi à un client d'artisan.
- SAUF les exceptions écrites le 01/11 :
  - prospection e-mail automatique (`email-brevo.md`) ;
  - carrousels après 2-3 validations (`autonomie-abonnements.md`) ;
  - vidéos après 2-3 validations (`autonomie-abonnements.md`).
- Les envois prévus par l'abonnement d'un artisan suivent `autonomie-abonnements.md`
  (Studio prépare et l'artisan valide ; Signature envoie seul).

## Interdits des sous-agents
- Pas de `next build` ni de `next dev`. Le dossier `.next` est partagé : une compilation parallèle
  a déjà cassé le build de l'agent principal (`plans/journal-v5.md:77`).
- Une vérification locale se fait en mode production sur un dossier isolé :
  `PRESTI_DIST=.next-prod` (lu par `next.config.mjs:9`), sur un port dédié.
- Piège : `node scripts/tout-verifier.mjs` lance lui-même `npm run build` (`scripts/tout-verifier.mjs:27`)
  sans poser `PRESTI_DIST`. Un sous-agent pose `PRESTI_DIST=.next-prod` devant, ou s'en abstient.
- Pas de commit, pas de push, pas de migration. Un push sur `main` déploie en production ;
  une migration touche la base réelle. Ces gestes reviennent à l'agent principal, après accord.
- Pas de suites e2e concurrentes contre la production : elles créent et suppriment des comptes
  et écrivent en base. `HORS_LANCEUR` (`scripts/tout-verifier.mjs:184-215`) dit pourquoi chaque
  script est écarté ; `leads-abuse-test.mjs` et `stripe-session-test.mjs` se jouent seuls.
- Pas de secret en clair (garde au pré-commit : `scripts/garde-commit.mjs`).
