---
type: produit
sujet: audit sécurité du code + corrections
date: 2026-08-27
---

# Audit sécurité Presti — findings & corrections

> Audit mené par un agent dédié (lecture complète de `app/api/**`, `lib/*`, `middleware.ts`, SQL). **Faille critique confirmée par un test réel.**

## 🔴 CRITIQUE — C1 escalade de privilèges (`is_founder` / `plan`)
- **Problème** : les policies RLS de `artisans` ne contrôlaient que la LIGNE, pas les COLONNES. Un utilisateur lambda pouvait, depuis la console navigateur : `update artisans set is_founder=true, plan='business' where id=auth.uid()`.
- **Impact** : accès total plateforme (demandes/devis/CA de TOUS, solde+transactions Stripe, boîte mail IMAP du fondateur) + IA premium gratuite.
- **CONFIRMÉ** par test réel (auto-promotion a réussi).
- **Correctif** : `migrations/0005_secure_privileges.sql` — triggers qui figent `is_founder/plan/compteurs` pour tout rôle ≠ `service_role`/`postgres`.
- ⚠️ **Piège attrapé au re-test** : 1re version en `SECURITY DEFINER` → `current_user` valait toujours `postgres` DANS la fonction → verrou inopérant (re-test = encore vulnérable). Corrigé en retirant `SECURITY DEFINER` (invoker → `current_user` = rôle appelant = `authenticated`). **Leçon : toujours re-tester une correction de sécu (pas de vibecoding).**
- ⏳ **Benj doit RE-lancer la version corrigée** dans Supabase, puis je re-teste.

## 🟠 IMPORTANT
- **I1 — Cron relances public** si `CRON_SECRET` absent (fail-open). ✅ **Corrigé** (fail-closed, secret obligatoire) — déployé. ⏳ Benj doit définir `CRON_SECRET` dans Vercel.
- **I2 — `/api/leads` sans rate-limit** + destinataire arbitraire → amplification de coûts (IA+email). ✅ **Corrigé** : bornes de taille + validation slug + throttle par artisan (au-delà de 8/10 min : lead TOUJOURS sauvé mais IA/email coupés). Jamais de perte de lead. Déployé.
- **I3 — Fuite de messages d'erreur** (DB/IA bruts renvoyés au client). ✅ **Corrigé** sur routes publiques/user (`leads`, `devis`, `devis/generer`, `tools/reponse`) : `console.error` côté serveur + message générique. Déployé. *(control/* laissés verbeux : gate fondateur, utile pour ton debug.)*
- **I4 — Pas de validation / tailles non bornées** (DoS/coût). ✅ **Corrigé** : plafond 200 lignes/devis, chaînes tronquées, description IA ≤ 4000. Déployé.
- **I5 — Pas de webhook Stripe** : statut « payé » non réconcilié (`?paid=1` cosmétique). ⏳ à faire : webhook signé (`checkout.session.completed`) qui marque le devis payé — nécessite `STRIPE_WEBHOOK_SECRET` (config Stripe côté Benj).

## 🟡 MINEUR
placeholders env (throw si manquant) · sous-domaine qg cosmétique (pas une frontière sécu, le gate API l'est) · dérive schéma `setup.sql` vs migrations · `next_numero` exécutable par authenticated (revoke) · `Math.random()` pour slug.

## ✅ Zones SAINES (vérifiées)
Secrets jamais côté client · `.env.local` gitignore · gating fondateur correct sur `/api/control/*` · ownership devis OK · isolation lecture RLS OK · pas d'injection SQL (requêtes paramétrées) · pas de price tampering Stripe · TypeScript propre (0 `any`, 0 TODO).

## Actions Benj (ordre)
1. **Lancer `0005_secure_privileges.sql`** dans Supabase (CRITIQUE).
2. Définir **`CRON_SECRET`** dans Vercel (+ redeploy).
3. (suite) I2→I5 : je les traite dans la phase durcissement.
