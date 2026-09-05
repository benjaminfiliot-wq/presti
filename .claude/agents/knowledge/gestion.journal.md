# Journal d'apprentissage — GESTION

Mémoire vivante de la catégorie Gestion. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `gestion.md`.

## 2026-08-31 — presti-gestion — Bilan santé post-plateforme
- Contexte : mise en ligne de la plateforme de conversation (migrations 0014 accent, 0015 conversation).
- Constat : prod up (200 + CSP), migrations 0001→0015 appliquées, Resend `verified`.
  Nouvelles routes `/api/conversation` et `/api/messages` live (400 sur jeton invalide = OK).
- À retenir : après chaque déploiement, vérifier prod 200 + CSP, la présence des nouvelles
  routes (code attendu sans auth), et le statut Resend. Toujours supprimer les comptes de test.

## 2026-08-31 — presti-gestion-donnees — Tunnel à instrumenter
- À retenir : suivre le tunnel lien→lead→conversation→devis→facture. Le statut lead
  `en_discussion` marque une conversation active ; `lu_le` = null → non lu par l'artisan.
  Métriques utiles : taux de 1re réponse, lead→devis, devis→facture, délai de réponse.

## 2026-08-31 — gestion — Mémoire connectée au cerveau Obsidian
- Constat : socle (architecture, routes, tables), journal (missions précédentes), 4 brain-files 
  (architecture, architecture-v2-devis-factures, audit-sécurité, problème-devis-voix) tous lus ✅.
- À retenir : la mémoire est **opérationnelle** et synchronisée avec le cerveau Obsidian.
  Structure : socle stable + journal vivant + brain thématique + protocole. Suivre le format
  de journal.md pour chaque acquis futur (date — pôle — titre / Constat / Action / À retenir).

## 2026-09-05 — presti-gestion (auditeur H, skill tdd) — Abonnement Stripe : le cycle nominal tient, l'après-paiement non
- Contexte : audit final v5, transition par transition (11) du cycle d'abonnement ; Stripe en LIVE, 0 client ; pas de clé de test (H4) → suite écrite (`scripts/abonnement-e2e.mjs`), non exécutée contre le compte réel. Rapport : `plans/audit-final/abonnement.md`.
- Constat : **0 configuration de portail en LIVE** (`billingPortal.configurations.list` → []) → `POST /api/stripe/portail` rendra 500 « Portail momentanément indisponible » au premier abonné : ni résiliation, ni changement de carte. `/abonnement` (`app/abonnement/page.tsx:29-36`) appelle `/api/subscribe` sans regarder `stripe_subscription_id` → **double abonnement** possible (29 + 59 €/mois), et `webhook:41` écrase l'ancien id. `customer.subscription.deleted` (`webhook:51-55`) ne compare pas `sub.id` à l'id enregistré → un rejeu tardif rétrograde un abonné actif. Aucune idempotence par `event.id` (rejeu = crédits remis à plein). `invoice.paid` / `payment_failed` / `subscription.updated` non écoutés ; `alertePaiement` (`lib/alertes.ts:194`) : 0 appel. Erreur de traitement → 200 (Stripe ne réessaie pas). Renouvellement réel = reset paresseux de `consume_credit` (`0008:12-16`), non cumulatif, vert. Prospect d'un artisan à 0 crédit : message sauvé, artisan notifié, IA non appelée, mais `PlatChat.tsx:295-299` n'affiche rien en cours de fil. 0 prix en dur hors `lib/plans.ts` (2 occurrences en commentaire/simulation). Suites : offres 12/12, limites 10/10 (après `purger-abus` : IP bannie par l'autre auditeur), correctifs 19/19.
- Décision / action : rapport chiffré (~12 h, ordre : portail 25 min → 409 double abonnement → 293 B sur la page Stripe → idempotence/5xx → factures → catalogue + `subscription.updated` → bulle prospect → textes). Suite en deux familles : ❌ (doit tenir) et ⚠️ « écart connu » (spec, devient ✅ quand corrigé) ; exit 2 sans clé de test, rien créé.
- À retenir : (1) `stripe-verifier.mjs` doit AUSSI contrôler `billingPortal.configurations` — un compte Stripe neuf n'en a pas et l'app plante en silence ; (2) toute route qui crée une session d'abonnement doit refuser si `stripe_subscription_id` existe ; (3) les webhooks doivent comparer l'id d'abonnement de l'événement à celui en base ; (4) un webhook simulé signé avec `STRIPE_WEBHOOK_SECRET` est accepté par la prod quel que soit `livemode` — ne viser que des comptes `@presti-test.invalid` ; (5) pour tester un prospect à 0 crédit sans appel IA, poser `credits_reset_le` dans le FUTUR, sinon le reset paresseux redonne 3 crédits et l'IA part ; (6) `scripts/stripe-webhook-setup.mjs` détruit et recrée le webhook LIVE — ne jamais le lancer par réflexe.
