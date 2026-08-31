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
